const fs = require('fs');
let code = fs.readFileSync('src/index.ts', 'utf8');
code = code.replace(/\\\r?\n    await requireAdminOrTeacher/g, '    await requireAdminOrTeacher');
fs.writeFileSync('src/index.ts', code);
