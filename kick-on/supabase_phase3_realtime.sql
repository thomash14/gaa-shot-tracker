-- =====================================================================
-- Coach Match Review — Phase 3 (coach aggregated stats view)
-- =====================================================================
-- NO new tables or policies are required for Phase 3. The coach already has
-- read access to everything it needs via earlier migrations:
--   * player_match_events  — "coaches read team events" (Phase 2)
--   * coach_match_players   — "coaches manage coach_match_players" (Phase 1,
--                             covers SELECT + the coach-comment UPDATE)
--   * profiles              — coaches can already read teammates' names
--
-- This file is OPTIONAL. It only enables the "nice to have" realtime updates
-- so the coach's stats table refreshes live as players submit reviews. Without
-- it, the table still loads correctly — it just won't auto-update until the
-- coach reopens the view.
--
-- Run this manually in the Supabase SQL editor only if you want realtime.
-- =====================================================================

-- Add the relevant tables to Supabase's realtime publication.
-- (Safe to run once; errors with "already member of publication" if re-run —
--  in that case just skip the offending line.)
alter publication supabase_realtime add table public.player_match_events;
alter publication supabase_realtime add table public.coach_match_players;
