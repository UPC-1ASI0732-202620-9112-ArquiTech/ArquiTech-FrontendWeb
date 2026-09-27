import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { merge } from 'rxjs';

/** Shows the first validation error of a control once the user interacted with it. */
@Component({
  selector: 'app-field-error',
  imports: [TranslatePipe],
  templateUrl: './field-error.component.html',
  styleUrl: './field-error.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldErrorComponent implements OnInit {
  readonly control = input.required<AbstractControl | null>();
  readonly id = input<string>('');
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    const control = this.control();
    if (control) {
      merge(control.statusChanges, control.events)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.changeDetector.markForCheck());
    }
  }

  protected message(): { key: string; params: Record<string, unknown> } | null {
    const control = this.control();
    if (!control || !control.errors || !(control.touched || control.dirty)) {
      return null;
    }
    const [name, detail] = Object.entries(control.errors)[0];
    const params: Record<string, unknown> =
      detail && typeof detail === 'object' ? (detail as Record<string, unknown>) : {};
    return { key: `validation.${name}`, params };
  }
}
