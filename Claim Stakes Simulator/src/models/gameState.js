/**
 * Game State Model
 * This module defines the structure of the game state and provides utility functions for manipulating it.
 */

/**
 * Default initial game state
 */
export const initialGameState = {
    // Player's owned claim stakes
    ownedClaimStakes: {},

    // Game time elapsed in seconds
    elapsedTime: 0,

    // Game speed multiplier
    speedMultiplier: 1,

    // Pause state
    isPaused: true,

    // Resource amounts (global)
    resources: {},

    // Resource production rates (global)
    resourceRates: {},

    // Achievement progress
    achievements: {},

    // All planets with their claim stake instances
    planets: {},

    // Buildings under construction
    constructionQueue: {},

    // Save timestamp
    lastSaved: null,
};

/**
 * Creates a new claim stake instance when a player purchases one
 * @param {String} claimStakeDefId - ID of the claim stake definition 
 * @param {String} planetInstanceId - ID of the planet instance
 * @param {Object} gameData - Game data containing definitions
 * @returns {Object} New claim stake instance
 */
export const createClaimStakeInstance = (claimStakeDefId, planetInstanceId, gameData) => {
    // Generate a unique ID for this claim stake instance
    const instanceId = `claimStakeInstance-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Get the claim stake definition and planet instance
    const claimStakeDef = gameData.claimStakeDefinitions[claimStakeDefId];
    const planetInstance = gameData.planets[planetInstanceId];
    const planetArchetype = gameData.planetArchetypes[planetInstance.planetArchetype];

    if (!claimStakeDef || !planetInstance || !planetArchetype) {
        console.error('Missing required data for claim stake creation');
        return null;
    }

    // Find the Central Hub T1 building
    const centralHubT1Id = Object.keys(gameData.claimStakeBuildings).find(
        buildingId => gameData.claimStakeBuildings[buildingId].name === "Central Hub T1"
    );

    if (!centralHubT1Id) {
        console.error('Could not find Central Hub T1 building');
        return null;
    }

    // Combine tags from planet archetype and claim stake definition
    const combinedTags = [
        ...(planetArchetype.tags || []),
        ...(claimStakeDef.addedTags || [])
    ];

    // Initial fuel amount: 1000 × tier
    const initialFuel = 1000 * parseInt(claimStakeDef.tier, 10);

    // Create the claim stake instance
    const newInstance = {
        id: instanceId,
        name: `${planetInstance.name} ${claimStakeDef.name}`,
        planetInstanceId,
        definitionId: claimStakeDefId,
        definition: claimStakeDef,
        tags: combinedTags,
        buildings: {
            [centralHubT1Id]: 1 // Start with one Central Hub T1
        },
        resources: {
            "cargo-fuel": initialFuel
        },
        resourceRates: {},
        storage: {
            used: 0,
            capacity: gameData.claimStakeBuildings[centralHubT1Id].storage || 1000
        },
        crew: {
            used: gameData.claimStakeBuildings[centralHubT1Id].neededCrew || 0,
            capacity: gameData.claimStakeBuildings[centralHubT1Id].crewSlots || 0
        },
        power: {
            generation: Math.max(0, gameData.claimStakeBuildings[centralHubT1Id].power || 0),
            consumption: Math.abs(Math.min(0, gameData.claimStakeBuildings[centralHubT1Id].power || 0)),
        },
        buildingsUnderConstruction: {}
    };

    return newInstance;
};

/**
 * Calculates resource rates for a claim stake based on its buildings
 * @param {Object} claimStake - The claim stake instance
 * @param {Object} gameData - Game data containing definitions
 * @returns {Object} Updated resource rates
 */
export const calculateResourceRates = (claimStake, gameData) => {
    const { buildings, tags, planetInstanceId } = claimStake;
    const planetInstance = gameData.planets[planetInstanceId];
    const planetArchetype = gameData.planetArchetypes[planetInstance.planetArchetype];
    const rates = {};

    // Process each building's resource rates
    Object.entries(buildings).forEach(([buildingId, count]) => {
        const building = gameData.claimStakeBuildings[buildingId];
        if (!building) return;

        // Handle resourceRate (now contains both production and consumption)
        if (building.resourceRate) {
            Object.entries(building.resourceRate).forEach(([resourceId, rate]) => {
                // Simply add the rate (positive means production, negative means consumption)
                rates[resourceId] = (rates[resourceId] || 0) + (rate * count);
            });
        }

        // Handle extraction rates (apply planet richness)
        if (building.resourceExtractionRate) {
            Object.entries(building.resourceExtractionRate).forEach(([resourceId, rate]) => {
                // Apply richness modifier from planet for raw resources
                const richness = planetArchetype.richness?.[resourceId] || 1;
                rates[resourceId] = (rates[resourceId] || 0) + (rate * richness * count);
            });
        }
    });

    return rates;
};

/**
 * Updates global resource rates based on all owned claim stakes
 * @param {Object} gameState - Current game state
 * @param {Object} gameData - Game data containing definitions
 * @returns {Object} Updated global resource rates
 */
export const updateGlobalResourceRates = (gameState, gameData) => {
    const globalRates = {};

    // Combine rates from all claim stakes
    Object.values(gameState.ownedClaimStakes).forEach(claimStake => {
        const stakeRates = calculateResourceRates(claimStake, gameData);

        // Update claim stake's individual rates
        claimStake.resourceRates = stakeRates;

        // Add to global rates
        Object.entries(stakeRates).forEach(([resourceId, rate]) => {
            globalRates[resourceId] = (globalRates[resourceId] || 0) + rate;
        });
    });

    return globalRates;
};

/**
 * Simulates one tick of the game (updates resources, buildings under construction, etc.)
 * @param {Object} gameState - Current game state
 * @param {Number} deltaTime - Time elapsed since last tick in seconds
 * @param {Object} gameData - Game data containing definitions
 * @returns {Object} Updated game state
 */
export const simulateTick = (gameState, deltaTime, gameData) => {
    if (gameState.isPaused) return gameState;

    // Apply time multiplier
    const adjustedDelta = deltaTime * gameState.speedMultiplier;

    // Clone game state to avoid direct mutations
    const newState = JSON.parse(JSON.stringify(gameState));

    // Update elapsed time
    newState.elapsedTime += adjustedDelta;

    // Update resource rates for all claim stakes
    newState.resourceRates = updateGlobalResourceRates(newState, gameData);

    // Update resources based on production rates
    Object.entries(newState.resourceRates).forEach(([resourceId, rate]) => {
        // Calculate the amount to add/subtract
        const deltaAmount = rate * adjustedDelta;

        // Update global resource amounts
        newState.resources[resourceId] = Math.max(
            0, // Cannot go below zero
            (newState.resources[resourceId] || 0) + deltaAmount
        );

        // Need to handle per-claim stake resources and storage limits here
        // (Not implemented in this simplified version)
    });

    // Process construction queue
    Object.entries(newState.constructionQueue).forEach(([constructionId, item]) => {
        item.timeRemaining -= adjustedDelta;

        if (item.timeRemaining <= 0) {
            // Construction complete
            const claimStake = newState.ownedClaimStakes[item.claimStakeId];
            if (claimStake) {
                // Add or update building count
                claimStake.buildings[item.buildingId] = (claimStake.buildings[item.buildingId] || 0) + 1;

                // Update storage, crew, and power values
                const building = gameData.claimStakeBuildings[item.buildingId];
                if (building) {
                    claimStake.storage.capacity += (building.storage || 0);
                    claimStake.crew.capacity += (building.crewSlots || 0);
                    claimStake.crew.used += (building.neededCrew || 0);

                    // Update power values
                    if (building.power > 0) {
                        claimStake.power.generation += building.power;
                    } else {
                        claimStake.power.consumption += Math.abs(building.power);
                    }

                    // Add building tags to claim stake tags
                    if (building.addedTags && building.addedTags.length > 0) {
                        claimStake.tags = [...new Set([...claimStake.tags, ...building.addedTags])];
                    }
                }

                // Remove from construction queue
                delete newState.constructionQueue[constructionId];
                delete claimStake.buildingsUnderConstruction[constructionId];
            }
        }
    });

    return newState;
};

/**
 * Starts construction of a building on a claim stake
 * @param {Object} gameState - Current game state
 * @param {String} claimStakeId - ID of the claim stake
 * @param {String} buildingId - ID of the building to construct
 * @param {Object} gameData - Game data containing definitions
 * @returns {Object} Updated game state or null if construction cannot start
 */
export const startConstruction = (gameState, claimStakeId, buildingId, gameData) => {
    const claimStake = gameState.ownedClaimStakes[claimStakeId];
    const building = gameData.claimStakeBuildings[buildingId];

    if (!claimStake || !building) {
        console.error('Cannot start construction: missing claim stake or building');
        return null;
    }

    // Check if all prerequisites are met (tags, resources, slots, etc.)

    // Check required tags
    const missingTags = (building.requiredTags || []).filter(tag => !claimStake.tags.includes(tag));
    if (missingTags.length > 0) {
        console.error('Missing required tags:', missingTags);
        return null;
    }

    // Check if we have enough resources for construction
    for (const [resourceId, amount] of Object.entries(building.constructionCost || {})) {
        if ((gameState.resources[resourceId] || 0) < amount) {
            console.error(`Insufficient resource ${resourceId} for construction`);
            return null;
        }
    }

    // Clone game state to avoid direct mutations
    const newState = JSON.parse(JSON.stringify(gameState));

    // Create construction entry
    const constructionId = `construction-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const constructionItem = {
        id: constructionId,
        claimStakeId,
        buildingId,
        timeRemaining: building.constructionTime || 0,
        totalTime: building.constructionTime || 0
    };

    // Add to construction queue
    newState.constructionQueue[constructionId] = constructionItem;
    newState.ownedClaimStakes[claimStakeId].buildingsUnderConstruction[constructionId] = constructionItem;

    // Deduct construction costs
    Object.entries(building.constructionCost || {}).forEach(([resourceId, amount]) => {
        newState.resources[resourceId] = (newState.resources[resourceId] || 0) - amount;
    });

    return newState;
};

/**
 * Format time from seconds to HH:MM:SS
 * @param {Number} timeInSeconds - Time in seconds
 * @returns {String} Formatted time string
 */
export const formatTime = (timeInSeconds) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}; 