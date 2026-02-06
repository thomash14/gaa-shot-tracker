function toggleProfileMenu() {
    const overlay = document.getElementById('profileMenuOverlay');
    overlay.classList.toggle('active');
}
function closeProfileMenu() {
    const overlay = document.getElementById('profileMenuOverlay');
    overlay.classList.remove('active');
}
function updateProfileAvatar() {
    if (!currentUser) return;
    const avatarEl = document.getElementById('avatarInitials');
    const nameEl = document.getElementById('profileMenuName');
    const emailEl = document.getElementById('profileMenuEmail');
    if (!avatarEl || !nameEl || !emailEl) return;
    const metadata = currentUser.user_metadata || {};
    const name = metadata.display_name || currentUser.email || '';
    let initials = '';
    if (name) {
        const parts = name.split(' ').filter(p => p.length > 0);
        if (parts.length >= 2) {
            initials = parts[0][0] + parts[1][0];
        } else if (parts.length === 1) {
            initials = parts[0].substring(0, 2);
        }
    }
    initials = initials.toUpperCase() || '??';
    avatarEl.textContent = initials;
    nameEl.textContent = name || 'User';
    emailEl.textContent = currentUser.email || '';
}
function updateSyncDot(status) {
    const dot = document.getElementById('syncDot');
    const badge = document.getElementById('profileSyncBadge');
    if (!dot || !badge) return;
    dot.className = 'sync-dot';
    if (status === 'syncing') {
        dot.classList.add('syncing');
        badge.textContent = '⟳ Syncing...';
        badge.className = 'sync-badge';
    } else if (status === 'error') {
        dot.classList.add('error');
        badge.textContent = '✗ Sync Error';
        badge.className = 'sync-badge';
    } else {
        badge.textContent = '✓ Synced';
        badge.className = 'sync-badge synced';
    }
}
function showProfileModal() {
    document.getElementById('profileModal').style.display = 'flex';
    document.getElementById('profileError').style.display = 'none';
    document.getElementById('profileSuccess').style.display = 'none';
    document.getElementById('profileNewPassword').value = '';
    document.getElementById('profileConfirmPassword').value = '';
    const countySelect = document.getElementById('profileCounty');
    countySelect.innerHTML = '<option value="">Select your county...</option>';
    Object.keys(clubsByCounty).sort().forEach(county => {
        countySelect.innerHTML += `<option value="${county}">${county}</option>`;
    });
    loadProfileData();
}
function closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
}
async function loadProfileData() {
    if (!currentUser) return;
    let metadata = currentUser.user_metadata || {};
    console.log('User metadata:', metadata);
    if (!metadata.display_name && !metadata.county) {
        try {
            const { data: profile, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', currentUser.id)
                .single();
            if (!error && profile) {
                console.log('Profile from DB:', profile);
                metadata = {
                    display_name: profile.display_name,
                    dob: profile.dob,
                    county: profile.county,
                    club: profile.club,
                    primary_position: profile.primary_position,
                    secondary_position: profile.secondary_position
                };
            }
        } catch (e) {
            console.log('Could not fetch profile from DB:', e);
        }
    }
    document.getElementById('profileEmail').value = currentUser.email || '';
    document.getElementById('profileName').value = metadata.display_name || '';
    document.getElementById('profileDOB').value = metadata.dob || '';
    document.getElementById('profileCounty').value = metadata.county || '';
    if (metadata.county) {
        updateProfileClubDropdown();
        setTimeout(() => {
            document.getElementById('profileClub').value = metadata.club || '';
        }, 100);
    }
    document.getElementById('profilePrimaryPosition').value = metadata.primary_position || '';
    document.getElementById('profileSecondaryPosition').value = metadata.secondary_position || '';
    handleProfilePositionChange();
}
function updateProfileClubDropdown() {
    const county = document.getElementById('profileCounty').value;
    const clubSelect = document.getElementById('profileClub');
    clubSelect.innerHTML = '';
    if (!county) {
        clubSelect.innerHTML = '<option value="">Select county first...</option>';
        return;
    }
    const clubs = clubsByCounty[county] || [];
    if (clubs.length === 0) {
        clubSelect.innerHTML = '<option value="">No clubs listed yet</option><option value="other">Other / Not Listed</option>';
    } else {
        clubSelect.innerHTML = '<option value="">Select your club...</option>';
        clubs.forEach(club => {
            const option = document.createElement('option');
            option.value = club;
            option.textContent = club;
            clubSelect.appendChild(option);
        });
        const otherOption = document.createElement('option');
        otherOption.value = 'other';
        otherOption.textContent = 'Other / Not Listed';
        clubSelect.appendChild(otherOption);
    }
}
function handleProfilePositionChange() {
    const primaryPosition = document.getElementById('profilePrimaryPosition').value;
    const secondaryGroup = document.getElementById('profileSecondaryPositionGroup');
    const secondarySelect = document.getElementById('profileSecondaryPosition');
    if (primaryPosition === 'Coach/Manager') {
        secondaryGroup.style.opacity = '0.5';
        secondarySelect.disabled = true;
        secondarySelect.value = '';
    } else {
        secondaryGroup.style.opacity = '1';
        secondarySelect.disabled = false;
    }
}
async function saveProfile() {
    const name = document.getElementById('profileName').value.trim();
    const dob = document.getElementById('profileDOB').value;
    const county = document.getElementById('profileCounty').value;
    const club = document.getElementById('profileClub').value;
    const primaryPosition = document.getElementById('profilePrimaryPosition').value;
    const secondaryPosition = document.getElementById('profileSecondaryPosition').value;
    const errorEl = document.getElementById('profileError');
    const successEl = document.getElementById('profileSuccess');
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    try {
        const { data, error } = await supabaseClient.auth.updateUser({
            data: {
                display_name: name,
                dob: dob || null,
                county: county || null,
                club: club || null,
                primary_position: primaryPosition || null,
                secondary_position: secondaryPosition || null
            }
        });
        if (error) throw error;
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .upsert({
                id: currentUser.id,
                email: currentUser.email,
                display_name: name,
                dob: dob || null,
                county: county || null,
                club: club || null,
                primary_position: primaryPosition || null,
                secondary_position: secondaryPosition || null
            });
        if (profileError) {
            console.log('Could not update profiles table:', profileError);
        }
        currentUser = data.user;
        const isCoach = isUserCoach();
        setupCoachUI(isCoach);
        successEl.textContent = 'Profile updated successfully!';
        successEl.style.display = 'block';
        setTimeout(() => {
            closeProfileModal();
        }, 1500);
    } catch (error) {
        console.error('Error saving profile:', error);
        errorEl.textContent = 'Failed to save profile: ' + error.message;
        errorEl.style.display = 'block';
    }
}
async function changePassword() {
    const newPassword = document.getElementById('profileNewPassword').value;
    const confirmPassword = document.getElementById('profileConfirmPassword').value;
    const errorEl = document.getElementById('profileError');
    const successEl = document.getElementById('profileSuccess');
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    if (!newPassword) {
        errorEl.textContent = 'Please enter a new password';
        errorEl.style.display = 'block';
        return;
    }
    if (newPassword.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters';
        errorEl.style.display = 'block';
        return;
    }
    if (newPassword !== confirmPassword) {
        errorEl.textContent = 'Passwords do not match';
        errorEl.style.display = 'block';
        return;
    }
    try {
        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });
        if (error) throw error;
        document.getElementById('profileNewPassword').value = '';
        document.getElementById('profileConfirmPassword').value = '';
        successEl.textContent = 'Password updated successfully!';
        successEl.style.display = 'block';
    } catch (error) {
        console.error('Error changing password:', error);
        errorEl.textContent = 'Failed to change password: ' + error.message;
        errorEl.style.display = 'block';
    }
}
