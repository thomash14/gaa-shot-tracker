-- Run this in your Supabase SQL Editor (Dashboard > SQL > New Query)
-- This creates the RPC function that coaches call to view player data

CREATE OR REPLACE FUNCTION get_player_data(
    p_player_user_id UUID,
    p_team_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_share_practice BOOLEAN;
    v_share_match BOOLEAN;
    v_result JSON;
BEGIN
    -- Get the calling user's ID
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify the caller is a coach on this team
    SELECT role INTO v_caller_role
    FROM team_members
    WHERE user_id = v_caller_id AND team_id = p_team_id;

    IF v_caller_role IS NULL OR v_caller_role != 'coach' THEN
        RAISE EXCEPTION 'Only coaches can view player data';
    END IF;

    -- Get the player's sharing flags
    SELECT share_with_coach, COALESCE(share_match_data, FALSE)
    INTO v_share_practice, v_share_match
    FROM team_members
    WHERE user_id = p_player_user_id AND team_id = p_team_id;

    IF v_share_practice IS NULL THEN
        RAISE EXCEPTION 'Player is not a member of this team';
    END IF;

    IF NOT v_share_practice AND NOT v_share_match THEN
        RAISE EXCEPTION 'Player has not enabled data sharing';
    END IF;

    -- Build the result with filtered sessions and nested shots
    SELECT json_build_object(
        'share_practice', v_share_practice,
        'share_match', v_share_match,
        'sessions', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'id', s.id,
                    'name', s.name,
                    'date', s.date,
                    'type', s.type,
                    'match_type', s.match_type,
                    'session_notes', s.session_notes,
                    'did_well', s.did_well,
                    'to_improve', s.to_improve,
                    'wind_direction', s.wind_direction,
                    'wind_strength', s.wind_strength,
                    'shots', COALESCE((
                        SELECT json_agg(
                            json_build_object(
                                'x', sh.x,
                                'y', sh.y,
                                'distance', sh.distance,
                                'foot', sh.foot,
                                'half', sh.half,
                                'shot_for', sh.shot_for,
                                'shot_category', sh.shot_category,
                                'shot_type', sh.shot_type,
                                'point_value', sh.point_value,
                                'result', sh.result,
                                'timestamp', sh.timestamp,
                                'comment', sh.comment,
                                'miss_result', sh.miss_result,
                                'miss_reason', sh.miss_reason,
                                'drill_id', sh.drill_id
                            )
                        )
                        FROM shots sh
                        WHERE sh.session_id = s.id
                    ), '[]'::json)
                )
                ORDER BY s.date DESC
            )
            FROM sessions s
            WHERE s.user_id = p_player_user_id
              AND (
                  (s.type = 'practice' AND v_share_practice = TRUE)
                  OR
                  (s.type = 'match' AND v_share_match = TRUE)
              )
        ), '[]'::json)
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_player_data(UUID, UUID) TO authenticated;
