'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/store/sessionStore';
import { useDrillStore } from '@/store/drillStore';
import { useShots } from '@/hooks/useShots';
import { useDrills, calculateScoringZoneSpots, BUILT_IN_TEMPLATES } from '@/hooks/useDrills';
import { usePracticeFlow } from '@/hooks/usePracticeFlow';
import { PitchInteraction } from '@/components/pitch';
import {
  SessionControls,
  ShotControls,
  ResultButtons,
  BatchModal,
  MissDetailsModal,
  SessionNotesModal,
  SpotScoreModal,
  AddDrillScreen,
  DrillSummaryScreen,
  PracticeSessionSummary,
} from '@/components/tracking';
import {
  DrillBanner,
  DrillSpots,
  DrillTemplateList,
  SaveDrillModal,
} from '@/components/drills';
import { SvgPitch } from '@/components/pitch';

export default function TrackPage() {
  return (
    <Suspense>
      <TrackPageContent />
    </Suspense>
  );
}

function TrackPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSessionType = (searchParams.get('type') === 'match' ? 'match' : 'practice') as import('@/types').SessionType;
  const currentSession = useSessionStore((s) => s.currentSession);
  const setCurrentSession = useSessionStore((s) => s.setCurrentSession);
  const addSession = useSessionStore((s) => s.addSession);

  const shots = useShots();
  const drills = useDrills();
  const practiceFlow = usePracticeFlow();

  const isMatch = currentSession?.type === 'match';
  const isPractice = currentSession?.type === 'practice';
  const sessionActive = !!currentSession;
  const isPracticeUrl = urlSessionType === 'practice';

  // Practice start form state
  const [practiceSessionName, setPracticeSessionName] = useState('');
  const [practiceSessionDate, setPracticeSessionDate] = useState(() => new Date().toISOString().split('T')[0]);

  // -------------------------------------------------------------------------
  // Delete current session
  // -------------------------------------------------------------------------
  const handleDeleteSession = useCallback(() => {
    if (!currentSession) return;
    if (!window.confirm('Delete this session? This cannot be undone.')) return;

    // removeSession triggers cloud delete via subscription in useCloudSync
    if (currentSession.cloudId || currentSession.id) {
      const store = useSessionStore.getState();
      store.removeSession(currentSession.id);
    }

    setCurrentSession(null);
    drills.clearTemplate();
    practiceFlow.discardPracticeSession();
    router.push('/');
  }, [currentSession, setCurrentSession, drills, practiceFlow, router]);

  // -------------------------------------------------------------------------
  // End session flow — match mode (opens notes modal, then saves)
  // -------------------------------------------------------------------------
  const handleEndSession = useCallback(() => {
    shots.setNotesModalOpen(true);
  }, [shots]);

  const handleSaveNotes = useCallback(
    (data: { notes: string; didWell: string; toImprove: string; windDirection: string; windStrength: string }) => {
      if (!currentSession) return;
      const finalSession = {
        ...currentSession,
        endTime: new Date().toISOString(),
        notes: data.notes || undefined,
        didWell: data.didWell || undefined,
        toImprove: data.toImprove || undefined,
        windDirection: data.windDirection !== 'no-wind' ? data.windDirection : undefined,
        windStrength: data.windDirection !== 'no-wind' ? data.windStrength : undefined,
      };
      addSession(finalSession);
      setCurrentSession(null);
      drills.clearTemplate();
      shots.setNotesModalOpen(false);
    },
    [currentSession, addSession, setCurrentSession, drills, shots],
  );

  const handleSkipNotes = useCallback(() => {
    if (!currentSession) return;
    addSession({ ...currentSession, endTime: new Date().toISOString() });
    setCurrentSession(null);
    drills.clearTemplate();
    shots.setNotesModalOpen(false);
  }, [currentSession, addSession, setCurrentSession, drills, shots]);

  // -------------------------------------------------------------------------
  // Practice flow: start drill handler
  // -------------------------------------------------------------------------
  const handleStartDrill = useCallback(
    (config: {
      drillType: import('@/types').PracticeDrillType;
      distance: number | null;
      foot: 'left' | 'right' | 'both';
      stance: string;
      shotCategory: string;
      totalShots?: number;
      templateId?: string;
    }) => {
      // If scoring-arc, also activate the template
      if (config.drillType === 'scoring-arc') {
        const scoringTemplate = BUILT_IN_TEMPLATES.find((t) => t.id === 'scoring-zones');
        if (scoringTemplate) {
          drills.setDrillSettings({
            distance: config.distance || 20,
            shotType: config.stance || 'free-kick',
            footOption: config.foot,
            totalShots: config.totalShots || 20,
          });
          drills.selectTemplate(scoringTemplate);
        }
      }

      practiceFlow.startDrill({
        drillType: config.drillType,
        distance: config.distance,
        foot: config.foot,
        stance: config.stance,
        shotCategory: config.shotCategory,
        templateId: config.templateId || (config.drillType === 'scoring-arc' ? 'scoring-zones' : null),
      });
    },
    [drills, practiceFlow],
  );

  // -------------------------------------------------------------------------
  // Practice flow: save drill (wraps practiceFlow.saveDrill)
  // -------------------------------------------------------------------------
  const handleSaveDrill = useCallback(() => {
    practiceFlow.saveDrill();
  }, [practiceFlow]);

  // -------------------------------------------------------------------------
  // Drill template management
  // -------------------------------------------------------------------------
  const handleDeleteCustomDrill = useCallback(
    (id: string) => {
      const { removeCustomDrill } = useDrillStore.getState();
      removeCustomDrill(id);
    },
    [],
  );

  const handleSaveCustomDrill = useCallback(
    (data: { name: string; description: string; skillset: string; spots: import('@/types').DrillSpot[] }) => {
      const { addCustomDrill } = useDrillStore.getState();
      addCustomDrill({
        id: `custom-${Date.now()}`,
        name: data.name,
        description: data.description,
        skillset: data.skillset,
        spots: data.spots,
        isDynamic: false,
        isCustom: true,
        customDrillId: String(Date.now()),
      });
      drills.setSaveDrillModalOpen(false);
    },
    [drills],
  );

  // -------------------------------------------------------------------------
  // Drill finish handler (for DrillBanner "Finish" button in practice flow)
  // -------------------------------------------------------------------------
  const handleDrillFinish = useCallback(() => {
    if (practiceFlow.practiceFlowState === 'tracking' && practiceFlow.currentDrill) {
      // In multi-drill mode, save the drill instead of just clearing template
      handleSaveDrill();
    } else {
      drills.clearTemplate();
    }
  }, [practiceFlow, handleSaveDrill, drills]);

  // -------------------------------------------------------------------------
  // Preview spots
  // -------------------------------------------------------------------------
  const previewSpots = useMemo(() => {
    if (!drills.previewingTemplateId) return [];
    const allTemplates = [...drills.drillList.builtIn, ...drills.drillList.custom];
    const template = allTemplates.find((t) => t.id === drills.previewingTemplateId);
    if (!template) return [];
    if (template.isDynamic) {
      return calculateScoringZoneSpots(drills.drillSettings.distance);
    }
    return template.spots ?? [];
  }, [drills.previewingTemplateId, drills.drillList, drills.drillSettings.distance]);

  // -------------------------------------------------------------------------
  // Active drill spot progress
  // -------------------------------------------------------------------------
  const activeProgress = useMemo(() => {
    if (!drills.activeProgressKey) return {};
    return drills.drillProgress[drills.activeProgressKey] || {};
  }, [drills.activeProgressKey, drills.drillProgress]);

  // =========================================================================
  // PRACTICE MODE RENDERING
  // =========================================================================
  if (isPracticeUrl) {
    // No active session — show practice start form
    if (!sessionActive) {
      return (
        <div className="space-y-4">
          <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-text">New Practice Session</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Session Name</label>
                <input
                  type="text"
                  value={practiceSessionName}
                  onChange={(e) => setPracticeSessionName(e.target.value)}
                  placeholder="e.g., Training – Monday"
                  className="w-full bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Date</label>
                <input
                  type="date"
                  value={practiceSessionDate}
                  onChange={(e) => setPracticeSessionDate(e.target.value)}
                  className="w-full bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
            </div>
            <button
              onClick={() => practiceFlow.startPracticeSession(practiceSessionName, practiceSessionDate)}
              className="w-full py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
            >
              Start Session
            </button>
          </div>

          {/* Empty pitch preview */}
          <div className="opacity-60 pointer-events-none">
            <SvgPitch />
          </div>
        </div>
      );
    }

    // Active practice session — render based on flow state
    const flowState = practiceFlow.practiceFlowState;

    // Session banner (shown in add-drill, tracking, drill-summary)
    const sessionBanner = flowState !== 'session-summary' && (
      <div className="bg-primary text-white rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{currentSession!.name}</div>
            <div className="text-xs opacity-80">
              practice · {currentSession!.date} · {(currentSession!.shots ?? []).length} shots · {practiceFlow.currentDrills.length} drill{practiceFlow.currentDrills.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {flowState === 'tracking' && (
              <button
                onClick={handleSaveDrill}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#4CAF50] hover:bg-[#388E3C] transition-colors"
              >
                Save Drill
              </button>
            )}
            <button
              onClick={practiceFlow.endPracticeSession}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors"
            >
              End Session
            </button>
            <button
              onClick={handleDeleteSession}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/30 hover:bg-red-500/50 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );

    return (
      <div className="space-y-4">
        {sessionBanner}

        {/* Add Drill screen */}
        {flowState === 'add-drill' && (
          <AddDrillScreen
            drillNumber={practiceFlow.currentDrills.length + 1}
            onStartDrill={handleStartDrill}
            onEndSession={practiceFlow.endPracticeSession}
          />
        )}

        {/* Tracking screen (pitch + controls) */}
        {flowState === 'tracking' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
            {/* Left column: Pitch */}
            <div className="space-y-3">
              {/* Drill banner for scoring-arc drills */}
              {drills.activeTemplate && (
                <DrillBanner
                  template={drills.activeTemplate}
                  settings={drills.drillSettings}
                  completedSpots={drills.progressSummary.completedSpots}
                  totalSpots={drills.progressSummary.totalSpots}
                  totalScored={drills.progressSummary.totalScored}
                  totalAttempted={drills.progressSummary.totalAttempted}
                  percentage={drills.progressSummary.percentage}
                  isComplete={drills.progressSummary.isComplete}
                  targetMet={drills.progressSummary.targetMet}
                  nextDistance={drills.nextDistance}
                  onFinish={handleDrillFinish}
                  onReset={drills.resetDrillProgress}
                  onClose={handleSaveDrill}
                />
              )}

              {/* Pitch */}
              {drills.activeTemplate ? (
                <div className="relative">
                  <SvgPitch onPitchClick={() => {}}>
                    <DrillSpots
                      spots={drills.activeSpots}
                      progress={activeProgress}
                      settings={drills.drillSettings}
                      onSpotClick={drills.openSpotScoreModal}
                    />
                  </SvgPitch>
                </div>
              ) : (
                <PitchInteraction
                  shots={currentSession!.shots ?? []}
                  pendingShot={shots.pendingShot}
                  batchPending={shots.batchPending}
                  isMatch={false}
                  half={shots.half}
                  isDraggingRef={shots.isDraggingRef}
                  onPitchClick={shots.createPendingShot}
                  onDragUpdate={shots.updatePendingPosition}
                  onHalfChange={shots.setHalf}
                  onBatchOpen={() => shots.setBatchModalOpen(true)}
                />
              )}
            </div>

            {/* Right column: Shot controls */}
            <div className="flex flex-col gap-3 lg:max-h-[calc(100vh-140px)]">
              {!drills.activeTemplate && (
                <div className="bg-surface rounded-2xl p-3 shadow-sm space-y-3 shrink-0">
                  <ShotControls
                    isMatch={false}
                    foot={shots.foot}
                    half={shots.half}
                    shotFor={shots.shotFor}
                    shotCategory={shots.shotCategory}
                    shotType={shots.shotType}
                    onFootChange={shots.setFoot}
                    onHalfChange={shots.setHalf}
                    onShotForChange={shots.setShotFor}
                    onShotCategoryChange={shots.changeShotCategory}
                    onShotTypeChange={shots.changeShotType}
                  />

                  <ResultButtons
                    hasPending={shots.hasPending}
                    trackingMode={shots.trackingMode}
                    onTrackingModeChange={shots.setTrackingMode}
                    onScored={() => shots.markShot('scored')}
                    onMissed={() => shots.markShot('missed')}
                    onMissedWithDetails={() => shots.openMissModal(true)}
                    onUndo={shots.undoLastShot}
                    isMatch={false}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Drill Summary screen */}
        {flowState === 'drill-summary' && practiceFlow.lastCompletedDrill && (
          <DrillSummaryScreen
            drill={practiceFlow.lastCompletedDrill}
            onAddAnother={practiceFlow.addAnotherDrill}
            onEndSession={practiceFlow.endPracticeSession}
          />
        )}

        {/* Session Summary screen */}
        {flowState === 'session-summary' && currentSession && (
          <PracticeSessionSummary
            session={currentSession}
            drills={practiceFlow.currentDrills}
            totalShots={practiceFlow.sessionTotals.totalShots}
            totalScored={practiceFlow.sessionTotals.totalScored}
            percentage={practiceFlow.sessionTotals.percentage}
            onSave={practiceFlow.savePracticeSession}
            onDiscard={() => {
              if (window.confirm('Discard this practice session? All data will be lost.')) {
                practiceFlow.discardPracticeSession();
              }
            }}
          />
        )}

        {/* Modals (always available) */}
        <BatchModal
          open={shots.batchModalOpen}
          onConfirm={shots.confirmBatch}
          onClose={() => shots.setBatchModalOpen(false)}
        />

        <MissDetailsModal
          open={shots.missModalOpen}
          isNewShot={shots.missModalIsNew}
          initialMissResult={shots.editingShot?.missResult}
          initialMissReason={shots.editingShot?.missReason}
          initialComment={shots.editingShot?.comment}
          onSave={shots.saveMissDetails}
          onClose={shots.closeMissModal}
        />

        <SpotScoreModal
          open={drills.spotModalOpen}
          spot={drills.spotModalSpot}
          settings={drills.drillSettings}
          existingScore={
            drills.spotModalSpot && drills.activeProgressKey
              ? drills.drillProgress[drills.activeProgressKey]?.[drills.spotModalSpot.id]
              : undefined
          }
          onSave={drills.saveSpotScore}
          onClear={drills.clearSpotScore}
          onClose={drills.closeSpotScoreModal}
        />

        <SaveDrillModal
          open={drills.saveDrillModalOpen}
          shots={currentSession?.shots ?? []}
          onSave={handleSaveCustomDrill}
          onClose={() => drills.setSaveDrillModalOpen(false)}
        />
      </div>
    );
  }

  // =========================================================================
  // MATCH MODE RENDERING (unchanged)
  // =========================================================================
  return (
    <div className="space-y-4">
      {/* Session controls (start form or active banner) */}
      <SessionControls
        sessionType={urlSessionType}
        onSessionStarted={() => {}}
        onEndSession={handleEndSession}
        onDeleteSession={handleDeleteSession}
      />

      {/* Empty pitch preview before session starts */}
      {!sessionActive && (
        <div className="opacity-60 pointer-events-none">
          <SvgPitch />
        </div>
      )}

      {/* Main content: pitch + controls (only when session is active) */}
      {sessionActive && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* Left column: Pitch */}
          <div className="space-y-3">
            {/* Active drill banner */}
            {drills.activeTemplate && (
              <DrillBanner
                template={drills.activeTemplate}
                settings={drills.drillSettings}
                completedSpots={drills.progressSummary.completedSpots}
                totalSpots={drills.progressSummary.totalSpots}
                totalScored={drills.progressSummary.totalScored}
                totalAttempted={drills.progressSummary.totalAttempted}
                percentage={drills.progressSummary.percentage}
                isComplete={drills.progressSummary.isComplete}
                targetMet={drills.progressSummary.targetMet}
                nextDistance={drills.nextDistance}
                onFinish={() => drills.clearTemplate()}
                onReset={drills.resetDrillProgress}
                onClose={drills.clearTemplate}
              />
            )}

            {/* Pitch with drill spots or shot tracking */}
            {drills.activeTemplate ? (
              <div className="relative">
                <SvgPitch onPitchClick={() => {}}>
                  <DrillSpots
                    spots={drills.activeSpots}
                    progress={activeProgress}
                    settings={drills.drillSettings}
                    onSpotClick={drills.openSpotScoreModal}
                  />
                </SvgPitch>
              </div>
            ) : previewSpots.length > 0 ? (
              <div className="relative">
                <SvgPitch onPitchClick={() => {}}>
                  <DrillSpots
                    spots={previewSpots}
                    progress={{}}
                    settings={drills.drillSettings}
                    onSpotClick={() => {}}
                  />
                </SvgPitch>
              </div>
            ) : (
              <PitchInteraction
                shots={currentSession!.shots ?? []}
                pendingShot={shots.pendingShot}
                batchPending={shots.batchPending}
                isMatch={isMatch}
                half={shots.half}
                isDraggingRef={shots.isDraggingRef}
                onPitchClick={shots.createPendingShot}
                onDragUpdate={shots.updatePendingPosition}
                onHalfChange={shots.setHalf}
                onBatchOpen={() => shots.setBatchModalOpen(true)}
              />
            )}
          </div>

          {/* Right column: Shot controls + Drills */}
          <div className="flex flex-col gap-3 lg:max-h-[calc(100vh-140px)]">
            {!drills.activeTemplate && (
              <div className="bg-surface rounded-2xl p-3 shadow-sm space-y-3 shrink-0">
                <ShotControls
                  isMatch={isMatch}
                  foot={shots.foot}
                  half={shots.half}
                  shotFor={shots.shotFor}
                  shotCategory={shots.shotCategory}
                  shotType={shots.shotType}
                  onFootChange={shots.setFoot}
                  onHalfChange={shots.setHalf}
                  onShotForChange={shots.setShotFor}
                  onShotCategoryChange={shots.changeShotCategory}
                  onShotTypeChange={shots.changeShotType}
                />

                <ResultButtons
                  hasPending={shots.hasPending}
                  trackingMode={shots.trackingMode}
                  onTrackingModeChange={shots.setTrackingMode}
                  onScored={() => shots.markShot('scored')}
                  onMissed={() => shots.markShot('missed')}
                  onMissedWithDetails={() => shots.openMissModal(true)}
                  onUndo={shots.undoLastShot}
                  isMatch={isMatch}
                />
              </div>
            )}

            {isPractice && (
              <div className="bg-surface rounded-2xl p-3 shadow-sm overflow-y-auto flex-1 min-h-0">
                <h3 className="text-sm font-bold text-text mb-2">Practice Drills</h3>
                <DrillTemplateList
                  drillList={drills.drillList}
                  activeTemplate={drills.activeTemplate}
                  expandedDrillId={drills.expandedDrillId}
                  previewingTemplateId={drills.previewingTemplateId}
                  drillSettings={drills.drillSettings}
                  drillProgress={drills.drillProgress}
                  currentSkillsetFilter={drills.currentSkillsetFilter}
                  onFilterChange={drills.setCurrentSkillsetFilter}
                  onToggleExpand={drills.toggleDrillExpand}
                  onSelectTemplate={drills.selectTemplate}
                  onTogglePreview={drills.togglePreview}
                  onSettingsChange={drills.setDrillSettings}
                  onDeleteCustomDrill={handleDeleteCustomDrill}
                  onOpenSaveDrill={() => drills.setSaveDrillModalOpen(true)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <BatchModal
        open={shots.batchModalOpen}
        onConfirm={shots.confirmBatch}
        onClose={() => shots.setBatchModalOpen(false)}
      />

      <MissDetailsModal
        open={shots.missModalOpen}
        isNewShot={shots.missModalIsNew}
        initialMissResult={shots.editingShot?.missResult}
        initialMissReason={shots.editingShot?.missReason}
        initialComment={shots.editingShot?.comment}
        onSave={shots.saveMissDetails}
        onClose={shots.closeMissModal}
      />

      <SessionNotesModal
        open={shots.notesModalOpen}
        onSave={handleSaveNotes}
        onSkip={handleSkipNotes}
        onClose={() => shots.setNotesModalOpen(false)}
      />

      <SpotScoreModal
        open={drills.spotModalOpen}
        spot={drills.spotModalSpot}
        settings={drills.drillSettings}
        existingScore={
          drills.spotModalSpot && drills.activeProgressKey
            ? drills.drillProgress[drills.activeProgressKey]?.[drills.spotModalSpot.id]
            : undefined
        }
        onSave={drills.saveSpotScore}
        onClear={drills.clearSpotScore}
        onClose={drills.closeSpotScoreModal}
      />

      <SaveDrillModal
        open={drills.saveDrillModalOpen}
        shots={currentSession?.shots ?? []}
        onSave={handleSaveCustomDrill}
        onClose={() => drills.setSaveDrillModalOpen(false)}
      />
    </div>
  );
}
