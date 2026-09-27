import { FormControl, FormGroup } from '@angular/forms';
import { toIsoDate } from './date.utils';
import { dateRangeValidator, maxStockValidator, notFutureDateValidator, rucValidator } from './form-validators';

describe('form validators', () => {
  it('validates Peruvian RUC numbers', () => {
    const validator = rucValidator();
    expect(validator(new FormControl('20100124567'))).toBeNull();
    expect(validator(new FormControl('10456789012'))).toBeNull();
    expect(validator(new FormControl('30100124567'))).toEqual({ ruc: true });
    expect(validator(new FormControl('2010012456'))).toEqual({ ruc: true });
    expect(validator(new FormControl(''))).toBeNull();
  });

  it('requires the end date to be on or after the start date', () => {
    const group = new FormGroup(
      { start: new FormControl('2026-10-01'), end: new FormControl('2026-09-30') },
      { validators: dateRangeValidator('start', 'end') },
    );
    expect(group.hasError('dateRange')).toBeTrue();
    group.controls.end.setValue('2026-10-01');
    expect(group.hasError('dateRange')).toBeFalse();
  });

  it('rejects quantities above the available stock (HU02 AC2)', () => {
    const validator = maxStockValidator(() => 45);
    expect(validator(new FormControl(45))).toBeNull();
    expect(validator(new FormControl(46))).toEqual({ insufficientStock: { available: 45 } });
  });

  it('rejects future dates', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(notFutureDateValidator()(new FormControl(toIsoDate(new Date())))).toBeNull();
    expect(notFutureDateValidator()(new FormControl(toIsoDate(tomorrow)))).toEqual({ futureDate: true });
  });
});
