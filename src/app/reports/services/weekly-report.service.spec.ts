import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Incident } from '../../incidents/model/incident.entity';
import { IncidentService } from '../../incidents/services/incident.service';
import { MaterialMovement } from '../../inventory/model/material-movement.entity';
import { MaterialService } from '../../inventory/services/material.service';
import { Project } from '../../projects/model/project.entity';
import { Task } from '../../workforce/model/task.entity';
import { TaskService } from '../../workforce/services/task.service';
import { WorkerService } from '../../workforce/services/worker.service';
import { WeeklyReportService } from './weekly-report.service';

describe('WeeklyReportService (HU20)', () => {
  const project = new Project({
    id: 1,
    name: 'Torre Residencial Norte',
    location: 'Miraflores',
    startDate: '2025-06-08',
    endDate: '2026-12-15',
    budget: 100,
    status: 'ACTIVE',
    progress: 62,
    supervisorId: 1,
    contractorId: 2,
  });
  const monday = new Date(2026, 8, 21, 12);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TaskService,
          useValue: {
            getByProject: () =>
              of([
                new Task({
                  id: 1,
                  projectId: 1,
                  workerId: 1,
                  title: 'Tarrajeo',
                  description: '',
                  status: 'COMPLETED',
                  dueDate: '2026-09-24',
                  createdAt: '2026-09-15',
                  completedAt: '2026-09-23T10:00:00',
                }),
                new Task({
                  id: 2,
                  projectId: 1,
                  workerId: 1,
                  title: 'Encofrado',
                  description: '',
                  status: 'COMPLETED',
                  dueDate: '2026-09-10',
                  createdAt: '2026-09-01',
                  completedAt: '2026-09-10T10:00:00',
                }),
                new Task({
                  id: 3,
                  projectId: 1,
                  workerId: 1,
                  title: 'Tableros',
                  description: '',
                  status: 'PENDING',
                  dueDate: '2026-10-01',
                  createdAt: '2026-09-01',
                }),
              ]),
          },
        },
        { provide: WorkerService, useValue: { getByProject: () => of([]) } },
        {
          provide: MaterialService,
          useValue: {
            getByProject: () => of([]),
            getMovementsByProject: () =>
              of([
                new MaterialMovement({
                  id: 1,
                  materialId: 1,
                  projectId: 1,
                  materialName: 'Cemento',
                  unit: 'kg',
                  type: 'USAGE',
                  quantity: 50,
                  registeredByUserId: 1,
                  occurredAt: '2026-09-22T09:00:00',
                }),
                new MaterialMovement({
                  id: 2,
                  materialId: 2,
                  projectId: 1,
                  materialName: 'Ladrillos',
                  unit: 'u',
                  type: 'ENTRY',
                  quantity: 1000,
                  registeredByUserId: 1,
                  occurredAt: '2026-09-27T20:00:00',
                }),
                new MaterialMovement({
                  id: 3,
                  materialId: 2,
                  projectId: 1,
                  materialName: 'Ladrillos',
                  unit: 'u',
                  type: 'ENTRY',
                  quantity: 9000,
                  registeredByUserId: 1,
                  occurredAt: '2026-08-01T09:00:00',
                }),
              ]),
          },
        },
        {
          provide: IncidentService,
          useValue: {
            getByProject: () =>
              of([
                new Incident({
                  id: 1,
                  projectId: 1,
                  reportedByUserId: 1,
                  type: 'MATERIAL_SHORTAGE',
                  description: 'x',
                  severity: 'HIGH',
                  status: 'OPEN',
                  reportedAt: '2026-09-23T11:00:00',
                }),
              ]),
          },
        },
      ],
    });
  });

  it('consolidates only the records of the selected week', (done) => {
    TestBed.inject(WeeklyReportService)
      .generate(project, monday)
      .subscribe((report) => {
        expect(report.completedTasks.map((entry) => entry.task.title)).toEqual(['Tarrajeo']);
        expect(report.usages.length).toBe(1);
        expect(report.entries.length).toBe(1);
        expect(report.incidents.length).toBe(1);
        expect(report.openTasks).toBe(1);
        done();
      });
  });

  it('keeps empty categories for a week without records (AC2)', (done) => {
    TestBed.inject(WeeklyReportService)
      .generate(project, new Date(2025, 0, 8))
      .subscribe((report) => {
        expect(report.completedTasks).toEqual([]);
        expect(report.entries).toEqual([]);
        expect(report.usages).toEqual([]);
        expect(report.incidents).toEqual([]);
        expect(report.project.name).toBe('Torre Residencial Norte');
        done();
      });
  });
});
