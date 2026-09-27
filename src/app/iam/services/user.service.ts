import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from '../../shared/infrastructure/base-api.service';
import { User, UserResource, UserRole } from '../model/user.entity';

/** Client for `/api/v1/users` (TS33). */
@Injectable({ providedIn: 'root' })
export class UserService extends BaseApiService<UserResource, User> {
  protected readonly resourcePath = '/users';

  protected toEntity(resource: UserResource): User {
    return new User(resource);
  }

  /** Contractors that can be assigned as responsible of a project (HU09). */
  getContractors(): Observable<User[]> {
    return this.getAll().pipe(map((users) => users.filter((user) => user.hasRole(UserRole.Contractor))));
  }
}
