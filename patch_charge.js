const fs = require('fs');

let file = fs.readFileSync('src/index.ts', 'utf8');

const codeToFind = `  const timing = normalizeCreditDeductionTiming(session.credit_deduction_timing);
  if (timing === "on_join") return;
  if (trigger === "leave" && timing !== "on_leave") return;`;

const replacement = `  const timing = normalizeCreditDeductionTiming(session.credit_deduction_timing);
  if (timing === "on_join") return;
  if (timing === "minute") return; // Handled by Durable Object realtime alarm
  if (trigger === "leave" && timing !== "on_leave") return;`;

file = file.replace(codeToFind, replacement);
fs.writeFileSync('src/index.ts', file);
