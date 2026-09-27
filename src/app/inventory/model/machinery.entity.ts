export enum MachineryStatus {
  Operational = 'OPERATIONAL',
  Maintenance = 'MAINTENANCE',
  OutOfService = 'OUT_OF_SERVICE',
}

export interface MachineryResource {
  id: number;
  projectId: number;
  name: string;
  serialNumber: string;
  status: string;
  registeredAt: string;
  description: string;
}

/** Class `Machinery` from the Class Dictionary (report 4.9.2). */
export class Machinery {
  readonly id: number;
  readonly projectId: number;
  readonly name: string;
  readonly serialNumber: string;
  readonly status: MachineryStatus;
  readonly registeredAt: string;
  readonly description: string;

  constructor(resource: MachineryResource) {
    this.id = resource.id;
    this.projectId = resource.projectId;
    this.name = resource.name;
    this.serialNumber = resource.serialNumber;
    this.status = (Object.values(MachineryStatus) as string[]).includes(resource.status)
      ? (resource.status as MachineryStatus)
      : MachineryStatus.Operational;
    this.registeredAt = resource.registeredAt;
    this.description = resource.description ?? '';
  }

  isOperational(): boolean {
    return this.status === MachineryStatus.Operational;
  }
}

export type SaveMachineryRequest = Omit<MachineryResource, 'id'>;
