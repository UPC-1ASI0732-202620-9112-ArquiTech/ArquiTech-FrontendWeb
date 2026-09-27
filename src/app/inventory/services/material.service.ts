import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from '../../shared/infrastructure/base-api.service';
import {
  MaterialEntryRequest,
  MaterialMovement,
  MaterialMovementResource,
  MaterialUsageRequest,
} from '../model/material-movement.entity';
import { CreateMaterialRequest, Material, MaterialResource, UpdateMaterialRequest } from '../model/material.entity';

/** Client for `/api/v1/materials` (EP01: HU01, HU02, HU04, HU28, HU29, HU40, HU47). */
@Injectable({ providedIn: 'root' })
export class MaterialService extends BaseApiService<MaterialResource, Material> {
  protected readonly resourcePath = '/materials';

  protected toEntity(resource: MaterialResource): Material {
    return new Material(resource);
  }

  getByProject(projectId: number): Observable<Material[]> {
    return this.http
      .get<MaterialResource[]>(this.resourceUrl(`/project/${projectId}`))
      .pipe(map((resources) => resources.map((resource) => this.toEntity(resource))));
  }

  register(request: CreateMaterialRequest): Observable<Material> {
    return this.create(request);
  }

  updateInformation(id: number, request: UpdateMaterialRequest): Observable<Material> {
    return this.update(id, request);
  }

  /** HU01 — registers an entry and increases the stock. */
  registerEntry(materialId: number, request: MaterialEntryRequest): Observable<MaterialMovement> {
    return this.http
      .post<MaterialMovementResource>(this.resourceUrl(`/${materialId}/entry`), request)
      .pipe(map((resource) => new MaterialMovement(resource)));
  }

  /** HU02 — registers usage; the API rejects quantities above the stock (TS03). */
  registerUsage(materialId: number, request: MaterialUsageRequest): Observable<MaterialMovement> {
    return this.http
      .post<MaterialMovementResource>(this.resourceUrl(`/${materialId}/use`), request)
      .pipe(map((resource) => new MaterialMovement(resource)));
  }

  /** HU04 — entries and usages of every material in the project. */
  getMovementsByProject(projectId: number): Observable<MaterialMovement[]> {
    return this.http
      .get<MaterialMovementResource[]>(this.resourceUrl(`/project/${projectId}/history`))
      .pipe(map((resources) => resources.map((resource) => new MaterialMovement(resource))));
  }
}
