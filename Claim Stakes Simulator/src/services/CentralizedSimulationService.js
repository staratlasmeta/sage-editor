/**
 * CentralizedSimulationService - Single source of truth for all game simulation
 * Handles: Timer, Resource Generation, Building Operations, Power Dependencies, Storage
 */

class CentralizedSimulationService {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.gameState = null;
        this.gameData = null;
        this.callbacks = [];
        this.timeSpeed = 1;
        this.isPaused = false;
        this.lastUpdateTime = Date.now();
        this.accumulatedTime = 0;

        //console.log('🎮 CentralizedSimulationService: Initialized');
    }

    // Start the simulation with game state and data
    start(gameState, gameData) {
        //console.log('🎮 CentralizedSimulationService: Starting with game data:', gameData ? 'Present' : 'Missing');

        if (this.isRunning) {
            //console.log('🎮 CentralizedSimulationService: Already running, restarting...');
            this.stop();
        }

        this.gameState = gameState;
        this.gameData = gameData;

        // Debug game data structure
        if (gameData) {
            //console.log('🎮 CentralizedSimulationService: Game data keys:', Object.keys(gameData));

            // The gameData should already be the inner data object, not wrapped
            if (gameData.claimStakeBuildings) {
                //console.log('🎮 CentralizedSimulationService: Found', Object.keys(gameData.claimStakeBuildings).length, 'building definitions');
                // Show first few building IDs
                const buildingIds = Object.keys(gameData.claimStakeBuildings).slice(0, 5);
                //console.log('🎮 CentralizedSimulationService: Sample building IDs:', buildingIds);
            } else if (gameData.data && gameData.data.claimStakeBuildings) {
                // Fallback for wrapped data structure
                //console.log('🎮 CentralizedSimulationService: Found', Object.keys(gameData.data.claimStakeBuildings).length, 'building definitions (nested)');
                const buildingIds = Object.keys(gameData.data.claimStakeBuildings).slice(0, 5);
                //console.log('🎮 CentralizedSimulationService: Sample building IDs:', buildingIds);
            } else {
                //console.warn('🎮 CentralizedSimulationService: No claimStakeBuildings found in game data');
                //console.warn('🎮 Available keys:', Object.keys(gameData));
            }
        } else {
            //console.error('🎮 CentralizedSimulationService: No game data provided!');
        }

        this.isRunning = true;
        this.intervalId = setInterval(() => this.update(), 1000);

        //console.log('🎮 CentralizedSimulationService: Started successfully');
        //console.log('🎮 Game state:', gameState);
    }

    // Stop the simulation
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        //console.log('🎮 CentralizedSimulationService: Stopped');
    }

    // Set simulation speed
    setSpeed(speed) {
        this.timeSpeed = speed;
        //console.log(`🎮 CentralizedSimulationService: Speed set to ${speed}x`);
    }

    // Pause/resume simulation
    setPaused(paused) {
        this.isPaused = paused;
        if (!paused) {
            this.lastUpdateTime = Date.now(); // Reset timer to prevent large delta
        }
        //console.log(`🎮 CentralizedSimulationService: ${paused ? 'Paused' : 'Resumed'}`);
    }

    // Add callback for game state updates
    addCallback(callback) {
        this.callbacks.push(callback);
    }

    // Remove callback
    removeCallback(callback) {
        this.callbacks = this.callbacks.filter(cb => cb !== callback);
    }

    // Main update loop
    update() {
        const now = Date.now();
        const deltaTimeMs = now - this.lastUpdateTime;
        this.lastUpdateTime = now;

        // Calculate effective game time based on speed
        const gameTimeSeconds = (deltaTimeMs / 1000) * this.timeSpeed;
        this.accumulatedTime += gameTimeSeconds;

        //console.log(`[CentralizedSim] Update: deltaMs=${deltaTimeMs}ms, speed=${this.timeSpeed}x, gameTime=${gameTimeSeconds.toFixed(3)}s`);

        // Process all claim stakes
        const updatedClaimStakes = {};
        let hasChanges = false;

        for (const [claimStakeId, claimStake] of Object.entries(this.gameState.ownedClaimStakes || {})) {
            const updatedClaimStake = this.processClaimStake(claimStake, gameTimeSeconds);
            updatedClaimStakes[claimStakeId] = updatedClaimStake;

            // Check if anything changed
            if (this.hasClaimStakeChanged(claimStake, updatedClaimStake)) {
                hasChanges = true;
            }
        }

        // Update global resources
        const updatedGlobalResources = this.calculateGlobalResources(updatedClaimStakes);

        // If there are changes, notify callbacks
        if (hasChanges) {
            const updatedGameState = {
                ...this.gameState,
                ownedClaimStakes: updatedClaimStakes,
                globalResources: updatedGlobalResources,
                lastUpdateTime: now,
                accumulatedTime: this.accumulatedTime
            };

            this.gameState = updatedGameState;
            this.notifyCallbacks(updatedGameState);
        }
    }

    // Process a single claim stake
    processClaimStake(claimStake, deltaTime) {
        //console.log(`[CentralizedSim] Processing claim stake: ${claimStake.id}`);

        // Get planet archetype for richness values
        const planetArchetype = this.getPlanetArchetype(claimStake);
        if (!planetArchetype) {
            //console.warn(`[CentralizedSim] No planet archetype found for claim stake: ${claimStake.id}`);
            return claimStake;
        }

        // Calculate building states (operational/shutdown based on power and resources)
        const buildingStates = this.calculateBuildingStates(claimStake);

        // Calculate resource rates for all operational buildings
        const resourceRates = this.calculateResourceRates(claimStake, planetArchetype, buildingStates);

        // Update resource amounts based on rates and delta time
        const updatedResources = this.updateResources(claimStake.resources, resourceRates, deltaTime);

        // Calculate power stats
        const powerStats = this.calculatePowerStats(claimStake, buildingStates);

        // Calculate crew stats
        const crewStats = this.calculateCrewStats(claimStake);

        // Calculate storage stats
        const storageStats = this.calculateStorageStats(claimStake);

        return {
            ...claimStake,
            resources: updatedResources,
            buildingStates: buildingStates,
            powerStats: powerStats,
            crewStats: crewStats,
            storageStats: storageStats,
            lastResourceRates: resourceRates,
            lastUpdateTime: Date.now()
        };
    }

    // Get planet archetype for a claim stake
    getPlanetArchetype(claimStake) {
        // Check multiple possible data paths
        const planetArchetypes = this.gameData?.planetArchetypes ||
            this.gameData?.data?.planetArchetypes ||
            {};

        if (!planetArchetypes || Object.keys(planetArchetypes).length === 0) {
            console.warn('[CentralizedSim] No planetArchetypes in game data');
            console.warn('[CentralizedSim] Game data structure:', {
                hasDirectArchetypes: Boolean(this.gameData?.planetArchetypes),
                hasNestedArchetypes: Boolean(this.gameData?.data?.planetArchetypes),
                dataKeys: this.gameData ? Object.keys(this.gameData) : 'none',
                archetypeCount: Object.keys(planetArchetypes).length
            });
            return null;
        }

        //console.log(`[CentralizedSim] Looking for planet archetype for claim stake: ${claimStake.id}`);
        //console.log(`[CentralizedSim] Claim stake tags:`, claimStake.tags);
        //console.log(`[CentralizedSim] Claim stake requiredTags:`, claimStake.requiredTags);
        //console.log(`[CentralizedSim] Available archetypes:`, Object.keys(planetArchetypes));

        // Get tags from multiple sources
        const allTags = [
            ...(claimStake.tags || []),
            ...(claimStake.requiredTags || []),
            ...(claimStake.definition?.requiredTags || []),
            ...(claimStake.definition?.tags || [])
        ];

        //console.log(`[CentralizedSim] All combined tags:`, allTags);

        // Find matching planet archetype based on tags
        const planetArchetype = Object.values(planetArchetypes).find(archetype => {
            if (!archetype.tags) {
                //console.log(`[CentralizedSim] Archetype ${archetype.name} has no tags`);
                return false;
            }

            //console.log(`[CentralizedSim] Checking archetype ${archetype.name} with tags:`, archetype.tags);

            // Check if archetype tags match claim stake tags
            const hasMatchingTags = allTags.some(claimTag =>
                archetype.tags.includes(claimTag)
            );

            //console.log(`[CentralizedSim] Archetype ${archetype.name} matches: ${hasMatchingTags}`);
            return hasMatchingTags;
        });

        if (planetArchetype) {
            //console.log(`[CentralizedSim] Found matching planet archetype: ${planetArchetype.name}`);
            return planetArchetype;
        }

        // Fallback: try to match based on claim stake ID patterns
        //console.log(`[CentralizedSim] No tag match found, trying ID pattern matching for: ${claimStake.id}`);

        const id = claimStake.id.toLowerCase();
        let targetTags = [];

        // Extract planet type from ID
        if (id.includes('terrestrial-planet')) {
            targetTags.push('tag-terrestrial-planet');
        } else if (id.includes('ice-giant')) {
            targetTags.push('tag-ice-giant');
        } else if (id.includes('gas-giant')) {
            targetTags.push('tag-gas-giant');
        } else if (id.includes('barren-planet')) {
            targetTags.push('tag-barren-planet');
        } else if (id.includes('volcanic-planet')) {
            targetTags.push('tag-volcanic-planet');
        } else if (id.includes('dark-planet')) {
            targetTags.push('tag-dark-planet');
        }

        // Extract faction from ID
        if (id.includes('-oni-')) {
            targetTags.push('tag-oni');
        } else if (id.includes('-mud-')) {
            targetTags.push('tag-mud');
        } else if (id.includes('-ustur-')) {
            targetTags.push('tag-ustur');
        }

        //console.log(`[CentralizedSim] Extracted target tags from ID:`, targetTags);

        if (targetTags.length > 0) {
            const fallbackArchetype = Object.values(planetArchetypes).find(archetype => {
                if (!archetype.tags) return false;
                return targetTags.every(tag => archetype.tags.includes(tag));
            });

            if (fallbackArchetype) {
                //console.log(`[CentralizedSim] Found fallback planet archetype: ${fallbackArchetype.name}`);
                return fallbackArchetype;
            }
        }

        //console.warn(`[CentralizedSim] No planet archetype found for claim stake: ${claimStake.id}`);
        return null;
    }

    // Calculate which buildings are operational based on power and resource requirements
    calculateBuildingStates(claimStake) {
        const states = {};
        //console.log(`[CentralizedSim] Calculating building states for claim stake: ${claimStake.id}`);
        //console.log(`[CentralizedSim] Claim stake buildings:`, claimStake.buildings);

        if (!claimStake.buildings || claimStake.buildings.length === 0) {
            //console.log(`[CentralizedSim] No buildings to process`);
            return states;
        }

        // Access building definitions from the correct path
        const buildings = this.gameData?.claimStakeBuildings ||
            this.gameData?.data?.claimStakeBuildings ||
            {};
        //console.log(`[CentralizedSim] Available building definitions:`, Object.keys(buildings).length);

        // Process each building in the claim stake
        claimStake.buildings.forEach((buildingId, index) => {
            //console.log(`[CentralizedSim] Processing building ${index + 1}: ${buildingId}`);

            // Default to operational
            states[buildingId] = {
                operational: true,
                reason: 'Operational'
            };

            const buildingDef = buildings[buildingId];
            if (!buildingDef) {
                console.warn(`[CentralizedSim] Building definition not found: ${buildingId}`);
                states[buildingId] = {
                    operational: false,
                    reason: 'Building definition not found'
                };
                return;
            }

            //console.log(`[CentralizedSim] Building ${buildingDef.name} is operational`);

            // TODO: Add power/resource dependency checks here later
            // For now, all buildings are operational
        });

        //console.log(`[CentralizedSim] Final building states:`, states);
        return states;
    }

    // Calculate resource generation rates for a claim stake
    calculateResourceRates(claimStake, planetArchetype, buildingStates) {
        const rates = {};
        //console.log(`[CentralizedSim] Starting rate calculation for claim stake: ${claimStake.id}`);
        //console.log(`[CentralizedSim] Claim stake buildings:`, claimStake.buildings);
        //console.log(`[CentralizedSim] Planet archetype:`, planetArchetype?.name);
        //console.log(`[CentralizedSim] Building states:`, buildingStates);

        if (!claimStake.buildings || claimStake.buildings.length === 0) {
            //console.log(`[CentralizedSim] No buildings found in claim stake`);
            return rates;
        }

        if (!this.gameData?.claimStakeBuildings && !this.gameData?.data?.claimStakeBuildings) {
            //console.log(`[CentralizedSim] No building definitions in game data`);
            return rates;
        }

        const buildingDefinitions = this.gameData?.claimStakeBuildings ||
            this.gameData?.data?.claimStakeBuildings ||
            {};

        // Process each building in the claim stake
        claimStake.buildings.forEach((buildingId, index) => {
            //console.log(`[CentralizedSim] Processing building ${index + 1}/${claimStake.buildings.length}: ${buildingId}`);

            const buildingDef = buildingDefinitions[buildingId];
            if (!buildingDef) {
                console.warn(`[CentralizedSim] Building definition not found: ${buildingId}`);
                return;
            }

            //console.log(`[CentralizedSim] Found building definition:`, buildingDef.name);
            //console.log(`[CentralizedSim] Building resourceRate:`, buildingDef.resourceRate);
            //console.log(`[CentralizedSim] Building resourceExtractionRate:`, buildingDef.resourceExtractionRate);

            // Check if building is operational
            const isOperational = buildingStates[buildingId]?.operational !== false;
            if (!isOperational) {
                //console.log(`[CentralizedSim] Building ${buildingId} is not operational, skipping`);
                return;
            }

            // Process resource consumption and production from resourceRate
            if (buildingDef.resourceRate) {
                Object.entries(buildingDef.resourceRate).forEach(([resourceId, rate]) => {
                    if (rate !== 0) {
                        //console.log(`[CentralizedSim] Building ${buildingDef.name} ${rate > 0 ? 'produces' : 'consumes'} ${resourceId} at rate ${Math.abs(rate)}/s`);

                        // Add to rates (positive = production, negative = consumption)
                        rates[resourceId] = (rates[resourceId] || 0) + rate;
                        //console.log(`[CentralizedSim] Total rate for ${resourceId}: ${rates[resourceId]}/s`);
                    }
                });
            }

            // Process resource extraction from resourceExtractionRate (apply planet richness)
            if (buildingDef.resourceExtractionRate) {
                Object.entries(buildingDef.resourceExtractionRate).forEach(([resourceId, baseRate]) => {
                    if (baseRate > 0) {
                        //console.log(`[CentralizedSim] Building ${buildingDef.name} extracts ${resourceId} at base rate ${baseRate}/s`);

                        // Apply planet richness multiplier for extraction
                        let finalRate = baseRate;
                        if (planetArchetype && planetArchetype.richness) {
                            const richness = planetArchetype.richness[resourceId] || 0;
                            finalRate = baseRate * richness;
                            //console.log(`[CentralizedSim] Applied richness multiplier ${richness} for ${resourceId}: ${baseRate} -> ${finalRate}`);
                        }

                        // Add to rates (extraction is always positive)
                        rates[resourceId] = (rates[resourceId] || 0) + finalRate;
                        //console.log(`[CentralizedSim] Total rate for ${resourceId}: ${rates[resourceId]}/s`);
                    }
                });
            }
        });

        //console.log(`[CentralizedSim] Final calculated rates:`, rates);
        return rates;
    }

    // Update resource amounts based on rates and delta time
    updateResources(currentResources, rates, deltaTime) {
        const updatedResources = { ...currentResources };

        for (const [resourceId, rate] of Object.entries(rates)) {
            if (rate === 0) continue;

            // Get current amount (handle both object and number formats)
            const resourceData = currentResources[resourceId];
            let currentAmount = 0;
            if (typeof resourceData === 'object' && resourceData.amount !== undefined) {
                currentAmount = resourceData.amount;
            } else if (typeof resourceData === 'number') {
                currentAmount = resourceData;
            }

            // Calculate new amount
            const change = rate * deltaTime;
            let newAmount = currentAmount + change;

            // Prevent negative resources
            if (newAmount < 0) {
                newAmount = 0;
            }

            // Store updated amount
            if (typeof resourceData === 'object') {
                updatedResources[resourceId] = {
                    ...resourceData,
                    amount: newAmount
                };
            } else {
                updatedResources[resourceId] = newAmount;
            }

            // Log significant changes
            if (Math.abs(change) > 0.01) {
                //console.log(`[CentralizedSim] UPDATED ${resourceId}: ${currentAmount.toFixed(2)} → ${newAmount.toFixed(2)} (rate: ${rate.toFixed(2)}/s)`);
            }
        }

        return updatedResources;
    }

    // Calculate power statistics
    calculatePowerStats(claimStake, buildingStates) {
        let generation = 0;
        let consumption = 0;
        const buildings = this.gameData?.claimStakeBuildings ||
            this.gameData?.data?.claimStakeBuildings || {};

        // Check if claimStake has buildings array instead of buildings object
        const claimStakeBuildings = Array.isArray(claimStake.buildings) ?
            claimStake.buildings :
            (claimStake.buildings ? Object.keys(claimStake.buildings) : []);

        claimStakeBuildings.forEach(buildingId => {
            const building = buildings[buildingId];
            const buildingState = buildingStates[buildingId];

            if (building && buildingState?.operational) {
                const power = building.power || 0;
                if (power > 0) {
                    generation += power;
                } else if (power < 0) {
                    consumption += Math.abs(power);
                }
            }
        });

        return {
            generation,
            consumption,
            net: generation - consumption
        };
    }

    // Calculate crew statistics
    calculateCrewStats(claimStake) {
        let totalSlots = 0;
        let usedCrew = 0;
        const buildings = this.gameData?.claimStakeBuildings ||
            this.gameData?.data?.claimStakeBuildings || {};

        // Check if claimStake has buildings array instead of buildings object
        const claimStakeBuildings = Array.isArray(claimStake.buildings) ?
            claimStake.buildings :
            (claimStake.buildings ? Object.keys(claimStake.buildings) : []);

        claimStakeBuildings.forEach(buildingId => {
            const building = buildings[buildingId];
            if (building) {
                totalSlots += building.crewSlots || 0;
                usedCrew += building.neededCrew || 0;
            }
        });

        return {
            totalSlots,
            usedCrew,
            available: totalSlots - usedCrew
        };
    }

    // Calculate storage statistics
    calculateStorageStats(claimStake) {
        let totalStorage = 0;
        const buildings = this.gameData?.claimStakeBuildings ||
            this.gameData?.data?.claimStakeBuildings || {};

        // Check if claimStake has buildings array instead of buildings object
        const claimStakeBuildings = Array.isArray(claimStake.buildings) ?
            claimStake.buildings :
            (claimStake.buildings ? Object.keys(claimStake.buildings) : []);

        claimStakeBuildings.forEach(buildingId => {
            const building = buildings[buildingId];
            if (building) {
                totalStorage += building.storage || 0;
            }
        });

        return {
            total: totalStorage
        };
    }

    // Calculate global resources across all claim stakes
    calculateGlobalResources(claimStakes) {
        const globalResources = {};

        for (const claimStake of Object.values(claimStakes)) {
            for (const [resourceId, resourceData] of Object.entries(claimStake.resources || {})) {
                const amount = typeof resourceData === 'object' && resourceData.amount !== undefined
                    ? resourceData.amount
                    : (typeof resourceData === 'number' ? resourceData : 0);

                globalResources[resourceId] = (globalResources[resourceId] || 0) + amount;
            }
        }

        return globalResources;
    }

    // Check if claim stake has changed
    hasClaimStakeChanged(oldClaimStake, newClaimStake) {
        // Simple check - compare resource amounts
        const oldResources = oldClaimStake.resources || {};
        const newResources = newClaimStake.resources || {};

        for (const resourceId of new Set([...Object.keys(oldResources), ...Object.keys(newResources)])) {
            const oldAmount = typeof oldResources[resourceId] === 'object' && oldResources[resourceId].amount !== undefined
                ? oldResources[resourceId].amount
                : (typeof oldResources[resourceId] === 'number' ? oldResources[resourceId] : 0);

            const newAmount = typeof newResources[resourceId] === 'object' && newResources[resourceId].amount !== undefined
                ? newResources[resourceId].amount
                : (typeof newResources[resourceId] === 'number' ? newResources[resourceId] : 0);

            if (Math.abs(oldAmount - newAmount) > 0.001) {
                return true;
            }
        }

        return false;
    }

    // Notify all callbacks of game state changes
    notifyCallbacks(updatedGameState) {
        //console.log(`[CentralizedSim] Notifying ${this.callbacks.length} callbacks`);
        this.callbacks.forEach(callback => {
            try {
                callback(updatedGameState);
            } catch (error) {
                console.error('[CentralizedSim] Callback error:', error);
            }
        });
    }

    // Public methods for external control
    updateGameState(newGameState) {
        this.gameState = { ...this.gameState, ...newGameState };
    }

    getGameState() {
        return this.gameState;
    }

    isOperational() {
        return this.isRunning && !this.isPaused;
    }
}

// Create singleton instance
const centralizedSimulationService = new CentralizedSimulationService();

export default centralizedSimulationService; 