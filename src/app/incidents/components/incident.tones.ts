import { BadgeTone } from '../../shared/presentation/icons';
import { IncidentSeverity, IncidentStatus } from '../model/incident.entity';

export const INCIDENT_SEVERITY_TONE: Record<IncidentSeverity, BadgeTone> = {
  [IncidentSeverity.High]: 'danger',
  [IncidentSeverity.Medium]: 'info',
  [IncidentSeverity.Low]: 'neutral',
};

export const INCIDENT_STATUS_TONE: Record<IncidentStatus, BadgeTone> = {
  [IncidentStatus.Open]: 'warning',
  [IncidentStatus.InReview]: 'info',
  [IncidentStatus.Resolved]: 'success',
};
