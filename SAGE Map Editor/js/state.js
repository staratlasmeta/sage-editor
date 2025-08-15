// state.js - Global state and state management functions

// Application State
let mapData = [];
let systemLookup = {};
let scale = 5; // Galaxy view scale
let offsetX = 400; // Initial centering offset X (relative to CSS dimensions)
let offsetY = 300; // Initial centering offset Y (relative to CSS dimensions)

// Galaxy Interaction State
let isPanning = false;
let lastMouseX = 0;
let lastMouseY = 0;
let draggedSystem = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let didDrag = false;
let hoveredSystem = null;
let dragStartX = 0;
let dragStartY = 0;
let mouseX = 0;
let mouseY = 0;

// Selection Box State
let isSelecting = false;
let selectionStart = { x: 0, y: 0 };
let selectionEnd = { x: 0, y: 0 };

// Application State
let currentView = 'galaxy'; // Always galaxy view now
let selectedSystems = []; // Changed from selectedSystem to selectedSystems array
let isLinking = false;      // Added: Flag for right-click linking state
let linkSourceSystem = null; // Added: Stores the source system for linking
let systemCounter = 0;
let searchTerm = '';
let systemSizeMultiplier = 1.0; // Multiplier for system blip size (1.0 = 100%, 0.5 = 50%, 0.25 = 25%)

// History state
const MAX_HISTORY = 50;
let historyStack = []; // Will store { description: string, timestamp: Date, state: mapDataSnapshot } 
let redoStack = [];   // Will store { description: string, timestamp: Date, state: mapDataSnapshot }
let lastActionGroup = null; // Group identifier for related actions

// Clipboard for copy/paste system
let systemClipboard = null;

// Top Bar State
let currentFilename = null;
let isModified = false;

// UI State
let showGrid = true;
let showSystemLabels = true;
let showSystemStats = false;
let showFactionArea = false;
let snapToGrid = false;
let resourceFilterState = {};
let showResourceHeatmap = false; // Toggle for resource heatmap visualization
let heatmapDebugMode = false; // Toggle for debug mode in heatmap visualization

// Faction Area Analysis State
let factionAreaStats = {
    MUD: { area: 0, systems: 0 },
    ONI: { area: 0, systems: 0 },
    UST: { area: 0, systems: 0 }
};

// Region Management State
let showRegions = true;  // Toggle region visualization (enabled by default)
let regionDefinitions = []; // Stores {id, name, color} for each region

// Preview Canvas State Variables
let isPreviewPanning = false;
let previewScale = 1.0;
let previewOffsetX = 0;
let previewOffsetY = 0;
let lastPreviewMouseX = 0;
let lastPreviewMouseY = 0;

// Make sure these variables are available globally
window.mapData = mapData;
window.systemLookup = systemLookup;
window.selectedSystems = selectedSystems;
window.historyStack = historyStack;
window.redoStack = redoStack;
window.systemSizeMultiplier = systemSizeMultiplier;
window.showResourceHeatmap = showResourceHeatmap;
window.heatmapDebugMode = heatmapDebugMode;

// Save state function
function saveState(description = "Unknown Action", groupWithPrevious = false, forceEmpty = false, metadata = null) {
    console.log(`[saveState] Called for "${description}" with ${mapData ? mapData.length : 0} systems. forceEmpty=${forceEmpty}`);

    // Don't save state if mapData is empty/not loaded unless forceEmpty is true
    if (!forceEmpty && (!mapData || mapData.length === 0)) {
        console.log("[saveState] Skipping empty state (forceEmpty=false)");
        return;
    }

    console.log(`[saveState] Processing state save for "${description}". Current history size:`, historyStack.length);

    // Clear redo stack when a new action is performed
    if (redoStack.length > 0 && !groupWithPrevious) {
        console.log("[saveState] Clearing redo stack due to new action.");
        redoStack = [];
    }

    if (historyStack.length >= MAX_HISTORY) {
        console.log("[saveState] History full, removing oldest state");
        historyStack.shift(); // Remove oldest state if history is full
    }

    let copySucceeded = false;
    let stateToSave = null;
    try {
        // Create optimized copy by only storing differences when appropriate
        const currentState = optimizedDeepCopy(mapData);
        if (currentState || forceEmpty) {
            // Add timestamp and action group ID to state object
            const timestamp = new Date();
            const actionGroupId = groupWithPrevious ? lastActionGroup : timestamp.getTime();
            lastActionGroup = actionGroupId;

            stateToSave = {
                description: description,
                timestamp: timestamp,
                actionGroup: actionGroupId,
                state: currentState || [],
                metadata: metadata || {} // Store metadata if provided
            };
            copySucceeded = true;
        } else {
            console.error("[saveState] deepCopy returned null/falsy.");
        }
    } catch (error) {
        console.error("[saveState] Error during deepCopy:", error);
    }

    if (copySucceeded && stateToSave) {
        historyStack.push(stateToSave); // Push the object
        console.log(`[saveState] Added state "${description}" to history. New size: ${historyStack.length}`);
        isModified = true;
    } else {
        console.error("[saveState] Failed to create state object. History not updated.");
        return;
    }

    updateUndoRedoButtons();
    updateTopBarInfo();
    updateHistoryPanel(); // Update the history UI
    console.log(`[saveState] Finished "${description}". History size: ${historyStack.length}`);
}

// Optimize the deep copy process for more memory efficiency
function optimizedDeepCopy(obj) {
    // Fall back to regular deep copy if optimization isn't possible
    return deepCopy(obj);

    // Note: A more sophisticated implementation would detect which parts of the state
    // have changed and only store those differences, but that requires a more complex
    // diffing algorithm that would need to be carefully tested
}

// Undo function
function undo() {
    console.log("Undo called. Current history stack size:", historyStack.length);

    if (historyStack.length === 0) {
        console.log("History stack is empty, nothing to undo");
        return;
    }

    // Get the last state object from history
    const lastStateObject = historyStack.pop();
    console.log("Undoing:", lastStateObject.description);
    console.log("Remaining history stack size:", historyStack.length);

    // Store current selection state before undoing
    const currentSelectedKeys = selectedSystems.map(sys => sys.key);

    // Push *current* state (before undoing) to redo stack
    const currentStateForRedo = deepCopy(mapData);
    if (currentStateForRedo) {
        // Preserve description, timestamp, and metadata from the undone state
        redoStack.push({
            description: lastStateObject.description,
            timestamp: lastStateObject.timestamp,
            actionGroup: lastStateObject.actionGroup,
            state: currentStateForRedo,
            metadata: {
                selectedKeys: currentSelectedKeys, // Store current selection with the redo state
                // Also store the previous selection state if available
                prevSelectedKeys: lastStateObject.metadata && lastStateObject.metadata.prevSelectedKeys ?
                    lastStateObject.metadata.prevSelectedKeys : []
            }
        });
        console.log("Pushed to redo stack:", lastStateObject.description);
    }

    // Handle special case for selection-only operations
    const isSelectionOnly = lastStateObject.description.includes("Selected") ||
        lastStateObject.description.includes("Deselected");

    if (isSelectionOnly && lastStateObject.metadata && lastStateObject.metadata.prevSelectedKeys) {
        console.log("Undoing selection operation, restoring previous selection state");

        // For selection operations, don't change map data, just restore previous selection
        const keysToRestore = lastStateObject.metadata.prevSelectedKeys;
        selectedSystems = [];

        keysToRestore.forEach(key => {
            const system = systemLookup[key];
            if (system) {
                selectedSystems.push(system);
            }
        });

        console.log(`Restored previous selection with ${selectedSystems.length} systems`);

        // Update UI based on selections
        updateLockButtonsState();
        setupResourceFilter();
        displaySystemDetails(selectedSystems);
        if (selectedSystems.length === 1) {
            drawSystemPreview(selectedSystems[0]);
        } else {
            drawSystemPreview(null);
        }

        // Force redraw of the map
        requestAnimationFrame(() => {
            drawGalaxyMap();
            console.log("Redrew galaxy map after undoing selection");
        });

        updateUndoRedoButtons();
        updateHistoryPanel();
        console.log(`Undo processed for selection: "${lastStateObject.description}"`);
        return;
    }

    // For non-selection operations or operations that change the map data:
    // Restore map data from the state object
    const previousState = lastStateObject.state;
    console.log("Previous state has systems:", previousState.length);

    mapData.length = 0;
    if (Array.isArray(previousState)) {
        previousState.forEach(item => mapData.push(item));
        console.log("Restored state with systems:", mapData.length);
    } else {
        console.error("Undo error: previousState is not an array!", previousState);
        // Attempt to restore redo state? 
        historyStack.push(previousState); // Put it back
        redoStack.pop(); // Remove the state we wrongly pushed
        return; // Abort undo
    }

    // Rebuild lookup (essential!)
    systemLookup = {};
    mapData.forEach(system => {
        if (system.key) systemLookup[system.key] = system;
    });

    // Clear all state variables that might be referencing old objects
    hoveredSystem = null;
    draggedSystem = null;
    linkSourceSystem = null;
    isPanning = false;
    isLinking = false;

    // Store the keys of the systems we want to keep selected
    let keysToKeepSelected = [];

    // If the undone state had selection metadata, use it
    if (lastStateObject.metadata && lastStateObject.metadata.selectedKeys) {
        // If this was a drag operation, and we're undoing, we should restore the previous selection
        if (lastStateObject.metadata.isDragOperation && lastStateObject.metadata.prevSelectedKeys) {
            keysToKeepSelected = lastStateObject.metadata.prevSelectedKeys;
            console.log("Drag operation detected, restoring selection before drag:", keysToKeepSelected);
        } else {
            keysToKeepSelected = lastStateObject.metadata.selectedKeys;
            console.log("Using selection metadata from history:", keysToKeepSelected);
        }
    } else {
        // Otherwise, try to preserve current selection if possible
        keysToKeepSelected = currentSelectedKeys;
        console.log("No selection metadata, trying to preserve current selection:", keysToKeepSelected);
    }

    // Reset selection and restore based on keys
    selectedSystems = [];

    // Restore selections based on the appropriate keys
    keysToKeepSelected.forEach(key => {
        if (systemLookup[key]) {
            selectedSystems.push(systemLookup[key]);
        }
    });

    // Update UI based on selections
    updateLockButtonsState(); // Update lock button state
    setupResourceFilter(); // Update filter state

    if (historyStack.length === 0) {
        console.log("Restoring to initial empty base state");
        mapData = [];
        systemLookup = {};
        selectedSystems = [];
        regionDefinitions = []; // Clear regions too
        linkSourceSystem = null;
        isLinking = false;
        // DO NOT clear historyStack or redoStack here.
        // The state we popped is already on the redoStack.

        // Rebuild lookups etc based on the now empty data
        rebuildSystemLookup();
        updateLockButtonsState(); // Update lock button state
        setupResourceFilter(); // Update filter state
    }

    // Update UI
    displaySystemDetails(selectedSystems);
    if (selectedSystems.length === 1) {
        drawSystemPreview(selectedSystems[0]);
    } else {
        drawSystemPreview(null);
    }

    // Force redraw of the map
    requestAnimationFrame(() => {
        drawGalaxyMap();
        console.log("Redrew galaxy map after undo operation");
    });

    updateUndoRedoButtons();
    updateHistoryPanel(); // Update history UI
    updateSystemCount(); // Update faction counts after undo
    console.log(`Undo processed for "${lastStateObject.description}".`); // Use description
}

// Redo function
function redo() {
    if (redoStack.length === 0) return;

    // Get the state object to redo
    const nextStateObject = redoStack.pop();
    console.log("Redoing:", nextStateObject.description);
    console.log("Remaining redo stack size:", redoStack.length);

    // Store current selection state before redoing
    const currentSelectedKeys = selectedSystems.map(sys => sys.key);

    // Push *current* state (before redoing) back to history stack
    const currentStateForHistory = deepCopy(mapData);
    if (currentStateForHistory) {
        if (historyStack.length >= MAX_HISTORY) {
            historyStack.shift();
        }
        // Preserve description, timestamp, and metadata from the redone state
        historyStack.push({
            description: nextStateObject.description,
            timestamp: nextStateObject.timestamp,
            actionGroup: nextStateObject.actionGroup,
            state: currentStateForHistory,
            metadata: {
                selectedKeys: currentSelectedKeys, // Store current selection with the history state
                // Also store the next selection state if available
                prevSelectedKeys: nextStateObject.metadata && nextStateObject.metadata.prevSelectedKeys ?
                    nextStateObject.metadata.prevSelectedKeys : []
            }
        });
    }

    // Handle special case for selection-only operations
    const isSelectionOnly = nextStateObject.description.includes("Selected") ||
        nextStateObject.description.includes("Deselected");

    if (isSelectionOnly && nextStateObject.metadata && nextStateObject.metadata.selectedKeys) {
        console.log("Redoing selection operation, applying next selection state");

        // For selection operations, don't change map data, just apply next selection
        const keysToApply = nextStateObject.metadata.selectedKeys;
        selectedSystems = [];

        keysToApply.forEach(key => {
            const system = systemLookup[key];
            if (system) {
                selectedSystems.push(system);
            }
        });

        console.log(`Applied next selection with ${selectedSystems.length} systems`);

        // Update UI based on selections
        updateLockButtonsState();
        setupResourceFilter();
        displaySystemDetails(selectedSystems);
        if (selectedSystems.length === 1) {
            drawSystemPreview(selectedSystems[0]);
        } else {
            drawSystemPreview(null);
        }

        // Force redraw of the map
        requestAnimationFrame(() => {
            drawGalaxyMap();
            console.log("Redrew galaxy map after redoing selection");
        });

        updateUndoRedoButtons();
        updateHistoryPanel();
        console.log(`Redo processed for selection: "${nextStateObject.description}"`);
        return;
    }

    // For non-selection operations or operations that change the map data:
    // Restore map data from the state object
    const nextState = nextStateObject.state;
    mapData.length = 0;
    if (Array.isArray(nextState)) {
        nextState.forEach(item => mapData.push(item));
    } else {
        console.error("Redo error: nextState is not an array!", nextState);
        // Attempt to restore history state?
        redoStack.push(nextState); // Put it back
        historyStack.pop(); // Remove the state we wrongly pushed
        return; // Abort redo
    }

    // Rebuild lookup
    systemLookup = {};
    mapData.forEach(system => {
        if (system.key) systemLookup[system.key] = system;
    });

    // Clear all state variables that might be referencing old objects
    hoveredSystem = null;
    draggedSystem = null;
    linkSourceSystem = null;
    isPanning = false;
    isLinking = false;

    // Store the keys of the systems we want to keep selected
    let keysToKeepSelected = [];

    // If the redone state had selection metadata, use it
    if (nextStateObject.metadata && nextStateObject.metadata.selectedKeys) {
        keysToKeepSelected = nextStateObject.metadata.selectedKeys;
        console.log("Using selection metadata from redo:", keysToKeepSelected);
    } else {
        // Otherwise, try to preserve current selection if possible
        keysToKeepSelected = currentSelectedKeys;
        console.log("No selection metadata in redo, trying to preserve current selection:", keysToKeepSelected);
    }

    // Reset selection and restore based on keys
    selectedSystems = [];

    // Restore selections based on the appropriate keys
    keysToKeepSelected.forEach(key => {
        if (systemLookup[key]) {
            selectedSystems.push(systemLookup[key]);
        }
    });

    // Update UI based on selections
    updateLockButtonsState(); // Update lock button state
    setupResourceFilter(); // Update filter state

    // Update UI
    displaySystemDetails(selectedSystems);
    if (selectedSystems.length === 1) {
        drawSystemPreview(selectedSystems[0]);
    } else {
        drawSystemPreview(null);
    }

    // Force redraw of the map
    requestAnimationFrame(() => {
        drawGalaxyMap();
        console.log("Redrew galaxy map after redo operation");
    });

    updateUndoRedoButtons();
    updateHistoryPanel(); // Update history UI
    updateSystemCount(); // Update faction counts after redo
    console.log(`Redo processed for "${nextStateObject.description}".`); // Use description
}

// Clear map data
function clearMapData() {
    console.log("*** clearMapData called ***");
    console.log("Before clear - mapData:", mapData.length, "historyStack:", historyStack.length);

    mapData = [];
    systemLookup = {};
    selectedSystems = []; // Update to use the array
    linkSourceSystem = null;
    isLinking = false;
    systemCounter = 0; // Reset counter
    historyStack = [];
    redoStack = [];
    lastActionGroup = null; // Reset action grouping
    currentFilename = null; // Clear filename
    isModified = false; // Reset modified state
    systemClipboard = null; // Clear clipboard
    hoveredSystem = null;
    draggedSystem = null;

    // Reset view variables to defaults
    scale = 5;
    offsetX = 400;
    offsetY = 300;

    // Clear UI elements
    displaySystemDetails(null);
    drawSystemPreview(null);
    if (searchSystemInput) {
        searchSystemInput.value = ''; // Clear search input
        searchTerm = '';

        // Update clear button visibility
        const wrapper = searchSystemInput.closest('.search-input-wrapper');
        if (wrapper) {
            wrapper.classList.remove('has-text');
        }
    }

    updateUndoRedoButtons();
    updateTopBarInfo();
    updateSystemCount();
    if (deselectBtn) deselectBtn.disabled = true;
    updateHistoryPanel();

    console.log("After clear - mapData:", mapData.length, "historyStack:", historyStack.length);
    console.log("*** clearMapData finished ***");
}

// Update Top Bar Info
function updateTopBarInfo() {
    if (currentFilenameSpan) {
        currentFilenameSpan.textContent = currentFilename ? currentFilename : "Untitled Map";
        currentFilenameSpan.title = currentFilename ? `Loaded: ${currentFilename}` : 'No map loaded';
    }
    if (saveStatusIndicator) {
        saveStatusIndicator.style.display = isModified ? 'inline' : 'none';
    }
}

// Initial resource filter state
function initResourceFilterState() {
    // Initialize filter state
    RESOURCE_TYPES.forEach(res => {
        resourceFilterState[res.name] = true; // Default to visible
    });

    // Add planets to the filter state
    resourceFilterState["Planets"] = true; // Default to visible

    // Add new label filter options - ensure all are true by default
    resourceFilterState["SystemName"] = true; // System name
    resourceFilterState["FactionLabel"] = true; // Faction label (UST, ONI, MUD)
    resourceFilterState["PlanetCount"] = true; // Planet count (P:X)
    resourceFilterState["StarCount"] = true; // Star count (S:X)
    resourceFilterState["LockStatus"] = true; // Lock status icon
    resourceFilterState["KingStatus"] = true; // KING system status

    // Region labels - ensure all are true by default
    resourceFilterState["RegionalPolygon"] = true; // Regional polygon
    resourceFilterState["RegionalBlob"] = false; // Regional blob (grid-based filling) - default to false
    resourceFilterState["RegionalName"] = true; // Regional name
    resourceFilterState["RegionalSystems"] = true; // Regional systems count
    resourceFilterState["RegionalCore"] = true; // Regional core systems count
    resourceFilterState["RegionalKing"] = true; // Regional KING systems count
    resourceFilterState["RegionalArea"] = true; // Regional area
    resourceFilterState["RegionalDistance"] = true; // Regional average distance
    resourceFilterState["RegionalIndicator"] = true; // Regional indicator circles around systems
}

// Initialize planet archetype resource data
const PLANET_ARCHETYPE_RESOURCES = {
    "MUD": {
        "Terrestrial": [
            { type: 2, name: "Aluminum Ore", richness: 2 },
            { type: 5, name: "Argon", richness: 2 },
            { type: 9, name: "Biomass", richness: 1 },
            { type: 12, name: "Carbon", richness: 1 },
            { type: 20, name: "Dysprosium", richness: 4 },
            { type: 30, name: "Hydrogen", richness: 1 },
            { type: 32, name: "Iron Ore", richness: 1 },
            { type: 41, name: "Neodymium", richness: 1 },
            { type: 44, name: "Nitrogen", richness: 1 },
            { type: 48, name: "Oxygen", richness: 2 },
            { type: 66, name: "Silica", richness: 1 }
        ],
        "Volcanic": [
            { type: 4, name: "Arco", richness: 1 },
            { type: 13, name: "Cinnabar Crystals", richness: 3 },
            { type: 17, name: "Diamond", richness: 2 },
            { type: 22, name: "Fluorine Gas", richness: 2 },
            { type: 24, name: "Garnet Crystals", richness: 2 },
            { type: 28, name: "Hafnium Ore", richness: 2 },
            { type: 31, name: "Iridium Ore", richness: 4 },
            { type: 37, name: "Lumanite", richness: 1 },
            { type: 47, name: "Osmium Ore", richness: 1 },
            { type: 49, name: "Palladium Ore", richness: 3 },
            { type: 52, name: "Plasma Containment Minerals", richness: 3 },
            { type: 53, name: "Platinum Ore", richness: 3 },
            { type: 60, name: "Rhenium Ore", richness: 1 },
            { type: 61, name: "Rhodium Ore", richness: 4 },
            { type: 62, name: "Rochinol", richness: 2 },
            { type: 71, name: "Tantalum Ore", richness: 1 },
            { type: 74, name: "Thermal Regulator Stone", richness: 1 }
        ],
        "Barren": [
            { type: 4, name: "Arco", richness: 1 },
            { type: 15, name: "Copper Ore", richness: 1 },
            { type: 19, name: "Drywater", richness: 3 },
            { type: 34, name: "Krypton", richness: 1 },
            { type: 35, name: "Lithium Ore", richness: 2 },
            { type: 39, name: "Manganese Ore", richness: 2 },
            { type: 59, name: "Resonium Ore", richness: 5 },
            { type: 62, name: "Rochinol", richness: 2 },
            { type: 76, name: "Tin Ore", richness: 1 },
            { type: 80, name: "Tungsten Ore", richness: 3 },
            { type: 81, name: "Vanadium Ore", richness: 3 },
            { type: 84, name: "Zinc Ore", richness: 1 }
        ],
        "Asteroid Belt": [
            { type: 2, name: "Aluminum Ore", richness: 2 },
            { type: 11, name: "Boron Ore", richness: 2 },
            { type: 15, name: "Copper Ore", richness: 1 },
            { type: 35, name: "Lithium Ore", richness: 2 },
            { type: 40, name: "Methane", richness: 2 },
            { type: 56, name: "Quartz Crystals", richness: 1 },
            { type: 60, name: "Rhenium Ore", richness: 1 },
            { type: 65, name: "Scandium Ore", richness: 2 },
            { type: 66, name: "Silica", richness: 1 },
            { type: 67, name: "Silicon Crystal", richness: 1 },
            { type: 69, name: "Sodium Crystals", richness: 1 },
            { type: 70, name: "Strontium Crystals", richness: 5 },
            { type: 77, name: "Titanium Ore", richness: 3 },
            { type: 79, name: "Tritium Ore", richness: 1 }
        ],
        "Gas Giant": [
            { type: 5, name: "Argon", richness: 2 },
            { type: 12, name: "Carbon", richness: 1 },
            { type: 22, name: "Fluorine Gas", richness: 2 },
            { type: 30, name: "Hydrogen", richness: 1 },
            { type: 34, name: "Krypton", richness: 1 },
            { type: 42, name: "Neon", richness: 3 },
            { type: 44, name: "Nitrogen", richness: 1 },
            { type: 72, name: "Tenon Gas", richness: 3 },
            { type: 83, name: "Xenon", richness: 2 }
        ],
        "Ice Giant": [
            { type: 4, name: "Arco", richness: 1 },
            { type: 7, name: "Beryllium Crystals", richness: 5 },
            { type: 8, name: "Biolumite", richness: 5 },
            { type: 16, name: "Cryo Formation Crystals", richness: 3 },
            { type: 17, name: "Diamond", richness: 2 },
            { type: 19, name: "Drywater", richness: 3 },
            { type: 24, name: "Garnet Crystals", richness: 2 },
            { type: 29, name: "Hicenium Crystals", richness: 4 },
            { type: 34, name: "Krypton", richness: 1 },
            { type: 50, name: "Peridot Crystals", richness: 2 },
            { type: 55, name: "Quantum Particle", richness: 5 },
            { type: 62, name: "Rochinol", richness: 2 },
            { type: 63, name: "Ruby Crystals", richness: 2 },
            { type: 64, name: "Sapphire Crystals", richness: 3 },
            { type: 78, name: "Topaz Crystals", richness: 2 },
            { type: 83, name: "Xenon", richness: 2 },
            { type: 85, name: "Zirconium Ore", richness: 4 }
        ],
        "Dark": [
            { type: 4, name: "Arco", richness: 1 },
            { type: 7, name: "Beryllium Crystals", richness: 5 },
            { type: 17, name: "Diamond", richness: 2 },
            { type: 21, name: "Emerald Crystals", richness: 3 },
            { type: 23, name: "Fusion Catalyst Deposits", richness: 5 },
            { type: 36, name: "Living Metal Symbionts", richness: 5 },
            { type: 40, name: "Methane", richness: 2 },
            { type: 41, name: "Neodymium", richness: 1 },
            { type: 42, name: "Neon", richness: 3 },
            { type: 54, name: "Quantum Computational Substrate", richness: 4 },
            { type: 55, name: "Quantum Particle", richness: 5 },
            { type: 57, name: "Radiant Dust", richness: 2 },
            { type: 62, name: "Rochinol", richness: 2 },
            { type: 67, name: "Silicon Crystal", richness: 1 },
            { type: 68, name: "Silver Ore", richness: 2 },
            { type: 78, name: "Topaz Crystals", richness: 2 },
            { type: 83, name: "Xenon", richness: 2 }
        ],
        "Oceanic": [
            { type: 0, name: "Abyssal Chromite", richness: 1 },
            { type: 1, name: "Abyssal Energy Crystals", richness: 4 },
            { type: 5, name: "Argon", richness: 2 },
            { type: 6, name: "Bathysphere Pearls", richness: 3 },
            { type: 9, name: "Biomass", richness: 1 },
            { type: 22, name: "Fluorine Gas", richness: 2 },
            { type: 30, name: "Hydrogen", richness: 1 },
            { type: 38, name: "Lunar Echo Crystals", richness: 5 },
            { type: 39, name: "Manganese Ore", richness: 2 },
            { type: 43, name: "Neural Coral Compounds", richness: 3 },
            { type: 44, name: "Nitrogen", richness: 1 },
            { type: 48, name: "Oxygen", richness: 2 },
            { type: 51, name: "Phase Shift Crystals", richness: 3 },
            { type: 73, name: "Thermal Bloom Sediment", richness: 2 }
        ]
    },
    "ONI": {
        "Terrestrial": [
            { type: 2, name: "Aluminum Ore", richness: 2 },
            { type: 5, name: "Argon", richness: 2 },
            { type: 9, name: "Biomass", richness: 1 },
            { type: 12, name: "Carbon", richness: 1 },
            { type: 20, name: "Dysprosium", richness: 4 },
            { type: 27, name: "Gold Ore", richness: 3 },
            { type: 30, name: "Hydrogen", richness: 1 },
            { type: 32, name: "Iron Ore", richness: 1 },
            { type: 41, name: "Neodymium", richness: 1 },
            { type: 44, name: "Nitrogen", richness: 1 },
            { type: 48, name: "Oxygen", richness: 2 },
            { type: 66, name: "Silica", richness: 1 },
            { type: 75, name: "Thermoplastic Resin", richness: 1 }
        ],
        "Volcanic": [
            { type: 4, name: "Arco", richness: 1 },
            { type: 22, name: "Fluorine Gas", richness: 2 },
            { type: 24, name: "Garnet Crystals", richness: 2 },
            { type: 26, name: "Glowstone Crystals", richness: 3 },
            { type: 28, name: "Hafnium Ore", richness: 2 },
            { type: 31, name: "Iridium Ore", richness: 4 },
            { type: 37, name: "Lumanite", richness: 1 },
            { type: 47, name: "Osmium Ore", richness: 1 },
            { type: 49, name: "Palladium Ore", richness: 3 },
            { type: 52, name: "Plasma Containment Minerals", richness: 3 },
            { type: 53, name: "Platinum Ore", richness: 3 },
            { type: 60, name: "Rhenium Ore", richness: 1 },
            { type: 61, name: "Rhodium Ore", richness: 4 },
            { type: 62, name: "Rochinol", richness: 2 },
            { type: 71, name: "Tantalum Ore", richness: 1 },
            { type: 74, name: "Thermal Regulator Stone", richness: 1 }
        ],
        "Barren": [
            { type: 4, name: "Arco", richness: 1 },
            { type: 15, name: "Copper Ore", richness: 1 },
            { type: 19, name: "Drywater", richness: 3 },
            { type: 33, name: "Jasphorus Crystals", richness: 5 },
            { type: 34, name: "Krypton", richness: 1 },
            { type: 35, name: "Lithium Ore", richness: 2 },
            { type: 39, name: "Manganese Ore", richness: 2 },
            { type: 62, name: "Rochinol", richness: 2 },
            { type: 76, name: "Tin Ore", richness: 1 },
            { type: 80, name: "Tungsten Ore", richness: 3 },
            { type: 81, name: "Vanadium Ore", richness: 3 },
            { type: 84, name: "Zinc Ore", richness: 1 }
        ],
        "Asteroid Belt": [
            { type: 2, name: "Aluminum Ore", richness: 2 },
            { type: 11, name: "Boron Ore", richness: 2 },
            { type: 15, name: "Copper Ore", richness: 1 },
            { type: 35, name: "Lithium Ore", richness: 2 },
            { type: 40, name: "Methane", richness: 2 },
            { type: 56, name: "Quartz Crystals", richness: 1 },
            { type: 60, name: "Rhenium Ore", richness: 1 },
            { type: 65, name: "Scandium Ore", richness: 2 },
            { type: 66, name: "Silica", richness: 1 },
            { type: 67, name: "Silicon Crystal", richness: 1 },
            { type: 69, name: "Sodium Crystals", richness: 1 },
            { type: 70, name: "Strontium Crystals", richness: 5 },
            { type: 77, name: "Titanium Ore", richness: 3 },
            { type: 79, name: "Tritium Ore", richness: 1 }
        ],
        "Gas Giant": [
            { type: 5, name: "Argon", richness: 2 },
            { type: 12, name: "Carbon", richness: 1 },
            { type: 22, name: "Fluorine Gas", richness: 2 },
            { type: 30, name: "Hydrogen", richness: 1 },
            { type: 34, name: "Krypton", richness: 1 },
            { type: 42, name: "Neon", richness: 3 },
            { type: 44, name: "Nitrogen", richness: 1 },
            { type: 75, name: "Thermoplastic Resin", richness: 1 },
            { type: 83, name: "Xenon", richness: 2 }
        ],
        "Ice Giant": [
            { type: 4, name: "Arco", richness: 1 },
            { type: 7, name: "Beryllium Crystals", richness: 5 },
            { type: 14, name: "Cobalt Ore", richness: 2 },
            { type: 16, name: "Cryo Formation Crystals", richness: 3 },
            { type: 19, name: "Drywater", richness: 3 },
            { type: 24, name: "Garnet Crystals", richness: 2 },
            { type: 34, name: "Krypton", richness: 1 },
            { type: 50, name: "Peridot Crystals", richness: 2 },
            { type: 55, name: "Quantum Particle", richness: 5 },
            { type: 62, name: "Rochinol", richness: 2 },
            { type: 63, name: "Ruby Crystals", richness: 2 },
            { type: 64, name: "Sapphire Crystals", richness: 3 },
            { type: 78, name: "Topaz Crystals", richness: 2 },
            { type: 83, name: "Xenon", richness: 2 },
            { type: 85, name: "Zirconium Ore", richness: 4 }
        ],
        "Dark": [
            { type: 4, name: "Arco", richness: 1 },
            { type: 7, name: "Beryllium Crystals", richness: 5 },
            { type: 21, name: "Emerald Crystals", richness: 3 },
            { type: 23, name: "Fusion Catalyst Deposits", richness: 5 },
            { type: 36, name: "Living Metal Symbionts", richness: 5 },
            { type: 40, name: "Methane", richness: 2 },
            { type: 41, name: "Neodymium", richness: 1 },
            { type: 42, name: "Neon", richness: 3 },
            { type: 46, name: "Opal Fragments", richness: 5 },
            { type: 54, name: "Quantum Computational Substrate", richness: 4 },
            { type: 55, name: "Quantum Particle", richness: 5 },
            { type: 58, name: "Raw Chisenic", richness: 3 },
            { type: 62, name: "Rochinol", richness: 2 },
            { type: 67, name: "Silicon Crystal", richness: 1 },
            { type: 68, name: "Silver Ore", richness: 2 },
            { type: 78, name: "Topaz Crystals", richness: 2 },
            { type: 83, name: "Xenon", richness: 2 }
        ],
        "Oceanic": [
            { type: 0, name: "Abyssal Chromite", richness: 1 },
            { type: 1, name: "Abyssal Energy Crystals", richness: 4 },
            { type: 5, name: "Argon", richness: 2 },
            { type: 6, name: "Bathysphere Pearls", richness: 3 },
            { type: 9, name: "Biomass", richness: 1 },
            { type: 14, name: "Cobalt Ore", richness: 2 },
            { type: 22, name: "Fluorine Gas", richness: 2 },
            { type: 30, name: "Hydrogen", richness: 1 },
            { type: 38, name: "Lunar Echo Crystals", richness: 5 },
            { type: 39, name: "Manganese Ore", richness: 2 },
            { type: 43, name: "Neural Coral Compounds", richness: 3 },
            { type: 44, name: "Nitrogen", richness: 1 },
            { type: 48, name: "Oxygen", richness: 2 },
            { type: 51, name: "Phase Shift Crystals", richness: 3 },
            { type: 73, name: "Thermal Bloom Sediment", richness: 2 }
        ]
    },
    "USTUR": {
        "Terrestrial": [
            { type: 2, name: "Aluminum Ore", richness: 2 },
            { type: 3, name: "Amber Resin", richness: 2 },
            { type: 5, name: "Argon", richness: 2 },
            { type: 9, name: "Biomass", richness: 1 },
            { type: 12, name: "Carbon", richness: 1 },
            { type: 20, name: "Dysprosium", richness: 4 },
            { type: 30, name: "Hydrogen", richness: 1 },
            { type: 32, name: "Iron Ore", richness: 1 },
            { type: 41, name: "Neodymium", richness: 1 },
            { type: 44, name: "Nitrogen", richness: 1 },
            { type: 45, name: "Ochre Ore", richness: 4 },
            { type: 48, name: "Oxygen", richness: 2 },
            { type: 66, name: "Silica", richness: 1 }
        ],
        "Volcanic": [
            { type: 4, name: "Arco", richness: 1 },
            { type: 18, name: "Dodiline Crystals", richness: 4 },
            { type: 22, name: "Fluorine Gas", richness: 2 },
            { type: 24, name: "Garnet Crystals", richness: 2 },
            { type: 28, name: "Hafnium Ore", richness: 2 },
            { type: 31, name: "Iridium Ore", richness: 4 },
            { type: 37, name: "Lumanite", richness: 1 },
            { type: 47, name: "Osmium Ore", richness: 1 },
            { type: 49, name: "Palladium Ore", richness: 3 },
            { type: 52, name: "Plasma Containment Minerals", richness: 3 },
            { type: 53, name: "Platinum Ore", richness: 3 },
            { type: 60, name: "Rhenium Ore", richness: 1 },
            { type: 61, name: "Rhodium Ore", richness: 4 },
            { type: 62, name: "Rochinol", richness: 2 },
            { type: 71, name: "Tantalum Ore", richness: 1 },
            { type: 74, name: "Thermal Regulator Stone", richness: 1 }
        ],
        "Barren": [
            { type: 4, name: "Arco", richness: 1 },
            { type: 10, name: "Black Opal", richness: 5 },
            { type: 15, name: "Copper Ore", richness: 1 },
            { type: 19, name: "Drywater", richness: 3 },
            { type: 34, name: "Krypton", richness: 1 },
            { type: 35, name: "Lithium Ore", richness: 2 },
            { type: 39, name: "Manganese Ore", richness: 2 },
            { type: 62, name: "Rochinol", richness: 2 },
            { type: 76, name: "Tin Ore", richness: 1 },
            { type: 80, name: "Tungsten Ore", richness: 3 },
            { type: 81, name: "Vanadium Ore", richness: 3 },
            { type: 84, name: "Zinc Ore", richness: 1 }
        ],
        "Asteroid Belt": [
            { type: 2, name: "Aluminum Ore", richness: 2 },
            { type: 11, name: "Boron Ore", richness: 2 },
            { type: 15, name: "Copper Ore", richness: 1 },
            { type: 35, name: "Lithium Ore", richness: 2 },
            { type: 40, name: "Methane", richness: 2 },
            { type: 56, name: "Quartz Crystals", richness: 1 },
            { type: 60, name: "Rhenium Ore", richness: 1 },
            { type: 65, name: "Scandium Ore", richness: 2 },
            { type: 66, name: "Silica", richness: 1 },
            { type: 67, name: "Silicon Crystal", richness: 1 },
            { type: 69, name: "Sodium Crystals", richness: 1 },
            { type: 70, name: "Strontium Crystals", richness: 5 },
            { type: 77, name: "Titanium Ore", richness: 3 },
            { type: 79, name: "Tritium Ore", richness: 1 }
        ],
        "Gas Giant": [
            { type: 5, name: "Argon", richness: 2 },
            { type: 12, name: "Carbon", richness: 1 },
            { type: 22, name: "Fluorine Gas", richness: 2 },
            { type: 30, name: "Hydrogen", richness: 1 },
            { type: 34, name: "Krypton", richness: 1 },
            { type: 42, name: "Neon", richness: 3 },
            { type: 44, name: "Nitrogen", richness: 1 },
            { type: 83, name: "Xenon", richness: 2 }
        ],
        "Ice Giant": [
            { type: 4, name: "Arco", richness: 1 },
            { type: 7, name: "Beryllium Crystals", richness: 5 },
            { type: 16, name: "Cryo Formation Crystals", richness: 3 },
            { type: 19, name: "Drywater", richness: 3 },
            { type: 24, name: "Garnet Crystals", richness: 2 },
            { type: 25, name: "Germanium", richness: 1 },
            { type: 34, name: "Krypton", richness: 1 },
            { type: 50, name: "Peridot Crystals", richness: 2 },
            { type: 55, name: "Quantum Particle", richness: 5 },
            { type: 62, name: "Rochinol", richness: 2 },
            { type: 63, name: "Ruby Crystals", richness: 2 },
            { type: 64, name: "Sapphire Crystals", richness: 3 },
            { type: 78, name: "Topaz Crystals", richness: 2 },
            { type: 83, name: "Xenon", richness: 2 },
            { type: 85, name: "Zirconium Ore", richness: 4 }
        ],
        "Dark": [
            { type: 4, name: "Arco", richness: 1 },
            { type: 7, name: "Beryllium Crystals", richness: 5 },
            { type: 21, name: "Emerald Crystals", richness: 3 },
            { type: 23, name: "Fusion Catalyst Deposits", richness: 5 },
            { type: 25, name: "Germanium", richness: 1 },
            { type: 36, name: "Living Metal Symbionts", richness: 5 },
            { type: 40, name: "Methane", richness: 2 },
            { type: 41, name: "Neodymium", richness: 1 },
            { type: 42, name: "Neon", richness: 3 },
            { type: 54, name: "Quantum Computational Substrate", richness: 4 },
            { type: 55, name: "Quantum Particle", richness: 5 },
            { type: 62, name: "Rochinol", richness: 2 },
            { type: 67, name: "Silicon Crystal", richness: 1 },
            { type: 68, name: "Silver Ore", richness: 2 },
            { type: 78, name: "Topaz Crystals", richness: 2 },
            { type: 82, name: "Viscovite Crystals", richness: 3 },
            { type: 83, name: "Xenon", richness: 2 }
        ],
        "Oceanic": [
            { type: 0, name: "Abyssal Chromite", richness: 1 },
            { type: 1, name: "Abyssal Energy Crystals", richness: 4 },
            { type: 5, name: "Argon", richness: 2 },
            { type: 6, name: "Bathysphere Pearls", richness: 3 },
            { type: 9, name: "Biomass", richness: 1 },
            { type: 22, name: "Fluorine Gas", richness: 2 },
            { type: 30, name: "Hydrogen", richness: 1 },
            { type: 38, name: "Lunar Echo Crystals", richness: 5 },
            { type: 39, name: "Manganese Ore", richness: 2 },
            { type: 43, name: "Neural Coral Compounds", richness: 3 },
            { type: 44, name: "Nitrogen", richness: 1 },
            { type: 48, name: "Oxygen", richness: 2 },
            { type: 51, name: "Phase Shift Crystals", richness: 3 },
            { type: 73, name: "Thermal Bloom Sediment", richness: 2 }
        ]
    }
};


// Export state management functions
window.saveState = saveState;
window.undo = undo;
window.redo = redo;
window.clearMapData = clearMapData;
window.updateTopBarInfo = updateTopBarInfo;
window.initResourceFilterState = initResourceFilterState;
window.PLANET_ARCHETYPE_RESOURCES = PLANET_ARCHETYPE_RESOURCES; 
