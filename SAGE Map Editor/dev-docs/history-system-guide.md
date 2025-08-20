# History System Guide

## Overview

The SAGE Map Editor now uses a completely overhauled history system that provides reliable undo/redo functionality with complete state snapshots.

## Key Features

1. **Complete State Snapshots**: Each history entry captures the entire application state, including:
   - All map data (systems, stars, planets, resources)
   - Selection state
   - Region definitions
   - View settings (zoom, pan position)
   - UI toggles (grid, labels, etc.)
   - File metadata

2. **Simple API**: The new system provides a clean, simple API:
   - `saveHistoryState(description)` - Save current state
   - `historyUndo()` - Undo to previous state
   - `historyRedo()` - Redo to next state
   - `historyJumpTo(index)` - Jump to any state
   - `historyClear()` - Clear all history

3. **Visual History Panel**: The history panel shows:
   - Timestamp for each action
   - Description of what happened
   - System count and selection count
   - Current state indicator
   - Clickable items to jump to any state

## How It Works

### State Capture
When you perform any action (create system, select, move, etc.), the system captures a complete snapshot of the application state using `createStateSnapshot()`. This includes:

```javascript
{
    description: "Created System-1",
    timestamp: new Date(),
    data: {
        mapData: [...], // All systems
        selectedSystemKeys: [...], // Selected system keys
        regionDefinitions: [...], // All regions
        scale: 5, // Zoom level
        offsetX: 400, // Pan position
        offsetY: 300,
        // ... and more
    }
}
```

### State Restoration
When undoing/redoing, `restoreStateSnapshot()` completely rebuilds the application state:
1. Clears current data
2. Restores all systems and lookups
3. Restores selection state
4. Updates all UI elements
5. Redraws the map

### Automatic Compatibility
The system includes fallback support for the old history system, so it works even if the new system fails to load.

## Usage

### Creating Systems
- Creating a system saves one state: "Created System-X"
- The selection is included in the same state

### Selection Operations
- All selection changes are saved with proper descriptions
- Selection state is always preserved in undo/redo

### Moving Systems
- Dragging systems saves "Moved System" state
- The new position is captured in the snapshot

### Importing Maps
- Clears history and starts fresh
- Saves "Initial Empty State" followed by "Imported Map"

## Debug Mode

Set `HISTORY_CONFIG.DEBUG = true` in `history-system.js` to see detailed console logs of all history operations.

## Technical Details

- Maximum history size: 50 states
- State storage: JSON serialization
- Performance: Optimized for maps with < 1000 systems
- Memory usage: Each state uses ~50-200KB depending on map size
