// === MODULE: Combat Simulator V2 - Complete Rewrite ===
// This module provides a combat simulation system for comparing fleet battles
// Fixes: Fullscreen modal, better layout, single-line ships, improved autocomplete

// Combat simulator state
window.combatSimulator = {
    leftFleet: [],
    rightFleet: [],
    formula: '',
    isOpen: false,
    autocompleteActive: false,
    autocompletePosition: 0,
    statsSelectorOpen: false
};

/**
 * Initialize the combat simulator
 */
function initCombatSimulator() {
    console.log('Initializing Combat Simulator V2');
    
    // Add button to the UI
    addCombatSimulatorButton();
    
    // Create modal structure
    createCombatSimulatorModal();
    
    // Load saved formula if exists
    const savedFormula = localStorage.getItem('combatSimulatorFormula');
    if (savedFormula) {
        window.combatSimulator.formula = savedFormula;
    }
}

/**
 * Add combat simulator button to the UI
 */
function addCombatSimulatorButton() {
    const addShipButton = document.getElementById('add-ship-button');
    if (!addShipButton) {
        console.error('Add Ship button not found');
        return;
    }
    
    // Check if button already exists
    if (document.getElementById('combat-simulator-button')) {
        return;
    }
    
    // Create combat simulator button
    const combatSimBtn = document.createElement('button');
    combatSimBtn.id = 'combat-simulator-button';
    combatSimBtn.className = 'header-button';
    combatSimBtn.textContent = 'Combat Simulator';
    combatSimBtn.onclick = openCombatSimulator;
    
    // Insert before add ship button
    addShipButton.parentNode.insertBefore(combatSimBtn, addShipButton);
}

/**
 * Create the combat simulator modal
 */
function createCombatSimulatorModal() {
    // Check if modal already exists
    if (document.getElementById('combat-simulator-modal')) {
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'combat-simulator-modal';
    modal.className = 'combat-simulator-fullscreen';
    modal.style.display = 'none';
    
    modal.innerHTML = `
        <div class="combat-simulator-content">
            <div class="combat-header">
                <div class="formula-editor-wrapper">
                    <pre id="combat-formula-highlighted" class="combat-formula-highlighted"></pre>
                    <textarea id="combat-formula-input" 
                              class="combat-formula-input" 
                              placeholder="Enter combat formula... Example: left.damage > right.hit_points ? 'left' : 'right'"
                              oninput="handleFormulaInput()"
                              onscroll="syncScroll()"
                              spellcheck="false"
                              autocomplete="off"
                              autocorrect="off"
                              autocapitalize="off">${window.combatSimulator.formula}</textarea>
                </div>
                <div class="header-controls">
                    <button class="maximize-formula-btn" onclick="toggleFormulaMaximize()" title="Maximize formula editor">⛶</button>
                    <div class="stats-dropdown">
                        <button class="stats-dropdown-btn" onclick="toggleStatsDropdown()">📊 Insert Stat</button>
                        <div id="stats-dropdown-content" class="stats-dropdown-content" style="display: none;"></div>
                    </div>
                    <button class="save-formula-btn" onclick="saveCombatFormula()">💾 Save</button>
                    <button class="clear-fleets-btn" onclick="clearAllFleets()">🗑️ Clear</button>
                    <button class="combat-close-button" onclick="closeCombatSimulator()">×</button>
                </div>
            </div>
            <div class="combat-body">
                <div class="combat-fleets-container">
                    <!-- Left Fleet Section -->
                    <div class="fleet-section">
                        <div class="fleet-header">
                            <h3>Left Fleet</h3>
                            <div class="fleet-controls">
                                <select id="left-fleet-ship-select" class="ship-selector" onchange="autoAddShipToFleet('left', this)">
                                    <option value="">Select ship...</option>
                                </select>
                            </div>
                        </div>
                        <div class="fleet-content">
                            <div class="fleet-prebattle-stats" id="left-fleet-prebattle-stats"></div>
                            <div class="fleet-main-content">
                                <div class="fleet-ships-column">
                                    <h4>Ships</h4>
                                    <div id="left-fleet-ships" class="fleet-ships-list"></div>
                                </div>
                                <div class="fleet-stats-column">
                                    <h4>All Stats</h4>
                                    <div id="left-fleet-stats" class="fleet-stats-list"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Center Section with VS, Fight Button -->
                    <div class="center-section">
                        <div class="vs-divider">VS</div>
                        <button class="fight-button" onclick="runCombatSimulation()">⚔️ FIGHT!</button>
                    </div>
                    
                    <!-- Right Fleet Section (stats on left, ships on right) -->
                    <div class="fleet-section">
                        <div class="fleet-header">
                            <h3>Right Fleet</h3>
                            <div class="fleet-controls">
                                <select id="right-fleet-ship-select" class="ship-selector" onchange="autoAddShipToFleet('right', this)">
                                    <option value="">Select ship...</option>
                                </select>
                            </div>
                        </div>
                        <div class="fleet-content">
                            <div class="fleet-prebattle-stats" id="right-fleet-prebattle-stats"></div>
                            <div class="fleet-main-content">
                                <div class="fleet-stats-column">
                                    <h4>All Stats</h4>
                                    <div id="right-fleet-stats" class="fleet-stats-list"></div>
                                </div>
                                <div class="fleet-ships-column">
                                    <h4>Ships</h4>
                                    <div id="right-fleet-ships" class="fleet-ships-list"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Combat Results Modal -->
        <div id="combat-results-modal" class="combat-results-modal" style="display: none;">
            <div class="results-modal-content">
                <div class="results-header">
                    <h2>⚔️ Battle Results</h2>
                    <button class="results-close-btn" onclick="closeCombatResults()">×</button>
                </div>
                <div class="results-body">
                    <div id="results-winner" class="results-winner"></div>
                    <div id="results-breakdown" class="results-breakdown"></div>
                </div>
                <div class="results-footer">
                    <button class="results-action-btn" onclick="closeCombatResults()">Close</button>
                    <button class="results-action-btn" onclick="runCombatSimulation()">Fight Again</button>
                    <button class="results-action-btn bulk-fight-btn" onclick="runBulkCombatSimulation(1000)">⚔️ Fight 1000x</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add styles
    addCombatSimulatorStyles();
}

/**
 * Add combat simulator specific styles
 */
function addCombatSimulatorStyles() {
    if (document.getElementById('combat-simulator-styles')) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = 'combat-simulator-styles';
    style.textContent = `
        /* Fullscreen modal */
        .combat-simulator-fullscreen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10000;
            overflow: visible;
        }
        
        .combat-simulator-content {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: var(--bg-color);
        }
        
        /* Header */
        .combat-header {
            display: flex;
            gap: 15px;
            align-items: center;
            padding: 10px 20px;
            background: #111;
            border-bottom: 2px solid var(--border-color);
            position: relative;
            z-index: 10000;
            overflow: visible;
        }
        
        /* Formula editor wrapper */
        .formula-editor-wrapper {
            flex: 1;
            position: relative;
            min-height: 40px;
            display: flex;
            background: #1e1e1e;
            border: 1px solid var(--border-color);
            border-radius: 3px;
        }
        
        .combat-header .combat-formula-input {
            position: relative;
            width: 100%;
            min-height: 40px;
            max-height: 70vh;
            padding: 8px 12px;
            margin: 0;
            font-family: 'Courier New', Consolas, Monaco, 'Lucida Console', monospace;
            font-size: 14px;
            line-height: 1.5;
            white-space: pre-wrap;
            tab-size: 4;
            overflow: auto;
            box-sizing: border-box;
            word-wrap: break-word;
            background: transparent;
            color: transparent;
            caret-color: #d4d4d4;
            border: none;
            outline: none;
            resize: vertical;
            z-index: 2;
            /* Make selection visible */
            -webkit-text-fill-color: transparent;
        }
        
        .combat-header .combat-formula-input::selection {
            background: rgba(38, 79, 120, 0.5);
            -webkit-text-fill-color: transparent;
        }
        
        .combat-header .combat-formula-highlighted {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            padding: 8px 12px;
            margin: 0;
            font-family: 'Courier New', Consolas, Monaco, 'Lucida Console', monospace;
            font-size: 14px;
            line-height: 1.5;
            white-space: pre-wrap;
            tab-size: 4;
            overflow: auto;
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE/Edge */
            box-sizing: border-box;
            word-wrap: break-word;
            color: #d4d4d4;
            pointer-events: none;
            z-index: 1;
            background: none;
            border: none;
        }
        
        /* Hide scrollbar for Chrome, Safari and Opera */
        .combat-header .combat-formula-highlighted::-webkit-scrollbar {
            display: none;
        }
        
        /* Syntax highlighting classes */
        .combat-formula-highlighted .syntax-comment { color: #6A9955 !important; font-style: italic; }
        .combat-formula-highlighted .syntax-string { color: #CE9178 !important; }
        .combat-formula-highlighted .syntax-keyword { color: #569CD6 !important; }
        .combat-formula-highlighted .syntax-number { color: #B5CEA8 !important; }
        .combat-formula-highlighted .syntax-operator { color: #D4D4D4 !important; }
        .combat-formula-highlighted .syntax-property { color: #9CDCFE !important; }
        .combat-formula-highlighted .syntax-stat { color: #C586C0 !important; font-weight: 600 !important; } /* Purple for recognized stats */
        .combat-formula-highlighted .syntax-function { color: #DCDCAA !important; }
        .combat-formula-highlighted .syntax-boolean { color: #569CD6 !important; }
        .combat-formula-highlighted .syntax-null { color: #569CD6 !important; }
        .combat-formula-highlighted .syntax-variable { color: #9CDCFE !important; }
        .combat-formula-highlighted .syntax-punctuation { color: #D4D4D4 !important; }
        .combat-formula-highlighted .syntax-left { color: #FF8C00 !important; font-weight: 600 !important; } /* Orange for left fleet */
        .combat-formula-highlighted .syntax-right { color: #FFD700 !important; font-weight: 600 !important; } /* Gold/yellow for right fleet */
        
        /* Ensure spans inside highlighted div inherit properly */
        .combat-formula-highlighted span { display: inline; }
        
        /* Syntax-like styling */
        .combat-formula-input::selection {
            background: #264f78;
            color: #ffffff;
        }
        
        /* Custom scrollbar for code-editor look */
        .combat-formula-input::-webkit-scrollbar {
            width: 12px;
            height: 12px;
        }
        
        .combat-formula-input::-webkit-scrollbar-track {
            background: #1a1a1a;
            border-radius: 3px;
        }
        
        .combat-formula-input::-webkit-scrollbar-thumb {
            background: #424242;
            border-radius: 3px;
        }
        
        .combat-formula-input::-webkit-scrollbar-thumb:hover {
            background: #4a4a4a;
        }
        
        /* Resize handle styling */
        .combat-formula-input::-webkit-resizer {
            background: transparent;
        }
        
        /* Formula maximized state */
        .formula-maximized .combat-simulator-content {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        
        .formula-maximized .combat-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            padding: 20px;
            z-index: 100002;
            background: rgba(0, 0, 0, 0.98);
            box-sizing: border-box;
        }
        
        .formula-maximized .formula-editor-wrapper {
            flex: 1;
            width: 100%;
            height: 100%;
            max-height: none;
            margin-bottom: 10px;
            display: flex;
            flex-direction: column;
        }
        
        .formula-maximized .combat-formula-input {
            width: 100%;
            height: 100%;
            max-height: none;
            font-size: 16px;
            padding: 20px;
            resize: none;
        }
        
        .formula-maximized .combat-formula-highlighted {
            font-size: 16px;
            padding: 20px;
            height: 100%;
        }
        
        .formula-maximized .header-controls {
            flex-shrink: 0;
            align-self: flex-end;
        }
        
        .formula-maximized .combat-close-button {
            display: none;
        }
        
        .formula-maximized .combat-body {
            display: none;
        }
        
        .header-controls {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        
        /* Stats Dropdown */
        .stats-dropdown {
            position: relative;
            z-index: 100000;
        }
        
        .stats-dropdown-btn {
            padding: 8px 15px;
            background: var(--button-bg-color);
            color: var(--button-text);
            border: 1px solid var(--border-color);
            border-radius: 3px;
            cursor: pointer;
        }
        
        .stats-dropdown-content {
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 5px;
            width: 250px;
            max-height: 400px;
            overflow-y: auto;
            background: #1a1a1a;
            background-color: rgba(26, 26, 26, 0.98);
            border: 1px solid var(--border-color);
            border-radius: 3px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.5);
            z-index: 100001;
        }
        
        .stat-dropdown-item {
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid var(--border-color);
            font-size: 0.9em;
            background: rgba(30, 30, 30, 0.9);
            color: var(--text-color);
        }
        
        .stat-dropdown-item:hover {
            background: var(--button-bg-color);
            background-color: rgba(60, 60, 60, 0.95);
        }
        
        .stat-dropdown-item:last-child {
            border-bottom: none;
        }
        
        .header-controls .save-formula-btn,
        .header-controls .clear-fleets-btn,
        .header-controls .maximize-formula-btn {
            padding: 8px 15px;
            background: var(--button-bg-color);
            color: var(--button-text);
            border: 1px solid var(--border-color);
            border-radius: 3px;
            cursor: pointer;
            font-size: 0.9em;
        }
        
        .maximize-formula-btn {
            font-size: 1.4em !important;
            padding: 8px 12px !important;
            line-height: 1;
        }
        
        .combat-close-button {
            background: none;
            border: none;
            color: #ccc;
            font-size: 24px;
            cursor: pointer;
            padding: 0 5px;
            margin-left: 10px;
        }
        
        .combat-close-button:hover {
            color: #fff;
        }
        
        /* Body */
        .combat-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            overflow-x: visible;
            padding: 20px;
            gap: 20px;
        }
        
        /* Fleets Container */
        .combat-fleets-container {
            display: flex;
            gap: 20px;
            height: 100%;
        }
        
        .fleet-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            border: 2px solid var(--border-color);
            border-radius: 8px;
            background: var(--panel-bg);
        }
        
        .fleet-header {
            padding: 15px;
            border-bottom: 1px solid var(--border-color);
        }
        
        .fleet-header h3 {
            margin: 0 0 10px 0;
            color: var(--text-color);
        }
        
        .fleet-controls {
            display: flex;
            gap: 10px;
        }
        
        .ship-selector {
            flex: 1;
            padding: 6px 10px;
            background: var(--input-bg);
            color: var(--text-color);
            border: 1px solid var(--border-color);
            border-radius: 3px;
        }
        
        .add-ship-btn {
            padding: 6px 15px;
            background: var(--button-bg-color);
            color: var(--button-text);
            border: 1px solid var(--border-color);
            border-radius: 3px;
            cursor: pointer;
        }
        
        /* Fleet Content */
        .fleet-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        /* Pre-battle Stats Section */
        .fleet-prebattle-stats {
            padding: 15px;
            background: rgba(0, 0, 0, 0.3);
            border-bottom: 2px solid var(--border-color);
            position: relative;
        }
        
        .prebattle-stats-title {
            font-size: 0.85em;
            color: rgba(255, 255, 255, 0.5);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
            text-align: center;
        }
        
        .prebattle-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 10px;
            max-height: 240px;
            overflow-y: auto;
        }
        
        .prebattle-stat-item {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            padding: 8px;
            text-align: center;
            transition: all 0.2s ease;
        }
        
        .prebattle-stat-item:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.2);
        }
        
        .prebattle-stat-name {
            font-size: 0.8em;
            color: rgba(255, 255, 255, 0.6);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        
        .prebattle-stat-value {
            font-size: 1.2em;
            font-weight: bold;
        }
        
        .prebattle-stat-value.stat-higher {
            color: #4ade80;
        }
        
        .prebattle-stat-value.stat-lower {
            color: #f87171;
        }
        
        .prebattle-stat-value.stat-equal {
            color: #60a5fa;
        }
        
        /* Pre-battle stats scrollbar */
        .prebattle-stats-grid::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        
        .prebattle-stats-grid::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
        }
        
        .prebattle-stats-grid::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
        }
        
        .prebattle-stats-grid::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        /* Main fleet content */
        .fleet-main-content {
            flex: 1;
            display: flex;
            flex-direction: row;
            overflow: hidden;
        }
        
        .fleet-ships-column {
            flex: 1;
            padding: 15px;
            overflow-y: auto;
        }
        
        /* Left fleet: ships column has right border */
        .fleet-section:first-child .fleet-ships-column {
            border-right: 1px solid var(--border-color);
        }
        
        /* Right fleet: stats column has right border */
        .fleet-section:last-child .fleet-stats-column {
            border-right: 1px solid var(--border-color);
        }
        
        .fleet-stats-column {
            width: 250px;
            padding: 15px;
            overflow-y: auto;
        }
        
        .fleet-ships-column h4,
        .fleet-stats-column h4 {
            margin: 0 0 10px 0;
            color: var(--secondary-text);
            font-size: 0.9em;
        }
        
        /* Ship Items */
        .fleet-ship-item {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 3px 5px;
            margin-bottom: 3px;
            background: var(--input-bg);
            border-radius: 3px;
        }
        
        .ship-name {
            flex: 0 0 120px;
            font-weight: bold;
            color: var(--text-color);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .ship-config-select {
            flex: 1;
            min-width: 80px;
            padding: 3px 8px;
            background: var(--button-bg-color);
            color: var(--button-text);
            border: 1px solid var(--border-color);
            border-radius: 3px;
            font-size: 0.9em;
        }
        
        .duplicate-ship-btn,
        .remove-ship-btn {
            flex: 0 0 30px;
            width: 30px;
            height: 30px;
            padding: 0;
            border: none;
            cursor: pointer;
            border-radius: 3px;
            font-size: 1.1em;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        
        .duplicate-ship-btn {
            background: #28a745;
        }
        
        .duplicate-ship-btn:hover {
            background: #218838;
        }
        
        .remove-ship-btn {
            background: #dc3545;
        }
        
        .remove-ship-btn:hover {
            background: #c82333;
        }
        
        /* Stats Display */
        .fleet-stats-list {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }
        
        .stat-item {
            display: flex;
            justify-content: space-between;
            padding: 4px 8px;
            background: var(--input-bg);
            border-radius: 3px;
            font-size: 0.85em;
        }
        
        .stat-name {
            color: var(--secondary-text);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .stat-value {
            font-weight: bold;
            margin-left: 10px;
        }
        
        .stat-higher { color: #4CAF50; }
        .stat-lower { color: #f44336; }
        .stat-equal { color: #2196F3; }
        
        /* Center Section */
        .center-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 20px;
            padding: 0 20px;
            min-width: 150px;
        }
        
        .vs-divider {
            font-size: 2.5em;
            font-weight: bold;
            color: var(--accent-color);
        }
        
        .center-section .fight-button {
            background: #28a745;
            color: white;
            border: none;
            padding: 12px 30px;
            font-size: 1.2em;
            font-weight: bold;
            cursor: pointer;
            border-radius: 5px;
        }
        
        .center-section .fight-button:hover {
            background: #218838;
        }
        
        /* Combat Results Modal Styles */
        .combat-results-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100002;
        }
        
        .results-modal-content {
            background: #1a1a1a;
            border: 2px solid var(--border-color);
            border-radius: 10px;
            width: 90%;
            max-width: 800px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }
        
        .results-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 2px solid var(--border-color);
            background: #111;
            border-radius: 10px 10px 0 0;
        }
        
        .results-header h2 {
            margin: 0;
            color: var(--text-color);
            font-size: 1.8em;
        }
        
        .results-close-btn {
            background: none;
            border: none;
            color: #ccc;
            font-size: 28px;
            cursor: pointer;
            padding: 0 10px;
        }
        
        .results-close-btn:hover {
            color: #fff;
        }
        
        .results-body {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }
        
        .results-winner {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: var(--panel-bg);
            border-radius: 8px;
            border: 2px solid var(--border-color);
        }
        
        .results-winner h3 {
            margin: 0 0 10px 0;
            font-size: 2.5em;
            font-weight: bold;
        }
        
        .winner-left-fleet { color: #28a745; }
        .winner-right-fleet { color: #dc3545; }
        .winner-draw { color: #ffc107; }
        
        .results-breakdown {
            background: var(--panel-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 20px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            line-height: 1.6;
            white-space: pre-wrap;
            color: #ccc;
        }
        
        .results-breakdown h4 {
            color: var(--text-color);
            margin: 20px 0 10px 0;
            font-size: 1.2em;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 5px;
        }
        
        .breakdown-section {
            margin: 15px 0;
            padding: 10px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 5px;
        }
        
        .damage-line {
            color: #ff6b6b;
        }
        
        .defense-line {
            color: #4ecdc4;
        }
        
        .factor-line {
            color: #ffe66d;
        }
        
        .results-footer {
            display: flex;
            justify-content: center;
            gap: 20px;
            padding: 20px;
            border-top: 2px solid var(--border-color);
            background: #111;
            border-radius: 0 0 10px 10px;
        }
        
        .results-action-btn {
            padding: 10px 30px;
            background: var(--button-bg-color);
            color: var(--button-text);
            border: 1px solid var(--border-color);
            border-radius: 5px;
            cursor: pointer;
            font-size: 1.1em;
            transition: all 0.2s;
        }
        
        .results-action-btn:hover {
            background: var(--button-bg-hover);
            transform: translateY(-2px);
        }
        
        .bulk-fight-btn {
            background: #dc3545 !important;
            color: white !important;
        }
        
        .bulk-fight-btn:hover {
            background: #c82333 !important;
        }
        
        /* Bulk results styles */
        .bulk-results-summary {
            margin: 20px 0;
            padding: 0 10px;
        }
        
        .result-bar {
            display: flex;
            height: 50px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 3px 10px rgba(0,0,0,0.4);
            background: #1a1a1a;
            border: 1px solid #333;
        }
        
        .result-segment {
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 0.9em;
            transition: width 0.3s ease;
            position: relative;
            min-width: 0;
        }
        
        .result-segment.left-wins {
            background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
            border-right: 1px solid rgba(0,0,0,0.3);
        }
        
        .result-segment.right-wins {
            background: linear-gradient(135deg, #dc3545 0%, #bd2130 100%);
            border-left: 1px solid rgba(0,0,0,0.3);
        }
        
        .result-segment.draws {
            background: linear-gradient(135deg, #6c757d 0%, #545b62 100%);
        }
        
        .result-segment span {
            padding: 0 15px;
            white-space: nowrap;
            text-shadow: 0 1px 3px rgba(0,0,0,0.5);
            font-size: 14px;
        }
        
        /* Hide text if segment is too small */
        .result-segment:not(:hover) span {
            opacity: 1;
        }
        
        .result-segment[style*="width: 0%"] span,
        .result-segment[style*="width: 1%"] span,
        .result-segment[style*="width: 2%"] span,
        .result-segment[style*="width: 3%"] span,
        .result-segment[style*="width: 4%"] span {
            display: none;
        }
        
        .formula-error {
            color: #dc3545;
            font-size: 0.9em;
            text-align: center;
            padding: 20px;
        }
        
        /* When in fullscreen mode, drop up instead of down */
        .formula-maximized .stats-dropdown-content {
            top: auto;
            bottom: 100%;
            margin-top: 0;
            margin-bottom: 5px;
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Open the combat simulator
 */
function openCombatSimulator() {
    const modal = document.getElementById('combat-simulator-modal');
    if (!modal) {
        console.error('Combat simulator modal not found');
        return;
    }
    
    // Update ship selectors
    updateFleetShipSelectors();
    
    // Load formula
    const formulaInput = document.getElementById('combat-formula-input');
    if (formulaInput) {
        formulaInput.value = window.combatSimulator.formula;
        // Apply initial syntax highlighting - wait a bit to ensure stats are loaded
        setTimeout(() => {
            handleFormulaInput();
        }, 100);
        
        // Watch for resize
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(() => {
                const highlightDiv = document.getElementById('combat-formula-highlighted');
                if (highlightDiv && formulaInput) {
                    highlightDiv.style.height = formulaInput.clientHeight + 'px';
                    highlightDiv.style.width = formulaInput.clientWidth + 'px';
                }
            });
            resizeObserver.observe(formulaInput);
            
            // Store observer to disconnect later
            window.combatSimulator.resizeObserver = resizeObserver;
        }
    }
    
    // Show modal
    modal.style.display = 'block';
    window.combatSimulator.isOpen = true;
    
    // Update fleet displays
    updateFleetDisplay('left');
    updateFleetDisplay('right');
    
    // Force refresh of pre-battle stats to ensure they're current
    const leftFleetStats = calculateAggregateStats(window.combatSimulator.leftFleet);
    const rightFleetStats = calculateAggregateStats(window.combatSimulator.rightFleet);
    const leftPrebattleContainer = document.getElementById('left-fleet-prebattle-stats');
    const rightPrebattleContainer = document.getElementById('right-fleet-prebattle-stats');
    
    if (leftPrebattleContainer) {
        displayPrebattleStats(leftPrebattleContainer, leftFleetStats, 'left');
    }
    if (rightPrebattleContainer) {
        displayPrebattleStats(rightPrebattleContainer, rightFleetStats, 'right');
    }
}

/**
 * Close the combat simulator
 */
function closeCombatSimulator() {
    const modal = document.getElementById('combat-simulator-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    window.combatSimulator.isOpen = false;
    window.combatSimulator.statsSelectorOpen = false;
    
    // Clean up resize observer
    if (window.combatSimulator.resizeObserver) {
        window.combatSimulator.resizeObserver.disconnect();
        window.combatSimulator.resizeObserver = null;
    }
}

/**
 * Toggle stats dropdown
 */
function toggleStatsDropdown() {
    const dropdown = document.getElementById('stats-dropdown-content');
    if (!dropdown) return;
    
    const isOpen = dropdown.style.display === 'block';
    
    if (!isOpen) {
        // Populate dropdown with stats
        populateStatsDropdown();
        dropdown.style.display = 'block';
        
        // Close dropdown when clicking outside
        setTimeout(() => {
            document.addEventListener('click', closeStatsDropdown);
        }, 10);
    } else {
        dropdown.style.display = 'none';
    }
}

/**
 * Close stats dropdown
 */
function closeStatsDropdown(event) {
    const dropdown = document.getElementById('stats-dropdown-content');
    const button = document.querySelector('.stats-dropdown-btn');
    
    if (dropdown && !dropdown.contains(event.target) && !button.contains(event.target)) {
        dropdown.style.display = 'none';
        document.removeEventListener('click', closeStatsDropdown);
    }
}

/**
 * Populate stats dropdown with available stats
 */
function populateStatsDropdown() {
    const dropdown = document.getElementById('stats-dropdown-content');
    if (!dropdown) {
        console.error('Stats dropdown content not found');
        return;
    }
    
    const stats = getOrderedStats();
    console.log('Populating dropdown with stats:', stats.length);
    dropdown.innerHTML = '';
    
    if (stats.length === 0) {
        const item = document.createElement('div');
        item.className = 'stat-dropdown-item';
        item.textContent = 'No stats available - load ship data first';
        item.style.color = '#999';
        dropdown.appendChild(item);
        return;
    }
    
    stats.forEach(stat => {
        const item = document.createElement('div');
        item.className = 'stat-dropdown-item';
        item.textContent = stat;
        item.onclick = (e) => {
            e.stopPropagation();
            insertStatIntoFormula(stat);
            dropdown.style.display = 'none';
        };
        dropdown.appendChild(item);
    });
}

/**
 * Insert stat into formula at cursor position
 */
function insertStatIntoFormula(stat) {
    const textarea = document.getElementById('combat-formula-input');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    // Insert the stat prefixed with left. or right. based on context
    let prefix = 'left.';
    // Try to detect if we're in a right context
    const beforeText = text.substring(Math.max(0, start - 50), start);
    if (beforeText.includes('right') && !beforeText.includes('left')) {
        prefix = 'right.';
    }
    
    const insertText = prefix + stat;
    const newText = text.substring(0, start) + insertText + text.substring(end);
    textarea.value = newText;
    
    // Position cursor after inserted text
    const newPos = start + insertText.length;
    textarea.setSelectionRange(newPos, newPos);
    textarea.focus();
    
    // Save formula state and reapply syntax highlighting
    saveFormulaState();
    handleFormulaInput();
}

/**
 * Handle formula input with syntax highlighting
 */
function handleFormulaInput() {
    const formulaInput = document.getElementById('combat-formula-input');
    const highlightDiv = document.getElementById('combat-formula-highlighted');
    
    if (formulaInput && highlightDiv) {
        const code = formulaInput.value;
        window.combatSimulator.formula = code;
        
        // Clear existing content
        while (highlightDiv.firstChild) {
            highlightDiv.removeChild(highlightDiv.firstChild);
        }
        
        // Apply syntax highlighting by creating DOM elements
        if (code) {
            const highlighted = highlightSyntaxToDOM(code);
            highlightDiv.appendChild(highlighted);
        }
        
        // Sync dimensions
        highlightDiv.style.height = formulaInput.clientHeight + 'px';
        highlightDiv.style.width = formulaInput.clientWidth + 'px';
    }
}

/**
 * Debug function to check known stats
 */
function debugKnownStats() {
    const knownStats = getKnownStats();
    console.log('Known stats count:', knownStats.size);
    console.log('Has damage:', knownStats.has('damage'));
    console.log('Has damage_kinetic:', knownStats.has('damage_kinetic'));
    console.log('Sample stats:', Array.from(knownStats).slice(0, 20));
}

/**
 * Test syntax highlighting with a sample formula
 */
function testSyntaxHighlighting() {
    const testFormula = `// Fleet combat formula
let leftPower = left.damage + left.damage_kinetic;
let rightPower = right.damage + right.damage_energy;

// Compare fleet strengths
if (left.hit_points > right.hit_points) {
    return "left wins";
} else if (right.shield_points > left.shield_points) {
    return "right wins";
}`;
    
    const formulaInput = document.getElementById('combat-formula-input');
    if (formulaInput) {
        formulaInput.value = testFormula;
        handleFormulaInput();
        console.log('Test formula applied with new colors: left=orange, right=yellow, stats=purple');
    }
}

window.debugKnownStats = debugKnownStats;
window.testSyntaxHighlighting = testSyntaxHighlighting;

/**
 * Sync scroll between textarea and highlight div
 */
function syncScroll() {
    const formulaInput = document.getElementById('combat-formula-input');
    const highlightDiv = document.getElementById('combat-formula-highlighted');
    
    if (formulaInput && highlightDiv) {
        highlightDiv.scrollTop = formulaInput.scrollTop;
        highlightDiv.scrollLeft = formulaInput.scrollLeft;
    }
}

/**
 * Apply syntax highlighting by creating DOM elements
 */
function highlightSyntaxToDOM(code) {
    const container = document.createDocumentFragment();
    
    if (!code) return container;
    
    // Cache known stats for this highlighting pass
    const knownStats = getKnownStats();
    
    // Simple tokenizer
    const tokens = [];
    let current = '';
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let inLineComment = false;
    
    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        const nextChar = code[i + 1];
        
        // Handle line comments
        if (!inString && !inComment && char === '/' && nextChar === '/') {
            if (current) {
                tokens.push({ type: 'code', value: current });
                current = '';
            }
            // Read until end of line
            let comment = '//';
            i += 2;
            while (i < code.length && code[i] !== '\n') {
                comment += code[i];
                i++;
            }
            tokens.push({ type: 'comment', value: comment });
            if (code[i] === '\n') {
                tokens.push({ type: 'code', value: '\n' });
            }
            continue;
        }
        
        // Handle strings
        if (!inComment && (char === '"' || char === "'")) {
            if (!inString) {
                if (current) {
                    tokens.push({ type: 'code', value: current });
                    current = '';
                }
                inString = true;
                stringChar = char;
                current = char;
            } else if (char === stringChar && code[i - 1] !== '\\') {
                current += char;
                tokens.push({ type: 'string', value: current });
                current = '';
                inString = false;
                stringChar = '';
            } else {
                current += char;
            }
        } else {
            current += char;
        }
    }
    
    if (current) {
        tokens.push({ type: inString ? 'string' : 'code', value: current });
    }
    
    // Process tokens
    tokens.forEach(token => {
        if (token.type === 'string') {
            const span = document.createElement('span');
            span.className = 'syntax-string';
            span.textContent = token.value;
            container.appendChild(span);
        } else if (token.type === 'comment') {
            const span = document.createElement('span');
            span.className = 'syntax-comment';
            span.textContent = token.value;
            container.appendChild(span);
        } else {
            // Process code tokens
            const codeText = token.value;
            // Updated regex to better handle property access patterns
            const parts = codeText.split(/(\b(?:let|const|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|typeof|instanceof|true|false|null|undefined|Math|max|min|abs|sqrt|pow|floor|ceil|round|log)\b|\b\d+\.?\d*\b|[+\-*/%=<>!&|?:,;{}()\[\]]|\w+\.\w+)/g);
            
            parts.forEach(part => {
                if (!part) return;
                
                // Properties - handle specially
                if (/^\w+\.\w+$/.test(part)) {
                    const [obj, prop] = part.split('.');
                    
                    // Handle the object part (left/right get special colors)
                    const objSpan = document.createElement('span');
                    if (obj === 'left') {
                        objSpan.className = 'syntax-left';
                    } else if (obj === 'right') {
                        objSpan.className = 'syntax-right';
                    }
                    objSpan.textContent = obj;
                    container.appendChild(objSpan);
                    
                    // Add the dot
                    container.appendChild(document.createTextNode('.'));
                    
                    // Handle the property part
                    const propSpan = document.createElement('span');
                    
                    // Check if this property is a known stat
                    if (knownStats.has(prop)) {
                        propSpan.className = 'syntax-stat';
                    } else {
                        propSpan.className = 'syntax-property';
                    }
                    
                    propSpan.textContent = prop;
                    container.appendChild(propSpan);
                    return;
                }
                
                const span = document.createElement('span');
                
                // Special handling for left and right
                if (part === 'left') {
                    span.className = 'syntax-left';
                    span.textContent = part;
                }
                else if (part === 'right') {
                    span.className = 'syntax-right';
                    span.textContent = part;
                }
                // Keywords
                else if (/^(let|const|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|typeof|instanceof|true|false|null|undefined|Math|max|min|abs|sqrt|pow|floor|ceil|round|log)$/.test(part)) {
                    span.className = 'syntax-keyword';
                    span.textContent = part;
                }
                // Numbers
                else if (/^\d+\.?\d*$/.test(part)) {
                    span.className = 'syntax-number';
                    span.textContent = part;
                }
                // Operators
                else if (/^[+\-*/%=<>!&|?:,;{}()\[\]]$/.test(part)) {
                    span.className = 'syntax-operator';
                    span.textContent = part;
                }
                else {
                    span.textContent = part;
                }
                
                container.appendChild(span);
            });
        }
    });
    
    return container;
}

/**
 * Apply syntax highlighting to code
 */
function highlightSyntax(code) {
    if (!code) return '';
    
    // Function to escape HTML
    function escapeHtml(text) {
        return text.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
    }
    
    // First, handle strings and comments to protect their content
    const stringMatches = [];
    const commentMatches = [];
    
    // Extract strings first (they might contain comment-like syntax)
    code = code.replace(/(['"])(?:(?=(\\?))\2[\s\S])*?\1/g, (match) => {
        stringMatches.push(match);
        return `___STRING_${stringMatches.length - 1}___`;
    });
    
    // Extract comments
    code = code.replace(/\/\*[\s\S]*?\*\//g, (match) => {
        commentMatches.push(match);
        return `___MLCOMMENT_${commentMatches.length - 1}___`;
    });
    code = code.replace(/\/\/.*$/gm, (match) => {
        commentMatches.push(match);
        return `___SLCOMMENT_${commentMatches.length - 1}___`;
    });
    
    // Now escape HTML in the remaining code
    code = escapeHtml(code);
    
    // Apply syntax highlighting
    // Keywords
    code = code.replace(/\b(let|const|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|typeof|instanceof|true|false|null|undefined|Math|max|min|abs|sqrt|pow|floor|ceil|round|log)\b/g, 
        '<span class="syntax-keyword">$1</span>');
    
    // Numbers
    code = code.replace(/\b(\d+\.?\d*)\b/g, '<span class="syntax-number">$1</span>');
    
    // Properties (like left.damage)
    code = code.replace(/(\w+)\.(\w+)/g, '$1.<span class="syntax-property">$2</span>');
    
    // Operators - be careful not to match HTML entities in our span tags
    code = code.replace(/([+\-*/%=&lt;&gt;!&amp;|?:,;{}()\[\]])/g, function(match, p1, offset, string) {
        // Check if this is inside a span tag we just added
        const before = string.substring(Math.max(0, offset - 20), offset);
        const after = string.substring(offset, Math.min(string.length, offset + 20));
        if (before.includes('<span') || after.includes('</span>')) {
            return match; // Don't replace if it's part of our HTML
        }
        return '<span class="syntax-operator">' + p1 + '</span>';
    });
    
    // Restore strings and comments with proper escaping and highlighting
    stringMatches.forEach((str, i) => {
        const escaped = escapeHtml(str);
        code = code.replace(`___STRING_${i}___`, `<span class="syntax-string">${escaped}</span>`);
    });
    
    commentMatches.forEach((comment, i) => {
        const escaped = escapeHtml(comment);
        if (code.includes(`___MLCOMMENT_${i}___`)) {
            code = code.replace(`___MLCOMMENT_${i}___`, `<span class="syntax-comment">${escaped}</span>`);
        } else if (code.includes(`___SLCOMMENT_${i}___`)) {
            code = code.replace(`___SLCOMMENT_${i}___`, `<span class="syntax-comment">${escaped}</span>`);
        }
    });
    
    return code;
}

/**
 * Save formula state
 */
function saveFormulaState() {
    handleFormulaInput();
}

/**
 * Update ship selectors with available ships
 */
function updateFleetShipSelectors() {
    const leftSelect = document.getElementById('left-fleet-ship-select');
    const rightSelect = document.getElementById('right-fleet-ship-select');
    
    if (!leftSelect || !rightSelect) return;
    
    // Clear existing options
    leftSelect.innerHTML = '<option value="">Select ship...</option>';
    rightSelect.innerHTML = '<option value="">Select ship...</option>';
    
    // Add ships from comparison table
    addedShips.forEach(ship => {
        if (!ship) return;
        
        const shipIdentifier = getShipIdentifier(ship);
        const activeConfigIndex = activeConfigIndices[ship.id] || 0;
        
        // For display purposes, show the currently active config
        const configs = shipConfigurations[shipIdentifier] || [];
        const activeConfig = activeConfigIndex >= 0 && configs[activeConfigIndex] ? configs[activeConfigIndex] : null;
        const configName = activeConfig ? activeConfig.name : 'Base';
        
        const optionText = `${ship['Ship Name']}`;
        const optionValue = JSON.stringify({ 
            shipId: ship.id, 
            configIndex: activeConfigIndex,
            shipName: ship['Ship Name'],
            configName: configName
        });
        
        const leftOption = new Option(optionText, optionValue);
        const rightOption = new Option(optionText, optionValue);
        
        leftSelect.appendChild(leftOption);
        rightSelect.appendChild(rightOption);
    });
}

/**
 * Auto-add ship when selected from dropdown
 */
function autoAddShipToFleet(side, selectElement) {
    if (selectElement.value) {
        addShipToFleet(side);
    }
}

/**
 * Add ship to fleet
 */
function addShipToFleet(side) {
    const select = document.getElementById(`${side}-fleet-ship-select`);
    if (!select || !select.value) return;
    
    try {
        const shipData = JSON.parse(select.value);
        const ship = addedShips.find(s => s.id === shipData.shipId);
        if (!ship) return;
        
        // Get ship configuration
        const shipIdentifier = getShipIdentifier(ship);
        const config = shipConfigurations[shipIdentifier]?.[shipData.configIndex];
        
        // Calculate modified stats
        const modifiedStats = calculateModifiedStats(ship, config?.components || {});
        
        // Add to fleet
        const fleetShip = {
            id: Date.now() + Math.random(), // Unique ID
            ship: ship,
            shipIdentifier: shipIdentifier,
            configIndex: shipData.configIndex,
            configName: shipData.configName,
            modifiedStats: modifiedStats,
            availableConfigs: shipConfigurations[shipIdentifier] || []
        };
        
        if (side === 'left') {
            window.combatSimulator.leftFleet.push(fleetShip);
        } else {
            window.combatSimulator.rightFleet.push(fleetShip);
        }
        
        // Update display
        updateFleetDisplay('left');
        updateFleetDisplay('right');
        
        // Reset selector
        select.value = '';
        
    } catch (error) {
        console.error('Error adding ship to fleet:', error);
    }
}

/**
 * Update fleet ship configuration
 */
function updateFleetShipConfig(side, shipId, configIndex) {
    const fleet = side === 'left' ? window.combatSimulator.leftFleet : window.combatSimulator.rightFleet;
    const fleetShip = fleet.find(s => s.id === shipId);
    
    if (!fleetShip) return;
    
    // Update config index
    fleetShip.configIndex = parseInt(configIndex);
    
    // Get new configuration
    const config = configIndex >= 0 ? fleetShip.availableConfigs[configIndex] : null;
    fleetShip.configName = config ? config.name : 'Base';
    
    // Recalculate modified stats
    fleetShip.modifiedStats = calculateModifiedStats(fleetShip.ship, config?.components || {});
    
    // Update both displays to refresh color comparisons
    updateFleetDisplay('left');
    updateFleetDisplay('right');
}

/**
 * Duplicate ship in fleet
 */
function duplicateShip(side, shipId) {
    const fleet = side === 'left' ? window.combatSimulator.leftFleet : window.combatSimulator.rightFleet;
    const shipToDuplicate = fleet.find(s => s.id === shipId);
    
    if (!shipToDuplicate) return;
    
    // Create a copy of the ship
    const duplicatedShip = {
        id: Date.now() + Math.random(), // New unique ID
        ship: shipToDuplicate.ship,
        shipIdentifier: shipToDuplicate.shipIdentifier,
        configIndex: shipToDuplicate.configIndex,
        configName: shipToDuplicate.configName,
        modifiedStats: {...shipToDuplicate.modifiedStats},
        availableConfigs: shipToDuplicate.availableConfigs
    };
    
    if (side === 'left') {
        window.combatSimulator.leftFleet.push(duplicatedShip);
    } else {
        window.combatSimulator.rightFleet.push(duplicatedShip);
    }
    
    // Update display
    updateFleetDisplay('left');
    updateFleetDisplay('right');
}

/**
 * Remove ship from fleet
 */
function removeShipFromFleet(side, shipId) {
    if (side === 'left') {
        window.combatSimulator.leftFleet = window.combatSimulator.leftFleet.filter(s => s.id !== shipId);
    } else {
        window.combatSimulator.rightFleet = window.combatSimulator.rightFleet.filter(s => s.id !== shipId);
    }
    
    updateFleetDisplay('left');
    updateFleetDisplay('right');
}

/**
 * Update fleet display
 */
function updateFleetDisplay(side) {
    const fleet = side === 'left' ? window.combatSimulator.leftFleet : window.combatSimulator.rightFleet;
    const shipsContainer = document.getElementById(`${side}-fleet-ships`);
    const statsContainer = document.getElementById(`${side}-fleet-stats`);
    const prebattleContainer = document.getElementById(`${side}-fleet-prebattle-stats`);
    
    if (!shipsContainer || !statsContainer) return;
    
    // Update ships list with single-line format
    shipsContainer.innerHTML = '';
    fleet.forEach(fleetShip => {
        const shipDiv = document.createElement('div');
        shipDiv.className = 'fleet-ship-item';
        
        // Create config dropdown options
        let configOptions = `<option value="-1" ${fleetShip.configIndex === -1 || fleetShip.configIndex == null ? 'selected' : ''}>Base</option>`;
        if (fleetShip.availableConfigs) {
            fleetShip.availableConfigs.forEach((config, index) => {
                configOptions += `<option value="${index}" ${index === fleetShip.configIndex ? 'selected' : ''}>${config.name}</option>`;
            });
        }
        
        shipDiv.innerHTML = `
            <div class="ship-name" title="${fleetShip.ship['Ship Name']}">${fleetShip.ship['Ship Name']}</div>
            <select class="ship-config-select" onchange="updateFleetShipConfig('${side}', ${fleetShip.id}, this.value)">
                ${configOptions}
            </select>
            <button class="duplicate-ship-btn" onclick="duplicateShip('${side}', ${fleetShip.id})" title="Duplicate">⊕</button>
            <button class="remove-ship-btn" onclick="removeShipFromFleet('${side}', ${fleetShip.id})">×</button>
        `;
        shipsContainer.appendChild(shipDiv);
    });
    
    // Calculate and display aggregate stats
    const aggregateStats = calculateAggregateStats(fleet);
    displayAggregateStats(statsContainer, aggregateStats, side);
    
    // Display pre-battle stats
    if (prebattleContainer) {
        displayPrebattleStats(prebattleContainer, aggregateStats, side);
    }
}

/**
 * Calculate aggregate stats for a fleet
 */
function calculateAggregateStats(fleet) {
    const aggregateStats = {};
    
    // Get all possible stats
    const allStats = new Set();
    fleet.forEach(fleetShip => {
        Object.keys(fleetShip.modifiedStats).forEach(stat => allStats.add(stat));
    });
    
    // Sum up stats
    allStats.forEach(stat => {
        aggregateStats[stat] = 0;
        fleet.forEach(fleetShip => {
            const value = fleetShip.modifiedStats[stat] || 0;
            aggregateStats[stat] += typeof value === 'number' ? value : 0;
        });
    });
    
    return aggregateStats;
}

/**
 * Display aggregate stats with color comparison
 */
function displayAggregateStats(container, stats, side) {
    container.innerHTML = '';
    
    // Get opponent stats for comparison
    const opponentSide = side === 'left' ? 'right' : 'left';
    const opponentFleet = opponentSide === 'left' ? window.combatSimulator.leftFleet : window.combatSimulator.rightFleet;
    const opponentStats = calculateAggregateStats(opponentFleet);
    
    // Get ordered stats
    const orderedStats = getOrderedStats();
    
    // Display stats in order
    orderedStats.forEach(stat => {
        if (stats.hasOwnProperty(stat) && (typeof stats[stat] === 'number' || !isNaN(parseFloat(stats[stat])))) {
            const statDiv = document.createElement('div');
            statDiv.className = 'stat-item';
            
            // Get values
            const myValue = stats[stat] || 0;
            const theirValue = opponentStats[stat] || 0;
            
            // Determine color based on comparison
            let colorClass = 'stat-equal'; // blue
            if (myValue > theirValue) {
                colorClass = 'stat-higher'; // green
            } else if (myValue < theirValue) {
                colorClass = 'stat-lower'; // red
            }
            
            statDiv.innerHTML = `
                <span class="stat-name" title="${stat}">${stat}:</span>
                <span class="stat-value ${colorClass}">${formatStatValue(myValue)}</span>
            `;
            container.appendChild(statDiv);
        }
    });
}

/**
 * Display pre-battle stats with key combat metrics
 */
function displayPrebattleStats(container, stats, side) {
    container.innerHTML = '';
    
    // Add title
    const titleDiv = document.createElement('div');
    titleDiv.className = 'prebattle-stats-title';
    titleDiv.textContent = 'Key Combat Stats';
    container.appendChild(titleDiv);
    
    // Create grid container
    const gridDiv = document.createElement('div');
    gridDiv.className = 'prebattle-stats-grid';
    container.appendChild(gridDiv);
    
    // Get opponent stats for comparison
    const opponentSide = side === 'left' ? 'right' : 'left';
    const opponentFleet = opponentSide === 'left' ? window.combatSimulator.leftFleet : window.combatSimulator.rightFleet;
    const opponentStats = calculateAggregateStats(opponentFleet);
    
    // Define key pre-battle stats to display
    const keyStats = [
        { name: 'damage', displayName: 'Total Damage' },
        { name: 'hit_points', displayName: 'HP' },
        { name: 'shield_points', displayName: 'Shields' },
        { name: 'shield_recharge_rate', displayName: 'Shield Regen' },
        { name: 'ap_recharge_time', displayName: 'AP Recharge' },
        { name: 'max_ap', displayName: 'Max AP' },
        { name: 'cargo_capacity', displayName: 'Cargo' },
        { name: 'ammo_capacity', displayName: 'Ammo' },
        { name: 'missile_capacity', displayName: 'Missiles' },
        { name: 'missile_power', displayName: 'Missile Pwr' },
        { name: 'scanner_power', displayName: 'Scanner' },
        { name: 'stealth_power', displayName: 'Stealth' },
        { name: 'crit_chance', displayName: 'Crit %' },
        { name: 'damage_range', displayName: 'DMG Range' },
        { name: 'sub_warp_speed', displayName: 'Speed' },
        { name: 'counter_healing_nanobots', displayName: 'Healing Bots' },
        { name: 'counter_decoy', displayName: 'Decoy' },
        { name: 'counter_energy_capacitor', displayName: 'Energy Cap' }
    ];
    
    // Check for specific damage types if total damage isn't available
    const damageTypes = ['damage_kinetic', 'damage_energy', 'damage_emp', 'damage_superchill', 
                        'damage_graygoo', 'damage_shockwave', 'damage_heat', 'damage_bomb'];
    
    // Calculate total damage if not present
    if (!stats.damage || stats.damage === 0) {
        let totalDamage = 0;
        damageTypes.forEach(dmgType => {
            if (stats[dmgType] && stats[dmgType] > 0) {
                totalDamage += stats[dmgType];
            }
        });
        if (totalDamage > 0) {
            stats.damage = totalDamage;
        }
    }
    
    // Display each key stat
    keyStats.forEach(({ name, displayName }) => {
        if (stats.hasOwnProperty(name) && (typeof stats[name] === 'number' || !isNaN(parseFloat(stats[name])))) {
            const value = stats[name] || 0;
            const opponentValue = opponentStats[name] || 0;
            
            // Skip if both are zero
            if (value === 0 && opponentValue === 0) return;
            
            const statDiv = document.createElement('div');
            statDiv.className = 'prebattle-stat-item';
            
            // Determine color based on comparison
            let colorClass = 'stat-equal';
            if (value > opponentValue) {
                colorClass = 'stat-higher';
            } else if (value < opponentValue) {
                colorClass = 'stat-lower';
            }
            
            statDiv.innerHTML = `
                <div class="prebattle-stat-name" title="${name}">${displayName}</div>
                <div class="prebattle-stat-value ${colorClass}">${formatStatValue(value)}</div>
            `;
            
            gridDiv.appendChild(statDiv);
        }
    });
    
    // Add ship count at the beginning
    const fleetSize = side === 'left' ? window.combatSimulator.leftFleet.length : window.combatSimulator.rightFleet.length;
    const opponentFleetSize = opponentSide === 'left' ? window.combatSimulator.leftFleet.length : window.combatSimulator.rightFleet.length;
    
    const shipCountDiv = document.createElement('div');
    shipCountDiv.className = 'prebattle-stat-item';
    
    let shipColorClass = 'stat-equal';
    if (fleetSize > opponentFleetSize) {
        shipColorClass = 'stat-higher';
    } else if (fleetSize < opponentFleetSize) {
        shipColorClass = 'stat-lower';
    }
    
    shipCountDiv.innerHTML = `
        <div class="prebattle-stat-name">Ships</div>
        <div class="prebattle-stat-value ${shipColorClass}">${fleetSize}</div>
    `;
    
    gridDiv.insertBefore(shipCountDiv, gridDiv.firstChild);
}

/**
 * Get known stats from loaded configuration data
 */
function getKnownStats() {
    const knownStats = new Set();
    
    // 1. Try to get stats from statDescriptions
    if (window.statDescriptions) {
        Object.keys(window.statDescriptions).forEach(stat => {
            knownStats.add(stat);
        });
        

    }
    
    // 2. Also get stats from customAttributeOrder if available
    if (window.customAttributeOrder && window.customAttributeOrder.length > 0) {
        window.customAttributeOrder.forEach(stat => {
            knownStats.add(stat);
        });
    }
    
    // 3. Get stats from base ships data
    if (window.ships && window.ships.length > 0) {
        window.ships.forEach(ship => {
            Object.keys(ship).forEach(stat => {
                // Skip non-numeric stats and common metadata fields
                if ((typeof ship[stat] === 'number' || !isNaN(parseFloat(ship[stat]))) &&
                    !['id', 'index', 'Class', 'Manufacturer', 'Ship Name', 'Spec'].includes(stat)) {
                    knownStats.add(stat);
                }
            });
        });
    }
    
    // 4. Get stats from components if available
    if (window.components && window.components.rewardTree) {
        // Navigate through the component tree structure
        function traverseComponents(node) {
            if (node && typeof node === 'object') {
                // Check if this node has stats
                if (node.stats && typeof node.stats === 'object') {
                    Object.keys(node.stats).forEach(stat => {
                        knownStats.add(stat);
                    });
                }
                // Recursively check children
                Object.values(node).forEach(child => {
                    if (typeof child === 'object') {
                        traverseComponents(child);
                    }
                });
            }
        }
        traverseComponents(window.components.rewardTree);
    }
    
    // 5. If no stats loaded yet, add common combat stats as fallback
    if (knownStats.size === 0) {
        const commonStats = [
            'damage', 'damage_kinetic', 'damage_energy', 'damage_emp', 'damage_superchill',
            'damage_graygoo', 'damage_shockwave', 'damage_heat', 'damage_bomb',
            'hit_points', 'shield_points', 'shield_recharge_rate', 'shield_break_delay',
            'counter_flare', 'counter_energy_capacitor', 'counter_faraday_shielding',
            'counter_warming_plates', 'counter_healing_nanobots', 'counter_negative_rem_plating',
            'counter_fire_suppressor', 'counter_mine', 'counter_decoy',
            'crit_chance', 'crit_multiplier', 'damage_range',
            'max_ap', 'ap_recharge_time', 'cargo_capacity', 'fuel_capacity'
        ];
        commonStats.forEach(stat => knownStats.add(stat));
    }
    
    return knownStats;
}

/**
 * Get ordered stats based on customAttributeOrder
 */
function getOrderedStats() {
    // Use customAttributeOrder if available
    if (window.customAttributeOrder && window.customAttributeOrder.length > 0) {
        return window.customAttributeOrder;
    }
    
    // Otherwise, collect all unique stats from all ships
    const allStats = new Set();
    
    // Get stats from base ships
    if (window.ships && window.ships.length > 0) {
        window.ships.forEach(ship => {
            Object.keys(ship).forEach(stat => {
                // Skip non-numeric stats and metadata
                if (typeof ship[stat] === 'number' || !isNaN(parseFloat(ship[stat]))) {
                    allStats.add(stat);
                }
            });
        });
    }
    
    // Get stats from fleet ships
    [...window.combatSimulator.leftFleet, ...window.combatSimulator.rightFleet].forEach(fleetShip => {
        if (fleetShip.modifiedStats) {
            Object.keys(fleetShip.modifiedStats).forEach(stat => allStats.add(stat));
        }
    });
    
    // Convert to array and sort
    return Array.from(allStats).sort();
}

/**
 * Format stat value for display
 */
function formatStatValue(value) {
    if (typeof value !== 'number') return value;
    
    // Format based on value size
    if (Math.abs(value) >= 1000000) {
        return (value / 1000000).toFixed(2) + 'M';
    } else if (Math.abs(value) >= 1000) {
        return (value / 1000).toFixed(2) + 'K';
    } else if (Math.abs(value) < 0.01 && value !== 0) {
        return value.toExponential(2);
    } else {
        return value.toFixed(2);
    }
}

/**
 * Run bulk combat simulation
 */
function runBulkCombatSimulation(count = 1000) {
    // Check if fleets are empty
    if (window.combatSimulator.leftFleet.length === 0 || window.combatSimulator.rightFleet.length === 0) {
        alert('Both fleets must have at least one ship!');
        return;
    }
    
    // Clear any previous results before running new bulk simulation
    const winnerDiv = document.getElementById('results-winner');
    const breakdownDiv = document.getElementById('results-breakdown');
    if (winnerDiv) {
        winnerDiv.innerHTML = '';
        winnerDiv.style.display = 'block';
        winnerDiv.className = '';
    }
    if (breakdownDiv) {
        breakdownDiv.innerHTML = '';
        breakdownDiv.style.display = 'block';
        breakdownDiv.className = '';
    }
    
    // Get aggregate stats
    const leftStats = calculateAggregateStats(window.combatSimulator.leftFleet);
    const rightStats = calculateAggregateStats(window.combatSimulator.rightFleet);
    
    // Results tracking
    const results = {
        leftWins: 0,
        rightWins: 0,
        draws: 0,
        leftAnnihilates: 0,
        rightAnnihilates: 0,
        leftDominates: 0,
        rightDominates: 0,
        leftDecisive: 0,
        rightDecisive: 0,
        leftClose: 0,
        rightClose: 0,
        veryClose: 0,
        errors: 0
    };
    
    // Run simulations
    const startTime = Date.now();
    
    try {
        // Evaluate formula
        const formula = window.combatSimulator.formula || 'left.damage > right.hit_points ? "left" : "right"';
        
        // Create a function from the formula
        const func = new Function('left', 'right', 'Math', 'abs', 'min', 'max', 'sqrt', 'pow', 'floor', 'ceil', 'round', 
            `return ${formula}`);
        
        // Run the simulation 'count' times
        for (let i = 0; i < count; i++) {
            try {
                const result = func(leftStats, rightStats, Math, Math.abs, Math.min, Math.max, Math.sqrt, Math.pow, Math.floor, Math.ceil, Math.round);
                
                // Parse the result
                if (typeof result === 'string') {
                    const resultUpper = result.toUpperCase();
                    
                    if (resultUpper.includes('LEFT ANNIHILATES')) {
                        results.leftWins++;
                        results.leftAnnihilates++;
                    } else if (resultUpper.includes('RIGHT ANNIHILATES')) {
                        results.rightWins++;
                        results.rightAnnihilates++;
                    } else if (resultUpper.includes('LEFT DOMINATES')) {
                        results.leftWins++;
                        results.leftDominates++;
                    } else if (resultUpper.includes('RIGHT DOMINATES')) {
                        results.rightWins++;
                        results.rightDominates++;
                    } else if (resultUpper.includes('LEFT WINS DECISIVELY')) {
                        results.leftWins++;
                        results.leftDecisive++;
                    } else if (resultUpper.includes('RIGHT WINS DECISIVELY')) {
                        results.rightWins++;
                        results.rightDecisive++;
                    } else if (resultUpper.includes('LEFT WINS') || resultUpper.includes('LEFT EDGES OUT')) {
                        results.leftWins++;
                        results.leftClose++;
                    } else if (resultUpper.includes('RIGHT WINS') || resultUpper.includes('RIGHT EDGES OUT')) {
                        results.rightWins++;
                        results.rightClose++;
                    } else if (resultUpper.includes('VERY CLOSE')) {
                        if (resultUpper.includes('LEFT EDGES OUT')) {
                            results.leftWins++;
                            results.veryClose++;
                        } else if (resultUpper.includes('RIGHT EDGES OUT')) {
                            results.rightWins++;
                            results.veryClose++;
                        }
                    } else if (resultUpper.includes('DRAW')) {
                        results.draws++;
                    } else if (resultUpper.includes('LEFT')) {
                        results.leftWins++;
                    } else if (resultUpper.includes('RIGHT')) {
                        results.rightWins++;
                    }
                } else if (result === 'left' || result === true || result === 1) {
                    results.leftWins++;
                } else if (result === 'right' || result === false || result === 0) {
                    results.rightWins++;
                } else if (result === 'draw' || result === null) {
                    results.draws++;
                }
            } catch (e) {
                results.errors++;
            }
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Display bulk results
        displayBulkCombatResults(results, count, duration, leftStats, rightStats);
        
    } catch (error) {
        // Show error in the results modal
        const modal = document.getElementById('combat-results-modal');
        const winnerDiv = document.getElementById('results-winner');
        const breakdownDiv = document.getElementById('results-breakdown');
        
        if (modal && winnerDiv && breakdownDiv) {
            winnerDiv.innerHTML = `<h3 class="formula-error">⚠️ Formula Error</h3>`;
            breakdownDiv.innerHTML = `<div class="formula-error">${error.message}</div>`;
            modal.style.display = 'flex';
        }
    }
}

/**
 * Run combat simulation
 */
function runCombatSimulation() {
    // Check if fleets are empty
    if (window.combatSimulator.leftFleet.length === 0 || window.combatSimulator.rightFleet.length === 0) {
        alert('Both fleets must have at least one ship!');
        return;
    }
    
    // Clear any previous results before running new simulation
    const winnerDiv = document.getElementById('results-winner');
    const breakdownDiv = document.getElementById('results-breakdown');
    if (winnerDiv) {
        winnerDiv.innerHTML = '';
        winnerDiv.style.display = 'block';
        winnerDiv.className = '';
    }
    if (breakdownDiv) {
        breakdownDiv.innerHTML = '';
        breakdownDiv.style.display = 'block';
        breakdownDiv.className = '';
    }
    
    // Get aggregate stats
    const leftStats = calculateAggregateStats(window.combatSimulator.leftFleet);
    const rightStats = calculateAggregateStats(window.combatSimulator.rightFleet);
    
    // Create evaluation context
    const context = {
        left: leftStats,
        right: rightStats,
        // Add math functions
        Math: Math,
        abs: Math.abs,
        min: Math.min,
        max: Math.max,
        sqrt: Math.sqrt,
        pow: Math.pow,
        floor: Math.floor,
        ceil: Math.ceil,
        round: Math.round
    };
    
    try {
        // Evaluate formula
        const formula = window.combatSimulator.formula || 'left.damage > right.hit_points ? "left" : "right"';
        
        // Create a function from the formula
        const func = new Function('left', 'right', 'Math', 'abs', 'min', 'max', 'sqrt', 'pow', 'floor', 'ceil', 'round', 
            `return ${formula}`);
        
        // Execute the function
        const result = func(leftStats, rightStats, Math, Math.abs, Math.min, Math.max, Math.sqrt, Math.pow, Math.floor, Math.ceil, Math.round);
        
        // Display result
        displayCombatResult(result, leftStats, rightStats);
        
    } catch (error) {
        // Show error in the results modal
        const modal = document.getElementById('combat-results-modal');
        const winnerDiv = document.getElementById('results-winner');
        const breakdownDiv = document.getElementById('results-breakdown');
        
        if (modal && winnerDiv && breakdownDiv) {
            winnerDiv.innerHTML = `<h3 class="formula-error">⚠️ Formula Error</h3>`;
            breakdownDiv.innerHTML = `<div class="formula-error">${error.message}</div>`;
            modal.style.display = 'flex';
        }
    }
}

/**
 * Display combat result
 */
function displayCombatResult(result, leftStats, rightStats) {
    const modal = document.getElementById('combat-results-modal');
    const winnerDiv = document.getElementById('results-winner');
    const breakdownDiv = document.getElementById('results-breakdown');
    
    if (!modal || !winnerDiv || !breakdownDiv) return;
    
    // Clear previous results completely
    winnerDiv.innerHTML = '';
    breakdownDiv.innerHTML = '';
    winnerDiv.className = '';
    breakdownDiv.className = '';
    
    let winnerText = '';
    let winnerClass = '';
    let winnerDetails = '';
    let breakdown = '';
    
    // Check if result contains HTML (from combat equation v3)
    if (typeof result === 'string' && result.includes('<div class="combat-results">')) {
        // Result is already formatted HTML from v3, display it directly
        winnerDiv.innerHTML = '';
        breakdownDiv.innerHTML = result;
        // Hide the standard winner div since v3 includes its own winner section
        winnerDiv.style.display = 'none';
        breakdownDiv.style.display = 'block';
    }
    // Check if result contains breakdown (from advanced formula)
    else if (typeof result === 'string' && result.includes('===')) {
        // Show standard winner div for v2 format
        winnerDiv.style.display = 'block';
        breakdownDiv.style.display = 'block';
        
        // Extract winner and breakdown from advanced formula
        const parts = result.split('\n\n=== BATTLE BREAKDOWN ===\n');
        const winnerPart = parts[0];
        breakdown = parts[1] || '';
        
        // Determine winner styling based on result
        if (winnerPart.includes('LEFT')) {
            winnerText = '🏆 Left Fleet Victory!';
            winnerClass = 'winner-left-fleet';
            winnerDetails = winnerPart;
        } else if (winnerPart.includes('RIGHT')) {
            winnerText = '🏆 Right Fleet Victory!';
            winnerClass = 'winner-right-fleet';
            winnerDetails = winnerPart;
        } else if (winnerPart.includes('DRAW')) {
            winnerText = '🤝 Draw!';
            winnerClass = 'winner-draw';
            winnerDetails = winnerPart;
        }
        
        // Format breakdown with syntax highlighting
        breakdown = formatBreakdown(breakdown);
        
    } else {
        // Show standard winner div for simple results
        winnerDiv.style.display = 'block';
        breakdownDiv.style.display = 'block';
        
        // Simple result handling
        if (result === 'left' || result === true || result === 1) {
            winnerText = '🏆 Left Fleet Wins!';
            winnerClass = 'winner-left-fleet';
            winnerDetails = 'Left fleet dominated with superior firepower';
        } else if (result === 'right' || result === false || result === 0) {
            winnerText = '🏆 Right Fleet Wins!';
            winnerClass = 'winner-right-fleet';
            winnerDetails = 'Right fleet emerged victorious';
        } else if (result === 'draw' || result === null) {
            winnerText = '🤝 Draw!';
            winnerClass = 'winner-draw';
            winnerDetails = 'Both fleets are evenly matched';
        } else {
            winnerText = `Result: ${result}`;
            winnerDetails = `Formula returned: ${result}`;
        }
        
        // Create simple breakdown
        breakdown = createSimpleBreakdown(leftStats, rightStats);
    }
    
    // Update modal content (only if not using v3 HTML format)
    if (typeof result !== 'string' || !result.includes('<div class="combat-results">')) {
        winnerDiv.innerHTML = `
            <h3 class="${winnerClass}">${winnerText}</h3>
            <p>${winnerDetails}</p>
            <div class="fleet-summary">
                <span>Left Fleet: ${window.combatSimulator.leftFleet.length} ships</span>
                <span>•</span>
                <span>Right Fleet: ${window.combatSimulator.rightFleet.length} ships</span>
            </div>
        `;
        
        breakdownDiv.innerHTML = breakdown;
    }
    
    // Show modal
    modal.style.display = 'flex';
}

/**
 * Format breakdown text with syntax highlighting
 */
function formatBreakdown(text) {
    if (!text) return '';
    
    // Split into lines and format each
    return text.split('\n').map(line => {
        // Damage lines
        if (line.includes('damage') || line.includes('DPS')) {
            return `<span class="damage-line">${line}</span>`;
        }
        // Defense lines
        if (line.includes('defense') || line.includes('shield') || line.includes('HP')) {
            return `<span class="defense-line">${line}</span>`;
        }
        // Factor lines
        if (line.includes('KEY FACTORS') || line.includes('FINAL SCORES')) {
            return `<span class="factor-line"><strong>${line}</strong></span>`;
        }
        // Result lines
        if (line.includes('Result:')) {
            return `<strong>${line}</strong>`;
        }
        return line;
    }).join('\n');
}

/**
 * Create simple breakdown for basic formulas
 */
function createSimpleBreakdown(leftStats, rightStats) {
    let breakdown = '<h4>Fleet Statistics</h4>\n\n';
    
    // Key combat stats
    const combatStats = ['damage', 'hit_points', 'shield_points', 'cargo_capacity'];
    
    breakdown += '<div class="breakdown-section">\n';
    breakdown += '<strong>Left Fleet:</strong>\n';
    combatStats.forEach(stat => {
        if (leftStats[stat]) {
            breakdown += `  ${stat}: ${formatStatValue(leftStats[stat])}\n`;
        }
    });
    breakdown += '</div>\n\n';
    
    breakdown += '<div class="breakdown-section">\n';
    breakdown += '<strong>Right Fleet:</strong>\n';
    combatStats.forEach(stat => {
        if (rightStats[stat]) {
            breakdown += `  ${stat}: ${formatStatValue(rightStats[stat])}\n`;
        }
    });
    breakdown += '</div>';
    
    return breakdown;
}

/**
 * Display bulk combat results
 */
function displayBulkCombatResults(results, count, duration, leftStats, rightStats) {
    const modal = document.getElementById('combat-results-modal');
    const winnerDiv = document.getElementById('results-winner');
    const breakdownDiv = document.getElementById('results-breakdown');
    
    if (!modal || !winnerDiv || !breakdownDiv) return;
    
    // Clear previous results and ensure proper display
    winnerDiv.innerHTML = '';
    breakdownDiv.innerHTML = '';
    winnerDiv.style.display = 'block';
    breakdownDiv.style.display = 'block';
    winnerDiv.className = '';
    breakdownDiv.className = '';
    
    // Calculate percentages
    const leftWinPercent = ((results.leftWins / count) * 100).toFixed(1);
    const rightWinPercent = ((results.rightWins / count) * 100).toFixed(1);
    const drawPercent = ((results.draws / count) * 100).toFixed(1);
    
    // Determine overall winner
    let winnerText = '';
    let winnerClass = '';
    
    if (results.leftWins > results.rightWins * 1.2) {
        winnerText = `🏆 Left Fleet Dominates!`;
        winnerClass = 'winner-left-fleet';
    } else if (results.rightWins > results.leftWins * 1.2) {
        winnerText = `🏆 Right Fleet Dominates!`;
        winnerClass = 'winner-right-fleet';
    } else if (Math.abs(results.leftWins - results.rightWins) < count * 0.05) {
        winnerText = `⚖️ Evenly Matched!`;
        winnerClass = 'winner-draw';
    } else if (results.leftWins > results.rightWins) {
        winnerText = `🏆 Left Fleet Wins Overall`;
        winnerClass = 'winner-left-fleet';
    } else {
        winnerText = `🏆 Right Fleet Wins Overall`;
        winnerClass = 'winner-right-fleet';
    }
    
    // Update modal content
    winnerDiv.innerHTML = `
        <h3 class="${winnerClass}">${winnerText}</h3>
        <p><strong>${count} battles</strong> completed in ${duration}ms</p>
        <div class="bulk-results-summary">
            <div class="result-bar">
                <div class="result-segment left-wins" style="width: ${leftWinPercent}%${leftWinPercent === '100.0' ? '; border-radius: 8px' : ''}">
                    <span>${leftWinPercent > 0 ? `Left: ${leftWinPercent}%` : ''}</span>
                </div>
                ${drawPercent > 0 ? `<div class="result-segment draws" style="width: ${drawPercent}%">
                    <span>${drawPercent > 5 ? `Draw: ${drawPercent}%` : ''}</span>
                </div>` : ''}
                <div class="result-segment right-wins" style="width: ${rightWinPercent}%${rightWinPercent === '100.0' ? '; border-radius: 8px' : ''}">
                    <span>${rightWinPercent > 0 ? `Right: ${rightWinPercent}%` : ''}</span>
                </div>
            </div>
        </div>
    `;
    
    // Create detailed breakdown
    let breakdown = '<h4>Battle Statistics</h4>\n\n';
    
    breakdown += '<div class="breakdown-section">\n';
    breakdown += `<strong>Left Fleet Victories: ${results.leftWins} (${leftWinPercent}%)</strong>\n`;
    if (results.leftAnnihilates > 0) breakdown += `  • Annihilations: ${results.leftAnnihilates}\n`;
    if (results.leftDominates > 0) breakdown += `  • Dominations: ${results.leftDominates}\n`;
    if (results.leftDecisive > 0) breakdown += `  • Decisive wins: ${results.leftDecisive}\n`;
    if (results.leftClose > 0) breakdown += `  • Close wins: ${results.leftClose}\n`;
    breakdown += '</div>\n\n';
    
    breakdown += '<div class="breakdown-section">\n';
    breakdown += `<strong>Right Fleet Victories: ${results.rightWins} (${rightWinPercent}%)</strong>\n`;
    if (results.rightAnnihilates > 0) breakdown += `  • Annihilations: ${results.rightAnnihilates}\n`;
    if (results.rightDominates > 0) breakdown += `  • Dominations: ${results.rightDominates}\n`;
    if (results.rightDecisive > 0) breakdown += `  • Decisive wins: ${results.rightDecisive}\n`;
    if (results.rightClose > 0) breakdown += `  • Close wins: ${results.rightClose}\n`;
    breakdown += '</div>\n\n';
    
    if (results.draws > 0 || results.veryClose > 0) {
        breakdown += '<div class="breakdown-section">\n';
        if (results.draws > 0) breakdown += `<strong>Draws: ${results.draws} (${drawPercent}%)</strong>\n`;
        if (results.veryClose > 0) breakdown += `<strong>Very Close Battles: ${results.veryClose}</strong>\n`;
        breakdown += '</div>\n\n';
    }
    
    if (results.errors > 0) {
        breakdown += `<div class="formula-error">Errors: ${results.errors}</div>\n`;
    }
    
    // Add fleet comparison
    breakdown += '<h4>Fleet Average Stats</h4>\n';
    breakdown += createSimpleBreakdown(leftStats, rightStats);
    
    breakdownDiv.innerHTML = breakdown;
    
    // Show modal
    modal.style.display = 'flex';
}

/**
 * Close combat results modal
 */
function closeCombatResults() {
    const modal = document.getElementById('combat-results-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Save combat formula
 */
function saveCombatFormula() {
    localStorage.setItem('combatSimulatorFormula', window.combatSimulator.formula);
    
    // Mark configuration as changed
    if (typeof markConfigurationAsChanged === 'function') {
        markConfigurationAsChanged();
    }
    
    alert('Combat formula saved!');
}

/**
 * Toggle formula maximize mode
 */
function toggleFormulaMaximize() {
    const modal = document.getElementById('combat-simulator-modal');
    const button = document.querySelector('.maximize-formula-btn');
    const textarea = document.getElementById('combat-formula-input');
    
    if (!modal) return;
    
    if (modal.classList.contains('formula-maximized')) {
        modal.classList.remove('formula-maximized');
        button.textContent = '⛶';
        button.title = 'Maximize formula editor';
    } else {
        // Reset textarea and highlight div size before maximizing
        if (textarea) {
            textarea.style.height = '';
            textarea.style.width = '';
        }
        const highlightDiv = document.getElementById('combat-formula-highlighted');
        if (highlightDiv) {
            highlightDiv.style.height = '';
            highlightDiv.style.width = '';
        }
        
        modal.classList.add('formula-maximized');
        button.textContent = '⤡';  // Minimize icon
        button.title = 'Exit fullscreen';
        
        // Focus the textarea
        if (textarea) {
            textarea.focus();
        }
    }
}

/**
 * Clear all fleets
 */
function clearAllFleets() {
    if (confirm('Clear both fleets?')) {
        window.combatSimulator.leftFleet = [];
        window.combatSimulator.rightFleet = [];
        updateFleetDisplay('left');
        updateFleetDisplay('right');
    }
}

// === MODULE EXPORT ===
window.CombatSimulator = {
    init: initCombatSimulator,
    open: openCombatSimulator,
    close: closeCombatSimulator,
    addShipToFleet: addShipToFleet,
    removeShipFromFleet: removeShipFromFleet,
    updateFleetShipConfig: updateFleetShipConfig,
    runSimulation: runCombatSimulation,
    clearFleets: clearAllFleets
};

// Export individual functions for backward compatibility
window.initCombatSimulator = initCombatSimulator;
window.openCombatSimulator = openCombatSimulator;
window.closeCombatSimulator = closeCombatSimulator;
window.addShipToFleet = addShipToFleet;
window.autoAddShipToFleet = autoAddShipToFleet;
window.duplicateShip = duplicateShip;
window.removeShipFromFleet = removeShipFromFleet;
window.updateFleetShipConfig = updateFleetShipConfig;
window.runCombatSimulation = runCombatSimulation;
window.clearAllFleets = clearAllFleets;
window.saveFormulaState = saveFormulaState;
window.saveCombatFormula = saveCombatFormula;
window.toggleStatsDropdown = toggleStatsDropdown;
window.closeCombatResults = closeCombatResults;
window.toggleFormulaMaximize = toggleFormulaMaximize;
window.runBulkCombatSimulation = runBulkCombatSimulation;
window.handleFormulaInput = handleFormulaInput;
window.syncScroll = syncScroll;

/**
 * Refresh syntax highlighting (useful after loading configs)
 */
function refreshCombatFormulaSyntax() {
    const formulaInput = document.getElementById('combat-formula-input');
    const isModalOpen = window.combatSimulator && window.combatSimulator.isOpen;
    
    if (formulaInput && formulaInput.value && isModalOpen) {
        // Re-apply syntax highlighting with newly loaded stats
        handleFormulaInput();
    }
}

window.refreshCombatFormulaSyntax = refreshCombatFormulaSyntax;
window.displayPrebattleStats = displayPrebattleStats;

console.log('Combat Simulator V2 module loaded successfully');

// Add keyboard listeners
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const resultsModal = document.getElementById('combat-results-modal');
        if (resultsModal && resultsModal.style.display === 'flex') {
            closeCombatResults();
        }
    }
}); 