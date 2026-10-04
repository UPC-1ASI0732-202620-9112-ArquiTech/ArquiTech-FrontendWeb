import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './iam/guards/auth.guards';
import { UserRole } from './iam/model/user.entity';
import { SignInComponent } from './iam/pages/sign-in/sign-in.component';
import { projectAccessGuard } from './projects/guards/project-access.guard';
import { ShellComponent } from './shared/presentation/layout/shell/shell.component';

/**
 * Route map of the web application. Every route below the shell requires a
 * session (TS17); write-only routes also require the Supervisor role (TS21).
 */
export const routes: Routes = [
  {
    path: 'login',
    component: SignInComponent,
    canActivate: [guestGuard],
    data: { titleKey: 'auth.signIn' },
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'projects' },
      {
        path: 'projects',
        loadComponent: () =>
          import('./projects/pages/project-list/project-list.component').then((m) => m.ProjectListComponent),
        data: { titleKey: 'nav.projects' },
      },
      {
        path: 'projects/new',
        loadComponent: () =>
          import('./projects/pages/project-create/project-create.component').then((m) => m.ProjectCreateComponent),
        canActivate: [roleGuard],
        data: { titleKey: 'projects.create.title', roles: [UserRole.Supervisor] },
      },
      {
        path: 'projects/:projectId',
        canActivate: [projectAccessGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'materials' },
          {
            path: 'materials',
            loadComponent: () =>
              import('./inventory/pages/material-list/material-list.component').then((m) => m.MaterialListComponent),
            data: { titleKey: 'nav.materials' },
          },
          {
            path: 'materials/movements',
            loadComponent: () =>
              import('./inventory/pages/material-movements/material-movements.component').then(
                (m) => m.MaterialMovementsComponent,
              ),
            data: { titleKey: 'movements.title' },
          },
          {
            path: 'workers',
            loadComponent: () =>
              import('./workforce/pages/worker-list/worker-list.component').then((m) => m.WorkerListComponent),
            data: { titleKey: 'nav.workers' },
          },
          {
            path: 'attendance',
            loadComponent: () =>
              import('./workforce/pages/attendance-list/attendance-list.component').then(
                (m) => m.AttendanceListComponent,
              ),
            data: { titleKey: 'nav.attendance' },
          },
          {
            path: 'tasks',
            loadComponent: () =>
              import('./workforce/pages/task-list/task-list.component').then((m) => m.TaskListComponent),
            data: { titleKey: 'nav.tasks' },
          },
          {
            path: 'incidents',
            loadComponent: () =>
              import('./incidents/pages/incident-list/incident-list.component').then((m) => m.IncidentListComponent),
            data: { titleKey: 'nav.incidents' },
          },
          {
            path: 'machinery',
            loadComponent: () =>
              import('./inventory/pages/machinery-list/machinery-list.component').then((m) => m.MachineryListComponent),
            data: { titleKey: 'nav.machinery' },
          },
          {
            path: 'reports',
            loadComponent: () =>
              import('./reports/pages/weekly-report/weekly-report.component').then((m) => m.WeeklyReportComponent),
            data: { titleKey: 'reports.title' },
          },
        ],
      },
      {
        path: 'profile',
        loadComponent: () => import('./profile/pages/profile/profile.component').then((m) => m.ProfileComponent),
        data: { titleKey: 'nav.profile' },
      },
      {
        path: 'unauthorized',
        loadComponent: () =>
          import('./iam/pages/unauthorized/unauthorized.component').then((m) => m.UnauthorizedComponent),
        data: { titleKey: 'unauthorized.title' },
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/presentation/pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
    data: { titleKey: 'notFound.title' },
  },
];
