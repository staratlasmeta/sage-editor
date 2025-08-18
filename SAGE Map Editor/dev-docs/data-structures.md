# Data Structures

This document details all data structures used in the SAGE Map Editor, including their properties, relationships, and usage patterns.

## Table of Contents

1. [Core Data Structures](#core-data-structures)
2. [System Structure](#system-structure)
3. [Star Structure](#star-structure)
4. [Planet Structure](#planet-structure)
5. [Resource Structure](#resource-structure)
6. [Region Structure](#region-structure)
7. [State Management Structures](#state-management-structures)
8. [Import/Export Format](#importexport-format)

---

## Core Data Structures

### Map Data Array
The main data structure containing all star systems.
```javascript
mapData = [
    {
        // System object (see below)
    },
    // ... more systems
];
```

### System Lookup Object
Quick access to systems by key.
```javascript
systemLookup = {
    "sys-123456": { /* system object */ },
    "sys-789012": { /* system object */ },
    // ... more systems
};
```

---

## System Structure

A complete star system object with all properties:

```javascript
{
    // Identification
    key: "sys-1234567890",              // Unique system identifier
    name: "CEN-MUD-KING-01",           // System name
    
    // Position
    coordinates: [15.5, -23.75],        // [x, y] position on map
    
    // Faction & Status
    faction: "MUD",                     // "MUD", "ONI", "UST", or null
    isCore: false,                      // Core system status
    isKing: false,                      // KING system status (most connected)
    isLocked: false,                    // Prevents modifications
    
    // Region
    regionId: "region-123",             // Associated region ID
    
    // Celestial Bodies
    stars: [                            // Array of stars (1-3)
        {
            // Star object (see below)
        }
    ],
    planets: [                          // Array of planets
        {
            // Planet object (see below)
        }
    ],
    
    // Connections
    links: [                            // Array of linked system keys
        "sys-567890",
        "sys-234567"
    ]
}
```

### System Properties Explained

- **key**: Generated as `sys-${timestamp}` or imported
- **name**: User-defined or auto-generated (e.g., "System-1")
- **coordinates**: Float values, can be negative
- **faction**: Determines color and resource generation
- **isCore**: Visual indicator (crown shape) and better planet generation
- **isKing**: Most connected system in region (star shape)
- **isLocked**: Prevents editing/moving/deleting
- **regionId**: Links to region definition for grouping
- **links**: Bidirectional connections to other systems

---

## Star Structure

Stars within a system:

```javascript
{
    name: "Alpha Centauri A",           // Star name
    type: 2,                            // Index into STAR_TYPES array
    scale: 1.5                          // Size multiplier (0.1 - 3.0)
}
```

### Star Types Reference
From `models.js`:
```javascript
STAR_TYPES = [
    { type: 0, name: "White Dwarf" },
    { type: 1, name: "Red Dwarf" },
    { type: 2, name: "Solar" },
    { type: 3, name: "Hot Blue" },
    { type: 4, name: "Red Giant" },
    { type: 5, name: "Blue Giant" },
    { type: 6, name: "Blue Supergiant" },
    { type: 7, name: "Yellow Giant" },
    { type: 8, name: "Orange Dwarf" },
    { type: 9, name: "Brown Dwarf" },
    { type: 10, name: "Neutron Star" },
    { type: 11, name: "Black Hole" },
    { type: 12, name: "Pulsar" },
    { type: 13, name: "Binary Pulsar" },
    { type: 14, name: "Magnetar" },
    { type: 15, name: "Protostar" },
    { type: 16, name: "T Tauri" },
    { type: 17, name: "Wolf-Rayet" },
    { type: 18, name: "Cepheid Variable" },
    { type: 19, name: "Blue-White Dwarf" }
];
```

---

## Planet Structure

Planets orbiting within a system:

```javascript
{
    name: "Terra Prime",                // Planet name
    type: 8,                           // Index into PLANET_TYPES array
    orbit: 2.5,                        // Orbital distance (1-6 typical)
    angle: 45,                         // Orbital angle in degrees (0-359)
    scale: 0.8,                        // Size multiplier
    resources: [                       // Array of resources
        {
            // Resource object (see below)
        }
    ]
}
```

### Planet Types Reference
Each faction has 8 planet types:
```javascript
// Example for MUD faction
{ type: 8, name: "MUD Terrestrial Planet", defaultScale: 0.3, faction: "MUD" },
{ type: 9, name: "MUD Volcanic Planet", defaultScale: 0.2, faction: "MUD" },
{ type: 10, name: "MUD Barren Planet", defaultScale: 0.1, faction: "MUD" },
{ type: 11, name: "MUD System Asteroid Belt", defaultScale: 0.5, faction: "MUD" },
{ type: 12, name: "MUD Gas Giant", defaultScale: 0.4, faction: "MUD" },
{ type: 13, name: "MUD Ice Giant", defaultScale: 0.4, faction: "MUD" },
{ type: 14, name: "MUD Dark Planet", defaultScale: 0.3, faction: "MUD" },
{ type: 15, name: "MUD Oceanic Planet", defaultScale: 0.3, faction: "MUD" }
```

### Planet Tiers
Used for generation and balance:
```javascript
PLANET_TIERS = {
    "Terrestrial Planet": 1,    // Tier 1 (Basic)
    "Volcanic Planet": 2,       // Tier 2 (Common)
    "Barren Planet": 1,
    "System Asteroid Belt": 2,
    "Gas Giant": 3,            // Tier 3 (Uncommon)
    "Ice Giant": 4,            // Tier 4 (Rare)
    "Dark Planet": 5,          // Tier 5 (Epic)
    "Oceanic Planet": 3
}
```

---

## Resource Structure

Resources found on planets:

```javascript
{
    type: 32,                          // Index into RESOURCE_TYPES array
    name: "Iron Ore",                  // Resource name
    richness: 3                        // Abundance level (1-5)
}
```

### Resource Properties
From `models.js`:
```javascript
{
    type: 0,
    name: "Abyssal Chromite",
    richness: 1,                       // Base richness
    planetTypes: ["Oceanic Planet"]    // Valid planet types
}
```

### Richness Levels
- 1: Poor
- 2: Common
- 3: Abundant
- 4: Rich
- 5: Pristine

---

## Region Structure

Regions for grouping systems:

```javascript
{
    id: "region-1234567890",           // Unique region identifier
    name: "Central Hub",               // Display name
    color: "#FF5733"                   // Hex color for visualization
}
```

### Region Display State
Controls what's shown:
```javascript
regionDisplayState = {
    polygon: true,                     // Show boundary polygon
    name: true,                        // Show region name
    systemCount: true,                 // Show system count
    coreSystemCount: true,             // Show core system count
    area: true,                        // Show calculated area
    avgDistance: true                  // Show average distance
}
```

---

## State Management Structures

### History Entry
For undo/redo functionality:
```javascript
{
    description: "Moved System Alpha",  // Action description
    timestamp: Date,                    // When action occurred
    actionGroup: 1234567890,           // Group related actions
    state: [...],                      // Deep copy of mapData
    metadata: {                        // Additional context
        selectedKeys: ["sys-123"],
        prevSelectedKeys: ["sys-456"],
        isDragOperation: true
    }
}
```

### Filter State
Resource and display filters:
```javascript
resourceFilterState = {
    // Resources
    "Iron Ore": true,
    "Carbon": false,
    // ... all resources
    
    // Display options
    "Planets": true,
    "SystemName": true,
    "FactionLabel": true,
    "PlanetCount": true,
    "StarCount": true,
    "LockStatus": true,
    "KingStatus": true,
    
    // Regional options
    "RegionalPolygon": true,
    "RegionalBlob": false,
    "RegionalName": true,
    "RegionalSystems": true,
    "RegionalCore": true,
    "RegionalKing": true,
    "RegionalArea": true,
    "RegionalDistance": true,
    "RegionalIndicator": true
}
```

### View State
Camera and display settings:
```javascript
{
    scale: 5,                          // Zoom level
    offsetX: 400,                      // Pan X
    offsetY: 300,                      // Pan Y
    showGrid: true,                    // Grid display
    showSystemLabels: true,            // Label display
    showFactionArea: false,            // Faction visualization
    snapToGrid: false,                 // Grid snapping
    systemSizeMultiplier: 1.0          // System scale
}
```

---

## Import/Export Format

### Full Map Export
```javascript
{
    title: "My Galaxy Map",            // Optional map title
    mapData: [...],                    // Array of systems
    regionDefinitions: [...]           // Array of regions
}
```

### Legacy Format Support
The importer handles:
```javascript
// Old format (just array)
[...systems]

// New format (object)
{
    mapData: [...],
    regionDefinitions: [...]
}
```

### Migration Handling
Automatic conversions:
- `star` → `stars` array
- `closestFaction` → `faction`
- `location`/`polarCoordinates` → `orbit`/`angle`
- `hardness` → `richness`
- Object planet types → numeric IDs

---

## Relationships

### System Relationships
```
System ←→ System (via links array)
   ↓
 Stars
   ↓
Planets
   ↓
Resources
```

### Region Relationships
```
Region
   ↓
Systems (via regionId)
```

### State Relationships
```
mapData ←→ systemLookup (synchronized)
   ↓
selectedSystems (references to mapData objects)
   ↓
UI State (displays selected data)
```

---

## Data Constraints

### System Constraints
- Unique key required
- Coordinates must be [x, y] array
- Maximum 3 stars per system
- Links must reference valid system keys

### Planet Constraints
- Type must be valid PLANET_TYPES index
- Orbit typically 1-6 range
- Angle 0-359 degrees
- Resources must match planet type

### Resource Constraints
- Type must be valid RESOURCE_TYPES index
- Richness 1-5 range
- Must be appropriate for planet type

### Region Constraints
- Unique ID required
- Valid hex color string
- Systems can belong to only one region

---

## Best Practices

### Creating Systems
```javascript
const newSystem = {
    key: `sys-${Date.now()}`,
    name: `System-${systemCounter++}`,
    coordinates: [x, y],
    faction: null,
    stars: [{
        name: 'Solar',
        type: 2,
        scale: 1.0
    }],
    planets: [],
    links: [],
    isLocked: false
};
```

### Modifying Data
```javascript
// Always save state before modifications
saveState("Description of change");

// Make modifications
system.faction = "MUD";

// Update lookups if needed
systemLookup[system.key] = system;

// Redraw
drawGalaxyMap();
```

### Data Validation
```javascript
// Validate before operations
if (system && system.key && !system.isLocked) {
    // Safe to modify
}

// Check array bounds
if (planetType >= 0 && planetType < PLANET_TYPES.length) {
    // Valid planet type
}
```
