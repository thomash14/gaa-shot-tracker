function getZone(x, y) {
    const svgX = (x / 100) * 500;
    const svgY = (y / 100) * 725;
    const goalX = 225;
    const goalY = 40;
    const distanceFromGoal = Math.sqrt(Math.pow(svgX - goalX, 2) + Math.pow(svgY - goalY, 2));
    const arc21m = 58;   // 21m arc
    const arc35m = 156;  // Imaginary 35m arc
    const arc40m = 178;  // 40m arc
    const line13m = 98;
    const line20m = 129;
    const line45m = 240;
    const line65m = 329;
    const leftZoneEdge = 115;   // 25 + 90 (approximately 13m = 90px)
    const rightZoneEdge = 335;  // 425 - 90
    if (svgY > line45m) {
        return { zone: 1, name: 'Outside 45m', color: '#9E9E9E' };
    }
    if (svgY <= line13m) {
        if (svgX < leftZoneEdge) {
            return { zone: 7, name: 'Close Left', color: '#4CAF50' };
        } else if (svgX > rightZoneEdge) {
            return { zone: 9, name: 'Close Right', color: '#4CAF50' };
        } else {
            return { zone: 8, name: 'Close Centre', color: '#8BC34A' };
        }
    }
    if (svgY <= line20m) {
        if (svgX < leftZoneEdge) {
            return { zone: 7, name: 'Close Left', color: '#4CAF50' };
        } else if (svgX > rightZoneEdge) {
            return { zone: 9, name: 'Close Right', color: '#4CAF50' };
        } else {
            if (distanceFromGoal <= arc21m) {
                return { zone: 8, name: 'Close Centre', color: '#8BC34A' };
            }
            return { zone: 6, name: 'Inside 35m Arc', color: '#CDDC39' };
        }
    }
    if (distanceFromGoal <= arc35m && svgY <= line45m) {
        return { zone: 6, name: 'Inside 35m Arc', color: '#CDDC39' };
    }
    if (distanceFromGoal <= arc40m && distanceFromGoal > arc35m && svgY <= line45m) {
        return { zone: 5, name: '35m-40m Arc', color: '#FF9800' };
    }
    if (svgY <= line45m) {
        const leftThird = 158;
        const rightThird = 292;
        if (svgX < leftThird) {
            return { zone: 2, name: 'Left Wing', color: '#2196F3' };
        } else if (svgX > rightThird) {
            return { zone: 4, name: 'Right Wing', color: '#2196F3' };
        } else {
            return { zone: 3, name: 'Centre 40m-45m', color: '#03A9F4' };
        }
    }
    return { zone: 1, name: 'Outside 45m', color: '#9E9E9E' };
}
function getZoneName(x, y) {
    return getZone(x, y).name;
}

function handleDateRangeChange() {
    const dateRange = document.getElementById('dateRangeFilter').value;
    const customDateContainer = document.getElementById('customDateContainer');
    const customSessionContainer = document.getElementById('customSessionContainer');
    if (dateRange === 'custom') {
        customDateContainer.style.display = 'flex';
        customSessionContainer.style.display = 'none';
        const dateFrom = document.getElementById('dateFrom');
        const dateTo = document.getElementById('dateTo');
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
    applyAnalyticsFilters();
}
function getDateRangeFilter() {
    const dateRange = document.getElementById('dateRangeFilter').value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let startDate = null;
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    if (dateRange === 'customSessions') {
        const count = parseInt(document.getElementById('sessionCountFilter').value);
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
            const fromValue = document.getElementById('dateFrom').value;
            const toValue = document.getElementById('dateTo').value;
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
function applyAnalyticsFilters() {
    displayAnalytics();
}
function displayAnalytics() {
    const { startDate, endDate, sessionLimit } = getDateRangeFilter();
    let filteredSessions = sessions.filter(s => s.type === currentAnalyticsType);
    if (sessionLimit) {
        filteredSessions = filteredSessions.slice(0, sessionLimit);
    }
    else if (startDate || endDate) {
        filteredSessions = filteredSessions.filter(s => {
            const dateParts = s.date.split('-');
            const sessionDate = new Date(
                parseInt(dateParts[0]), 
                parseInt(dateParts[1]) - 1, 
                parseInt(dateParts[2]),
                12, 0, 0, 0 // Set to noon to avoid any edge cases
            );
            if (startDate && sessionDate < startDate) return false;
            if (endDate && sessionDate > endDate) return false;
            return true;
        });
    }
    let allShots = filteredSessions.flatMap(s => ({...s, shots: s.shots})).flatMap(s => s.shots.map(shot => ({
        ...shot,
        matchType: s.matchType
    })));
    allShots = filteredSessions.flatMap(s => s.shots.map(shot => ({
        ...shot,
        matchType: s.matchType
    })));
    const matchTypeFilterContainer = document.getElementById('matchTypeFilterContainer');
    const matchTypeFilterEl = document.getElementById('matchTypeFilter');
    const currentMatchTypeSelection = matchTypeFilterEl.value; // Save current selection
    if (currentAnalyticsType === 'match') {
        matchTypeFilterContainer.style.display = 'block';
        const customTypes = [...new Set(filteredSessions.map(s => s.matchType).filter(t => t && !['league', 'championship', 'challenge'].includes(t)))];
        matchTypeFilterEl.innerHTML = `
            <option value="all">All</option>
            <option value="league">League</option>
            <option value="championship">Championship</option>
            <option value="challenge">Challenge</option>
            ${customTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
        `;
        if ([...matchTypeFilterEl.options].some(opt => opt.value === currentMatchTypeSelection)) {
            matchTypeFilterEl.value = currentMatchTypeSelection;
        }
    } else {
        matchTypeFilterContainer.style.display = 'none';
    }
    const matchTypeFilter = matchTypeFilterEl.value;
    if (matchTypeFilter !== 'all' && currentAnalyticsType === 'match') {
        allShots = allShots.filter(s => s.matchType === matchTypeFilter);
    }
    const shotCategoryFilter = document.getElementById('shotCategoryFilter').value;
    if (shotCategoryFilter !== 'all') {
        allShots = allShots.filter(s => s.shotCategory === shotCategoryFilter);
    }
    const shotTypeFilter = document.getElementById('shotTypeFilter').value;
    if (shotTypeFilter !== 'all') {
        allShots = allShots.filter(s => s.shotType === shotTypeFilter);
    }
    const footFilter = document.getElementById('footFilter').value;
    if (footFilter !== 'all') {
        allShots = allShots.filter(s => s.foot === footFilter);
    }
    const halfFilter = document.getElementById('halfFilter').value;
    if (halfFilter !== 'all') {
        allShots = allShots.filter(s => s.half === halfFilter);
    }
    const totalShots = allShots.length;
    const scored = allShots.filter(s => s.result === 'scored').length;
    const successRate = totalShots > 0 ? Math.round((scored / totalShots) * 100) : 0;
    const scoredShots = allShots.filter(s => s.result === 'scored');
    const onePointers = scoredShots.filter(s => (s.pointValue || 1) === 1).length;
    const twoPointers = scoredShots.filter(s => s.pointValue === 2).length;
    const totalPoints = onePointers + (twoPointers * 2);
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
    document.getElementById('analyticsConversionTotal').textContent = `${scored}/${totalShots} (${successRate}%)`;
    document.getElementById('analyticsInPlayConv').textContent = `${inPlayScored}/${inPlayShots.length} (${inPlayRate}%)`;
    document.getElementById('analyticsDeadBallConv').textContent = `${deadBallScored}/${deadBallShots.length} (${deadBallRate}%)`;
    document.getElementById('analyticsOnePointerConv').textContent = `${onePointerScored}/${onePointerShots.length} (${onePointerRate}%)`;
    document.getElementById('analyticsTwoPointerConv').textContent = `${twoPointerScored}/${twoPointerShots.length} (${twoPointerRate}%)`;
    document.getElementById('analyticsGoalConv').textContent = `${goalScored}/${goalShots.length} (${goalRate}%)`;
    document.getElementById('totalSessions').textContent = filteredSessions.length;
    document.getElementById('sessionsLabel').textContent = currentAnalyticsType === 'match' ? 'Matches' : 'Sessions';
    renderShotMapWithFilters();
    const zones = {};
    allShots.forEach(shot => {
        const zoneInfo = getZone(shot.x, shot.y);
        const zoneKey = zoneInfo.zone;
        if (!zones[zoneKey]) {
            zones[zoneKey] = { 
                total: 0, 
                scored: 0, 
                name: zoneInfo.name, 
                color: zoneInfo.color,
                zone: zoneInfo.zone
            };
        }
        zones[zoneKey].total++;
        if (shot.result === 'scored') zones[zoneKey].scored++;
    });
    const zoneStats = document.getElementById('zoneStats');
    if (Object.keys(zones).length === 0) {
        zoneStats.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><p>No data yet. Start tracking shots!</p></div>';
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
                    <div style="font-size: 1.5em; font-weight: bold; color: ${rateColor}; margin: 10px 0;">
                        ${rate}%
                    </div>
                    <div style="font-size: 0.9em; color: #666;">
                        ${stats.scored}/${stats.total} shots
                    </div>
                </div>
            `;
        }).join('');
        const shotsWithDistance = allShots.filter(s => s.distance !== undefined);
        if (shotsWithDistance.length > 0) {
            const avgDistance = shotsWithDistance.reduce((sum, s) => sum + s.distance, 0) / shotsWithDistance.length;
            const scoredShots = shotsWithDistance.filter(s => s.result === 'scored');
            const missedShots = shotsWithDistance.filter(s => s.result === 'missed');
            const avgScoredDistance = scoredShots.length > 0 
                ? scoredShots.reduce((sum, s) => sum + s.distance, 0) / scoredShots.length 
                : 0;
            const avgMissedDistance = missedShots.length > 0
                ? missedShots.reduce((sum, s) => sum + s.distance, 0) / missedShots.length
                : 0;
            zoneHTML += `
                <div style="grid-column: 1/-1; margin: 15px 0 10px 0;"><h3 style="color: #2a5298; margin: 0;">Distance Analysis</h3></div>
                <div class="zone-card">
                    <div class="zone-name">Average Distance</div>
                    <div style="font-size: 1.5em; font-weight: bold; color: #2a5298; margin: 10px 0;">
                        ${avgDistance.toFixed(1)}m
                    </div>
                    <div style="font-size: 0.9em; color: #666;">
                        All shots
                    </div>
                </div>
                <div class="zone-card">
                    <div class="zone-name">Scored Distance</div>
                    <div style="font-size: 1.5em; font-weight: bold; color: #4CAF50; margin: 10px 0;">
                        ${avgScoredDistance.toFixed(1)}m
                    </div>
                    <div style="font-size: 0.9em; color: #666;">
                        ${scoredShots.length} shots scored
                    </div>
                </div>
                <div class="zone-card">
                    <div class="zone-name">Missed Distance</div>
                    <div style="font-size: 1.5em; font-weight: bold; color: #f44336; margin: 10px 0;">
                        ${avgMissedDistance.toFixed(1)}m
                    </div>
                    <div style="font-size: 0.9em; color: #666;">
                        ${missedShots.length} shots missed
                    </div>
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
                    <div style="font-size: 1.5em; font-weight: bold; color: #2a5298; margin: 10px 0;">
                        ${leftRate}%
                    </div>
                    <div style="font-size: 0.9em; color: #666;">
                        ${leftScored}/${leftFootShots.length} shots
                    </div>
                </div>
                <div class="zone-card">
                    <div class="zone-name">Right Foot</div>
                    <div style="font-size: 1.5em; font-weight: bold; color: #2a5298; margin: 10px 0;">
                        ${rightRate}%
                    </div>
                    <div style="font-size: 0.9em; color: #666;">
                        ${rightScored}/${rightFootShots.length} shots
                    </div>
                </div>
            `;
        }
        zoneStats.innerHTML = zoneHTML;
    }
}
function toggleZoneOverlay() {
    const overlay = document.getElementById('zoneOverlays');
    const checkbox = document.getElementById('showZoneOverlay');
    if (checkbox.checked) {
        overlay.style.display = 'block';
    } else {
        overlay.style.display = 'none';
    }
}
function switchAnalyticsType(type) {
    currentAnalyticsType = type;
    document.getElementById('analyticsPracticeSubTab').classList.toggle('active', type === 'practice');
    document.getElementById('analyticsMatchSubTab').classList.toggle('active', type === 'match');
    const sessionWord = type === 'match' ? 'Games' : 'Practices';
    document.getElementById('dateRangeLabel').textContent = type === 'match' ? 'Date/Game Range:' : 'Date/Practice Range:';
    document.getElementById('gamesLabel').textContent = sessionWord;
    const customSessionsOption = document.querySelector('#dateRangeFilter option[value="customSessions"]');
    if (customSessionsOption) {
        customSessionsOption.textContent = type === 'match' ? 'Custom Game Range...' : 'Custom Practice Range...';
    }
    document.getElementById('halfFilterContainer').style.display = type === 'match' ? 'flex' : 'none';
    document.getElementById('footFilter').value = 'all';
    document.getElementById('halfFilter').value = 'all';
    document.getElementById('shotCategoryFilter').value = 'all';
    document.getElementById('shotTypeFilter').value = 'all';
    document.getElementById('matchTypeFilter').value = 'all';
    displayAnalytics();
}
function renderShotMapWithFilters() {
    const wrapper = document.getElementById('analyticsPitchWrapper');
    wrapper.querySelectorAll('.analytics-shot-marker, .analytics-batch-label').forEach(m => m.remove());
    const { startDate, endDate } = getDateRangeFilter();
    let filteredSessions = sessions.filter(s => s.type === currentAnalyticsType);
    if (startDate || endDate) {
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
    let allShots = filteredSessions.flatMap(s => (s.shots || []).map(shot => ({
        ...shot,
        sessionType: s.type,
        matchType: s.matchType
    })));
    const matchTypeFilter = document.getElementById('matchTypeFilter').value;
    if (matchTypeFilter !== 'all' && currentAnalyticsType === 'match') {
        allShots = allShots.filter(s => s.matchType === matchTypeFilter);
    }
    const shotCategoryFilter = document.getElementById('shotCategoryFilter').value;
    if (shotCategoryFilter !== 'all') {
        allShots = allShots.filter(s => s.shotCategory === shotCategoryFilter);
    }
    const shotTypeFilter = document.getElementById('shotTypeFilter').value;
    if (shotTypeFilter !== 'all') {
        allShots = allShots.filter(s => s.shotType === shotTypeFilter);
    }
    const footFilter = document.getElementById('footFilter').value;
    if (footFilter === 'left') {
        allShots = allShots.filter(s => s.foot === 'left');
    } else if (footFilter === 'right') {
        allShots = allShots.filter(s => s.foot === 'right');
    }
    const halfFilter = document.getElementById('halfFilter').value;
    if (halfFilter === '1st') {
        allShots = allShots.filter(s => s.half === '1st');
    } else if (halfFilter === '2nd') {
        allShots = allShots.filter(s => s.half === '2nd');
    }
    // Pitch boundaries as % of SVG (viewBox 0-500 x 0-725, pitch rect x=25..425 y=40..684)
    const PITCH_X_MIN = 25 / 500 * 100;   // 5%
    const PITCH_X_MAX = 425 / 500 * 100;   // 85%
    const PITCH_Y_MIN = 40 / 725 * 100;    // 5.52%
    const PITCH_Y_MAX = 684 / 725 * 100;   // 94.34%
    const locationMap = new Map();
    allShots.forEach((shot, i) => {
        const needsMirror = shot.y >= 50;
        let displayX = shot.x;
        let displayY = shot.y;
        if (needsMirror) {
            displayY = PITCH_Y_MIN + PITCH_Y_MAX - shot.y;
            displayX = PITCH_X_MIN + PITCH_X_MAX - shot.x;
        }
        const key = `${displayX.toFixed(1)}-${displayY.toFixed(1)}`;
        if (!locationMap.has(key)) {
            locationMap.set(key, { 
                x: displayX, 
                y: displayY, 
                scored: 0, 
                total: 0,
                shotFor: shot.shotFor,
                foot: shot.foot,
                distance: shot.distance
            });
        }
        const loc = locationMap.get(key);
        loc.total++;
        if (shot.result === 'scored') loc.scored++;
    });
    locationMap.forEach((loc, key) => {
        const marker = document.createElement('div');
        marker.className = 'analytics-shot-marker';
        marker.style.position = 'absolute';
        marker.style.left = loc.x + '%';
        marker.style.top = loc.y + '%';
        marker.style.transform = 'translate(-50%, -50%)';
        marker.style.zIndex = '3';
        marker.style.cursor = 'pointer';
        
        const isGoal = loc.shotFor === 'goal';
        
        if (loc.total > 1) {
            // Batch marker
            const size = 20;
            marker.style.width = size + 'px';
            marker.style.height = size + 'px';
            marker.style.borderRadius = '50%';
            marker.style.border = '2px solid #333';
            
            if (loc.scored === loc.total) {
                marker.style.background = 'white';
            } else if (loc.scored === 0) {
                marker.style.background = '#f44336';
            } else {
                marker.style.background = 'linear-gradient(135deg, #4CAF50 50%, #f44336 50%)';
            }
            
            // Add count label below
            const labelContainer = document.createElement('div');
            labelContainer.className = 'analytics-batch-label';
            labelContainer.style.cssText = `position:absolute;left:${loc.x}%;top:calc(${loc.y}% + 12px);transform:translateX(-50%);z-index:3;pointer-events:none;text-align:center;`;
            labelContainer.innerHTML = `
                <div style="background:rgba(0,0,0,0.7);color:white;font-size:9px;font-weight:bold;padding:1px 4px;border-radius:3px;white-space:nowrap;">${loc.scored}/${loc.total}</div>
            `;
            wrapper.appendChild(labelContainer);
        } else {
            // Single shot marker
            const isScored = loc.scored === 1;
            const size = 12;
            
            if (isGoal) {
                marker.style.width = size + 'px';
                marker.style.height = size + 'px';
                marker.style.borderRadius = '0';
                marker.style.background = isScored ? 'white' : '#f44336';
                marker.style.border = '1.5px solid #333';
            } else {
                marker.style.width = size + 'px';
                marker.style.height = size + 'px';
                marker.style.borderRadius = '50%';
                marker.style.background = isScored ? 'white' : '#f44336';
                marker.style.border = '1.5px solid #333';
            }
        }
        
        const distance = loc.distance ? loc.distance.toFixed(1) + 'm' : '';
        marker.title = `${loc.scored}/${loc.total} (${Math.round(loc.scored/loc.total*100)}%)${distance ? ' - ' + distance : ''}`;
        wrapper.appendChild(marker);
    });
}
function renderShotMap(footFilter, halfFilter, sessionTypeFilter) {
    const svg = document.getElementById('analyticsPitch');
    const existingMarkers = svg.querySelectorAll('.analytics-shot-marker');
    existingMarkers.forEach(m => m.remove());
    const allShots = sessions.flatMap(s => s.shots.map(shot => ({
        ...shot,
        sessionType: s.type
    })));
    let filteredShots = allShots;
    if (footFilter === 'left') {
        filteredShots = filteredShots.filter(s => s.foot === 'left');
    } else if (footFilter === 'right') {
        filteredShots = filteredShots.filter(s => s.foot === 'right');
    }
    if (halfFilter === '1st') {
        filteredShots = filteredShots.filter(s => s.half === '1st');
    } else if (halfFilter === '2nd') {
        filteredShots = filteredShots.filter(s => s.half === '2nd');
    }
    if (sessionTypeFilter === 'practice') {
        filteredShots = filteredShots.filter(s => s.sessionType === 'practice');
    } else if (sessionTypeFilter === 'match') {
        filteredShots = filteredShots.filter(s => s.sessionType === 'match');
    }
    filteredShots.forEach(shot => {
        const isBottomGoal = shot.y >= 50;
        let displayX = shot.x;
        let displayY = shot.y;
        if (isBottomGoal) {
            displayY = (40 + 684) / 725 * 100 - shot.y;
            displayX = (25 + 425) / 500 * 100 - shot.x;
        }
        const svgX = (displayX / 100) * 500;
        const svgY = (displayY / 100) * 725;
        let marker;
        if (shot.shotFor === 'goal') {
            marker = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            marker.setAttribute('class', `analytics-shot-marker ${shot.result}`);
            marker.setAttribute('x', svgX - 4);
            marker.setAttribute('y', svgY - 4);
            marker.setAttribute('width', 8);
            marker.setAttribute('height', 8);
        } else {
            marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            marker.setAttribute('class', `analytics-shot-marker ${shot.result}`);
            marker.setAttribute('cx', svgX);
            marker.setAttribute('cy', svgY);
            marker.setAttribute('r', 4);
        }
        const distance = shot.distance ? shot.distance.toFixed(1) + 'm' : 'N/A';
        const foot = shot.foot ? ` (${shot.foot} foot)` : '';
        const half = shot.half ? ` - ${shot.half} half` : '';
        const shotFor = shot.shotFor ? ` [${shot.shotFor}]` : '';
        marker.innerHTML = `<title>${shot.result}${shotFor}${foot}${half} - ${distance}</title>`;
        svg.appendChild(marker);
    });
}
