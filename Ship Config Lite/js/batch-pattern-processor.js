// === MODULE: Batch Pattern Processor ===
// Adds batch processing functionality to the Pattern Builder

/**
 * Batch process all pre-loaded patterns on the Tier One configuration
 */
window.batchProcessAllPatterns = function() {
    // Check if Tier One exists
    const shipId = parseInt(document.getElementById('components-container').getAttribute('data-ship-id'));
    const ship = addedShips.find(s => s.id === shipId);
    
    if (!ship) {
        alert('No ship selected');
        return;
    }
    
    const shipIdentifier = getShipIdentifier(ship);
    const tierOneConfig = findTierOneConfig(shipIdentifier);
    const tierOneIndex = shipConfigurations[shipIdentifier].findIndex(config => 
        config.name && config.name.toLowerCase() === 'tier one'
    );
    
    if (!tierOneConfig || tierOneIndex === -1) {
        alert('Tier One configuration not found. Please create a config named "Tier One" first.');
        return;
    }
    
    // Get all pre-loaded patterns
    const allPatterns = getPreloadedPatterns();
    
    if (allPatterns.length === 0) {
        alert('No pre-loaded patterns found');
        return;
    }
    
    // Confirm action
    if (!confirm(`This will create ${allPatterns.length} new configurations from Tier One. Continue?`)) {
        return;
    }
    
    // Show progress
    const progressDiv = document.getElementById('batch-progress');
    progressDiv.style.display = 'block';
    progressDiv.innerHTML = '<p>Processing patterns...</p>';
    
    let successCount = 0;
    let failedPatterns = [];
    const results = [];
    
    // Use setTimeout to allow UI updates
    let currentIndex = 0;
    
    function processNextPattern() {
        if (currentIndex >= allPatterns.length) {
            // All done
            finishBatchProcessing();
            return;
        }
        
        const pattern = allPatterns[currentIndex];
        progressDiv.innerHTML = `<p>Processing pattern ${currentIndex + 1} of ${allPatterns.length}: ${pattern.name}...</p>`;
        
        // Apply the pattern
        const result = applyPattern(pattern, shipIdentifier, tierOneIndex);
        
        if (result.success) {
            successCount++;
            results.push({
                name: pattern.name,
                configName: result.configName,
                success: true
            });
        } else {
            failedPatterns.push({
                name: pattern.name,
                error: result.error
            });
            results.push({
                name: pattern.name,
                success: false,
                error: result.error
            });
        }
        
        currentIndex++;
        // Process next pattern after a small delay to allow UI updates
        setTimeout(processNextPattern, 10);
    }
    
    function finishBatchProcessing() {
        // Build results message
        let message = `Batch processing complete!\n\n`;
        message += `✅ Successfully created: ${successCount} configurations\n`;
        
        if (failedPatterns.length > 0) {
            message += `❌ Failed: ${failedPatterns.length} patterns\n\n`;
            message += 'Failed patterns:\n';
            failedPatterns.forEach(failed => {
                message += `- ${failed.name}: ${failed.error}\n`;
            });
        }
        
        // Update progress display with results
        let resultsHtml = '<h4>Batch Processing Complete</h4>';
        resultsHtml += `<p><strong>✅ Success:</strong> ${successCount} configurations created</p>`;
        
        if (failedPatterns.length > 0) {
            resultsHtml += `<p><strong>❌ Failed:</strong> ${failedPatterns.length} patterns</p>`;
        }
        
        resultsHtml += '<div style="max-height: 300px; overflow-y: auto; margin-top: 10px;">';
        results.forEach(result => {
            const icon = result.success ? '✅' : '❌';
            const statusClass = result.success ? 'success' : 'error';
            resultsHtml += `<div class="test-action-result ${statusClass}" style="margin: 5px 0; padding: 8px;">`;
            resultsHtml += `${icon} ${result.name}`;
            if (!result.success && result.error) {
                resultsHtml += `<br><small style="margin-left: 20px;">${result.error}</small>`;
            }
            resultsHtml += '</div>';
        });
        resultsHtml += '</div>';
        
        progressDiv.innerHTML = resultsHtml;
        
        // Refresh the comparison table
        updateComparisonTable();
        
        // Show alert
        alert(message);
    }
    
    // Start processing
    processNextPattern();
};

// Add batch processing button styles
const batchProcessingStyles = `
<style>
.batch-processing-section {
    margin-top: 30px;
    padding: 20px;
    background: var(--background-secondary);
    border-radius: 5px;
    border: 1px solid var(--accent-color);
}

.batch-processing-section h4 {
    margin-top: 0;
    margin-bottom: 15px;
    color: var(--accent-color);
}

.batch-process-btn {
    padding: 12px 24px;
    background: var(--accent-color);
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    width: 100%;
    transition: background-color 0.2s;
}

.batch-process-btn:hover {
    background: var(--accent-hover);
}

.batch-process-all-ships-btn {
    background: #00bcd4 !important;
}

.batch-process-all-ships-btn:hover {
    background: #0097a7 !important;
}

.batch-info {
    margin-top: 10px;
    color: var(--secondary-text-color);
    font-size: 14px;
}

#batch-progress {
    margin-top: 15px;
    padding: 15px;
    background: var(--background-primary);
    border-radius: 3px;
    max-height: 400px;
    overflow-y: auto;
}

#batch-progress h4 {
    margin-top: 0;
    color: var(--text-color);
}
</style>
`;

// Add batch processing styles to document
document.head.insertAdjacentHTML('beforeend', batchProcessingStyles);

console.log('Batch Pattern Processor module loaded');

/**
 * Process all ships that have Tier One configurations
 */
window.batchProcessAllShips = function() {
    console.log('[Batch] batchProcessAllShips called');
    
    // Check if the function is available
    if (typeof batchProcessAllPatterns !== 'function') {
        console.error('batchProcessAllPatterns function not found');
        alert('Pattern system not loaded. Please refresh the page and try again.');
        return;
    }
    
    // Ensure component lookup functions are initialized
    if (typeof ensureFindComponentById === 'function') {
        ensureFindComponentById();
    } else {
        console.warn('[Batch] ensureFindComponentById not found, component lookups might fail');
    }
    
    // Ensure component system is loaded using various methods
    if (!ensureComponentSystem()) {
        console.error('[Batch] Failed to load component system');
        alert('Unable to load component data. Please make sure you have opened the components panel at least once, then try again.');
        return;
    }
    
    // Log component data status for debugging
    console.log('[Batch] Component system status:', {
        hasComponents: !!window.components,
        hasRewardTree: !!window.components?.rewardTree,
        rewardTreeLength: window.components?.rewardTree?.length || 0,
        hasComponentsById: !!window.components?.componentsById,
        componentsByIdCount: Object.keys(window.components?.componentsById || {}).length,
        hasFindComponentById: typeof findComponentById === 'function',
        hasGetCompatibleComponents: typeof getCompatibleComponents === 'function',
        inComponentsPanel: !!document.getElementById('components-container'),
        hasEnsureFindComponentById: typeof ensureFindComponentById === 'function'
    });
    
    console.log('[Batch] Starting batch processing for all ships...');
    
    if (Object.keys(shipConfigurations).length === 0) {
        alert('No ship configurations loaded. Please load a configuration file first.');
        return;
    }
    
    // Proceed directly without delay since we're in Pattern Builder
    console.log('[Batch] Proceeding with batch processing...');
    startBatchProcessing();
};

// Separate function for the actual batch processing
function startBatchProcessing() {
    // Find all ships with Tier One configurations
    const shipsWithTierOne = [];
    for (const shipIdentifier in shipConfigurations) {
        const configs = shipConfigurations[shipIdentifier];
        const tierOneIndex = configs.findIndex(config => 
            config.name && config.name.toLowerCase() === 'tier one'
        );
        if (tierOneIndex !== -1) {
            shipsWithTierOne.push({
                identifier: shipIdentifier,
                tierOneIndex: tierOneIndex,
                shipName: shipIdentifier.replace(/_/g, ' ')
            });
        }
    }
    
    if (shipsWithTierOne.length === 0) {
        alert('No ships found with Tier One configurations.');
        return;
    }
    
    // Get all pre-loaded patterns
    const allPatterns = getPreloadedPatterns();
    const totalOperations = shipsWithTierOne.length * allPatterns.length;
    
    if (!confirm(`This will process ${shipsWithTierOne.length} ships and create ${totalOperations} new configurations total.\n\nShips to process:\n${shipsWithTierOne.map(s => s.shipName).join('\n')}\n\nContinue?`)) {
        return;
    }
    
    // Create or update progress display
    const existingModal = document.getElementById('all-ships-progress-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const progressModal = document.createElement('div');
    progressModal.id = 'all-ships-progress-modal';
    progressModal.innerHTML = `
        <div class="modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 10000;">
            <div class="modal-content" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--background-primary); padding: 30px; border-radius: 10px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <h3 style="margin-top: 0; color: var(--accent-color);">Processing All Ships</h3>
                <div id="all-ships-progress-content">
                    <p>Initializing...</p>
                </div>
                <button id="cancel-all-ships-btn" class="cancel-btn" style="margin-top: 20px; padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(progressModal);
    
    let cancelled = false;
    const cancelBtn = document.getElementById('cancel-all-ships-btn');
    cancelBtn.onclick = () => {
        cancelled = true;
        cancelBtn.textContent = 'Cancelling...';
        cancelBtn.disabled = true;
    };
    
    const progressContent = document.getElementById('all-ships-progress-content');
    const results = {
        totalShips: shipsWithTierOne.length,
        processedShips: 0,
        successfulShips: 0,
        totalConfigs: 0,
        successfulConfigs: 0,
        shipResults: []
    };
    
    let currentShipIndex = 0;
    
    function processNextShip() {
        if (cancelled || currentShipIndex >= shipsWithTierOne.length) {
            finishAllShipsProcessing();
            return;
        }
        
        const shipData = shipsWithTierOne[currentShipIndex];
        const shipName = shipData.shipName;
        
        progressContent.innerHTML = `
            <p><strong>Overall Progress:</strong> ${currentShipIndex + 1} / ${shipsWithTierOne.length} ships</p>
            <p><strong>Current Ship:</strong> ${shipName}</p>
            <p>Processing patterns...</p>
        `;
        
        // Process patterns for this ship
        let patternIndex = 0;
        let shipSuccessCount = 0;
        let shipFailures = [];
        
        function processNextPatternForShip() {
            if (cancelled || patternIndex >= allPatterns.length) {
                // Done with this ship
                results.processedShips++;
                if (shipSuccessCount > 0) {
                    results.successfulShips++;
                }
                results.totalConfigs += allPatterns.length;
                results.successfulConfigs += shipSuccessCount;
                
                results.shipResults.push({
                    shipName: shipName,
                    identifier: shipData.identifier,
                    totalPatterns: allPatterns.length,
                    successCount: shipSuccessCount,
                    failures: shipFailures
                });
                
                currentShipIndex++;
                setTimeout(processNextShip, 100);
                return;
            }
            
            const pattern = allPatterns[patternIndex];
            
            progressContent.innerHTML = `
                <p><strong>Overall Progress:</strong> ${currentShipIndex + 1} / ${shipsWithTierOne.length} ships</p>
                <p><strong>Current Ship:</strong> ${shipName}</p>
                <p><strong>Pattern:</strong> ${patternIndex + 1} / ${allPatterns.length} - ${pattern.name}</p>
            `;
            
            // Apply the pattern with debugging
            console.log(`[Batch] Applying pattern "${pattern.name}" to ship "${shipData.identifier}"`);
            
            // Debug: Check if findComponentById is working
            if (typeof findComponentById === 'function') {
                // Try to find a T5 Energy weapon component as a test
                const testSearch = window.components?.rewardTree?.find(cat => 
                    cat.properties?.Category === 'Ship Weapons'
                );
                console.log('[Batch] Component lookup test - Ship Weapons category found:', !!testSearch);
            }
            
            // Apply the pattern
            try {
                // Check if ship is in addedShips (for the currently loaded ship)
                const shipInUI = Object.values(addedShips).find(s => 
                    getShipIdentifier(s) === shipData.identifier
                );
                
                if (!shipInUI) {
                    // Ship not currently loaded in UI - we need to get its class from the Tier One config
                    console.log(`[Batch] Ship "${shipData.identifier}" not in UI, getting class from Tier One config`);
                    
                    // Get the Tier One configuration
                    const tierOneConfig = shipConfigurations[shipData.identifier][shipData.tierOneIndex];
                    
                    // Try to determine ship class from Tier One components
                    const shipClass = getShipClassFromConfig(tierOneConfig, shipData.identifier);
                    
                    if (!shipClass) {
                        throw new Error(`Unable to determine ship class for ${shipData.identifier}`);
                    }
                    
                    // Create a minimal ship object that pattern functions can use
                    const minimalShip = {
                        'Ship Name': shipData.shipName,
                        Class: shipClass,
                        id: `batch-${Date.now()}` // Temporary ID
                    };
                    
                    // Temporarily add it to addedShips
                    addedShips.push(minimalShip);
                    
                    try {
                        // Apply the pattern
                        const result = applyPattern(pattern, shipData.identifier, shipData.tierOneIndex);
                        
                        // Remove the temporary ship
                        const index = addedShips.indexOf(minimalShip);
                        if (index > -1) {
                            addedShips.splice(index, 1);
                        }
                        
                        if (result.success) {
                            shipSuccessCount++;
                            console.log(`[Batch] Successfully applied "${pattern.name}" to "${shipData.identifier}"`);
                        } else {
                            console.error(`[Batch] Failed to apply "${pattern.name}" to "${shipData.identifier}":`, result.error);
                            shipFailures.push({
                                pattern: pattern.name,
                                error: result.error
                            });
                        }
                    } finally {
                        // Ensure we remove the temporary ship even if there's an error
                        const index = addedShips.indexOf(minimalShip);
                        if (index > -1) {
                            addedShips.splice(index, 1);
                        }
                    }
                } else {
                    // Ship is already in UI, process normally
                    console.log(`[Batch] Processing currently loaded ship "${shipData.identifier}"`);
                    
                    // Apply the pattern
                    const result = applyPattern(pattern, shipData.identifier, shipData.tierOneIndex);
                    
                    if (result.success) {
                        shipSuccessCount++;
                        console.log(`[Batch] Successfully applied "${pattern.name}" to "${shipData.identifier}"`);
                    } else {
                        console.error(`[Batch] Failed to apply "${pattern.name}" to "${shipData.identifier}":`, result.error);
                        shipFailures.push({
                            pattern: pattern.name,
                            error: result.error
                        });
                    }
                }
            } catch (error) {
                console.error(`[Batch] Exception while applying "${pattern.name}" to "${shipData.identifier}":`, error);
                shipFailures.push({
                    pattern: pattern.name,
                    error: error.message || 'Unknown error'
                });
            }
            
            patternIndex++;
            setTimeout(processNextPatternForShip, 10);
        }
        
        processNextPatternForShip();
    }
    
    function finishAllShipsProcessing() {
        let resultsHtml = '<h3>Batch Processing Complete!</h3>';
        
        resultsHtml += `
            <div style="margin: 20px 0; padding: 15px; background: var(--background-secondary); border-radius: 5px;">
                <h4 style="margin-top: 0;">Summary</h4>
                <p><strong>Ships Processed:</strong> ${results.processedShips} / ${results.totalShips}</p>
                <p><strong>Successful Ships:</strong> ${results.successfulShips}</p>
                <p><strong>Total Configurations Created:</strong> ${results.successfulConfigs} / ${results.totalConfigs}</p>
            </div>
        `;
        
        resultsHtml += '<div style="max-height: 300px; overflow-y: auto;">';
        results.shipResults.forEach(shipResult => {
            const success = shipResult.successCount === shipResult.totalPatterns;
            const icon = success ? '✅' : (shipResult.successCount > 0 ? '⚠️' : '❌');
            
            resultsHtml += `
                <div style="margin: 10px 0; padding: 10px; background: var(--background-secondary); border-radius: 5px;">
                    <div><strong>${icon} ${shipResult.shipName}</strong></div>
                    <div style="font-size: 14px; color: var(--secondary-text-color);">
                        Created: ${shipResult.successCount} / ${shipResult.totalPatterns} configurations
                    </div>
            `;
            
            if (shipResult.failures.length > 0) {
                resultsHtml += '<div style="margin-top: 5px; font-size: 12px; color: #ff6b6b;">';
                shipResult.failures.forEach(failure => {
                    resultsHtml += `<div>- ${failure.pattern}: ${failure.error}</div>`;
                });
                resultsHtml += '</div>';
            }
            
            resultsHtml += '</div>';
        });
        resultsHtml += '</div>';
        
        resultsHtml += `
            <button onclick="document.getElementById('all-ships-progress-modal').remove()" 
                    style="margin-top: 20px; padding: 10px 20px; background: var(--accent-color); color: white; border: none; border-radius: 5px; cursor: pointer;">
                Close
            </button>
        `;
        
        progressContent.innerHTML = resultsHtml;
        cancelBtn.style.display = 'none';
        
        // Refresh the comparison table if we're on a ship page
        if (typeof updateComparisonTable === 'function') {
            updateComparisonTable();
        }
    }
    
    // Start processing
    processNextShip();
};

console.log('Batch Pattern Processor module loaded');

/**
 * Get ship class from configuration by examining component classes
 */
function getShipClassFromConfig(config, shipIdentifier) {
    if (!config || !config.components) {
        console.error(`[Batch] No components found in config for ${shipIdentifier}`);
        return null;
    }
    
    // Try to find a component with a class property
    for (const category in config.components) {
        for (const componentType in config.components[category]) {
            const componentIds = config.components[category][componentType];
            
            if (Array.isArray(componentIds)) {
                for (const compId of componentIds) {
                    if (compId && compId !== '') {
                        const component = findComponentById(compId);
                        if (component && component.properties && component.properties.Class) {
                            // Component classes like 'M', 'L', 'CAP' indicate ship class
                            const compClass = component.properties.Class;
                            console.log(`[Batch] Found component class ${compClass} for ship ${shipIdentifier}`);
                            
                            // Map component class to ship class
                            // The ship class is typically a number that determines which component sizes it can use
                            // This is a simplified mapping - may need adjustment based on your game's rules
                            const classMap = {
                                'XXXS': 1,
                                'XXS': 2,
                                'XS': 3,
                                'S': 4,
                                'M': 5,
                                'L': 6,
                                'CAP': 7,
                                'CMD': 8,
                                'TTN': 9
                            };
                            
                            // Return the highest class found (ships can use components up to their class)
                            return classMap[compClass] || 5; // Default to class 5 if unknown
                        }
                    }
                }
            } else if (componentIds && componentIds !== '') {
                const component = findComponentById(componentIds);
                if (component && component.properties && component.properties.Class) {
                    const compClass = component.properties.Class;
                    console.log(`[Batch] Found component class ${compClass} for ship ${shipIdentifier}`);
                    
                    const classMap = {
                        'XXXS': 1,
                        'XXS': 2,
                        'XS': 3,
                        'S': 4,
                        'M': 5,
                        'L': 6,
                        'CAP': 7,
                        'CMD': 8,
                        'TTN': 9
                    };
                    
                    return classMap[compClass] || 5;
                }
            }
        }
    }
    
    console.warn(`[Batch] Could not determine ship class for ${shipIdentifier}, defaulting to 5`);
    return 5; // Default to medium class
}

/**
 * Ensure component system is loaded
 */
function ensureComponentSystem() {
    // Check if components are already loaded
    if (window.components && window.components.rewardTree) {
        console.log('[Batch] Components already loaded');
        return true;
    }
    
    // Try to get components from ComponentsPanel if available
    if (window.ComponentsPanel && window.ComponentsPanel.components) {
        window.components = window.ComponentsPanel.components;
        console.log('[Batch] Loaded components from ComponentsPanel');
        return true;
    }
    
    // Try to get components from the global scope in various ways
    if (typeof components !== 'undefined' && components && components.rewardTree) {
        window.components = components;
        console.log('[Batch] Loaded components from global scope');
        return true;
    }
    
    // Check if we're in the components panel context
    const componentsContainer = document.getElementById('components-container');
    if (componentsContainer) {
        // We're in the components panel, so components should be available somehow
        console.log('[Batch] In components panel context');
        
        // Check if component management functions are available as a minimum
        if (typeof findComponentById === 'function' || window.findComponentById) {
            console.log('[Batch] Component functions are available, proceeding without full component tree');
            // Create a minimal components object to satisfy checks
            if (!window.components) {
                window.components = { rewardTree: [] };
            }
            return true;
        }
    }
    
    return false;
}

// REMOVED: Menu item is now in Pattern Builder instead of Actions dropdown
// The batch processing for all ships is now accessible from the Pattern Builder
// where component data is already loaded 