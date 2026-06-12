-- =====================================================================
-- Coach edits player match stats — schema + RLS
-- =====================================================================
-- Lets a coach enter or correct a player's match events on their behalf.
-- Coach edits write to the same player_match_events table, attributed to the
-- player (player_id stays the player's id); edited_by records the coach who
-- made the change (null = the player entered it themselves).
--
-- Marking the player's review complete reuses the existing
-- "coaches manage coach_match_players" policy (coaches already have UPDATE
-- there), so no change is needed for that.
--
-- Run this manually in the Supabase SQL editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Track who edited an event (nullable; null = player-entered)
-- ---------------------------------------------------------------------
alter table public.player_match_events
  add column if not exists edited_by uuid;

-- ---------------------------------------------------------------------
-- 2. Coach write policies (additive — player self-review policies stay).
-- ---------------------------------------------------------------------
-- These OR with the existing "players insert/update/delete own events"
-- policies, so a coach can write events for any player in a match on a team
-- they coach, while players keep writing their own.

create policy "coaches insert team events"
  on public.player_match_events
  for insert
  with check (
    exists (
      select 1
      from public.coach_matches cm
      join public.team_members tm on tm.team_id = cm.team_id
      where cm.id = player_match_events.coach_match_id
        and tm.user_id = auth.uid()
        and tm.role = 'coach'
    )
  );

create policy "coaches update team events"
  on public.player_match_events
  for update
  using (
    exists (
      select 1
      from public.coach_matches cm
      join public.team_members tm on tm.team_id = cm.team_id
      where cm.id = player_match_events.coach_match_id
        and tm.user_id = auth.uid()
        and tm.role = 'coach'
    )
  )
  with check (
    exists (
      select 1
      from public.coach_matches cm
      join public.team_members tm on tm.team_id = cm.team_id
      where cm.id = player_match_events.coach_match_id
        and tm.user_id = auth.uid()
        and tm.role = 'coach'
    )
  );

create policy "coaches delete team events"
  on public.player_match_events
  for delete
  using (
    exists (
      select 1
      from public.coach_matches cm
      join public.team_members tm on tm.team_id = cm.team_id
      where cm.id = player_match_events.coach_match_id
        and tm.user_id = auth.uid()
        and tm.role = 'coach'
    )
  );
