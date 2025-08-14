// === MODULE: Bulk Edit ===
// Handles bulk editing operations for multiple selected nodes

/**
 * Get all currently selected nodes
 */
function getSelectedNodes(editor) {
    const nodes = [];
    
    if (editor.selectedNodes && editor.selectedNodes.size > 0) {
        // Multiple nodes selected via selection box or ctrl+click
        editor.selectedNodes.forEach(node => nodes.push(node));
    } else if (editor.selectedNode) {
        // Check if it's a collapsed parent node
        if (editor.collapsedNodes.has(editor.selectedNode.id)) {
            // Include the parent and all its descendants
            nodes.push(editor.selectedNode);
            const descendants = window.NodeManager.getDescendants(editor, editor.selectedNode.id);
            descendants.forEach(descendantId => {
                const descendantNode = editor.nodes.get(descendantId);
                if (descendantNode) nodes.push(descendantNode);
            });
        } else {
            // Just the single selected node
            nodes.push(editor.selectedNode);
        }
    }
    
    return nodes;
}

/**
 * Update bulk edit toolbar visibility
 */
function updateBulkEditToolbar(editor) {
    const toolbar = document.getElementById('bulkEditToolbar');
    const selectedNodes = getSelectedNodes(editor);
    
    if (selectedNodes.length > 1) {
        toolbar.style.display = 'flex';
        document.body.classList.add('bulk-editing');
    } else {
        toolbar.style.display = 'none';
        document.body.classList.remove('bulk-editing');
    }
}

/**
 * Align nodes to the left
 */
function alignLeft(editor) {
    const selectedNodes = getSelectedNodes(editor);
    if (selectedNodes.length < 2) return;
    
    window.NodeManager.saveUndoState(editor);
    
    // Find the leftmost x position
    const minX = Math.min(...selectedNodes.map(node => node.x - node.width / 2));
    
    // Align all nodes to this position
    selectedNodes.forEach(node => {
        node.x = minX + node.width / 2;
    });
    
    window.Rendering.setNeedsRedraw();
}

/**
 * Align nodes to the center horizontally
 */
function alignCenter(editor) {
    const selectedNodes = getSelectedNodes(editor);
    if (selectedNodes.length < 2) return;
    
    window.NodeManager.saveUndoState(editor);
    
    // Calculate the center x position
    const sumX = selectedNodes.reduce((sum, node) => sum + node.x, 0);
    const centerX = sumX / selectedNodes.length;
    
    // Align all nodes to this position
    selectedNodes.forEach(node => {
        node.x = centerX;
    });
    
    window.Rendering.setNeedsRedraw();
}

/**
 * Align nodes to the right
 */
function alignRight(editor) {
    const selectedNodes = getSelectedNodes(editor);
    if (selectedNodes.length < 2) return;
    
    window.NodeManager.saveUndoState(editor);
    
    // Find the rightmost x position
    const maxX = Math.max(...selectedNodes.map(node => node.x + node.width / 2));
    
    // Align all nodes to this position
    selectedNodes.forEach(node => {
        node.x = maxX - node.width / 2;
    });
    
    window.Rendering.setNeedsRedraw();
}

/**
 * Align nodes to the top
 */
function alignTop(editor) {
    const selectedNodes = getSelectedNodes(editor);
    if (selectedNodes.length < 2) return;
    
    window.NodeManager.saveUndoState(editor);
    
    // Find the topmost y position
    const minY = Math.min(...selectedNodes.map(node => node.y - node.height / 2));
    
    // Align all nodes to this position
    selectedNodes.forEach(node => {
        node.y = minY + node.height / 2;
    });
    
    window.Rendering.setNeedsRedraw();
}

/**
 * Align nodes to the middle vertically
 */
function alignMiddle(editor) {
    const selectedNodes = getSelectedNodes(editor);
    if (selectedNodes.length < 2) return;
    
    window.NodeManager.saveUndoState(editor);
    
    // Calculate the center y position
    const sumY = selectedNodes.reduce((sum, node) => sum + node.y, 0);
    const centerY = sumY / selectedNodes.length;
    
    // Align all nodes to this position
    selectedNodes.forEach(node => {
        node.y = centerY;
    });
    
    window.Rendering.setNeedsRedraw();
}

/**
 * Align nodes to the bottom
 */
function alignBottom(editor) {
    const selectedNodes = getSelectedNodes(editor);
    if (selectedNodes.length < 2) return;
    
    window.NodeManager.saveUndoState(editor);
    
    // Find the bottommost y position
    const maxY = Math.max(...selectedNodes.map(node => node.y + node.height / 2));
    
    // Align all nodes to this position
    selectedNodes.forEach(node => {
        node.y = maxY - node.height / 2;
    });
    
    window.Rendering.setNeedsRedraw();
}

/**
 * Distribute nodes horizontally
 */
function distributeHorizontal(editor) {
    const selectedNodes = getSelectedNodes(editor);
    if (selectedNodes.length < 3) return;
    
    window.NodeManager.saveUndoState(editor);
    
    // Sort nodes by x position
    selectedNodes.sort((a, b) => a.x - b.x);
    
    // Get the leftmost and rightmost positions
    const leftNode = selectedNodes[0];
    const rightNode = selectedNodes[selectedNodes.length - 1];
    const startX = leftNode.x;
    const endX = rightNode.x;
    const totalDistance = endX - startX;
    const spacing = totalDistance / (selectedNodes.length - 1);
    
    // Distribute nodes evenly
    selectedNodes.forEach((node, index) => {
        node.x = startX + spacing * index;
    });
    
    window.Rendering.setNeedsRedraw();
}

/**
 * Distribute nodes vertically
 */
function distributeVertical(editor) {
    const selectedNodes = getSelectedNodes(editor);
    if (selectedNodes.length < 3) return;
    
    window.NodeManager.saveUndoState(editor);
    
    // Sort nodes by y position
    selectedNodes.sort((a, b) => a.y - b.y);
    
    // Get the topmost and bottommost positions
    const topNode = selectedNodes[0];
    const bottomNode = selectedNodes[selectedNodes.length - 1];
    const startY = topNode.y;
    const endY = bottomNode.y;
    const totalDistance = endY - startY;
    const spacing = totalDistance / (selectedNodes.length - 1);
    
    // Distribute nodes evenly
    selectedNodes.forEach((node, index) => {
        node.y = startY + spacing * index;
    });
    
    window.Rendering.setNeedsRedraw();
}

/**
 * Snap all selected nodes to grid and resize to grid-aligned dimensions
 */
function snapToGrid(editor) {
    const selectedNodes = getSelectedNodes(editor);
    if (selectedNodes.length === 0) return;
    
    window.NodeManager.saveUndoState(editor);
    
    const gridSize = 25;
    
    selectedNodes.forEach(node => {
        // Get visual scale for parent nodes
        const visualScale = node.level === 0 ? 1.2 : 1.0;
        
        // Get current visual dimensions
        const currentVisualWidth = node.width * visualScale;
        const currentVisualHeight = node.height * visualScale;
        
        // Get current visual bounds
        const currentLeft = node.x - currentVisualWidth / 2;
        const currentTop = node.y - currentVisualHeight / 2;
        
        // Snap visual bounds to grid
        const snappedLeft = Math.round(currentLeft / gridSize) * gridSize;
        const snappedTop = Math.round(currentTop / gridSize) * gridSize;
        
        // Snap visual dimensions to grid
        const snappedVisualWidth = Math.round(currentVisualWidth / gridSize) * gridSize;
        const snappedVisualHeight = Math.round(currentVisualHeight / gridSize) * gridSize;
        
        // Ensure minimum size (2 grid units)
        const minVisualSize = gridSize * 2;
        const finalVisualWidth = Math.max(minVisualSize, snappedVisualWidth);
        const finalVisualHeight = Math.max(minVisualSize, snappedVisualHeight);
        
        // Convert back to actual dimensions
        node.width = finalVisualWidth / visualScale;
        node.height = finalVisualHeight / visualScale;
        
        // Update center position based on snapped top-left
        node.x = snappedLeft + finalVisualWidth / 2;
        node.y = snappedTop + finalVisualHeight / 2;
    });
    
    window.Rendering.setNeedsRedraw();
    window.UIControls.showToast(`Snapped ${selectedNodes.length} node${selectedNodes.length > 1 ? 's' : ''} to grid`);
}

/**
 * Show multi-edit modal
 */
function showMultiEditModal(editor) {
    const selectedNodes = getSelectedNodes(editor);
    if (selectedNodes.length === 0) return;
    
    const modal = document.getElementById('multiEditModal');
    const count = document.getElementById('multiEditCount');
    count.textContent = selectedNodes.length;
    
    // Check for multiple variants and populate fields
    const variants = checkFieldVariants(selectedNodes);
    
    // Name field
    const nameInput = document.getElementById('multiNodeName');
    const nameWarning = document.getElementById('nameWarning');
    nameInput.value = '';
    nameWarning.style.display = variants.name.hasMultiple ? 'inline' : 'none';
    
    // Scalability field
    const scalabilitySelect = document.getElementById('multiNodeScalability');
    const scalabilityWarning = document.getElementById('scalabilityWarning');
    scalabilitySelect.value = '';
    scalabilityWarning.style.display = variants.scalability.hasMultiple ? 'inline' : 'none';
    
    // Milestone field
    const milestoneSelect = document.getElementById('multiNodeMilestone');
    const milestoneWarning = document.getElementById('milestoneWarning');
    // Update milestone options
    updateMultiEditDropdown(milestoneSelect, editor.milestones, 'none');
    milestoneSelect.value = '';
    milestoneWarning.style.display = variants.milestone.hasMultiple ? 'inline' : 'none';
    
    // Tag field
    const tagSelect = document.getElementById('multiNodeTag');
    const tagWarning = document.getElementById('tagWarning');
    // Update tag options
    updateMultiEditDropdown(tagSelect, editor.tags, 'none');
    tagSelect.value = '';
    tagWarning.style.display = variants.tag.hasMultiple ? 'inline' : 'none';
    
    // Description field
    const descriptionInput = document.getElementById('multiNodeDescription');
    const descriptionWarning = document.getElementById('descriptionWarning');
    descriptionInput.value = '';
    descriptionWarning.style.display = variants.description.hasMultiple ? 'inline' : 'none';
    
    // Color swatches
    const swatches = document.querySelectorAll('.multi-color-swatch');
    swatches.forEach(swatch => {
        swatch.classList.remove('active');
        if (swatch.dataset.color === '') {
            swatch.classList.add('active');
        }
        
        swatch.onclick = () => {
            swatches.forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
        };
    });
    
    // Show modal
    modal.style.display = 'flex';
}

/**
 * Check for field variants in selected nodes
 */
function checkFieldVariants(nodes) {
    const variants = {
        name: { values: new Set(), hasMultiple: false },
        scalability: { values: new Set(), hasMultiple: false },
        milestone: { values: new Set(), hasMultiple: false },
        tag: { values: new Set(), hasMultiple: false },
        description: { values: new Set(), hasMultiple: false },
        color: { values: new Set(), hasMultiple: false }
    };
    
    nodes.forEach(node => {
        variants.name.values.add(node.name);
        variants.scalability.values.add(node.scalability || '');
        variants.milestone.values.add(node.milestone || '');
        variants.tag.values.add(node.tag || '');
        variants.description.values.add(node.description || '');
        variants.color.values.add(node.customColor || node.color || '');
    });
    
    Object.keys(variants).forEach(key => {
        variants[key].hasMultiple = variants[key].values.size > 1;
    });
    
    return variants;
}

/**
 * Update dropdown options for multi-edit
 */
function updateMultiEditDropdown(selectElement, items, noneValue) {
    // Keep first two options (Keep existing and None)
    while (selectElement.options.length > 2) {
        selectElement.remove(2);
    }
    
    // Add all items
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        selectElement.appendChild(option);
    });
}

/**
 * Apply multi-edit changes
 */
function applyMultiEdit(editor) {
    const selectedNodes = getSelectedNodes(editor);
    if (selectedNodes.length === 0) return;
    
    window.NodeManager.saveUndoState(editor);
    
    const nameValue = document.getElementById('multiNodeName').value;
    const scalabilityValue = document.getElementById('multiNodeScalability').value;
    const milestoneValue = document.getElementById('multiNodeMilestone').value;
    const tagValue = document.getElementById('multiNodeTag').value;
    const descriptionValue = document.getElementById('multiNodeDescription').value;
    
    // Get active color swatch
    const activeColorSwatch = document.querySelector('.multi-color-swatch.active');
    const colorValue = activeColorSwatch ? activeColorSwatch.dataset.color : '';
    
    // Apply changes to all selected nodes
    selectedNodes.forEach(node => {
        if (nameValue) node.name = nameValue;
        
        if (scalabilityValue) {
            node.scalability = scalabilityValue === 'none' ? '' : scalabilityValue;
        }
        
        if (milestoneValue) {
            node.milestone = milestoneValue === 'none' ? '' : milestoneValue;
        }
        
        if (tagValue) {
            node.tag = tagValue === 'none' ? '' : tagValue;
        }
        
        if (descriptionValue) node.description = descriptionValue;
        
        if (colorValue) {
            node.customColor = colorValue;
            node.color = colorValue;
            
            // Update descendant colors
            if (window.NodeManager && window.NodeManager.updateDescendantColors) {
                window.NodeManager.updateDescendantColors(editor, node);
            }
        }
        
        // Update node color based on attributes if no custom color
        if (!node.customColor) {
            node.color = window.NodeManager.getNodeColor(node, editor);
        }
    });
    
    // Update stats
    window.NodeManager.updateStats(editor);
    
    // Hide modal
    document.getElementById('multiEditModal').style.display = 'none';
    
    // Redraw
    window.Rendering.setNeedsRedraw();
}

/**
 * Setup bulk edit event listeners
 */
function setupBulkEditListeners(editor) {
    // Alignment buttons
    document.getElementById('alignLeft').addEventListener('click', () => alignLeft(editor));
    document.getElementById('alignCenter').addEventListener('click', () => alignCenter(editor));
    document.getElementById('alignRight').addEventListener('click', () => alignRight(editor));
    document.getElementById('alignTop').addEventListener('click', () => alignTop(editor));
    document.getElementById('alignMiddle').addEventListener('click', () => alignMiddle(editor));
    document.getElementById('alignBottom').addEventListener('click', () => alignBottom(editor));
    
    // Distribution buttons
    document.getElementById('distributeHorizontal').addEventListener('click', () => distributeHorizontal(editor));
    document.getElementById('distributeVertical').addEventListener('click', () => distributeVertical(editor));
    
    // Snap to grid button
    document.getElementById('snapToGridBulk').addEventListener('click', () => snapToGrid(editor));
    
    // Multi-edit button
    document.getElementById('multiEdit').addEventListener('click', () => showMultiEditModal(editor));
    
    // Multi-edit modal buttons
    document.getElementById('applyMultiEdit').addEventListener('click', () => applyMultiEdit(editor));
    document.getElementById('cancelMultiEdit').addEventListener('click', () => {
        document.getElementById('multiEditModal').style.display = 'none';
    });
    
    // Handle Escape key for modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('multiEditModal');
            if (modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
        }
    });
}

// === MODULE EXPORT ===
window.BulkEdit = {
    getSelectedNodes,
    updateBulkEditToolbar,
    alignLeft,
    alignCenter,
    alignRight,
    alignTop,
    alignMiddle,
    alignBottom,
    distributeHorizontal,
    distributeVertical,
    snapToGrid,
    showMultiEditModal,
    applyMultiEdit,
    setupBulkEditListeners
};

console.log('Bulk Edit module loaded successfully'); 