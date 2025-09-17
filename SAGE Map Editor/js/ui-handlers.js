// ui-handlers.js - UI event handlers and UI-related functions

// DOM Element References
let searchSystemInput = null;
let resourceFilter = null;
let currentFilenameSpan = null;
let saveStatusIndicator = null;
let undoBtn = null;
let redoBtn = null;
let deselectBtn = null;
let historyPanel = null;
let historyList = null;
let factionAreaPanel = null;
let systemCount = null;

// Initialize UI elements and event handlers
function initUI() {
    // Get references to UI elements
    searchSystemInput = document.getElementById('searchSystem');
    resourceFilter = document.getElementById('resourceFilter');
    currentFilenameSpan = document.getElementById('currentFilename');
    saveStatusIndicator = document.getElementById('saveStatusIndicator');
    undoBtn = document.getElementById('undoBtn');
    redoBtn = document.getElementById('redoBtn');
    deselectBtn = document.getElementById('deselectBtn');
    historyPanel = document.getElementById('historyPanel');
    historyList = document.getElementById('historyList');
    factionAreaPanel = document.getElementById('factionAreaStats');
    systemCount = document.getElementById('systemCount');

    // Attach event listeners to buttons
    document.getElementById('resetViewBtn').addEventListener('click', centerMapView);
    document.getElementById('newSystemBtn').addEventListener('click', createNewSystem);
    document.getElementById('deleteSystemBtn').addEventListener('click', deleteSelectedSystems);
    document.getElementById('linkSystemBtn').addEventListener('click', toggleLinkMode);
    document.getElementById('copySystemBtn').addEventListener('click', copySelectedSystem);
    document.getElementById('pasteSystemBtn').addEventListener('click', pasteSystem);
    document.getElementById('toggleGridBtn').addEventListener('click', toggleGrid);
    document.getElementById('toggleSnapBtn').addEventListener('click', toggleSnapToGrid);
    document.getElementById('cycleSizeBtn').addEventListener('click', cycleSystemSize);
    document.getElementById('importBtn').addEventListener('click', importMap);
    document.getElementById('exportBtn').addEventListener('click', exportMap);
    document.getElementById('newMapBtn').addEventListener('click', newMap);
    document.getElementById('createRegionBtn').addEventListener('click', createNewRegion);
    document.getElementById('addToRegionBtn').addEventListener('click', addSelectedSystemsToRegion);
    document.getElementById('manageFactionAreaBtn').addEventListener('click', toggleFactionArea);
    document.getElementById('removeFromRegionBtn').addEventListener('click', removeSelectedSystemsFromRegion);
    document.getElementById('resourceRichnessBtn').addEventListener('click', showResourceRichnessModal);
    document.getElementById('helpBtn').addEventListener('click', showHelpModal);

    // Add event listeners for undo/redo
    if (undoBtn) undoBtn.addEventListener('click', undo);
    if (redoBtn) redoBtn.addEventListener('click', redo);
    if (deselectBtn) deselectBtn.addEventListener('click', deselectAll);

    // Search functionality
    if (searchSystemInput) {
        searchSystemInput.addEventListener('input', function () {
            searchTerm = this.value.toLowerCase();

            // Show/hide clear button based on whether there's text
            const wrapper = this.closest('.search-input-wrapper');
            if (wrapper) {
                wrapper.classList.toggle('has-text', this.value.length > 0);
            }

            drawGalaxyMap(); // Redraw to highlight matching systems
        });

        // Add handler for clear button
        const clearBtn = document.getElementById('clearSearchBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                if (searchSystemInput) {
                    searchSystemInput.value = '';
                    searchTerm = '';

                    // Hide the clear button
                    const wrapper = searchSystemInput.closest('.search-input-wrapper');
                    if (wrapper) {
                        wrapper.classList.remove('has-text');
                    }

                    // Focus the search input
                    searchSystemInput.focus();

                    // Redraw map to show all systems
                    drawGalaxyMap();
                }
            });
        }

        // Set initial state for clear button
        const wrapper = searchSystemInput.closest('.search-input-wrapper');
        if (wrapper) {
            wrapper.classList.toggle('has-text', searchSystemInput.value.length > 0);
        }
    }

    // Initialize history button to show history tab
    if (document.getElementById('historyToggleBtn')) {
        document.getElementById('historyToggleBtn').addEventListener('click', function () {
            // Find the history tab and click it to switch to it
            const historyTab = document.querySelector('.details-tab[data-tab="history-tab"]');
            if (historyTab) {
                historyTab.click();
                // Update history list when switching to tab
                updateHistoryPanel();
            }
        });
    }

    // Initialize faction area panel if it exists
    if (factionAreaPanel) {
        const factionPanelHeader = factionAreaPanel.querySelector('h3');
        if (factionPanelHeader) {
            factionPanelHeader.addEventListener('click', function () {
                factionAreaPanel.classList.add('hidden');
            });
        }
    }

    // Set up resize handler for canvas
    window.addEventListener('resize', updateCanvasSize);

    // Initialize resource filter state
    initResourceFilterState();
    if (resourceFilter) {
        setupResourceFilter();
        // Apply all filters by default on startup
        selectAllFilters();
    }

    // Initialize top bar info
    updateTopBarInfo();

    // Update initial button states
    updateUndoRedoButtons();

    // Setup tooltip system
    setupTooltips();

    // Setup details panel tabs
    setupDetailsTabs();

    // Add event listener for Fix Data button
    if (document.getElementById('fixDataBtn')) {
        document.getElementById('fixDataBtn').addEventListener('click', function () {
            const count = fixFactionData();
            if (count > 0) {
                alert(`Fixed faction data for ${count} systems`);
            } else {
                alert('No faction data needed fixing');
            }
        });
    }

    // Initialize keyboard shortcuts
    initKeyboardShortcuts();

    // Add zoom controls to help with precision zooming
    addZoomControls();

    // Initialize system preview scale
    previewScale = 1.0;
    previewOffsetX = 0;
    previewOffsetY = 0;

    // Lock buttons
    document.getElementById('lockBtn').addEventListener('click', lockSystems);
    document.getElementById('unlockBtn').addEventListener('click', unlockSystems);
    document.getElementById('lockAllBtn').addEventListener('click', toggleLockAllSystems);

    // Add listeners for filter Select All/None here (run once)
    const selectAllBtn = document.getElementById('select-all-resources');
    const selectNoneBtn = document.getElementById('select-none-resources');

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', selectAllFilters);
        selectAllBtn.disabled = false; // Ensure button is enabled
    }

    if (selectNoneBtn) {
        selectNoneBtn.addEventListener('click', selectNoneFilters);
        selectNoneBtn.disabled = false; // Ensure button is enabled
    }

    // Ensure filters are applied on initial load
    drawGalaxyMap();
}

// Initialize canvas event handlers
function initCanvasHandlers() {
    if (!canvas) return;

    // Mouse events for galaxy view
    canvas.addEventListener('mousedown', handleGalaxyMouseDown);
    canvas.addEventListener('mousemove', handleGalaxyMouseMove);
    canvas.addEventListener('mouseup', handleGalaxyMouseUp);
    canvas.addEventListener('wheel', handleGalaxyWheel, { passive: false });
    canvas.addEventListener('contextmenu', function (e) {
        e.preventDefault(); // Prevent context menu
    });

    // Add double-click handler for region selection
    canvas.addEventListener('dblclick', handleGalaxyDoubleClick);

    // Mouse events for system preview
    if (previewCanvas) {
        previewCanvas.addEventListener('mousedown', handlePreviewMouseDown);
        previewCanvas.addEventListener('mousemove', handlePreviewMouseMove);
        previewCanvas.addEventListener('mouseup', handlePreviewMouseUp);
        previewCanvas.addEventListener('wheel', handlePreviewWheel, { passive: false });
        previewCanvas.addEventListener('contextmenu', function (e) {
            e.preventDefault(); // Prevent context menu
        });
    }
}

// Handle galaxy view mouse down
function handleGalaxyMouseDown(event) {
    const coords = getGalaxyCanvasCoords(event);

    // Store mouse position
    mouseX = coords.x;
    mouseY = coords.y;

    // Middle mouse button or Spacebar panning
    if (event.button === 1 || (event.button === 0 && event.code === 'Space')) {
        isPanning = true;
        lastMouseX = coords.x;
        lastMouseY = coords.y;
        canvas.style.cursor = 'grabbing';
        event.preventDefault();
        return;
    }

    // Right mouse button (Context menu / Linking / New System)
    if (event.button === 2) {
        if (isLinking) {
            // Cancel linking mode on right-click
            isLinking = false;
            linkSourceSystem = null;
            updateActiveToolButton(); // Update link button state
            drawGalaxyMap();
            return;
        }

        // Find system under click
        const system = findSystemAtCoords(coords.x, coords.y);
        if (system) {
            // If clicking a selected system, potentially start link mode
            if (selectedSystems.includes(system)) {
                // Start link mode only if exactly one UNLOCKED system is selected
                if (selectedSystems.length === 1 && !system.isLocked) {
                    isLinking = true;
                    linkSourceSystem = system;
                    updateActiveToolButton(); // Update link button state
                    console.log("Started linking from:", system.name);
                    drawGalaxyMap(); // Redraw to show linking indication
                } else if (system.isLocked) {
                    console.log(`System ${system.name} is locked. Cannot start linking.`);
                    // Optionally show context menu for locked system?
                } else if (selectedSystems.length > 1) {
                    console.log("Right-click on one of multiple selected systems. Context menu?");
                    // Show context menu for multiple selected systems (implement if needed)
                }
            } else {
                // If clicking an unselected system, select it (if unlocked)
                if (system.isLocked) {
                    console.log(`System ${system.name} is locked. Selecting for view only.`);
                    selectedSystems.length = 0;
                    selectedSystems.push(system); // Select only the locked system
                    displaySystemDetails(selectedSystems);
                    updateLockButtonsState();
                    drawGalaxyMap();

                    // Save the selection state change
                    saveState(`Selected ${system.name}`);
                } else {
                    selectedSystems.length = 0;
                    selectedSystems.push(system); // Select the unlocked system
                    displaySystemDetails(selectedSystems);
                    drawSystemPreview(system);
                    updateLockButtonsState();
                    drawGalaxyMap();

                    // Save the selection state change
                    saveState(`Selected ${system.name}`);
                }
            }
        } else {
            // Right-click on empty space: Create a new system
            const mapCoords = screenToMapCoords(mouseX, mouseY);
            let x = mapCoords.x;
            let y = mapCoords.y;
            if (snapToGrid) {
                x = Math.round(x / GALAXY_GRID_SPACING) * GALAXY_GRID_SPACING;
                y = Math.round(y / GALAXY_GRID_SPACING) * GALAXY_GRID_SPACING;
            }
            console.log(`Creating new system via right-click at map coordinates: ${x.toFixed(2)}, ${y.toFixed(2)}`);
            createNewSystemAtCoords(x, y); // This function handles selection and state saving
            canvas.style.cursor = 'default'; // Reset cursor after action
        }
        return; // End right-click handling
    }

    // Left mouse button down (e.button === 0)
    if (event.button === 0) {
        // Find system under click
        const system = findSystemAtCoords(coords.x, coords.y);

        if (system) {
            console.log("Left-clicked on system:", system.name);

            // --- LOCK CHECK --- 
            if (system.isLocked) {
                console.log(`System ${system.name} is locked. Interaction limited.`);
                // Allow selecting/deselecting locked system for viewing only
                if (event.shiftKey) { // Use shift for toggling locked selection
                    const index = selectedSystems.findIndex(s => s.key === system.key);
                    if (index > -1) {
                        selectedSystems.splice(index, 1); // Allow deselection
                    } else {
                        selectedSystems.push(system); // Allow adding to selection
                    }

                    // Save the selection state change
                    saveState(`${index > -1 ? 'Deselected' : 'Selected'} ${system.name}`);
                } else {
                    // Simple click on locked: Select only this locked system
                    if (!(selectedSystems.length === 1 && selectedSystems[0].key === system.key)) {
                        selectedSystems.length = 0;
                        selectedSystems.push(system);

                        // Save the selection state change
                        saveState(`Selected ${system.name}`);
                    }
                }
                displaySystemDetails(selectedSystems);
                updateLockButtonsState();
                drawGalaxyMap();
                // Prevent drag initiation
                draggedSystem = null;
                didDrag = false;
                setupResourceFilter(); // Update filter state after potential selection change
                return; // Stop further processing for locked systems
            }
            // --- END LOCK CHECK ---

            // If system is NOT locked:
            if (isLinking && linkSourceSystem) {
                // Complete link (Source system cannot be locked due to link initiation logic)
                if (linkSourceSystem !== system) { // Avoid linking to self
                    // Target system is confirmed not locked by the check above
                    toggleSystemLink(linkSourceSystem, system);
                } // else { console.log("Attempted to link system to itself."); } // Optional log
                isLinking = false;
                linkSourceSystem = null;
                updateActiveToolButton();
                drawGalaxyMap();
            } else if (event.shiftKey) {
                // Toggle selection for unlocked system
                const index = selectedSystems.findIndex(s => s.key === system.key);
                if (index !== -1) {
                    selectedSystems.splice(index, 1);
                } else {
                    selectedSystems.push(system);
                }

                // Save the selection state change
                saveState(`${index !== -1 ? 'Deselected' : 'Selected'} ${system.name}`);

                displaySystemDetails(selectedSystems);
                updateSystemPreview(); // Use helper for preview update
                drawGalaxyMap();
            } else {
                // Simple click on unlocked system: Select and initiate drag
                let systemWasAlreadySelected = selectedSystems.some(s => s.key === system.key);

                if (!systemWasAlreadySelected) {
                    console.log("Selecting system:", system.name);
                    selectedSystems.length = 0;
                    selectedSystems.push(system); // Select only this system
                    displaySystemDetails(selectedSystems);
                    updateSystemPreview();

                    // Save the selection state change
                    saveState(`Selected ${system.name}`);
                } else {
                    // If clicking an already selected system within a multi-selection,
                    // don't deselect others, just prepare for drag.
                    console.log("Clicked on already selected system, preparing drag:", system.name);
                }

                // Start dragging preparation (for all selected systems if the clicked one is selected)
                // Check if ANY selected system is locked before allowing drag initiation
                if (selectedSystems.some(s => s.isLocked)) {
                    console.log("Cannot initiate drag because one or more selected systems are locked.");
                    draggedSystem = null; // Prevent drag
                    didDrag = false;
                } else {
                    console.log("Initiating drag for system:", system.name);
                    draggedSystem = system; // The system directly under cursor initiates drag
                    const sysScreenX = system.coordinates[0] * scale + offsetX;
                    const sysScreenY = system.coordinates[1] * -1 * scale + offsetY;
                    dragOffsetX = coords.x - sysScreenX;
                    dragOffsetY = coords.y - sysScreenY;
                    didDrag = false; // Reset drag flag
                }
                drawGalaxyMap(); // Redraw needed if selection changed
            }
            updateLockButtonsState(); // Update lock button state after any selection change
            setupResourceFilter(); // Update filter state after any selection change

        } else {
            // Clicked on empty space
            console.log("Left-clicked on empty space");
            if (event.ctrlKey || event.metaKey) {
                // Start selection box from empty space
                console.log("Starting selection box");
                isSelecting = true;
                selectionStart = { x: coords.x, y: coords.y };
                selectionEnd = { x: coords.x, y: coords.y };
                // Clear previous selection if not holding shift (standard box select behavior)
                if (!event.shiftKey) {
                    // Unconditionally clear selection
                    if (selectedSystems.length > 0) {
                        selectedSystems.length = 0;
                        console.log(`Box select: Deselected all systems.`);

                        // Save the selection state change
                        saveState("Deselected All Systems", false, false, {
                            selectedKeys: [],
                            prevSelectedKeys: prevSelection.map(sys => sys.key)
                        });
                    }

                    displaySystemDetails(selectedSystems);
                    updateSystemPreview();
                    updateLockButtonsState();
                } // If shift is held, box select adds to current selection later in mouseup
            } else {
                // Start panning
                console.log("Starting panning");
                isPanning = true;
                lastMouseX = coords.x;
                lastMouseY = coords.y;
                canvas.style.cursor = 'grabbing';

                // Deselect all systems if not holding shift (and no locked systems selected)
                if (!event.shiftKey) {
                    if (selectedSystems.length > 0) {
                        // Unconditionally clear selection
                        console.log(`Click empty: Deselected all systems.`);
                        selectedSystems.length = 0;

                        // Save the selection state change
                        saveState("Deselected All Systems");

                        displaySystemDetails(selectedSystems);
                        updateSystemPreview();
                        updateLockButtonsState();
                    }
                }
            }
            drawGalaxyMap();
        }
    } // End Left mouse button (e.button === 0)
}

// Handle galaxy view mouse move
function handleGalaxyMouseMove(event) {
    const coords = getGalaxyCanvasCoords(event);

    // Store current mouse position
    mouseX = coords.x;
    mouseY = coords.y;

    if (isPanning) {
        // Pan the view
        offsetX += coords.x - lastMouseX;
        offsetY += coords.y - lastMouseY;
        lastMouseX = coords.x;
        lastMouseY = coords.y;
        drawGalaxyMap();
    } else if (draggedSystem) {
        // Drag the system(s)
        didDrag = true;
        const newScreenX = coords.x - dragOffsetX;
        const newScreenY = coords.y - dragOffsetY;

        let newMapX = (newScreenX - offsetX) / scale;
        let newMapY = (newScreenY - offsetY) / -scale;

        // Apply snap to grid if enabled
        if (snapToGrid) {
            newMapX = Math.round(newMapX / GALAXY_GRID_SPACING) * GALAXY_GRID_SPACING;
            newMapY = Math.round(newMapY / GALAXY_GRID_SPACING) * GALAXY_GRID_SPACING;
        }

        // Calculate the offset from the original position
        const deltaX = newMapX - draggedSystem.coordinates[0];
        const deltaY = newMapY - draggedSystem.coordinates[1];

        // Only proceed if there's actual movement
        if (deltaX !== 0 || deltaY !== 0) {
            // If the dragged system is part of the selection, move all selected systems
            if (selectedSystems.includes(draggedSystem)) {
                // Move all selected systems by the same amount
                selectedSystems.forEach(system => {
                    system.coordinates[0] += deltaX;
                    system.coordinates[1] += deltaY;
                });

                // Update draggedSystem coordinates to match new position for next move calculation
                draggedSystem.coordinates[0] = newMapX;
                draggedSystem.coordinates[1] = newMapY;
            } else {
                // If dragged system is not part of selection, just move it
                draggedSystem.coordinates[0] = newMapX;
                draggedSystem.coordinates[1] = newMapY;
            }

            // Update system details panel if showing a single system
            if (selectedSystems.length === 1) {
                updateSystemDetails(selectedSystems[0]);
            }

            drawGalaxyMap();
        }
    } else if (isSelecting) {
        // Update selection box
        selectionEnd = { x: coords.x, y: coords.y };
        drawGalaxyMap();
    } else if (isLinking && linkSourceSystem) {
        // Update linking line
        drawGalaxyMap();
    } else {
        // Update hovered system (only if not panning/dragging/selecting)
        let system = null;
        if (!isPanning && !draggedSystem && !isSelecting) { // Use isSelecting instead of isSelectingBox
            system = findSystemAtCoords(coords.x, coords.y);
        }

        // Set cursor based on hover state and lock status
        if (system) {
            canvas.style.cursor = system.isLocked ? 'default' : 'pointer'; // Default for locked, pointer for unlocked
        } else if (!isPanning && !draggedSystem && !isSelecting) {
            canvas.style.cursor = 'default'; // Default cursor for empty space
        } else if (isPanning) {
            canvas.style.cursor = 'grabbing'; // Keep grabbing cursor while panning
        } // Implicitly keep move/other cursors if dragging/selecting

        if (system && system !== hoveredSystem) {
            hoveredSystem = system;
            drawGalaxyMap();
        } else if (!system && hoveredSystem) {
            hoveredSystem = null;
            if (!isPanning && !draggedSystem && !isSelecting) { // Check state before setting cursor
                canvas.style.cursor = 'default';
            }
            drawGalaxyMap(); // Redraw to remove hover effect
        }
    }

    // Update coordinates display
    updateMouseCoordinates();
}

// Handle galaxy view mouse up
function handleGalaxyMouseUp(event) {
    const coords = getGalaxyCanvasCoords(event);

    // Reset cursor regardless of action unless hovering over something interactive
    const systemUnderMouse = findSystemAtCoords(coords.x, coords.y);
    if (systemUnderMouse) {
        canvas.style.cursor = systemUnderMouse.isLocked ? 'default' : 'pointer';
    } else {
        canvas.style.cursor = 'default';
    }

    if (isSelecting) {
        // Finish selection box
        selectionEnd = { x: coords.x, y: coords.y };

        // Get systems in selection box
        const selectionBox = {
            left: Math.min(selectionStart.x, selectionEnd.x),
            right: Math.max(selectionStart.x, selectionEnd.x),
            top: Math.min(selectionStart.y, selectionEnd.y),
            bottom: Math.max(selectionStart.y, selectionEnd.y)
        };

        // Filter systems within the box (ALLOW locked systems)
        const selectedInBox = mapData.filter(system => {
            if (!system.coordinates) return false; // Exclude locked systems

            const sysScreenX = system.coordinates[0] * scale + offsetX;
            const sysScreenY = system.coordinates[1] * -1 * scale + offsetY;

            return sysScreenX >= selectionBox.left && sysScreenX <= selectionBox.right &&
                sysScreenY >= selectionBox.top && sysScreenY <= selectionBox.bottom;
        });

        if (selectedInBox.length > 0) {
            let selectionDescription = "";

            // If shift is held, add to selection, otherwise replace
            if (event.shiftKey) {
                // Add to selection, avoiding duplicates
                const addedSystems = [];
                selectedInBox.forEach(system => {
                    if (!selectedSystems.includes(system)) {
                        selectedSystems.push(system);
                        addedSystems.push(system);
                    }
                });
                selectionDescription = `Added ${addedSystems.length} Systems to Selection`;
            } else {
                // Replace selection with newly selected UNLOCKED systems
                selectedSystems = selectedInBox; // selectedInBox already excludes locked
                selectionDescription = `Selected ${selectedSystems.length} Systems`;
            }

            // Save the selection state change
            saveState(selectionDescription);

            displaySystemDetails(selectedSystems);
            if (selectedSystems.length === 1) {
                drawSystemPreview(selectedSystems[0]);
            } else {
                drawSystemPreview(null);
            }
            updateLockButtonsState(); // Update lock button state
        }

        isSelecting = false;
        drawGalaxyMap();
    } else if (draggedSystem) {
        // Save state if position was changed
        if (didDrag) {
            console.log("Saving state after dragging system:", draggedSystem.name);

            // Save the move as a new state (not grouped)
            saveState("Moved System");
        } else {
            console.log("System was clicked but not dragged:", draggedSystem.name);
        }
        draggedSystem = null;
        didDrag = false;
        updateLockButtonsState(); // Update lock button state
        setupResourceFilter(); // Update filter state
    }

    isPanning = false;
    // Check hover state before resetting cursor
    const finalHovered = findSystemAtCoords(coords.x, coords.y);
    canvas.style.cursor = finalHovered ? (finalHovered.isLocked ? 'default' : 'pointer') : 'default';

    // Update undo/redo buttons
    updateUndoRedoButtons();
    if (deselectBtn) {
        deselectBtn.disabled = selectedSystems.length === 0;
    }
}

// Handle galaxy view mouse wheel
function handleGalaxyWheel(event) {
    event.preventDefault();

    // Get mouse position
    const mousePos = getGalaxyCanvasCoords(event);

    // Calculate map coordinates before zoom
    const mapCoordsBefore = screenToMapCoords(mousePos.x, mousePos.y);

    // Calculate zoom factor
    const wheelDelta = event.deltaY || event.detail || event.wheelDelta;
    const zoomFactor = wheelDelta > 0 ? 0.9 : 1.1;

    // Apply zoom
    scale *= zoomFactor;

    // Apply limits - allow much higher zoom levels
    scale = Math.max(0.1, Math.min(scale, 500));

    // Calculate map coordinates after zoom
    const mapCoordsAfter = screenToMapCoords(mousePos.x, mousePos.y);

    // Adjust offset to keep point under mouse
    offsetX += (mapCoordsAfter.x - mapCoordsBefore.x) * scale;
    offsetY -= (mapCoordsAfter.y - mapCoordsBefore.y) * scale;

    // Redraw
    drawGalaxyMap();
}

// Handle preview mouse down
function handlePreviewMouseDown(event) {
    if (!previewCanvas) return;

    const rect = previewCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    isPreviewPanning = true;
    lastPreviewMouseX = x;
    lastPreviewMouseY = y;
}

// Handle preview mouse move
function handlePreviewMouseMove(event) {
    if (!previewCanvas || !isPreviewPanning) return;

    const rect = previewCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    previewOffsetX += x - lastPreviewMouseX;
    previewOffsetY += y - lastPreviewMouseY;

    lastPreviewMouseX = x;
    lastPreviewMouseY = y;

    if (selectedSystems.length === 1) {
        drawSystemPreview(selectedSystems[0]);
    }
}

// Handle preview mouse up
function handlePreviewMouseUp() {
    isPreviewPanning = false;
}

// Handle preview wheel
function handlePreviewWheel(event) {
    event.preventDefault();

    // Determine zoom direction
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;

    // Apply zoom
    previewScale *= zoomFactor;

    // Limit zoom
    previewScale = Math.max(0.2, Math.min(previewScale, 5));

    if (selectedSystems.length === 1) {
        drawSystemPreview(selectedSystems[0]);
    }
}

// Update mouse coordinates display
function updateMouseCoordinates() {
    const coordsDisplay = document.getElementById('mouseCoords');
    if (!coordsDisplay) return;

    if (mouseX > 0 && mouseY > 0) {
        const mapCoords = screenToMapCoords(mouseX, mouseY);
        // Fixed width format for coordinates to prevent layout shifts
        coordsDisplay.textContent = `X: ${mapCoords.x.toFixed(2).padStart(7, ' ')}, Y: ${mapCoords.y.toFixed(2).padStart(7, ' ')}`;
    } else {
        coordsDisplay.textContent = 'X: ---.--  , Y: ---.--';
    }
}

// Toggle view mode between galaxy and system view
// NOTE: This function is not currently in use as the Toggle Panel button has been removed.
// Keeping it for potential future use.
function toggleViewMode() {
    // Toggle the details panel visibility
    const detailsPanel = document.getElementById('detailsPanel');
    if (detailsPanel) {
        detailsPanel.classList.toggle('hidden');

        // Update button state
        const btn = document.getElementById('viewSwitchBtn');
        if (btn) {
            btn.classList.toggle('active', !detailsPanel.classList.contains('hidden'));
        }

        // Resize canvas after panel toggle
        setTimeout(updateCanvasSize, 300);
    }
}

// Toggle grid display
function toggleGrid() {
    showGrid = !showGrid;
    const btn = document.getElementById('toggleGridBtn');
    if (btn) {
        btn.classList.toggle('active', showGrid);
    }
    drawGalaxyMap();
}

// Toggle system labels
function toggleSystemLabels() {
    showSystemLabels = !showSystemLabels;
    const btn = document.getElementById('toggleLabelsBtn');
    if (btn) {
        btn.classList.toggle('active', showSystemLabels);
    }
    drawGalaxyMap();
}

// Toggle system stats
function toggleSystemStats() {
    showSystemStats = !showSystemStats;
    const btn = document.getElementById('toggleStatsBtn');
    if (btn) {
        btn.classList.toggle('active', showSystemStats);
    }
    drawGalaxyMap();
}

// Toggle snap to grid
function toggleSnapToGrid() {
    snapToGrid = !snapToGrid;
    const btn = document.getElementById('toggleSnapBtn');
    if (btn) {
        btn.classList.toggle('active', snapToGrid);
    }
}

// Cycle through system sizes (100%, 50%, 25%)
function cycleSystemSize() {
    // Current multiplier is 1.0 (100%)
    if (systemSizeMultiplier === 1.0) {
        systemSizeMultiplier = 0.5; // Set to 50%
    }
    // Current multiplier is 0.5 (50%)
    else if (systemSizeMultiplier === 0.5) {
        systemSizeMultiplier = 0.25; // Set to 25%
    }
    // Current multiplier is 0.25 (25%) or any other value
    else {
        systemSizeMultiplier = 1.0; // Reset to 100%
    }

    // Update the button tooltip to show current size
    const btn = document.getElementById('cycleSizeBtn');
    if (btn) {
        const sizePercent = Math.round(systemSizeMultiplier * 100);
        btn.setAttribute('data-tooltip', `System size: ${sizePercent}%`);
    }

    // Redraw the map with the new system size
    drawGalaxyMap();
}

// Toggle faction area display
function toggleFactionArea() {
    showFactionArea = !showFactionArea;
    const btn = document.getElementById('manageFactionAreaBtn');
    if (btn) {
        btn.classList.toggle('active', showFactionArea);
    }

    // No longer using faction area panel, all stats directly on canvas
    // if (factionAreaPanel) {
    //     if (showFactionArea) {
    //         factionAreaPanel.classList.remove('hidden');
    //         updateFactionAreaStats();
    //     } else {
    //         factionAreaPanel.classList.add('hidden');
    //     }
    // }

    drawGalaxyMap();
}

// This function is no longer needed as stats are drawn on canvas
// For backwards compatibility, we keep it empty
function updateFactionAreaStats() {
    // No longer needed - stats drawn directly on canvas
    console.log('Faction area stats now displayed directly on canvas');
}

// Toggle region display
function toggleRegionDisplay() {
    showRegions = !showRegions;
    const btn = document.getElementById('toggleRegionsBtn');
    if (btn) {
        btn.classList.toggle('active', showRegions);
    }
    drawGalaxyMap();
}

// Create a new region
function createNewRegion() {
    // Create dialog for region creation
    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    dialog.innerHTML = `
        <div class="modal-content">
            <h3>Create New Region</h3>
            <div class="form-group">
                <label for="regionName">Region Name:</label>
                <input type="text" id="regionName" value="New Region" />
            </div>
            <div class="form-group">
                <label for="regionColor">Region Color:</label>
                <input type="color" id="regionColor" value="${REGION_COLORS[regionDefinitions.length % REGION_COLORS.length]}" />
            </div>
            <div class="button-row">
                <button id="cancelRegionBtn">Cancel</button>
                <button id="createRegionDialogBtn">Create Region</button>
                ${selectedSystems.length > 0 ? '<button id="createAndGenBtn">Create & Generate Distribution</button>' : ''}
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    // Set up event handlers
    document.getElementById('cancelRegionBtn').addEventListener('click', () => {
        document.body.removeChild(dialog);
    });

    document.getElementById('createRegionDialogBtn').addEventListener('click', () => {
        const regionName = document.getElementById('regionName').value.trim();
        const regionColor = document.getElementById('regionColor').value;

        if (!regionName) {
            alert('Please enter a region name');
            return;
        }

        // Generate a unique ID for the region
        const regionId = 'region-' + Date.now().toString();

        // Create the region definition
        const newRegion = {
            id: regionId,
            name: regionName,
            color: regionColor
        };

        // Add region to definitions
        regionDefinitions.push(newRegion);

        // Assign selected systems to the new region (if any)
        if (selectedSystems.length > 0) {
            selectedSystems.forEach(system => {
                system.regionId = regionId;
            });
        }

        saveState(`Created Region ${regionName}`);
        drawGalaxyMap();

        document.body.removeChild(dialog);
    });

    // Only add this button handler if systems are selected
    if (selectedSystems.length > 0) {
        document.getElementById('createAndGenBtn').addEventListener('click', () => {
            const regionName = document.getElementById('regionName').value.trim();
            const regionColor = document.getElementById('regionColor').value;

            if (!regionName) {
                alert('Please enter a region name');
                return;
            }

            // Generate a unique ID for the region
            const regionId = 'region-' + Date.now().toString();

            // Create the region definition
            const newRegion = {
                id: regionId,
                name: regionName,
                color: regionColor
            };

            // Add region to definitions
            regionDefinitions.push(newRegion);

            // Assign selected systems to the new region
            selectedSystems.forEach(system => {
                system.regionId = regionId;
            });

            saveState(`Created Region ${regionName}`);

            // Generate planet distribution
            if (typeof generateRegionalPlanetDistribution === 'function') {
                generateRegionalPlanetDistribution(selectedSystems);
            }

            drawGalaxyMap();

            document.body.removeChild(dialog);
        });
    }
}

// Add selected systems to a region
function addSelectedSystemsToRegion() {
    if (selectedSystems.length === 0) {
        alert('Please select systems to add to a region');
        return;
    }

    if (regionDefinitions.length === 0) {
        alert('No regions defined. Please create a region first.');
        return;
    }

    // Create region selection options
    const options = regionDefinitions.map(region =>
        `<option value="${region.id}">${region.name}</option>`
    ).join('');

    // Show a custom dialog
    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    dialog.innerHTML = `
        <div class="modal-content">
            <h3>Add to Region</h3>
            <div class="form-group">
                <label for="regionSelect">Select Region:</label>
                <select id="regionSelect">${options}</select>
            </div>
            <div class="button-row">
                <button id="cancelRegionBtn">Cancel</button>
                <button id="confirmRegionBtn">Add to Region</button>
                <button id="addAndGenBtn">Add & Generate Distribution</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    // Set up event handlers
    document.getElementById('cancelRegionBtn').addEventListener('click', () => {
        document.body.removeChild(dialog);
    });

    document.getElementById('confirmRegionBtn').addEventListener('click', () => {
        const regionId = document.getElementById('regionSelect').value;

        if (regionId) {
            selectedSystems.forEach(system => {
                system.regionId = regionId;
            });

            const region = regionDefinitions.find(r => r.id === regionId);
            saveState(`Added ${selectedSystems.length} Systems to Region ${region.name}`);
            drawGalaxyMap();
        }

        document.body.removeChild(dialog);
    });

    document.getElementById('addAndGenBtn').addEventListener('click', () => {
        const regionId = document.getElementById('regionSelect').value;

        if (regionId) {
            selectedSystems.forEach(system => {
                system.regionId = regionId;
            });

            const region = regionDefinitions.find(r => r.id === regionId);
            saveState(`Added ${selectedSystems.length} Systems to Region ${region.name}`);

            // Generate planet distribution
            if (typeof generateRegionalPlanetDistribution === 'function') {
                generateRegionalPlanetDistribution(selectedSystems);
            }

            drawGalaxyMap();
        }

        document.body.removeChild(dialog);
    });
}

// Update system count in the UI
function updateSystemCount() {
    if (!systemCount) return;

    // Count systems by faction
    const counts = {
        total: mapData.length,
        MUD: 0,
        ONI: 0,
        UST: 0,
        Neutral: 0,
        none: 0
    };

    mapData.forEach(system => {
        if (system.faction) {
            counts[system.faction] = (counts[system.faction] || 0) + 1;
        } else {
            counts.none++;
        }
    });

    // Update display with improved spacing
    let html = `<span>Total: ${counts.total}</span>`;

    if (counts.MUD > 0) {
        html += `<span style="color: ${getFactionColor('MUD')}">MUD: ${counts.MUD}</span>`;
    }

    if (counts.ONI > 0) {
        html += `<span style="color: ${getFactionColor('ONI')}">ONI: ${counts.ONI}</span>`;
    }

    if (counts.UST > 0) {
        html += `<span style="color: ${getFactionColor('UST')}">UST: ${counts.UST}</span>`;
    }

    if (counts.Neutral > 0) {
        html += `<span style="color: ${getFactionColor('Neutral')}">Neutral: ${counts.Neutral}</span>`;
    }

    if (counts.none > 0) {
        html += `<span style="color: #AAAAAA">None: ${counts.none}</span>`;
    }

    systemCount.innerHTML = html;
}

// Update undo/redo buttons state
function updateUndoRedoButtons() {
    if (typeof getHistoryInfo === 'function') {
        const historyInfo = getHistoryInfo();

        if (undoBtn) {
            undoBtn.disabled = !historyInfo.canUndo;
        }

        if (redoBtn) {
            redoBtn.disabled = !historyInfo.canRedo;
        }
    } else {
        // Fallback to old system
        if (undoBtn) {
            undoBtn.disabled = historyStack.length === 0;
        }

        if (redoBtn) {
            redoBtn.disabled = redoStack.length === 0;
        }
    }
}

// Update history panel
function updateHistoryPanel() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    // Clear existing items
    historyList.innerHTML = '';

    // Check if new history system is available
    if (typeof getHistoryInfo !== 'function') {
        // Fallback to old system
        updateHistoryPanelOld();
        return;
    }

    // Get history info from new system
    const historyInfo = getHistoryInfo();
    const states = historyInfo.states;
    const currentIndex = historyInfo.currentIndex;

    if (states.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No history yet';
        li.className = 'empty-history';
        historyList.appendChild(li);
        return;
    }

    // Add history items from newest to oldest
    states.slice().reverse().forEach((snapshot, reverseIndex) => {
        const actualIndex = states.length - 1 - reverseIndex;
        const isCurrentState = actualIndex === currentIndex;

        // Create list item
        const li = document.createElement('li');
        li.className = 'history-item';

        if (isCurrentState) {
            li.classList.add('current-state');
        }

        // Special styling for initial state
        if (actualIndex === 0) {
            li.classList.add('empty-base-state');
        }

        // Get timestamp
        let timeStr = 'Unknown';
        if (snapshot.timestamp) {
            timeStr = snapshot.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }

        // Create timestamp element
        const timeElement = document.createElement('span');
        timeElement.className = 'history-time';
        timeElement.textContent = timeStr;

        // Create description element
        const descElement = document.createElement('span');
        descElement.className = 'history-desc';

        // Get system count and selected count
        const systemCount = snapshot.data.mapData ? snapshot.data.mapData.length : 0;
        const selectedCount = snapshot.data.selectedSystemKeys ? snapshot.data.selectedSystemKeys.length : 0;

        // Build description with counts
        let description = snapshot.description;
        if (selectedCount > 0) {
            description += ` [${systemCount} sys, ${selectedCount} sel]`;
        } else {
            description += ` [${systemCount}]`;
        }

        descElement.textContent = description;

        // Add elements to list item
        li.appendChild(timeElement);
        li.appendChild(descElement);

        // Add click event
        li.addEventListener('click', function () {
            historyJumpTo(actualIndex);
        });

        // Add to list
        historyList.appendChild(li);
    });

    console.log(`History panel updated with ${states.length} items, current index: ${currentIndex}`);
}

// Old history panel update function (fallback)
function updateHistoryPanelOld() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    if (!historyStack || historyStack.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No history yet';
        li.className = 'empty-history';
        historyList.appendChild(li);
        return;
    }

    // Simple list of history items
    historyStack.slice().reverse().forEach((item, index) => {
        const actualIndex = historyStack.length - 1 - index;
        const li = document.createElement('li');
        li.className = 'history-item';

        if (actualIndex === historyStack.length - 1) {
            li.classList.add('current-state');
        }

        li.textContent = item.description || `State ${actualIndex}`;
        li.addEventListener('click', function () {
            restoreHistoryState(actualIndex);
        });

        historyList.appendChild(li);
    });
}

// Restore state from history at a specific index
function restoreHistoryState(index) {
    if (index < 0 || index >= historyStack.length) {
        console.error('Invalid history index:', index);
        return;
    }

    console.log(`Restoring state from history index ${index}: ${historyStack[index].description}`);

    // If trying to restore current state, do nothing
    if (index === historyStack.length - 1) {
        console.log('Already at this state');
        return;
    }

    // Move items from history to redo stack
    const itemsToRedo = [];
    for (let i = historyStack.length - 1; i > index; i--) {
        itemsToRedo.push(historyStack.pop());
    }

    // Add items to redo stack in reverse order
    itemsToRedo.forEach(item => redoStack.push(item));

    // Restore the state at the clicked index
    const restoredState = historyStack[index];

    // Apply the state - use the new state structure
    if (restoredState.state) {
        mapData.length = 0;
        restoredState.state.forEach(item => mapData.push(item));
    } else if (restoredState.mapData) {
        // Handle old format for backward compatibility
        mapData = deepCopy(restoredState.mapData);
    }

    // Restore region definitions
    if (restoredState.regionDefinitions) {
        regionDefinitions = deepCopy(restoredState.regionDefinitions);
    }

    // Rebuild lookup
    systemLookup = {};
    mapData.forEach(system => {
        if (system.key) systemLookup[system.key] = system;
    });

    // Clear all state variables
    hoveredSystem = null;
    draggedSystem = null;
    linkSourceSystem = null;
    isPanning = false;
    isLinking = false;

    // Restore selection state from the saved state
    selectedSystems.length = 0; // Clear array without breaking window reference

    // Use selectedSystemKeys from the restored state
    if (restoredState.selectedSystemKeys) {
        restoredState.selectedSystemKeys.forEach(key => {
            if (systemLookup[key]) {
                selectedSystems.push(systemLookup[key]);
            }
        });
        console.log(`Restored selection with ${selectedSystems.length} systems`);
    } else {
        console.log("No selection data in restored state");
    }

    // Update UI based on selections
    updateLockButtonsState();
    setupResourceFilter();
    displaySystemDetails(selectedSystems);

    if (selectedSystems.length === 1) {
        drawSystemPreview(selectedSystems[0]);
    } else {
        drawSystemPreview(null);
    }

    // Update UI
    updateUndoRedoButtons();
    updateSystemCount();

    // Force redraw the map
    drawGalaxyMap();
    console.log("Redrew galaxy map after restoring state");

    // Update the history panel
    updateHistoryPanel();
}

// Setup tooltips
function setupTooltips() {
    // First, remove any existing tooltip DOM elements
    const existingTooltips = document.querySelectorAll('.tooltip');
    existingTooltips.forEach(tooltip => {
        if (tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
        }
    });

    // Remove tooltip reference from elements
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    tooltipElements.forEach(element => {
        // Remove the tooltip property if it exists
        if (element.tooltip) {
            delete element.tooltip;
        }
    });

    // We're now relying entirely on CSS for tooltips
    console.log('Tooltips initialized using CSS pseudo-elements');
}

// Set up resource filter
function setupResourceFilter() {
    if (!resourceFilter) return;

    // Ensure locked-mode class is removed
    resourceFilter.classList.remove('locked-mode');

    // Find or create the container for dynamic filter items
    let checkboxContainer = resourceFilter.querySelector('#filter-items-container');
    if (!checkboxContainer) {
        // If the container doesn't exist (e.g., first run), create it dynamically.
        // Ideally, this structure should be in index.html.
        resourceFilter.innerHTML = ` 
            <h3>Label Filters</h3>
            <div class="filter-controls">
                <button id="select-all-resources" class="small-btn">Select All</button>
                <button id="select-none-resources" class="small-btn">Select None</button>
            </div>
            <div id="filter-items-container"></div> 
        `;
        checkboxContainer = resourceFilter.querySelector('#filter-items-container');

        // Re-attach listeners for Select All/None if they were dynamically created here
        // Note: It's better to have these buttons static in index.html and listeners attached in initUI
        const selectAllBtn = document.getElementById('select-all-resources');
        const selectNoneBtn = document.getElementById('select-none-resources');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', selectAllFilters);
        }
        if (selectNoneBtn) {
            selectNoneBtn.addEventListener('click', selectNoneFilters);
        }
    }

    // Generate HTML ONLY for the filter items (checkboxes and headers)
    let itemsHtml = '';

    // Add group toggle buttons at the top of the items list
    itemsHtml += `<div class="group-toggles">`;

    // Helper function to check if all items in a group are checked
    const areAllChecked = (items) => items.every(item => resourceFilterState[item.id || item.name] !== false);

    // System Labels Group
    const systemLabelItems = [
        { id: "SystemName" }, { id: "FactionLabel" }, { id: "ControllingFaction" }, { id: "PlanetCount" }, { id: "StarCount" }, { id: "StarbaseTier" }, { id: "LockStatus" }
    ];
    const allSystemLabelsChecked = areAllChecked(systemLabelItems);
    itemsHtml += `
        <div class="filter-item group-toggle">
            <input type="checkbox" id="filter-group-system" ${allSystemLabelsChecked ? 'checked' : ''}>
            <label for="filter-group-system">All System</label>
        </div>`;

    // Region Labels Group
    const regionLabelItems = [
        { id: "RegionalPolygon" }, { id: "RegionalName" }, { id: "RegionalSystems" },
        { id: "RegionalCore" }, { id: "RegionalKing" }, { id: "RegionalArea" }, { id: "RegionalDistance" }, { id: "RegionalIndicator" }
    ];
    const allRegionLabelsChecked = areAllChecked(regionLabelItems);
    itemsHtml += `
        <div class="filter-item group-toggle">
            <input type="checkbox" id="filter-group-region" ${allRegionLabelsChecked ? 'checked' : ''}>
            <label for="filter-group-region">All Regions</label>
        </div>
    `;

    // Resource category toggles
    // Define resourceCategories
    const organicResources = [
        'biomass', 'living metal symbionts', 'neural coral compounds', 'magmaroot',
        'pyroclast energen', 'blazing snapdragon', 'tidal kelp', 'bioluminous algae',
        'shadowmoss', 'spectral lichen', 'ironshell cactus', 'bastion agave',
        'swiftvine', 'electric fern', 'temporal flux orchid', 'frostcore bryophyte',
        'mind shade fungus', 'aegis barrier cactus'
    ];

    const syntheticResources = [
        'drywater', 'arco', 'thermodyne', 'thermoplastic resin',
        'quantum computational substrate', 'bathysphere pearls', 'nanosil',
        'plasma containment minerals', 'raw chisenic', 'rochinol'
    ];

    const gasResources = ['hydrogen', 'nitrogen', 'methane', 'neon',
        'argon', 'xenon', 'krypton', 'oxygen'];

    const resourceCategories = {
        'Organics': RESOURCE_TYPES.filter(r =>
            organicResources.includes(r.name.toLowerCase())),
        'Synthetics': RESOURCE_TYPES.filter(r =>
            syntheticResources.includes(r.name.toLowerCase())),
        'Gases': RESOURCE_TYPES.filter(r => r.name.toLowerCase().includes('gas') ||
            gasResources.includes(r.name.toLowerCase())),
        'Ores': RESOURCE_TYPES.filter(r => r.name.toLowerCase().endsWith(' ore')),
        'Crystals': RESOURCE_TYPES.filter(r => r.name.toLowerCase().includes('crystal') ||
            r.name.toLowerCase() === 'diamond'),
        'Other': RESOURCE_TYPES.filter(r => {
            const name = r.name.toLowerCase();
            return !organicResources.includes(name) &&
                !syntheticResources.includes(name) &&
                !name.includes('gas') &&
                !gasResources.includes(name) &&
                !name.endsWith(' ore') &&
                !name.includes('crystal') &&
                name !== 'diamond';
        })
    };

    for (const category in resourceCategories) {
        const categoryItems = resourceCategories[category];
        const allCategoryChecked = areAllChecked(categoryItems); // Check resources in this category
        itemsHtml += `
            <div class="filter-item group-toggle">
                <input type="checkbox" id="filter-group-${category.toLowerCase()}-resources" ${allCategoryChecked ? 'checked' : ''}>
                <label for="filter-group-${category.toLowerCase()}-resources">All ${category}</label>
            </div>
        `;
    }

    itemsHtml += `</div>`; // Close group-toggles div

    // Add system label filters 
    itemsHtml += `<h4>System Labels</h4>`;

    // Add system label filters
    const systemLabelOptions = [
        { id: "SystemName", label: "System Name" },
        { id: "FactionLabel", label: "Faction Type (e.g., UST)" },
        { id: "ControllingFaction", label: "Controlling Faction (e.g., CF:MUD)" },
        { id: "PlanetCount", label: "Planet Count (e.g., P:4)" },
        { id: "StarCount", label: "Star Count (e.g., S:1)" },
        { id: "StarbaseTier", label: "Starbase Tier (e.g., SB:T1)" },
        { id: "LockStatus", label: "Lock Status 🔒" },
        { id: "KingStatus", label: "KING Status ⭐" }
        // Removed Planets as it should always be on
    ];

    systemLabelOptions.forEach(option => {
        itemsHtml += `
            <div class="filter-item system-label-item">
                <input type="checkbox" id="filter-${option.id}" ${resourceFilterState[option.id] !== false ? 'checked' : ''}>
                <label for="filter-${option.id}">${option.label}</label>
            </div>
        `;
    });

    // Add region label filters
    itemsHtml += `<h4>Region Labels</h4>`;

    const regionLabelOptions = [
        { id: "RegionalPolygon", label: "Regional Polygon" },
        { id: "RegionalBlob", label: "Regional Blob (Grid Fill)" },
        { id: "RegionalName", label: "Regional Name" },
        { id: "RegionalIndicator", label: "Region Membership Circles" },
        { id: "RegionalSystems", label: "Systems Count" },
        { id: "RegionalCore", label: "Core Systems Count" },
        { id: "RegionalKing", label: "KING Systems Count" },
        { id: "RegionalArea", label: "Area Units" },
        { id: "RegionalDistance", label: "Average Distance" }
    ];

    regionLabelOptions.forEach(option => {
        itemsHtml += `
            <div class="filter-item region-label-item">
                <input type="checkbox" id="filter-${option.id}" ${resourceFilterState[option.id] !== false ? 'checked' : ''}>
                <label for="filter-${option.id}">${option.label}</label>
            </div>
        `;
    });

    // Add resource heatmap toggle
    itemsHtml += `<h4>Resource Visualization</h4>
        <div class="filter-item resource-vis-item">
            <input type="checkbox" id="toggle-resource-heatmap" ${showResourceHeatmap ? 'checked' : ''}>
            <label for="toggle-resource-heatmap">Resource Abundance Heatmap</label>
            <span class="input-note">Visualize resources abundance (higher richness = higher abundance)</span>
        </div>
    `;

    // Add resource filters by category
    itemsHtml += `<h4>Resources</h4>`;

    for (const category in resourceCategories) {
        itemsHtml += `<h4>${category}</h4>`;

        resourceCategories[category].forEach(resource => {
            itemsHtml += `
                <div class="filter-item resource-item ${category.toLowerCase()}">
                    <input type="checkbox" id="filter-${resource.name}" ${resourceFilterState[resource.name] !== false ? 'checked' : ''}>
                    <label for="filter-${resource.name}">${resource.name}</label>
                </div>
            `;
        });
    }

    // Set the innerHTML of the container, not the whole filter panel
    checkboxContainer.innerHTML = itemsHtml;

    // Add event handlers for individual filter checkboxes WITHIN the container
    const checkboxes = checkboxContainer.querySelectorAll('input[type="checkbox"]:not([id^="filter-group-"]):not([id="toggle-resource-heatmap"])');
    checkboxes.forEach(checkbox => {
        checkbox.disabled = false; // Ensure checkbox is enabled
        checkbox.addEventListener('change', function () {
            const resourceName = this.id.replace('filter-', '');
            resourceFilterState[resourceName] = this.checked;

            // Redraw the system view to update resource visibility
            const system = selectedSystems.length === 1 ? selectedSystems[0] : null;
            if (system) {
                displaySystemDetails(selectedSystems);
            }

            // Always redraw map when resource filters change
            drawGalaxyMap();
        });
    });

    // Handle resource heatmap toggle
    const heatmapToggle = checkboxContainer.querySelector('#toggle-resource-heatmap');
    if (heatmapToggle) {
        heatmapToggle.addEventListener('change', function () {
            showResourceHeatmap = this.checked;
            console.log("Resource heatmap toggled:", showResourceHeatmap);

            // If turning off heatmap, ensure debug mode is also off
            if (!showResourceHeatmap && heatmapDebugMode) {
                heatmapDebugMode = false;
                console.log("Debug mode automatically disabled when heatmap is turned off");
            }

            updateHeatmapDebugLabel(); // Update the debug indicator in the label
            drawGalaxyMap(); // Redraw map to show/hide heatmap
        });

        // Initialize debug indicator in label
        updateHeatmapDebugLabel();
    }

    // Add event handlers for group toggle checkboxes WITHIN the container
    const groupToggles = checkboxContainer.querySelectorAll('input[id^="filter-group-"]');
    groupToggles.forEach(toggle => {
        toggle.disabled = false; // Ensure toggle is enabled
        toggle.addEventListener('change', function () {
            const groupId = this.id.replace('filter-group-', '');
            const isChecked = this.checked;

            let itemsToUpdate = [];

            // Determine which items to update based on the group
            if (groupId === 'system') {
                itemsToUpdate = resourceFilter.querySelectorAll('.system-label-item input[type="checkbox"]');
            } else if (groupId === 'region') {
                itemsToUpdate = resourceFilter.querySelectorAll('.region-label-item input[type="checkbox"]');
            } else {
                // Extract the category name from the ID (e.g., "gases-resources" -> "gases")
                const category = groupId.split('-')[0]; // Get 'gases' from 'gases-resources'
                // Resource category - use data from RESOURCE_TYPES to reliably identify resources
                if (category === 'organics') {
                    // Find all checkboxes for organic resources
                    const organicResources = [
                        'biomass', 'living metal symbionts', 'neural coral compounds', 'magmaroot',
                        'pyroclast energen', 'blazing snapdragon', 'tidal kelp', 'bioluminous algae',
                        'shadowmoss', 'spectral lichen', 'ironshell cactus', 'bastion agave',
                        'swiftvine', 'electric fern', 'temporal flux orchid', 'frostcore bryophyte',
                        'mind shade fungus', 'aegis barrier cactus'
                    ];
                    itemsToUpdate = Array.from(resourceFilter.querySelectorAll('input[type="checkbox"]')).filter(checkbox => {
                        const resourceName = checkbox.id.replace('filter-', '').toLowerCase();
                        return organicResources.includes(resourceName);
                    });
                } else if (category === 'synthetics') {
                    // Find all checkboxes for synthetic resources
                    const syntheticResources = [
                        'drywater', 'arco', 'thermodyne', 'thermoplastic resin',
                        'quantum computational substrate', 'bathysphere pearls', 'nanosil',
                        'plasma containment minerals', 'raw chisenic', 'rochinol'
                    ];
                    itemsToUpdate = Array.from(resourceFilter.querySelectorAll('input[type="checkbox"]')).filter(checkbox => {
                        const resourceName = checkbox.id.replace('filter-', '').toLowerCase();
                        return syntheticResources.includes(resourceName);
                    });
                } else if (category === 'gases') {
                    // Find all checkboxes for gas resources
                    const gasResources = ['hydrogen', 'nitrogen', 'methane', 'neon', 'argon', 'xenon', 'krypton', 'fluorine gas', 'tenon gas', 'oxygen'];
                    itemsToUpdate = Array.from(resourceFilter.querySelectorAll('input[type="checkbox"]')).filter(checkbox => {
                        const resourceName = checkbox.id.replace('filter-', '').toLowerCase();
                        return gasResources.includes(resourceName) || resourceName.includes('gas');
                    });
                } else if (category === 'ores') {
                    // Find all checkboxes for ore resources
                    itemsToUpdate = Array.from(resourceFilter.querySelectorAll('input[type="checkbox"]')).filter(checkbox => {
                        const resourceName = checkbox.id.replace('filter-', '').toLowerCase();
                        return resourceName.endsWith(' ore');
                    });
                } else if (category === 'crystals') {
                    // Find all checkboxes for crystal resources
                    itemsToUpdate = Array.from(resourceFilter.querySelectorAll('input[type="checkbox"]')).filter(checkbox => {
                        const resourceName = checkbox.id.replace('filter-', '').toLowerCase();
                        return resourceName.includes('crystal') || resourceName === 'diamond';
                    });
                } else if (category === 'other') {
                    // Find all other resources that aren't in the defined categories
                    const organicResources = [
                        'biomass', 'living metal symbionts', 'neural coral compounds', 'magmaroot',
                        'pyroclast energen', 'blazing snapdragon', 'tidal kelp', 'bioluminous algae',
                        'shadowmoss', 'spectral lichen', 'ironshell cactus', 'bastion agave',
                        'swiftvine', 'electric fern', 'temporal flux orchid', 'frostcore bryophyte',
                        'mind shade fungus', 'aegis barrier cactus'
                    ];
                    const syntheticResources = [
                        'drywater', 'arco', 'thermodyne', 'thermoplastic resin',
                        'quantum computational substrate', 'bathysphere pearls', 'nanosil',
                        'plasma containment minerals', 'raw chisenic', 'rochinol'
                    ];
                    const gasResources = ['hydrogen', 'nitrogen', 'methane', 'neon', 'argon', 'xenon', 'krypton', 'fluorine gas', 'tenon gas', 'oxygen'];
                    itemsToUpdate = Array.from(resourceFilter.querySelectorAll('input[type="checkbox"]')).filter(checkbox => {
                        const resourceName = checkbox.id.replace('filter-', '').toLowerCase();
                        const name = resourceName.toLowerCase();
                        return name.indexOf('group-') !== 0 &&
                            !organicResources.includes(name) &&
                            !syntheticResources.includes(name) &&
                            !gasResources.includes(name) &&
                            !name.includes('gas') &&
                            !name.endsWith(' ore') &&
                            !name.includes('crystal') &&
                            name !== 'diamond' &&
                            !name.includes('system') &&
                            !name.includes('faction') &&
                            !name.includes('planet') &&
                            !name.includes('star') &&
                            !name.includes('regional');
                    });
                } else {
                    // Default to old behavior
                    itemsToUpdate = resourceFilter.querySelectorAll(`.resource-item.${category} input[type="checkbox"]`);
                }
            }

            // Update all checkboxes and filter state
            itemsToUpdate.forEach(checkbox => {
                checkbox.checked = isChecked;
                const resourceName = checkbox.id.replace('filter-', '');
                resourceFilterState[resourceName] = isChecked;
            });

            // Redraw
            const system = selectedSystems.length === 1 ? selectedSystems[0] : null;
            if (system) {
                drawSystemPreview(system);
                displaySystemDetails(selectedSystems);
            }
            drawGalaxyMap();
        });
    });

    // Ensure Select All/None buttons (outside the container) are enabled
    const selectAllBtn = document.getElementById('select-all-resources');
    const selectNoneBtn = document.getElementById('select-none-resources');
    if (selectAllBtn) selectAllBtn.disabled = false;
    if (selectNoneBtn) selectNoneBtn.disabled = false;
}

// Define the functions for Select All/None outside setupResourceFilter
function selectAllFilters() {
    const resourceCheckboxes = resourceFilter.querySelectorAll('#filter-items-container input[type="checkbox"]');
    resourceCheckboxes.forEach(checkbox => {
        checkbox.checked = true;
        const resourceName = checkbox.id.replace('filter-', '');
        if (resourceName.indexOf('group-') !== 0) {
            resourceFilterState[resourceName] = true;
        }
    });

    // Ensure group checkboxes are also checked
    const groupToggles = resourceFilter.querySelectorAll('input[id^="filter-group-"]');
    groupToggles.forEach(toggle => {
        toggle.checked = true;
    });

    if (resourceFilterState.hasOwnProperty("Planets")) {
        resourceFilterState["Planets"] = true;
    }
    drawGalaxyMap();
}

function selectNoneFilters() {
    const resourceCheckboxes = resourceFilter.querySelectorAll('#filter-items-container input[type="checkbox"]');
    resourceCheckboxes.forEach(checkbox => {
        const resourceName = checkbox.id.replace('filter-', '');
        // Keep system name visible even when selecting none
        if (resourceName !== 'SystemName' && resourceName.indexOf('group-') !== 0) {
            checkbox.checked = false;
            resourceFilterState[resourceName] = false;
        } else if (resourceName === 'SystemName') {
            checkbox.checked = true;
            resourceFilterState[resourceName] = true;
        } else {
            // Only keep system group checked, all others unchecked
            checkbox.checked = resourceName === 'group-system';
        }
    });
    if (resourceFilterState.hasOwnProperty("Planets")) {
        resourceFilterState["Planets"] = true; // Always keep planets visible
    }
    drawGalaxyMap();
}

// Update star headers in the UI
function updateStarHeaders(system) {
    if (!system) return;

    // Generate updated star header titles
    const starContainers = document.querySelectorAll('.star-item h4');
    starContainers.forEach((container, index) => {
        if (index < system.stars.length) {
            container.textContent = `Star ${index + 1} (${system.stars[index].name || 'Unnamed'})`;
        }
    });

    // Update add star button visibility
    const addStarBtn = document.getElementById('addStarBtn');
    if (addStarBtn) {
        addStarBtn.style.display = system.stars && system.stars.length < 3 ? 'block' : 'none';
    }

    // Update the system preview
    drawSystemPreview(system);
}

// Setup details panel tabs
function setupDetailsTabs() {
    const tabs = document.querySelectorAll('.details-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    if (!tabs.length || !tabContents.length) {
        console.warn('Tabs or tab contents not found');
        return;
    }

    // First ensure all tabs except the active one are hidden
    tabContents.forEach(content => {
        if (!content.classList.contains('active')) {
            content.style.display = 'none';
        } else {
            content.style.display = 'block';
        }
    });

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));

            // Add active class to clicked tab
            this.classList.add('active');

            // Get the target tab content
            const targetTab = this.getAttribute('data-tab');

            // Hide all tab contents
            tabContents.forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });

            // Show the target tab content
            const activeContent = document.getElementById(targetTab);
            if (activeContent) {
                activeContent.classList.add('active');
                activeContent.style.display = 'block';
            }
        });
    });

    console.log('Details tabs initialized');
}

// Reinitialize button listeners if they stopped working
function reinitializeButtonListeners() {
    console.log('Reinitializing all button event listeners');

    // Main toolbar buttons
    if (document.getElementById('newMapBtn')) {
        document.getElementById('newMapBtn').addEventListener('click', newMap);
    }

    if (document.getElementById('importBtn')) {
        document.getElementById('importBtn').addEventListener('click', importMap);
    }

    if (document.getElementById('exportBtn')) {
        document.getElementById('exportBtn').addEventListener('click', exportMap);
    }

    // System operation buttons
    if (document.getElementById('newSystemBtn')) {
        document.getElementById('newSystemBtn').addEventListener('click', createNewSystem);
    }

    if (document.getElementById('deleteSystemBtn')) {
        document.getElementById('deleteSystemBtn').addEventListener('click', deleteSelectedSystems);
    }

    if (document.getElementById('linkSystemBtn')) {
        document.getElementById('linkSystemBtn').addEventListener('click', toggleLinkMode);
    }

    if (document.getElementById('copySystemBtn')) {
        document.getElementById('copySystemBtn').addEventListener('click', copySelectedSystem);
    }

    if (document.getElementById('pasteSystemBtn')) {
        document.getElementById('pasteSystemBtn').addEventListener('click', pasteSystem);
    }

    // View buttons
    if (document.getElementById('resetViewBtn')) {
        document.getElementById('resetViewBtn').addEventListener('click', centerMapView);
    }

    if (document.getElementById('toggleGridBtn')) {
        document.getElementById('toggleGridBtn').addEventListener('click', toggleGrid);
    }

    if (document.getElementById('toggleSnapBtn')) {
        document.getElementById('toggleSnapBtn').addEventListener('click', toggleSnapToGrid);
    }

    if (document.getElementById('cycleSizeBtn')) {
        document.getElementById('cycleSizeBtn').addEventListener('click', cycleSystemSize);
    }

    if (document.getElementById('toggleRegionsBtn')) {
        document.getElementById('toggleRegionsBtn').addEventListener('click', toggleRegionDisplay);
    }

    if (document.getElementById('createRegionBtn')) {
        document.getElementById('createRegionBtn').addEventListener('click', createNewRegion);
    }

    if (document.getElementById('addToRegionBtn')) {
        document.getElementById('addToRegionBtn').addEventListener('click', addSelectedSystemsToRegion);
    }

    if (document.getElementById('manageFactionAreaBtn')) {
        document.getElementById('manageFactionAreaBtn').addEventListener('click', toggleFactionArea);
    }

    // Fix Data button
    if (document.getElementById('fixDataBtn')) {
        document.getElementById('fixDataBtn').addEventListener('click', function () {
            const count = fixFactionData();
            if (count > 0) {
                alert(`Fixed faction data for ${count} systems`);
            } else {
                alert('No faction data needed fixing');
            }
        });
    }

    // Add event listeners for undo/redo
    if (undoBtn) undoBtn.addEventListener('click', undo);
    if (redoBtn) redoBtn.addEventListener('click', redo);
    if (deselectBtn) deselectBtn.addEventListener('click', deselectAll);

    // Search functionality
    if (searchSystemInput) {
        searchSystemInput.addEventListener('input', function () {
            searchTerm = this.value.toLowerCase();

            // Show/hide clear button based on whether there's text
            const wrapper = this.closest('.search-input-wrapper');
            if (wrapper) {
                wrapper.classList.toggle('has-text', this.value.length > 0);
            }

            drawGalaxyMap(); // Redraw to highlight matching systems
        });

        // Add handler for clear button
        const clearBtn = document.getElementById('clearSearchBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                if (searchSystemInput) {
                    searchSystemInput.value = '';
                    searchTerm = '';

                    // Hide the clear button
                    const wrapper = searchSystemInput.closest('.search-input-wrapper');
                    if (wrapper) {
                        wrapper.classList.remove('has-text');
                    }

                    // Focus the search input
                    searchSystemInput.focus();

                    // Redraw map to show all systems
                    drawGalaxyMap();
                }
            });
        }

        // Set initial state for clear button
        const wrapper = searchSystemInput.closest('.search-input-wrapper');
        if (wrapper) {
            wrapper.classList.toggle('has-text', searchSystemInput.value.length > 0);
        }
    }

    // Initialize history button to show history tab
    if (document.getElementById('historyToggleBtn')) {
        document.getElementById('historyToggleBtn').addEventListener('click', function () {
            // Find the history tab and click it to switch to it
            const historyTab = document.querySelector('.details-tab[data-tab="history-tab"]');
            if (historyTab) {
                historyTab.click();
                // Update history list when switching to tab
                updateHistoryPanel();
            }
        });
    }

    console.log('Button event listeners reinitialized');
}

// Add zoom controls
function addZoomControls() {
    // Create zoom control container
    const zoomControlContainer = document.createElement('div');
    zoomControlContainer.className = 'zoom-controls';
    zoomControlContainer.style.position = 'absolute';
    zoomControlContainer.style.bottom = '20px';
    zoomControlContainer.style.left = '20px';
    zoomControlContainer.style.zIndex = '1000';
    zoomControlContainer.style.display = 'flex';
    zoomControlContainer.style.flexDirection = 'column';
    zoomControlContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    zoomControlContainer.style.padding = '5px';
    zoomControlContainer.style.borderRadius = '5px';

    // Add zoom in button
    const zoomInBtn = document.createElement('button');
    zoomInBtn.textContent = '+';
    zoomInBtn.style.width = '30px';
    zoomInBtn.style.height = '30px';
    zoomInBtn.style.marginBottom = '5px';
    zoomInBtn.style.cursor = 'pointer';
    zoomInBtn.style.fontSize = '18px';
    zoomInBtn.style.fontWeight = 'bold';
    zoomInBtn.style.backgroundColor = '#444';
    zoomInBtn.style.color = 'white';
    zoomInBtn.style.border = 'none';
    zoomInBtn.style.borderRadius = '3px';

    // Add zoom out button
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.textContent = '−';
    zoomOutBtn.style.width = '30px';
    zoomOutBtn.style.height = '30px';
    zoomOutBtn.style.cursor = 'pointer';
    zoomOutBtn.style.fontSize = '18px';
    zoomOutBtn.style.fontWeight = 'bold';
    zoomOutBtn.style.backgroundColor = '#444';
    zoomOutBtn.style.color = 'white';
    zoomOutBtn.style.border = 'none';
    zoomOutBtn.style.borderRadius = '3px';

    // Add mega zoom in button for extremely high zoom
    const megaZoomInBtn = document.createElement('button');
    megaZoomInBtn.textContent = '++';
    megaZoomInBtn.style.width = '30px';
    megaZoomInBtn.style.height = '30px';
    megaZoomInBtn.style.marginBottom = '5px';
    megaZoomInBtn.style.marginTop = '10px';
    megaZoomInBtn.style.cursor = 'pointer';
    megaZoomInBtn.style.fontSize = '16px';
    megaZoomInBtn.style.fontWeight = 'bold';
    megaZoomInBtn.style.backgroundColor = '#555';
    megaZoomInBtn.style.color = 'white';
    megaZoomInBtn.style.border = 'none';
    megaZoomInBtn.style.borderRadius = '3px';

    // Add event listeners
    zoomInBtn.addEventListener('click', function () {
        // Apply zoom
        scale *= 1.5;
        scale = Math.min(scale, 500);
        drawGalaxyMap();
    });

    zoomOutBtn.addEventListener('click', function () {
        // Apply zoom
        scale *= 0.75;
        scale = Math.max(scale, 0.1);
        drawGalaxyMap();
    });

    megaZoomInBtn.addEventListener('click', function () {
        // Apply extreme zoom
        scale *= 5;
        scale = Math.min(scale, 500);
        drawGalaxyMap();
    });

    // Add buttons to container
    zoomControlContainer.appendChild(zoomInBtn);
    zoomControlContainer.appendChild(zoomOutBtn);
    zoomControlContainer.appendChild(megaZoomInBtn);

    // Add zoom level display
    const zoomLevelDisplay = document.createElement('div');
    zoomLevelDisplay.style.marginTop = '10px';
    zoomLevelDisplay.style.fontSize = '10px';
    zoomLevelDisplay.style.color = 'white';
    zoomLevelDisplay.style.textAlign = 'center';
    zoomLevelDisplay.textContent = '1x';

    // Update zoom level display when called
    function updateZoomDisplay() {
        zoomLevelDisplay.textContent = `${scale.toFixed(1)}x`;
    }

    // Override drawGalaxyMap to update zoom display
    const originalDrawGalaxyMap = window.drawGalaxyMap;
    window.drawGalaxyMap = function () {
        originalDrawGalaxyMap.apply(this, arguments);
        updateZoomDisplay();
    };

    zoomControlContainer.appendChild(zoomLevelDisplay);

    // Add to galaxy container
    const galaxyContainer = document.getElementById('galaxyContainer');
    if (galaxyContainer) {
        galaxyContainer.appendChild(zoomControlContainer);
    }

    // Initial update
    updateZoomDisplay();
}

// Initialize keyboard shortcuts
function initKeyboardShortcuts() {
    document.addEventListener('keydown', function (event) {
        // Skip if focus is in an input element
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

        // Determine if Ctrl key is pressed
        const ctrlPressed = event.ctrlKey || event.metaKey;

        // Debug logging for Ctrl+Shift+Z issue
        if (ctrlPressed && (event.key === 'z' || event.key === 'Z')) {
            console.log('Key event:', {
                key: event.key,
                code: event.code,
                shiftKey: event.shiftKey,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey
            });
        }

        // Handle Ctrl+Shift+Z using event.code for better reliability
        if (ctrlPressed && event.shiftKey && event.code === 'KeyZ') {
            event.preventDefault();
            event.stopPropagation();
            console.log('Ctrl+Shift+Z detected via event.code - calling redo()');
            redo();
            return; // Exit early to prevent other handlers
        }

        switch (event.key) {
            case 'Escape':
                // Cancel current operation
                cancelCurrentOperation();
                break;
            case 'Delete':
            case 'Backspace':
                // Delete selected systems
                if (selectedSystems.length > 0) {
                    deleteSelectedSystems();
                }
                break;
            case 'z':
            case 'Z':
                // Undo/Redo with Ctrl+Z and Ctrl+Shift+Z
                if (ctrlPressed) {
                    event.preventDefault();
                    event.stopPropagation(); // Ensure this event doesn't bubble
                    if (event.shiftKey) {
                        console.log('Ctrl+Shift+Z detected - calling redo()');
                        redo();
                    } else {
                        console.log('Ctrl+Z detected - calling undo()');
                        undo();
                    }
                }
                break;
            case 'y':
                // Redo with Ctrl+Y
                if (ctrlPressed) {
                    event.preventDefault();
                    redo();
                }
                break;
            case 'c':
                // Copy with Ctrl+C
                if (ctrlPressed && selectedSystems.length === 1) {
                    event.preventDefault();
                    copySelectedSystem();
                }
                break;
            case 'v':
                // Paste with Ctrl+V
                if (ctrlPressed && copiedSystem) {
                    event.preventDefault();
                    pasteSystem();
                }
                break;
            case 'a':
                // Select all with Ctrl+A
                if (ctrlPressed) {
                    event.preventDefault();
                    selectAllSystems();
                }
                break;
            case 'd':
                // Toggle debug mode for resource heatmap
                if (showResourceHeatmap) {
                    event.preventDefault();
                    toggleHeatmapDebugMode();
                }
                break;
            case 'e':
                // Toggle expanded system preview
                if (selectedSystems.length === 1) {
                    event.preventDefault();
                    toggleExpandedSystemPreview(selectedSystems[0]);
                }
                break;
            case 'h':
                // Toggle help modal
                event.preventDefault();
                showHelpModal();
                break;
            case '+':
            case '=':
                // Zoom in
                event.preventDefault();
                scale *= ctrlPressed ? 2.0 : 1.2;
                scale = Math.min(scale, 500);
                drawGalaxyMap();
                break;
            case '-':
            case '_':
                // Zoom out
                event.preventDefault();
                scale *= ctrlPressed ? 0.5 : 0.8;
                scale = Math.max(scale, 0.1);
                drawGalaxyMap();
                break;
            case '0':
                // Reset zoom
                if (ctrlPressed) {
                    event.preventDefault();
                    centerMapView();
                }
                break;
        }
    });
}

// Cancel current operation (for Escape key)
function cancelCurrentOperation() {
    // Cancel linking mode if active
    if (isLinking) {
        isLinking = false;
        linkSourceSystem = null;

        // Update UI
        const linkBtn = document.getElementById('linkSystemBtn');
        if (linkBtn) linkBtn.classList.remove('active');

        drawGalaxyMap();
        return;
    }

    // Cancel selection if systems are selected
    if (selectedSystems.length > 0) {
        deselectAll();
        return;
    }
}

// Export UI handler functions
window.initUI = initUI;
window.initCanvasHandlers = initCanvasHandlers;
window.updateStarHeaders = updateStarHeaders;
window.toggleGrid = toggleGrid;
window.toggleSystemLabels = toggleSystemLabels;
window.toggleSystemStats = toggleSystemStats;
window.toggleSnapToGrid = toggleSnapToGrid;
window.toggleFactionArea = toggleFactionArea;
window.toggleRegionDisplay = toggleRegionDisplay;
window.cycleSystemSize = cycleSystemSize;
window.updateSystemCount = updateSystemCount;
window.updateUndoRedoButtons = updateUndoRedoButtons;
window.updateHistoryPanel = updateHistoryPanel;
window.setupTooltips = setupTooltips;
window.setupResourceFilter = setupResourceFilter;
window.setupDetailsTabs = setupDetailsTabs;
window.reinitializeButtonListeners = reinitializeButtonListeners;
window.restoreHistoryState = restoreHistoryState;
window.addZoomControls = addZoomControls;
window.initKeyboardShortcuts = initKeyboardShortcuts;
window.cancelCurrentOperation = cancelCurrentOperation;
window.clearSelectionUI = clearSelectionUI;
window.showHelpModal = showHelpModal;
window.showResourceRichnessModal = showResourceRichnessModal;
window.applyResourceRichnessFalloff = applyResourceRichnessFalloff;
window.toggleHeatmapDebugMode = toggleHeatmapDebugMode;
window.updateHeatmapDebugLabel = updateHeatmapDebugLabel;

// Handle double-click to select all systems in a region
function handleGalaxyDoubleClick(event) {
    const coords = getGalaxyCanvasCoords(event);
    const system = findSystemAtCoords(coords.x, coords.y);

    if (system && system.regionId) {
        // Find all systems in the same region
        const systemsInRegion = mapData.filter(s => s.regionId === system.regionId);
        if (systemsInRegion.length > 0) {
            // Select all systems in the region
            selectedSystems = systemsInRegion;
            displaySystemDetails(selectedSystems);
            drawGalaxyMap();

            // Update buttons
            if (deselectBtn) {
                deselectBtn.disabled = false;
            }

            console.log(`Selected ${selectedSystems.length} systems in region ${system.regionId}`);
        }
    }
}

// Region management buttons
if (document.getElementById('toggleRegionsBtn')) {
    document.getElementById('toggleRegionsBtn').addEventListener('click', toggleRegionDisplay);
}

if (document.getElementById('addToRegionBtn')) {
    document.getElementById('addToRegionBtn').addEventListener('click', addSelectedSystemsToRegion);
}

if (document.getElementById('removeFromRegionBtn')) {
    document.getElementById('removeFromRegionBtn').addEventListener('click', function () {
        saveState(`Removed ${selectedSystems.length} Systems from their Regions`);

        selectedSystems.forEach(system => {
            delete system.regionId;
        });

        displayMultipleSystemDetails(selectedSystems);
        drawGalaxyMap();
        setupResourceFilter(); // Update filter state as region might change
    });
}

// Add new functions for locking

// Function to lock currently selected systems
function lockSystems() {
    let lockedCount = 0;
    selectedSystems.forEach(system => {
        if (!system.isLocked) {
            system.isLocked = true;
            lockedCount++;
        }
    });
    if (lockedCount > 0) {
        console.log(`Locked ${lockedCount} selected system(s).`);
        saveState(`Locked ${lockedCount} system(s)`);
        updateLockButtonsState(); // Update button states
        drawGalaxyMap(); // Redraw to reflect changes (e.g., visual indicators)
        displaySystemDetails(selectedSystems); // Update details panel
    }
}

// Function to unlock currently selected systems
function unlockSystems() {
    let unlockedCount = 0;
    selectedSystems.forEach(system => {
        if (system.isLocked) {
            system.isLocked = false;
            unlockedCount++;
        }
    });
    if (unlockedCount > 0) {
        console.log(`Unlocked ${unlockedCount} selected system(s).`);
        saveState(`Unlocked ${unlockedCount} system(s)`);
        updateLockButtonsState(); // Update button states
        drawGalaxyMap(); // Redraw to reflect changes
        displaySystemDetails(selectedSystems); // Update details panel
    }
}

// Function to toggle lock state for all systems
function toggleLockAllSystems() {
    const lockAllBtn = document.getElementById('lockAllBtn');
    const shouldLock = !lockAllBtn.classList.contains('active'); // Determine based on current state

    mapData.forEach(system => {
        system.isLocked = shouldLock;
    });

    if (shouldLock) {
        lockAllBtn.classList.add('active');
        lockAllBtn.setAttribute('data-tooltip', 'Unlock all systems');
        console.log('Locked all systems.');
        saveState('Locked all systems');
    } else {
        lockAllBtn.classList.remove('active');
        lockAllBtn.setAttribute('data-tooltip', 'Lock all systems');
        console.log('Unlocked all systems.');
        saveState('Unlocked all systems');
    }

    updateLockButtonsState(); // Update selected lock button state
    drawGalaxyMap(); // Redraw to reflect changes
    displaySystemDetails(selectedSystems); // Update details panel if needed
}

// Function to update the state (enabled/disabled, active) of lock buttons
function updateLockButtonsState() {
    const lockBtn = document.getElementById('lockBtn');
    const unlockBtn = document.getElementById('unlockBtn');
    const lockAllBtn = document.getElementById('lockAllBtn');

    // Enable "Lock" only if there are selected systems and at least one is currently UNLOCKED
    const canLockSelected = selectedSystems.length > 0 && selectedSystems.some(s => !s.isLocked);
    lockBtn.disabled = !canLockSelected;

    // Enable "Unlock" only if there are selected systems and at least one is currently LOCKED
    const canUnlockSelected = selectedSystems.length > 0 && selectedSystems.some(s => s.isLocked);
    unlockBtn.disabled = !canUnlockSelected;

    // Update "Lock All" button state and tooltip
    const allLocked = mapData.length > 0 && mapData.every(s => s.isLocked);
    if (allLocked) {
        lockAllBtn.classList.add('active');
        lockAllBtn.setAttribute('data-tooltip', 'Unlock all systems');
    } else {
        lockAllBtn.classList.remove('active');
        lockAllBtn.setAttribute('data-tooltip', 'Lock all systems');
    }

    // Potentially update tooltip manager if one is used
    // updateTooltips(); // Assuming a function like this exists
}

// Function to remove selected systems from their current region
function removeSelectedSystemsFromRegion() {
    if (selectedSystems.length === 0) {
        alert("No systems selected to remove from region.");
        return;
    }

    let removedCount = 0;
    selectedSystems.forEach(system => {
        if (system.regionId) {
            delete system.regionId;
            removedCount++;
        }
    });

    if (removedCount > 0) {
        saveState(`Removed ${removedCount} system(s) from their region`);
        displaySystemDetails(selectedSystems); // Update details panel (might show region as None)
        drawGalaxyMap(); // Redraw map to remove region indicators
        setupResourceFilter(); // Update filter state as region might change
        console.log(`Removed ${removedCount} system(s) from their region.`);
    } else {
        console.log("Selected systems were not assigned to any region.");
    }
}

// Helper function to update the system preview based on current selection
function updateSystemPreview() {
    if (typeof drawSystemPreview === 'function') {
        if (selectedSystems.length === 1) {
            drawSystemPreview(selectedSystems[0]);
        } else {
            drawSystemPreview(null);
        }
    } else {
        console.error("drawSystemPreview function not found. Cannot update preview.");
    }
}

// Helper function to clear selection-related UI elements
function clearSelectionUI() {
    displaySystemDetails(null);
    drawSystemPreview(null);
    if (deselectBtn) { // Check if deselectBtn exists
        deselectBtn.disabled = true;
    }
    // Ensure lock buttons are also updated after clearing selection UI
    updateLockButtonsState();
}

// Global variable to track help modal
let helpModalDialog = null;

// Function to show help/keyboard shortcuts modal
function showHelpModal() {
    // Toggle if already exists
    if (helpModalDialog) {
        document.body.removeChild(helpModalDialog);
        helpModalDialog = null;
        return;
    }

    // Create dialog for help
    helpModalDialog = document.createElement('div');
    helpModalDialog.className = 'modal-overlay';
    helpModalDialog.innerHTML = `
        <div class="modal-dialog help-modal">
            <div class="modal-content">
            <h3>SAGE Map Editor Help</h3>
            
            <div class="help-tabs">
                <button class="help-tab active" data-tab="quickstart">Quick Start</button>
                <button class="help-tab" data-tab="shortcuts">Keyboard Shortcuts</button>
                <button class="help-tab" data-tab="mouse">Mouse Controls</button>
            </div>
            
            <div class="help-content">
                <div id="quickstart-content" class="tab-content active">
                    <h4>Getting Started</h4>
                    <div class="help-section">
                        <h5>Basic Workflow</h5>
                        <ol>
                            <li><strong>Create Systems</strong>: Right-click on empty space to add a new star system</li>
                            <li><strong>Select Systems</strong>: Left-click to select, Shift+click for multiple</li>
                            <li><strong>Edit Properties</strong>: Use the right panel to modify stars, planets, and resources</li>
                            <li><strong>Link Systems</strong>: Right-click and drag between systems to create connections</li>
                            <li><strong>Organize Regions</strong>: Group systems into regions for bulk operations</li>
                        </ol>
                    </div>
                    
                    <div class="help-section">
                        <h5>Key Features</h5>
                        <ul>
                            <li><strong>Regional Distribution</strong>: Auto-generate planets and resources for selected systems</li>
                            <li><strong>Resource Management</strong>: Add/edit resources on planets with richness values</li>
                            <li><strong>Faction System</strong>: Assign faction types (determines planets) and controlling factions (visual ownership)</li>
                            <li><strong>Starbases</strong>: Add defensive structures (Tier 0-5) to systems</li>
                            <li><strong>Import/Export</strong>: Save and load your maps as JSON files</li>
                        </ul>
                    </div>
                    
                    <div class="help-section">
                        <h5>Tips</h5>
                        <ul>
                            <li>Use <strong>Snap to Grid</strong> for organized layouts</li>
                            <li>Toggle <strong>System Labels</strong> to see system names</li>
                            <li>Enable <strong>Faction Area</strong> to visualize territory control</li>
                            <li>Lock systems to prevent accidental changes</li>
                            <li>Use the search box to quickly find systems</li>
                        </ul>
                    </div>
                </div>
                
                <div id="shortcuts-content" class="tab-content">
                    <div class="shortcut-section">
                        <h4>Navigation</h4>
                        <div class="shortcut-grid">
                            <div class="shortcut-item">
                                <span class="shortcut-keys">+/=</span>
                                <span class="shortcut-description">Zoom in</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">-/_</span>
                                <span class="shortcut-description">Zoom out</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Ctrl + +/=</span>
                                <span class="shortcut-description">Zoom in (faster)</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Ctrl + -/_</span>
                                <span class="shortcut-description">Zoom out (faster)</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Ctrl + 0</span>
                                <span class="shortcut-description">Reset view/center map</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="shortcut-section">
                        <h4>System Operations</h4>
                        <div class="shortcut-grid">
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Ctrl + A</span>
                                <span class="shortcut-description">Select all systems</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Ctrl + C</span>
                                <span class="shortcut-description">Copy selected system</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Ctrl + V</span>
                                <span class="shortcut-description">Paste system</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Delete/Backspace</span>
                                <span class="shortcut-description">Delete selected system(s)</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="shortcut-section">
                        <h4>Visualization</h4>
                        <div class="shortcut-grid">
                            <div class="shortcut-item">
                                <span class="shortcut-keys">E</span>
                                <span class="shortcut-description">Toggle expanded system preview</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">D</span>
                                <span class="shortcut-description">Toggle heatmap debug mode</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">H</span>
                                <span class="shortcut-description">Toggle help modal</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="shortcut-section">
                        <h4>History</h4>
                        <div class="shortcut-grid">
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Ctrl + Z</span>
                                <span class="shortcut-description">Undo</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Ctrl + Y</span>
                                <span class="shortcut-description">Redo</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Ctrl + Shift + Z</span>
                                <span class="shortcut-description">Redo (alternative)</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Escape</span>
                                <span class="shortcut-description">Cancel current operation</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="mouse-content" class="tab-content">
                    <div class="shortcut-section">
                        <h4>Basic Mouse Controls</h4>
                        <div class="shortcut-grid">
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Left Click</span>
                                <span class="shortcut-description">Select system</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Right Click (empty)</span>
                                <span class="shortcut-description">Create new system</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Middle Mouse</span>
                                <span class="shortcut-description">Pan the map</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Mouse Wheel</span>
                                <span class="shortcut-description">Zoom in/out</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="shortcut-section">
                        <h4>Selection & Linking</h4>
                        <div class="shortcut-grid">
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Shift + Click</span>
                                <span class="shortcut-description">Add/remove from selection</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Ctrl + Click & Drag</span>
                                <span class="shortcut-description">Box select systems</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Right Click & Drag</span>
                                <span class="shortcut-description">Create link between systems</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Double Click</span>
                                <span class="shortcut-description">Select all systems in region</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="shortcut-section">
                        <h4>System Preview</h4>
                        <div class="shortcut-grid">
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Left Drag</span>
                                <span class="shortcut-description">Pan system view</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-keys">Mouse Wheel</span>
                                <span class="shortcut-description">Zoom system view</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="button-row">
                <button id="closeHelpBtn">Close</button>
            </div>
        </div>
        </div>
    `;

    document.body.appendChild(helpModalDialog);

    // Set up tab switching
    const tabs = helpModalDialog.querySelectorAll('.help-tab');
    const contents = helpModalDialog.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const contentId = tab.dataset.tab + '-content';
            helpModalDialog.querySelector('#' + contentId).classList.add('active');
        });
    });

    // Set up event handler for close button
    document.getElementById('closeHelpBtn').addEventListener('click', () => {
        document.body.removeChild(helpModalDialog);
        helpModalDialog = null;
    });

    // Close on click outside
    helpModalDialog.addEventListener('click', (e) => {
        if (e.target === helpModalDialog) {
            document.body.removeChild(helpModalDialog);
            helpModalDialog = null;
        }
    });

    // Also close on Escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape' && helpModalDialog) {
            document.body.removeChild(helpModalDialog);
            helpModalDialog = null;
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

// Function to show resource richness falloff modal
function showResourceRichnessModal() {
    // Check if systems are selected
    if (selectedSystems.length === 0) {
        alert('Please select systems to apply resource richness falloff');
        return;
    }

    // Create dialog for resource richness falloff
    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    dialog.innerHTML = `
        <div class="modal-content">
            <h3>Resource Richness Falloff</h3>
            <p>Apply richness values to resources based on distance from origin (0,0).</p>
            
            <div class="form-group">
                <label for="maxRichness">Maximum Richness:</label>
                <input type="number" id="maxRichness" value="8" min="0.1" max="10" step="0.1" />
                <span class="input-note">Closest to origin (0,0)</span>
            </div>
            
            <div class="form-group">
                <label for="minRichness">Minimum Richness:</label>
                <input type="number" id="minRichness" value="0.1" min="0.01" max="10" step="0.01" />
                <span class="input-note">Farthest systems/planets</span>
            </div>
            
            <div class="form-group">
                <label for="falloffCurve">Falloff Curve:</label>
                <select id="falloffCurve">
                    <option value="fibonacci">Fibonacci (Default)</option>
                    <option value="linear">Linear</option>
                    <option value="exponential">Exponential</option>
                    <option value="logarithmic">Logarithmic</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="useFilters">Apply to:</label>
                <select id="useFilters">
                    <option value="visible">Visible Resources Only (Filter Applied)</option>
                    <option value="all">All Resources</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="asteroidMultiplier">Asteroid Belt Richness Multiplier:</label>
                <input type="number" id="asteroidMultiplier" value="1.0" min="0.01" max="5.0" step="0.01" />
                <span class="input-note">Multiplies calculated richness for asteroid belt resources</span>
            </div>
            
            <div class="button-row">
                <button id="cancelRichnessBtn">Cancel</button>
                <button id="applyRichnessBtn">Apply Richness Falloff</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    // Set up event handlers
    document.getElementById('cancelRichnessBtn').addEventListener('click', () => {
        document.body.removeChild(dialog);
    });

    document.getElementById('applyRichnessBtn').addEventListener('click', () => {
        const maxRichness = parseFloat(document.getElementById('maxRichness').value);
        const minRichness = parseFloat(document.getElementById('minRichness').value);
        const falloffCurve = document.getElementById('falloffCurve').value;
        const useFilters = document.getElementById('useFilters').value === 'visible';
        const asteroidMultiplier = parseFloat(document.getElementById('asteroidMultiplier').value);

        // Validate inputs
        if (isNaN(maxRichness) || isNaN(minRichness)) {
            alert('Please enter valid numbers for min and max richness');
            return;
        }

        if (minRichness > maxRichness) {
            alert('Minimum richness cannot be greater than maximum richness');
            return;
        }

        if (isNaN(asteroidMultiplier) || asteroidMultiplier <= 0) {
            alert('Please enter a valid asteroid belt multiplier');
            return;
        }

        // Apply richness falloff
        applyResourceRichnessFalloff(selectedSystems, minRichness, maxRichness, falloffCurve, useFilters, asteroidMultiplier);

        // Close dialog
        document.body.removeChild(dialog);
    });
}

// Function to apply resource richness falloff
function applyResourceRichnessFalloff(systems, minRichness, maxRichness, falloffCurve, useFilters, asteroidMultiplier = 1.0) {
    if (systems.length === 0) return;

    // Find the system farthest from origin to normalize distances
    let maxDistance = 0;
    systems.forEach(system => {
        if (!system.coordinates) return;

        // Calculate distance from origin (0,0)
        const distance = Math.sqrt(
            Math.pow(system.coordinates[0], 2) +
            Math.pow(system.coordinates[1], 2)
        );

        if (distance > maxDistance) {
            maxDistance = distance;
        }
    });

    if (maxDistance === 0) {
        console.error("Could not determine max distance for richness falloff");
        return;
    }

    // Get visible resources if using filters
    let visibleResources = [];
    if (useFilters) {
        // Get all resource names that are visible in the filter
        Object.keys(resourceFilterState).forEach(key => {
            // Only include if it's not a system label filter and is visible (not false)
            if (!['SystemName', 'FactionLabel', 'PlanetCount', 'StarCount', 'StarbaseTier', 'LockStatus',
                'RegionalPolygon', 'RegionalBlob', 'RegionalName', 'RegionalSystems', 'RegionalCore',
                'RegionalKing', 'RegionalArea', 'RegionalDistance', 'RegionalIndicator', 'Planets'].includes(key) &&
                resourceFilterState[key] !== false) {
                visibleResources.push(key);
            }
        });
    }

    // Apply richness to each system's planets
    let changedResourcesCount = 0;

    systems.forEach(system => {
        if (!system.coordinates || !system.planets || system.planets.length === 0) return;

        // Calculate normalized distance from origin (0 to 1)
        const distance = Math.sqrt(
            Math.pow(system.coordinates[0], 2) +
            Math.pow(system.coordinates[1], 2)
        );
        const normalizedDistance = distance / maxDistance;

        // Calculate richness based on the falloff curve
        let richnessFactor;

        switch (falloffCurve) {
            case 'linear':
                richnessFactor = 1 - normalizedDistance; // Inverted: 1 at origin, 0 at max distance
                break;
            case 'exponential':
                richnessFactor = 1 - Math.pow(normalizedDistance, 2); // Inverted exponential
                break;
            case 'logarithmic':
                richnessFactor = normalizedDistance === 1 ? 0 : 1 - Math.log10(normalizedDistance * 9 + 1); // Inverted logarithmic
                break;
            case 'fibonacci':
            default:
                // Fibonacci-like falloff (steeper near the beginning, flatter near the end)
                richnessFactor = 1 - Math.pow(normalizedDistance, 0.618); // Inverted: Golden ratio exponent
                break;
        }

        // Calculate the richness value (now maxRichness is at origin, minRichness is at edges)
        const richnessValue = minRichness + richnessFactor * (maxRichness - minRichness);

        // Update resources on planets
        system.planets.forEach(planet => {
            if (!planet.resources) return;

            // Check if this planet is an asteroid belt
            const planetName = window.getPlanetTypeName ? window.getPlanetTypeName(planet.type) : '';
            const isAsteroidBelt = planetName && planetName.includes('System Asteroid Belt');

            planet.resources.forEach(resource => {
                // Skip if using filters and this resource is not visible
                if (useFilters && !visibleResources.includes(resource.name)) {
                    return;
                }

                // Calculate final richness value
                let finalRichness = richnessValue;

                // Apply asteroid multiplier if this is an asteroid belt
                if (isAsteroidBelt && asteroidMultiplier !== 1.0) {
                    finalRichness = richnessValue * asteroidMultiplier;
                }

                // Set the richness value, rounded appropriately
                // Use more decimal places for very small values
                if (finalRichness < 0.1) {
                    resource.richness = Math.round(finalRichness * 100) / 100; // Two decimal places for small values
                } else {
                    resource.richness = Math.round(finalRichness * 10) / 10; // One decimal place for normal values
                }
                changedResourcesCount++;
            });
        });
    });

    // Save state to history
    saveState(`Applied Resource Richness Falloff to ${changedResourcesCount} resources`);

    // Update UI
    if (selectedSystems.length === 1) {
        displaySystemDetails(selectedSystems);
    }

    // Show confirmation
    alert(`Applied resource richness falloff to ${changedResourcesCount} resources in ${systems.length} systems.`);
}

// Function to update the heatmap checkbox label to show debug mode status
function updateHeatmapDebugLabel() {
    const heatmapToggle = document.querySelector('#toggle-resource-heatmap');
    const heatmapLabel = document.querySelector('label[for="toggle-resource-heatmap"]');

    if (heatmapToggle && heatmapLabel) {
        if (heatmapDebugMode && showResourceHeatmap) {
            heatmapLabel.innerHTML = 'Resource Abundance Heatmap <span style="color:#ffcc00;">[DEBUG]</span>';
        } else {
            heatmapLabel.textContent = 'Resource Abundance Heatmap';
        }
    }
}

// Toggle debug mode for heatmap
function toggleHeatmapDebugMode() {
    if (showResourceHeatmap) {
        heatmapDebugMode = !heatmapDebugMode;
        console.log("Heatmap debug mode:", heatmapDebugMode ? "ENABLED" : "DISABLED");
        updateHeatmapDebugLabel();
        drawGalaxyMap(); // Redraw with debug info
    }
}