'use client';

import type { Team, TeamMembership, TeamMember } from '@/types';

interface TeamInfoProps {
  team: Team;
  membership: TeamMembership;
  members: TeamMember[];
  isCoach: boolean;
  onToggleSharePractice: (v: boolean) => void;
  onToggleShareMatch: (v: boolean) => void;
  onCopyInviteCode: () => void;
  onLeaveTeam: () => void;
  onMemberClick?: (member: TeamMember) => void;
}

export default function TeamInfo({
  team,
  membership,
  members,
  isCoach,
  onToggleSharePractice,
  onToggleShareMatch,
  onCopyInviteCode,
  onLeaveTeam,
  onMemberClick,
}: TeamInfoProps) {
  const clubName = team.clubs?.name ?? 'Unknown Club';
  const details = `${team.age_group}${team.team_name ? ' \u00b7 ' + team.team_name : ''} \u00b7 ${team.season_year} Season`;

  return (
    <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
      {/* Team header */}
      <div className="bg-primary text-white p-4">
        <h3 className="text-lg font-bold">{clubName}</h3>
        <p className="text-sm opacity-80 mt-0.5">{details}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-semibold">
            {isCoach ? 'Coach' : 'Player'}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Invite code (coach only) */}
        {isCoach && (
          <div className="flex items-center gap-3 bg-grey-light rounded-xl p-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Invite Code</p>
              <p className="text-lg font-mono font-bold text-primary tracking-widest">{team.invite_code}</p>
            </div>
            <button
              onClick={onCopyInviteCode}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-dark transition-colors"
            >
              Copy
            </button>
          </div>
        )}

        {/* Sharing toggles (player only) */}
        {!isCoach && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-text-muted">Data Sharing</p>
            <label className="flex items-center justify-between gap-2 bg-grey-light rounded-lg px-3 py-2">
              <span className="text-sm text-text">Share practice data with coach</span>
              <input
                type="checkbox"
                checked={membership.share_with_coach}
                onChange={(e) => onToggleSharePractice(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
            </label>
            <label className="flex items-center justify-between gap-2 bg-grey-light rounded-lg px-3 py-2">
              <span className="text-sm text-text">Share match data with coach</span>
              <input
                type="checkbox"
                checked={membership.share_match_data}
                onChange={(e) => onToggleShareMatch(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
            </label>
          </div>
        )}

        {/* Team members */}
        <div>
          <p className="text-xs font-semibold text-text-muted mb-2">Team Members ({members.length})</p>
          <div className="space-y-1">
            {members.map((m) => {
              const isSharing = m.share_with_coach || m.share_match_data;
              const clickable = isCoach && m.role === 'player' && isSharing;
              return (
                <div
                  key={m.id}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg ${
                    clickable ? 'bg-grey-light hover:bg-grey cursor-pointer transition-colors' : 'bg-grey-light/50'
                  }`}
                  onClick={() => clickable && onMemberClick?.(m)}
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-text truncate block">{m.displayName}</span>
                    <span className={`text-[10px] font-semibold ${m.role === 'coach' ? 'text-primary' : 'text-text-muted'}`}>
                      {m.role === 'coach' ? 'Coach' : 'Player'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isCoach && m.role === 'player' && (
                      <>
                        {m.share_with_coach && (
                          <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">Practice</span>
                        )}
                        {m.share_match_data && (
                          <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-semibold">Match</span>
                        )}
                      </>
                    )}
                    {clickable && (
                      <span className="text-text-muted text-xs ml-1">&rsaquo;</span>
                    )}
                  </div>
                </div>
              );
            })}
            {members.length === 0 && (
              <p className="text-sm text-text-muted py-2">No team members yet</p>
            )}
          </div>
        </div>

        {/* Leave team */}
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to leave this team?')) {
              onLeaveTeam();
            }
          }}
          className="w-full py-2 rounded-lg text-xs font-semibold text-[#f44336] border border-[#f44336]/30 hover:bg-[#f44336]/5 transition-colors"
        >
          Leave Team
        </button>
      </div>
    </div>
  );
}
