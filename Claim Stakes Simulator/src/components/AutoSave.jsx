import React, { useEffect, useRef } from 'react';
import { saveGame, setupAutoSave } from '../utils/saveLoad';

/**
 * AutoSave component that automatically saves the game at regular intervals
 * This is a component that doesn't render anything but handles the auto-save logic
 */
const AutoSave = ({ gameState, onSaveComplete, interval = 5 }) => {
    const autoSaveIntervalRef = useRef(null);

    useEffect(() => {
        // Clean up any existing interval
        if (autoSaveIntervalRef.current) {
            clearInterval(autoSaveIntervalRef.current);
        }

        // Skip setup if gameState is empty (initial load)
        if (!gameState || Object.keys(gameState.ownedClaimStakes || {}).length === 0) {
            return;
        }

        // Create save function that captures the current game state
        const performAutoSave = () => {
            const result = saveGame(gameState, `AutoSave-${new Date().toLocaleString().replace(/[/:]/g, '-')}`);

            if (result.success) {
                console.log('Auto-save completed successfully');
                if (onSaveComplete) {
                    onSaveComplete({
                        type: 'auto',
                        success: true,
                        message: 'Game auto-saved successfully',
                        saveId: result.saveId
                    });
                }
            } else {
                console.error('Auto-save failed:', result.message);
                if (onSaveComplete) {
                    onSaveComplete({
                        type: 'auto',
                        success: false,
                        message: `Auto-save failed: ${result.message}`
                    });
                }
            }

            return result;
        };

        // Setup auto-save interval
        autoSaveIntervalRef.current = setupAutoSave(performAutoSave, interval);

        // Cleanup on unmount
        return () => {
            if (autoSaveIntervalRef.current) {
                clearInterval(autoSaveIntervalRef.current);
            }
        };
    }, [gameState, onSaveComplete, interval]);

    // This component doesn't render anything
    return null;
};

export default AutoSave; 