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
    uncheckedSessionIds.clear();
    if (currentAnalyticsType === 'practice') {
        document.getElementById('drillFilterContainer').style.display = 'flex';
        populateDrillFilter();
    } else {
        document.getElementById('drillFilterContainer').style.display = 'none';
    }
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
    const matchTypeFilterContainer = document.getElementById('matchTypeFilterContainer');
    if (currentAnalyticsType === 'match') {
        matchTypeFilterContainer.style.display = 'block';
        const customTypes = [...new Set(filteredSessions.map(s => s.matchType).filter(t => t && !['league', 'championship', 'challenge'].includes(t)))];
        const allOpts = [
            { value: 'league', label: 'League' },
            { value: 'championship', label: 'Championship' },
            { value: 'challenge', label: 'Challenge' },
            ...customTypes.map(t => ({ value: t, label: t }))
        ];
        setMultiSelectOptions('matchTypeFilter', allOpts);
        allShots = msFilterShots(allShots, 'matchTypeFilter', 'matchType');
    } else {
        matchTypeFilterContainer.style.display = 'none';
    }
    if (currentAnalyticsType === 'practice') {
        allShots = applyDrillFilterMulti(allShots);
    }
    allShots = msFilterShots(allShots, 'shotCategoryFilter', 'shotCategory');
    allShots = msFilterShots(allShots, 'shotTypeFilter', 'shotType');
    allShots = msFilterShots(allShots, 'footFilter', 'foot');
    allShots = msFilterShots(allShots, 'resultFilter', 'result');
    allShots = msFilterShots(allShots, 'halfFilter', 'half');
    allShots = msFilterShots(allShots, 'windDirectionFilter', 'windDirection');
    allShots = msFilterShots(allShots, 'windStrengthFilter', 'windStrength');
    lastFilteredAllShots = allShots;
    updateConversionStats(allShots);
    document.getElementById('totalSessions').textContent = filteredSessions.length;
    document.getElementById('sessionsLabel').textContent = currentAnalyticsType === 'match' ? 'Matches' : 'Sessions';
    renderShotMapFromShots(allShots, 'analyticsPitchWrapper');
    renderStatsTable(filteredSessions);
    updateZoneStats(allShots);
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
    document.getElementById('drillFilterContainer').style.display = type === 'practice' ? 'flex' : 'none';
    resetMultiSelect('footFilter');
    resetMultiSelect('resultFilter');
    resetMultiSelect('halfFilter');
    resetMultiSelect('shotCategoryFilter');
    resetMultiSelect('shotTypeFilter');
    resetMultiSelect('matchTypeFilter');
    resetMultiSelect('drillFilter');
    resetMultiSelect('windDirectionFilter');
    resetMultiSelect('windStrengthFilter');
    document.getElementById('windDirectionFilterContainer').style.display = 'flex';
    document.getElementById('windStrengthFilterContainer').style.display = 'flex';
    if (type === 'practice') populateDrillFilter();
    displayAnalytics();
}
function renderShotMapWithFilters() {
    hideShotTooltip();
    const wrapper = document.getElementById('analyticsPitchWrapper');
    wrapper.querySelectorAll('.analytics-shot-marker, .shot-tooltip').forEach(m => m.remove());
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
        matchType: s.matchType,
        windDirection: s.windDirection || null,
        windStrength: s.windStrength || null
    })));
    if (currentAnalyticsType === 'match') {
        allShots = msFilterShots(allShots, 'matchTypeFilter', 'matchType');
    }
    if (currentAnalyticsType === 'practice') {
        allShots = applyDrillFilterMulti(allShots);
    }
    allShots = msFilterShots(allShots, 'shotCategoryFilter', 'shotCategory');
    allShots = msFilterShots(allShots, 'shotTypeFilter', 'shotType');
    allShots = msFilterShots(allShots, 'footFilter', 'foot');
    allShots = msFilterShots(allShots, 'resultFilter', 'result');
    allShots = msFilterShots(allShots, 'halfFilter', 'half');
    allShots = msFilterShots(allShots, 'windDirectionFilter', 'windDirection');
    allShots = msFilterShots(allShots, 'windStrengthFilter', 'windStrength');
    // Pitch boundaries as % of SVG (viewBox 0-500 x 0-725, pitch rect x=25..425 y=40..684)
    const PITCH_X_MIN = 25 / 500 * 100;   // 5%
    const PITCH_X_MAX = 425 / 500 * 100;   // 85%
    const PITCH_Y_MIN = 40 / 725 * 100;    // 5.52%
    const PITCH_Y_MAX = 684 / 725 * 100;   // 94.34%
    allShots.forEach((shot) => {
        const needsMirror = shot.y >= 50;
        let displayX = shot.x;
        let displayY = shot.y;
        if (needsMirror) {
            displayY = PITCH_Y_MIN + PITCH_Y_MAX - shot.y;
            displayX = PITCH_X_MIN + PITCH_X_MAX - shot.x;
        }
        const isScored = shot.result === 'scored';
        const isGoal = shot.shotFor === 'goal';
        const size = 12;
        const marker = document.createElement('div');
        marker.className = 'analytics-shot-marker';
        marker.style.position = 'absolute';
        marker.style.left = displayX + '%';
        marker.style.top = displayY + '%';
        marker.style.transform = 'translate(-50%, -50%)';
        marker.style.zIndex = '3';
        marker.style.cursor = 'pointer';
        marker.style.width = size + 'px';
        marker.style.height = size + 'px';
        marker.style.background = isScored ? 'white' : '#f44336';
        marker.style.border = '1.5px solid #333';
        marker.style.borderRadius = isGoal ? '0' : '50%';
        wrapper.appendChild(marker);
        attachShotTooltipEvents(marker, [shot], wrapper);
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
function populateDrillFilter() {
    const opts = [
        { value: 'free', label: 'Free Practice' },
        { value: 'scoring-zones', label: 'Scoring Arc' }
    ];
    if (customDrills && customDrills.length > 0) {
        customDrills.forEach(d => {
            opts.push({ value: 'custom-' + d.id, label: d.name });
        });
    }
    setMultiSelectOptions('drillFilter', opts);
}
function applyDrillFilterMulti(allShots) {
    const vals = getMultiSelectValues('drillFilter');
    if (vals === null) return allShots;
    return allShots.filter(s => {
        for (const v of vals) {
            if (v === 'free' && !s.drillKey) return true;
            if (v === 'scoring-zones' && s.drillKey && s.drillKey.startsWith('scoring-zones')) return true;
            if (v !== 'free' && v !== 'scoring-zones' && s.drillKey && s.drillKey === v) return true;
        }
        return false;
    });
}
function renderStatsTable(filteredSessions) {
    const container = document.getElementById('statsTableContainer');
    const heading = document.getElementById('statsTableHeading');
    heading.textContent = currentAnalyticsType === 'match' ? 'Match Breakdown' : 'Session Breakdown';
    if (filteredSessions.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:20px 0;">No sessions to display.</p>';
        return;
    }

    function filterShots(session) {
        let shots = (session.shots || []).map(s => ({...s, matchType: session.matchType, windDirection: session.windDirection || null, windStrength: session.windStrength || null}));
        if (currentAnalyticsType === 'match') shots = msFilterShots(shots, 'matchTypeFilter', 'matchType');
        if (currentAnalyticsType === 'practice') shots = applyDrillFilterMulti(shots);
        shots = msFilterShots(shots, 'shotCategoryFilter', 'shotCategory');
        shots = msFilterShots(shots, 'shotTypeFilter', 'shotType');
        shots = msFilterShots(shots, 'footFilter', 'foot');
        shots = msFilterShots(shots, 'resultFilter', 'result');
        shots = msFilterShots(shots, 'halfFilter', 'half');
        shots = msFilterShots(shots, 'windDirectionFilter', 'windDirection');
        shots = msFilterShots(shots, 'windStrengthFilter', 'windStrength');
        return shots;
    }

    function convCell(scored, total) {
        if (total === 0) return '—';
        return `${scored}/${total} (${Math.round(scored / total * 100)}%)`;
    }

    // Collect all shot types used across all filtered sessions for dynamic sub-columns
    const allShotTypes = new Set();
    const allMissResults = new Set();
    const allMissReasons = new Set();
    const sessionRows = [];

    filteredSessions.forEach(session => {
        const shots = filterShots(session);
        if (shots.length === 0) return; // skip sessions with no matching shots
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

        // Shot type breakdown
        const shotTypeCounts = {};
        shots.forEach(s => {
            const st = s.shotType || 'not-defined';
            allShotTypes.add(st);
            if (!shotTypeCounts[st]) shotTypeCounts[st] = { scored: 0, total: 0 };
            shotTypeCounts[st].total++;
            if (s.result === 'scored') shotTypeCounts[st].scored++;
        });

        // Miss results & reasons
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

        // Drill type for practice
        let drillType = 'Free Practice';
        if (currentAnalyticsType === 'practice') {
            const drillShots = shots.filter(s => s.drillKey);
            if (drillShots.length > 0) {
                const key = drillShots[0].drillKey;
                if (key.startsWith('scoring-zones')) drillType = 'Scoring Arc';
                else if (key.startsWith('custom-')) drillType = 'Custom Drill';
                else drillType = key;
            }
        }

        sessionRows.push({
            session, shots, scored, total, inPlayScored, inPlayTotal: inPlay.length,
            deadBallScored, deadBallTotal: deadBall.length,
            onePtScored, onePtTotal: onePt.length,
            twoPtScored, twoPtTotal: twoPt.length,
            goalsScored, goalsTotal: goals.length,
            shotTypeCounts, missResultCounts, missReasonCounts, comments, drillType
        });
    });

    if (sessionRows.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:20px 0;">No shots match the current filters.</p>';
        return;
    }

    // Determine which fixed columns have data across all rows
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
    lastSessionRows = sessionRows;
    lastTableMeta = { showInPlay, showPlaced, showOnePt, showTwoPt, showGoals, showComments, sortedShotTypes, sortedMissResults, sortedMissReasons, analyticsType: currentAnalyticsType };

    // Build header
    let headerHTML = '<tr>';
    headerHTML += '<th><input type="checkbox" id="statsSelectAll" checked onchange="handleStatsSelectAll(this.checked)"></th>';
    headerHTML += '<th>Date</th>';
    if (currentAnalyticsType === 'match') {
        headerHTML += '<th>Competition</th><th>Opponent</th>';
    } else {
        headerHTML += '<th>Drill Type</th>';
    }
    headerHTML += '<th>Conv.</th>';
    headerHTML += '<th>Pts/Shot <span style="cursor:help;opacity:0.6;" title="Points Per Shot: (1×Pts + 2×2Pts + 3×Goals) ÷ Total Shots">ℹ</span></th>';
    if (showInPlay) headerHTML += '<th>In-Play</th>';
    if (showPlaced) headerHTML += '<th>Placed</th>';
    if (showOnePt) headerHTML += '<th>1 Pt</th>';
    if (showTwoPt) headerHTML += '<th>2 Pt</th>';
    if (showGoals) headerHTML += '<th>Goal</th>';
    sortedShotTypes.forEach(st => {
        headerHTML += `<th>${shotTypeLabels[st] || st}</th>`;
    });
    sortedMissResults.forEach(mr => {
        headerHTML += `<th>${missResultLabels[mr] || mr}</th>`;
    });
    sortedMissReasons.forEach(mr => {
        headerHTML += `<th>${missReasonLabels[mr] || mr}</th>`;
    });
    if (showComments) headerHTML += '<th>Comments</th>';
    headerHTML += '</tr>';

    // Build body rows
    let bodyHTML = '';
    sessionRows.forEach(row => {
        const s = row.session;
        const formattedDate = new Date(s.date).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: '2-digit' });
        bodyHTML += `<tr data-session-id="${String(s.id)}">`;
        bodyHTML += `<td><input type="checkbox" class="session-row-cb" data-session-id="${String(s.id)}" checked onchange="handleSessionCheckboxChange('${String(s.id)}', this.checked)"></td>`;
        bodyHTML += `<td>${formattedDate}</td>`;
        if (currentAnalyticsType === 'match') {
            const comp = s.matchType ? s.matchType.charAt(0).toUpperCase() + s.matchType.slice(1) : '—';
            bodyHTML += `<td>${comp}</td>`;
            bodyHTML += `<td>${s.name || '—'}</td>`;
        } else {
            bodyHTML += `<td>${row.drillType}</td>`;
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

    // Summary row (only if more than 1 session)
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
        bodyHTML += `<td>Totals</td>`;
        const extraCols = currentAnalyticsType === 'match' ? 2 : 1;
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

function updateConversionStats(allShots) {
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
    document.getElementById('analyticsConversionTotal').textContent = `${scored}/${totalShots} (${successRate}%)`;
    document.getElementById('analyticsInPlayConv').textContent = `${inPlayScored}/${inPlayShots.length} (${inPlayRate}%)`;
    document.getElementById('analyticsDeadBallConv').textContent = `${deadBallScored}/${deadBallShots.length} (${deadBallRate}%)`;
    document.getElementById('analyticsOnePointerConv').textContent = `${onePointerScored}/${onePointerShots.length} (${onePointerRate}%)`;
    document.getElementById('analyticsTwoPointerConv').textContent = `${twoPointerScored}/${twoPointerShots.length} (${twoPointerRate}%)`;
    document.getElementById('analyticsGoalConv').textContent = `${goalScored}/${goalShots.length} (${goalRate}%)`;
}

function updateZoneStats(allShots) {
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

function renderShotMapFromShots(shots, wrapperId) {
    hideShotTooltip();
    const wrapper = document.getElementById(wrapperId);
    wrapper.querySelectorAll('.analytics-shot-marker, .shot-tooltip').forEach(m => m.remove());
    const PITCH_X_MIN = 25 / 500 * 100;
    const PITCH_X_MAX = 425 / 500 * 100;
    const PITCH_Y_MIN = 40 / 725 * 100;
    const PITCH_Y_MAX = 684 / 725 * 100;
    shots.forEach(shot => {
        const needsMirror = shot.y >= 50;
        let displayX = shot.x;
        let displayY = shot.y;
        if (needsMirror) {
            displayY = PITCH_Y_MIN + PITCH_Y_MAX - shot.y;
            displayX = PITCH_X_MIN + PITCH_X_MAX - shot.x;
        }
        const isScored = shot.result === 'scored';
        const isGoal = shot.shotFor === 'goal';
        const size = 12;
        const marker = document.createElement('div');
        marker.className = 'analytics-shot-marker';
        marker.style.position = 'absolute';
        marker.style.left = displayX + '%';
        marker.style.top = displayY + '%';
        marker.style.transform = 'translate(-50%, -50%)';
        marker.style.zIndex = '3';
        marker.style.cursor = 'pointer';
        marker.style.width = size + 'px';
        marker.style.height = size + 'px';
        marker.style.background = isScored ? 'white' : '#f44336';
        marker.style.border = '1.5px solid #333';
        marker.style.borderRadius = isGoal ? '0' : '50%';
        wrapper.appendChild(marker);
        attachShotTooltipEvents(marker, [shot], wrapper);
    });
}

function handleSessionCheckboxChange(sessionId, isChecked) {
    const id = String(sessionId);
    if (isChecked) {
        uncheckedSessionIds.delete(id);
    } else {
        uncheckedSessionIds.add(id);
    }
    updateAnalyticsFromCheckboxes();
    // Update select-all checkbox state
    const selectAll = document.getElementById('statsSelectAll');
    if (selectAll) {
        const total = lastSessionRows.length;
        const uncheckedCount = uncheckedSessionIds.size;
        selectAll.checked = uncheckedCount === 0;
        selectAll.indeterminate = uncheckedCount > 0 && uncheckedCount < total;
    }
}

function handleStatsSelectAll(isChecked) {
    uncheckedSessionIds.clear();
    if (!isChecked) {
        lastSessionRows.forEach(r => uncheckedSessionIds.add(String(r.session.id)));
    }
    // Update all row checkboxes
    document.querySelectorAll('#statsTableContainer .session-row-cb').forEach(cb => {
        cb.checked = isChecked;
    });
    updateAnalyticsFromCheckboxes();
}

function updateAnalyticsFromCheckboxes() {
    const checkedShots = lastFilteredAllShots.filter(s => !uncheckedSessionIds.has(String(s.sessionId)));
    updateConversionStats(checkedShots);
    renderShotMapFromShots(checkedShots, 'analyticsPitchWrapper');
    updateZoneStats(checkedShots);
    // Update session count
    const checkedCount = lastSessionRows.filter(r => !uncheckedSessionIds.has(String(r.session.id))).length;
    document.getElementById('totalSessions').textContent = checkedCount;
    // Update summary row
    updateSummaryRow(lastSessionRows, uncheckedSessionIds, 'statsTableContainer', lastTableMeta);
    // Apply visual styling to unchecked rows
    document.querySelectorAll('#statsTableContainer tbody tr[data-session-id]').forEach(tr => {
        const sid = tr.getAttribute('data-session-id');
        tr.classList.toggle('session-unchecked', uncheckedSessionIds.has(sid));
    });
}

function updateSummaryRow(sessionRows, uncheckedIds, containerId, meta) {
    const container = document.getElementById(containerId);
    const existingSummary = container.querySelector('.stats-table-summary');
    const checkedRows = sessionRows.filter(r => !uncheckedIds.has(String(r.session.id)));
    // Hide summary if < 2 checked sessions
    if (checkedRows.length < 2) {
        if (existingSummary) existingSummary.style.display = 'none';
        return;
    }
    if (existingSummary) existingSummary.style.display = '';

    function convCell(scored, total) {
        if (total === 0) return '—';
        return `${scored}/${total} (${Math.round(scored / total * 100)}%)`;
    }

    const totScored = checkedRows.reduce((a, r) => a + r.scored, 0);
    const totTotal = checkedRows.reduce((a, r) => a + r.total, 0);
    const totIP_S = checkedRows.reduce((a, r) => a + r.inPlayScored, 0);
    const totIP_T = checkedRows.reduce((a, r) => a + r.inPlayTotal, 0);
    const totDB_S = checkedRows.reduce((a, r) => a + r.deadBallScored, 0);
    const totDB_T = checkedRows.reduce((a, r) => a + r.deadBallTotal, 0);
    const tot1_S = checkedRows.reduce((a, r) => a + r.onePtScored, 0);
    const tot1_T = checkedRows.reduce((a, r) => a + r.onePtTotal, 0);
    const tot2_S = checkedRows.reduce((a, r) => a + r.twoPtScored, 0);
    const tot2_T = checkedRows.reduce((a, r) => a + r.twoPtTotal, 0);
    const totG_S = checkedRows.reduce((a, r) => a + r.goalsScored, 0);
    const totG_T = checkedRows.reduce((a, r) => a + r.goalsTotal, 0);

    let html = '<td></td>'; // checkbox column
    html += '<td>Totals</td>';
    const analyticsType = meta.analyticsType || 'practice';
    const extraCols = analyticsType === 'match' ? 2 : 1;
    for (let i = 0; i < extraCols; i++) html += '<td></td>';
    html += `<td>${convCell(totScored, totTotal)}</td>`;
    const totPtsPerShot = totTotal > 0 ? ((tot1_S * 1 + tot2_S * 2 + totG_S * 3) / totTotal).toFixed(2) : '0.00';
    html += `<td>${totPtsPerShot}</td>`;
    if (meta.showInPlay) html += `<td>${convCell(totIP_S, totIP_T)}</td>`;
    if (meta.showPlaced) html += `<td>${convCell(totDB_S, totDB_T)}</td>`;
    if (meta.showOnePt) html += `<td>${convCell(tot1_S, tot1_T)}</td>`;
    if (meta.showTwoPt) html += `<td>${convCell(tot2_S, tot2_T)}</td>`;
    if (meta.showGoals) html += `<td>${convCell(totG_S, totG_T)}</td>`;
    (meta.sortedShotTypes || []).forEach(st => {
        const s = checkedRows.reduce((a, r) => a + (r.shotTypeCounts[st] ? r.shotTypeCounts[st].scored : 0), 0);
        const t = checkedRows.reduce((a, r) => a + (r.shotTypeCounts[st] ? r.shotTypeCounts[st].total : 0), 0);
        html += `<td>${t > 0 ? convCell(s, t) : '—'}</td>`;
    });
    (meta.sortedMissResults || []).forEach(mr => {
        const count = checkedRows.reduce((a, r) => a + (r.missResultCounts[mr] || 0), 0);
        html += `<td>${count || '—'}</td>`;
    });
    (meta.sortedMissReasons || []).forEach(mr => {
        const count = checkedRows.reduce((a, r) => a + (r.missReasonCounts[mr] || 0), 0);
        html += `<td>${count || '—'}</td>`;
    });
    if (meta.showComments) html += '<td></td>';
    if (existingSummary) existingSummary.innerHTML = html;
}

function handleWindDirectionFilterChange() {
    applyAnalyticsFilters();
}

function initAnalyticsMultiSelects() {
    const onChange = applyAnalyticsFilters;
    initMultiSelect('matchTypeFilter', [
        { value: 'league', label: 'League' },
        { value: 'championship', label: 'Championship' },
        { value: 'challenge', label: 'Challenge' }
    ], onChange);
    initMultiSelect('drillFilter', [
        { value: 'free', label: 'Free Practice' },
        { value: 'scoring-zones', label: 'Scoring Arc' }
    ], onChange);
    initMultiSelect('shotCategoryFilter', _shotCategoryOptions(), onChange);
    initMultiSelect('shotTypeFilter', _shotTypeOptions(), onChange);
    initMultiSelect('footFilter', _footOptions(), onChange);
    initMultiSelect('resultFilter', _resultOptions(), onChange);
    initMultiSelect('halfFilter', _halfOptions(), onChange);
    initMultiSelect('windDirectionFilter', _windDirectionOptions(), onChange);
    initMultiSelect('windStrengthFilter', _windStrengthOptions(), onChange);
}

initAnalyticsMultiSelects();
