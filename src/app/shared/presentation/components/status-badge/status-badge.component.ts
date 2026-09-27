import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { BadgeTone } from '../../icons';

/** Coloured status pill so states can be scanned at a glance. */
@Component({
  selector: 'app-status-badge',
  imports: [TranslatePipe],
  templateUrl: './status-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  readonly tone = input<BadgeTone>('neutral');
  readonly labelKey = input.required<string>();
}
