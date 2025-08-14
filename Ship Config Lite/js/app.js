// Global variables to store ships and components data
let ships = [];
let components = null;
let shipConfigurations = {}; // Will now be keyed by a ship identifier (Ship Name + Manufacturer) instead of shipId
let addedShips = []; // Array of ships added to the comparison table
let nextShipId = 1; // Counter for generating unique ship IDs
let componentsLoaded = false;
let activeConfigIndices = {}; // Will now be keyed by the specific shipId to allow multiple instances of the same ship with different configs
let copiedConfiguration = null; // Store a copied configuration for pasting
let componentCategories = {
    "Ship Component": [],
    "Ship Module": [],
    "Ship Weapons": [],
    "Countermeasures": [],
    "Missiles": [],
    "Drones": []
};
// Track the currently selected configuration index for each ship
let selectedConfigs = {}; // Will now be keyed by a ship identifier (Ship Name + Manufacturer) instead of shipId

// New global variables for component attributes
let componentAttributes = {};
let statsFromCsv = []; // Store ship stats from the CSV
let currentCategory = null; // Currently selected component category
let currentComponentGroup = null; // Currently selected component group
let classScalingFormulas = {}; // Formulas for class scaling
let tierScalingFormulas = {}; // Formulas for tier scaling

// New global variables for custom attributes
let customAttributes = []; // Store custom attribute names
let customAttributeOrder = []; // Store the order of all attributes (both original and custom)
let isDraggingRow = false; // Flag to track if a row is being dragged
let rowDragData = null; // Data about the currently dragged row
let attributesPanelLocked = false; // Track locked state of attributes panel

// Global variable for stat descriptions
let statDescriptions = {}; // Store descriptions for each stat
window.statDescriptions = statDescriptions; // Make it available globally

// === THEME TOGGLE FUNCTIONALITY ===
// Apply the current theme
function applyTheme() {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('shipConfigTheme');
    let currentTheme = 'light'; // Default to light theme
    
    if (savedTheme) {
        currentTheme = savedTheme;
    } else {
        // Default to dark theme if no preference is saved
        currentTheme = 'dark';
    }
    
    // Apply the theme
    document.body.classList.toggle('dark-theme', currentTheme === 'dark');
    
    // Update the theme toggle
    const themeSwitch = document.getElementById('themeSwitch');
    if (themeSwitch) {
        themeSwitch.checked = currentTheme === 'dark';
    }
}

// Toggle between light and dark theme
function toggleTheme() {
    const isDarkTheme = document.body.classList.contains('dark-theme');
    const newTheme = isDarkTheme ? 'light' : 'dark';
    
    document.body.classList.toggle('dark-theme', newTheme === 'dark');
    
    // Save the theme preference
    localStorage.setItem('shipConfigTheme', newTheme);
}

// Initialize theme toggle
function initThemeToggle() {
    const themeSwitch = document.getElementById('themeSwitch');
    if (themeSwitch) {
        themeSwitch.addEventListener('change', toggleTheme);
    }
    
    // Apply saved theme on page load
    applyTheme();
}
// === END THEME TOGGLE FUNCTIONALITY ===

// Helper function to get a unique identifier for a ship based on its name and manufacturer
function getShipIdentifier(ship) {
    if (!ship || !ship['Ship Name'] || !ship.Manufacturer) {
        console.error("Invalid ship object for identifier:", ship);
        return "unknown-ship";
    }
    return `${ship['Ship Name']}-${ship.Manufacturer}`.replace(/\s+/g, '-').toLowerCase();
}

// Initialize resize handle functionality
function initResizeHandle() {
    const resizeHandle = document.getElementById('resizeHandle');
    if (!resizeHandle) return;
    
    let isResizing = false;
    let lastX = 0;

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        lastX = e.clientX;
        resizeHandle.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const deltaX = e.clientX - lastX;
        lastX = e.clientX;
        
        const shipDisplays = document.querySelectorAll('.ship-display');
        if (shipDisplays.length !== 2) return;
        
        const leftDisplay = shipDisplays[0];
        const rightDisplay = shipDisplays[1];
        
        const currentLeftWidth = parseInt(getComputedStyle(leftDisplay).flexBasis) || leftDisplay.offsetWidth;
        const currentRightWidth = parseInt(getComputedStyle(rightDisplay).flexBasis) || rightDisplay.offsetWidth;
        
        const totalWidth = currentLeftWidth + currentRightWidth;
        const newLeftWidth = currentLeftWidth + deltaX;
        const newRightWidth = currentRightWidth - deltaX;
        
        // Ensure minimum width of 200px for each panel
        if (newLeftWidth >= 200 && newRightWidth >= 200) {
            leftDisplay.style.flexBasis = `${newLeftWidth}px`;
            rightDisplay.style.flexBasis = `${newRightWidth}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizeHandle.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

// Handle components JSON file upload
// MOVED TO: file-io.js module
// function handleComponentsUpload(event) - now in FileIO module

// Extract component categories and types from the loaded JSON data
function extractComponentCategories() {
    if (!components || !components.rewardTree) return;
    
    // Reset component categories
    componentCategories = {
        "Ship Component": [],
        "Ship Module": [],
        "Ship Weapons": [],
        "Countermeasures": [],
        "Missiles": [],
        "Drones": []
    };
    
    // Process the rewardTree to extract categories and their component types
    components.rewardTree.forEach(category => {
        if (category.properties && category.properties.Category) {
            const categoryName = category.properties.Category;
            
            // Skip if the category is not one of our tracked categories
            if (!componentCategories.hasOwnProperty(categoryName)) return;
            
            console.log(`Processing category: ${categoryName}`);
            
            // Handle each category based on its structure
            switch(categoryName) {
                case "Ship Component":
                    // Ship Component: Category > Component Type > Class > Tier
                    if (category.children) {
                category.children.forEach(componentType => {
                            if (componentType.properties && componentType.properties["Ship Component"]) {
                                const typeName = componentType.properties["Ship Component"];
                                if (!componentCategories[categoryName].includes(typeName)) {
                                    componentCategories[categoryName].push(typeName);
                                            }
                                        }
                                    });
                    }
                    break;
                    
                case "Ship Module":
                    // Ship Module: Category > Module Type > Class > Tier
                    if (category.children) {
                        category.children.forEach(moduleType => {
                            if (moduleType.properties && moduleType.properties["Ship Modules"]) {
                                const typeName = moduleType.properties["Ship Modules"];
                                if (!componentCategories[categoryName].includes(typeName)) {
                                    componentCategories[categoryName].push(typeName);
                                }
                                }
                            });
                        }
                    break;
                    
                case "Ship Weapons":
                    // Ship Weapons: Category > Damage Type > Tier > Class > Firing Cadences
                    if (category.children) {
                        category.children.forEach(damageType => {
                            if (damageType.properties && damageType.properties["Damage Type"]) {
                                const typeName = damageType.properties["Damage Type"];
                                if (!componentCategories[categoryName].includes(typeName)) {
                                    componentCategories[categoryName].push(typeName);
                                            }
                                        }
                                    });
                    }
                    break;
                    
                case "Countermeasures":
                    // Countermeasures: Category > Tier > Class > Countermeasure Type
                    if (category.children) {
                        // Countermeasures are organized by Tier first
                        category.children.forEach(tier => {
                            if (tier.children) {
                                // Then by Class
                                tier.children.forEach(classNode => {
                                    if (classNode.children) {
                                        // Then we have the actual countermeasures
                                        classNode.children.forEach(countermeasure => {
                                            if (countermeasure.properties && countermeasure.properties.Countermeasure) {
                                                const typeName = countermeasure.properties.Countermeasure;
                                                if (!componentCategories[categoryName].includes(typeName)) {
                                                    componentCategories[categoryName].push(typeName);
                                                }
                    }
                });
            }
                                });
                            }
                        });
                    }
                    break;
                    
                case "Missiles":
                    // Missiles: Category > Tier > Class > Damage Type
                    if (category.children) {
                        // Missiles are organized by Tier first
                        category.children.forEach(tier => {
                            if (tier.children) {
                                // Then by Class
                                tier.children.forEach(classNode => {
                                    if (classNode.children) {
                                        // Then we have the missile damage types
                                        classNode.children.forEach(missile => {
                                            if (missile.properties && missile.properties["Damage Type"]) {
                                                const typeName = missile.properties["Damage Type"];
                                                if (!componentCategories[categoryName].includes(typeName)) {
                        componentCategories[categoryName].push(typeName);
                                                }
                    }
                });
            }
                                });
                            }
                        });
                    }
                    break;
                    
                case "Drones":
                    // Drones: Category > Drone Type > Individual Drones (similar to Ship Weapons structure)
                    if (category.children) {
                        category.children.forEach(droneTypeNode => {
                            // The drone type should be in the node name or properties
                            let typeName = null;
                            
                            // Try to get the drone type name
                            if (droneTypeNode.name) {
                                typeName = droneTypeNode.name;
                            } else if (droneTypeNode.properties) {
                                // Check various property names
                                typeName = droneTypeNode.properties["Drone Type"] || 
                                         droneTypeNode.properties["Type"] || 
                                         droneTypeNode.properties["Drones"] ||
                                         droneTypeNode.properties["Category"];
                            }
                            
                            // Also check if there's only one property key that might be the type
                            if (!typeName && droneTypeNode.properties) {
                                const propKeys = Object.keys(droneTypeNode.properties);
                                if (propKeys.length === 1 && propKeys[0] !== "Category") {
                                    typeName = droneTypeNode.properties[propKeys[0]];
                                }
                            }
                            
                            // If we found a type name, add it
                            if (typeName && !componentCategories[categoryName].includes(typeName)) {
                                componentCategories[categoryName].push(typeName);
                            }
                        });
                    }
                    break;
            }
        }
    });
    
    console.log("Extracted component categories:", componentCategories);
    componentsLoaded = true;
}

// Process components after loading to ensure they have effects data
function processComponentsAfterLoading() {
    if (!components || !components.rewardTree) return;
    
    console.log("Processing components after loading...");
    
    // Create a map for quick component lookup by ID
    components.componentsById = {};
    
    // Helper function to recursively process component nodes
    function processNode(node) {
        // Make sure all nodes have an effects object
        if (!node.effects) {
            node.effects = {};
        }
        
        // Store in lookup map
        if (node.id) {
            components.componentsById[node.id] = node;
        }
        
        // Process children recursively
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => processNode(child));
        }
    }
    
    // Process all top-level category nodes
    components.rewardTree.forEach(category => processNode(category));
    
    console.log(`Processed components. Created lookup table with ${Object.keys(components.componentsById).length} components.`);
}

// Extract stat names from the CSV headers
function extractStatsFromCsv(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    
    // Filter out non-stat columns like Ship Name, Manufacturer, etc.
    statsFromCsv = headers.filter(header => 
        !['Ship Name', 'Manufacturer', 'Spec', 'Class'].includes(header));
    
    console.log("Extracted stats from CSV:", statsFromCsv);
}

// Initialize component attributes storage based on loaded components
function initComponentAttributes() {
    if (!components || !components.rewardTree) return;
    
    // Instead of resetting, merge new categories/groups/stats into existing componentAttributes
    if (typeof componentAttributes !== 'object' || componentAttributes === null) {
        componentAttributes = {};
    }

    // Helper function to collect all special properties from components in a category
    function collectSpecialProperties(category, groupName) {
        const specialProperties = new Set();
        
        // Find the category node in the JSON tree
        const categoryNode = components.rewardTree.find(node => 
            node.properties && node.properties.Category === category
        );
        
        if (!categoryNode || !categoryNode.children) {
            return Array.from(specialProperties);
        }
        
        // For Ship Weapons, we need to find the specific damage type node
        if (category === 'Ship Weapons') {
            // Find the damage type node that matches groupName
            const damageTypeNode = categoryNode.children.find(node =>
                node.properties && node.properties['Damage Type'] === groupName
            );
            
            if (damageTypeNode) {
                // Collect special properties from this damage type's subtree
                function collectFromSubtree(node) {
                    if (node.properties) {
                        // Collect Firing Cadences
                        if (node.properties['Firing Cadences']) {
                            specialProperties.add(node.properties['Firing Cadences']);
                        }
                    }
                    
                    // Recursively search children
                    if (node.children && Array.isArray(node.children)) {
                        node.children.forEach(child => {
                            collectFromSubtree(child);
                        });
                    }
                }
                
                // Start collecting from the damage type node
                collectFromSubtree(damageTypeNode);
            }
        }
        // For Drones, collect individual drone names
        else if (category === 'Drones') {
            // Find the drone type node that matches groupName
            const droneTypeNode = categoryNode.children.find(node =>
                node.name === groupName || 
                (node.properties && (node.properties['Drone Type'] === groupName || 
                                   node.properties['Type'] === groupName))
            );
            
            if (droneTypeNode && droneTypeNode.children) {
                // Collect individual drone names from the "Drones" property
                droneTypeNode.children.forEach(droneNode => {
                    if (droneNode.properties && droneNode.properties['Drones']) {
                        specialProperties.add(droneNode.properties['Drones']);
                    } else if (droneNode.name) {
                        specialProperties.add(droneNode.name);
                    }
                });
            }
        }
        // Add similar logic for other categories as needed
        
        return Array.from(specialProperties);
    }

    // Helper function to recursively build attributes for a node and its sub-groups
    function buildNodeAttributes(node, attributeNode, category, groupName) {
        // Initialize stats at this node level if not present
        statsFromCsv.forEach(statName => {
            if (!attributeNode[statName]) {
                attributeNode[statName] = { baseValue: undefined, values: {} };
            }
        });
        
        // For Ship Weapons and Drones, create sub-groups based on special properties instead of tree structure
        if (category === 'Ship Weapons' || category === 'Drones') {
            const specialProperties = collectSpecialProperties(category, groupName);
            
            if (specialProperties.length > 0) {
                if (!attributeNode.subGroups) {
                    attributeNode.subGroups = {};
                }
                
                // Create sub-groups for each special property value
                specialProperties.forEach(propValue => {
                    if (!attributeNode.subGroups[propValue]) {
                        attributeNode.subGroups[propValue] = {};
                        // Initialize stats for this sub-group
                        statsFromCsv.forEach(statName => {
                            attributeNode.subGroups[propValue][statName] = { baseValue: undefined, values: {} };
                        });
                    }
                });
            }
    } else {
            // For other categories, use the existing tree-based sub-group logic
            if (node.children) {
                if (!attributeNode.subGroups) {
                    attributeNode.subGroups = {};
                }
                
                Object.keys(node.children).forEach(childKey => {
                    if (!attributeNode.subGroups[childKey]) {
                        attributeNode.subGroups[childKey] = {};
                    }
                    buildNodeAttributes(node.children[childKey], attributeNode.subGroups[childKey], category, groupName);
                });
            }
        }
    }

    Object.keys(componentCategories).forEach(category => {
        // Only set default scaling formulas if not already set
        if (!classScalingFormulas[category]) {
            classScalingFormulas[category] = "base * pow( pow(1.61803398875 , classIndex+1) / 2.2360679775 , 2 )";
        }
        if (!tierScalingFormulas[category]) {
            tierScalingFormulas[category] = "base * ( pow(1.61803398875 , tierIndex) / 2.2360679775 )";
        }

        // Initialize this category if it doesn't exist
        if (!componentAttributes[category]) {
            componentAttributes[category] = {};
        }

        componentCategories[category].forEach(groupName => {
            // Initialize if the group doesn't exist
            if (!componentAttributes[category][groupName]) {
                componentAttributes[category][groupName] = {};
            }
            
            // Find the corresponding node in the component tree for tree-based categories
            let foundNode = null;
            if (category !== 'Ship Weapons') {
                function findGroupNode(node) {
                    if (node.components) {
                        for (const component of node.components) {
                            if (component.name && component.name.includes(groupName)) {
                                return node;
                            }
                        }
                    }
                    
                    if (node.children) {
                        for (const childNode of Object.values(node.children)) {
                            const result = findGroupNode(childNode);
                            if (result) return result;
                        }
                    }
                    
                    return null;
                }
                
                foundNode = findGroupNode(components.rewardTree);
            }
            
            // Always build/update the attributes structure to ensure sub-groups are created
            buildNodeAttributes(foundNode || {}, componentAttributes[category][groupName], category, groupName);
        });
    });

    }

// Create category buttons in the header
function createCategoryButtons() {
    const container = document.getElementById('category-buttons');
    if (!container) return;
    
    // Clear existing buttons
    container.innerHTML = '';
    
    // Create a button for each category
    Object.keys(componentCategories).forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-button';
        button.textContent = category;
        button.addEventListener('click', () => {
            // Check if attributes panel is already open
            const panel = document.getElementById('attributes-panel');
            if (panel && panel.classList.contains('open')) {
                // Panel is open, just switch to the category
                currentCategory = category;
                currentComponentGroup = null;
                
                // Update active tab
                document.querySelectorAll('.attributes-tab').forEach(tab => {
                    if (tab.textContent === category) {
                        tab.classList.add('active');
                    } else {
                        tab.classList.remove('active');
                    }
                });
                
                // Update active category button
                document.querySelectorAll('.category-button').forEach(btn => {
                    if (btn.textContent === category) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
                
                // Update panel title
                const panelTitle = document.querySelector('.attributes-panel-header .category-name');
                if (panelTitle) {
                    panelTitle.textContent = category;
                }
                
                // Update the groups list
                updateComponentGroupsList(category);
            } else {
                // Panel is not open, open it normally
                openAttributesPanel(category);
            }
        });
        container.appendChild(button);
    });
}

// Open the attributes panel for a specific category
// MOVED TO: attributes-panel.js module
// function openAttributesPanel(category) - now in AttributesPanel module

// Helper function to update component groups list
// MOVED TO: attributes-panel.js module
// function updateComponentGroupsList(category) - now in AttributesPanel module

// Select a component group to edit
// MOVED TO: attributes-panel.js module
// function selectComponentGroup(category, groupName) - now in AttributesPanel module

// Populate the attributes editor with the selected group's stats
// MOVED TO: attributes-panel.js module
// function populateAttributesEditor(category, groupName) - now in AttributesPanel module

// Update a stat value for a component group
// MOVED TO: attributes-panel.js module
// function updateStatValue(category, groupName, statName, value) - now in AttributesPanel module

// Update the class scaling formula
// MOVED TO: attributes-panel.js module
// function updateClassScalingFormula(category, formula) - now in AttributesPanel module

// Update the tier scaling formula
// MOVED TO: attributes-panel.js module
// function updateTierScalingFormula(category, formula) - now in AttributesPanel module

// Recalculate component values based on formulas
// MOVED TO: attributes-panel.js module
// function recalculateComponentValues(category, groupName, statName) - now in AttributesPanel module

// Evaluate a formula with given variables
// MOVED TO: attributes-panel.js module
// function evaluateFormula(formula, variables) - now in AttributesPanel module

// Close the attributes panel
// MOVED TO: attributes-panel.js module
// function closeAttributesPanel() - now in AttributesPanel module

// Handle CSV file upload - now merges with existing data instead of overwriting
// MOVED TO: file-io.js module
// function handleCsvUpload(event) - now in FileIO module

// Extract stats from new CSV without overwriting existing statsFromCsv
// MOVED TO: file-io.js module  
// function extractStatsFromNewCsv(csvText) - now in FileIO module

// Add an empty ship column
function addEmptyShipColumn() {
    // Create a unique ID for the empty ship
    const shipId = nextShipId++;
    
    console.log(`Adding empty ship column with ID ${shipId}`);
    
    // Create an empty ship object with the ID
    const emptyShip = {
        id: shipId,
        'Ship Name': 'Select Ship to Configure',
        Manufacturer: 'No ship selected',
        Class: '',
        Spec: ''
    };
    
    // Get the ship identifier
    const shipIdentifier = getShipIdentifier(emptyShip);
    console.log(`Empty ship identifier: ${shipIdentifier}`);
    
    // Add the relevant stats with default values
    const statsToShow = getRelevantStats();
    statsToShow.forEach(stat => {
        // For custom attributes, use their default value from any existing ship
        if (customAttributes.includes(stat) && ships.length > 0) {
            // Try to get the default value from the first ship
            emptyShip[stat] = ships[0][stat] || 0;
        } else {
        emptyShip[stat] = 0;
        }
    });
    
    // Add to the addedShips array
    addedShips.push(emptyShip);
    
    // Check if configurations already exist for this ship
    if (!shipConfigurations[shipIdentifier] || !Array.isArray(shipConfigurations[shipIdentifier]) || 
        shipConfigurations[shipIdentifier].length === 0) {
        // Initialize configuration for this ship
        shipConfigurations[shipIdentifier] = [{
            name: 'Default',
            components: {
                "Ship Component": {},
                "Ship Module": {},
                "Ship Weapons": {},
                "Countermeasures": {},
                "Missiles": {},
                "Drones": {}
            }
        }];
        
        console.log(`Created default configuration for ship ${shipIdentifier}`);
    } else {
        console.log(`Using ${shipConfigurations[shipIdentifier].length} existing configurations for ship ${shipIdentifier}`);
    }
    
    // Initialize the active config index for this ship using the shipId
    activeConfigIndices[shipId] = 0;
    
    // Update the comparison table
    updateComparisonTable();
}

// Clear all ship displays
function clearAllShipDisplays() {
    // Legacy function simplified - just clear the data
    // The old function tried to access UI elements that no longer exist
    shipConfigurations = {};
    addedShips = [];
}

// Parse CSV data
// MOVED TO: file-io.js module
// function parseCSV(csvText) - now in FileIO module

// Function to convert numeric class to name
function getClassNameFromNumber(classNumber) {
    const classNames = ["", "XXS", "XS", "Small", "Medium", "Large", "Capital", "Commander", "Class 8", "Titan"];
    return classNames[classNumber] || classNumber.toString();
}


// Calculate modified stats based on installed components
function calculateModifiedStats(ship, installedComponents) {
    // Start with a copy of the base ship stats
    const modifiedStats = { ...ship };
    
    // Track component effects for each stat - store as arrays to handle multiple instances
    const statEffects = {};
    
    // Initialize effects arrays for all stats
    Object.keys(modifiedStats).forEach(statName => {
        if (typeof modifiedStats[statName] === 'number') {
            statEffects[statName] = [];
        }
    });
    
    // If no components installed, return base stats
    if (!installedComponents) {
        return modifiedStats;
    }
    
    // Calculate drone scaling information
    const droneScalingInfo = window.DroneScaling ? 
        window.DroneScaling.calculateDroneScaling({ components: installedComponents }) : 
        null;
    
    // Helper function to find the stat value in the sub-group tree with inheritance
    function findStatValueInTree(attributes, component, statName, className, tierName, category) {
        // Build path based on component properties
        const properties = component.properties || {};
        const path = [];
        
        // For drones, we need to add the individual drone name to the path
        if (category === "Drones") {
            // The drone name is stored in the "Drones" property
            const droneName = properties["Drones"] || component.name;
            if (droneName) {
                path.push(droneName);
            }
        }
        
        // Add path segments based on available properties in priority order
        const propertyPriority = ['Tier', 'Class', 'Firing Cadences', 'Damage Type', 'Manufacturer', 'Ship Component', 'Ship Modules', 'Countermeasure'];
        
        for (const prop of propertyPriority) {
            if (properties[prop]) {
                path.push(properties[prop]);
            }
        }
        
        // Try to find value at deepest matching path level, then walk up for inheritance
        let currentNode = attributes;
        let currentPath = [];
        
        // Navigate as deep as possible in the tree
        for (const pathSegment of path) {
            if (currentNode.subGroups && currentNode.subGroups[pathSegment]) {
                currentNode = currentNode.subGroups[pathSegment];
                currentPath.push(pathSegment);
            } else {
                break; // Can't go deeper
            }
        }
        
        // Now walk back up the tree to find the first defined value (inheritance)
        while (true) {
            // For drones, check at the parent level (not in subGroups)
            if (category === "Drones" && currentPath.length === 0) {
                // We're at the root level for drones
                if (attributes[statName] && attributes[statName].values && 
                    attributes[statName].values["base"] !== undefined) {
                    let value = attributes[statName].values["base"];
                    // Apply scaling if we have class/tier from drone port
                    if (className && tierName) {
                        value = calculateDroneScaledValue(value, className, tierName, category);
                    }
                    return value;
                }
            } else if (currentNode[statName] && currentNode[statName].values) {
                let key;
                let value;
                
                if (category === "Drones") {
                    // Drones use a simple "base" key
                    key = "base";
                    if (currentNode[statName].values[key] !== undefined) {
                        value = currentNode[statName].values[key];
                        // Apply scaling if we have class/tier from drone port
                        if (className && tierName) {
                            value = calculateDroneScaledValue(value, className, tierName, category);
                        }
                        return value;
                    }
                } else {
                    // Other categories use class-tier combination
                    key = `${className}-${tierName}`;
                    if (currentNode[statName].values[key] !== undefined) {
                        // Return the full stat object with type information and the scaled value
                        const statObj = currentNode[statName];
                        return {
                            ...statObj,
                            scaledValue: statObj.values[key] // Include the class/tier scaled value
                        };
                    }
                }
            }
            
            // Move up one level
            if (currentPath.length === 0) break;
            currentPath.pop();
            
            // Rebuild current node from root
            currentNode = attributes;
            for (const pathSegment of currentPath) {
                if (currentNode.subGroups && currentNode.subGroups[pathSegment]) {
                    currentNode = currentNode.subGroups[pathSegment];
                }
            }
        }
        
        return 0; // No value found
    }
    
    // Process each component category
    Object.keys(installedComponents).forEach(category => {
        const components = installedComponents[category];
        
        // Process each component in this category
        Object.keys(components).forEach(componentType => {
            // Handle both array and single component ID formats
            const componentIds = Array.isArray(components[componentType]) 
                ? components[componentType] 
                : [components[componentType]];
            
            // Process each component ID in the array (multiple instances)
            componentIds.forEach(componentId => {
                if (!componentId) return; // Skip if no component installed
                
                // Find the component
                const component = findComponentById(componentId);
                if (!component) return; // Skip if component not found
                
                // Get component properties
                const properties = component.properties || {};
                let className = properties.Class || '';
                let tierName = properties.Tier || '';
                
                // Special handling for drones - they don't have class/tier but should inherit from drone port
                if (category === "Drones" && (!className || !tierName)) {
                    // Find drone port in ship components to get its class/tier
                    const dronePort = findDronePortForShip({ components: installedComponents });
                    if (dronePort) {
                        className = dronePort.className;
                        tierName = dronePort.tierName;
                        console.log(`Drone ${component.name} inheriting class ${className} and tier ${tierName} from drone port`);
                    } else {
                        console.log(`No drone port found for drone ${component.name}`);
                    }
                }
                
                // Skip if no class or tier (except for Drones which are handled above)
                if (!className || !tierName) {
                    // For drones without a drone port, still process them but without scaling
                    if (category !== "Drones") return;
                }
                
                // Look up the component group name based on category
                let groupName = '';
                switch (category) {
                    case "Ship Component":
                        groupName = properties["Ship Component"] || '';
                        break;
                    case "Ship Module":
                        groupName = properties["Ship Modules"] || '';
                        break;
                    case "Ship Weapons":
                        groupName = properties["Damage Type"] || '';
                        break;
                    case "Countermeasures":
                        groupName = properties["Countermeasure"] || '';
                        break;
                    case "Missiles":
                        groupName = properties["Damage Type"] || '';
                        break;
                    case "Drones":
                        // For drones, we need the drone type from the component properties
                        groupName = properties["Drone Type"] || '';
                        break;
                }
                
                // Skip if group name not found
                if (!groupName) return;
                
                // Look up the component attributes
                if (componentAttributes[category] && 
                    componentAttributes[category][groupName]) {
                    const attributes = componentAttributes[category][groupName];
                    
                    // Debug logging for drones
                    if (category === "Drones") {
                        console.log(`Looking up drone attributes for ${groupName}:`, attributes);
                        console.log(`Component name: ${component.name}, properties:`, properties);
                    }
                    
                    // For drones, we need to find stats in the subGroups structure
                    if (category === "Drones") {
                        // Get the specific drone name
                        const droneName = properties["Drones"] || component.name;
                        
                        if (attributes.subGroups && attributes.subGroups[droneName]) {
                            const droneAttributes = attributes.subGroups[droneName];
                            console.log(`Found drone attributes for ${droneName}:`, droneAttributes);
                            
                            // Now iterate through the stats for this specific drone
                            Object.keys(droneAttributes).forEach(statName => {
                                if (statEffects.hasOwnProperty(statName)) {
                                    let multiplierValue = findStatValueInTree(attributes, component, statName, className, tierName, category);
                                    if (multiplierValue !== 0) {
                                        // Apply drone port scaling if available
                                        if (droneScalingInfo && window.DroneScaling) {
                                            multiplierValue = window.DroneScaling.applyDroneScaling(multiplierValue, componentId, droneScalingInfo);
                                            console.log(`Collecting multiplier ${multiplierValue} for ${statName} from drone ${droneName} (${category}, ${groupName}) - scaled by drone port`);
                                        } else {
                                            console.log(`Collecting multiplier ${multiplierValue} for ${statName} from drone ${droneName} (${category}, ${groupName})`);
                                        }
                                        // Store the effect with component info for consolidation
                                        statEffects[statName].push({
                                            multiplier: multiplierValue,
                                            componentId: componentId,
                                            componentName: droneName || component.name,
                                            category: category,
                                            groupName: groupName
                                        });
                                    }
                                }
                            });
                        } else {
                            console.log(`No subGroups found for drone ${droneName} in attributes`);
                        }
                    } else {
                        // Apply all stat modifications using the new tree search
                        Object.keys(attributes).forEach(statName => {
                            if (statEffects.hasOwnProperty(statName)) {
                                const statValue = findStatValueInTree(attributes, component, statName, className, tierName, category);
                                
                                // Handle new stat object format
                                if (typeof statValue === 'object' && statValue !== null) {
                                    // New format with type information
                                    const stat = window.StatTypeSystem ? 
                                        window.StatTypeSystem.initializeStatWithType(statValue) : 
                                        statValue;
                                    
                                    console.log(`Collecting stat ${statName} from ${component.name} (${category}, ${groupName}) - Type: ${stat.type}, baseAdditive: ${stat.additiveValue}, baseMultiplicative: ${stat.multiplicativeValue}, scaledValue: ${stat.scaledValue}`);
                                    
                                    // Calculate the actual values based on stat type and scaling
                                    let additiveValue = 0;
                                    let multiplicativeValue = 1.0;
                                    
                                    if (stat.type === window.STAT_TYPES.ADDITIVE) {
                                        // For additive, use the scaled value directly
                                        additiveValue = stat.scaledValue || 0;
                                        multiplicativeValue = 1.0;
                                    } else if (stat.type === window.STAT_TYPES.MULTIPLICATIVE) {
                                        // For pure multiplicative, use the scaled value as the multiplier
                                        additiveValue = 0;
                                        multiplicativeValue = stat.scaledValue || 1.0;
                                    } else if (stat.type === window.STAT_TYPES.BOTH) {
                                        // For 'both' type: we need to properly calculate the scaled values
                                        // The scaledValue from findStatValueInTree might be wrong for "both" types
                                        const baseAdditiveValue = stat.additiveValue || 0;
                                        
                                        // Calculate the scaled additive value properly
                                        if (baseAdditiveValue !== 0) {
                                            const classFormula = classScalingFormulas[category] || "base * pow( pow(1.61803398875 , classIndex+1) / 2.2360679775 , 2 )";
                                            const tierFormula = tierScalingFormulas[category] || "base * ( pow(1.61803398875 , tierIndex) / 2.2360679775 )";
                                            
                                            const classMap = {"XXS": 1, "XS": 2, "S": 3, "M": 4, "L": 5, "CAP": 6, "CMD": 7, "Class 8": 8, "TTN": 9};
                                            const classIndex = classMap[className] || 1;
                                            const tierIndex = parseInt(tierName.replace('T', '')) || 1;
                                            
                                            // Apply scaling to the additive base value
                                            additiveValue = window.evaluateFormula ? 
                                                window.evaluateFormula(classFormula, { base: baseAdditiveValue, classIndex: classIndex }) : 
                                                baseAdditiveValue;
                                            additiveValue = window.evaluateFormula ? 
                                                window.evaluateFormula(tierFormula, { base: additiveValue, tierIndex: tierIndex }) : 
                                                additiveValue;
                                        } else {
                                            additiveValue = 0;
                                        }
                                        
                                        // For multiplicative part, we need to calculate the scaled value
                                        // This should match what we do in calculateStatModificationDetails
                                        const baseMultiplicativeValue = stat.multiplicativeValue !== undefined ? stat.multiplicativeValue : 1.0;
                                        if (baseMultiplicativeValue !== 1.0) {
                                            // We need the scaling formulas
                                            const classFormula = classScalingFormulas[category] || "base * pow( pow(1.61803398875 , classIndex+1) / 2.2360679775 , 2 )";
                                            const tierFormula = tierScalingFormulas[category] || "base * ( pow(1.61803398875 , tierIndex) / 2.2360679775 )";
                                            
                                            // Get class and tier indices
                                            const classMap = {"XXS": 1, "XS": 2, "S": 3, "M": 4, "L": 5, "CAP": 6, "CMD": 7, "Class 8": 8, "TTN": 9};
                                            const classIndex = classMap[className] || 1;
                                            const tierIndex = parseInt(tierName.replace('T', '')) || 1;
                                            
                                            // Extract the bonus portion (multiplier - 1)
                                            const baseBonus = baseMultiplicativeValue - 1.0;
                                            
                                            // Apply scaling formulas to the BONUS, not the full multiplier
                                            let scaledBonus = window.evaluateFormula ? 
                                                window.evaluateFormula(classFormula, { base: baseBonus, classIndex: classIndex }) : 
                                                baseBonus;
                                            scaledBonus = window.evaluateFormula ? 
                                                window.evaluateFormula(tierFormula, { base: scaledBonus, tierIndex: tierIndex }) : 
                                                scaledBonus;
                                            
                                            // Add the scaled bonus back to 1.0 to get the final multiplier
                                            multiplicativeValue = 1.0 + scaledBonus;
                                        } else {
                                            multiplicativeValue = baseMultiplicativeValue;
                                        }
                                        
                                        console.log(`[BOTH type] ${statName}: baseAdditive=${baseAdditiveValue}, scaledAdditive=${additiveValue}, baseMultiplicative=${baseMultiplicativeValue}, scaledMultiplicative=${multiplicativeValue}`);
                                    }
                                    
                                    // Store the effect with component info for consolidation
                                    statEffects[statName].push({
                                        multiplier: multiplicativeValue,
                                        additive: additiveValue,
                                        scaledAdditive: stat.scaledValue || additiveValue, // Store the scaled value for display
                                        type: stat.type || 'multiplicative',
                                        componentId: componentId,
                                        componentName: component.name || `${componentType} ${className} ${tierName}`,
                                        category: category,
                                        groupName: groupName,
                                        componentType: componentType,
                                        className: className,
                                        tierName: tierName
                                    });
                                } else if (statValue !== 0) {
                                    // Legacy format - treat as multiplicative
                                    console.log(`Collecting multiplier ${statValue} for ${statName} from ${component.name} (${category}, ${groupName})`);
                                    statEffects[statName].push({
                                        multiplier: statValue,
                                        additive: 0,
                                        type: 'multiplicative',
                                        componentId: componentId,
                                        componentName: component.name || `${componentType} ${className} ${tierName}`,
                                        category: category,
                                        groupName: groupName,
                                        componentType: componentType,
                                        className: className,
                                        tierName: tierName
                                    });
                                }
                            }
                        });
                    }
                }
            });
        });
    });
    
    // Apply effects using the new stat type system
    Object.keys(statEffects).forEach(statName => {
        if (typeof modifiedStats[statName] === 'number' && statEffects[statName].length > 0) {
            const baseValue = ship[statName];
            
            // Group effects by unique component type and stat type
            const groupedEffects = {};
            statEffects[statName].forEach(effect => {
                const key = `${effect.category}-${effect.groupName}-${effect.componentType || 'default'}-${effect.type}`;
                if (!groupedEffects[key]) {
                    groupedEffects[key] = {
                        multiplier: effect.multiplier || 1.0,
                        additive: effect.additive || 0,
                        type: effect.type || 'multiplicative',
                        count: 1,
                        sample: effect
                    };
                } else {
                    groupedEffects[key].count++;
                }
            });
            
            // Calculate total additive and multiplicative effects
            let totalAdditive = 0;
            let totalMultiplier = 1.0;
            
            Object.values(groupedEffects).forEach(group => {
                if (group.type === 'additive' || group.type === 'both') {
                    // Linear stacking for additive values
                    const additiveTotal = group.count * group.additive;
                    totalAdditive += additiveTotal;
                    
                    if (additiveTotal !== 0) {
                        console.log(`${statName}: ${group.count}x ${group.sample.componentName} @ +${group.additive} = +${additiveTotal} (additive)`);
                    }
                }
                
                if (group.type === 'multiplicative' || group.type === 'both') {
                    // Linear stacking for multiplicative values: 1 + count * (multiplier - 1)
                    const multiplicativeEffect = group.count * (group.multiplier - 1);
                    totalMultiplier += multiplicativeEffect;
                    
                    if (multiplicativeEffect !== 0) {
                        console.log(`${statName}: ${group.count}x ${group.sample.componentName} @ ${group.multiplier} = +${(multiplicativeEffect * 100).toFixed(1)}% (multiplicative)`);
                    }
                }
            });
            
            // Apply effects: (base + additive) * multiplier
            modifiedStats[statName] = (baseValue + totalAdditive) * totalMultiplier;
            
            // Log the final calculation
            if (totalAdditive !== 0 || totalMultiplier !== 1.0) {
                console.log(`${statName}: (${baseValue} + ${totalAdditive}) × ${totalMultiplier.toFixed(3)} = ${modifiedStats[statName].toFixed(2)}`);
            }
        }
    });
    
    return modifiedStats;
}

// Get component group name based on category
function getComponentGroupName(component, category) {
    if (!component || !component.properties) return '';
    
    const properties = component.properties;
    
    switch (category) {
        case "Ship Component":
            return properties["Ship Component"] || '';
        case "Ship Module":
            return properties["Ship Modules"] || '';
        case "Ship Weapons":
            return properties["Damage Type"] || '';
        case "Countermeasures":
            return properties["Countermeasure"] || '';
        case "Missiles":
            return properties["Damage Type"] || '';
        case "Drones":
            return properties["Drone Type"] || '';
        default:
            return '';
    }
}

// Find component by ID
function findComponentById(componentId) {
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
    
    console.error(`Component with ID ${componentId} not found in component tree`);
    
    // As a fallback, check if we have an all-components array
    if (components.allComponents && Array.isArray(components.allComponents)) {
        const found = components.allComponents.find(c => c.id === componentId);
        if (found) return found;
    }
    
    return null;
}


// Show loading indicator for configuration change
function showConfigLoadingIndicator(shipId) {
    // Find all cells for this ship
    const shipCells = document.querySelectorAll(`td[data-ship-id="${shipId}"]`);
    
    // Add loading class to all cells
    shipCells.forEach(cell => {
        cell.classList.add('config-loading');
        
        // Add a loading spinner to the first few stat cells to show activity
        const cellIndex = Array.from(cell.parentElement.children).indexOf(cell);
        if (cellIndex > 0 && cellIndex <= 3 && cell.classList.contains('modified-value')) {
            const spinner = document.createElement('div');
            spinner.className = 'config-loading-spinner';
            spinner.innerHTML = '⟳';
            cell.appendChild(spinner);
        }
    });
    
    // Also add loading state to the ship header
    const shipHeader = document.querySelector(`.ship-header[data-ship-id="${shipId}"]`);
    if (shipHeader) {
        shipHeader.classList.add('config-loading');
        
        // Disable the dropdown during loading
        const dropdown = shipHeader.querySelector('.config-dropdown');
        if (dropdown) {
            dropdown.disabled = true;
            dropdown.style.opacity = '0.6';
        }
        
        // Add percentage indicator and loading feed
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'config-loading-overlay';
        loadingOverlay.id = `loading-overlay-${shipId}`;
        
        const percentageDisplay = document.createElement('div');
        percentageDisplay.className = 'config-loading-percentage';
        percentageDisplay.innerHTML = '<span class="percentage-value">0</span>%';
        
        const loadingFeed = document.createElement('div');
        loadingFeed.className = 'config-loading-feed';
        
        // Add initial message with timestamp
        const initTimestamp = new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            fractionalSecondDigits: 3 
        }).replace(/:/g, ':');
        loadingFeed.innerHTML = `<div class="feed-item"><span style="color: #666">[${initTimestamp}]</span> Initializing configuration loader...</div>`;
        
        loadingOverlay.appendChild(percentageDisplay);
        loadingOverlay.appendChild(loadingFeed);
        shipHeader.appendChild(loadingOverlay);
    }
}

// Hide loading indicator for configuration change
function hideConfigLoadingIndicator(shipId) {
    // Remove loading class from all cells
    const shipCells = document.querySelectorAll(`td[data-ship-id="${shipId}"]`);
    shipCells.forEach(cell => {
        cell.classList.remove('config-loading');
        
        // Remove any loading spinners
        const spinner = cell.querySelector('.config-loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    });
    
    // Remove loading state from ship header
    const shipHeader = document.querySelector(`.ship-header[data-ship-id="${shipId}"]`);
    if (shipHeader) {
        shipHeader.classList.remove('config-loading');
        
        // Re-enable the dropdown
        const dropdown = shipHeader.querySelector('.config-dropdown');
        if (dropdown) {
            dropdown.disabled = false;
            dropdown.style.opacity = '1';
        }
        
        // Remove loading overlay immediately (no fade out for terminal style)
        const loadingOverlay = document.getElementById(`loading-overlay-${shipId}`);
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }
}



// Update comparison table with progress tracking for a specific ship
function updateComparisonTableWithProgress(shipId) {
    const ship = addedShips.find(s => s.id === shipId);
    if (!ship) {
        updateComparisonTable();
        hideConfigLoadingIndicator(shipId);
        return;
    }
    
    const shipIdentifier = getShipIdentifier(ship);
    const configIndex = activeConfigIndices[shipId] || 0;
    const config = shipConfigurations[shipIdentifier] ? shipConfigurations[shipIdentifier][configIndex] : null;
    
    // Get the loading overlay elements
    const overlay = document.getElementById(`loading-overlay-${shipId}`);
    if (!overlay) {
        updateComparisonTable();
        return;
    }
    
    const percentageValue = overlay.querySelector('.percentage-value');
    const loadingFeed = overlay.querySelector('.config-loading-feed');
    
    // Clear the feed
    loadingFeed.innerHTML = '';
    
    // Calculate total work to be done
    let totalComponents = 0;
    let totalStats = getRelevantStats().length;
    
    if (config && config.components) {
        Object.keys(config.components).forEach(category => {
            const components = config.components[category];
            totalComponents += Object.keys(components).filter(key => components[key]).length;
        });
    }
    
    // Create more granular loading steps
    const loadingSteps = [];
    let currentProgress = 0;
    
    // Phase 1: Configuration loading (0-10%)
    loadingSteps.push({
        progress: 2,
        message: `📋 Reading ${config ? config.name : 'Default'} configuration...`,
        work: () => {
            // Simulate reading config
            return true;
        }
    });
    
    loadingSteps.push({
        progress: 5,
        message: `🔍 Validating configuration structure...`,
        work: () => {
            // Validate config
            return config && config.components;
        }
    });
    
    loadingSteps.push({
        progress: 10,
        message: `📊 Found ${totalComponents} components across ${Object.keys(config?.components || {}).length} categories`,
        work: () => {
            return true;
        }
    });
    
    // Phase 2: Component processing (10-60%)
    if (config && config.components) {
        const componentProgress = 50 / Math.max(totalComponents, 1);
        let componentIndex = 0;
        
        const categoryIcons = {
            "Ship Component": "⚙️",
            "Ship Module": "📦", 
            "Ship Weapons": "🔫",
            "Countermeasures": "🛡️",
            "Missiles": "🚀",
            "Drones": "🤖"
        };
        
        Object.keys(config.components).forEach(category => {
            const components = config.components[category];
            const componentList = Object.entries(components).filter(([key, value]) => value);
            
            componentList.forEach(([componentType, componentId]) => {
                componentIndex++;
                const progress = Math.round(10 + (componentIndex * componentProgress));
                
                loadingSteps.push({
                    progress: Math.min(progress, 60),
                    message: `${categoryIcons[category]} Loading ${componentType}...`,
                    work: () => {
                        // Simulate finding component
                        const component = findComponentById(componentId);
                        return component !== null;
                    }
                });
            });
        });
    }
    
    // Phase 3: Stat calculations (60-90%)
    const statProgress = 30 / Math.max(totalStats, 1);
    let statIndex = 0;
    
    loadingSteps.push({
        progress: 65,
        message: `📊 Beginning stat calculations for ${totalStats} attributes...`,
        work: () => true
    });
    
    // Add a few stat calculation steps
    const statSamples = Math.min(5, totalStats);
    for (let i = 0; i < statSamples; i++) {
        statIndex++;
        const progress = Math.round(65 + (statIndex * statProgress * (totalStats / statSamples)));
        
        loadingSteps.push({
            progress: Math.min(progress, 90),
            message: `🔧 Calculating modifications... (${Math.round((i + 1) / statSamples * 100)}%)`,
            work: () => true
        });
    }
    
    // Phase 4: Table update (90-99%)
    loadingSteps.push({
        progress: 92,
        message: `📈 Preparing table update...`,
        work: () => true
    });
    
    loadingSteps.push({
        progress: 92,
        message: `✨ Rendering comparison values...`,
        work: () => true
    });
    
    loadingSteps.push({
        progress: 94,
        message: `🎨 Applying stat colors and formatting...`,
        work: () => true
    });
    
    loadingSteps.push({
        progress: 96,
        message: `📊 Calculating percentage changes...`,
        work: () => true
    });
    
    loadingSteps.push({
        progress: 97,
        message: `🖌️ Updating cell styles...`,
        work: () => true
    });
    
    loadingSteps.push({
        progress: 98,
        message: `🔄 Finalizing table layout...`,
        work: () => true
    });
    
    loadingSteps.push({
        progress: 99,
        message: `📋 Performing table update...`,
        work: () => {
            // Actually update the table here
            updateComparisonTable();
            return true;
        }
    });
    
    // Final step - only hit 100% when truly done
    loadingSteps.push({
        progress: 100,
        message: '✅ Configuration loaded successfully!',
        work: () => true
    });
    
    let currentStep = 0;
    let startTime = Date.now();
    
    function processNextStep() {
        if (currentStep >= loadingSteps.length) {
            // All done - hide indicator after showing 100% briefly
            setTimeout(() => {
                hideConfigLoadingIndicator(shipId);
            }, 500);
            return;
        }
        
        const step = loadingSteps[currentStep];
        
        // Execute the work for this step
        const success = step.work ? step.work() : true;
        
        // Update percentage smoothly
        animateProgress(percentageValue, parseInt(percentageValue.textContent) || 0, step.progress);
        
        // Add message to feed
        const feedItem = document.createElement('div');
        feedItem.className = 'feed-item';
        
        // Add timestamp prefix for terminal style
        const timestamp = new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            fractionalSecondDigits: 3 
        }).replace(/:/g, ':');
        
        feedItem.innerHTML = `<span style="color: #666">[${timestamp}]</span> ${step.message}`;
        
        if (!success) {
            feedItem.innerHTML = `<span style="color: #666">[${timestamp}]</span> <span style="color: #ff6b6b">ERROR:</span> ${step.message}`;
        }
        
        loadingFeed.appendChild(feedItem);
        
        // Keep only last 30 items
        while (loadingFeed.children.length > 30) {
            loadingFeed.removeChild(loadingFeed.firstChild);
        }
        
        // Auto-scroll to bottom
        loadingFeed.scrollTop = loadingFeed.scrollHeight;
        
        currentStep++;
        
        // Calculate delay based on progress and total time target (aim for ~2 seconds total)
        const elapsed = Date.now() - startTime;
        const targetTotalTime = 2000; // 2 seconds
        const remainingTime = Math.max(0, targetTotalTime - elapsed);
        const remainingSteps = loadingSteps.length - currentStep;
        const delay = remainingSteps > 0 ? Math.min(remainingTime / remainingSteps, 150) : 50;
        
        // Schedule next step
        setTimeout(processNextStep, delay);
    }
    
    // Helper to animate percentage changes
    function animateProgress(element, from, to) {
        const duration = 150;
        const start = Date.now();
        
        function update() {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.round(from + (to - from) * progress);
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        requestAnimationFrame(update);
    }
    
    // Start the loading process
    processNextStep();
}

// Event listener for configuration change
function handleConfigChange(event) {
    const selectedValue = event.target.value;
    const shipId = parseInt(event.target.getAttribute('data-ship-id'));
    const shipIdentifier = event.target.getAttribute('data-ship-identifier');
    
    // Find the ship in the addedShips array
    const ship = addedShips.find(s => s.id === shipId);
    if (!ship) {
        console.error(`Ship with ID ${shipId} not found in handleConfigChange`);
        return;
    }
    
            console.log(`Configuration dropdown changed for ship ${getShipDisplayName(ship)} (${shipIdentifier}) to value: ${selectedValue}`);
    
    if (selectedValue === 'add-new') {
        // Reset dropdown to previous selection
        const currentSelectedIndex = activeConfigIndices[shipId] || 0;
        event.target.value = currentSelectedIndex;
        
        // Open modal to add new configuration
        // After adding, just switch to it (do not open components panel)
        window.addConfiguration(shipId, shipIdentifier, {
            onAdded: (newIndex) => {
                // Update the active config index
                activeConfigIndices[shipId] = newIndex;
                
                // Update the comparison table
                updateComparisonTable();
            }
        });
    } else {
        // Parse the selected configuration index
        const configIndex = parseInt(selectedValue);
        
        console.log(`Switching from config index ${activeConfigIndices[shipId]} to ${configIndex} for ship ${ship['Ship Name']} (${shipIdentifier})`);
        
        // Show loading indicator
        showConfigLoadingIndicator(shipId);
        
        // Store the active config index
        activeConfigIndices[shipId] = configIndex;
        
        // Update the comparison table with loading progress
        setTimeout(() => {
            updateComparisonTableWithProgress(shipId);
        }, 50);
    }
}

// Initialize the application
function initApp() {
    console.log('Initializing app...');
    
    // Initialize the copiedConfiguration if it's in localStorage
    if (localStorage.getItem('copiedConfiguration')) {
        try {
            copiedConfiguration = JSON.parse(localStorage.getItem('copiedConfiguration'));
            console.log('Loaded copied configuration from localStorage');
        } catch (e) {
            console.error('Error loading copied configuration from localStorage:', e);
            localStorage.removeItem('copiedConfiguration');
        }
    }
    
    // Initialize the attribute order
    initAttributeOrder();
    
    // Add CSS for row management
    addRowManagementStyles();
    
    // Initialize theme toggle
    initThemeToggle();
    
    // Keep the file input event listeners
    document.getElementById('csv-file').addEventListener('change', window.handleCsvUpload);
    document.getElementById('components-file').addEventListener('change', window.handleComponentsUpload);
    document.getElementById('config-file').addEventListener('change', window.loadConfigurations);
    
    // Add event listener for the standalone Save Configs button
    document.getElementById('save-config').addEventListener('click', window.saveConfigurations);
    
    // === FILE MENU FUNCTIONALITY ===
    // Create dropdown menu for file operations button
    const fileMenuBtn = document.getElementById('file-menu-button');
    const fileMenu = document.createElement('div');
    fileMenu.className = 'actions-dropdown-menu';
    fileMenu.id = 'file-menu';
    fileMenu.style.display = 'none';
    
    // Create file menu items
    const createFileMenuItem = (icon, text, handler, color = null) => {
        const menuItem = document.createElement('div');
        menuItem.className = 'actions-menu-item';
        menuItem.innerHTML = `<span style="margin-right: 8px;">${icon}</span>${text}`;
        
        if (color) {
            menuItem.style.color = color;
        }
        
        menuItem.addEventListener('click', (e) => {
            e.stopPropagation();
            handler();
            fileMenu.style.display = 'none';
        });
        
        return menuItem;
    };
    
    // Create menu items - removed Save Configs since it's now a standalone button
    const loadConfigsItem = createFileMenuItem('📂', 'Load Configs', () => {
        document.getElementById('config-file').click();
    });
    fileMenu.appendChild(loadConfigsItem);
    
    const loadShipItem = createFileMenuItem('🚢', 'Load Ship JSON', () => {
        // Create a temporary file input for ship JSON files
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.multiple = true; // Allow multiple file selection
        fileInput.onchange = (e) => {
            // Call the function directly
            loadSeparatedShipJSON(e);
        };
        fileInput.click();
    });
    fileMenu.appendChild(loadShipItem);
    
    const loadShipStatsItem = createFileMenuItem('📊', 'Load Ship Stats', () => {
        document.getElementById('csv-file').click();
    });
    fileMenu.appendChild(loadShipStatsItem);
    
    const loadComponentsItem = createFileMenuItem('🔧', 'Load Components', () => {
        document.getElementById('components-file').click();
    });
    fileMenu.appendChild(loadComponentsItem);
    
    // Add separator
    const fileSeparator = document.createElement('div');
    fileSeparator.style.height = '1px';
    fileSeparator.style.backgroundColor = '#444';
    fileSeparator.style.margin = '4px 0';
    fileMenu.appendChild(fileSeparator);
    
    const restoreBackupItem = createFileMenuItem('💾', 'Restore from Backup', () => {
        restoreFromLocalBackup();
    });
    fileMenu.appendChild(restoreBackupItem);
    
    // Add the dropdown menu to the document
    document.body.appendChild(fileMenu);
    
    // Toggle menu display on click
    fileMenuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Position the menu below the file button
        const rect = this.getBoundingClientRect();
        fileMenu.style.top = `${rect.bottom + 5}px`;
        fileMenu.style.left = `${rect.left}px`;
        
        // Toggle visibility
        if (fileMenu.style.display === 'none') {
            // Hide all other menus first
            document.querySelectorAll('.actions-dropdown-menu').forEach(menu => {
                menu.style.display = 'none';
            });
            
            fileMenu.style.display = 'block';
            
            // Close when clicking outside
            const closeMenu = function() {
                fileMenu.style.display = 'none';
                document.removeEventListener('click', closeMenu);
            };
            
            // Add slight delay to avoid immediate closing
            setTimeout(() => {
                document.addEventListener('click', closeMenu);
            }, 10);
        } else {
            fileMenu.style.display = 'none';
        }
    });
    // === END FILE MENU FUNCTIONALITY ===
    
    // Add event listeners for ship buttons
    document.getElementById('add-ship-button').addEventListener('click', addEmptyShipColumn);
    
    // Add refresh table button listener
    document.getElementById('refresh-table-button').addEventListener('click', function() {
        console.log('[Refresh Table] Manual refresh triggered');
        
        // Show visual feedback
        this.textContent = '⟳';
        this.style.animation = 'spin 0.5s linear';
        
        // Update all ships efficiently
        if (window.efficientTableUpdate) {
            window.efficientTableUpdate();
        } else if (window.updateComparisonTable) {
            window.updateComparisonTable();
        }
        
        // Reset button after animation
        setTimeout(() => {
            this.textContent = '↻';
            this.style.animation = '';
        }, 500);
    });
    
    // === HEADER ACTIONS MENU FUNCTIONALITY ===
    // Create dropdown menu for ship actions button
    const shipActionsBtn = document.getElementById('ship-actions-button');
    const shipActionsMenu = document.createElement('div');
    shipActionsMenu.className = 'actions-dropdown-menu';
    shipActionsMenu.id = 'ship-actions-menu';
    shipActionsMenu.style.display = 'none';
    
    // Create actions menu items
    const createHeaderMenuItem = (text, handler, color = null) => {
        const menuItem = document.createElement('div');
        menuItem.className = 'actions-menu-item';
        menuItem.textContent = text;
        
        if (color) {
            menuItem.style.color = color;
        }
        
        menuItem.addEventListener('click', (e) => {
            e.stopPropagation();
            handler();
            shipActionsMenu.style.display = 'none';
        });
        
        return menuItem;
    };
    
    // Create menu items
    const addNext5Item = createHeaderMenuItem('Add Next 5 Ships', addNext5Ships);
    addNext5Item.setAttribute('data-action', 'add-next-5');
    shipActionsMenu.appendChild(addNext5Item);
    
    const addRemainingItem = createHeaderMenuItem('Add Remaining Ships', addRemainingShips);
    addRemainingItem.setAttribute('data-action', 'add-remaining');
    shipActionsMenu.appendChild(addRemainingItem);
    
    // Add dynamic "Add All [Class]" item with emoji
    const addAllClassItem = createHeaderMenuItem('🚀 Add All [Class]', () => {
        if (addedShips.length > 0) {
            const firstShipClass = getClassNameFromNumber(addedShips[0].Class);
            // Update the menu item text to show the actual class
            addAllClassItem.textContent = `🚀 Add All ${firstShipClass}`;
        }
        addAllShipsOfSameClass();
    });
    addAllClassItem.setAttribute('data-action', 'add-all-class');
    
    // Update the text dynamically based on first ship
    if (addedShips.length > 0) {
        const firstShipClass = getClassNameFromNumber(addedShips[0].Class);
        addAllClassItem.textContent = `🚀 Add All ${firstShipClass}`;
    }
    
    shipActionsMenu.appendChild(addAllClassItem);
    
    const addAllItem = createHeaderMenuItem('Add All Ships', addAllShips, '#4CAF50'); // Green
    addAllItem.setAttribute('data-action', 'add-all');
    shipActionsMenu.appendChild(addAllItem);
    
    // Add separator
    const separator = document.createElement('div');
    separator.style.height = '1px';
    separator.style.backgroundColor = '#444';
    separator.style.margin = '4px 0';
    shipActionsMenu.appendChild(separator);
    
    const removeAllItem = createHeaderMenuItem('Remove All Ships', removeAllShips, '#ff6b6b'); // Red
    removeAllItem.setAttribute('data-action', 'remove-all');
    shipActionsMenu.appendChild(removeAllItem);
    
    // Add separator before file operations
    const separator2 = document.createElement('div');
    separator2.style.height = '1px';
    separator2.style.backgroundColor = '#444';
    separator2.style.margin = '4px 0';
    shipActionsMenu.appendChild(separator2);
    
    // Add Save All Ships as ZIP option
    const saveAllZipItem = createHeaderMenuItem('📦 Save All Ships as ZIP', () => {
        if (typeof saveAllShipsAsZip === 'function') {
            saveAllShipsAsZip();
        } else {
            console.error('saveAllShipsAsZip not available yet');
            alert('Save All Ships functionality is not available at the moment. Please try again.');
        }
    }, '#3d8bf8'); // Blue
    saveAllZipItem.setAttribute('data-action', 'save-all-zip');
    saveAllZipItem.title = 'Save all ships and their configurations as separate JSON files in a ZIP';
    shipActionsMenu.appendChild(saveAllZipItem);
    
    // Add Save All Ships Individually option
    const saveAllIndividualItem = createHeaderMenuItem('💾 Save All Ships Individually', () => {
        if (typeof saveAllShipsIndividually === 'function') {
            saveAllShipsIndividually();
        } else {
            console.error('saveAllShipsIndividually not available yet');
            alert('Save All Ships functionality is not available at the moment. Please try again.');
        }
    }, '#3d8bf8'); // Blue
    saveAllIndividualItem.setAttribute('data-action', 'save-all-individual');
    saveAllIndividualItem.title = 'Save all ships as individual JSON files (one by one)';
    shipActionsMenu.appendChild(saveAllIndividualItem);
    
    // Add the dropdown menu to the document
    document.body.appendChild(shipActionsMenu);
    
    // Toggle menu display on click
    shipActionsBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Update the "Add All [Class]" menu item text based on the first ship
        const addAllClassItem = shipActionsMenu.querySelector('[data-action="add-all-class"]');
        if (addAllClassItem) {
            if (addedShips.length > 0) {
                const firstShipClass = getClassNameFromNumber(addedShips[0].Class);
                addAllClassItem.textContent = `🚀 Add All ${firstShipClass}`;
            } else {
                addAllClassItem.textContent = '🚀 Add All [Class]';
            }
        }
        
        // Position the menu below the actions button
        const rect = this.getBoundingClientRect();
        shipActionsMenu.style.top = `${rect.bottom + 5}px`;
        shipActionsMenu.style.left = `${rect.left - 144 + rect.width/2}px`; // Center menu under the button
        
        // Toggle visibility
        if (shipActionsMenu.style.display === 'none') {
            // Hide all other menus first
            document.querySelectorAll('.actions-dropdown-menu').forEach(menu => {
                menu.style.display = 'none';
            });
            
            shipActionsMenu.style.display = 'block';
            
            // Close when clicking outside
            const closeMenu = function() {
                shipActionsMenu.style.display = 'none';
                document.removeEventListener('click', closeMenu);
            };
            
            // Add slight delay to avoid immediate closing
            setTimeout(() => {
                document.addEventListener('click', closeMenu);
            }, 10);
        } else {
            shipActionsMenu.style.display = 'none';
        }
    });
    // === END HEADER ACTIONS MENU FUNCTIONALITY ===
    
    // Add event listeners for the components panel
    document.getElementById('close-components-panel').addEventListener('click', closeComponentsPanel);
    

    
    // Add event listeners for the attributes panel
    document.getElementById('close-attributes-panel').addEventListener('click', closeAttributesPanel);
    
    // Add event listener for the lock button
    const lockAttributesBtn = document.getElementById('lock-attributes-panel');
    if (lockAttributesBtn) {
        lockAttributesBtn.addEventListener('click', function() {
            attributesPanelLocked = !attributesPanelLocked;
            
            // Update button appearance
            if (attributesPanelLocked) {
                this.innerHTML = '🔒 Locked';
                this.title = 'Click to unlock (show all rows)';
                this.style.backgroundColor = '#444';
            } else {
                this.innerHTML = '🔓 Unlocked';
                this.title = 'Click to lock (hide zero values)';
                this.style.backgroundColor = '#333';
            }
            
            // Refresh the attributes editor to apply the lock state
            if (currentCategory && currentComponentGroup) {
                populateAttributesEditor(currentCategory, currentComponentGroup);
            }
        });
    }
    
    // Initialize drag and drop functionality for ships
    initDragAndDrop();
    
        // Initialize the top scrollbar
    initTopScrollbar();
    
    // Create tooltip element for stat modifications
    createStatModificationTooltip();
    
    // Initialize the pattern builder module
    if (typeof initPatternBuilder === 'function') {
        initPatternBuilder();
    } else {
        console.warn('Pattern Builder module not loaded');
    }
    
    // Initialize the combat simulator module
    if (typeof initCombatSimulator === 'function') {
        initCombatSimulator();
    } else {
        console.warn('Combat Simulator module not loaded');
    }
}

// Create the tooltip element for stat modifications
function createStatModificationTooltip() {
    // Check if tooltip already exists
    if (document.getElementById('stat-modification-tooltip')) {
        return;
    }
    
    // Create tooltip element as a right-side panel
    const tooltip = document.createElement('div');
    tooltip.id = 'stat-modification-tooltip';
    tooltip.className = 'stat-panel';
    tooltip.style.display = 'none';
    tooltip.style.position = 'fixed';
    tooltip.style.top = '0';
    tooltip.style.right = '0';
    tooltip.style.bottom = '0';
    tooltip.style.width = '400px';
    tooltip.style.backgroundColor = 'rgba(20, 20, 20, 0.97)';
    tooltip.style.borderLeft = '1px solid #666';
    tooltip.style.padding = '0';
    tooltip.style.zIndex = '1000';
    tooltip.style.color = 'white';
    tooltip.style.boxShadow = '-4px 0 8px rgba(0, 0, 0, 0.5)';
    tooltip.style.fontSize = '14px';
    tooltip.style.textAlign = 'left';
    tooltip.style.overflow = 'auto';
    tooltip.style.transition = 'transform 0.3s ease-in-out';
    tooltip.style.transform = 'translateX(400px)';
    
    // Add to body
    document.body.appendChild(tooltip);
}

// Show modal to edit stat description
function showStatDescriptionModal(statName) {
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    modalContainer.style.zIndex = '10000';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.maxWidth = '500px';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
        <h3>Edit Description: ${statName}</h3>
        <button class="close-button">&times;</button>
    `;
    
    // Create body
    const body = document.createElement('div');
    body.className = 'modal-body';
    body.style.padding = '20px';
    
    const label = document.createElement('label');
    label.textContent = 'Description:';
    label.style.display = 'block';
    label.style.marginBottom = '10px';
    label.style.fontWeight = 'bold';
    
    const textarea = document.createElement('textarea');
    textarea.className = 'stat-description-textarea';
    textarea.style.width = '100%';
    textarea.style.minHeight = '150px';
    textarea.style.padding = '10px';
    textarea.style.fontSize = '14px';
    textarea.style.border = '1px solid #444';
    textarea.style.backgroundColor = '#222';
    textarea.style.color = '#fff';
    textarea.style.borderRadius = '4px';
    textarea.style.resize = 'vertical';
    textarea.placeholder = `Enter a description for ${statName}...`;
    textarea.value = statDescriptions[statName] || '';
    
    // Focus and select text when modal opens
    setTimeout(() => {
        textarea.focus();
        textarea.select();
    }, 100);
    
    body.appendChild(label);
    body.appendChild(textarea);
    
    // Create footer with buttons
    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.justifyContent = 'flex-end';
    footer.style.gap = '10px';
    footer.style.marginTop = '20px';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'header-button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modalContainer);
    });
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'header-button';
    saveBtn.style.backgroundColor = '#4CAF50';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => {
        const description = textarea.value.trim();
        if (description) {
            statDescriptions[statName] = description;
            window.statDescriptions[statName] = description; // Update window object
        } else {
            delete statDescriptions[statName];
            delete window.statDescriptions[statName]; // Update window object
        }
        document.body.removeChild(modalContainer);
        
        // Mark configuration as changed
        if (typeof markConfigurationAsChanged === 'function') {
            markConfigurationAsChanged();
        }
        
        // Update any visible info buttons for this stat (in both tables)
        document.querySelectorAll('.stat-name-cell, .stat-name').forEach(cell => {
            // For config editor table
            const nameSpan = cell.querySelector('span');
            const infoBtn = cell.querySelector('.stat-info-button');
            if (nameSpan && infoBtn && nameSpan.textContent === statName) {
                // Update button appearance based on whether description exists
                if (description) {
                    infoBtn.style.color = '#3d8bf8';
                    infoBtn.style.borderColor = '#3d8bf8';
                } else {
                    infoBtn.style.color = '#999';
                    infoBtn.style.borderColor = '#666';
                }
            }
            
            // For comparison table - check stat-name-text spans
            const statNameText = cell.querySelector('.stat-name-text');
            if (statNameText && statNameText.textContent === statName) {
                const infoBtnInCell = cell.querySelector('.stat-info-button');
                if (infoBtnInCell) {
                    if (description) {
                        infoBtnInCell.style.color = '#3d8bf8';
                        infoBtnInCell.style.borderColor = '#3d8bf8';
                    } else {
                        infoBtnInCell.style.color = '#999';
                        infoBtnInCell.style.borderColor = '#666';
                    }
                }
                
                // Update tooltip
                if (description) {
                    statNameText.style.cursor = 'help';
                    statNameText.title = description;
                } else {
                    statNameText.style.cursor = 'default';
                    statNameText.title = '';
                }
            }
        });
        
        // Refresh components panel if open to update tooltips
        if (document.getElementById('components-panel').classList.contains('open')) {
            const containerId = parseInt(document.getElementById('components-container').getAttribute('data-ship-id'));
            const configIndex = parseInt(document.getElementById('components-container').getAttribute('data-config-index'));
            const shipIdentifier = document.getElementById('components-container').getAttribute('data-ship-identifier');
            if (!isNaN(containerId) && !isNaN(configIndex) && shipIdentifier) {
                // Refresh stats display to update tooltips
                setTimeout(() => {
                    openComponentsPanel(containerId, configIndex, shipIdentifier);
                }, 100);
            }
        }
    });
    
    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);
    
    // Assemble modal
    modalContent.appendChild(header);
    modalContent.appendChild(body);
    modalContent.appendChild(footer);
    modalContainer.appendChild(modalContent);
    
    // Close button handler
    header.querySelector('.close-button').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
    });
    
    // Close on background click
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            document.body.removeChild(modalContainer);
        }
    });
    
    // Save on Enter, close on Escape
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(modalContainer);
        } else if (e.key === 'Enter' && e.ctrlKey) {
            saveBtn.click();
        }
    });
    
    document.body.appendChild(modalContainer);
}

// Save all ships as individual JSON files  
function saveAllShipsIndividually() {
    if (addedShips.length === 0) {
        alert('No ships in comparison to save.');
        return;
    }
    
    console.log(`Saving ${addedShips.length} ships individually...`);
    
    // Save each ship one by one
    addedShips.forEach((ship, index) => {
        const shipIdentifier = getShipIdentifier(ship);
        const activeConfigIndex = activeConfigIndices[ship.id] || 0;
        const configurations = shipConfigurations[shipIdentifier] || [];
        
        // Create ship data object
        const shipData = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            ship: ship,
            shipIdentifier: shipIdentifier,
            configurations: configurations,
            activeConfigIndex: activeConfigIndex
        };
        
        // Get ship class name and number
        const className = getClassNameFromNumber(ship.Class);
        const classNumber = ship.Class;
        
        // Create filename with class number and name prefix
        const safeName = ship['Ship Name'].replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${classNumber}_${className}_${safeName}_${ship.Manufacturer}.json`;
        
        // Convert to JSON
        const jsonString = JSON.stringify(shipData, null, 2);
        
        // Create download with delay to avoid browser blocking
        setTimeout(() => {
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, index * 200); // 200ms delay between downloads
    });
    
    alert(`Downloading ${addedShips.length} ship files. Please check your downloads folder.`);
}

// Export function for global access
window.showStatDescriptionModal = showStatDescriptionModal;
window.loadSeparatedShipJSON = loadSeparatedShipJSON;
window.addAllShipsOfSameClass = addAllShipsOfSameClass;
window.saveAllShipsIndividually = saveAllShipsIndividually;

// Show tooltip with modification details
let currentPanelVisibleComponents = new Set(); // Track components visible in current panel session

function showStatModificationTooltip(event) {
    const target = event.target;
    const statName = target.getAttribute('data-stat-name');
    const baseValue = parseFloat(target.getAttribute('data-base-value'));
    const modifiedValue = parseFloat(target.getAttribute('data-modified-value'));
    const shipId = parseInt(target.getAttribute('data-ship-id'));
    const shipIdentifier = target.getAttribute('data-ship-identifier');
    const configIndex = parseInt(target.getAttribute('data-config-index'));
    
    // Find ship and config
    const ship = addedShips.find(s => s.id === shipId);
    if (!ship || !shipConfigurations[shipIdentifier] || !shipConfigurations[shipIdentifier][configIndex]) {
        return;
    }
    
    const config = shipConfigurations[shipIdentifier][configIndex];
    
    // Get tooltip element
    const tooltip = document.getElementById('stat-modification-tooltip');
    if (!tooltip) {
        return;
    }
    
    // Check if this is a fresh panel open (not a refresh)
    const currentPanelStat = tooltip.getAttribute('data-stat-name');
    const currentPanelShipId = tooltip.getAttribute('data-ship-id');
    const isPanelRefresh = tooltip.style.display === 'block' && 
                         currentPanelStat === statName && 
                         currentPanelShipId === String(shipId);
    
    // If this is a new panel open, we need to capture initial visible components
    let captureInitialComponents = false;
    if (!isPanelRefresh) {
        currentPanelVisibleComponents.clear();
        captureInitialComponents = true;
    }
    
    // Calculate the components that modify this stat
    const modificationDetails = calculateStatModificationDetails(ship, config, statName, isPanelRefresh, captureInitialComponents);
    
    // Create tooltip content with a vertical layout for side panel
    let tooltipContent = `
        <div class="stat-panel-header" style="position: sticky; top: 0; z-index: 10; background-color: #111; padding: 15px; border-bottom: 1px solid #555; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; color: #FFD700; font-size: 20px;">Stat Details: ${statName}</h3>
            <button id="close-stat-panel" style="background: none; border: none; color: #ccc; font-size: 20px; cursor: pointer; padding: 5px 10px;">&times;</button>
        </div>
        
        <div style="padding: 15px;">`;
    
    // Add stat description if available
    if (statDescriptions[statName]) {
        tooltipContent += `
            <div style="margin-bottom: 20px; background-color: rgba(61, 139, 248, 0.1); padding: 15px; border-radius: 4px; border-left: 3px solid #3d8bf8;">
                <div style="color: #3d8bf8; font-weight: bold; margin-bottom: 5px;">Description:</div>
                <div style="color: #ccc; line-height: 1.5;">${statDescriptions[statName]}</div>
            </div>`;
    }
    
    // Calculate percentage change and multiplier
    const difference = modifiedValue - baseValue;
    const combinedMultiplier = modificationDetails.multipliers.length > 0 
        ? modificationDetails.multipliers.reduce((product, multiplier) => product * multiplier, 1.0)
        : 1.0;
    const percentChange = baseValue !== 0 ? (difference / Math.abs(baseValue)) * 100 : 0;
    const differenceColor = difference >= 0 ? '#4CAF50' : '#ff6b6b';
    const differenceSign = difference >= 0 ? '+' : '';
    const percentSign = percentChange >= 0 ? '+' : '';
    
    tooltipContent += `
            <div style="margin-bottom: 20px; background-color: rgba(0,0,0,0.2); padding: 15px; border-radius: 4px;">
                <div style="text-align: center; margin-bottom: 15px;">
                    <div style="font-size: 28px; font-weight: bold; color: ${differenceColor};">
                        ${percentSign}${percentChange.toFixed(1)}%
                    </div>
                    <div style="color: #888; font-size: 14px;">Percentage Change</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>Base Value:</div>
                    <div style="color: white; font-weight: bold; text-align: right;">${baseValue}</div>
                    
                    <div>Modified Value:</div>
                    <div style="color: white; font-weight: bold; text-align: right;">${modifiedValue}</div>
                    
                    <div>Difference:</div>
                    <div style="color: ${differenceColor}; font-weight: bold; text-align: right;">${differenceSign}${difference.toFixed(2)}</div>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: white; border-bottom: 1px solid #444; padding-bottom: 5px;">Components Affecting This Stat</h4>
    `;
    
    // Add component contributions (grouped)
    if (modificationDetails.groupedComponents && modificationDetails.groupedComponents.length > 0) {
        modificationDetails.groupedComponents.forEach((group, index) => {
            // Determine color based on multiplier effect
            const multiplierEffect = group.multiplier - 1.0; // How much it changes from base (1.0)
            const contribColor = multiplierEffect >= 0 ? '#4CAF50' : '#ff6b6b';
            const percentageChange = (multiplierEffect * 100).toFixed(1);
            const percentSign = multiplierEffect >= 0 ? '+' : '';
            
            // Calculate total contribution for this group
            const totalEffect = group.count * multiplierEffect;
            const totalPercentage = (totalEffect * 100).toFixed(1);
            
            // Add visual indicator for components with 0 value
            const isZeroValue = group.multiplier === 0;
            const componentStyle = isZeroValue ? 
                'margin-bottom: 15px; background-color: rgba(30,30,30,0.5); padding: 10px; border-radius: 4px; border: 1px dashed #666;' :
                'margin-bottom: 15px; background-color: rgba(30,30,30,0.5); padding: 10px; border-radius: 4px;';
            
            tooltipContent += `
                <div style="${componentStyle}">
                    <div style="color: #FFD700; font-weight: bold; font-size: 16px;">
                        ${group.name}${group.count > 1 ? ` (×${group.count})` : ''}${isZeroValue ? ' <span style="color: #666; font-size: 12px;">(inactive)</span>' : ''}
                    </div>
                    <div style="font-size: 12px; color: #BBB; margin: 5px 0;">
                        ${group.category} - ${group.type} (${group.class} ${group.tier})
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                        <div style="flex: 1;">`;
            
            // Show stat type info and appropriate fields
            if (group.statType) {
                const typeColor = window.getStatTypeColor ? window.getStatTypeColor(group.statType) : '#ccc';
                const typeIcon = window.getStatTypeIcon ? window.getStatTypeIcon(group.statType) : '';
                
                tooltipContent += `
                    <div style="margin-bottom: 8px;">
                        <span style="color: #888; font-size: 12px;">Type:</span>
                        <span style="background: rgba(255,255,255,0.1);
                                   border: 1px solid ${typeColor};
                                   color: ${typeColor};
                                   padding: 2px 8px;
                                   border-radius: 3px;
                                   margin-left: 5px;
                                   font-size: 14px;
                                   display: inline-block;">
                            ${typeIcon} ${group.statType.toUpperCase()}
                        </span>
                    </div>`;
                
                // Show appropriate input fields based on type
                if (group.statType === 'additive' || group.statType === 'both') {
                    // Use raw additive value for display
                    const rawAdditiveValue = group.rawAdditiveValue !== undefined ? group.rawAdditiveValue : 0;
                    tooltipContent += `
                        <div style="margin-bottom: 5px;">
                            <span style="color: #4CAF50; font-size: 12px;">Additive Value:</span>
                            <input type="number" 
                                id="additive-value-${index}" 
                                value="${rawAdditiveValue}" 
                                data-component-category="${group.category}"
                                data-component-group="${group.groupName}"
                                data-stat-name="${statName}"
                                data-field-type="additive"
                                onblur="handleAdditiveBlurInPanel(this)"
                                onkeydown="if(event.key === 'Enter') { handleAdditiveBlurInPanel(this); this.blur(); }"
                                style="width: 80px; 
                                       background: rgba(76, 175, 80, 0.1); 
                                       border: 1px solid #4CAF50; 
                                       color: #4CAF50; 
                                       padding: 2px 5px; 
                                       border-radius: 3px;
                                       margin-left: 5px;
                                       transition: all 0.2s;"
                                step="any"
                            />
                        </div>`;
                }
                
                if (group.statType === 'multiplicative' || group.statType === 'both') {
                    // Use raw multiplicative value for display, not the scaled value
                    const rawMultiplicativeValue = group.rawMultiplicativeValue !== undefined ? group.rawMultiplicativeValue : 1.0;
                    tooltipContent += `
                        <div style="margin-bottom: 5px;">
                            <span style="color: #FFD700; font-size: 12px;">Multiplicative Value:</span>
                            <input type="text" 
                                id="multiplicative-value-${index}" 
                                value="${rawMultiplicativeValue === 1.0 ? '-' : rawMultiplicativeValue}" 
                                data-component-category="${group.category}"
                                data-component-group="${group.groupName}"
                                data-stat-name="${statName}"
                                data-field-type="multiplicative"
                                onfocus="if(this.value === '-') this.value = ''"
                                onblur="handleMultiplicativeBlurInPanel(this)"
                                onkeydown="if(event.key === 'Enter') { handleMultiplicativeBlurInPanel(this); this.blur(); }"
                                style="width: 80px; 
                                       background: rgba(255, 215, 0, 0.1); 
                                       border: 1px solid #FFD700; 
                                       color: #FFD700; 
                                       padding: 2px 5px; 
                                       border-radius: 3px;
                                       margin-left: 5px;
                                       transition: all 0.2s;
                                       text-align: center;"
                            />
                        </div>`;
                }
            } else {
                // Legacy display for components without stat type
                tooltipContent += `
                    <div style="color: ${isZeroValue ? '#666' : contribColor}; font-weight: bold;">
                        ${group.count > 1 ? 
                            `Each: ×${group.multiplier.toFixed(2)} (${percentSign}${percentageChange}%)<br/>
                             Total: ${percentSign}${totalPercentage}% (${group.count} × ${percentageChange}%)`
                            : 
                            `Multiplier: ×${group.multiplier.toFixed(2)} (${percentSign}${percentageChange}%)`
                        }
                    </div>`;
            }
            
            tooltipContent += `
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        tooltipContent += `<div style="color: #BBB; padding: 10px;">No components affecting this stat</div>`;
    }
    
    tooltipContent += `
            </div>
    `;
    
    // Add combined formula if multiple components affect the stat
    if (modificationDetails.combinedFormula) {
        tooltipContent += `
            <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: white; border-bottom: 1px solid #444; padding-bottom: 5px;">Combined Formula</h4>
                <div style="font-family: monospace; color: #BBB; background-color: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px; line-height: 1.8;">
                    ${modificationDetails.combinedFormula}
                </div>
            </div>
        `;
    }
    
    // Add individual component calculation formulas for each grouped component type
    if (modificationDetails.groupedComponents && modificationDetails.groupedComponents.length > 0) {
        tooltipContent += `
            <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: white; border-bottom: 1px solid #444; padding-bottom: 5px;">Component Calculation Formulas</h4>
        `;
        
        // Add a formula section for each grouped component type
        modificationDetails.groupedComponents.forEach(group => {
            tooltipContent += `
                <div style="margin-bottom: 15px;">
                    <div style="color: #FFD700; font-weight: bold; margin-bottom: 5px; padding-top: 10px; border-top: 1px dashed #333;">
                        ${group.name}${group.count > 1 ? ` (×${group.count} installed)` : ''}
                    </div>
                    <div style="font-family: monospace; color: #BBB; white-space: pre-line; background-color: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px;">
                        ${group.formula}
                    </div>
                </div>
            `;
        });
        
        tooltipContent += `
            </div>
        `;
    }
    
    tooltipContent += `</div>`;
    
    // Set content
    tooltip.innerHTML = tooltipContent;
    
    // Store ship and stat info on the panel for refresh logic
    tooltip.setAttribute('data-ship-id', shipId);
    tooltip.setAttribute('data-ship-identifier', shipIdentifier);
    tooltip.setAttribute('data-config-index', configIndex);
    tooltip.setAttribute('data-stat-name', statName);
    
    // Add event listener to close button
    setTimeout(() => {
        const closeButton = document.getElementById('close-stat-panel');
        if (closeButton) {
            closeButton.addEventListener('click', hideStatModificationTooltip);
        }
    }, 0);
    
    // Show the panel with animation
    tooltip.style.display = 'block';
    setTimeout(() => {
        tooltip.style.transform = 'translateX(0)';
    }, 10);
}

// Hide stat modification panel with animation
function hideStatModificationTooltip() {
    const panel = document.getElementById('stat-modification-tooltip');
    if (panel) {
        // Add animation to slide out
        panel.style.transform = 'translateX(400px)';
        
        // After animation completes, hide the panel
        setTimeout(() => {
            panel.style.display = 'none';
            // Clear the visible components tracking when panel is closed
            currentPanelVisibleComponents.clear();
        }, 300);
    }
}

// Update component base value when field loses focus or Enter is pressed
window.updateComponentBaseValueAuto = function updateComponentBaseValueAuto(input) {
    const newValue = parseFloat(input.value);
    const category = input.getAttribute('data-component-category');
    const componentType = input.getAttribute('data-component-type');
    const componentName = input.getAttribute('data-component-name');
    const groupName = input.getAttribute('data-component-group');
    const statName = input.getAttribute('data-stat-name');
    const index = input.getAttribute('data-index');
    
    // Update the base value in componentAttributes
    if (componentAttributes[category] && 
        componentAttributes[category][groupName] &&
        componentAttributes[category][groupName][statName]) {
        
        componentAttributes[category][groupName][statName].baseValue = newValue;
        
        // Mark as modified
        if (!window.modifiedComponentAttributes) {
            window.modifiedComponentAttributes = {};
        }
        if (!window.modifiedComponentAttributes[category]) {
            window.modifiedComponentAttributes[category] = {};
        }
        if (!window.modifiedComponentAttributes[category][groupName]) {
            window.modifiedComponentAttributes[category][groupName] = {};
        }
        if (!window.modifiedComponentAttributes[category][groupName][statName]) {
            window.modifiedComponentAttributes[category][groupName][statName] = {};
        }
        window.modifiedComponentAttributes[category][groupName][statName].baseValue = newValue;
        
        // Recalculate all values for this stat
        if (window.recalculateComponentValues) {
            window.recalculateComponentValues(category, groupName, statName);
        }
        
        // Update the table immediately for real-time feedback
        const panel = document.getElementById('stat-modification-tooltip');
        const shipId = panel && panel.style.display === 'block' ? 
            parseInt(panel.getAttribute('data-ship-id')) : null;
            
        if (shipId && window.updateShipStats) {
            // Use the direct update function for immediate feedback
            window.updateShipStats(shipId);
        } else if (window.debouncedTableUpdate) {
            // Fallback to efficient update with no delay
            window.debouncedTableUpdate({ delay: 0 });
        } else {
            // Last resort fallback
            updateComparisonTable();
        }
        
        // Mark configuration as changed
        if (typeof markConfigurationAsChanged === 'function') {
            markConfigurationAsChanged();
        }
        
        // Show save indicator
        const saveIndicator = document.getElementById(`save-indicator-${index}`);
        if (saveIndicator) {
            // Flash the input border green
            input.style.borderColor = '#4CAF50';
            input.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
            
            // Show the checkmark
            saveIndicator.style.opacity = '1';
            
            // Reset after a delay
            setTimeout(() => {
                input.style.borderColor = '#555';
                input.style.backgroundColor = 'rgba(255,255,255,0.1)';
                saveIndicator.style.opacity = '0';
            }, 1500);
        }
        
        // Refresh the stat panel immediately with freshly calculated values
        const statPanel = document.getElementById('stat-modification-tooltip');
        if (statPanel && statPanel.style.display === 'block') {
            refreshStatPanel();
        }
        
        // If the components panel is open, refresh it
        if (window.refreshComponentsPanel) {
            window.refreshComponentsPanel();
        }
        
        // Removed the old delayed refresh logic - now using immediate refresh in the previous code block
    }
}

// Update component base value from stat panel (kept for backwards compatibility)
window.updateComponentBaseValue = function updateComponentBaseValue(button, index) {
    const input = document.getElementById(`base-value-${index}`);
    if (!input) return;
    
    const newValue = parseFloat(input.value);
    const category = input.getAttribute('data-component-category');
    const componentType = input.getAttribute('data-component-type');
    const componentName = input.getAttribute('data-component-name');
    const groupName = input.getAttribute('data-component-group');
    const statName = input.getAttribute('data-stat-name');
    
    // Update the base value in componentAttributes
    if (componentAttributes[category] && 
        componentAttributes[category][groupName] &&
        componentAttributes[category][groupName][statName]) {
        
        componentAttributes[category][groupName][statName].baseValue = newValue;
        
        // Mark as modified
        if (!window.modifiedComponentAttributes) {
            window.modifiedComponentAttributes = {};
        }
        if (!window.modifiedComponentAttributes[category]) {
            window.modifiedComponentAttributes[category] = {};
        }
        if (!window.modifiedComponentAttributes[category][groupName]) {
            window.modifiedComponentAttributes[category][groupName] = {};
        }
        if (!window.modifiedComponentAttributes[category][groupName][statName]) {
            window.modifiedComponentAttributes[category][groupName][statName] = {};
        }
        window.modifiedComponentAttributes[category][groupName][statName].baseValue = newValue;
        
        // Recalculate all values for this stat
        if (window.recalculateComponentValues) {
            window.recalculateComponentValues(category, groupName, statName);
        }
        
        // Update the table immediately for real-time feedback
        const panel = document.getElementById('stat-modification-tooltip');
        const shipId = panel && panel.style.display === 'block' ? 
            parseInt(panel.getAttribute('data-ship-id')) : null;
            
        if (shipId && window.updateShipStats) {
            // Use the direct update function for immediate feedback
            window.updateShipStats(shipId);
        } else if (window.debouncedTableUpdate) {
            // Fallback to efficient update with no delay
            window.debouncedTableUpdate({ delay: 0 });
        } else {
            // Last resort fallback
            updateComparisonTable();
        }
        
        // Mark configuration as changed
        if (typeof markConfigurationAsChanged === 'function') {
            markConfigurationAsChanged();
        }
        
        // Update the button to show it was saved
        button.textContent = 'Saved!';
        button.style.background = '#4CAF50';
        setTimeout(() => {
            button.textContent = 'Update';
            button.style.background = '#3d8bf8';
        }, 1500);
        
        // If the components panel is open, refresh it
        if (window.refreshComponentsPanel) {
            window.refreshComponentsPanel();
        }
    }
}

// Toggle stat type in the stat details panel
window.toggleStatTypeInPanel = function toggleStatTypeInPanel(button) {
    const category = button.getAttribute('data-component-category');
    const groupName = button.getAttribute('data-component-group');
    const statName = button.getAttribute('data-stat-name');
    const currentType = button.getAttribute('data-current-type');
    
    if (!componentAttributes[category] || 
        !componentAttributes[category][groupName]) {
        return;
    }
    
    // Ensure the stat exists
    if (!componentAttributes[category][groupName][statName]) {
        componentAttributes[category][groupName][statName] = {
            baseValue: 0,
            values: {},
            type: window.DEFAULT_STAT_TYPE || 'multiplicative',
            additiveValue: 0,
            multiplicativeValue: 1.0
        };
    }
    
    const stat = componentAttributes[category][groupName][statName];
    
    // Initialize with type system if needed
    if (window.StatTypeSystem) {
        window.StatTypeSystem.initializeStatWithType(stat);
    }
    
    // Cycle through types
    const newType = window.StatTypeSystem.cycleStatType(stat);
    
    // Update baseValue based on new type
    if (newType === window.STAT_TYPES.ADDITIVE || newType === 'additive') {
        stat.baseValue = stat.additiveValue || 0;
    } else if (newType === window.STAT_TYPES.MULTIPLICATIVE || newType === 'multiplicative') {
        stat.baseValue = stat.multiplicativeValue !== undefined ? stat.multiplicativeValue : 1.0;
    } else if (newType === window.STAT_TYPES.BOTH || newType === 'both') {
        stat.baseValue = stat.additiveValue || 0;
    }
    
    // Mark as modified
    if (!window.modifiedComponentAttributes) {
        window.modifiedComponentAttributes = {};
    }
    if (!window.modifiedComponentAttributes[category]) {
        window.modifiedComponentAttributes[category] = {};
    }
    if (!window.modifiedComponentAttributes[category][groupName]) {
        window.modifiedComponentAttributes[category][groupName] = {};
    }
    if (!window.modifiedComponentAttributes[category][groupName][statName]) {
        window.modifiedComponentAttributes[category][groupName][statName] = {
            type: stat.type,
            additiveValue: stat.additiveValue,
            multiplicativeValue: stat.multiplicativeValue,
            baseValue: stat.baseValue
        };
    } else {
        window.modifiedComponentAttributes[category][groupName][statName].type = stat.type;
        window.modifiedComponentAttributes[category][groupName][statName].additiveValue = stat.additiveValue;
        window.modifiedComponentAttributes[category][groupName][statName].multiplicativeValue = stat.multiplicativeValue;
        window.modifiedComponentAttributes[category][groupName][statName].baseValue = stat.baseValue;
    }
    
    // Recalculate values
    if (window.recalculateComponentValues) {
        window.recalculateComponentValues(category, groupName, statName);
    }
    
    // Get the current ship ID from the panel
    const panel = document.getElementById('stat-modification-tooltip');
    const shipId = panel ? parseInt(panel.getAttribute('data-ship-id')) : null;
    
    // Update the table immediately for real-time feedback
    if (shipId && window.updateShipStats) {
        // Use the direct update function for immediate feedback
        window.updateShipStats(shipId);
    } else if (window.debouncedTableUpdate) {
        // Fallback to efficient update with no delay
        window.debouncedTableUpdate({ shipId: shipId, delay: 0 });
    } else {
        // Last resort fallback
    if (window.debouncedTableUpdate) {
            window.debouncedTableUpdate({ delay: 0 });
        }
    }
    
    // Mark configuration as changed
    if (typeof markConfigurationAsChanged === 'function') {
        markConfigurationAsChanged();
    }
    
    // Refresh components panel if open
    if (window.refreshComponentsPanel) {
        window.refreshComponentsPanel();
    }
    
    // Refresh the stat panel
    refreshStatPanel();
}

// Handle multiplicative blur in panel (shows dash for 1.0)
window.handleMultiplicativeBlurInPanel = function handleMultiplicativeBlurInPanel(input) {
    const value = parseFloat(input.value);
    if (isNaN(value) || value === 1.0) {
        input.value = '-';
        updateComponentStatValueInPanel(input, 1.0);
    } else {
        input.value = value;
        updateComponentStatValueInPanel(input, value);
    }
}

// Handle additive blur in panel (immediate feedback)
window.handleAdditiveBlurInPanel = function handleAdditiveBlurInPanel(input) {
    const value = parseFloat(input.value);
    if (isNaN(value)) {
        input.value = '0';
        updateComponentStatValueInPanel(input, 0);
    } else {
        input.value = value;
        updateComponentStatValueInPanel(input, value);
    }
}

// Update component stat value (additive or multiplicative) from stat panel
window.updateComponentStatValueInPanel = function updateComponentStatValueInPanel(input, overrideValue) {
    const newValue = overrideValue !== undefined ? overrideValue : parseFloat(input.value);
    const category = input.getAttribute('data-component-category');
    const groupName = input.getAttribute('data-component-group');
    const statName = input.getAttribute('data-stat-name');
    const fieldType = input.getAttribute('data-field-type');
    
    console.log(`[updateComponentStatValueInPanel] Updating ${statName} in ${category}/${groupName}, fieldType: ${fieldType}, newValue: ${newValue}`);
    
    if (!componentAttributes[category] || 
        !componentAttributes[category][groupName]) {
        console.error(`Component attributes not found for ${category}/${groupName}`);
        return;
    }
    
    // Ensure the stat exists and is initialized with type system
    if (!componentAttributes[category][groupName][statName]) {
        componentAttributes[category][groupName][statName] = {
            baseValue: 0,
            values: {},
            type: window.DEFAULT_STAT_TYPE || 'multiplicative',
            additiveValue: 0,
            multiplicativeValue: 1.0
        };
    }
    
    const stat = componentAttributes[category][groupName][statName];
    
    // Initialize with type system if needed
    if (window.StatTypeSystem) {
        window.StatTypeSystem.initializeStatWithType(stat);
    }
    
    // Update the appropriate value
    if (fieldType === 'additive') {
        stat.additiveValue = newValue;
        // Update baseValue for additive types to match
        if (stat.type === window.STAT_TYPES.ADDITIVE || stat.type === 'additive') {
            stat.baseValue = newValue;
        }
    } else if (fieldType === 'multiplicative') {
        stat.multiplicativeValue = newValue;
        // Update baseValue for multiplicative types to match
        if (stat.type === window.STAT_TYPES.MULTIPLICATIVE || stat.type === 'multiplicative') {
            stat.baseValue = newValue;
        }
    }
    
    // For BOTH type, baseValue should be the additive value
    if (stat.type === window.STAT_TYPES.BOTH || stat.type === 'both') {
        stat.baseValue = stat.additiveValue || 0;
    }
    
    // Mark as modified
    if (!window.modifiedComponentAttributes) {
        window.modifiedComponentAttributes = {};
    }
    if (!window.modifiedComponentAttributes[category]) {
        window.modifiedComponentAttributes[category] = {};
    }
    if (!window.modifiedComponentAttributes[category][groupName]) {
        window.modifiedComponentAttributes[category][groupName] = {};
    }
    if (!window.modifiedComponentAttributes[category][groupName][statName]) {
        window.modifiedComponentAttributes[category][groupName][statName] = {
            type: stat.type,
            additiveValue: stat.additiveValue,
            multiplicativeValue: stat.multiplicativeValue,
            baseValue: stat.baseValue
        };
    } else {
        // Update the modified attributes
        window.modifiedComponentAttributes[category][groupName][statName].type = stat.type;
        window.modifiedComponentAttributes[category][groupName][statName].additiveValue = stat.additiveValue;
        window.modifiedComponentAttributes[category][groupName][statName].multiplicativeValue = stat.multiplicativeValue;
        window.modifiedComponentAttributes[category][groupName][statName].baseValue = stat.baseValue;
    }
    
    // Recalculate values
    if (window.recalculateComponentValues) {
        window.recalculateComponentValues(category, groupName, statName);
    }
    
    // Get the current ship ID from the panel
    const panel = document.getElementById('stat-modification-tooltip');
    const shipId = panel ? parseInt(panel.getAttribute('data-ship-id')) : null;
    
    // Update the table immediately for this specific ship
    console.log(`[updateComponentStatValueInPanel] About to update table for ship ${shipId}`);
    
    if (shipId && window.updateShipStats) {
        console.log(`[updateComponentStatValueInPanel] Calling updateShipStats directly`);
        // Use the direct update function for immediate feedback
        window.updateShipStats(shipId);
    } else if (window.debouncedTableUpdate) {
        console.log(`[updateComponentStatValueInPanel] Falling back to debouncedTableUpdate with 0 delay`);
        // Fallback to debounced update if direct update not available
        window.debouncedTableUpdate({ shipId: shipId, delay: 0 });
    } else {
        console.log(`[updateComponentStatValueInPanel] Falling back to full table update`);
        // Last resort fallback
        updateComparisonTable();
    }
    
    // Refresh the stat panel immediately after table update
    refreshStatPanel();
    
    // Mark configuration as changed
    if (typeof markConfigurationAsChanged === 'function') {
        markConfigurationAsChanged();
    }
    
    // Visual feedback
    input.style.borderColor = '#4CAF50';
    setTimeout(() => {
        input.style.borderColor = fieldType === 'additive' ? '#4CAF50' : '#FFD700';
    }, 1500);
    
    // Refresh components panel if open
    if (window.refreshComponentsPanel) {
        window.refreshComponentsPanel();
    }
    
    // Update other ships that use the same component immediately
    console.log(`[updateComponentStatValueInPanel] Updating other ships with ${category}/${groupName} components`);
    
    // Find all other ships that might use this component
    addedShips.forEach(ship => {
            if (ship.id !== shipId) {
                const shipIdentifier = getShipIdentifier(ship);
                const activeIndex = activeConfigIndices[ship.id] || 0;
                
                if (shipConfigurations[shipIdentifier] && 
                    shipConfigurations[shipIdentifier][activeIndex]) {
                    
                    const config = shipConfigurations[shipIdentifier][activeIndex];
                    
                    // Check if this ship uses components from the same category/group
                    let usesComponent = false;
                    if (config.components && config.components[category]) {
                        // Check if any component in this category might be affected
                        Object.entries(config.components[category]).forEach(([type, componentIds]) => {
                            // Handle both array and single component ID formats
                            const idArray = Array.isArray(componentIds) ? componentIds : [componentIds];
                            
                            idArray.forEach(componentId => {
                                if (componentId) {
                                    const component = findComponentById(componentId);
                                    if (component) {
                                        const componentGroup = getComponentGroupName(component, category);
                                        if (componentGroup === groupName) {
                                            usesComponent = true;
                                        }
                                    }
                                }
                            });
                        });
                    }
                    
                    if (usesComponent) {
                        console.log(`[updateComponentStatValueInPanel] Ship ${ship.id} uses ${category}/${groupName}, updating...`);
                        if (window.updateShipStats) {
                            window.updateShipStats(ship.id);
                        }
                    }
                }
            }
        });
}

// Helper function to refresh the stat details panel
function refreshStatPanel() {
    const panel = document.getElementById('stat-modification-tooltip');
    if (panel && panel.style.display === 'block') {
        const scrollTop = panel.scrollTop;
        const shipId = parseInt(panel.getAttribute('data-ship-id'));
        const statName = panel.getAttribute('data-stat-name');
        const shipIdentifier = panel.getAttribute('data-ship-identifier');
        const configIndex = parseInt(panel.getAttribute('data-config-index'));
        
        // Find the ship and recalculate fresh values
        const ship = addedShips.find(s => s.id === shipId);
        if (!ship) return;
        
        const activeConfigIndex = activeConfigIndices[shipId] || 0;
        if (shipConfigurations[shipIdentifier] && shipConfigurations[shipIdentifier][activeConfigIndex]) {
            const activeConfig = shipConfigurations[shipIdentifier][activeConfigIndex];
            const modifiedStats = calculateModifiedStats(ship, activeConfig.components);
            
            // Update all table cells with fresh data attributes
            const targetCells = document.querySelectorAll(`td[data-ship-id="${shipId}"][data-stat-name="${statName}"]`);
            targetCells.forEach(cell => {
                if (cell.hasAttribute('data-modified-value')) {
                    // Update both base and modified value attributes
                    cell.setAttribute('data-base-value', ship[statName]);
                    cell.setAttribute('data-modified-value', modifiedStats[statName]);
                    cell.setAttribute('data-ship-identifier', shipIdentifier);
                    cell.setAttribute('data-config-index', activeConfigIndex);
                }
            });
            
            // Find the target element for the stat tooltip
            const targetElement = document.querySelector(`td[data-ship-id="${shipId}"][data-stat-name="${statName}"][data-modified-value]`);
            
            if (targetElement) {
                // Create a mock event object with the necessary attributes
                const mockEvent = {
                    target: targetElement
                };
                
                // Re-show the panel with fresh data
                showStatModificationTooltip(mockEvent);
                
                // Restore scroll position
                setTimeout(() => {
                    panel.scrollTop = scrollTop;
                }, 10);
            }
        }
    }
}

// Helper function to calculate drone scaled value based on drone port tier only
function calculateDroneScaledValue(baseValue, className, tierName, category) {
    // Only use tier scaling formula (no class scaling)
    const tierFormula = tierScalingFormulas[category] || tierScalingFormulas["Ship Component"] || "base * (1 + (tierIndex - 1) * 0.05)";
    
    // Convert tier name to index
    const tierIndex = parseInt(tierName.replace('T', '')) || 1;
    
    // Apply tier scaling only
    let finalValue;
    try {
        finalValue = evaluateFormula(tierFormula, {
            base: baseValue,
            tierIndex: tierIndex
        });
    } catch (e) {
        finalValue = baseValue;
    }
    
    return finalValue;
}

// Helper function to find drone port in ship configuration
function findDronePortForShip(config) {
    if (!config || !config.components || !config.components["Ship Component"]) {
        console.log("findDronePortForShip: No ship components found");
        return null;
    }
    
    // Look through all ship components for a drone port
    const shipComponents = config.components["Ship Component"];
    console.log("findDronePortForShip: Checking ship components:", Object.keys(shipComponents));
    
    for (const componentType in shipComponents) {
        // Handle both array and single component ID formats
        const componentIds = Array.isArray(shipComponents[componentType]) 
            ? shipComponents[componentType] 
            : [shipComponents[componentType]];
        
        for (const componentId of componentIds) {
            if (!componentId) continue;
            
            const component = findComponentById(componentId);
            if (!component) continue;
            
            // Check if this is a drone port
            const componentName = component.properties?.["Ship Component"] || componentType || '';
            console.log(`Checking component: ${componentName}`);
            
            if (componentName.toLowerCase().includes('drone') && 
                (componentName.toLowerCase().includes('port') || componentName.toLowerCase().includes('bay'))) {
                // Found a drone port, return its class and tier
                console.log(`Found drone port: ${componentName} with class ${component.properties?.Class} and tier ${component.properties?.Tier}`);
                return {
                    className: component.properties?.Class || '',
                    tierName: component.properties?.Tier || ''
                };
            }
        }
    }
    
    console.log("findDronePortForShip: No drone port found");
    return null;
}

// Calculate details of how a stat was modified
function calculateStatModificationDetails(ship, config, statName, isPanelRefresh, captureInitialComponents) {
    const result = {
        components: [],
        combinedFormula: null,
        multipliers: [] // Track multipliers separately for multiplicative calculation
    };
    
    // If no components installed, return empty result
    if (!config || !config.components) {
        return result;
    }
    
    // Calculate drone scaling information
    const droneScalingInfo = window.DroneScaling ? 
        window.DroneScaling.calculateDroneScaling(config) : 
        null;
    
    // Process each component category
    // Remove excessive logging to prevent performance issues
    Object.keys(config.components).forEach(category => {
        const components = config.components[category];
        
        // Process each component in this category
        Object.keys(components).forEach(componentType => {
            // Handle both array and single component ID formats
            const componentIds = Array.isArray(components[componentType]) 
                ? components[componentType] 
                : [components[componentType]];
            
            // Process each component ID in the array (multiple instances)
            componentIds.forEach(componentId => {
                if (!componentId) return; // Skip if no component installed
                
                if (category === "Drones") {
                    console.log(`[Stat Details] Processing drone componentId: ${componentId}`);
                }
                
                // Find the component
                const component = findComponentById(componentId);
                if (!component) {
                    console.log(`[Stat Details] Component not found for ID: ${componentId}`);
                    return; // Skip if component not found
                }
                
                if (category === "Drones") {
                    console.log(`[Stat Details] Found drone component:`, component);
                }
                
                // Get component properties
                const properties = component.properties || {};
                let className = properties.Class || '';
                let tierName = properties.Tier || '';
                
                // Special handling for drones - they don't have class/tier but should inherit from drone port
                if (category === "Drones" && (!className || !tierName)) {
                    // Find drone port in ship components to get its class/tier
                    const dronePort = findDronePortForShip(config);
                    if (dronePort) {
                        className = dronePort.className;
                        tierName = dronePort.tierName;
                        console.log(`[Stat Details] Drone ${component.name} inheriting class ${className} and tier ${tierName} from drone port`);
                    } else {
                        console.log(`[Stat Details] No drone port found for drone ${component.name}`);
                    }
                }
                
                // Skip if no class or tier (except for Drones which are handled above)
                if (!className || !tierName) return;
                
                // Look up the component group name based on category
                let groupName = '';
                switch (category) {
                    case "Ship Component":
                        groupName = properties["Ship Component"] || '';
                        break;
                    case "Ship Module":
                        groupName = properties["Ship Modules"] || '';
                        break;
                    case "Ship Weapons":
                        groupName = properties["Damage Type"] || '';
                        break;
                    case "Countermeasures":
                        groupName = properties["Countermeasure"] || '';
                        break;
                    case "Missiles":
                        groupName = properties["Damage Type"] || '';
                        break;
                    case "Drones":
                        groupName = properties["Drone Type"] || '';
                        break;
                }
                
                // Skip if group name not found
                if (!groupName) return;
                
                // Look up the component attributes
                if (componentAttributes[category] && 
                    componentAttributes[category][groupName]) {
                    
                    const attributes = componentAttributes[category][groupName];
                    
                    // Handle drones differently
                    if (category === "Drones") {
                        // For drones, we need to navigate to the specific drone and use "base" key
                        const droneName = properties["Drones"] || component.name;
                        console.log(`[Stat Details] Processing drone: ${droneName}, group: ${groupName}`);
                        console.log(`[Stat Details] Attributes structure:`, attributes);
                        console.log(`[Stat Details] Looking for stat: ${statName}`);
                        
                        if (attributes.subGroups) {
                            console.log(`[Stat Details] subGroups available:`, Object.keys(attributes.subGroups));
                            if (attributes.subGroups[droneName]) {
                                console.log(`[Stat Details] Found drone ${droneName} in subGroups`);
                                console.log(`[Stat Details] Stats available for drone:`, Object.keys(attributes.subGroups[droneName]));
                            }
                        }
                        
                        // Check if the stat exists at the top level (not in subGroups)
                        console.log(`[Stat Details] Checking for stat ${statName} in attributes:`, attributes[statName]);
                        if (attributes[statName] && attributes[statName].values && 
                            attributes[statName].values["base"] !== undefined) {
                            
                            const baseValue = attributes[statName].values["base"];
                            const baseStatValue = attributes[statName].baseValue || 0;
                            console.log(`[Stat Details] Found drone stat ${statName} with base value: ${baseValue}`);
                            
                            // Apply scaling based on drone port class/tier if available
                            let finalValue = baseValue;
                            if (className && tierName) {
                                finalValue = calculateDroneScaledValue(baseValue, className, tierName, category);
                            }
                            
                            // Apply drone port capacity scaling if available
                            if (droneScalingInfo && window.DroneScaling) {
                                const originalValue = finalValue;
                                finalValue = window.DroneScaling.applyDroneScaling(finalValue, componentId, droneScalingInfo);
                                
                                // Get scaling details for formula
                                const scalingDetails = window.DroneScaling.getDroneScalingDetails(componentId, droneScalingInfo);
                                
                                // Always show components in the stat panel, even with 0 values
                                // Create formula description for this drone with scaling info
                                let componentFormula = `Base Value: ${baseStatValue}\n` +
                                    `Drone Base: ${baseValue}\n` +
                                    (className && tierName ? 
                                        `Tier Scaled by Drone Port (${className} ${tierName}): ${originalValue.toFixed(2)}\n` : 
                                        `No Tier scaling applied\n`);
                                
                                if (scalingDetails) {
                                    componentFormula += `\nDrone Port Capacity Scaling:\n`;
                                    componentFormula += `  Drone Count: ${scalingDetails.droneCount} drones\n`;
                                    componentFormula += `  Total Port Capacity: ${scalingDetails.totalCapacity}\n`;
                                    if (scalingDetails.dronePorts && scalingDetails.dronePorts.length > 0) {
                                        componentFormula += `  Drone Ports:\n`;
                                        scalingDetails.dronePorts.forEach(port => {
                                            componentFormula += `    - ${port.name} (${port.class}): ${port.capacity} slots\n`;
                                        });
                                    }
                                    componentFormula += `  Final Value: ${finalValue.toFixed(2)} (${originalValue.toFixed(2)} × ${scalingDetails.droneCount})`;
                                }
                                
                                // Create component object
                                const componentObj = {
                                    name: droneName || component.name || `${componentType} Drone`,
                                    category: category,
                                    type: componentType || groupName || 'Drone', // Ensure type is always defined
                                    groupName: groupName,
                                    class: className || 'N/A',
                                    tier: tierName || 'N/A',
                                    value: finalValue,
                                    multiplier: finalValue, // Store as multiplier for multiplicative calculation
                                    baseValue: baseStatValue,
                                    formula: componentFormula,
                                    droneCount: scalingDetails ? scalingDetails.droneCount : 1,
                                    componentId: componentId // Keep track of the ID
                                };
                                
                                // Create unique key for this component
                                const componentKey = `${componentObj.category}-${componentObj.groupName}-${componentObj.class}-${componentObj.tier}`;
                                
                                // Only add if: value is not 0, OR it was previously visible (panel refresh)
                                if (finalValue !== 0 || currentPanelVisibleComponents.has(componentKey)) {
                                    result.components.push(componentObj);
                                    result.multipliers.push(finalValue);
                                    // Only track this component as visible on initial load
                                    if (captureInitialComponents && finalValue !== 0) {
                                        currentPanelVisibleComponents.add(componentKey);
                                    }
                                }
                            } else {
                                // No drone scaling available - still show the component
                                const componentFormula = `Base Value: ${baseStatValue}\n` +
                                    `Drone Base: ${baseValue}\n` +
                                    (className && tierName ? 
                                        `Scaled by Drone Port (${className} ${tierName}): ${finalValue.toFixed(2)}` : 
                                        `No Drone Port scaling applied`);
                                
                                // Create component object
                                const componentObj = {
                                    name: droneName || component.name || `${componentType} Drone`,
                                    category: category,
                                    type: componentType || groupName || 'Drone', // Ensure type is always defined
                                    groupName: groupName,
                                    class: className || 'N/A',
                                    tier: tierName || 'N/A',
                                    value: finalValue,
                                    multiplier: finalValue, // Store as multiplier for multiplicative calculation
                                    baseValue: baseStatValue,
                                    formula: componentFormula,
                                    componentId: componentId // Keep track of the ID
                                };
                                
                                // Create unique key for this component
                                const componentKey = `${componentObj.category}-${componentObj.groupName}-${componentObj.class}-${componentObj.tier}`;
                                
                                // Only add if: value is not 0, OR it was previously visible (panel refresh)
                                if (finalValue !== 0 || currentPanelVisibleComponents.has(componentKey)) {
                                    result.components.push(componentObj);
                                    result.multipliers.push(finalValue);
                                    // Only track this component as visible on initial load
                                    if (captureInitialComponents && finalValue !== 0) {
                                        currentPanelVisibleComponents.add(componentKey);
                                    }
                                }
                            }
                        }
                    } else if (attributes[statName]) {
                        // Non-drone components use the standard class-tier key
                        const key = `${className}-${tierName}`;
                        
                        // Check if this component actually has a value for this stat
                        if (attributes[statName].values && 
                            attributes[statName].values[key] !== undefined && 
                            attributes[statName].values[key] !== 0) {
                            
                            const baseStatValue = attributes[statName].baseValue || 0;
                            const tierFormula = tierScalingFormulas[category] || "base * (1 + (tierIndex - 1) * 0.05)";
                            const classFormula = classScalingFormulas[category] || "base * pow( pow(1.61803398875 , classIndex+1) / 2.2360679775 , 2 )";
                        
                        // Convert tier name to index and class name to index
                        const tierIndex = parseInt(tierName.replace('T', '')) || 1;
                        const classMap = {"XXS": 1, "XS": 2, "S": 3, "M": 4, "L": 5, "CAP": 6, "CMD": 7, "Class 8": 8, "TTN": 9};
                        const classIndex = classMap[className] || 1;
                        
                        // Initialize stat with type system if needed
                        const stat = window.StatTypeSystem ? 
                            window.StatTypeSystem.initializeStatWithType(attributes[statName]) : 
                            attributes[statName];
                        
                        // Skip if this stat has no actual values defined (default initialization)
                        if (!stat.baseValue && !stat.multiplicativeValue && !stat.additiveValue) {
                            return; // Skip this component - it doesn't modify this stat
                        }
                        
                        // Calculate actual values based on stat type FIRST
                        const scaledValue = attributes[statName].values[key];
                        let multiplierValue = 1.0;
                        let additiveValue = 0;
                        
                        // IMPORTANT: For pure multiplicative stats (like cargo capacity modifiers),
                        // the multiplicative value itself should be scaled by tier/class formulas
                        // to ensure higher tier components provide better bonuses
                        
                        if (stat.type === window.STAT_TYPES.ADDITIVE || stat.type === 'additive') {
                            // For additive stats, use the scaled value
                            additiveValue = scaledValue;
                            multiplierValue = 1.0; // No multiplication for pure additive
                        } else if (stat.type === window.STAT_TYPES.MULTIPLICATIVE || stat.type === 'multiplicative') {
                            additiveValue = 0;
                            // For pure multiplicative stats, we need to check if the scaledValue makes sense
                            // If the base multiplicative value is available, scale the bonus portion instead
                            if (stat.multiplicativeValue !== undefined && stat.multiplicativeValue !== 1.0) {
                                // Extract the bonus portion and scale it
                                const baseBonus = stat.multiplicativeValue - 1.0;
                                const scaledBonus = (scaledValue / stat.baseValue) * baseBonus; // Scale proportionally
                                multiplierValue = 1.0 + scaledBonus;
                            } else {
                                // Fallback to using scaledValue directly
                                multiplierValue = scaledValue;
                            }
                        } else if (stat.type === window.STAT_TYPES.BOTH || stat.type === 'both') {
                            // For 'both' type: both parts get scaled by class/tier formulas
                            // Calculate how much the additive value should be scaled
                            const baseAdditiveValue = stat.additiveValue || 0;
                            if (baseAdditiveValue !== 0 && stat.baseValue) {
                                // Scale the additive part proportionally to how the base value was scaled
                                const scalingFactor = scaledValue / stat.baseValue;
                                additiveValue = baseAdditiveValue * scalingFactor;
                            } else {
                                additiveValue = baseAdditiveValue;
                            }
                            // Multiplicative part for 'both' type should scale the BONUS, not the full multiplier
                            // This prevents exponential scaling from creating unrealistic multipliers
                            const baseMultiplicativeValue = stat.multiplicativeValue !== undefined ? stat.multiplicativeValue : 1.0;
                            if (baseMultiplicativeValue !== 1.0) {
                                // Extract the bonus portion (multiplier - 1)
                                const baseBonus = baseMultiplicativeValue - 1.0;
                                
                                // Apply scaling formulas to the BONUS, not the full multiplier
                                let scaledBonus = window.recalculateComponentValues ? 
                                    window.evaluateFormula(classFormula, { base: baseBonus, classIndex: classMap[className] || 1 }) : 
                                    baseBonus;
                                scaledBonus = window.evaluateFormula ? 
                                    window.evaluateFormula(tierFormula, { base: scaledBonus, tierIndex: parseInt(tierName.replace('T', '')) || 1 }) : 
                                    scaledBonus;
                                
                                // Add the scaled bonus back to 1.0 to get the final multiplier
                                multiplierValue = 1.0 + scaledBonus;
                            } else {
                                multiplierValue = baseMultiplicativeValue;
                            }
                        }
                        
                        // Create formula description including stat type info (AFTER values are calculated)
                        let componentFormula = '';
                        if (stat.type) {
                            componentFormula += `Type: ${stat.type.toUpperCase()}\n`;
                            if (stat.type === 'additive' || stat.type === 'both') {
                                componentFormula += `Additive Value: +${stat.additiveValue || 0}\n`;
                            }
                            if (stat.type === 'multiplicative' || stat.type === 'both') {
                                componentFormula += `Multiplicative Value: ×${stat.multiplicativeValue !== undefined ? stat.multiplicativeValue : 1.0}\n`;
                            }
                            componentFormula += '\n';
                        }
                        
                        // Update formula based on stat type
                        if (stat.type === 'multiplicative') {
                            componentFormula += `Base Value: ${stat.multiplicativeValue || 1.0}\n` +
                                            `Class Formula: ${classFormula}\n` +
                                            `  classIndex = ${classIndex} (${className})\n` +
                                            `  base = ${stat.multiplicativeValue || 1.0}\n` +
                                            `Tier Formula: ${tierFormula}\n` +
                                            `  tierIndex = ${tierIndex} (${tierName})\n` +
                                            `  base = class-scaled value\n` +
                                            `Scaled Multiplier = ×${multiplierValue.toFixed(2)}`;
                        } else if (stat.type === 'additive') {
                            componentFormula += `Base Value: ${stat.additiveValue || 0}\n` +
                                            `Class Formula: ${classFormula}\n` +
                                            `  classIndex = ${classIndex} (${className})\n` +
                                            `  base = ${stat.additiveValue || 0}\n` +
                                            `Tier Formula: ${tierFormula}\n` +
                                            `  tierIndex = ${tierIndex} (${tierName})\n` +
                                            `  base = class-scaled value\n` +
                                            `Scaled Additive Value = +${additiveValue.toFixed(2)}`;
                        } else if (stat.type === 'both') {
                            const baseMultValue = stat.multiplicativeValue || 1.0;
                            const baseBonus = baseMultValue - 1.0;
                            const scaledBonus = multiplierValue - 1.0;
                            componentFormula += `Additive Base: ${stat.additiveValue || 0}\n` +
                                            `Multiplicative Base: ${baseMultValue}\n` +
                                            `\nAdditive scaling (class/tier formulas apply):\n` +
                                            `  Scaled Additive = +${additiveValue.toFixed(2)}\n` +
                                            `\nMultiplicative scaling (bonus portion scaled):\n` +
                                            `  Base Bonus: ${(baseBonus * 100).toFixed(0)}%\n` +
                                            `  Scaled Bonus: ${(scaledBonus * 100).toFixed(0)}%\n` +
                                            `  Final Multiplier = ×${multiplierValue.toFixed(2)}`;
                        } else {
                            // Fallback for unknown types
                            componentFormula += `Base Value: ${baseStatValue}\n` +
                                            `Class Formula: ${classFormula}\n` +
                                            `  classIndex = ${classIndex} (${className})\n` +
                                            `  base = ${baseStatValue}\n` +
                                            `Tier Formula: ${tierFormula}\n` +
                                            `  tierIndex = ${tierIndex} (${tierName})\n` +
                                            `  base = class-scaled value\n` +
                                            `  Calculated Value = ${attributes[statName].values[key].toFixed(2)}`;
                        }
                        
                        // Ensure we have a consistent name for grouping
                        const componentDisplayName = component.name || properties["Ship Modules"] || properties["Ship Component"] || 
                                                   `${componentType} ${className} ${tierName}`;
                        
                        // Create component object
                        const componentObj = {
                            name: componentDisplayName,
                            category: category,
                            type: componentType || groupName, // Use groupName as fallback for type
                            groupName: groupName,
                            class: className,
                            tier: tierName,
                            value: multiplierValue,
                            multiplier: multiplierValue, // Store as multiplier for multiplicative calculation
                            additive: additiveValue, // Store additive value
                            statType: stat.type || 'multiplicative', // Store stat type
                            baseValue: baseStatValue,
                            formula: componentFormula,
                            componentId: componentId, // Keep track of the ID for debugging
                            // Store raw values for the UI to display
                            rawAdditiveValue: stat.additiveValue || 0,
                            rawMultiplicativeValue: stat.multiplicativeValue !== undefined ? stat.multiplicativeValue : 1.0
                        };
                        
                        // Create unique key for this component
                        const componentKey = `${componentObj.category}-${componentObj.groupName}-${componentObj.class}-${componentObj.tier}`;
                        
                        // Check if component has any effect
                        // IMPORTANT: Filter out components with 0 multiplier as they indicate missing/invalid data
                        const hasEffect = (stat.type === 'additive' && additiveValue !== 0) ||
                                        (stat.type === 'multiplicative' && multiplierValue !== 1.0 && multiplierValue !== 0) ||
                                        (stat.type === 'both' && (additiveValue !== 0 || (multiplierValue !== 1.0 && multiplierValue !== 0)));
                        
                        // Only add if: component has effect, OR it was previously visible (panel refresh)
                        if (hasEffect || currentPanelVisibleComponents.has(componentKey)) {
                            result.components.push(componentObj);
                            result.multipliers.push(multiplierValue);
                            // Only track this component as visible on initial load
                            if (captureInitialComponents && hasEffect) {
                                currentPanelVisibleComponents.add(componentKey);
                            }
                        }
                        }
                    }
                }
            });
        });
    });
    
    // Group identical components together
    const groupedComponents = {};
    
    // Debug: Log components before grouping
    if (result.components.length > 5) {
        console.log(`[Grouping Debug] Processing ${result.components.length} components for stat ${statName}`);
    }
    
    result.components.forEach(comp => {
        // Create a more robust grouping key that doesn't rely on potentially undefined values
        // Use name as a fallback if type is undefined
        const componentIdentifier = comp.groupName || comp.type || comp.name || 'unknown';
        const key = `${comp.category}-${componentIdentifier}-${comp.class}-${comp.tier}`;
        
        if (!groupedComponents[key]) {
            groupedComponents[key] = {
                ...comp,
                count: 1,
                totalMultiplier: comp.multiplier
            };
        } else {
            groupedComponents[key].count++;
            // Ensure we keep consistent naming even if one instance has better data
            if (!groupedComponents[key].type && comp.type) {
                groupedComponents[key].type = comp.type;
            }
            if (!groupedComponents[key].name && comp.name) {
                groupedComponents[key].name = comp.name;
            }
            // Ensure stat type info is preserved
            if (!groupedComponents[key].statType && comp.statType) {
                groupedComponents[key].statType = comp.statType;
            }
            if (groupedComponents[key].additive === undefined && comp.additive !== undefined) {
                groupedComponents[key].additive = comp.additive;
            }
            // Preserve raw values for UI display
            if (groupedComponents[key].rawAdditiveValue === undefined && comp.rawAdditiveValue !== undefined) {
                groupedComponents[key].rawAdditiveValue = comp.rawAdditiveValue;
            }
            if (groupedComponents[key].rawMultiplicativeValue === undefined && comp.rawMultiplicativeValue !== undefined) {
                groupedComponents[key].rawMultiplicativeValue = comp.rawMultiplicativeValue;
            }
        }
    });
    
    // Convert back to array for display
    result.groupedComponents = Object.values(groupedComponents);
    
    // Debug: Log grouping results
    if (result.components.length > 5) {
        console.log(`[Grouping Debug] Grouped ${result.components.length} components into ${result.groupedComponents.length} groups`);
        result.groupedComponents.forEach(group => {
            if (group.count > 1) {
                console.log(`[Grouping Debug] ${group.name} x${group.count}`);
            }
        });
    }
    
    // Create the combined formula showing how all components contribute to the final value
    if (result.components.length > 0) {
        const baseValue = ship[statName];
        
        // Calculate total additive and multiplicative effects
        let totalAdditive = 0;
        let totalMultiplicativeEffect = 0;
        
        // Group components by stat type for clearer formula display
        const additiveComponents = [];
        const multiplicativeComponents = [];
        const bothComponents = [];
        
        result.groupedComponents.forEach(group => {
            if (group.statType === 'additive') {
                additiveComponents.push(group);
                totalAdditive += group.count * (group.additive || 0);
            } else if (group.statType === 'multiplicative') {
                multiplicativeComponents.push(group);
                totalMultiplicativeEffect += group.count * (group.multiplier - 1);
            } else if (group.statType === 'both') {
                bothComponents.push(group);
                totalAdditive += group.count * (group.additive || 0);
                totalMultiplicativeEffect += group.count * (group.multiplier - 1);
            }
        });
        
        const finalMultiplier = 1 + totalMultiplicativeEffect;
        const modifiedValue = (baseValue + totalAdditive) * finalMultiplier;
        
        // Build the combined formula
        let combinedFormula = `${modifiedValue.toFixed(2)} = `;
        
        // Show the calculation
        if (totalAdditive !== 0 && finalMultiplier !== 1.0) {
            combinedFormula += `(${baseValue} + ${totalAdditive}) × ${finalMultiplier.toFixed(3)}`;
        } else if (totalAdditive !== 0) {
            combinedFormula += `${baseValue} + ${totalAdditive}`;
        } else if (finalMultiplier !== 1.0) {
            combinedFormula += `${baseValue} × ${finalMultiplier.toFixed(3)}`;
        } else {
            combinedFormula += `${baseValue}`;
        }
        
        // Add detailed breakdown
        combinedFormula += '\n\nBreakdown:';
        
        if (additiveComponents.length > 0) {
            combinedFormula += '\nAdditive effects:';
            additiveComponents.forEach(group => {
                if (group.count > 1) {
                    combinedFormula += `\n  ${group.count}× ${group.name}: +${group.count * (group.additive || 0)}`;
                } else {
                    combinedFormula += `\n  ${group.name}: +${group.additive || 0}`;
                }
            });
        }
        
        if (multiplicativeComponents.length > 0) {
            combinedFormula += '\nMultiplicative effects:';
            multiplicativeComponents.forEach(group => {
                if (group.count > 1) {
                    combinedFormula += `\n  ${group.count}× ${group.name}: ×${group.multiplier} (${((group.count * (group.multiplier - 1)) * 100).toFixed(1)}%)`;
                } else {
                    combinedFormula += `\n  ${group.name}: ×${group.multiplier} (${((group.multiplier - 1) * 100).toFixed(1)}%)`;
                }
            });
        }
        
        if (bothComponents.length > 0) {
            combinedFormula += '\nBoth (additive + multiplicative) effects:';
            bothComponents.forEach(group => {
                if (group.count > 1) {
                    combinedFormula += `\n  ${group.count}× ${group.name}: +${group.count * (group.additive || 0)}, ×${group.multiplier}`;
                } else {
                    combinedFormula += `\n  ${group.name}: +${group.additive || 0}, ×${group.multiplier}`;
                }
            });
        }
        
        result.combinedFormula = combinedFormula;
        result.finalMultiplier = finalMultiplier;
        result.totalAdditive = totalAdditive;
    }
    
    return result;
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp); 

// Initialize the top scrollbar and sync with the table
function initTopScrollbar() {
    // Setup will be completed when the comparison table is updated
    // The actual initialization happens in updateTopScrollbar
}

// Get the relevant stats to display in the table
function getRelevantStats() {
    if (ships.length === 0) return [];
    
    // Get all stat keys from the first ship, excluding certain fields
    const excludedStats = ['Ship Name', 'Manufacturer', 'Spec', 'Class', 'id'];
    
    // Get base stats from ships
    let baseStats = Object.keys(ships[0]).filter(key => !excludedStats.includes(key));
    
    // Critical fix: ensure customAttributeOrder matches actual ship stats
    if (customAttributeOrder.length !== baseStats.length) {
        // Rebuild customAttributeOrder to match actual ship stats
        const existingValidStats = customAttributeOrder.filter(stat => baseStats.includes(stat));
        const missingStats = baseStats.filter(stat => !customAttributeOrder.includes(stat));
        
        // Create a new properly ordered array
        customAttributeOrder = [...existingValidStats, ...missingStats];
    }
    
    // Update the customAttributeOrder if needed
    if (customAttributeOrder.length === 0) {
        // Initialize with base stats first
        const baseOrder = [...statsFromCsv];
        
        // Then add custom attributes at the end
        customAttributeOrder = [...baseOrder, ...customAttributes];
    } else {
        // Make sure all stats are included in the order
        // First ensure all stats from CSV are in the order (if they're missing)
        statsFromCsv.forEach(stat => {
            if (!customAttributeOrder.includes(stat)) {
                // Find the position of the last CSV stat in the order
                const lastCsvStatIdx = findLastIndexInArray(
                    customAttributeOrder, 
                    item => statsFromCsv.includes(item)
                );
                
                if (lastCsvStatIdx >= 0) {
                    // Insert after the last CSV stat
                    customAttributeOrder.splice(lastCsvStatIdx + 1, 0, stat);
                } else {
                    // If no CSV stats in order yet, add to beginning
                    customAttributeOrder.unshift(stat);
                }
            }
        });
        
        // Then ensure all custom attributes are in the order (at the end)
        customAttributes.forEach(attr => {
            if (!customAttributeOrder.includes(attr)) {
                customAttributeOrder.push(attr);
            }
        });
    }
    
    // Final cleanup to ensure we never return corrupted arrays
    const cleanedArray = customAttributeOrder.filter(item => item !== undefined && item !== null && item !== '');
    
    if (cleanedArray.length !== customAttributeOrder.length) {
        customAttributeOrder = cleanedArray;
    }
    
    return cleanedArray;
}

// Helper function to find the last index of an element matching a predicate
function findLastIndexInArray(array, predicate) {
    for (let i = array.length - 1; i >= 0; i--) {
        if (predicate(array[i])) {
            return i;
        }
    }
    return -1;
}

// Helper function to refresh any open panels after attribute changes
function refreshOpenPanels() {
    // If the component attributes panel is open, update it
    const panel = document.getElementById('attributes-panel');
    if (panel && panel.classList.contains('open')) {
        if (currentCategory && currentComponentGroup) {
            populateAttributesEditor(currentCategory, currentComponentGroup);
        }
    }
    
    // If the components panel is open, refresh it
    const componentsPanel = document.getElementById('components-panel');
    if (componentsPanel && componentsPanel.classList.contains('open')) {
        const componentsContainer = document.getElementById('components-container');
        if (componentsContainer) {
            const shipId = parseInt(componentsContainer.getAttribute('data-ship-id'));
            const configIndex = parseInt(componentsContainer.getAttribute('data-config-index'));
            const shipIdentifier = componentsContainer.getAttribute('data-ship-identifier');
            
            if (!isNaN(shipId) && !isNaN(configIndex)) {
                openComponentsPanel(shipId, configIndex, shipIdentifier);
            }
        }
    }
}

// Function to update the ship count display
function updateShipCount() {
    const shipCountElement = document.getElementById('ship-count');
    if (shipCountElement) {
        const count = addedShips.length;
        const shipText = count === 1 ? 'SHIP' : 'SHIPS';
        shipCountElement.textContent = `(${count} ${shipText})`;
    }
}

// Initialize drag and drop functionality for ship columns
function initDragAndDrop() {
    const shipHeaders = document.querySelectorAll('.ship-header');
    const headerRow = document.querySelector('#ship-comparison-table thead tr:first-child');
    const subHeaderRow = document.querySelector('#ship-comparison-table thead tr:last-child');
    const rows = document.querySelectorAll('#ship-comparison-table tbody tr');
    
    let draggedShipId = null;
    let draggedHeader = null;
    let draggedShipIndex = -1;
    
    shipHeaders.forEach(header => {
        const headerContent = header.querySelector('.ship-column-header');
        if (!headerContent) return;
        
        // Make the entire header draggable (headerContent)
        headerContent.style.position = 'relative';
        
        // Add a visual drag handle at the top
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '≡'; // Three horizontal lines icon
        dragHandle.style.position = 'relative';
        dragHandle.style.margin = '0 auto 8px auto';
        dragHandle.style.fontSize = '16px';
        dragHandle.style.color = '#666';
        dragHandle.style.cursor = 'grab';
        dragHandle.style.width = '40px';
        dragHandle.style.height = '20px';
        dragHandle.style.display = 'flex';
        dragHandle.style.alignItems = 'center';
        dragHandle.style.justifyContent = 'center';
        dragHandle.style.zIndex = '5';
        dragHandle.style.userSelect = 'none';
        dragHandle.title = 'Drag to reorder';
        
        // Add the drag handle to the top of the header content
        headerContent.insertBefore(dragHandle, headerContent.firstChild);
        
        // Start dragging from the header content, but not from interactive elements
        headerContent.addEventListener('mousedown', function(e) {
            // Start dragging only if the drag handle was clicked or the header area outside any controls
            const isHandle = e.target === dragHandle;
            const isInteractive = 
                e.target.tagName === 'BUTTON' || 
                e.target.tagName === 'SELECT' || 
                e.target.tagName === 'OPTION' ||
                e.target.closest('button') || 
                e.target.closest('select');
            
            // Return early if clicked on a control, unless it's the drag handle
            if (!isHandle && isInteractive) {
                return;
            }
            
            e.preventDefault();
            
            // Get the ship ID
            draggedShipId = parseInt(header.getAttribute('data-ship-id'));
            draggedHeader = header;
            
            // Find the index of the ship in the addedShips array
            draggedShipIndex = addedShips.findIndex(ship => ship.id === draggedShipId);
            
            // Add dragging class for styling
            header.classList.add('dragging');
            
            // Update drag handle styling during drag
            const dragHandleEl = header.querySelector('.drag-handle');
            if (dragHandleEl) {
                dragHandleEl.style.color = '#aaa';
                dragHandleEl.style.cursor = 'grabbing';
            }
            
            // Store the starting position
            const startX = e.clientX;
            const startLeft = header.offsetLeft;
            
            // Create move handler
            const moveHandler = function(moveEvent) {
                const deltaX = moveEvent.clientX - startX;
                const newLeft = startLeft + deltaX;
                
                // Update draggedHeader position
                draggedHeader.style.position = 'absolute';
                draggedHeader.style.zIndex = '1000';
                draggedHeader.style.left = `${newLeft}px`;
                
                // Find the potential drop target
                const dropTarget = findDropTarget(moveEvent.clientX);
                
                // Highlight potential drop location
                highlightDropTarget(dropTarget);
            };
            
            // Create up handler
            const upHandler = function(upEvent) {
                // Clean up
                document.removeEventListener('mousemove', moveHandler);
                document.removeEventListener('mouseup', upHandler);
                
                // Reset styles
                header.classList.remove('dragging');
                header.style.position = '';
                header.style.zIndex = '';
                header.style.left = '';
                
                // Reset drag handle styles
                const dragHandleEl = header.querySelector('.drag-handle');
                if (dragHandleEl) {
                    dragHandleEl.style.color = '#666';
                    dragHandleEl.style.cursor = 'grab';
                }
                
                // Remove any highlights
                document.querySelectorAll('.drag-placeholder').forEach(el => {
                    el.classList.remove('drag-placeholder');
                });
                
                // Get the drop target
                const dropTarget = findDropTarget(upEvent.clientX);
                
                // If we have a valid drop target and it's different from the source
                if (dropTarget !== null && dropTarget !== draggedShipIndex) {
                    // Move the ship in the addedShips array
                    moveShipToNewPosition(draggedShipIndex, dropTarget);
                    
                    // Update the table
                    updateComparisonTable();
                }
                
                // Reset drag state
                draggedShipId = null;
                draggedHeader = null;
                draggedShipIndex = -1;
            };
            
            // Add mouse move and up handlers
            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', upHandler);
        });
    });
    
    // Find which ship column the cursor is over
    function findDropTarget(clientX) {
        for (let i = 0; i < shipHeaders.length; i++) {
            const header = shipHeaders[i];
            const headerRect = header.getBoundingClientRect();
            
            // Skip the dragged header
            if (header === draggedHeader) continue;
            
            // Check if cursor is over this header
            if (clientX >= headerRect.left && clientX <= headerRect.right) {
                // Get the ship ID
                const shipId = parseInt(header.getAttribute('data-ship-id'));
                
                // Find the index in addedShips
                return addedShips.findIndex(ship => ship.id === shipId);
            }
        }
        
        return null;
    }
    
    // Highlight potential drop location
    function highlightDropTarget(targetIndex) {
        // Remove existing highlights
        document.querySelectorAll('.drag-placeholder').forEach(el => {
            el.classList.remove('drag-placeholder');
        });
        
        // If we have a valid target
        if (targetIndex !== null && targetIndex !== -1) {
            const targetShipId = addedShips[targetIndex].id;
            const targetHeader = document.querySelector(`.ship-header[data-ship-id="${targetShipId}"]`);
            
            // Highlight the target
            if (targetHeader) {
                targetHeader.classList.add('drag-placeholder');
            }
        }
    }
    
    // Move a ship from one position to another
    function moveShipToNewPosition(fromIndex, toIndex) {
        // Get the ship to move
        const ship = addedShips[fromIndex];
        
        // Remove from current position
        addedShips.splice(fromIndex, 1);
        
        // Insert at new position
        addedShips.splice(toIndex, 0, ship);
    }
}

// Change the ship in the comparison table
function changeShipInComparison(shipId, newShip) {
    // Find the ship in the addedShips array
    const index = addedShips.findIndex(ship => ship.id === shipId);
    if (index === -1) return;
    
    // Get the old ship for comparison
    const oldShip = addedShips[index];
    
            console.log(`Changing ship at index ${index} (ID: ${shipId}) from ${getShipDisplayName(oldShip)} to ${getShipDisplayName(newShip)}`);
    
    // Get identifiers for both ships
    const oldShipIdentifier = getShipIdentifier(oldShip);
    const newShipIdentifier = getShipIdentifier(newShip);
    
    console.log(`Old ship identifier: ${oldShipIdentifier}`);
    console.log(`New ship identifier: ${newShipIdentifier}`);
    
    // Save the current config index for this ship ID
    const currentConfigIndex = activeConfigIndices[shipId] || 0;
    
    // Create a new ship with the same ID (to maintain position in the comparison)
    const updatedShip = { ...newShip, id: shipId };
    
    // Replace the ship in the array
    addedShips[index] = updatedShip;
    
    // Check if we already have configurations for the new ship type
    if (!shipConfigurations[newShipIdentifier] || !Array.isArray(shipConfigurations[newShipIdentifier]) || 
        shipConfigurations[newShipIdentifier].length === 0) {
        // If not, create a default configuration for this new ship type
        console.log(`Creating default configuration for new ship type: ${newShipIdentifier}`);
        
        shipConfigurations[newShipIdentifier] = [{
            name: 'Default',
            components: {
                "Ship Component": {},
                "Ship Module": {},
                "Ship Weapons": {},
                "Countermeasures": {},
                "Missiles": {},
                "Drones": {}
            }
        }];
        
        // Set active config to 0 (Default)
        activeConfigIndices[shipId] = 0;
    } else {
        // Use existing configurations for this ship type
        console.log(`Found ${shipConfigurations[newShipIdentifier].length} existing configurations for ship type: ${newShipIdentifier}`);
        
        // Set the active config index to either the previous one (if valid) or to 0
        if (currentConfigIndex < shipConfigurations[newShipIdentifier].length) {
            activeConfigIndices[shipId] = currentConfigIndex;
        } else {
            activeConfigIndices[shipId] = 0;
        }
    }
    
    // Update the comparison table
    updateComparisonTable();
}

// Update the selected configuration for a ship
function updateSelectedConfiguration(shipId, configIndex) {
    // Find the ship
    const shipIndex = addedShips.findIndex(ship => ship.id === shipId);
    if (shipIndex === -1) {
        console.error(`Ship with ID ${shipId} not found when updating selected configuration`);
        return;
    }
    
    // Make sure the configIndex is valid
    if (configIndex >= 0 && configIndex < shipConfigurations[shipId].length) {
        console.log(`Updating selected configuration for ship ${shipId} to index ${configIndex}`);
        
        // Store the selected config index in both places for compatibility
        selectedConfigs[shipId] = configIndex;
        activeConfigIndices[shipId] = configIndex;
        
        // Update the dropdown value
        const configDropdown = document.querySelector(`.config-dropdown[data-ship-id="${shipId}"]`);
        if (configDropdown) {
            configDropdown.value = configIndex;
            console.log(`Updated dropdown for ship ${shipId} to show config index ${configIndex}`);
        } else {
            console.warn(`Config dropdown for ship ${shipId} not found`);
        }
        
        // Update the comparison table - this will reflect the new configuration
        updateComparisonTable();
        
        // Do NOT open the components panel here. Only update the panel if it's already open.
        // If the components panel is open for this ship, update it
        const componentsContainer = document.getElementById('components-container');
        if (componentsContainer && 
            parseInt(componentsContainer.getAttribute('data-ship-id')) === shipId &&
            document.getElementById('components-panel').classList.contains('open')) {
            console.log(`Components panel is open for ship ${shipId}, updating to config ${configIndex}`);
            openComponentsPanel(shipId, configIndex);
        }
    } else {
        console.error(`Invalid config index ${configIndex} for ship ${shipId} (max: ${shipConfigurations[shipId].length - 1})`);
    }
}

// Remove a ship from the comparison
function removeShipFromComparison(shipId) {
    // Find the ship in the addedShips array
    const ship = addedShips.find(s => s.id === shipId);
    if (!ship) {
        console.error(`Ship with ID ${shipId} not found in removeShipFromComparison`);
        return;
    }
    
    // Get the ship identifier
    const shipIdentifier = getShipIdentifier(ship);
    
    console.log(`Removing ship ${getShipDisplayName(ship)} (${shipIdentifier}) with ID ${shipId} from comparison`);
    console.log(`Configuration data for ship type ${shipIdentifier} is being kept for future use`);
    
    // Remove from addedShips array
    addedShips = addedShips.filter(ship => ship.id !== shipId);
    
    // Clean up the activeConfigIndices for this ship
    delete activeConfigIndices[shipId];
    
    // Update the comparison table
    updateComparisonTable();
    
    // Close the components panel if it's open for this ship
    const componentsContainer = document.getElementById('components-container');
    if (parseInt(componentsContainer.getAttribute('data-ship-id')) === shipId) {
        closeComponentsPanel();
    }
}

// Load individual ship JSON files
function loadSeparatedShipJSON(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    console.log(`Loading ${files.length} ship JSON file(s)...`);
    
    let loadedCount = 0;
    const loadPromises = Array.from(files).map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const shipData = JSON.parse(e.target.result);
                    
                    // Extract ship info from the data
                    if (shipData.ship) {
                        // Add to master ship list if not already present
                        const existingIndex = ships.findIndex(s => 
                            s['Ship Name'] === shipData.ship['Ship Name'] && 
                            s.Manufacturer === shipData.ship.Manufacturer
                        );
                        
                        if (existingIndex === -1) {
                            // Add new ship
                            ships.push(shipData.ship);
                            console.log(`Added new ship: ${shipData.ship['Ship Name']}`);
                        } else {
                            // Update existing ship
                            ships[existingIndex] = shipData.ship;
                            console.log(`Updated existing ship: ${shipData.ship['Ship Name']}`);
                        }
                        
                        // Load configurations if present
                        if (shipData.configurations && shipData.shipIdentifier) {
                            shipConfigurations[shipData.shipIdentifier] = shipData.configurations;
                            console.log(`Loaded ${shipData.configurations.length} configurations for ${shipData.shipIdentifier}`);
                        }
                        
                        loadedCount++;
                    }
                    
                    resolve();
                } catch (error) {
                    console.error(`Error parsing JSON from ${file.name}:`, error);
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    });
    
    // Wait for all files to load
    Promise.all(loadPromises).then(() => {
        console.log(`Successfully loaded ${loadedCount} ship(s)`);
        
        // Update the comparison table if ships are displayed
        if (addedShips.length > 0) {
            updateComparisonTable();
        }
        
        alert(`Successfully loaded ${loadedCount} ship(s)!`);
    }).catch(error => {
        console.error('Error loading ship JSON files:', error);
        alert('Error loading some ship files. Check console for details.');
    });
}

// Add all ships of the same class as the first ship
function addAllShipsOfSameClass() {
    if (ships.length === 0) {
        alert('Please load ship data first.');
        return;
    }
    
    if (addedShips.length === 0) {
        alert('Please add at least one ship to the comparison first.');
        return;
    }
    
    // Get the class of the first ship
    const firstShipClass = addedShips[0].Class;
    const className = getClassNameFromNumber(firstShipClass);
    
    console.log(`Adding all ${className} class ships...`);
    
    // Find all ships with the same class
    const sameClassShips = ships.filter(ship => ship.Class === firstShipClass);
    
    // Add ships that aren't already in the comparison
    let addedCount = 0;
    sameClassShips.forEach(ship => {
        // Check if this ship is already added (by ship name and manufacturer)
        const alreadyAdded = addedShips.some(addedShip => 
            addedShip['Ship Name'] === ship['Ship Name'] && 
            addedShip.Manufacturer === ship.Manufacturer
        );
        
        if (!alreadyAdded) {
            // Create a unique ID for this ship
            const shipId = nextShipId++;
            
            // Clone the ship object and add the ID
            const shipWithId = { ...ship, id: shipId };
            
            // Get the ship identifier
            const shipIdentifier = getShipIdentifier(shipWithId);
            console.log(`Adding ${className} ship ${ship['Ship Name']} with ID ${shipId} and identifier ${shipIdentifier}`);
            
            // Add to the addedShips array
            addedShips.push(shipWithId);
            
            // Initialize configuration for this ship if it doesn't exist
            if (!shipConfigurations[shipIdentifier] || !Array.isArray(shipConfigurations[shipIdentifier])) {
                shipConfigurations[shipIdentifier] = [{
                    name: 'Default',
                    components: {
                        "Ship Component": {},
                        "Ship Module": {},
                        "Ship Weapons": {},
                        "Countermeasures": {},
                        "Missiles": {},
                        "Drones": {}
                    }
                }];
                
                // Initialize the active config index
                activeConfigIndices[shipId] = 0;
            } else {
                // Set active config index to 0 for this new ship instance
                activeConfigIndices[shipId] = 0;
            }
            
            addedCount++;
        }
    });
    
    console.log(`Added ${addedCount} ${className} ships to comparison`);
    
    // Update the comparison table
    updateComparisonTable();
}

// Add all ships to the comparison table
function addAllShips() {
    if (ships.length === 0) {
        alert('Please load ship data first.');
        return;
    }
    
    // Clear existing ships
    addedShips = [];
    nextShipId = 1;
    
    // Add all ships
    ships.forEach(ship => {
        // Create a unique ID for this ship
        const shipId = nextShipId++;
        
        // Clone the ship object and add the ID
        const shipWithId = { ...ship, id: shipId };
        
        // Get the ship identifier
        const shipIdentifier = getShipIdentifier(shipWithId);
        console.log(`Adding ship ${ship['Ship Name']} with ID ${shipId} and identifier ${shipIdentifier}`);
        
        // Add to the addedShips array
        addedShips.push(shipWithId);
        
        // Initialize configuration for this ship if it doesn't exist
        if (!shipConfigurations[shipIdentifier] || !Array.isArray(shipConfigurations[shipIdentifier])) {
            shipConfigurations[shipIdentifier] = [{
                name: 'Default',
                components: {
                    "Ship Component": {},
                    "Ship Module": {},
                    "Ship Weapons": {},
                    "Countermeasures": {},
                    "Missiles": {},
                    "Drones": {}
                }
            }];
            
            // Initialize the active config index
            activeConfigIndices[shipId] = 0;
        } else {
            // Set active config index to 0 for this new ship instance
            activeConfigIndices[shipId] = 0;
        }
    });
    
    // Update the comparison table
    updateComparisonTable();
}

// Add the next 5 ships after the first ship in comparison
function addNext5Ships() {
    if (ships.length === 0) {
        alert('Please load ship data first.');
        return;
    }
    
    if (addedShips.length === 0) {
        alert('Please add at least one ship to the comparison first.');
        return;
    }
    
    // Get the first ship in the comparison
    const firstShip = addedShips[0];
    
    // Find the index of this ship in the master ships array
    const firstShipIndex = ships.findIndex(s => 
        s['Ship Name'] === firstShip['Ship Name'] && 
        s.Manufacturer === firstShip.Manufacturer
    );
    
    if (firstShipIndex === -1) {
        alert('Could not find the first ship in the master list.');
        return;
    }
    
    // Calculate how many ships to add (up to 5)
    const startIndex = firstShipIndex + 1;
    const endIndex = Math.min(startIndex + 5, ships.length);
    
    if (startIndex >= ships.length) {
        alert('No more ships to add after the first ship.');
        return;
    }
    
    // Add the next 5 ships (or fewer if less than 5 remain)
    for (let i = startIndex; i < endIndex; i++) {
        const ship = ships[i];
        
        // Create a unique ID for this ship
        const shipId = nextShipId++;
        
        // Clone the ship object and add the ID
        const shipWithId = { ...ship, id: shipId };
        
        // Get the ship identifier
        const shipIdentifier = getShipIdentifier(shipWithId);
        console.log(`Adding ship ${ship['Ship Name']} with ID ${shipId} and identifier ${shipIdentifier}`);
        
        // Add to the addedShips array
        addedShips.push(shipWithId);
        
        // Initialize configuration for this ship if it doesn't exist
        if (!shipConfigurations[shipIdentifier] || !Array.isArray(shipConfigurations[shipIdentifier])) {
            shipConfigurations[shipIdentifier] = [{
                name: 'Default',
                components: {
                    "Ship Component": {},
                    "Ship Module": {},
                    "Ship Weapons": {},
                    "Countermeasures": {},
                    "Missiles": {},
                    "Drones": {}
                }
            }];
            
            // Initialize the active config index
            activeConfigIndices[shipId] = 0;
        } else {
            // Set active config index to 0 for this new ship instance
            activeConfigIndices[shipId] = 0;
        }
    }
    
    // Update the comparison table
    updateComparisonTable();
}

// Add remaining ships after the first ship in comparison
function addRemainingShips() {
    if (ships.length === 0) {
        alert('Please load ship data first.');
        return;
    }
    
    if (addedShips.length === 0) {
        alert('Please add at least one ship to the comparison first.');
        return;
    }
    
    // Get the first ship in the comparison
    const firstShip = addedShips[0];
    
    // Find the index of this ship in the master ships array
    const firstShipIndex = ships.findIndex(s => 
        s['Ship Name'] === firstShip['Ship Name'] && 
        s.Manufacturer === firstShip.Manufacturer
    );
    
    if (firstShipIndex === -1) {
        alert('Could not find the first ship in the master list.');
        return;
    }
    
    // Add all ships after the first ship
    for (let i = firstShipIndex + 1; i < ships.length; i++) {
        const ship = ships[i];
        
        // Create a unique ID for this ship
        const shipId = nextShipId++;
        
        // Clone the ship object and add the ID
        const shipWithId = { ...ship, id: shipId };
        
        // Get the ship identifier
        const shipIdentifier = getShipIdentifier(shipWithId);
        console.log(`Adding ship ${ship['Ship Name']} with ID ${shipId} and identifier ${shipIdentifier}`);
        
        // Add to the addedShips array
        addedShips.push(shipWithId);
        
        // Initialize configuration for this ship if it doesn't exist
        if (!shipConfigurations[shipIdentifier] || !Array.isArray(shipConfigurations[shipIdentifier])) {
            shipConfigurations[shipIdentifier] = [{
                name: 'Default',
                components: {
                    "Ship Component": {},
                    "Ship Module": {},
                    "Ship Weapons": {},
                    "Countermeasures": {},
                    "Missiles": {},
                    "Drones": {}
                }
            }];
            
            // Initialize the active config index
            activeConfigIndices[shipId] = 0;
        } else {
            // Set active config index to 0 for this new ship instance
            activeConfigIndices[shipId] = 0;
        }
    }
    
    // Update the comparison table
    updateComparisonTable();
}

// Function to update a ship's attribute value
function updateShipAttributeValue(shipId, attributeName, newValue) {
    // Find the ship in addedShips
    const shipIndex = addedShips.findIndex(ship => ship.id === shipId);
    if (shipIndex === -1) return;
    
    const ship = addedShips[shipIndex];
    
    // Update the attribute value in the comparison ship
    ship[attributeName] = newValue;
    
    // Mark ship as modified
    const shipIdentifier = getShipIdentifier(ship);
    if (typeof markShipAsModified === 'function') {
        markShipAsModified(shipIdentifier);
    }
    
    // Also update in the master ships array so future instances have the edited value
    const masterShipIndex = ships.findIndex(s => 
        s['Ship Name'] === ship['Ship Name'] && 
        s.Manufacturer === ship.Manufacturer
    );
    
    if (masterShipIndex !== -1) {
        ships[masterShipIndex][attributeName] = newValue;
        console.log(`Updated ${attributeName} to ${newValue} for ship ${ship['Ship Name']} in master list`);
    }
    
    // Update all other instances of the same ship in the comparison table
    addedShips.forEach((otherShip, index) => {
        if (index !== shipIndex && 
            otherShip['Ship Name'] === ship['Ship Name'] && 
            otherShip.Manufacturer === ship.Manufacturer) {
            otherShip[attributeName] = newValue;
            console.log(`Updated ${attributeName} to ${newValue} for duplicate ship instance ID ${otherShip.id}`);
        }
    });
    
    // Update the comparison table
    updateComparisonTable();
}

// Update the top scrollbar width to match the table
function updateTopScrollbar() {
    const tableContainer = document.querySelector('.ship-stats-table-container');
    const topScrollContainer = document.querySelector('.top-scroll-container');
    const topScrollContent = document.querySelector('.top-scroll-content');
    const table = document.getElementById('ship-comparison-table');
    
    if (!tableContainer || !topScrollContainer || !topScrollContent || !table) return;
    
    // Set the width of the top scrollbar content to match the table width
    topScrollContent.style.width = table.offsetWidth + 'px';
    
    // Synchronize scrolling between top scrollbar and table container
    topScrollContainer.onscroll = function() {
        tableContainer.scrollLeft = topScrollContainer.scrollLeft;
    };
    
    tableContainer.onscroll = function() {
        topScrollContainer.scrollLeft = tableContainer.scrollLeft;
    };
}

// Function to remove all ships from the comparison table
function removeAllShips() {
    // Clear the addedShips array
    addedShips = [];
    
    // Note that we're not clearing shipConfigurations to preserve ship-specific configurations
    console.log("Removed all ships from the comparison table but kept all ship configurations");
    
    // Reset next ship ID
    nextShipId = 1;
    
    // Update the comparison table
    updateComparisonTable();
    
    // Close the components panel if it's open
    closeComponentsPanel();
}

// Validate and fix configurations if needed
function validateConfigurations() {
    console.log("Validating configurations...");
    
    // Check that all addedShips have corresponding configurations
    addedShips.forEach(ship => {
        if (!ship || !ship.id) {
            console.warn("Invalid ship object:", ship);
            return;
        }
        
        const shipIdentifier = getShipIdentifier(ship);
        
        if (!shipConfigurations[shipIdentifier]) {
            console.warn(`Missing configuration for ship ${shipIdentifier}, creating default`);
            shipConfigurations[shipIdentifier] = [{
                name: 'Default',
                components: {
                    "Ship Component": {},
                    "Ship Module": {},
                    "Ship Weapons": {},
                    "Countermeasures": {},
                    "Missiles": {},
                    "Drones": {}
                }
            }];
            activeConfigIndices[shipIdentifier] = 0;
        }
        
        // Check that all configurations have proper component structure
        shipConfigurations[shipIdentifier].forEach((config, index) => {
            if (!config.components) {
                console.warn(`Missing components in config ${index} for ship ${shipIdentifier}, fixing`);
                config.components = {
                    "Ship Component": {},
                    "Ship Module": {},
                    "Ship Weapons": {},
                    "Countermeasures": {},
                    "Missiles": {},
                    "Drones": {}
                };
            }
            
            // Ensure all component categories exist
            ["Ship Component", "Ship Module", "Ship Weapons", "Countermeasures", "Missiles", "Drones"].forEach(category => {
                if (!config.components[category]) {
                    console.warn(`Missing ${category} in config ${index} for ship ${shipIdentifier}, fixing`);
                    config.components[category] = {};
                }
            });
        });
        
        // Make sure the selected config exists
        if (activeConfigIndices[shipIdentifier] === undefined || 
            activeConfigIndices[shipIdentifier] >= shipConfigurations[shipIdentifier].length) {
            console.warn(`Invalid active config for ship ${shipIdentifier}, resetting to 0`);
            activeConfigIndices[shipIdentifier] = 0;
        }
    });
    
    console.log("Configuration validation completed");
}

// Function to open the components panel for a specific ship/configuration
// MOVED TO: components-panel.js module

// Function to close the components panel
// MOVED TO: components-panel.js module

// Create component section for the panel
// MOVED TO: components-panel.js module

// Create component slot for the panel
// MOVED TO: components-panel.js module

// Update the stats preview in the components panel
// MOVED TO: components-panel.js module

// Function to duplicate and upgrade a configuration
// MOVED TO: config-upgrade.js module

// Helper function to generate upgraded configuration name
// MOVED TO: config-upgrade.js module

// Helper function to upgrade all components in a configuration
// MOVED TO: config-upgrade.js module

// Helper function to find the upgraded version of a component
// MOVED TO: config-upgrade.js module

// Helper function to get the next tier
// MOVED TO: config-upgrade.js module

// Helper function to get component type from a component object
// MOVED TO: config-upgrade.js module

// Helper function to check if two components are the same type
// MOVED TO: config-upgrade.js module

// Function to add a new custom attribute
function addCustomAttribute(attributeName, defaultValue = 0) {
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

// Function to delete a custom attribute
function deleteCustomAttribute(attributeName) {
    console.log(`Attempting to delete custom attribute: ${attributeName}`);
    
    // Set flag to prevent repair function from interfering
    window.currentlyDeletingAttribute = true;
    
    try {
        // Check if this is actually a base stat from CSV (prevent deleting original stats)
        if (statsFromCsv.includes(attributeName)) {
            alert(`Cannot delete base attribute "${attributeName}". Use "Delete Original Attribute" if needed.`);
            return false;
        }
        
        // Remove from custom attributes list if it's there
        const index = customAttributes.indexOf(attributeName);
        if (index !== -1) {
            customAttributes.splice(index, 1);
            console.log(`Removed ${attributeName} from customAttributes array`);
        } else {
            console.log(`${attributeName} was not in customAttributes array`);
        }
        
        // Remove from attribute order
        const orderIndex = customAttributeOrder.indexOf(attributeName);
        if (orderIndex !== -1) {
            customAttributeOrder.splice(orderIndex, 1);
            console.log(`Removed ${attributeName} from customAttributeOrder`);
        }
        
        // Remove from all ships in the comparison table
        addedShips.forEach(ship => {
            if (ship.hasOwnProperty(attributeName)) {
                delete ship[attributeName];
                console.log(`Removed attribute ${attributeName} from ship ${ship['Ship Name']}`);
            }
        });
        
        // Remove from all ships in the master list
        ships.forEach(ship => {
            if (ship.hasOwnProperty(attributeName)) {
                delete ship[attributeName];
                console.log(`Removed attribute ${attributeName} from master ship ${ship['Ship Name'] || 'Unknown'}`);
            }
        });
        
        // Remove from component attributes system
        Object.keys(componentAttributes).forEach(category => {
            Object.keys(componentAttributes[category]).forEach(groupName => {
                if (componentAttributes[category][groupName][attributeName]) {
                    delete componentAttributes[category][groupName][attributeName];
                    console.log(`Removed attribute ${attributeName} from component ${category}/${groupName}`);
                }
            });
        });
        
        console.log(`Successfully deleted custom attribute: ${attributeName}`);
        console.log(`Final customAttributes array:`, customAttributes);
        console.log(`Final customAttributeOrder array:`, customAttributeOrder);
        
        // Update the comparison table
        updateComparisonTable();
        
        // Refresh any open panels
        refreshOpenPanels();
        
        return true;
        
    } finally {
        // Always clear the flag, even if there was an error
        window.currentlyDeletingAttribute = false;
    }
}

// Function to reorder attributes
function reorderAttributes(fromIndex, toIndex) {
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

// Function to repair mismatches between customAttributes and customAttributeOrder
function repairCustomAttributesArray() {
    // Skip repair if we're currently deleting an attribute
    if (window.currentlyDeletingAttribute) {
        return;
    }
    
    // Special case: If statsFromCsv is empty (CSV had no stat columns), don't rebuild customAttributes
    if (statsFromCsv.length === 0) {
        return;
    }
    
    // Find attributes that are in customAttributeOrder but not in statsFromCsv (these should be custom)
    const actualCustomAttributes = customAttributeOrder.filter(attr => !statsFromCsv.includes(attr));
    
    // Only rebuild if we detected a reasonable number of custom attributes
    // Avoid the case where everything gets marked as custom due to empty statsFromCsv
    if (actualCustomAttributes.length <= customAttributeOrder.length) {
        // Rebuild the customAttributes array
        customAttributes = [...actualCustomAttributes];
    }
}

// Function to initialize attribute order
function initAttributeOrder() {
    // BULLETPROOF RESET: Create completely new array instance
    customAttributeOrder = new Array();
    
    // Robust array building: manually push elements to avoid spread operator
    if (statsFromCsv.length > 0) {
        for (let i = 0; i < statsFromCsv.length; i++) {
            const stat = statsFromCsv[i];
            if (stat && typeof stat === 'string' && stat.trim() !== '') {
                customAttributeOrder.push(stat);
            }
        }
    }
    
    // Add custom attributes manually
    if (customAttributes.length > 0) {
        for (let i = 0; i < customAttributes.length; i++) {
            const attr = customAttributes[i];
            if (attr && typeof attr === 'string' && attr.trim() !== '' && !customAttributeOrder.includes(attr)) {
                customAttributeOrder.push(attr);
            }
        }
    }
    
    // Final validation: ensure no sparse array corruption
    const finalLength = customAttributeOrder.length;
    const actualElements = Object.keys(customAttributeOrder).length;
    const hasCorruption = finalLength !== actualElements;
    
    if (hasCorruption) {
        const cleanElements = [];
        for (let i = 0; i < customAttributeOrder.length; i++) {
            if (customAttributeOrder.hasOwnProperty(i) && customAttributeOrder[i] !== undefined) {
                cleanElements.push(customAttributeOrder[i]);
            }
        }
        customAttributeOrder = cleanElements;
    }
    
    // Repair any mismatches after initialization
    repairCustomAttributesArray();
}

// Handle row drag start
function handleRowDragStart(e) {
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
    
    // Store row information in dataTransfer
    e.dataTransfer.setData('text/plain', e.currentTarget.getAttribute('data-stat-name'));
    e.dataTransfer.effectAllowed = 'move';
    
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
    
    // Set drag effect
    e.dataTransfer.effectAllowed = 'move';
    
    // Set drag data (not actually used, but required for Firefox)
    e.dataTransfer.setData('text/plain', row.getAttribute('data-stat-name'));
    
    // Set the drag image to be the row itself
    e.dataTransfer.setDragImage(row, 0, 0);
    
    // Set global flag
    isDraggingRow = true;
}

// Handle row drag over
function handleRowDragOver(e) {
    // Always check if we have active dragging, indicated by dragging class on any row
    const draggingElem = document.querySelector('.stat-row.dragging');
    if (!draggingElem) {
                return;
            }

    // Always prevent default to allow drop
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
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

// Handle row drop
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

// Handle row drag end
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

// Function to rename a custom attribute
function renameCustomAttribute(oldName, newName) {
    // Check if the attribute exists and is a custom attribute
    if (!customAttributes.includes(oldName)) {
        return false;
    }
    
    // Check if the new name already exists
    if ((statsFromCsv.includes(newName) || customAttributes.includes(newName)) && oldName !== newName) {
        alert(`Attribute "${newName}" already exists.`);
        // Reset the name in the UI
        const statNameText = document.querySelector(`.stat-name-text[data-stat-name="${oldName}"]`);
        if (statNameText) {
            statNameText.textContent = oldName;
        }
        return false;
    }
    
    // If no change, return
    if (oldName === newName) {
        return true;
    }
    
    // Update in custom attributes list
    const index = customAttributes.indexOf(oldName);
    if (index !== -1) {
        customAttributes[index] = newName;
    }
    
    // Update in attribute order
    const orderIndex = customAttributeOrder.indexOf(oldName);
    if (orderIndex !== -1) {
        customAttributeOrder[orderIndex] = newName;
    }
    
    // Update in all ships in the comparison table
    addedShips.forEach(ship => {
        if (ship.hasOwnProperty(oldName)) {
            ship[newName] = ship[oldName];
            delete ship[oldName];
        }
    });
    
    // Update in all ships in the master list
    ships.forEach(ship => {
        if (ship.hasOwnProperty(oldName)) {
            ship[newName] = ship[oldName];
            delete ship[oldName];
        }
    });
    
    // Update in component attributes system
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

// Function to show modal for adding a new attribute
function showAddAttributeModal() {
    console.log("Opening add attribute modal");
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    // Remove all inline styles, use class-based styling for consistency
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    // Remove all inline styles, use class-based styling for consistency
    
    // Create modal header (single row, border below)
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const modalTitle = document.createElement('h3');
    modalTitle.textContent = 'Add New Attribute';
    modalHeader.appendChild(modalTitle);
    
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modalContainer);
    });
    modalHeader.appendChild(closeButton);
    
    // Create attribute name input
    const attributeNameLabel = document.createElement('label');
    attributeNameLabel.textContent = 'Attribute Name:';
    attributeNameLabel.style.marginTop = '20px';
    
    const attributeNameInput = document.createElement('input');
    attributeNameInput.type = 'text';
    attributeNameInput.className = 'attribute-name-input';
    attributeNameInput.placeholder = 'Enter attribute name';
    
    // Create default value input (styled to match config modal)
    const defaultValueLabel = document.createElement('label');
    defaultValueLabel.textContent = 'Default Value:';
    defaultValueLabel.style.marginTop = '16px';
    
    const defaultValueInput = document.createElement('input');
    defaultValueInput.type = 'number';
    defaultValueInput.className = 'default-value-input';
    defaultValueInput.value = '0';
    defaultValueInput.step = 'any';
    
    // Create add button (styled like config modal: blue background, white text)
    const addButton = document.createElement('button');
    addButton.className = 'add-button';
    addButton.textContent = 'Add Attribute';
    addButton.style.backgroundColor = '#3d8bf8';
    addButton.style.color = 'white';
    addButton.style.fontWeight = 'bold';
    addButton.style.fontSize = '16px';
    addButton.style.marginTop = '24px';
    addButton.addEventListener('click', () => {
        const attributeName = attributeNameInput.value.trim();
        const defaultValue = parseFloat(defaultValueInput.value) || 0;
        
        if (!attributeName) {
            alert('Please enter an attribute name.');
            return;
        }
        
        console.log(`Attempting to add attribute: ${attributeName} with value: ${defaultValue}`);
        
        if (addCustomAttribute(attributeName, defaultValue)) {
            document.body.removeChild(modalContainer);
        }
    });
    
    // Add enter key handler
    attributeNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            addButton.click();
        }
    });
    
    // Append elements to modal
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(attributeNameLabel);
    modalContent.appendChild(attributeNameInput);
    modalContent.appendChild(defaultValueLabel);
    modalContent.appendChild(defaultValueInput);
    modalContent.appendChild(addButton);
    modalContainer.appendChild(modalContent);
    
    // Add modal to body
    document.body.appendChild(modalContainer);
    
    // Focus on the input
    setTimeout(() => attributeNameInput.focus(), 100);
}

// Add CSS for row management
function addRowManagementStyles() {
    // Check if styles already exist
    if (document.getElementById('row-management-styles')) {
        return;
    }
    
    // Create style element
    const style = document.createElement('style');
    style.id = 'row-management-styles';
    
    // Add CSS rules
    style.textContent = `
        .stat-row {
            transition: all 0.15s ease;
            position: relative;
            outline: none;
        }
        
        .stat-row.dragging {
            opacity: 0.8;
            background-color: rgba(76, 175, 80, 0.3) !important;
            cursor: grabbing !important;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
            z-index: 1000;
            transform: translateY(-1px) scale(1.01);
            outline: 1px solid rgba(76, 175, 80, 0.5);
        }
        
        .stat-row.drop-above {
            border-top: 3px solid #3d8bf8 !important;
            padding-top: 3px;
            box-shadow: 0 -3px 6px rgba(61, 139, 248, 0.3);
            position: relative;
        }
        
        .stat-row.drop-below {
            border-bottom: 3px solid #3d8bf8 !important;
            padding-bottom: 3px;
            box-shadow: 0 3px 6px rgba(61, 139, 248, 0.3);
            position: relative;
        }
        
        .stat-row.drop-above::after {
            content: '';
            position: absolute;
            top: -3px;
            left: 0;
            right: 0;
            height: 3px;
            background-color: rgba(61, 139, 248, 0.5);
            pointer-events: none;
        }
        
        .stat-row.drop-below::after {
            content: '';
            position: absolute;
            bottom: -3px;
            left: 0;
            right: 0;
            height: 3px;
            background-color: rgba(61, 139, 248, 0.5);
            pointer-events: none;
        }
        
        .drag-handle {
            cursor: grab;
            padding: 4px 8px;
            border-radius: 3px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(100, 100, 100, 0.2);
            transition: all 0.2s;
            user-select: none;
            -webkit-user-select: none;
            width: 32px;
            height: 32px;
        }
        
        .drag-handle:hover {
            background: rgba(100, 100, 100, 0.4);
            transform: scale(1.1);
        }
        
        .drag-handle:active {
            background: rgba(76, 175, 80, 0.5);
            color: white;
            cursor: grabbing;
        }
        
        .custom-attribute {
            color: #4CAF50;
            border-bottom: 1px dashed #4CAF50;
            padding: 0 2px;
        }
        
        .custom-attribute:focus {
            outline: none;
            background-color: rgba(76, 175, 80, 0.1);
            border-bottom: 1px solid #4CAF50;
        }
        
        .original-attribute {
            color: #ffffff;
            padding: 0 2px;
        }
        
        .original-attribute:focus {
            outline: none;
            background-color: rgba(255, 255, 255, 0.1);
            border-bottom: 1px solid #ffffff;
        }
        
        .stat-name-container {
            width: 100%;
            padding: 4px 0;
        }
        
        .stat-name-container:hover {
            background-color: rgba(50, 50, 50, 0.3);
        }
        
        .stat-controls {
            margin-right: 8px;
        }
        
        .add-attribute-row:hover .add-attribute-button {
            background-color: #444;
        }
        
        .editable-cell {
            border-bottom: 1px dashed #888;
            padding: 0 2px;
            cursor: text;
            transition: all 0.2s ease;
        }
        
        .editable-cell:focus {
            outline: none;
            background-color: rgba(255, 255, 255, 0.1);
            border-bottom: 1px solid #fff;
        }
        
        .editable-cell:hover:not(:focus) {
            background-color: rgba(255, 255, 255, 0.05);
            border-bottom-color: #aaa;
        }
    `;
    
    // Add to document head
    document.head.appendChild(style);
}

// Function to rename an original (from CSV) attribute
function renameOriginalAttribute(oldName, newName) {
    console.log(`Attempting to rename original attribute: ${oldName} to ${newName}`);
    
    // Check if the new name already exists among any attributes
    if ((statsFromCsv.includes(newName) && newName !== oldName) || customAttributes.includes(newName)) {
        alert(`Attribute "${newName}" already exists.`);
        // Reset the name in the UI
        const statNameText = document.querySelector(`.stat-name-text[data-stat-name="${oldName}"]`);
        if (statNameText) {
            statNameText.textContent = oldName;
        }
        return false;
    }
    
    // If no change, return
    if (oldName === newName) {
        return true;
    }
    
    // Find the index of the old name in statsFromCsv
    const index = statsFromCsv.indexOf(oldName);
    if (index !== -1) {
        // Update in statsFromCsv list
        statsFromCsv[index] = newName;
        console.log(`Renamed in statsFromCsv: ${oldName} -> ${newName}`);
    }
    
    // Update in attribute order
    const orderIndex = customAttributeOrder.indexOf(oldName);
    if (orderIndex !== -1) {
        customAttributeOrder[orderIndex] = newName;
        console.log(`Renamed in customAttributeOrder: ${oldName} -> ${newName}`);
    }
    
    // Update in all ships in the comparison table
    addedShips.forEach(ship => {
        if (ship.hasOwnProperty(oldName)) {
            ship[newName] = ship[oldName];
            delete ship[oldName];
            console.log(`Renamed attribute in ship ${ship['Ship Name']}: ${oldName} -> ${newName}`);
        }
    });
    
    // Update in all ships in the master list
    ships.forEach(ship => {
        if (ship.hasOwnProperty(oldName)) {
            ship[newName] = ship[oldName];
            delete ship[oldName];
        }
    });
    
    // Update in component attributes system
    Object.keys(componentAttributes).forEach(category => {
        Object.keys(componentAttributes[category]).forEach(groupName => {
            if (componentAttributes[category][groupName][oldName]) {
                componentAttributes[category][groupName][newName] = componentAttributes[category][groupName][oldName];
                delete componentAttributes[category][groupName][oldName];
                console.log(`Renamed attribute in component ${category}/${groupName}: ${oldName} -> ${newName}`);
            }
        });
    });
            
            // Update the comparison table
            updateComparisonTable();
            
    // Refresh any open panels
    refreshOpenPanels();
    
    return true;
}

// Function to delete an original (from CSV) attribute
function deleteOriginalAttribute(attributeName) {
    console.log(`Attempting to delete original attribute: ${attributeName}`);
    
    // Check if this is a standard attribute
    if (!statsFromCsv.includes(attributeName)) {
        console.error(`Attribute "${attributeName}" is not an original stat.`);
        return false;
    }
    
    // Remove from statsFromCsv list
    const index = statsFromCsv.indexOf(attributeName);
    if (index !== -1) {
        statsFromCsv.splice(index, 1);
        console.log(`Removed from statsFromCsv: ${attributeName}`);
    }
    
    // Remove from attribute order
    const orderIndex = customAttributeOrder.indexOf(attributeName);
    if (orderIndex !== -1) {
        customAttributeOrder.splice(orderIndex, 1);
        console.log(`Removed from customAttributeOrder: ${attributeName}`);
    }
    
    // Remove from all ships in the comparison table
    addedShips.forEach(ship => {
        if (ship.hasOwnProperty(attributeName)) {
            delete ship[attributeName];
            console.log(`Removed attribute ${attributeName} from ship ${ship['Ship Name']}`);
        }
    });
    
    // Remove from all ships in the master list
    ships.forEach(ship => {
        if (ship.hasOwnProperty(attributeName)) {
            delete ship[attributeName];
        }
    });
    
    // Remove from component attributes system
    Object.keys(componentAttributes).forEach(category => {
        Object.keys(componentAttributes[category]).forEach(groupName => {
            if (componentAttributes[category][groupName][attributeName]) {
                delete componentAttributes[category][groupName][attributeName];
                console.log(`Removed attribute ${attributeName} from component ${category}/${groupName}`);
            }
        });
    });
    
    // Update the comparison table
    updateComparisonTable();
    
    // Refresh any open panels
    refreshOpenPanels();
    
    return true;
}

// Open the scaling formulas popup panel
// MOVED TO: attributes-panel.js module
// function openScalingFormulasPopup(category) - now in AttributesPanel module

// Close the scaling formulas popup
// MOVED TO: attributes-panel.js module
// function closeScalingFormulasPopup() - now in AttributesPanel module

// Function to show modal for adding a new custom ship
// MOVED TO: custom-ship-management.js module

// Function to create a custom ship
// MOVED TO: custom-ship-management.js module

// Function to get default stat values based on ship class
// MOVED TO: custom-ship-management.js module

// === HELPER FUNCTIONS FOR SHIP DATA ===

// Get unique specs from all ships
// MOVED TO: custom-ship-management.js module

// Get unique manufacturers from all ships
// MOVED TO: custom-ship-management.js module

// Format ship display name as "Manufacturer - Ship Name"
// MOVED TO: custom-ship-management.js module

// === END HELPER FUNCTIONS ===

// Make custom ship management functions available globally for backward compatibility
if (typeof showAddCustomShipModal === 'undefined') {
    window.showAddCustomShipModal = window.CustomShipManagement?.showAddCustomShipModal;
}
if (typeof createCustomShip === 'undefined') {
    window.createCustomShip = window.CustomShipManagement?.createCustomShip;
}
if (typeof getDefaultStatValueForClass === 'undefined') {
    window.getDefaultStatValueForClass = window.CustomShipManagement?.getDefaultStatValueForClass;
}
if (typeof getUniqueSpecs === 'undefined') {
    window.getUniqueSpecs = window.CustomShipManagement?.getUniqueSpecs;
}
if (typeof getUniqueManufacturers === 'undefined') {
    window.getUniqueManufacturers = window.CustomShipManagement?.getUniqueManufacturers;
}
if (typeof getShipDisplayName === 'undefined') {
    window.getShipDisplayName = window.CustomShipManagement?.getShipDisplayName;
}

// Make configuration upgrade functions available globally for backward compatibility
if (typeof duplicateAndUpgradeConfiguration === 'undefined') {
    window.duplicateAndUpgradeConfiguration = window.ConfigUpgrade?.duplicateAndUpgradeConfiguration;
}
if (typeof generateUpgradedConfigName === 'undefined') {
    window.generateUpgradedConfigName = window.ConfigUpgrade?.generateUpgradedConfigName;
}
if (typeof upgradeConfigurationComponents === 'undefined') {
    window.upgradeConfigurationComponents = window.ConfigUpgrade?.upgradeConfigurationComponents;
}
if (typeof findUpgradedComponent === 'undefined') {
    window.findUpgradedComponent = window.ConfigUpgrade?.findUpgradedComponent;
}
if (typeof getNextTier === 'undefined') {
    window.getNextTier = window.ConfigUpgrade?.getNextTier;
}
if (typeof getComponentTypeFromComponent === 'undefined') {
    window.getComponentTypeFromComponent = window.ConfigUpgrade?.getComponentTypeFromComponent;
}
if (typeof isSameComponentType === 'undefined') {
    window.isSameComponentType = window.ConfigUpgrade?.isSameComponentType;
}

// Function to update category count in the header
// MOVED TO: components-panel.js module

// Function to update component type count in the header
// MOVED TO: components-panel.js module

// Expose global variables for other modules
window.ships = ships;
window.addedShips = addedShips;
window.nextShipId = nextShipId;
window.shipConfigurations = shipConfigurations;
window.activeConfigIndices = activeConfigIndices;
window.getShipIdentifier = getShipIdentifier;
window.updateComparisonTable = updateComparisonTable;

// Initialize drag-and-drop for files when the module is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize drag-and-drop for files
    if (window.FileDragDrop && window.FileDragDrop.init) {
        window.FileDragDrop.init();
        console.log('File drag-and-drop initialized');
    }
});
    