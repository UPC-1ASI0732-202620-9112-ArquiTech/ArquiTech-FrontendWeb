import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MockDatabase } from './mock-database';
import { mockBackendInterceptor } from './mock-backend.interceptor';

const API = environment.apiBaseUrl;

describe('mockBackendInterceptor (REST contract /api/v1)', () => {
  let http: HttpClient;

  async function signIn(email: string, password: string): Promise<string> {
    const response = await firstValueFrom(
      http.post<{ token: string }>(`${API}/authentication/sign-in`, { email, password }),
    );
    return response.token;
  }

  async function status(request: Promise<unknown>): Promise<number> {
    try {
      await request;
      return 200;
    } catch (error) {
      return (error as HttpErrorResponse).status;
    }
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([mockBackendInterceptor]))],
    });
    TestBed.inject(MockDatabase).reset();
    http = TestBed.inject(HttpClient);
  });

  it('rejects protected requests without a token with 401 (TS20)', async () => {
    expect(await status(firstValueFrom(http.get(`${API}/workers`)))).toBe(401);
  });

  it('rejects invalid credentials (HU23 AC2)', async () => {
    expect(await status(signIn('supervisor@arquitech.demo', 'wrong'))).toBe(401);
  });

  it('forbids writes for the Contractor role with 403 (TS15)', async () => {
    const token = await signIn('contratante@arquitech.demo', 'Contratante2026!');
    const headers = { Authorization: `Bearer ${token}` };
    const request = firstValueFrom(
      http.post(
        `${API}/workers`,
        { projectId: 1, fullName: 'X', role: 'Y', hireDate: '2026-01-01', status: 'ACTIVE' },
        { headers },
      ),
    );
    expect(await status(request)).toBe(403);
  });

  it('rejects a usage above the stock and keeps the stock (HU02 AC2, TS03)', async () => {
    const token = await signIn('supervisor@arquitech.demo', 'Supervisor2026!');
    const headers = { Authorization: `Bearer ${token}` };
    const usage = firstValueFrom(
      http.post(`${API}/materials/3/use`, { quantity: 999, occurredAt: new Date().toISOString() }, { headers }),
    );
    try {
      await usage;
      fail('usage above stock must fail');
    } catch (error) {
      expect((error as HttpErrorResponse).error.code).toBe('INSUFFICIENT_STOCK');
    }
    const material = await firstValueFrom(http.get<{ stock: number }>(`${API}/materials/3`, { headers }));
    expect(material.stock).toBe(45);
  });

  it('returns 404 when deleting a missing record (AC2 of the delete stories)', async () => {
    const token = await signIn('supervisor@arquitech.demo', 'Supervisor2026!');
    const request = firstValueFrom(
      http.delete(`${API}/incidents/9999`, { headers: { Authorization: `Bearer ${token}` } }),
    );
    expect(await status(request)).toBe(404);
  });

  it('returns only the works of the signed-in contractor (HU33)', async () => {
    const token = await signIn('contratante@arquitech.demo', 'Contratante2026!');
    const projects = await firstValueFrom(
      http.get<{ contractorId: number }[]>(`${API}/projects`, { headers: { Authorization: `Bearer ${token}` } }),
    );
    expect(projects.length).toBe(2);
    expect(projects.every((project) => project.contractorId === 2)).toBeTrue();
  });
});
