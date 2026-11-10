import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ExperimentWorkbenchComponent } from './experiment-workbench.component';

/**
 * Allows the control A and treatment B to be reviewed inside the original module.
 * The module's existing inventory, forms, filters and navigation remain in place.
 */
@Component({
  selector: 'app-experiment-module-panel',
  standalone: true,
  imports: [ExperimentWorkbenchComponent],
  templateUrl: './experiment-module-panel.component.html',
  styleUrl: './experiment-module-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExperimentModulePanelComponent {
  readonly projectId = input.required<string>();
  readonly experiments = input.required<readonly string[]>();
  readonly changed = output<void>();

  // The improvement is presented by default; A can be selected without leaving the module.
  protected readonly selection = signal<string | null | undefined>(undefined);
  protected readonly activeId = computed(() => {
    const chosen = this.selection();
    return chosen === undefined ? (this.experiments()[0] ?? null) : chosen;
  });
  protected readonly titles: Record<string, string> = {
    EC01: 'Registro guiado de materiales',
    EC02: 'Asistencia rápida por jornada',
    EC03: 'Tareas prioritarias',
    EC04: 'Panel de seguimiento de obra',
    EC05: 'Historial verificable',
    EC06: 'Revisión del reporte semanal',
    EC07: 'Alertas de incidencias críticas',
    EC09: 'Primeros pasos por rol',
  };

  protected select(id: string | null): void {
    this.selection.set(id);
  }
}
