# UI Components

This document details the user interface components of the SAGE Map Editor, including layout, interactions, and rendering systems.

## Table of Contents

1. [Layout Structure](#layout-structure)
2. [Toolbar Components](#toolbar-components)
3. [Canvas Components](#canvas-components)
4. [Details Panel](#details-panel)
5. [Modal Dialogs](#modal-dialogs)
6. [Interactive Elements](#interactive-elements)
7. [Visual Indicators](#visual-indicators)
8. [Event Handling](#event-handling)

---

## Layout Structure

### Main Layout
```
┌──────────────────────────────────────────────────┐
│                   Header                          │
├──────────────────────────────────────────────────┤
│                  Toolbar                          │
├────────────────────────┬─────────────────────────┤
│                        │                         │
│    Galaxy Canvas       │    Details Panel       │
│                        │                         │
│                        │                         │
└────────────────────────┴─────────────────────────┘
```

### Header Components
```html
<header>
    <div class="logo">
        Star Atlas Map Editor
        <span class="file-info">
            <span id="currentFilename">Unsaved Map</span>
            <span id="saveStatusIndicator">(Saved)</span>
        </span>
    </div>
    <div class="header-controls">
        <div class="search-input-wrapper">
            <input type="text" id="searchSystem" placeholder="Search systems...">
            <button id="clearSearchBtn" class="clear-search-btn">×</button>
        </div>
        <div id="mouseCoords" class="coords-display"></div>
        <div id="systemCount" class="system-count"></div>
        <a href="../SAGE Editor Suite/index.html" class="home-button">Home</a>
    </div>
</header>
```

---

## Toolbar Components

### Toolbar Sections

#### File Operations
```html
<div class="toolbar-section">
    <button id="newMapBtn">New</button>
    <button id="importBtn">Import</button>
    <button id="exportBtn">Export</button>
    <button id="fixDataBtn">Fix Data</button>
</div>
```

#### History Controls
```html
<div class="toolbar-section">
    <button id="undoBtn" disabled>Undo</button>
    <button id="redoBtn" disabled>Redo</button>
    <button id="historyToggleBtn">History</button>
</div>
```

#### System Operations
```html
<div class="toolbar-section">
    <button id="newSystemBtn">New System</button>
    <button id="deleteSystemBtn">Delete</button>
    <button id="copySystemBtn">Copy</button>
    <button id="pasteSystemBtn">Paste</button>
    <button id="linkSystemBtn">Link</button>
    <button id="deselectBtn" disabled>Deselect</button>
</div>
```

#### View Controls
```html
<div class="toolbar-section">
    <button id="resetViewBtn">Reset View</button>
    <button id="toggleGridBtn" class="toggle-btn active">Grid</button>
    <button id="toggleSnapBtn" class="toggle-btn">Snap</button>
    <button id="cycleSizeBtn">Size</button>
</div>
```

#### Region Tools
```html
<div class="toolbar-section">
    <button id="createRegionBtn">Create Region</button>
    <button id="addToRegionBtn">Add to Region</button>
    <button id="removeFromRegionBtn">Remove from Region</button>
    <button id="resourceRichnessBtn">Resource Richness</button>
</div>
```

### Button States
- **Normal**: Default appearance
- **Hover**: Highlighted on mouse over
- **Active**: Pressed/toggled state
- **Disabled**: Grayed out when unavailable

### Tooltips
All buttons include `data-tooltip` attributes:
```html
<button id="newSystemBtn" data-tooltip="Create a new system at cursor">
```

---

## Canvas Components

### Galaxy View Canvas
Main viewport for the star map.

#### Canvas Structure
```html
<div id="galaxyContainer" class="galaxy-container">
    <canvas id="galaxyView" width="800" height="600"></canvas>
</div>
```

#### Rendered Elements

1. **Grid**
   - Light gray lines
   - 1-unit spacing
   - Toggle with Grid button

2. **Resource Heatmap**
   - Gradient overlay
   - Shows resource density
   - Debug mode available

3. **Regions**
   - Convex hull polygons
   - Optional blob fill
   - Labels with statistics

4. **System Links**
   - White lines between systems
   - Highlighted when selected

5. **Star Systems**
   - Circle: Regular system
   - Crown: Core system
   - Star: KING system
   - Faction colors

6. **Labels**
   - System names
   - Faction indicators
   - Planet/star counts
   - Status icons

### System Preview Canvas
Detailed view of selected system.

```html
<canvas id="systemPreview" width="300" height="300"></canvas>
```

Shows:
- Star(s) with colors
- Planet orbits
- Planet positions
- Resource indicators

---

## Details Panel

### Tab Interface
```html
<div class="details-tabs">
    <div class="details-tab active" data-tab="system-tab">
        <!-- System icon -->
    </div>
    <div class="details-tab" data-tab="resources-tab">
        <!-- Resources icon -->
    </div>
    <div class="details-tab" data-tab="filter-tab">
        <!-- Filter icon -->
    </div>
    <div class="details-tab" data-tab="history-tab">
        <!-- History icon -->
    </div>
</div>
```

### System Tab

#### Single System Selected
```html
<div class="detail-section">
    <h3>Basic Information</h3>
    <div class="form-group">
        <label>Name:</label>
        <input type="text" id="systemName">
    </div>
    <div class="form-group">
        <label>Coordinates:</label>
        <div class="coord-inputs">
            <input type="number" id="systemX">
            <span>,</span>
            <input type="number" id="systemY">
        </div>
    </div>
    <!-- More fields... -->
</div>
```

#### Multiple Systems Selected
Shows statistics:
- System count by faction
- Core/KING system counts
- Resource distribution
- Average connections

### Resources Tab
- Lists all planets
- Shows resources per planet
- Edit buttons for each planet

### Filter Tab
Resource and display filters:
```html
<div class="resource-category">
    <h4>Gases</h4>
    <div class="filter-item">
        <input type="checkbox" id="filter-hydrogen">
        <label>Hydrogen</label>
    </div>
    <!-- More resources... -->
</div>
```

### History Tab
Undo/redo history list:
```html
<ul id="historyList" class="history-list">
    <li class="history-item current-state">
        <span class="history-time">2:34 PM</span>
        <span class="history-desc">Moved System Alpha</span>
    </li>
    <!-- More history items... -->
</ul>
```

---

## Modal Dialogs

### Resource Editor Modal
```javascript
function showResourceModal(planet, onSave) {
    // Creates modal with:
    // - Current resources list
    // - Available resources by type
    // - Add/remove buttons
    // - Save/cancel actions
}
```

### Region Creation Modal
Input fields:
- Region name
- Color picker
- Apply button

### Resource Richness Modal
Options:
- Falloff curve selection
- Falloff amount
- Preview chart
- Apply button

### Help Modal
Displays keyboard shortcuts in categories:
- Navigation
- Selection
- Editing
- View

---

## Interactive Elements

### Mouse Interactions

#### Left Click
- Select system
- Deselect (empty space)
- Confirm operations

#### Shift + Left Click
- Add to selection
- Remove from selection

#### Ctrl + Drag
- Selection box
- Multi-select systems

#### Right Click + Drag
- Pan view
- Navigate map

#### Mouse Wheel
- Zoom in/out
- Scale view

### Keyboard Shortcuts

#### Navigation
- **Arrow Keys**: Pan view
- **+/-**: Zoom in/out
- **Home**: Reset view

#### Selection
- **Ctrl+A**: Select all
- **Escape**: Deselect all
- **Tab**: Cycle selection

#### Editing
- **Delete**: Delete selected
- **Ctrl+C**: Copy system
- **Ctrl+V**: Paste system
- **Ctrl+Z**: Undo
- **Ctrl+Y**: Redo

#### View
- **G**: Toggle grid
- **L**: Toggle labels
- **S**: Toggle snap

---

## Visual Indicators

### System States

#### Normal
- Faction color fill
- White border
- Standard size

#### Hovered
- Brightened color
- Thicker border
- Cursor change

#### Selected
- Yellow border
- Glow effect
- Selection indicator

#### Locked
- Lock icon overlay
- Reduced opacity
- No drag cursor

### Connection States

#### Normal Link
- White line
- Standard width

#### Selected Link
- Yellow line
- Thicker width
- Glow effect

### Region Indicators

#### System in Region
- Colored circle around system
- Matches region color
- Different shapes for core/king

#### Region Boundary
- Convex hull outline
- Semi-transparent fill
- Region color

---

## Event Handling

### Event Flow
```javascript
User Input → Event Listener → Handler Function → State Update → UI Update
```

### Canvas Event Handling
```javascript
canvas.addEventListener('mousedown', handleCanvasMouseDown);
canvas.addEventListener('mousemove', handleCanvasMouseMove);
canvas.addEventListener('mouseup', handleCanvasMouseUp);
canvas.addEventListener('wheel', handleCanvasWheel);
canvas.addEventListener('contextmenu', e => e.preventDefault());
```

### Button Event Handling
```javascript
document.getElementById('newSystemBtn').addEventListener('click', createNewSystem);
// Pattern repeated for all buttons
```

### Input Event Handling
```javascript
// Real-time search
searchSystemInput.addEventListener('input', function() {
    searchTerm = this.value.toLowerCase();
    drawGalaxyMap();
});

// System property changes
systemNameInput.addEventListener('input', function() {
    if (selectedSystems.length === 1) {
        selectedSystems[0].name = this.value;
        saveState(`Renamed system to ${this.value}`);
    }
});
```

---

## CSS Styling

### Theme Variables
```css
:root {
    --bg-dark: #121212;
    --bg-surface: #1e1e1e;
    --accent-primary: #4a88ff;
    --text-primary: #e0e0e0;
    --border-color: #333333;
    /* ... more variables */
}
```

### Component Classes

#### Buttons
```css
.btn-action {
    background-color: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    /* ... */
}

.btn-action:hover {
    background-color: #383838;
}

.btn-action.active {
    border-bottom: 2px solid var(--accent-primary);
}
```

#### Panels
```css
.details-panel {
    background-color: var(--bg-surface);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-md);
}
```

#### Forms
```css
.form-group {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
}

.form-group input {
    background-color: var(--bg-input);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
}
```

---

## Responsive Design

### Breakpoints
```css
/* Tablet and below */
@media (max-width: 1200px) {
    .workspace {
        flex-direction: column;
    }
    
    #detailsPanel {
        width: 100%;
        height: 300px;
    }
}

/* Mobile */
@media (max-width: 600px) {
    .toolbar {
        flex-wrap: wrap;
    }
    
    .modal-dialog {
        width: 95%;
    }
}
```

### Adaptive UI
- Toolbar wraps on small screens
- Details panel moves below canvas
- Modals resize for mobile
- Touch-friendly button sizes

---

## Accessibility Features

### Keyboard Navigation
- All buttons keyboard accessible
- Tab order follows visual flow
- Escape key for cancel operations

### Visual Feedback
- Hover states on all interactive elements
- Focus indicators for keyboard users
- High contrast borders
- Status messages for actions

### Screen Reader Support
- Descriptive button labels
- ARIA attributes where needed
- Semantic HTML structure
- Alternative text for icons
