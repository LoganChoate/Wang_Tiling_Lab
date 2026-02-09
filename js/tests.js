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
        const tileSet = DATA.SETS[tileSetKey];
        // Use the new backtracking solver
        // We can pass maxBacktracks if needed, default is 10000 which is good.
        // For benchmarks, maybe lower to keep it snappy? 5000? 
        const result = ENGINE.solveWFC(size, topology, tileSet, {
            maxBacktracks: 10000,
            seed: Math.random().toString()
        });

        return result;
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

    /**
     * Run a comprehensive stress test across multiple sizes and sets.
     * @param {Array} specificSizes - Optional array of sizes to run [20, 50]. If null, runs all.
     */
    async runStressTest(specificSizes = null) {
        let scenarios = [
            { size: 20, iters: 50 },
            { size: 50, iters: 50 },
            { size: 75, iters: 20 },
            { size: 100, iters: 20 }
        ];

        if (specificSizes) {
            scenarios = scenarios.filter(s => specificSizes.includes(s.size));
        }

        const sets = ['standard', 'circuit', 'terrain', 'aperiodic'];
        const suiteResults = {};

        for (const setKey of sets) {
            suiteResults[setKey] = {};
            for (const scen of scenarios) {
                console.log(`Running Stress Test: Set=${setKey}, Size=${scen.size}, Iters=${scen.iters}`);
                const res = await this.runBatch(scen.iters, scen.size, setKey);
                suiteResults[setKey][`size_${scen.size}`] = res.stats;
                // Yield to UI
                await new Promise(r => setTimeout(r, 100));
            }
        }

        return suiteResults;
    }
}
