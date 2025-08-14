import React, { useState, useEffect } from 'react';
import GameSimulator from './GameSimulator';
import '../styles/ClaimStakeManager.css';
import ClaimStakeSelector from './ClaimStakeSelector';

const ClaimStakeManager = ({ gameData, onPurchase }) => {
    const [activeView, setActiveView] = useState('selection');
    const [purchasedClaimStakes, setPurchasedClaimStakes] = useState([]);
    const [activeClaimStake, setActiveClaimStake] = useState(null);
    const [availableClaimStakes, setAvailableClaimStakes] = useState([]);
    const [isRunning, setIsRunning] = useState(true); // Track if the simulation is running
    const [timeSpeed, setTimeSpeed] = useState(1); // Track time speed factor
    const [timerSpeed, setTimerSpeed] = useState(1); // Track timer speed factor for construction

    // Update the setPurchasedClaimStakes to also handle building construction
    const handleUpdateClaimStake = (updatedClaimStake, metadata = {}) => {
        console.log('[DEBUG] ClaimStakeManager.handleUpdateClaimStake called with:',
            { id: updatedClaimStake.id, buildingsCount: updatedClaimStake.buildings?.length });
        console.log('[DEBUG] Current buildings:', activeClaimStake?.buildings);
        console.log('[DEBUG] New buildings:', updatedClaimStake.buildings);

        // Important: Clone the updated state to avoid reference issues
        const clonedUpdate = JSON.parse(JSON.stringify(updatedClaimStake));

        // Always create a fresh deep-cloned state to avoid reference issues
        setActiveClaimStake(prevState => {
            if (!prevState) return clonedUpdate;

            // Create a deep clone of the previous state to avoid mutation issues
            const newState = JSON.parse(JSON.stringify(prevState));

            // Ensure buildings array exists and is properly merged
            if (!newState.buildings) newState.buildings = [];

            // Special handling for building construction updates
            if (metadata?.buildingId && metadata?.isConstruction) {
                console.log('[DEBUG] Processing construction event for:', metadata.buildingId);

                // Check if building is already in the array to prevent duplicates
                if (!newState.buildings.includes(metadata.buildingId)) {
                    console.log('[DEBUG] Adding new building to array:', metadata.buildingId);
                    newState.buildings.push(metadata.buildingId);
                }
            }
            // For other non-construction updates, use the entire buildings array from updatedClaimStake if it's not empty
            else if (clonedUpdate.buildings && clonedUpdate.buildings.length > 0) {
                console.log('[DEBUG] Using complete buildings array from update');
                newState.buildings = [...clonedUpdate.buildings];
            }

            // Always copy all other properties from the update
            Object.entries(clonedUpdate).forEach(([key, value]) => {
                if (key !== 'buildings') { // Skip buildings as we've handled it specially above
                    newState[key] = value;
                }
            });

            console.log('[DEBUG] Final buildings array:', newState.buildings);

            // Dispatch an event to notify that the claim stake has been updated
            const updateEvent = new CustomEvent('claimStakeUpdated', {
                detail: {
                    claimStake: newState,
                    metadata: metadata
                }
            });
            window.dispatchEvent(updateEvent);

            return newState;
        });

        // Also update the purchased claim stakes list to ensure consistency
        setPurchasedClaimStakes(prevStakes => {
            return prevStakes.map(stake => {
                if (stake.id === updatedClaimStake.id) {
                    // Clone to avoid reference issues
                    const updatedStake = JSON.parse(JSON.stringify(stake));

                    // Ensure buildings array exists
                    if (!updatedStake.buildings) updatedStake.buildings = [];

                    // For construction updates, ensure the building is added
                    if (metadata?.buildingId && metadata?.isConstruction) {
                        if (!updatedStake.buildings.includes(metadata.buildingId)) {
                            console.log('[DEBUG] Adding building to purchased claim stake:', metadata.buildingId);
                            updatedStake.buildings.push(metadata.buildingId);
                        }
                    }
                    // Otherwise use the complete array from the update
                    else if (clonedUpdate.buildings && clonedUpdate.buildings.length > 0) {
                        updatedStake.buildings = [...clonedUpdate.buildings];
                    }

                    // Copy all other properties
                    Object.entries(clonedUpdate).forEach(([key, value]) => {
                        if (key !== 'buildings') {
                            updatedStake[key] = value;
                        }
                    });

                    return updatedStake;
                }
                return stake;
            });
        });

        // Update debug overlay if it exists
        if (window.updateDebugBuildingsArray) {
            const buildingsArray = updatedClaimStake.buildings || [];
            window.updateDebugBuildingsArray(buildingsArray);
        }
    };

    // Log onPurchase function
    useEffect(() => {
        console.log('ClaimStakeManager - onPurchase prop exists:', !!onPurchase);
        console.log('ClaimStakeManager - onPurchase type:', typeof onPurchase);
    }, [onPurchase]);

    // Add an event listener for game state loading
    useEffect(() => {
        const handleGameStateLoaded = (event) => {
            const { loadedState } = event.detail;
            console.log('Game state loaded, applying to ClaimStakeManager:', loadedState);

            if (!loadedState) return;

            // Apply loaded claim stakes to the game state
            if (loadedState.ownedClaimStakes && loadedState.ownedClaimStakes.length > 0) {
                console.log('Loaded claim stakes:', loadedState.ownedClaimStakes);

                // Update purchased claim stakes
                setPurchasedClaimStakes(loadedState.ownedClaimStakes);

                // Set active claim stake if there is one
                if (loadedState.ownedClaimStakes.length > 0) {
                    const firstStake = loadedState.ownedClaimStakes[0];
                    setActiveClaimStake(firstStake);
                    setActiveView('simulator'); // Switch to simulator view
                }

                // Notify any parent components about the loaded state
                if (onPurchase && typeof onPurchase === 'function') {
                    // For each loaded stake, notify the parent
                    loadedState.ownedClaimStakes.forEach(stake => {
                        console.log('Notifying parent about loaded claim stake:', stake);
                        onPurchase(stake, true); // Pass true as second param to indicate this is from a load
                    });
                }

                // Force a UI refresh
                window.dispatchEvent(new CustomEvent('claimStakeUpdated', {
                    detail: {
                        forceUIRefresh: true,
                        source: 'gameStateLoaded'
                    }
                }));
            }

            // Apply simulation settings
            if (loadedState.timeSpeed !== undefined) {
                setTimeSpeed(loadedState.timeSpeed);
            }

            if (loadedState.isPaused !== undefined) {
                setIsRunning(!loadedState.isPaused);
            }
        };

        window.addEventListener('gameStateLoaded', handleGameStateLoaded);

        return () => {
            window.removeEventListener('gameStateLoaded', handleGameStateLoaded);
        };
    }, [onPurchase]);

    useEffect(() => {
        if (gameData?.claimStakeDefinitions) {
            const stakes = Object.entries(gameData.claimStakeDefinitions).map(([id, definition]) => {

                // Get planet type tag
                let planetTypeTag = null;
                if (id.includes('terrestrial-planet')) {
                    planetTypeTag = 'tag-terrestrial-planet';
                } else if (id.includes('-ice-giant-')) {
                    planetTypeTag = 'tag-ice-giant';
                } else if (id.includes('-gas-giant-')) {
                    planetTypeTag = 'tag-gas-giant';
                } else if (id.includes('-barren-planet-')) {
                    planetTypeTag = 'tag-barren-planet';
                } else if (id.includes('-volcanic-planet-')) {
                    planetTypeTag = 'tag-volcanic-planet';
                } else if (id.includes('-dark-planet-')) {
                    planetTypeTag = 'tag-dark-planet';
                } else if (id.includes('-system-asteroid-belt-') || id.includes('-system-asteroid belt-')) {
                    planetTypeTag = 'tag-system-asteroid-belt';
                }

                // Get faction tag
                let factionTag = null;
                if (id.includes('-oni-')) {
                    factionTag = 'tag-oni';
                } else if (id.includes('-mud-')) {
                    factionTag = 'tag-mud';
                } else if (id.includes('-ustur-')) {
                    factionTag = 'tag-ustur';
                }

                const requiredTags = [planetTypeTag, factionTag].filter(Boolean);

                // Get planet type display name
                let planetType = 'Unknown';
                if (id.includes('terrestrial-planet')) planetType = 'Terrestrial Planet';
                else if (id.includes('ice-giant')) planetType = 'Ice Giant';
                else if (id.includes('gas-giant')) planetType = 'Gas Giant';
                else if (id.includes('barren-planet')) planetType = 'Barren Planet';
                else if (id.includes('volcanic-planet')) planetType = 'Volcanic Planet';
                else if (id.includes('dark-planet')) planetType = 'Dark Planet';
                else if (id.includes('system-asteroid-belt')) planetType = 'System Asteroid Belt';

                return {
                    id,
                    name: definition.name || id.replace('claimStakeDefinition-', '')
                        .split('-')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' '),
                    slots: definition.slots || 0,
                    rentMultiplier: definition.rentMultiplier || 1,
                    hubValue: definition.hubValue || 0,
                    definition: definition,
                    requiredTags: requiredTags,
                    faction: id.match(/(mud|oni|ustur)/i)?.[0].toUpperCase(),
                    planetType: planetType,
                    tier: parseInt(id.match(/t(\d+)/i)?.[1] || '1')
                };
            });
            setAvailableClaimStakes(stakes);
        }
    }, [gameData]);

    // CRITICAL FIX: Listen for direct construction update events
    useEffect(() => {
        if (!activeClaimStake) return;

        const handleForceConstruction = (event) => {
            const { buildingId, cost, timestamp } = event.detail;

            // CRITICAL FIX: Check if this is part of an upgrade operation and if so, block the forced construction
            const baseBuildingType = buildingId.split('-instance-')[0];
            if (window.preventForcedConstruction && window.preventForcedConstruction.has(baseBuildingType)) {
                return;
            }

            // CRITICAL FIX: Check if an upgrade operation is in progress and if so, block the forced construction
            if (window.upgradeOperationsInProgress && window.upgradeOperationsInProgress.size > 0) {
                return;
            }


            if (event.detail && event.detail.items && event.detail.items.length > 0) {
                // ENHANCED: More robust state update approach

                // First, capture the items to ensure we don't lose them
                const constructionItems = [...event.detail.items];

                // Use functional state updates to ensure we're working with the latest state
                setActiveClaimStake(prevState => {

                    // Create a completely new object with fresh arrays
                    const updatedState = {
                        ...prevState,
                        underConstruction: [...constructionItems]
                    };


                    return updatedState;
                });

                // Also update in purchased stakes using functional update
                setPurchasedClaimStakes(prevStakes => {
                    return prevStakes.map(stake => {
                        if (stake.id === activeClaimStake.id) {
                            return {
                                ...stake,
                                underConstruction: [...constructionItems]
                            };
                        }
                        return stake;
                    });
                });

                // Force UI refresh with multiple events
                setTimeout(() => {
                    window.dispatchEvent(new Event('claimStakeUpdated'));
                    window.dispatchEvent(new CustomEvent('buildingConstructionStarted', {
                        detail: { forceRefresh: true }
                    }));

                    // Verify the update happened
                    console.log('⚡️ Verification after construction update:', {
                        hasUnderConstruction: Boolean(activeClaimStake.underConstruction),
                        itemCount: activeClaimStake.underConstruction?.length || 0
                    });
                }, 50);
            }
        };

        // Add event listener
        window.addEventListener('forceBuildingConstruction', handleForceConstruction);

        // Cleanup
        return () => {
            window.removeEventListener('forceBuildingConstruction', handleForceConstruction);
        };
    }, [activeClaimStake]);

    // Dispatch an event when the claim stake state changes
    useEffect(() => {
        if (activeClaimStake) {
            console.log('[DEBUG] ClaimStakeManager: Active claim stake updated, dispatching event');

            // Create a deep clone of the claim stake to avoid reference issues
            const clonedClaimStake = JSON.parse(JSON.stringify(activeClaimStake));

            // Dispatch an event to notify all components of the updated claim stake
            const updateEvent = new CustomEvent('activeClaimStakeUpdated', {
                detail: {
                    claimStake: clonedClaimStake,
                    timestamp: Date.now(),
                    forceUiUpdate: true
                }
            });
            window.dispatchEvent(updateEvent);

            // Also update the debug overlay if it exists
            if (window.updateDebugBuildingsArray && activeClaimStake.buildings) {
                window.updateDebugBuildingsArray(activeClaimStake.buildings);
            }
        }
    }, [activeClaimStake]);

    // Handle changes to simulation settings
    const handleSimulationSettingsChange = (settings) => {
        if ('isRunning' in settings) setIsRunning(settings.isRunning);
        if ('timeSpeed' in settings) setTimeSpeed(settings.timeSpeed);
        if ('timerSpeed' in settings) setTimerSpeed(settings.timerSpeed);
    };

    const handleClaimStakeSelect = (stake) => {
        // Calculate initial resource production from central hub
        const centralHub = gameData.claimStakeBuildings['claimStakeBuilding-central-hub-t1'];
        const initialResourceRates = {};

        if (centralHub.resourceExtractionRate) {
            Object.entries(centralHub.resourceExtractionRate).forEach(([resource, rate]) => {
                initialResourceRates[resource] = rate;
            });
        }

        // Find a matching planet instance for this claim stake type
        const planetInstance = Object.entries(gameData.planets || {}).find(([planetId, planet]) => {
            // Check if this planet has claim stakes that match our stake definition
            return planet.claimStakes && Object.values(planet.claimStakes).some(claimStakeTemplate => {
                return claimStakeTemplate.instance?.claimStakeDefinition === stake.id;
            });
        });

        const planetInstanceId = planetInstance ? planetInstance[0] : null;

        const newClaimStake = {
            id: `${stake.id}-${Date.now()}`,
            planetInstance: planetInstanceId, // Add this crucial property
            definition: {
                ...stake,
                slots: stake.slots,
                rentMultiplier: stake.rentMultiplier,
                hubValue: stake.hubValue,
                ...(gameData.claimStakeDefinitions[stake.id] || {})
            },
            buildings: ['claimStakeBuilding-central-hub-t1'],
            resources: {}, // Start with empty resources
            constructionQueue: [],
            crewAssignments: {
                // Auto-assign crew to central hub
                'claimStakeBuilding-central-hub-t1': centralHub.neededCrew
            },
            status: {
                power: {
                    current: centralHub.power,
                    max: centralHub.power
                },
                resources: initialResourceRates,
                efficiency: 100,
            }
        };

        onPurchase(newClaimStake);
        setActiveClaimStake(newClaimStake);
        setActiveView('simulator');
    };

    // Add a wrapper function to log what the selector sends to App
    const handlePurchaseFromSelector = (claimStakeFromSelector) => {
        console.log('ClaimStakeManager - handlePurchaseFromSelector received:', claimStakeFromSelector);
        console.log('ClaimStakeManager - Claim stake name received:', claimStakeFromSelector.name);
        // Pass it to the App's onPurchase function
        onPurchase(claimStakeFromSelector);
    };

    // For debugging - add control buttons for time and timer speeds
    const renderDebugControls = () => {
        if (process.env.NODE_ENV !== 'development') return null;

        return (
            <div className="debug-controls" style={{
                background: '#333', padding: '8px', borderRadius: '4px', margin: '8px 0',
                display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>Debug Controls</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={() => setIsRunning(!isRunning)}
                        style={{ padding: '4px 8px', background: isRunning ? '#e74c3c' : '#2ecc71', color: 'white', border: 'none', borderRadius: '4px' }}
                    >
                        {isRunning ? 'Pause' : 'Resume'}
                    </button>
                    <div style={{ color: 'white' }}>
                        <label>Time Speed: </label>
                        <select
                            value={timeSpeed}
                            onChange={(e) => setTimeSpeed(Number(e.target.value))}
                            style={{ background: '#555', color: 'white', border: 'none', borderRadius: '4px', padding: '4px' }}
                        >
                            <option value="0.5">0.5x</option>
                            <option value="1">1x</option>
                            <option value="2">2x</option>
                            <option value="5">5x</option>
                            <option value="10">10x</option>
                        </select>
                    </div>
                    <div style={{ color: 'white' }}>
                        <label>Timer Speed: </label>
                        <select
                            value={timerSpeed}
                            onChange={(e) => setTimerSpeed(Number(e.target.value))}
                            style={{ background: '#555', color: 'white', border: 'none', borderRadius: '4px', padding: '4px' }}
                        >
                            <option value="0.5">0.5x</option>
                            <option value="1">1x</option>
                            <option value="2">2x</option>
                            <option value="5">5x</option>
                            <option value="10">10x</option>
                        </select>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="claim-stake-manager">
            {activeView === 'selection' ? (
                <ClaimStakeSelector
                    claimStakes={availableClaimStakes}
                    onSelect={handleClaimStakeSelect}
                    gameData={gameData}
                    onPurchase={handlePurchaseFromSelector}
                />
            ) : (
                <div className="simulator-container">
                    <div className="simulator-header">
                        <button
                            className="return-btn"
                            onClick={() => setActiveView('selection')}
                        >
                            Return to Overview
                        </button>
                        <h2>{activeClaimStake.definition.name}</h2>
                        {renderDebugControls()}
                    </div>
                    <GameSimulator
                        gameData={gameData}
                        initialClaimStake={activeClaimStake}
                        isRunning={isRunning}
                        initialTimeSpeed={timeSpeed}
                        timerSpeed={timerSpeed}
                        onUpdate={(updatedState) => {
                            // Create a minimal update for the claim stake
                            const updatedClaimStake = {
                                id: activeClaimStake.id,
                                ...updatedState
                            };

                            // Send update to the main handler
                            handleUpdateClaimStake(updatedClaimStake);
                        }}
                        onConstructionComplete={(buildingId, claimStakeId) => {
                            // Add the completed building to the claim stake
                            const updatedClaimStake = { ...activeClaimStake };

                            // Make sure we have a buildings array
                            if (!updatedClaimStake.buildings) {
                                updatedClaimStake.buildings = [];
                            }

                            // Add the building ID directly as a string
                            updatedClaimStake.buildings.push(buildingId);

                            // Update the claim stake
                            handleUpdateClaimStake(updatedClaimStake, { buildingId, isConstruction: true });
                        }}
                        onSettingsChange={handleSimulationSettingsChange}
                    />
                </div>
            )}
        </div>
    );
};

export default ClaimStakeManager;