import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { User, UserRole } from '../model/user.entity';
import { SessionService } from '../services/session.service';
import { authGuard, roleGuard } from './auth.guards';

function tokenExpiringIn(seconds: number): string {
  const payload = btoa(JSON.stringify({ sub: 1, exp: Math.floor(Date.now() / 1000) + seconds }));
  return `header.${payload}.signature`;
}

describe('auth guards', () => {
  let session: SessionService;
  let router: Router;
  const state = { url: '/projects/1/materials' } as RouterStateSnapshot;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    session = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
  });

  it('redirects to the sign-in page without a session (HU44 AC2)', () => {
    const result = TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, state));
    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toContain('/login?returnUrl=');
  });

  it('allows access with a valid session and rejects an expired token', () => {
    const user = new User({ id: 1, fullName: 'Carlos', email: 'c@a.pe', role: 'SUPERVISOR' });
    session.start(tokenExpiringIn(3600), user);
    expect(TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, state))).toBeTrue();

    session.start(tokenExpiringIn(-10), user);
    const result = TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, state));
    expect(result instanceof UrlTree).toBeTrue();
    expect(session.token()).toBeNull();
  });

  it('blocks roles that are not allowed on a route (HU27 AC2, TS21)', () => {
    const route = { data: { roles: [UserRole.Supervisor] } } as unknown as ActivatedRouteSnapshot;
    session.start(tokenExpiringIn(3600), new User({ id: 2, fullName: 'María', email: 'm@a.pe', role: 'CONTRACTOR' }));
    const denied = TestBed.runInInjectionContext(() => roleGuard(route, state));
    expect(router.serializeUrl(denied as UrlTree)).toBe('/unauthorized');

    session.start(tokenExpiringIn(3600), new User({ id: 1, fullName: 'Carlos', email: 'c@a.pe', role: 'SUPERVISOR' }));
    expect(TestBed.runInInjectionContext(() => roleGuard(route, state))).toBeTrue();
  });
});
