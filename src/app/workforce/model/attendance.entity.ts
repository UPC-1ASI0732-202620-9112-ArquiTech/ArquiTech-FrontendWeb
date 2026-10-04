export enum AttendanceStatus {
  Present = 'PRESENT',
  Absent = 'ABSENT',
  Late = 'LATE',
  Excused = 'EXCUSED',
}
export interface AttendanceResource {
  id: number;
  projectId: number;
  workerId: number;
  workerName: string;
  attendanceDate: string;
  status: AttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  notes: string | null;
  registeredByUserId: number;
  createdAt: string;
  updatedAt: string;
}
export class Attendance {
  readonly id: number;
  readonly projectId: number;
  readonly workerId: number;
  readonly workerName: string;
  readonly attendanceDate: string;
  readonly status: AttendanceStatus;
  readonly checkInAt: string | null;
  readonly checkOutAt: string | null;
  readonly notes: string;
  readonly registeredByUserId: number;
  constructor(resource: AttendanceResource) {
    this.id = resource.id;
    this.projectId = resource.projectId;
    this.workerId = resource.workerId;
    this.workerName = resource.workerName;
    this.attendanceDate = resource.attendanceDate;
    if (!Object.values(AttendanceStatus).includes(resource.status)) throw new Error('Unknown attendance status');
    this.status = resource.status;
    this.checkInAt = resource.checkInAt;
    this.checkOutAt = resource.checkOutAt;
    this.notes = resource.notes ?? '';
    this.registeredByUserId = resource.registeredByUserId;
  }
}
