import React, { useState, useEffect } from 'react';
import '../styles/ResourceBar.css';

const ResourceBar = ({
    purchasedClaimStakes = [],
    showProduction,
    onToggleView,
    timeElapsed = 0,
    timeSpeed = 1,
    isPaused = false,
    onTimeSpeedChange,
    onPauseToggle,
    onOpenSaveLoad,  // Add new prop for opening save/load manager
    onOpenAchievements,  // Add new prop for opening achievements panel
    onSwitchToDataLoader  // Add new prop for switching to data loader
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDebugButtons, setShowDebugButtons] = useState(false);

    // Show debug buttons if double-click on time display
    const handleTimeDisplayClick = () => {
        setShowDebugButtons(!showDebugButtons);
    };

    // Force a construction timer update
    const forceConstructionUpdate = () => {
        console.log('🔄 Forcing construction timer update');
        window.dispatchEvent(new CustomEvent('forceConstructionUpdate', {
            detail: {
                deltaTime: 10, // Skip 10 seconds
                timeSpeed: timeSpeed,
                isPaused: false,
                forceProgress: true,
                timestamp: Date.now()
            }
        }));
    };

    // Force construction completion
    const forceConstructionComplete = () => {
        console.log('🛠️ FORCE CONSTRUCTION COMPLETION triggered from ResourceBar');

        // Store the current timeSpeed to restore later
        const currentTimeSpeed = timeSpeed;

        // Generate a unique ID for this force completion event
        const forceCompletionId = `force-complete-${Date.now()}`;
        console.log(`🔧 Force completion session ID: ${forceCompletionId}`);

        // First slow down time to make completion logic more reliable
        window.dispatchEvent(new CustomEvent('timeSpeedChanged', {
            detail: {
                speed: 1,
                timerSpeed: 1,
                isPaused: false,
                preventLooping: true,
                timestamp: Date.now()
            }
        }));

        // Send a single persistent notification that this operation is starting
        console.log('🔔 Sending initial processing notification');
        const initialNotification = {
            id: `construction-process-${Date.now()}`,
            title: 'Processing Construction',
            message: 'Completing all construction projects...',
            type: 'info',
            timestamp: Date.now(),
            sessionId: forceCompletionId
        };

        window.dispatchEvent(new CustomEvent('showNotification', {
            detail: initialNotification
        }));

        // Send construction update with the current elapsed time
        console.log('🔄 Sending initial construction update');
        window.dispatchEvent(new CustomEvent('forceConstructionUpdate', {
            detail: {
                deltaTime: 1, // Small delta to avoid jumps
                timeSpeed: 1,
                isPaused: false,
                forceProgress: true,
                timestamp: Date.now(),
                absoluteElapsedTime: timeElapsed, // Pass the current elapsed time
                sessionId: forceCompletionId
            }
        }));

        // Then immediately force complete all constructions
        setTimeout(() => {
            console.log('🎉 Forcing final completion step with explicit notification flag');

            // Force construction completion with explicit notification flag
            window.dispatchEvent(new CustomEvent('forceConstructionComplete', {
                detail: {
                    completeAll: true,
                    timestamp: Date.now(),
                    forceComplete: true,
                    absoluteElapsedTime: timeElapsed, // Include elapsed time for reference
                    withNotification: true, // Explicitly request notifications
                    sessionId: forceCompletionId
                }
            }));

            // Send a final update to ensure UI refresh
            setTimeout(() => {
                console.log('🔄 Sending final UI refresh event');
                window.dispatchEvent(new CustomEvent('claimStakeUpdated', {
                    detail: {
                        timestamp: Date.now(),
                        forceUIRefresh: true,
                        sessionId: forceCompletionId
                    }
                }));

                // Also check if notifications are working by sending a test notification
                const checkNotification = {
                    id: `notification-check-${Date.now()}`,
                    title: 'System Check',
                    message: 'Notification system check - completion was triggered.',
                    type: 'info',
                    timestamp: Date.now(),
                    sessionId: forceCompletionId
                };

                console.log('🔔 Sending system check notification');
                window.dispatchEvent(new CustomEvent('showNotification', {
                    detail: checkNotification
                }));

                // Restore original time speed
                if (currentTimeSpeed !== 1) {
                    console.log(`⏱️ Restoring original time speed: ${currentTimeSpeed}x`);
                    window.dispatchEvent(new CustomEvent('timeSpeedChanged', {
                        detail: {
                            speed: currentTimeSpeed,
                            timerSpeed: currentTimeSpeed,
                            isPaused: false,
                            preventLooping: true,
                            timestamp: Date.now(),
                            sessionId: forceCompletionId
                        }
                    }));
                }
            }, 500);
        }, 200);
    };

    // Broadcast time speed changes via custom event
    useEffect(() => {
        // Broadcast the current time speed to any listeners
        window.dispatchEvent(new CustomEvent('timeSpeedChanged', {
            detail: {
                speed: timeSpeed,
                timerSpeed: timeSpeed, // Same value for timer speed by default
                isPaused: isPaused
            }
        }));

        // Force timer updates directly
        if (timeSpeed > 1) {
            window.dispatchEvent(new CustomEvent('forceTimerUpdate', {
                detail: {
                    deltaTime: 0.1 * timeSpeed, // Scale delta with speed
                    source: 'ResourceBar',
                    timestamp: Date.now()
                }
            }));
        }
    }, [timeSpeed, isPaused]);

    // Enhanced time speed handler with event dispatch
    const handleTimeSpeedChange = (speed) => {
        // Call the parent handler
        onTimeSpeedChange(speed);

        // Dispatch custom event for immediate effect without causing time jumps
        console.log(`📢 Broadcasting time speed change to ${speed}x`);
        window.dispatchEvent(new CustomEvent('timeSpeedChanged', {
            detail: {
                speed: speed,
                timerSpeed: speed,
                isPaused: isPaused,
                source: 'ResourceBar',
                timestamp: Date.now(),
                preventTimeJump: true, // Flag to prevent time jumps
                currentElapsedTime: timeElapsed // Include current elapsed time
            }
        }));

        // Only send a small update to synchronize timers without jumping
        window.dispatchEvent(new CustomEvent('forceTimerUpdate', {
            detail: {
                deltaTime: 0.1, // Very small delta to avoid jumps
                source: 'ResourceBar',
                timestamp: Date.now(),
                preventTimeJump: true,
                absoluteElapsedTime: timeElapsed
            }
        }));
    };

    // Enhanced pause toggle with event dispatch
    const handlePauseToggle = () => {
        // Call the parent handler
        onPauseToggle();

        // Force a timer update immediately after pause state changes
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('forceTimerUpdate', {
                detail: {
                    deltaTime: 0.1,
                    isPauseChange: true,
                    source: 'ResourceBar',
                    timestamp: Date.now()
                }
            }));
        }, 50);
    };

    // Format time elapsed into HH:MM:SS
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Calculate combined resources and production rates
    const combinedStats = purchasedClaimStakes.reduce((combined, claimStake) => {
        // Add current resources - handle both simple numbers and resource objects
        Object.entries(claimStake.resources || {}).forEach(([resource, resourceData]) => {
            // Handle both simple amounts and resource objects with amount property
            const amount = typeof resourceData === 'object' && resourceData.amount !== undefined
                ? resourceData.amount
                : (typeof resourceData === 'number' ? resourceData : 0);

            combined.resources[resource] = (combined.resources[resource] || 0) + amount;
        });

        // Add production rates - use lastResourceRates from CentralizedSimulationService
        if (claimStake.lastResourceRates) {
            Object.entries(claimStake.lastResourceRates).forEach(([resource, rate]) => {
                combined.production[resource] = (combined.production[resource] || 0) + rate;
            });
        }

        // Fallback: Also check individual resource objects for rates
        Object.entries(claimStake.resources || {}).forEach(([resource, resourceData]) => {
            // Get rate from resource object if available (this is a fallback)
            if (typeof resourceData === 'object' && resourceData.rate !== undefined) {
                // Only use this if we don't already have a rate from lastResourceRates
                if (!claimStake.lastResourceRates || !claimStake.lastResourceRates[resource]) {
                    combined.production[resource] = (combined.production[resource] || 0) + resourceData.rate;
                }
            }
        });

        return combined;
    }, { resources: {}, production: {} });

    const displayData = showProduction ? combinedStats.production : combinedStats.resources;

    // Filter and sort resources
    const sortedResources = Object.entries(displayData)
        .filter(([resource]) =>
            resource.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort(([, a], [, b]) => b - a);

    // Get top 5 resources for condensed view
    const topResources = sortedResources.slice(0, 5);

    return (
        <div className={`resource-bar ${isExpanded ? 'expanded' : ''}`}>
            <div className="resource-bar-content">
                <div className="resource-bar-left">
                    <div className="time-controls">
                        <button className="time-button" onClick={handlePauseToggle}>
                            {isPaused ? '▶' : '⏸'}
                        </button>
                        <div className="speed-buttons">
                            {[1, 2, 5, 10, 100, 1000].map(speed => (
                                <button
                                    key={speed}
                                    className={`speed-button ${timeSpeed === speed ? 'active' : ''}`}
                                    onClick={() => handleTimeSpeedChange(speed)}
                                >
                                    {speed}x
                                </button>
                            ))}
                        </div>
                        <div className="time-display" onDoubleClick={handleTimeDisplayClick}>
                            {formatTime(timeElapsed)}
                        </div>

                        {showDebugButtons && (
                            <div className="debug-buttons" style={{ marginLeft: '10px' }}>
                                <button
                                    onClick={forceConstructionUpdate}
                                    style={{
                                        fontSize: '10px',
                                        padding: '2px 5px',
                                        background: '#555',
                                        border: '1px solid #777',
                                        borderRadius: '3px',
                                        color: 'white'
                                    }}
                                >
                                    Skip 10s
                                </button>
                                <button
                                    onClick={forceConstructionComplete}
                                    style={{
                                        fontSize: '12px',
                                        padding: '2px 8px',
                                        background: '#007bff',
                                        border: '1px solid #0056b3',
                                        borderRadius: '3px',
                                        marginLeft: '5px',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Complete
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="resource-bar-right">
                    {/* Add Data Loader button */}
                    {onSwitchToDataLoader && (
                        <button
                            className="data-loader-button"
                            onClick={onSwitchToDataLoader}
                            title="Switch to Data Loader"
                        >
                            📊 Load Data
                        </button>
                    )}
                    {/* Add Save/Load button */}
                    <button
                        className="save-load-button"
                        onClick={onOpenSaveLoad}
                        title="Save or Load Game"
                    >
                        💾 Save/Load
                    </button>
                    <button
                        className="achievements-button"
                        onClick={onOpenAchievements}
                        title="Open Achievements"
                    >
                        🏆 Achievements
                    </button>
                    <div className="resource-toggle">
                        <button
                            className={!showProduction ? 'active' : ''}
                            onClick={() => onToggleView(false)}
                        >
                            Current Resources
                        </button>
                        <button
                            className={showProduction ? 'active' : ''}
                            onClick={() => onToggleView(true)}
                        >
                            Production Rates
                        </button>
                        <button
                            className={`expand-button ${isExpanded ? 'active' : ''}`}
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? 'Collapse' : 'Show All'}
                        </button>
                    </div>
                </div>
            </div>

            {isExpanded && (
                <input
                    type="text"
                    placeholder="Search resources..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="resource-search"
                />
            )}

            <div className={`resources-list ${isExpanded ? 'expanded' : ''}`}>
                <div className="resources-grid">
                    {(isExpanded ? sortedResources : topResources).map(([resource, value]) => (
                        <div key={resource} className="resource-item">
                            <span className="resource-name">{resource.replace('cargo-', '')}</span>
                            <span className="resource-value">
                                {showProduction ? (
                                    <span className={value >= 0 ? 'positive' : 'negative'}>
                                        {value >= 0 ? '+' : ''}{isNaN(value) || value === undefined || value === null ? '0.00' : value.toFixed(2)}/s
                                    </span>
                                ) : (
                                    <>
                                        <div className="resource-amount">
                                            {isNaN(value) || value === undefined || value === null ? '0' : Math.floor(value)}
                                        </div>
                                        {combinedStats.production[resource] !== undefined && combinedStats.production[resource] !== 0 && (
                                            <div className={`resource-rate ${combinedStats.production[resource] >= 0 ? 'positive' : 'negative'}`}>
                                                {combinedStats.production[resource] >= 0 ? '+' : ''}{combinedStats.production[resource].toFixed(2)}/s
                                            </div>
                                        )}
                                    </>
                                )}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ResourceBar;