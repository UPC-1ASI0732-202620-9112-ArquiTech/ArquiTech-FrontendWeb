import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Observable } from 'rxjs';
import {
  DataToolbarComponent,
  FilterField,
} from '../../../shared/presentation/components/data-toolbar/data-toolbar.component';
import { ListStateComponent } from '../../../shared/presentation/components/list-state/list-state.component';
import { PaginatorComponent } from '../../../shared/presentation/components/paginator/paginator.component';
import { StatusBadgeComponent } from '../../../shared/presentation/components/status-badge/status-badge.component';
import { BadgeTone } from '../../../shared/presentation/icons';
import { ProjectScopedListPage } from '../../../shared/presentation/pages/project-scoped-list.page';
import { AppDatePipe } from '../../../shared/presentation/pipes/format.pipes';
import { openFormDialog } from '../../../shared/services/dialog.helpers';
import { isWithinIsoRange } from '../../../shared/utils/date.utils';
import { TableState, normalizeText } from '../../../shared/utils/table-state';
import {
  TaskFormDialogComponent,
  TaskFormDialogData,
} from '../../components/task-form-dialog/task-form-dialog.component';
import {
  WorkerFormDialogComponent,
  WorkerFormDialogData,
} from '../../components/worker-form-dialog/worker-form-dialog.component';
import { Task } from '../../model/task.entity';
import { Worker, WorkerStatus } from '../../model/worker.entity';
import { WorkerService } from '../../services/worker.service';

export const WORKER_STATUS_TONE: Record<WorkerStatus, BadgeTone> = {
  [WorkerStatus.Active]: 'success',
  [WorkerStatus.OnLeave]: 'warning',
  [WorkerStatus.Inactive]: 'neutral',
};

/** Figma "Trabajadores": staff of the work (HU10, HU42) and its management (HU06, HU32, HU49). */
@Component({
  selector: 'app-worker-list',
  imports: [
    TranslatePipe,
    LucideAngularModule,
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
    DataToolbarComponent,
    ListStateComponent,
    PaginatorComponent,
    StatusBadgeComponent,
    AppDatePipe,
  ],
  templateUrl: './worker-list.component.html',
  styleUrl: './worker-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkerListComponent extends ProjectScopedListPage<Worker> {
  private readonly workerService = inject(WorkerService);
  protected readonly statusTone = WORKER_STATUS_TONE;

  protected readonly table = new TableState<Worker>({
    search: (worker, query) => normalizeText(`${worker.fullName} ${worker.role} ${worker.specialty}`).includes(query),
    filter: (worker, filters) =>
      (!filters['status'] || worker.status === filters['status']) &&
      isWithinIsoRange(worker.hireDate, filters['from'], filters['to']),
    // Alphabetical order for worker lists (Organization Systems, report 4.2.1).
    sort: (a, b) => a.fullName.localeCompare(b.fullName),
  });

  protected readonly filterFields: FilterField[] = [
    {
      key: 'status',
      labelKey: 'common.status',
      type: 'select',
      options: Object.values(WorkerStatus).map((value) => ({ value, labelKey: `workers.status.${value}` })),
    },
    { key: 'from', labelKey: 'filters.hiredFrom', type: 'date' },
    { key: 'to', labelKey: 'filters.to', type: 'date' },
  ];

  protected fetch(projectId: number): Observable<Worker[]> {
    return this.workerService.getByProject(projectId);
  }

  protected openForm(worker?: Worker): void {
    openFormDialog<Worker, WorkerFormDialogData>(this.dialog, WorkerFormDialogComponent, {
      projectId: this.currentProjectId,
      worker,
    }).closed.subscribe((saved) => {
      if (saved) {
        this.afterChange(worker ? 'workers.messages.updated' : 'workers.messages.created', { name: saved.fullName });
      }
    });
  }

  /** Shortcut to HU07 from the staff list. */
  protected assignTask(worker: Worker): void {
    openFormDialog<Task, TaskFormDialogData>(this.dialog, TaskFormDialogComponent, {
      projectId: this.currentProjectId,
      workers: [...this.table.rows()],
      workerId: worker.id,
    }).closed.subscribe((task) => {
      if (task) {
        this.toast.success('tasks.messages.created', { title: task.title, worker: worker.fullName });
      }
    });
  }

  protected delete(worker: Worker): void {
    this.confirmDelete({
      titleKey: 'workers.delete.title',
      messageKey: 'workers.delete.message',
      params: { name: worker.fullName },
      successKey: 'workers.messages.deleted',
      remove: () => this.workerService.delete(worker.id),
    });
  }
}
