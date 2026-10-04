import { Dialog } from '@angular/cdk/dialog';
import { DeleteProjectDialogComponent } from '../../components/delete-project-dialog.component';
import { openFormDialog } from '../../../shared/services/dialog.helpers';
import { ToastService } from '../../../shared/services/toast.service';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { SessionService } from '../../../iam/services/session.service';
import {
  DataToolbarComponent,
  FilterField,
} from '../../../shared/presentation/components/data-toolbar/data-toolbar.component';
import {
  ListStateComponent,
  LoadStatus,
} from '../../../shared/presentation/components/list-state/list-state.component';
import { PaginatorComponent } from '../../../shared/presentation/components/paginator/paginator.component';
import { StatusBadgeComponent } from '../../../shared/presentation/components/status-badge/status-badge.component';
import { AppDatePipe } from '../../../shared/presentation/pipes/format.pipes';
import { compareIsoDesc, isWithinIsoRange } from '../../../shared/utils/date.utils';
import { TableState, normalizeText } from '../../../shared/utils/table-state';
import { PROJECT_STATUS_TONE } from '../../components/project-status.tones';
import { Project, ProjectStatus } from '../../model/project.entity';
import { ProjectContextService } from '../../services/project-context.service';
import { ProjectService } from '../../services/project.service';

/** Figma "Proyectos": works under supervision (HU22) or contracted (HU33). */
@Component({
  selector: 'app-project-list',
  imports: [
    RouterLink,
    TranslatePipe,
    LucideAngularModule,
    DataToolbarComponent,
    ListStateComponent,
    PaginatorComponent,
    StatusBadgeComponent,
    AppDatePipe,
  ],
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectListComponent implements OnInit {
  private readonly dialog = inject(Dialog);
  private readonly toast = inject(ToastService);
  private readonly projectService = inject(ProjectService);
  private readonly context = inject(ProjectContextService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly session = inject(SessionService);

  protected readonly status = signal<LoadStatus>('loading');
  protected readonly statusTone = PROJECT_STATUS_TONE;

  protected readonly table = new TableState<Project>({
    search: (project, query) =>
      normalizeText(`${project.name} ${project.location} ${project.contractorName}`).includes(query),
    filter: (project, filters) =>
      (!filters['status'] || project.status === filters['status']) &&
      isWithinIsoRange(project.startDate, filters['from'], filters['to']),
    sort: (a, b) => compareIsoDesc(a.startDate, b.startDate),
  });

  protected readonly filterFields: FilterField[] = [
    {
      key: 'status',
      labelKey: 'common.status',
      type: 'select',
      options: Object.values(ProjectStatus).map((value) => ({ value, labelKey: `projects.status.${value}` })),
    },
    { key: 'from', labelKey: 'filters.from', type: 'date' },
    { key: 'to', labelKey: 'filters.to', type: 'date' },
  ];

  ngOnInit(): void {
    this.context.leave();
    this.load();
  }

  protected load(): void {
    this.status.set('loading');
    this.projectService
      .getForCurrentUser()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (projects) => {
          this.table.setRows(projects);
          this.status.set('ready');
        },
        error: () => this.status.set('error'),
      });
  }

  protected delete(project: Project): void {
    openFormDialog<boolean, Project>(this.dialog, DeleteProjectDialogComponent, project).closed.subscribe((deleted) => {
      if (deleted) {
        this.toast.success('projects.delete.success');
        this.load();
      }
    });
  }
  protected open(project: Project): void {
    void this.router.navigate(['/projects', project.id, 'materials']);
  }
}
