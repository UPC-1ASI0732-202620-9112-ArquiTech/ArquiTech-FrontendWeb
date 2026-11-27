import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RequiredMarkerDirective } from './required-marker.directive';

@Component({
  imports: [ReactiveFormsModule, RequiredMarkerDirective],
  template: `<form [formGroup]="form">
    <input id="name" formControlName="name" />
    <input id="note" formControlName="note" />
  </form>`,
})
class HostComponent {
  readonly form = new FormGroup({
    name: new FormControl('', Validators.required),
    note: new FormControl(''),
  });
}

describe('Audit correction 17: required fields are marked before saving', () => {
  it('sets aria-required only on required controls and follows runtime validators', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const name: HTMLInputElement = fixture.nativeElement.querySelector('#name');
    const note: HTMLInputElement = fixture.nativeElement.querySelector('#note');
    expect(name.getAttribute('aria-required')).toBe('true');
    expect(note.hasAttribute('aria-required')).toBeFalse();

    fixture.componentInstance.form.controls.note.addValidators(Validators.required);
    fixture.detectChanges();
    expect(note.getAttribute('aria-required')).toBe('true');

    fixture.componentInstance.form.controls.name.removeValidators(Validators.required);
    fixture.detectChanges();
    expect(name.hasAttribute('aria-required')).toBeFalse();
  });
});
