const fs = require('fs');

// Our test `tests/billing_validation.test.ts` is failing because of the `cloudflare:workers` import in `src/index.ts`.
// ts-node doesn't natively understand cloudflare:workers resolution without some mocking or ignoring.
// A simpler fix is to just let the test run without crashing by mocking it or replacing it with an interface.
// Since Cloudflare workers environments provide `DurableObject` as a globally available/resolvable thing at runtime,
// we can define a simple stub for `cloudflare:workers` in node_modules, or we can use `declare module "cloudflare:workers"`.

// Alternatively, let's just make the test load.
// We can use a test setup file or just remove the explicit import if it's not strictly necessary.
// Cloudflare's new syntax recommends extending DurableObject, but it's not strictly required in standard environments unless using workers API natively.
// Let's create a stub in node_modules so ts-node can find it.
fs.mkdirSync('node_modules/cloudflare:workers', { recursive: true });
fs.writeFileSync('node_modules/cloudflare:workers/index.js', 'class DurableObject { constructor(state, env) { this.state = state; this.env = env; } } module.exports = { DurableObject };');
fs.writeFileSync('node_modules/cloudflare:workers/package.json', JSON.stringify({ name: "cloudflare:workers", version: "1.0.0", main: "index.js" }));
