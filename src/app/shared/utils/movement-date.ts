import { todayIsoDate } from './date.utils';

/**
 * Converts the date picked in a form into the ISO date-time sent to the API.
 * Today's events keep the current time; past dates are stored at noon so they
 * never shift to another day because of the time zone.
 */
export function toEventDateTime(isoDate: string): string {
  if (isoDate === todayIsoDate()) {
    return new Date().toISOString();
  }
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0).toISOString();
}
