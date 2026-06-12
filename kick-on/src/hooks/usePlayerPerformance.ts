'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PlayerGamePerf } from '@/lib/playerPerformance';
import type { CoachMatchStatus, PlayerEventType, PlayerMatchEvent, Position } from '@/types';

interface MatchRow {
  id: string;
  competition: string;
  opposition: string;
  match_date: string;
  status: CoachMatchStatus;
}
interface CmpRow {
  coach_match_id: string;
  position: Position;
  is_starter: boolean;
  sub_minute: number | null;
  reviewed: boolean;
}

/**
 * Loads one player's performance across the coach's team matches:
 * every coach_match_players row (game + position + review status) joined with
 * their player_match_events. Includes non-reviewed games (shown as 0s).
 */
export function usePlayerPerformance(playerUserId: string | null, teamId: string | null) {
  const [games, setGames] = useState<PlayerGamePerf[]>([]);
  const [events, setEvents] = useState<PlayerMatchEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!playerUserId || !teamId) return;
    const supabase = createClient();
    setLoading(true);
    try {
      // 1. The team's matches.
      const { data: matchData, error: matchErr } = await supabase
        .from('coach_matches')
        .select('id, competition, opposition, match_date, status')
        .eq('team_id', teamId);
      if (matchErr) throw matchErr;
      const matches = (matchData ?? []) as unknown as MatchRow[];
      const matchById = new Map(matches.map((m) => [m.id, m]));
      const matchIds = matches.map((m) => m.id);
      if (matchIds.length === 0) {
        setGames([]);
        setEvents([]);
        return;
      }

      // 2. This player's assignments + events within those matches.
      const [{ data: cmpData, error: cmpErr }, { data: evData, error: evErr }] = await Promise.all([
        supabase
          .from('coach_match_players')
          .select('coach_match_id, position, is_starter, sub_minute, reviewed')
          .eq('player_id', playerUserId)
          .in('coach_match_id', matchIds),
        supabase
          .from('player_match_events')
          .select('*')
          .eq('player_id', playerUserId)
          .in('coach_match_id', matchIds),
      ]);
      if (cmpErr) throw cmpErr;
      if (evErr) throw evErr;

      const cmps = (cmpData ?? []) as unknown as CmpRow[];
      const allEvents = (evData ?? []) as unknown as PlayerMatchEvent[];
      setEvents(allEvents);

      const countFor = (mId: string, type: PlayerEventType, pred?: (e: PlayerMatchEvent) => boolean) =>
        allEvents.filter(
          (e) => e.coach_match_id === mId && e.event_type === type && (pred ? pred(e) : true),
        ).length;

      const perf: PlayerGamePerf[] = cmps
        .map((c) => {
          const m = matchById.get(c.coach_match_id);
          if (!m) return null;
          const id = c.coach_match_id;
          return {
            matchId: id,
            date: m.match_date,
            competition: m.competition,
            opposition: m.opposition,
            status: m.status,
            position: c.position,
            isStarter: c.is_starter,
            subMinute: c.sub_minute,
            reviewed: c.reviewed,
            possessions: countFor(id, 'possession'),
            shots: countFor(id, 'shot'),
            shotsScored: countFor(id, 'shot', (e) => e.outcome === 'scored'),
            turnoversWon: countFor(id, 'turnover_won'),
            turnoversLost: countFor(id, 'turnover_lost'),
            assists: countFor(id, 'assist'),
            assistGoals: countFor(id, 'assist', (e) => e.assist_type === 'goal'),
            assistPoints: countFor(id, 'assist', (e) => e.assist_type === 'point'),
            kickoutsWon: countFor(id, 'kickout', (e) => e.outcome === 'won'),
            kickoutsLost: countFor(id, 'kickout', (e) => e.outcome === 'lost'),
          } as PlayerGamePerf;
        })
        .filter((g): g is PlayerGamePerf => g !== null)
        .sort((a, b) => (a.date < b.date ? 1 : -1));

      setGames(perf);
    } catch (err) {
      console.error('[playerPerformance] load error:', err);
      setGames([]);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [playerUserId, teamId]);

  useEffect(() => {
    load();
  }, [load]);

  return { games, events, loading, reload: load };
}
