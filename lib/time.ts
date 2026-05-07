/**
 * ============================================================
 * GLOBAL TIME UTILITY — Adityanveshan LMS
 * ============================================================
 * RULE 1: Display always in USER's LOCAL timezone (auto-detected from browser).
 *         Indian users (IST) will see IST, global users see their local time.
 * RULE 2: DB (Cloudflare D1) always stores UTC ISO string.
 * RULE 3: Backend emails to admins always use IST (India-based admins).
 * ============================================================
 */

/** Gets the user's timezone from the browser (e.g., "Asia/Kolkata"). Falls back to IST. */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}

/** Gets a short label for the user's timezone (e.g., "IST", "EST"). */
export function getTimezoneLabel(tz?: string): string {
  const timezone = tz || getUserTimezone();
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(now);
    return parts.find(p => p.type === 'timeZoneName')?.value || timezone;
  } catch {
    return timezone;
  }
}

/**
 * Formats any date to the user's LOCAL timezone for display in UI.
 * @example formatLocalTime('2024-01-01T10:00:00Z') => "01 Jan 2024, 03:30 PM IST"
 */
export function formatLocalTime(
  date: string | number | Date | null | undefined,
  includeTzLabel: boolean = true
): string {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    const timezone = getUserTimezone();
    const formatted = d.toLocaleString('en-IN', {
      timeZone: timezone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return includeTzLabel ? `${formatted} ${getTimezoneLabel(timezone)}` : formatted;
  } catch {
    return '—';
  }
}

/**
 * Formats only the date part in user's local timezone.
 * @example formatLocalDate('2024-01-01T10:00:00Z') => "01 Jan 2024"
 */
export function formatLocalDate(
  date: string | number | Date | null | undefined
): string {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      timeZone: getUserTimezone(),
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Formats only the time part in user's local timezone.
 * @example formatLocalTimeOnly('2024-01-01T10:00:00Z') => "03:30 PM"
 */
export function formatLocalTimeOnly(
  date: string | number | Date | null | undefined
): string {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-IN', {
      timeZone: getUserTimezone(),
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
}

/**
 * Converts a local naive string (from datetime-local or date input) to a UTC ISO string.
 * This function handles the "naive" nature of browser inputs by interpreting them
 * in the context of the user's current timezone.
 */
export function toUTCForDB(
  localValue: string | null | undefined
): string | null {
  if (!localValue) return null;
  try {
    // If it's already an ISO string with Z or offset, return it
    if (localValue.includes('Z') || /([+-]\d{2}:\d{2})$/.test(localValue)) {
      return new Date(localValue).toISOString();
    }

    const d = new Date(localValue);
    
    // Check if it's a valid date
    if (isNaN(d.getTime())) return null;

    // For datetime-local (e.g. "2024-05-10T10:00")
    // Browser interprets this as Local Time. Converting to ISO automatically shifts to UTC.
    // Example: India (GMT+5:30) 10:00 -> .toISOString() -> 04:30Z. Correct.
    return d.toISOString();
  } catch {
    return null;
  }
}

/**
 * Returns current UTC ISO string for DB writes.
 */
export function nowUTC(): string {
  return new Date().toISOString();
}

/**
 * Returns how long ago a date was, in a human-readable format.
 */
export function timeAgo(date: string | number | Date | null | undefined): string {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return formatLocalDate(d);
  } catch {
    return '—';
  }
}

/**
 * For forms: returns the current datetime in user's local time in 'datetime-local' input format.
 */
export function getLocalNowForInput(): string {
  const timezone = getUserTimezone();
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/**
 * For forms: converts a UTC ISO string from DB back to local datetime-local input format.
 */
export function utcToLocalInput(
  utcString: string | null | undefined
): string {
  if (!utcString) return '';
  try {
    const d = new Date(utcString);
    if (isNaN(d.getTime())) return '';
    const timezone = getUserTimezone();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
  } catch {
    return '';
  }
}


/**
 * For forms: converts a UTC ISO string from DB back to local 'date' input format (YYYY-MM-DD).
 */
export function utcToLocalDateInput(
  utcString: string | null | undefined
): string {
  if (!utcString) return '';
  try {
    const d = new Date(utcString);
    if (isNaN(d.getTime())) return '';
    const timezone = getUserTimezone();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
    return ${get('year')}--;
  } catch {
    return '';
  }
}
