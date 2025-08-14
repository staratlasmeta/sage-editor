import React, { useEffect, useRef } from 'react';

const FuelConsumer = ({
    claimStake,
    isRunning,
    onUpdateClaimStake
}) => {
    const lastTimeRef = useRef(performance.now());
    const consumptionIntervalRef = useRef(null);

    // Set up fuel consumption based on play/pause state
    useEffect(() => {
        if (!claimStake) return;

        // Clear any existing interval
        if (consumptionIntervalRef.current) {
            clearInterval(consumptionIntervalRef.current);
            consumptionIntervalRef.current = null;
        }

        // Only consume fuel when the game is RUNNING
        if (isRunning) {
            // Get the current fuel level
            const currentFuel = claimStake.resources?.['cargo-fuel'] || 0;

            // Calculate fuel consumption rate
            let fuelConsumptionRate = 0;

            // Process buildings to calculate consumption rate
            if (claimStake.buildings && Array.isArray(claimStake.buildings)) {
                claimStake.buildings.forEach(building => {
                    const buildingId = typeof building === 'string' ? building : building.id;

                    if (buildingId && typeof buildingId === 'string') {
                        if (buildingId.includes('central-hub')) {
                            fuelConsumptionRate += 0.1;
                        }
                        else if (buildingId.includes('power-plant')) {
                            fuelConsumptionRate += 0.1;
                        }
                    }
                });
            }

            // Only set up consumption if we have buildings that consume fuel
            if (fuelConsumptionRate > 0) {
                // Set up interval to consume fuel (every second)
                consumptionIntervalRef.current = setInterval(() => {
                    // Get the latest fuel value (in case it changed)
                    const latestFuel = claimStake.resources?.['cargo-fuel'] || 0;

                    // Calculate how much fuel to consume
                    const newFuelAmount = Math.max(0, latestFuel - fuelConsumptionRate);

                    // Only update if there's a meaningful change
                    if (Math.abs(newFuelAmount - latestFuel) > 0.01) {
                        // Create a minimal update object
                        const update = {
                            id: claimStake.id,
                            resources: {
                                'cargo-fuel': newFuelAmount
                            },
                            status: {
                                power: {
                                    fuelStatus: newFuelAmount > 0 ? 100 : 0,
                                    operational: newFuelAmount > 0
                                }
                            }
                        };

                        // Send the update
                        onUpdateClaimStake(update);
                    }
                }, 1000);
            }
        }

        // Cleanup function
        return () => {
            if (consumptionIntervalRef.current) {
                clearInterval(consumptionIntervalRef.current);
                consumptionIntervalRef.current = null;
            }
        };
    }, [claimStake, isRunning, onUpdateClaimStake]);

    return null; // This component doesn't render anything
};

export default FuelConsumer; 