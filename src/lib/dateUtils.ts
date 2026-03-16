/**
 * Format a Date to "YYYY-MM-DD" in LOCAL time.
 * Avoids the timezone shift caused by Date.toISOString() which uses UTC.
 */
export function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
