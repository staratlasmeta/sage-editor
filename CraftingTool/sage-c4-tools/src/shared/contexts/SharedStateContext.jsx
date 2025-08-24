import React, { createContext, useContext, useReducer, useEffect } from 'react';
import SaveService from '../services/SaveService';

const SharedStateContext = createContext(null);

const initialState = {
    playerFaction: 'MUD',
    atlas: 100000,
    crew: 50,
    starbaseInventory: {},
    claimStakes: [],
    craftingHabs: [],
    achievements: [],
    notifications: []
};

function sharedStateReducer(state, action) {
    switch (action.type) {
        case 'SET_FACTION':
            return { ...state, playerFaction: action.payload };

        case 'UPDATE_ATLAS':
            return { ...state, atlas: state.atlas + action.payload };

        case 'UPDATE_INVENTORY':
            return {
                ...state,
                starbaseInventory: {
                    ...state.starbaseInventory,
                    [action.starbaseId]: action.inventory
                }
            };

        case 'ADD_CLAIM_STAKE':
            return {
                ...state,
                claimStakes: [...state.claimStakes, action.payload]
            };

        case 'ADD_CRAFTING_HAB':
            return {
                ...state,
                craftingHabs: [...state.craftingHabs, action.payload]
            };

        case 'UNLOCK_ACHIEVEMENT':
            if (!state.achievements.includes(action.payload)) {
                return {
                    ...state,
                    achievements: [...state.achievements, action.payload],
                    notifications: [...state.notifications, {
                        type: 'achievement',
                        message: `Achievement Unlocked: ${action.payload}`,
                        timestamp: Date.now()
                    }]
                };
            }
            return state;

        case 'LOAD_STATE':
            return { ...state, ...action.payload };

        default:
            return state;
    }
}

export const SharedStateProvider = ({ children }) => {
    const [state, dispatch] = useReducer(sharedStateReducer, initialState);

    // Auto-save every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            SaveService.autoSave(state);
        }, 30000);
        return () => clearInterval(interval);
    }, [state]);

    // Load saved state on mount
    useEffect(() => {
        const savedState = SaveService.load();
        if (savedState) {
            dispatch({ type: 'LOAD_STATE', payload: savedState });
        }
    }, []);

    const value = {
        state,
        dispatch,
        // Helper functions
        spendAtlas: (amount) => {
            if (state.atlas >= amount) {
                dispatch({ type: 'UPDATE_ATLAS', payload: -amount });
                return true;
            }
            return false;
        },
        transferResources: (from, to, resources) => {
            // Implementation for resource transfer
            console.log('Transferring resources:', { from, to, resources });
        }
    };

    return (
        <SharedStateContext.Provider value={value}>
            {children}
        </SharedStateContext.Provider>
    );
};

export const useSharedState = () => {
    const context = useContext(SharedStateContext);
    if (!context) {
        throw new Error('useSharedState must be used within SharedStateProvider');
    }
    return context;
};