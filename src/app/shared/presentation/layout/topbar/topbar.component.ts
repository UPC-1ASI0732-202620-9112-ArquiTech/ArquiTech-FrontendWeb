import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { filter } from 'rxjs';
import { AuthenticationService } from '../../../../iam/services/authentication.service';
import { SessionService } from '../../../../iam/services/session.service';
import { ProjectContextService } from '../../../../projects/services/project-context.service';
import { ProjectAlertsService } from '../../../../reports/services/project-alerts.service';

/** Top bar from the Figma screens: breadcrumb, notifications and user menu. */
@Component({
  selector: 'app-topbar',
  imports: [
    RouterLink,
    TranslatePipe,
    LucideAngularModule,
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
  ],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authentication = inject(AuthenticationService);
  protected readonly session = inject(SessionService);
  protected readonly context = inject(ProjectContextService);
  protected readonly alerts = inject(ProjectAlertsService);

  readonly toggleNav = output<void>();

  protected readonly sectionKey = signal<string>('');
  protected readonly alertsOpen = signal(false);
  protected readonly alertPositions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
  ];

  constructor() {
    this.updateSection();
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => {
        this.updateSection();
        this.alerts.refresh();
      });
  }

  protected openAlerts(): void {
    this.alerts.refresh();
    this.alertsOpen.set(!this.alertsOpen());
  }

  protected goTo(link: (string | number)[]): void {
    this.alertsOpen.set(false);
    void this.router.navigate(link);
  }

  protected signOut(): void {
    this.authentication.signOut();
  }

  private updateSection(): void {
    let current = this.route.snapshot;
    while (current.firstChild) {
      current = current.firstChild;
    }
    this.sectionKey.set((current.data['titleKey'] as string | undefined) ?? '');
  }
}
