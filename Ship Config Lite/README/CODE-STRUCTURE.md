# Ship Config Lite - Code Structure & Architecture

## Overview

Ship Config Lite is built with vanilla JavaScript using a modular architecture. The application is split into specialized modules that handle different aspects of functionality while sharing common data structures.

## Core Architecture

### Data Flow
```
Components JSON → Component Tree → UI Components → Ship Configurations → Stat Calculations → Display
        ↓              ↓                ↓                   ↓                    ↓              ↓
   Ship Stats CSV → Ships Array → Ship Selection → Config Management → Modified Stats → Comparison Table
```

### Global State Management

The application uses several global variables for state management:

```javascript
// Core data structures
let ships = [];                    // Array of all available ships from CSV
let components = null;             // Component tree from JSON
let shipConfigurations = {};       // Configurations keyed by ship identifier
let addedShips = [];              // Ships currently in comparison table
let activeConfigIndices = {};      // Active config per ship instance

// Component organization
let componentCategories = {        // Component types by category
    "Ship Component": [],
    "Ship Module": [],
    "Ship Weapons": [],
    "Countermeasures": [],
    "Missiles": [],
    "Drones": []
};

// UI state
let componentsLoaded = false;      // Component loading status
let copiedConfiguration = null;    // Clipboard for copy/paste
let attributesPanelLocked = false; // Panel lock state
```

## Module System

### Core Modules

#### app.js (Main Application)
- **Purpose**: Core application logic and initialization
- **Key Functions**:
  - `initApp()`: Initialize application on DOM ready
  - `extractComponentCategories()`: Process component tree structure
  - `calculateModifiedStats()`: Calculate stat modifications from components
  - `getShipIdentifier()`: Generate unique ship identifiers
  - `initThemeToggle()`: Handle theme switching
- **Dependencies**: All other modules depend on app.js

#### comparison-table.js
- **Purpose**: Manage the ship comparison table
- **Key Functions**:
  - `updateComparisonTable()`: Main table rendering function
  - `addShipColumn()`: Add new ship to comparison
  - `removeShipColumn()`: Remove ship from comparison
  - `generateShipColumnHTML()`: Create ship column HTML
  - `formatStatValue()`: Format stat values for display
- **Dependencies**: app.js, ship-scoring.js

#### component-management.js
- **Purpose**: Handle component compatibility and selection
- **Key Functions**:
  - `getCompatibleComponents()`: Filter components by ship class
  - `isComponentCompatibleWithShip()`: Check compatibility
  - `findComponentById()`: Locate component in tree
  - `createComponentSlot()`: Generate component UI slot
  - `updateComponentInConfiguration()`: Update config with component changes
- **Dependencies**: app.js

#### config-management.js
- **Purpose**: Configuration CRUD operations
- **Key Functions**:
  - `addConfiguration()`: Create new configuration
  - `deleteConfiguration()`: Remove configuration
  - `duplicateConfiguration()`: Clone existing config
  - `copyConfiguration()`: Copy to clipboard
  - `pasteConfiguration()`: Paste from clipboard
  - `renameConfiguration()`: Update config name
- **Dependencies**: app.js, comparison-table.js

### Feature Modules

#### config-pattern-builder.js
- **Purpose**: Pattern-based configuration generation
- **Key Functions**:
  - `initPatternBuilder()`: Initialize pattern system
  - `createNewPattern()`: Start new pattern
  - `executePatternAction()`: Apply pattern actions
  - `applyPattern()`: Generate config from pattern
  - `batchProcessAllPatterns()`: Bulk pattern application
- **Pattern Actions**:
  - `REMOVE_ALL`: Remove components by type
  - `CONVERT_SLOT`: Transform slot types
  - `FILL_EMPTY`: Auto-fill empty slots
  - `UPGRADE_TIER`: Increase component tiers
  - `SET_QUANTITY`: Set exact slot counts

#### file-io.js
- **Purpose**: Import/export functionality
- **Key Functions**:
  - `handleCsvUpload()`: Process ship stats CSV
  - `handleComponentsUpload()`: Load components JSON
  - `saveConfigurations()`: Export configs to JSON
  - `loadConfigurations()`: Import saved configs
  - `parseCSV()`: Parse CSV data
  - `importCsvConfiguration()`: Import config from CSV
- **File Formats**:
  - Ship stats: CSV with headers
  - Components: Nested JSON tree
  - Configurations: JSON with ship configs

#### drone-scaling.js
- **Purpose**: Handle drone port capacity calculations
- **Key Functions**:
  - `getDronePortCapacity()`: Get capacity by size
  - `setDronePortCapacity()`: Update capacity values
  - `calculateDroneScaling()`: Scale drone stats
  - `initDronePortCapacities()`: Load saved capacities
- **Storage**: Uses localStorage for persistence

## Data Structures

### Ship Object
```javascript
{
    id: 1,                        // Unique instance ID
    "Ship Name": "Ogrika Ruch",   // Ship name
    "Manufacturer": "Ogrika",     // Manufacturer name
    "Class": 1,                   // Size class (1-9)
    "Hull": 1000,                 // Base stats...
    "Shield": 500,
    // ... other stats
}
```

### Configuration Object
```javascript
{
    name: "Mining Build",
    components: {
        "Ship Component": {
            "Power Core": ["componentId1", "componentId2"],
            "Shield Generator": ["componentId3"],
            // ... other component types
        },
        "Ship Weapons": {
            "Energy": ["weaponId1", "weaponId2"],
            // ... other weapon types
        },
        // ... other categories
    }
}
```

### Component Node
```javascript
{
    id: "unique-id",
    name: "Component Name",
    properties: {
        "Category": "Ship Component",
        "Ship Component": "Power Core",
        "Class": "M",
        "Tier": "T3"
    },
    effects: {
        "Power": 100,
        "Heat": -20
    },
    children: []  // Sub-components
}
```

## Component Tree Structure

The component JSON follows a hierarchical structure:

```
Root (rewardTree)
├── Ship Component
│   ├── Power Core
│   │   ├── XXS
│   │   │   ├── T1
│   │   │   │   ├── T2
│   │   │   │   └── ...
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── Ship Weapons
│   ├── Energy (Damage Type)
│   │   ├── T1
│   │   │   ├── XXXS
│   │   │   │   ├── Rapidfire
│   │   │   │   ├── Cannon
│   │   │   │   └── ...
│   │   │   └── ...
│   │   └── ...
│   └── ...
└── ...
```

## Event Flow

### Adding a Ship
1. User clicks "Add Ship"
2. `addEmptyShipColumn()` called
3. Ship selector populated from `ships` array
4. User selects ship
5. `changeShipInComparison()` updates display
6. `updateComparisonTable()` refreshes view

### Modifying Configuration
1. User clicks "Edit Config"
2. `openComponentsPanel()` opens editor
3. Component changes trigger `updateComponentInConfiguration()`
4. Stats recalculated via `calculateModifiedStats()`
5. `updateComparisonTable()` updates display

### Pattern Application
1. User opens Pattern Builder
2. Creates/loads pattern with actions
3. `applyPattern()` executes actions sequentially
4. New configuration created
5. Table refreshes automatically

## Performance Optimizations

### Pending Changes System
- Defers table updates until user clicks refresh
- Tracks changes in `pendingChanges` Set
- Reduces recalculation overhead
- Optional Web Worker support for calculations

### Efficient Updates
- Partial table updates via `updateTableCell()`
- Component lookup map for O(1) access
- Cached stat calculations
- Throttled drag-and-drop updates

## Storage & Persistence

### LocalStorage Keys
- `shipConfigTheme`: User theme preference
- `shipConfigurations`: All saved configurations
- `dronePortCapacities`: Custom drone capacities
- `customAttributes`: User-defined attributes
- `savedPatterns`: Pattern builder patterns

### File Locations
- **Ship Data**: User-provided CSV
- **Components**: User-provided JSON
- **Saved Configs**: Downloads to user location
- **Default Save Path**: `/Saved/` directory

## Error Handling

### Validation Points
- Component compatibility checks
- Configuration integrity validation
- File format verification
- Pattern action validation
- Tier One requirement checks

### User Feedback
- Toast notifications for actions
- Modal alerts for errors
- Console logging for debugging
- Status indicators in UI

## Extension Points

### Adding New Features
1. Create new module in `/js/` directory
2. Define module interface
3. Add to index.html script includes
4. Hook into existing events
5. Update global state if needed

### Custom Components
- Extend component tree structure
- Add new category in `componentCategories`
- Update `extractComponentCategories()`
- Modify UI generation in components panel

### New Pattern Actions
1. Add action type to `PATTERN_ACTIONS`
2. Implement `execute[ActionName]()` function
3. Add UI in action dialog
4. Update `getActionDescription()`
5. Handle in `executePatternAction()`

## Best Practices

### Code Style
- Use descriptive function names
- Comment complex logic
- Maintain consistent indentation
- Group related functions
- Use early returns for validation

### Module Guidelines
- One primary purpose per module
- Minimize cross-module dependencies
- Export main functions to window
- Validate inputs
- Handle edge cases

### Performance Tips
- Use efficient selectors
- Cache DOM references
- Batch DOM updates
- Avoid deep object cloning
- Use requestAnimationFrame for animations 