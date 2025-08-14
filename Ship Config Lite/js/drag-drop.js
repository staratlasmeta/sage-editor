// === DRAG AND DROP MODULE ===
// This module handles ship column drag and drop functionality for reordering ships
// Dependencies: Requires app.js to be loaded first for global variables and functions

/**
 * Initialize drag and drop functionality for ship columns
 */
function initDragAndDrop() {
    // Validate dependencies
    if (typeof addedShips === 'undefined') {
        console.error('Drag and Drop dependencies not found. Make sure app.js is loaded first.');
        return;
    }
    
    // console.log('Initializing drag and drop for ship columns...');
    
    // Add event listeners to existing ship headers
    document.querySelectorAll('.ship-column-header').forEach((header, index) => {
        setupDragAndDrop(header, index);
    });
    
    // console.log('Drag and drop initialized');
}

/**
 * Set up drag and drop for a specific ship header
 * @param {HTMLElement} header - Ship header element
 * @param {number} index - Ship index
 */
function setupDragAndDrop(header, index) {
    // Make the header draggable
    header.draggable = true;
    header.style.cursor = 'grab';
    
    // Add drag event listeners
    header.addEventListener('dragstart', function(e) {
        console.log(`Starting drag for ship at index ${index}`);
        
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', header.outerHTML);
        e.dataTransfer.setData('text/plain', index.toString());
        
        // Store the dragged ship index
        header.dataset.dragIndex = index;
        
        // Add visual feedback
        header.style.opacity = '0.5';
        header.classList.add('dragging');
        
        // Store reference for cleanup
        window.draggedShipHeader = header;
        window.draggedShipIndex = index;
        
        e.stopPropagation();
    });
    
    header.addEventListener('dragend', function(e) {
        console.log(`Ending drag for ship at index ${index}`);
        
        // Restore visual state
        header.style.opacity = '';
        header.style.cursor = 'grab';
        header.classList.remove('dragging');
        
        // Clean up drop indicators
        document.querySelectorAll('.ship-column-header').forEach(h => {
            h.classList.remove('drop-left', 'drop-right');
        });
        
        // Clear global references
        window.draggedShipHeader = null;
        window.draggedShipIndex = null;
        
        e.stopPropagation();
    });
    
    header.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // Don't show drop indicator on the dragged element itself
        if (header === window.draggedShipHeader) {
            return;
        }
        
        // Determine drop position based on mouse position
        const rect = header.getBoundingClientRect();
        const mouseX = e.clientX;
        const headerMiddle = rect.left + rect.width / 2;
        
        // Clear previous indicators
        header.classList.remove('drop-left', 'drop-right');
        
        if (mouseX < headerMiddle) {
            header.classList.add('drop-left');
        } else {
            header.classList.add('drop-right');
        }
        
        e.stopPropagation();
    });
    
    header.addEventListener('dragleave', function(e) {
        // Only remove indicator if we're actually leaving the element
        if (!header.contains(e.relatedTarget)) {
            header.classList.remove('drop-left', 'drop-right');
        }
        
        e.stopPropagation();
    });
    
    header.addEventListener('drop', function(e) {
        e.preventDefault();
        
        const draggedIndex = window.draggedShipIndex;
        const targetIndex = index;
        
        if (draggedIndex === null || draggedIndex === targetIndex) {
            // Clean up indicators
            header.classList.remove('drop-left', 'drop-right');
            return;
        }
        
        console.log(`Dropping ship from index ${draggedIndex} to ${targetIndex}`);
        
        // Determine final drop position
        const rect = header.getBoundingClientRect();
        const mouseX = e.clientX;
        const headerMiddle = rect.left + rect.width / 2;
        
        let newIndex = targetIndex;
        if (mouseX > headerMiddle) {
            newIndex = targetIndex + 1;
        }
        
        // Adjust for the fact that we're removing the dragged element first
        if (draggedIndex < newIndex) {
            newIndex--;
        }
        
        console.log(`Final drop position: ${newIndex}`);
        
        // Perform the move
        moveShipToNewPosition(draggedIndex, newIndex);
        
        // Clean up indicators
        header.classList.remove('drop-left', 'drop-right');
        
        e.stopPropagation();
    });
}

/**
 * Move a ship to a new position in the comparison table
 * @param {number} fromIndex - Source index
 * @param {number} toIndex - Target index
 */
function moveShipToNewPosition(fromIndex, toIndex) {
    // Validate dependencies
    if (typeof addedShips === 'undefined') {
        console.error('Drag and Drop dependencies not found. Make sure app.js is loaded first.');
        return;
    }
    
    console.log(`Moving ship from index ${fromIndex} to ${toIndex}`);
    
    if (fromIndex === toIndex) {
        console.log('Same position, no move needed');
        return;
    }
    
    // Move the ship in the addedShips array
    const movedShip = addedShips.splice(fromIndex, 1)[0];
    addedShips.splice(toIndex, 0, movedShip);
    
    console.log('Ship moved in array, updating table...');
    
    // Rebuild the entire comparison table to reflect the new order
    updateComparisonTable();
    
    console.log('Ship move complete');
}

/**
 * Find drop target based on mouse position
 * @param {number} clientX - Mouse X position
 * @returns {Object|null} Drop target information
 */
function findDropTarget(clientX) {
    const headers = document.querySelectorAll('.ship-column-header');
    
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        const rect = header.getBoundingClientRect();
        
        if (clientX >= rect.left && clientX <= rect.right) {
            const headerMiddle = rect.left + rect.width / 2;
            const position = clientX < headerMiddle ? 'before' : 'after';
            
            return {
                index: i,
                position: position,
                element: header
            };
        }
    }
    
    return null;
}

/**
 * Highlight drop target
 * @param {number} targetIndex - Target index
 * @param {string} position - Position ('before' or 'after')
 */
function highlightDropTarget(targetIndex, position = 'before') {
    // Clear all existing highlights
    document.querySelectorAll('.ship-column-header').forEach(header => {
        header.classList.remove('drop-left', 'drop-right');
    });
    
    // Add highlight to target
    const targetHeader = document.querySelectorAll('.ship-column-header')[targetIndex];
    if (targetHeader) {
        if (position === 'before') {
            targetHeader.classList.add('drop-left');
        } else {
            targetHeader.classList.add('drop-right');
        }
    }
}

// === MODULE EXPORT ===
// Export functions to global scope for use by app.js
window.DragDrop = {
    initDragAndDrop,
    setupDragAndDrop,
    moveShipToNewPosition,
    findDropTarget,
    highlightDropTarget
};

// Also expose individual functions for backward compatibility
window.initDragAndDrop = initDragAndDrop;
window.setupDragAndDrop = setupDragAndDrop;
window.moveShipToNewPosition = moveShipToNewPosition;
window.findDropTarget = findDropTarget;
window.highlightDropTarget = highlightDropTarget;

console.log('Drag and Drop module loaded successfully'); 