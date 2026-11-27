import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { importProvidersFrom } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../../../shared/presentation/icons';
import { MaterialService } from '../../services/material.service';
import { MATERIAL_UNITS, MaterialFormDialogComponent } from './material-form-dialog.component';

describe('Audit corrections 17, 18 and 19: material form', () => {
  function render(material?: { unit: string }) {
    TestBed.configureTestingModule({
      imports: [MaterialFormDialogComponent, TranslateModule.forRoot()],
      providers: [
        importProvidersFrom(LucideAngularModule.pick(APP_ICONS)),
        { provide: DIALOG_DATA, useValue: { projectId: 1, material } },
        { provide: DialogRef, useValue: { close: () => {} } },
        { provide: MaterialService, useValue: {} },
      ],
    });
    const fixture = TestBed.createComponent(MaterialFormDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('offers the usual site units plus "Otra" instead of free text', () => {
    const fixture = render();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('#material-unit');
    expect(select.tagName).toBe('SELECT');
    const values = Array.from(select.options).map((option) => option.value);
    for (const unit of ['kg', 't', 'm', 'm²', 'm³', 'unidad', 'bolsa', 'varilla', 'litro', 'galón']) {
      expect(values).toContain(unit);
    }
    expect(fixture.nativeElement.querySelector('#material-unit-other')).toBeNull();

    select.value = 'kg';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect((fixture.componentInstance as any).form.controls.unit.value).toBe('kg');

    select.value = '__other__';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const other: HTMLInputElement = fixture.nativeElement.querySelector('#material-unit-other');
    expect(other).not.toBeNull();
    expect((fixture.componentInstance as any).form.controls.unit.value).toBe('');
  });

  it('keeps a custom unit of an existing material under "Otra"', () => {
    expect(MATERIAL_UNITS).not.toContain('saco 42.5 kg');
    const fixture = render({ unit: 'saco 42.5 kg' } as never);
    const other: HTMLInputElement = fixture.nativeElement.querySelector('#material-unit-other');
    expect(other.value).toBe('saco 42.5 kg');
  });

  it('marks required fields and uses a format hint instead of a real RUC', () => {
    const fixture = render();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.form-legend')?.textContent).toContain('common.requiredLegend');
    expect(element.querySelector('#material-name')?.getAttribute('aria-required')).toBe('true');
    const ruc = element.querySelector('#material-ruc') as HTMLInputElement;
    expect(ruc.placeholder).toBe('materials.fields.rucPlaceholder');
    expect(ruc.placeholder).not.toMatch(/\d{11}/);
  });
});
