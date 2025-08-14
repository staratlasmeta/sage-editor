import React, { useEffect, useState, useRef } from 'react';

const App = () => {
    const [globalResources, setGlobalResources] = useState({});
    const [forceUiUpdate, setForceUiUpdate] = useState(false);
    // Add a reference to track the last update source
    const lastUpdateSourceRef = useRef(null);
    // Add a sequence counter to ensure proper update ordering
    const updateSequenceRef = useRef(0);

    useEffect(() => {
        const handleGlobalResourcesUpdated = (event) => {
            const { resources, forceUiUpdate, source, timestamp } = event.detail;
            updateSequenceRef.current++;
            const currentUpdateSequence = updateSequenceRef.current;

            console.log(`⚡ Processing resource update #${currentUpdateSequence} from ${source}`);
            lastUpdateSourceRef.current = source;

            // Use setState callback form to ensure we're working with the latest state
            setGlobalResources(prevResources => {
                // Create a deep copy to avoid reference issues
                const updatedResources = JSON.parse(JSON.stringify(prevResources));

                // Apply each resource change individually for better tracking
                Object.entries(resources).forEach(([resourceKey, value]) => {
                    // Only log resources that actually changed
                    if (updatedResources[resourceKey] !== value) {
                        console.log(`🔄 Resource change: ${resourceKey}: ${updatedResources[resourceKey] || 0} → ${value}`);
                    }
                    // Update the resource value
                    updatedResources[resourceKey] = value;
                });

                console.log(`🌍 App: Updating global resources (source: ${source})`);
                return updatedResources;
            });

            // If UI update requested, schedule it outside the render cycle
            if (forceUiUpdate) {
                setTimeout(() => {
                    setForceUiUpdate(Date.now());
                }, 0);
            }
        };

        window.addEventListener('globalResourcesUpdated', handleGlobalResourcesUpdated);

        return () => {
            window.removeEventListener('globalResourcesUpdated', handleGlobalResourcesUpdated);
        };
    }, []);

    // Add a protective effect to prevent accidental resource resets
    useEffect(() => {
        // This handler will intercept any attempts to reset resource values to 0
        const handleResourceProtection = (event) => {
            const { detail } = event;

            // If this is a construction or upgrade completion, ensure values aren't reset
            if (detail.source === 'construction-completion' || detail.source === 'upgrade-completion') {
                console.log('🛡️ Protected resource update from source:', detail.source);

                // Prevent potential race condition with simulators or other components
                event.stopImmediatePropagation();
            }
        };

        // This must be added with capture=true to intercept before other handlers
        window.addEventListener('globalResourcesUpdated', handleResourceProtection, true);

        return () => {
            window.removeEventListener('globalResourcesUpdated', handleResourceProtection, true);
        };
    }, []);

    // Add this new effect to App.jsx to handle force update events
    useEffect(() => {
        const handleForceGlobalResourceUpdate = (event) => {
            const { resources, immediate, source } = event.detail;

            console.log(`🔥 FORCE global resource update from ${source}`);

            // Use an immediate synchronous update for critical operations
            if (immediate) {
                const serializedUpdate = JSON.stringify(resources);
                setGlobalResources(resources);

                // Also store in localStorage for extra safety
                try {
                    localStorage.setItem('lastGlobalResources', serializedUpdate);
                } catch (err) {
                    console.error('Failed to save to localStorage', err);
                }

                console.log(`💾 Forced immediate global resource update complete`);
            }
        };

        window.addEventListener('forceGlobalResourceUpdate', handleForceGlobalResourceUpdate);

        return () => {
            window.removeEventListener('forceGlobalResourceUpdate', handleForceGlobalResourceUpdate);
        };
    }, []);
    
    // Listen for gameStateLoaded event to handle claim stakes after page refresh then load
    useEffect(() => {
        const handleGameStateLoaded = (event) => {
            const { loadedState } = event.detail;
            console.log('🔄 App received gameStateLoaded event with state:', loadedState);
            
            if (!loadedState) return;
            
            // Handle claim stakes
            if (loadedState.ownedClaimStakes && loadedState.ownedClaimStakes.length > 0) {
                // We need to trigger any events that rely on claim stakes being present
                // This ensures all components are aware of the new claim stakes
                console.log('📣 Broadcasting loaded claim stakes to all components');
                
                // Dispatch a custom event for each claim stake to ensure it's registered by all components
                loadedState.ownedClaimStakes.forEach(stake => {
                    window.dispatchEvent(new CustomEvent('claimStakePurchased', {
                        detail: {
                            claimStake: stake,
                            fromLoad: true,
                            source: 'gameStateLoaded'
                        }
                    }));
                });
                
                // Force UI refresh after a short delay to ensure all components have processed the events
                setTimeout(() => {
                    console.log('🔄 Forcing UI refresh after claim stakes loaded');
                    setForceUiUpdate(Date.now());
                    
                    // Also dispatch a global UI refresh event
                    window.dispatchEvent(new CustomEvent('forceUIRefresh', {
                        detail: {
                            source: 'App.gameStateLoaded',
                            timestamp: Date.now()
                        }
                    }));
                }, 100);
            }
            
            // Apply global resources if available
            if (loadedState.resources) {
                setGlobalResources(loadedState.resources);
            }
        };
        
        window.addEventListener('gameStateLoaded', handleGameStateLoaded);
        
        return () => {
            window.removeEventListener('gameStateLoaded', handleGameStateLoaded);
        };
    }, []);

    // Optional: Add resource recovery from localStorage on app start
    useEffect(() => {
        try {
            const savedResources = localStorage.getItem('lastGlobalResources');
            if (savedResources) {
                const parsedResources = JSON.parse(savedResources);
                console.log('🔄 Recovered global resources from localStorage');
                setGlobalResources(parsedResources);
            }
        } catch (err) {
            console.error('Failed to load from localStorage', err);
        }
    }, []);

    return (
        <div>
            {/* Rest of the component code */}
        </div>
    );
};

export default App;