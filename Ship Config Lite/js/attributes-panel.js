// === MODULE: Attributes Panel ===
// This module handles all functionality related to the component attributes panel,
// including opening/closing the panel, managing component groups, editing stat values,
// and handling scaling formulas.
//
// Dependencies:
// - Global variables: currentCategory, currentComponentGroup, componentCategories, 
//   componentAttributes, statsFromCsv, customAttributeOrder, classScalingFormulas,
//   tierScalingFormulas, addedShips, attributesPanelLocked
// - Functions: getRelevantStats(), closeComponentsPanel(), updateComparisonTable()

// Open the attributes panel for a specific category
function openAttributesPanel(category) {
    // Validate dependencies
    if (typeof componentCategories === 'undefined' || !componentCategories) {
        console.error('Attributes Panel: componentCategories not available');
        return;
    }
    
    // Set the current category
    currentCategory = category;
    currentComponentGroup = null;
    
    // Update UI to show the category is active
    const categoryButtons = document.querySelectorAll('.category-button');
    categoryButtons.forEach(button => {
        if (button.textContent === category) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    // Update the panel title
    const panelTitle = document.querySelector('.attributes-panel-header .category-name');
    if (panelTitle) {
        panelTitle.textContent = category;
    }
    
    // Clear existing tabs if any
    let tabsContainer = document.querySelector('.attributes-tabs');
    if (!tabsContainer) {
        // Create tabs container if it doesn't exist
        tabsContainer = document.createElement('div');
        tabsContainer.className = 'attributes-tabs';
        
        // Insert after the header
        const header = document.querySelector('.attributes-panel-header');
        header.parentNode.insertBefore(tabsContainer, header.nextSibling);
    }
    tabsContainer.innerHTML = '';
    
    // Create tabs for all categories
    Object.keys(componentCategories).forEach(cat => {
        const tab = document.createElement('button');
        tab.className = 'attributes-tab';
        tab.textContent = cat;
        
        if (cat === category) {
            tab.classList.add('active');
        }
        
        tab.addEventListener('click', () => {
            // Switch to the clicked category
            currentCategory = cat;
            currentComponentGroup = null;
            
            // Update active tab
            document.querySelectorAll('.attributes-tab').forEach(t => {
                t.classList.remove('active');
            });
            tab.classList.add('active');
            
            // Update active category button
            categoryButtons.forEach(button => {
                if (button.textContent === cat) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            });
            
            // Update panel title
            if (panelTitle) {
                panelTitle.textContent = cat;
            }
            
            // Update the groups list
            updateComponentGroupsList(cat);
        });
        
        tabsContainer.appendChild(tab);
    });
    
    // Update the groups list for the current category
    updateComponentGroupsList(category);
    
    // Open the panel
    const panel = document.getElementById('attributes-panel');
    if (panel) {
        panel.classList.add('open');
        
        // Show the overlay
        const overlay = document.getElementById('overlay');
        if (overlay) {
            overlay.classList.add('active');
            overlay.addEventListener('click', closeAttributesPanel);
        }
    }
    
    // Close the components panel if it's open
    if (typeof closeComponentsPanel === 'function') {
        closeComponentsPanel();
    }
}

// Close the attributes panel
function closeAttributesPanel() {
    const panel = document.getElementById('attributes-panel');
    if (panel) {
        panel.classList.remove('open');
    }
    
    // Hide the overlay
    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.classList.remove('active');
        overlay.removeEventListener('click', closeAttributesPanel);
    }
    
    // Remove the scaling formulas button from groups column
    const scalingButton = document.getElementById('scaling-formulas-groups-btn');
    if (scalingButton) {
        scalingButton.remove();
    }
    
    // Remove tabs container
    const tabsContainer = document.querySelector('.attributes-tabs');
    if (tabsContainer) {
        tabsContainer.remove();
    }
    
    // Reset current selections
    currentCategory = null;
    currentComponentGroup = null;
    
    // Reset active buttons
    const categoryButtons = document.querySelectorAll('.category-button');
    categoryButtons.forEach(button => button.classList.remove('active'));
}

// Helper function to update component groups list
function updateComponentGroupsList(category) {
    // Clear the component groups list
    const groupsList = document.getElementById('component-groups-list');
    if (!groupsList) return;
    
    groupsList.innerHTML = '';
    
    // Add the Edit Scaling Formulas button at the top of the groups column
    const scalingButton = document.createElement('button');
    scalingButton.id = 'scaling-formulas-groups-btn';
    scalingButton.textContent = 'Edit Scaling Formulas';
    scalingButton.style.width = '100%';
    scalingButton.style.marginBottom = '16px';
    scalingButton.style.padding = '10px 12px';
    scalingButton.style.backgroundColor = '#444';
    scalingButton.style.color = 'white';
    scalingButton.style.border = '1px solid #666';
    scalingButton.style.borderRadius = '3px';
    scalingButton.style.cursor = 'pointer';
    scalingButton.style.fontSize = '14px';
    scalingButton.style.fontFamily = "'Chakra Petch', sans-serif";
    scalingButton.style.textTransform = 'uppercase';
    scalingButton.style.letterSpacing = '0.5px';
    scalingButton.addEventListener('click', () => {
        openScalingFormulasPopup(category);
    });
    
    groupsList.appendChild(scalingButton);
    
    // Add component groups if they exist
    if (componentCategories[category] && componentCategories[category].length > 0) {
        // Create a header for the groups list
        const groupsListHeader = document.createElement('div');
        groupsListHeader.className = 'groups-list-header';
        groupsListHeader.textContent = 'COMPONENT GROUPS';
        groupsList.appendChild(groupsListHeader);
        
        componentCategories[category].forEach(groupName => {
            const button = document.createElement('button');
            button.className = 'component-group-button';
            button.textContent = groupName;
            button.addEventListener('click', () => {
                selectComponentGroup(category, groupName);
            });
            groupsList.appendChild(button);
        });
        
        // Select the first group by default
        if (componentCategories[category].length > 0) {
            selectComponentGroup(category, componentCategories[category][0]);
        }
    }
}

// Select a component group to edit
function selectComponentGroup(category, groupName) {
    currentComponentGroup = groupName;
    
    // Update UI to show the group is active
    const groupButtons = document.querySelectorAll('.component-group-button');
    groupButtons.forEach(button => {
        if (button.textContent === groupName) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    // Load the attributes editor for this group
    populateAttributesEditor(category, groupName);
}

// Populate the attributes editor with the selected group's stats
function populateAttributesEditor(category, groupName) {
    const container = document.getElementById('base-stats-container');
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Check if we have attributes for this category and group
    if (!componentAttributes[category] || !componentAttributes[category][groupName]) {
        console.error(`No attributes found for ${category} > ${groupName}`);
        return;
    }
    
    const attributes = componentAttributes[category][groupName];
    const orderedStats = getRelevantStats();
    
    // Debug: log the attributes to see if subGroups exist
    console.log(`Attributes for ${category} > ${groupName}:`, attributes);
    if (attributes.subGroups) {
        console.log(`Found subGroups:`, Object.keys(attributes.subGroups));
    } else {
        console.log(`No subGroups found`);
    }
    
    // Helper function to get inherited value for a stat from parent path
    function getInheritedValue(statName, parentPath = []) {
        let current = componentAttributes[category][groupName];
        for (const pathSegment of parentPath) {
            if (current.subGroups && current.subGroups[pathSegment]) {
                current = current.subGroups[pathSegment];
            } else {
                return 0; // fallback if path doesn't exist
            }
        }
        
        // Walk up the tree to find the nearest defined value
        while (parentPath.length > 0) {
            parentPath.pop();
            current = componentAttributes[category][groupName];
            for (const pathSegment of parentPath) {
                if (current.subGroups && current.subGroups[pathSegment]) {
                    current = current.subGroups[pathSegment];
                }
            }
            if (current[statName] && current[statName].baseValue !== undefined) {
                return current[statName].baseValue;
            }
        }
        
        // Finally check the root level
        if (attributes[statName] && attributes[statName].baseValue !== undefined) {
            return attributes[statName].baseValue;
        }
        
        return 0;
    }
    
    // Helper function to update a stat value at a specific path
    function updateStatAtPath(statName, value, path = []) {
        let current = componentAttributes[category][groupName];
        for (const pathSegment of path) {
            if (!current.subGroups) current.subGroups = {};
            if (!current.subGroups[pathSegment]) current.subGroups[pathSegment] = {};
            current = current.subGroups[pathSegment];
        }
        
        // Handle different value types
        if (typeof value === 'object' && value !== null && (value.type || value.baseValue !== undefined)) {
            // New stat object format or existing stat object
            if (!current[statName]) {
                current[statName] = { baseValue: undefined, values: {} };
            }
            // Merge with existing stat object to preserve values
            const existingValues = current[statName].values || {};
            current[statName] = window.StatTypeSystem.initializeStatWithType(value);
            current[statName].values = existingValues; // Preserve calculated values
        } else if (value !== undefined) {
            // Legacy single value format - convert to new format
            if (!current[statName]) {
                current[statName] = { baseValue: undefined, values: {} };
            }
            const existingValues = current[statName].values || {};
            current[statName] = window.StatTypeSystem.initializeStatWithType({
                baseValue: value,
                values: existingValues
            });
        } else {
            // Undefined value - clear it (for inheritance)
            if (!current[statName]) {
                current[statName] = { baseValue: undefined, values: {} };
            }
            current[statName].baseValue = undefined;
        }
        
        // Recalculate values for this stat
        recalculateComponentValues(category, groupName, statName);
        
        // Update comparison table if needed
        if (addedShips.length > 0) {
            if (window.debouncedTableUpdate) {
                window.debouncedTableUpdate({ delay: 100 });
            } else if (typeof updateComparisonTable === 'function') {
                updateComparisonTable();
            }
        }
        
        // Mark configuration as changed
        if (typeof markConfigurationAsChanged === 'function') {
            markConfigurationAsChanged();
        }

        // Don't refresh the entire UI - just update the specific input if needed
    }
    
    // Helper function to render stats for a node
    function renderStatsForNode(nodeAttrs, path = [], parentContainer = container, level = 0) {
        const isRoot = path.length === 0;
        
        // Always create a table for the root level (whether or not it has sub-groups)
        if (isRoot) {
            const table = document.createElement('table');
            table.className = 'stats-table';
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.marginTop = '8px';
            
            // Create header row
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            // Stat name column
            const statHeader = document.createElement('th');
            statHeader.textContent = 'Stat';
            statHeader.style.textAlign = 'left';
            statHeader.style.padding = '8px';
            statHeader.style.borderBottom = '1px solid #444';
            statHeader.style.background = 'rgba(40,40,40,0.5)';
            headerRow.appendChild(statHeader);
            
            // Base column
            const baseHeader = document.createElement('th');
            baseHeader.textContent = 'Base';
            baseHeader.style.textAlign = 'center';
            baseHeader.style.padding = '8px';
            baseHeader.style.borderBottom = '1px solid #444';
            baseHeader.style.background = 'rgba(40,40,40,0.5)';
            baseHeader.style.minWidth = '120px';
            headerRow.appendChild(baseHeader);
            
            // Sub-group columns (only if they exist)
            const hasSubGroups = nodeAttrs.subGroups && Object.keys(nodeAttrs.subGroups).length > 0;
            let subGroupNames = [];
            
            if (hasSubGroups) {
                subGroupNames = Object.keys(nodeAttrs.subGroups);
                subGroupNames.forEach(subGroupName => {
                    const subHeader = document.createElement('th');
                    subHeader.textContent = subGroupName;
                    subHeader.style.textAlign = 'center';
                    subHeader.style.padding = '8px';
                    subHeader.style.borderBottom = '1px solid #444';
                    subHeader.style.background = 'rgba(40,40,40,0.5)';
                    subHeader.style.color = '#e79e00';
                    subHeader.style.minWidth = '120px';
                    headerRow.appendChild(subHeader);
                });
            }
            
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            // Create body
            const tbody = document.createElement('tbody');
            
            // Create rows for each stat
            orderedStats.forEach(statName => {
                // Check if we should skip this row when locked
                if (attributesPanelLocked) {
                    const baseStat = nodeAttrs[statName] || { baseValue: undefined };
                    
                    // Initialize stat with type system if needed
                    const initializedStat = window.StatTypeSystem ? 
                        window.StatTypeSystem.initializeStatWithType(baseStat) : baseStat;
                    
                    // Check if base stat has been edited (non-default values)
                    let baseEdited = false;
                    if (initializedStat.type === window.STAT_TYPES.ADDITIVE || initializedStat.type === 'additive') {
                        baseEdited = (initializedStat.additiveValue || 0) !== 0;
                    } else if (initializedStat.type === window.STAT_TYPES.MULTIPLICATIVE || initializedStat.type === 'multiplicative') {
                        baseEdited = (initializedStat.multiplicativeValue !== undefined ? initializedStat.multiplicativeValue : 1.0) !== 1.0;
                    } else if (initializedStat.type === window.STAT_TYPES.BOTH || initializedStat.type === 'both') {
                        baseEdited = (initializedStat.additiveValue || 0) !== 0 || 
                                   (initializedStat.multiplicativeValue !== undefined ? initializedStat.multiplicativeValue : 1.0) !== 1.0;
                    } else {
                        // Fallback for legacy stats
                        baseEdited = (baseStat.baseValue || 0) !== 0;
                    }
                    
                    // Check if all values in this row are default (base and all sub-groups)
                    let allDefault = !baseEdited;
                    
                    if (hasSubGroups && allDefault) {
                        // Check sub-group values too
                        allDefault = subGroupNames.every(subGroupName => {
                            const subGroupAttrs = nodeAttrs.subGroups[subGroupName];
                            const subStat = subGroupAttrs[statName] || { baseValue: undefined };
                            const initializedSubStat = window.StatTypeSystem ? 
                                window.StatTypeSystem.initializeStatWithType(subStat) : subStat;
                            
                            // Check if sub stat has been edited
                            if (initializedSubStat.type === window.STAT_TYPES.ADDITIVE || initializedSubStat.type === 'additive') {
                                return (initializedSubStat.additiveValue || 0) === 0;
                            } else if (initializedSubStat.type === window.STAT_TYPES.MULTIPLICATIVE || initializedSubStat.type === 'multiplicative') {
                                return (initializedSubStat.multiplicativeValue !== undefined ? initializedSubStat.multiplicativeValue : 1.0) === 1.0;
                            } else if (initializedSubStat.type === window.STAT_TYPES.BOTH || initializedSubStat.type === 'both') {
                                return (initializedSubStat.additiveValue || 0) === 0 && 
                                       (initializedSubStat.multiplicativeValue !== undefined ? initializedSubStat.multiplicativeValue : 1.0) === 1.0;
                            } else {
                                // Fallback for legacy stats
                                return (subStat.baseValue || 0) === 0;
                            }
                        });
                    }
                    
                    // Skip this row if all values are default
                    if (allDefault) {
                        return;
                    }
                }
                
                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid #333';
                
                // Stat name cell
                const statCell = document.createElement('td');
                statCell.textContent = statName;
                statCell.style.padding = '8px';
                statCell.style.fontWeight = 'bold';
                statCell.style.background = 'rgba(30,30,30,0.3)';
                
                // Add hover tooltip if description exists
                if (window.statDescriptions && window.statDescriptions[statName]) {
                    statCell.style.cursor = 'help';
                    statCell.title = window.statDescriptions[statName];
                }
                
                row.appendChild(statCell);
                
                // Base value cell
                const baseCell = document.createElement('td');
                baseCell.style.padding = '4px';
                baseCell.style.textAlign = 'center';
                
                const baseStat = nodeAttrs[statName] || { baseValue: undefined };
                const baseInput = createStatInput(statName, baseStat, [], false);
                baseCell.appendChild(baseInput.container);
                row.appendChild(baseCell);
                
                // Sub-group cells (only if they exist)
                if (hasSubGroups) {
                    subGroupNames.forEach(subGroupName => {
                        const subCell = document.createElement('td');
                        subCell.style.padding = '4px';
                        subCell.style.textAlign = 'center';
                        
                        const subGroupAttrs = nodeAttrs.subGroups[subGroupName];
                        const subStat = subGroupAttrs[statName] || { baseValue: undefined };
                        const subInput = createStatInput(statName, subStat, [subGroupName], true);
                        subCell.appendChild(subInput.container);
                        row.appendChild(subCell);
                    });
                }
                
                tbody.appendChild(row);
            });
            
            table.appendChild(tbody);
            parentContainer.appendChild(table);
        } else {
            // This branch is for non-root levels (nested sub-groups), keep the original logic
            orderedStats.forEach(statName => {
                const stat = nodeAttrs[statName] || { baseValue: undefined };
                
                // Check if we should skip this stat when locked
                if (attributesPanelLocked) {
                    // Initialize stat with type system if needed
                    const initializedStat = window.StatTypeSystem ? 
                        window.StatTypeSystem.initializeStatWithType(stat) : stat;
                    
                    // Check if stat has been edited (non-default values)
                    let isEdited = false;
                    if (initializedStat.type === window.STAT_TYPES.ADDITIVE || initializedStat.type === 'additive') {
                        isEdited = (initializedStat.additiveValue || 0) !== 0;
                    } else if (initializedStat.type === window.STAT_TYPES.MULTIPLICATIVE || initializedStat.type === 'multiplicative') {
                        isEdited = (initializedStat.multiplicativeValue !== undefined ? initializedStat.multiplicativeValue : 1.0) !== 1.0;
                    } else if (initializedStat.type === window.STAT_TYPES.BOTH || initializedStat.type === 'both') {
                        isEdited = (initializedStat.additiveValue || 0) !== 0 || 
                                  (initializedStat.multiplicativeValue !== undefined ? initializedStat.multiplicativeValue : 1.0) !== 1.0;
                    } else {
                        // Fallback for legacy stats
                        isEdited = (stat.baseValue || 0) !== 0;
                    }
                    
                    if (!isEdited) {
                        return; // Skip non-edited values
                    }
                }
                
                // Create a proper stat editor layout
                const statEditor = document.createElement('div');
                statEditor.className = 'stat-editor';
                statEditor.style.display = 'flex';
                statEditor.style.alignItems = 'center';
                statEditor.style.marginBottom = '4px';
                statEditor.style.gap = '8px';
                statEditor.style.padding = '4px 0';
                
                const label = document.createElement('label');
                label.textContent = statName;
                label.style.flex = '1';
                label.style.minWidth = '0';
                label.style.whiteSpace = 'nowrap';
                label.style.overflow = 'hidden';
                label.style.textOverflow = 'ellipsis';
                label.style.fontWeight = 'bold';
                
                // Add hover tooltip if description exists
                if (window.statDescriptions && window.statDescriptions[statName]) {
                    label.style.cursor = 'help';
                    label.title = window.statDescriptions[statName];
                }
                
                const statInput = createStatInput(statName, stat, path, level > 0);
                
                // Apply classes to label based on the stat value
                const displayValue = stat.baseValue;
                if (displayValue > 0) {
                    label.classList.add('stat-positive');
                } else if (displayValue < 0) {
                    label.classList.add('stat-negative');
                }
                
                statEditor.appendChild(label);
                statEditor.appendChild(statInput.container);
                parentContainer.appendChild(statEditor);
            });
        }
    }
    
    // Helper function to create a stat input with proper styling and behavior
    function createStatInput(statName, stat, path, isSubGroup) {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '4px';
        container.style.justifyContent = 'center';
        
        // Initialize stat with type system if needed
        if (window.StatTypeSystem) {
            stat = window.StatTypeSystem.initializeStatWithType(stat);
        }
        
        // Type toggle button
        const typeButton = document.createElement('button');
        typeButton.className = 'stat-type-toggle';
        typeButton.style.width = '24px';
        typeButton.style.height = '24px';
        typeButton.style.padding = '0';
        typeButton.style.border = '1px solid #555';
        typeButton.style.background = '#333';
        typeButton.style.color = window.getStatTypeColor(stat.type);
        typeButton.style.fontWeight = 'bold';
        typeButton.style.cursor = 'pointer';
        typeButton.style.borderRadius = '3px';
        typeButton.style.fontSize = '16px';
        typeButton.style.lineHeight = '1';
        typeButton.textContent = window.getStatTypeIcon(stat.type);
        typeButton.title = `Type: ${stat.type}`;
        
        // Create input fields container
        const inputsContainer = document.createElement('div');
        inputsContainer.style.display = 'flex';
        inputsContainer.style.gap = '4px';
        inputsContainer.style.alignItems = 'center';
        
        // Create additive input
        const additiveInput = document.createElement('input');
        additiveInput.type = 'number';
        additiveInput.value = stat.additiveValue || 0;
        additiveInput.step = 'any';
        additiveInput.style.width = '60px';
        additiveInput.style.flexShrink = '0';
        additiveInput.style.padding = '4px';
        additiveInput.style.border = '1px solid #4CAF50';
        additiveInput.style.background = '#222';
        additiveInput.style.color = 'white';
        additiveInput.style.borderRadius = '3px';
        additiveInput.placeholder = '+';
        additiveInput.title = 'Additive value';
        
        // Create multiplicative input  
        const multiplicativeInput = document.createElement('input');
        multiplicativeInput.type = 'number';
        multiplicativeInput.value = stat.multiplicativeValue !== undefined ? stat.multiplicativeValue : 1.0;
        multiplicativeInput.step = 'any';
        multiplicativeInput.style.width = '60px';
        multiplicativeInput.style.flexShrink = '0';
        multiplicativeInput.style.padding = '4px';
        multiplicativeInput.style.border = '1px solid #FFD700';
        multiplicativeInput.style.background = '#222';
        multiplicativeInput.style.color = 'white';
        multiplicativeInput.style.borderRadius = '3px';
        multiplicativeInput.placeholder = '×';
        multiplicativeInput.title = 'Multiplicative value';
        
        // Function to update input visibility based on type
        function updateInputVisibility() {
            additiveInput.style.display = 'none';
            multiplicativeInput.style.display = 'none';
            
            switch (stat.type) {
                case window.STAT_TYPES.ADDITIVE:
                    additiveInput.style.display = 'block';
                    break;
                case window.STAT_TYPES.MULTIPLICATIVE:
                    multiplicativeInput.style.display = 'block';
                    break;
                case window.STAT_TYPES.BOTH:
                    additiveInput.style.display = 'block';
                    multiplicativeInput.style.display = 'block';
                    break;
            }
        }
        
        // Initial visibility
        updateInputVisibility();
        
        // Type button click handler
        typeButton.addEventListener('click', (e) => {
            e.preventDefault();
            stat.type = window.cycleStatType(stat.type);
            typeButton.textContent = window.getStatTypeIcon(stat.type);
            typeButton.style.color = window.getStatTypeColor(stat.type);
            typeButton.title = `Type: ${stat.type}`;
            updateInputVisibility();
            
            // Update the stat type
            if (window.updateStatType) {
                window.updateStatType(stat, stat.type);
            }
            
            // Save the changes
            updateStatAtPath(statName, stat, path);
        });
        
        // Input change handlers
        additiveInput.addEventListener('change', (e) => {
            const oldValue = stat.additiveValue || 0;
            const value = parseFloat(e.target.value) || 0;
            stat.additiveValue = value;
            updateStatAtPath(statName, stat, path);
            
            // Check if we need to refresh when changing from default in locked mode
            if (attributesPanelLocked && oldValue === 0 && value !== 0) {
                setTimeout(() => {
                    populateAttributesEditor(currentCategory, currentComponentGroup);
                }, 100);
            }
        });
        
        // Show dash for default multiplicative values
        multiplicativeInput.value = stat.multiplicativeValue === 1.0 ? '-' : stat.multiplicativeValue;
        
        multiplicativeInput.addEventListener('focus', (e) => {
            if (e.target.value === '-') {
                e.target.value = '';
            }
        });
        
        multiplicativeInput.addEventListener('blur', (e) => {
            const oldValue = stat.multiplicativeValue !== undefined ? stat.multiplicativeValue : 1.0;
            const value = parseFloat(e.target.value);
            if (isNaN(value) || value === 1.0) {
                e.target.value = '-';
                stat.multiplicativeValue = 1.0;
            } else {
                e.target.value = value;
                stat.multiplicativeValue = value;
            }
            updateStatAtPath(statName, stat, path);
            
            // Check if we need to refresh when changing from default in locked mode
            if (attributesPanelLocked && oldValue === 1.0 && stat.multiplicativeValue !== 1.0) {
                setTimeout(() => {
                    populateAttributesEditor(currentCategory, currentComponentGroup);
                }, 100);
            }
        });
        
        multiplicativeInput.addEventListener('change', (e) => {
            const oldValue = stat.multiplicativeValue !== undefined ? stat.multiplicativeValue : 1.0;
            const value = parseFloat(e.target.value);
            stat.multiplicativeValue = isNaN(value) ? 1.0 : value;
            updateStatAtPath(statName, stat, path);
            
            // Check if we need to refresh when changing from default in locked mode
            if (attributesPanelLocked && oldValue === 1.0 && stat.multiplicativeValue !== 1.0) {
                setTimeout(() => {
                    populateAttributesEditor(currentCategory, currentComponentGroup);
                }, 100);
            }
        });
        
        // Determine display value and inheritance (backward compatibility)
        let displayValue = stat.baseValue;
        let inherited = false;
        if (displayValue === undefined && isSubGroup) {
            displayValue = getInheritedValue(statName, path.slice(0, -1));
            inherited = true;
        }
        
        // Legacy single input for backward compatibility (hidden when using new system)
        const legacyInput = document.createElement('input');
        legacyInput.type = 'number';
        legacyInput.value = displayValue || 0;
        legacyInput.step = 'any';
        legacyInput.style.width = '80px';
        legacyInput.style.flexShrink = '0';
        legacyInput.style.padding = '4px';
        legacyInput.style.border = '1px solid #444';
        legacyInput.style.background = '#222';
        legacyInput.style.color = 'white';
        legacyInput.style.borderRadius = '3px';
        legacyInput.style.display = 'none'; // Hidden by default when using new system
        
        if (inherited) {
            legacyInput.style.fontStyle = 'italic';
            legacyInput.style.opacity = '0.7';
            legacyInput.title = 'Inherited from base';
        }
        
        // Apply classes based on value - let CSS handle the styling
        if (displayValue > 0) {
            legacyInput.classList.add('stat-positive');
            // Remove conflicting inline styles to let CSS take over
            legacyInput.style.border = '';
            legacyInput.style.background = '';
            legacyInput.style.color = '';
        } else if (displayValue < 0) {
            legacyInput.classList.add('stat-negative');
            // Remove conflicting inline styles to let CSS take over
            legacyInput.style.border = '';
            legacyInput.style.background = '';
            legacyInput.style.color = '';
        } else {
            legacyInput.style.color = '#666666';
        }
        
        // Helper function to update row classes based on input classes
        function updateRowClasses(inputElement) {
            const row = inputElement.closest('tr');
            if (row) {
                // Remove existing classes
                row.classList.remove('stat-positive-row', 'stat-negative-row');
                
                // Calculate effective value based on type
                if (window.calculateStatValue) {
                    const calc = window.calculateStatValue(0, stat);
                    if (calc.finalValue > 0) {
                        row.classList.add('stat-positive-row');
                    } else if (calc.finalValue < 0) {
                        row.classList.add('stat-negative-row');
                    }
                }
            }
        }
        
        // Update row classes initially
        updateRowClasses(additiveInput);
        
        // Legacy input change handler (for backward compatibility)
        legacyInput.addEventListener('change', (e) => {
            const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
            const oldValue = stat.baseValue || 0;
            updateStatAtPath(statName, value, path);
            
            // Check if we need to refresh when changing from default in locked mode
            if (attributesPanelLocked) {
                // Refresh if we changed from default to non-default
                let needsRefresh = false;
                if (stat.type === window.STAT_TYPES.ADDITIVE || stat.type === 'additive') {
                    const oldAdditive = stat.additiveValue || 0;
                    if (oldAdditive === 0 && stat.additiveValue !== 0) {
                        needsRefresh = true;
                    }
                } else if (stat.type === window.STAT_TYPES.MULTIPLICATIVE || stat.type === 'multiplicative') {
                    const oldMultiplicative = stat.multiplicativeValue !== undefined ? stat.multiplicativeValue : 1.0;
                    if (oldMultiplicative === 1.0 && stat.multiplicativeValue !== 1.0) {
                        needsRefresh = true;
                    }
                } else if (stat.type === window.STAT_TYPES.BOTH || stat.type === 'both') {
                    const oldAdditive = stat.additiveValue || 0;
                    const oldMultiplicative = stat.multiplicativeValue !== undefined ? stat.multiplicativeValue : 1.0;
                    if ((oldAdditive === 0 && stat.additiveValue !== 0) || 
                        (oldMultiplicative === 1.0 && stat.multiplicativeValue !== 1.0)) {
                        needsRefresh = true;
                    }
                } else {
                    // Legacy check
                    if (oldValue === 0 && value !== 0 && value !== undefined) {
                        needsRefresh = true;
                    }
                }
                
                if (needsRefresh) {
                    // Delay the refresh slightly to allow the value to be saved
                    setTimeout(() => {
                        populateAttributesEditor(currentCategory, currentComponentGroup);
                    }, 100);
                }
            }
        });
        
        // Add elements to container
        container.appendChild(typeButton);
        inputsContainer.appendChild(additiveInput);
        inputsContainer.appendChild(multiplicativeInput);
        container.appendChild(inputsContainer);
        container.appendChild(legacyInput);
        
        // Add clear button for sub-groups
        if (isSubGroup) {
            const clearBtn = document.createElement('button');
            clearBtn.textContent = '⟲';
            clearBtn.title = 'Revert to inherited value';
            clearBtn.style.background = 'none';
            clearBtn.style.border = 'none';
            clearBtn.style.color = '#aaa';
            clearBtn.style.cursor = 'pointer';
            clearBtn.style.fontSize = '12px';
            clearBtn.style.padding = '2px';
            clearBtn.style.flexShrink = '0';
            
            clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                updateStatAtPath(statName, undefined, path);
                
                // Reset all inputs to inherited/default values
                const inheritedStat = getInheritedValue(statName, path.slice(0, -1));
                if (typeof inheritedStat === 'object') {
                    stat.additiveValue = inheritedStat.additiveValue || 0;
                    stat.multiplicativeValue = inheritedStat.multiplicativeValue !== undefined ? inheritedStat.multiplicativeValue : 1.0;
                    stat.type = inheritedStat.type || window.DEFAULT_STAT_TYPE;
                } else {
                    stat.additiveValue = 0;
                    stat.multiplicativeValue = 1.0;
                    stat.type = window.DEFAULT_STAT_TYPE;
                }
                
                // Update UI elements
                additiveInput.value = stat.additiveValue;
                multiplicativeInput.value = stat.multiplicativeValue === 1.0 ? '-' : stat.multiplicativeValue;
                typeButton.textContent = window.getStatTypeIcon(stat.type);
                typeButton.style.color = window.getStatTypeColor(stat.type);
                typeButton.title = `Type: ${stat.type}`;
                updateInputVisibility();
                updateRowClasses(additiveInput);
            });
            
            container.appendChild(clearBtn);
        }
        
        return { container, input: legacyInput };
    }
    
    // Start rendering from the root
    renderStatsForNode(attributes, [], container, 0);
}

// Update a stat value for a component group
function updateStatValue(category, groupName, statName, value) {
    // Ensure attributes objects exist
    if (!componentAttributes[category]) {
        componentAttributes[category] = {};
    }
    
    if (!componentAttributes[category][groupName]) {
        componentAttributes[category][groupName] = {};
    }
    
    if (!componentAttributes[category][groupName][statName]) {
        componentAttributes[category][groupName][statName] = {
            baseValue: 0,
            values: {}
        };
    }
    
    // Update the base value
    componentAttributes[category][groupName][statName].baseValue = value;
    
    // Recalculate values for all class/tier combinations
    recalculateComponentValues(category, groupName, statName);
    
    // Update the comparison table if needed
    if (addedShips.length > 0) {
        if (window.debouncedTableUpdate) {
            window.debouncedTableUpdate({ delay: 100 });
        } else if (typeof updateComparisonTable === 'function') {
            updateComparisonTable();
        }
    }
}

// Update the class scaling formula
function updateClassScalingFormula(category, formula) {
    classScalingFormulas[category] = formula;
    
    // Recalculate all stats for this category with recursive sub-groups
    if (componentCategories[category] && componentAttributes[category]) {
        componentCategories[category].forEach(groupName => {
            if (componentAttributes[category][groupName]) {
                // Helper function to recursively get all stat names from a node tree
                function getAllStatNames(node) {
                    const statNames = new Set();
                    Object.keys(node).forEach(key => {
                        if (key !== 'subGroups' && node[key] && typeof node[key] === 'object' && node[key].hasOwnProperty('baseValue')) {
                            statNames.add(key);
                        }
                    });
                    if (node.subGroups) {
                        Object.keys(node.subGroups).forEach(subGroupKey => {
                            const subStatNames = getAllStatNames(node.subGroups[subGroupKey]);
                            subStatNames.forEach(name => statNames.add(name));
                        });
                    }
                    return statNames;
                }
                
                const allStatNames = getAllStatNames(componentAttributes[category][groupName]);
                allStatNames.forEach(statName => {
                    recalculateComponentValues(category, groupName, statName);
                });
            }
        });
    }
    
    // Update the comparison table
    if (addedShips.length > 0) {
        if (window.debouncedTableUpdate) {
            window.debouncedTableUpdate({ delay: 100 });
        } else if (typeof updateComparisonTable === 'function') {
            updateComparisonTable();
        }
    }
    
    // Mark configuration as changed
    if (typeof markConfigurationAsChanged === 'function') {
        markConfigurationAsChanged();
    }
}

// Update the tier scaling formula
function updateTierScalingFormula(category, formula) {
    tierScalingFormulas[category] = formula;
    
    // Recalculate all stats for this category with recursive sub-groups
    if (componentCategories[category] && componentAttributes[category]) {
        componentCategories[category].forEach(groupName => {
            if (componentAttributes[category][groupName]) {
                // Helper function to recursively get all stat names from a node tree
                function getAllStatNames(node) {
                    const statNames = new Set();
                    Object.keys(node).forEach(key => {
                        if (key !== 'subGroups' && node[key] && typeof node[key] === 'object' && node[key].hasOwnProperty('baseValue')) {
                            statNames.add(key);
                        }
                    });
                    if (node.subGroups) {
                        Object.keys(node.subGroups).forEach(subGroupKey => {
                            const subStatNames = getAllStatNames(node.subGroups[subGroupKey]);
                            subStatNames.forEach(name => statNames.add(name));
                        });
                    }
                    return statNames;
                }
                
                const allStatNames = getAllStatNames(componentAttributes[category][groupName]);
                allStatNames.forEach(statName => {
                    recalculateComponentValues(category, groupName, statName);
                });
            }
        });
    }
    
    // Update the comparison table
    if (addedShips.length > 0) {
        if (window.debouncedTableUpdate) {
            window.debouncedTableUpdate({ delay: 100 });
        } else if (typeof updateComparisonTable === 'function') {
            updateComparisonTable();
        }
    }
    
    // Mark configuration as changed
    if (typeof markConfigurationAsChanged === 'function') {
        markConfigurationAsChanged();
    }
}

// Recalculate component values based on formulas
function recalculateComponentValues(category, groupName, statName) {
    if (!componentAttributes[category] || 
        !componentAttributes[category][groupName] || 
        !componentAttributes[category][groupName][statName]) {
        return;
    }

    // Helper function to recursively recalculate values for a node and its sub-groups
    function recalculateNodeValues(node, baseValue) {
        const tierFormula = tierScalingFormulas[category] || "base * (1 + (tierIndex - 1) * 0.05)";
        const classFormula = classScalingFormulas[category] || "base * pow( pow(1.61803398875 , classIndex+1) / 2.2360679775 , 2 )";
        
        // Clear existing values for this node
        if (node[statName] && node[statName].values) {
            node[statName].values = {};
        }
        
        // Only calculate if this node has a defined stat
        if (node[statName]) {
            // Initialize stat with type system if needed
            node[statName] = window.StatTypeSystem.initializeStatWithType(node[statName]);
            
            // Use appropriate value based on type - BOTH type should use base value for scaling calculations
            let nodeBaseValue = node[statName].baseValue || 0;
            if (node[statName].type === window.STAT_TYPES.MULTIPLICATIVE) {
                nodeBaseValue = node[statName].multiplicativeValue !== undefined ? node[statName].multiplicativeValue : 1.0;
            } else if (node[statName].type === window.STAT_TYPES.ADDITIVE) {
                nodeBaseValue = node[statName].additiveValue || 0;
            } else if (node[statName].type === window.STAT_TYPES.BOTH) {
                // For BOTH type, use base value for scaling - the additive/multiplicative values are applied during stat calculation
                nodeBaseValue = node[statName].baseValue || 0;
            }
            
            // Define classes and tiers
            const classes = ["XXS", "XS", "S", "M", "L", "CAP", "CMD", "Class 8", "TTN"];
            const tiers = ["T1", "T2", "T3", "T4", "T5"];
            
            // Calculate values for each class and tier
            if (category === "Drones") {
                // Drones don't have classes or tiers in the current structure
                // Just store the base value with a simple key
                const key = "base";
                node[statName].values[key] = nodeBaseValue;
            } else {
                // Other categories use class-tier combinations with both class and tier scaling
                classes.forEach((className, classIndex) => {
                    tiers.forEach((tierName, tierIndex) => {
                        const key = `${className}-${tierName}`;
                        
                        try {
                            // First apply class scaling
                            const classScaledValue = evaluateFormula(classFormula, {
                                base: nodeBaseValue,
                                classIndex: classIndex + 1
                            });
                            
                            // Then apply tier scaling to the class-scaled value
                            const finalValue = evaluateFormula(tierFormula, {
                                base: classScaledValue,
                                tierIndex: tierIndex + 1
                            });
                            
                            // Store the calculated value
                            node[statName].values[key] = finalValue;
                        } catch (error) {
                            console.error(`Error calculating value for ${key}:`, error);
                            node[statName].values[key] = nodeBaseValue;
                        }
                    });
                });
            }
        }
        
        // Recursively recalculate sub-groups
        if (node.subGroups) {
            Object.keys(node.subGroups).forEach(subGroupKey => {
                recalculateNodeValues(node.subGroups[subGroupKey], baseValue);
            });
        }
    }
    
    // Start recalculation from the root node
    const rootNode = componentAttributes[category][groupName];
    const rootBaseValue = rootNode[statName] ? rootNode[statName].baseValue : 0;
    recalculateNodeValues(rootNode, rootBaseValue);
    
    // Update the comparison table if needed
    if (window.addedShips && window.addedShips.length > 0) {
        if (window.debouncedTableUpdate) {
            window.debouncedTableUpdate({ delay: 50 });
        } else if (typeof window.updateComparisonTable === 'function') {
            window.updateComparisonTable();
        }
    }
}

// Evaluate a formula with given variables
function evaluateFormula(formula, variables) {
    // Create a safe evaluation function
    const safeEval = (formula, context) => {
        // Define a map of allowed mathematical functions
        const mathFunctions = {
            abs: Math.abs,
            ceil: Math.ceil,
            floor: Math.floor,
            max: Math.max,
            min: Math.min,
            pow: Math.pow,
            round: Math.round,
            sqrt: Math.sqrt
        };
        
        // Combine the context variables with math functions
        const fullContext = { ...context, ...mathFunctions };
        
        // Create parameter names and values arrays for Function constructor
        const keys = Object.keys(fullContext);
        const values = keys.map(key => fullContext[key]);
        
        // Create and execute a function that evaluates the formula
        try {
            const func = new Function(...keys, `"use strict"; return ${formula};`);
            return func(...values);
        } catch (error) {
            console.error("Error evaluating formula:", error);
            throw error;
        }
    };
    
    return safeEval(formula, variables);
}

// Open the scaling formulas popup panel
function openScalingFormulasPopup(category) {
    // Create the popup panel
    const popup = document.createElement('div');
    popup.id = 'scaling-formulas-popup';
    popup.className = 'scaling-formulas-popup';
    popup.style.position = 'fixed';
    popup.style.top = '0';
    popup.style.right = '0';
    popup.style.bottom = '0';
    popup.style.width = '400px';
    popup.style.backgroundColor = 'rgba(20, 20, 20, 0.97)';
    popup.style.borderLeft = '1px solid #666';
    popup.style.padding = '0';
    popup.style.zIndex = '1001';
    popup.style.color = 'white';
    popup.style.boxShadow = '-4px 0 8px rgba(0, 0, 0, 0.5)';
    popup.style.overflow = 'auto';
    popup.style.transition = 'transform 0.3s ease-in-out';
    popup.style.transform = 'translateX(400px)';
    
    // Create header
    const header = document.createElement('div');
    header.style.background = '#111';
    header.style.padding = '15px';
    header.style.borderBottom = '1px solid #555';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    
    const title = document.createElement('h3');
    title.textContent = `Scaling Formulas - ${category}`;
    title.style.margin = '0';
    title.style.color = '#FFD700';
    title.style.fontSize = '18px';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.color = '#ccc';
    closeButton.style.fontSize = '20px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.padding = '5px 10px';
    closeButton.addEventListener('click', closeScalingFormulasPopup);
    
    header.appendChild(title);
    header.appendChild(closeButton);
    popup.appendChild(header);
    
    // Create content area
    const content = document.createElement('div');
    content.style.padding = '20px';
    
    // Class scaling section
    const classSection = document.createElement('div');
    classSection.style.marginBottom = '30px';
    
    const classTitle = document.createElement('h4');
    classTitle.textContent = 'Class Scaling (Diminishing Returns)';
    classTitle.style.margin = '0 0 10px 0';
    classTitle.style.color = 'white';
    classTitle.style.borderBottom = '1px solid #444';
    classTitle.style.paddingBottom = '5px';
    
    const classLabel = document.createElement('div');
    classLabel.textContent = 'Class Scaling Formula:';
    classLabel.style.marginBottom = '8px';
    classLabel.style.color = '#ccc';
    
    const classInput = document.createElement('input');
    classInput.type = 'text';
    classInput.value = classScalingFormulas[category] || "base * pow( pow(1.61803398875 , classIndex+1) / 2.2360679775 , 2 )";
    classInput.style.width = '100%';
    classInput.style.padding = '8px';
    classInput.style.marginBottom = '10px';
    classInput.style.backgroundColor = '#222';
    classInput.style.color = 'white';
    classInput.style.border = '1px solid #444';
    classInput.style.borderRadius = '4px';
    classInput.style.fontFamily = 'monospace';
    
    const classApplyButton = document.createElement('button');
    classApplyButton.textContent = 'Apply Class Formula';
    classApplyButton.style.padding = '8px 16px';
    classApplyButton.style.backgroundColor = '#4CAF50';
    classApplyButton.style.color = 'white';
    classApplyButton.style.border = 'none';
    classApplyButton.style.borderRadius = '4px';
    classApplyButton.style.cursor = 'pointer';
    classApplyButton.addEventListener('click', () => {
        updateClassScalingFormula(category, classInput.value);
    });
    
    classSection.appendChild(classTitle);
    classSection.appendChild(classLabel);
    classSection.appendChild(classInput);
    classSection.appendChild(classApplyButton);
    
    // Tier scaling section - only show for categories that have tiers
    const tierSection = document.createElement('div');
    tierSection.style.marginBottom = '30px';
    
    if (category === "Drones") {
        // Drones don't have tiers, show a message instead
        const noTierMessage = document.createElement('div');
        noTierMessage.textContent = 'Drones inherit scaling from their drone port\'s tier.';
        noTierMessage.style.padding = '15px';
        noTierMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        noTierMessage.style.borderRadius = '4px';
        noTierMessage.style.color = '#aaa';
        noTierMessage.style.fontStyle = 'italic';
        noTierMessage.style.textAlign = 'center';
        tierSection.appendChild(noTierMessage);
    } else {
        // Other categories have tiers
        const tierTitle = document.createElement('h4');
        tierTitle.textContent = 'Tier Scaling';
        tierTitle.style.margin = '0 0 10px 0';
        tierTitle.style.color = 'white';
        tierTitle.style.borderBottom = '1px solid #444';
        tierTitle.style.paddingBottom = '5px';
        
        const tierLabel = document.createElement('div');
        tierLabel.textContent = 'Tier Scaling Formula:';
        tierLabel.style.marginBottom = '8px';
        tierLabel.style.color = '#ccc';
        
        const tierInput = document.createElement('input');
        tierInput.type = 'text';
        tierInput.value = tierScalingFormulas[category] || "base * ( pow(1.61803398875 , tierIndex) / 2.2360679775 )";
        tierInput.style.width = '100%';
        tierInput.style.padding = '8px';
        tierInput.style.marginBottom = '10px';
        tierInput.style.backgroundColor = '#222';
        tierInput.style.color = 'white';
        tierInput.style.border = '1px solid #444';
        tierInput.style.borderRadius = '4px';
        tierInput.style.fontFamily = 'monospace';
        
        const tierApplyButton = document.createElement('button');
        tierApplyButton.textContent = 'Apply Tier Formula';
        tierApplyButton.style.padding = '8px 16px';
        tierApplyButton.style.backgroundColor = '#4CAF50';
        tierApplyButton.style.color = 'white';
        tierApplyButton.style.border = 'none';
        tierApplyButton.style.borderRadius = '4px';
        tierApplyButton.style.cursor = 'pointer';
        tierApplyButton.addEventListener('click', () => {
            updateTierScalingFormula(category, tierInput.value);
        });
        
        tierSection.appendChild(tierTitle);
        tierSection.appendChild(tierLabel);
        tierSection.appendChild(tierInput);
        tierSection.appendChild(tierApplyButton);
    }
    
    // Add help text
    const helpSection = document.createElement('div');
    helpSection.style.backgroundColor = 'rgba(0,0,0,0.3)';
    helpSection.style.padding = '15px';
    helpSection.style.borderRadius = '4px';
    helpSection.style.fontSize = '12px';
    helpSection.style.color = '#aaa';
    
    const helpTitle = document.createElement('div');
    helpTitle.textContent = 'Available Variables:';
    helpTitle.style.fontWeight = 'bold';
    helpTitle.style.marginBottom = '8px';
    
    const helpText = document.createElement('div');
    let helpContent = `
        • <strong>base</strong> - The base stat value<br>
        • <strong>classIndex</strong> - Class number (1=XXS, 2=XS, 3=S, 4=M, 5=L, 6=CAP, 7=CMD, 8=Class 8, 9=TTN)<br>
        • <strong>tierIndex</strong> - Tier number (1-5)<br>
        • <strong>pow(x, y)</strong> - Power function<br>
        • <strong>sqrt(x)</strong> - Square root<br>
        • <strong>abs(x)</strong> - Absolute value<br>
        • <strong>min(x, y)</strong> - Minimum value<br>
        • <strong>max(x, y)</strong> - Maximum value<br><br>
        <strong>Note:</strong> Class scaling provides diminishing returns for higher classes. 
        Components are first scaled by class, then by tier.
    `;
    
    // Add drone port capacity info for Ship Component category
    if (category === "Ship Component") {
        helpContent += `<br><br><strong>Drone Port Capacities:</strong><br>
        Drone ports multiply drone stats by the number of drones they can hold. 
        Larger drone ports can deploy more drones, increasing their total effectiveness.`;
    }
    
    helpText.innerHTML = helpContent;
    
    helpSection.appendChild(helpTitle);
    helpSection.appendChild(helpText);
    
    content.appendChild(classSection);
    content.appendChild(tierSection);
    
    // Add drone port capacity section only for Ship Component category
    if (category === "Ship Component") {
        const dronePortSection = document.createElement('div');
        dronePortSection.style.marginBottom = '30px';
        
        const dronePortTitle = document.createElement('h4');
        dronePortTitle.textContent = 'Drone Port Capacities';
        dronePortTitle.style.margin = '0 0 10px 0';
        dronePortTitle.style.color = 'white';
        dronePortTitle.style.borderBottom = '1px solid #444';
        dronePortTitle.style.paddingBottom = '5px';
        
        const dronePortDescription = document.createElement('div');
        dronePortDescription.textContent = 'Number of drones each size class can hold:';
        dronePortDescription.style.marginBottom = '15px';
        dronePortDescription.style.color = '#ccc';
        dronePortDescription.style.fontSize = '14px';
        
        dronePortSection.appendChild(dronePortTitle);
        dronePortSection.appendChild(dronePortDescription);
        
        // Get current capacities from DroneScaling module or use defaults
        const currentCapacities = window.DroneScaling && window.DroneScaling.DRONE_PORT_CAPACITY ? 
            { ...window.DroneScaling.DRONE_PORT_CAPACITY } : 
            {
                'XXS': 2,
                'XS': 4,
                'Small': 8,
                'Medium': 12,
                'Large': 16,
                'Capital': 24,
                'Commander': 32,
                'Class 8': 40,
                'Titan': 48
            };
        
        // Load saved capacities from localStorage if available
        const savedCapacities = localStorage.getItem('dronePortCapacities');
        if (savedCapacities) {
            try {
                Object.assign(currentCapacities, JSON.parse(savedCapacities));
            } catch (e) {
                console.error('Failed to load saved drone port capacities:', e);
            }
        }
        
        // Create input fields for each class
        const classes = ['XXS', 'XS', 'Small', 'Medium', 'Large', 'Capital', 'Commander', 'Class 8', 'Titan'];
        const capacityInputs = {};
        
        classes.forEach(className => {
            const inputRow = document.createElement('div');
            inputRow.style.display = 'flex';
            inputRow.style.alignItems = 'center';
            inputRow.style.marginBottom = '8px';
            inputRow.style.gap = '10px';
            
            const label = document.createElement('label');
            label.textContent = className + ':';
            label.style.width = '100px';
            label.style.color = '#FFD700';
            label.style.fontSize = '14px';
            
            const input = document.createElement('input');
            input.type = 'number';
            input.min = '1';
            input.max = '100';
            input.value = currentCapacities[className] || 1;
            input.style.width = '80px';
            input.style.padding = '6px';
            input.style.backgroundColor = '#222';
            input.style.color = 'white';
            input.style.border = '1px solid #444';
            input.style.borderRadius = '4px';
            
            capacityInputs[className] = input;
            
            inputRow.appendChild(label);
            inputRow.appendChild(input);
            dronePortSection.appendChild(inputRow);
        });
        
        // Add apply button for drone capacities
        const droneApplyButton = document.createElement('button');
        droneApplyButton.textContent = 'Apply Drone Port Capacities';
        droneApplyButton.style.padding = '8px 16px';
        droneApplyButton.style.marginTop = '15px';
        droneApplyButton.style.backgroundColor = '#4CAF50';
        droneApplyButton.style.color = 'white';
        droneApplyButton.style.border = 'none';
        droneApplyButton.style.borderRadius = '4px';
        droneApplyButton.style.cursor = 'pointer';
        droneApplyButton.style.width = '100%';
        
        droneApplyButton.addEventListener('click', () => {
            // Collect all capacity values
            const newCapacities = {};
            classes.forEach(className => {
                newCapacities[className] = parseInt(capacityInputs[className].value) || 1;
            });
            
            // Save to localStorage
            localStorage.setItem('dronePortCapacities', JSON.stringify(newCapacities));
            
            // Update the DroneScaling module if it exists
            if (window.DroneScaling) {
                // Update the DRONE_PORT_CAPACITY object
                Object.assign(window.DroneScaling.DRONE_PORT_CAPACITY, newCapacities);
                
                // Show confirmation
                droneApplyButton.textContent = 'Applied!';
                droneApplyButton.style.backgroundColor = '#66BB6A';
                setTimeout(() => {
                    droneApplyButton.textContent = 'Apply Drone Port Capacities';
                    droneApplyButton.style.backgroundColor = '#4CAF50';
                }, 1500);
                
                // Update the comparison table to reflect changes
                if (window.debouncedTableUpdate) {
                    window.debouncedTableUpdate({ delay: 100 });
                } else if (typeof updateComparisonTable === 'function') {
                    updateComparisonTable();
                }
                
                // Mark configuration as changed
                if (typeof markConfigurationAsChanged === 'function') {
                    markConfigurationAsChanged();
                }
            }
        });
        
        dronePortSection.appendChild(droneApplyButton);
        content.appendChild(dronePortSection);
    }
    
    content.appendChild(helpSection);
    popup.appendChild(content);
    
    // Add to body and show with animation
    document.body.appendChild(popup);
    setTimeout(() => {
        popup.style.transform = 'translateX(0)';
    }, 10);
}

// Close the scaling formulas popup
function closeScalingFormulasPopup() {
    const popup = document.getElementById('scaling-formulas-popup');
    if (popup) {
        popup.style.transform = 'translateX(400px)';
        setTimeout(() => {
            document.body.removeChild(popup);
        }, 300);
    }
}

// === MODULE EXPORT ===
window.AttributesPanel = {
    openAttributesPanel,
    closeAttributesPanel,
    updateComponentGroupsList,
    selectComponentGroup,
    populateAttributesEditor,
    updateStatValue,
    updateClassScalingFormula,
    updateTierScalingFormula,
    recalculateComponentValues,
    evaluateFormula,
    openScalingFormulasPopup,
    closeScalingFormulasPopup
};

// Also expose functions directly for backward compatibility
window.openAttributesPanel = openAttributesPanel;
window.closeAttributesPanel = closeAttributesPanel;
window.updateComponentGroupsList = updateComponentGroupsList;
window.selectComponentGroup = selectComponentGroup;
window.populateAttributesEditor = populateAttributesEditor;
window.updateStatValue = updateStatValue;
window.updateClassScalingFormula = updateClassScalingFormula;
window.updateTierScalingFormula = updateTierScalingFormula;
window.recalculateComponentValues = recalculateComponentValues;
window.evaluateFormula = evaluateFormula;
window.openScalingFormulasPopup = openScalingFormulasPopup;
window.closeScalingFormulasPopup = closeScalingFormulasPopup;

console.log('Attributes Panel module loaded successfully'); 