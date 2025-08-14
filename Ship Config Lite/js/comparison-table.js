// === MODULE: Comparison Table ===
// This module handles all ship comparison table functionality including
// table creation, updates, ship management, and display formatting.
//
// Dependencies:
// - Global variables: ships, addedShips, nextShipId, shipConfigurations, activeConfigIndices, customAttributes, statsFromCsv, customAttributeOrder
// - Functions: getShipIdentifier(), getRelevantStats(), calculateModifiedStats(), getClassNameFromNumber(), getShipDisplayName()
// - Modules: window.duplicateConfiguration, window.renameConfiguration, window.copyConfiguration, window.pasteConfiguration, window.deleteConfiguration
// - External: copiedConfiguration, componentsLoaded

// Add a ship to the comparison table
function addShipToComparison(ship) {
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
        activeConfigIndices[shipIdentifier] = 0;
        
        console.log(`Created default configuration for ship ${shipIdentifier}`);
    } else {
        console.log(`Using existing ${shipConfigurations[shipIdentifier].length} configurations for ship ${shipIdentifier}`);
    }
    
    // Update the comparison table
    updateComparisonTable();
}

// Initialize the ship comparison table
function initShipComparisonTable() {
    const table = document.getElementById('ship-comparison-table');
    
    // Clear existing content
    table.innerHTML = '';
    
    // Create thead and tbody
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    
    // Create header row
    const headerRow = document.createElement('tr');
    const shipHeader = document.createElement('th');
    shipHeader.textContent = 'SHIP'; // Top-left cell now says SHIP
    shipHeader.className = 'stat-header';
    headerRow.appendChild(shipHeader);
    
    // Create subheader row
    const subHeaderRow = document.createElement('tr');
    const statHeader = document.createElement('th');
    statHeader.className = 'stat-header';
    
    // Create a container for STAT text and search input
    const statHeaderContent = document.createElement('div');
    statHeaderContent.style.display = 'flex';
    statHeaderContent.style.alignItems = 'center';
    statHeaderContent.style.gap = '10px';
    
    // Add STAT text
    const statText = document.createElement('span');
    statText.textContent = 'STAT';
    statText.style.fontWeight = 'bold';
    
    // Create search input wrapper
    const searchWrapper = document.createElement('div');
    searchWrapper.style.position = 'relative';
    searchWrapper.style.flex = '1';
    searchWrapper.style.display = 'flex';
    searchWrapper.style.alignItems = 'center';
    
    // Add search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'stat-filter-input';
    searchInput.placeholder = 'Filter stats...';
    searchInput.style.width = '100%';
    searchInput.style.padding = '4px 24px 4px 8px'; // Add right padding for clear button
    searchInput.style.fontSize = '12px';
    searchInput.style.border = '1px solid var(--border-color)';
    searchInput.style.borderRadius = '3px';
    searchInput.style.backgroundColor = 'var(--input-bg-color)';
    searchInput.style.color = 'var(--text-color)';
    searchInput.style.outline = 'none';
    
    // Add clear button
    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'stat-filter-clear';
    clearButton.innerHTML = '×';
    clearButton.style.position = 'absolute';
    clearButton.style.right = '4px';
    clearButton.style.top = '50%';
    clearButton.style.transform = 'translateY(-50%)';
    clearButton.style.background = 'none';
    clearButton.style.border = 'none';
    clearButton.style.color = 'var(--secondary-text-color)';
    clearButton.style.fontSize = '16px';
    clearButton.style.cursor = 'pointer';
    clearButton.style.padding = '0 4px';
    clearButton.style.lineHeight = '1';
    clearButton.style.display = 'none'; // Hidden by default
    clearButton.style.transition = 'color 0.2s';
    clearButton.title = 'Clear filter';
    
    // Add hover effect for clear button
    clearButton.addEventListener('mouseenter', () => {
        clearButton.style.color = 'var(--text-color)';
    });
    
    clearButton.addEventListener('mouseleave', () => {
        clearButton.style.color = 'var(--secondary-text-color)';
    });
    
    // Add click handler for clear button
    clearButton.addEventListener('click', () => {
        searchInput.value = '';
        clearButton.style.display = 'none';
        filterStatRows({ target: searchInput });
        searchInput.focus();
    });
    
    // Add event listeners for search input
    searchInput.addEventListener('input', (e) => {
        // Show/hide clear button based on input content
        clearButton.style.display = e.target.value ? 'block' : 'none';
        filterStatRows(e);
    });
    
    // Assemble the search wrapper
    searchWrapper.appendChild(searchInput);
    searchWrapper.appendChild(clearButton);
    
    statHeaderContent.appendChild(statText);
    statHeaderContent.appendChild(searchWrapper);
    statHeader.appendChild(statHeaderContent);
    
    subHeaderRow.appendChild(statHeader);
    
    // Add rows to thead
    thead.appendChild(headerRow);
    thead.appendChild(subHeaderRow);
    
    // Create data rows
    const statsToShow = getRelevantStats();
    console.log("Stats to show in table:", statsToShow);
    
    statsToShow.forEach((stat, index) => {
        const row = document.createElement('tr');
        row.setAttribute('data-stat-name', stat);
        row.setAttribute('data-stat-index', index);
        row.className = 'stat-row';
        row.draggable = true;
        row.style.cursor = 'grab';
        
        // Add event listeners for drag and drop
        row.addEventListener('dragstart', handleRowDragStart);
        row.addEventListener('dragover', handleRowDragOver);
        row.addEventListener('drop', handleRowDrop);
        row.addEventListener('dragend', handleRowDragEnd);
        
        const statCell = document.createElement('td');
        statCell.className = 'stat-name';
        
        // Create a container for the stat name and controls
        const statNameContainer = document.createElement('div');
        statNameContainer.className = 'stat-name-container';
        statNameContainer.style.display = 'flex';
        statNameContainer.style.alignItems = 'center';
        statNameContainer.style.justifyContent = 'space-between';
        
        // Add the stat name
        const statNameText = document.createElement('span');
        statNameText.textContent = stat;
        statNameText.className = 'stat-name-text';
        statNameText.setAttribute('data-stat-name', stat);
        statNameText.style.flex = '1'; // Allow it to grow
        
        // Make all attributes editable - both custom and original
        statNameText.contentEditable = true;
        statNameText.setAttribute('spellcheck', 'false');
        if (customAttributes.includes(stat)) {
            // Custom attributes get different styling
            statNameText.classList.add('custom-attribute');
        } else {
            // Original attributes get a different style
            statNameText.classList.add('original-attribute');
        }
        
        // Add edit functionality to all attributes
        statNameText.addEventListener('blur', function() {
            if (customAttributes.includes(stat)) {
                renameCustomAttribute(stat, this.textContent.trim());
            } else {
                // Original attributes can be renamed too
                renameOriginalAttribute(stat, this.textContent.trim());
            }
        });
        
        statNameText.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.blur();
            }
        });
        
        // Add info button (always visible)
        const infoButton = document.createElement('button');
        infoButton.innerHTML = 'ⓘ';
        infoButton.className = 'stat-info-button';
        infoButton.style.padding = '2px 6px';
        infoButton.style.fontSize = '14px';
        infoButton.style.background = 'transparent';
        infoButton.style.border = '1px solid #666';
        infoButton.style.borderRadius = '50%';
        infoButton.style.cursor = 'pointer';
        infoButton.style.color = '#999';
        infoButton.style.width = '20px';
        infoButton.style.height = '20px';
        infoButton.style.display = 'flex';
        infoButton.style.alignItems = 'center';
        infoButton.style.justifyContent = 'center';
        infoButton.style.transition = 'all 0.2s';
        infoButton.style.marginLeft = '8px';
        infoButton.style.marginRight = '8px';
        infoButton.title = 'Edit stat description';
        
        // Highlight if description exists
        if (window.statDescriptions && window.statDescriptions[stat]) {
            infoButton.style.color = '#3d8bf8';
            infoButton.style.borderColor = '#3d8bf8';
        }
        
        // Add hover effect
        infoButton.addEventListener('mouseenter', () => {
            infoButton.style.background = 'rgba(61, 139, 248, 0.1)';
            infoButton.style.borderColor = '#3d8bf8';
            infoButton.style.color = '#3d8bf8';
        });
        
        infoButton.addEventListener('mouseleave', () => {
            if (window.statDescriptions && window.statDescriptions[stat]) {
                infoButton.style.background = 'transparent';
                infoButton.style.color = '#3d8bf8';
                infoButton.style.borderColor = '#3d8bf8';
            } else {
                infoButton.style.background = 'transparent';
                infoButton.style.color = '#999';
                infoButton.style.borderColor = '#666';
            }
        });
        
        // Add click handler for stat description
        infoButton.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Info button clicked for stat:', stat);
            if (typeof showStatDescriptionModal === 'function') {
                showStatDescriptionModal(stat);
            } else {
                console.error('showStatDescriptionModal is not available');
                alert(`Clicked info for ${stat} - but modal function not found`);
            }
        });
        
        // Add controls (visible on hover)
        const statControls = document.createElement('div');
        statControls.className = 'stat-controls';
        statControls.style.display = 'flex';
        statControls.style.visibility = 'hidden';
        
        // Add a handle for dragging
        const dragHandle = document.createElement('span');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '≡';
        dragHandle.style.cursor = 'grab';
        dragHandle.style.fontSize = '14px';
        dragHandle.style.color = '#888';
        dragHandle.style.padding = '0 4px';
        
        // Make sure the drag handle triggers the row's drag
        dragHandle.addEventListener('mousedown', (e) => {
            // Find the parent tr element
            let tr = e.target;
            while (tr && tr.tagName !== 'TR') {
                tr = tr.parentElement;
            }
            
            if (tr) {
                // Set a flag directly on the row element
                tr.setAttribute('data-dragging', 'true');
                
                // Store the drag handle element for reference
                window.activeDragHandle = dragHandle;
                
                // Add a strong visual indication
                dragHandle.style.backgroundColor = 'rgba(76, 175, 80, 0.5)';
                dragHandle.style.color = 'white';
                
                // Start drag operation with a slight delay to let the visual changes apply
                setTimeout(() => {
                    try {
                        tr.draggable = true;
                        
                        // Create and dispatch a dragstart event
                        const event = new MouseEvent('dragstart', {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        });
                        
                        tr.dispatchEvent(event);
                        console.log("Manual drag initiated from handle");
                    } catch (err) {
                        console.error("Error initiating drag:", err);
                    }
                }, 50);
            }
        });
        
        statControls.appendChild(dragHandle);
        
        // Add delete button for all attributes
        const deleteButton = document.createElement('span');
        deleteButton.className = 'delete-attribute';
        deleteButton.innerHTML = '×';
        deleteButton.title = 'Delete this attribute';
        deleteButton.style.cursor = 'pointer';
        deleteButton.style.color = '#ff6b6b';
        deleteButton.style.fontSize = '16px';
        deleteButton.style.fontWeight = 'bold';
        
        // Different warnings based on attribute type
        deleteButton.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Determine if this is a custom attribute with better logic
            let isCustomAttribute;
            
            if (statsFromCsv.length === 0) {
                // If CSV had no stats, rely only on customAttributes array
                isCustomAttribute = customAttributes.includes(stat);
                console.log(`No CSV stats available, checking customAttributes only for "${stat}": ${isCustomAttribute}`);
            } else {
                // Normal case: check both customAttributes array AND if it's not in CSV stats
                isCustomAttribute = customAttributes.includes(stat) || !statsFromCsv.includes(stat);
                console.log(`Checking "${stat}" - in customAttributes: ${customAttributes.includes(stat)}, in statsFromCsv: ${statsFromCsv.includes(stat)}, isCustom: ${isCustomAttribute}`);
            }
            
            if (isCustomAttribute) {
                if (confirm(`Are you sure you want to delete the custom attribute "${stat}"?`)) {
                    // Make sure it's in the customAttributes array for proper deletion
                    if (!customAttributes.includes(stat)) {
                        console.log(`Adding ${stat} to customAttributes array for deletion`);
                        customAttributes.push(stat);
                    }
                    deleteCustomAttribute(stat);
                }
            } else {
                // Original attributes get a stronger warning
                if (confirm(`WARNING: This is an original ship attribute from the CSV file. Deleting it may affect ship functionality.\n\nAre you REALLY sure you want to delete the attribute "${stat}"?`)) {
                    deleteOriginalAttribute(stat);
                }
            }
        });
        
        statControls.appendChild(deleteButton);
        
        // Add hover effects to show controls
        statNameContainer.addEventListener('mouseenter', function() {
            statControls.style.visibility = 'visible';
        });
        
        statNameContainer.addEventListener('mouseleave', function() {
            statControls.style.visibility = 'hidden';
        });
        
        // Assemble the container
        statNameContainer.appendChild(statNameText);
        statNameContainer.appendChild(infoButton);
        statNameContainer.appendChild(statControls);
        statCell.appendChild(statNameContainer);
        
        row.appendChild(statCell);
        
        // Add hover tooltip if description exists
        if (window.statDescriptions && window.statDescriptions[stat]) {
            let tooltipTimeout;
            let tooltip;
            
            statNameText.style.cursor = 'help';
            statNameText.title = window.statDescriptions[stat];
            
            statNameText.addEventListener('mouseenter', (e) => {
                tooltipTimeout = setTimeout(() => {
                    tooltip = document.createElement('div');
                    tooltip.className = 'stat-description-tooltip';
                    tooltip.style.position = 'absolute';
                    tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
                    tooltip.style.color = '#ccc';
                    tooltip.style.padding = '10px';
                    tooltip.style.borderRadius = '4px';
                    tooltip.style.border = '1px solid #444';
                    tooltip.style.maxWidth = '300px';
                    tooltip.style.fontSize = '12px';
                    tooltip.style.lineHeight = '1.4';
                    tooltip.style.zIndex = '9999';
                    tooltip.style.pointerEvents = 'none';
                    tooltip.textContent = window.statDescriptions[stat];
                    
                    document.body.appendChild(tooltip);
                    
                    const rect = statNameText.getBoundingClientRect();
                    tooltip.style.left = rect.left + 'px';
                    tooltip.style.top = (rect.bottom + 5) + 'px';
                    
                    // Adjust position if tooltip goes off screen
                    const tooltipRect = tooltip.getBoundingClientRect();
                    if (tooltipRect.right > window.innerWidth) {
                        tooltip.style.left = (window.innerWidth - tooltipRect.width - 10) + 'px';
                    }
                    if (tooltipRect.bottom > window.innerHeight) {
                        tooltip.style.top = (rect.top - tooltipRect.height - 5) + 'px';
                    }
                }, 500); // Show after 500ms hover
            });
            
            statNameText.addEventListener('mouseleave', () => {
                clearTimeout(tooltipTimeout);
                if (tooltip) {
                    document.body.removeChild(tooltip);
                    tooltip = null;
                }
            });
        }
        
        tbody.appendChild(row);
    });
    
    // Add "Add Attribute" row
    const addRow = document.createElement('tr');
    addRow.className = 'add-attribute-row';
    
    const addCell = document.createElement('td');
    addCell.className = 'add-attribute-cell';
    
    const addButton = document.createElement('button');
    addButton.className = 'add-attribute-button';
    addButton.innerHTML = '+ Add Attribute';
    addButton.style.width = '100%';
    addButton.style.padding = '5px';
    addButton.style.backgroundColor = '#333';
    addButton.style.border = '1px solid #555';
    addButton.style.color = '#ccc';
    addButton.style.cursor = 'pointer';
    addButton.style.borderRadius = '3px';
    
    addButton.addEventListener('click', function() {
        console.log("Add attribute button clicked");
        showAddAttributeModal();
    });
    
    addCell.appendChild(addButton);
    addRow.appendChild(addCell);
    tbody.appendChild(addRow);
    
    // Add thead and tbody to table
    table.appendChild(thead);
    table.appendChild(tbody);
}

// Filter stat rows based on search input
function filterStatRows(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    const table = document.getElementById('ship-comparison-table');
    const rows = table.querySelectorAll('tbody tr.stat-row');
    
    // If search is empty, show all rows
    if (!searchTerm) {
        rows.forEach(row => {
            row.style.display = '';
        });
        return;
    }
    
    // Filter rows based on search term
    rows.forEach(row => {
        const statName = row.getAttribute('data-stat-name') || '';
        const statText = row.querySelector('.stat-name-text')?.textContent || '';
        
        // Check if either the attribute name or the displayed text matches
        if (statName.toLowerCase().includes(searchTerm) || 
            statText.toLowerCase().includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Helper function to format numbers with commas and limited decimal places
function formatNumber(value) {
    // If not a number, just return the value as is
    if (isNaN(value)) return value;
    
    // Convert to a number if it's a string
    const num = typeof value === 'string' ? parseFloat(value) : value;
    
    // Format with commas and max 4 decimal places
    return num.toLocaleString(undefined, {
        maximumFractionDigits: 4
    });
}

// Update the comparison table with all added ships
function updateComparisonTable() {
    console.log("Updating comparison table with current configurations...");
    console.log("Active config indices:", activeConfigIndices);
    console.log("Ship configurations:", shipConfigurations);
    console.log("Custom attributes:", customAttributes);
    
    // Save the current filter value before rebuilding
    const currentFilterInput = document.getElementById('stat-filter-input');
    const currentFilterValue = currentFilterInput ? currentFilterInput.value : '';
    
    // Only repair mismatches if we're not in the middle of a deletion operation
    if (!window.currentlyDeletingAttribute) {
        repairCustomAttributesArray();
    }
    
    // Always start by rebuilding the table structure to ensure we have all stats
    const tableElement = document.getElementById('ship-comparison-table');
    if (tableElement) {
        tableElement.innerHTML = '';
        initShipComparisonTable();
    }
    
    // Restore the filter value and apply filtering
    if (currentFilterValue) {
        const newFilterInput = document.getElementById('stat-filter-input');
        if (newFilterInput) {
            newFilterInput.value = currentFilterValue;
            // Show the clear button since there's text
            const clearButton = newFilterInput.parentElement.querySelector('.stat-filter-clear');
            if (clearButton) {
                clearButton.style.display = 'block';
            }
            // Trigger the filter function
            filterStatRows({ target: newFilterInput });
        }
    }
    
    // Then get references to the newly created table elements
    const table = document.getElementById('ship-comparison-table');
    const headerRow = table.querySelector('thead tr:first-child');
    const subHeaderRow = table.querySelector('thead tr:last-child');
    const rows = table.querySelectorAll('tbody tr:not(.add-attribute-row)'); // Skip the add attribute row
    
    // Table already has the correct rows - no need to remove anything
    
    // Add columns for each ship
    addedShips.forEach(ship => {
        if (!ship || !ship.id) {
            console.error("Invalid ship object in added ships:", ship);
            return;
        }
        
        const shipId = ship.id;
        const shipIdentifier = getShipIdentifier(ship);
        
        console.log(`Processing ship ${ship['Ship Name']} (ID: ${shipId}, Identifier: ${shipIdentifier})`);
        
        // Make sure we have configurations for this ship
        if (!shipConfigurations[shipIdentifier] || !Array.isArray(shipConfigurations[shipIdentifier]) || 
            shipConfigurations[shipIdentifier].length === 0) {
            console.warn(`Missing configurations for ship ${shipIdentifier}, creating default`);
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
            activeConfigIndices[shipId] = 0;
        }
        
        // Add ship header
        const shipHeader = document.createElement('th');
        shipHeader.colSpan = 2; // Spans over BASE and MODIFIED
        shipHeader.className = 'ship-header';
        shipHeader.setAttribute('data-ship-id', shipId);
        shipHeader.setAttribute('data-ship-identifier', shipIdentifier);
        
        // Create ship header content with flexbox layout
        const headerContent = document.createElement('div');
        headerContent.className = 'ship-column-header';
        
        // Make header draggable without dedicated drag handle
        headerContent.style.cursor = 'grab';
        headerContent.style.userSelect = 'none';
        
        // Create selectors and buttons container (top row)
        const selectorsButtonsContainer = document.createElement('div');
        selectorsButtonsContainer.className = 'selectors-buttons-container';
        selectorsButtonsContainer.style.display = 'flex';
        selectorsButtonsContainer.style.alignItems = 'center';
        selectorsButtonsContainer.style.width = '100%';
        selectorsButtonsContainer.style.gap = '8px';
        
        // Ship selector dropdown - Convert to custom dropdown
        const shipSelectorBtn = document.createElement('button');
        shipSelectorBtn.className = 'header-button ship-selector-btn';
        shipSelectorBtn.style.flex = '1';
        shipSelectorBtn.style.padding = '5px 15px';
        shipSelectorBtn.style.height = '36px';
        shipSelectorBtn.style.minHeight = '36px';
        shipSelectorBtn.style.fontSize = '14px';
        shipSelectorBtn.style.backgroundColor = '#222';
        shipSelectorBtn.style.color = 'white';
        shipSelectorBtn.style.border = '1px solid #444';
        shipSelectorBtn.style.display = 'flex';
        shipSelectorBtn.style.alignItems = 'center';
        shipSelectorBtn.style.justifyContent = 'space-between';
        shipSelectorBtn.style.gap = '10px';
        shipSelectorBtn.style.textAlign = 'left';
        shipSelectorBtn.setAttribute('data-ship-id', shipId);
        
        // Create button content
        const shipNameSpan = document.createElement('span');
        shipNameSpan.style.overflow = 'hidden';
        shipNameSpan.style.textOverflow = 'ellipsis';
        shipNameSpan.style.whiteSpace = 'nowrap';
        
        // Set the current ship name
        if (ship['Ship Name'] === 'Select Ship to Configure') {
            shipNameSpan.textContent = 'Select a ship to configure';
            shipNameSpan.style.fontStyle = 'italic';
            shipNameSpan.style.opacity = '0.7';
        } else {
            const displayName = (typeof getShipDisplayName === 'function') ? 
                getShipDisplayName(ship) : 
                `${ship.Manufacturer || 'Unknown'} ${ship['Ship Name'] || 'Unknown Ship'}`;
            shipNameSpan.textContent = `${displayName} (${getClassNameFromNumber(ship.Class)}, ${ship.Spec})`;
        }
        
        shipSelectorBtn.appendChild(shipNameSpan);
        
        // Add dropdown arrow
        const dropdownArrow = document.createElement('span');
        dropdownArrow.textContent = '▼';
        dropdownArrow.style.fontSize = '10px';
        dropdownArrow.style.marginLeft = 'auto';
        shipSelectorBtn.appendChild(dropdownArrow);
        
        // Create dropdown menu for ship selection
        const shipDropdown = document.createElement('div');
        shipDropdown.className = 'actions-dropdown-menu ship-selector-dropdown-menu';
        shipDropdown.style.display = 'none';
        shipDropdown.style.minWidth = '350px';
        shipDropdown.style.maxHeight = '500px';
        shipDropdown.style.overflowY = 'auto';
        shipDropdown.setAttribute('data-ship-id', shipId);
        
        // Add placeholder option
        const placeholderItem = document.createElement('div');
        placeholderItem.className = 'actions-menu-item';
        placeholderItem.textContent = 'Select a ship to configure';
        placeholderItem.style.fontStyle = 'italic';
        placeholderItem.style.opacity = '0.7';
        placeholderItem.addEventListener('click', (e) => {
            e.stopPropagation();
            shipDropdown.style.display = 'none';
        });
        shipDropdown.appendChild(placeholderItem);
        
        // Add custom ship option
        const customShipItem = document.createElement('div');
        customShipItem.className = 'actions-menu-item';
        customShipItem.textContent = '+ New Custom Ship';
        customShipItem.style.color = '#3d8bf8';
        customShipItem.style.fontWeight = 'bold';
        customShipItem.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof showAddCustomShipModal === 'function') {
                showAddCustomShipModal(shipSelectorBtn, shipId);
            } else {
                console.error('showAddCustomShipModal not available yet');
                alert('Custom ship creation is not available at the moment. Please try again.');
            }
            shipDropdown.style.display = 'none';
        });
        shipDropdown.appendChild(customShipItem);
        
        // Add separator
        const separatorDiv = document.createElement('div');
        separatorDiv.style.height = '1px';
        separatorDiv.style.backgroundColor = '#444';
        separatorDiv.style.margin = '4px 0';
        shipDropdown.appendChild(separatorDiv);
        
        // Group ships by class
        const shipsByClass = {};
        const classOrder = ["XXS", "XS", "Small", "Medium", "Large", "Capital", "Commander", "Class 8", "Titan"];
        
        // Initialize groups
        classOrder.forEach(className => {
            shipsByClass[className] = [];
        });
        
        // Group ships
        ships.forEach((s, index) => {
            const className = getClassNameFromNumber(s.Class);
            if (shipsByClass[className]) {
                shipsByClass[className].push({ ship: s, index: index });
            }
        });
        
        // Add ships grouped by class
        classOrder.forEach(className => {
            const classShips = shipsByClass[className];
            if (classShips.length > 0) {
                // Add class header as clickable link
                const classHeader = document.createElement('div');
                classHeader.style.padding = '8px 10px';
                classHeader.style.fontWeight = 'bold';
                classHeader.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                classHeader.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
                classHeader.style.fontSize = '14px';
                classHeader.style.textTransform = 'uppercase';
                classHeader.style.letterSpacing = '1px';
                classHeader.style.color = '#3d8bf8';
                classHeader.style.cursor = 'pointer';
                classHeader.style.userSelect = 'none';
                classHeader.style.display = 'flex';
                classHeader.style.justifyContent = 'space-between';
                classHeader.style.alignItems = 'center';
                classHeader.style.transition = 'background-color 0.2s';
                
                // Add top border for visual separation (except for first section)
                if (shipDropdown.children.length > 3) { // After placeholder, custom ship, and separator
                    classHeader.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
                    classHeader.style.marginTop = '4px';
                }
                
                // Create the header content with emoji
                const headerContent = document.createElement('span');
                headerContent.textContent = `🚀 Add All ${className}`;
                classHeader.appendChild(headerContent);
                
                // Add ship count
                const shipCount = document.createElement('span');
                shipCount.style.fontSize = '12px';
                shipCount.style.color = '#888';
                shipCount.textContent = `(${classShips.length})`;
                classHeader.appendChild(shipCount);
                
                // Add hover effect
                classHeader.addEventListener('mouseenter', () => {
                    classHeader.style.backgroundColor = 'rgba(61, 139, 248, 0.1)';
                });
                
                classHeader.addEventListener('mouseleave', () => {
                    classHeader.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                });
                
                // Add click handler to add all ships of this class
                classHeader.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // Get the numeric class value from the first ship in this class group
                    const firstShipInClass = classShips[0].ship;
                    const classValue = firstShipInClass.Class;
                    
                    // Get the ship ID from the dropdown (the column that initiated this dropdown)
                    const initiatingShipId = parseInt(shipDropdown.getAttribute('data-ship-id'));
                    
                    // Check if this is a placeholder ship
                    const initiatingShip = addedShips.find(s => s.id === initiatingShipId);
                    const isPlaceholder = initiatingShip && initiatingShip['Ship Name'] === 'Select Ship to Configure';
                    
                    // Call the function to add all ships of this class
                    addAllShipsOfClass(classValue);
                    
                    // Remove the initiating column if it's a placeholder
                    if (isPlaceholder) {
                        removeShipFromComparison(initiatingShipId);
                    }
                    
                    // Close the dropdown
                    shipDropdown.style.display = 'none';
                });
                
                shipDropdown.appendChild(classHeader);
                
                // Add ships in this class
                classShips.forEach(({ ship: s, index }) => {
                    const shipItem = document.createElement('div');
                    shipItem.className = 'actions-menu-item';
                    shipItem.style.paddingLeft = '25px'; // Indent under class
                    shipItem.style.fontSize = '13px'; // Smaller font for ship items
                    
                    const displayName = (typeof getShipDisplayName === 'function') ? 
                        getShipDisplayName(s) : 
                        `${s.Manufacturer || 'Unknown'} ${s['Ship Name'] || 'Unknown Ship'}`;
                    shipItem.textContent = `${displayName} (${getClassNameFromNumber(s.Class)}, ${s.Spec})`;
                    
                    // Highlight if this is the current ship
                    if (s['Ship Name'] === ship['Ship Name'] && s.Manufacturer === ship.Manufacturer) {
                        shipItem.style.backgroundColor = 'rgba(61, 139, 248, 0.1)';
                        shipItem.style.fontWeight = 'bold';
                    }
                    
                    shipItem.addEventListener('click', (e) => {
                        e.stopPropagation();
                        changeShipInComparison(shipId, s);
                        shipDropdown.style.display = 'none';
                    });
                    
                    shipDropdown.appendChild(shipItem);
                });
            }
        });
        
        // Add dropdown to body
        document.body.appendChild(shipDropdown);
        
        // Toggle dropdown on button click
        shipSelectorBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Position the menu below the button
            const rect = this.getBoundingClientRect();
            shipDropdown.style.top = `${rect.bottom + 5}px`;
            shipDropdown.style.left = `${rect.left}px`;
            
            // Adjust if menu goes off screen
            const menuRect = shipDropdown.getBoundingClientRect();
            if (menuRect.right > window.innerWidth) {
                shipDropdown.style.left = `${rect.right - shipDropdown.offsetWidth}px`;
            }
            
            // Toggle visibility
            if (shipDropdown.style.display === 'none') {
                // Hide all other menus first
                document.querySelectorAll('.actions-dropdown-menu').forEach(menu => {
                    menu.style.display = 'none';
                });
                
                shipDropdown.style.display = 'block';
                
                // Close when clicking outside
                const closeMenu = function() {
                    shipDropdown.style.display = 'none';
                    document.removeEventListener('click', closeMenu);
                };
                
                // Add slight delay to avoid immediate closing
                setTimeout(() => {
                    document.addEventListener('click', closeMenu);
                }, 10);
            } else {
                shipDropdown.style.display = 'none';
            }
        });
        
        selectorsButtonsContainer.appendChild(shipSelectorBtn);
        
        // Config dropdown container
        const configContainer = document.createElement('div');
        configContainer.className = 'config-container';
        configContainer.style.flex = '1';
        
        // Config dropdown
        const configDropdown = document.createElement('select');
        configDropdown.className = 'config-dropdown';
        configDropdown.style.width = '100%';
        configDropdown.setAttribute('data-ship-id', shipId);
        configDropdown.setAttribute('data-ship-identifier', shipIdentifier);
        
        // Get configurations for this ship
        const configs = shipConfigurations[shipIdentifier] || [];
        
        // Add options for each configuration
        configs.forEach((config, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = config.name || `Config ${index + 1}`;
            configDropdown.appendChild(option);
        });
        
        // Add "Add New Config" option
        const addConfigOption = document.createElement('option');
        addConfigOption.value = 'add-new';
        addConfigOption.textContent = '+ Add New Config';
        configDropdown.appendChild(addConfigOption);
        
        // Get the active config index for this ship
        const activeConfigIndex = activeConfigIndices[shipId];
        
        console.log(`Setting dropdown for ship ${ship['Ship Name']} (${shipIdentifier}) to config index ${activeConfigIndex}`);
        
        // Set the selected value in the dropdown
        if (activeConfigIndex !== undefined && activeConfigIndex < configs.length) {
            configDropdown.value = activeConfigIndex;
        } else {
            // If active index is invalid, reset it to 0
            activeConfigIndices[shipId] = 0;
            configDropdown.value = 0;
        }
        
        // Event listener for configuration change
        configDropdown.addEventListener('change', handleConfigChange);
        
        // Add dropdown to container
        configContainer.appendChild(configDropdown);
        
        // Create the three main buttons
        // 1. Edit Config Button
        const editConfigBtn = document.createElement('button');
        editConfigBtn.className = 'ship-control-btn';
        editConfigBtn.textContent = 'Edit Config';
        editConfigBtn.setAttribute('data-ship-id', shipId);
        editConfigBtn.setAttribute('data-ship-identifier', shipIdentifier);
        editConfigBtn.addEventListener('click', function() {
            const shipId = parseInt(this.getAttribute('data-ship-id'));
            const shipIdentifier = this.getAttribute('data-ship-identifier');
            const configIndex = activeConfigIndices[shipId] || 0;
            if (typeof openComponentsPanel === 'function') {
                openComponentsPanel(shipId, configIndex, shipIdentifier);
            } else {
                console.error('openComponentsPanel not available yet');
                alert('Components panel is not available at the moment. Please try again.');
            }
        });
        
        // 2. Actions Dropdown Button
        const actionsBtn = document.createElement('button');
        actionsBtn.className = 'ship-control-btn actions-btn';
        actionsBtn.textContent = 'Actions ▾';
        actionsBtn.setAttribute('data-ship-id', shipId);
        actionsBtn.setAttribute('data-ship-identifier', shipIdentifier);
        actionsBtn.setAttribute('data-dropdown-id', `actions-menu-${shipId}`);
        
        // We don't need the separate Remove Ship button anymore as it will be in the Actions menu
        
        // Update button content to use icons (black and white)
        editConfigBtn.innerHTML = '✎';
        editConfigBtn.title = 'Edit Config';
        
        actionsBtn.innerHTML = '⋮';
        actionsBtn.title = 'Actions';
        
        // Add buttons to the config container instead of a separate button container
        configContainer.appendChild(editConfigBtn);
        configContainer.appendChild(actionsBtn);
        
        // === ACTIONS MENU FUNCTIONALITY ===
        // Create dropdown menu for actions button
        const actionsMenu = document.createElement('div');
        actionsMenu.className = 'actions-dropdown-menu';
        actionsMenu.id = `actions-menu-${shipId}`;
        actionsMenu.style.display = 'none';
        
        // Create actions menu items
        const createMenuItem = (text, handler, color = null) => {
            const menuItem = document.createElement('div');
            menuItem.className = 'actions-menu-item';
            menuItem.textContent = text;
            
            if (color) {
                menuItem.style.color = color;
            }
            
            menuItem.addEventListener('click', (e) => {
                e.stopPropagation();
                handler();
                actionsMenu.style.display = 'none';
            });
            
            return menuItem;
        };
        
        // Create menu items
        const duplicateItem = createMenuItem('Duplicate Config', () => {
            duplicateConfiguration(shipId, activeConfigIndices[shipId] || 0, shipIdentifier);
        });
        duplicateItem.setAttribute('data-action', 'duplicate');
        actionsMenu.appendChild(duplicateItem);
        
        const duplicateUpgradeItem = createMenuItem('Upgrade Config', () => {
            if (typeof duplicateAndUpgradeConfiguration === 'function') {
                duplicateAndUpgradeConfiguration(shipId, activeConfigIndices[shipId] || 0, shipIdentifier);
            } else {
                console.error('duplicateAndUpgradeConfiguration not available yet');
                alert('Configuration upgrade is not available at the moment. Please try again.');
            }
        }, '#FFD700'); // Gold color
        duplicateUpgradeItem.setAttribute('data-action', 'duplicate-upgrade');
        actionsMenu.appendChild(duplicateUpgradeItem);
        
        const renameItem = createMenuItem('Rename Config', () => {
            renameConfiguration(shipId, activeConfigIndices[shipId] || 0, shipIdentifier);
        });
        renameItem.setAttribute('data-action', 'rename');
        actionsMenu.appendChild(renameItem);
        
        // Add separator
        const separator = document.createElement('div');
        separator.style.height = '1px';
        separator.style.backgroundColor = '#444';
        separator.style.margin = '4px 0';
        actionsMenu.appendChild(separator);
        
        const copyItem = createMenuItem('Copy Config', () => {
            copyConfiguration(shipId, activeConfigIndices[shipId] || 0, shipIdentifier);
        }, '#66bb6a'); // Green
        copyItem.setAttribute('data-action', 'copy');
        actionsMenu.appendChild(copyItem);
        
        const pasteMenuItem = createMenuItem('Paste Config', () => {
            pasteConfiguration(shipId, shipIdentifier);
        }, '#3d8bf8'); // Blue
        pasteMenuItem.setAttribute('data-action', 'paste');
        
        // Disable paste if no configuration is copied
        if (!copiedConfiguration) {
            pasteMenuItem.style.opacity = '0.5';
            pasteMenuItem.style.cursor = 'not-allowed';
            
            // Remove the click event
            const newPasteItem = pasteMenuItem.cloneNode(true);
            actionsMenu.appendChild(newPasteItem);
        } else {
            actionsMenu.appendChild(pasteMenuItem);
        }
        
        // Add another separator
        const separator2 = document.createElement('div');
        separator2.style.height = '1px';
        separator2.style.backgroundColor = '#444';
        separator2.style.margin = '4px 0';
        actionsMenu.appendChild(separator2);
        
        const deleteItem = createMenuItem('Delete Config', () => {
            deleteConfiguration(shipId, activeConfigIndices[shipId] || 0, shipIdentifier);
        }, '#ff6b6b'); // Red
        deleteItem.setAttribute('data-action', 'delete');
        actionsMenu.appendChild(deleteItem);
        
        // Add another separator
        const separator3 = document.createElement('div');
        separator3.style.height = '1px';
        separator3.style.backgroundColor = '#444';
        separator3.style.margin = '4px 0';
        actionsMenu.appendChild(separator3);
        
        // Add Export CSV option
        const exportItem = createMenuItem('📊 Export CSV', () => {
            exportShipModifiedStatsToCSV(ship, shipIdentifier, activeConfigIndices[shipId] || 0);
        }, '#4CAF50'); // Green
        exportItem.setAttribute('data-action', 'export');
        actionsMenu.appendChild(exportItem);
        
        // Add Export Full CSV option
        const exportFullItem = createMenuItem('📈 Export Full CSV', () => {
            exportShipFullStatsToCSV(ship, shipIdentifier, activeConfigIndices[shipId] || 0);
        }, '#4CAF50'); // Green
        exportFullItem.setAttribute('data-action', 'export-full');
        exportFullItem.title = 'Export base stats, modified stats, percentage changes, and component counts';
        actionsMenu.appendChild(exportFullItem);
        
        // Add Save Ship JSON option
        const saveShipItem = createMenuItem('💾 Save Ship JSON', () => {
            if (typeof saveShipJSON === 'function') {
                saveShipJSON(shipId, shipIdentifier);
            } else {
                console.error('saveShipJSON not available yet');
                alert('Save Ship JSON functionality is not available at the moment. Please try again.');
            }
        }, '#3d8bf8'); // Blue
        saveShipItem.setAttribute('data-action', 'save-ship');
        saveShipItem.title = 'Save this ship and all its configurations as a separate JSON file';
        actionsMenu.appendChild(saveShipItem);
        
        // Add another separator before Remove Ship
        const separator4 = document.createElement('div');
        separator4.style.height = '1px';
        separator4.style.backgroundColor = '#444';
        separator4.style.margin = '4px 0';
        actionsMenu.appendChild(separator4);
        
        // Add Remove Ship option
        const removeShipItem = createMenuItem('Remove Ship', () => {
            removeShipFromComparison(shipId);
        }, '#ff6b6b'); // Red
        removeShipItem.setAttribute('data-action', 'remove');
        actionsMenu.appendChild(removeShipItem);
        
        // Add the dropdown menu to the document
        document.body.appendChild(actionsMenu);
        
        // Toggle menu display on click
        actionsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Position the menu below the actions button
            const rect = this.getBoundingClientRect();
            actionsMenu.style.top = `${rect.bottom + 5}px`;
            actionsMenu.style.left = `${rect.left - 144 + rect.width/2}px`; // Center menu under the button
            
            // Toggle visibility
            if (actionsMenu.style.display === 'none') {
                // Hide all other menus first
                document.querySelectorAll('.actions-dropdown-menu').forEach(menu => {
                    menu.style.display = 'none';
                });
                
                actionsMenu.style.display = 'block';
                
                // Close when clicking outside
                const closeMenu = function() {
                    actionsMenu.style.display = 'none';
                    document.removeEventListener('click', closeMenu);
                };
                
                // Add slight delay to avoid immediate closing
                setTimeout(() => {
                    document.addEventListener('click', closeMenu);
                }, 10);
            } else {
                actionsMenu.style.display = 'none';
            }
        });
        
        // Store the actions menu reference for updates when copying
        actionsBtn.actionsMenu = actionsMenu;
        // === END ACTIONS MENU FUNCTIONALITY ===
        
        selectorsButtonsContainer.appendChild(configContainer);
        
        // Add container to header content
        headerContent.appendChild(selectorsButtonsContainer);
        
        // === ADD SHIP SCORING DISPLAY ===
        // Calculate scores for this ship (only if not a placeholder)
        if (ship['Ship Name'] !== 'Select Ship to Configure') {
            const activeIndex = activeConfigIndices[shipId] || 0;
            const activeConfig = shipConfigurations[shipIdentifier][activeIndex];
            const modifiedStats = calculateModifiedStats(ship, activeConfig.components);
            
            // Calculate both global and class-specific scores
            const allScores = calculateAllShipScores(ship, modifiedStats, ships);
            const globalScores = allScores.global;
            const classScores = allScores.class;
            
            // Create scores container
            const scoresContainer = document.createElement('div');
            scoresContainer.className = 'ship-scores-container';
            scoresContainer.style.marginTop = '8px';
            scoresContainer.style.padding = '8px';
            scoresContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
            scoresContainer.style.borderRadius = '4px';
            scoresContainer.style.fontSize = '11px';
            
            // Create uber scores display (both global and class)
            const uberScoresDiv = document.createElement('div');
            uberScoresDiv.className = 'uber-scores';
            uberScoresDiv.style.display = 'flex';
            uberScoresDiv.style.justifyContent = 'space-around';
            uberScoresDiv.style.marginBottom = '8px';
            
            // Global uber score
            const globalUberDiv = document.createElement('div');
            globalUberDiv.style.textAlign = 'center';
            globalUberDiv.style.flex = '1';
            globalUberDiv.style.cursor = 'pointer';
            globalUberDiv.title = 'Click to view global score breakdown (compared to ALL ships)';
            
            const globalUberScore = globalScores.Uber;
            const globalUberColor = getScoreColor(globalUberScore);
            globalUberDiv.innerHTML = `
                <div style="font-size: 14px; font-weight: bold;">
                    <span style="color: ${globalUberColor}">⭐ ${globalUberScore}</span>
                </div>
                <div style="color: #aaa; font-size: 10px;">ALL SHIPS</div>
            `;
            
            // Add click handler for global score breakdown
            globalUberDiv.addEventListener('click', () => {
                showScoreBreakdownPanel(ship, modifiedStats, globalScores, ships, null, 'global');
            });
            
            uberScoresDiv.appendChild(globalUberDiv);
            
            // Class uber score
            const classUberDiv = document.createElement('div');
            classUberDiv.style.textAlign = 'center';
            classUberDiv.style.flex = '1';
            classUberDiv.style.cursor = 'pointer';
            classUberDiv.title = `Click to view class score breakdown (compared to ${getClassNameFromNumber(ship.Class)} ships only)`;
            
            const classUberScore = classScores.Uber;
            const classUberColor = getScoreColor(classUberScore);
            classUberDiv.innerHTML = `
                <div style="font-size: 14px; font-weight: bold;">
                    <span style="color: ${classUberColor}">🏆 ${classUberScore}</span>
                </div>
                <div style="color: #aaa; font-size: 10px;">${getClassNameFromNumber(ship.Class).toUpperCase()}</div>
            `;
            
            // Add click handler for class score breakdown
            classUberDiv.addEventListener('click', () => {
                showScoreBreakdownPanel(ship, modifiedStats, classScores, ships, null, 'class');
            });
            
            uberScoresDiv.appendChild(classUberDiv);
            scoresContainer.appendChild(uberScoresDiv);
            
            // Create category scores container with tabs
            const categoryScoresContainer = document.createElement('div');
            categoryScoresContainer.style.marginTop = '8px';
            
            // Create tabs for global/class view
            const tabsContainer = document.createElement('div');
            tabsContainer.style.display = 'flex';
            tabsContainer.style.marginBottom = '4px';
            tabsContainer.style.gap = '2px';
            
            const globalTab = document.createElement('button');
            globalTab.textContent = 'All Ships';
            globalTab.style.flex = '1';
            globalTab.style.padding = '2px 4px';
            globalTab.style.fontSize = '10px';
            globalTab.style.backgroundColor = '#2a2a2a'; // Darker grey for inactive
            globalTab.style.color = 'white';
            globalTab.style.border = 'none';
            globalTab.style.borderRadius = '2px';
            globalTab.style.cursor = 'pointer';
            
            const classTab = document.createElement('button');
            classTab.textContent = getClassNameFromNumber(ship.Class);
            classTab.style.flex = '1';
            classTab.style.padding = '2px 4px';
            classTab.style.fontSize = '10px';
            classTab.style.backgroundColor = '#444'; // Lighter grey for active (default)
            classTab.style.color = 'white';
            classTab.style.border = 'none';
            classTab.style.borderRadius = '2px';
            classTab.style.cursor = 'pointer';
            
            tabsContainer.appendChild(globalTab);
            tabsContainer.appendChild(classTab);
            categoryScoresContainer.appendChild(tabsContainer);
            
            // Create category scores grids (both global and class)
            const globalCategoryGrid = document.createElement('div');
            globalCategoryGrid.className = 'category-scores-grid global-scores';
            globalCategoryGrid.style.display = 'none'; // Hidden by default - class view is default
            globalCategoryGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
            globalCategoryGrid.style.gap = '3px';
            globalCategoryGrid.style.fontSize = '10px';
            
            const classCategoryGrid = document.createElement('div');
            classCategoryGrid.className = 'category-scores-grid class-scores';
            classCategoryGrid.style.display = 'grid'; // Visible by default
            classCategoryGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
            classCategoryGrid.style.gap = '3px';
            classCategoryGrid.style.fontSize = '10px';
            
            // Add global category scores
            Object.keys(SCORE_CATEGORIES).forEach(categoryKey => {
                const category = SCORE_CATEGORIES[categoryKey];
                const globalCategoryScore = globalScores[categoryKey];
                const globalScoreColor = getScoreColor(globalCategoryScore);
                
                const globalScoreDiv = document.createElement('div');
                globalScoreDiv.className = 'category-score';
                globalScoreDiv.style.textAlign = 'center';
                globalScoreDiv.style.padding = '2px';
                globalScoreDiv.style.borderRadius = '2px';
                globalScoreDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                globalScoreDiv.style.cursor = 'pointer';
                globalScoreDiv.title = `Click to view ${category.name} score details (global)`;
                
                globalScoreDiv.innerHTML = `<div style="color: ${category.color}">${category.icon}</div><div style="color: ${globalScoreColor}; font-weight: bold;">${globalCategoryScore}</div>`;
                
                // Add click handler for global category score breakdown
                globalScoreDiv.addEventListener('click', () => {
                    showScoreBreakdownPanel(ship, modifiedStats, globalScores, ships, categoryKey, 'global');
                });
                
                globalCategoryGrid.appendChild(globalScoreDiv);
                
                // Add class category scores
                const classCategoryScore = classScores[categoryKey];
                const classScoreColor = getScoreColor(classCategoryScore);
                
                const classScoreDiv = document.createElement('div');
                classScoreDiv.className = 'category-score';
                classScoreDiv.style.textAlign = 'center';
                classScoreDiv.style.padding = '2px';
                classScoreDiv.style.borderRadius = '2px';
                classScoreDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                classScoreDiv.style.cursor = 'pointer';
                classScoreDiv.title = `Click to view ${category.name} score details (class)`;
                
                classScoreDiv.innerHTML = `<div style="color: ${category.color}">${category.icon}</div><div style="color: ${classScoreColor}; font-weight: bold;">${classCategoryScore}</div>`;
                
                // Add click handler for class category score breakdown
                classScoreDiv.addEventListener('click', () => {
                    showScoreBreakdownPanel(ship, modifiedStats, classScores, ships, categoryKey, 'class');
                });
                
                classCategoryGrid.appendChild(classScoreDiv);
            });
            
            // Tab switching functionality
            globalTab.addEventListener('click', () => {
                globalTab.style.backgroundColor = '#444'; // Lighter grey for active
                classTab.style.backgroundColor = '#2a2a2a'; // Darker grey for inactive
                globalCategoryGrid.style.display = 'grid';
                classCategoryGrid.style.display = 'none';
            });
            
            classTab.addEventListener('click', () => {
                classTab.style.backgroundColor = '#444'; // Lighter grey for active
                globalTab.style.backgroundColor = '#2a2a2a'; // Darker grey for inactive
                classCategoryGrid.style.display = 'grid';
                globalCategoryGrid.style.display = 'none';
            });
            
            categoryScoresContainer.appendChild(globalCategoryGrid);
            categoryScoresContainer.appendChild(classCategoryGrid);
            scoresContainer.appendChild(categoryScoresContainer);
            headerContent.appendChild(scoresContainer);
        }
        // === END SHIP SCORING DISPLAY ===
        
        shipHeader.appendChild(headerContent);
        headerRow.appendChild(shipHeader);
        
        // Get the active configuration index and config for this ship
        const activeIndex = activeConfigIndices[shipId] || 0;
        
        // Make sure we have configurations for this ship
        if (!shipConfigurations[shipIdentifier] || !shipConfigurations[shipIdentifier][activeIndex]) {
            console.error(`Missing configuration for ship ${shipIdentifier} at index ${activeIndex}`);
            return;
        }
        
        const activeConfig = shipConfigurations[shipIdentifier][activeIndex];
        
        // Add BASE and CONFIG NAME sub-headers
        const baseHeader = document.createElement('th');
        baseHeader.textContent = 'BASE';
        baseHeader.className = 'sub-header';
        
        const configHeader = document.createElement('th');
        
        // Display appropriate header text based on whether this is a placeholder
        if (ship['Ship Name'] === 'Select Ship to Configure') {
            configHeader.textContent = 'CONFIG';
            configHeader.style.color = '#666'; // Grayed out text
        } else {
            configHeader.textContent = activeConfig.name || 'MODIFIED';
            configHeader.className = 'sub-header config-name-highlight';
            configHeader.style.backgroundColor = 'rgba(255, 165, 0, 0.015)'; // Very faint orange background
        }
        
        subHeaderRow.appendChild(baseHeader);
        subHeaderRow.appendChild(configHeader);
        
        console.log(`Calculating stats for ship ${ship['Ship Name']} using config '${activeConfig.name}' at index ${activeIndex}`);
        console.log("Configuration components:", activeConfig.components);
        
        const modifiedStats = calculateModifiedStats(ship, activeConfig.components);
        
        // Add base and modified values to each row
        rows.forEach((row, index) => {
            const stat = getRelevantStats()[index];
            
            const baseCell = document.createElement('td');
            // Show placeholder text for placeholder ships
            if (ship['Ship Name'] === 'Select Ship to Configure') {
                baseCell.textContent = '—';
                baseCell.style.color = '#666';
            } else {
                baseCell.textContent = formatNumber(ship[stat]);
                
                // Make ALL base values editable
                baseCell.contentEditable = true;
                baseCell.classList.add('editable-cell');
                
                // Store original value on focus
                baseCell.addEventListener('focus', function() {
                    this.setAttribute('data-original-value', ship[stat]);
                });
                
                baseCell.addEventListener('blur', function() {
                    const newValue = parseFloat(this.textContent.replace(/,/g, '')) || 0;
                    const oldValue = parseFloat(this.getAttribute('data-original-value')) || ship[stat];
                    
                    // Only update if value actually changed
                    if (Math.abs(newValue - oldValue) > 1e-6) {
                        console.log(`Base stat ${stat} changed from ${oldValue} to ${newValue} for ship ${ship.id}`);
                        updateShipAttributeValue(ship.id, stat, newValue);
                        
                        // Also manually mark ship as modified in case updateShipAttributeValue doesn't
                        const currentShipIdentifier = getShipIdentifier(ship);
                        if (typeof markShipAsModified === 'function') {
                            console.log(`Marking ship ${currentShipIdentifier} as modified`);
                            markShipAsModified(currentShipIdentifier);
                        }
                    }
                    
                    this.textContent = formatNumber(newValue);
                });
                baseCell.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.blur();
                    }
                });
            }
            baseCell.className = 'base-value';
            
            const modifiedCell = document.createElement('td');
            modifiedCell.className = 'modified-value';
            modifiedCell.style.backgroundColor = 'rgba(255, 165, 0, 0.015)'; // Very faint orange background
            modifiedCell.style.position = 'relative'; // For absolute positioning of percentage
            
            // Create a span for the value text
            const valueSpan = document.createElement('span');
            
            // Show placeholder text for placeholder ships
            if (ship['Ship Name'] === 'Select Ship to Configure') {
                valueSpan.textContent = '—';
                valueSpan.style.color = '#666';
                modifiedCell.appendChild(valueSpan);
            } else {
                valueSpan.textContent = formatNumber(modifiedStats[stat]);
                modifiedCell.appendChild(valueSpan);
            }
            
            // Apply alternating row colors (very subtle)
            if (index % 2 === 1) {
                row.style.backgroundColor = 'rgba(40, 40, 40, 0.3)'; // Very subtle alternating color
            }
            
            // Highlight changed values or neutral modifications
            const baseValue = parseFloat(ship[stat]);
            const modifiedValue = parseFloat(modifiedStats[stat]);
            
            // Check if there are any components affecting this stat (even if net effect is zero)
            const modificationDetails = calculateStatModificationDetails(ship, activeConfig, stat);
            // Only count non-zero components (ignore components with 0 values)
            const hasComponentModifications = modificationDetails.components.some(comp => comp.value !== 0);
            
            if (Math.abs(ship[stat] - modifiedStats[stat]) > 1e-6) {
                // Calculate percentage change
                const percentChange = baseValue !== 0 ? ((modifiedValue - baseValue) / Math.abs(baseValue)) * 100 : 0;
                const percentSign = percentChange >= 0 ? '+' : '';
                
                // Create percentage label
                const percentLabel = document.createElement('div');
                percentLabel.style.position = 'absolute';
                percentLabel.style.top = '8px';
                percentLabel.style.right = '12px';
                percentLabel.style.fontSize = '11px';
                percentLabel.style.fontWeight = 'normal';
                percentLabel.style.lineHeight = '1';
                percentLabel.style.whiteSpace = 'nowrap';
                percentLabel.style.pointerEvents = 'none'; // Make label non-interactive
                percentLabel.style.opacity = '0.6'; // 60% opacity
                percentLabel.style.zIndex = '1'; // Ensure it's below click layer
                percentLabel.textContent = `${percentSign}${percentChange.toFixed(1)}%`;
                
                // Check if percentage change is over 100% for special styling
                if (Math.abs(percentChange) > 100) {
                    // Over 100% change - gold color and bold
                    percentLabel.style.color = '#FFD700'; // Gold color
                    percentLabel.style.fontWeight = 'bold';
                    percentLabel.style.opacity = '1'; // Full opacity for emphasis
                    percentLabel.style.textShadow = '0 0 3px rgba(255, 215, 0, 0.5)'; // Subtle glow
                    modifiedCell.classList.add('stats-changed');
                    // Don't set inline colors - let CSS classes handle all styling
                    if (modifiedValue > baseValue) {
                        modifiedCell.classList.add('stats-changed');
                    } else {
                        modifiedCell.classList.add('stats-decreased');
                    }
                } else {
                    // Normal percentage changes
                    if (modifiedValue > baseValue) {
                        // Increased value - green color (default)
                        modifiedCell.classList.add('stats-changed');
                        percentLabel.style.color = '#4CAF50'; // Green for percentage
                    } else {
                        // Decreased value - red color
                        modifiedCell.classList.add('stats-decreased');
                        percentLabel.style.color = '#ff6b6b'; // Red for percentage
                    }
                }
                
                // Add percentage label to cell
                modifiedCell.appendChild(percentLabel);
                
                // Adjust padding to make room for percentage
                modifiedCell.style.paddingTop = '10px';
                
                // Add data attributes to track the base and modified values
                modifiedCell.setAttribute('data-base-value', ship[stat]);
                modifiedCell.setAttribute('data-modified-value', modifiedStats[stat]);
                modifiedCell.setAttribute('data-stat-name', stat);
                modifiedCell.setAttribute('data-ship-id', shipId);
                modifiedCell.setAttribute('data-ship-identifier', shipIdentifier);
                modifiedCell.setAttribute('data-config-index', activeIndex);
                
                // Add click event listener for showing the panel
                modifiedCell.addEventListener('click', function(e) {
                    // Create a new event with the cell as the target
                    const cellEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    
                    // Set the target to the cell itself
                    Object.defineProperty(cellEvent, 'target', {
                        value: modifiedCell,
                        enumerable: true
                    });
                    
                    showStatModificationTooltip(cellEvent);
                });
                modifiedCell.style.cursor = 'pointer';
                modifiedCell.title = 'Click to view modification details';
            } else if (hasComponentModifications) {
                // Value is the same but components are affecting it (neutral modification)
                modifiedCell.classList.add('stats-neutral');
                // Don't set inline color - let CSS class handle it
                modifiedCell.style.borderLeft = '2px solid #3d8bf8'; // Blue border indicator
                
                // Add 0% label for neutral modifications
                const percentLabel = document.createElement('div');
                percentLabel.style.position = 'absolute';
                percentLabel.style.top = '8px';
                percentLabel.style.right = '12px';
                percentLabel.style.fontSize = '11px';
                percentLabel.style.fontWeight = 'normal';
                percentLabel.style.lineHeight = '1';
                percentLabel.style.whiteSpace = 'nowrap';
                percentLabel.style.pointerEvents = 'none'; // Make label non-interactive
                percentLabel.style.opacity = '0.6'; // 60% opacity
                percentLabel.style.zIndex = '1'; // Ensure it's below click layer
                percentLabel.style.color = '#3d8bf8'; // Blue for percentage
                percentLabel.textContent = '0.0%';
                
                // Add percentage label to cell
                modifiedCell.appendChild(percentLabel);
                
                // Adjust padding to make room for percentage
                modifiedCell.style.paddingTop = '10px';
                
                // Add data attributes to track the base and modified values
                modifiedCell.setAttribute('data-base-value', ship[stat]);
                modifiedCell.setAttribute('data-modified-value', modifiedStats[stat]);
                modifiedCell.setAttribute('data-stat-name', stat);
                modifiedCell.setAttribute('data-ship-id', shipId);
                modifiedCell.setAttribute('data-ship-identifier', shipIdentifier);
                modifiedCell.setAttribute('data-config-index', activeIndex);
                
                // Add click event listener for showing the panel
                modifiedCell.addEventListener('click', function(e) {
                    // Create a new event with the cell as the target
                    const cellEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    
                    // Set the target to the cell itself
                    Object.defineProperty(cellEvent, 'target', {
                        value: modifiedCell,
                        enumerable: true
                    });
                    
                    showStatModificationTooltip(cellEvent);
                });
                modifiedCell.style.cursor = 'pointer';
                modifiedCell.title = 'Click to view modification details (components cancel out)';
            }
            
            row.appendChild(baseCell);
            row.appendChild(modifiedCell);
        });
    });
    
    // Initialize drag and drop for ship columns
    initDragAndDrop();
    
    // Update the top scrollbar
    updateTopScrollbar();
    
    // Update the ship count display
    updateShipCount();
    
    // Update modification badges after table rebuild
    if (typeof updateShipBadges === 'function') {
        updateShipBadges();
    }
    if (typeof updateSaveConfigBadge === 'function') {
        updateSaveConfigBadge();
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

// Add all ships of the same class as the first ship in comparison
function addAllShipsOfSameClass() {
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
    const targetClass = firstShip.Class;
    
    // Get all ships that are already added (to avoid duplicates)
    const addedShipIdentifiers = new Set(
        addedShips.map(ship => `${ship['Ship Name']}_${ship.Manufacturer}`)
    );
    
    // Find all ships of the same class that aren't already added
    const sameClassShips = ships.filter(ship => {
        const shipIdentifier = `${ship['Ship Name']}_${ship.Manufacturer}`;
        return ship.Class === targetClass && !addedShipIdentifiers.has(shipIdentifier);
    });
    
    if (sameClassShips.length === 0) {
        alert(`All ${getClassNameFromNumber(targetClass)} ships are already in the comparison.`);
        return;
    }
    
    // Add all ships of the same class
    sameClassShips.forEach(ship => {
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
    
    console.log(`Added ${sameClassShips.length} ${getClassNameFromNumber(targetClass)} ships to the comparison.`);
    
    // Update the comparison table
    updateComparisonTable();
}

// Add all ships of a specific class
function addAllShipsOfClass(targetClass) {
    if (ships.length === 0) {
        alert('Please load ship data first.');
        return;
    }
    
    // Get all ships that are already added (to avoid duplicates)
    const addedShipIdentifiers = new Set(
        addedShips.map(ship => `${ship['Ship Name']}_${ship.Manufacturer}`)
    );
    
    // Find all ships of the target class that aren't already added
    const sameClassShips = ships.filter(ship => {
        const shipIdentifier = `${ship['Ship Name']}_${ship.Manufacturer}`;
        return ship.Class === targetClass && !addedShipIdentifiers.has(shipIdentifier);
    });
    
    if (sameClassShips.length === 0) {
        alert(`All ${getClassNameFromNumber(targetClass)} ships are already in the comparison.`);
        return;
    }
    
    // Add all ships of the same class
    sameClassShips.forEach(ship => {
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
    
    console.log(`Added ${sameClassShips.length} ${getClassNameFromNumber(targetClass)} ships to the comparison.`);
    
    // Update the comparison table
    updateComparisonTable();
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

// Export ship's modified stats to CSV
function exportShipModifiedStatsToCSV(ship, shipIdentifier, configIndex) {
    // Get the active configuration
    const activeConfig = shipConfigurations[shipIdentifier][configIndex];
    const configName = activeConfig.name || 'Default';
    
    // Calculate modified stats
    const modifiedStats = calculateModifiedStats(ship, activeConfig.components);
    
    // Get all relevant stats
    const stats = getRelevantStats();
    
    // Build CSV content
    let csvContent = 'Stat,Modified Value\n';
    
    stats.forEach(stat => {
        const value = modifiedStats[stat];
        // Format the value (remove commas for CSV compatibility)
        const formattedValue = typeof value === 'number' ? value.toString() : value;
        csvContent += `"${stat}","${formattedValue}"\n`;
    });
    
    // Create filename
    const shipName = ship['Ship Name'].replace(/[^a-z0-9]/gi, '_');
    const manufacturer = ship.Manufacturer.replace(/[^a-z0-9]/gi, '_');
    const configNameClean = configName.replace(/[^a-z0-9]/gi, '_');
    const filename = `${shipName}_${manufacturer}_${configNameClean}_modified_stats.csv`;
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Export ship's full stats comparison to CSV (base, modified, percentage change, component count)
function exportShipFullStatsToCSV(ship, shipIdentifier, configIndex) {
    // Get the active configuration
    const activeConfig = shipConfigurations[shipIdentifier][configIndex];
    const configName = activeConfig.name || 'Default';
    
    // Calculate modified stats
    const modifiedStats = calculateModifiedStats(ship, activeConfig.components);
    
    // Get all relevant stats
    const stats = getRelevantStats();
    
    // Build CSV content with headers
    let csvContent = 'Stat,Base Value,Modified Value,Percentage Change,Components Affecting\n';
    
    stats.forEach(stat => {
        const baseValue = parseFloat(ship[stat]) || 0;
        const modifiedValue = parseFloat(modifiedStats[stat]) || 0;
        
        // Calculate percentage change
        const percentChange = baseValue !== 0 ? ((modifiedValue - baseValue) / Math.abs(baseValue)) * 100 : 0;
        
        // Get modification details to count components
        const modificationDetails = calculateStatModificationDetails(ship, activeConfig, stat);
        // Only count non-zero components
        const componentCount = modificationDetails.components.filter(comp => comp.value !== 0).length;
        
        // Format values (remove commas for CSV compatibility)
        const formattedBase = baseValue.toString();
        const formattedModified = modifiedValue.toString();
        const formattedPercent = percentChange.toFixed(2) + '%';
        
        csvContent += `"${stat}","${formattedBase}","${formattedModified}","${formattedPercent}","${componentCount}"\n`;
    });
    
    // Create filename
    const shipName = ship['Ship Name'].replace(/[^a-z0-9]/gi, '_');
    const manufacturer = ship.Manufacturer.replace(/[^a-z0-9]/gi, '_');
    const configNameClean = configName.replace(/[^a-z0-9]/gi, '_');
    const filename = `${shipName}_${manufacturer}_${configNameClean}_full_stats_comparison.csv`;
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// === MODULE EXPORT ===
// Export functions for external use
window.ComparisonTable = {
    addShipToComparison: addShipToComparison,
    initShipComparisonTable: initShipComparisonTable,
    updateComparisonTable: updateComparisonTable,
    formatNumber: formatNumber,
    updateShipCount: updateShipCount,
    changeShipInComparison: changeShipInComparison,
    removeShipFromComparison: removeShipFromComparison,
    addAllShips: addAllShips,
    addNext5Ships: addNext5Ships,
    addRemainingShips: addRemainingShips,
    addAllShipsOfSameClass: addAllShipsOfSameClass,
    addAllShipsOfClass: addAllShipsOfClass,
    removeAllShips: removeAllShips
};

// Also export individual functions for backward compatibility
window.addShipToComparison = addShipToComparison;
window.initShipComparisonTable = initShipComparisonTable;
window.updateComparisonTable = updateComparisonTable;
window.formatNumber = formatNumber;
window.updateShipCount = updateShipCount;
window.changeShipInComparison = changeShipInComparison;
window.removeShipFromComparison = removeShipFromComparison;
window.addAllShips = addAllShips;
window.addNext5Ships = addNext5Ships;
window.addRemainingShips = addRemainingShips;
window.addAllShipsOfSameClass = addAllShipsOfSameClass;
window.addAllShipsOfClass = addAllShipsOfClass;
window.removeAllShips = removeAllShips;

console.log('Comparison Table module loaded successfully'); 