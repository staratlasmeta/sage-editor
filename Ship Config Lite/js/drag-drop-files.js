// Drag and Drop Files Module
(function() {
    'use strict';
    
    let dragCounter = 0;
    let dropZone = null;
    
    // Initialize drag and drop for files
    function initFileDragDrop() {
        // Create a drop zone overlay
        dropZone = document.createElement('div');
        dropZone.id = 'file-drop-zone';
        dropZone.className = 'file-drop-zone';
        dropZone.innerHTML = `
            <div class="drop-zone-content">
                <div class="drop-zone-icon">📁</div>
                <div class="drop-zone-text">Drop ship JSON files here</div>
                <div class="drop-zone-subtext">Multiple files supported</div>
            </div>
        `;
        dropZone.style.display = 'none';
        document.body.appendChild(dropZone);
        
        // Add event listeners to the entire document
        document.addEventListener('dragenter', handleDragEnter, false);
        document.addEventListener('dragleave', handleDragLeave, false);
        document.addEventListener('dragover', handleDragOver, false);
        document.addEventListener('drop', handleDrop, false);
        
        console.log('File drag-and-drop initialized');
    }
    
    // Handle drag enter
    function handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Check if dragging files (not other elements)
        if (e.dataTransfer.types.includes('Files')) {
            dragCounter++;
            if (dragCounter === 1) {
                showDropZone();
            }
        }
    }
    
    // Handle drag leave
    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.dataTransfer.types.includes('Files')) {
            dragCounter--;
            if (dragCounter === 0) {
                hideDropZone();
            }
        }
    }
    
    // Handle drag over
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.dataTransfer.types.includes('Files')) {
            e.dataTransfer.dropEffect = 'copy';
        }
    }
    
    // Handle drop
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        dragCounter = 0;
        hideDropZone();
        
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            // Filter for JSON files
            const jsonFiles = Array.from(files).filter(file => 
                file.type === 'application/json' || file.name.endsWith('.json')
            );
            
            if (jsonFiles.length > 0) {
                loadDroppedShipFiles(jsonFiles);
            } else {
                alert('Please drop only JSON files.');
            }
        }
    }
    
    // Show drop zone
    function showDropZone() {
        if (dropZone) {
            dropZone.style.display = 'flex';
            dropZone.classList.add('active');
        }
    }
    
    // Hide drop zone
    function hideDropZone() {
        if (dropZone) {
            dropZone.classList.remove('active');
            setTimeout(() => {
                if (!dropZone.classList.contains('active')) {
                    dropZone.style.display = 'none';
                }
            }, 300);
        }
    }
    
    // Load dropped ship files
    function loadDroppedShipFiles(files) {
        console.log(`Loading ${files.length} dropped ship JSON file(s)...`);
        
        let loadedShips = [];
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
                            
                            // Store the loaded ship for auto-adding to comparison
                            loadedShips.push({
                                ship: shipData.ship,
                                identifier: shipData.shipIdentifier,
                                activeConfigIndex: shipData.activeConfigIndex || 0
                            });
                            
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
            
            // Automatically add loaded ships to comparison
            if (loadedShips.length > 0) {
                addLoadedShipsToComparison(loadedShips);
            }
            
            // Show success message
            showDropSuccessMessage(loadedCount);
        }).catch(error => {
            console.error('Error loading ship JSON files:', error);
            alert('Error loading some ship files. Check console for details.');
        });
    }
    
    // Add loaded ships to comparison
    function addLoadedShipsToComparison(loadedShips) {
        // Check if the addShipToComparison function is available
        if (!window.addShipToComparison) {
            console.warn('addShipToComparison not available, trying alternative method');
            
            // Fallback to manual method if function not available
            if (!window.addedShips) {
                console.warn('addedShips not initialized, skipping auto-add to comparison');
                return;
            }
            
            if (!window.nextShipId) {
                window.nextShipId = 1;
            }
            
            if (!window.activeConfigIndices) {
                window.activeConfigIndices = {};
            }
        }
        
        loadedShips.forEach(loadedShip => {
            // Check if this ship is already in comparison
            const alreadyAdded = window.addedShips && window.addedShips.some(addedShip => 
                addedShip['Ship Name'] === loadedShip.ship['Ship Name'] && 
                addedShip.Manufacturer === loadedShip.ship.Manufacturer
            );
            
            if (!alreadyAdded) {
                // Use the proper addShipToComparison function if available
                if (window.addShipToComparison) {
                    console.log(`Adding ship ${loadedShip.ship['Ship Name']} to comparison using addShipToComparison`);
                    window.addShipToComparison(loadedShip.ship);
                    
                    // If a specific config was loaded, set it as active
                    if (loadedShip.activeConfigIndex > 0) {
                        // Find the ship that was just added (it will be the last one)
                        const addedShip = window.addedShips[window.addedShips.length - 1];
                        if (addedShip) {
                            window.activeConfigIndices[addedShip.id] = loadedShip.activeConfigIndex;
                        }
                    }
                } else {
                    // Fallback method
                    const shipId = window.nextShipId++;
                    const shipWithId = { ...loadedShip.ship, id: shipId };
                    const shipIdentifier = window.getShipIdentifier(shipWithId);
                    console.log(`Adding ship ${loadedShip.ship['Ship Name']} with ID ${shipId} to comparison (fallback method)`);
                    window.addedShips.push(shipWithId);
                    window.activeConfigIndices[shipId] = loadedShip.activeConfigIndex || 0;
                }
            } else {
                console.log(`Ship ${loadedShip.ship['Ship Name']} is already in comparison`);
            }
        });
        
        // Update the comparison table
        if (window.updateComparisonTable) {
            window.updateComparisonTable();
        }
    }
    
    // Show success message
    function showDropSuccessMessage(count) {
        const message = document.createElement('div');
        message.className = 'drop-success-message';
        message.innerHTML = `
            <div class="success-icon">✅</div>
            <div class="success-text">Successfully loaded ${count} ship${count !== 1 ? 's' : ''} and added to comparison</div>
        `;
        document.body.appendChild(message);
        
        // Animate in
        setTimeout(() => {
            message.classList.add('show');
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            message.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(message);
            }, 300);
        }, 3000);
    }
    
    // Export functions
    window.FileDragDrop = {
        init: initFileDragDrop
    };
    
})(); 