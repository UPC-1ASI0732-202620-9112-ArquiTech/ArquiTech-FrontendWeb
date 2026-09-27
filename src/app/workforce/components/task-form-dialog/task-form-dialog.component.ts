import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { FieldErrorComponent } from '../../../shared/presentation/components/field-error/field-error.component';
import { apiErrorKey } from '../../../shared/utils/api-error';
import { todayIsoDate } from '../../../shared/utils/date.utils';
import { notBlankValidator } from '../../../shared/utils/form-validators';
import { SaveTaskRequest, Task, TaskStatus } from '../../model/task.entity';
import { Worker } from '../../model/worker.entity';
import { TaskService } from '../../services/task.service';

export interface TaskFormDialogData {
  projectId: number;
  workers: Worker[];
  task?: Task;
  workerId?: number;
}

/** Assign a task to a worker (HU07) or update its data and status (HU53). */
@Component({
  selector: 'app-task-form-dialog',
  imports: [ReactiveFormsModule, TranslatePipe, LucideAngularModule, FieldErrorComponent],
  templateUrl: './task-form-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFormDialogComponent {
  protected readonly data = inject<TaskFormDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<Task>>(DialogRef);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly taskService = inject(TaskService);

  protected readonly isEdit = !!this.data.task;
  protected readonly statuses = Object.values(TaskStatus);
  protected readonly submitting = signal(false);
  protected readonly errorKey = signal<string | null>(null);

  /** Inactive workers cannot receive new tasks, but stay selectable if already assigned. */
  protected readonly workers = [...this.data.workers]
    .filter((worker) => worker.isActive() || worker.id === this.data.task?.workerId)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  protected readonly form = this.formBuilder.group({
    title: [this.data.task?.title ?? '', [Validators.required, notBlankValidator(), Validators.maxLength(100)]],
    description: [this.data.task?.description ?? '', [Validators.maxLength(400)]],
    workerId: [(this.data.task?.workerId ?? this.data.workerId ?? null) as number | null, [Validators.required]],
    dueDate: [this.data.task?.dueDate ?? todayIsoDate(), [Validators.required]],
    status: [(this.data.task?.status ?? TaskStatus.Pending) as string, [Validators.required]],
  });

  protected close(): void {
    this.dialogRef.close();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const request: SaveTaskRequest = {
      projectId: this.data.projectId,
      workerId: Number(value.workerId),
      title: value.title.trim(),
      description: value.description.trim(),
      dueDate: value.dueDate,
      status: value.status,
      completedAt: this.data.task?.completedAt ?? null,
    };
    const request$ = this.data.task
      ? this.taskService.update(this.data.task.id, request)
      : this.taskService.create(request);

    this.submitting.set(true);
    this.errorKey.set(null);
    request$.subscribe({
      next: (task) => this.dialogRef.close(task),
      error: (error: unknown) => {
        // HU07 AC2: the assignment is rejected when the worker does not exist.
        this.submitting.set(false);
        this.errorKey.set(apiErrorKey(error));
      },
    });
  }
}
