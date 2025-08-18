# Architecture Overview

## System Architecture

The SAGE Map Editor is a single-page web application built with vanilla JavaScript, following a modular architecture pattern. The application is designed for creating and managing star system maps for the Star Atlas game economy simulation.

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          index.html                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    User Interface Layer                   │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │   Toolbar   │  │ Details Panel│  │ Canvas View  │   │   │
│  │  └─────────────┘  └──────────────┘  └──────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  JavaScript Module Layer                  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │  main.js │ │  ui-     │ │ canvas-  │ │ system-  │   │   │
│  │  │          │ │handlers  │ │ drawing  │ │operations│   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ file-    │ │ state.js │ │ utils.js │ │helpers.js│   │   │
│  │  │operations│ │          │ │          │ │          │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Data Model Layer                       │   │
│  │                      (models.js)                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │   Star   │ │  Planet  │ │ Resource │ │  Region  │   │   │
│  │  │  Types   │ │  Types   │ │  Types   │ │  Colors  │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Module Organization

### Core Modules

1. **main.js** - Application Entry Point
   - Initializes the application
   - Sets up global constants
   - Coordinates module loading
   - Creates test data for development

2. **models.js** - Data Models and Constants
   - Star type definitions (20 types)
   - Planet type definitions (24 types per faction)
   - Resource type definitions (86 resources)
   - Region colors and display states

3. **state.js** - State Management
   - Global application state
   - Undo/redo system with history stack
   - Resource filter states
   - View state (zoom, pan, selection)
   - Planet archetype resources by faction

4. **canvas-drawing.js** - Rendering Engine
   - Canvas initialization and high-DPI support
   - Galaxy map rendering
   - System preview rendering
   - Resource heatmap visualization
   - Region visualization

5. **system-operations.js** - Core Business Logic
   - System CRUD operations
   - Planet and star management
   - Link management between systems
   - Region operations
   - Regional planet distribution generation

6. **ui-handlers.js** - User Interface Logic
   - Event handler setup
   - UI element management
   - Modal dialogs
   - Filter controls
   - Keyboard shortcut handling

7. **file-operations.js** - Data Persistence
   - Map import/export (JSON format)
   - Data format migration
   - Save state management
   - File compatibility handling

8. **utils.js** - Utility Functions
   - Color management
   - Coordinate transformations
   - Geometric calculations
   - Resource helpers
   - Deep copy operations

9. **helpers.js** - Additional Helpers
   - Duplicate functionality (being refactored)
   - Legacy support functions
   - Compatibility layer

## Data Flow

### State Management Flow
```
User Action → Event Handler → State Update → Save State → Redraw UI
                                    ↓
                              History Stack
```

### Rendering Pipeline
```
State Change → drawGalaxyMap() → Clear Canvas → Draw Grid → Draw Regions → Draw Links → Draw Systems → Draw Labels
                                                     ↓
                                              Draw Selection
```

### Import/Export Flow
```
Import: File → JSON Parse → Data Migration → Load State → Rebuild Lookups → Redraw
Export: Current State → JSON Stringify → Download File
```

## Key Design Patterns

### 1. Module Pattern
Each JavaScript file acts as a module, exposing functions through the global window object:
```javascript
// In module
function myFunction() { ... }
window.myFunction = myFunction;
```

### 2. State Management Pattern
- Centralized state in `state.js`
- History stack for undo/redo
- Deep copy for state snapshots
- Event-driven updates

### 3. Canvas Rendering Pattern
- Clear and redraw approach
- Layered rendering (grid → regions → links → systems)
- High-DPI support with device pixel ratio
- Separate preview canvas for system details

### 4. Event Delegation
- Centralized event handling in `ui-handlers.js`
- Canvas mouse events for interaction
- Keyboard shortcuts for productivity

## Technology Stack

### Frontend Technologies
- **HTML5**: Semantic markup with Canvas elements
- **CSS3**: Modern styling with CSS variables
- **JavaScript ES6+**: Modules, arrow functions, destructuring

### Key APIs Used
- **Canvas 2D Context**: All rendering operations
- **FileReader API**: Import functionality
- **Blob/URL API**: Export functionality
- **Local Storage**: (Prepared but not implemented)

### Browser Requirements
- Modern browsers supporting ES6+
- Canvas API support
- FileReader API support
- CSS Variables support

## Performance Considerations

### Rendering Optimization
- Only redraw when necessary
- Use `requestAnimationFrame` for smooth updates
- Clip rendering to visible viewport
- Cache calculations where possible

### Memory Management
- History stack limited to 50 entries
- Deep copy optimization for large data sets
- Cleanup of temporary objects
- Efficient lookup tables (systemLookup)

### Large Dataset Handling
- Viewport culling for systems outside view
- Efficient hit detection with tolerance
- Batch operations for multiple selections

## Security Considerations

- No server communication (fully client-side)
- JSON validation on import
- No execution of imported code
- Sanitization of user inputs

## Extension Points

### Adding New Features
1. Create new module in `js/` directory
2. Import in `index.html`
3. Hook into existing event system
4. Update state management as needed
5. Add UI controls to toolbar or panels

### Customization Options
- Star/Planet type definitions in `models.js`
- Resource definitions and mappings
- Color schemes through CSS variables
- UI layout through CSS

## Module Dependencies

```
main.js
  ├── models.js
  ├── state.js
  ├── utils.js
  ├── canvas-drawing.js
  ├── system-operations.js
  ├── ui-handlers.js
  └── file-operations.js

canvas-drawing.js
  ├── state.js
  ├── utils.js
  └── models.js

system-operations.js
  ├── state.js
  ├── utils.js
  ├── models.js
  └── canvas-drawing.js

ui-handlers.js
  ├── state.js
  ├── system-operations.js
  ├── canvas-drawing.js
  └── file-operations.js
```

## Future Architecture Considerations

1. **Module Bundling**: Consider webpack or rollup for production
2. **TypeScript Migration**: Add type safety
3. **State Management Library**: Consider Redux or MobX for complex state
4. **Component Framework**: Migrate UI to React/Vue for better maintainability
5. **Testing Framework**: Add Jest or Mocha for unit tests
6. **API Integration**: Add backend services for persistence
