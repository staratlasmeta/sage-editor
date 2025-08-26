import React, { createContext, useContext, useState, useEffect } from 'react';
import { DataLoader } from '../services/DataLoader';

interface GameData {
    planets?: any[];
    buildings?: any[];
    resources?: any[] | Record<string, any>;
    recipes?: any[];
    claimStakeDefinitions?: any[];
    craftingHabBuildings?: any[];
    planetArchetypes?: any[];
    starbaseDefinitions?: any[];
    starbases?: any[];
    tags?: any[] | Record<string, any>;
    cargo?: any[] | Record<string, any>;
}

interface DataContextType {
    gameData: GameData | null;
    loading: boolean;
    error: string | null;
    reloadData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
    const [gameData, setGameData] = useState<GameData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadGameData = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await DataLoader.loadAll();
            setGameData(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load game data';
            setError(errorMessage);
            console.error('Failed to load game data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGameData();
    }, []);

    const contextValue: DataContextType = {
        gameData,
        loading,
        error,
        reloadData: loadGameData,
    };

    return (
        <DataContext.Provider value={contextValue}>
            {children}
        </DataContext.Provider>
    );
}

export function useGameData() {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useGameData must be used within a DataProvider');
    }
    return context;
} 