import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { environment } from '../../../../environments/environment';
import { AuthenticationService } from '../../../iam/services/authentication.service';
import { MockDatabase } from '../../../shared/infrastructure/mock-backend/mock-database';
import { FieldErrorComponent } from '../../../shared/presentation/components/field-error/field-error.component';
import { AppDatePipe } from '../../../shared/presentation/pipes/format.pipes';
import { ToastService } from '../../../shared/services/toast.service';
import { notBlankValidator } from '../../../shared/utils/form-validators';
import { AppLanguage, TextSize } from '../../model/preferences.model';
import { PreferencesService } from '../../services/preferences.service';
import { ProfileService } from '../../services/profile.service';

/** Profile (HU16), accessibility (HU19), language (HU46) and sign-out (HU44). */
@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, TranslatePipe, LucideAngularModule, FieldErrorComponent, AppDatePipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly authentication = inject(AuthenticationService);
  private readonly toast = inject(ToastService);
  private readonly mockDatabase = inject(MockDatabase);
  protected readonly preferences = inject(PreferencesService);
  protected readonly user = this.profileService.user;

  protected readonly textSizes: TextSize[] = ['normal', 'large', 'x-large'];
  protected readonly languages: AppLanguage[] = ['es', 'en'];
  protected readonly isMockApi = environment.useMockApi;
  protected readonly saving = signal(false);

  protected readonly form = this.formBuilder.group({
    fullName: [this.user()?.fullName ?? '', [Validators.required, notBlankValidator(), Validators.maxLength(80)]],
    phone: [this.user()?.phone ?? '', [Validators.pattern(/^[+\d][\d\s-]{6,19}$/)]],
    company: [this.profileService.company(), [Validators.maxLength(80)]],
  });

  protected saveProfile(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.profileService.updateProfile(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.markAsPristine();
        this.toast.success('profile.messages.saved');
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('errors.unexpected');
      },
    });
  }

  protected setTextSize(size: TextSize): void {
    this.preferences.updateAccessibility({ textSize: size });
  }

  protected toggle(preference: 'highContrast' | 'reduceMotion', event: Event): void {
    this.preferences.updateAccessibility({ [preference]: (event.target as HTMLInputElement).checked });
  }

  protected resetAccessibility(): void {
    this.preferences.resetAccessibility();
    this.toast.info('profile.messages.accessibilityReset');
  }

  protected resetDemoData(): void {
    this.mockDatabase.reset();
    this.toast.success('profile.messages.demoReset');
  }

  protected signOut(): void {
    this.authentication.signOut();
  }
}
