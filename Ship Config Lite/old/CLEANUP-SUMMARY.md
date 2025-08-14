# Code Cleanup Summary

This document lists all the redundant/outdated code found that can be removed to clean up the project.

## 1. Wrapper Functions in app.js (lines 3700-3747)

These functions just delegate to module functions and are redundant:

```javascript
// Lines 3700-3709
function saveConfigurations() {
    // Just calls window.FileIO.saveConfigurations()
}

// Lines 3714-3719  
function deleteConfiguration() {
    // Just calls window.deleteConfiguration
}

// Lines 3721-3726
function duplicateConfiguration() {
    // Just calls window.duplicateConfiguration
}

// Lines 3728-3733
function renameConfiguration() {
    // Just calls window.renameConfiguration
}

// Lines 3735-3740
function copyConfiguration() {
    // Just calls window.copyConfiguration
}

// Lines 3742-3747
function pasteConfiguration() {
    // Just calls window.pasteConfiguration
}
```

**Action**: Remove these wrapper functions. The modules already export to global scope.

## 2. Duplicate CSV Export Functions in app.js (lines 3749-3919)

These functions have been moved to file-io.js but still exist in app.js:

```javascript
// Lines 3749-3808
function exportConfigurationToCSV() { ... }

// Lines 3810-3854
function generateConfigurationCSV() { ... }

// Lines 3856-3919
function generateCSVRowFromComponent() { ... }
```

**Action**: Remove these functions from app.js. They're now in the FileIO module.

## 3. Empty Stub Functions in app.js

These functions just delegate to module functions or return immediately:

```javascript
// Lines 1591-1595
function createComponentSlot() {
    // MOVED TO: component-management.js module
    return;
}

// Lines 1598-1602
function getCompatibleComponents() {
    // MOVED TO: component-management.js module
    return window.getCompatibleComponents ? window.getCompatibleComponents(...) : [];
}

// Lines 1605-1623
function isComponentMatchingType() {
    // Duplicate of logic in component-management.js
}

// Lines 1626-1630
function isComponentCompatibleWithShip() {
    // Duplicate of logic in component-management.js
}

// Lines 1633-1644
function getCompatibleClassSizes() {
    // Duplicate of logic in component-management.js
}

// Lines 1691-1695
function addConfiguration() {
    // MOVED TO: config-management.js module
    return window.addConfiguration ? window.addConfiguration(...) : null;
}
```

**Action**: Remove these stub/duplicate functions.

## 4. Legacy Function Comments (lines 1387-1392)

```javascript
// === LEGACY FUNCTIONS REMOVED ===
// The following functions were part of the old UI system and are no longer needed:
// - populateShipSelectors() - used old ship1-select element that doesn't exist
// - selectShip() - used old single-ship selection system  
// - clearShipDisplay() - used old display system with numbered displays
// These have been replaced by the new comparison table system with updateComparisonTable()
```

**Action**: Remove these comment blocks as they're no longer relevant.

## 5. Unused File

- `custom-attributes.js` - This file is completely empty and can be deleted.

**Action**: Delete this empty file.

## 6. Event Listener Updates

Update the following event listeners to use module functions directly:

1. Line 1738: `document.getElementById('save-config').addEventListener('click', window.saveConfigurations);`
   - This already uses window.saveConfigurations directly ✓

2. Lines 3114-3122: CSV export button
   - Already updated to use window.FileIO.exportConfigurationToCSV ✓

## 7. Module Export Duplication

The module files (config-management.js, file-io.js, component-management.js) export functions both as:
- Module object (e.g., window.FileIO = {...})
- Individual functions (e.g., window.saveConfigurations = saveConfigurations)

**Note**: This duplication is intentional for backward compatibility. No action needed.

## Benefits of Cleanup

1. **Reduced file size**: Removing ~300+ lines of redundant code
2. **Better maintainability**: No duplicate functions to maintain
3. **Clearer code flow**: Direct module usage instead of wrapper functions
4. **Less confusion**: No outdated comments or empty stub functions

## Implementation Note

The `edit_file` function in the AI assistant seems to have difficulty with large files like app.js (5800+ lines). Manual cleanup may be required for some of these changes. 