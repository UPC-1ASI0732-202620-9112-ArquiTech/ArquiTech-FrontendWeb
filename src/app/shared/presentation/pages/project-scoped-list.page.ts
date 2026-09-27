import { Dialog } from '@angular/cdk/dialog';
import { DestroyRef, Directive, effect, inject, input, signal, untracked } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { SessionService } from '../../../iam/services/session.service';
import { ProjectAlertsService } from '../../../reports/services/project-alerts.service';
import { openConfirmDialog } from '../../services/dialog.helpers';
import { ToastService } from '../../services/toast.service';
import { apiErrorKey, isNotFound } from '../../utils/api-error';
import { TableState } from '../../utils/table-state';
import { LoadStatus } from '../components/list-state/list-state.component';

export interface DeleteRequest {
  titleKey: string;
  messageKey: string;
  params: Record<string, unknown>;
  successKey: string;
  remove: () => Observable<void>;
}

/**
 * Common behaviour of the list pages inside a work: load by `projectId`,
 * reload after changes and confirm deletions. Write actions are only offered
 * to Supervisors (`canManage`), Contractors get the read-only view (HU27).
 */
@Directive()
export abstract class ProjectScopedListPage<T> {
  /** Route parameter bound by the router (`withComponentInputBinding`). */
  readonly projectId = input.required<string>();

  protected readonly session = inject(SessionService);
  protected readonly dialog = inject(Dialog);
  protected readonly toast = inject(ToastService);
  private readonly alerts = inject(ProjectAlertsService);

  protected readonly status = signal<LoadStatus>('loading');
  protected readonly canManage = this.session.isSupervisor;
  protected abstract readonly table: TableState<T>;
  private subscription?: Subscription;

  protected abstract fetch(projectId: number): Observable<T[]>;

  constructor() {
    effect(() => {
      const projectId = Number(this.projectId());
      untracked(() => this.load(projectId));
    });
    inject(DestroyRef).onDestroy(() => this.subscription?.unsubscribe());
  }

  protected get currentProjectId(): number {
    return Number(this.projectId());
  }

  protected load(projectId = this.currentProjectId): void {
    this.subscription?.unsubscribe();
    this.status.set('loading');
    this.subscription = this.fetch(projectId).subscribe({
      next: (rows) => {
        this.table.setRows(rows);
        this.onLoaded(rows);
        this.status.set('ready');
      },
      error: () => this.status.set('error'),
    });
  }

  /** Hook for pages that derive extra data from the loaded rows. */
  protected onLoaded(_rows: T[]): void {}

  /** Called after a successful create, update or delete. */
  protected afterChange(messageKey?: string, params?: Record<string, unknown>): void {
    if (messageKey) {
      this.toast.success(messageKey, params);
    }
    this.load();
    this.alerts.refresh();
  }

  protected confirmDelete(request: DeleteRequest): void {
    openConfirmDialog(this.dialog, {
      titleKey: request.titleKey,
      messageKey: request.messageKey,
      params: request.params,
    }).closed.subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      request.remove().subscribe({
        next: () => this.afterChange(request.successKey, request.params),
        error: (error: unknown) => {
          // AC2 of the delete stories: a missing record is reported and nothing else changes.
          this.toast.error(isNotFound(error) ? 'errors.recordNotFound' : apiErrorKey(error));
          this.load();
        },
      });
    });
  }
}
