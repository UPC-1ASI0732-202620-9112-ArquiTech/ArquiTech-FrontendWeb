import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { ProjectScopedListPage } from '../../../shared/presentation/pages/project-scoped-list.page';
import {
  DataToolbarComponent,
  FilterField,
} from '../../../shared/presentation/components/data-toolbar/data-toolbar.component';
import { ListStateComponent } from '../../../shared/presentation/components/list-state/list-state.component';
import { PaginatorComponent } from '../../../shared/presentation/components/paginator/paginator.component';
import { StatusBadgeComponent } from '../../../shared/presentation/components/status-badge/status-badge.component';
import { AppDatePipe } from '../../../shared/presentation/pipes/format.pipes';
import { BadgeTone } from '../../../shared/presentation/icons';
import { TableState, normalizeText } from '../../../shared/utils/table-state';
import { isWithinIsoRange, todayIsoDate } from '../../../shared/utils/date.utils';
import { apiErrorKey } from '../../../shared/utils/api-error';
import { openFormDialog } from '../../../shared/services/dialog.helpers';
import { Attendance, AttendanceStatus } from '../../model/attendance.entity';
import { AttendanceService } from '../../services/attendance.service';
import { WorkerService } from '../../services/worker.service';
import {
  AttendanceFormDialogComponent,
  AttendanceFormDialogData,
} from '../../components/attendance-form-dialog/attendance-form-dialog.component';
@Component({
  selector: 'app-attendance-list',
  imports: [
    TranslatePipe,
    DataToolbarComponent,
    ListStateComponent,
    PaginatorComponent,
    StatusBadgeComponent,
    AppDatePipe,
  ],
  templateUrl: './attendance-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceListComponent extends ProjectScopedListPage<Attendance> {
  private readonly service = inject(AttendanceService);
  private readonly workers = inject(WorkerService);
  protected readonly statusTone: Record<AttendanceStatus, BadgeTone> = {
    PRESENT: 'success',
    ABSENT: 'danger',
    LATE: 'warning',
    EXCUSED: 'info',
  };
  protected readonly table = new TableState<Attendance>({
    search: (row, query) => normalizeText(row.workerName + ' ' + row.notes).includes(query),
    filter: (row, f) =>
      (!f['status'] || row.status === f['status']) && isWithinIsoRange(row.attendanceDate, f['from'], f['to']),
    sort: (a, b) => b.attendanceDate.localeCompare(a.attendanceDate) || a.workerName.localeCompare(b.workerName),
  });
  protected readonly filterFields: FilterField[] = [
    {
      key: 'status',
      labelKey: 'common.status',
      type: 'select',
      options: Object.values(AttendanceStatus).map((value) => ({ value, labelKey: 'attendance.status.' + value })),
    },
    { key: 'from', labelKey: 'filters.from', type: 'date' },
    { key: 'to', labelKey: 'filters.to', type: 'date' },
  ];
  constructor() {
    super();
    this.table.setFilter('from', todayIsoDate());
    this.table.setFilter('to', todayIsoDate());
  }
  protected fetch(projectId: number): Observable<Attendance[]> {
    return this.service.getByProject(projectId);
  }
  protected openForm(attendance?: Attendance): void {
    this.workers.getByProject(this.currentProjectId).subscribe({
      next: (workers) => {
        if (!workers.some((w) => w.isActive() || w.id === attendance?.workerId)) {
          this.toast.error('attendance.noWorkers');
          return;
        }
        openFormDialog<Attendance, AttendanceFormDialogData>(this.dialog, AttendanceFormDialogComponent, {
          projectId: this.currentProjectId,
          workers,
          attendance,
          date: this.table.filters()['from'] || todayIsoDate(),
        }).closed.subscribe((saved) => {
          if (saved) this.afterChange('attendance.saved');
        });
      },
      error: (e: unknown) => this.toast.error(apiErrorKey(e)),
    });
  }
  protected delete(row: Attendance): void {
    this.confirmDelete({
      titleKey: 'attendance.deleteTitle',
      messageKey: 'attendance.deleteMessage',
      params: { name: row.workerName, date: row.attendanceDate },
      successKey: 'attendance.deleted',
      remove: () => this.service.delete(row.id),
    });
  }
}
