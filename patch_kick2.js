const fs = require('fs');

const code = `
async function chargeAndKickParticipant(env: Env, meetingId: string, sessionId: string, attendance: any, costPerMinute: number) {
  try {
    // We check balance first to see if they can afford this minute
    const balance = await getCreditBalance(env, attendance.user_id, "self_study");

    if (balance.available < costPerMinute) {
      // Not enough credits for this minute, kick them.
      console.log(\`Kicking user \${attendance.user_id} due to insufficient credits (\${balance.available} < \${costPerMinute}).\`);
      await callRealtimeAPI(
        env,
        \`/meetings/\${meetingId}/participants/\${attendance.user_id}\`,
        "DELETE",
        null,
        true // silent404
      );

      // Mark left_at in Attendance
      await env.DB.prepare(
        "UPDATE Attendance SET left_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).bind(attendance.id).run();
    } else {
      // Deduct credits
      await deductCreditsFromWallet(
        env,
        attendance.user_id,
        "self_study",
        costPerMinute,
        "group_class_duration", // This might need a new reason like "group_class_realtime" to avoid conflicts, or keep it generic
        "attendance",
        attendance.id
      );
    }
  } catch (err) {
    console.error("Failed to charge and kick participant:", err);
  }
}
`;

let file = fs.readFileSync('src/index.ts', 'utf8');
file = file.replace(/async function chargeAndKickParticipant.*\{\n.*\}\n/, code);
fs.writeFileSync('src/index.ts', file);
