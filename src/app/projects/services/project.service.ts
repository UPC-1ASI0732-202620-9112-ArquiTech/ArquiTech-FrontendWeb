import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { SessionService } from '../../iam/services/session.service';
import { BaseApiService } from '../../shared/infrastructure/base-api.service';
import { CreateProjectRequest, Project, ProjectResource } from '../model/project.entity';

/** Client for `/api/v1/projects` (HU09, HU22, HU33 — TS09, TS13). */
@Injectable({ providedIn: 'root' })
export class ProjectService extends BaseApiService<ProjectResource, Project> {
  protected readonly resourcePath = '/projects';
  private readonly session = inject(SessionService);

  protected toEntity(resource: ProjectResource): Project {
    return new Project(resource);
  }

  /**
   * Projects of the signed-in user: supervised works for a Supervisor (HU22)
   * and contracted works for a Contractor (HU33).
   */
  getForCurrentUser(): Observable<Project[]> {
    const user = this.session.user();
    if (!user) {
      return of([]);
    }
    if (user.isSupervisor) {
      return this.http
        .get<ProjectResource[]>(this.resourceUrl(`/supervisor/${user.id}`))
        .pipe(map((resources) => resources.map((resource) => this.toEntity(resource))));
    }
    // The API does not expose a contractor endpoint yet (see docs/api-contract.md), so the list is filtered by contractorId.
    return this.getAll().pipe(map((projects) => projects.filter((project) => project.contractorId === user.id)));
  }

  register(request: CreateProjectRequest): Observable<Project> {
    return this.create(request);
  }
}
