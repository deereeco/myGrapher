// ===== Application State =====
const state = {
    allData: {},
    columnOrder: {},
    graphs: []
};

// Graph counter for unique IDs
let graphIdCounter = 0;

// ===== Undo/Redo History System =====
const graphHistory = new Map(); // graphId -> { past: [], future: [] }
const debouncedUpdates = new Map(); // graphId -> debounced update function
const pendingHistorySaves = new Map(); // graphId -> { snapshot, timeoutId }
const filterDataRanges = new Map(); // graphId -> { x: { min, max }, y: { min, max }, z: { min, max } }

function initGraphHistory(graphId) {
    graphHistory.set(graphId, { past: [], future: [] });
}

function createGraphSnapshot(graph) {
    return JSON.parse(JSON.stringify({
        title: graph.title,
        sheetName: graph.sheetName,
        dimension: graph.dimension,
        graphType: graph.graphType,
        columns: graph.columns,
        filters: graph.filters,
        overlayPoints: graph.overlayPoints,
        overlayLines: graph.overlayLines,
        overlaySurfaces: graph.overlaySurfaces,
        hoverFields: graph.hoverFields,
        disableOverlayHover: graph.disableOverlayHover
    }));
}

function saveToHistory(graphId) {
    const graph = state.graphs.find(g => g.id === graphId);
    if (!graph) return;

    const history = graphHistory.get(graphId);
    if (!history) return;

    const snapshot = createGraphSnapshot(graph);
    history.past.push(snapshot);
    history.future = [];

    if (history.past.length > 25) {
        history.past.shift();
    }

    updateUndoRedoButtons(graphId);
}

function restoreGraphState(graph, snapshot) {
    graph.title = snapshot.title;
    graph.sheetName = snapshot.sheetName;
    graph.dimension = snapshot.dimension;
    graph.graphType = snapshot.graphType;
    graph.columns = { ...snapshot.columns };
    graph.filters = JSON.parse(JSON.stringify(snapshot.filters));
    graph.overlayPoints = JSON.parse(JSON.stringify(snapshot.overlayPoints));
    graph.overlayLines = JSON.parse(JSON.stringify(snapshot.overlayLines));
    graph.overlaySurfaces = JSON.parse(JSON.stringify(snapshot.overlaySurfaces));
    graph.hoverFields = [...snapshot.hoverFields];
    graph.disableOverlayHover = snapshot.disableOverlayHover || false;
}

function updateFiltersUI(graphId, graph) {
    document.getElementById(`x-min-${graphId}`).value = graph.filters.x.min ?? '';
    document.getElementById(`x-max-${graphId}`).value = graph.filters.x.max ?? '';
    document.getElementById(`x-ignore-zero-${graphId}`).checked = graph.filters.x.ignoreZero;
    document.getElementById(`y-min-${graphId}`).value = graph.filters.y.min ?? '';
    document.getElementById(`y-max-${graphId}`).value = graph.filters.y.max ?? '';
    document.getElementById(`y-ignore-zero-${graphId}`).checked = graph.filters.y.ignoreZero;
    const zMinEl = document.getElementById(`z-min-${graphId}`);
    if (zMinEl) {
        zMinEl.value = graph.filters.z.min ?? '';
        document.getElementById(`z-max-${graphId}`).value = graph.filters.z.max ?? '';
        document.getElementById(`z-ignore-zero-${graphId}`).checked = graph.filters.z.ignoreZero;
    }


    // Update sliders to match restored filter values
    syncInputsToSlider(graphId, 'x');
    syncInputsToSlider(graphId, 'y');
    syncInputsToSlider(graphId, 'z');

    // Update labels in case column changed
    updateAllFilterLabels(graphId);
}

function updateUndoRedoButtons(graphId) {
    const history = graphHistory.get(graphId);
    const undoBtn = document.getElementById(`undo-btn-${graphId}`);
    const redoBtn = document.getElementById(`redo-btn-${graphId}`);

    if (undoBtn) undoBtn.disabled = !history || history.past.length === 0;
    if (redoBtn) redoBtn.disabled = !history || history.future.length === 0;
}

function undo(graphId) {
    const graph = state.graphs.find(g => g.id === graphId);
    const history = graphHistory.get(graphId);
    if (!graph || !history || history.past.length === 0) return;

    history.future.push(createGraphSnapshot(graph));
    const previousState = history.past.pop();
    restoreGraphState(graph, previousState);

    populateGraphControls(graph);
    document.getElementById(`title-${graphId}`).value = graph.title;
    updateFiltersUI(graphId, graph);
    updateGraph(graphId);
    updateUndoRedoButtons(graphId);
}

function redo(graphId) {
    const graph = state.graphs.find(g => g.id === graphId);
    const history = graphHistory.get(graphId);
    if (!graph || !history || history.future.length === 0) return;

    history.past.push(createGraphSnapshot(graph));
    const nextState = history.future.pop();
    restoreGraphState(graph, nextState);

    populateGraphControls(graph);
    document.getElementById(`title-${graphId}`).value = graph.title;
    updateFiltersUI(graphId, graph);
    updateGraph(graphId);
    updateUndoRedoButtons(graphId);
}

// ===== Debounce Utilities =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function getDebouncedUpdate(graphId) {
    if (!debouncedUpdates.has(graphId)) {
        debouncedUpdates.set(graphId, debounce(() => {
            updateGraph(graphId);
        }, 300));
    }
    return debouncedUpdates.get(graphId);
}

function scheduleHistorySave(graphId) {
    if (pendingHistorySaves.has(graphId)) {
        clearTimeout(pendingHistorySaves.get(graphId).timeoutId);
    }

    const existingEntry = pendingHistorySaves.get(graphId);
    if (!existingEntry || !existingEntry.snapshot) {
        const graph = state.graphs.find(g => g.id === graphId);
        if (!graph) return;
        pendingHistorySaves.set(graphId, {
            snapshot: createGraphSnapshot(graph),
            timeoutId: null
        });
    }

    const entry = pendingHistorySaves.get(graphId);
    entry.timeoutId = setTimeout(() => {
        commitPendingHistorySave(graphId);
    }, 300);
}

function commitPendingHistorySave(graphId) {
    const entry = pendingHistorySaves.get(graphId);
    if (!entry || !entry.snapshot) return;

    const history = graphHistory.get(graphId);
    if (history) {
        history.past.push(entry.snapshot);
        history.future = [];
        if (history.past.length > 25) {
            history.past.shift();
        }
    }

    pendingHistorySaves.delete(graphId);
    updateUndoRedoButtons(graphId);
}

// ===== DOM Elements =====
const excelFileInput = document.getElementById('excel-file');
const fileNameDisplay = document.getElementById('file-name');
const graphsContainer = document.getElementById('graphs-container');
const addGraphBtn = document.getElementById('add-graph-btn');
const toastContainer = document.getElementById('toast-container');
const modalOverlay = document.getElementById('modal-overlay');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

// ===== Toast Notification System =====
function showToast(message, type = 'info') {
    const icons = {
        success: '&#10004;',
        error: '&#10008;',
        info: '&#8505;',
        warning: '&#9888;'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// ===== Excel File Handling =====
excelFileInput.addEventListener('change', handleFileSelect);

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Confirm if graphs exist
    if (state.graphs.length > 0) {
        const confirmed = confirm('Loading a new file will clear all existing graphs. Continue?');
        if (!confirmed) {
            excelFileInput.value = '';
            return;
        }
    }

    fileNameDisplay.textContent = file.name;

    try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        // Clear existing data
        state.allData = {};
        state.columnOrder = {};
        state.graphs = [];

        // Parse each sheet
        workbook.eachSheet((worksheet, sheetId) => {
            const sheetName = worksheet.name;
            const rows = [];
            const columns = [];

            // Get headers from first row
            const headerRow = worksheet.getRow(1);
            headerRow.eachCell((cell, colNumber) => {
                columns.push(cell.value?.toString() || `Column ${colNumber}`);
            });

            // Parse data rows
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // Skip header

                const rowData = {};
                columns.forEach((col, index) => {
                    const cell = row.getCell(index + 1);
                    let value = cell.value;

                    // Handle different cell types
                    if (value === null || value === undefined || value === '') {
                        value = null;
                    } else if (typeof value === 'object' && value.result !== undefined) {
                        value = value.result; // Formula result
                    } else if (typeof value === 'object' && value.text !== undefined) {
                        value = value.text; // Rich text
                    }

                    rowData[col] = value;
                });
                rows.push(rowData);
            });

            state.allData[sheetName] = rows;
            state.columnOrder[sheetName] = columns;
        });

        const sheetCount = Object.keys(state.allData).length;
        showToast(`Loaded ${file.name} with ${sheetCount} sheet(s)`, 'success');

        // Clear graphs container and add example graph
        renderAllGraphs();
        if (sheetCount > 0) {
            addGraph();
        }

    } catch (error) {
        console.error('Error parsing Excel file:', error);
        showToast('Error parsing Excel file. Please check the format.', 'error');
    }
}

// ===== Graph Management =====
function createGraphObject() {
    const sheets = Object.keys(state.allData);
    const defaultSheet = sheets[0] || '';
    const columns = state.columnOrder[defaultSheet] || [];

    return {
        id: ++graphIdCounter,
        title: `Graph ${graphIdCounter}`,
        sheetName: defaultSheet,
        dimension: '2D',
        graphType: 'Scatter',
        columns: {
            x: columns[0] || '',
            y: columns[1] || '',
            z: columns[2] || null,
            color: null
        },
        filters: {
            x: { min: null, max: null, ignoreZero: false },
            y: { min: null, max: null, ignoreZero: false },
            z: { min: null, max: null, ignoreZero: false }
        },
        overlayPoints: [],
        overlayLines: [],
        overlaySurfaces: [],
        hoverFields: [],
        disableOverlayHover: false
    };
}

function addGraph() {
    const graph = createGraphObject();
    state.graphs.push(graph);
    initGraphHistory(graph.id);
    renderGraphSection(graph);
    updateGraph(graph.id);
}

function deleteGraph(graphId) {
    const confirmed = confirm('Are you sure you want to delete this graph?');
    if (!confirmed) return;

    const index = state.graphs.findIndex(g => g.id === graphId);
    if (index !== -1) {
        state.graphs.splice(index, 1);
        const section = document.getElementById(`graph-section-${graphId}`);
        if (section) section.remove();

        // Clean up history, debounce state, and filter ranges
        graphHistory.delete(graphId);
        debouncedUpdates.delete(graphId);
        pendingHistorySaves.delete(graphId);
        filterDataRanges.delete(graphId);

        showToast('Graph deleted', 'info');
    }
}

function copyGraphSettings(targetGraphId, sourceGraphId) {
    const source = state.graphs.find(g => g.id === sourceGraphId);
    const target = state.graphs.find(g => g.id === targetGraphId);

    if (!source || !target) return;

    saveToHistory(targetGraphId);

    target.sheetName = source.sheetName;
    target.dimension = source.dimension;
    target.graphType = source.graphType;
    target.columns = { ...source.columns };
    target.filters = JSON.parse(JSON.stringify(source.filters));

    // Update UI and render
    populateGraphControls(target);
    updateFiltersUI(targetGraphId, target);
    updateGraph(targetGraphId);
    showToast('Settings copied and applied.', 'success');
}

// ===== Graph Section Rendering =====
function renderAllGraphs() {
    graphsContainer.innerHTML = '';
    state.graphs.forEach(graph => renderGraphSection(graph));
}

function renderGraphSection(graph) {
    const section = document.createElement('div');
    section.className = 'graph-section';
    section.id = `graph-section-${graph.id}`;

    const sheets = Object.keys(state.allData);
    const columns = state.columnOrder[graph.sheetName] || [];
    const is3D = graph.dimension.includes('3D');
    const hasColor = graph.dimension.includes('Color');

    section.innerHTML = `
        <div class="graph-section-header">
            <span class="graph-section-title">Graph #${graph.id}</span>
            <div class="graph-section-actions">
                <button id="undo-btn-${graph.id}" class="btn btn-outline btn-small" onclick="undo(${graph.id})" title="Undo" disabled>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                        <path d="M3 10h10a5 5 0 0 1 5 5v2"></path>
                        <path d="M3 10l4-4"></path>
                        <path d="M3 10l4 4"></path>
                    </svg>
                </button>
                <button id="redo-btn-${graph.id}" class="btn btn-outline btn-small" onclick="redo(${graph.id})" title="Redo" disabled>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                        <path d="M21 10H11a5 5 0 0 0-5 5v2"></path>
                        <path d="M21 10l-4-4"></path>
                        <path d="M21 10l-4 4"></path>
                    </svg>
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteGraph(${graph.id})">
                    Delete
                </button>
            </div>
        </div>
        <div class="graph-layout">
            <!-- Left Panel: Controls -->
            <div class="control-panel">
                <div class="control-group">
                    <label class="control-label">Sheet</label>
                    <select id="sheet-${graph.id}" onchange="onSheetChange(${graph.id})">
                        ${sheets.map(s => `<option value="${s}" ${s === graph.sheetName ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="control-group">
                    <label class="control-label">Dimension</label>
                    <div class="option-btn-grid" id="dimension-${graph.id}">
                        <button type="button" class="option-btn ${graph.dimension === '2D' ? 'active' : ''}" data-value="2D" onclick="onDimensionClick(${graph.id}, '2D')">2D</button>
                        <button type="button" class="option-btn ${graph.dimension === '2D with Color' ? 'active' : ''}" data-value="2D with Color" onclick="onDimensionClick(${graph.id}, '2D with Color')">2D+Color</button>
                        <button type="button" class="option-btn ${graph.dimension === '3D' ? 'active' : ''}" data-value="3D" onclick="onDimensionClick(${graph.id}, '3D')">3D</button>
                        <button type="button" class="option-btn ${graph.dimension === '3D with Color' ? 'active' : ''}" data-value="3D with Color" onclick="onDimensionClick(${graph.id}, '3D with Color')">3D+Color</button>
                    </div>
                </div>
                <div class="control-group">
                    <label class="control-label">Graph Type</label>
                    <div class="option-btn-row" id="type-${graph.id}">
                        ${getGraphTypeButtons(graph.dimension, graph.graphType, graph.id)}
                    </div>
                </div>
                <div class="control-group">
                    <label class="control-label">X Column</label>
                    <select id="x-col-${graph.id}">
                        ${columns.map(c => `<option value="${c}" ${c === graph.columns.x ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
                <div class="control-group">
                    <label class="control-label">Y Column</label>
                    <select id="y-col-${graph.id}">
                        ${columns.map(c => `<option value="${c}" ${c === graph.columns.y ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
                <div class="control-group" id="z-col-group-${graph.id}" style="${is3D ? '' : 'display:none'}">
                    <label class="control-label">Z Column</label>
                    <select id="z-col-${graph.id}">
                        ${columns.map(c => `<option value="${c}" ${c === graph.columns.z ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
                <div class="control-group" id="color-col-group-${graph.id}" style="${hasColor ? '' : 'display:none'}">
                    <label class="control-label">Color Column</label>
                    <select id="color-col-${graph.id}">
                        ${columns.map(c => `<option value="${c}" ${c === graph.columns.color ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
            </div>

            <!-- Center: Graph Display -->
            <div class="graph-container">
                <div class="control-group">
                    <input type="text" id="title-${graph.id}" class="graph-title-input" value="${graph.title}" placeholder="Graph Title">
                </div>
                <div class="graph-display-wrapper">
                    <div class="graph-display" id="plot-${graph.id}"></div>
                    <button class="graph-corner-btn top-right btn btn-outline btn-small" onclick="updateGraph(${graph.id})" title="Refresh Graph">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 4v6h-6"></path>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                    </button>
                    <button class="graph-corner-btn top-left btn btn-info btn-small" onclick="toggleFullscreen(${graph.id})" title="Fullscreen">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                        </svg>
                    </button>
                    <button class="graph-corner-btn bottom-left btn btn-outline btn-small" onclick="openInNewWindow(${graph.id})" title="Open in New Window">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </button>
                    <button class="graph-corner-btn bottom-right btn btn-outline btn-small" onclick="copyToClipboard(${graph.id})" title="Copy to Clipboard">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                </div>
                <div class="graph-below-actions">
                    <button class="btn btn-outline" onclick="openAdvancedOptions(${graph.id})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                        Add Advanced Options
                    </button>
                </div>
            </div>

            <!-- Right Panel: Filters -->
            <div class="filter-panel">
                <div class="filter-section">
                    <div class="filter-section-label" id="x-filter-label-${graph.id}">${graph.columns.x || 'X-Axis'} Filter</div>
                    <div class="filter-ignore-row">
                        <input type="checkbox" id="x-ignore-zero-${graph.id}" ${graph.filters.x.ignoreZero ? 'checked' : ''}>
                        <label for="x-ignore-zero-${graph.id}" class="checkbox-label">Ignore 0 values</label>
                    </div>
                    <div class="filter-row">
                        <div class="filter-input-group">
                            <label>Min</label>
                            <input type="number" id="x-min-${graph.id}" class="filter-input-small" value="${graph.filters.x.min || ''}" step="any">
                        </div>
                        <div class="filter-input-group">
                            <label>Max</label>
                            <input type="number" id="x-max-${graph.id}" class="filter-input-small" value="${graph.filters.x.max || ''}" step="any">
                        </div>
                    </div>
                    <div class="dual-slider-container" id="x-slider-container-${graph.id}">
                        <div class="dual-slider-track">
                            <div class="dual-slider-range" id="x-slider-range-${graph.id}"></div>
                        </div>
                        <input type="range" class="dual-slider dual-slider-min" id="x-slider-min-${graph.id}">
                        <input type="range" class="dual-slider dual-slider-max" id="x-slider-max-${graph.id}">
                    </div>
                </div>
                <div class="filter-section">
                    <div class="filter-section-label" id="y-filter-label-${graph.id}">${graph.columns.y || 'Y-Axis'} Filter</div>
                    <div class="filter-ignore-row">
                        <input type="checkbox" id="y-ignore-zero-${graph.id}" ${graph.filters.y.ignoreZero ? 'checked' : ''}>
                        <label for="y-ignore-zero-${graph.id}" class="checkbox-label">Ignore 0 values</label>
                    </div>
                    <div class="filter-row">
                        <div class="filter-input-group">
                            <label>Min</label>
                            <input type="number" id="y-min-${graph.id}" class="filter-input-small" value="${graph.filters.y.min || ''}" step="any">
                        </div>
                        <div class="filter-input-group">
                            <label>Max</label>
                            <input type="number" id="y-max-${graph.id}" class="filter-input-small" value="${graph.filters.y.max || ''}" step="any">
                        </div>
                    </div>
                    <div class="dual-slider-container" id="y-slider-container-${graph.id}">
                        <div class="dual-slider-track">
                            <div class="dual-slider-range" id="y-slider-range-${graph.id}"></div>
                        </div>
                        <input type="range" class="dual-slider dual-slider-min" id="y-slider-min-${graph.id}">
                        <input type="range" class="dual-slider dual-slider-max" id="y-slider-max-${graph.id}">
                    </div>
                </div>
                <div class="filter-section" id="z-filter-group-${graph.id}" style="${is3D ? '' : 'display:none'}">
                    <div class="filter-section-label" id="z-filter-label-${graph.id}">${graph.columns.z || 'Z-Axis'} Filter</div>
                    <div class="filter-ignore-row">
                        <input type="checkbox" id="z-ignore-zero-${graph.id}" ${graph.filters.z.ignoreZero ? 'checked' : ''}>
                        <label for="z-ignore-zero-${graph.id}" class="checkbox-label">Ignore 0 values</label>
                    </div>
                    <div class="filter-row">
                        <div class="filter-input-group">
                            <label>Min</label>
                            <input type="number" id="z-min-${graph.id}" class="filter-input-small" value="${graph.filters.z.min || ''}" step="any">
                        </div>
                        <div class="filter-input-group">
                            <label>Max</label>
                            <input type="number" id="z-max-${graph.id}" class="filter-input-small" value="${graph.filters.z.max || ''}" step="any">
                        </div>
                    </div>
                    <div class="dual-slider-container" id="z-slider-container-${graph.id}">
                        <div class="dual-slider-track">
                            <div class="dual-slider-range" id="z-slider-range-${graph.id}"></div>
                        </div>
                        <input type="range" class="dual-slider dual-slider-min" id="z-slider-min-${graph.id}">
                        <input type="range" class="dual-slider dual-slider-max" id="z-slider-max-${graph.id}">
                    </div>
                </div>
                <div class="filter-panel-spacer"></div>
                <div class="copy-settings-section">
                    <div class="copy-settings-title">Copy Settings From</div>
                    <select id="copy-from-${graph.id}">
                        <option value="">Select graph...</option>
                        ${state.graphs.filter(g => g.id !== graph.id).map(g =>
                            `<option value="${g.id}">${g.title}</option>`
                        ).join('')}
                    </select>
                    <button class="btn btn-outline btn-small" onclick="handleCopySettings(${graph.id})">Apply</button>
                </div>
            </div>
        </div>
    `;

    graphsContainer.appendChild(section);

    // Add auto-update event listeners
    setupAutoUpdateListeners(graph.id);
}

function setupAutoUpdateListeners(graphId) {
    // Title input - debounced
    const titleInput = document.getElementById(`title-${graphId}`);
    if (titleInput) {
        titleInput.addEventListener('input', () => {
            scheduleHistorySave(graphId);
            getDebouncedUpdate(graphId)();
        });
    }

    // Column selects - immediate update + filter label/range updates
    ['x-col', 'y-col', 'z-col', 'color-col'].forEach(prefix => {
        const select = document.getElementById(`${prefix}-${graphId}`);
        if (select) {
            select.addEventListener('change', () => {
                saveToHistory(graphId);

                // Extract axis from prefix (x-col -> x)
                const axis = prefix.split('-')[0];
                if (['x', 'y', 'z'].includes(axis)) {
                    // Update graph.columns FIRST so updateFilterLabel reads the new value
                    const graph = state.graphs.find(g => g.id === graphId);
                    if (graph) {
                        graph.columns[axis] = select.value;
                    }
                    // Update filter label with new column name
                    updateFilterLabel(graphId, axis);
                    // Recalculate data range for this axis
                    updateFilterDataRanges(graphId);
                    // Reset filter values to full range
                    resetFilterToFullRange(graphId, axis);
                }

                updateGraph(graphId);
            });
        }
    });

    // Filter number inputs - debounced + sync to slider
    ['x-min', 'x-max', 'y-min', 'y-max', 'z-min', 'z-max'].forEach(prefix => {
        const input = document.getElementById(`${prefix}-${graphId}`);
        if (input) {
            input.addEventListener('input', () => {
                // Sync text input to slider position
                const axis = prefix.split('-')[0];
                syncInputsToSlider(graphId, axis);
                scheduleHistorySave(graphId);
                getDebouncedUpdate(graphId)();
            });
        }
    });

    // Filter checkboxes - immediate update
    ['x-ignore-zero', 'y-ignore-zero', 'z-ignore-zero'].forEach(prefix => {
        const checkbox = document.getElementById(`${prefix}-${graphId}`);
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                saveToHistory(graphId);
                updateGraph(graphId);
            });
        }
    });

    // Dual-handle slider listeners
    ['x', 'y', 'z'].forEach(axis => {
        const sliderMin = document.getElementById(`${axis}-slider-min-${graphId}`);
        const sliderMax = document.getElementById(`${axis}-slider-max-${graphId}`);

        if (sliderMin) {
            // Real-time text update during drag
            sliderMin.addEventListener('input', () => {
                // Prevent min from exceeding max
                const maxSlider = document.getElementById(`${axis}-slider-max-${graphId}`);
                if (parseFloat(sliderMin.value) > parseFloat(maxSlider.value)) {
                    sliderMin.value = maxSlider.value;
                }
                syncSliderToInputs(graphId, axis);
            });

            // Graph update on release
            sliderMin.addEventListener('change', () => {
                scheduleHistorySave(graphId);
                updateGraph(graphId);
            });
        }

        if (sliderMax) {
            // Real-time text update during drag
            sliderMax.addEventListener('input', () => {
                // Prevent max from going below min
                const minSlider = document.getElementById(`${axis}-slider-min-${graphId}`);
                if (parseFloat(sliderMax.value) < parseFloat(minSlider.value)) {
                    sliderMax.value = minSlider.value;
                }
                syncSliderToInputs(graphId, axis);
            });

            // Graph update on release
            sliderMax.addEventListener('change', () => {
                scheduleHistorySave(graphId);
                updateGraph(graphId);
            });
        }
    });

    // Initialize filter data ranges and sliders
    updateFilterDataRanges(graphId);
}

function getGraphTypeOptions(dimension, selected) {
    const is3D = dimension.includes('3D');
    const types = is3D ? ['3D Scatter'] : ['Scatter', 'Line', 'Bar'];
    return types.map(t => `<option value="${t}" ${t === selected ? 'selected' : ''}>${t}</option>`).join('');
}

function getGraphTypeButtons(dimension, selected, graphId) {
    const is3D = dimension.includes('3D');
    const types = is3D ? ['3D Scatter'] : ['Scatter', 'Line', 'Bar'];
    return types.map(t =>
        `<button type="button" class="option-btn ${t === selected ? 'active' : ''}" data-value="${t}" onclick="onTypeClick(${graphId}, '${t}')">${t}</button>`
    ).join('');
}

function populateGraphControls(graph) {
    const columns = state.columnOrder[graph.sheetName] || [];

    // Update dropdowns
    document.getElementById(`sheet-${graph.id}`).value = graph.sheetName;

    // Update dimension buttons
    const dimensionContainer = document.getElementById(`dimension-${graph.id}`);
    dimensionContainer.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === graph.dimension);
    });

    // Update type buttons
    const typeContainer = document.getElementById(`type-${graph.id}`);
    typeContainer.innerHTML = getGraphTypeButtons(graph.dimension, graph.graphType, graph.id);

    // Update column selectors
    const updateColumnSelect = (id, value) => {
        const select = document.getElementById(id);
        select.innerHTML = columns.map(c => `<option value="${c}" ${c === value ? 'selected' : ''}>${c}</option>`).join('');
    };

    updateColumnSelect(`x-col-${graph.id}`, graph.columns.x);
    updateColumnSelect(`y-col-${graph.id}`, graph.columns.y);
    updateColumnSelect(`z-col-${graph.id}`, graph.columns.z);
    updateColumnSelect(`color-col-${graph.id}`, graph.columns.color);

    // Show/hide based on dimension
    const is3D = graph.dimension.includes('3D');
    const hasColor = graph.dimension.includes('Color');

    document.getElementById(`z-col-group-${graph.id}`).style.display = is3D ? '' : 'none';
    document.getElementById(`color-col-group-${graph.id}`).style.display = hasColor ? '' : 'none';
    document.getElementById(`z-filter-group-${graph.id}`).style.display = is3D ? '' : 'none';

    // Update filter labels with current column names
    updateAllFilterLabels(graph.id);
}

// ===== Event Handlers =====
function onSheetChange(graphId) {
    const graph = state.graphs.find(g => g.id === graphId);
    if (!graph) return;

    saveToHistory(graphId);

    graph.sheetName = document.getElementById(`sheet-${graphId}`).value;
    const columns = state.columnOrder[graph.sheetName] || [];

    graph.columns.x = columns[0] || '';
    graph.columns.y = columns[1] || '';
    graph.columns.z = columns[2] || null;

    // Recalculate filter ranges for new sheet data
    updateFilterDataRanges(graphId);

    // Reset all filters to full range
    ['x', 'y', 'z'].forEach(axis => {
        resetFilterToFullRange(graphId, axis);
    });

    // Update filter labels with new column names
    updateAllFilterLabels(graphId);

    populateGraphControls(graph);
    updateGraph(graphId);
}

function onDimensionClick(graphId, dimension) {
    const graph = state.graphs.find(g => g.id === graphId);
    if (!graph) return;

    saveToHistory(graphId);

    graph.dimension = dimension;

    // Update dimension button states
    const container = document.getElementById(`dimension-${graphId}`);
    container.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === dimension);
    });

    // Update graph type
    const is3D = dimension.includes('3D');
    graph.graphType = is3D ? '3D Scatter' : 'Scatter';

    populateGraphControls(graph);
    updateGraph(graphId);
}

function onTypeClick(graphId, type) {
    const graph = state.graphs.find(g => g.id === graphId);
    if (!graph) return;

    saveToHistory(graphId);

    graph.graphType = type;

    // Update type button states
    const container = document.getElementById(`type-${graphId}`);
    container.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === type);
    });

    updateGraph(graphId);
}

function handleCopySettings(graphId) {
    const sourceId = parseInt(document.getElementById(`copy-from-${graphId}`).value);
    if (!sourceId) {
        showToast('Please select a graph to copy from', 'warning');
        return;
    }
    copyGraphSettings(graphId, sourceId);
}

// ===== Data Filtering =====
function filterData(data, graph) {
    const { columns, filters } = graph;

    return data.filter(row => {
        const x = parseFloat(row[columns.x]);
        const y = parseFloat(row[columns.y]);
        const z = columns.z ? parseFloat(row[columns.z]) : null;

        // Check X filter
        if (filters.x.ignoreZero && x === 0) return false;
        if (filters.x.min !== null && x < filters.x.min) return false;
        if (filters.x.max !== null && x > filters.x.max) return false;

        // Check Y filter
        if (filters.y.ignoreZero && y === 0) return false;
        if (filters.y.min !== null && y < filters.y.min) return false;
        if (filters.y.max !== null && y > filters.y.max) return false;

        // Check Z filter (3D only)
        if (z !== null) {
            if (filters.z.ignoreZero && z === 0) return false;
            if (filters.z.min !== null && z < filters.z.min) return false;
            if (filters.z.max !== null && z > filters.z.max) return false;
        }

        return true;
    });
}

// ===== Filter Slider Helpers =====
function getColumnDataRange(graphId, axis) {
    const graph = state.graphs.find(g => g.id === graphId);
    if (!graph) return { min: 0, max: 100 };

    const data = state.allData[graph.sheetName] || [];
    const columnName = graph.columns[axis];
    if (!columnName) return { min: 0, max: 100 };

    const values = data
        .map(row => parseFloat(row[columnName]))
        .filter(v => !isNaN(v) && isFinite(v));

    if (values.length === 0) return { min: 0, max: 100 };

    return {
        min: Math.min(...values),
        max: Math.max(...values)
    };
}

function updateFilterDataRanges(graphId) {
    const graph = state.graphs.find(g => g.id === graphId);
    if (!graph) return;

    const ranges = {
        x: getColumnDataRange(graphId, 'x'),
        y: getColumnDataRange(graphId, 'y'),
        z: getColumnDataRange(graphId, 'z')
    };

    filterDataRanges.set(graphId, ranges);
    updateSliderRanges(graphId);
}

function updateFilterLabel(graphId, axis) {
    const graph = state.graphs.find(g => g.id === graphId);
    if (!graph) return;

    const label = document.getElementById(`${axis}-filter-label-${graphId}`);
    if (label) {
        const columnName = graph.columns[axis] || `${axis.toUpperCase()}-Axis`;
        label.textContent = `${columnName} Filter`;
    }
}

function updateAllFilterLabels(graphId) {
    updateFilterLabel(graphId, 'x');
    updateFilterLabel(graphId, 'y');
    updateFilterLabel(graphId, 'z');
}

function updateSliderRanges(graphId) {
    const ranges = filterDataRanges.get(graphId);
    if (!ranges) return;

    const graph = state.graphs.find(g => g.id === graphId);
    if (!graph) return;

    ['x', 'y', 'z'].forEach(axis => {
        const range = ranges[axis];
        const sliderMin = document.getElementById(`${axis}-slider-min-${graphId}`);
        const sliderMax = document.getElementById(`${axis}-slider-max-${graphId}`);

        if (sliderMin && sliderMax) {
            // Set slider range based on data
            sliderMin.min = range.min;
            sliderMin.max = range.max;
            sliderMax.min = range.min;
            sliderMax.max = range.max;

            // Calculate step for smooth sliding (about 200 steps)
            const dataRange = range.max - range.min;
            const step = dataRange > 0 ? dataRange / 200 : 1;
            sliderMin.step = step;
            sliderMax.step = step;

            // Set positions based on current filter values or full range
            const filterMin = graph.filters[axis].min ?? range.min;
            const filterMax = graph.filters[axis].max ?? range.max;
            sliderMin.value = filterMin;
            sliderMax.value = filterMax;

            updateSliderRangeVisual(graphId, axis);

            // Also update text inputs to show current slider values
            syncSliderToInputs(graphId, axis);
        }
    });
}

function updateSliderRangeVisual(graphId, axis) {
    const ranges = filterDataRanges.get(graphId);
    if (!ranges) return;

    const range = ranges[axis];
    const sliderMin = document.getElementById(`${axis}-slider-min-${graphId}`);
    const sliderMax = document.getElementById(`${axis}-slider-max-${graphId}`);
    const rangeDiv = document.getElementById(`${axis}-slider-range-${graphId}`);

    if (!sliderMin || !sliderMax || !rangeDiv) return;

    const minVal = parseFloat(sliderMin.value);
    const maxVal = parseFloat(sliderMax.value);
    const totalRange = range.max - range.min;

    if (totalRange === 0) {
        rangeDiv.style.left = '0%';
        rangeDiv.style.width = '100%';
        return;
    }

    const leftPercent = ((minVal - range.min) / totalRange) * 100;
    const rightPercent = ((maxVal - range.min) / totalRange) * 100;

    rangeDiv.style.left = `${leftPercent}%`;
    rangeDiv.style.width = `${rightPercent - leftPercent}%`;
}

function syncSliderToInputs(graphId, axis) {
    const sliderMin = document.getElementById(`${axis}-slider-min-${graphId}`);
    const sliderMax = document.getElementById(`${axis}-slider-max-${graphId}`);
    const inputMin = document.getElementById(`${axis}-min-${graphId}`);
    const inputMax = document.getElementById(`${axis}-max-${graphId}`);

    if (sliderMin && inputMin) {
        const val = parseFloat(sliderMin.value);
        inputMin.value = Number.isInteger(val) ? val : val.toFixed(2);
    }
    if (sliderMax && inputMax) {
        const val = parseFloat(sliderMax.value);
        inputMax.value = Number.isInteger(val) ? val : val.toFixed(2);
    }

    updateSliderRangeVisual(graphId, axis);
}

function syncInputsToSlider(graphId, axis) {
    const ranges = filterDataRanges.get(graphId);
    if (!ranges) return;

    const range = ranges[axis];
    const sliderMin = document.getElementById(`${axis}-slider-min-${graphId}`);
    const sliderMax = document.getElementById(`${axis}-slider-max-${graphId}`);
    const inputMin = document.getElementById(`${axis}-min-${graphId}`);
    const inputMax = document.getElementById(`${axis}-max-${graphId}`);

    if (sliderMin && inputMin) {
        let val = parseFloat(inputMin.value);
        if (isNaN(val)) val = range.min;
        val = Math.max(range.min, Math.min(range.max, val));
        sliderMin.value = val;
    }
    if (sliderMax && inputMax) {
        let val = parseFloat(inputMax.value);
        if (isNaN(val)) val = range.max;
        val = Math.max(range.min, Math.min(range.max, val));
        sliderMax.value = val;
    }

    updateSliderRangeVisual(graphId, axis);
}

function resetFilterToFullRange(graphId, axis) {
    const graph = state.graphs.find(g => g.id === graphId);
    const ranges = filterDataRanges.get(graphId);
    if (!graph || !ranges) return;

    // Clear filter values (null means no filter = full range)
    graph.filters[axis].min = null;
    graph.filters[axis].max = null;

    // Update UI - clear text inputs
    const inputMin = document.getElementById(`${axis}-min-${graphId}`);
    const inputMax = document.getElementById(`${axis}-max-${graphId}`);
    if (inputMin) inputMin.value = '';
    if (inputMax) inputMax.value = '';

    // Update sliders to full range
    const sliderMin = document.getElementById(`${axis}-slider-min-${graphId}`);
    const sliderMax = document.getElementById(`${axis}-slider-max-${graphId}`);
    if (sliderMin) sliderMin.value = ranges[axis].min;
    if (sliderMax) sliderMax.value = ranges[axis].max;

    updateSliderRangeVisual(graphId, axis);
}

// ===== Graph Rendering =====
function updateGraph(graphId) {
    const graph = state.graphs.find(g => g.id === graphId);
    if (!graph) return;

    // Update graph state from UI
    graph.title = document.getElementById(`title-${graphId}`).value || `Graph ${graphId}`;
    graph.sheetName = document.getElementById(`sheet-${graphId}`).value;
    graph.dimension = document.getElementById(`dimension-${graphId}`).querySelector('.option-btn.active')?.dataset.value || graph.dimension;
    graph.graphType = document.getElementById(`type-${graphId}`).querySelector('.option-btn.active')?.dataset.value || graph.graphType;
    graph.columns.x = document.getElementById(`x-col-${graphId}`).value;
    graph.columns.y = document.getElementById(`y-col-${graphId}`).value;
    graph.columns.z = document.getElementById(`z-col-${graphId}`)?.value || null;
    graph.columns.color = document.getElementById(`color-col-${graphId}`)?.value || null;

    // Update filters
    graph.filters.x.min = parseFloatOrNull(document.getElementById(`x-min-${graphId}`).value);
    graph.filters.x.max = parseFloatOrNull(document.getElementById(`x-max-${graphId}`).value);
    graph.filters.x.ignoreZero = document.getElementById(`x-ignore-zero-${graphId}`).checked;
    graph.filters.y.min = parseFloatOrNull(document.getElementById(`y-min-${graphId}`).value);
    graph.filters.y.max = parseFloatOrNull(document.getElementById(`y-max-${graphId}`).value);
    graph.filters.y.ignoreZero = document.getElementById(`y-ignore-zero-${graphId}`).checked;
    graph.filters.z.min = parseFloatOrNull(document.getElementById(`z-min-${graphId}`)?.value);
    graph.filters.z.max = parseFloatOrNull(document.getElementById(`z-max-${graphId}`)?.value);
    graph.filters.z.ignoreZero = document.getElementById(`z-ignore-zero-${graphId}`)?.checked || false;

    // Get and filter data
    const rawData = state.allData[graph.sheetName] || [];
    const filteredData = filterData(rawData, graph);

    if (filteredData.length === 0) {
        showToast('No data after applying filters', 'warning');
    }

    // Build traces
    const traces = [];
    const is3D = graph.dimension.includes('3D');
    const hasColor = graph.dimension.includes('Color');

    // Main data trace
    const mainTrace = buildMainTrace(filteredData, graph, is3D, hasColor);
    traces.push(mainTrace);

    // Get overlay hover setting
    const disableOverlayHover = graph.disableOverlayHover || false;

    // Add overlay points
    graph.overlayPoints.forEach((point, index) => {
        // Set default for legacy graphs
        if (point.visible === undefined) point.visible = true;

        // Skip hidden items
        if (!point.visible) return;

        try {
            traces.push(buildPointTrace(point, is3D, disableOverlayHover));
        } catch (error) {
            showToast(`Error in overlay point "${point.name || `Point ${index + 1}`}": ${error.message}`, 'error');
        }
    });

    // Add overlay lines
    graph.overlayLines.forEach((line, index) => {
        // Set default for legacy graphs
        if (line.visible === undefined) line.visible = true;

        // Skip hidden items
        if (!line.visible) return;

        try {
            const lineTrace = buildLineTrace(line, graph, filteredData, is3D, disableOverlayHover);
            if (lineTrace && lineTrace.x && lineTrace.x.length > 0) {
                traces.push(lineTrace);
            } else {
                showToast(`Overlay line "${line.name || `Line ${index + 1}`}" produced no valid data. Check your equation or points.`, 'warning');
            }
        } catch (error) {
            showToast(`Error in overlay line "${line.name || `Line ${index + 1}`}": ${error.message}`, 'error');
        }
    });

    // Add overlay surfaces (3D only)
    if (is3D) {
        graph.overlaySurfaces.forEach((surface, index) => {
            // Set default for legacy graphs
            if (surface.visible === undefined) surface.visible = true;

            // Skip hidden items
            if (!surface.visible) return;

            try {
                const surfaceTrace = buildSurfaceTrace(surface, graph, filteredData, disableOverlayHover);
                if (surfaceTrace) {
                    traces.push(surfaceTrace);
                } else {
                    showToast(`Overlay surface "${surface.name || `Surface ${index + 1}`}" produced no valid data. Check your equation or add more points.`, 'warning');
                }
            } catch (error) {
                showToast(`Error in overlay surface "${surface.name || `Surface ${index + 1}`}": ${error.message}`, 'error');
            }
        });
    }

    // Build layout
    const layout = buildLayout(graph, is3D);

    // Render
    const plotDiv = document.getElementById(`plot-${graphId}`);

    // Preserve camera position for 3D graphs
    if (is3D && plotDiv._fullLayout && plotDiv._fullLayout.scene && plotDiv._fullLayout.scene._scene) {
        const currentCamera = plotDiv._fullLayout.scene._scene.getCamera();
        if (currentCamera) {
            layout.scene.camera = currentCamera;
        }
    }

    Plotly.react(plotDiv, traces, layout, { responsive: true });
}

function buildMainTrace(data, graph, is3D, hasColor) {
    const x = data.map(row => parseFloat(row[graph.columns.x]));
    const y = data.map(row => parseFloat(row[graph.columns.y]));
    const z = is3D ? data.map(row => parseFloat(row[graph.columns.z])) : null;
    const colorValues = hasColor ? data.map(row => parseFloat(row[graph.columns.color])) : null;

    // Build hover text
    const hoverText = data.map(row => {
        let text = `${graph.columns.x}: ${row[graph.columns.x]}<br>${graph.columns.y}: ${row[graph.columns.y]}`;
        if (is3D) text += `<br>${graph.columns.z}: ${row[graph.columns.z]}`;
        if (hasColor) text += `<br>${graph.columns.color}: ${row[graph.columns.color]}`;

        // Add custom hover fields
        graph.hoverFields.forEach(field => {
            if (field !== graph.columns.x && field !== graph.columns.y &&
                field !== graph.columns.z && field !== graph.columns.color) {
                text += `<br>${field}: ${row[field]}`;
            }
        });
        return text;
    });

    const trace = {
        name: graph.title,
        x,
        y,
        text: hoverText,
        hoverinfo: 'text'
    };

    if (is3D) {
        trace.z = z;
        trace.type = 'scatter3d';
        trace.mode = 'markers';
        trace.marker = {
            size: 5,
            colorscale: 'Viridis',
            showscale: hasColor
        };
        if (hasColor) {
            trace.marker.color = colorValues;
            trace.marker.colorbar = { title: graph.columns.color };
        }
    } else {
        switch (graph.graphType) {
            case 'Scatter':
                trace.type = 'scatter';
                trace.mode = 'markers';
                trace.marker = {
                    size: 8,
                    colorscale: 'Viridis',
                    showscale: hasColor
                };
                if (hasColor) {
                    trace.marker.color = colorValues;
                    trace.marker.colorbar = { title: graph.columns.color };
                }
                break;
            case 'Line':
                trace.type = 'scatter';
                trace.mode = 'lines+markers';
                trace.marker = { size: 6 };
                trace.line = { width: 2 };
                if (hasColor) {
                    trace.marker.color = colorValues;
                    trace.marker.colorscale = 'Viridis';
                }
                break;
            case 'Bar':
                trace.type = 'bar';
                if (hasColor) {
                    trace.marker = {
                        color: colorValues,
                        colorscale: 'Viridis',
                        showscale: true,
                        colorbar: { title: graph.columns.color }
                    };
                }
                break;
        }
    }

    return trace;
}

function buildPointTrace(point, is3D, disableHover = false) {
    const symbolMap = {
        circle: 'circle',
        square: 'square',
        diamond: 'diamond',
        cross: 'cross',
        x: 'x',
        triangle: 'triangle-up',
        star: 'star'
    };

    const trace = {
        name: point.name,
        x: [point.x],
        y: [point.y],
        mode: 'markers',
        marker: {
            color: point.color,
            size: point.size,
            symbol: symbolMap[point.symbol] || 'circle'
        },
        hoverinfo: disableHover ? 'skip' : 'name+x+y'
    };

    if (is3D) {
        trace.z = [point.z];
        trace.type = 'scatter3d';
        trace.hoverinfo = disableHover ? 'skip' : 'name+x+y+z';
    } else {
        trace.type = 'scatter';
    }

    return trace;
}

function buildLineTrace(line, graph, data, is3D, disableHover = false) {
    let x = [], y = [], z = [];

    if (line.mode === 'equation') {
        if (!line.equation || !line.equation.y || line.equation.y.trim() === '') {
            throw new Error('Line equation for y is empty. Please enter an equation like "2*x + 1".');
        }
        // Get data range for x
        const xData = data.map(row => parseFloat(row[graph.columns.x])).filter(v => !isNaN(v));
        const xMin = Math.min(...xData);
        const xMax = Math.max(...xData);
        const step = (xMax - xMin) / 100;

        for (let xVal = xMin; xVal <= xMax; xVal += step) {
            x.push(xVal);
            y.push(evaluateExpression(line.equation.y, { x: xVal }));
            if (is3D && line.equation.z) {
                z.push(evaluateExpression(line.equation.z, { x: xVal }));
            }
        }

        // Validate that the expression produced valid data
        validateLineData(y, line.equation.y);
    } else if (line.mode === 'points') {
        if (!line.points || line.points.length < 2) {
            throw new Error('At least 2 points are required for a line.');
        }
        x = line.points.map(p => p.x);
        y = line.points.map(p => p.y);
        z = line.points.map(p => p.z);
    }

    const trace = {
        name: line.name,
        x,
        y,
        mode: 'lines',
        line: {
            color: line.color,
            width: line.width
        },
        hoverinfo: disableHover ? 'skip' : 'name'
    };

    if (is3D) {
        trace.z = z;
        trace.type = 'scatter3d';
    } else {
        trace.type = 'scatter';
    }

    return trace;
}

function buildSurfaceTrace(surface, graph, data, disableHover = false) {
    if (surface.mode === 'surface') {
        if (!surface.surfaceEquation || !surface.surfaceEquation.equation || surface.surfaceEquation.equation.trim() === '') {
            throw new Error('Surface equation is empty. Please enter an equation.');
        }
        return buildSurfaceFromEquation(surface, graph, data, disableHover);
    } else if (surface.mode === 'parametric') {
        if (!surface.parametricEquations) {
            throw new Error('Parametric equations are missing.');
        }
        const { x, y, z } = surface.parametricEquations;
        if (!x || !y || !z || x.trim() === '' || y.trim() === '' || z.trim() === '') {
            throw new Error('All three parametric equations (x, y, z) are required.');
        }
        return buildParametricSurface(surface, graph, data, disableHover);
    } else if (surface.mode === 'points') {
        if (!surface.points || surface.points.length < 3) {
            throw new Error('At least 3 points are required for a surface mesh.');
        }
        return buildMeshFromPoints(surface, disableHover);
    }
    return null;
}

function buildSurfaceFromEquation(surface, graph, data, disableHover = false) {
    const { variable, equation } = surface.surfaceEquation;

    // Get data ranges
    const getRange = (col) => {
        const values = data.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
        return { min: Math.min(...values), max: Math.max(...values) };
    };

    const gridSize = 30;
    let xRange, yRange, zRange;

    if (variable === 'z') {
        xRange = getRange(graph.columns.x);
        yRange = getRange(graph.columns.y);
    } else if (variable === 'y') {
        xRange = getRange(graph.columns.x);
        zRange = getRange(graph.columns.z);
    } else {
        yRange = getRange(graph.columns.y);
        zRange = getRange(graph.columns.z);
    }

    const xVals = [], yVals = [], zVals = [];

    if (variable === 'z') {
        const xStep = (xRange.max - xRange.min) / (gridSize - 1);
        const yStep = (yRange.max - yRange.min) / (gridSize - 1);

        for (let i = 0; i < gridSize; i++) {
            const zRow = [];
            const y = yRange.min + i * yStep;
            yVals.push(y);
            for (let j = 0; j < gridSize; j++) {
                const x = xRange.min + j * xStep;
                if (i === 0) xVals.push(x);
                zRow.push(evaluateExpression(equation, { x, y }));
            }
            zVals.push(zRow);
        }

        // Validate that the expression produced valid data
        validateSurfaceData(zVals, equation);

        return {
            type: 'surface',
            x: xVals,
            y: yVals,
            z: zVals,
            name: surface.name,
            colorscale: [[0, surface.color], [1, surface.color]],
            opacity: surface.opacity,
            showscale: false,
            hoverinfo: disableHover ? 'skip' : 'x+y+z+name'
        };
    }

    // For y=f(x,z) or x=f(y,z), use mesh3d with explicit triangulation
    const vertices = { x: [], y: [], z: [] };
    const indices = { i: [], j: [], k: [] };

    if (variable === 'y') {
        const xStep = (xRange.max - xRange.min) / (gridSize - 1);
        const zStep = (zRange.max - zRange.min) / (gridSize - 1);

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const x = xRange.min + j * xStep;
                const z = zRange.min + i * zStep;
                vertices.x.push(x);
                vertices.y.push(evaluateExpression(equation, { x, z }));
                vertices.z.push(z);
            }
        }
        // Validate
        validateSurfaceData(vertices.y, equation);
    } else { // x = f(y,z)
        const yStep = (yRange.max - yRange.min) / (gridSize - 1);
        const zStep = (zRange.max - zRange.min) / (gridSize - 1);

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const y = yRange.min + j * yStep;
                const z = zRange.min + i * zStep;
                vertices.x.push(evaluateExpression(equation, { y, z }));
                vertices.y.push(y);
                vertices.z.push(z);
            }
        }
        // Validate
        validateSurfaceData(vertices.x, equation);
    }

    // Generate triangle indices for regular grid
    // Create two triangles for each quad in the grid
    for (let i = 0; i < gridSize - 1; i++) {
        for (let j = 0; j < gridSize - 1; j++) {
            const topLeft = i * gridSize + j;
            const topRight = topLeft + 1;
            const bottomLeft = (i + 1) * gridSize + j;
            const bottomRight = bottomLeft + 1;

            // First triangle (top-left, top-right, bottom-left)
            indices.i.push(topLeft);
            indices.j.push(topRight);
            indices.k.push(bottomLeft);

            // Second triangle (bottom-left, top-right, bottom-right)
            indices.i.push(bottomLeft);
            indices.j.push(topRight);
            indices.k.push(bottomRight);
        }
    }

    return {
        type: 'mesh3d',
        x: vertices.x,
        y: vertices.y,
        z: vertices.z,
        i: indices.i,
        j: indices.j,
        k: indices.k,
        name: surface.name,
        color: surface.color,
        opacity: surface.opacity,
        hoverinfo: disableHover ? 'skip' : 'x+y+z+name'
    };
}

function buildParametricSurface(surface, graph, data, disableHover = false) {
    const { x: xEq, y: yEq, z: zEq } = surface.parametricEquations;
    const gridSize = 30;

    // Parameter ranges (0 to 2*PI for both u and v)
    const uMin = 0, uMax = 2 * Math.PI;
    const vMin = 0, vMax = 2 * Math.PI;

    const xVals = [], yVals = [], zVals = [];

    for (let i = 0; i < gridSize; i++) {
        const xRow = [], yRow = [], zRow = [];
        const v = vMin + (i / (gridSize - 1)) * (vMax - vMin);

        for (let j = 0; j < gridSize; j++) {
            const u = uMin + (j / (gridSize - 1)) * (uMax - uMin);
            xRow.push(evaluateExpression(xEq, { t: u, u, v }));
            yRow.push(evaluateExpression(yEq, { t: u, u, v }));
            zRow.push(evaluateExpression(zEq, { t: u, u, v }));
        }

        xVals.push(xRow);
        yVals.push(yRow);
        zVals.push(zRow);
    }

    // Validate that at least one equation produced valid data
    validateSurfaceData(xVals, xEq);
    validateSurfaceData(yVals, yEq);
    validateSurfaceData(zVals, zEq);

    return {
        type: 'surface',
        x: xVals,
        y: yVals,
        z: zVals,
        name: surface.name,
        colorscale: [[0, surface.color], [1, surface.color]],
        opacity: surface.opacity,
        showscale: false,
        hoverinfo: disableHover ? 'skip' : 'x+y+z+name'
    };
}

function buildMeshFromPoints(surface, disableHover = false) {
    const x = surface.points.map(p => p.x);
    const y = surface.points.map(p => p.y);
    const z = surface.points.map(p => p.z);

    return {
        type: 'mesh3d',
        x,
        y,
        z,
        name: surface.name,
        color: surface.color,
        opacity: surface.opacity,
        alphahull: 0, // Delaunay triangulation
        hoverinfo: disableHover ? 'skip' : 'x+y+z+name'
    };
}

function buildLayout(graph, is3D) {
    const hasColor = graph.dimension.includes('Color');
    const layout = {
        title: graph.title,
        showlegend: true,
        legend: {
            orientation: 'h',
            x: 0.5,
            xanchor: 'center',
            y: -0.15,
            yanchor: 'top'
        },
        paper_bgcolor: 'white',
        plot_bgcolor: 'white',
        margin: { l: 60, r: hasColor ? 100 : 30, t: 60, b: 80 }
    };

    // Helper function for axis config
    const getAxisConfig = (axis, title, includeZeroline = true) => {
        const config = { title, gridcolor: '#e2e8f0' };
        if (!is3D && includeZeroline) {
            config.zeroline = false;
        }
        return config;
    };

    if (is3D) {
        layout.scene = {
            xaxis: getAxisConfig('x', graph.columns.x, false),
            yaxis: getAxisConfig('y', graph.columns.y, false),
            zaxis: getAxisConfig('z', graph.columns.z, false),
            bgcolor: 'white'
        };
    } else {
        layout.xaxis = getAxisConfig('x', graph.columns.x);
        layout.yaxis = getAxisConfig('y', graph.columns.y);
    }

    return layout;
}

// ===== Expression Evaluation =====
// Store last expression error for better error reporting
let lastExpressionError = null;

function evaluateExpression(expr, variables) {
    try {
        // Replace constants
        let safeExpr = expr
            .replace(/\bpi\b/gi, Math.PI.toString())
            .replace(/\be\b/gi, Math.E.toString());

        // Replace power operator
        safeExpr = safeExpr.replace(/\^/g, '**');

        // Replace math functions
        safeExpr = safeExpr
            .replace(/\bsin\b/gi, 'Math.sin')
            .replace(/\bcos\b/gi, 'Math.cos')
            .replace(/\btan\b/gi, 'Math.tan')
            .replace(/\bsqrt\b/gi, 'Math.sqrt')
            .replace(/\babs\b/gi, 'Math.abs')
            .replace(/\blog\b/gi, 'Math.log')
            .replace(/\bexp\b/gi, 'Math.exp');

        // Create function with variables
        const varNames = Object.keys(variables);
        const varValues = Object.values(variables);

        const fn = new Function(...varNames, `return ${safeExpr}`);
        const result = fn(...varValues);

        return isFinite(result) ? result : NaN;
    } catch (e) {
        // Store error for later reporting
        lastExpressionError = `Invalid expression "${expr}": ${e.message}. Use * for multiplication (e.g., "x*y" not "xy").`;
        return NaN;
    }
}

function validateSurfaceData(zVals, equation) {
    // Check if all values are NaN (expression failed)
    const allNaN = zVals.flat ?
        zVals.flat().every(v => isNaN(v)) :
        zVals.every(v => isNaN(v));

    if (allNaN && lastExpressionError) {
        const error = lastExpressionError;
        lastExpressionError = null;
        throw new Error(error);
    }
    lastExpressionError = null;
}

function validateLineData(yVals, equation) {
    const allNaN = yVals.every(v => isNaN(v));
    if (allNaN && lastExpressionError) {
        const error = lastExpressionError;
        lastExpressionError = null;
        throw new Error(error);
    }
    lastExpressionError = null;
}

// ===== Utility Functions =====
function parseFloatOrNull(value) {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
}

// ===== Graph Actions =====
function toggleFullscreen(graphId) {
    const plotDiv = document.getElementById(`plot-${graphId}`);

    if (plotDiv.classList.contains('fullscreen')) {
        plotDiv.classList.remove('fullscreen');
        // Remove the exit fullscreen button
        const exitBtn = plotDiv.querySelector('.fullscreen-exit-btn');
        if (exitBtn) exitBtn.remove();
        Plotly.Plots.resize(plotDiv);
    } else {
        plotDiv.classList.add('fullscreen');

        // Add exit fullscreen button inside the plot
        const exitBtn = document.createElement('button');
        exitBtn.className = 'fullscreen-exit-btn btn btn-info btn-small';
        exitBtn.title = 'Exit Fullscreen (ESC)';
        exitBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 14h6v6"></path>
                <path d="M20 10h-6V4"></path>
                <path d="M14 10l7-7"></path>
                <path d="M3 21l7-7"></path>
            </svg>
        `;
        exitBtn.onclick = () => toggleFullscreen(graphId);
        plotDiv.appendChild(exitBtn);

        Plotly.Plots.resize(plotDiv);

        // Show notification
        const notification = document.createElement('div');
        notification.className = 'fullscreen-notification';
        notification.textContent = 'Press ESC to exit fullscreen';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
}

// ESC key handler for fullscreen
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const fullscreenPlot = document.querySelector('.graph-display.fullscreen');
        if (fullscreenPlot) {
            fullscreenPlot.classList.remove('fullscreen');
            // Remove the exit fullscreen button
            const exitBtn = fullscreenPlot.querySelector('.fullscreen-exit-btn');
            if (exitBtn) exitBtn.remove();
            Plotly.Plots.resize(fullscreenPlot);
        }
    }
});

function openInNewWindow(graphId) {
    const graph = state.graphs.find(g => g.id === graphId);
    if (!graph) return;

    const plotDiv = document.getElementById(`plot-${graphId}`);
    const data = plotDiv.data;
    const layout = { ...plotDiv.layout, width: 900, height: 700 };

    const newWindow = window.open('', '_blank', 'width=950,height=750');
    newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${graph.title}</title>
            <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
        </head>
        <body style="margin:0;padding:20px;background:#f8fafc;">
            <div id="plot"></div>
            <script>
                Plotly.newPlot('plot', ${JSON.stringify(data)}, ${JSON.stringify(layout)});
            </script>
        </body>
        </html>
    `);
    newWindow.document.close();
}

async function copyToClipboard(graphId) {
    const plotDiv = document.getElementById(`plot-${graphId}`);

    try {
        const dataUrl = await Plotly.toImage(plotDiv, { format: 'png', width: 1200, height: 800 });
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);

        showToast('Graph copied to clipboard!', 'success');
    } catch (error) {
        console.error('Failed to copy:', error);
        showToast('Failed to copy to clipboard', 'error');
    }
}

// ===== Advanced Options Modal =====
let currentModalGraphId = null;
let modalOpenSnapshot = null; // Snapshot of overlay state when modal opened

function openAdvancedOptions(graphId) {
    currentModalGraphId = graphId;
    const graph = state.graphs.find(g => g.id === graphId);
    if (!graph) return;

    // Save snapshot of current state for potential revert on X
    modalOpenSnapshot = {
        overlayPoints: JSON.parse(JSON.stringify(graph.overlayPoints)),
        overlayLines: JSON.parse(JSON.stringify(graph.overlayLines)),
        overlaySurfaces: JSON.parse(JSON.stringify(graph.overlaySurfaces)),
        hoverFields: [...graph.hoverFields],
        disableOverlayHover: graph.disableOverlayHover
    };

    const is3D = graph.dimension.includes('3D');
    const columns = state.columnOrder[graph.sheetName] || [];

    modalBody.innerHTML = `
        <!-- Overlay Points Section -->
        <div class="modal-section">
            <div class="overlay-category-header">
                <h3 class="modal-section-title">Overlay Points</h3>
                <div class="overlay-bulk-actions">
                    <button class="btn btn-outline btn-small" onclick="toggleAllOverlayPoints(true)">Show All</button>
                    <button class="btn btn-outline btn-small" onclick="toggleAllOverlayPoints(false)">Hide All</button>
                    <button class="btn btn-success btn-small" onclick="addOverlayPoint()">+ Add Point</button>
                </div>
            </div>
            <div id="overlay-points-list">
                ${renderOverlayPoints(graph.overlayPoints, is3D)}
            </div>
        </div>

        <!-- Overlay Lines Section -->
        <div class="modal-section">
            <div class="overlay-category-header">
                <h3 class="modal-section-title">Overlay Lines</h3>
                <div class="overlay-bulk-actions">
                    <button class="btn btn-outline btn-small" onclick="toggleAllOverlayLines(true)">Show All</button>
                    <button class="btn btn-outline btn-small" onclick="toggleAllOverlayLines(false)">Hide All</button>
                    <button class="btn btn-success btn-small" onclick="addOverlayLine()">+ Add Line</button>
                </div>
            </div>
            <div id="overlay-lines-list">
                ${renderOverlayLines(graph.overlayLines, is3D)}
            </div>
        </div>

        <!-- Overlay Surfaces Section (3D only) -->
        ${is3D ? `
        <div class="modal-section">
            <div class="overlay-category-header">
                <h3 class="modal-section-title">Overlay Surfaces</h3>
                <div class="overlay-bulk-actions">
                    <button class="btn btn-outline btn-small" onclick="toggleAllOverlaySurfaces(true)">Show All</button>
                    <button class="btn btn-outline btn-small" onclick="toggleAllOverlaySurfaces(false)">Hide All</button>
                    <button class="btn btn-success btn-small" onclick="addOverlaySurface()">+ Add Surface</button>
                </div>
            </div>
            <div id="overlay-surfaces-list">
                ${renderOverlaySurfaces(graph.overlaySurfaces)}
            </div>
        </div>
        ` : ''}

        <!-- Overlay Hover Settings Section -->
        <div class="modal-section">
            <div class="modal-section-header">
                <h3 class="modal-section-title">Overlay Hover Settings</h3>
            </div>
            <div class="checkbox-group" style="padding: 8px 0;">
                <input type="checkbox" id="disable-overlay-hover" ${graph.disableOverlayHover ? 'checked' : ''}>
                <label for="disable-overlay-hover">Disable hover tooltips on overlay items</label>
            </div>
        </div>

        <!-- Custom Hover Data Section -->
        <div class="modal-section">
            <div class="modal-section-header">
                <h3 class="modal-section-title">Custom Hover Data</h3>
            </div>
            <p style="font-size:13px;color:#64748b;margin-bottom:12px;">Select additional columns to display in hover tooltips:</p>
            <div class="hover-fields-grid">
                ${columns.map(col => `
                    <div class="hover-field-item">
                        <input type="checkbox" id="hover-${col}" ${graph.hoverFields.includes(col) ? 'checked' : ''} onchange="updateHoverFields()">
                        <label for="hover-${col}">${col}</label>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Expression Reference -->
        <div class="modal-section">
            <div class="expression-reference">
                <h4>Mathematical Expression Reference</h4>
                <p><strong>Operators:</strong> <code>+</code> <code>-</code> <code>*</code> <code>/</code> <code>^</code> (power)</p>
                <p><strong>Functions:</strong> <code>sin</code> <code>cos</code> <code>tan</code> <code>sqrt</code> <code>abs</code> <code>log</code> <code>exp</code></p>
                <p><strong>Constants:</strong> <code>pi</code> <code>e</code></p>
                <p><strong>Variables:</strong> <code>x</code>, <code>y</code>, <code>z</code>, <code>t</code>, <code>u</code>, <code>v</code></p>
                <p style="margin-top:8px;"><strong>Examples:</strong> <code>2*x + 3</code>, <code>sin(x) * cos(y)</code>, <code>sqrt(x^2 + y^2)</code></p>
            </div>
        </div>

        <!-- Apply Changes Button -->
        <div class="modal-actions">
            <button class="btn btn-success" onclick="applyAdvancedOptions()">
                Apply Changes
            </button>
        </div>
    `;

    modalOverlay.classList.add('active');
}

function renderOverlayPoints(points, is3D) {
    if (points.length === 0) {
        return '<div class="empty-state"><p class="empty-state-text">No overlay points. Click "Add Point" to create one.</p></div>';
    }

    return points.map((point, index) => `
        <div class="overlay-item">
            <div class="overlay-item-header">
                <div class="overlay-item-header-left">
                    <input
                        type="checkbox"
                        id="point-visible-${index}"
                        ${point.visible !== false ? 'checked' : ''}
                        onchange="toggleOverlayPointVisibility(${index})"
                    >
                    <label for="point-visible-${index}" class="checkbox-label-inline">
                        <span class="overlay-item-title">Point ${index + 1}</span>
                    </label>
                </div>
                <button class="btn btn-danger btn-small" onclick="deleteOverlayPoint(${index})">Delete</button>
            </div>
            <div class="overlay-item-grid">
                <div class="control-group">
                    <label class="control-label">Name</label>
                    <input type="text" id="point-name-${index}" value="${point.name}" onchange="updateOverlayPoint(${index})">
                </div>
                <div class="control-group">
                    <label class="control-label">X</label>
                    <input type="number" id="point-x-${index}" value="${point.x}" step="any" onchange="updateOverlayPoint(${index})">
                </div>
                <div class="control-group">
                    <label class="control-label">Y</label>
                    <input type="number" id="point-y-${index}" value="${point.y}" step="any" onchange="updateOverlayPoint(${index})">
                </div>
                ${is3D ? `
                <div class="control-group">
                    <label class="control-label">Z</label>
                    <input type="number" id="point-z-${index}" value="${point.z || 0}" step="any" onchange="updateOverlayPoint(${index})">
                </div>
                ` : ''}
                <div class="control-group">
                    <label class="control-label">Color</label>
                    <input type="color" id="point-color-${index}" value="${point.color}" onchange="updateOverlayPoint(${index})">
                </div>
                <div class="control-group">
                    <label class="control-label">Size</label>
                    <input type="number" id="point-size-${index}" value="${point.size}" min="1" max="30" onchange="updateOverlayPoint(${index})">
                </div>
                <div class="control-group">
                    <label class="control-label">Symbol</label>
                    <select id="point-symbol-${index}" onchange="updateOverlayPoint(${index})">
                        <option value="circle" ${point.symbol === 'circle' ? 'selected' : ''}>Circle</option>
                        <option value="square" ${point.symbol === 'square' ? 'selected' : ''}>Square</option>
                        <option value="diamond" ${point.symbol === 'diamond' ? 'selected' : ''}>Diamond</option>
                        <option value="cross" ${point.symbol === 'cross' ? 'selected' : ''}>Cross</option>
                        <option value="x" ${point.symbol === 'x' ? 'selected' : ''}>X</option>
                        <option value="triangle" ${point.symbol === 'triangle' ? 'selected' : ''}>Triangle</option>
                        <option value="star" ${point.symbol === 'star' ? 'selected' : ''}>Star</option>
                    </select>
                </div>
            </div>
        </div>
    `).join('');
}

function renderOverlayLines(lines, is3D) {
    if (lines.length === 0) {
        return '<div class="empty-state"><p class="empty-state-text">No overlay lines. Click "Add Line" to create one.</p></div>';
    }

    return lines.map((line, index) => `
        <div class="overlay-item">
            <div class="overlay-item-header">
                <div class="overlay-item-header-left">
                    <input
                        type="checkbox"
                        id="line-visible-${index}"
                        ${line.visible !== false ? 'checked' : ''}
                        onchange="toggleOverlayLineVisibility(${index})"
                    >
                    <label for="line-visible-${index}" class="checkbox-label-inline">
                        <span class="overlay-item-title">Line ${index + 1}</span>
                    </label>
                </div>
                <button class="btn btn-danger btn-small" onclick="deleteOverlayLine(${index})">Delete</button>
            </div>
            <div class="overlay-item-row" style="margin-bottom:12px;">
                <div class="control-group" style="flex:1;">
                    <label class="control-label">Name</label>
                    <input type="text" id="line-name-${index}" value="${line.name}" onchange="updateOverlayLine(${index})">
                </div>
                <div class="control-group">
                    <label class="control-label">Color</label>
                    <input type="color" id="line-color-${index}" value="${line.color}" onchange="updateOverlayLine(${index})">
                </div>
                <div class="control-group">
                    <label class="control-label">Width</label>
                    <input type="number" id="line-width-${index}" value="${line.width}" min="1" max="10" onchange="updateOverlayLine(${index})">
                </div>
            </div>
            <div class="mode-toggle">
                <button class="mode-btn ${line.mode === 'equation' ? 'active' : ''}" onclick="setLineMode(${index}, 'equation')">Equation</button>
                <button class="mode-btn ${line.mode === 'points' ? 'active' : ''}" onclick="setLineMode(${index}, 'points')">Points</button>
            </div>
            <div id="line-mode-content-${index}">
                ${line.mode === 'equation' ? renderLineEquationMode(line, index, is3D) : renderLinePointsMode(line, index, is3D)}
            </div>
        </div>
    `).join('');
}

function renderLineEquationMode(line, index, is3D) {
    return `
        <div class="overlay-item-row">
            <div class="control-group" style="flex:1;">
                <label class="control-label">y = f(x)</label>
                <input type="text" id="line-eq-y-${index}" value="${line.equation?.y || ''}" placeholder="e.g., 2*x + 1" onchange="updateOverlayLine(${index})">
            </div>
            ${is3D ? `
            <div class="control-group" style="flex:1;">
                <label class="control-label">z = f(x)</label>
                <input type="text" id="line-eq-z-${index}" value="${line.equation?.z || ''}" placeholder="e.g., x^2" onchange="updateOverlayLine(${index})">
            </div>
            ` : ''}
        </div>
    `;
}

function renderLinePointsMode(line, index, is3D) {
    const points = line.points || [];
    return `
        <div class="points-list" id="line-points-${index}">
            ${points.map((p, pIndex) => `
                <div class="point-item">
                    <div class="control-group">
                        <label class="control-label">X</label>
                        <input type="number" value="${p.x}" step="any" onchange="updateLinePoint(${index}, ${pIndex}, 'x', this.value)">
                    </div>
                    <div class="control-group">
                        <label class="control-label">Y</label>
                        <input type="number" value="${p.y}" step="any" onchange="updateLinePoint(${index}, ${pIndex}, 'y', this.value)">
                    </div>
                    ${is3D ? `
                    <div class="control-group">
                        <label class="control-label">Z</label>
                        <input type="number" value="${p.z || 0}" step="any" onchange="updateLinePoint(${index}, ${pIndex}, 'z', this.value)">
                    </div>
                    ` : ''}
                    <button class="btn btn-danger btn-small" onclick="deleteLinePoint(${index}, ${pIndex})">X</button>
                </div>
            `).join('')}
        </div>
        <button class="btn btn-outline btn-small" style="margin-top:8px;" onclick="addLinePoint(${index})">+ Add Point</button>
    `;
}

function renderOverlaySurfaces(surfaces) {
    if (surfaces.length === 0) {
        return '<div class="empty-state"><p class="empty-state-text">No overlay surfaces. Click "Add Surface" to create one.</p></div>';
    }

    return surfaces.map((surface, index) => `
        <div class="overlay-item">
            <div class="overlay-item-header">
                <div class="overlay-item-header-left">
                    <input
                        type="checkbox"
                        id="surface-visible-${index}"
                        ${surface.visible !== false ? 'checked' : ''}
                        onchange="toggleOverlaySurfaceVisibility(${index})"
                    >
                    <label for="surface-visible-${index}" class="checkbox-label-inline">
                        <span class="overlay-item-title">Surface ${index + 1}</span>
                    </label>
                </div>
                <button class="btn btn-danger btn-small" onclick="deleteOverlaySurface(${index})">Delete</button>
            </div>
            <div class="overlay-item-row" style="margin-bottom:12px;">
                <div class="control-group" style="flex:1;">
                    <label class="control-label">Name</label>
                    <input type="text" id="surface-name-${index}" value="${surface.name}" onchange="updateOverlaySurface(${index})">
                </div>
                <div class="control-group">
                    <label class="control-label">Color</label>
                    <input type="color" id="surface-color-${index}" value="${surface.color}" onchange="updateOverlaySurface(${index})">
                </div>
                <div class="control-group">
                    <label class="control-label">Opacity</label>
                    <input type="number" id="surface-opacity-${index}" value="${surface.opacity}" min="0" max="1" step="0.1" onchange="updateOverlaySurface(${index})">
                </div>
            </div>
            <div class="mode-toggle">
                <button class="mode-btn ${surface.mode === 'surface' ? 'active' : ''}" onclick="setSurfaceMode(${index}, 'surface')">Equation</button>
                <button class="mode-btn ${surface.mode === 'parametric' ? 'active' : ''}" onclick="setSurfaceMode(${index}, 'parametric')">Parametric</button>
                <button class="mode-btn ${surface.mode === 'points' ? 'active' : ''}" onclick="setSurfaceMode(${index}, 'points')">Points</button>
            </div>
            <div id="surface-mode-content-${index}">
                ${renderSurfaceModeContent(surface, index)}
            </div>
        </div>
    `).join('');
}

function renderSurfaceModeContent(surface, index) {
    if (surface.mode === 'surface') {
        return `
            <div class="overlay-item-row">
                <div class="control-group">
                    <label class="control-label">Variable</label>
                    <select id="surface-var-${index}" onchange="updateOverlaySurface(${index})">
                        <option value="z" ${surface.surfaceEquation?.variable === 'z' ? 'selected' : ''}>z = f(x,y)</option>
                        <option value="y" ${surface.surfaceEquation?.variable === 'y' ? 'selected' : ''}>y = f(x,z)</option>
                        <option value="x" ${surface.surfaceEquation?.variable === 'x' ? 'selected' : ''}>x = f(y,z)</option>
                    </select>
                </div>
                <div class="control-group" style="flex:1;">
                    <label class="control-label">Equation</label>
                    <input type="text" id="surface-eq-${index}" value="${surface.surfaceEquation?.equation || ''}" placeholder="e.g., x^2 + y^2" onchange="updateOverlaySurface(${index})">
                </div>
            </div>
        `;
    } else if (surface.mode === 'parametric') {
        return `
            <div class="overlay-item-row">
                <div class="control-group" style="flex:1;">
                    <label class="control-label">x(u,v)</label>
                    <input type="text" id="surface-param-x-${index}" value="${surface.parametricEquations?.x || ''}" placeholder="e.g., cos(u)*sin(v)" onchange="updateOverlaySurface(${index})">
                </div>
                <div class="control-group" style="flex:1;">
                    <label class="control-label">y(u,v)</label>
                    <input type="text" id="surface-param-y-${index}" value="${surface.parametricEquations?.y || ''}" placeholder="e.g., sin(u)*sin(v)" onchange="updateOverlaySurface(${index})">
                </div>
                <div class="control-group" style="flex:1;">
                    <label class="control-label">z(u,v)</label>
                    <input type="text" id="surface-param-z-${index}" value="${surface.parametricEquations?.z || ''}" placeholder="e.g., cos(v)" onchange="updateOverlaySurface(${index})">
                </div>
            </div>
        `;
    } else {
        const points = surface.points || [];
        return `
            <div class="points-list" id="surface-points-${index}">
                ${points.map((p, pIndex) => `
                    <div class="point-item">
                        <div class="control-group">
                            <label class="control-label">X</label>
                            <input type="number" value="${p.x}" step="any" onchange="updateSurfacePoint(${index}, ${pIndex}, 'x', this.value)">
                        </div>
                        <div class="control-group">
                            <label class="control-label">Y</label>
                            <input type="number" value="${p.y}" step="any" onchange="updateSurfacePoint(${index}, ${pIndex}, 'y', this.value)">
                        </div>
                        <div class="control-group">
                            <label class="control-label">Z</label>
                            <input type="number" value="${p.z}" step="any" onchange="updateSurfacePoint(${index}, ${pIndex}, 'z', this.value)">
                        </div>
                        <button class="btn btn-danger btn-small" onclick="deleteSurfacePoint(${index}, ${pIndex})">X</button>
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-outline btn-small" style="margin-top:8px;" onclick="addSurfacePoint(${index})">+ Add Point</button>
            <p style="font-size:12px;color:#64748b;margin-top:8px;">Minimum 3 points required. Points will be triangulated to form a mesh surface.</p>
        `;
    }
}

// ===== Overlay Points Functions =====
function addOverlayPoint() {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    graph.overlayPoints.push({
        name: `Point ${graph.overlayPoints.length + 1}`,
        x: 0,
        y: 0,
        z: 0,
        color: '#ef4444',
        size: 12,
        symbol: 'circle',
        visible: true
    });

    refreshOverlayPointsList();
}

function deleteOverlayPoint(index) {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    graph.overlayPoints.splice(index, 1);
    refreshOverlayPointsList();
}

function toggleOverlayPointVisibility(index) {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    const point = graph.overlayPoints[index];
    const checkbox = document.getElementById(`point-visible-${index}`);
    point.visible = checkbox.checked;

    updateGraph(currentModalGraphId);
}

function toggleAllOverlayPoints(visible) {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    graph.overlayPoints.forEach(point => point.visible = visible);
    refreshOverlayPointsList();
    updateGraph(currentModalGraphId);
}

function updateOverlayPoint(index) {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    const point = graph.overlayPoints[index];
    point.name = document.getElementById(`point-name-${index}`).value;
    point.x = parseFloat(document.getElementById(`point-x-${index}`).value) || 0;
    point.y = parseFloat(document.getElementById(`point-y-${index}`).value) || 0;
    const zInput = document.getElementById(`point-z-${index}`);
    if (zInput) point.z = parseFloat(zInput.value) || 0;
    point.color = document.getElementById(`point-color-${index}`).value;
    point.size = parseInt(document.getElementById(`point-size-${index}`).value) || 12;
    point.symbol = document.getElementById(`point-symbol-${index}`).value;
}

function refreshOverlayPointsList() {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    const is3D = graph.dimension.includes('3D');
    document.getElementById('overlay-points-list').innerHTML = renderOverlayPoints(graph.overlayPoints, is3D);
}

// ===== Overlay Lines Functions =====
function addOverlayLine() {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    graph.overlayLines.push({
        name: `Line ${graph.overlayLines.length + 1}`,
        color: '#3b82f6',
        width: 2,
        mode: 'equation',
        equation: { y: '', z: '' },
        points: [],
        visible: true
    });

    refreshOverlayLinesList();
}

function deleteOverlayLine(index) {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    graph.overlayLines.splice(index, 1);
    refreshOverlayLinesList();
}

function toggleOverlayLineVisibility(index) {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    const line = graph.overlayLines[index];
    const checkbox = document.getElementById(`line-visible-${index}`);
    line.visible = checkbox.checked;

    updateGraph(currentModalGraphId);
}

function toggleAllOverlayLines(visible) {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    graph.overlayLines.forEach(line => line.visible = visible);
    refreshOverlayLinesList();
    updateGraph(currentModalGraphId);
}

function updateOverlayLine(index) {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    const line = graph.overlayLines[index];
    line.name = document.getElementById(`line-name-${index}`).value;
    line.color = document.getElementById(`line-color-${index}`).value;
    line.width = parseInt(document.getElementById(`line-width-${index}`).value) || 2;

    if (line.mode === 'equation') {
        line.equation = {
            y: document.getElementById(`line-eq-y-${index}`)?.value || '',
            z: document.getElementById(`line-eq-z-${index}`)?.value || ''
        };
    }
}

function setLineMode(index, mode) {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    graph.overlayLines[index].mode = mode;
    refreshOverlayLinesList();
}

function addLinePoint(lineIndex) {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    if (!graph.overlayLines[lineIndex].points) {
        graph.overlayLines[lineIndex].points = [];
    }

    graph.overlayLines[lineIndex].points.push({ x: 0, y: 0, z: 0 });
    refreshOverlayLinesList();
}

function deleteLinePoint(lineIndex, pointIndex) {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    graph.overlayLines[lineIndex].points.splice(pointIndex, 1);
    refreshOverlayLinesList();
}

function updateLinePoint(lineIndex, pointIndex, coord, value) {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    graph.overlayLines[lineIndex].points[pointIndex][coord] = parseFloat(value) || 0;
}

function refreshOverlayLinesList() {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    const is3D = graph.dimension.includes('3D');
    document.getElementById('overlay-lines-list').innerHTML = renderOverlayLines(graph.overlayLines, is3D);
}

// ===== Overlay Surfaces Functions =====
function addOverlaySurface() {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    graph.overlaySurfaces.push({
        name: `Surface ${graph.overlaySurfaces.length + 1}`,
        color: '#10b981',
        opacity: 0.7,
        mode: 'surface',
        surfaceEquation: { variable: 'z', equation: '' },
        parametricEquations: { x: '', y: '', z: '' },
        points: [],
        visible: true
    });

    refreshOverlaySurfacesList();
}

function deleteOverlaySurface(index) {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    graph.overlaySurfaces.splice(index, 1);
    refreshOverlaySurfacesList();
}

function toggleOverlaySurfaceVisibility(index) {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    const surface = graph.overlaySurfaces[index];
    const checkbox = document.getElementById(`surface-visible-${index}`);
    surface.visible = checkbox.checked;

    updateGraph(currentModalGraphId);
}

function toggleAllOverlaySurfaces(visible) {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    graph.overlaySurfaces.forEach(surface => surface.visible = visible);
    refreshOverlaySurfacesList();
    updateGraph(currentModalGraphId);
}

function updateOverlaySurface(index) {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    const surface = graph.overlaySurfaces[index];
    surface.name = document.getElementById(`surface-name-${index}`).value;
    surface.color = document.getElementById(`surface-color-${index}`).value;
    surface.opacity = parseFloat(document.getElementById(`surface-opacity-${index}`).value) || 0.7;

    if (surface.mode === 'surface') {
        surface.surfaceEquation = {
            variable: document.getElementById(`surface-var-${index}`).value,
            equation: document.getElementById(`surface-eq-${index}`).value
        };
    } else if (surface.mode === 'parametric') {
        surface.parametricEquations = {
            x: document.getElementById(`surface-param-x-${index}`).value,
            y: document.getElementById(`surface-param-y-${index}`).value,
            z: document.getElementById(`surface-param-z-${index}`).value
        };
    }
}

function setSurfaceMode(index, mode) {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    graph.overlaySurfaces[index].mode = mode;
    refreshOverlaySurfacesList();
}

function addSurfacePoint(surfaceIndex) {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    if (!graph.overlaySurfaces[surfaceIndex].points) {
        graph.overlaySurfaces[surfaceIndex].points = [];
    }

    graph.overlaySurfaces[surfaceIndex].points.push({ x: 0, y: 0, z: 0 });
    refreshOverlaySurfacesList();
}

function deleteSurfacePoint(surfaceIndex, pointIndex) {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    graph.overlaySurfaces[surfaceIndex].points.splice(pointIndex, 1);
    refreshOverlaySurfacesList();
}

function updateSurfacePoint(surfaceIndex, pointIndex, coord, value) {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    graph.overlaySurfaces[surfaceIndex].points[pointIndex][coord] = parseFloat(value) || 0;
}

function refreshOverlaySurfacesList() {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    document.getElementById('overlay-surfaces-list').innerHTML = renderOverlaySurfaces(graph.overlaySurfaces);
}

// ===== Hover Fields =====
function updateHoverFields() {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph) return;

    const columns = state.columnOrder[graph.sheetName] || [];
    graph.hoverFields = columns.filter(col => {
        const checkbox = document.getElementById(`hover-${col}`);
        return checkbox && checkbox.checked;
    });
}

// ===== Modal Close =====
// X button - discard changes and restore from snapshot
modalClose.addEventListener('click', discardAndCloseModal);

// Click outside - soft close (keep changes but don't apply)
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) softCloseModal();
});

function applyAdvancedOptions() {
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (!graph || !modalOpenSnapshot) {
        closeModalCleanup();
        return;
    }

    // Save the snapshot as the "before" state for undo
    const history = graphHistory.get(currentModalGraphId);
    if (history) {
        // Create a full graph snapshot but with the OLD overlay data
        const beforeSnapshot = createGraphSnapshot(graph);
        beforeSnapshot.overlayPoints = modalOpenSnapshot.overlayPoints;
        beforeSnapshot.overlayLines = modalOpenSnapshot.overlayLines;
        beforeSnapshot.overlaySurfaces = modalOpenSnapshot.overlaySurfaces;
        beforeSnapshot.hoverFields = modalOpenSnapshot.hoverFields;
        beforeSnapshot.disableOverlayHover = modalOpenSnapshot.disableOverlayHover;

        history.past.push(beforeSnapshot);
        history.future = [];
        if (history.past.length > 25) {
            history.past.shift();
        }
        updateUndoRedoButtons(currentModalGraphId);
    }

    // Update disableOverlayHover from checkbox
    const disableHoverCheckbox = document.getElementById('disable-overlay-hover');
    if (disableHoverCheckbox) {
        graph.disableOverlayHover = disableHoverCheckbox.checked;
    }

    // Update the graph with current state
    updateGraph(currentModalGraphId);
    showToast('Advanced options applied', 'success');
    closeModalCleanup();
}

function discardAndCloseModal() {
    // Restore from snapshot (discard changes)
    const graph = state.graphs.find(g => g.id === currentModalGraphId);
    if (graph && modalOpenSnapshot) {
        graph.overlayPoints = JSON.parse(JSON.stringify(modalOpenSnapshot.overlayPoints));
        graph.overlayLines = JSON.parse(JSON.stringify(modalOpenSnapshot.overlayLines));
        graph.overlaySurfaces = JSON.parse(JSON.stringify(modalOpenSnapshot.overlaySurfaces));
        graph.hoverFields = [...modalOpenSnapshot.hoverFields];
        graph.disableOverlayHover = modalOpenSnapshot.disableOverlayHover;
    }
    closeModalCleanup();
}

function softCloseModal() {
    // Just close - keep changes in state but don't apply to graph
    closeModalCleanup();
}

function closeModalCleanup() {
    modalOverlay.classList.remove('active');
    currentModalGraphId = null;
    modalOpenSnapshot = null;
}

// ===== Add Graph Button =====
addGraphBtn.addEventListener('click', addGraph);

// ===== Initialize Example Graph =====
function initializeExampleGraph() {
    // Create example data: 3D Gaussian-modulated ripple
    // Focused on the interesting curved region with dense sampling
    const exampleData = [];
    const gridSize = 35;
    const range = 4; // Tighter range to focus on the peak
    const scale = 1000; // Scale factor to create visible data range

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const x = ((i / (gridSize - 1)) * 2 * range - range) * scale;
            const y = ((j / (gridSize - 1)) * 2 * range - range) * scale;
            const r = Math.sqrt(x * x + y * y);

            // Gaussian-modulated cosine - creates a nice dome with ripples
            const z = Math.cos(r / scale * 1.5) * Math.exp(-r * r / (scale * scale * 8)) * scale;

            exampleData.push({
                'X': x,
                'Y': y,
                'Z': z,
                'Radius': r,
                'Amplitude': z
            });
        }
    }

    state.allData = { 'Example Data': exampleData };
    state.columnOrder = { 'Example Data': ['X', 'Y', 'Z', 'Radius', 'Amplitude'] };

    // Add graph and configure as 3D with Color
    addGraph();
    const graph = state.graphs[0];
    graph.title = 'Gaussian Ripple Example Data';
    graph.dimension = '3D with Color';
    graph.graphType = '3D Scatter';
    graph.columns.x = 'X';
    graph.columns.y = 'Y';
    graph.columns.z = 'Z';
    graph.columns.color = 'Amplitude';

    // Update UI controls to reflect 3D with Color settings
    populateGraphControls(graph);
    document.getElementById(`title-${graph.id}`).value = graph.title;
    updateGraph(graph.id);

    showToast('Welcome! Example 3D surface loaded. Upload your Excel file to get started.', 'info');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeExampleGraph);
