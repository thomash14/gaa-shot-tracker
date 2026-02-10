'use client';

import { useState, useCallback, useRef } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import type { Shot } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrackingMode = 'single' | 'batch';
export type ShotForType = 'point' | 'goal';
export type ShotCategoryType = 'in-play' | 'free-kick' | '45' | 'sideline';
export type FootType = 'left' | 'right' | 'fisted';
export type HalfType = '1st' | '2nd' | null;

export interface PendingShot {
  x: number;
  y: number;
  distance: number;
  foot: FootType;
  half: HalfType;
  shotFor: ShotForType;
  shotCategory: ShotCategoryType;
  shotType: string;
}

// ---------------------------------------------------------------------------
// Distance / 2-point zone helpers (ported from pitch.js)
// ---------------------------------------------------------------------------

/** Calculate distance in metres from percentage coords to the nearest goal. */
export function calculateDistance(xPct: number, yPct: number): { distance: number; isTopGoal: boolean } {
  const svgX = (xPct / 100) * 500;
  const svgY = (yPct / 100) * 725;
  // Convert to pitch coordinates (metres)
  const pitchX = ((svgX - 25) / 400) * 90 - 45; // Centre at 0, range -45 to +45
  const pitchY = ((svgY - 40) / 644) * 145;      // Range 0 to 145
  const distToTop = pitchY;
  const distToBottom = 145 - pitchY;
  const isTopGoal = distToTop < distToBottom;
  const yDist = isTopGoal ? distToTop : distToBottom;
  const distance = Math.sqrt(pitchX * pitchX + yDist * yDist);
  return { distance, isTopGoal };
}

/** Check whether a shot position is in the 2-point zone. */
export function is2PointZone(x: number, y: number): boolean {
  const svgX = (x / 100) * 500;
  const svgY = (y / 100) * 725;
  const isTopGoal = svgY < 362;
  if (isTopGoal) {
    const goalX = 225, goalY = 40;
    if (svgY <= 129) return false; // Inside 20m line
    const dist = Math.sqrt((svgX - goalX) ** 2 + (svgY - goalY) ** 2);
    return dist > 178;
  } else {
    const goalX = 225, goalY = 684;
    if (svgY >= 595) return false;
    const dist = Math.sqrt((svgX - goalX) ** 2 + (svgY - goalY) ** 2);
    return dist > 178;
  }
}

export function getPointValue(shot: { x: number; y: number; shotCategory: string }): number {
  if (shot.shotCategory === '45') return 1;
  return is2PointZone(shot.x, shot.y) ? 2 : 1;
}

/** Get the goal position in SVG coords for the nearest goal. */
export function getGoalSvgCoords(yPct: number): { goalX: number; goalY: number } {
  const svgY = (yPct / 100) * 725;
  const isTopGoal = svgY < 362;
  return { goalX: 225, goalY: isTopGoal ? 40 : 684 };
}

// ---------------------------------------------------------------------------
// Shot type options based on shot category
// ---------------------------------------------------------------------------

export const IN_PLAY_SHOT_TYPES = [
  { value: 'not-defined', label: 'Not Defined' },
  { value: 'outside-of-the-boot', label: 'Outside Of The Boot' },
  { value: 'on-the-run', label: 'On the run' },
  { value: 'on-the-turn', label: 'On the turn' },
  { value: 'standing', label: 'Standing' },
  { value: 'off-a-dummy', label: 'Off a Dummy' },
  { value: 'fisted', label: 'Fisted' },
] as const;

export const FREE_KICK_SHOT_TYPES = [
  { value: 'off-the-hands', label: 'Off The Hands' },
  { value: 'off-the-ground', label: 'Off The Ground' },
] as const;

export function getShotTypeOptions(category: ShotCategoryType) {
  if (category === 'in-play') return IN_PLAY_SHOT_TYPES;
  if (category === 'free-kick') return FREE_KICK_SHOT_TYPES;
  return []; // 45 and sideline have no sub-type
}

export function getDefaultShotType(category: ShotCategoryType): string {
  if (category === 'in-play') return 'not-defined';
  if (category === 'free-kick') return 'off-the-hands';
  return '';
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useShots() {
  const currentSession = useSessionStore((s) => s.currentSession);
  const updateSession = useSessionStore((s) => s.updateSession);

  // Shot control state
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('single');
  const [foot, setFoot] = useState<FootType>('right');
  const [half, setHalf] = useState<HalfType>('1st');
  const [shotFor, setShotFor] = useState<ShotForType>('point');
  const [shotCategory, setShotCategory] = useState<ShotCategoryType>('in-play');
  const [shotType, setShotType] = useState<string>('not-defined');

  // Pending shot (placed on pitch, awaiting scored/missed)
  const [pendingShot, setPendingShot] = useState<PendingShot | null>(null);
  const [batchPending, setBatchPending] = useState<PendingShot | null>(null);

  // Batch modal
  const [batchModalOpen, setBatchModalOpen] = useState(false);

  // Miss details modal
  const [missModalOpen, setMissModalOpen] = useState(false);
  const [missModalIsNew, setMissModalIsNew] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);

  // Session notes modal
  const [notesModalOpen, setNotesModalOpen] = useState(false);

  // Drag state (refs to avoid re-renders during drag)
  const isDraggingRef = useRef(false);

  // -------------------------------------------------------------------------
  // Shot category change (reset shot type)
  // -------------------------------------------------------------------------
  const changeShotCategory = useCallback((cat: ShotCategoryType) => {
    setShotCategory(cat);
    setShotType(getDefaultShotType(cat));
  }, []);

  // -------------------------------------------------------------------------
  // Shot type change (if fisted, set foot to fisted)
  // -------------------------------------------------------------------------
  const changeShotType = useCallback((type: string) => {
    setShotType(type);
    if (type === 'fisted') {
      setFoot('fisted');
    }
  }, []);

  // -------------------------------------------------------------------------
  // Create pending shot (from pitch click)
  // -------------------------------------------------------------------------
  const createPendingShot = useCallback(
    (xPct: number, yPct: number) => {
      if (!currentSession) return;
      if (isDraggingRef.current) return;

      const { distance } = calculateDistance(xPct, yPct);
      const pending: PendingShot = {
        x: xPct,
        y: yPct,
        distance,
        foot,
        half,
        shotFor,
        shotCategory,
        shotType,
      };

      if (trackingMode === 'single') {
        setPendingShot(pending);
        setBatchPending(null);
      } else {
        setBatchPending(pending);
        setPendingShot(null);
      }
    },
    [currentSession, foot, half, shotFor, shotCategory, shotType, trackingMode],
  );

  // -------------------------------------------------------------------------
  // Update pending position (from drag)
  // -------------------------------------------------------------------------
  const updatePendingPosition = useCallback(
    (xPct: number, yPct: number) => {
      const { distance } = calculateDistance(xPct, yPct);
      if (pendingShot) {
        setPendingShot((prev) => (prev ? { ...prev, x: xPct, y: yPct, distance } : null));
      }
      if (batchPending) {
        setBatchPending((prev) => (prev ? { ...prev, x: xPct, y: yPct, distance } : null));
      }
    },
    [pendingShot, batchPending],
  );

  // -------------------------------------------------------------------------
  // Mark last shot (scored or missed)
  // -------------------------------------------------------------------------
  const markShot = useCallback(
    (result: 'scored' | 'missed', extraFields?: Partial<Shot>) => {
      if (!pendingShot || !currentSession) return;
      const shot: Shot = {
        x: pendingShot.x,
        y: pendingShot.y,
        distance: pendingShot.distance,
        foot: pendingShot.foot,
        half: pendingShot.half,
        shotFor: pendingShot.shotFor,
        shotCategory: pendingShot.shotCategory,
        shotType: pendingShot.shotType,
        pointValue: getPointValue(pendingShot),
        result,
        timestamp: new Date().toISOString(),
        comment: '',
        batch: false,
        missResult: undefined,
        missReason: undefined,
        ...extraFields,
      };

      const updatedShots = [...(currentSession.shots ?? []), shot];
      updateSession(currentSession.id, { shots: updatedShots });
      setPendingShot(null);
    },
    [pendingShot, currentSession, updateSession],
  );

  // -------------------------------------------------------------------------
  // Confirm batch shots
  // -------------------------------------------------------------------------
  const confirmBatch = useCallback(
    (leftTotal: number, leftScored: number, rightTotal: number, rightScored: number) => {
      if (!batchPending || !currentSession) return;

      const shots: Shot[] = [];
      const pointValue = getPointValue(batchPending);
      const base = {
        x: batchPending.x,
        y: batchPending.y,
        distance: batchPending.distance,
        half: batchPending.half,
        shotFor: batchPending.shotFor,
        shotCategory: batchPending.shotCategory,
        shotType: batchPending.shotType,
        pointValue,
        batch: true,
        comment: '',
      };

      // Left foot shots
      for (let i = 0; i < leftScored; i++) {
        shots.push({ ...base, foot: 'left', result: 'scored', timestamp: new Date().toISOString() });
      }
      for (let i = 0; i < leftTotal - leftScored; i++) {
        shots.push({ ...base, foot: 'left', result: 'missed', timestamp: new Date().toISOString() });
      }
      // Right foot shots
      for (let i = 0; i < rightScored; i++) {
        shots.push({ ...base, foot: 'right', result: 'scored', timestamp: new Date().toISOString() });
      }
      for (let i = 0; i < rightTotal - rightScored; i++) {
        shots.push({ ...base, foot: 'right', result: 'missed', timestamp: new Date().toISOString() });
      }

      const updatedShots = [...(currentSession.shots ?? []), ...shots];
      updateSession(currentSession.id, { shots: updatedShots });
      setBatchPending(null);
      setBatchModalOpen(false);
    },
    [batchPending, currentSession, updateSession],
  );

  // -------------------------------------------------------------------------
  // Undo last shot
  // -------------------------------------------------------------------------
  const undoLastShot = useCallback(() => {
    // If there's a pending shot, just clear it
    if (pendingShot) {
      setPendingShot(null);
      return;
    }
    if (batchPending) {
      setBatchPending(null);
      return;
    }
    // Otherwise remove the last recorded shot
    if (currentSession && currentSession.shots && currentSession.shots.length > 0) {
      if (window.confirm('Remove last shot?')) {
        const updatedShots = currentSession.shots.slice(0, -1);
        updateSession(currentSession.id, { shots: updatedShots });
      }
    }
  }, [pendingShot, batchPending, currentSession, updateSession]);

  // -------------------------------------------------------------------------
  // Miss details modal
  // -------------------------------------------------------------------------
  const openMissModal = useCallback((isNew: boolean, shot?: Shot) => {
    setMissModalIsNew(isNew);
    setEditingShot(shot ?? null);
    setMissModalOpen(true);
  }, []);

  const closeMissModal = useCallback(() => {
    setMissModalOpen(false);
    setEditingShot(null);
  }, []);

  const saveMissDetails = useCallback(
    (missResult: string | null, missReason: string | null, comment: string) => {
      if (missModalIsNew) {
        // Mark the pending shot as missed with extra fields
        markShot('missed', { missResult: missResult ?? undefined, missReason: missReason ?? undefined, comment });
      } else if (editingShot && currentSession) {
        // Update existing shot in array
        const updatedShots = (currentSession.shots ?? []).map((s) => {
          if (s === editingShot || (s.timestamp === editingShot.timestamp && s.x === editingShot.x && s.y === editingShot.y)) {
            return { ...s, missResult: missResult ?? undefined, missReason: missReason ?? undefined, comment };
          }
          return s;
        });
        updateSession(currentSession.id, { shots: updatedShots });
      }
      closeMissModal();
    },
    [missModalIsNew, editingShot, currentSession, markShot, updateSession, closeMissModal],
  );

  // -------------------------------------------------------------------------
  // Cancel pending
  // -------------------------------------------------------------------------
  const cancelPending = useCallback(() => {
    setPendingShot(null);
    setBatchPending(null);
  }, []);

  return {
    // Controls
    trackingMode,
    setTrackingMode,
    foot,
    setFoot,
    half,
    setHalf,
    shotFor,
    setShotFor,
    shotCategory,
    changeShotCategory,
    shotType,
    changeShotType,

    // Pending shot
    pendingShot,
    batchPending,
    createPendingShot,
    updatePendingPosition,
    cancelPending,
    isDraggingRef,

    // Result actions
    markShot,
    undoLastShot,
    hasPending: !!pendingShot,

    // Batch
    batchModalOpen,
    setBatchModalOpen,
    confirmBatch,

    // Miss details
    missModalOpen,
    missModalIsNew,
    editingShot,
    openMissModal,
    closeMissModal,
    saveMissDetails,

    // Session notes
    notesModalOpen,
    setNotesModalOpen,
  };
}
