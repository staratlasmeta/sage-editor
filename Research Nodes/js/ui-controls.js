// === MODULE: UI Controls ===
// Handles UI controls, mode switching, view toggles, and node details

/**
 * Show node details bar on hover
 */
function showNodeDetails(editor, node) {
    const detailsBar = document.getElementById('nodeDetails');
    detailsBar.classList.add('visible');
    
    document.getElementById('detailName').textContent = node.name || 'Unnamed';
    document.getElementById('detailScalability').textContent = node.scalability || 'None';
    document.getElementById('detailMilestone').textContent = node.milestone || 'None';
    document.getElementById('detailTag').textContent = node.tag || 'None';
    document.getElementById('detailDescription').textContent = node.description || 'No description';
}

/**
 * Hide node details bar
 */
function hideNodeDetails() {
    const detailsBar = document.getElementById('nodeDetails');
    detailsBar.classList.remove('visible');
}

/**
 * Set editor mode
 */
function setMode(editor, mode) {
    // Store grid state before changing modes
    if (!editor.gridStateBeforeSimulation && editor.mode !== 'simulation' && mode === 'simulation') {
        editor.gridStateBeforeSimulation = editor.showGrid;
    }
    
    editor.mode = mode;
    editor.connectingFrom = null;
    
    // Update UI visibility based on mode
    const bulkEditToolbar = document.getElementById('bulkEditToolbar');
    const simulationToolbar = document.getElementById('simulationToolbar');
    const careerXPPanel = document.getElementById('careerXPPanel');
    const modeToggle = document.getElementById('modeToggle');
    
    if (mode === 'simulation') {
        // Hide edit-related UI
        if (bulkEditToolbar) bulkEditToolbar.style.display = 'none';
        
        // Hide the old simulation toolbar - we've moved controls to career panel
        if (simulationToolbar) simulationToolbar.style.display = 'none';
        
        // Show career panel
        if (careerXPPanel) careerXPPanel.style.display = 'block';
        
        // Update mode toggle button
        if (modeToggle) {
            modeToggle.textContent = '✏️';
            modeToggle.title = 'Edit Mode';
        }
        
        // Hide grid in simulation mode
        editor.showGrid = false;
        
        // Initialize simulation if not already done
        if (window.Simulation) {
            if (!window.Simulation.SimulationState.isRunning) {
                window.Simulation.initializeSimulation(editor);
            }
            // Update UI immediately to show career panels
            window.Simulation.updateSimulationUI(editor);
        }
        
        // Add simulation class to canvas
        editor.canvas.classList.add('simulation-mode');
    } else {
        // Hide simulation UI
        if (simulationToolbar) simulationToolbar.style.display = 'none';
        if (careerXPPanel) careerXPPanel.style.display = 'none';
        
        // Restore grid state when leaving simulation mode
        if (editor.gridStateBeforeSimulation !== undefined) {
            editor.showGrid = editor.gridStateBeforeSimulation;
            delete editor.gridStateBeforeSimulation;
        }
        
        // Show/hide edit UI based on mode
        if (mode === 'edit' && editor.selectedNodes && editor.selectedNodes.size > 1) {
            if (bulkEditToolbar) bulkEditToolbar.style.display = 'flex';
        } else {
            if (bulkEditToolbar) bulkEditToolbar.style.display = 'none';
        }
        
        // Update mode toggle button
        if (modeToggle) {
            modeToggle.textContent = mode === 'edit' ? '🔓' : '🔒';
            modeToggle.title = mode === 'edit' ? 'Lock (View Mode)' : 'Unlock (Edit Mode)';
        }
        
        // Remove simulation class from canvas
        editor.canvas.classList.remove('simulation-mode');
        
        // Stop simulation if running
        if (window.Simulation) {
            window.Simulation.stopSimulation();
        }
    }
    
    // Update cursor from EventHandlers
    if (window.EventHandlers && window.EventHandlers.updateCursor) {
        window.EventHandlers.updateCursor(editor);
    }
}

/**
 * Toggle grid visibility
 */
function toggleGrid(editor) {
    editor.showGrid = !editor.showGrid;
    document.getElementById('toggleGrid').classList.toggle('active');
}

/**
 * Toggle labels visibility
 */
function toggleLabels(editor) {
    editor.showLabels = !editor.showLabels;
    document.getElementById('toggleLabels').classList.toggle('active');
}

/**
 * Toggle snap to grid
 */
function toggleSnapToGrid(editor) {
    editor.snapToGrid = !editor.snapToGrid;
    document.getElementById('toggleSnapToGrid').classList.toggle('active');
}

/**
 * Toggle FPS counter visibility
 */
function toggleFPS(editor) {
    editor.showFPS = !editor.showFPS;
    const fpsCounter = document.getElementById('fpsCounter');
    if (fpsCounter) {
        fpsCounter.style.display = editor.showFPS ? 'block' : 'none';
    }
    document.getElementById('toggleFPS').classList.toggle('active');
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

/**
 * Update status indicator
 */
function updateStatusIndicator(status, message) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    statusText.textContent = message || 'SYSTEM READY';
    
    // Update status dot color
    statusDot.style.background = status === 'error' ? '#ff3366' : 
                                status === 'warning' ? '#ffaa00' : 
                                '#00ff88';
}

/**
 * Show toast notification
 */
function showToast(message, duration = 2000) {
    // Create toast element if it doesn't exist
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = `
            position: fixed;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 14px;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
        `;
        document.body.appendChild(toast);
    }
    
    // Show toast
    toast.textContent = message;
    toast.style.opacity = '1';
    
    // Hide after duration
    setTimeout(() => {
        toast.style.opacity = '0';
    }, duration);
}

/**
 * Hide keyboard help
 */
function hideKeyboardHelp() {
    const keyboardHelp = document.getElementById('keyboardHelp');
    if (keyboardHelp) {
        keyboardHelp.style.display = 'none';
    }
}

/**
 * Show keyboard help
 */
function showKeyboardHelp() {
    const keyboardHelp = document.getElementById('keyboardHelp');
    if (keyboardHelp) {
        keyboardHelp.style.display = 'block';
    }
}

/**
 * Initialize UI
 */
function initializeUI(editor) {
    // Set initial values
    document.getElementById('zoomLevel').textContent = '100%';
    // Mode display removed from UI
    
    // Set initial button states
    document.getElementById('toggleGrid').classList.add('active');
    document.getElementById('toggleLabels').classList.add('active');
    document.getElementById('toggleSnapToGrid').classList.add('active');
    document.getElementById('toggleFPS').classList.add('active');
    
    // Hide loading overlay after delay
    setTimeout(() => hideLoadingOverlay(), 500);
}

// === MODULE EXPORT ===
window.UIControls = {
    showNodeDetails,
    hideNodeDetails,
    setMode,
    toggleGrid,
    toggleLabels,
    toggleSnapToGrid,
    toggleFPS,
    hideLoadingOverlay,
    updateStatusIndicator,
    initializeUI,
    showToast,
    hideKeyboardHelp,
    showKeyboardHelp
};

// Backward compatibility
window.showNodeDetails = showNodeDetails;
window.hideNodeDetails = hideNodeDetails;
window.setMode = setMode;
window.toggleGrid = toggleGrid;
window.toggleLabels = toggleLabels;
window.toggleSnapToGrid = toggleSnapToGrid;
window.toggleFPS = toggleFPS;
window.hideLoadingOverlay = hideLoadingOverlay;
window.updateStatusIndicator = updateStatusIndicator;
window.initializeUI = initializeUI;
window.showToast = showToast;
window.hideKeyboardHelp = hideKeyboardHelp;
window.showKeyboardHelp = showKeyboardHelp;

console.log('UI Controls module loaded successfully'); 