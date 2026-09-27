import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription } from 'rxjs';
import { ProjectContextService } from '../../../projects/services/project-context.service';
import { PROJECT_STATUS_TONE } from '../../../projects/components/project-status.tones';
import { INCIDENT_SEVERITY_TONE, INCIDENT_STATUS_TONE } from '../../../incidents/components/incident.tones';
import {
  ListStateComponent,
  LoadStatus,
} from '../../../shared/presentation/components/list-state/list-state.component';
import { StatusBadgeComponent } from '../../../shared/presentation/components/status-badge/status-badge.component';
import { AppDatePipe, AppNumberPipe, PenCurrencyPipe } from '../../../shared/presentation/pipes/format.pipes';
import { ToastService } from '../../../shared/services/toast.service';
import { addDays, parseIso, startOfWeek, toIsoDate } from '../../../shared/utils/date.utils';
import { WeeklyReport } from '../../model/weekly-report.model';
import { ReportPdfService } from '../../services/report-pdf.service';
import { WeeklyReportService } from '../../services/weekly-report.service';

/** Weekly report of the work (HU20) with PDF download (HU52). */
@Component({
  selector: 'app-weekly-report',
  imports: [
    TranslatePipe,
    LucideAngularModule,
    ListStateComponent,
    StatusBadgeComponent,
    AppDatePipe,
    AppNumberPipe,
    PenCurrencyPipe,
  ],
  templateUrl: './weekly-report.component.html',
  styleUrl: './weekly-report.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeeklyReportComponent {
  readonly projectId = input.required<string>();

  private readonly reportService = inject(WeeklyReportService);
  private readonly pdfService = inject(ReportPdfService);
  private readonly context = inject(ProjectContextService);
  private readonly toast = inject(ToastService);
  private subscription?: Subscription;

  protected readonly projectStatusTone = PROJECT_STATUS_TONE;
  protected readonly severityTone = INCIDENT_SEVERITY_TONE;
  protected readonly incidentStatusTone = INCIDENT_STATUS_TONE;

  protected readonly weekStart = signal(startOfWeek(new Date()));
  protected readonly report = signal<WeeklyReport | null>(null);
  protected readonly status = signal<LoadStatus>('loading');
  protected readonly downloading = signal(false);

  protected readonly isCurrentWeek = computed(() => this.weekStart().getTime() >= startOfWeek(new Date()).getTime());
  protected readonly weekStartIso = computed(() => toIsoDate(this.weekStart()));
  protected readonly weekEndIso = computed(() => toIsoDate(addDays(this.weekStart(), 6)));
  protected readonly todayIso = toIsoDate(new Date());

  constructor() {
    effect(() => {
      const project = this.context.current();
      const weekStart = this.weekStart();
      if (project && String(project.id) === this.projectId()) {
        untracked(() => this.load(weekStart));
      }
    });
    inject(DestroyRef).onDestroy(() => this.subscription?.unsubscribe());
  }

  protected load(weekStart = this.weekStart()): void {
    const project = this.context.current();
    if (!project) {
      return;
    }
    this.subscription?.unsubscribe();
    this.status.set('loading');
    this.subscription = this.reportService.generate(project, weekStart).subscribe({
      next: (report) => {
        this.report.set(report);
        this.status.set('ready');
      },
      error: () => this.status.set('error'),
    });
  }

  protected shiftWeek(weeks: number): void {
    const next = addDays(this.weekStart(), weeks * 7);
    if (next.getTime() <= startOfWeek(new Date()).getTime()) {
      this.weekStart.set(next);
    }
  }

  protected goToCurrentWeek(): void {
    this.weekStart.set(startOfWeek(new Date()));
  }

  protected pickDate(event: Event): void {
    const date = parseIso((event.target as HTMLInputElement).value);
    if (date) {
      this.weekStart.set(startOfWeek(date));
    }
  }

  protected async download(): Promise<void> {
    const report = this.report();
    if (!report || this.downloading()) {
      return;
    }
    this.downloading.set(true);
    try {
      const fileName = await this.pdfService.download(report);
      this.toast.success('reports.downloaded', { file: fileName });
    } catch {
      this.toast.error('reports.downloadError');
    } finally {
      this.downloading.set(false);
    }
  }
}
