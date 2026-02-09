document.getElementById('sessionDate').valueAsDate = new Date();
document.getElementById('matchType').addEventListener('change', function(e) {
    const customInput = document.getElementById('customMatchType');
    if (e.target.value === 'custom') {
        customInput.style.display = 'inline';
        customInput.focus();
    } else {
        customInput.style.display = 'none';
    }
});

function openBatchModal() {
    document.getElementById('batchModal').classList.add('active');
    document.getElementById('leftTotalInput').value = 0;
    document.getElementById('leftScoredInput').value = 0;
    document.getElementById('rightTotalInput').value = 0;
    document.getElementById('rightScoredInput').value = 0;
    document.getElementById('leftTotalInput').focus();
}
function closeBatchModal() {
    document.getElementById('batchModal').classList.remove('active');
    const marker = document.getElementById('pendingMarker');
    if (marker) marker.remove();
    const line = document.getElementById('distanceLine');
    const label = document.getElementById('distanceLabel');
    if (line) line.remove();
    if (label) label.remove();
    batchPendingLocation = null;
}
function confirmBatchShots() {
    const leftTotal = parseInt(document.getElementById('leftTotalInput').value) || 0;
    const leftScored = parseInt(document.getElementById('leftScoredInput').value) || 0;
    const rightTotal = parseInt(document.getElementById('rightTotalInput').value) || 0;
    const rightScored = parseInt(document.getElementById('rightScoredInput').value) || 0;
    if (leftScored > leftTotal) {
        alert('Left foot scored shots cannot exceed total shots!');
        return;
    }
    if (rightScored > rightTotal) {
        alert('Right foot scored shots cannot exceed total shots!');
        return;
    }
    if (leftTotal + rightTotal < 1) {
        alert('Please enter at least 1 shot!');
        return;
    }
    const pointValue = getPointValue(batchPendingLocation);
    const leftMissed = leftTotal - leftScored;
    for (let i = 0; i < leftScored; i++) {
        const shot = {
            x: batchPendingLocation.x,
            y: batchPendingLocation.y,
            distance: batchPendingLocation.distance,
            foot: 'left',
            half: batchPendingLocation.half,
            shotFor: batchPendingLocation.shotFor,
            shotCategory: batchPendingLocation.shotCategory,
            shotType: batchPendingLocation.shotType,
            pointValue: pointValue,
            result: 'scored',
            timestamp: new Date().toISOString(),
            batch: true,
            comment: ""
        };
        currentSession.shots.push(shot);
    }
    for (let i = 0; i < leftMissed; i++) {
        const shot = {
            x: batchPendingLocation.x,
            y: batchPendingLocation.y,
            distance: batchPendingLocation.distance,
            foot: 'left',
            half: batchPendingLocation.half,
            shotFor: batchPendingLocation.shotFor,
            shotCategory: batchPendingLocation.shotCategory,
            shotType: batchPendingLocation.shotType,
            pointValue: pointValue,
            result: 'missed',
            timestamp: new Date().toISOString(),
            batch: true,
            comment: ""
        };
        currentSession.shots.push(shot);
    }
    const rightMissed = rightTotal - rightScored;
    for (let i = 0; i < rightScored; i++) {
        const shot = {
            x: batchPendingLocation.x,
            y: batchPendingLocation.y,
            distance: batchPendingLocation.distance,
            foot: 'right',
            half: batchPendingLocation.half,
            shotFor: batchPendingLocation.shotFor,
            shotCategory: batchPendingLocation.shotCategory,
            shotType: batchPendingLocation.shotType,
            pointValue: pointValue,
            result: 'scored',
            timestamp: new Date().toISOString(),
            batch: true,
            comment: ""
        };
        currentSession.shots.push(shot);
    }
    for (let i = 0; i < rightMissed; i++) {
        const shot = {
            x: batchPendingLocation.x,
            y: batchPendingLocation.y,
            distance: batchPendingLocation.distance,
            foot: 'right',
            half: batchPendingLocation.half,
            shotFor: batchPendingLocation.shotFor,
            shotCategory: batchPendingLocation.shotCategory,
            shotType: batchPendingLocation.shotType,
            pointValue: pointValue,
            result: 'missed',
            timestamp: new Date().toISOString(),
            batch: true,
            comment: ""
        };
        currentSession.shots.push(shot);
    }
    const marker = document.getElementById('pendingMarker');
    if (marker) {
        marker.id = '';
        const totalShots = leftTotal + rightTotal;
        const totalScored = leftScored + rightScored;
        const totalMissed = totalShots - totalScored;
        if (totalScored > 0 && totalMissed > 0) {
            marker.style.background = 'linear-gradient(135deg, #4CAF50 50%, #f44336 50%)';
        } else if (totalScored === totalShots) {
            marker.classList.add('scored');
        } else {
            marker.classList.add('missed');
        }
        let labelText = '';
        if (leftTotal > 0 && rightTotal > 0) {
            labelText = `L: ${leftScored}/${leftTotal}  R: ${rightScored}/${rightTotal}`;
        } else if (leftTotal > 0) {
            labelText = `${leftScored}/${leftTotal}`;
        } else {
            labelText = `${rightScored}/${rightTotal}`;
        }
        marker.title = labelText;
        const labelDiv = document.createElement('div');
        labelDiv.className = 'batch-label';
        labelDiv.style.left = marker.style.left;
        labelDiv.style.top = `calc(${marker.style.top} + 8px)`;
        labelDiv.innerHTML = `
            <div class="batch-label-line"></div>
            <div class="batch-label-text">${labelText}</div>
        `;
        document.getElementById('pitchWrapper').appendChild(labelDiv);
    }
    const line = document.getElementById('distanceLine');
    const label = document.getElementById('distanceLabel');
    if (line) line.remove();
    if (label) label.remove();
    closeBatchModal();
    batchPendingLocation = null;
    updateCurrentSessionStats();
    saveData();
}
function getTrackingMode() {
    const selected = document.querySelector('input[name="trackingMode"]:checked');
    return selected ? selected.value : 'single'; // Default to single for match mode
}
function getKickingFoot() {
    const dropdown = document.getElementById('shotTypeDropdown');
    if (dropdown && dropdown.value === 'fisted') return 'fisted';
    return document.querySelector('input[name="kickingFoot"]:checked').value;
}
function getMatchHalf() {
    return document.querySelector('input[name="matchHalf"]:checked')?.value || null;
}
function getShotFor() {
    return document.querySelector('input[name="shotFor"]:checked')?.value || 'point';
}
function getShotCategory() {
    return document.querySelector('input[name="shotCategory"]:checked')?.value || 'in-play';
}
function getShotTypeDropdown() {
    return document.getElementById('shotTypeDropdown').value;
}

function updateShotTypeOptions() {
    const shotCategory = getShotCategory();
    const dropdown = document.getElementById('shotTypeDropdown');
    const container = document.getElementById('shotTypeDropdownContainer');
    dropdown.innerHTML = '';
    if (shotCategory === 'in-play') {
        container.style.display = 'block';
        dropdown.innerHTML = `
            <option value="not-defined">Not Defined</option>
            <option value="outside-of-the-boot">Outside Of The Boot</option>
            <option value="on-the-run">On the run</option>
            <option value="on-the-turn">On the turn</option>
            <option value="standing">Standing</option>
            <option value="off-a-dummy">Off a Dummy</option>
            <option value="fisted">Fisted</option>
        `;
    } else if (shotCategory === 'free-kick') {
        container.style.display = 'block';
        dropdown.innerHTML = `
            <option value="off-the-hands">Off The Hands</option>
            <option value="off-the-ground">Off The Ground</option>
        `;
    } else {
        container.style.display = 'none';
    }
    updateKickingFootState();
}

function updateKickingFootState() {
    const dropdown = document.getElementById('shotTypeDropdown');
    const card = document.getElementById('kickingFootCard');
    const isFisted = dropdown && dropdown.value === 'fisted';
    if (card) {
        card.style.opacity = isFisted ? '0.4' : '';
        card.style.pointerEvents = isFisted ? 'none' : '';
    }
    document.getElementById('pitchFootRight').disabled = isFisted;
    document.getElementById('pitchFootLeft').disabled = isFisted;
}

document.getElementById('shotTypeDropdown').addEventListener('change', updateKickingFootState);

function is2PointZone(x, y) {
    const svgX = (x / 100) * 500;
    const svgY = (y / 100) * 725;
    const isTopGoal = svgY < 362; // Above halfway line = shooting at top goal
    if (isTopGoal) {
        const goalX = 225;
        const goalY = 40;
        if (svgY <= 129) return false; // Inside 20m line
        const distanceFromGoal = Math.sqrt(Math.pow(svgX - goalX, 2) + Math.pow(svgY - goalY, 2));
        return distanceFromGoal > 178;
    } else {
        const goalX = 225;
        const goalY = 684;
        if (svgY >= 595) return false; // Inside 20m line
        const distanceFromGoal = Math.sqrt(Math.pow(svgX - goalX, 2) + Math.pow(svgY - goalY, 2));
        return distanceFromGoal > 178;
    }
}
function getPointValue(shot) {
    if (shot.shotCategory === '45') return 1;
    if (is2PointZone(shot.x, shot.y)) return 2;
    return 1;
}
function selectHalfFromPitch(half) {
    if (half === '1st') {
        document.getElementById('half1st').checked = true;
    } else {
        document.getElementById('half2nd').checked = true;
    }
    updateHalfIndicatorsHTML();
}
function selectHalf(half) {
    selectHalfFromPitch(half);
}
function updateHalfIndicators() {
    updateHalfIndicatorsHTML();
}
function updateHalfIndicatorsHTML() {
    const selectedHalf = getMatchHalf();
    // Top overlay shows the selected half
    document.getElementById('topHalf1st').checked = (selectedHalf === '1st');
    document.getElementById('topHalf2nd').checked = (selectedHalf === '2nd');
    // Bottom overlay shows the OPPOSITE half (can't score at both ends in same half)
    document.getElementById('bottomHalf1st').checked = (selectedHalf === '2nd');
    document.getElementById('bottomHalf2nd').checked = (selectedHalf === '1st');
}
document.getElementById('half1st').addEventListener('change', updateHalfIndicators);
document.getElementById('half2nd').addEventListener('change', updateHalfIndicators);

document.getElementById('pitch').addEventListener('click', function(e) {
    if (!currentSession) {
        alert('Please start a session first!');
        return;
    }
    if (isDragging) return;
    const oldMarker = document.getElementById('pendingMarker');
    if (oldMarker) oldMarker.remove();
    const oldLine = document.getElementById('distanceLine');
    if (oldLine) oldLine.remove();
    const oldLabel = document.getElementById('distanceLabel');
    if (oldLabel) oldLabel.remove();
    const rect = this.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    createPendingShot(clickX, clickY, rect);
});
function createPendingShot(clickX, clickY, rect) {
    const x = (clickX / rect.width) * 100;
    const y = (clickY / rect.height) * 100;
    const svgX = (clickX / rect.width) * 500;
    const svgY = (clickY / rect.height) * 725;
    const pitchX = ((svgX - 25) / 400) * 90 - 45; // Center at 0, range -45 to +45
    const pitchY = ((svgY - 40) / 644) * 145; // Range 0 to 145
    const distanceToTopGoal = pitchY;
    const distanceToBottomGoal = 145 - pitchY;
    const isTopGoal = distanceToTopGoal < distanceToBottomGoal;
    const distanceToGoal = Math.sqrt(pitchX * pitchX + (isTopGoal ? distanceToTopGoal : distanceToBottomGoal) * (isTopGoal ? distanceToTopGoal : distanceToBottomGoal));
    const mode = getTrackingMode();
    if (mode === 'single') {
        const foot = getKickingFoot();
        const half = getMatchHalf();
        const shotFor = getShotFor();
        const shotCategory = getShotCategory();
        const shotTypeDropdown = getShotTypeDropdown();
        pendingShot = { x, y, distance: distanceToGoal, foot: foot, half: half, shotFor: shotFor, shotCategory: shotCategory, shotType: shotTypeDropdown };
        document.getElementById('scoredBtn').disabled = false;
        document.getElementById('missedBtn').disabled = false;
        const marker = document.createElement('div');
        marker.className = 'shot-marker';
        marker.style.left = x + '%';
        marker.style.top = y + '%';
        marker.style.background = '#000000';
        marker.style.cursor = 'move';
        marker.id = 'pendingMarker';
        document.getElementById('pitchWrapper').appendChild(marker);
        setupDraggableMarker(marker);
        updateDistanceLine(x, y);
    } else {
        const foot = getKickingFoot();
        const half = getMatchHalf();
        const shotFor = getShotFor();
        const shotCategory = getShotCategory();
        const shotTypeDropdown = getShotTypeDropdown();
        batchPendingLocation = { x, y, distance: distanceToGoal, foot: foot, half: half, shotFor: shotFor, shotCategory: shotCategory, shotType: shotTypeDropdown };
        const marker = document.createElement('div');
        marker.className = 'shot-marker';
        marker.style.left = x + '%';
        marker.style.top = y + '%';
        marker.style.background = '#000000';
        marker.style.cursor = 'move';
        marker.id = 'pendingMarker';
        marker.title = 'Drag to position, then double-click (or long press on mobile) to enter shots';
        document.getElementById('pitchWrapper').appendChild(marker);
        setupDraggableMarker(marker);
        marker.addEventListener('dblclick', function(e) {
            e.stopPropagation();
            openBatchModal();
        });
        let longPressTimer;
        marker.addEventListener('touchstart', function(e) {
            longPressTimer = setTimeout(() => {
                openBatchModal();
            }, 500); // 500ms long press
        });
        marker.addEventListener('touchend', function(e) {
            clearTimeout(longPressTimer);
        });
        marker.addEventListener('touchmove', function(e) {
            clearTimeout(longPressTimer); // Cancel long press if dragging
        });
        updateDistanceLine(x, y);
    }
}
function setupDraggableMarker(marker) {
    marker.addEventListener('mousedown', function(e) {
        e.stopPropagation();
        isDragging = true;
        dragMarker = marker;
    });
    marker.addEventListener('touchstart', function(e) {
        e.stopPropagation();
        isDragging = true;
        dragMarker = marker;
    }, { passive: false });
}
document.addEventListener('mousemove', function(e) {
    if (!isDragging || !dragMarker) return;
    handleDrag(e.clientX, e.clientY);
});
document.addEventListener('touchmove', function(e) {
    if (!isDragging || !dragMarker) return;
    e.preventDefault();
    const touch = e.touches[0];
    handleDrag(touch.clientX, touch.clientY);
}, { passive: false });
function handleDrag(clientX, clientY) {
    const svg = document.getElementById('pitch');
    const svgRect = svg.getBoundingClientRect();
    const clickX = clientX - svgRect.left;
    const clickY = clientY - svgRect.top;
    const x = Math.max(0, Math.min(100, (clickX / svgRect.width) * 100));
    const y = Math.max(0, Math.min(100, (clickY / svgRect.height) * 100));
    dragMarker.style.left = x + '%';
    dragMarker.style.top = y + '%';
    const svgX = (clickX / svgRect.width) * 500;
    const svgY = (clickY / svgRect.height) * 725;
    const pitchX = ((svgX - 25) / 400) * 90 - 45;
    const pitchY = ((svgY - 40) / 644) * 145;
    const distanceToTopGoal = pitchY;
    const distanceToBottomGoal = 145 - pitchY;
    const isTopGoal = distanceToTopGoal < distanceToBottomGoal;
    const distanceToGoal = Math.sqrt(pitchX * pitchX + (isTopGoal ? distanceToTopGoal : distanceToBottomGoal) * (isTopGoal ? distanceToTopGoal : distanceToBottomGoal));
    updateDistanceLine(x, y);
    if (pendingShot) {
        pendingShot.x = x;
        pendingShot.y = y;
        pendingShot.distance = distanceToGoal;
    }
    if (batchPendingLocation) {
        batchPendingLocation.x = x;
        batchPendingLocation.y = y;
        batchPendingLocation.distance = distanceToGoal;
    }
}
document.addEventListener('mouseup', function() {
    isDragging = false;
    dragMarker = null;
});
document.addEventListener('touchend', function() {
    isDragging = false;
    dragMarker = null;
});
function updateDistanceLine(xPercent, yPercent) {
    const oldLine = document.getElementById('distanceLine');
    if (oldLine) oldLine.remove();
    const oldLabel = document.getElementById('distanceLabel');
    if (oldLabel) oldLabel.remove();
    const svg = document.getElementById('pitch');
    const svgX = (xPercent / 100) * 500;
    const svgY = (yPercent / 100) * 725;
    const pitchY = ((svgY - 40) / 644) * 145;
    const distanceToTopGoal = pitchY;
    const distanceToBottomGoal = 145 - pitchY;
    const isTopGoal = distanceToTopGoal < distanceToBottomGoal;
    const pitchX = ((svgX - 25) / 400) * 90 - 45;
    const distanceToGoal = Math.sqrt(pitchX * pitchX + (isTopGoal ? distanceToTopGoal : distanceToBottomGoal) * (isTopGoal ? distanceToTopGoal : distanceToBottomGoal));
    const goalX = 225;
    const goalY = isTopGoal ? 40 : 684;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('id', 'distanceLine');
    line.setAttribute('x1', svgX);
    line.setAttribute('y1', svgY);
    line.setAttribute('x2', goalX);
    line.setAttribute('y2', goalY);
    line.setAttribute('stroke', '#000000');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-dasharray', '5,5');
    svg.appendChild(line);
    const midX = (svgX + goalX) / 2;
    const midY = (svgY + goalY) / 2;
    const dx = goalX - svgX;
    const dy = goalY - svgY;
    const lineLength = Math.sqrt(dx * dx + dy * dy);
    const offsetDistance = 25; // pixels to the right
    const perpX = -dy / lineLength * offsetDistance;
    const perpY = dx / lineLength * offsetDistance;
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('id', 'distanceLabel');
    text.setAttribute('x', midX + perpX);
    text.setAttribute('y', midY + perpY);
    text.setAttribute('fill', '#000000');
    text.setAttribute('font-size', '16');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('text-anchor', 'middle');
    text.textContent = distanceToGoal.toFixed(1) + 'm';
    svg.appendChild(text);
}
function markLastShot(result, extraFields) {
    if (!pendingShot) return;
    const shot = {
        ...pendingShot,
        result: result,
        timestamp: new Date().toISOString(),
        comment: '',
        missResult: null,
        missReason: null
    };
    if (extraFields) {
        Object.assign(shot, extraFields);
    }
    shot.pointValue = getPointValue(shot);
    currentSession.shots.push(shot);
    const marker = document.getElementById('pendingMarker');
    if (marker) {
        marker.classList.add(result);
        marker.id = '';
        marker.style.background = '';
        if (shot.shotFor === 'goal') {
            marker.classList.add('goal-shot');
        }
        if (shot.pointValue === 2) {
            marker.classList.add('two-point');
        }
        setupCommentOnMarker(marker, shot);
    }
    const line = document.getElementById('distanceLine');
    const label = document.getElementById('distanceLabel');
    if (line) line.remove();
    if (label) label.remove();
    pendingShot = null;
    document.getElementById('scoredBtn').disabled = true;
    document.getElementById('missedBtn').disabled = true;
    updateCurrentSessionStats();
    saveData();
}
function setupCommentOnMarker(marker, shot) {
    marker.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        if (shot.result === 'missed') {
            showMissDetailsModal(shot, marker, false);
        } else {
            promptForComment(shot, marker);
        }
    });
    let commentPressTimer;
    marker.addEventListener('touchstart', function(e) {
        commentPressTimer = setTimeout(() => {
            if (shot.result === 'missed') {
                showMissDetailsModal(shot, marker, false);
            } else {
                promptForComment(shot, marker);
            }
        }, 700); // 700ms long press
    });
    marker.addEventListener('touchend', function(e) {
        clearTimeout(commentPressTimer);
    });
    marker.addEventListener('touchmove', function(e) {
        clearTimeout(commentPressTimer);
    });
    updateMarkerBorder(marker, shot);
}
function promptForComment(shot, marker) {
    const currentComment = shot.comment || '';
    const comment = prompt('Add a comment for this shot:\n(e.g., "Rushed shot, off balance")', currentComment);
    if (comment !== null) { // User clicked OK (even if empty)
        shot.comment = comment.trim();
        if (shot.comment) {
            marker.style.border = '3px solid #FFD700'; // Gold border
            marker.title = `${shot.result} - ${shot.comment}`;
        } else {
            marker.style.border = '2px solid ' + (shot.result === 'scored' ? 'black' : 'black');
            marker.title = shot.result;
        }
        saveData();
    }
}
async function undoLastShot() {
    if (pendingShot) {
        const marker = document.getElementById('pendingMarker');
        if (marker) marker.remove();
        const line = document.getElementById('distanceLine');
        const label = document.getElementById('distanceLabel');
        if (line) line.remove();
        if (label) label.remove();
        pendingShot = null;
        document.getElementById('scoredBtn').disabled = true;
        document.getElementById('missedBtn').disabled = true;
        return;
    }
    if (currentSession && currentSession.shots.length > 0) {
        if (confirm('Remove last shot?')) {
            const lastShot = currentSession.shots.pop();
            // Wait for any in-flight cloud save to finish so cloudId is set
            if (cloudSavePromise) {
                await cloudSavePromise;
            }
            if (lastShot.cloudId) {
                await deleteShotFromCloud(lastShot.cloudId);
            }
            const markers = document.querySelectorAll('.shot-marker:not(#pendingMarker)');
            if (markers.length > 0) {
                markers[markers.length - 1].remove();
            }
            updateCurrentSessionStats();
            saveData();
        }
    }
}
function clearPitchMarkers() {
    document.querySelectorAll('.shot-marker').forEach(m => m.remove());
    document.querySelectorAll('.batch-label').forEach(m => m.remove());
    document.querySelectorAll('.half-view-label').forEach(m => m.remove());
    // Clear drill overlays (spots, dotted lines, distance labels, previews)
    document.querySelectorAll('.drill-spot').forEach(m => m.remove());
    document.querySelectorAll('.drill-distance-line').forEach(m => m.remove());
    document.querySelectorAll('.drill-distance-label').forEach(m => m.remove());
    document.querySelectorAll('.drill-preview-marker').forEach(m => m.remove());
    document.querySelectorAll('.drill-preview-line').forEach(m => m.remove());
}

function resetPitchState() {
    hideShotTooltip();
    clearPitchMarkers();
    // Remove distance line and label
    const line = document.getElementById('distanceLine');
    const label = document.getElementById('distanceLabel');
    if (line) line.remove();
    if (label) label.remove();
    // Clear pending shot state
    pendingShot = null;
    batchPendingLocation = null;
    document.getElementById('scoredBtn').disabled = true;
    document.getElementById('missedBtn').disabled = true;
}
function updateCurrentSessionStats() {
    // Restore active stats panel unless we're viewing a past session
    const activeStatsEl = document.getElementById('activeSessionStats');
    const viewPanelEl = document.getElementById('viewSessionStatsPanel');
    if (!viewingPastSession) {
        if (activeStatsEl) activeStatsEl.style.display = '';
        if (viewPanelEl) { viewPanelEl.style.display = 'none'; viewPanelEl.innerHTML = ''; }
    }

    const shots = currentSession ? currentSession.shots : [];
    const scored = shots.filter(s => s.result === 'scored').length;
    const missed = shots.filter(s => s.result === 'missed').length;
    const total = shots.length;
    const rate = total > 0 ? Math.round((scored / total) * 100) : 0;
    const inPlayShots = shots.filter(s => s.shotCategory === 'in-play');
    const inPlayScoredCount = inPlayShots.filter(s => s.result === 'scored').length;
    const inPlayRateVal = inPlayShots.length > 0 ? Math.round((inPlayScoredCount / inPlayShots.length) * 100) : 0;
    const deadBallShots = shots.filter(s => s.shotCategory === 'free-kick' || s.shotCategory === '45');
    const deadBallScoredCount = deadBallShots.filter(s => s.result === 'scored').length;
    const deadBallRateVal = deadBallShots.length > 0 ? Math.round((deadBallScoredCount / deadBallShots.length) * 100) : 0;
    const onePointerShots = shots.filter(s => (s.pointValue === 1 || !s.pointValue) && s.shotFor !== 'goal');
    const onePointerScoredCount = onePointerShots.filter(s => s.result === 'scored').length;
    const onePointerRateVal = onePointerShots.length > 0 ? Math.round((onePointerScoredCount / onePointerShots.length) * 100) : 0;
    const twoPointerShots = shots.filter(s => s.pointValue === 2 && s.shotFor !== 'goal');
    const twoPointerScoredCount = twoPointerShots.filter(s => s.result === 'scored').length;
    const twoPointerRateVal = twoPointerShots.length > 0 ? Math.round((twoPointerScoredCount / twoPointerShots.length) * 100) : 0;
    const goalShots = shots.filter(s => s.shotFor === 'goal');
    const goalScoredCount = goalShots.filter(s => s.result === 'scored').length;
    const goalRateVal = goalShots.length > 0 ? Math.round((goalScoredCount / goalShots.length) * 100) : 0;
    const rightFootShots = shots.filter(s => s.foot === 'right');
    const rightFootScoredCount = rightFootShots.filter(s => s.result === 'scored').length;
    const rightFootRateVal = rightFootShots.length > 0 ? Math.round((rightFootScoredCount / rightFootShots.length) * 100) : 0;
    const leftFootShots = shots.filter(s => s.foot === 'left');
    const leftFootScoredCount = leftFootShots.filter(s => s.result === 'scored').length;
    const leftFootRateVal = leftFootShots.length > 0 ? Math.round((leftFootScoredCount / leftFootShots.length) * 100) : 0;
    document.getElementById('scoredShots').textContent = scored;
    document.getElementById('totalShotsConv').textContent = total;
    document.getElementById('successRate').textContent = rate + '%';
    document.getElementById('onePointerConv').textContent = `${onePointerScoredCount}/${onePointerShots.length} (${onePointerRateVal}%)`;
    document.getElementById('twoPointerConv').textContent = `${twoPointerScoredCount}/${twoPointerShots.length} (${twoPointerRateVal}%)`;
    document.getElementById('goalConv').textContent = `${goalScoredCount}/${goalShots.length} (${goalRateVal}%)`;
    document.getElementById('inPlayConv').textContent = `${inPlayScoredCount}/${inPlayShots.length} (${inPlayRateVal}%)`;
    document.getElementById('deadBallConv').textContent = `${deadBallScoredCount}/${deadBallShots.length} (${deadBallRateVal}%)`;
    document.getElementById('rightFootConv').textContent = `${rightFootScoredCount}/${rightFootShots.length} (${rightFootRateVal}%)`;
    document.getElementById('leftFootConv').textContent = `${leftFootScoredCount}/${leftFootShots.length} (${leftFootRateVal}%)`;
    if (currentSession) {
        document.getElementById('currentSessionCount').textContent = total + ' shots';
    }
    const saveDrillBtn = document.getElementById('saveDrillBtn');
    if (saveDrillBtn) {
        const shouldShow = currentSession &&
                           currentSession.type === 'practice' &&
                           currentSession.shots &&
                           getUniquePositions(currentSession.shots).length >= 2;
        saveDrillBtn.style.display = shouldShow ? '' : 'none';
    }
}

// --- Miss Details Modal ---

function updateMarkerBorder(marker, shot) {
    if (shot.comment || shot.missResult || shot.missReason) {
        marker.style.border = '3px solid #FFD700';
    }
}

function toggleCustomMissReason() {
    const select = document.getElementById('missReasonSelect');
    const customInput = document.getElementById('missReasonCustom');
    if (select.value === 'other') {
        customInput.style.display = 'block';
        customInput.focus();
    } else {
        customInput.style.display = 'none';
        customInput.value = '';
    }
}

function showMissDetailsModal(shot, marker, isNewShot) {
    editingShot = shot;
    editingMarker = marker;
    const modal = document.getElementById('missDetailsModal');
    const resultSelect = document.getElementById('missResultSelect');
    const reasonSelect = document.getElementById('missReasonSelect');
    const customReason = document.getElementById('missReasonCustom');
    const commentInput = document.getElementById('missCommentInput');

    if (isNewShot) {
        resultSelect.value = '';
        reasonSelect.value = '';
        customReason.value = '';
        customReason.style.display = 'none';
        commentInput.value = '';
    } else {
        resultSelect.value = shot.missResult || '';
        const knownReasons = ['', 'pulled', 'rushed', 'bad-connection', 'outside-range', 'at-limits', 'other'];
        if (shot.missReason && !knownReasons.includes(shot.missReason)) {
            reasonSelect.value = 'other';
            customReason.value = shot.missReason;
            customReason.style.display = 'block';
        } else {
            reasonSelect.value = shot.missReason || '';
            customReason.value = '';
            customReason.style.display = 'none';
        }
        commentInput.value = shot.comment || '';
    }

    modal.classList.add('active');
    modal.dataset.isNewShot = isNewShot ? 'true' : 'false';
}

function closeMissDetailsModal() {
    document.getElementById('missDetailsModal').classList.remove('active');
    editingShot = null;
    editingMarker = null;
}

function saveMissDetails() {
    const modal = document.getElementById('missDetailsModal');
    const isNewShot = modal.dataset.isNewShot === 'true';
    const missResult = document.getElementById('missResultSelect').value || null;
    const reasonSelect = document.getElementById('missReasonSelect');
    const customReason = document.getElementById('missReasonCustom').value.trim();
    const missReason = reasonSelect.value === 'other' ? (customReason || 'other') : (reasonSelect.value || null);
    const comment = document.getElementById('missCommentInput').value.trim();

    if (isNewShot) {
        markLastShot('missed', { missResult, missReason, comment });
    } else if (editingShot) {
        editingShot.missResult = missResult;
        editingShot.missReason = missReason;
        editingShot.comment = comment;
        if (editingMarker) {
            updateMarkerBorder(editingMarker, editingShot);
            if (editingShot.comment || editingShot.missResult || editingShot.missReason) {
                const parts = [editingShot.result];
                if (editingShot.missResult) parts.push(editingShot.missResult);
                if (editingShot.missReason) parts.push(editingShot.missReason);
                if (editingShot.comment) parts.push(editingShot.comment);
                editingMarker.title = parts.join(' - ');
            } else {
                editingMarker.title = editingShot.result;
            }
        }
        if (editingShot.cloudId) {
            updateShotInCloud(editingShot);
        }
        saveData();
    }

    closeMissDetailsModal();
}

// --- Missed Button Event Listeners ---
(function setupMissedButton() {
    const missedBtn = document.getElementById('missedBtn');
    if (!missedBtn) return;

    let missLongPressTimer = null;
    let missLongPressFired = false;
    let missDblClickTimer = null;
    let missClickCount = 0;

    missedBtn.addEventListener('touchstart', function(e) {
        missLongPressFired = false;
        missLongPressTimer = setTimeout(() => {
            missLongPressFired = true;
            if (pendingShot) {
                showMissDetailsModal(null, null, true);
            }
        }, 1000);
    });

    missedBtn.addEventListener('touchend', function(e) {
        clearTimeout(missLongPressTimer);
        if (missLongPressFired) {
            e.preventDefault();
            return;
        }
        // Let click handler deal with single taps
    });

    missedBtn.addEventListener('touchmove', function(e) {
        clearTimeout(missLongPressTimer);
    });

    missedBtn.addEventListener('click', function(e) {
        if (missLongPressFired) {
            missLongPressFired = false;
            return;
        }
        missClickCount++;
        if (missClickCount === 1) {
            missDblClickTimer = setTimeout(() => {
                // Single click - quick miss
                missClickCount = 0;
                markLastShot('missed');
            }, 300);
        } else if (missClickCount === 2) {
            // Double click - show modal
            clearTimeout(missDblClickTimer);
            missClickCount = 0;
            if (pendingShot) {
                showMissDetailsModal(null, null, true);
            }
        }
    });
})();
