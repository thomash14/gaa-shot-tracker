'use client';

import { useCallback, useEffect, useState } from 'react';
import { SvgPitch } from '@/components/pitch';
import { POSITION_NAMES, formatScoreline, matchResult } from '@/lib/coachMatch';
import {
  EVENT_TYPES,
  EVENT_TYPE_BY_KEY,
  OUTCOME_LABELS,
  buildSummary,
  eventColour,
  totals,
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

const RESULT_COLOUR: Record<string, string> = {
  Win: 'text-success',
  Loss: 'text-danger',
  Draw: 'text-warning',
};

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
      editedBy: e.edited_by,
    }));
    const pending = pendingPlayerEventsFor(matchId, playerId).map((e) => ({
      localId: e.localId,
      eventType: e.eventType,
      x: e.x,
      y: e.y,
      outcome: e.outcome,
      assistType: e.assistType,
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
    async (eventType: PlayerEventType, opts: { x?: number; y?: number; outcome?: string; assistType?: string }) => {
      const localId = crypto.randomUUID();
      const ev: LocalPlayerEvent = {
        localId,
        eventType,
        x: opts.x ?? null,
        y: opts.y ?? null,
        outcome: opts.outcome ?? null,
        assistType: opts.assistType ?? null,
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
    async (ev: LocalPlayerEvent, patch: { x?: number | null; y?: number | null; outcome?: string | null; assistType?: string | null }) => {
      const next = { ...ev, ...patch, editedBy };
      setEvents((prev) => prev.map((e) => (e.localId === ev.localId ? next : e)));
      await updatePlayerEvent(ev.localId, ev.cloudId, { ...patch, editedBy });
      setPendingCount(pendingPlayerEventCount());
    },
    [editedBy],
  );

  const changeOutcome = (ev: LocalPlayerEvent, value: string) => {
    const cfg = EVENT_TYPE_BY_KEY[ev.eventType];
    updateEventFields(ev, cfg.usesAssistType ? { assistType: value, outcome: null } : { outcome: value, assistType: null });
  };

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
    // Relocate a selected event
    if (relocatingId) {
      const ev = events.find((e) => e.localId === relocatingId);
      if (ev) updateEventFields(ev, { x, y });
      setRelocatingId(null);
      return;
    }
    // Coach selection mode: no stat picked → tap selects the nearest marker
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

  const selectStat = (key: PlayerEventType) => {
    setSelectedStat((cur) => (cur === key ? null : key));
    setPendingCoords(null);
    setSelectedEventId(null);
    setRelocatingId(null);
    if (!isCoach) setMapMode(false);
  };

  const beginMove = (ev: LocalPlayerEvent) => {
    setRelocatingId(ev.localId);
    setSelectedEventId(null);
    setSelectedStat(null);
  };

  // ----- submit / save -----
  const handleSubmit = useCallback(async () => {
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
  }, [matchId, onReviewed]);

  const handleCoachSave = useCallback(async () => {
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
  }, [matchId, playerId, onReviewed, onClose]);

  const t = totals(events);
  const m = game.match;
  const result = matchResult(m.team_score_goals, m.team_score_points, m.opposition_score_goals, m.opposition_score_points);
  const cfg = selectedStat ? EVENT_TYPE_BY_KEY[selectedStat] : null;
  const coordEvents = events.filter((e) => e.x != null && e.y != null);
  const selEvent = isCoach && selectedEventId ? events.find((e) => e.localId === selectedEventId) ?? null : null;

  const renderMarkers = () =>
    coordEvents.map((e) => (
      <circle
        key={e.localId}
        cx={(e.x! / 100) * 500}
        cy={(e.y! / 100) * 725}
        r={selectedEventId === e.localId ? 9 : 7}
        fill={eventColour(e)}
        stroke={selectedEventId === e.localId ? '#FFD700' : '#fff'}
        strokeWidth={selectedEventId === e.localId ? 3 : 1.5}
        opacity={0.9}
        style={isCoach ? { cursor: 'pointer' } : undefined}
        onClick={isCoach ? (ev) => { ev.stopPropagation(); setSelectedStat(null); setSelectedEventId(e.localId); } : undefined}
      />
    ));

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
                <span className="mt-0.5 block text-sm font-bold">{t[typ.key]}</span>
              </button>
            ))}
          </div>

          {/* Selected stat panel */}
          {cfg && (
            <div className="rounded-xl border border-grey-light bg-surface p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-text">{cfg.label}</span>
                <div className="flex gap-1.5">
                  {isCoach && (
                    <button
                      onClick={() => decrement(cfg.key)}
                      className="rounded-lg bg-grey-light px-3 py-1.5 text-sm font-bold text-text-muted hover:bg-grey"
                    >
                      −1
                    </button>
                  )}
                  <button
                    onClick={() => addEvent(cfg.key, {})}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-white hover:bg-primary-dark"
                  >
                    +1
                  </button>
                  {!isCoach && (
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
              {!isCoach && mapMode && (
                <div>
                  <p className="mb-1.5 text-center text-xs text-text-muted">
                    {pendingCoords
                      ? 'Now choose an outcome below'
                      : cfg.outcomes.length === 0
                        ? 'Tap the pitch to mark a location'
                        : 'Tap the pitch where it happened'}
                  </p>
                  <div className="mx-auto max-w-xs">
                    <SvgPitch showLabels={false} onPitchClick={handlePitchClick}>
                      {renderMarkers()}
                      {pendingCoords && (
                        <circle cx={(pendingCoords.x / 100) * 500} cy={(pendingCoords.y / 100) * 725} r={9} fill="none" stroke="#FFD700" strokeWidth={3} />
                      )}
                    </SvgPitch>
                  </div>
                  {pendingCoords && cfg.outcomes.length > 0 && (
                    <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                      {cfg.outcomes.map((o) => (
                        <button key={o.value} onClick={() => chooseOutcome(o.value)} className="rounded-lg border border-grey bg-surface px-3 py-1.5 text-xs font-semibold text-text hover:border-primary hover:bg-primary/5">
                          {o.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Coach-mode always-on map (add + edit existing) */}
          {isCoach && (
            <div className="rounded-xl border border-grey-light bg-surface p-3 space-y-2">
              <p className="text-center text-xs text-text-muted">
                {relocatingId
                  ? 'Tap the pitch to move the event'
                  : cfg
                    ? pendingCoords
                      ? 'Choose an outcome below'
                      : `Tap the pitch to place a ${cfg.label.replace(/s$/, '').toLowerCase()}`
                    : 'Tap a marker to edit it, or pick a stat above to add'}
              </p>
              <div className="mx-auto max-w-xs">
                <SvgPitch showLabels={false} onPitchClick={handlePitchClick}>
                  {renderMarkers()}
                  {pendingCoords && (
                    <circle cx={(pendingCoords.x / 100) * 500} cy={(pendingCoords.y / 100) * 725} r={9} fill="none" stroke="#FFD700" strokeWidth={3} />
                  )}
                </SvgPitch>
              </div>

              {pendingCoords && cfg && cfg.outcomes.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {cfg.outcomes.map((o) => (
                    <button key={o.value} onClick={() => chooseOutcome(o.value)} className="rounded-lg border border-grey bg-surface px-3 py-1.5 text-xs font-semibold text-text hover:border-primary hover:bg-primary/5">
                      {o.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Edit panel for a selected marker */}
              {selEvent && (
                <div className="space-y-2 rounded-lg bg-grey-light/50 p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text">
                      {EVENT_TYPE_BY_KEY[selEvent.eventType].label}
                      {selEvent.outcome ? ` · ${OUTCOME_LABELS[selEvent.outcome]}` : selEvent.assistType ? ` · ${OUTCOME_LABELS[selEvent.assistType]}` : ''}
                    </span>
                    <button onClick={() => setSelectedEventId(null)} className="text-xs font-semibold text-text-muted">Done</button>
                  </div>
                  {EVENT_TYPE_BY_KEY[selEvent.eventType].outcomes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {EVENT_TYPE_BY_KEY[selEvent.eventType].outcomes.map((o) => {
                        const active = selEvent.outcome === o.value || selEvent.assistType === o.value;
                        return (
                          <button
                            key={o.value}
                            onClick={() => changeOutcome(selEvent, o.value)}
                            className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                              active ? 'border-primary bg-primary text-white' : 'border-grey bg-surface text-text'
                            }`}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <button onClick={() => beginMove(selEvent)} className="rounded-lg bg-grey-light px-3 py-1 text-xs font-semibold text-text-muted hover:bg-grey">
                      Move on map
                    </button>
                    <button onClick={() => removeEvent(selEvent)} className="rounded-lg bg-danger/10 px-3 py-1 text-xs font-semibold text-danger hover:bg-danger/20">
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Running totals line */}
          <div className="rounded-xl bg-surface p-3 text-xs text-text-muted shadow-sm">
            <span className="font-semibold text-text">Totals: </span>
            Possessions {t.possession} · Shots {t.shot} · TO Won {t.turnover_won} · TO Lost{' '}
            {t.turnover_lost} · Assists {t.assist}
            {isGk && <> · Kickouts {t.kickout}</>}
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
                  const tag = e.outcome ? OUTCOME_LABELS[e.outcome] : e.assistType ? OUTCOME_LABELS[e.assistType] : null;
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
                        <button onClick={() => { setSelectedStat(null); setSelectedEventId(e.localId); }} className="leading-none">
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
          {error && <p className="text-center text-xs font-semibold text-danger">{error}</p>}
          {isCoach ? (
            <button
              onClick={handleCoachSave}
              disabled={submitting}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save & Close'}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
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
