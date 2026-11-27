import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal, importProvidersFrom } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../../../shared/presentation/icons';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { AttendanceListComponent } from './attendance-list.component';
import { AttendanceService } from '../../services/attendance.service';
import { WorkerService } from '../../services/worker.service';
import { SessionService } from '../../../iam/services/session.service';
import { ProjectAlertsService } from '../../../reports/services/project-alerts.service';
import { Attendance, AttendanceStatus } from '../../model/attendance.entity';
import { todayIsoDate } from '../../../shared/utils/date.utils';
describe('Attendance role UI', () => {
  for (const supervisor of [true, false]) {
    it((supervisor ? 'Supervisor' : 'Contractor') + ' permissions are respected', () => {
      const row = new Attendance({
        id: 20,
        projectId: 9,
        workerId: 3,
        workerName: 'Ana',
        attendanceDate: todayIsoDate(),
        status: AttendanceStatus.Present,
        checkInAt: null,
        checkOutAt: null,
        notes: null,
        registeredByUserId: 1,
        createdAt: '',
        updatedAt: '',
      });
      TestBed.configureTestingModule({
        imports: [AttendanceListComponent, TranslateModule.forRoot()],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          importProvidersFrom(LucideAngularModule.pick(APP_ICONS)),
          { provide: SessionService, useValue: {
            isSupervisor: signal(supervisor), isContractor: signal(!supervisor),
            user: signal({ id: 1 }),
          } },
          { provide: AttendanceService, useValue: { getByProject: () => of([row]) } },
          { provide: WorkerService, useValue: { getByProject: () => of([]) } },
          { provide: ProjectAlertsService, useValue: { refresh: () => {} } },
        ],
      });
      const fixture = TestBed.createComponent(AttendanceListComponent);
      fixture.componentRef.setInput('projectId', '9');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Ana');
      expect(fixture.nativeElement.textContent.includes('attendance.create')).toBe(supervisor);
      expect(fixture.nativeElement.textContent.includes('common.edit')).toBe(supervisor);
      expect(fixture.nativeElement.textContent.includes('common.delete')).toBe(supervisor);
    });
  }
});

describe('Audit correction 3: attendance opens on today with a visible, removable filter', () => {
  it('shows a specific empty state for today and reveals previous days on demand', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const old = new Attendance({
      id: 21, projectId: 9, workerId: 3, workerName: 'Luis', attendanceDate: yesterday,
      status: AttendanceStatus.Present, checkInAt: null, checkOutAt: null, notes: null,
      registeredByUserId: 1, createdAt: '', updatedAt: '',
    });
    TestBed.configureTestingModule({
      imports: [AttendanceListComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        importProvidersFrom(LucideAngularModule.pick(APP_ICONS)),
        { provide: SessionService, useValue: {
          isSupervisor: signal(true), isContractor: signal(false), user: signal({ id: 1 }),
        } },
        { provide: AttendanceService, useValue: { getByProject: () => of([old]) } },
        { provide: WorkerService, useValue: { getByProject: () => of([]) } },
        { provide: ProjectAlertsService, useValue: { refresh: () => {} } },
      ],
    });
    const fixture = TestBed.createComponent(AttendanceListComponent);
    fixture.componentRef.setInput('projectId', '9');
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[data-testid="attendance-today-chip"]')).not.toBeNull();
    expect(element.textContent).toContain('attendance.emptyToday');
    expect(element.textContent).not.toContain('common.noResultsTitle');
    expect(element.textContent).not.toContain('Luis');

    const previous = Array.from(element.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('attendance.showPreviousDays'),
    )!;
    previous.click();
    fixture.detectChanges();
    expect(element.querySelector('[data-testid="attendance-today-chip"]')).toBeNull();
    expect(element.textContent).toContain('Luis');
  });
});
