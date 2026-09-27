import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';
import { ProjectContextService } from '../services/project-context.service';
import { ProjectService } from '../services/project.service';

/**
 * A user can only open the works they supervise or contracted (HU27, TS21).
 * The guard also sets the current project for the layout.
 */
export const projectAccessGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const context = inject(ProjectContextService);
  const toast = inject(ToastService);
  const projectId = Number(route.paramMap.get('projectId'));

  return inject(ProjectService)
    .getForCurrentUser()
    .pipe(
      map((projects) => {
        const project = projects.find((candidate) => candidate.id === projectId);
        if (!project) {
          return router.createUrlTree(['/unauthorized']);
        }
        context.select(project);
        return true;
      }),
      catchError(() => {
        toast.error('errors.network');
        return of(router.createUrlTree(['/projects']));
      }),
    );
};
