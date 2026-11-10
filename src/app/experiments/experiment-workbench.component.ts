import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin, firstValueFrom } from 'rxjs';
import { SessionService } from '../../iam/services/session.service';
import { ProjectContextService } from '../../projects/services/project-context.service';
import { MaterialService } from '../../inventory/services/material.service';
import { Material } from '../../inventory/model/material.entity';
import { MaterialMovement, MovementType } from '../../inventory/model/material-movement.entity';
import { AttendanceStatus } from '../../workforce/model/attendance.entity';
import { AttendanceService } from '../../workforce/services/attendance.service';
import { WorkerService } from '../../workforce/services/worker.service';
import { Worker } from '../../workforce/model/worker.entity';
import { Task } from '../../workforce/model/task.entity';
import { TaskService } from '../../workforce/services/task.service';
import { Incident, IncidentSeverity } from '../../incidents/model/incident.entity';
import { IncidentService } from '../../incidents/services/incident.service';
import { WeeklyReport } from '../../reports/model/weekly-report.model';
import { WeeklyReportService } from '../../reports/services/weekly-report.service';
import { ReportPdfService } from '../../reports/services/report-pdf.service';
import { environment } from '../../../environments/environment';

type ExperimentId = 'EC01' | 'EC02' | 'EC03' | 'EC04' | 'EC05' | 'EC06' | 'EC07' | 'EC09';
interface ExperimentLink { id: ExperimentId; title: string; description: string; role: 'all' | 'supervisor' | 'contractor'; }

const EXPERIMENTS: ExperimentLink[] = [
  { id: 'EC04', title: 'Panel de seguimiento', description: 'Estado, avance, incidencias y reporte en un mismo lugar.', role: 'contractor' },
  { id: 'EC06', title: 'Reporte asistido', description: 'Consolidación verificable del reporte semanal y descarga.', role: 'supervisor' },
  { id: 'EC07', title: 'Incidencias críticas', description: 'Bandeja priorizada de alertas de alta severidad.', role: 'all' },
  { id: 'EC01', title: 'Registro guiado de materiales', description: 'Verificación anticipada de existencias y cantidades.', role: 'supervisor' },
  { id: 'EC05', title: 'Historial verificable', description: 'Responsable, fecha y tipo de cada movimiento.', role: 'all' },
  { id: 'EC02', title: 'Asistencia rápida', description: 'Registrar una jornada desde una lista de trabajadores.', role: 'supervisor' },
  { id: 'EC03', title: 'Tareas prioritarias', description: 'Tareas vencidas y próximas a vencer primero.', role: 'supervisor' },
  { id: 'EC09', title: 'Primeros pasos por rol', description: 'Guía interactiva para el primer uso.', role: 'all' },
];

/**
 * Experimental condition B only. Main branch remains the A baseline.
 * Runs with the existing project guard; mutation is blocked outside mock mode.
 */
@Component({
  selector: 'app-experiment-workbench',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './experiment-workbench.component.html',
  styleUrl: './experiment-workbench.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExperimentWorkbenchComponent implements OnInit {
  readonly projectId = input.required<string>();
  readonly experimentId = input.required<string>();
  protected readonly session = inject(SessionService);
  protected readonly projectContext = inject(ProjectContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly materialService = inject(MaterialService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly workerService = inject(WorkerService);
  private readonly taskService = inject(TaskService);
  private readonly incidentService = inject(IncidentService);
  private readonly reportService = inject(WeeklyReportService);
  private readonly pdfService = inject(ReportPdfService);

  protected readonly experimentLinks = EXPERIMENTS;
  protected readonly current = computed(() => EXPERIMENTS.find(e => e.id === this.experimentId()));
  protected readonly readOnlyEnvironment = !environment.useMockApi;
  protected readonly busy = signal(false);
  protected readonly loading = signal(false);
  protected readonly message = signal('');
  protected readonly error = signal('');
  protected readonly materials = signal<Material[]>([]);
  protected readonly movements = signal<MaterialMovement[]>([]);
  protected readonly workers = signal<Worker[]>([]);
  protected readonly tasks = signal<Task[]>([]);
  protected readonly incidents = signal<Incident[]>([]);
  protected readonly report = signal<WeeklyReport | null>(null);
  protected readonly selectedMaterialId = signal(0);
  protected readonly movementKind = signal<MovementType>(MovementType.Usage);
  protected readonly movementQty = signal(1);
  protected readonly attendanceDate = signal(new Date().toISOString().slice(0, 10));
  protected readonly selections = signal<Record<number, AttendanceStatus>>({});
  protected readonly completedGuideSteps = signal<number[]>([]);
  protected readonly selectedCriticalId = signal<number | null>(null);

  protected readonly canEdit = computed(() => this.session.isSupervisor() && !this.readOnlyEnvironment);
  protected readonly selectedMaterial = computed(() => this.materials().find(m => m.id === this.selectedMaterialId()) ?? null);
  protected readonly lowStock = computed(() => this.materials().filter(m => m.isBelowMinimum()));
  protected readonly orderedTasks = computed(() => [...this.tasks()].sort((a, b) => {
    const aScore = a.isCompleted() ? 2 : a.isOverdue() ? 0 : 1;
    const bScore = b.isCompleted() ? 2 : b.isOverdue() ? 0 : 1;
    return aScore - bScore || a.dueDate.localeCompare(b.dueDate);
  }));
  protected readonly critical = computed(() => this.incidents()
    .filter(i => i.severity === IncidentSeverity.High && !i.isResolved())
    .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt)));
  protected readonly selectedAlert = computed(() => this.critical().find(i => i.id === this.selectedCriticalId()) ?? null);
  protected readonly guide = computed(() => this.session.isContractor()
    ? [
      { label: 'Revisar el estado y avance del proyecto', target: 'EC04' },
      { label: 'Abrir el reporte semanal', target: 'reports' },
      { label: 'Consultar las incidencias', target: 'incidents' },
    ]
    : [
      { label: 'Revisar tareas prioritarias', target: 'EC03' },
      { label: 'Registrar un material en entorno de ensayo', target: 'EC01' },
      { label: 'Revisar las alertas críticas', target: 'EC07' },
    ]);

  ngOnInit(): void {
    this.refresh();
  }

  protected visible(experiment: ExperimentLink): boolean {
    return experiment.role === 'all' ||
      (experiment.role === 'supervisor' && this.session.isSupervisor()) ||
      (experiment.role === 'contractor' && this.session.isContractor());
  }

  protected path(id: string): string[] {
    return ['/projects', this.projectId(), 'experiments', id];
  }

  protected modulePath(name: string): string[] {
    return ['/projects', this.projectId(), name];
  }

  protected refresh(): void {
    const id = Number(this.projectId());
    const current = this.projectContext.current();
    if (!Number.isInteger(id) || !current || current.id !== id) {
      this.error.set('No se encontró una obra autorizada en la sesión.');
      return;
    }
    this.error.set('');
    this.message.set('');
    const experiment = this.experimentId();
    if (experiment === 'overview' || experiment === 'EC09') return;
    this.loading.set(true);
    const request = (() => {
      switch (experiment) {
        case 'EC01': return forkJoin({ materials: this.materialService.getByProject(id) });
        case 'EC02': return forkJoin({ workers: this.workerService.getByProject(id) });
        case 'EC03': return forkJoin({ tasks: this.taskService.getByProject(id) });
        case 'EC04':
        case 'EC06': return forkJoin({ report: this.reportService.generate(current, new Date()) });
        case 'EC05': return forkJoin({ movements: this.materialService.getMovementsByProject(id) });
        case 'EC07': return forkJoin({ incidents: this.incidentService.getByProject(id) });
        default: return null;
      }
    })();
    if (!request) {
      this.loading.set(false);
      this.error.set('Experimento no disponible en esta rama.');
      return;
    }
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        if ('materials' in result) {
          this.materials.set(result.materials);
          if (!this.selectedMaterialId() && result.materials.length) this.selectedMaterialId.set(result.materials[0].id);
        }
        if ('workers' in result) this.workers.set(result.workers.filter(w => w.isActive()).slice(0, 12));
        if ('tasks' in result) this.tasks.set(result.tasks);
        if ('report' in result) this.report.set(result.report);
        if ('movements' in result) this.movements.set(
          [...result.movements].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
        );
        if ('incidents' in result) this.incidents.set(result.incidents);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar los datos del proyecto. Comprueba la conexión o el escenario de ensayo.');
      },
    });
  }

  protected changeMaterial(event: Event): void {
    this.selectedMaterialId.set(Number((event.target as HTMLSelectElement).value));
  }
  protected changeKind(event: Event): void {
    this.movementKind.set((event.target as HTMLSelectElement).value as MovementType);
  }
  protected changeQty(event: Event): void {
    this.movementQty.set(Number((event.target as HTMLInputElement).value));
  }
  protected stockError(): string {
    const quantity = this.movementQty();
    const material = this.selectedMaterial();
    if (!material) return 'Selecciona un material.';
    if (!Number.isFinite(quantity) || quantity <= 0) return 'La cantidad debe ser mayor que cero.';
    if (this.movementKind() === MovementType.Usage && quantity > material.stock) {
      return 'El uso supera el stock disponible (' + material.stock + ' ' + material.unit + ').';
    }
    return '';
  }

  protected async saveMovement(): Promise<void> {
    if (!this.canEdit() || this.stockError() || this.busy()) return;
    const material = this.selectedMaterial();
    if (!material) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const at = new Date().toISOString();
      if (this.movementKind() === MovementType.Entry) {
        await firstValueFrom(this.materialService.registerEntry(material.id, {
          quantity: this.movementQty(),
          supplier: material.provider || 'Proveedor de ensayo',
          occurredAt: at,
          note: 'EC01 - escenario controlado',
        }));
      } else {
        await firstValueFrom(this.materialService.registerUsage(material.id, {
          quantity: this.movementQty(),
          occurredAt: at,
          note: 'EC01 - escenario controlado',
        }));
      }
      this.message.set('Movimiento de ensayo registrado. Se actualizará el stock.');
      this.refresh();
    } catch {
      this.error.set('No se pudo registrar el movimiento. Los datos no se han confirmado.');
    } finally {
      this.busy.set(false);
    }
  }

  protected setAttendance(workerId: number, event: Event): void {
    const value = (event.target as HTMLSelectElement).value as AttendanceStatus;
    this.selections.update(values => ({ ...values, [workerId]: value }));
  }
  protected attendanceComplete(): boolean {
    return this.workers().length > 0 && this.workers().every(w => !!this.selections()[w.id]);
  }
  protected async saveAttendance(): Promise<void> {
    if (!this.canEdit() || !this.attendanceComplete() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const date = this.attendanceDate();
      const existing = await firstValueFrom(this.attendanceService.getByProject(Number(this.projectId()), date));
      const registered = new Set(existing.map(row => row.workerId));
      let count = 0;
      for (const worker of this.workers()) {
        if (registered.has(worker.id)) continue;
        await firstValueFrom(this.attendanceService.create({
          projectId: Number(this.projectId()), workerId: worker.id, attendanceDate: date,
          status: this.selections()[worker.id], checkInAt: null, checkOutAt: null,
          notes: 'EC02 - jornada de ensayo',
        }));
        count++;
      }
      this.message.set(count + ' registros nuevos guardados; ' + registered.size + ' ya existían para la fecha.');
    } catch {
      this.error.set('Se produjo un error; algunos registros pueden haberse guardado. Revisa la asistencia antes de repetir.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async downloadReport(): Promise<void> {
    const report = this.report();
    if (!report || this.busy()) return;
    this.busy.set(true);
    try {
      await this.pdfService.download(report);
      this.message.set('Reporte generado con la información disponible para la semana.');
    } catch {
      this.error.set('No se pudo generar el PDF.');
    } finally {
      this.busy.set(false);
    }
  }

  protected toggleGuideStep(index: number): void {
    this.completedGuideSteps.update(steps => steps.includes(index) ? steps.filter(i => i !== index) : [...steps, index]);
  }
  protected selectAlert(id: number): void {
    this.selectedCriticalId.set(id);
  }
}
