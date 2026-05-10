export const WARNING_BEFORE_MS = 2 * 60 * 1000; // warn 2 min before

export const STUDENT_INACTIVITY_LIMIT_MS = 12 * 60 * 60 * 1000; // 12h
export const PRIVILEGED_INACTIVITY_LIMIT_MS = 3 * 60 * 60 * 1000; // 3h

export function getInactivityLimitMsForRole(role?: string | null): number {
  if (role === 'admin' || role === 'teacher') {
    return PRIVILEGED_INACTIVITY_LIMIT_MS;
  }
  return STUDENT_INACTIVITY_LIMIT_MS;
}

export function getWarningDelayMs(limitMs: number): number {
  return Math.max(0, limitMs - WARNING_BEFORE_MS);
}
