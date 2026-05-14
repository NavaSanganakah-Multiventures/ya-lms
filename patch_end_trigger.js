const fs = require('fs');

let file = fs.readFileSync('src/index.ts', 'utf8');

const codeToFind = `    await env.DB.prepare(
      'UPDATE LiveSessions SET status = "ended" WHERE id = ?',
    )
      .bind(session.id)
      .run();`;

const replacement = `    await env.DB.prepare(
      'UPDATE LiveSessions SET status = "ended" WHERE id = ?',
    )
      .bind(session.id)
      .run();

    if (env.LIVE_CLASS_CREDIT_MANAGER) {
      try {
        const doId = env.LIVE_CLASS_CREDIT_MANAGER.idFromName(session.id);
        const obj = env.LIVE_CLASS_CREDIT_MANAGER.get(doId);
        const stopReq = new Request("https://liveclass/stop", { method: "POST" });
        if (ctx && ctx.waitUntil) {
          ctx.waitUntil(obj.fetch(stopReq).catch(e => console.error("Failed to stop DO alarm:", e)));
        } else {
          await obj.fetch(stopReq).catch(e => console.error("Failed to stop DO alarm:", e));
        }
      } catch (err) {
        console.error("Failed to stop LiveClassCreditManager:", err);
      }
    }`;

file = file.replace(codeToFind, replacement);
fs.writeFileSync('src/index.ts', file);
