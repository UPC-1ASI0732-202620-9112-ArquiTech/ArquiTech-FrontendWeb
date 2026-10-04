import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { FieldErrorComponent } from '../../../shared/presentation/components/field-error/field-error.component';
import { apiErrorKey } from '../../../shared/utils/api-error';
import { todayIsoDate } from '../../../shared/utils/date.utils';
import { Attendance, AttendanceStatus } from '../../model/attendance.entity';
import { AttendanceRequest, attendanceRequest, validAttendanceTimes } from '../../model/attendance-request';
import { Worker } from '../../model/worker.entity';
import { AttendanceService } from '../../services/attendance.service';
export interface AttendanceFormDialogData {
  projectId: number;
  workers: Worker[];
  attendance?: Attendance;
  date?: string;
}
function localInput(instant: string | null | undefined): string {
  if (!instant) return '';
  const date = new Date(instant);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
@Component({
  selector: 'app-attendance-form-dialog',
  imports: [ReactiveFormsModule, TranslatePipe, FieldErrorComponent],
  templateUrl: './attendance-form-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceFormDialogComponent {
  protected readonly data = inject<AttendanceFormDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<Attendance>>(DialogRef);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly service = inject(AttendanceService);
  protected readonly workers = this.data.workers.filter(
    (w) => w.projectId === this.data.projectId && (w.isActive() || w.id === this.data.attendance?.workerId),
  );
  protected readonly statuses = Object.values(AttendanceStatus);
  protected readonly submitting = signal(false);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly form = this.fb.group({
    workerId: [String(this.data.attendance?.workerId ?? this.workers[0]?.id ?? ''), Validators.required],
    attendanceDate: [this.data.attendance?.attendanceDate ?? this.data.date ?? todayIsoDate(), Validators.required],
    status: [this.data.attendance?.status ?? AttendanceStatus.Present, Validators.required],
    checkInAt: [localInput(this.data.attendance?.checkInAt)],
    checkOutAt: [localInput(this.data.attendance?.checkOutAt)],
    notes: [this.data.attendance?.notes ?? '', Validators.maxLength(1000)],
  });
  protected allowsTimes(): boolean {
    return [AttendanceStatus.Present, AttendanceStatus.Late].includes(this.form.controls.status.value);
  }
  protected changeStatus(): void {
    if (!this.allowsTimes()) this.form.patchValue({ checkInAt: '', checkOutAt: '' });
  }
  protected close(): void {
    if (!this.submitting()) this.dialogRef.close();
  }
  protected submit(): void {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    if (!validAttendanceTimes(raw.status, raw.checkInAt || null, raw.checkOutAt || null)) {
      this.errorKey.set('attendance.invalidTimes');
      return;
    }
    const worker = this.workers.find((w) => w.id === Number(raw.workerId));
    if (!worker || raw.attendanceDate < worker.hireDate) {
      this.errorKey.set('attendance.beforeHire');
      return;
    }
    const request: AttendanceRequest = attendanceRequest(raw);
    const result = this.data.attendance
      ? this.service.update(this.data.attendance.id, request)
      : this.service.create({ ...request, projectId: this.data.projectId });
    this.submitting.set(true);
    this.errorKey.set(null);
    this.form.disable();
    this.dialogRef.disableClose = true;
    result.subscribe({
      next: (row) => this.dialogRef.close(row),
      error: (error: unknown) => {
        this.submitting.set(false);
        this.form.enable();
        this.dialogRef.disableClose = false;
        this.errorKey.set(apiErrorKey(error));
      },
    });
  }
}
