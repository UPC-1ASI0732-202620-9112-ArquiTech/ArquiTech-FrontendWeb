import { HttpErrorResponse } from '@angular/common/http';

/** Error codes returned by the API that have a dedicated translated message. */
const KNOWN_ERROR_CODES = new Set([
  'INSUFFICIENT_STOCK',
  'INVALID_CREDENTIALS',
  'DUPLICATED_SERIAL_NUMBER',
  'WORKER_NOT_FOUND',
  'INVALID_CONTRACTOR',
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'FORBIDDEN',
]);

/**
 * Translates an HTTP error into an i18n key so every form can show the reason a
 * request was rejected (the AC2 scenario of each registration/update story).
 */
export function apiErrorKey(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'errors.unexpected';
  }
  const code: unknown = error.error?.code;
  if (typeof code === 'string' && KNOWN_ERROR_CODES.has(code)) {
    return `errors.codes.${code}`;
  }
  switch (error.status) {
    case 0:
      return 'errors.network';
    case 400:
    case 422:
      return 'errors.codes.VALIDATION_ERROR';
    case 401:
      return 'errors.unauthorized';
    case 403:
      return 'errors.codes.FORBIDDEN';
    case 404:
      return 'errors.codes.NOT_FOUND';
    case 409:
      return 'errors.conflict';
    default:
      return 'errors.unexpected';
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 404;
}
