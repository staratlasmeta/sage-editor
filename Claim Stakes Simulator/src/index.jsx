import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import GameLayout from './components/GameLayout';
import ClaimStakeManager from './components/ClaimStakeManager';
import DataLoader from './components/DataLoader';
import { getGameData, isGameDataLoaded } from './utils/gameDataLoader';
import { getSavedGames, loadGame } from './utils/saveLoad';

const App = () => {
    const [purchasedClaimStakes, setPurchasedClaimStakes] = useState([]);
    const [timeSpeed, setTimeSpeed] = useState(1);
    const [isPaused, setIsPaused] = useState(false);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [gameDataLoaded, setGameDataLoaded] = useState(false);
    const [dataLoadError, setDataLoadError] = useState(null);

    // Check if game data is loaded on mount
    useEffect(() => {
        setGameDataLoaded(isGameDataLoaded());
    }, []);

    // Handle claim stake purchase (or loaded claim stakes)
    const handleClaimStakePurchase = (newClaimStake, fromLoad = false) => {
        console.log(`🔄 Root App: ${fromLoad ? 'Loading' : 'Purchasing'} claim stake:`, newClaimStake.id);

        setPurchasedClaimStakes(prev => {
            // Check if stake already exists to avoid duplicates
            const exists = prev.some(stake => stake.id === newClaimStake.id);
            if (exists) {
                return prev.map(stake =>
                    stake.id === newClaimStake.id ? { ...stake, ...newClaimStake } : stake
                );
            }
            return [...prev, newClaimStake];
        });

        // If this is loaded from a save, we need to broadcast to ensure all components know about it
        if (fromLoad) {
            window.dispatchEvent(new CustomEvent('claimStakePurchased', {
                detail: {
                    claimStake: newClaimStake,
                    fromLoad: true,
                    source: 'Root.App'
                }
            }));
        }
    };

    // Listen for gameStateLoaded events to restore claim stakes
    useEffect(() => {
        const handleGameStateLoaded = (event) => {
            const { loadedState } = event.detail;
            console.log('💾 Root App: Received game state loaded event:', loadedState);

            if (!loadedState) return;

            // Update time states
            if (loadedState.timeElapsed) {
                setTimeElapsed(loadedState.timeElapsed);
            }

            if (loadedState.timeSpeed) {
                setTimeSpeed(loadedState.timeSpeed);
            }

            if (loadedState.isPaused !== undefined) {
                setIsPaused(loadedState.isPaused);
            }

            // Load claim stakes
            if (loadedState.ownedClaimStakes && Array.isArray(loadedState.ownedClaimStakes)) {
                console.log('🔄 Root App: Loading owned claim stakes:', loadedState.ownedClaimStakes.length);

                // Replace all claim stakes
                setPurchasedClaimStakes(loadedState.ownedClaimStakes);

                // Also broadcast each claim stake to ensure all components register them
                loadedState.ownedClaimStakes.forEach(stake => {
                    window.dispatchEvent(new CustomEvent('claimStakePurchased', {
                        detail: {
                            claimStake: stake,
                            fromLoad: true,
                            source: 'Root.App.gameStateLoaded'
                        }
                    }));
                });
            }
        };

        window.addEventListener('gameStateLoaded', handleGameStateLoaded);

        return () => {
            window.removeEventListener('gameStateLoaded', handleGameStateLoaded);
        };
    }, []);

    // Handle data loading success
    const handleDataLoaded = (data) => {
        console.log('📊 Data loaded successfully:', data ? 'New data loaded' : 'Data cleared');
        setGameDataLoaded(isGameDataLoaded());
        setDataLoadError(null);

        // Clear any existing game state when new data is loaded
        if (data) {
            setPurchasedClaimStakes([]);
            setTimeElapsed(0);
            setTimeSpeed(1);
            setIsPaused(false);
        }
    };

    // Handle data loading errors
    const handleDataLoadError = (error) => {
        console.error('❌ Data loading error:', error);
        setDataLoadError(error);
        setGameDataLoaded(false);
    };

    // Handle switching back to data loader
    const handleSwitchToDataLoader = () => {
        console.log('🔄 Switching to data loader...');
        setGameDataLoaded(false);
        // Clear game state when switching back
        setPurchasedClaimStakes([]);
        setTimeElapsed(0);
        setTimeSpeed(1);
        setIsPaused(false);
    };

    // Show DataLoader if no game data is loaded
    if (!gameDataLoaded) {
        return (
            <DataLoader
                onDataLoaded={handleDataLoaded}
                onError={handleDataLoadError}
            />
        );
    }

    // Show main game interface when data is loaded
    return (
        <GameLayout
            purchasedClaimStakes={purchasedClaimStakes}
            timeSpeed={timeSpeed}
            isPaused={isPaused}
            onTimeSpeedChange={setTimeSpeed}
            onPauseToggle={() => setIsPaused(!isPaused)}
            onSwitchToDataLoader={handleSwitchToDataLoader}
        >
            <ClaimStakeManager
                gameData={getGameData()}
                onPurchase={handleClaimStakePurchase}
                purchasedClaimStakes={purchasedClaimStakes}
            />
        </GameLayout>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));