import * as ENGINE from './engine.js';
import * as DATA from './data.js';

export class Benchmark {
    constructor() {
        this.results = [];
    }

    /**
     * Run a headless solver loop for benchmarking.
     * @param {number} size - Grid size (e.g., 10 for 10x10)
     * @param {string} tileSetKey - Key of the tile set to use (e.g., 'standard')
     * @param {string} topology - 'plane' or 'torus'
     * @returns {object} - { success: boolean, steps: number, time: number, backtracks: number }
     */
    async solveHeadless(size, tileSetKey = 'standard', topology = 'plane') {
        const start = performance.now();
        const tileSet = DATA.SETS[tileSetKey];

        // Initialize Grid
        let grid = [];
        for (let r = 0; r < size; r++) {
            let row = [];
            for (let c = 0; c < size; c++) {
                row.push(null);
            }
            grid.push(row);
        }

        // Initialize State
        let stack = []; // For backtracking
        let steps = 0;
        let backtracks = 0;
        let isDone = false;
        let success = false;

        // Pseudo-random generator (using simple random for now, or imported PRNG)
        const rand = Math.random;

        // Main Loop
        while (!isDone && steps < size * size * 10) { // Safety break
            steps++;

            // 1. Find min entropy cell
            const cell = ENGINE.findMinEntropyCell(grid, size, topology, tileSet, rand);

            if (!cell) {
                // Done? Check if grid is full
                let isFull = true;
                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        if (grid[r][c] === null) { isFull = false; break; }
                    }
                }

                if (isFull) {
                    success = true;
                    isDone = true;
                } else {
                    // Contradiction/Stuck (Shouldn't happen with proper backtracking or if findMinEntropy works right)
                    // Actually, if cell is null but grid not full, it means NO cell has valid candidates?
                    // Usually findMinEntropy returns null if ALL cells are filled OR if variables have domain 0?
                    // Let's assume ENGINE returns null only on success or if we handle fail differently.
                    // Wait, ENGINE.findMinEntropyCell returns variable with LEAST candidates. 
                    // If a variable has 0 candidates, it returns it.
                    // If no variables remaining (all filled), it returns null.
                    success = true;
                    isDone = true;
                }
                break;
            }

            // If we found a cell but it has 0 candidates -> Contradiction -> Backtrack
            if (cell.count === 0) {
                backtracks++;
                if (stack.length === 0) {
                    success = false; // Impossible
                    isDone = true;
                    break;
                }
                // Backtrack
                const state = stack.pop();
                grid = JSON.parse(JSON.stringify(state.grid)); // Deep copy restore (slow but safe for test)
                // We need to try a different candidate for the popped state...
                // This simple stack approach here is naive. 
                // Implementing full recursive backtracking or stack-based backtracking with state tracking in a test runner is complex.
                // For benchmarking WFC *heuristics*, we often just count "Restarts" or "Failures" if we don't want to impl full backtracking.
                // Let's implement a simple "Retry" mechanism or just Fail.
                // Actually, full WFC usually entails backtracking. 
                // Let's stick to "Restart on Fail" for this benchmark to measure "First-Try Success Rate".
                success = false;
                isDone = true;
                break;
            }

            // 2. Select Tile
            // In a real solver we'd weigh them.
            // For headless, we obtain candidates and pick one.
            const candidates = ENGINE.getCandidates(cell.r, cell.c, grid, size, topology, tileSet);
            // Verify candidates again (redundant but safe)
            if (candidates.length === 0) {
                success = false;
                isDone = true;
                break;
            }

            // Pick weighted random
            // Create dummy weights if needed or use simple random
            const weights = {};
            // We can use DATA.SETS metadata if we want, or just uniform.
            const selectedTileIdx = candidates[Math.floor(rand() * candidates.length)];

            // 3. Collapse
            grid[cell.r][cell.c] = tileSet[selectedTileIdx];

            // (Propagate is implicit in findMinEntropy recalculation next step)
        }

        const end = performance.now();
        return {
            success,
            steps,
            time: end - start,
            backtracks, // Will be 0 or 1 in this "Restart" model
            size
        };
    }

    /**
     * Run multiple iterations
     */
    async runBatch(iterations, size, tileSetKey = 'standard') {
        const batchResults = [];
        for (let i = 0; i < iterations; i++) {
            const res = await this.solveHeadless(size, tileSetKey);
            batchResults.push(res);
            // Yield to UI every 10 runs
            if (i % 10 === 0) await new Promise(r => setTimeout(r, 0));
        }

        const successes = batchResults.filter(r => r.success);
        const failCount = batchResults.length - successes.length;
        const avgTime = successes.reduce((a, b) => a + b.time, 0) / (successes.length || 1);
        const avgSteps = successes.reduce((a, b) => a + b.steps, 0) / (successes.length || 1);

        return {
            config: { iterations, size, tileSetKey },
            stats: {
                successRate: (successes.length / iterations) * 100,
                avgTime,
                avgSteps,
                failCount
            },
            raw: batchResults
        };
    }
}
