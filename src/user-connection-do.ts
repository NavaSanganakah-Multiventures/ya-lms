import { DurableObject } from "cloudflare:workers";
import { Env } from "./index";

export interface NotifyPayload {
  type: string;
  channel: string;
  action?: string;
  entity?: string;
  data?: any;
}

export class UserConnectionDO extends DurableObject {
  private userId: string | null = null;
  
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // Durable Object के अंदर SQLite Storage सेट करना (Fast Buffering)
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS buffered_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // WebSocket Hibernation: Edge प्रॉक्सी पर ही Ping का जवाब Pong से देना
    // ताकि फालतू में सर्वर (DO) को जागना न पड़े (Duration Cost शून्य हो जाए)
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('{"type":"ping"}', '{"type":"pong"}')
    );
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // Extract User ID from URL if possible, otherwise rely on the DO name which is the userId
      // Since this is Per-User DO, the DO is already instantiated for a specific userId.
      // We can get it from the URL or query params.
      this.userId = url.searchParams.get("userId") || this.userId;
      
      // Hibernation के लिए वेबसॉकेट को स्वीकार करना
      this.ctx.acceptWebSocket(server, [this.userId || "anonymous"]);
      
      // Send Online signal to BroadcastCoordinatorDO
      if (this.userId) {
        this.notifyCoordinator(this.userId, "online");
      }

      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/notify" && request.method === "POST") {
      const body = (await request.json()) as NotifyPayload;
      const message = JSON.stringify(body);

      // We broadcast to all websockets connected to THIS user's DO
      const websockets = this.ctx.getWebSockets();
      for (const ws of websockets) {
        try {
          ws.send(message);
        } catch (e) {
          console.error('[UserConnectionDO] Failed to send message to WebSocket:', e);
        }
      }
      return new Response("OK");
    }

    return new Response("Not Found", { status: 404 });
  }
  
  private async notifyCoordinator(userId: string, status: "online" | "offline") {
    try {
       const doId = this.env.BROADCAST_COORDINATOR_DO.idFromName("COORDINATOR");
       const stub = this.env.BROADCAST_COORDINATOR_DO.get(doId);
       await stub.fetch(`http://do/${status}`, {
         method: "POST",
         body: JSON.stringify({ userId }),
       });
    } catch (e) {
       console.error(`[UserConnectionDO] Failed to notify coordinator about ${status}:`, e);
    }
  }

  // हाइब्रिड डेटा सिंक: DO SQLite के डेटा को बैच में D1 में सेव करना
  // इसे अलार्म (Alarms) या कस्टम API के ज़रिए बैकग्राउंड में चलाया जा सकता है।
  async syncToD1() {
    try {
      // Storage Safe Cleanup: अगर कोई इवेंट 24 घंटे पुराना है और सिंक नहीं हो पाया (उदा: D1 एरर),
      // तो DO Storage को भरने से बचाने के लिए उसे हटा दें।
      this.ctx.storage.sql.exec(`DELETE FROM buffered_events WHERE created_at < datetime('now', '-1 day')`);

      let syncLoops = 0;
      const MAX_SYNC_LOOPS = 100;
      while (true) {
        if (syncLoops >= MAX_SYNC_LOOPS) {
          console.warn(`[UserConnectionDO] Sync loop exceeded ${MAX_SYNC_LOOPS} iterations — possible leak`);
          break;
        }
        syncLoops++;

        // DO SQLite से 50-50 के बैच में डेटा पढ़ें
        const cursor = this.ctx.storage.sql.exec(`SELECT * FROM buffered_events LIMIT 50`);
        const events = Array.from(cursor);

        if (events.length === 0) {
          // जब सारा डेटा सिंक हो जाए, तो लूप से बाहर आएं
          break;
        }

        // 1. D1 में बैच इन्सर्ट (Batch Insert) का असली लॉजिक
        const stmt = this.env.DB.prepare(
          `INSERT INTO UserEvents (user_id, event_type, payload, created_at) VALUES (?, ?, ?, ?)`
        );

        let batchQueries: any[] = [];
        for (const e of events) {
          batchQueries.push(stmt.bind(e.user_id, e.event_type, e.payload, e.created_at));

          // Ghost Data Fix: अगर इवेंट वीडियो प्रोग्रेस का है, तो D1 में LessonProgress भी अपडेट करें (Central Update)
          if (e.event_type === "lesson_progress" || e.event_type === "progress_update") {
            try {
              const payload = JSON.parse(String(e.payload || '{}'));
              const courseId = payload.courseId;
              const lessonId = payload.lessonId;
              const progress = payload.progress;

              if (courseId && lessonId && progress != null) {
                const progressStmt = this.env.DB.prepare(`
                  INSERT INTO LessonProgress (user_id, course_id, lesson_id, progress_percentage, status, created_at, updated_at)
                  VALUES (?, ?, ?, ?, 'in_progress', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                  ON CONFLICT(user_id, course_id, lesson_id) DO UPDATE SET
                  progress_percentage = MAX(progress_percentage, excluded.progress_percentage),
                  status = CASE WHEN excluded.progress_percentage >= 100 THEN 'completed' ELSE status END,
                  updated_at = CURRENT_TIMESTAMP
                `);
                batchQueries.push(progressStmt.bind(e.user_id, courseId, lessonId, progress));

                // If progress reaches 100%, insert/update the CompletedLessons table as well
                const progNum = Math.min(100, Math.max(0, Number(progress)));
                if (progNum === 100) {
                  batchQueries.push(
                    this.env.DB.prepare(
                      `INSERT INTO CompletedLessons (user_id, lesson_id, time_spent_seconds) VALUES (?, ?, 0) ON CONFLICT(user_id, lesson_id) DO UPDATE SET completed_at = CURRENT_TIMESTAMP`
                    ).bind(e.user_id, lessonId)
                  );
                }
              }
            } catch (err) {
              console.error("[UserConnectionDO] Error parsing progress payload:", err);
            }
          }
        }
        
        // Chunk batchQueries to ensure we never exceed D1's 100 statement limit per batch
        const D1_BATCH_LIMIT = 50;
        for (let i = 0; i < batchQueries.length; i += D1_BATCH_LIMIT) {
           const chunk = batchQueries.slice(i, i + D1_BATCH_LIMIT);
           await this.env.DB.batch(chunk);
        }

        // 2. D1 में सफलतापूर्वक सिंक होने के बाद ही DO SQLite से डेटा डिलीट करें
        const placeholders = events.map(() => '?').join(',');
        this.ctx.storage.sql.exec(`DELETE FROM buffered_events WHERE id IN (${placeholders})`, ...events.map((e: any) => e.id));

        console.log(`[UserConnectionDO] Successfully synced ${events.length} events to D1`);
      }
    } catch (error) {
      console.error('[UserConnectionDO] Sync to D1 failed:', error);

      // अगर कोई एरर आता है और अभी भी बफर में डेटा है, तो 1 मिनट बाद फिर से ट्राई करें
      try {
         await this.ctx.storage.setAlarm(Date.now() + 60 * 1000);
      } catch(e) {}
    }
  }

  // Hibernation की वजह से यह फ़ंक्शन केवल तभी कॉल होगा जब कोई काम का मैसेज आएगा।
  // DO जागेगा, मैसेज प्रोसेस करेगा (SQLite में सेव करेगा) और तुरंत वापस सो जाएगा।
  async webSocketMessage(ws: WebSocket, message: string) {
    try {
      const msg = JSON.parse(message);

      // Ping अब Edge पर ही हैंडल हो रहा है, तो हमें यहाँ कुछ नहीं करना
      if (msg.type === "ping") return;

      // रीयल-टाइम क्लाइंट इवेंट्स (जैसे: वीडियो प्रोग्रेस) को SQLite में सेव करना
      if (msg.type === "client_event") {
         const { userId, eventType, payload } = msg;

         if (userId && eventType) {
           this.userId = userId;
           this.ctx.storage.sql.exec(
              `INSERT INTO buffered_events (user_id, event_type, payload) VALUES (?, ?, ?)`,
              userId, eventType, JSON.stringify(payload || {})
           );

           // हर बार नया इवेंट आने पर अगले 1 मिनट के लिए अलार्म सेट करें (अगर पहले से सेट नहीं है)
           // जब DO खाली होगा, तब यह अलार्म उसे जगाएगा और D1 में डेटा सिंक करेगा।
           try {
              const currentAlarm = await this.ctx.storage.getAlarm();
              if (currentAlarm === null) {
                 await this.ctx.storage.setAlarm(Date.now() + 60 * 1000);
              }
           } catch(e) {}
         }
      }
    } catch (e) {
       console.error('[UserConnectionDO] Error processing message:', e);
    }
  }

  // अलार्म हैंडलर: जब भी अलार्म बजेगा, यह DO को जगाएगा और D1 में डेटा सिंक करेगा
  async alarm() {
    await this.syncToD1();
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    console.log(`[UserConnectionDO] ws close: code=${code}, reason=${reason}, clean=${wasClean}`);
    
    // Check if there are any websockets left for this user
    if (this.userId) {
       const remaining = this.ctx.getWebSockets();
       if (remaining.length === 0) {
          this.notifyCoordinator(this.userId, "offline");
       }
    }
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    console.error(`[UserConnectionDO] ws error:`, error);
  }
}
