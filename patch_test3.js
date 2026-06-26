const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'app/components/LiveClassWindow.tsx');
let content = fs.readFileSync(file, 'utf8');

const patchCode = `
  // Safely monkey-patch meeting methods to prevent unhandled promise rejections ("Socket is not connected")
  useEffect(() => {
    if (!meeting) return;

    const originalLeave = meeting.leave;
    if (originalLeave && !(originalLeave as any)._isPatched) {
      const safeLeave = async (...args: any[]) => {
        try {
          return await originalLeave.apply(meeting, args);
        } catch (e) {
          console.warn('Safely caught meeting.leave error:', e);
        }
      };
      (safeLeave as any)._isPatched = true;
      // eslint-disable-next-line react-hooks/immutability
      meeting.leave = safeLeave as typeof meeting.leave;
    }

    if (meeting.participants) {
      const originalKickAll = meeting.participants.kickAll;
      if (originalKickAll && !(originalKickAll as any)._isPatched) {
        const safeKickAll = async (...args: any[]) => {
          try {
            return await originalKickAll.apply(meeting.participants, args);
          } catch (e) {
            console.warn('Safely caught meeting.participants.kickAll error:', e);
          }
        };
        (safeKickAll as any)._isPatched = true;
        // eslint-disable-next-line react-hooks/immutability
        meeting.participants.kickAll = safeKickAll as typeof meeting.participants.kickAll;
      }
    }
  }, [meeting]);
`;

content = content.replace(
  /\/\/ Safely monkey-patch meeting methods[\s\S]*?}, \[meeting\]\);\n/,
  patchCode + "\n"
);

fs.writeFileSync(file, content);
console.log('patched');
