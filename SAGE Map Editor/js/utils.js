// utils.js - Utility functions

// Helper function to get star color
function getStarColor(star) {
    if (!star || !star.name) return '#FFFFFF';
    const nameLower = star.name.toLowerCase();
    if (nameLower.includes('red dwarf')) return '#FF6347';
    if (nameLower.includes('white dwarf')) return '#F0F8FF';
    if (nameLower.includes('solar') || nameLower.includes('yellow')) return '#FFD700';
    if (nameLower.includes('hot blue')) return '#ADD8E6';
    if (nameLower.includes('red giant')) return '#DC143C';
    return '#FFFFFF';
}

// Helper function to get planet/structure color
function getPlanetColor(typeNameOrId) {
    if (typeNameOrId === undefined || typeNameOrId === null) return '#CCCCCC'; // Grey

    // Handle numeric planet type IDs by converting to name
    if (typeof typeNameOrId === 'number') {
        // Find the planet type by ID
        const planetType = PLANET_TYPES.find(pt => pt.type === typeNameOrId);
        if (planetType) {
            typeNameOrId = planetType.name;
        } else {
            console.warn(`Unknown planet type ID: ${typeNameOrId}`);
            return '#CCCCCC'; // Default gray for unknown
        }
    }

    // Now we should have a string name
    if (typeof typeNameOrId !== 'string') {
        console.warn(`Invalid planet type: ${JSON.stringify(typeNameOrId)}`);
        return '#CCCCCC'; // Default gray
    }

    const nameLower = typeNameOrId.toLowerCase();
    if (nameLower.includes('terrestrial')) return '#228B22'; // ForestGreen
    if (nameLower.includes('volcanic')) return '#FF4500'; // OrangeRed
    if (nameLower.includes('barren')) return '#A0522D'; // Sienna
    if (nameLower.includes('asteroid belt')) return '#808080'; // Grey
    if (nameLower.includes('gas giant')) return '#DAA520'; // Goldenrod
    if (nameLower.includes('ice giant')) return '#AFEEEE'; // PaleTurquoise
    if (nameLower.includes('oceanic')) return '#0077BE'; // Ocean Blue
    if (nameLower.includes('structure') || nameLower.includes('station')) return '#B0C4DE'; // LightSteelBlue
    return '#CCCCCC';
}

// Helper function to map screen coordinates to map coordinates
function screenToMapCoords(screenX, screenY) {
    // Use full floating point precision without rounding
    const mapX = (screenX - offsetX) / scale;
    const mapY = (screenY - offsetY) / -scale;
    return { x: mapX, y: mapY };
}

// Function to find a system at given canvas coordinates
function findSystemAtCoords(canvasX, canvasY) {
    const clickRadius = 10; // Radius in pixels for hit detection
    let foundSystem = null;
    let minDistance = clickRadius; // Only detect within this radius

    mapData.forEach(system => {
        if (system.coordinates && system.coordinates.length === 2) {
            const sysX = system.coordinates[0] * scale + offsetX;
            const sysY = system.coordinates[1] * -1 * scale + offsetY;
            const distance = Math.sqrt((canvasX - sysX) ** 2 + (canvasY - sysY) ** 2);

            if (distance < minDistance) {
                minDistance = distance;
                foundSystem = system;
            }
        }
    });

    return foundSystem;
}

// Helper function to get faction color
function getFactionColor(faction) {
    switch (faction) {
        case 'MUD': return '#FF5722';
        case 'ONI': return '#2196F3';
        case 'UST':
        case 'USTUR': return '#FFC107';
        default: return '#FFFFFF'; // White for unknown/neutral
    }
}

// Deep copy function for objects
function deepCopy(data) {
    // Simple deep copy for JSON-compatible data
    try {
        return JSON.parse(JSON.stringify(data));
    } catch (e) {
        console.error("Deep copy failed:", e);
        return null; // Indicate failure
    }
}

// Get region color
function getRegionColor(regionId) {
    if (!regionId) return null;
    const region = regionDefinitions.find(r => r.id === regionId);
    return region ? region.color : null;
}

// Convert hex color to RGB object
function hexToRgb(hex) {
    // Default to white if invalid
    if (!hex || typeof hex !== 'string') return { r: 255, g: 255, b: 255 };

    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Handle shortened hex (e.g. #FFF)
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    // Parse hex components
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return { r, g, b };
}

// Calculate polygon area using Shoelace formula
function calculatePolygonArea(vertices) {
    let area = 0;

    for (let i = 0; i < vertices.length; i++) {
        const j = (i + 1) % vertices.length; // Next vertex, wrapping to start

        // Cross product of edges
        area += vertices[i].x * vertices[j].y;
        area -= vertices[j].x * vertices[i].y;
    }

    return Math.abs(area) / 2;
}

// Calculate convex hull using Graham Scan
function calculateConvexHull(points) {
    if (points.length < 3) return points.map(p => ({ x: p.x, y: p.y }));

    // Find the point with the lowest y-coordinate (and leftmost if tied)
    let lowestPoint = points[0];
    for (let i = 1; i < points.length; i++) {
        if (points[i].y < lowestPoint.y || (points[i].y === lowestPoint.y && points[i].x < lowestPoint.x)) {
            lowestPoint = points[i];
        }
    }

    // Sort points by polar angle with respect to the lowest point
    const sortedPoints = points.slice();
    const pivotPoint = lowestPoint;
    sortedPoints.sort((a, b) => {
        if (a === pivotPoint) return -1;
        if (b === pivotPoint) return 1;

        const angleA = Math.atan2(a.y - pivotPoint.y, a.x - pivotPoint.x);
        const angleB = Math.atan2(b.y - pivotPoint.y, b.x - pivotPoint.x);

        if (angleA !== angleB) {
            return angleA - angleB;
        }

        // If angles are equal, sort by distance (closest first)
        const distA = Math.sqrt(Math.pow(a.x - pivotPoint.x, 2) + Math.pow(a.y - pivotPoint.y, 2));
        const distB = Math.sqrt(Math.pow(b.x - pivotPoint.x, 2) + Math.pow(b.y - pivotPoint.y, 2));
        return distA - distB;
    });

    // Graham scan algorithm to find convex hull
    const hull = [sortedPoints[0], sortedPoints[1]];

    for (let i = 2; i < sortedPoints.length; i++) {
        while (hull.length >= 2 && !isCounterClockwise(hull[hull.length - 2], hull[hull.length - 1], sortedPoints[i])) {
            hull.pop();
        }
        hull.push(sortedPoints[i]);
    }

    return hull.map(p => ({ x: p.x, y: p.y }));
}

// Check if three points make a counter-clockwise turn
function isCounterClockwise(p1, p2, p3) {
    return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x) > 0;
}

// Helper for galaxy canvas coordinates
function getGalaxyCanvasCoords(event) {
    if (!canvas) return { x: 0, y: 0 };

    // Get canvas bounding rect
    const rect = canvas.getBoundingClientRect();

    // Calculate mouse position in CSS pixels
    const cssX = event.clientX - rect.left;
    const cssY = event.clientY - rect.top;

    // Return CSS pixel coordinates (the canvas context scaling will handle the DPI conversion)
    return { x: cssX, y: cssY };
}

// Get default resources for a planet type
function getDefaultResourcesForPlanetType(planetTypeName) {
    const { archetype, faction } = getPlanetArchetype(planetTypeName);
    if (!archetype || !faction || !PLANET_ARCHETYPE_RESOURCES[faction] || !PLANET_ARCHETYPE_RESOURCES[faction][archetype]) {
        console.warn(`No resources found for planet type: ${planetTypeName} (Archetype: ${archetype}, Faction: ${faction})`);
        return [];
    }

    // Return a deep copy of the default resources for the specific faction and archetype
    return JSON.parse(JSON.stringify(PLANET_ARCHETYPE_RESOURCES[faction][archetype]));
}

// Get planet archetype and faction from type name
function getPlanetArchetype(planetTypeName) {
    if (!planetTypeName) return { archetype: null, faction: null };

    let faction = null;
    if (planetTypeName.includes("ONI")) faction = "ONI";
    else if (planetTypeName.includes("MUD")) faction = "MUD";
    else if (planetTypeName.includes("USTUR")) faction = "USTUR";

    let archetype = null;
    if (planetTypeName.includes("Terrestrial")) archetype = "Terrestrial";
    else if (planetTypeName.includes("Volcanic")) archetype = "Volcanic";
    else if (planetTypeName.includes("Barren")) archetype = "Barren";
    else if (planetTypeName.includes("System Asteroid Belt")) archetype = "Asteroid Belt";
    else if (planetTypeName.includes("Gas Giant")) archetype = "Gas Giant";
    else if (planetTypeName.includes("Ice Giant")) archetype = "Ice Giant";
    else if (planetTypeName.includes("Dark Planet")) archetype = "Dark";
    else if (planetTypeName.includes("Oceanic")) archetype = "Oceanic";

    return { archetype, faction };
}

// Count CORE systems in a region
function countCoreSystemsInRegion(systems) {
    if (!systems) return 0;
    return systems.filter(system => system.isCore === true).length;
}

// Export utility functions
window.getStarColor = getStarColor;
window.getPlanetColor = getPlanetColor;
window.screenToMapCoords = screenToMapCoords;
window.findSystemAtCoords = findSystemAtCoords;
window.getFactionColor = getFactionColor;
window.deepCopy = deepCopy;
window.getRegionColor = getRegionColor;
window.hexToRgb = hexToRgb;
window.calculatePolygonArea = calculatePolygonArea;
window.calculateConvexHull = calculateConvexHull;
window.isCounterClockwise = isCounterClockwise;
window.getGalaxyCanvasCoords = getGalaxyCanvasCoords;
window.getDefaultResourcesForPlanetType = getDefaultResourcesForPlanetType;
window.getPlanetArchetype = getPlanetArchetype;
window.countCoreSystemsInRegion = countCoreSystemsInRegion; 