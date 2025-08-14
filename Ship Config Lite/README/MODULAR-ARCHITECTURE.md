# Ship Config Lite - Modular Architecture

## Overview

We've successfully transitioned from a monolithic `app.js` file (7000+ lines) to a modular architecture where functionality is organized into separate, focused modules. This improves maintainability, readability, and makes collaboration easier.

## File Structure

```
Ship Config Lite/
├── index.html              # Main HTML file
├── styles.css              # All styles
├── README.md               # Project documentation
├── MODULAR-ARCHITECTURE.md # This file
├── CSV-IMPORT-README.md    # CSV import documentation
├── CLEANUP-SUMMARY.md      # Cleanup documentation
├── js/                     # JavaScript modules directory
│   ├── app.js              # Main application logic (3,842 lines)
│   ├── file-io.js          # File import/export operations
│   ├── config-management.js # Configuration management
│   ├── components-panel.js # Components panel UI and logic
│   ├── comparison-table.js # Comparison table rendering
│   ├── custom-ship-management.js # Custom ship creation
│   ├── config-upgrade.js   # Configuration upgrade functionality
│   ├── attributes-panel.js # Attributes panel for component editing
│   ├── analysis-tools.js   # Ship analysis and reporting tools
│   ├── ship-scoring.js     # Ship scoring calculations
│   ├── score-breakdown.js  # Score breakdown panel
│   ├── component-management.js # Component compatibility logic
│   ├── attribute-management.js # Custom attribute management
│   ├── table-updates.js    # Efficient table update methods
│   ├── drag-drop.js        # Drag and drop functionality
│   ├── config-pattern-builder.js # Pattern builder system
│   ├── batch-pattern-processor.js # Batch pattern processing
│   ├── pending-changes.js  # Performance optimization system
│   ├── drone-scaling.js    # Drone port capacity scaling
│   └── combat-simulator.js # Combat simulation system
│   └── module-template.js  # Template for new modules
├── Saved/                  # Saved configurations
└── old/                    # Archived files
```

## ✅ Completed Modules

### 1. Score Breakdown Module (`score-breakdown.js`)
**Status:** ✅ Complete

**Functions:**
- `showScoreBreakdownPanel(ship, modifiedStats, scores, allShips, focusCategory)`
- `hideScoreBreakdownPanel()`
- Helper functions for content generation

**Dependencies:** 
- `SCORE_CATEGORIES`, `getCategoryWeight()`, `calculateStatScore()`, `getScoreColor()`, etc.

### 2. Configuration Management Module (`config-management.js`)
**Status:** ✅ Complete

**Functions:**
- `addConfiguration(shipId, shipIdentifier, options)`
- `deleteConfiguration(shipId, configIndex, shipIdentifier)`
- `duplicateConfiguration(shipId, configIndex, shipIdentifier)`
- `renameConfiguration(shipId, configIndex, shipIdentifier)`
- `copyConfiguration(shipId, configIndex, shipIdentifier)`
- `pasteConfiguration(shipId, shipIdentifier)`

**Dependencies:**
- `addedShips`, `shipConfigurations`, `activeConfigIndices`, `updateComparisonTable()`

### 3. Component Management Module (`component-management.js`)
**Status:** ✅ Complete

**Functions:**
- `getCompatibleComponents(category, componentType, shipClass)`
- `isComponentMatchingType(component, category, componentType)`
- `isComponentCompatibleWithShip(component, compatibleClasses)`
- `getCompatibleClassSizes(shipClass)`
- `findComponentById(componentId)`
- `createComponentSlot()` (panel version)
- `duplicateComponentSlot(button)`
- `removeComponentSlot(button)`
- `updateComponentInConfiguration()`

**Dependencies:**
- `components`, `addedShips`, `shipConfigurations`, `updateStatsPreview()`

### 4. Attribute Management Module (`attribute-management.js`)
**Status:** ✅ Complete

**Functions:**
- `addCustomAttribute(attributeName, defaultValue)`
- `deleteCustomAttribute(attributeName)`
- `reorderAttributes(fromIndex, toIndex)`
- `initAttributeOrder()`
- `handleRowDragStart(e)`
- `handleRowDragOver(e)`
- `handleRowDrop(e)`
- `handleRowDragEnd(e)`
- `renameCustomAttribute(oldName, newName)`

**Dependencies:**
- `customAttributes`, `customAttributeOrder`, `statsFromCsv`, `ships`, `addedShips`

### 5. File I/O Module (`file-io.js`)
**Status:** ✅ Complete

**Functions:**
- `handleComponentsUpload(event)`
- `handleCsvUpload(event)`
- `parseCSV(csvText)`
- `saveConfigurations()`
- `loadConfigurations(event)`
- `extractStatsFromNewCsv(csvText)`

**Dependencies:**
- `ships`, `components`, `shipConfigurations`, `activeConfigIndices`

### 6. Drag and Drop Module (`drag-drop.js`)
**Status:** ✅ Complete

**Functions:**
- `initDragAndDrop()`
- `setupDragAndDrop(header, index)`
- `moveShipToNewPosition(fromIndex, toIndex)`
- `findDropTarget(clientX)`
- `highlightDropTarget(targetIndex, position)`

**Dependencies:**
- `addedShips`, `updateComparisonTable()`

### 7. Attributes Panel Module (`attributes-panel.js`)
**Status:** ✅ Complete

**Functions:**
- `openAttributesPanel(category)`
- `closeAttributesPanel()`
- `updateComponentGroupsList(category)`
- `selectComponentGroup(category, groupName)`
- `populateAttributesEditor(category, groupName)`
- `updateStatValue(category, groupName, statName, value)`
- `updateClassScalingFormula(category, formula)`
- `updateTierScalingFormula(category, formula)`
- `recalculateComponentValues(category, groupName, statName)`
- `evaluateFormula(formula, variables)`
- `openScalingFormulasPopup(category)`
- `closeScalingFormulasPopup()`

**Dependencies:**
- `currentCategory`, `currentComponentGroup`, `componentCategories`, `componentAttributes`, 
- `statsFromCsv`, `customAttributeOrder`, `classScalingFormulas`, `tierScalingFormulas`, 
- `addedShips`, `attributesPanelLocked`, `getRelevantStats()`, `closeComponentsPanel()`, `updateComparisonTable()`

### 8. Configuration Pattern Builder Module (`config-pattern-builder.js`)
**Status:** ✅ Complete

**Functions:**
- `initPatternBuilder()`
- `createNewPattern()`
- `executePatternAction(action, config, tierOneConfig, shipIdentifier)`
- `applyPattern(pattern, shipIdentifier, baseConfigIndex)`
- `getPreloadedPatterns()` / `getPreloadedPatternsPart2()`
- `savePatterns()` / `loadSavedPatterns()`
- `testPatternDryRun(pattern, shipIdentifier, configIndex)`

**Pattern Actions:**
- `REMOVE_ALL`, `CONVERT_SLOT`, `FILL_EMPTY`, `UPGRADE_TIER`, `SET_QUANTITY`, etc.

**Dependencies:**
- `shipConfigurations`, `addedShips`, `components`, `findComponentById()`, `addConfiguration()`, `updateComparisonTable()`

### 9. Batch Pattern Processor Module (`batch-pattern-processor.js`)
**Status:** ✅ Complete

**Functions:**
- `batchProcessAllPatterns()`
- `batchProcessAllShips()`
- `processPatternsForShip(ship, shipIdentifier, patterns)`
- `createProgressUI()` / `updateProgress()`
- `getPatternGenerationList()`

**Dependencies:**
- `addedShips`, `shipConfigurations`, `getShipIdentifier()`, `findTierOneConfig()`, `applyPattern()`

### 10. Pending Changes Module (`pending-changes.js`)
**Status:** ✅ Complete

**Functions:**
- `initPendingChanges()`
- `interceptUpdateFunction()`
- `addPendingChange(context)`
- `refreshTable()`
- `createRefreshButton()`
- `updateRefreshButton()`
- `processPendingChanges()`

**Features:**
- Deferred table updates for performance
- Web Worker support for calculations
- Visual refresh button with pending count

**Dependencies:**
- `updateComparisonTable()`, `addedShips`, `shipConfigurations`

### 11. Drone Scaling Module (`drone-scaling.js`)
**Status:** ✅ Complete

**Functions:**
- `initDronePortCapacities()`
- `getDronePortCapacity(className)`
- `setDronePortCapacity(className, capacity)`
- `openDronePortSettings()`
- `saveDronePortCapacities()`

**Storage:**
- Uses localStorage for persistence
- Default capacities: XXS=2, XS=4, S=8, M=12, L=16, etc.

**Dependencies:**
- `updateComparisonTable()`, localStorage API

### 12. Combat Simulator Module (`combat-simulator.js`)
**Status:** ✅ Complete

**Functions:**
- `initCombatSimulator()`
- `openCombatSimulator()` / `closeCombatSimulator()`
- `addShipToFleet(side)` / `removeShipFromFleet(side, shipId)`
- `calculateAggregateStats(fleet)`
- `runCombatSimulation()`
- `handleFormulaInput(event)` / `handleFormulaKeydown(event)`
- `showAutocomplete()` / `hideAutocomplete()`

**Features:**
- Fleet management (left vs right)
- Aggregate stat calculation
- Custom formula evaluation
- Autocomplete for stat names
- Formula persistence

**Dependencies:**
- `addedShips`, `shipConfigurations`, `activeConfigIndices`, `calculateModifiedStats()`, `getShipIdentifier()`

## Module Structure Template

All modules follow this consistent structure:

```javascript
// === MODULE: [MODULE_NAME] ===
// Description and dependencies

/**
 * Main module functions with JSDoc
 */
function moduleFunction(param1, param2) {
    // Validate dependencies
    if (typeof requiredGlobal === 'undefined') {
        console.error('Module dependencies not found. Load app.js first.');
        return;
    }
    
    // Function logic
}

// === MODULE EXPORT ===
window.ModuleName = {
    mainFunction: moduleFunction
};

// Backward compatibility
window.moduleFunction = moduleFunction;

console.log('Module loaded successfully');
```

## Loading Order

```html
<script src="js/custom-ship-management.js"></script>
<script src="js/file-io.js"></script>
<script src="js/score-breakdown.js"></script>
<script src="js/analysis-tools.js"></script>
<script src="js/ship-scoring.js"></script>
<script src="js/comparison-table.js"></script>
<script src="js/table-updates.js"></script>
<script src="js/pending-changes.js"></script>
<script src="js/drone-scaling.js"></script>
<script src="js/app.js"></script>
<script src="js/config-management.js"></script>
<script src="js/config-upgrade.js"></script>
<script src="js/component-management.js"></script>
<script src="js/components-panel.js"></script>
<script src="js/config-pattern-builder.js"></script>
<script src="js/batch-pattern-processor.js"></script>
<script src="js/attribute-management.js"></script>
<script src="js/attributes-panel.js"></script>
<script src="js/drag-drop.js"></script>
<script src="js/combat-simulator.js"></script>
```

## Benefits Achieved

### ✅ **Completed Benefits**
- **Reduced Complexity**: Main `app.js` file significantly smaller and more focused
- **Better Organization**: Related functionality grouped into logical modules
- **Easier Maintenance**: Specific functionality can be found and modified quickly
- **Improved Debugging**: Issues can be isolated to specific modules
- **Clean Separation**: Each module has clear responsibilities
- **Consistent API**: All modules follow the same export pattern
- **Dependency Validation**: Modules validate required dependencies before execution
- **Backward Compatibility**: All functions remain available globally

### 🔄 **Future Benefits**
- **Collaboration**: Multiple developers can work on different modules
- **Testing**: Individual modules can be tested in isolation
- **Reusability**: Modules can be reused in other projects
- **Performance**: Only load modules that are needed (future optimization)

## Implementation Guidelines

### 1. **Dependencies**
- All modules depend on `app.js` being loaded first
- Validate critical dependencies at function start
- Document all required global variables/functions

### 2. **Export Strategy**
- **Namespace export**: `window.ModuleName = { ... }` (preferred)
- **Direct export**: `window.functionName = function` (backward compatibility)
- Both approaches used for maximum compatibility

### 3. **Error Handling**
- Validate dependencies before execution
- Provide meaningful error messages
- Graceful degradation when possible

### 4. **Documentation**
- JSDoc comments for all public functions
- Clear dependency lists in module headers
- Usage examples where helpful

## Usage Examples

### Score Breakdown
```javascript
// In ship comparison table generation (app.js)
uberScoreDiv.addEventListener('click', () => {
    showScoreBreakdownPanel(ship, modifiedStats, scores, ships);
});
```

### Configuration Management
```javascript
// Add new configuration
addConfiguration(shipId, shipIdentifier, {
    onAdded: (newIndex) => {
        activeConfigIndices[shipId] = newIndex;
        updateComparisonTable();
    }
});

// Copy and paste configurations
copyConfiguration(shipId, configIndex, shipIdentifier);
pasteConfiguration(targetShipId, targetShipIdentifier);
```

### Component Management
```javascript
// Get compatible components
const compatibleComponents = getCompatibleComponents('Ship Weapons', 'Energy', 4);

// Create component slot
createComponentSlot('Ship Weapons', 'Energy', shipId, shipIdentifier, 
    configIndex, selectedId, slotIndex, container);
```

### Attribute Management
```javascript
// Add custom attribute
addCustomAttribute('Custom Stat', 100);

// Reorder attributes
reorderAttributes(fromIndex, toIndex);
```

### File I/O
```javascript
// Handle file uploads
document.getElementById('csv-file').addEventListener('change', handleCsvUpload);
document.getElementById('components-file').addEventListener('change', handleComponentsUpload);

// Save/load configurations
saveConfigurations();
loadConfigurations(event);
```

### Drag and Drop
```javascript
// Initialize drag and drop
initDragAndDrop();

// Move ship to new position
moveShipToNewPosition(fromIndex, toIndex);
```

## Testing the Implementation

1. Load the application
2. Verify all modules load successfully (check browser console)
3. Test functionality in each module:
   - **Score Breakdown**: Click score elements to open breakdowns
   - **Configuration Management**: Add, rename, duplicate, copy/paste configs
   - **Component Management**: Add/remove components, test compatibility
   - **Attribute Management**: Add custom attributes, drag to reorder
   - **File I/O**: Load CSV/JSON files, save configurations
   - **Drag and Drop**: Drag ship columns to reorder

All functionality should work exactly as before, but now with better code organization!

## Other Modules Not Initially Documented

These modules were also created during the modularization process:

### 13. Comparison Table Module (`comparison-table.js`)
Contains the main `updateComparisonTable()` function and ship management functions

### 14. Components Panel Module (`components-panel.js`)
Handles the components panel UI and interactions

### 15. Config Upgrade Module (`config-upgrade.js`)
Handles configuration upgrade functionality

### 16. Custom Ship Management Module (`custom-ship-management.js`)
Manages custom ship creation and editing

### 17. Table Updates Module (`table-updates.js`)
Provides efficient partial table update methods

### 18. Analysis Tools Module (`analysis-tools.js`)
Contains ship analysis and reporting tools

### 19. Ship Scoring Module (`ship-scoring.js`)
Handles ship scoring calculations

## Migration Complete! 🎉

We have successfully modularized the entire Ship Config Lite application:
- **19 modules** extracted and implemented
- **100+ functions** properly organized and exported
- **Zero breaking changes** - all functionality preserved
- **Clean modular architecture** established
- **app.js reduced from 7000+ to ~3800 lines**
- **Future development** streamlined

The codebase is now much more maintainable and ready for continued development! 