'use client';

import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTeamStore } from '@/store/teamStore';
import { useCoachMatchStore } from '@/store/coachMatchStore';
import { ALL_POSITIONS } from '@/lib/coachMatch';
import type {
  CoachMatch,
  CoachMatchDetail,
  CoachMatchPlayer,
  CoachMatchMissingPlayer,
  CoachMatchDraft,
  Position,
} from '@/types';

// ---------------------------------------------------------------------------
// Build the coach_match_players rows from a draft.
// Starters: one row per assigned position (is_starter = true).
// Subs: one row per sub (is_starter = false) referencing the replaced starter.
// Per-player comments attach to whichever row holds that player.
// ---------------------------------------------------------------------------
function buildPlayerRows(matchId: string, draft: CoachMatchDraft) {
  const commentFor = (playerId: string) =>
    draft.playerComments.find((c) => c.playerId === playerId);

  const rows: Array<{
    coach_match_id: string;
    player_id: string;
    position: Position;
    is_starter: boolean;
    replaced_player_id: string | null;
    sub_minute: number | null;
    coach_comment: string | null;
    comment_visible_to_player: boolean;
  }> = [];

  for (const pos of ALL_POSITIONS) {
    const playerId = draft.starters[pos];
    if (!playerId) continue;
    const c = commentFor(playerId);
    rows.push({
      coach_match_id: matchId,
      player_id: playerId,
      position: pos,
      is_starter: true,
      replaced_player_id: null,
      sub_minute: null,
      coach_comment: c?.comment.trim() ? c.comment.trim() : null,
      comment_visible_to_player: c?.visibleToPlayer ?? false,
    });
  }

  for (const sub of draft.subs) {
    const c = commentFor(sub.subPlayerId);
    rows.push({
      coach_match_id: matchId,
      player_id: sub.subPlayerId,
      position: sub.position,
      is_starter: false,
      replaced_player_id: sub.replacedPlayerId,
      sub_minute: sub.minute,
      coach_comment: c?.comment.trim() ? c.comment.trim() : null,
      comment_visible_to_player: c?.visibleToPlayer ?? false,
    });
  }

  return rows;
}

export function useCoachMatches() {
  const currentTeam = useTeamStore((s) => s.currentTeam);
  const coachMatches = useCoachMatchStore((s) => s.coachMatches);
  const coachMatchesLoaded = useCoachMatchStore((s) => s.coachMatchesLoaded);
  const setCoachMatches = useCoachMatchStore((s) => s.setCoachMatches);
  const setCoachMatchesLoaded = useCoachMatchStore((s) => s.setCoachMatchesLoaded);
  const upsertCoachMatch = useCoachMatchStore((s) => s.upsertCoachMatch);
  const removeCoachMatchStore = useCoachMatchStore((s) => s.removeCoachMatch);

  // -------------------------------------------------------------------------
  // Load the match list for the current team
  // -------------------------------------------------------------------------
  const loadCoachMatches = useCallback(async () => {
    if (!currentTeam) return;
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('coach_matches')
        .select('*')
        .eq('team_id', currentTeam.id)
        .order('match_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCoachMatches((data ?? []) as unknown as CoachMatch[]);
    } catch (err) {
      console.error('[coachMatches] load error:', err);
      setCoachMatches([]);
    } finally {
      setCoachMatchesLoaded(true);
    }
  }, [currentTeam, setCoachMatches, setCoachMatchesLoaded]);

  // -------------------------------------------------------------------------
  // Load a single match with its players + missing rows
  // -------------------------------------------------------------------------
  const loadCoachMatchDetail = useCallback(
    async (matchId: string): Promise<CoachMatchDetail | null> => {
      const supabase = createClient();
      try {
        const { data: match, error } = await supabase
          .from('coach_matches')
          .select('*')
          .eq('id', matchId)
          .single();
        if (error) throw error;

        const [{ data: players }, { data: missing }] = await Promise.all([
          supabase.from('coach_match_players').select('*').eq('coach_match_id', matchId),
          supabase.from('coach_match_missing_players').select('*').eq('coach_match_id', matchId),
        ]);

        return {
          ...(match as unknown as CoachMatch),
          players: (players ?? []) as unknown as CoachMatchPlayer[],
          missing: (missing ?? []) as unknown as CoachMatchMissingPlayer[],
        };
      } catch (err) {
        console.error('[coachMatches] detail load error:', err);
        return null;
      }
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Create or update a match (replaces child rows wholesale on update)
  // -------------------------------------------------------------------------
  const saveCoachMatch = useCallback(
    async (draft: CoachMatchDraft, existingId?: string): Promise<CoachMatch> => {
      if (!currentTeam) throw new Error('No team');
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const matchPayload = {
        team_id: currentTeam.id,
        created_by: user.id,
        competition: draft.competition,
        opposition: draft.opposition.trim(),
        match_date: draft.matchDate,
        team_score_goals: draft.teamScoreGoals,
        team_score_points: draft.teamScorePoints,
        opposition_score_goals: draft.oppositionScoreGoals,
        opposition_score_points: draft.oppositionScorePoints,
        what_went_well: draft.whatWentWell.trim() || null,
        what_went_poorly: draft.whatWentPoorly.trim() || null,
        comments: draft.comments.trim() || null,
        status: draft.status,
      };

      let matchId = existingId;

      if (existingId) {
        const { error } = await supabase
          .from('coach_matches')
          .update(matchPayload)
          .eq('id', existingId);
        if (error) throw error;
        // Clear existing child rows before re-inserting
        await Promise.all([
          supabase.from('coach_match_players').delete().eq('coach_match_id', existingId),
          supabase.from('coach_match_missing_players').delete().eq('coach_match_id', existingId),
        ]);
      } else {
        const { data, error } = await supabase
          .from('coach_matches')
          .insert(matchPayload)
          .select('id')
          .single();
        if (error || !data) throw error ?? new Error('Insert failed');
        matchId = data.id as string;
      }

      const playerRows = buildPlayerRows(matchId!, draft);
      if (playerRows.length > 0) {
        const { error } = await supabase.from('coach_match_players').insert(playerRows);
        if (error) throw error;
      }

      const missingRows = draft.missing
        .filter((m) => m.playerId)
        .map((m) => ({
          coach_match_id: matchId!,
          player_id: m.playerId,
          reason: m.reason.trim() || null,
        }));
      if (missingRows.length > 0) {
        const { error } = await supabase
          .from('coach_match_missing_players')
          .insert(missingRows);
        if (error) throw error;
      }

      // Fetch the canonical saved row and update the store
      const { data: saved } = await supabase
        .from('coach_matches')
        .select('*')
        .eq('id', matchId!)
        .single();
      const savedMatch = (saved ?? { ...matchPayload, id: matchId, created_at: new Date().toISOString() }) as unknown as CoachMatch;
      upsertCoachMatch(savedMatch);
      return savedMatch;
    },
    [currentTeam, upsertCoachMatch],
  );

  // -------------------------------------------------------------------------
  // Delete a match (children cascade in the DB)
  // -------------------------------------------------------------------------
  const deleteCoachMatch = useCallback(
    async (matchId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('coach_matches').delete().eq('id', matchId);
      if (error) throw error;
      removeCoachMatchStore(matchId);
    },
    [removeCoachMatchStore],
  );

  return {
    coachMatches,
    coachMatchesLoaded,
    loadCoachMatches,
    loadCoachMatchDetail,
    saveCoachMatch,
    deleteCoachMatch,
  };
}
