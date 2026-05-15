import { getUserTimezone, getTimezoneLabel, formatLocalTime, formatLocalDate, formatLocalTimeOnly, toUTCForDB, nowUTC, timeAgo, getLocalNowForInput, utcToLocalInput, utcToLocalDateInput } from '@/lib/time';

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

async function runTests() {
    console.log("Starting tests for lib/time.ts...");

    // 1. getUserTimezone
    const tz = getUserTimezone();
    console.log(`getUserTimezone: ${tz}`);
    assert(typeof tz === 'string', "getUserTimezone should return a string");

    // 2. getTimezoneLabel
    const label = getTimezoneLabel();
    console.log(`getTimezoneLabel: ${label}`);
    assert(typeof label === 'string', "getTimezoneLabel should return a string");

    // 3. formatLocalTime
    const isoDate = '2024-05-10T10:00:00Z';
    const formattedTime = formatLocalTime(isoDate, false);
    console.log(`formatLocalTime: ${formattedTime}`);
    // In UTC, 10:00:00Z is 10:00 AM.
    // Since we are likely in UTC environment, let's check for 10:00 AM
    // but the locale is 'en-IN', which might format it differently.
    assert(formattedTime !== '—', "formatLocalTime should not return fallback for valid date");

    // 4. formatLocalDate
    const formattedDate = formatLocalDate(isoDate);
    console.log(`formatLocalDate: ${formattedDate}`);
    assert(formattedDate !== '—', "formatLocalDate should not return fallback for valid date");

    // 5. formatLocalTimeOnly
    const formattedTimeOnly = formatLocalTimeOnly(isoDate);
    console.log(`formatLocalTimeOnly: ${formattedTimeOnly}`);
    assert(formattedTimeOnly !== '—', "formatLocalTimeOnly should not return fallback for valid date");

    // Fallbacks
    assert(formatLocalTime(null) === '—', "formatLocalTime(null) should return '—'");
    assert(formatLocalDate(undefined) === '—', "formatLocalDate(undefined) should return '—'");
    assert(formatLocalTimeOnly('invalid-date') === '—', "formatLocalTimeOnly('invalid-date') should return '—'");

    // 6. toUTCForDB
    const naiveLocal = '2024-05-10T10:00';
    const utcFromNaive = toUTCForDB(naiveLocal);
    console.log(`toUTCForDB(naive): ${utcFromNaive}`);
    assert(utcFromNaive !== null && utcFromNaive.endsWith('Z'), "toUTCForDB should return ISO string ending in Z");

    const offsetAware = '2024-05-10T10:00:00+05:30';
    const utcFromOffset = toUTCForDB(offsetAware);
    console.log(`toUTCForDB(offset): ${utcFromOffset}`);
    assert(utcFromOffset === new Date(offsetAware).toISOString(), "toUTCForDB should handle offset-aware strings");

    assert(toUTCForDB(null) === null, "toUTCForDB(null) should return null");

    // 7. nowUTC
    const now = nowUTC();
    console.log(`nowUTC: ${now}`);
    assert(now.endsWith('Z'), "nowUTC should return ISO string ending in Z");

    // 8. timeAgo
    const thirtySecsAgo = new Date(Date.now() - 30 * 1000);
    const agoLabel = timeAgo(thirtySecsAgo);
    console.log(`timeAgo(30s): ${agoLabel}`);
    assert(agoLabel.includes('s ago'), "timeAgo should return seconds ago for recent dates");

    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    assert(timeAgo(fiveMinsAgo).includes('m ago'), "timeAgo should return minutes ago");

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    assert(timeAgo(twoHoursAgo).includes('h ago'), "timeAgo should return hours ago");

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    assert(timeAgo(threeDaysAgo).includes('d ago'), "timeAgo should return days ago");

    // 9. getLocalNowForInput
    const localNowInput = getLocalNowForInput();
    console.log(`getLocalNowForInput: ${localNowInput}`);
    assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localNowInput), "getLocalNowForInput should return YYYY-MM-DDTHH:mm format");

    // 10. utcToLocalInput
    const localInput = utcToLocalInput(isoDate);
    console.log(`utcToLocalInput: ${localInput}`);
    assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localInput), "utcToLocalInput should return YYYY-MM-DDTHH:mm format");
    assert(utcToLocalInput(null) === '', "utcToLocalInput(null) should return empty string");

    // 11. utcToLocalDateInput
    const localDateInput = utcToLocalDateInput(isoDate);
    console.log(`utcToLocalDateInput: ${localDateInput}`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(localDateInput), "utcToLocalDateInput should return YYYY-MM-DD format");
    assert(utcToLocalDateInput(undefined) === '', "utcToLocalDateInput(undefined) should return empty string");

    console.log("\n✅ All time utility tests passed!");
}

runTests().catch(err => {
    console.error("\n❌ Test failed!");
    console.error(err);
    process.exit(1);
});
