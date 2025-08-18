# API Reference

This document provides a comprehensive API reference for the SAGE Map Editor, detailing all public functions, data formats, and integration points.

## Table of Contents

1. [Global Functions](#global-functions)
2. [State Management API](#state-management-api)
3. [System Operations API](#system-operations-api)
4. [Canvas Drawing API](#canvas-drawing-api)
5. [File Operations API](#file-operations-api)
6. [UI Handler API](#ui-handler-api)
7. [Utility Functions](#utility-functions)
8. [Data Formats](#data-formats)
9. [Event System](#event-system)
10. [Constants and Enums](#constants-and-enums)

---

## Global Functions

### Application Initialization

#### `initApp()`
Initializes the entire application.
```javascript
initApp()
```
**Returns**: `void`  
**Side Effects**: 
- Initializes canvas contexts
- Sets up UI event handlers
- Creates initial state
- Loads test data if empty

#### `initAppState()`
Resets application state to defaults.
```javascript
initAppState()
```
**Returns**: `void`  
**Side Effects**: Clears selections, resets flags, initializes history

---

## State Management API

### State Operations

#### `saveState(description, groupWithPrevious, forceEmpty, metadata)`
Saves current state for undo/redo.
```javascript
saveState(description, groupWithPrevious, forceEmpty, metadata)
```
**Parameters**:
- `description` (string): Action description
- `groupWithPrevious` (boolean): Group with previous action
- `forceEmpty` (boolean): Force save even if empty
- `metadata` (object): Additional state information

**Returns**: `void`

#### `undo()`
Reverts to previous state.
```javascript
undo()
```
**Returns**: `void`  
**Side Effects**: Updates map data, redraws canvas

#### `redo()`
Reapplies undone state.
```javascript
redo()
```
**Returns**: `void`  
**Side Effects**: Updates map data, redraws canvas

#### `clearMapData()`
Clears all map data and resets state.
```javascript
clearMapData()
```
**Returns**: `void`

### State Access

#### `updateTopBarInfo()`
Updates filename and save status display.
```javascript
updateTopBarInfo()
```
**Returns**: `void`

#### `initResourceFilterState()`
Initializes resource filter checkboxes.
```javascript
initResourceFilterState()
```
**Returns**: `void`

---

## System Operations API

### System CRUD

#### `createNewSystem()`
Creates system at current mouse position.
```javascript
createNewSystem()
```
**Returns**: `void`  
**Side Effects**: Adds system to mapData, saves state

#### `createNewSystemAtCoords(x, y)`
Creates system at specific coordinates.
```javascript
createNewSystemAtCoords(x, y)
```
**Parameters**:
- `x` (number): X coordinate
- `y` (number): Y coordinate

**Returns**: `object` - New system object

#### `deleteSelectedSystems()`
Deletes all selected systems.
```javascript
deleteSelectedSystems()
```
**Returns**: `void`  
**Side Effects**: Removes systems, cleans links

#### `copySelectedSystem()`
Copies first selected system to clipboard.
```javascript
copySelectedSystem()
```
**Returns**: `void`

#### `pasteSystem()`
Pastes system from clipboard at cursor.
```javascript
pasteSystem()
```
**Returns**: `void`

### System Modification

#### `moveSelectedSystems(deltaX, deltaY)`
Moves selected systems by offset.
```javascript
moveSelectedSystems(deltaX, deltaY)
```
**Parameters**:
- `deltaX` (number): X offset
- `deltaY` (number): Y offset

**Returns**: `void`

#### `toggleSystemLock(system)`
Toggles lock status of system.
```javascript
toggleSystemLock(system)
```
**Parameters**:
- `system` (object): System to toggle

**Returns**: `void`

#### `cycleSystemFaction(system)`
Cycles through faction assignments.
```javascript
cycleSystemFaction(system)
```
**Parameters**:
- `system` (object): System to modify

**Returns**: `void`

### Star Operations

#### `addStar(system)`
Adds star to system (max 3).
```javascript
addStar(system)
```
**Parameters**:
- `system` (object): Target system

**Returns**: `void`

#### `removeStar(system, starIndex)`
Removes star from system.
```javascript
removeStar(system, starIndex)
```
**Parameters**:
- `system` (object): Target system
- `starIndex` (number): Index to remove

**Returns**: `void`

### Planet Operations

#### `addPlanet(system)`
Adds planet to system.
```javascript
addPlanet(system)
```
**Parameters**:
- `system` (object): Target system

**Returns**: `void`

#### `removePlanet(system, planetIndex)`
Removes planet from system.
```javascript
removePlanet(system, planetIndex)
```
**Parameters**:
- `system` (object): Target system
- `planetIndex` (number): Index to remove

**Returns**: `void`

### Advanced Operations

#### `generateRegionalPlanetDistribution()`
Generates planets for selected systems.
```javascript
generateRegionalPlanetDistribution()
```
**Returns**: `void`  
**Algorithm**: Creates KING/Core systems, assigns stars/planets

#### `applyResourceRichnessFalloff(systems, curveType, falloffAmount)`
Applies distance-based resource richness.
```javascript
applyResourceRichnessFalloff(systems, curveType, falloffAmount)
```
**Parameters**:
- `systems` (array): Systems to modify
- `curveType` (string): "linear", "exponential", "logarithmic", "fibonacci"
- `falloffAmount` (number): 0-1 reduction factor

**Returns**: `void`

---

## Canvas Drawing API

### Canvas Management

#### `initCanvas()`
Initializes canvas contexts.
```javascript
initCanvas()
```
**Returns**: `void`

#### `updateCanvasSize()`
Updates canvas dimensions.
```javascript
updateCanvasSize()
```
**Returns**: `void`

#### `setupHighDPICanvas(canvas, context)`
Configures high-DPI support.
```javascript
setupHighDPICanvas(canvas, context)
```
**Parameters**:
- `canvas` (HTMLCanvasElement): Target canvas
- `context` (CanvasRenderingContext2D): Canvas context

**Returns**: `void`

### Drawing Functions

#### `drawGalaxyMap()`
Main galaxy rendering function.
```javascript
drawGalaxyMap()
```
**Returns**: `void`  
**Draws**: Grid, regions, links, systems, labels

#### `drawSystem(system, x, y)`
Draws individual system.
```javascript
drawSystem(system, x, y)
```
**Parameters**:
- `system` (object): System to draw
- `x` (number): Screen X coordinate
- `y` (number): Screen Y coordinate

**Returns**: `void`

#### `drawSystemPreview(system)`
Draws system detail view.
```javascript
drawSystemPreview(system)
```
**Parameters**:
- `system` (object|null): System to preview

**Returns**: `void`

### Specialized Drawing

#### `drawGrid()`
Draws background grid.
```javascript
drawGrid()
```
**Returns**: `void`

#### `drawResourceHeatmap()`
Draws resource density overlay.
```javascript
drawResourceHeatmap()
```
**Returns**: `void`

#### `drawRegions()`
Draws region boundaries and labels.
```javascript
drawRegions()
```
**Returns**: `void`

#### `drawKingSystemStar(x, y, size, faction)`
Draws KING system indicator.
```javascript
drawKingSystemStar(x, y, size, faction)
```
**Parameters**:
- `x` (number): Center X
- `y` (number): Center Y
- `size` (number): Star size
- `faction` (string): Faction for color

**Returns**: `void`

---

## File Operations API

### File Management

#### `newMap()`
Creates new empty map.
```javascript
newMap()
```
**Returns**: `void`

#### `importMap()`
Opens file picker for import.
```javascript
importMap()
```
**Returns**: `void`  
**Async**: File reading operation

#### `exportMap()`
Downloads current map as JSON.
```javascript
exportMap()
```
**Returns**: `void`

#### `loadMapData(importData)`
Loads map from imported data.
```javascript
loadMapData(importData)
```
**Parameters**:
- `importData` (object|array): Imported map data

**Returns**: `void`

#### `fixFactionData()`
Migrates old faction format.
```javascript
fixFactionData()
```
**Returns**: `number` - Count of fixed systems

---

## UI Handler API

### UI Initialization

#### `initUI()`
Initializes all UI elements.
```javascript
initUI()
```
**Returns**: `void`

#### `initCanvasHandlers()`
Sets up canvas event handlers.
```javascript
initCanvasHandlers()
```
**Returns**: `void`

### Display Functions

#### `displaySystemDetails(systems)`
Updates details panel.
```javascript
displaySystemDetails(systems)
```
**Parameters**:
- `systems` (array|null): Selected systems

**Returns**: `void`

#### `updateHistoryPanel()`
Refreshes history list.
```javascript
updateHistoryPanel()
```
**Returns**: `void`

#### `updateSystemCount()`
Updates system statistics.
```javascript
updateSystemCount()
```
**Returns**: `void`

### Modal Functions

#### `showResourceModal(planet, onSave)`
Shows resource editor.
```javascript
showResourceModal(planet, onSave)
```
**Parameters**:
- `planet` (object): Planet to edit
- `onSave` (function): Callback on save

**Returns**: `void`

#### `showHelpModal()`
Shows keyboard shortcuts.
```javascript
showHelpModal()
```
**Returns**: `void`

#### `showCreateRegionModal()`
Shows region creation dialog.
```javascript
showCreateRegionModal()
```
**Returns**: `void`

---

## Utility Functions

### Color Utilities

#### `getStarColor(star)`
Gets color for star type.
```javascript
getStarColor(star)
```
**Parameters**:
- `star` (object): Star object

**Returns**: `string` - Hex color

#### `getPlanetColor(typeNameOrId)`
Gets color for planet type.
```javascript
getPlanetColor(typeNameOrId)
```
**Parameters**:
- `typeNameOrId` (string|number): Type identifier

**Returns**: `string` - Hex color

#### `getFactionColor(faction)`
Gets faction color.
```javascript
getFactionColor(faction)
```
**Parameters**:
- `faction` (string): Faction name

**Returns**: `string` - Hex color

### Coordinate Utilities

#### `screenToMapCoords(screenX, screenY)`
Converts screen to map coordinates.
```javascript
screenToMapCoords(screenX, screenY)
```
**Parameters**:
- `screenX` (number): Screen X
- `screenY` (number): Screen Y

**Returns**: `{x: number, y: number}`

#### `findSystemAtCoords(canvasX, canvasY)`
Finds system at coordinates.
```javascript
findSystemAtCoords(canvasX, canvasY)
```
**Parameters**:
- `canvasX` (number): Canvas X
- `canvasY` (number): Canvas Y

**Returns**: `object|null` - System or null

### Geometry Utilities

#### `calculateConvexHull(points)`
Calculates convex hull of points.
```javascript
calculateConvexHull(points)
```
**Parameters**:
- `points` (array): Array of {x, y} points

**Returns**: `array` - Hull points

#### `calculatePolygonArea(vertices)`
Calculates polygon area.
```javascript
calculatePolygonArea(vertices)
```
**Parameters**:
- `vertices` (array): Array of {x, y} vertices

**Returns**: `number` - Area

### Data Utilities

#### `deepCopy(obj)`
Creates deep copy of object.
```javascript
deepCopy(obj)
```
**Parameters**:
- `obj` (any): Object to copy

**Returns**: `any` - Deep copy

#### `getDefaultResourcesForPlanetType(planetTypeName)`
Gets default resources for type.
```javascript
getDefaultResourcesForPlanetType(planetTypeName)
```
**Parameters**:
- `planetTypeName` (string): Planet type name

**Returns**: `array` - Resource array

---

## Data Formats

### System Object
```javascript
{
    key: "sys-1234567890",
    name: "System Name",
    coordinates: [x, y],
    faction: "MUD"|"ONI"|"UST"|null,
    isCore: boolean,
    isKing: boolean,
    isLocked: boolean,
    regionId: "region-id",
    stars: [...],
    planets: [...],
    links: [...]
}
```

### Star Object
```javascript
{
    name: "Star Name",
    type: 0-19,
    scale: 0.1-3.0
}
```

### Planet Object
```javascript
{
    name: "Planet Name",
    type: 0-23,
    orbit: 1-6,
    angle: 0-359,
    scale: 0.1-2.0,
    resources: [...]
}
```

### Resource Object
```javascript
{
    type: 0-85,
    name: "Resource Name",
    richness: 1-5
}
```

### Region Object
```javascript
{
    id: "region-id",
    name: "Region Name",
    color: "#hexcolor"
}
```

### Export Format
```javascript
{
    title: "Map Title",
    mapData: [...systems],
    regionDefinitions: [...regions]
}
```

---

## Event System

### Canvas Events

#### Mouse Events
```javascript
canvas.addEventListener('mousedown', handleCanvasMouseDown);
canvas.addEventListener('mousemove', handleCanvasMouseMove);
canvas.addEventListener('mouseup', handleCanvasMouseUp);
canvas.addEventListener('wheel', handleCanvasWheel);
canvas.addEventListener('contextmenu', e => e.preventDefault());
```

#### Keyboard Events
```javascript
document.addEventListener('keydown', handleCanvasKeyDown);
document.addEventListener('keyup', handleCanvasKeyUp);
```

### Custom Events

The application doesn't use custom events but relies on direct function calls for state changes.

### Event Handlers

#### `handleCanvasMouseDown(event)`
Handles mouse down on canvas.
- Left click: Selection
- Right click: Pan start
- Shift: Multi-select
- Ctrl: Selection box

#### `handleCanvasMouseMove(event)`
Handles mouse movement.
- Updates coordinates
- Handles dragging
- Updates hover state

#### `handleCanvasKeyDown(event)`
Handles keyboard input.
- Navigation keys
- Selection shortcuts
- Editing commands

---

## Constants and Enums

### From models.js

#### `STAR_TYPES`
Array of 20 star type definitions.
```javascript
const STAR_TYPES = [
    { type: 0, name: "White Dwarf" },
    // ... 19 more
];
```

#### `PLANET_TYPES`
Array of 24 planet types (8 per faction).
```javascript
const PLANET_TYPES = [
    { type: 0, name: "ONI Terrestrial Planet", defaultScale: 0.3, faction: "ONI" },
    // ... 23 more
];
```

#### `RESOURCE_TYPES`
Array of 86 resource definitions.
```javascript
const RESOURCE_TYPES = [
    { type: 0, name: "Abyssal Chromite", richness: 1, planetTypes: [...] },
    // ... 85 more
];
```

#### `REGION_COLORS`
Predefined region colors.
```javascript
const REGION_COLORS = [
    '#FF5733', '#33FF57', '#3357FF', // ... 9 more
];
```

#### `GALAXY_GRID_SPACING`
Grid unit size.
```javascript
const GALAXY_GRID_SPACING = 1;
```

### From main.js

#### `MAX_HISTORY_SIZE`
Maximum undo/redo entries.
```javascript
const MAX_HISTORY_SIZE = 50;
```

---

## Integration Examples

### Creating a System Programmatically
```javascript
// Create system at specific location
const newSystem = createNewSystemAtCoords(10, 20);

// Modify properties
newSystem.name = "Custom System";
newSystem.faction = "MUD";

// Add a star
addStar(newSystem);
newSystem.stars[0].type = 3; // Hot Blue

// Add a planet
addPlanet(newSystem);
newSystem.planets[0].type = 12; // MUD Gas Giant

// Save state
saveState("Created custom system");

// Redraw
drawGalaxyMap();
```

### Batch Operations
```javascript
// Select all MUD systems
selectedSystems = mapData.filter(sys => sys.faction === "MUD");

// Apply resource richness falloff
applyResourceRichnessFalloff(selectedSystems, "exponential", 0.5);

// Update UI
displaySystemDetails(selectedSystems);
updateSystemCount();
```

### Custom Import
```javascript
// Prepare custom data
const customData = {
    title: "My Custom Map",
    mapData: [
        {
            key: "sys-custom-1",
            name: "Custom System 1",
            coordinates: [0, 0],
            // ... other properties
        }
    ],
    regionDefinitions: []
};

// Load the data
loadMapData(customData);

// Update view
centerMapView();
drawGalaxyMap();
```
