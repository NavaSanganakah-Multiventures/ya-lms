const fs = require('fs');

let file = fs.readFileSync('src/index.ts', 'utf8');

// The place where Attendance is inserted via webhook logic
const codeToFind = `
            }
          }

          if (token && isAdmin) {`;

const replacement = `
            }
          }

          if (attendanceSession) {
            // Trigger Durable Object to ensure the alarm is running for realtime credit checks
            try {
              if (env.LIVE_CLASS_CREDIT_MANAGER) {
                const id = env.LIVE_CLASS_CREDIT_MANAGER.idFromName(attendanceSession.id);
                const obj = env.LIVE_CLASS_CREDIT_MANAGER.get(id);
                // Call start to ensure it is polling
                const startReq = new Request("https://liveclass/start", {
                  method: "POST",
                  body: JSON.stringify({ sessionId: attendanceSession.id, meetingId: resolvedMeetingId })
                });
                ctx.waitUntil(obj.fetch(startReq).catch((e:any) => console.error("DO Trigger failed", e)));
              }
            } catch (err) {
              console.error("Failed to trigger DO:", err);
            }
          }

          if (token && isAdmin) {`;

file = file.replace(codeToFind, replacement);
fs.writeFileSync('src/index.ts', file);
