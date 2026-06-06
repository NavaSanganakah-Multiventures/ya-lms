const fs = require('fs');
let code = fs.readFileSync('src/index.ts', 'utf8');

const target1 = `async function getTotalAttendedSeconds(env: Env, userId: string, sessionId: string): Promise<number> {
  const row = (await env.DB.prepare(
    \`SELECT COALESCE(SUM(
       CAST((strftime('%s', COALESCE(left_at, CURRENT_TIMESTAMP)) - strftime('%s', joined_at)) AS INTEGER)
     ), 0) as total_seconds
     FROM Attendance
     WHERE session_id = ? AND user_id = ? AND left_at IS NOT NULL\`,
  )`;

const replacement1 = `async function getTotalAttendedSeconds(env: Env, userId: string, sessionId: string): Promise<number> {
  const row = (await env.DB.prepare(
    \`SELECT COALESCE(SUM(
       CAST((strftime('%s', COALESCE(left_at, CURRENT_TIMESTAMP)) - strftime('%s', joined_at)) AS INTEGER)
     ), 0) as total_seconds
     FROM Attendance
     WHERE session_id = ? AND user_id = ?\`,
  )`;

code = code.replace(target1, replacement1);
fs.writeFileSync('src/index.ts', code);
console.log("Replaced target1");
