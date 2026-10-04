import { AttendanceStatus } from './attendance.entity';
export interface AttendanceRequest {
  workerId: number;
  attendanceDate: string;
  status: AttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  notes: string;
}
export type CreateAttendanceRequest = AttendanceRequest & { projectId: number };
export function validAttendanceTimes(
  status: AttendanceStatus,
  checkIn: string | null,
  checkOut: string | null,
): boolean {
  if ((status === AttendanceStatus.Absent || status === AttendanceStatus.Excused) && (checkIn || checkOut))
    return false;
  if (checkIn && Number.isNaN(Date.parse(checkIn))) return false;
  if (checkOut && Number.isNaN(Date.parse(checkOut))) return false;
  return !checkOut || (!!checkIn && Date.parse(checkOut) >= Date.parse(checkIn));
}
export function attendanceRequest(value: {
  workerId: string;
  attendanceDate: string;
  status: string;
  checkInAt: string;
  checkOutAt: string;
  notes: string;
}): AttendanceRequest {
  return {
    workerId: Number(value.workerId),
    attendanceDate: value.attendanceDate,
    status: value.status as AttendanceStatus,
    checkInAt: value.checkInAt ? new Date(value.checkInAt).toISOString() : null,
    checkOutAt: value.checkOutAt ? new Date(value.checkOutAt).toISOString() : null,
    notes: value.notes.trim(),
  };
}
