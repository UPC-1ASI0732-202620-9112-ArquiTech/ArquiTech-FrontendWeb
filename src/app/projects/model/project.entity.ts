export enum ProjectStatus {
  Active = 'ACTIVE',
  Pending = 'PENDING',
  Completed = 'COMPLETED',
  Suspended = 'SUSPENDED',
}

export interface ProjectResource {
  id: number;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  budget: number;
  status: string;
  progress: number;
  supervisorId: number;
  contractorId: number;
  contractorName?: string;
  supervisorName?: string;
  createdAt?: string;
}

/** Class `Project` from the Class Dictionary (report 4.9.2). */
export class Project {
  readonly id: number;
  readonly name: string;
  readonly location: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly budget: number;
  readonly status: ProjectStatus;
  readonly progress: number;
  readonly supervisorId: number;
  readonly contractorId: number;
  readonly contractorName: string;
  readonly supervisorName: string;
  readonly createdAt: string | null;

  constructor(resource: ProjectResource) {
    this.id = resource.id;
    this.name = resource.name;
    this.location = resource.location ?? '';
    this.startDate = resource.startDate;
    this.endDate = resource.endDate;
    this.budget = Number(resource.budget ?? 0);
    this.status = (Object.values(ProjectStatus) as string[]).includes(resource.status)
      ? (resource.status as ProjectStatus)
      : ProjectStatus.Pending;
    this.progress = Math.min(100, Math.max(0, Number(resource.progress ?? 0)));
    this.supervisorId = resource.supervisorId;
    this.contractorId = resource.contractorId;
    this.contractorName = resource.contractorName ?? '';
    this.supervisorName = resource.supervisorName ?? '';
    this.createdAt = resource.createdAt ?? null;
  }

  isActive(): boolean {
    return this.status === ProjectStatus.Active;
  }
}

export type CreateProjectRequest = Omit<ProjectResource, 'id' | 'createdAt' | 'contractorName' | 'supervisorName'>;
