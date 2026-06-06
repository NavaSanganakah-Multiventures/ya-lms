const fs = require('fs');
let content = fs.readFileSync('src/index.ts', 'utf8');

// The constructor needs a super call:
// constructor(state: DurableObjectState, env: Env) {
//   super(state, env);
//   this.state = state;
// }

content = content.replace(
  '  constructor(state: DurableObjectState, env: Env) {\n    this.state = state;\n  }',
  '  constructor(state: DurableObjectState, env: Env) {\n    super(state, env);\n    this.state = state;\n  }'
);

fs.writeFileSync('src/index.ts', content);
