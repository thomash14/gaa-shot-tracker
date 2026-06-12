'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { aggregatePlayers, type StatPlayerInput } from '@/lib/coachStats';
import type { PlayerMatchEvent } from '@/types';

/**
 * Loads everything the coach needs to view a sent game's player stats:
 * the coach_match_players rows (positions + review status + comments),
 * the player_match_events, and a name lookup. Aggregates into stat rows.
 *
 * Subscribes to realtime changes when available (nice-to-have) so the table
 * updates as players submit; falls back silently if realtime is off.
 */
export function useCoachMatchStats(coachMatchId: string | null) {
  const [players, setPlayers] = useState<StatPlayerInput[]>([]);
  const [events, setEvents] = useState<PlayerMatchEvent[]>([]);
  const [nameById, setNameById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!coachMatchId) return;
    const supabase = createClient();
    try {
      const [{ data: cmp, error: cmpErr }, { data: evs, error: evErr }] = await Promise.all([
        supabase
          .from('coach_match_players')
          .select(
            'id, player_id, position, is_starter, sub_minute, replaced_player_id, reviewed, coach_comment, comment_visible_to_player',
          )
          .eq('coach_match_id', coachMatchId),
        supabase
          .from('player_match_events')
          .select('*')
          .eq('coach_match_id', coachMatchId)
          .order('created_at', { ascending: true }),
      ]);
      if (cmpErr) throw cmpErr;
      if (evErr) throw evErr;

      const playerRows = (cmp ?? []) as unknown as StatPlayerInput[];
      setPlayers(playerRows);
      setEvents((evs ?? []) as unknown as PlayerMatchEvent[]);

      const ids = Array.from(new Set(playerRows.map((p) => p.player_id)));
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', ids);
        const map: Record<string, string> = {};
        (profiles ?? []).forEach((p: { id: string; display_name?: string }) => {
          map[p.id] = p.display_name || 'Player';
        });
        setNameById(map);
      } else {
        setNameById({});
      }
    } catch (err) {
      console.error('[coachMatchStats] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [coachMatchId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Realtime (best-effort): reload on any event/review change for this match.
  useEffect(() => {
    if (!coachMatchId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`coach_match_stats_${coachMatchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_match_events', filter: `coach_match_id=eq.${coachMatchId}` },
        () => load(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'coach_match_players', filter: `coach_match_id=eq.${coachMatchId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [coachMatchId, load]);

  const statRows = useMemo(
    () => aggregatePlayers(players, events, nameById),
    [players, events, nameById],
  );

  /** Update a player's coach comment + visibility (coach has RLS write). */
  const updateComment = useCallback(
    async (cmpId: string, comment: string, visible: boolean) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('coach_match_players')
        .update({ coach_comment: comment.trim() || null, comment_visible_to_player: visible })
        .eq('id', cmpId);
      if (error) throw error;
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === cmpId
            ? { ...p, coach_comment: comment.trim() || null, comment_visible_to_player: visible }
            : p,
        ),
      );
    },
    [],
  );

  return { statRows, events, nameById, loading, reload: load, updateComment };
}
