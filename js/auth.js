function updateClubDropdown() {
    const county = document.getElementById('signupCounty').value;
    const clubSelect = document.getElementById('signupClub');
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
function handlePositionChange() {
    const primaryPosition = document.getElementById('signupPrimaryPosition').value;
    const secondaryGroup = document.getElementById('secondaryPositionGroup');
    const secondarySelect = document.getElementById('signupSecondaryPosition');
    if (primaryPosition === 'Coach/Manager') {
        secondaryGroup.style.opacity = '0.5';
        secondarySelect.disabled = true;
        secondarySelect.value = '';
    } else {
        secondaryGroup.style.opacity = '1';
        secondarySelect.disabled = false;
    }
}
function isUserCoach() {
    if (!currentUser) return false;
    const position = currentUser.user_metadata?.primary_position;
    return position === 'Coach/Manager';
}

function showAuthError(message) {
    const el = document.getElementById('authError');
    el.textContent = message;
    el.style.display = 'block';
    document.getElementById('authSuccess').style.display = 'none';
}
function showAuthSuccess(message) {
    const el = document.getElementById('authSuccess');
    el.textContent = message;
    el.style.display = 'block';
    document.getElementById('authError').style.display = 'none';
}
function clearAuthMessages() {
    document.getElementById('authError').style.display = 'none';
    document.getElementById('authSuccess').style.display = 'none';
}
function showAuthTab(tab) {
    clearAuthMessages();
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    if (tab === 'login') {
        document.querySelector('.auth-tab:first-child').classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        document.querySelector('.auth-tab:last-child').classList.add('active');
        document.getElementById('signupForm').classList.add('active');
    }
}
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) { showAuthError('Please enter email and password'); return; }
    showLoading('Logging in...');
    clearAuthMessages();
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
    } catch (error) {
        hideLoading();
        showAuthError(error.message);
    }
}
async function handleSignup() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupPasswordConfirm').value;
    const dob = document.getElementById('signupDOB').value;
    const county = document.getElementById('signupCounty').value;
    const club = document.getElementById('signupClub').value;
    const primaryPosition = document.getElementById('signupPrimaryPosition').value;
    const secondaryPosition = document.getElementById('signupSecondaryPosition').value;
    const preferredFoot = document.getElementById('signupPreferredFoot').value;
    if (!name) { showAuthError('Please enter your name'); return; }
    if (!email || !password) { showAuthError('Please enter email and password'); return; }
    if (password.length < 6) { showAuthError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { showAuthError('Passwords do not match'); return; }
    showLoading('Creating account...');
    clearAuthMessages();
    try {
        const { data, error } = await supabaseClient.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    display_name: name,
                    dob: dob || null,
                    county: county || null,
                    club: club || null,
                    primary_position: primaryPosition || null,
                    secondary_position: secondaryPosition || null,
                    preferred_foot: preferredFoot || null
                }
            }
        });
        if (error) throw error;
        hideLoading();
        if (data.user && !data.session) {
            showAuthSuccess('Check your email to confirm your account!');
        }
    } catch (error) {
        hideLoading();
        showAuthError(error.message);
    }
}
async function handleGoogleLogin() {
    showLoading('Connecting to Google...');
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + window.location.pathname }
        });
        if (error) throw error;
    } catch (error) {
        hideLoading();
        showAuthError(error.message);
    }
}
async function handleLogout() {
    showLoading('Logging out...');
    try {
        await supabaseClient.auth.signOut();
    } catch (error) {
        hideLoading();
        alert('Error: ' + error.message);
    }
}
function showApp(user) {
    currentUser = user;
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('appContent').classList.add('visible');
    document.getElementById('userHeader').style.display = 'flex';
    const displayName = user.user_metadata?.name || user.user_metadata?.display_name || user.email;
    document.getElementById('userEmail').textContent = displayName;
    updateProfileAvatar();
    const isCoach = isUserCoach();
    setupCoachUI(isCoach);
    checkForLocalData();
    loadDataFromCloud();
}
async function setupCoachUI(isCoach) {
    const sidebar = document.getElementById('sidebar');
    if (isCoach) {
        sidebar.style.display = 'none';
        document.querySelectorAll('.section-content').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById('team-tab').classList.add('active');
        loadTeamData();
    } else {
        sidebar.style.display = '';
        await loadTeamData();
        switchSection('home');
        loadDashboardData();
    }
}
