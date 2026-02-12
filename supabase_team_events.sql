-- =============================================================================
-- Team Events table
-- Run this in Supabase SQL Editor
-- =============================================================================

CREATE TABLE team_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('training', 'match', 'other')),
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  location TEXT,
  opponent TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE team_events ENABLE ROW LEVEL SECURITY;

-- Coaches can CRUD events for their own teams
CREATE POLICY "Coaches can manage team events"
  ON team_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_events.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'coach'
    )
  );

-- Players can read events for teams they belong to
CREATE POLICY "Team members can read events"
  ON team_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_events.team_id
        AND team_members.user_id = auth.uid()
    )
  );
