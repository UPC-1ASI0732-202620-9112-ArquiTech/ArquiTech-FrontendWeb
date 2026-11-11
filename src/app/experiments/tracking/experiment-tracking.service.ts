import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  EXPERIMENT_SCHEMA_VERSION,
  EXPERIMENT_TRACE_CATALOG,
  ExperimentCondition,
  ExperimentErrorCategory,
  ExperimentEvent,
  ExperimentOperationType,
  serializeExperimentEvent,
  validateExperimentEvent,
} from './experiment-event.model';

export interface ExperimentEventSink {
  emit(event: ExperimentEvent): void;
}

export class NoopExperimentEventSink implements ExperimentEventSink {
  emit(_event: ExperimentEvent): void {
    // Intentionally empty when tracking is disabled.
  }
}

export class InMemoryExperimentEventSink implements ExperimentEventSink {
  private readonly buffer: ExperimentEvent[] = [];

  emit(event: ExperimentEvent): void {
    this.buffer.push(event);
  }

  events(): readonly ExperimentEvent[] {
    return [...this.buffer];
  }

  clear(): void {
    this.buffer.length = 0;
  }

  toJsonLines(): string {
    return this.buffer.map((event) => serializeExperimentEvent(event)).join('\n');
  }
}

export class ConsoleDebugExperimentEventSink implements ExperimentEventSink {
  constructor(private readonly logger: (line: string) => void = (line) => console.debug('[experiment-tracking]', line)) {}

  emit(event: ExperimentEvent): void {
    this.logger(serializeExperimentEvent(event));
  }
}

export interface ExperimentTrackingOptions {
  readonly enabled?: boolean;
  readonly sink?: ExperimentEventSink;
  readonly debugSink?: ExperimentEventSink | null;
  readonly monotonicNow?: () => number;
  readonly utcTimestamp?: () => string;
}

export const EXPERIMENT_TRACKING_OPTIONS = new InjectionToken<ExperimentTrackingOptions>(
  'EXPERIMENT_TRACKING_OPTIONS',
);

export interface MaterialOperationAttemptHandle {
  readonly attemptId: string;
  complete(): void;
  failValidation(errorCategory?: 'validation' | 'insufficient_stock'): void;
  failApi(errorCategory?: ExperimentErrorCategory): void;
}

export interface ProjectConsultationAttemptHandle {
  readonly attemptId: string;
  readonly condition: ExperimentCondition;
  loaded(): void;
  failApi(errorCategory?: ExperimentErrorCategory): void;
  openReport(): void;
  openReportWhenLoaded(): void;
}

function generateOpaqueToken(prefix: 'sess' | 'att'): string {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index++) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${prefix}-${hex}`;
}

function defaultMonotonicNow(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

export function classifyExperimentError(error: unknown): ExperimentErrorCategory {
  if (error instanceof HttpErrorResponse) {
    const code = typeof error.error?.code === 'string' ? error.error.code : '';
    if (code === 'INSUFFICIENT_STOCK') {
      return 'insufficient_stock';
    }
    if (code === 'VALIDATION_ERROR') {
      return 'validation';
    }
    if (code === 'FORBIDDEN') {
      return 'unauthorized';
    }
    if (code === 'NOT_FOUND' || code === 'PROJECT_NOT_FOUND' || code === 'WORKER_NOT_FOUND') {
      return 'not_found';
    }
    switch (error.status) {
      case 0:
        return 'network';
      case 400:
      case 422:
        return 'validation';
      case 401:
      case 403:
        return 'unauthorized';
      case 404:
        return 'not_found';
      case 409:
        return 'conflict';
      default:
        return 'api_error';
    }
  }
  return 'api_error';
}

/**
 * Ephemeral, non-persistent tracking service for EC01 and EC04 experimental flows.
 * Disabled by default in production (`environment.production === true`).
 */
@Injectable({ providedIn: 'root' })
export class ExperimentTrackingService {
  private readonly injectedOptions = inject(EXPERIMENT_TRACKING_OPTIONS, { optional: true });
  private readonly memorySink = new InMemoryExperimentEventSink();
  private readonly noopSink = new NoopExperimentEventSink();
  private enabled = this.injectedOptions?.enabled ?? (!environment.production && environment.useMockApi);
  private customSink: ExperimentEventSink | null = this.injectedOptions?.sink ?? null;
  private debugSink: ExperimentEventSink | null = this.injectedOptions?.debugSink ?? null;
  private readonly monotonicNow = this.injectedOptions?.monotonicNow ?? defaultMonotonicNow;
  private readonly utcTimestamp = this.injectedOptions?.utcTimestamp ?? (() => new Date().toISOString());

  readonly sessionId: string = generateOpaqueToken('sess');

  private readonly pendingConsultations = new Map<ExperimentCondition, ProjectConsultationAttemptHandle>();
  private readonly latestConsultations = new Map<
    ExperimentCondition,
    { attemptId: string; startedAtMs: number; reportOpened: boolean }
  >();
  private suppressNextConditionAutoLoad = false;

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setSink(sink: ExperimentEventSink | null): void {
    this.customSink = sink;
  }

  setDebugSink(sink: ExperimentEventSink | null): void {
    this.debugSink = sink;
  }

  events(): readonly ExperimentEvent[] {
    return this.memorySink.events();
  }

  clear(): void {
    this.memorySink.clear();
    this.pendingConsultations.clear();
    this.latestConsultations.clear();
    this.suppressNextConditionAutoLoad = false;
  }

  toJsonLines(): string {
    return this.memorySink.toJsonLines();
  }

  startMaterialOperation(params: {
    condition: ExperimentCondition;
    operationType: ExperimentOperationType;
  }): MaterialOperationAttemptHandle {
    const attemptId = generateOpaqueToken('att');
    const startedAtMs = this.safeNowMs();
    let finalized = false;
    const trace = EXPERIMENT_TRACE_CATALOG.EC01;

    this.emitValidated({
      schema_version: EXPERIMENT_SCHEMA_VERSION,
      event_name: 'material_operation_started',
      experiment_id: trace.experiment_id,
      question_id: trace.question_id,
      metric_ids: [...trace.metric_ids],
      platform: 'web',
      condition: params.condition,
      timestamp: this.safeUtcTimestamp(),
      session_id: this.sessionId,
      attempt_id: attemptId,
      outcome: 'started',
      operation_type: params.operationType,
    });

    return {
      attemptId,
      complete: () => {
        if (finalized) {
          return;
        }
        finalized = true;
        this.emitValidated({
          schema_version: EXPERIMENT_SCHEMA_VERSION,
          event_name: 'material_operation_completed',
          experiment_id: trace.experiment_id,
          question_id: trace.question_id,
          metric_ids: [...trace.metric_ids],
          platform: 'web',
          condition: params.condition,
          timestamp: this.safeUtcTimestamp(),
          session_id: this.sessionId,
          attempt_id: attemptId,
          outcome: 'completed',
          duration_ms: this.elapsedMs(startedAtMs),
          operation_type: params.operationType,
        });
      },
      failValidation: (errorCategory = 'validation') => {
        if (finalized) {
          return;
        }
        finalized = true;
        this.emitValidated({
          schema_version: EXPERIMENT_SCHEMA_VERSION,
          event_name: 'material_operation_failed',
          experiment_id: trace.experiment_id,
          question_id: trace.question_id,
          metric_ids: [...trace.metric_ids],
          platform: 'web',
          condition: params.condition,
          timestamp: this.safeUtcTimestamp(),
          session_id: this.sessionId,
          attempt_id: attemptId,
          outcome: 'validation_failed',
          duration_ms: this.elapsedMs(startedAtMs),
          operation_type: params.operationType,
          error_category: errorCategory,
        });
      },
      failApi: (errorCategory = 'api_error') => {
        if (finalized) {
          return;
        }
        finalized = true;
        this.emitValidated({
          schema_version: EXPERIMENT_SCHEMA_VERSION,
          event_name: 'material_operation_failed',
          experiment_id: trace.experiment_id,
          question_id: trace.question_id,
          metric_ids: [...trace.metric_ids],
          platform: 'web',
          condition: params.condition,
          timestamp: this.safeUtcTimestamp(),
          session_id: this.sessionId,
          attempt_id: attemptId,
          outcome: 'api_failed',
          duration_ms: this.elapsedMs(startedAtMs),
          operation_type: params.operationType,
          error_category: errorCategory,
        });
      },
    };
  }

  startProjectConsultation(params: { condition: ExperimentCondition }): ProjectConsultationAttemptHandle {
    const attemptId = generateOpaqueToken('att');
    const startedAtMs = this.safeNowMs();
    let loadFinalized = false;
    let loadSucceeded = false;
    let reportOpened = false;
    let openReportAfterLoad = false;
    const trace = EXPERIMENT_TRACE_CATALOG.EC04;

    this.emitValidated({
      schema_version: EXPERIMENT_SCHEMA_VERSION,
      event_name: 'project_consultation_started',
      experiment_id: trace.experiment_id,
      question_id: trace.question_id,
      metric_ids: [...trace.metric_ids],
      platform: 'web',
      condition: params.condition,
      timestamp: this.safeUtcTimestamp(),
      session_id: this.sessionId,
      attempt_id: attemptId,
      outcome: 'started',
    });

    this.latestConsultations.set(params.condition, {
      attemptId,
      startedAtMs,
      reportOpened: false,
    });

    const handle: ProjectConsultationAttemptHandle = {
      attemptId,
      condition: params.condition,
      loaded: () => {
        if (loadFinalized) {
          return;
        }
        loadFinalized = true;
        loadSucceeded = true;
        if (this.pendingConsultations.get(params.condition)?.attemptId === attemptId) {
          this.pendingConsultations.delete(params.condition);
        }
        this.emitValidated({
          schema_version: EXPERIMENT_SCHEMA_VERSION,
          event_name: 'project_consultation_loaded',
          experiment_id: trace.experiment_id,
          question_id: trace.question_id,
          metric_ids: [...trace.metric_ids],
          platform: 'web',
          condition: params.condition,
          timestamp: this.safeUtcTimestamp(),
          session_id: this.sessionId,
          attempt_id: attemptId,
          outcome: 'loaded',
          duration_ms: this.elapsedMs(startedAtMs),
        });
        if (openReportAfterLoad) {
          handle.openReport();
        }
      },
      failApi: (errorCategory = 'api_error') => {
        if (loadFinalized) {
          return;
        }
        loadFinalized = true;
        openReportAfterLoad = false;
        if (this.pendingConsultations.get(params.condition)?.attemptId === attemptId) {
          this.pendingConsultations.delete(params.condition);
        }
        this.emitValidated({
          schema_version: EXPERIMENT_SCHEMA_VERSION,
          event_name: 'project_consultation_failed',
          experiment_id: trace.experiment_id,
          question_id: trace.question_id,
          metric_ids: [...trace.metric_ids],
          platform: 'web',
          condition: params.condition,
          timestamp: this.safeUtcTimestamp(),
          session_id: this.sessionId,
          attempt_id: attemptId,
          outcome: 'api_failed',
          duration_ms: this.elapsedMs(startedAtMs),
          error_category: errorCategory,
        });
      },
      openReport: () => {
        if (reportOpened) {
          return;
        }
        reportOpened = true;
        const latest = this.latestConsultations.get(params.condition);
        if (latest && latest.attemptId === attemptId) {
          latest.reportOpened = true;
        }
        this.emitValidated({
          schema_version: EXPERIMENT_SCHEMA_VERSION,
          event_name: 'project_report_opened',
          experiment_id: trace.experiment_id,
          question_id: trace.question_id,
          metric_ids: [...trace.metric_ids],
          platform: 'web',
          condition: params.condition,
          timestamp: this.safeUtcTimestamp(),
          session_id: this.sessionId,
          attempt_id: attemptId,
          outcome: 'opened',
          duration_ms: this.elapsedMs(startedAtMs),
        });
      },
      openReportWhenLoaded: () => {
        if (loadSucceeded) {
          handle.openReport();
        } else if (!loadFinalized) {
          openReportAfterLoad = true;
        }
      },
    };

    this.pendingConsultations.set(params.condition, handle);
    return handle;
  }

  acquireProjectConsultation(params: {
    condition: ExperimentCondition;
    forceNew?: boolean;
  }): ProjectConsultationAttemptHandle {
    if (!params.forceNew) {
      const existing = this.pendingConsultations.get(params.condition);
      if (existing) {
        return existing;
      }
    }
    return this.startProjectConsultation({ condition: params.condition });
  }

  markConditionBReportNavigation(): void {
    this.suppressNextConditionAutoLoad = true;
  }

  consumeConditionBReportNavigation(): boolean {
    if (!this.suppressNextConditionAutoLoad) {
      return false;
    }
    this.suppressNextConditionAutoLoad = false;
    return true;
  }

  openProjectReportFromNavigation(params: { condition: ExperimentCondition }): void {
    const pending = this.pendingConsultations.get(params.condition);
    if (pending) {
      pending.openReportWhenLoaded();
      return;
    }
    const latest = this.latestConsultations.get(params.condition);
    if (latest) {
      this.recordProjectReportOpened(params);
      return;
    }
    this.acquireProjectConsultation({ condition: params.condition, forceNew: false }).openReportWhenLoaded();
  }

  recordProjectReportOpened(params: { condition: ExperimentCondition }): void {
    const pending = this.pendingConsultations.get(params.condition);
    if (pending) {
      pending.openReportWhenLoaded();
      return;
    }

    const latest = this.latestConsultations.get(params.condition);
    if (latest) {
      if (latest.reportOpened) {
        return;
      }
      latest.reportOpened = true;
      const trace = EXPERIMENT_TRACE_CATALOG.EC04;
      this.emitValidated({
        schema_version: EXPERIMENT_SCHEMA_VERSION,
        event_name: 'project_report_opened',
        experiment_id: trace.experiment_id,
        question_id: trace.question_id,
        metric_ids: [...trace.metric_ids],
        platform: 'web',
        condition: params.condition,
        timestamp: this.safeUtcTimestamp(),
        session_id: this.sessionId,
        attempt_id: latest.attemptId,
        outcome: 'opened',
        duration_ms: this.elapsedMs(latest.startedAtMs),
      });
      return;
    }

    const trace = EXPERIMENT_TRACE_CATALOG.EC04;
    const attemptId = generateOpaqueToken('att');
    this.latestConsultations.set(params.condition, {
      attemptId,
      startedAtMs: this.safeNowMs(),
      reportOpened: true,
    });
    this.emitValidated({
      schema_version: EXPERIMENT_SCHEMA_VERSION,
      event_name: 'project_report_opened',
      experiment_id: trace.experiment_id,
      question_id: trace.question_id,
      metric_ids: [...trace.metric_ids],
      platform: 'web',
      condition: params.condition,
      timestamp: this.safeUtcTimestamp(),
      session_id: this.sessionId,
      attempt_id: attemptId,
      outcome: 'opened',
      duration_ms: 0,
    });
  }

  emitValidated(event: ExperimentEvent): boolean {
    if (!this.enabled) {
      this.noopSink.emit(event);
      return false;
    }
    const validation = validateExperimentEvent(event);
    if (!validation.valid) {
      return false;
    }
    try {
      this.memorySink.emit(event);
    } catch {
      // Never propagate sink errors to application workflows.
    }
    if (this.customSink) {
      try {
        this.customSink.emit(event);
      } catch {
        // Sink failures must never interrupt business operations.
      }
    }
    if (this.debugSink) {
      try {
        this.debugSink.emit(event);
      } catch {
        // Debug sink failures are ignored.
      }
    }
    return true;
  }

  private safeNowMs(): number {
    try {
      const value = this.monotonicNow();
      return Number.isFinite(value) ? value : 0;
    } catch {
      return 0;
    }
  }

  private elapsedMs(startedAtMs: number): number {
    const diff = Math.round(this.safeNowMs() - startedAtMs);
    return Number.isFinite(diff) && diff >= 0 ? diff : 0;
  }

  private safeUtcTimestamp(): string {
    try {
      const raw = this.utcTimestamp();
      return typeof raw === 'string' && raw.endsWith('Z') ? raw : new Date().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
}
