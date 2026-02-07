# Wang Tiling Laboratory - Project Roadmap

This document serves as a comprehensive overview of the current feature set and a plan for future development.

## ✅ Current Features

### Core Algorithms
- **Wave Function Collapse (WFC)**: A constraint-based procedural generation algorithm that uses entropy minimization to solve the grid. It ensures that all placed tiles match the edges of their neighbors. [Status: Completed - 02-07-2026 12:07:56]
- **Linear Scan**: A simpler, scanline-based approach that fills the grid row by row. Useful for comparing performance and generation quality against WFC. [Status: Completed - 02-07-2026 12:07:56]

### Topology Support
- **Plane (Flat)**: Standard 2D grid where edges are boundaries. [Status: Completed - 02-07-2026 12:07:56]
- **Infinite Torus**: Wraps edges (Top-Bottom, Left-Right) to create seamless tiling patterns that loop around the screen. [Status: Completed - 02-07-2026 12:07:56]

### Visualization & Rendering
- **Classic 2D View**: Traditional top-down representation using standard Wang tiles with color-coded edges. [Status: Completed - 02-07-2026 12:07:56]
- **Pipes / Circuit View**: Visualizes connections as a network of pipes or wires, great for seeing connectivity logic. [Available in 'Mission' and 'Circuit' modes] [Status: Completed - 02-07-2026 12:07:56]
- **Entropy Heatmap**: Displays the internal "thought process" of the solver, coloring cells based on the number of remaining possible tile options (entropy). [Status: Completed - 02-07-2026 12:07:56]
- **Isometric Projection (2.5D)**: A pseudo-3D view that adds depth and perspective to the grid, making the tiling patterns appear as stacked blocks. [Status: Completed - 02-07-2026 12:07:56]

### Interactive Modes
- **AI Solver**: The primary mode where the algorithm solves the grid step-by-step or automatically. [Status: Completed - 02-07-2026 12:07:56]
- **Puzzle Mode**: A manual interaction mode where users can select tiles from a palette and place them on the grid, subject to strict validity checks. [Status: Completed - 02-07-2026 12:07:56]
- **Mission Mode**: A gamified mode where the objective is to connect a start node (Green) to an end node (Red) using pipe tiles. [Status: Completed - 02-07-2026 12:07:56]
- **Infinite Loop**: A dynamic "screensaver" style mode where the grid continuously regenerates parts of itself after completion, creating an endless evolving pattern. [Status: Completed - 02-07-2026 12:07:56]

### Simulation Controls
- **Grid Configuration**: Adjustable grid size slider (from 5x5 up to 100x100). [Status: Completed - 02-07-2026 12:07:56]
- **Speed Control**: Variable simulation speed slider to watch the process in slow motion or turbo. [Status: Completed - 02-07-2026 12:07:56]
- **Playback Controls**: Play, Pause, Step Forward, and Step Back (undo history). [Status: Completed - 02-07-2026 12:07:56]
- **Backtracking System**: Robust solver that can backtrack when it hits a dead-end, preventing the generation from locking up. [Status: Completed - 02-07-2026 12:07:56]
- **Seeded Generation**: Input specific text seeds to reproduce exact layouts, or generalize random seeds. [Status: Completed - 02-07-2026 12:07:56]

### Customization
- **Tile Sets**:
    - **Standard**: Basic color matching (4 colors). [Status: Completed - 02-07-2026 12:07:56]
    - **Circuit**: Logic gates and wires style (2 weights). [Status: Completed - 02-07-2026 12:07:56]
    - **Terrain**: Map-like generation with Water, Sand, Grass, Forest, Mountain. [Status: Completed - 02-07-2026 12:07:56]
    - **Aperiodic**: Special tile set designed to avoid repeating patterns. [Status: Completed - 02-07-2026 12:07:56]
- **Biome Weights**: Fine-tune the probability of specific colors, terrains, or components appearing in the generation. [Status: Completed - 02-07-2026 12:07:56]

### Persistence
- **Save/Load System**: Export the entire grid state and configuration to a JSON file and reload it later to resume work. [Status: Completed - 02-07-2026 12:07:56]
- **Snapshot Export**: High-resolution PNG download of the current grid state. [Status: Completed - 02-07-2026 12:07:56]

### User Interface & Experience
- **Mobile Optimization**: Responsive layout optimized for smartphones and tablets. Features collapsible sidebars, touch-friendly buttons, and maximized canvas area. [Status: Completed - 02-07-2026 12:07:56]

---

## 🚀 Future Updates / To-Be-Implemented

*Use this section to track planned features, ideas, and upcoming improvements.*

- [ ] **Custom Tile Creator**: In-app editor to design custom tile edge constraints and colors.
- [ ] **Heuristic Improvements**: Advanced variable ordering (e.g., Min-Conflicts) for even faster WFC convergence.
- [ ] **3D Layering**: Multi-layer grid support (3D Wang Cubes).
- [ ] **Export to OBJ/GLTF**: Export the generated 3D mesh for use in other 3D software.
