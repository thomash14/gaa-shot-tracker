function showLoading(text = 'Loading...') {
    document.getElementById('loadingOverlay').style.display = 'flex';
    document.getElementById('loadingText').textContent = text;
}
function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// --- Shot Tooltip System ---
const shotTooltipLabels = {
    foot: { right: 'Right', left: 'Left' },
    shotCategory: { 'in-play': 'In-Play', 'free-kick': 'Free-Kick', '45': '45' },
    shotType: {
        'not-defined': 'Not Defined', 'outside-of-the-boot': 'Outside Of The Boot',
        'on-the-run': 'On the run', 'on-the-turn': 'On the turn', 'standing': 'Standing',
        'off-a-dummy': 'Off a Dummy', 'fisted': 'Fisted',
        'off-the-hands': 'Off The Hands', 'off-the-ground': 'Off The Ground'
    },
    missResult: {
        'short': 'Short', 'blocked': 'Blocked', 'wide-left': 'Wide Left',
        'wide-right': 'Wide Right', 'post': 'Post'
    },
    missReason: {
        'pulled': 'Pulled', 'rushed': 'Rushed', 'bad-connection': 'Bad Connection',
        'outside-range': 'Outside Of Range', 'at-limits': 'At Limits Of Range'
    }
};

function getDistanceZoneLabel(shot) {
    if (shot.distance != null) return Math.round(shot.distance) + 'm';
    const svgY = (shot.y / 100) * 725;
    if (svgY <= 98) return '< 13m';
    if (svgY <= 129) return '13m - 20m';
    if (svgY <= 240) return '20m - 45m';
    if (svgY <= 329) return '45m - 65m';
    return '> 65m';
}

function buildResultLabel(shot) {
    const scored = shot.result === 'scored';
    let text = scored ? 'Scored' : 'Missed';
    if (scored) {
        if (shot.shotFor === 'goal') text += ' - Goal';
        else if (shot.pointValue === 2) text += ' - 2 Pointer';
        else text += ' - Point';
    } else {
        const mr = shot.missResult && shotTooltipLabels.missResult[shot.missResult];
        if (mr) text += ' - ' + mr;
    }
    return { text, scored };
}

function buildShotTooltipHTML(shots) {
    if (shots.length === 1) {
        const s = shots[0];
        const foot = shotTooltipLabels.foot[s.foot] || s.foot || '—';
        const cat = shotTooltipLabels.shotCategory[s.shotCategory] || s.shotCategory || '—';
        const type = shotTooltipLabels.shotType[s.shotType] || s.shotType || '—';
        const dist = getDistanceZoneLabel(s);
        const res = buildResultLabel(s);
        let html = `<div class="tt-row"><span class="tt-label">Foot:</span><span>${foot}</span></div>`;
        html += `<div class="tt-row"><span class="tt-label">Shot:</span><span>${cat}</span></div>`;
        if (s.shotType && s.shotType !== 'not-defined') {
            html += `<div class="tt-row"><span class="tt-label">Type:</span><span>${type}</span></div>`;
        }
        html += `<div class="tt-row"><span class="tt-label">Distance:</span><span>${dist}</span></div>`;
        html += `<div class="tt-row"><span class="tt-label">Result:</span><span class="${res.scored ? 'tt-scored' : 'tt-missed'}">${res.text}</span></div>`;
        if (s.missReason) {
            const reasonLabel = shotTooltipLabels.missReason[s.missReason] || s.missReason;
            html += `<div class="tt-row"><span class="tt-label">Reason:</span><span class="tt-missed">${reasonLabel}</span></div>`;
        }
        if (s.comment) {
            html += `<div class="tt-divider"></div>`;
            html += `<div style="color:#ccc;font-style:italic;">${s.comment}</div>`;
        }
        return html;
    }
    // Multiple shots at same location
    const scored = shots.filter(s => s.result === 'scored').length;
    const total = shots.length;
    const pct = Math.round((scored / total) * 100);
    let html = `<div style="font-weight:bold;margin-bottom:3px;">${scored}/${total} scored (${pct}%)</div>`;
    html += `<div class="tt-divider"></div>`;
    const maxShow = 4;
    const toShow = shots.slice(0, maxShow);
    toShow.forEach((s, i) => {
        const foot = shotTooltipLabels.foot[s.foot] || '?';
        const res = buildResultLabel(s);
        const type = (s.shotType && s.shotType !== 'not-defined') ? (shotTooltipLabels.shotType[s.shotType] || '') : '';
        html += `<div class="tt-row"><span>${foot}${type ? ' · ' + type : ''}</span><span class="${res.scored ? 'tt-scored' : 'tt-missed'}">${res.text}</span></div>`;
    });
    if (shots.length > maxShow) {
        html += `<div style="color:#aaa;text-align:center;margin-top:2px;">+${shots.length - maxShow} more</div>`;
    }
    return html;
}

let activeShotTooltip = null;
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

function showShotTooltip(marker, shots, wrapper) {
    hideShotTooltip();
    const tooltip = document.createElement('div');
    tooltip.className = 'shot-tooltip' + (isTouchDevice ? ' mobile-popover' : '');
    tooltip.innerHTML = buildShotTooltipHTML(shots);
    wrapper.appendChild(tooltip);
    activeShotTooltip = tooltip;
    // Position after render so we can measure
    requestAnimationFrame(() => positionTooltip(tooltip, marker, wrapper));
}

function hideShotTooltip() {
    if (activeShotTooltip) {
        activeShotTooltip.remove();
        activeShotTooltip = null;
    }
}

function positionTooltip(tooltip, marker, wrapper) {
    const wrapperRect = wrapper.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const ttRect = tooltip.getBoundingClientRect();
    // Default: above and centred
    let left = (markerRect.left - wrapperRect.left) + (markerRect.width / 2) - (ttRect.width / 2);
    let top = (markerRect.top - wrapperRect.top) - ttRect.height - 8;
    // If clipped at top, show below
    if (top < 0) {
        top = (markerRect.top - wrapperRect.top) + markerRect.height + 8;
    }
    // Clamp horizontal
    if (left < 4) left = 4;
    if (left + ttRect.width > wrapperRect.width - 4) left = wrapperRect.width - ttRect.width - 4;
    // Clamp vertical bottom
    if (top + ttRect.height > wrapperRect.height - 4) {
        top = wrapperRect.height - ttRect.height - 4;
    }
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

function attachShotTooltipEvents(marker, shots, wrapper) {
    // Remove native title
    marker.removeAttribute('title');
    if (isTouchDevice) {
        marker.addEventListener('click', function(e) {
            e.stopPropagation();
            if (activeShotTooltip && activeShotTooltip.parentNode === wrapper) {
                hideShotTooltip();
            }
            showShotTooltip(marker, shots, wrapper);
        });
    } else {
        marker.addEventListener('mouseenter', function() {
            showShotTooltip(marker, shots, wrapper);
        });
        marker.addEventListener('mouseleave', function() {
            hideShotTooltip();
        });
    }
}

// Dismiss on tap outside (mobile)
document.addEventListener('click', function(e) {
    if (activeShotTooltip && !e.target.closest('.shot-marker, .analytics-shot-marker, .shot-tooltip')) {
        hideShotTooltip();
    }
});

function getUniquePositions(shots) {
    const positionMap = new Map();
    shots.forEach(shot => {
        const key = `${shot.x.toFixed(1)}-${shot.y.toFixed(1)}`;
        if (!positionMap.has(key)) {
            positionMap.set(key, { x: shot.x, y: shot.y });
        }
    });
    return Array.from(positionMap.values());
}
