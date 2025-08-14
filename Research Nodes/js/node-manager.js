// === MODULE: Node Manager ===
// Handles node creation, deletion, editing, and color management

// Undo/redo stacks
let undoStack = [];
let redoStack = [];
const MAX_UNDO_STATES = 50;

/**
 * Save current state for undo
 */
function saveUndoState(editor) {
    const state = {
        nodes: new Map(),
        connections: new Map(),
        collapsedNodes: new Set(editor.collapsedNodes)
    };
    
    // Deep copy nodes
    editor.nodes.forEach((node, id) => {
        state.nodes.set(id, { ...node });
    });
    
    // Deep copy connections
    editor.connections.forEach((conn, key) => {
        state.connections.set(key, { ...conn });
    });
    
    undoStack.push(state);
    if (undoStack.length > MAX_UNDO_STATES) {
        undoStack.shift();
    }
    
    // Clear redo stack when new action is performed
    redoStack = [];
}

/**
 * Undo last action
 */
function undo(editor) {
    if (undoStack.length === 0) return;
    
    // Save current state to redo stack
    const currentState = {
        nodes: new Map(),
        connections: new Map(),
        collapsedNodes: new Set(editor.collapsedNodes)
    };
    editor.nodes.forEach((node, id) => {
        currentState.nodes.set(id, { ...node });
    });
    editor.connections.forEach((conn, key) => {
        currentState.connections.set(key, { ...conn });
    });
    redoStack.push(currentState);
    
    // Restore previous state
    const state = undoStack.pop();
    editor.nodes = state.nodes;
    editor.connections = state.connections;
    editor.collapsedNodes = state.collapsedNodes || new Set();
    editor.selectedNode = null;
    editor.selectedNodes = null;
    editor.selectedConnection = null;
    window.UIControls.hideKeyboardHelp();
    
    updateStats(editor);
    
    // Update bulk edit toolbar
    if (window.BulkEdit) {
        window.BulkEdit.updateBulkEditToolbar(editor);
    }
    
    // Mark for redraw
    if (window.Rendering && window.Rendering.setNeedsRedraw) {
        window.Rendering.setNeedsRedraw();
    }
}

/**
 * Redo last undone action
 */
function redo(editor) {
    if (redoStack.length === 0) return;
    
    // Save current state to undo stack (without clearing redo stack)
    const currentState = {
        nodes: new Map(),
        connections: new Map(),
        collapsedNodes: new Set(editor.collapsedNodes)
    };
    editor.nodes.forEach((node, id) => {
        currentState.nodes.set(id, { ...node });
    });
    editor.connections.forEach((conn, key) => {
        currentState.connections.set(key, { ...conn });
    });
    undoStack.push(currentState);
    
    // Restore state from redo stack
    const state = redoStack.pop();
    editor.nodes = state.nodes;
    editor.connections = state.connections;
    editor.collapsedNodes = state.collapsedNodes || new Set();
    editor.selectedNode = null;
    editor.selectedNodes = null;
    editor.selectedConnection = null;
    window.UIControls.hideKeyboardHelp();
    
    updateStats(editor);
    
    // Update bulk edit toolbar
    if (window.BulkEdit) {
        window.BulkEdit.updateBulkEditToolbar(editor);
    }
    
    // Mark for redraw
    if (window.Rendering && window.Rendering.setNeedsRedraw) {
        window.Rendering.setNeedsRedraw();
    }
}

/**
 * Create a new node with given data
 */
function createNode(editor, data) {
    // Determine the initial color
    let initialColor = data.color || null;
    let customColor = data.color || null;
    
    // If no color specified but has a parent, inherit from parent
    if (!initialColor && data.parent) {
        const parentNode = editor.nodes.get(data.parent);
        if (parentNode) {
            initialColor = parentNode.customColor || parentNode.color || getNodeColor(data, editor);
            customColor = null; // No custom color, inheriting from parent
        } else {
            initialColor = getNodeColor(data, editor);
        }
    } else if (!initialColor) {
        initialColor = getNodeColor(data, editor);
    }
    
    const node = {
        id: data.id || `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: data.name || 'New Node',
        scalability: data.scalability || '',
        milestone: data.milestone || (data.c4 ? 'C4' : ''),  // Convert old c4 boolean
        tag: data.tag || (data.career ? 'Career' : ''),  // Convert old career boolean
        description: data.description || '',
        x: data.x || 0,
        y: data.y || 0,
        width: data.width || 50,  // Grid-aligned size (2 * 25)
        height: data.height || 50,  // Grid-aligned size (2 * 25)
        color: initialColor,
        customColor: customColor,
        level: data.level || 0,
        parent: data.parent || null,
        progressionType: data.progressionType || 'free-form',
        childOrder: data.childOrder || []
    };
    
    editor.nodes.set(node.id, node);
    return node;
}

/**
 * Create a new node at specific coordinates
 */
function createNodeAt(editor, x, y, showEditor = true) {
    saveUndoState(editor);
    
    // Snap coordinates to grid
    const gridSize = 25;
    const snappedX = Math.round(x / gridSize) * gridSize;
    const snappedY = Math.round(y / gridSize) * gridSize;
    
    const node = createNode(editor, {
        name: 'New Node',
        x: snappedX,
        y: snappedY,
        color: '#666666',  // Default gray color for new nodes
        level: 1  // Default to regular node (level 1), not parent node (level 0)
    });
    
    editor.selectedNode = node;
    if (showEditor) {
        showNodeEditor(editor, node);
    }
    updateStats(editor);
    
    // Mark for redraw
    if (window.Rendering && window.Rendering.setNeedsRedraw) {
        window.Rendering.setNeedsRedraw();
    }
    
    return node;
}

/**
 * Delete the selected node
 */
function deleteNode(editor) {
    if (editor.selectedNode) {
        deleteNodeById(editor, editor.selectedNode.id);
    }
}

/**
 * Delete node by ID
 */
function deleteNodeById(editor, nodeId) {
    // Remove connections
    editor.connections.forEach((connection, key) => {
        if (connection.from === nodeId || connection.to === nodeId) {
            editor.connections.delete(key);
        }
    });
    
    // Remove node
    editor.nodes.delete(nodeId);
    if (editor.selectedNode && editor.selectedNode.id === nodeId) {
        editor.selectedNode = null;
        hideNodeEditor();
    }
    updateStats(editor);
    
    // Mark for redraw
    if (window.Rendering && window.Rendering.setNeedsRedraw) {
        window.Rendering.setNeedsRedraw();
    }
}

/**
 * Get node at specific coordinates
 */
function getNodeAt(editor, x, y) {
    // Check from the end (top nodes) to beginning (bottom nodes)
    const nodesArray = Array.from(editor.nodes.values()).reverse();
    
    for (const node of nodesArray) {
        // Skip hidden nodes
        if (isNodeHidden(editor, node.id)) {
            continue;
        }
        
        // Adjust hitbox size for parent nodes
        const nodeWidth = node.level === 0 ? node.width * 1.2 : node.width;
        const nodeHeight = node.level === 0 ? node.height * 1.2 : node.height;
        
        if (x >= node.x - nodeWidth / 2 && x <= node.x + nodeWidth / 2 &&
            y >= node.y - nodeHeight / 2 && y <= node.y + nodeHeight / 2) {
            return node;
        }
    }
    return null;
}

/**
 * Get node color based on attributes
 */
function getNodeColor(data, editor = null) {
    // If custom color is set, use it
    if (data.customColor) return data.customColor;
    
    // If this node has a parent, inherit the parent's color
    if (data.parent && (editor || window.editor)) {
        const editorToUse = editor || window.editor;
        const parentNode = editorToUse.nodes.get(data.parent);
        if (parentNode) {
            // Always return the parent's actual color (custom or default)
            // The rendering will handle desaturation based on generation
            return parentNode.customColor || parentNode.color || getNodeColor(parentNode, editorToUse);
        }
    }
    
    // Otherwise use default colors based on attributes
    if (data.tag === 'Career') return '#9B59B6';  // Purple for career nodes
    if (data.scalability === 'Unlimited') return '#4a90e2';  // Muted blue
    if (data.scalability === 'Successive Range') return '#ff6b00';
    if (data.scalability === 'Single Activation') return '#00ff88';
    if (data.milestone === 'C4') return '#ffaa00';
    return '#666666';
}

/**
 * Show node editor panel
 */
function showNodeEditor(editor, node) {
    // Save undo state before any edits
    saveUndoState(editor);
    
    const nodeEditor = document.getElementById('nodeEditor');
    const nameField = document.getElementById('nodeName');
    const scalabilityField = document.getElementById('nodeScalability');
    const milestoneField = document.getElementById('nodeMilestone');
    const tagField = document.getElementById('nodeTag');
    const descriptionField = document.getElementById('nodeDescription');
    const progressionTypeField = document.getElementById('nodeProgressionType');
    const childOrderConfig = document.querySelector('.child-order-config');
    const simulationConfig = document.querySelector('.simulation-config');
    
    // Show editor and populate fields
    nodeEditor.style.display = 'block';
    nameField.value = node.name;
    scalabilityField.value = node.scalability;
    descriptionField.value = node.description;
    
    // Update milestone dropdown
    updateDropdownOptions(milestoneField, editor.milestones, node.milestone);
    
    // Update tag dropdown
    updateDropdownOptions(tagField, editor.tags, node.tag);
    
    // Show/hide simulation configuration based on scalability
    if (simulationConfig && childOrderConfig) {
        if (node.scalability === 'Successive Range') {
            simulationConfig.style.display = 'block';
            progressionTypeField.value = node.progressionType || 'free-form';
            
            // Show child order config if sequential
            if (node.progressionType === 'sequential') {
                childOrderConfig.style.display = 'block';
                updateChildOrderList(editor, node);
            } else {
                childOrderConfig.style.display = 'none';
            }
        } else {
            simulationConfig.style.display = 'none';
            childOrderConfig.style.display = 'none';
        }
    }
    
    // Update color swatches
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(swatch => {
        swatch.classList.remove('active');
        if (swatch.dataset.color === node.customColor) {
            swatch.classList.add('active');
        }
    });
    
    // Auto-select name field for immediate typing
    setTimeout(() => {
        nameField.focus();
        nameField.select();
    }, 10);
    
    // Remove any existing listeners to avoid duplicates
    nameField.oninput = null;
    scalabilityField.onchange = null;
    milestoneField.onchange = null;
    tagField.onchange = null;
    descriptionField.oninput = null;
    
    // Handle color swatches
    swatches.forEach(swatch => {
        swatch.onclick = () => {
            swatches.forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            node.customColor = swatch.dataset.color;
            node.color = swatch.dataset.color;
            
            // Update descendant colors
            updateDescendantColors(editor, node);
            
            // Mark for redraw
            if (window.Rendering && window.Rendering.setNeedsRedraw) {
                window.Rendering.setNeedsRedraw();
            }
        };
    });
    
    // Auto-save on input
    nameField.oninput = () => {
        node.name = nameField.value;
    };
    
    scalabilityField.onchange = () => {
        node.scalability = scalabilityField.value;
        if (!node.customColor) {
            node.color = getNodeColor(node, editor);
        }
        
        // Update simulation config visibility
        if (simulationConfig && childOrderConfig) {
            if (node.scalability === 'Successive Range') {
                simulationConfig.style.display = 'block';
                if (node.progressionType === 'sequential') {
                    childOrderConfig.style.display = 'block';
                    updateChildOrderList(editor, node);
                }
            } else {
                simulationConfig.style.display = 'none';
                childOrderConfig.style.display = 'none';
            }
        }
    };
    
    milestoneField.onchange = () => {
        if (milestoneField.value === 'add-new') {
            showAddItemModal('Milestone', (newMilestone) => {
                editor.milestones.push(newMilestone);
                updateDropdownOptions(milestoneField, editor.milestones, newMilestone);
                node.milestone = newMilestone;
                if (!node.customColor) {
                    node.color = getNodeColor(node, editor);
                }
            });
        } else {
            node.milestone = milestoneField.value;
            if (!node.customColor) {
                node.color = getNodeColor(node, editor);
            }
        }
    };
    
    tagField.onchange = () => {
        if (tagField.value === 'add-new') {
            showAddItemModal('Tag', (newTag) => {
                editor.tags.push(newTag);
                updateDropdownOptions(tagField, editor.tags, newTag);
                node.tag = newTag;
                if (!node.customColor) {
                    node.color = getNodeColor(node, editor);
                }
                updateStats(editor);
            });
        } else {
            node.tag = tagField.value;
            if (!node.customColor) {
                node.color = getNodeColor(node, editor);
            }
            updateStats(editor);
        }
    };
    
    descriptionField.oninput = () => {
        node.description = descriptionField.value;
    };
    
    // Handle progression type change
    if (progressionTypeField) {
        progressionTypeField.onchange = () => {
            node.progressionType = progressionTypeField.value;
            
            if (node.progressionType === 'sequential') {
                childOrderConfig.style.display = 'block';
                updateChildOrderList(editor, node);
            } else {
                childOrderConfig.style.display = 'none';
                node.childOrder = [];
            }
        };
    }
    
    // Handle update child order button
    const updateOrderBtn = document.getElementById('updateChildOrder');
    if (updateOrderBtn) {
        updateOrderBtn.onclick = () => {
            saveChildOrder(editor, node);
            window.UIControls.showToast('Child order updated', 2000);
        };
    }
    
    // Handle keyboard events
    const handleKeydown = (e) => {
        if (e.key === 'Escape') {
            hideNodeEditor();
            document.removeEventListener('keydown', handleKeydown);
        } else if (e.key === 'Enter' && e.target === nameField) {
            hideNodeEditor();
            document.removeEventListener('keydown', handleKeydown);
        }
    };
    
    document.addEventListener('keydown', handleKeydown);
    
    // Store handler reference on the editor instead of dataset
    editor.nodeEditorKeyHandler = handleKeydown;
}

/**
 * Hide node editor panel
 */
function hideNodeEditor() {
    const nodeEditor = document.getElementById('nodeEditor');
    nodeEditor.style.display = 'none';
    
    // Remove keyboard event listener if it exists
    if (window.editor && window.editor.nodeEditorKeyHandler) {
        document.removeEventListener('keydown', window.editor.nodeEditorKeyHandler);
        delete window.editor.nodeEditorKeyHandler;
    }
}

/**
 * Save node edits (now just closes the editor since we auto-save)
 */
function saveNodeEdit(editor) {
    if (editor.selectedNode) {
        // Update color if no custom color is set
        if (!editor.selectedNode.customColor) {
            editor.selectedNode.color = getNodeColor(editor.selectedNode, editor);
        }
        hideNodeEditor();
        
        // Mark for redraw
        if (window.Rendering && window.Rendering.setNeedsRedraw) {
            window.Rendering.setNeedsRedraw();
        }
    }
}

/**
 * Cancel node editing
 */
function cancelNodeEdit(editor) {
    hideNodeEditor();
    editor.selectedNode = null;
}

/**
 * Check if node is a root node
 */
function isRootNode(name) {
    const rootNames = ['Council Rank', 'Trade Dealership', 'Security Zone Access', 
                      'Plot Ownership', 'Fleet Command'];
    return rootNames.includes(name);
}

/**
 * Check if node is a category node
 */
function isCategoryNode(name) {
    const categoryNames = ['Pilot', 'Data Running', 'Mining', 'Building', 'Crafting', 
                          'Combat', 'Freight', 'Repair', 'Salvage'];
    return categoryNames.includes(name);
}

/**
 * Duplicate a node with optional offset
 */
function duplicateNode(editor, sourceNode, offsetX = 50, offsetY = 50, duplicateConnections = false, addCopySuffix = true) {
    // Snap the new position to grid
    const gridSize = 25;
    const newX = Math.round((sourceNode.x + offsetX) / gridSize) * gridSize;
    const newY = Math.round((sourceNode.y + offsetY) / gridSize) * gridSize;
    
    const newNode = createNode(editor, {
        name: addCopySuffix ? sourceNode.name + ' (copy)' : sourceNode.name,
        scalability: sourceNode.scalability,
        milestone: sourceNode.milestone,
        tag: sourceNode.tag,
        description: sourceNode.description,
        color: sourceNode.customColor,
        x: newX,
        y: newY,
        level: sourceNode.level,
        parent: sourceNode.parent
    });
    
    // Copy width and height after creation
    newNode.width = sourceNode.width;
    newNode.height = sourceNode.height;
    
    // Duplicate connections if requested
    if (duplicateConnections) {
        editor.connections.forEach((conn, key) => {
            if (conn.from === sourceNode.id) {
                // Create connection from new node to same target
                const newKey = `${newNode.id}_${conn.to}`;
                editor.connections.set(newKey, { 
                    from: newNode.id, 
                    to: conn.to,
                    type: conn.type || 'linear'
                });
            } else if (conn.to === sourceNode.id) {
                // Create connection from same source to new node
                const newKey = `${conn.from}_${newNode.id}`;
                editor.connections.set(newKey, { 
                    from: conn.from, 
                    to: newNode.id,
                    type: conn.type || 'linear'
                });
            }
        });
    }
    
    return newNode;
}

/**
 * Copy node(s) to clipboard
 */
function copyNodes(editor) {
    if (!editor.selectedNode) return;
    
    editor.clipboard = {
        nodes: [],
        baseX: editor.selectedNode.x,
        baseY: editor.selectedNode.y
    };
    
    // Copy selected nodes
    if (editor.selectedNodes && editor.selectedNodes.size > 0) {
        editor.selectedNodes.forEach(node => {
            editor.clipboard.nodes.push({
                name: node.name,
                scalability: node.scalability,
                milestone: node.milestone,
                tag: node.tag,
                description: node.description,
                color: node.customColor, // Only copy custom color
                width: node.width,
                height: node.height,
                offsetX: node.x - editor.clipboard.baseX,
                offsetY: node.y - editor.clipboard.baseY,
                level: node.level,
                parent: node.parent
            });
        });
    } else {
        // Single node
        editor.clipboard.nodes.push({
            name: editor.selectedNode.name,
            scalability: editor.selectedNode.scalability,
            milestone: editor.selectedNode.milestone,
            tag: editor.selectedNode.tag,
            description: editor.selectedNode.description,
            color: editor.selectedNode.customColor, // Only copy custom color
            width: editor.selectedNode.width,
            height: editor.selectedNode.height,
            offsetX: 0,
            offsetY: 0,
            level: editor.selectedNode.level,
            parent: editor.selectedNode.parent
        });
    }
}

/**
 * Paste nodes from clipboard
 */
function pasteNodes(editor) {
    if (!editor.clipboard || !editor.clipboard.nodes.length) return;
    
    saveUndoState(editor);
    
    // Get mouse position for paste location
    const worldPos = editor.lastMouse ? 
        window.CanvasManager.screenToWorld(editor, editor.lastMouse.x, editor.lastMouse.y) :
        { x: editor.clipboard.baseX + 50, y: editor.clipboard.baseY + 50 };
    
    const gridSize = 25;
    const newNodes = [];
    editor.clipboard.nodes.forEach(nodeData => {
        // Snap the pasted position to grid
        const snappedX = Math.round((worldPos.x + nodeData.offsetX) / gridSize) * gridSize;
        const snappedY = Math.round((worldPos.y + nodeData.offsetY) / gridSize) * gridSize;
        
        const node = createNode(editor, {
            name: nodeData.name,
            scalability: nodeData.scalability,
            milestone: nodeData.milestone,
            tag: nodeData.tag,
            description: nodeData.description,
            color: nodeData.color,
            x: snappedX,
            y: snappedY,
            level: nodeData.level,
            parent: nodeData.parent
        });
        
        // Copy width and height if available
        if (nodeData.width) node.width = nodeData.width;
        if (nodeData.height) node.height = nodeData.height;
        
        newNodes.push(node);
    });
    
    // Select the newly pasted nodes
    if (newNodes.length === 1) {
        editor.selectedNode = newNodes[0];
        editor.selectedNodes = null;
    } else if (newNodes.length > 1) {
        editor.selectedNodes = new Set(newNodes);
        editor.selectedNode = newNodes[newNodes.length - 1];
    }
    
    updateStats(editor);
    
    // Mark for redraw
    if (window.Rendering && window.Rendering.setNeedsRedraw) {
        window.Rendering.setNeedsRedraw();
    }
}

/**
 * Get all descendant nodes (children, grandchildren, etc.) of a node
 */
function getDescendants(editor, nodeId, descendants = new Set()) {
    editor.connections.forEach((conn) => {
        if (conn.from === nodeId && !descendants.has(conn.to)) {
            descendants.add(conn.to);
            // Recursively get descendants of this child
            getDescendants(editor, conn.to, descendants);
        }
    });
    return descendants;
}

/**
 * Check if a node is hidden due to ancestor being collapsed
 */
function isNodeHidden(editor, nodeId) {
    // Check if any ancestor of this node is collapsed
    const ancestors = new Set();
    
    // Find all ancestors
    function findAncestors(currentId) {
        editor.connections.forEach((conn) => {
            if (conn.to === currentId && !ancestors.has(conn.from)) {
                ancestors.add(conn.from);
                findAncestors(conn.from);
            }
        });
    }
    
    findAncestors(nodeId);
    
    // Check if any ancestor is collapsed
    for (const ancestorId of ancestors) {
        if (editor.collapsedNodes.has(ancestorId)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Toggle collapse state of a node
 */
function toggleNodeCollapse(editor, nodeOrId) {
    // Support both node object and node ID
    const nodeId = typeof nodeOrId === 'string' ? nodeOrId : nodeOrId.id;
    
    console.log('toggleNodeCollapse called for:', nodeId);
    
    const descendants = getDescendants(editor, nodeId);
    
    console.log('Node has', descendants.size, 'descendants');
    
    if (descendants.size === 0) {
        // No children to collapse
        console.log('No children to collapse/expand');
        return;
    }
    
    // Save undo state before toggling
    saveUndoState(editor);
    
    if (editor.collapsedNodes.has(nodeId)) {
        // Expand
        console.log('Expanding node:', nodeId);
        editor.collapsedNodes.delete(nodeId);
    } else {
        // Collapse
        console.log('Collapsing node:', nodeId);
        editor.collapsedNodes.add(nodeId);
        
        // Deselect any hidden nodes
        if (editor.selectedNode && descendants.has(editor.selectedNode.id)) {
            editor.selectedNode = null;
        }
        
        if (editor.selectedNodes) {
            const visibleSelectedNodes = new Set();
            editor.selectedNodes.forEach(n => {
                if (!descendants.has(n.id)) {
                    visibleSelectedNodes.add(n);
                }
            });
            
            if (visibleSelectedNodes.size === 0) {
                editor.selectedNodes = null;
                editor.selectedNode = null;
            } else {
                editor.selectedNodes = visibleSelectedNodes;
                editor.selectedNode = Array.from(visibleSelectedNodes)[visibleSelectedNodes.size - 1];
            }
        }
    }
    
    // Mark for redraw
    if (window.Rendering && window.Rendering.setNeedsRedraw) {
        window.Rendering.setNeedsRedraw();
    }
    
    // Update bulk edit toolbar if a collapsed node is selected
    if (window.BulkEdit) {
        window.BulkEdit.updateBulkEditToolbar(editor);
    }
}

/**
 * Get the number of visible children for a node
 */
function getVisibleChildCount(editor, nodeId) {
    let count = 0;
    editor.connections.forEach(conn => {
        if (conn.from === nodeId) {
            const childNode = editor.nodes.get(conn.to);
            if (childNode && !isNodeHidden(editor, conn.to)) {
                count++;
            }
        }
    });
    return count;
}

/**
 * Update statistics display
 */
function updateStats(editor) {
    // Check if we have multiple nodes selected for bulk editing
    const selectedNodes = window.BulkEdit ? window.BulkEdit.getSelectedNodes(editor) : [];
    const isMultiSelect = selectedNodes.length > 1;
    
    // Determine which nodes to count
    const nodesToCount = isMultiSelect ? selectedNodes : Array.from(editor.nodes.values());
    
    // Count tags
    const tagCounts = {};
    nodesToCount.forEach(node => {
        if (node.tag) {
            tagCounts[node.tag] = (tagCounts[node.tag] || 0) + 1;
        }
    });
    
    // Update tags display with better formatting
    const tagsList = document.getElementById('tagsList');
    if (tagsList) {
        if (Object.keys(tagCounts).length === 0) {
            tagsList.textContent = 'None';
        } else {
            // Clear and create individual tag elements for better styling
            tagsList.innerHTML = '';
            Object.entries(tagCounts).forEach(([tag, count], index) => {
                if (index > 0) {
                    const separator = document.createElement('span');
                    separator.textContent = ', ';
                    separator.style.color = 'var(--text-secondary)';
                    tagsList.appendChild(separator);
                }
                
                const tagElement = document.createElement('span');
                tagElement.textContent = `${tag} (${count})`;
                tagsList.appendChild(tagElement);
            });
        }
    }
}

/**
 * Update descendant colors when parent color changes
 */
function updateDescendantColors(editor, parentNode) {
    const descendants = getDescendants(editor, parentNode.id);
    
    descendants.forEach(descendantId => {
        const descendantNode = editor.nodes.get(descendantId);
        if (descendantNode) {
            // Clear custom color on descendant so it inherits from parent
            if (!descendantNode.customColor) {
                // Force recalculation of color based on parent
                descendantNode.color = getNodeColor(descendantNode, editor);
            }
            
            // Recursively update this descendant's children
            updateDescendantColors(editor, descendantNode);
        }
    });
    
    // Mark for redraw
    if (window.Rendering && window.Rendering.setNeedsRedraw) {
        window.Rendering.setNeedsRedraw();
    }
}

/**
 * Update dropdown options with current items
 */
function updateDropdownOptions(selectElement, items, selectedValue) {
    // Clear current options
    selectElement.innerHTML = '';
    
    // Add "None" option
    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = 'None';
    selectElement.appendChild(noneOption);
    
    // Add all items
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        selectElement.appendChild(option);
    });
    
    // Add "Add New" option
    const addNewOption = document.createElement('option');
    addNewOption.value = 'add-new';
    addNewOption.textContent = selectElement.id.includes('Milestone') ? '+ Add New Milestone' : '+ Add New Tag';
    selectElement.appendChild(addNewOption);
    
    // Set selected value
    selectElement.value = selectedValue || '';
}

/**
 * Show modal for adding new milestone or tag
 */
function showAddItemModal(type, callback) {
    const modal = document.getElementById('addItemModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalInput = document.getElementById('modalInput');
    const modalSave = document.getElementById('modalSave');
    const modalCancel = document.getElementById('modalCancel');
    
    // Set modal title and placeholder
    modalTitle.textContent = `Add New ${type}`;
    modalInput.placeholder = `Enter ${type.toLowerCase()} name...`;
    modalInput.value = '';
    
    // Show modal
    modal.style.display = 'flex';
    
    // Focus input
    setTimeout(() => modalInput.focus(), 10);
    
    // Handle save
    const saveHandler = () => {
        const value = modalInput.value.trim();
        if (value) {
            callback(value);
            modal.style.display = 'none';
        }
    };
    
    // Handle cancel
    const cancelHandler = () => {
        modal.style.display = 'none';
    };
    
    // Handle Enter key
    const keyHandler = (e) => {
        if (e.key === 'Enter') {
            saveHandler();
        } else if (e.key === 'Escape') {
            cancelHandler();
        }
    };
    
    // Remove old listeners and add new ones
    modalSave.onclick = saveHandler;
    modalCancel.onclick = cancelHandler;
    modalInput.onkeydown = keyHandler;
}

/**
 * Delete a milestone or tag - removes it from the list and updates all nodes
 */
function deleteItemFromList(editor, type, itemName) {
    // Don't allow deletion of default items
    const defaultMilestones = ['C4'];
    const defaultTags = ['Career'];
    
    if (type === 'milestone' && defaultMilestones.includes(itemName)) {
        alert('Cannot delete default milestone: ' + itemName);
        return;
    }
    
    if (type === 'tag' && defaultTags.includes(itemName)) {
        alert('Cannot delete default tag: ' + itemName);
        return;
    }
    
    // Confirm deletion
    const nodeCount = countNodesWithItem(editor, type, itemName);
    const message = nodeCount > 0 ? 
        `Are you sure you want to delete "${itemName}"? This will clear it from ${nodeCount} node(s).` :
        `Are you sure you want to delete "${itemName}"?`;
    
    if (!confirm(message)) {
        return;
    }
    
    // Save undo state before deletion
    saveUndoState(editor);
    
    // Remove from list
    if (type === 'milestone') {
        const index = editor.milestones.indexOf(itemName);
        if (index > -1) {
            editor.milestones.splice(index, 1);
        }
        
        // Clear from all nodes
        editor.nodes.forEach(node => {
            if (node.milestone === itemName) {
                node.milestone = '';
            }
        });
    } else if (type === 'tag') {
        const index = editor.tags.indexOf(itemName);
        if (index > -1) {
            editor.tags.splice(index, 1);
        }
        
        // Clear from all nodes
        editor.nodes.forEach(node => {
            if (node.tag === itemName) {
                node.tag = '';
            }
        });
    }
    
    // Update stats if tags were changed
    if (type === 'tag') {
        updateStats(editor);
    }
    
    // Mark for redraw
    if (window.Rendering && window.Rendering.setNeedsRedraw) {
        window.Rendering.setNeedsRedraw();
    }
}

/**
 * Count nodes with a specific milestone or tag
 */
function countNodesWithItem(editor, type, itemName) {
    let count = 0;
    editor.nodes.forEach(node => {
        if (type === 'milestone' && node.milestone === itemName) {
            count++;
        } else if (type === 'tag' && node.tag === itemName) {
            count++;
        }
    });
    return count;
}

/**
 * Show management modal for milestones or tags
 */
function showManageModal(editor, type) {
    const modal = document.getElementById('manageItemsModal');
    const modalTitle = document.getElementById('manageModalTitle');
    const itemsList = document.getElementById('itemsList');
    const closeButton = document.getElementById('closeManageModal');
    
    // Set title
    modalTitle.textContent = `Manage ${type === 'milestone' ? 'Milestones' : 'Tags'}`;
    
    // Clear list
    itemsList.innerHTML = '';
    
    // Get items
    const items = type === 'milestone' ? editor.milestones : editor.tags;
    const defaultItems = type === 'milestone' ? ['C4'] : ['Career'];
    
    // Create item rows
    items.forEach(item => {
        const isDefault = defaultItems.includes(item);
        const count = countNodesWithItem(editor, type, item);
        
        const row = document.createElement('div');
        row.className = 'item-row' + (isDefault ? ' default-item' : '');
        
        const info = document.createElement('div');
        info.className = 'item-info';
        
        const name = document.createElement('div');
        name.className = 'item-name';
        name.textContent = item;
        
        const countSpan = document.createElement('div');
        countSpan.className = 'item-count';
        countSpan.textContent = `Used in ${count} node${count !== 1 ? 's' : ''}`;
        
        info.appendChild(name);
        info.appendChild(countSpan);
        
        const actions = document.createElement('div');
        actions.className = 'item-actions';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.textContent = 'Delete';
        deleteBtn.disabled = isDefault;
        deleteBtn.title = isDefault ? 'Cannot delete default item' : `Delete ${item}`;
        
        if (!isDefault) {
            deleteBtn.onclick = () => {
                deleteItemFromList(editor, type, item);
                // Refresh the modal
                showManageModal(editor, type);
                // Update the dropdown if it's open
                const dropdown = document.getElementById(type === 'milestone' ? 'nodeMilestone' : 'nodeTag');
                if (dropdown && editor.selectedNode) {
                    const currentValue = editor.selectedNode[type];
                    updateDropdownOptions(dropdown, items, currentValue);
                }
            };
        }
        
        actions.appendChild(deleteBtn);
        row.appendChild(info);
        row.appendChild(actions);
        itemsList.appendChild(row);
    });
    
    // Show modal
    modal.style.display = 'flex';
    
    // Handle close
    const closeHandler = () => {
        modal.style.display = 'none';
    };
    
    // Handle Escape key
    const keyHandler = (e) => {
        if (e.key === 'Escape') {
            closeHandler();
        }
    };
    
    // Remove old listeners and add new ones
    closeButton.onclick = closeHandler;
    document.addEventListener('keydown', keyHandler);
    
    // Store handler to remove later
    modal.dataset.keyHandler = keyHandler;
    
    // Clean up when modal closes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'style' && modal.style.display === 'none') {
                document.removeEventListener('keydown', keyHandler);
                observer.disconnect();
            }
        });
    });
    
    observer.observe(modal, { attributes: true });
}

/**
 * Update child order list in the editor
 */
function updateChildOrderList(editor, parentNode) {
    const childOrderList = document.getElementById('childOrderList');
    if (!childOrderList) return;
    
    // Get all children of this node
    const children = [];
    editor.connections.forEach(conn => {
        if (conn.from === parentNode.id) {
            const childNode = editor.nodes.get(conn.to);
            if (childNode) {
                children.push(childNode);
            }
        }
    });
    
    // If node has existing order, use it; otherwise create default order
    if (!parentNode.childOrder || parentNode.childOrder.length !== children.length) {
        parentNode.childOrder = children.map(child => child.id);
    }
    
    // Clear list
    childOrderList.innerHTML = '';
    
    if (children.length === 0) {
        childOrderList.innerHTML = '<div style="color: #666; text-align: center;">No children nodes</div>';
        return;
    }
    
    // Create sortable list items
    parentNode.childOrder.forEach((childId, index) => {
        const childNode = editor.nodes.get(childId);
        if (childNode) {
            const item = document.createElement('div');
            item.className = 'child-order-item';
            item.dataset.nodeId = childId;
            item.draggable = true;
            item.innerHTML = `
                <span class="order-number">${index + 1}.</span>
                <span>${childNode.name}</span>
            `;
            
            // Drag and drop handlers
            item.ondragstart = (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', childId);
                item.classList.add('dragging');
            };
            
            item.ondragend = () => {
                item.classList.remove('dragging');
            };
            
            item.ondragover = (e) => {
                e.preventDefault();
                const draggingItem = childOrderList.querySelector('.dragging');
                if (draggingItem && draggingItem !== item) {
                    const rect = item.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    if (y < rect.height / 2) {
                        childOrderList.insertBefore(draggingItem, item);
                    } else {
                        childOrderList.insertBefore(draggingItem, item.nextSibling);
                    }
                }
            };
            
            childOrderList.appendChild(item);
        }
    });
}

/**
 * Save the child order from the sortable list
 */
function saveChildOrder(editor, parentNode) {
    const childOrderList = document.getElementById('childOrderList');
    if (!childOrderList) return;
    
    const newOrder = [];
    childOrderList.querySelectorAll('.child-order-item').forEach(item => {
        newOrder.push(item.dataset.nodeId);
    });
    
    parentNode.childOrder = newOrder;
}

// === MODULE EXPORT ===
window.NodeManager = {
    createNode,
    createNodeAt,
    deleteNode,
    deleteNodeById,
    getNodeAt,
    getNodeColor,
    showNodeEditor,
    hideNodeEditor,
    saveNodeEdit,
    cancelNodeEdit,
    isRootNode,
    isCategoryNode,
    updateStats,
    saveUndoState,
    undo,
    redo,
    duplicateNode,
    copyNodes,
    pasteNodes,
    getDescendants,
    isNodeHidden,
    toggleNodeCollapse,
    getVisibleChildCount,
    updateDescendantColors,
    updateDropdownOptions,
    showAddItemModal,
    deleteItemFromList,
    countNodesWithItem,
    showManageModal
};

// Backward compatibility
window.createNode = createNode;
window.createNodeAt = createNodeAt;
window.deleteNode = deleteNode;
window.deleteNodeById = deleteNodeById;
window.getNodeAt = getNodeAt;
window.getNodeColor = getNodeColor;
window.showNodeEditor = showNodeEditor;
window.hideNodeEditor = hideNodeEditor;
window.saveNodeEdit = saveNodeEdit;
window.cancelNodeEdit = cancelNodeEdit;
window.isRootNode = isRootNode;
window.isCategoryNode = isCategoryNode;
window.updateStats = updateStats;
window.saveUndoState = saveUndoState;
window.undo = undo;
window.redo = redo;
window.duplicateNode = duplicateNode;
window.copyNodes = copyNodes;
window.pasteNodes = pasteNodes;
window.getDescendants = getDescendants;
window.isNodeHidden = isNodeHidden;
window.toggleNodeCollapse = toggleNodeCollapse;
window.getVisibleChildCount = getVisibleChildCount;
window.updateDescendantColors = updateDescendantColors;
window.updateDropdownOptions = updateDropdownOptions;
window.showAddItemModal = showAddItemModal;
window.deleteItemFromList = deleteItemFromList;
window.countNodesWithItem = countNodesWithItem;
window.showManageModal = showManageModal;

console.log('Node Manager module loaded successfully'); 