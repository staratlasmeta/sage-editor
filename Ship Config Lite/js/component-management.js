// === COMPONENT MANAGEMENT MODULE ===
// This module handles all component-related functionality including compatibility checking and component creation
// Dependencies: Requires app.js to be loaded first for global variables and functions

/**
 * Get compatible components for a specific type and ship class
 * @param {string} category - Component category
 * @param {string} componentType - Component type
 * @param {number} shipClass - Ship class number
 * @returns {Array} Array of compatible components
 */
function getCompatibleComponents(category, componentType, shipClass) {
    // Validate dependencies
    if (typeof components === 'undefined') {
        console.error('Component Management dependencies not found. Make sure app.js is loaded first.');
        return [];
    }
    
    if (!components || !components.rewardTree) return [];
    
    const compatible = [];
    console.log(`Finding components for category: ${category}, type: ${componentType}, shipClass: ${shipClass}`);
    
    // Convert ship class to number to be safe
    const shipClassNum = parseInt(shipClass) || shipClass;
    
    // Get the top-level category node
    const categoryNode = components.rewardTree.find(node => 
        node.properties && node.properties.Category === category
    );
    
    if (!categoryNode || !categoryNode.children) {
        console.log("Category not found:", category);
        return [];
    }
    
    // Get compatible class sizes based on ship class
    const compatibleClasses = getCompatibleClassSizes(shipClassNum);
    console.log("Compatible classes:", compatibleClasses);
    
    // Handle different category structures
    switch(category) {
        case "Ship Component":
            // Find the component type in the category
            const componentTypeNode = categoryNode.children.find(node => 
                node.properties && node.properties["Ship Component"] === componentType
            );
            
            if (!componentTypeNode || !componentTypeNode.children) {
                console.log("Component type not found:", componentType);
                return [];
            }
            
            // Extract components with compatible classes
            componentTypeNode.children.forEach(classNode => {
                if (classNode.properties && classNode.properties.Class && 
                    compatibleClasses.includes(classNode.properties.Class)) {
                    // Add each tier of the class
                    if (classNode.children) {
                        classNode.children.forEach(tierComponent => {
                            compatible.push(tierComponent);
                        });
                    }
                }
            });
            break;
            
        case "Ship Module":
            // Find the module type in the category
            const moduleTypeNode = categoryNode.children.find(node => 
                node.properties && node.properties["Ship Modules"] === componentType
            );
            
            if (!moduleTypeNode || !moduleTypeNode.children) {
                console.log("Module type not found:", componentType);
                return [];
            }
            
            // Extract modules with compatible classes
            moduleTypeNode.children.forEach(classNode => {
                if (classNode.properties && classNode.properties.Class && 
                    compatibleClasses.includes(classNode.properties.Class)) {
                    // Add each tier of the class
                    if (classNode.children) {
                        classNode.children.forEach(tierModule => {
                            compatible.push(tierModule);
                        });
                    }
                }
            });
            break;
            
        case "Ship Weapons":
            // Find the damage type in the category
            const damageTypeNode = categoryNode.children.find(node => 
                node.properties && node.properties["Damage Type"] === componentType
            );
            
            if (!damageTypeNode || !damageTypeNode.children) {
                console.log("Weapon damage type not found:", componentType);
                return [];
            }
            
            // Loop through tiers
            damageTypeNode.children.forEach(tierNode => {
                if (tierNode.children) {
                    // Find classes compatible with the ship
                    tierNode.children.forEach(classNode => {
                        if (classNode.properties && classNode.properties.Class && 
                            compatibleClasses.includes(classNode.properties.Class)) {
                            // Add each firing cadence of this tier and class
                            if (classNode.children) {
                                classNode.children.forEach(weapon => {
                                    compatible.push(weapon);
                                });
                            }
                        }
                    });
                }
            });
            break;
            
        case "Countermeasures":
            // Process tiers
            categoryNode.children.forEach(tierNode => {
                if (tierNode.children) {
                    // Find classes compatible with the ship
                    tierNode.children.forEach(classNode => {
                        if (classNode.properties && classNode.properties.Class && 
                            compatibleClasses.includes(classNode.properties.Class)) {
                            // Get the specific countermeasure type
                            if (classNode.children) {
                                classNode.children.forEach(countermeasure => {
                                    if (countermeasure.properties && 
                                        countermeasure.properties.Countermeasure === componentType) {
                                        compatible.push(countermeasure);
                                    }
                                });
                            }
                        }
                    });
                }
            });
            break;
            
        case "Missiles":
            // Process tiers
            categoryNode.children.forEach(tierNode => {
                if (tierNode.children) {
                    // Find classes compatible with the ship
                    tierNode.children.forEach(classNode => {
                        if (classNode.properties && classNode.properties.Class && 
                            compatibleClasses.includes(classNode.properties.Class)) {
                            // Get the specific missile damage type
                            if (classNode.children) {
                                classNode.children.forEach(missile => {
                                    if (missile.properties && 
                                        missile.properties["Damage Type"] === componentType) {
                                        compatible.push(missile);
                                    }
                                });
                            }
                        }
                    });
                }
            });
            break;
            
        case "Drones":
            // Drones: Category > Drone Type > Individual Drones (simpler than Ship Weapons)
            // Find the drone type node that matches componentType
            const droneTypeNode = categoryNode.children.find(node => {
                // Check various ways the drone type might be stored
                if (node.name === componentType) return true;
                
                if (node.properties) {
                    // Check common property names
                    if (node.properties["Drone Type"] === componentType) return true;
                    if (node.properties["Type"] === componentType) return true;
                    if (node.properties["Drones"] === componentType) return true;
                    
                    // Check if there's a single property that matches
                    const propKeys = Object.keys(node.properties);
                    if (propKeys.length === 1 && node.properties[propKeys[0]] === componentType) {
                        return true;
                    }
                }
                
                return false;
            });
            
            if (!droneTypeNode) {
                return [];
            }
            
            // Process drones under this type
            if (droneTypeNode.children) {
                // For drones, the structure is simpler: Drone Type > Individual Drones
                // Individual drones don't have Class properties, so we add them all
                droneTypeNode.children.forEach(droneNode => {
                    // Since drones don't have classes in the structure, add all drones
                    // The drone should have properties like "Drones", "Category", "Drone Type"
                    if (droneNode.properties && droneNode.properties["Drones"]) {
                        compatible.push(droneNode);
                    } else if (droneNode.name) {
                        // Fallback to using the node name
                        compatible.push(droneNode);
                    }
                });
            }
            break;
    }
    
    console.log(`Found ${compatible.length} compatible components`);
    return compatible;
}

/**
 * Check if a component matches a specific type
 * @param {Object} component - Component object
 * @param {string} category - Component category
 * @param {string} componentType - Component type
 * @returns {boolean} True if component matches type
 */
function isComponentMatchingType(component, category, componentType) {
    if (!component.properties) return false;
    
    if (category === "Ship Component" && component.properties["Ship Component"] === componentType) {
        return true;
    } else if (category === "Ship Module" && component.properties["Ship Modules"] === componentType) {
        return true;
    } else if (category === "Ship Weapons" && component.properties["Damage Type"] === componentType) {
        return true;
    } else if (category === "Countermeasures" && component.properties["Countermeasure"] === componentType) {
        return true;
    } else if (category === "Missiles" && component.properties["Damage Type"] === componentType &&
               component.properties["Category"] === "Missiles") {
        return true;
    } else if (category === "Drones") {
        // For drones, check if the component's Drone Type matches
        if (component.properties && component.properties["Drone Type"] === componentType) {
            return true;
        }
        return false;
    }
    
    return false;
}

/**
 * Check if a component is compatible with a ship's class
 * @param {Object} component - Component object
 * @param {Array} compatibleClasses - Array of compatible class names
 * @returns {boolean} True if component is compatible
 */
function isComponentCompatibleWithShip(component, compatibleClasses) {
    if (!component.properties || !component.properties.Class) return true;
    
    return compatibleClasses.includes(component.properties.Class);
}

/**
 * Get compatible class sizes based on ship class
 * @param {number} shipClass - Ship class number
 * @returns {Array} Array of compatible class names
 */
function getCompatibleClassSizes(shipClass) {
    // Convert ship class to number to ensure proper comparison
    const shipClassNum = parseInt(shipClass);
    console.log("Getting compatible classes for ship class:", shipClassNum);
    
    // Return ALL class sizes - no restrictions based on ship class
    // This allows users to slot any size component on any ship
    const allClasses = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'CAP', 'CMD', 'Class 8', 'TTN'];
    
    console.log("Compatible classes (all sizes enabled):", allClasses);
    return allClasses;
}

/**
 * Find component by ID
 * @param {string|number} componentId - Component ID to find
 * @returns {Object|null} Component object or null if not found
 */
function findComponentById(componentId) {
    // Validate dependencies
    if (typeof components === 'undefined') {
        console.error('Component Management dependencies not found. Make sure app.js is loaded first.');
        return null;
    }
    
    if (!components || !components.rewardTree) return null;
    
    // Helper function to recursively search through the reward tree
    function searchInNode(node) {
        if (node.id && node.id.toString() === componentId.toString()) return node;
        
        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                const found = searchInNode(child);
                if (found) return found;
            }
        }
        
        return null;
    }
    
    // Try direct lookup in case components are stored in a flat structure
    if (components.componentsById && components.componentsById[componentId]) {
        return components.componentsById[componentId];
    }
    
    // Search through all top-level categories
    for (const category of components.rewardTree) {
        const found = searchInNode(category);
        if (found) return found;
    }
    
    console.warn(`Component with ID ${componentId} not found in component tree`);
    
    // As a fallback, check if we have an all-components array
    if (components.allComponents && Array.isArray(components.allComponents)) {
        const found = components.allComponents.find(c => c.id === componentId);
        if (found) return found;
    }
    
    return null;
}

/**
 * Clean up missing components from all ship configurations
 * This is useful when loading a new components file that doesn't include
 * components that were previously slotted
 * @returns {Object} Report of cleaned components
 */
function cleanupMissingComponents() {
    if (typeof shipConfigurations === 'undefined') {
        console.error('cleanupMissingComponents: shipConfigurations not found');
        return { cleanedCount: 0, details: [] };
    }
    
    let cleanedCount = 0;
    const details = [];
    
    // Go through all ship configurations
    Object.keys(shipConfigurations).forEach(shipIdentifier => {
        const configs = shipConfigurations[shipIdentifier];
        
        configs.forEach((config, configIndex) => {
            if (!config.components) return;
            
            Object.keys(config.components).forEach(category => {
                const categoryComponents = config.components[category];
                
                Object.keys(categoryComponents).forEach(componentType => {
                    const componentIds = categoryComponents[componentType];
                    
                    if (Array.isArray(componentIds)) {
                        // Filter out missing components
                        const validIds = componentIds.filter(id => {
                            if (!id) return false;
                            const component = findComponentById(id);
                            if (!component) {
                                cleanedCount++;
                                details.push({
                                    shipIdentifier,
                                    configName: config.name,
                                    category,
                                    componentType,
                                    missingId: id
                                });
                                return false;
                            }
                            return true;
                        });
                        
                        // Update the array with only valid components
                        config.components[category][componentType] = validIds;
                    } else if (componentIds) {
                        // Single component ID
                        const component = findComponentById(componentIds);
                        if (!component) {
                            cleanedCount++;
                            details.push({
                                shipIdentifier,
                                configName: config.name,
                                category,
                                componentType,
                                missingId: componentIds
                            });
                            // Clear the missing component
                            config.components[category][componentType] = '';
                        }
                    }
                });
            });
        });
    });
    
    if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} missing component references`);
        console.log('Details:', details);
    }
    
    return { cleanedCount, details };
}

/**
 * Create an individual component slot
 * @param {string} category - Component category
 * @param {string} componentType - Component type
 * @param {number} shipId - Ship ID
 * @param {string} shipIdentifier - Ship identifier
 * @param {number} configIndex - Configuration index
 * @param {string} selectedComponentId - Selected component ID
 * @param {number} slotIndex - Slot index
 * @param {HTMLElement} parentContainer - Parent container element
 * @param {boolean} isLocked - Whether the configuration is locked
 */
function createComponentSlot(category, componentType, shipId, shipIdentifier, configIndex, selectedComponentId, slotIndex, parentContainer, isLocked = false) {
    // Validate dependencies
    if (typeof addedShips === 'undefined' || typeof shipConfigurations === 'undefined') {
        console.error('Component Management dependencies not found. Make sure app.js is loaded first.');
        return;
    }
    
    // Create the slot div
    const slotDiv = document.createElement('div');
    slotDiv.className = 'component-slot';
    slotDiv.style.display = 'flex';
    slotDiv.style.alignItems = 'center';
    slotDiv.style.marginBottom = '2px'; // Minimal margin between slots
    slotDiv.style.padding = '0'; // No padding needed
    slotDiv.style.paddingLeft = '8px'; // Add consistent left padding
    slotDiv.style.paddingRight = '8px'; // Add consistent right padding
    slotDiv.setAttribute('data-slot-index', slotIndex);
    
    // Create dropdown
    const dropdown = document.createElement('select');
    dropdown.className = 'component-dropdown';
    dropdown.style.flex = '1';
    dropdown.style.height = '28px'; // Standardize height
    dropdown.style.boxSizing = 'border-box';
    dropdown.style.padding = '0 8px'; // Adjusted padding
    dropdown.style.margin = '0'; // Remove any default margins
    dropdown.style.borderRadius = '3px'; // Match button
    dropdown.setAttribute('data-category', category);
    dropdown.setAttribute('data-type', componentType);
    dropdown.setAttribute('data-ship-id', shipId);
    dropdown.setAttribute('data-ship-identifier', shipIdentifier);
    dropdown.setAttribute('data-config-index', configIndex);
    dropdown.setAttribute('data-slot-index', slotIndex);
    
    // Disable dropdown if locked
    if (isLocked) {
        dropdown.disabled = true;
        dropdown.style.backgroundColor = '#1a1a1a';
        dropdown.style.cursor = 'not-allowed';
    }
    
    // Create "None" option
    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = 'None';
    dropdown.appendChild(noneOption);
    
    // Get compatible components
    const compatibleComponents = getCompatibleComponents(category, componentType, addedShips.find(s => s.id === shipId).Class);
    
    // Add options for each compatible component
    compatibleComponents.forEach(component => {
        const option = document.createElement('option');
        option.value = component.id;
        
        // Generate a more descriptive name for the component
        let componentName = component.name || `${componentType} ${component.properties.Class} ${component.properties.Tier}`;
        let displayAttributes = [];
        
        if (component.properties) {
            // For drones, use the "Drones" property which contains the actual drone name
            if (category === "Drones" && component.properties["Drones"]) {
                componentName = component.properties["Drones"];
            }
            
            // Collect relevant properties for component attributes
            if (component.properties.Tier) displayAttributes.push(component.properties.Tier);
            if (component.properties.Class) displayAttributes.push(component.properties.Class);
            if (component.properties["Firing Cadences"]) displayAttributes.push(component.properties["Firing Cadences"]);
            if (component.properties.Manufacturer && component.properties.Manufacturer !== componentType) {
                displayAttributes.push(component.properties.Manufacturer);
            }
            if (component.properties["Damage Type"]) {
                displayAttributes.push(component.properties["Damage Type"]);
            }
        }
        
        // If we have a list of attributes, format them nicely
        let displayName = componentName;
        if (displayAttributes.length > 0) {
            displayName += " - " + displayAttributes.join(" - ");
        }
        
        option.textContent = displayName;
        
        // Check if this component is selected
        if (selectedComponentId && selectedComponentId.toString() === component.id.toString()) {
            option.selected = true;
        }
        
        dropdown.appendChild(option);
    });
    
    // Add event listener for dropdown change
    dropdown.addEventListener('change', function() {
        const selectedValue = this.value;
        const category = this.getAttribute('data-category');
        const componentType = this.getAttribute('data-type');
        const shipId = parseInt(this.getAttribute('data-ship-id'));
        const shipIdentifier = this.getAttribute('data-ship-identifier');
        const configIndex = parseInt(this.getAttribute('data-config-index'));
        const slotIndex = parseInt(this.getAttribute('data-slot-index'));
        
        // Update the configuration with the new component
        updateComponentInConfiguration(category, componentType, selectedValue, shipId, shipIdentifier, configIndex, slotIndex);
    });
    
    // Only add buttons if not locked
    if (!isLocked) {
        // Add duplicate button - styled similar to remove button but with different icon/color
        const duplicateBtn = document.createElement('button');
        duplicateBtn.textContent = '⊕'; // Plus in circle icon
        duplicateBtn.className = 'duplicate-component-slot';
        duplicateBtn.style.marginLeft = '4px'; // Small space between dropdown and duplicate button
        duplicateBtn.style.backgroundColor = '#ff9800'; // Orange background
        duplicateBtn.style.color = 'white'; 
        duplicateBtn.style.border = '1px solid #f57c00';
        duplicateBtn.style.borderRadius = '3px';
        duplicateBtn.style.width = '28px';
        duplicateBtn.style.height = '28px'; // Match dropdown height
        duplicateBtn.style.cursor = 'pointer';
        duplicateBtn.style.fontSize = '16px';
        duplicateBtn.style.fontWeight = 'bold';
        duplicateBtn.style.display = 'flex';
        duplicateBtn.style.alignItems = 'center';
        duplicateBtn.style.justifyContent = 'center';
        duplicateBtn.style.padding = '3px 8px'; // Match other button padding
        duplicateBtn.style.boxSizing = 'border-box';
        duplicateBtn.style.lineHeight = '1';
        duplicateBtn.style.transition = 'background-color 0.2s';
        duplicateBtn.title = 'Duplicate this component';
        duplicateBtn.setAttribute('data-category', category);
        duplicateBtn.setAttribute('data-type', componentType);
        duplicateBtn.setAttribute('data-ship-id', shipId);
        duplicateBtn.setAttribute('data-ship-identifier', shipIdentifier);
        duplicateBtn.setAttribute('data-config-index', configIndex);
        duplicateBtn.setAttribute('data-slot-index', slotIndex);
        duplicateBtn.setAttribute('data-selected-component', selectedComponentId || '');
        
        // Add hover effect
        duplicateBtn.addEventListener('mouseover', function() {
            this.style.backgroundColor = '#f57c00'; // Slightly darker orange on hover
        });
        
        duplicateBtn.addEventListener('mouseout', function() {
            this.style.backgroundColor = '#ff9800'; // Back to original orange color
        });
        
        duplicateBtn.addEventListener('click', function() {
            duplicateComponentSlotWithValue(this);
        });
        
        // Add remove button to all slots - styled similar to + Add but with different colors
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.className = 'remove-component-slot';
        removeBtn.style.marginLeft = '4px'; // Small space between duplicate and X button
        removeBtn.style.backgroundColor = '#444'; // Darker background
        removeBtn.style.color = 'white'; 
        removeBtn.style.border = '1px solid #555';
        removeBtn.style.borderRadius = '3px';
        removeBtn.style.width = '28px';
        removeBtn.style.height = '28px'; // Match dropdown height
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.fontSize = '18px';
        removeBtn.style.fontWeight = 'bold';
        removeBtn.style.display = 'flex';
        removeBtn.style.alignItems = 'center';
        removeBtn.style.justifyContent = 'center';
        removeBtn.style.padding = '3px 8px'; // Match + Add button padding
        removeBtn.style.boxSizing = 'border-box';
        removeBtn.style.lineHeight = '1';
        removeBtn.style.transition = 'background-color 0.2s';
        removeBtn.setAttribute('data-category', category);
        removeBtn.setAttribute('data-type', componentType);
        removeBtn.setAttribute('data-ship-id', shipId);
        removeBtn.setAttribute('data-ship-identifier', shipIdentifier);
        removeBtn.setAttribute('data-config-index', configIndex);
        removeBtn.setAttribute('data-slot-index', slotIndex);
        
        // Add hover effect
        removeBtn.addEventListener('mouseover', function() {
            this.style.backgroundColor = '#555'; // Slightly lighter on hover
        });
        
        removeBtn.addEventListener('mouseout', function() {
            this.style.backgroundColor = '#444'; // Back to original color
        });
        
        removeBtn.addEventListener('click', function() {
            removeComponentSlot(this);
        });
        
        slotDiv.appendChild(dropdown);
        slotDiv.appendChild(duplicateBtn);
        slotDiv.appendChild(removeBtn);
    } else {
        // When locked, only add the dropdown without buttons
        slotDiv.appendChild(dropdown);
    }
    
    // Add the slot to the parent container
    parentContainer.appendChild(slotDiv);
}

/**
 * Duplicate a component slot with its current value
 * @param {HTMLElement} button - Button element that triggered the action
 */
function duplicateComponentSlotWithValue(button) {
    // Validate dependencies
    if (typeof shipConfigurations === 'undefined') {
        console.error('Component Management dependencies not found. Make sure app.js is loaded first.');
        return;
    }
    
    const category = button.getAttribute('data-category');
    const componentType = button.getAttribute('data-type');
    const shipId = parseInt(button.getAttribute('data-ship-id'));
    const shipIdentifier = button.getAttribute('data-ship-identifier');
    const configIndex = parseInt(button.getAttribute('data-config-index'));
    const slotIndex = parseInt(button.getAttribute('data-slot-index'));
    
    // Get the current component value from the dropdown in the same slot
    const slotDiv = button.closest('.component-slot');
    const dropdown = slotDiv.querySelector('.component-dropdown');
    const selectedComponentId = dropdown ? dropdown.value : '';
    
    // Find the parent container
    const container = button.closest('.component-slot-container');
    if (!container) return;
    
    // Get the current number of slots
    const slots = container.querySelectorAll('.component-slot');
    const nextSlotIndex = slots.length;
    
    // Create a new component slot with the same selected value
    createComponentSlot(category, componentType, shipId, shipIdentifier, configIndex, selectedComponentId, nextSlotIndex, container);
    
    // Add the component value to the configuration array
    updateComponentInConfiguration(category, componentType, selectedComponentId, shipId, shipIdentifier, configIndex, nextSlotIndex);
}

/**
 * Duplicate a component slot (creates empty slot)
 * @param {HTMLElement} button - Button element that triggered the action
 */
function duplicateComponentSlot(button) {
    // Validate dependencies
    if (typeof shipConfigurations === 'undefined') {
        console.error('Component Management dependencies not found. Make sure app.js is loaded first.');
        return;
    }
    
    const category = button.getAttribute('data-category');
    const componentType = button.getAttribute('data-type');
    const shipId = parseInt(button.getAttribute('data-ship-id'));
    const shipIdentifier = button.getAttribute('data-ship-identifier');
    const configIndex = parseInt(button.getAttribute('data-config-index'));
    
    // Find the parent container
    const container = button.closest('.component-slot-container');
    if (!container) return;
    
    // Get the current number of slots
    const slots = container.querySelectorAll('.component-slot');
    const nextSlotIndex = slots.length;
    
    // Create a new empty component slot
    createComponentSlot(category, componentType, shipId, shipIdentifier, configIndex, '', nextSlotIndex, container);
    
    // Add empty value to the configuration array
    updateComponentInConfiguration(category, componentType, '', shipId, shipIdentifier, configIndex, nextSlotIndex);
}

/**
 * Remove a component slot
 * @param {HTMLElement} button - Button element that triggered the action
 */
function removeComponentSlot(button) {
    // Validate dependencies
    if (typeof shipConfigurations === 'undefined') {
        console.error('Component Management dependencies not found. Make sure app.js is loaded first.');
        return;
    }
    
    const category = button.getAttribute('data-category');
    const componentType = button.getAttribute('data-type');
    const shipId = parseInt(button.getAttribute('data-ship-id'));
    const shipIdentifier = button.getAttribute('data-ship-identifier');
    const configIndex = parseInt(button.getAttribute('data-config-index'));
    const slotIndex = parseInt(button.getAttribute('data-slot-index'));
    
    // Find the parent container and slot
    const container = button.closest('.component-slot-container');
    const slot = button.closest('.component-slot');
    if (!container || !slot) return;
    
    // Remove the slot from the DOM
    container.removeChild(slot);
    
    // Get the active configuration
    const config = shipConfigurations[shipIdentifier][configIndex];
    if (!config || !config.components[category] || !config.components[category][componentType]) return;
    
    // Mark ship as modified
    if (typeof markShipAsModified === 'function') {
        markShipAsModified(shipIdentifier);
    }
    
    // Make sure the component array exists
    if (!Array.isArray(config.components[category][componentType])) {
        config.components[category][componentType] = [config.components[category][componentType]];
    }
    
    // Remove the component from the array
    config.components[category][componentType].splice(slotIndex, 1);
    
    // If there are no more components of this type, set it to an empty array
    if (config.components[category][componentType].length === 0) {
        config.components[category][componentType] = [];
    }
    
    // Update the data-slot-index attributes for all remaining slots
    const remainingSlots = container.querySelectorAll('.component-slot');
    remainingSlots.forEach((slot, index) => {
        slot.setAttribute('data-slot-index', index);
        
        // Update dropdown and remove button indices
        const dropdown = slot.querySelector('.component-dropdown');
        if (dropdown) dropdown.setAttribute('data-slot-index', index);
        
        const removeBtn = slot.querySelector('.remove-component-slot');
        if (removeBtn) removeBtn.setAttribute('data-slot-index', index);
    });
    
    // Update the stats preview
    updateStatsPreview(shipId, configIndex, shipIdentifier);
    
    // Use debounced table update to prevent rapid rebuilds
    if (window.debouncedTableUpdate) {
        window.debouncedTableUpdate({ shipId: shipId, delay: 50 });
    } else if (window.efficientTableUpdate) {
        window.efficientTableUpdate({ shipId: shipId });
    }
    
    // Update the category count display
    if (typeof updateCategoryCount === 'function') {
        updateCategoryCount(category);
    }
    
    // Update the component type count display
    if (typeof updateComponentTypeCount === 'function') {
        updateComponentTypeCount(category, componentType);
    }
}

/**
 * Update a component in the configuration
 * @param {string} category - Component category
 * @param {string} componentType - Component type
 * @param {string} selectedValue - Selected component ID
 * @param {number} shipId - Ship ID
 * @param {string} shipIdentifier - Ship identifier
 * @param {number} configIndex - Configuration index
 * @param {number} slotIndex - Slot index
 */
function updateComponentInConfiguration(category, componentType, selectedValue, shipId, shipIdentifier, configIndex, slotIndex) {
    // Validate dependencies
    if (typeof shipConfigurations === 'undefined') {
        console.error('Component Management dependencies not found. Make sure app.js is loaded first.');
        return;
    }
    
    console.log(`Updating ${category}/${componentType} slot ${slotIndex} to ${selectedValue}`);
    
    // Get the configuration
    const config = shipConfigurations[shipIdentifier][configIndex];
    if (!config) return;
    
    // Mark ship as modified
    if (typeof markShipAsModified === 'function') {
        markShipAsModified(shipIdentifier);
    }
    
    // Make sure the category object exists
    if (!config.components[category]) {
        config.components[category] = {};
    }
    
    // Make sure the component type array exists
    if (!config.components[category][componentType]) {
        config.components[category][componentType] = [];
    } else if (!Array.isArray(config.components[category][componentType])) {
        // Convert single value to array
        config.components[category][componentType] = [config.components[category][componentType]];
    }
    
    // Ensure the array is long enough
    while (config.components[category][componentType].length <= slotIndex) {
        config.components[category][componentType].push('');
    }
    
    // Update the component ID at the specified index
    if (selectedValue === '') {
        // If empty, remove this slot (but keep array structure)
        config.components[category][componentType][slotIndex] = '';
    } else {
        // If it's a numeric ID, convert to a number to maintain consistent ID types
        const idValue = !isNaN(selectedValue) ? parseInt(selectedValue) : selectedValue;
        config.components[category][componentType][slotIndex] = idValue;
    }
    
    console.log(`Updated config:`, config.components[category][componentType]);
    
    // Update the stats preview
    updateStatsPreview(shipId, configIndex, shipIdentifier);
    
    // Use debounced table update to prevent rapid rebuilds
    if (window.debouncedTableUpdate) {
        window.debouncedTableUpdate({ shipId: shipId, delay: 50 });
    } else if (window.efficientTableUpdate) {
        window.efficientTableUpdate({ shipId: shipId });
    }
    
    // Update the category count display
    if (typeof updateCategoryCount === 'function') {
        updateCategoryCount(category);
    }
    
    // Update the component type count display
    if (typeof updateComponentTypeCount === 'function') {
        updateComponentTypeCount(category, componentType);
    }
}

// === MODULE EXPORT ===
// Export functions to global scope for use by app.js
window.ComponentManagement = {
    getCompatibleComponents,
    isComponentMatchingType,
    isComponentCompatibleWithShip,
    getCompatibleClassSizes,
    findComponentById,
    createComponentSlot,
    duplicateComponentSlot,
    duplicateComponentSlotWithValue,
    removeComponentSlot,
    updateComponentInConfiguration,
    cleanupMissingComponents
};

// Also expose individual functions for backward compatibility
window.getCompatibleComponents = getCompatibleComponents;
window.isComponentMatchingType = isComponentMatchingType;
window.isComponentCompatibleWithShip = isComponentCompatibleWithShip;
window.getCompatibleClassSizes = getCompatibleClassSizes;
window.findComponentById = findComponentById;
window.createComponentSlot = createComponentSlot;
window.duplicateComponentSlot = duplicateComponentSlot;
window.duplicateComponentSlotWithValue = duplicateComponentSlotWithValue;
window.removeComponentSlot = removeComponentSlot;
window.updateComponentInConfiguration = updateComponentInConfiguration;
window.cleanupMissingComponents = cleanupMissingComponents;

console.log('Component Management module loaded successfully'); 