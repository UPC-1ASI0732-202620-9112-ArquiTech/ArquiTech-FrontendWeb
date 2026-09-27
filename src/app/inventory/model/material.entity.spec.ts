import { Material } from './material.entity';

describe('Material', () => {
  const material = new Material({
    id: 1,
    projectId: 1,
    name: 'Cemento',
    unit: 'kg',
    quantity: 500,
    stock: 450,
    minimumStock: 100,
    unitPrice: 25.6,
    provider: 'Constructora Lima',
    providerRuc: '20100124567',
    date: '2026-09-24',
  });

  it('allows a usage only when the quantity is positive and within the stock (TS03)', () => {
    expect(material.hasAvailableStock(450)).toBeTrue();
    expect(material.hasAvailableStock(451)).toBeFalse();
    expect(material.hasAvailableStock(0)).toBeFalse();
  });

  it('detects stock below the minimum', () => {
    expect(material.isBelowMinimum()).toBeFalse();
    expect(new Material({ ...material, stock: 40, minimumStock: 120 }).isBelowMinimum()).toBeTrue();
    expect(new Material({ ...material, stock: 0, minimumStock: 0 }).isBelowMinimum()).toBeFalse();
  });
});
