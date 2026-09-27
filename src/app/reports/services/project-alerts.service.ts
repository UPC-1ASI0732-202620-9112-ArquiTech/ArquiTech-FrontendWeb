import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Subscription, forkJoin } from 'rxjs';
import { IncidentSeverity } from '../../incidents/model/incident.entity';
import { IncidentService } from '../../incidents/services/incident.service';
import { MaterialService } from '../../inventory/services/material.service';
import { ProjectContextService } from '../../projects/services/project-context.service';

export interface ProjectAlert {
  id: string;
  kind: 'lowStock' | 'criticalIncident';
  messageKey: string;
  params: Record<string, unknown>;
  typeKey?: string;
  link: (string | number)[];
}

/**
 * Alerts shown by the top-bar bell: materials below their minimum stock and
 * high-severity incidents that are still open in the current work.
 */
@Injectable({ providedIn: 'root' })
export class ProjectAlertsService {
  private readonly materials = inject(MaterialService);
  private readonly incidents = inject(IncidentService);
  private readonly context = inject(ProjectContextService);
  private subscription?: Subscription;

  readonly alerts = signal<ProjectAlert[]>([]);

  constructor() {
    effect(() => {
      const project = this.context.current();
      untracked(() => (project ? this.refresh() : this.alerts.set([])));
    });
  }

  refresh(): void {
    const project = this.context.current();
    if (!project) {
      return;
    }
    this.subscription?.unsubscribe();
    this.subscription = forkJoin([
      this.materials.getByProject(project.id),
      this.incidents.getByProject(project.id),
    ]).subscribe({
      next: ([materials, incidents]) => {
        const lowStock: ProjectAlert[] = materials
          .filter((material) => material.isBelowMinimum())
          .map((material) => ({
            id: `material-${material.id}`,
            kind: 'lowStock',
            messageKey: 'alerts.lowStock',
            params: { name: material.name, stock: material.stock, minimum: material.minimumStock, unit: material.unit },
            link: ['/projects', project.id, 'materials'],
          }));
        const critical: ProjectAlert[] = incidents
          .filter((incident) => incident.severity === IncidentSeverity.High && !incident.isResolved())
          .map((incident) => ({
            id: `incident-${incident.id}`,
            kind: 'criticalIncident',
            messageKey: 'alerts.criticalIncident',
            params: { type: incident.type },
            typeKey: incident.typeKey ?? undefined,
            link: ['/projects', project.id, 'incidents'],
          }));
        this.alerts.set([...critical, ...lowStock]);
      },
      error: () => this.alerts.set([]),
    });
  }
}
