'use client';

import type { TeamDrill, DrillCompletion, TeamMember } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string) {
  const parts = dateStr.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
}

function footLabel(foot: string) {
  if (foot === 'both') return 'Both Feet';
  return foot === 'right' ? 'Right' : 'Left';
}

// ---------------------------------------------------------------------------
// Coach view
// ---------------------------------------------------------------------------

interface CoachDrillsProps {
  drills: TeamDrill[];
  completions: DrillCompletion[];
  playerCount: number;
  onDelete: (id: string) => void;
  onAssign: () => void;
}

export function CoachDrills({ drills, completions, playerCount, onDelete, onAssign }: CoachDrillsProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  if (drills.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-text">Assigned Drills</h3>
          <button onClick={onAssign} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-primary-dark transition-colors">
            Assign Drill
          </button>
        </div>
        <p className="text-sm text-text-muted italic py-4">No drills assigned yet. Click &quot;Assign Drill&quot; to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text">Assigned Drills</h3>
        <button onClick={onAssign} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-primary-dark transition-colors">
          Assign Drill
        </button>
      </div>

      {drills.map((drill) => {
        const settings = drill.settings || { distance: 20, shotType: 'free-kick', foot: 'right', totalShots: 20 };
        const isExpired = new Date(drill.due_date) < new Date() && new Date(drill.due_date).getFullYear() < 2099;
        const hasNoExpiry = new Date(drill.due_date).getFullYear() >= 2099;
        const isScheduled = drill.start_date > todayStr;
        const drillCompletions = completions.filter((c) => c.drill_id === drill.id);
        const completedCount = drillCompletions.length;

        const borderColor = isExpired ? 'border-grey' : isScheduled ? 'border-[#FF9800]' : 'border-primary';

        return (
          <div key={drill.id} className={`bg-surface rounded-xl border-l-4 ${borderColor} p-3 shadow-sm ${isExpired ? 'opacity-70' : ''}`}>
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-text">Scoring Arc - {settings.distance}m</span>
                  {isScheduled && (
                    <span className="text-[9px] bg-[#FF9800] text-white px-1.5 py-0.5 rounded font-semibold">
                      Starts {formatDate(drill.start_date)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {settings.totalShots} shots &middot; {settings.shotType} &middot; {footLabel(settings.foot)}
                </p>
                {drill.target_percentage && (
                  <p className="text-[11px] text-[#4CAF50] font-semibold">Target: {drill.target_percentage}%</p>
                )}
                {drill.notes && (
                  <p className="text-[11px] text-text-muted italic mt-1">{drill.notes}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-text-muted">
                  Assigned: {formatDate(drill.created_at.split('T')[0])}
                </p>
                <p className={`text-[10px] ${isExpired ? 'text-[#f44336]' : 'text-text-muted'}`}>
                  {hasNoExpiry ? 'No expiry' : isExpired ? 'Expired' : `Expires: ${formatDate(drill.due_date)}`}
                </p>
                <p className="text-sm font-bold text-primary mt-1">
                  {completedCount}/{playerCount} completed
                </p>
              </div>
            </div>

            {/* Completions list */}
            {drillCompletions.length > 0 && (
              <div className="mt-2 pt-2 border-t border-grey-light">
                <p className="text-[10px] text-text-muted mb-1">Completions:</p>
                {drillCompletions.map((c) => {
                  const name = c.profiles?.display_name || 'Player';
                  const met = c.score_percentage >= (drill.target_percentage || 80);
                  return (
                    <div key={c.id} className="flex justify-between text-xs py-0.5">
                      <span className="text-text">{name}</span>
                      <span className={`font-semibold ${met ? 'text-[#4CAF50]' : 'text-[#FF9800]'}`}>
                        {c.scored}/{c.total} ({c.score_percentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-2">
              <button
                onClick={() => { if (window.confirm('Delete this drill?')) onDelete(drill.id); }}
                className="text-[10px] font-semibold text-[#f44336] hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Player view
// ---------------------------------------------------------------------------

interface PlayerDrillsProps {
  drills: TeamDrill[];
  myCompletions: DrillCompletion[];
  onStartDrill: (drill: TeamDrill) => void;
}

export function PlayerDrills({ drills, myCompletions, onStartDrill }: PlayerDrillsProps) {
  const completedDrillIds = myCompletions.map((c) => c.drill_id);
  const todayStr = new Date().toISOString().split('T')[0];

  const activeDrills = drills.filter((d) => {
    if (d.start_date > todayStr) return false;
    const isExpired = new Date(d.due_date) < new Date() && new Date(d.due_date).getFullYear() < 2099;
    const isCompleted = completedDrillIds.includes(d.id);
    return !isExpired || isCompleted;
  });

  if (activeDrills.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-bold text-text mb-2">Assigned Drills</h3>
        <p className="text-sm text-text-muted italic py-4">No drills assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-text">Assigned Drills</h3>

      {activeDrills.map((drill) => {
        const settings = drill.settings || { distance: 20, shotType: 'free-kick', foot: 'right', totalShots: 20 };
        const isCompleted = completedDrillIds.includes(drill.id);
        const myCompletion = myCompletions.find((c) => c.drill_id === drill.id);
        const met = myCompletion ? myCompletion.score_percentage >= (drill.target_percentage || 80) : false;

        return (
          <div key={drill.id} className={`bg-surface rounded-xl border-l-4 ${isCompleted ? 'border-[#4CAF50]' : 'border-primary'} p-3 shadow-sm`}>
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-sm font-semibold text-text">
                  {isCompleted ? '\u2705 ' : '\ud83c\udfaf '}Scoring Arc - {settings.distance}m
                </span>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {settings.totalShots} shots &middot; {settings.shotType} &middot; {footLabel(settings.foot)}
                </p>
                {drill.target_percentage && (
                  <p className="text-[11px] text-[#4CAF50] font-semibold">Target: {drill.target_percentage}%</p>
                )}
                {drill.notes && (
                  <p className="text-[11px] text-text-muted italic mt-1">&ldquo;{drill.notes}&rdquo;</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-text-muted">
                  Added {formatDate(drill.created_at.split('T')[0])}
                </p>
                {isCompleted && myCompletion && (
                  <p className={`text-sm font-bold mt-1 ${met ? 'text-[#4CAF50]' : 'text-[#FF9800]'}`}>
                    {myCompletion.scored}/{myCompletion.total} ({myCompletion.score_percentage}%)
                  </p>
                )}
              </div>
            </div>

            {!isCompleted && (
              <button
                onClick={() => onStartDrill(drill)}
                className="mt-2 w-full py-2 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
              >
                Start Practice
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
