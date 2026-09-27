import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { SessionService } from '../../../iam/services/session.service';
import { FieldErrorComponent } from '../../../shared/presentation/components/field-error/field-error.component';
import { apiErrorKey } from '../../../shared/utils/api-error';
import { todayIsoDate } from '../../../shared/utils/date.utils';
import { notBlankValidator, notFutureDateValidator } from '../../../shared/utils/form-validators';
import { toEventDateTime } from '../../../shared/utils/movement-date';
import {
  INCIDENT_TYPES,
  Incident,
  IncidentSeverity,
  IncidentStatus,
  SaveIncidentRequest,
} from '../../model/incident.entity';
import { IncidentService } from '../../services/incident.service';

export interface IncidentFormDialogData {
  projectId: number;
  incident?: Incident;
}

/** Register (HU35) or update (HU36) an incident of the work. */
@Component({
  selector: 'app-incident-form-dialog',
  imports: [ReactiveFormsModule, TranslatePipe, LucideAngularModule, FieldErrorComponent],
  templateUrl: './incident-form-dialog.component.html',
  styleUrl: './incident-form-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentFormDialogComponent {
  protected readonly data = inject<IncidentFormDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<Incident>>(DialogRef);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly incidentService = inject(IncidentService);
  private readonly session = inject(SessionService);

  protected readonly isEdit = !!this.data.incident;
  protected readonly types = INCIDENT_TYPES;
  protected readonly severities = Object.values(IncidentSeverity);
  protected readonly statuses = Object.values(IncidentStatus);
  protected readonly today = todayIsoDate();
  protected readonly submitting = signal(false);
  protected readonly errorKey = signal<string | null>(null);

  protected readonly form = this.formBuilder.group({
    type: [this.data.incident?.type ?? '', [Validators.required]],
    description: [
      this.data.incident?.description ?? '',
      [Validators.required, notBlankValidator(), Validators.minLength(10), Validators.maxLength(500)],
    ],
    severity: [(this.data.incident?.severity ?? IncidentSeverity.Medium) as string, [Validators.required]],
    status: [(this.data.incident?.status ?? IncidentStatus.Open) as string, [Validators.required]],
    reportedAt: [
      this.data.incident?.reportedAt.slice(0, 10) ?? this.today,
      [Validators.required, notFutureDateValidator()],
    ],
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
    const incident = this.data.incident;
    const keepsDate = incident && incident.reportedAt.slice(0, 10) === value.reportedAt;
    const request: SaveIncidentRequest = {
      projectId: this.data.projectId,
      reportedByUserId: incident?.reportedByUserId ?? this.session.user()?.id ?? 0,
      type: value.type,
      description: value.description.trim(),
      severity: value.severity,
      status: value.status,
      reportedAt: keepsDate ? incident.reportedAt : toEventDateTime(value.reportedAt),
      resolvedAt: incident?.resolvedAt ?? null,
    };
    const request$ = incident
      ? this.incidentService.update(incident.id, request)
      : this.incidentService.create(request);

    this.submitting.set(true);
    this.errorKey.set(null);
    request$.subscribe({
      next: (saved) => this.dialogRef.close(saved),
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorKey.set(apiErrorKey(error));
      },
    });
  }
}
