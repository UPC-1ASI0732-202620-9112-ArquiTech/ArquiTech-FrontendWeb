import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { of, throwError } from 'rxjs';
import { SessionService } from '../../iam/services/session.service';
import { IncidentService } from '../../incidents/services/incident.service';
import {
  MaterialMovementDialogComponent,
  MaterialMovementDialogData,
} from '../../inventory/components/material-movement-dialog/material-movement-dialog.component';
import { MaterialMovement, MovementType } from '../../inventory/model/material-movement.entity';
import { Material } from '../../inventory/model/material.entity';
import { MaterialService } from '../../inventory/services/material.service';
import { Project } from '../../projects/model/project.entity';
import { ProjectListComponent } from '../../projects/pages/project-list/project-list.component';
import { ProjectContextService } from '../../projects/services/project-context.service';
import { ProjectService } from '../../projects/services/project.service';
import { WeeklyReport } from '../../reports/model/weekly-report.model';
import { WeeklyReportComponent } from '../../reports/pages/weekly-report/weekly-report.component';
import { ReportPdfService } from '../../reports/services/report-pdf.service';
import { WeeklyReportService } from '../../reports/services/weekly-report.service';
import { APP_ICONS } from '../../shared/presentation/icons';
import { ToastService } from '../../shared/services/toast.service';
import { AttendanceService } from '../../workforce/services/attendance.service';
import { TaskService } from '../../workforce/services/task.service';
import { WorkerService } from '../../workforce/services/worker.service';
import { ExperimentModeService } from '../experiment-mode.service';
import { ExperimentWorkbenchComponent } from '../experiment-workbench.component';
import {
  EXPERIMENT_SCHEMA_VERSION,
  EXPERIMENT_TRACE_CATALOG,
  ExperimentEvent,
  serializeExperimentEvent,
  validateExperimentEvent,
} from './experiment-event.model';
import {
  ConsoleDebugExperimentEventSink,
  EXPERIMENT_TRACKING_OPTIONS,
  ExperimentEventSink,
  ExperimentTrackingService,
  InMemoryExperimentEventSink,
} from './experiment-tracking.service';

describe('ExperimentTrackingService & Web Tracking Plan (8.2.8)', () => {
  const sampleMaterial = new Material({
    id: 10,
    projectId: 1,
    name: 'Cemento Portland Tipo I',
    unit: 'bolsa',
    quantity: 200,
    stock: 40,
    minimumStock: 15,
    unitPrice: 28.5,
    provider: 'Distribuidora Sur',
    providerRuc: '20100123456',
    date: '2026-09-20',
  });

  const sampleProject = new Project({
    id: 1,
    name: 'Torre Residencial Norte',
    location: 'Miraflores',
    startDate: '2025-06-08',
    endDate: '2026-12-15',
    budget: 250000,
    status: 'ACTIVE',
    progress: 62,
    supervisorId: 1,
    contractorId: 2,
  });

  const sampleReport: WeeklyReport = {
    project: sampleProject,
    weekStart: new Date('2026-09-21T00:00:00Z'),
    weekEnd: new Date('2026-09-27T00:00:00Z'),
    generatedAt: new Date('2026-09-27T12:00:00Z'),
    completedTasks: [],
    openTasks: 2,
    entries: [],
    usages: [],
    incidents: [],
    openIncidents: 1,
    lowStockMaterials: [],
  };

  it('1 & 2. validates schema_version, event catalog, and official EC/Q/metric mappings', () => {
    expect(EXPERIMENT_TRACE_CATALOG.EC01).toEqual({
      experiment_id: 'EC01',
      question_id: 'Q01',
      metric_ids: ['M01', 'F01'],
    });
    expect(EXPERIMENT_TRACE_CATALOG.EC04).toEqual({
      experiment_id: 'EC04',
      question_id: 'Q04',
      metric_ids: ['M04', 'F01'],
    });
    expect(EXPERIMENT_TRACE_CATALOG.EC06.metric_ids).toEqual(['M06', 'M07', 'F02']);
    expect(EXPERIMENT_TRACE_CATALOG.EC08.metric_ids).toEqual(['M09', 'F01']);
    expect(EXPERIMENT_TRACE_CATALOG.EC10.metric_ids).toEqual(['M11', 'F03']);

    const validEvent: ExperimentEvent = {
      schema_version: EXPERIMENT_SCHEMA_VERSION,
      event_name: 'material_operation_completed',
      experiment_id: 'EC01',
      question_id: 'Q01',
      metric_ids: ['M01', 'F01'],
      platform: 'web',
      condition: 'B',
      timestamp: '2026-11-10T18:00:00.000Z',
      session_id: 'sess-0123456789abcdef',
      attempt_id: 'att-fedcba9876543210',
      outcome: 'completed',
      duration_ms: 145,
      operation_type: 'USAGE',
    };
    expect(validateExperimentEvent(validEvent)).toEqual({ valid: true, errors: [] });

    const invalidMetricEvent = {
      ...validEvent,
      question_id: 'Q04',
      metric_ids: ['M04', 'F01'],
    };
    expect(validateExperimentEvent(invalidMetricEvent).valid).toBeFalse();
  });

  it('12. rejects sensitive fields (userId, projectId, materialId, emails, JWTs, notes, outcome_correct)', () => {
    const base = {
      schema_version: '1.0',
      event_name: 'project_consultation_loaded',
      experiment_id: 'EC04',
      question_id: 'Q04',
      metric_ids: ['M04', 'F01'],
      platform: 'web',
      condition: 'A',
      timestamp: '2026-11-10T18:00:00.000Z',
      session_id: 'sess-0123456789abcdef',
      attempt_id: 'att-0123456789abcdef',
      outcome: 'loaded',
      duration_ms: 80,
    };

    for (const forbiddenField of [
      'userId',
      'projectId',
      'materialId',
      'email',
      'password',
      'jwt',
      'note',
      'description',
      'errorMessage',
      'outcome_correct',
    ]) {
      const candidate = { ...base, [forbiddenField]: 'secret' };
      expect(validateExperimentEvent(candidate).valid)
        .withContext(`Should reject ${forbiddenField}`)
        .toBeFalse();
    }

    const withJwt = {
      ...base,
      session_id: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.sig',
    };
    expect(validateExperimentEvent(withJwt).valid).toBeFalse();
  });

  it('13. is disabled by default in production environment and acts as no-op', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(ExperimentTrackingService);
    expect(service.isEnabled()).toBeFalse();

    const handle = service.startMaterialOperation({ condition: 'A', operationType: 'ENTRY' });
    handle.complete();
    expect(service.events().length).toBe(0);
  });

  it('4, 8, 11, 14 & 15. enforces single outcome per attempt, valid monotonic duration, sink fault tolerance, and Mobile JSON compatibility', () => {
    let clockMs = 1000;
    const throwingSink: ExperimentEventSink = {
      emit: () => {
        throw new Error('simulated sink failure');
      },
    };
    const debugLines: string[] = [];

    TestBed.configureTestingModule({
      providers: [
        {
          provide: EXPERIMENT_TRACKING_OPTIONS,
          useValue: {
            enabled: true,
            sink: throwingSink,
            debugSink: new ConsoleDebugExperimentEventSink((line) => debugLines.push(line)),
            monotonicNow: () => clockMs,
            utcTimestamp: () => '2026-11-10T19:00:00.000Z',
          },
        },
      ],
    });

    const service = TestBed.inject(ExperimentTrackingService);
    const attempt = service.startMaterialOperation({ condition: 'B', operationType: 'USAGE' });
    clockMs = 1245;
    attempt.complete();
    // Duplicate calls must be ignored
    clockMs = 1900;
    attempt.complete();
    attempt.failApi('network');
    attempt.failValidation('insufficient_stock');

    const events = service.events();
    expect(events.length).toBe(2);
    expect(events[0].event_name).toBe('material_operation_started');
    expect(events[1].event_name).toBe('material_operation_completed');
    expect(events[0].attempt_id).toBe(events[1].attempt_id);
    expect(events[1].duration_ms).toBe(245);
    expect(debugLines.length).toBe(2);

    // Verify JSONL output and cross-platform compatibility with Mobile payload
    const jsonl = service.toJsonLines().split('\n');
    expect(jsonl.length).toBe(2);
    for (const line of jsonl) {
      const parsed: unknown = JSON.parse(line);
      expect(validateExperimentEvent(parsed).valid).toBeTrue();
    }

    const mobileEventJson = JSON.stringify({
      schema_version: '1.0',
      event_name: 'project_consultation_loaded',
      experiment_id: 'EC04',
      question_id: 'Q04',
      metric_ids: ['M04', 'F01'],
      platform: 'mobile',
      condition: 'A',
      timestamp: '2026-11-10T19:00:00.000Z',
      session_id: 'sess-abcdef0123456789',
      attempt_id: 'att-1234567890abcdef',
      outcome: 'loaded',
      duration_ms: 95,
    });
    const parsedMobile = JSON.parse(mobileEventJson) as ExperimentEvent;
    expect(validateExperimentEvent(parsedMobile)).toEqual({ valid: true, errors: [] });
    expect(serializeExperimentEvent(parsedMobile)).toBe(mobileEventJson);
  });

  it('3, 5, 6, 7, 9 & 10. instruments EC01 Condition A in MaterialMovementDialogComponent only on real submit and keeps condition A even if ExperimentModeService is on', () => {
    const sink = new InMemoryExperimentEventSink();
    let shouldFailApi = false;
    const closedResults: (MaterialMovement | undefined)[] = [];

    const dialogData: MaterialMovementDialogData = {
      type: MovementType.Usage,
      materials: [sampleMaterial],
      material: sampleMaterial,
    };

    TestBed.configureTestingModule({
      imports: [MaterialMovementDialogComponent, TranslateModule.forRoot()],
      providers: [
        importProvidersFrom(LucideAngularModule.pick(APP_ICONS)),
        { provide: DIALOG_DATA, useValue: dialogData },
        { provide: DialogRef, useValue: { close: (res?: MaterialMovement) => closedResults.push(res) } },
        {
          provide: MaterialService,
          useValue: {
            registerUsage: () =>
              shouldFailApi
                ? throwError(
                    () =>
                      new HttpErrorResponse({
                        status: 409,
                        error: { code: 'INSUFFICIENT_STOCK', message: 'Detailed backend text must not leak' },
                      }),
                  )
                : of(
                    new MaterialMovement({
                      id: 99,
                      materialId: 10,
                      projectId: 1,
                      materialName: sampleMaterial.name,
                      unit: sampleMaterial.unit,
                      type: MovementType.Usage,
                      quantity: 5,
                      registeredByUserId: 1,
                      occurredAt: '2026-11-10T10:00:00Z',
                    }),
                  ),
          },
        },
        {
          provide: EXPERIMENT_TRACKING_OPTIONS,
          useValue: { enabled: true, sink },
        },
      ],
    });

    // Enable visual mode B globally to verify Condition A dialog still records Condition A
    TestBed.inject(ExperimentModeService).setEnabled(true);

    const fixture = TestBed.createComponent(MaterialMovementDialogComponent);
    fixture.detectChanges();

    // 9. Rendering and opening the dialog must emit 0 events
    expect(sink.events().length).toBe(0);

    // 6. Validation rejection: quantity exceeds stock (50 > 40)
    fixture.componentInstance['form'].controls.quantity.setValue(50);
    fixture.componentInstance['submit']();
    expect(sink.events().length).toBe(2);
    expect(sink.events()[0].event_name).toBe('material_operation_started');
    expect(sink.events()[0].condition).toBe('A');
    expect(sink.events()[0].operation_type).toBe('USAGE');
    expect(sink.events()[1].event_name).toBe('material_operation_failed');
    expect(sink.events()[1].outcome).toBe('validation_failed');
    expect(sink.events()[1].error_category).toBe('insufficient_stock');
    expect(sink.events()[1].attempt_id).toBe(sink.events()[0].attempt_id);

    // 7. API error on valid form submission
    sink.clear();
    shouldFailApi = true;
    fixture.componentInstance['form'].controls.quantity.setValue(5);
    fixture.componentInstance['submit']();
    expect(sink.events().length).toBe(2);
    expect(sink.events()[0].event_name).toBe('material_operation_started');
    expect(sink.events()[1].event_name).toBe('material_operation_failed');
    expect(sink.events()[1].outcome).toBe('api_failed');
    expect(sink.events()[1].error_category).toBe('insufficient_stock');

    // 5. API success on valid form submission
    sink.clear();
    shouldFailApi = false;
    fixture.componentInstance['submit']();
    expect(sink.events().length).toBe(2);
    expect(sink.events()[0].event_name).toBe('material_operation_started');
    expect(sink.events()[1].event_name).toBe('material_operation_completed');
    expect(sink.events()[1].condition).toBe('A');
    expect(sink.events()[1].outcome).toBe('completed');
    expect(closedResults.length).toBe(1);
    TestBed.inject(ExperimentModeService).setEnabled(false);
  });

  it('3, 5, 6, 7 & 10. instruments EC01 Condition B and EC04 Condition B in ExperimentWorkbenchComponent', async () => {
    const sink = new InMemoryExperimentEventSink();
    let failMovement = false;
    let failReport = false;

    TestBed.configureTestingModule({
      imports: [ExperimentWorkbenchComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: SessionService,
          useValue: {
            isSupervisor: () => true,
            isContractor: () => true,
            user: () => ({ id: 1 }),
          },
        },
        {
          provide: ProjectContextService,
          useValue: {
            current: signal(sampleProject),
          },
        },
        {
          provide: MaterialService,
          useValue: {
            getByProject: () => of([sampleMaterial]),
            getMovementsByProject: () => of([]),
            registerUsage: () =>
              failMovement
                ? throwError(() => new HttpErrorResponse({ status: 500 }))
                : of(
                    new MaterialMovement({
                      id: 100,
                      materialId: 10,
                      projectId: 1,
                      materialName: sampleMaterial.name,
                      unit: sampleMaterial.unit,
                      type: MovementType.Usage,
                      quantity: 5,
                      registeredByUserId: 1,
                      occurredAt: '2026-11-10T10:00:00Z',
                    }),
                  ),
            registerEntry: () => of({}),
          },
        },
        { provide: AttendanceService, useValue: { getByProject: () => of([]), create: () => of({}) } },
        { provide: WorkerService, useValue: { getByProject: () => of([]) } },
        { provide: TaskService, useValue: { getByProject: () => of([]) } },
        { provide: IncidentService, useValue: { getByProject: () => of([]) } },
        {
          provide: WeeklyReportService,
          useValue: {
            generate: () =>
              failReport ? throwError(() => new HttpErrorResponse({ status: 0 })) : of(sampleReport),
          },
        },
        { provide: ReportPdfService, useValue: { download: () => Promise.resolve('report.pdf') } },
        { provide: EXPERIMENT_TRACKING_OPTIONS, useValue: { enabled: true, sink } },
      ],
    });

    const fixture = TestBed.createComponent(ExperimentWorkbenchComponent);
    // Allow editing in unit test regardless of production environment flag
    (fixture.componentInstance as unknown as { readOnlyEnvironment: boolean }).readOnlyEnvironment = false;
    fixture.componentRef.setInput('projectId', '1');
    fixture.componentRef.setInput('experimentId', 'EC01');
    fixture.detectChanges();

    // Rendering EC01 workbench must not emit material operation events
    expect(sink.events().length).toBe(0);

    // Validation rejection in EC01-B (quantity 80 > stock 40)
    fixture.componentInstance['movementQty'].set(80);
    await fixture.componentInstance['saveMovement']();
    expect(sink.events().map((e) => e.event_name)).toEqual([
      'material_operation_started',
      'material_operation_failed',
    ]);
    expect(sink.events()[1].condition).toBe('B');
    expect(sink.events()[1].outcome).toBe('validation_failed');
    expect(sink.events()[1].error_category).toBe('insufficient_stock');

    // API failure in EC01-B
    sink.clear();
    failMovement = true;
    fixture.componentInstance['movementQty'].set(5);
    await fixture.componentInstance['saveMovement']();
    expect(sink.events().map((e) => e.event_name)).toEqual([
      'material_operation_started',
      'material_operation_failed',
    ]);
    expect(sink.events()[1].outcome).toBe('api_failed');
    expect(sink.events()[1].error_category).toBe('api_error');

    // API success in EC01-B
    sink.clear();
    failMovement = false;
    await fixture.componentInstance['saveMovement']();
    expect(sink.events().map((e) => e.event_name)).toEqual([
      'material_operation_started',
      'material_operation_completed',
    ]);
    expect(sink.events()[1].condition).toBe('B');
    expect(sink.events()[1].outcome).toBe('completed');

    // Switch to EC04 Condition B
    sink.clear();
    fixture.componentRef.setInput('experimentId', 'EC04');
    fixture.detectChanges();
    //Repeated detectChanges must NOT duplicate consultation events
    fixture.detectChanges();
    expect(sink.events().map((e) => e.event_name)).toEqual([
      'project_consultation_started',
      'project_consultation_loaded',
    ]);
    expect(sink.events()[0].condition).toBe('B');
    expect(sink.events()[1].outcome).toBe('loaded');
    expect(sink.events()[0].attempt_id).toBe(sink.events()[1].attempt_id);

    // Opening report from EC04-B
    fixture.componentInstance['openEc04Report']();
    // Duplicate click on report link in same attempt does not duplicate
    fixture.componentInstance['openEc04Report']();
    // Navigating to WeeklyReportComponent from EC04-B must not emit spurious Condition A consultation
    expect(TestBed.inject(ExperimentTrackingService).consumeConditionBReportNavigation()).toBeTrue();
    expect(sink.events().map((e) => e.event_name)).toEqual([
      'project_consultation_started',
      'project_consultation_loaded',
      'project_report_opened',
    ]);
    expect(sink.events()[2].condition).toBe('B');
    expect(sink.events()[2].attempt_id).toBe(sink.events()[0].attempt_id);

    // Explicit refresh with API failure on EC04-B
    sink.clear();
    failReport = true;
    fixture.componentInstance['refresh'](true);
    expect(sink.events().map((e) => e.event_name)).toEqual([
      'project_consultation_started',
      'project_consultation_failed',
    ]);
    expect(sink.events()[1].outcome).toBe('api_failed');
    expect(sink.events()[1].error_category).toBe('network');
  });

  it('3, 4 & 9. instruments EC04 Condition A across ProjectListComponent and WeeklyReportComponent without duplicate render events', async () => {
    const sink = new InMemoryExperimentEventSink();

    TestBed.configureTestingModule({
      imports: [ProjectListComponent, WeeklyReportComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'projects/:projectId/materials', component: ProjectListComponent }]),
        importProvidersFrom(LucideAngularModule.pick(APP_ICONS)),
        {
          provide: SessionService,
          useValue: {
            isSupervisor: () => false,
            isContractor: () => true,
            user: () => ({ id: 2 }),
          },
        },
        {
          provide: ProjectService,
          useValue: { getForCurrentUser: () => of([sampleProject]) },
        },
        {
          provide: ProjectContextService,
          useValue: {
            current: signal(sampleProject),
            leave: () => {},
            select: () => {},
          },
        },
        {
          provide: WeeklyReportService,
          useValue: { generate: () => of(sampleReport) },
        },
        {
          provide: ReportPdfService,
          useValue: { download: () => Promise.resolve('arquitech.pdf') },
        },
        {
          provide: ToastService,
          useValue: { success: () => {}, error: () => {} },
        },
        { provide: EXPERIMENT_TRACKING_OPTIONS, useValue: { enabled: true, sink } },
      ],
    });

    const listFixture = TestBed.createComponent(ProjectListComponent);
    listFixture.detectChanges();
    // Rendering project list alone does not emit consultation start
    expect(sink.events().length).toBe(0);

    // Selecting project starts Condition A consultation
    listFixture.componentInstance['open'](sampleProject);
    expect(sink.events().map((e) => e.event_name)).toEqual(['project_consultation_started']);
    const startedAttemptId = sink.events()[0].attempt_id;

    // Opening WeeklyReportComponent reuses the pending consultation and emits loaded once
    const reportFixture = TestBed.createComponent(WeeklyReportComponent);
    reportFixture.componentRef.setInput('projectId', '1');
    reportFixture.detectChanges();
    reportFixture.detectChanges();

    expect(sink.events().map((e) => e.event_name)).toEqual([
      'project_consultation_started',
      'project_consultation_loaded',
    ]);
    expect(sink.events()[1].attempt_id).toBe(startedAttemptId);
    expect(sink.events()[1].condition).toBe('A');

    // Downloading/accessing report emits project_report_opened correlated with the attempt
    await reportFixture.componentInstance['download']();
    // Calling download() again in the same consultation must not emit a duplicate report_opened
    await reportFixture.componentInstance['download']();
    expect(sink.events().map((e) => e.event_name)).toEqual([
      'project_consultation_started',
      'project_consultation_loaded',
      'project_report_opened',
    ]);
    expect(sink.events()[2].attempt_id).toBe(startedAttemptId);
    expect(sink.events()[2].condition).toBe('A');
  });
});
