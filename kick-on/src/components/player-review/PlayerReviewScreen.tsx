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
  flushPendingPlayerEvents,
  loadPlayerEvents,
  pendingPlayerEventCount,
  pendingPlayerEventsFor,
  submitPlayerReview,
} from '@/lib/supabase/playerEvents';
import type { LocalPlayerEvent, PlayerEventType, PlayerGame } from '@/types';

interface PlayerReviewScreenProps {
  game: PlayerGame;
  playerId: string;
  teamName: string;
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
  onClose,
  onReviewed,
}: PlayerReviewScreenProps) {
  const matchId = game.match.id;

  const [events, setEvents] = useState<LocalPlayerEvent[]>([]);
  const [selectedStat, setSelectedStat] = useState<PlayerEventType | null>(null);
  const [mapMode, setMapMode] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ x: number; y: number } | null>(null);
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
    }));
    const pending = pendingPlayerEventsFor(matchId, playerId).map((e) => ({
      localId: e.localId,
      eventType: e.eventType,
      x: e.x,
      y: e.y,
      outcome: e.outcome,
      assistType: e.assistType,
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

  // ----- add / remove events -----
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
      });
      if (cloudId) {
        setEvents((prev) => prev.map((e) => (e.localId === localId ? { ...e, cloudId } : e)));
      }
      setPendingCount(pendingPlayerEventCount());
    },
    [matchId, playerId],
  );

  const undoLast = useCallback(async () => {
    setEvents((prev) => {
      const last = prev[prev.length - 1];
      if (last) deletePlayerEvent(last.localId, last.cloudId).then(() => setPendingCount(pendingPlayerEventCount()));
      return prev.slice(0, -1);
    });
  }, []);

  // ----- map interaction -----
  const handlePitchClick = useCallback(
    (x: number, y: number) => {
      if (!selectedStat) return;
      const cfg = EVENT_TYPE_BY_KEY[selectedStat];
      if (cfg.outcomes.length === 0) {
        addEvent(selectedStat, { x, y }); // location-only event
      } else {
        setPendingCoords({ x, y }); // wait for outcome selection
      }
    },
    [selectedStat, addEvent],
  );

  const chooseOutcome = useCallback(
    (value: string) => {
      if (!selectedStat || !pendingCoords) return;
      const cfg = EVENT_TYPE_BY_KEY[selectedStat];
      addEvent(selectedStat, {
        x: pendingCoords.x,
        y: pendingCoords.y,
        ...(cfg.usesAssistType ? { assistType: value } : { outcome: value }),
      });
      setPendingCoords(null);
    },
    [selectedStat, pendingCoords, addEvent],
  );

  const selectStat = (key: PlayerEventType) => {
    setSelectedStat(key);
    setPendingCoords(null);
    setMapMode(false);
  };

  // ----- submit -----
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

  const t = totals(events);
  const m = game.match;
  const result = matchResult(m.team_score_goals, m.team_score_points, m.opposition_score_goals, m.opposition_score_points);
  const cfg = selectedStat ? EVENT_TYPE_BY_KEY[selectedStat] : null;
  const coordEvents = events.filter((e) => e.x != null && e.y != null);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background sm:items-center sm:justify-center sm:bg-black/50 sm:p-4">
      <div className="flex h-full w-full flex-col bg-background sm:h-auto sm:max-h-[94vh] sm:max-w-lg sm:rounded-2xl sm:shadow-xl">
        {/* Header */}
        <div className="shrink-0 border-b border-border bg-primary p-4 text-white sm:rounded-t-2xl">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold">vs {m.opposition}</h3>
              <p className="text-xs opacity-80">
                {m.competition} · {m.match_date}
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
            You played: <span className="font-semibold">{POSITION_NAMES[game.position]}</span>
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
                  <button
                    onClick={() => addEvent(cfg.key, {})}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-white hover:bg-primary-dark"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => { setMapMode((v) => !v); setPendingCoords(null); }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      mapMode ? 'bg-primary/15 text-primary' : 'bg-grey-light text-text-muted hover:bg-grey'
                    }`}
                  >
                    {mapMode ? 'Hide map' : 'Mark on map'}
                  </button>
                </div>
              </div>

              {mapMode && (
                <div>
                  <p className="mb-1.5 text-center text-xs text-text-muted">
                    {pendingCoords
                      ? 'Now choose an outcome below'
                      : cfg.outcomes.length === 0
                        ? 'Tap the pitch to mark a location'
                        : 'Tap the pitch where it happened'}
                  </p>
                  <div className="mx-auto max-w-xs">
                    <SvgPitch showLabels={false} onPitchClick={(x, y) => handlePitchClick(x, y)}>
                      {coordEvents.map((e) => (
                        <circle
                          key={e.localId}
                          cx={(e.x! / 100) * 500}
                          cy={(e.y! / 100) * 725}
                          r={7}
                          fill={eventColour(e)}
                          stroke="#fff"
                          strokeWidth={1.5}
                          opacity={0.9}
                        />
                      ))}
                      {pendingCoords && (
                        <circle
                          cx={(pendingCoords.x / 100) * 500}
                          cy={(pendingCoords.y / 100) * 725}
                          r={9}
                          fill="none"
                          stroke="#FFD700"
                          strokeWidth={3}
                        />
                      )}
                    </SvgPitch>
                  </div>

                  {/* Outcome / assist-type buttons (after a location is tapped) */}
                  {pendingCoords && cfg.outcomes.length > 0 && (
                    <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                      {cfg.outcomes.map((o) => (
                        <button
                          key={o.value}
                          onClick={() => chooseOutcome(o.value)}
                          className="rounded-lg border border-grey bg-surface px-3 py-1.5 text-xs font-semibold text-text hover:border-primary hover:bg-primary/5"
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  )}
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
            {events.length > 0 && (
              <button onClick={undoLast} className="ml-2 font-semibold text-danger hover:underline">
                Undo last
              </button>
            )}
          </div>

          {/* Recent events list */}
          {events.length > 0 && (
            <div className="rounded-xl bg-surface p-3 shadow-sm">
              <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
                Logged ({events.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {events.map((e) => {
                  const label = EVENT_TYPE_BY_KEY[e.eventType].short;
                  const tag = e.outcome ? OUTCOME_LABELS[e.outcome] : e.assistType ? OUTCOME_LABELS[e.assistType] : null;
                  return (
                    <span
                      key={e.localId}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                      style={{ backgroundColor: eventColour(e) }}
                    >
                      {label}
                      {tag ? ` · ${tag}` : ''}
                      {e.x != null ? ' 📍' : ''}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer: summary + submit */}
        <div className="shrink-0 space-y-2 border-t border-border bg-surface p-3 sm:rounded-b-2xl">
          <p className="text-center text-xs text-text-muted">
            {events.length > 0 ? buildSummary(events) : 'No events logged yet'}
          </p>
          {error && <p className="text-center text-xs font-semibold text-danger">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`w-full rounded-xl py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 ${
              submitted ? 'bg-success hover:bg-success/90' : 'bg-primary hover:bg-primary-dark'
            }`}
          >
            {submitting ? 'Submitting…' : submitted ? 'Review Submitted ✓ — Update' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
