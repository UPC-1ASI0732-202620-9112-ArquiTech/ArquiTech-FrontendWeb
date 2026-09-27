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
  MachineryFormDialogComponent,
  MachineryFormDialogData,
} from '../../components/machinery-form-dialog/machinery-form-dialog.component';
import { Machinery, MachineryStatus } from '../../model/machinery.entity';
import { MachineryService } from '../../services/machinery.service';

export const MACHINERY_STATUS_TONE: Record<MachineryStatus, BadgeTone> = {
  [MachineryStatus.Operational]: 'success',
  [MachineryStatus.Maintenance]: 'warning',
  [MachineryStatus.OutOfService]: 'danger',
};

/** Figma "Maquinaria": machines of the work (HU30, HU41) and their management (HU05, HU31, HU48). */
@Component({
  selector: 'app-machinery-list',
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
  templateUrl: './machinery-list.component.html',
  styleUrl: './machinery-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MachineryListComponent extends ProjectScopedListPage<Machinery> {
  private readonly machineryService = inject(MachineryService);
  protected readonly statusTone = MACHINERY_STATUS_TONE;

  protected readonly table = new TableState<Machinery>({
    search: (machine, query) =>
      normalizeText(`${machine.name} ${machine.serialNumber} ${machine.description}`).includes(query),
    filter: (machine, filters) =>
      (!filters['status'] || machine.status === filters['status']) &&
      isWithinIsoRange(machine.registeredAt, filters['from'], filters['to']),
    sort: (a, b) => a.name.localeCompare(b.name),
  });

  protected readonly filterFields: FilterField[] = [
    {
      key: 'status',
      labelKey: 'common.status',
      type: 'select',
      options: Object.values(MachineryStatus).map((value) => ({ value, labelKey: `machinery.status.${value}` })),
    },
    { key: 'from', labelKey: 'filters.from', type: 'date' },
    { key: 'to', labelKey: 'filters.to', type: 'date' },
  ];

  protected fetch(projectId: number): Observable<Machinery[]> {
    return this.machineryService.getByProject(projectId);
  }

  protected openForm(machinery?: Machinery): void {
    openFormDialog<Machinery, MachineryFormDialogData>(this.dialog, MachineryFormDialogComponent, {
      projectId: this.currentProjectId,
      machinery,
    }).closed.subscribe((saved) => {
      if (saved) {
        this.afterChange(machinery ? 'machinery.messages.updated' : 'machinery.messages.created', { name: saved.name });
      }
    });
  }

  protected delete(machinery: Machinery): void {
    this.confirmDelete({
      titleKey: 'machinery.delete.title',
      messageKey: 'machinery.delete.message',
      params: { name: `${machinery.name} (${machinery.serialNumber})` },
      successKey: 'machinery.messages.deleted',
      remove: () => this.machineryService.delete(machinery.id),
    });
  }
}
