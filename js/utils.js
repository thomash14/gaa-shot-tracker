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
