import { calculateGroupClassCredits, calculateMaxAttendMinutes, normalizeGroupClassCreditUnit } from '../src/index';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function runTests() {
  console.log('Starting live-class credit unit tests...');
  assert(normalizeGroupClassCreditUnit('per_minute') === 'per_minute', 'per_minute should be valid');
  assert(normalizeGroupClassCreditUnit('per_class') === 'per_class', 'per_class should be valid');
  assert(normalizeGroupClassCreditUnit('fifteen_minute') === 'fifteen_minute', 'fifteen_minute should be valid');
  assert(normalizeGroupClassCreditUnit('monthly') === 'monthly', 'monthly should be valid');
  assert(normalizeGroupClassCreditUnit('invalid') === 'fifteen_minute', 'invalid default');
  assert(normalizeGroupClassCreditUnit(undefined) === 'fifteen_minute', 'undefined default');

  assert(calculateGroupClassCredits(15, 1) === 1, '1 min cost');
  assert(calculateGroupClassCredits(15, 15) === 15, '15 min cost');
  assert(calculateGroupClassCredits(15, 60) === 60, '60 min cost');
  assert(calculateGroupClassCredits(0, 15) === 0, 'zero rate');
  assert(calculateGroupClassCredits(15, 0) === 0, 'zero minutes');

  assert(calculateMaxAttendMinutes(15, 15) === 15, '15 min allowed');
  assert(calculateMaxAttendMinutes(1, 15) === 1, '1 min allowed');
  assert(calculateMaxAttendMinutes(0, 15) === 0, '0 balance');
  assert(calculateMaxAttendMinutes(15, 0) === -1, '0 rate');
  console.log('All live-class credit unit tests passed.');
}
runTests();
