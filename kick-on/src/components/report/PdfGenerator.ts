/**
 * Monthly Report PDF Generator — Next.js port of report.js
 *
 * Single async export: generateMonthlyReport()
 * Uses dynamic imports for jsPDF + jspdf-autotable (no SSR).
 *
 * Reuses lib/zones.ts and lib/stats.ts instead of duplicating calculations.
 */

import type { Session, Shot, TrainingLog } from '@/types';

// We avoid `import type { jsPDF } from 'jspdf'` because Turbopack resolves
// the module even for type-only imports, triggering the optional `canvg` dep.
// Instead we define a local alias resolved at runtime from the dynamic import.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type jsPDF = any;
import {
  getZone,
  ZONE_NAMES,
  PITCH,
  PITCH_PCT,
  mirrorToAttackingHalf,
} from '@/lib/zones';
import {
  conversionRate,
  pointsPerShot,
  convCell,
  scoredCount,
  shotsByFoot,
  shotsByCategory,
} from '@/lib/stats';

// ---------------------------------------------------------------------------
// Colour constants (same as report.js lines 7-22)
// ---------------------------------------------------------------------------

const RPT = {
  blue:        [42, 82, 152]  as const,
  darkBlue:    [30, 60, 114]  as const,
  green:       [76, 175, 80]  as const,
  red:         [244, 67, 54]  as const,
  orange:      [255, 152, 0]  as const,
  lightBg:     [240, 244, 248] as const,
  text:        [51, 51, 51]   as const,
  white:       [255, 255, 255] as const,
  pitchGreen:  [90, 157, 111] as const,
  grey:        [158, 158, 158] as const,
  yellowGreen: [180, 210, 60] as const,
  pageW: 210,
  pageH: 297,
  margin: 15,
} as const;

type RGB = readonly [number, number, number];

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface ReportParams {
  sessions: Session[];
  trainingLogs: TrainingLog[];
  playerName: string;
  playerClub: string;
  playerPosition: string;
  yyyy: number;
  mm: number;
}

interface ShotCtx extends Shot {
  sessionId: number | string;
  sessionType: 'practice' | 'match';
  sessionDate: string;
  sessionName: string;
}

interface MatchRow {
  session: Session;
  scored: number;
  total: number;
  inPlaySc: number;
  inPlayTotal: number;
  placedSc: number;
  placedTotal: number;
  onePtSc: number;
  onePtTotal: number;
  twoPtSc: number;
  twoPtTotal: number;
  goalsSc: number;
  goalsTotal: number;
  ptsPerShot: number;
  totalPtsValue: number;
  inPlayPtsValue: number;
}

interface ZoneData {
  [zone: number]: { scored: number; total: number };
}

interface ReportData {
  yyyy: number;
  mm: number;
  prefix: string;
  monthSessions: Session[];
  matches: Session[];
  practices: Session[];
  allShots: ShotCtx[];
  matchShots: ShotCtx[];
  practiceShots: ShotCtx[];
  prevSessions: Session[];
  prevShots: ShotCtx[];
  prevLogs: TrainingLog[];
  prevMatches: Session[];
  prevPractices: Session[];
  prevRight: Shot[];
  prevLeft: Shot[];
  prevInPlay: Shot[];
  prevPlaced: Shot[];
  zoneData: ZoneData;
  rightShots: Shot[];
  leftShots: Shot[];
  rightScored: number;
  leftScored: number;
  inPlayShots: Shot[];
  placedShots: Shot[];
  freeShots: Shot[];
  fortyFiveShots: Shot[];
  inPlayScored: number;
  placedScored: number;
  matchInPlayRight: Shot[];
  matchInPlayLeft: Shot[];
  matchInPlayRightScored: number;
  matchInPlayLeftScored: number;
  matchRows: MatchRow[];
  monthLogs: TrainingLog[];
  trainingSessions: TrainingLog[];
  gymSessions: TrainingLog[];
  recoverySessions: TrainingLog[];
  kickingBeforeCount: number;
  kickingAfterCount: number;
  avgBeforeDuration: number;
  avgAfterDuration: number;
  playerName: string;
  playerClub: string;
  playerPosition: string;
}

interface ChartPoint {
  label: string;
  value: number;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function generateMonthlyReport(params: ReportParams): Promise<void> {
  const { jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const data = collectReportData(params);
  if (data.allShots.length === 0 && data.monthSessions.length === 0 && data.monthLogs.length === 0) {
    throw new Error('No data found for this month. Cannot generate report.');
  }

  const monthLabel = getMonthLabel(data.yyyy, data.mm);

  // Pre-render pitch images
  const matchPitchImage = await renderPitchToImage(data.matchShots, {
    crop: 'attacking-half',
    width: 1000,
  });
  const heatmapPitchImage = await renderPitchToImage([], {
    crop: 'attacking-half',
    width: 1000,
  });

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
  doc.save(`KickOn_Report_${safeName}_${monthNames[data.mm - 1]}_${data.yyyy}.pdf`);
}

// ---------------------------------------------------------------------------
// Data collection (port of report.js collectReportData)
// ---------------------------------------------------------------------------

function collectReportData(params: ReportParams): ReportData {
  const { sessions, trainingLogs, playerName, playerClub, playerPosition, yyyy, mm } = params;
  const prefix = `${yyyy}-${String(mm).padStart(2, '0')}`;
  const monthSessions = sessions.filter(s => s.date && s.date.startsWith(prefix));
  const matches = monthSessions.filter(s => s.type === 'match');
  const practices = monthSessions.filter(s => s.type === 'practice');

  const allShots: ShotCtx[] = [];
  monthSessions.forEach(s => {
    (s.shots || []).forEach(shot => {
      allShots.push({ ...shot, sessionId: s.id, sessionType: s.type, sessionDate: s.date, sessionName: s.name });
    });
  });
  const matchShots = allShots.filter(s => s.sessionType === 'match');
  const practiceShots = allShots.filter(s => s.sessionType === 'practice');

  // Previous month
  const prevDate = new Date(yyyy, mm - 2, 1);
  const prevPrefix = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const prevSessions = sessions.filter(s => s.date && s.date.startsWith(prevPrefix));
  const prevShots: ShotCtx[] = [];
  prevSessions.forEach(s => {
    (s.shots || []).forEach(shot => {
      prevShots.push({ ...shot, sessionId: s.id, sessionType: s.type, sessionDate: s.date, sessionName: s.name });
    });
  });
  const prevLogs = trainingLogs.filter(l => l.date && l.date.startsWith(prevPrefix));

  // Zone data — reuse getZone from zones.ts
  const zoneData: ZoneData = {};
  for (let z = 1; z <= 9; z++) zoneData[z] = { scored: 0, total: 0 };
  allShots.forEach(shot => {
    if (typeof shot.x !== 'number' || typeof shot.y !== 'number' || isNaN(shot.x) || isNaN(shot.y)) return;
    const zi = getZone(shot.x, shot.y);
    if (!zi || zi.zone < 1 || zi.zone > 9) return;
    zoneData[zi.zone].total++;
    if (shot.result === 'scored') zoneData[zi.zone].scored++;
  });

  // Foot splits — reuse shotsByFoot from stats.ts
  const rightShots = shotsByFoot(allShots, 'right');
  const leftShots = shotsByFoot(allShots, 'left');
  const rightScored = scoredCount(rightShots);
  const leftScored = scoredCount(leftShots);

  // Category splits — reuse shotsByCategory from stats.ts
  const inPlayShots = shotsByCategory(allShots, 'in-play');
  const freeShots = shotsByCategory(allShots, 'free-kick');
  const fortyFiveShots = shotsByCategory(allShots, '45');
  const placedShots = [...freeShots, ...fortyFiveShots];
  const inPlayScored = scoredCount(inPlayShots);
  const placedScored = scoredCount(placedShots);

  // Match-specific in-play foot splits
  const matchInPlayShots = shotsByCategory(matchShots, 'in-play');
  const matchInPlayRight = shotsByFoot(matchInPlayShots, 'right');
  const matchInPlayLeft = shotsByFoot(matchInPlayShots, 'left');
  const matchInPlayRightScored = scoredCount(matchInPlayRight);
  const matchInPlayLeftScored = scoredCount(matchInPlayLeft);

  // Per-match breakdown rows
  const matchRows: MatchRow[] = [...matches].sort((a, b) => a.date.localeCompare(b.date)).map(m => {
    const shots = m.shots || [];
    const scored = scoredCount(shots);
    const total = shots.length;
    const inPlay = shotsByCategory(shots, 'in-play');
    const inPlaySc = scoredCount(inPlay);
    const placed = shots.filter(s => s.shotCategory === 'free-kick' || s.shotCategory === '45');
    const placedSc = scoredCount(placed);
    const onePt = shots.filter(s => (s.pointValue === 1 || !s.pointValue) && s.shotFor !== 'goal');
    const onePtSc = scoredCount(onePt);
    const twoPt = shots.filter(s => s.pointValue === 2 && s.shotFor !== 'goal');
    const twoPtSc = scoredCount(twoPt);
    const goals = shots.filter(s => s.shotFor === 'goal');
    const goalsSc = scoredCount(goals);
    const pps = total > 0 ? (onePtSc * 1 + twoPtSc * 2 + goalsSc * 3) / total : 0;
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
      ptsPerShot: pps, totalPtsValue, inPlayPtsValue,
    };
  });

  // Training logs
  const monthLogs = trainingLogs.filter(l => l.date && l.date.startsWith(prefix));
  const trainingSessions = monthLogs.filter(l => l.sessionType === 'training');
  const gymSessions = monthLogs.filter(l => l.sessionType === 'gym');
  const recoverySessions = monthLogs.filter(l => l.sessionType === 'recovery');
  const kickingBeforeCount = trainingSessions.filter(l => l.kickingBefore).length;
  const kickingAfterCount = trainingSessions.filter(l => l.kickingAfter).length;
  const beforeDurations = trainingSessions.filter(l => l.kickingBefore && l.beforeDuration).map(l => l.beforeDuration!);
  const afterDurations = trainingSessions.filter(l => l.kickingAfter && l.afterDuration).map(l => l.afterDuration!);
  const avgBeforeDuration = beforeDurations.length > 0 ? Math.round(beforeDurations.reduce((a, b) => a + b, 0) / beforeDurations.length) : 0;
  const avgAfterDuration = afterDurations.length > 0 ? Math.round(afterDurations.reduce((a, b) => a + b, 0) / afterDurations.length) : 0;

  // Previous month splits (use inline filters to preserve ShotCtx type)
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
    playerName, playerClub, playerPosition,
  };
}

// ---------------------------------------------------------------------------
// Page 1: Cover
// ---------------------------------------------------------------------------

function renderCoverPage(doc: jsPDF, data: ReportData, monthLabel: string): void {
  // Dark blue header band
  doc.setFillColor(...RPT.darkBlue);
  doc.rect(0, 0, RPT.pageW, 120, 'F');

  doc.setTextColor(...RPT.white);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('KICK ON', RPT.pageW / 2, 40, { align: 'center' });

  // Football icon
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

  // 5 stat boxes
  doc.setTextColor(...RPT.text);
  const convRate = conversionRate(data.allShots);
  const pps = pointsPerShot(data.allShots);

  const stats = [
    { value: String(data.monthSessions.length), label: 'Sessions' },
    { value: String(data.allShots.length), label: 'Total Shots' },
    { value: `${convRate}%`, label: 'Conversion' },
    { value: pps.toFixed(2), label: 'Pts/Shot' },
    { value: String(data.matches.length), label: 'Matches' },
  ];

  const boxW = 33;
  const boxH = 28;
  const gap = 4;
  const totalW = stats.length * boxW + (stats.length - 1) * gap;
  const startX = (RPT.pageW - totalW) / 2;
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

// ---------------------------------------------------------------------------
// Page 2 (+2b): Match Analysis
// ---------------------------------------------------------------------------

function renderMatchAnalysisPage(doc: jsPDF, data: ReportData, monthLabel: string, matchPitchImage: string): void {
  addPageHeader(doc, 2, monthLabel, 'Match Analysis');

  if (data.matches.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(...RPT.text);
    doc.text('No matches recorded this month.', RPT.pageW / 2, 50, { align: 'center' });
    addPageFooter(doc, 2, 6);
    return;
  }

  const mRows = data.matchRows;

  // 1. Detailed match table
  const showInPlay = mRows.some(r => r.inPlayTotal > 0);
  const showPlaced = mRows.some(r => r.placedTotal > 0);
  const showTwoPt = mRows.some(r => r.twoPtTotal > 0);
  const showGoals = mRows.some(r => r.goalsTotal > 0);

  const head: string[] = ['Date', 'Comp.', 'Opponent', 'Conv.', 'Pts/S'];
  if (showInPlay) head.push('In-Play');
  if (showPlaced) head.push('Placed');
  head.push('1Pt');
  if (showTwoPt) head.push('2Pt');
  if (showGoals) head.push('Goal');

  const bodyRows = mRows.map(r => {
    const s = r.session;
    const row = [
      formatDate(s.date),
      formatMatchType(s.matchType),
      s.name || '-',
      convCell(r.scored, r.total),
      r.ptsPerShot.toFixed(2),
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
      2: { halign: 'left' },
    },
    margin: { left: RPT.margin, right: RPT.margin },
    didParseCell: function(hookData: { row: { index: number }; section: string; cell: { styles: { fontStyle: string; fillColor: number[] } } }) {
      if (mRows.length > 1 && hookData.row.index === totalBodyRows - 1 && hookData.section === 'body') {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [220, 230, 245];
      }
    },
  });

  let curY = doc.lastAutoTable.finalY + 6;

  // 2. Foot Breakdown (In-Play Only) + Shot Categories
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
  const matchFreeShots = shotsByCategory(data.matchShots, 'free-kick');
  const match45Shots = shotsByCategory(data.matchShots, '45');
  const matchInPlayAll = shotsByCategory(data.matchShots, 'in-play');
  const cats = [
    { label: 'In-Play', scored: scoredCount(matchInPlayAll), total: matchInPlayAll.length, color: RPT.blue },
    { label: 'Free-kick', scored: scoredCount(matchFreeShots), total: matchFreeShots.length, color: RPT.green },
    { label: '45s', scored: scoredCount(match45Shots), total: match45Shots.length, color: RPT.orange },
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

  // 3. Averages
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
    { value: `${avgConv}%`, label: 'Avg Conv.' },
  ];
  const aBoxW = 38;
  const aGap = 5;
  const aTotalW = avgStats.length * aBoxW + (avgStats.length - 1) * aGap;
  const aStartX = (RPT.pageW - aTotalW) / 2;
  avgStats.forEach((stat, i) => {
    drawStatBox(doc, aStartX + i * (aBoxW + aGap), curY, aBoxW, 18, stat.value, stat.label);
  });
  curY += 24;

  // 4. Shot Map
  const shotMapH = 52;
  const shotMapW = 70;
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

  // 5. Match Insights (beside the shot map)
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
      lines.forEach((line: string) => {
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
      lines.forEach((line: string) => {
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
    lines.forEach((line: string) => {
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
    const points: ChartPoint[] = mRows.map(r => ({
      label: r.session.name || 'Match',
      value: r.total > 0 ? Math.round((r.scored / r.total) * 100) : 0,
    }));
    drawLineChart(doc, RPT.margin, curY, RPT.pageW - RPT.margin * 2, 40, points, { yLabel: '%', maxY: 100 });
    curY += 44;
  }

  addPageFooter(doc, 2, 6);
}

// ---------------------------------------------------------------------------
// Page 3: Practice Analysis
// ---------------------------------------------------------------------------

function renderPracticeAnalysisPage(doc: jsPDF, data: ReportData, monthLabel: string): void {
  addPageHeader(doc, 3, monthLabel, 'Practice Analysis');

  if (data.practices.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(...RPT.text);
    doc.text('No practice sessions recorded this month.', RPT.pageW / 2, 50, { align: 'center' });
    addPageFooter(doc, 3, 6);
    return;
  }

  // Overview stats
  const practiceConv = conversionRate(data.practiceShots);
  let curY = 38;
  const overviewStats = [
    { value: String(data.practices.length), label: 'Sessions' },
    { value: String(data.practiceShots.length), label: 'Total Shots' },
    { value: `${practiceConv}%`, label: 'Conversion' },
  ];
  const oBoxW = 45;
  const oGap = 8;
  const oTotalW = overviewStats.length * oBoxW + (overviewStats.length - 1) * oGap;
  const oStartX = (RPT.pageW - oTotalW) / 2;
  overviewStats.forEach((stat, i) => {
    drawStatBox(doc, oStartX + i * (oBoxW + oGap), curY, oBoxW, 24, stat.value, stat.label);
  });
  curY += 34;

  // Drill breakdown
  const drillMap: Record<string, { name: string; sessions: Set<number | string>; shots: number; scored: number }> = {};
  data.practices.forEach(session => {
    (session.shots || []).forEach(shot => {
      const key = shot.drillKey || 'General';
      if (!drillMap[key]) drillMap[key] = { name: key, sessions: new Set(), shots: 0, scored: 0 };
      drillMap[key].sessions.add(session.id);
      drillMap[key].shots++;
      if (shot.result === 'scored') drillMap[key].scored++;
    });
  });

  const drillRows = Object.entries(drillMap)
    .sort((a, b) => b[1].shots - a[1].shots)
    .map(([, d]) => [
      d.name,
      String(d.sessions.size),
      String(d.shots),
      d.shots > 0 ? Math.round((d.scored / d.shots) * 100) + '%' : '-',
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
        3: { cellWidth: 25 },
      },
      margin: { left: RPT.margin, right: RPT.margin },
    });
    curY = doc.lastAutoTable.finalY + 8;
  }

  // Best practice session
  let bestSession: Session | null = null;
  let bestConv = -1;
  data.practices.forEach(session => {
    const shots = session.shots || [];
    if (shots.length < 5) return;
    const scored = scoredCount(shots);
    const rate = scored / shots.length;
    if (rate > bestConv) {
      bestConv = rate;
      bestSession = session;
    }
  });

  if (bestSession && curY < 250) {
    const bs = bestSession as Session;
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
    const bShots = bs.shots || [];
    const bScored = scoredCount(bShots);
    doc.text(`${formatDate(bs.date)} — ${bs.name || 'Practice'}`, RPT.margin + 5, curY + 8);
    doc.text(`${bScored}/${bShots.length} (${Math.round(bestConv * 100)}%)`, RPT.margin + 5, curY + 15);
  }

  addPageFooter(doc, 3, 6);
}

// ---------------------------------------------------------------------------
// Page 4: Insights
// ---------------------------------------------------------------------------

function renderInsightsPage(doc: jsPDF, data: ReportData, monthLabel: string): void {
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
  const didWellNotes = data.monthSessions.filter(s => s.didWell).slice(0, 5);

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
      const lines: string[] = doc.splitTextToSize(noteText, RPT.pageW - RPT.margin * 2 - 14);
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
      const lines: string[] = doc.splitTextToSize(s, RPT.pageW - RPT.margin * 2 - 16);
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
  const toImproveNotes = data.monthSessions.filter(s => s.toImprove).slice(0, 5);

  doc.setFontSize(9);
  doc.setTextColor(...RPT.text);

  if (toImproveNotes.length > 0) {
    doc.setFont('helvetica', 'bolditalic');
    doc.text('Your notes:', RPT.margin + 6, curY);
    curY += 5;
    doc.setFont('helvetica', 'italic');
    toImproveNotes.forEach(s => {
      const noteText = `${formatDate(s.date)}: "${s.toImprove}"`;
      const lines: string[] = doc.splitTextToSize(noteText, RPT.pageW - RPT.margin * 2 - 14);
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
      const lines: string[] = doc.splitTextToSize(s, RPT.pageW - RPT.margin * 2 - 16);
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

// ---------------------------------------------------------------------------
// Page 5: Comparison
// ---------------------------------------------------------------------------

function renderComparisonPage(doc: jsPDF, data: ReportData, monthLabel: string): void {
  addPageHeader(doc, 5, monthLabel, 'Month-on-Month Comparison');

  const prevMonthLabel = getMonthLabel(
    data.mm === 1 ? data.yyyy - 1 : data.yyyy,
    data.mm === 1 ? 12 : data.mm - 1,
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
  const curScored = scoredCount(data.allShots);
  const prevScored = scoredCount(data.prevShots);
  const curConv = conversionRate(data.allShots);
  const prevConv = conversionRate(data.prevShots);

  const curRightConv = conversionRate(data.rightShots);
  const prevRightConv = conversionRate(data.prevRight);

  const curLeftConv = conversionRate(data.leftShots);
  const prevLeftConv = conversionRate(data.prevLeft);

  const curInPlayConv = conversionRate(data.inPlayShots);
  const prevInPlayConv = conversionRate(data.prevInPlay);

  const curPlacedConv = conversionRate(data.placedShots);
  const prevPlacedConv = conversionRate(data.prevPlaced);

  // Suppress unused variable warnings — these are needed to validate data flow
  void curScored;
  void prevScored;

  const metrics = [
    { name: 'Matches', cur: data.matches.length, prev: data.prevMatches.length, isPct: false },
    { name: 'Practices', cur: data.practices.length, prev: data.prevPractices.length, isPct: false },
    { name: 'Total Shots', cur: data.allShots.length, prev: data.prevShots.length, isPct: false },
    { name: 'Conversion %', cur: curConv, prev: prevConv, isPct: true },
    { name: 'Right Foot %', cur: curRightConv, prev: prevRightConv, isPct: true },
    { name: 'Left Foot %', cur: curLeftConv, prev: prevLeftConv, isPct: true },
    { name: 'In-Play %', cur: curInPlayConv, prev: prevInPlayConv, isPct: true },
    { name: 'Placed Ball %', cur: curPlacedConv, prev: prevPlacedConv, isPct: true },
    { name: 'Total Sessions', cur: data.monthSessions.length, prev: data.prevSessions.length, isPct: false },
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
      3: { cellWidth: 35 },
    },
    margin: { left: RPT.margin + 15, right: RPT.margin + 15 },
    didParseCell: function(hookData: { column: { index: number }; section: string; cell: { raw: string; styles: { textColor: readonly number[]; fontStyle: string } } }) {
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
    },
  });

  // Arrow summary boxes beneath table
  let arrowY = doc.lastAutoTable.finalY + 12;
  const keyMetrics = metrics.filter(m => m.isPct);
  const boxSize = 30;
  const arrowGap = 6;
  const arrowTotalW = keyMetrics.length * boxSize + (keyMetrics.length - 1) * arrowGap;
  const arrowStartX = (RPT.pageW - arrowTotalW) / 2;

  keyMetrics.forEach((m, i) => {
    const bx = arrowStartX + i * (boxSize + arrowGap);
    drawArrowIndicator(doc, bx, arrowY, boxSize, m.cur, m.prev, m.name);
  });

  addPageFooter(doc, 5, 6);
}

// ---------------------------------------------------------------------------
// Page 6: Heatmap & Training Log
// ---------------------------------------------------------------------------

function renderHeatmapPage(doc: jsPDF, data: ReportData, monthLabel: string, heatmapPitchImage: string): void {
  addPageHeader(doc, 6, monthLabel, 'Shot Heatmap & Training');

  const pitchX = 30;
  const pitchY = 38;
  const pitchW = 130;
  const pitchH = Math.round(pitchW * (362 / 500));

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
  const legendItems: { color: RGB; label: string }[] = [
    { color: RPT.green, label: '70%+' },
    { color: RPT.yellowGreen, label: '50-69%' },
    { color: RPT.orange, label: '30-49%' },
    { color: RPT.red, label: '<30%' },
    { color: RPT.grey, label: 'No shots' },
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
    { label: 'Kicking After Training', value: `${data.kickingAfterCount}${data.avgAfterDuration ? ' (avg ' + data.avgAfterDuration + ' mins)' : ''}` },
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
    const dedY = trainY + 8 + trainItems.length * 13 + 2;
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

// ---------------------------------------------------------------------------
// SVG Pitch Builder (programmatic, no DOM dependency on SvgPitch.tsx)
// ---------------------------------------------------------------------------

function buildPitchSvg(attackingHalfOnly: boolean): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('xmlns', ns);
  svg.setAttribute('viewBox', attackingHalfOnly ? '0 0 500 362' : '0 0 500 725');

  function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>): SVGElementTagNameMap[K] {
    const e = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  }

  // Background
  svg.appendChild(el('rect', { width: '500', height: '725', fill: '#5a9d6f' }));

  // Pitch boundary
  svg.appendChild(el('rect', {
    x: '25', y: '40', width: '400', height: '644',
    fill: 'none', stroke: 'white', 'stroke-width': '1.5',
  }));

  // Halfway line
  svg.appendChild(el('line', {
    x1: '25', y1: '362', x2: '425', y2: '362',
    stroke: 'white', 'stroke-width': '2.5', 'stroke-dasharray': '10,5',
  }));

  // 13m line
  svg.appendChild(el('line', { x1: '25', y1: '98', x2: '425', y2: '98', stroke: 'white', 'stroke-width': '1' }));

  // Goal area
  svg.appendChild(el('rect', {
    x: '175', y: '40', width: '100', height: '58',
    fill: 'none', stroke: 'white', 'stroke-width': '1',
  }));

  // 20m line
  svg.appendChild(el('line', { x1: '25', y1: '129', x2: '425', y2: '129', stroke: 'white', 'stroke-width': '1' }));

  // 40m arc
  svg.appendChild(el('path', {
    d: 'M 71 129 A 178 178 0 0 0 379 129',
    fill: 'none', stroke: 'white', 'stroke-width': '1',
  }));

  // 21m arc
  svg.appendChild(el('path', {
    d: 'M 167 129 A 58 58 0 0 0 283 129',
    fill: 'none', stroke: 'white', 'stroke-width': '1',
  }));

  // Penalty spot
  svg.appendChild(el('circle', { cx: '225', cy: '89', r: '3', fill: 'white' }));

  // 45m line
  svg.appendChild(el('line', { x1: '25', y1: '240', x2: '425', y2: '240', stroke: 'white', 'stroke-width': '1' }));

  // 65m line
  svg.appendChild(el('line', { x1: '25', y1: '329', x2: '425', y2: '329', stroke: 'white', 'stroke-width': '1' }));

  // Bottom half (only if full pitch)
  if (!attackingHalfOnly) {
    // 65m bottom
    svg.appendChild(el('line', { x1: '25', y1: '395', x2: '425', y2: '395', stroke: 'white', 'stroke-width': '1' }));
    // 45m bottom
    svg.appendChild(el('line', { x1: '25', y1: '484', x2: '425', y2: '484', stroke: 'white', 'stroke-width': '1' }));
    // 21m arc bottom
    svg.appendChild(el('path', { d: 'M 167 595 A 58 58 0 0 1 283 595', fill: 'none', stroke: 'white', 'stroke-width': '1' }));
    // 40m arc bottom
    svg.appendChild(el('path', { d: 'M 71 595 A 178 178 0 0 1 379 595', fill: 'none', stroke: 'white', 'stroke-width': '1' }));
    // 20m bottom
    svg.appendChild(el('line', { x1: '25', y1: '595', x2: '425', y2: '595', stroke: 'white', 'stroke-width': '1' }));
    // 13m bottom
    svg.appendChild(el('line', { x1: '25', y1: '626', x2: '425', y2: '626', stroke: 'white', 'stroke-width': '1' }));
    // Goal area bottom
    svg.appendChild(el('rect', { x: '175', y: '626', width: '100', height: '58', fill: 'none', stroke: 'white', 'stroke-width': '1' }));
    // Penalty spot bottom
    svg.appendChild(el('circle', { cx: '225', cy: '635', r: '3', fill: 'white' }));
    // Goal line bottom
    svg.appendChild(el('line', { x1: '195', y1: '684', x2: '255', y2: '684', stroke: '#FFD700', 'stroke-width': '5', 'stroke-linecap': 'round' }));
    // Posts bottom
    svg.appendChild(el('circle', { cx: '195', cy: '684', r: '3', fill: 'white' }));
    svg.appendChild(el('circle', { cx: '255', cy: '684', r: '3', fill: 'white' }));
  }

  // Goal line top
  svg.appendChild(el('line', { x1: '195', y1: '40', x2: '255', y2: '40', stroke: '#FFD700', 'stroke-width': '5', 'stroke-linecap': 'round' }));
  // Posts top
  svg.appendChild(el('circle', { cx: '195', cy: '40', r: '3', fill: 'white' }));
  svg.appendChild(el('circle', { cx: '255', cy: '40', r: '3', fill: 'white' }));

  return svg;
}

// ---------------------------------------------------------------------------
// Render pitch + shots to a PNG data URL
// ---------------------------------------------------------------------------

async function renderPitchToImage(
  shots: ShotCtx[],
  options: { crop?: 'attacking-half' | 'full'; width?: number } = {},
): Promise<string> {
  const cropAttacking = options.crop === 'attacking-half';
  const svg = buildPitchSvg(cropAttacking);

  const ns = 'http://www.w3.org/2000/svg';

  // Add shot markers
  shots.forEach(shot => {
    if (typeof shot.x !== 'number' || typeof shot.y !== 'number' || isNaN(shot.x) || isNaN(shot.y)) return;

    // Mirror far-end shots using zones.ts helper
    const mirrored = mirrorToAttackingHalf(shot.x, shot.y);
    const svgX = (mirrored.x / 100) * PITCH.VIEW_W;
    const svgY = (mirrored.y / 100) * PITCH.VIEW_H;

    const isScored = shot.result === 'scored';
    const isGoal = shot.shotFor === 'goal';

    if (isGoal) {
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', String(svgX - 6));
      rect.setAttribute('y', String(svgY - 6));
      rect.setAttribute('width', '12');
      rect.setAttribute('height', '12');
      rect.setAttribute('fill', isScored ? 'white' : '#f44336');
      rect.setAttribute('stroke', '#333');
      rect.setAttribute('stroke-width', '1.5');
      svg.appendChild(rect);
    } else {
      const circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', String(svgX));
      circle.setAttribute('cy', String(svgY));
      circle.setAttribute('r', '6');
      circle.setAttribute('fill', isScored ? 'white' : '#f44336');
      circle.setAttribute('stroke', '#333');
      circle.setAttribute('stroke-width', '1.5');
      svg.appendChild(circle);
    }
  });

  // Serialise SVG → Blob → Image → Canvas → data URL
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
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to get canvas 2d context'));
        return;
      }
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

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function drawStatBox(doc: jsPDF, x: number, y: number, w: number, h: number, value: string, label: string): void {
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

function drawArrowIndicator(doc: jsPDF, x: number, y: number, size: number, current: number, prev: number, label: string): void {
  const diff = current - prev;
  doc.setFillColor(...RPT.lightBg);
  doc.roundedRect(x, y, size, size + 8, 2, 2, 'F');

  let color: RGB;
  if (diff > 0) color = RPT.green;
  else if (diff < 0) color = RPT.red;
  else color = RPT.grey;

  const cx = x + size / 2;
  const ay = y + 8;
  doc.setDrawColor(...color);
  doc.setFillColor(...color);
  doc.setLineWidth(0.8);
  if (diff > 0) {
    doc.line(cx, ay + 6, cx, ay - 2);
    doc.triangle(cx - 3, ay, cx, ay - 4, cx + 3, ay, 'F');
  } else if (diff < 0) {
    doc.line(cx, ay - 2, cx, ay + 6);
    doc.triangle(cx - 3, ay + 4, cx, ay + 8, cx + 3, ay + 4, 'F');
  } else {
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

function drawZoneHeatmap(doc: jsPDF, px: number, py: number, pw: number, ph: number, zoneData: ZoneData): void {
  const zones = [
    { id: 7, x: px, y: py, w: pw * 0.3, h: ph * 0.22 },
    { id: 8, x: px + pw * 0.3, y: py, w: pw * 0.4, h: ph * 0.22 },
    { id: 9, x: px + pw * 0.7, y: py, w: pw * 0.3, h: ph * 0.22 },
    { id: 6, x: px + pw * 0.2, y: py + ph * 0.22, w: pw * 0.6, h: ph * 0.2 },
    { id: 5, x: px + pw * 0.15, y: py + ph * 0.42, w: pw * 0.7, h: ph * 0.12 },
    { id: 2, x: px, y: py + ph * 0.54, w: pw * 0.3, h: ph * 0.15 },
    { id: 3, x: px + pw * 0.3, y: py + ph * 0.54, w: pw * 0.4, h: ph * 0.15 },
    { id: 4, x: px + pw * 0.7, y: py + ph * 0.54, w: pw * 0.3, h: ph * 0.15 },
    { id: 1, x: px, y: py + ph * 0.69, w: pw, h: ph * 0.31 },
  ];

  function blendWithGreen(rgb: RGB, alpha: number): [number, number, number] {
    const bg = RPT.pitchGreen;
    return [
      Math.round(rgb[0] * alpha + bg[0] * (1 - alpha)),
      Math.round(rgb[1] * alpha + bg[1] * (1 - alpha)),
      Math.round(rgb[2] * alpha + bg[2] * (1 - alpha)),
    ];
  }

  zones.forEach(zone => {
    const zd = zoneData[zone.id];
    const convPct = zd.total > 0 ? Math.round((zd.scored / zd.total) * 100) : -1;
    let baseColor: RGB;
    if (convPct < 0) baseColor = RPT.grey;
    else if (convPct >= 70) baseColor = RPT.green;
    else if (convPct >= 50) baseColor = RPT.yellowGreen;
    else if (convPct >= 30) baseColor = RPT.orange;
    else baseColor = RPT.red;

    const blended = blendWithGreen(baseColor, 0.55);
    doc.setFillColor(...blended);
    doc.rect(zone.x, zone.y, zone.w, zone.h, 'F');

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

function drawLineChart(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  points: ChartPoint[],
  opts: { yLabel?: string; maxY?: number },
): void {
  if (points.length < 2) return;
  const maxY = opts.maxY || Math.max(...points.map(p => p.value), 1);
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
    py: chartY + chartH - (p.value / maxY) * chartH,
  }));

  for (let i = 1; i < coords.length; i++) {
    doc.line(coords[i - 1].px, coords[i - 1].py, coords[i].px, coords[i].py);
  }

  // Points
  coords.forEach((c, i) => {
    doc.setFillColor(...RPT.blue);
    doc.circle(c.px, c.py, 1.5, 'F');
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

// ---------------------------------------------------------------------------
// Insight generators
// ---------------------------------------------------------------------------

function generateMatchInsights(data: ReportData): string[] {
  const insights: string[] = [];
  const mRows = data.matchRows;
  if (mRows.length === 0) return insights;

  // Best game
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

  // Trend direction
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
  const matchIP = shotsByCategory(data.matchShots, 'in-play');
  const matchPl = data.matchShots.filter(s => s.shotCategory === 'free-kick' || s.shotCategory === '45');
  if (matchIP.length >= 3 && matchPl.length >= 3) {
    const ipConv = (scoredCount(matchIP) / matchIP.length) * 100;
    const plConv = (scoredCount(matchPl) / matchPl.length) * 100;
    if (ipConv > plConv + 15) insights.push(`Stronger from play (${Math.round(ipConv)}%) than placed balls (${Math.round(plConv)}%).`);
    else if (plConv > ipConv + 15) insights.push(`Stronger from placed balls (${Math.round(plConv)}%) than in-play (${Math.round(ipConv)}%).`);
  }

  return insights;
}

function generateInsights(data: ReportData): { strengths: string[]; improvements: string[] } {
  const strengths: string[] = [];
  const improvements: string[] = [];

  // Best/worst zone — use ZONE_NAMES from zones.ts
  let bestZone: number | null = null;
  let worstZone: number | null = null;
  let bestZoneConv = -1;
  let worstZoneConv = 101;
  for (let z = 1; z <= 9; z++) {
    const zd = data.zoneData[z];
    if (zd.total < 3) continue;
    const rate = (zd.scored / zd.total) * 100;
    if (rate > bestZoneConv) { bestZoneConv = rate; bestZone = z; }
    if (rate < worstZoneConv) { worstZoneConv = rate; worstZone = z; }
  }
  if (bestZone && bestZoneConv >= 50 && data.zoneData[bestZone].total > 0) {
    strengths.push(`Strong from ${ZONE_NAMES[bestZone]} — ${Math.round(bestZoneConv)}% conversion (${data.zoneData[bestZone].scored}/${data.zoneData[bestZone].total}).`);
  }
  if (worstZone && worstZone !== bestZone && worstZoneConv < 50 && data.zoneData[worstZone].total > 0) {
    improvements.push(`${ZONE_NAMES[worstZone]} needs work — only ${Math.round(worstZoneConv)}% conversion (${data.zoneData[worstZone].scored}/${data.zoneData[worstZone].total}).`);
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

  // Month-over-month
  if (data.prevShots.length >= 5 && data.allShots.length >= 5) {
    const curConv = (scoredCount(data.allShots) / data.allShots.length) * 100;
    const prevConv = (scoredCount(data.prevShots) / data.prevShots.length) * 100;
    const diff = curConv - prevConv;
    if (diff > 5) strengths.push(`Overall conversion improved by ${Math.round(diff)}% compared to last month.`);
    if (diff < -5) improvements.push(`Overall conversion dropped by ${Math.round(Math.abs(diff))}% compared to last month.`);
  }

  // Consistency
  const sessionRates = data.monthSessions
    .filter(s => (s.shots || []).length >= 3)
    .map(s => {
      const shots = s.shots || [];
      return (scoredCount(shots) / shots.length) * 100;
    });
  if (sessionRates.length >= 3) {
    const mean = sessionRates.reduce((a, b) => a + b, 0) / sessionRates.length;
    const stdDev = Math.sqrt(sessionRates.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / sessionRates.length);
    if (stdDev < 10) strengths.push('Very consistent across sessions (low variability).');
    if (stdDev > 20) improvements.push('Performance varies a lot between sessions — work on consistency.');
  }

  // Training dedication
  if (data.trainingSessions.length >= 3) {
    const dedPct = (data.kickingBeforeCount / data.trainingSessions.length) * 100;
    if (dedPct >= 70) strengths.push(`Kicked before ${Math.round(dedPct)}% of team training sessions — great extra work.`);
    else if (dedPct < 30) improvements.push(`Only kicked before ${Math.round(dedPct)}% of team sessions — try to get out early more often.`);
  }

  return { strengths, improvements };
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function addPageHeader(doc: jsPDF, pageNum: number | string, monthLabel: string, title: string): void {
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

function addPageFooter(doc: jsPDF, pageNum: number, totalPages: number): void {
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text(`Page ${pageNum} of ${totalPages}`, RPT.pageW / 2, RPT.pageH - 8, { align: 'center' });
  doc.text('Kick On', RPT.margin, RPT.pageH - 8);
}

function getMonthLabel(yyyy: number, mm: number): string {
  const names = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${names[mm - 1]} ${yyyy}`;
}

function conv(scored: number, total: number): number {
  return total > 0 ? Math.round((scored / total) * 100) : 0;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

function formatMatchType(mt: string | null | undefined): string {
  if (!mt) return '-';
  const map: Record<string, string> = { league: 'League', championship: 'Championship', friendly: 'Friendly', cup: 'Cup', tournament: 'Tournament', challenge: 'Challenge', custom: 'Other' };
  return map[mt] || mt;
}
