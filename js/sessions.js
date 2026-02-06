function startNewSession() {
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
        endSession();
    }
    clearPitchMarkers();
    const distanceLine = document.getElementById('distanceLine');
    if (distanceLine) distanceLine.remove();
    const distanceLabel = document.getElementById('distanceLabel');
    if (distanceLabel) distanceLabel.remove();
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
        clearPitchMarkers();
        updateCurrentSessionStats();
        saveData();
        updateUI();
        return;
    }
    currentSession.endTime = new Date().toISOString();
    sessions.unshift(currentSession);
    currentSession = null;
    document.getElementById('currentSessionBanner').style.display = 'none';
    document.getElementById('topHalfOverlay').style.display = 'none';
    document.getElementById('bottomHalfOverlay').style.display = 'none';
    clearPitchMarkers();
    updateCurrentSessionStats();
    saveData();
    updateUI();
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
        clearPitchMarkers();
        document.querySelectorAll('.drill-spot').forEach(el => el.remove());
        document.querySelectorAll('.drill-distance-line').forEach(el => el.remove());
        document.querySelectorAll('.drill-distance-label').forEach(el => el.remove());
        document.querySelectorAll('.drill-preview-marker').forEach(el => el.remove());
        document.querySelectorAll('.drill-preview-line').forEach(el => el.remove());
        const distanceLine = document.getElementById('distanceLine');
        if (distanceLine) distanceLine.remove();
        const distanceLabel = document.getElementById('distanceLabel');
        if (distanceLabel) distanceLabel.remove();
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
        clearPitchMarkers();
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
        document.getElementById('sessionNameLabel').textContent = 'Description:';
        document.getElementById('sessionName').placeholder = 'e.g., vs Team Name';
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

function displaySessions() {
    const list = document.getElementById('sessionsList');
    const nonEmptySessions = sessions.filter(s => s.shots && s.shots.length > 0);
    if (nonEmptySessions.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>No sessions recorded yet. Start tracking your shots!</p></div>';
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
    clearPitchMarkers();
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
    const locationMap = new Map();
    session.shots.forEach(shot => {
        const key = `${shot.x.toFixed(1)}-${shot.y.toFixed(1)}`;
        if (!locationMap.has(key)) {
            locationMap.set(key, { x: shot.x, y: shot.y, scored: 0, total: 0, isGoal: false, isTwoPoint: false });
        }
        const loc = locationMap.get(key);
        loc.total++;
        if (shot.result === 'scored') loc.scored++;
        if (shot.shotFor === 'goal') loc.isGoal = true;
        if (shot.pointValue === 2) loc.isTwoPoint = true;
    });
    locationMap.forEach(loc => {
        const marker = document.createElement('div');
        marker.className = 'shot-marker';
        marker.style.left = loc.x + '%';
        marker.style.top = loc.y + '%';
        if (loc.total > 1) {
            if (loc.scored > 0 && loc.scored < loc.total) {
                marker.style.background = 'linear-gradient(135deg, #4CAF50 50%, #f44336 50%)';
            } else if (loc.scored === loc.total) {
                marker.classList.add('scored');
            } else {
                marker.classList.add('missed');
            }
            marker.title = `${loc.scored}/${loc.total} scored`;
            const labelContainer = document.createElement('div');
            labelContainer.className = 'batch-label';
            labelContainer.style.left = loc.x + '%';
            labelContainer.style.top = `calc(${loc.y}% + 8px)`; // Start just below marker center
            labelContainer.innerHTML = `
                <div class="batch-label-line"></div>
                <div class="batch-label-text">${loc.scored}/${loc.total}</div>
            `;
            document.getElementById('pitchWrapper').appendChild(labelContainer);
        } else {
            marker.classList.add(loc.scored > 0 ? 'scored' : 'missed');
        }
        if (loc.isGoal) marker.classList.add('goal-shot');
        if (loc.isTwoPoint) marker.classList.add('two-point');
        document.getElementById('pitchWrapper').appendChild(marker);
    });
    const scored = session.shots.filter(s => s.result === 'scored').length;
    const total = session.shots.length;
    const rate = total > 0 ? Math.round((scored / total) * 100) : 0;
    document.getElementById('totalShotsConv').textContent = total;
    document.getElementById('scoredShots').textContent = scored;
    document.getElementById('successRate').textContent = rate + '%';
}
async function deleteSession(id) {
    if (!confirm('Delete this session? This cannot be undone.')) return;
    if (currentUser) {
        await deleteSessionFromCloud(id);
    }
    sessions = sessions.filter(s => s.id !== id);
    saveData();
    displaySessions();
    displayAnalytics();
}
