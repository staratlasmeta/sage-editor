// === MODULE: Table Updates ===
// This module provides efficient update methods for the comparison table
// to avoid full rebuilds when only specific data has changed.
//
// Dependencies:
// - Global variables: addedShips, shipConfigurations, activeConfigIndices
// - Functions: getShipIdentifier(), calculateModifiedStats(), formatNumber()

/**
 * Update only the stats for a specific ship without rebuilding the entire table
 * @param {number} shipId - ID of the ship to update
 */
function updateShipStats(shipId) {
    console.log(`[updateShipStats] Updating stats for ship ${shipId}`);
    
    // Find the ship
    const ship = addedShips.find(s => s.id === shipId);
    if (!ship) {
        console.error(`[updateShipStats] Ship ${shipId} not found`);
        return;
    }
    
    const shipIdentifier = getShipIdentifier(ship);
    const activeConfigIndex = activeConfigIndices[shipId] || 0;
    
    // Get the configuration
    if (!shipConfigurations[shipIdentifier] || !shipConfigurations[shipIdentifier][activeConfigIndex]) {
        console.warn(`No configuration found for ship ${shipId}`);
        return;
    }
    
    const activeConfig = shipConfigurations[shipIdentifier][activeConfigIndex];
    
    // Calculate modified stats
    const modifiedStats = calculateModifiedStats(ship, activeConfig.components);
    
    // Cache modification details to avoid recalculating for every cell
    const modificationDetailsCache = {};
    
    // Update only the cells for this ship
    const shipCells = document.querySelectorAll(`td[data-ship-id="${shipId}"]`);
    console.log(`[updateShipStats] Found ${shipCells.length} cells for ship ${shipId}`);
    
    let updatedCells = 0;
    shipCells.forEach(cell => {
        const statName = cell.getAttribute('data-stat-name');
        // Check if this is a modified value cell by checking for the modified-value, decreased-value, or neutral-value class
        const isModifiedCell = cell.classList.contains('modified-value') || 
                              cell.classList.contains('decreased-value') || 
                              cell.classList.contains('neutral-value') ||
                              cell.classList.contains('stats-changed') ||
                              cell.classList.contains('stats-decreased') ||
                              cell.classList.contains('stats-neutral');
        
        console.log(`[updateShipStats] Cell for stat ${statName}: isModifiedCell=${isModifiedCell}, classes=${cell.className}`);
        
        // For cells that have data-modified-value attribute but no appropriate class, add one
        if (!isModifiedCell && cell.hasAttribute('data-modified-value')) {
            console.log(`[updateShipStats] Cell has data-modified-value but no modified class, adding neutral-value class`);
            cell.classList.add('neutral-value');
        }
        
        // Re-check after potentially adding class
        const isModifiedCellNow = cell.classList.contains('modified-value') || 
                                  cell.classList.contains('decreased-value') || 
                                  cell.classList.contains('neutral-value') ||
                                  cell.classList.contains('stats-changed') ||
                                  cell.classList.contains('stats-decreased') ||
                                  cell.classList.contains('stats-neutral');
        
        if (isModifiedCellNow && statName && modifiedStats[statName] !== undefined) {
            // Update modified value cell - need to update the span inside, not the cell directly
            const valueSpan = cell.querySelector('span');
            const oldValue = valueSpan ? valueSpan.textContent : cell.textContent;
            const newValue = formatNumber(modifiedStats[statName]);
            
            if (oldValue !== newValue) {
                console.log(`[updateShipStats] Updating ${statName} from ${oldValue} to ${newValue} (raw value: ${modifiedStats[statName]})`);
                updatedCells++;
                
                if (valueSpan) {
                    valueSpan.textContent = newValue;
                    console.log(`[updateShipStats] Updated span content to ${newValue}`);
                } else {
                    cell.textContent = newValue;
                    console.log(`[updateShipStats] Updated cell content to ${newValue}`);
                }
                
                // Update data attributes
                cell.setAttribute('data-base-value', ship[statName]);
                cell.setAttribute('data-modified-value', modifiedStats[statName]);
                cell.setAttribute('data-ship-identifier', shipIdentifier);
                cell.setAttribute('data-config-index', activeConfigIndex);
                
                // Update cell classes for highlighting
                const baseValue = parseFloat(ship[statName]);
                const modifiedValue = parseFloat(modifiedStats[statName]);
                
                // Update the percentage label
                const percentLabel = cell.querySelector('div[style*="position: absolute"]');
                if (percentLabel) {
                    const percentChange = baseValue !== 0 ? ((modifiedValue - baseValue) / Math.abs(baseValue)) * 100 : 0;
                    const percentSign = percentChange >= 0 ? '+' : '';
                    percentLabel.textContent = `${percentSign}${percentChange.toFixed(1)}%`;
                    
                    // Update percentage label styling based on the change
                    if (Math.abs(percentChange) > 100) {
                        percentLabel.style.color = '#FFD700'; // Gold for large changes
                        percentLabel.style.fontWeight = 'bold';
                        percentLabel.style.opacity = '1';
                    } else if (percentChange > 0) {
                        percentLabel.style.color = '#4CAF50'; // Green for positive
                        percentLabel.style.fontWeight = 'normal';
                        percentLabel.style.opacity = '0.6';
                    } else if (percentChange < 0) {
                        percentLabel.style.color = '#ff6b6b'; // Red for negative
                        percentLabel.style.fontWeight = 'normal';
                        percentLabel.style.opacity = '0.6';
                    } else {
                        percentLabel.style.color = '#3d8bf8'; // Blue for neutral
                        percentLabel.style.fontWeight = 'normal';
                        percentLabel.style.opacity = '0.6';
                    }
                }
                
                // Get modification details from cache or calculate once
                if (!modificationDetailsCache[statName]) {
                    modificationDetailsCache[statName] = calculateStatModificationDetails(ship, activeConfig, statName);
                }
                const modificationDetails = modificationDetailsCache[statName];
                
                // Only count non-zero components (ignore components with 0 values)
                const hasComponentModifications = modificationDetails.components.some(comp => comp.value !== 0);
                
                // Remove any inline styles from the value span to let CSS classes handle styling
                if (valueSpan) {
                    valueSpan.style.color = ''; // Clear inline color
                    valueSpan.style.fontWeight = ''; // Clear inline font-weight
                }
                
                // Remove existing classes
                cell.classList.remove('modified-value', 'decreased-value', 'neutral-value', 'stats-changed', 'stats-decreased', 'stats-neutral');
                
                if (Math.abs(ship[statName] - modifiedStats[statName]) > 1e-6) {
                    if (modifiedValue > baseValue) {
                        cell.classList.add('stats-changed');
                    } else {
                        cell.classList.add('stats-decreased');
                    }
                } else if (hasComponentModifications) {
                    cell.classList.add('neutral-value');
                    cell.classList.add('stats-neutral');
                }
            }
        }
    });
    
    console.log(`[updateShipStats] Updated ${updatedCells} cells for ship ${shipId}`);
}

/**
 * Check if the table structure needs to be rebuilt
 * @returns {boolean} True if rebuild is needed
 */
function needsTableRebuild() {
    const table = document.getElementById('ship-comparison-table');
    if (!table || !table.querySelector('tbody')) return true;
    
    // Check if the number of ships matches
    const shipHeaders = table.querySelectorAll('.ship-header').length;
    if (shipHeaders !== addedShips.length) return true;
    
    // Check if the stats list has changed
    const currentStats = getRelevantStats();
    const tableRows = table.querySelectorAll('tbody tr:not(.add-attribute-row)');
    if (tableRows.length !== currentStats.length) return true;
    
    return false;
}

/**
 * Update configuration dropdown for a specific ship
 * @param {number} shipId - ID of the ship
 */
function updateShipConfigDropdown(shipId) {
    const dropdown = document.querySelector(`.config-dropdown[data-ship-id="${shipId}"]`);
    if (!dropdown) return;
    
    const shipIdentifier = dropdown.getAttribute('data-ship-identifier');
    const configs = shipConfigurations[shipIdentifier] || [];
    const activeConfigIndex = activeConfigIndices[shipId] || 0;
    
    // Clear existing options
    dropdown.innerHTML = '';
    
    // Add options for each configuration
    configs.forEach((config, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = config.name || `Config ${index + 1}`;
        dropdown.appendChild(option);
    });
    
    // Add "Add New Config" option
    const addConfigOption = document.createElement('option');
    addConfigOption.value = 'add-new';
    addConfigOption.textContent = '+ Add New Config';
    dropdown.appendChild(addConfigOption);
    
    // Set the selected value
    dropdown.value = activeConfigIndex;
}

/**
 * Efficient update that only recalculates what's needed
 * @param {Object} options - Update options
 * @param {number} options.shipId - Specific ship to update (optional)
 * @param {boolean} options.force - Force full rebuild (optional)
 */
function efficientTableUpdate(options = {}) {
    const { shipId, force = false } = options;
    
    // Check if we need a full rebuild
    if (force || needsTableRebuild()) {
        // Fall back to full rebuild
        if (typeof updateComparisonTable === 'function') {
            updateComparisonTable();
        }
        return;
    }
    
    // Otherwise, do targeted updates
    if (shipId) {
        // Update only the specified ship
        updateShipStats(shipId);
        updateShipConfigDropdown(shipId);
    } else {
        // Update all ships without rebuilding
        addedShips.forEach(ship => {
            updateShipStats(ship.id);
        });
    }
}

// Create a debounced version of efficientTableUpdate
let updateTimeout = null;
let pendingUpdates = new Set();

/**
 * Debounced efficient update that batches multiple rapid updates
 * @param {Object} options - Update options
 * @param {number} options.shipId - Specific ship to update (optional)
 * @param {boolean} options.force - Force full rebuild (optional)
 * @param {number} options.delay - Debounce delay in ms (default: 100)
 */
function debouncedTableUpdate(options = {}) {
    const { shipId, force = false, delay = 100 } = options;
    
    // If force update, execute immediately
    if (force) {
        clearTimeout(updateTimeout);
        pendingUpdates.clear();
        efficientTableUpdate({ force: true });
        return;
    }
    
    // Add shipId to pending updates
    if (shipId) {
        pendingUpdates.add(shipId);
    }
    
    // Clear existing timeout
    clearTimeout(updateTimeout);
    
    // Set new timeout
    updateTimeout = setTimeout(() => {
        // If we have specific ships to update
        if (pendingUpdates.size > 0) {
            // If too many ships pending, just do one efficient full update
            if (pendingUpdates.size > addedShips.length / 2) {
                efficientTableUpdate();
            } else {
                // Update each pending ship
                pendingUpdates.forEach(id => {
                    updateShipStats(id);
                    updateShipConfigDropdown(id);
                });
            }
            pendingUpdates.clear();
        } else {
            // General update
            efficientTableUpdate();
        }
    }, delay);
}

// === MODULE EXPORT ===
window.TableUpdates = {
    updateShipStats,
    needsTableRebuild,
    updateShipConfigDropdown,
    efficientTableUpdate,
    debouncedTableUpdate
};

// Also expose individual functions
window.updateShipStats = updateShipStats;
window.needsTableRebuild = needsTableRebuild;
window.updateShipConfigDropdown = updateShipConfigDropdown;
window.efficientTableUpdate = efficientTableUpdate;
window.debouncedTableUpdate = debouncedTableUpdate;

console.log('Table Updates module loaded successfully'); 