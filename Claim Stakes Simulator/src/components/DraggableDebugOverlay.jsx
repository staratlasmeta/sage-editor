import React, { useState, useRef, useEffect, useCallback } from 'react';

const DraggableDebugOverlay = ({
    purchasedClaimStakes,
    activeClaimStake,
    isPaused,
    timeSpeed,
    claimStake,
    globalResources,
    availableTags,
    resourceRichness,
    onMount
}) => {
    const [position, setPosition] = useState({ x: window.innerWidth - 310, y: 70 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [lastConstructionEvent, setLastConstructionEvent] = useState(null);
    const [forceUpdate, setForceUpdate] = useState(0);
    const overlayRef = useRef(null);
    const lastUpdateRef = useRef(Date.now());

    // Add a more robust debug state with default values
    const [debugInfo, setDebugInfo] = useState({
        moduleInstanceCounts: {},
        lastConstructionAttempt: null,
        resourceState: {},
        buildingsArray: [],
        claimStakeId: null,
        tags: []
    });

    // Add a state to track the latest claimStake object
    const [latestClaimStake, setLatestClaimStake] = useState(null);

    // Add state to track resource richness data
    const [richnessData, setRichnessData] = useState(resourceRichness || {});

    // Define getLatestBuildingsArray here, before any useEffect hooks that use it
    const getLatestBuildingsArray = useCallback(() => {
        // Try to get from window.getAppState first (most accurate)
        if (window.getAppState && typeof window.getAppState === 'function') {
            const appState = window.getAppState();
            if (appState?.activeClaimStake?.buildings) {
                return [...appState.activeClaimStake.buildings];
            }
        }

        // Fall back to props
        if (activeClaimStake?.buildings) {
            return [...activeClaimStake.buildings];
        }

        if (claimStake?.buildings) {
            return [...claimStake.buildings];
        }

        // Last resort - return empty array
        return [];
    }, [activeClaimStake, claimStake]);

    // Function to handle building events and force update
    const handleBuildingEvent = useCallback((event) => {
        lastUpdateRef.current = Date.now();
        setForceUpdate(Date.now());
        
        // For construction attempt events specifically
        if (event.type === 'constructionAttempted') {
            // Use setTimeout to avoid React warnings about updating during render
            setTimeout(() => {
                setDebugInfo(prevState => ({
                    ...prevState,
                    lastConstructionAttempt: event.detail
                }));
            }, 0);
        }
        
        // For claim stake update events
        if (event.type === 'claimStakeUpdated' && event.detail?.claimStake) {
            const updatedClaimStake = event.detail.claimStake;
            setLatestClaimStake(updatedClaimStake);
            
            // Update modules count
            const counts = {};
            if (updatedClaimStake.buildings && Array.isArray(updatedClaimStake.buildings)) {
                updatedClaimStake.buildings.forEach(buildingId => {
                    if (!buildingId) return;
                    const baseId = buildingId.replace(/-instance-\d+$/, '');
                    counts[baseId] = (counts[baseId] || 0) + 1;
                });
                
                // Use setTimeout to avoid React warnings
                setTimeout(() => {
                    setDebugInfo(prevState => ({
                        ...prevState,
                        moduleInstanceCounts: counts,
                        buildingsArray: [...updatedClaimStake.buildings],
                        claimStakeId: updatedClaimStake.id,
                        tags: updatedClaimStake.definition?.addedTags || []
                    }));
                }, 0);
            }
        }
    }, []);

    // MAJOR FIX: Actually update the buildings array from the claim stake whenever it changes
    useEffect(() => {
        // Determine which claim stake to use (prefer activeClaimStake if available)
        const currentClaimStake = activeClaimStake || claimStake;

        if (currentClaimStake) {
            // Store the latest claim stake for reference
            setLatestClaimStake(currentClaimStake);

            // Extract buildings array from claim stake
            const buildings = currentClaimStake.buildings || [];

            // Update debug info with all current data
            setDebugInfo(prevState => ({
                ...prevState,
                claimStakeId: currentClaimStake.id,
                buildingsArray: [...buildings], // Use spread to ensure a new array reference
                resourceState: {
                    ...(currentClaimStake.resources || {}),
                    globalResources: globalResources || {}
                }
            }));
        }
    }, [activeClaimStake, claimStake, globalResources, forceUpdate]);

    // Function to update richness data from claimStake
    const updateRichnessData = useCallback(() => {
        // If there's a resourceRichness object on the claimStake, use it directly
        if (claimStake?.resourceRichness) {
            setRichnessData(claimStake.resourceRichness);
            return;
        }

        // Extract planet type from claimStake
        let planetType = '';
        let factionType = '';

        // Extract data from claimStake id if available
        if (claimStake?.id) {
            // Determine planet type
            if (claimStake.id.includes('terrestrial-planet')) planetType = 'terrestrial-planet';
            else if (claimStake.id.includes('ice-giant')) planetType = 'ice-giant';
            else if (claimStake.id.includes('gas-giant')) planetType = 'gas-giant';
            else if (claimStake.id.includes('barren-planet')) planetType = 'barren-planet';
            else if (claimStake.id.includes('volcanic-planet')) planetType = 'volcanic-planet';
            else if (claimStake.id.includes('dark-planet')) planetType = 'dark-planet';
            else if (claimStake.id.includes('system-asteroid-belt')) planetType = 'system-asteroid-belt';

            // Determine faction
            if (claimStake.id.includes('-oni-')) factionType = 'oni';
            else if (claimStake.id.includes('-mud-')) factionType = 'mud';
            else if (claimStake.id.includes('-ustur-')) factionType = 'ustur';
        }

        // Try to get planet archetype from window if available
        if (window.getAppState && typeof window.getAppState === 'function') {
            const appState = window.getAppState();
            const richness = appState?.resourceRichness || appState?.activeClaimStake?.resourceRichness || {};
            setRichnessData(richness);
        }
    }, [claimStake]);

    // Update richness data when claimStake changes
    useEffect(() => {
        updateRichnessData();
    }, [claimStake, updateRichnessData]);

    // Update the richness data when the prop changes
    useEffect(() => {
        if (resourceRichness && Object.keys(resourceRichness).length > 0) {
            console.log('Setting richness data from prop:', resourceRichness);
            setRichnessData(resourceRichness);
        } else {
            // Try to get richness data from window if available
            if (window.getResourceRichness && typeof window.getResourceRichness === 'function') {
                const richness = window.getResourceRichness();
                console.log('Got richness data from window function:', richness);
                if (richness && Object.keys(richness).length > 0) {
                    setRichnessData(richness);
                    return;
                }
            }
            
            // Fallback to using the updateRichnessData function
            updateRichnessData();
        }
    }, [resourceRichness, updateRichnessData]);

    // Call onMount when the component mounts
    useEffect(() => {
        if (onMount && typeof onMount === 'function') {
            onMount();
        }
    }, [onMount]);

    // Add listeners for all building-related events
    useEffect(() => {
        // Register handlers for all relevant events
        window.addEventListener('buildingAddedToClaimStake', handleBuildingEvent);
        window.addEventListener('moduleUpgradeStarted', handleBuildingEvent);
        window.addEventListener('moduleUpgradeCompleted', handleBuildingEvent);
        window.addEventListener('forceDebugUpdate', handleBuildingEvent);
        window.addEventListener('claimStakeUpdated', handleBuildingEvent);
        window.addEventListener('constructionAttempted', handleBuildingEvent);

        // Add a special handler for direct building array updates
        window.addEventListener('updateDebugBuildingsArray', (event) => {
            if (event.detail && Array.isArray(event.detail.buildings)) {
                // Use setTimeout to avoid the "setState during render" React warning
                setTimeout(() => {
                    setDebugInfo(prevState => ({
                        ...prevState,
                        buildingsArray: [...event.detail.buildings]
                    }));
                }, 0);
            }
        });

        return () => {
            // Clean up all listeners
            window.removeEventListener('buildingAddedToClaimStake', handleBuildingEvent);
            window.removeEventListener('moduleUpgradeStarted', handleBuildingEvent);
            window.removeEventListener('moduleUpgradeCompleted', handleBuildingEvent);
            window.removeEventListener('forceDebugUpdate', handleBuildingEvent);
            window.removeEventListener('claimStakeUpdated', handleBuildingEvent);
            window.removeEventListener('constructionAttempted', handleBuildingEvent);
            window.removeEventListener('updateDebugBuildingsArray', handleBuildingEvent);
        };
    }, [handleBuildingEvent]);

    // Update debug info when props change
    useEffect(() => {
        const latestBuildings = getLatestBuildingsArray();
        const latestClaimStakeId = claimStake?.id || activeClaimStake?.id || null;
        
        // Only update if we have new data or forced update
        const now = Date.now();
        if (now - lastUpdateRef.current > 1000 || forceUpdate > 0) {
            setDebugInfo(prev => ({
                ...prev,
                buildingsArray: latestBuildings,
                claimStakeId: latestClaimStakeId,
                // Add available tags to debug info
                tags: availableTags || [],
            }));
            lastUpdateRef.current = now;
        }
    }, [claimStake, activeClaimStake, forceUpdate, availableTags]);

    // Handle mouse down on the overlay header
    const handleMouseDown = useCallback((e) => {
        if (e.target.closest('.debug-overlay-header') && !e.target.closest('.toggle-button')) {
            setIsDragging(true);
            const rect = overlayRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    }, []);

    // Handle mouse move to update position while dragging
    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;

        // Calculate new position with bounds checking
        const newX = Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragOffset.y));

        // Update position state
        setPosition({ x: newX, y: newY });
    }, [isDragging, dragOffset]);

    // Handle mouse up to stop dragging
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Toggle collapsed state
    const toggleCollapsed = useCallback((e) => {
        e.stopPropagation();
        setIsCollapsed(!isCollapsed);
    }, [isCollapsed]);

    // ENHANCEMENT: Track construction events for debugging
    useEffect(() => {
        const handleConstructionEvent = (e) => {
            setLastConstructionEvent({
                timestamp: Date.now(),
                type: e.type,
                detail: e.detail || 'No details',
                received: new Date().toLocaleTimeString()
            });
        };

        // Listen for all construction-related events
        window.addEventListener('buildingConstructionStarted', handleConstructionEvent);
        window.addEventListener('forceBuildingConstruction', handleConstructionEvent);
        window.addEventListener('claimStakeUpdated', handleConstructionEvent);

        return () => {
            window.removeEventListener('buildingConstructionStarted', handleConstructionEvent);
            window.removeEventListener('forceBuildingConstruction', handleConstructionEvent);
            window.removeEventListener('claimStakeUpdated', handleConstructionEvent);
        };
    }, []);

    // Add and remove event listeners
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // Force update timer to ensure construction progress is refreshed regularly
    useEffect(() => {
        if (!isPaused) {
            // Update more frequently for higher time speeds
            const updateInterval = timeSpeed > 1 ? 250 : 1000;

            const intervalId = setInterval(() => {
                const now = Date.now();
                // Only update if enough time has passed (to prevent too many updates)
                if (now - lastUpdateRef.current >= updateInterval) {
                    lastUpdateRef.current = now;
                    // Use a function to update state to ensure we're not causing infinite loops
                    setForceUpdate(prev => {
                        // Only increment if the value would actually change
                        return prev === now ? prev : now;
                    });
                }
            }, updateInterval);

            return () => clearInterval(intervalId);
        }
    }, [isPaused, timeSpeed]);

    // Listen for timer update events
    useEffect(() => {
        const handleTimerUpdate = () => {
            setForceUpdate(prev => prev + 1);
        };

        window.addEventListener('gameTickTimerUpdate', handleTimerUpdate);
        window.addEventListener('constructionTimerTick', handleTimerUpdate);

        return () => {
            window.removeEventListener('gameTickTimerUpdate', handleTimerUpdate);
            window.removeEventListener('constructionTimerTick', handleTimerUpdate);
        };
    }, []);

    // Listen for module construction events
    useEffect(() => {
        const handleModuleConstruction = (e) => {
            const { buildingId } = e.detail;
            setDebugInfo(prev => ({
                ...prev,
                lastConstructionAttempt: {
                    buildingId,
                    timestamp: Date.now(),
                    success: true
                }
            }));
        };

        const handleResourceUpdate = (e) => {
            setDebugInfo(prev => ({
                ...prev,
                resourceState: e.detail.resources || {}
            }));
        };

        window.addEventListener('buildingAddedToClaimStake', handleModuleConstruction);
        window.addEventListener('globalResourcesUpdated', handleResourceUpdate);

        return () => {
            window.removeEventListener('buildingAddedToClaimStake', handleModuleConstruction);
            window.removeEventListener('globalResourcesUpdated', handleResourceUpdate);
        };
    }, []);

    // Modified updateBuildingsInfo implementation to prevent infinite update loops
    useEffect(() => {
        // Function to properly count module instances and update debug information
        const updateBuildingsInfo = () => {
            if (!claimStake || !claimStake.buildings) {
                return;
            }

            // Force-convert buildings to an array if it's not already
            const buildings = Array.isArray(claimStake.buildings) ? claimStake.buildings : [];

            // Calculate module counts with proper tier tracking
            const moduleCounts = {};
            buildings.forEach(bid => {
                // Skip non-string items
                if (typeof bid !== 'string') {
                    return;
                }

                // Extract the basic building type (removing instance ID)
                let baseId = bid;
                if (baseId.includes('-instance-')) {
                    baseId = baseId.split('-instance-')[0];
                }

                // Add to the counts
                moduleCounts[baseId] = (moduleCounts[baseId] || 0) + 1;
            });

            // Use a reducer pattern to avoid unnecessary state updates
            setDebugInfo(prevInfo => {
                // Check if any values have actually changed before updating
                const hasChanges =
                    prevInfo.buildingsCount !== buildings.length ||
                    JSON.stringify(prevInfo.moduleInstanceCounts) !== JSON.stringify(moduleCounts) ||
                    (claimStake.resources && JSON.stringify(prevInfo.resourceState) !== JSON.stringify(claimStake.resources));

                // Only update if something has actually changed
                if (hasChanges) {
                    return {
                        ...prevInfo,
                        moduleInstanceCounts: moduleCounts,
                        resourceState: claimStake.resources || {},
                        buildingsArray: buildings,
                        buildingsCount: buildings.length
                    };
                }

                // Return previous state if nothing changed
                return prevInfo;
            });
        };

        // Run the update function immediately
        updateBuildingsInfo();

        // Set up event listeners for building changes - but don't call updateBuildingsInfo directly
        const handleBuildingChange = () => {
            // Use requestAnimationFrame to throttle updates
            requestAnimationFrame(() => {
                updateBuildingsInfo();
            });
        };

        // Add multiple event listeners to catch any possible building updates
        window.addEventListener('buildingConstructionStarted', handleBuildingChange);
        window.addEventListener('buildingConstructionCompleted', handleBuildingChange);
        window.addEventListener('moduleUpgradeStarted', handleBuildingChange);
        window.addEventListener('claimStakeUpdated', handleBuildingChange);

        // Remove the globalResourcesUpdated listener as it's likely causing loops
        // Instead, use a polling interval that's slower
        const pollingInterval = setInterval(() => {
            requestAnimationFrame(updateBuildingsInfo);
        }, 2000);

        return () => {
            // Clean up event listeners
            window.removeEventListener('buildingConstructionStarted', handleBuildingChange);
            window.removeEventListener('buildingConstructionCompleted', handleBuildingChange);
            window.removeEventListener('moduleUpgradeStarted', handleBuildingChange);
            window.removeEventListener('claimStakeUpdated', handleBuildingChange);
            clearInterval(pollingInterval);
        };
    }, [claimStake, setDebugInfo]); // Added setDebugInfo to the dependency array

    // Add to the useEffect in DraggableDebugOverlay
    useEffect(() => {
        const handleClaimStakeUpdate = (e) => {
            if (claimStake?.buildings) {
            }
        };

        window.addEventListener('claimStakeUpdated', handleClaimStakeUpdate);

        return () => {
            window.removeEventListener('claimStakeUpdated', handleClaimStakeUpdate);
        };
    }, [claimStake]);

    // Keep the debug overlay in sync with building updates
    useEffect(() => {
        // Register a global function to allow direct updates to the buildings array
        window.updateDebugBuildingsArray = (buildings) => {
            if (Array.isArray(buildings)) {
                console.log('[DEBUG] Debug Overlay: Updating buildings array:', buildings);
                setDebugInfo(prevState => ({
                    ...prevState,
                    buildingsArray: buildings
                }));
            }
        };
        
        // Listen for claim stake updates
        const handleClaimStakeUpdate = (e) => {
            if (e.detail?.claimStake?.buildings) {
                console.log('[DEBUG] Debug Overlay: Received claim stake update with buildings:', 
                    e.detail.claimStake.buildings);
                setDebugInfo(prevState => ({
                    ...prevState,
                    buildingsArray: e.detail.claimStake.buildings
                }));
            }
        };
        
        // Listen for direct building array updates
        const handleBuildingArrayUpdate = (e) => {
            if (e.detail?.buildings) {
                console.log('[DEBUG] Debug Overlay: Received building array update:', e.detail.buildings);
                setDebugInfo(prevState => ({
                    ...prevState,
                    buildingsArray: e.detail.buildings
                }));
            }
        };
        
        window.addEventListener('activeClaimStakeUpdated', handleClaimStakeUpdate);
        window.addEventListener('buildingsArrayUpdated', handleBuildingArrayUpdate);
        window.addEventListener('constructionCompleted', handleBuildingArrayUpdate);
        
        return () => {
            window.removeEventListener('activeClaimStakeUpdated', handleClaimStakeUpdate);
            window.removeEventListener('buildingsArrayUpdated', handleBuildingArrayUpdate);
            window.removeEventListener('constructionCompleted', handleBuildingArrayUpdate);
            delete window.updateDebugBuildingsArray;
        };
    }, []);

    // Format time remaining in a readable format
    const formatTimeRemaining = (timeRemaining, startTime, endTime) => {
        // If we have absolute timestamps, calculate remaining time directly
        if (startTime && endTime) {
            const now = Date.now();
            const remainingMs = Math.max(0, endTime - now);
            timeRemaining = remainingMs / 1000; // Convert to seconds
        }

        if (!timeRemaining && timeRemaining !== 0) return "Unknown";

        if (timeRemaining <= 0) {
            return "Complete!";
        } else if (timeRemaining < 60) {
            return `${Math.round(timeRemaining)}s`;
        } else if (timeRemaining < 3600) {
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = Math.round(timeRemaining % 60);
            return `${minutes}m ${seconds}s`;
        } else {
            const hours = Math.floor(timeRemaining / 3600);
            const minutes = Math.floor((timeRemaining % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    };

    // Calculate the construction information
    const constructionInfo = activeClaimStake?.underConstruction || [];
    const constructionCount = constructionInfo.length;

    // Style for the section headers
    const sectionHeaderStyle = {
        fontSize: '11px',
        fontWeight: 'bold',
        borderBottom: '1px solid #555',
        marginTop: '8px',
        marginBottom: '4px',
        paddingBottom: '2px'
    };

    // Add an interval to periodically refresh the buildings array
    useEffect(() => {
        // Every 2 seconds, refresh the buildings array
        const refreshInterval = setInterval(() => {
            const latestBuildings = getLatestBuildingsArray();

            // Only update if buildings have changed
            if (JSON.stringify(latestBuildings) !== JSON.stringify(debugInfo.buildingsArray)) {
                setDebugInfo(prevState => ({
                    ...prevState,
                    buildingsArray: latestBuildings
                }));
            }
        }, 2000);

        return () => clearInterval(refreshInterval);
    }, [activeClaimStake, claimStake, debugInfo.buildingsArray, getLatestBuildingsArray]);

    return (
        <div
            ref={overlayRef}
            className="debug-overlay"
            style={{
                position: 'fixed',
                top: position.y,
                left: position.x,
                width: '300px',
                maxHeight: isCollapsed ? '30px' : '80vh',
                overflowY: isCollapsed ? 'hidden' : 'auto',
                background: 'rgba(0, 0, 0, 0.85)',
                color: 'white',
                border: '1px solid #444',
                borderRadius: '5px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
                zIndex: 10000,
                transition: 'max-height 0.3s ease, opacity 0.3s ease',
                opacity: 0.9,
                padding: '10px',
                fontFamily: 'monospace',
                fontSize: '12px'
            }}
            onMouseDown={handleMouseDown}
        >
            <div className="debug-overlay-header" style={sectionHeaderStyle}>
                <span>Debug Info {isCollapsed ? '' : `(${purchasedClaimStakes.length} Stakes)`}</span>
                <button
                    className="toggle-button"
                    onClick={toggleCollapsed}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '0',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {isCollapsed ? '▼' : '▲'}
                </button>
            </div>

            <div style={{ display: isCollapsed ? 'none' : 'block', padding: '5px 0', lineHeight: '1.4' }}>
                {/* General Information */}
                <div style={sectionHeaderStyle}>General Info</div>
                Stakes: {purchasedClaimStakes.length}<br />
                Active: {activeClaimStake?.definition?.name ||
                    (activeClaimStake?.definition ?
                        JSON.stringify(activeClaimStake.definition).substring(0, 30) + '...'
                        : 'None')}<br />
                Active ID: {activeClaimStake?.id || 'None'}<br />
                Resources: {activeClaimStake ?
                    Object.keys(activeClaimStake.resources || {}).length :
                    'N/A'}<br />
                Fuel: {activeClaimStake?.resources?.['cargo-fuel']?.toFixed(1) || 'N/A'}<br />
                Paused: {isPaused ? 'Yes' : 'No'}<br />
                Speed: {timeSpeed}x<br />

                {/* Add Debug Action Buttons */}
                <div style={sectionHeaderStyle}>Debug Actions</div>
                <div style={{ display: 'flex', gap: '5px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => {
                            // Force a construction update directly
                            const constructionObject = {
                                buildingId: 'claimStakeBuilding-extraction-hub-t1',
                                id: 'claimStakeBuilding-extraction-hub-t1',
                                type: 'extraction',
                                isUpgrade: false,
                                startTime: Date.now(),
                                endTime: Date.now() + 60000, // 60 seconds
                                constructionTime: 60,
                                timeRemaining: 60
                            };


                            // Dispatch a direct construction event
                            window.dispatchEvent(new CustomEvent('forceBuildingConstruction', {
                                detail: {
                                    timestamp: Date.now(),
                                    items: [constructionObject],
                                    buildingId: constructionObject.buildingId,
                                    type: constructionObject.type,
                                    constructionTime: constructionObject.constructionTime,
                                    timeRemaining: constructionObject.timeRemaining,
                                    startTime: constructionObject.startTime,
                                    endTime: constructionObject.endTime
                                }
                            }));

                            // Update the last event
                            setLastConstructionEvent({
                                timestamp: Date.now(),
                                type: 'Debug Force Construction',
                                detail: constructionObject,
                                received: new Date().toLocaleTimeString()
                            });
                        }}
                        style={{
                            background: '#FF5722',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            padding: '3px 6px',
                            fontSize: '9px',
                            cursor: 'pointer'
                        }}
                    >
                        🛠️ Force Construction
                    </button>

                    <button
                        onClick={() => {
                            // This button directly checks the claimStake state and then
                            // creates an alternate event to try to fix any missing underConstruction array
                            console.log('🔧 Debug - Checking claim stake state:', {
                                hasClaimStake: Boolean(activeClaimStake),
                                hasUnderConstruction: Boolean(activeClaimStake?.underConstruction),
                                isArray: Array.isArray(activeClaimStake?.underConstruction),
                                count: activeClaimStake?.underConstruction?.length || 0
                            });

                            // Create a special "state fix" event
                            window.dispatchEvent(new CustomEvent('fixClaimStakeState', {
                                detail: {
                                    timestamp: Date.now(),
                                    action: 'fix_underConstruction_array'
                                }
                            }));

                            // Also dispatch a more standard event for components that listen to it
                            window.dispatchEvent(new CustomEvent('claimStakeUpdated', {
                                detail: {
                                    force: true,
                                    requestFix: true
                                }
                            }));

                            // Update the last event
                            setLastConstructionEvent({
                                timestamp: Date.now(),
                                type: 'Debug Fix State',
                                detail: 'Attempted to fix claim stake state',
                                received: new Date().toLocaleTimeString()
                            });
                        }}
                        style={{
                            background: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            padding: '3px 6px',
                            fontSize: '9px',
                            cursor: 'pointer'
                        }}
                    >
                        🔧 Fix State
                    </button>

                    <button
                        onClick={() => {
                            // Send a new event type specifically to restore from backup
                            console.log('🔄 Debug - Requesting construction state restore from backup');

                            window.dispatchEvent(new CustomEvent('restoreConstructionFromBackup', {
                                detail: {
                                    timestamp: Date.now(),
                                    highPriority: true
                                }
                            }));

                            // Also try to force a refresh of the DOM-based construction items
                            window.dispatchEvent(new CustomEvent('forceDOMConstructionScan', {
                                detail: {
                                    timestamp: Date.now()
                                }
                            }));

                            // Update the last event
                            setLastConstructionEvent({
                                timestamp: Date.now(),
                                type: 'Restore From Backup',
                                detail: 'Attempting to restore construction state from backup reference',
                                received: new Date().toLocaleTimeString()
                            });
                        }}
                        style={{
                            background: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            padding: '3px 6px',
                            fontSize: '9px',
                            cursor: 'pointer'
                        }}
                    >
                        🔄 Restore Backup
                    </button>

                    <button
                        onClick={() => {
                            console.log('🕒 Forcing timer update (-10s)');
                            setLastConstructionEvent({
                                type: 'timer-update',
                                timestamp: new Date().toLocaleTimeString(),
                                details: 'Forced 10s timer reduction'
                            });
                            window.dispatchEvent(new CustomEvent('forceTimerUpdate', {
                                detail: {
                                    deltaTime: 10.0, // Reduce by 10 seconds
                                    source: 'DebugOverlay',
                                    timestamp: Date.now()
                                }
                            }));
                        }}
                        style={{
                            background: '#FF9800',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            padding: '3px 6px',
                            fontSize: '9px',
                            cursor: 'pointer'
                        }}
                    >
                        ⏱️ Update Timer (-10s)
                    </button>
                </div>

                {/* Last Construction Event */}
                <div style={sectionHeaderStyle}>Last Construction Event</div>
                {lastConstructionEvent ? (
                    <div style={{ fontSize: '9px', marginBottom: '5px' }}>
                        Type: {lastConstructionEvent.type}<br />
                        Time: {lastConstructionEvent.received}<br />
                        Detail: {typeof lastConstructionEvent.detail === 'object'
                            ? JSON.stringify(lastConstructionEvent.detail).substring(0, 50) + '...'
                            : lastConstructionEvent.detail}
                    </div>
                ) : (
                    <div style={{ color: '#AAA', fontStyle: 'italic' }}>No events detected</div>
                )}

                {/* Construction Information */}
                <div style={sectionHeaderStyle}>Construction ({constructionCount})</div>
                {constructionCount > 0 ? (
                    <div style={{ marginLeft: '5px' }}>
                        {constructionInfo.map((item, index) => (
                            <div key={index} style={{ marginBottom: '8px', fontSize: '9px' }}>
                                <span style={{ fontWeight: 'bold' }}>
                                    {item.buildingId.replace('claimStakeBuilding-', '')}
                                </span>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Time: {formatTimeRemaining(item.timeRemaining, item.startTime, item.endTime)}</span>
                                    <span style={{
                                        color:
                                            item.timeRemaining <= 0 ? '#4CAF50' :
                                                item.timeRemaining < 30 ? '#FFC107' : '#FFFFFF'
                                    }}>
                                        {item.timeRemaining <= 0 ? 'Complete!' : (
                                            timeSpeed > 1 ? `Building (${timeSpeed}x)...` : 'Building...'
                                        )}
                                    </span>
                                </div>
                                <div style={{
                                    height: '5px',
                                    background: '#444',
                                    borderRadius: '2px',
                                    marginTop: '2px',
                                    overflow: 'hidden',
                                    position: 'relative'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${(() => {
                                            // Calculate progress based on timestamps
                                            if (item.startTime && item.endTime) {
                                                const now = Date.now();
                                                const total = item.endTime - item.startTime;
                                                const elapsed = now - item.startTime;
                                                return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
                                            }
                                            // Fallbacks if timestamps aren't available
                                            else if (item.progress !== undefined) {
                                                return Math.min(100, Math.max(0, item.progress));
                                            }
                                            else if (item.originalTime && item.timeRemaining) {
                                                return Math.min(100, Math.max(0, Math.round((item.originalTime - item.timeRemaining) / item.originalTime * 100)));
                                            }
                                            else if (item.constructionTime && item.timeRemaining) {
                                                return Math.min(100, Math.max(0, Math.round((item.constructionTime - item.timeRemaining) / item.constructionTime * 100)));
                                            }
                                            return 0;
                                        })()}%`,
                                        background: '#3A86FF',
                                        transition: timeSpeed === 1 ? 'width 1s linear' : 'width 0.2s ease-out'
                                    }} />
                                    <div style={{
                                        position: 'absolute',
                                        top: '0',
                                        right: '0',
                                        bottom: '0',
                                        left: '0',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        fontSize: '7px',
                                        color: '#FFF',
                                        fontWeight: 'bold',
                                        textShadow: '0 0 2px rgba(0,0,0,0.7)'
                                    }}>
                                        {(() => {
                                            // Use the same calculation logic as for the width to keep consistency
                                            if (item.startTime && item.endTime) {
                                                const now = Date.now();
                                                const total = item.endTime - item.startTime;
                                                const elapsed = now - item.startTime;
                                                return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
                                            }
                                            else if (item.progress !== undefined) {
                                                return Math.min(100, Math.max(0, item.progress));
                                            }
                                            else if (item.originalTime && item.timeRemaining) {
                                                return Math.min(100, Math.max(0, Math.round((item.originalTime - item.timeRemaining) / item.originalTime * 100)));
                                            }
                                            else if (item.constructionTime && item.timeRemaining) {
                                                return Math.min(100, Math.max(0, Math.round((item.constructionTime - item.timeRemaining) / item.constructionTime * 100)));
                                            }
                                            return 0;
                                        })()}%
                                    </div>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '8px',
                                    color: '#999',
                                    marginTop: '2px'
                                }}>
                                    <span>Start: {new Date(item.startTime).toLocaleTimeString()}</span>
                                    <span>End: {new Date(item.endTime || (item.startTime + (item.constructionTime || 60) * 1000)).toLocaleTimeString()}</span>
                                </div>
                                <div style={{
                                    fontSize: '7px',
                                    color: '#666',
                                    marginTop: '2px'
                                }}>
                                    Original: {item.originalTime ? `${item.originalTime.toFixed(1)}s` : 'N/A'} |
                                    Construction Time: {item.constructionTime || 'N/A'} |
                                    Time Remaining: {formatTimeRemaining(item.timeRemaining, item.startTime, item.endTime)} |
                                    Now: {new Date().toLocaleTimeString()} |
                                    Progress: {(() => {
                                        if (item.startTime && item.endTime) {
                                            const now = Date.now();
                                            const total = item.endTime - item.startTime;
                                            const elapsed = now - item.startTime;
                                            return `${Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))}%`;
                                        }
                                        return item.progress ? `${item.progress}%` : 'N/A';
                                    })()}
                                </div>
                                {/* Timer mechanism indicator */}
                                <div style={{
                                    fontSize: '7px',
                                    color: timeSpeed === 1 ? '#4CAF50' : '#FF9800',
                                    marginTop: '2px',
                                    fontStyle: 'italic'
                                }}>
                                    Timer updated via: {timeSpeed === 1 ? 'Fixed Interval (1s)' : `Animation Frame (${timeSpeed}x)`} |
                                    Elapsed: {timeSpeed > 0 ? `${((Date.now() - item.startTime) / 1000).toFixed(1)}s` : 'Paused'}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : lastConstructionEvent && lastConstructionEvent.type.includes('Construction') ? (
                    <div style={{ color: '#FFA500', fontStyle: 'italic' }}>
                        Construction event received but not in state!
                        <div style={{ fontSize: '8px', marginTop: '2px' }}>Event at {lastConstructionEvent.received}</div>
                    </div>
                ) : (
                    <div style={{ color: '#AAA', fontStyle: 'italic' }}>No active construction</div>
                )}

                <div style={{ fontSize: '8px', color: '#666', marginTop: '10px', textAlign: 'right' }}>
                    Last Update: {new Date().toLocaleTimeString()}
                </div>

                {/* Debug Information */}
                <div style={sectionHeaderStyle}>Debug Information</div>
                <div className="debug-section">
                    <h4>Module Instance Counts ({Object.keys(debugInfo.moduleInstanceCounts || {}).length} types)</h4>
                    <pre style={{ maxHeight: '150px', overflow: 'auto' }}>
                        {JSON.stringify(debugInfo.moduleInstanceCounts || {}, null, 2) || "{}"}
                    </pre>
                </div>

                <div className="debug-section">
                    <h4>Last Construction Attempt</h4>
                    <pre style={{ maxHeight: '100px', overflow: 'auto' }}>
                        {JSON.stringify(debugInfo.lastConstructionAttempt || {}, null, 2) || "No construction attempts"}
                    </pre>
                </div>

                <div className="debug-section">
                    <h4>Resource State</h4>
                    <pre style={{ maxHeight: '100px', overflow: 'auto' }}>
                        {JSON.stringify(debugInfo.resourceState || {}, null, 2) || "{}"}
                    </pre>
                </div>

                <div className="debug-section">
                    <h4>Buildings Array ({(debugInfo.buildingsArray || []).length} items)</h4>
                    <pre style={{ maxHeight: '200px', overflow: 'auto' }}>
                        {JSON.stringify(debugInfo.buildingsArray || [], null, 2) || "[]"}
                    </pre>
                </div>

                <div className="debug-section">
                    <h4>Available Tags ({(debugInfo.tags || []).length} items)</h4>
                    <pre style={{ maxHeight: '200px', overflow: 'auto' }}>
                        {JSON.stringify(debugInfo.tags || [], null, 2) || "[]"}
                    </pre>
                </div>

                <div className="debug-section">
                    <h4>Resource Richness Data</h4>
                    <pre style={{ maxHeight: '200px', overflow: 'auto' }}>
                        {JSON.stringify(richnessData || {}, null, 2) || "{}"}
                    </pre>
                </div>

                <div style={{ fontSize: '8px', color: '#666', marginTop: '5px', textAlign: 'right' }}>
                    Claim Stake ID: {debugInfo.claimStakeId || 'None'} | Last Update: {new Date().toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
};

export default DraggableDebugOverlay; 