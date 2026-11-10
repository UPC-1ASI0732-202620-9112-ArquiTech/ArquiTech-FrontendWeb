import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'arquitech.web.to-be.enabled';

/**
 * Global presentation preference for integrated To-Be improvements.
 * Off means original modules (condition A); on reveals their enhancements (B).
 * This controls the UI only; authorization and backend safeguards remain unchanged.
 */
@Injectable({ providedIn: 'root' })
export class ExperimentModeService {
  private readonly enabledState = signal(this.restore());
  readonly enabled = this.enabledState.asReadonly();

  toggle(): void {
    this.setEnabled(!this.enabledState());
  }

  setEnabled(enabled: boolean): void {
    this.enabledState.set(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
      // A session can still use the toggle when storage is unavailable.
    }
  }

  private restore(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }
}
