export type TrainingSessionType = 'training' | 'gym' | 'recovery';

export interface TrainingLog {
  id: string | number;
  userId: string;
  date: string;
  sessionType: TrainingSessionType;
  // Training-specific
  kickingBefore?: boolean;
  kickingAfter?: boolean;
  beforeDuration?: number;
  afterDuration?: number;
  // Gym-specific
  gymDuration?: number;
  gymFocus?: string;
  // Recovery-specific
  recoveryDuration?: number;
  recoveryType?: string;
  // Shared
  comments?: string;
  cloudId?: string;
}
