/**
 * GameDataLoader - Manual JSON data loading utility
 * Supports both standalone embedded data and manual file loading
 */

// Global game data storage
let loadedGameData = null;

/**
 * Check if we're running in standalone mode
 * @returns {boolean} True if running in standalone mode
 */
export const isStandaloneMode = () => {
    return typeof window !== 'undefined' && window.EMBEDDED_GAME_DATA;
};

/**
 * Get currently loaded game data
 * @returns {Object|null} The game data object or null if not loaded
 */
export const getGameData = () => {
    // In standalone mode, return embedded data
    if (isStandaloneMode()) {
        return window.EMBEDDED_GAME_DATA;
    }

    // Return manually loaded data
    return loadedGameData;
};

/**
 * Check if game data is currently loaded
 * @returns {boolean} True if game data is loaded
 */
export const isGameDataLoaded = () => {
    if (isStandaloneMode()) {
        return !!window.EMBEDDED_GAME_DATA;
    }
    return !!loadedGameData;
};

/**
 * Validate JSON data structure
 * @param {Object} data - Parsed JSON data
 * @returns {Object} Validation result
 */
const validateGameData = (data) => {
    const errors = [];
    const warnings = [];

    try {
        // Handle nested structure where data is under 'data' key
        const actualData = data.data || data;

        // Required sections - check in the actual data location
        const requiredSections = [
            'cargo',
            'claimStakeDefinitions',
            'claimStakeBuildings',
            'planetArchetypes'
        ];

        const missingSections = requiredSections.filter(section => !actualData[section]);

        if (missingSections.length > 0) {
            errors.push(`Missing required sections: ${missingSections.join(', ')}`);
        }

        // Check if sections have content
        requiredSections.forEach(section => {
            if (actualData[section] && typeof actualData[section] === 'object') {
                const itemCount = Object.keys(actualData[section]).length;
                if (itemCount === 0) {
                    warnings.push(`Section '${section}' is empty`);
                }
            }
        });

        // Additional data structure checks
        if (actualData.cargo) {
            const cargoItems = Object.keys(actualData.cargo);
            if (cargoItems.length < 10) {
                warnings.push(`Only ${cargoItems.length} cargo items found - this may be incomplete data`);
            }
        }

        if (actualData.claimStakeBuildings) {
            const buildings = Object.keys(actualData.claimStakeBuildings);
            if (buildings.length < 5) {
                warnings.push(`Only ${buildings.length} building types found - this may be incomplete data`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            structure: data.data ? 'nested' : 'flat',
            actualData // Return the data we'll actually use
        };
    } catch (error) {
        return {
            isValid: false,
            errors: [`Validation error: ${error.message}`],
            warnings: [],
            structure: 'unknown',
            actualData: null
        };
    }
};

/**
 * Load game data from JSON string
 * @param {string} jsonString - JSON string containing game data
 * @returns {Promise<Object>} Result object with success status and data
 */
export const loadGameDataFromJSON = (jsonString) => {
    return new Promise((resolve) => {
        try {
            console.log('📊 Parsing JSON data...');

            // Parse the JSON
            const parsedData = JSON.parse(jsonString);

            // Validate the data structure
            const validation = validateGameData(parsedData);

            if (!validation.isValid) {
                console.error('❌ Data validation failed:', validation.errors);
                resolve({
                    success: false,
                    error: `Invalid game data: ${validation.errors.join(', ')}`,
                    details: validation
                });
                return;
            }

            // Use the validated actual data (handles nested structure)
            const gameData = validation.actualData;

            // Store the game data
            loadedGameData = gameData;

            console.log('✅ Game data loaded successfully');
            console.log(`📋 Structure: ${validation.structure} (${validation.structure === 'nested' ? 'data under "data" key' : 'flat structure'})`);

            if (validation.warnings.length > 0) {
                console.warn('⚠️ Warnings:', validation.warnings);
            }

            // Log summary
            const stats = {
                cargo: Object.keys(gameData.cargo || {}).length,
                claimStakeDefinitions: Object.keys(gameData.claimStakeDefinitions || {}).length,
                claimStakeBuildings: Object.keys(gameData.claimStakeBuildings || {}).length,
                planetArchetypes: Object.keys(gameData.planetArchetypes || {}).length
            };

            console.log('📈 Data summary:', stats);

            resolve({
                success: true,
                data: gameData,
                stats,
                validation,
                structure: validation.structure
            });

        } catch (parseError) {
            console.error('❌ JSON parsing failed:', parseError);
            resolve({
                success: false,
                error: `Failed to parse JSON: ${parseError.message}`,
                details: { parseError: parseError.message }
            });
        }
    });
};

/**
 * Load game data from a File object
 * @param {File} file - File object containing JSON data
 * @returns {Promise<Object>} Promise resolving to result with success status and data or error message
 */
export const loadGameDataFromFile = (file) => {
    return new Promise((resolve) => {
        if (!file) {
            resolve({
                success: false,
                error: 'No file provided'
            });
            return;
        }

        if (!file.type.includes('json') && !file.name.endsWith('.json')) {
            resolve({
                success: false,
                error: 'File must be a JSON file'
            });
            return;
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            const result = loadGameDataFromJSON(event.target.result);
            resolve(result);
        };

        reader.onerror = () => {
            resolve({
                success: false,
                error: 'Failed to read file'
            });
        };

        reader.readAsText(file);
    });
};

/**
 * Clear currently loaded game data
 */
export const clearGameData = () => {
    loadedGameData = null;
    console.log('🗑️ Game data cleared');
};

/**
 * Get a specific section of game data
 * @param {string} section - The section name (e.g., 'claimStakeDefinitions', 'cargo', etc.)
 * @returns {Object} The requested section of game data
 */
export const getGameDataSection = (section) => {
    const data = getGameData();
    return data?.[section] || {};
};

/**
 * Get game data loading status and basic info
 * @returns {Object} Status information
 */
export const getGameDataStatus = () => {
    const data = getGameData();

    if (!data) {
        return {
            loaded: false,
            isStandalone: isStandaloneMode(),
            sections: {}
        };
    }

    return {
        loaded: true,
        isStandalone: isStandaloneMode(),
        sections: {
            cargo: Object.keys(data.cargo || {}).length,
            claimStakeDefinitions: Object.keys(data.claimStakeDefinitions || {}).length,
            claimStakeBuildings: Object.keys(data.claimStakeBuildings || {}).length,
            planetArchetypes: Object.keys(data.planetArchetypes || {}).length,
            planets: Object.keys(data.planets || {}).length
        }
    };
};

export default getGameData; 