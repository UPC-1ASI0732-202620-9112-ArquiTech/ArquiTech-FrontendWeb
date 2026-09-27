import { parseIso, startOfDay } from '../../shared/utils/date.utils';

export enum TaskStatus {
  Pending = 'PENDING',
  InProgress = 'IN_PROGRESS',
  Completed = 'COMPLETED',
}

export interface TaskResource {
  id: number;
  projectId: number;
  workerId: number;
  workerName?: string;
  title: string;
  description: string;
  status: string;
  dueDate: string;
  createdAt: string;
  completedAt?: string | null;
}

/** Class `Task` from the Class Dictionary (report 4.9.2). */
export class Task {
  readonly id: number;
  readonly projectId: number;
  readonly workerId: number;
  readonly workerName: string;
  readonly title: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly dueDate: string;
  readonly createdAt: string;
  readonly completedAt: string | null;

  constructor(resource: TaskResource) {
    this.id = resource.id;
    this.projectId = resource.projectId;
    this.workerId = resource.workerId;
    this.workerName = resource.workerName ?? '';
    this.title = resource.title;
    this.description = resource.description ?? '';
    this.status = (Object.values(TaskStatus) as string[]).includes(resource.status)
      ? (resource.status as TaskStatus)
      : TaskStatus.Pending;
    this.dueDate = resource.dueDate;
    this.createdAt = resource.createdAt;
    this.completedAt = resource.completedAt ?? null;
  }

  isCompleted(): boolean {
    return this.status === TaskStatus.Completed;
  }

  isOverdue(today: Date = new Date()): boolean {
    const due = parseIso(this.dueDate);
    return !this.isCompleted() && !!due && due.getTime() < startOfDay(today).getTime();
  }
}

export type SaveTaskRequest = Omit<TaskResource, 'id' | 'createdAt' | 'workerName'>;
