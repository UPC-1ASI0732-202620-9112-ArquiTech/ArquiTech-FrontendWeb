import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { DeleteProjectDialogComponent } from './delete-project-dialog.component';
import { ProjectService } from '../services/project.service';
import { ProjectContextService } from '../services/project-context.service';
describe('Project deletion confirmation', () => {
  let projects: jasmine.SpyObj<ProjectService>,
    dialog: { close: jasmine.Spy; disableClose: boolean },
    context: { forget: jasmine.Spy };
  beforeEach(() => {
    projects = jasmine.createSpyObj('ProjectService', ['delete']);
    projects.delete.and.returnValue(of(undefined));
    dialog = { close: jasmine.createSpy('close'), disableClose: false };
    context = { forget: jasmine.createSpy('forget') };
    TestBed.configureTestingModule({
      imports: [DeleteProjectDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DIALOG_DATA, useValue: { id: 9, name: 'Obra Lima' } },
        { provide: DialogRef, useValue: dialog },
        { provide: ProjectService, useValue: projects },
        { provide: ProjectContextService, useValue: context },
      ],
    });
  });
  it('requires exact name, calls DELETE and forgets the selected project only after success', () => {
    const fixture = TestBed.createComponent(DeleteProjectDialogComponent);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.btn--danger');
    expect(button.disabled).toBeTrue();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = 'Obra Lima';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(button.disabled).toBeFalse();
    button.click();
    fixture.detectChanges();
    expect(projects.delete).toHaveBeenCalledWith(9);
    expect(context.forget).toHaveBeenCalledWith(9);
    expect(dialog.close).toHaveBeenCalledWith(true);
  });
  it('keeps the project and displays 403 when server rejects deletion', () => {
    projects.delete.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 403, error: { code: 'FORBIDDEN' } })),
    );
    const fixture = TestBed.createComponent(DeleteProjectDialogComponent);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = 'Obra Lima';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.btn--danger').click();
    fixture.detectChanges();
    expect(context.forget).not.toHaveBeenCalled();
    expect(dialog.close).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('errors.codes.FORBIDDEN');
  });
});
