'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDrillStore } from '@/store/drillStore';
import { useSessionStore } from '@/store/sessionStore';
import { is2PointZone } from './useShots';
import type { DrillTemplate, DrillSpot, DrillSettings, SpotScore, SpotScoreSingle } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SKILLSET_CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'kicking-at-goal', label: 'Kicking at Goal' },
  { value: 'kick-passing', label: 'Kick Passing' },
  { value: 'hand-passing', label: 'Hand Passing' },
  { value: 'high-catch', label: 'High Catch' },
  { value: 'soloing', label: 'Soloing' },
  { value: 'pick-up', label: 'Pick-Up' },
  { value: 'fun-challenges', label: 'Fun Challenges' },
] as const;

export const DISTANCE_OPTIONS = [15, 17, 20, 24, 30, 35, 40, 45] as const;

export const DRILL_SHOT_TYPES = [
  { value: 'free-kick', label: 'Free-Kick' },
  { value: 'standing', label: 'Standing' },
  { value: 'on-the-run', label: 'On the Run' },
  { value: 'on-the-turn', label: 'On the Turn' },
  { value: 'off-a-dummy', label: 'After a Dummy' },
] as const;

export const TOTAL_SHOTS_OPTIONS = [
  { value: 10, label: '10 (2/spot)' },
  { value: 20, label: '20 (4/spot)' },
  { value: 30, label: '30 (6/spot)' },
  { value: 40, label: '40 (8/spot)' },
] as const;

const SCORING_ZONES_DRILL: DrillTemplate = {
  id: 'scoring-zones',
  name: 'Scoring Arc',
  description: 'Scoring from different angles on the pitch. 80%+ is a brilliant result!',
  isDynamic: true,
  isCustom: false,
  skillset: 'kicking-at-goal',
  detailedInstructions: `
    <h4>Scoring Arc Drill</h4>
    <p><strong>Objective:</strong> Improve your point-taking accuracy from different angles and distances.</p>
    <ol>
      <li>Choose your distance (15m-45m), shot type, and preferred foot</li>
      <li>5 shooting positions in an arc at your chosen distance</li>
      <li>Take the number of kicks shown per spot</li>
      <li>Click each spot on the pitch to enter scores</li>
      <li>Aim for 80%+ accuracy before increasing distance</li>
    </ol>
  `,
};

export const BUILT_IN_TEMPLATES: DrillTemplate[] = [SCORING_ZONES_DRILL];

// ---------------------------------------------------------------------------
// Scoring zone spot calculation (from drills.js)
// ---------------------------------------------------------------------------

export function calculateScoringZoneSpots(distanceMeters: number): DrillSpot[] {
  const pixelsPerMeter = 644 / 145;
  const distancePixels = distanceMeters * pixelsPerMeter;
  const goalX = 225;
  const goalY = 40;
  const arcRadius = 178; // 40m arc in pixels
  const twentyMLineY = 129;
  const yFromGoal = twentyMLineY - goalY; // 89
  const xOffsetAt20m = Math.sqrt(arcRadius * arcRadius - yFromGoal * yFromGoal);
  const edgeAngle = Math.atan2(yFromGoal, xOffsetAt20m);
  const centerAngle = Math.PI / 2;
  const edgeAngleFromVertical = Math.PI / 2 - edgeAngle;

  const angles = [
    centerAngle - edgeAngleFromVertical,
    centerAngle - edgeAngleFromVertical / 2,
    centerAngle,
    centerAngle + edgeAngleFromVertical / 2,
    centerAngle + edgeAngleFromVertical,
  ];

  const names = ['Right Angle', 'Right Inside', 'Centre', 'Left Inside', 'Left Angle'];
  const descriptions = ['Right side angle', 'Between right and centre', 'Directly in front', 'Between left and centre', 'Left side angle'];

  return angles.map((angle, i) => {
    const svgX = goalX + distancePixels * Math.sin(angle - Math.PI / 2);
    const svgY = goalY + distancePixels * Math.cos(angle - Math.PI / 2);
    return {
      id: i + 1,
      name: names[i],
      description: descriptions[i],
      x: (svgX / 500) * 100,
      y: (svgY / 725) * 100,
      shots: 4,
    };
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isBothFeetScore(score: SpotScore): score is { right: SpotScoreSingle; left: SpotScoreSingle } {
  return 'right' in score && 'left' in score;
}

function getNextDistance(current: number): number {
  const idx = DISTANCE_OPTIONS.indexOf(current as typeof DISTANCE_OPTIONS[number]);
  return idx < DISTANCE_OPTIONS.length - 1 ? DISTANCE_OPTIONS[idx + 1] : 45;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDrills() {
  const drillSettings = useDrillStore((s) => s.drillSettings);
  const setDrillSettings = useDrillStore((s) => s.setDrillSettings);
  const activeTemplate = useDrillStore((s) => s.activeTemplate);
  const setActiveTemplate = useDrillStore((s) => s.setActiveTemplate);
  const previewingTemplateId = useDrillStore((s) => s.previewingTemplateId);
  const setPreviewingTemplateId = useDrillStore((s) => s.setPreviewingTemplateId);
  const drillProgress = useDrillStore((s) => s.drillProgress);
  const setDrillProgress = useDrillStore((s) => s.setDrillProgress);
  const updateSpotProgress = useDrillStore((s) => s.updateSpotProgress);
  const clearSpotProgress = useDrillStore((s) => s.clearSpotProgress);
  const resetProgressForKey = useDrillStore((s) => s.resetProgressForKey);
  const expandedDrillId = useDrillStore((s) => s.expandedDrillId);
  const setExpandedDrillId = useDrillStore((s) => s.setExpandedDrillId);
  const currentSkillsetFilter = useDrillStore((s) => s.currentSkillsetFilter);
  const setCurrentSkillsetFilter = useDrillStore((s) => s.setCurrentSkillsetFilter);
  const customDrills = useDrillStore((s) => s.customDrills);
  const resetDrill = useDrillStore((s) => s.resetDrill);

  const currentSession = useSessionStore((s) => s.currentSession);
  const updateSession = useSessionStore((s) => s.updateSession);

  // Spot score modal
  const [spotModalOpen, setSpotModalOpen] = useState(false);
  const [spotModalSpot, setSpotModalSpot] = useState<DrillSpot | null>(null);

  // Save drill modal
  const [saveDrillModalOpen, setSaveDrillModalOpen] = useState(false);

  // Load drill progress from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('gaaDrillProgress');
      if (stored) setDrillProgress(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [setDrillProgress]);

  // Persist drill progress to localStorage
  const persistProgress = useCallback(
    (progress: typeof drillProgress) => {
      try { localStorage.setItem('gaaDrillProgress', JSON.stringify(progress)); } catch { /* ignore */ }
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Computed: progress key for active template
  // -------------------------------------------------------------------------
  const activeProgressKey = useMemo(() => {
    if (!activeTemplate) return null;
    if (activeTemplate.isDynamic) {
      return `${activeTemplate.id}-${drillSettings.distance}-${drillSettings.shotType}-${drillSettings.footOption}-${drillSettings.totalShots}`;
    }
    return activeTemplate.id;
  }, [activeTemplate, drillSettings]);

  // -------------------------------------------------------------------------
  // Computed: active spots
  // -------------------------------------------------------------------------
  const activeSpots = useMemo((): DrillSpot[] => {
    if (!activeTemplate) return [];
    if (activeTemplate.isDynamic) {
      const baseSpots = calculateScoringZoneSpots(drillSettings.distance);
      const shotsPerSpot = drillSettings.totalShots / 5;
      return baseSpots.map((spot) => ({
        ...spot,
        shots: shotsPerSpot,
        foot: drillSettings.footOption,
        shotCategory: drillSettings.shotType === 'free-kick' ? 'free-kick' : 'in-play',
        shotType: drillSettings.shotType,
      }));
    }
    return activeTemplate.spots ?? [];
  }, [activeTemplate, drillSettings]);

  // -------------------------------------------------------------------------
  // Computed: progress summary for active drill
  // -------------------------------------------------------------------------
  const progressSummary = useMemo(() => {
    if (!activeProgressKey) return { completedSpots: 0, totalSpots: 0, totalScored: 0, totalAttempted: 0, percentage: 0, isComplete: false, targetMet: false };
    const progress = drillProgress[activeProgressKey] || {};
    const totalSpots = activeSpots.length;
    let completedSpots = 0, totalScored = 0, totalAttempted = 0;

    Object.values(progress).forEach((p) => {
      if (isBothFeetScore(p)) {
        if (p.right && p.left) {
          completedSpots++;
          totalScored += p.right.scored + p.left.scored;
          totalAttempted += p.right.total + p.left.total;
        } else {
          totalScored += (p.right?.scored || 0) + (p.left?.scored || 0);
          totalAttempted += (p.right?.total || 0) + (p.left?.total || 0);
        }
      } else {
        const single = p as SpotScoreSingle;
        if (single.total > 0) {
          completedSpots++;
          totalScored += single.scored;
          totalAttempted += single.total;
        }
      }
    });

    const percentage = totalAttempted > 0 ? Math.round((totalScored / totalAttempted) * 100) : 0;
    const isComplete = completedSpots === totalSpots;
    const targetMet = percentage >= 80;
    return { completedSpots, totalSpots, totalScored, totalAttempted, percentage, isComplete, targetMet };
  }, [activeProgressKey, drillProgress, activeSpots]);

  // -------------------------------------------------------------------------
  // Computed: all drill list (built-in + custom, filtered by skillset)
  // -------------------------------------------------------------------------
  const drillList = useMemo(() => {
    const filter = currentSkillsetFilter;
    const builtIn = BUILT_IN_TEMPLATES.filter((t) => filter === 'all' || t.skillset === filter);
    const custom = customDrills.filter((d) => filter === 'all' || (d.skillset || 'kicking-at-goal') === filter);
    return { builtIn, custom };
  }, [currentSkillsetFilter, customDrills]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const toggleDrillExpand = useCallback(
    (templateId: string) => {
      setExpandedDrillId(expandedDrillId === templateId ? null : templateId);
    },
    [expandedDrillId, setExpandedDrillId],
  );

  const selectTemplate = useCallback(
    (template: DrillTemplate) => {
      // Toggle off if already active
      if (activeTemplate?.id === template.id) {
        resetDrill();
        return;
      }
      setActiveTemplate(template);
      setExpandedDrillId(null);
      setPreviewingTemplateId(null);
    },
    [activeTemplate, setActiveTemplate, setExpandedDrillId, setPreviewingTemplateId, resetDrill],
  );

  const togglePreview = useCallback(
    (templateId: string) => {
      setPreviewingTemplateId(previewingTemplateId === templateId ? null : templateId);
    },
    [previewingTemplateId, setPreviewingTemplateId],
  );

  const clearTemplate = useCallback(() => {
    resetDrill();
  }, [resetDrill]);

  // -------------------------------------------------------------------------
  // Spot score
  // -------------------------------------------------------------------------

  const openSpotScoreModal = useCallback((spot: DrillSpot) => {
    setSpotModalSpot(spot);
    setSpotModalOpen(true);
  }, []);

  const closeSpotScoreModal = useCallback(() => {
    setSpotModalOpen(false);
    setSpotModalSpot(null);
  }, []);

  const saveSpotScore = useCallback(
    (spotId: number | string, score: SpotScore) => {
      if (!activeProgressKey) return;
      updateSpotProgress(activeProgressKey, spotId, score);

      // Persist to localStorage
      const updated = { ...drillProgress };
      if (!updated[activeProgressKey]) updated[activeProgressKey] = {};
      updated[activeProgressKey] = { ...updated[activeProgressKey], [spotId]: score };
      persistProgress(updated);

      // Add shots to current session
      if (currentSession) {
        const spot = activeSpots.find((s) => s.id === spotId);
        if (!spot) return;

        // Remove old shots for this spot
        const cleanedShots = (currentSession.shots ?? []).filter(
          (s) => !(s.drillSpotId === spotId && s.drillKey === activeProgressKey),
        );

        const pointValue = is2PointZone(spot.x, spot.y) ? 2 : 1;
        const newShots = [...cleanedShots];

        if (isBothFeetScore(score)) {
          // Right foot shots
          for (let i = 0; i < score.right.total; i++) {
            newShots.push({
              x: spot.x, y: spot.y, result: i < score.right.scored ? 'scored' : 'missed',
              distance: drillSettings.distance, foot: 'right',
              shotCategory: drillSettings.shotType === 'free-kick' ? 'free-kick' : 'in-play',
              shotType: drillSettings.shotType, shotFor: 'point', pointValue,
              drillSpotId: spotId as number, drillKey: activeProgressKey,
              half: null, timestamp: new Date().toISOString(), comment: '', batch: false,
            });
          }
          // Left foot shots
          for (let i = 0; i < score.left.total; i++) {
            newShots.push({
              x: spot.x, y: spot.y, result: i < score.left.scored ? 'scored' : 'missed',
              distance: drillSettings.distance, foot: 'left',
              shotCategory: drillSettings.shotType === 'free-kick' ? 'free-kick' : 'in-play',
              shotType: drillSettings.shotType, shotFor: 'point', pointValue,
              drillSpotId: spotId as number, drillKey: activeProgressKey,
              half: null, timestamp: new Date().toISOString(), comment: '', batch: false,
            });
          }
        } else {
          const single = score as SpotScoreSingle;
          for (let i = 0; i < single.total; i++) {
            newShots.push({
              x: spot.x, y: spot.y, result: i < single.scored ? 'scored' : 'missed',
              distance: drillSettings.distance, foot: drillSettings.footOption === 'both' ? 'right' : drillSettings.footOption,
              shotCategory: drillSettings.shotType === 'free-kick' ? 'free-kick' : 'in-play',
              shotType: drillSettings.shotType, shotFor: 'point', pointValue,
              drillSpotId: spotId as number, drillKey: activeProgressKey,
              half: null, timestamp: new Date().toISOString(), comment: '', batch: false,
            });
          }
        }
        updateSession(currentSession.id, { shots: newShots });
      }

      closeSpotScoreModal();
    },
    [activeProgressKey, drillProgress, persistProgress, updateSpotProgress, currentSession, activeSpots, drillSettings, updateSession, closeSpotScoreModal],
  );

  const clearSpotScore = useCallback(
    (spotId: number | string) => {
      if (!activeProgressKey) return;
      clearSpotProgress(activeProgressKey, spotId);

      // Persist
      const updated = { ...drillProgress };
      if (updated[activeProgressKey]) {
        const spots = { ...updated[activeProgressKey] };
        delete spots[spotId];
        updated[activeProgressKey] = spots;
      }
      persistProgress(updated);

      // Remove shots from session
      if (currentSession) {
        const cleanedShots = (currentSession.shots ?? []).filter(
          (s) => !(s.drillSpotId === spotId && s.drillKey === activeProgressKey),
        );
        updateSession(currentSession.id, { shots: cleanedShots });
      }

      closeSpotScoreModal();
    },
    [activeProgressKey, drillProgress, persistProgress, clearSpotProgress, currentSession, updateSession, closeSpotScoreModal],
  );

  const resetDrillProgress = useCallback(() => {
    if (!activeProgressKey) return;
    if (!window.confirm('Reset all scores for this drill configuration?')) return;
    resetProgressForKey(activeProgressKey);
    const updated = { ...drillProgress };
    updated[activeProgressKey] = {};
    persistProgress(updated);
  }, [activeProgressKey, drillProgress, persistProgress, resetProgressForKey]);

  const nextDistance = useMemo(() => {
    return getNextDistance(drillSettings.distance);
  }, [drillSettings.distance]);

  return {
    // Settings
    drillSettings,
    setDrillSettings,

    // Templates
    activeTemplate,
    selectTemplate,
    clearTemplate,
    drillList,
    expandedDrillId,
    toggleDrillExpand,
    previewingTemplateId,
    togglePreview,

    // Filter
    currentSkillsetFilter,
    setCurrentSkillsetFilter,

    // Progress
    activeProgressKey,
    activeSpots,
    progressSummary,
    drillProgress,
    resetDrillProgress,
    nextDistance,

    // Spot score modal
    spotModalOpen,
    spotModalSpot,
    openSpotScoreModal,
    closeSpotScoreModal,
    saveSpotScore,
    clearSpotScore,

    // Save drill modal
    saveDrillModalOpen,
    setSaveDrillModalOpen,
  };
}
