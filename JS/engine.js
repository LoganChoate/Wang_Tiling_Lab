// Random Number Generator
export function seedPRNG(str) {
    let h = 1779033703 ^ str.length;
    for(let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = h << 13 | h >>> 19;
    }
    return function() {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h >>> 0) / 4294967296;
    }
}

export function getAllNeighbors(r, c, grid, gridSize, topology) {
    let n = null, s = null, w = null, e = null;
    if (topology === 'plane') {
        if (r > 0) n = grid[r-1][c];
        if (c > 0) w = grid[r][c-1];
        if (r < gridSize - 1) s = grid[r+1][c];
        if (c < gridSize - 1) e = grid[r][c+1];
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
    for(let i=0; i<tileSet.length; i++) {
        const t = tileSet[i];
        if(nConstraint !== null && t[0] !== nConstraint) continue;
        if(wConstraint !== null && t[3] !== wConstraint) continue;
        if(eConstraint !== null && t[1] !== eConstraint) continue;
        if(sConstraint !== null && t[2] !== sConstraint) continue;
        candidates.push(i);
    }
    return candidates;
}

export function checkLookahead(r, c, candidateIndex, grid, gridSize, topology, tileSet) {
    grid[r][c] = tileSet[candidateIndex];
    const neighbors = [];
    if (topology === 'plane') {
        if (r > 0) neighbors.push({r: r-1, c: c});
        if (c > 0) neighbors.push({r: r, c: c-1});
        if (r < gridSize - 1) neighbors.push({r: r+1, c: c});
        if (c < gridSize - 1) neighbors.push({r: r, c: c+1});
    } else {
        neighbors.push({r: (r - 1 + gridSize) % gridSize, c: c});
        neighbors.push({r: (r + 1) % gridSize, c: c});
        neighbors.push({r: r, c: (c - 1 + gridSize) % gridSize});
        neighbors.push({r: r, c: (c + 1) % gridSize});
    }
    let isValid = true;
    for(const n of neighbors) {
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
    let bestCell = null;
    const startR = Math.floor(rand() * gridSize);
    const startC = Math.floor(rand() * gridSize);
    for (let i = 0; i < gridSize * gridSize; i++) {
        const idx = (i + startR * gridSize + startC) % (gridSize * gridSize);
        const r = Math.floor(idx / gridSize);
        const c = idx % gridSize;
        if (grid[r][c] === null) {
            const cands = getCandidates(r, c, grid, gridSize, topology, tileSet);
            if (cands.length < minCandidates) {
                minCandidates = cands.length;
                bestCell = { r, c, count: cands.length };
            }
            if (minCandidates <= 1) return bestCell;
        }
    }
    return bestCell;
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
    for(let i=0; i<candidates.length; i++) {
        r -= scores[i];
        if (r <= 0) return candidates[i];
    }
    return candidates[candidates.length-1];
}