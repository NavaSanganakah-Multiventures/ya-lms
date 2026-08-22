// Mock cloudflare/mimetext so ts-node can load src/index (mirrors billing_validation.test.ts)
import Module from 'module';
import fs from 'fs';

(require as any).extensions['.sql'] = function (module: any, filename: string) {
  module.exports = fs.readFileSync(filename, 'utf8');
};

const originalRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (id: string) {
  if (id === 'mimetext') return { createMimeMessage: () => ({}) };
  if (id === 'cloudflare:email') return { EmailMessage: class {} };
  if (id === 'cloudflare:workers') return { DurableObject: class {}, WorkflowEntrypoint: class {} };
  return originalRequire.apply(this, arguments);
};

import { calculateGroupClassCreditsPaise, rupeesToPaise, paiseToRupees } from '../src/index';

function assert(c: boolean, msg: string) { if (!c) throw new Error('ASSERT FAILED: ' + msg); }

assert(rupeesToPaise(499.99) === 49999, 'rupeesToPaise(499.99) === 49999');
assert(rupeesToPaise(0) === 0, 'rupeesToPaise(0) === 0');
assert(rupeesToPaise('1.5') === 150, 'rupeesToPaise(1.5) === 150');
assert(paiseToRupees(49999) === 499.99, 'paiseToRupees(49999) === 499.99');
assert(paiseToRupees(0) === 0, 'paiseToRupees(0) === 0');
console.log('Test 1: rupees<->paise conversions OK');

assert(calculateGroupClassCreditsPaise(10, 15) === 1000, '15min @10 = 1000p');
assert(calculateGroupClassCreditsPaise(10, 30) === 2000, '30min @10 = 2000p');
assert(calculateGroupClassCreditsPaise(10, 0) === 0, '0 min = 0');
assert(calculateGroupClassCreditsPaise(0, 15) === 0, 'rate 0 = 0');
console.log('Test 2: fifteen-minute paise credits OK');

let paiseTotal = 0;
const perMinuteRateRupees = 0.07;
const secondsPerSession = 13;
const sessions = 60;
for (let i = 0; i < sessions; i++) {
  paiseTotal += Math.round(rupeesToPaise(perMinuteRateRupees) * secondsPerSession / 60);
}
assert(Number.isInteger(paiseTotal), 'paiseTotal is an exact integer');
assert(paiseTotal === 120, '60 sessions of 7p/min * 13s -> 120 paise (1.20)');
assert(paiseToRupees(paiseTotal) === 1.2, 'paiseTotal converts to 1.20 rupees');
console.log('Test 3: integer-paise per-minute accumulation has no drift OK');

console.log('All paise rounding tests passed!');
