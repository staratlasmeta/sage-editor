// === MODULE: Configuration Pattern Builder ===
// This module allows users to create reusable patterns for generating ship configurations
// Uses "Tier One" configuration as the source of truth for available slots
// Dependencies: Requires app.js, component-management.js, and config-management.js

// Helper function to ensure findComponentById is available
function ensureFindComponentById() {
    if (typeof findComponentById === 'undefined' || !findComponentById) {
        // Define a local version that searches the component tree
        window.findComponentById = function(componentId) {
            if (!components || !components.rewardTree) return null;
            
            // Helper function to recursively search through the reward tree
            function searchInNode(node) {
                if (node.id && node.id.toString() === componentId.toString()) return node;
                
                if (node.children && node.children.length > 0) {
                    for (const child of node.children) {
                        const found = searchInNode(child);
                        if (found) return found;
                    }
                }
                
                return null;
            }
            
            // Try componentsById map first
            if (components.componentsById && components.componentsById[componentId]) {
                return components.componentsById[componentId];
            }
            
            // Search through all top-level categories
            for (const category of components.rewardTree) {
                const found = searchInNode(category);
                if (found) return found;
            }
            
            return null;
        };
    }
}

// Pattern action types
const PATTERN_ACTIONS = {
    REMOVE_ALL: 'remove_all',           // Remove all components of a specific type
    REMOVE_SPECIFIC: 'remove_specific', // Remove specific component by ID
    CONVERT_SLOT: 'convert_slot',       // Convert slot from one type to another
    FILL_EMPTY: 'fill_empty',          // Fill empty slots with specific component
    UPGRADE_TIER: 'upgrade_tier',       // Upgrade components to higher tier
    DOWNGRADE_TIER: 'downgrade_tier',   // Downgrade components to lower tier
    SWAP_TYPE: 'swap_type',            // Swap one component type for another
    DUPLICATE_SLOTS: 'duplicate_slots', // Duplicate existing slots
    SET_QUANTITY: 'set_quantity',       // Set exact number of slots for a type
    APPLY_RATIO: 'apply_ratio',        // Apply ratio-based distribution
    FILL_PROPORTIONAL: 'fill_proportional' // Fill slots proportionally with multiple component types
};

// Store for user-defined patterns
let configPatterns = [];
let currentPattern = null;
let patternBeingEdited = null;
const PATTERN_VERSION = '7.6'; // Simplified config names to just pattern names (removed "Tier One -" prefix and tier indicators)

/**
 * Initialize the pattern builder UI in the components panel
 */
function initPatternBuilder() {
    console.log('Initializing Configuration Pattern Builder');
    
    // Ensure findComponentById is available
    ensureFindComponentById();
    
    // Load saved patterns from localStorage
    loadSavedPatterns();
    
    // Hook into the openComponentsPanel function to add our button
    const originalOpenComponentsPanel = window.openComponentsPanel;
    window.openComponentsPanel = function(shipId, configIndex, shipIdentifier) {
        // Call the original function
        originalOpenComponentsPanel.apply(this, arguments);
        
        // Add pattern builder button after panel opens
        setTimeout(() => {
            addPatternBuilderButton();
        }, 100);
    };
}

/**
 * Add pattern builder button to the components panel
 */
function addPatternBuilderButton() {
    // Check if button already exists
    if (document.getElementById('pattern-builder-btn')) {
        return;
    }
    
    // Find the components panel controls
    const componentsPanelControls = document.querySelector('.components-panel-controls');
    if (!componentsPanelControls) {
        console.log('Components panel controls not found');
        return;
    }
    
    // Find the Import CSV button
    const importButtons = componentsPanelControls.querySelectorAll('.header-button');
    let importBtn = null;
    
    for (const button of importButtons) {
        if (button.textContent === 'Import CSV') {
            importBtn = button;
            break;
        }
    }
    
    if (!importBtn) {
        console.log('Import CSV button not found');
        return;
    }
    
    // Create pattern builder button
    const patternBuilderBtn = document.createElement('button');
    patternBuilderBtn.id = 'pattern-builder-btn';
    patternBuilderBtn.className = 'header-button';
    patternBuilderBtn.textContent = '🔧 Pattern Builder';
    patternBuilderBtn.title = 'Create configuration patterns based on Tier One';
    patternBuilderBtn.addEventListener('click', togglePatternBuilder);
    
    // Insert before import CSV button
    componentsPanelControls.insertBefore(patternBuilderBtn, importBtn);
    console.log('Pattern Builder button added');
}

// Pattern builder panel creation removed - now we replace stats column content directly

/**
 * Toggle pattern builder panel visibility
 */
function togglePatternBuilder() {
    const statsColumn = document.querySelector('.stats-column');
    
    if (!statsColumn) {
        console.error('Stats column not found');
        return;
    }
    
    // Check if pattern builder is currently shown
    const isPatternBuilderShown = statsColumn.querySelector('#pattern-builder-content');
    
    if (!isPatternBuilderShown) {
        // Store the original content
        if (!window.originalStatsContent) {
            window.originalStatsContent = statsColumn.innerHTML;
        }
        
        // Replace stats content with pattern builder
        statsColumn.innerHTML = createPatternBuilderContent();
        
        // Check for Tier One config
        checkTierOneConfig();
        
        // Update test config dropdown
        updateTestConfigDropdown();
    } else {
        // Restore original stats content
        closePatternBuilder();
    }
}

/**
 * Close pattern builder panel
 */
function closePatternBuilder() {
    const statsColumn = document.querySelector('.stats-column');
    
    if (statsColumn && window.originalStatsContent) {
        // Restore the original stats content
        statsColumn.innerHTML = window.originalStatsContent;
        
        // Clear the stored content so it gets refreshed next time
        window.originalStatsContent = null;
        
        // Re-initialize any event listeners for the stats if needed
        // (The stats should handle their own event listeners on creation)
    }
}

/**
 * Create pattern builder content HTML
 */
function createPatternBuilderContent() {
    return `
        <div id="pattern-builder-content">
            <div class="pattern-builder-header">
                <h3>Pattern Builder</h3>
                <button class="close-button" onclick="closePatternBuilder()">&times;</button>
            </div>
            <div class="pattern-builder-content">
                <div class="pattern-info">
                    <p class="info-text">Create reusable patterns based on the "Tier One" configuration template.</p>
                    <div class="tier-one-status" id="tier-one-status"></div>
                </div>
                
                <div class="pattern-controls">
                    <button class="pattern-control-btn" onclick="createNewPattern()">+ New Pattern</button>
                    <button class="pattern-control-btn" onclick="loadPattern()">📁 Load Pattern</button>
                    <button class="pattern-control-btn" onclick="saveCurrentPattern()">💾 Save Pattern</button>
                </div>
                
                <div class="current-pattern-container" id="current-pattern-container" style="display: none;">
                    <div class="pattern-name-section">
                        <label>Pattern Name:</label>
                        <input type="text" id="pattern-name-input" placeholder="Enter pattern name">
                    </div>
                    
                    <div class="pattern-apply-section">
                        <button class="apply-pattern-btn" onclick="applyPatternToConfig()">✅ Apply Pattern</button>
                        <button class="apply-all-btn" onclick="applyPatternToAll()">🔄 Apply to All Configs</button>
                    </div>

                    <div class="pattern-test-section">
                        <h4>Test Pattern</h4>
                        <select id="test-config-select" class="test-config-select">
                            <option value="">Select a configuration to test on</option>
                        </select>
                        <button class="test-pattern-btn" onclick="testPattern()">🧪 Test Pattern</button>
                    </div>
                    

                    
                    <div class="pattern-actions-section">
                        <h4>Pattern Actions</h4>
                        <div id="pattern-actions-list" class="pattern-actions-list"></div>
                        <button class="add-action-btn" onclick="showAddActionDialog()">+ Add Action</button>
                    </div>
                    
                </div>
                
                <div id="pattern-results" class="pattern-results" style="display: none;"></div>
                
                <div class="batch-processing-section">
                    <h4>Batch Processing</h4>
                    <button class="batch-process-btn" onclick="batchProcessAllPatterns()">🚀 Generate All Patterns for Current Ship</button>
                    <button class="batch-process-btn batch-process-all-ships-btn" onclick="batchProcessAllShips()" style="margin-top: 10px; background: #00bcd4;">🚀 Generate All Patterns for All Ships</button>
                    <p class="batch-info">Generate all utility and combat pattern configurations from Tier One configurations.</p>
                    <div id="batch-progress" style="display: none;"></div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Check if Tier One configuration exists for current ship
 */
function checkTierOneConfig() {
    const shipId = parseInt(document.getElementById('components-container').getAttribute('data-ship-id'));
    const ship = addedShips.find(s => s.id === shipId);
    
    if (!ship) {
        updateTierOneStatus('No ship selected', 'error');
        return false;
    }
    
    const shipIdentifier = getShipIdentifier(ship);
    const tierOneConfig = findTierOneConfig(shipIdentifier);
    
    if (tierOneConfig) {
        const slotsInfo = analyzeTierOneSlots(tierOneConfig);
        updateTierOneStatus(`Tier One found: ${slotsInfo}`, 'success');
        return true;
    } else {
        updateTierOneStatus('Tier One configuration not found. Please create a config named "Tier One" first.', 'warning');
        return false;
    }
}

/**
 * Find Tier One configuration for a ship
 */
function findTierOneConfig(shipIdentifier) {
    const configs = shipConfigurations[shipIdentifier];
    if (!configs) return null;
    
    return configs.find(config => 
        config.name && config.name.toLowerCase() === 'tier one'
    );
}

/**
 * Analyze Tier One slots
 */
function analyzeTierOneSlots(tierOneConfig) {
    let totalSlots = 0;
    let detailedBreakdown = [];
    
    Object.entries(tierOneConfig.components).forEach(([category, types]) => {
        let categoryTotal = 0;
        let categoryDetails = [];
        
        Object.entries(types).forEach(([type, componentIds]) => {
            const componentArray = Array.isArray(componentIds) ? componentIds : (componentIds ? [componentIds] : []);
            const validComponents = componentArray.filter(id => id && id !== '');
            
            if (validComponents.length > 0) {
                categoryTotal += validComponents.length;
                totalSlots += validComponents.length;
                
                // Get detailed component info
                if (category === 'Ship Weapons') {
                    // Group weapons by firing cadence
                    const weaponsByCadence = {};
                    validComponents.forEach(compId => {
                        const component = findComponentById(compId);
                        if (component && component.properties) {
                            const cadence = component.properties['Firing Cadences'] || 'Unknown';
                            if (!weaponsByCadence[cadence]) {
                                weaponsByCadence[cadence] = 0;
                            }
                            weaponsByCadence[cadence]++;
                        }
                    });
                    
                    const cadenceDetails = Object.entries(weaponsByCadence)
                        .map(([cadence, count]) => `${cadence}: ${count}`)
                        .join(', ');
                    
                    categoryDetails.push(`${type}: ${validComponents.length} (${cadenceDetails})`);
                } else if (category === 'Drones') {
                    // Get specific drone names
                    const droneNames = {};
                    validComponents.forEach(compId => {
                        const component = findComponentById(compId);
                        if (component && component.properties) {
                            const droneName = component.properties['Drones'] || component.name || 'Unknown Drone';
                            if (!droneNames[droneName]) {
                                droneNames[droneName] = 0;
                            }
                            droneNames[droneName]++;
                        }
                    });
                    
                    const droneDetails = Object.entries(droneNames)
                        .map(([name, count]) => count > 1 ? `${name}: ${count}` : name)
                        .join(', ');
                    
                    categoryDetails.push(`${type}: ${validComponents.length} (${droneDetails})`);
                } else {
                    categoryDetails.push(`${type}: ${validComponents.length}`);
                }
            }
        });
        
        if (categoryTotal > 0) {
            detailedBreakdown.push(`${category} (${categoryTotal}): ${categoryDetails.join(', ')}`);
        }
    });
    
    if (detailedBreakdown.length === 0) {
        return 'No slots configured in Tier One';
    }
    
    return `${totalSlots} total slots\n${detailedBreakdown.join('\n')}`;
}

/**
 * Update Tier One status display
 */
function updateTierOneStatus(message, status) {
    const statusDiv = document.getElementById('tier-one-status');
    if (statusDiv) {
        statusDiv.className = `tier-one-status ${status}`;
        statusDiv.style.whiteSpace = 'pre-line'; // Allow line breaks
        statusDiv.textContent = message;
    }
}

/**
 * Create a new pattern
 */
function createNewPattern() {
    if (!checkTierOneConfig()) {
        alert('Tier One configuration is required to create patterns.');
        return;
    }
    
    currentPattern = {
        id: Date.now(),
        name: '',
        actions: [],
        created: new Date().toISOString()
    };
    
    document.getElementById('current-pattern-container').style.display = 'block';
    document.getElementById('pattern-name-input').value = '';
    document.getElementById('pattern-actions-list').innerHTML = '';
    document.getElementById('pattern-results').style.display = 'none';
}

/**
 * Add an action to the current pattern
 */
function addPatternAction(actionType, parameters) {
    if (!currentPattern) return;
    
    const action = {
        id: Date.now(),
        type: actionType,
        parameters: parameters
    };
    
    currentPattern.actions.push(action);
    renderPatternActions();
}

/**
 * Render pattern actions list
 */
function renderPatternActions() {
    const actionsList = document.getElementById('pattern-actions-list');
    if (!actionsList || !currentPattern) return;
    
    actionsList.innerHTML = '';
    
    currentPattern.actions.forEach((action, index) => {
        const actionDiv = document.createElement('div');
        actionDiv.className = 'pattern-action-item';
        
        const description = getActionDescription(action);
        
        actionDiv.innerHTML = `
            <div class="action-info">
                <span class="action-number">${index + 1}.</span>
                <span class="action-description">${description}</span>
            </div>
            <div class="action-controls">
                <button class="action-delete-btn" onclick="removeAction(${action.id})">🗑️</button>
                <button class="action-move-up-btn" onclick="moveActionUp(${index})" ${index === 0 ? 'disabled' : ''}>↑</button>
                <button class="action-move-down-btn" onclick="moveActionDown(${index})" ${index === currentPattern.actions.length - 1 ? 'disabled' : ''}>↓</button>
            </div>
        `;
        
        actionsList.appendChild(actionDiv);
    });
}

/**
 * Get human-readable description of an action
 */
function getActionDescription(action) {
    const params = action.parameters;
    
    switch (action.type) {
        case PATTERN_ACTIONS.REMOVE_ALL:
            return `Remove all ${params.category} - ${formatComponentType(params.componentType)}`;
            
        case PATTERN_ACTIONS.CONVERT_SLOT:
            return `Convert ${params.fromCategory} - ${formatComponentType(params.fromType)} → ${params.toCategory} - ${formatComponentType(params.toType)}`;
            
        case PATTERN_ACTIONS.FILL_EMPTY:
            return `Fill empty ${params.category} - ${formatComponentType(params.componentType)} slots with ${params.componentName || 'auto-selected component'}`;
            
        case PATTERN_ACTIONS.UPGRADE_TIER:
            return `Upgrade ${params.category} - ${formatComponentType(params.componentType)} by ${params.tierLevels} tier(s)`;
            
        case PATTERN_ACTIONS.SET_QUANTITY:
            return `Set ${params.category} - ${formatComponentType(params.componentType)} to exactly ${params.quantity} slot(s)`;
            
        case PATTERN_ACTIONS.SWAP_TYPE:
            return `Swap all ${formatComponentType(params.fromType)} with ${formatComponentType(params.toType)}`;
            
        case PATTERN_ACTIONS.FILL_PROPORTIONAL:
            const proportionStr = Object.entries(params.proportions || {})
                .map(([type, weight]) => `${type}: ${weight}%`)
                .join(', ');
            return `Fill ${params.category} proportionally (${proportionStr}${params.category === 'Ship Weapons' ? ' - or available types' : ''})`;
            
        default:
            return `${action.type} action`;
    }
}

/**
 * Format component type for display (handles weapon cadences)
 */
function formatComponentType(componentType) {
    if (componentType && componentType.includes('|')) {
        const [damageType, cadence] = componentType.split('|');
        return `${damageType} (${cadence})`;
    }
    return componentType;
}

/**
 * Show add action dialog
 */
function showAddActionDialog() {
    const dialog = createActionDialog();
    document.body.appendChild(dialog);
}

/**
 * Create action dialog UI
 */
function createActionDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'modal-container';
    dialog.innerHTML = `
        <div class="modal-content action-dialog">
            <div class="modal-header">
                <h3>Add Pattern Action</h3>
                <button class="close-button" onclick="closeActionDialog()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="action-type-select">
                    <label>Action Type:</label>
                    <select id="action-type-select" onchange="updateActionParameters()">
                        <option value="">Select an action type</option>
                        <option value="${PATTERN_ACTIONS.REMOVE_ALL}">Remove All Components of Type</option>
                        <option value="${PATTERN_ACTIONS.CONVERT_SLOT}">Convert Slot Type</option>
                        <option value="${PATTERN_ACTIONS.FILL_EMPTY}">Fill Empty Slots</option>
                        <option value="${PATTERN_ACTIONS.UPGRADE_TIER}">Upgrade Component Tier</option>
                        <option value="${PATTERN_ACTIONS.DOWNGRADE_TIER}">Downgrade Component Tier</option>
                        <option value="${PATTERN_ACTIONS.SET_QUANTITY}">Set Exact Quantity</option>
                        <option value="${PATTERN_ACTIONS.SWAP_TYPE}">Swap Component Types</option>
                    </select>
                </div>
                <div id="action-parameters" class="action-parameters"></div>
                <div class="dialog-buttons">
                    <button class="add-button" onclick="confirmAddAction()">Add Action</button>
                    <button class="cancel-button" onclick="closeActionDialog()">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    return dialog;
}

/**
 * Update action parameters based on selected type
 */
window.updateActionParameters = function() {
    const actionType = document.getElementById('action-type-select').value;
    const parametersDiv = document.getElementById('action-parameters');
    
    if (!actionType) {
        parametersDiv.innerHTML = '';
        return;
    }
    
    let html = '';
    
    switch (actionType) {
        case PATTERN_ACTIONS.REMOVE_ALL:
            html = `
                <div class="parameter-group">
                    <label>Category:</label>
                    <select id="param-category" onchange="updateComponentTypeOptions()">
                        ${getCategoryOptions()}
                    </select>
                </div>
                <div class="parameter-group">
                    <label>Component Type:</label>
                    <select id="param-component-type">
                        <option value="">Select category first</option>
                    </select>
                </div>
            `;
            break;
            
        case PATTERN_ACTIONS.CONVERT_SLOT:
            html = `
                <div class="parameter-section">
                    <h4>From:</h4>
                    <div class="parameter-group">
                        <label>Category:</label>
                        <select id="param-from-category" onchange="updateFromTypeOptions()">
                            ${getCategoryOptions()}
                        </select>
                    </div>
                    <div class="parameter-group">
                        <label>Type:</label>
                        <select id="param-from-type">
                            <option value="">Select category first</option>
                        </select>
                    </div>
                </div>
                <div class="parameter-section">
                    <h4>To:</h4>
                    <div class="parameter-group">
                        <label>Category:</label>
                        <select id="param-to-category" onchange="updateToTypeOptions()">
                            ${getCategoryOptions()}
                        </select>
                    </div>
                    <div class="parameter-group">
                        <label>Type:</label>
                        <select id="param-to-type">
                            <option value="">Select category first</option>
                        </select>
                    </div>
                </div>
            `;
            break;
            
        case PATTERN_ACTIONS.FILL_EMPTY:
            html = `
                <div class="parameter-group">
                    <label>Category:</label>
                    <select id="param-category" onchange="updateComponentTypeOptions()">
                        ${getCategoryOptions()}
                    </select>
                </div>
                <div class="parameter-group">
                    <label>Component Type:</label>
                    <select id="param-component-type">
                        <option value="">Select category first</option>
                    </select>
                </div>
                <div class="parameter-group">
                    <label>Fill Strategy:</label>
                    <select id="param-fill-strategy">
                        <option value="auto">Auto-select best component</option>
                        <option value="lowest-tier">Lowest tier available</option>
                        <option value="highest-tier">Highest tier available</option>
                        <option value="specific">Specific component</option>
                    </select>
                </div>
            `;
            break;
            
        case PATTERN_ACTIONS.UPGRADE_TIER:
        case PATTERN_ACTIONS.DOWNGRADE_TIER:
            html = `
                <div class="parameter-group">
                    <label>Category:</label>
                    <select id="param-category" onchange="updateComponentTypeOptions()">
                        ${getCategoryOptions()}
                    </select>
                </div>
                <div class="parameter-group">
                    <label>Component Type:</label>
                    <select id="param-component-type">
                        <option value="">Select category first</option>
                    </select>
                </div>
                <div class="parameter-group">
                    <label>Tier Levels:</label>
                    <input type="number" id="param-tier-levels" min="1" max="5" value="1">
                </div>
            `;
            break;
            
        case PATTERN_ACTIONS.SET_QUANTITY:
            html = `
                <div class="parameter-group">
                    <label>Category:</label>
                    <select id="param-category" onchange="updateComponentTypeOptions()">
                        ${getCategoryOptions()}
                    </select>
                </div>
                <div class="parameter-group">
                    <label>Component Type:</label>
                    <select id="param-component-type">
                        <option value="">Select category first</option>
                    </select>
                </div>
                <div class="parameter-group">
                    <label>Quantity:</label>
                    <input type="number" id="param-quantity" min="0" max="50" value="1">
                </div>
            `;
            break;
    }
    
    parametersDiv.innerHTML = html;
    
    // Initialize first category if needed
    if (document.getElementById('param-category')) {
        updateComponentTypeOptions();
    }
    if (document.getElementById('param-from-category')) {
        updateFromTypeOptions();
    }
};

/**
 * Get category options HTML
 */
function getCategoryOptions() {
    return Object.keys(componentCategories)
        .map(cat => `<option value="${cat}">${cat}</option>`)
        .join('');
}

/**
 * Update component type options based on selected category
 */
window.updateComponentTypeOptions = function() {
    const category = document.getElementById('param-category')?.value;
    const typeSelect = document.getElementById('param-component-type');
    
    if (!category || !typeSelect) return;
    
    // For weapons, we need to get firing cadences as well
    if (category === 'Ship Weapons') {
        // Get all weapon damage types
        const damageTypes = componentCategories[category] || [];
        let allOptions = [];
        
        damageTypes.forEach(damageType => {
            // Add the damage type itself
            allOptions.push(`<optgroup label="${damageType}">`);
            allOptions.push(`<option value="${damageType}">All ${damageType} Weapons</option>`);
            
            // Find firing cadences for this damage type
            const firingCadences = getWeaponFiringCadences(damageType);
            firingCadences.forEach(cadence => {
                allOptions.push(`<option value="${damageType}|${cadence}">${damageType} - ${cadence}</option>`);
            });
            
            allOptions.push('</optgroup>');
        });
        
        typeSelect.innerHTML = allOptions.length > 0 ? allOptions.join('') : '<option value="">No types available</option>';
    } else if (category === 'Drones') {
        // Get all drone types
        const droneTypes = componentCategories[category] || [];
        let allOptions = [];
        
        droneTypes.forEach(droneType => {
            // Add the drone type itself
            allOptions.push(`<optgroup label="${droneType}">`);
            allOptions.push(`<option value="${droneType}">All ${droneType}</option>`);
            
            // Find specific drones for this type
            const specificDrones = getSpecificDrones(droneType);
            specificDrones.forEach(droneName => {
                allOptions.push(`<option value="${droneType}|${droneName}">${droneType} - ${droneName}</option>`);
            });
            
            allOptions.push('</optgroup>');
        });
        
        typeSelect.innerHTML = allOptions.length > 0 ? allOptions.join('') : '<option value="">No types available</option>';
    } else {
        const types = componentCategories[category] || [];
        typeSelect.innerHTML = types.length > 0
            ? types.map(type => `<option value="${type}">${type}</option>`).join('')
            : '<option value="">No types available</option>';
    }
};

/**
 * Get weapon firing cadences for a damage type
 */
function getWeaponFiringCadences(damageType) {
    const cadences = new Set();
    
    if (!components || !components.rewardTree) return Array.from(cadences);
    
    // Find the Ship Weapons category
    const weaponsCategory = components.rewardTree.find(node => 
        node.properties && node.properties.Category === 'Ship Weapons'
    );
    
    if (!weaponsCategory || !weaponsCategory.children) return Array.from(cadences);
    
    // Find the specific damage type node
    const damageTypeNode = weaponsCategory.children.find(node =>
        node.properties && node.properties['Damage Type'] === damageType
    );
    
    if (!damageTypeNode || !damageTypeNode.children) return Array.from(cadences);
    
    // Recursively collect firing cadences
    function collectCadences(node) {
        if (node.properties && node.properties['Firing Cadences']) {
            cadences.add(node.properties['Firing Cadences']);
        }
        if (node.children) {
            node.children.forEach(child => collectCadences(child));
        }
    }
    
    collectCadences(damageTypeNode);
    
    return Array.from(cadences).sort();
}

/**
 * Get specific drone names for a drone type
 */
function getSpecificDrones(droneType) {
    const drones = new Set();
    
    if (!components || !components.rewardTree) return Array.from(drones);
    
    // Find the Drones category
    const dronesCategory = components.rewardTree.find(node => 
        node.properties && node.properties.Category === 'Drones'
    );
    
    if (!dronesCategory || !dronesCategory.children) return Array.from(drones);
    
    // Find the specific drone type node - be more flexible in matching
    const droneTypeNode = dronesCategory.children.find(node => {
        // Check node name first
        if (node.name === droneType) return true;
        
        // Check various property names that might contain the drone type
        if (node.properties) {
            return node.properties['Drone Type'] === droneType || 
                   node.properties['Type'] === droneType ||
                   node.properties['Drone Types'] === droneType ||
                   // Check if there's a single property that might be the type
                   (Object.keys(node.properties).length === 1 && 
                    Object.values(node.properties)[0] === droneType);
        }
        
        return false;
    });
    
    if (!droneTypeNode) {
        console.log(`Drone type node not found for: ${droneType}`);
        return Array.from(drones);
    }
    
    // Recursively collect drone names
    function collectDrones(node, depth = 0) {
        // Look for the "Drones" property at any level
        if (node.properties && node.properties['Drones']) {
            const droneName = node.properties['Drones'];
            drones.add(droneName);
            console.log(`Found drone at depth ${depth}: ${droneName}`);
        }
        
        // Also check the node name as a fallback
        if (node.name && !node.children && depth > 0) {
            // This might be a leaf node representing a drone
            drones.add(node.name);
            console.log(`Found drone by name at depth ${depth}: ${node.name}`);
        }
        
        // Recursively check children
        if (node.children && Array.isArray(node.children)) {
            node.children.forEach(child => collectDrones(child, depth + 1));
        }
    }
    
    console.log(`Collecting drones for type: ${droneType}`);
    collectDrones(droneTypeNode);
    
    const result = Array.from(drones).sort();
    console.log(`Found ${result.length} drones:`, result);
    
    return result;
}

/**
 * Update from type options
 */
window.updateFromTypeOptions = function() {
    const category = document.getElementById('param-from-category')?.value;
    const typeSelect = document.getElementById('param-from-type');
    
    if (!category || !typeSelect) return;
    
    // Use the same logic as updateComponentTypeOptions
    if (category === 'Ship Weapons') {
        const damageTypes = componentCategories[category] || [];
        let allOptions = [];
        
        damageTypes.forEach(damageType => {
            allOptions.push(`<optgroup label="${damageType}">`);
            allOptions.push(`<option value="${damageType}">All ${damageType} Weapons</option>`);
            
            const firingCadences = getWeaponFiringCadences(damageType);
            firingCadences.forEach(cadence => {
                allOptions.push(`<option value="${damageType}|${cadence}">${damageType} - ${cadence}</option>`);
            });
            
            allOptions.push('</optgroup>');
        });
        
        typeSelect.innerHTML = allOptions.length > 0 ? allOptions.join('') : '<option value="">No types available</option>';
    } else if (category === 'Drones') {
        const droneTypes = componentCategories[category] || [];
        let allOptions = [];
        
        droneTypes.forEach(droneType => {
            allOptions.push(`<optgroup label="${droneType}">`);
            allOptions.push(`<option value="${droneType}">All ${droneType}</option>`);
            
            const specificDrones = getSpecificDrones(droneType);
            specificDrones.forEach(droneName => {
                allOptions.push(`<option value="${droneType}|${droneName}">${droneType} - ${droneName}</option>`);
            });
            
            allOptions.push('</optgroup>');
        });
        
        typeSelect.innerHTML = allOptions.length > 0 ? allOptions.join('') : '<option value="">No types available</option>';
    } else {
        const types = componentCategories[category] || [];
        typeSelect.innerHTML = types.length > 0
            ? types.map(type => `<option value="${type}">${type}</option>`).join('')
            : '<option value="">No types available</option>';
    }
};

/**
 * Update to type options
 */
window.updateToTypeOptions = function() {
    const category = document.getElementById('param-to-category')?.value;
    const typeSelect = document.getElementById('param-to-type');
    
    if (!category || !typeSelect) return;
    
    // Use the same logic as updateComponentTypeOptions
    if (category === 'Ship Weapons') {
        const damageTypes = componentCategories[category] || [];
        let allOptions = [];
        
        damageTypes.forEach(damageType => {
            allOptions.push(`<optgroup label="${damageType}">`);
            allOptions.push(`<option value="${damageType}">All ${damageType} Weapons</option>`);
            
            const firingCadences = getWeaponFiringCadences(damageType);
            firingCadences.forEach(cadence => {
                allOptions.push(`<option value="${damageType}|${cadence}">${damageType} - ${cadence}</option>`);
            });
            
            allOptions.push('</optgroup>');
        });
        
        typeSelect.innerHTML = allOptions.length > 0 ? allOptions.join('') : '<option value="">No types available</option>';
    } else if (category === 'Drones') {
        const droneTypes = componentCategories[category] || [];
        let allOptions = [];
        
        droneTypes.forEach(droneType => {
            allOptions.push(`<optgroup label="${droneType}">`);
            allOptions.push(`<option value="${droneType}">All ${droneType}</option>`);
            
            const specificDrones = getSpecificDrones(droneType);
            specificDrones.forEach(droneName => {
                allOptions.push(`<option value="${droneType}|${droneName}">${droneType} - ${droneName}</option>`);
            });
            
            allOptions.push('</optgroup>');
        });
        
        typeSelect.innerHTML = allOptions.length > 0 ? allOptions.join('') : '<option value="">No types available</option>';
    } else {
        const types = componentCategories[category] || [];
        typeSelect.innerHTML = types.length > 0
            ? types.map(type => `<option value="${type}">${type}</option>`).join('')
            : '<option value="">No types available</option>';
    }
};

/**
 * Close action dialog
 */
window.closeActionDialog = function() {
    const dialog = document.querySelector('.modal-container');
    if (dialog) {
        document.body.removeChild(dialog);
    }
};

/**
 * Confirm and add action
 */
window.confirmAddAction = function() {
    const actionType = document.getElementById('action-type-select').value;
    if (!actionType) {
        alert('Please select an action type');
        return;
    }
    
    const parameters = {};
    
    // Gather parameters based on action type
    switch (actionType) {
        case PATTERN_ACTIONS.REMOVE_ALL:
            parameters.category = document.getElementById('param-category').value;
            parameters.componentType = document.getElementById('param-component-type').value;
            break;
            
        case PATTERN_ACTIONS.CONVERT_SLOT:
            parameters.fromCategory = document.getElementById('param-from-category').value;
            parameters.fromType = document.getElementById('param-from-type').value;
            parameters.toCategory = document.getElementById('param-to-category').value;
            parameters.toType = document.getElementById('param-to-type').value;
            break;
            
        case PATTERN_ACTIONS.FILL_EMPTY:
            parameters.category = document.getElementById('param-category').value;
            parameters.componentType = document.getElementById('param-component-type').value;
            parameters.fillStrategy = document.getElementById('param-fill-strategy').value;
            break;
            
        case PATTERN_ACTIONS.UPGRADE_TIER:
        case PATTERN_ACTIONS.DOWNGRADE_TIER:
            parameters.category = document.getElementById('param-category').value;
            parameters.componentType = document.getElementById('param-component-type').value;
            parameters.tierLevels = parseInt(document.getElementById('param-tier-levels').value);
            break;
            
        case PATTERN_ACTIONS.SET_QUANTITY:
            parameters.category = document.getElementById('param-category').value;
            parameters.componentType = document.getElementById('param-component-type').value;
            parameters.quantity = parseInt(document.getElementById('param-quantity').value);
            break;
    }
    
    addPatternAction(actionType, parameters);
    closeActionDialog();
};

/**
 * Remove an action from the pattern
 */
window.removeAction = function(actionId) {
    if (!currentPattern) return;
    
    currentPattern.actions = currentPattern.actions.filter(a => a.id !== actionId);
    renderPatternActions();
};

/**
 * Move action up in the list
 */
window.moveActionUp = function(index) {
    if (!currentPattern || index <= 0) return;
    
    const temp = currentPattern.actions[index];
    currentPattern.actions[index] = currentPattern.actions[index - 1];
    currentPattern.actions[index - 1] = temp;
    renderPatternActions();
};

/**
 * Move action down in the list
 */
window.moveActionDown = function(index) {
    if (!currentPattern || index >= currentPattern.actions.length - 1) return;
    
    const temp = currentPattern.actions[index];
    currentPattern.actions[index] = currentPattern.actions[index + 1];
    currentPattern.actions[index + 1] = temp;
    renderPatternActions();
};

/**
 * Apply pattern to current configuration
 */
window.applyPatternToConfig = function() {
    if (!currentPattern || currentPattern.actions.length === 0) {
        alert('Please add actions to the pattern first');
        return;
    }
    
    const shipId = parseInt(document.getElementById('components-container').getAttribute('data-ship-id'));
    const configIndex = parseInt(document.getElementById('components-container').getAttribute('data-config-index'));
    const ship = addedShips.find(s => s.id === shipId);
    
    if (!ship) return;
    
    const shipIdentifier = getShipIdentifier(ship);
    const result = applyPattern(currentPattern, shipIdentifier, configIndex);
    
    if (result.success) {
        alert(`Pattern applied successfully! Created new configuration: "${result.configName}"`);
        
        // Refresh the UI
        updateComparisonTable();
        
        // Close pattern builder and return to components view
        closePatternBuilder();
        
        // Open the new configuration
        const newConfigIndex = shipConfigurations[shipIdentifier].length - 1;
        openComponentsPanel(shipId, newConfigIndex, shipIdentifier);
    } else {
        alert(`Failed to apply pattern: ${result.error}`);
    }
};

/**
 * Apply pattern to all configurations
 */
window.applyPatternToAll = function() {
    if (!currentPattern || currentPattern.actions.length === 0) {
        alert('Please add actions to the pattern first');
        return;
    }
    
    const shipId = parseInt(document.getElementById('components-container').getAttribute('data-ship-id'));
    const ship = addedShips.find(s => s.id === shipId);
    
    if (!ship) return;
    
    const shipIdentifier = getShipIdentifier(ship);
    const configs = shipConfigurations[shipIdentifier] || [];
    
    if (configs.length === 0) {
        alert('No configurations found for this ship');
        return;
    }
    
    // Confirm action
    if (!confirm(`Apply pattern to all ${configs.length} configurations? This will create ${configs.length} new configurations.`)) {
        return;
    }
    
    let successCount = 0;
    let failedConfigs = [];
    
    // Apply pattern to each configuration
    configs.forEach((config, index) => {
        const result = applyPattern(currentPattern, shipIdentifier, index);
        if (result.success) {
            successCount++;
        } else {
            failedConfigs.push({
                name: config.name,
                error: result.error
            });
        }
    });
    
    // Show results
    let message = `Pattern applied to ${successCount} out of ${configs.length} configurations.`;
    if (failedConfigs.length > 0) {
        message += '\n\nFailed configurations:';
        failedConfigs.forEach(failed => {
            message += `\n- ${failed.name}: ${failed.error}`;
        });
    }
    
    alert(message);
    
    // Refresh the UI
    updateComparisonTable();
    
    // Close pattern builder and return to components view
    closePatternBuilder();
};

/**
 * Apply pattern to create new configuration
 */
function applyPattern(pattern, shipIdentifier, baseConfigIndex) {
    try {
        // Get Tier One config as source of truth
        const tierOneConfig = findTierOneConfig(shipIdentifier);
        if (!tierOneConfig) {
            return { success: false, error: 'Tier One configuration not found' };
        }
        
        // Get base configuration to work from
        const baseConfig = shipConfigurations[shipIdentifier][baseConfigIndex];
        if (!baseConfig) {
            return { success: false, error: 'Base configuration not found' };
        }
        
        // Clone the base configuration
        const newConfig = JSON.parse(JSON.stringify(baseConfig));
        
        // Generate name for new config
        // Use pattern's name if available (for batch processing), otherwise use input field
        const patternName = pattern.name || document.getElementById('pattern-name-input')?.value || 'Unnamed Pattern';
        newConfig.name = patternName;
        
        // Apply each action in sequence
        let hasFailures = false;
        let failureMessages = [];
        
        for (const action of pattern.actions) {
            const actionResult = executePatternAction(action, newConfig, tierOneConfig, shipIdentifier);
            if (!actionResult.success) {
                // Only fail the entire pattern for critical errors
                if (action.type === PATTERN_ACTIONS.FILL_EMPTY || 
                    action.type === PATTERN_ACTIONS.UPGRADE_TIER ||
                    action.type === PATTERN_ACTIONS.CONVERT_SLOT) {
                    // These are non-critical - log but continue
                    console.log(`Non-critical action skipped: ${actionResult.error || actionResult.warning}`);
                    failureMessages.push(`${getActionDescription(action)}: ${actionResult.error || actionResult.warning}`);
                } else {
                    // Critical failure - stop pattern
                    return { success: false, error: `Action failed: ${actionResult.error}` };
                }
            }
        }
        
        // Add the new configuration
        shipConfigurations[shipIdentifier].push(newConfig);
        
        return { 
            success: true, 
            configName: newConfig.name,
            configIndex: shipConfigurations[shipIdentifier].length - 1
        };
        
    } catch (error) {
        console.error('Error applying pattern:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Execute a single pattern action
 */
function executePatternAction(action, config, tierOneConfig, shipIdentifier) {
    try {
        console.log(`[Pattern] Executing action: ${action.type}`, action.parameters);
        
        switch (action.type) {
            case PATTERN_ACTIONS.REMOVE_ALL:
                return executeRemoveAll(action.parameters, config);
                
            case PATTERN_ACTIONS.CONVERT_SLOT:
                return executeConvertSlot(action.parameters, config, tierOneConfig);
                
            case PATTERN_ACTIONS.FILL_EMPTY:
                return executeFillEmpty(action.parameters, config, shipIdentifier);
                
            case PATTERN_ACTIONS.UPGRADE_TIER:
                return executeUpgradeTier(action.parameters, config, shipIdentifier);
                
            case PATTERN_ACTIONS.DOWNGRADE_TIER:
                return executeDowngradeTier(action.parameters, config, shipIdentifier);
                
            case PATTERN_ACTIONS.SET_QUANTITY:
                return executeSetQuantity(action.parameters, config, tierOneConfig);
                
            case PATTERN_ACTIONS.FILL_PROPORTIONAL:
                console.log('[Pattern] About to execute FILL_PROPORTIONAL with params:', action.parameters);
                const result = executeFillProportional(action.parameters, config, shipIdentifier);
                console.log('[Pattern] FILL_PROPORTIONAL result:', result);
                return result;
                
            default:
                return { success: false, error: `Unknown action type: ${action.type}` };
        }
    } catch (error) {
        console.error('[Pattern] Error executing action:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Execute remove all action
 */
function executeRemoveAll(params, config) {
    const { category, componentType } = params;
    
    // Handle weapon firing cadences and drone names
    let actualComponentType = componentType;
    if (componentType.includes('|')) {
        const [mainType] = componentType.split('|');
        actualComponentType = mainType;
    }
    
    if (config.components[category] && config.components[category][actualComponentType]) {
        // If we have a specific subtype (cadence or drone name), filter components
        if (componentType.includes('|')) {
            const [, subType] = componentType.split('|');
            const components = config.components[category][actualComponentType];
            
            if (Array.isArray(components)) {
                const filteredComponents = components.filter(compId => {
                    if (!compId) return true; // Keep empty slots
                    
                    const component = findComponentById(compId);
                    if (!component || !component.properties) return false;
                    
                    if (category === 'Ship Weapons') {
                        return component.properties['Firing Cadences'] !== subType;
                    } else if (category === 'Drones') {
                        return component.properties['Drones'] !== subType;
                    }
                    
                    return false;
                });
                
                config.components[category][actualComponentType] = filteredComponents;
            }
        } else {
            // Clear all components of this type
            config.components[category][actualComponentType] = [];
        }
    }
    
    return { success: true };
}

/**
 * Execute convert slot action
 */
function executeConvertSlot(params, config, tierOneConfig) {
    const { fromCategory, fromType, toCategory, toType } = params;
    
    // Extract main types from pipe-separated values
    const actualFromType = fromType.includes('|') ? fromType.split('|')[0] : fromType;
    const actualToType = toType.includes('|') ? toType.split('|')[0] : toType;
    
    // Check if Tier One allows the target slot type
    // Exception: Allow weapon type conversions regardless of Tier One (weapons are interchangeable by damage type)
    // Removed check for Tier One slots - all component types exist in the app
    // and can be converted to, even if they don't exist in the base configuration
    
    // Get components from source
    const sourceComponents = config.components[fromCategory]?.[actualFromType] || [];
    
    console.log(`[Pattern] Converting ${fromCategory} - ${actualFromType} to ${toCategory} - ${actualToType}`);
    
    // Track component classes for conversion
    let componentsToConvert = [];
    let componentClasses = [];
    
    if (fromType.includes('|')) {
        const [, subType] = fromType.split('|');
        
        if (Array.isArray(sourceComponents)) {
            sourceComponents.forEach((compId, index) => {
                if (!compId) return; // Skip empty slots
                
                const component = findComponentById(compId);
                if (!component || !component.properties) return;
                
                let matches = false;
                if (fromCategory === 'Ship Weapons') {
                    matches = component.properties['Firing Cadences'] === subType;
                } else if (fromCategory === 'Drones') {
                    matches = component.properties['Drones'] === subType;
                }
                
                if (matches) {
                    componentsToConvert.push(index);
                    componentClasses.push(component.properties?.Class || '');
                }
            });
        }
    } else {
        // Convert all non-empty components and track their classes
        sourceComponents.forEach((compId, index) => {
            if (compId) {
                const component = findComponentById(compId);
                componentsToConvert.push(index);
                componentClasses.push(component?.properties?.Class || '');
            }
        });
    }
    
    if (componentsToConvert.length === 0) {
        // No components to convert is not an error - just nothing to do
        console.log(`[Pattern] No components to convert from ${fromCategory} - ${actualFromType}`);
        return { success: true, warning: `No ${fromCategory} - ${formatComponentType(fromType)} components to convert` };
    }
    
    console.log(`[Pattern] Converting ${componentsToConvert.length} components from ${actualFromType} to ${actualToType}`);
    
    // Remove components from source (in reverse order to maintain indices)
    componentsToConvert.sort((a, b) => b - a).forEach(index => {
        sourceComponents[index] = '';
    });
    
    // Add empty slots to target
    if (!config.components[toCategory]) config.components[toCategory] = {};
    if (!config.components[toCategory][actualToType]) config.components[toCategory][actualToType] = [];
    
    // Store the component classes in a temporary metadata object
    if (!config._convertMetadata) config._convertMetadata = {};
    if (!config._convertMetadata[toCategory]) config._convertMetadata[toCategory] = {};
    if (!config._convertMetadata[toCategory][actualToType]) config._convertMetadata[toCategory][actualToType] = [];
    
    // Add empty slots and track their required classes
    // IMPORTANT: When converting to an existing type, we need to know which slots are new
    const existingSlotCount = config.components[toCategory][actualToType].length;
    for (let i = 0; i < componentClasses.length; i++) {
        config.components[toCategory][actualToType].push('');
        // Only track metadata for the new slots we're adding
        config._convertMetadata[toCategory][actualToType][existingSlotCount + i] = componentClasses[i];
    }
    
    console.log(`[Pattern] Conversion complete. Created ${componentClasses.length} empty ${actualToType} slots`);
    return { success: true };
}

/**
 * Execute fill empty slots action
 */
function executeFillEmpty(params, config, shipIdentifier) {
    const { category, componentType, fillStrategy } = params;
    
    // Get the ship to determine compatible components
    const ship = Object.values(addedShips).find(s => 
        getShipIdentifier(s) === shipIdentifier
    );
    
    if (!ship) {
        return { success: false, error: 'Ship not found' };
    }
    
    // Handle weapon firing cadences
    let actualComponentType = componentType;
    let firingCadenceFilter = null;
    
    if (category === 'Ship Weapons' && componentType.includes('|')) {
        const [damageType, cadence] = componentType.split('|');
        actualComponentType = damageType;
        firingCadenceFilter = cadence;
    }
    
    // Special handling for drones
    if (category === 'Drones') {
        // Check if ship has drone ports in Tier One config (base ship capability)
        const tierOneConfig = findTierOneConfig(shipIdentifier);
        if (!tierOneConfig) {
            return { success: false, error: 'Tier One configuration not found' };
        }
        
        const tierOneDronePorts = tierOneConfig.components['Ship Component']?.['Drone Port'] || [];
        const hasDroneCapability = tierOneDronePorts.length > 0;
        
        if (!hasDroneCapability) {
            return { success: false, error: 'Ship does not have drone capability' };
        }
        
        // Initialize drone array if it doesn't exist
        if (!config.components[category]) {
            config.components[category] = {};
        }
        if (!config.components[category][actualComponentType]) {
            config.components[category][actualComponentType] = [];
        }
        
        // Get compatible drones
        let compatibleComponents = getCompatibleComponents(category, actualComponentType, ship.Class);
        
        if (compatibleComponents.length === 0) {
            return { success: false, error: 'No compatible drones found' };
        }
        
        // Select drone based on strategy
        let selectedComponent;
        switch (fillStrategy) {
            case 'lowest-tier':
                selectedComponent = compatibleComponents.find(c => c.properties?.Tier === 'T1') || compatibleComponents[0];
                break;
                
            case 'highest-tier':
                selectedComponent = compatibleComponents[compatibleComponents.length - 1];
                break;
                
            case 'auto':
            default:
                // For auto, prefer T3 (middle tier)
                selectedComponent = compatibleComponents.find(c => c.properties?.Tier === 'T3') ||
                                  compatibleComponents.find(c => c.properties?.Tier === 'T2') ||
                                  compatibleComponents[Math.floor(compatibleComponents.length / 2)];
                break;
        }
        
        // Add at least one drone (drones auto-distribute across ports)
        if (config.components[category][actualComponentType].length === 0) {
            config.components[category][actualComponentType].push(selectedComponent.id);
        }
        
        return { success: true };
    }
    
    // Get current slots for non-drone components
    const slots = config.components[category]?.[actualComponentType] || [];
    if (!Array.isArray(slots) || slots.length === 0) {
        return { success: true, warning: 'No slots found for this component type' };
    }
    
    // Get compatible components
    let compatibleComponents = getCompatibleComponents(category, actualComponentType, ship.Class);
    
    // Filter by firing cadence if specified
    if (firingCadenceFilter) {
        compatibleComponents = compatibleComponents.filter(comp => 
            comp.properties && comp.properties['Firing Cadences'] === firingCadenceFilter
        );
    }
    
    if (compatibleComponents.length === 0) {
        return { success: false, error: 'No compatible components found' };
    }
    
    // Select component based on strategy
    let selectedComponent;
    switch (fillStrategy) {
        case 'lowest-tier':
            selectedComponent = compatibleComponents.find(c => c.properties?.Tier === 'T1') || compatibleComponents[0];
            break;
            
        case 'highest-tier':
            selectedComponent = compatibleComponents[compatibleComponents.length - 1];
            break;
            
        case 'auto':
        default:
            // For auto, prefer T3 (middle tier)
            selectedComponent = compatibleComponents.find(c => c.properties?.Tier === 'T3') ||
                              compatibleComponents.find(c => c.properties?.Tier === 'T2') ||
                              compatibleComponents[Math.floor(compatibleComponents.length / 2)];
            break;
    }
    
    // Fill empty slots
    let filledAny = false;
    
    // Check if we have class metadata from CONVERT_SLOT
    const classMetadata = config._convertMetadata?.[category]?.[actualComponentType];
    
    // Also check existing components in slots to determine what class to use
    let existingClasses = new Set();
    for (let slot of slots) {
        if (slot && slot !== '') {
            const comp = findComponentById(slot);
            if (comp && comp.properties?.Class) {
                existingClasses.add(comp.properties.Class);
            }
        }
    }
    
    // If we have a single consistent class, use it
    const preferredClass = existingClasses.size === 1 ? Array.from(existingClasses)[0] : null;
    
    for (let i = 0; i < slots.length; i++) {
        if (!slots[i] || slots[i] === '') {
            // If we have class metadata, find a component matching that class
            if (classMetadata && classMetadata[i]) {
                const requiredClass = classMetadata[i];
                const matchingComponents = compatibleComponents.filter(c => 
                    c.properties?.Class === requiredClass
                );
                
                if (matchingComponents.length > 0) {
                    // Apply fill strategy to the matching components
                    let matchingComponent;
                    switch (fillStrategy) {
                        case 'lowest-tier':
                            matchingComponent = matchingComponents.find(c => c.properties?.Tier === 'T1') || 
                                              matchingComponents[0];
                            break;
                        case 'highest-tier':
                            matchingComponent = matchingComponents.find(c => c.properties?.Tier === 'T5') || 
                                              matchingComponents[matchingComponents.length - 1];
                            break;
                        case 'auto':
                        default:
                            // For auto, prefer T3 (middle tier)
                            matchingComponent = matchingComponents.find(c => c.properties?.Tier === 'T3') ||
                                              matchingComponents.find(c => c.properties?.Tier === 'T2') ||
                                              matchingComponents[Math.floor(matchingComponents.length / 2)];
                            break;
                    }
                    
                    if (matchingComponent) {
                        slots[i] = matchingComponent.id;
                        filledAny = true;
                    } else {
                        // If no exact match with strategy, try to match size first
                        console.warn(`No component found matching class: ${requiredClass} with strategy: ${fillStrategy}. Trying to match size...`);
                        
                        // Find any component matching the required class regardless of tier
                        const sizeMatchingComponents = compatibleComponents.filter(c => 
                            c.properties?.Class === requiredClass
                        );
                        
                        if (sizeMatchingComponents.length > 0) {
                            // Select the best tier available for this size
                            let bestComponent;
                            switch (fillStrategy) {
                                case 'lowest-tier':
                                    // Find lowest tier available for this size
                                    bestComponent = sizeMatchingComponents.sort((a, b) => {
                                        const tierA = parseInt(a.properties?.Tier?.replace('T', '') || '5');
                                        const tierB = parseInt(b.properties?.Tier?.replace('T', '') || '5');
                                        return tierA - tierB;
                                    })[0];
                                    break;
                                case 'highest-tier':
                                    // Find highest tier available for this size
                                    bestComponent = sizeMatchingComponents.sort((a, b) => {
                                        const tierA = parseInt(a.properties?.Tier?.replace('T', '') || '1');
                                        const tierB = parseInt(b.properties?.Tier?.replace('T', '') || '1');
                                        return tierB - tierA;
                                    })[0];
                                    break;
                                case 'auto':
                                default:
                                    // Prefer T3, then T2, then closest to T3
                                    bestComponent = sizeMatchingComponents.find(c => c.properties?.Tier === 'T3') ||
                                                  sizeMatchingComponents.find(c => c.properties?.Tier === 'T2') ||
                                                  sizeMatchingComponents.find(c => c.properties?.Tier === 'T4') ||
                                                  sizeMatchingComponents[0];
                                    break;
                            }
                            
                            if (bestComponent) {
                                console.log(`Using ${bestComponent.properties?.Tier} component to match size ${requiredClass}`);
                                slots[i] = bestComponent.id;
                                filledAny = true;
                            } else {
                                // No component with required size found - leave empty
                                console.warn(`No component available with required size ${requiredClass}. Leaving slot empty.`);
                            }
                        } else {
                            // No size match found - DO NOT fill with wrong size
                            console.warn(`No component found with size: ${requiredClass}. Leaving slot empty.`);
                            // Don't fill this slot - better empty than wrong size
                        }
                    }
                } else {
                    // If no class match, try to find any tier with matching size
                    console.warn(`No component found matching class: ${requiredClass} at desired tier. Checking other tiers...`);
                    
                    // Find any component matching the required class regardless of tier
                    const allComponents = getCompatibleComponents(category, actualComponentType, ship.Class);
                    const sizeMatchingComponents = allComponents.filter(c => 
                        c.properties?.Class === requiredClass
                    );
                    
                    if (sizeMatchingComponents.length > 0) {
                        // Select the best tier available for this size
                        let bestComponent;
                        switch (fillStrategy) {
                            case 'lowest-tier':
                                // Find lowest tier available for this size
                                bestComponent = sizeMatchingComponents.sort((a, b) => {
                                    const tierA = parseInt(a.properties?.Tier?.replace('T', '') || '5');
                                    const tierB = parseInt(b.properties?.Tier?.replace('T', '') || '5');
                                    return tierA - tierB;
                                })[0];
                                break;
                            case 'highest-tier':
                                // Find highest tier available for this size
                                bestComponent = sizeMatchingComponents.sort((a, b) => {
                                    const tierA = parseInt(a.properties?.Tier?.replace('T', '') || '1');
                                    const tierB = parseInt(b.properties?.Tier?.replace('T', '') || '1');
                                    return tierB - tierA;
                                })[0];
                                break;
                            case 'auto':
                            default:
                                // Prefer T3, then T2, then closest to T3
                                bestComponent = sizeMatchingComponents.find(c => c.properties?.Tier === 'T3') ||
                                              sizeMatchingComponents.find(c => c.properties?.Tier === 'T2') ||
                                              sizeMatchingComponents.find(c => c.properties?.Tier === 'T4') ||
                                              sizeMatchingComponents[0];
                                    break;
                        }
                        
                        if (bestComponent) {
                            console.log(`Using ${bestComponent.properties?.Tier} component to match size ${requiredClass}`);
                            slots[i] = bestComponent.id;
                            filledAny = true;
                        } else {
                            // No component available in any tier with required size - leave empty
                            console.warn(`No component available with required size ${requiredClass} in any tier. Leaving slot empty.`);
                        }
                    } else {
                        // No size match found in all components - leave empty
                        console.warn(`No component found with size: ${requiredClass} in any tier. Leaving slot empty.`);
                    }
                }
            } else if (preferredClass) {
                // No metadata, but we have a consistent class from existing components
                const matchingComponents = compatibleComponents.filter(c => 
                    c.properties?.Class === preferredClass
                );
                
                if (matchingComponents.length > 0) {
                    // Apply fill strategy to the matching components
                    let matchingComponent;
                    switch (fillStrategy) {
                        case 'lowest-tier':
                            matchingComponent = matchingComponents.find(c => c.properties?.Tier === 'T1') || 
                                              matchingComponents[0];
                            break;
                        case 'highest-tier':
                            matchingComponent = matchingComponents.find(c => c.properties?.Tier === 'T5') || 
                                              matchingComponents[matchingComponents.length - 1];
                            break;
                        case 'auto':
                        default:
                            // For auto, prefer T3 (middle tier)
                            matchingComponent = matchingComponents.find(c => c.properties?.Tier === 'T3') ||
                                              matchingComponents.find(c => c.properties?.Tier === 'T2') ||
                                              matchingComponents[Math.floor(matchingComponents.length / 2)];
                            break;
                    }
                    
                    if (matchingComponent) {
                        slots[i] = matchingComponent.id;
                        filledAny = true;
                    } else {
                        // Fall back - try to find any tier with matching size
                        const allComponents = getCompatibleComponents(category, actualComponentType, ship.Class);
                        const anySizeMatch = allComponents.find(c => c.properties?.Class === preferredClass);
                        if (anySizeMatch) {
                            console.log(`Using ${anySizeMatch.properties?.Tier} component to match preferred size ${preferredClass}`);
                            slots[i] = anySizeMatch.id;
                            filledAny = true;
                        } else {
                            // No component with preferred size found - leave empty 
                            console.warn(`No component available with preferred size ${preferredClass}. Leaving slot empty.`);
                        }
                    }
                } else {
                    // No matching components with preferred class at desired tier
                    // Try to find any tier with matching size
                    const allComponents = getCompatibleComponents(category, actualComponentType, ship.Class);
                    const anySizeMatch = allComponents.find(c => c.properties?.Class === preferredClass);
                    if (anySizeMatch) {
                        console.log(`Using ${anySizeMatch.properties?.Tier} component to match preferred size ${preferredClass}`);
                        slots[i] = anySizeMatch.id;
                        filledAny = true;
                    } else {
                        // No component with preferred size found - leave empty 
                        console.warn(`No component available with preferred size ${preferredClass}. Leaving slot empty.`);
                    }
                }
            } else {
                // No metadata and no consistent class
                // For countermeasures and other size-sensitive components, check Tier One sizes
                const tierOneConfig = findTierOneConfig(shipIdentifier);
                if (tierOneConfig && category === 'Countermeasures') {
                    // Get all sizes from Tier One for this component type
                    const tierOneSlots = tierOneConfig.components[category]?.[actualComponentType] || [];
                    const tierOneSizes = new Set();
                    
                    for (let slot of tierOneSlots) {
                        if (slot && slot !== '') {
                            const comp = findComponentById(slot);
                            if (comp && comp.properties?.Class) {
                                tierOneSizes.add(comp.properties.Class);
                            }
                        }
                    }
                    
                    // If selectedComponent size is not in Tier One sizes, don't use it
                    if (tierOneSizes.size > 0 && selectedComponent.properties?.Class && 
                        !tierOneSizes.has(selectedComponent.properties.Class)) {
                        console.warn(`Default component has size ${selectedComponent.properties.Class} which doesn't exist in Tier One. Leaving slot empty.`);
                        // Leave slot empty - better than wrong size
                    } else {
                        // Size matches or no size info, safe to use
                        slots[i] = selectedComponent.id;
                        filledAny = true;
                    }
                } else {
                    // For non-countermeasures or when no Tier One info, use default
                    slots[i] = selectedComponent.id;
                    filledAny = true;
                }
            }
        }
    }
    
    // Clean up metadata after filling
    if (classMetadata) {
        delete config._convertMetadata[category][actualComponentType];
    }
    
    // Not filling any slots is not an error - it just means all slots are full
    return { success: true };
}

/**
 * Execute upgrade tier action
 */
function executeUpgradeTier(params, config, shipIdentifier) {
    const { category, componentType, tierLevels, matchSize = true } = params;
    
    const ship = Object.values(addedShips).find(s => 
        getShipIdentifier(s) === shipIdentifier
    );
    
    if (!ship) {
        return { success: false, error: 'Ship not found' };
    }
    
    const slots = config.components[category]?.[componentType] || [];
    if (!Array.isArray(slots) || slots.length === 0) return { success: true };
    
    for (let i = 0; i < slots.length; i++) {
        if (slots[i] && slots[i] !== '') {
            const currentComponent = findComponentById(slots[i]);
            if (currentComponent && currentComponent.properties?.Tier) {
                // Extract tier number
                const currentTierNum = parseInt(currentComponent.properties.Tier.replace('T', ''));
                const targetTierNum = Math.min(currentTierNum + tierLevels, 5); // Max T5
                const targetTier = `T${targetTierNum}`;
                
                // Find component with same type but higher tier
                const compatibleComponents = getCompatibleComponents(category, componentType, ship.Class);
                
                let upgradedComponent;
                if (matchSize && currentComponent.properties?.Class) {
                    // Match both tier and class (size)
                    upgradedComponent = compatibleComponents.find(c => 
                        c.properties?.Tier === targetTier &&
                        c.properties?.Class === currentComponent.properties?.Class
                    );
                } else {
                    // Just match tier
                    upgradedComponent = compatibleComponents.find(c => 
                        c.properties?.Tier === targetTier
                    );
                }
                
                if (upgradedComponent) {
                    slots[i] = upgradedComponent.id;
                }
            }
        }
    }
    
    return { success: true };
}

/**
 * Execute downgrade tier action
 */
function executeDowngradeTier(params, config, shipIdentifier) {
    const { category, componentType, tierLevels } = params;
    
    const ship = Object.values(addedShips).find(s => 
        getShipIdentifier(s) === shipIdentifier
    );
    
    if (!ship) {
        return { success: false, error: 'Ship not found' };
    }
    
    const slots = config.components[category]?.[componentType] || [];
    if (!Array.isArray(slots)) return { success: true };
    
    for (let i = 0; i < slots.length; i++) {
        if (slots[i] && slots[i] !== '') {
            const currentComponent = findComponentById(slots[i]);
            if (currentComponent && currentComponent.properties?.Tier) {
                // Extract tier number
                const currentTierNum = parseInt(currentComponent.properties.Tier.replace('T', ''));
                const targetTierNum = Math.max(currentTierNum - tierLevels, 1); // Min T1
                const targetTier = `T${targetTierNum}`;
                
                // Find component with same type but lower tier
                const compatibleComponents = getCompatibleComponents(category, componentType, ship.Class);
                const downgradedComponent = compatibleComponents.find(c => 
                    c.properties?.Tier === targetTier &&
                    c.properties?.Class === currentComponent.properties?.Class
                );
                
                if (downgradedComponent) {
                    slots[i] = downgradedComponent.id;
                }
            }
        }
    }
    
    return { success: true };
}

/**
 * Execute set quantity action
 */
function executeSetQuantity(params, config, tierOneConfig) {
    const { category, componentType, quantity } = params;
    
    // Check Tier One allows this type
    const tierOneSlots = tierOneConfig.components[category]?.[componentType];
    const tierOneCount = Array.isArray(tierOneSlots) ? tierOneSlots.length : (tierOneSlots ? 1 : 0);
    
    if (tierOneCount === 0) {
        return { success: false, error: `Tier One does not have ${category} - ${componentType} slots` };
    }
    
    if (quantity > tierOneCount) {
        return { success: false, error: `Cannot exceed Tier One limit of ${tierOneCount} slots` };
    }
    
    // Get current slots
    if (!config.components[category]) config.components[category] = {};
    if (!config.components[category][componentType]) config.components[category][componentType] = [];
    
    const currentSlots = config.components[category][componentType];
    const currentCount = Array.isArray(currentSlots) ? currentSlots.length : 0;
    
    if (quantity > currentCount) {
        // Add empty slots
        for (let i = currentCount; i < quantity; i++) {
            currentSlots.push('');
        }
    } else if (quantity < currentCount) {
        // Remove excess slots
        currentSlots.length = quantity;
    }
    
    return { success: true };
}

/**
 * Execute fill proportional action
 */
function executeFillProportional(params, config, shipIdentifier) {
    const { category, proportions, fillStrategy = 'auto' } = params;
    
    // Get the ship to determine compatible components
    const ship = Object.values(addedShips).find(s => 
        getShipIdentifier(s) === shipIdentifier
    );
    
    if (!ship) {
        return { success: false, error: 'Ship not found' };
    }
    
    // Validate proportions
    if (!proportions || typeof proportions !== 'object' || Object.keys(proportions).length === 0) {
        return { success: false, error: 'Invalid proportions specified' };
    }
    
    // Get all slots in the category (empty or filled)
    let allSlots = [];
    
    // For Ship Weapons, if no slots exist, recreate them from Tier One
    if (category === 'Ship Weapons') {
        const tierOneConfig = findTierOneConfig(shipIdentifier);
        if (tierOneConfig && (!config.components[category] || Object.keys(config.components[category]).length === 0)) {
            // Recreate weapon structure from Tier One
            config.components[category] = {};
            Object.entries(tierOneConfig.components[category] || {}).forEach(([weaponType, tierOneSlots]) => {
                if (Array.isArray(tierOneSlots) && tierOneSlots.length > 0) {
                    // Create empty slots matching Tier One count
                    config.components[category][weaponType] = new Array(tierOneSlots.length).fill('');
                }
            });
        }
    }
    
    // Collect all slots from all component types in the category
    Object.entries(config.components[category] || {}).forEach(([componentType, slots]) => {
        if (Array.isArray(slots)) {
            slots.forEach((slot, index) => {
                // For weapons, we want to replace ALL slots with proportional distribution
                // For other categories, only fill empty slots
                if (category === 'Ship Weapons' || !slot || slot === '') {
                    // Get the original component to preserve size/class
                    let originalSize = null;
                    let originalCadence = null;
                    
                    if (slot && slot !== '') {
                        const originalComponent = findComponentById(slot);
                        if (originalComponent && originalComponent.properties) {
                            originalSize = originalComponent.properties.Class;
                            originalCadence = originalComponent.properties['Firing Cadences'];
                        }
                    } else if (category === 'Ship Weapons') {
                        // If slot is empty, check Tier One for the original size
                        const tierOneConfig = findTierOneConfig(shipIdentifier);
                        if (tierOneConfig && tierOneConfig.components[category] && 
                            tierOneConfig.components[category][componentType] &&
                            tierOneConfig.components[category][componentType][index]) {
                            const tierOneCompId = tierOneConfig.components[category][componentType][index];
                            const tierOneComponent = findComponentById(tierOneCompId);
                            if (tierOneComponent && tierOneComponent.properties) {
                                originalSize = tierOneComponent.properties.Class;
                                originalCadence = tierOneComponent.properties['Firing Cadences'];
                            }
                        }
                    }
                    
                    allSlots.push({
                        componentType,
                        index,
                        slots, // Reference to the array
                        originalSize,
                        originalCadence,
                        isEmpty: !slot || slot === ''
                    });
                }
            });
        }
    });
    
    if (allSlots.length === 0) {
        return { success: true, warning: `No slots to fill in ${category}` };
    }
    
    // Convert proportions to cumulative distribution
    let componentTypes = Object.keys(proportions);
    
    // For Ship Weapons, verify that requested types exist and fallback if needed
    if (category === 'Ship Weapons') {
        console.log('[Pattern] Checking weapon type availability...');
        const availableTypes = [];
        const unavailableTypes = [];
        
        componentTypes.forEach(weaponType => {
            const compatible = getCompatibleComponents(category, weaponType, ship.Class);
            if (compatible.length > 0) {
                availableTypes.push(weaponType);
                console.log(`  ${weaponType}: Available (${compatible.length} weapons)`);
            } else {
                unavailableTypes.push(weaponType);
                console.log(`  ${weaponType}: NOT AVAILABLE`);
            }
        });
        
        // If none of the requested types are available, fall back to types from Tier One
        if (availableTypes.length === 0) {
            console.log('[Pattern] None of the requested weapon types are available. Checking Tier One...');
            const tierOneConfig = findTierOneConfig(shipIdentifier);
            const tierOneWeaponTypes = new Set();
            
            if (tierOneConfig && tierOneConfig.components['Ship Weapons']) {
                Object.keys(tierOneConfig.components['Ship Weapons']).forEach(weaponType => {
                    const slots = tierOneConfig.components['Ship Weapons'][weaponType];
                    if (Array.isArray(slots) && slots.length > 0 && slots.some(s => s && s !== '')) {
                        tierOneWeaponTypes.add(weaponType);
                    }
                });
            }
            
            if (tierOneWeaponTypes.size > 0) {
                console.log('[Pattern] Using weapon types from Tier One:', Array.from(tierOneWeaponTypes));
                // Create new proportions with equal distribution
                const fallbackProportions = {};
                const weight = 100 / tierOneWeaponTypes.size;
                tierOneWeaponTypes.forEach(type => {
                    fallbackProportions[type] = weight;
                });
                proportions = fallbackProportions;
                componentTypes = Object.keys(proportions);
            } else {
                return { success: false, error: 'No weapon types available for this ship' };
            }
        } else if (availableTypes.length < componentTypes.length) {
            // Some types are unavailable, redistribute their weight
            console.log('[Pattern] Some weapon types unavailable. Redistributing proportions...');
            const newProportions = {};
            const availableWeight = availableTypes.reduce((sum, type) => sum + proportions[type], 0);
            const scaleFactor = 100 / availableWeight;
            
            availableTypes.forEach(type => {
                newProportions[type] = proportions[type] * scaleFactor;
            });
            
            proportions = newProportions;
            componentTypes = availableTypes;
        }
    }
    
    const totalWeight = Object.values(proportions).reduce((sum, weight) => sum + weight, 0);
    
    if (totalWeight === 0) {
        return { success: false, error: 'Total proportion weight is zero' };
    }
    
    // Create cumulative distribution
    let cumulative = 0;
    const distribution = componentTypes.map(type => {
        cumulative += proportions[type];
        return {
            type,
            threshold: cumulative / totalWeight
        };
    });
    
    // Fill slots proportionally
    let filledCount = 0;
    
    allSlots.forEach((slot, slotIndex) => {
        // Determine which component type to use based on proportion
        const position = (slotIndex + 1) / allSlots.length;
        let selectedType = componentTypes[0]; // Default to first type
        
        for (const dist of distribution) {
            if (position <= dist.threshold) {
                selectedType = dist.type;
                break;
            }
        }
        
        // Get compatible components for this type
        const compatibleComponents = getCompatibleComponents(category, selectedType, ship.Class);
        
        if (compatibleComponents.length === 0) {
            console.warn(`No compatible components found for ${category} - ${selectedType} (Ship class: ${ship.Class})`);
            console.warn(`Make sure ${selectedType} weapons exist in the component data`);
            return;
        } else {
            console.log(`Found ${compatibleComponents.length} compatible ${selectedType} components`);
        }
        
        // For weapons, we must match size first
        let sizePrioritizedComponents = compatibleComponents;
        if (category === 'Ship Weapons' && slot.originalSize) {
            sizePrioritizedComponents = compatibleComponents.filter(c => 
                c.properties?.Class === slot.originalSize
            );
            
            if (sizePrioritizedComponents.length === 0) {
                console.warn(`No ${selectedType} weapons found for size ${slot.originalSize}. Skipping slot.`);
                return;
            }
        }
        
        // Try to match firing cadence if available
        let cadenceMatchedComponents = sizePrioritizedComponents;
        if (category === 'Ship Weapons' && slot.originalCadence) {
            const withCadence = sizePrioritizedComponents.filter(c => 
                c.properties?.['Firing Cadences'] === slot.originalCadence
            );
            if (withCadence.length > 0) {
                cadenceMatchedComponents = withCadence;
            }
        }
        
        // Select component based on fill strategy from the filtered list
        let selectedComponent;
        const componentsToChooseFrom = cadenceMatchedComponents;
        
        switch (fillStrategy) {
            case 'lowest-tier':
                selectedComponent = componentsToChooseFrom.find(c => c.properties?.Tier === 'T1') || 
                                  componentsToChooseFrom[0];
                break;
                
            case 'highest-tier':
                selectedComponent = componentsToChooseFrom.find(c => c.properties?.Tier === 'T5') || 
                                  componentsToChooseFrom[componentsToChooseFrom.length - 1];
                break;
                
            case 'auto':
            default:
                // For auto, prefer T3 (middle tier)
                selectedComponent = componentsToChooseFrom.find(c => c.properties?.Tier === 'T3') ||
                                  componentsToChooseFrom.find(c => c.properties?.Tier === 'T2') ||
                                  componentsToChooseFrom.find(c => c.properties?.Tier === 'T4') ||
                                  componentsToChooseFrom[Math.floor(componentsToChooseFrom.length / 2)];
                break;
        }
        
        // Check if we have class metadata from CONVERT_SLOT (for non-weapons)
        if (category !== 'Ship Weapons') {
            const classMetadata = config._convertMetadata?.[category]?.[slot.componentType];
            if (classMetadata && classMetadata[slot.index]) {
                const requiredClass = classMetadata[slot.index];
                const matchingComponents = componentsToChooseFrom.filter(c => 
                    c.properties?.Class === requiredClass
                );
                
                if (matchingComponents.length > 0) {
                    // Apply fill strategy to the matching components
                    switch (fillStrategy) {
                        case 'lowest-tier':
                            selectedComponent = matchingComponents.find(c => c.properties?.Tier === 'T1') || 
                                              matchingComponents[0];
                            break;
                        case 'highest-tier':
                            selectedComponent = matchingComponents.find(c => c.properties?.Tier === 'T5') || 
                                              matchingComponents[matchingComponents.length - 1];
                            break;
                        case 'auto':
                        default:
                            selectedComponent = matchingComponents.find(c => c.properties?.Tier === 'T3') ||
                                              matchingComponents.find(c => c.properties?.Tier === 'T2') ||
                                              matchingComponents.find(c => c.properties?.Tier === 'T4') ||
                                              matchingComponents[Math.floor(matchingComponents.length / 2)];
                            break;
                    }
                }
            }
        }
        
        if (selectedComponent) {
            // Fill the slot
            slot.slots[slot.index] = selectedComponent.id;
            filledCount++;
            console.log(`Filled slot ${slot.index} with ${selectedType} weapon: ${selectedComponent.name || selectedComponent.id} (ID: ${selectedComponent.id}, Size: ${selectedComponent.properties?.Class}, Tier: ${selectedComponent.properties?.Tier})`);
            
            // Verify the component can be found again
            const verifyComponent = findComponentById(selectedComponent.id);
            if (!verifyComponent) {
                console.error(`WARNING: Component ID ${selectedComponent.id} cannot be found by findComponentById!`);
            } else {
                console.log(`Verified: Component ID ${selectedComponent.id} can be found`);
            }
        } else {
            console.warn(`Could not find suitable ${selectedType} component for slot ${slot.index}`);
        }
    });
    
    // Debug: Check what's actually in the weapon slots now
    if (category === 'Ship Weapons') {
        console.log('[Pattern] Final weapon configuration:');
        Object.entries(config.components[category] || {}).forEach(([weaponType, slots]) => {
            if (Array.isArray(slots) && slots.length > 0) {
                console.log(`  ${weaponType}: ${slots.length} slots`);
                slots.forEach((slotId, index) => {
                    if (slotId) {
                        console.log(`    Slot ${index}: ID=${slotId} (type: ${typeof slotId})`);
                    }
                });
            }
        });
    }
    
    // Report what was actually used
    let message = `Filled ${filledCount} slots proportionally`;
    if (category === 'Ship Weapons' && componentTypes.length > 0) {
        const usedTypes = Object.keys(proportions);
        message += ` with ${usedTypes.join(', ')} weapons`;
    }
    
    return { 
        success: true, 
        message: message
    };
}

/**
 * Save current pattern
 */
window.saveCurrentPattern = function() {
    if (!currentPattern) {
        alert('No pattern to save');
        return;
    }
    
    const patternName = document.getElementById('pattern-name-input').value.trim();
    if (!patternName) {
        alert('Please enter a pattern name');
        return;
    }
    
    currentPattern.name = patternName;
    
    // Save to patterns array
    const existingIndex = configPatterns.findIndex(p => p.id === currentPattern.id);
    if (existingIndex >= 0) {
        configPatterns[existingIndex] = currentPattern;
    } else {
        configPatterns.push(currentPattern);
    }
    
    // Save to localStorage
    savePatterns();
    
    alert('Pattern saved successfully!');
};

// Common pattern arrays for reuse
const removeAllWeapons = [
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Weapons', componentType: 'Kinetic' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Weapons', componentType: 'Energy' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Weapons', componentType: 'EMP' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Weapons', componentType: 'Superchill' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Weapons', componentType: 'Shockwave' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Weapons', componentType: 'Gray Goo' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Weapons', componentType: 'Heat' }}
];

const removeAllMissiles = [
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Missiles', componentType: 'Explosive' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Missiles', componentType: 'Photon' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Missiles', componentType: 'EMP' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Missiles', componentType: 'Superchill' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Missiles', componentType: 'Shockwave' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Missiles', componentType: 'Gray Goo' }}
];

const removeAllCounterMeasures = [
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Countermeasures', componentType: 'Flare' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Countermeasures', componentType: 'Energy Capacitor' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Countermeasures', componentType: 'Faraday Shielding' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Countermeasures', componentType: 'Warming Plates' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Countermeasures', componentType: 'Negative REM Plating' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Countermeasures', componentType: 'Healing Nanobots' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Countermeasures', componentType: 'Fire Suppressor' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Countermeasures', componentType: 'Decoy' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Countermeasures', componentType: 'Mine' }}
];

// For repair patterns that convert TO Healing Nanobots - don't remove them!
const removeCounterMeasuresExceptHealing = [
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Countermeasures', componentType: 'Flare' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Countermeasures', componentType: 'Energy Capacitor' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Countermeasures', componentType: 'Faraday Shielding' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Countermeasures', componentType: 'Warming Plates' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Countermeasures', componentType: 'Negative REM Plating' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Countermeasures', componentType: 'Fire Suppressor' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Countermeasures', componentType: 'Decoy' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Countermeasures', componentType: 'Mine' }}
];

const removeAllDrones = [
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
    { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }}
];

// Helper function to add sequential IDs to actions
function addIds(actions, startId = 1) {
    return actions.map((action, index) => ({
        ...action,
        id: startId + index
    }));
}

/**
 * Load saved patterns from localStorage
 */
function loadSavedPatterns() {
    try {
        // Check version
        const savedVersion = localStorage.getItem('shipConfigPatternsVersion');
        const saved = localStorage.getItem('shipConfigPatterns');
        
        if (saved && savedVersion === PATTERN_VERSION) {
            configPatterns = JSON.parse(saved);
        } else {
            // Version mismatch or no saved patterns - start fresh
            console.log('Pattern version changed or no saved patterns, loading fresh patterns');
            configPatterns = [];
        }
        
        // Always force update pre-loaded patterns (remove old versions and add new ones)
        configPatterns = configPatterns.filter(p => !p.preloaded);
        
        // Add all pre-loaded patterns fresh
        console.log('Loading preloaded patterns...');
        const preloadedPatterns = getPreloadedPatterns();
        console.log('Got preloaded patterns:', preloadedPatterns.length);
        preloadedPatterns.forEach(preloadedPattern => {
            configPatterns.push(preloadedPattern);
        });
        
        console.log('Total patterns loaded:', configPatterns.length);
        
        // Save the updated patterns list with version
        localStorage.setItem('shipConfigPatternsVersion', PATTERN_VERSION);
        savePatterns();
        
    } catch (error) {
        console.error('Error loading saved patterns:', error);
        console.error('Stack trace:', error.stack);
    }
}

/**
 * Get pre-loaded pattern templates
 */
function getPreloadedPatterns() {
    const patterns = [];
    const timestamp = new Date().toISOString();
    
    // Helper function to create a pattern
    function createPattern(name, actions) {
        return {
            id: `preloaded_${name.toLowerCase().replace(/\s+/g, '_')}`,
            name: name,
            actions: actions,
            created: timestamp,
            preloaded: true
        };
    }
    

    
    // === SCANNING PATTERNS ===
    
    // Scanning Min - Only Scanner Array
    patterns.push(createPattern('Scanning Min', addIds([
        // Remove all combat-related components
        ...removeAllWeapons,
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        ...removeAllDrones,
        // Remove non-essential ship components for minimal build
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Heat Sink' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Power Core' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Ammo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Fuel Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Cargo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Passenger Module' }},
        // Ensure scanner array is present
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Scanner Array', fillStrategy: 'lowest-tier' }}
    ])));
    
    // Scanning Mid
    patterns.push(createPattern('Scanning Mid', addIds([
        // Remove combat components
        ...removeAllWeapons,
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        // Remove other drones, keep scan drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove unnecessary components - ONLY KEEP Heat Sink, Power Core, Scanner Array per template
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Ammo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Fuel Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Cargo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Passenger Module' }},
        // Upgrade existing components to T3 - only the ones we're keeping
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Scanner Array', tierLevels: 2 }},        // Fill required components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Scanner Array', fillStrategy: 'auto' }},        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Scan', fillStrategy: 'auto' }}
    ])));
    
    // Scanning Max
    patterns.push(createPattern('Scanning Max', addIds([
        // Remove combat components
        ...removeAllWeapons,
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        // Remove other drones, keep scan drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove unnecessary components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Ammo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Fuel Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Cargo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Passenger Module' }},
        // Upgrade all existing components to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Warp Drive', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Scanner Array', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Drone Port', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Shield Generator', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Cargo Module', tierLevels: 4 }},
        // Fill empty slots for max build
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Warp Drive', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Scanner Array', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Drone Port', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Shield Generator', fillStrategy: 'highest-tier' }},
        // Fill scan drones  
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Scan', fillStrategy: 'highest-tier' }}
    ])));
    
    // === SALVAGE PATTERNS ===
    
    // Salvage Min
    patterns.push(createPattern('Salvage Min', addIds([
        // Remove all combat components
        ...removeAllWeapons,
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        ...removeAllDrones,
        // Remove unnecessary components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Heat Sink' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Power Core' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Ammo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Fuel Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Cargo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Passenger Module' }},
        // Fill salvage components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Salvage Rig', fillStrategy: 'lowest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Tractor Beam', fillStrategy: 'lowest-tier' }}
    ])));
    
    // Salvage Mid
    patterns.push(createPattern('Salvage Mid', addIds([
        // Convert modules to cargo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Ammo Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        // Remove combat components
        ...removeAllWeapons,
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove unnecessary components - Keep only what's in template: Heat Sink, Power Core, Salvage Rig, Tractor Beam, Tow Rig
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Ammo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Fuel Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Passenger Module' }},
        // Upgrade existing components to T3 with size matching
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Salvage Rig', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Tractor Beam', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Tow Rig', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Cargo Module', tierLevels: 2, matchSize: true }},
        // Fill salvage components using T3 strategy
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Salvage Rig', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Tractor Beam', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Tow Rig', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Cargo Module', fillStrategy: 'auto' }},
        // Add salvage drones
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Salvage', fillStrategy: 'auto' }}
    ])));
    
    // Salvage Max
    patterns.push(createPattern('Salvage Max', addIds([
        // Convert modules to cargo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Ammo Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        // Remove combat components
        ...removeAllWeapons,
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove other utility components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Ammo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Fuel Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Passenger Module' }},
                // Upgrade existing components to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Warp Drive', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Drone Port', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Shield Generator', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Salvage Rig', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Tractor Beam', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Tow Rig', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Cargo Module', tierLevels: 4 }},
        // Fill all salvage components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Warp Drive', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Salvage Rig', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Tractor Beam', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Tow Rig', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Cargo Module', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Drone Port', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Shield Generator', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Salvage', fillStrategy: 'highest-tier' }}
    ])));
    
    // === REPAIR PATTERNS ===
    
    // Repair Min
    patterns.push(createPattern('Repair Min', addIds([
        // Convert all countermeasures to healing nanobots
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Flare',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Energy Capacitor',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Faraday Shielding',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Warming Plates',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Negative REM Plating',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Fire Suppressor',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Decoy',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Mine',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        // Remove all combat and unnecessary components
        ...removeAllWeapons,
        ...removeAllMissiles,
        ...removeAllDrones,
        // Remove non-essential components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Heat Sink' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Power Core' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Ammo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Fuel Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Cargo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Passenger Module' }},
        // Fill repair components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Repair Rig', fillStrategy: 'lowest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Countermeasures', componentType: 'Healing Nanobots', fillStrategy: 'lowest-tier' }}
    ])));    
    // Repair Mid
    patterns.push(createPattern('Repair Mid', addIds([
        // Convert all countermeasures to healing nanobots
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Flare',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Energy Capacitor',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Faraday Shielding',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Warming Plates',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Negative REM Plating',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Fire Suppressor',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Decoy',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Mine',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        // Remove combat components
        ...removeAllWeapons,
        ...removeAllMissiles,
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove unnecessary components - Keep only what's in template: Heat Sink, Power Core, Repair Rig
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Ammo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Fuel Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Cargo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Passenger Module' }},
        // Upgrade existing components to T3 with size matching
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Repair Rig', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Countermeasures', componentType: 'Healing Nanobots', tierLevels: 2, matchSize: true }},
        // Fill repair components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Repair Rig', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Countermeasures', componentType: 'Healing Nanobots', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Repair', fillStrategy: 'auto' }}
    ])));    
    // Repair Max
    patterns.push(createPattern('Repair Max', addIds([
        // Convert all countermeasures to healing nanobots
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Flare',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Energy Capacitor',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Faraday Shielding',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Warming Plates',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Negative REM Plating',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Fire Suppressor',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Decoy',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Mine',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        // Remove combat components
        ...removeAllWeapons,
        ...removeAllMissiles,
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove other utility components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Ammo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Fuel Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Cargo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Passenger Module' }},
        // Upgrade existing components to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Warp Drive', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Drone Port', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Shield Generator', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Repair Rig', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Countermeasures', componentType: 'Healing Nanobots', tierLevels: 4 }},
        // Fill all repair components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Repair Rig', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Drone Port', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Shield Generator', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Warp Drive', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Countermeasures', componentType: 'Healing Nanobots', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Repair', fillStrategy: 'highest-tier' }}
    ])));    
    // === RESCUE PATTERNS ===
    
    // Rescue Min
    patterns.push(createPattern('Rescue Min', addIds([
        // Remove all combat components
        ...removeAllWeapons,
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        ...removeAllDrones,
        // Remove non-essential components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Heat Sink' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Power Core' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Ammo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Fuel Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Cargo Module' }},
        // Fill rescue components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Rescue Rig', fillStrategy: 'lowest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Passenger Module', fillStrategy: 'lowest-tier' }}
    ])));
    
    // Rescue Mid
    patterns.push(createPattern('Rescue Mid', addIds([
        // Convert modules to passenger
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Ammo Module',
            toCategory: 'Ship Module', toType: 'Passenger Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Passenger Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Passenger Module'
        }},
        // Remove combat components
        ...removeAllWeapons,
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove unnecessary components - Keep only what's in template: Heat Sink, Power Core, Rescue Rig
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Ammo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Fuel Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Cargo Module' }},
        // Upgrade existing components to T3 with size matching
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Rescue Rig', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Passenger Module', tierLevels: 2, matchSize: true }},
        // Fill rescue components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Rescue Rig', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Passenger Module', fillStrategy: 'auto' }},        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Rescue', fillStrategy: 'auto' }}
    ])));
    
    // Rescue Max
    patterns.push(createPattern('Rescue Max', addIds([
        // Convert modules to passenger
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Ammo Module',
            toCategory: 'Ship Module', toType: 'Passenger Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Passenger Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Passenger Module'
        }},
        // Remove combat components
        ...removeAllWeapons,
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove other utility components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Ammo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Fuel Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Cargo Module' }},
                // Upgrade existing components to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Warp Drive', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Drone Port', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Shield Generator', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Rescue Rig', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Passenger Module', tierLevels: 4 }},
        // Fill all rescue components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Warp Drive', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Rescue Rig', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Passenger Module', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Drone Port', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Rescue', fillStrategy: 'highest-tier' }}
    ])));
    
    // === FAST FREIGHT PATTERNS ===
    
    // Fast Freight Min
    patterns.push(createPattern('Fast Freight Min', addIds([
        // Convert modules to fuel
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Ammo Module',
            toCategory: 'Ship Module', toType: 'Fuel Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Fuel Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Fuel Module'
        }},
        // Remove all combat components
        ...removeAllWeapons,
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        ...removeAllDrones,
        // Remove non-essential components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Heat Sink' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Power Core' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},

        // Fill speed components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', fillStrategy: 'lowest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Warp Drive', fillStrategy: 'lowest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Fuel Module', fillStrategy: 'lowest-tier' }}
    ])));
    
    // Fast Freight Mid
    patterns.push(createPattern('Fast Freight Mid', addIds([
        // Convert modules to fuel
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Ammo Module',
            toCategory: 'Ship Module', toType: 'Fuel Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Fuel Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Fuel Module'
        }},
        // Remove combat components
        ...removeAllWeapons,
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove unnecessary components - Keep only what's in template
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Ammo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Cargo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Passenger Module' }},
        // Upgrade existing components to T3 with size matching
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Warp Drive', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Tractor Beam', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Tow Rig', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Fuel Module', tierLevels: 2, matchSize: true }},
        // Fill freight components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Warp Drive', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Tractor Beam', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Tow Rig', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Fuel Module', fillStrategy: 'auto' }},        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Freight', fillStrategy: 'auto' }}
    ])));
    
    // Fast Freight Max
    patterns.push(createPattern('Fast Freight Max', addIds([
        // Convert modules to fuel
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Ammo Module',
            toCategory: 'Ship Module', toType: 'Fuel Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Fuel Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Fuel Module'
        }},
        // Remove combat components
        ...removeAllWeapons,
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove other utility components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Ammo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Cargo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Passenger Module' }},
                // Upgrade existing components to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Warp Drive', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Drone Port', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Shield Generator', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Tractor Beam', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Tow Rig', tierLevels: 4 }},
        // Upgrade modules to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Fuel Module', tierLevels: 4 }},
        // Fill all freight components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Shield Generator', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Warp Drive', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Tractor Beam', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Tow Rig', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Fuel Module', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Drone Port', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Freight', fillStrategy: 'highest-tier' }}
    ])));
    
    // === CARGO BOOST PATTERNS ===
    
    // Cargo Boost Min
    patterns.push(createPattern('Cargo Boost Min', addIds([
        // Convert modules to cargo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Ammo Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        // Remove all combat components
        ...removeAllWeapons,
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        ...removeAllDrones,
        // Remove non-essential components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Heat Sink' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Power Core' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
                 { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
         { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        // Fill cargo modules
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Cargo Module', fillStrategy: 'lowest-tier' }}
    ])));
    
    // Cargo Boost Mid
    patterns.push(createPattern('Cargo Boost Mid', addIds([
        // Convert modules to cargo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Ammo Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        // Remove combat components
        ...removeAllWeapons,
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove other utility components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Ammo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Fuel Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Passenger Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
                // Upgrade existing components to T3
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Drone Port', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Shield Generator', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Tractor Beam', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Tow Rig', tierLevels: 2 }},
        // Upgrade modules to T3
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Cargo Module', tierLevels: 2 }},
        // Fill cargo components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Tractor Beam', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Tow Rig', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Cargo Module', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Freight', fillStrategy: 'auto' }}
    ])));
    
    // Cargo Boost Max
    patterns.push(createPattern('Cargo Boost Max', addIds([
        // Convert modules to cargo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Ammo Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        // Remove combat components
        ...removeAllWeapons,
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove other utility components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Ammo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Fuel Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Passenger Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
                // Upgrade existing components to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Drone Port', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Shield Generator', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Tractor Beam', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Tow Rig', tierLevels: 4 }},
        // Upgrade modules to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Cargo Module', tierLevels: 4 }},
        // Fill all cargo components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Tractor Beam', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Tow Rig', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Cargo Module', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Drone Port', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Freight', fillStrategy: 'highest-tier' }}
    ])));
    
    // Continue with part 2...
    return patterns.concat(getPreloadedPatternsPart2());
}

/**
 * Get pre-loaded pattern templates part 2 (Mining and Combat patterns)
 */
function getPreloadedPatternsPart2() {
    const patterns = [];
    const timestamp = new Date().toISOString();
    
    // Helper function to create a pattern
    function createPattern(name, actions) {
        return {
            id: `preloaded_${name.toLowerCase().replace(/\s+/g, '_')}`,
            name: name,
            actions: actions,
            created: timestamp,
            preloaded: true
        };
    }
    
    // === MINING PATTERNS ===
    
    // Mining Min
    patterns.push(createPattern('Mining Min', addIds([
        // Convert modules to cargo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Ammo Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        // Remove all combat components
        ...removeAllWeapons,
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        ...removeAllDrones,
        // Remove non-essential components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Heat Sink' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Power Core' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        // Fill mining components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Mining Rig', fillStrategy: 'lowest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Tractor Beam', fillStrategy: 'lowest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Cargo Module', fillStrategy: 'lowest-tier' }}
    ])));
    
    // Mining Mid
    patterns.push(createPattern('Mining Mid', addIds([
        // Convert modules to cargo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Ammo Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        // Remove non-mining weapons
        ...removeAllWeapons,
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove unnecessary components - Keep only what's in template: Heat Sink, Power Core, Mining Rig, Tractor Beam
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Ammo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Fuel Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Passenger Module' }},
        // Upgrade existing components to T3 with size matching
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Mining Rig', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Tractor Beam', tierLevels: 2, matchSize: true }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Cargo Module', tierLevels: 2, matchSize: true }},
        // Fill mining components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Mining Rig', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Tractor Beam', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Cargo Module', fillStrategy: 'auto' }},        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Mining', fillStrategy: 'auto' }}
    ])));
    
    // Mining Max
    patterns.push(createPattern('Mining Max', addIds([
        // Convert modules to cargo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Ammo Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Cargo Module'
        }},
        // Convert all existing weapon types to Heat/Shockwave
        // We'll alternate between Heat and Shockwave for a roughly 50/50 split
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Kinetic',
            toCategory: 'Ship Weapons', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Energy',
            toCategory: 'Ship Weapons', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'EMP',
            toCategory: 'Ship Weapons', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Superchill',
            toCategory: 'Ship Weapons', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Gray Goo',
            toCategory: 'Ship Weapons', toType: 'Heat'
        }},
        // Remove non-weapon combat components
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove other utility components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Ammo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Fuel Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Passenger Module' }},
                // Upgrade existing components to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Warp Drive', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Drone Port', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Shield Generator', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Mining Rig', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Tractor Beam', tierLevels: 4 }},
        // Upgrade modules to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Cargo Module', tierLevels: 4 }},
        // Fill the converted weapon slots with actual weapons
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'Heat', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'Shockwave', fillStrategy: 'highest-tier' }},
        // Fill all mining components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Warp Drive', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Mining Rig', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Tractor Beam', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Cargo Module', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Drone Port', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Shield Generator', fillStrategy: 'highest-tier' }},
        // Try to add Mining Rig if the ship supports it (requires slot in Tier One)
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Mining Rig', fillStrategy: 'highest-tier' }},

        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Mining', fillStrategy: 'highest-tier' }}
    ])));
    
    // === COMBAT PATTERNS ===
    
    // --- Kinetic Damage ---
    
    // Kinetic Damage Min
    patterns.push(createPattern('Kinetic Damage Min', addIds([
        // Convert modules to ammo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        // Convert all weapons to kinetic
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Energy',
            toCategory: 'Ship Weapons', toType: 'Kinetic'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'EMP',
            toCategory: 'Ship Weapons', toType: 'Kinetic'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Superchill',
            toCategory: 'Ship Weapons', toType: 'Kinetic'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Shockwave',
            toCategory: 'Ship Weapons', toType: 'Kinetic'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Gray Goo',
            toCategory: 'Ship Weapons', toType: 'Kinetic'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Heat',
            toCategory: 'Ship Weapons', toType: 'Kinetic'
        }},
        // Remove ALL missiles, countermeasures and drones for Min tier
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        ...removeAllDrones,
        // Remove non-essential components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Heat Sink' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Power Core' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        // Fill combat components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Ammo Module', fillStrategy: 'lowest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'Kinetic', fillStrategy: 'lowest-tier' }}
    ])));
    
    // Kinetic Damage Mid
    patterns.push(createPattern('Kinetic Damage Mid', addIds([
        // Convert modules to ammo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        // Convert other weapons to kinetic
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Energy',
            toCategory: 'Ship Weapons', toType: 'Kinetic'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'EMP',
            toCategory: 'Ship Weapons', toType: 'Kinetic'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Superchill',
            toCategory: 'Ship Weapons', toType: 'Kinetic'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Shockwave',
            toCategory: 'Ship Weapons', toType: 'Kinetic'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Gray Goo',
            toCategory: 'Ship Weapons', toType: 'Kinetic'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Heat',
            toCategory: 'Ship Weapons', toType: 'Kinetic'
        }},
                // Convert all missiles to Explosive
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Photon',
            toCategory: 'Missiles', toType: 'Explosive'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'EMP',
            toCategory: 'Missiles', toType: 'Explosive'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Superchill',
            toCategory: 'Missiles', toType: 'Explosive'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Shockwave',
            toCategory: 'Missiles', toType: 'Explosive'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Gray Goo',
            toCategory: 'Missiles', toType: 'Explosive'
        }},
        // Convert all countermeasures to Flare
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Energy Capacitor',
            toCategory: 'Countermeasures', toType: 'Flare'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Faraday Shielding',
            toCategory: 'Countermeasures', toType: 'Flare'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Warming Plates',
            toCategory: 'Countermeasures', toType: 'Flare'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Negative REM Plating',
            toCategory: 'Countermeasures', toType: 'Flare'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Healing Nanobots',
            toCategory: 'Countermeasures', toType: 'Flare'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Fire Suppressor',
            toCategory: 'Countermeasures', toType: 'Flare'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Decoy',
            toCategory: 'Countermeasures', toType: 'Flare'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Mine',
            toCategory: 'Countermeasures', toType: 'Flare'
        }},
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove components NOT in Mid tier template (keep only Heat Sink, Power Core, Missile Bay)
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        // Upgrade Mid tier components to T3
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Missile Bay', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Ammo Module', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Weapons', componentType: 'Kinetic', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Countermeasures', componentType: 'Flare', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Missiles', componentType: 'Explosive', tierLevels: 2 }},
        // Fill combat components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Missile Bay', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Ammo Module', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'Kinetic', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Countermeasures', componentType: 'Flare', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Missiles', componentType: 'Explosive', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Combat Kinetic', fillStrategy: 'auto' }}
    ])));
    
    // Kinetic Damage Max
    patterns.push(createPattern('Kinetic Damage Max', addIds([
        // Convert modules to ammo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        // Convert other weapons to kinetic
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Energy',
            toCategory: 'Ship Weapons', toType: 'Kinetic'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'EMP',
            toCategory: 'Ship Weapons', toType: 'Kinetic'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Superchill',
            toCategory: 'Ship Weapons', toType: 'Kinetic'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Shockwave',
            toCategory: 'Ship Weapons', toType: 'Kinetic'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Gray Goo',
            toCategory: 'Ship Weapons', toType: 'Kinetic'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Heat',
            toCategory: 'Ship Weapons', toType: 'Kinetic'
        }},
                // Convert all missiles to Explosive
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Photon',
            toCategory: 'Missiles', toType: 'Explosive'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'EMP',
            toCategory: 'Missiles', toType: 'Explosive'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Superchill',
            toCategory: 'Missiles', toType: 'Explosive'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Shockwave',
            toCategory: 'Missiles', toType: 'Explosive'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Gray Goo',
            toCategory: 'Missiles', toType: 'Explosive'
        }},
        // Convert all countermeasures to Flare
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Energy Capacitor',
            toCategory: 'Countermeasures', toType: 'Flare'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Faraday Shielding',
            toCategory: 'Countermeasures', toType: 'Flare'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Warming Plates',
            toCategory: 'Countermeasures', toType: 'Flare'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Negative REM Plating',
            toCategory: 'Countermeasures', toType: 'Flare'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Healing Nanobots',
            toCategory: 'Countermeasures', toType: 'Flare'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Fire Suppressor',
            toCategory: 'Countermeasures', toType: 'Flare'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Decoy',
            toCategory: 'Countermeasures', toType: 'Flare'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Mine',
            toCategory: 'Countermeasures', toType: 'Flare'
        }},
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove other utility components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Fuel Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Cargo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Passenger Module' }},
                // Upgrade existing components to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Warp Drive', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Drone Port', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Shield Generator', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Missile Bay', tierLevels: 4 }},
        // Upgrade modules, weapons, countermeasures, missiles to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Ammo Module', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Weapons', componentType: 'Kinetic', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Countermeasures', componentType: 'Flare', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Missiles', componentType: 'Explosive', tierLevels: 4 }},
        // Fill all combat components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Warp Drive', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Missile Bay', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Drone Port', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Shield Generator', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Ammo Module', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'Kinetic', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Countermeasures', componentType: 'Flare', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Missiles', componentType: 'Explosive', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Combat Kinetic', fillStrategy: 'highest-tier' }}
    ])));
    
    // --- Energy Damage ---
    
    // Energy Damage Min
    patterns.push(createPattern('Energy Damage Min', addIds([
        // Convert modules to ammo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        // Convert all weapons to energy
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Kinetic',
            toCategory: 'Ship Weapons', toType: 'Energy'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'EMP',
            toCategory: 'Ship Weapons', toType: 'Energy'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Superchill',
            toCategory: 'Ship Weapons', toType: 'Energy'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Shockwave',
            toCategory: 'Ship Weapons', toType: 'Energy'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Gray Goo',
            toCategory: 'Ship Weapons', toType: 'Energy'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Heat',
            toCategory: 'Ship Weapons', toType: 'Energy'
        }},
        // Remove ALL missiles, countermeasures and drones for Min tier
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        ...removeAllDrones,
        // Remove non-essential components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Heat Sink' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Power Core' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        // Fill combat components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Ammo Module', fillStrategy: 'lowest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'Energy', fillStrategy: 'lowest-tier' }}
    ])));
    
    // Energy Damage Mid
    patterns.push(createPattern('Energy Damage Mid', addIds([
        // Convert modules to ammo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        // Convert other weapons to energy
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Kinetic',
            toCategory: 'Ship Weapons', toType: 'Energy'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'EMP',
            toCategory: 'Ship Weapons', toType: 'Energy'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Superchill',
            toCategory: 'Ship Weapons', toType: 'Energy'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Shockwave',
            toCategory: 'Ship Weapons', toType: 'Energy'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Gray Goo',
            toCategory: 'Ship Weapons', toType: 'Energy'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Heat',
            toCategory: 'Ship Weapons', toType: 'Energy'
        }},
                // Convert all missiles to Photon
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Explosive',
            toCategory: 'Missiles', toType: 'Photon'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'EMP',
            toCategory: 'Missiles', toType: 'Photon'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Superchill',
            toCategory: 'Missiles', toType: 'Photon'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Shockwave',
            toCategory: 'Missiles', toType: 'Photon'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Gray Goo',
            toCategory: 'Missiles', toType: 'Photon'
        }},
        // Convert all countermeasures to Energy Capacitor
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Flare',
            toCategory: 'Countermeasures', toType: 'Energy Capacitor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Faraday Shielding',
            toCategory: 'Countermeasures', toType: 'Energy Capacitor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Warming Plates',
            toCategory: 'Countermeasures', toType: 'Energy Capacitor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Negative REM Plating',
            toCategory: 'Countermeasures', toType: 'Energy Capacitor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Healing Nanobots',
            toCategory: 'Countermeasures', toType: 'Energy Capacitor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Fire Suppressor',
            toCategory: 'Countermeasures', toType: 'Energy Capacitor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Decoy',
            toCategory: 'Countermeasures', toType: 'Energy Capacitor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Mine',
            toCategory: 'Countermeasures', toType: 'Energy Capacitor'
        }},
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove components NOT in Mid tier template (keep only Heat Sink, Power Core, Missile Bay)
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        // Remove utility components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Fuel Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Cargo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Passenger Module' }},
        // Upgrade Mid tier components to T3
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Missile Bay', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Ammo Module', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Weapons', componentType: 'Energy', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Countermeasures', componentType: 'Energy Capacitor', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Missiles', componentType: 'Photon', tierLevels: 2 }},
        // Fill combat components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Missile Bay', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Ammo Module', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'Energy', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Countermeasures', componentType: 'Energy Capacitor', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Missiles', componentType: 'Photon', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Combat Energy', fillStrategy: 'auto' }}
    ])));
    
    // Energy Damage Max
    patterns.push(createPattern('Energy Damage Max', addIds([
        // Convert modules to ammo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        // Convert other weapons to energy
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Kinetic',
            toCategory: 'Ship Weapons', toType: 'Energy'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'EMP',
            toCategory: 'Ship Weapons', toType: 'Energy'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Superchill',
            toCategory: 'Ship Weapons', toType: 'Energy'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Shockwave',
            toCategory: 'Ship Weapons', toType: 'Energy'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Gray Goo',
            toCategory: 'Ship Weapons', toType: 'Energy'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Heat',
            toCategory: 'Ship Weapons', toType: 'Energy'
        }},
        // Convert all missiles to Photon
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Explosive',
            toCategory: 'Missiles', toType: 'Photon'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'EMP',
            toCategory: 'Missiles', toType: 'Photon'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Superchill',
            toCategory: 'Missiles', toType: 'Photon'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Shockwave',
            toCategory: 'Missiles', toType: 'Photon'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Gray Goo',
            toCategory: 'Missiles', toType: 'Photon'
        }},
        // Convert all countermeasures to Energy Capacitor
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Flare',
            toCategory: 'Countermeasures', toType: 'Energy Capacitor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Faraday Shielding',
            toCategory: 'Countermeasures', toType: 'Energy Capacitor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Warming Plates',
            toCategory: 'Countermeasures', toType: 'Energy Capacitor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Negative REM Plating',
            toCategory: 'Countermeasures', toType: 'Energy Capacitor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Healing Nanobots',
            toCategory: 'Countermeasures', toType: 'Energy Capacitor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Fire Suppressor',
            toCategory: 'Countermeasures', toType: 'Energy Capacitor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Decoy',
            toCategory: 'Countermeasures', toType: 'Energy Capacitor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Mine',
            toCategory: 'Countermeasures', toType: 'Energy Capacitor'
        }},
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove utility components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Fuel Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Cargo Module' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Module', componentType: 'Passenger Module' }},
        // Upgrade existing components to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Warp Drive', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Drone Port', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Shield Generator', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Missile Bay', tierLevels: 4 }},
        // Upgrade modules to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Ammo Module', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Weapons', componentType: 'Energy', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Countermeasures', componentType: 'Energy Capacitor', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Missiles', componentType: 'Photon', tierLevels: 4 }},
        // Fill all combat components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Warp Drive', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Missile Bay', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Drone Port', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Shield Generator', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Ammo Module', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'Energy', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Countermeasures', componentType: 'Energy Capacitor', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Missiles', componentType: 'Photon', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Combat Energy', fillStrategy: 'highest-tier' }}
    ])));
    
    // --- EMP Damage ---
    
    // EMP Damage Min
    patterns.push(createPattern('EMP Damage Min', addIds([
        // Convert modules to ammo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        // Convert all weapons to emp
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Kinetic',
            toCategory: 'Ship Weapons', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Energy',
            toCategory: 'Ship Weapons', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Superchill',
            toCategory: 'Ship Weapons', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Shockwave',
            toCategory: 'Ship Weapons', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Gray Goo',
            toCategory: 'Ship Weapons', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Heat',
            toCategory: 'Ship Weapons', toType: 'EMP'
        }},
        // Remove ALL missiles, countermeasures and drones for Min tier
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        ...removeAllDrones,
        // Remove non-essential components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Heat Sink' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Power Core' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        // Fill combat components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Ammo Module', fillStrategy: 'lowest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'EMP', fillStrategy: 'lowest-tier' }}
    ])));
    
    // EMP Damage Mid
    patterns.push(createPattern('EMP Damage Mid', addIds([
        // Convert modules to ammo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        // Convert other weapons to emp
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Kinetic',
            toCategory: 'Ship Weapons', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Energy',
            toCategory: 'Ship Weapons', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Superchill',
            toCategory: 'Ship Weapons', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Shockwave',
            toCategory: 'Ship Weapons', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Gray Goo',
            toCategory: 'Ship Weapons', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Heat',
            toCategory: 'Ship Weapons', toType: 'EMP'
        }},
        // Convert all missiles to EMP
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Explosive',
            toCategory: 'Missiles', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Photon',
            toCategory: 'Missiles', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Superchill',
            toCategory: 'Missiles', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Shockwave',
            toCategory: 'Missiles', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Gray Goo',
            toCategory: 'Missiles', toType: 'EMP'
        }},
        // Convert all countermeasures to Faraday Shielding
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Flare',
            toCategory: 'Countermeasures', toType: 'Faraday Shielding'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Energy Capacitor',
            toCategory: 'Countermeasures', toType: 'Faraday Shielding'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Warming Plates',
            toCategory: 'Countermeasures', toType: 'Faraday Shielding'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Negative REM Plating',
            toCategory: 'Countermeasures', toType: 'Faraday Shielding'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Healing Nanobots',
            toCategory: 'Countermeasures', toType: 'Faraday Shielding'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Fire Suppressor',
            toCategory: 'Countermeasures', toType: 'Faraday Shielding'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Decoy',
            toCategory: 'Countermeasures', toType: 'Faraday Shielding'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Mine',
            toCategory: 'Countermeasures', toType: 'Faraday Shielding'
        }},
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove components NOT in Mid tier template (keep only Heat Sink, Power Core, Missile Bay)
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        // Upgrade Mid tier components to T3
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Missile Bay', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Ammo Module', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Weapons', componentType: 'EMP', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Countermeasures', componentType: 'Faraday Shielding', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Missiles', componentType: 'EMP', tierLevels: 2 }},
        // Fill combat components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Missile Bay', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Ammo Module', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'EMP', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Countermeasures', componentType: 'Faraday Shielding', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Missiles', componentType: 'EMP', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Combat EMP', fillStrategy: 'auto' }}
    ])));
    
    // EMP Damage Max
    patterns.push(createPattern('EMP Damage Max', addIds([
        // Convert modules to ammo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        // Convert other weapons to emp
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Kinetic',
            toCategory: 'Ship Weapons', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Energy',
            toCategory: 'Ship Weapons', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Superchill',
            toCategory: 'Ship Weapons', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Shockwave',
            toCategory: 'Ship Weapons', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Gray Goo',
            toCategory: 'Ship Weapons', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Heat',
            toCategory: 'Ship Weapons', toType: 'EMP'
        }},
        // Convert all missiles to EMP
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Explosive',
            toCategory: 'Missiles', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Photon',
            toCategory: 'Missiles', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Superchill',
            toCategory: 'Missiles', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Shockwave',
            toCategory: 'Missiles', toType: 'EMP'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Gray Goo',
            toCategory: 'Missiles', toType: 'EMP'
        }},
        // Convert all countermeasures to Faraday Shielding
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Flare',
            toCategory: 'Countermeasures', toType: 'Faraday Shielding'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Energy Capacitor',
            toCategory: 'Countermeasures', toType: 'Faraday Shielding'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Warming Plates',
            toCategory: 'Countermeasures', toType: 'Faraday Shielding'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Negative REM Plating',
            toCategory: 'Countermeasures', toType: 'Faraday Shielding'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Healing Nanobots',
            toCategory: 'Countermeasures', toType: 'Faraday Shielding'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Fire Suppressor',
            toCategory: 'Countermeasures', toType: 'Faraday Shielding'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Decoy',
            toCategory: 'Countermeasures', toType: 'Faraday Shielding'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Mine',
            toCategory: 'Countermeasures', toType: 'Faraday Shielding'
        }},
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove utility components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        // Upgrade existing components to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Warp Drive', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Drone Port', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Shield Generator', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Missile Bay', tierLevels: 4 }},
        // Upgrade modules, weapons, countermeasures, missiles to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Ammo Module', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Weapons', componentType: 'EMP', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Countermeasures', componentType: 'Faraday Shielding', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Missiles', componentType: 'EMP', tierLevels: 4 }},
        // Fill all combat components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Warp Drive', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Missile Bay', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Drone Port', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Shield Generator', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Ammo Module', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'EMP', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Countermeasures', componentType: 'Faraday Shielding', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Missiles', componentType: 'EMP', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Combat EMP', fillStrategy: 'highest-tier' }}
    ])));
    
    // --- Superchill Damage ---
    
    // Superchill Damage Min
    patterns.push(createPattern('Superchill Damage Min', addIds([
        // Convert modules to ammo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        // Convert all weapons to superchill
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Kinetic',
            toCategory: 'Ship Weapons', toType: 'Superchill'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Energy',
            toCategory: 'Ship Weapons', toType: 'Superchill'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'EMP',
            toCategory: 'Ship Weapons', toType: 'Superchill'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Shockwave',
            toCategory: 'Ship Weapons', toType: 'Superchill'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Gray Goo',
            toCategory: 'Ship Weapons', toType: 'Superchill'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Heat',
            toCategory: 'Ship Weapons', toType: 'Superchill'
        }},
        // Remove ALL missiles, countermeasures and drones for Min tier
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        ...removeAllDrones,
        // Remove non-essential components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Heat Sink' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Power Core' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        // Fill combat components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Ammo Module', fillStrategy: 'lowest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'Superchill', fillStrategy: 'lowest-tier' }}
    ])));
    
    // Superchill Damage Mid
    patterns.push(createPattern('Superchill Damage Mid', addIds([
        // Convert modules to ammo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        // Convert other weapons to superchill
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Kinetic',
            toCategory: 'Ship Weapons', toType: 'Superchill'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Energy',
            toCategory: 'Ship Weapons', toType: 'Superchill'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'EMP',
            toCategory: 'Ship Weapons', toType: 'Superchill'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Shockwave',
            toCategory: 'Ship Weapons', toType: 'Superchill'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Gray Goo',
            toCategory: 'Ship Weapons', toType: 'Superchill'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Heat',
            toCategory: 'Ship Weapons', toType: 'Superchill'
        }},
        // Convert all missiles to Superchill
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Explosive',
            toCategory: 'Missiles', toType: 'Superchill'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Photon',
            toCategory: 'Missiles', toType: 'Superchill'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'EMP',
            toCategory: 'Missiles', toType: 'Superchill'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Gray Goo',
            toCategory: 'Missiles', toType: 'Superchill'
        }},
        // Convert all countermeasures to Warming Plates
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Flare',
            toCategory: 'Countermeasures', toType: 'Warming Plates'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Energy Capacitor',
            toCategory: 'Countermeasures', toType: 'Warming Plates'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Faraday Shielding',
            toCategory: 'Countermeasures', toType: 'Warming Plates'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Negative REM Plating',
            toCategory: 'Countermeasures', toType: 'Warming Plates'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Healing Nanobots',
            toCategory: 'Countermeasures', toType: 'Warming Plates'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Fire Suppressor',
            toCategory: 'Countermeasures', toType: 'Warming Plates'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Decoy',
            toCategory: 'Countermeasures', toType: 'Warming Plates'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Mine',
            toCategory: 'Countermeasures', toType: 'Warming Plates'
        }},
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove components NOT in Mid tier template (keep only Heat Sink, Power Core, Missile Bay)
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        // Upgrade Mid tier components to T3
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Missile Bay', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Ammo Module', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Weapons', componentType: 'Superchill', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Countermeasures', componentType: 'Warming Plates', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Missiles', componentType: 'Superchill', tierLevels: 2 }},
        // Fill combat components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Missile Bay', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Ammo Module', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'Superchill', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Countermeasures', componentType: 'Warming Plates', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Missiles', componentType: 'Superchill', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Combat Superchill', fillStrategy: 'auto' }}
    ])));
    
    // Superchill Damage Max
    patterns.push(createPattern('Superchill Damage Max', addIds([
        // Convert modules to ammo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        // Convert other weapons to superchill
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Kinetic',
            toCategory: 'Ship Weapons', toType: 'Superchill'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Energy',
            toCategory: 'Ship Weapons', toType: 'Superchill'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'EMP',
            toCategory: 'Ship Weapons', toType: 'Superchill'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Shockwave',
            toCategory: 'Ship Weapons', toType: 'Superchill'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Gray Goo',
            toCategory: 'Ship Weapons', toType: 'Superchill'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Heat',
            toCategory: 'Ship Weapons', toType: 'Superchill'
        }},
        // Convert all missiles to Superchill
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Explosive',
            toCategory: 'Missiles', toType: 'Superchill'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Photon',
            toCategory: 'Missiles', toType: 'Superchill'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'EMP',
            toCategory: 'Missiles', toType: 'Superchill'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Gray Goo',
            toCategory: 'Missiles', toType: 'Superchill'
        }},
        // Convert all countermeasures to Warming Plates
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Flare',
            toCategory: 'Countermeasures', toType: 'Warming Plates'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Energy Capacitor',
            toCategory: 'Countermeasures', toType: 'Warming Plates'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Faraday Shielding',
            toCategory: 'Countermeasures', toType: 'Warming Plates'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Negative REM Plating',
            toCategory: 'Countermeasures', toType: 'Warming Plates'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Healing Nanobots',
            toCategory: 'Countermeasures', toType: 'Warming Plates'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Fire Suppressor',
            toCategory: 'Countermeasures', toType: 'Warming Plates'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Decoy',
            toCategory: 'Countermeasures', toType: 'Warming Plates'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Mine',
            toCategory: 'Countermeasures', toType: 'Warming Plates'
        }},
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove utility components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        // Upgrade existing components to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Warp Drive', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Drone Port', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Shield Generator', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Missile Bay', tierLevels: 4 }},
        // Upgrade modules, weapons, countermeasures, missiles to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Ammo Module', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Weapons', componentType: 'Superchill', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Countermeasures', componentType: 'Warming Plates', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Missiles', componentType: 'Superchill', tierLevels: 4 }},
        // Fill all combat components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Warp Drive', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Missile Bay', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Drone Port', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Shield Generator', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Ammo Module', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'Superchill', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Countermeasures', componentType: 'Warming Plates', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Missiles', componentType: 'Superchill', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Combat Superchill', fillStrategy: 'highest-tier' }}
    ])));
    
    // --- Shockwave Damage ---
    
    // Shockwave Damage Min
    patterns.push(createPattern('Shockwave Damage Min', addIds([
        // Convert modules to ammo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        // Convert all weapons to shockwave
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Kinetic',
            toCategory: 'Ship Weapons', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Energy',
            toCategory: 'Ship Weapons', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'EMP',
            toCategory: 'Ship Weapons', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Superchill',
            toCategory: 'Ship Weapons', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Gray Goo',
            toCategory: 'Ship Weapons', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Heat',
            toCategory: 'Ship Weapons', toType: 'Shockwave'
        }},
        // Remove ALL missiles, countermeasures and drones for Min tier
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        ...removeAllDrones,
        // Remove non-essential components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Heat Sink' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Power Core' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        // Fill combat components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Ammo Module', fillStrategy: 'lowest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'Shockwave', fillStrategy: 'lowest-tier' }}
    ])));
    
    // Shockwave Damage Mid
    patterns.push(createPattern('Shockwave Damage Mid', addIds([
        // Convert modules to ammo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        // Convert other weapons to shockwave
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Kinetic',
            toCategory: 'Ship Weapons', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Energy',
            toCategory: 'Ship Weapons', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'EMP',
            toCategory: 'Ship Weapons', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Superchill',
            toCategory: 'Ship Weapons', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Gray Goo',
            toCategory: 'Ship Weapons', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Heat',
            toCategory: 'Ship Weapons', toType: 'Shockwave'
        }},
        // Convert all missiles to Shockwave
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Explosive',
            toCategory: 'Missiles', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Photon',
            toCategory: 'Missiles', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'EMP',
            toCategory: 'Missiles', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Gray Goo',
            toCategory: 'Missiles', toType: 'Shockwave'
        }},
        // Convert all countermeasures to Negative REM Plating
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Flare',
            toCategory: 'Countermeasures', toType: 'Negative REM Plating'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Energy Capacitor',
            toCategory: 'Countermeasures', toType: 'Negative REM Plating'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Faraday Shielding',
            toCategory: 'Countermeasures', toType: 'Negative REM Plating'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Warming Plates',
            toCategory: 'Countermeasures', toType: 'Negative REM Plating'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Healing Nanobots',
            toCategory: 'Countermeasures', toType: 'Negative REM Plating'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Fire Suppressor',
            toCategory: 'Countermeasures', toType: 'Negative REM Plating'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Decoy',
            toCategory: 'Countermeasures', toType: 'Negative REM Plating'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Mine',
            toCategory: 'Countermeasures', toType: 'Negative REM Plating'
        }},
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove components NOT in Mid tier template (keep only Heat Sink, Power Core, Missile Bay)
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        // Upgrade Mid tier components to T3
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Missile Bay', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Ammo Module', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Weapons', componentType: 'Shockwave', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Countermeasures', componentType: 'Negative REM Plating', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Missiles', componentType: 'Shockwave', tierLevels: 2 }},
        // Fill combat components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Missile Bay', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Ammo Module', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'Shockwave', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Countermeasures', componentType: 'Negative REM Plating', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Missiles', componentType: 'Shockwave', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Combat Shockwave', fillStrategy: 'auto' }}
    ])));
    
    // Shockwave Damage Max
    patterns.push(createPattern('Shockwave Damage Max', addIds([
        // Convert modules to ammo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        // Convert other weapons to shockwave
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Kinetic',
            toCategory: 'Ship Weapons', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Energy',
            toCategory: 'Ship Weapons', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'EMP',
            toCategory: 'Ship Weapons', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Superchill',
            toCategory: 'Ship Weapons', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Gray Goo',
            toCategory: 'Ship Weapons', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Heat',
            toCategory: 'Ship Weapons', toType: 'Shockwave'
        }},
        // Convert all missiles to Shockwave
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Explosive',
            toCategory: 'Missiles', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Photon',
            toCategory: 'Missiles', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'EMP',
            toCategory: 'Missiles', toType: 'Shockwave'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Gray Goo',
            toCategory: 'Missiles', toType: 'Shockwave'
        }},
        // Convert all countermeasures to Negative REM Plating
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Flare',
            toCategory: 'Countermeasures', toType: 'Negative REM Plating'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Energy Capacitor',
            toCategory: 'Countermeasures', toType: 'Negative REM Plating'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Faraday Shielding',
            toCategory: 'Countermeasures', toType: 'Negative REM Plating'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Warming Plates',
            toCategory: 'Countermeasures', toType: 'Negative REM Plating'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Healing Nanobots',
            toCategory: 'Countermeasures', toType: 'Negative REM Plating'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Fire Suppressor',
            toCategory: 'Countermeasures', toType: 'Negative REM Plating'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Decoy',
            toCategory: 'Countermeasures', toType: 'Negative REM Plating'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Mine',
            toCategory: 'Countermeasures', toType: 'Negative REM Plating'
        }},
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove utility components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        // Upgrade existing components to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Warp Drive', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Drone Port', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Shield Generator', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Missile Bay', tierLevels: 4 }},
        // Upgrade modules, weapons, countermeasures, missiles to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Ammo Module', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Weapons', componentType: 'Shockwave', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Countermeasures', componentType: 'Negative REM Plating', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Missiles', componentType: 'Shockwave', tierLevels: 4 }},
        // Fill all combat components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Warp Drive', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Missile Bay', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Drone Port', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Shield Generator', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Ammo Module', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'Shockwave', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Countermeasures', componentType: 'Negative REM Plating', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Missiles', componentType: 'Shockwave', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Combat Shockwave', fillStrategy: 'highest-tier' }}
    ])));
    
    // --- Gray Goo Damage ---
    
    // Gray Goo Damage Min
    patterns.push(createPattern('Gray Goo Damage Min', addIds([
        // Convert modules to ammo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        // Convert all weapons to gray goo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Kinetic',
            toCategory: 'Ship Weapons', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Energy',
            toCategory: 'Ship Weapons', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'EMP',
            toCategory: 'Ship Weapons', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Superchill',
            toCategory: 'Ship Weapons', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Shockwave',
            toCategory: 'Ship Weapons', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Heat',
            toCategory: 'Ship Weapons', toType: 'Gray Goo'
        }},
        // Remove ALL missiles, countermeasures and drones for Min tier
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        ...removeAllDrones,
        // Remove non-essential components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Heat Sink' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Power Core' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        // Fill combat components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Ammo Module', fillStrategy: 'lowest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'Gray Goo', fillStrategy: 'lowest-tier' }}
    ])));
    
    // Gray Goo Damage Mid
    patterns.push(createPattern('Gray Goo Damage Mid', addIds([
        // Convert modules to ammo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        // Convert other weapons to gray goo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Kinetic',
            toCategory: 'Ship Weapons', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Energy',
            toCategory: 'Ship Weapons', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'EMP',
            toCategory: 'Ship Weapons', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Superchill',
            toCategory: 'Ship Weapons', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Shockwave',
            toCategory: 'Ship Weapons', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Heat',
            toCategory: 'Ship Weapons', toType: 'Gray Goo'
        }},
        // Convert all missiles to Gray Goo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Explosive',
            toCategory: 'Missiles', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Photon',
            toCategory: 'Missiles', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'EMP',
            toCategory: 'Missiles', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Superchill',
            toCategory: 'Missiles', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Shockwave',
            toCategory: 'Missiles', toType: 'Gray Goo'
        }},
        // Convert all countermeasures to Healing Nanobots
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Flare',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Energy Capacitor',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Faraday Shielding',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Warming Plates',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Negative REM Plating',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        // Remove components NOT in Mid tier template (keep only Heat Sink, Power Core, Missile Bay)
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        // Upgrade Mid tier components to T3
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Missile Bay', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Ammo Module', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Weapons', componentType: 'Gray Goo', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Countermeasures', componentType: 'Healing Nanobots', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Missiles', componentType: 'Gray Goo', tierLevels: 2 }},
        // Fill combat components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Missile Bay', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Ammo Module', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'Gray Goo', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Countermeasures', componentType: 'Healing Nanobots', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Missiles', componentType: 'Gray Goo', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Combat Gray Goo', fillStrategy: 'auto' }}
    ])));
    
    // Gray Goo Damage Max
    patterns.push(createPattern('Gray Goo Damage Max', addIds([
        // Convert modules to ammo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        // Convert other weapons to gray goo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Kinetic',
            toCategory: 'Ship Weapons', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Energy',
            toCategory: 'Ship Weapons', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'EMP',
            toCategory: 'Ship Weapons', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Superchill',
            toCategory: 'Ship Weapons', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Shockwave',
            toCategory: 'Ship Weapons', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Heat',
            toCategory: 'Ship Weapons', toType: 'Gray Goo'
        }},
        // Convert all missiles to Gray Goo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Explosive',
            toCategory: 'Missiles', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Photon',
            toCategory: 'Missiles', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'EMP',
            toCategory: 'Missiles', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Superchill',
            toCategory: 'Missiles', toType: 'Gray Goo'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Shockwave',
            toCategory: 'Missiles', toType: 'Gray Goo'
        }},
        // Convert all countermeasures to Healing Nanobots
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Flare',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Energy Capacitor',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Faraday Shielding',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Warming Plates',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Negative REM Plating',
            toCategory: 'Countermeasures', toType: 'Healing Nanobots'
        }},
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        // Remove utility components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        // Upgrade existing components to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Warp Drive', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Drone Port', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Shield Generator', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Missile Bay', tierLevels: 4 }},
        // Upgrade modules, weapons, countermeasures, missiles to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Ammo Module', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Weapons', componentType: 'Gray Goo', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Countermeasures', componentType: 'Healing Nanobots', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Missiles', componentType: 'Gray Goo', tierLevels: 4 }},
        // Fill all combat components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Warp Drive', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Missile Bay', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Drone Port', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Shield Generator', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Ammo Module', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'Gray Goo', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Countermeasures', componentType: 'Healing Nanobots', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Missiles', componentType: 'Gray Goo', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Combat Gray Goo', fillStrategy: 'highest-tier' }}
    ])));
    
    // --- Heat Damage ---
    
    // Heat Damage Min
    patterns.push(createPattern('Heat Damage Min', addIds([
        // Convert modules to ammo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        // Convert all weapons to heat
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Kinetic',
            toCategory: 'Ship Weapons', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Energy',
            toCategory: 'Ship Weapons', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'EMP',
            toCategory: 'Ship Weapons', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Superchill',
            toCategory: 'Ship Weapons', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Shockwave',
            toCategory: 'Ship Weapons', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Gray Goo',
            toCategory: 'Ship Weapons', toType: 'Heat'
        }},
        // Remove ALL missiles, countermeasures and drones for Min tier
        ...removeAllMissiles,
        ...removeAllCounterMeasures,
        ...removeAllDrones,
        // Remove non-essential components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Heat Sink' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Power Core' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Missile Bay' }},
        // Fill combat components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Ammo Module', fillStrategy: 'lowest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'Heat', fillStrategy: 'lowest-tier' }}
    ])));
    
    // Heat Damage Mid
    patterns.push(createPattern('Heat Damage Mid', addIds([
        // Convert modules to ammo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        // Convert other weapons to heat
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Kinetic',
            toCategory: 'Ship Weapons', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Energy',
            toCategory: 'Ship Weapons', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'EMP',
            toCategory: 'Ship Weapons', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Superchill',
            toCategory: 'Ship Weapons', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Shockwave',
            toCategory: 'Ship Weapons', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Gray Goo',
            toCategory: 'Ship Weapons', toType: 'Heat'
        }},
        // Convert all missiles to Heat
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Explosive',
            toCategory: 'Missiles', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Photon',
            toCategory: 'Missiles', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'EMP',
            toCategory: 'Missiles', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Gray Goo',
            toCategory: 'Missiles', toType: 'Heat'
        }},
        // Convert all countermeasures to Fire Suppressor
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Flare',
            toCategory: 'Countermeasures', toType: 'Fire Suppressor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Energy Capacitor',
            toCategory: 'Countermeasures', toType: 'Fire Suppressor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Faraday Shielding',
            toCategory: 'Countermeasures', toType: 'Fire Suppressor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Warming Plates',
            toCategory: 'Countermeasures', toType: 'Fire Suppressor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Negative REM Plating',
            toCategory: 'Countermeasures', toType: 'Fire Suppressor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Healing Nanobots',
            toCategory: 'Countermeasures', toType: 'Fire Suppressor'
        }},
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove components NOT in Mid tier template (keep only Heat Sink, Power Core, Missile Bay)
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Warp Drive' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Drone Port' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Shield Generator' }},
        // Remove utility components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        // Upgrade Mid tier components to T3
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Missile Bay', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Ammo Module', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Weapons', componentType: 'Heat', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Countermeasures', componentType: 'Fire Suppressor', tierLevels: 2 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Missiles', componentType: 'Heat', tierLevels: 2 }},
        // Fill combat components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Missile Bay', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Ammo Module', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'Heat', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Countermeasures', componentType: 'Fire Suppressor', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Missiles', componentType: 'Heat', fillStrategy: 'auto' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Combat Heat', fillStrategy: 'auto' }}
    ])));
    
    // Heat Damage Max
    patterns.push(createPattern('Heat Damage Max', addIds([
        // Convert modules to ammo
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Fuel Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Cargo Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Module', fromType: 'Passenger Module',
            toCategory: 'Ship Module', toType: 'Ammo Module'
        }},
        // Convert other weapons to heat
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Kinetic',
            toCategory: 'Ship Weapons', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Energy',
            toCategory: 'Ship Weapons', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'EMP',
            toCategory: 'Ship Weapons', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Superchill',
            toCategory: 'Ship Weapons', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Shockwave',
            toCategory: 'Ship Weapons', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Ship Weapons', fromType: 'Gray Goo',
            toCategory: 'Ship Weapons', toType: 'Heat'
        }},
        // Convert all missiles to Heat
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Explosive',
            toCategory: 'Missiles', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Photon',
            toCategory: 'Missiles', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'EMP',
            toCategory: 'Missiles', toType: 'Heat'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Missiles', fromType: 'Gray Goo',
            toCategory: 'Missiles', toType: 'Heat'
        }},
        // Convert all countermeasures to Fire Suppressor
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Flare',
            toCategory: 'Countermeasures', toType: 'Fire Suppressor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Energy Capacitor',
            toCategory: 'Countermeasures', toType: 'Fire Suppressor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Faraday Shielding',
            toCategory: 'Countermeasures', toType: 'Fire Suppressor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Warming Plates',
            toCategory: 'Countermeasures', toType: 'Fire Suppressor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Negative REM Plating',
            toCategory: 'Countermeasures', toType: 'Fire Suppressor'
        }},
        { type: PATTERN_ACTIONS.CONVERT_SLOT, parameters: { 
            fromCategory: 'Countermeasures', fromType: 'Healing Nanobots',
            toCategory: 'Countermeasures', toType: 'Fire Suppressor'
        }},
        // Remove other drones
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Scan' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Salvage' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Repair' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Rescue' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Freight' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Mining' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Kinetic' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Energy' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat EMP' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Superchill' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Shockwave' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Drones', componentType: 'Combat Gray Goo' }},
        // Remove utility components
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Mining Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Salvage Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Repair Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Rescue Rig' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Scanner Array' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tractor Beam' }},
        { type: PATTERN_ACTIONS.REMOVE_ALL, parameters: { category: 'Ship Component', componentType: 'Tow Rig' }},
        // Upgrade existing components to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Heat Sink', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Power Core', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Warp Drive', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Drone Port', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Shield Generator', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Component', componentType: 'Missile Bay', tierLevels: 4 }},
        // Upgrade modules, weapons, countermeasures, missiles to T5
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Module', componentType: 'Ammo Module', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Ship Weapons', componentType: 'Heat', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Countermeasures', componentType: 'Fire Suppressor', tierLevels: 4 }},
        { type: PATTERN_ACTIONS.UPGRADE_TIER, parameters: { category: 'Missiles', componentType: 'Heat', tierLevels: 4 }},
        // Fill all combat components
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Heat Sink', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Power Core', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Subwarp Engine', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Warp Drive', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Maneuvering Thrusters', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Missile Bay', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Drone Port', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Hull Reinforcement', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Component', componentType: 'Shield Generator', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Module', componentType: 'Ammo Module', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Ship Weapons', componentType: 'Heat', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Countermeasures', componentType: 'Fire Suppressor', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Missiles', componentType: 'Heat', fillStrategy: 'highest-tier' }},
        { type: PATTERN_ACTIONS.FILL_EMPTY, parameters: { category: 'Drones', componentType: 'Combat Heat', fillStrategy: 'highest-tier' }}
    ])));
    
    return patterns;
}

/**
 * Save patterns to localStorage
 */
function savePatterns() {
    try {
        localStorage.setItem('shipConfigPatterns', JSON.stringify(configPatterns));
    } catch (error) {
        console.error('Error saving patterns:', error);
    }
}

/**
 * Load pattern dialog
 */
window.loadPattern = function() {
    // Ensure patterns are loaded
    if (configPatterns.length === 0) {
        loadSavedPatterns();
    }
    
    if (configPatterns.length === 0) {
        alert('No saved patterns found');
        return;
    }
    
    // Separate pre-loaded and custom patterns
    const preloadedPatterns = configPatterns.filter(p => p.preloaded);
    const customPatterns = configPatterns.filter(p => !p.preloaded);
    
    // Group pre-loaded patterns by category
    const utilityPatterns = preloadedPatterns.filter(p => 
        p.name.includes('Scanning') || p.name.includes('Salvage') || 
        p.name.includes('Repair') || p.name.includes('Rescue') || 
        p.name.includes('Freight') || p.name.includes('Cargo') || 
        p.name.includes('Mining')
    );
    
    const combatPatterns = preloadedPatterns.filter(p => 
        p.name.includes('Damage')
    );
    
    const dialog = document.createElement('div');
    dialog.className = 'modal-container';
    dialog.innerHTML = `
        <div class="modal-content pattern-load-dialog">
            <div class="modal-header">
                <h3>Load Pattern</h3>
                <button class="close-button" onclick="this.closest('.modal-container').remove()">&times;</button>
            </div>
            <div class="modal-body">
                ${customPatterns.length > 0 ? `
                    <div class="pattern-section">
                        <h4>Custom Patterns</h4>
                        <div class="pattern-list">
                            ${customPatterns.map(pattern => `
                                <div class="pattern-item custom-pattern">
                                    <div class="pattern-info">
                                        <strong>${pattern.name}</strong>
                                        <span class="pattern-actions-count">${pattern.actions.length} actions</span>
                                    </div>
                                    <div class="pattern-controls">
                                        <button class="load-pattern-btn" onclick="loadSelectedPattern('${pattern.id}')">Load</button>
                                        <button class="delete-pattern-btn" onclick="deletePattern('${pattern.id}')" title="Delete pattern">🗑️</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="pattern-section">
                    <h4>Pre-loaded Utility Patterns</h4>
                    <div class="pattern-list">
                        ${utilityPatterns.map(pattern => `
                            <div class="pattern-item preloaded-pattern">
                                <div class="pattern-info">
                                    <strong>${pattern.name}</strong>
                                    <span class="pattern-actions-count">${pattern.actions.length} actions</span>
                                </div>
                                <button class="load-pattern-btn" onclick="loadSelectedPattern('${pattern.id}')">Load</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="pattern-section">
                    <h4>Pre-loaded Combat Patterns</h4>
                    <div class="pattern-list">
                        ${combatPatterns.map(pattern => `
                            <div class="pattern-item preloaded-pattern">
                                <div class="pattern-info">
                                    <strong>${pattern.name}</strong>
                                    <span class="pattern-actions-count">${pattern.actions.length} actions</span>
                                </div>
                                <button class="load-pattern-btn" onclick="loadSelectedPattern('${pattern.id}')">Load</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
};

/**
 * Delete a pattern
 */
window.deletePattern = function(patternId) {
    const pattern = configPatterns.find(p => p.id.toString() === patternId.toString());
    if (!pattern) return;
    
    // Don't allow deleting pre-loaded patterns
    if (pattern.preloaded) {
        alert('Cannot delete pre-loaded patterns');
        return;
    }
    
    if (confirm(`Delete pattern "${pattern.name}"?`)) {
        configPatterns = configPatterns.filter(p => p.id.toString() !== patternId.toString());
        savePatterns();
        
        // Refresh the dialog
        document.querySelector('.modal-container').remove();
        loadPattern();
    }
};

/**
 * Load selected pattern
 */
window.loadSelectedPattern = function(patternId) {
    const pattern = configPatterns.find(p => p.id.toString() === patternId.toString());
    if (!pattern) return;
    
    currentPattern = JSON.parse(JSON.stringify(pattern)); // Deep clone
    
    // Update UI
    document.getElementById('current-pattern-container').style.display = 'block';
    document.getElementById('pattern-name-input').value = pattern.name;
    renderPatternActions();
    
    // Close dialog
    document.querySelector('.modal-container').remove();
};

/**
 * Update test config dropdown
 */
function updateTestConfigDropdown() {
    const select = document.getElementById('test-config-select');
    if (!select) return;
    
    const shipId = parseInt(document.getElementById('components-container').getAttribute('data-ship-id'));
    const ship = addedShips.find(s => s.id === shipId);
    
    if (!ship) {
        select.innerHTML = '<option value="">No ship selected</option>';
        return;
    }
    
    const shipIdentifier = getShipIdentifier(ship);
    const configs = shipConfigurations[shipIdentifier] || [];
    
    select.innerHTML = '<option value="">Select a configuration to test on</option>' +
        configs.map((config, index) => 
            `<option value="${index}">${config.name}</option>`
        ).join('');
}

/**
 * Test pattern on selected configuration
 */
window.testPattern = function() {
    const configIndex = parseInt(document.getElementById('test-config-select').value);
    if (isNaN(configIndex)) {
        alert('Please select a configuration to test on');
        return;
    }
    
    if (!currentPattern || currentPattern.actions.length === 0) {
        alert('Please add actions to the pattern first');
        return;
    }
    
    // Perform dry run
    const shipId = parseInt(document.getElementById('components-container').getAttribute('data-ship-id'));
    const ship = addedShips.find(s => s.id === shipId);
    if (!ship) return;
    
    const shipIdentifier = getShipIdentifier(ship);
    const testResult = testPatternDryRun(currentPattern, shipIdentifier, configIndex);
    
    // Display results
    displayTestResults(testResult);
};

/**
 * Perform dry run of pattern
 */
function testPatternDryRun(pattern, shipIdentifier, configIndex) {
    const results = {
        actions: [],
        summary: {
            totalChanges: 0,
            successful: 0,
            noChange: 0,
            failed: 0,
            slotsAdded: 0,
            slotsRemoved: 0,
            componentsChanged: 0
        }
    };
    
    // Get configs
    const baseConfig = shipConfigurations[shipIdentifier][configIndex];
    const tierOneConfig = findTierOneConfig(shipIdentifier);
    
    if (!baseConfig || !tierOneConfig) {
        results.error = 'Configuration not found';
        return results;
    }
    
    // Clone config for testing
    const testConfig = JSON.parse(JSON.stringify(baseConfig));
    
    // Execute each action and record results
    for (const action of pattern.actions) {
        const beforeState = JSON.stringify(testConfig.components);
        const actionResult = executePatternAction(action, testConfig, tierOneConfig, shipIdentifier);
        const afterState = JSON.stringify(testConfig.components);
        
        results.actions.push({
            description: getActionDescription(action),
            success: actionResult.success,
            error: actionResult.error,
            warning: actionResult.warning,
            changed: beforeState !== afterState
        });
        
        if (actionResult.success) {
            if (beforeState !== afterState) {
                results.summary.totalChanges++;
                results.summary.successful++;
            } else {
                results.summary.noChange++;
            }
        } else {
            results.summary.failed++;
        }
    }
    
    return results;
}

/**
 * Display test results
 */
function displayTestResults(results) {
    const resultsDiv = document.getElementById('pattern-results');
    if (!resultsDiv) return;
    
    let html = '<h4>Test Results</h4>';
    
    if (results.error) {
        html += `<div class="test-error">${results.error}</div>`;
    } else {
        html += '<div class="test-summary">';
        html += `<p><strong>Total changes: ${results.summary.totalChanges}</strong></p>`;
        html += `<p style="color: #4ade80;">✓ Successful: ${results.summary.successful}</p>`;
        html += `<p style="color: #9ca3af;">- No change: ${results.summary.noChange}</p>`;
        html += `<p style="color: #f87171;">✗ Failed: ${results.summary.failed}</p>`;
        html += '</div>';
        
        html += '<div class="test-actions">';
        results.actions.forEach((result, index) => {
            const statusClass = result.success ? (result.changed ? 'success' : 'no-change') : 'error';
            html += `
                <div class="test-action-result ${statusClass}">
                    <span class="action-number">${index + 1}.</span>
                    <span class="action-desc">${result.description}</span>
                    <span class="action-status">${
                        result.success ? (result.changed ? '✓ Applied' : '- No change') : '✗ Failed'
                    }</span>
                    ${result.error ? `<div class="action-error">${result.error}</div>` : ''}
                    ${result.warning ? `<div class="action-warning" style="color: #fbbf24; font-size: 12px; margin-top: 2px;">${result.warning}</div>` : ''}
                </div>
            `;
        });
        html += '</div>';
    }
    
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';
}

// Add styles for the pattern builder
const patternBuilderStyles = `
<style>
.pattern-builder-panel {
    padding: 15px 20px;
    overflow-y: auto;
    max-height: calc(100vh - 150px);
}

.pattern-builder-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.pattern-info {
    background: var(--background-secondary);
    padding: 12px 15px;
    border-radius: 5px;
    margin-bottom: 15px;
}

.info-text {
    margin: 0 0 10px 0;
    color: var(--secondary-text-color);
}

.tier-one-status {
    padding: 10px 14px;
    border-radius: 3px;
    font-size: 13px;
    line-height: 1.5;
}

.tier-one-status.success {
    background: #1a3d1a;
    color: #4ade80;
    border: 1px solid #4ade80;
}

.tier-one-status.warning {
    background: #3d2f1a;
    color: #fbbf24;
    border: 1px solid #fbbf24;
}

.tier-one-status.error {
    background: #3d1a1a;
    color: #f87171;
    border: 1px solid #f87171;
}

.pattern-controls {
    display: flex;
    gap: 8px;
    margin-bottom: 15px;
}

.pattern-control-btn {
    padding: 8px 16px;
    background: var(--button-bg-color);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-radius: 3px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.pattern-control-btn:hover {
    background: var(--button-hover-bg);
}

.current-pattern-container {
    background: var(--background-secondary);
    padding: 20px;
    border-radius: 5px;
}

.pattern-name-section {
    margin-bottom: 20px;
}

.pattern-name-section label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
}

#pattern-name-input {
    width: 100%;
    padding: 8px;
    background: var(--input-bg-color);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-radius: 3px;
}

.pattern-actions-section {
    margin-bottom: 20px;
}

.pattern-actions-section h4 {
    margin-bottom: 10px;
}

.pattern-actions-list {
    background: var(--background-primary);
    border: 1px solid var(--border-color);
    border-radius: 3px;
    padding: 10px;
    margin-bottom: 10px;
    min-height: 100px;
}

.pattern-action-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    margin-bottom: 5px;
    background: var(--background-secondary);
    border-radius: 3px;
}

.action-info {
    display: flex;
    align-items: center;
    gap: 10px;
}

.action-number {
    font-weight: bold;
    color: var(--secondary-text-color);
}

.action-controls {
    display: flex;
    gap: 5px;
}

.action-controls button {
    padding: 4px 8px;
    font-size: 12px;
    background: var(--button-bg-color);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-radius: 3px;
    cursor: pointer;
}

.action-controls button:hover {
    background: var(--button-hover-bg);
}

.action-controls button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.add-action-btn {
    width: 100%;
    padding: 8px;
    background: var(--accent-color);
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
}

.add-action-btn:hover {
    background: var(--accent-hover);
}

.pattern-test-section,
.pattern-apply-section {
    margin-top: 20px;
}

.test-config-select {
    width: 100%;
    padding: 8px;
    margin: 10px 0;
    background: var(--input-bg-color);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-radius: 3px;
}

.test-pattern-btn,
.apply-pattern-btn,
.apply-all-btn {
    padding: 10px 20px;
    background: var(--button-bg-color);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-radius: 3px;
    cursor: pointer;
    margin-right: 10px;
}

.apply-pattern-btn {
    background: #059669;
    color: white;
    border-color: #047857;
}

.apply-pattern-btn:hover {
    background: #047857;
}

.pattern-results {
    margin-top: 20px;
    padding: 15px;
    background: var(--background-secondary);
    border-radius: 5px;
}

.test-action-result {
    padding: 8px;
    margin: 5px 0;
    border-radius: 3px;
}

.test-action-result.success {
    background: #1a3d1a;
    color: #4ade80;
}

.test-action-result.no-change {
    background: var(--background-primary);
    color: var(--secondary-text-color);
}

.test-action-result.error {
    background: #3d1a1a;
    color: #f87171;
}

.action-dialog {
    max-width: 600px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
}

.action-dialog .modal-header {
    flex-shrink: 0;
}

.action-dialog .modal-body {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    max-height: calc(80vh - 120px);
}

.action-parameters {
    margin: 20px 0;
    overflow-y: auto;
}

.parameter-group {
    margin-bottom: 15px;
}

.parameter-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
}

.parameter-group select,
.parameter-group input {
    width: 100%;
    padding: 8px;
    background: var(--input-bg-color);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-radius: 3px;
}

.parameter-section {
    margin-bottom: 20px;
    padding: 15px;
    background: var(--background-primary);
    border-radius: 3px;
}

.parameter-section h4 {
    margin-top: 0;
    margin-bottom: 10px;
}

/* Ensure action dialog stays within viewport on small screens */
@media (max-height: 600px) {
    .action-dialog {
        max-height: 95vh;
    }
    
    .action-dialog .modal-body {
        max-height: calc(95vh - 100px);
    }
}

/* Add margin from viewport edges */
.modal-container {
    padding: 20px;
}

/* Ensure modal is properly scrollable on mobile */
@media (max-width: 600px) {
    .modal-container {
        padding: 10px;
    }
    
    .action-dialog {
        max-width: 100%;
    }
}

.pattern-load-dialog .modal-body {
    max-height: 600px;
    overflow-y: auto;
}

.pattern-section {
    margin-bottom: 25px;
}

.pattern-section h4 {
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 1px solid var(--border-color);
    color: var(--accent-color);
}

.pattern-list {
    max-height: none;
}

.pattern-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    margin-bottom: 5px;
    background: var(--background-secondary);
    border-radius: 3px;
    transition: background-color 0.2s;
}

.pattern-item:hover {
    background: var(--background-tertiary);
}

.pattern-item.preloaded-pattern {
    border-left: 3px solid var(--accent-color);
}

.pattern-item.custom-pattern {
    border-left: 3px solid #4ade80;
}

.pattern-controls {
    display: flex;
    gap: 5px;
}

.delete-pattern-btn {
    padding: 5px 10px;
    background: #dc2626;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 14px;
}

.delete-pattern-btn:hover {
    background: #991b1b;
}

.pattern-actions-count {
    color: var(--secondary-text-color);
    font-size: 14px;
    margin-left: 10px;
}

.load-pattern-btn {
    padding: 6px 12px;
    background: var(--accent-color);
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
}

.load-pattern-btn:hover {
    background: var(--accent-hover);
}

.dialog-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
    flex-shrink: 0;
    padding-top: 10px;
    border-top: 1px solid var(--border-color);
}

.dialog-buttons button {
    padding: 8px 16px;
    border-radius: 3px;
    cursor: pointer;
}

.add-button {
    background: var(--accent-color);
    color: white;
    border: none;
}

.cancel-button {
    background: var(--button-bg-color);
    color: var(--text-color);
    border: 1px solid var(--border-color);
}
</style>
`;

// Add styles to document head
document.head.insertAdjacentHTML('beforeend', patternBuilderStyles);

// Initialize when module loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPatternBuilder);
} else {
    initPatternBuilder();
}

// Export functions to global scope
window.initPatternBuilder = initPatternBuilder;
window.addPatternBuilderButton = addPatternBuilderButton;
window.createNewPattern = createNewPattern;
window.saveCurrentPattern = saveCurrentPattern;
window.loadPattern = loadPattern;
window.testPattern = testPattern;
window.applyPatternToConfig = applyPatternToConfig;
window.applyPatternToAll = applyPatternToAll;

// Debug function to check weapon configuration
window.debugWeaponConfig = function(shipIdentifier, configIndex) {
    const config = shipConfigurations[shipIdentifier]?.[configIndex];
    if (!config) {
        console.log('Configuration not found');
        return;
    }
    
    console.log('=== Weapon Configuration Debug ===');
    console.log('Config name:', config.name);
    
    const weapons = config.components['Ship Weapons'] || {};
    Object.entries(weapons).forEach(([weaponType, slots]) => {
        console.log(`\n${weaponType}: ${slots.length} slots`);
        slots.forEach((slotId, index) => {
            if (slotId) {
                console.log(`  Slot ${index}: ID=${slotId} (type: ${typeof slotId})`);
                const component = findComponentById(slotId);
                if (component) {
                    console.log(`    Found: ${component.name || 'Unknown'} (${component.properties?.Tier || '?'})`);
                } else {
                    console.error(`    NOT FOUND in component tree!`);
                    // Try with string conversion
                    const stringComponent = findComponentById(String(slotId));
                    if (stringComponent) {
                        console.log(`    Found with string conversion: ${stringComponent.name}`);
                    }
                    // Try with number conversion
                    const numberComponent = findComponentById(Number(slotId));
                    if (numberComponent) {
                        console.log(`    Found with number conversion: ${numberComponent.name}`);
                    }
                }
            }
        });
    });
};

// Debug function to check available weapon types for a ship
window.checkAvailableWeapons = function(shipClass) {
    console.log(`=== Available Weapons for Ship Class ${shipClass} ===`);
    
    const weaponTypes = ['Kinetic', 'Energy', 'EMP', 'Superchill', 'Shockwave', 'Gray Goo', 'Heat'];
    
    weaponTypes.forEach(weaponType => {
        const compatible = getCompatibleComponents('Ship Weapons', weaponType, shipClass);
        console.log(`\n${weaponType}: ${compatible.length} weapons found`);
        
        if (compatible.length > 0) {
            // Group by size
            const bySizes = {};
            compatible.forEach(weapon => {
                const size = weapon.properties?.Class || 'Unknown';
                if (!bySizes[size]) bySizes[size] = 0;
                bySizes[size]++;
            });
            
            Object.entries(bySizes).forEach(([size, count]) => {
                console.log(`  ${size}: ${count} weapons`);
            });
            
            // Show first few examples
            console.log('  Examples:', compatible.slice(0, 3).map(w => ({
                id: w.id,
                name: w.name || 'Unknown',
                tier: w.properties?.Tier
            })));
        }
    });
};

// Debug function to manually check Heat/Shockwave weapons
window.findHeatShockwaveWeapons = function() {
    console.log('=== Searching for Heat and Shockwave weapons ===');
    
    if (!components || !components.rewardTree) {
        console.error('Components not loaded');
        return;
    }
    
    let heatWeapons = [];
    let shockwaveWeapons = [];
    
    // Recursive search through component tree
    function searchNode(node, path = '') {
        if (node.properties) {
            // Check if this is a weapon
            if (node.properties.Category === 'Ship Weapons' || 
                (node.properties['Damage Type'] && path.includes('Ship Weapons'))) {
                
                if (node.properties['Damage Type'] === 'Heat' || 
                    (node.name && node.name.toLowerCase().includes('heat'))) {
                    heatWeapons.push({
                        id: node.id,
                        name: node.name,
                        path: path,
                        properties: node.properties
                    });
                }
                
                if (node.properties['Damage Type'] === 'Shockwave' || 
                    (node.name && node.name.toLowerCase().includes('shockwave'))) {
                    shockwaveWeapons.push({
                        id: node.id,
                        name: node.name,
                        path: path,
                        properties: node.properties
                    });
                }
            }
        }
        
        if (node.children) {
            node.children.forEach(child => {
                searchNode(child, path + '/' + (node.name || node.properties?.Category || 'Unknown'));
            });
        }
    }
    
    components.rewardTree.forEach(node => searchNode(node));
    
    console.log(`\nFound ${heatWeapons.length} Heat weapons:`);
    heatWeapons.slice(0, 5).forEach(w => {
        console.log(`  ID: ${w.id}, Name: ${w.name}, Class: ${w.properties?.Class}, Tier: ${w.properties?.Tier}`);
    });
    
    console.log(`\nFound ${shockwaveWeapons.length} Shockwave weapons:`);
    shockwaveWeapons.slice(0, 5).forEach(w => {
        console.log(`  ID: ${w.id}, Name: ${w.name}, Class: ${w.properties?.Class}, Tier: ${w.properties?.Tier}`);
    });
    
    return { heatWeapons, shockwaveWeapons };
};

window.closePatternBuilder = closePatternBuilder;
window.getWeaponFiringCadences = getWeaponFiringCadences;

console.log('Configuration Pattern Builder module loaded'); 