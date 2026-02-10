export type TeamRole = 'coach' | 'player';

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
