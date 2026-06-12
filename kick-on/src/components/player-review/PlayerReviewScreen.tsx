'use client';

import { useCallback, useEffect, useState, type ReactNode, type MouseEvent } from 'react';
import { SvgPitch } from '@/components/pitch';
import { POSITION_NAMES, formatScoreline, matchResult } from '@/lib/coachMatch';
import {
  EVENT_TYPES,
  EVENT_TYPE_BY_KEY,
  OUTCOME_LABELS,
  SHOT_FOOT_OPTIONS,
  SHOT_CATEGORY_OPTIONS,
  SHOT_RESULT_OPTIONS,
  KICKOUT_RESULT_OPTIONS,
  buildSummary,
  eventColour,
  shotStats,
  kickoutStats,
  totals,
  type OutcomeOption,
} from '@/lib/playerReview';
import {
  insertPlayerEvent,
  deletePlayerEvent,
  updatePlayerEvent,
  flushPendingPlayerEvents,
  loadPlayerEvents,
  markReviewedByCoach,
  pendingPlayerEventCount,
  pendingPlayerEventsFor,
  submitPlayerReview,
} from '@/lib/supabase/playerEvents';
import type { LocalPlayerEvent, PlayerEventType, PlayerGame } from '@/types';

interface PlayerReviewScreenProps {
  game: PlayerGame;
  playerId: string;
  teamName: string;
  /** When set, the screen is operated by a coach editing this player's stats. */
  coachMode?: { playerName: string; coachUserId: string };
  onClose: () => void;
  onReviewed: (coachMatchId: string) => void;
}

interface PendingShot { x: number; y: number; foot: string | null; category: string | null; result: string | null; }
interface PendingKickout { x: number; y: number; result: string | null; }

const RESULT_COLOUR: Record<string, string> = {
  Win: 'text-success',
  Loss: 'text-danger',
  Draw: 'text-warning',
};

const lbl = (v: string | null | undefined) => (v ? OUTCOME_LABELS[v] ?? v : '');

export default function PlayerReviewScreen({
  game,
  playerId,
  teamName,
  coachMode,
  onClose,
  onReviewed,
}: PlayerReviewScreenProps) {
  const matchId = game.match.id;
  const isCoach = !!coachMode;
  const editedBy = coachMode?.coachUserId ?? null;

  const [events, setEvents] = useState<LocalPlayerEvent[]>([]);
  const [selectedStat, setSelectedStat] = useState<PlayerEventType | null>(null);
  const [mapMode, setMapMode] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ x: number; y: number } | null>(null);
  const [pendingShot, setPendingShot] = useState<PendingShot | null>(null);
  const [pendingKickout, setPendingKickout] = useState<PendingKickout | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [relocatingId, setRelocatingId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(game.reviewed);
  const [error, setError] = useState('');

  const isGk = game.position === 'GK';
  const availableTypes = EVENT_TYPES.filter((t) => !t.gkOnly || isGk);

  // ----- load existing events (cloud + still-pending local) -----
  const reload = useCallback(async () => {
    await flushPendingPlayerEvents();
    const cloud = await loadPlayerEvents(matchId, playerId);
    const cloudEvents: LocalPlayerEvent[] = cloud.map((e) => ({
      localId: e.id,
      cloudId: e.id,
      eventType: e.event_type,
      x: e.x_position,
      y: e.y_position,
      outcome: e.outcome,
      assistType: e.assist_type,
      foot: e.foot,
      category: e.shot_category,
      editedBy: e.edited_by,
    }));
    const pending = pendingPlayerEventsFor(matchId, playerId).map((e) => ({
      localId: e.localId,
      eventType: e.eventType,
      x: e.x,
      y: e.y,
      outcome: e.outcome,
      assistType: e.assistType,
      foot: e.foot ?? null,
      category: e.category ?? null,
      editedBy: e.editedBy ?? null,
    }));
    setEvents([...cloudEvents, ...pending]);
    setPendingCount(pendingPlayerEventCount());
  }, [matchId, playerId]);

  useEffect(() => {
    reload();
    const onOnline = () => reload();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [reload]);

  // ----- add -----
  const addEvent = useCallback(
    async (eventType: PlayerEventType, opts: { x?: number; y?: number; outcome?: string; assistType?: string; foot?: string; category?: string }) => {
      const localId = crypto.randomUUID();
      const ev: LocalPlayerEvent = {
        localId,
        eventType,
        x: opts.x ?? null,
        y: opts.y ?? null,
        outcome: opts.outcome ?? null,
        assistType: opts.assistType ?? null,
        foot: opts.foot ?? null,
        category: opts.category ?? null,
        editedBy,
      };
      setEvents((prev) => [...prev, ev]);
      const cloudId = await insertPlayerEvent({
        localId,
        coachMatchId: matchId,
        playerId,
        eventType,
        x: ev.x,
        y: ev.y,
        outcome: ev.outcome,
        assistType: ev.assistType,
        foot: ev.foot,
        category: ev.category,
        editedBy,
      });
      if (cloudId) {
        setEvents((prev) => prev.map((e) => (e.localId === localId ? { ...e, cloudId } : e)));
      }
      setPendingCount(pendingPlayerEventCount());
    },
    [matchId, playerId, editedBy],
  );

  // ----- remove / update (coach edit + undo) -----
  const removeEvent = useCallback(async (ev: LocalPlayerEvent) => {
    setEvents((prev) => prev.filter((e) => e.localId !== ev.localId));
    setSelectedEventId((cur) => (cur === ev.localId ? null : cur));
    await deletePlayerEvent(ev.localId, ev.cloudId);
    setPendingCount(pendingPlayerEventCount());
  }, []);

  const updateEventFields = useCallback(
    async (ev: LocalPlayerEvent, patch: { x?: number | null; y?: number | null; outcome?: string | null; assistType?: string | null; foot?: string | null; category?: string | null }) => {
      const next = { ...ev, ...patch, editedBy };
      setEvents((prev) => prev.map((e) => (e.localId === ev.localId ? next : e)));
      await updatePlayerEvent(ev.localId, ev.cloudId, { ...patch, editedBy });
      setPendingCount(pendingPlayerEventCount());
    },
    [editedBy],
  );

  const decrement = (type: PlayerEventType) => {
    const last = [...events].reverse().find((e) => e.eventType === type);
    if (last) removeEvent(last);
  };

  const undoLast = useCallback(() => {
    setEvents((prev) => {
      const last = prev[prev.length - 1];
      if (last) deletePlayerEvent(last.localId, last.cloudId).then(() => setPendingCount(pendingPlayerEventCount()));
      return prev.slice(0, -1);
    });
  }, []);

  // ----- map interaction -----
  const handlePitchClick = (x: number, y: number) => {
    if (relocatingId) {
      const ev = events.find((e) => e.localId === relocatingId);
      if (ev) updateEventFields(ev, { x, y });
      setRelocatingId(null);
      return;
    }
    if (isCoach && !selectedStat) {
      let nearest: LocalPlayerEvent | null = null;
      let best = Infinity;
      for (const e of events) {
        if (e.x == null || e.y == null) continue;
        const d = (e.x - x) ** 2 + (e.y - y) ** 2;
        if (d < best) { best = d; nearest = e; }
      }
      setSelectedEventId(nearest && best <= 25 ? nearest.localId : null);
      return;
    }
    if (!selectedStat) return;
    if (selectedStat === 'shot') { setPendingShot({ x, y, foot: null, category: null, result: null }); return; }
    if (selectedStat === 'kickout') { setPendingKickout({ x, y, result: null }); return; }
    const cfg = EVENT_TYPE_BY_KEY[selectedStat];
    if (cfg.outcomes.length === 0) addEvent(selectedStat, { x, y });
    else setPendingCoords({ x, y });
  };

  const chooseOutcome = (value: string) => {
    if (!selectedStat || !pendingCoords) return;
    const cfg = EVENT_TYPE_BY_KEY[selectedStat];
    addEvent(selectedStat, {
      x: pendingCoords.x,
      y: pendingCoords.y,
      ...(cfg.usesAssistType ? { assistType: value } : { outcome: value }),
    });
    setPendingCoords(null);
  };

  const saveShot = () => {
    if (!pendingShot || !pendingShot.foot || !pendingShot.category || !pendingShot.result) return;
    addEvent('shot', { x: pendingShot.x, y: pendingShot.y, outcome: pendingShot.result, foot: pendingShot.foot, category: pendingShot.category });
    setPendingShot(null);
  };

  const saveKickout = () => {
    if (!pendingKickout || !pendingKickout.result) return;
    addEvent('kickout', { x: pendingKickout.x, y: pendingKickout.y, outcome: pendingKickout.result });
    setPendingKickout(null);
  };

  const selectStat = (key: PlayerEventType) => {
    const next = selectedStat === key ? null : key;
    setSelectedStat(next);
    setPendingCoords(null);
    setPendingShot(null);
    setPendingKickout(null);
    setSelectedEventId(null);
    setRelocatingId(null);
    if (!isCoach) setMapMode(next === 'shot' || next === 'kickout');
  };

  const beginMove = (ev: LocalPlayerEvent) => {
    setRelocatingId(ev.localId);
    setSelectedEventId(null);
    setSelectedStat(null);
  };

  // Select an existing event for editing (coach), clearing any in-progress placement.
  const selectEventForEdit = (localId: string) => {
    setSelectedStat(null);
    setPendingShot(null);
    setPendingKickout(null);
    setPendingCoords(null);
    setSelectedEventId(localId);
  };

  const incomplete = !!(pendingShot || pendingKickout);

  // ----- submit / save -----
  const handleSubmit = useCallback(async () => {
    if (incomplete) { setError('Finish or cancel the shot/kickout you started first.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await flushPendingPlayerEvents();
      await submitPlayerReview(matchId);
      setSubmitted(true);
      onReviewed(matchId);
    } catch (err) {
      setError('Could not submit review: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  }, [matchId, onReviewed, incomplete]);

  const handleCoachSave = useCallback(async () => {
    if (incomplete) { setError('Finish or cancel the shot/kickout you started first.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await flushPendingPlayerEvents();
      await markReviewedByCoach(matchId, playerId);
      onReviewed(matchId);
      onClose();
    } catch (err) {
      setError('Could not save: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  }, [matchId, playerId, onReviewed, onClose, incomplete]);

  const t = totals(events);
  const shots = shotStats(events);
  const ko = kickoutStats(events);
  const m = game.match;
  const result = matchResult(m.team_score_goals, m.team_score_points, m.opposition_score_goals, m.opposition_score_points);
  const cfg = selectedStat ? EVENT_TYPE_BY_KEY[selectedStat] : null;
  const coordEvents = events.filter((e) => e.x != null && e.y != null);
  const selEvent = isCoach && selectedEventId ? events.find((e) => e.localId === selectedEventId) ?? null : null;
  const placing = pendingCoords ?? pendingShot ?? pendingKickout;

  const statValue = (key: PlayerEventType): string | number =>
    key === 'shot' ? `${shots.scored}/${shots.total}` : key === 'kickout' ? `${ko.won}/${ko.total}` : t[key];

  // ----- markers -----
  const markerProps = (e: LocalPlayerEvent) => ({
    style: isCoach ? ({ cursor: 'pointer' } as const) : undefined,
    onClick: isCoach
      ? (ev: MouseEvent) => { ev.stopPropagation(); selectEventForEdit(e.localId); }
      : undefined,
  });

  const renderMarker = (e: LocalPlayerEvent): ReactNode => {
    const cx = (e.x! / 100) * 500;
    const cy = (e.y! / 100) * 725;
    const sel = selectedEventId === e.localId;
    const stroke = sel ? '#FFD700' : '#fff';
    const sw = sel ? 3 : 1.5;

    if (e.eventType === 'shot') {
      const fill = e.outcome === 'scored' ? '#4CAF50' : '#f44336';
      const title = [lbl(e.foot), lbl(e.category), lbl(e.outcome)].filter(Boolean).join(' · ') || 'Shot';
      if (e.category === 'free-kick') {
        const pts = `${cx},${cy - 8} ${cx - 7},${cy + 6} ${cx + 7},${cy + 6}`;
        return <polygon key={e.localId} points={pts} fill={fill} stroke={stroke} strokeWidth={sw} opacity={0.9} {...markerProps(e)}><title>{title}</title></polygon>;
      }
      return <circle key={e.localId} cx={cx} cy={cy} r={7} fill={fill} stroke={stroke} strokeWidth={sw} opacity={0.9} {...markerProps(e)}><title>{title}</title></circle>;
    }

    if (e.eventType === 'kickout') {
      const fill = e.outcome === 'won' ? '#00BCD4' : '#FB8C00';
      const pts = `${cx},${cy - 8} ${cx + 8},${cy} ${cx},${cy + 8} ${cx - 8},${cy}`;
      return <polygon key={e.localId} points={pts} fill={fill} stroke={stroke} strokeWidth={sw} opacity={0.9} {...markerProps(e)}><title>{lbl(e.outcome) || 'Kickout'}</title></polygon>;
    }

    const tag = e.outcome ?? e.assistType;
    const title = `${EVENT_TYPE_BY_KEY[e.eventType].label}${tag ? ` · ${lbl(tag)}` : ''}`;
    return <circle key={e.localId} cx={cx} cy={cy} r={7} fill={eventColour(e)} stroke={stroke} strokeWidth={sw} opacity={0.9} {...markerProps(e)}><title>{title}</title></circle>;
  };

  // Segmented option row used by the required-field panels.
  const fieldRow = (label: string, options: OutcomeOption[], value: string | null, onPick: (v: string) => void) => (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] font-semibold text-text-muted">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onPick(o.value)}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              value === o.value ? 'border-primary bg-primary text-white' : 'border-grey bg-surface text-text hover:border-primary'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderPlacingControls = (): ReactNode => {
    if (selectedStat === 'shot' && pendingShot) {
      const complete = !!(pendingShot.foot && pendingShot.category && pendingShot.result);
      return (
        <div className="space-y-2 rounded-lg bg-grey-light/50 p-2">
          {fieldRow('Foot', SHOT_FOOT_OPTIONS, pendingShot.foot, (v) => setPendingShot((s) => (s ? { ...s, foot: v } : s)))}
          {fieldRow('Category', SHOT_CATEGORY_OPTIONS, pendingShot.category, (v) => setPendingShot((s) => (s ? { ...s, category: v } : s)))}
          {fieldRow('Result', SHOT_RESULT_OPTIONS, pendingShot.result, (v) => setPendingShot((s) => (s ? { ...s, result: v } : s)))}
          <div className="flex gap-1.5 pt-0.5">
            <button onClick={() => setPendingShot(null)} className="flex-1 rounded-lg bg-grey-light py-1.5 text-xs font-semibold text-text-muted hover:bg-grey">Cancel</button>
            <button onClick={saveShot} disabled={!complete} className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-bold text-white hover:bg-primary-dark disabled:opacity-50">Save shot</button>
          </div>
        </div>
      );
    }
    if (selectedStat === 'kickout' && pendingKickout) {
      return (
        <div className="space-y-2 rounded-lg bg-grey-light/50 p-2">
          {fieldRow('Result', KICKOUT_RESULT_OPTIONS, pendingKickout.result, (v) => setPendingKickout((k) => (k ? { ...k, result: v } : k)))}
          <div className="flex gap-1.5 pt-0.5">
            <button onClick={() => setPendingKickout(null)} className="flex-1 rounded-lg bg-grey-light py-1.5 text-xs font-semibold text-text-muted hover:bg-grey">Cancel</button>
            <button onClick={saveKickout} disabled={!pendingKickout.result} className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-bold text-white hover:bg-primary-dark disabled:opacity-50">Save kickout</button>
          </div>
        </div>
      );
    }
    if (pendingCoords && cfg && cfg.outcomes.length > 0) {
      return (
        <div className="flex flex-wrap justify-center gap-1.5">
          {cfg.outcomes.map((o) => (
            <button key={o.value} onClick={() => chooseOutcome(o.value)} className="rounded-lg border border-grey bg-surface px-3 py-1.5 text-xs font-semibold text-text hover:border-primary hover:bg-primary/5">
              {o.label}
            </button>
          ))}
        </div>
      );
    }
    return null;
  };

  const mapHint = relocatingId
    ? 'Tap the pitch to move the event'
    : selectedStat === 'shot'
      ? 'Tap the pitch where the shot was taken'
      : selectedStat === 'kickout'
        ? 'Tap the pitch where the kickout landed'
        : cfg
          ? pendingCoords ? 'Now choose an outcome below' : cfg.outcomes.length === 0 ? 'Tap the pitch to mark a location' : 'Tap the pitch where it happened'
          : 'Tap a marker to edit it, or pick a stat above to add';

  const renderMap = () => (
    <div>
      <p className="mb-1.5 text-center text-xs text-text-muted">{mapHint}</p>
      <div className="mx-auto max-w-xs">
        <SvgPitch showLabels={false} onPitchClick={handlePitchClick}>
          {coordEvents.map(renderMarker)}
          {placing && (
            <circle cx={(placing.x / 100) * 500} cy={(placing.y / 100) * 725} r={10} fill="none" stroke="#FFD700" strokeWidth={3} />
          )}
        </SvgPitch>
      </div>
      <div className="mt-2">{renderPlacingControls()}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background sm:items-center sm:justify-center sm:bg-black/50 sm:p-4">
      <div className="flex h-full w-full flex-col bg-background sm:h-auto sm:max-h-[94vh] sm:max-w-lg sm:rounded-2xl sm:shadow-xl">
        {/* Header */}
        <div className="shrink-0 border-b border-border bg-primary p-4 text-white sm:rounded-t-2xl">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {isCoach ? (
                <h3 className="truncate text-lg font-bold">Editing stats for {coachMode!.playerName}</h3>
              ) : (
                <h3 className="truncate text-lg font-bold">vs {m.opposition}</h3>
              )}
              <p className="text-xs opacity-80">
                {isCoach ? `vs ${m.opposition} · ` : ''}{m.competition} · {m.match_date}
              </p>
            </div>
            <button onClick={onClose} className="shrink-0 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/25">
              Close
            </button>
          </div>
          <div className="mt-2 text-base font-bold">
            {formatScoreline(teamName, m.team_score_goals, m.team_score_points, m.opposition, m.opposition_score_goals, m.opposition_score_points)}
            <span className={`ml-2 text-xs font-bold ${RESULT_COLOUR[result]} bg-white/90 rounded px-1.5 py-0.5`}>{result}</span>
          </div>
          <div className="mt-1 text-xs opacity-90">
            {isCoach ? 'Position: ' : 'You played: '}
            <span className="font-semibold">{POSITION_NAMES[game.position]}</span>
            {!game.isStarter && game.replacedPlayerName && (
              <span className="block">
                Came on{game.subMinute != null ? ` at ${game.subMinute}'` : ''} for {game.replacedPlayerName}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {pendingCount > 0 && (
            <div className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              {pendingCount} event{pendingCount !== 1 ? 's' : ''} saved offline — will sync when back online.
            </div>
          )}

          {/* Stat type buttons */}
          <div className="grid grid-cols-3 gap-1.5">
            {availableTypes.map((typ) => (
              <button
                key={typ.key}
                onClick={() => selectStat(typ.key)}
                className={`rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors ${
                  selectedStat === typ.key
                    ? 'bg-primary text-white'
                    : 'bg-surface text-text border border-grey-light hover:border-primary'
                }`}
              >
                {typ.label}
                <span className="mt-0.5 block text-sm font-bold">{statValue(typ.key)}</span>
              </button>
            ))}
          </div>

          {/* Selected stat panel */}
          {cfg && (
            <div className="rounded-xl border border-grey-light bg-surface p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-text">
                  {cfg.label}
                  {(cfg.key === 'shot' || cfg.key === 'kickout') && (
                    <span className="ml-1.5 text-[11px] font-medium text-text-muted">— mark on the pitch</span>
                  )}
                </span>
                <div className="flex gap-1.5">
                  {isCoach && (
                    <button onClick={() => decrement(cfg.key)} className="rounded-lg bg-grey-light px-3 py-1.5 text-sm font-bold text-text-muted hover:bg-grey">
                      −1
                    </button>
                  )}
                  {cfg.key !== 'shot' && cfg.key !== 'kickout' && (
                    <button onClick={() => addEvent(cfg.key, {})} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-white hover:bg-primary-dark">
                      +1
                    </button>
                  )}
                  {!isCoach && cfg.key !== 'shot' && cfg.key !== 'kickout' && (
                    <button
                      onClick={() => { setMapMode((v) => !v); setPendingCoords(null); }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        mapMode ? 'bg-primary/15 text-primary' : 'bg-grey-light text-text-muted hover:bg-grey'
                      }`}
                    >
                      {mapMode ? 'Hide map' : 'Mark on map'}
                    </button>
                  )}
                </div>
              </div>

              {/* Player-mode in-panel map */}
              {!isCoach && mapMode && renderMap()}
            </div>
          )}

          {/* Coach-mode always-on map (add + edit existing) */}
          {isCoach && (
            <div className="rounded-xl border border-grey-light bg-surface p-3 space-y-2">
              {renderMap()}

              {/* Edit panel for a selected marker */}
              {selEvent && (
                <div className="space-y-2 rounded-lg bg-grey-light/50 p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text">
                      {EVENT_TYPE_BY_KEY[selEvent.eventType].label}
                      {selEvent.eventType === 'shot'
                        ? ` · ${[lbl(selEvent.foot), lbl(selEvent.category), lbl(selEvent.outcome)].filter(Boolean).join(' · ')}`
                        : selEvent.outcome ? ` · ${lbl(selEvent.outcome)}` : selEvent.assistType ? ` · ${lbl(selEvent.assistType)}` : ''}
                    </span>
                    <button onClick={() => setSelectedEventId(null)} className="text-xs font-semibold text-text-muted">Done</button>
                  </div>

                  {selEvent.eventType === 'shot' ? (
                    <>
                      {fieldRow('Foot', SHOT_FOOT_OPTIONS, selEvent.foot ?? null, (v) => updateEventFields(selEvent, { foot: v }))}
                      {fieldRow('Category', SHOT_CATEGORY_OPTIONS, selEvent.category ?? null, (v) => updateEventFields(selEvent, { category: v }))}
                      {fieldRow('Result', SHOT_RESULT_OPTIONS, selEvent.outcome ?? null, (v) => updateEventFields(selEvent, { outcome: v }))}
                    </>
                  ) : selEvent.eventType === 'kickout' ? (
                    fieldRow('Result', KICKOUT_RESULT_OPTIONS, selEvent.outcome ?? null, (v) => updateEventFields(selEvent, { outcome: v }))
                  ) : EVENT_TYPE_BY_KEY[selEvent.eventType].outcomes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {EVENT_TYPE_BY_KEY[selEvent.eventType].outcomes.map((o) => {
                        const active = selEvent.outcome === o.value || selEvent.assistType === o.value;
                        const usesAssist = EVENT_TYPE_BY_KEY[selEvent.eventType].usesAssistType;
                        return (
                          <button
                            key={o.value}
                            onClick={() => updateEventFields(selEvent, usesAssist ? { assistType: o.value, outcome: null } : { outcome: o.value, assistType: null })}
                            className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${active ? 'border-primary bg-primary text-white' : 'border-grey bg-surface text-text'}`}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  <div className="flex gap-1.5">
                    <button onClick={() => beginMove(selEvent)} className="rounded-lg bg-grey-light px-3 py-1 text-xs font-semibold text-text-muted hover:bg-grey">Move on map</button>
                    <button onClick={() => removeEvent(selEvent)} className="rounded-lg bg-danger/10 px-3 py-1 text-xs font-semibold text-danger hover:bg-danger/20">Delete</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Running totals line */}
          <div className="rounded-xl bg-surface p-3 text-xs text-text-muted shadow-sm">
            <span className="font-semibold text-text">Totals: </span>
            Possessions {t.possession} · Shots {shots.scored}/{shots.total} · TO Won {t.turnover_won} · TO Lost{' '}
            {t.turnover_lost} · Assists {t.assist}
            {isGk && <> · Kickouts {ko.won}/{ko.total}</>}
            {!isCoach && events.length > 0 && (
              <button onClick={undoLast} className="ml-2 font-semibold text-danger hover:underline">
                Undo last
              </button>
            )}
          </div>

          {/* Logged events list */}
          {events.length > 0 && (
            <div className="rounded-xl bg-surface p-3 shadow-sm">
              <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
                Logged ({events.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {events.map((e) => {
                  const label = EVENT_TYPE_BY_KEY[e.eventType].short;
                  const tag = e.eventType === 'shot'
                    ? [lbl(e.foot), lbl(e.category), lbl(e.outcome)].filter(Boolean).join(' ')
                    : e.outcome ? lbl(e.outcome) : e.assistType ? lbl(e.assistType) : null;
                  const edited = !!e.editedBy;
                  if (isCoach) {
                    return (
                      <span
                        key={e.localId}
                        className={`inline-flex items-center gap-1 rounded-full py-0.5 pl-2 pr-1 text-[11px] font-medium text-white ${
                          selectedEventId === e.localId ? 'ring-2 ring-yellow-300' : ''
                        }`}
                        style={{ backgroundColor: eventColour(e) }}
                      >
                        <button onClick={() => selectEventForEdit(e.localId)} className="leading-none">
                          {label}{tag ? ` · ${tag}` : ''}{e.x != null ? ' 📍' : ''}{edited ? ' ✎' : ''}
                        </button>
                        <button onClick={() => removeEvent(e)} aria-label="Delete event" className="rounded-full bg-white/25 px-1 leading-none hover:bg-white/40">
                          ×
                        </button>
                      </span>
                    );
                  }
                  return (
                    <span
                      key={e.localId}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                      style={{ backgroundColor: eventColour(e) }}
                    >
                      {label}{tag ? ` · ${tag}` : ''}{e.x != null ? ' 📍' : ''}{edited ? ' ✎' : ''}
                    </span>
                  );
                })}
              </div>
              {isCoach && events.some((e) => e.editedBy) && (
                <p className="mt-1.5 text-[10px] text-text-muted">✎ = coach-entered/edited</p>
              )}
            </div>
          )}
        </div>

        {/* Footer: summary + submit / save */}
        <div className="shrink-0 space-y-2 border-t border-border bg-surface p-3 sm:rounded-b-2xl">
          <p className="text-center text-xs text-text-muted">
            {events.length > 0 ? buildSummary(events) : 'No events logged yet'}
          </p>
          {incomplete && (
            <p className="text-center text-xs font-semibold text-warning">
              Finish or cancel the {pendingShot ? 'shot' : 'kickout'} you started.
            </p>
          )}
          {error && <p className="text-center text-xs font-semibold text-danger">{error}</p>}
          {isCoach ? (
            <button
              onClick={handleCoachSave}
              disabled={submitting || incomplete}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save & Close'}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || incomplete}
              className={`w-full rounded-xl py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 ${
                submitted ? 'bg-success hover:bg-success/90' : 'bg-primary hover:bg-primary-dark'
              }`}
            >
              {submitting ? 'Submitting…' : submitted ? 'Review Submitted ✓ — Update' : 'Submit Review'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
