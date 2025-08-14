// === MODULE: Components Panel ===
// This module handles the components panel functionality for editing ship configurations
//
// Dependencies:
// - Global variables: addedShips, shipConfigurations, activeConfigIndices, componentsLoaded, componentCategories
// - Functions: getShipIdentifier(), getClassNameFromNumber(), getShipDisplayName(), calculateModifiedStats(), formatNumber(), 
//              getCompatibleComponents(), createComponentSlot(), duplicateComponentSlot(), closeAttributesPanel()
// - Modules: window.FileIO (for CSV export)

// Function to open the components panel for a specific ship/configuration
function openComponentsPanel(shipId, configIndex, shipIdentifier) {
    console.log(`Opening components panel for ship ${shipId}, config index ${configIndex}`);
    
    // Find the ship in the addedShips array
    const ship = addedShips.find(s => s.id === shipId);
    if (!ship) {
        console.error(`Ship with ID ${shipId} not found`);
        return;
    }
    
    // If shipIdentifier wasn't passed, calculate it
    if (!shipIdentifier) {
        shipIdentifier = getShipIdentifier(ship);
    }
    
    // Set the active config index
    if (configIndex !== undefined) {
        activeConfigIndices[shipId] = configIndex;
    } else {
        // Use the current active index
        configIndex = activeConfigIndices[shipId] || 0;
    }
    
    // Close the attributes panel if it's open
    closeAttributesPanel();
    
    console.log(`Using config index ${configIndex} for ship ${ship['Ship Name']} (${shipIdentifier})`);
    
    // Make sure the configuration exists
    if (!shipConfigurations[shipIdentifier] || !shipConfigurations[shipIdentifier][configIndex]) {
        console.error(`Configuration index ${configIndex} not found for ship ${shipIdentifier}`);
        return;
    }
    
    // Get the active configuration
    const activeConfig = shipConfigurations[shipIdentifier][configIndex];
    console.log(`Configuration: ${activeConfig.name}`);
    console.log(`Components:`, activeConfig.components);
    
    // Clear the components panel header
    const panelHeader = document.querySelector('.components-panel-header');
    panelHeader.innerHTML = '';
    
    // Create title area container for ship navigation
    const titleArea = document.createElement('div');
    titleArea.className = 'components-panel-title-area';
    titleArea.style.display = 'flex';
    titleArea.style.alignItems = 'center';
    titleArea.style.padding = '10px 0';
    
    // Create ship navigation container
    const shipNavContainer = document.createElement('div');
    shipNavContainer.style.display = 'flex';
    shipNavContainer.style.alignItems = 'center';
    shipNavContainer.style.gap = '5px';
    shipNavContainer.style.flexGrow = '0';
    
    // Get current ship index
    const currentShipIndex = addedShips.findIndex(s => s.id === shipId);
    
    // Create Previous Ship button
    const prevShipButton = document.createElement('button');
    prevShipButton.className = 'header-button nav-button';
    prevShipButton.innerHTML = '◄';
    prevShipButton.title = 'Previous Ship';
    prevShipButton.style.padding = '5px 10px';
    prevShipButton.style.width = '30px';
    prevShipButton.style.flexShrink = '0';
    prevShipButton.disabled = currentShipIndex === 0;
    prevShipButton.style.opacity = currentShipIndex === 0 ? '0.5' : '1';
    prevShipButton.addEventListener('click', () => {
        if (currentShipIndex > 0) {
            const prevShip = addedShips[currentShipIndex - 1];
            const prevShipIdentifier = getShipIdentifier(prevShip);
            const prevConfigIndex = activeConfigIndices[prevShip.id] || 0;
            closeComponentsPanel();
            openComponentsPanel(prevShip.id, prevConfigIndex, prevShipIdentifier);
        }
    });
    shipNavContainer.appendChild(prevShipButton);
    
    // Create Next Ship button (moved here to be beside prev button)
    const nextShipButton = document.createElement('button');
    nextShipButton.className = 'header-button nav-button';
    nextShipButton.innerHTML = '►';
    nextShipButton.title = 'Next Ship';
    nextShipButton.style.padding = '5px 10px';
    nextShipButton.style.width = '30px';
    nextShipButton.style.flexShrink = '0';
    nextShipButton.disabled = currentShipIndex === addedShips.length - 1;
    nextShipButton.style.opacity = currentShipIndex === addedShips.length - 1 ? '0.5' : '1';
    nextShipButton.addEventListener('click', () => {
        if (currentShipIndex < addedShips.length - 1) {
            const nextShip = addedShips[currentShipIndex + 1];
            const nextShipIdentifier = getShipIdentifier(nextShip);
            const nextConfigIndex = activeConfigIndices[nextShip.id] || 0;
            closeComponentsPanel();
            openComponentsPanel(nextShip.id, nextConfigIndex, nextShipIdentifier);
        }
    });
    shipNavContainer.appendChild(nextShipButton);
    
    // Create ship selector button with dropdown
    const shipSelectorBtn = document.createElement('button');
    shipSelectorBtn.className = 'header-button ship-selector-btn';
    shipSelectorBtn.style.padding = '5px 15px';
    shipSelectorBtn.style.minWidth = '150px';
    shipSelectorBtn.style.marginLeft = '10px'; // Add gap between nav buttons and selector
    shipSelectorBtn.style.width = 'auto';
    shipSelectorBtn.style.display = 'flex';
    shipSelectorBtn.style.alignItems = 'center';
    shipSelectorBtn.style.justifyContent = 'space-between';
    shipSelectorBtn.style.gap = '10px';
    
    // Create button content
    const shipNameSpan = document.createElement('span');
    const className = getClassNameFromNumber(ship.Class);
    const spec = ship.Spec || '';
    shipNameSpan.textContent = `${getShipDisplayName(ship)} (${className}${spec ? ', ' + spec : ''})`;
    shipSelectorBtn.appendChild(shipNameSpan);
    
    // Add dropdown arrow
    const shipDropdownArrow = document.createElement('span');
    shipDropdownArrow.textContent = '▼';
    shipDropdownArrow.style.fontSize = '10px';
    shipDropdownArrow.style.marginLeft = 'auto';
    shipSelectorBtn.appendChild(shipDropdownArrow);
    
    // Create dropdown menu for ships
    const shipDropdown = document.createElement('div');
    shipDropdown.className = 'actions-dropdown-menu ship-dropdown-menu';
    shipDropdown.style.display = 'none';
    shipDropdown.style.minWidth = '250px';
    shipDropdown.style.maxHeight = '400px';
    shipDropdown.style.overflowY = 'auto';
    
    // Add ship options to dropdown
    addedShips.forEach((addedShip, index) => {
        const shipItem = document.createElement('div');
        shipItem.className = 'actions-menu-item';
        shipItem.style.display = 'flex';
        shipItem.style.alignItems = 'center';
        shipItem.style.justifyContent = 'space-between';
        
        const shipClass = getClassNameFromNumber(addedShip.Class);
        const shipSpec = addedShip.Spec || '';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${getShipDisplayName(addedShip)} (${shipClass}${shipSpec ? ', ' + shipSpec : ''})`;
        shipItem.appendChild(nameSpan);
        
        if (addedShip.id === shipId) {
            shipItem.style.backgroundColor = 'rgba(61, 139, 248, 0.1)';
            shipItem.style.fontWeight = 'bold';
        }
        
        shipItem.addEventListener('click', (e) => {
            e.stopPropagation();
            if (addedShip.id !== shipId) {
                const newShipIdentifier = getShipIdentifier(addedShip);
                const newConfigIndex = activeConfigIndices[addedShip.id] || 0;
                closeComponentsPanel();
                openComponentsPanel(addedShip.id, newConfigIndex, newShipIdentifier);
            }
            shipDropdown.style.display = 'none';
        });
        
        shipDropdown.appendChild(shipItem);
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
    
    shipNavContainer.appendChild(shipSelectorBtn);
    
    shipNavContainer.appendChild(shipSelectorBtn);
    
    // === ADD ALL SHIPS DROPDOWN ===
    // Create all ships selector button with dropdown
    const allShipsSelectorBtn = document.createElement('button');
    allShipsSelectorBtn.className = 'header-button ship-selector-btn';
    allShipsSelectorBtn.style.padding = '5px 15px';
    allShipsSelectorBtn.style.minWidth = '150px';
    allShipsSelectorBtn.style.marginLeft = '5px'; // Small gap between dropdowns
    allShipsSelectorBtn.style.width = 'auto';
    allShipsSelectorBtn.style.display = 'flex';
    allShipsSelectorBtn.style.alignItems = 'center';
    allShipsSelectorBtn.style.justifyContent = 'space-between';
    allShipsSelectorBtn.style.gap = '10px';
    allShipsSelectorBtn.style.backgroundColor = 'rgba(61, 139, 248, 0.1)'; // Slightly different color to distinguish
    
    // Create button content
    const allShipsNameSpan = document.createElement('span');
    allShipsNameSpan.textContent = 'All Ships';
    allShipsNameSpan.style.fontStyle = 'italic';
    allShipsNameSpan.style.opacity = '0.9';
    allShipsSelectorBtn.appendChild(allShipsNameSpan);
    
    // Add dropdown arrow
    const allShipsDropdownArrow = document.createElement('span');
    allShipsDropdownArrow.textContent = '▼';
    allShipsDropdownArrow.style.fontSize = '10px';
    allShipsDropdownArrow.style.marginLeft = 'auto';
    allShipsSelectorBtn.appendChild(allShipsDropdownArrow);
    
    // Create dropdown menu for all ships
    const allShipsDropdown = document.createElement('div');
    allShipsDropdown.className = 'actions-dropdown-menu all-ships-dropdown-menu';
    allShipsDropdown.style.display = 'none';
    allShipsDropdown.style.minWidth = '300px';
    allShipsDropdown.style.maxHeight = '500px';
    allShipsDropdown.style.overflowY = 'auto';
    
    // Group ships by manufacturer
    const shipsByManufacturer = {};
    ships.forEach((shipData) => {
        const manufacturer = shipData.Manufacturer || 'Unknown';
        if (!shipsByManufacturer[manufacturer]) {
            shipsByManufacturer[manufacturer] = [];
        }
        shipsByManufacturer[manufacturer].push(shipData);
    });
    
    // Sort manufacturers and add ships to dropdown
    Object.keys(shipsByManufacturer).sort().forEach(manufacturer => {
        // Add manufacturer header
        const manufacturerHeader = document.createElement('div');
        manufacturerHeader.style.padding = '5px 10px';
        manufacturerHeader.style.fontWeight = 'bold';
        manufacturerHeader.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        manufacturerHeader.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
        manufacturerHeader.textContent = manufacturer;
        allShipsDropdown.appendChild(manufacturerHeader);
        
        // Add ships for this manufacturer
        shipsByManufacturer[manufacturer].forEach((shipData) => {
            const shipItem = document.createElement('div');
            shipItem.className = 'actions-menu-item';
            shipItem.style.display = 'flex';
            shipItem.style.alignItems = 'center';
            shipItem.style.justifyContent = 'space-between';
            shipItem.style.paddingLeft = '20px'; // Indent under manufacturer
            
            const shipClass = getClassNameFromNumber(shipData.Class);
            const shipSpec = shipData.Spec || '';
            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${getShipDisplayName(shipData)} (${shipClass}${shipSpec ? ', ' + shipSpec : ''})`;
            shipItem.appendChild(nameSpan);
            
            // Check if this ship is already in comparison
            const isInComparison = addedShips.some(s => 
                s['Ship Name'] === shipData['Ship Name'] && s.Manufacturer === shipData.Manufacturer
            );
            
            if (isInComparison) {
                const checkMark = document.createElement('span');
                checkMark.textContent = '✓';
                checkMark.style.color = '#4CAF50';
                checkMark.style.marginLeft = '10px';
                shipItem.appendChild(checkMark);
            }
            
            // Highlight if this is the current ship
            if (shipData['Ship Name'] === ship['Ship Name'] && shipData.Manufacturer === ship.Manufacturer) {
                shipItem.style.backgroundColor = 'rgba(61, 139, 248, 0.1)';
                shipItem.style.fontWeight = 'bold';
            }
            
            shipItem.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Check if this ship is already in comparison
                const existingShip = addedShips.find(s => 
                    s['Ship Name'] === shipData['Ship Name'] && s.Manufacturer === shipData.Manufacturer
                );
                
                if (existingShip) {
                    // Ship already in comparison, navigate to it
                    const shipIdentifier = getShipIdentifier(existingShip);
                    const configIndex = activeConfigIndices[existingShip.id] || 0;
                    closeComponentsPanel();
                    openComponentsPanel(existingShip.id, configIndex, shipIdentifier);
                } else {
                    // Add ship to comparison and navigate to it
                    const newShipData = {
                        ...shipData,
                        id: nextShipId++
                    };
                    addedShips.push(newShipData);
                    const newShipIdentifier = getShipIdentifier(newShipData);
                    if (!shipConfigurations[newShipIdentifier]) {
                        shipConfigurations[newShipIdentifier] = [{
                            name: "Default",
                            components: {
                                "Ship Component": {},
                                "Ship Module": {},
                                "Ship Weapons": {},
                                "Countermeasures": {},
                                "Missiles": {},
                                "Drones": {}
                            }
                        }];
                    }
                    activeConfigIndices[newShipData.id] = 0;
                    updateComparisonTable();
                    closeComponentsPanel();
                    openComponentsPanel(newShipData.id, 0, newShipIdentifier);
                }
                
                allShipsDropdown.style.display = 'none';
            });
            
            allShipsDropdown.appendChild(shipItem);
        });
    });
    
    // Add dropdown to body
    document.body.appendChild(allShipsDropdown);
    
    // Toggle dropdown on button click
    allShipsSelectorBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Position the menu below the button
        const rect = this.getBoundingClientRect();
        allShipsDropdown.style.top = `${rect.bottom + 5}px`;
        allShipsDropdown.style.left = `${rect.left}px`;
        
        // Adjust if menu goes off screen
        const menuRect = allShipsDropdown.getBoundingClientRect();
        if (menuRect.right > window.innerWidth) {
            allShipsDropdown.style.left = `${rect.right - allShipsDropdown.offsetWidth}px`;
        }
        
        // Toggle visibility
        if (allShipsDropdown.style.display === 'none') {
            // Hide all other menus first
            document.querySelectorAll('.actions-dropdown-menu').forEach(menu => {
                menu.style.display = 'none';
            });
            
            allShipsDropdown.style.display = 'block';
            
            // Close when clicking outside
            const closeMenu = function() {
                allShipsDropdown.style.display = 'none';
                document.removeEventListener('click', closeMenu);
            };
            
            // Add slight delay to avoid immediate closing
            setTimeout(() => {
                document.addEventListener('click', closeMenu);
            }, 10);
        } else {
            allShipsDropdown.style.display = 'none';
        }
    });
    
    shipNavContainer.appendChild(allShipsSelectorBtn);
    // === END ALL SHIPS DROPDOWN ===
    
    // Add ship navigation container to title area
    titleArea.appendChild(shipNavContainer);
    
    // Add the title area to the header
    panelHeader.appendChild(titleArea);
    
    // Create controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'components-panel-controls';
    controlsContainer.style.padding = '10px 0';
    
    // Get all configurations for navigation
    const configs = shipConfigurations[shipIdentifier] || [];
    
    // Create navigation controls container
    const navContainer = document.createElement('div');
    navContainer.style.display = 'inline-flex';
    navContainer.style.alignItems = 'center';
    navContainer.style.gap = '5px';
    navContainer.style.marginRight = '10px';
    
    // Create config selector button with dropdown (moved before nav buttons)
    const configSelectorBtn = document.createElement('button');
    configSelectorBtn.className = 'header-button config-selector-btn';
    configSelectorBtn.style.padding = '5px 15px';
    configSelectorBtn.style.minWidth = '150px';
    configSelectorBtn.style.display = 'flex';
    configSelectorBtn.style.alignItems = 'center';
    configSelectorBtn.style.justifyContent = 'space-between';
    configSelectorBtn.style.gap = '10px';
    
    // Create button content
    const configNameSpan = document.createElement('span');
    configNameSpan.textContent = activeConfig.name || `Config ${configIndex + 1}`;
    configSelectorBtn.appendChild(configNameSpan);
    
    // Add lock icon if locked
    if (activeConfig.locked) {
        const lockIcon = document.createElement('span');
        lockIcon.textContent = '🔒';
        lockIcon.style.fontSize = '12px';
        lockIcon.style.opacity = '0.7';
        configSelectorBtn.appendChild(lockIcon);
    }
    
    // Add dropdown arrow
    const dropdownArrow = document.createElement('span');
    dropdownArrow.textContent = '▼';
    dropdownArrow.style.fontSize = '10px';
    dropdownArrow.style.marginLeft = 'auto';
    configSelectorBtn.appendChild(dropdownArrow);
    
    // Create dropdown menu
    const configDropdown = document.createElement('div');
    configDropdown.className = 'actions-dropdown-menu config-dropdown-menu';
    configDropdown.style.display = 'none';
    configDropdown.style.minWidth = '200px';
    
    // Add configuration options to dropdown
    configs.forEach((config, index) => {
        const configItem = document.createElement('div');
        configItem.className = 'actions-menu-item';
        configItem.style.display = 'flex';
        configItem.style.alignItems = 'center';
        configItem.style.justifyContent = 'space-between';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = config.name || `Config ${index + 1}`;
        configItem.appendChild(nameSpan);
        
        if (config.locked) {
            const lockIcon = document.createElement('span');
            lockIcon.textContent = '🔒';
            lockIcon.style.fontSize = '12px';
            lockIcon.style.opacity = '0.7';
            configItem.appendChild(lockIcon);
        }
        
        if (index === configIndex) {
            configItem.style.backgroundColor = 'rgba(255, 165, 0, 0.1)';
            configItem.style.fontWeight = 'bold';
        }
        
        configItem.addEventListener('click', (e) => {
            e.stopPropagation();
            if (index !== configIndex) {
                activeConfigIndices[shipId] = index;
                closeComponentsPanel();
                openComponentsPanel(shipId, index, shipIdentifier);
                updateComparisonTable();
            }
            configDropdown.style.display = 'none';
        });
        
        configDropdown.appendChild(configItem);
    });
    
    // Add dropdown to body
    document.body.appendChild(configDropdown);
    
    // Toggle dropdown on button click
    configSelectorBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Position the menu below the button
        const rect = this.getBoundingClientRect();
        configDropdown.style.top = `${rect.bottom + 5}px`;
        configDropdown.style.left = `${rect.left}px`;
        
        // Toggle visibility
        if (configDropdown.style.display === 'none') {
            // Hide all other menus first
            document.querySelectorAll('.actions-dropdown-menu').forEach(menu => {
                menu.style.display = 'none';
            });
            
            configDropdown.style.display = 'block';
            
            // Close when clicking outside
            const closeMenu = function() {
                configDropdown.style.display = 'none';
                document.removeEventListener('click', closeMenu);
            };
            
            // Add slight delay to avoid immediate closing
            setTimeout(() => {
                document.addEventListener('click', closeMenu);
            }, 10);
        } else {
            configDropdown.style.display = 'none';
        }
    });
    
    navContainer.appendChild(configSelectorBtn);
    
    // Add navigation buttons after the selector (with gap)
    const navButtonsDiv = document.createElement('div');
    navButtonsDiv.style.display = 'inline-flex';
    navButtonsDiv.style.marginLeft = '10px';
    navButtonsDiv.style.gap = '5px';
    
    // Create Previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'header-button nav-button';
    prevButton.innerHTML = '◄';
    prevButton.title = 'Previous Configuration';
    prevButton.style.padding = '5px 10px';
    prevButton.style.minWidth = '30px';
    prevButton.disabled = configIndex === 0;
    prevButton.style.opacity = configIndex === 0 ? '0.5' : '1';
    prevButton.addEventListener('click', () => {
        if (configIndex > 0) {
            const newIndex = configIndex - 1;
            activeConfigIndices[shipId] = newIndex;
            closeComponentsPanel();
            openComponentsPanel(shipId, newIndex, shipIdentifier);
            updateComparisonTable();
        }
    });
    navButtonsDiv.appendChild(prevButton);
    
    // Create Next button
    const nextButton = document.createElement('button');
    nextButton.className = 'header-button nav-button';
    nextButton.innerHTML = '►';
    nextButton.title = 'Next Configuration';
    nextButton.style.padding = '5px 10px';
    nextButton.style.minWidth = '30px';
    nextButton.disabled = configIndex === configs.length - 1;
    nextButton.style.opacity = configIndex === configs.length - 1 ? '0.5' : '1';
    nextButton.addEventListener('click', () => {
        if (configIndex < configs.length - 1) {
            const newIndex = configIndex + 1;
            activeConfigIndices[shipId] = newIndex;
            closeComponentsPanel();
            openComponentsPanel(shipId, newIndex, shipIdentifier);
            updateComparisonTable();
        }
    });
    navButtonsDiv.appendChild(nextButton);
    
    navContainer.appendChild(navButtonsDiv);
    
    // Add navigation container to controls
    controlsContainer.appendChild(navContainer);
    
    // Create lock/unlock button (positioned after navigation controls)
    const lockButton = document.createElement('button');
    lockButton.className = 'header-button lock-button';
    lockButton.style.marginRight = '10px';
    const isLocked = activeConfig.locked || false;
    lockButton.innerHTML = isLocked ? '🔒 Locked' : '🔓 Unlocked';
    lockButton.title = isLocked ? 'Click to unlock configuration' : 'Click to lock configuration';
    lockButton.style.backgroundColor = isLocked ? '#444' : '#333';
    lockButton.addEventListener('click', () => {
        // Toggle locked state
        activeConfig.locked = !activeConfig.locked;
        
        // Update button appearance
        const isNowLocked = activeConfig.locked;
        lockButton.innerHTML = isNowLocked ? '🔒 Locked' : '🔓 Unlocked';
        lockButton.title = isNowLocked ? 'Click to unlock configuration' : 'Click to lock configuration';
        lockButton.style.backgroundColor = isNowLocked ? '#444' : '#333';
        
        // Refresh the panel to apply locked state
        openComponentsPanel(shipId, configIndex, shipIdentifier);
    });
    controlsContainer.appendChild(lockButton);
    
    // Create config actions button with dropdown
    const configActionsBtn = document.createElement('button');
    configActionsBtn.className = 'header-button config-actions-btn';
    configActionsBtn.innerHTML = '⋮';
    configActionsBtn.title = 'Configuration Actions';
    configActionsBtn.style.padding = '5px 10px';
    configActionsBtn.style.minWidth = '30px';
    configActionsBtn.style.marginRight = '10px';
    
    // Create dropdown menu for config actions
    const configActionsMenu = document.createElement('div');
    configActionsMenu.className = 'actions-dropdown-menu config-actions-dropdown';
    configActionsMenu.style.display = 'none';
    configActionsMenu.style.minWidth = '180px';
    
    // Helper function to create menu items
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
            configActionsMenu.style.display = 'none';
        });
        
        return menuItem;
    };
    
    // Add menu items
    const duplicateItem = createMenuItem('Duplicate Config', () => {
        // Store the current config count
        const configCountBefore = shipConfigurations[shipIdentifier].length;
        duplicateConfiguration(shipId, configIndex, shipIdentifier);
        // After duplication, open the new config in the editor
        setTimeout(() => {
            const configCountAfter = shipConfigurations[shipIdentifier].length;
            if (configCountAfter > configCountBefore) {
                const newConfigIndex = configCountAfter - 1;
                closeComponentsPanel();
                openComponentsPanel(shipId, newConfigIndex, shipIdentifier);
            }
        }, 100);
    });
    configActionsMenu.appendChild(duplicateItem);
    
    const duplicateUpgradeItem = createMenuItem('Upgrade Config', () => {
        if (typeof duplicateAndUpgradeConfiguration === 'function') {
            const configCountBefore = shipConfigurations[shipIdentifier].length;
            duplicateAndUpgradeConfiguration(shipId, configIndex, shipIdentifier);
            // After upgrade, open the new upgraded config
            setTimeout(() => {
                const configCountAfter = shipConfigurations[shipIdentifier].length;
                if (configCountAfter > configCountBefore) {
                    const newConfigIndex = configCountAfter - 1;
                    closeComponentsPanel();
                    openComponentsPanel(shipId, newConfigIndex, shipIdentifier);
                }
            }, 100);
        } else {
            console.error('duplicateAndUpgradeConfiguration not available yet');
            alert('Configuration upgrade is not available at the moment. Please try again.');
        }
    }, '#FFD700'); // Gold color
    configActionsMenu.appendChild(duplicateUpgradeItem);
    
    const renameItem = createMenuItem('Rename Config', () => {
        renameConfiguration(shipId, configIndex, shipIdentifier);
        // Refresh the panel after rename to show new name
        setTimeout(() => {
            closeComponentsPanel();
            openComponentsPanel(shipId, configIndex, shipIdentifier);
        }, 100);
    });
    configActionsMenu.appendChild(renameItem);
    
    // Add separator
    const separator = document.createElement('div');
    separator.style.height = '1px';
    separator.style.backgroundColor = '#444';
    separator.style.margin = '4px 0';
    configActionsMenu.appendChild(separator);
    
    const copyItem = createMenuItem('Copy Config', () => {
        copyConfiguration(shipId, configIndex, shipIdentifier);
        // The copyConfiguration function already shows a notification
    }, '#66bb6a'); // Green
    configActionsMenu.appendChild(copyItem);
    
    const pasteMenuItem = createMenuItem('Paste Config', () => {
        const configCountBefore = shipConfigurations[shipIdentifier].length;
        pasteConfiguration(shipId, shipIdentifier);
        // After paste, check if a new config was added and switch to it
        setTimeout(() => {
            const configCountAfter = shipConfigurations[shipIdentifier].length;
            if (configCountAfter > configCountBefore) {
                const newConfigIndex = configCountAfter - 1;
                closeComponentsPanel();
                openComponentsPanel(shipId, newConfigIndex, shipIdentifier);
            }
        }, 100);
    }, '#3d8bf8'); // Blue
    
    // Check if paste should be disabled
    if (!copiedConfiguration) {
        pasteMenuItem.style.opacity = '0.5';
        pasteMenuItem.style.cursor = 'not-allowed';
        // Remove the click handler by replacing with a no-op
        pasteMenuItem.onclick = (e) => {
            e.stopPropagation();
            configActionsMenu.style.display = 'none';
        };
    }
    configActionsMenu.appendChild(pasteMenuItem);
    
    // Add another separator
    const separator2 = document.createElement('div');
    separator2.style.height = '1px';
    separator2.style.backgroundColor = '#444';
    separator2.style.margin = '4px 0';
    configActionsMenu.appendChild(separator2);
    
    const deleteItem = createMenuItem('Delete Config', () => {
        const configCount = shipConfigurations[shipIdentifier].length;
        if (configCount > 1) {
            deleteConfiguration(shipId, configIndex, shipIdentifier);
            // After deletion, open the active config (which deleteConfiguration sets)
            setTimeout(() => {
                const newActiveIndex = activeConfigIndices[shipId] || 0;
                closeComponentsPanel();
                openComponentsPanel(shipId, newActiveIndex, shipIdentifier);
            }, 100);
        } else {
            alert('Cannot delete the only configuration. Create another configuration first.');
        }
    }, '#ff6b6b'); // Red
    configActionsMenu.appendChild(deleteItem);
    
    // Add another separator before ship actions
    const separator3 = document.createElement('div');
    separator3.style.height = '1px';
    separator3.style.backgroundColor = '#444';
    separator3.style.margin = '4px 0';
    configActionsMenu.appendChild(separator3);
    
    // Add Remove Ship option
    const removeShipItem = createMenuItem('Remove Ship', () => {
        // Find current ship index
        const currentIndex = addedShips.findIndex(s => s.id === shipId);
        
        // Remove the ship
        removeShipFromComparison(shipId);
        
        // Check if there are any ships left
        if (addedShips.length > 0) {
            // Determine which ship to switch to
            let newShipIndex;
            if (currentIndex > 0) {
                // If not the first ship, go to previous
                newShipIndex = currentIndex - 1;
            } else {
                // If it was the first ship, go to the new first ship (which was previously second)
                newShipIndex = 0;
            }
            
            const newShip = addedShips[newShipIndex];
            const newShipIdentifier = getShipIdentifier(newShip);
            const newConfigIndex = activeConfigIndices[newShip.id] || 0;
            
            // Don't close the panel, just switch to the new ship
            openComponentsPanel(newShip.id, newConfigIndex, newShipIdentifier);
        } else {
            // No ships left, close the panel
            closeComponentsPanel();
        }
    }, '#ff6b6b'); // Red
    configActionsMenu.appendChild(removeShipItem);
    
    // Add dropdown to body
    document.body.appendChild(configActionsMenu);
    
    // Toggle dropdown on button click
    configActionsBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Position the menu below the button
        const rect = this.getBoundingClientRect();
        configActionsMenu.style.top = `${rect.bottom + 5}px`;
        configActionsMenu.style.left = `${rect.left - 150 + rect.width}px`; // Right-align menu
        
        // Toggle visibility
        if (configActionsMenu.style.display === 'none') {
            // Hide all other menus first
            document.querySelectorAll('.actions-dropdown-menu').forEach(menu => {
                menu.style.display = 'none';
            });
            
            configActionsMenu.style.display = 'block';
            
            // Close when clicking outside
            const closeMenu = function() {
                configActionsMenu.style.display = 'none';
                document.removeEventListener('click', closeMenu);
            };
            
            // Add slight delay to avoid immediate closing
            setTimeout(() => {
                document.addEventListener('click', closeMenu);
            }, 10);
        } else {
            configActionsMenu.style.display = 'none';
        }
    });
    
    controlsContainer.appendChild(configActionsBtn);
    
    // Create hidden CSV file input (since we cleared the header, we need to recreate it)
    const csvFileInput = document.createElement('input');
    csvFileInput.type = 'file';
    csvFileInput.id = 'csv-config-file';
    csvFileInput.accept = '.csv';
    csvFileInput.hidden = true;
    
    // Add event listener for CSV config file input
    csvFileInput.addEventListener('change', (event) => {
        const shipId = parseInt(event.target.getAttribute('data-ship-id'));
        const shipIdentifier = event.target.getAttribute('data-ship-identifier');
        
        if (shipId && shipIdentifier) {
            handleCsvConfigImport(event, shipId, shipIdentifier);
        }
        
        // Clear the file input
        event.target.value = '';
    });
    
    controlsContainer.appendChild(csvFileInput);
    
    // Create CSV import button
    const csvImportButton = document.createElement('button');
    csvImportButton.className = 'header-button';
    csvImportButton.textContent = 'Import CSV';
    csvImportButton.title = 'Import Configuration from CSV';
    csvImportButton.addEventListener('click', () => {
        // Store the ship info for the file handler
        csvFileInput.setAttribute('data-ship-id', shipId);
        csvFileInput.setAttribute('data-ship-identifier', shipIdentifier);
        csvFileInput.click();
    });
    controlsContainer.appendChild(csvImportButton);
    
    // Create CSV export button
    const csvExportButton = document.createElement('button');
    csvExportButton.className = 'header-button';
    csvExportButton.textContent = 'Export CSV';
    csvExportButton.title = 'Export Configuration to CSV';
    csvExportButton.addEventListener('click', () => {
        // Use the FileIO module's export function
        if (window.FileIO && window.FileIO.exportConfigurationToCSV) {
            window.FileIO.exportConfigurationToCSV(shipId, configIndex, shipIdentifier);
        } else if (window.exportConfigurationToCSV) {
            // Fallback to global function if FileIO module not loaded correctly
            window.exportConfigurationToCSV(shipId, configIndex, shipIdentifier);
        } else {
            console.error('exportConfigurationToCSV function not found');
            alert('CSV export function not available. Please refresh the page.');
        }
    });
    controlsContainer.appendChild(csvExportButton);
    

    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => {
        // Update the comparison table to reflect any changes
        updateComparisonTable();
        closeComponentsPanel();
    });
    controlsContainer.appendChild(closeButton);
    
    panelHeader.appendChild(controlsContainer);
    
    // Clear previous components
    const componentsContainer = document.getElementById('components-container');
    componentsContainer.innerHTML = '';
    
    // Create two-column layout
    const statsColumn = document.createElement('div');
    statsColumn.className = 'stats-column';
    
    const componentsColumn = document.createElement('div');
    componentsColumn.className = 'components-column';
    
    // Add the columns to the container
    componentsContainer.appendChild(statsColumn);
    componentsContainer.appendChild(componentsColumn);
    
    // Create a table to display base and modified stats
    const statsTable = document.createElement('table');
    statsTable.className = 'stats-preview-table';
    
    // Add table header
    const tableHeader = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const statHeaderCell = document.createElement('th');
    statHeaderCell.textContent = 'STAT';
    headerRow.appendChild(statHeaderCell);
    
    const baseHeaderCell = document.createElement('th');
    baseHeaderCell.textContent = 'BASE';
    headerRow.appendChild(baseHeaderCell);
    
    const modifiedHeaderCell = document.createElement('th');
    modifiedHeaderCell.textContent = 'MODIFIED';
    headerRow.appendChild(modifiedHeaderCell);
    
    tableHeader.appendChild(headerRow);
    statsTable.appendChild(tableHeader);
    
    // Create table body
    const tableBody = document.createElement('tbody');
    
    // Calculate modified stats
    const modifiedStats = calculateModifiedStats(ship, activeConfig.components);
    
    // Get all stats to display using the same order as the comparison table
    const orderedStats = getRelevantStats();
    
    // Add rows for each stat
    orderedStats.forEach(stat => {
        if (ship[stat] !== undefined) {
            const row = document.createElement('tr');
            
            const statCell = document.createElement('td');
            statCell.style.position = 'relative';
            statCell.className = 'stat-name-cell';
            
            // Create a wrapper div for stat name and info button
            const statWrapper = document.createElement('div');
            statWrapper.style.display = 'flex';
            statWrapper.style.alignItems = 'center';
            statWrapper.style.justifyContent = 'space-between';
            statWrapper.style.width = '100%';
            
            // Create stat name span
            const statNameSpan = document.createElement('span');
            statNameSpan.textContent = stat;
            statWrapper.appendChild(statNameSpan);
            
            // Create info button
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
            
            statWrapper.appendChild(infoButton);
            statCell.appendChild(statWrapper);
            
            // Add hover tooltip if description exists
            if (window.statDescriptions && window.statDescriptions[stat]) {
                console.log('Stat has description:', stat, window.statDescriptions[stat]);
                statCell.style.cursor = 'help';
                statCell.title = window.statDescriptions[stat];
                
                // Create a more sophisticated tooltip
                let tooltipTimeout;
                let tooltip;
                
                statCell.addEventListener('mouseenter', (e) => {
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
                        
                        const rect = statCell.getBoundingClientRect();
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
                
                statCell.addEventListener('mouseleave', () => {
                    clearTimeout(tooltipTimeout);
                    if (tooltip) {
                        document.body.removeChild(tooltip);
                        tooltip = null;
                    }
                });
            }
            
            row.appendChild(statCell);
            
            const baseValueCell = document.createElement('td');
            baseValueCell.textContent = formatNumber(ship[stat]);
            row.appendChild(baseValueCell);
            
            const modifiedValueCell = document.createElement('td');
            modifiedValueCell.textContent = formatNumber(modifiedStats[stat]);
            
            // Apply proper highlighting for changed values
            const baseValue = parseFloat(ship[stat]);
            const modifiedValue = parseFloat(modifiedStats[stat]);
            
            // Check if there are any components affecting this stat (even if net effect is zero)
            const modificationDetails = calculateStatModificationDetails(ship, activeConfig, stat);
            // Only count non-zero components (ignore components with 0 values)
            const hasComponentModifications = modificationDetails.components.some(comp => comp.value !== 0);
            
            if (ship[stat] !== modifiedStats[stat]) {
                // Value actually changed
                if (modifiedValue > baseValue) {
                    // Increased value - green color (default)
                modifiedValueCell.className = 'stats-changed';
                } else {
                    // Decreased value - red color
                    modifiedValueCell.className = 'stats-decreased';
                }
            } else if (hasComponentModifications) {
                // Value is the same but components are affecting it (neutral modification)
                modifiedValueCell.className = 'stats-neutral';
            }
            
            // Add click handler and cursor pointer for cells with modifications
            if (hasComponentModifications) {
                modifiedValueCell.style.cursor = 'pointer';
                modifiedValueCell.setAttribute('data-stat-name', stat);
                modifiedValueCell.setAttribute('data-base-value', ship[stat]);
                modifiedValueCell.setAttribute('data-modified-value', modifiedStats[stat]);
                modifiedValueCell.setAttribute('data-ship-id', shipId);
                modifiedValueCell.setAttribute('data-config-index', configIndex);
                modifiedValueCell.setAttribute('data-ship-identifier', shipIdentifier);
                modifiedValueCell.addEventListener('click', showStatModificationTooltip);
            }
            
            row.appendChild(modifiedValueCell);
            
            tableBody.appendChild(row);
        }
    });
    
    statsTable.appendChild(tableBody);
    // Add the stats table directly to the stats column (no wrapper div)
    statsColumn.appendChild(statsTable);
    
    // Load components for this ship and configuration in the components column
    if (componentsLoaded) {
        console.log("Loading components for ship class:", ship.Class);
        console.log("Available component categories:", Object.keys(componentCategories));
        
        let anyComponentsCreated = false;
        
        // Create a card for each component category
        for (const category in componentCategories) {
            // Always show Drones category even if empty (for now)
            const shouldShowCategory = (componentCategories[category] && componentCategories[category].length > 0) || category === "Drones";
            
            if (shouldShowCategory) {
                console.log(`Processing category: ${category} with ${componentCategories[category] ? componentCategories[category].length : 0} types`);
                
                // Calculate total count for this category
                let categoryTotalCount = 0;
                if (activeConfig.components[category]) {
                    for (const componentType in activeConfig.components[category]) {
                        const componentIds = activeConfig.components[category][componentType];
                        if (Array.isArray(componentIds)) {
                            categoryTotalCount += componentIds.filter(id => id !== '').length;
                        } else if (componentIds && componentIds !== '') {
                            categoryTotalCount += 1;
                        }
                    }
                }
                
                // Skip empty categories when locked
                if (activeConfig.locked && categoryTotalCount === 0) {
                    continue;
                }
                
                // Create a card for this category
                const categoryCard = document.createElement('div');
                categoryCard.className = 'component-category-section';
                if (activeConfig.locked) {
                    categoryCard.classList.add('locked');
                }
                
                // Create category header
                const categoryHeader = document.createElement('h3');
                categoryHeader.className = 'component-category-header';
                
                // Display category name with total count wrapped in a span
                if (categoryTotalCount > 0) {
                    categoryHeader.innerHTML = `${category.toUpperCase()} <span class="category-count">(${categoryTotalCount})</span>`;
                } else {
                    categoryHeader.textContent = category.toUpperCase();
                }
                
                categoryCard.appendChild(categoryHeader);
                
                let categoryHasAnyComponents = false;
                
                // Process each component type within this category
                const categoryTypes = componentCategories[category] || [];
                categoryTypes.forEach(componentType => {
                    // Check if this component type has any selected components
                    let typeHasComponents = false;
                    if (activeConfig.components[category] && activeConfig.components[category][componentType]) {
                        const componentIds = activeConfig.components[category][componentType];
                        if (Array.isArray(componentIds)) {
                            typeHasComponents = componentIds.some(id => id !== '');
                        } else {
                            typeHasComponents = componentIds !== '';
                        }
                    }
                    
                    // Skip empty component types when locked
                    if (activeConfig.locked && !typeHasComponents) {
                        return;
                    }
                    
                    // Get compatible components for this type and ship class
                    const compatibleComponents = getCompatibleComponents(category, componentType, ship.Class);
                    
                    if (compatibleComponents.length > 0) {
                        categoryHasAnyComponents = true;
                        
                        // Create component slot container that can hold multiple component slots
                        const slotContainer = document.createElement('div');
                        slotContainer.className = 'component-slot-container';
                        slotContainer.style.marginBottom = '12px'; // Reduced margin between component types
                        slotContainer.setAttribute('data-category', category);
                        slotContainer.setAttribute('data-type', componentType);
                        
                        // Create type header/label with duplicate button (hide in locked mode)
                        if (!activeConfig.locked) {
                            const headerDiv = document.createElement('div');
                            headerDiv.className = 'component-type-header';
                            headerDiv.style.display = 'flex';
                            headerDiv.style.justifyContent = 'space-between';
                            headerDiv.style.alignItems = 'center';
                            headerDiv.style.marginBottom = '5px';
                            headerDiv.style.paddingLeft = '8px';
                            headerDiv.style.paddingRight = '8px';
                            headerDiv.style.paddingBottom = '2px';
                            headerDiv.style.borderBottom = '1px solid #333';
                            
                            const typeLabel = document.createElement('span');
                            let count = 0;
                            if (activeConfig.components[category] && activeConfig.components[category][componentType]) {
                                if (Array.isArray(activeConfig.components[category][componentType])) {
                                    count = activeConfig.components[category][componentType].filter(id => id !== '').length;
                                } else if (activeConfig.components[category][componentType] !== '') {
                                    count = 1;
                                }
                            }
                            typeLabel.textContent = count > 0 ? `${componentType} (${count})` : componentType;
                            typeLabel.className = 'component-type-label';
                            headerDiv.appendChild(typeLabel);
                            
                            const duplicateBtn = document.createElement('button');
                            duplicateBtn.textContent = '+ Add';
                            duplicateBtn.className = 'duplicate-component-btn';
                            duplicateBtn.style.fontSize = '12px';
                            duplicateBtn.style.padding = '3px 8px';
                            duplicateBtn.style.backgroundColor = '#333';
                            duplicateBtn.style.border = '1px solid #555';
                            duplicateBtn.style.borderRadius = '3px';
                            duplicateBtn.style.cursor = 'pointer';
                            duplicateBtn.setAttribute('data-category', category);
                            duplicateBtn.setAttribute('data-type', componentType);
                            duplicateBtn.setAttribute('data-ship-id', shipId);
                            duplicateBtn.setAttribute('data-ship-identifier', shipIdentifier);
                            duplicateBtn.setAttribute('data-config-index', configIndex);
                            
                            duplicateBtn.addEventListener('click', function() {
                                duplicateComponentSlot(this);
                            });
                            
                            headerDiv.appendChild(duplicateBtn);
                            slotContainer.appendChild(headerDiv);
                        }
                        
                        // Get the component IDs for this category/type (could be an array or a single value)
                        let componentIds = [];
                        if (activeConfig.components[category] && activeConfig.components[category][componentType]) {
                            if (Array.isArray(activeConfig.components[category][componentType])) {
                                componentIds = activeConfig.components[category][componentType].filter(id => id !== '');
                            } else if (activeConfig.components[category][componentType] !== '') {
                                // Convert existing single component to array format
                                componentIds = [activeConfig.components[category][componentType]];
                            }
                        }
                        
                        console.log(`Selected components for ${category}/${componentType}:`, componentIds);
                        
                        // Create a slot for each component ID - will be empty if none are selected
                        componentIds.forEach((componentId, index) => {
                            createComponentSlot(category, componentType, shipId, shipIdentifier, configIndex, componentId, index, slotContainer, activeConfig.locked);
                        });

                        // Add the slot container to the category card
                        categoryCard.appendChild(slotContainer);
                    }
                });
                
                // Only add the category card if it has any components (but always show Drones)
                if (categoryHasAnyComponents || category === "Drones") {
                    // If Drones category is empty, add a helpful message
                    if (category === "Drones" && !categoryHasAnyComponents) {
                        const noDronesMsg = document.createElement('p');
                        noDronesMsg.style.padding = '10px';
                        noDronesMsg.style.color = '#888';
                        noDronesMsg.style.fontStyle = 'italic';
                        noDronesMsg.style.textAlign = 'center';
                        noDronesMsg.textContent = 'No drones found in the loaded components file.';
                        categoryCard.appendChild(noDronesMsg);
                    }
                    componentsColumn.appendChild(categoryCard);
                }
            }
        }
        
        // If no components were created, show a message
        if (!anyComponentsCreated) {
            const noComponentsMsg = document.createElement('p');
            noComponentsMsg.textContent = 'No compatible components found for this ship class. Please load a components JSON file with components matching your ship class.';
            componentsColumn.appendChild(noComponentsMsg);
        }
    } else {
        // Show message that components need to be loaded
        const noComponentsMsg = document.createElement('p');
        noComponentsMsg.textContent = 'No components data loaded. Please use the "Load Components" button to add components.';
        componentsColumn.appendChild(noComponentsMsg);
    }
    
    // Store the current ship ID and config index for reference
    componentsContainer.setAttribute('data-ship-id', shipId);
    componentsContainer.setAttribute('data-config-index', configIndex);
    componentsContainer.setAttribute('data-ship-identifier', shipIdentifier);
    
    // Open the panel
    document.getElementById('components-panel').classList.add('open');
    document.getElementById('overlay').classList.add('active');
    
    // Ensure stat modification tooltip exists
    if (!document.getElementById('stat-modification-tooltip')) {
        createStatModificationTooltip();
    }
    
    // Add keyboard navigation for configurations and ships
    const handleKeyboardNav = (e) => {
        // Don't trigger navigation if user is typing in an input field
        const activeElement = document.activeElement;
        const isEditing = activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'SELECT' ||
            activeElement.contentEditable === 'true' ||
            activeElement.classList.contains('editable')
        );
        
        if (isEditing) {
            return; // Exit early if user is editing text
        }
        
        const currentShipIdx = addedShips.findIndex(s => s.id === shipId);
        
        if (e.key === 'ArrowLeft' && configIndex > 0) {
            e.preventDefault();
            const newIndex = configIndex - 1;
            activeConfigIndices[shipId] = newIndex;
            closeComponentsPanel();
            openComponentsPanel(shipId, newIndex, shipIdentifier);
            updateComparisonTable();
        } else if (e.key === 'ArrowRight' && configIndex < configs.length - 1) {
            e.preventDefault();
            const newIndex = configIndex + 1;
            activeConfigIndices[shipId] = newIndex;
            closeComponentsPanel();
            openComponentsPanel(shipId, newIndex, shipIdentifier);
            updateComparisonTable();
        } else if (e.key === 'ArrowUp' && currentShipIdx > 0) {
            e.preventDefault();
            const prevShip = addedShips[currentShipIdx - 1];
            const prevShipIdentifier = getShipIdentifier(prevShip);
            const prevConfigIndex = activeConfigIndices[prevShip.id] || 0;
            closeComponentsPanel();
            openComponentsPanel(prevShip.id, prevConfigIndex, prevShipIdentifier);
        } else if (e.key === 'ArrowDown' && currentShipIdx < addedShips.length - 1) {
            e.preventDefault();
            const nextShip = addedShips[currentShipIdx + 1];
            const nextShipIdentifier = getShipIdentifier(nextShip);
            const nextConfigIndex = activeConfigIndices[nextShip.id] || 0;
            closeComponentsPanel();
            openComponentsPanel(nextShip.id, nextConfigIndex, nextShipIdentifier);
        }
    };
    
    // Store the handler so we can remove it when closing
    document.getElementById('components-panel').keyboardNavHandler = handleKeyboardNav;
    document.addEventListener('keydown', handleKeyboardNav);
}

// Function to close the components panel
function closeComponentsPanel() {
    // Get the current ship ID and config index
    const componentsContainer = document.getElementById('components-container');
    const shipId = parseInt(componentsContainer.getAttribute('data-ship-id'));
    const configIndex = parseInt(componentsContainer.getAttribute('data-config-index'));
    
    // If we have valid IDs, make sure changes are saved
    if (!isNaN(shipId) && !isNaN(configIndex)) {
        // Use efficient update instead of full table rebuild
        if (window.efficientTableUpdate) {
            window.efficientTableUpdate({ shipId: shipId });
        } else {
            // Fallback to full update if module not loaded
            updateComparisonTable();
        }
    }
    
    // Close the panel
    document.getElementById('components-panel').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
    
    // Reset active buttons
    const categoryButtons = document.querySelectorAll('.category-button');
    categoryButtons.forEach(button => button.classList.remove('active'));
    
    // Clean up any dropdown menus
    document.querySelectorAll('.config-dropdown-menu, .ship-dropdown-menu, .config-actions-dropdown, .all-ships-dropdown-menu').forEach(menu => {
        menu.remove();
    });
    
    // Remove keyboard navigation handler
    const panel = document.getElementById('components-panel');
    if (panel.keyboardNavHandler) {
        document.removeEventListener('keydown', panel.keyboardNavHandler);
        delete panel.keyboardNavHandler;
    }
}

// Create component section for the panel
function createComponentsPanelSection(category, ship, activeConfig, shipId, containerElement) {
    // Create category section
    const categorySection = document.createElement('div');
    categorySection.className = 'component-category-section';
    
    // Create category header
    const categoryHeader = document.createElement('h4');
    categoryHeader.textContent = category;
    categorySection.appendChild(categoryHeader);
    
    // Get component types for this category
    const componentTypes = componentCategories[category];
    
    // Create a slot for each component type
    componentTypes.forEach(componentType => {
        createComponentSlotForPanel(category, componentType, ship, activeConfig, shipId, categorySection);
    });
    
    containerElement.appendChild(categorySection);
}

// Create component slot for the panel
function createComponentSlotForPanel(category, componentType, ship, activeConfig, shipId, categorySection) {
    // Create component slot
    const slotDiv = document.createElement('div');
    slotDiv.className = 'component-slot';
    
    // Create slot label
    const slotLabel = document.createElement('div');
    slotLabel.className = 'slot-label';
    slotLabel.textContent = componentType;
    
    // Create component dropdown
    const dropdown = document.createElement('select');
    dropdown.className = 'component-dropdown';
    dropdown.setAttribute('data-category', category);
    dropdown.setAttribute('data-type', componentType);
    
    // Create "None" option
    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = 'None';
    dropdown.appendChild(noneOption);
    
    // Get compatible components for this slot
    const compatibleComponents = getCompatibleComponents(category, componentType, ship.Class);
    
    // Add options for each compatible component
    compatibleComponents.forEach(component => {
        const option = document.createElement('option');
        option.value = component.id;
        
        // Generate a more descriptive name for the component
        let componentName = component.name || componentType;
        let displayAttributes = [];
        
        if (component.properties) {
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
        
        // Check if this component is active in the configuration
        if (activeConfig.components[category] && 
            activeConfig.components[category][componentType] === component.id) {
            option.selected = true;
        }
        
        dropdown.appendChild(option);
    });
    
    // Add event listener for dropdown change
    dropdown.addEventListener('change', function() {
        const selectedComponentId = this.value;
        const category = this.getAttribute('data-category');
        const componentType = this.getAttribute('data-type');
        
        // Get the current ship ID and config index from the container attributes
        const containerId = parseInt(componentsContainer.getAttribute('data-ship-id'));
        const configIndex = parseInt(componentsContainer.getAttribute('data-config-index'));
        const containerShipIdentifier = componentsContainer.getAttribute('data-ship-identifier');
        
        console.log(`Component selection changed for ship ${containerId}, config ${configIndex}`);
        console.log(`Category: ${category}, Type: ${componentType}, Selected ID: ${selectedComponentId}`);
        
        // Get the configuration directly from the shipConfigurations global using shipIdentifier
        if (!shipConfigurations[containerShipIdentifier]) {
            console.error(`No configurations found for ship ${containerShipIdentifier}`);
            return;
        }
        
        if (!shipConfigurations[containerShipIdentifier][configIndex]) {
            console.error(`Configuration index ${configIndex} not found for ship ${containerShipIdentifier}`);
            return;
        }
        
        // Get the active configuration directly
        const currentConfig = shipConfigurations[containerShipIdentifier][configIndex];
        console.log(`Got configuration: ${currentConfig.name}`);
        
        // Ensure the category object exists in the configuration
        if (!currentConfig.components[category]) {
            currentConfig.components[category] = {};
        }
        
        // Update the configuration
        if (selectedComponentId) {
            // Store component ID with the configuration
            currentConfig.components[category][componentType] = selectedComponentId;
            console.log(`Updated ${category} - ${componentType} to ${selectedComponentId} for ship ${containerId}, config ${configIndex}`);
        } else {
            // If "None" is selected, remove the component
            delete currentConfig.components[category][componentType];
            console.log(`Removed ${category} - ${componentType} for ship ${containerId}, config ${configIndex}`);
        }
        
        // Debug the full configuration after changes
        console.log("Current configuration components:", currentConfig.components);
        
        // Mark ship as modified
        if (typeof markShipAsModified === 'function') {
            markShipAsModified(containerShipIdentifier);
        }
        
        // Update stats in the panel only
        updateStatsPreview(containerId, configIndex, containerShipIdentifier);
        
        // Use debounced table update to prevent rapid rebuilds
        if (window.debouncedTableUpdate) {
            window.debouncedTableUpdate({ shipId: containerId, delay: 50 });
        } else if (window.efficientTableUpdate) {
            window.efficientTableUpdate({ shipId: containerId });
        }
    });
    
    // Append elements to slot
    slotDiv.appendChild(slotLabel);
    slotDiv.appendChild(dropdown);
    categorySection.appendChild(slotDiv);
}

// Update the stats preview in the components panel
function updateStatsPreview(shipId, configIndex, shipIdentifier) {
    console.log(`Updating stats preview for ship ${shipId}, config ${configIndex}`);
    
    // Find the ship
    const ship = addedShips.find(s => s.id === shipId);
    if (!ship) {
        console.error(`Ship with ID ${shipId} not found`);
        return;
    }
    
    // If shipIdentifier wasn't passed, calculate it
    if (!shipIdentifier) {
        shipIdentifier = getShipIdentifier(ship);
    }
    
    // Get the configuration
    if (!shipConfigurations[shipIdentifier]) {
        console.error(`No configurations found for ship ${shipIdentifier}`);
        return;
    }
    
    if (!shipConfigurations[shipIdentifier][configIndex]) {
        console.error(`Configuration index ${configIndex} not found for ship ${shipIdentifier}`);
        return;
    }
    
    const activeConfig = shipConfigurations[shipIdentifier][configIndex];
    console.log(`Using configuration: ${activeConfig.name}`);
    console.log(`Configuration components:`, activeConfig.components);
    
    // Calculate modified stats with this configuration
    const modifiedStats = calculateModifiedStats(ship, activeConfig.components);
    
    // Find the stats table in the panel
    const statsTable = document.querySelector('.stats-preview-table');
    if (!statsTable) {
        console.error('Stats table not found in panel');
        return;
    }
    
    // Update the values in the table
    const rows = statsTable.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const statName = row.cells[0].textContent;
        const baseValueCell = row.cells[1];
        const modifiedValueCell = row.cells[2];
        
        baseValueCell.textContent = formatNumber(ship[statName]);
        modifiedValueCell.textContent = formatNumber(modifiedStats[statName]);
        
        // Update highlighting for changed values
        modifiedValueCell.className = '';
        
        // Get proper values for comparison
            const baseValue = parseFloat(ship[statName]);
            const modifiedValue = parseFloat(modifiedStats[statName]);
            
        // Check if there are any components affecting this stat (even if net effect is zero)
        const modificationDetails = calculateStatModificationDetails(ship, activeConfig, statName);
        // Only count non-zero components (ignore components with 0 values)
        const hasComponentModifications = modificationDetails.components.some(comp => comp.value !== 0);
        
        if (ship[statName] !== modifiedStats[statName]) {
            // Determine if value has increased or decreased
            if (modifiedValue > baseValue) {
                // Increased value - green color (default)
            modifiedValueCell.className = 'stats-changed';
            } else {
                // Decreased value - red color
                modifiedValueCell.className = 'stats-decreased';
            }
        } else if (hasComponentModifications) {
            // Value is the same but components are affecting it (neutral modification)
            modifiedValueCell.className = 'stats-neutral';
        }
    });
    
    console.log('Stats preview updated');
}

// Function to update category count in the header
function updateCategoryCount(category) {
    const componentsContainer = document.getElementById('components-container');
    const shipId = parseInt(componentsContainer.getAttribute('data-ship-id'));
    const configIndex = parseInt(componentsContainer.getAttribute('data-config-index'));
    const shipIdentifier = componentsContainer.getAttribute('data-ship-identifier');
    
    if (!shipConfigurations[shipIdentifier] || !shipConfigurations[shipIdentifier][configIndex]) {
        return;
    }
    
    const activeConfig = shipConfigurations[shipIdentifier][configIndex];
    
    // Find the category header element
    const categoryHeaders = document.querySelectorAll('.component-category-header');
    let targetHeader = null;
    
    for (const header of categoryHeaders) {
        if (header.textContent.startsWith(category.toUpperCase())) {
            targetHeader = header;
            break;
        }
    }
    
    if (!targetHeader) return;
    
    // Calculate total count for this category
    let categoryTotalCount = 0;
    if (activeConfig.components[category]) {
        for (const componentType in activeConfig.components[category]) {
            const componentIds = activeConfig.components[category][componentType];
            if (Array.isArray(componentIds)) {
                categoryTotalCount += componentIds.filter(id => id !== '').length;
            } else if (componentIds && componentIds !== '') {
                categoryTotalCount += 1;
            }
        }
    }
    
    // Update the header text
    if (categoryTotalCount > 0) {
        targetHeader.innerHTML = `${category.toUpperCase()} <span class="category-count">(${categoryTotalCount})</span>`;
    } else {
        targetHeader.textContent = category.toUpperCase();
    }
}

// Function to update component type count in the header
function updateComponentTypeCount(category, componentType) {
    const componentsContainer = document.getElementById('components-container');
    const shipId = parseInt(componentsContainer.getAttribute('data-ship-id'));
    const configIndex = parseInt(componentsContainer.getAttribute('data-config-index'));
    const shipIdentifier = componentsContainer.getAttribute('data-ship-identifier');
    
    if (!shipConfigurations[shipIdentifier] || !shipConfigurations[shipIdentifier][configIndex]) {
        return;
    }
    
    const activeConfig = shipConfigurations[shipIdentifier][configIndex];
    
    // Find the component type label
    const slotContainers = document.querySelectorAll('.component-slot-container');
    for (const container of slotContainers) {
        if (container.getAttribute('data-category') === category && 
            container.getAttribute('data-type') === componentType) {
            const typeLabel = container.querySelector('.component-type-label');
            if (typeLabel) {
                // Calculate count for this component type
                let count = 0;
                if (activeConfig.components[category] && activeConfig.components[category][componentType]) {
                    const componentIds = activeConfig.components[category][componentType];
                    if (Array.isArray(componentIds)) {
                        count = componentIds.filter(id => id !== '').length;
                    } else if (componentIds && componentIds !== '') {
                        count = 1;
                    }
                }
                
                // Update the label text
                typeLabel.textContent = count > 0 ? `${componentType} (${count})` : componentType;
            }
            break;
        }
    }
}

// === MODULE EXPORT ===
window.ComponentsPanel = {
    openComponentsPanel,
    closeComponentsPanel,
    createComponentsPanelSection,
    createComponentSlotForPanel,
    updateStatsPreview,
    updateCategoryCount,
    updateComponentTypeCount
};

// Also expose individual functions for backward compatibility
window.openComponentsPanel = openComponentsPanel;
window.closeComponentsPanel = closeComponentsPanel;
window.createComponentsPanelSection = createComponentsPanelSection;
window.createComponentSlotForPanel = createComponentSlotForPanel;
window.updateStatsPreview = updateStatsPreview;
window.updateCategoryCount = updateCategoryCount;
window.updateComponentTypeCount = updateComponentTypeCount;

console.log('Components Panel module loaded successfully'); 