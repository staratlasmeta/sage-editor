# Module Reference

This document provides detailed documentation for each JavaScript module in the SAGE Map Editor.

## Table of Contents

1. [main.js - Application Entry Point](#mainjs)
2. [models.js - Data Models](#modelsjs)
3. [state.js - State Management](#statejs)
4. [canvas-drawing.js - Rendering Engine](#canvas-drawingjs)
5. [system-operations.js - System Logic](#system-operationsjs)
6. [ui-handlers.js - UI Management](#ui-handlersjs)
7. [file-operations.js - File I/O](#file-operationsjs)
8. [utils.js - Utilities](#utilsjs)
9. [helpers.js - Helper Functions](#helpersjs)

---

## main.js

**Purpose**: Application initialization and bootstrapping

### Key Functions

#### `initApp()`
Initializes the entire application.
```javascript
function initApp()
```
- Sets up device pixel ratio
- Initializes canvas and UI
- Sets up event handlers
- Creates initial app state
- Creates test data if map is empty

#### `initAppState()`
Initializes application state variables.
```javascript
function initAppState()
```
- Resets selection and interaction states
- Initializes resource filters
- Creates initial history entry

#### `createTestData()`
Creates sample star systems for development/testing.
```javascript
function createTestData()
```
- Creates 4 test systems with various properties
- Assigns test regions
- Sets up initial links between systems

### Global Constants
- `MAX_HISTORY_SIZE`: 50 (maximum undo/redo entries)

---

## models.js

**Purpose**: Data model definitions and constants

### Data Structures

#### Star Types
```javascript
const STAR_TYPES = [
    { type: 0, name: "White Dwarf" },
    { type: 1, name: "Red Dwarf" },
    // ... 20 total star types
];
```

#### Planet Types
```javascript
const PLANET_TYPES = [
    { type: 0, name: "ONI Terrestrial Planet", defaultScale: 0.3, faction: "ONI" },
    // ... 24 types per faction (ONI, MUD, USTUR)
];
```

#### Resource Types
```javascript
const RESOURCE_TYPES = [
    { type: 0, name: "Abyssal Chromite", richness: 1, planetTypes: ["Oceanic Planet"] },
    // ... 86 total resources
];
```

#### Other Constants
- `REGION_COLORS`: Array of 12 predefined region colors
- `GALAXY_GRID_SPACING`: 1 (grid unit size)
- `RESOURCE_COLORS`: Mapping of resource names to hex colors

---

## state.js

**Purpose**: Global state management and persistence

### State Variables

#### Map Data
- `mapData`: Array of all star systems
- `systemLookup`: Object mapping system keys to system objects
- `regionDefinitions`: Array of region definitions

#### View State
- `scale`: Current zoom level (default: 5)
- `offsetX`, `offsetY`: Pan offset (default: 400, 300)
- `currentView`: Always 'galaxy' in current version

#### Interaction State
- `selectedSystems`: Array of currently selected systems
- `hoveredSystem`: System under mouse cursor
- `draggedSystem`: System being dragged
- `isPanning`: Boolean for pan mode
- `isLinking`: Boolean for link creation mode

#### History State
- `historyStack`: Array of state snapshots for undo
- `redoStack`: Array of state snapshots for redo
- `lastActionGroup`: Group ID for related actions

### Key Functions

#### `saveState(description, groupWithPrevious, forceEmpty, metadata)`
Saves current state to history.
```javascript
function saveState(description = "Unknown Action", groupWithPrevious = false, forceEmpty = false, metadata = null)
```
- Creates optimized state snapshot
- Manages history stack size
- Handles action grouping

#### `undo()`
Reverts to previous state.
```javascript
function undo()
```
- Pops from history stack
- Pushes to redo stack
- Handles selection-only operations specially

#### `redo()`
Reapplies undone state.
```javascript
function redo()
```
- Pops from redo stack
- Pushes to history stack
- Maintains selection state

#### `clearMapData()`
Resets all map data.
```javascript
function clearMapData()
```
- Clears all systems and regions
- Resets counters and states
- Updates UI elements

---

## canvas-drawing.js

**Purpose**: All canvas rendering operations

### Canvas Management

#### `initCanvas()`
Initializes canvas contexts.
```javascript
function initCanvas()
```
- Sets up galaxy and preview canvases
- Configures high-DPI support
- Updates global references

#### `setupHighDPICanvas(canvas, context)`
Configures canvas for high-DPI displays.
```javascript
function setupHighDPICanvas(canvas, context)
```
- Scales canvas by device pixel ratio
- Maintains CSS size for proper display

### Rendering Functions

#### `drawGalaxyMap()`
Main rendering function for galaxy view.
```javascript
function drawGalaxyMap()
```
Rendering order:
1. Clear canvas
2. Draw grid (if enabled)
3. Draw resource heatmap (if enabled)
4. Draw regions
5. Draw links
6. Draw systems
7. Draw labels
8. Draw selection box

#### `drawSystem(system, x, y)`
Renders individual star system.
```javascript
function drawSystem(system, x, y)
```
- Draws based on system type (regular/core/king)
- Applies faction colors
- Handles hover and selection states

#### `drawSystemPreview(system)`
Renders detailed system view in preview panel.
```javascript
function drawSystemPreview(system)
```
- Draws stars with orbits
- Draws planets at correct positions
- Shows planet resources

### Special Visualizations

#### `drawResourceHeatmap()`
Renders resource density visualization.
```javascript
function drawResourceHeatmap()
```
- Creates gradient based on resource richness
- Overlays on galaxy map
- Debug mode available

#### `drawRegions()`
Renders region boundaries and labels.
```javascript
function drawRegions()
```
- Draws convex hulls or blob fills
- Shows region statistics
- Handles region indicators

---

## system-operations.js

**Purpose**: Core business logic for system manipulation

### System CRUD Operations

#### `createNewSystem()`
Creates system at current mouse position.
```javascript
function createNewSystem()
```
- Generates unique key and name
- Applies grid snapping if enabled
- Auto-selects new system

#### `deleteSelectedSystems()`
Removes selected systems from map.
```javascript
function deleteSelectedSystems()
```
- Handles link cleanup
- Prevents deletion of locked systems
- Updates region associations

#### `copySelectedSystem()` / `pasteSystem()`
System copy/paste functionality.
```javascript
function copySelectedSystem()
function pasteSystem()
```
- Deep copies system data
- Generates new keys on paste
- Preserves all properties except position

### System Modification

#### `moveSelectedSystems(deltaX, deltaY)`
Moves selected systems by offset.
```javascript
function moveSelectedSystems(deltaX, deltaY)
```
- Respects locked systems
- Applies grid snapping
- Updates system coordinates

#### `cycleSystemFaction(system)`
Cycles through faction assignments.
```javascript
function cycleSystemFaction(system)
```
Order: null → MUD → ONI → UST → null

### Advanced Operations

#### `generateRegionalPlanetDistribution()`
Bulk generates planets for selected systems.
```javascript
function generateRegionalPlanetDistribution()
```
Complex algorithm that:
- Identifies KING systems (most connected)
- Designates CORE systems (30-60%)
- Generates appropriate stars
- Creates tiered planets
- Assigns faction-specific resources

#### `showResourceRichnessModal()`
Applies resource richness falloff.
```javascript
function showResourceRichnessModal()
```
Curve options:
- Linear
- Exponential
- Logarithmic
- Fibonacci

---

## ui-handlers.js

**Purpose**: User interface event handling and management

### Initialization

#### `initUI()`
Sets up all UI elements and event listeners.
```javascript
function initUI()
```
- Gets DOM element references
- Attaches button event listeners
- Initializes search functionality
- Sets up keyboard shortcuts

### Event Handlers

#### `initCanvasHandlers()`
Sets up canvas interaction events.
```javascript
function initCanvasHandlers()
```
Handles:
- Mouse down/up/move
- Right-click context menu
- Wheel zoom
- Selection box
- System dragging

#### `handleCanvasKeyDown(e)` / `handleCanvasKeyUp(e)`
Keyboard event handling.
```javascript
function handleCanvasKeyDown(e)
function handleCanvasKeyUp(e)
```
Shortcuts:
- Ctrl+A: Select all
- Delete: Delete selected
- Ctrl+C/V: Copy/paste
- Ctrl+Z/Y: Undo/redo

### UI Updates

#### `displaySystemDetails(systems)`
Updates details panel content.
```javascript
function displaySystemDetails(systems)
```
- Single system: Full edit interface
- Multiple systems: Statistics and bulk operations
- No selection: Empty state

#### `updateHistoryPanel()`
Refreshes history list display.
```javascript
function updateHistoryPanel()
```
- Groups related actions
- Shows timestamps
- Highlights current state

### Modal Dialogs

#### `showResourceModal(planet, onSave)`
Resource editing interface.
```javascript
function showResourceModal(planet, onSave)
```
- Add/remove resources
- Filter by planet type
- Save callback

#### `showHelpModal()`
Displays keyboard shortcuts.
```javascript
function showHelpModal()
```
- Categorized shortcuts
- Navigation, selection, editing

---

## file-operations.js

**Purpose**: Import/export and file management

### File Operations

#### `newMap()`
Creates new empty map.
```javascript
function newMap()
```
- Clears existing data
- Initializes empty state
- Optionally creates default region

#### `importMap()`
Loads map from JSON file.
```javascript
function importMap()
```
- File picker interface
- JSON parsing
- Data migration for compatibility
- Format conversion

#### `exportMap()`
Saves map to JSON file.
```javascript
function exportMap()
```
- Includes systems and regions
- Pretty-printed JSON
- Automatic filename

### Data Migration

#### `loadMapData(importData)`
Processes imported data.
```javascript
function loadMapData(importData)
```
Handles:
- Legacy format conversion
- Property migrations
- System key generation
- Faction data fixes

---

## utils.js

**Purpose**: Utility functions used across modules

### Color Functions

#### `getStarColor(star)`
Returns color for star type.
```javascript
function getStarColor(star)
```

#### `getPlanetColor(typeNameOrId)`
Returns color for planet type.
```javascript
function getPlanetColor(typeNameOrId)
```

#### `getFactionColor(faction)`
Returns faction-specific color.
```javascript
function getFactionColor(faction)
```
- MUD: #FF5722 (orange-red)
- ONI: #2196F3 (blue)
- UST/USTUR: #FFC107 (amber)

### Coordinate Functions

#### `screenToMapCoords(screenX, screenY)`
Converts screen to map coordinates.
```javascript
function screenToMapCoords(screenX, screenY)
```

#### `findSystemAtCoords(canvasX, canvasY)`
Hit detection for systems.
```javascript
function findSystemAtCoords(canvasX, canvasY)
```
- Uses 10-pixel click radius
- Returns nearest system

### Geometry Functions

#### `calculateConvexHull(points)`
Graham scan algorithm for convex hull.
```javascript
function calculateConvexHull(points)
```

#### `calculatePolygonArea(vertices)`
Shoelace formula for area calculation.
```javascript
function calculatePolygonArea(vertices)
```

### Data Functions

#### `deepCopy(data)`
Creates deep copy via JSON.
```javascript
function deepCopy(data)
```

#### `getDefaultResourcesForPlanetType(planetTypeName)`
Returns default resources by type.
```javascript
function getDefaultResourcesForPlanetType(planetTypeName)
```

---

## helpers.js

**Purpose**: Additional helper functions (legacy, being refactored)

### Duplicate Functions
Many functions in helpers.js duplicate functionality from utils.js. This module is being phased out, with functions being consolidated into utils.js.

### Unique Functions

#### `rebuildSystemLookup()`
Rebuilds system lookup table.
```javascript
function rebuildSystemLookup()
```
- Recreates systemLookup from mapData
- Used after import or state changes

#### `getAllSystemResources(system)`
Gets unique resources in system.
```javascript
function getAllSystemResources(system)
```
- Aggregates from all planets
- Returns array with richness info

---

## Module Communication

### Event Flow
```
User Input → ui-handlers → system-operations → state → canvas-drawing
                ↓                                ↓
           file-operations                    utils
```

### Data Flow
```
models → state → all modules
         ↓
      helpers/utils
```

### Common Patterns

1. **State Updates**
   ```javascript
   // Make changes
   modifySystem(system);
   // Save state
   saveState("Modified system");
   // Update UI
   drawGalaxyMap();
   displaySystemDetails(selectedSystems);
   ```

2. **Coordinate Transformation**
   ```javascript
   const canvasCoords = getGalaxyCanvasCoords(event);
   const mapCoords = screenToMapCoords(canvasCoords.x, canvasCoords.y);
   const system = findSystemAtCoords(canvasCoords.x, canvasCoords.y);
   ```

3. **System Iteration**
   ```javascript
   mapData.forEach(system => {
       if (system.faction === targetFaction) {
           // Process system
       }
   });
   ```
