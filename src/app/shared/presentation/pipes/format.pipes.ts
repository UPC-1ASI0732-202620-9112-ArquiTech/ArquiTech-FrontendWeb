import { Pipe, PipeTransform, inject } from '@angular/core';
import { PreferencesService } from '../../../profile/services/preferences.service';
import { parseIso } from '../../utils/date.utils';

export type AppDateFormat = 'date' | 'short' | 'datetime' | 'long';

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Dates as shown in the Figma tables ("08 Jun 2025"), in the selected language.
 * Impure so it re-renders when the language changes (HU46).
 */
@Pipe({ name: 'appDate', pure: false })
export class AppDatePipe implements PipeTransform {
  private readonly preferences = inject(PreferencesService);
  private cacheKey = '';
  private cacheValue = '';

  transform(value: string | null | undefined, format: AppDateFormat = 'date'): string {
    const locale = this.preferences.locale;
    const key = `${value}|${format}|${locale}`;
    if (key === this.cacheKey) {
      return this.cacheValue;
    }
    this.cacheKey = key;
    this.cacheValue = this.format(value, format, locale);
    return this.cacheValue;
  }

  private format(value: string | null | undefined, format: AppDateFormat, locale: string): string {
    const date = parseIso(value);
    if (!date) {
      return '—';
    }
    if (format === 'long') {
      return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    }
    const parts = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).formatToParts(
      date,
    );
    const day = parts.find((part) => part.type === 'day')?.value ?? '';
    const month = capitalize((parts.find((part) => part.type === 'month')?.value ?? '').replace('.', ''));
    const year = parts.find((part) => part.type === 'year')?.value ?? '';
    const base = format === 'short' ? `${day} ${month}` : `${day} ${month} ${year}`;
    if (format !== 'datetime') {
      return base;
    }
    const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
    return `${base}, ${time}`;
  }
}

const NUMBER_FORMAT = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 });
const CURRENCY_FORMAT = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
});

/** Quantities with thousands separators ("10,000"). */
@Pipe({ name: 'appNumber' })
export class AppNumberPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return value === null || value === undefined || Number.isNaN(value) ? '—' : NUMBER_FORMAT.format(value);
  }
}

/** Amounts in Peruvian soles ("S/ 25.60"). */
@Pipe({ name: 'pen' })
export class PenCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return value === null || value === undefined || Number.isNaN(value) ? '—' : CURRENCY_FORMAT.format(value);
  }
}
