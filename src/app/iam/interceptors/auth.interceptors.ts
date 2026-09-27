import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthenticationService } from '../services/authentication.service';
import { SessionService } from '../services/session.service';

const AUTH_PATH = '/authentication/';

/** Adds the JWT to every protected API request (TS16, TS20). */
export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(SessionService).token();
  const isApiRequest = request.url.startsWith(environment.apiBaseUrl);
  if (!token || !isApiRequest || request.url.includes(AUTH_PATH)) {
    return next(request);
  }
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

/**
 * A 401 on a protected request means the token is missing, invalid or expired:
 * the session is closed and a new sign-in is required (HU44 AC2, TS20).
 * Other errors are handled by the component that made the request.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const authentication = inject(AuthenticationService);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !request.url.includes(AUTH_PATH)) {
        authentication.signOut('expired');
      }
      return throwError(() => error);
    }),
  );
};
