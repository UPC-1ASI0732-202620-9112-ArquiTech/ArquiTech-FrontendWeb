import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Subscription, forkJoin } from 'rxjs';
import { IncidentSeverity } from '../../incidents/model/incident.entity';
import { IncidentService } from '../../incidents/services/incident.service';
import { SessionService } from '../../iam/services/session.service';
import { MaterialService } from '../../inventory/services/material.service';
import { ProjectContextService } from '../../projects/services/project-context.service';
import { AlertReadStateService } from './alert-read-state.service';

export interface ProjectAlert {
  id: string;
  kind: 'lowStock' | 'criticalIncident';
  messageKey: string;
  params: Record<string, unknown>;
  typeKey?: string;
  link: (string | number)[];
  read: boolean;
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
  private readonly session = inject(SessionService);
  private readonly readState = inject(AlertReadStateService);
  private subscription?: Subscription;

  readonly alerts = signal<ProjectAlert[]>([]);
  readonly unreadAlerts = computed(() => this.alerts().filter((alert) => !alert.read));
  readonly unreadCount = computed(() => this.unreadAlerts().length);
  readonly hasUnread = computed(() => this.unreadCount() > 0);

  constructor() {
    effect(() => {
      const project = this.context.current();
      const user = this.session.user();
      untracked(() => (project && user ? this.refresh() : this.alerts.set([])));
    });
  }

  refresh(): void {
    const project = this.context.current();
    if (!project) {
      this.alerts.set([]);
      return;
    }
    const user = this.session.user();
    if (!user) {
      this.alerts.set([]);
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
            read: false,
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
            read: false,
          }));
        const currentAlerts = [...critical, ...lowStock];
        const readIds = this.readState.getReadAlertIds(user.id, project.id);
        this.readState.prune(
          user.id,
          project.id,
          currentAlerts.map((alert) => alert.id),
        );
        this.alerts.set(currentAlerts.map((alert) => ({ ...alert, read: readIds.has(alert.id) })));
      },
      error: () => this.alerts.set([]),
    });
  }

  markAsRead(alertId: string): void {
    const project = this.context.current();
    const user = this.session.user();
    if (!project || !user) {
      return;
    }
    const alert = this.alerts().find((item) => item.id === alertId);
    if (!alert || alert.read) {
      return;
    }
    this.readState.markAsRead(user.id, project.id, alertId);
    this.alerts.update((alerts) =>
      alerts.map((item) => (item.id === alertId ? { ...item, read: true } : item)),
    );
  }

  markAllAsRead(): void {
    const project = this.context.current();
    const user = this.session.user();
    const currentAlerts = this.alerts();
    if (!project || !user || currentAlerts.length === 0) {
      return;
    }
    this.readState.markAllAsRead(
      user.id,
      project.id,
      currentAlerts.map((alert) => alert.id),
    );
    this.alerts.update((alerts) => alerts.map((alert) => ({ ...alert, read: true })));
  }
}
