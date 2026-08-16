// Mock Cloudflare modules and .sql imports before importing src/index
import Module from 'module';
import fs from 'fs';

// Teach Node.js how to require .sql files as raw strings
(require as any).extensions['.sql'] = function (module: any, filename: string) {
  module.exports = fs.readFileSync(filename, 'utf8');
};

const originalRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (id: string) {
  if (id === 'cloudflare:email') {
    return { EmailMessage: class {} };
  }
  if (id === 'cloudflare:workers') {
    return { DurableObject: class {}, WorkflowEntrypoint: class {} };
  }
  if (id === 'mimetext') {
    return { createMimeMessage: () => ({}) };
  }
  return originalRequire.apply(this, arguments as any);
};

import { checkHourlyLimit } from '../src/index';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function createMockEnv(initialRows: any[] = []) {
  const state = { rows: [...initialRows], calls: [] as any[] };
  return {
    DB: {
      prepare: (sql: string) => ({
        bind: (...args: any[]) => ({
          first: async () => state.rows[0] || null,
          all: async () => ({ results: [] }),
          run: async () => {
            state.calls.push({ sql, args });
            return { meta: { changes: 1 } };
          },
        }),
      }),
    },
  } as any;
}

async function runTests() {
  console.log('Starting AI hourly rate limit tests...');

  // 1. No row exists -> default 60/hr, first call allowed
  const env1 = createMockEnv();
  const r1 = await checkHourlyLimit(env1, 'user-1', 'ai');
  assert(r1.allowed === true, 'First call with no row should be allowed');

  // 2. Custom positive rate_limit overrides default
  const env2 = createMockEnv([{ window_start: new Date().toISOString(), window_used: 5, rate_limit: 10 }]);
  const r2 = await checkHourlyLimit(env2, 'user-2', 'ai');
  assert(r2.allowed === true, 'Custom positive limit should allow within usage');

  // 3. zero/null rate_limit falls back to default 60
  const env3 = createMockEnv([{ window_start: new Date().toISOString(), window_used: 5, rate_limit: 0 }]);
  const r3 = await checkHourlyLimit(env3, 'user-3', 'ai');
  assert(r3.allowed === true, 'Zero rate_limit should fall back to default 60 and allow');

  // 4. Exceeding positive custom limit is blocked
  const recentWindow = new Date().toISOString();
  const env4 = createMockEnv([{ window_start: recentWindow, window_used: 10, rate_limit: 10 }]);
  const r4 = await checkHourlyLimit(env4, 'user-4', 'ai');
  assert(r4.allowed === false, 'Exceeding custom limit should be blocked');
  assert(typeof r4.reason === 'string' && r4.reason.includes('Rate limit exceeded'), 'Block reason should mention rate limit');

  // 5. Old window resets and allows
  const oldWindow = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
  const env5 = createMockEnv([{ window_start: oldWindow, window_used: 999, rate_limit: 10 }]);
  const r5 = await checkHourlyLimit(env5, 'user-5', 'ai');
  assert(r5.allowed === true, 'Expired window should reset and allow');

  console.log('✅ AI hourly rate limit tests passed!');
}

runTests();
