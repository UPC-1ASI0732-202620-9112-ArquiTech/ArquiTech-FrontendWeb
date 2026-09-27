import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SignInRequest, SignInResponse } from '../model/sign-in.model';
import { User } from '../model/user.entity';
import { SessionService } from './session.service';

/** Integrates the web client with `/api/v1/authentication` (HU23, HU44, TS16). */
@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  signIn(request: SignInRequest): Observable<User> {
    return this.http
      .post<SignInResponse>(`${environment.apiBaseUrl}/authentication/sign-in`, {
        email: request.email.trim(),
        password: request.password,
      })
      .pipe(
        map((response) => {
          if (!response?.token) {
            // TS16 AC2: an invalid response never establishes a session.
            throw new Error('Authentication response without token');
          }
          const user = new User({
            id: response.id,
            fullName: response.fullName,
            email: response.email ?? response.username ?? request.email.trim(),
            role: response.role,
          });
          this.session.start(response.token, user);
          return user;
        }),
      );
  }

  signOut(reason?: 'expired'): void {
    this.session.clear();
    void this.router.navigate(['/login'], { queryParams: reason ? { reason } : undefined });
  }
}
