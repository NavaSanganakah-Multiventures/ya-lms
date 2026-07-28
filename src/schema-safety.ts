export function isSafeSchemaQuery(q: string): boolean {
  const trimmed = q.trim();
  if (!trimmed) return false;

  const upper = trimmed.replace(/\s+/g, ' ').toUpperCase();

  if (/;/.test(trimmed)) return false;
  if (/(?:--|\/\*|\*\/)/.test(trimmed)) return false;
  if (/\bATTACH\b|\bDETACH\b|\bPRAGMA\b/i.test(trimmed)) return false;
  if (/\bCREATE\s+(?:TRIGGER|VIEW)\b/i.test(trimmed)) return false;

  const allowedPrefixes = [
    'CREATE TABLE IF NOT EXISTS ',
    'CREATE INDEX IF NOT EXISTS ',
    'CREATE UNIQUE INDEX IF NOT EXISTS ',
    'ALTER TABLE ',
  ];
  const hasAllowedPrefix = allowedPrefixes.some((prefix) => upper.startsWith(prefix));
  if (!hasAllowedPrefix) return false;

  if (upper.startsWith('ALTER TABLE ')) {
    if (!/\bADD\s+COLUMN\b/i.test(trimmed)) return false;
  }

  return true;
}
