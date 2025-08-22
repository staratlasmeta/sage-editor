// === Main Application Entry Point ===

// Global editor state
const editor = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    camera: { x: 0, y: 0, zoom: 1 },
    nodes: new Map(),
    connections: new Map(),
    mode: 'edit',  // 'edit', 'view', 'connection', 'simulation'
    isDragging: false,
    isNodeDragging: false,
    dragStart: null,
    dragOffsets: null,
    isResizing: false,
    resizingNode: null,
    resizeStart: null,
    selectedNode: null,
    selectedNodes: null,
    selectedConnection: null,  // Selected connection for deletion
    hoveredNode: null,
    hoveredHandle: null,
    connectingFrom: null,
    lastMouse: { x: 0, y: 0 },
    showGrid: true,
    showLabels: true,
    snapToGrid: true,
    selectionBox: null,  // For multi-select box
    isSelecting: false,  // Track if we're drawing selection box
    frameTime: 0,
    lastFrameTime: 0,
    debugResize: false,  // Enable with: editor.debugResize = true
    dpr: window.devicePixelRatio || 1,  // Device pixel ratio for high-DPI support
    clipboard: null,  // Store copied node data
    collapsedNodes: new Set(),  // Track which nodes have collapsed children
    milestones: ['C4'],  // Available milestones (C4 is default)
    tags: ['Career']  // Available tags (Career is default)
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeEditor();
});

/**
 * Initialize the editor
 */
function initializeEditor() {
    // Export editor for debugging and global access
    window.editor = editor;
    
    // Get canvas element - updated ID
    editor.canvas = document.getElementById('canvas');
    if (!editor.canvas) {
        console.error('Canvas element not found');
        return;
    }
    
    editor.ctx = editor.canvas.getContext('2d');
    
    // Setup canvas
    window.CanvasManager.setupCanvas(editor);
    
    // Setup event listeners
    window.EventHandlers.setupEventListeners(editor);
    
    // Setup bulk edit listeners
    if (window.BulkEdit) {
        window.BulkEdit.setupBulkEditListeners(editor);
    }
    
    // Start animation loop
    window.Rendering.animate(editor);
    
    // Set initial mode
    window.UIControls.setMode(editor, 'edit');
    
    // Initialize UI controls and wire help modal
    if (window.UIControls && typeof window.UIControls.initializeUI === 'function') {
        window.UIControls.initializeUI(editor);
    }
    
    console.log('Research Nodes Editor initialized successfully');
    
    // Auto-load the research nodes configuration file
    autoLoadResearchNodes();
}

/**
 * Automatically load the research nodes configuration file
 */
async function autoLoadResearchNodes() {
    console.log('Starting automatic research nodes loading...');
    
    try {
        // Load the research_nodes-careercombatspread.json file from SAGE Editor Suite
        const nodesUrl = '../SAGE Editor Suite/Research Nodes/research_nodes-careercombatspread.json';
        console.log('Loading research nodes file:', nodesUrl);
        
        const response = await fetch(nodesUrl);
        if (response.ok) {
            const data = await response.json();
            console.log('Successfully loaded research nodes file');
            
            // Clear existing data
            editor.nodes.clear();
            editor.connections.clear();
            editor.collapsedNodes.clear();
            
            // Load milestones and tags
            if (data.milestones) {
                editor.milestones = data.milestones;
            }
            if (data.tags) {
                editor.tags = data.tags;
            }
            
            // Load nodes
            data.nodes.forEach(nodeData => {
                window.NodeManager.createNode(editor, nodeData);
            });
            
            // Load connections
            data.connections.forEach(conn => {
                // Add default type if not present
                if (!conn.type) {
                    conn.type = 'linear';
                }
                
                editor.connections.set(`${conn.from}_${conn.to}`, conn);
                
                // Establish parent-child relationship
                const toNode = editor.nodes.get(conn.to);
                if (toNode) {
                    toNode.parent = conn.from;
                    // Update color to inherit from parent
                    toNode.color = window.NodeManager.getNodeColor(toNode, editor);
                }
            });
            
            // Restore collapsed nodes state
            if (data.collapsedNodes && Array.isArray(data.collapsedNodes)) {
                data.collapsedNodes.forEach(nodeId => {
                    if (editor.nodes.has(nodeId)) {
                        editor.collapsedNodes.add(nodeId);
                    }
                });
            }
            
            // Fit view to show all nodes
            if (window.CanvasManager && window.CanvasManager.fitToScreen) {
                window.CanvasManager.fitToScreen(editor);
            }
            
            // Activate simulation mode
            console.log('Activating simulation mode...');
            
            // Add a small delay to ensure all elements are loaded
            setTimeout(() => {
                try {
                    console.log('Setting mode to simulation...');
                    window.UIControls.setMode(window.editor, 'simulation');
                    console.log('Simulation mode activated');
                    
                    // Check if career panel is visible
                    const careerPanel = document.getElementById('careerXPPanel');
                    if (careerPanel) {
                        console.log('Career panel found, display:', careerPanel.style.display);
                        
                        // Force show the career panel
                        careerPanel.style.display = 'block';
                    } else {
                        console.log('Career panel not found!');
                    }
                    
                    // Ensure simulation is initialized
                    if (window.Simulation && window.Simulation.initializeSimulation) {
                        console.log('Initializing simulation...');
                        window.Simulation.initializeSimulation(window.editor);
                        window.Simulation.updateSimulationUI(window.editor);
                    }
                } catch (error) {
                    console.error('Error activating simulation mode:', error);
                }
            }, 500);
            
            // Show success notification
            const notification = document.createElement('div');
            notification.textContent = 'Research nodes loaded - Simulation mode active';
            notification.style.position = 'fixed';
            notification.style.bottom = '20px';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            notification.style.color = 'white';
            notification.style.padding = '10px 20px';
            notification.style.borderRadius = '5px';
            notification.style.zIndex = '9999';
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 3000);
            
        } else {
            console.error('Failed to load research nodes file:', response.status);
            console.log('You can manually load node files using the File menu.');
        }
    } catch (error) {
        console.error('Error loading research nodes file:', error);
        
        // Check if this is a CORS error from file:// protocol
        if (window.location.protocol === 'file:') {
            console.log('⚠️ CORS Error: Cannot load files when running from file:// protocol');
            console.log('This is expected when running locally. The automatic loading will work when deployed to a web server.');
            console.log('For local development, you can:');
            console.log('1. Use a local web server (python -m http.server or Live Server extension)');
            console.log('2. Manually load files using the File menu');
            console.log('3. Deploy to GitHub Pages where it will work automatically');
        } else {
            console.log('You can manually load node files using the File menu.');
        }
    }
} 