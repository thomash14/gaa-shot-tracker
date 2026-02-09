async function loadTeamData() {
    if (!currentUser) return;
    try {
        const { data: membership, error: memberError } = await supabaseClient
            .from('team_members')
            .select('*, teams(*, clubs(*))')
            .eq('user_id', currentUser.id)
            .single();
        if (memberError) {
            if (memberError.code === 'PGRST116') {
                currentTeam = null;
                currentMembership = null;
                displayNoTeam();
            } else {
                console.error('Error loading team:', memberError);
                currentTeam = null;
                currentMembership = null;
                displayNoTeam();
            }
            return;
        }
        if (membership && membership.teams) {
            currentMembership = membership;
            currentTeam = membership.teams;
            displayTeamInfo();
        } else {
            currentTeam = null;
            currentMembership = null;
            displayNoTeam();
        }
    } catch (error) {
        console.error('Error loading team data:', error);
        currentTeam = null;
        currentMembership = null;
        displayNoTeam();
    }
}
function displayNoTeam() {
    document.getElementById('noTeamSection').style.display = 'block';
    document.getElementById('teamInfoSection').style.display = 'none';
    const assignedSection = document.getElementById('assignedDrillsSection');
    if (assignedSection) assignedSection.style.display = 'none';
    const isCoach = isUserCoach();
    const joinBtn = document.getElementById('joinTeamBtn');
    const createBtn = document.getElementById('createTeamBtn');
    const message = document.getElementById('noTeamMessage');
    if (isCoach) {
        joinBtn.style.display = 'none';
        createBtn.style.display = '';
        message.textContent = "You haven't created a team yet. Create one to start managing players.";
    } else {
        joinBtn.style.display = '';
        createBtn.style.display = 'none';
        message.textContent = "You're not part of a team yet. Ask your coach for an invite code to join.";
    }
}
function displayTeamInfo() {
    document.getElementById('noTeamSection').style.display = 'none';
    document.getElementById('teamInfoSection').style.display = 'block';
    const club = currentTeam.clubs;
    document.getElementById('teamClubName').textContent = club ? club.name : 'Unknown Club';
    document.getElementById('teamDetails').textContent = 
        `${currentTeam.age_group}${currentTeam.team_name ? ' • ' + currentTeam.team_name : ''} • ${currentTeam.season_year} Season`;
    const isCoach = currentMembership.role === 'coach';
    document.getElementById('teamRole').textContent = isCoach ? '🏅 Coach' : '👤 Player';
    document.getElementById('privacyToggleSection').style.display = isCoach ? 'none' : 'block';
    document.getElementById('inviteCodeSection').style.display = isCoach ? 'block' : 'none';
    document.getElementById('teamDrillsSection').style.display = isCoach ? 'block' : 'none';
    document.getElementById('playerDrillsSection').style.display = isCoach ? 'none' : 'block';
    if (isCoach) {
        document.getElementById('teamInviteCode').textContent = currentTeam.invite_code;
    } else {
        document.getElementById('shareWithCoachToggle').checked = currentMembership.share_with_coach;
        document.getElementById('shareMatchWithCoachToggle').checked = currentMembership.share_match_data || false;
    }
    loadTeamMembers();
    loadTeamDrills();
}
async function loadTeamMembers() {
    if (!currentTeam) return;
    const isCoach = currentMembership.role === 'coach';
    const container = document.getElementById('teamMembersList');
    try {
        let { data: members, error } = await supabaseClient
            .from('team_members')
            .select('id, user_id, role, share_with_coach, share_match_data')
            .eq('team_id', currentTeam.id);
        if (error) throw error;
        if (!members || members.length === 0) {
            container.innerHTML = '<p style="color: #666;">No team members yet</p>';
            return;
        }
        const userIds = members.map(m => m.user_id);
        let profiles = {};
        try {
            const { data: profileData, error: profileError } = await supabaseClient
                .from('profiles')
                .select('id, display_name, email')
                .in('id', userIds);
            if (!profileError && profileData) {
                profileData.forEach(p => {
                    profiles[p.id] = p;
                });
            }
        } catch (e) {
            console.log('Could not load profiles:', e);
        }
        container.innerHTML = members.map(m => {
            const profile = profiles[m.user_id];
            const name = profile?.display_name || profile?.email || 'Team Member';
            const roleClass = m.role === 'coach' ? 'coach' : '';
            const roleLabel = m.role === 'coach' ? 'Coach' : 'Player';
            let sharingBadge = '';
            const isSharing = m.share_with_coach || m.share_match_data;
            if (isCoach && m.role === 'player') {
                const badges = [];
                if (m.share_with_coach) badges.push('📊 Practice');
                if (m.share_match_data) badges.push('🏟️ Match');
                if (badges.length > 0) sharingBadge = `<span class="sharing-badge">${badges.join(' · ')}</span>`;
            }
            const clickable = isCoach && m.role === 'player' && isSharing;
            return `
                <div class="team-member-item ${clickable ? 'player-data-clickable' : ''}"
                     ${clickable ? `data-player-user-id="${m.user_id}" data-player-name="${name.replace(/"/g, '&quot;')}" onclick="openPlayerDataModal(this.dataset.playerUserId, this.dataset.playerName)"` : ''}>
                    <div class="member-info">
                        <span>${name}</span>
                        <span class="member-role ${roleClass}">${roleLabel}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        ${sharingBadge}
                        ${clickable ? '<span style="color: #999; font-size: 14px;">▸</span>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading team members:', error);
        container.innerHTML = '<p style="color: #c62828;">Error loading team members: ' + error.message + '</p>';
    }
}
async function toggleShareWithCoach() {
    const toggle = document.getElementById('shareWithCoachToggle');
    const newValue = toggle.checked;
    try {
        const { error } = await supabaseClient
            .from('team_members')
            .update({ share_with_coach: newValue })
            .eq('id', currentMembership.id);
        if (error) throw error;
        currentMembership.share_with_coach = newValue;
    } catch (error) {
        console.error('Error updating sharing preference:', error);
        toggle.checked = !newValue; // Revert
        alert('Failed to update sharing preference');
    }
}
async function toggleShareMatchWithCoach() {
    const toggle = document.getElementById('shareMatchWithCoachToggle');
    const newValue = toggle.checked;
    try {
        const { error } = await supabaseClient
            .from('team_members')
            .update({ share_match_data: newValue })
            .eq('id', currentMembership.id);
        if (error) throw error;
        currentMembership.share_match_data = newValue;
    } catch (error) {
        console.error('Error updating match sharing preference:', error);
        toggle.checked = !newValue; // Revert
        alert('Failed to update sharing preference');
    }
}
function showJoinTeamModal() {
    document.getElementById('joinTeamModal').style.display = 'flex';
    document.getElementById('inviteCodeInput').value = '';
    document.getElementById('joinTeamPreview').style.display = 'none';
    document.getElementById('joinTeamError').style.display = 'none';
    document.getElementById('inviteCodeInput').addEventListener('input', debounce(lookupInviteCode, 500));
}
function closeJoinTeamModal() {
    document.getElementById('joinTeamModal').style.display = 'none';
}
async function lookupInviteCode() {
    const code = document.getElementById('inviteCodeInput').value.trim().toUpperCase();
    const preview = document.getElementById('joinTeamPreview');
    const error = document.getElementById('joinTeamError');
    if (code.length !== 6) {
        preview.style.display = 'none';
        return;
    }
    try {
        const { data, error: lookupError } = await supabaseClient
            .rpc('get_team_by_invite_code', { code: code });
        if (lookupError) throw lookupError;
        if (data && data.length > 0) {
            const team = data[0];
            document.getElementById('previewClubName').textContent = team.club_name;
            document.getElementById('previewTeamDetails').textContent = 
                `${team.age_group}${team.team_name ? ' • ' + team.team_name : ''}`;
            preview.style.display = 'block';
            error.style.display = 'none';
        } else {
            preview.style.display = 'none';
            error.textContent = 'No team found with this code';
            error.style.display = 'block';
        }
    } catch (err) {
        console.error('Error looking up code:', err);
        preview.style.display = 'none';
    }
}
async function joinTeam() {
    const code = document.getElementById('inviteCodeInput').value.trim().toUpperCase();
    const error = document.getElementById('joinTeamError');
    if (code.length !== 6) {
        error.textContent = 'Please enter a 6-character code';
        error.style.display = 'block';
        return;
    }
    try {
        const { data: teamData, error: lookupError } = await supabaseClient
            .rpc('get_team_by_invite_code', { code: code });
        if (lookupError) throw lookupError;
        if (!teamData || teamData.length === 0) {
            error.textContent = 'Invalid invite code';
            error.style.display = 'block';
            return;
        }
        const teamId = teamData[0].team_id;
        const { error: joinError } = await supabaseClient
            .from('team_members')
            .insert({
                team_id: teamId,
                user_id: currentUser.id,
                role: 'player',
                share_with_coach: false,
                share_match_data: false
            });
        if (joinError) {
            if (joinError.code === '23505') {
                error.textContent = 'You are already a member of this team';
            } else {
                error.textContent = 'Failed to join team: ' + joinError.message;
            }
            error.style.display = 'block';
            return;
        }
        closeJoinTeamModal();
        await loadTeamData();
        alert('Successfully joined the team!');
    } catch (err) {
        console.error('Error joining team:', err);
        error.textContent = 'An error occurred. Please try again.';
        error.style.display = 'block';
    }
}
function showCreateTeamModal() {
    document.getElementById('createTeamModal').style.display = 'flex';
    document.getElementById('createTeamError').style.display = 'none';
    const countySelect = document.getElementById('createTeamCounty');
    countySelect.innerHTML = '<option value="">Select county...</option>';
    Object.keys(clubsByCounty).sort().forEach(county => {
        countySelect.innerHTML += `<option value="${county}">${county}</option>`;
    });
}
function closeCreateTeamModal() {
    document.getElementById('createTeamModal').style.display = 'none';
}
function updateCreateTeamClubs() {
    const county = document.getElementById('createTeamCounty').value;
    const clubSelect = document.getElementById('createTeamClub');
    if (!county) {
        clubSelect.innerHTML = '<option value="">Select county first...</option>';
        return;
    }
    const clubs = clubsByCounty[county] || [];
    clubSelect.innerHTML = '<option value="">Select club...</option>';
    clubs.forEach(club => {
        clubSelect.innerHTML += `<option value="${club}">${club}</option>`;
    });
}
async function createTeam() {
    const county = document.getElementById('createTeamCounty').value;
    const clubName = document.getElementById('createTeamClub').value;
    const ageGroup = document.getElementById('createTeamAgeGroup').value;
    const teamName = document.getElementById('createTeamName').value.trim();
    const error = document.getElementById('createTeamError');
    if (!county || !clubName || !ageGroup) {
        error.textContent = 'Please fill in all required fields';
        error.style.display = 'block';
        return;
    }
    try {
        let { data: club, error: clubError } = await supabaseClient
            .from('clubs')
            .select('id')
            .eq('name', clubName)
            .eq('county', county)
            .single();
        if (clubError && clubError.code === 'PGRST116') {
            const { data: newClub, error: createClubError } = await supabaseClient
                .from('clubs')
                .insert({ name: clubName, county: county })
                .select()
                .single();
            if (createClubError) throw createClubError;
            club = newClub;
        } else if (clubError) {
            throw clubError;
        }
        const { data: team, error: teamError } = await supabaseClient
            .from('teams')
            .insert({
                club_id: club.id,
                age_group: ageGroup,
                team_name: teamName || null,
                season_year: new Date().getFullYear(),
                created_by: currentUser.id
            })
            .select()
            .single();
        if (teamError) throw teamError;
        const { error: memberError } = await supabaseClient
            .from('team_members')
            .insert({
                team_id: team.id,
                user_id: currentUser.id,
                role: 'coach'
            });
        if (memberError) throw memberError;
        closeCreateTeamModal();
        await loadTeamData();
        alert(`Team created! Your invite code is: ${team.invite_code}`);
    } catch (err) {
        console.error('Error creating team:', err);
        error.textContent = 'Failed to create team: ' + err.message;
        error.style.display = 'block';
    }
}
function copyInviteCode() {
    const code = document.getElementById('teamInviteCode').textContent;
    navigator.clipboard.writeText(code).then(() => {
        alert('Invite code copied!');
    }).catch(() => {
        alert('Code: ' + code);
    });
}
async function leaveTeam() {
    if (!confirm('Are you sure you want to leave this team?')) return;
    try {
        const { error } = await supabaseClient
            .from('team_members')
            .delete()
            .eq('id', currentMembership.id);
        if (error) throw error;
        currentTeam = null;
        currentMembership = null;
        displayNoTeam();
        alert('You have left the team');
    } catch (err) {
        console.error('Error leaving team:', err);
        alert('Failed to leave team');
    }
}
function openAssignDrillModal() {
    const today = new Date().toISOString().split('T')[0];
    const startDateEl = document.getElementById('drillStartDate');
    startDateEl.value = today;
    startDateEl.min = today;
    document.getElementById('drillAvailableFor').value = '14'; // Default 2 weeks
    document.getElementById('drillTarget').value = '80';
    document.getElementById('drillNotes').value = '';
    document.getElementById('assignDrillError').style.display = 'none';
    document.getElementById('assignDrillModal').classList.add('active');
}
function closeAssignDrillModal() {
    document.getElementById('assignDrillModal').classList.remove('active');
}
function updateDrillOptions() {
}
async function assignDrill() {
    const drillType = document.getElementById('drillTypeSelect').value;
    const distance = document.getElementById('assignDrillDistance').value;
    const shotType = document.getElementById('assignDrillShotType').value;
    const foot = document.getElementById('assignDrillFoot').value;
    const totalShots = document.getElementById('assignDrillTotalShots').value;
    const startDate = document.getElementById('drillStartDate').value;
    const availableForDays = parseInt(document.getElementById('drillAvailableFor').value);
    const target = document.getElementById('drillTarget').value;
    const notes = document.getElementById('drillNotes').value;
    let expiresAt = null;
    if (availableForDays > 0) {
        const startParts = startDate.split('-');
        const expiry = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
        expiry.setDate(expiry.getDate() + availableForDays);
        expiresAt = expiry.toISOString().split('T')[0];
    }
    try {
        const drillData = {
            team_id: currentTeam.id,
            created_by: currentUser.id,
            drill_type: drillType,
            settings: {
                distance: parseInt(distance),
                shotType: shotType,
                foot: foot,
                totalShots: parseInt(totalShots)
            },
            start_date: startDate,
            due_date: expiresAt || '2099-12-31', // Use far future date if no expiry
            target_percentage: target ? parseInt(target) : null,
            notes: notes || null,
            status: 'active'
        };
        const { data, error } = await supabaseClient
            .from('team_drills')
            .insert(drillData)
            .select()
            .single();
        if (error) throw error;
        closeAssignDrillModal();
        loadTeamDrills();
        alert('Drill assigned successfully!');
    } catch (err) {
        console.error('Error assigning drill:', err);
        document.getElementById('assignDrillError').textContent = 'Failed to assign drill: ' + err.message;
        document.getElementById('assignDrillError').style.display = 'block';
    }
}
async function loadTeamDrills() {
    if (!currentTeam) return;
    const isCoach = currentMembership.role === 'coach';
    try {
        const { data: drills, error } = await supabaseClient
            .from('team_drills')
            .select('*')
            .eq('team_id', currentTeam.id)
            .order('due_date', { ascending: true });
        if (error) throw error;
        teamDrills = drills || [];
        if (isCoach) {
            renderCoachDrillsView();
        } else {
            renderPlayerDrillsView();
        }
    } catch (err) {
        console.error('Error loading team drills:', err);
        if (err.code === '42P01') {
            teamDrills = [];
            if (isCoach) {
                document.getElementById('assignedDrillsList').innerHTML = 
                    '<p style="color: #666; font-style: italic;">No drills assigned yet. Click "Assign Drill" to get started!</p>';
            } else {
                document.getElementById('playerAssignedDrillsList').innerHTML = 
                    '<p style="color: #666; font-style: italic;">No drills assigned yet.</p>';
            }
        }
    }
}
async function renderCoachDrillsView() {
    const container = document.getElementById('assignedDrillsList');
    const dashboardAssignedSection = document.getElementById('assignedDrillsSection');
    if (dashboardAssignedSection) dashboardAssignedSection.style.display = 'none';
    if (teamDrills.length === 0) {
        container.innerHTML = '<p style="color: #666; font-style: italic;">No drills assigned yet. Click "Assign Drill" to get started!</p>';
        return;
    }
    const drillIds = teamDrills.map(d => d.id);
    let completions = [];
    try {
        const { data, error } = await supabaseClient
            .from('drill_completions')
            .select('*, profiles(display_name)')
            .in('drill_id', drillIds);
        if (error) {
            console.log('Profiles join failed, trying without:', error.message);
            const result = await supabaseClient
                .from('drill_completions')
                .select('*')
                .in('drill_id', drillIds);
            if (result.error) {
                console.error('Error loading completions:', result.error);
            } else {
                completions = result.data || [];
                console.log('Loaded completions without profiles:', completions);
            }
        } else {
            completions = data || [];
            console.log('Loaded completions with profiles:', completions);
        }
    } catch (e) {
        console.error('Could not load completions:', e);
    }
    let playerCount = 0;
    try {
        const { data: members } = await supabaseClient
            .from('team_members')
            .select('id')
            .eq('team_id', currentTeam.id)
            .eq('role', 'player');
        playerCount = members?.length || 0;
    } catch (e) {}
    let profiles = {};
    if (completions.length > 0) {
        const userIds = [...new Set(completions.map(c => c.user_id))];
        try {
            const { data: profileData } = await supabaseClient
                .from('profiles')
                .select('id, display_name, email')
                .in('id', userIds);
            if (profileData) {
                profileData.forEach(p => {
                    profiles[p.id] = p;
                });
            }
        } catch (e) {
            console.log('Could not load profiles for completions:', e);
        }
    }
    const coachTodayStr = new Date().toISOString().split('T')[0];
    container.innerHTML = teamDrills.map(drill => {
        const settings = drill.settings || {};
        const assignedDate = new Date(drill.created_at);
        const expiresDate = new Date(drill.due_date);
        const isExpired = expiresDate < new Date() && expiresDate.getFullYear() < 2099;
        const hasNoExpiry = expiresDate.getFullYear() >= 2099;
        const isScheduled = drill.start_date && drill.start_date > coachTodayStr;
        const drillCompletions = completions.filter(c => c.drill_id === drill.id);
        const completedCount = drillCompletions.length;
        const footLabel = settings.foot === 'both' ? 'Both Feet' : (settings.foot === 'right' ? 'Right' : 'Left');
        const borderColor = isExpired ? '#999' : isScheduled ? '#FF9800' : '#2a5298';
        let scheduledBadge = '';
        if (isScheduled) {
            const startParts = drill.start_date.split('-');
            const startDateObj = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
            const startLabel = startDateObj.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
            scheduledBadge = `<span style="background: #FF9800; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px;">Starts ${startLabel}</span>`;
        }
        return `
            <div class="stat-card" style="margin-bottom: 15px; padding: 15px; border-left: 4px solid ${borderColor}; ${isExpired ? 'opacity: 0.7;' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <strong style="font-size: 15px;">Scoring Arc - ${settings.distance}m${scheduledBadge}</strong>
                        <div style="color: #666; font-size: 12px; margin-top: 4px;">
                            ${settings.totalShots} shots • ${settings.shotType} • ${footLabel}
                        </div>
                        ${drill.target_percentage ? `<div style="color: #4CAF50; font-size: 12px;">Target: ${drill.target_percentage}%</div>` : ''}
                        ${drill.notes ? `<div style="color: #666; font-size: 11px; font-style: italic; margin-top: 4px;">${drill.notes}</div>` : ''}
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 11px; color: #666;">
                            Assigned: ${assignedDate.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}
                        </div>
                        <div style="font-size: 11px; color: ${isExpired ? '#c62828' : '#666'};">
                            ${hasNoExpiry ? 'No expiry' : (isExpired ? 'Expired' : `Expires: ${expiresDate.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}`)}
                        </div>
                        <div style="font-size: 14px; font-weight: bold; color: #2a5298; margin-top: 4px;">
                            ${completedCount}/${playerCount} completed
                        </div>
                    </div>
                </div>
                ${drillCompletions.length > 0 ? `
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
                        <div style="font-size: 11px; color: #666; margin-bottom: 5px;">Completions:</div>
                        ${drillCompletions.map(c => {
                            const profile = profiles[c.user_id];
                            const playerName = profile?.display_name || profile?.email || 'Player';
                            return `
                            <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0;">
                                <span>${playerName}</span>
                                <span style="color: ${c.score_percentage >= (drill.target_percentage || 80) ? '#4CAF50' : '#FF9800'}; font-weight: 600;">
                                    ${c.scored}/${c.total} (${c.score_percentage}%)
                                </span>
                            </div>
                        `}).join('')}
                    </div>
                ` : ''}
                <div style="margin-top: 10px; display: flex; gap: 10px;">
                    <button class="btn-secondary" onclick="deleteDrill('${drill.id}')" style="padding: 5px 10px; font-size: 11px; color: #c62828;">🗑️ Delete</button>
                </div>
            </div>
        `;
    }).join('');
}
async function renderPlayerDrillsView() {
    const container = document.getElementById('playerAssignedDrillsList');
    if (teamDrills.length === 0) {
        container.innerHTML = '<p style="color: #666; font-style: italic;">No drills assigned yet.</p>';
        renderDashboardAssignedDrills([], []); // Update dashboard too
        return;
    }
    let myCompletions = [];
    try {
        const { data, error } = await supabaseClient
            .from('drill_completions')
            .select('*')
            .eq('user_id', currentUser.id);
        if (!error) myCompletions = data || [];
    } catch (e) {
        console.log('Could not load my completions:', e);
    }
    const completedDrillIds = myCompletions.map(c => c.drill_id);
    const todayStr = new Date().toISOString().split('T')[0];
    const activeDrills = teamDrills.filter(d => {
        // Hide drills that haven't started yet
        if (d.start_date && d.start_date > todayStr) return false;
        const expiresDate = new Date(d.due_date);
        const isExpired = expiresDate < new Date() && expiresDate.getFullYear() < 2099;
        const isCompleted = completedDrillIds.includes(d.id);
        return !isExpired || isCompleted;
    });
    renderDashboardAssignedDrills(activeDrills, completedDrillIds);
    if (activeDrills.length === 0) {
        container.innerHTML = '<p style="color: #666; font-style: italic;">No drills assigned yet.</p>';
        return;
    }
    container.innerHTML = activeDrills.map(drill => {
        const settings = drill.settings || {};
        const addedDate = new Date(drill.created_at);
        const isCompleted = completedDrillIds.includes(drill.id);
        const myCompletion = myCompletions.find(c => c.drill_id === drill.id);
        const footLabel = settings.foot === 'both' ? 'Both Feet' : (settings.foot === 'right' ? 'Right' : 'Left');
        return `
            <div class="stat-card" style="margin-bottom: 15px; padding: 15px; border-left: 4px solid ${isCompleted ? '#4CAF50' : '#2a5298'};">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <strong style="font-size: 15px;">
                            ${isCompleted ? '✅ ' : '🎯 '}Scoring Arc - ${settings.distance}m
                        </strong>
                        <div style="color: #666; font-size: 12px; margin-top: 4px;">
                            ${settings.totalShots} shots • ${settings.shotType} • ${footLabel}
                        </div>
                        ${drill.target_percentage ? `<div style="color: #4CAF50; font-size: 12px;">Target: ${drill.target_percentage}%</div>` : ''}
                        ${drill.notes ? `<div style="color: #666; font-size: 11px; font-style: italic; margin-top: 4px;">"${drill.notes}"</div>` : ''}
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 11px; color: #666;">
                            Added ${addedDate.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}
                        </div>
                        ${isCompleted ? `
                            <div style="font-size: 14px; font-weight: bold; color: ${myCompletion.score_percentage >= (drill.target_percentage || 80) ? '#4CAF50' : '#FF9800'}; margin-top: 4px;">
                                ${myCompletion.scored}/${myCompletion.total} (${myCompletion.score_percentage}%)
                            </div>
                        ` : ''}
                    </div>
                </div>
                ${!isCompleted ? `
                    <div style="margin-top: 10px;">
                        <button class="btn-primary" onclick="startAssignedDrill('${drill.id}')" style="width: 100%;">
                            Start Practice
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}
function renderDashboardAssignedDrills(activeDrills, completedDrillIds) {
    const section = document.getElementById('assignedDrillsSection');
    const container = document.getElementById('assignedDrillsList');
    const countBadge = document.getElementById('assignedDrillsCount');
    if (!section || !container) return;
    const dashTodayStr = new Date().toISOString().split('T')[0];
    const pendingDrills = activeDrills.filter(d => !completedDrillIds.includes(d.id) && !(d.start_date && d.start_date > dashTodayStr));
    if (pendingDrills.length === 0) {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'block';
    countBadge.textContent = `${pendingDrills.length} to do`;
    container.innerHTML = pendingDrills.map(drill => {
        const settings = drill.settings || {};
        const dueDate = new Date(drill.due_date);
        const isExpiringSoon = dueDate < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) && dueDate.getFullYear() < 2099;
        let expiryBadge = '';
        if (dueDate.getFullYear() < 2099) {
            const today = new Date();
            const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            if (diffDays <= 0) {
                expiryBadge = '<span style="background: #f44336; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 8px;">Expires today</span>';
            } else if (diffDays === 1) {
                expiryBadge = '<span style="background: #FF9800; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 8px;">Expires tomorrow</span>';
            } else if (diffDays <= 3) {
                expiryBadge = `<span style="background: #FFB300; color: #333; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 8px;">Expires in ${diffDays} days</span>`;
            }
        }
        return `
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: ${isExpiringSoon ? '#fff8e1' : '#f8f9fa'}; border-radius: 8px; margin-bottom: 8px;">
                <div style="flex: 1; font-weight: 500; color: #2a5298; font-size: 14px;">
                    🎯 Scoring Arc - ${settings.distance}m ${settings.shotType}
                    ${expiryBadge}
                </div>
                <button class="btn-secondary" onclick="showAssignedDrillInfo('${drill.id}')" style="padding: 6px 10px; font-size: 12px;" title="View details">
                    ℹ️
                </button>
                <button class="btn-primary" onclick="startAssignedDrill('${drill.id}')" style="padding: 6px 14px; font-size: 13px;">
                    Start
                </button>
            </div>
        `;
    }).join('');
}
function showAssignedDrillInfo(drillId) {
    const drill = teamDrills.find(d => d.id === drillId);
    if (!drill) return;
    const settings = drill.settings || {};
    const footLabel = settings.foot === 'both' ? 'Both Feet' : (settings.foot === 'right' ? 'Right Foot' : 'Left Foot');
    const dueDate = new Date(drill.due_date);
    let expiryText = 'No time limit';
    if (dueDate.getFullYear() < 2099) {
        const diffDays = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) expiryText = 'Expires today';
        else if (diffDays === 1) expiryText = 'Expires tomorrow';
        else expiryText = `Expires in ${diffDays} days`;
    }
    const content = `
        <div style="line-height: 1.8;">
            <p><strong>Distance:</strong> ${settings.distance}m</p>
            <p><strong>Shot Type:</strong> ${settings.shotType}</p>
            <p><strong>Foot:</strong> ${footLabel}</p>
            <p><strong>Total Shots:</strong> ${settings.totalShots}</p>
            ${drill.target_percentage ? `<p><strong>Target:</strong> ${drill.target_percentage}% accuracy</p>` : ''}
            <p><strong>Availability:</strong> ${expiryText}</p>
            ${drill.notes ? `<p style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 6px; font-style: italic;">"${drill.notes}"</p>` : ''}
        </div>
    `;
    document.getElementById('drillDescriptionTitle').textContent = `Scoring Arc - ${settings.distance}m`;
    document.getElementById('drillDescriptionContent').innerHTML = content;
    document.getElementById('drillVideoContainer').style.display = 'none';
    document.getElementById('drillDescriptionModal').classList.add('active');
}
async function deleteDrill(drillId) {
    if (!confirm('Are you sure you want to delete this drill?')) return;
    try {
        const { error } = await supabaseClient
            .from('team_drills')
            .delete()
            .eq('id', drillId);
        if (error) throw error;
        loadTeamDrills();
    } catch (err) {
        console.error('Error deleting drill:', err);
        alert('Failed to delete drill');
    }
}
async function startAssignedDrill(drillId) {
    console.log('Starting assigned drill:', drillId);
    console.log('Available drills:', teamDrills);
    const drill = teamDrills.find(d => d.id === drillId);
    if (!drill) {
        console.error('Drill not found:', drillId);
        alert('Could not find drill. Please refresh and try again.');
        return;
    }
    const settings = drill.settings;
    console.log('Drill settings:', settings);
    drillSettings.distance = settings.distance;
    drillSettings.shotType = settings.shotType;
    drillSettings.footOption = settings.foot;
    drillSettings.totalShots = settings.totalShots;
    window.currentAssignedDrillId = drillId;
    switchSection('track-practice');
    setTimeout(() => {
        const distanceEl = document.getElementById('drillDistance');
        const shotTypeEl = document.getElementById('drillShotType');
        const footEl = document.getElementById('drillFoot');
        const totalShotsEl = document.getElementById('drillTotalShots');
        if (distanceEl) distanceEl.value = settings.distance;
        if (shotTypeEl) shotTypeEl.value = settings.shotType;
        if (footEl) footEl.value = settings.foot;
        if (totalShotsEl) totalShotsEl.value = settings.totalShots;
        const sessionNameEl = document.getElementById('sessionName');
        const sessionDateEl = document.getElementById('sessionDate');
        if (sessionNameEl) {
            sessionNameEl.value = `Assigned Drill - ${settings.distance}m ${settings.shotType}`;
        }
        if (sessionDateEl) {
            sessionDateEl.value = new Date().toISOString().split('T')[0];
        }
        if (currentSession) {
            endSession();
        }
        currentSession = {
            id: Date.now(),
            name: `Assigned Drill - ${settings.distance}m ${settings.shotType}`,
            date: new Date().toISOString().split('T')[0],
            type: 'practice',
            matchType: null,
            shots: [],
            startTime: new Date().toISOString()
        };
        document.getElementById('currentSessionBanner').style.display = 'block';
        document.getElementById('currentSessionName').textContent = currentSession.name;
        document.getElementById('currentSessionDetails').textContent = `practice - ${currentSession.date}`;
        const drillsContainer = document.getElementById('drillsContainer');
        if (drillsContainer && drillsContainer.style.display === 'none') {
            toggleDrills();
        }
        renderPracticeTemplates();
        setTimeout(() => {
            selectTemplate('scoring-zones');
            alert('Drill started! Complete all 5 spots and click "Finish Session" when done.');
        }, 200);
    }, 400);
}

// ========== Coach Player Data View ==========
let playerDataCache = null;
let playerDataSessions = [];
let currentPlayerDataType = 'practice';

async function openPlayerDataModal(playerUserId, playerName) {
    const modal = document.getElementById('playerDataModal');
    document.getElementById('playerDataTitle').textContent = `${playerName}'s Data`;
    document.getElementById('playerDataLoading').style.display = 'block';
    document.getElementById('playerDataError').style.display = 'none';
    document.getElementById('playerDataContent').style.display = 'none';
    modal.classList.add('active');

    try {
        const { data, error } = await supabaseClient.rpc('get_player_data', {
            p_player_user_id: playerUserId,
            p_team_id: currentTeam.id
        });
        if (error) throw error;
        if (!data) throw new Error('No data returned');

        playerDataCache = data;
        playerDataSessions = (data.sessions || []).map(s => ({
            id: s.id,
            name: s.name,
            date: s.date,
            type: s.type,
            matchType: s.match_type,
            sessionNotes: s.session_notes,
            didWell: s.did_well,
            toImprove: s.to_improve,
            windDirection: s.wind_direction,
            windStrength: s.wind_strength,
            shots: (s.shots || []).map(sh => ({
                x: sh.x,
                y: sh.y,
                distance: sh.distance,
                foot: sh.foot,
                half: sh.half,
                shotFor: sh.shot_for,
                shotCategory: sh.shot_category,
                shotType: sh.shot_type,
                pointValue: sh.point_value,
                result: sh.result,
                timestamp: sh.timestamp,
                comment: sh.comment,
                missResult: sh.miss_result,
                missReason: sh.miss_reason
            }))
        }));

        const hasPractice = data.share_practice && playerDataSessions.some(s => s.type === 'practice');
        const hasMatch = data.share_match && playerDataSessions.some(s => s.type === 'match');
        const tabsEl = document.getElementById('playerDataTabs');

        if (hasPractice && hasMatch) {
            tabsEl.style.display = 'flex';
            currentPlayerDataType = 'practice';
        } else if (hasMatch) {
            tabsEl.style.display = 'none';
            currentPlayerDataType = 'match';
        } else {
            tabsEl.style.display = 'none';
            currentPlayerDataType = 'practice';
        }

        document.getElementById('playerDataLoading').style.display = 'none';
        document.getElementById('playerDataContent').style.display = 'block';

        resetPlayerDataFilters();
        switchPlayerDataType(currentPlayerDataType);
    } catch (err) {
        console.error('Error loading player data:', err);
        document.getElementById('playerDataLoading').style.display = 'none';
        const errorEl = document.getElementById('playerDataError');
        errorEl.textContent = 'Failed to load player data: ' + (err.message || 'Unknown error');
        errorEl.style.display = 'block';
    }
}

function closePlayerDataModal() {
    document.getElementById('playerDataModal').classList.remove('active');
    playerDataCache = null;
    playerDataSessions = [];
    resetPlayerDataFilters();
    hideShotTooltip();
    const wrapper = document.getElementById('playerDataPitchWrapper');
    wrapper.querySelectorAll('.analytics-shot-marker, .shot-tooltip').forEach(m => m.remove());
}

function resetPlayerDataFilters() {
    document.getElementById('pd-dateRangeFilter').value = 'all';
    document.getElementById('pd-customSessionContainer').style.display = 'none';
    document.getElementById('pd-customDateContainer').style.display = 'none';
    resetMultiSelect('pd-shotCategoryFilter');
    resetMultiSelect('pd-shotTypeFilter');
    resetMultiSelect('pd-footFilter');
    resetMultiSelect('pd-resultFilter');
    resetMultiSelect('pd-halfFilter');
    resetMultiSelect('pd-matchTypeFilter');
    resetMultiSelect('pd-windDirectionFilter');
    resetMultiSelect('pd-windStrengthFilter');
    document.getElementById('pd-showZoneOverlay').checked = false;
    document.getElementById('pd-zoneOverlays').style.display = 'none';
}

function switchPlayerDataType(type) {
    currentPlayerDataType = type;
    document.getElementById('playerDataPracticeTab').classList.toggle('active', type === 'practice');
    document.getElementById('playerDataMatchTab').classList.toggle('active', type === 'match');
    const sessionWord = type === 'match' ? 'Games' : 'Practices';
    document.getElementById('pd-dateRangeLabel').textContent = type === 'match' ? 'Date/Game Range:' : 'Date/Practice Range:';
    document.getElementById('pd-gamesLabel').textContent = sessionWord;
    const customSessionsOption = document.querySelector('#pd-dateRangeFilter option[value="customSessions"]');
    if (customSessionsOption) {
        customSessionsOption.textContent = type === 'match' ? 'Custom Game Range...' : 'Custom Practice Range...';
    }
    document.getElementById('pd-halfFilterContainer').style.display = type === 'match' ? 'flex' : 'none';
    document.getElementById('pd-matchTypeFilterContainer').style.display = type === 'match' ? 'block' : 'none';
    document.getElementById('pd-sessionsLabel').textContent = type === 'match' ? 'Matches' : 'Sessions';
    // Reset filters on tab switch
    document.getElementById('pd-dateRangeFilter').value = 'all';
    document.getElementById('pd-customSessionContainer').style.display = 'none';
    document.getElementById('pd-customDateContainer').style.display = 'none';
    resetMultiSelect('pd-shotCategoryFilter');
    resetMultiSelect('pd-shotTypeFilter');
    resetMultiSelect('pd-footFilter');
    resetMultiSelect('pd-resultFilter');
    resetMultiSelect('pd-halfFilter');
    resetMultiSelect('pd-matchTypeFilter');
    resetMultiSelect('pd-windDirectionFilter');
    resetMultiSelect('pd-windStrengthFilter');
    displayPlayerDataAnalytics();
}

function handlePlayerDataDateRangeChange() {
    const dateRange = document.getElementById('pd-dateRangeFilter').value;
    const customDateContainer = document.getElementById('pd-customDateContainer');
    const customSessionContainer = document.getElementById('pd-customSessionContainer');
    if (dateRange === 'custom') {
        customDateContainer.style.display = 'flex';
        customSessionContainer.style.display = 'none';
        const dateFrom = document.getElementById('pd-dateFrom');
        const dateTo = document.getElementById('pd-dateTo');
        if (!dateFrom.value) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            dateFrom.value = thirtyDaysAgo.toISOString().split('T')[0];
        }
        if (!dateTo.value) {
            dateTo.value = new Date().toISOString().split('T')[0];
        }
    } else if (dateRange === 'customSessions') {
        customSessionContainer.style.display = 'flex';
        customDateContainer.style.display = 'none';
    } else {
        customDateContainer.style.display = 'none';
        customSessionContainer.style.display = 'none';
    }
    applyPlayerDataFilters();
}

function getPlayerDataDateRangeFilter() {
    const dateRange = document.getElementById('pd-dateRangeFilter').value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let startDate = null;
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    if (dateRange === 'customSessions') {
        const count = parseInt(document.getElementById('pd-sessionCountFilter').value);
        return { startDate: null, endDate: null, sessionLimit: count };
    }
    switch(dateRange) {
        case 'all':
            return { startDate: null, endDate: null };
        case 'today':
            startDate = new Date(today);
            break;
        case 'last7':
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 6);
            break;
        case 'last30':
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 29);
            break;
        case 'thisMonth':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
        case 'lastMonth':
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
            break;
        case 'thisYear':
            startDate = new Date(today.getFullYear(), 0, 1);
            break;
        case 'custom':
            const fromValue = document.getElementById('pd-dateFrom').value;
            const toValue = document.getElementById('pd-dateTo').value;
            if (fromValue) {
                startDate = new Date(fromValue);
                startDate.setHours(0, 0, 0, 0);
            }
            if (toValue) {
                endDate = new Date(toValue);
                endDate.setHours(23, 59, 59, 999);
            }
            break;
    }
    return { startDate, endDate };
}

function handlePlayerDataWindDirectionChange() {
    applyPlayerDataFilters();
}

function applyPlayerDataFilters() {
    displayPlayerDataAnalytics();
}

function togglePlayerDataZoneOverlay() {
    const overlay = document.getElementById('pd-zoneOverlays');
    const checkbox = document.getElementById('pd-showZoneOverlay');
    overlay.style.display = checkbox.checked ? 'block' : 'none';
}

function displayPlayerDataAnalytics() {
    pdUncheckedSessionIds.clear();
    const { startDate, endDate, sessionLimit } = getPlayerDataDateRangeFilter();
    let filteredSessions = playerDataSessions.filter(s => s.type === currentPlayerDataType);
    if (sessionLimit) {
        filteredSessions = filteredSessions.slice(0, sessionLimit);
    } else if (startDate || endDate) {
        filteredSessions = filteredSessions.filter(s => {
            const dateParts = s.date.split('-');
            const sessionDate = new Date(
                parseInt(dateParts[0]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[2]),
                12, 0, 0, 0
            );
            if (startDate && sessionDate < startDate) return false;
            if (endDate && sessionDate > endDate) return false;
            return true;
        });
    }

    let allShots = filteredSessions.flatMap(s => s.shots.map(shot => ({
        ...shot,
        sessionId: s.id,
        matchType: s.matchType,
        windDirection: s.windDirection || null,
        windStrength: s.windStrength || null
    })));

    // Competition filter (match only)
    if (currentPlayerDataType === 'match') {
        const customTypes = [...new Set(filteredSessions.map(s => s.matchType).filter(t => t && !['league', 'championship', 'challenge'].includes(t)))];
        const allOpts = [
            { value: 'league', label: 'League' },
            { value: 'championship', label: 'Championship' },
            { value: 'challenge', label: 'Challenge' },
            ...customTypes.map(t => ({ value: t, label: t }))
        ];
        setMultiSelectOptions('pd-matchTypeFilter', allOpts);
        allShots = msFilterShots(allShots, 'pd-matchTypeFilter', 'matchType');
    }

    // Shot-level filters
    allShots = msFilterShots(allShots, 'pd-shotCategoryFilter', 'shotCategory');
    allShots = msFilterShots(allShots, 'pd-shotTypeFilter', 'shotType');
    allShots = msFilterShots(allShots, 'pd-footFilter', 'foot');
    allShots = msFilterShots(allShots, 'pd-resultFilter', 'result');
    allShots = msFilterShots(allShots, 'pd-halfFilter', 'half');
    allShots = msFilterShots(allShots, 'pd-windDirectionFilter', 'windDirection');
    allShots = msFilterShots(allShots, 'pd-windStrengthFilter', 'windStrength');

    lastPdFilteredAllShots = allShots;
    updatePdConversionStats(allShots);
    document.getElementById('pd-totalSessions').textContent = filteredSessions.length;
    document.getElementById('pd-statsTableHeading').textContent = currentPlayerDataType === 'match' ? 'Match Breakdown' : 'Session Breakdown';

    renderShotMapFromShots(allShots, 'playerDataPitchWrapper');
    renderPlayerDataStatsTable(filteredSessions);
    updatePdZoneStats(allShots);
}

function updatePdConversionStats(allShots) {
    const totalShots = allShots.length;
    const scored = allShots.filter(s => s.result === 'scored').length;
    const successRate = totalShots > 0 ? Math.round((scored / totalShots) * 100) : 0;
    const inPlayShots = allShots.filter(s => s.shotCategory === 'in-play');
    const inPlayScored = inPlayShots.filter(s => s.result === 'scored').length;
    const inPlayRate = inPlayShots.length > 0 ? Math.round((inPlayScored / inPlayShots.length) * 100) : 0;
    const deadBallShots = allShots.filter(s => s.shotCategory === 'free-kick' || s.shotCategory === '45');
    const deadBallScored = deadBallShots.filter(s => s.result === 'scored').length;
    const deadBallRate = deadBallShots.length > 0 ? Math.round((deadBallScored / deadBallShots.length) * 100) : 0;
    const onePointerShots = allShots.filter(s => (s.pointValue === 1 || !s.pointValue) && s.shotFor !== 'goal');
    const onePointerScored = onePointerShots.filter(s => s.result === 'scored').length;
    const onePointerRate = onePointerShots.length > 0 ? Math.round((onePointerScored / onePointerShots.length) * 100) : 0;
    const twoPointerShots = allShots.filter(s => s.pointValue === 2 && s.shotFor !== 'goal');
    const twoPointerScored = twoPointerShots.filter(s => s.result === 'scored').length;
    const twoPointerRate = twoPointerShots.length > 0 ? Math.round((twoPointerScored / twoPointerShots.length) * 100) : 0;
    const goalShots = allShots.filter(s => s.shotFor === 'goal');
    const goalScored = goalShots.filter(s => s.result === 'scored').length;
    const goalRate = goalShots.length > 0 ? Math.round((goalScored / goalShots.length) * 100) : 0;
    document.getElementById('pd-conversionTotal').textContent = `${scored}/${totalShots} (${successRate}%)`;
    document.getElementById('pd-inPlayConv').textContent = `${inPlayScored}/${inPlayShots.length} (${inPlayRate}%)`;
    document.getElementById('pd-deadBallConv').textContent = `${deadBallScored}/${deadBallShots.length} (${deadBallRate}%)`;
    document.getElementById('pd-onePointerConv').textContent = `${onePointerScored}/${onePointerShots.length} (${onePointerRate}%)`;
    document.getElementById('pd-twoPointerConv').textContent = `${twoPointerScored}/${twoPointerShots.length} (${twoPointerRate}%)`;
    document.getElementById('pd-goalConv').textContent = `${goalScored}/${goalShots.length} (${goalRate}%)`;
}

function updatePdZoneStats(allShots) {
    const zones = {};
    allShots.forEach(shot => {
        const zoneInfo = getZone(shot.x, shot.y);
        const zoneKey = zoneInfo.zone;
        if (!zones[zoneKey]) {
            zones[zoneKey] = { total: 0, scored: 0, name: zoneInfo.name, color: zoneInfo.color, zone: zoneInfo.zone };
        }
        zones[zoneKey].total++;
        if (shot.result === 'scored') zones[zoneKey].scored++;
    });
    const zoneStatsEl = document.getElementById('pd-zoneStats');
    if (Object.keys(zones).length === 0) {
        zoneStatsEl.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><p>No shot data for the current filters.</p></div>';
    } else {
        const sortedZones = Object.values(zones).sort((a, b) => a.zone - b.zone);
        let zoneHTML = '<div style="grid-column: 1/-1; margin-bottom: 15px;"><h3 style="color: #2a5298; margin: 0 0 10px 0;">Zone Conversion Rates</h3></div>';
        zoneHTML += sortedZones.map(stats => {
            const rate = Math.round((stats.scored / stats.total) * 100);
            const rateColor = rate >= 80 ? '#4CAF50' : rate >= 60 ? '#8BC34A' : rate >= 40 ? '#FF9800' : '#f44336';
            return `
                <div class="zone-card" style="border-left: 4px solid ${stats.color};">
                    <div class="zone-name">
                        <span style="background: ${stats.color}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-right: 5px;">${stats.zone}</span>
                        ${stats.name}
                    </div>
                    <div style="font-size: 1.5em; font-weight: bold; color: ${rateColor}; margin: 10px 0;">${rate}%</div>
                    <div style="font-size: 0.9em; color: #666;">${stats.scored}/${stats.total} shots</div>
                </div>
            `;
        }).join('');
        const shotsWithDistance = allShots.filter(s => s.distance !== undefined);
        if (shotsWithDistance.length > 0) {
            const avgDistance = shotsWithDistance.reduce((sum, s) => sum + s.distance, 0) / shotsWithDistance.length;
            const scoredWithDist = shotsWithDistance.filter(s => s.result === 'scored');
            const missedWithDist = shotsWithDistance.filter(s => s.result === 'missed');
            const avgScoredDistance = scoredWithDist.length > 0 ? scoredWithDist.reduce((sum, s) => sum + s.distance, 0) / scoredWithDist.length : 0;
            const avgMissedDistance = missedWithDist.length > 0 ? missedWithDist.reduce((sum, s) => sum + s.distance, 0) / missedWithDist.length : 0;
            zoneHTML += `
                <div style="grid-column: 1/-1; margin: 15px 0 10px 0;"><h3 style="color: #2a5298; margin: 0;">Distance Analysis</h3></div>
                <div class="zone-card">
                    <div class="zone-name">Average Distance</div>
                    <div style="font-size: 1.5em; font-weight: bold; color: #2a5298; margin: 10px 0;">${avgDistance.toFixed(1)}m</div>
                    <div style="font-size: 0.9em; color: #666;">All shots</div>
                </div>
                <div class="zone-card">
                    <div class="zone-name">Scored Distance</div>
                    <div style="font-size: 1.5em; font-weight: bold; color: #4CAF50; margin: 10px 0;">${avgScoredDistance.toFixed(1)}m</div>
                    <div style="font-size: 0.9em; color: #666;">${scoredWithDist.length} shots scored</div>
                </div>
                <div class="zone-card">
                    <div class="zone-name">Missed Distance</div>
                    <div style="font-size: 1.5em; font-weight: bold; color: #f44336; margin: 10px 0;">${avgMissedDistance.toFixed(1)}m</div>
                    <div style="font-size: 0.9em; color: #666;">${missedWithDist.length} shots missed</div>
                </div>
            `;
        }
        const shotsWithFoot = allShots.filter(s => s.foot !== undefined);
        if (shotsWithFoot.length > 0) {
            const leftFootShots = shotsWithFoot.filter(s => s.foot === 'left');
            const rightFootShots = shotsWithFoot.filter(s => s.foot === 'right');
            const leftScored = leftFootShots.filter(s => s.result === 'scored').length;
            const rightScored = rightFootShots.filter(s => s.result === 'scored').length;
            const leftRate = leftFootShots.length > 0 ? Math.round((leftScored / leftFootShots.length) * 100) : 0;
            const rightRate = rightFootShots.length > 0 ? Math.round((rightScored / rightFootShots.length) * 100) : 0;
            zoneHTML += `
                <div style="grid-column: 1/-1; margin: 15px 0 10px 0;"><h3 style="color: #2a5298; margin: 0;">Foot Analysis</h3></div>
                <div class="zone-card">
                    <div class="zone-name">Left Foot</div>
                    <div style="font-size: 1.5em; font-weight: bold; color: #2a5298; margin: 10px 0;">${leftRate}%</div>
                    <div style="font-size: 0.9em; color: #666;">${leftScored}/${leftFootShots.length} shots</div>
                </div>
                <div class="zone-card">
                    <div class="zone-name">Right Foot</div>
                    <div style="font-size: 1.5em; font-weight: bold; color: #2a5298; margin: 10px 0;">${rightRate}%</div>
                    <div style="font-size: 0.9em; color: #666;">${rightScored}/${rightFootShots.length} shots</div>
                </div>
            `;
        }
        zoneStatsEl.innerHTML = zoneHTML;
    }
}

function handlePdSessionCheckboxChange(sessionId, isChecked) {
    const id = String(sessionId);
    if (isChecked) {
        pdUncheckedSessionIds.delete(id);
    } else {
        pdUncheckedSessionIds.add(id);
    }
    updatePlayerDataFromCheckboxes();
    const selectAll = document.getElementById('pdStatsSelectAll');
    if (selectAll) {
        const total = lastPdSessionRows.length;
        const uncheckedCount = pdUncheckedSessionIds.size;
        selectAll.checked = uncheckedCount === 0;
        selectAll.indeterminate = uncheckedCount > 0 && uncheckedCount < total;
    }
}

function handlePdStatsSelectAll(isChecked) {
    pdUncheckedSessionIds.clear();
    if (!isChecked) {
        lastPdSessionRows.forEach(r => pdUncheckedSessionIds.add(String(r.session.id)));
    }
    document.querySelectorAll('#pd-statsTableContainer .pd-session-row-cb').forEach(cb => {
        cb.checked = isChecked;
    });
    updatePlayerDataFromCheckboxes();
}

function updatePlayerDataFromCheckboxes() {
    const checkedShots = lastPdFilteredAllShots.filter(s => !pdUncheckedSessionIds.has(String(s.sessionId)));
    updatePdConversionStats(checkedShots);
    renderShotMapFromShots(checkedShots, 'playerDataPitchWrapper');
    updatePdZoneStats(checkedShots);
    const checkedCount = lastPdSessionRows.filter(r => !pdUncheckedSessionIds.has(String(r.session.id))).length;
    document.getElementById('pd-totalSessions').textContent = checkedCount;
    updateSummaryRow(lastPdSessionRows, pdUncheckedSessionIds, 'pd-statsTableContainer', lastPdTableMeta);
    document.querySelectorAll('#pd-statsTableContainer tbody tr[data-session-id]').forEach(tr => {
        const sid = tr.getAttribute('data-session-id');
        tr.classList.toggle('session-unchecked', pdUncheckedSessionIds.has(sid));
    });
}

function renderPlayerDataStatsTable(filteredSessions) {
    const container = document.getElementById('pd-statsTableContainer');

    if (filteredSessions.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:20px 0;">No sessions to display.</p>';
        return;
    }

    function filterShots(session) {
        let shots = (session.shots || []).map(s => ({...s, matchType: session.matchType, windDirection: session.windDirection || null, windStrength: session.windStrength || null}));
        if (currentPlayerDataType === 'match') shots = msFilterShots(shots, 'pd-matchTypeFilter', 'matchType');
        shots = msFilterShots(shots, 'pd-shotCategoryFilter', 'shotCategory');
        shots = msFilterShots(shots, 'pd-shotTypeFilter', 'shotType');
        shots = msFilterShots(shots, 'pd-footFilter', 'foot');
        shots = msFilterShots(shots, 'pd-resultFilter', 'result');
        shots = msFilterShots(shots, 'pd-halfFilter', 'half');
        shots = msFilterShots(shots, 'pd-windDirectionFilter', 'windDirection');
        shots = msFilterShots(shots, 'pd-windStrengthFilter', 'windStrength');
        return shots;
    }

    function convCell(scored, total) {
        if (total === 0) return '—';
        return `${scored}/${total} (${Math.round(scored / total * 100)}%)`;
    }

    const allShotTypes = new Set();
    const allMissResults = new Set();
    const allMissReasons = new Set();
    const sessionRows = [];

    filteredSessions.forEach(session => {
        const shots = filterShots(session);
        if (shots.length === 0) return;
        const scored = shots.filter(s => s.result === 'scored').length;
        const total = shots.length;
        const inPlay = shots.filter(s => s.shotCategory === 'in-play');
        const inPlayScored = inPlay.filter(s => s.result === 'scored').length;
        const deadBall = shots.filter(s => s.shotCategory === 'free-kick' || s.shotCategory === '45');
        const deadBallScored = deadBall.filter(s => s.result === 'scored').length;
        const onePt = shots.filter(s => (s.pointValue === 1 || !s.pointValue) && s.shotFor !== 'goal');
        const onePtScored = onePt.filter(s => s.result === 'scored').length;
        const twoPt = shots.filter(s => s.pointValue === 2 && s.shotFor !== 'goal');
        const twoPtScored = twoPt.filter(s => s.result === 'scored').length;
        const goals = shots.filter(s => s.shotFor === 'goal');
        const goalsScored = goals.filter(s => s.result === 'scored').length;

        const shotTypeCounts = {};
        shots.forEach(s => {
            const st = s.shotType || 'not-defined';
            allShotTypes.add(st);
            if (!shotTypeCounts[st]) shotTypeCounts[st] = { scored: 0, total: 0 };
            shotTypeCounts[st].total++;
            if (s.result === 'scored') shotTypeCounts[st].scored++;
        });

        const missResultCounts = {};
        const missReasonCounts = {};
        const comments = [];
        shots.forEach(s => {
            if (s.result === 'missed') {
                if (s.missResult) {
                    allMissResults.add(s.missResult);
                    missResultCounts[s.missResult] = (missResultCounts[s.missResult] || 0) + 1;
                }
                if (s.missReason) {
                    allMissReasons.add(s.missReason);
                    missReasonCounts[s.missReason] = (missReasonCounts[s.missReason] || 0) + 1;
                }
            }
            if (s.comment) comments.push(s.comment);
        });

        sessionRows.push({
            session, shots, scored, total, inPlayScored, inPlayTotal: inPlay.length,
            deadBallScored, deadBallTotal: deadBall.length,
            onePtScored, onePtTotal: onePt.length,
            twoPtScored, twoPtTotal: twoPt.length,
            goalsScored, goalsTotal: goals.length,
            shotTypeCounts, missResultCounts, missReasonCounts, comments
        });
    });

    if (sessionRows.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:20px 0;">No shots match the current filters.</p>';
        return;
    }

    const showInPlay = sessionRows.some(r => r.inPlayTotal > 0);
    const showPlaced = sessionRows.some(r => r.deadBallTotal > 0);
    const showOnePt = sessionRows.some(r => r.onePtTotal > 0);
    const showTwoPt = sessionRows.some(r => r.twoPtTotal > 0);
    const showGoals = sessionRows.some(r => r.goalsTotal > 0);
    const showComments = sessionRows.some(r => r.comments.length > 0);

    const shotTypeLabels = {
        'not-defined': 'Not Defined', 'outside-of-the-boot': 'Outside Boot',
        'on-the-run': 'On the Run', 'on-the-turn': 'On the Turn', 'standing': 'Standing',
        'off-a-dummy': 'Off a Dummy', 'fisted': 'Fisted',
        'off-the-hands': 'Off Hands', 'off-the-ground': 'Off Ground'
    };
    const missResultLabels = {
        'short': 'Short', 'blocked': 'Blocked', 'wide-left': 'Wide L',
        'wide-right': 'Wide R', 'post': 'Post'
    };
    const missReasonLabels = {
        'pulled': 'Pulled', 'rushed': 'Rushed', 'bad-connection': 'Bad Conn.',
        'outside-range': 'Out of Range', 'at-limits': 'At Limits'
    };

    const sortedShotTypes = [...allShotTypes].sort();
    const sortedMissResults = [...allMissResults].sort();
    const sortedMissReasons = [...allMissReasons].sort();

    // Store for checkbox handlers
    lastPdSessionRows = sessionRows;
    lastPdTableMeta = { showInPlay, showPlaced, showOnePt, showTwoPt, showGoals, showComments, sortedShotTypes, sortedMissResults, sortedMissReasons, analyticsType: currentPlayerDataType };

    let headerHTML = '<tr>';
    headerHTML += '<th><input type="checkbox" id="pdStatsSelectAll" checked onchange="handlePdStatsSelectAll(this.checked)"></th>';
    headerHTML += '<th>Date</th>';
    if (currentPlayerDataType === 'match') {
        headerHTML += '<th>Competition</th><th>Opponent</th>';
    } else {
        headerHTML += '<th>Session</th>';
    }
    headerHTML += '<th>Conv.</th>';
    headerHTML += '<th>Pts/Shot <span style="cursor:help;opacity:0.6;" title="Points Per Shot: (1xPts + 2x2Pts + 3xGoals) / Total Shots">&#8505;</span></th>';
    if (showInPlay) headerHTML += '<th>In-Play</th>';
    if (showPlaced) headerHTML += '<th>Placed</th>';
    if (showOnePt) headerHTML += '<th>1 Pt</th>';
    if (showTwoPt) headerHTML += '<th>2 Pt</th>';
    if (showGoals) headerHTML += '<th>Goal</th>';
    sortedShotTypes.forEach(st => { headerHTML += `<th>${shotTypeLabels[st] || st}</th>`; });
    sortedMissResults.forEach(mr => { headerHTML += `<th>${missResultLabels[mr] || mr}</th>`; });
    sortedMissReasons.forEach(mr => { headerHTML += `<th>${missReasonLabels[mr] || mr}</th>`; });
    if (showComments) headerHTML += '<th>Comments</th>';
    headerHTML += '</tr>';

    let bodyHTML = '';
    sessionRows.forEach(row => {
        const s = row.session;
        const formattedDate = new Date(s.date).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: '2-digit' });
        bodyHTML += `<tr data-session-id="${String(s.id)}">`;
        bodyHTML += `<td><input type="checkbox" class="pd-session-row-cb" data-session-id="${String(s.id)}" checked onchange="handlePdSessionCheckboxChange('${String(s.id)}', this.checked)"></td>`;
        bodyHTML += `<td>${formattedDate}</td>`;
        if (currentPlayerDataType === 'match') {
            const comp = s.matchType ? s.matchType.charAt(0).toUpperCase() + s.matchType.slice(1) : '—';
            bodyHTML += `<td>${comp}</td>`;
            bodyHTML += `<td>${s.name || '—'}</td>`;
        } else {
            bodyHTML += `<td>${s.name || '—'}</td>`;
        }
        bodyHTML += `<td>${convCell(row.scored, row.total)}</td>`;
        const ptsPerShot = row.total > 0 ? ((row.onePtScored * 1 + row.twoPtScored * 2 + row.goalsScored * 3) / row.total).toFixed(2) : '0.00';
        bodyHTML += `<td>${ptsPerShot}</td>`;
        if (showInPlay) bodyHTML += `<td>${convCell(row.inPlayScored, row.inPlayTotal)}</td>`;
        if (showPlaced) bodyHTML += `<td>${convCell(row.deadBallScored, row.deadBallTotal)}</td>`;
        if (showOnePt) bodyHTML += `<td>${convCell(row.onePtScored, row.onePtTotal)}</td>`;
        if (showTwoPt) bodyHTML += `<td>${convCell(row.twoPtScored, row.twoPtTotal)}</td>`;
        if (showGoals) bodyHTML += `<td>${convCell(row.goalsScored, row.goalsTotal)}</td>`;
        sortedShotTypes.forEach(st => {
            const c = row.shotTypeCounts[st];
            bodyHTML += `<td>${c ? convCell(c.scored, c.total) : '—'}</td>`;
        });
        sortedMissResults.forEach(mr => {
            const count = row.missResultCounts[mr] || 0;
            bodyHTML += `<td>${count || '—'}</td>`;
        });
        sortedMissReasons.forEach(mr => {
            const count = row.missReasonCounts[mr] || 0;
            bodyHTML += `<td>${count || '—'}</td>`;
        });
        if (showComments) {
            const commentText = row.comments.length > 0 ? row.comments.join('; ') : '—';
            bodyHTML += `<td class="comments-cell">${commentText}</td>`;
        }
        bodyHTML += '</tr>';
    });

    // Summary row
    if (sessionRows.length > 1) {
        const totScored = sessionRows.reduce((a, r) => a + r.scored, 0);
        const totTotal = sessionRows.reduce((a, r) => a + r.total, 0);
        const totIP_S = sessionRows.reduce((a, r) => a + r.inPlayScored, 0);
        const totIP_T = sessionRows.reduce((a, r) => a + r.inPlayTotal, 0);
        const totDB_S = sessionRows.reduce((a, r) => a + r.deadBallScored, 0);
        const totDB_T = sessionRows.reduce((a, r) => a + r.deadBallTotal, 0);
        const tot1_S = sessionRows.reduce((a, r) => a + r.onePtScored, 0);
        const tot1_T = sessionRows.reduce((a, r) => a + r.onePtTotal, 0);
        const tot2_S = sessionRows.reduce((a, r) => a + r.twoPtScored, 0);
        const tot2_T = sessionRows.reduce((a, r) => a + r.twoPtTotal, 0);
        const totG_S = sessionRows.reduce((a, r) => a + r.goalsScored, 0);
        const totG_T = sessionRows.reduce((a, r) => a + r.goalsTotal, 0);

        bodyHTML += '<tr class="stats-table-summary">';
        bodyHTML += '<td></td>';
        bodyHTML += '<td>Totals</td>';
        const extraCols = currentPlayerDataType === 'match' ? 2 : 1;
        for (let i = 0; i < extraCols; i++) bodyHTML += '<td></td>';
        bodyHTML += `<td>${convCell(totScored, totTotal)}</td>`;
        const totPtsPerShot = totTotal > 0 ? ((tot1_S * 1 + tot2_S * 2 + totG_S * 3) / totTotal).toFixed(2) : '0.00';
        bodyHTML += `<td>${totPtsPerShot}</td>`;
        if (showInPlay) bodyHTML += `<td>${convCell(totIP_S, totIP_T)}</td>`;
        if (showPlaced) bodyHTML += `<td>${convCell(totDB_S, totDB_T)}</td>`;
        if (showOnePt) bodyHTML += `<td>${convCell(tot1_S, tot1_T)}</td>`;
        if (showTwoPt) bodyHTML += `<td>${convCell(tot2_S, tot2_T)}</td>`;
        if (showGoals) bodyHTML += `<td>${convCell(totG_S, totG_T)}</td>`;
        sortedShotTypes.forEach(st => {
            const s = sessionRows.reduce((a, r) => a + (r.shotTypeCounts[st] ? r.shotTypeCounts[st].scored : 0), 0);
            const t = sessionRows.reduce((a, r) => a + (r.shotTypeCounts[st] ? r.shotTypeCounts[st].total : 0), 0);
            bodyHTML += `<td>${t > 0 ? convCell(s, t) : '—'}</td>`;
        });
        sortedMissResults.forEach(mr => {
            const count = sessionRows.reduce((a, r) => a + (r.missResultCounts[mr] || 0), 0);
            bodyHTML += `<td>${count || '—'}</td>`;
        });
        sortedMissReasons.forEach(mr => {
            const count = sessionRows.reduce((a, r) => a + (r.missReasonCounts[mr] || 0), 0);
            bodyHTML += `<td>${count || '—'}</td>`;
        });
        if (showComments) bodyHTML += '<td></td>';
        bodyHTML += '</tr>';
    }

    container.innerHTML = `<table class="stats-table"><thead>${headerHTML}</thead><tbody>${bodyHTML}</tbody></table>`;
}

function initPlayerDataMultiSelects() {
    const onChange = applyPlayerDataFilters;
    initMultiSelect('pd-matchTypeFilter', [
        { value: 'league', label: 'League' },
        { value: 'championship', label: 'Championship' },
        { value: 'challenge', label: 'Challenge' }
    ], onChange);
    initMultiSelect('pd-shotCategoryFilter', _shotCategoryOptions(), onChange);
    initMultiSelect('pd-shotTypeFilter', _shotTypeOptions(), onChange);
    initMultiSelect('pd-footFilter', _footOptions(), onChange);
    initMultiSelect('pd-resultFilter', _resultOptions(), onChange);
    initMultiSelect('pd-halfFilter', _halfOptions(), onChange);
    initMultiSelect('pd-windDirectionFilter', _windDirectionOptions(), onChange);
    initMultiSelect('pd-windStrengthFilter', _windStrengthOptions(), onChange);
}

initPlayerDataMultiSelects();
