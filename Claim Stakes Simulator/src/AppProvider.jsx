import React, { createContext, useContext, useState, useEffect } from 'react';
import { getGameData } from './utils/gameDataLoader';

// Create a named export for easier debugging
export const AppStateContext = createContext(null);

const createInitialClaimStakes = (gameData) => {
    if (!gameData?.claimStakeDefinitions) {
        return [];
    }

    return Object.entries(gameData.claimStakeDefinitions).map(([id, definition]) => ({
        id,
        definition: {
            ...definition,
            id,
            addedTags: definition.addedTags || [],
            requiredTags: definition.requiredTags || []
        },
        purchased: false // Initially all claim stakes are unpurchased
    }));
};

const initialState = {
    view: 'selection',
    claimStake: null,
    purchasedClaimStakes: [], // Ensure this is always an array
    claimStakes: createInitialClaimStakes(getGameData()) // Initialize claim stakes from game data
};

export function AppProvider({ children }) {
    // Initialize state from localStorage if available
    const [state, setState] = useState(() => {
        const storedState = localStorage.getItem('appState');

        if (storedState) {
            try {
                const parsed = JSON.parse(storedState);

                const mergedState = {
                    ...initialState,
                    ...parsed,
                    purchasedClaimStakes: parsed.purchasedClaimStakes || []
                };

                return mergedState;
            } catch (e) {
                return initialState;
            }
        }
        return initialState;
    });

    const safeSetState = (updater) => {
        setState(prev => {
            const nextState = typeof updater === 'function' ? updater(prev) : updater;

            // Ensure state integrity
            const finalState = {
                ...nextState,
                purchasedClaimStakes: Array.isArray(nextState.purchasedClaimStakes)
                    ? [...new Set(nextState.purchasedClaimStakes)]
                    : [],
                claimStakes: nextState.claimStakes || initialState.claimStakes
            };

            return finalState;
        });
    };

    return (
        <AppStateContext.Provider value={{ state, setState: safeSetState }}>
            {children}
        </AppStateContext.Provider>
    );
}

// Export as named export
export function useAppState() {
    const context = useContext(AppStateContext);
    if (!context) {
        throw new Error('useAppState must be used within AppProvider');
    }
    return context;
} 