import {
  PRIVILEGED_INACTIVITY_LIMIT_MS,
  STUDENT_INACTIVITY_LIMIT_MS,
  WARNING_BEFORE_MS,
  getInactivityLimitMsForRole,
  getWarningDelayMs,
} from '../hooks/sessionGuardPolicy';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function runTests() {
  console.log('Starting tests for session guard policy...');

  assert(STUDENT_INACTIVITY_LIMIT_MS === 12 * 60 * 60 * 1000, 'Student inactivity limit should be 12h');
  assert(PRIVILEGED_INACTIVITY_LIMIT_MS === 3 * 60 * 60 * 1000, 'Admin/Teacher inactivity limit should be 3h');
  assert(WARNING_BEFORE_MS === 2 * 60 * 1000, 'Warning lead time should be 2m');

  assert(getInactivityLimitMsForRole('student') === STUDENT_INACTIVITY_LIMIT_MS, 'Student role should use student limit');
  assert(getInactivityLimitMsForRole('admin') === PRIVILEGED_INACTIVITY_LIMIT_MS, 'Admin role should use privileged limit');
  assert(getInactivityLimitMsForRole('teacher') === PRIVILEGED_INACTIVITY_LIMIT_MS, 'Teacher role should use privileged limit');
  assert(getInactivityLimitMsForRole(undefined) === STUDENT_INACTIVITY_LIMIT_MS, 'Undefined role should default to student limit');

  assert(
    getWarningDelayMs(STUDENT_INACTIVITY_LIMIT_MS) === STUDENT_INACTIVITY_LIMIT_MS - WARNING_BEFORE_MS,
    'Student warning delay should be limit - warning window',
  );
  assert(
    getWarningDelayMs(PRIVILEGED_INACTIVITY_LIMIT_MS) === PRIVILEGED_INACTIVITY_LIMIT_MS - WARNING_BEFORE_MS,
    'Admin/Teacher warning delay should be limit - warning window',
  );
  assert(getWarningDelayMs(60_000) === 0, 'Warning delay should not be negative for short limits');

  console.log('✅ Session guard policy tests passed!');
}

runTests();
