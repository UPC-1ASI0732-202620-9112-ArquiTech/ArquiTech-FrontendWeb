import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Incident } from '../../incidents/model/incident.entity';
import { IncidentService } from '../../incidents/services/incident.service';
import { User } from '../../iam/model/user.entity';
import { SessionService } from '../../iam/services/session.service';
import { Material } from '../../inventory/model/material.entity';
import { MaterialService } from '../../inventory/services/material.service';
import { Project } from '../../projects/model/project.entity';
import { ProjectContextService } from '../../projects/services/project-context.service';
import { AlertReadStateService } from './alert-read-state.service';
import { ProjectAlertsService } from './project-alerts.service';

describe('ProjectAlertsService', () => {
  const project = new Project({
    id: 10,
    name: 'Site North',
    location: 'Lima',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    budget: 100,
    status: 'ACTIVE',
    progress: 10,
    supervisorId: 1,
    contractorId: 2,
  });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MaterialService,
          useValue: {
            getByProject: () =>
              of([
                new Material({
                  id: 1,
                  projectId: 10,
                  name: 'Cement',
                  unit: 'bags',
                  quantity: 10,
                  stock: 2,
                  minimumStock: 5,
                  unitPrice: 10,
                  provider: 'Supplier',
                  providerRuc: '20100124567',
                  date: '2026-01-01',
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
                  id: 2,
                  projectId: 10,
                  reportedByUserId: 1,
                  type: 'MATERIAL_SHORTAGE',
                  description: 'Shortage',
                  severity: 'HIGH',
                  status: 'OPEN',
                  reportedAt: '2026-01-01T10:00:00',
                }),
              ]),
          },
        },
      ],
    });
  });

  function prepare(userId = 1): ProjectAlertsService {
    const session = TestBed.inject(SessionService);
    session.start('token', new User({ id: userId, fullName: 'User', email: 'user@example.com', role: 'SUPERVISOR' }));
    TestBed.inject(ProjectContextService).select(project);
    const service = TestBed.inject(ProjectAlertsService);
    service.refresh();
    return service;
  }

  it('counts current alerts as unread and supports individual and bulk actions', () => {
    const service = prepare();

    expect(service.alerts().length).toBe(2);
    expect(service.unreadCount()).toBe(2);

    service.markAsRead('material-1');
    expect(service.unreadCount()).toBe(1);
    expect(service.alerts().find((alert) => alert.id === 'material-1')?.read).toBeTrue();

    service.markAllAsRead();
    expect(service.unreadCount()).toBe(0);
    expect(service.hasUnread()).toBeFalse();
  });

  it('restores read state for the same user and project after refresh', () => {
    const service = prepare();
    service.markAsRead('incident-2');

    service.refresh();

    expect(service.unreadCount()).toBe(1);
    expect(service.alerts().find((alert) => alert.id === 'incident-2')?.read).toBeTrue();
  });

  it('does not share read state between users or projects', () => {
    const service = prepare(1);
    service.markAsRead('material-1');

    const session = TestBed.inject(SessionService);
    session.start('token', new User({ id: 2, fullName: 'Other', email: 'other@example.com', role: 'SUPERVISOR' }));
    service.refresh();
    expect(service.unreadCount()).toBe(2);

    const otherProject = new Project({
      id: 11,
      name: project.name,
      location: project.location,
      startDate: project.startDate,
      endDate: project.endDate,
      budget: project.budget,
      status: project.status,
      progress: project.progress,
      supervisorId: project.supervisorId,
      contractorId: project.contractorId,
    });
    TestBed.inject(ProjectContextService).select(otherProject);
    service.refresh();
    expect(service.unreadCount()).toBe(2);
  });
});
