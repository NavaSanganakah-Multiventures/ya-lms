const fs = require('fs');

let file = fs.readFileSync('src/index.ts', 'utf8');

const codeToFind = `async function chargeAndKickParticipant(env: Env, meetingId: string, sessionId: string, attendance: any, costPerMinute: number) {
   // Implementation to follow
}`;

const replacement = `async function chargeAndKickParticipant(env: Env, meetingId: string, sessionId: string, attendance: any, costPerMinute: number) {
  try {
    const balance = await getCreditBalance(env, attendance.user_id, "self_study");

    if (balance.available < costPerMinute) {
      console.log(\`Kicking user \${attendance.user_id} due to insufficient credits (\${balance.available} < \${costPerMinute}).\`);
      await callRealtimeAPI(
        env,
        \`/meetings/\${meetingId}/participants/\${attendance.user_id}\`,
        "DELETE",
        null,
        true
      );

      await env.DB.prepare(
        "UPDATE Attendance SET left_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).bind(attendance.id).run();
    } else {
      // Create a unique id for the ledger entry using timestamp so it doesn't conflict
      const ledgerId = \`realtime_cut_\${attendance.id}_\${Date.now()}\`;
      await env.DB.prepare(
        \`INSERT INTO CreditLedger (id, user_id, credit_type, amount, type, reason, reference_type, reference_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)\`
      ).bind(
        ledgerId, attendance.user_id, "self_study", -costPerMinute, "deduction", "group_class_duration", "attendance", attendance.id
      ).run();

      await env.DB.prepare(
        \`UPDATE CreditWallets
         SET used_credits = used_credits + ?
         WHERE user_id = ? AND credit_type = ?\`
      ).bind(costPerMinute, attendance.user_id, "self_study").run();
    }
  } catch (err) {
    console.error("Failed to charge and kick participant:", err);
  }
}`;

file = file.replace(codeToFind, replacement);
fs.writeFileSync('src/index.ts', file);
