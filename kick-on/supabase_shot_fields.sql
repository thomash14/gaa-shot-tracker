-- =====================================================================
-- Player match events — shot detail fields
-- =====================================================================
-- Shots now require a foot and a category (in-play / free-kick) in addition
-- to their result (stored in `outcome`). Add nullable columns so existing
-- rows are unaffected. Kickout result continues to use `outcome` (won/lost).
--
-- Run this manually in the Supabase SQL editor.
-- =====================================================================

alter table public.player_match_events
  add column if not exists foot text;          -- 'left' | 'right' (shots)

alter table public.player_match_events
  add column if not exists shot_category text;  -- 'in-play' | 'free-kick' (shots)
