import { TestBed } from '@angular/core/testing';
import { PreferencesService } from '../../../profile/services/preferences.service';
import { AppDatePipe, PluralKeyPipe } from './format.pipes';

describe('Audit corrections: shared format pipes', () => {
  it('PluralKeyPipe picks the singular key only for exactly one item (finding 23)', () => {
    const pipe = new PluralKeyPipe();
    expect(pipe.transform('reports.lowStock', 1)).toBe('reports.lowStockOne');
    expect(pipe.transform('reports.lowStock', 0)).toBe('reports.lowStockOther');
    expect(pipe.transform('reports.lowStock', 3)).toBe('reports.lowStockOther');
    expect(pipe.transform('reports.lowStock', null)).toBe('reports.lowStockOther');
  });

  it('AppDatePipe formats Date objects like ISO strings (finding 9)', () => {
    TestBed.configureTestingModule({
      providers: [AppDatePipe, { provide: PreferencesService, useValue: { locale: 'es-PE' } }],
    });
    const pipe = TestBed.inject(AppDatePipe);
    const fromIso = pipe.transform('2026-11-10');
    expect(fromIso).toContain('2026');
    expect(pipe.transform(new Date(2026, 10, 10))).toBe(fromIso);
    expect(pipe.transform(new Date('invalid'))).toBe('—');
  });
});
