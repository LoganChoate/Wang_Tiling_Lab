# Wang Tiling Laboratory

A powerful browser-based logic simulation and procedural generation tool based on **Wang Tiles** and the **Wave Function Collapse (WFC)** algorithm. Explore the beauty of constraint-based tiling patterns in real-time.

## 🚀 Overview
This project serves as an interactive laboratory for experimenting with procedural generation. It features a custom implementation of the WFC algorithm (entropy-based) to create consistent, non-periodic patterns. Whether you are interested in the math behind the tiles or just want to build cool pipe networks, this lab has something for you.

## ✨ Key Features
*   **Algorithms**:
    *   **Wave Function Collapse (WFC)**: Entropy-based generation that solves constraints globally.
    *   **Linear Scan**: A simpler, scanline approach for comparison.
*   **Visualization Modes**:
    *   **Classic 2D**: Standard Wang tiles with color-coded edges.
    *   **Pipes / Circuit**: Visualize connections as a pipe network.
    *   **Isometric**: A stunning 2.5D projection for adding depth to the grid.
    *   **Entropy View**: See the solver's "thought process" with a heatmap of remaining possibilities.
*   **Robust Logic**:
    *   Backtracking solver with lookahead constraints to prevent dead-ends.
    *   Configurable grid size, seed control, and topology (Plane vs. Torus).

## 🎮 Game Modes
1.  **AI Solver**: Watch the algorithm build the grid tile by tile.
2.  **Puzzle Mode**: Manually place tiles and challenge yourself to find a valid configuration.
3.  **Mission Mode**: Connect a signal from a start node to an end node using the pipe tiles.
4.  **Infinite Loop**: A "living" mode where the grid continuously regenerates and decays.

## 🛠️ Technical Stack
*   **Vanilla JavaScript** (ES6 Modules) - No frameworks, just pure logic.
*   **HTML5 Canvas** - High-performance rendering for the grid.
*   **CSS3 Variables** - Theming and responsive layout.

## 🏃‍♀️ How to Run
No build step or server is required!
1.  Clone or download this repository.
2.  Simply open `index.html` in any modern web browser.
3.  Enjoy!

## 💾 Persistence
*   **Save/Load**: Export your grid state to JSON and load it back anytime.
*   **Snapshots**: Download high-resolution PNG images of your creations.

---
*Created by Logan Choate*