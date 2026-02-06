function loadData() {
    const stored = window.localStorage.getItem('gaaShotTracker');
    if (stored) {
        const data = JSON.parse(stored);
        sessions = data.sessions || [];
        currentSession = data.currentSession || null;
    }
    updateUI();
}
function saveData() {
    window.localStorage.setItem('gaaShotTracker', JSON.stringify({
        sessions: sessions,
        currentSession: currentSession
    }));
}

// Debug helpers - call from browser console
window.debugSessions = function() {
    console.log('=== SESSION DEBUG ===');
    console.log(`Total sessions: ${sessions.length}`);
    console.log(`Current session: ${currentSession ? currentSession.id : 'none'}`);
    sessions.forEach((s, i) => {
        console.log(`Session ${i}: id=${s.id}, name="${s.name}", date=${s.date}, type=${s.type}, shots=${s.shots ? s.shots.length : 0}`);
    });
    if (currentSession) {
        console.log(`Current session: id=${currentSession.id}, name="${currentSession.name}", shots=${currentSession.shots ? currentSession.shots.length : 0}`);
    }
};

window.debugSession = function(sessionId) {
    const session = sessions.find(s => s.id === sessionId) || (currentSession && currentSession.id === sessionId ? currentSession : null);
    if (!session) {
        console.log(`Session ${sessionId} not found`);
        return;
    }
    console.log('=== SESSION DETAIL ===');
    console.log('Session:', JSON.stringify(session, null, 2));
    console.log(`\nShots breakdown (${session.shots ? session.shots.length : 0} total):`);
    if (session.shots) {
        session.shots.forEach((shot, i) => {
            console.log(`  Shot ${i + 1}: x=${shot.x.toFixed(1)}, y=${shot.y.toFixed(1)}, half=${shot.half}, result=${shot.result}, foot=${shot.foot}`);
        });
    }
    return session;
};

window.debugRawStorage = function() {
    const stored = window.localStorage.getItem('gaaShotTracker');
    if (stored) {
        const data = JSON.parse(stored);
        console.log('=== RAW LOCALSTORAGE ===');
        console.log(JSON.stringify(data, null, 2));
        return data;
    }
    console.log('No localStorage data found');
    return null;
};
