import React, { createContext, useContext, useEffect, useState } from 'react';
import { StandaloneDataLoader } from '../services/StandaloneDataLoader';

interface DataContextType {
    planets: any[];
    buildings: any[];
    resources: any;
    starbases: any[];
    recipes: any[];
    isLoading: boolean;
    error: string | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function StandaloneDataProvider({ children }: { children: React.ReactNode }) {
    const [data, setData] = useState<DataContextType>({
        planets: [],
        buildings: [],
        resources: {},
        starbases: [],
        recipes: [],
        isLoading: true,
        error: null
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                console.log('Loading standalone data...');
                const gameData = await StandaloneDataLoader.loadGameData();
                const mockData = await StandaloneDataLoader.loadMockData();

                setData({
                    planets: gameData.planets || mockData.planets || [],
                    buildings: gameData.buildings || mockData.buildings || [],
                    resources: gameData.resources || mockData.resources || {},
                    starbases: gameData.starbases || mockData.starbases || [],
                    recipes: gameData.recipes || mockData.recipes || [],
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

// Re-export as DataProvider for compatibility
export { StandaloneDataProvider as DataProvider }; 