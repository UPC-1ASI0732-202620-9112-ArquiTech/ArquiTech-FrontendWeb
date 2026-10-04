import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from '../../shared/infrastructure/base-api.service';
import { Attendance, AttendanceResource } from '../model/attendance.entity';
@Injectable({ providedIn: 'root' })
export class AttendanceService extends BaseApiService<AttendanceResource, Attendance> {
  protected readonly resourcePath = '/attendance';
  protected toEntity(resource: AttendanceResource): Attendance {
    return new Attendance(resource);
  }
  getByProject(projectId: number, date?: string): Observable<Attendance[]> {
    return this.getAll(date ? { projectId, date } : { projectId });
  }
}
