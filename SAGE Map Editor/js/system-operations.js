// system-operations.js - Functions for operating on star systems

// Create a new system at the current mouse position
function createNewSystem() {
    const mapCoords = screenToMapCoords(mouseX, mouseY);
    
    // Apply snap to grid if enabled
    let x = mapCoords.x;
    let y = mapCoords.y;
    
    if (snapToGrid) {
        x = Math.round(x / GALAXY_GRID_SPACING) * GALAXY_GRID_SPACING;
        y = Math.round(y / GALAXY_GRID_SPACING) * GALAXY_GRID_SPACING;
    }
    
    systemCounter++;
    const systemName = `System-${systemCounter}`;
    
    const newSystem = {
        key: `sys-${Date.now()}`, // Generate unique key
        name: systemName,
        coordinates: [x, y],
        faction: null,
        controllingFaction: 'Neutral', // Current controlling faction (ownership)
        stars: [
            {
                name: 'Solar',
                type: 2, // Default to Solar type
                scale: 1.0
            }
        ],
        planets: [],
        links: [],
        isLocked: false, // Add locked status
        starbase: { tier: 0 } // Default starbase tier 0
    };
    
    // Add system to map data
    mapData.push(newSystem);
    systemLookup[newSystem.key] = newSystem;
    
    // Select the new system
    selectedSystems = [newSystem];
    updateLockButtonsState(); // Update lock button state
    setupResourceFilter(); // Update filter state
    displaySystemDetails(selectedSystems);
    drawSystemPreview(newSystem);
    
    saveState(`Created System ${systemName}`);
    drawGalaxyMap();
    console.log(`Created new system at (${x}, ${y})`);
}

// Create a new system at specified coordinates
function createNewSystemAtCoords(x, y) {
    console.log("Creating new system at", x, y);
    
    systemCounter++;
    const systemName = `System-${systemCounter}`;
    
    const newSystem = {
        key: `sys-${Date.now()}`, // Generate unique key
        name: systemName,
        coordinates: [x, y],
        faction: null,
        controllingFaction: 'Neutral', // Current controlling faction (ownership)
        stars: [
            {
                name: 'Solar',
                type: 2, // Default to Solar type
                scale: 1.0
            }
        ],
        planets: [],
        links: [],
        isLocked: false, // Add locked status
        starbase: { tier: 0 } // Default starbase tier 0
    };
    
    // Add system to map data
    mapData.push(newSystem);
    systemLookup[newSystem.key] = newSystem;
    
    // Select the new system
    selectedSystems = [newSystem];
    updateLockButtonsState(); // Update lock button state
    setupResourceFilter(); // Update filter state
    displaySystemDetails(selectedSystems);
    drawSystemPreview(newSystem);
    
    console.log(`Saving state for new system ${systemName}`);
    saveState(`Created System ${systemName}`);
    drawGalaxyMap();
    console.log(`Created new system at (${x}, ${y})`);
    
    return newSystem;
}

// Delete selected systems
function deleteSelectedSystems() {
    if (selectedSystems.length === 0) {
        alert('No systems selected for deletion');
        return;
    }
    
    saveState(`Deleted ${selectedSystems.length} System(s)`);
    
    // Create set of keys to delete for faster lookup
    const keysToDelete = new Set(selectedSystems.map(system => system.key));
    
    // Remove links to deleted systems from all systems
    mapData.forEach(system => {
        if (system.links) {
            system.links = system.links.filter(linkKey => !keysToDelete.has(linkKey));
        }
    });
    
    // Remove systems from map data
    mapData = mapData.filter(system => !keysToDelete.has(system.key));
    
    // Remove from system lookup
    selectedSystems.forEach(system => {
        delete systemLookup[system.key];
    });
    
    // Clear selection
    selectedSystems = [];
    updateLockButtonsState(); // Update lock button state
    setupResourceFilter(); // Update filter state
    clearSelectionUI();
    drawGalaxyMap();
    
    console.log(`Deleted ${keysToDelete.size} systems`);
}

// Deselect all systems
function deselectAll() {
    selectedSystems = [];
    updateLockButtonsState(); // Update lock button state
    setupResourceFilter(); // Update filter state
    clearSelectionUI();
    drawGalaxyMap();
}

// Toggle linking mode
function toggleLinkMode() {
    // Can only link if exactly one system is selected
    if (selectedSystems.length !== 1) {
        alert('Please select exactly one system to link');
        return;
    }
    
    isLinking = !isLinking;
    
    if (isLinking) {
        linkSourceSystem = selectedSystems[0];
        const btn = document.getElementById('linkSystemBtn');
        if (btn) btn.classList.add('active');
    } else {
        linkSourceSystem = null;
        const btn = document.getElementById('linkSystemBtn');
        if (btn) btn.classList.remove('active');
    }
    
    drawGalaxyMap();
}

// Toggle link between two systems
function toggleSystemLink(system1, system2) {
    if (!system1 || !system2 || !system1.key || !system2.key) return;
    
    // Check if link already exists
    const linkExists1 = system1.links && system1.links.includes(system2.key);
    const linkExists2 = system2.links && system2.links.includes(system1.key);
    
    if (linkExists1 || linkExists2) {
        // Remove link
        if (system1.links) {
            system1.links = system1.links.filter(key => key !== system2.key);
        }
        
        if (system2.links) {
            system2.links = system2.links.filter(key => key !== system1.key);
        }
        
        saveState(`Removed Link: ${system1.name} - ${system2.name}`);
    } else {
        // Add link
        if (!system1.links) system1.links = [];
        if (!system2.links) system2.links = [];
        
        system1.links.push(system2.key);
        system2.links.push(system1.key);
        
        saveState(`Added Link: ${system1.name} - ${system2.name}`);
    }
    
    drawGalaxyMap();
    displaySystemDetails(selectedSystems);
}

// Copy selected system to clipboard
function copySelectedSystem() {
    if (selectedSystems.length !== 1) {
        alert('Please select exactly one system to copy');
        return;
    }
    
    systemClipboard = deepCopy(selectedSystems[0]);
    console.log(`Copied system ${systemClipboard.name} to clipboard`);
    alert(`Copied system ${systemClipboard.name} to clipboard`);
}

// Paste system from clipboard
function pasteSystem() {
    if (!systemClipboard) {
        alert('No system in clipboard');
        return;
    }
    
    // Get coordinates at mouse position
    const mapCoords = screenToMapCoords(mouseX, mouseY);
    
    // Apply snap to grid if enabled
    let x = mapCoords.x;
    let y = mapCoords.y;
    
    if (snapToGrid) {
        x = Math.round(x / GALAXY_GRID_SPACING) * GALAXY_GRID_SPACING;
        y = Math.round(y / GALAXY_GRID_SPACING) * GALAXY_GRID_SPACING;
    }
    
    // Create new system from clipboard
    const newSystem = deepCopy(systemClipboard);
    
    // Generate new key
    newSystem.key = `sys-${Date.now()}`;
    
    // Update coordinates
    newSystem.coordinates = [x, y];
    
    // Update name to indicate it's a copy
    newSystem.name = `${newSystem.name} (Copy)`;
    
    // Clear links (don't copy links)
    newSystem.links = [];
    newSystem.isLocked = false; // Ensure pasted system is unlocked
    
    // Add system to map data
    mapData.push(newSystem);
    systemLookup[newSystem.key] = newSystem;
    
    // Select the new system
    selectedSystems = [newSystem];
    updateLockButtonsState(); // Update lock button state
    setupResourceFilter(); // Update filter state
    displaySystemDetails(selectedSystems);
    drawSystemPreview(newSystem);
    
    saveState(`Pasted System ${newSystem.name}`);
    drawGalaxyMap();
    console.log(`Pasted system at (${x}, ${y})`);
}

// Display system details in the details panel
function displaySystemDetails(systems) {
    const detailsContent = document.getElementById('systemDetailContent');
    const resourcesContent = document.getElementById('resourceDetailContent');
    
    if (!detailsContent) return;
    
    if (!systems || systems.length === 0) {
        // Show galaxy-wide statistics instead of "No system selected"
        displayGalaxyStatistics(detailsContent);
        if (resourcesContent) {
            resourcesContent.innerHTML = '<p>Select a system to view resources</p>';
        }
        return;
    }
    
    // Multiple systems selected
    if (systems.length > 1) {
        displayMultipleSystemDetails(systems, detailsContent);
        if (resourcesContent) {
            resourcesContent.innerHTML = '<p>Multiple systems selected. Select a single system to view resources.</p>';
        }
        return;
    }
    
    // Single system selected
    const system = systems[0];
    const isLocked = system.isLocked;
    console.log("Displaying details for single system:", system.name, "Locked:", isLocked);
    
    // Add class to the main container if system is locked
    const detailsPanel = document.getElementById('detailsPanel'); // Assuming this is the main container for details
    if (detailsPanel) {
        if (isLocked) {
            detailsPanel.classList.add('locked-mode');
        } else {
            detailsPanel.classList.remove('locked-mode');
        }
    }
    
    // Generate HTML for system details tab
    let html = `
        <div class="detail-section">
            <div class="system-actions" style="display: flex; justify-content: flex-end; margin-bottom: 10px; gap: 8px;">
                <button id="expandPreviewBtn" style="display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 12px; border-radius: 4px; background: rgba(255,255,255,0.15); border: none; cursor: pointer; font-size: 0.9em;" title="Expand System Preview">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                    </svg>
                    Expand
                </button>
                <button id="centerSystemBtn" style="display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 12px; border-radius: 4px; background: rgba(255,255,255,0.15); border: none; cursor: pointer; font-size: 0.9em;" title="Center View on System">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="7"></circle>
                        <circle cx="12" cy="12" r="3"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                    </svg>
                    Center View
                </button>
            </div>
            <h3>System Details ${isLocked ? '<span class="locked-indicator">(Locked)</span>' : ''}</h3>
            <div class="form-group">
                <label for="systemName">Name:</label>
                <input type="text" id="systemName" value="${system.name || ''}">
            </div>
            
            <div class="form-group">
                <label for="systemX">X Coordinate:</label>
                <input type="number" id="systemX" value="${system.coordinates ? system.coordinates[0] : 0}" step="0.1">
            </div>
            
            <div class="form-group">
                <label for="systemY">Y Coordinate:</label>
                <input type="number" id="systemY" value="${system.coordinates ? system.coordinates[1] : 0}" step="0.1">
            </div>
            
            <div class="form-group">
                <label for="systemFaction">Faction Type:</label>
                <select id="systemFaction">
                    <option value="">-- None --</option>
                    <option value="MUD" ${system.faction === 'MUD' ? 'selected' : ''}>MUD</option>
                    <option value="ONI" ${system.faction === 'ONI' ? 'selected' : ''}>ONI</option>
                    <option value="UST" ${system.faction === 'UST' ? 'selected' : ''}>UST</option>
                </select>
                <span class="form-note">(Determines planet types)</span>
            </div>
            
            <div class="form-group">
                <label for="systemControllingFaction">Controlling Faction:</label>
                <select id="systemControllingFaction">
                    <option value="MUD" ${system.controllingFaction === 'MUD' ? 'selected' : ''}>MUD</option>
                    <option value="ONI" ${system.controllingFaction === 'ONI' ? 'selected' : ''}>ONI</option>
                    <option value="UST" ${system.controllingFaction === 'UST' ? 'selected' : ''}>UST</option>
                    <option value="Neutral" ${system.controllingFaction === 'Neutral' || !system.controllingFaction ? 'selected' : ''}>Neutral</option>
                </select>
                <span class="form-note">(Current ownership)</span>
            </div>
            
            <div class="form-group">
                <label for="systemCore">CORE System:</label>
                <input type="checkbox" id="systemCore" ${system.isCore ? 'checked' : ''}>
            </div>
            
            <div class="form-group">
                <label for="systemKing">KING System:</label>
                <input type="checkbox" id="systemKing" ${system.isKing ? 'checked' : ''} disabled>
                <span class="form-note">(Automatically set based on link count)</span>
            </div>
            
            <div class="form-group">
                <label for="systemRegion">Region:</label>
                <select id="systemRegion">
                    <option value="">-- None --</option>
                    ${regionDefinitions.map(region => 
                        `<option value="${region.id}" ${system.regionId === region.id ? 'selected' : ''}>${region.name}</option>`
                    ).join('')}
                </select>
            </div>
        </div>
    `;
    
    // Starbase Section
    html += `
        <div class="detail-section">
            <h3>Starbase</h3>
            <div class="form-group">
                <label for="starbaseTier">Tier:</label>
                <select id="starbaseTier" ${isLocked ? 'disabled' : ''}>
                    ${[0, 1, 2, 3, 4, 5].map(tier => 
                        `<option value="${tier}" ${(system.starbase && system.starbase.tier === tier) ? 'selected' : ''}>Tier ${tier}</option>`
                    ).join('')}
                </select>
            </div>
        </div>
    `;
    
    // Stars Section
    html += `
        <div class="detail-section">
            <h3 class="accordion-header" data-section="stars">Stars (${system.stars ? system.stars.length : 0}/3) <span class="accordion-icon">▼</span></h3>
            <div id="starsContainer" class="accordion-content" style="display: none;">
                ${generateStarsHTML(system)}
            </div>
            ${system.stars && system.stars.length < 3 ? `
                <div class="button-row accordion-content" style="display: none;">
                    <button id="addStarBtn" class="small-btn" ${isLocked ? 'disabled' : ''}>Add Star</button>
                </div>
            ` : ''}
        </div>
    `;
    
    // Planets Section
    html += `
        <div class="detail-section">
            <h3 class="accordion-header" data-section="planets">Planets (${system.planets ? system.planets.length : 0}) <span class="accordion-icon">▼</span></h3>
            <div id="planetsContainer" class="accordion-content" style="display: none;">
                ${generatePlanetsHTML(system)}
            </div>
            <div class="button-row accordion-content" style="display: none;">
                <button id="addPlanetBtn" class="small-btn" ${isLocked ? 'disabled' : ''}>Add Planet</button>
            </div>
        </div>
    `;
    
    // Links Section
    html += `
        <div class="detail-section">
            <h3>Links (${system.links ? system.links.length : 0})</h3>
            <div id="linksContainer">
                ${generateLinksHTML(system)}
            </div>
        </div>
    `;
    
    // Set the HTML for system details tab
    detailsContent.innerHTML = html;
    
    // Generate resources content for resources tab
    if (resourcesContent) {
        let resourcesHtml = `<h3>Resources in ${system.name || 'System'}</h3>`;
        
        // Display resources by planet
        if (system.planets && system.planets.length > 0) {
            resourcesHtml += '<div class="planet-resources">';
            
            system.planets.forEach((planet, index) => {
                resourcesHtml += `
                    <div class="planet-section">
                        <h4>${planet.name || `Planet ${index + 1}`}</h4>
                `;
                
                if (planet.resources && planet.resources.length > 0) {
                    resourcesHtml += '<div class="resource-list">';
                    resourcesHtml += '<table class="resource-table">';
                    resourcesHtml += '<thead><tr><th>Resource</th><th>Richness</th><th>Actions</th></tr></thead>';
                    resourcesHtml += '<tbody>';
                    
                    planet.resources.forEach(resource => {
                        resourcesHtml += `
                            <tr>
                                <td>${resource.name || 'Unknown'}</td>
                                <td>${resource.richness || 1}</td>
                                <td>
                                    <button class="small-btn edit-planet-resource" data-planet="${index}" data-resource="${resource.name}">Edit</button>
                                </td>
                            </tr>
                        `;
                    });
                    
                    resourcesHtml += '</tbody></table>';
                    resourcesHtml += '</div>';
                } else {
                    resourcesHtml += '<p>No resources on this planet</p>';
                }
                
                resourcesHtml += `
                        <div class="button-row">
                            <button class="small-btn edit-resources-btn" data-index="${index}">Edit Resources</button>
                        </div>
                    </div>
                `;
            });
            
            resourcesHtml += '</div>';
        } else {
            resourcesHtml += '<p>No planets in this system</p>';
        }
        
        resourcesContent.innerHTML = resourcesHtml;
    }
    
    // Add event listeners
    setupSystemDetailsEventListeners(system);
}

// Display details for multiple selected systems
function displayMultipleSystemDetails(systems, detailsContent) {
    // Check if any selected system is locked
    const anyLocked = systems.some(s => s.isLocked);
    console.log(`Displaying details for ${systems.length} systems. Any locked: ${anyLocked}`);
    
    // Add class to the main container if any system is locked
    const detailsPanel = document.getElementById('detailsPanel');
    if (detailsPanel) {
        if (anyLocked) {
            detailsPanel.classList.add('locked-mode');
        } else {
            detailsPanel.classList.remove('locked-mode');
        }
    }
    
    // Generate HTML for multi-select mode
    let html = `
        <div class="detail-section">
            <div class="system-actions" style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
                <button id="centerSystemGroupBtn" style="display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 12px; border-radius: 4px; background: rgba(255,255,255,0.15); border: none; cursor: pointer; font-size: 0.9em;" title="Center View on Selected Systems">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="7"></circle>
                        <circle cx="12" cy="12" r="3"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                    </svg>
                    Center View
                </button>
            </div>
            <h3>Multiple Systems Selected (${systems.length})</h3>
            
            <div class="form-group">
                <label for="bulkFaction">Set Faction Type for All:</label>
                <select id="bulkFaction">
                    <option value="">-- No Change --</option>
                    <option value="none">-- None --</option>
                    <option value="MUD">MUD</option>
                    <option value="ONI">ONI</option>
                    <option value="UST">UST</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="bulkControllingFaction">Set Controlling Faction for All:</label>
                <select id="bulkControllingFaction">
                    <option value="">-- No Change --</option>
                    <option value="MUD">MUD</option>
                    <option value="ONI">ONI</option>
                    <option value="UST">UST</option>
                    <option value="Neutral">Neutral</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="bulkCore">CORE System Status:</label>
                <select id="bulkCore">
                    <option value="">-- No Change --</option>
                    <option value="true">Set as CORE</option>
                    <option value="false">Remove CORE Status</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="bulkRegion">Set Region for All:</label>
                <select id="bulkRegion">
                    <option value="">-- No Change --</option>
                    <option value="none">-- Remove Region --</option>
                    ${regionDefinitions.map(region => 
                        `<option value="${region.id}">${region.name}</option>`
                    ).join('')}
                </select>
            </div>
            
            <div class="distribution-buttons">
                <button id="generateDistributionBtn" class="distribution-btn" ${anyLocked ? 'disabled' : ''}>Generate Regional Distribution</button>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>System Statistics</h3>
            ${generateSystemStatistics(systems)}
        </div>
        
        <div class="detail-section">
            <h3>Selected Systems:</h3>
            <ul class="selected-systems-list" style="list-style-type: none; padding: 0; margin: 0;">
                ${systems.map(system => `
                    <li style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; margin-bottom: 4px; border-radius: 4px; background: rgba(50,50,50,0.3);">
                        <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${system.name || 'Unnamed'} 
                            ${system.faction ? `<span style="opacity: 0.8; font-size: 0.9em;">(${system.faction})</span>` : ''}
                            ${system.isKing ? `<span style="display: inline-block; padding: 1px 6px; border-radius: 3px; background: #9b59b6; color: #fff; font-size: 0.75em; margin-left: 4px;">KING</span>` : ''}
                            ${system.isCore ? `<span style="display: inline-block; padding: 1px 6px; border-radius: 3px; background: #f1c40f; color: #000; font-size: 0.75em; margin-left: 4px;">CORE</span>` : ''}
                            ${system.regionId ? `<span style="display: inline-block; padding: 1px 6px; border-radius: 3px; background-color: ${getRegionColor(system.regionId) || '#777'}; color: #fff; font-size: 0.75em; margin-left: 4px;">${getRegionName(system.regionId)}</span>` : ''}
                            ${system.isLocked ? '<span class="locked-indicator-inline">(Locked)</span>' : ''} <!-- Inline lock indicator -->
                        </div>
                        <button class="center-individual-btn icon-btn" data-key="${system.key}" title="Center on System"
                                style="width: 24px; height: 24px; padding: 0; border-radius: 4px; background: rgba(255,255,255,0.1); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="7"></circle>
                                <circle cx="12" cy="12" r="3"></circle>
                                <line x1="12" y1="1" x2="12" y2="3"></line>
                                <line x1="12" y1="21" x2="12" y2="23"></line>
                                <line x1="1" y1="12" x2="3" y2="12"></line>
                                <line x1="21" y1="12" x2="23" y2="12"></line>
                            </svg>
                        </button>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
    
    // Set the HTML
    detailsContent.innerHTML = html;
    
    // Add event listeners for bulk operations
    document.getElementById('bulkFaction').addEventListener('change', function() {
        if (anyLocked) { console.log("Bulk edit prevented: Locked system selected."); return; } // Prevent action if locked
        const factionValue = this.value;
        if (!factionValue) return;
        
        saveState(`Changed Faction Type for ${systems.length} Systems`);
        
        systems.forEach(system => {
            if (factionValue === 'none') {
                system.faction = null;
            } else {
                system.faction = factionValue;
            }
        });
        
        displaySystemDetails(systems);
        drawGalaxyMap();
    });
    
    document.getElementById('bulkControllingFaction').addEventListener('change', function() {
        if (anyLocked) { console.log("Bulk edit prevented: Locked system selected."); return; } // Prevent action if locked
        const factionValue = this.value;
        if (!factionValue) return;
        
        saveState(`Changed Controlling Faction for ${systems.length} Systems`);
        
        systems.forEach(system => {
            system.controllingFaction = factionValue;
        });
        
        displaySystemDetails(systems);
        drawGalaxyMap();
        systems.forEach(system => drawSystemPreview(system)); // Update starbase colors
    });
    
    // Add event listeners for the center buttons
    document.getElementById('centerSystemGroupBtn').addEventListener('click', function() {
        centerViewOnSystemGroup(systems);
    });
    
    const centerIndividualBtns = document.querySelectorAll('.center-individual-btn');
    centerIndividualBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const systemKey = this.getAttribute('data-key');
            const system = systemLookup[systemKey];
            if (system) {
                centerViewOnSystem(system);
            }
        });
    });
    
    document.getElementById('bulkCore').addEventListener('change', function() {
        if (anyLocked) { console.log("Bulk edit prevented: Locked system selected."); return; } // Prevent action if locked
        const coreValue = this.value;
        if (!coreValue) return;
        
        saveState(`Changed CORE Status for ${systems.length} Systems`);
        
        systems.forEach(system => {
            system.isCore = coreValue === 'true';
        });
        
        displaySystemDetails(systems);
        drawGalaxyMap();
    });
    
    document.getElementById('bulkRegion').addEventListener('change', function() {
        if (anyLocked) { console.log("Bulk edit prevented: Locked system selected."); return; } // Prevent action if locked
        const regionValue = this.value;
        if (!regionValue) return;
        
        if (regionValue === 'none') {
            saveState(`Removed Region from ${systems.length} Systems`);
            systems.forEach(system => {
                delete system.regionId;
            });
        } else {
            const region = regionDefinitions.find(r => r.id === regionValue);
            if (region) {
                saveState(`Set Region to ${region.name} for ${systems.length} Systems`);
                systems.forEach(system => {
                    system.regionId = regionValue;
                });
            }
        }
        
        displaySystemDetails(systems);
        drawGalaxyMap();
    });
    
    document.getElementById('generateDistributionBtn').addEventListener('click', () => {
        if (typeof generateRegionalPlanetDistribution === 'function') {
            generateRegionalPlanetDistribution(systems);
        } else {
            alert('Generate distribution function not available.');
        }
    });
}

// Helper function to get region name from ID
function getRegionName(regionId) {
    if (!regionId) return '';
    const region = regionDefinitions.find(r => r.id === regionId);
    return region ? region.name : 'Unknown Region';
}

// Generate statistics for multiple systems
function generateSystemStatistics(systems) {
    if (!systems || systems.length === 0) return '<p>No systems selected</p>';
    
    // Count systems by faction and core status
    const factionCount = {
        'MUD': 0,
        'ONI': 0,
        'UST': 0,
        'Neutral': 0,
        'None': 0
    };
    
    let coreCount = 0;
    let kingCount = 0;
    let totalPlanets = 0;
    let totalStars = 0;
    
    // Count star types
    const starTypeCount = {};
    const starSystemCount = {
        'Single Star': 0,
        'Binary Star': 0, 
        'Trinary Star': 0
    };
    
    // Resource count by type
    const resourceCount = {};
    
    // Region count
    const regionCount = {};
    
    // Process each system
    systems.forEach(system => {
        // Count by faction
        if (system.faction) {
            factionCount[system.faction] = (factionCount[system.faction] || 0) + 1;
        } else {
            factionCount['None']++;
        }
        
        // Count KING systems
        if (system.isKing) {
            kingCount++;
        }
        
        // Count core systems
        if (system.isCore) {
            coreCount++;
        }
        
        // Count planets and their resources
        if (system.planets) {
            totalPlanets += system.planets.length;
            
            // Count resources
            system.planets.forEach(planet => {
                if (planet.resources) {
                    planet.resources.forEach(resource => {
                        resourceCount[resource.name] = (resourceCount[resource.name] || 0) + 1;
                    });
                }
            });
        }
        
        // Count stars and star types
        if (system.stars && system.stars.length > 0) {
            totalStars += system.stars.length;
            
            // Categorize by number of stars
            if (system.stars.length === 1) {
                starSystemCount['Single Star']++;
            } else if (system.stars.length === 2) {
                starSystemCount['Binary Star']++;
            } else if (system.stars.length >= 3) {
                starSystemCount['Trinary Star']++;
            }
            
            // Count star types
            system.stars.forEach(star => {
                if (star.type !== undefined) {
                    const starTypeObj = STAR_TYPES.find(t => t.type === star.type);
                    if (starTypeObj) {
                        starTypeCount[starTypeObj.name] = (starTypeCount[starTypeObj.name] || 0) + 1;
                    }
                }
            });
        }
        
        // Count regions
        if (system.regionId) {
            const regionName = getRegionName(system.regionId);
            regionCount[regionName] = (regionCount[regionName] || 0) + 1;
        }
    });
    
    // Generate HTML
    let html = `
        <div class="stats-container">
            <div class="stats-group">
                <h4>System Counts</h4>
                <div class="stat-row">
                    <span class="stat-label">Total Systems:</span>
                    <span class="stat-value">${systems.length}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">KING Systems:</span>
                    <span class="stat-value">${kingCount}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">CORE Systems:</span>
                    <span class="stat-value">${coreCount}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Regular Systems:</span>
                    <span class="stat-value">${systems.length - coreCount - kingCount}</span>
                </div>
            </div>
            
            <div class="stats-group">
                <h4>Factions</h4>
                ${Object.entries(factionCount)
                    .filter(([faction, count]) => count > 0)
                    .map(([faction, count]) => `
                        <div class="stat-row">
                            <span class="stat-label">${faction}:</span>
                            <span class="stat-value">${count}</span>
                        </div>
                    `).join('')
                }
            </div>
            
            <div class="stats-group">
                <h4>Regions</h4>
                ${Object.entries(regionCount).length > 0 ? 
                    Object.entries(regionCount)
                        .map(([region, count]) => `
                            <div class="stat-row">
                                <span class="stat-label">${region}:</span>
                                <span class="stat-value">${count}</span>
                            </div>
                        `).join('') 
                    : '<div class="stat-row">No regions assigned</div>'
                }
            </div>
            
            <div class="stats-group">
                <h4>Celestial Objects</h4>
                <div class="stat-row">
                    <span class="stat-label">Total Planets:</span>
                    <span class="stat-value">${totalPlanets}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Total Stars:</span>
                    <span class="stat-value">${totalStars}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Avg. Planets/System:</span>
                    <span class="stat-value">${(totalPlanets / systems.length).toFixed(1)}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Avg. Stars/System:</span>
                    <span class="stat-value">${(totalStars / systems.length).toFixed(1)}</span>
                </div>
            </div>
            
            <div class="stats-group">
                <h4>Star Systems</h4>
                ${Object.entries(starSystemCount)
                    .filter(([type, count]) => count > 0)
                    .map(([type, count]) => `
                        <div class="stat-row">
                            <span class="stat-label">${type}:</span>
                            <span class="stat-value">${count}</span>
                        </div>
                    `).join('')
                }
            </div>
            
            ${Object.keys(starTypeCount).length > 0 ? `
                <div class="stats-group">
                    <h4>Star Types</h4>
                    <div style="display: flex; flex-wrap: wrap; margin-top: 5px;">
                        ${Object.entries(starTypeCount)
                            .sort(([, countA], [, countB]) => countB - countA)
                            .map(([starType, count]) => {
                                // Generate CSS class name
                                const className = 'star-' + starType.toLowerCase().replace(/\s+/g, '-');
                                return `
                                    <div class="star-type-badge ${className}" 
                                         title="${starType}: ${count}">
                                        ${starType.split(' ')[0]} (${count})
                                    </div>
                                `;
                            }).join('')
                        }
                    </div>
                </div>
            ` : ''}
            
            ${Object.keys(resourceCount).length > 0 ? `
                <div class="stats-group">
                    <h4>Resources</h4>
                    <div class="resources-scroll" style="max-height: 250px; overflow-y: auto; padding-right: 5px;">
                    ${Object.entries(resourceCount)
                        .sort(([, countA], [, countB]) => countB - countA)
                        .map(([resource, count]) => `
                            <div class="stat-row">
                                <span class="stat-label">${resource}:</span>
                                <span class="stat-value">${count}</span>
                            </div>
                        `).join('')
                    }
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    return html;
}

// Generate HTML for stars section
function generateStarsHTML(system) {
    if (!system.stars || system.stars.length === 0) {
        return '<p>No stars in this system</p>';
    }
    
    let html = '';
    
    system.stars.forEach((star, index) => {
        html += `
            <div class="star-item" data-index="${index}">
                <h4>Star ${index + 1}</h4>
                
                <div class="form-group">
                    <label for="starName${index}">Name:</label>
                    <input type="text" id="starName${index}" value="${star.name || ''}">
                </div>
                
                <div class="form-group">
                    <label for="starType${index}">Type:</label>
                    <select id="starType${index}">
                        ${STAR_TYPES.map(type => `
                            <option value="${type.type}" ${star.type === type.type ? 'selected' : ''}>
                                ${type.name}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="starScale${index}">Scale:</label>
                    <input type="number" id="starScale${index}" value="${star.scale || 1.0}" step="0.1" min="0.1" max="5.0">
                </div>
                
                <div class="button-row">
                    <button class="remove-star-btn" data-index="${index}">Remove</button>
                </div>
            </div>
        `;
    });
    
    return html;
}

// Generate HTML for planets section
function generatePlanetsHTML(system) {
    if (!system.planets || system.planets.length === 0) {
        return '<p>No planets in this system</p>';
    }
    
    let html = '';
    
    system.planets.forEach((planet, index) => {
        html += `
            <div class="planet-item" data-index="${index}">
                <h4>Planet ${index + 1}</h4>
                
                <div class="form-group">
                    <label for="planetName${index}">Name:</label>
                    <input type="text" id="planetName${index}" value="${planet.name || ''}">
                </div>
                
                <div class="form-group">
                    <label for="planetType${index}">Type:</label>
                    <select id="planetType${index}">
                        ${PLANET_TYPES.map(type => `
                            <option value="${type.type}" ${planet.type === type.type ? 'selected' : ''}>
                                ${type.name}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="planetOrbit${index}">Orbit:</label>
                    <input type="number" id="planetOrbit${index}" value="${planet.orbit || 0}" step="0.1" min="0">
                </div>
                
                <div class="form-group">
                    <label for="planetAngle${index}">Angle:</label>
                    <input type="number" id="planetAngle${index}" value="${planet.angle || 0}" step="1" min="0" max="359">
                </div>
                
                <div class="form-group">
                    <label for="planetScale${index}">Scale:</label>
                    <input type="number" id="planetScale${index}" value="${planet.scale || 1.0}" step="0.1" min="0.1" max="3.0">
                </div>
                
                <div class="button-row">
                    <button class="edit-resources-btn" data-index="${index}">Edit Resources</button>
                    <button class="remove-planet-btn" data-index="${index}">Remove</button>
                </div>
            </div>
        `;
    });
    
    return html;
}

// Generate HTML for links section
function generateLinksHTML(system) {
    if (!system.links || system.links.length === 0) {
        return '<p>No links to other systems</p>';
    }
    
    let html = '<ul class="links-list" style="list-style-type: none; padding: 0; margin: 0;">';
    
    system.links.forEach(linkKey => {
        const linkedSystem = systemLookup[linkKey];
        
        if (linkedSystem) {
            const distance = Math.sqrt(
                (system.coordinates[0] - linkedSystem.coordinates[0]) ** 2 +
                (system.coordinates[1] - linkedSystem.coordinates[1]) ** 2
            );
            
            html += `
                <li class="link-item" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <div class="link-info" style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <span class="link-name" style="font-weight: 500;">${linkedSystem.name || 'Unknown'}</span>
                        <span class="link-distance" style="opacity: 0.7; font-size: 0.85em;">(${distance.toFixed(2)})</span>
                    </div>
                    <div class="link-actions" style="display: flex; gap: 4px;">
                        <button class="center-link-btn icon-btn" data-key="${linkKey}" title="Center on System" 
                                style="width: 24px; height: 24px; padding: 0; border-radius: 4px; background: rgba(255,255,255,0.1); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="7"></circle>
                                <circle cx="12" cy="12" r="3"></circle>
                                <line x1="12" y1="1" x2="12" y2="3"></line>
                                <line x1="12" y1="21" x2="12" y2="23"></line>
                                <line x1="1" y1="12" x2="3" y2="12"></line>
                                <line x1="21" y1="12" x2="23" y2="12"></line>
                            </svg>
                        </button>
                        <button class="select-link-btn icon-btn" data-key="${linkKey}" title="Select System"
                                style="width: 24px; height: 24px; padding: 0; border-radius: 4px; background: rgba(255,255,255,0.1); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </button>
                        <button class="remove-link-btn icon-btn" data-key="${linkKey}" title="Remove Link"
                                style="width: 24px; height: 24px; padding: 0; border-radius: 4px; background: rgba(255,0,0,0.15); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </li>
            `;
        } else {
            html += `
                <li style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <span style="color: #999;">Invalid Link</span>
                    <button class="remove-link-btn icon-btn" data-key="${linkKey}" title="Remove Link"
                            style="width: 24px; height: 24px; padding: 0; border-radius: 4px; background: rgba(255,0,0,0.15); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </li>
            `;
        }
    });
    
    html += '</ul>';
    return html;
}

// Setup event listeners for system details panel
function setupSystemDetailsEventListeners(system) {
    // Update region dropdown color indicator
    const regionSelect = document.getElementById('systemRegion');
    if (regionSelect && system.regionId) {
        const regionColor = getRegionColor(system.regionId);
        if (regionColor) {
            regionSelect.style.backgroundImage = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><rect width="12" height="12" fill="${regionColor.replace('#', '%23')}" /></svg>')`;
        }
    } else if (regionSelect) {
        // Clear background image if no region
        regionSelect.style.backgroundImage = '';
    }
    
    // Setup accordion functionality
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            const parentSection = this.closest('.detail-section');
            const accordionContents = parentSection.querySelectorAll('.accordion-content');
            const icon = this.querySelector('.accordion-icon');
            
            // Get the container specific to this section
            const containerElement = document.getElementById(`${section}Container`);
            
            // Toggle visibility based on container's current state
            const isVisible = containerElement && containerElement.style.display !== 'none';
            const newDisplayState = isVisible ? 'none' : 'block';
            
            // Toggle all accordion content elements in this section
            accordionContents.forEach(content => {
                content.style.display = newDisplayState;
            });
            
            // Update icon
            if (icon) {
                icon.textContent = isVisible ? '▼' : '▲';
            }
        });
    });
    
    // System details listeners
    document.getElementById('systemName').addEventListener('change', function() {
        const newValue = this.value.trim();
        if (system.name !== newValue) {
            system.name = newValue;
            saveState(`Renamed System to ${newValue}`);
            drawGalaxyMap();
            
            // Update the resources tab title if open
            const resourcesContent = document.getElementById('resourceDetailContent');
            if (resourcesContent) {
                const resourcesTitle = resourcesContent.querySelector('h3');
                if (resourcesTitle) {
                    resourcesTitle.textContent = `Resources in ${system.name || 'System'}`;
                }
            }
        }
    });
    
    document.getElementById('systemX').addEventListener('change', function() {
        const newValue = parseFloat(this.value);
        if (!isNaN(newValue) && system.coordinates[0] !== newValue) {
            system.coordinates[0] = newValue;
            saveState(`Changed System X Coordinate`);
            drawGalaxyMap();
        }
    });
    
    document.getElementById('systemY').addEventListener('change', function() {
        const newValue = parseFloat(this.value);
        if (!isNaN(newValue) && system.coordinates[1] !== newValue) {
            system.coordinates[1] = newValue;
            saveState(`Changed System Y Coordinate`);
            drawGalaxyMap();
        }
    });
    
    document.getElementById('systemFaction').addEventListener('change', function() {
        const newValue = this.value;
        if ((system.faction || '') !== newValue) {
            system.faction = newValue || null;
            saveState(`Changed System Faction to ${newValue || 'None'}`);
            drawGalaxyMap();
        }
    });
    
    document.getElementById('systemControllingFaction').addEventListener('change', function() {
        const newValue = this.value;
        if ((system.controllingFaction || 'Neutral') !== newValue) {
            system.controllingFaction = newValue || 'Neutral';
            saveState(`Changed Controlling Faction to ${newValue || 'Neutral'}`);
            drawGalaxyMap();
            drawSystemPreview(system); // Update starbase color
        }
    });
    
    document.getElementById('systemCore').addEventListener('change', function() {
        const newValue = this.checked;
        if ((system.isCore || false) !== newValue) {
            system.isCore = newValue;
            saveState(`Set System Core Status to ${newValue}`);
            drawGalaxyMap();
        }
    });
    
    document.getElementById('systemKing').addEventListener('change', function() {
        const newValue = this.checked;
        if ((system.isKing || false) !== newValue) {
            system.isKing = newValue;
            saveState(`Set System KING Status to ${newValue}`);
            drawGalaxyMap();
        }
    });
    
    document.getElementById('systemRegion').addEventListener('change', function() {
        const newValue = this.value;
        const oldRegionId = system.regionId || '';
        
        if (oldRegionId !== newValue) {
            if (newValue === '') {
                // Remove from region
                delete system.regionId;
                saveState(`Removed System from Region`);
                // Clear background image
                this.style.backgroundImage = '';
            } else {
                // Assign to new region
                system.regionId = newValue;
                const region = regionDefinitions.find(r => r.id === newValue);
                saveState(`Assigned System to Region ${region ? region.name : 'Unknown'}`);
                // Set background image for color indicator
                const regionColor = region ? region.color : null;
                if (regionColor) {
                    this.style.backgroundImage = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><rect width="12" height="12" fill="${regionColor.replace('#', '%23')}" /></svg>')`;
                }
            }
            drawGalaxyMap();
        }
    });
    
    // Starbase tier listener
    const starbaseTierSelect = document.getElementById('starbaseTier');
    if (starbaseTierSelect) {
        starbaseTierSelect.addEventListener('change', function() {
            const newTier = parseInt(this.value);
            if (!system.starbase) {
                system.starbase = { tier: 0 };
            }
            const oldTier = system.starbase.tier;
            
            if (newTier !== oldTier) {
                system.starbase.tier = newTier;
                saveState(`Changed Starbase Tier to ${newTier}`);
                drawSystemPreview(system); // Update preview if starbase is shown there
            }
        });
    }
    
    // Add star button
    const addStarBtn = document.getElementById('addStarBtn');
    if (addStarBtn) {
        addStarBtn.addEventListener('click', function() {
            addStar(system);
            drawGalaxyMap();
            displaySystemDetails([system]);
            drawSystemPreview(system);
        });
    }
    
    // Add planet button
    document.getElementById('addPlanetBtn').addEventListener('click', function() {
        addNewPlanet(system);
        drawGalaxyMap();
        displaySystemDetails([system]);
        drawSystemPreview(system);
    });
    
    // Star detail listeners
    if (system.stars) {
        system.stars.forEach((star, index) => {
            const nameInput = document.getElementById(`starName${index}`);
            const typeSelect = document.getElementById(`starType${index}`);
            const scaleInput = document.getElementById(`starScale${index}`);
            
            if (nameInput) {
                nameInput.addEventListener('change', function() {
                    const newValue = this.value.trim();
                    if (star.name !== newValue) {
                        star.name = newValue;
                        saveState(`Renamed Star to ${newValue}`);
                        drawSystemPreview(system);
                    }
                });
            }
            
            if (typeSelect) {
                typeSelect.addEventListener('change', function() {
                    const newValue = parseInt(this.value);
                    if (star.type !== newValue) {
                        star.type = newValue;
                        
                        // Update name if it matches a star type
                        const starType = STAR_TYPES.find(t => t.type === newValue);
                        if (starType) {
                            nameInput.value = starType.name;
                            star.name = starType.name;
                        }
                        
                        saveState(`Changed Star Type`);
                        drawSystemPreview(system);
                    }
                });
            }
            
            if (scaleInput) {
                scaleInput.addEventListener('change', function() {
                    const newValue = parseFloat(this.value);
                    if (!isNaN(newValue) && star.scale !== newValue) {
                        star.scale = newValue;
                        saveState(`Changed Star Scale`);
                        drawSystemPreview(system);
                    }
                });
            }
        });
    }
    
    // Remove star buttons
    const removeStarBtns = document.querySelectorAll('.remove-star-btn');
    removeStarBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            if (system.stars && index >= 0 && index < system.stars.length) {
                deleteStar(system, index);
            }
        });
    });
    
    // Planet detail listeners
    if (system.planets) {
        system.planets.forEach((planet, index) => {
            const nameInput = document.getElementById(`planetName${index}`);
            const typeSelect = document.getElementById(`planetType${index}`);
            const orbitInput = document.getElementById(`planetOrbit${index}`);
            const angleInput = document.getElementById(`planetAngle${index}`);
            const scaleInput = document.getElementById(`planetScale${index}`);
            
            if (nameInput) {
                nameInput.addEventListener('change', function() {
                    const newValue = this.value.trim();
                    if (planet.name !== newValue) {
                        planet.name = newValue;
                        saveState(`Renamed Planet to ${newValue}`);
                        drawSystemPreview(system);
                        
                        // Update the resources tab if it's open
                        displaySystemDetails([system]);
                    }
                });
            }
            
            if (typeSelect) {
                typeSelect.addEventListener('change', function() {
                    const newValue = parseInt(this.value);
                    if (planet.type !== newValue) {
                        // Save the old planet type for state history
                        saveState(`Changed Planet Type`);
                        
                        // Update planet type
                        planet.type = newValue;
                        
                        // Update name if it's empty
                        const planetType = PLANET_TYPES.find(t => t.type === newValue);
                        if (planetType && (!planet.name || planet.name === '')) {
                            nameInput.value = planetType.name;
                            planet.name = planetType.name;
                        }
                        
                        // Update planet resources with resources from state.js
                        if (planetType) {
                            const { archetype, faction } = window.getPlanetArchetype(planetType.name);
                            if (faction && archetype && 
                                window.PLANET_ARCHETYPE_RESOURCES && 
                                window.PLANET_ARCHETYPE_RESOURCES[faction] && 
                                window.PLANET_ARCHETYPE_RESOURCES[faction][archetype]) {
                                
                                // Always replace resources completely with the correct mapping
                                planet.resources = deepCopy(window.PLANET_ARCHETYPE_RESOURCES[faction][archetype]);
                                console.log(`Updated resources for ${planet.name} to match ${faction} ${archetype} type`);
                            }
                        }
                        
                        // Update UI
                        drawSystemPreview(system);
                        displaySystemDetails([system]);
                    }
                });
            }
            
            if (orbitInput) {
                orbitInput.addEventListener('change', function() {
                    const newValue = parseFloat(this.value);
                    if (!isNaN(newValue) && planet.orbit !== newValue) {
                        planet.orbit = newValue;
                        saveState(`Changed Planet Orbit`);
                        drawSystemPreview(system);
                    }
                });
            }
            
            if (angleInput) {
                angleInput.addEventListener('change', function() {
                    const newValue = parseFloat(this.value);
                    if (!isNaN(newValue) && planet.angle !== newValue) {
                        planet.angle = newValue;
                        saveState(`Changed Planet Angle`);
                        drawSystemPreview(system);
                    }
                });
            }
            
            if (scaleInput) {
                scaleInput.addEventListener('change', function() {
                    const newValue = parseFloat(this.value);
                    if (!isNaN(newValue) && planet.scale !== newValue) {
                        planet.scale = newValue;
                        saveState(`Changed Planet Scale`);
                        drawSystemPreview(system);
                    }
                });
            }
        });
    }
    
    // Edit resources buttons (in both tabs)
    const editResourcesBtns = document.querySelectorAll('.edit-resources-btn');
    editResourcesBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            if (system.planets && index >= 0 && index < system.planets.length) {
                openResourceEditor(system, system.planets[index]);
            }
        });
    });
    
    // Remove planet buttons
    const removePlanetBtns = document.querySelectorAll('.remove-planet-btn');
    removePlanetBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            if (system.planets && index >= 0 && index < system.planets.length) {
                const planetName = system.planets[index].name || `Planet ${index+1}`;
                saveState(`Removed Planet ${planetName}`);
                
                system.planets.splice(index, 1);
                displaySystemDetails([system]);
                drawSystemPreview(system);
            }
        });
    });
    
    // Remove link buttons
    const removeLinkBtns = document.querySelectorAll('.remove-link-btn');
    removeLinkBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const linkKey = this.getAttribute('data-key');
            const linkedSystem = systemLookup[linkKey];
            
            if (linkKey && system.links) {
                const linkedName = linkedSystem ? linkedSystem.name : 'Unknown';
                saveState(`Removed Link to ${linkedName}`);
                
                // Remove link from this system
                system.links = system.links.filter(key => key !== linkKey);
                
                // Remove reciprocal link from linked system
                if (linkedSystem && linkedSystem.links) {
                    linkedSystem.links = linkedSystem.links.filter(key => key !== system.key);
                }
                
                displaySystemDetails([system]);
                drawGalaxyMap();
            }
        });
    });
    
    // Center on linked system buttons
    const centerLinkBtns = document.querySelectorAll('.center-link-btn');
    centerLinkBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const linkKey = this.getAttribute('data-key');
            const linkedSystem = systemLookup[linkKey];
            
            if (linkedSystem) {
                centerViewOnSystem(linkedSystem);
            }
        });
    });
    
    // Select linked system buttons
    const selectLinkBtns = document.querySelectorAll('.select-link-btn');
    selectLinkBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const linkKey = this.getAttribute('data-key');
            const linkedSystem = systemLookup[linkKey];
            
            if (linkedSystem) {
                selectedSystems = [linkedSystem];
                displaySystemDetails(selectedSystems);
                centerViewOnSystem(linkedSystem);
            }
        });
    });
    
    // Setup event listeners for the individual resource edit buttons in the resources tab
    const editPlanetResourceBtns = document.querySelectorAll('.edit-planet-resource');
    editPlanetResourceBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const planetIndex = parseInt(this.getAttribute('data-planet'));
            const resourceName = this.getAttribute('data-resource');
            
            if (system.planets && planetIndex >= 0 && planetIndex < system.planets.length) {
                const planet = system.planets[planetIndex];
                
                // Find the resource by name
                const resourceIndex = planet.resources.findIndex(r => r.name === resourceName);
                if (resourceIndex === -1) {
                    console.error(`Resource "${resourceName}" not found in planet ${planet.name}`);
                    return;
                }
                
                const resource = planet.resources[resourceIndex];
                
                // Create a modal for editing resource richness
                const modal = document.createElement('div');
                modal.className = 'modal-dialog resource-editor';
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>Edit Resource: ${resourceName}</h3>
                        <div class="form-group">
                            <label for="resourceRichness">Richness:</label>
                            <input type="number" id="resourceRichness" value="${resource.richness || 1}" step="1">
                        </div>
                        <div class="button-row">
                            <button id="saveResourceBtn">Save</button>
                            <button id="cancelResourceBtn">Cancel</button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                // Add event listeners for the buttons
                document.getElementById('saveResourceBtn').addEventListener('click', function() {
                    const richnessInput = document.getElementById('resourceRichness');
                    const newRichness = parseInt(richnessInput.value);
                    
                    if (isNaN(newRichness)) {
                        alert('Richness must be a number');
                        return;
                    }
                    
                    // Update the resource richness
                    resource.richness = newRichness;
                    saveState(`Updated richness of ${resourceName} to ${newRichness}`);
                    
                    // Close the modal
                    document.body.removeChild(modal);
                    
                    // Refresh the UI
                    displaySystemDetails([system]);
                });
                
                document.getElementById('cancelResourceBtn').addEventListener('click', function() {
                    document.body.removeChild(modal);
                });
            }
        });
    });
    
    // Switch to resources tab when edit resources button is clicked
    const allEditResourcesBtns = document.querySelectorAll('.edit-resources-btn, .edit-planet-resource');
    allEditResourcesBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Find the resources tab and click it
            const resourcesTab = document.querySelector('.details-tab[data-tab="resources-tab"]');
            if (resourcesTab) {
                resourcesTab.click();
            }
        });
    });

    // Center system button
    const centerSystemBtn = document.getElementById('centerSystemBtn');
    if (centerSystemBtn) {
        centerSystemBtn.addEventListener('click', function() {
            centerViewOnSystem(system);
        });
    }
    
    // Expand preview button
    const expandPreviewBtn = document.getElementById('expandPreviewBtn');
    if (expandPreviewBtn) {
        // Update button text based on current state
        if (window.isSystemPreviewExpanded) {
            expandPreviewBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>
                </svg>
                Minimize
            `;
        } else {
            expandPreviewBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                </svg>
                Expand
            `;
        }
        
        expandPreviewBtn.addEventListener('click', function() {
            toggleExpandedSystemPreview(system);
        });
    }
    
    // Draw system preview
    // Use auto-center if we're not in expanded view
    const autoCenter = !window.isSystemPreviewExpanded;
    drawSystemPreview(system, autoCenter);
}

// Add a new star to a system
function addStar(system) {
    if (!system) return;
    
    if (!system.stars) {
        system.stars = [];
    }
    
    // Check if we already have max stars
    if (system.stars.length >= 3) {
        alert("A system cannot have more than 3 stars");
        return;
    }
    
    // Add a new star with default values
    const starIndex = system.stars.length;
    const newStar = {
        name: `${system.name} ${String.fromCharCode(65 + starIndex)}`, // A, B, C
        type: "G", // Default type
        size: 1.0, // Default size
        color: "#ffcc33" // Default yellow color
    };
    
    system.stars.push(newStar);
    
    // Update UI
    updateStarHeaders(system);
    displaySystemDetails([system]);
    drawSystemPreview(system);
    drawGalaxyMap();
    
    // Save state with a grouping parameter - first item in a potential group
    saveState(`Added star ${starIndex + 1} to system ${system.name}`);
}

// Example: Updating star properties - this could be grouped with other star edits
function updateStarProperty(system, starIndex, property, value) {
    if (!system || !system.stars || starIndex >= system.stars.length) return;
    
    const star = system.stars[starIndex];
    const oldValue = star[property];
    star[property] = value;
    
    // Update UI
    if (property === 'name') {
        updateStarHeaders(system);
    }
    
    displaySystemDetails([system]);
    drawSystemPreview(system);
    drawGalaxyMap();
    
    // Group this action with previous ones if they're related to the same star
    const isGroup = (lastActionGroup !== null && lastActionGroup.toString().includes(`Star ${starIndex + 1} in system ${system.name}`));
    saveState(`Updated ${property} of Star ${starIndex + 1} in system ${system.name} (${oldValue} → ${value})`, isGroup);
}

// Example: When editing planets, group related actions
function addPlanet(system) {
    if (!system) return;
    
    if (!system.planets) {
        system.planets = [];
    }
    
    // Add a new planet with default values
    const planetIndex = system.planets.length;
    const newPlanet = {
        name: `${system.name} ${planetIndex + 1}`, // Planet 1, Planet 2, etc.
        type: "Terrestrial", // Default type
        size: 1.0, // Default size
        resources: [],
        position: planetIndex + 1 // Position from star
    };
    
    // If this is the first planet, add default resources based on type
    if (newPlanet.type && PLANET_ARCHETYPE_RESOURCES[system.faction] && 
        PLANET_ARCHETYPE_RESOURCES[system.faction][newPlanet.type]) {
        // Copy resources from the archetype
        const archetypeResources = PLANET_ARCHETYPE_RESOURCES[system.faction][newPlanet.type];
        newPlanet.resources = JSON.parse(JSON.stringify(archetypeResources));
    }
    
    system.planets.push(newPlanet);
    
    // Update UI
    displaySystemDetails([system]);
    drawSystemPreview(system);
    
    // Save state with a grouping parameter - first item in a potential group
    saveState(`Added planet ${planetIndex + 1} to system ${system.name}`);
}

// Example: Updating planet properties
function updatePlanetProperty(system, planetIndex, property, value) {
    if (!system || !system.planets || planetIndex >= system.planets.length) return;
    
    const planet = system.planets[planetIndex];
    const oldValue = planet[property];
    planet[property] = value;
    
    // Special handling for type changes - update resources based on type
    if (property === 'type') {
        // Only replace resources when a type actually exists in the archetype
        if (system.faction && PLANET_ARCHETYPE_RESOURCES[system.faction] && 
            PLANET_ARCHETYPE_RESOURCES[system.faction][value]) {
            
            // Ask for confirmation if there are existing resources
            let shouldReplace = true;
            if (planet.resources && planet.resources.length > 0) {
                shouldReplace = confirm("Do you want to replace the existing resources with the default resources for this planet type?");
            }
            
            if (shouldReplace) {
                // Copy resources from the archetype
                const archetypeResources = PLANET_ARCHETYPE_RESOURCES[system.faction][value];
                planet.resources = JSON.parse(JSON.stringify(archetypeResources));
            }
        }
    }
    
    // Update UI
    displaySystemDetails([system]);
    drawSystemPreview(system);
    
    // Group this action with previous ones if they're related to the same planet
    const isGroup = (lastActionGroup !== null && lastActionGroup.toString().includes(`Planet ${planetIndex + 1} in system ${system.name}`));
    saveState(`Updated ${property} of Planet ${planetIndex + 1} in system ${system.name} (${oldValue} → ${value})`, isGroup);
}

// Delete a star from a system
function deleteStar(system, starIndex) {
    if (!system || !system.stars || starIndex < 0 || starIndex >= system.stars.length) {
        return;
    }
    
    // Remove the star
    system.stars.splice(starIndex, 1);
    
    // Save state for undo
    saveState(`Removed star from ${system.name}`);
    
    // Update star headers in UI
    updateStarHeaders(system);
    
    // Refresh
    displaySystemDetails([system]);
    drawSystemPreview(system);
}

// Add a new planet to a system
function addNewPlanet(system) {
    if (!system) return;
    if (!system.planets) system.planets = []; // Initialize if missing
    
    // Choose next available orbit
    let orbitValue = 1;
    if (system.planets.length > 0) {
        // Find max orbit and add 1
        orbitValue = Math.max(...system.planets.map(p => p.orbit || 0)) + 1;
    }
    
    // Choose random angle
    const angleValue = Math.floor(Math.random() * 360);
    
    // Default to terrestrial planet type based on faction
    let typeValue = 0; // Default to ONI Terrestrial
    if (system.faction === 'MUD') typeValue = 8; // MUD Terrestrial
    else if (system.faction === 'UST') typeValue = 16; // USTUR Terrestrial
    else if (system.faction === 'Neutral') typeValue = 24; // Neutral Terrestrial
    
    // Generate a default name
    const planetCounter = system.planets.length + 1;
    const defaultName = `${system.name || 'SYS'}-P${planetCounter}`;
    
    saveState(`Added Planet ${defaultName} to ${system.name}`);
    
    const newPlanet = {
        name: defaultName,
        type: typeValue,
        orbit: orbitValue,
        angle: angleValue,
        scale: 1.0,
        resources: []
    };

    // Set default resources directly from state.js
    // First convert the numeric type value to a planet type name
    const planetTypeName = getPlanetTypeName(typeValue);
    const { archetype, faction: planetFaction } = window.getPlanetArchetype(planetTypeName);
    if (planetFaction && archetype && window.PLANET_ARCHETYPE_RESOURCES && 
        window.PLANET_ARCHETYPE_RESOURCES[planetFaction] && 
        window.PLANET_ARCHETYPE_RESOURCES[planetFaction][archetype]) {
        newPlanet.resources = deepCopy(window.PLANET_ARCHETYPE_RESOURCES[planetFaction][archetype]);
        console.log(`Set resources for ${newPlanet.name} (${planetFaction} ${archetype})`);
    } else {
        console.warn(`No resources found for planet type: ${planetTypeName} (${planetFaction} ${archetype})`);
    }
    
    system.planets.push(newPlanet);
    console.log(`Added planet ${newPlanet.name} to system ${system.name}`);
}

// Open resource editor modal
function openResourceEditor(system, planet) {
    if (!system || !planet) return;
    
    // Ensure planet has resources array
    if (!planet.resources) planet.resources = [];
    
    // Create modal dialog
    const modal = document.createElement('div');
    modal.className = 'modal-dialog resource-editor';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Resources for ${planet.name || 'Unnamed Planet'}</h3>
            <div class="resource-editor-content">
                <div class="resource-list" id="resourceList">
                    ${generateResourceListHTML(planet)}
                </div>
                <div class="resource-controls">
                    <button id="addResourceBtn" class="small-btn">Add Resource</button>
                    <button id="addDefaultResourcesBtn" class="small-btn">Add Default Resources</button>
                    <button id="clearResourcesBtn" class="small-btn">Clear All</button>
                </div>
            </div>
            <div class="button-row">
                <button id="closeResourceEditorBtn">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('addResourceBtn').addEventListener('click', () => {
        openAddResourceDialog(system, planet, modal);
    });
    
    document.getElementById('addDefaultResourcesBtn').addEventListener('click', () => {
        const planetTypeName = getPlanetTypeName(planet.type);
        
        // Get archetype and faction for the planet type
        const { archetype, faction } = window.getPlanetArchetype(planetTypeName);
        
        // Only use the resource mapping from state.js
        if (faction && archetype && window.PLANET_ARCHETYPE_RESOURCES && 
            window.PLANET_ARCHETYPE_RESOURCES[faction] && 
            window.PLANET_ARCHETYPE_RESOURCES[faction][archetype]) {
            
            // Replace all existing resources with the appropriate ones from state.js
            planet.resources = deepCopy(window.PLANET_ARCHETYPE_RESOURCES[faction][archetype]);
            saveState(`Updated Resources for ${planet.name}`);
            
            // Update resource list
            document.getElementById('resourceList').innerHTML = generateResourceListHTML(planet);
            setupResourceListEventListeners(planet);
            console.log(`Updated resources for ${planet.name} to match ${faction} ${archetype} type`);
        } else {
            alert(`No resources found for planet type: ${planetTypeName}\nArchetype: ${archetype}, Faction: ${faction}`);
        }
    });
    
    document.getElementById('clearResourcesBtn').addEventListener('click', () => {
        planet.resources = [];
        saveState(`Cleared Resources from ${planet.name}`);
        document.getElementById('resourceList').innerHTML = generateResourceListHTML(planet);
    });
    
    document.getElementById('closeResourceEditorBtn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // Setup resource list event listeners
    setupResourceListEventListeners(planet);
}

// Generate resource list HTML
function generateResourceListHTML(planet) {
    if (!planet.resources || planet.resources.length === 0) {
        return '<p>No resources on this planet</p>';
    }
    
    let html = '<table class="resource-table"><thead><tr><th>Name</th><th>Richness</th><th>Actions</th></tr></thead><tbody>';
    
    planet.resources.forEach((resource, index) => {
        const resourceName = resource.name || 'Unknown Resource';
        const richness = resource.richness || 1;
        
        html += `
            <tr>
                <td>${resourceName}</td>
                <td>${richness}</td>
                <td>
                    <button class="remove-resource-btn small-btn" data-index="${index}">Remove</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    return html;
}

// Setup resource list event listeners
function setupResourceListEventListeners(planet) {
    const removeButtons = document.querySelectorAll('.remove-resource-btn');
    
    removeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            
            if (index >= 0 && index < planet.resources.length) {
                const resourceName = planet.resources[index].name || 'Unknown Resource';
                // Store the resource that's being removed
                const removedResource = planet.resources[index];
                
                // Remove the resource from the planet's resources array
                planet.resources.splice(index, 1);
                saveState(`Removed Resource ${resourceName}`);
                
                // Log the removal for debugging
                console.log(`Removed resource: ${resourceName}`, 
                    `Remaining resources: ${planet.resources.map(r => r.name).join(', ')}`);
                
                // Update resource list
                document.getElementById('resourceList').innerHTML = generateResourceListHTML(planet);
                setupResourceListEventListeners(planet);
            }
        });
    });
}

// Open add resource dialog
function openAddResourceDialog(system, planet, parentModal) {
    const resourceModal = document.createElement('div');
    resourceModal.className = 'modal-dialog resource-selector';
    
    let html = `
        <div class="modal-content">
            <h3>Add Resource to ${planet.name}</h3>
            <div class="resource-selector-content">
                <div class="form-group">
                    <label for="resourceSearch">Search:</label>
                    <input type="text" id="resourceSearch" placeholder="Search resources...">
                </div>
                <div class="resource-grid" id="resourceGrid">
    `;
    
    // Build resource grid grouped by category
    const resourceCategories = {
        'Common': RESOURCE_TYPES.filter(r => r.richness === 1),
        'Uncommon': RESOURCE_TYPES.filter(r => r.richness === 2),
        'Rare': RESOURCE_TYPES.filter(r => r.richness === 3),
        'Very Rare': RESOURCE_TYPES.filter(r => r.richness === 4)
    };
    
    // Check which resources are already on the planet by name
    const existingResourceNames = new Set(planet.resources.map(r => r.name?.toLowerCase()));
    
    for (const category in resourceCategories) {
        html += `<div class="resource-category-container" data-category="${category}"><h4>${category}</h4><div class="resource-category">`;
        
        resourceCategories[category].forEach(resource => {
            const isExisting = existingResourceNames.has(resource.name?.toLowerCase());
            const resourceColor = RESOURCE_COLORS[resource.name.toLowerCase()] || RESOURCE_COLORS.default;
            
            html += `
                <div class="resource-item ${isExisting ? 'existing' : ''}" 
                    data-type="${resource.type}" 
                    data-name="${resource.name}"
                    data-richness="${resource.richness}"
                    style="border-color: ${resourceColor}">
                    <div class="resource-color" style="background-color: ${resourceColor}"></div>
                    <div class="resource-name">${resource.name}</div>
                    <div class="resource-richness">R${resource.richness}</div>
                </div>
            `;
        });
        
        html += `</div></div>`;
    }
    
    html += `
                </div>
            </div>
            <div class="button-row">
                <button id="cancelAddResourceBtn">Cancel</button>
            </div>
        </div>
    `;
    
    resourceModal.innerHTML = html;
    document.body.appendChild(resourceModal);
    
    // Add event listeners
    document.getElementById('resourceSearch').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        const resourceItems = document.querySelectorAll('.resource-item');
        const categoryContainers = document.querySelectorAll('.resource-category-container');
        
        if (searchTerm === '') {
            // Show all categories and items when search is empty
            categoryContainers.forEach(container => {
                container.style.display = 'block';
            });
            
            resourceItems.forEach(item => {
                item.style.display = 'block';
            });
        } else {
            // Hide/show categories and items based on search
            categoryContainers.forEach(container => {
                const items = container.querySelectorAll('.resource-item');
                let hasVisibleItems = false;
                
                items.forEach(item => {
                    const resourceName = item.getAttribute('data-name').toLowerCase();
                    const isVisible = resourceName.includes(searchTerm);
                    item.style.display = isVisible ? 'block' : 'none';
                    if (isVisible) hasVisibleItems = true;
                });
                
                container.style.display = hasVisibleItems ? 'block' : 'none';
            });
        }
    });
    
    document.getElementById('cancelAddResourceBtn').addEventListener('click', () => {
        document.body.removeChild(resourceModal);
    });
    
    // Add click events to resource items
    const resourceItems = document.querySelectorAll('.resource-item');
    resourceItems.forEach(item => {
        item.addEventListener('click', function() {
            const type = parseInt(this.getAttribute('data-type'));
            const name = this.getAttribute('data-name');
            const richness = parseInt(this.getAttribute('data-richness'));
            
            // Check if already exists by name (case insensitive)
            const resourceExists = planet.resources.some(r => 
                r.name?.toLowerCase() === name.toLowerCase()
            );
            
            if (resourceExists) {
                alert(`${name} is already on this planet.`);
                return;
            }
            
            // Add resource to planet
            planet.resources.push({
                type: type,
                name: name,
                richness: richness
            });
            
            saveState(`Added Resource ${name} to ${planet.name}`);
            
            // Update resource list in parent modal
            document.getElementById('resourceList').innerHTML = generateResourceListHTML(planet);
            setupResourceListEventListeners(planet);
            
            // Close resource selector
            document.body.removeChild(resourceModal);
        });
    });
}

// Update system details in the UI
function updateSystemDetails(system) {
    // Only update coordinate fields if they exist
    const xInput = document.getElementById('systemX');
    const yInput = document.getElementById('systemY');
    
    if (xInput && system.coordinates) {
        xInput.value = system.coordinates[0];
    }
    
    if (yInput && system.coordinates) {
        yInput.value = system.coordinates[1];
    }
}

// Generate regional planet distribution
function generateRegionalPlanetDistribution(systems) {
    if (!systems || systems.length === 0) return;
    
    saveState(`Generating distribution for ${systems.length} systems`);
    
    const regionSize = systems.length;

    // First, identify KING system - the system with the most links
    let kingSystem = null;
    let maxLinks = 0;
    systems.forEach(system => {
        if (!system.isLocked && system.links && system.links.length > maxLinks) {
            maxLinks = system.links.length;
            kingSystem = system;
        }
    });
    
    // Reset all KING and CORE designations first
    systems.forEach(system => {
        if (!system.isLocked) {
            system.isKing = false;
            system.isCore = false;
        }
    });
    
    // Set the KING system if found
    if (kingSystem && maxLinks > 0) {
        kingSystem.isKing = true;
        console.log(`Designated ${kingSystem.name} as KING system with ${maxLinks} links`);
    }

    // Then, designate CORE systems (30-60% of non-KING systems)
    const minCorePercent = 30;
    const maxCorePercent = 60;
    const targetCorePercent = minCorePercent + Math.random() * (maxCorePercent - minCorePercent);
    const nonKingSystems = systems.filter(s => !s.isKing);
    const targetCoreSystems = Math.max(1, Math.round(nonKingSystems.length * (targetCorePercent / 100)));

    // Get unlocked, non-KING systems for CORE designation
    const unlockedNonKingSystems = nonKingSystems.filter(s => !s.isLocked);
    const existingCoreSystems = systems.filter(s => s.isLocked && s.isCore).length;
    const remainingCoreNeeded = Math.max(0, targetCoreSystems - existingCoreSystems);
    
    // Randomly select systems to be CORE
    const shuffledSystems = [...unlockedNonKingSystems].sort(() => Math.random() - 0.5);
    shuffledSystems.slice(0, remainingCoreNeeded).forEach(system => {
        system.isCore = true;
    });
    
    // Get region name if it exists
    let regionName = '';
    if (systems[0].regionId) {
        const region = regionDefinitions.find(r => r.id === systems[0].regionId);
        if (region) {
            regionName = region.name;
        }
    }

    // Create sequence counters for each faction
    const factionCounters = {
        MUD: { king: 1, core: 1, normal: 1 },
        ONI: { king: 1, core: 1, normal: 1 },
        UST: { king: 1, core: 1, normal: 1 },
        NONE: { king: 1, core: 1, normal: 1 }
    };

    // Rename systems
    systems.forEach(system => {
        if (system.isLocked) return; // Skip locked systems

        // Use faction property if available, otherwise fall back to closestFaction
        const faction = system.faction || system.closestFaction || 'NONE';
        const counter = system.isKing ? 
            factionCounters[faction].king++ : 
            system.isCore ? 
                factionCounters[faction].core++ : 
                factionCounters[faction].normal++;
        
        // Create base name components
        const regionPrefix = regionName ? 
            regionName.slice(-3).padStart(3, '0').toUpperCase() : 'REG';
        const factionCode = faction === 'NONE' ? 'NEU' : faction;
        const typeCode = system.isKing ? 'KING' : system.isCore ? 'CORE' : 'SEC';
        const sequenceNum = counter.toString().padStart(2, '0');

        // Combine components into new name
        system.name = `${regionPrefix}-${factionCode}-${typeCode}-${sequenceNum}`;
    });
    
    // Define planet type probabilities based on region size
    const baseProbabilities = {
        small: { // 1-5 systems
            basic: 0.7,    // Tier 0-1
            common: 0.2,   // Tier 2
            uncommon: 0.1, // Tier 3
            rare: 0,       // Tier 4
            epic: 0        // Tier 5
        },
        medium: { // 6-10 systems
            basic: 0.5,
            common: 0.3,
            uncommon: 0.15,
            rare: 0.05,
            epic: 0
        },
        large: { // 11+ systems
            basic: 0.4,
            common: 0.3,
            uncommon: 0.2,
            rare: 0.07,
            epic: 0.03
        }
    };

    // Get probability set based on region size
    const probs = regionSize <= 5 ? baseProbabilities.small :
                 regionSize <= 10 ? baseProbabilities.medium :
                 baseProbabilities.large;

    // Group planet types by tier and faction
    const planetsByTierAndFaction = {
        MUD: {}, ONI: {}, USTUR: {}, Neutral: {}, NONE: {}
    };
    
    Object.entries(PLANET_TIERS).forEach(([planetType, tier]) => {
        // Determine faction from planet type name
        let faction = 'NONE';
        if (planetType.startsWith('MUD')) faction = 'MUD';
        else if (planetType.startsWith('ONI')) faction = 'ONI';
        else if (planetType.startsWith('USTUR')) faction = 'USTUR';
        else if (planetType.startsWith('Neutral')) faction = 'Neutral';
        
        // Initialize tier array if needed
        if (!planetsByTierAndFaction[faction][tier]) {
            planetsByTierAndFaction[faction][tier] = [];
        }
        planetsByTierAndFaction[faction][tier].push(planetType);
    });

    // Helper function to get random planet type by tier and faction
    const getRandomPlanetType = (tier, faction) => {
        // Convert UST to USTUR for consistency if needed
        const factionKey = faction === 'UST' ? 'USTUR' : (faction || 'NONE');
        
        // Try to get planets from the specific faction and tier
        let planetsInTier = planetsByTierAndFaction[factionKey]?.[tier] || [];
        
        // If no planets found for this specific tier, but we have a faction,
        // try to find ANY planet from this faction (prioritize faction over tier)
        if (planetsInTier.length === 0 && factionKey !== 'NONE') {
            // Look through all tiers for this faction
            for (let t = 1; t <= 5; t++) {
                const alternativePlanets = planetsByTierAndFaction[factionKey]?.[t] || [];
                if (alternativePlanets.length > 0) {
                    console.log(`Using ${factionKey} planets from tier ${t} instead of ${tier}`);
                    planetsInTier = alternativePlanets;
                    break;
                }
            }
        }
        
        // If we still don't have planets from the right faction, try NONE faction
        if (planetsInTier.length === 0 && factionKey !== 'NONE') {
            const fallbackPlanets = planetsByTierAndFaction['NONE'][tier] || [];
            if (fallbackPlanets.length > 0) {
                return fallbackPlanets[Math.floor(Math.random() * fallbackPlanets.length)];
            }
        }
        
        // If we still don't have any planets to choose from, try ONI as last resort
        if (planetsInTier.length === 0) {
            for (let t = 1; t <= 5; t++) {
                const oniFallback = planetsByTierAndFaction['ONI']?.[t] || [];
                if (oniFallback.length > 0) {
                    return oniFallback[Math.floor(Math.random() * oniFallback.length)];
                }
            }
            return null;
        }
        
        return planetsInTier[Math.floor(Math.random() * planetsInTier.length)];
    };

    // Helper function to get planet tier based on probabilities and system type
    const getPlanetTier = (isKing, isCore) => {
        // Special probabilities for KING systems
        if (isKing) {
            const kingProbs = {
                basic: 0.1,      // Much lower chance of basic
                common: 0.2,     // Lower common
                uncommon: 0.3,   // Higher uncommon
                rare: 0.25,      // Much higher rare
                epic: 0.15       // Significant epic chance
            };
            
            const rand = Math.random();
            
            if (rand < kingProbs.basic) return 1;
            if (rand < kingProbs.basic + kingProbs.common) return 2;
            if (rand < kingProbs.basic + kingProbs.common + kingProbs.uncommon) return 3;
            if (rand < kingProbs.basic + kingProbs.common + kingProbs.uncommon + kingProbs.rare) return 4;
            return 5;
        }
        
        // Boost probabilities for CORE systems
        const adjustedProbs = isCore ? {
            basic: Math.max(0.3, probs.basic - 0.2),
            common: probs.common,
            uncommon: probs.uncommon + 0.1,
            rare: probs.rare + 0.05,
            epic: probs.epic + 0.05
        } : probs;

        const rand = Math.random();
        
        // Ensure we return a tier that actually exists in PLANET_TIERS (1-5)
        if (rand < adjustedProbs.basic) return 1;
        if (rand < adjustedProbs.basic + adjustedProbs.common) return 2;
        if (rand < adjustedProbs.basic + adjustedProbs.common + adjustedProbs.uncommon) return 3;
        if (rand < adjustedProbs.basic + adjustedProbs.common + adjustedProbs.uncommon + adjustedProbs.rare) return 4;
        return 5;
    };

    // Helper function to get default scale for planet type
    const getDefaultScale = (planetType) => {
        // Handle both string and numeric planet types
        if (typeof planetType === 'number') {
            const planetTypeObj = PLANET_TYPES.find(pt => pt.type === planetType);
            return planetTypeObj ? planetTypeObj.defaultScale : 0.2;
        } else if (typeof planetType === 'string') {
            const planetTypeObj = PLANET_TYPES.find(pt => pt.name === planetType);
            return planetTypeObj ? planetTypeObj.defaultScale : 0.2;
        }
        return 0.2; // Default fallback
    };

    // Helper function to generate a random star
    const generateRandomStar = (systemName, index) => {
        // Get a random star type (0-19)
        const starType = Math.floor(Math.random() * STAR_TYPES.length);
        
        // Create a random scale between 0.1 and 3.0
        const starScale = 0.1 + Math.random() * 2.9;
        
        return {
            name: `${systemName} ${STAR_TYPES[starType].name}${index > 0 ? ' ' + String.fromCharCode(65 + index) : ''}`,
            type: starType,
            scale: Number(starScale.toFixed(1))
        };
    };

    // Process each system
    systems.forEach((system, systemIndex) => {
        // Skip if system is locked
        if (system.isLocked) return;

        // Set starbase tier to 0 (default)
        if (!system.starbase) {
            system.starbase = { tier: 0 };
        } else {
            system.starbase.tier = 0;
        }

        // Generate stars for the system
        system.stars = []; // Clear existing stars
        
        // Determine number of stars
        // KING systems have a higher chance of multiple stars
        let starRoll = Math.random() * 100;
        let numStars = 1; // Default to single star
        
        if (system.isKing) {
            // KING systems: 40% single, 45% binary, 15% trinary
            if (starRoll >= 85) {
                numStars = 3; // 15% chance for trinary system
            } else if (starRoll >= 40) {
                numStars = 2; // 45% chance for binary system
            }
        } else {
            // Regular systems: 67% single, 30% binary, 3% trinary
            if (starRoll >= 97) {
                numStars = 3; // 3% chance for trinary system
            } else if (starRoll >= 67) {
                numStars = 2; // 30% chance for binary system
            }
        }
        
        // Generate the stars
        for (let i = 0; i < numStars; i++) {
            const star = generateRandomStar(system.name, i);
            system.stars.push(star);
        }

        // Clear existing planets
        system.planets = [];
        
        // Determine number of planets (more for KING and core systems)
        let planetCount;
        if (system.isKing) {
            planetCount = Math.floor(Math.random() * 3) + 6; // 6-8 planets for KING systems
        } else if (system.isCore) {
            planetCount = Math.floor(Math.random() * 3) + 4; // 4-6 planets for core systems
        } else {
            planetCount = Math.floor(Math.random() * 3) + 2; // 2-4 planets for regular systems
        }
        
        // First, ensure system has an asteroid belt
        let hasAsteroidBelt = false;
        
        // Create planets
        for (let i = 0; i < planetCount; i++) {
            let planetType;
            
            // Force first planet to be asteroid belt if none exists yet
            if (i === 0 && !hasAsteroidBelt) {
                // Get the appropriate asteroid belt for this faction
                const asteroidBeltFaction = system.faction || system.closestFaction || 'ONI';
                if (asteroidBeltFaction === 'Neutral') {
                    planetType = 'Neutral System Asteroid Belt';
                } else if (asteroidBeltFaction === 'MUD') {
                    planetType = 'MUD System Asteroid Belt';
                } else if (asteroidBeltFaction === 'UST' || asteroidBeltFaction === 'USTUR') {
                    planetType = 'USTUR System Asteroid Belt';
                } else {
                    planetType = 'ONI System Asteroid Belt';
                }
                hasAsteroidBelt = true;
                console.log(`System ${system.name}: Ensuring asteroid belt - ${planetType}`);
            } else {
                // Get planet tier and type based on system's faction
                const tier = getPlanetTier(system.isKing, system.isCore);
                console.log(`System ${system.name} (${system.isKing ? 'KING' : system.isCore ? 'CORE' : 'Regular'}, Faction: ${system.faction || 'None'}): Generating planet ${i+1} with tier ${tier}`);
                
                planetType = getRandomPlanetType(tier, system.faction || system.closestFaction);
                if (!planetType) {
                    console.warn(`Could not find appropriate planet type for tier ${tier} and faction ${system.faction || 'None'}`);
                    continue;
                }
                
                // Check if this is an asteroid belt
                if (planetType.includes('System Asteroid Belt')) {
                    hasAsteroidBelt = true;
                }
            }
            console.log(`Selected planet type: ${planetType}`);

            // Calculate orbit (realistic spacing)
            const orbitBase = i + 1;
            const orbitVariation = (Math.random() - 0.5) * 0.5; // ±0.25 variation
            const orbit = orbitBase + orbitVariation;
            const angle = Math.floor(Math.random() * 360);

            // Create planet
            const planet = {
                name: `${system.name}-P${i + 1}`,
                type: planetType,
                orbit: orbit,
                angle: angle,
                scale: getDefaultScale(planetType),
                resources: []
            };

            // Convert string planet type to numeric type ID if needed
            if (typeof planet.type === 'string') {
                const planetTypeObj = PLANET_TYPES.find(pt => pt.name === planet.type);
                if (planetTypeObj) {
                    const oldType = planet.type;
                    planet.type = planetTypeObj.type;
                    console.log(`Converted planet type from "${oldType}" to type ID ${planet.type}`);
                } else {
                    console.warn(`Could not find type ID for planet type: ${planet.type}`);
                }
            }

            // Set default resources directly from state.js
            const { archetype, faction: planetFaction } = window.getPlanetArchetype(planetType);
            // Convert UST to USTUR for resource lookup if needed
            const resourceFaction = planetFaction === 'UST' ? 'USTUR' : planetFaction;
            
            if (resourceFaction && archetype && window.PLANET_ARCHETYPE_RESOURCES && 
                window.PLANET_ARCHETYPE_RESOURCES[resourceFaction] && 
                window.PLANET_ARCHETYPE_RESOURCES[resourceFaction][archetype]) {
                planet.resources = deepCopy(window.PLANET_ARCHETYPE_RESOURCES[resourceFaction][archetype]);
                console.log(`Set resources for ${planet.name} (${resourceFaction} ${archetype})`);
            } else {
                console.warn(`No resources found for planet type: ${planetType} (${resourceFaction} ${archetype})`);
            }

            system.planets.push(planet);
        }
        
        // After all planets are created, update asteroid belt resources
        // to include all resources present in the system
        const asteroidBelt = system.planets.find(p => {
            const planetName = getPlanetTypeName(p.type);
            return planetName && planetName.includes('System Asteroid Belt');
        });
        
        if (asteroidBelt) {
            // Collect all unique resources in the system
            const allSystemResources = new Map();
            
            system.planets.forEach(planet => {
                if (planet.resources) {
                    planet.resources.forEach(resource => {
                        // Use resource name as key to avoid duplicates
                        if (!allSystemResources.has(resource.name)) {
                            allSystemResources.set(resource.name, {
                                type: resource.type,
                                name: resource.name,
                                richness: resource.richness || 1
                            });
                        }
                    });
                }
            });
            
            // Replace asteroid belt resources with all system resources
            if (allSystemResources.size > 0) {
                asteroidBelt.resources = Array.from(allSystemResources.values());
                console.log(`Updated ${system.name} asteroid belt with ${asteroidBelt.resources.length} resource types from the system`);
            }
        }
    });

    // Refresh UI
    displaySystemDetails(systems);
    if (systems.length === 1) {
        drawSystemPreview(systems[0]);
    }
    drawGalaxyMap();
}

// Get planet type name from a planet type object or ID
function getPlanetTypeName(typeInfo) {
    // If typeInfo is already a string, just return it
    if (typeof typeInfo === 'string') return typeInfo;
    
    // If typeInfo is a number, look up by ID
    if (typeof typeInfo === 'number') {
        const planetType = PLANET_TYPES.find(pt => pt.type === typeInfo);
        return planetType ? planetType.name : 'Unknown';
    }
    
    // If typeInfo is an object, check if it has a name property
    if (typeInfo && typeof typeInfo === 'object') {
        if (typeInfo.name) return typeInfo.name;
        
        // If not, but it has a type ID, look up by ID
        if (typeInfo.type !== undefined) {
            const planetType = PLANET_TYPES.find(pt => pt.type === typeInfo.type);
            return planetType ? planetType.name : 'Unknown';
        }
    }
    
    // Default fallback
    return 'Unknown';
}

// Center view on a system
function centerViewOnSystem(system) {
    if (!system || !system.coordinates || system.coordinates.length !== 2 || !canvas) {
        console.warn("Cannot center view: Invalid system coordinates or canvas.");
        return;
    }
    
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.width / dpr;
    const cssHeight = canvas.height / dpr;
    
    // Calculate the offset needed to place this system at the center of the canvas
    offsetX = cssWidth / 2 - system.coordinates[0] * scale;
    offsetY = cssHeight / 2 - system.coordinates[1] * -1 * scale;
    
    console.log(`Centering view on ${system.name}. Coordinates: [${system.coordinates[0]}, ${system.coordinates[1]}]`);
    drawGalaxyMap();
}

// Center view on a group of systems
function centerViewOnSystemGroup(systems) {
    if (!systems || systems.length === 0 || !canvas) {
        console.warn("Cannot center view: Invalid systems or canvas.");
        return;
    }
    
    // Calculate bounding box of all selected systems
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    systems.forEach(system => {
        if (system.coordinates && system.coordinates.length === 2) {
            minX = Math.min(minX, system.coordinates[0]);
            maxX = Math.max(maxX, system.coordinates[0]);
            minY = Math.min(minY, system.coordinates[1]);
            maxY = Math.max(maxY, system.coordinates[1]);
        }
    });
    
    // Calculate center of the bounding box
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.width / dpr;
    const cssHeight = canvas.height / dpr;
    
    // Calculate the offset needed to place the center of the group at the center of the canvas
    offsetX = cssWidth / 2 - centerX * scale;
    offsetY = cssHeight / 2 - centerY * -1 * scale;
    
    console.log(`Centering view on ${systems.length} systems. Group center: [${centerX.toFixed(1)}, ${centerY.toFixed(1)}]`);
    drawGalaxyMap();
}

// Export functions to make them available globally
window.addStar = addStar;
window.deleteStar = deleteStar;
window.createNewSystem = createNewSystem;
window.createNewSystemAtCoords = createNewSystemAtCoords;
window.deleteSelectedSystems = deleteSelectedSystems;
window.copySelectedSystem = copySelectedSystem;
window.pasteSystem = pasteSystem;
window.toggleLinkMode = toggleLinkMode;
window.toggleSystemLink = toggleSystemLink;
window.deselectAll = deselectAll;
window.selectAllSystems = selectAllSystems;
window.generateRegionalPlanetDistribution = generateRegionalPlanetDistribution; 
window.getPlanetTypeName = getPlanetTypeName; 
window.centerViewOnSystem = centerViewOnSystem;
window.centerViewOnSystemGroup = centerViewOnSystemGroup;

// Display galaxy-wide statistics when no system is selected
function displayGalaxyStatistics(detailsContent) {
    if (!detailsContent) return;
    
    // Count systems by faction and core status
    const factionCount = {
        'MUD': 0,
        'ONI': 0,
        'UST': 0,
        'Neutral': 0,
        'None': 0
    };
    
    // Initialize faction statistics objects
    const factionStats = {
        'MUD': { systems: 0, core: 0, planets: 0, stars: 0, resources: 0, minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
        'ONI': { systems: 0, core: 0, planets: 0, stars: 0, resources: 0, minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
        'UST': { systems: 0, core: 0, planets: 0, stars: 0, resources: 0, minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
        'Neutral': { systems: 0, core: 0, planets: 0, stars: 0, resources: 0, minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
        'None': { systems: 0, core: 0, planets: 0, stars: 0, resources: 0, minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    };
    
    let coreCount = 0;
    let kingCount = 0;
    let totalPlanets = 0;
    let totalStars = 0;
    let totalSystems = mapData.length;
    let totalLinks = 0;
    
    // Resource count across the entire galaxy
    const resourceCount = {};
    
    // Planet types across the entire galaxy
    const planetTypeCount = {};
    
    // Star types across the entire galaxy
    const starTypeCount = {};
    
    // Count regions
    const regions = new Set();
    
    // Calculate territory
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    // Process each system
    mapData.forEach(system => {
        const faction = system.faction || 'None';
        
        // Update faction stats
        factionStats[faction].systems++;
        
        if (system.isCore) {
            factionStats[faction].core++;
            coreCount++;
        }
        
        // Count by faction
        if (system.faction) {
            factionCount[system.faction] = (factionCount[system.faction] || 0) + 1;
        } else {
            factionCount['None']++;
        }
        
        // Count regions
        if (system.regionId) {
            regions.add(system.regionId);
        }
        
        // Count links
        if (system.links) {
            totalLinks += system.links.length;
        }
        
        // Calculate territory bounds
        if (system.coordinates && system.coordinates.length === 2) {
            minX = Math.min(minX, system.coordinates[0]);
            maxX = Math.max(maxX, system.coordinates[0]);
            minY = Math.min(minY, system.coordinates[1]);
            maxY = Math.max(maxY, system.coordinates[1]);
            
            // Update faction territory bounds
            factionStats[faction].minX = Math.min(factionStats[faction].minX, system.coordinates[0]);
            factionStats[faction].maxX = Math.max(factionStats[faction].maxX, system.coordinates[0]);
            factionStats[faction].minY = Math.min(factionStats[faction].minY, system.coordinates[1]);
            factionStats[faction].maxY = Math.max(factionStats[faction].maxY, system.coordinates[1]);
        }
        
        // Count planets, planet types and resources
        if (system.planets) {
            totalPlanets += system.planets.length;
            factionStats[faction].planets += system.planets.length;
            
            // Count planet types
            system.planets.forEach(planet => {
                const planetTypeName = getPlanetTypeName(planet.type);
                planetTypeCount[planetTypeName] = (planetTypeCount[planetTypeName] || 0) + 1;
                
                // Count resources
                if (planet.resources) {
                    factionStats[faction].resources += planet.resources.length;
                    planet.resources.forEach(resource => {
                        resourceCount[resource.name] = (resourceCount[resource.name] || 0) + 1;
                    });
                }
            });
        }
        
        // Count stars and star types
        if (system.stars && system.stars.length > 0) {
            totalStars += system.stars.length;
            factionStats[faction].stars += system.stars.length;
            
            // Count star types
            system.stars.forEach(star => {
                if (star.type !== undefined) {
                    const starTypeObj = STAR_TYPES.find(t => t.type === star.type);
                    if (starTypeObj) {
                        starTypeCount[starTypeObj.name] = (starTypeCount[starTypeObj.name] || 0) + 1;
                    }
                }
            });
        }
    });
    
    // Calculate territory area
    const width = maxX - minX;
    const height = maxY - minY;
    const territoryArea = width * height;
    
    // Calculate faction territory areas
    Object.keys(factionStats).forEach(faction => {
        const stats = factionStats[faction];
        if (stats.minX !== Infinity && stats.maxX !== -Infinity) {
            const factionWidth = stats.maxX - stats.minX;
            const factionHeight = stats.maxY - stats.minY;
            stats.territory = factionWidth * factionHeight;
        } else {
            stats.territory = 0;
        }
    });
    
    // Generate HTML
    let html = `
        <div class="detail-section" style="text-align: center; margin-bottom: 20px;">
            <h2>Galaxy Statistics</h2>
            <p style="font-size: 0.9em; color: #AAA;">Select a system to view its details</p>
        </div>
        
        <div class="stats-container">
            <div class="stats-group">
                <h4>System Counts</h4>
                <div class="stat-row">
                    <span class="stat-label">Total Systems:</span>
                    <span class="stat-value">${totalSystems}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">KING Systems:</span>
                    <span class="stat-value">${kingCount}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">CORE Systems:</span>
                    <span class="stat-value">${coreCount}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Regular Systems:</span>
                    <span class="stat-value">${totalSystems - coreCount - kingCount}</span>
                </div>
            </div>
            
            <div class="stats-group">
                <h4>Faction Distribution</h4>
                ${Object.entries(factionCount)
                    .filter(([faction, count]) => count > 0)
                    .map(([faction, count]) => `
                        <div class="stat-row">
                            <span class="stat-label">${faction}:</span>
                            <span class="stat-value">${count} (${(count / totalSystems * 100).toFixed(1)}%)</span>
                        </div>
                    `).join('')
                }
            </div>
            
            <div class="stats-group">
                <h4>Celestial Objects</h4>
                <div class="stat-row">
                    <span class="stat-label">Total Planets:</span>
                    <span class="stat-value">${totalPlanets}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Total Stars:</span>
                    <span class="stat-value">${totalStars}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Avg. Planets/System:</span>
                    <span class="stat-value">${(totalPlanets / totalSystems).toFixed(1)}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Avg. Stars/System:</span>
                    <span class="stat-value">${(totalStars / totalSystems).toFixed(1)}</span>
                </div>
            </div>
        </div>
        
        <!-- Faction Comparison Section REMOVED -->
        
        <div class="stats-container">
            ${Object.keys(planetTypeCount).length > 0 ? `
                <div class="stats-group">
                    <h4>Planet Types</h4>
                    <div style="max-height: 150px; overflow-y: auto; padding-right: 5px;">
                        ${Object.entries(planetTypeCount)
                            .sort(([, countA], [, countB]) => countB - countA)
                            .map(([type, count]) => `
                                <div class="stat-row">
                                    <span class="stat-label">${type}:</span>
                                    <span class="stat-value">${count}</span>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            ` : ''}
            
            ${Object.keys(starTypeCount).length > 0 ? `
                <div class="stats-group">
                    <h4>Star Types</h4>
                    <div style="max-height: 150px; overflow-y: auto; padding-right: 5px;">
                        ${Object.entries(starTypeCount)
                            .sort(([, countA], [, countB]) => countB - countA)
                            .map(([type, count]) => `
                                <div class="stat-row">
                                    <span class="stat-label">${type}:</span>
                                    <span class="stat-value">${count}</span>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            ` : ''}
            
            ${Object.keys(resourceCount).length > 0 ? `
                <div class="stats-group">
                    <h4>Resources Distribution</h4>
                    <div class="resources-scroll" style="max-height: 150px; overflow-y: auto; padding-right: 5px;">
                        ${Object.entries(resourceCount)
                            .sort(([, countA], [, countB]) => countB - countA)
                            .map(([resource, count]) => `
                                <div class="stat-row">
                                    <span class="stat-label">${resource}:</span>
                                    <span class="stat-value">${count}</span>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    detailsContent.innerHTML = html;
}

// Select all systems in the map
function selectAllSystems() {
    // Only proceed if there are systems to select
    if (mapData.length === 0) return;
    
    // Select all systems
    selectedSystems = [...mapData];
    
    // Update UI
    displaySystemDetails(selectedSystems);
    drawSystemPreview(null); // Don't preview when multiple systems selected
    
    // Enable the deselect button
    if (deselectBtn) {
        deselectBtn.disabled = false;
    }
    
    // Redraw map to show selection
    drawGalaxyMap();
    
    console.log(`Selected all ${selectedSystems.length} systems`);
}