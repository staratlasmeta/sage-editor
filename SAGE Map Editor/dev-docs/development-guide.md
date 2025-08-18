# Development Guide

This guide provides instructions for setting up, developing, testing, and contributing to the SAGE Map Editor.

## Table of Contents

1. [Development Setup](#development-setup)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Code Style Guide](#code-style-guide)
5. [Testing Procedures](#testing-procedures)
6. [Debugging Guide](#debugging-guide)
7. [Performance Optimization](#performance-optimization)
8. [Common Tasks](#common-tasks)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## Development Setup

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Text editor or IDE (VS Code recommended)
- Local web server (optional but recommended)
- Git for version control

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd sage-editor/SAGE\ Map\ Editor
   ```

2. **Set up local server** (optional)
   
   Using Python:
   ```bash
   python -m http.server 8000
   ```
   
   Using Node.js:
   ```bash
   npx http-server -p 8000
   ```
   
   Using VS Code Live Server extension

3. **Open in browser**
   - Direct file: `file:///path/to/index.html`
   - Local server: `http://localhost:8000`

### Development Environment

#### Recommended VS Code Extensions
- Live Server
- ESLint
- Prettier
- JavaScript (ES6) code snippets
- GitLens

#### Browser Developer Tools
- Chrome DevTools recommended
- Enable source maps
- Use Performance profiler
- Monitor Console for errors

---

## Project Structure

```
SAGE Map Editor/
├── index.html              # Main HTML file
├── modern-style.css        # Main styles
├── layout-fix.css          # Layout corrections
├── icons.svg               # SVG icon definitions
├── README.md               # User documentation
├── js/                     # JavaScript modules
│   ├── main.js            # Entry point
│   ├── models.js          # Data models
│   ├── state.js           # State management
│   ├── canvas-drawing.js  # Rendering
│   ├── system-operations.js # Business logic
│   ├── ui-handlers.js     # UI events
│   ├── file-operations.js # File I/O
│   ├── utils.js           # Utilities
│   └── helpers.js         # Legacy helpers
├── data/                   # Data files
│   └── planetArchetypes.json
├── planetsData/           # Planet data
├── Saved/                 # Example saves
└── dev-docs/              # This documentation
```

---

## Development Workflow

### Starting Development

1. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes**
   - Follow module pattern
   - Update relevant files
   - Test thoroughly

3. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

### Adding New Features

#### 1. Plan the Feature
- Identify affected modules
- Design data structures
- Plan UI changes
- Consider performance

#### 2. Create/Modify Modules
```javascript
// In new-feature.js
function myNewFeature() {
    // Implementation
}

// Export to global scope
window.myNewFeature = myNewFeature;
```

#### 3. Update HTML
```html
<!-- In index.html -->
<script src="js/new-feature.js"></script>
```

#### 4. Add UI Controls
```html
<!-- In toolbar -->
<button id="newFeatureBtn">New Feature</button>
```

#### 5. Wire Events
```javascript
// In ui-handlers.js
document.getElementById('newFeatureBtn').addEventListener('click', myNewFeature);
```

### Module Pattern

All modules follow this pattern:
```javascript
// module-name.js

// Private variables
let privateVar = 0;

// Private functions
function privateFunction() {
    // Not exposed
}

// Public functions
function publicFunction() {
    // Will be exposed
}

// Export public API
window.publicFunction = publicFunction;
```

---

## Code Style Guide

### JavaScript Style

#### General Rules
- Use ES6+ features
- Prefer `const` and `let` over `var`
- Use meaningful variable names
- Add comments for complex logic

#### Naming Conventions
```javascript
// Constants
const MAX_SYSTEMS = 1000;

// Variables
let systemCount = 0;

// Functions
function calculateDistance() {}

// Objects
const systemData = {
    name: "Alpha",
    coordinates: [0, 0]
};

// Arrays
const selectedSystems = [];
```

#### Function Documentation
```javascript
/**
 * Creates a new star system at specified coordinates
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {object} New system object
 */
function createSystemAt(x, y) {
    // Implementation
}
```

### CSS Style

#### Naming
```css
/* Use kebab-case */
.system-details {}
.btn-primary {}

/* Use CSS variables */
:root {
    --main-color: #4a88ff;
}
```

#### Organization
```css
/* Component styles together */
.modal {
    /* Container */
}

.modal-header {
    /* Header */
}

.modal-content {
    /* Content */
}
```

### HTML Style

#### Structure
```html
<!-- Semantic HTML -->
<header>
    <nav><!-- Navigation --></nav>
</header>

<main>
    <section><!-- Content --></section>
</main>

<!-- Meaningful IDs -->
<button id="saveMapBtn">Save Map</button>
```

---

## Testing Procedures

### Manual Testing Checklist

#### Core Functions
- [ ] Create new system
- [ ] Select/deselect systems
- [ ] Move systems
- [ ] Delete systems
- [ ] Add/remove stars
- [ ] Add/remove planets
- [ ] Edit resources
- [ ] Create/delete links

#### Advanced Features
- [ ] Regional distribution
- [ ] Resource richness
- [ ] Import/export
- [ ] Undo/redo
- [ ] Search functionality
- [ ] Filter systems

#### Edge Cases
- [ ] Empty map
- [ ] Single system
- [ ] 1000+ systems
- [ ] Locked systems
- [ ] Invalid imports

### Browser Testing

Test in:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

Check:
- Canvas rendering
- Event handling
- File operations
- Performance

### Performance Testing

1. **Large Dataset**
   ```javascript
   // Create 1000 systems
   for (let i = 0; i < 1000; i++) {
       createNewSystemAtCoords(
           Math.random() * 200 - 100,
           Math.random() * 200 - 100
       );
   }
   ```

2. **Monitor Performance**
   - Open DevTools Performance tab
   - Record while interacting
   - Check for:
     - Long tasks
     - Memory leaks
     - Slow renders

---

## Debugging Guide

### Common Issues

#### Canvas Not Rendering
```javascript
// Check canvas initialization
console.log('Canvas:', canvas);
console.log('Context:', ctx);

// Force redraw
drawGalaxyMap();
```

#### Events Not Firing
```javascript
// Check element exists
const element = document.getElementById('elementId');
console.log('Element:', element);

// Check event listener
element.addEventListener('click', function(e) {
    console.log('Click event:', e);
});
```

#### State Issues
```javascript
// Log state
console.log('MapData:', mapData);
console.log('Selected:', selectedSystems);

// Check history
console.log('History:', historyStack);
```

### Debug Mode

Enable debug features:
```javascript
// In console
window.DEBUG = true;

// Shows additional logging
window.showResourceHeatmap = true;
window.heatmapDebugMode = true;
```

### Browser DevTools

#### Console
- Check for errors
- Use `console.table()` for data
- Set breakpoints with `debugger`

#### Network
- Monitor file loads
- Check import/export

#### Performance
- Record interactions
- Analyze flame charts
- Check memory usage

---

## Performance Optimization

### Rendering Optimization

#### Viewport Culling
```javascript
// Only draw visible systems
function drawVisibleSystems() {
    const bounds = getViewportBounds();
    mapData.forEach(system => {
        if (isInBounds(system, bounds)) {
            drawSystem(system);
        }
    });
}
```

#### Batch Operations
```javascript
// Bad: Individual updates
systems.forEach(system => {
    updateSystem(system);
    drawGalaxyMap(); // Redraws each time
});

// Good: Batch update
systems.forEach(system => {
    updateSystem(system);
});
drawGalaxyMap(); // Single redraw
```

### Memory Management

#### Clean Up References
```javascript
// When deleting systems
delete systemLookup[system.key];
selectedSystems = selectedSystems.filter(s => s !== system);
```

#### Limit History
```javascript
// Already implemented
if (historyStack.length > MAX_HISTORY_SIZE) {
    historyStack.shift();
}
```

### Data Structure Optimization

#### Use Lookup Tables
```javascript
// Fast lookup by key
const system = systemLookup[systemKey];

// Instead of searching
const system = mapData.find(s => s.key === systemKey);
```

---

## Common Tasks

### Adding a New Resource Type

1. **Update models.js**
   ```javascript
   RESOURCE_TYPES.push({
       type: 86,
       name: "New Resource",
       richness: 1,
       planetTypes: ["Terrestrial Planet"]
   });
   ```

2. **Add color mapping**
   ```javascript
   RESOURCE_COLORS['new resource'] = '#123456';
   ```

3. **Update planet archetypes** (if needed)
   ```javascript
   PLANET_ARCHETYPE_RESOURCES.MUD.Terrestrial.push({
       type: 86,
       name: "New Resource",
       richness: 1
   });
   ```

### Adding a New Planet Type

1. **Update models.js**
   ```javascript
   PLANET_TYPES.push({
       type: 24,
       name: "MUD Crystal Planet",
       defaultScale: 0.25,
       faction: "MUD"
   });
   ```

2. **Add to tier system**
   ```javascript
   PLANET_TIERS["MUD Crystal Planet"] = 4;
   ```

3. **Add color**
   ```javascript
   // In utils.js getPlanetColor()
   if (nameLower.includes('crystal')) return '#E6E6FA';
   ```

### Creating a Custom Tool

1. **Add button to toolbar**
   ```html
   <button id="customToolBtn">Custom Tool</button>
   ```

2. **Create handler function**
   ```javascript
   function handleCustomTool() {
       // Tool logic
       const systems = selectedSystems;
       // Process systems
       saveState("Used custom tool");
       drawGalaxyMap();
   }
   ```

3. **Wire up event**
   ```javascript
   document.getElementById('customToolBtn')
       .addEventListener('click', handleCustomTool);
   ```

---

## Deployment

### Preparing for Production

1. **Optimize assets**
   - Minify CSS
   - Combine JS files (optional)
   - Optimize images

2. **Test thoroughly**
   - All browsers
   - Different screen sizes
   - Import/export functions

3. **Update documentation**
   - README.md
   - Version numbers
   - Changelog

### Deployment Options

#### Static Hosting
- GitHub Pages
- Netlify
- Vercel
- AWS S3

#### Server Requirements
- None (fully client-side)
- HTTPS recommended
- CORS headers for external resources

### Build Process

Currently no build process required. For production:

1. **Option 1: Direct deployment**
   - Deploy files as-is
   - Simple and maintainable

2. **Option 2: Build pipeline**
   ```json
   // package.json
   {
     "scripts": {
       "build": "concat && minify",
       "deploy": "npm run build && deploy"
     }
   }
   ```

---

## Troubleshooting

### Common Problems

#### Import Fails
```javascript
// Check file format
try {
    const data = JSON.parse(fileContent);
    // Validate structure
    if (!data.mapData && !Array.isArray(data)) {
        throw new Error('Invalid format');
    }
} catch (e) {
    console.error('Import error:', e);
}
```

#### Canvas Scaling Issues
```javascript
// Ensure high-DPI setup
setupHighDPICanvas(canvas, ctx);

// Check device pixel ratio
console.log('DPR:', window.devicePixelRatio);
```

#### Memory Leaks
```javascript
// Monitor memory usage
console.log('Systems:', mapData.length);
console.log('History:', historyStack.length);

// Clear unused references
hoveredSystem = null;
draggedSystem = null;
```

### Debug Utilities

Add to console for debugging:
```javascript
// Dump current state
window.dumpState = function() {
    console.log({
        systems: mapData.length,
        selected: selectedSystems.length,
        history: historyStack.length,
        regions: regionDefinitions.length
    });
};

// Find system by name
window.findSystem = function(name) {
    return mapData.find(s => 
        s.name.toLowerCase().includes(name.toLowerCase())
    );
};

// Clear everything
window.resetAll = function() {
    if (confirm('Clear all data?')) {
        clearMapData();
        drawGalaxyMap();
    }
};
```

### Getting Help

1. Check console for errors
2. Review relevant module code
3. Use browser debugger
4. Check this documentation
5. Review code comments

---

## Best Practices Summary

1. **Always save state** before modifications
2. **Batch operations** for performance
3. **Clean up references** to prevent leaks
4. **Test edge cases** thoroughly
5. **Document complex logic** with comments
6. **Follow module pattern** consistently
7. **Use meaningful names** for clarity
8. **Handle errors gracefully**
9. **Optimize for large datasets**
10. **Keep UI responsive**
