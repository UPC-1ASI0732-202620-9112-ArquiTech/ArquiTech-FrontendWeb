import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { FieldErrorComponent } from '../../../shared/presentation/components/field-error/field-error.component';
import { apiErrorKey } from '../../../shared/utils/api-error';
import { todayIsoDate } from '../../../shared/utils/date.utils';
import { notBlankValidator, notFutureDateValidator } from '../../../shared/utils/form-validators';
import { Machinery, MachineryStatus, SaveMachineryRequest } from '../../model/machinery.entity';
import { MachineryService } from '../../services/machinery.service';

export interface MachineryFormDialogData {
  projectId: number;
  machinery?: Machinery;
}

/** Register (HU05) or update (HU31) a machine of the work. */
@Component({
  selector: 'app-machinery-form-dialog',
  imports: [ReactiveFormsModule, TranslatePipe, LucideAngularModule, FieldErrorComponent],
  templateUrl: './machinery-form-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MachineryFormDialogComponent {
  protected readonly data = inject<MachineryFormDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<Machinery>>(DialogRef);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly machineryService = inject(MachineryService);

  protected readonly isEdit = !!this.data.machinery;
  protected readonly statuses = Object.values(MachineryStatus);
  protected readonly today = todayIsoDate();
  protected readonly submitting = signal(false);
  protected readonly errorKey = signal<string | null>(null);

  protected readonly form = this.formBuilder.group({
    name: [this.data.machinery?.name ?? '', [Validators.required, notBlankValidator(), Validators.maxLength(80)]],
    serialNumber: [
      this.data.machinery?.serialNumber ?? '',
      [Validators.required, Validators.pattern(/^[A-Za-z0-9-]{3,20}$/)],
    ],
    registeredAt: [this.data.machinery?.registeredAt ?? this.today, [Validators.required, notFutureDateValidator()]],
    status: [(this.data.machinery?.status ?? MachineryStatus.Operational) as string, [Validators.required]],
    description: [this.data.machinery?.description ?? '', [Validators.maxLength(240)]],
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
    const request: SaveMachineryRequest = {
      projectId: this.data.projectId,
      name: value.name.trim(),
      serialNumber: value.serialNumber.trim().toUpperCase(),
      registeredAt: value.registeredAt,
      status: value.status,
      description: value.description.trim(),
    };
    const request$ = this.data.machinery
      ? this.machineryService.update(this.data.machinery.id, request)
      : this.machineryService.create(request);

    this.submitting.set(true);
    this.errorKey.set(null);
    request$.subscribe({
      next: (machinery) => this.dialogRef.close(machinery),
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorKey.set(apiErrorKey(error));
      },
    });
  }
}
