export enum WorkerStatus {
  Active = 'ACTIVE',
  OnLeave = 'ON_LEAVE',
  Inactive = 'INACTIVE',
}

export interface WorkerResource {
  id: number;
  projectId: number;
  fullName: string;
  role: string;
  specialty: string;
  hireDate: string;
  status: string;
}

/** Class `Worker` from the Class Dictionary (report 4.9.2). */
export class Worker {
  readonly id: number;
  readonly projectId: number;
  readonly fullName: string;
  readonly role: string;
  readonly specialty: string;
  readonly hireDate: string;
  readonly status: WorkerStatus;

  constructor(resource: WorkerResource) {
    this.id = resource.id;
    this.projectId = resource.projectId;
    this.fullName = resource.fullName;
    this.role = resource.role;
    this.specialty = resource.specialty ?? '';
    this.hireDate = resource.hireDate;
    this.status = (Object.values(WorkerStatus) as string[]).includes(resource.status)
      ? (resource.status as WorkerStatus)
      : WorkerStatus.Active;
  }

  isActive(): boolean {
    return this.status !== WorkerStatus.Inactive;
  }
}

export type SaveWorkerRequest = Omit<WorkerResource, 'id'>;
