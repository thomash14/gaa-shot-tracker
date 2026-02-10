'use client';

import { useSessionStore } from '@/store/sessionStore';
import { useTeamStore } from '@/store/teamStore';
import { SessionCarousel, AssignedDrills, QuickActions, WeekSummary } from '@/components/dashboard';

export default function HomePage() {
  const sessions = useSessionStore((s) => s.sessions);
  const teamDrills = useTeamStore((s) => s.teamDrills);

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-primary">Dashboard</h2>

      {/* Quick stats */}
      <WeekSummary sessions={sessions} />

      {/* Assigned drills from coach (hidden when empty) */}
      <AssignedDrills drills={teamDrills} />

      {/* Recent sessions carousel with pitch */}
      <SessionCarousel sessions={sessions} />

      {/* Quick action buttons */}
      <QuickActions />
    </div>
  );
}
