import { DurableObject } from "cloudflare:workers";

export interface NotifyPayload {
  type: string;
  channel: string;
  action?: string;
  entity?: string;
  data?: any;
}

export class UserConnectionDO extends DurableObject {
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

      // Get User ID from URL if provided (for targeted messaging later)
      const userId = url.searchParams.get("userId") || "anonymous";

      // Accept WebSocket and tag it with the user ID for Hibernation
      this.ctx.acceptWebSocket(server, [userId]);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/notify" && request.method === "POST") {
      const body = (await request.json()) as NotifyPayload;
      const message = JSON.stringify(body);

      // We check if there's a specific target user in the body (set by notifyUser helper)
      // Otherwise, it's a global broadcast (like from notifyGlobal)
      const targetUserId = body.data?._targetUserId;

      const websockets = targetUserId
         ? this.ctx.getWebSockets(targetUserId) // Target specific user
         : this.ctx.getWebSockets(); // Broadcast to everyone

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

  // हाइब्रिड डेटा सिंक: DO SQLite के डेटा को बैच में D1 में सेव करना
  // इसे अलार्म (Alarms) या कस्टम API के ज़रिए बैकग्राउंड में चलाया जा सकता है।
  async syncToD1() {
    try {
      // Storage Safe Cleanup: अगर कोई इवेंट 24 घंटे पुराना है और सिंक नहीं हो पाया (उदा: D1 एरर),
      // तो DO Storage को भरने से बचाने के लिए उसे हटा दें।
      this.ctx.storage.sql.exec(`DELETE FROM buffered_events WHERE created_at < datetime('now', '-1 day')`);

      while (true) {
        // DO SQLite से 50-50 के बैच में डेटा पढ़ें
        const cursor = this.ctx.storage.sql.exec(`SELECT * FROM buffered_events LIMIT 50`);
        const events = Array.from(cursor);

        if (events.length === 0) {
          // जब सारा डेटा सिंक हो जाए, तो लूप से बाहर आएं
          break;
        }

        // 1. D1 में बैच इन्सर्ट (Batch Insert) का असली लॉजिक
        // चूँकि DO के पास D1 बाइंडिंग (this.env.DB) होती है, हम सीधे D1 में डेटा भेज सकते हैं।
        const stmt = this.env.DB.prepare(
          `INSERT INTO UserEvents (user_id, event_type, payload, created_at) VALUES (?, ?, ?, ?)`
        );

        const batchQueries: any[] = [];
        for (const e of events) {
          batchQueries.push(stmt.bind(e.user_id, e.event_type, e.payload, e.created_at));

          // Ghost Data Fix: अगर इवेंट वीडियो प्रोग्रेस का है, तो D1 में LessonProgress भी अपडेट करें
          if (e.event_type === "lesson_progress") {
            try {
              const payload = JSON.parse(String(e.payload || '{}'));
              if (payload.courseId && payload.lessonId && payload.progress != null) {
                const progressStmt = this.env.DB.prepare(`
                  INSERT INTO LessonProgress (user_id, course_id, lesson_id, progress_percentage, status, created_at, updated_at)
                  VALUES (?, ?, ?, ?, 'in_progress', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                  ON CONFLICT(user_id, course_id, lesson_id) DO UPDATE SET
                  progress_percentage = MAX(progress_percentage, excluded.progress_percentage),
                  status = CASE WHEN excluded.progress_percentage >= 100 THEN 'completed' ELSE status END,
                  updated_at = CURRENT_TIMESTAMP
                `);
                batchQueries.push(progressStmt.bind(e.user_id, payload.courseId, payload.lessonId, payload.progress));
              }
            } catch (err) {
              console.error("[UserConnectionDO] Error parsing progress payload:", err);
            }
          }
        }

        // D1 में सुरक्षित रूप से डेटा बैच में भेजें (यूज़र इवेंट्स + प्रोग्रेस अपडेट्स)
        // Note: D1 batch() has a 100 statement limit, but we only pull 50 events at a time, so max statements is 100.
        await this.env.DB.batch(batchQueries);

        // 2. D1 में सफलतापूर्वक सिंक होने के बाद ही DO SQLite से डेटा डिलीट करें
        const ids = events.map((e: any) => e.id).join(',');
        this.ctx.storage.sql.exec(`DELETE FROM buffered_events WHERE id IN (${ids})`);

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
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    console.error(`[UserConnectionDO] ws error:`, error);
  }
}
