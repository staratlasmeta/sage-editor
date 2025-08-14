# Star Atlas Map Editor

This is a modular, web-based map editor for creating and managing star systems for the Star Atlas game economy simulation.

## Project Structure

The codebase has been modularized for better maintainability and future expansion:

### Core Files

- `index.html` - Main HTML file that loads all JavaScript modules
- `style.css` - CSS styles for the application

### JavaScript Modules

The application code is split into the following modules in the `js/` directory:

- `models.js` - Data models and constants for star types, planet types, resources, etc.
- `state.js` - Global application state variables and state management functions
- `utils.js` - General utility functions for colors, planets, stars, etc.
- `helpers.js` - Helper functions for calculations, state management, etc.
- `canvas-drawing.js` - All canvas drawing functions
- `system-operations.js` - Functions for operating on star systems (add, delete, modify)
- `file-operations.js` - Functions for file import/export
- `ui-handlers.js` - UI event handlers and UI-related functions
- `main.js` - Main initialization code and entry point

## Features

- Create, edit, and manage star systems with multiple stars (up to 3 per system)
- Add planets with resources to systems
- Link systems together to create navigation routes
- Organize systems into regions
- Analyze faction areas and control
- Import/export maps to JSON files
- Undo/redo functionality for all actions
- Zoom, pan, and navigate the galaxy map
- Search for systems by name
- Filter resources and region display

## Star System Features

Each star system can have:
- Up to 3 stars of different types (White Dwarf, Red Dwarf, Solar, Hot Blue, Red Giant)
- Multiple planets with customizable orbits, angles and scales
- Each planet can have multiple resources with different richness levels
- System ownership by different factions (MUD, ONI, UST)
- Core system status for important faction systems
- Links to other star systems for navigation

## Getting Started

1. Open `index.html` in a web browser
2. Use the toolbar buttons to create systems, navigate, and edit the map
3. Right-click on systems to link them together
4. Use the details panel to edit system properties
5. Save your map using the Export button

## Keyboard Shortcuts

- Shift + Click: Add/remove systems from selection
- Ctrl/Cmd + Click and drag: Create selection box
- Mouse wheel: Zoom in/out
- Right-click and drag: Pan the view
- Shift + drag: Move selected systems

## Browser Compatibility

Tested and working on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+ 