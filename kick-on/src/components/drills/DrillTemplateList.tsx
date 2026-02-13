'use client';

import { useState } from 'react';
import type { DrillTemplate, DrillSettings, DrillSpot } from '@/types';
import {
  SKILLSET_CATEGORIES,
  DISTANCE_OPTIONS,
  DRILL_SHOT_TYPES,
  TOTAL_SHOTS_OPTIONS,
  calculateScoringZoneSpots,
} from '@/hooks/useDrills';

// ---------------------------------------------------------------------------
// Sub-component: inline settings panel shown when a dynamic drill is expanded/active
// ---------------------------------------------------------------------------

interface DrillSettingsPanelProps {
  settings: DrillSettings;
  onSettingsChange: (partial: Partial<DrillSettings>) => void;
}

function DrillSettingsPanel({ settings, onSettingsChange }: DrillSettingsPanelProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <div>
        <label className="block text-[10px] font-semibold text-text-muted mb-0.5">Distance</label>
        <select
          value={settings.distance}
          onChange={(e) => onSettingsChange({ distance: parseInt(e.target.value) })}
          className="w-full text-xs bg-surface border border-grey rounded-lg px-2 py-1.5"
        >
          {DISTANCE_OPTIONS.map((d) => (
            <option key={d} value={d}>{d}m</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-text-muted mb-0.5">Shot Type</label>
        <select
          value={settings.shotType}
          onChange={(e) => onSettingsChange({ shotType: e.target.value })}
          className="w-full text-xs bg-surface border border-grey rounded-lg px-2 py-1.5"
        >
          {DRILL_SHOT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-text-muted mb-0.5">Foot</label>
        <select
          value={settings.footOption}
          onChange={(e) => onSettingsChange({ footOption: e.target.value as DrillSettings['footOption'] })}
          className="w-full text-xs bg-surface border border-grey rounded-lg px-2 py-1.5"
        >
          <option value="right">Right Only</option>
          <option value="left">Left Only</option>
          <option value="both">Both (split)</option>
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-text-muted mb-0.5">Total Shots</label>
        <select
          value={settings.totalShots}
          onChange={(e) => onSettingsChange({ totalShots: parseInt(e.target.value) })}
          className="w-full text-xs bg-surface border border-grey rounded-lg px-2 py-1.5"
        >
          {TOTAL_SHOTS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: drill description modal
// ---------------------------------------------------------------------------

interface DrillDescriptionModalProps {
  template: DrillTemplate;
  onClose: () => void;
}

function DrillDescriptionModal({ template, onClose }: DrillDescriptionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-grey-light">
          <h3 className="text-base font-semibold text-primary dark:text-text">{template.name} - Instructions</h3>
        </div>
        <div className="p-4 text-sm text-text leading-relaxed">
          {template.detailedInstructions ? (
            <div dangerouslySetInnerHTML={{ __html: template.detailedInstructions }} />
          ) : (
            <>
              <p>{template.description}</p>
              <p className="italic text-text-muted mt-2">Detailed instructions coming soon!</p>
            </>
          )}
          {template.videoUrl && (
            <div className="mt-4">
              <a
                href={template.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary font-semibold text-sm hover:underline"
              >
                Watch Video
              </a>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-grey-light">
          <button onClick={onClose} className="w-full py-2 rounded-lg text-sm font-semibold text-text-muted bg-grey-light hover:bg-grey transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface DrillTemplateListProps {
  drillList: { builtIn: DrillTemplate[]; custom: DrillTemplate[] };
  activeTemplate: DrillTemplate | null;
  expandedDrillId: string | null;
  previewingTemplateId: string | null;
  drillSettings: DrillSettings;
  drillProgress: Record<string, Record<string | number, unknown>>;
  currentSkillsetFilter: string;
  onFilterChange: (value: string) => void;
  onToggleExpand: (id: string) => void;
  onSelectTemplate: (template: DrillTemplate) => void;
  onTogglePreview: (id: string) => void;
  onSettingsChange: (partial: Partial<DrillSettings>) => void;
  onDeleteCustomDrill: (id: string) => void;
  onOpenSaveDrill: () => void;
}

interface DrillRowItem {
  templateId: string;
  name: string;
  description: string;
  isDynamic: boolean;
  isCustom: boolean;
  hasInstructions: boolean;
  spots: DrillSpot[] | undefined;
  drillId: string | number | null;
  template: DrillTemplate;
}

export default function DrillTemplateList({
  drillList,
  activeTemplate,
  expandedDrillId,
  previewingTemplateId,
  drillSettings,
  drillProgress,
  currentSkillsetFilter,
  onFilterChange,
  onToggleExpand,
  onSelectTemplate,
  onTogglePreview,
  onSettingsChange,
  onDeleteCustomDrill,
  onOpenSaveDrill,
}: DrillTemplateListProps) {
  const [descriptionTemplate, setDescriptionTemplate] = useState<DrillTemplate | null>(null);

  // Build unified drill list
  const allDrills: DrillRowItem[] = [];

  drillList.builtIn.forEach((t) => {
    allDrills.push({
      templateId: t.id,
      name: t.name,
      description: t.description,
      isDynamic: t.isDynamic,
      isCustom: false,
      hasInstructions: !!t.detailedInstructions,
      spots: t.spots,
      drillId: null,
      template: t,
    });
  });

  drillList.custom.forEach((d) => {
    allDrills.push({
      templateId: d.id.startsWith('custom-') ? d.id : `custom-${d.id}`,
      name: d.name,
      description: d.description || '',
      isDynamic: false,
      isCustom: true,
      hasInstructions: false,
      spots: d.spots,
      drillId: d.customDrillId ?? d.id,
      template: d,
    });
  });

  return (
    <div className="space-y-2">
      {/* Skillset filter */}
      <div className="flex items-center gap-2 mb-3">
        <label className="text-xs font-semibold text-text">Skillset:</label>
        <select
          value={currentSkillsetFilter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="text-xs bg-surface border border-grey rounded-lg px-2 py-1.5"
        >
          {SKILLSET_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Drill rows */}
      {allDrills.map((drill) => {
        const isActive = activeTemplate?.id === drill.templateId;
        const isExpanded = expandedDrillId === drill.templateId && !isActive;
        const isPreviewing = previewingTemplateId === drill.templateId;

        // Build info text
        let infoText = '';
        if (drill.isDynamic) {
          infoText = `5 spots \u00b7 ${drillSettings.distance}m \u00b7 dynamic`;
        } else if (drill.spots) {
          infoText = `${drill.spots.length} spots`;
        } else {
          infoText = drill.description;
        }

        // Progress data for active drill
        let progressInfo: { completedSpots: number; spotCount: number; scored: number; attempted: number; pct: number } | null = null;
        if (isActive) {
          const progressKey = drill.isDynamic
            ? `${drill.templateId}-${drillSettings.distance}-${drillSettings.shotType}-${drillSettings.footOption}-${drillSettings.totalShots}`
            : drill.templateId;
          const progress = drillProgress[progressKey] || {};
          const spotCount = drill.isDynamic ? 5 : (drill.spots?.length ?? 0);
          let completedSpots = 0, scored = 0, attempted = 0;
          (Object.values(progress) as Record<string, unknown>[]).forEach((p) => {
            if (p && typeof p === 'object' && ('right' in p || 'left' in p)) {
              const r = p.right as { scored?: number; total?: number } | undefined;
              const l = p.left as { scored?: number; total?: number } | undefined;
              scored += (r?.scored || 0) + (l?.scored || 0);
              attempted += (r?.total || 0) + (l?.total || 0);
              if (r && l) completedSpots++;
            } else {
              const s = p as { scored?: number; total?: number };
              scored += s.scored || 0;
              attempted += s.total || 0;
              if ((s.total || 0) > 0) completedSpots++;
            }
          });
          const pct = attempted > 0 ? Math.round((scored / attempted) * 100) : 0;
          progressInfo = { completedSpots, spotCount, scored, attempted, pct };
        }

        return (
          <div key={drill.templateId}>
            {/* Drill row */}
            <div
              className={`rounded-xl border p-3 transition-colors cursor-pointer ${
                isActive
                  ? 'border-primary bg-primary/5'
                  : isExpanded
                  ? 'border-accent bg-accent/5'
                  : 'border-grey-light bg-surface hover:border-grey'
              }`}
              onClick={() => {
                if (!isActive) onToggleExpand(drill.templateId);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-text truncate">{drill.name}</span>
                    {drill.isCustom && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent/20 text-accent shrink-0">Custom</span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5">{infoText}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {drill.hasInstructions && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDescriptionTemplate(drill.template); }}
                      className="w-7 h-7 rounded-lg text-xs bg-grey-light hover:bg-grey text-text-muted transition-colors flex items-center justify-center"
                      title="How to do this drill"
                    >
                      ?
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onTogglePreview(drill.templateId); }}
                    className={`w-7 h-7 rounded-lg text-xs transition-colors flex items-center justify-center ${
                      isPreviewing ? 'bg-primary text-white' : 'bg-grey-light hover:bg-grey text-text-muted'
                    }`}
                    title="Preview on pitch"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  {isActive ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); onSelectTemplate(drill.template); }}
                      className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-[#4CAF50] text-white hover:bg-[#388E3C] transition-colors"
                    >
                      Active
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleExpand(drill.templateId); }}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        isExpanded
                          ? 'bg-accent text-white hover:bg-accent/80'
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                      }`}
                    >
                      {isExpanded ? 'Deselect' : 'Select'}
                    </button>
                  )}
                  {drill.isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this drill?')) {
                          onDeleteCustomDrill(String(drill.drillId));
                        }
                      }}
                      className="w-7 h-7 rounded-lg text-xs bg-[#f44336]/10 hover:bg-[#f44336]/20 text-[#f44336] transition-colors flex items-center justify-center"
                      title="Delete drill"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Active drill: settings + progress inline */}
              {isActive && (
                <div className="mt-3 pt-3 border-t border-grey-light space-y-2">
                  {drill.isDynamic && (
                    <>
                      <DrillSettingsPanel settings={drillSettings} onSettingsChange={onSettingsChange} />
                      <p className="text-[11px] text-text-muted">
                        <strong>{drillSettings.totalShots / 5} kicks per spot</strong>{' '}
                        {drillSettings.footOption === 'both'
                          ? `(${drillSettings.totalShots / 10} right + ${drillSettings.totalShots / 10} left)`
                          : `(${drillSettings.footOption} foot)`}{' '}
                        · <strong>{drillSettings.totalShots} total</strong> ·{' '}
                        <span className="text-[#4CAF50]">Target: 80%+</span>
                      </p>
                    </>
                  )}
                  {progressInfo && progressInfo.attempted > 0 ? (
                    <div className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 ${progressInfo.pct >= 80 ? 'bg-[#4CAF50]/10 text-[#4CAF50]' : 'bg-[#FF9800]/10 text-[#FF9800]'}`}>
                      Progress: <strong>{progressInfo.completedSpots}/{progressInfo.spotCount} spots</strong> ·{' '}
                      Score: <strong>{progressInfo.scored}/{progressInfo.attempted}</strong> ({progressInfo.pct}%)
                      {progressInfo.pct >= 80 ? ' \ud83c\udfaf' : ''}
                    </div>
                  ) : (
                    <p className="text-[11px] text-text-muted">Click spots on the pitch to record scores</p>
                  )}
                </div>
              )}
            </div>

            {/* Expanded config panel (not active, just selected) */}
            {isExpanded && (
              <div className="ml-2 mr-2 mt-1 p-3 bg-grey-light/50 rounded-b-xl border border-t-0 border-grey-light space-y-2">
                {drill.isDynamic ? (
                  <DrillSettingsPanel settings={drillSettings} onSettingsChange={onSettingsChange} />
                ) : (
                  <p className="text-xs text-text-muted">
                    <strong>{drill.spots?.length ?? 0} spots</strong> ·{' '}
                    {(drill.spots ?? []).reduce((sum, s) => sum + s.shots, 0)} total shots
                  </p>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onSelectTemplate(drill.template); }}
                  className="w-full py-2 rounded-lg text-xs font-semibold text-white bg-[#4CAF50] hover:bg-[#388E3C] transition-colors"
                >
                  Start Drill
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {allDrills.length === 0 && currentSkillsetFilter !== 'all' && (
        <div className="text-center py-8 text-text-muted">
          <p className="text-sm">No drills found for <strong>{SKILLSET_CATEGORIES.find((c) => c.value === currentSkillsetFilter)?.label}</strong>.</p>
          <p className="text-xs mt-2">Create a custom drill and assign it to this skillset.</p>
        </div>
      )}

      {/* Save as drill button */}
      <button
        onClick={onOpenSaveDrill}
        className="w-full mt-2 py-2.5 rounded-xl text-xs font-semibold text-primary border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-colors"
      >
        + Save Current Shots as Custom Drill
      </button>

      {/* Description modal */}
      {descriptionTemplate && (
        <DrillDescriptionModal
          template={descriptionTemplate}
          onClose={() => setDescriptionTemplate(null)}
        />
      )}
    </div>
  );
}
