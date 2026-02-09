// Trends View - Line charts for conversion rate and scoring trends over time
let trendsViewActive = false;
let pdTrendsViewActive = false;
let selectedTrendsDrillKey = null;
let pdSelectedTrendsDrillKey = null;

function toggleTrendsView(prefix) {
    if (prefix === 'pd-') {
        pdTrendsViewActive = !pdTrendsViewActive;
        updateTrendsToggleUI(prefix);
        updateTrendsVisibility(prefix);
        if (pdTrendsViewActive) {
            displayPlayerDataAnalytics();
        }
    } else {
        trendsViewActive = !trendsViewActive;
        updateTrendsToggleUI(prefix);
        updateTrendsVisibility(prefix);
        if (trendsViewActive) {
            displayAnalytics();
        }
    }
}

function updateTrendsToggleUI(prefix) {
    const active = prefix === 'pd-' ? pdTrendsViewActive : trendsViewActive;
    const statsBtn = document.getElementById(prefix + 'trendsStatsBtn');
    const trendsBtn = document.getElementById(prefix + 'trendsTrendsBtn');
    if (statsBtn) statsBtn.classList.toggle('active', !active);
    if (trendsBtn) trendsBtn.classList.toggle('active', active);
}

function updateTrendsVisibility(prefix) {
    const active = prefix === 'pd-' ? pdTrendsViewActive : trendsViewActive;
    const trendsContainer = document.getElementById(prefix + 'trendsContainer');
    const breakdownCard = document.getElementById(prefix + 'statsBreakdownCard');
    const shotMapCard = document.getElementById(prefix + 'statsShotMapCard');
    const zoneCard = document.getElementById(prefix + 'statsZoneCard');

    if (trendsContainer) trendsContainer.style.display = active ? 'block' : 'none';
    if (breakdownCard) breakdownCard.style.display = active ? 'none' : '';
    if (shotMapCard) shotMapCard.style.display = active ? 'none' : '';
    if (zoneCard) zoneCard.style.display = active ? 'none' : '';
}

function renderTrendsContent(prefix, filteredSessions, allShots, analyticsType) {
    const container = document.getElementById(prefix + 'trendsContainer');
    if (!container) return;

    if (analyticsType === 'match') {
        // Hide drill selector, show pts/shot card
        const drillSel = document.getElementById(prefix + 'trendsDrillSelector');
        if (drillSel) drillSel.style.display = 'none';
        const ptsCard = document.getElementById(prefix + 'trendsPtsPerShotCard');
        if (ptsCard) ptsCard.style.display = '';
        const chartTitle = document.getElementById(prefix + 'trendsChartTitle');
        if (chartTitle) chartTitle.textContent = 'Conversion Rate Trend';

        const data = buildMatchDataPoints(filteredSessions, allShots);
        if (data.conversionPoints.length < 2) {
            document.getElementById(prefix + 'trendsConversionChart').innerHTML =
                '<div class="trends-min-sessions-msg">Play at least 2 matches to see trends.</div>';
            document.getElementById(prefix + 'trendsPtsPerShotChart').innerHTML = '';
            document.getElementById(prefix + 'trendsProgressSummary').innerHTML = '';
            return;
        }
        renderTrendChart(prefix + 'trendsConversionChart', data.conversionPoints, {
            valueKey: 'rate', suffix: '%', label: 'Conversion'
        });
        renderTrendChart(prefix + 'trendsPtsPerShotChart', data.ptsPerShotPoints, {
            valueKey: 'ptsPerShot', suffix: '', label: 'Pts/Shot', decimals: 2
        });
        renderProgressSummary(prefix + 'trendsProgressSummary', data.conversionPoints, data.ptsPerShotPoints);
    } else {
        // Practice mode - show drill selector
        const ptsCard = document.getElementById(prefix + 'trendsPtsPerShotCard');
        if (ptsCard) ptsCard.style.display = 'none';
        const chartTitle = document.getElementById(prefix + 'trendsChartTitle');
        if (chartTitle) chartTitle.textContent = 'Drill Conversion Trend';

        renderDrillSelector(prefix, filteredSessions);
        const drillKey = prefix === 'pd-' ? pdSelectedTrendsDrillKey : selectedTrendsDrillKey;
        if (!drillKey) {
            document.getElementById(prefix + 'trendsConversionChart').innerHTML =
                '<div class="trends-min-sessions-msg">Select a drill above to see trends.</div>';
            document.getElementById(prefix + 'trendsProgressSummary').innerHTML = '';
            return;
        }
        const data = buildPracticeDrillDataPoints(filteredSessions, drillKey);
        if (data.conversionPoints.length < 2) {
            document.getElementById(prefix + 'trendsConversionChart').innerHTML =
                '<div class="trends-min-sessions-msg">Complete this drill at least twice to see trends.</div>';
            document.getElementById(prefix + 'trendsProgressSummary').innerHTML = '';
            return;
        }
        renderTrendChart(prefix + 'trendsConversionChart', data.conversionPoints, {
            valueKey: 'rate', suffix: '%', label: 'Conversion'
        });
        renderProgressSummary(prefix + 'trendsProgressSummary', data.conversionPoints, null);
    }
}

function buildMatchDataPoints(filteredSessions, allShots) {
    // Group shots by session
    const shotsBySession = {};
    allShots.forEach(s => {
        if (!shotsBySession[s.sessionId]) shotsBySession[s.sessionId] = [];
        shotsBySession[s.sessionId].push(s);
    });

    const conversionPoints = [];
    const ptsPerShotPoints = [];

    // Sort sessions chronologically
    const sorted = [...filteredSessions].sort((a, b) => {
        const da = a.date.split('-'), db = b.date.split('-');
        return new Date(da[0], da[1]-1, da[2]) - new Date(db[0], db[1]-1, db[2]);
    });

    sorted.forEach(session => {
        const shots = shotsBySession[session.id];
        if (!shots || shots.length === 0) return;
        const scored = shots.filter(s => s.result === 'scored').length;
        const total = shots.length;
        const rate = Math.round((scored / total) * 100);
        const onePt = shots.filter(s => (s.pointValue === 1 || !s.pointValue) && s.shotFor !== 'goal' && s.result === 'scored').length;
        const twoPt = shots.filter(s => s.pointValue === 2 && s.shotFor !== 'goal' && s.result === 'scored').length;
        const goals = shots.filter(s => s.shotFor === 'goal' && s.result === 'scored').length;
        const ptsPerShot = total > 0 ? (onePt * 1 + twoPt * 2 + goals * 3) / total : 0;

        const label = session.name || session.matchType || 'Match';
        const dateStr = formatTrendDate(session.date);

        conversionPoints.push({ date: session.date, dateStr, label, scored, total, rate });
        ptsPerShotPoints.push({ date: session.date, dateStr, label, ptsPerShot: parseFloat(ptsPerShot.toFixed(2)), scored, total });
    });

    return { conversionPoints, ptsPerShotPoints };
}

function buildPracticeDrillDataPoints(filteredSessions, drillKey) {
    const conversionPoints = [];

    const sorted = [...filteredSessions].sort((a, b) => {
        const da = a.date.split('-'), db = b.date.split('-');
        return new Date(da[0], da[1]-1, da[2]) - new Date(db[0], db[1]-1, db[2]);
    });

    sorted.forEach(session => {
        const matchingShots = (session.shots || []).filter(s => s.drillKey === drillKey);
        if (matchingShots.length === 0) return;
        const scored = matchingShots.filter(s => s.result === 'scored').length;
        const total = matchingShots.length;
        const rate = Math.round((scored / total) * 100);
        const dateStr = formatTrendDate(session.date);
        const label = session.name || 'Practice';
        conversionPoints.push({ date: session.date, dateStr, label, scored, total, rate });
    });

    return { conversionPoints };
}

function getUniqueDrillKeys(filteredSessions) {
    const keys = new Map();
    filteredSessions.forEach(session => {
        (session.shots || []).forEach(shot => {
            if (shot.drillKey && !keys.has(shot.drillKey)) {
                keys.set(shot.drillKey, parseDrillKeyLabel(shot.drillKey));
            }
        });
    });
    return [...keys.entries()].map(([key, label]) => ({ key, label }));
}

function parseDrillKeyLabel(drillKey) {
    if (!drillKey) return 'Free Practice';

    // Custom drill: "custom-<id>" or just the key itself
    if (drillKey.startsWith('custom-')) {
        const customId = drillKey.replace('custom-', '');
        if (typeof customDrills !== 'undefined') {
            const drill = customDrills.find(d => String(d.id) === customId || 'custom-' + d.id === drillKey);
            if (drill) return drill.name;
        }
        return 'Custom Drill';
    }

    // Scoring zones: "scoring-zones-20-standing-right-20"
    if (drillKey.startsWith('scoring-zones')) {
        const parts = drillKey.split('-');
        // scoring-zones-{distance}-{shotType}-{foot}-{totalShots}
        // parts: ['scoring', 'zones', '20', 'standing', 'right', '20']
        // But shotType can have hyphens like 'on-the-run', 'free-kick'
        // The format is: scoring-zones-{distance}-{shotType}-{foot}-{totalShots}
        // foot is always 'right', 'left', or 'both' and totalShots is a number at the end
        const totalShots = parts[parts.length - 1];
        const foot = parts[parts.length - 2];
        const distance = parts[2];
        const shotTypeParts = parts.slice(3, parts.length - 2);
        const shotType = shotTypeParts.join('-');

        const shotTypeLabels = {
            'standing': 'Standing', 'free-kick': 'Free-Kick', 'on-the-run': 'On the Run',
            'on-the-turn': 'On the Turn', 'outside-of-the-boot': 'Outside Boot',
            'off-a-dummy': 'Off a Dummy', 'fisted': 'Fisted', 'not-defined': 'Not Defined'
        };
        const footLabels = { 'right': 'Right', 'left': 'Left', 'both': 'Both Feet' };

        return `Scoring Arc - ${distance}m, ${shotTypeLabels[shotType] || shotType}, ${footLabels[foot] || foot}, ${totalShots} shots`;
    }

    return drillKey;
}

function renderDrillSelector(prefix, filteredSessions) {
    const container = document.getElementById(prefix + 'trendsDrillSelector');
    if (!container) return;
    container.style.display = 'block';

    const drills = getUniqueDrillKeys(filteredSessions);
    const currentKey = prefix === 'pd-' ? pdSelectedTrendsDrillKey : selectedTrendsDrillKey;

    let html = '<div class="trends-drill-selector">';
    html += '<label>Drill:</label>';
    html += `<select onchange="handleTrendsDrillChange('${prefix}', this.value)">`;
    html += '<option value="">Select a drill...</option>';
    drills.forEach(d => {
        const selected = d.key === currentKey ? ' selected' : '';
        html += `<option value="${d.key}"${selected}>${d.label}</option>`;
    });
    html += '</select></div>';
    container.innerHTML = html;
}

function handleTrendsDrillChange(prefix, value) {
    if (prefix === 'pd-') {
        pdSelectedTrendsDrillKey = value || null;
        displayPlayerDataAnalytics();
    } else {
        selectedTrendsDrillKey = value || null;
        displayAnalytics();
    }
}

function renderTrendChart(containerId, dataPoints, options) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const { valueKey, suffix, label, decimals } = options;
    const W = 800, H = 400;
    const PAD = { left: 65, right: 30, top: 30, bottom: 80 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;

    const values = dataPoints.map(p => typeof p[valueKey] === 'number' ? p[valueKey] : 0);
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    // Add some padding to the range
    const range = maxVal - minVal;
    if (range === 0) {
        minVal = Math.max(0, minVal - 10);
        maxVal = maxVal + 10;
    } else {
        minVal = Math.max(0, minVal - range * 0.1);
        maxVal = maxVal + range * 0.1;
    }

    // Calculate average
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    function xPos(i) {
        if (dataPoints.length === 1) return PAD.left + chartW / 2;
        return PAD.left + (i / (dataPoints.length - 1)) * chartW;
    }
    function yPos(val) {
        return PAD.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
    }

    let svg = `<svg class="trend-chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">`;

    // Grid lines
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
        const val = minVal + (i / gridLines) * (maxVal - minVal);
        const y = yPos(val);
        svg += `<line x1="${PAD.left}" y1="${y}" x2="${W - PAD.right}" y2="${y}" stroke="#eee" stroke-width="1"/>`;
        const displayVal = decimals != null ? val.toFixed(decimals) : Math.round(val);
        svg += `<text x="${PAD.left - 8}" y="${y + 4}" text-anchor="end" fill="#999" font-size="11">${displayVal}${suffix}</text>`;
    }

    // Average line (dashed)
    const avgY = yPos(avg);
    svg += `<line x1="${PAD.left}" y1="${avgY}" x2="${W - PAD.right}" y2="${avgY}" stroke="#999" stroke-width="1.5" stroke-dasharray="6,4"/>`;
    const avgLabel = decimals != null ? avg.toFixed(decimals) : Math.round(avg);
    svg += `<text x="${W - PAD.right + 4}" y="${avgY + 4}" fill="#999" font-size="10">avg ${avgLabel}${suffix}</text>`;

    // Trend polyline
    if (dataPoints.length > 1) {
        const points = dataPoints.map((p, i) => `${xPos(i)},${yPos(values[i])}`).join(' ');
        svg += `<polyline points="${points}" fill="none" stroke="#4CAF50" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    }

    // Data points + labels
    dataPoints.forEach((p, i) => {
        const x = xPos(i);
        const y = yPos(values[i]);
        const displayVal = decimals != null ? values[i].toFixed(decimals) : Math.round(values[i]);

        // Value label above point
        svg += `<text x="${x}" y="${y - 12}" text-anchor="middle" fill="#333" font-size="11" font-weight="600">${displayVal}${suffix}</text>`;

        // Visible circle
        svg += `<circle cx="${x}" cy="${y}" r="5" fill="white" stroke="#4CAF50" stroke-width="2"/>`;

        // Transparent hit area for hover/touch
        const escaped = JSON.stringify(p).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        svg += `<circle cx="${x}" cy="${y}" r="20" fill="transparent" stroke="none" class="trend-hit-area" data-index="${i}" data-container="${containerId}"`;
        svg += ` onmouseenter="showTrendTooltip(event, ${i}, '${containerId}')"`;
        svg += ` onmouseleave="hideTrendTooltip()"`;
        svg += ` ontouchstart="showTrendTooltip(event, ${i}, '${containerId}')"`;
        svg += `/>`;
    });

    // X-axis labels
    const rotateLabels = dataPoints.length > 6;
    dataPoints.forEach((p, i) => {
        const x = xPos(i);
        const y = H - PAD.bottom + 18;
        if (rotateLabels) {
            svg += `<text x="${x}" y="${y}" text-anchor="end" fill="#666" font-size="10" transform="rotate(-45, ${x}, ${y})">${p.dateStr}</text>`;
        } else {
            svg += `<text x="${x}" y="${y}" text-anchor="middle" fill="#666" font-size="11">${p.dateStr}</text>`;
        }
    });

    svg += '</svg>';
    container.innerHTML = svg;

    // Store data points on container for tooltip access
    container._trendData = dataPoints;
}

function renderProgressSummary(containerId, convPoints, ptsPoints) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!convPoints || convPoints.length < 2) {
        container.innerHTML = '';
        return;
    }

    const first = convPoints[0];
    const last = convPoints[convPoints.length - 1];
    const change = last.rate - first.rate;
    const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : '';
    const changeStr = (change > 0 ? '+' : '') + change + '%';

    const avgRate = Math.round(convPoints.reduce((a, p) => a + p.rate, 0) / convPoints.length);
    const bestRate = Math.max(...convPoints.map(p => p.rate));
    const worstRate = Math.min(...convPoints.map(p => p.rate));

    // Last 3 vs prior average
    let recentTrend = '';
    if (convPoints.length >= 4) {
        const last3 = convPoints.slice(-3);
        const prior = convPoints.slice(0, -3);
        const last3Avg = Math.round(last3.reduce((a, p) => a + p.rate, 0) / last3.length);
        const priorAvg = Math.round(prior.reduce((a, p) => a + p.rate, 0) / prior.length);
        const diff = last3Avg - priorAvg;
        const diffClass = diff > 0 ? 'positive' : diff < 0 ? 'negative' : '';
        recentTrend = `
            <div class="trends-summary-row">
                <span class="ts-label">Last 3 vs Prior Avg</span>
                <span class="ts-value ${diffClass}">${last3Avg}% vs ${priorAvg}% (${diff > 0 ? '+' : ''}${diff}%)</span>
            </div>`;
    }

    let ptsHtml = '';
    if (ptsPoints && ptsPoints.length >= 2) {
        const ptsFirst = ptsPoints[0].ptsPerShot;
        const ptsLast = ptsPoints[ptsPoints.length - 1].ptsPerShot;
        const ptsChange = (ptsLast - ptsFirst).toFixed(2);
        const ptsChangeClass = ptsChange > 0 ? 'positive' : ptsChange < 0 ? 'negative' : '';
        const ptsAvg = (ptsPoints.reduce((a, p) => a + p.ptsPerShot, 0) / ptsPoints.length).toFixed(2);
        ptsHtml = `
            <div class="trends-summary-row">
                <span class="ts-label">Pts/Shot (First &rarr; Last)</span>
                <span class="ts-value ${ptsChangeClass}">${ptsFirst.toFixed(2)} &rarr; ${ptsLast.toFixed(2)} (${ptsChange > 0 ? '+' : ''}${ptsChange})</span>
            </div>
            <div class="trends-summary-row">
                <span class="ts-label">Avg Pts/Shot</span>
                <span class="ts-value">${ptsAvg}</span>
            </div>`;
    }

    container.innerHTML = `
        <div class="trends-progress-summary">
            <h3>Progress Summary</h3>
            <div class="trends-summary-row">
                <span class="ts-label">Conversion (First &rarr; Last)</span>
                <span class="ts-value ${changeClass}">${first.rate}% &rarr; ${last.rate}% (${changeStr})</span>
            </div>
            <div class="trends-summary-row">
                <span class="ts-label">Average Conversion</span>
                <span class="ts-value">${avgRate}%</span>
            </div>
            <div class="trends-summary-row">
                <span class="ts-label">Best / Worst</span>
                <span class="ts-value">${bestRate}% / ${worstRate}%</span>
            </div>
            ${recentTrend}
            ${ptsHtml}
        </div>`;
}

function showTrendTooltip(event, index, containerId) {
    hideTrendTooltip();
    const container = document.getElementById(containerId);
    if (!container || !container._trendData) return;
    const point = container._trendData[index];
    if (!point) return;

    const tooltip = document.createElement('div');
    tooltip.className = 'trend-tooltip';
    tooltip.id = 'activeTrendTooltip';

    let html = `<div class="tt-title">${point.label}</div>`;
    html += `<div class="tt-row"><span class="tt-label">Date</span><span class="tt-value">${point.dateStr}</span></div>`;
    html += `<div class="tt-row"><span class="tt-label">Scored</span><span class="tt-value">${point.scored}/${point.total}</span></div>`;
    html += `<div class="tt-row"><span class="tt-label">Rate</span><span class="tt-value">${point.rate}%</span></div>`;
    if (point.ptsPerShot !== undefined) {
        html += `<div class="tt-row"><span class="tt-label">Pts/Shot</span><span class="tt-value">${point.ptsPerShot.toFixed(2)}</span></div>`;
    }
    tooltip.innerHTML = html;

    document.body.appendChild(tooltip);

    // Position near the event
    const rect = container.getBoundingClientRect();
    let x, y;
    if (event.touches && event.touches.length > 0) {
        x = event.touches[0].clientX;
        y = event.touches[0].clientY;
    } else {
        x = event.clientX;
        y = event.clientY;
    }

    tooltip.style.left = Math.min(x + 12, window.innerWidth - 230) + 'px';
    tooltip.style.top = (y - 10) + 'px';
    tooltip.style.position = 'fixed';
}

function hideTrendTooltip() {
    const existing = document.getElementById('activeTrendTooltip');
    if (existing) existing.remove();
}

function formatTrendDate(dateStr) {
    const parts = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return parseInt(parts[2]) + ' ' + months[parseInt(parts[1]) - 1];
}
