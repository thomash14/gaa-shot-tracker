export type TeamRole = 'coach' | 'player';
export type TeamEventType = 'training' | 'match' | 'other';

export interface Club {
  id: string;
  name: string;
  county: string;
}

export interface Team {
  id: string;
  club_id: string;
  age_group: string;
  team_name: string | null;
  season_year: number;
  invite_code: string;
  created_by: string;
  clubs?: Club;
}

export interface TeamMembership {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  share_with_coach: boolean;
  share_match_data: boolean;
  teams?: Team;
}

export interface TeamMember {
  id: string;
  user_id: string;
  role: TeamRole;
  displayName: string;
  email?: string;
  share_with_coach: boolean;
  share_match_data: boolean;
}

export interface TeamEvent {
  id: string;
  team_id: string;
  created_by: string;
  title: string;
  event_type: TeamEventType;
  event_date: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  opponent: string | null;
  notes: string | null;
  created_at: string;
}
