// Random Number Generator
export function seedPRNG(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = h << 13 | h >>> 19;
    }
    return function () {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h >>> 0) / 4294967296;
    }
}

export function getAllNeighbors(r, c, grid, gridSize, topology) {
    let n = null, s = null, w = null, e = null;
    if (topology === 'plane') {
        if (r > 0) n = grid[r - 1][c];
        if (c > 0) w = grid[r][c - 1];
        if (r < gridSize - 1) s = grid[r + 1][c];
        if (c < gridSize - 1) e = grid[r][c + 1];
    } else {
        const nR = (r - 1 + gridSize) % gridSize;
        const sR = (r + 1) % gridSize;
        const wC = (c - 1 + gridSize) % gridSize;
        const eC = (c + 1) % gridSize;
        n = grid[nR][c];
        s = grid[sR][c];
        w = grid[r][wC];
        e = grid[r][eC];
    }
    return { n, w, s, e };
}

export function getCandidates(r, c, grid, gridSize, topology, tileSet) {
    const { n, w, e, s } = getAllNeighbors(r, c, grid, gridSize, topology);
    const nConstraint = n ? n[2] : null;
    const wConstraint = w ? w[1] : null;
    const eConstraint = e ? e[3] : null;
    const sConstraint = s ? s[0] : null;
    let candidates = [];
    for (let i = 0; i < tileSet.length; i++) {
        const t = tileSet[i];
        if (nConstraint !== null && t[0] !== nConstraint) continue;
        if (wConstraint !== null && t[3] !== wConstraint) continue;
        if (eConstraint !== null && t[1] !== eConstraint) continue;
        if (sConstraint !== null && t[2] !== sConstraint) continue;
        candidates.push(i);
    }
    return candidates;
}

export function checkLookahead(r, c, candidateIndex, grid, gridSize, topology, tileSet) {
    grid[r][c] = tileSet[candidateIndex];
    const neighbors = [];
    if (topology === 'plane') {
        if (r > 0) neighbors.push({ r: r - 1, c: c });
        if (c > 0) neighbors.push({ r: r, c: c - 1 });
        if (r < gridSize - 1) neighbors.push({ r: r + 1, c: c });
        if (c < gridSize - 1) neighbors.push({ r: r, c: c + 1 });
    } else {
        neighbors.push({ r: (r - 1 + gridSize) % gridSize, c: c });
        neighbors.push({ r: (r + 1) % gridSize, c: c });
        neighbors.push({ r: r, c: (c - 1 + gridSize) % gridSize });
        neighbors.push({ r: r, c: (c + 1) % gridSize });
    }
    let isValid = true;
    for (const n of neighbors) {
        if (grid[n.r][n.c] === null) {
            const cands = getCandidates(n.r, n.c, grid, gridSize, topology, tileSet);
            if (cands.length === 0) { isValid = false; break; }
        }
    }
    grid[r][c] = null;
    return isValid;
}

export function findMinEntropyCell(grid, gridSize, topology, tileSet, rand) {
    let minCandidates = 999;
    let candidates = [];

    const startR = Math.floor(rand() * gridSize);
    const startC = Math.floor(rand() * gridSize);

    for (let i = 0; i < gridSize * gridSize; i++) {
        const idx = (i + startR * gridSize + startC) % (gridSize * gridSize);
        const r = Math.floor(idx / gridSize);
        const c = idx % gridSize;

        if (grid[r][c] === null) {
            const cands = getCandidates(r, c, grid, gridSize, topology, tileSet);
            const count = cands.length;

            if (count < minCandidates) {
                minCandidates = count;
                candidates = [{ r, c, count }]; // New best
            } else if (count === minCandidates) {
                candidates.push({ r, c, count }); // Add to ties
            }
        }
    }

    if (minCandidates === 999) return null; // Full
    if (minCandidates <= 1) return candidates[0]; // Optimization: fast collapse

    // HEURISTIC: Degree Heuristic (Most constrained neighbors)
    // Among candidates with equal (min) entropy, pick the one with the MOST uncollapsed neighbors.
    // This propagates constraints faster.

    // Sort candidates by uncollapsed neighbors (Descending)
    // Only worth calculating if we have ties
    if (candidates.length > 1) {
        let maxDegree = -1;
        let bestDegreeCandidates = [];

        for (const cand of candidates) {
            let degree = 0;
            const neighbors = getAllNeighbors(cand.r, cand.c, grid, gridSize, topology);
            if (neighbors.n && neighbors.n[0] === undefined && neighbors.n !== null) degree++; // It's a tile array? No it's grid cell. Grid cell is null if uncollapsed.
            // Wait, neighbors returns the content of the cell.
            // grid[r][c] is null if uncollapsed.
            // neighbors.n is the value of grid[r-1][c].
            if (neighbors.n === null) degree++;
            if (neighbors.s === null) degree++;
            if (neighbors.w === null) degree++;
            if (neighbors.e === null) degree++;

            if (degree > maxDegree) {
                maxDegree = degree;
                bestDegreeCandidates = [cand];
            } else if (degree === maxDegree) {
                bestDegreeCandidates.push(cand);
            }
        }
        candidates = bestDegreeCandidates;
    }

    // Weighted Random Tie-Breaker
    return candidates[Math.floor(rand() * candidates.length)];
}

export function getWeightedRandomCandidate(candidates, tileSet, weights, rand) {
    if (candidates.length === 0) return -1;
    let scores = candidates.map(idx => {
        const t = tileSet[idx];
        let w = 0;
        w += weights[t[0]] || 1;
        w += weights[t[1]] || 1;
        w += weights[t[2]] || 1;
        w += weights[t[3]] || 1;
        return Math.max(1, w);
    });
    const totalScore = scores.reduce((a, b) => a + b, 0);
    let r = rand() * totalScore;
    for (let i = 0; i < candidates.length; i++) {
        r -= scores[i];
        if (r <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
}

/**
 * Solves the grid using Wave Function Collapse with Backtracking.
 * @param {number} size - Grid size.
 * @param {string} topology - 'plane' or 'torus'.
 * @param {Array} tileSet - Array of tiles.
 * @param {object} options - { maxBacktracks, seed }.
 * @returns {object} { grid, success, steps, time, backtracks }
 */
export function solveWFC(size, topology, tileSet, options = {}) {
    const start = performance.now();
    const maxBacktracks = options.maxBacktracks || 10000;
    const rand = seedPRNG(options.seed || Math.random().toString());

    // Initialize Grid
    let grid = Array.from({ length: size }, () => Array(size).fill(null));

    // Stack for backtracking: { r, c, choices, choiceIdx }
    // choices is a shuffled array of candidate indices for that cell.
    let stack = [];

    let steps = 0;
    let backtracks = 0;

    // Initial Step: Find first cell
    let currentCell = findMinEntropyCell(grid, size, topology, tileSet, rand);

    if (!currentCell) {
        // Already full?
        return { grid, success: true, steps, time: performance.now() - start, backtracks };
    }

    // Prepare first stack frame
    let firstCandidates = getCandidates(currentCell.r, currentCell.c, grid, size, topology, tileSet);
    // Shuffle candidates to ensure randomness
    shuffleArray(firstCandidates, rand);

    stack.push({
        r: currentCell.r,
        c: currentCell.c,
        choices: firstCandidates,
        choiceIdx: 0
    });

    while (stack.length > 0) {
        if (backtracks > maxBacktracks) {
            return { grid, success: false, steps, time: performance.now() - start, backtracks };
        }

        let frame = stack[stack.length - 1];

        // If we exhausted choices for this cell, backtrack
        if (frame.choiceIdx >= frame.choices.length) {
            grid[frame.r][frame.c] = null; // Reset
            stack.pop();
            backtracks++;
            continue;
        }

        // Apply choice
        let tileIdx = frame.choices[frame.choiceIdx];
        grid[frame.r][frame.c] = tileSet[tileIdx];
        frame.choiceIdx++;
        steps++;
        let nextCell = findMinEntropyCell(grid, size, topology, tileSet, rand);
        if (!nextCell) {
            return { grid, success: true, steps, time: performance.now() - start, backtracks };
        }
        let nextCandidates = getCandidates(nextCell.r, nextCell.c, grid, size, topology, tileSet);
        if (nextCandidates.length === 0) {
            continue;
        }

        // OPTIMIZATION: 1-Step Lookahead (Arc Consistency)
        const validCandidates = [];
        for (const candIdx of nextCandidates) {
            if (checkLookahead(nextCell.r, nextCell.c, candIdx, grid, size, topology, tileSet)) {
                validCandidates.push(candIdx);
            }
        }

        if (validCandidates.length === 0) {
            continue; // All candidates lead to immediate death -> backtrack
        }

        // OPTIMIZATION: Least Constraining Value (LCV) Heuristic
        const candidateScores = validCandidates.map(candIdx => {
            grid[nextCell.r][nextCell.c] = tileSet[candIdx];
            let freedom = 0;

            // Calculate "freedom" (sum of valid options for all neighbors)
            const coords = [];
            if (topology === 'plane') {
                if (nextCell.r > 0) coords.push({ r: nextCell.r - 1, c: nextCell.c });
                if (nextCell.r < size - 1) coords.push({ r: nextCell.r + 1, c: nextCell.c });
                if (nextCell.c > 0) coords.push({ r: nextCell.r, c: nextCell.c - 1 });
                if (nextCell.c < size - 1) coords.push({ r: nextCell.r, c: nextCell.c + 1 });
            } else {
                const gridSize = size;
                coords.push({ r: (nextCell.r - 1 + gridSize) % gridSize, c: nextCell.c });
                coords.push({ r: (nextCell.r + 1) % gridSize, c: nextCell.c });
                coords.push({ r: (nextCell.c - 1 + gridSize) % gridSize, c: nextCell.c });
                coords.push({ r: (nextCell.c + 1) % gridSize, c: nextCell.c });
            }

            for (const coord of coords) {
                if (grid[coord.r][coord.c] === null) {
                    const opts = getCandidates(coord.r, coord.c, grid, size, topology, tileSet);
                    freedom += opts.length;
                }
            }

            grid[nextCell.r][nextCell.c] = null; // Backtrack
            return { idx: candIdx, score: freedom + rand() * 0.001 }; // Add small random jitter to break ties
        });

        // Sort descending (higher freedom is better)
        candidateScores.sort((a, b) => b.score - a.score);

        const sortedCandidates = candidateScores.map(x => x.idx);

        stack.push({
            r: nextCell.r,
            c: nextCell.c,
            choices: sortedCandidates,
            choiceIdx: 0
        });
    }
    return { grid, success: false, steps, time: performance.now() - start, backtracks };
}

export function solveWFC(size, topology, tileSet, options = {}) {
    const maxRetries = options.maxRetries ?? 10;
    let totalSteps = 0;
    let totalBacktracks = 0;
    let totalTime = 0;

    for (let i = 0; i < maxRetries; i++) {
        // If options.seed is provided, we should probably ONLY run once unless we mutate the seed.
        // If the user specifically accepted a seed, they might expect deterministic output.
        // However, for "solving", we usually want success.
        // Let's modify the seed for retries if one was provided.
        const runOptions = { ...options };
        if (i > 0) {
            runOptions.seed = (options.seed || Math.random().toString()) + "_" + i;
        }

        const result = solveSingleWFC(size, topology, tileSet, runOptions);
        totalSteps += result.steps;
        totalBacktracks += result.backtracks;
        totalTime += result.time;

        if (result.success) {
            result.steps = totalSteps;
            result.backtracks = totalBacktracks;
            result.time = totalTime;
            return result; // Success!
        }
    }

    // Failed after retries
    return {
        grid: Array.from({ length: size }, () => Array(size).fill(null)),
        success: false,
        steps: totalSteps,
        time: totalTime,
        backtracks: totalBacktracks
    };
}

// Helper: Fisher-Yates shuffle
function shuffleArray(array, rand) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}