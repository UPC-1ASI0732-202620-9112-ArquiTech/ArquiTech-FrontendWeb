import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { SessionService } from '../../iam/services/session.service';
import { Project } from '../model/project.entity';

const STORAGE_KEY = 'arquitech.current-project';

interface StoredProjectReference {
  id: number;
  name: string;
  userId: number;
}

/**
 * The work ("obra") the user is currently looking at. It drives the breadcrumb,
 * the sidebar links and the project-scoped modules.
 */
@Injectable({ providedIn: 'root' })
export class ProjectContextService {
  private readonly session = inject(SessionService);
  private readonly currentState = signal<Project | null>(null);
  private readonly storedState = signal<StoredProjectReference | null>(this.restore());

  /** Project of the route being displayed, if any. */
  readonly current = this.currentState.asReadonly();

  /** Last opened project of the signed-in user, used by the sidebar on the project list. */
  readonly last = computed(() => {
    const stored = this.storedState();
    return stored && stored.userId === this.session.user()?.id ? stored : null;
  });

  constructor() {
    // Signing out (or an expired session) forgets the selected project.
    effect(() => {
      if (!this.session.user()) {
        this.currentState.set(null);
      }
    });
  }

  select(project: Project): void {
    this.currentState.set(project);
    const userId = this.session.user()?.id;
    if (userId === undefined) {
      return;
    }
    const reference: StoredProjectReference = { id: project.id, name: project.name, userId };
    this.storedState.set(reference);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reference));
    } catch {
      // Not persisted.
    }
  }

  forget(projectId: number): void {
    if (this.currentState()?.id === projectId) this.currentState.set(null);
    if (this.storedState()?.id === projectId) {
      this.storedState.set(null);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* Memory state was cleared. */
      }
    }
  }
  leave(): void {
    this.currentState.set(null);
  }

  private restore(): StoredProjectReference | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as StoredProjectReference) : null;
    } catch {
      return null;
    }
  }
}
