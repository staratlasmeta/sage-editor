import React, { useEffect, useRef } from 'react';

// Fuel consumption manager handles fuel logic for claim stakes
const FuelConsumptionManager = (props) => {
    const {
        claimStakes = [],
        gameData,
        onUpdateClaimStake,
        addNotification,
        isRunning = true,
        timeSpeed = 1,  // Default to 1x if not provided
        disableLogging = false, // Add prop to disable logging
        ...otherProps
    } = props;

    const lastUpdateTimeRef = useRef(0);
    const lastStakeUpdateRef = useRef({}); // Track last update time for each claim stake
    const pendingUpdatesRef = useRef({}); // Store pending updates to batch them

    // Use useRef for stable reference to the disableLogging prop
    const disableLoggingRef = useRef(disableLogging);

    // Update the ref when the prop changes
    useEffect(() => {
        disableLoggingRef.current = disableLogging;
    }, [disableLogging]);

    const logger = (message, data) => {
        if (!disableLoggingRef.current) {
            if (data) {
                console.log(`⛽ FuelManager: ${message}`, data);
            } else {
                console.log(`⛽ FuelManager: ${message}`);
            }
        }
    };

    // Apply the accumulated updates in a batch to minimize re-renders
    const flushPendingUpdates = (force = false) => {
        const now = Date.now();
        const minUpdateInterval = force ? 0 : 1000; // At most once per second unless forced

        Object.entries(pendingUpdatesRef.current).forEach(([stakeId, update]) => {
            const lastUpdateTime = lastStakeUpdateRef.current[stakeId] || 0;

            // Only update if enough time has passed or it's a forced update
            if (force || now - lastUpdateTime >= minUpdateInterval) {
                // Apply the update
                onUpdateClaimStake(update);

                // Update the last update time
                lastStakeUpdateRef.current[stakeId] = now;

                // Clear this pending update
                delete pendingUpdatesRef.current[stakeId];
            }
        });
    };

    // Handle fuel consumption and resource generation
    useEffect(() => {
        if (!isRunning) {
            // If paused, don't process fuel consumption
            return;
        }

        const processClaimStake = (timestamp, claimStake) => {
            if (!claimStake || !claimStake.id) {
                return; // Skip if claim stake is invalid
            }

            // Get elapsed time since last update
            const deltaTime = lastUpdateTimeRef.current
                ? (timestamp - lastUpdateTimeRef.current) / 1000
                : 0;

            // Skip processing if too little time has passed
            if (deltaTime < 0.05) {
                return;
            }

            // Adjust delta time based on time speed
            const adjustedDelta = deltaTime * timeSpeed;

            // Get current fuel
            const currentFuel = claimStake.resources?.['cargo-fuel'] || 0;

            // Calculate fuel consumption based on building power requirements
            const buildings = claimStake.buildings || [];
            const totalPower = buildings.reduce((total, buildingId) => {
                // Get building data
                const building = gameData.claimStakeBuildings?.[buildingId];
                if (building && building.power) {
                    return total + (building.power < 0 ? Math.abs(building.power) : 0);
                }
                return total;
            }, 0);

            // Calculate fuel consumption rate (simplified formula)
            const fuelConsumptionRate = totalPower * 0.02; // Fuel per second
            const fuelConsumed = fuelConsumptionRate * adjustedDelta;

            // Create a local update object to track changes
            const updatedResources = {};
            let hasFuel = currentFuel > fuelConsumed;
            let newFuelAmount = Math.max(0, currentFuel - fuelConsumed);

            // Calculate extraction rates based on operational status
            const extractionRates = {};
            if (hasFuel) {
                // Only calculate extraction if we have fuel
                buildings.forEach(buildingId => {
                    const building = gameData.claimStakeBuildings?.[buildingId];
                    if (building && building.resourceExtractionRate) {
                        Object.entries(building.resourceExtractionRate).forEach(([resource, rate]) => {
                            extractionRates[resource] = (extractionRates[resource] || 0) + rate;
                        });
                    }
                });
            }

            // Update the fuel amount
            updatedResources['cargo-fuel'] = newFuelAmount;

            // Calculate fuel percentage for UI status
            const fuelPercentage = Math.min(100, Math.max(0, (newFuelAmount / (claimStake.definition?.tier * 1000)) * 100));

            // Add the update to pending updates instead of applying immediately
            pendingUpdatesRef.current[claimStake.id] = {
                id: claimStake.id,
                resources: updatedResources,
                status: {
                    power: {
                        fuelStatus: fuelPercentage,
                        operational: hasFuel
                    },
                    resources: extractionRates
                }
            };
        };

        // Set up the animation frame loop
        let animationFrameId;
        let lastFlushTime = 0;

        const updateStake = (timestamp) => {
            // Process each claim stake
            claimStakes.forEach(stake => processClaimStake(timestamp, stake));

            // Store last update time
            lastUpdateTimeRef.current = timestamp;

            // Only flush pending updates every 500ms to reduce re-renders
            if (timestamp - lastFlushTime > 500) {
                flushPendingUpdates();
                lastFlushTime = timestamp;
            }

            // Schedule next update
            animationFrameId = requestAnimationFrame(updateStake);
        };

        // Start the animation loop
        animationFrameId = requestAnimationFrame(updateStake);

        // Initialize lastUpdateTimeRef if it's not already set
        if (!lastUpdateTimeRef.current) {
            lastUpdateTimeRef.current = performance.now();
        }

        // Cleanup on unmount
        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            // Flush any remaining updates
            flushPendingUpdates(true);
        };
    }, [claimStakes, gameData, onUpdateClaimStake, addNotification, isRunning, timeSpeed]);

    // This component doesn't render anything
    return null;
};

export default FuelConsumptionManager; 