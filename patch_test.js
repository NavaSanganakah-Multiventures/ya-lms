const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'app/components/LiveClassWindow.tsx');
let content = fs.readFileSync(file, 'utf8');

const patchCode = `
  // Safely monkey-patch meeting methods to prevent unhandled promise rejections ("Socket is not connected")
  useEffect(() => {
    if (!meeting) return;

    // eslint-disable-next-line react-hooks/immutability
    const originalLeave = meeting.leave;
    if (originalLeave && !(originalLeave as any)._isPatched) {
      // eslint-disable-next-line react-hooks/immutability
      meeting.leave = async (...args: any[]) => {
        try {
          return await originalLeave.apply(meeting, args);
        } catch (e) {
          console.warn('Safely caught meeting.leave error:', e);
        }
      };
      (meeting.leave as any)._isPatched = true;
    }

    if (meeting.participants) {
      // eslint-disable-next-line react-hooks/immutability
      const originalKickAll = meeting.participants.kickAll;
      if (originalKickAll && !(originalKickAll as any)._isPatched) {
        // eslint-disable-next-line react-hooks/immutability
        meeting.participants.kickAll = async (...args: any[]) => {
          try {
            return await originalKickAll.apply(meeting.participants, args);
          } catch (e) {
            console.warn('Safely caught meeting.participants.kickAll error:', e);
          }
        };
        (meeting.participants.kickAll as any)._isPatched = true;
      }
    }
  }, [meeting]);
`;

content = content.replace(
  "  // Monitor whiteboard plugin globally",
  patchCode + "\n  // Monitor whiteboard plugin globally"
);

fs.writeFileSync(file, content);
console.log('patched');
