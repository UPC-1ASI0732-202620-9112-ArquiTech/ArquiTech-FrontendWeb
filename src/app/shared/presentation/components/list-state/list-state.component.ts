import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';

export type LoadStatus = 'loading' | 'error' | 'ready';

/**
 * Loading, error and empty states of a list. An empty result is shown as an
 * informative message, never as an error (AC2 of every "Consultar" story).
 */
@Component({
  selector: 'app-list-state',
  imports: [TranslatePipe, LucideAngularModule],
  templateUrl: './list-state.component.html',
  styleUrl: './list-state.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListStateComponent {
  readonly status = input.required<LoadStatus>();
  readonly isEmpty = input(false);
  readonly isFiltering = input(false);
  readonly icon = input('folder');
  readonly emptyTitleKey = input.required<string>();
  readonly emptyMessageKey = input<string>('');
  readonly retry = output<void>();
}
