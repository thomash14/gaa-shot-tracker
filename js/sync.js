function startOfflineMode() {
    offlineModeActive = true;
    currentUser = null;
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('appContent').classList.add('visible');
    document.getElementById('userHeader').style.display = 'none';
    loadData();
    hideLoading();
    updateSyncStatus('error', '⚡ Offline');
}

function showAuth() {
    if (offlineModeActive) return;
    currentUser = null;
    document.getElementById('authContainer').style.display = 'block';
    document.getElementById('appContent').classList.remove('visible');
    document.getElementById('userHeader').style.display = 'none';
    hideLoading();
}

function updateSyncStatus(status, message) {
    const el = document.getElementById('syncStatus');
    if (el) {
        el.className = 'sync-status ' + status;
        el.textContent = message;
    }
    updateSyncDot(status);
}
function checkForLocalData() {
    const data = window.localStorage.getItem('gaaShotTracker');
    if (data) {
        const parsed = JSON.parse(data);
        if (parsed.sessions && parsed.sessions.length > 0) {
            document.getElementById('migrationBanner').style.display = 'block';
        }
    }
}
async function migrateLocalData() {
    showLoading('Importing your data...');
    try {
        const localData = JSON.parse(localStorage.getItem('gaaShotTracker') || '{}');
        const localDrill = JSON.parse(localStorage.getItem('gaaDrillProgress') || '{}');
        for (const session of (localData.sessions || [])) {
            await migrateSession(session);
        }
        if (localData.currentSession?.shots?.length > 0) {
            await migrateSession(localData.currentSession);
        }
        for (const [key, scores] of Object.entries(localDrill)) {
            await supabaseClient.from('drill_progress').upsert({
                user_id: currentUser.id,
                progress_key: key,
                spot_scores: scores
            }, { onConflict: 'user_id,progress_key' });
        }
        localStorage.removeItem('gaaShotTracker');
        localStorage.removeItem('gaaDrillProgress');
        document.getElementById('migrationBanner').style.display = 'none';
        await loadDataFromCloud();
        hideLoading();
        alert('Data imported successfully!');
    } catch (error) {
        hideLoading();
        alert('Import error: ' + error.message);
    }
}
async function migrateSession(session) {
    const { data: sData, error: sErr } = await supabaseClient.from('sessions').insert({
        user_id: currentUser.id,
        name: session.name || 'Imported',
        date: session.date || new Date().toISOString().split('T')[0],
        type: session.type || 'practice',
        match_type: session.matchType,
        start_time: session.startTime,
        end_time: session.endTime
    }).select().single();
    if (sErr) throw sErr;
    if (session.shots?.length > 0) {
        const shots = session.shots.map(s => ({
            session_id: sData.id, x: s.x, y: s.y, result: s.result,
            distance: s.distance, foot: s.foot, shot_category: s.shotCategory,
            shot_type: s.shotType, shot_for: s.shotFor, point_value: s.pointValue || 1,
            half: s.half, comment: s.comment, timestamp: s.timestamp
        }));
        const { error } = await supabaseClient.from('shots').insert(shots);
        if (error) throw error;
    }
}
function skipMigration() {
    document.getElementById('migrationBanner').style.display = 'none';
    localStorage.removeItem('gaaShotTracker');
    localStorage.removeItem('gaaDrillProgress');
}
async function loadDataFromCloud() {
    if (!supabaseClient || !currentUser) {
        loadData();
        return;
    }
    updateSyncStatus('syncing', '↻ Syncing...');
    try {
        const { data: sessionsData, error } = await supabaseClient
            .from('sessions')
            .select('*, shots(*)')
            .eq('user_id', currentUser.id)
            .order('date', { ascending: false });
        if (error) throw error;
        sessions = sessionsData.map(s => ({
            id: s.id, name: s.name, date: s.date, type: s.type,
            matchType: s.match_type, startTime: s.start_time, endTime: s.end_time,
            shots: (s.shots || []).map(shot => ({
                id: shot.id, x: parseFloat(shot.x), y: parseFloat(shot.y),
                result: shot.result, distance: shot.distance ? parseFloat(shot.distance) : null,
                foot: shot.foot, shotCategory: shot.shot_category, shotType: shot.shot_type,
                shotFor: shot.shot_for, pointValue: shot.point_value, half: shot.half,
                comment: shot.comment, timestamp: shot.timestamp
            }))
        }));
        if (sessions.length === 0) {
            const localData = window.localStorage.getItem('gaaShotTracker');
            if (localData) {
                const parsed = JSON.parse(localData);
                if (parsed.sessions && parsed.sessions.length > 0) {
                    sessions = parsed.sessions;
                }
                if (parsed.currentSession) {
                    currentSession = parsed.currentSession;
                }
            }
        }
        const { data: drillData } = await supabaseClient
            .from('drill_progress')
            .select('*')
            .eq('user_id', currentUser.id);
        drillProgress = {};
        (drillData || []).forEach(d => drillProgress[d.progress_key] = d.spot_scores);
        await loadCustomDrills();
        updateSyncStatus('synced', '✓ Synced');
        updateUI();
        hideLoading();
    } catch (error) {
        console.error('Load error:', error);
        updateSyncStatus('error', '✗ Error');
        const localData = window.localStorage.getItem('gaaShotTracker');
        if (localData) {
            const parsed = JSON.parse(localData);
            if (parsed.sessions && parsed.sessions.length > 0) {
                sessions = parsed.sessions;
            }
            if (parsed.currentSession) {
                currentSession = parsed.currentSession;
            }
        }
        updateUI();
        hideLoading();
    }
}
async function saveSessionToCloud(session) {
    if (!currentUser) return;
    updateSyncStatus('syncing', '↻ Saving...');
    try {
        if (session.cloudId) {
            await supabaseClient.from('sessions').update({
                name: session.name, date: session.date, type: session.type,
                match_type: session.matchType, end_time: session.endTime
            }).eq('id', session.cloudId);
        } else {
            const { data, error } = await supabaseClient.from('sessions').insert({
                user_id: currentUser.id, name: session.name, date: session.date,
                type: session.type, match_type: session.matchType, start_time: session.startTime
            }).select().single();
            if (error) throw error;
            session.cloudId = data.id;
            session.id = data.id;
        }
        updateSyncStatus('synced', '✓ Synced');
    } catch (error) {
        console.error('Save error:', error);
        updateSyncStatus('error', '✗ Failed');
    }
}
async function saveShotToCloud(shot, sessionId) {
    if (!currentUser) return;
    try {
        const { data, error } = await supabaseClient.from('shots').insert({
            session_id: sessionId, x: shot.x, y: shot.y, result: shot.result,
            distance: shot.distance, foot: shot.foot, shot_category: shot.shotCategory,
            shot_type: shot.shotType, shot_for: shot.shotFor, point_value: shot.pointValue,
            half: shot.half, comment: shot.comment, timestamp: shot.timestamp
        }).select().single();
        if (error) throw error;
        shot.cloudId = data.id;
    } catch (error) {
        console.error('Shot save error:', error);
    }
}
async function deleteShotFromCloud(shotId) {
    if (!currentUser || !shotId) return;
    try {
        await supabaseClient.from('shots').delete().eq('id', shotId);
    } catch (error) {
        console.error('Shot delete error:', error);
    }
}
async function deleteSessionFromCloud(sessionId) {
    if (!currentUser) return;
    updateSyncStatus('syncing', '↻ Deleting...');
    try {
        await supabaseClient.from('sessions').delete().eq('id', sessionId);
        updateSyncStatus('synced', '✓ Synced');
    } catch (error) {
        console.error('Delete error:', error);
        updateSyncStatus('error', '✗ Failed');
    }
}
async function saveDrillProgressToCloud(key, scores) {
    if (!currentUser) return;
    try {
        await supabaseClient.from('drill_progress').upsert({
            user_id: currentUser.id, progress_key: key,
            spot_scores: scores, updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,progress_key' });
    } catch (error) {
        console.error('Drill save error:', error);
    }
}

async function initAuth() {
    showLoading('Checking authentication...');
    if (!supabaseClient) {
        startOfflineMode();
        return;
    }
    let authResolved = false;
    const authTimeout = setTimeout(() => {
        if (!authResolved) {
            authResolved = true;
            console.warn('Auth check timed out — starting offline mode');
            startOfflineMode();
        }
    }, 5000);
    try {
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (authResolved && event === 'INITIAL_SESSION') return;
            clearTimeout(authTimeout);
            authResolved = true;
            if (session?.user) {
                offlineModeActive = false;
                showApp(session.user);
            } else if (!offlineModeActive) {
                showAuth();
            }
        });
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!authResolved) {
            clearTimeout(authTimeout);
            authResolved = true;
            if (session?.user) showApp(session.user);
            else showAuth();
        }
    } catch (error) {
        if (!authResolved) {
            clearTimeout(authTimeout);
            authResolved = true;
            console.warn('Auth check failed:', error);
            startOfflineMode();
        }
    }
}
