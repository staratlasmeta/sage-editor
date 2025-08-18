# Feature Guide

This document provides detailed information about all features in the SAGE Map Editor, including implementation details and usage instructions.

## Table of Contents

1. [System Management](#system-management)
2. [Star and Planet Management](#star-and-planet-management)
3. [Resource Management](#resource-management)
4. [Region Management](#region-management)
5. [Link Management](#link-management)
6. [Faction Features](#faction-features)
7. [Advanced Features](#advanced-features)
8. [Import/Export](#importexport)
9. [History and Undo/Redo](#history-and-undoredo)
10. [Visualization Features](#visualization-features)

---

## System Management

### Creating Systems

#### Manual Creation
Click "New System" button or press at cursor position.
```javascript
// Implementation in system-operations.js
function createNewSystem() {
    const mapCoords = screenToMapCoords(mouseX, mouseY);
    // Applies grid snapping if enabled
    // Generates unique key and sequential name
    // Auto-selects new system
}
```

#### Batch Creation
Use Regional Distribution for multiple systems at once.

### System Properties

#### Basic Properties
- **Name**: User-defined or auto-generated
- **Coordinates**: X, Y position on map
- **Faction**: MUD, ONI, UST, or neutral
- **Locked**: Prevents modifications

#### Advanced Properties
- **Core Status**: Important faction systems
- **KING Status**: Most connected hub systems
- **Region**: Grouping assignment

### System Selection

#### Selection Methods
1. **Click**: Select single system
2. **Shift+Click**: Add/remove from selection
3. **Ctrl+Drag**: Box selection
4. **Ctrl+A**: Select all systems

#### Multi-Selection Features
- View aggregate statistics
- Bulk operations (delete, region assignment)
- Generate regional distribution
- Apply resource richness

### System Operations

#### Move Systems
- Drag selected systems
- Respects locked systems
- Grid snapping option
- Undo support

#### Copy/Paste
```javascript
// Copy stores system data
systemClipboard = deepCopy(selectedSystems[0]);
// Paste creates new system with new key
```

#### Delete Systems
- Removes selected systems
- Cleans up links automatically
- Respects locked systems
- Confirmation for multiple systems

---

## Star and Planet Management

### Star Management

#### Adding Stars
1. Select system
2. Click "Add Star" in details panel
3. Maximum 3 stars per system

#### Star Properties
- **Name**: Custom or auto-generated
- **Type**: 20 different types available
- **Scale**: Size multiplier (0.1-3.0)

#### Star Colors
Automatically assigned by type:
- Red Dwarf: #FF6347
- White Dwarf: #F0F8FF
- Solar/Yellow: #FFD700
- Hot Blue: #ADD8E6
- Red Giant: #DC143C

### Planet Management

#### Adding Planets
1. Select system
2. Click "Add Planet" in details panel
3. Choose type from dropdown

#### Planet Properties
- **Name**: Custom or auto-generated
- **Type**: Faction-specific (8 per faction)
- **Orbit**: Distance from star (1-6)
- **Angle**: Position in orbit (0-359°)
- **Scale**: Size multiplier

#### Planet Types by Tier
1. **Tier 1**: Terrestrial, Barren
2. **Tier 2**: Volcanic, Asteroid Belt
3. **Tier 3**: Gas Giant, Oceanic
4. **Tier 4**: Ice Giant
5. **Tier 5**: Dark Planet

---

## Resource Management

### Resource System Overview
- 86 different resources
- Planet-type specific
- Richness levels 1-5
- Faction-archetype combinations

### Adding Resources

#### Manual Addition
1. Click "Edit Resources" on planet
2. Select from available resources
3. Resources filtered by planet type

#### Automatic Assignment
Regional Distribution assigns default resources based on:
- Planet faction
- Planet archetype
- Predefined resource pools

### Resource Properties
```javascript
{
    type: 32,           // Resource ID
    name: "Iron Ore",   // Display name
    richness: 3         // 1-5 scale
}
```

### Resource Richness

#### Richness Levels
1. **Poor**: Minimal deposits
2. **Common**: Standard abundance
3. **Abundant**: Above average
4. **Rich**: High concentration
5. **Pristine**: Maximum quality

#### Richness Falloff
Apply distance-based richness reduction:
- **Linear**: Steady decrease
- **Exponential**: Rapid falloff
- **Logarithmic**: Gradual reduction
- **Fibonacci**: Natural curve

---

## Region Management

### Creating Regions

#### Process
1. Click "Create Region"
2. Enter region name
3. Select color
4. Systems can be added later

#### Region Properties
```javascript
{
    id: "region-xxx",
    name: "Central Hub",
    color: "#FF5733"
}
```

### Region Assignment

#### Adding Systems
1. Select systems
2. Click "Add to Region"
3. Choose target region

#### Removing Systems
1. Select systems
2. Click "Remove from Region"
3. Confirms removal

### Region Visualization

#### Display Options
- **Polygon**: Convex hull boundary
- **Blob**: Grid-based fill
- **Indicators**: Circles around systems
- **Labels**: Name and statistics

#### Statistics Shown
- System count
- Core system count
- KING system count
- Total area
- Average distance

---

## Link Management

### Creating Links

#### Manual Linking
1. Click "Link" button or press L
2. Click source system
3. Click target system
4. ESC to cancel

#### Right-Click Linking
1. Right-click and hold on system
2. Drag to target system
3. Release to create link

### Link Properties
- Bidirectional connections
- Stored as system key arrays
- Visual line between systems
- Highlighted when selected

### Link Operations
- Cannot link system to itself
- Duplicate links prevented
- Links removed with systems
- Links preserved in copy/paste

---

## Faction Features

### Faction System
Three main factions plus neutral:
- **MUD**: Orange-red (#FF5722)
- **ONI**: Blue (#2196F3)
- **UST/USTUR**: Amber (#FFC107)
- **Neutral**: Gray (#CCCCCC)

### Faction Assignment

#### Manual
1. Select system
2. Choose faction from dropdown
3. Or cycle with keyboard shortcut

#### Automatic
Regional Distribution assigns factions based on:
- Existing nearby systems
- Random distribution
- Weighted probabilities

### Faction Visualization

#### Faction Areas
Toggle "Faction Area" to see:
- Territory boundaries
- System counts
- Area calculations
- Faction statistics panel

#### Visual Indicators
- System color coding
- Faction labels
- Statistics in details panel

---

## Advanced Features

### Regional Planet Distribution

#### Overview
Automated system generation for regions.

#### Process
1. Select multiple systems
2. Click "Generate Distribution"
3. Systems renamed and populated

#### Generation Rules
- **KING Systems**: Most connected, 6-8 planets
- **Core Systems**: 30-60%, 4-6 planets  
- **Regular Systems**: Remainder, 2-4 planets

#### Naming Convention
`[REGION]-[FACTION]-[TYPE]-[NUMBER]`
Example: `CEN-MUD-KING-01`

### Resource Heatmap

#### Activation
Available in view options or debug mode.

#### Visualization
- Gradient overlay on map
- Red: High resource density
- Blue: Low resource density
- Based on total richness

### System Locking

#### Purpose
Prevent accidental modifications to finalized systems.

#### Lock Features
- Cannot move locked systems
- Cannot edit properties
- Cannot delete
- Visual indicator (lock icon)

#### Operations
- Select systems and click "Lock"
- Unlock with "Unlock" button
- "Lock All" for entire map

---

## Import/Export

### Export Features

#### File Format
JSON with pretty printing:
```json
{
    "title": "My Galaxy Map",
    "mapData": [...],
    "regionDefinitions": [...]
}
```

#### Export Process
1. Click "Export"
2. Automatic download
3. Preserves all data
4. Human-readable format

### Import Features

#### Supported Formats
- Current format (with regions)
- Legacy format (systems only)
- Automatic migration

#### Import Process
1. Click "Import"
2. Select JSON file
3. Data validation
4. Format conversion if needed

#### Migration Handling
Automatic conversions:
- `star` → `stars` array
- `closestFaction` → `faction`
- Object types → numeric IDs
- Missing properties added

---

## History and Undo/Redo

### History System

#### Implementation
```javascript
historyStack = [{
    description: "Action name",
    timestamp: Date,
    state: deepCopy(mapData),
    metadata: {...}
}];
```

#### Features
- 50 action limit
- Grouped actions
- Timestamps
- State snapshots

### Undo/Redo Operations

#### Undo (Ctrl+Z)
- Reverts last action
- Preserves selection when possible
- Updates all UI elements
- Moves state to redo stack

#### Redo (Ctrl+Y)
- Reapplies undone action
- Maintains consistency
- Full state restoration

### History Panel

#### Display
- Chronological list
- Action descriptions
- Time stamps
- Current state indicator

#### Interaction
- Click to jump to state
- Visual feedback
- Grouped actions shown together

---

## Visualization Features

### Grid System

#### Grid Display
- Toggle with "Grid" button
- 1-unit spacing
- Light gray lines
- Helps with alignment

#### Snap to Grid
- Toggle with "Snap" button
- Forces positions to grid points
- Useful for organized layouts

### Zoom and Pan

#### Zoom Controls
- Mouse wheel: Zoom at cursor
- +/- keys: Zoom center
- Reset View: Return to default

#### Pan Controls
- Right-click drag: Pan view
- Arrow keys: Directional pan
- Smooth movement

### System Size

#### Size Multiplier
Cycles through: 0.25x → 0.5x → 1.0x → 1.5x → 2.0x

#### Visual Impact
- Affects all system circles
- Maintains relative sizes
- Updates immediately

### Search and Filter

#### System Search
- Real-time filtering
- Highlights matching systems
- Case-insensitive
- Name-based

#### Resource Filters
- Toggle resource visibility
- Group-based filtering
- Label options
- Regional display options

### Label Display Options

#### System Labels
- System name
- Faction (MUD/ONI/UST)
- Planet count (P:X)
- Star count (S:X)
- Lock status
- KING status

#### Regional Labels
- Region name
- System count
- Core count
- KING count
- Area size
- Average distance

---

## Performance Features

### Optimization Strategies

#### Rendering
- Only visible systems drawn
- Viewport culling
- Batch operations
- Canvas clearing optimization

#### Memory Management
- Limited history (50 states)
- Efficient data structures
- Reference-based selection
- Cleanup of unused objects

#### Large Map Handling
- Efficient hit detection
- Optimized search algorithms
- Lazy loading potential
- Progressive rendering

### Best Practices

#### For Large Maps
1. Use regions for organization
2. Lock completed sections
3. Filter unnecessary elements
4. Work in sections

#### For Performance
1. Minimize selection size
2. Use batch operations
3. Clear history periodically
4. Disable unused visualizations

---

## Extension Points

### Adding New Features
1. Create module in `js/`
2. Hook into event system
3. Update state management
4. Add UI controls

### Customization Options
- Modify type definitions
- Add new resources
- Create custom filters
- Extend visualization

### Integration Possibilities
- Backend persistence
- Multiplayer editing
- Version control
- Data validation
