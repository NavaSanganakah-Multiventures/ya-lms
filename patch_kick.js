const fs = require('fs');

const code = `
async function chargeAndKickParticipant(env: Env, meetingId: string, sessionId: string, attendance: any, costPerMinute: number) {
  try {
    const success = await deductCreditsFromWallet(
      env,
      attendance.user_id,
      "self_study",
      costPerMinute,
      "group_class_duration",
      "attendance",
      attendance.id,
      true // We may need to pass an allow partial flag, or check balance first
    );

    // Check remaining balance after deduction
    const balance = await getCreditBalance(env, attendance.user_id, "self_study");
    if (balance.available <= 0) {
      // Kick user from meeting via RealtimeKit API
      console.log(\`Kicking user \${attendance.user_id} due to zero credits.\`);
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
    }
  } catch (err) {
    console.error("Failed to charge and kick participant:", err);
  }
}
`;

let file = fs.readFileSync('src/index.ts', 'utf8');
// Replace the dummy implementation
file = file.replace(/async function chargeAndKickParticipant.*\{\n.*\}\n/, code);
fs.writeFileSync('src/index.ts', file);
