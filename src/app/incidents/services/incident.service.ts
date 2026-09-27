import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from '../../shared/infrastructure/base-api.service';
import { Incident, IncidentResource } from '../model/incident.entity';

/** Client for `/api/v1/incidents` (HU35, HU36, HU37, HU39, HU51). */
@Injectable({ providedIn: 'root' })
export class IncidentService extends BaseApiService<IncidentResource, Incident> {
  protected readonly resourcePath = '/incidents';

  protected toEntity(resource: IncidentResource): Incident {
    return new Incident(resource);
  }

  getByProject(projectId: number): Observable<Incident[]> {
    return this.http
      .get<IncidentResource[]>(this.resourceUrl(`/project/${projectId}`))
      .pipe(map((resources) => resources.map((resource) => this.toEntity(resource))));
  }
}
