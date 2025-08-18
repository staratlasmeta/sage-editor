// file-operations.js - Functions for file import/export

// Create a new map
function newMap() {
    console.log("==== Creating New Map ====");
    
    // Clear relevant map data manually (avoid clearMapData() which clears history)
    mapData = [];
    systemLookup = {};
    selectedSystems = [];
    regionDefinitions = [];
    linkSourceSystem = null;
    isLinking = false;
    systemCounter = 0; // Reset counter
    currentFilename = null; // Clear filename
    isModified = false; // Reset modified state
    systemClipboard = null; // Clear clipboard
    hoveredSystem = null;
    draggedSystem = null;
    // Clear related UI
    displaySystemDetails(null);
    drawSystemPreview(null);
    
    // Set default map title if element exists
    const mapTitleElement = document.getElementById('mapTitle');
    if (mapTitleElement) {
        mapTitleElement.value = 'New Galaxy Map';
    }
    
    updateSystemCount();
    if(deselectBtn) deselectBtn.disabled = true;
    if (searchSystemInput) {
        searchSystemInput.value = ''; // Clear search input
        searchTerm = '';
        const wrapper = searchSystemInput.closest('.search-input-wrapper');
        if (wrapper) {
            wrapper.classList.remove('has-text');
        }
    }
    
    // Initialize history for the new map
    historyStack = [];
    redoStack = [];
    lastActionGroup = null;
    
    // 1. Save the initial EMPTY state first
    console.log("Saving empty base state...");
    saveState('Base Empty State', false, true); // forceEmpty = true is key

    // 2. Create default region if applicable
    try {
        if (typeof createDefaultRegion === 'function') {
            console.log("Calling createDefaultRegion...");
            createDefaultRegion(); // This might add systems/regions
            console.log("createDefaultRegion called.");
            // 3. Save the state *after* creating the default region, if it changed anything
            // We might compare against the base state or just save unconditionally for simplicity
            saveState('Initial Map Setup', false); // Description reflects potential default content
        } else {
            console.warn("createDefaultRegion function not found. Starting with empty map.");
            // If no default region, the 'Base Empty State' is the only initial state.
        }
    } catch (error) {
        console.error("Error during createDefaultRegion or subsequent saveState:", error);
        // Fallback: Ensure at least the empty state is saved if errors occurred.
        if (historyStack.length === 0) {
             saveState('Base Empty State (Fallback)', false, true);
        }
    }
    
    // Final UI Updates for New Map
    drawGalaxyMap();
    updateUndoRedoButtons();
    updateHistoryPanel(); 
    updateTopBarInfo(); // Update filename display and saved status
    isModified = false; // Reset modified status AFTER potentially saving initial state

    console.log("==== New Map Created. History size:", historyStack.length);
}

// Import map from file
function importMap() {
    saveState('Import Map');
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    
    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Set the current filename from the imported file
        currentFilename = file.name;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                // Show import loader
                createImportLoader();
                updateImportProgress(5, 'READING FILE...');
                
                // Parse JSON with a small delay to show the loader
                setTimeout(() => {
                    try {
                        const importData = JSON.parse(e.target.result);
                        updateImportProgress(10, 'PARSING MAP DATA...');
                        
                        // Load the map data with progress tracking
                        loadMapData(importData, () => {
                            // After data is loaded, draw the galaxy
                            updateImportProgress(80, 'RENDERING GALAXY MAP...');
                            
                            setTimeout(() => {
                                drawGalaxyMap();
                                unsavedChanges = false;
                                
                                // Set title if the element exists
                                if (importData.title) {
                                    const mapTitleElement = document.getElementById('mapTitle');
                                    if (mapTitleElement) {
                                        mapTitleElement.value = importData.title;
                                    }
                                }
                                
                                // Update the filename display in the UI
                                updateTopBarInfo();
                                
                                // Show completion
                                showImportComplete();
                            }, 100);
                        });
                    } catch (error) {
                        console.error('Error parsing map:', error);
                        closeImportLoader();
                        alert('Error importing map: ' + error.message);
                    }
                }, 100);
            } catch (error) {
                console.error('Error importing map:', error);
                if (window.closeImportLoader) closeImportLoader();
                alert('Error importing map: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    });
    
    fileInput.click();
}

// Load map data from imported object
function loadMapData(importData, onComplete) {
    // Support both old (array) and new (object) formats
    let loadedMapData;
    if (Array.isArray(importData)) {
        loadedMapData = importData;
        regionDefinitions = [];
    } else {
        loadedMapData = importData.mapData || [];
        regionDefinitions = importData.regionDefinitions || [];
    }
    
    // Update progress for region counting
    if (window.updateImportProgress) {
        updateImportProgress(15, `LOADING ${regionDefinitions.length} REGIONS...`);
    }
    
    // --- Transform data for compatibility with new structure ---
    loadedMapData.forEach(system => {
        // Convert old single 'star' to 'stars' array
        if (system.star && !system.stars) {
            system.stars = [system.star];
        }
        
        // Convert closestFaction to faction for the new structure
        if (system.closestFaction && !system.faction) {
            system.faction = system.closestFaction;
            console.log(`Converted closestFaction ${system.closestFaction} to faction for system ${system.name || system.key}`);
        }
        
        // Handle links array format conversion if needed
        if (system.links && Array.isArray(system.links) && system.links.length > 0) {
            // Check if links are stored as objects with key/name
            if (typeof system.links[0] === 'object' && system.links[0].key) {
                system.links = system.links.map(link => link.key);
                console.log(`Converted links format for system ${system.name || system.key}`);
            }
        }
        
        // Ensure planets have proper format
        if (system.planets && Array.isArray(system.planets)) {
            system.planets.forEach(planet => {
                // Convert planet type from object to number if needed
                if (planet.type && typeof planet.type === 'object' && planet.type.name) {
                    // Try to find matching planet type in constants
                    const matchingType = PLANET_TYPES.find(pt => pt.name === planet.type.name);
                    if (matchingType) {
                        console.log(`Converted planet type object to number (${matchingType.type}) for ${planet.name}`);
                        planet.type = matchingType.type;
                        if (planet.type.scale) {
                            planet.scale = planet.type.scale;
                        }
                    }
                }
                
                // Convert location/polarCoordinates to orbit/angle if needed
                if (planet.location !== undefined && planet.orbit === undefined) {
                    planet.orbit = planet.location;
                    console.log(`Converted planet location to orbit for ${planet.name}`);
                }
                
                if (planet.polarCoordinates !== undefined && planet.angle === undefined) {
                    planet.angle = planet.polarCoordinates;
                    console.log(`Converted polarCoordinates to angle for ${planet.name}`);
                }
                
                // Convert hardness to richness for backward compatibility
                if (planet.resources && Array.isArray(planet.resources)) {
                    planet.resources.forEach(resource => {
                        if (resource.hardness !== undefined && resource.richness === undefined) {
                            resource.richness = resource.hardness;
                            delete resource.hardness;
                            console.log(`Converted hardness to richness for resource ${resource.name} on planet ${planet.name}`);
                        }
                    });
                }
            });
        }
    });

    // Process systems with progress tracking if available
    if (window.processSystemsWithProgress && window.updateImportProgress) {
        updateImportProgress(20, 'PROCESSING SYSTEMS...');
        processSystemsWithProgress(loadedMapData, () => {
            // Continue with normal processing after stats are collected
            finishLoadingMapData(loadedMapData, onComplete);
        });
    } else {
        // Fallback to normal processing without progress
        finishLoadingMapData(loadedMapData, onComplete);
    }
}

// Finish loading map data after progress tracking
function finishLoadingMapData(loadedMapData, onComplete) {
    mapData = loadedMapData;
    
    // Update progress
    if (window.updateImportProgress) {
        updateImportProgress(65, 'BUILDING SYSTEM LOOKUP...');
    }
    
    // Generate system lookup
    systemLookup = {};
    let maxCounter = 0;
    
    mapData.forEach(system => {
        if (!system.key) {
            system.key = `sys-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        }
        
        systemLookup[system.key] = system;
        
        // Ensure isLocked property exists
        if (system.isLocked === undefined) {
            system.isLocked = false;
        }
        
        // Extract system counter from name if possible
        if (system.name) {
            const match = system.name.match(/System-(\d+)/);
            if (match && match[1]) {
                const counter = parseInt(match[1]);
                if (!isNaN(counter) && counter > maxCounter) {
                    maxCounter = counter;
                }
            }
        }
    });
    
    // Set system counter to max found + 1
    systemCounter = maxCounter + 1;
    
    // Update progress
    if (window.updateImportProgress) {
        updateImportProgress(70, 'UPDATING INTERFACE...');
    }
    
    // Update UI
    clearSelection();
    isModified = false;
    updateTopBarInfo();
    updateSystemCount();
    updateLockButtonsState(); // Update lock button state
    centerMapView();
    
    // Call completion callback if provided
    if (onComplete) {
        onComplete();
    } else {
        drawGalaxyMap();
    }
}

// Export map to file
function exportMap() {
    if (mapData.length === 0) {
        alert('No map data to export');
        return;
    }
    
    try {
        // Create export object with map data and region definitions
        const exportObj = {
            mapData: mapData,
            regionDefinitions: regionDefinitions,
            title: 'Galaxy Map'
        };
        
        // Try to get the title from the mapTitle element if it exists
        const mapTitleElement = document.getElementById('mapTitle');
        if (mapTitleElement && mapTitleElement.value) {
            exportObj.title = mapTitleElement.value;
        }
        
        const dataStr = JSON.stringify(exportObj, null, 2); // Pretty print with 2 space indentation
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFilename = currentFilename || 'map-export.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFilename);
        linkElement.style.display = 'none';
        
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
        
        isModified = false;
        updateTopBarInfo();
        
        console.log(`Exported ${mapData.length} systems to ${exportFilename}`);
    } catch (error) {
        console.error('Error exporting map:', error);
        alert(`Error exporting map: ${error.message}`);
    }
}

// Clear selection - helper for file operations
function clearSelection() {
    selectedSystems = [];
    displaySystemDetails(null);
    drawSystemPreview(null);
    if(deselectBtn) deselectBtn.disabled = true;
}

// Fix faction data in systems
function fixFactionData() {
    let updatedCount = 0;
    
    mapData.forEach(system => {
        // Check for closestFaction
        if (system.closestFaction && !system.faction) {
            system.faction = system.closestFaction;
            updatedCount++;
        }
    });
    
    if (updatedCount > 0) {
        console.log(`Fixed faction data for ${updatedCount} systems`);
        saveState(`Fixed faction data for ${updatedCount} systems`);
        drawGalaxyMap();
    } else {
        console.log('No faction data needed fixing');
    }
    
    return updatedCount;
}

// Force a complete reset of the application
function forceReset() {
    console.log("==== FORCE RESET INITIATED ====");
    
    // Clear all data
    mapData = [];
    systemLookup = {};
    selectedSystems = [];
    linkSourceSystem = null;
    isLinking = false;
    systemCounter = 0;
    historyStack = [];
    redoStack = [];
    lastActionGroup = null;
    currentFilename = null;
    isModified = false;
    systemClipboard = null;
    hoveredSystem = null;
    draggedSystem = null;
    
    // Reset view
    scale = 5;
    offsetX = 400;
    offsetY = 300;
    
    // Clear UI elements
    displaySystemDetails(null);
    drawSystemPreview(null);
    if (searchSystemInput) {
        searchSystemInput.value = '';
        searchTerm = '';
        
        const wrapper = searchSystemInput.closest('.search-input-wrapper');
        if (wrapper) {
            wrapper.classList.remove('has-text');
        }
    }
    
    // Set default title if element exists
    const mapTitleElement = document.getElementById('mapTitle');
    if (mapTitleElement) {
        mapTitleElement.value = 'New Galaxy Map';
    }
    
    // Add two states: a hidden empty base state and an initial visible state
    console.log("Creating base empty state");
    // Base empty state - can be reached by undoing the initial state
    historyStack.push({
        description: 'Empty Base State',
        timestamp: new Date(Date.now() - 1000), // 1 second earlier
        actionGroup: null,
        state: [] // Truly empty
    });
    
    // Initial state that users will see
    console.log("Saving initial state");
    saveState('Initial State', false, true);
    
    // Update UI
    drawGalaxyMap();
    updateUndoRedoButtons();
    updateHistoryPanel();
    updateSystemCount();
    updateTopBarInfo();
    
    console.log("==== FORCE RESET COMPLETED ====");
    console.log("History stack now has", historyStack.length, "items");
    return "Application has been force reset. Console shows debug information.";
}

// Export file operation functions
window.newMap = newMap;
window.importMap = importMap;
window.exportMap = exportMap;
window.clearSelection = clearSelection;
window.fixFactionData = fixFactionData;
window.forceReset = forceReset; 