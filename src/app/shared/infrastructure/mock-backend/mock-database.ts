import { Injectable } from '@angular/core';
import { MOCK_DATABASE_VERSION, MockDatabaseState, createSeedState } from './mock-seed';

const STORAGE_KEY = 'arquitech.mock-db';

/** In-browser persistence for the mock API so demo data survives page reloads. */
@Injectable({ providedIn: 'root' })
export class MockDatabase {
  private current: MockDatabaseState = this.load();

  get state(): MockDatabaseState {
    return this.current;
  }

  nextId(): number {
    this.current.sequence += 1;
    return this.current.sequence;
  }

  save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.current));
    } catch {
      // Storage may be unavailable (private mode); data then lives only in memory.
    }
  }

  reset(): void {
    this.current = createSeedState();
    this.save();
  }

  private load(): MockDatabaseState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as MockDatabaseState;
        if (parsed.version === MOCK_DATABASE_VERSION) {
          return parsed;
        }
      }
    } catch {
      // Corrupted or unavailable storage falls back to fresh seed data.
    }
    const seed = createSeedState();
    this.current = seed;
    this.save();
    return seed;
  }
}
