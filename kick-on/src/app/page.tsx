'use client';

import { useEffect } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useTeamStore } from '@/store/teamStore';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { SessionCarousel, AssignedDrills, QuickActions } from '@/components/dashboard';

export default function HomePage() {
  const sessions = useSessionStore((s) => s.sessions);
  const teamDrills = useTeamStore((s) => s.teamDrills);
  const drillCompletions = useTeamStore((s) => s.drillCompletions);
  const currentTeam = useTeamStore((s) => s.currentTeam);
  const { user } = useAuth();
  const team = useTeam();

  // Load team data on mount so assigned drills are available immediately
  useEffect(() => {
    team.loadTeamData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load drills once team data is available
  useEffect(() => {
    if (currentTeam) {
      team.loadTeamDrills();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTeam?.id]);

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-primary">Dashboard</h2>

      {/* Assigned drills from coach */}
      <AssignedDrills
        drills={teamDrills}
        completions={drillCompletions}
        currentTeam={currentTeam}
        currentUserId={user?.id}
      />

      {/* Recent sessions carousel with pitch */}
      <SessionCarousel sessions={sessions} />

      {/* Quick action buttons */}
      <QuickActions />
    </div>
  );
}
