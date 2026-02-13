'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSessionStore } from '@/store/sessionStore';
import { useTeamStore } from '@/store/teamStore';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { SessionCarousel, AssignedDrills, QuickActions, UpcomingEvents } from '@/components/dashboard';

export default function HomePage() {
  const sessions = useSessionStore((s) => s.sessions);
  const teamDrills = useTeamStore((s) => s.teamDrills);
  const drillCompletions = useTeamStore((s) => s.drillCompletions);
  const currentTeam = useTeamStore((s) => s.currentTeam);
  const currentMembership = useTeamStore((s) => s.currentMembership);
  const hasPlayerMembership = useTeamStore((s) => s.hasPlayerMembership);
  const teamDataLoaded = useTeamStore((s) => s.teamDataLoaded);
  const teamMembers = useTeamStore((s) => s.teamMembers);
  const teamEvents = useTeamStore((s) => s.teamEvents);
  const { user } = useAuth();
  const team = useTeam();

  // Coach-only: no player membership on any team
  const isCoachOnly = currentMembership?.role === 'coach' && !hasPlayerMembership;

  // Load team data on mount so assigned drills are available immediately
  useEffect(() => {
    team.loadTeamData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load drills, events (and members for coaches) once team data is available
  useEffect(() => {
    if (currentTeam) {
      team.loadTeamDrills();
      team.loadTeamEvents();
      if (isCoachOnly) {
        team.loadTeamMembers();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTeam?.id, isCoachOnly]);

  // Show loading until we know the user's role (prevents flash of wrong dashboard)
  if (!teamDataLoaded) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-40 bg-grey-light rounded-lg animate-pulse" />
        <div className="bg-surface rounded-2xl shadow-card p-5 space-y-3">
          <div className="h-5 w-48 bg-grey-light rounded animate-pulse" />
          <div className="h-4 w-32 bg-grey-light rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // Coach-only view: show coach dashboard instead of player content
  if (isCoachOnly) {
    const playerCount = teamMembers.filter((m) => m.role === 'player').length;
    return (
      <div className="space-y-5">
        <h2 className="text-2xl font-bold text-primary dark:text-text">Coach Dashboard</h2>
        <div className="bg-surface rounded-2xl shadow-card p-5 space-y-3">
          {currentTeam ? (
            <>
              <h3 className="font-semibold text-lg">{currentTeam.team_name || currentTeam.age_group}</h3>
              <p className="text-sm text-text-muted">{playerCount} player{playerCount !== 1 ? 's' : ''} on the team</p>
              <Link
                href="/team"
                className="inline-block mt-1 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
              >
                Manage Team
              </Link>
            </>
          ) : (
            <p className="text-sm text-text-muted">No team set up yet. Head to the Team page to create or join one.</p>
          )}
        </div>

        <UpcomingEvents events={teamEvents} />
      </div>
    );
  }

  // Player / coach+player view: normal dashboard
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-primary dark:text-text">Dashboard</h2>

      {/* Assigned drills from coach */}
      <AssignedDrills
        drills={teamDrills}
        completions={drillCompletions}
        currentTeam={currentTeam}
        currentUserId={user?.id}
      />

      {/* Upcoming team events */}
      <UpcomingEvents events={teamEvents} />

      {/* Recent sessions carousel with pitch */}
      <SessionCarousel sessions={sessions} />

      {/* Quick action buttons */}
      <QuickActions />
    </div>
  );
}
