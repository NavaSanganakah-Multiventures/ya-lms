const fs = require('fs');
let code = fs.readFileSync('src/index.ts', 'utf8');

// I duplicated env: env.ENVIRONMENT so removing the duplicate
code = code.replace(/env: env\.ENVIRONMENT,\n\s*env: env\.ENVIRONMENT,/g, 'env: env.ENVIRONMENT,');

fs.writeFileSync('src/index.ts', code);
console.log('Fixed syntax error');
