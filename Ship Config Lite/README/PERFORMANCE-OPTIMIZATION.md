# Performance Optimization for Ship Config Lite

## Overview

The Ship Config Lite application has been enhanced with performance optimizations to address the bottleneck of real-time table updates. The main improvements include:

1. **Deferred Updates with Refresh Button**: Instead of rebuilding the entire table on every change, changes are now tracked and a refresh button appears when updates are pending.

2. **Multi-threaded Calculations**: Heavy stat calculations are offloaded to Web Workers for better performance.

## Features

### Pending Changes System

- **Automatic Change Detection**: The system automatically detects when changes are made to:
  - Ship configurations
  - Component selections
  - Ship attributes
  - Custom attributes

- **Visual Refresh Button**: A blue refresh button appears in the bottom-right corner when changes are pending:
  - Shows the number of pending changes
  - Has a pulsing animation to draw attention
  - Displays a loading spinner during refresh

### Web Worker Implementation

- **Parallel Processing**: Stat calculations are performed in a separate thread
- **Non-blocking UI**: The main interface remains responsive during calculations
- **Automatic Fallback**: If Web Workers aren't supported, the system falls back to single-threaded operation

## Usage

1. **Making Changes**: Make any changes to ships, configurations, or components as usual
2. **Pending Indicator**: Notice the blue refresh button appear with the count of changes
3. **Apply Updates**: Click the refresh button to apply all pending changes at once

## Technical Details

### Files Modified/Added

- `js/pending-changes.js`: New module handling the pending changes system
- `index.html`: Updated to include the new script

### How It Works

1. The `updateComparisonTable()` function is intercepted
2. Instead of immediate execution, changes are tracked in a Set
3. A refresh button appears showing the number of pending changes
4. Clicking refresh:
   - Shows a loading state
   - Uses Web Worker for calculations (if available)
   - Updates the table once
   - Clears pending changes

### Performance Benefits

- **Reduced Rebuilds**: Table is only rebuilt when user clicks refresh
- **Batched Updates**: Multiple changes are processed together
- **Parallel Processing**: Calculations don't block the UI
- **Better Responsiveness**: UI remains interactive during complex operations

## Browser Compatibility

- **Web Workers**: Supported in all modern browsers
- **Fallback**: Gracefully degrades to single-threaded operation in older browsers
- **Visual Effects**: CSS animations work in all modern browsers

## Future Enhancements

Potential improvements could include:
- Selective updates (only update changed cells)
- More granular change tracking
- Undo/redo functionality for pending changes
- Auto-refresh after a delay option 