const fs = require('fs');
let code = fs.readFileSync('src/index.ts', 'utf8');
// Fix the literal '\n' which was inserted by mistake
code = code.replace(/\\n\s*await requireAdminOrTeacher\(request, env\);/g, '\n    await requireAdminOrTeacher(request, env);');
fs.writeFileSync('src/index.ts', code);
console.log('Fixed syntax error');
