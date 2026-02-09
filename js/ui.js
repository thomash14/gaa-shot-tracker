function restoreTrackingUI() {
    viewingPastSession = false;
    activeTemplate = null;
    previewingTemplate = null;
    resetPitchState();
    const header = document.getElementById('viewSessionHeader');
    if (header) header.style.display = 'none';
    const notesCard = document.getElementById('viewSessionNotesCard');
    if (notesCard) notesCard.remove();
    const controls = document.getElementById('sessionControls');
    if (controls) controls.style.display = '';
    const instructions = document.querySelector('.instructions');
    if (instructions) instructions.style.display = '';
}

function switchSection(section) {
    restoreTrackingUI();
    document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.section-content').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    switch(section) {
        case 'home':
            document.getElementById('navHome').classList.add('active');
            document.getElementById('home-section').classList.add('active');
            loadDashboardData();
            break;
        case 'track-practice':
            document.getElementById('navTrackPractice').classList.add('active');
            document.getElementById('track-tab').classList.add('active');
            document.getElementById('sessionType').value = 'practice';
            document.getElementById('logSessionBtn').textContent = '📋 Log Practice';
            switchSessionType('practice');
            break;
        case 'track-match':
            document.getElementById('navTrackMatch').classList.add('active');
            document.getElementById('track-tab').classList.add('active');
            document.getElementById('sessionType').value = 'match';
            document.getElementById('logSessionBtn').textContent = '📋 Log Match';
            switchSessionType('match');
            break;
        case 'sessions':
            document.getElementById('navSessions').classList.add('active');
            document.getElementById('sessions-tab').classList.add('active');
            filterSessions('match');
            break;
        case 'analytics':
            document.getElementById('navAnalytics').classList.add('active');
            document.getElementById('analytics-tab').classList.add('active');
            displayAnalytics();
            break;
        case 'team':
            document.getElementById('navTeam').classList.add('active');
            document.getElementById('team-tab').classList.add('active');
            loadTeamData();
            break;
    }
}

function switchTab(tab) {
    restoreTrackingUI();
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const tabButtons = document.querySelectorAll('.tab');
    for (let btn of tabButtons) {
        const btnText = btn.textContent.toLowerCase();
        if ((tab === 'track' && btnText.includes('track')) ||
            (tab === 'sessions' && btnText.includes('sessions')) ||
            (tab === 'analytics' && btnText.includes('analytics')) ||
            (tab === 'team' && btnText.includes('team'))) {
            btn.classList.add('active');
            break;
        }
    }
    const contentId = `${tab}-tab`;
    const content = document.getElementById(contentId);
    if (content) {
        content.classList.add('active');
    }
    if (tab === 'sessions') {
        filterSessions('match');
    } else if (tab === 'analytics') {
        displayAnalytics();
    } else if (tab === 'team') {
        loadTeamData();
    }
}

function updateUI() {
    updateCurrentSessionStats();
    displaySessions();
    displayAnalytics();
    if (document.getElementById('home-section').classList.contains('active')) {
        loadDashboardData();
    }
    if (currentSession && currentSession.type === 'match') {
        document.getElementById('topHalfOverlay').style.display = 'block';
        document.getElementById('bottomHalfOverlay').style.display = 'block';
        updateHalfIndicators();
    }
    renderPracticeTemplates();
}
