import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Observable } from 'rxjs';
import { FieldErrorComponent } from '../../../shared/presentation/components/field-error/field-error.component';
import { apiErrorKey } from '../../../shared/utils/api-error';
import { todayIsoDate } from '../../../shared/utils/date.utils';
import { notBlankValidator, notFutureDateValidator, rucValidator } from '../../../shared/utils/form-validators';
import { toEventDateTime } from '../../../shared/utils/movement-date';
import { Material } from '../../model/material.entity';
import { MaterialService } from '../../services/material.service';

export interface MaterialFormDialogData {
  projectId: number;
  material?: Material;
}

export const MATERIAL_UNITS = ['kg', 'bolsa', 'unidad', 'litro', 'galón', 'm³', 'm²', 'm', 'varilla', 'plancha'];

/** Register a material with its first entry, or update its information (HU29). */
@Component({
  selector: 'app-material-form-dialog',
  imports: [ReactiveFormsModule, TranslatePipe, LucideAngularModule, FieldErrorComponent],
  templateUrl: './material-form-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaterialFormDialogComponent {
  protected readonly data = inject<MaterialFormDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<Material>>(DialogRef);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly materialService = inject(MaterialService);

  protected readonly isEdit = !!this.data.material;
  protected readonly units = MATERIAL_UNITS;
  protected readonly today = todayIsoDate();
  protected readonly submitting = signal(false);
  protected readonly errorKey = signal<string | null>(null);

  protected readonly form = this.formBuilder.group({
    name: [this.data.material?.name ?? '', [Validators.required, notBlankValidator(), Validators.maxLength(80)]],
    unit: [this.data.material?.unit ?? '', [Validators.required, notBlankValidator(), Validators.maxLength(20)]],
    quantity: [0, [Validators.required, Validators.min(0)]],
    unitPrice: [this.data.material?.unitPrice ?? 0, [Validators.required, Validators.min(0)]],
    minimumStock: [this.data.material?.minimumStock ?? 0, [Validators.required, Validators.min(0)]],
    provider: [
      this.data.material?.provider ?? '',
      [Validators.required, notBlankValidator(), Validators.maxLength(80)],
    ],
    providerRuc: [this.data.material?.providerRuc ?? '', [Validators.required, rucValidator()]],
    date: [this.today, [Validators.required, notFutureDateValidator()]],
  });

  constructor() {
    if (this.isEdit) {
      // Stock only changes through entries and usages, so it is not editable here.
      this.form.controls.quantity.disable();
      this.form.controls.date.disable();
    }
  }

  protected close(): void {
    this.dialogRef.close();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const information = {
      name: value.name.trim(),
      unit: value.unit.trim(),
      unitPrice: Number(value.unitPrice),
      minimumStock: Number(value.minimumStock),
      provider: value.provider.trim(),
      providerRuc: value.providerRuc.trim(),
    };
    const request$: Observable<Material> = this.data.material
      ? this.materialService.updateInformation(this.data.material.id, information)
      : this.materialService.register({
          ...information,
          projectId: this.data.projectId,
          quantity: Number(value.quantity),
          date: toEventDateTime(value.date),
        });

    this.submitting.set(true);
    this.errorKey.set(null);
    request$.subscribe({
      next: (material) => this.dialogRef.close(material),
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorKey.set(apiErrorKey(error));
      },
    });
  }
}
