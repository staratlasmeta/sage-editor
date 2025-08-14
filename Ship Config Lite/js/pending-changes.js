// === MODULE: Pending Changes Manager ===
// This module tracks pending changes and shows a refresh button instead of real-time updates
// to improve performance by avoiding constant table rebuilds.

(function() {
    'use strict';
    
    // Track pending changes
    let pendingChanges = new Set();
    let refreshButton = null;
    let isRefreshing = false;
    
    // Web Worker for heavy calculations
    let calculationWorker = null;
    
    /**
     * Initialize the pending changes manager
     */
    function initPendingChanges() {
        // Create the refresh button
        createRefreshButton();
        
        // Initialize the Web Worker
        initWebWorker();
        
        // Override the updateComparisonTable function
        overrideUpdateFunction();
    }
    
    /**
     * Create the refresh button UI
     */
    function createRefreshButton() {
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'refresh-button-container';
        buttonContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            display: none;
        `;
        
        // Create the refresh button
        refreshButton = document.createElement('button');
        refreshButton.className = 'refresh-table-button';
        refreshButton.style.cssText = `
            background: #3d8bf8;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 24px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(61, 139, 248, 0.3);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        // Add hover effect
        refreshButton.addEventListener('mouseenter', () => {
            if (!refreshButton.disabled) {
                refreshButton.style.transform = 'translateY(-2px)';
                refreshButton.style.boxShadow = '0 6px 16px rgba(61, 139, 248, 0.4)';
            }
        });
        
        refreshButton.addEventListener('mouseleave', () => {
            if (!refreshButton.disabled) {
                refreshButton.style.transform = 'translateY(0)';
                refreshButton.style.boxShadow = '0 4px 12px rgba(61, 139, 248, 0.3)';
            }
        });
        
        // Add pulsing animation style
        const pulseStyle = document.createElement('style');
        pulseStyle.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            .refresh-table-button.has-changes {
                animation: pulse 2s ease-in-out infinite;
            }
            
            .refresh-table-button:disabled {
                opacity: 0.7;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(pulseStyle);
        
        updateRefreshButton();
        
        // Add click handler
        refreshButton.addEventListener('click', performRefresh);
        
        buttonContainer.appendChild(refreshButton);
        document.body.appendChild(buttonContainer);
    }
    
    /**
     * Update the refresh button text and visibility
     */
    function updateRefreshButton() {
        if (!refreshButton) return;
        
        const changeCount = pendingChanges.size;
        
        if (changeCount > 0) {
            refreshButton.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 4v6h-6M1 20v-6h6"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                Refresh Table (${changeCount} change${changeCount > 1 ? 's' : ''})
            `;
            refreshButton.parentElement.style.display = 'block';
            refreshButton.classList.add('has-changes');
            
            // Add brief scale animation for new changes
            refreshButton.animate([
                { transform: 'scale(1)' },
                { transform: 'scale(1.08)' },
                { transform: 'scale(1)' }
            ], {
                duration: 300,
                iterations: 1
            });
        } else {
            refreshButton.parentElement.style.display = 'none';
            refreshButton.classList.remove('has-changes');
        }
    }
    
    /**
     * Add a pending change
     * @param {string} changeType - Type of change (e.g., 'config', 'component', 'ship')
     * @param {any} changeData - Data associated with the change
     */
    function addPendingChange(changeType, changeData) {
        // Create a unique key for the change
        const changeKey = `${changeType}:${JSON.stringify(changeData)}`;
        pendingChanges.add(changeKey);
        updateRefreshButton();
    }
    
    /**
     * Perform the refresh
     */
    async function performRefresh() {
        if (isRefreshing) return;
        
        isRefreshing = true;
        
        // Update button to show loading state
        const originalContent = refreshButton.innerHTML;
        refreshButton.innerHTML = `
            <svg class="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            Refreshing...
        `;
        refreshButton.disabled = true;
        
        // Add spinning animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            .spin {
                animation: spin 1s linear infinite;
            }
        `;
        document.head.appendChild(style);
        
        try {
            // Use Web Worker for heavy calculations if available
            if (calculationWorker && window.shipConfigurations && window.addedShips) {
                await performMultiThreadedRefresh();
            } else {
                // Fallback to regular update
                if (typeof window.originalUpdateComparisonTable === 'function') {
                    window.originalUpdateComparisonTable();
                }
            }
            
            // Clear pending changes
            pendingChanges.clear();
            updateRefreshButton();
            
        } catch (error) {
            console.error('Error during refresh:', error);
            alert('An error occurred while refreshing the table. Please try again.');
        } finally {
            // Restore button state
            refreshButton.innerHTML = originalContent;
            refreshButton.disabled = false;
            isRefreshing = false;
            
            // Remove the style element
            style.remove();
        }
    }
    
    /**
     * Perform multi-threaded refresh using Web Worker
     */
    function performMultiThreadedRefresh() {
        return new Promise((resolve, reject) => {
            // Prepare data for the worker
            const workerData = {
                ships: window.addedShips,
                configurations: window.shipConfigurations,
                activeIndices: window.activeConfigIndices,
                customAttributes: window.customAttributes || []
            };
            
            // Send data to worker
            calculationWorker.postMessage({
                action: 'calculateModifiedStats',
                data: workerData
            });
            
            // Handle worker response
            calculationWorker.onmessage = function(e) {
                if (e.data.error) {
                    reject(new Error(e.data.error));
                } else {
                    // Apply the calculated results
                    applyCalculatedResults(e.data.results);
                    resolve();
                }
            };
            
            // Handle worker errors
            calculationWorker.onerror = function(error) {
                reject(error);
            };
        });
    }
    
    /**
     * Apply calculated results from the Web Worker
     */
    function applyCalculatedResults(results) {
        // Update the table with the calculated results
        if (typeof window.originalUpdateComparisonTable === 'function') {
            // Temporarily store the results for the update function to use
            window.preCalculatedResults = results;
            window.originalUpdateComparisonTable();
            delete window.preCalculatedResults;
        }
    }
    
    /**
     * Initialize the Web Worker
     */
    function initWebWorker() {
        // Check if we can access the necessary global data
        if (!window.componentAttributes || !window.components) {
            console.warn('Component data not available for Web Worker');
            return;
        }
        
        // Create a blob with the worker code
        const workerCode = `
            // Web Worker for calculating modified stats
            let componentAttributes = ${JSON.stringify(window.componentAttributes || {})};
            let componentsData = ${JSON.stringify(window.components || {})};
            
            self.onmessage = function(e) {
                if (e.data.action === 'calculateModifiedStats') {
                    try {
                        const { ships, configurations, activeIndices } = e.data.data;
                        const results = {};
                        
                        // Calculate modified stats for each ship
                        ships.forEach(ship => {
                            if (!ship || !ship.id) return;
                            
                            const shipId = ship.id;
                            const shipIdentifier = getShipIdentifier(ship);
                            const activeIndex = activeIndices[shipId] || 0;
                            
                            if (configurations[shipIdentifier] && configurations[shipIdentifier][activeIndex]) {
                                const activeConfig = configurations[shipIdentifier][activeIndex];
                                results[shipId] = {
                                    modifiedStats: calculateModifiedStatsWorker(ship, activeConfig.components),
                                    config: activeConfig
                                };
                            }
                        });
                        
                        self.postMessage({ results });
                    } catch (error) {
                        self.postMessage({ error: error.message });
                    }
                }
            };
            
            // Ship identifier function
            function getShipIdentifier(ship) {
                return ship.customShipId || (ship.Manufacturer + '_' + ship['Ship Name']).replace(/\\s+/g, '_').toLowerCase();
            }
            
            // Find component by ID
            function findComponentById(componentId) {
                if (!componentsData || !componentsData.rewardTree) return null;
                
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
                
                if (componentsData.componentsById && componentsData.componentsById[componentId]) {
                    return componentsData.componentsById[componentId];
                }
                
                for (const category of componentsData.rewardTree) {
                    const found = searchInNode(category);
                    if (found) return found;
                }
                
                if (componentsData.allComponents && Array.isArray(componentsData.allComponents)) {
                    const found = componentsData.allComponents.find(c => c.id === componentId);
                    if (found) return found;
                }
                
                return null;
            }
            
            // Helper function to find stat value in tree
            function findStatValueInTree(attributes, component, statName, className, tierName, category) {
                const properties = component.properties || {};
                const path = [];
                
                if (category === "Drones") {
                    const droneName = properties["Drones"] || component.name;
                    if (droneName) {
                        path.push(droneName);
                    }
                }
                
                const propertyPriority = ['Tier', 'Class', 'Firing Cadences', 'Damage Type', 'Manufacturer', 'Ship Component', 'Ship Modules', 'Countermeasure'];
                
                for (const prop of propertyPriority) {
                    if (properties[prop]) {
                        path.push(properties[prop]);
                    }
                }
                
                let currentNode = attributes;
                let currentPath = [];
                
                for (const pathSegment of path) {
                    if (currentNode.subGroups && currentNode.subGroups[pathSegment]) {
                        currentNode = currentNode.subGroups[pathSegment];
                        currentPath.push(pathSegment);
                    } else {
                        break;
                    }
                }
                
                while (true) {
                    if (category === "Drones" && currentPath.length === 0) {
                        if (attributes[statName] && attributes[statName].values && 
                            attributes[statName].values["base"] !== undefined) {
                            return attributes[statName].values["base"];
                        }
                    } else if (currentNode[statName] && currentNode[statName].values) {
                        let key;
                        
                        if (category === "Drones") {
                            key = "base";
                            if (currentNode[statName].values[key] !== undefined) {
                                return currentNode[statName].values[key];
                            }
                        } else {
                            key = className + '-' + tierName;
                            if (currentNode[statName].values[key] !== undefined) {
                                return currentNode[statName].values[key];
                            }
                        }
                    }
                    
                    if (currentPath.length === 0) break;
                    currentPath.pop();
                    
                    currentNode = attributes;
                    for (const pathSegment of currentPath) {
                        if (currentNode.subGroups && currentNode.subGroups[pathSegment]) {
                            currentNode = currentNode.subGroups[pathSegment];
                        }
                    }
                }
                
                return 0;
            }
            
            // Calculate modified stats
            function calculateModifiedStatsWorker(ship, installedComponents) {
                const modifiedStats = Object.assign({}, ship);
                
                if (!installedComponents) {
                    return modifiedStats;
                }
                
                Object.keys(installedComponents).forEach(category => {
                    const components = installedComponents[category];
                    
                    Object.keys(components).forEach(componentType => {
                        const componentIds = Array.isArray(components[componentType]) 
                            ? components[componentType] 
                            : [components[componentType]];
                        
                        componentIds.forEach(componentId => {
                            if (!componentId) return;
                            
                            const component = findComponentById(componentId);
                            if (!component) return;
                            
                            const properties = component.properties || {};
                            let className = properties.Class || '';
                            let tierName = properties.Tier || '';
                            
                            if (!className || !tierName) {
                                if (category !== "Drones") return;
                            }
                            
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
                            
                            if (!groupName) return;
                            
                            if (componentAttributes[category] && 
                                componentAttributes[category][groupName]) {
                                const attributes = componentAttributes[category][groupName];
                                
                                if (category === "Drones") {
                                    const droneName = properties["Drones"] || component.name;
                                    
                                    if (attributes.subGroups && attributes.subGroups[droneName]) {
                                        const droneAttributes = attributes.subGroups[droneName];
                                        
                                        Object.keys(droneAttributes).forEach(statName => {
                                            if (modifiedStats.hasOwnProperty(statName)) {
                                                const valueToAdd = findStatValueInTree(attributes, component, statName, className, tierName, category);
                                                if (valueToAdd !== 0) {
                                                    modifiedStats[statName] += valueToAdd;
                                                }
                                            }
                                        });
                                    }
                                } else {
                                    Object.keys(attributes).forEach(statName => {
                                        if (modifiedStats.hasOwnProperty(statName)) {
                                            const valueToAdd = findStatValueInTree(attributes, component, statName, className, tierName, category);
                                            if (valueToAdd !== 0) {
                                                modifiedStats[statName] += valueToAdd;
                                            }
                                        }
                                    });
                                }
                            }
                        });
                    });
                });
                
                return modifiedStats;
            }
        `;
        
        try {
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            calculationWorker = new Worker(workerUrl);
            console.log('Web Worker initialized successfully');
        } catch (error) {
            console.warn('Web Worker initialization failed:', error);
            // Fall back to single-threaded operation
        }
    }
    
    /**
     * Override the updateComparisonTable function
     */
    function overrideUpdateFunction() {
        // Store the original function
        if (typeof window.updateComparisonTable === 'function') {
            window.originalUpdateComparisonTable = window.updateComparisonTable;
            
            // Replace with our version that adds pending changes
            window.updateComparisonTable = function(changeInfo) {
                // Try to determine what type of change occurred
                let changeType = 'table';
                let changeData = { timestamp: Date.now() };
                
                // If changeInfo is provided, use it
                if (changeInfo) {
                    changeType = changeInfo.type || 'table';
                    changeData = { ...changeData, ...changeInfo };
                }
                
                // Try to infer the change from the call stack
                const stack = new Error().stack;
                if (stack.includes('handleConfigChange')) {
                    changeType = 'config';
                } else if (stack.includes('Component')) {
                    changeType = 'component';
                } else if (stack.includes('Ship')) {
                    changeType = 'ship';
                } else if (stack.includes('Attribute')) {
                    changeType = 'attribute';
                }
                
                // Add the pending change
                addPendingChange(changeType, changeData);
                
                // Log for debugging
                console.log(`Table update requested (${changeType}) - added to pending changes`);
            };
        }
        
        // Also intercept efficientTableUpdate if it exists
        if (typeof window.efficientTableUpdate === 'function') {
            window.originalEfficientTableUpdate = window.efficientTableUpdate;
            
            window.efficientTableUpdate = function(options) {
                const changeType = options && options.shipId ? 'ship-update' : 'table';
                const changeData = { 
                    timestamp: Date.now(),
                    ...options
                };
                
                addPendingChange(changeType, changeData);
                console.log(`Efficient table update requested - added to pending changes`);
            };
        }
    }
    
    /**
     * Re-initialize Web Worker when component data is loaded
     */
    function reinitializeWorker() {
        if (calculationWorker) {
            calculationWorker.terminate();
            calculationWorker = null;
        }
        initWebWorker();
    }
    
    // Expose the module
    window.PendingChangesManager = {
        init: initPendingChanges,
        addPendingChange: addPendingChange,
        performRefresh: performRefresh,
        reinitializeWorker: reinitializeWorker
    };
    
    // Auto-initialize when the DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPendingChanges);
    } else {
        // Delay initialization to ensure other modules are loaded
        setTimeout(initPendingChanges, 100);
    }
    
    // Listen for component data loading events
    window.addEventListener('componentsLoaded', reinitializeWorker);
    window.addEventListener('attributesLoaded', reinitializeWorker);
})(); 