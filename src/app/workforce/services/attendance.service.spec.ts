import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AttendanceService } from './attendance.service';
import { AttendanceStatus } from '../model/attendance.entity';
import { ProjectService } from '../../projects/services/project.service';
import { SessionService } from '../../iam/services/session.service';
import { environment } from '../../../environments/environment';
import { attendanceFixture } from '../model/attendance.entity.spec';
describe('New backend HTTP contracts', () => {
  let service: AttendanceService, http: HttpTestingController;
  const api = environment.apiBaseUrl;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SessionService, useValue: { user: () => null } },
      ],
    });
    service = TestBed.inject(AttendanceService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('lists attendance with required project and optional LocalDate', () => {
    service.getByProject(9, '2026-10-03').subscribe((rows) => expect(rows[0].workerName).toBe('Ana'));
    const request = http.expectOne((req) => req.url === api + '/attendance');
    expect(request.request.params.get('projectId')).toBe('9');
    expect(request.request.params.get('date')).toBe('2026-10-03');
    request.flush([attendanceFixture]);
  });
  it('creates and updates using exact request fields', () => {
    const payload = {
      workerId: 3,
      attendanceDate: '2026-10-03',
      status: AttendanceStatus.Present,
      checkInAt: null,
      checkOutAt: null,
      notes: '',
    };
    service.create({ ...payload, projectId: 9 }).subscribe();
    const create = http.expectOne(api + '/attendance');
    expect(create.request.method).toBe('POST');
    expect(create.request.body.projectId).toBe(9);
    create.flush(attendanceFixture);
    service.update(20, payload).subscribe();
    const update = http.expectOne(api + '/attendance/20');
    expect(update.request.method).toBe('PUT');
    expect(update.request.body.projectId).toBeUndefined();
    expect(update.request.body.registeredByUserId).toBeUndefined();
    update.flush(attendanceFixture);
  });
  it('deletes projects and attendance with 204', () => {
    service.delete(20).subscribe();
    const attendance = http.expectOne(api + '/attendance/20');
    expect(attendance.request.method).toBe('DELETE');
    attendance.flush(null, { status: 204, statusText: 'No Content' });
    TestBed.inject(ProjectService).delete(9).subscribe();
    const project = http.expectOne(api + '/projects/9');
    expect(project.request.method).toBe('DELETE');
    project.flush(null, { status: 204, statusText: 'No Content' });
  });
});
