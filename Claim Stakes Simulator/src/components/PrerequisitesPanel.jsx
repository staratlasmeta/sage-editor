import React, { useMemo } from 'react';
import '../styles/PrerequisitesPanel.css';

/**
 * PrerequisitesPanel - Displays key prerequisites for building construction
 * This component shows important information needed for constructing/upgrading buildings:
 * - Slots usage (used/available)
 * - Crew status (needed/available)
 * - Power status (usage/generation)
 * - Fuel status
 */
const PrerequisitesPanel = ({ claimStake, gameData, globalResources }) => {
    // Extract buildings data with fallbacks - moved outside of conditional
    const buildingsData = gameData?.claimStakeBuildings ||
        (gameData?.data && gameData.data.claimStakeBuildings) || {};

    // Get claim stake definition from gameData directly to ensure we have the right slots value
    const claimStakeDefinitions = gameData?.claimStakeDefinitions ||
        (gameData?.data && gameData.data.claimStakeDefinitions) || {};

    // Get the definition ID from the claim stake and strip any timestamp suffix
    const fullDefinitionId = claimStake?.definitionId || (claimStake?.definition && claimStake.definition.id) || '';

    // Remove timestamp suffix if present (format: baseId-timestamp)
    const definitionId = fullDefinitionId.split('-').length > 4
        ? fullDefinitionId.substring(0, fullDefinitionId.lastIndexOf('-'))
        : fullDefinitionId;

    // Get the definition from gameData using the clean ID
    const definitionFromGameData = definitionId ? claimStakeDefinitions[definitionId] : null;

    // Calculate slot usage with improved fallback handling
    let maxSlots = 0;

    // First check if we can directly access slots from the definition
    if (claimStake?.definition && claimStake.definition.slots !== undefined) {
        maxSlots = parseInt(claimStake.definition.slots, 10) || 0;
    }
    // Then try to get it from gameData using the definition ID
    else if (definitionFromGameData && definitionFromGameData.slots !== undefined) {
        maxSlots = parseInt(definitionFromGameData.slots, 10) || 0;
    }

    // Move all hooks outside conditionals
    const usedSlots = useMemo(() => {
        if (!claimStake || !buildingsData) return 0;

        return (claimStake.buildings || []).reduce((total, buildingId) => {
            // Handle the building ID format consistently
            const building = buildingsData[buildingId.replace(/^claimStakeBuilding-/, '')] ||
                buildingsData[buildingId];
            return total + (building?.slots || 1); // Default to 1 slot if not specified, matching BuildingConstructionValidator
        }, 0);
    }, [claimStake, buildingsData]);

    const totalCrewSlots = useMemo(() => {
        if (!claimStake || !buildingsData) return 0;

        return (claimStake.buildings || []).reduce((total, buildingId) => {
            const building = buildingsData[buildingId];
            return total + (building?.crewSlots || 0);
        }, 0);
    }, [claimStake, buildingsData]);

    const requiredCrew = useMemo(() => {
        if (!claimStake || !buildingsData) return 0;

        return (claimStake.buildings || []).reduce((total, buildingId) => {
            const building = buildingsData[buildingId];
            return total + (building?.neededCrew || 0);
        }, 0);
    }, [claimStake, buildingsData]);

    const powerStats = useMemo(() => {
        if (!claimStake || !buildingsData) return { generation: 0, consumption: 0 };

        return (claimStake.buildings || []).reduce((stats, buildingId) => {
            const building = buildingsData[buildingId];
            if (!building) return stats;

            // If power is positive, it's generation. If negative, it's consumption
            if (building.power > 0) {
                stats.generation += building.power;
            } else if (building.power < 0) {
                stats.consumption += Math.abs(building.power);
            }
            return stats;
        }, { generation: 0, consumption: 0 });
    }, [claimStake, buildingsData]);

    // Early return if we don't have required data
    if (!claimStake || !gameData) {
        return null;
    }

    const availableSlots = maxSlots - usedSlots;
    const slotPercentage = maxSlots > 0 ? (usedSlots / maxSlots) * 100 : 0;

    const availableCrewSlots = totalCrewSlots - requiredCrew;
    const crewPercentage = totalCrewSlots > 0 ? (requiredCrew / totalCrewSlots) * 100 : 0;

    const netPower = powerStats.generation - powerStats.consumption;
    const powerPercentage = powerStats.generation > 0
        ? (powerStats.consumption / powerStats.generation) * 100
        : 0;

    // Calculate fuel status
    const currentFuel = claimStake.resources?.['cargo-fuel']?.amount || claimStake.resources?.['cargo-fuel'] || 0;
    const tier = claimStake.definition?.tier || 1;
    const maxFuelCapacity = tier * 1000; // Full tank is tier * 1000
    const fuelPercentage = Math.min(100, Math.max(0, (currentFuel / maxFuelCapacity) * 100));
    const hasSufficientFuel = currentFuel > 0;
    const isFuelLow = fuelPercentage < 30; // Fuel is considered low when below 30%
    const operational = hasSufficientFuel && (claimStake.status?.power?.operational !== false);

    // Status indicators for visual feedback
    const getStatusIndicator = (value, threshold, reverse = false) => {
        if (reverse) {
            return value <= threshold ? 'good' : value <= threshold * 1.5 ? 'warning' : 'critical';
        } else {
            return value >= threshold ? 'good' : value >= threshold * 0.5 ? 'warning' : 'critical';
        }
    };

    // Handle fuel resupply
    const handleResupplyFuel = () => {
        // Dispatch the resupplyFuel event
        window.dispatchEvent(new CustomEvent('resupplyFuel', {
            detail: {
                claimStakeId: claimStake.id,
                source: 'prereqPanel'
            }
        }));
    };

    const slotStatus = getStatusIndicator(availableSlots, 1, false);
    const crewStatus = availableCrewSlots >= 0 ? 'good' : 'critical';
    const powerStatus = netPower >= 0 ? 'good' : 'critical';
    const fuelStatus = getStatusIndicator(fuelPercentage, 30, false);

    return (
        <div className="prerequisites-panel">
            <div className="prerequisites-container">
                <div className={`prerequisite-item slots-item ${slotStatus}`}>
                    <div className="prerequisite-header">
                        <span className="prerequisite-icon">📊</span>
                        <h3>Slots</h3>
                        <span className="prerequisite-value">{usedSlots}/{maxSlots}</span>
                    </div>
                    <div className="progress-container">
                        <div className="progress-bar" style={{ width: `${slotPercentage}%` }}></div>
                    </div>
                    <div className="prerequisite-detail">
                        <span>{availableSlots} Available</span>
                    </div>
                </div>

                <div className={`prerequisite-item crew-item ${crewStatus}`}>
                    <div className="prerequisite-header">
                        <span className="prerequisite-icon">👥</span>
                        <h3>Crew</h3>
                        <span className="prerequisite-value">{requiredCrew}/{totalCrewSlots}</span>
                    </div>
                    <div className="progress-container">
                        <div className="progress-bar" style={{ width: `${crewPercentage}%` }}></div>
                    </div>
                    <div className="prerequisite-detail">
                        <span>{availableCrewSlots} Available</span>
                    </div>
                </div>

                <div className={`prerequisite-item power-item ${powerStatus}`}>
                    <div className="prerequisite-header">
                        <span className="prerequisite-icon">⚡</span>
                        <h3>Power</h3>
                        <span className="prerequisite-value">
                            {powerStats.generation - powerStats.consumption >= 0 ? '+' : ''}
                            {powerStats.generation - powerStats.consumption}
                        </span>
                    </div>
                    <div className="progress-container">
                        <div className="progress-bar" style={{ width: `${powerPercentage}%` }}></div>
                    </div>
                    <div className="prerequisite-detail">
                        <span>Gen: {powerStats.generation} | Use: {powerStats.consumption}</span>
                    </div>
                </div>

                <div className={`prerequisite-item fuel-item ${fuelStatus}`}>
                    <div className="prerequisite-header">
                        <span className="prerequisite-icon">⛽</span>
                        <h3>Fuel</h3>
                        <span className="prerequisite-value">{Math.floor(currentFuel)}</span>
                    </div>
                    <div className="progress-container">
                        <div className="progress-bar" style={{ width: `${fuelPercentage}%` }}></div>
                    </div>
                    <div className="prerequisite-detail">
                        <span>{operational ? 'Operational' : 'Low Fuel!'}</span>
                        {isFuelLow && (
                            <button
                                className="resupply-fuel-button"
                                onClick={handleResupplyFuel}
                                title="Resupply fuel to maximum capacity"
                            >
                                Resupply Fuel
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrerequisitesPanel; 