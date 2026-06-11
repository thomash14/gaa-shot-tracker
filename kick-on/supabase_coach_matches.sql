-- =====================================================================
-- Coach Match Review — Phase 1 schema
-- =====================================================================
-- Coaches create post-match game records, assign players to positions,
-- record substitutions, notes and per-player comments, then send the
-- record to players for review.
--
-- Run this manually in the Supabase SQL editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. coach_matches — one row per game a coach records
-- ---------------------------------------------------------------------
create table if not exists public.coach_matches (
  id                      uuid primary key default gen_random_uuid(),
  team_id                 uuid not null references public.teams(id) on delete cascade,
  created_by              uuid not null references public.profiles(id),
  competition             text not null,
  opposition              text not null,
  match_date              date not null,
  team_score_goals        integer not null default 0,
  team_score_points       integer not null default 0,
  opposition_score_goals  integer not null default 0,
  opposition_score_points integer not null default 0,
  what_went_well          text,
  what_went_poorly        text,
  comments                text,
  status                  text not null default 'draft' check (status in ('draft', 'sent')),
  created_at              timestamptz not null default now()
);

create index if not exists idx_coach_matches_team_id on public.coach_matches(team_id);
create index if not exists idx_coach_matches_created_by on public.coach_matches(created_by);

-- ---------------------------------------------------------------------
-- 2. coach_match_players — player <-> position assignments + subs
-- ---------------------------------------------------------------------
-- A starter is a row with is_starter = true.
-- A substitute is a row with is_starter = false, position = the slot they
-- came into, replaced_player_id = the starter they replaced, and sub_minute.
create table if not exists public.coach_match_players (
  id                        uuid primary key default gen_random_uuid(),
  coach_match_id            uuid not null references public.coach_matches(id) on delete cascade,
  player_id                 uuid not null references public.profiles(id),
  position                  text not null check (position in (
                              'GK', 'RCB', 'FB', 'LCB',
                              'RHB', 'CHB', 'LHB',
                              'MID1', 'MID2',
                              'RHF', 'CHF', 'LHF',
                              'RCF', 'FF', 'LCF')),
  is_starter                boolean not null default true,
  replaced_player_id        uuid references public.profiles(id),
  sub_minute                integer,
  coach_comment             text,
  comment_visible_to_player boolean not null default false,
  created_at                timestamptz not null default now()
);

create index if not exists idx_coach_match_players_match_id on public.coach_match_players(coach_match_id);
create index if not exists idx_coach_match_players_player_id on public.coach_match_players(player_id);

-- ---------------------------------------------------------------------
-- 3. coach_match_missing_players — players who missed the game
-- ---------------------------------------------------------------------
create table if not exists public.coach_match_missing_players (
  id             uuid primary key default gen_random_uuid(),
  coach_match_id uuid not null references public.coach_matches(id) on delete cascade,
  player_id      uuid not null references public.profiles(id),
  reason         text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_coach_match_missing_match_id on public.coach_match_missing_players(coach_match_id);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.coach_matches               enable row level security;
alter table public.coach_match_players          enable row level security;
alter table public.coach_match_missing_players  enable row level security;

-- ---------------------------------------------------------------------
-- coach_matches
-- ---------------------------------------------------------------------
-- Coaches: full CRUD over matches for teams they coach.
create policy "coaches manage coach_matches"
  on public.coach_matches
  for all
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = coach_matches.team_id
        and tm.user_id = auth.uid()
        and tm.role = 'coach'
    )
  )
  with check (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = coach_matches.team_id
        and tm.user_id = auth.uid()
        and tm.role = 'coach'
    )
  );

-- Players: read matches for any team they belong to.
create policy "players read coach_matches"
  on public.coach_matches
  for select
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = coach_matches.team_id
        and tm.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- coach_match_players
-- ---------------------------------------------------------------------
-- Coaches: full CRUD over player rows for matches on teams they coach.
create policy "coaches manage coach_match_players"
  on public.coach_match_players
  for all
  using (
    exists (
      select 1
      from public.coach_matches cm
      join public.team_members tm on tm.team_id = cm.team_id
      where cm.id = coach_match_players.coach_match_id
        and tm.user_id = auth.uid()
        and tm.role = 'coach'
    )
  )
  with check (
    exists (
      select 1
      from public.coach_matches cm
      join public.team_members tm on tm.team_id = cm.team_id
      where cm.id = coach_match_players.coach_match_id
        and tm.user_id = auth.uid()
        and tm.role = 'coach'
    )
  );

-- Players: read player rows for matches on teams they belong to.
create policy "players read coach_match_players"
  on public.coach_match_players
  for select
  using (
    exists (
      select 1
      from public.coach_matches cm
      join public.team_members tm on tm.team_id = cm.team_id
      where cm.id = coach_match_players.coach_match_id
        and tm.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- coach_match_missing_players
-- ---------------------------------------------------------------------
-- Coaches only (Phase 1 does not expose missing players to players).
create policy "coaches manage coach_match_missing_players"
  on public.coach_match_missing_players
  for all
  using (
    exists (
      select 1
      from public.coach_matches cm
      join public.team_members tm on tm.team_id = cm.team_id
      where cm.id = coach_match_missing_players.coach_match_id
        and tm.user_id = auth.uid()
        and tm.role = 'coach'
    )
  )
  with check (
    exists (
      select 1
      from public.coach_matches cm
      join public.team_members tm on tm.team_id = cm.team_id
      where cm.id = coach_match_missing_players.coach_match_id
        and tm.user_id = auth.uid()
        and tm.role = 'coach'
    )
  );
