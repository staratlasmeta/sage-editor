import React, { useState, useEffect } from 'react';
import { DataProvider } from './shared/contexts/DataContext';
import { SharedStateProvider } from './shared/contexts/SharedStateContext';
import Navigation from './shared/components/Navigation';
import ClaimStakesSimulator from './claim-stakes/ClaimStakesSimulator';
import CraftingHabTool from './crafting-hab/CraftingHabTool';
import CraftingRecipesTool from './crafting-recipes/CraftingRecipesTool';
import DataLoader from './shared/services/DataLoader';
import './App.css';

function App() {
    const [activeeTool, setActiveTool] = useState('claim-stakes');
    const [gameData, setGameData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadGameData();
    }, []);

    const loadGameData = async () => {
        try {
            setLoading(true);
            const data = await DataLoader.loadAll();
            setGameData(data);
            setError(null);
        } catch (err) {
            setError(err.message);
            console.error('Failed to load game data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Loading Star Atlas C4 Tools...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-screen">
                <h2>Error Loading Data</h2>
                <p>{error}</p>
                <button onClick={loadGameData}>Retry</button>
            </div>
        );
    }

    return (
        <DataProvider value={gameData}>
            <SharedStateProvider>
                <div className="app">
                    <Navigation activeTool={activeTool} onToolChange={setActiveTool} />

                    <main className="tool-container">
                        {activeTool === 'claim-stakes' && <ClaimStakesSimulator />}
                        {activeTool === 'crafting-hab' && <CraftingHabTool />}
                        {activeTool === 'crafting-recipes' && <CraftingRecipesTool />}
                    </main>
                </div>
            </SharedStateProvider>
        </DataProvider>
    );
}

export default App;