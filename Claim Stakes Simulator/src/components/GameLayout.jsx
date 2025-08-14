import React, { useState, useEffect, useCallback, useRef } from 'react';
import ResourceBar from './ResourceBar';
import '../styles/GameLayout.css';
import FuelConsumptionManager from './FuelConsumptionManager';
import NotificationManager from './NotificationManager';
import SaveLoadManager from './SaveLoadManager';
import AutoSave from './AutoSave';

const GameLayout = ({
    children,
    currentResources = {},
    productionRates = {},
    purchasedClaimStakes = [],
    onClaimStakeSelect,
    onPurchaseClaimStakesClick,
    onUpdateClaimStake,
    timeSpeed: propTimeSpeed = 1,
    isPaused: propIsPaused = false,
    onTimeSpeedChange,
    onPauseToggle,
    addNotification,
    gameData,
    onOpenAchievements,  // Add new prop for achievements
    onSwitchToDataLoader  // Add new prop for switching to data loader
}) => {
    const [showProduction, setShowProduction] = useState(false);
    const [timeElapsed, setTimeElapsed] = useState(0);

    // Use either props or local state for time controls
    const [localTimeSpeed, setLocalTimeSpeed] = useState(1);
    const [localIsPaused, setLocalIsPaused] = useState(false);

    // Determine which state/props to use
    const timeSpeed = onTimeSpeedChange ? propTimeSpeed : localTimeSpeed;
    const isPaused = onPauseToggle ? propIsPaused : localIsPaused;

    const [isClaimStakesExpanded, setIsClaimStakesExpanded] = useState(true);

    // State for save/load functionality
    const [showSaveLoadManager, setShowSaveLoadManager] = useState(false);
    const [autoSaveComplete, setAutoSaveComplete] = useState(null);

    const startTimeRef = useRef(Date.now());
    const timeElapsedRef = useRef(0);
    const lastStateUpdateRef = useRef(Date.now());

    // Time update effect for elapsed time display
    useEffect(() => {
        if (isPaused) return;

        // Use the persistent start time reference instead of creating a new one
        // Only initialize it once if it hasn't been set
        if (!startTimeRef.current) {
            startTimeRef.current = Date.now();
        }

        let lastUpdateTime = Date.now();

        // Create stable callback functions here
        const dispatchTimerUpdates = () => {
            // Get current time for accurate delta
            const now = Date.now();
            const actualDeltaTime = (now - lastUpdateTime) / 1000; // Convert to seconds
            lastUpdateTime = now;

            // Adjust delta based on time speed
            const adjustedDelta = actualDeltaTime * timeSpeed;

            // Calculate the absolute elapsed time - using the persistent startTimeRef
            const absoluteElapsedSeconds = (now - startTimeRef.current) / 1000;

            // Update the time elapsed, but avoid unnecessary state updates
            // Store the current calculated time in a ref instead of setting state every time
            const newTimeElapsed = timeElapsedRef.current + adjustedDelta;
            timeElapsedRef.current = newTimeElapsed;

            // Only update state if enough time has passed (every 500ms) to avoid re-render loops
            if (now - lastStateUpdateRef.current > 500) {
                lastStateUpdateRef.current = now;
                setTimeElapsed(newTimeElapsed);
            }

            // Create a single detailed event object for all timer-dependent systems
            const timeUpdateDetail = {
                timeSpeed,
                deltaTime: adjustedDelta,
                actualDeltaTime: actualDeltaTime,
                elapsedTime: newTimeElapsed, // Use the ref value for consistent timing
                absoluteElapsedTime: absoluteElapsedSeconds, // Add the real elapsed time without speed adjustment
                timestamp: now,
                absoluteTimestamp: now, // Make sure to include absolute timestamp
                lastUpdateTime: lastUpdateTime,
                startTime: startTimeRef.current, // Use the persisted start time
                realWorldElapsed: absoluteElapsedSeconds
            };

            // Make sure we're passing the absolute timestamp in milliseconds
            // for precise construction timer calculations
            window.dispatchEvent(new CustomEvent('gameTickTimerUpdate', {
                detail: timeUpdateDetail
            }));

            // Always dispatch construction timer events even if no resources are changing
            // This ensures the construction timer continues to update
            window.dispatchEvent(new CustomEvent('constructionTimerTick', {
                detail: timeUpdateDetail
            }));

        };

        // Set interval for regular timer updates (more frequent at higher speeds)
        const updateFrequency = timeSpeed > 10 ? 200 : timeSpeed > 2 ? 500 : 1000;
        const interval = setInterval(dispatchTimerUpdates, updateFrequency);

        // Run an immediate update when time speed changes
        dispatchTimerUpdates();

        return () => clearInterval(interval);
    }, [timeSpeed, isPaused, timeElapsed]);

    // Handle time speed change
    const handleTimeSpeedChange = useCallback((speed) => {
        if (onTimeSpeedChange) {
            onTimeSpeedChange(speed);
        } else {
            setLocalTimeSpeed(speed);
        }

        // Notify construction systems about the time speed change without causing jumps
        window.dispatchEvent(new CustomEvent('timeSpeedChanged', {
            detail: {
                timeSpeed: speed,
                isPaused: isPaused,
                source: 'GameLayout',
                forceUpdate: true,
                preventTimeJump: true, // Prevent time jumps
                currentElapsedTime: timeElapsed // Include current elapsed time
            }
        }));

        // Force an immediate timer update to reflect speed change, but avoid jumps
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('forceTimerUpdate', {
                detail: {
                    deltaTime: 0.1, // Small delta to avoid jumps
                    timeSpeed: speed,
                    timestamp: Date.now(),
                    source: 'GameLayout.handleTimeSpeedChange',
                    preventTimeJump: true
                }
            }));
        }, 50);
    }, [onTimeSpeedChange, isPaused, timeElapsed]);

    // Handle pause toggling
    const handlePauseToggle = useCallback(() => {
        const newPausedState = !isPaused;

        if (onPauseToggle) {
            onPauseToggle();
        } else {
            setLocalIsPaused(newPausedState);
        }

        // Notify construction systems about pause state change
        window.dispatchEvent(new CustomEvent('pauseStateChanged', {
            detail: {
                isPaused: newPausedState,
                timeSpeed: timeSpeed,
                source: 'GameLayout'
            }
        }));
    }, [isPaused, onPauseToggle, timeSpeed]);

    // Generate game state for saving
    const getGameState = useCallback(() => {
        return {
            timeElapsed,
            timeSpeed,
            isPaused,
            ownedClaimStakes: purchasedClaimStakes,
            currentResources,
            productionRates,
            // Add other necessary state properties here
        };
    }, [timeElapsed, timeSpeed, isPaused, purchasedClaimStakes, currentResources, productionRates]);

    // Handle save/load manager toggle
    const handleOpenSaveLoad = useCallback(() => {
        setShowSaveLoadManager(true);
    }, []);

    // Handle game load
    const handleLoadGame = useCallback((loadedState) => {
        // Log the loading of the game state
        console.log('Loading game state:', loadedState);

        // Update time-related states
        if (loadedState.timeElapsed !== undefined) {
            timeElapsedRef.current = loadedState.timeElapsed;
            setTimeElapsed(loadedState.timeElapsed);
        }

        if (loadedState.timeSpeed !== undefined) {
            if (onTimeSpeedChange) {
                onTimeSpeedChange(loadedState.timeSpeed);
            } else {
                setLocalTimeSpeed(loadedState.timeSpeed);
            }
        }

        if (loadedState.isPaused !== undefined) {
            if (onPauseToggle && isPaused !== loadedState.isPaused) {
                onPauseToggle();
            } else {
                setLocalIsPaused(loadedState.isPaused);
            }
        }

        // Create a global event to update the game state
        window.dispatchEvent(new CustomEvent('gameStateLoaded', {
            detail: {
                loadedState,
                timestamp: Date.now(),
            }
        }));

        // Display a notification about the successful load
        if (addNotification) {
            addNotification({
                title: 'Game Loaded',
                message: 'Game state loaded successfully',
                type: 'success',
                timeout: 5000
            });
        }
    }, [addNotification, isPaused, onPauseToggle, onTimeSpeedChange]);

    // Handle auto-save completion notification
    const handleAutoSaveComplete = useCallback((result) => {
        if (result.success) {
            setAutoSaveComplete({
                message: 'Game auto-saved',
                timestamp: Date.now()
            });

            // Clear the notification after a few seconds
            setTimeout(() => {
                setAutoSaveComplete(null);
            }, 3000);
        }
    }, []);

    return (
        <div className="game-layout">
            <nav className="game-nav">
                <div className="nav-primary">
                    {/* This space can be used for other primary navigation items */}
                </div>

                <div className="nav-section">
                    <button
                        className="section-header"
                        onClick={() => setIsClaimStakesExpanded(!isClaimStakesExpanded)}
                    >
                        <span className={`expand-icon ${isClaimStakesExpanded ? 'expanded' : ''}`}>u25b6</span>
                        YOUR CLAIM STAKES
                        <span className="claim-count">({purchasedClaimStakes.length})</span>
                    </button>

                    {isClaimStakesExpanded && (
                        <div className="nav-claim-stakes">
                            {purchasedClaimStakes.length > 0 ? (
                                <>
                                    {purchasedClaimStakes.map(stake => {
                                        return (
                                            <button
                                                key={stake.id}
                                                className="nav-item"
                                                onClick={() => onClaimStakeSelect(stake)}
                                            >
                                                {stake.definition.name}
                                            </button>
                                        );
                                    })}
                                    <button
                                        className="nav-item purchase-item"
                                        onClick={onPurchaseClaimStakesClick}
                                    >
                                        <span className="nav-icon plus-icon">+</span>
                                        Add Claim Stake
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="no-claims-message">
                                        No claim stakes purchased
                                    </div>
                                    <button
                                        className="nav-item purchase-item"
                                        onClick={onPurchaseClaimStakesClick}
                                    >
                                        <span className="nav-icon plus-icon">+</span>
                                        Purchase Claim Stake
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </nav>

            {/* Resource Bar */}
            <ResourceBar
                currentResources={currentResources}
                productionRates={productionRates}
                purchasedClaimStakes={purchasedClaimStakes}
                showProduction={showProduction}
                onToggleView={setShowProduction}
                timeElapsed={timeElapsed}
                timeSpeed={timeSpeed}
                isPaused={isPaused}
                onTimeSpeedChange={handleTimeSpeedChange}
                onPauseToggle={handlePauseToggle}
                onOpenSaveLoad={handleOpenSaveLoad} // Add handler for save/load button
                onOpenAchievements={onOpenAchievements}  // Pass through the new prop
                onSwitchToDataLoader={onSwitchToDataLoader}  // Pass through the new prop
            />

            {/* Main Content */}
            <main className="game-content">
                {children}
            </main>

            {/* Auto-save notification */}
            {autoSaveComplete && (
                <div className="auto-save-notification">
                    {autoSaveComplete.message}
                </div>
            )}

            {/* Save/Load Manager */}
            {showSaveLoadManager && (
                <SaveLoadManager
                    gameState={getGameState()}
                    onLoad={handleLoadGame}
                    onClose={() => setShowSaveLoadManager(false)}
                />
            )}

            {/* Auto-save component */}
            <AutoSave
                gameState={getGameState()}
                onSaveComplete={handleAutoSaveComplete}
                interval={5} // 5 minutes interval for auto-save
            />

            {/* Add NotificationManager to show construction notifications */}
            <NotificationManager />

            {/* Disable FuelConsumptionManager - fuel consumption is handled by CentralizedSimulationService */}
            {/* <FuelConsumptionManager
                isRunning={!isPaused}
                timeSpeed={timeSpeed}
                claimStakes={purchasedClaimStakes}
                gameData={gameData}
                onUpdateClaimStake={onUpdateClaimStake}
                addNotification={addNotification}
                disableLogging={true}
            /> */}
        </div>
    );
};

export default GameLayout;