import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { SessionService } from '../../services/session.service';

/** Shown when the role cannot open a route or a work (HU27 AC2). */
@Component({
  selector: 'app-unauthorized',
  imports: [RouterLink, TranslatePipe, LucideAngularModule],
  templateUrl: './unauthorized.component.html',
  styleUrl: './unauthorized.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnauthorizedComponent {
  protected readonly session = inject(SessionService);
}
