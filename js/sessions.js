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
    document.getElementById('sessionsFilterTraining').classList.toggle('active', type === 'training');
    renderSessionCalendar();
    displaySessions();
}

function displaySessions() {
    const list = document.getElementById('sessionsList');

    // Build training log items for display when relevant
    const trainingTypes = ['training', 'gym', 'recovery'];
    const showTrainingLogs = currentSessionsFilter === 'all' || currentSessionsFilter === 'training';
    const showShotSessions = currentSessionsFilter !== 'training';

    let items = [];

    if (showShotSessions) {
        let nonEmptySessions = sessions.filter(s => s.shots && s.shots.length > 0);
        if (currentSessionsFilter !== 'all') {
            nonEmptySessions = nonEmptySessions.filter(s => (s.type || 'practice') === currentSessionsFilter);
        }
        if (calendarSelectedDate) {
            nonEmptySessions = nonEmptySessions.filter(s => s.date === calendarSelectedDate);
        }
        nonEmptySessions.forEach(session => {
            items.push({ type: 'shot', date: session.date, data: session });
        });
    }

    if (showTrainingLogs) {
        let logs = trainingLogs.slice();
        if (calendarSelectedDate) {
            logs = logs.filter(l => l.date === calendarSelectedDate);
        }
        logs.forEach(log => {
            items.push({ type: 'training', date: log.date, data: log });
        });
    }

    // Sort by date descending
    items.sort((a, b) => b.date.localeCompare(a.date));

    if (items.length === 0) {
        const filterLabel = currentSessionsFilter === 'all' ? '' : currentSessionsFilter;
        const dateNote = calendarSelectedDate ? ' on ' + new Date(calendarSelectedDate + 'T12:00:00').toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        list.innerHTML = `<div class="empty-state"><p>No ${filterLabel} sessions${dateNote}. ${calendarSelectedDate ? '' : 'Start tracking your shots!'}</p></div>`;
        return;
    }

    list.innerHTML = items.map(item => {
        if (item.type === 'shot') {
            const session = item.data;
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
            const formattedDate = new Date(session.date + 'T12:00:00').toLocaleDateString('en-IE', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
            });
            // Use quotes for UUID session IDs (cloud), bare for numeric (offline)
            const idParam = typeof session.id === 'number' ? session.id : `'${session.id}'`;
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
                        <button class="btn-primary" onclick="viewSession(${idParam})">View</button>
                        <button class="btn-danger" onclick="deleteSession(${idParam})">Delete</button>
                    </div>
                </div>
            `;
        } else {
            const log = item.data;
            const typeIcons = { training: '🏃', gym: '💪', recovery: '🧊' };
            const typeLabels = { training: 'Team Training', gym: 'Gym Session', recovery: 'Recovery' };
            const logClass = log.sessionType + '-log';
            const formattedDate = new Date(log.date + 'T12:00:00').toLocaleDateString('en-IE', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
            });
            let details = buildTrainingLogSummary(log);

            // Build kicking sub-items for training sessions
            let kickingHTML = '';
            if (log.sessionType === 'training') {
                if (log.kickingBefore) {
                    kickingHTML += `<div class="session-stats" style="color:#4CAF50;">🏋️ Pre-Training Kicking — ${log.beforeDuration || '?'} mins</div>`;
                }
                if (log.kickingAfter) {
                    kickingHTML += `<div class="session-stats" style="color:#4CAF50;">🏋️ Post-Training Kicking — ${log.afterDuration || '?'} mins</div>`;
                }
            }

            return `
                <div class="session-item ${logClass}">
                    <div class="session-info">
                        <div class="session-type-header">${typeIcons[log.sessionType] || '📋'} ${typeLabels[log.sessionType] || log.sessionType}</div>
                        <div class="session-stats">${formattedDate}${details ? ' • ' + details : ''}</div>
                        ${kickingHTML}
                        ${log.comments ? `<div class="session-stats" style="font-style:italic;color:#888;">${log.comments}</div>` : ''}
                    </div>
                    <div class="session-actions">
                        <button class="btn-danger" onclick="deleteTrainingLog('${log.id}')">Delete</button>
                    </div>
                </div>
            `;
        }
    }).join('');
}

function buildTrainingLogSummary(log) {
    const parts = [];
    if (log.sessionType === 'training') {
        if (log.kickingBefore) parts.push(`Kicked before (${log.beforeDuration || '?'}m)`);
        if (log.kickingAfter) parts.push(`Kicked after (${log.afterDuration || '?'}m)`);
    } else if (log.sessionType === 'gym') {
        if (log.gymDuration) parts.push(`${log.gymDuration} mins`);
        if (log.gymFocus) {
            const focusLabels = { 'full-body': 'Full Body', 'upper-body': 'Upper Body', 'lower-body': 'Lower Body', core: 'Core', cardio: 'Cardio', mobility: 'Mobility', mixed: 'Mixed' };
            parts.push(focusLabels[log.gymFocus] || log.gymFocus);
        }
    } else if (log.sessionType === 'recovery') {
        if (log.recoveryDuration) parts.push(`${log.recoveryDuration} mins`);
        if (log.recoveryType) {
            const recLabels = { 'ice-bath': 'Ice Bath', stretching: 'Stretching', 'foam-rolling': 'Foam Rolling', pool: 'Pool', physio: 'Physio', 'rest-day': 'Rest Day', other: 'Other' };
            parts.push(recLabels[log.recoveryType] || log.recoveryType);
        }
    }
    return parts.join(' • ');
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

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // Monday=1, Sunday shifts back 6
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function buildSessionDateMap() {
    const dateMap = {};
    const sessionMap = {};
    const trainingMap = {};
    sessions.forEach(s => {
        if (!s.shots || s.shots.length === 0) return;
        if (!dateMap[s.date]) dateMap[s.date] = { practice: false, match: false, training: false, gym: false, recovery: false };
        if (!sessionMap[s.date]) sessionMap[s.date] = [];
        const t = s.type || 'practice';
        if (t === 'match') dateMap[s.date].match = true;
        else dateMap[s.date].practice = true;
        sessionMap[s.date].push(s);
    });
    trainingLogs.forEach(log => {
        if (!dateMap[log.date]) dateMap[log.date] = { practice: false, match: false, training: false, gym: false, recovery: false };
        if (!trainingMap[log.date]) trainingMap[log.date] = [];
        dateMap[log.date][log.sessionType] = true;
        // Kicking before/after counts as practice activity (green dot)
        if (log.kickingBefore || log.kickingAfter) dateMap[log.date].practice = true;
        trainingMap[log.date].push(log);
    });
    return { dateMap, sessionMap, trainingMap };
}

function renderSessionCalendar() {
    const container = document.getElementById('sessionCalendar');
    if (!container) return;

    const { dateMap, sessionMap, trainingMap } = buildSessionDateMap();

    // View toggle
    let html = '<div class="cal-view-toggle">';
    html += `<button class="cal-view-btn ${calendarViewMode === 'monthly' ? 'active' : ''}" onclick="switchCalendarView('monthly')">Monthly</button>`;
    html += `<button class="cal-view-btn ${calendarViewMode === 'weekly' ? 'active' : ''}" onclick="switchCalendarView('weekly')">Weekly</button>`;
    html += '</div>';

    if (calendarViewMode === 'weekly') {
        html += renderWeeklyCalendar(dateMap, sessionMap, trainingMap);
    } else {
        html += renderMonthlyCalendar(dateMap);
    }

    container.innerHTML = html;
}

function renderMonthlyCalendar(dateMap) {
    const year = calendarYear;
    const month = calendarMonth;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Month info
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const monthLabel = firstDay.toLocaleDateString('en-IE', { month: 'long', year: 'numeric' });

    // Count practices/matches/training this month
    let practiceCount = 0, matchCount = 0, trainingCount = 0, gymCount = 0, recoveryCount = 0;
    sessions.forEach(s => {
        if (!s.shots || s.shots.length === 0) return;
        const parts = s.date.split('-');
        if (parseInt(parts[0]) === year && parseInt(parts[1]) - 1 === month) {
            if ((s.type || 'practice') === 'match') matchCount++;
            else practiceCount++;
        }
    });
    trainingLogs.forEach(log => {
        const parts = log.date.split('-');
        if (parseInt(parts[0]) === year && parseInt(parts[1]) - 1 === month) {
            if (log.sessionType === 'training') trainingCount++;
            else if (log.sessionType === 'gym') gymCount++;
            else if (log.sessionType === 'recovery') recoveryCount++;
            // Count kicking before/after as practice sessions
            if (log.kickingBefore) practiceCount++;
            if (log.kickingAfter) practiceCount++;
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

    const prevMonthLast = new Date(year, month, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
        const dayNum = prevMonthLast - i;
        html += `<div class="cal-day other-month"><span>${dayNum}</span></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const info = dateMap[dateStr];
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === calendarSelectedDate;
        const hasSession = !!info;

        let classes = 'cal-day cal-day-clickable';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';
        if (hasSession) classes += ' has-session';

        const onclick = `onclick="showCalendarDateMenu('${dateStr}', event)"`;

        let dots = '';
        if (info) {
            dots = '<div class="cal-dots">';
            if (info.match) dots += '<span class="cal-dot-match"></span>';
            if (info.practice) dots += '<span class="cal-dot-practice"></span>';
            if (info.training) dots += '<span class="cal-dot-training"></span>';
            if (info.gym) dots += '<span class="cal-dot-gym"></span>';
            if (info.recovery) dots += '<span class="cal-dot-recovery"></span>';
            dots += '</div>';
        }

        html += `<div class="${classes}" ${onclick}><span>${d}</span>${dots}</div>`;
    }

    const totalCells = startDow + daysInMonth;
    const trailingBlanks = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= trailingBlanks; i++) {
        html += `<div class="cal-day other-month"><span>${i}</span></div>`;
    }

    html += '</div>';

    const parts = [];
    if (practiceCount > 0) parts.push(`${practiceCount} practice${practiceCount !== 1 ? 's' : ''}`);
    if (matchCount > 0) parts.push(`${matchCount} match${matchCount !== 1 ? 'es' : ''}`);
    if (trainingCount > 0) parts.push(`${trainingCount} training`);
    if (gymCount > 0) parts.push(`${gymCount} gym`);
    if (recoveryCount > 0) parts.push(`${recoveryCount} recovery`);
    const summaryText = parts.length > 0 ? parts.join(', ') : 'No sessions';

    html += '<div class="cal-summary">';
    html += `${monthLabel}: ${summaryText}`;
    if (calendarSelectedDate) {
        html += '<button class="cal-clear" onclick="clearCalendarDate()">Show all</button>';
    }
    html += '</div>';

    // Legend
    html += '<div class="cal-legend">';
    html += '<div class="cal-legend-item"><span class="cal-legend-dot" style="background:#2196F3;"></span> Match</div>';
    html += '<div class="cal-legend-item"><span class="cal-legend-dot" style="background:#4CAF50;"></span> Practice</div>';
    html += '<div class="cal-legend-item"><span class="cal-legend-dot" style="background:#FF9800;"></span> Training</div>';
    html += '<div class="cal-legend-item"><span class="cal-legend-dot" style="background:#9C27B0;"></span> Gym</div>';
    html += '<div class="cal-legend-item"><span class="cal-legend-dot" style="background:#FFC107;"></span> Recovery</div>';
    html += '</div>';

    return html;
}

function renderWeeklyCalendar(dateMap, sessionMap, trainingMap) {
    if (!calendarWeekStart) {
        calendarWeekStart = getMonday(new Date());
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dowLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Header with nav arrows and date range
    const weekEnd = new Date(calendarWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const startLabel = calendarWeekStart.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
    const endLabel = weekEnd.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });

    let html = '<div class="cal-header">';
    html += '<button class="cal-nav" onclick="changeCalendarWeek(-1)">&#9664;</button>';
    html += `<h3>${startLabel} - ${endLabel}</h3>`;
    html += '<button class="cal-nav" onclick="changeCalendarWeek(1)">&#9654;</button>';
    html += '</div>';

    html += '<div class="cal-week-grid">';

    let weekPracticeCount = 0, weekMatchCount = 0, weekTrainingCount = 0, weekGymCount = 0, weekRecoveryCount = 0;

    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(calendarWeekStart);
        dayDate.setDate(dayDate.getDate() + i);
        const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
        const daySessions = sessionMap[dateStr] || [];
        const dayTraining = trainingMap[dateStr] || [];
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === calendarSelectedDate;
        const hasContent = daySessions.length > 0 || dayTraining.length > 0;

        // Count for summary
        daySessions.forEach(s => {
            if ((s.type || 'practice') === 'match') weekMatchCount++;
            else weekPracticeCount++;
        });
        dayTraining.forEach(t => {
            if (t.sessionType === 'training') weekTrainingCount++;
            else if (t.sessionType === 'gym') weekGymCount++;
            else if (t.sessionType === 'recovery') weekRecoveryCount++;
            // Count kicking before/after as practice sessions
            if (t.kickingBefore) weekPracticeCount++;
            if (t.kickingAfter) weekPracticeCount++;
        });

        let classes = 'cal-week-day';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';
        if (hasContent) classes += ' has-session';

        const dayClick = hasContent ? `onclick="selectCalendarDate('${dateStr}')"` : '';

        html += `<div class="${classes}" ${dayClick}>`;
        html += `<div class="cal-week-day-header" style="display:flex;justify-content:space-between;align-items:center;">${dowLabels[i]} <span style="cursor:pointer;font-size:14px;color:#999;" onclick="showCalendarDateMenu('${dateStr}', event); event.stopPropagation();">+</span></div>`;
        html += `<div class="cal-week-day-num">${dayDate.getDate()}</div>`;
        html += '<div class="cal-week-sessions">';

        daySessions.forEach(s => {
            const sessionType = s.type || 'practice';
            const scored = s.shots.filter(sh => sh.result === 'scored').length;
            const total = s.shots.length;
            const rate = total > 0 ? Math.round((scored / total) * 100) : 0;
            const matchType = s.matchType || '';
            let nameDisplay = s.name || 'Unnamed';
            if (sessionType === 'match' && matchType) {
                const typeLabel = matchType.charAt(0).toUpperCase() + matchType.slice(1);
                nameDisplay = `${typeLabel} vs ${s.name || '?'}`;
            }

            html += `<div class="cal-week-session ${sessionType}" onclick="selectWeeklySession(${s.id}); event.stopPropagation();">`;
            html += `<div class="cal-week-session-name">${nameDisplay}</div>`;
            html += `<div class="cal-week-session-stats">${scored}/${total} - ${rate}%</div>`;
            html += '</div>';
        });

        dayTraining.forEach(t => {
            // Kicking before training → separate green (practice) card
            if (t.sessionType === 'training' && t.kickingBefore) {
                html += `<div class="cal-week-session practice" onclick="event.stopPropagation();">`;
                html += `<div class="cal-week-session-name">🏋️ Pre-Training Kicking</div>`;
                html += `<div class="cal-week-session-stats">${t.beforeDuration || '?'} mins</div>`;
                html += '</div>';
            }

            // Main training/gym/recovery card
            const typeLabels = { training: 'Training', gym: 'Gym', recovery: 'Recovery' };
            const typeIcons = { training: '🏃', gym: '💪', recovery: '🧊' };
            html += `<div class="cal-week-session ${t.sessionType}" onclick="event.stopPropagation();">`;
            html += `<div class="cal-week-session-name">${typeIcons[t.sessionType] || '📋'} ${typeLabels[t.sessionType] || t.sessionType}</div>`;
            if (t.comments) html += `<div class="cal-week-session-stats">${t.comments.substring(0, 30)}</div>`;
            html += '</div>';

            // Kicking after training → separate green (practice) card
            if (t.sessionType === 'training' && t.kickingAfter) {
                html += `<div class="cal-week-session practice" onclick="event.stopPropagation();">`;
                html += `<div class="cal-week-session-name">🏋️ Post-Training Kicking</div>`;
                html += `<div class="cal-week-session-stats">${t.afterDuration || '?'} mins</div>`;
                html += '</div>';
            }
        });

        html += '</div></div>';
    }

    html += '</div>';

    // Summary
    const parts = [];
    if (weekPracticeCount > 0) parts.push(`${weekPracticeCount} practice${weekPracticeCount !== 1 ? 's' : ''}`);
    if (weekMatchCount > 0) parts.push(`${weekMatchCount} match${weekMatchCount !== 1 ? 'es' : ''}`);
    if (weekTrainingCount > 0) parts.push(`${weekTrainingCount} training`);
    if (weekGymCount > 0) parts.push(`${weekGymCount} gym`);
    if (weekRecoveryCount > 0) parts.push(`${weekRecoveryCount} recovery`);
    const summaryText = parts.length > 0 ? parts.join(', ') : 'No sessions';

    html += '<div class="cal-summary">';
    html += `This week: ${summaryText}`;
    if (calendarSelectedDate) {
        html += '<button class="cal-clear" onclick="clearCalendarDate()">Show all</button>';
    }
    html += '</div>';

    return html;
}

function switchCalendarView(mode) {
    calendarViewMode = mode;
    if (mode === 'weekly') {
        if (calendarSelectedDate) {
            calendarWeekStart = getMonday(new Date(calendarSelectedDate + 'T12:00:00'));
        } else if (!calendarWeekStart) {
            calendarWeekStart = getMonday(new Date());
        }
    } else if (mode === 'monthly' && calendarWeekStart) {
        // Sync month view to show the month containing the current week
        calendarMonth = calendarWeekStart.getMonth();
        calendarYear = calendarWeekStart.getFullYear();
    }
    renderSessionCalendar();
}

function changeCalendarWeek(delta) {
    if (!calendarWeekStart) calendarWeekStart = getMonday(new Date());
    calendarWeekStart.setDate(calendarWeekStart.getDate() + (delta * 7));
    calendarSelectedDate = null;
    renderSessionCalendar();
    displaySessions();
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
    if (calendarViewMode === 'monthly') {
        // Drill down: switch to weekly view for the clicked date's week
        calendarViewMode = 'weekly';
        calendarWeekStart = getMonday(new Date(dateStr + 'T12:00:00'));
        calendarSelectedDate = dateStr;
        renderSessionCalendar();
        displaySessions();
        return;
    }
    // Weekly view: toggle date selection
    if (calendarSelectedDate === dateStr) {
        calendarSelectedDate = null;
    } else {
        calendarSelectedDate = dateStr;
    }
    renderSessionCalendar();
    displaySessions();
}

function selectWeeklySession(sessionId) {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    calendarSelectedDate = session.date;
    renderSessionCalendar();
    displaySessions();
}

function clearCalendarDate() {
    calendarSelectedDate = null;
    renderSessionCalendar();
    displaySessions();
}

// --- Calendar date menu ---
function showCalendarDateMenu(dateStr, event) {
    event.stopPropagation();
    const menu = document.getElementById('calendarDateMenu');

    // Check if shot sessions exist on this date
    const hasShotSessions = sessions.some(s => s.date === dateStr && s.shots && s.shots.length > 0);

    const formattedDate = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IE', {
        weekday: 'short', day: 'numeric', month: 'short'
    });

    let html = `<div class="cal-date-menu-header">${formattedDate}</div>`;
    if (hasShotSessions) {
        html += `<button class="cal-date-menu-item" onclick="closeCalendarDateMenu(); selectCalendarDate('${dateStr}');">
            <span class="menu-icon">📊</span> View Sessions
        </button>`;
    }
    html += `<button class="cal-date-menu-item" onclick="closeCalendarDateMenu(); openTrainingSessionModal('${dateStr}');">
        <span class="menu-icon">📋</span> Log Training Session
    </button>`;

    menu.innerHTML = html;

    // Position near click
    const rect = event.target.closest('.cal-day, .cal-week-day-header') || event.target;
    const targetRect = rect.getBoundingClientRect();
    let top = targetRect.bottom + 4;
    let left = targetRect.left;

    // Keep within viewport
    if (left + 220 > window.innerWidth) left = window.innerWidth - 225;
    if (left < 5) left = 5;
    if (top + 150 > window.innerHeight) top = targetRect.top - 150;

    menu.style.top = top + 'px';
    menu.style.left = left + 'px';
    menu.classList.add('visible');

    // Close on outside click (delay to avoid immediate trigger)
    setTimeout(() => {
        document.addEventListener('click', closeCalendarDateMenuOutside);
    }, 10);
}

function closeCalendarDateMenu() {
    const menu = document.getElementById('calendarDateMenu');
    menu.classList.remove('visible');
    document.removeEventListener('click', closeCalendarDateMenuOutside);
}

function closeCalendarDateMenuOutside(e) {
    const menu = document.getElementById('calendarDateMenu');
    if (!menu.contains(e.target)) {
        closeCalendarDateMenu();
    }
}

// --- Training session modal ---
function openTrainingSessionModal(dateStr) {
    const modal = document.getElementById('trainingSessionModal');
    const formattedDate = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    document.getElementById('trainingModalDate').value = formattedDate;
    document.getElementById('trainingModalDate').dataset.dateStr = dateStr;
    document.getElementById('trainingSessionType').value = 'training';
    document.getElementById('kickingBefore').checked = false;
    document.getElementById('kickingAfter').checked = false;
    document.getElementById('kickingBeforeReveal').classList.remove('visible');
    document.getElementById('kickingAfterReveal').classList.remove('visible');
    document.getElementById('beforeDuration').value = '20';
    document.getElementById('afterDuration').value = '20';
    document.getElementById('gymDuration').value = '60';
    document.getElementById('gymFocus').value = 'full-body';
    document.getElementById('recoveryDuration').value = '30';
    document.getElementById('recoveryType').value = 'ice-bath';
    document.getElementById('trainingComments').value = '';
    onTrainingTypeChange();
    modal.classList.add('active');
}

function closeTrainingSessionModal() {
    document.getElementById('trainingSessionModal').classList.remove('active');
}

function onTrainingTypeChange() {
    const type = document.getElementById('trainingSessionType').value;
    document.getElementById('trainingFieldsTraining').classList.toggle('visible', type === 'training');
    document.getElementById('trainingFieldsGym').classList.toggle('visible', type === 'gym');
    document.getElementById('trainingFieldsRecovery').classList.toggle('visible', type === 'recovery');
}

function toggleRevealField(revealId, show) {
    document.getElementById(revealId).classList.toggle('visible', show);
}

function saveTrainingLog() {
    const dateStr = document.getElementById('trainingModalDate').dataset.dateStr;
    const sessionType = document.getElementById('trainingSessionType').value;
    const comments = document.getElementById('trainingComments').value.trim() || null;

    const log = {
        id: Date.now(),
        date: dateStr,
        sessionType: sessionType,
        kickingBefore: false,
        beforeDuration: null,
        kickingAfter: false,
        afterDuration: null,
        gymDuration: null,
        gymFocus: null,
        recoveryDuration: null,
        recoveryType: null,
        comments: comments,
        cloudId: null
    };

    if (sessionType === 'training') {
        log.kickingBefore = document.getElementById('kickingBefore').checked;
        log.beforeDuration = log.kickingBefore ? parseInt(document.getElementById('beforeDuration').value) : null;
        log.kickingAfter = document.getElementById('kickingAfter').checked;
        log.afterDuration = log.kickingAfter ? parseInt(document.getElementById('afterDuration').value) : null;
    } else if (sessionType === 'gym') {
        log.gymDuration = parseInt(document.getElementById('gymDuration').value);
        log.gymFocus = document.getElementById('gymFocus').value;
    } else if (sessionType === 'recovery') {
        log.recoveryDuration = parseInt(document.getElementById('recoveryDuration').value);
        log.recoveryType = document.getElementById('recoveryType').value;
    }

    trainingLogs.unshift(log);
    saveData();

    // Cloud sync
    if (currentUser) {
        saveTrainingLogToCloud(log).then(() => saveData());
    }

    closeTrainingSessionModal();
    renderSessionCalendar();
    displaySessions();
}

async function deleteTrainingLog(logId) {
    if (!confirm('Delete this training log?')) return;
    const log = trainingLogs.find(l => String(l.id) === String(logId));
    if (log && log.cloudId && currentUser) {
        await deleteTrainingLogFromCloud(log.cloudId);
    }
    trainingLogs = trainingLogs.filter(l => String(l.id) !== String(logId));
    saveData();
    renderSessionCalendar();
    displaySessions();
}
