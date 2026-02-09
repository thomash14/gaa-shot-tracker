// Multi-select checkbox dropdown component
const _msRegistry = {};

function initMultiSelect(id, options, onChange) {
    const container = document.getElementById(id);
    if (!container) return;
    container.classList.add('ms-container');
    container.innerHTML = '';

    const selected = new Set(options.map(o => o.value));

    const trigger = document.createElement('div');
    trigger.className = 'ms-trigger';
    trigger.textContent = 'All';

    const panel = document.createElement('div');
    panel.className = 'ms-panel';

    _msRegistry[id] = { options, selected, onChange, trigger, panel, container };

    _msRenderPanel(id);

    trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        // Close any other open panels first
        Object.keys(_msRegistry).forEach(otherId => {
            if (otherId !== id) _msRegistry[otherId].panel.style.display = 'none';
        });
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    });

    container.appendChild(trigger);
    container.appendChild(panel);
}

function _msRenderPanel(id) {
    const reg = _msRegistry[id];
    if (!reg) return;
    const { options, selected, panel } = reg;

    let html = '';
    // Select All toggle
    const allChecked = selected.size === options.length;
    html += `<label class="ms-toggle-all">
        <input type="checkbox" ${allChecked ? 'checked' : ''} data-ms-toggle-all="${id}">
        Select All
    </label>`;

    let lastGroup = null;
    options.forEach(opt => {
        if (opt.group && opt.group !== lastGroup) {
            html += `<div class="ms-group-header">${opt.group}</div>`;
            lastGroup = opt.group;
        }
        const checked = selected.has(opt.value) ? 'checked' : '';
        html += `<label class="ms-option">
            <input type="checkbox" ${checked} data-ms-value="${opt.value}" data-ms-id="${id}">
            ${opt.label}
        </label>`;
    });

    panel.innerHTML = html;

    // Bind toggle-all
    const toggleAll = panel.querySelector(`[data-ms-toggle-all="${id}"]`);
    if (toggleAll) {
        toggleAll.addEventListener('change', function(e) {
            e.stopPropagation();
            if (this.checked) {
                options.forEach(o => selected.add(o.value));
            } else {
                selected.clear();
            }
            // Update all option checkboxes
            panel.querySelectorAll(`[data-ms-id="${id}"]`).forEach(cb => {
                cb.checked = this.checked;
            });
            _msUpdateLabel(id);
            if (reg.onChange) reg.onChange();
        });
    }

    // Bind individual options
    panel.querySelectorAll(`[data-ms-id="${id}"]`).forEach(cb => {
        cb.addEventListener('change', function(e) {
            e.stopPropagation();
            const val = this.getAttribute('data-ms-value');
            if (this.checked) {
                selected.add(val);
            } else {
                selected.delete(val);
            }
            // Update toggle-all state
            const ta = panel.querySelector(`[data-ms-toggle-all="${id}"]`);
            if (ta) {
                ta.checked = selected.size === options.length;
                ta.indeterminate = selected.size > 0 && selected.size < options.length;
            }
            _msUpdateLabel(id);
            if (reg.onChange) reg.onChange();
        });
    });
}

function _msUpdateLabel(id) {
    const reg = _msRegistry[id];
    if (!reg) return;
    const { options, selected, trigger } = reg;
    if (selected.size === options.length) {
        trigger.textContent = 'All';
    } else if (selected.size === 0) {
        trigger.textContent = 'None';
    } else if (selected.size <= 2) {
        const labels = options.filter(o => selected.has(o.value)).map(o => o.label);
        trigger.textContent = labels.join(', ');
    } else {
        trigger.textContent = selected.size + ' selected';
    }
}

function getMultiSelectValues(id) {
    const reg = _msRegistry[id];
    if (!reg) return null;
    if (reg.selected.size === reg.options.length) return null; // all selected = no filter
    return new Set(reg.selected);
}

function resetMultiSelect(id) {
    const reg = _msRegistry[id];
    if (!reg) return;
    reg.options.forEach(o => reg.selected.add(o.value));
    // Re-render panel to update checkboxes
    _msRenderPanel(id);
    _msUpdateLabel(id);
    // Do NOT call onChange — callers handle refresh
}

function setMultiSelectOptions(id, newOptions) {
    const reg = _msRegistry[id];
    if (!reg) return;
    const oldSelected = reg.selected;
    const newSelected = new Set();
    newOptions.forEach(o => {
        if (oldSelected.has(o.value)) {
            newSelected.add(o.value);
        } else if (!reg.options.some(old => old.value === o.value)) {
            // New option that didn't exist before — default to checked
            newSelected.add(o.value);
        }
    });
    // If all old options were selected, select all new ones too
    if (oldSelected.size === reg.options.length) {
        newOptions.forEach(o => newSelected.add(o.value));
    }
    reg.options = newOptions;
    reg.selected = newSelected;
    _msRenderPanel(id);
    _msUpdateLabel(id);
}

function msFilterShots(shots, id, accessor) {
    const vals = getMultiSelectValues(id);
    if (vals === null) return shots;
    const fn = typeof accessor === 'function' ? accessor : (s => s[accessor]);
    return shots.filter(s => vals.has(fn(s)));
}

// Click-outside-to-close: single global listener
document.addEventListener('click', function(e) {
    Object.keys(_msRegistry).forEach(id => {
        const reg = _msRegistry[id];
        if (reg.container && !reg.container.contains(e.target)) {
            reg.panel.style.display = 'none';
        }
    });
});

// Shared option definitions used by both analytics and player data multi-selects
function _windDirectionOptions() {
    return [
        { value: 'no-wind', label: 'No wind' },
        { value: 'straight-with', label: 'Straight with', group: 'With' },
        { value: 'diag-lr-with', label: 'Diag L-R with', group: 'With' },
        { value: 'diag-rl-with', label: 'Diag R-L with', group: 'With' },
        { value: 'straight-against', label: 'Straight against', group: 'Against' },
        { value: 'diag-lr-against', label: 'Diag L-R against', group: 'Against' },
        { value: 'diag-rl-against', label: 'Diag R-L against', group: 'Against' },
        { value: 'cross-lr', label: 'Cross L-R', group: 'Cross' },
        { value: 'cross-rl', label: 'Cross R-L', group: 'Cross' }
    ];
}

function _windStrengthOptions() {
    return [
        { value: 'light', label: 'Light' },
        { value: 'moderate', label: 'Moderate' },
        { value: 'strong', label: 'Strong' },
        { value: 'very-strong', label: 'Very Strong' }
    ];
}

function _shotCategoryOptions() {
    return [
        { value: 'in-play', label: 'In-Play' },
        { value: 'free-kick', label: 'Free-Kick' },
        { value: '45', label: '45' }
    ];
}

function _shotTypeOptions() {
    return [
        { value: 'not-defined', label: 'Not Defined' },
        { value: 'outside-of-the-boot', label: 'Outside Of The Boot' },
        { value: 'on-the-run', label: 'On the run' },
        { value: 'on-the-turn', label: 'On the turn' },
        { value: 'standing', label: 'Standing' },
        { value: 'off-a-dummy', label: 'Off a Dummy' },
        { value: 'off-the-hands', label: 'Off The Hands' },
        { value: 'off-the-ground', label: 'Off The Ground' }
    ];
}

function _footOptions() {
    return [
        { value: 'right', label: 'Right' },
        { value: 'left', label: 'Left' }
    ];
}

function _halfOptions() {
    return [
        { value: '1st', label: '1st Half' },
        { value: '2nd', label: '2nd Half' }
    ];
}

function _resultOptions() {
    return [
        { value: 'scored', label: 'Scored' },
        { value: 'missed', label: 'Missed' }
    ];
}
