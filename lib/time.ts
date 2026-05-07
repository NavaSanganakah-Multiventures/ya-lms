/**
 * ============================================================
 * GLOBAL TIME UTILITY — Yagya Ashram LMS
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
 * Indian users see IST automatically, global users see their local time.
 * @example formatLocalTime('2024-01-01T10:00:00Z') => "01 Jan 2024, 03:30 PM IST"
 */
export function formatLocalTime(
  date: string | number | Date | null | undefined,
  tz?: string
): string {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    const timezone = tz || getUserTimezone();
    return d.toLocaleString('en-IN', {
      timeZone: timezone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }) + ' ' + getTimezoneLabel(timezone);
  } catch {
    return '—';
  }
}

/**
 * Formats only the date part in user's local timezone.
 * @example formatLocalDate('2024-01-01T10:00:00Z') => "01 Jan 2024"
 */
export function formatLocalDate(
  date: string | number | Date | null | undefined,
  tz?: string
): string {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      timeZone: tz || getUserTimezone(),
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
  date: string | number | Date | null | undefined,
  tz?: string
): string {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-IN', {
      timeZone: tz || getUserTimezone(),
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
}

/**
 * Converts a datetime-local input string (from HTML <input type="datetime-local">)
 * to a UTC ISO string for safe DB storage.
 *
 * IMPORTANT: datetime-local inputs give values like "2024-01-15T16:00" without
 * timezone info. This function interprets them as the user's LOCAL timezone and
 * converts to UTC. This prevents the "+5:30 offset" double-counting bug.
 *
 * @example toUTCForDB('2024-01-15T16:00', 'Asia/Kolkata') => "2024-01-15T10:30:00.000Z"
 */
export function toUTCForDB(
  localDateString: string | null | undefined,
  tz?: string
): string | null {
  if (!localDateString) return null;
  try {
    const timezone = tz || getUserTimezone();
    // Parse the local date string as if it's in the given timezone
    const d = new Date(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'UTC',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      }).format(parseLocalAsTimezone(localDateString, timezone))
    );
    return isNaN(d.getTime()) ? new Date(localDateString).toISOString() : d.toISOString();
  } catch {
    // Fallback: just parse directly
    const d = new Date(localDateString);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
}

/**
 * Internal: Parses a naive datetime string as if it's in the given timezone.
 */
function parseLocalAsTimezone(localStr: string, timezone: string): Date {
  // "2024-01-15T16:00" or "2024-01-15"
  const [datePart, timePart = '00:00'] = localStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  // Use Intl to find the UTC offset for this specific moment in the given timezone
  const tempDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const utcStr = tempDate.toLocaleString('en-CA', { timeZone: timezone, hour12: false });
  const localStr2 = new Date(Date.UTC(year, month - 1, day, hour, minute)).toISOString().slice(0, 16);
  const displayStr = utcStr.replace(',', '').trim();
  const displayDate = new Date(displayStr + 'Z');
  const offsetMs = tempDate.getTime() - displayDate.getTime();
  return new Date(tempDate.getTime() - offsetMs);
}

/**
 * Returns current UTC ISO string for DB writes.
 * @example nowUTC() => "2024-01-01T10:00:00.000Z"
 */
export function nowUTC(): string {
  return new Date().toISOString();
}

/**
 * Returns how long ago a date was, in a human-readable format.
 * @example timeAgo('2024-01-01T10:00:00Z') => "2 hours ago"
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
 * @example getLocalNowForInput() => "2024-01-15T16:00"  (if user is in IST)
 */
export function getLocalNowForInput(tz?: string): string {
  const timezone = tz || getUserTimezone();
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
 * @example utcToLocalInput('2024-01-15T10:30:00Z', 'Asia/Kolkata') => "2024-01-15T16:00"
 */
export function utcToLocalInput(
  utcString: string | null | undefined,
  tz?: string
): string {
  if (!utcString) return '';
  try {
    const d = new Date(utcString);
    if (isNaN(d.getTime())) return '';
    const timezone = tz || getUserTimezone();
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
