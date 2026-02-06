const _originalSaveData = saveData;
saveData = function() {
    _originalSaveData();
    if (!currentUser || !currentSession) return;
    if (!currentSession.shots || currentSession.shots.length === 0) return;
    cloudSavePromise = (async () => {
        if (!currentSession.cloudId) {
            await saveSessionToCloud(currentSession);
        }
        if (currentSession.cloudId && currentSession.shots) {
            for (const shot of currentSession.shots) {
                if (!shot.cloudId) {
                    await saveShotToCloud(shot, currentSession.cloudId);
                }
            }
        }
    })();
};
initAuth();
