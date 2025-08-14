// === MODULE: Combat Simulator ===
// This module provides a combat simulation system for comparing fleet battles
// Allows creating custom combat formulas using ship stats
// Dependencies: app.js, comparison-table.js, component-management.js

// Combat simulator state
window.combatSimulator = {
    leftFleet: [],
    rightFleet: [],
    formula: '',
    isOpen: false,
    autocompleteActive: false,
    autocompletePosition: 0
};

/**
 * Initialize the combat simulator
 */
function initCombatSimulator() {
    console.log('Initializing Combat Simulator');
    
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
    modal.className = 'modal-container';
    modal.style.display = 'none';
    
    modal.innerHTML = `
        <div class="modal-content combat-simulator-content">
            <div class="modal-header">
                <h2>Combat Simulator</h2>
                <button class="close-button" onclick="closeCombatSimulator()">&times;</button>
            </div>
            <div class="modal-body" style="display: flex; flex-direction: column; height: calc(100% - 60px); overflow: hidden;">
                <div class="combat-simulator-container">
                    <!-- Fleet containers -->
                    <div class="fleet-container left-fleet">
                        <h3>Left Fleet</h3>
                        <div class="fleet-ship-selector">
                            <select id="left-fleet-ship-select" class="ship-selector">
                                <option value="">Select a ship to add...</option>
                            </select>
                            <button class="add-to-fleet-btn" onclick="addShipToFleet('left')">Add Ship</button>
                        </div>
                        <div id="left-fleet-ships" class="fleet-ships-list"></div>
                        <div class="fleet-stats">
                            <h4>Aggregate Stats</h4>
                            <div id="left-fleet-stats" class="fleet-stats-display"></div>
                        </div>
                    </div>
                    
                    <!-- VS divider -->
                    <div class="vs-divider">
                        <div class="vs-text">VS</div>
                    </div>
                    
                    <!-- Right fleet -->
                    <div class="fleet-container right-fleet">
                        <h3>Right Fleet</h3>
                        <div class="fleet-ship-selector">
                            <select id="right-fleet-ship-select" class="ship-selector">
                                <option value="">Select a ship to add...</option>
                            </select>
                            <button class="add-to-fleet-btn" onclick="addShipToFleet('right')">Add Ship</button>
                        </div>
                        <div id="right-fleet-ships" class="fleet-ships-list"></div>
                        <div class="fleet-stats">
                            <h4>Aggregate Stats</h4>
                            <div id="right-fleet-stats" class="fleet-stats-display"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Combat formula section -->
                <div class="combat-formula-section">
                    <h3>Combat Formula</h3>
                    <div class="formula-help">
                        Type @ to insert stats. Use left.stat_name and right.stat_name to reference fleet stats.
                        Example: left.damage > right.hit_points ? "left" : "right"
                    </div>
                    <div class="formula-input-container">
                        <textarea id="combat-formula-input" 
                                  class="combat-formula-input" 
                                  placeholder="Enter combat formula..."
                                  oninput="handleFormulaInput(event)"
                                  onkeydown="handleFormulaKeydown(event)">${window.combatSimulator.formula}</textarea>
                        <div id="formula-autocomplete" class="formula-autocomplete" style="display: none;"></div>
                    </div>
                    
                    <!-- Fight button and results -->
                    <div class="combat-controls">
                        <button class="fight-button" onclick="runCombatSimulation()">⚔️ FIGHT!</button>
                        <button class="save-formula-btn" onclick="saveCombatFormula()">💾 Save Formula</button>
                        <button class="clear-fleets-btn" onclick="clearAllFleets()">🗑️ Clear Fleets</button>
                    </div>
                    
                    <div id="combat-result" class="combat-result" style="display: none;"></div>
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
        .combat-simulator-content {
            width: 95vw;
            height: 95vh;
            max-width: none;
            max-height: none;
        }
        
        .combat-simulator-container {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            height: 60%;
        }
        
        .fleet-container {
            flex: 1;
            border: 2px solid var(--border-color);
            border-radius: 8px;
            padding: 15px;
            background: var(--panel-bg);
            display: flex;
            flex-direction: column;
        }
        
        .fleet-container h3 {
            margin: 0 0 10px 0;
            color: var(--text-color);
        }
        
        .fleet-ship-selector {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .fleet-ship-selector select {
            flex: 1;
        }
        
        .add-to-fleet-btn {
            background: var(--button-bg-color);
            color: var(--button-text);
            border: 1px solid var(--border-color);
            padding: 5px 15px;
            cursor: pointer;
            border-radius: 3px;
        }
        
        .fleet-ships-list {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 10px;
            min-height: 100px;
        }
        
        .fleet-ship-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px;
            margin-bottom: 5px;
            background: var(--input-bg);
            border-radius: 3px;
        }
        
        .fleet-ship-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .fleet-ship-name {
            font-weight: bold;
            color: var(--text-color);
        }
        
        .fleet-config-select {
            padding: 4px 8px;
            font-size: 0.9em;
            background: var(--button-bg-color);
            color: var(--button-text);
            border: 1px solid var(--border-color);
            border-radius: 3px;
            cursor: pointer;
        }
        
        .remove-ship-btn {
            background: #dc3545;
            color: white;
            border: none;
            padding: 2px 8px;
            cursor: pointer;
            border-radius: 3px;
            font-size: 0.9em;
        }
        
        .vs-divider {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 20px;
        }
        
        .vs-text {
            font-size: 2em;
            font-weight: bold;
            color: var(--accent-color);
        }
        
        .fleet-stats {
            border-top: 1px solid var(--border-color);
            padding-top: 10px;
            max-height: 200px;
            overflow-y: auto;
        }
        
        .fleet-stats h4 {
            margin: 0 0 5px 0;
            font-size: 0.9em;
            color: var(--secondary-text);
        }
        
        .fleet-stats-display {
            font-size: 0.85em;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 5px;
            max-height: 150px;
            overflow-y: auto;
        }
        
        .stat-item {
            display: flex;
            justify-content: space-between;
            padding: 2px 5px;
            background: var(--input-bg);
            border-radius: 3px;
        }
        
        .stat-name {
            color: var(--secondary-text);
        }
        
        .stat-value {
            font-weight: bold;
            color: var(--text-color);
        }
        
        .stat-higher {
            color: #4CAF50 !important;
        }
        
        .stat-lower {
            color: #f44336 !important;
        }
        
        .stat-equal {
            color: #2196F3 !important;
        }
        
        .combat-formula-section {
            border: 2px solid var(--border-color);
            border-radius: 8px;
            padding: 15px;
            background: var(--panel-bg);
        }
        
        .formula-help {
            font-size: 0.9em;
            color: var(--secondary-text);
            margin-bottom: 10px;
            padding: 10px;
            background: var(--input-bg);
            border-radius: 3px;
        }
        
        .formula-input-container {
            position: relative;
            margin-bottom: 15px;
        }
        
        .combat-formula-input {
            width: 100%;
            min-height: 100px;
            padding: 10px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            background: var(--input-bg);
            color: var(--text-color);
            border: 1px solid var(--border-color);
            border-radius: 3px;
            resize: vertical;
        }
        
        .formula-autocomplete {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            max-height: 200px;
            overflow-y: auto;
            background: var(--panel-bg);
            border: 1px solid var(--border-color);
            border-radius: 3px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 1000;
        }
        
        .autocomplete-item {
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid var(--border-color);
        }
        
        .autocomplete-item:hover,
        .autocomplete-item.selected {
            background: var(--button-bg-color);
        }
        
        .autocomplete-stat {
            font-weight: bold;
            color: var(--text-color);
        }
        
        .autocomplete-desc {
            font-size: 0.85em;
            color: var(--secondary-text);
            margin-left: 10px;
        }
        
        .combat-controls {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .fight-button {
            background: #28a745;
            color: white;
            border: none;
            padding: 10px 30px;
            font-size: 1.2em;
            font-weight: bold;
            cursor: pointer;
            border-radius: 5px;
            transition: background 0.2s;
        }
        
        .fight-button:hover {
            background: #218838;
        }
        
        .save-formula-btn,
        .clear-fleets-btn {
            background: var(--button-bg-color);
            color: var(--button-text);
            border: 1px solid var(--border-color);
            padding: 10px 20px;
            cursor: pointer;
            border-radius: 3px;
        }
        
        .combat-result {
            padding: 20px;
            background: var(--input-bg);
            border-radius: 5px;
            text-align: center;
        }
        
        .combat-winner {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .winner-left {
            color: #28a745;
        }
        
        .winner-right {
            color: #dc3545;
        }
        
        .winner-draw {
            color: #ffc107;
        }
        
        .combat-details {
            font-size: 0.9em;
            color: var(--secondary-text);
        }
        
        .formula-error {
            color: #dc3545;
            font-size: 0.9em;
            margin-top: 5px;
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
    }
    
    // Show modal
    modal.style.display = 'block';
    window.combatSimulator.isOpen = true;
    
    // Update fleet displays
    updateFleetDisplay('left');
    updateFleetDisplay('right');
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
    hideAutocomplete();
}

/**
 * Update ship selectors with available ships
 */
function updateFleetShipSelectors() {
    const leftSelect = document.getElementById('left-fleet-ship-select');
    const rightSelect = document.getElementById('right-fleet-ship-select');
    
    if (!leftSelect || !rightSelect) return;
    
    // Clear existing options
    leftSelect.innerHTML = '<option value="">Select a ship to add...</option>';
    rightSelect.innerHTML = '<option value="">Select a ship to add...</option>';
    
    // Add ships from comparison table
    addedShips.forEach(ship => {
        if (!ship) return;
        
        const shipIdentifier = getShipIdentifier(ship);
        const activeConfigIndex = activeConfigIndices[ship.id] || 0;
        
        // For display purposes, show the currently active config
        const configs = shipConfigurations[shipIdentifier] || [];
        const activeConfig = activeConfigIndex >= 0 && configs[activeConfigIndex] ? configs[activeConfigIndex] : null;
        const configName = activeConfig ? activeConfig.name : 'Base';
        
        const optionText = `${ship['Ship Name']} (${configName})`;
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
        updateFleetDisplay(side);
        
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
    
    // Update display
    updateFleetDisplay(side);
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
    
    updateFleetDisplay(side);
}

/**
 * Update fleet display
 */
function updateFleetDisplay(side) {
    const fleet = side === 'left' ? window.combatSimulator.leftFleet : window.combatSimulator.rightFleet;
    const shipsContainer = document.getElementById(`${side}-fleet-ships`);
    const statsContainer = document.getElementById(`${side}-fleet-stats`);
    
    if (!shipsContainer || !statsContainer) return;
    
    // Update ships list
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
            <div class="fleet-ship-info">
                <div class="fleet-ship-name">${fleetShip.ship['Ship Name']}</div>
                <select class="fleet-config-select" onchange="updateFleetShipConfig('${side}', ${fleetShip.id}, this.value)">
                    ${configOptions}
                </select>
            </div>
            <button class="remove-ship-btn" onclick="removeShipFromFleet('${side}', ${fleetShip.id})">×</button>
        `;
        shipsContainer.appendChild(shipDiv);
    });
    
    // Calculate and display aggregate stats
    const aggregateStats = calculateAggregateStats(fleet);
    displayAggregateStats(statsContainer, aggregateStats, side);
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
 * Display aggregate stats
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
                <span class="stat-name">${stat}:</span>
                <span class="stat-value ${colorClass}">${formatStatValue(myValue)}</span>
            `;
            container.appendChild(statDiv);
        }
    });
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
 * Handle formula input for autocomplete
 */
function handleFormulaInput(event) {
    const input = event.target;
    const cursorPos = input.selectionStart;
    const text = input.value;
    
    // Save formula
    window.combatSimulator.formula = text;
    
    // Check for @ symbol
    const lastAtPos = text.lastIndexOf('@', cursorPos - 1);
    if (lastAtPos !== -1 && cursorPos > lastAtPos) {
        const searchText = text.substring(lastAtPos + 1, cursorPos);
        showAutocomplete(input, searchText, lastAtPos);
    } else {
        hideAutocomplete();
    }
}

/**
 * Handle formula keydown for autocomplete navigation
 */
function handleFormulaKeydown(event) {
    if (!window.combatSimulator.autocompleteActive) return;
    
    const autocomplete = document.getElementById('formula-autocomplete');
    const items = autocomplete.querySelectorAll('.autocomplete-item');
    
    switch(event.key) {
        case 'ArrowDown':
            event.preventDefault();
            window.combatSimulator.autocompletePosition = Math.min(window.combatSimulator.autocompletePosition + 1, items.length - 1);
            updateAutocompleteSelection(items);
            break;
            
        case 'ArrowUp':
            event.preventDefault();
            window.combatSimulator.autocompletePosition = Math.max(window.combatSimulator.autocompletePosition - 1, 0);
            updateAutocompleteSelection(items);
            break;
            
        case 'Enter':
            event.preventDefault();
            if (items[window.combatSimulator.autocompletePosition]) {
                insertAutocompleteItem(items[window.combatSimulator.autocompletePosition].dataset.stat);
            }
            break;
            
        case 'Escape':
            hideAutocomplete();
            break;
    }
}

/**
 * Show autocomplete dropdown
 */
function showAutocomplete(input, searchText, atPosition) {
    const autocomplete = document.getElementById('formula-autocomplete');
    if (!autocomplete) return;
    
    // Get all available stats
    const stats = getOrderedStats();
    
    // Filter stats based on search
    const filtered = stats.filter(stat => 
        stat.toLowerCase().includes(searchText.toLowerCase())
    );
    
    if (filtered.length === 0) {
        hideAutocomplete();
        return;
    }
    
    // Build autocomplete list
    autocomplete.innerHTML = '';
    filtered.forEach((stat, index) => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        if (index === 0) item.classList.add('selected');
        item.dataset.stat = stat;
        item.innerHTML = `
            <span class="autocomplete-stat">${stat}</span>
            <span class="autocomplete-desc">${getStatDescription(stat)}</span>
        `;
        item.onclick = () => insertAutocompleteItem(stat);
        autocomplete.appendChild(item);
    });
    
    // Position and show
    autocomplete.style.display = 'block';
    window.combatSimulator.autocompleteActive = true;
    window.combatSimulator.autocompletePosition = 0;
    
    // Store position for insertion
    autocomplete.dataset.atPosition = atPosition;
    autocomplete.dataset.searchLength = searchText.length;
}

/**
 * Hide autocomplete dropdown
 */
function hideAutocomplete() {
    const autocomplete = document.getElementById('formula-autocomplete');
    if (autocomplete) {
        autocomplete.style.display = 'none';
    }
    window.combatSimulator.autocompleteActive = false;
}

/**
 * Update autocomplete selection
 */
function updateAutocompleteSelection(items) {
    items.forEach((item, index) => {
        if (index === window.combatSimulator.autocompletePosition) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

/**
 * Insert autocomplete item into formula
 */
function insertAutocompleteItem(stat) {
    const input = document.getElementById('combat-formula-input');
    const autocomplete = document.getElementById('formula-autocomplete');
    if (!input || !autocomplete) return;
    
    const atPosition = parseInt(autocomplete.dataset.atPosition);
    const searchLength = parseInt(autocomplete.dataset.searchLength);
    
    // Replace @searchText with the stat
    const text = input.value;
    const before = text.substring(0, atPosition);
    const after = text.substring(atPosition + 1 + searchLength);
    
    input.value = before + stat + after;
    
    // Position cursor after inserted text
    const newPos = atPosition + stat.length;
    input.setSelectionRange(newPos, newPos);
    input.focus();
    
    // Update formula
    window.combatSimulator.formula = input.value;
    
    // Hide autocomplete
    hideAutocomplete();
}

/**
 * Get stat description
 */
function getStatDescription(stat) {
    const descriptions = {
        cargo_capacity: 'Cargo hold capacity',
        fuel_capacity: 'Fuel tank capacity',
        ammo_capacity: 'Ammunition storage',
        hit_points: 'Hull hit points',
        shield_points: 'Shield strength',
        damage: 'Total damage output',
        damage_kinetic: 'Kinetic damage',
        damage_energy: 'Energy damage',
        damage_emp: 'EMP damage',
        subwarp_speed: 'Subwarp travel speed',
        warp_speed: 'Warp travel speed'
    };
    
    return descriptions[stat] || stat.replace(/_/g, ' ');
}

/**
 * Run combat simulation
 */
function runCombatSimulation() {
    const resultDiv = document.getElementById('combat-result');
    if (!resultDiv) return;
    
    // Check if fleets are empty
    if (window.combatSimulator.leftFleet.length === 0 || window.combatSimulator.rightFleet.length === 0) {
        resultDiv.innerHTML = '<div class="formula-error">Both fleets must have at least one ship!</div>';
        resultDiv.style.display = 'block';
        return;
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
        resultDiv.innerHTML = `<div class="formula-error">Formula Error: ${error.message}</div>`;
        resultDiv.style.display = 'block';
    }
}

/**
 * Display combat result
 */
function displayCombatResult(result, leftStats, rightStats) {
    const resultDiv = document.getElementById('combat-result');
    if (!resultDiv) return;
    
    let winnerText = '';
    let winnerClass = '';
    let details = '';
    
    // Interpret result
    if (result === 'left' || result === true || result === 1) {
        winnerText = '🏆 Left Fleet Wins!';
        winnerClass = 'winner-left';
        details = `Left fleet dominated with superior firepower`;
    } else if (result === 'right' || result === false || result === 0) {
        winnerText = '🏆 Right Fleet Wins!';
        winnerClass = 'winner-right';
        details = `Right fleet emerged victorious`;
    } else if (result === 'draw' || result === null) {
        winnerText = '🤝 Draw!';
        winnerClass = 'winner-draw';
        details = `Both fleets are evenly matched`;
    } else {
        // Custom result
        winnerText = `Result: ${result}`;
        winnerClass = '';
        details = `Formula returned: ${result}`;
    }
    
    resultDiv.innerHTML = `
        <div class="combat-winner ${winnerClass}">${winnerText}</div>
        <div class="combat-details">${details}</div>
        <div class="combat-stats-summary">
            <div>Left Fleet: ${window.combatSimulator.leftFleet.length} ships</div>
            <div>Right Fleet: ${window.combatSimulator.rightFleet.length} ships</div>
        </div>
    `;
    resultDiv.style.display = 'block';
}

/**
 * Save combat formula
 */
function saveCombatFormula() {
    localStorage.setItem('combatSimulatorFormula', window.combatSimulator.formula);
    alert('Combat formula saved!');
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
        
        // Hide result
        const resultDiv = document.getElementById('combat-result');
        if (resultDiv) {
            resultDiv.style.display = 'none';
        }
    }
}

// === MODULE EXPORT ===
window.CombatSimulator = {
    init: initCombatSimulator,
    open: openCombatSimulator,
    close: closeCombatSimulator,
    addShipToFleet: addShipToFleet,
    removeShipFromFleet: removeShipFromFleet,
    runSimulation: runCombatSimulation,
    clearFleets: clearAllFleets
};

// Export individual functions for backward compatibility
window.initCombatSimulator = initCombatSimulator;
window.openCombatSimulator = openCombatSimulator;
window.closeCombatSimulator = closeCombatSimulator;
window.addShipToFleet = addShipToFleet;
window.removeShipFromFleet = removeShipFromFleet;
window.updateFleetShipConfig = updateFleetShipConfig;
window.runCombatSimulation = runCombatSimulation;
window.clearAllFleets = clearAllFleets;
window.handleFormulaInput = handleFormulaInput;
window.handleFormulaKeydown = handleFormulaKeydown;
window.saveCombatFormula = saveCombatFormula;

console.log('Combat Simulator module loaded successfully'); 