import { DurableObject } from "cloudflare:workers";
import type { Env } from "../index";

// ─────────────────────────────────────────────────────
// Handler Registration
// index.ts calls registerAdminCommandHandler() at module init
// to avoid circular dependencies.
// ─────────────────────────────────────────────────────

type HandlerFn = (request: Request, env: Env) => Promise<Response>;
const registeredHandlers = new Map<string, HandlerFn>();

export function registerAdminCommandHandler(path: string, handler: HandlerFn) {
  registeredHandlers.set(path, handler);
}

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────

type AdminCommandStatus = "queued" | "running" | "completed" | "failed";

interface AdminCommandRecord {
  id: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  bodyJson: string;
  status: AdminCommandStatus;
  result?: string;
  error?: string;
  httpStatus?: number;
  createdAt: string;
  updatedAt: string;
}

const ADMIN_COMMAND_ALARM_KEY = "__admin_command_alarm_scheduled__";

/**
 * Simple ID generator (no dependency on index.ts).
 */
function generateCommandId(): string {
  const randomPart = crypto.randomUUID().substring(0, 12).toUpperCase();
  const timestampPart = Date.now().toString(36).toUpperCase().slice(-6);
  return `YA-CMD-${randomPart}${timestampPart}`;
}

// ─────────────────────────────────────────────────────
// Durable Object
// ─────────────────────────────────────────────────────

export class AdminCommandProcessor extends DurableObject {
  state: DurableObjectState;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/admin/command") {
      return this._enqueueCommand(request);
    }

    const statusMatch = url.pathname.match(/^\/api\/admin\/command\/([^/]+)\/status$/);
    if (request.method === "GET" && statusMatch) {
      return this._getStatus(statusMatch[1]);
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  private async _enqueueCommand(request: Request): Promise<Response> {
    try {
      const { path, method = "POST", headers = {}, body } = (await request.json()) as any;

      if (!path || typeof path !== "string") {
        return new Response(JSON.stringify({ error: "command.path is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!registeredHandlers.has(path)) {
        return new Response(
          JSON.stringify({ error: `Unsupported command target: ${path}` }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const commandId = generateCommandId();
      const now = new Date().toISOString();
      const record: AdminCommandRecord = {
        id: commandId,
        path,
        method: method.toUpperCase(),
        headers,
        bodyJson: body ? JSON.stringify(body) : "",
        status: "queued",
        createdAt: now,
        updatedAt: now,
      };

      await this.state.storage.put(`cmd:${commandId}`, record);
      await this._ensureAlarmScheduled();

      return new Response(
        JSON.stringify({ commandId, status: "queued", path }),
        { status: 202, headers: { "Content-Type": "application/json" } },
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: err?.message || "Failed to enqueue command" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  private async _getStatus(commandId: string): Promise<Response> {
    try {
      const record = await this.state.storage.get<AdminCommandRecord>(`cmd:${commandId}`);
      if (!record) {
        return new Response(JSON.stringify({ error: "Command not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          commandId: record.id,
          path: record.path,
          status: record.status,
          result: record.result ? JSON.parse(record.result) : undefined,
          error: record.error,
          httpStatus: record.httpStatus,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: err?.message || "Failed to fetch command status" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  private async _ensureAlarmScheduled(): Promise<void> {
    const existing = this.state.storage.getAlarm ? await this.state.storage.getAlarm() : null;
    if (existing == null && this.state.storage.setAlarm) {
      await this.state.storage.setAlarm(Date.now() + 500);
      await this.state.storage.put(ADMIN_COMMAND_ALARM_KEY, true);
    }
  }

  async alarm(): Promise<void> {
    try {
      const pending = await this.state.storage.list<AdminCommandRecord>({ prefix: "cmd:" });
      const toProcess: AdminCommandRecord[] = [];
      for (const [, record] of pending) {
        if (record.status === "queued" || record.status === "running") {
          toProcess.push(record);
        }
      }

      // Only run one command per alarm invocation to stay well under CPU limits.
      if (toProcess.length > 0) {
        const next = toProcess[0];
        await this._executeCommand(next);
      }

      const remaining = toProcess.length > 1 ? toProcess.slice(1) : [];
      if (remaining.length > 0) {
        if (this.state.storage.setAlarm) await this.state.storage.setAlarm(Date.now() + 500);
      } else {
        await this.state.storage.delete(ADMIN_COMMAND_ALARM_KEY);
      }
    } catch (err: any) {
      console.error("[AdminCommandProcessor] alarm failed", err);
      if (this.state.storage.setAlarm) await this.state.storage.setAlarm(Date.now() + 5_000);
    }
  }

  private async _executeCommand(record: AdminCommandRecord): Promise<void> {
    const now = new Date().toISOString();
    const handler = registeredHandlers.get(record.path);
    if (!handler) {
      record.status = "failed";
      record.error = `Unsupported command target: ${record.path}`;
      record.updatedAt = now;
      await this.state.storage.put(`cmd:${record.id}`, record);
      return;
    }

    try {
      record.status = "running";
      record.updatedAt = now;
      await this.state.storage.put(`cmd:${record.id}`, record);

      const domain = this.env.API_URL || "https://lms.yagyaashram.com";
      const cmdUrl = new URL(record.path, domain);
      const bodyInit = record.method !== "GET" && record.bodyJson ? record.bodyJson : undefined;
      const internalRequest = new Request(cmdUrl.toString(), {
        method: record.method,
        headers: {
          ...(record.headers || {}),
          "Content-Type": bodyInit ? "application/json" : "",
        },
        body: bodyInit,
      });

      const response = await handler(internalRequest, this.env);
      const responseBody = await response.text();

      record.status = response.ok ? "completed" : "failed";
      record.httpStatus = response.status;
      record.result = responseBody || undefined;
      if (!response.ok && !record.result) {
        record.error = `HTTP ${response.status}`;
      }
    } catch (err: any) {
      record.status = "failed";
      record.error = err?.message || String(err);
      record.httpStatus = 500;
    } finally {
      record.updatedAt = new Date().toISOString();
      await this.state.storage.put(`cmd:${record.id}`, record);
    }
  }
}
