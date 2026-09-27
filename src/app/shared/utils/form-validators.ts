import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { parseIso } from './date.utils';

/** Peruvian RUC: 11 digits starting with 10, 15, 17 or 20. */
export const RUC_PATTERN = /^(10|15|17|20)\d{9}$/;

export function rucValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return null;
    }
    return RUC_PATTERN.test(value) ? null : { ruc: true };
  };
}

/** Rejects blank strings that only contain spaces. */
export function notBlankValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return String(value).trim().length === 0 ? { required: true } : null;
  };
}

/** Group validator: `endKey` must be on or after `startKey`. */
export function dateRangeValidator(startKey: string, endKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const start = parseIso(group.get(startKey)?.value);
    const end = parseIso(group.get(endKey)?.value);
    if (!start || !end) {
      return null;
    }
    return end.getTime() >= start.getTime() ? null : { dateRange: true };
  };
}

/** Quantity must not exceed the available stock (HU02 AC2, TS03). */
export function maxStockValidator(getAvailable: () => number | null): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const available = getAvailable();
    const value = Number(control.value);
    if (available === null || control.value === null || control.value === '' || Number.isNaN(value)) {
      return null;
    }
    return value <= available ? null : { insufficientStock: { available } };
  };
}

/** Date must not be in the future (events that already happened). */
export function notFutureDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const date = parseIso(control.value);
    if (!date) {
      return null;
    }
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return date.getTime() <= endOfToday.getTime() ? null : { futureDate: true };
  };
}
