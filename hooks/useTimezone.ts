'use client';

import { useState, useEffect } from 'react';
import { getUserTimezone, getTimezoneLabel } from '@/lib/time';

/**
 * React hook that returns the user's browser timezone.
 * Use this in any component that needs timezone-aware date display or input.
 *
 * @example
 * const { timezone, tzLabel } = useTimezone();
 * // timezone => "Asia/Kolkata"
 * // tzLabel => "IST"
 */
export function useTimezone() {
  const [timezone, setTimezone] = useState<string>('Asia/Kolkata');
  const [tzLabel, setTzLabel] = useState<string>('IST');

  useEffect(() => {
    const tz = getUserTimezone();
    queueMicrotask(() => {
      setTimezone(tz);
      setTzLabel(getTimezoneLabel(tz));
    });
  }, []);

  return { timezone, tzLabel };
}
