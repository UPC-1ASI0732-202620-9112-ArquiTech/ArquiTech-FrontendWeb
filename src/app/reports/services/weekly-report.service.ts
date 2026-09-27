import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { IncidentService } from '../../incidents/services/incident.service';
import { MovementType } from '../../inventory/model/material-movement.entity';
import { MaterialService } from '../../inventory/services/material.service';
import { Project } from '../../projects/model/project.entity';
import { compareIsoDesc, endOfWeek, isWithin, startOfWeek } from '../../shared/utils/date.utils';
import { TaskService } from '../../workforce/services/task.service';
import { WorkerService } from '../../workforce/services/worker.service';
import { CompletedTaskEntry, WeeklyReport } from '../model/weekly-report.model';

/** Consolidates the records of a week into a weekly report (HU20). */
@Injectable({ providedIn: 'root' })
export class WeeklyReportService {
  private readonly taskService = inject(TaskService);
  private readonly workerService = inject(WorkerService);
  private readonly materialService = inject(MaterialService);
  private readonly incidentService = inject(IncidentService);

  generate(project: Project, anyDayOfWeek: Date): Observable<WeeklyReport> {
    const weekStart = startOfWeek(anyDayOfWeek);
    const weekEnd = endOfWeek(weekStart);

    return forkJoin({
      tasks: this.taskService.getByProject(project.id),
      workers: this.workerService.getByProject(project.id),
      movements: this.materialService.getMovementsByProject(project.id),
      materials: this.materialService.getByProject(project.id),
      incidents: this.incidentService.getByProject(project.id),
    }).pipe(
      map(({ tasks, workers, movements, materials, incidents }) => {
        const completedTasks: CompletedTaskEntry[] = tasks
          .filter((task) => task.isCompleted())
          // Without a completion date the due date is used as reference.
          .map((task) => ({ task, completedOn: task.completedAt ?? task.dueDate }))
          .filter((entry) => isWithin(entry.completedOn, weekStart, weekEnd))
          .map((entry) => ({
            ...entry,
            workerName: workers.find((worker) => worker.id === entry.task.workerId)?.fullName ?? entry.task.workerName,
          }))
          .sort((a, b) => compareIsoDesc(a.completedOn, b.completedOn));

        const weekMovements = movements
          .filter((movement) => isWithin(movement.occurredAt, weekStart, weekEnd))
          .sort((a, b) => compareIsoDesc(a.occurredAt, b.occurredAt));

        const weekIncidents = incidents
          .filter((incident) => isWithin(incident.reportedAt, weekStart, weekEnd))
          .sort((a, b) => compareIsoDesc(a.reportedAt, b.reportedAt));

        return {
          project,
          weekStart,
          weekEnd,
          generatedAt: new Date(),
          completedTasks,
          openTasks: tasks.filter((task) => !task.isCompleted()).length,
          entries: weekMovements.filter((movement) => movement.type === MovementType.Entry),
          usages: weekMovements.filter((movement) => movement.type === MovementType.Usage),
          incidents: weekIncidents,
          openIncidents: incidents.filter((incident) => !incident.isResolved()).length,
          lowStockMaterials: materials.filter((material) => material.isBelowMinimum()),
        };
      }),
    );
  }
}
