import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../model/user.entity';
import { SessionService } from '../services/session.service';

/** Protected routes require a valid session (HU44 AC2, TS17). */
export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionService);
  if (session.isAuthenticated()) {
    return true;
  }
  const hadSession = !!session.token();
  session.clear();
  return inject(Router).createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url, ...(hadSession ? { reason: 'expired' } : {}) },
  });
};

/** The sign-in page is only for visitors without a session. */
export const guestGuard: CanActivateFn = () => {
  return inject(SessionService).isAuthenticated() ? inject(Router).createUrlTree(['/projects']) : true;
};

/**
 * Role-based route protection (HU27, TS21). Routes declare the allowed roles in
 * `data.roles`; any other role is redirected to the access-denied page.
 */
export const roleGuard: CanActivateFn = (route) => {
  const allowed = (route.data['roles'] as UserRole[] | undefined) ?? [];
  const role = inject(SessionService).role();
  if (allowed.length === 0 || (role && allowed.includes(role))) {
    return true;
  }
  return inject(Router).createUrlTree(['/unauthorized']);
};
