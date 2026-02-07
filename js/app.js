const _originalSaveData = saveData;
saveData = function() {
    _originalSaveData();
    if (!currentUser || !currentSession) return;
    if (!currentSession.shots || currentSession.shots.length === 0) return;
    // Chain onto previous promise to prevent race conditions (e.g. duplicate session inserts)
    const previous = cloudSavePromise || Promise.resolve();
    cloudSavePromise = previous.then(async () => {
        if (!currentSession) return;
        if (!currentSession.cloudId) {
            await saveSessionToCloud(currentSession);
        }
        if (currentSession && currentSession.cloudId && currentSession.shots) {
            for (const shot of currentSession.shots) {
                if (!shot.cloudId) {
                    await saveShotToCloud(shot, currentSession.cloudId);
                }
            }
        }
    }).catch(err => console.error('Cloud sync error:', err));
};
initAuth();
