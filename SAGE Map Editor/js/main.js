// main.js - Main initialization and constants

// Constants
const MAX_HISTORY_SIZE = 50;
// Make it available globally
window.MAX_HISTORY_SIZE = MAX_HISTORY_SIZE;

// GALAXY_GRID_SPACING is now defined in models.js, not here

// Color constants for regions
// REGION_COLORS is already defined in models.js, don't redefine here

// Resource color mapping
// RESOURCE_COLORS is already defined in models.js, don't redefine here

// Main initialization function
function initApp() {
    console.log('Initializing Star Atlas Map Editor...');
    
    // Get device pixel ratio for high DPI displays
    window.devicePixelRatio = window.devicePixelRatio || 1;
    console.log(`Device Pixel Ratio: ${window.devicePixelRatio}`);
    
    // Initialize canvas and context
    initCanvas();
    
    // Initialize UI components
    initUI();
    
    // Initialize canvas event handlers
    initCanvasHandlers();
    
    // Initialize app state
    initAppState();
    
    // Initialize tooltips
    setupTooltips();
    
    // Update UI elements
    updateUndoRedoButtons();
    updateTopBarInfo();
    updateHistoryPanel();
    
    // Force an initial resize of the canvas to fill the available space
    setTimeout(function() {
        updateCanvasSize();
        
        // Ensure high DPI canvases are properly set up
        if (typeof setupHighDPICanvas === 'function') {
            const galaxyCanvas = document.getElementById('galaxyView');
            const galaxyContext = galaxyCanvas.getContext('2d');
            setupHighDPICanvas(galaxyCanvas, galaxyContext);
            
            const previewCanvas = document.getElementById('systemPreview');
            if (previewCanvas) {
                const previewContext = previewCanvas.getContext('2d');
                setupHighDPICanvas(previewCanvas, previewContext);
            }
        }
        
        // Draw initial view
        drawGalaxyMap();
        
        // Create test data for empty maps
        if (mapData.length === 0) {
            createTestData();
        }
        
        // Automatically trigger the Select All button to ensure all filters are properly applied
        setTimeout(function() {
            const selectAllBtn = document.getElementById('select-all-resources');
            if (selectAllBtn) {
                selectAllBtn.click();
                console.log('Automatically triggered Select All Filters');
                
                // Manually check all resource group toggles
                const resourceGroupToggles = [
                    document.getElementById('filter-group-gases-resources'),
                    document.getElementById('filter-group-ores-resources'),
                    document.getElementById('filter-group-crystals-resources'),
                    document.getElementById('filter-group-other-resources')
                ];
                
                resourceGroupToggles.forEach(toggle => {
                    if (toggle && !toggle.checked) {
                        toggle.checked = true;
                        // Simulate a change event to update items in the group
                        const event = new Event('change', { bubbles: true });
                        toggle.dispatchEvent(event);
                        console.log(`Manually checked toggle: ${toggle.id}`);
                    }
                });
            }
        }, 500);
    }, 100);
    
    console.log('Application initialized successfully');
}

// Export it immediately
window.initApp = initApp;

// Initialize app state
function initAppState() {
    // Initialize resource filter state
    initResourceFilterState();
    
    // Reset selection and interaction states
    selectedSystems = [];
    hoveredSystem = null;
    draggedSystem = null;
    isPanning = false;
    isLinking = false;
    
    // Initialize history
    historyStack = [];
    redoStack = [];

    // Save the initial empty state
    saveState('Initial Empty State', false, true);
}

// Create test data for development
function createTestData() {
    console.log('Creating test data...');
    
    // Create test systems
    const testSystems = [
        {
            key: 'sys-1',
            name: 'Alpha System',
            coordinates: [0, 0],
            faction: 'ONI',
            stars: [
                {
                    name: 'Alpha Star',
                    type: 2,
                    scale: 1.2
                }
            ],
            planets: [
                {
                    name: 'Alpha Prime',
                    type: 0,
                    orbit: 1,
                    angle: 45,
                    scale: 1.0,
                    resources: [
                        { type: 1, name: 'Iron Ore', richness: 1 },
                        { type: 5, name: 'Copper Ore', richness: 1 }
                    ]
                },
                {
                    name: 'Alpha Secondary',
                    type: 4,
                    orbit: 2,
                    angle: 180,
                    scale: 1.5,
                    resources: [
                        { type: 15, name: 'Hydrogen Gas', richness: 1 },
                        { type: 16, name: 'Helium Gas', richness: 1 }
                    ]
                }
            ],
            links: ['sys-2', 'sys-3']
        },
        {
            key: 'sys-2',
            name: 'Beta System',
            coordinates: [15, 5],
            faction: 'MUD',
            isCore: true,
            stars: [
                {
                    name: 'Beta Star',
                    type: 1,
                    scale: 0.9
                }
            ],
            planets: [
                {
                    name: 'Beta Prime',
                    type: 7,
                    orbit: 1,
                    angle: 90,
                    scale: 1.1,
                    resources: [
                        { type: 2, name: 'Carbon', richness: 1 },
                        { type: 7, name: 'Silicon', richness: 1 }
                    ]
                }
            ],
            links: ['sys-1', 'sys-4']
        },
        {
            key: 'sys-3',
            name: 'Gamma System',
            coordinates: [-10, -5],
            faction: 'UST',
            stars: [
                {
                    name: 'Gamma Star',
                    type: 3,
                    scale: 1.4
                }
            ],
            planets: [
                {
                    name: 'Gamma Prime',
                    type: 14,
                    orbit: 1,
                    angle: 120,
                    scale: 0.8,
                    resources: [
                        { type: 9, name: 'Titanium Ore', richness: 2 },
                        { type: 10, name: 'Platinum Ore', richness: 2 }
                    ]
                },
                {
                    name: 'Gamma Secondary',
                    type: 19,
                    orbit: 2.5,
                    angle: 270,
                    scale: 1.2,
                    resources: [
                        { type: 17, name: 'Nitrogen Gas', richness: 1 },
                        { type: 19, name: 'Ammonia', richness: 1 }
                    ]
                }
            ],
            links: ['sys-1']
        },
        {
            key: 'sys-4',
            name: 'Delta System',
            coordinates: [20, -10],
            faction: 'MUD',
            stars: [
                {
                    name: 'Delta Star',
                    type: 4,
                    scale: 1.6
                }
            ],
            planets: [
                {
                    name: 'Delta Prime',
                    type: 8,
                    orbit: 2,
                    angle: 30,
                    scale: 0.7,
                    resources: [
                        { type: 3, name: 'Sulfur', richness: 1 },
                        { type: 4, name: 'Magnesium', richness: 1 }
                    ]
                }
            ],
            links: ['sys-2']
        }
    ];
    
    // Sample region definition
    const testRegions = [
        {
            id: 'region-1',
            name: 'Central Region',
            color: '#FF6347'
        },
        {
            id: 'region-2',
            name: 'Outer Rim',
            color: '#4682B4'
        }
    ];
    
    // Assign regions to systems
    testSystems[0].regionId = 'region-1'; // Alpha to Central
    testSystems[1].regionId = 'region-1'; // Beta to Central
    testSystems[2].regionId = 'region-2'; // Gamma to Outer Rim
    testSystems[3].regionId = 'region-2'; // Delta to Outer Rim
    
    // Add test data to application state
    mapData = testSystems;
    regionDefinitions = testRegions;
    
    // Build system lookup
    systemLookup = {};
    mapData.forEach(system => {
        systemLookup[system.key] = system;
    });
    
    // Set system counter based on test data
    systemCounter = 5;
}

// Execute when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content loaded in main.js, but waiting for explicit initialization call');
    
    // Immediately clean up any existing tooltip elements
    const existingTooltips = document.querySelectorAll('.tooltip');
    existingTooltips.forEach(tooltip => {
        if (tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
        }
    });
    
    // Add event capture for mouseenter/mouseleave on tooltip elements to prevent
    // any tooltip creation from happening
    document.addEventListener('mouseenter', function(e) {
        if (e.target.hasAttribute && e.target.hasAttribute('data-tooltip')) {
            e.stopPropagation();
        }
    }, true);
    
    document.addEventListener('mouseleave', function(e) {
        if (e.target.hasAttribute && e.target.hasAttribute('data-tooltip')) {
            e.stopPropagation();
        }
    }, true);
    
    // We don't automatically call initApp() here anymore
    // It will be called explicitly from the startup script in index.html
});

// Make essential functions globally available
window.initApp = initApp;
window.initAppState = initAppState;
window.createTestData = createTestData;

// Add references to functions from other modules
try {
    // These should be defined in system-operations.js
    if (typeof addStar === 'function') window.addStar = addStar;
    if (typeof deleteStar === 'function') window.deleteStar = deleteStar;
    
    // This should be defined in ui-handlers.js
    if (typeof updateStarHeaders === 'function') window.updateStarHeaders = updateStarHeaders;
    
    // These should be defined in canvas-drawing.js
    if (typeof drawGalaxyMap === 'function') window.drawGalaxyMap = drawGalaxyMap;
    if (typeof drawSystemPreview === 'function') window.drawSystemPreview = drawSystemPreview;
    if (typeof centerMapView === 'function') window.centerMapView = centerMapView;
    if (typeof initCanvas === 'function') window.initCanvas = initCanvas;
    
    // This should be defined in ui-handlers.js
    if (typeof initUI === 'function') window.initUI = initUI;
    if (typeof initCanvasHandlers === 'function') window.initCanvasHandlers = initCanvasHandlers;
} catch (e) {
    console.error('Error exporting functions to global scope:', e);
} 