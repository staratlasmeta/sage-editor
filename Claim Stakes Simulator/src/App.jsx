import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameLayout from './components/GameLayout';
import ClaimStakeManager from './components/ClaimStakeManager';
import DataLoader from './components/DataLoader';
import { getGameData, isGameDataLoaded } from './utils/gameDataLoader';
import './styles/App.css';
import './styles/ClaimStakeManager.css';
import './styles/GameSimulator.css';
import ClaimStakeSelector from './components/ClaimStakeSelector';
import GameSimulator from './components/GameSimulator';
import NotificationSystem from './components/NotificationSystem';
import ClaimStakeStatus from './components/ClaimStakeStatus';
import DraggableDebugOverlay from './components/DraggableDebugOverlay';
import AchievementPanel from './components/AchievementPanel';

// Import new services
import CentralizedSimulationService from './services/CentralizedSimulationService.js';
import AchievementService from './services/AchievementService';

// Test that module is loading
const TEST_VALUE = 'APP_MODULE_LOADED';

const App = () => {
    // Add game data loading state
    const [gameDataLoaded, setGameDataLoaded] = useState(false);
    const [dataLoadError, setDataLoadError] = useState(null);

    const [view, setView] = useState('game'); // 'game' or 'purchase'
    const [currentResources, setCurrentResources] = useState({});

    const [productionRates] = useState({});

    const [purchasedClaimStakes, setPurchasedClaimStakes] = useState([]);
    const [activeClaimStake, setActiveClaimStake] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [timeSpeed, setTimeSpeed] = useState(1); // Add time speed state
    const [isPaused, setIsPaused] = useState(false); // Initialize as not paused

    // Add achievement panel state
    const [showAchievementPanel, setShowAchievementPanel] = useState(false);

    // Add state to track available tags for debugging
    const [availableTags, setAvailableTags] = useState([]);

    // ALL useRef hooks must be called unconditionally
    const setGlobalResourcesRef = useRef(null);
    const lastCallbackTime = useRef(null);

    // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS

    // Check if game data is loaded on mount
    useEffect(() => {
        const dataLoaded = isGameDataLoaded();
        //console.log('🔍 App startup - checking game data:', dataLoaded);
        setGameDataLoaded(dataLoaded);
    }, []);

    // Only the assignment can be conditional
    useEffect(() => {
        if (gameDataLoaded) {
            setGlobalResourcesRef.current = setCurrentResources;
        }
    }, [gameDataLoaded, setCurrentResources]);

    // Add callback for centralized simulation service
    useEffect(() => {
        const handleSimulationUpdate = (updatedGameState) => {
            const callbackStartTime = Date.now();
            //console.log(`[App] CentralizedSimulation callback received (Δ${lastCallbackTime.current ? Date.now() - lastCallbackTime.current : 0}ms)`);
            lastCallbackTime.current = Date.now();

            //     console.log('[App] Callback received updatedGameState:', {
            //     hasOwnedClaimStakes: Boolean(updatedGameState.ownedClaimStakes),
            //         ownedClaimStakesType: typeof updatedGameState.ownedClaimStakes,
            //             ownedClaimStakesKeys: Object.keys(updatedGameState.ownedClaimStakes || {}),
            //                 hasGlobalResources: Boolean(updatedGameState.globalResources),
            //                     fullStructure: Object.keys(updatedGameState)
            // });

            // Log biomass for debugging
            if (updatedGameState.ownedClaimStakes) {
                Object.entries(updatedGameState.ownedClaimStakes).forEach(([stakeId, stake]) => {
                    const biomassResource = stake.resources?.['cargo-biomass'];
                    let biomassAmount = 0;
                    if (typeof biomassResource === 'object' && biomassResource.amount !== undefined) {
                        biomassAmount = biomassResource.amount;
                    } else if (typeof biomassResource === 'number') {
                        biomassAmount = biomassResource;
                    }
                    //console.log(`[App] Callback: Stake ${stakeId} has biomass = ${biomassAmount}`);
                });
            }

            // Update state with new game state
            try {
                setPurchasedClaimStakes(Object.values(updatedGameState.ownedClaimStakes || {}));
                setCurrentResources(updatedGameState.globalResources || {});

                //console.log(`[App] Updating ${Object.keys(updatedGameState.ownedClaimStakes || {}).length} claim stakes in state`);

                // Update active claim stake if it exists in the updated data
                if (activeClaimStake) {
                    const updatedActiveStake = updatedGameState.ownedClaimStakes?.[activeClaimStake.id];
                    if (updatedActiveStake) {
                        setActiveClaimStake(updatedActiveStake);
                    }
                }

                //console.log('[App] State updates completed successfully');
            } catch (error) {
                //console.error('[App] Error updating state from simulation callback:', error);
            }
        };

        // Add callback to centralized simulation service
        CentralizedSimulationService.addCallback(handleSimulationUpdate);

        // Cleanup callback on unmount
        return () => {
            CentralizedSimulationService.removeCallback(handleSimulationUpdate);
        };
    }, [activeClaimStake]);

    // Update simulation management effect
    useEffect(() => {
        if (!gameDataLoaded) return;

        //console.log(`[App] Checking CentralizedSimulation status: ${purchasedClaimStakes.length} claim stakes`);

        if (purchasedClaimStakes.length > 0) {
            const gameState = {
                ownedClaimStakes: purchasedClaimStakes.reduce((acc, stake) => {
                    acc[stake.id] = stake;
                    return acc;
                }, {}),
                globalResources: currentResources,
                timeSpeed: timeSpeed,
                isPaused: isPaused
            };

            //     console.log('[App] Starting CentralizedSimulation with game state:', {
            //     claimStakesCount: Object.keys(gameState.ownedClaimStakes).length,
            //         speed: timeSpeed,
            //             isPaused: isPaused
            // });

            CentralizedSimulationService.start(gameState, getGameData());
        } else {
            //console.log('[App] No claim stakes - stopping CentralizedSimulation');
            CentralizedSimulationService.stop();
        }

        // Update speed and pause state
        CentralizedSimulationService.setSpeed(timeSpeed);
        CentralizedSimulationService.setPaused(isPaused);

    }, [purchasedClaimStakes, currentResources, timeSpeed, isPaused]);

    // Listen for achievement unlocks
    useEffect(() => {
        if (!gameDataLoaded) return; // Skip if no game data

        const handleAchievementUnlocked = (event) => {
            const achievement = event.detail;
            addNotification({
                type: 'success',
                title: '🏆 Achievement Unlocked!',
                message: `${achievement.name} (${achievement.tier})`,
                description: achievement.description,
                duration: 8000
            });
        };

        window.addEventListener('achievementUnlocked', handleAchievementUnlocked);

        return () => {
            window.removeEventListener('achievementUnlocked', handleAchievementUnlocked);
        };
    }, [gameDataLoaded]);

    // All other existing useEffect hooks - moved here and made conditional on gameDataLoaded
    const handleUpdateAvailableTags = useCallback((tags) => {
        if (!gameDataLoaded) return;
        setAvailableTags(tags);
    }, [gameDataLoaded]);

    // Continue with other hooks, all made conditional on gameDataLoaded...

    // Add a useEffect to ensure proper updating of GameSimulator when activeClaimStake changes
    useEffect(() => {
        if (!gameDataLoaded) return;
        if (activeClaimStake) {
        }
    }, [gameDataLoaded, activeClaimStake]);

    // Add a useEffect to listen for global resource updates
    useEffect(() => {
        if (!gameDataLoaded) return;

        const handleGlobalResourceUpdate = (e) => {
            if (e.detail && e.detail.resources) {
                //console.log("🌍 App: Updating global resources");

                // Update the global resources state
                setCurrentResources(prev => ({
                    ...prev,
                    ...e.detail.resources
                }));

                // // Log the specific resources that were added
                // if (e.detail.added) {
                //     //console.log("🌍 Global resources added:",
                //         Object.entries(e.detail.added)
                //             .map(([key, val]) => `${key}: ${val}`)
                //             .join(", ")
                //     );
                // }

                // CRITICAL FIX: Also log information about deducted resources
                // if (e.detail.deductedResources) {
                //     //console.log("🌍 Global resources deducted:",
                //         Object.entries(e.detail.deductedResources)
                //             .filter(([_, val]) => val > 0)  // Only show resources that were actually deducted
                //             .map(([key, val]) => `${key}: ${val}`)
                //             .join(", ")
                //     );

                // Special handling for construction resources
                const constructionResources = Object.entries(e.detail.deductedResources)
                    .filter(([key, _]) => key.includes('steel') || key.includes('electronics') || key.includes('aluminum'));

                // if (constructionResources.length > 0) {
                //     //console.log("🏗️ Construction resources deducted, ensuring UI updates are applied");

                //     // Force a specific UI update event for construction resources
                //     window.dispatchEvent(new CustomEvent('constructionResourcesDeducted', {
                //         detail: {
                //             resources: e.detail.resources,
                //             deductedResources: e.detail.deductedResources,
                //             timestamp: Date.now()
                //         }
                //     }));
                // }

            }
        };

        // Listen for global resource updates
        window.addEventListener('globalResourcesUpdated', handleGlobalResourceUpdate);

        // ALSO listen for direct resource deduction events from BuildingService
        window.addEventListener('forceGlobalResourceUpdate', handleGlobalResourceUpdate);

        return () => {
            window.removeEventListener('globalResourcesUpdated', handleGlobalResourceUpdate);
            window.removeEventListener('forceGlobalResourceUpdate', handleGlobalResourceUpdate);
        };
    }, [gameDataLoaded]);

    // Add this near the top of your component, after useState declarations
    useEffect(() => {
        if (!gameDataLoaded) return;

        // Create a global accessor function to allow debug overlay to fetch latest state
        window.getAppState = () => ({
            activeClaimStake: activeClaimStake,
            purchasedClaimStakes: purchasedClaimStakes,
            globalResources: currentResources
        });

        return () => {
            // Clean up
            delete window.getAppState;
        };
    }, [gameDataLoaded, activeClaimStake, purchasedClaimStakes, currentResources]);

    // Functions that depend on game data - can be called conditionally
    const getResourceRichnessForClaimStake = (claimStake, gameData) => {
        if (!gameDataLoaded || !claimStake || !gameData) return {};

        // Combine tags from both requiredTags and tags arrays
        const allTags = [...(claimStake.requiredTags || []), ...(claimStake.tags || [])];

        // Find planet and faction tags
        const planetTags = [
            'tag-terrestrial-planet', 'tag-ice-giant', 'tag-gas-giant',
            'tag-barren-planet', 'tag-volcanic-planet', 'tag-dark-planet',
            'tag-system-asteroid-belt'
        ];
        const factionTags = ['tag-oni', 'tag-mud', 'tag-ustur'];

        const planetTypeTag = allTags.find(tag => planetTags.includes(tag));
        const factionTag = allTags.find(tag => factionTags.includes(tag));

        // Extract from ID if tags not found
        let extractedPlanetTag = '';
        let extractedFactionTag = '';

        if (!planetTypeTag || !factionTag) {
            const id = claimStake.id?.toLowerCase() || '';

            // Extract planet type
            if (id.includes('terrestrial-planet')) extractedPlanetTag = 'tag-terrestrial-planet';
            else if (id.includes('ice-giant')) extractedPlanetTag = 'tag-ice-giant';
            else if (id.includes('gas-giant')) extractedPlanetTag = 'tag-gas-giant';
            else if (id.includes('barren-planet')) extractedPlanetTag = 'tag-barren-planet';
            else if (id.includes('volcanic-planet')) extractedPlanetTag = 'tag-volcanic-planet';
            else if (id.includes('dark-planet')) extractedPlanetTag = 'tag-dark-planet';
            else if (id.includes('system-asteroid-belt')) extractedPlanetTag = 'tag-system-asteroid-belt';

            // Extract faction
            if (id.includes('-oni-')) extractedFactionTag = 'tag-oni';
            else if (id.includes('-mud-')) extractedFactionTag = 'tag-mud';
            else if (id.includes('-ustur-')) extractedFactionTag = 'tag-ustur';
        }

        const finalPlanetTag = planetTypeTag || extractedPlanetTag;
        const finalFactionTag = factionTag || extractedFactionTag;

        if (!finalPlanetTag || !finalFactionTag) return {};

        // Get planet archetypes from game data
        const planetArchetypes = gameData?.planetArchetypes ||
            (gameData?.data && gameData.data.planetArchetypes) || {};

        // Find matching planet archetype
        const planetArchetype = Object.values(planetArchetypes).find(archetype =>
            archetype.tags &&
            archetype.tags.includes(finalPlanetTag) &&
            archetype.tags.includes(finalFactionTag)
        );

        // Return richness data if found
        if (planetArchetype?.richness) {
            return planetArchetype.richness;
        }

        // Fallback for terrestrial planets
        if (finalPlanetTag === 'tag-terrestrial-planet') {
            return {
                'hydrogen': 1,
                'volcanic-ash': 0.8,
                'iron-ore': 0.7,
                'silica': 0.6,
                'biomass': 0.5,
                'carbon': 0.5,
                'graphite': 0.4
            };
        }

        return {};
    };

    // Handle data loading success
    const handleDataLoaded = (data) => {
        //console.log('📊 Data loaded successfully:', data ? 'New data loaded' : 'Data cleared');
        setGameDataLoaded(isGameDataLoaded());
        setDataLoadError(null);

        // Clear any existing game state when new data is loaded
        if (data) {
            setPurchasedClaimStakes([]);
            setActiveClaimStake(null);
            setCurrentResources({});
            setTimeSpeed(1);
            setIsPaused(false);
        }
    };

    // Handle data loading errors
    const handleDataLoadError = (error) => {
        console.error('❌ Data loading error:', error);
        setDataLoadError(error);
        setGameDataLoaded(false);
    };

    // Handle switching back to data loader
    const handleSwitchToDataLoader = () => {
        //console.log('🔄 Switching to data loader...');
        setGameDataLoaded(false);
        // Clear game state when switching back
        setPurchasedClaimStakes([]);
        setActiveClaimStake(null);
        setCurrentResources({});
        setTimeSpeed(1);
        setIsPaused(false);
    };

    // Show DataLoader if no game data is loaded
    if (!gameDataLoaded) {
        return (
            <DataLoader
                onDataLoaded={handleDataLoaded}
                onError={handleDataLoadError}
            />
        );
    }


    const handleClaimStakeSelect = (stake) => {
        setActiveClaimStake(stake);
        setView('game');
    };

    const handlePurchaseClaimStakesClick = () => {
        setView('purchase');
    };



    const handlePurchaseClaimStake = (definitionFromSelector) => {
        // Add detailed logging
        //console.log('App - handlePurchaseClaimStake received:', definitionFromSelector);
        //console.log('App - Raw data type:', typeof definitionFromSelector);
        //console.log('App - Has name property:', definitionFromSelector.hasOwnProperty('name'));
        if (definitionFromSelector.name) {
            //console.log('App - Name property value:', definitionFromSelector.name);
        } else {
            //console.log('App - Name property is falsy or undefined');
        }
        if (definitionFromSelector.definition) {
            //console.log('App - Has definition property with value:', definitionFromSelector.definition);
            //console.log('App - Definition has name:', definitionFromSelector.definition.hasOwnProperty('name'));
        }

        // --- Remove Log ---
        // //console.log("[App handlePurchase] Received definitionFromSelector:", JSON.stringify(definitionFromSelector));
        // --- End Log ---

        // IMPORTANT: Create a deep copy to avoid modifying the original gameData object
        const definition = JSON.parse(JSON.stringify(definitionFromSelector));

        // Extract tier from definition ID using improved regex pattern
        let tier = definition.tier || 1;

        // Try to extract tier from definition ID if it's not already set
        if (!definition.tier && definition.id) {
            // First look for tier in the middle of the ID with dashes on both sides (e.g., "-t2-")
            const midTierMatch = definition.id.match(/[-_]t(\d+)[-_]/i);
            if (midTierMatch && midTierMatch[1]) {
                tier = parseInt(midTierMatch[1]);
                //console.log(`Extracted tier ${tier} from middle of definition ID: ${definition.id}`);
            } else {
                // Check for tier at the end of the ID
                const endTierMatch = definition.id.match(/[-_]t(\d+)$/i);
                if (endTierMatch && endTierMatch[1]) {
                    tier = parseInt(endTierMatch[1]);
                    //console.log(`Extracted tier ${tier} from end of definition ID: ${definition.id}`);
                }
            }
        }

        // Calculate initial fuel based on tier (ensure it's a number)
        const initialFuel = tier * 1000;

        // Ensure the definition object has the correct structure and tags
        const finalDefinition = {
            ...definition,
            tier: tier, // Ensure tier is set
            name: definition.definition?.name || definition.name || 'Unknown Claim Stake', // Use the name from either nested definition or direct property
            requiredTags: definition.definition?.requiredTags || definition.requiredTags || [], // Ensure requiredTags exists, checking both locations
            addedTags: definition.definition?.addedTags || definition.addedTags || [] // Ensure addedTags exists, checking both locations
        };

        // //console.log('App - finalDefinition created:', finalDefinition);
        // //console.log('App - finalDefinition.name:', finalDefinition.name);
        // //console.log('App - finalDefinition.requiredTags:', finalDefinition.requiredTags);
        // //console.log('App - finalDefinition.addedTags:', finalDefinition.addedTags);

        // First ensure game is not paused - this needs to happen BEFORE the claim stake is created
        setIsPaused(false);

        // Build newClaimStake with proper resource initialization
        const finalClaimStakeId = `${finalDefinition.id}-${Date.now()}`;
        const planetInstanceId = finalDefinition.planetInstance || `planetInstance-${finalDefinition.id}`;
        const extractedTier = tier;

        // CRITICAL FIX: Ensure the planet instance exists in game data
        const gameData = getGameData();
        if (gameData && !gameData.planets) {
            gameData.planets = {};
        }

        // Create the planet instance if it doesn't exist
        if (gameData && !gameData.planets[planetInstanceId]) {
            // Find the appropriate planet archetype for this claim stake
            const planetArchetype = Object.values(gameData.planetArchetypes || {}).find(archetype => {
                if (!archetype.tags) return false;

                // Match terrestrial planet and faction tags based on claim stake
                const hasTerrPlanet = archetype.tags.includes('tag-terrestrial-planet');
                const hasOniFaction = archetype.tags.includes('tag-oni');

                return hasTerrPlanet && hasOniFaction;
            });

            if (planetArchetype) {
                // Create the planet instance in the game data
                gameData.planets[planetInstanceId] = {
                    name: `Planet for ${finalDefinition.name}`,
                    description: `Planet instance for ${finalDefinition.name}`,
                    planetArchetype: Object.keys(gameData.planetArchetypes).find(key =>
                        gameData.planetArchetypes[key] === planetArchetype
                    ),
                    starbaseLevel: 6, // Default to max level
                    claimStakes: {}
                };

                //  //console.log(`[App] Created planet instance: ${planetInstanceId} with archetype: ${planetArchetype.name}`);
            }
        }

        const newClaimStake = {
            id: finalClaimStakeId,
            definitionId: finalDefinition.id,
            planetInstance: planetInstanceId,
            definition: finalDefinition.definition,
            tier: extractedTier,
            // Copy tags and properties from the definition
            tags: finalDefinition.tags || [],
            requiredTags: finalDefinition.requiredTags || [],
            addedTags: finalDefinition.addedTags || [],
            // Copy buildings array from the definition if it exists, otherwise start with Central Hub T1
            buildings: finalDefinition.buildings && finalDefinition.buildings.length > 0
                ? [...finalDefinition.buildings]
                : ['claimStakeBuilding-central-hub-t1'],
            // CRITICAL FIX: Initialize resources with proper structure instead of empty object
            resources: {},
            power: {
                current: 0,
                max: 0,
                fuelStatus: 100,
                operational: true
            }
        };

        // Initialize resources based on planet archetype to avoid race conditions
        if (gameData?.planetArchetypes && gameData?.claimStakeBuildings) {
            // Use the planet archetype we already found above
            const planetInstance = gameData.planets[planetInstanceId];
            const planetArchetype = planetInstance ?
                gameData.planetArchetypes[planetInstance.planetArchetype] :
                Object.values(gameData.planetArchetypes).find(archetype => {
                    if (!archetype.tags) return false;

                    // Match terrestrial planet and faction tags
                    const hasTerrPlanet = archetype.tags.includes('tag-terrestrial-planet');
                    const hasOniFaction = archetype.tags.includes('tag-oni');

                    return hasTerrPlanet && hasOniFaction;
                });

            if (planetArchetype && planetArchetype.richness) {
                // Initialize resources with richness > 0 to have proper structure
                Object.entries(planetArchetype.richness).forEach(([resourceId, richness]) => {
                    if (richness > 0) {
                        newClaimStake.resources[resourceId] = {
                            amount: 0,
                            rate: 0,
                            storage: 1000 // Default storage
                        };
                    }
                });

                // //console.log(`[App] Initialized ${Object.keys(newClaimStake.resources).length} resources based on planet archetype: ${planetArchetype.name}`);
            }

            // Always ensure fuel is initialized
            if (!newClaimStake.resources['cargo-fuel']) {
                newClaimStake.resources['cargo-fuel'] = {
                    amount: tier * 1000, // Initial fuel based on tier
                    rate: 0,
                    storage: 5000
                };
            }
        }

        // //console.log('App - newClaimStake created:', newClaimStake);
        // //console.log('App - newClaimStake.definition.name:', newClaimStake.definition.name);

        // Use functional updates to ensure state consistency
        setPurchasedClaimStakes(prev => {
            const newStakes = [...prev, newClaimStake];
            // //console.log('App - setPurchasedClaimStakes - Current stakes:', prev);
            // //console.log('App - setPurchasedClaimStakes - Adding new stake:', newClaimStake);
            // //console.log('App - setPurchasedClaimStakes - New stake definition.name:', newClaimStake.definition.name);
            // //console.log('App - setPurchasedClaimStakes - New stakes array:', newStakes);
            return newStakes;
        });

        // Explicitly set as active claim stake using the same object reference
        setActiveClaimStake(newClaimStake);
        // //console.log('App - setActiveClaimStake - Setting active claim stake:', newClaimStake);
        // //console.log('App - setActiveClaimStake - Active claim stake definition.name:', newClaimStake.definition.name);

        // Make sure game isn't paused when new claim stake is created - set again to ensure the value sticks
        setIsPaused(false);

        // Set view to game to show the simulator
        setView('game');

        // Force a state refresh to ensure isPaused is definitely false
        setTimeout(() => {
            if (isPaused) {
                setIsPaused(false);
            }
        }, 100);
    };

    // Handle time speed change
    const handleTimeSpeedChange = (speed) => {
        setTimeSpeed(speed);
        CentralizedSimulationService.setSpeed(speed);
    };

    // Handle pause toggle - ensure it actually toggles
    const handlePauseToggle = () => {
        setIsPaused(prevPaused => {
            const newState = !prevPaused;
            if (newState) {
                CentralizedSimulationService.setPaused(true);
            } else {
                CentralizedSimulationService.setPaused(false);
            }
            return newState;
        });
    };

    // Notification functions
    const addNotification = (notification) => {
        const id = Date.now().toString();
        setNotifications(prev => [...prev, {
            id,
            timestamp: Date.now(),
            ...notification
        }]);
        return id;
    };

    const dismissNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleUpdateClaimStake = (updatedClaimStake) => {
        if (!updatedClaimStake || !updatedClaimStake.id) {
            console.warn("Invalid update - missing ID");
            return;
        }

        // Check for special flags
        const isReceiveResourcesUpdate = updatedClaimStake.__receiveResourcesUpdate === true;
        const isHighPriority = updatedClaimStake.__priority === 'high';
        const forceUIRefresh = updatedClaimStake.__forceUIRefresh === true;
        const isTierUpdate = updatedClaimStake.__updateTierOnly === true;

        // Use a ref to track the last update time for each claim stake to prevent too frequent updates
        const now = Date.now();
        const lastUpdateTime = lastCallbackTime.current || 0;
        const minUpdateInterval = isHighPriority ? 0 : 100; // Throttle regular updates

        // Skip non-high-priority updates if they happen too frequently
        if (!isHighPriority && now - lastUpdateTime < minUpdateInterval) {
            return;
        }

        // Update the last update time
        lastCallbackTime.current = now;

        // Special handling for tier updates
        if (isTierUpdate && updatedClaimStake.tier) {
            // //console.log(`📊 Updating tier information for claim stake ${updatedClaimStake.id} to tier ${updatedClaimStake.tier}`);
        }

        // For high priority updates (especially from "Receive Resources"), process immediately
        if (isHighPriority && isReceiveResourcesUpdate) {
            // //console.log("⚡ Processing high-priority resource update");

            // Immediately update active claim stake for instant UI feedback
            if (activeClaimStake && activeClaimStake.id === updatedClaimStake.id) {
                // Create a new reference to force React to update all components
                const updatedActiveStake = {
                    ...activeClaimStake,
                    resources: {
                        ...activeClaimStake.resources,
                        ...updatedClaimStake.resources
                    }
                };

                // Log any special resource updates for debugging
                const specialResources = ['cargo-steel', 'cargo-electronics', 'cargo-refined-metal', 'cargo-circuits'];
                const updatedSpecial = specialResources.filter(r =>
                    updatedClaimStake.resources &&
                    updatedClaimStake.resources[r] !== undefined
                );

                if (updatedSpecial.length > 0) {
                    // //console.log("🔍 App: Special resources updated:",
                    //     updatedSpecial.map(r =>
                    //         `${r}: ${updatedClaimStake.resources[r]} (was: ${activeClaimStake.resources?.[r] || 0})`
                    //     ).join(", ")
                    // );
                }

                // Set the active claim stake with requestAnimationFrame to avoid render loops
                requestAnimationFrame(() => {
                    setActiveClaimStake(updatedActiveStake);
                });

                // Also emit a global event to ensure all components are notified
                if (forceUIRefresh) {
                    window.dispatchEvent(new CustomEvent('forceResourceRefresh', {
                        detail: {
                            claimStakeId: updatedClaimStake.id,
                            resources: updatedActiveStake.resources,
                            specialResources: updatedSpecial.length > 0 ?
                                updatedSpecial.reduce((acc, r) => ({
                                    ...acc,
                                    [r]: updatedClaimStake.resources[r]
                                }), {}) : null,
                            timestamp: Date.now()
                        }
                    }));
                }
            }
        }

        // Use requestAnimationFrame to update purchased claim stakes to avoid render loops
        requestAnimationFrame(() => {
            setPurchasedClaimStakes(prevStakes => {
                // Find the stake to update
                const stakeIndex = prevStakes.findIndex(stake => stake.id === updatedClaimStake.id);

                if (stakeIndex === -1) {
                    console.warn(`Claim stake with ID ${updatedClaimStake.id} not found`);
                    return prevStakes;
                }

                // Get the existing stake
                const existingStake = prevStakes[stakeIndex];

                // Create the updated stake with properly merged state
                const updatedStake = {
                    ...existingStake,
                    // Preserve tier information if it's being updated
                    tier: updatedClaimStake.tier || existingStake.tier,
                    // --- Explicitly preserve the definition --- 
                    definition: existingStake.definition,
                    // --- End definition preservation --- 
                    // Merge resources by creating a new object that preserves all existing resources
                    // and only updates the ones that have changed
                    resources: updatedClaimStake.resources
                        ? {
                            ...existingStake.resources,
                            ...updatedClaimStake.resources
                        }
                        : existingStake.resources,
                    status: {
                        ...existingStake.status,
                        ...updatedClaimStake.status,
                        resources: {
                            ...(existingStake.status?.resources || {}),
                            ...(updatedClaimStake.status?.resources || {})
                        },
                        power: {
                            ...(existingStake.status?.power || {}),
                            ...(updatedClaimStake.status?.power || {})
                        }
                    }
                };

                // If underConstruction changed, update it
                if (updatedClaimStake.underConstruction) {
                    // Make sure we're always working with an array
                    if (Array.isArray(updatedClaimStake.underConstruction)) {
                        // Do a deep copy of the construction items to avoid reference issues
                        updatedStake.underConstruction = updatedClaimStake.underConstruction.map(item => ({ ...item }));

                        // if (process.env.NODE_ENV === 'development') {
                        //     //console.log(`🚧 Updated underConstruction array with ${updatedStake.underConstruction.length} items`);
                        // }
                    } else {
                        // If not an array, initialize it as empty array for safety
                        console.warn("underConstruction property is not an array:", updatedClaimStake.underConstruction);
                        updatedStake.underConstruction = [];
                    }
                }

                // If buildings changed, update them
                if (updatedClaimStake.buildings) {
                    updatedStake.buildings = updatedClaimStake.buildings;

                    // Add this line to update the debug overlay
                    window.dispatchEvent(new CustomEvent('updateDebugBuildingsArray', {
                        detail: {
                            buildings: updatedStake.buildings,
                            source: 'App.updateClaimStake'
                        }
                    }));
                }

                // Create a new array with the updated stake
                const newStakes = [...prevStakes];
                newStakes[stakeIndex] = updatedStake;

                // If this is the active claim stake, determine if we need to update the reference
                // to avoid triggering unnecessary rerenders and timer restarts
                if (activeClaimStake && activeClaimStake.id === updatedStake.id) {
                    // Check for significant changes that warrant a full reference update
                    const hasSignificantChange =
                        updatedClaimStake.buildings ||  // Building changes are significant
                        updatedClaimStake.underConstruction ||  // Construction changes are significant
                        isReceiveResourcesUpdate;  // "Receive Resources" updates are always significant

                    // For resource updates, only trigger a reference update if there are major changes
                    const hasImportantResourceChanges =
                        !isReceiveResourcesUpdate &&  // Skip this check for "Receive Resources" updates (already handled)
                        updatedClaimStake.resources &&
                        Object.keys(updatedClaimStake.resources).some(key => {
                            const oldValue = activeClaimStake.resources?.[key] || 0;
                            const newValue = updatedClaimStake.resources[key] || 0;
                            // Consider large changes (like "Receive Resources" button) significant
                            return Math.abs(newValue - oldValue) > 5;
                        });

                    if (hasSignificantChange || hasImportantResourceChanges) {
                        // Use requestAnimationFrame to batch updates better - but we're already inside one,
                        // so just set the state directly but use a functional update
                        setActiveClaimStake(current => {
                            if (current && current.id === updatedStake.id) {
                                return updatedStake;
                            }
                            return current;
                        });
                    } else {
                        // IMPORTANT CHANGE: Instead of directly mutating activeClaimStake, create a new
                        // state update that only updates the necessary fields, which is safer for React
                        if (updatedClaimStake.resources || updatedClaimStake.status) {
                            // Use a minimal update with just the changed properties
                            setActiveClaimStake(current => {
                                if (!current || current.id !== updatedStake.id) return current;

                                const result = { ...current };

                                // Only update resources if needed
                                if (updatedClaimStake.resources) {
                                    result.resources = {
                                        ...current.resources,
                                        ...updatedClaimStake.resources
                                    };
                                }

                                // Only update status if needed
                                if (updatedClaimStake.status) {
                                    result.status = {
                                        ...current.status,
                                        ...updatedClaimStake.status,
                                        // Add nested status fields if needed
                                        resources: {
                                            ...(current.status?.resources || {}),
                                            ...(updatedClaimStake.status?.resources || {})
                                        },
                                        power: {
                                            ...(current.status?.power || {}),
                                            ...(updatedClaimStake.status?.power || {})
                                        }
                                    };
                                }

                                return result;
                            });
                        }
                    }
                }

                return newStakes;
            });
        });
    };

    const handleNotificationAction = (notificationId, actionId) => {
        const notification = notifications.find(n => n.id === notificationId);
        if (!notification) return;

        // Handle fuel resupply action
        if (actionId === 'resupply-fuel' && notification.claimStakeId) {
            const claimStake = purchasedClaimStakes.find(cs => cs.id === notification.claimStakeId);
            if (claimStake) {
                const tier = claimStake.definition.tier || 1;
                const resupplyAmount = tier * 1000;

                const updatedStake = {
                    ...claimStake,
                    resources: {
                        ...(claimStake.resources || {}),
                        'cargo-fuel': {
                            ...(claimStake.resources?.['cargo-fuel'] || {}),
                            amount: (claimStake.resources?.['cargo-fuel']?.amount || 0) + resupplyAmount,
                            storage: 1000 // Default storage capacity
                        }
                    },
                    status: {
                        ...(claimStake.status || {}),
                        power: {
                            ...(claimStake.status?.power || {}),
                            fuelStatus: 100,
                            operational: true
                        }
                    }
                };

                handleUpdateClaimStake(updatedStake);
            }
        }

        // Remove the notification
        dismissNotification(notificationId);
    };


    // Achievement panel handler
    const handleOpenAchievements = () => {
        setShowAchievementPanel(true);
    };

    const handleCloseAchievements = () => {
        setShowAchievementPanel(false);
    };

    return (
        <>
            <GameLayout
                currentResources={currentResources}
                productionRates={productionRates}
                purchasedClaimStakes={purchasedClaimStakes}
                onClaimStakeSelect={handleClaimStakeSelect}
                onPurchaseClaimStakesClick={handlePurchaseClaimStakesClick}
                onUpdateClaimStake={handleUpdateClaimStake}
                addNotification={addNotification}
                timeSpeed={timeSpeed}
                isPaused={isPaused}
                onTimeSpeedChange={handleTimeSpeedChange}
                onPauseToggle={handlePauseToggle}
                gameData={getGameData()}
                onOpenAchievements={handleOpenAchievements}
                onSwitchToDataLoader={handleSwitchToDataLoader}
            >
                <div className={`game-content ${activeClaimStake ? 'full-width' : ''}`}>
                    {/* Debug info - Now using DraggableDebugOverlay component */}
                    {/* Temporarily disabled due to resource structure changes
                    {process.env.NODE_ENV === 'development' && (
                        <DraggableDebugOverlay
                            purchasedClaimStakes={purchasedClaimStakes}
                            activeClaimStake={activeClaimStake}
                            isPaused={isPaused}
                            timeSpeed={timeSpeed}
                            claimStake={activeClaimStake}
                            globalResources={currentResources}
                            availableTags={availableTags}
                            resourceRichness={activeClaimStake?.resourceRichness || getResourceRichnessForClaimStake(activeClaimStake, getGameData())}
                            onMount={() => {
                                // Add a global function to get the current resource richness
                                window.getResourceRichness = () => {
                                    return activeClaimStake?.resourceRichness || getResourceRichnessForClaimStake(activeClaimStake, getGameData()) || {};
                                };
                            }}
                        />
                    )}
                    */}

                    {view === 'purchase' ? (
                        <ClaimStakeManager
                            gameData={getGameData()}
                            onPurchase={handlePurchaseClaimStake}
                        />
                    ) : (
                        activeClaimStake ? (
                            <GameSimulator
                                gameData={getGameData()}
                                initialClaimStake={activeClaimStake}
                                onUpdate={(updatedState) => {
                                    // Create a minimal update for the claim stake
                                    const updatedClaimStake = {
                                        id: activeClaimStake.id,
                                        ...updatedState
                                    };

                                    // Send update to the main handler
                                    handleUpdateClaimStake(updatedClaimStake);
                                }}
                                isRunning={!isPaused} // Simplified - only depends on isPaused state
                                initialTimeSpeed={timeSpeed} // Pass the time speed
                                globalResources={currentResources} // Pass the global resources
                                onUpdateAvailableTags={handleUpdateAvailableTags} // Pass the tag update handler
                                onConstructionComplete={(buildingId, claimStakeId) => {
                                    // //console.log(`🏢 Construction completed: ${buildingId} in claim stake ${claimStakeId}`);

                                    // Ensure buildingId is a string
                                    if (!buildingId || typeof buildingId !== 'string') {
                                        console.error('onConstructionComplete: buildingId must be a string, received:', typeof buildingId, buildingId);
                                        return;
                                    }

                                    // Add the completed building to the claim stake
                                    const updatedClaimStake = { ...activeClaimStake };

                                    // Make sure we have a buildings array
                                    if (!updatedClaimStake.buildings) {
                                        updatedClaimStake.buildings = [];
                                    }

                                    // Add the new building as a string ID (not an object)
                                    // This ensures compatibility with the rest of the system
                                    updatedClaimStake.buildings.push(buildingId);

                                    // Update the claim stake
                                    handleUpdateClaimStake(updatedClaimStake);

                                    // Use a unique ID with a random component to avoid duplicates 
                                    const notificationId = `construction-complete-${buildingId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                                    // Check if we've already sent a notification for this building recently
                                    const recentNotificationKey = `recent-notification-${buildingId}`;
                                    if (window[recentNotificationKey]) {
                                        //console.log('Skipping duplicate notification for recently completed building');
                                        return;
                                    }

                                    // Set a flag to prevent duplicate notifications for the same building
                                    window[recentNotificationKey] = true;
                                    setTimeout(() => {
                                        window[recentNotificationKey] = false;
                                    }, 1000); // Clear the flag after 1 second

                                    // Create a standard auto-dismissing notification for construction completion
                                    window.dispatchEvent(new CustomEvent('showNotification', {
                                        detail: {
                                            id: notificationId,
                                            title: 'Construction Complete',
                                            message: `${buildingId.replace(/claimStakeBuilding-|-t\d+|-instance-\d+/g, ' ').trim()} has been constructed.`,
                                            type: 'success',
                                            timestamp: Date.now(),
                                            // Don't set persistent - allow auto-dismiss after 5 seconds
                                            buildingId: buildingId
                                        }
                                    }));
                                }}
                            />
                        ) : (
                            <div className="empty-state-message" style={{
                                padding: "20px",
                                textAlign: "center",
                                color: "white",
                                background: "#2D2D2D",
                                borderRadius: "8px",
                                margin: "50px auto",
                                maxWidth: "500px"
                            }}>
                                <h2>No Active Claim Stake</h2>
                                <p>Please purchase or select a claim stake to begin simulation.</p>
                                <button
                                    onClick={handlePurchaseClaimStakesClick}
                                    style={{
                                        padding: "10px 20px",
                                        background: "#3A86FF",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        marginTop: "15px",
                                        cursor: "pointer"
                                    }}
                                >
                                    Purchase Claim Stakes
                                </button>
                            </div>
                        )
                    )}
                </div>
            </GameLayout>

            <NotificationSystem
                notifications={notifications}
                onDismiss={dismissNotification}
                onAction={handleNotificationAction}
            />

            {/* Achievement Panel */}
            <AchievementPanel
                isOpen={showAchievementPanel}
                onClose={handleCloseAchievements}
                gameState={{
                    ownedClaimStakes: purchasedClaimStakes.reduce((acc, stake) => {
                        acc[stake.id] = stake;
                        return acc;
                    }, {}),
                    globalResources: currentResources
                }}
            />
        </>
    );
};

export default App; 