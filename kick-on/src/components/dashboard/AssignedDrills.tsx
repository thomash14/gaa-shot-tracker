'use client';

import Link from 'next/link';
import type { TeamDrill } from '@/types';

/**
 * "Ready to Improve?" section on the dashboard.
 * Shows drills assigned by the coach that haven't been completed yet.
 * Hidden when there are no assigned drills.
 *
 * Ported from the #assignedDrillsSection in index.html / team.js.
 */

interface AssignedDrillsProps {
  drills: TeamDrill[];
}

export default function AssignedDrills({ drills }: AssignedDrillsProps) {
  if (drills.length === 0) return null;

  return (
    <div className="bg-surface rounded-2xl p-5 shadow-sm border-l-4 border-success">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-primary m-0">Ready to Improve?</h3>
        <span className="bg-success text-white text-xs font-bold px-2.5 py-1 rounded-full">
          {drills.length} to do
        </span>
      </div>

      <div className="space-y-2">
        {drills.map((drill) => (
          <Link
            key={drill.id}
            href="/track"
            className="flex items-center justify-between bg-grey-light rounded-lg p-3 hover:bg-grey transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-text">{drill.drillType}</p>
              {drill.notes && (
                <p className="text-xs text-text-muted mt-0.5">{drill.notes}</p>
              )}
            </div>
            {drill.targetPct != null && (
              <span className="text-xs text-text-muted">Target: {drill.targetPct}%</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
