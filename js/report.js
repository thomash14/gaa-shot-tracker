/* =====================================================
   Monthly Report PDF Generator
   Uses jsPDF + jspdf-autotable (loaded from CDN)
   ===================================================== */

// ── Colour constants ──
const RPT = {
    blue:      [42, 82, 152],
    darkBlue:  [30, 60, 114],
    green:     [76, 175, 80],
    red:       [244, 67, 54],
    orange:    [255, 152, 0],
    lightBg:   [240, 244, 248],
    text:      [51, 51, 51],
    white:     [255, 255, 255],
    pitchGreen:[90, 157, 111],
    grey:      [158, 158, 158],
    yellowGreen:[180, 210, 60],
    pageW: 210,
    pageH: 297,
    margin: 15
};

// ── Modal control ──

function showReportModal() {
    const modal = document.getElementById('reportModal');
    modal.classList.add('active');
    const monthInput = document.getElementById('reportMonthInput');
    const fallback = document.getElementById('reportMonthFallback');
    // Default to previous month
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const yyyy = prevMonth.getFullYear();
    const mm = String(prevMonth.getMonth() + 1).padStart(2, '0');
    // Check if type=month is supported
    const testInput = document.createElement('input');
    testInput.type = 'month';
    if (testInput.type === 'month') {
        monthInput.style.display = '';
        fallback.style.display = 'none';
        monthInput.value = `${yyyy}-${mm}`;
    } else {
        monthInput.style.display = 'none';
        fallback.style.display = 'flex';
        // Populate year options
        const yearSel = document.getElementById('reportFallbackYear');
        yearSel.innerHTML = '';
        const curYear = now.getFullYear();
        for (let y = curYear; y >= curYear - 3; y--) {
            yearSel.innerHTML += `<option value="${y}">${y}</option>`;
        }
        document.getElementById('reportFallbackMonth').value = String(prevMonth.getMonth());
        yearSel.value = String(yyyy);
    }
    updateReportPreview();
}

function closeReportModal() {
    document.getElementById('reportModal').classList.remove('active');
}

function getSelectedReportMonth() {
    const monthInput = document.getElementById('reportMonthInput');
    if (monthInput.style.display !== 'none' && monthInput.value) {
        const [y, m] = monthInput.value.split('-');
        return { yyyy: parseInt(y), mm: parseInt(m) };
    }
    const mSel = document.getElementById('reportFallbackMonth');
    const ySel = document.getElementById('reportFallbackYear');
    return { yyyy: parseInt(ySel.value), mm: parseInt(mSel.value) + 1 };
}

function updateReportPreview() {
    const { yyyy, mm } = getSelectedReportMonth();
    const prefix = `${yyyy}-${String(mm).padStart(2, '0')}`;
    const monthSessions = sessions.filter(s => s.date && s.date.startsWith(prefix));
    const matches = monthSessions.filter(s => s.type === 'match');
    const practices = monthSessions.filter(s => s.type === 'practice');
    const totalShots = monthSessions.reduce((sum, s) => sum + (s.shots || []).length, 0);
    const monthLogs = trainingLogs.filter(l => l.date && l.date.startsWith(prefix));
    const preview = document.getElementById('reportPreview');
    preview.innerHTML = `
        <div style="display:flex; gap:12px; flex-wrap:wrap; justify-content:center;">
            <div style="text-align:center; padding:8px 14px; background:#f0f4f8; border-radius:8px; min-width:70px;">
                <div style="font-size:20px; font-weight:700; color:#2a5298;">${matches.length}</div>
                <div style="font-size:11px; color:#666;">Matches</div>
            </div>
            <div style="text-align:center; padding:8px 14px; background:#f0f4f8; border-radius:8px; min-width:70px;">
                <div style="font-size:20px; font-weight:700; color:#2a5298;">${practices.length}</div>
                <div style="font-size:11px; color:#666;">Practices</div>
            </div>
            <div style="text-align:center; padding:8px 14px; background:#f0f4f8; border-radius:8px; min-width:70px;">
                <div style="font-size:20px; font-weight:700; color:#2a5298;">${totalShots}</div>
                <div style="font-size:11px; color:#666;">Shots</div>
            </div>
            <div style="text-align:center; padding:8px 14px; background:#f0f4f8; border-radius:8px; min-width:70px;">
                <div style="font-size:20px; font-weight:700; color:#2a5298;">${monthLogs.length}</div>
                <div style="font-size:11px; color:#666;">Training</div>
            </div>
        </div>
    `;
    // Show/hide error
    const errEl = document.getElementById('reportError');
    if (totalShots === 0 && monthSessions.length === 0 && monthLogs.length === 0) {
        errEl.textContent = 'No data found for this month.';
        errEl.style.display = 'block';
    } else {
        errEl.style.display = 'none';
    }
}

// ── Data collection ──

function collectReportData(yyyy, mm) {
    const prefix = `${yyyy}-${String(mm).padStart(2, '0')}`;
    const monthSessions = sessions.filter(s => s.date && s.date.startsWith(prefix));
    const matches = monthSessions.filter(s => s.type === 'match');
    const practices = monthSessions.filter(s => s.type === 'practice');
    const allShots = [];
    monthSessions.forEach(s => {
        (s.shots || []).forEach(shot => {
            allShots.push({ ...shot, sessionId: s.id, sessionType: s.type, sessionDate: s.date, sessionName: s.name });
        });
    });
    const matchShots = allShots.filter(s => s.sessionType === 'match');
    const practiceShots = allShots.filter(s => s.sessionType === 'practice');

    // Previous month data for comparison
    const prevDate = new Date(yyyy, mm - 2, 1);
    const prevPrefix = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevSessions = sessions.filter(s => s.date && s.date.startsWith(prevPrefix));
    const prevShots = [];
    prevSessions.forEach(s => {
        (s.shots || []).forEach(shot => {
            prevShots.push({ ...shot, sessionId: s.id, sessionType: s.type });
        });
    });
    const prevLogs = trainingLogs.filter(l => l.date && l.date.startsWith(prevPrefix));

    // Zone data — skip shots with invalid coordinates
    const zoneData = {};
    for (let z = 1; z <= 9; z++) zoneData[z] = { scored: 0, total: 0 };
    console.log(`[Report] Classifying ${allShots.length} shots for ${prefix}:`);
    allShots.forEach((shot, i) => {
        if (typeof shot.x !== 'number' || typeof shot.y !== 'number' ||
            isNaN(shot.x) || isNaN(shot.y)) {
            console.log(`  Shot ${i + 1}: SKIPPED — invalid coords (x=${shot.x}, y=${shot.y})`);
            return;
        }
        const zi = getZone(shot.x, shot.y);
        console.log(`  Shot ${i + 1}: x=${shot.x.toFixed(1)}, y=${shot.y.toFixed(1)}, mirrored=${shot.y >= 50} → Zone ${zi.zone} (${zi.name}), ${shot.result}`);
        if (!zi || zi.zone < 1 || zi.zone > 9) return;
        zoneData[zi.zone].total++;
        if (shot.result === 'scored') zoneData[zi.zone].scored++;
    });
    console.log('[Report] Zone totals:', JSON.parse(JSON.stringify(zoneData)));

    // Foot splits (all shots)
    const rightShots = allShots.filter(s => (s.foot || 'right') === 'right');
    const leftShots = allShots.filter(s => s.foot === 'left');
    const rightScored = rightShots.filter(s => s.result === 'scored').length;
    const leftScored = leftShots.filter(s => s.result === 'scored').length;

    // Category splits
    const inPlayShots = allShots.filter(s => s.shotCategory === 'in-play');
    const freeShots = allShots.filter(s => s.shotCategory === 'free-kick');
    const fortyFiveShots = allShots.filter(s => s.shotCategory === '45');
    const placedShots = [...freeShots, ...fortyFiveShots];
    const inPlayScored = inPlayShots.filter(s => s.result === 'scored').length;
    const placedScored = placedShots.filter(s => s.result === 'scored').length;

    // Match-specific in-play foot splits (for unbiased foot breakdown)
    const matchInPlayShots = matchShots.filter(s => s.shotCategory === 'in-play');
    const matchInPlayRight = matchInPlayShots.filter(s => (s.foot || 'right') === 'right');
    const matchInPlayLeft = matchInPlayShots.filter(s => s.foot === 'left');
    const matchInPlayRightScored = matchInPlayRight.filter(s => s.result === 'scored').length;
    const matchInPlayLeftScored = matchInPlayLeft.filter(s => s.result === 'scored').length;

    // Per-match breakdown rows (for detailed table + averages)
    const matchRows = [...matches].sort((a, b) => a.date.localeCompare(b.date)).map(m => {
        const shots = m.shots || [];
        const scored = shots.filter(s => s.result === 'scored').length;
        const total = shots.length;
        const inPlay = shots.filter(s => s.shotCategory === 'in-play');
        const inPlaySc = inPlay.filter(s => s.result === 'scored').length;
        const placed = shots.filter(s => s.shotCategory === 'free-kick' || s.shotCategory === '45');
        const placedSc = placed.filter(s => s.result === 'scored').length;
        const onePt = shots.filter(s => (s.pointValue === 1 || !s.pointValue) && s.shotFor !== 'goal');
        const onePtSc = onePt.filter(s => s.result === 'scored').length;
        const twoPt = shots.filter(s => s.pointValue === 2 && s.shotFor !== 'goal');
        const twoPtSc = twoPt.filter(s => s.result === 'scored').length;
        const goals = shots.filter(s => s.shotFor === 'goal');
        const goalsSc = goals.filter(s => s.result === 'scored').length;
        const ptsPerShot = total > 0 ? (onePtSc * 1 + twoPtSc * 2 + goalsSc * 3) / total : 0;
        // Total points scored for averages
        const totalPtsValue = onePtSc * 1 + twoPtSc * 2 + goalsSc * 3;
        const inPlayPtsValue = inPlay.filter(s => s.result === 'scored').reduce((sum, s) => {
            if (s.shotFor === 'goal') return sum + 3;
            return sum + (s.pointValue || 1);
        }, 0);
        return {
            session: m, scored, total, inPlaySc, inPlayTotal: inPlay.length,
            placedSc, placedTotal: placed.length,
            onePtSc, onePtTotal: onePt.length,
            twoPtSc, twoPtTotal: twoPt.length,
            goalsSc, goalsTotal: goals.length,
            ptsPerShot, totalPtsValue, inPlayPtsValue
        };
    });

    // Training logs
    const monthLogs = trainingLogs.filter(l => l.date && l.date.startsWith(prefix));
    const trainingSessions = monthLogs.filter(l => l.sessionType === 'training');
    const gymSessions = monthLogs.filter(l => l.sessionType === 'gym');
    const recoverySessions = monthLogs.filter(l => l.sessionType === 'recovery');
    const kickingBeforeCount = trainingSessions.filter(l => l.kickingBefore).length;
    const kickingAfterCount = trainingSessions.filter(l => l.kickingAfter).length;
    const beforeDurations = trainingSessions.filter(l => l.kickingBefore && l.beforeDuration).map(l => l.beforeDuration);
    const afterDurations = trainingSessions.filter(l => l.kickingAfter && l.afterDuration).map(l => l.afterDuration);
    const avgBeforeDuration = beforeDurations.length > 0 ? Math.round(beforeDurations.reduce((a, b) => a + b, 0) / beforeDurations.length) : 0;
    const avgAfterDuration = afterDurations.length > 0 ? Math.round(afterDurations.reduce((a, b) => a + b, 0) / afterDurations.length) : 0;

    // Player info
    const metadata = (currentUser && currentUser.user_metadata) || {};
    const playerName = metadata.display_name || (currentUser && currentUser.email) || 'Player';
    const playerClub = metadata.club || '';
    const playerPosition = metadata.primary_position || '';

    // Previous month splits for comparison
    const prevRight = prevShots.filter(s => (s.foot || 'right') === 'right');
    const prevLeft = prevShots.filter(s => s.foot === 'left');
    const prevInPlay = prevShots.filter(s => s.shotCategory === 'in-play');
    const prevPlaced = prevShots.filter(s => s.shotCategory === 'free-kick' || s.shotCategory === '45');

    return {
        yyyy, mm, prefix,
        monthSessions, matches, practices,
        allShots, matchShots, practiceShots,
        prevSessions, prevShots, prevLogs,
        prevMatches: prevSessions.filter(s => s.type === 'match'),
        prevPractices: prevSessions.filter(s => s.type === 'practice'),
        prevRight, prevLeft, prevInPlay, prevPlaced,
        zoneData,
        rightShots, leftShots, rightScored, leftScored,
        inPlayShots, placedShots, freeShots, fortyFiveShots,
        inPlayScored, placedScored,
        matchInPlayRight, matchInPlayLeft,
        matchInPlayRightScored, matchInPlayLeftScored,
        matchRows,
        monthLogs, trainingSessions, gymSessions, recoverySessions,
        kickingBeforeCount, kickingAfterCount,
        avgBeforeDuration, avgAfterDuration,
        playerName, playerClub, playerPosition
    };
}

// ── PDF Entry Point ──

async function generateMonthlyReport() {
    const { yyyy, mm } = getSelectedReportMonth();
    const data = collectReportData(yyyy, mm);
    if (data.allShots.length === 0 && data.monthSessions.length === 0 && data.monthLogs.length === 0) {
        document.getElementById('reportError').textContent = 'No data found for this month. Cannot generate report.';
        document.getElementById('reportError').style.display = 'block';
        return;
    }
    const monthLabel = getMonthLabel(yyyy, mm);

    // Pre-render pitch images from actual SVG before building PDF
    const matchPitchImage = await renderPitchToImage(data.matchShots, {
        crop: 'attacking-half',
        width: 1000
    });
    const heatmapPitchImage = await renderPitchToImage([], {
        crop: 'attacking-half',
        width: 1000
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    renderCoverPage(doc, data, monthLabel);
    doc.addPage();
    renderMatchAnalysisPage(doc, data, monthLabel, matchPitchImage);
    doc.addPage();
    renderPracticeAnalysisPage(doc, data, monthLabel);
    doc.addPage();
    renderInsightsPage(doc, data, monthLabel);
    doc.addPage();
    renderComparisonPage(doc, data, monthLabel);
    doc.addPage();
    renderHeatmapPage(doc, data, monthLabel, heatmapPitchImage);

    const safeName = data.playerName.replace(/[^a-zA-Z0-9]/g, '_');
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    doc.save(`KickOn_Report_${safeName}_${monthNames[mm - 1]}_${yyyy}.pdf`);
    closeReportModal();
}

// ── Page 1: Cover ──

function renderCoverPage(doc, data, monthLabel) {
    // Dark blue header band
    doc.setFillColor(...RPT.darkBlue);
    doc.rect(0, 0, RPT.pageW, 120, 'F');

    // App name
    doc.setTextColor(...RPT.white);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text('KICK ON', RPT.pageW / 2, 40, { align: 'center' });

    // Football icon (simple circle)
    doc.setDrawColor(...RPT.white);
    doc.setLineWidth(0.5);
    doc.circle(RPT.pageW / 2, 55, 5);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text('Monthly Performance Report', RPT.pageW / 2, 72, { align: 'center' });

    doc.setFontSize(14);
    doc.text(monthLabel, RPT.pageW / 2, 85, { align: 'center' });

    // Player info
    doc.setFontSize(12);
    let infoY = 100;
    doc.text(data.playerName, RPT.pageW / 2, infoY, { align: 'center' });
    if (data.playerClub || data.playerPosition) {
        infoY += 7;
        const parts = [data.playerPosition, data.playerClub].filter(Boolean);
        doc.setFontSize(10);
        doc.text(parts.join('  |  '), RPT.pageW / 2, infoY, { align: 'center' });
    }

    // 5 stat boxes below header
    doc.setTextColor(...RPT.text);
    const totalScored = data.allShots.filter(s => s.result === 'scored').length;
    const convRate = data.allShots.length > 0 ? Math.round((totalScored / data.allShots.length) * 100) : 0;
    const ptsPerShot = calcPtsPerShot(data.allShots);

    const stats = [
        { value: String(data.monthSessions.length), label: 'Sessions' },
        { value: String(data.allShots.length), label: 'Total Shots' },
        { value: `${convRate}%`, label: 'Conversion' },
        { value: ptsPerShot.toFixed(2), label: 'Pts/Shot' },
        { value: String(data.matches.length), label: 'Matches' }
    ];

    const boxW = 33;
    const boxH = 28;
    const gap = 4;
    const totalW = stats.length * boxW + (stats.length - 1) * gap;
    let startX = (RPT.pageW - totalW) / 2;
    const boxY = 135;

    stats.forEach((stat, i) => {
        const bx = startX + i * (boxW + gap);
        drawStatBox(doc, bx, boxY, boxW, boxH, stat.value, stat.label);
    });

    // Footer tagline
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by Kick On - GAA Shot Tracker', RPT.pageW / 2, 280, { align: 'center' });
}

// ── Page 2 (+2b): Match Analysis ──

function renderMatchAnalysisPage(doc, data, monthLabel, matchPitchImage) {
    addPageHeader(doc, 2, monthLabel, 'Match Analysis');

    if (data.matches.length === 0) {
        doc.setFontSize(12);
        doc.setTextColor(...RPT.text);
        doc.text('No matches recorded this month.', RPT.pageW / 2, 50, { align: 'center' });
        addPageFooter(doc, 2, 6);
        return;
    }

    const mRows = data.matchRows;

    // ── 1. Detailed match table ──
    function convCell(scored, total) {
        if (total === 0) return '-';
        return `${scored}/${total} (${Math.round(scored / total * 100)}%)`;
    }

    const showInPlay = mRows.some(r => r.inPlayTotal > 0);
    const showPlaced = mRows.some(r => r.placedTotal > 0);
    const showTwoPt = mRows.some(r => r.twoPtTotal > 0);
    const showGoals = mRows.some(r => r.goalsTotal > 0);

    // Build header
    const head = ['Date', 'Comp.', 'Opponent', 'Conv.', 'Pts/S'];
    if (showInPlay) head.push('In-Play');
    if (showPlaced) head.push('Placed');
    head.push('1Pt');
    if (showTwoPt) head.push('2Pt');
    if (showGoals) head.push('Goal');

    // Build body rows
    const bodyRows = mRows.map(r => {
        const s = r.session;
        const row = [
            formatDate(s.date),
            formatMatchType(s.matchType),
            s.name || '-',
            convCell(r.scored, r.total),
            r.ptsPerShot.toFixed(2)
        ];
        if (showInPlay) row.push(convCell(r.inPlaySc, r.inPlayTotal));
        if (showPlaced) row.push(convCell(r.placedSc, r.placedTotal));
        row.push(convCell(r.onePtSc, r.onePtTotal));
        if (showTwoPt) row.push(convCell(r.twoPtSc, r.twoPtTotal));
        if (showGoals) row.push(convCell(r.goalsSc, r.goalsTotal));
        return row;
    });

    // Totals row
    if (mRows.length > 1) {
        const tScored = mRows.reduce((a, r) => a + r.scored, 0);
        const tTotal = mRows.reduce((a, r) => a + r.total, 0);
        const tIPS = mRows.reduce((a, r) => a + r.inPlaySc, 0);
        const tIPT = mRows.reduce((a, r) => a + r.inPlayTotal, 0);
        const tPS = mRows.reduce((a, r) => a + r.placedSc, 0);
        const tPT = mRows.reduce((a, r) => a + r.placedTotal, 0);
        const t1S = mRows.reduce((a, r) => a + r.onePtSc, 0);
        const t1T = mRows.reduce((a, r) => a + r.onePtTotal, 0);
        const t2S = mRows.reduce((a, r) => a + r.twoPtSc, 0);
        const t2T = mRows.reduce((a, r) => a + r.twoPtTotal, 0);
        const tGS = mRows.reduce((a, r) => a + r.goalsSc, 0);
        const tGT = mRows.reduce((a, r) => a + r.goalsTotal, 0);
        const tPPS = tTotal > 0 ? ((t1S + t2S * 2 + tGS * 3) / tTotal).toFixed(2) : '0.00';
        const totRow = ['', 'TOTALS', '', convCell(tScored, tTotal), tPPS];
        if (showInPlay) totRow.push(convCell(tIPS, tIPT));
        if (showPlaced) totRow.push(convCell(tPS, tPT));
        totRow.push(convCell(t1S, t1T));
        if (showTwoPt) totRow.push(convCell(t2S, t2T));
        if (showGoals) totRow.push(convCell(tGS, tGT));
        bodyRows.push(totRow);
    }

    const totalBodyRows = bodyRows.length;
    doc.autoTable({
        startY: 38,
        head: [head],
        body: bodyRows,
        theme: 'grid',
        headStyles: { fillColor: RPT.blue, fontSize: 6.5, halign: 'center', cellPadding: 1.5 },
        bodyStyles: { fontSize: 6.5, halign: 'center', cellPadding: 1.5 },
        columnStyles: {
            0: { cellWidth: 16 },
            1: { cellWidth: 18 },
            2: { halign: 'left' }
        },
        margin: { left: RPT.margin, right: RPT.margin },
        didParseCell: function(hookData) {
            if (mRows.length > 1 && hookData.row.index === totalBodyRows - 1 && hookData.section === 'body') {
                hookData.cell.styles.fontStyle = 'bold';
                hookData.cell.styles.fillColor = [220, 230, 245];
            }
        }
    });

    let curY = doc.lastAutoTable.finalY + 6;

    // ── 2. Foot Breakdown (In-Play Only) + Shot Categories side by side ──
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RPT.blue);
    doc.text('Foot Breakdown (In-Play Only)', RPT.margin, curY + 4);
    doc.text('Shot Categories', RPT.margin + 95, curY + 4);
    curY += 7;

    const rConv = conv(data.matchInPlayRightScored, data.matchInPlayRight.length);
    const lConv = conv(data.matchInPlayLeftScored, data.matchInPlayLeft.length);
    drawStatBox(doc, RPT.margin, curY, 38, 20, `${rConv}%`, `Right (${data.matchInPlayRight.length})`);
    drawStatBox(doc, RPT.margin + 42, curY, 38, 20, `${lConv}%`, `Left (${data.matchInPlayLeft.length})`);

    // Category horizontal bars
    const catY = curY;
    const barX = RPT.margin + 95;
    const barW = 75;
    const matchFreeShots = data.matchShots.filter(s => s.shotCategory === 'free-kick');
    const match45Shots = data.matchShots.filter(s => s.shotCategory === '45');
    const matchInPlayAll = data.matchShots.filter(s => s.shotCategory === 'in-play');
    const cats = [
        { label: 'In-Play', scored: matchInPlayAll.filter(s => s.result === 'scored').length, total: matchInPlayAll.length, color: RPT.blue },
        { label: 'Free-kick', scored: matchFreeShots.filter(s => s.result === 'scored').length, total: matchFreeShots.length, color: RPT.green },
        { label: '45s', scored: match45Shots.filter(s => s.result === 'scored').length, total: match45Shots.length, color: RPT.orange }
    ];
    cats.forEach((cat, i) => {
        const cy = catY + i * 6.5;
        const pct = cat.total > 0 ? cat.scored / cat.total : 0;
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...RPT.text);
        doc.text(cat.label, barX, cy + 3.5);
        doc.setFillColor(230, 230, 230);
        doc.roundedRect(barX + 18, cy, barW - 18, 4.5, 1, 1, 'F');
        if (pct > 0) {
            doc.setFillColor(...cat.color);
            doc.roundedRect(barX + 18, cy, (barW - 18) * pct, 4.5, 1, 1, 'F');
        }
        doc.setFontSize(5.5);
        doc.text(`${cat.total > 0 ? Math.round(pct * 100) : 0}% (${cat.scored}/${cat.total})`, barX + barW + 1, cy + 3.5);
    });

    curY += 24;

    // ── 3. Averages ──
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RPT.blue);
    doc.text('Averages Per Game', RPT.margin, curY + 3);
    curY += 6;

    const nMatches = mRows.length;
    const totalPtsAll = mRows.reduce((a, r) => a + r.totalPtsValue, 0);
    const totalPtsFromPlay = mRows.reduce((a, r) => a + r.inPlayPtsValue, 0);
    const totalShotsAll = mRows.reduce((a, r) => a + r.total, 0);
    const totalScoredAll = mRows.reduce((a, r) => a + r.scored, 0);
    const avgPts = nMatches > 0 ? (totalPtsAll / nMatches).toFixed(1) : '0';
    const avgFromPlay = nMatches > 0 ? (totalPtsFromPlay / nMatches).toFixed(1) : '0';
    const avgShots = nMatches > 0 ? (totalShotsAll / nMatches).toFixed(1) : '0';
    const avgConv = totalShotsAll > 0 ? Math.round((totalScoredAll / totalShotsAll) * 100) : 0;

    const avgStats = [
        { value: avgPts, label: 'Avg Pts/Game' },
        { value: avgFromPlay, label: 'From Play' },
        { value: avgShots, label: 'Shots/Game' },
        { value: `${avgConv}%`, label: 'Avg Conv.' }
    ];
    const aBoxW = 38;
    const aGap = 5;
    const aTotalW = avgStats.length * aBoxW + (avgStats.length - 1) * aGap;
    let aStartX = (RPT.pageW - aTotalW) / 2;
    avgStats.forEach((stat, i) => {
        drawStatBox(doc, aStartX + i * (aBoxW + aGap), curY, aBoxW, 18, stat.value, stat.label);
    });
    curY += 24;

    // ── 4. Shot Map ──
    const shotMapH = 52;
    const shotMapW = 70;
    // Check if we need a new page for shot map + insights
    if (curY + shotMapH + 60 > RPT.pageH - 20) {
        addPageFooter(doc, 2, 6);
        doc.addPage();
        addPageHeader(doc, '2b', monthLabel, 'Match Analysis (cont.)');
        curY = 38;
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RPT.blue);
    doc.text('Match Shot Map', RPT.margin, curY + 3);
    curY += 6;

    const mapX = RPT.margin;
    const mapY = curY;
    doc.addImage(matchPitchImage, 'PNG', mapX, mapY, shotMapW, shotMapH);

    // ── 5. Match Insights (beside the shot map) ──
    const insX = RPT.margin + shotMapW + 8;
    const insW = RPT.pageW - insX - RPT.margin;
    let insY = mapY;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RPT.blue);
    doc.text('Match Insights', insX, insY + 3);
    insY += 7;

    const matchInsights = generateMatchInsights(data);
    doc.setFontSize(7.5);

    // Match notes — didWell
    const matchDidWell = data.matches.filter(s => s.didWell);
    const matchToImprove = data.matches.filter(s => s.toImprove);

    if (matchDidWell.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...RPT.green);
        doc.text('Did Well:', insX, insY);
        insY += 4;
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...RPT.text);
        matchDidWell.slice(0, 3).forEach(s => {
            const lines = doc.splitTextToSize(`"${s.didWell}"`, insW - 2);
            lines.forEach(line => {
                if (insY > mapY + shotMapH + 30) return;
                doc.text(line, insX + 1, insY);
                insY += 3.5;
            });
            insY += 1;
        });
        insY += 2;
    }

    if (matchToImprove.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...RPT.orange);
        doc.text('To Improve:', insX, insY);
        insY += 4;
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...RPT.text);
        matchToImprove.slice(0, 3).forEach(s => {
            const lines = doc.splitTextToSize(`"${s.toImprove}"`, insW - 2);
            lines.forEach(line => {
                if (insY > mapY + shotMapH + 30) return;
                doc.text(line, insX + 1, insY);
                insY += 3.5;
            });
            insY += 1;
        });
        insY += 2;
    }

    // Auto-generated match insights
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...RPT.text);
    matchInsights.forEach(insight => {
        if (insY > mapY + shotMapH + 50) return;
        const lines = doc.splitTextToSize(`• ${insight}`, insW - 2);
        lines.forEach(line => {
            doc.text(line, insX, insY);
            insY += 3.5;
        });
        insY += 1;
    });

    curY = Math.max(mapY + shotMapH + 4, insY + 4);

    // Conversion trend chart (if 2+ matches)
    if (data.matches.length >= 2) {
        if (curY + 48 > RPT.pageH - 20) {
            addPageFooter(doc, 2, 6);
            doc.addPage();
            addPageHeader(doc, '2b', monthLabel, 'Match Analysis (cont.)');
            curY = 38;
        }
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...RPT.blue);
        doc.text('Conversion Rate Trend', RPT.margin, curY + 3);
        curY += 6;
        const points = mRows.map(r => ({
            label: r.session.name || 'Match',
            value: r.total > 0 ? Math.round((r.scored / r.total) * 100) : 0
        }));
        drawLineChart(doc, RPT.margin, curY, RPT.pageW - RPT.margin * 2, 40, points, { yLabel: '%', maxY: 100 });
        curY += 44;
    }

    addPageFooter(doc, 2, 6);
}

// ── Page 3: Practice Analysis ──

function renderPracticeAnalysisPage(doc, data, monthLabel) {
    addPageHeader(doc, 3, monthLabel, 'Practice Analysis');

    if (data.practices.length === 0) {
        doc.setFontSize(12);
        doc.setTextColor(...RPT.text);
        doc.text('No practice sessions recorded this month.', RPT.pageW / 2, 50, { align: 'center' });
        addPageFooter(doc, 3, 6);
        return;
    }

    // Overview stats
    const practiceScored = data.practiceShots.filter(s => s.result === 'scored').length;
    const practiceConv = conv(practiceScored, data.practiceShots.length);
    let curY = 38;
    const overviewStats = [
        { value: String(data.practices.length), label: 'Sessions' },
        { value: String(data.practiceShots.length), label: 'Total Shots' },
        { value: `${practiceConv}%`, label: 'Conversion' }
    ];
    const oBoxW = 45;
    const oGap = 8;
    const oTotalW = overviewStats.length * oBoxW + (overviewStats.length - 1) * oGap;
    let oStartX = (RPT.pageW - oTotalW) / 2;
    overviewStats.forEach((stat, i) => {
        drawStatBox(doc, oStartX + i * (oBoxW + oGap), curY, oBoxW, 24, stat.value, stat.label);
    });
    curY += 34;

    // Drill breakdown
    const drillMap = {};
    data.practices.forEach(session => {
        (session.shots || []).forEach(shot => {
            const key = shot.drillKey || shot.drill || 'General';
            if (!drillMap[key]) drillMap[key] = { name: shot.drillName || shot.drill || key, sessions: new Set(), shots: 0, scored: 0 };
            drillMap[key].sessions.add(session.id);
            drillMap[key].shots++;
            if (shot.result === 'scored') drillMap[key].scored++;
        });
    });

    const drillRows = Object.entries(drillMap)
        .sort((a, b) => b[1].shots - a[1].shots)
        .map(([key, d]) => [
            d.name,
            String(d.sessions.size),
            String(d.shots),
            d.shots > 0 ? Math.round((d.scored / d.shots) * 100) + '%' : '-'
        ]);

    if (drillRows.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...RPT.blue);
        doc.text('Drill Breakdown', RPT.margin, curY + 4);
        curY += 7;

        doc.autoTable({
            startY: curY,
            head: [['Drill', 'Sessions', 'Shots', 'Conv%']],
            body: drillRows,
            theme: 'grid',
            headStyles: { fillColor: RPT.blue, fontSize: 8, halign: 'center' },
            bodyStyles: { fontSize: 8, halign: 'center' },
            columnStyles: {
                0: { cellWidth: 65, halign: 'left' },
                1: { cellWidth: 25 },
                2: { cellWidth: 25 },
                3: { cellWidth: 25 }
            },
            margin: { left: RPT.margin, right: RPT.margin }
        });
        curY = doc.lastAutoTable.finalY + 8;
    }

    // Best practice session
    let bestSession = null;
    let bestConv = -1;
    data.practices.forEach(session => {
        const shots = session.shots || [];
        if (shots.length < 5) return;
        const scored = shots.filter(s => s.result === 'scored').length;
        const rate = scored / shots.length;
        if (rate > bestConv) {
            bestConv = rate;
            bestSession = session;
        }
    });

    if (bestSession && curY < 250) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...RPT.blue);
        doc.text('Best Practice Session', RPT.margin, curY + 4);
        curY += 8;
        doc.setFillColor(...RPT.lightBg);
        doc.roundedRect(RPT.margin, curY, RPT.pageW - RPT.margin * 2, 20, 3, 3, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...RPT.text);
        const bShots = bestSession.shots || [];
        const bScored = bShots.filter(s => s.result === 'scored').length;
        doc.text(`${formatDate(bestSession.date)} — ${bestSession.name || 'Practice'}`, RPT.margin + 5, curY + 8);
        doc.text(`${bScored}/${bShots.length} (${Math.round(bestConv * 100)}%)`, RPT.margin + 5, curY + 15);
    }

    addPageFooter(doc, 3, 6);
}

// ── Page 4: Insights ──

function renderInsightsPage(doc, data, monthLabel) {
    addPageHeader(doc, 4, monthLabel, 'Insights & Reflections');

    const insights = generateInsights(data);
    let curY = 40;

    // "What You Did Well" section
    doc.setFillColor(240, 255, 240);
    doc.roundedRect(RPT.margin, curY, RPT.pageW - RPT.margin * 2, 2, 0, 0, 'F');
    doc.setFillColor(...RPT.green);
    doc.rect(RPT.margin, curY, 3, 2, 'F');

    curY += 6;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RPT.green);
    doc.text('What You Did Well', RPT.margin + 6, curY + 4);
    curY += 10;

    // Session notes - didWell
    const didWellNotes = data.monthSessions
        .filter(s => s.didWell)
        .slice(0, 5);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...RPT.text);

    if (didWellNotes.length > 0) {
        doc.setFont('helvetica', 'bolditalic');
        doc.text('Your notes:', RPT.margin + 6, curY);
        curY += 5;
        doc.setFont('helvetica', 'italic');
        didWellNotes.forEach(s => {
            const noteText = `${formatDate(s.date)}: "${s.didWell}"`;
            const lines = doc.splitTextToSize(noteText, RPT.pageW - RPT.margin * 2 - 14);
            lines.forEach(line => {
                if (curY > 260) return;
                doc.text(line, RPT.margin + 8, curY);
                curY += 4.5;
            });
            curY += 1;
        });
        curY += 3;
    }

    // Auto-generated strengths
    doc.setFont('helvetica', 'normal');
    if (insights.strengths.length > 0) {
        insights.strengths.forEach(s => {
            if (curY > 260) return;
            doc.setFillColor(...RPT.green);
            doc.circle(RPT.margin + 8, curY - 1, 1.2, 'F');
            const lines = doc.splitTextToSize(s, RPT.pageW - RPT.margin * 2 - 16);
            lines.forEach(line => {
                doc.text(line, RPT.margin + 12, curY);
                curY += 4.5;
            });
            curY += 1;
        });
    } else if (didWellNotes.length === 0) {
        doc.text('Not enough data to generate strengths.', RPT.margin + 6, curY);
        curY += 6;
    }

    // "Areas to Work On" section
    curY = Math.max(curY + 8, 155);
    doc.setFillColor(255, 245, 230);
    doc.roundedRect(RPT.margin, curY, RPT.pageW - RPT.margin * 2, 2, 0, 0, 'F');
    doc.setFillColor(...RPT.orange);
    doc.rect(RPT.margin, curY, 3, 2, 'F');

    curY += 6;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RPT.orange);
    doc.text('Areas to Work On', RPT.margin + 6, curY + 4);
    curY += 10;

    // Session notes - toImprove
    const toImproveNotes = data.monthSessions
        .filter(s => s.toImprove)
        .slice(0, 5);

    doc.setFontSize(9);
    doc.setTextColor(...RPT.text);

    if (toImproveNotes.length > 0) {
        doc.setFont('helvetica', 'bolditalic');
        doc.text('Your notes:', RPT.margin + 6, curY);
        curY += 5;
        doc.setFont('helvetica', 'italic');
        toImproveNotes.forEach(s => {
            const noteText = `${formatDate(s.date)}: "${s.toImprove}"`;
            const lines = doc.splitTextToSize(noteText, RPT.pageW - RPT.margin * 2 - 14);
            lines.forEach(line => {
                if (curY > 275) return;
                doc.text(line, RPT.margin + 8, curY);
                curY += 4.5;
            });
            curY += 1;
        });
        curY += 3;
    }

    // Auto-generated improvements
    doc.setFont('helvetica', 'normal');
    if (insights.improvements.length > 0) {
        insights.improvements.forEach(s => {
            if (curY > 275) return;
            doc.setFillColor(...RPT.orange);
            doc.circle(RPT.margin + 8, curY - 1, 1.2, 'F');
            const lines = doc.splitTextToSize(s, RPT.pageW - RPT.margin * 2 - 16);
            lines.forEach(line => {
                doc.text(line, RPT.margin + 12, curY);
                curY += 4.5;
            });
            curY += 1;
        });
    } else if (toImproveNotes.length === 0) {
        doc.text('Not enough data to generate improvement areas.', RPT.margin + 6, curY);
    }

    addPageFooter(doc, 4, 6);
}

// ── Page 5: Comparison ──

function renderComparisonPage(doc, data, monthLabel) {
    addPageHeader(doc, 5, monthLabel, 'Month-on-Month Comparison');

    const prevMonthLabel = getMonthLabel(
        data.mm === 1 ? data.yyyy - 1 : data.yyyy,
        data.mm === 1 ? 12 : data.mm - 1
    );

    const hasPrevData = data.prevShots.length > 0 || data.prevSessions.length > 0;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RPT.blue);
    doc.text(`${monthLabel} vs ${prevMonthLabel}`, RPT.pageW / 2, 42, { align: 'center' });

    if (!hasPrevData) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...RPT.text);
        doc.text(`No data available for ${prevMonthLabel}.`, RPT.pageW / 2, 60, { align: 'center' });
        doc.text('Comparison will be available once you have two months of data.', RPT.pageW / 2, 68, { align: 'center' });
        addPageFooter(doc, 5, 6);
        return;
    }

    // Calculate metrics
    const curScored = data.allShots.filter(s => s.result === 'scored').length;
    const prevScored = data.prevShots.filter(s => s.result === 'scored').length;
    const curConv = data.allShots.length > 0 ? Math.round((curScored / data.allShots.length) * 100) : 0;
    const prevConv = data.prevShots.length > 0 ? Math.round((prevScored / data.prevShots.length) * 100) : 0;

    const curRightConv = data.rightShots.length > 0 ? Math.round((data.rightScored / data.rightShots.length) * 100) : 0;
    const prevRightScored = data.prevRight.filter(s => s.result === 'scored').length;
    const prevRightConv = data.prevRight.length > 0 ? Math.round((prevRightScored / data.prevRight.length) * 100) : 0;

    const curLeftConv = data.leftShots.length > 0 ? Math.round((data.leftScored / data.leftShots.length) * 100) : 0;
    const prevLeftScored = data.prevLeft.filter(s => s.result === 'scored').length;
    const prevLeftConv = data.prevLeft.length > 0 ? Math.round((prevLeftScored / data.prevLeft.length) * 100) : 0;

    const curInPlayConv = data.inPlayShots.length > 0 ? Math.round((data.inPlayScored / data.inPlayShots.length) * 100) : 0;
    const prevInPlayScored = data.prevInPlay.filter(s => s.result === 'scored').length;
    const prevInPlayConv = data.prevInPlay.length > 0 ? Math.round((prevInPlayScored / data.prevInPlay.length) * 100) : 0;

    const curPlacedConv = data.placedShots.length > 0 ? Math.round((data.placedScored / data.placedShots.length) * 100) : 0;
    const prevPlacedScored = data.prevPlaced.filter(s => s.result === 'scored').length;
    const prevPlacedConv = data.prevPlaced.length > 0 ? Math.round((prevPlacedScored / data.prevPlaced.length) * 100) : 0;

    const metrics = [
        { name: 'Matches', cur: data.matches.length, prev: data.prevMatches.length, isPct: false },
        { name: 'Practices', cur: data.practices.length, prev: data.prevPractices.length, isPct: false },
        { name: 'Total Shots', cur: data.allShots.length, prev: data.prevShots.length, isPct: false },
        { name: 'Conversion %', cur: curConv, prev: prevConv, isPct: true },
        { name: 'Right Foot %', cur: curRightConv, prev: prevRightConv, isPct: true },
        { name: 'Left Foot %', cur: curLeftConv, prev: prevLeftConv, isPct: true },
        { name: 'In-Play %', cur: curInPlayConv, prev: prevInPlayConv, isPct: true },
        { name: 'Placed Ball %', cur: curPlacedConv, prev: prevPlacedConv, isPct: true },
        { name: 'Total Sessions', cur: data.monthSessions.length, prev: data.prevSessions.length, isPct: false }
    ];

    const rows = metrics.map(m => {
        const curStr = m.isPct ? `${m.cur}%` : String(m.cur);
        const prevStr = m.isPct ? `${m.prev}%` : String(m.prev);
        const diff = m.cur - m.prev;
        let changeStr = '';
        if (diff > 0) changeStr = `+${m.isPct ? diff + '%' : diff}`;
        else if (diff < 0) changeStr = `${m.isPct ? diff + '%' : diff}`;
        else changeStr = '-';
        return [m.name, curStr, prevStr, changeStr];
    });

    doc.autoTable({
        startY: 50,
        head: [['Metric', monthLabel, prevMonthLabel, 'Change']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: RPT.blue, fontSize: 9, halign: 'center' },
        bodyStyles: { fontSize: 9, halign: 'center' },
        columnStyles: {
            0: { cellWidth: 45, halign: 'left', fontStyle: 'bold' },
            1: { cellWidth: 35 },
            2: { cellWidth: 35 },
            3: { cellWidth: 35 }
        },
        margin: { left: RPT.margin + 15, right: RPT.margin + 15 },
        didParseCell: function(hookData) {
            if (hookData.column.index === 3 && hookData.section === 'body') {
                const val = hookData.cell.raw;
                if (val.startsWith('+')) {
                    hookData.cell.styles.textColor = RPT.green;
                    hookData.cell.styles.fontStyle = 'bold';
                } else if (val.startsWith('-') && val !== '-') {
                    hookData.cell.styles.textColor = RPT.red;
                    hookData.cell.styles.fontStyle = 'bold';
                } else {
                    hookData.cell.styles.textColor = RPT.grey;
                }
            }
        }
    });

    // Arrow summary boxes beneath table
    let arrowY = doc.lastAutoTable.finalY + 12;
    const keyMetrics = metrics.filter(m => m.isPct);
    const boxSize = 30;
    const arrowGap = 6;
    const arrowTotalW = keyMetrics.length * boxSize + (keyMetrics.length - 1) * arrowGap;
    let arrowStartX = (RPT.pageW - arrowTotalW) / 2;

    keyMetrics.forEach((m, i) => {
        const bx = arrowStartX + i * (boxSize + arrowGap);
        drawArrowIndicator(doc, bx, arrowY, boxSize, m.cur, m.prev, m.name);
    });

    addPageFooter(doc, 5, 6);
}

// ── Page 6: Heatmap & Training Log ──

function renderHeatmapPage(doc, data, monthLabel, heatmapPitchImage) {
    addPageHeader(doc, 6, monthLabel, 'Shot Heatmap & Training');

    // Draw pitch with heatmap - attacking half only
    // Aspect ratio: 500:362 (SVG attacking half)
    const pitchX = 30;
    const pitchY = 38;
    const pitchW = 130;
    const pitchH = Math.round(pitchW * (362 / 500)); // ~94mm for correct aspect ratio

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RPT.blue);
    doc.text('Shot Heatmap by Zone', RPT.pageW / 2, pitchY - 4, { align: 'center' });

    if (data.allShots.length > 0) {
        doc.addImage(heatmapPitchImage, 'PNG', pitchX, pitchY, pitchW, pitchH);
        drawZoneHeatmap(doc, pitchX, pitchY, pitchW, pitchH, data.zoneData);
    } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...RPT.text);
        doc.text('No shots to display.', RPT.pageW / 2, pitchY + pitchH / 2, { align: 'center' });
    }

    // Zone legend
    let legendY = pitchY + pitchH + 8;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...RPT.text);
    const legendItems = [
        { color: RPT.green, label: '70%+' },
        { color: RPT.yellowGreen, label: '50-69%' },
        { color: RPT.orange, label: '30-49%' },
        { color: RPT.red, label: '<30%' },
        { color: RPT.grey, label: 'No shots' }
    ];
    const legendStartX = (RPT.pageW - legendItems.length * 30) / 2;
    legendItems.forEach((item, i) => {
        const lx = legendStartX + i * 30;
        doc.setFillColor(...item.color);
        doc.roundedRect(lx, legendY, 8, 5, 1, 1, 'F');
        doc.text(item.label, lx + 10, legendY + 4);
    });

    // Training Log Summary
    let trainY = legendY + 18;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RPT.blue);
    doc.text('Training Log Summary', RPT.pageW / 2, trainY, { align: 'center' });
    trainY += 8;

    doc.setFillColor(...RPT.lightBg);
    doc.roundedRect(RPT.margin, trainY, RPT.pageW - RPT.margin * 2, 72, 4, 4, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...RPT.text);

    const trainItems = [
        { label: 'Team Training Sessions', value: String(data.trainingSessions.length) },
        { label: 'Gym Sessions', value: String(data.gymSessions.length) },
        { label: 'Recovery Sessions', value: String(data.recoverySessions.length) },
        { label: 'Kicking Before Training', value: `${data.kickingBeforeCount}${data.avgBeforeDuration ? ' (avg ' + data.avgBeforeDuration + ' mins)' : ''}` },
        { label: 'Kicking After Training', value: `${data.kickingAfterCount}${data.avgAfterDuration ? ' (avg ' + data.avgAfterDuration + ' mins)' : ''}` }
    ];

    trainItems.forEach((item, i) => {
        const ty = trainY + 8 + i * 13;
        doc.setFont('helvetica', 'bold');
        doc.text(item.label + ':', RPT.margin + 8, ty);
        doc.setFont('helvetica', 'normal');
        doc.text(item.value, RPT.margin + 8 + doc.getTextWidth(item.label + ': '), ty);
    });

    // Dedication note
    if (data.trainingSessions.length > 0) {
        const dedPct = Math.round((data.kickingBeforeCount / data.trainingSessions.length) * 100);
        let dedY = trainY + 8 + trainItems.length * 13 + 2;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        if (dedPct >= 70) {
            doc.text(`Kicked before ${dedPct}% of team sessions — excellent dedication.`, RPT.margin + 8, dedY);
        } else if (dedPct >= 40) {
            doc.text(`Kicked before ${dedPct}% of team sessions — keep building the habit.`, RPT.margin + 8, dedY);
        } else if (data.kickingBeforeCount > 0) {
            doc.text(`Kicked before ${dedPct}% of team sessions — try to increase this.`, RPT.margin + 8, dedY);
        }
    }

    addPageFooter(doc, 6, 6);
}

// ── SVG → Image Pitch Renderer ──

async function renderPitchToImage(shots, options = {}) {
    // Renders the actual app SVG pitch to a PNG data URL for embedding in PDF.
    // Options: { crop: 'attacking-half'|'full', width: 1000 }

    // 1. Clone the analytics pitch SVG from the DOM
    const srcSvg = document.getElementById('analyticsPitch');
    const svg = srcSvg.cloneNode(true);
    svg.removeAttribute('id');

    // 2. Remove zone overlays (we overlay zones separately via jsPDF)
    const zoneG = svg.querySelector('#zoneOverlays');
    if (zoneG) zoneG.remove();

    // 3. Remove text labels — they don't render reliably in serialised SVG
    svg.querySelectorAll('text').forEach(t => t.remove());

    // 4. Crop to attacking half if requested
    const cropAttacking = options.crop === 'attacking-half';
    if (cropAttacking) {
        svg.setAttribute('viewBox', '0 0 500 362');
    }

    // 5. Add shot markers as SVG elements
    const PITCH_X_MIN = 25 / 500 * 100;    // 5%
    const PITCH_X_MAX = 425 / 500 * 100;   // 85%
    const PITCH_Y_MIN = 40 / 725 * 100;    // 5.52%
    const PITCH_Y_MAX = 684 / 725 * 100;   // 94.34%

    shots.forEach(shot => {
        if (typeof shot.x !== 'number' || typeof shot.y !== 'number' ||
            isNaN(shot.x) || isNaN(shot.y)) return;
        let sx = shot.x, sy = shot.y;
        // Mirror far-end shots to attacking half (same as analytics.js)
        if (sy >= 50) {
            sx = PITCH_X_MIN + PITCH_X_MAX - sx;
            sy = PITCH_Y_MIN + PITCH_Y_MAX - sy;
        }
        // Convert percentage coords to SVG viewBox coords (0-500 x 0-725)
        const svgX = (sx / 100) * 500;
        const svgY = (sy / 100) * 725;

        const isScored = shot.result === 'scored';
        const isGoal = shot.shotFor === 'goal';

        if (isGoal) {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', svgX - 6);
            rect.setAttribute('y', svgY - 6);
            rect.setAttribute('width', 12);
            rect.setAttribute('height', 12);
            rect.setAttribute('fill', isScored ? 'white' : '#f44336');
            rect.setAttribute('stroke', '#333');
            rect.setAttribute('stroke-width', '1.5');
            svg.appendChild(rect);
        } else {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', svgX);
            circle.setAttribute('cy', svgY);
            circle.setAttribute('r', 6);
            circle.setAttribute('fill', isScored ? 'white' : '#f44336');
            circle.setAttribute('stroke', '#333');
            circle.setAttribute('stroke-width', '1.5');
            svg.appendChild(circle);
        }
    });

    // 6. Serialise SVG → Blob → Image → Canvas → data URL
    const canvasW = options.width || 1000;
    const canvasH = cropAttacking
        ? Math.round(canvasW * (362 / 500))
        : Math.round(canvasW * (725 / 500));

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = canvasW;
            canvas.height = canvasH;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvasW, canvasH);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to render pitch SVG to image'));
        };
        img.src = url;
    });
}

// ── Drawing Helpers ──

function generateMatchInsights(data) {
    const insights = [];
    const mRows = data.matchRows;
    if (mRows.length === 0) return insights;

    // Best game (highest conv%, min 3 shots)
    const qualifying = mRows.filter(r => r.total >= 3);
    if (qualifying.length > 0) {
        const best = qualifying.reduce((a, b) => (b.scored / b.total) > (a.scored / a.total) ? b : a);
        const bestPct = Math.round((best.scored / best.total) * 100);
        insights.push(`Best game: ${best.session.name || 'Match'} (${formatDate(best.session.date)}) — ${bestPct}% (${best.scored}/${best.total}).`);

        if (qualifying.length > 1) {
            const worst = qualifying.reduce((a, b) => (b.scored / b.total) < (a.scored / a.total) ? b : a);
            if (worst !== best) {
                const worstPct = Math.round((worst.scored / worst.total) * 100);
                insights.push(`Toughest game: ${worst.session.name || 'Match'} (${formatDate(worst.session.date)}) — ${worstPct}% (${worst.scored}/${worst.total}).`);
            }
        }
    }

    // Trend direction (improving/declining across the month)
    if (mRows.length >= 3) {
        const rates = mRows.map(r => r.total > 0 ? (r.scored / r.total) * 100 : 0);
        const firstHalf = rates.slice(0, Math.floor(rates.length / 2));
        const secondHalf = rates.slice(Math.floor(rates.length / 2));
        const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        if (avgSecond - avgFirst > 5) insights.push('Conversion trending upward through the month.');
        else if (avgFirst - avgSecond > 5) insights.push('Conversion dipped towards end of month.');
    }

    // In-play vs placed gap
    const matchIP = data.matchShots.filter(s => s.shotCategory === 'in-play');
    const matchPl = data.matchShots.filter(s => s.shotCategory === 'free-kick' || s.shotCategory === '45');
    if (matchIP.length >= 3 && matchPl.length >= 3) {
        const ipConv = (matchIP.filter(s => s.result === 'scored').length / matchIP.length) * 100;
        const plConv = (matchPl.filter(s => s.result === 'scored').length / matchPl.length) * 100;
        if (ipConv > plConv + 15) insights.push(`Stronger from play (${Math.round(ipConv)}%) than placed balls (${Math.round(plConv)}%).`);
        else if (plConv > ipConv + 15) insights.push(`Stronger from placed balls (${Math.round(plConv)}%) than in-play (${Math.round(ipConv)}%).`);
    }

    return insights;
}

function drawZoneHeatmap(doc, px, py, pw, ph, zoneData) {
    // Zone layout on the pitch (attacking half):
    // Zone 7 (Close Left), Zone 8 (Close Centre), Zone 9 (Close Right) - top band
    // Zone 6 (Inside 35m Arc) - inside arc area
    // Zone 5 (35m-40m Arc) - arc band
    // Zone 2 (Left Wing), Zone 3 (Centre 40-45), Zone 4 (Right Wing) - bottom band
    // Zone 1 (Outside 45m) - everything beyond 45m line

    const zones = [
        { id: 7, x: px, y: py, w: pw * 0.3, h: ph * 0.22 },
        { id: 8, x: px + pw * 0.3, y: py, w: pw * 0.4, h: ph * 0.22 },
        { id: 9, x: px + pw * 0.7, y: py, w: pw * 0.3, h: ph * 0.22 },
        { id: 6, x: px + pw * 0.2, y: py + ph * 0.22, w: pw * 0.6, h: ph * 0.2 },
        { id: 5, x: px + pw * 0.15, y: py + ph * 0.42, w: pw * 0.7, h: ph * 0.12 },
        { id: 2, x: px, y: py + ph * 0.54, w: pw * 0.3, h: ph * 0.15 },
        { id: 3, x: px + pw * 0.3, y: py + ph * 0.54, w: pw * 0.4, h: ph * 0.15 },
        { id: 4, x: px + pw * 0.7, y: py + ph * 0.54, w: pw * 0.3, h: ph * 0.15 },
        { id: 1, x: px, y: py + ph * 0.69, w: pw, h: ph * 0.31 }
    ];

    // Blend zone colours with pitch green for a translucent-like effect
    function blendWithGreen(rgb, alpha) {
        const bg = RPT.pitchGreen;
        return [
            Math.round(rgb[0] * alpha + bg[0] * (1 - alpha)),
            Math.round(rgb[1] * alpha + bg[1] * (1 - alpha)),
            Math.round(rgb[2] * alpha + bg[2] * (1 - alpha))
        ];
    }

    zones.forEach(zone => {
        const zd = zoneData[zone.id];
        const convPct = zd.total > 0 ? Math.round((zd.scored / zd.total) * 100) : -1;
        let baseColor;
        if (convPct < 0) baseColor = RPT.grey;
        else if (convPct >= 70) baseColor = RPT.green;
        else if (convPct >= 50) baseColor = RPT.yellowGreen;
        else if (convPct >= 30) baseColor = RPT.orange;
        else baseColor = RPT.red;

        // Draw zone overlay blended with pitch green
        const blended = blendWithGreen(baseColor, 0.55);
        doc.setFillColor(...blended);
        doc.rect(zone.x, zone.y, zone.w, zone.h, 'F');

        // Zone text
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        const cx = zone.x + zone.w / 2;
        const cy = zone.y + zone.h / 2;
        if (zd.total > 0) {
            doc.text(`${convPct}%`, cx, cy - 1, { align: 'center' });
            doc.setFontSize(6);
            doc.setFont('helvetica', 'normal');
            doc.text(`${zd.scored}/${zd.total}`, cx, cy + 4, { align: 'center' });
        } else {
            doc.setFontSize(7);
            doc.text('-', cx, cy + 1, { align: 'center' });
        }
    });
}

function drawLineChart(doc, x, y, w, h, points, opts) {
    if (points.length < 2) return;
    const maxY = opts.maxY || Math.max(...points.map(p => p.value), 1);
    const minY = 0;
    const padL = 10;
    const padR = 5;
    const padT = 5;
    const padB = 12;
    const chartX = x + padL;
    const chartY = y + padT;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    // Background
    doc.setFillColor(250, 250, 252);
    doc.roundedRect(x, y, w, h, 2, 2, 'F');

    // Grid lines
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    for (let g = 0; g <= 4; g++) {
        const gy = chartY + chartH - (g / 4) * chartH;
        doc.line(chartX, gy, chartX + chartW, gy);
        doc.setFontSize(6);
        doc.setTextColor(150, 150, 150);
        doc.text(String(Math.round((g / 4) * maxY)), x + 2, gy + 1.5);
    }

    // Plot line and points
    doc.setDrawColor(...RPT.blue);
    doc.setLineWidth(0.8);
    const coords = points.map((p, i) => ({
        px: chartX + (i / (points.length - 1)) * chartW,
        py: chartY + chartH - (p.value / maxY) * chartH
    }));

    for (let i = 1; i < coords.length; i++) {
        doc.line(coords[i - 1].px, coords[i - 1].py, coords[i].px, coords[i].py);
    }

    // Points
    coords.forEach((c, i) => {
        doc.setFillColor(...RPT.blue);
        doc.circle(c.px, c.py, 1.5, 'F');
        // Value labels
        doc.setFontSize(6);
        doc.setTextColor(...RPT.blue);
        doc.text(String(points[i].value), c.px, c.py - 3, { align: 'center' });
    });

    // X-axis labels
    doc.setFontSize(5);
    doc.setTextColor(120, 120, 120);
    const maxLabels = Math.min(points.length, 8);
    const step = Math.max(1, Math.floor(points.length / maxLabels));
    for (let i = 0; i < points.length; i += step) {
        const label = points[i].label.substring(0, 8);
        doc.text(label, coords[i].px, chartY + chartH + 8, { align: 'center' });
    }
}

function drawStatBox(doc, x, y, w, h, value, label) {
    doc.setFillColor(...RPT.lightBg);
    doc.roundedRect(x, y, w, h, 3, 3, 'F');
    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, 3, 3, 'S');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RPT.blue);
    doc.text(value, x + w / 2, y + h / 2 - 1, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(label, x + w / 2, y + h / 2 + 7, { align: 'center' });
}

function drawArrowIndicator(doc, x, y, size, current, prev, label) {
    const diff = current - prev;
    doc.setFillColor(...RPT.lightBg);
    doc.roundedRect(x, y, size, size + 8, 2, 2, 'F');

    let color;
    if (diff > 0) { color = RPT.green; }
    else if (diff < 0) { color = RPT.red; }
    else { color = RPT.grey; }

    // Draw arrow shape since Helvetica doesn't support Unicode arrows
    const cx = x + size / 2;
    const ay = y + 8;
    doc.setDrawColor(...color);
    doc.setFillColor(...color);
    doc.setLineWidth(0.8);
    if (diff > 0) {
        // Up arrow
        doc.line(cx, ay + 6, cx, ay - 2);
        doc.triangle(cx - 3, ay, cx, ay - 4, cx + 3, ay, 'F');
    } else if (diff < 0) {
        // Down arrow
        doc.line(cx, ay - 2, cx, ay + 6);
        doc.triangle(cx - 3, ay + 4, cx, ay + 8, cx + 3, ay + 4, 'F');
    } else {
        // Right arrow (no change)
        doc.line(cx - 4, ay + 2, cx + 4, ay + 2);
        doc.triangle(cx + 2, ay - 1, cx + 6, ay + 2, cx + 2, ay + 5, 'F');
    }

    doc.setFontSize(8);
    doc.setTextColor(...RPT.text);
    const diffStr = diff > 0 ? `+${diff}` : diff === 0 ? '0' : String(diff);
    doc.text(diffStr, x + size / 2, y + 18, { align: 'center' });

    doc.setFontSize(5);
    doc.setTextColor(120, 120, 120);
    const shortLabel = label.replace(' %', '').substring(0, 10);
    doc.text(shortLabel, x + size / 2, y + size + 5, { align: 'center' });
}

function drawArc(doc, cx, cy, radius, startAngle, endAngle, steps) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
        const angle = startAngle + (endAngle - startAngle) * (i / steps);
        pts.push({
            x: cx + radius * Math.cos(angle),
            y: cy + radius * Math.sin(angle)
        });
    }
    for (let i = 1; i < pts.length; i++) {
        doc.line(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
    }
}

// ── Utility Helpers ──

function addPageHeader(doc, pageNum, monthLabel, title) {
    doc.setFillColor(...RPT.blue);
    doc.rect(0, 0, RPT.pageW, 28, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RPT.white);
    doc.text(title, RPT.margin, 14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(monthLabel, RPT.pageW - RPT.margin, 14, { align: 'right' });
    doc.setDrawColor(...RPT.blue);
    doc.setLineWidth(0.5);
    doc.line(RPT.margin, 28, RPT.pageW - RPT.margin, 28);
}

function addPageFooter(doc, pageNum, totalPages) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${pageNum} of ${totalPages}`, RPT.pageW / 2, RPT.pageH - 8, { align: 'center' });
    doc.text('Kick On', RPT.margin, RPT.pageH - 8);
}

function generateInsights(data) {
    const strengths = [];
    const improvements = [];

    // Best/worst zone by conversion rate (min 3 shots)
    let bestZone = null, worstZone = null;
    let bestZoneConv = -1, worstZoneConv = 101;
    const zoneNames = {
        1: 'Outside 45m', 2: 'Left Wing', 3: 'Centre 40m-45m',
        4: 'Right Wing', 5: '35m-40m Arc', 6: 'Inside 35m Arc',
        7: 'Close Left', 8: 'Close Centre', 9: 'Close Right'
    };
    for (let z = 1; z <= 9; z++) {
        const zd = data.zoneData[z];
        if (zd.total < 3) continue;
        const rate = (zd.scored / zd.total) * 100;
        if (rate > bestZoneConv) { bestZoneConv = rate; bestZone = z; }
        if (rate < worstZoneConv) { worstZoneConv = rate; worstZone = z; }
    }
    if (bestZone && bestZoneConv >= 50 && data.zoneData[bestZone].total > 0) {
        strengths.push(`Strong from ${zoneNames[bestZone]} — ${Math.round(bestZoneConv)}% conversion (${data.zoneData[bestZone].scored}/${data.zoneData[bestZone].total}).`);
    }
    if (worstZone && worstZone !== bestZone && worstZoneConv < 50 && data.zoneData[worstZone].total > 0) {
        improvements.push(`${zoneNames[worstZone]} needs work — only ${Math.round(worstZoneConv)}% conversion (${data.zoneData[worstZone].scored}/${data.zoneData[worstZone].total}).`);
    }

    // Foot analysis
    const rConv = data.rightShots.length >= 3 ? (data.rightScored / data.rightShots.length) * 100 : null;
    const lConv = data.leftShots.length >= 3 ? (data.leftScored / data.leftShots.length) * 100 : null;
    if (rConv !== null && rConv > 70) strengths.push(`Excellent right foot accuracy at ${Math.round(rConv)}%.`);
    if (lConv !== null && lConv > 70) strengths.push(`Excellent left foot accuracy at ${Math.round(lConv)}%.`);
    if (rConv !== null && rConv < 45) improvements.push(`Right foot conversion is below par at ${Math.round(rConv)}%.`);
    if (lConv !== null && lConv < 45) improvements.push(`Left foot conversion is below par at ${Math.round(lConv)}%.`);
    if (rConv !== null && lConv !== null && Math.abs(rConv - lConv) > 20) {
        const weak = rConv < lConv ? 'right' : 'left';
        improvements.push(`Imbalance between feet — work on your ${weak} foot to close the gap.`);
    }

    // Placed ball vs in-play
    const ipConv = data.inPlayShots.length >= 3 ? (data.inPlayScored / data.inPlayShots.length) * 100 : null;
    const plConv = data.placedShots.length >= 3 ? (data.placedScored / data.placedShots.length) * 100 : null;
    if (plConv !== null && plConv > 75) strengths.push(`Very reliable from placed balls at ${Math.round(plConv)}%.`);
    if (ipConv !== null && plConv !== null && Math.abs(ipConv - plConv) > 15) {
        if (ipConv < plConv) {
            improvements.push(`In-play shooting (${Math.round(ipConv)}%) lags behind placed balls (${Math.round(plConv)}%) — practise shooting under pressure.`);
        } else {
            improvements.push(`Placed ball conversion (${Math.round(plConv)}%) is lower than in-play (${Math.round(ipConv)}%) — work on free-taking routine.`);
        }
    }

    // Month-over-month change
    if (data.prevShots.length >= 5 && data.allShots.length >= 5) {
        const curConv = (data.allShots.filter(s => s.result === 'scored').length / data.allShots.length) * 100;
        const prevConv = (data.prevShots.filter(s => s.result === 'scored').length / data.prevShots.length) * 100;
        const diff = curConv - prevConv;
        if (diff > 5) strengths.push(`Overall conversion improved by ${Math.round(diff)}% compared to last month.`);
        if (diff < -5) improvements.push(`Overall conversion dropped by ${Math.round(Math.abs(diff))}% compared to last month.`);
    }

    // Consistency check (std dev of per-session rates)
    const sessionRates = data.monthSessions
        .filter(s => (s.shots || []).length >= 3)
        .map(s => {
            const shots = s.shots || [];
            return (shots.filter(sh => sh.result === 'scored').length / shots.length) * 100;
        });
    if (sessionRates.length >= 3) {
        const mean = sessionRates.reduce((a, b) => a + b, 0) / sessionRates.length;
        const stdDev = Math.sqrt(sessionRates.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / sessionRates.length);
        if (stdDev < 10) strengths.push(`Very consistent across sessions (low variability).`);
        if (stdDev > 20) improvements.push(`Performance varies a lot between sessions — work on consistency.`);
    }

    // Training dedication
    if (data.trainingSessions.length >= 3) {
        const dedPct = (data.kickingBeforeCount / data.trainingSessions.length) * 100;
        if (dedPct >= 70) strengths.push(`Kicked before ${Math.round(dedPct)}% of team training sessions — great extra work.`);
        else if (dedPct < 30) improvements.push(`Only kicked before ${Math.round(dedPct)}% of team sessions — try to get out early more often.`);
    }

    return { strengths, improvements };
}

function getMonthLabel(yyyy, mm) {
    const names = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return `${names[mm - 1]} ${yyyy}`;
}

function conv(scored, total) {
    return total > 0 ? Math.round((scored / total) * 100) : 0;
}

function calcPtsPerShot(shots) {
    if (shots.length === 0) return 0;
    let pts = 0;
    shots.forEach(s => {
        if (s.result !== 'scored') return;
        const pv = s.pointValue || 1;
        if (s.shotFor === 'goal') pts += 3;
        else pts += pv;
    });
    return pts / shots.length;
}

function calcMatchScore(shots) {
    let goals = 0, totalPoints = 0;
    shots.forEach(s => {
        if (s.result !== 'scored') return;
        const pv = s.pointValue || 1;
        if (pv === 3 || s.shotFor === 'goal') goals++;
        else totalPoints += pv;
    });
    return `${goals}-${String(totalPoints).padStart(2, '0')}`;
}

function formatMatchType(mt) {
    if (!mt) return '-';
    const map = { league: 'League', championship: 'Championship', friendly: 'Friendly', custom: 'Other' };
    return map[mt] || mt;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}`;
}
