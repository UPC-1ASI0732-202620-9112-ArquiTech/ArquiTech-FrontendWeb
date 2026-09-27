import { Injectable, computed, signal } from '@angular/core';
import { User, UserResource, UserRole } from '../model/user.entity';

const STORAGE_KEY = 'arquitech.session';

interface StoredSession {
  token: string;
  user: UserResource;
}

/** Reads the `exp` claim of a JWT. Returns null when the token cannot be decoded. */
export function readTokenExpiry(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) {
    return null;
  }
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')));
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Client-side session state (TS17). Keeps the token and the authenticated user
 * so every protected request can be identified, and removes both on sign-out (HU44).
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly tokenState = signal<string | null>(null);
  private readonly userState = signal<User | null>(null);

  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly role = computed(() => this.userState()?.role ?? null);
  readonly isSupervisor = computed(() => this.role() === UserRole.Supervisor);
  readonly isContractor = computed(() => this.role() === UserRole.Contractor);

  constructor() {
    this.restore();
  }

  isAuthenticated(): boolean {
    const token = this.tokenState();
    if (!token || !this.userState()) {
      return false;
    }
    const expiry = readTokenExpiry(token);
    return expiry === null || expiry > Date.now();
  }

  start(token: string, user: User): void {
    this.tokenState.set(token);
    this.userState.set(user);
    this.persist();
  }

  /** Replaces the user data after a profile update (HU16). */
  updateUser(user: User): void {
    this.userState.set(user);
    this.persist();
  }

  clear(): void {
    this.tokenState.set(null);
    this.userState.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing persisted.
    }
  }

  private persist(): void {
    const token = this.tokenState();
    const user = this.userState();
    if (!token || !user) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user: user.toResource() } satisfies StoredSession));
    } catch {
      // Session stays in memory only.
    }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const stored = JSON.parse(raw) as StoredSession;
      this.tokenState.set(stored.token);
      this.userState.set(new User(stored.user));
      if (!this.isAuthenticated()) {
        this.clear();
      }
    } catch {
      this.clear();
    }
  }
}
