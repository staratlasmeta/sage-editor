// === MODULE: Configuration Upgrade ===
// This module handles upgrading ship configurations to the next tier
//
// Dependencies:
// - Global variables: shipConfigurations, activeConfigIndices, addedShips, componentCategories, components
// - Functions: getShipIdentifier(), findComponentById(), duplicateConfiguration(), updateComparisonTable()

// === MODULE FUNCTIONS ===

// Function to duplicate and upgrade a configuration
function duplicateAndUpgradeConfiguration(shipId, configIndex, shipIdentifier) {
    console.log(`🚀 === DUPLICATE AND UPGRADE STARTED ===`);
    console.log(`🚀 Duplicating and upgrading configuration for ship ${shipId}, config index ${configIndex}, identifier: ${shipIdentifier}`);
    
    // Find the ship
    const ship = addedShips.find(s => s.id === shipId);
    if (!ship) {
        console.error(`Ship with ID ${shipId} not found`);
        return;
    }
    
    // Get the configuration to duplicate
    if (!shipConfigurations[shipIdentifier] || !shipConfigurations[shipIdentifier][configIndex]) {
        console.error(`Configuration not found for ship ${shipIdentifier} at index ${configIndex}`);
        return;
    }
    
    const originalConfig = shipConfigurations[shipIdentifier][configIndex];
    console.log(`Duplicating configuration: ${originalConfig.name}`);
    
    // Create a deep copy of the configuration
    const newConfig = JSON.parse(JSON.stringify(originalConfig));
    
    // Generate new name based on tier upgrade
    const originalName = originalConfig.name;
    let newName = generateUpgradedConfigName(originalName);
    
    // Ensure the name is unique
    let counter = 1;
    const baseName = newName;
    while (shipConfigurations[shipIdentifier].some(config => config.name === newName)) {
        newName = `${baseName} (${counter})`;
        counter++;
    }
    
    newConfig.name = newName;
    
    // Upgrade all components in the configuration
    console.log(`🚀 About to upgrade components in new config: ${newConfig.name}`);
    upgradeConfigurationComponents(newConfig, ship);
    console.log(`🚀 Finished upgrading components`);
    
    // Add the new configuration
    shipConfigurations[shipIdentifier].push(newConfig);
    console.log(`🚀 Added new configuration to ship configurations`);
    
    // Set as active configuration
    const newConfigIndex = shipConfigurations[shipIdentifier].length - 1;
    activeConfigIndices[shipId] = newConfigIndex;
    
    console.log(`Created upgraded configuration: ${newConfig.name} at index ${newConfigIndex}`);
    
    // Update the comparison table
    updateComparisonTable();
    
    // If the components panel is open for this ship, refresh it
    const componentsPanel = document.getElementById('components-panel');
    if (componentsPanel && componentsPanel.classList.contains('open')) {
        const currentShipId = parseInt(document.getElementById('components-container').getAttribute('data-ship-id'));
        if (currentShipId === shipId) {
            if (typeof openComponentsPanel === 'function') {
                openComponentsPanel(shipId, newConfigIndex, shipIdentifier);
            } else {
                console.warn('openComponentsPanel not available yet');
            }
        }
    }
    
    return newConfigIndex;
}

// Helper function to generate upgraded configuration name
function generateUpgradedConfigName(originalName) {
    // Extract tier information and upgrade it
    const tierRegex = /tier\s+(\w+)/i;
    const tierMatch = originalName.match(tierRegex);
    
    if (tierMatch) {
        const currentTier = tierMatch[1].toLowerCase();
        const tierMap = {
            'one': 'Two',
            '1': '2',
            'two': 'Three', 
            '2': '3',
            'three': 'Four',
            '3': '4',
            'four': 'Five',
            '4': '5',
            'five': 'Six',
            '5': '6'
        };
        
        const upgradedTier = tierMap[currentTier];
        if (upgradedTier) {
            return originalName.replace(tierRegex, `Tier ${upgradedTier}`);
        }
    }
    
    // If no tier found, try to detect T1, T2, etc.
    const tRegex = /T(\d+)/i;
    const tMatch = originalName.match(tRegex);
    
    if (tMatch) {
        const currentTierNum = parseInt(tMatch[1]);
        const upgradedTierNum = currentTierNum + 1;
        return originalName.replace(tRegex, `T${upgradedTierNum}`);
    }
    
    // If no tier pattern found, just append "Upgraded"
    return `${originalName} Upgraded`;
}

// Helper function to upgrade all components in a configuration
function upgradeConfigurationComponents(config, ship) {
    console.log('Upgrading components in configuration:', config.name);
    console.log('Configuration before upgrade:', JSON.stringify(config.components, null, 2));
    
    // Process each category
    Object.keys(config.components).forEach(category => {
        const categoryComponents = config.components[category];
        console.log(`Processing category: ${category}`);
        
        // Process each component type in the category
        Object.keys(categoryComponents).forEach(componentType => {
            const componentIds = categoryComponents[componentType];
            console.log(`Processing component type: ${componentType}, current IDs:`, componentIds);
            
            // Handle both array and single component formats
            if (Array.isArray(componentIds)) {
                // Upgrade each component in the array
                for (let i = 0; i < componentIds.length; i++) {
                    if (componentIds[i]) {
                        const originalId = componentIds[i];
                        console.log(`Attempting to upgrade component ${originalId}`);
                        const upgradedId = findUpgradedComponent(originalId, ship);
                        if (upgradedId) {
                            componentIds[i] = upgradedId;
                            console.log(`✅ Upgraded component ${originalId} to ${upgradedId}`);
                        } else {
                            console.log(`❌ No upgrade found for component ${originalId}`);
                        }
                    }
                }
            } else if (componentIds) {
                // Single component - upgrade it
                const originalId = componentIds;
                console.log(`Attempting to upgrade single component ${originalId}`);
                const upgradedId = findUpgradedComponent(originalId, ship);
                if (upgradedId) {
                    config.components[category][componentType] = upgradedId;
                    console.log(`✅ Upgraded single component ${originalId} to ${upgradedId}`);
                } else {
                    console.log(`❌ No upgrade found for single component ${originalId}`);
                }
            }
        });
    });
    
    console.log('Configuration after upgrade:', JSON.stringify(config.components, null, 2));
}

// Helper function to find the upgraded version of a component
function findUpgradedComponent(componentId, ship) {
    console.log(`🔍 Finding upgrade for component ID: ${componentId}`);
    
    // Find the current component
    const currentComponent = window.findComponentById ? 
        window.findComponentById(componentId) : 
        findComponentById(componentId);
    if (!currentComponent || !currentComponent.properties) {
        console.warn(`❌ Component ${componentId} not found or has no properties`);
        return null;
    }
    
    console.log(`📋 Current component:`, currentComponent.name, currentComponent.properties);
    
    const currentTier = currentComponent.properties.Tier;
    const currentClass = currentComponent.properties.Class;
    let category = currentComponent.properties.Category;
    const componentType = getComponentTypeFromComponent(currentComponent);
    
    // If category is undefined, determine it from component properties
    if (!category) {
        if (currentComponent.properties["Ship Component"]) {
            category = "Ship Component";
        } else if (currentComponent.properties["Ship Modules"]) {
            category = "Ship Module";
        } else if (currentComponent.properties["Damage Type"] && !currentComponent.properties["Countermeasure"]) {
            category = "Ship Weapons";
        } else if (currentComponent.properties["Countermeasure"]) {
            category = "Countermeasures";
        } else if (currentComponent.properties["Manufacturer"] && currentComponent.properties["Damage Type"]) {
            // Could be Missiles - need to check context
            category = "Missiles"; // Default assumption
        }
    }
    
    console.log(`📋 Component properties breakdown:`);
    console.log(`  - Tier: ${currentTier}`);
    console.log(`  - Class: ${currentClass}`);
    console.log(`  - Category: ${category} (${currentComponent.properties.Category ? 'from property' : 'determined'})`);
    console.log(`  - Component Type: ${componentType}`);
    
    if (!currentTier) {
        console.warn(`❌ Component ${componentId} has no tier information`);
        return null;
    }
    
    // Calculate the next tier
    const nextTier = getNextTier(currentTier);
    if (!nextTier) {
        console.warn(`❌ Component ${componentId} is already at maximum tier (${currentTier})`);
        return null;
    }
    
    console.log(`🎯 Looking for upgrade: ${currentTier} → ${nextTier}, Class: ${currentClass}, Category: ${category}, Type: ${componentType}`);
    
    // Find a component with the same properties but upgraded tier
    const compatibleComponents = window.getCompatibleComponents ? 
        window.getCompatibleComponents(category, componentType, ship.Class) : 
        getCompatibleComponents(category, componentType, ship.Class);
    console.log(`🔍 Found ${compatibleComponents.length} compatible components for category ${category}, type ${componentType}`);
    
    // Debug: log first few compatible components
    if (compatibleComponents.length > 0) {
        console.log(`🔍 First few compatible components:`);
        compatibleComponents.slice(0, 3).forEach((comp, index) => {
            console.log(`  ${index}: ${comp.name} - Tier: ${comp.properties?.Tier}, Class: ${comp.properties?.Class}`);
        });
    }
    
    // Debug: log all compatible components
    compatibleComponents.forEach((comp, index) => {
        console.log(`  ${index}: ${comp.name} - Tier: ${comp.properties?.Tier}, Class: ${comp.properties?.Class}, Category: ${comp.properties?.Category}`);
    });
    
    // Look for a component with the same class but next tier
    const upgradedComponent = compatibleComponents.find(comp => {
        console.log(`🔍 Checking component: ${comp.name}`);
        console.log(`  - Current: Class=${currentClass}, Tier=${currentTier}, Category=${category}`);
        console.log(`  - Candidate: Class=${comp.properties?.Class}, Tier=${comp.properties?.Tier}, Category=${comp.properties?.Category}`);
        
        const classMatch = comp.properties && comp.properties.Class === currentClass;
        const tierMatch = comp.properties && comp.properties.Tier === nextTier;
        const typeMatch = isSameComponentType(currentComponent, comp);
        
        // For weapons, also check firing cadence specifically
        let firingCadenceMatch = true;
        if (currentComponent.properties && currentComponent.properties["Firing Cadences"] && 
            comp.properties && comp.properties["Firing Cadences"]) {
            firingCadenceMatch = currentComponent.properties["Firing Cadences"] === comp.properties["Firing Cadences"];
            console.log(`  - Firing Cadence match: ${firingCadenceMatch} ("${currentComponent.properties["Firing Cadences"]}" vs "${comp.properties["Firing Cadences"]}")`);
        }
        
        console.log(`  - Class match: ${classMatch}`);
        console.log(`  - Tier match: ${tierMatch}`);
        console.log(`  - Type match: ${typeMatch}`);
        console.log(`  - Firing Cadence match: ${firingCadenceMatch}`);
        
        const matches = classMatch && tierMatch && typeMatch && firingCadenceMatch;
        
        if (matches) {
            console.log(`✅ Match found: ${comp.name} - ${comp.properties.Tier} ${comp.properties.Class}`);
        } else {
            console.log(`❌ No match for ${comp.name}`);
        }
        
        return matches;
    });
    
    if (upgradedComponent) {
        console.log(`✅ Found upgraded component: ${upgradedComponent.id} (${upgradedComponent.name})`);
        return upgradedComponent.id;
    }
    
    console.warn(`❌ No upgraded component found for ${componentId} (${currentTier} → ${nextTier})`);
    console.log(`   Searched for: Tier=${nextTier}, Class=${currentClass}, Category=${category}, Type=${componentType}`);
    return null;
}

// Helper function to get the next tier
function getNextTier(currentTier) {
    const tierMap = {
        'T1': 'T2',
        'T2': 'T3', 
        'T3': 'T4',
        'T4': 'T5',
        'T5': null // T5 is max tier
    };
    
    return tierMap[currentTier] || null;
}

// Helper function to get component type from a component object
function getComponentTypeFromComponent(component) {
    if (!component.properties) return null;
    
    // Check different property names based on category
    if (component.properties["Ship Component"]) {
        return component.properties["Ship Component"];
    }
    if (component.properties["Ship Modules"]) {
        return component.properties["Ship Modules"];
    }
    if (component.properties["Damage Type"]) {
        return component.properties["Damage Type"];
    }
    if (component.properties["Countermeasure"]) {
        return component.properties["Countermeasure"];
    }
    if (component.properties["Manufacturer"]) {
        return component.properties["Manufacturer"];
    }
    
    return null;
}

// Helper function to check if two components are the same type
function isSameComponentType(comp1, comp2) {
    if (!comp1.properties || !comp2.properties) return false;
    
    // Compare relevant type properties
    const typeProperties = ["Ship Component", "Ship Modules", "Damage Type", "Countermeasure", "Manufacturer"];
    
    for (const prop of typeProperties) {
        if (comp1.properties[prop] && comp2.properties[prop]) {
            const matches = comp1.properties[prop] === comp2.properties[prop];
            console.log(`🔍 Comparing ${prop}: "${comp1.properties[prop]}" vs "${comp2.properties[prop]}" = ${matches}`);
            
            if (!matches) {
                return false; // If any type property doesn't match, they're different types
            }
        }
    }
    
    // For weapons, also compare Firing Cadences to ensure we get the same weapon variant
    if (comp1.properties["Firing Cadences"] && comp2.properties["Firing Cadences"]) {
        const firingCadenceMatch = comp1.properties["Firing Cadences"] === comp2.properties["Firing Cadences"];
        console.log(`🔍 Comparing Firing Cadences: "${comp1.properties["Firing Cadences"]}" vs "${comp2.properties["Firing Cadences"]}" = ${firingCadenceMatch}`);
        
        if (!firingCadenceMatch) {
            return false; // Different firing cadences = different weapon variants
        }
    }
    
    // If we found at least one matching type property, they're the same type
    const hasMatchingProperty = typeProperties.some(prop => 
        comp1.properties[prop] && comp2.properties[prop]
    );
    
    console.log(`🔍 Has matching type property: ${hasMatchingProperty}`);
    return hasMatchingProperty;
}

// === MODULE EXPORT ===
window.ConfigUpgrade = {
    duplicateAndUpgradeConfiguration,
    generateUpgradedConfigName,
    upgradeConfigurationComponents,
    findUpgradedComponent,
    getNextTier,
    getComponentTypeFromComponent,
    isSameComponentType
};

// Also make functions available globally for backward compatibility
window.duplicateAndUpgradeConfiguration = duplicateAndUpgradeConfiguration;
window.generateUpgradedConfigName = generateUpgradedConfigName;
window.upgradeConfigurationComponents = upgradeConfigurationComponents;
window.findUpgradedComponent = findUpgradedComponent;
window.getNextTier = getNextTier;
window.getComponentTypeFromComponent = getComponentTypeFromComponent;
window.isSameComponentType = isSameComponentType;

console.log('Configuration Upgrade module loaded successfully'); 