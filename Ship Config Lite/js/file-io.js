// === FILE I/O MODULE ===
// This module handles all file input/output operations including CSV and JSON handling
// Dependencies: Requires app.js to be loaded first for global variables and functions

/**
 * Handle components file upload
 * @param {Event} event - File input change event
 */
function handleComponentsUpload(event) {
    // Validate dependencies
    if (typeof ships === 'undefined') {
        console.error('File I/O dependencies not found. Make sure app.js is loaded first.');
        return;
    }
    
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('Components file selected:', file.name);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const jsonData = JSON.parse(e.target.result);
            console.log('Components JSON loaded successfully');
            
            // Store the components data
            components = jsonData;
            
            // Create a flat array of all components for easier searching
            if (components.rewardTree) {
                const allComponents = [];
                const componentsById = {};
                
                function traverseComponents(node) {
                    if (node.id) {
                        allComponents.push(node);
                        componentsById[node.id] = node;
                    }
                    if (node.children) {
                        node.children.forEach(traverseComponents);
                    }
                }
                
                components.rewardTree.forEach(traverseComponents);
                components.allComponents = allComponents;
                components.componentsById = componentsById;
                
                console.log(`Indexed ${allComponents.length} components`);
            }
            
            // Extract categories for buttons
            extractComponentCategories();
            
            // Initialize component attributes
            initComponentAttributes();
            
            // Migrate component attributes to new stat type system if needed
            if (window.migrateComponentAttributesToNewFormat) {
                window.migrateComponentAttributesToNewFormat(componentAttributes);
                console.log('Migrated component attributes to new stat type system');
            }
            
            // Create category buttons in the UI
            createCategoryButtons();
            
            // If ships are already loaded, calculate stats for them
            if (ships && ships.length > 0) {
                // Recalculate modified stats for all added ships
                addedShips.forEach(ship => {
                    const shipIdentifier = getShipIdentifier(ship);
                    const activeConfigIndex = activeConfigIndices[ship.id] || 0;
                    if (shipConfigurations[shipIdentifier] && shipConfigurations[shipIdentifier][activeConfigIndex]) {
                        // This will recalculate and update the display
                        updateComparisonTable();
                    }
                });
                
                console.log('Updated ship stats with new components');
            }
            
            // Reinitialize component attributes
            if (typeof initComponentAttributes === 'function') {
                initComponentAttributes();
            }
            
            // Clean up any missing components from configurations
            if (typeof cleanupMissingComponents === 'function') {
                const cleanupReport = cleanupMissingComponents();
                if (cleanupReport.cleanedCount > 0) {
                    console.log(`Cleaned up ${cleanupReport.cleanedCount} missing component references after loading new components file`);
                    
                    // Update the comparison table to reflect the cleaned configurations
                    if (typeof updateComparisonTable === 'function') {
                        updateComparisonTable();
                    }
                }
            }
            
            console.log("Components data loaded successfully");
            alert('Components file loaded successfully!');
            
        } catch (error) {
            console.error('Error parsing components JSON:', error);
            alert('Error loading components file. Please check the file format.');
        }
    };
    
    reader.readAsText(file);
}

/**
 * Handle CSV file upload
 * @param {Event} event - File input change event
 */
function handleCsvUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('CSV file selected:', file.name);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const csvText = e.target.result;
        console.log('CSV file loaded, size:', csvText.length, 'characters');
        
        try {
            // Parse the new CSV
            const newStats = extractStatsFromNewCsv(csvText);
            console.log('New CSV parsing complete');
            console.log('New stats structure:', Object.keys(newStats));
            console.log('Sample new ship:', newStats.ships && newStats.ships[0] ? 
                {name: newStats.ships[0]['Ship Name'], stats: Object.keys(newStats.ships[0]).length} : 'none');
            
            if (!newStats.ships || newStats.ships.length === 0) {
                alert('No valid ship data found in CSV file.');
                return;
            }
            
            // Clear existing data
            ships = [];
            addedShips = [];
            shipConfigurations = {};
            activeConfigIndices = {};
            
            // Store new data
            ships = newStats.ships;
            statsFromCsv = newStats.statsFromCsv;
            
            console.log(`Loaded ${ships.length} ships with ${statsFromCsv.length} stats`);
            console.log('Stats from CSV:', statsFromCsv.slice(0, 10), '...'); // First 10 stats
            
            // Reset the attribute order
            initAttributeOrder();
            
            // Clear the comparison table
            clearAllShipDisplays();
            
            // Update the comparison table to show new ship data available
            updateComparisonTable();
            
            console.log('CSV loading complete');
            
        } catch (error) {
            console.error('Error processing CSV:', error);
            alert('Error processing CSV file. Please check the format.');
        }
    };
    
    reader.readAsText(file);
}

/**
 * Parse CSV text into structured data
 * @param {string} csvText - Raw CSV text
 * @returns {Array} Array of parsed objects
 */
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            const values = line.split(',');
            const obj = {};
            
            for (let j = 0; j < headers.length && j < values.length; j++) {
                const value = values[j].trim();
                
                // Try to convert to number if it looks like a number
                if (!isNaN(value) && value !== '') {
                    obj[headers[j]] = parseFloat(value);
                } else {
                    obj[headers[j]] = value;
                }
            }
            
            data.push(obj);
        }
    }
    
    return data;
}

/**
 * Save configurations to JSON file
 */
function saveConfigurations() {
    // Validate dependencies
    if (typeof shipConfigurations === 'undefined') {
        console.error('File I/O dependencies not found. Make sure app.js is loaded first.');
        return;
    }
    
    try {
        console.log('Saving configurations...');
        console.log('Components available:', components ? 'YES' : 'NO');
        console.log('Components has rewardTree:', components && components.rewardTree ? 'YES' : 'NO');
        
        // Create a comprehensive save object
        const saveData = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            shipConfigurations: shipConfigurations,
            activeConfigIndices: activeConfigIndices,
            customAttributes: customAttributes || [],
            customAttributeOrder: customAttributeOrder || [],
            
            // Include all ships data (including custom ships)
            allShips: ships || [],
            
            // Include current ships in comparison for context
            currentComparison: addedShips.map(ship => ({
                shipName: ship['Ship Name'],
                shipId: ship.id,
                activeConfigIndex: activeConfigIndices[ship.id] || 0
            })),
            
            // Include component system data - only if we have valid components
            components: (components && components.rewardTree) ? components : null,
            componentCategories: componentCategories || {},
            componentAttributes: componentAttributes || {},
            classScalingFormulas: classScalingFormulas || {},
            tierScalingFormulas: tierScalingFormulas || {},
            statsFromCsv: statsFromCsv || [],
            componentsLoaded: componentsLoaded || false,
            
            // Include stat descriptions
            statDescriptions: statDescriptions || {},
            
            // Include combat simulator formula
            combatFormula: window.combatSimulator ? window.combatSimulator.formula : ''
        };
        
        console.log('Components being saved:', saveData.components ? 'YES (with rewardTree)' : 'NO');
        
        const jsonString = JSON.stringify(saveData, null, 2);
        const filename = `ship_configurations_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        
        // Detect if we're on a mobile device or in an environment that might not support downloads
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isIOSApp = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isKoderOrMobileApp = isMobile || isIOSApp || window.location.href.includes('preview') || !window.chrome;
        
        console.log('Save Configs Debug Info:');
        console.log('User Agent:', navigator.userAgent);
        console.log('isMobile:', isMobile);
        console.log('isIOSApp:', isIOSApp);
        console.log('isKoderOrMobileApp:', isKoderOrMobileApp);
        console.log('window.location.href:', window.location.href);
        
        // Force mobile-friendly modal for better compatibility
        // Try the standard download method first only on desktop browsers
        let downloadAttempted = false;
        if (!isKoderOrMobileApp && window.chrome && !isMobile) {
            try {
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                downloadAttempted = true;
                console.log('Standard download attempted');
            } catch (error) {
                console.log('Standard download failed, falling back to mobile method:', error);
            }
        }
        
        // If we're on mobile/iPad/Koder or standard download failed, show the mobile-friendly modal
        if (isKoderOrMobileApp || isMobile || !downloadAttempted) {
            console.log('Showing mobile save modal');
            showMobileSaveModal(jsonString, filename);
        } else {
            console.log('Using desktop save method');
            // Also save to localStorage as backup
            try {
                localStorage.setItem('ship_config_lite_backup', jsonString);
                localStorage.setItem('ship_config_lite_backup_timestamp', new Date().toISOString());
                console.log('Backup saved to localStorage');
            } catch (e) {
                console.log('Could not save to localStorage:', e);
            }
            
            // Show brief notification for desktop
            showSuccessNotification('Configurations saved successfully');
        }
        
    } catch (error) {
        console.error('Error saving configurations:', error);
        alert('Error saving configurations. Please try again.');
    }
}

function showMobileSaveModal(jsonString, filename) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modal.style.zIndex = '10000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.padding = '20px';
    modal.style.boxSizing = 'border-box';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = 'var(--bg-color, #2a2a2a)';
    modalContent.style.color = 'var(--text-color, white)';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '8px';
    modalContent.style.maxWidth = '90%';
    modalContent.style.maxHeight = '90%';
    modalContent.style.overflow = 'auto';
    modalContent.style.fontFamily = 'monospace';
    
    // Create header
    const header = document.createElement('h3');
    header.textContent = 'Save Configuration - Mobile Mode';
    header.style.marginTop = '0';
    header.style.marginBottom = '15px';
    
    // Create instructions
    const instructions = document.createElement('p');
    instructions.innerHTML = `
        <strong>Choose a save method:</strong><br>
        1. Copy the JSON data below and paste it into a text file named "${filename}"<br>
        2. Use "Save to Device" to try a direct download<br>
        3. The data is also automatically saved locally and can be restored later
    `;
    instructions.style.marginBottom = '15px';
    instructions.style.fontSize = '14px';
    instructions.style.lineHeight = '1.4';
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.marginBottom = '15px';
    buttonContainer.style.flexWrap = 'wrap';
    
    // Copy to clipboard button
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy JSON';
    copyButton.style.padding = '8px 16px';
    copyButton.style.backgroundColor = 'var(--button-bg-color, #4a4a4a)';
    copyButton.style.color = 'var(--button-text, white)';
    copyButton.style.border = 'none';
    copyButton.style.borderRadius = '4px';
    copyButton.style.cursor = 'pointer';
    
    copyButton.onclick = async () => {
        try {
            await navigator.clipboard.writeText(jsonString);
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
                copyButton.textContent = 'Copy JSON';
            }, 2000);
        } catch (error) {
            // Fallback for older browsers/environments
            const textArea = document.createElement('textarea');
            textArea.value = jsonString;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
                copyButton.textContent = 'Copy JSON';
            }, 2000);
        }
    };
    
    // Save to device button (fallback download attempt)
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save to Device';
    saveButton.style.padding = '8px 16px';
    saveButton.style.backgroundColor = 'var(--button-bg-color, #4a4a4a)';
    saveButton.style.color = 'var(--button-text, white)';
    saveButton.style.border = 'none';
    saveButton.style.borderRadius = '4px';
    saveButton.style.cursor = 'pointer';
    
    saveButton.onclick = () => {
        try {
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Try multiple download methods
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Also try opening in new window as fallback
            setTimeout(() => {
                const newWindow = window.open(url);
                if (!newWindow) {
                    alert('Download blocked. Please use "Copy JSON" method instead.');
                }
            }, 100);
            
            URL.revokeObjectURL(url);
            saveButton.textContent = 'Download Attempted';
            setTimeout(() => {
                saveButton.textContent = 'Save to Device';
            }, 2000);
        } catch (error) {
            alert('Download failed. Please use "Copy JSON" method instead.');
        }
    };
    
    // Close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.padding = '8px 16px';
    closeButton.style.backgroundColor = 'var(--button-bg-color, #4a4a4a)';
    closeButton.style.color = 'var(--button-text, white)';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.cursor = 'pointer';
    
    closeButton.onclick = () => {
        document.body.removeChild(modal);
    };
    
    // Create textarea with JSON data
    const textarea = document.createElement('textarea');
    textarea.value = jsonString;
    textarea.style.width = '100%';
    textarea.style.height = '300px';
    textarea.style.fontFamily = 'monospace';
    textarea.style.fontSize = '12px';
    textarea.style.backgroundColor = 'var(--input-bg-color, #1a1a1a)';
    textarea.style.color = 'var(--text-color, white)';
    textarea.style.border = '1px solid var(--border-color, #555)';
    textarea.style.borderRadius = '4px';
    textarea.style.padding = '8px';
    textarea.style.resize = 'vertical';
    textarea.readOnly = true;
    
    // Assemble modal
    buttonContainer.appendChild(copyButton);
    buttonContainer.appendChild(saveButton);
    buttonContainer.appendChild(closeButton);
    
    modalContent.appendChild(header);
    modalContent.appendChild(instructions);
    modalContent.appendChild(buttonContainer);
    modalContent.appendChild(textarea);
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Save to localStorage as backup
    try {
        localStorage.setItem('ship_config_lite_backup', jsonString);
        localStorage.setItem('ship_config_lite_backup_timestamp', new Date().toISOString());
        
        const backupInfo = document.createElement('p');
        backupInfo.textContent = '✓ Backup automatically saved locally';
        backupInfo.style.fontSize = '12px';
        backupInfo.style.color = '#4CAF50';
        backupInfo.style.margin = '8px 0 0 0';
        modalContent.appendChild(backupInfo);
    } catch (e) {
        console.log('Could not save to localStorage:', e);
    }
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

function showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    notification.style.color = 'white';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '9999';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 3000);
}

function restoreFromLocalBackup() {
    try {
        const backupData = localStorage.getItem('ship_config_lite_backup');
        const backupTimestamp = localStorage.getItem('ship_config_lite_backup_timestamp');
        
        if (!backupData) {
            alert('No backup found in local storage.');
            return;
        }
        
        // Parse the backup to validate it
        const parsedData = JSON.parse(backupData);
        
        // Show confirmation dialog with backup info
        const backupDate = backupTimestamp ? new Date(backupTimestamp).toLocaleString() : 'Unknown';
        const confirmMessage = `Found backup from: ${backupDate}\n\nThis will replace your current configurations. Continue?`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        // Use the existing loadConfiguration logic by creating a synthetic file event
        const blob = new Blob([backupData], { type: 'application/json' });
        const file = new File([blob], 'backup.json', { type: 'application/json' });
        
        // Create a synthetic file input event
        const syntheticEvent = {
            target: {
                files: [file]
            }
        };
        
        // Use the existing load configurations function
        loadConfigurations(syntheticEvent);
        
        showSuccessNotification('Configuration restored from backup');
        
    } catch (error) {
        console.error('Error restoring from backup:', error);
        alert('Error restoring backup: ' + error.message);
    }
}

/**
 * Load configurations from JSON file
 * @param {Event} event - File input change event
 */
function loadConfigurations(event) {
    // Validate dependencies
    if (typeof shipConfigurations === 'undefined') {
        console.error('File I/O dependencies not found. Make sure app.js is loaded first.');
        return;
    }
    
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('Configuration file selected:', file.name);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const loadedData = JSON.parse(e.target.result);
            console.log('Configuration JSON loaded successfully');
            
            // Validate the loaded data structure - be more flexible
            if (!loadedData.shipConfigurations && !loadedData.configurations) {
                alert('Invalid configuration file format. No configuration data found.');
                return;
            }
            
            // Handle both old and new formats
            let configurationsToLoad = loadedData.shipConfigurations || loadedData.configurations || {};
            let activeIndicesToLoad = loadedData.activeConfigIndices || {};
            
            // Debug what we're loading
            console.log('Components in file:', loadedData.components ? 'YES' : 'NO');
            console.log('Components has rewardTree:', loadedData.components && loadedData.components.rewardTree ? 'YES' : 'NO');
            console.log('Top-level rewardTree:', loadedData.rewardTree ? 'YES' : 'NO');
            console.log('File keys:', Object.keys(loadedData));
            
            // Check for components in multiple possible structures (backwards compatibility)
            let componentsToLoad = null;
            
            // New format: direct components object with rewardTree
            if (loadedData.components && loadedData.components.rewardTree) {
                componentsToLoad = loadedData.components;
                console.log('Found components in NEW format (direct components.rewardTree)');
            }
            // Check for top-level rewardTree (old format)
            else if (loadedData.rewardTree && Array.isArray(loadedData.rewardTree)) {
                componentsToLoad = { rewardTree: loadedData.rewardTree };
                console.log('Found components in OLD format (top-level rewardTree)');
            }
            // Old format: might be nested differently or have different structure
            else if (loadedData.components) {
                console.log('Components object found, checking structure...');
                console.log('Components type:', typeof loadedData.components);
                console.log('Components keys:', Object.keys(loadedData.components));
                
                // Try to find rewardTree somewhere in the components structure
                if (typeof loadedData.components === 'object') {
                    // Check if it's just the rewardTree array directly
                    if (Array.isArray(loadedData.components)) {
                        componentsToLoad = { rewardTree: loadedData.components };
                        console.log('Found components in OLD format (components as array)');
                    }
                    // Check for nested structures
                    else if (loadedData.components.rewardTree) {
                        componentsToLoad = loadedData.components;
                        console.log('Found components in OLD format (nested rewardTree)');
                    }
                    // Check if there are keys that might contain the component data
                    else {
                        for (const key in loadedData.components) {
                            if (loadedData.components[key] && Array.isArray(loadedData.components[key])) {
                                componentsToLoad = { rewardTree: loadedData.components[key] };
                                console.log(`Found components in OLD format (under key: ${key})`);
                                break;
                            }
                            else if (loadedData.components[key] && typeof loadedData.components[key] === 'object' && loadedData.components[key].rewardTree) {
                                componentsToLoad = loadedData.components[key];
                                console.log(`Found components in OLD format (nested under key: ${key})`);
                                break;
                            }
                        }
                    }
                }
                
                if (!componentsToLoad) {
                    console.log('Could not find valid component structure in components object');
                }
            }
            
            // Last resort: search through ALL top-level keys for anything that looks like component data
            if (!componentsToLoad) {
                console.log('Searching through all top-level keys for component data...');
                for (const key in loadedData) {
                    if (key === 'shipConfigurations' || key === 'allShips' || key === 'version' || key === 'timestamp') {
                        continue; // Skip known non-component keys
                    }
                    
                    if (Array.isArray(loadedData[key]) && loadedData[key].length > 0) {
                        // Check if this array looks like component data (has objects with id/name properties)
                        const sample = loadedData[key][0];
                        if (sample && typeof sample === 'object' && (sample.id || sample.name || sample.properties)) {
                            componentsToLoad = { rewardTree: loadedData[key] };
                            console.log(`Found components in OLD format (top-level key: ${key})`);
                            break;
                        }
                    }
                    else if (typeof loadedData[key] === 'object' && loadedData[key] && loadedData[key].rewardTree) {
                        componentsToLoad = loadedData[key];
                        console.log(`Found components in OLD format (object under key: ${key})`);
                        break;
                    }
                }
            }
            
            // Load component system data if we found any
            if (componentsToLoad) {
                console.log('Loading components data from configuration file');
                components = componentsToLoad;
                componentsLoaded = true;
                
                // Process components after loading
                processComponentsAfterLoading();
                
                // Load component categories
                if (loadedData.componentCategories) {
                    componentCategories = loadedData.componentCategories;
                } else {
                    extractComponentCategories();
                }
                
                // Load component attributes
                if (loadedData.componentAttributes) {
                    componentAttributes = loadedData.componentAttributes;
                } else {
                    initComponentAttributes();
                }
                
                // Migrate component attributes to new stat type system if needed
                if (window.migrateComponentAttributesToNewFormat) {
                    window.migrateComponentAttributesToNewFormat(componentAttributes);
                    console.log('Migrated loaded component attributes to new stat type system');
                }
                
                // Load scaling formulas
                if (loadedData.classScalingFormulas) {
                    classScalingFormulas = loadedData.classScalingFormulas;
                }
                if (loadedData.tierScalingFormulas) {
                    tierScalingFormulas = loadedData.tierScalingFormulas;
                }
                
                // Create category buttons
                createCategoryButtons();
                
                console.log('Components system restored from configuration file');
            } else {
                console.log('No component data found in configuration file');
            }
            
            // If we have complete data (ships and components), load everything
            if (loadedData.allShips && loadedData.allShips.length > 0) {
                console.log('Loading complete configuration file with ships data');
                
                // Load all ships data (including custom ships)
                ships = loadedData.allShips;
                console.log(`Loaded ${ships.length} ships from configuration file`);
                
                // Extract stats from the ship data if not provided
                if (loadedData.statsFromCsv) {
                    statsFromCsv = loadedData.statsFromCsv;
                } else if (ships.length > 0) {
                    // Get stats from the first ship (excluding non-stat fields)
                    statsFromCsv = Object.keys(ships[0]).filter(key => 
                        !['Ship Name', 'Manufacturer', 'Spec', 'Class', 'id'].includes(key));
                }
                
                // Re-initialize attribute order
                initAttributeOrder();
                
                // Clear existing comparison
                addedShips = [];
                
                // If we have comparison data, restore it
                if (loadedData.currentComparison && Array.isArray(loadedData.currentComparison)) {
                    loadedData.currentComparison.forEach(compData => {
                        const ship = ships.find(s => s['Ship Name'] === compData.shipName);
                        if (ship) {
                            const shipWithId = { ...ship, id: compData.shipId || nextShipId++ };
                            addedShips.push(shipWithId);
                            activeConfigIndices[shipWithId.id] = compData.activeConfigIndex || 0;
                        }
                    });
                    
                    // Update nextShipId to be higher than any restored ship ID
                    if (addedShips.length > 0) {
                        const maxId = Math.max(...addedShips.map(ship => ship.id));
                        nextShipId = maxId + 1;
                        console.log(`Updated nextShipId to ${nextShipId} after restoring ships`);
                    }
                }
                
                console.log(`Restored ${addedShips.length} ships to comparison table`);
                
                // Update the comparison table with restored ships
                updateComparisonTable();
                
            } else if (loadedData.allShips) {
                console.log('Loading ships data only from configuration file');
                
                // Load ships data without components  
                ships = loadedData.allShips;
                console.log(`Loaded ${ships.length} ships from configuration file`);
                
                // Extract stats from the ship data if not provided
                if (loadedData.statsFromCsv) {
                    statsFromCsv = loadedData.statsFromCsv;
                } else if (ships.length > 0) {
                    // Get stats from the first ship (excluding non-stat fields)
                    statsFromCsv = Object.keys(ships[0]).filter(key => 
                        !['Ship Name', 'Manufacturer', 'Spec', 'Class', 'id'].includes(key));
                }
                
                // Re-initialize attribute order
                initAttributeOrder();
                
                // Ships data loaded - comparison table will be updated when needed
                
            } else {
                console.log('Loading configurations only (no ships data)');
                
                // Just load the configurations without ships
                if (ships.length === 0) {
                    alert('No ships loaded. Please load ship data first, then try loading configurations again.');
                    return;
                }
            }
            
            // Load the configurations
            shipConfigurations = configurationsToLoad;
            activeConfigIndices = activeIndicesToLoad;
            
            // Load custom attributes
            if (loadedData.customAttributes) {
                customAttributes = loadedData.customAttributes;
            }
            if (loadedData.customAttributeOrder) {
                customAttributeOrder = loadedData.customAttributeOrder;
            }
            
            // Load stat descriptions
            if (loadedData.statDescriptions) {
                statDescriptions = loadedData.statDescriptions;
                window.statDescriptions = statDescriptions; // Sync with window object
                console.log('Loaded stat descriptions:', Object.keys(statDescriptions).length);
            }
            
            // Load combat formula - always overwrite localStorage when loading from file
            if (window.combatSimulator) {
                // Get the formula from file (or empty string if not present)
                const formulaFromFile = loadedData.combatFormula || '';
                
                // Always overwrite the combat simulator formula and localStorage
                window.combatSimulator.formula = formulaFromFile;
                localStorage.setItem('combatSimulatorFormula', formulaFromFile);
                
                if (formulaFromFile) {
                    console.log('Loaded combat formula from configuration file');
                } else {
                    console.log('No combat formula in configuration file, cleared existing formula');
                }
                
                // Refresh syntax highlighting if combat simulator is open
                if (window.refreshCombatFormulaSyntax) {
                    window.refreshCombatFormulaSyntax();
                }
            }
            
            // Load separately saved ships list
            if (loadedData.separatelySavedShips && typeof separatelySavedShips !== 'undefined') {
                separatelySavedShips.clear();
                loadedData.separatelySavedShips.forEach(shipId => separatelySavedShips.add(shipId));
                console.log('Loaded separately saved ships:', Array.from(separatelySavedShips));
            }
            
            console.log('Loaded configurations for ships:', Object.keys(shipConfigurations));
            console.log('Active config indices:', activeConfigIndices);
            
            // Update the comparison table if ships are loaded
            if (addedShips.length > 0) {
                updateComparisonTable();
            }
            
            console.log('Configurations loaded successfully');
            
            // Show success notification
            const notification = document.createElement('div');
            notification.textContent = 'Configurations loaded successfully';
            notification.style.position = 'fixed';
            notification.style.bottom = '20px';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            notification.style.color = 'white';
            notification.style.padding = '10px 20px';
            notification.style.borderRadius = '5px';
            notification.style.zIndex = '9999';
            document.body.appendChild(notification);
            
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 3000);
            
        } catch (error) {
            console.error('Error loading configurations:', error);
            alert('Error loading configuration file. Please check the file format.');
        }
    };
    
    reader.readAsText(file);
}

/**
 * Extract stats from new CSV format
 * @param {string} csvText - Raw CSV text
 * @returns {Object} Object containing ships array and stats array
 */
function extractStatsFromNewCsv(csvText) {
    console.log('=== EXTRACTING STATS FROM NEW CSV ===');
    
    const ships = parseCSV(csvText);
    console.log(`Parsed ${ships.length} ships from CSV`);
    
    if (ships.length === 0) {
        console.error('No ships found in CSV');
        return { ships: [], statsFromCsv: [] };
    }
    
    // Get stats from the first ship (excluding non-stat fields)
    let statsFromCsv = Object.keys(ships[0]).filter(key => 
        !['Ship Name', 'Manufacturer', 'Spec', 'Class', 'id'].includes(key));
    console.log(`Found ${statsFromCsv.length} stats in CSV:`, statsFromCsv.slice(0, 10), '...');
    
    // If no stats found in CSV, add some default stats so the app can function
    if (statsFromCsv.length === 0) {
        console.log('⚠️ WARNING: CSV contains no stat columns, adding default stats');
        const defaultStats = ['cargo_capacity', 'fuel_capacity', 'hit_points', 'damage', 'max_ap'];
        
        // Add default stats to all ships
        ships.forEach(ship => {
            defaultStats.forEach(stat => {
                if (!ship.hasOwnProperty(stat)) {
                    ship[stat] = 0; // Default value
                }
            });
        });
        
        // Update statsFromCsv to include the default stats
        statsFromCsv = [...defaultStats];
        console.log(`Added default stats: ${defaultStats.join(', ')}`);
    }
    
    // Add unique IDs to ships for internal tracking
    ships.forEach((ship, index) => {
        ship.id = index + 1;
    });
    
    console.log('Stats extraction complete');
    
    return {
        ships: ships,
        statsFromCsv: statsFromCsv
    };
}

/**
 * Handle CSV configuration import
 * @param {Event} event - File input change event
 * @param {number} shipId - Ship ID to import configuration for
 * @param {string} shipIdentifier - Ship identifier
 */
function handleCsvConfigImport(event, shipId, shipIdentifier) {
    // Validate dependencies
    if (typeof components === 'undefined' || typeof shipConfigurations === 'undefined') {
        console.error('CSV Config Import dependencies not found. Make sure app.js and components are loaded first.');
        return;
    }
    
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('CSV configuration file selected:', file.name);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const csvText = e.target.result;
        console.log('CSV configuration file loaded, size:', csvText.length, 'characters');
        
        try {
            // Parse the CSV
            const configData = parseConfigurationCSV(csvText);
            console.log('CSV configuration parsing complete');
            console.log('Found components and modules:', configData);
            
            if (!configData.components || configData.components.length === 0) {
                alert('No valid components or modules found in CSV file.');
                return;
            }
            
            // Find the ship
            const ship = addedShips.find(s => s.id === shipId);
            if (!ship) {
                console.error(`Ship with ID ${shipId} not found`);
                alert('Ship not found. Please try again.');
                return;
            }
            
            // Create a new configuration from the CSV data
            const newConfig = createConfigurationFromCSV(configData, ship);
            
            // Add the new configuration
            if (!shipConfigurations[shipIdentifier]) {
                shipConfigurations[shipIdentifier] = [];
            }
            
            shipConfigurations[shipIdentifier].push(newConfig);
            
            // Set as active configuration
            const newConfigIndex = shipConfigurations[shipIdentifier].length - 1;
            activeConfigIndices[shipId] = newConfigIndex;
            
            // Update the UI
            updateComparisonTable();
            
            // If the components panel is open for this ship, refresh it
            const componentsPanel = document.getElementById('components-panel');
            if (componentsPanel && componentsPanel.classList.contains('open')) {
                const currentShipId = parseInt(document.getElementById('components-container').getAttribute('data-ship-id'));
                if (currentShipId === shipId) {
                    openComponentsPanel(shipId, newConfigIndex, shipIdentifier);
                }
            }
            
            console.log('CSV configuration imported successfully');
            
            // Show success notification
            const notification = document.createElement('div');
            notification.textContent = `Configuration "${newConfig.name}" imported successfully`;
            notification.style.position = 'fixed';
            notification.style.bottom = '20px';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            notification.style.color = 'white';
            notification.style.padding = '10px 20px';
            notification.style.borderRadius = '5px';
            notification.style.zIndex = '9999';
            document.body.appendChild(notification);
            
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 3000);
            
        } catch (error) {
            console.error('Error processing CSV configuration:', error);
            alert('Error processing CSV configuration file. Please check the format.');
        }
    };
    
    reader.readAsText(file);
}

/**
 * Parse CSV configuration file
 * @param {string} csvText - Raw CSV text
 * @returns {Object} Parsed configuration data
 */
function parseConfigurationCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    
    // Expected headers: Asset, Type, Subtype, Config, Class, Tier, Qty, Ship Name
    const requiredHeaders = ['Asset', 'Type', 'Subtype', 'Config', 'Class', 'Qty'];
    const optionalHeaders = ['Tier']; // Tier is optional for backward compatibility
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }
    
    const components = [];
    const modules = [];
    let shipName = '';
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',').map(val => val.trim());
        const row = {};
        
        // Map values to headers
        for (let j = 0; j < headers.length && j < values.length; j++) {
            row[headers[j]] = values[j];
        }
        
        // Skip if no asset name
        if (!row.Asset) continue;
        
        // Extract ship name if available
        if (row['Ship Name'] && !shipName) {
            shipName = row['Ship Name'];
        }
        
        // Process components and modules only
        if (row.Type === 'Component' || row.Type === 'Module') {
            const item = {
                asset: row.Asset,
                type: row.Type,
                subtype: row.Subtype,
                config: row.Config,
                class: row.Class,
                tier: row.Tier || 'T1', // Default to T1 if not specified
                qty: parseInt(row.Qty) || 1
            };
            
            if (row.Type === 'Component') {
                components.push(item);
            } else if (row.Type === 'Module') {
                modules.push(item);
            }
        }
    }
    
    return {
        shipName: shipName,
        components: components,
        modules: modules
    };
}

/**
 * Create a configuration from CSV data
 * @param {Object} configData - Parsed CSV configuration data
 * @param {Object} ship - Ship object
 * @returns {Object} New configuration object
 */
function createConfigurationFromCSV(configData, ship) {
    const configName = configData.shipName ? 
        `${configData.shipName} Configuration` : 
        `Imported Configuration ${new Date().toLocaleTimeString()}`;
    
    const newConfig = {
        name: configName,
                            components: {
                        "Ship Component": {},
                        "Ship Module": {},
                        "Ship Weapons": {},
                        "Countermeasures": {},
                        "Missiles": {},
                        "Drones": {}
                    }
    };
    
    // Process components
    configData.components.forEach(item => {
        const matchedComponent = findMatchingComponent(item, ship);
        if (matchedComponent) {
            addComponentToConfig(newConfig, matchedComponent, item);
        } else {
            console.warn(`Could not find matching component for: ${item.asset} (${item.subtype})`);
        }
    });
    
    // Process modules
    configData.modules.forEach(item => {
        const matchedModule = findMatchingModule(item, ship);
        if (matchedModule) {
            addModuleToConfig(newConfig, matchedModule, item);
        } else {
            console.warn(`Could not find matching module for: ${item.asset} (${item.subtype})`);
        }
    });
    
    return newConfig;
}

/**
 * Map CSV class names to component system class names
 * @param {string} csvClass - Class name from CSV (e.g., "X-Small")
 * @returns {string} Component system class name (e.g., "XS")
 */
function mapCsvClassToComponentClass(csvClass) {
    const classMapping = {
        'XX-Small': 'XXS',
        'X-Small': 'XS',
        'Small': 'S',
        'Medium': 'M',
        'Large': 'L',
        'Capital': 'CAP',
        'Commander': 'CMD',
        'Titan': 'TTN',
        // Also support direct mappings
        'XXS': 'XXS',
        'XS': 'XS',
        'S': 'S',
        'M': 'M',
        'L': 'L',
        'CAP': 'CAP',
        'CMD': 'CMD',
        'TTN': 'TTN'
    };
    
    return classMapping[csvClass] || csvClass;
}

/**
 * Find matching component in the component library
 * @param {Object} csvItem - CSV item data
 * @param {Object} ship - Ship object
 * @returns {Object|null} Matching component or null
 */
function findMatchingComponent(csvItem, ship) {
    if (!components || !components.rewardTree) return null;
    
    // Determine category based on subtype
    let category = 'Ship Component'; // Default category
    
    switch(csvItem.subtype) {
        case 'Core':
            category = 'Ship Component';
            break;
        case 'Weapon':
            category = 'Ship Weapons';
            break;
        case 'Countermeasure':
            category = 'Countermeasures';
            break;
        case 'Missile':
            category = 'Missiles';
            break;
        case 'Component':
        default:
            category = 'Ship Component';
            break;
    }
    
    // Extract the base component name (remove any parenthetical info)
    const assetName = csvItem.asset.split(' (')[0].trim();
    
    // Try to find a matching component by searching through all compatible components
    // and looking for name matches
    const allCategories = ['Ship Component', 'Ship Weapons', 'Countermeasures', 'Missiles'];
    let bestMatch = null;
    
    // First, try the determined category
    bestMatch = findComponentInCategory(category, assetName, csvItem, ship);
    
    // If not found, try other categories
    if (!bestMatch) {
        for (const cat of allCategories) {
            if (cat !== category) {
                bestMatch = findComponentInCategory(cat, assetName, csvItem, ship);
                if (bestMatch) break;
            }
        }
    }
    
    return bestMatch;
}

/**
 * Helper function to find a component in a specific category
 */
function findComponentInCategory(category, assetName, csvItem, ship) {
    // Get all component types in this category
    const categoryTypes = componentCategories[category] || [];
    
    let bestMatch = null;
    const targetClass = mapCsvClassToComponentClass(csvItem.class);
    const targetTier = csvItem.tier || 'T1';
    
    // Try each component type in the category
    for (const componentType of categoryTypes) {
        const compatibleComponents = getCompatibleComponents(category, componentType, ship.Class);
        
        // Look for components that match the asset name
        const nameMatches = compatibleComponents.filter(comp => {
            const compName = comp.name || '';
            // Try exact match first
            if (compName === assetName) return true;
            // Try partial match (component name contains asset name or vice versa)
            if (compName.toLowerCase().includes(assetName.toLowerCase()) || 
                assetName.toLowerCase().includes(compName.toLowerCase())) return true;
            return false;
        });
        
        if (nameMatches.length > 0) {
            // Found name matches, now try to find the best class/tier match
            
            // First try exact class and tier match
            bestMatch = nameMatches.find(comp => 
                comp.properties && 
                comp.properties.Class === targetClass &&
                comp.properties.Tier === targetTier
            );
            
            // If no exact match, try class match with any tier
            if (!bestMatch) {
                bestMatch = nameMatches.find(comp => 
                    comp.properties && comp.properties.Class === targetClass
                );
            }
            
            // If still no match, try tier match with any class
            if (!bestMatch) {
                bestMatch = nameMatches.find(comp => 
                    comp.properties && comp.properties.Tier === targetTier
                );
            }
            
            // If still no match, just take the first name match
            if (!bestMatch) {
                bestMatch = nameMatches[0];
            }
            
            if (bestMatch) break;
        }
    }
    
    return bestMatch;
}

/**
 * Find matching module in the component library
 * @param {Object} csvItem - CSV item data
 * @param {Object} ship - Ship object
 * @returns {Object|null} Matching module or null
 */
function findMatchingModule(csvItem, ship) {
    if (!components || !components.rewardTree) return null;
    
    // Extract the base module name (remove any parenthetical info)
    const assetName = csvItem.asset.split(' (')[0].trim();
    
    // Try to find a matching module by searching through all module types
    const category = 'Ship Module';
    const moduleTypes = componentCategories[category] || [];
    
    let bestMatch = null;
    const targetClass = mapCsvClassToComponentClass(csvItem.class);
    const targetTier = csvItem.tier || 'T1';
    
    // Try each module type in the category
    for (const moduleType of moduleTypes) {
        const compatibleModules = getCompatibleComponents(category, moduleType, ship.Class);
        
        // Look for modules that match the asset name
        const nameMatches = compatibleModules.filter(mod => {
            const modName = mod.name || '';
            // Try exact match first
            if (modName === assetName) return true;
            // Try partial match (module name contains asset name or vice versa)
            if (modName.toLowerCase().includes(assetName.toLowerCase()) || 
                assetName.toLowerCase().includes(modName.toLowerCase())) return true;
            return false;
        });
        
        if (nameMatches.length > 0) {
            // Found name matches, now try to find the best class/tier match
            
            // First try exact class and tier match
            bestMatch = nameMatches.find(mod => 
                mod.properties && 
                mod.properties.Class === targetClass &&
                mod.properties.Tier === targetTier
            );
            
            // If no exact match, try class match with any tier
            if (!bestMatch) {
                bestMatch = nameMatches.find(mod => 
                    mod.properties && mod.properties.Class === targetClass
                );
            }
            
            // If still no match, try tier match with any class
            if (!bestMatch) {
                bestMatch = nameMatches.find(mod => 
                    mod.properties && mod.properties.Tier === targetTier
                );
            }
            
            // If still no match, just take the first name match
            if (!bestMatch) {
                bestMatch = nameMatches[0];
            }
            
            if (bestMatch) break;
        }
    }
    
    return bestMatch;
}

/**
 * Add component to configuration
 * @param {Object} config - Configuration object
 * @param {Object} component - Component object
 * @param {Object} csvItem - CSV item data
 */
function addComponentToConfig(config, component, csvItem) {
    // Determine category from component properties
    let category = 'Ship Component'; // Default
    let componentType = null;
    
    if (component.properties) {
        // Check what type of component this is based on its properties
        if (component.properties['Ship Component']) {
            category = 'Ship Component';
            componentType = component.properties['Ship Component'];
        } else if (component.properties['Damage Type'] && !component.properties['Countermeasure']) {
            // This is likely a weapon
            category = 'Ship Weapons';
            componentType = component.properties['Damage Type'];
        } else if (component.properties['Countermeasure']) {
            category = 'Countermeasures';
            componentType = component.properties['Countermeasure'];
        } else if (component.properties['Manufacturer'] && component.properties['Damage Type']) {
            // This is likely a missile
            category = 'Missiles';
            componentType = component.properties['Damage Type'];
        } else if (component.properties.Category) {
            // Use the category property directly if available
            category = component.properties.Category;
            // Try to determine component type from various properties
            componentType = component.properties['Ship Component'] || 
                           component.properties['Damage Type'] || 
                           component.properties['Countermeasure'] || 
                           component.properties['Manufacturer'] ||
                           'Unknown';
        }
    }
    
    if (!componentType) {
        console.warn('Could not determine component type for:', component);
        return;
    }
    
    // Initialize component type array if needed
    if (!config.components[category]) {
        config.components[category] = {};
    }
    if (!config.components[category][componentType]) {
        config.components[category][componentType] = [];
    }
    
    // Add the component(s) based on quantity
    const qty = csvItem.qty || 1;
    for (let i = 0; i < qty; i++) {
        config.components[category][componentType].push(component.id);
    }
}

/**
 * Add module to configuration
 * @param {Object} config - Configuration object
 * @param {Object} module - Module object
 * @param {Object} csvItem - CSV item data
 */
function addModuleToConfig(config, module, csvItem) {
    const category = 'Ship Module';
    let moduleType = null;
    
    // Determine module type from module properties
    if (module.properties) {
        if (module.properties['Ship Modules']) {
            moduleType = module.properties['Ship Modules'];
        } else if (module.properties.Category === 'Ship Module') {
            // Try to extract module type from the module name or other properties
            moduleType = module.name || 'Unknown Module';
        } else {
            // Fallback - use the module name
            moduleType = module.name || 'Unknown Module';
        }
    } else {
        // No properties - use the module name
        moduleType = module.name || 'Unknown Module';
    }
    
    if (!moduleType) {
        console.warn('Could not determine module type for:', module);
        return;
    }
    
    // Initialize module type array if needed
    if (!config.components[category]) {
        config.components[category] = {};
    }
    if (!config.components[category][moduleType]) {
        config.components[category][moduleType] = [];
    }
    
    // Add the module(s) based on quantity
    const qty = csvItem.qty || 1;
    for (let i = 0; i < qty; i++) {
        config.components[category][moduleType].push(module.id);
    }
}

/**
 * Export configuration to CSV
 * @param {number} shipId - Ship ID
 * @param {number} configIndex - Configuration index
 * @param {string} shipIdentifier - Ship identifier
 */
function exportConfigurationToCSV(shipId, configIndex, shipIdentifier) {
    console.log(`📤 Exporting configuration to CSV for ship ${shipId}, config index ${configIndex}`);
    
    // Find the ship
    const ship = addedShips.find(s => s.id === shipId);
    if (!ship) {
        console.error(`Ship with ID ${shipId} not found`);
        alert('Ship not found. Please try again.');
        return;
    }
    
    // Get the configuration
    const configs = shipConfigurations[shipIdentifier];
    if (!configs || !configs[configIndex]) {
        console.error(`Configuration not found for ship ${shipIdentifier} at index ${configIndex}`);
        alert('Configuration not found. Please try again.');
        return;
    }
    
    const config = configs[configIndex];
    console.log(`📤 Exporting configuration: ${config.name}`);
    
    // Generate CSV data
    const csvData = generateConfigurationCSV(config, ship);
    
    // Create and download the CSV file
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ship['Ship Name']}_${config.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📤 Configuration exported successfully');
    
    // Show success notification
    const notification = document.createElement('div');
    notification.textContent = `Configuration "${config.name}" exported successfully`;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    notification.style.color = 'white';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '9999';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

/**
 * Generate CSV data from configuration
 * @param {Object} config - Configuration object
 * @param {Object} ship - Ship object
 * @returns {string} CSV data
 */
function generateConfigurationCSV(config, ship) {
    console.log('📤 Generating CSV data for configuration:', config.name);
    
    const csvRows = [];
    
    // Add CSV header
    csvRows.push('Asset,Type,Subtype,Config,Class,Tier,Qty,Ship Name');
    
    // Process each category in the configuration
    Object.keys(config.components).forEach(category => {
        const categoryComponents = config.components[category];
        
        Object.keys(categoryComponents).forEach(componentType => {
            const componentIds = categoryComponents[componentType];
            
            // Handle both array and single component formats
            const idsArray = Array.isArray(componentIds) ? componentIds : [componentIds];
            
            // Count occurrences of each component ID
            const componentCounts = {};
            idsArray.forEach(id => {
                if (id) {
                    componentCounts[id] = (componentCounts[id] || 0) + 1;
                }
            });
            
            // Add each unique component to CSV
            Object.keys(componentCounts).forEach(componentId => {
                const component = findComponentById ? 
                    findComponentById(componentId) : 
                    (window.findComponentById ? window.findComponentById(componentId) : null);
                
                if (component && component.properties) {
                    const csvRow = generateCSVRowFromComponent(component, componentCounts[componentId], ship, category);
                    if (csvRow) {
                        csvRows.push(csvRow);
                    }
                }
            });
        });
    });
    
    console.log(`📤 Generated ${csvRows.length - 1} component rows for CSV`);
    return csvRows.join('\n');
}

/**
 * Generate a CSV row from a component
 * @param {Object} component - Component object
 * @param {number} quantity - Quantity of component
 * @param {Object} ship - Ship object
 * @param {string} category - Component category
 * @returns {string} CSV row
 */
function generateCSVRowFromComponent(component, quantity, ship, category) {
    const properties = component.properties;
    
    // Determine asset name (component name)
    let assetName = component.name || 'Unknown Component';
    
    // Determine type (Component or Module) based on category
    let type = 'Component';
    if (category === 'Ship Module' || properties['Ship Modules']) {
        type = 'Module';
    }
    
    // Determine subtype based on the actual component properties, not hardcoded lists
    let subtype = '';
    if (type === 'Component') {
        // Use the actual category name as subtype, or derive from properties
        if (category === 'Ship Component') {
            subtype = 'Core'; // Most ship components are core
        } else if (category === 'Ship Weapons') {
            subtype = 'Weapon';
        } else if (category === 'Countermeasures') {
            subtype = 'Countermeasure';
        } else if (category === 'Missiles') {
            subtype = 'Missile';
        } else {
            // For any other category, use the category name itself or a generic fallback
            subtype = category.replace('Ship ', '') || 'Component';
        }
    } else if (type === 'Module') {
        // For modules, use 'Swappable' as default or derive from properties
        subtype = 'Swappable';
    }
    
    // Determine config based on type and properties
    let config = '';
    if (type === 'Module') {
        config = 'Detail';
    } else if (properties.Config) {
        config = properties.Config;
    }
    // For most components, config remains empty
    
    // Get class from component properties
    const componentClass = properties.Class || 'Unknown';
    
    // Get tier from component properties
    const componentTier = properties.Tier || 'T1';
    
    // Get ship name
    const shipName = ship['Ship Name'] || 'Unknown Ship';
    
    // Escape any commas in the values
    const escapeCSV = (value) => {
        if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
        }
        return value;
    };
    
    // Create CSV row
    const csvRow = [
        escapeCSV(assetName),
        escapeCSV(type),
        escapeCSV(subtype),
        escapeCSV(config),
        escapeCSV(componentClass),
        escapeCSV(componentTier),
        quantity,
        escapeCSV(shipName)
    ].join(',');
    
    return csvRow;
}

// === MODULE EXPORT ===
// Export functions to global scope for use by app.js
window.FileIO = {
    handleComponentsUpload,
    handleCsvUpload,
    parseCSV,
    saveConfigurations,
    loadConfigurations,
    extractStatsFromNewCsv,
    handleCsvConfigImport,
    parseConfigurationCSV,
    createConfigurationFromCSV,
    findMatchingComponent,
    findMatchingModule,
    addComponentToConfig,
    addModuleToConfig,
    mapCsvClassToComponentClass,
    exportConfigurationToCSV,
    generateConfigurationCSV,
    generateCSVRowFromComponent
};

// Also expose individual functions for backward compatibility
window.handleComponentsUpload = handleComponentsUpload;
window.handleCsvUpload = handleCsvUpload;
window.parseCSV = parseCSV;
window.saveConfigurations = saveConfigurations;
window.loadConfigurations = loadConfigurations;
window.extractStatsFromNewCsv = extractStatsFromNewCsv;
window.handleCsvConfigImport = handleCsvConfigImport;
window.parseConfigurationCSV = parseConfigurationCSV;
window.createConfigurationFromCSV = createConfigurationFromCSV;
window.findMatchingComponent = findMatchingComponent;
window.findMatchingModule = findMatchingModule;
window.addComponentToConfig = addComponentToConfig;
window.addModuleToConfig = addModuleToConfig;
window.mapCsvClassToComponentClass = mapCsvClassToComponentClass;
window.exportConfigurationToCSV = exportConfigurationToCSV;
window.generateConfigurationCSV = generateConfigurationCSV;
window.generateCSVRowFromComponent = generateCSVRowFromComponent;

console.log('File I/O module loaded successfully'); 