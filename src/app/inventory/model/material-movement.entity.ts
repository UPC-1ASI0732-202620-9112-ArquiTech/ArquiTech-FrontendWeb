export enum MovementType {
  Entry = 'ENTRY',
  Usage = 'USAGE',
}

export interface MaterialMovementResource {
  id: number;
  materialId: number;
  projectId: number;
  materialName: string;
  unit: string;
  type: string;
  quantity: number;
  supplier?: string;
  registeredByUserId: number;
  registeredByName?: string;
  occurredAt: string;
  note?: string;
}

/** Class `MaterialMovement` from the Class Dictionary (report 4.9.2). */
export class MaterialMovement {
  readonly id: number;
  readonly materialId: number;
  readonly projectId: number;
  readonly materialName: string;
  readonly unit: string;
  readonly type: MovementType;
  readonly quantity: number;
  readonly supplier: string;
  readonly registeredByUserId: number;
  readonly registeredByName: string;
  readonly occurredAt: string;
  readonly note: string;

  constructor(resource: MaterialMovementResource) {
    this.id = resource.id;
    this.materialId = resource.materialId;
    this.projectId = resource.projectId;
    this.materialName = resource.materialName;
    this.unit = resource.unit ?? '';
    this.type = resource.type === MovementType.Usage ? MovementType.Usage : MovementType.Entry;
    this.quantity = Number(resource.quantity ?? 0);
    this.supplier = resource.supplier ?? '';
    this.registeredByUserId = resource.registeredByUserId;
    this.registeredByName = resource.registeredByName ?? '';
    this.occurredAt = resource.occurredAt;
    this.note = resource.note ?? '';
  }

  isEntry(): boolean {
    return this.type === MovementType.Entry;
  }
}

/** Body of `POST /materials/{id}/entry` (HU01, TS01). */
export interface MaterialEntryRequest {
  quantity: number;
  supplier: string;
  occurredAt: string;
  note?: string;
}

/** Body of `POST /materials/{id}/use` (HU02, TS02). */
export interface MaterialUsageRequest {
  quantity: number;
  occurredAt: string;
  note?: string;
}
