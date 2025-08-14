// === ATTRIBUTE MANAGEMENT MODULE ===
// This module handles all custom attribute management and row reordering functionality
// Dependencies: Requires app.js to be loaded first for global variables and functions

/**
 * Add a new custom attribute
 * @param {string} attributeName - Name of the attribute to add
 * @param {number} defaultValue - Default value for the attribute
 * @returns {boolean} True if successfully added, false otherwise
 */
function addCustomAttribute(attributeName, defaultValue = 0) {
    // Validate dependencies
    if (typeof customAttributes === 'undefined' || typeof ships === 'undefined') {
        console.error('Attribute Management dependencies not found. Make sure app.js is loaded first.');
        return false;
    }
    
    console.log(`Adding custom attribute: ${attributeName} with default value: ${defaultValue}`);
    
    // Check if the attribute already exists
    if (statsFromCsv.includes(attributeName) || customAttributes.includes(attributeName)) {
        alert(`Attribute "${attributeName}" already exists.`);
        return false;
    }
    
    // Add to custom attributes list
    customAttributes.push(attributeName);
    console.log(`Custom attributes after adding: ${customAttributes.join(', ')}`);
    
    // Add to the end of the attribute order to ensure it appears at the bottom
    if (!customAttributeOrder.includes(attributeName)) {
        customAttributeOrder.push(attributeName);
        console.log(`Updated attribute order: ${customAttributeOrder.join(', ')}`);
    }
    
    // Add to all ships in the comparison table
    addedShips.forEach(ship => {
        if (!ship.hasOwnProperty(attributeName)) {
            ship[attributeName] = defaultValue;
            console.log(`Added attribute ${attributeName}=${defaultValue} to ship ${ship['Ship Name']}`);
        }
    });
    
    // Add to all ships in the master list
    ships.forEach(ship => {
        if (!ship.hasOwnProperty(attributeName)) {
            ship[attributeName] = defaultValue;
        }
    });
    
    // Add to component attributes system
    Object.keys(componentAttributes).forEach(category => {
        Object.keys(componentAttributes[category]).forEach(groupName => {
            if (!componentAttributes[category][groupName][attributeName]) {
                componentAttributes[category][groupName][attributeName] = {
                    baseValue: 0,
                    values: {}
                };
                
                // Calculate values for all class/tier combinations
                recalculateComponentValues(category, groupName, attributeName);
                console.log(`Added attribute ${attributeName} to component ${category}/${groupName}`);
            }
        });
    });
    
    console.log("Fully rebuilt comparison table needed to show new attribute");
    
    // Make sure the new attribute will appear at the end of the list
    initAttributeOrder();
    
    // Ensure custom attributes are always at the end
    // First, remove all custom attributes from the order
    customAttributeOrder = customAttributeOrder.filter(attr => !customAttributes.includes(attr));
    
    // Then add them back at the end
    customAttributes.forEach(attr => {
        customAttributeOrder.push(attr);
    });
    
    console.log("Final attribute order with custom attributes at end:", customAttributeOrder);
    
    // Update the comparison table to include the new attribute
    updateComparisonTable();
    
    return true;
}

// deleteCustomAttribute function removed - using the comprehensive version from app.js instead

/**
 * Reorder attributes
 * @param {number} fromIndex - Source index
 * @param {number} toIndex - Target index
 * @returns {boolean} True if successfully reordered, false otherwise
 */
function reorderAttributes(fromIndex, toIndex) {
    // Validate dependencies
    if (typeof customAttributeOrder === 'undefined') {
        console.error('Attribute Management dependencies not found. Make sure app.js is loaded first.');
        return false;
    }
    
    console.log(`Reordering attributes from index ${fromIndex} to ${toIndex}`);
    
    // Get the full list of attributes (both from CSV and custom)
    const allAttributes = customAttributeOrder.length > 0 ? 
        customAttributeOrder : getRelevantStats();
    
    console.log("Current attribute order:", allAttributes);
    
    // Make sure indices are valid
    if (fromIndex < 0 || fromIndex >= allAttributes.length || 
        toIndex < 0 || toIndex >= allAttributes.length) {
        console.log("Invalid indices for reordering");
        return false;
    }
    
    // Adjust toIndex if we're moving an item down
    if (fromIndex < toIndex) {
        toIndex--;
    }
    
    // Get the attribute being moved
    const attribute = allAttributes[fromIndex];
    console.log(`Moving attribute: ${attribute}`);
    
    // Remove from current position
    allAttributes.splice(fromIndex, 1);
    
    // Insert at new position
    allAttributes.splice(toIndex, 0, attribute);
    
    console.log("New attribute order:", allAttributes);
    
    // Update the order array
    customAttributeOrder = [...allAttributes];
    
    // Update the comparison table
    updateComparisonTable();
    
    // Refresh any open panels to reflect the new order
    refreshOpenPanels();
    
    return true;
}

/**
 * Initialize attribute order
 */
function initAttributeOrder() {
    // Validate dependencies
    if (typeof statsFromCsv === 'undefined' || typeof customAttributes === 'undefined') {
        console.error('Attribute Management dependencies not found. Make sure app.js is loaded first.');
        return;
    }
    
    console.log("=== INIT ATTRIBUTE ORDER DEBUG ===");
    console.log("statsFromCsv:", statsFromCsv.length, statsFromCsv);
    console.log("customAttributes:", customAttributes.length, customAttributes);
    
    // BULLETPROOF RESET: Create completely new array instance
    customAttributeOrder = new Array();
    console.log("FORCE RESET: customAttributeOrder to new empty array");
    
    // Robust array building: manually push elements to avoid spread operator
    if (statsFromCsv.length > 0) {
        console.log("Adding statsFromCsv elements manually...");
        for (let i = 0; i < statsFromCsv.length; i++) {
            const stat = statsFromCsv[i];
            if (stat && typeof stat === 'string' && stat.trim() !== '') {
                customAttributeOrder.push(stat);
                console.log(`Added CSV stat: ${stat}, new length: ${customAttributeOrder.length}`);
            }
        }
    }
    
    // Add custom attributes manually
    if (customAttributes.length > 0) {
        console.log("Adding custom attributes manually...");
        for (let i = 0; i < customAttributes.length; i++) {
            const attr = customAttributes[i];
            if (attr && typeof attr === 'string' && attr.trim() !== '' && !customAttributeOrder.includes(attr)) {
                customAttributeOrder.push(attr);
                console.log(`Added custom attr: ${attr}, new length: ${customAttributeOrder.length}`);
            }
        }
    }
    
    // Final validation: ensure no sparse array corruption
    const finalLength = customAttributeOrder.length;
    const actualElements = Object.keys(customAttributeOrder).length;
    const hasCorruption = finalLength !== actualElements;
    
    console.log("FINAL VALIDATION:");
    console.log(`Array length: ${finalLength}`);
    console.log(`Actual elements: ${actualElements}`);
    console.log(`Has corruption: ${hasCorruption}`);
    console.log(`Expected total: ${statsFromCsv.length + customAttributes.length}`);
    
    if (hasCorruption) {
        console.error("⚠️ CORRUPTION DETECTED! Rebuilding array manually...");
        const cleanElements = [];
        for (let i = 0; i < customAttributeOrder.length; i++) {
            if (customAttributeOrder.hasOwnProperty(i) && customAttributeOrder[i] !== undefined) {
                cleanElements.push(customAttributeOrder[i]);
            }
        }
        customAttributeOrder = cleanElements;
        console.log(`Rebuilt array: ${customAttributeOrder.length} elements`, customAttributeOrder);
    }
    
    console.log("FINAL RESULT:", customAttributeOrder.length, customAttributeOrder);
    console.log("Array.isArray(customAttributeOrder):", Array.isArray(customAttributeOrder));
    
    // AGGRESSIVE DEBUGGING: Check actual array contents
    console.log("=== AGGRESSIVE ARRAY DEBUG ===");
    console.log("customAttributeOrder.toString():", customAttributeOrder.toString());
    console.log("JSON.stringify(customAttributeOrder):", JSON.stringify(customAttributeOrder));
    console.log("Array.from(customAttributeOrder):", Array.from(customAttributeOrder));
    console.log("[...customAttributeOrder] (spread test):", [...customAttributeOrder]);
    
    // Manual iteration
    const manualContents = [];
    for (let i = 0; i < customAttributeOrder.length; i++) {
        manualContents.push(customAttributeOrder[i]);
    }
    console.log("Manual iteration result:", manualContents);
    
    // Check for prototype pollution
    console.log("customAttributeOrder.constructor === Array:", customAttributeOrder.constructor === Array);
    console.log("customAttributeOrder.__proto__ === Array.prototype:", customAttributeOrder.__proto__ === Array.prototype);
    
    // Set up a timer to check if array gets modified asynchronously
    setTimeout(() => {
        console.log("🔍 ASYNC CHECK - customAttributeOrder 100ms later:", customAttributeOrder.length, customAttributeOrder);
        console.log("🔍 ASYNC CHECK - toString:", customAttributeOrder.toString());
    }, 100);
    
    console.log("=== END INIT ATTRIBUTE ORDER DEBUG ===");
}

/**
 * Handle row drag start
 * @param {Event} e - Drag event
 */
function handleRowDragStart(e) {
    // Validate dependencies
    if (typeof isDraggingRow === 'undefined') {
        console.error('Attribute Management dependencies not found. Make sure app.js is loaded first.');
        return;
    }
    
    console.log("Row drag start", e.target);
    
    // Check if this drag was initiated by our drag handle
    const wasDragHandleClicked = e.currentTarget.hasAttribute('data-dragging') || 
                                window.activeDragHandle !== undefined;
    
    // Only allow dragging if it was initiated by our drag handle
    if (!wasDragHandleClicked && !e.target.classList.contains('drag-handle')) {
        console.log("Preventing drag - not from handle");
        e.preventDefault();
        return;
    }
    
    // Clear the drag handle flag
    if (e.currentTarget.hasAttribute('data-dragging')) {
        e.currentTarget.removeAttribute('data-dragging');
    }
    
    // Store row information in dataTransfer (check if available first)
    if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', e.currentTarget.getAttribute('data-stat-name'));
    e.dataTransfer.effectAllowed = 'move';
    } else {
        console.warn('No dataTransfer available on drag event');
    }
    
    // Get the row element
    const row = e.currentTarget;
    
    // Store the row data
    rowDragData = {
        statName: row.getAttribute('data-stat-name'),
        statIndex: parseInt(row.getAttribute('data-stat-index'))
    };
    
    console.log("Dragging row:", rowDragData);
    
    // Add dragging class
    row.classList.add('dragging');
    
    // Additional dataTransfer operations if available
    if (e.dataTransfer) {
    // Set the drag image to be the row itself
    e.dataTransfer.setDragImage(row, 0, 0);
    }
    
    // Set global flag
    isDraggingRow = true;
}

/**
 * Handle row drag over
 * @param {Event} e - Drag event
 */
function handleRowDragOver(e) {
    // Always check if we have active dragging, indicated by dragging class on any row
    const draggingElem = document.querySelector('.stat-row.dragging');
    if (!draggingElem) {
        return;
    }
    
    // Always prevent default to allow drop
    e.preventDefault();
    if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
    }
    
    // Get the target row
    const row = e.currentTarget;
    
    // Skip if this is the same row that's being dragged
    if (row === draggingElem) {
        return;
    }
    
    // Get the target index
    const targetIndex = parseInt(row.getAttribute('data-stat-index'));
    console.log(`Drag over row ${targetIndex}`);
    
    // Add drop indicator
    const allRows = document.querySelectorAll('.stat-row');
    allRows.forEach(r => {
        if (r !== draggingElem) {
            r.classList.remove('drop-above', 'drop-below');
        }
    });
    
    // Determine if should drop above or below
    const rect = row.getBoundingClientRect();
    const mouseY = e.clientY;
    const rowMiddle = rect.top + rect.height / 2;
    
    if (mouseY < rowMiddle) {
        console.log(`Adding drop-above to row ${targetIndex}`);
        row.classList.add('drop-above');
    } else {
        console.log(`Adding drop-below to row ${targetIndex}`);
        row.classList.add('drop-below');
    }
}

/**
 * Handle row drop
 * @param {Event} e - Drag event
 */
function handleRowDrop(e) {
    // Find the dragged element
    const draggedElement = document.querySelector('.stat-row.dragging');
    if (!draggedElement) {
        console.log("No element being dragged, ignoring drop");
        return;
    }
    
    // Prevent default browser behavior
    e.preventDefault();
    
    // Get source and target indices
    const sourceIndex = parseInt(draggedElement.getAttribute('data-stat-index'));
    const sourceStat = draggedElement.getAttribute('data-stat-name');
    
    // Get the target row
    const targetRow = e.currentTarget;
    
    // Get the target index
    const targetIndex = parseInt(targetRow.getAttribute('data-stat-index'));
    console.log(`Drop target row ${targetIndex}`);
    
    // Determine drop position
    const rect = targetRow.getBoundingClientRect();
    const mouseY = e.clientY;
    const rowMiddle = rect.top + rect.height / 2;
    
    let dropIndex = targetIndex;
    if (mouseY > rowMiddle) {
        dropIndex = targetIndex + 1;
    }
    
    console.log(`Reordering from ${sourceIndex} (${sourceStat}) to ${dropIndex}`);
    
    // Don't reorder if dropping on itself
    if (sourceIndex !== dropIndex && sourceIndex !== dropIndex - 1) {
        // Perform the reordering
        const success = reorderAttributes(sourceIndex, dropIndex);
        console.log(`Reordering success: ${success}`);
    } else {
        console.log("Dropping row onto itself, no change needed");
    }
    
    // Clear drop indicators
    const allRows = document.querySelectorAll('.stat-row');
    allRows.forEach(r => r.classList.remove('drop-above', 'drop-below', 'dragging'));
    
    // Reset global dragging state
    isDraggingRow = false;
    rowDragData = null;
    window.activeDragHandle = undefined;
    
    // Reset any drag handle styling
    const dragHandles = document.querySelectorAll('.drag-handle');
    dragHandles.forEach(handle => {
        handle.style.backgroundColor = '';
        handle.style.color = '';
    });
}

/**
 * Handle row drag end
 * @param {Event} e - Drag event
 */
function handleRowDragEnd(e) {
    console.log("Drag end event", e);
    
    // Clean up any drag-related classes
    e.currentTarget.classList.remove('dragging');
    
    // Clean up any indicators and reset dragging state
    const allRows = document.querySelectorAll('.stat-row');
    allRows.forEach(r => r.classList.remove('drop-above', 'drop-below'));
    
    // Reset global drag state
    isDraggingRow = false;
    rowDragData = null;
    window.activeDragHandle = undefined;
    
    // Reset visual styling on all drag handles
    const dragHandles = document.querySelectorAll('.drag-handle');
    dragHandles.forEach(handle => {
        handle.style.backgroundColor = '';
        handle.style.color = '';
    });
    
    // Force a 1-second delay before re-enabling dragging 
    // This prevents accidental double-drags 
    e.currentTarget.draggable = false;
    setTimeout(() => {
        e.currentTarget.draggable = true;
    }, 1000);
}

/**
 * Rename a custom attribute
 * @param {string} oldName - Current name of the attribute
 * @param {string} newName - New name for the attribute
 * @returns {boolean} True if successfully renamed, false otherwise
 */
function renameCustomAttribute(oldName, newName) {
    // Validate dependencies
    if (typeof customAttributes === 'undefined') {
        console.error('Attribute Management dependencies not found. Make sure app.js is loaded first.');
        return false;
    }
    
    // Check if this is a custom attribute (don't allow renaming base stats)
    if (!customAttributes.includes(oldName)) {
        alert(`Cannot rename base attribute "${oldName}".`);
        return false;
    }
    
    // Check if the new name already exists
    if (statsFromCsv.includes(newName) || customAttributes.includes(newName)) {
        alert(`Attribute "${newName}" already exists.`);
        return false;
    }
    
    // Update custom attributes list
    const index = customAttributes.indexOf(oldName);
    if (index !== -1) {
        customAttributes[index] = newName;
    }
    
    // Update attribute order
    const orderIndex = customAttributeOrder.indexOf(oldName);
    if (orderIndex !== -1) {
        customAttributeOrder[orderIndex] = newName;
    }
    
    // Update all ships
    addedShips.forEach(ship => {
        if (ship.hasOwnProperty(oldName)) {
            ship[newName] = ship[oldName];
            delete ship[oldName];
        }
    });
    
    ships.forEach(ship => {
        if (ship.hasOwnProperty(oldName)) {
            ship[newName] = ship[oldName];
            delete ship[oldName];
        }
    });
    
    // Update component attributes system
    Object.keys(componentAttributes).forEach(category => {
        Object.keys(componentAttributes[category]).forEach(groupName => {
            if (componentAttributes[category][groupName][oldName]) {
                componentAttributes[category][groupName][newName] = componentAttributes[category][groupName][oldName];
                delete componentAttributes[category][groupName][oldName];
            }
        });
    });
    
    // Update the comparison table
    updateComparisonTable();
    
    // Refresh any open panels
    refreshOpenPanels();
    
    return true;
}

// === MODULE EXPORT ===
// Export functions to global scope for use by app.js
window.AttributeManagement = {
    addCustomAttribute,
    reorderAttributes,
    initAttributeOrder,
    handleRowDragStart,
    handleRowDragOver,
    handleRowDrop,
    handleRowDragEnd,
    renameCustomAttribute
};

// Also expose individual functions for backward compatibility
window.addCustomAttribute = addCustomAttribute;
// deleteCustomAttribute is handled by app.js - not exported from this module
window.reorderAttributes = reorderAttributes;
window.initAttributeOrder = initAttributeOrder;
window.handleRowDragStart = handleRowDragStart;
window.handleRowDragOver = handleRowDragOver;
window.handleRowDrop = handleRowDrop;
window.handleRowDragEnd = handleRowDragEnd;
window.renameCustomAttribute = renameCustomAttribute;

console.log('Attribute Management module loaded successfully'); 