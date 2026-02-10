function calculateScoringZoneSpots(distanceMeters) {
    const pixelsPerMeter = 644 / 145;
    const distancePixels = distanceMeters * pixelsPerMeter;
    const goalX = 225;
    const goalY = 40;
    const arcRadius = 178; // 40m arc in pixels
    const twentyMLineY = 129; // 20m line y position
    const yFromGoal = twentyMLineY - goalY; // 89 pixels
    const xOffsetAt20m = Math.sqrt(arcRadius * arcRadius - yFromGoal * yFromGoal); // ≈154
    const edgeAngle = Math.atan2(yFromGoal, xOffsetAt20m); // ≈ 30 degrees from horizontal
    const centerAngle = Math.PI / 2; // 90 degrees - straight out from goal
    const edgeAngleFromVertical = Math.PI / 2 - edgeAngle; // Convert to angle from vertical
    const angles = [
        centerAngle - edgeAngleFromVertical,      // Spot 1 - right edge
        centerAngle - edgeAngleFromVertical / 2,  // Spot 2 - right middle
        centerAngle,                               // Spot 3 - center
        centerAngle + edgeAngleFromVertical / 2,  // Spot 4 - left middle
        centerAngle + edgeAngleFromVertical       // Spot 5 - left edge
    ];
    const spots = angles.map((angle, index) => {
        const svgX = goalX + distancePixels * Math.sin(angle - Math.PI / 2);
        const svgY = goalY + distancePixels * Math.cos(angle - Math.PI / 2);
        const xPercent = (svgX / 500) * 100;
        const yPercent = (svgY / 725) * 100;
        const names = ["Right Angle", "Right Inside", "Centre", "Left Inside", "Left Angle"];
        const descriptions = ["Right side angle", "Between right and centre", "Directly in front", "Between left and centre", "Left side angle"];
        return {
            id: index + 1,
            name: names[index],
            x: xPercent,
            y: yPercent,
            description: descriptions[index]
        };
    });
    return spots;
}
const SKILLSET_CATEGORIES = [
    { value: 'all', label: 'All' },
    { value: 'kicking-at-goal', label: 'Kicking at Goal' },
    { value: 'kick-passing', label: 'Kick Passing' },
    { value: 'hand-passing', label: 'Hand Passing' },
    { value: 'high-catch', label: 'High Catch' },
    { value: 'soloing', label: 'Soloing' },
    { value: 'pick-up', label: 'Pick-Up' },
    { value: 'fun-challenges', label: 'Fun Challenges' }
];

const scoringZonesDrill = {
    id: 'scoring-zones',
    name: "Scoring Arc",
    author: "Custom Drill",
    description: "Scoring from different angles on the pitch. 80%+ is a brilliant result!",
    isDynamic: true,
    skillset: 'kicking-at-goal',
    detailedInstructions: `
        <h4>🎯 Scoring Arc Drill</h4>
        <p><strong>Objective:</strong> Improve your point-taking accuracy from different angles and distances on the pitch.</p>
        <h5>How to do it:</h5>
        <ol>
            <li><strong>Set up:</strong> Choose your distance (15m-45m), shot type, and preferred foot</li>
            <li><strong>5 spots:</strong> The drill places 5 shooting positions in an arc at your chosen distance</li>
            <li><strong>Take your shots:</strong> From each spot, take the number of kicks shown (e.g., 4 per spot)</li>
            <li><strong>Record scores:</strong> Click each spot on the pitch to enter how many you scored</li>
            <li><strong>Target:</strong> Aim for 80%+ accuracy before moving to a greater distance</li>
        </ol>
        <h5>Tips:</h5>
        <ul>
            <li>Start at 15m and work your way out as you hit 80%+</li>
            <li>Focus on technique over power at closer distances</li>
            <li>Practice your weaker foot once you're confident with your stronger foot</li>
            <li>Try different shot types (standing, on-the-run) to simulate match situations</li>
        </ul>
    `,
    videoUrl: null // Add YouTube/video URL here when available, e.g., "https://www.youtube.com/watch?v=xxxxx"
};
const practiceTemplates = [
    scoringZonesDrill
];

function toggleTemplatesView() {
    const container = document.getElementById('templatesContainer');
    const btn = document.getElementById('toggleTemplatesBtn');
    if (container.style.display === 'none') {
        container.style.display = 'block';
        btn.textContent = 'Hide Drills';
        renderPracticeTemplates();
    } else {
        container.style.display = 'none';
        btn.textContent = 'Show Drills';
    }
}

function filterBySkillset(value) {
    currentSkillsetFilter = value;
    renderPracticeTemplates();
}

function toggleDrillExpand(templateId) {
    if (expandedDrillId === templateId) {
        expandedDrillId = null;
    } else {
        expandedDrillId = templateId;
    }
    renderPracticeTemplates();
}

function startDrillFromPanel(templateId, isCustom, drillId) {
    expandedDrillId = null;
    if (isCustom) {
        startCustomDrill(drillId);
    } else {
        selectTemplate(templateId);
    }
}

function renderPracticeTemplates() {
    const list = document.getElementById('templatesList');
    if (!list) return;
    let html = '';
    // Skillset filter dropdown
    html += `<div style="margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
        <label style="font-weight: 600; font-size: 14px; color: #333;">Skillset:</label>
        <select onchange="filterBySkillset(this.value)" style="padding: 8px 12px; border-radius: 8px; border: 2px solid #e0e0e0; font-size: 14px; background: white;">
            ${SKILLSET_CATEGORIES.map(cat => `<option value="${cat.value}" ${currentSkillsetFilter === cat.value ? 'selected' : ''}>${cat.label}</option>`).join('')}
        </select>
    </div>`;

    // Build unified drill list: built-in + custom
    const filteredBuiltIn = practiceTemplates.filter(t => !t.isCustom).filter(t => currentSkillsetFilter === 'all' || t.skillset === currentSkillsetFilter);
    const filteredCustom = customDrills.filter(d => currentSkillsetFilter === 'all' || (d.skillset || 'kicking-at-goal') === currentSkillsetFilter);

    const allDrills = [];
    // Add built-in drills
    filteredBuiltIn.forEach(template => {
        allDrills.push({
            templateId: template.id,
            name: template.name,
            description: template.description,
            isDynamic: template.isDynamic,
            isCustom: false,
            hasInstructions: !!template.detailedInstructions,
            spots: template.spots,
            drillId: null
        });
    });
    // Add custom drills
    filteredCustom.forEach(drill => {
        allDrills.push({
            templateId: `custom-${drill.id}`,
            name: drill.name,
            description: drill.description || '',
            isDynamic: false,
            isCustom: true,
            hasInstructions: false,
            spots: drill.spots,
            drillId: drill.id
        });
    });

    // Render each drill as a compact row
    allDrills.forEach(drill => {
        const isActive = activeTemplate?.id === drill.templateId;
        const isExpanded = expandedDrillId === drill.templateId && !isActive;
        const rowClasses = ['drill-row'];
        if (isActive) rowClasses.push('active');
        else if (isExpanded) rowClasses.push('expanded');
        if (drill.isCustom) rowClasses.push('custom');

        // Build info text
        let infoText = '';
        if (drill.isDynamic) {
            infoText = `5 spots &middot; ${drillSettings.distance}m &middot; dynamic`;
        } else if (drill.spots) {
            infoText = `${drill.spots.length} spots`;
        } else {
            infoText = drill.description;
        }

        // Build action buttons
        let actionsHtml = '';
        if (drill.hasInstructions) {
            actionsHtml += `<button class="drill-row-btn" onclick="event.stopPropagation(); showDrillDescription('${drill.templateId}')" title="How to do this drill">?</button>`;
        }
        actionsHtml += `<button class="drill-row-btn" onclick="event.stopPropagation(); previewDrill('${drill.templateId}')" title="Preview on pitch">👁</button>`;

        if (isActive) {
            // Active drill: show green Active button that deactivates
            if (drill.isCustom) {
                const safeId = typeof drill.drillId === 'string' ? `'${drill.drillId}'` : drill.drillId;
                actionsHtml += `<button class="drill-row-btn active-btn" onclick="event.stopPropagation(); startCustomDrill(${safeId})">✓ Active</button>`;
            } else {
                actionsHtml += `<button class="drill-row-btn active-btn" onclick="event.stopPropagation(); selectTemplate('${drill.templateId}')">✓ Active</button>`;
            }
        } else {
            // Not active: show Select button to expand/collapse
            actionsHtml += `<button class="drill-row-btn select-btn" onclick="event.stopPropagation(); toggleDrillExpand('${drill.templateId}')">${isExpanded ? 'Deselect' : 'Select'}</button>`;
        }

        if (drill.isCustom) {
            const safeId = typeof drill.drillId === 'string' ? `'${drill.drillId}'` : drill.drillId;
            actionsHtml += `<button class="drill-row-btn delete-btn" onclick="event.stopPropagation(); deleteCustomDrill(${safeId})" title="Delete drill">🗑</button>`;
        }

        html += `<div class="${rowClasses.join(' ')}">
            <div class="drill-row-name">${drill.name}</div>
            ${drill.isCustom ? '<span class="drill-row-badge">Custom</span>' : ''}
            <div class="drill-row-info">${infoText}</div>
            <div class="drill-row-actions">${actionsHtml}</div>
        </div>`;

        // Expanded config panel (shown when selected OR active)
        if (isExpanded) {
            const safeId = drill.isCustom ? (typeof drill.drillId === 'string' ? `'${drill.drillId}'` : drill.drillId) : null;
            html += `<div class="drill-config-panel expanded-panel">`;
            html += `<div class="config-inline-row">`;
            if (drill.isDynamic) {
                html += `
                    <div>
                        <label>Distance</label>
                        <select id="drillDistance" onchange="updateDrillSettings()">
                            <option value="15" ${drillSettings.distance === 15 ? 'selected' : ''}>15m</option>
                            <option value="17" ${drillSettings.distance === 17 ? 'selected' : ''}>17m</option>
                            <option value="20" ${drillSettings.distance === 20 ? 'selected' : ''}>20m</option>
                            <option value="24" ${drillSettings.distance === 24 ? 'selected' : ''}>24m</option>
                            <option value="30" ${drillSettings.distance === 30 ? 'selected' : ''}>30m</option>
                            <option value="35" ${drillSettings.distance === 35 ? 'selected' : ''}>35m</option>
                            <option value="40" ${drillSettings.distance === 40 ? 'selected' : ''}>40m</option>
                            <option value="45" ${drillSettings.distance === 45 ? 'selected' : ''}>45m</option>
                        </select>
                    </div>
                    <div>
                        <label>Shot Type</label>
                        <select id="drillShotType" onchange="updateDrillSettings()">
                            <option value="free-kick" ${drillSettings.shotType === 'free-kick' ? 'selected' : ''}>Free-Kick</option>
                            <option value="standing" ${drillSettings.shotType === 'standing' ? 'selected' : ''}>Standing</option>
                            <option value="on-the-run" ${drillSettings.shotType === 'on-the-run' ? 'selected' : ''}>On the Run</option>
                            <option value="on-the-turn" ${drillSettings.shotType === 'on-the-turn' ? 'selected' : ''}>On the Turn</option>
                            <option value="off-a-dummy" ${drillSettings.shotType === 'off-a-dummy' ? 'selected' : ''}>After a Dummy</option>
                        </select>
                    </div>
                    <div>
                        <label>Foot</label>
                        <select id="drillFoot" onchange="updateDrillSettings()">
                            <option value="right" ${drillSettings.footOption === 'right' ? 'selected' : ''}>Right Only</option>
                            <option value="left" ${drillSettings.footOption === 'left' ? 'selected' : ''}>Left Only</option>
                            <option value="both" ${drillSettings.footOption === 'both' ? 'selected' : ''}>Both (split)</option>
                        </select>
                    </div>
                    <div>
                        <label>Total Shots</label>
                        <select id="drillTotalShots" onchange="updateDrillSettings()">
                            <option value="10" ${drillSettings.totalShots === 10 ? 'selected' : ''}>10 (2/spot)</option>
                            <option value="20" ${drillSettings.totalShots === 20 ? 'selected' : ''}>20 (4/spot)</option>
                            <option value="30" ${drillSettings.totalShots === 30 ? 'selected' : ''}>30 (6/spot)</option>
                            <option value="40" ${drillSettings.totalShots === 40 ? 'selected' : ''}>40 (8/spot)</option>
                        </select>
                    </div>`;
            } else {
                // Custom / non-dynamic: show brief info
                const totalShots = drill.spots.reduce((sum, s) => sum + s.shots, 0);
                html += `<div style="font-size: 13px; color: #555;"><strong>${drill.spots.length} spots</strong> &middot; ${totalShots} total shots</div>`;
            }
            // Start Drill button at end of row
            if (drill.isCustom) {
                html += `<button class="drill-row-btn go-btn" onclick="event.stopPropagation(); startDrillFromPanel('${drill.templateId}', true, ${safeId})">Start Drill</button>`;
            } else {
                html += `<button class="drill-row-btn go-btn" onclick="event.stopPropagation(); startDrillFromPanel('${drill.templateId}', false, null)">Start Drill</button>`;
            }
            html += `</div>`; // close config-inline-row
            html += `</div>`; // close drill-config-panel
        }

        // Active drill: show progress panel
        if (isActive) {
            html += `<div class="drill-config-panel">`;
            if (drill.isDynamic) {
                html += `<div class="config-inline-row" style="margin-bottom: 8px;">
                    <div>
                        <label>Distance</label>
                        <select id="drillDistance" onchange="updateDrillSettings()">
                            <option value="15" ${drillSettings.distance === 15 ? 'selected' : ''}>15m</option>
                            <option value="17" ${drillSettings.distance === 17 ? 'selected' : ''}>17m</option>
                            <option value="20" ${drillSettings.distance === 20 ? 'selected' : ''}>20m</option>
                            <option value="24" ${drillSettings.distance === 24 ? 'selected' : ''}>24m</option>
                            <option value="30" ${drillSettings.distance === 30 ? 'selected' : ''}>30m</option>
                            <option value="35" ${drillSettings.distance === 35 ? 'selected' : ''}>35m</option>
                            <option value="40" ${drillSettings.distance === 40 ? 'selected' : ''}>40m</option>
                            <option value="45" ${drillSettings.distance === 45 ? 'selected' : ''}>45m</option>
                        </select>
                    </div>
                    <div>
                        <label>Shot Type</label>
                        <select id="drillShotType" onchange="updateDrillSettings()">
                            <option value="free-kick" ${drillSettings.shotType === 'free-kick' ? 'selected' : ''}>Free-Kick</option>
                            <option value="standing" ${drillSettings.shotType === 'standing' ? 'selected' : ''}>Standing</option>
                            <option value="on-the-run" ${drillSettings.shotType === 'on-the-run' ? 'selected' : ''}>On the Run</option>
                            <option value="on-the-turn" ${drillSettings.shotType === 'on-the-turn' ? 'selected' : ''}>On the Turn</option>
                            <option value="off-a-dummy" ${drillSettings.shotType === 'off-a-dummy' ? 'selected' : ''}>After a Dummy</option>
                        </select>
                    </div>
                    <div>
                        <label>Foot</label>
                        <select id="drillFoot" onchange="updateDrillSettings()">
                            <option value="right" ${drillSettings.footOption === 'right' ? 'selected' : ''}>Right Only</option>
                            <option value="left" ${drillSettings.footOption === 'left' ? 'selected' : ''}>Left Only</option>
                            <option value="both" ${drillSettings.footOption === 'both' ? 'selected' : ''}>Both (split)</option>
                        </select>
                    </div>
                    <div>
                        <label>Total Shots</label>
                        <select id="drillTotalShots" onchange="updateDrillSettings()">
                            <option value="10" ${drillSettings.totalShots === 10 ? 'selected' : ''}>10 (2/spot)</option>
                            <option value="20" ${drillSettings.totalShots === 20 ? 'selected' : ''}>20 (4/spot)</option>
                            <option value="30" ${drillSettings.totalShots === 30 ? 'selected' : ''}>30 (6/spot)</option>
                            <option value="40" ${drillSettings.totalShots === 40 ? 'selected' : ''}>40 (8/spot)</option>
                        </select>
                    </div>
                </div>`;
                html += `<div class="config-summary">
                    <strong>${drillSettings.totalShots / 5} kicks per spot</strong> ${drillSettings.footOption === 'both' ? `(${drillSettings.totalShots / 10} right + ${drillSettings.totalShots / 10} left)` : `(${drillSettings.footOption} foot)`} &middot;
                    <strong>${drillSettings.totalShots} total</strong> &middot;
                    <span style="color: #4CAF50;">Target: 80%+</span>
                </div>`;
            }

            // Progress section
            const progressKey = drill.isDynamic
                ? `${drill.templateId}-${drillSettings.distance}-${drillSettings.shotType}-${drillSettings.footOption}-${drillSettings.totalShots}`
                : drill.templateId;
            const progress = drillProgress[progressKey] || {};
            const completedSpots = Object.keys(progress).length;
            let totalScored = 0;
            let totalAttempted = 0;
            Object.values(progress).forEach(p => {
                if (p.right || p.left) {
                    totalScored += (p.right?.scored || 0) + (p.left?.scored || 0);
                    totalAttempted += (p.right?.total || 0) + (p.left?.total || 0);
                } else {
                    totalScored += p.scored || 0;
                    totalAttempted += p.total || 0;
                }
            });
            const percentage = totalAttempted > 0 ? Math.round((totalScored / totalAttempted) * 100) : 0;
            const spotCount = drill.isDynamic ? 5 : drill.spots.length;

            if (completedSpots > 0) {
                const isGood = percentage >= 80;
                html += `<div class="config-progress ${isGood ? 'good' : 'working'}">
                    Progress: <strong>${completedSpots}/${spotCount} spots</strong> &middot;
                    Score: <strong>${totalScored}/${totalAttempted}</strong> (${percentage}%)
                    ${isGood ? ' 🎯' : ''}
                </div>`;
            } else {
                html += `<div style="font-size: 12px; color: #999; margin-top: 4px;">Click spots on the pitch to record scores</div>`;
            }

            html += `</div>`;
        }
    });

    // Empty state
    if (allDrills.length === 0 && currentSkillsetFilter !== 'all') {
        const label = SKILLSET_CATEGORIES.find(c => c.value === currentSkillsetFilter)?.label || currentSkillsetFilter;
        html += `<div style="text-align: center; padding: 30px 20px; color: #999;">
            <p>No drills found for <strong>${label}</strong>.</p>
            <p style="font-size: 13px; margin-top: 8px;">Create a custom drill and assign it to this skillset.</p>
        </div>`;
    }
    list.innerHTML = html;
}
function updateDrillSettings() {
    drillSettings.distance = parseInt(document.getElementById('drillDistance').value);
    drillSettings.shotType = document.getElementById('drillShotType').value;
    drillSettings.footOption = document.getElementById('drillFoot').value;
    drillSettings.totalShots = parseInt(document.getElementById('drillTotalShots').value);
    if (activeTemplate?.id === 'scoring-zones') {
        renderDrillSpots();
        showDrillBanner();
    }
    if (previewingTemplate?.id === 'scoring-zones') {
        previewDrill('scoring-zones');
    }
    renderPracticeTemplates();
}
function showDrillDescription(templateId) {
    const template = practiceTemplates.find(t => t.id === templateId);
    if (!template) return;
    document.getElementById('drillDescriptionTitle').textContent = template.name + ' - Instructions';
    const contentEl = document.getElementById('drillDescriptionContent');
    if (template.detailedInstructions) {
        contentEl.innerHTML = template.detailedInstructions;
    } else {
        contentEl.innerHTML = `<p>${template.description}</p><p><em>Detailed instructions coming soon!</em></p>`;
    }
    const videoContainer = document.getElementById('drillVideoContainer');
    const videoLink = document.getElementById('drillVideoLink');
    if (template.videoUrl) {
        videoLink.href = template.videoUrl;
        videoContainer.style.display = 'block';
    } else {
        videoContainer.style.display = 'none';
    }
    document.getElementById('drillDescriptionModal').classList.add('active');
}
function closeDrillDescriptionModal() {
    document.getElementById('drillDescriptionModal').classList.remove('active');
}
function openSaveDrillModal() {
    if (!currentSession || !currentSession.shots || currentSession.shots.length === 0) {
        alert('You need to have shots in your current session to save as a drill.');
        return;
    }
    const positions = getUniquePositions(currentSession.shots);
    if (positions.length === 0) {
        alert('No shot positions found to save.');
        return;
    }
    document.getElementById('customDrillName').value = currentSession.name || '';
    document.getElementById('customDrillDescription').value = '';
    const skillsetSelect = document.getElementById('customDrillSkillset');
    if (skillsetSelect) skillsetSelect.value = 'kicking-at-goal';
    document.getElementById('saveDrillError').style.display = 'none';
    document.getElementById('saveDrillSpotCount').innerHTML = `
        <span style="font-size: 14px;">📍 ${positions.length} shooting spots will be saved</span>
    `;
    document.getElementById('saveDrillModal').classList.add('active');
}
function closeSaveDrillModal() {
    document.getElementById('saveDrillModal').classList.remove('active');
}
async function saveCustomDrill() {
    const name = document.getElementById('customDrillName').value.trim();
    const description = document.getElementById('customDrillDescription').value.trim();
    const shotsPerSpot = parseInt(document.getElementById('customDrillShotsPerSpot').value);
    if (!name) {
        document.getElementById('saveDrillError').textContent = 'Please enter a drill name.';
        document.getElementById('saveDrillError').style.display = 'block';
        return;
    }
    if (!currentUser) {
        document.getElementById('saveDrillError').textContent = 'You must be logged in to save drills.';
        document.getElementById('saveDrillError').style.display = 'block';
        return;
    }
    const positions = getUniquePositions(currentSession.shots);
    const spots = positions.map((pos, index) => ({
        id: `spot-${index + 1}`,
        x: parseFloat(pos.x.toFixed(1)),
        y: parseFloat(pos.y.toFixed(1)),
        shots: shotsPerSpot
    }));
    try {
        const displayName = currentUser.user_metadata?.display_name || 
                            currentUser.user_metadata?.name || 
                            currentUser.email?.split('@')[0] || 
                            'Me';
        const skillsetEl = document.getElementById('customDrillSkillset');
        const skillset = skillsetEl ? skillsetEl.value : 'kicking-at-goal';
        const drillData = {
            user_id: currentUser.id,
            name: name,
            description: description || null,
            author: displayName,
            spots: spots,
            skillset: skillset,
            is_public: false,
            created_at: new Date().toISOString()
        };
        const { data, error } = await supabaseClient
            .from('drill_templates')
            .insert(drillData)
            .select()
            .single();
        if (error) throw error;
        customDrills.push(data);
        closeSaveDrillModal();
        renderPracticeTemplates();
        alert('Drill saved successfully! You can find it under Practice Drills.');
    } catch (err) {
        console.error('Error saving custom drill:', err);
        document.getElementById('saveDrillError').textContent = 'Failed to save drill: ' + err.message;
        document.getElementById('saveDrillError').style.display = 'block';
    }
}
async function loadCustomDrills() {
    if (!currentUser) return;
    try {
        const { data, error } = await supabaseClient
            .from('drill_templates')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        customDrills = data || [];
        renderPracticeTemplates();
    } catch (err) {
        console.error('Error loading custom drills:', err);
        customDrills = [];
    }
}
async function deleteCustomDrill(drillId) {
    if (!confirm('Are you sure you want to delete this drill?')) return;
    try {
        const { error } = await supabaseClient
            .from('drill_templates')
            .delete()
            .eq('id', drillId)
            .eq('user_id', currentUser.id);
        if (error) throw error;
        customDrills = customDrills.filter(d => d.id !== drillId);
        renderPracticeTemplates();
    } catch (err) {
        console.error('Error deleting custom drill:', err);
        alert('Failed to delete drill');
    }
}
function startCustomDrill(drillId) {
    const drill = customDrills.find(d => d.id === drillId);
    if (!drill) return;
    const template = {
        id: `custom-${drill.id}`,
        name: drill.name,
        author: drill.author || 'Me',
        description: drill.description || 'Custom drill',
        spots: drill.spots,
        isDynamic: false,
        isCustom: true,
        customDrillId: drill.id
    };
    const existingIndex = practiceTemplates.findIndex(t => t.id === template.id);
    if (existingIndex === -1) {
        practiceTemplates.push(template);
    } else {
        practiceTemplates[existingIndex] = template;
    }
    selectTemplate(template.id);
}
function previewDrill(templateId) {
    let template = practiceTemplates.find(t => t.id === templateId);
    // For custom drills not yet started, build a temporary template
    if (!template && templateId.startsWith('custom-')) {
        const rawId = templateId.replace('custom-', '');
        const drillId = isNaN(rawId) ? rawId : parseInt(rawId);
        const drill = customDrills.find(d => d.id === drillId || String(d.id) === rawId);
        if (drill) {
            template = { id: templateId, name: drill.name, spots: drill.spots, isDynamic: false, isCustom: true };
        }
    }
    if (!template) return;
    if (previewingTemplate?.id === templateId) {
        document.querySelectorAll('.drill-preview-marker').forEach(m => m.remove());
        document.querySelectorAll('.drill-preview-line').forEach(l => l.remove());
        previewingTemplate = null;
        return;
    }
    previewingTemplate = template;
    document.querySelectorAll('.drill-preview-marker').forEach(m => m.remove());
    document.querySelectorAll('.drill-preview-line').forEach(l => l.remove());
    let spots;
    if (template.isDynamic) {
        const baseSpots = calculateScoringZoneSpots(drillSettings.distance);
        spots = baseSpots.map(spot => ({
            ...spot,
            shots: 4
        }));
    } else {
        spots = template.spots;
    }
    const pitchWrapper = document.getElementById('pitchWrapper');
    const svg = document.getElementById('pitch');
    spots.forEach((spot, index) => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'drill-preview-line');
        line.setAttribute('x1', (spot.x / 100) * 500);
        line.setAttribute('y1', (spot.y / 100) * 725);
        line.setAttribute('x2', 225); // Goal center x
        line.setAttribute('y2', 40);  // Goal y
        line.setAttribute('stroke', '#2196F3');
        line.setAttribute('stroke-width', '1.5');
        line.setAttribute('stroke-dasharray', '5,5');
        line.setAttribute('opacity', '0.5');
        svg.appendChild(line);
        const marker = document.createElement('div');
        marker.className = 'drill-spot drill-preview-marker';
        marker.style.left = spot.x + '%';
        marker.style.top = spot.y + '%';
        marker.style.background = '#2196F3'; // Blue for preview
        marker.style.borderColor = '#1976D2';
        marker.innerHTML = `<span class="spot-number">${spot.id || index + 1}</span>`;
        marker.title = spot.name || `Spot ${index + 1}`;
        pitchWrapper.appendChild(marker);
    });
    document.getElementById('pitchWrapper').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function selectTemplate(templateId) {
    const template = practiceTemplates.find(t => t.id === templateId);
    if (!template) return;
    expandedDrillId = null;
    previewingTemplate = null;
    document.querySelectorAll('.drill-preview-marker').forEach(m => m.remove());
    document.querySelectorAll('.drill-preview-line').forEach(l => l.remove());
    const distanceLine = document.getElementById('distanceLine');
    if (distanceLine) distanceLine.remove();
    const distanceLabel = document.getElementById('distanceLabel');
    if (distanceLabel) distanceLabel.remove();
    if (activeTemplate?.id === templateId) {
        clearTemplate();
        return;
    }
    activeTemplate = template;
    const progressKey = template.isDynamic 
        ? `${template.id}-${drillSettings.distance}-${drillSettings.shotType}-${drillSettings.footOption}-${drillSettings.totalShots}`
        : template.id;
    if (!drillProgress[progressKey]) {
        drillProgress[progressKey] = {};
    }
    const sessionName = template.isDynamic 
        ? `${template.name} - ${drillSettings.distance}m ${drillSettings.shotType}`
        : template.name;
    document.getElementById('sessionName').value = sessionName;
    if (!currentSession) {
        currentSession = {
            id: Date.now(),
            name: sessionName,
            date: new Date().toISOString().split('T')[0],
            type: 'practice',
            matchType: null,
            shots: [],
            startTime: new Date().toISOString()
        };
        document.getElementById('currentSessionBanner').style.display = 'block';
        document.getElementById('currentSessionName').textContent = currentSession.name;
        document.getElementById('currentSessionDetails').textContent = `practice - ${currentSession.date}`;
    }
    renderDrillSpots();
    document.getElementById('pitchTogglesRow1').style.display = 'none';
    document.getElementById('pitchTogglesRow2').style.display = 'none';
    showDrillBanner();
    renderPracticeTemplates();
}
function getActiveProgressKey() {
    if (!activeTemplate) return null;
    return activeTemplate.isDynamic 
        ? `${activeTemplate.id}-${drillSettings.distance}-${drillSettings.shotType}-${drillSettings.footOption}-${drillSettings.totalShots}`
        : activeTemplate.id;
}
function getActiveSpots() {
    if (!activeTemplate) return [];
    if (activeTemplate.isDynamic) {
        const baseSpots = calculateScoringZoneSpots(drillSettings.distance);
        const shotsPerSpot = drillSettings.totalShots / 5; // 5 spots
        return baseSpots.map(spot => ({
            ...spot,
            shots: shotsPerSpot,
            foot: drillSettings.footOption,
            shotCategory: drillSettings.shotType === 'free-kick' ? 'free-kick' : 'in-play',
            shotType: drillSettings.shotType
        }));
    }
    return activeTemplate.spots;
}
function renderDrillSpots() {
    document.querySelectorAll('.drill-spot').forEach(el => el.remove());
    document.querySelectorAll('.drill-distance-line').forEach(el => el.remove());
    if (!activeTemplate) return;
    const pitchWrapper = document.getElementById('pitchWrapper');
    const progressKey = getActiveProgressKey();
    const progress = drillProgress[progressKey] || {};
    const spots = getActiveSpots();
    spots.forEach(spot => {
        const spotProgress = progress[spot.id];
        const isCompleted = spotProgress && (
            (drillSettings.footOption === 'both' && spotProgress.right && spotProgress.left) ||
            (drillSettings.footOption !== 'both' && spotProgress.total > 0)
        );
        const isPartial = spotProgress && !isCompleted && (spotProgress.right || spotProgress.left || spotProgress.total > 0);
        const marker = document.createElement('div');
        marker.className = 'drill-spot' + (isCompleted ? ' completed' : '') + (isPartial ? ' partial' : '');
        marker.style.left = spot.x + '%';
        marker.style.top = spot.y + '%';
        marker.dataset.spotId = spot.id;
        if (drillSettings.footOption === 'both') {
            const rightScore = spotProgress?.right || { scored: 0, total: 0 };
            const leftScore = spotProgress?.left || { scored: 0, total: 0 };
            if (isCompleted || isPartial) {
                marker.innerHTML = `<span class="spot-score">${rightScore.scored + leftScore.scored}/${rightScore.total + leftScore.total}</span>`;
            } else {
                marker.innerHTML = `<span class="spot-number">${spot.id}</span>`;
            }
        } else {
            if (isCompleted) {
                marker.innerHTML = `<span class="spot-score">${spotProgress.scored}/${spotProgress.total}</span>`;
            } else {
                marker.innerHTML = `<span class="spot-number">${spot.id}</span>`;
            }
        }
        marker.title = `${spot.name}\n${drillSettings.distance}m • ${spot.shots} shots • ${drillSettings.footOption === 'both' ? 'Both feet' : drillSettings.footOption + ' foot'}`;
        marker.ondblclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            openSpotScoreModal(spot);
        };
        let pressTimer = null;
        let longPressTriggered = false;
        marker.ontouchstart = (e) => {
            longPressTriggered = false;
            pressTimer = setTimeout(() => {
                longPressTriggered = true;
                openSpotScoreModal(spot);
            }, 500); // 500ms hold
        };
        marker.ontouchend = (e) => {
            clearTimeout(pressTimer);
            if (longPressTriggered) {
                e.preventDefault();
            }
        };
        marker.ontouchmove = (e) => {
            clearTimeout(pressTimer);
        };
        marker.onclick = (e) => {
            e.stopPropagation();
            if (!longPressTriggered) {
                openSpotScoreModal(spot);
            }
        };
        pitchWrapper.appendChild(marker);
        const svg = document.getElementById('pitch');
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'drill-distance-line');
        line.setAttribute('x1', (spot.x / 100) * 500);
        line.setAttribute('y1', (spot.y / 100) * 725);
        line.setAttribute('x2', 225); // Goal center x
        line.setAttribute('y2', 40);  // Goal y
        line.setAttribute('stroke', isCompleted ? '#4CAF50' : (isPartial ? '#FF9800' : '#333'));
        line.setAttribute('stroke-width', '1.5');
        line.setAttribute('stroke-dasharray', '5,5');
        line.setAttribute('opacity', '0.6');
        svg.appendChild(line);
        const distLabel = document.createElement('div');
        distLabel.className = 'drill-distance-label';
        distLabel.style.left = spot.x + '%';
        distLabel.style.top = (spot.y + 4) + '%';
        distLabel.textContent = drillSettings.distance + 'm';
        pitchWrapper.appendChild(distLabel);
    });
}
function openSpotScoreModal(spot) {
    const progressKey = getActiveProgressKey();
    const progress = drillProgress[progressKey] || {};
    const spotProgress = progress[spot.id] || {};
    let modal = document.getElementById('spotScoreModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'spotScoreModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    const isBothFeet = drillSettings.footOption === 'both';
    const shotsPerFoot = isBothFeet ? 2 : 4;
    if (isBothFeet) {
        const rightProgress = spotProgress.right || { scored: 0, total: shotsPerFoot };
        const leftProgress = spotProgress.left || { scored: 0, total: shotsPerFoot };
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">${spot.name} - ${drillSettings.distance}m</div>
                <div class="modal-body">
                    <p style="color: #666; margin-bottom: 15px; text-align: center;">
                        ${drillSettings.shotType} • 2 kicks each foot
                    </p>
                    <div style="display: flex; gap: 20px;">
                        <div style="flex: 1; text-align: center;">
                            <div style="font-weight: bold; margin-bottom: 10px; color: #2a5298;">🦶 Right Foot</div>
                            <div class="input-group">
                                <label>Scored / 2</label>
                                <input type="number" id="spotScoredRight" min="0" max="2" value="${rightProgress.scored}" style="font-size: 24px;">
                            </div>
                        </div>
                        <div style="flex: 1; text-align: center;">
                            <div style="font-weight: bold; margin-bottom: 10px; color: #2a5298;">🦶 Left Foot</div>
                            <div class="input-group">
                                <label>Scored / 2</label>
                                <input type="number" id="spotScoredLeft" min="0" max="2" value="${leftProgress.scored}" style="font-size: 24px;">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn-secondary" onclick="closeSpotModal()">Cancel</button>
                    <button class="btn-primary" onclick="saveSpotScoreBothFeet(${spot.id})">Save</button>
                    ${(spotProgress.right || spotProgress.left) ? '<button class="btn-danger" onclick="clearSpotScore(' + spot.id + ')" style="background: #f44336;">Clear</button>' : ''}
                </div>
            </div>
        `;
    } else {
        const singleProgress = spotProgress.total ? spotProgress : { scored: 0, total: 4 };
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">${spot.name} - ${drillSettings.distance}m</div>
                <div class="modal-body">
                    <p style="color: #666; margin-bottom: 15px; text-align: center;">
                        ${drillSettings.shotType} • ${drillSettings.footOption} foot • 4 kicks
                    </p>
                    <div class="input-group">
                        <label>Scored out of 4</label>
                        <input type="number" id="spotScored" min="0" max="4" value="${singleProgress.scored}" style="font-size: 24px;">
                    </div>
                </div>
                <div class="modal-footer" style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn-secondary" onclick="closeSpotModal()">Cancel</button>
                    <button class="btn-primary" onclick="saveSpotScore(${spot.id})">Save</button>
                    ${spotProgress.total ? '<button class="btn-danger" onclick="clearSpotScore(' + spot.id + ')" style="background: #f44336;">Clear</button>' : ''}
                </div>
            </div>
        `;
    }
    modal.classList.add('active');
    setTimeout(() => {
        const firstInput = modal.querySelector('input[type="number"]');
        if (firstInput) {
            firstInput.focus();
            firstInput.select();
        }
    }, 100);
}
function saveSpotScore(spotId) {
    const shotsPerSpot = drillSettings.totalShots / 5; // Dynamic based on settings
    const scored = parseInt(document.getElementById('spotScored').value) || 0;
    const total = shotsPerSpot;
    const progressKey = getActiveProgressKey();
    if (!drillProgress[progressKey]) {
        drillProgress[progressKey] = {};
    }
    const spots = getActiveSpots();
    const spot = spots.find(s => s.id === spotId);
    const previousProgress = drillProgress[progressKey][spotId];
    const previousScored = previousProgress?.scored || 0;
    const previousTotal = previousProgress?.total || 0;
    drillProgress[progressKey][spotId] = { scored: Math.min(scored, total), total };
    localStorage.setItem('gaaDrillProgress', JSON.stringify(drillProgress));
    if (currentSession && spot) {
        if (previousTotal > 0) {
            currentSession.shots = currentSession.shots.filter(s => 
                !(s.drillSpotId === spotId && s.drillKey === progressKey)
            );
        }
        const pointValue = is2PointZone(spot.x, spot.y) ? 2 : 1;
        for (let i = 0; i < total; i++) {
            const isScored = i < scored;
            currentSession.shots.push({
                id: Date.now() + i,
                x: spot.x,
                y: spot.y,
                result: isScored ? 'scored' : 'missed',
                distance: drillSettings.distance,
                foot: drillSettings.footOption,
                shotCategory: drillSettings.shotType === 'free-kick' ? 'free-kick' : 'in-play',
                shotType: drillSettings.shotType,
                shotFor: 'point',
                drillSpotId: spotId,
                drillKey: progressKey,
                pointValue: pointValue
            });
        }
        saveData();
        updateCurrentSessionStats();
    }
    closeSpotModal();
    renderDrillSpots();
    renderPracticeTemplates();
    showDrillBanner();
}
function saveSpotScoreBothFeet(spotId) {
    const scoredRight = Math.min(parseInt(document.getElementById('spotScoredRight').value) || 0, 2);
    const scoredLeft = Math.min(parseInt(document.getElementById('spotScoredLeft').value) || 0, 2);
    const progressKey = getActiveProgressKey();
    if (!drillProgress[progressKey]) {
        drillProgress[progressKey] = {};
    }
    const spots = getActiveSpots();
    const spot = spots.find(s => s.id === spotId);
    const previousProgress = drillProgress[progressKey][spotId];
    drillProgress[progressKey][spotId] = {
        right: { scored: scoredRight, total: 2 },
        left: { scored: scoredLeft, total: 2 }
    };
    localStorage.setItem('gaaDrillProgress', JSON.stringify(drillProgress));
    if (currentSession && spot) {
        if (previousProgress) {
            currentSession.shots = currentSession.shots.filter(s => 
                !(s.drillSpotId === spotId && s.drillKey === progressKey)
            );
        }
        const pointValue = is2PointZone(spot.x, spot.y) ? 2 : 1;
        for (let i = 0; i < 2; i++) {
            const isScored = i < scoredRight;
            currentSession.shots.push({
                id: Date.now() + i,
                x: spot.x,
                y: spot.y,
                result: isScored ? 'scored' : 'missed',
                distance: drillSettings.distance,
                foot: 'right',
                shotCategory: drillSettings.shotType === 'free-kick' ? 'free-kick' : 'in-play',
                shotType: drillSettings.shotType,
                shotFor: 'point',
                drillSpotId: spotId,
                drillKey: progressKey,
                pointValue: pointValue
            });
        }
        for (let i = 0; i < 2; i++) {
            const isScored = i < scoredLeft;
            currentSession.shots.push({
                id: Date.now() + 10 + i,
                x: spot.x,
                y: spot.y,
                result: isScored ? 'scored' : 'missed',
                distance: drillSettings.distance,
                foot: 'left',
                shotCategory: drillSettings.shotType === 'free-kick' ? 'free-kick' : 'in-play',
                shotType: drillSettings.shotType,
                shotFor: 'point',
                drillSpotId: spotId,
                drillKey: progressKey,
                pointValue: pointValue
            });
        }
        saveData();
        updateCurrentSessionStats();
    }
    closeSpotModal();
    renderDrillSpots();
    renderPracticeTemplates();
    showDrillBanner();
}
function clearSpotScore(spotId) {
    const progressKey = getActiveProgressKey();
    if (currentSession) {
        currentSession.shots = currentSession.shots.filter(s => 
            !(s.drillSpotId === spotId && s.drillKey === progressKey)
        );
        saveData();
        updateCurrentSessionStats();
    }
    if (drillProgress[progressKey]) {
        delete drillProgress[progressKey][spotId];
        localStorage.setItem('gaaDrillProgress', JSON.stringify(drillProgress));
    }
    closeSpotModal();
    renderDrillSpots();
    renderPracticeTemplates();
    showDrillBanner();
}
function closeSpotModal() {
    const modal = document.getElementById('spotScoreModal');
    if (modal) modal.classList.remove('active');
}
function showDrillBanner() {
    if (!activeTemplate) return;
    let banner = document.getElementById('drillBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'drillBanner';
        banner.className = 'current-drill-banner';
        const pitchContainer = document.querySelector('.pitch-container');
        pitchContainer.insertBefore(banner, pitchContainer.firstChild);
    }
    const progressKey = getActiveProgressKey();
    const progress = drillProgress[progressKey] || {};
    const spots = getActiveSpots();
    const totalSpots = spots.length;
    let completedSpots = 0;
    let totalScored = 0;
    let totalAttempted = 0;
    Object.values(progress).forEach(p => {
        if (drillSettings.footOption === 'both') {
            if (p.right && p.left) {
                completedSpots++;
                totalScored += (p.right.scored || 0) + (p.left.scored || 0);
                totalAttempted += (p.right.total || 0) + (p.left.total || 0);
            } else if (p.right || p.left) {
                totalScored += (p.right?.scored || 0) + (p.left?.scored || 0);
                totalAttempted += (p.right?.total || 0) + (p.left?.total || 0);
            }
        } else {
            if (p.total > 0) {
                completedSpots++;
                totalScored += p.scored || 0;
                totalAttempted += p.total || 0;
            }
        }
    });
    const percentage = totalAttempted > 0 ? Math.round((totalScored / totalAttempted) * 100) : 0;
    const isComplete = completedSpots === totalSpots;
    const targetMet = percentage >= 80;
    banner.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
                <h4 style="margin: 0;">📋 ${activeTemplate.name} - ${drillSettings.distance}m</h4>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">
                    ${drillSettings.shotType} • ${drillSettings.footOption === 'both' ? 'Both feet' : drillSettings.footOption + ' foot'}
                </p>
                <p style="margin: 5px 0 0 0; font-size: 14px;">
                    Progress: <strong>${completedSpots}/${totalSpots} spots</strong> • 
                    Score: <strong style="color: ${targetMet ? '#90EE90' : '#FFB74D'};">${totalScored}/${totalAttempted}</strong> 
                    (${percentage}%) ${targetMet ? '🎯' : ''}
                </p>
                ${isComplete && targetMet ? '<p style="margin: 5px 0 0 0; color: #90EE90; font-weight: bold;">✓ Great session! Consider moving to ' + getNextDistance() + 'm</p>' : ''}
                ${isComplete && !targetMet ? '<p style="margin: 5px 0 0 0; color: #FFB74D;">Keep practicing at ' + drillSettings.distance + 'm until you hit 80%+</p>' : ''}
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button onclick="finishDrillSession()" class="btn-primary" style="padding: 8px 15px; font-size: 12px; background: #4CAF50;">✓ Finish Session</button>
                <button onclick="resetDrillProgress()" class="btn-secondary" style="padding: 8px 15px; font-size: 12px;">Reset</button>
                <button onclick="clearTemplate()" class="btn-danger" style="padding: 8px 15px; font-size: 12px; background: #f44336;">✕ Close</button>
            </div>
        </div>
    `;
    banner.style.display = 'block';
}
function getNextDistance() {
    const distances = [15, 17, 20, 24, 30, 35, 40, 45];
    const currentIndex = distances.indexOf(drillSettings.distance);
    return currentIndex < distances.length - 1 ? distances[currentIndex + 1] : 45;
}
async function finishDrillSession() {
    console.log('finishDrillSession called');
    console.log('currentSession:', currentSession);
    console.log('currentAssignedDrillId:', window.currentAssignedDrillId);
    if (!currentSession) {
        alert('No active session to finish.');
        return;
    }
    if (currentSession.shots.length === 0) {
        alert('No shots recorded in this session. Please enter your scores first.');
        return;
    }
    const totalShots = currentSession.shots.length;
    const scoredShots = currentSession.shots.filter(s => s.result === 'scored').length;
    const percentage = Math.round((scoredShots / totalShots) * 100);
    console.log('Drill stats:', { totalShots, scoredShots, percentage });
    if (window.currentAssignedDrillId && currentUser) {
        console.log('Recording drill completion to database...');
        try {
            const completionData = {
                drill_id: window.currentAssignedDrillId,
                user_id: currentUser.id,
                scored: scoredShots,
                total: totalShots,
                score_percentage: percentage,
                completed_at: new Date().toISOString()
            };
            console.log('Completion data:', completionData);
            const { data, error } = await supabaseClient
                .from('drill_completions')
                .insert(completionData)
                .select();
            if (error) {
                console.error('Error recording drill completion:', error);
                alert('Drill finished but failed to record completion: ' + error.message);
            } else {
                console.log('Drill completion recorded successfully!', data);
                alert(`Great job! You scored ${scoredShots}/${totalShots} (${percentage}%). Your completion has been recorded.`);
            }
        } catch (e) {
            console.error('Error recording drill completion:', e);
            alert('Drill finished but failed to record completion: ' + e.message);
        }
        window.currentAssignedDrillId = null;
    }
    endSession();
    clearTemplate();
}
function hideDrillBanner() {
    const banner = document.getElementById('drillBanner');
    if (banner) banner.style.display = 'none';
}
function resetDrillProgress() {
    if (!activeTemplate) return;
    if (!confirm('Reset all scores for this drill configuration?')) return;
    const progressKey = getActiveProgressKey();
    drillProgress[progressKey] = {};
    localStorage.setItem('gaaDrillProgress', JSON.stringify(drillProgress));
    renderDrillSpots();
    renderPracticeTemplates();
    showDrillBanner();
}
function clearTemplate() {
    activeTemplate = null;
    expandedDrillId = null;
    document.querySelectorAll('.drill-spot').forEach(el => el.remove());
    document.querySelectorAll('.drill-distance-line').forEach(el => el.remove());
    document.querySelectorAll('.drill-distance-label').forEach(el => el.remove());
    document.getElementById('pitchTogglesRow1').style.display = 'flex';
    document.getElementById('pitchTogglesRow2').style.display = 'flex';
    hideDrillBanner();
    renderPracticeTemplates();
}
function loadDrillProgress() {
    const stored = localStorage.getItem('gaaDrillProgress');
    if (stored) {
        drillProgress = JSON.parse(stored);
    }
}
loadDrillProgress();
