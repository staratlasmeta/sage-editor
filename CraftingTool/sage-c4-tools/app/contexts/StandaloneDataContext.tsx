import React, { createContext, useContext, useEffect, useState } from 'react';
import { StandaloneDataLoader } from '../services/StandaloneDataLoader';

interface DataContextType {
    gameData: any;
    isLoading: boolean;
    error: string | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function StandaloneDataProvider({ children }: { children: React.ReactNode }) {
    const [data, setData] = useState<DataContextType>({
        gameData: null,
        isLoading: true,
        error: null
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                console.log('Loading standalone data...');
                const gameData = await StandaloneDataLoader.loadGameData();

                setData({
                    gameData: gameData,
                    isLoading: false,
                    error: null
                });
            } catch (error) {
                console.error('Failed to load standalone data:', error);
                setData(prev => ({
                    ...prev,
                    isLoading: false,
                    error: 'Failed to load game data'
                }));
            }
        };

        loadData();
    }, []);

    return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
}

export function useData() {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
}

// Export useGameData for compatibility with existing components
export function useGameData() {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useGameData must be used within a DataProvider');
    }

    // Return the full gameData object with all properties
    return {
        gameData: context.gameData,
        loading: context.isLoading,
        error: context.error
    };
}

// Re-export as DataProvider for compatibility
export { StandaloneDataProvider as DataProvider }; 