// === MODULE: Custom Ship Management ===
// This module handles creating and managing custom ships
//
// Dependencies:
// - Global variables: ships, addedShips, statsFromCsv, customAttributes, customAttributeOrder, componentAttributes, componentsLoaded
// - Functions: getRelevantStats(), changeShipInComparison(), addShipToComparison(), updateComparisonTable(), recalculateComponentValues()

// === MODULE FUNCTIONS ===

// Function to show modal for adding a new custom ship
function showAddCustomShipModal(shipSelectorElement, shipId) {
    console.log("Opening add custom ship modal");
    
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
    modalTitle.textContent = 'Create Custom Ship';
    modalHeader.appendChild(modalTitle);
    
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modalContainer);
        // Reset the ship selector to its previous value
        if (shipSelectorElement) {
            shipSelectorElement.value = '';
        }
    });
    modalHeader.appendChild(closeButton);
    
    // Create ship name input
    const shipNameLabel = document.createElement('label');
    shipNameLabel.textContent = 'Ship Name:';
    shipNameLabel.style.marginTop = '20px';
    
    const shipNameInput = document.createElement('input');
    shipNameInput.type = 'text';
    shipNameInput.className = 'ship-name-input';
    shipNameInput.placeholder = 'Enter ship name';
    
    // Create class/size selector
    const classLabel = document.createElement('label');
    classLabel.textContent = 'Ship Class:';
    classLabel.style.marginTop = '16px';
    
    const classSelect = document.createElement('select');
    classSelect.className = 'ship-class-select';
    
    // Add class options
    const classOptions = [
        { value: 1, text: 'Class 1 (XXS)' },
        { value: 2, text: 'Class 2 (XS)' },
        { value: 3, text: 'Class 3 (Small)' },
        { value: 4, text: 'Class 4 (Medium)' },
        { value: 5, text: 'Class 5 (Large)' },
        { value: 6, text: 'Class 6 (Capital)' },
        { value: 7, text: 'Class 7 (Commander)' },
        { value: 8, text: 'Class 8' },
        { value: 9, text: 'Class 9 (Titan)' }
    ];
    
    classOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        classSelect.appendChild(optionElement);
    });
    
    // Create spec selector
    const specLabel = document.createElement('label');
    specLabel.textContent = 'Ship Spec:';
    specLabel.style.marginTop = '16px';
    
    const specSelect = document.createElement('select');
    specSelect.className = 'ship-spec-select';
    
    // Add spec options
    const uniqueSpecs = getUniqueSpecs();
    uniqueSpecs.forEach(spec => {
        const optionElement = document.createElement('option');
        optionElement.value = spec;
        optionElement.textContent = spec;
        specSelect.appendChild(optionElement);
    });
    
    // Create manufacturer selector
    const manufacturerLabel = document.createElement('label');
    manufacturerLabel.textContent = 'Manufacturer:';
    manufacturerLabel.style.marginTop = '16px';
    
    const manufacturerSelect = document.createElement('select');
    manufacturerSelect.className = 'ship-manufacturer-select';
    
    // Add manufacturer options
    const uniqueManufacturers = getUniqueManufacturers();
    uniqueManufacturers.forEach(manufacturer => {
        const optionElement = document.createElement('option');
        optionElement.value = manufacturer;
        optionElement.textContent = manufacturer;
        // Default to "Custom" if it exists
        if (manufacturer === 'Custom') {
            optionElement.selected = true;
        }
        manufacturerSelect.appendChild(optionElement);
    });
    
    // Create add button
    const addButton = document.createElement('button');
    addButton.className = 'add-button';
    addButton.textContent = 'Create Ship';
    addButton.style.backgroundColor = '#3d8bf8';
    addButton.style.color = 'white';
    addButton.style.fontWeight = 'bold';
    addButton.style.fontSize = '16px';
    addButton.style.marginTop = '24px';
    addButton.addEventListener('click', () => {
        const shipName = shipNameInput.value.trim();
        const shipClass = parseInt(classSelect.value);
        const shipSpec = specSelect.value || 'Custom';
                const manufacturer = manufacturerSelect.value || 'Custom';
        
        if (!shipName) {
            alert('Please enter a ship name.');
            return;
        }
    
        // Check if ship name already exists
        const existingShip = ships.find(ship => 
            ship['Ship Name'].toLowerCase() === shipName.toLowerCase() && 
            ship.Manufacturer.toLowerCase() === manufacturer.toLowerCase()
        );
        
        if (existingShip) {
            alert(`A ship with the name "${shipName}" from "${manufacturer}" already exists.`);
            return;
        }
    
        console.log(`Creating custom ship: ${shipName}, Class: ${shipClass}, Spec: ${shipSpec}, Manufacturer: ${manufacturer}`);
        
        if (createCustomShip(shipName, shipClass, shipSpec, manufacturer, shipSelectorElement, shipId)) {
            document.body.removeChild(modalContainer);
        }
    });
    
    // Add enter key handlers
    shipNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            addButton.click();
        }
    });
    
    // Append elements to modal
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(shipNameLabel);
    modalContent.appendChild(shipNameInput);
    modalContent.appendChild(classLabel);
    modalContent.appendChild(classSelect);
    modalContent.appendChild(specLabel);
    modalContent.appendChild(specSelect);
    modalContent.appendChild(manufacturerLabel);
    modalContent.appendChild(manufacturerSelect);
    modalContent.appendChild(addButton);
    modalContainer.appendChild(modalContent);
    
    // Add modal to body
    document.body.appendChild(modalContainer);
    
    // Focus on the ship name input
    setTimeout(() => shipNameInput.focus(), 100);
}

// Function to create a custom ship
function createCustomShip(shipName, shipClass, shipSpec, manufacturer, shipSelectorElement, shipId) {
    console.log(`Creating custom ship: ${shipName}`);
    
    // Create the custom ship object with default stats
    const customShip = {
        'Ship Name': shipName,
        'Manufacturer': manufacturer,
        'Class': shipClass,
        'Spec': shipSpec
    };
    
    // Add default stats based on existing ships or reasonable defaults
    const statsToAdd = getRelevantStats();
    if (statsToAdd.length === 0) {
        // If no stats exist yet, add some basic default stats
        const defaultStats = [
            'hit_points', 'shield_points', 'cargo_capacity', 'fuel_capacity',
            'subwarp_speed', 'warp_speed', 'max_warp_distance'
        ];
        defaultStats.forEach(stat => {
            customShip[stat] = 0;
        });
        
        // Update the global stats arrays
        statsFromCsv = [...defaultStats];
        customAttributeOrder = [...defaultStats];
    } else {
        // Add all existing stats with default values
        statsToAdd.forEach(stat => {
            if (customAttributes.includes(stat)) {
                // For custom attributes, use 0 as default
                customShip[stat] = 0;
            } else {
                // For CSV stats, try to find a reasonable default based on ship class
                customShip[stat] = getDefaultStatValueForClass(stat, shipClass);
            }
        });
    }
    
    // Add an ID for internal tracking
    customShip.id = ships.length + 1;
    
    // Add to the ships array
    ships.push(customShip);
    console.log(`Added custom ship to ships array. Total ships: ${ships.length}`);
    
    // If this is being added to replace a ship in the comparison, update that ship
    if (shipId && shipSelectorElement) {
        // Find the ship in addedShips and replace it
        const shipIndex = addedShips.findIndex(ship => ship.id === shipId);
        if (shipIndex !== -1) {
            // Update the ship in the comparison
            changeShipInComparison(shipId, customShip);
            
            // Update the selector to show the new ship
            const newShipIndex = ships.length - 1;
            shipSelectorElement.value = newShipIndex;
        }
    } else {
        // If no specific ship ID, just add it to the comparison
        addShipToComparison(customShip);
    }
    
    // Initialize component attributes for new stats if components are loaded
    if (componentsLoaded && Object.keys(componentAttributes).length > 0) {
        Object.keys(componentAttributes).forEach(category => {
            Object.keys(componentAttributes[category]).forEach(groupName => {
                statsToAdd.forEach(statName => {
                    if (!componentAttributes[category][groupName][statName]) {
                        componentAttributes[category][groupName][statName] = {
                            baseValue: 0,
                            values: {}
                        };
                        recalculateComponentValues(category, groupName, statName);
                    }
                });
            });
        });
    }
    
    // Update the comparison table
    updateComparisonTable();
    
    console.log(`Custom ship "${shipName}" created successfully`);
    return true;
}

// Function to get default stat values based on ship class
function getDefaultStatValueForClass(statName, shipClass) {
    // Define some reasonable defaults based on ship class
    const classMultipliers = {
        1: 0.1,   // XXS
        2: 0.25,  // XS  
        3: 0.5,   // Small
        4: 1.0,   // Medium (baseline)
        5: 2.0,   // Large
        6: 4.0,   // Capital
        7: 6.0,   // Commander
        8: 8.0,   // Class 8
        9: 12.0   // Titan
    };
    
    const multiplier = classMultipliers[shipClass] || 1.0;
    
    // Define base values for common stats
    const baseStats = {
        'hit_points': 1000,
        'shield_points': 500,
        'cargo_capacity': 100,
        'fuel_capacity': 1000,
        'subwarp_speed': 100,
        'warp_speed': 1000,
        'max_warp_distance': 10,
        'warp_cool_down': 10,
        'damage': 100,
        'max_ap': 1000,
        'ap_recharge_time': 5
    };
    
    // Get base value or default to 0
    const baseValue = baseStats[statName] || 0;
    
    // Apply class multiplier and round to reasonable number
    return Math.round(baseValue * multiplier);
}

// === HELPER FUNCTIONS FOR SHIP DATA ===

// Get unique specs from all ships
function getUniqueSpecs() {
    if (ships.length === 0) return ['Custom'];
    
    const specs = new Set();
    ships.forEach(ship => {
        if (ship.Spec && ship.Spec.trim() !== '') {
            specs.add(ship.Spec.trim());
        }
    });
    
    const uniqueSpecs = Array.from(specs).sort();
    
    // Always include 'Custom' as an option
    if (!uniqueSpecs.includes('Custom')) {
        uniqueSpecs.push('Custom');
    }
    
    return uniqueSpecs;
}

// Get unique manufacturers from all ships
function getUniqueManufacturers() {
    if (ships.length === 0) return ['Custom'];
    
    const manufacturers = new Set();
    ships.forEach(ship => {
        if (ship.Manufacturer && ship.Manufacturer.trim() !== '') {
            manufacturers.add(ship.Manufacturer.trim());
        }
    });
    
    const uniqueManufacturers = Array.from(manufacturers).sort();
    
    // Always include 'Custom' as an option
    if (!uniqueManufacturers.includes('Custom')) {
        uniqueManufacturers.push('Custom');
    }
    
    return uniqueManufacturers;
}

// Format ship display name as "Manufacturer - Ship Name"
function getShipDisplayName(ship) {
    if (!ship || !ship['Ship Name']) return 'Unknown Ship';
    
    const manufacturer = ship.Manufacturer || 'Unknown';
    const shipName = ship['Ship Name'];
    
    // Don't add manufacturer prefix if it's already part of the ship name or if it's "Custom"
    if (shipName.toLowerCase().includes(manufacturer.toLowerCase()) || manufacturer === 'Custom') {
        return shipName;
    }
    
    return `${manufacturer} ${shipName}`;
}

// === MODULE EXPORT ===
window.CustomShipManagement = {
    showAddCustomShipModal,
    createCustomShip,
    getDefaultStatValueForClass,
    getUniqueSpecs,
    getUniqueManufacturers,
    getShipDisplayName
};

// Also make functions available globally for backward compatibility
window.showAddCustomShipModal = showAddCustomShipModal;
window.createCustomShip = createCustomShip;
window.getDefaultStatValueForClass = getDefaultStatValueForClass;
window.getUniqueSpecs = getUniqueSpecs;
window.getUniqueManufacturers = getUniqueManufacturers;
window.getShipDisplayName = getShipDisplayName;

console.log('Custom Ship Management module loaded successfully'); 