// helpers.js - Helper functions and utilities

// Get canvas coordinates from mouse event
function getGalaxyCanvasCoords(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

// Convert screen coordinates to map coordinates
function screenToMapCoords(screenX, screenY) {
    return {
        x: (screenX - offsetX) / scale,
        y: (screenY - offsetY) / -scale
    };
}

// Find system at screen coordinates
function findSystemAtCoords(x, y) {
    const tolerance = 10; // Clickable area around system node

    // Check if mouse is near any system
    for (let i = 0; i < mapData.length; i++) {
        const system = mapData[i];
        if (!system.coordinates || system.coordinates.length !== 2) continue;

        const sysScreenX = system.coordinates[0] * scale + offsetX;
        const sysScreenY = system.coordinates[1] * -1 * scale + offsetY;

        const distance = Math.sqrt((x - sysScreenX) ** 2 + (y - sysScreenY) ** 2);

        if (distance <= tolerance) {
            return system;
        }
    }

    return null;
}

// Get faction color
function getFactionColor(faction) {
    if (!faction) return '#CCCCCC'; // Default gray for no faction

    switch (faction) {
        case 'MUD':
            return '#FF5722'; // New MUD color
        case 'ONI':
            return '#2196F3'; // New ONI color
        case 'UST':
        case 'USTUR':
            return '#FFC107'; // USTUR color
        case 'Neutral':
        case 'NEUTRAL':
            return '#999999'; // Neutral gray color
        default:
            return '#CCCCCC'; // Gray default
    }
}

// Get region color
function getRegionColor(regionId) {
    if (!regionId || !regionDefinitions) return null;

    const region = regionDefinitions.find(r => r.id === regionId);
    return region ? region.color : null;
}

// Convert hex color to RGB components
function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Parse r, g, b values
    let bigint = parseInt(hex, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;

    return { r, g, b };
}

// Create deep copy of an object
function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Calculate convex hull for a set of points (Graham scan algorithm)
function calculateConvexHull(points) {
    if (points.length < 3) return points;

    // Find the point with the lowest y-coordinate (and leftmost if tied)
    let lowestPoint = points[0];
    for (let i = 1; i < points.length; i++) {
        if (points[i].y < lowestPoint.y ||
            (points[i].y === lowestPoint.y && points[i].x < lowestPoint.x)) {
            lowestPoint = points[i];
        }
    }

    // Sort points by polar angle with respect to lowestPoint
    const sortedPoints = points.slice();
    const pivot = lowestPoint;

    sortedPoints.sort((a, b) => {
        if (a === pivot) return -1;
        if (b === pivot) return 1;

        const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
        const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);

        if (angleA === angleB) {
            // If angles are the same, sort by distance from pivot
            const distA = Math.sqrt((a.x - pivot.x) ** 2 + (a.y - pivot.y) ** 2);
            const distB = Math.sqrt((b.x - pivot.x) ** 2 + (b.y - pivot.y) ** 2);
            return distA - distB;
        }

        return angleA - angleB;
    });

    // Build hull
    const hull = [sortedPoints[0], sortedPoints[1]];

    for (let i = 2; i < sortedPoints.length; i++) {
        let top = hull.length - 1;

        while (hull.length >= 2 &&
            !isLeftTurn(hull[top - 1], hull[top], sortedPoints[i])) {
            hull.pop();
            top = hull.length - 1;
        }

        hull.push(sortedPoints[i]);
    }

    return hull;
}

// Helper function to determine if three points make a left turn
function isLeftTurn(p1, p2, p3) {
    const cross = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
    return cross > 0;
}

// Calculate area of a polygon defined by points
function calculatePolygonArea(points) {
    if (points.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }

    return Math.abs(area / 2);
}

// Count core systems in a region
function countCoreSystemsInRegion(systems) {
    if (!systems) return 0;

    return systems.filter(system => system.isCore).length;
}

// Update top bar info
function updateTopBarInfo() {
    // Update current filename
    if (currentFilenameSpan) {
        currentFilenameSpan.textContent = currentFilename || 'Unsaved Map';
    }

    // Update save status indicator
    if (saveStatusIndicator) {
        saveStatusIndicator.textContent = isModified ? '(Modified)' : '(Saved)';
        saveStatusIndicator.className = isModified ? 'modified' : 'saved';
    }
}

// Clear all map data
function clearMapData() {
    mapData = [];
    systemLookup = {};
    regionDefinitions = [];
    selectedSystems = [];
    systemCounter = 1;
    historyStack = [];
    redoStack = [];
    isModified = false;
    currentFilename = null;

    displaySystemDetails(null);
    drawSystemPreview(null);
    updateTopBarInfo();
    updateUndoRedoButtons();
    centerMapView();
    drawGalaxyMap();
}

// Save current state for undo/redo
function saveState(description) {
    // Create a copy of the current state
    const state = {
        mapData: deepCopy(mapData),
        regionDefinitions: deepCopy(regionDefinitions),
        description: description || 'Change'
    };

    // Add to history stack
    historyStack.push(state);

    // Clear redo stack when a new change is made
    redoStack = [];

    // Limit history size
    if (historyStack.length > window.MAX_HISTORY_SIZE) {
        historyStack.shift();
    }

    // Mark as modified
    isModified = true;
    updateTopBarInfo();
    updateUndoRedoButtons();
    updateHistoryPanel();
}

// Undo last change
function undo() {
    if (historyStack.length === 0) return;

    // Save current state to redo stack
    const currentState = {
        mapData: deepCopy(mapData),
        regionDefinitions: deepCopy(regionDefinitions),
        description: 'Redo'
    };

    redoStack.push(currentState);

    // Pop last state from history
    const lastState = historyStack.pop();

    // Restore state
    mapData = lastState.mapData;
    regionDefinitions = lastState.regionDefinitions;

    // Rebuild system lookup
    rebuildSystemLookup();

    // Clear selection
    selectedSystems = [];
    displaySystemDetails(null);
    drawSystemPreview(null);

    // Update UI
    updateUndoRedoButtons();
    updateHistoryPanel();
    drawGalaxyMap();

    console.log(`Undo: ${lastState.description}`);
}

// Redo last undone change
function redo() {
    if (redoStack.length === 0) return;

    // Save current state to history stack
    const currentState = {
        mapData: deepCopy(mapData),
        regionDefinitions: deepCopy(regionDefinitions),
        description: 'Undo'
    };

    historyStack.push(currentState);

    // Pop last state from redo stack
    const redoState = redoStack.pop();

    // Restore state
    mapData = redoState.mapData;
    regionDefinitions = redoState.regionDefinitions;

    // Rebuild system lookup
    rebuildSystemLookup();

    // Clear selection
    selectedSystems = [];
    displaySystemDetails(null);
    drawSystemPreview(null);

    // Update UI
    updateUndoRedoButtons();
    updateHistoryPanel();
    drawGalaxyMap();

    console.log(`Redo: ${redoState.description}`);
}

// Rebuild system lookup from mapData
function rebuildSystemLookup() {
    systemLookup = {};
    mapData.forEach(system => {
        if (system.key) {
            systemLookup[system.key] = system;
        }
    });
}

// Initialize resource filter state
function initResourceFilterState() {
    resourceFilterState = {
        "Planets": true
    };

    // Initialize all resources to visible by default
    RESOURCE_TYPES.forEach(resource => {
        resourceFilterState[resource.name] = true;
    });
}

// Get default resources for a planet type
function getDefaultResourcesForPlanetType(planetType) {
    // Forward to the implementation in utils.js if available
    if (typeof window.getDefaultResourcesForPlanetType === 'function') {
        return window.getDefaultResourcesForPlanetType(planetType);
    }

    // Fallback implementation
    if (!planetType) return [];

    const type = planetType.toLowerCase();

    if (type.includes('terrestrial')) {
        return [
            { type: 31, name: 'Iron Ore', richness: 1 },
            { type: 12, name: 'Carbon', richness: 1 },
            { type: 15, name: 'Copper Ore', richness: 1 },
            { type: 65, name: 'Silica', richness: 1 }
        ];
    } else if (type.includes('volcanic')) {
        return [
            { type: 70, name: 'Sulfur', richness: 1 },
            { type: 30, name: 'Iridium Ore', richness: 4 },
            { type: 52, name: 'Platinum Ore', richness: 4 },
            { type: 18, name: 'Glowstone Crystals', richness: 3 }
        ];
    } else if (type.includes('barren')) {
        return [
            { type: 15, name: 'Copper Ore', richness: 1 },
            { type: 84, name: 'Zinc Ore', richness: 1 },
            { type: 76, name: 'Tin Ore', richness: 1 }
        ];
    } else if (type.includes('asteroid')) {
        return [
            { type: 77, name: 'Titanium Ore', richness: 3 },
            { type: 2, name: 'Aluminum Ore', richness: 2 },
            { type: 11, name: 'Boron Ore', richness: 2 }
        ];
    } else if (type.includes('gas giant')) {
        return [
            { type: 29, name: 'Hydrogen', richness: 1 },
            { type: 5, name: 'Argon', richness: 2 },
            { type: 43, name: 'Nitrogen', richness: 1 },
            { type: 25, name: 'Tenon Gas', richness: 3 }
        ];
    } else if (type.includes('ice giant')) {
        return [
            { type: 33, name: 'Krypton', richness: 1 },
            { type: 83, name: 'Xenon', richness: 2 },
            { type: 26, name: 'Cobalt Ore', richness: 4 },
            { type: 85, name: 'Zirconium Ore', richness: 4 }
        ];
    } else if (type.includes('oceanic')) {
        return [
            { type: 0, name: 'Abyssal Chromite', richness: 1 },
            { type: 1, name: 'Abyssal Energy Crystals', richness: 4 },
            { type: 6, name: 'Bathysphere Pearls', richness: 3 },
            { type: 37, name: 'Lunar Echo Crystals', richness: 5 },
            { type: 42, name: 'Neural Coral Compounds', richness: 3 },
            { type: 50, name: 'Phase Shift Crystals', richness: 4 }
        ];
    }

    return [];
}

// Get all unique resources in a system
function getAllSystemResources(system) {
    if (!system || !system.planets) return [];

    const allResources = new Set();
    const resourcesWithInfo = [];

    system.planets.forEach(planet => {
        if (planet.resources) {
            planet.resources.forEach(resource => {
                if (!allResources.has(resource.name)) {
                    allResources.add(resource.name);
                    resourcesWithInfo.push({
                        name: resource.name,
                        richness: resource.richness || 1
                    });
                }
            });
        }
    });

    return resourcesWithInfo;
}

// Export helper functions
window.getGalaxyCanvasCoords = getGalaxyCanvasCoords;
window.screenToMapCoords = screenToMapCoords;
window.findSystemAtCoords = findSystemAtCoords;
window.getFactionColor = getFactionColor;
window.getRegionColor = getRegionColor;
window.hexToRgb = hexToRgb;
window.deepCopy = deepCopy;
window.calculateConvexHull = calculateConvexHull;
window.isLeftTurn = isLeftTurn;
window.calculatePolygonArea = calculatePolygonArea;
window.countCoreSystemsInRegion = countCoreSystemsInRegion;
window.updateTopBarInfo = updateTopBarInfo;
window.clearMapData = clearMapData;
window.saveState = saveState;
window.undo = undo;
window.redo = redo;
window.rebuildSystemLookup = rebuildSystemLookup;
window.initResourceFilterState = initResourceFilterState;
window.getDefaultResourcesForPlanetType = getDefaultResourcesForPlanetType;
window.getAllSystemResources = getAllSystemResources; 