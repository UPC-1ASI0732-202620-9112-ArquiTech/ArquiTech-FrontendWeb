import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from '../../shared/infrastructure/base-api.service';
import { Task, TaskResource } from '../model/task.entity';

/** Client for `/api/v1/tasks` (HU07, HU08, HU43, HU50, HU53). */
@Injectable({ providedIn: 'root' })
export class TaskService extends BaseApiService<TaskResource, Task> {
  protected readonly resourcePath = '/tasks';

  protected toEntity(resource: TaskResource): Task {
    return new Task(resource);
  }

  getByProject(projectId: number): Observable<Task[]> {
    return this.getAll({ projectId }).pipe(map((items) => items.filter((item) => item.projectId === projectId)));
  }
}
