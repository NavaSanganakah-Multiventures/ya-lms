import { calculateGroupClassCredits, calculateMaxAttendMinutes, normalizeGroupClassCreditUnit } from '../src/index';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function runTests() {
  console.log('Starting live-class credit unit tests...');

  console.log('normalizeGroupClassCreditUnit tests');
  assert(normalizeGroupClassCreditUnit('per_minute') === 'per_minute', 'per_minute should be valid');
  assert(normalizeGroupClassCreditUnit('per_class') === 'per_class', 'per_class should be valid');
  assert(normalizeGroupClassCreditUnit('fifteen_minute') === 'fifteen_minute', 'fifteen_minute should be valid');
  assert(normalizeGroupClassCreditUnit('monthly') === 'monthly', 'monthly should be valid');
  assert(normalizeGroupClassCreditUnit('invalid') === 'fifteen_minute', 'invalid unit should default to fifteen_minute');
  assert(normalizeGroupClassCreditUnit(undefined) === 'fifteen_minute', 'undefined unit should default to fifteen_minute');

  console.log('calculateGroupClassCredits tests');
  assert(calculateGroupClassCredits(15, 15) === 15, '15 minutes at ₹15/15min should cost ₹15');
  assert(calculateGroupClassCredits(15, 1) === 1, '1 minute at ₹15/15min should cost ₹1');
  assert(calculateGroupClassCredits(15, 60) === 60, '60 minutes at ₹15/15min should cost ₹60');
  assert(calculateGroupClassCredits(0, 15) === 0, 'zero rate should cost nothing');
  assert(calculateGroupClassCredits(15, 0) === 0, 'zero minutes should cost nothing');

  console.log('calculateMaxAttendMinutes tests');
  assert(calculateMaxAttendMinutes(15, 15) === 15, '₹15 balance at ₹15/15min allows 15 minutes');
  assert(calculateMaxAttendMinutes(1, 15) === 1, '₹1 balance at ₹15/15min allows 1 minute');
  assert(calculateMaxAttendMinutes(0, 15) === 0, 'zero balance allows no minutes');
  assert(calculateMaxAttendMinutes(15, 0) === -1, 'zero rate returns unlimited indicator');

  console.log('All live-class credit unit tests passed.');
}

runTests();
