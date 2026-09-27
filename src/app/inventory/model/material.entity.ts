export interface MaterialResource {
  id: number;
  projectId: number;
  name: string;
  unit: string;
  /** Total quantity received since the material was registered. */
  quantity: number;
  /** Quantity currently available on site. */
  stock: number;
  minimumStock: number;
  unitPrice: number;
  provider: string;
  providerRuc: string;
  /** Date of the last stock update. */
  date: string;
}

/** Class `Material` from the Class Dictionary (report 4.9.2). */
export class Material {
  readonly id: number;
  readonly projectId: number;
  readonly name: string;
  readonly unit: string;
  readonly quantity: number;
  readonly stock: number;
  readonly minimumStock: number;
  readonly unitPrice: number;
  readonly provider: string;
  readonly providerRuc: string;
  readonly date: string;

  constructor(resource: MaterialResource) {
    this.id = resource.id;
    this.projectId = resource.projectId;
    this.name = resource.name;
    this.unit = resource.unit;
    this.quantity = Number(resource.quantity ?? 0);
    this.stock = Number(resource.stock ?? 0);
    this.minimumStock = Number(resource.minimumStock ?? 0);
    this.unitPrice = Number(resource.unitPrice ?? 0);
    this.provider = resource.provider ?? '';
    this.providerRuc = resource.providerRuc ?? '';
    this.date = resource.date;
  }

  hasAvailableStock(quantity: number): boolean {
    return quantity > 0 && quantity <= this.stock;
  }

  isBelowMinimum(): boolean {
    return this.minimumStock > 0 && this.stock < this.minimumStock;
  }
}

export type CreateMaterialRequest = Omit<MaterialResource, 'id' | 'stock'>;
export type UpdateMaterialRequest = Pick<
  MaterialResource,
  'name' | 'unit' | 'minimumStock' | 'unitPrice' | 'provider' | 'providerRuc'
>;
