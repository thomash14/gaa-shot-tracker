function startNewSession() {
    viewingPastSession = false;
    const name = document.getElementById('sessionName').value || 'Unnamed Session';
    const date = document.getElementById('sessionDate').value;
    const type = document.getElementById('sessionType').value;
    let matchType = null;
    if (type === 'match') {
        const matchTypeSelect = document.getElementById('matchType').value;
        if (matchTypeSelect === 'custom') {
            matchType = document.getElementById('customMatchType').value || 'Custom';
        } else {
            matchType = matchTypeSelect;
        }
    }
    if (currentSession) {
        if (!confirm('End current session and start a new one?')) return;
        if (currentSession.shots.length === 0) {
            currentSession = null;
        } else {
            finaliseSession();
        }
    }
    resetPitchState();
    currentSession = {
        id: Date.now(),
        name: name,
        date: date,
        type: type,
        matchType: matchType,
        shots: [],
        startTime: new Date().toISOString()
    };
    document.getElementById('currentSessionBanner').style.display = 'block';
    document.getElementById('currentSessionName').textContent = name;
    const typeDisplay = matchType ? `${type} (${matchType})` : type;
    document.getElementById('currentSessionDetails').textContent = `${typeDisplay} - ${date}`;
    const topOverlay = document.getElementById('topHalfOverlay');
    const bottomOverlay = document.getElementById('bottomHalfOverlay');
    const shotTypeToggle = document.getElementById('pitchShotForToggle');
    const trackingModeToggle = document.getElementById('pitchTrackingModeToggle');
    if (type === 'match') {
        shotTypeToggle.style.display = 'block';
        trackingModeToggle.style.display = 'none';
        topOverlay.style.display = 'block';
        bottomOverlay.style.display = 'block';
        updateHalfIndicators();
    } else {
        shotTypeToggle.style.display = 'none';
        trackingModeToggle.style.display = 'block';
        topOverlay.style.display = 'none';
        bottomOverlay.style.display = 'none';
    }
    updateCurrentSessionStats();
    saveData();
}
function endSession() {
    if (!currentSession) return;
    if (currentSession.shots.length === 0) {
        currentSession = null;
        document.getElementById('currentSessionBanner').style.display = 'none';
        document.getElementById('topHalfOverlay').style.display = 'none';
        document.getElementById('bottomHalfOverlay').style.display = 'none';
        resetPitchState();
        updateCurrentSessionStats();
        saveData();
        updateUI();
        return;
    }
    showSessionNotesModal();
}
function finaliseSession() {
    currentSession.endTime = new Date().toISOString();
    sessions.unshift(currentSession);
    currentSession = null;
    document.getElementById('currentSessionBanner').style.display = 'none';
    document.getElementById('topHalfOverlay').style.display = 'none';
    document.getElementById('bottomHalfOverlay').style.display = 'none';
    resetPitchState();
    updateCurrentSessionStats();
    saveData();
    updateUI();
}
function showSessionNotesModal() {
    document.getElementById('sessionNotesText').value = '';
    document.getElementById('sessionDidWell').value = '';
    document.getElementById('sessionToImprove').value = '';
    document.getElementById('sessionWindDirection').value = 'no-wind';
    document.getElementById('sessionWindStrength').value = 'light';
    document.getElementById('sessionWindStrengthGroup').style.display = 'none';
    document.getElementById('sessionNotesModal').style.display = 'flex';
}
function cancelSessionNotes() {
    document.getElementById('sessionNotesModal').style.display = 'none';
}
function handleSessionWindDirectionChange() {
    const val = document.getElementById('sessionWindDirection').value;
    document.getElementById('sessionWindStrengthGroup').style.display = val === 'no-wind' ? 'none' : 'block';
}
function saveSessionWithNotes() {
    const notes = document.getElementById('sessionNotesText').value.trim() || null;
    const didWell = document.getElementById('sessionDidWell').value.trim() || null;
    const toImprove = document.getElementById('sessionToImprove').value.trim() || null;
    const windDirection = document.getElementById('sessionWindDirection').value;
    const windStrength = windDirection === 'no-wind' ? null : document.getElementById('sessionWindStrength').value;

    currentSession.sessionNotes = notes;
    currentSession.didWell = didWell;
    currentSession.toImprove = toImprove;
    currentSession.windDirection = windDirection;
    currentSession.windStrength = windStrength;

    document.getElementById('sessionNotesModal').style.display = 'none';
    finaliseSession();
}
async function deleteCurrentSession() {
    if (!currentSession) return;
    if (confirm('Are you sure you want to delete this session? This cannot be undone.')) {
        const sessionId = currentSession.id;
        const cloudId = currentSession.cloudId;
        sessions = sessions.filter(s => s.id !== sessionId);
        if (cloudId && currentUser) {
            try {
                await deleteSessionFromCloud(sessionId);
            } catch (e) {
                console.error('Error deleting session from cloud:', e);
            }
        }
        currentSession = null;
        window.currentAssignedDrillId = null;
        document.getElementById('currentSessionBanner').style.display = 'none';
        document.getElementById('topHalfOverlay').style.display = 'none';
        document.getElementById('bottomHalfOverlay').style.display = 'none';
        resetPitchState();
        document.querySelectorAll('.drill-spot').forEach(el => el.remove());
        document.querySelectorAll('.drill-distance-line').forEach(el => el.remove());
        document.querySelectorAll('.drill-distance-label').forEach(el => el.remove());
        document.querySelectorAll('.drill-preview-marker').forEach(el => el.remove());
        document.querySelectorAll('.drill-preview-line').forEach(el => el.remove());
        document.getElementById('sessionName').value = '';
        if (activeTemplate) {
            activeTemplate = null;
            hideDrillBanner();
            renderPracticeTemplates();
        }
        updateCurrentSessionStats();
        saveData();
        displaySessions();
        updateUI();
    }
}

function switchSessionType(type) {
    document.getElementById('sessionType').value = type;
    if (!currentSession) {
        resetPitchState();
    }
    const trackingModeToggle = document.getElementById('pitchTrackingModeToggle');
    const shotForToggle = document.getElementById('pitchShotForToggle');
    const topOverlay = document.getElementById('topHalfOverlay');
    const bottomOverlay = document.getElementById('bottomHalfOverlay');
    const matchTypeLabel = document.getElementById('matchTypeLabel');
    const matchTypeSelect = document.getElementById('matchType');
    const templatesSection = document.getElementById('practiceTemplatesSection');
    if (type === 'match') {
        shotForToggle.style.display = 'block';
        trackingModeToggle.style.display = 'none';
        matchTypeLabel.style.display = 'inline';
        matchTypeSelect.style.display = 'inline';
        templatesSection.style.display = 'none';
        document.getElementById('sessionNameLabel').textContent = 'Opponent:';
        document.getElementById('sessionName').placeholder = 'e.g., St. Patricks';
        if (currentSession && currentSession.type === 'match') {
            topOverlay.style.display = 'block';
            bottomOverlay.style.display = 'block';
            updateHalfIndicators();
        }
        clearTemplate();
    } else {
        shotForToggle.style.display = 'none';
        trackingModeToggle.style.display = 'block';
        matchTypeLabel.style.display = 'none';
        matchTypeSelect.style.display = 'none';
        document.getElementById('customMatchType').style.display = 'none';
        templatesSection.style.display = 'block';
        document.getElementById('sessionNameLabel').textContent = 'Session Name:';
        document.getElementById('sessionName').placeholder = 'e.g., Training - Monday Evening';
        topOverlay.style.display = 'none';
        bottomOverlay.style.display = 'none';
    }
}

function filterSessions(type) {
    currentSessionsFilter = type;
    calendarSelectedDate = null;
    document.getElementById('sessionsFilterAll').classList.toggle('active', type === 'all');
    document.getElementById('sessionsFilterMatch').classList.toggle('active', type === 'match');
    document.getElementById('sessionsFilterPractice').classList.toggle('active', type === 'practice');
    renderSessionCalendar();
    displaySessions();
}

function displaySessions() {
    const list = document.getElementById('sessionsList');
    let nonEmptySessions = sessions.filter(s => s.shots && s.shots.length > 0);
    if (currentSessionsFilter !== 'all') {
        nonEmptySessions = nonEmptySessions.filter(s => (s.type || 'practice') === currentSessionsFilter);
    }
    if (calendarSelectedDate) {
        nonEmptySessions = nonEmptySessions.filter(s => s.date === calendarSelectedDate);
    }
    if (nonEmptySessions.length === 0) {
        const filterLabel = currentSessionsFilter === 'all' ? '' : currentSessionsFilter;
        const dateNote = calendarSelectedDate ? ' on ' + new Date(calendarSelectedDate + 'T12:00:00').toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        list.innerHTML = `<div class="empty-state"><p>No ${filterLabel} sessions${dateNote}. ${calendarSelectedDate ? '' : 'Start tracking your shots!'}</p></div>`;
        return;
    }
    list.innerHTML = nonEmptySessions.map(session => {
        const scored = session.shots.filter(s => s.result === 'scored').length;
        const total = session.shots.length;
        const rate = total > 0 ? Math.round((scored / total) * 100) : 0;
        const sessionType = session.type || 'practice';
        const matchType = session.matchType || '';
        const typeIcon = sessionType === 'match' ? '⚽' : '🏋️';
        let typeLabel = sessionType === 'match' ? 'Match' : 'Practice';
        if (sessionType === 'match' && matchType) {
            typeLabel = matchType.charAt(0).toUpperCase() + matchType.slice(1);
        }
        const formattedDate = new Date(session.date).toLocaleDateString('en-IE', { 
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' 
        });
        return `
            <div class="session-item">
                <div class="session-info">
                    <div class="session-type-header">${typeIcon} ${typeLabel}</div>
                    <div class="session-name-sub">${session.name || 'Unnamed Session'}</div>
                    <div class="session-stats">
                        ${formattedDate} • ${total} shots • ${rate}% success
                    </div>
                </div>
                <div class="session-actions">
                    <button class="btn-primary" onclick="viewSession(${session.id})">View</button>
                    <button class="btn-danger" onclick="deleteSession(${session.id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}
// Determine which end of the pitch was attacked in each half
// by checking the average y-position of shots tagged as 1st vs 2nd half
function getHalfEndInfo(shots) {
    let first1stY = 0, count1st = 0;
    let first2ndY = 0, count2nd = 0;
    shots.forEach(shot => {
        if (shot.half === '1st') {
            first1stY += shot.y;
            count1st++;
        } else if (shot.half === '2nd') {
            first2ndY += shot.y;
            count2nd++;
        }
    });
    const result = { topLabel: '', bottomLabel: '' };
    if (count1st === 0 && count2nd === 0) return result;
    const avg1stY = count1st > 0 ? first1stY / count1st : -1;
    const avg2ndY = count2nd > 0 ? first2ndY / count2nd : -1;
    if (count1st > 0 && count2nd > 0) {
        if (avg1stY < avg2ndY) {
            result.topLabel = '2nd Half';
            result.bottomLabel = '1st Half';
        } else {
            result.topLabel = '1st Half';
            result.bottomLabel = '2nd Half';
        }
    } else if (count1st > 0) {
        if (avg1stY < 50) {
            result.topLabel = '2nd Half';
            result.bottomLabel = '1st Half';
        } else {
            result.topLabel = '1st Half';
            result.bottomLabel = '2nd Half';
        }
    } else if (count2nd > 0) {
        if (avg2ndY < 50) {
            result.topLabel = '1st Half';
            result.bottomLabel = '2nd Half';
        } else {
            result.topLabel = '2nd Half';
            result.bottomLabel = '1st Half';
        }
    }
    return result;
}
function viewSession(id) {
    const session = sessions.find(s => s.id === id);
    if (!session) return;

    switchTab('track');
    viewingPastSession = true;

    // Hide recording UI, show view header
    document.getElementById('sessionControls').style.display = 'none';
    document.querySelector('.instructions').style.display = 'none';
    document.getElementById('practiceTemplatesSection').style.display = 'none';
    document.getElementById('currentSessionBanner').style.display = 'none';

    const sessionType = session.type || 'practice';
    const matchType = session.matchType || '';
    const name = session.name || 'Unnamed Session';
    const formattedDate = new Date(session.date).toLocaleDateString('en-IE', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });

    let titleText = '';
    if (sessionType === 'match' && matchType) {
        const typeLabel = matchType.charAt(0).toUpperCase() + matchType.slice(1);
        titleText = `${typeLabel} - ${name}`;
    } else if (sessionType === 'match') {
        titleText = `Match - ${name}`;
    } else {
        titleText = name;
    }

    document.getElementById('viewSessionTitle').textContent = titleText;
    document.getElementById('viewSessionDate').textContent = formattedDate;
    document.getElementById('viewSessionHeader').style.display = 'block';

    // Show session notes if any exist
    const existingNotes = document.getElementById('viewSessionNotesCard');
    if (existingNotes) existingNotes.remove();
    const hasNotes = session.sessionNotes || session.didWell || session.toImprove || (session.windDirection && session.windDirection !== 'no-wind');
    if (hasNotes) {
        const notesCard = document.createElement('div');
        notesCard.id = 'viewSessionNotesCard';
        notesCard.style.cssText = 'padding:12px 16px; margin-bottom:12px; background:#f9f9f9; border-radius:8px; border-left:4px solid #2a5298; font-size:13px; color:#444;';
        let notesHTML = '';
        if (session.sessionNotes) {
            notesHTML += `<div style="margin-bottom:8px;"><strong>Notes:</strong> ${session.sessionNotes}</div>`;
        }
        if (session.didWell) {
            notesHTML += `<div style="margin-bottom:8px;"><span style="color:#4CAF50; font-weight:bold;">Did Well:</span> ${session.didWell}</div>`;
        }
        if (session.toImprove) {
            notesHTML += `<div style="margin-bottom:8px;"><span style="color:#FF9800; font-weight:bold;">To Improve:</span> ${session.toImprove}</div>`;
        }
        if (session.windDirection && session.windDirection !== 'no-wind') {
            const windLabels = {
                'straight-with': 'Straight with', 'diag-lr-with': 'Diagonal L-R with', 'diag-rl-with': 'Diagonal R-L with',
                'straight-against': 'Straight against', 'diag-lr-against': 'Diagonal L-R against', 'diag-rl-against': 'Diagonal R-L against',
                'cross-lr': 'Cross L-R', 'cross-rl': 'Cross R-L'
            };
            const strengthLabels = { 'light': 'Light', 'moderate': 'Moderate', 'strong': 'Strong', 'very-strong': 'Very Strong' };
            const dirLabel = windLabels[session.windDirection] || session.windDirection;
            const strLabel = session.windStrength ? ` - ${strengthLabels[session.windStrength] || session.windStrength}` : '';
            notesHTML += `<div>🌬️ <strong>Wind:</strong> ${dirLabel}${strLabel}</div>`;
        }
        notesCard.innerHTML = notesHTML;
        const header = document.getElementById('viewSessionHeader');
        header.parentNode.insertBefore(notesCard, header.nextSibling);
    }

    resetPitchState();
    // For match sessions, add half indicators to the pitch
    if (session.type === 'match' && session.shots && session.shots.length > 0) {
        const halfInfo = getHalfEndInfo(session.shots);
        if (halfInfo.topLabel || halfInfo.bottomLabel) {
            // Remove any existing half view labels
            document.querySelectorAll('.half-view-label').forEach(el => el.remove());
            const pitchWrapper = document.getElementById('pitchWrapper');
            if (halfInfo.topLabel) {
                const topLabel = document.createElement('div');
                topLabel.className = 'half-view-label';
                topLabel.style.cssText = 'position:absolute;top:1%;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.65);color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;z-index:5;pointer-events:none;white-space:nowrap;';
                topLabel.textContent = halfInfo.topLabel;
                pitchWrapper.appendChild(topLabel);
            }
            if (halfInfo.bottomLabel) {
                const bottomLabel = document.createElement('div');
                bottomLabel.className = 'half-view-label';
                bottomLabel.style.cssText = 'position:absolute;bottom:1%;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.65);color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;z-index:5;pointer-events:none;white-space:nowrap;';
                bottomLabel.textContent = halfInfo.bottomLabel;
                pitchWrapper.appendChild(bottomLabel);
            }
        }
    }
    const pitchWrapper = document.getElementById('pitchWrapper');
    session.shots.forEach(shot => {
        const marker = document.createElement('div');
        marker.className = 'shot-marker';
        marker.style.left = shot.x + '%';
        marker.style.top = shot.y + '%';
        marker.classList.add(shot.result === 'scored' ? 'scored' : 'missed');
        if (shot.shotFor === 'goal') marker.classList.add('goal-shot');
        if (shot.pointValue === 2) marker.classList.add('two-point');
        pitchWrapper.appendChild(marker);
        attachShotTooltipEvents(marker, [shot], pitchWrapper);
    });
    const scored = session.shots.filter(s => s.result === 'scored').length;
    const total = session.shots.length;
    const rate = total > 0 ? Math.round((scored / total) * 100) : 0;

    const viewPanel = document.getElementById('viewSessionStatsPanel');
    const activeStats = document.getElementById('activeSessionStats');

    if (session.type === 'match') {
        activeStats.style.display = 'none';
        viewPanel.style.display = 'block';
        viewPanel.innerHTML = buildMatchStatsHTML(session.shots, scored, total, rate);
    } else {
        activeStats.style.display = '';
        viewPanel.style.display = 'none';
        document.getElementById('totalShotsConv').textContent = total;
        document.getElementById('scoredShots').textContent = scored;
        document.getElementById('successRate').textContent = rate + '%';
    }
}
function buildMatchStatsHTML(shots, scored, total, rate) {
    function statLine(label, shotArr) {
        const s = shotArr.filter(sh => sh.result === 'scored').length;
        const t = shotArr.length;
        if (t === 0) return '';
        const pct = Math.round((s / t) * 100);
        return `<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>${label}</span><span>${s}/${t} (${pct}%)</span></div>`;
    }

    // Categorise shots
    const inPlay = shots.filter(s => s.shotCategory === 'in-play');
    const deadBall = shots.filter(s => s.shotCategory === 'free-kick' || s.shotCategory === '45');

    // --- In-Play column ---
    let ipHTML = '';
    if (inPlay.length > 0) {
        ipHTML = statLine('In-Play', inPlay);

        // Sub-categories side by side: left = point type, right = foot
        const ipOnePt = inPlay.filter(s => (s.pointValue === 1 || !s.pointValue) && s.shotFor !== 'goal');
        const ipTwoPt = inPlay.filter(s => s.pointValue === 2 && s.shotFor !== 'goal');
        const ipGoal = inPlay.filter(s => s.shotFor === 'goal');
        const ipRight = inPlay.filter(s => s.foot === 'right');
        const ipLeft = inPlay.filter(s => s.foot === 'left');

        const leftCol = [
            statLine('1 Pointer', ipOnePt),
            statLine('2 Pointer', ipTwoPt),
            statLine('Goal', ipGoal)
        ].filter(Boolean).join('');

        const rightCol = [
            statLine('Right Foot', ipRight),
            statLine('Left Foot', ipLeft)
        ].filter(Boolean).join('');

        if (leftCol || rightCol) {
            ipHTML += `<div style="display:flex;gap:12px;margin-top:4px;padding-top:4px;border-top:1px solid #eee;padding-left:8px;">`;
            if (leftCol) ipHTML += `<div style="flex:1;">${leftCol}</div>`;
            if (rightCol) ipHTML += `<div style="flex:1;">${rightCol}</div>`;
            ipHTML += `</div>`;
        }

    }

    // --- Placed Balls column ---
    let dbHTML = '';
    if (deadBall.length > 0) {
        dbHTML = statLine('Placed Balls', deadBall);

        const dbFrees = deadBall.filter(s => s.shotCategory === 'free-kick');
        const dbOnePt = dbFrees.filter(s => (s.pointValue === 1 || !s.pointValue) && s.shotFor !== 'goal');
        const dbTwoPt = dbFrees.filter(s => s.pointValue === 2 && s.shotFor !== 'goal');
        const db45s = deadBall.filter(s => s.shotCategory === '45');
        const dbGoal = deadBall.filter(s => s.shotFor === 'goal');

        const breakdowns = [
            statLine('1 Pointer', dbOnePt),
            statLine('2 Pointer', dbTwoPt),
            statLine('45s', db45s),
            statLine('Goal', dbGoal)
        ].filter(Boolean).join('');

        if (breakdowns) {
            dbHTML += `<div style="margin-top:4px;padding-top:4px;border-top:1px solid #eee;padding-left:8px;">${breakdowns}</div>`;
        }

    }

    let html = `<div class="stats-grid" style="grid-template-columns:1fr;">
        <div class="stat-card">
            <div class="stat-label">Conversion</div>
            <div style="font-size:14px;margin-top:8px;text-align:left;padding:0 10px;">
                <div style="display:flex;justify-content:space-between;font-weight:bold;"><span>Total</span><span><span style="color:#4CAF50;">${scored}</span>/${total} (${rate}%)</span></div>
            </div>
            <div style="border-top:1px solid #ddd;margin:8px 10px 0 10px;padding-top:8px;font-size:12px;color:#666;display:flex;gap:20px;align-items:flex-start;">`;

    if (ipHTML) html += `<div style="flex:1;">${ipHTML}</div>`;
    if (dbHTML) html += `<div style="flex:1;">${dbHTML}</div>`;

    html += `</div></div></div>`;

    return html;
}

async function deleteSession(id) {
    if (!confirm('Delete this session? This cannot be undone.')) return;
    if (currentUser) {
        await deleteSessionFromCloud(id);
    }
    sessions = sessions.filter(s => s.id !== id);
    saveData();
    renderSessionCalendar();
    displaySessions();
    displayAnalytics();
}

function renderSessionCalendar() {
    const container = document.getElementById('sessionCalendar');
    if (!container) return;

    const year = calendarYear;
    const month = calendarMonth;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Build a map of date -> { practice: bool, match: bool } for ALL sessions (ignoring tab filter)
    const dateMap = {};
    sessions.forEach(s => {
        if (!s.shots || s.shots.length === 0) return;
        if (!dateMap[s.date]) dateMap[s.date] = { practice: false, match: false };
        const t = s.type || 'practice';
        if (t === 'match') dateMap[s.date].match = true;
        else dateMap[s.date].practice = true;
    });

    // Month info
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    // Monday=0 start: JS getDay() is Sun=0, so convert
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const monthLabel = firstDay.toLocaleDateString('en-IE', { month: 'long', year: 'numeric' });

    // Count practices/matches this month
    let practiceCount = 0, matchCount = 0;
    sessions.forEach(s => {
        if (!s.shots || s.shots.length === 0) return;
        const parts = s.date.split('-');
        if (parseInt(parts[0]) === year && parseInt(parts[1]) - 1 === month) {
            if ((s.type || 'practice') === 'match') matchCount++;
            else practiceCount++;
        }
    });

    let html = '<div class="cal-header">';
    html += '<button class="cal-nav" onclick="changeCalendarMonth(-1)">&#9664;</button>';
    html += `<h3>${monthLabel}</h3>`;
    html += '<button class="cal-nav" onclick="changeCalendarMonth(1)">&#9654;</button>';
    html += '</div>';

    html += '<div class="cal-grid">';
    const dowLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    dowLabels.forEach(d => { html += `<div class="cal-dow">${d}</div>`; });

    // Fill leading blanks from previous month
    const prevMonthLast = new Date(year, month, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
        const dayNum = prevMonthLast - i;
        html += `<div class="cal-day other-month"><span>${dayNum}</span></div>`;
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const info = dateMap[dateStr];
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === calendarSelectedDate;
        const hasSession = !!info;

        let classes = 'cal-day';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';
        if (hasSession) classes += ' has-session';

        const onclick = hasSession ? `onclick="selectCalendarDate('${dateStr}')"` : '';

        let dots = '';
        if (info) {
            dots = '<div class="cal-dots">';
            if (info.match) dots += '<span class="cal-dot-match"></span>';
            if (info.practice) dots += '<span class="cal-dot-practice"></span>';
            dots += '</div>';
        }

        html += `<div class="${classes}" ${onclick}><span>${d}</span>${dots}</div>`;
    }

    // Fill trailing blanks
    const totalCells = startDow + daysInMonth;
    const trailingBlanks = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= trailingBlanks; i++) {
        html += `<div class="cal-day other-month"><span>${i}</span></div>`;
    }

    html += '</div>';

    // Summary
    const parts = [];
    if (practiceCount > 0) parts.push(`${practiceCount} practice${practiceCount !== 1 ? 's' : ''}`);
    if (matchCount > 0) parts.push(`${matchCount} match${matchCount !== 1 ? 'es' : ''}`);
    const summaryText = parts.length > 0 ? parts.join(', ') : 'No sessions';

    html += '<div class="cal-summary">';
    html += `${monthLabel}: ${summaryText}`;
    if (calendarSelectedDate) {
        html += '<button class="cal-clear" onclick="clearCalendarDate()">Show all</button>';
    }
    html += '</div>';

    container.innerHTML = html;
}

function changeCalendarMonth(delta) {
    calendarMonth += delta;
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
    else if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
    calendarSelectedDate = null;
    renderSessionCalendar();
    displaySessions();
}

function selectCalendarDate(dateStr) {
    if (calendarSelectedDate === dateStr) {
        calendarSelectedDate = null;
    } else {
        calendarSelectedDate = dateStr;
    }
    renderSessionCalendar();
    displaySessions();
}

function clearCalendarDate() {
    calendarSelectedDate = null;
    renderSessionCalendar();
    displaySessions();
}
