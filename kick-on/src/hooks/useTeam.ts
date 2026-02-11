'use client';

import { useCallback } from 'react';
import { useTeamStore } from '@/store/teamStore';
import { createClient } from '@/lib/supabase/client';
import type { Team, TeamMembership, TeamMember, TeamDrill, DrillCompletion } from '@/types';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTeam() {
  const currentTeam = useTeamStore((s) => s.currentTeam);
  const currentMembership = useTeamStore((s) => s.currentMembership);
  const teamMembers = useTeamStore((s) => s.teamMembers);
  const teamDrills = useTeamStore((s) => s.teamDrills);
  const drillCompletions = useTeamStore((s) => s.drillCompletions);
  const setCurrentTeam = useTeamStore((s) => s.setCurrentTeam);
  const setCurrentMembership = useTeamStore((s) => s.setCurrentMembership);
  const setTeamMembers = useTeamStore((s) => s.setTeamMembers);
  const setTeamDrills = useTeamStore((s) => s.setTeamDrills);
  const addTeamDrill = useTeamStore((s) => s.addTeamDrill);
  const removeTeamDrill = useTeamStore((s) => s.removeTeamDrill);
  const setDrillCompletions = useTeamStore((s) => s.setDrillCompletions);
  const updateMembershipStore = useTeamStore((s) => s.updateMembership);
  const setHasPlayerMembership = useTeamStore((s) => s.setHasPlayerMembership);
  const clearTeam = useTeamStore((s) => s.clearTeam);

  const isCoach = currentMembership?.role === 'coach';
  const isPlayer = currentMembership?.role === 'player';

  // -------------------------------------------------------------------------
  // Load team data
  // -------------------------------------------------------------------------
  const loadTeamData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: membership, error } = await supabase
        .from('team_members')
        .select('*, teams(*, clubs(*))')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No membership found
          clearTeam();
        }
        return;
      }

      if (membership?.teams) {
        setCurrentMembership(membership as unknown as TeamMembership);
        setCurrentTeam(membership.teams as unknown as Team);
      } else {
        clearTeam();
      }

      // Check if the user has any player-role membership (across all teams)
      const { count } = await supabase
        .from('team_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('role', 'player');
      setHasPlayerMembership((count ?? 0) > 0);
    } catch {
      clearTeam();
    }
  }, [setCurrentTeam, setCurrentMembership, setHasPlayerMembership, clearTeam]);

  // -------------------------------------------------------------------------
  // Load team members
  // -------------------------------------------------------------------------
  const loadTeamMembers = useCallback(async () => {
    if (!currentTeam) return;
    const supabase = createClient();

    try {
      const { data: members, error } = await supabase
        .from('team_members')
        .select('id, user_id, role, share_with_coach, share_match_data')
        .eq('team_id', currentTeam.id);

      if (error) throw error;
      if (!members?.length) {
        setTeamMembers([]);
        return;
      }

      const userIds = members.map((m) => m.user_id);
      let profiles: Record<string, { display_name?: string; email?: string }> = {};
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, display_name, email')
          .in('id', userIds);
        if (profileData) {
          profileData.forEach((p) => { profiles[p.id] = p; });
        }
      } catch { /* profiles optional */ }

      const teamMembersList: TeamMember[] = members.map((m) => {
        const profile = profiles[m.user_id];
        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          displayName: profile?.display_name || profile?.email || 'Team Member',
          email: profile?.email,
          share_with_coach: m.share_with_coach,
          share_match_data: m.share_match_data,
        };
      });
      setTeamMembers(teamMembersList);
    } catch (err) {
      console.error('Error loading team members:', err);
    }
  }, [currentTeam, setTeamMembers]);

  // -------------------------------------------------------------------------
  // Toggle sharing
  // -------------------------------------------------------------------------
  const toggleSharePractice = useCallback(async (newValue: boolean) => {
    if (!currentMembership) return;
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ share_with_coach: newValue })
        .eq('id', currentMembership.id);
      if (error) throw error;
      updateMembershipStore({ share_with_coach: newValue });
    } catch {
      alert('Failed to update sharing preference');
    }
  }, [currentMembership, updateMembershipStore]);

  const toggleShareMatch = useCallback(async (newValue: boolean) => {
    if (!currentMembership) return;
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ share_match_data: newValue })
        .eq('id', currentMembership.id);
      if (error) throw error;
      updateMembershipStore({ share_match_data: newValue });
    } catch {
      alert('Failed to update sharing preference');
    }
  }, [currentMembership, updateMembershipStore]);

  // -------------------------------------------------------------------------
  // Join team
  // -------------------------------------------------------------------------
  const lookupInviteCode = useCallback(async (code: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .rpc('get_team_by_invite_code', { code: code.trim().toUpperCase() });
    if (error) throw error;
    return data?.[0] ?? null;
  }, []);

  const joinTeam = useCallback(async (code: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not logged in');

    const teamData = await lookupInviteCode(code);
    if (!teamData) throw new Error('Invalid invite code');

    const { error } = await supabase
      .from('team_members')
      .insert({
        team_id: teamData.team_id,
        user_id: user.id,
        role: 'player',
        share_with_coach: false,
        share_match_data: false,
      });

    if (error) {
      if (error.code === '23505') throw new Error('You are already a member of this team');
      throw error;
    }

    await loadTeamData();
  }, [lookupInviteCode, loadTeamData]);

  // -------------------------------------------------------------------------
  // Create team
  // -------------------------------------------------------------------------
  const createTeam = useCallback(async (county: string, clubName: string, ageGroup: string, teamName: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not logged in');

    // Find or create club
    let { data: club, error: clubError } = await supabase
      .from('clubs')
      .select('id')
      .eq('name', clubName)
      .eq('county', county)
      .single();

    if (clubError && clubError.code === 'PGRST116') {
      const { data: newClub, error: createClubError } = await supabase
        .from('clubs')
        .insert({ name: clubName, county: county })
        .select()
        .single();
      if (createClubError) throw createClubError;
      club = newClub;
    } else if (clubError) {
      throw clubError;
    }

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        club_id: club!.id,
        age_group: ageGroup,
        team_name: teamName || null,
        season_year: new Date().getFullYear(),
        created_by: user.id,
      })
      .select()
      .single();
    if (teamError) throw teamError;

    const { error: memberError } = await supabase
      .from('team_members')
      .insert({ team_id: team.id, user_id: user.id, role: 'coach' });
    if (memberError) throw memberError;

    await loadTeamData();
    return team.invite_code as string;
  }, [loadTeamData]);

  // -------------------------------------------------------------------------
  // Update team
  // -------------------------------------------------------------------------
  const updateTeam = useCallback(async (data: { ageGroup: string; teamName: string; seasonYear: number }) => {
    if (!currentTeam) return;
    const supabase = createClient();

    const { error } = await supabase
      .from('teams')
      .update({
        age_group: data.ageGroup,
        team_name: data.teamName || null,
        season_year: data.seasonYear,
      })
      .eq('id', currentTeam.id);

    if (error) throw error;

    // Update store directly so the UI reflects the changes immediately
    setCurrentTeam({
      ...currentTeam,
      age_group: data.ageGroup,
      team_name: data.teamName || null,
      season_year: data.seasonYear,
    });
  }, [currentTeam, setCurrentTeam]);

  // -------------------------------------------------------------------------
  // Leave team
  // -------------------------------------------------------------------------
  const leaveTeam = useCallback(async () => {
    if (!currentMembership) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', currentMembership.id);
    if (error) throw error;
    clearTeam();
  }, [currentMembership, clearTeam]);

  // -------------------------------------------------------------------------
  // Team drills
  // -------------------------------------------------------------------------
  const loadTeamDrills = useCallback(async () => {
    if (!currentTeam) return;
    const supabase = createClient();
    try {
      const { data: drills, error } = await supabase
        .from('team_drills')
        .select('*')
        .eq('team_id', currentTeam.id)
        .order('due_date', { ascending: true });
      if (error) throw error;
      setTeamDrills((drills ?? []) as unknown as TeamDrill[]);

      // Load completions
      if (drills?.length) {
        const drillIds = drills.map((d) => d.id);
        const { data: completions } = await supabase
          .from('drill_completions')
          .select('*, profiles(display_name)')
          .in('drill_id', drillIds);
        setDrillCompletions((completions ?? []) as unknown as DrillCompletion[]);
      }
    } catch (err) {
      console.error('Error loading team drills:', err);
      setTeamDrills([]);
    }
  }, [currentTeam, setTeamDrills, setDrillCompletions]);

  const assignDrill = useCallback(async (data: {
    drillType: string;
    settings: { distance: number; shotType: string; foot: string; totalShots: number };
    startDate: string;
    dueDate: string;
    targetPercentage: number | null;
    notes: string | null;
  }) => {
    if (!currentTeam) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not logged in');

    const { data: drill, error } = await supabase
      .from('team_drills')
      .insert({
        team_id: currentTeam.id,
        created_by: user.id,
        drill_type: data.drillType,
        settings: data.settings,
        start_date: data.startDate,
        due_date: data.dueDate,
        target_percentage: data.targetPercentage,
        notes: data.notes,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    addTeamDrill(drill as unknown as TeamDrill);
  }, [currentTeam, addTeamDrill]);

  const deleteDrill = useCallback(async (drillId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('team_drills')
      .delete()
      .eq('id', drillId);
    if (error) throw error;
    removeTeamDrill(drillId);
  }, [removeTeamDrill]);

  // -------------------------------------------------------------------------
  // Player data (for coach view)
  // -------------------------------------------------------------------------
  const loadPlayerData = useCallback(async (playerUserId: string) => {
    if (!currentTeam) throw new Error('No team');
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_player_data', {
      p_player_user_id: playerUserId,
      p_team_id: currentTeam.id,
    });
    if (error) throw error;
    if (!data) throw new Error('No data returned');
    return data;
  }, [currentTeam]);

  // -------------------------------------------------------------------------
  // Copy invite code
  // -------------------------------------------------------------------------
  const copyInviteCode = useCallback(() => {
    if (!currentTeam) return;
    navigator.clipboard.writeText(currentTeam.invite_code).then(
      () => alert('Invite code copied!'),
      () => alert('Code: ' + currentTeam.invite_code),
    );
  }, [currentTeam]);

  return {
    // State
    currentTeam,
    currentMembership,
    teamMembers,
    teamDrills,
    drillCompletions,
    isCoach,
    isPlayer,

    // Actions
    loadTeamData,
    loadTeamMembers,
    loadTeamDrills,
    toggleSharePractice,
    toggleShareMatch,
    lookupInviteCode,
    joinTeam,
    createTeam,
    updateTeam,
    leaveTeam,
    assignDrill,
    deleteDrill,
    loadPlayerData,
    copyInviteCode,
    clearTeam,
  };
}
