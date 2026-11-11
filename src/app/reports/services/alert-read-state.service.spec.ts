import { TestBed } from '@angular/core/testing';
import { AlertReadStateService } from './alert-read-state.service';

describe('AlertReadStateService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [AlertReadStateService] });
  });

  it('persists read alerts independently by user and project', () => {
    const service = TestBed.inject(AlertReadStateService);

    service.markAsRead(1, 10, 'material-1');
    service.markAsRead(2, 10, 'material-1');
    service.markAsRead(1, 11, 'material-1');

    expect([...service.getReadAlertIds(1, 10)]).toEqual(['material-1']);
    expect([...service.getReadAlertIds(2, 10)]).toEqual(['material-1']);
    expect([...service.getReadAlertIds(1, 11)]).toEqual(['material-1']);
    expect([...service.getReadAlertIds(1, 12)]).toEqual([]);
  });

  it('restores valid data and ignores malformed storage', () => {
    localStorage.setItem(
      'arquitech.alert-read-state.v1',
      JSON.stringify({ '1:10': ['incident-2'], invalid: ['ok', 4], ignored: 'not-an-array' }),
    );

    const service = TestBed.inject(AlertReadStateService);

    expect([...service.getReadAlertIds(1, 10)]).toEqual(['incident-2']);
    expect([...service.getReadAlertIds(1, 11)]).toEqual([]);
  });

  it('marks all current alerts as read and prunes obsolete ids', () => {
    const service = TestBed.inject(AlertReadStateService);

    service.markAllAsRead(1, 10, ['material-1', 'incident-2']);
    service.prune(1, 10, ['incident-2']);

    expect([...service.getReadAlertIds(1, 10)]).toEqual(['incident-2']);
  });
});
