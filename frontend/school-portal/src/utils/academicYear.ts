/**
 * Returns the current academic year string, e.g. "2026-27".
 * Assumes the academic year runs April–March (Indian school calendar).
 * Before April, the year is the previous calendar year's session.
 */
export function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${String(year + 1).slice(-2)}`;
}

/**
 * Returns an array of academic year strings centered around the current year.
 * @param pastCount  Number of past years to include (default 2)
 * @param futureCount Number of future years to include (default 1)
 */
export function getAcademicYearOptions(pastCount = 2, futureCount = 1): string[] {
  const now = new Date();
  const baseYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const years: string[] = [];
  for (let offset = -pastCount; offset <= futureCount; offset++) {
    const y = baseYear + offset;
    years.push(`${y}-${String(y + 1).slice(-2)}`);
  }
  return years;
}
