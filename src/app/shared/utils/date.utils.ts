/** Date helpers working with ISO strings (YYYY-MM-DD for dates, full ISO for date-times). */

const MS_PER_DAY = 86_400_000;

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayIsoDate(): string {
  return toIsoDate(new Date());
}

/** Parses 'YYYY-MM-DD' as a local date (not UTC) and full ISO strings as-is. */
export function parseIso(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Monday 00:00 of the week that contains `date`. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const offset = (day.getDay() + 6) % 7;
  return new Date(day.getTime() - offset * MS_PER_DAY);
}

/** Sunday 23:59:59.999 of the week that starts on `weekStart`. */
export function endOfWeek(weekStart: Date): Date {
  return new Date(startOfDay(weekStart).getTime() + 7 * MS_PER_DAY - 1);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function isWithin(value: string | null | undefined, from: Date, to: Date): boolean {
  const date = parseIso(value);
  return !!date && date.getTime() >= from.getTime() && date.getTime() <= to.getTime();
}

/** Inclusive comparison against optional 'YYYY-MM-DD' bounds, used by list filters. */
export function isWithinIsoRange(value: string | null | undefined, from?: string, to?: string): boolean {
  const date = parseIso(value);
  if (!date) {
    return !from && !to;
  }
  const fromDate = parseIso(from);
  const toDate = parseIso(to);
  if (fromDate && date.getTime() < startOfDay(fromDate).getTime()) {
    return false;
  }
  if (toDate && date.getTime() > startOfDay(toDate).getTime() + MS_PER_DAY - 1) {
    return false;
  }
  return true;
}

export function compareIsoDesc(a: string | null | undefined, b: string | null | undefined): number {
  return (parseIso(b)?.getTime() ?? 0) - (parseIso(a)?.getTime() ?? 0);
}
