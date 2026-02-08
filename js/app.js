import * as DATA from './data.js';
import * as ENGINE from './engine.js';

// State
let GRID_SIZE = 10, CELL_SIZE = 50, grid = [], currentMode = 'solver', currentTheme = 'classic', currentSetKey = 'standard';
let currentAlgo = 'wfc', currentTopology = 'plane', activeTileSet = DATA.SETS['standard'], activeColors = DATA.COLORS_STD, biomeWeights = {};
let isMissionActive = false, missionStart = null, missionEnd = null, missionConnected = false;
let cursorRow = 0, cursorCol = 0, historyStack = [], isRunning = false, isBacktracking = false, animationFrameId, speed = 70;
let puzzleDirty = false, isSolved = false, backtrackCount = 0, isInfinite = false, lockedCells = new Set(), selectedRow = 0, selectedCol = 0;

let rand = Math.random;
let customSetsData = {}; // Stores custom sets to persist/save
let creatorState = { tiles: [], currentEdgeColors: [0, 0, 0, 0], palette: 'standard', dragging: false };

// DOM
const canvas = document.getElementById('tilingCanvas');
const ctx = canvas.getContext('2d');
const logBox = document.getElementById('log-box');

// Initialization
function init() {
    initWeights('standard');
    resetGrid();
    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(document.querySelector('.canvas-area'));
    initPalette();
    initTileCreator();
    loadCustomSets(); // Load saved custom sets
    bindEvents();
}

function bindEvents() {
    document.getElementById('btn-play-pause').onclick = togglePlayPause;
    document.getElementById('btn-step-back').onclick = stepBack;
    document.getElementById('btn-step').onclick = () => { isRunning = false; solverStep(); updateUI(); };
    document.getElementById('btn-reset').onclick = resetGrid;
    document.getElementById('btn-infinite').onclick = toggleInfinite;
    document.getElementById('algo-select').onchange = (e) => { currentAlgo = e.target.value; resetGrid(); };
    document.getElementById('topology-select').onchange = (e) => { currentTopology = e.target.value; resetGrid(); };
    document.getElementById('size-slider').onchange = (e) => changeGridSize(e.target.value);
    document.getElementById('size-slider').oninput = (e) => document.getElementById('grid-size-val').innerText = e.target.value;
    document.getElementById('seed-input').onchange = (e) => updateSeed(e.target.value);
    document.getElementById('btn-random-seed').onclick = randomizeSeed;
    document.getElementById('tile-set-select').onchange = (e) => changeTileSet(e.target.value);
    document.getElementById('theme-select').onchange = (e) => { currentTheme = e.target.value; initPalette(); resizeCanvas(); };
    document.getElementById('mission-btn').onclick = toggleMission;
    document.getElementById('btn-save').onclick = saveState;
    document.getElementById('btn-load').onclick = () => document.getElementById('file-input').click();
    document.getElementById('file-input').onchange = loadState;
    document.getElementById('palette-btn').onclick = togglePalette;
    document.getElementById('btn-snapshot').onclick = downloadSnapshot;
    document.getElementById('mode-solver').onclick = () => setMode('solver');
    document.getElementById('mode-puzzle').onclick = () => setMode('puzzle');
    document.getElementById('speed-slider').oninput = (e) => speed = e.target.value;
    document.getElementById('btn-reset-weights').onclick = () => initWeights(currentSetKey);
    document.getElementById('btn-custom-tile').onclick = () => openTileCreator();
    document.getElementById('btn-edit-set').onclick = editCustomSet;

    canvas.addEventListener('mousedown', handleCanvasClick);
}

// Logic & Rendering (Condensed for migration - Logic moved to engine.js where possible)
// Re-implementing rendering here or separate file?
// For brevity in this response, main rendering logic stays here or we import a renderer.
// Given token limits, I will provide the core loop structure here.

function resizeCanvas() {
    const area = document.querySelector('.canvas-area');
    if (!area) return;
    const w = area.clientWidth;
    const h = area.clientHeight;
    if (w === 0 || h === 0) return;
    const dim = Math.min(w, h) - 40;
    CELL_SIZE = Math.floor(dim / GRID_SIZE);
    if (currentTheme === 'isometric') CELL_SIZE = Math.floor(CELL_SIZE * 0.8);
    canvas.width = w; canvas.height = h;
    drawAll();
}

function resetGrid() {
    const seedVal = document.getElementById('seed-input').value.trim();
    if (seedVal === "") rand = Math.random;
    else rand = ENGINE.seedPRNG(seedVal);

    grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
    cursorRow = 0; cursorCol = 0;
    historyStack = [];
    isRunning = false; isBacktracking = false; puzzleDirty = false; isSolved = false; missionConnected = false; backtrackCount = 0; lockedCells.clear();
    if (isMissionActive) generateMissionNodes();
    cancelAnimationFrame(animationFrameId);
    log(`Grid reset. Size: ${GRID_SIZE}x${GRID_SIZE}`);
    drawAll(); updateUI();
}

function solverStep() {
    drawAll();
    updateStats();

    let ops = 0;
    let adaptiveMaxOps = isBacktracking ? 20 : 1;
    if (GRID_SIZE > 20) adaptiveMaxOps = 5;
    if (GRID_SIZE > 50) adaptiveMaxOps = 50;
    if (isBacktracking) adaptiveMaxOps = 50;

    while (ops < adaptiveMaxOps) {
        ops++;
        let targetR, targetC;

        if (!isBacktracking) {
            let next;
            if (currentAlgo === 'linear') {
                for (let r = 0; r < GRID_SIZE; r++) { for (let c = 0; c < GRID_SIZE; c++) { if (grid[r][c] === null) { next = { r, c }; break; } } if (next) break; }
            } else {
                next = ENGINE.findMinEntropyCell(grid, GRID_SIZE, currentTopology, activeTileSet, rand);
            }

            if (!next) {
                // Done
                if (isInfinite) {
                    log("Cycle complete. Decaying...");
                    drawAll();
                    setTimeout(() => { shatterGrid(); if (isInfinite && isRunning) solverStep(); }, 1000);
                    return;
                }
                isRunning = false; isSolved = true;
                checkMissionSuccess();
                if (isMissionActive && missionConnected) log("MISSION SUCCESS!", "success");
                else if (isMissionActive) log("MISSION FAILED.", "error");
                else log("Puzzle Solved!", "success");
                updateUI(); drawAll(); return;
            }
            targetR = next.r; targetC = next.c;
        }

        let currentHistory;
        if (!isBacktracking) {
            currentHistory = { r: targetR, c: targetC, tried: new Set(), locked: false };
            historyStack.push(currentHistory);
        } else {
            if (historyStack.length === 0) {
                if (isInfinite) { shatterGrid(true); if (isRunning) setTimeout(solverStep, 20); return; }
                isRunning = false; log("Unsolvable.", "error"); return;
            }
            currentHistory = historyStack[historyStack.length - 1];
            targetR = currentHistory.r; targetC = currentHistory.c;
        }

        cursorRow = targetR; cursorCol = targetC;

        if (currentHistory.locked) {
            if (lockedCells.has(`${targetR},${targetC}`)) { handleBacktrack(); continue; }
        }

        let candidates = ENGINE.getCandidates(targetR, targetC, grid, GRID_SIZE, currentTopology, activeTileSet);
        let validCandidates = candidates.filter(idx => !currentHistory.tried.has(idx));
        validCandidates = validCandidates.filter(idx => ENGINE.checkLookahead(targetR, targetC, idx, grid, GRID_SIZE, currentTopology, activeTileSet));

        if (validCandidates.length > 0) {
            const foundIndex = ENGINE.getWeightedRandomCandidate(validCandidates, activeTileSet, biomeWeights, rand);
            isBacktracking = false;
            currentHistory.tried.add(foundIndex);
            grid[targetR][targetC] = activeTileSet[foundIndex];
            checkMissionSuccess();
            if (!isBacktracking) break;
        } else {
            handleBacktrack();
        }
    }

    if (isRunning) {
        let delay = 105 - speed;
        if (isBacktracking || GRID_SIZE > 30) delay = 0;
        animationFrameId = requestAnimationFrame(() => setTimeout(solverStep, delay));
    } else {
        drawAll();
    }
}

function handleBacktrack() {
    isBacktracking = true; backtrackCount++;
    if (historyStack.length === 0) return;
    const failedState = historyStack.pop();
    if (!lockedCells.has(`${failedState.r},${failedState.c}`) && !failedState.locked) {
        grid[failedState.r][failedState.c] = null;
    }
}

// --- RESTORED FUNCTIONS ---

function updateSeed(val) {
    if (!val || val.trim() === "") {
        rand = Math.random;
        log("Seed cleared: using random generation.");
    } else {
        rand = ENGINE.seedPRNG(val);
        log(`Seed set to: "${val}"`);
    }
    resetGrid();
}

function randomizeSeed() {
    const newSeed = Math.random().toString(36).substring(7);
    document.getElementById('seed-input').value = newSeed;
    updateSeed(newSeed);
}

function changeGridSize(val) {
    GRID_SIZE = parseInt(val);
    document.getElementById('grid-size-val').innerText = val;
    document.getElementById('grid-size-val2').innerText = val;
    resetGrid();
    resizeCanvas();
}

function changeTileSet(newSetKey) {
    currentSetKey = newSetKey;
    activeTileSet = DATA.SETS[newSetKey];
    currentSetKey = newSetKey;
    activeTileSet = DATA.SETS[newSetKey];
    const meta = DATA.SET_METADATA[newSetKey];

    if (meta && meta.palette) {
        activeColors = meta.palette;
    } else if (newSetKey === 'terrain') {
        activeColors = DATA.COLORS_TERRAIN;
    } else {
        activeColors = DATA.COLORS_STD;
    }

    initWeights(newSetKey);
    initPalette();
    initWeights(newSetKey);
    initPalette();
    resetGrid();

    // Toggle Edit Button
    const editBtn = document.getElementById('btn-edit-set');
    if (customSetsData[newSetKey]) {
        editBtn.style.display = 'flex';
    } else {
        editBtn.style.display = 'none';
    }
}

function toggleMission() {
    isMissionActive = !isMissionActive;
    const btn = document.getElementById('mission-btn');
    const missionBadge = document.getElementById('mission-status');
    if (isMissionActive) {
        btn.innerText = "Mission: ON";
        btn.style.borderColor = "var(--success)";
        btn.style.color = "var(--success)";
        document.getElementById('tile-set-select').value = 'circuit';
        changeTileSet('circuit');
        currentTheme = 'pipes';
        document.getElementById('theme-select').value = 'pipes';
        missionBadge.className = "mission-badge pending";
        missionBadge.innerText = "NO SIGNAL";
        log("MISSION STARTED: Connect GREEN to RED.");
    } else {
        btn.innerText = "Mission: OFF";
        btn.style.borderColor = "#444";
        btn.style.color = "#aaa";
        missionBadge.style.display = "none";
        missionStart = null;
        missionEnd = null;
        log("Mission aborted.");
        resetGrid();
    }
}

function toggleInfinite() {
    const btnInfinite = document.getElementById('btn-infinite');
    isInfinite = !isInfinite;
    if (isInfinite) {
        btnInfinite.innerText = "Infinite Loop: ON";
        btnInfinite.classList.add('active');
        if (!isRunning && isSolved) {
            shatterGrid();
            isRunning = true;
            solverStep();
        }
    } else {
        btnInfinite.innerText = "Infinite Loop: OFF";
        btnInfinite.classList.remove('active');
    }
}

function saveState() {
    const state = {
        version: "11.2",
        gridSize: GRID_SIZE,
        seed: document.getElementById('seed-input').value,
        setKey: currentSetKey,
        theme: currentTheme,
        topology: currentTopology,
        algo: currentAlgo,
        mission: { active: isMissionActive, start: missionStart, end: missionEnd },
        weights: biomeWeights,
        grid: grid,
        locked: Array.from(lockedCells),
        infinite: isInfinite
    };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wang_lab_save_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    log("State saved successfully.", "success");
}

function loadState(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const state = JSON.parse(e.target.result);
            applyState(state);
            log("State loaded successfully.", "success");
        } catch (err) {
            log("Error loading save file.", "error");
            console.error(err);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function applyState(state) {
    GRID_SIZE = state.gridSize || 10;
    document.getElementById('size-slider').value = GRID_SIZE;
    document.getElementById('grid-size-val').innerText = GRID_SIZE;

    document.getElementById('seed-input').value = state.seed || "";
    if (state.seed && state.seed.trim() !== "") rand = ENGINE.seedPRNG(state.seed);
    else rand = Math.random;

    currentSetKey = state.setKey || 'standard';
    document.getElementById('tile-set-select').value = currentSetKey;
    activeTileSet = DATA.SETS[currentSetKey];
    if (currentSetKey === 'terrain') activeColors = DATA.COLORS_TERRAIN;
    else activeColors = DATA.COLORS_STD;

    currentTheme = state.theme || 'classic';
    document.getElementById('theme-select').value = currentTheme;

    currentTopology = state.topology || 'plane';
    document.getElementById('topology-select').value = currentTopology;

    currentAlgo = state.algo || 'wfc';
    document.getElementById('algo-select').value = currentAlgo;

    initWeights(currentSetKey);
    if (state.weights) {
        biomeWeights = state.weights;
        const sliders = document.getElementById('biome-sliders').querySelectorAll('input[type="range"]');
        sliders.forEach((slider, i) => {
            if (biomeWeights[i] !== undefined) {
                slider.value = biomeWeights[i];
                slider.nextElementSibling.innerText = biomeWeights[i];
            }
        });
    }

    isMissionActive = state.mission?.active || false;
    missionStart = state.mission?.start || null;
    missionEnd = state.mission?.end || null;
    const btn = document.getElementById('mission-btn');
    const missionBadge = document.getElementById('mission-status');
    if (isMissionActive) {
        btn.innerText = "Mission: ON";
        btn.style.borderColor = "var(--success)";
        btn.style.color = "var(--success)";
        missionBadge.style.display = "flex";
    } else {
        btn.innerText = "Mission: OFF";
        btn.style.borderColor = "#444";
        btn.style.color = "#aaa";
        missionBadge.style.display = "none";
    }

    isInfinite = state.infinite || false;
    const btnInfinite = document.getElementById('btn-infinite');
    if (isInfinite) {
        btnInfinite.innerText = "Infinite Loop: ON";
        btnInfinite.classList.add('active');
    } else {
        btnInfinite.innerText = "Infinite Loop: OFF";
        btnInfinite.classList.remove('active');
    }

    grid = state.grid || Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
    lockedCells = new Set(state.locked || []);
    historyStack = [];
    isRunning = false;
    isBacktracking = false;
    isSolved = false;
    backtrackCount = 0;
    cursorRow = 0;
    cursorCol = 0;
    cancelAnimationFrame(animationFrameId);

    initPalette();
    resizeCanvas();
    checkMissionSuccess();
    updateUI();
}

function togglePalette() {
    const sb = document.getElementById('sidebar-puzzle');
    sb.classList.toggle('hidden');
    const btn = document.getElementById('palette-btn');
    if (sb.classList.contains('hidden')) {
        btn.classList.remove('active');
    } else {
        btn.classList.add('active');
    }
}

function downloadSnapshot() {
    const link = document.createElement('a');
    link.download = `wang_tile_${document.getElementById('seed-input').value}.png`;
    link.href = canvas.toDataURL();
    link.click();
}

function initWeights(setKey) {
    const biomeContainer = document.getElementById('biome-sliders');
    biomeContainer.innerHTML = '';
    biomeWeights = {};
    const meta = DATA.SET_METADATA[setKey];
    const titleEl = document.getElementById('weights-title-text');
    if (titleEl) titleEl.innerText = meta.title;

    let colors = (setKey === 'terrain') ? DATA.COLORS_TERRAIN : DATA.COLORS_STD;

    for (let i = 0; i < meta.count; i++) {
        biomeWeights[i] = 50;
        const row = document.createElement('div');
        row.className = 'biome-row';

        const box = document.createElement('div');
        box.className = 'biome-color';
        box.style.backgroundColor = colors[i];

        const label = document.createElement('span');
        label.className = 'biome-name';
        if (meta.labels && meta.labels[i]) {
            label.innerText = meta.labels[i];
        } else {
            label.innerText = `Color ${i + 1}`;
        }

        const valDisp = document.createElement('span');
        valDisp.className = 'biome-val';
        valDisp.innerText = '50';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '100';
        slider.value = '50';
        slider.oninput = (e) => {
            biomeWeights[i] = parseInt(e.target.value);
            valDisp.innerText = e.target.value;
        };

        row.appendChild(box);
        row.appendChild(label);
        row.appendChild(slider);
        row.appendChild(valDisp);
        biomeContainer.appendChild(row);
    }
}

function shatterGrid(forceBig = false) {
    const radius = forceBig ? Math.floor(GRID_SIZE / 2) : Math.floor(GRID_SIZE / 3) + 1;
    const originR = Math.floor(Math.random() * GRID_SIZE);
    const originC = Math.floor(Math.random() * GRID_SIZE);
    let count = 0;

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            let dr = Math.abs(r - originR);
            let dc = Math.abs(c - originC);
            if (currentTopology === 'torus') {
                if (dr > GRID_SIZE / 2) dr = GRID_SIZE - dr;
                if (dc > GRID_SIZE / 2) dc = GRID_SIZE - dc;
            }
            if (Math.sqrt(dr * dr + dc * dc) < radius) {
                if (!lockedCells.has(`${r},${c}`)) {
                    grid[r][c] = null;
                    count++;
                }
            }
        }
    }
    historyStack = [];
    isSolved = false;
    isBacktracking = false;
    const msg = forceBig ? "UNSOLVABLE! Massive destruction trigger." : "Cycle complete. Decay triggered.";
    const type = forceBig ? "error" : "info";
    log(`${msg} (${count} tiles cleared)`, type);
    updateUI();
    drawAll();
}

function generateMissionNodes() {
    const r1 = Math.floor(rand() * GRID_SIZE);
    const c1 = 0;
    const r2 = Math.floor(rand() * GRID_SIZE);
    const c2 = GRID_SIZE - 1;
    missionStart = { r: r1, c: c1 };
    missionEnd = { r: r2, c: c2 };
}

function checkMissionSuccess() {
    if (!isMissionActive || !missionStart || !missionEnd) return;
    let queue = [missionStart];
    let visited = new Set();
    visited.add(`${missionStart.r},${missionStart.c}`);
    let found = false;

    while (queue.length > 0) {
        const curr = queue.shift();
        if (curr.r === missionEnd.r && curr.c === missionEnd.c) {
            found = true;
            break;
        }
        const tile = grid[curr.r][curr.c];
        if (!tile) continue;

        const dirs = [
            { dr: -1, dc: 0, fromIdx: 0, toIdx: 2 },
            { dr: 0, dc: 1, fromIdx: 1, toIdx: 3 },
            { dr: 1, dc: 0, fromIdx: 2, toIdx: 0 },
            { dr: 0, dc: -1, fromIdx: 3, toIdx: 1 }
        ];

        for (let d of dirs) {
            if (tile[d.fromIdx] === 0) continue;
            const nr = curr.r + d.dr;
            const nc = curr.c + d.dc;
            if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;

            const key = `${nr},${nc}`;
            if (visited.has(key)) continue;

            const neighborTile = grid[nr][nc];
            if (!neighborTile) continue;
            if (neighborTile[d.toIdx] === 0) continue;

            visited.add(key);
            queue.push({ r: nr, c: nc });
        }
    }

    const missionBadge = document.getElementById('mission-status');
    if (found !== missionConnected) {
        missionConnected = found;
        if (found) {
            missionBadge.className = "mission-badge active";
            missionBadge.innerText = "SIGNAL ACTIVE";
            log("CONNECTION ESTABLISHED!", "success");
        } else {
            missionBadge.className = "mission-badge pending";
            missionBadge.innerText = "NO SIGNAL";
        }
    }
}

// Rendering
function drawAll() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (currentTheme === 'isometric') {
        drawAllIsometric();
        return;
    }

    const totalGridW = GRID_SIZE * CELL_SIZE;
    const totalGridH = GRID_SIZE * CELL_SIZE;
    const offX = Math.floor((canvas.width - totalGridW) / 2);
    const offY = Math.floor((canvas.height - totalGridH) / 2);

    if (CELL_SIZE > 4) {
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.moveTo(offX + i * CELL_SIZE, offY);
            ctx.lineTo(offX + i * CELL_SIZE, offY + totalGridH);
            ctx.moveTo(offX, offY + i * CELL_SIZE);
            ctx.lineTo(offX + totalGridW, offY + i * CELL_SIZE);
        }
        ctx.stroke();
    }

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const tile = grid[r][c];
            const x = offX + c * CELL_SIZE;
            const y = offY + r * CELL_SIZE;

            if (currentTheme === 'entropy' && !tile) {
                drawEntropyOnCanvas(ctx, x, y, CELL_SIZE, r, c);
            } else if (tile) {
                drawTileOnCanvas(ctx, x, y, CELL_SIZE, tile, r, c);
            }
        }
    }

    if (isMissionActive && missionStart && missionEnd) {
        drawMissionNode(missionStart.r, missionStart.c, '#8ac926', offX, offY);
        drawMissionNode(missionEnd.r, missionEnd.c, '#ff595e', offX, offY);
    }

    let showCursor = false;
    let cR = 0, cC = 0;
    if (currentMode === 'solver') {
        if (!isSolved && historyStack.length > 0) {
            const last = historyStack[historyStack.length - 1];
            cR = last.r;
            cC = last.c;
            showCursor = true;
        } else if (!isSolved && historyStack.length === 0) {
            cR = 0;
            cC = 0;
            if (currentAlgo === 'linear') showCursor = true;
        }
    } else {
        cR = selectedRow;
        cC = selectedCol;
        showCursor = true;
    }

    if (showCursor) {
        ctx.lineWidth = Math.max(1, CELL_SIZE / 15);
        if (currentMode === 'solver') {
            ctx.strokeStyle = isBacktracking ? '#FF595E' : '#FFF';
            if (grid[cR][cC] !== null && !isBacktracking) ctx.strokeStyle = '#C0C0C0';
        } else {
            ctx.strokeStyle = '#4a90e2';
        }
        ctx.strokeRect(offX + cC * CELL_SIZE, offY + cR * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
}

function drawAllIsometric() {
    const isoW = CELL_SIZE;
    const isoH = CELL_SIZE * 0.5;
    const canvasCX = canvas.width / 2;
    const canvasCY = canvas.height / 2;
    const startX = canvasCX;
    const startY = canvasCY - (GRID_SIZE * isoH) / 2;

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const x = (c - r) * isoW / 2 + startX;
            const y = (c + r) * isoH / 2 + startY;
            const cx = x;
            const cy = y;
            const tile = grid[r][c];

            ctx.beginPath();
            ctx.moveTo(cx, cy - isoH / 2);
            ctx.lineTo(cx + isoW / 2, cy);
            ctx.lineTo(cx, cy + isoH / 2);
            ctx.lineTo(cx - isoW / 2, cy);
            ctx.closePath();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.stroke();

            if (tile) {
                drawIsoTile(ctx, cx, cy, isoW, isoH, tile, r, c);
            }

            let isCursor = false;
            if (currentMode === 'solver' && !isSolved && historyStack.length > 0) {
                const last = historyStack[historyStack.length - 1];
                if (last.r === r && last.c === c) isCursor = true;
            } else if (currentMode === 'puzzle' && selectedRow === r && selectedCol === c) {
                isCursor = true;
            }

            if (isCursor) {
                ctx.strokeStyle = (currentMode === 'puzzle') ? '#4a90e2' : (isBacktracking ? '#FF595E' : '#FFF');
                if (grid[r][c] !== null && currentMode === 'solver' && !isBacktracking) ctx.strokeStyle = '#C0C0C0';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx, cy - isoH / 2);
                ctx.lineTo(cx + isoW / 2, cy);
                ctx.lineTo(cx, cy + isoH / 2);
                ctx.lineTo(cx - isoW / 2, cy);
                ctx.closePath();
                ctx.stroke();
            }
        }
    }
}

function drawIsoTile(ctx, x, y, w, h, tile, r, c) {
    let heightIndex = 0;
    if (currentSetKey === 'terrain') {
        heightIndex = Math.max(...tile);
    } else {
        heightIndex = 0;
        if (currentSetKey === 'circuit' && Math.max(...tile) > 0) heightIndex = 1;
    }
    const lift = heightIndex * 6;
    const topY = y - lift;

    if (lift > 0) {
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.moveTo(x, y + h / 2);
        ctx.lineTo(x + w / 2, y);
        ctx.lineTo(x + w / 2, topY);
        ctx.lineTo(x, topY + h / 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.moveTo(x, y + h / 2);
        ctx.lineTo(x - w / 2, y);
        ctx.lineTo(x - w / 2, topY);
        ctx.lineTo(x, topY + h / 2);
        ctx.closePath();
        ctx.fill();
    }

    ctx.beginPath();
    ctx.moveTo(x, topY - h / 2);
    ctx.lineTo(x + w / 2, topY);
    ctx.lineTo(x, topY + h / 2);
    ctx.lineTo(x - w / 2, topY);
    ctx.closePath();

    const cIdx = tile[0];
    ctx.fillStyle = activeColors[cIdx] || '#444';
    ctx.fill();

    if (lockedCells.has(`${r},${c}`)) {
        ctx.strokeStyle = '#C0C0C0';
        ctx.lineWidth = 2;
        ctx.stroke();
    } else {
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

function drawEntropyOnCanvas(context, x, y, size, r, c) {
    const candidates = ENGINE.getCandidates(r, c, grid, GRID_SIZE, currentTopology, activeTileSet);
    const count = candidates.length;
    let color = '#111';
    if (count === 0) color = '#000';
    else if (count === 1) color = '#FF595E';
    else if (count === 2) color = '#FFCA3A';
    else if (count === 3) color = '#8AC926';
    else color = '#1982C4';

    context.fillStyle = color;
    context.globalAlpha = 0.6;
    context.fillRect(x, y, size, size);
    context.globalAlpha = 1.0;

    if (size > 20) {
        context.fillStyle = '#fff';
        context.font = `bold ${Math.floor(size / 2.5)}px monospace`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(count, x + size / 2, y + size / 2);
    }
}

function drawMissionNode(r, c, color, offX, offY) {
    const x = offX + c * CELL_SIZE + CELL_SIZE / 2;
    const y = offY + r * CELL_SIZE + CELL_SIZE / 2;
    ctx.beginPath();
    ctx.arc(x, y, CELL_SIZE * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    const time = Date.now() / 500;
    const pulse = (Math.sin(time) + 1) / 2;
    ctx.beginPath();
    ctx.arc(x, y, CELL_SIZE * (0.3 + 0.1 * pulse), 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawTileOnCanvas(context, x, y, size, tile, r = -1, c = -1) {
    const cx = x + size / 2;
    const cy = y + size / 2;

    if (size < 10) {
        const cIdx = tile[0];
        context.fillStyle = activeColors[cIdx] || '#333';
        context.fillRect(x, y, size, size);
        return;
    }

    if (currentTheme === 'classic') {
        context.fillStyle = activeColors[tile[0]] || '#333';
        context.beginPath(); context.moveTo(x, y); context.lineTo(x + size, y); context.lineTo(cx, cy); context.fill();
        context.fillStyle = activeColors[tile[1]] || '#333';
        context.beginPath(); context.moveTo(x + size, y); context.lineTo(x + size, y + size); context.lineTo(cx, cy); context.fill();
        context.fillStyle = activeColors[tile[2]] || '#333';
        context.beginPath(); context.moveTo(x + size, y + size); context.lineTo(x, y + size); context.lineTo(cx, cy); context.fill();
        context.fillStyle = activeColors[tile[3]] || '#333';
        context.beginPath(); context.moveTo(x, y + size); context.lineTo(x, y); context.lineTo(cx, cy); context.fill();
    } else if (currentTheme === 'pipes' || currentTheme === 'entropy') {
        if (currentTheme === 'entropy') {
            const saved = currentTheme;
            currentTheme = 'classic';
            drawTileOnCanvas(context, x, y, size, tile);
            currentTheme = saved;
            return;
        }
        context.fillStyle = '#111';
        context.fillRect(x, y, size, size);
        context.strokeStyle = '#222';
        context.strokeRect(x, y, size, size);

        const pipeWidth = size * 0.25;
        const drawPipe = (direction, colorIdx) => {
            context.fillStyle = activeColors[colorIdx] || '#555';
            if (colorIdx === 0 && currentSetKey === 'circuit') return;
            if (direction === 0) { context.fillRect(cx - pipeWidth / 2, y, pipeWidth, size / 2); }
            else if (direction === 1) { context.fillRect(cx, cy - pipeWidth / 2, size / 2, pipeWidth); }
            else if (direction === 2) { context.fillRect(cx - pipeWidth / 2, cy, pipeWidth, size / 2); }
            else if (direction === 3) { context.fillRect(x, cy - pipeWidth / 2, size / 2, pipeWidth); }
        };
        drawPipe(0, tile[0]); drawPipe(1, tile[1]); drawPipe(2, tile[2]); drawPipe(3, tile[3]);

        let hasConnection = false;
        if (currentSetKey === 'circuit') {
            if (tile[0] || tile[1] || tile[2] || tile[3]) hasConnection = true;
        } else {
            hasConnection = true;
        }

        if (hasConnection) {
            context.fillStyle = '#333';
            context.beginPath(); context.arc(cx, cy, pipeWidth * 0.8, 0, Math.PI * 2); context.fill();
            context.fillStyle = '#666';
            context.beginPath(); context.arc(cx, cy, pipeWidth * 0.4, 0, Math.PI * 2); context.fill();
        }
    }

    if (r !== -1 && c !== -1 && lockedCells.has(`${r},${c}`)) {
        context.strokeStyle = '#C0C0C0';
        context.lineWidth = Math.max(2, size * 0.08);
        context.strokeRect(x, y, size, size);
    }
}

function initPalette() {
    const paletteContainer = document.getElementById('palette-container');
    paletteContainer.innerHTML = '';
    activeTileSet.forEach((tile, index) => {
        const btn = document.createElement('div');
        btn.className = 'palette-item';
        btn.dataset.index = index;
        const miniCan = document.createElement('canvas');
        miniCan.width = 60;
        miniCan.height = 60;
        const mCtx = miniCan.getContext('2d');
        const savedTheme = currentTheme;
        if (currentTheme === 'entropy') currentTheme = 'classic';
        if (currentTheme === 'isometric') currentTheme = 'classic';
        drawTileOnCanvas(mCtx, 0, 0, 60, tile);
        if (savedTheme === 'entropy') currentTheme = 'entropy';
        if (savedTheme === 'isometric') currentTheme = 'isometric';
        btn.appendChild(miniCan);
        btn.onclick = () => onPaletteClick(index);
        paletteContainer.appendChild(btn);
    });
    updatePaletteState();
}

function updatePaletteState() {
    const { n, w, e, s } = ENGINE.getAllNeighbors(selectedRow, selectedCol, grid, GRID_SIZE, currentTopology);
    const paletteContainer = document.getElementById('palette-container');
    const buttons = paletteContainer.children;
    for (let i = 0; i < activeTileSet.length; i++) {
        const tile = activeTileSet[i];
        const btn = buttons[i];
        let valid = true;

        // Check constraints (n[2] is South constraint of North neighbor, etc)
        // Note: engine.js getAllNeighbors returns neighbors or null.
        // n is neighbor tile, so n[2] is its south color.

        if (n && tile[0] !== n[2]) valid = false;
        if (w && tile[3] !== w[1]) valid = false;
        if (e && tile[1] !== e[3]) valid = false;
        if (s && tile[2] !== s[0]) valid = false;

        if (btn) {
            if (valid) btn.classList.remove('disabled');
            else btn.classList.add('disabled');
        }
    }
}

function onPaletteClick(tileIndex) {
    grid[selectedRow][selectedCol] = activeTileSet[tileIndex];
    lockedCells.add(`${selectedRow},${selectedCol}`);
    puzzleDirty = true;
    log(`Manually placed Locked Tile at (${selectedRow}, ${selectedCol})`);
    if (currentMode === 'puzzle') {
        selectedCol++;
        if (selectedCol >= GRID_SIZE) {
            selectedCol = 0;
            selectedRow++;
            if (selectedRow >= GRID_SIZE) selectedRow = GRID_SIZE - 1;
        }
    }
    checkMissionSuccess();
    drawAll();
    updatePaletteState();
}

function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let c, r;

    if (currentTheme === 'isometric') {
        const startX = canvas.width / 2;
        const isoW = CELL_SIZE;
        const isoH = CELL_SIZE * 0.5;
        const drawStartY = (canvas.height / 2) - (GRID_SIZE * isoH) / 2;
        const adjX = x - startX;
        const adjY = y - drawStartY;
        const u = (2 * adjX) / isoW;
        const v = (2 * adjY) / isoH;
        c = Math.floor((u + v) / 2);
        r = Math.floor((v - u) / 2);
    } else {
        const totalGridW = GRID_SIZE * CELL_SIZE;
        const totalGridH = GRID_SIZE * CELL_SIZE;
        const offX = Math.floor((canvas.width - totalGridW) / 2);
        const offY = Math.floor((canvas.height - totalGridH) / 2);
        c = Math.floor((x - offX) / CELL_SIZE);
        r = Math.floor((y - offY) / CELL_SIZE);
    }

    if (c >= 0 && c < GRID_SIZE && r >= 0 && r < GRID_SIZE) {
        selectedRow = r;
        selectedCol = c;
        drawAll();
        updatePaletteState();
    }
}

function setMode(mode) {
    currentMode = mode;
    document.getElementById('mode-solver').className = `mode-btn ${mode === 'solver' ? 'active' : ''}`;
    document.getElementById('mode-puzzle').className = `mode-btn ${mode === 'puzzle' ? 'active' : ''}`;

    const sbRight = document.getElementById('sidebar-puzzle');
    const overlay = document.getElementById('instruction-overlay');

    if (mode === 'puzzle') {
        sbRight.classList.remove('hidden');
        overlay.classList.add('visible');
        setTimeout(() => overlay.classList.remove('visible'), 3000);
        updatePaletteState();
        isRunning = false;
        cancelAnimationFrame(animationFrameId);
        updateUI();
        document.getElementById('palette-btn').classList.add('active');
    } else {
        overlay.classList.remove('visible');
        if (puzzleDirty) log("Manual edits detected. Solver will build around them.");
    }
    drawAll();
}

function togglePlayPause() {
    if (isRunning) {
        isRunning = false;
    } else {
        isRunning = true;
        if (isSolved && !isInfinite) {
            // Already solved, do nothing or reset?
            // Backup just falls through
        }
        solverStep();
    }
    updateUI();
}

function stepBack() {
    if (isRunning) {
        togglePlayPause();
    }
    if (historyStack.length === 0) return;
    const lastState = historyStack.pop();
    grid[lastState.r][lastState.c] = null;
    cursorRow = lastState.r;
    cursorCol = lastState.c;
    isSolved = false;
    checkMissionSuccess();
    drawAll();
    updateUI();
}

function updateStats() {
    const statBacktracks = document.getElementById('stat-backtracks');
    const statDepth = document.getElementById('stat-depth');
    if (statBacktracks) statBacktracks.innerText = backtrackCount;
    if (statDepth) statDepth.innerText = historyStack.length;
}

function updateUI() {
    const btnPlay = document.getElementById('btn-play-pause');
    if (isRunning) {
        btnPlay.innerHTML = "Pause ⏸";
        btnPlay.classList.add('active');
    } else {
        btnPlay.innerHTML = "Play ▶";
        btnPlay.classList.remove('active');
    }
    updateStats();
}

function log(msg, type = '') {
    const d = document.createElement('div');
    d.className = `log-entry ${type}`;
    d.innerText = `> ${msg}`;
    logBox.appendChild(d);
    logBox.scrollTop = logBox.scrollHeight;
}


// Bootstrap

function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const solverSidebar = document.getElementById('sidebar-solver');
    const puzzleSidebar = document.getElementById('sidebar-puzzle');
    const overlay = document.getElementById('mobile-overlay');
    const paletteBtn = document.getElementById('palette-btn');

    if (menuBtn && solverSidebar && overlay) {
        // Toggle Left Sidebar
        menuBtn.addEventListener('click', () => {
            solverSidebar.classList.toggle('mobile-visible');
            overlay.classList.toggle('active');
            // Close right sidebar if open
            if (puzzleSidebar && !puzzleSidebar.classList.contains('hidden')) {
                puzzleSidebar.classList.add('hidden');
            }
        });

        // Close everything when clicking overlay
        overlay.addEventListener('click', () => {
            solverSidebar.classList.remove('mobile-visible');
            if (puzzleSidebar) puzzleSidebar.classList.add('hidden');
            overlay.classList.remove('active');
        });
    }

    // Ensure Palette Button also toggles overlay on mobile
    if (paletteBtn && overlay) {
        paletteBtn.addEventListener('click', () => {
            // Check if we are in mobile view (simple check)
            if (window.innerWidth <= 768) {
                // The main logic toggles the sidebar class. We just need to sync the overlay.
                // Since this runs AFTER the main listener (assuming main listener is attached in init()),
                // we can check the state of the sidebar.
                // Actually, let's just toggle the overlay based on the sidebar state.
                setTimeout(() => {
                    if (puzzleSidebar && !puzzleSidebar.classList.contains('hidden')) {
                        overlay.classList.add('active');
                        solverSidebar.classList.remove('mobile-visible'); // Close left if open
                    } else {
                        overlay.classList.remove('active');
                    }
                }, 10);
            }
        });
    }
}

// Bootstrap
initMobileMenu();
init();
// --- Custom Tile Creator Logic ---

function initTileCreator() {
    document.querySelector('.close-modal').onclick = closeTileCreator;
    document.getElementById('cancel-custom-set-btn').onclick = closeTileCreator;
    document.getElementById('add-tile-btn').onclick = addCreatorTile;
    document.getElementById('save-custom-set-btn').onclick = saveCustomSet;
    document.getElementById('custom-palette-select').onchange = (e) => {
        creatorState.palette = e.target.value;
        const controls = document.getElementById('custom-color-controls');
        if (creatorState.palette === 'custom') {
            controls.style.display = 'flex';
            if (!creatorState.customColors || creatorState.customColors.length === 0) {
                creatorState.customColors = ['#000000', '#ffffff'];
            }
        } else {
            controls.style.display = 'none';
        }
        creatorState.selectedColorIdx = 0;
        renderEdgePalette();
        renderTileEditor();
    };

    document.getElementById('add-color-btn').addEventListener('click', () => {
        const color = document.getElementById('custom-color-picker').value;
        if (!creatorState.customColors.includes(color)) {
            creatorState.customColors.push(color);
            renderEdgePalette();
        }
    });

    document.querySelectorAll('.tile-editor .edge').forEach((el) => {
        el.onclick = (e) => {
            const edgeIdx = parseInt(e.target.dataset.edge); // 0=Top, 1=Right, 2=Bottom, 3=Left
            if (creatorState.selectedColorIdx === undefined) creatorState.selectedColorIdx = 0;

            // Validate index against current palette size
            const maxIdx = (creatorState.palette === 'custom') ? creatorState.customColors.length - 1 :
                ((creatorState.palette === 'terrain') ? DATA.COLORS_TERRAIN.length - 1 : DATA.COLORS_STD.length - 1);

            if (creatorState.selectedColorIdx > maxIdx) creatorState.selectedColorIdx = 0;

            creatorState.currentEdgeColors[edgeIdx] = creatorState.selectedColorIdx;
            renderTileEditor();
        };
    });
}

function openTileCreator(mode = 'new', existingData = null) {
    document.getElementById('custom-tile-modal').classList.add('active');

    if (mode === 'edit' && existingData) {
        creatorState = {
            tiles: JSON.parse(JSON.stringify(existingData.tiles)), // Deep copy
            currentEdgeColors: [0, 0, 0, 0],
            palette: existingData.paletteType || 'standard',
            selectedColorIdx: 0,
            customColors: existingData.customColors ? [...existingData.customColors] : ['#000000', '#ffffff']
        };
        document.getElementById('custom-set-name').value = existingData.meta.title;
        document.getElementById('custom-palette-select').value = creatorState.palette;
        // Trigger palette UI update
        const controls = document.getElementById('custom-color-controls');
        if (creatorState.palette === 'custom') {
            controls.style.display = 'flex';
        } else {
            controls.style.display = 'none';
        }
    } else {
        // New Mode
        creatorState = {
            tiles: [],
            currentEdgeColors: [0, 0, 0, 0],
            palette: 'standard',
            selectedColorIdx: 0,
            customColors: ['#000000', '#ffffff']
        };
        document.getElementById('custom-set-name').value = "MySet_" + Math.floor(Math.random() * 1000);
        document.getElementById('custom-palette-select').value = 'standard';
        document.getElementById('custom-color-controls').style.display = 'none';
    }

    renderEdgePalette();
    renderTileEditor();
    renderSetPreview();
}

function editCustomSet() {
    if (!customSetsData[currentSetKey]) return;
    openTileCreator('edit', customSetsData[currentSetKey]);
}

function closeTileCreator() {
    document.getElementById('custom-tile-modal').classList.remove('active');
}

function renderEdgePalette() {
    const container = document.getElementById('edge-palette');
    container.innerHTML = '';

    let colors;
    if (creatorState.palette === 'custom') {
        colors = creatorState.customColors;
    } else {
        colors = (creatorState.palette === 'terrain') ? DATA.COLORS_TERRAIN : DATA.COLORS_STD;
    }

    Object.keys(colors).forEach(idx => {
        const swatch = document.createElement('div');
        swatch.className = 'palette-swatch';
        swatch.style.backgroundColor = colors[idx];
        if (parseInt(idx) === creatorState.selectedColorIdx) swatch.classList.add('selected');
        swatch.onclick = () => {
            creatorState.selectedColorIdx = parseInt(idx);
            renderEdgePalette();
        };
        container.appendChild(swatch);
    });
}

function renderTileEditor() {
    let colors;
    if (creatorState.palette === 'custom') {
        colors = creatorState.customColors;
    } else {
        colors = (creatorState.palette === 'terrain') ? DATA.COLORS_TERRAIN : DATA.COLORS_STD;
    }
    const edges = document.querySelectorAll('.tile-editor .edge');
    edges[0].style.backgroundColor = colors[creatorState.currentEdgeColors[0]]; // Top
    edges[1].style.backgroundColor = colors[creatorState.currentEdgeColors[1]]; // Right
    edges[2].style.backgroundColor = colors[creatorState.currentEdgeColors[2]]; // Bottom
    edges[3].style.backgroundColor = colors[creatorState.currentEdgeColors[3]]; // Left

    // Center preview
    const center = document.querySelector('.center-preview');
    center.style.background = `conic-gradient(
        ${colors[creatorState.currentEdgeColors[0]]} 45deg 135deg, 
        ${colors[creatorState.currentEdgeColors[1]]} 135deg 225deg, 
        ${colors[creatorState.currentEdgeColors[2]]} 225deg 315deg, 
        ${colors[creatorState.currentEdgeColors[3]]} 315deg 45deg
    )`;
    // Actually conic gradient is a bit tricky for the X shape. 
    // Let's just use a simple radial or small box for now.
    center.style.background = "#222";

    // Draw visual lines for classic look
    center.innerHTML = '';
    // SVG or manual html?
    // Let's skip complex center rendering for editor, the edges are enough.
}

function addCreatorTile() {
    // Clone array
    creatorState.tiles.push([...creatorState.currentEdgeColors]);
    renderSetPreview();
}

function removeCreatorTile(idx) {
    creatorState.tiles.splice(idx, 1);
    renderSetPreview();
}

function renderSetPreview() {
    const container = document.getElementById('custom-set-preview');
    container.innerHTML = '';
    document.getElementById('preview-count').innerText = creatorState.tiles.length;

    const colors = (creatorState.palette === 'custom') ? creatorState.customColors :
        ((creatorState.palette === 'terrain') ? DATA.COLORS_TERRAIN : DATA.COLORS_STD);

    creatorState.tiles.forEach((tile, i) => {
        const item = document.createElement('div');
        item.className = 'preview-tile-item';

        const removeBtn = document.createElement('div');
        removeBtn.className = 'remove-tile';
        removeBtn.innerText = '×';
        removeBtn.onclick = (e) => { e.stopPropagation(); removeCreatorTile(i); };
        item.appendChild(removeBtn);

        // Mini canvas
        const cvs = document.createElement('canvas');
        cvs.width = 50; cvs.height = 50;
        const c = cvs.getContext('2d');

        // Simple draw
        const size = 50;
        const cx = 25, cy = 25;
        c.fillStyle = colors[tile[0]]; c.beginPath(); c.moveTo(0, 0); c.lineTo(50, 0); c.lineTo(25, 25); c.fill();
        c.fillStyle = colors[tile[1]]; c.beginPath(); c.moveTo(50, 0); c.lineTo(50, 50); c.lineTo(25, 25); c.fill();
        c.fillStyle = colors[tile[2]]; c.beginPath(); c.moveTo(50, 50); c.lineTo(0, 50); c.lineTo(25, 25); c.fill();
        c.fillStyle = colors[tile[3]]; c.beginPath(); c.moveTo(0, 50); c.lineTo(0, 0); c.lineTo(25, 25); c.fill();

        item.appendChild(cvs);
        container.appendChild(item);
    });
}

function saveCustomSet() {
    const name = document.getElementById('custom-set-name').value.trim() || 'Custom Set';
    if (creatorState.tiles.length === 0) {
        alert("Please add at least one tile.");
        return;
    }

    // sanitize name key
    const safeKey = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Check collision?
    if (DATA.SETS[safeKey]) {
        if (!confirm(`Set '${name}' already exists. Overwrite?`)) return;
    }

    // Save to DATA
    DATA.SETS[safeKey] = creatorState.tiles;
    DATA.SET_METADATA[safeKey] = {
        title: name,
        count: (creatorState.palette === 'custom') ? creatorState.customColors.length : 5,
        labels: (creatorState.palette === 'terrain') ? DATA.COLOR_NAMES_TERRAIN : null,
        palette: (creatorState.palette === 'custom') ? [...creatorState.customColors] : null
    };

    // Save to local customSetsData
    customSetsData[safeKey] = {
        tiles: creatorState.tiles,
        meta: DATA.SET_METADATA[safeKey],
        paletteType: creatorState.palette,
        customColors: (creatorState.palette === 'custom') ? creatorState.customColors : null
    };

    // DOM: Save to LocalStorage
    localStorage.setItem('wang_custom_sets', JSON.stringify(customSetsData));

    // Update Dropdown
    const optGroup = document.getElementById('custom-sets-optgroup');
    let opt = optGroup.querySelector(`option[value="${safeKey}"]`);
    if (!opt) {
        opt = document.createElement('option');
        opt.value = safeKey;
        opt.innerText = name;
        optGroup.appendChild(opt);
    }

    // Select the new option
    document.getElementById('tile-set-select').value = safeKey;
    changeTileSet(safeKey);

    closeTileCreator();
    log(`Custom set '${name}' saved and activated.`, 'success');
}

function loadCustomSets() {
    try {
        const stored = localStorage.getItem('wang_custom_sets');
        if (stored) {
            customSetsData = JSON.parse(stored);
            const optGroup = document.getElementById('custom-sets-optgroup');
            optGroup.innerHTML = ''; // Clear current

            Object.entries(customSetsData).forEach(([key, data]) => {
                // Restore to run-time DATA
                DATA.SETS[key] = data.tiles;
                DATA.SET_METADATA[key] = data.meta;

                // Add to dropdown
                const opt = document.createElement('option');
                opt.value = key;
                opt.innerText = data.meta.title;
                optGroup.appendChild(opt);
            });
            if (Object.keys(customSetsData).length > 0) {
                log(`Loaded ${Object.keys(customSetsData).length} custom sets.`, 'info');
            }
        }
    } catch (e) {
        console.error("Failed to load custom sets:", e);
        log("Error loading custom sets.", 'error');
    }
}
