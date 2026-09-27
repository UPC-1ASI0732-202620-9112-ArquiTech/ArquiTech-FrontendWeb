export enum IncidentSeverity {
  High = 'HIGH',
  Medium = 'MEDIUM',
  Low = 'LOW',
}

export enum IncidentStatus {
  Open = 'OPEN',
  InReview = 'IN_REVIEW',
  Resolved = 'RESOLVED',
}

/** Incident categories used by supervisors in the interviews (report 2.2). */
export const INCIDENT_TYPES = [
  'MATERIAL_SHORTAGE',
  'DELIVERY_DELAY',
  'EQUIPMENT_FAILURE',
  'WORK_ACCIDENT',
  'UNSAFE_CONDITION',
  'OTHER',
] as const;

export interface IncidentResource {
  id: number;
  projectId: number;
  reportedByUserId: number;
  type: string;
  description: string;
  severity: string;
  status: string;
  reportedAt: string;
  resolvedAt?: string | null;
}

/** Class `Incident` from the Class Dictionary (report 4.9.2). */
export class Incident {
  readonly id: number;
  readonly projectId: number;
  readonly reportedByUserId: number;
  readonly type: string;
  readonly description: string;
  readonly severity: IncidentSeverity;
  readonly status: IncidentStatus;
  readonly reportedAt: string;
  readonly resolvedAt: string | null;

  constructor(resource: IncidentResource) {
    this.id = resource.id;
    this.projectId = resource.projectId;
    this.reportedByUserId = resource.reportedByUserId;
    this.type = resource.type;
    this.description = resource.description ?? '';
    this.severity = (Object.values(IncidentSeverity) as string[]).includes(resource.severity)
      ? (resource.severity as IncidentSeverity)
      : IncidentSeverity.Medium;
    this.status = (Object.values(IncidentStatus) as string[]).includes(resource.status)
      ? (resource.status as IncidentStatus)
      : IncidentStatus.Open;
    this.reportedAt = resource.reportedAt;
    this.resolvedAt = resource.resolvedAt ?? null;
  }

  isResolved(): boolean {
    return this.status === IncidentStatus.Resolved;
  }

  /** Known categories are translated; free-text categories from the API are shown as-is. */
  get typeKey(): string | null {
    return (INCIDENT_TYPES as readonly string[]).includes(this.type) ? `incidents.types.${this.type}` : null;
  }
}

export type SaveIncidentRequest = Omit<IncidentResource, 'id'>;
