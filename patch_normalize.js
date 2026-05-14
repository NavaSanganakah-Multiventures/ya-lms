const fs = require('fs');

let file = fs.readFileSync('src/index.ts', 'utf8');

const codeToFind = `function normalizeCreditDeductionTiming(value: any): string {
  const timing = String(value || "on_join");
  return ["on_join", "on_leave", "on_end"].includes(timing) ? timing : "on_join";
}`;

const replacement = `function normalizeCreditDeductionTiming(value: any): string {
  const timing = String(value || "on_join");
  return ["on_join", "on_leave", "on_end", "minute"].includes(timing) ? timing : "on_join";
}`;

file = file.replace(codeToFind, replacement);
fs.writeFileSync('src/index.ts', file);
