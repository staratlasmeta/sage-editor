// === CONFIGURATION MANAGEMENT MODULE ===
// This module handles all ship configuration management functionality
// Dependencies: Requires app.js to be loaded first for global variables and functions

/**
 * Add a new configuration for a ship
 * @param {number} shipId - Ship ID
 * @param {string} shipIdentifier - Ship identifier
 * @param {Object} options - Options object with optional callback
 */
function addConfiguration(shipId, shipIdentifier, options = {}) {
    // Validate dependencies
    if (typeof addedShips === 'undefined' || typeof shipConfigurations === 'undefined') {
        console.error('Configuration Management dependencies not found. Make sure app.js is loaded first.');
        return;
    }
    
    // Find the ship
    const ship = addedShips.find(s => s.id === shipId);
    if (!ship) {
        console.error(`Ship with ID ${shipId} not found in addConfiguration`);
        return;
    }
    
    // If shipIdentifier wasn't passed, calculate it
    if (!shipIdentifier) {
        shipIdentifier = getShipIdentifier(ship);
    }
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const modalTitle = document.createElement('h3');
    modalTitle.textContent = 'Add Configuration';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modalContainer);
    });
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    
    // Create configuration name input
    const configNameLabel = document.createElement('label');
    configNameLabel.textContent = 'Configuration Name:';
    
    const configNameInput = document.createElement('input');
    configNameInput.type = 'text';
    configNameInput.className = 'config-name-input';
    configNameInput.placeholder = 'Enter configuration name';
    
    // Create add button
    const addButton = document.createElement('button');
    addButton.className = 'add-button';
    addButton.textContent = 'Add Configuration';
    addButton.addEventListener('click', () => {
        const configName = configNameInput.value.trim() || `Config ${shipConfigurations[shipIdentifier].length + 1}`;
        
        // Add new configuration
        shipConfigurations[shipIdentifier].push({
            name: configName,
            components: {
                "Ship Component": {},
                "Ship Module": {},
                "Ship Weapons": {},
                "Countermeasures": {},
                "Missiles": {},
                "Drones": {}
            }
        });
    
        // Update dropdown in the ship comparison table
        const configDropdown = document.querySelector(`.config-dropdown[data-ship-id="${shipId}"][data-ship-identifier="${shipIdentifier}"]`);
        if (configDropdown) {
            // Remove all options except the "Add New Config" option
            while (configDropdown.options.length > 1) {
                configDropdown.remove(0);
            }
            
            // Add options for each configuration
            shipConfigurations[shipIdentifier].forEach((config, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = config.name;
                
                // Insert before the "Add New Config" option
                configDropdown.insertBefore(option, configDropdown.lastChild);
            });
            
            // Select the new option
            const newIndex = shipConfigurations[shipIdentifier].length - 1;
            configDropdown.value = newIndex;
            
            // Update the active config index
            activeConfigIndices[shipId] = newIndex;
            
            // Update the comparison table and config panel
            updateComparisonTable();
            
            // If a callback is provided, call it
            if (options && typeof options.onAdded === 'function') {
                options.onAdded(newIndex);
            }
        }
        
        document.body.removeChild(modalContainer);
    });
    
    // Append elements to modal
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(configNameLabel);
    modalContent.appendChild(configNameInput);
    modalContent.appendChild(addButton);
    modalContainer.appendChild(modalContent);
    
    // Add modal to body
    document.body.appendChild(modalContainer);
}

/**
 * Delete a configuration for a ship
 * @param {number} shipId - Ship ID
 * @param {number} configIndex - Configuration index to delete
 * @param {string} shipIdentifier - Ship identifier
 */
function deleteConfiguration(shipId, configIndex, shipIdentifier) {
    // Validate dependencies
    if (typeof addedShips === 'undefined' || typeof shipConfigurations === 'undefined') {
        console.error('Configuration Management dependencies not found. Make sure app.js is loaded first.');
        return;
    }
    
    console.log(`Attempting to delete configuration ${configIndex} for ship ${shipId}`);
    
    // Find the ship
    const ship = addedShips.find(s => s.id === shipId);
    if (!ship) {
        console.error(`Ship with ID ${shipId} not found in deleteConfiguration`);
        return;
    }
    
    // If shipIdentifier wasn't passed, calculate it
    if (!shipIdentifier) {
        shipIdentifier = getShipIdentifier(ship);
    }
    
    // Make sure the ship and config exist
    if (!shipConfigurations[shipIdentifier] || !shipConfigurations[shipIdentifier][configIndex]) {
        console.error(`Configuration not found: ship ${shipIdentifier}, config ${configIndex}`);
        return;
    }
    
    // Don't allow deleting the last configuration
    if (shipConfigurations[shipIdentifier].length <= 1) {
        alert('Cannot delete the only configuration. Create another configuration first.');
        return;
    }
    
    // Get the name of the configuration being deleted
    const configName = shipConfigurations[shipIdentifier][configIndex].name || `Config ${configIndex + 1}`;
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete the "${configName}" configuration?`)) {
        return;
    }
    
    // If the deleted config is the active one, select the first config
    if (activeConfigIndices[shipId] === configIndex) {
        activeConfigIndices[shipId] = 0;
    }
    // If the deleted config is before the active one, adjust the active index
    else if (activeConfigIndices[shipId] > configIndex) {
        activeConfigIndices[shipId]--;
    }
    
    console.log(`Deleting config ${configIndex} for ship ${shipIdentifier}`);
    console.log(`Active config index before: ${activeConfigIndices[shipId]}`);
    
    // Remove the configuration
    shipConfigurations[shipIdentifier].splice(configIndex, 1);
    
    console.log(`Active config index after: ${activeConfigIndices[shipId]}`);
    console.log(`Remaining configs: ${shipConfigurations[shipIdentifier].length}`);
    
    // Update the comparison table
    updateComparisonTable();
}

/**
 * Duplicate a configuration for a ship
 * @param {number} shipId - Ship ID
 * @param {number} configIndex - Configuration index to duplicate
 * @param {string} shipIdentifier - Ship identifier
 */
function duplicateConfiguration(shipId, configIndex, shipIdentifier) {
    // Validate dependencies
    if (typeof addedShips === 'undefined' || typeof shipConfigurations === 'undefined') {
        console.error('Configuration Management dependencies not found. Make sure app.js is loaded first.');
        return;
    }
    
    console.log(`Attempting to duplicate configuration ${configIndex} for ship ${shipId}`);
    
    // Find the ship
    const ship = addedShips.find(s => s.id === shipId);
    if (!ship) {
        console.error(`Ship with ID ${shipId} not found in duplicateConfiguration`);
        return;
    }
    
    // If shipIdentifier wasn't passed, calculate it
    if (!shipIdentifier) {
        shipIdentifier = getShipIdentifier(ship);
    }
    
    // Make sure the ship and config exist
    if (!shipConfigurations[shipIdentifier] || !shipConfigurations[shipIdentifier][configIndex]) {
        console.error(`Configuration not found: ship ${shipIdentifier}, config ${configIndex}`);
        return;
    }
    
    // Get the source configuration
    const sourceConfig = shipConfigurations[shipIdentifier][configIndex];
    
    // Create a name for the duplicate configuration
    const newName = `${sourceConfig.name} Copy`;
    
    // Deep clone the components object
    const newComponents = JSON.parse(JSON.stringify(sourceConfig.components));
    
    // Create the duplicate configuration, preserving the locked state
    const duplicateConfig = {
        name: newName,
        components: newComponents,
        locked: sourceConfig.locked || false
    };
    
    // Add the new configuration to the configurations list
    shipConfigurations[shipIdentifier].push(duplicateConfig);
    
    // Set the active config index to the new configuration
    const newConfigIndex = shipConfigurations[shipIdentifier].length - 1;
    activeConfigIndices[shipId] = newConfigIndex;
    
    console.log(`Duplicated config ${configIndex} to new config ${newConfigIndex} for ship ${shipIdentifier}`);
    
    // Update the comparison table
    updateComparisonTable();
}

/**
 * Rename a configuration for a ship
 * @param {number} shipId - Ship ID
 * @param {number} configIndex - Configuration index to rename
 * @param {string} shipIdentifier - Ship identifier
 */
function renameConfiguration(shipId, configIndex, shipIdentifier) {
    // Validate dependencies
    if (typeof addedShips === 'undefined' || typeof shipConfigurations === 'undefined') {
        console.error('Configuration Management dependencies not found. Make sure app.js is loaded first.');
        return;
    }
    
    console.log(`Attempting to rename configuration ${configIndex} for ship ${shipId}`);
    
    // Find the ship
    const ship = addedShips.find(s => s.id === shipId);
    if (!ship) {
        console.error(`Ship with ID ${shipId} not found in renameConfiguration`);
        return;
    }
    
    // If shipIdentifier wasn't passed, calculate it
    if (!shipIdentifier) {
        shipIdentifier = getShipIdentifier(ship);
    }
    
    // Make sure the ship and config exist
    if (!shipConfigurations[shipIdentifier] || !shipConfigurations[shipIdentifier][configIndex]) {
        console.error(`Configuration not found: ship ${shipIdentifier}, config ${configIndex}`);
        return;
    }
    
    // Get the current configuration
    const config = shipConfigurations[shipIdentifier][configIndex];
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const modalTitle = document.createElement('h3');
    modalTitle.textContent = 'Rename Configuration';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modalContainer);
    });
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    
    // Create configuration name input
    const configNameLabel = document.createElement('label');
    configNameLabel.textContent = 'Configuration Name:';
    
    const configNameInput = document.createElement('input');
    configNameInput.type = 'text';
    configNameInput.className = 'config-name-input';
    configNameInput.placeholder = 'Enter configuration name';
    configNameInput.value = config.name || `Config ${configIndex + 1}`;
    
    // Create rename button
    const renameButton = document.createElement('button');
    renameButton.className = 'add-button';
    renameButton.textContent = 'Rename Configuration';
    
    // Function to handle rename
    const handleRename = () => {
        const newName = configNameInput.value.trim() || `Config ${configIndex + 1}`;
        
        // Update the configuration name
        config.name = newName;
        
        // Update the comparison table
        updateComparisonTable();
        
        // Close the modal
        document.body.removeChild(modalContainer);
    };
    
    // Add click handler to button
    renameButton.addEventListener('click', handleRename);
    
    // Add Enter key handler to input
    configNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleRename();
        }
    });
    
    // Focus the input and select all text for easy replacement
    setTimeout(() => {
        configNameInput.focus();
        configNameInput.select();
    }, 100);
    
    // Append elements to modal
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(configNameLabel);
    modalContent.appendChild(configNameInput);
    modalContent.appendChild(renameButton);
    modalContainer.appendChild(modalContent);
    
    // Add modal to body
    document.body.appendChild(modalContainer);
}

/**
 * Copy a configuration to clipboard
 * @param {number} shipId - Ship ID
 * @param {number} configIndex - Configuration index to copy
 * @param {string} shipIdentifier - Ship identifier
 */
function copyConfiguration(shipId, configIndex, shipIdentifier) {
    // Validate dependencies
    if (typeof addedShips === 'undefined' || typeof shipConfigurations === 'undefined') {
        console.error('Configuration Management dependencies not found. Make sure app.js is loaded first.');
        return;
    }
    
    console.log(`Attempting to copy configuration ${configIndex} for ship ${shipId}`);
    
    // Find the ship
    const ship = addedShips.find(s => s.id === shipId);
    if (!ship) {
        console.error(`Ship with ID ${shipId} not found in copyConfiguration`);
        return;
    }
    
    // If shipIdentifier wasn't passed, calculate it
    if (!shipIdentifier) {
        shipIdentifier = getShipIdentifier(ship);
    }
    
    // Make sure the ship and config exist
    if (!shipConfigurations[shipIdentifier] || !shipConfigurations[shipIdentifier][configIndex]) {
        console.error(`Configuration not found: ship ${shipIdentifier}, config ${configIndex}`);
        return;
    }
    
    // Get the source configuration
    const sourceConfig = shipConfigurations[shipIdentifier][configIndex];
    
    // Create a copy with the same name but add "(Copy)" to indicate it's a copy when pasted
    const configCopy = {
        name: `${sourceConfig.name} (Copy)`,
        components: JSON.parse(JSON.stringify(sourceConfig.components)), // Deep clone
        locked: sourceConfig.locked || false // Preserve locked state
    };
    
    // Store the configuration in the global variable
    copiedConfiguration = configCopy;
    
    // Save to localStorage for persistence
    try {
        localStorage.setItem('copiedConfiguration', JSON.stringify(copiedConfiguration));
    } catch (e) {
        console.error('Error saving configuration to localStorage:', e);
    }
    
    console.log(`Copied configuration '${sourceConfig.name}' from ship ${shipIdentifier} to clipboard`);
    
    // Update all paste menu items in dropdown menus
    document.querySelectorAll('.actions-dropdown-menu .actions-menu-item').forEach(item => {
        if (item.textContent === 'Paste Config') {
            item.style.opacity = '1';
            item.style.cursor = 'pointer';
            item.style.color = '#3d8bf8'; // Blue color for paste
            
            // Re-add the click event
            const shipId = parseInt(item.closest('.actions-dropdown-menu').id.replace('actions-menu-', ''));
            const ship = addedShips.find(s => s.id === shipId);
            if (ship) {
                const shipIdentifier = getShipIdentifier(ship);
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    pasteConfiguration(shipId, shipIdentifier);
                    item.closest('.actions-dropdown-menu').style.display = 'none';
                });
            }
        }
    });
    
    // Show a brief notification
    const notification = document.createElement('div');
    notification.textContent = 'Configuration copied';
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
    
    // Remove notification after 2 seconds
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 2000);
}

/**
 * Paste a copied configuration to a ship
 * @param {number} shipId - Ship ID
 * @param {string} shipIdentifier - Ship identifier
 */
function pasteConfiguration(shipId, shipIdentifier) {
    // Validate dependencies
    if (typeof addedShips === 'undefined' || typeof shipConfigurations === 'undefined') {
        console.error('Configuration Management dependencies not found. Make sure app.js is loaded first.');
        return;
    }
    
    console.log(`Attempting to paste configuration to ship ${shipId}`);
    
    // Check if there is a configuration in the clipboard
    if (!copiedConfiguration) {
        console.error('No configuration in clipboard');
        alert('No configuration to paste. Please copy a configuration first.');
        return;
    }
    
    // Find the ship
    const ship = addedShips.find(s => s.id === shipId);
    if (!ship) {
        console.error(`Ship with ID ${shipId} not found in pasteConfiguration`);
        return;
    }
    
    // If shipIdentifier wasn't passed, calculate it
    if (!shipIdentifier) {
        shipIdentifier = getShipIdentifier(ship);
    }
    
    // Make sure the ship exists
    if (!shipConfigurations[shipIdentifier]) {
        shipConfigurations[shipIdentifier] = [];
    }
    
    // Create a new configuration by deep cloning the copied one
    const newConfig = {
        name: copiedConfiguration.name,
        components: JSON.parse(JSON.stringify(copiedConfiguration.components)),
        locked: copiedConfiguration.locked || false // Preserve locked state
    };
    
    // Add the configuration to the ship's configurations
    shipConfigurations[shipIdentifier].push(newConfig);
    
    // Set the active config index to the new configuration
    const newConfigIndex = shipConfigurations[shipIdentifier].length - 1;
    activeConfigIndices[shipId] = newConfigIndex;
    
    console.log(`Pasted configuration '${newConfig.name}' to ship ${shipIdentifier} at index ${newConfigIndex}`);
    
    // Update the comparison table
    updateComparisonTable();
    
    // Show a brief notification
    const notification = document.createElement('div');
    notification.textContent = 'Configuration pasted';
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
    
    // Remove notification after 2 seconds
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 2000);
}

// === MODULE EXPORT ===
// Export functions to global scope for use by app.js
window.ConfigManagement = {
    addConfiguration,
    deleteConfiguration,
    duplicateConfiguration,
    renameConfiguration,
    copyConfiguration,
    pasteConfiguration
};

// Also expose individual functions for backward compatibility
window.addConfiguration = addConfiguration;
window.deleteConfiguration = deleteConfiguration;
window.duplicateConfiguration = duplicateConfiguration;
window.renameConfiguration = renameConfiguration;
window.copyConfiguration = copyConfiguration;
window.pasteConfiguration = pasteConfiguration;

console.log('Configuration Management module loaded successfully'); 