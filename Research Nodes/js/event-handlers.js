// === MODULE: Event Handlers ===
// Handles mouse and keyboard events

/**
 * Handle mouse down event
 */
function onMouseDown(editor, e) {
    console.log('Mouse down event:', e.button, 'mode:', editor.mode);
    
    const rect = editor.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const worldPos = window.CanvasManager.screenToWorld(editor, x, y);
    
    // Check for node or connection at cursor position
    const node = window.NodeManager.getNodeAt(editor, worldPos.x, worldPos.y);
    const connection = window.ConnectionManager.getConnectionAt(editor, worldPos.x, worldPos.y);
    
    // Check if clicking outside node editor modal (but only on empty space)
    const nodeEditor = document.getElementById('nodeEditor');
    const isModalVisible = nodeEditor.style.display === 'block';
    
    // Handle simulation mode clicks
    if (editor.mode === 'simulation' && node) {
        if (e.button === 0) { // Left click - spend point
            if (window.Simulation) {
                window.Simulation.spendPoint(editor, node.id);
            }
        } else if (e.button === 2) { // Right click - remove point
            e.preventDefault();
            if (window.Simulation) {
                window.Simulation.removePoint(editor, node.id);
            }
        }
        return;
    }
    
    // Handle middle click (button 1) FIRST
    if (e.button === 1) {
        console.log('Middle mouse button pressed! Node:', node, 'Coords:', x, y);
        e.preventDefault();
        e.stopPropagation();
        
        if (node) {
            // Middle click on node - toggle collapse
            console.log('Toggling collapse for node:', node.id, node.name);
            window.NodeManager.toggleNodeCollapse(editor, node);
        } else {
            // Middle click on empty space - start panning
            console.log('Starting middle mouse panning at', x, y);
            editor.isDragging = true;
            editor.dragStart = { x: x, y: y };
            editor.canvas.classList.add('grabbing');
            console.log('isDragging set to:', editor.isDragging);
        }
        return; // Don't process other events
    }
    
    // Handle left click (button 0)
    if (e.button === 0) {
        // Check if we clicked on a node editor
        if (isModalVisible && nodeEditor.contains(e.target)) {
            // Click is inside modal, do nothing
            return;
        }
        
        // If clicked outside modal, hide it
        if (isModalVisible && !node) {
            window.NodeManager.hideNodeEditor();
        }
        
        // Priority: nodes over connections
        if (node) {
            // Check if we're in the middle of connecting
            if (editor.mode === 'edit' && editor.connectingFrom) {
                if (node !== editor.connectingFrom) {
                    // Complete connection to another node
                    window.ConnectionManager.createConnection(editor, editor.connectingFrom, node);
                    editor.connectingFrom = null;
                }
                // Don't proceed with node selection when completing a connection
                return;
            }
            
            // Clear connection selection when selecting a node
            editor.selectedConnection = null;
            window.UIControls.hideKeyboardHelp();
            
            // Check if clicking on resize handle
            if (editor.mode === 'edit' && editor.hoveredHandle === node) {
                // Save undo state before resizing starts
                window.NodeManager.saveUndoState(editor);
                
                // Start resizing
                editor.isResizing = true;
                editor.resizingNode = node;
                
                // Calculate visual dimensions based on node level
                const visualWidth = node.level === 0 ? node.width * 1.2 : node.width;
                const visualHeight = node.level === 0 ? node.height * 1.2 : node.height;
                
                // Store the initial state with visual dimensions
                editor.resizeStart = {
                    nodeLeft: node.x - visualWidth / 2,
                    nodeTop: node.y - visualHeight / 2,
                    isLevel0: node.level === 0,
                    originalX: node.x,  // Store original center position
                    originalY: node.y,
                    originalWidth: node.width,  // Store original actual dimensions
                    originalHeight: node.height
                };
            } else {
                // Handle node selection
                if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
                    // Check if this node is part of current multi-selection
                    const isPartOfMultiSelect = editor.selectedNodes && editor.selectedNodes.has(node);
                    
                    if (!isPartOfMultiSelect) {
                        // Regular click - select single node only if not part of multi-selection
                        editor.selectedNode = node;
                        editor.selectedNodes = null;
                        
                        // Update bulk edit toolbar
                        if (window.BulkEdit) {
                            window.BulkEdit.updateBulkEditToolbar(editor);
                        }
                    }
                    
                    // Only allow node dragging in edit mode
                    if (editor.mode === 'edit') {
                        // Save undo state before dragging starts
                        window.NodeManager.saveUndoState(editor);
                        
                        editor.isNodeDragging = true;
                        
                        // Store the offset from the mouse to the node center
                        editor.dragStart = { 
                            x: worldPos.x - node.x,
                            y: worldPos.y - node.y
                        };
                        
                        // If dragging with multiple nodes selected, calculate offsets for all
                        if (editor.selectedNodes && editor.selectedNodes.size > 0) {
                            editor.dragOffsets = new Map();
                            editor.selectedNodes.forEach(selectedNode => {
                                editor.dragOffsets.set(selectedNode.id, {
                                    x: worldPos.x - selectedNode.x,
                                    y: worldPos.y - selectedNode.y
                                });
                            });
                        }
                    }
                } else if (e.shiftKey) {  // Allow in both modes
                    // Shift+click - toggle collapse state
                    e.preventDefault(); // Prevent text selection
                    console.log('Shift+click detected for collapse toggle');
                    window.NodeManager.toggleNodeCollapse(editor, node);
                } else if (e.ctrlKey) {
                    // Ctrl+click - toggle multi-selection
                    e.preventDefault(); // Prevent browser default behavior
                    
                    if (!editor.selectedNodes) {
                        editor.selectedNodes = new Set();
                        if (editor.selectedNode) {
                            editor.selectedNodes.add(editor.selectedNode);
                        }
                    }
                    
                    if (editor.selectedNodes.has(node)) {
                        editor.selectedNodes.delete(node);
                        if (editor.selectedNodes.size === 0) {
                            editor.selectedNodes = null;
                            editor.selectedNode = null;
                        } else {
                            editor.selectedNode = Array.from(editor.selectedNodes)[editor.selectedNodes.size - 1];
                        }
                    } else {
                        editor.selectedNodes.add(node);
                        editor.selectedNode = node;
                    }
                    
                    // Update bulk edit toolbar
                    if (window.BulkEdit) {
                        window.BulkEdit.updateBulkEditToolbar(editor);
                    }
                } else if (e.altKey) {
                    // Alt+drag - duplicate node(s)
                    e.preventDefault();
                    window.NodeManager.saveUndoState(editor);
                    
                    // Store original positions for offset calculation
                    const originalPositions = new Map();
                    const nodeMapping = new Map(); // Map old node IDs to new nodes
                    const nodesToDuplicate = new Set();
                    
                    if (editor.selectedNodes && editor.selectedNodes.size > 0 && editor.selectedNodes.has(node)) {
                        // Multiple nodes selected - duplicate all selected nodes
                        editor.selectedNodes.forEach(selectedNode => {
                            nodesToDuplicate.add(selectedNode);
                            originalPositions.set(selectedNode.id, { x: selectedNode.x, y: selectedNode.y });
                        });
                    } else {
                        // Single node selected
                        nodesToDuplicate.add(node);
                        originalPositions.set(node.id, { x: node.x, y: node.y });
                    }
                    
                    // If any node is collapsed, include all its descendants
                    const expandedNodesToDuplicate = new Set(nodesToDuplicate);
                    nodesToDuplicate.forEach(nodeItem => {
                        if (editor.collapsedNodes.has(nodeItem.id)) {
                            const descendants = window.NodeManager.getDescendants(editor, nodeItem.id);
                            descendants.forEach(descendantId => {
                                const descendantNode = editor.nodes.get(descendantId);
                                if (descendantNode) {
                                    expandedNodesToDuplicate.add(descendantNode);
                                    originalPositions.set(descendantNode.id, { x: descendantNode.x, y: descendantNode.y });
                                }
                            });
                        }
                    });
                    
                    // First pass: create all nodes
                    const newNodes = [];
                    expandedNodesToDuplicate.forEach(nodeItem => {
                        // For single node alt-drag, duplicate connections
                        const duplicateConnections = nodesToDuplicate.size === 1 && !editor.collapsedNodes.has(nodeItem.id);
                        const newNode = window.NodeManager.duplicateNode(editor, nodeItem, 0, 0, duplicateConnections, false);
                        newNodes.push(newNode);
                        nodeMapping.set(nodeItem.id, newNode);
                    });
                    
                    // Second pass: recreate all connections between duplicated nodes (only for multi-select)
                    if (nodesToDuplicate.size > 1) {
                        editor.connections.forEach((conn, key) => {
                            const fromNode = nodeMapping.get(conn.from);
                            const toNode = nodeMapping.get(conn.to);
                            if (fromNode && toNode) {
                                // Both nodes were duplicated, recreate the connection with its type
                                window.ConnectionManager.createConnection(editor, fromNode, toNode, conn.type || 'linear');
                            }
                        });
                    }
                    
                    // Third pass: update parent references and colors for proper hierarchy
                    expandedNodesToDuplicate.forEach(nodeItem => {
                        if (nodeItem.parent) {
                            const newNode = nodeMapping.get(nodeItem.id);
                            const newParent = nodeMapping.get(nodeItem.parent);
                            if (newNode && newParent) {
                                newNode.parent = newParent.id;
                                // Ensure the duplicated child inherits the correct color
                                if (!newNode.customColor) {
                                    newNode.color = window.NodeManager.getNodeColor(newNode, editor);
                                }
                            } else if (newNode) {
                                // Parent wasn't duplicated, keep original parent reference
                                // This maintains the color inheritance from the original parent
                                newNode.parent = nodeItem.parent;
                                if (!newNode.customColor) {
                                    newNode.color = window.NodeManager.getNodeColor(newNode, editor);
                                }
                            }
                        }
                    });
                    
                    // Fourth pass: preserve collapsed state
                    nodesToDuplicate.forEach(nodeItem => {
                        if (editor.collapsedNodes.has(nodeItem.id)) {
                            const newNode = nodeMapping.get(nodeItem.id);
                            if (newNode) {
                                editor.collapsedNodes.add(newNode.id);
                            }
                        }
                    });
                    
                    // Select the new nodes and prepare for dragging
                    const visibleNewNodes = [];
                    nodesToDuplicate.forEach(nodeItem => {
                        const newNode = nodeMapping.get(nodeItem.id);
                        if (newNode) {
                            visibleNewNodes.push(newNode);
                        }
                    });
                    
                    if (visibleNewNodes.length > 1) {
                        editor.selectedNodes = new Set(visibleNewNodes);
                        editor.selectedNode = nodeMapping.get(node.id) || visibleNewNodes[0];
                        
                        // Calculate offsets from the clicked node for multi-node dragging
                        editor.dragOffsets = new Map();
                        const clickedPos = originalPositions.get(node.id);
                        visibleNewNodes.forEach(newNode => {
                            const originalNode = Array.from(expandedNodesToDuplicate).find(n => nodeMapping.get(n.id) === newNode);
                            if (originalNode) {
                                const origPos = originalPositions.get(originalNode.id);
                                editor.dragOffsets.set(newNode.id, {
                                    x: worldPos.x - origPos.x,
                                    y: worldPos.y - origPos.y
                                });
                            }
                        });
                    } else {
                        editor.selectedNode = visibleNewNodes[0];
                        editor.selectedNodes = null;
                    }
                    
                    // Start dragging the duplicated node(s)
                    editor.isNodeDragging = true;
                    
                    window.NodeManager.updateStats(editor);
                    
                    // Mark for redraw
                    if (window.Rendering && window.Rendering.setNeedsRedraw) {
                        window.Rendering.setNeedsRedraw();
                    }
                }
            }
        } else if (connection && editor.mode === 'edit') {
            // Click on connection - select it
            editor.selectedConnection = connection;
            editor.selectedNode = null;
            editor.selectedNodes = null;
            
            // Show keyboard help for connections
            window.UIControls.showKeyboardHelp();
            
            // Mark for redraw
            if (window.Rendering && window.Rendering.setNeedsRedraw) {
                window.Rendering.setNeedsRedraw();
            }
        } else if (!e.shiftKey && !editor.isSelecting) {
            // No node clicked
            if (e.ctrlKey) {
                // Start selection box
                editor.isSelecting = true;
                editor.selectionBox = {
                    startX: x,
                    startY: y,
                    endX: x,
                    endY: y
                };
                editor.selectedNodes = new Set();
                editor.selectedNode = null;
            } else if (editor.mode === 'edit' && editor.connectingFrom) {
                // Create new node and connect to it
                const newNode = window.NodeManager.createNodeAt(editor, worldPos.x, worldPos.y, false);
                window.ConnectionManager.createConnection(editor, editor.connectingFrom, newNode);
                editor.connectingFrom = null;
                editor.selectedNode = newNode;
                // Start dragging the new node if mouse is held down
                editor.isNodeDragging = true;
                editor.dragStart = { x: 0, y: 0 }; // Node is created at cursor position
            } else {
                // Clear selection when clicking empty space without Ctrl
                if (!e.ctrlKey) {
                    editor.selectedNode = null;
                    editor.selectedNodes = null;
                    editor.selectedConnection = null;
                    window.UIControls.hideKeyboardHelp();
                    
                    // Update bulk edit toolbar
                    if (window.BulkEdit) {
                        window.BulkEdit.updateBulkEditToolbar(editor);
                    }
                    // Update stats after clearing selection
                    if (window.NodeManager) {
                        window.NodeManager.updateStats(editor);
                    }
                }
                // Start canvas panning in all modes
                editor.isDragging = true;
                editor.dragStart = { x: x, y: y };
                editor.canvas.classList.add('grabbing');
            }
        }
    }
    // Handle right click (button 2) - create new node or handle connections in edit mode
    else if (e.button === 2 && editor.mode === 'edit') {
        e.preventDefault();
        
        // Check if we need to hide modal
        const shouldHideModal = isModalVisible && !nodeEditor.contains(e.target) && !node;
        
        if (editor.connectingFrom) {
            // We're in the middle of connecting
            if (node && node !== editor.connectingFrom) {
                // Complete connection to another node
                window.ConnectionManager.createConnection(editor, editor.connectingFrom, node);
                editor.connectingFrom = null;
            } else {
                // Clicked on empty space or same node - abort connection
                editor.connectingFrom = null;
            }
        } else {
            // Not connecting yet
            if (node) {
                // Start connection from this node
                editor.connectingFrom = node;
            } else {
                // Empty space - hide modal if needed AND create node
                if (shouldHideModal) {
                    window.NodeManager.hideNodeEditor();
                }
                // Always create new node at cursor position when right-clicking empty space
                window.NodeManager.createNodeAt(editor, worldPos.x, worldPos.y, false);
            }
        }
    }
    
    editor.lastMouse = { x: x, y: y };
}

/**
 * Handle mouse move event
 */
let lastCoordUpdate = 0;
let animationFrameId = null;

function onMouseMove(editor, e) {
    const rect = editor.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const worldPos = window.CanvasManager.screenToWorld(editor, x, y);
    
    // Mouse coordinates update removed - no longer displayed in UI
    
    // Check hover
    const node = window.NodeManager.getNodeAt(editor, worldPos.x, worldPos.y);
    let hoveredHandle = null;
    
    // Check if hovering over resize handle
    if (node && editor.mode === 'edit') {
        const nodeWidth = node.level === 0 ? node.width * 1.2 : node.width;
        const nodeHeight = node.level === 0 ? node.height * 1.2 : node.height;
        const handleSize = 16;
        const handleOffset = 4; // Inset from the corner
        const handleX = node.x + nodeWidth / 2 - handleSize/2 - handleOffset;
        const handleY = node.y + nodeHeight / 2 - handleSize/2 - handleOffset;
        const handleRadius = handleSize / 2;
        
        // Check if mouse is within the circular handle
        const dx = worldPos.x - handleX;
        const dy = worldPos.y - handleY;
        const distSq = dx * dx + dy * dy;
        
        if (distSq <= handleRadius * handleRadius) {
            hoveredHandle = node;
        }
    }
    
    if (node !== editor.hoveredNode || hoveredHandle !== editor.hoveredHandle) {
        editor.hoveredNode = node;
        editor.hoveredHandle = hoveredHandle;
        // Show/hide details on hover
        if (node && !hoveredHandle) {
            window.UIControls.showNodeDetails(editor, node);
        } else {
            window.UIControls.hideNodeDetails();
        }
        // Mark for redraw when hover changes
        if (window.Rendering && window.Rendering.setNeedsRedraw) {
            window.Rendering.setNeedsRedraw();
        }
    }
    
    // Cancel previous animation frame
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    // Handle dragging in animation frame for smoother performance
    animationFrameId = requestAnimationFrame(() => {
        // Handle dragging
        if (editor.isDragging) {
            const dx = x - editor.dragStart.x;
            const dy = y - editor.dragStart.y;
            editor.camera.x += dx;
            editor.camera.y += dy;
            editor.dragStart = { x: x, y: y };
            // Log only occasionally to avoid spam
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                console.log('Panning:', dx, dy);
            }
        } else if (editor.isNodeDragging && editor.selectedNode) {
            // Handle node dragging with multi-select support
            if (editor.selectedNodes && editor.selectedNodes.size > 0 && editor.dragOffsets) {
                // Move all selected nodes based on their stored offsets
                editor.selectedNodes.forEach(node => {
                    const offset = editor.dragOffsets.get(node.id);
                    if (offset) {
                        let newX = worldPos.x - offset.x;
                        let newY = worldPos.y - offset.y;
                        
                        // Snap to grid if enabled
                        if (editor.snapToGrid) {
                            const gridSize = 25;
                            
                            // Get node dimensions
                            const nodeWidth = node.level === 0 ? node.width * 1.2 : node.width;
                            const nodeHeight = node.level === 0 ? node.height * 1.2 : node.height;
                            
                            // Calculate node edges
                            const leftEdge = newX - nodeWidth / 2;
                            const rightEdge = newX + nodeWidth / 2;
                            const topEdge = newY - nodeHeight / 2;
                            const bottomEdge = newY + nodeHeight / 2;
                            
                            // Function to find the nearest grid line
                            const snapToNearestGrid = (value, gridUnit) => {
                                return Math.round(value / gridUnit) * gridUnit;
                            };
                            
                            // Always use fine grid for consistent snapping
                            const snapGrid = gridSize;
                            
                            // Snap edges to the grid
                            const snappedLeft = snapToNearestGrid(leftEdge, snapGrid);
                            const snappedRight = snapToNearestGrid(rightEdge, snapGrid);
                            const snappedTop = snapToNearestGrid(topEdge, snapGrid);
                            const snappedBottom = snapToNearestGrid(bottomEdge, snapGrid);
                            
                            // Determine which edge is closest to a grid line
                            const leftDist = Math.abs(leftEdge - snappedLeft);
                            const rightDist = Math.abs(rightEdge - snappedRight);
                            const topDist = Math.abs(topEdge - snappedTop);
                            const bottomDist = Math.abs(bottomEdge - snappedBottom);
                            
                            // Snap based on the closest edge
                            if (leftDist < rightDist) {
                                newX = snappedLeft + nodeWidth / 2;
                            } else {
                                newX = snappedRight - nodeWidth / 2;
                            }
                            
                            if (topDist < bottomDist) {
                                newY = snappedTop + nodeHeight / 2;
                            } else {
                                newY = snappedBottom - nodeHeight / 2;
                            }
                        }
                        
                        // Calculate movement delta
                        const deltaX = newX - node.x;
                        const deltaY = newY - node.y;
                        
                        // Update node position
                        node.x = newX;
                        node.y = newY;
                        
                        // If this node is collapsed, move all its descendants with it
                        if (editor.collapsedNodes.has(node.id)) {
                            const descendants = window.NodeManager.getDescendants(editor, node.id);
                            descendants.forEach(descendantId => {
                                const descendantNode = editor.nodes.get(descendantId);
                                if (descendantNode && !editor.selectedNodes.has(descendantNode)) {
                                    descendantNode.x += deltaX;
                                    descendantNode.y += deltaY;
                                }
                            });
                        }
                    }
                });
            } else {
                // Single node dragging - maintain the offset from where we clicked
                let newX = worldPos.x - editor.dragStart.x;
                let newY = worldPos.y - editor.dragStart.y;
                
                // Snap to grid if enabled
                if (editor.snapToGrid) {
                    const gridSize = 25;
                    
                    // Get node dimensions
                    const nodeWidth = editor.selectedNode.level === 0 ? editor.selectedNode.width * 1.2 : editor.selectedNode.width;
                    const nodeHeight = editor.selectedNode.level === 0 ? editor.selectedNode.height * 1.2 : editor.selectedNode.height;
                    
                    // Calculate node edges
                    const leftEdge = newX - nodeWidth / 2;
                    const rightEdge = newX + nodeWidth / 2;
                    const topEdge = newY - nodeHeight / 2;
                    const bottomEdge = newY + nodeHeight / 2;
                    
                    // Function to find the nearest grid line
                    const snapToNearestGrid = (value, gridUnit) => {
                        return Math.round(value / gridUnit) * gridUnit;
                    };
                    
                    // Always use fine grid for consistent snapping
                    const snapGrid = gridSize;
                    
                    // Snap edges to the grid
                    const snappedLeft = snapToNearestGrid(leftEdge, snapGrid);
                    const snappedRight = snapToNearestGrid(rightEdge, snapGrid);
                    const snappedTop = snapToNearestGrid(topEdge, snapGrid);
                    const snappedBottom = snapToNearestGrid(bottomEdge, snapGrid);
                    
                    // Determine which edge is closest to a grid line
                    const leftDist = Math.abs(leftEdge - snappedLeft);
                    const rightDist = Math.abs(rightEdge - snappedRight);
                    const topDist = Math.abs(topEdge - snappedTop);
                    const bottomDist = Math.abs(bottomEdge - snappedBottom);
                    
                    // Snap based on the closest edge
                    if (leftDist < rightDist) {
                        newX = snappedLeft + nodeWidth / 2;
                    } else {
                        newX = snappedRight - nodeWidth / 2;
                    }
                    
                    if (topDist < bottomDist) {
                        newY = snappedTop + nodeHeight / 2;
                    } else {
                        newY = snappedBottom - nodeHeight / 2;
                    }
                }
                
                // Calculate movement delta
                const deltaX = newX - editor.selectedNode.x;
                const deltaY = newY - editor.selectedNode.y;
                
                // Update selected node position
                editor.selectedNode.x = newX;
                editor.selectedNode.y = newY;
                
                // If this node is collapsed, move all its descendants with it
                if (editor.collapsedNodes.has(editor.selectedNode.id)) {
                    const descendants = window.NodeManager.getDescendants(editor, editor.selectedNode.id);
                    descendants.forEach(descendantId => {
                        const descendantNode = editor.nodes.get(descendantId);
                        if (descendantNode) {
                            descendantNode.x += deltaX;
                            descendantNode.y += deltaY;
                        }
                    });
                }
            }
        } else if (editor.isResizing && editor.resizingNode) {
            // Handle node resizing - keep top-left fixed
            const gridSize = 25;
            const node = editor.resizingNode;
            
            // Get the visual scale for parent nodes
            const visualScale = editor.resizeStart.isLevel0 ? 1.2 : 1.0;
            
            // Calculate desired bottom-right corner in world space
            let desiredRight = worldPos.x;
            let desiredBottom = worldPos.y;
            
            // If snap to grid is enabled, snap the mouse position too for cleaner resizing
            if (editor.snapToGrid) {
                desiredRight = Math.round(desiredRight / gridSize) * gridSize;
                desiredBottom = Math.round(desiredBottom / gridSize) * gridSize;
            }
            
            // Calculate new visual dimensions
            let newVisualWidth = desiredRight - editor.resizeStart.nodeLeft;
            let newVisualHeight = desiredBottom - editor.resizeStart.nodeTop;
            
            // Ensure minimum visual size
            const minVisualSize = 50 * visualScale;  // At least 2 grid units
            newVisualWidth = Math.max(minVisualSize, newVisualWidth);
            newVisualHeight = Math.max(minVisualSize, newVisualHeight);
            
            // If snap to grid is enabled, snap the VISUAL dimensions to grid
            if (editor.snapToGrid) {
                newVisualWidth = Math.round(newVisualWidth / gridSize) * gridSize;
                newVisualHeight = Math.round(newVisualHeight / gridSize) * gridSize;
            }
            
            // Convert to actual node dimensions
            const newWidth = newVisualWidth / visualScale;
            const newHeight = newVisualHeight / visualScale;
            
            // Update node dimensions
            node.width = newWidth;
            node.height = newHeight;
            
            // Update center position keeping top-left fixed
            node.x = editor.resizeStart.nodeLeft + newVisualWidth / 2;
            node.y = editor.resizeStart.nodeTop + newVisualHeight / 2;
            
            // Mark for redraw
            if (window.Rendering && window.Rendering.setNeedsRedraw) {
                window.Rendering.setNeedsRedraw();
            }
        } else if (editor.isSelecting && editor.selectionBox) {
            // Update selection box
            editor.selectionBox.endX = x;
            editor.selectionBox.endY = y;
            
            // Only update selection every few pixels to improve performance
            const dx = Math.abs(x - (editor.selectionBox.lastUpdateX || 0));
            const dy = Math.abs(y - (editor.selectionBox.lastUpdateY || 0));
            
            if (dx > 5 || dy > 5) {
                editor.selectionBox.lastUpdateX = x;
                editor.selectionBox.lastUpdateY = y;
                
                // Calculate world coordinates for selection box
                const worldStart = window.CanvasManager.screenToWorld(editor, editor.selectionBox.startX, editor.selectionBox.startY);
                const worldEnd = window.CanvasManager.screenToWorld(editor, editor.selectionBox.endX, editor.selectionBox.endY);
                
                // Calculate box bounds
                const minX = Math.min(worldStart.x, worldEnd.x);
                const maxX = Math.max(worldStart.x, worldEnd.x);
                const minY = Math.min(worldStart.y, worldEnd.y);
                const maxY = Math.max(worldStart.y, worldEnd.y);
                
                // Select nodes within box
                editor.selectedNodes = new Set();
                editor.nodes.forEach(node => {
                    if (node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY) {
                        editor.selectedNodes.add(node);
                    }
                });
                
                // Update primary selected node
                if (editor.selectedNodes.size > 0) {
                    editor.selectedNode = Array.from(editor.selectedNodes)[editor.selectedNodes.size - 1];
                } else {
                    editor.selectedNode = null;
                }
                
                // Update bulk edit toolbar and stats
                if (window.BulkEdit) {
                    window.BulkEdit.updateBulkEditToolbar(editor);
                }
                if (window.NodeManager) {
                    window.NodeManager.updateStats(editor);
                }
            }
        }
    });
    
    // Update cursor
    updateCursor(editor, node);
    
    editor.lastMouse = { x: x, y: y };
}

/**
 * Handle mouse up event
 */
function onMouseUp(editor, e) {
    // Only clear dragging states if the appropriate button was released
    if (e.button === 0) {  // Left button
        editor.isNodeDragging = false;
        editor.isSelecting = false;
        editor.isResizing = false;
        editor.selectionBox = null;
        editor.dragOffsets = null;
        editor.resizingNode = null;
        editor.resizeStart = null;
        
        // Also stop panning if it was started with left button
        if (editor.isDragging) {
            editor.isDragging = false;
            editor.canvas.classList.remove('grabbing');
        }
    } else if (e.button === 1) {  // Middle button
        // Stop panning if it was started with middle button
        if (editor.isDragging) {
            console.log('Stopping middle mouse panning');
            editor.isDragging = false;
            editor.canvas.classList.remove('grabbing');
        }
    }
}

/**
 * Handle mouse wheel event
 */
function onWheel(editor, e) {
    window.CanvasManager.handleWheel(editor, e);
}

/**
 * Handle double click event
 */
function onDoubleClick(editor, e) {
    const rect = editor.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const worldPos = window.CanvasManager.screenToWorld(editor, x, y);
    
    const node = window.NodeManager.getNodeAt(editor, worldPos.x, worldPos.y);
    if (node && editor.mode === 'edit') {
        window.NodeManager.showNodeEditor(editor, node);
    }
}

/**
 * Handle context menu (right-click menu)
 */
function onContextMenu(editor, e) {
    // Always prevent context menu to allow our custom right-click behavior
    e.preventDefault();
}

/**
 * Update cursor based on mode and hover state
 */
function updateCursor(editor, hoveredNode) {
    editor.canvas.classList.remove('grab', 'grabbing', 'crosshair', 'se-resize');
    
    if (editor.hoveredHandle) {
        // Show resize cursor when hovering over handle
        editor.canvas.classList.add('se-resize');
    } else if (editor.mode === 'view') {
        editor.canvas.classList.add(editor.isDragging ? 'grabbing' : 'grab');
    } else if (editor.mode === 'edit') {
        // Show crosshair when connecting
        if (editor.connectingFrom) {
            editor.canvas.classList.add('crosshair');
        } else {
            editor.canvas.classList.add((editor.isDragging || editor.isNodeDragging || editor.isResizing) ? 'grabbing' : 'grab');
        }
    }
}

/**
 * Handle keyboard events
 */
function onKeyDown(editor, e) {
    // Check if focus is on an input element (text field, textarea, etc.)
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
    );
    
    // Delete key
    if (e.key === 'Delete') {
        if (editor.selectedConnection) {
            // Save state for undo
            window.NodeManager.saveUndoState(editor);
            
            const connection = editor.connections.get(editor.selectedConnection);
            if (connection) {
                window.ConnectionManager.removeConnection(editor, connection.from, connection.to);
            }
            editor.selectedConnection = null;
            window.UIControls.hideKeyboardHelp();
            window.Rendering.setNeedsRedraw();
            return;
        }
        if (editor.selectedNode) {
            // Delete selected node(s)
            window.NodeManager.saveUndoState(editor);
            
            if (editor.selectedNodes && editor.selectedNodes.size > 0) {
                // Delete multiple nodes
                editor.selectedNodes.forEach(node => {
                    window.NodeManager.deleteNodeById(editor, node.id);
                });
                editor.selectedNodes = null;
            } else {
                // Delete single node
                window.NodeManager.deleteNode(editor);
            }
            editor.selectedNode = null;
            
            // Update bulk edit toolbar
            if (window.BulkEdit) {
                window.BulkEdit.updateBulkEditToolbar(editor);
            }
            // Update stats after deletion
            if (window.NodeManager) {
                window.NodeManager.updateStats(editor);
            }
        }
    }
    // Only intercept these shortcuts when not in an input field
    else if (!isInputFocused) {
        // Ctrl+C - copy
        if (e.ctrlKey && e.key === 'c' && !e.shiftKey && editor.selectedNode) {
            e.preventDefault();
            window.NodeManager.copyNodes(editor);
        }
        // Ctrl+V - paste
        else if (e.ctrlKey && e.key === 'v' && !e.shiftKey) {
            e.preventDefault();
            window.NodeManager.pasteNodes(editor);
        }
        // Ctrl+D - duplicate
        else if (e.ctrlKey && e.key === 'd' && !e.shiftKey && editor.selectedNode) {
            e.preventDefault();
            window.NodeManager.saveUndoState(editor);
            
            if (editor.selectedNodes && editor.selectedNodes.size > 0) {
                // Duplicate multiple nodes
                const newNodes = [];
                editor.selectedNodes.forEach(node => {
                    const newNode = window.NodeManager.duplicateNode(editor, node, 50, 50, false);
                    newNodes.push(newNode);
                });
                // Select the duplicated nodes
                editor.selectedNodes = new Set(newNodes);
                editor.selectedNode = newNodes[newNodes.length - 1];
            } else {
                // Duplicate single node
                const newNode = window.NodeManager.duplicateNode(editor, editor.selectedNode, 50, 50, false);
                editor.selectedNode = newNode;
                editor.selectedNodes = null;
            }
            
            window.NodeManager.updateStats(editor);
            if (window.Rendering && window.Rendering.setNeedsRedraw) {
                window.Rendering.setNeedsRedraw();
            }
        }
        // Ctrl+Z - undo
        else if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            window.NodeManager.undo(editor);
        }
        // Ctrl+Shift+Z or Ctrl+Y - redo
        else if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
            e.preventDefault();
            window.NodeManager.redo(editor);
        }
    }
    
    // Number keys for connection type changes
    if (editor.selectedConnection && e.key >= '1' && e.key <= '6') {
        const connection = editor.connections.get(editor.selectedConnection);
        if (connection) {
            // Save state for undo
            window.NodeManager.saveUndoState(editor);
            
            // Change connection type based on number key
            switch(e.key) {
                case '1':
                    connection.type = 'curved';
                    break;
                case '2':
                    connection.type = 'linear';
                    break;
                case '3':
                    connection.type = 'step';
                    break;
                case '4':
                    connection.type = 'smooth';
                    break;
                case '5':
                    connection.type = 'arc';
                    break;
                case '6':
                    connection.type = 'zigzag';
                    break;
            }
            
            window.Rendering.setNeedsRedraw();
            
            // Show feedback
            const typeName = connection.type.charAt(0).toUpperCase() + connection.type.slice(1);
            window.UIControls.showToast(`Connection type changed to: ${typeName}`);
        }
        return;
    }
}

/**
 * Setup all event listeners
 */
function setupEventListeners(editor) {
    // Canvas events
    editor.canvas.addEventListener('mousedown', (e) => onMouseDown(editor, e));
    editor.canvas.addEventListener('mousemove', (e) => onMouseMove(editor, e));
    editor.canvas.addEventListener('mouseup', (e) => onMouseUp(editor, e));
    editor.canvas.addEventListener('wheel', (e) => onWheel(editor, e));
    editor.canvas.addEventListener('dblclick', (e) => onDoubleClick(editor, e));
    editor.canvas.addEventListener('contextmenu', (e) => onContextMenu(editor, e));
    
    // Prevent middle mouse button default behavior (auto-scrolling)
    editor.canvas.addEventListener('auxclick', (e) => {
        if (e.button === 1) {
            console.log('Auxclick middle button detected');
            e.preventDefault();
            e.stopPropagation();
        }
    });
    
    // Prevent middle mouse button defaults in capture phase
    editor.canvas.addEventListener('mousedown', (e) => {
        if (e.button === 1) {
            e.preventDefault();
            // Don't stop propagation - let it reach our main handler
        }
    }, true);  // Use capture phase
    
    // Keyboard events
    document.addEventListener('keydown', (e) => onKeyDown(editor, e));
    
    // File operations
    document.getElementById('jsonFile').addEventListener('change', (e) => window.FileIO.loadJSON(editor, e));
    document.getElementById('exportJson').addEventListener('click', () => window.FileIO.exportJSON(editor));
    document.getElementById('exportMarkdown').addEventListener('click', () => window.FileIO.exportMarkdown(editor));
    
    // Markdown modal controls
    document.getElementById('copyMarkdownBtn').addEventListener('click', () => {
        const markdownText = document.getElementById('markdownText').value;
        navigator.clipboard.writeText(markdownText)
            .then(() => {
                const btn = document.getElementById('copyMarkdownBtn');
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy to clipboard:', err);
                // Fallback for older browsers
                const textArea = document.getElementById('markdownText');
                textArea.style.display = 'block';
                textArea.select();
                document.execCommand('copy');
                textArea.style.display = 'none';
            });
    });
    
    document.getElementById('closeMarkdownModal').addEventListener('click', () => {
        document.getElementById('markdownModal').style.display = 'none';
    });
    
    document.getElementById('closeMarkdownBtn').addEventListener('click', () => {
        document.getElementById('markdownModal').style.display = 'none';
    });
    
    // View controls
    document.getElementById('resetView').addEventListener('click', () => window.CanvasManager.resetView(editor));
    document.getElementById('fitToScreen').addEventListener('click', () => window.CanvasManager.fitToScreen(editor));
    document.getElementById('toggleGrid').addEventListener('click', () => window.UIControls.toggleGrid(editor));
    document.getElementById('toggleLabels').addEventListener('click', () => window.UIControls.toggleLabels(editor));
    document.getElementById('toggleSnapToGrid').addEventListener('click', () => window.UIControls.toggleSnapToGrid(editor));
    document.getElementById('toggleFPS').addEventListener('click', () => window.UIControls.toggleFPS(editor));
    
    // Mode toggle
    document.getElementById('modeToggle').addEventListener('click', () => {
        const newMode = editor.mode === 'edit' ? 'view' : 'edit';
        window.UIControls.setMode(editor, newMode);
        
        // Update toggle icon
        const button = document.getElementById('modeToggle');
        button.textContent = newMode === 'edit' ? '🔓' : '🔒';
        button.title = newMode === 'edit' ? 'Lock (View Mode)' : 'Unlock (Edit Mode)';
    });
    
    // Simulation mode toggle
    document.getElementById('simulationToggle').addEventListener('click', () => {
        const newMode = editor.mode === 'simulation' ? 'edit' : 'simulation';
        window.UIControls.setMode(editor, newMode);
    });
    
    // Node editor
    document.getElementById('saveNode').addEventListener('click', () => window.NodeManager.saveNodeEdit(editor));
    document.getElementById('deleteNode').addEventListener('click', () => window.NodeManager.deleteNode(editor));
    document.getElementById('cancelEdit').addEventListener('click', () => window.NodeManager.cancelNodeEdit(editor));
    
    // Management buttons
    document.getElementById('manageMilestones').addEventListener('click', (e) => {
        e.preventDefault();
        window.NodeManager.showManageModal(editor, 'milestone');
    });
    document.getElementById('manageTags').addEventListener('click', (e) => {
        e.preventDefault();
        window.NodeManager.showManageModal(editor, 'tag');
    });
    
    // Stats panel close button
    document.getElementById('closeStatsPanel')?.addEventListener('click', () => {
        document.getElementById('simulationStatsPanel').style.display = 'none';
    });
}

/**
 * Show simulation statistics panel
 */
function showSimulationStats(editor) {
    if (!window.Simulation) return;
    
    const stats = window.Simulation.getSimulationStats();
    const statsPanel = document.getElementById('simulationStatsPanel');
    
    // Update progress stats
    const progressHtml = `
        <div class="stat-item">
            <div class="stat-label">Nodes Unlocked</div>
            <div class="stat-value">${stats.unlockedNodes} / ${stats.totalNodes}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Total Renown</div>
            <div class="stat-value">${stats.renown.total}</div>
        </div>
    `;
    document.getElementById('progressStats').innerHTML = progressHtml;
    
    // Update career stats
    let careerHtml = '';
    stats.careers.forEach(career => {
        const node = editor.nodes.get(career.nodeId);
        if (node) {
            careerHtml += `
                <div class="career-stat-item">
                    <div>${node.name}</div>
                    <div>Level ${career.level}</div>
                    <div>${career.unspentPoints} points</div>
                    <div>${Math.floor((career.xp / career.nextLevelXP) * 100)}% to next</div>
                </div>
            `;
        }
    });
    document.getElementById('careerStats').innerHTML = careerHtml;
    
    // Update skills list
    let skillsHtml = '';
    window.Simulation.SimulationState.nodeProgress.forEach((progress, nodeId) => {
        if (progress.unlocked) {
            const node = editor.nodes.get(nodeId);
            if (node && node.tag !== 'Career') {
                // Check if it's a guidance node (no scalability or Successive Range)
                const isGuidanceNode = !node.scalability || node.scalability === 'Successive Range';
                
                // Only show non-guidance nodes in the skills list
                if (!isGuidanceNode) {
                    skillsHtml += `<div class="skill-item">${node.name} ${progress.currentLevel > 1 ? `(${progress.currentLevel})` : ''}</div>`;
                }
            }
        }
    });
    document.getElementById('skillsList').innerHTML = skillsHtml || '<div style="color: #666;">No skills unlocked yet</div>';
    
    statsPanel.style.display = 'block';
}

// === MODULE EXPORT ===
window.EventHandlers = {
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onWheel,
    onDoubleClick,
    onContextMenu,
    onKeyDown,
    updateCursor,
    setupEventListeners,
    showSimulationStats
};

// Backward compatibility
window.onMouseDown = onMouseDown;
window.onMouseMove = onMouseMove;
window.onMouseUp = onMouseUp;
window.onWheel = onWheel;
window.onDoubleClick = onDoubleClick;
window.onContextMenu = onContextMenu;
window.onKeyDown = onKeyDown;
window.updateCursor = updateCursor;
window.setupEventListeners = setupEventListeners;

console.log('Event Handlers module loaded successfully'); 