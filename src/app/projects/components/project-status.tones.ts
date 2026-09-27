import { BadgeTone } from '../../shared/presentation/icons';
import { ProjectStatus } from '../model/project.entity';

export const PROJECT_STATUS_TONE: Record<ProjectStatus, BadgeTone> = {
  [ProjectStatus.Active]: 'success',
  [ProjectStatus.Pending]: 'warning',
  [ProjectStatus.Completed]: 'neutral',
  [ProjectStatus.Suspended]: 'danger',
};
