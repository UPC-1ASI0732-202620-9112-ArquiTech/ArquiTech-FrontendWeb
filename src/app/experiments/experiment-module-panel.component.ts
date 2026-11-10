import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ExperimentModeService } from './experiment-mode.service';
import { ExperimentWorkbenchComponent } from './experiment-workbench.component';

/**
 * Allows the control A and treatment B to be reviewed inside the original module.
 * The module's existing inventory, forms, filters and navigation remain in place.
 */
@Component({
  selector: 'app-experiment-module-panel',
  standalone: true,
  imports: [ExperimentWorkbenchComponent, TranslatePipe],
  templateUrl: './experiment-module-panel.component.html',
  styleUrl: './experiment-module-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExperimentModulePanelComponent {
  readonly projectId = input.required<string>();
  readonly experiments = input.required<readonly string[]>();
  readonly changed = output<void>();

  protected readonly mode = inject(ExperimentModeService);
}
