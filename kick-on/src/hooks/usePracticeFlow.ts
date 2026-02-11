'use client';

import { useCallback, useMemo } from 'react';
import { useDrillStore } from '@/store/drillStore';
import { useSessionStore } from '@/store/sessionStore';
import type { PracticeDrill, PracticeDrillType, PracticeFlowState, Session } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DrillConfig {
  drillType: PracticeDrillType;
  distance: number | null;
  foot: 'left' | 'right' | 'both';
  stance: string;
  shotCategory: string;
  assignedDrillId?: string | null;
  templateId?: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePracticeFlow() {
  const currentSession = useSessionStore((s) => s.currentSession);
  const setCurrentSession = useSessionStore((s) => s.setCurrentSession);
  const addSession = useSessionStore((s) => s.addSession);

  const currentDrills = useDrillStore((s) => s.currentDrills);
  const currentDrill = useDrillStore((s) => s.currentDrill);
  const practiceFlowState = useDrillStore((s) => s.practiceFlowState);
  const setCurrentDrills = useDrillStore((s) => s.setCurrentDrills);
  const addCompletedDrill = useDrillStore((s) => s.addCompletedDrill);
  const setCurrentDrill = useDrillStore((s) => s.setCurrentDrill);
  const setPracticeFlowState = useDrillStore((s) => s.setPracticeFlowState);
  const resetPracticeFlow = useDrillStore((s) => s.resetPracticeFlow);
  const setActiveTemplate = useDrillStore((s) => s.setActiveTemplate);
  const setDrillSettings = useDrillStore((s) => s.setDrillSettings);
  const resetDrill = useDrillStore((s) => s.resetDrill);

  // -------------------------------------------------------------------------
  // Start a new practice session (creates session, shows Add Drill screen)
  // -------------------------------------------------------------------------
  const startPracticeSession = useCallback(
    (name: string, date: string) => {
      // If there's already a session, finalise it
      if (currentSession) {
        if (currentSession.shots.length > 0) {
          addSession({ ...currentSession, endTime: new Date().toISOString() });
        }
        setCurrentSession(null);
      }

      const session: Session = {
        id: Date.now(),
        name: name || `Practice - ${date}`,
        date,
        type: 'practice',
        sport: 'football',
        matchType: null,
        shots: [],
        drills: [],
        startTime: new Date().toISOString(),
      };

      setCurrentSession(session);
      setCurrentDrills([]);
      setCurrentDrill(null);
      setPracticeFlowState('add-drill');
    },
    [currentSession, addSession, setCurrentSession, setCurrentDrills, setCurrentDrill, setPracticeFlowState],
  );

  // -------------------------------------------------------------------------
  // Start a drill (transition from add-drill to tracking)
  // -------------------------------------------------------------------------
  const startDrill = useCallback(
    (config: DrillConfig) => {
      if (!currentSession) return;

      const drill: PracticeDrill = {
        id: Date.now(),
        drillOrder: currentDrills.length + 1,
        drillType: config.drillType,
        distance: config.distance,
        foot: config.foot,
        stance: config.stance,
        shotCategory: config.shotCategory,
        shotCount: 0,
        scoredCount: 0,
        assignedDrillId: config.assignedDrillId || null,
        templateId: config.templateId || null,
        shots: [],
        startTime: new Date().toISOString(),
        endTime: null,
      };

      setCurrentDrill(drill);

      // If scoring-arc, configure drill settings and activate template
      if (config.drillType === 'scoring-arc') {
        setDrillSettings({
          distance: config.distance || 20,
          shotType: config.stance || 'free-kick',
          footOption: config.foot,
          totalShots: 20,
        });
        // Template will be activated by the track page
      }

      setPracticeFlowState('tracking');
    },
    [currentSession, currentDrills, setCurrentDrill, setPracticeFlowState, setDrillSettings],
  );

  // -------------------------------------------------------------------------
  // Save the current drill (transition to drill-summary)
  // -------------------------------------------------------------------------
  const saveDrill = useCallback(() => {
    if (!currentDrill || !currentSession) return;

    // Compute stats from shots tagged with this drill's id
    const drillShots = (currentSession.shots ?? []).filter(
      (s) => s.drillId === currentDrill.id,
    );
    const shotCount = drillShots.length;
    const scoredCount = drillShots.filter((s) => s.result === 'scored').length;

    if (shotCount === 0) {
      if (!window.confirm('This drill has no shots. Discard it?')) return;
      setCurrentDrill(null);
      resetDrill();
      setPracticeFlowState('add-drill');
      return;
    }

    const completedDrill: PracticeDrill = {
      ...currentDrill,
      shotCount,
      scoredCount,
      shots: drillShots,
      endTime: new Date().toISOString(),
    };

    addCompletedDrill(completedDrill);

    // Update session drills array
    const updatedDrills = [...(currentSession.drills ?? []), completedDrill];
    // We don't need to update shots — they're already on currentSession.shots

    // Use direct store update to avoid stale closure
    const store = useSessionStore.getState();
    if (store.currentSession) {
      store.updateSession(store.currentSession.id, { drills: updatedDrills });
    }

    setCurrentDrill(null);
    resetDrill();
    setPracticeFlowState('drill-summary');
  }, [currentDrill, currentSession, addCompletedDrill, setCurrentDrill, resetDrill, setPracticeFlowState]);

  // -------------------------------------------------------------------------
  // Add another drill (from drill-summary -> add-drill)
  // -------------------------------------------------------------------------
  const addAnotherDrill = useCallback(() => {
    setPracticeFlowState('add-drill');
  }, [setPracticeFlowState]);

  // -------------------------------------------------------------------------
  // End the practice session (transition to session-summary)
  // -------------------------------------------------------------------------
  const endPracticeSession = useCallback(() => {
    // If there's an active drill with shots, save it first
    if (currentDrill && currentSession) {
      const drillShots = (currentSession.shots ?? []).filter(
        (s) => s.drillId === currentDrill.id,
      );
      if (drillShots.length > 0) {
        const completedDrill: PracticeDrill = {
          ...currentDrill,
          shotCount: drillShots.length,
          scoredCount: drillShots.filter((s) => s.result === 'scored').length,
          shots: drillShots,
          endTime: new Date().toISOString(),
        };
        addCompletedDrill(completedDrill);

        const store = useSessionStore.getState();
        if (store.currentSession) {
          const updatedDrills = [...(store.currentSession.drills ?? []), completedDrill];
          store.updateSession(store.currentSession.id, { drills: updatedDrills });
        }
      }
      setCurrentDrill(null);
      resetDrill();
    }

    setPracticeFlowState('session-summary');
  }, [currentDrill, currentSession, addCompletedDrill, setCurrentDrill, resetDrill, setPracticeFlowState]);

  // -------------------------------------------------------------------------
  // Save the practice session (from session-summary -> done)
  // -------------------------------------------------------------------------
  const savePracticeSession = useCallback(
    (data: {
      name: string;
      notes?: string;
      didWell?: string;
      toImprove?: string;
      windDirection?: string;
      windStrength?: string;
    }) => {
      const store = useSessionStore.getState();
      const session = store.currentSession;
      if (!session) return;

      const finalSession: Session = {
        ...session,
        name: data.name || session.name,
        endTime: new Date().toISOString(),
        notes: data.notes || undefined,
        didWell: data.didWell || undefined,
        toImprove: data.toImprove || undefined,
        windDirection: data.windDirection && data.windDirection !== 'no-wind' ? data.windDirection : undefined,
        windStrength: data.windDirection && data.windDirection !== 'no-wind' ? data.windStrength : undefined,
      };

      addSession(finalSession);
      setCurrentSession(null);
      resetPracticeFlow();
    },
    [addSession, setCurrentSession, resetPracticeFlow],
  );

  // -------------------------------------------------------------------------
  // Discard the practice session
  // -------------------------------------------------------------------------
  const discardPracticeSession = useCallback(() => {
    setCurrentSession(null);
    resetPracticeFlow();
  }, [setCurrentSession, resetPracticeFlow]);

  // -------------------------------------------------------------------------
  // Get the last completed drill (for drill summary screen)
  // -------------------------------------------------------------------------
  const lastCompletedDrill = useMemo(() => {
    if (currentDrills.length === 0) return null;
    return currentDrills[currentDrills.length - 1];
  }, [currentDrills]);

  // -------------------------------------------------------------------------
  // Session totals (for session summary)
  // -------------------------------------------------------------------------
  const sessionTotals = useMemo(() => {
    const allShots = currentSession?.shots ?? [];
    const totalShots = allShots.length;
    const totalScored = allShots.filter((s) => s.result === 'scored').length;
    const percentage = totalShots > 0 ? Math.round((totalScored / totalShots) * 100) : 0;
    return { totalShots, totalScored, percentage };
  }, [currentSession?.shots]);

  return {
    // State
    practiceFlowState,
    currentDrills,
    currentDrill,
    lastCompletedDrill,
    sessionTotals,

    // Actions
    startPracticeSession,
    startDrill,
    saveDrill,
    addAnotherDrill,
    endPracticeSession,
    savePracticeSession,
    discardPracticeSession,
    setPracticeFlowState,
  };
}
