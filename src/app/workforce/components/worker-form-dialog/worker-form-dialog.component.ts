import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { FieldErrorComponent } from '../../../shared/presentation/components/field-error/field-error.component';
import { apiErrorKey } from '../../../shared/utils/api-error';
import { todayIsoDate } from '../../../shared/utils/date.utils';
import { notBlankValidator, notFutureDateValidator } from '../../../shared/utils/form-validators';
import { SaveWorkerRequest, Worker, WorkerStatus } from '../../model/worker.entity';
import { WorkerService } from '../../services/worker.service';

export interface WorkerFormDialogData {
  projectId: number;
  worker?: Worker;
}

export const WORKER_ROLES = [
  'Maestro de obra',
  'Capataz',
  'Operario',
  'Oficial',
  'Peón',
  'Albañil',
  'Electricista',
  'Gasfitero',
  'Operador',
  'Topógrafo',
];

/** Register (HU06) or update (HU32) a worker of the work. */
@Component({
  selector: 'app-worker-form-dialog',
  imports: [ReactiveFormsModule, TranslatePipe, LucideAngularModule, FieldErrorComponent],
  templateUrl: './worker-form-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkerFormDialogComponent {
  protected readonly data = inject<WorkerFormDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<Worker>>(DialogRef);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly workerService = inject(WorkerService);

  protected readonly isEdit = !!this.data.worker;
  protected readonly roles = WORKER_ROLES;
  protected readonly statuses = Object.values(WorkerStatus);
  protected readonly today = todayIsoDate();
  protected readonly submitting = signal(false);
  protected readonly errorKey = signal<string | null>(null);

  protected readonly form = this.formBuilder.group({
    fullName: [this.data.worker?.fullName ?? '', [Validators.required, notBlankValidator(), Validators.maxLength(80)]],
    role: [this.data.worker?.role ?? '', [Validators.required, notBlankValidator(), Validators.maxLength(40)]],
    specialty: [this.data.worker?.specialty ?? '', [Validators.maxLength(60)]],
    hireDate: [this.data.worker?.hireDate ?? this.today, [Validators.required, notFutureDateValidator()]],
    status: [(this.data.worker?.status ?? WorkerStatus.Active) as string, [Validators.required]],
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
    const request: SaveWorkerRequest = {
      projectId: this.data.projectId,
      fullName: value.fullName.trim(),
      role: value.role.trim(),
      specialty: value.specialty.trim(),
      hireDate: value.hireDate,
      status: value.status,
    };
    const request$ = this.data.worker
      ? this.workerService.update(this.data.worker.id, request)
      : this.workerService.create(request);

    this.submitting.set(true);
    this.errorKey.set(null);
    request$.subscribe({
      next: (worker) => this.dialogRef.close(worker),
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorKey.set(apiErrorKey(error));
      },
    });
  }
}
