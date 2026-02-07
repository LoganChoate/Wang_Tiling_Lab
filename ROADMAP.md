# Wang Tiling Laboratory - Project Roadmap

This document serves as a comprehensive overview of the current feature set and a plan for future development.

## ✅ Current Features (Status: Completed as of 2026-02-07)

### Core Algorithms
- **Wave Function Collapse (WFC)**: A constraint-based procedural generation algorithm that uses entropy minimization to solve the grid. It ensures that all placed tiles match the edges of their neighbors.
- **Linear Scan**: A simpler, scanline-based approach that fills the grid row by row. Useful for comparing performance and generation quality against WFC.

### Topology Support
- **Plane (Flat)**: Standard 2D grid where edges are boundaries.
- **Infinite Torus**: Wraps edges (Top-Bottom, Left-Right) to create seamless tiling patterns that loop around the screen.

### Visualization & Rendering
- **Classic 2D View**: Traditional top-down representation using standard Wang tiles with color-coded edges.
- **Pipes / Circuit View**: Visualizes connections as a network of pipes or wires, great for seeing connectivity logic. [Available in 'Mission' and 'Circuit' modes]
- **Entropy Heatmap**: Displays the internal "thought process" of the solver, coloring cells based on the number of remaining possible tile options (entropy).
- **Isometric Projection (2.5D)**: A pseudo-3D view that adds depth and perspective to the grid, making the tiling patterns appear as stacked blocks.

### Interactive Modes
- **AI Solver**: The primary mode where the algorithm solves the grid step-by-step or automatically.
- **Puzzle Mode**: A manual interaction mode where users can select tiles from a palette and place them on the grid, subject to strict validity checks.
- **Mission Mode**: A gamified mode where the objective is to connect a start node (Green) to an end node (Red) using pipe tiles.
- **Infinite Loop**: A dynamic "screensaver" style mode where the grid continuously regenerates parts of itself after completion, creating an endless evolving pattern.

### Simulation Controls
- **Grid Configuration**: Adjustable grid size slider (from 5x5 up to 100x100).
- **Speed Control**: Variable simulation speed slider to watch the process in slow motion or turbo.
- **Playback Controls**: Play, Pause, Step Forward, and Step Back (undo history).
- **Backtracking System**: Robust solver that can backtrack when it hits a dead-end, preventing the generation from locking up.
- **Seeded Generation**: Input specific text seeds to reproduce exact layouts, or generalize random seeds.

### Customization
- **Tile Sets**:
    - **Standard**: Basic color matching (4 colors).
    - **Circuit**: Logic gates and wires style (2 weights).
    - **Terrain**: Map-like generation with Water, Sand, Grass, Forest, Mountain.
    - **Aperiodic**: Special tile set designed to avoid repeating patterns.
- **Biome Weights**: Fine-tune the probability of specific colors, terrains, or components appearing in the generation.

### Persistence
- **Save/Load System**: Export the entire grid state and configuration to a JSON file and reload it later to resume work.
- **Snapshot Export**: High-resolution PNG download of the current grid state.

---

## 🚀 Future Updates / To-Be-Implemented

*Use this section to track planned features, ideas, and upcoming improvements.*

- [ ] **Mobile Optimization**: Improve UI layout for smaller touch screens.
- [ ] **Custom Tile Creator**: In-app editor to design custom tile edge constraints and colors.
- [ ] **Heuristic Improvements**: Advanced variable ordering (e.g., Min-Conflicts) for even faster WFC convergence.
- [ ] **3D Layering**: Multi-layer grid support (3D Wang Cubes).
- [ ] **Export to OBJ/GLTF**: Export the generated 3D mesh for use in other 3D software.
