import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { filter, map } from 'rxjs';
import { ProjectContextService } from '../../../../projects/services/project-context.service';
import { LanguageSwitchComponent } from '../../components/language-switch/language-switch.component';

interface ProjectNavItem {
  path: string;
  labelKey: string;
  icon: string;
}

/** Sidebar from the Figma screens: brand, module navigation, back link and language. */
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, TranslatePipe, LucideAngularModule, LanguageSwitchComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly router = inject(Router);
  protected readonly context = inject(ProjectContextService);

  readonly navigate = output<void>();
  readonly closeNav = output<void>();

  /** Modules of a work, in the order of the Figma sidebar plus Tasks and the weekly report. */
  protected readonly projectItems: ProjectNavItem[] = [
    { path: 'materials', labelKey: 'nav.materials', icon: 'chart-column-stacked' },
    { path: 'workers', labelKey: 'nav.workers', icon: 'construction' },
    { path: 'tasks', labelKey: 'nav.tasks', icon: 'clipboard-list' },
    { path: 'incidents', labelKey: 'nav.incidents', icon: 'triangle-alert' },
    { path: 'machinery', labelKey: 'nav.machinery', icon: 'forklift' },
    { path: 'reports', labelKey: 'nav.reports', icon: 'file-text' },
  ];

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** Project used by the module links: the one on screen, otherwise the last one opened. */
  protected readonly targetProjectId = computed(() => this.context.current()?.id ?? this.context.last()?.id ?? null);

  protected readonly isProjectListActive = computed(() => {
    const url = this.url().split('?')[0];
    return url === '/projects' || url === '/projects/new';
  });
}
