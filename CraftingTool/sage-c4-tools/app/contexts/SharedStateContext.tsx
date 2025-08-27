import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Types
interface StarbaseInfo {
    id: string;
    name: string;
    faction: string;
    level: number;
    inventory: Record<string, number>;
}

interface SharedState {
    selectedStarbase: StarbaseInfo | null;
    starbaseLevel: number;
    starbaseInventory: Record<string, number>;
    achievements: Record<string, boolean>;
    achievementProgress: Record<string, { current: number; target: number }>;
    statistics: {
        totalResourcesExtracted: number;
        totalItemsCrafted: number;
        totalClaimStakes: number;
        totalCraftingHabs: number;
    };
    settings: {
        autoSave: boolean;
    };
    craftingHabState?: {
        habPlots: any[];
        craftingJobs: any[];
        selectedStarbaseId?: string;
        selectedPlotId?: string;
        viewMode?: 'overview' | 'construction' | 'crafting';
        favoriteRecipes?: string[];
        recentRecipes?: string[];
    };
    craftingQueue?: any[];
    claimStakesData?: any[]; // Store claim stakes data globally
}

interface SharedStateContextType {
    state: SharedState;
    dispatch: React.Dispatch<Action>;
    // Helper functions
    transferResources: (from: string, to: string, resources: Record<string, number>) => void;
    updateStarbaseLevel: (level: number) => void;
    addToInventory: (resources: Record<string, number>) => void;
    consumeFromInventory: (resources: Record<string, number>) => boolean;
    unlockAchievement: (achievementId: string) => void;
    updateAchievementProgress: (achievementId: string, current: number, target: number) => void;
    updateStatistic: (stat: keyof SharedState['statistics'], value: number) => void;
}

// Actions
type Action =
    | { type: 'SET_STARBASE'; payload: StarbaseInfo }
    | { type: 'UPDATE_STARBASE_LEVEL'; payload: number }
    | { type: 'UPDATE_INVENTORY'; payload: Record<string, number> }
    | { type: 'TRANSFER_RESOURCES'; payload: { from: string; to: string; resources: Record<string, number> } }
    | { type: 'UNLOCK_ACHIEVEMENT'; payload: string }
    | { type: 'UPDATE_ACHIEVEMENT_PROGRESS'; payload: { id: string; current: number; target: number } }
    | { type: 'UPDATE_STATISTIC'; payload: { stat: keyof SharedState['statistics']; value: number } }
    | { type: 'UPDATE_SETTINGS'; payload: Partial<SharedState['settings']> }
    | { type: 'LOAD_STATE'; payload: SharedState }
    | { type: 'UPDATE_CRAFTING_HAB_STATE'; payload: SharedState['craftingHabState'] }
    | { type: 'ADD_TO_CRAFTING_QUEUE'; payload: any }
    | { type: 'UPDATE_CRAFTING_QUEUE'; payload: any[] }
    | { type: 'UPDATE_CLAIM_STAKES_DATA'; payload: any[] }
    | { type: 'RESET_STATE' };

// Initial state
const initialState: SharedState = {
    selectedStarbase: null,
    starbaseLevel: 0,
    starbaseInventory: {
        // Empty inventory - no auto-added resources
    },
    achievements: {},
    achievementProgress: {},
    statistics: {
        totalResourcesExtracted: 0,
        totalItemsCrafted: 0,
        totalClaimStakes: 0,
        totalCraftingHabs: 0
    },
    settings: {
        autoSave: true
    },
    claimStakesData: [],
    craftingHabState: {
        habPlots: [],
        craftingJobs: [],
    },
    craftingQueue: [],
};

// Starbase level definitions
export const STARBASE_LEVELS = {
    0: {
        name: "Outpost",
        claimStakeTiers: [1],
        habPlotsByTier: { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0 },
        features: ["Basic operations"]
    },
    1: {
        name: "Station",
        claimStakeTiers: [1, 2],
        habPlotsByTier: { 1: 5, 2: 2, 3: 0, 4: 0, 5: 0 },
        features: ["Extended storage", "T2 unlocked"]
    },
    2: {
        name: "Hub",
        claimStakeTiers: [1, 2, 3],
        habPlotsByTier: { 1: 10, 2: 5, 3: 2, 4: 0, 5: 0 },
        features: ["Regional trade", "T3 unlocked"]
    },
    3: {
        name: "Complex",
        claimStakeTiers: [1, 2, 3, 4],
        habPlotsByTier: { 1: 15, 2: 10, 3: 5, 4: 2, 5: 0 },
        features: ["Advanced manufacturing", "T4 unlocked"]
    },
    4: {
        name: "Metroplex",
        claimStakeTiers: [1, 2, 3, 4, 5],
        habPlotsByTier: { 1: 20, 2: 15, 3: 10, 4: 5, 5: 2 },
        features: ["Full capabilities", "T5 unlocked"]
    },
    5: {
        name: "Capital Station",
        claimStakeTiers: [1, 2, 3, 4, 5],
        habPlotsByTier: { 1: 25, 2: 20, 3: 15, 4: 10, 5: 5 },
        features: ["Enhanced efficiency", "Bonus slots"]
    },
    6: {
        name: "Central Space Station",
        claimStakeTiers: [1, 2, 3, 4, 5],
        habPlotsByTier: { 1: 30, 2: 25, 3: 20, 4: 15, 5: 10 },
        features: ["Maximum capacity", "CSS bonuses", "Faction capital"]
    }
};

// Reducer
function sharedStateReducer(state: SharedState, action: Action): SharedState {
    switch (action.type) {
        case 'SET_STARBASE':
            return {
                ...state,
                selectedStarbase: action.payload,
                starbaseLevel: action.payload.level,
                starbaseInventory: action.payload.inventory,
            };

        case 'UPDATE_STARBASE_LEVEL':
            return {
                ...state,
                starbaseLevel: action.payload,
                selectedStarbase: state.selectedStarbase ? {
                    ...state.selectedStarbase,
                    level: action.payload
                } : null,
            };

        case 'UPDATE_INVENTORY':
            const newInventory = { ...state.starbaseInventory };
            Object.entries(action.payload).forEach(([resource, amount]) => {
                newInventory[resource] = (newInventory[resource] || 0) + amount;
                if (newInventory[resource] < 0) newInventory[resource] = 0;
            });
            return {
                ...state,
                starbaseInventory: newInventory,
                selectedStarbase: state.selectedStarbase ? {
                    ...state.selectedStarbase,
                    inventory: newInventory
                } : null,
            };

        case 'TRANSFER_RESOURCES':
            // This would handle resource transfers between locations
            return state;

        case 'UNLOCK_ACHIEVEMENT':
            // Dispatch custom event for notification
            window.dispatchEvent(new CustomEvent('achievement-unlocked', {
                detail: { achievementId: action.payload }
            }));
            return {
                ...state,
                achievements: {
                    ...state.achievements,
                    [action.payload]: true,
                },
                // Clear progress for this achievement
                achievementProgress: {
                    ...state.achievementProgress,
                    [action.payload]: undefined
                }
            };

        case 'UPDATE_ACHIEVEMENT_PROGRESS':
            // Dispatch custom event for progress update
            window.dispatchEvent(new CustomEvent('achievement-progress', {
                detail: {
                    achievementId: action.payload.id,
                    current: action.payload.current,
                    target: action.payload.target
                }
            }));
            return {
                ...state,
                achievementProgress: {
                    ...state.achievementProgress,
                    [action.payload.id]: {
                        current: action.payload.current,
                        target: action.payload.target
                    }
                }
            };

        case 'UPDATE_STATISTIC':
            return {
                ...state,
                statistics: {
                    ...state.statistics,
                    [action.payload.stat]: state.statistics[action.payload.stat] + action.payload.value,
                },
            };

        case 'UPDATE_SETTINGS':
            return {
                ...state,
                settings: {
                    ...state.settings,
                    ...action.payload,
                },
            };

        case 'LOAD_STATE':
            return {
                ...initialState, // Start with initial state to ensure all fields exist
                ...action.payload, // Override with saved values
                claimStakesData: action.payload.claimStakesData || [], // Ensure claimStakesData is always an array
            };

        case 'UPDATE_CRAFTING_HAB_STATE':
            // Only log when there are hab designs being saved
            const designCount = action.payload?.habPlots?.filter((p: any) => p.habDesign).length || 0;
            if (designCount > 0) {
                console.log('🔄 REDUCER: Saving hab state with', designCount, 'configured plots');
            }
            return {
                ...state,
                craftingHabState: action.payload
            };

        case 'ADD_TO_CRAFTING_QUEUE':
            return {
                ...state,
                craftingQueue: [...(state.craftingQueue || []), action.payload]
            };

        case 'UPDATE_CRAFTING_QUEUE':
            return {
                ...state,
                craftingQueue: action.payload
            };
        case 'UPDATE_CLAIM_STAKES_DATA':
            return {
                ...state,
                claimStakesData: action.payload
            };

        case 'RESET_STATE':
            return initialState;

        default:
            return state;
    }
}

// Context
const SharedStateContext = createContext<SharedStateContextType | undefined>(undefined);

// Provider
export function SharedStateProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(sharedStateReducer, initialState);

    // Load saved state on mount
    useEffect(() => {
        const savedState = localStorage.getItem('sageC4SharedState');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                dispatch({ type: 'LOAD_STATE', payload: parsed });
            } catch (error) {
                // Failed to load saved state, will use initial state
            }
        }
    }, []);

    // Auto-save
    useEffect(() => {
        if (state.settings.autoSave) {
            const saveTimeout = setTimeout(() => {
                localStorage.setItem('sageC4SharedState', JSON.stringify(state));
            }, 1000);
            return () => clearTimeout(saveTimeout);
        }
    }, [state]);

    // Helper functions
    const transferResources = (from: string, to: string, resources: Record<string, number>) => {
        dispatch({ type: 'TRANSFER_RESOURCES', payload: { from, to, resources } });

        // Update inventory if transferring to/from starbase
        if (to === 'starbase') {
            dispatch({ type: 'UPDATE_INVENTORY', payload: resources });
        } else if (from === 'starbase') {
            const negativeResources = Object.fromEntries(
                Object.entries(resources).map(([k, v]) => [k, -v])
            );
            dispatch({ type: 'UPDATE_INVENTORY', payload: negativeResources });
        }
    };

    const updateStarbaseLevel = (level: number) => {
        dispatch({ type: 'UPDATE_STARBASE_LEVEL', payload: level });
    };

    const addToInventory = (resources: Record<string, number>) => {
        dispatch({ type: 'UPDATE_INVENTORY', payload: resources });
    };

    const consumeFromInventory = (resources: Record<string, number>): boolean => {
        // Check if we have enough resources
        for (const [resource, amount] of Object.entries(resources)) {
            if ((state.starbaseInventory[resource] || 0) < amount) {
                return false;
            }
        }

        // Consume resources
        const negativeResources = Object.fromEntries(
            Object.entries(resources).map(([k, v]) => [k, -v])
        );
        dispatch({ type: 'UPDATE_INVENTORY', payload: negativeResources });
        return true;
    };

    const unlockAchievement = (achievementId: string) => {
        if (!state.achievements[achievementId]) {
            dispatch({ type: 'UNLOCK_ACHIEVEMENT', payload: achievementId });
        }
    };

    const updateAchievementProgress = (achievementId: string, current: number, target: number) => {
        // Auto-unlock if progress is complete
        if (current >= target && !state.achievements[achievementId]) {
            unlockAchievement(achievementId);
        } else {
            dispatch({
                type: 'UPDATE_ACHIEVEMENT_PROGRESS',
                payload: { id: achievementId, current, target }
            });
        }
    };

    const updateStatistic = (stat: keyof SharedState['statistics'], value: number) => {
        dispatch({ type: 'UPDATE_STATISTIC', payload: { stat, value } });
    };

    const contextValue: SharedStateContextType = {
        state,
        dispatch,
        transferResources,
        updateStarbaseLevel,
        addToInventory,
        consumeFromInventory,
        unlockAchievement,
        updateAchievementProgress,
        updateStatistic,
    };

    return (
        <SharedStateContext.Provider value={contextValue}>
            {children}
        </SharedStateContext.Provider>
    );
}

// Hook
export function useSharedState() {
    const context = useContext(SharedStateContext);
    if (context === undefined) {
        throw new Error('useSharedState must be used within a SharedStateProvider');
    }
    return context;
}

// Helper functions
export function canPlaceClaimStake(starbaseLevel: number, stakeTier: number): boolean {
    const levelData = STARBASE_LEVELS[starbaseLevel as keyof typeof STARBASE_LEVELS];
    return levelData ? levelData.claimStakeTiers.includes(stakeTier) : false;
}

export function getAvailableHabPlots(starbaseLevel: number, habTier: number): number {
    const levelData = STARBASE_LEVELS[starbaseLevel as keyof typeof STARBASE_LEVELS];
    return levelData ? (levelData.habPlotsByTier[habTier as keyof typeof levelData.habPlotsByTier] || 0) : 0;
} 