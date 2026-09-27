import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ProfileService } from './profile/services/profile.service';
import { ToastHostComponent } from './shared/presentation/components/toast-host/toast-host.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastHostComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  // Instantiated at start-up so stored profile data is applied to the session (HU16 AC2).
  private readonly profile = inject(ProfileService);
}
