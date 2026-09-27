import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { environment } from '../../../../environments/environment';
import { DEMO_ACCOUNTS } from '../../../shared/infrastructure/mock-backend/mock-seed';
import { FieldErrorComponent } from '../../../shared/presentation/components/field-error/field-error.component';
import { LanguageSwitchComponent } from '../../../shared/presentation/components/language-switch/language-switch.component';
import { apiErrorKey } from '../../../shared/utils/api-error';
import { AuthenticationService } from '../../services/authentication.service';

/** Sign-in screen from the Figma "Login" frame (HU23). */
@Component({
  selector: 'app-sign-in',
  imports: [ReactiveFormsModule, TranslatePipe, LucideAngularModule, FieldErrorComponent, LanguageSwitchComponent],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInComponent {
  private readonly authentication = inject(AuthenticationService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  /** Query params bound by the router. */
  readonly returnUrl = input<string>();
  readonly reason = input<string>();

  protected readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected readonly submitting = signal(false);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly showRecoveryHelp = signal(false);
  protected readonly demoAccounts = environment.useMockApi ? DEMO_ACCOUNTS : [];

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorKey.set(null);
    this.authentication.signIn(this.form.getRawValue()).subscribe({
      next: () => {
        const target = this.returnUrl();
        void this.router.navigateByUrl(target && target.startsWith('/') ? target : '/projects');
      },
      error: (error: unknown) => {
        // HU23 AC2: invalid credentials never establish a session.
        this.submitting.set(false);
        this.errorKey.set(
          apiErrorKey(error) === 'errors.unauthorized' ? 'errors.codes.INVALID_CREDENTIALS' : apiErrorKey(error),
        );
      },
    });
  }

  protected useDemoAccount(email: string, password: string): void {
    this.form.setValue({ email, password });
    this.errorKey.set(null);
  }
}
