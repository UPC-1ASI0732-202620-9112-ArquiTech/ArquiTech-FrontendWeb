import { HttpClient, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BaseResource {
  id: number;
}

/**
 * Generic REST client for an `/api/v1/<resource>` endpoint. Each bounded context
 * extends it and maps API resources to domain entities in `toEntity`, so data
 * access stays out of the components (report 5.1.3, Angular conventions).
 */
export abstract class BaseApiService<TResource extends BaseResource, TEntity> {
  protected readonly http = inject(HttpClient);
  protected abstract readonly resourcePath: string;

  protected abstract toEntity(resource: TResource): TEntity;

  protected resourceUrl(suffix = ''): string {
    return `${environment.apiBaseUrl}${this.resourcePath}${suffix}`;
  }

  getAll(params?: Record<string, string | number>): Observable<TEntity[]> {
    return this.http
      .get<TResource[]>(this.resourceUrl(), { params: params ? new HttpParams({ fromObject: params }) : undefined })
      .pipe(map((resources) => resources.map((resource) => this.toEntity(resource))));
  }

  getById(id: number): Observable<TEntity> {
    return this.http.get<TResource>(this.resourceUrl(`/${id}`)).pipe(map((resource) => this.toEntity(resource)));
  }

  create(body: Partial<TResource>): Observable<TEntity> {
    return this.http.post<TResource>(this.resourceUrl(), body).pipe(map((resource) => this.toEntity(resource)));
  }

  update(id: number, body: Partial<TResource>): Observable<TEntity> {
    return this.http.put<TResource>(this.resourceUrl(`/${id}`), body).pipe(map((resource) => this.toEntity(resource)));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(this.resourceUrl(`/${id}`));
  }
}
