import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { FieldErrorComponent } from '../../../shared/presentation/components/field-error/field-error.component';
import { AppNumberPipe } from '../../../shared/presentation/pipes/format.pipes';
import { apiErrorKey } from '../../../shared/utils/api-error';
import { todayIsoDate } from '../../../shared/utils/date.utils';
import { maxStockValidator, notFutureDateValidator } from '../../../shared/utils/form-validators';
import { toEventDateTime } from '../../../shared/utils/movement-date';
import { MaterialMovement, MovementType } from '../../model/material-movement.entity';
import { Material } from '../../model/material.entity';
import { MaterialService } from '../../services/material.service';

export interface MaterialMovementDialogData {
  type: MovementType;
  materials: Material[];
  material?: Material;
}

/** Entry (HU01) or usage (HU02) of a material. Usage cannot exceed the stock (TS03). */
@Component({
  selector: 'app-material-movement-dialog',
  imports: [ReactiveFormsModule, TranslatePipe, LucideAngularModule, FieldErrorComponent, AppNumberPipe],
  templateUrl: './material-movement-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaterialMovementDialogComponent {
  protected readonly data = inject<MaterialMovementDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<MaterialMovement>>(DialogRef);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly materialService = inject(MaterialService);

  protected readonly isEntry = this.data.type === MovementType.Entry;
  protected readonly today = todayIsoDate();
  protected readonly submitting = signal(false);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly materials = [...this.data.materials].sort((a, b) => a.name.localeCompare(b.name));

  protected readonly form = this.formBuilder.group({
    materialId: [(this.data.material?.id ?? null) as number | null, [Validators.required]],
    quantity: [null as number | null, [Validators.required, Validators.min(0.01)]],
    supplier: [this.data.material?.provider ?? ''],
    occurredAt: [this.today, [Validators.required, notFutureDateValidator()]],
    note: ['', [Validators.maxLength(200)]],
  });

  private readonly materialId = toSignal(this.form.controls.materialId.valueChanges, {
    initialValue: this.form.controls.materialId.value,
  });

  protected readonly selected = computed(
    () => this.materials.find((material) => material.id === Number(this.materialId())) ?? null,
  );

  constructor() {
    if (this.isEntry) {
      this.form.controls.supplier.addValidators([Validators.required, Validators.maxLength(80)]);
    } else {
      this.form.controls.quantity.addValidators(maxStockValidator(() => this.selected()?.stock ?? null));
    }
    this.form.controls.materialId.valueChanges.subscribe((id) => {
      const material = this.materials.find((candidate) => candidate.id === Number(id));
      if (this.isEntry && material && !this.form.controls.supplier.dirty) {
        this.form.controls.supplier.setValue(material.provider);
      }
      this.form.controls.quantity.updateValueAndValidity();
    });
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
    const materialId = Number(value.materialId);
    const occurredAt = toEventDateTime(value.occurredAt);
    const request$ = this.isEntry
      ? this.materialService.registerEntry(materialId, {
          quantity: Number(value.quantity),
          supplier: value.supplier.trim(),
          occurredAt,
          note: value.note.trim(),
        })
      : this.materialService.registerUsage(materialId, {
          quantity: Number(value.quantity),
          occurredAt,
          note: value.note.trim(),
        });

    this.submitting.set(true);
    this.errorKey.set(null);
    request$.subscribe({
      next: (movement) => this.dialogRef.close(movement),
      error: (error: unknown) => {
        // AC2 (HU01/HU02): the stock is not modified when the request is rejected.
        this.submitting.set(false);
        this.errorKey.set(apiErrorKey(error));
      },
    });
  }
}
