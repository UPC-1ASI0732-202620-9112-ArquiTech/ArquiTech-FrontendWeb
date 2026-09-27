import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Observable } from 'rxjs';
import {
  DataToolbarComponent,
  FilterField,
} from '../../../shared/presentation/components/data-toolbar/data-toolbar.component';
import { ListStateComponent } from '../../../shared/presentation/components/list-state/list-state.component';
import { PaginatorComponent } from '../../../shared/presentation/components/paginator/paginator.component';
import { StatusBadgeComponent } from '../../../shared/presentation/components/status-badge/status-badge.component';
import { ProjectScopedListPage } from '../../../shared/presentation/pages/project-scoped-list.page';
import { AppDatePipe } from '../../../shared/presentation/pipes/format.pipes';
import { openFormDialog } from '../../../shared/services/dialog.helpers';
import { apiErrorKey } from '../../../shared/utils/api-error';
import { compareIsoDesc, isWithinIsoRange } from '../../../shared/utils/date.utils';
import { TableState, normalizeText } from '../../../shared/utils/table-state';
import {
  IncidentFormDialogComponent,
  IncidentFormDialogData,
} from '../../components/incident-form-dialog/incident-form-dialog.component';
import { INCIDENT_SEVERITY_TONE, INCIDENT_STATUS_TONE } from '../../components/incident.tones';
import { INCIDENT_TYPES, Incident, IncidentSeverity, IncidentStatus } from '../../model/incident.entity';
import { IncidentService } from '../../services/incident.service';

/** Figma "Incidentes": incidents of the work (HU37, HU39) and their management (HU35, HU36, HU51). */
@Component({
  selector: 'app-incident-list',
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
  templateUrl: './incident-list.component.html',
  styleUrl: './incident-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentListComponent extends ProjectScopedListPage<Incident> {
  private readonly incidentService = inject(IncidentService);
  private readonly translate = inject(TranslateService);
  protected readonly severityTone = INCIDENT_SEVERITY_TONE;
  protected readonly statusTone = INCIDENT_STATUS_TONE;

  protected readonly table = new TableState<Incident>({
    search: (incident, query) =>
      normalizeText(
        `${incident.typeKey ? this.translate.instant(incident.typeKey) : incident.type} ${incident.description}`,
      ).includes(query),
    filter: (incident, filters) =>
      (!filters['type'] || incident.type === filters['type']) &&
      (!filters['severity'] || incident.severity === filters['severity']) &&
      (!filters['status'] || incident.status === filters['status']) &&
      isWithinIsoRange(incident.reportedAt, filters['from'], filters['to']),
    // Chronological order, newest first.
    sort: (a, b) => compareIsoDesc(a.reportedAt, b.reportedAt),
  });

  protected readonly filterFields: FilterField[] = [
    {
      key: 'type',
      labelKey: 'incidents.fields.type',
      type: 'select',
      options: INCIDENT_TYPES.map((value) => ({ value, labelKey: `incidents.types.${value}` })),
    },
    {
      key: 'severity',
      labelKey: 'incidents.fields.severity',
      type: 'select',
      options: Object.values(IncidentSeverity).map((value) => ({ value, labelKey: `incidents.severity.${value}` })),
    },
    {
      key: 'status',
      labelKey: 'common.status',
      type: 'select',
      options: Object.values(IncidentStatus).map((value) => ({ value, labelKey: `incidents.status.${value}` })),
    },
    { key: 'from', labelKey: 'filters.from', type: 'date' },
    { key: 'to', labelKey: 'filters.to', type: 'date' },
  ];

  protected fetch(projectId: number): Observable<Incident[]> {
    return this.incidentService.getByProject(projectId);
  }

  protected openForm(incident?: Incident): void {
    openFormDialog<Incident, IncidentFormDialogData>(this.dialog, IncidentFormDialogComponent, {
      projectId: this.currentProjectId,
      incident,
    }).closed.subscribe((saved) => {
      if (saved) {
        this.afterChange(incident ? 'incidents.messages.updated' : 'incidents.messages.created');
      }
    });
  }

  /** Quick resolution from the row menu (HU36). */
  protected markResolved(incident: Incident): void {
    this.incidentService
      .update(incident.id, {
        projectId: incident.projectId,
        reportedByUserId: incident.reportedByUserId,
        type: incident.type,
        description: incident.description,
        severity: incident.severity,
        status: IncidentStatus.Resolved,
        reportedAt: incident.reportedAt,
      })
      .subscribe({
        next: () => this.afterChange('incidents.messages.resolved'),
        error: (error: unknown) => this.toast.error(apiErrorKey(error)),
      });
  }

  protected delete(incident: Incident): void {
    this.confirmDelete({
      titleKey: 'incidents.delete.title',
      messageKey: 'incidents.delete.message',
      params: {},
      successKey: 'incidents.messages.deleted',
      remove: () => this.incidentService.delete(incident.id),
    });
  }
}
