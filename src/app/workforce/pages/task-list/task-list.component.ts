import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, forkJoin, map } from 'rxjs';
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
import { apiErrorKey } from '../../../shared/utils/api-error';
import { compareIsoDesc, isWithinIsoRange } from '../../../shared/utils/date.utils';
import { TableState, normalizeText } from '../../../shared/utils/table-state';
import {
  TaskFormDialogComponent,
  TaskFormDialogData,
} from '../../components/task-form-dialog/task-form-dialog.component';
import { Task, TaskStatus } from '../../model/task.entity';
import { Worker } from '../../model/worker.entity';
import { TaskService } from '../../services/task.service';
import { WorkerService } from '../../services/worker.service';

export const TASK_STATUS_TONE: Record<TaskStatus, BadgeTone> = {
  [TaskStatus.Pending]: 'warning',
  [TaskStatus.InProgress]: 'info',
  [TaskStatus.Completed]: 'success',
};

interface TaskRow {
  task: Task;
  workerName: string;
}

/** Tasks of the work (HU08, HU43) with assignment (HU07), update (HU53) and deletion (HU50). */
@Component({
  selector: 'app-task-list',
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
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskListComponent extends ProjectScopedListPage<TaskRow> {
  private readonly taskService = inject(TaskService);
  private readonly workerService = inject(WorkerService);
  protected readonly statusTone = TASK_STATUS_TONE;
  protected readonly workers = signal<Worker[]>([]);
  protected readonly filterFields = signal<FilterField[]>(this.buildFilters([]));

  protected readonly table = new TableState<TaskRow>({
    search: (row, query) =>
      normalizeText(`${row.task.title} ${row.task.description} ${row.workerName}`).includes(query),
    filter: (row, filters) =>
      (!filters['status'] || row.task.status === filters['status']) &&
      (!filters['worker'] || String(row.task.workerId) === filters['worker']) &&
      isWithinIsoRange(row.task.dueDate, filters['from'], filters['to']),
    sort: (a, b) => compareIsoDesc(b.task.dueDate, a.task.dueDate),
  });

  protected fetch(projectId: number): Observable<TaskRow[]> {
    return forkJoin([this.taskService.getByProject(projectId), this.workerService.getByProject(projectId)]).pipe(
      map(([tasks, workers]) => {
        this.workers.set(workers);
        this.filterFields.set(this.buildFilters(workers));
        return tasks.map((task) => ({
          task,
          workerName: workers.find((worker) => worker.id === task.workerId)?.fullName ?? task.workerName,
        }));
      }),
    );
  }

  protected openForm(task?: Task): void {
    openFormDialog<Task, TaskFormDialogData>(this.dialog, TaskFormDialogComponent, {
      projectId: this.currentProjectId,
      workers: this.workers(),
      task,
    }).closed.subscribe((saved) => {
      if (saved) {
        const worker = this.workers().find((candidate) => candidate.id === saved.workerId)?.fullName ?? '';
        this.afterChange(task ? 'tasks.messages.updated' : 'tasks.messages.created', { title: saved.title, worker });
      }
    });
  }

  /** Quick status change from the row menu (HU53). */
  protected markCompleted(task: Task): void {
    this.taskService
      .update(task.id, {
        projectId: task.projectId,
        workerId: task.workerId,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        status: TaskStatus.Completed,
      })
      .subscribe({
        next: () => this.afterChange('tasks.messages.completed', { title: task.title }),
        error: (error: unknown) => this.toast.error(apiErrorKey(error)),
      });
  }

  protected delete(task: Task): void {
    this.confirmDelete({
      titleKey: 'tasks.delete.title',
      messageKey: 'tasks.delete.message',
      params: { title: task.title },
      successKey: 'tasks.messages.deleted',
      remove: () => this.taskService.delete(task.id),
    });
  }

  private buildFilters(workers: Worker[]): FilterField[] {
    return [
      {
        key: 'status',
        labelKey: 'common.status',
        type: 'select',
        options: Object.values(TaskStatus).map((value) => ({ value, labelKey: `tasks.status.${value}` })),
      },
      {
        key: 'worker',
        labelKey: 'tasks.fields.worker',
        type: 'select',
        options: [...workers]
          .sort((a, b) => a.fullName.localeCompare(b.fullName))
          .map((worker) => ({ value: String(worker.id), labelKey: worker.fullName })),
      },
      { key: 'from', labelKey: 'filters.dueFrom', type: 'date' },
      { key: 'to', labelKey: 'filters.to', type: 'date' },
    ];
  }
}
