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
    
    console.log('Research Nodes Editor initialized successfully');
}

// Export editor for debugging
window.editor = editor; 