import { Incident } from '../../incidents/model/incident.entity';
import { MaterialMovement } from '../../inventory/model/material-movement.entity';
import { Material } from '../../inventory/model/material.entity';
import { Project } from '../../projects/model/project.entity';
import { Task } from '../../workforce/model/task.entity';

export interface CompletedTaskEntry {
  task: Task;
  workerName: string;
  completedOn: string;
}

/**
 * Weekly report of a work (HU20): project information, completed tasks,
 * material entries and usages, and incidents registered during the week.
 * Categories without records are kept as empty lists (AC2).
 */
export interface WeeklyReport {
  project: Project;
  weekStart: Date;
  weekEnd: Date;
  generatedAt: Date;
  completedTasks: CompletedTaskEntry[];
  openTasks: number;
  entries: MaterialMovement[];
  usages: MaterialMovement[];
  incidents: Incident[];
  openIncidents: number;
  lowStockMaterials: Material[];
}
