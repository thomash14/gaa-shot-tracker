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
            .select('id, user_id, role, share_with_coach')
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
            const sharingBadge = isCoach && m.role === 'player' && m.share_with_coach 
                ? '<span class="sharing-badge">📊 Sharing</span>' 
                : '';
            return `
                <div class="team-member-item">
                    <div class="member-info">
                        <span>${name}</span>
                        <span class="member-role ${roleClass}">${roleLabel}</span>
                    </div>
                    ${sharingBadge}
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
                share_with_coach: false
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
    const availableForDays = parseInt(document.getElementById('drillAvailableFor').value);
    const target = document.getElementById('drillTarget').value;
    const notes = document.getElementById('drillNotes').value;
    let expiresAt = null;
    if (availableForDays > 0) {
        const expiry = new Date();
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
    container.innerHTML = teamDrills.map(drill => {
        const settings = drill.settings || {};
        const assignedDate = new Date(drill.created_at);
        const expiresDate = new Date(drill.due_date);
        const isExpired = expiresDate < new Date() && expiresDate.getFullYear() < 2099;
        const hasNoExpiry = expiresDate.getFullYear() >= 2099;
        const drillCompletions = completions.filter(c => c.drill_id === drill.id);
        const completedCount = drillCompletions.length;
        const footLabel = settings.foot === 'both' ? 'Both Feet' : (settings.foot === 'right' ? 'Right' : 'Left');
        return `
            <div class="stat-card" style="margin-bottom: 15px; padding: 15px; border-left: 4px solid ${isExpired ? '#999' : '#2a5298'}; ${isExpired ? 'opacity: 0.7;' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <strong style="font-size: 15px;">Scoring Zones - ${settings.distance}m</strong>
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
    const activeDrills = teamDrills.filter(d => {
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
                            ${isCompleted ? '✅ ' : '🎯 '}Scoring Zones - ${settings.distance}m
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
    const pendingDrills = activeDrills.filter(d => !completedDrillIds.includes(d.id));
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
                    🎯 Scoring Zones - ${settings.distance}m ${settings.shotType}
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
    document.getElementById('drillDescriptionTitle').textContent = `Scoring Zones - ${settings.distance}m`;
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
