function loadDashboardData() {
    let totalSessions = sessions.length;
    let totalShots = 0;
    let totalScored = 0;
    sessions.forEach(session => {
        if (session.shots) {
            session.shots.forEach(shot => {
                totalShots += shot.count || 1;
                totalScored += shot.scored || (shot.result === 'scored' ? 1 : 0);
            });
        }
    });
    const accuracy = totalShots > 0 ? Math.round((totalScored / totalShots) * 100) : 0;
    initSessionCarousel();
}
function getDashboardSessions() {
    return sessions.filter(s => s.type === currentDashboardType && s.shots && s.shots.length > 0);
}
function switchDashboardType(type) {
    currentDashboardType = type;
    document.getElementById('dashboardPracticeTab').classList.toggle('active', type === 'practice');
    document.getElementById('dashboardMatchTab').classList.toggle('active', type === 'match');
    initSessionCarousel();
}
function initSessionCarousel() {
    const filteredSessions = getDashboardSessions();
    const numSessions = Math.min(filteredSessions.length, maxCarouselSessions);
    const indicatorsContainer = document.getElementById('carouselIndicators');
    indicatorsContainer.innerHTML = '';
    for (let i = 0; i < numSessions; i++) {
        const dot = document.createElement('span');
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.onclick = () => goToCarouselSession(i);
        indicatorsContainer.appendChild(dot);
    }
    currentCarouselIndex = 0;
    updateCarouselButtons();
    drawCarouselSession(0);
}
function changeCarouselSession(direction) {
    const filteredSessions = getDashboardSessions();
    const numSessions = Math.min(filteredSessions.length, maxCarouselSessions);
    const newIndex = currentCarouselIndex + direction;
    if (newIndex >= 0 && newIndex < numSessions) {
        goToCarouselSession(newIndex);
    }
}
function goToCarouselSession(index) {
    currentCarouselIndex = index;
    document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
    updateCarouselButtons();
    drawCarouselSession(index);
}
function updateCarouselButtons() {
    const filteredSessions = getDashboardSessions();
    const numSessions = Math.min(filteredSessions.length, maxCarouselSessions);
    const prevBtn = document.getElementById('carouselPrev');
    const nextBtn = document.getElementById('carouselNext');
    if (prevBtn) prevBtn.disabled = currentCarouselIndex === 0;
    if (nextBtn) nextBtn.disabled = currentCarouselIndex >= numSessions - 1 || numSessions === 0;
}
function drawCarouselSession(index) {
    const svg = document.getElementById('dashboardPitch');
    if (!svg) return;
    svg.innerHTML = `
        <rect width="500" height="725" fill="#3a8f4a"/>
        <rect x="25" y="40" width="400" height="644" fill="none" stroke="white" stroke-width="3"/>
        <line x1="25" y1="362" x2="425" y2="362" stroke="white" stroke-width="2.5" stroke-dasharray="10,5"/>
        <line x1="25" y1="98" x2="425" y2="98" stroke="white" stroke-width="1"/>
        <rect x="175" y="40" width="100" height="58" fill="none" stroke="white" stroke-width="1"/>
        <line x1="25" y1="129" x2="425" y2="129" stroke="white" stroke-width="1"/>
        <path d="M 71 129 A 178 178 0 0 0 379 129" fill="none" stroke="white" stroke-width="1"/>
        <path d="M 167 129 A 58 58 0 0 0 283 129" fill="none" stroke="white" stroke-width="1"/>
        <circle cx="225" cy="89" r="3" fill="white"/>
        <line x1="25" y1="240" x2="425" y2="240" stroke="white" stroke-width="1"/>
        <line x1="25" y1="329" x2="425" y2="329" stroke="white" stroke-width="1"/>
        <line x1="25" y1="395" x2="425" y2="395" stroke="white" stroke-width="1"/>
        <line x1="25" y1="484" x2="425" y2="484" stroke="white" stroke-width="1"/>
        <path d="M 167 595 A 58 58 0 0 1 283 595" fill="none" stroke="white" stroke-width="1"/>
        <path d="M 71 595 A 178 178 0 0 1 379 595" fill="none" stroke="white" stroke-width="1"/>
        <line x1="25" y1="595" x2="425" y2="595" stroke="white" stroke-width="1"/>
        <line x1="25" y1="626" x2="425" y2="626" stroke="white" stroke-width="1"/>
        <rect x="175" y="626" width="100" height="58" fill="none" stroke="white" stroke-width="1"/>
        <circle cx="225" cy="635" r="3" fill="white"/>
        <line x1="195" y1="40" x2="255" y2="40" stroke="#FFD700" stroke-width="5" stroke-linecap="round"/>
        <line x1="195" y1="684" x2="255" y2="684" stroke="#FFD700" stroke-width="5" stroke-linecap="round"/>
        <circle cx="195" cy="40" r="3" fill="white"/>
        <circle cx="255" cy="40" r="3" fill="white"/>
        <circle cx="195" cy="684" r="3" fill="white"/>
        <circle cx="255" cy="684" r="3" fill="white"/>
    `;
    const filteredSessions = getDashboardSessions();
    if (filteredSessions.length === 0 || index >= filteredSessions.length) {
        document.getElementById('recentSessionNoStats').style.display = 'block';
        document.getElementById('recentSessionScoreStats').style.display = 'none';
        document.getElementById('recentSessionTitleNoStats').textContent = currentDashboardType === 'practice' ? 'No practice sessions yet' : 'No match sessions yet';
        document.getElementById('recentSessionDateNoStats').textContent = 'Start tracking to see your shots here!';
        return;
    }
    const session = filteredSessions[index];
    const sessionType = session.type || 'practice';
    const matchType = session.matchType || '';
    const capitalizedMatchType = matchType ? matchType.charAt(0).toUpperCase() + matchType.slice(1) : '';
    let sessionTitle = '';
    const typeIcon = sessionType === 'match' ? '⚽' : '🏋️';
    if (sessionType === 'match' && capitalizedMatchType) {
        sessionTitle = `${typeIcon} ${capitalizedMatchType} - ${session.name || 'Match'}`;
    } else {
        sessionTitle = `${typeIcon} ${session.name || (sessionType === 'match' ? 'Match' : 'Practice')}`;
    }
    const date = new Date(session.date).toLocaleDateString('en-IE', { 
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' 
    });
    const shots = session.shots || [];
    let goals = 0, goalsFromFree = 0;
    let points = 0, pointsFromFree = 0;
    let twoPointers = 0, twoPointersFromFree = 0;
    let rightScored = 0, rightTotal = 0;
    let leftScored = 0, leftTotal = 0;
    let totalScored = 0, totalShots = shots.length;
    shots.forEach(shot => {
        const isScored = shot.result === 'scored';
        const isFree = shot.shotCategory === 'free-kick' || shot.shotCategory === '45';
        const pointValue = shot.pointValue || 1;
        const foot = shot.foot || 'right';
        if (isScored) {
            totalScored++;
            if (pointValue === 3) {
                goals++;
                if (isFree) goalsFromFree++;
            } else if (pointValue === 2) {
                twoPointers++;
                if (isFree) twoPointersFromFree++;
            } else {
                points++;
                if (isFree) pointsFromFree++;
            }
        }
        if (foot === 'right') {
            rightTotal++;
            if (isScored) rightScored++;
        } else {
            leftTotal++;
            if (isScored) leftScored++;
        }
    });
    const totalPoints = points + twoPointers * 2;
    const scoreDisplay = `${goals}-${String(totalPoints).padStart(2, '0')}`;
    let breakdownParts = [];
    if (pointsFromFree > 0) breakdownParts.push(`${pointsFromFree}f`);
    if (twoPointers > 0) {
        const twoPointerStr = twoPointersFromFree > 0 && twoPointersFromFree < twoPointers 
            ? `${twoPointers} 2p (${twoPointersFromFree}f)` 
            : twoPointersFromFree === twoPointers 
                ? `${twoPointers} 2pf` 
                : `${twoPointers} 2p`;
        breakdownParts.push(twoPointerStr);
    }
    if (goalsFromFree > 0) breakdownParts.push(`${goalsFromFree} pen`);
    const breakdownStr = breakdownParts.length > 0 ? `(${breakdownParts.join(', ')})` : '';
    document.getElementById('recentSessionNoStats').style.display = 'none';
    document.getElementById('recentSessionScoreStats').style.display = 'flex';
    document.getElementById('recentSessionTitle').textContent = sessionTitle;
    document.getElementById('recentSessionDate').textContent = date;
    const conversionRate = totalShots > 0 ? Math.round((totalScored / totalShots) * 100) : 0;
    if (sessionType === 'practice') {
        document.getElementById('recentSessionScore').textContent = `${totalScored}/${totalShots} (${conversionRate}%)`;
        document.getElementById('recentSessionConversion').innerHTML = '';
    } else {
        document.getElementById('recentSessionScore').textContent = `${scoreDisplay} ${breakdownStr}`;
        document.getElementById('recentSessionConversion').innerHTML = 
            `Conversion: ${totalScored}/${totalShots} (${conversionRate}%)`;
    }
    const rightRate = rightTotal > 0 ? Math.round((rightScored / rightTotal) * 100) : 0;
    const leftRate = leftTotal > 0 ? Math.round((leftScored / leftTotal) * 100) : 0;
    document.getElementById('recentSessionFoot').innerHTML = 
        `Right ${rightScored}/${rightTotal} (${rightRate}%)` + 
        (leftTotal > 0 ? ` • Left ${leftScored}/${leftTotal} (${leftRate}%)` : '');
    if (session.shots && session.shots.length > 0) {
        // For match sessions, add half indicators to show which end was attacked in each half
        if (sessionType === 'match') {
            const halfInfo = getHalfEndInfo(session.shots);
            if (halfInfo.topLabel || halfInfo.bottomLabel) {
                if (halfInfo.topLabel) {
                    svg.innerHTML += `
                        <rect x="170" y="14" width="60" height="18" rx="4" fill="rgba(0,0,0,0.6)"/>
                        <text x="200" y="27" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${halfInfo.topLabel}</text>
                    `;
                }
                if (halfInfo.bottomLabel) {
                    svg.innerHTML += `
                        <rect x="170" y="694" width="60" height="18" rx="4" fill="rgba(0,0,0,0.6)"/>
                        <text x="200" y="707" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${halfInfo.bottomLabel}</text>
                    `;
                }
            }
        }
        const locationMap = new Map();
        session.shots.forEach(shot => {
            const key = `${Math.round(shot.x)}-${Math.round(shot.y)}`;
            if (!locationMap.has(key)) {
                locationMap.set(key, { 
                    x: shot.x, 
                    y: shot.y, 
                    scored: 0, 
                    total: 0 
                });
            }
            const loc = locationMap.get(key);
            loc.total++;
            if (shot.result === 'scored') loc.scored++;
        });
        locationMap.forEach(loc => {
            const x = (loc.x / 100) * 500;
            const y = (loc.y / 100) * 725;
            if (loc.total > 1) {
                let fillColor;
                if (loc.scored === loc.total) {
                    fillColor = 'white';
                } else if (loc.scored === 0) {
                    fillColor = '#dc3545';
                } else {
                    fillColor = '#ffc107';
                }
                svg.innerHTML += `<circle cx="${x}" cy="${y}" r="8" fill="${fillColor}" stroke="#333" stroke-width="2"/>`;
                svg.innerHTML += `
                    <rect x="${x - 12}" y="${y + 12}" width="24" height="14" fill="rgba(0,0,0,0.7)" rx="3"/>
                    <text x="${x}" y="${y + 23}" text-anchor="middle" fill="white" font-size="9" font-weight="bold">${loc.scored}/${loc.total}</text>
                `;
            } else {
                const color = loc.scored === 1 ? 'white' : '#dc3545';
                svg.innerHTML += `<circle cx="${x}" cy="${y}" r="6" fill="${color}" stroke="#333" stroke-width="2"/>`;
            }
        });
    }
}
