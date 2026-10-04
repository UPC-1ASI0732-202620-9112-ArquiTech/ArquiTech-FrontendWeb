import { Attendance, AttendanceResource, AttendanceStatus } from './attendance.entity';
import { attendanceRequest, validAttendanceTimes } from './attendance-request';
export const attendanceFixture: AttendanceResource = {
  id: 20,
  projectId: 9,
  workerId: 3,
  workerName: 'Ana',
  attendanceDate: '2026-10-03',
  status: AttendanceStatus.Present,
  checkInAt: null,
  checkOutAt: null,
  notes: null,
  registeredByUserId: 1,
  createdAt: '2026-10-03T13:00:00Z',
  updatedAt: '2026-10-03T13:00:00Z',
};
describe('Attendance contract', () => {
  it('parses all states and optional fields', () => {
    for (const status of Object.values(AttendanceStatus)) {
      const item = new Attendance({ ...attendanceFixture, status });
      expect(item.status).toBe(status);
      expect(item.notes).toBe('');
      expect(item.checkInAt).toBeNull();
    }
  });
  it('rejects unsupported states', () => {
    expect(() => new Attendance({ ...attendanceFixture, status: 'ACTIVE' as AttendanceStatus })).toThrow();
  });
  it('serializes times in UTC and excludes server-managed fields', () => {
    const request = attendanceRequest({
      workerId: '3',
      attendanceDate: '2026-10-03',
      status: 'PRESENT',
      checkInAt: '2026-10-03T08:00:00-05:00',
      checkOutAt: '',
      notes: ' Site ',
    });
    expect(request.checkInAt).toBe('2026-10-03T13:00:00.000Z');
    expect(request.notes).toBe('Site');
    expect(Object.keys(request).sort()).toEqual(
      ['workerId', 'attendanceDate', 'status', 'checkInAt', 'checkOutAt', 'notes'].sort(),
    );
  });
  it('validates absent records, reversed times and overnight shifts', () => {
    expect(validAttendanceTimes(AttendanceStatus.Present, '2026-10-03T22:00:00Z', '2026-10-04T06:00:00Z')).toBeTrue();
    expect(validAttendanceTimes(AttendanceStatus.Present, null, '2026-10-04T06:00:00Z')).toBeFalse();
    expect(validAttendanceTimes(AttendanceStatus.Present, '2026-10-04T06:00:00Z', '2026-10-03T22:00:00Z')).toBeFalse();
    expect(validAttendanceTimes(AttendanceStatus.Absent, '2026-10-03T22:00:00Z', null)).toBeFalse();
    expect(validAttendanceTimes(AttendanceStatus.Excused, null, null)).toBeTrue();
    expect(validAttendanceTimes(AttendanceStatus.Late, 'invalid', null)).toBeFalse();
  });
});
