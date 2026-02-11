'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTeam } from '@/hooks/useTeam';
import { clubsByCounty } from '@/lib/clubData';
import {
  TeamInfo,
  CreateTeamModal,
  JoinTeamModal,
  AssignDrillModal,
  EditTeamModal,
  PlayerDataModal,
  CoachDrills,
  PlayerDrills,
} from '@/components/team';
import type { TeamMember, TeamDrill, DrillCompletion } from '@/types';

export default function TeamPage() {
  const team = useTeam();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{ userId: string; name: string; sharePractice: boolean; shareMatch: boolean } | null>(null);

  // Load team data on mount
  useEffect(() => {
    team.loadTeamData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load members and drills when team is available
  useEffect(() => {
    if (team.currentTeam) {
      team.loadTeamMembers();
      team.loadTeamDrills();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.currentTeam?.id]);

  // Coach: open player data modal
  const handleMemberClick = useCallback((member: TeamMember) => {
    setSelectedPlayer({
      userId: member.user_id,
      name: member.displayName,
      sharePractice: member.share_with_coach,
      shareMatch: member.share_match_data,
    });
    setPlayerModalOpen(true);
  }, []);

  // Player: start assigned drill (navigate to track page)
  const handleStartDrill = useCallback((drill: TeamDrill) => {
    // TODO: navigate to /track with drill pre-configured
    alert(`Starting drill: Scoring Arc - ${drill.settings.distance}m. Navigate to Track page to begin.`);
  }, []);

  // Get player-specific completions
  const myCompletions: DrillCompletion[] = team.drillCompletions.filter(
    (c) => c.user_id === team.currentMembership?.user_id
  );

  const playerCount = team.teamMembers.filter((m) => m.role === 'player').length;

  // -------------------------------------------------------------------------
  // No team state
  // -------------------------------------------------------------------------
  if (!team.currentTeam) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-primary">Team</h2>
        <div className="bg-surface rounded-2xl p-6 shadow-sm text-center space-y-4">
          <p className="text-sm text-text-muted">
            You&apos;re not part of a team yet. Join a team with an invite code, or create one.
          </p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setJoinModalOpen(true)}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
            >
              Join Team
            </button>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-primary border-2 border-primary hover:bg-primary/5 transition-colors"
            >
              Create Team
            </button>
          </div>
        </div>

        <CreateTeamModal
          open={createModalOpen}
          clubsByCounty={clubsByCounty}
          onCreateTeam={team.createTeam}
          onClose={() => setCreateModalOpen(false)}
        />
        <JoinTeamModal
          open={joinModalOpen}
          onLookup={team.lookupInviteCode}
          onJoin={team.joinTeam}
          onClose={() => setJoinModalOpen(false)}
        />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Has team
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-primary">Team</h2>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        {/* Left: Team info */}
        <TeamInfo
          team={team.currentTeam}
          membership={team.currentMembership!}
          members={team.teamMembers}
          isCoach={team.isCoach}
          onToggleSharePractice={team.toggleSharePractice}
          onToggleShareMatch={team.toggleShareMatch}
          onCopyInviteCode={team.copyInviteCode}
          onLeaveTeam={async () => { await team.leaveTeam(); alert('You have left the team'); }}
          onMemberClick={handleMemberClick}
          onEditTeam={() => setEditModalOpen(true)}
        />

        {/* Right: Drills */}
        <div className="bg-surface rounded-2xl p-4 shadow-sm">
          {team.isCoach ? (
            <CoachDrills
              drills={team.teamDrills}
              completions={team.drillCompletions}
              playerCount={playerCount}
              onDelete={async (id) => { await team.deleteDrill(id); }}
              onAssign={() => setAssignModalOpen(true)}
            />
          ) : (
            <PlayerDrills
              drills={team.teamDrills}
              myCompletions={myCompletions}
              onStartDrill={handleStartDrill}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <EditTeamModal
        open={editModalOpen}
        team={team.currentTeam}
        onSave={team.updateTeam}
        onClose={() => setEditModalOpen(false)}
      />

      <AssignDrillModal
        open={assignModalOpen}
        onAssign={team.assignDrill}
        onClose={() => setAssignModalOpen(false)}
      />

      {selectedPlayer && (
        <PlayerDataModal
          open={playerModalOpen}
          playerName={selectedPlayer.name}
          playerUserId={selectedPlayer.userId}
          sharePractice={selectedPlayer.sharePractice}
          shareMatch={selectedPlayer.shareMatch}
          onLoadData={team.loadPlayerData}
          onClose={() => { setPlayerModalOpen(false); setSelectedPlayer(null); }}
        />
      )}
    </div>
  );
}
