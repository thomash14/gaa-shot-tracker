'use client';

import type { Session } from '@/types';

/**
 * Quick stats summary cards for the dashboard.
 * Shows sessions this week, total shots, and overall conversion rate.
 */

interface WeekSummaryProps {
  sessions: Session[];
}

export default function WeekSummary({ sessions }: WeekSummaryProps) {
  // Compute aggregate stats
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday start
  startOfWeek.setHours(0, 0, 0, 0);

  let sessionsThisWeek = 0;
  let totalShots = 0;
  let totalScored = 0;

  sessions.forEach((session) => {
    const shots = session.shots ?? [];

    // Check if session is from this week
    const dateParts = session.date.split('-');
    const sessionDate = new Date(
      parseInt(dateParts[0]),
      parseInt(dateParts[1]) - 1,
      parseInt(dateParts[2]),
      12, 0, 0, 0
    );
    if (sessionDate >= startOfWeek) {
      sessionsThisWeek++;
    }

    shots.forEach((shot) => {
      totalShots++;
      if (shot.result === 'scored') totalScored++;
    });
  });

  const conversionRate = totalShots > 0 ? Math.round((totalScored / totalShots) * 100) : 0;

  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard
        label="This Week"
        value={String(sessionsThisWeek)}
        sub={sessionsThisWeek === 1 ? 'session' : 'sessions'}
      />
      <StatCard
        label="Total Shots"
        value={String(totalShots)}
        sub={`${totalScored} scored`}
      />
      <StatCard
        label="Conversion"
        value={`${conversionRate}%`}
        sub={`${totalScored}/${totalShots}`}
      />
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-surface rounded-xl p-4 shadow-sm text-center">
      <p className="text-xs text-text-muted font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-primary leading-tight">{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{sub}</p>
    </div>
  );
}
