export type TeamRole = 'coach' | 'player';

export interface Team {
  id: string;
  name: string;
  county: string;
  club: string;
  ageGroup: string;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
}

export interface TeamMembership {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: string;
  sharePractice: boolean;
  shareMatch: boolean;
  team?: Team;
}

export interface TeamMember {
  id: string;
  userId: string;
  role: TeamRole;
  displayName: string;
  email?: string;
  club?: string;
  position?: string;
  sharePractice: boolean;
  shareMatch: boolean;
}
