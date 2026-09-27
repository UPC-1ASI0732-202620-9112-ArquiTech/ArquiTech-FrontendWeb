import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from '../../shared/infrastructure/base-api.service';
import { Machinery, MachineryResource } from '../model/machinery.entity';

/** Client for `/api/v1/machinery` (HU05, HU30, HU31, HU41, HU48). */
@Injectable({ providedIn: 'root' })
export class MachineryService extends BaseApiService<MachineryResource, Machinery> {
  protected readonly resourcePath = '/machinery';

  protected toEntity(resource: MachineryResource): Machinery {
    return new Machinery(resource);
  }

  /** The filter is also applied client-side in case the API ignores `projectId`. */
  getByProject(projectId: number): Observable<Machinery[]> {
    return this.getAll({ projectId }).pipe(map((items) => items.filter((item) => item.projectId === projectId)));
  }
}
