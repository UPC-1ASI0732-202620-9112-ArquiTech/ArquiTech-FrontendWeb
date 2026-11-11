import { Injectable } from '@angular/core';

const STORAGE_KEY = 'arquitech.alert-read-state.v1';

type StoredReadState = Record<string, string[]>;

/** Persists read alert identifiers independently for each user and project. */
@Injectable({ providedIn: 'root' })
export class AlertReadStateService {
  getReadAlertIds(userId: number, projectId: number): Set<string> {
    const state = this.readState();
    return new Set(state[this.scopeKey(userId, projectId)] ?? []);
  }

  markAsRead(userId: number, projectId: number, alertId: string): void {
    const state = this.readState();
    const key = this.scopeKey(userId, projectId);
    const ids = new Set(state[key] ?? []);
    ids.add(alertId);
    state[key] = [...ids];
    this.writeState(state);
  }

  markAllAsRead(userId: number, projectId: number, alertIds: string[]): void {
    const state = this.readState();
    state[this.scopeKey(userId, projectId)] = [...new Set(alertIds)];
    this.writeState(state);
  }

  prune(userId: number, projectId: number, alertIds: string[]): void {
    const state = this.readState();
    const key = this.scopeKey(userId, projectId);
    const validIds = new Set(alertIds);
    const retained = (state[key] ?? []).filter((id) => validIds.has(id));
    if (retained.length === 0) {
      delete state[key];
    } else {
      state[key] = retained;
    }
    this.writeState(state);
  }

  private scopeKey(userId: number, projectId: number): string {
    return `${userId}:${projectId}`;
  }

  private readState(): StoredReadState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {};
      }
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
      }
      return Object.fromEntries(
        Object.entries(parsed).filter(
          ([, value]) => Array.isArray(value) && value.every((id) => typeof id === 'string'),
        ),
      ) as StoredReadState;
    } catch {
      return {};
    }
  }

  private writeState(state: StoredReadState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The application continues with in-memory alert state when storage is unavailable.
    }
  }
}
