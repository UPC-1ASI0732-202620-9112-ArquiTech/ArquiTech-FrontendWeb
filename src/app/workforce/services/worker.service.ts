import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from '../../shared/infrastructure/base-api.service';
import { Worker, WorkerResource } from '../model/worker.entity';

/** Client for `/api/v1/workers` (HU06, HU10, HU32, HU42, HU49). */
@Injectable({ providedIn: 'root' })
export class WorkerService extends BaseApiService<WorkerResource, Worker> {
  protected readonly resourcePath = '/workers';

  protected toEntity(resource: WorkerResource): Worker {
    return new Worker(resource);
  }

  getByProject(projectId: number): Observable<Worker[]> {
    return this.getAll({ projectId }).pipe(map((items) => items.filter((item) => item.projectId === projectId)));
  }
}
