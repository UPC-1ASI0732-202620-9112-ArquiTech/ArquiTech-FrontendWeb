import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppLanguage } from '../../../../profile/model/preferences.model';
import { PreferencesService } from '../../../../profile/services/preferences.service';

/** ES / EN switch from the Figma sidebar footer (HU46). */
@Component({
  selector: 'app-language-switch',
  imports: [TranslatePipe],
  templateUrl: './language-switch.component.html',
  styleUrl: './language-switch.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitchComponent {
  readonly variant = input<'dark' | 'light'>('dark');
  protected readonly preferences = inject(PreferencesService);
  protected readonly languages: AppLanguage[] = ['es', 'en'];
}
