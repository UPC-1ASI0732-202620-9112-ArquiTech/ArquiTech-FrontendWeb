import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpParams,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, defer, delay, mergeMap, of, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AttendanceResource, AttendanceStatus } from '../../../workforce/model/attendance.entity';
import { validAttendanceTimes } from '../../../workforce/model/attendance-request';
import { IncidentResource } from '../../../incidents/model/incident.entity';
import { MachineryResource } from '../../../inventory/model/machinery.entity';
import { MaterialMovementResource } from '../../../inventory/model/material-movement.entity';
import { MaterialResource } from '../../../inventory/model/material.entity';
import { ProjectResource } from '../../../projects/model/project.entity';
import { TaskResource } from '../../../workforce/model/task.entity';
import { WorkerResource } from '../../../workforce/model/worker.entity';
import { RUC_PATTERN } from '../../utils/form-validators';
import { MockDatabase } from './mock-database';
import { createMockToken, verifyMockToken } from './mock-jwt';
import { MockUserRecord } from './mock-seed';

/*
 * Mock of the ArquiTech REST API (report 5.2.6). It answers the same routes,
 * status codes and security rules as the Spring Boot backend:
 *  - 401 without a valid Bearer token (TS20),
 *  - 403 when a Contractor tries to write (TS15, HU27),
 *  - 400/404/409 for invalid data or missing resources (AC2 of each story).
 */

type MockResult = HttpResponse<unknown> | HttpErrorResponse;

interface MockContext {
  request: HttpRequest<unknown>;
  params: string[];
  query: HttpParams;
  user: MockUserRecord | null;
  db: MockDatabase;
}

interface MockRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  pattern: RegExp;
  isPublic?: boolean;
  handle: (context: MockContext) => MockResult;
}

function ok<T>(body: T, status = 200): HttpResponse<T> {
  return new HttpResponse({ status, body });
}

function fail(status: number, code: string, message: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, statusText: code, error: { code, message } });
}

function body<T>(context: MockContext): Partial<T> {
  return (context.request.body ?? {}) as Partial<T>;
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || String(value).trim() === '';
}

function isNonNegativeNumber(value: unknown): boolean {
  return value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
}

function isValidDate(value: unknown): boolean {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

function validationError(message: string): HttpErrorResponse {
  return fail(400, 'VALIDATION_ERROR', message);
}

function notFound(resource: string): HttpErrorResponse {
  return fail(404, 'NOT_FOUND', `${resource} not found`);
}

function forbidden(): HttpErrorResponse {
  return fail(403, 'FORBIDDEN', 'The authenticated role is not allowed to perform this operation');
}

function accessibleProjects(context: MockContext): ProjectResource[] {
  const user = context.user;
  if (!user) {
    return [];
  }
  return context.db.state.projects.filter((project) =>
    user.role === 'CONTRACTOR' ? project.contractorId === user.id : project.supervisorId === user.id,
  );
}

function withNames(context: MockContext, project: ProjectResource): ProjectResource {
  const users = context.db.state.users;
  return {
    ...project,
    contractorName: users.find((user) => user.id === project.contractorId)?.fullName ?? '',
    supervisorName: users.find((user) => user.id === project.supervisorId)?.fullName ?? '',
  };
}

/** Returns an error when the project does not exist or the user cannot access it. */
function checkProjectAccess(context: MockContext, projectId: number | undefined): HttpErrorResponse | null {
  const project = context.db.state.projects.find((candidate) => candidate.id === Number(projectId));
  if (!project) {
    return notFound('Project');
  }
  return accessibleProjects(context).some((candidate) => candidate.id === project.id) ? null : forbidden();
}

function isWriter(context: MockContext): boolean {
  return context.user?.role === 'SUPERVISOR';
}

function filterByAccessibleProject<T extends { projectId: number }>(context: MockContext, rows: T[]): T[] {
  const allowed = new Set(accessibleProjects(context).map((project) => project.id));
  const projectId = context.query.get('projectId');
  return rows.filter(
    (row) => allowed.has(row.projectId) && (projectId === null || row.projectId === Number(projectId)),
  );
}

/** Shared GET/PUT/DELETE by id for project-scoped collections. */
function findScoped<T extends { id: number; projectId: number }>(
  context: MockContext,
  rows: T[],
  resource: string,
): T | HttpErrorResponse {
  const row = rows.find((candidate) => candidate.id === Number(context.params[0]));
  if (!row) {
    return notFound(resource);
  }
  const accessError = checkProjectAccess(context, row.projectId);
  return accessError ?? row;
}

function removeById<T extends { id: number }>(rows: T[], id: number): void {
  const index = rows.findIndex((row) => row.id === id);
  if (index >= 0) {
    rows.splice(index, 1);
  }
}

// ---------- Validation (mirrors the backend rules) ----------

function validateMaterial(data: Partial<MaterialResource>, requireQuantity: boolean): string | null {
  if (isBlank(data.name)) return 'name is required';
  if (isBlank(data.unit)) return 'unit is required';
  if (!isNonNegativeNumber(data.unitPrice)) return 'unitPrice must be zero or greater';
  if (!isNonNegativeNumber(data.minimumStock)) return 'minimumStock must be zero or greater';
  if (requireQuantity && !isNonNegativeNumber(data.quantity)) return 'quantity must be zero or greater';
  if (!isBlank(data.providerRuc) && !RUC_PATTERN.test(String(data.providerRuc)))
    return 'providerRuc is not a valid RUC';
  return null;
}

function validateMachinery(data: Partial<MachineryResource>): string | null {
  if (isBlank(data.name)) return 'name is required';
  if (isBlank(data.serialNumber)) return 'serialNumber is required';
  if (!isValidDate(data.registeredAt)) return 'registeredAt must be a valid date';
  if (!['OPERATIONAL', 'MAINTENANCE', 'OUT_OF_SERVICE'].includes(String(data.status))) return 'status is invalid';
  return null;
}

function validateWorker(data: Partial<WorkerResource>): string | null {
  if (isBlank(data.fullName)) return 'fullName is required';
  if (isBlank(data.role)) return 'role is required';
  if (!isValidDate(data.hireDate)) return 'hireDate must be a valid date';
  if (!['ACTIVE', 'ON_LEAVE', 'INACTIVE'].includes(String(data.status))) return 'status is invalid';
  return null;
}

function validateTask(data: Partial<TaskResource>): string | null {
  if (isBlank(data.title)) return 'title is required';
  if (!isValidDate(data.dueDate)) return 'dueDate must be a valid date';
  if (!['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(String(data.status))) return 'status is invalid';
  return null;
}

function validateIncident(data: Partial<IncidentResource>): string | null {
  if (isBlank(data.type)) return 'type is required';
  if (isBlank(data.description)) return 'description is required';
  if (!['HIGH', 'MEDIUM', 'LOW'].includes(String(data.severity))) return 'severity is invalid';
  if (!['OPEN', 'IN_REVIEW', 'RESOLVED'].includes(String(data.status))) return 'status is invalid';
  if (!isValidDate(data.reportedAt)) return 'reportedAt must be a valid date';
  return null;
}

function workerInProject(context: MockContext, workerId: unknown, projectId: number): WorkerResource | undefined {
  return context.db.state.workers.find(
    (worker) => worker.id === Number(workerId) && worker.projectId === Number(projectId),
  );
}

function taskWithWorker(context: MockContext, task: TaskResource): TaskResource {
  return {
    ...task,
    workerName: context.db.state.workers.find((worker) => worker.id === task.workerId)?.fullName ?? '',
  };
}

function registerMovement(
  context: MockContext,
  material: MaterialResource,
  type: 'ENTRY' | 'USAGE',
  quantity: number,
  occurredAt: string,
  supplier = '',
  note = '',
): MaterialMovementResource {
  const movement: MaterialMovementResource = {
    id: context.db.nextId(),
    materialId: material.id,
    projectId: material.projectId,
    materialName: material.name,
    unit: material.unit,
    type,
    quantity,
    supplier,
    registeredByUserId: context.user!.id,
    registeredByName: context.user!.fullName,
    occurredAt,
    note,
  };
  context.db.state.movements.push(movement);
  return movement;
}

// ---------- Routes ----------

function validateAttendance(
  context: MockContext,
  data: Partial<AttendanceResource>,
  existing?: AttendanceResource,
): MockResult | AttendanceResource {
  const allowedFields = new Set([
    'workerId',
    'attendanceDate',
    'status',
    'checkInAt',
    'checkOutAt',
    'notes',
    ...(existing ? [] : ['projectId']),
  ]);
  if (Object.keys(context.request.body ?? {}).some((key) => !allowedFields.has(key)))
    return validationError('Unknown request fields');
  const accessError = checkProjectAccess(context, data.projectId);
  if (accessError) return accessError;
  const worker = context.db.state.workers.find((w) => w.id === Number(data.workerId));
  if (!worker) return fail(404, 'WORKER_NOT_FOUND', 'Worker not found');
  if (worker.projectId !== data.projectId || (worker.status === 'INACTIVE' && worker.id !== existing?.workerId))
    return validationError('Worker is not eligible');
  if (
    !data.attendanceDate ||
    !isValidDate(data.attendanceDate) ||
    new Date(data.attendanceDate).toISOString().slice(0, 10) !== data.attendanceDate ||
    data.attendanceDate < worker.hireDate
  )
    return validationError('Invalid attendance date');
  if (!data.status || !Object.values(AttendanceStatus).includes(data.status))
    return validationError('Invalid attendance status');
  if (!validAttendanceTimes(data.status, data.checkInAt ?? null, data.checkOutAt ?? null))
    return validationError('Invalid working times');
  if ((data.notes?.length ?? 0) > 1000) return validationError('Notes too long');
  if (
    context.db.state.attendance.some(
      (a) => a.workerId === worker.id && a.attendanceDate === data.attendanceDate && a.id !== existing?.id,
    )
  )
    return fail(409, 'DUPLICATE_ATTENDANCE', 'Attendance already exists');
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? context.db.nextId(),
    projectId: data.projectId!,
    workerId: worker.id,
    workerName: worker.fullName,
    attendanceDate: data.attendanceDate,
    status: data.status,
    checkInAt: data.checkInAt ? new Date(data.checkInAt).toISOString() : null,
    checkOutAt: data.checkOutAt ? new Date(data.checkOutAt).toISOString() : null,
    notes: data.notes?.trim() ?? null,
    registeredByUserId: existing?.registeredByUserId ?? context.user!.id,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}
const ROUTES: MockRoute[] = [
  {
    method: 'DELETE',
    pattern: new RegExp('^/projects/([0-9]+)$'),
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const id = Number(context.params[0]);
      const error = checkProjectAccess(context, id);
      if (error) return error;
      const state = context.db.state;
      state.attendance = state.attendance.filter((a) => a.projectId !== id);
      state.tasks = state.tasks.filter((a) => a.projectId !== id);
      state.workers = state.workers.filter((a) => a.projectId !== id);
      state.movements = state.movements.filter((a) => a.projectId !== id);
      state.materials = state.materials.filter((a) => a.projectId !== id);
      state.machinery = state.machinery.filter((a) => a.projectId !== id);
      state.incidents = state.incidents.filter((a) => a.projectId !== id);
      state.projects = state.projects.filter((a) => a.id !== id);
      context.db.save();
      return ok(null, 204);
    },
  },
  {
    method: 'GET',
    pattern: new RegExp('^/attendance$'),
    handle: (context) => {
      const id = Number(context.query.get('projectId'));
      const error = checkProjectAccess(context, id);
      if (error) return error;
      const date = context.query.get('date');
      return ok(
        context.db.state.attendance
          .filter((a) => a.projectId === id && (!date || a.attendanceDate === date))
          .map((a) => ({
            ...a,
            workerName: context.db.state.workers.find((w) => w.id === a.workerId)?.fullName ?? a.workerName,
          }))
          .sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate) || b.id - a.id),
      );
    },
  },
  {
    method: 'POST',
    pattern: new RegExp('^/attendance$'),
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const result = validateAttendance(context, body<AttendanceResource>(context));
      if (result instanceof HttpErrorResponse || result instanceof HttpResponse) return result;
      context.db.state.attendance.push(result);
      context.db.save();
      return ok(result, 201);
    },
  },
  {
    method: 'PUT',
    pattern: new RegExp('^/attendance/([0-9]+)$'),
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const row = findScoped(context, context.db.state.attendance, 'Attendance');
      if (row instanceof HttpErrorResponse) return row;
      const result = validateAttendance(
        context,
        { ...body<AttendanceResource>(context), projectId: row.projectId },
        row,
      );
      if (result instanceof HttpErrorResponse || result instanceof HttpResponse) return result;
      Object.assign(row, result);
      context.db.save();
      return ok(row);
    },
  },
  {
    method: 'DELETE',
    pattern: new RegExp('^/attendance/([0-9]+)$'),
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const row = findScoped(context, context.db.state.attendance, 'Attendance');
      if (row instanceof HttpErrorResponse) return row;
      removeById(context.db.state.attendance, row.id);
      context.db.save();
      return ok(null, 204);
    },
  },
  // Authentication (TS14, TS32)
  {
    method: 'POST',
    pattern: /^\/authentication\/sign-in$/,
    isPublic: true,
    handle: (context) => {
      const { email, password } = body<{ email: string; password: string }>(context);
      const user = context.db.state.users.find(
        (candidate) =>
          candidate.email.toLowerCase() ===
          String(email ?? '')
            .trim()
            .toLowerCase(),
      );
      if (!user || user.password !== password) {
        return fail(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }
      return ok({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        token: createMockToken(user.id, user.email, user.role),
      });
    },
  },
  {
    method: 'POST',
    pattern: /^\/authentication\/sign-up$/,
    isPublic: true,
    handle: (context) => {
      const data = body<MockUserRecord>(context);
      if (isBlank(data.email) || isBlank(data.password) || isBlank(data.fullName)) {
        return validationError('fullName, email and password are required');
      }
      if (context.db.state.users.some((user) => user.email.toLowerCase() === String(data.email).toLowerCase())) {
        return fail(409, 'VALIDATION_ERROR', 'email already registered');
      }
      const user: MockUserRecord = {
        id: context.db.nextId(),
        fullName: String(data.fullName),
        email: String(data.email),
        password: String(data.password),
        role: data.role === 'CONTRACTOR' ? 'CONTRACTOR' : 'SUPERVISOR',
        phone: '',
        createdAt: new Date().toISOString(),
      };
      context.db.state.users.push(user);
      context.db.save();
      return ok({ id: user.id, fullName: user.fullName, email: user.email, role: user.role }, 201);
    },
  },

  // Users (TS33)
  {
    method: 'GET',
    pattern: /^\/users$/,
    handle: (context) => ok(context.db.state.users.map(({ password: _password, ...user }) => user)),
  },
  {
    method: 'GET',
    pattern: /^\/users\/(\d+)$/,
    handle: (context) => {
      const user = context.db.state.users.find((candidate) => candidate.id === Number(context.params[0]));
      if (!user) {
        return notFound('User');
      }
      const { password: _password, ...resource } = user;
      return ok(resource);
    },
  },

  // Projects (TS09, TS13)
  {
    method: 'GET',
    pattern: /^\/projects$/,
    handle: (context) => ok(accessibleProjects(context).map((project) => withNames(context, project))),
  },
  {
    method: 'GET',
    pattern: /^\/projects\/supervisor\/(\d+)$/,
    handle: (context) => {
      const supervisorId = Number(context.params[0]);
      if (context.user?.role !== 'SUPERVISOR' || context.user.id !== supervisorId) {
        return forbidden();
      }
      return ok(
        context.db.state.projects
          .filter((project) => project.supervisorId === supervisorId)
          .map((project) => withNames(context, project)),
      );
    },
  },
  {
    method: 'GET',
    pattern: /^\/projects\/(\d+)$/,
    handle: (context) => {
      const accessError = checkProjectAccess(context, Number(context.params[0]));
      if (accessError) {
        return accessError;
      }
      return ok(
        withNames(
          context,
          context.db.state.projects.find((p) => p.id === Number(context.params[0]))!,
        ),
      );
    },
  },
  {
    method: 'POST',
    pattern: /^\/projects$/,
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const data = body<ProjectResource>(context);
      if (isBlank(data.name)) return validationError('name is required');
      if (isBlank(data.location)) return validationError('location is required');
      if (!isValidDate(data.startDate) || !isValidDate(data.endDate)) return validationError('dates are required');
      if (new Date(String(data.endDate)) < new Date(String(data.startDate))) {
        return validationError('endDate must be after startDate');
      }
      if (!isNonNegativeNumber(data.budget)) return validationError('budget must be zero or greater');
      const progress = Number(data.progress ?? 0);
      if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
        return validationError('progress must be between 0 and 100');
      }
      const contractor = context.db.state.users.find((user) => user.id === Number(data.contractorId));
      if (!contractor || contractor.role !== 'CONTRACTOR') {
        return fail(400, 'INVALID_CONTRACTOR', 'contractorId must reference a contractor');
      }
      const project: ProjectResource = {
        id: context.db.nextId(),
        name: String(data.name).trim(),
        location: String(data.location).trim(),
        startDate: String(data.startDate),
        endDate: String(data.endDate),
        budget: Number(data.budget),
        status: String(data.status ?? 'PENDING'),
        progress,
        supervisorId: context.user!.id,
        contractorId: contractor.id,
        createdAt: new Date().toISOString(),
      };
      context.db.state.projects.push(project);
      context.db.save();
      return ok(withNames(context, project), 201);
    },
  },

  // Materials (TS01–TS04, TS24, TS25, TS34)
  {
    method: 'GET',
    pattern: /^\/materials$/,
    handle: (context) => ok(filterByAccessibleProject(context, context.db.state.materials)),
  },
  {
    method: 'GET',
    pattern: /^\/materials\/project\/(\d+)$/,
    handle: (context) => {
      const projectId = Number(context.params[0]);
      const accessError = checkProjectAccess(context, projectId);
      return accessError ?? ok(context.db.state.materials.filter((material) => material.projectId === projectId));
    },
  },
  {
    method: 'GET',
    pattern: /^\/materials\/project\/(\d+)\/history$/,
    handle: (context) => {
      const projectId = Number(context.params[0]);
      const accessError = checkProjectAccess(context, projectId);
      return accessError ?? ok(context.db.state.movements.filter((movement) => movement.projectId === projectId));
    },
  },
  {
    method: 'GET',
    pattern: /^\/materials\/project\/(\d+)\/history\/(.+)$/,
    handle: (context) => {
      const projectId = Number(context.params[0]);
      const materialName = decodeURIComponent(context.params[1]).toLowerCase();
      const accessError = checkProjectAccess(context, projectId);
      return (
        accessError ??
        ok(
          context.db.state.movements.filter(
            (movement) => movement.projectId === projectId && movement.materialName.toLowerCase() === materialName,
          ),
        )
      );
    },
  },
  {
    method: 'GET',
    pattern: /^\/materials\/(\d+)\/low-inventory$/,
    handle: (context) => {
      const material = findScoped(context, context.db.state.materials, 'Material');
      if (material instanceof HttpErrorResponse) return material;
      return ok({
        materialId: material.id,
        lowInventory: material.minimumStock > 0 && material.stock < material.minimumStock,
      });
    },
  },
  {
    method: 'GET',
    pattern: /^\/materials\/(\d+)$/,
    handle: (context) => {
      const material = findScoped(context, context.db.state.materials, 'Material');
      return material instanceof HttpErrorResponse ? material : ok(material);
    },
  },
  {
    method: 'POST',
    pattern: /^\/materials$/,
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const data = body<MaterialResource>(context);
      const accessError = checkProjectAccess(context, data.projectId);
      if (accessError) return accessError;
      const error = validateMaterial(data, true);
      if (error) return validationError(error);
      const occurredAt = isValidDate(data.date) ? new Date(String(data.date)).toISOString() : new Date().toISOString();
      const material: MaterialResource = {
        id: context.db.nextId(),
        projectId: Number(data.projectId),
        name: String(data.name).trim(),
        unit: String(data.unit).trim(),
        quantity: Number(data.quantity),
        stock: Number(data.quantity),
        minimumStock: Number(data.minimumStock),
        unitPrice: Number(data.unitPrice),
        provider: String(data.provider ?? '').trim(),
        providerRuc: String(data.providerRuc ?? '').trim(),
        date: occurredAt.slice(0, 10),
      };
      context.db.state.materials.push(material);
      if (material.quantity > 0) {
        registerMovement(context, material, 'ENTRY', material.quantity, occurredAt, material.provider);
      }
      context.db.save();
      return ok(material, 201);
    },
  },
  {
    method: 'PUT',
    pattern: /^\/materials\/(\d+)$/,
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const material = findScoped(context, context.db.state.materials, 'Material');
      if (material instanceof HttpErrorResponse) return material;
      const data = { ...material, ...body<MaterialResource>(context) };
      const error = validateMaterial(data, false);
      if (error) return validationError(error);
      Object.assign(material, {
        name: String(data.name).trim(),
        unit: String(data.unit).trim(),
        minimumStock: Number(data.minimumStock),
        unitPrice: Number(data.unitPrice),
        provider: String(data.provider ?? '').trim(),
        providerRuc: String(data.providerRuc ?? '').trim(),
      });
      context.db.save();
      return ok(material);
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/materials\/(\d+)$/,
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const material = findScoped(context, context.db.state.materials, 'Material');
      if (material instanceof HttpErrorResponse) return material;
      removeById(context.db.state.materials, material.id);
      context.db.state.movements = context.db.state.movements.filter((movement) => movement.materialId !== material.id);
      context.db.save();
      return ok(null, 204);
    },
  },
  {
    method: 'POST',
    pattern: /^\/materials\/(\d+)\/entry$/,
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const material = findScoped(context, context.db.state.materials, 'Material');
      if (material instanceof HttpErrorResponse) return material;
      const data = body<{ quantity: number; supplier: string; occurredAt: string; note: string }>(context);
      const quantity = Number(data.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) return validationError('quantity must be greater than zero');
      if (!isValidDate(data.occurredAt)) return validationError('occurredAt must be a valid date');
      material.quantity += quantity;
      material.stock += quantity;
      material.date = String(data.occurredAt).slice(0, 10);
      const movement = registerMovement(
        context,
        material,
        'ENTRY',
        quantity,
        new Date(String(data.occurredAt)).toISOString(),
        String(data.supplier ?? material.provider),
        String(data.note ?? ''),
      );
      context.db.save();
      return ok(movement, 201);
    },
  },
  {
    method: 'POST',
    pattern: /^\/materials\/(\d+)\/use$/,
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const material = findScoped(context, context.db.state.materials, 'Material');
      if (material instanceof HttpErrorResponse) return material;
      const data = body<{ quantity: number; occurredAt: string; note: string }>(context);
      const quantity = Number(data.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) return validationError('quantity must be greater than zero');
      if (!isValidDate(data.occurredAt)) return validationError('occurredAt must be a valid date');
      // TS03: validate stock before modifying any data.
      if (quantity > material.stock) {
        return fail(400, 'INSUFFICIENT_STOCK', `Only ${material.stock} ${material.unit} available`);
      }
      material.stock -= quantity;
      material.date = String(data.occurredAt).slice(0, 10);
      const movement = registerMovement(
        context,
        material,
        'USAGE',
        quantity,
        new Date(String(data.occurredAt)).toISOString(),
        '',
        String(data.note ?? ''),
      );
      context.db.save();
      return ok(movement, 201);
    },
  },

  // Machinery (TS05, TS26, TS27, TS35)
  {
    method: 'GET',
    pattern: /^\/machinery$/,
    handle: (context) => ok(filterByAccessibleProject(context, context.db.state.machinery)),
  },
  {
    method: 'GET',
    pattern: /^\/machinery\/(\d+)$/,
    handle: (context) => {
      const machine = findScoped(context, context.db.state.machinery, 'Machinery');
      return machine instanceof HttpErrorResponse ? machine : ok(machine);
    },
  },
  {
    method: 'POST',
    pattern: /^\/machinery$/,
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const data = body<MachineryResource>(context);
      const accessError = checkProjectAccess(context, data.projectId);
      if (accessError) return accessError;
      const error = validateMachinery(data);
      if (error) return validationError(error);
      const serial = String(data.serialNumber).trim().toUpperCase();
      if (context.db.state.machinery.some((m) => m.projectId === Number(data.projectId) && m.serialNumber === serial)) {
        return fail(409, 'DUPLICATED_SERIAL_NUMBER', 'serialNumber already registered in this project');
      }
      const machine: MachineryResource = {
        id: context.db.nextId(),
        projectId: Number(data.projectId),
        name: String(data.name).trim(),
        serialNumber: serial,
        status: String(data.status),
        registeredAt: String(data.registeredAt),
        description: String(data.description ?? '').trim(),
      };
      context.db.state.machinery.push(machine);
      context.db.save();
      return ok(machine, 201);
    },
  },
  {
    method: 'PUT',
    pattern: /^\/machinery\/(\d+)$/,
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const machine = findScoped(context, context.db.state.machinery, 'Machinery');
      if (machine instanceof HttpErrorResponse) return machine;
      const data = { ...machine, ...body<MachineryResource>(context), projectId: machine.projectId };
      const error = validateMachinery(data);
      if (error) return validationError(error);
      const serial = String(data.serialNumber).trim().toUpperCase();
      if (
        context.db.state.machinery.some(
          (m) => m.id !== machine.id && m.projectId === machine.projectId && m.serialNumber === serial,
        )
      ) {
        return fail(409, 'DUPLICATED_SERIAL_NUMBER', 'serialNumber already registered in this project');
      }
      Object.assign(machine, {
        name: String(data.name).trim(),
        serialNumber: serial,
        status: String(data.status),
        registeredAt: String(data.registeredAt),
        description: String(data.description ?? '').trim(),
      });
      context.db.save();
      return ok(machine);
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/machinery\/(\d+)$/,
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const machine = findScoped(context, context.db.state.machinery, 'Machinery');
      if (machine instanceof HttpErrorResponse) return machine;
      removeById(context.db.state.machinery, machine.id);
      context.db.save();
      return ok(null, 204);
    },
  },

  // Workers (TS06, TS10, TS28, TS36)
  {
    method: 'GET',
    pattern: /^\/workers$/,
    handle: (context) => ok(filterByAccessibleProject(context, context.db.state.workers)),
  },
  {
    method: 'GET',
    pattern: /^\/workers\/(\d+)$/,
    handle: (context) => {
      const worker = findScoped(context, context.db.state.workers, 'Worker');
      return worker instanceof HttpErrorResponse ? worker : ok(worker);
    },
  },
  {
    method: 'POST',
    pattern: /^\/workers$/,
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const data = body<WorkerResource>(context);
      const accessError = checkProjectAccess(context, data.projectId);
      if (accessError) return accessError;
      const error = validateWorker(data);
      if (error) return validationError(error);
      const worker: WorkerResource = {
        id: context.db.nextId(),
        projectId: Number(data.projectId),
        fullName: String(data.fullName).trim(),
        role: String(data.role).trim(),
        specialty: String(data.specialty ?? '').trim(),
        hireDate: String(data.hireDate),
        status: String(data.status),
      };
      context.db.state.workers.push(worker);
      context.db.save();
      return ok(worker, 201);
    },
  },
  {
    method: 'PUT',
    pattern: /^\/workers\/(\d+)$/,
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const worker = findScoped(context, context.db.state.workers, 'Worker');
      if (worker instanceof HttpErrorResponse) return worker;
      const data = { ...worker, ...body<WorkerResource>(context) };
      const error = validateWorker(data);
      if (error) return validationError(error);
      Object.assign(worker, {
        fullName: String(data.fullName).trim(),
        role: String(data.role).trim(),
        specialty: String(data.specialty ?? '').trim(),
        hireDate: String(data.hireDate),
        status: String(data.status),
      });
      context.db.save();
      return ok(worker);
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/workers\/(\d+)$/,
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const worker = findScoped(context, context.db.state.workers, 'Worker');
      if (worker instanceof HttpErrorResponse) return worker;
      if (context.db.state.tasks.some((t) => t.workerId === worker.id))
        return fail(409, 'WORKER_HAS_TASKS', 'Worker has tasks');
      if (context.db.state.attendance.some((a) => a.workerId === worker.id))
        return fail(409, 'WORKER_HAS_ATTENDANCE', 'Worker has attendance');
      removeById(context.db.state.workers, worker.id);
      context.db.save();
      return ok(null, 204);
    },
  },

  // Tasks (TS07, TS08, TS29, TS37)
  {
    method: 'GET',
    pattern: /^\/tasks$/,
    handle: (context) =>
      ok(filterByAccessibleProject(context, context.db.state.tasks).map((task) => taskWithWorker(context, task))),
  },
  {
    method: 'POST',
    pattern: /^\/tasks$/,
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const data = body<TaskResource>(context);
      const accessError = checkProjectAccess(context, data.projectId);
      if (accessError) return accessError;
      const error = validateTask(data);
      if (error) return validationError(error);
      if (!workerInProject(context, data.workerId, Number(data.projectId))) {
        return fail(400, 'WORKER_NOT_FOUND', 'workerId must reference a worker of the project');
      }
      const now = new Date().toISOString();
      const task: TaskResource = {
        id: context.db.nextId(),
        projectId: Number(data.projectId),
        workerId: Number(data.workerId),
        title: String(data.title).trim(),
        description: String(data.description ?? '').trim(),
        status: String(data.status),
        dueDate: String(data.dueDate),
        createdAt: now,
        completedAt: data.status === 'COMPLETED' ? now : null,
      };
      context.db.state.tasks.push(task);
      context.db.save();
      return ok(taskWithWorker(context, task), 201);
    },
  },
  {
    method: 'PUT',
    pattern: /^\/tasks\/(\d+)$/,
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const task = findScoped(context, context.db.state.tasks, 'Task');
      if (task instanceof HttpErrorResponse) return task;
      const data = { ...task, ...body<TaskResource>(context) };
      const error = validateTask(data);
      if (error) return validationError(error);
      if (!workerInProject(context, data.workerId, task.projectId)) {
        return fail(400, 'WORKER_NOT_FOUND', 'workerId must reference a worker of the project');
      }
      const becameCompleted = data.status === 'COMPLETED' && task.status !== 'COMPLETED';
      Object.assign(task, {
        workerId: Number(data.workerId),
        title: String(data.title).trim(),
        description: String(data.description ?? '').trim(),
        status: String(data.status),
        dueDate: String(data.dueDate),
        completedAt:
          data.status === 'COMPLETED' ? (becameCompleted ? new Date().toISOString() : task.completedAt) : null,
      });
      context.db.save();
      return ok(taskWithWorker(context, task));
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/tasks\/(\d+)$/,
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const task = findScoped(context, context.db.state.tasks, 'Task');
      if (task instanceof HttpErrorResponse) return task;
      removeById(context.db.state.tasks, task.id);
      context.db.save();
      return ok(null, 204);
    },
  },

  // Incidents (TS11, TS30, TS31, TS38)
  {
    method: 'GET',
    pattern: /^\/incidents$/,
    handle: (context) => ok(filterByAccessibleProject(context, context.db.state.incidents)),
  },
  {
    method: 'GET',
    pattern: /^\/incidents\/project\/(\d+)$/,
    handle: (context) => {
      const projectId = Number(context.params[0]);
      const accessError = checkProjectAccess(context, projectId);
      return accessError ?? ok(context.db.state.incidents.filter((incident) => incident.projectId === projectId));
    },
  },
  {
    method: 'GET',
    pattern: /^\/incidents\/(\d+)$/,
    handle: (context) => {
      const incident = findScoped(context, context.db.state.incidents, 'Incident');
      return incident instanceof HttpErrorResponse ? incident : ok(incident);
    },
  },
  {
    method: 'POST',
    pattern: /^\/incidents$/,
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const data = body<IncidentResource>(context);
      const accessError = checkProjectAccess(context, data.projectId);
      if (accessError) return accessError;
      const error = validateIncident(data);
      if (error) return validationError(error);
      const incident: IncidentResource = {
        id: context.db.nextId(),
        projectId: Number(data.projectId),
        reportedByUserId: context.user!.id,
        type: String(data.type),
        description: String(data.description).trim(),
        severity: String(data.severity),
        status: String(data.status),
        reportedAt: new Date(String(data.reportedAt)).toISOString(),
        resolvedAt: data.status === 'RESOLVED' ? new Date().toISOString() : null,
      };
      context.db.state.incidents.push(incident);
      context.db.save();
      return ok(incident, 201);
    },
  },
  {
    method: 'PUT',
    pattern: /^\/incidents\/(\d+)$/,
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const incident = findScoped(context, context.db.state.incidents, 'Incident');
      if (incident instanceof HttpErrorResponse) return incident;
      const data = { ...incident, ...body<IncidentResource>(context) };
      const error = validateIncident(data);
      if (error) return validationError(error);
      const becameResolved = data.status === 'RESOLVED' && incident.status !== 'RESOLVED';
      Object.assign(incident, {
        type: String(data.type),
        description: String(data.description).trim(),
        severity: String(data.severity),
        status: String(data.status),
        reportedAt: new Date(String(data.reportedAt)).toISOString(),
        resolvedAt:
          data.status === 'RESOLVED' ? (becameResolved ? new Date().toISOString() : incident.resolvedAt) : null,
      });
      context.db.save();
      return ok(incident);
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/incidents\/(\d+)$/,
    handle: (context) => {
      if (!isWriter(context)) return forbidden();
      const incident = findScoped(context, context.db.state.incidents, 'Incident');
      if (incident instanceof HttpErrorResponse) return incident;
      removeById(context.db.state.incidents, incident.id);
      context.db.save();
      return ok(null, 204);
    },
  },
];

function resolve(request: HttpRequest<unknown>, db: MockDatabase): MockResult {
  const path = request.url.slice(environment.apiBaseUrl.length).split('?')[0];
  for (const route of ROUTES) {
    const match = route.method === request.method ? route.pattern.exec(path) : null;
    if (!match) {
      continue;
    }
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? null;
    const payload = verifyMockToken(token);
    const user = payload ? (db.state.users.find((candidate) => candidate.id === payload.sub) ?? null) : null;
    if (!route.isPublic && !user) {
      return fail(401, 'UNAUTHORIZED', 'A valid Bearer token is required');
    }
    return route.handle({ request, params: match.slice(1), query: request.params, user, db });
  }
  return fail(404, 'NOT_FOUND', `No mock route for ${request.method} ${path}`);
}

export const mockBackendInterceptor: HttpInterceptorFn = (request, next): Observable<HttpEvent<unknown>> => {
  if (!environment.useMockApi || !request.url.startsWith(environment.apiBaseUrl)) {
    return next(request);
  }
  const db = inject(MockDatabase);
  return defer(() => of(resolve(request, db))).pipe(
    delay(environment.mockLatencyMs),
    mergeMap((result) => (result instanceof HttpErrorResponse ? throwError(() => result) : of(result))),
  );
};
