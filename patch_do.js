const fs = require('fs');

const classCode = `
export class LiveClassCreditManager {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    if (url.pathname === "/start") {
      const { sessionId, meetingId } = await request.json() as any;
      await this.state.storage.put("sessionId", sessionId);
      await this.state.storage.put("meetingId", meetingId);

      // Start polling every minute
      const currentAlarm = await this.state.storage.getAlarm();
      if (!currentAlarm) {
        await this.state.storage.setAlarm(Date.now() + 60000);
      }
      return new Response("started", { status: 200 });
    }

    if (url.pathname === "/stop") {
      await this.state.storage.deleteAlarm();
      return new Response("stopped", { status: 200 });
    }

    return new Response("ok");
  }

  async alarm() {
    try {
      const sessionId = await this.state.storage.get<string>("sessionId");
      const meetingId = await this.state.storage.get<string>("meetingId");
      if (!sessionId || !meetingId) return;

      const session = await this.env.DB.prepare(
        "SELECT * FROM LiveSessions WHERE id = ? AND status = 'started'"
      ).bind(sessionId).first() as any;

      if (!session) {
        // Session ended, stop polling
        return;
      }

      // We need to fetch policy to see if real-time deduction is required
      const policy = await getGroupClassCreditPolicy(this.env, sessionId);
      if (policy && policy.self_study_enabled === 1 && policy.self_study_group_enabled === 1) {
        const timing = normalizeCreditDeductionTiming(policy.credit_deduction_timing);
        if (timing === "minute") {
          // Get active participants
          const activeUsers = await this.env.DB.prepare(
            "SELECT id, user_id FROM Attendance WHERE session_id = ? AND left_at IS NULL"
          ).bind(sessionId).all();

          if (activeUsers.results && activeUsers.results.length > 0) {
            const costPerMinute = normalizeNonNegativeInt(policy.group_class_credit_cost);
            if (costPerMinute > 0) {
               for (const attendance of activeUsers.results) {
                  // Charge logic using deductCreditsFromWallet and kick if balance is 0
                  await chargeAndKickParticipant(this.env, meetingId, sessionId, attendance, costPerMinute);
               }
            }
          }
        }
      }

      // Schedule next alarm
      await this.state.storage.setAlarm(Date.now() + 60000);
    } catch (err) {
      console.error("LiveClassCreditManager Alarm Error:", err);
      // Retry in 1 minute
      await this.state.storage.setAlarm(Date.now() + 60000);
    }
  }
}

async function chargeAndKickParticipant(env: Env, meetingId: string, sessionId: string, attendance: any, costPerMinute: number) {
   // Implementation to follow
}
`;

const file = fs.readFileSync('src/index.ts', 'utf8');
const lines = file.split('\n');

const modifiedFile = [...lines.slice(0, lines.length - 1), classCode, "export default worker;"].join('\n');
fs.writeFileSync('src/index.ts', modifiedFile);
