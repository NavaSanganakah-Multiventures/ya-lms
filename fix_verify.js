const fs = require('fs');
let code = fs.readFileSync('src/index.ts', 'utf8');
code = code.replace(
  'async function verifyJWT(token: string, secret: string, env.ENVIRONMENT): Promise<any> {',
  'async function verifyJWT(token: string, secret: string, expectedEnv?: string): Promise<any> {'
);
fs.writeFileSync('src/index.ts', code);
