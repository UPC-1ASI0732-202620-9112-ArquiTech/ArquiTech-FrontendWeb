export const EXPERIMENT_SCHEMA_VERSION = '1.0' as const;

export const EXPERIMENT_EVENT_NAMES = [
  'material_operation_started',
  'material_operation_completed',
  'material_operation_failed',
  'project_consultation_started',
  'project_consultation_loaded',
  'project_consultation_failed',
  'project_report_opened',
] as const;

export type ExperimentEventName = (typeof EXPERIMENT_EVENT_NAMES)[number];

export const EXPERIMENT_IDS = [
  'EC01',
  'EC02',
  'EC03',
  'EC04',
  'EC05',
  'EC06',
  'EC07',
  'EC08',
  'EC09',
  'EC10',
] as const;

export type TrackedExperimentId = (typeof EXPERIMENT_IDS)[number];

export const QUESTION_IDS = [
  'Q01',
  'Q02',
  'Q03',
  'Q04',
  'Q05',
  'Q06',
  'Q07',
  'Q08',
  'Q09',
  'Q10',
] as const;

export type TrackedQuestionId = (typeof QUESTION_IDS)[number];

export const METRIC_IDS = [
  'M01',
  'M02',
  'M03',
  'M04',
  'M05',
  'M06',
  'M07',
  'M08',
  'M09',
  'M10',
  'M11',
  'F01',
  'F02',
  'F03',
] as const;

export type TrackedMetricId = (typeof METRIC_IDS)[number];

export const EXPERIMENT_PLATFORMS = ['web', 'mobile', 'landing'] as const;
export type ExperimentPlatform = (typeof EXPERIMENT_PLATFORMS)[number];

export const EXPERIMENT_CONDITIONS = ['A', 'B', 'unknown'] as const;
export type ExperimentCondition = (typeof EXPERIMENT_CONDITIONS)[number];

export const EXPERIMENT_OUTCOMES = [
  'started',
  'completed',
  'loaded',
  'opened',
  'validation_failed',
  'api_failed',
] as const;
export type ExperimentOutcome = (typeof EXPERIMENT_OUTCOMES)[number];

export const EXPERIMENT_OPERATION_TYPES = ['ENTRY', 'USAGE'] as const;
export type ExperimentOperationType = (typeof EXPERIMENT_OPERATION_TYPES)[number];

export const EXPERIMENT_ERROR_CATEGORIES = [
  'validation',
  'insufficient_stock',
  'network',
  'unauthorized',
  'conflict',
  'not_found',
  'api_error',
  'unknown',
] as const;
export type ExperimentErrorCategory = (typeof EXPERIMENT_ERROR_CATEGORIES)[number];

export interface ExperimentTraceMetadata {
  readonly experiment_id: TrackedExperimentId;
  readonly question_id: TrackedQuestionId;
  readonly metric_ids: readonly TrackedMetricId[];
}

export const EXPERIMENT_TRACE_CATALOG: Readonly<Record<TrackedExperimentId, ExperimentTraceMetadata>> = {
  EC01: { experiment_id: 'EC01', question_id: 'Q01', metric_ids: ['M01', 'F01'] },
  EC02: { experiment_id: 'EC02', question_id: 'Q02', metric_ids: ['M02', 'F01'] },
  EC03: { experiment_id: 'EC03', question_id: 'Q03', metric_ids: ['M03', 'F01'] },
  EC04: { experiment_id: 'EC04', question_id: 'Q04', metric_ids: ['M04', 'F01'] },
  EC05: { experiment_id: 'EC05', question_id: 'Q05', metric_ids: ['M05', 'F01'] },
  EC06: { experiment_id: 'EC06', question_id: 'Q06', metric_ids: ['M06', 'M07', 'F02'] },
  EC07: { experiment_id: 'EC07', question_id: 'Q07', metric_ids: ['M08', 'F01'] },
  EC08: { experiment_id: 'EC08', question_id: 'Q08', metric_ids: ['M09', 'F01'] },
  EC09: { experiment_id: 'EC09', question_id: 'Q09', metric_ids: ['M10', 'F01'] },
  EC10: { experiment_id: 'EC10', question_id: 'Q10', metric_ids: ['M11', 'F03'] },
};

/**
 * Shared tracking event contract across Web (Angular/TypeScript) and Mobile (Flutter/Dart).
 * Records exclusively technical interaction telemetry without PII, entity IDs or free text.
 */
export interface ExperimentEvent {
  readonly schema_version: typeof EXPERIMENT_SCHEMA_VERSION;
  readonly event_name: ExperimentEventName;
  readonly experiment_id: TrackedExperimentId;
  readonly question_id: TrackedQuestionId;
  readonly metric_ids: readonly TrackedMetricId[];
  readonly platform: ExperimentPlatform;
  readonly condition: ExperimentCondition;
  readonly timestamp: string;
  readonly session_id: string;
  readonly attempt_id: string;
  readonly outcome: ExperimentOutcome;
  readonly duration_ms?: number;
  readonly operation_type?: ExperimentOperationType;
  readonly error_category?: ExperimentErrorCategory;
}

const ALLOWED_EVENT_KEYS = new Set<string>([
  'schema_version',
  'event_name',
  'experiment_id',
  'question_id',
  'metric_ids',
  'platform',
  'condition',
  'timestamp',
  'session_id',
  'attempt_id',
  'outcome',
  'duration_ms',
  'operation_type',
  'error_category',
]);

const FORBIDDEN_KEY_PATTERN =
  /^(user_?id|project_?id|material_?id|worker_?id|incident_?id|name|full_?name|user_?name|project_?name|material_?name|supplier|email|contact_?email|password|jwt|token|authorization|body|payload|note|notes|description|error_?message|message|raw_?error|company|budget|price|cost|outcome_?correct|help_?requested)$/i;

const SAFE_OPAQUE_ID_PATTERN = /^(sess|att)-[a-z0-9]{8,48}$/;
const ISO_UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/;
const EMAIL_VALUE_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const JWT_VALUE_PATTERN = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export interface ExperimentEventValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validateExperimentEvent(candidate: unknown): ExperimentEventValidationResult {
  const errors: string[] = [];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { valid: false, errors: ['Event must be a non-null object'] };
  }

  const record = candidate as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (FORBIDDEN_KEY_PATTERN.test(key) || !ALLOWED_EVENT_KEYS.has(key)) {
      errors.push(`Forbidden or unknown field: ${key}`);
    }
    const rawValue = record[key];
    if (typeof rawValue === 'string') {
      if (EMAIL_VALUE_PATTERN.test(rawValue) || JWT_VALUE_PATTERN.test(rawValue)) {
        errors.push(`Sensitive value pattern detected in field: ${key}`);
      }
    }
  }

  if (record['schema_version'] !== EXPERIMENT_SCHEMA_VERSION) {
    errors.push('Invalid schema_version');
  }

  const eventName = record['event_name'];
  if (typeof eventName !== 'string' || !EXPERIMENT_EVENT_NAMES.includes(eventName as ExperimentEventName)) {
    errors.push('Invalid event_name');
  }

  const experimentId = record['experiment_id'];
  if (typeof experimentId !== 'string' || !EXPERIMENT_IDS.includes(experimentId as TrackedExperimentId)) {
    errors.push('Invalid experiment_id');
  } else {
    const expectedMeta = EXPERIMENT_TRACE_CATALOG[experimentId as TrackedExperimentId];
    if (record['question_id'] !== expectedMeta.question_id) {
      errors.push('question_id does not match experiment_id');
    }
    const metricIds = record['metric_ids'];
    if (
      !Array.isArray(metricIds) ||
      metricIds.length !== expectedMeta.metric_ids.length ||
      metricIds.some((id, idx) => id !== expectedMeta.metric_ids[idx])
    ) {
      errors.push('metric_ids do not match experiment_id catalog');
    }
  }

  const platform = record['platform'];
  if (typeof platform !== 'string' || !EXPERIMENT_PLATFORMS.includes(platform as ExperimentPlatform)) {
    errors.push('Invalid platform');
  }

  const condition = record['condition'];
  if (typeof condition !== 'string' || !EXPERIMENT_CONDITIONS.includes(condition as ExperimentCondition)) {
    errors.push('Invalid condition');
  }

  const timestamp = record['timestamp'];
  if (
    typeof timestamp !== 'string' ||
    !ISO_UTC_TIMESTAMP_PATTERN.test(timestamp) ||
    Number.isNaN(Date.parse(timestamp))
  ) {
    errors.push('Invalid UTC ISO 8601 timestamp');
  }

  const sessionId = record['session_id'];
  if (typeof sessionId !== 'string' || !SAFE_OPAQUE_ID_PATTERN.test(sessionId) || !sessionId.startsWith('sess-')) {
    errors.push('Invalid session_id');
  }

  const attemptId = record['attempt_id'];
  if (typeof attemptId !== 'string' || !SAFE_OPAQUE_ID_PATTERN.test(attemptId) || !attemptId.startsWith('att-')) {
    errors.push('Invalid attempt_id');
  }

  const outcome = record['outcome'];
  if (typeof outcome !== 'string' || !EXPERIMENT_OUTCOMES.includes(outcome as ExperimentOutcome)) {
    errors.push('Invalid outcome');
  }

  const durationMs = record['duration_ms'];
  if (durationMs !== undefined) {
    if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs < 0) {
      errors.push('duration_ms must be a non-negative finite number');
    }
  }

  const operationType = record['operation_type'];
  if (operationType !== undefined) {
    if (
      typeof operationType !== 'string' ||
      !EXPERIMENT_OPERATION_TYPES.includes(operationType as ExperimentOperationType)
    ) {
      errors.push('Invalid operation_type');
    }
  }

  const errorCategory = record['error_category'];
  if (errorCategory !== undefined) {
    if (
      typeof errorCategory !== 'string' ||
      !EXPERIMENT_ERROR_CATEGORIES.includes(errorCategory as ExperimentErrorCategory)
    ) {
      errors.push('Invalid error_category');
    }
  }

  if (typeof eventName === 'string' && EXPERIMENT_EVENT_NAMES.includes(eventName as ExperimentEventName)) {
    const isMaterialEvent = eventName.startsWith('material_operation_');
    if (isMaterialEvent) {
      if (experimentId !== 'EC01') {
        errors.push('Material operation events must reference EC01');
      }
      if (operationType === undefined) {
        errors.push('Material operation events require operation_type');
      }
    } else {
      if (experimentId !== 'EC04') {
        errors.push('Project consultation events must reference EC04');
      }
      if (operationType !== undefined) {
        errors.push('operation_type is only allowed on material operation events');
      }
    }

    switch (eventName as ExperimentEventName) {
      case 'material_operation_started':
      case 'project_consultation_started':
        if (outcome !== 'started') errors.push(`${eventName} requires outcome="started"`);
        if (errorCategory !== undefined) errors.push(`${eventName} must not include error_category`);
        break;
      case 'material_operation_completed':
        if (outcome !== 'completed') errors.push('material_operation_completed requires outcome="completed"');
        if (durationMs === undefined) errors.push('material_operation_completed requires duration_ms');
        if (errorCategory !== undefined) errors.push('material_operation_completed must not include error_category');
        break;
      case 'material_operation_failed':
        if (outcome !== 'validation_failed' && outcome !== 'api_failed') {
          errors.push('material_operation_failed requires outcome="validation_failed" or "api_failed"');
        }
        if (durationMs === undefined) errors.push('material_operation_failed requires duration_ms');
        if (errorCategory === undefined) errors.push('material_operation_failed requires error_category');
        break;
      case 'project_consultation_loaded':
        if (outcome !== 'loaded') errors.push('project_consultation_loaded requires outcome="loaded"');
        if (durationMs === undefined) errors.push('project_consultation_loaded requires duration_ms');
        if (errorCategory !== undefined) errors.push('project_consultation_loaded must not include error_category');
        break;
      case 'project_consultation_failed':
        if (outcome !== 'api_failed') errors.push('project_consultation_failed requires outcome="api_failed"');
        if (durationMs === undefined) errors.push('project_consultation_failed requires duration_ms');
        if (errorCategory === undefined) errors.push('project_consultation_failed requires error_category');
        break;
      case 'project_report_opened':
        if (outcome !== 'opened') errors.push('project_report_opened requires outcome="opened"');
        if (errorCategory !== undefined) errors.push('project_report_opened must not include error_category');
        break;
    }
  }

  return { valid: errors.length === 0, errors };
}

export function serializeExperimentEvent(event: ExperimentEvent): string {
  const payload: Record<string, unknown> = {
    schema_version: event.schema_version,
    event_name: event.event_name,
    experiment_id: event.experiment_id,
    question_id: event.question_id,
    metric_ids: [...event.metric_ids],
    platform: event.platform,
    condition: event.condition,
    timestamp: event.timestamp,
    session_id: event.session_id,
    attempt_id: event.attempt_id,
    outcome: event.outcome,
  };
  if (event.duration_ms !== undefined) {
    payload['duration_ms'] = event.duration_ms;
  }
  if (event.operation_type !== undefined) {
    payload['operation_type'] = event.operation_type;
  }
  if (event.error_category !== undefined) {
    payload['error_category'] = event.error_category;
  }
  return JSON.stringify(payload);
}
