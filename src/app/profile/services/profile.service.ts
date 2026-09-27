import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { User } from '../../iam/model/user.entity';
import { SessionService } from '../../iam/services/session.service';
import { ProfileUpdate } from '../model/preferences.model';

const STORAGE_PREFIX = 'arquitech.profile.';

/**
 * Profile information (HU16). The API does not expose a profile update endpoint
 * yet, so the data is kept in the current browser and re-applied every time the
 * same user signs in (SP-03 evaluates moving it to the backend).
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly session = inject(SessionService);
  private readonly companyState = signal('');

  readonly user = this.session.user;
  readonly company = computed(() => this.companyState());

  constructor() {
    effect(() => {
      const user = this.session.user();
      if (user) {
        untracked(() => this.applyStoredProfile(user));
      }
    });
  }

  updateProfile(changes: ProfileUpdate): Observable<User> {
    const current = this.session.user();
    if (!current) {
      throw new Error('No authenticated user');
    }
    const updated = new User({
      ...current.toResource(),
      fullName: changes.fullName.trim(),
      phone: changes.phone.trim(),
    });
    const stored: ProfileUpdate = { fullName: updated.fullName, phone: updated.phone, company: changes.company.trim() };
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${current.id}`, JSON.stringify(stored));
    } catch {
      // Kept for the current session only.
    }
    this.companyState.set(stored.company);
    this.session.updateUser(updated);
    return of(updated).pipe(delay(200));
  }

  private applyStoredProfile(user: User): void {
    const stored = this.read(user.id);
    this.companyState.set(stored?.company ?? '');
    if (stored && (stored.fullName !== user.fullName || stored.phone !== user.phone)) {
      this.session.updateUser(new User({ ...user.toResource(), fullName: stored.fullName, phone: stored.phone }));
    }
  }

  private read(userId: number): ProfileUpdate | null {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
      return raw ? (JSON.parse(raw) as ProfileUpdate) : null;
    } catch {
      return null;
    }
  }
}
