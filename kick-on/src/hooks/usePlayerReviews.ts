'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CoachMatch, PlayerGame, Position } from '@/types';

interface CmpRow {
  position: Position;
  is_starter: boolean;
  sub_minute: number | null;
  replaced_player_id: string | null;
  reviewed: boolean;
  reviewed_at: string | null;
  coach_matches: CoachMatch;
}

/**
 * Loads the games a coach has sent to the current player, with the player's
 * own assignment (position / sub info / reviewed status) attached.
 */
export function usePlayerReviews() {
  const [games, setGames] = useState<PlayerGame[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadGames = useCallback(async (teamId?: string) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setGames([]);
      setLoaded(true);
      return;
    }

    try {
      let query = supabase
        .from('coach_match_players')
        .select(
          'position, is_starter, sub_minute, replaced_player_id, reviewed, reviewed_at, coach_matches!inner(*)',
        )
        .eq('player_id', user.id)
        .eq('coach_matches.status', 'sent');
      if (teamId) query = query.eq('coach_matches.team_id', teamId);

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data ?? []) as unknown as CmpRow[];

      // Resolve replaced-player names for subs (single profiles lookup).
      const replacedIds = Array.from(
        new Set(rows.map((r) => r.replaced_player_id).filter((v): v is string => !!v)),
      );
      const nameById: Record<string, string> = {};
      if (replacedIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', replacedIds);
        (profiles ?? []).forEach((p: { id: string; display_name?: string }) => {
          nameById[p.id] = p.display_name || 'a teammate';
        });
      }

      const list: PlayerGame[] = rows
        .map((r) => ({
          match: r.coach_matches,
          position: r.position,
          isStarter: r.is_starter,
          subMinute: r.sub_minute,
          replacedPlayerId: r.replaced_player_id,
          replacedPlayerName: r.replaced_player_id
            ? nameById[r.replaced_player_id] ?? 'a teammate'
            : null,
          reviewed: r.reviewed,
          reviewedAt: r.reviewed_at,
        }))
        .sort((a, b) => (a.match.match_date < b.match.match_date ? 1 : -1));

      setGames(list);
    } catch (err) {
      console.error('[playerReviews] load error:', err);
      setGames([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  /** Update a game's reviewed flag locally after submitting. */
  const markReviewedLocally = useCallback((coachMatchId: string) => {
    setGames((prev) =>
      prev.map((g) =>
        g.match.id === coachMatchId
          ? { ...g, reviewed: true, reviewedAt: new Date().toISOString() }
          : g,
      ),
    );
  }, []);

  return { games, loaded, loadGames, markReviewedLocally };
}
