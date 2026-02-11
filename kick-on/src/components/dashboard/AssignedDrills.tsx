'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDrillStore } from '@/store/drillStore';
import { BUILT_IN_TEMPLATES, DRILL_SHOT_TYPES } from '@/hooks/useDrills';
import type { TeamDrill, DrillCompletion, Team } from '@/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AssignedDrillsProps {
  drills: TeamDrill[];
  completions: DrillCompletion[];
  currentTeam: Team | null;
  currentUserId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDrillName(drillType: string): string {
  const template = BUILT_IN_TEMPLATES.find((t) => t.id === drillType);
  if (template) return template.name;
  // Fallback: format the ID nicely
  return drillType
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getDrillTemplate(drillType: string) {
  return BUILT_IN_TEMPLATES.find((t) => t.id === drillType) ?? null;
}

function getTeamDisplayName(team: Team | null): string {
  if (!team) return 'Your team';
  const clubName = team.clubs?.name ?? '';
  if (!clubName) return team.age_group || 'Your team';
  return team.age_group ? `${clubName} (${team.age_group})` : clubName;
}

function getShotTypeLabel(value: string): string {
  const entry = DRILL_SHOT_TYPES.find((t) => t.value === value);
  return entry?.label ?? value;
}

function getFootLabel(foot: string): string {
  if (foot === 'right') return 'Right foot';
  if (foot === 'left') return 'Left foot';
  if (foot === 'both') return 'Both feet';
  return foot;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface ExpiryInfo {
  label: string | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

function getExpiryInfo(dueDate: string): ExpiryInfo {
  const due = new Date(dueDate + 'T00:00:00');
  // No expiry for far-future dates
  if (due.getFullYear() >= 2099) {
    return { label: null, isExpired: false, isExpiringSoon: false };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { label: 'Expired', isExpired: true, isExpiringSoon: false };
  }
  if (diffDays <= 3) {
    return { label: `${diffDays} day${diffDays !== 1 ? 's' : ''} left`, isExpired: false, isExpiringSoon: true };
  }
  return { label: `Expires: ${formatDate(dueDate)}`, isExpired: false, isExpiringSoon: false };
}

// ---------------------------------------------------------------------------
// Drill Card
// ---------------------------------------------------------------------------

interface DrillCardProps {
  drill: TeamDrill;
  completion: DrillCompletion | undefined;
  teamName: string;
}

function DrillCard({ drill, completion, teamName }: DrillCardProps) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  const template = getDrillTemplate(drill.drill_type);
  const drillName = getDrillName(drill.drill_type);
  const expiry = getExpiryInfo(drill.due_date);
  const isCompleted = !!completion;

  // Settings summary line
  const settingsParts: string[] = [];
  if (drill.settings?.distance) settingsParts.push(`${drill.settings.distance}m`);
  if (drill.settings?.shotType) settingsParts.push(getShotTypeLabel(drill.settings.shotType));
  if (drill.settings?.foot) settingsParts.push(getFootLabel(drill.settings.foot));
  const settingsLine = settingsParts.join(' \u00B7 ');

  // Target + deadline line
  const targetParts: string[] = [];
  if (drill.target_percentage != null) targetParts.push(`Target: ${drill.target_percentage}%`);
  if (expiry.label) targetParts.push(expiry.label);
  const targetLine = targetParts.join(' \u00B7 ');

  // Border colour
  let borderClass = 'border-success'; // green: active
  if (isCompleted) borderClass = 'border-grey';
  else if (expiry.isExpiringSoon || expiry.isExpired) borderClass = 'border-[#f59e0b]';

  // Start drill handler
  const handleStart = () => {
    const store = useDrillStore.getState();
    if (template) {
      store.setActiveTemplate(template);
    }
    if (drill.settings) {
      store.setDrillSettings({
        distance: drill.settings.distance,
        shotType: drill.settings.shotType,
        footOption: (drill.settings.foot as 'left' | 'right' | 'both') || 'right',
        totalShots: drill.settings.totalShots,
      });
    }
    store.setCurrentAssignedDrillId(drill.id);
    router.push('/track?type=practice');
  };

  // Detail text for expandable section
  const description = template?.description ?? '';
  const instructions = template?.detailedInstructions ? stripHtml(template.detailedInstructions) : '';
  const spotCount = template?.isDynamic ? 5 : (template?.spots?.length ?? 0);

  return (
    <div className={`bg-surface rounded-xl border-l-4 ${borderClass} shadow-sm overflow-hidden`}>
      <div className="p-4">
        {/* Row 1: Name + completion/start */}
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-text truncate">{drillName}</h4>
          {isCompleted ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-success whitespace-nowrap">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {completion!.score_percentage}%
            </span>
          ) : (
            <button
              onClick={handleStart}
              className="text-xs font-semibold text-white bg-primary px-3 py-1 rounded-full hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Start
            </button>
          )}
        </div>

        {/* Row 2: Settings */}
        {settingsLine && (
          <p className="text-xs text-text-muted mt-1">{settingsLine}</p>
        )}

        {/* Row 3: Target + deadline */}
        {targetLine && (
          <p className={`text-xs mt-0.5 ${expiry.isExpired ? 'text-red-500 font-medium' : expiry.isExpiringSoon ? 'text-[#f59e0b] font-medium' : 'text-text-muted'}`}>
            {targetLine}
          </p>
        )}

        {/* Row 4: Coach */}
        <p className="text-xs text-text-muted mt-0.5">Assigned by: {teamName}</p>

        {/* Notes */}
        {drill.notes && (
          <p className="text-xs text-text-muted mt-1 italic">{drill.notes}</p>
        )}

        {/* Info toggle */}
        {(description || instructions) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Details
          </button>
        )}
      </div>

      {/* Expandable details */}
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="bg-grey-light rounded-lg p-3 text-xs text-text-muted space-y-1">
            {description && <p>{description}</p>}
            {instructions && <p>{instructions}</p>}
            {spotCount > 0 && (
              <p className="font-medium text-text">
                {spotCount} spots &middot; {drill.settings?.totalShots ?? 20} total shots
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AssignedDrills({ drills, completions, currentTeam, currentUserId }: AssignedDrillsProps) {
  // Filter out expired drills
  const activeDrills = drills.filter((d) => !getExpiryInfo(d.due_date).isExpired);

  // Empty state
  if (activeDrills.length === 0) {
    return (
      <div className="bg-surface rounded-2xl p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-primary mb-2">Assigned Drills</h3>
        <p className="text-sm text-text-muted">
          No drills assigned &mdash; <Link href="/track?type=practice" className="text-primary hover:underline">start a practice session</Link> to keep improving!
        </p>
      </div>
    );
  }

  const teamName = getTeamDisplayName(currentTeam);

  // Count incomplete drills
  const incompleteDrills = activeDrills.filter(
    (d) => !completions.some((c) => c.drill_id === d.id && c.user_id === currentUserId),
  );

  return (
    <div className="bg-surface rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-primary m-0">Assigned Drills</h3>
        {incompleteDrills.length > 0 && (
          <span className="bg-success text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {incompleteDrills.length} to do
          </span>
        )}
      </div>

      <div className="space-y-3">
        {activeDrills.map((drill) => {
          const completion = completions.find(
            (c) => c.drill_id === drill.id && c.user_id === currentUserId,
          );

          return (
            <DrillCard
              key={drill.id}
              drill={drill}
              completion={completion}
              teamName={teamName}
            />
          );
        })}
      </div>
    </div>
  );
}
