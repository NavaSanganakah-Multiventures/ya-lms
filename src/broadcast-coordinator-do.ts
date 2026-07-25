import { DurableObject } from "cloudflare:workers";
import { Env } from "./index";

export interface BroadcastPayload {
  type: string;
  channel: string;
  action?: string;
  entity?: string;
  data?: any;
}

export class BroadcastCoordinatorDO extends DurableObject {
  private activeUsers: Set<string>;
  
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.activeUsers = new Set<string>();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/online") {
      const { userId } = await request.json() as { userId: string };
      if (userId) {
        this.activeUsers.add(userId);
      }
      return new Response("OK");
    }

    if (request.method === "POST" && url.pathname === "/offline") {
      const { userId } = await request.json() as { userId: string };
      if (userId) {
        this.activeUsers.delete(userId);
      }
      return new Response("OK");
    }

    if (request.method === "POST" && url.pathname === "/broadcast") {
      const payload = await request.json() as BroadcastPayload;
      
      // Store payload temporarily for the alarm to process
      // We could use DO storage if we want persistence across crashes, 
      // but memory/alarm combo is usually fine for immediate broadcasts.
      const broadcasts: BroadcastPayload[] = (await this.ctx.storage.get("pending_broadcasts")) || [];
      broadcasts.push(payload);
      await this.ctx.storage.put("pending_broadcasts", broadcasts);
      
      // Schedule alarm to run immediately
      try {
        await this.ctx.storage.setAlarm(Date.now() + 100);
      } catch (e) {
        console.error("[BroadcastCoordinator] Error setting alarm", e);
      }

      return new Response("Broadcast Queued");
    }

    return new Response("Not Found", { status: 404 });
  }

  async alarm() {
    const broadcasts: BroadcastPayload[] = (await this.ctx.storage.get("pending_broadcasts")) || [];
    if (broadcasts.length === 0) return;

    // We process one broadcast at a time per alarm trigger
    const currentBroadcast = broadcasts.shift();
    if (!currentBroadcast) return;
    
    // Convert active users set to array
    const usersToNotify = Array.from(this.activeUsers);
    
    // Chunk size 50 to avoid any fetch subrequest limits (Cloudflare allows up to 1000 per request)
    // Even though DO-to-DO fetch inside the same zone is often optimized, it's safer to chunk.
    const chunkSize = 50; 
    
    console.log(`[BroadcastCoordinator] Broadcasting to ${usersToNotify.length} users`);

    for (let i = 0; i < usersToNotify.length; i += chunkSize) {
      const chunk = usersToNotify.slice(i, i + chunkSize);
      
      const promises = chunk.map(userId => {
        const doId = this.env.USER_CONNECTION_DO.idFromName(userId);
        const stub = this.env.USER_CONNECTION_DO.get(doId);
        return stub.fetch("http://do/notify", {
          method: "POST",
          body: JSON.stringify(currentBroadcast),
        }).catch(err => {
          console.error(`[BroadcastCoordinator] Failed to notify ${userId}:`, err);
        });
      });

      await Promise.allSettled(promises);
    }

    // Save remaining broadcasts
    await this.ctx.storage.put("pending_broadcasts", broadcasts);
    
    // If more broadcasts exist, trigger alarm again
    if (broadcasts.length > 0) {
       await this.ctx.storage.setAlarm(Date.now() + 100);
    }
  }
}
