'use client';

import { useCallback, useMemo } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useShots } from '@/hooks/useShots';
import { useDrills, calculateScoringZoneSpots } from '@/hooks/useDrills';
import { PitchInteraction } from '@/components/pitch';
import {
  SessionControls,
  ShotControls,
  ResultButtons,
  BatchModal,
  MissDetailsModal,
  SessionNotesModal,
  SpotScoreModal,
} from '@/components/tracking';
import {
  DrillBanner,
  DrillSpots,
  DrillTemplateList,
  SaveDrillModal,
} from '@/components/drills';
import { SvgPitch } from '@/components/pitch';

export default function TrackPage() {
  const currentSession = useSessionStore((s) => s.currentSession);
  const setCurrentSession = useSessionStore((s) => s.setCurrentSession);
  const addSession = useSessionStore((s) => s.addSession);

  const shots = useShots();
  const drills = useDrills();

  const isMatch = currentSession?.type === 'match';
  const isPractice = currentSession?.type === 'practice';
  const sessionActive = !!currentSession;

  // -------------------------------------------------------------------------
  // End session flow (opens notes modal, then saves)
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
  // Drill template management
  // -------------------------------------------------------------------------
  const handleDeleteCustomDrill = useCallback(
    (id: string) => {
      // TODO: delete from Supabase
      const { removeCustomDrill } = require('@/store/drillStore').useDrillStore.getState();
      removeCustomDrill(id);
    },
    [],
  );

  const handleSaveCustomDrill = useCallback(
    (data: { name: string; description: string; skillset: string; spots: import('@/types').DrillSpot[] }) => {
      // TODO: save to Supabase
      const { addCustomDrill } = require('@/store/drillStore').useDrillStore.getState();
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
  // Drill finish handler
  // -------------------------------------------------------------------------
  const handleDrillFinish = useCallback(() => {
    drills.clearTemplate();
  }, [drills]);

  // -------------------------------------------------------------------------
  // Preview spots (shown when previewing a template on the pitch)
  // -------------------------------------------------------------------------
  const previewSpots = useMemo(() => {
    if (!drills.previewingTemplateId) return [];
    // Find the template
    const allTemplates = [...drills.drillList.builtIn, ...drills.drillList.custom];
    const template = allTemplates.find((t) => t.id === drills.previewingTemplateId);
    if (!template) return [];
    if (template.isDynamic) {
      return calculateScoringZoneSpots(drills.drillSettings.distance);
    }
    return template.spots ?? [];
  }, [drills.previewingTemplateId, drills.drillList, drills.drillSettings.distance]);

  // -------------------------------------------------------------------------
  // Active drill spot progress lookup
  // -------------------------------------------------------------------------
  const activeProgress = useMemo(() => {
    if (!drills.activeProgressKey) return {};
    return drills.drillProgress[drills.activeProgressKey] || {};
  }, [drills.activeProgressKey, drills.drillProgress]);

  return (
    <div className="space-y-4">
      {/* Session controls (start form or active banner) */}
      <SessionControls
        onSessionStarted={() => {}}
        onEndSession={handleEndSession}
      />

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
                onFinish={handleDrillFinish}
                onReset={drills.resetDrillProgress}
                onClose={drills.clearTemplate}
              />
            )}

            {/* Pitch with drill spots or shot tracking */}
            {drills.activeTemplate ? (
              /* Drill mode: pitch with spot markers */
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
              /* Preview mode: pitch with preview markers */
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
              /* Shot tracking mode: interactive pitch */
              <PitchInteraction
                shots={currentSession.shots ?? []}
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
            {/* Shot controls + result buttons (only in non-drill mode) */}
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

            {/* Drill templates (practice mode only) */}
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
