:root { --bg-color: #1a1a1a; --text-color: #e0e0e0; --panel-bg: #2a2a2a; --accent: #4a90e2; --accent-hover: #357abd; --danger: #ff595e; --success: #8ac926; --disabled: #555; --locked: #C0C0C0; }
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: var(--bg-color); color: var(--text-color); margin: 0; display: flex; flex-direction: column; align-items: center; height: 100vh; overflow: hidden; }
header { width: 100%; padding: 1rem 2rem; background-color: var(--panel-bg); box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; z-index: 10; flex-shrink: 0; }
h1 { margin: 0; font-size: 1.2rem; font-weight: 400; letter-spacing: 1px; }
.header-controls { display: flex; gap: 10px; align-items: center; }
.control-select, .control-input { background: #111; color: #aaa; border: 1px solid #444; padding: 5px 10px; border-radius: 4px; font-size: 0.85rem; cursor: pointer; transition: border 0.2s; }
.control-select:hover, .control-input:focus { border-color: var(--accent); color: white; }
.control-input { width: 80px; cursor: text; }
.icon-btn { background: #333; border: 1px solid #444; color: #fff; width: 32px; height: 32px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.icon-btn:hover { background: var(--accent); border-color: var(--accent); }
.icon-btn.active { background: var(--accent); border-color: var(--accent); }
.mode-switch { display: flex; background: #111; border-radius: 20px; padding: 3px; margin-left: 10px; }
.mode-btn { background: transparent; color: #888; border: none; padding: 6px 15px; border-radius: 17px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
.mode-btn.active { background: var(--accent); color: white; font-weight: 600; }
.mission-badge { background: #444; color: #fff; padding: 5px 12px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; display: none; align-items: center; gap: 5px; border: 1px solid #666; }
.mission-badge.active { display: flex; background: var(--success); border-color: var(--success); }
.mission-badge.pending { display: flex; background: #e63946; border-color: #e63946; }
.main-layout { display: flex; flex: 1; width: 100%; height: 100%; overflow: hidden; position: relative; }
.sidebar-left { width: 280px; background: rgba(0,0,0,0.2); padding: 20px; display: flex; flex-direction: column; border-right: 1px solid #333; overflow-y: auto; flex-shrink: 0; }
.control-group { margin-bottom: 20px; background: var(--panel-bg); padding: 15px; border-radius: 8px; }
.group-title { font-size: 0.75rem; text-transform: uppercase; color: #888; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; letter-spacing: 1px; }
button.action-btn { width: 100%; background-color: #444; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; margin-bottom: 8px; transition: 0.2s; text-align: center; font-size: 0.85rem; }
button.action-btn:hover:not(:disabled) { background-color: var(--accent); }
button.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
button.primary { background-color: var(--accent); }
button.primary:hover:not(:disabled) { background-color: var(--accent-hover); }
button.toggle-btn { background-color: #333; color: #aaa; border: 1px solid #555; }
button.toggle-btn.active { background-color: var(--success); color: white; border-color: var(--success); }
.slider-row { display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; color: #aaa; margin-bottom: 5px; }
input[type="range"] { width: 60%; accent-color: var(--accent); }
.biome-slider-container { margin-top: 5px; }
.biome-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 0.8rem; }
.biome-color { width: 12px; height: 12px; border-radius: 2px; }
.biome-name { flex: 1; color: #ccc; }
.biome-val { width: 25px; text-align: right; color: #888; font-family: monospace; }
.stats-panel { font-family: 'Courier New', monospace; font-size: 0.8rem; color: #888; margin-bottom: 15px; display: flex; justify-content: space-between; border-bottom: 1px solid #444; padding-bottom: 10px; }
.stat-item span { color: var(--accent); font-weight: bold; }
.log-box { flex: 1; min-height: 100px; background: #111; border-radius: 6px; padding: 10px; font-family: 'Courier New', monospace; font-size: 0.75rem; color: #aaa; overflow-y: auto; }
.log-entry { margin-bottom: 4px; border-bottom: 1px solid #222; padding-bottom: 2px; }
.log-entry.error { color: var(--danger); }
.log-entry.success { color: var(--success); }
.log-entry.locked { color: var(--locked); }
.log-entry.info { color: var(--accent); }
.canvas-area { flex: 1; display: flex; align-items: center; justify-content: center; background: #000; position: relative; overflow: hidden; min-width: 0; }
canvas { display: block; box-shadow: 0 0 30px rgba(0,0,0,0.5); cursor: crosshair; }
.sidebar-right { width: 280px; background: var(--panel-bg); border-left: 1px solid #333; display: flex; flex-direction: column; z-index: 20; flex-shrink: 0; transition: width 0.3s cubic-bezier(0.4, 0.0, 0.2, 1); overflow: hidden; position: relative; }
.sidebar-right.hidden { width: 0; border-left: none; }
.palette-header { padding: 15px; border-bottom: 1px solid #444; background: rgba(0,0,0,0.2); white-space: nowrap; }
.palette-grid { flex: 1; overflow-y: auto; padding: 15px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; align-content: start; min-width: 280px; }
.palette-item { width: 100%; aspect-ratio: 1; background: #1a1a1a; border: 2px solid #444; border-radius: 4px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
.palette-item:hover { border-color: var(--accent); transform: scale(1.05); }
.palette-item.disabled { opacity: 0.2; pointer-events: none; filter: grayscale(1); }
.palette-item canvas { box-shadow: none; cursor: pointer; } 
.overlay-msg { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); padding: 8px 16px; border-radius: 20px; font-size: 0.9rem; pointer-events: none; opacity: 0; transition: opacity 0.3s; }
.overlay-msg.visible { opacity: 1; }