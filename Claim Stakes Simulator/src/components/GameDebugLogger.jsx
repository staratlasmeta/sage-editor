import React, { useEffect } from 'react';

/**
 * Debugging component that logs building information and resource extraction rates
 * This component doesn't render anything - it only logs to the console
 */
const GameDebugLogger = ({ claimStake, gameData, isRunning, timeSpeed, disableLogging = false }) => {
    useEffect(() => {
        // Skip all logging if disableLogging is true
        if (disableLogging || !claimStake || !gameData) return;

        console.log('=== GAME DEBUG LOGGER ===');
        console.log('Claim Stake ID:', claimStake.id);
        console.log('Game running:', isRunning);
        console.log('Time Speed:', timeSpeed);

        // Extract buildings data safely
        const buildingsData = gameData.claimStakeBuildings ||
            (gameData.data && gameData.data.claimStakeBuildings) || {};

        console.log('Available buildings data keys:', Object.keys(buildingsData));

        // If the claim stake has buildings, log their details
        if (claimStake.buildings && claimStake.buildings.length > 0) {
            console.log(`Claim stake has ${claimStake.buildings.length} buildings:`, claimStake.buildings);

            claimStake.buildings.forEach(buildingId => {
                const building = buildingsData[buildingId];

                console.log(`\nBuilding: ${buildingId}`);
                if (!building) {
                    console.warn(`  WARNING: Building data not found for ${buildingId}`);
                    return;
                }

                console.log(`  Name: ${building.name}`);
                console.log(`  Description: ${building.description}`);

                // Log resource extraction rates
                if (building.resourceExtractionRate) {
                    console.log('  Resource Extraction Rates:');
                    Object.entries(building.resourceExtractionRate).forEach(([resource, rate]) => {
                        console.log(`    ${resource}: ${rate}/s`);
                    });
                } else {
                    console.log('  No resource extraction rates defined');
                }

                // Log resource processing rates
                if (building.resourceProcessingRate) {
                    console.log('  Resource Processing Rates:');
                    Object.entries(building.resourceProcessingRate).forEach(([resource, rate]) => {
                        console.log(`    ${resource}: ${rate}/s`);
                    });
                }

                // Log fuel consumption
                if (building.resourceRate && building.resourceRate['cargo-fuel']) {
                    console.log(`  Fuel consumption: ${Math.abs(building.resourceRate['cargo-fuel'])}/s`);
                }

                // Log power details
                console.log(`  Power: ${building.power || 0}`);

                // Log crew details
                console.log(`  Crew slots: ${building.crewSlots || 0}`);
                console.log(`  Needed crew: ${building.neededCrew || 0}`);
            });
        } else {
            console.log('Claim stake has no buildings');
        }

        console.log('\nCurrent Resources:');
        console.log(claimStake.resources || {});

        console.log('\nOperational Status:');
        console.log(`  Has fuel: ${(claimStake.resources?.['cargo-fuel'] > 0) ? 'Yes' : 'No'}`);
        console.log(`  Operational: ${claimStake.status?.power?.operational !== false ? 'Yes' : 'No'}`);

        console.log('=== END DEBUG LOG ===');
    }, [claimStake, gameData, isRunning, timeSpeed, disableLogging]);

    return null; // This component doesn't render anything
};

export default GameDebugLogger; 