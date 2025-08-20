// history-system.js - Complete overhaul of the history system

// History configuration
const HISTORY_CONFIG = {
    MAX_SIZE: 50,
    DEBUG: true
};

// History state
let historyData = {
    states: [],      // Array of complete state snapshots
    currentIndex: -1, // Current position in history
    isRestoring: false // Flag to prevent saving during restore
};

// Create a complete snapshot of the current application state
function createStateSnapshot(description = "Unknown Action") {
    if (HISTORY_CONFIG.DEBUG) {
        console.log(`[History] Creating snapshot: "${description}"`);
    }
    
    return {
        description: description,
        timestamp: new Date(),
        data: {
            // Map data
            mapData: JSON.parse(JSON.stringify(mapData || [])),
            systemCounter: systemCounter || 0,
            
            // Selection state
            selectedSystemKeys: (selectedSystems || []).map(s => s.key),
            
            // Region data
            regionDefinitions: JSON.parse(JSON.stringify(regionDefinitions || [])),
            
            // View state
            scale: scale || 5,
            offsetX: offsetX || 400,
            offsetY: offsetY || 300,
            
            // UI state
            showGrid: showGrid !== undefined ? showGrid : true,
            showSystemLabels: showSystemLabels !== undefined ? showSystemLabels : true,
            showSystemStats: showSystemStats !== undefined ? showSystemStats : false,
            showFactionArea: showFactionArea !== undefined ? showFactionArea : false,
            showRegions: showRegions !== undefined ? showRegions : true,
            snapToGrid: snapToGrid !== undefined ? snapToGrid : false,
            
            // File state
            currentFilename: currentFilename || null,
            isModified: isModified !== undefined ? isModified : false
        }
    };
}

// Restore application state from a snapshot
function restoreStateSnapshot(snapshot) {
    if (!snapshot || !snapshot.data) {
        console.error("[History] Invalid snapshot");
        return;
    }
    
    if (HISTORY_CONFIG.DEBUG) {
        console.log(`[History] Restoring: "${snapshot.description}"`);
    }
    
    // Set flag to prevent saving during restore
    historyData.isRestoring = true;
    
    try {
        const data = snapshot.data;
        
        // Restore map data
        mapData.length = 0;
        data.mapData.forEach(system => mapData.push(system));
        systemCounter = data.systemCounter;
        
        // Rebuild system lookup
        for (let key in systemLookup) {
            delete systemLookup[key];
        }
        mapData.forEach(system => {
            if (system.key) {
                systemLookup[system.key] = system;
            }
        });
        
        // Restore selection
        selectedSystems.length = 0;
        if (data.selectedSystemKeys && data.selectedSystemKeys.length > 0) {
            data.selectedSystemKeys.forEach(key => {
                const system = systemLookup[key];
                if (system) {
                    selectedSystems.push(system);
                }
            });
        }
        
        // Restore regions
        regionDefinitions.length = 0;
        if (data.regionDefinitions) {
            data.regionDefinitions.forEach(region => regionDefinitions.push(region));
        }
        
        // Restore view state
        scale = data.scale;
        offsetX = data.offsetX;
        offsetY = data.offsetY;
        
        // Restore UI state
        showGrid = data.showGrid;
        showSystemLabels = data.showSystemLabels;
        showSystemStats = data.showSystemStats;
        showFactionArea = data.showFactionArea;
        showRegions = data.showRegions;
        snapToGrid = data.snapToGrid;
        
        // Restore file state
        currentFilename = data.currentFilename;
        isModified = data.isModified;
        
        // Clear any temporary state
        hoveredSystem = null;
        draggedSystem = null;
        linkSourceSystem = null;
        isPanning = false;
        isLinking = false;
        isSelecting = false;
        
        // Update all UI elements
        updateAllUI();
        
        if (HISTORY_CONFIG.DEBUG) {
            console.log(`[History] Restored ${mapData.length} systems, ${selectedSystems.length} selected`);
        }
        
    } catch (error) {
        console.error("[History] Error restoring state:", error);
    } finally {
        // Clear flag
        historyData.isRestoring = false;
    }
}

// Update all UI elements after state restore
function updateAllUI() {
    // Update system details
    if (selectedSystems.length > 0) {
        displaySystemDetails(selectedSystems);
        if (selectedSystems.length === 1) {
            drawSystemPreview(selectedSystems[0]);
        } else {
            drawSystemPreview(null);
        }
    } else {
        displaySystemDetails(null);
        drawSystemPreview(null);
    }
    
    // Update various UI elements
    updateSystemCount();
    updateLockButtonsState();
    setupResourceFilter();
    updateTopBarInfo();
    updateUndoRedoButtons();
    
    // Update toggles
    const gridToggle = document.getElementById('gridToggle');
    const labelsToggle = document.getElementById('labelsToggle');
    const statsToggle = document.getElementById('statsToggle');
    const factionAreaToggle = document.getElementById('factionAreaToggle');
    const snapToGridToggle = document.getElementById('snapToGridToggle');
    const regionsToggle = document.getElementById('regionsToggle');
    
    if (gridToggle) gridToggle.checked = showGrid;
    if (labelsToggle) labelsToggle.checked = showSystemLabels;
    if (statsToggle) statsToggle.checked = showSystemStats;
    if (factionAreaToggle) factionAreaToggle.checked = showFactionArea;
    if (snapToGridToggle) snapToGridToggle.checked = snapToGrid;
    if (regionsToggle) regionsToggle.checked = showRegions;
    
    // Redraw the map
    drawGalaxyMap();
    
    // Force immediate canvas update
    if (canvas && ctx) {
        // Request animation frame to ensure the draw happens
        requestAnimationFrame(() => {
            drawGalaxyMap();
        });
    }
}

// Save current state to history
function saveHistoryState(description) {
    // Don't save if we're in the middle of restoring
    if (historyData.isRestoring) {
        return;
    }
    
    // Don't save empty states unless it's the initial state
    if (!description.includes("Initial") && (!mapData || mapData.length === 0) && 
        (!selectedSystems || selectedSystems.length === 0) && 
        (!regionDefinitions || regionDefinitions.length === 0)) {
        if (HISTORY_CONFIG.DEBUG) {
            console.log("[History] Skipping empty state save");
        }
        return;
    }
    
    // Remove any states after current index (clear redo stack)
    if (historyData.currentIndex < historyData.states.length - 1) {
        historyData.states = historyData.states.slice(0, historyData.currentIndex + 1);
    }
    
    // Add new state
    const snapshot = createStateSnapshot(description);
    historyData.states.push(snapshot);
    historyData.currentIndex++;
    
    // Limit history size
    if (historyData.states.length > HISTORY_CONFIG.MAX_SIZE) {
        historyData.states.shift();
        historyData.currentIndex--;
    }
    
    // Mark as modified
    isModified = true;
    updateTopBarInfo();
    updateUndoRedoButtons();
    updateHistoryPanel();
    
    if (HISTORY_CONFIG.DEBUG) {
        console.log(`[History] Saved state ${historyData.currentIndex}: "${description}"`);
    }
}

// Undo to previous state
function historyUndo() {
    if (historyData.currentIndex <= 0) {
        if (HISTORY_CONFIG.DEBUG) {
            console.log("[History] Nothing to undo");
        }
        return;
    }
    
    historyData.currentIndex--;
    const snapshot = historyData.states[historyData.currentIndex];
    
    if (HISTORY_CONFIG.DEBUG) {
        console.log(`[History] Undo to index ${historyData.currentIndex}: "${snapshot.description}"`);
    }
    
    restoreStateSnapshot(snapshot);
    updateHistoryPanel();
    
    // Force immediate canvas refresh
    setTimeout(() => {
        drawGalaxyMap();
    }, 0);
}

// Redo to next state
function historyRedo() {
    if (historyData.currentIndex >= historyData.states.length - 1) {
        if (HISTORY_CONFIG.DEBUG) {
            console.log("[History] Nothing to redo");
        }
        return;
    }
    
    historyData.currentIndex++;
    const snapshot = historyData.states[historyData.currentIndex];
    
    if (HISTORY_CONFIG.DEBUG) {
        console.log(`[History] Redo to index ${historyData.currentIndex}: "${snapshot.description}"`);
    }
    
    restoreStateSnapshot(snapshot);
    updateHistoryPanel();
    
    // Force immediate canvas refresh
    setTimeout(() => {
        drawGalaxyMap();
    }, 0);
}

// Jump to specific history state
function historyJumpTo(index) {
    if (index < 0 || index >= historyData.states.length) {
        console.error("[History] Invalid index:", index);
        return;
    }
    
    if (index === historyData.currentIndex) {
        if (HISTORY_CONFIG.DEBUG) {
            console.log("[History] Already at this state");
        }
        return;
    }
    
    historyData.currentIndex = index;
    const snapshot = historyData.states[index];
    
    if (HISTORY_CONFIG.DEBUG) {
        console.log(`[History] Jump to index ${index}: "${snapshot.description}"`);
    }
    
    restoreStateSnapshot(snapshot);
    updateHistoryPanel();
    
    // Force immediate canvas refresh
    setTimeout(() => {
        drawGalaxyMap();
    }, 0);
}

// Clear all history
function historyClear() {
    historyData.states = [];
    historyData.currentIndex = -1;
    
    // Save initial empty state
    saveHistoryState("Initial Empty State");
    
    if (HISTORY_CONFIG.DEBUG) {
        console.log("[History] Cleared history");
    }
}

// Get current history info
function getHistoryInfo() {
    return {
        states: historyData.states,
        currentIndex: historyData.currentIndex,
        canUndo: historyData.currentIndex > 0,
        canRedo: historyData.currentIndex < historyData.states.length - 1
    };
}

// Initialize history system
function initializeHistory() {
    if (HISTORY_CONFIG.DEBUG) {
        console.log("[History] Initializing history system");
    }
    
    // Clear history
    historyClear();
    
    // Override the old functions
    window.saveState = saveHistoryState;
    window.undo = historyUndo;
    window.redo = historyRedo;
    window.restoreHistoryState = historyJumpTo;
    
    // Also update the global references
    window.historyStack = historyData.states; // For compatibility
    window.redoStack = []; // Not used anymore but kept for compatibility
}

// Export functions
window.createStateSnapshot = createStateSnapshot;
window.restoreStateSnapshot = restoreStateSnapshot;
window.saveHistoryState = saveHistoryState;
window.historyUndo = historyUndo;
window.historyRedo = historyRedo;
window.historyJumpTo = historyJumpTo;
window.historyClear = historyClear;
window.getHistoryInfo = getHistoryInfo;
window.initializeHistory = initializeHistory;
