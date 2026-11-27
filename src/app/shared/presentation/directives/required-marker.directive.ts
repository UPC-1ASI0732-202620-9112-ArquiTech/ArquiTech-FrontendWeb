import { Directive, DoCheck, ElementRef, Renderer2, inject } from '@angular/core';
import { NgControl, Validators } from '@angular/forms';

/**
 * Marks reactive-form controls that use `Validators.required` with `aria-required`, so the
 * label shows an asterisk before the user tries to save (audit finding 17). It also follows
 * validators added at runtime, such as the supplier of a material entry.
 */
@Directive({ selector: '[formControlName]', standalone: true })
export class RequiredMarkerDirective implements DoCheck {
  private readonly control = inject(NgControl, { self: true, optional: true });
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private required: boolean | null = null;

  ngDoCheck(): void {
    const required = !!this.control?.control?.hasValidator(Validators.required);
    if (required === this.required) {
      return;
    }
    this.required = required;
    if (required) {
      this.renderer.setAttribute(this.element.nativeElement, 'aria-required', 'true');
    } else {
      this.renderer.removeAttribute(this.element.nativeElement, 'aria-required');
    }
  }
}
