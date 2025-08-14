import { v4 as uuidv4 } from 'uuid';

/**
 * Saves the current game state to local storage
 * @param {Object} gameState - Current game state to save
 * @param {String} saveName - Optional custom name for the save file
 * @returns {Object} Save information
 */
export const saveGame = (gameState, saveName = '') => {
    try {
        // Create save ID and metadata
        const saveId = uuidv4();
        const timestamp = new Date().toISOString();
        const saveFileName = saveName || `Save-${new Date().toLocaleString().replace(/[/:]/g, '-')}`;

        // Ensure we're capturing the time elapsed value properly
        const timeElapsed = gameState.timeElapsed || 0;
        console.log('Saving game with elapsed time:', timeElapsed);

        // Extract the necessary data from the game state
        const saveData = {
            id: saveId,
            name: saveFileName,
            timestamp,
            gameState: {
                ownedClaimStakes: gameState.ownedClaimStakes || [],
                planets: gameState.planets,
                resources: gameState.resources,
                elapsedTime: timeElapsed,
                timeElapsed: timeElapsed, // Add both formats for compatibility
                timeSpeed: gameState.timeSpeed || 1,
                isPaused: gameState.isPaused || false,
                achievements: gameState.achievements
            }
        };

        // Get existing saves
        const existingSaves = getSavedGames();

        // Add new save to the list
        existingSaves[saveId] = {
            id: saveId,
            name: saveFileName,
            timestamp,
            preview: generateSavePreview({
                ...gameState,
                elapsedTime: timeElapsed // Ensure elapsed time is passed correctly
            })
        };

        // Save individual game state with its ID
        localStorage.setItem(`claimStakesSimulator_save_${saveId}`, JSON.stringify(saveData));

        // Update save index
        localStorage.setItem('claimStakesSimulator_saves', JSON.stringify(existingSaves));

        return {
            success: true,
            saveId,
            message: 'Game saved successfully!'
        };
    } catch (error) {
        console.error('Error saving game:', error);
        return {
            success: false,
            message: `Failed to save game: ${error.message}`
        };
    }
};

/**
 * Loads a saved game state from local storage
 * @param {String} saveId - ID of the save to load
 * @returns {Object} Loaded game state or error
 */
export const loadGame = (saveId) => {
    try {
        // Get save data from storage
        const saveData = localStorage.getItem(`claimStakesSimulator_save_${saveId}`);

        if (!saveData) {
            return {
                success: false,
                message: 'Save file not found'
            };
        }

        // Parse the save data
        const parsedSaveData = JSON.parse(saveData);

        return {
            success: true,
            gameState: parsedSaveData.gameState,
            message: 'Game loaded successfully!'
        };
    } catch (error) {
        console.error('Error loading game:', error);
        return {
            success: false,
            message: `Failed to load game: ${error.message}`
        };
    }
};

/**
 * Gets a list of all saved games
 * @returns {Object} Object of save game metadata
 */
export const getSavedGames = () => {
    try {
        const savedGamesJson = localStorage.getItem('claimStakesSimulator_saves');
        return savedGamesJson ? JSON.parse(savedGamesJson) : {};
    } catch (error) {
        console.error('Error getting saved games:', error);
        return {};
    }
};

/**
 * Deletes a saved game
 * @param {String} saveId - ID of the save to delete
 * @returns {Object} Result of the operation
 */
export const deleteSavedGame = (saveId) => {
    try {
        // Get existing saves
        const existingSaves = getSavedGames();

        // Remove the save from the list
        if (existingSaves[saveId]) {
            delete existingSaves[saveId];

            // Remove the save data
            localStorage.removeItem(`claimStakesSimulator_save_${saveId}`);

            // Update save index
            localStorage.setItem('claimStakesSimulator_saves', JSON.stringify(existingSaves));

            return {
                success: true,
                message: 'Save deleted successfully!'
            };
        } else {
            return {
                success: false,
                message: 'Save not found'
            };
        }
    } catch (error) {
        console.error('Error deleting saved game:', error);
        return {
            success: false,
            message: `Failed to delete save: ${error.message}`
        };
    }
};

/**
 * Generates a preview of game state for the save listing
 * @param {Object} gameState - Current game state
 * @returns {Object} Preview data
 */
const generateSavePreview = (gameState) => {
    const { ownedClaimStakes, elapsedTime = 0 } = gameState;

    // Count claim stakes by tier
    const claimStakesByTier = {};
    let totalClaimStakes = 0;
    let totalBuildings = 0;

    Object.values(ownedClaimStakes || {}).forEach(stake => {
        const tier = stake.definition?.tier || '1';
        claimStakesByTier[tier] = (claimStakesByTier[tier] || 0) + 1;
        totalClaimStakes++;

        // Count buildings
        if (stake.buildings) {
            Object.values(stake.buildings).forEach(buildingCount => {
                totalBuildings += buildingCount;
            });
        }
    });

    // Format elapsed time - add validation to avoid NaN
    let formattedTime = '00:00:00';
    if (elapsedTime !== undefined && !isNaN(elapsedTime) && elapsedTime > 0) {
        const hours = Math.floor(elapsedTime / 3600);
        const minutes = Math.floor((elapsedTime % 3600) / 60);
        const seconds = Math.floor(elapsedTime % 60);
        formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return {
        totalClaimStakes,
        claimStakesByTier,
        totalBuildings,
        elapsedTime: formattedTime
    };
};

/**
 * Sets up auto-save functionality
 * @param {Function} saveFunction - Function to call for saving
 * @param {Number} interval - Autosave interval in minutes
 * @returns {Number} Interval ID for clearing if needed
 */
export const setupAutoSave = (saveFunction, interval = 5) => {
    const intervalInMs = interval * 60 * 1000;

    const intervalId = setInterval(() => {
        const saveResult = saveFunction();
        if (saveResult.success) {
            // Could trigger a notification here
            console.log('Auto-save completed successfully');
        } else {
            console.error('Auto-save failed:', saveResult.message);
        }
    }, intervalInMs);

    return intervalId;
}; 