import React, { useMemo } from 'react';
import ResourceCalculationService from '../services/ResourceCalculationService';
import { getGameData } from '../utils/gameDataLoader';

const BuildingConstructionValidator = ({
    buildingId,
    claimStake,
    gameData,
    globalResources,
    onConstruct,
    onCancel
}) => {
    const validation = useMemo(() => {
        if (!buildingId || !claimStake) return null;

        // Get building definition
        const buildingsData = gameData?.claimStakeBuildings ||
            (gameData?.data && gameData.data.claimStakeBuildings) || {};

        const baseId = buildingId.replace(/^claimStakeBuilding-/, '');
        const building = buildingsData[baseId] || buildingsData[buildingId];

        if (!building) {
            return {
                building: null,
                canConstruct: false,
                issues: ['Building definition not found']
            };
        }

        // Use ResourceCalculationService for proper calculations
        const currentPower = ResourceCalculationService.calculateNetPower(claimStake);
        const availableCrew = ResourceCalculationService.calculateAvailableCrew(claimStake);

        // Calculate slots properly using claim stake definition
        const totalSlots = claimStake.definition?.slots || claimStake.slots || 0;

        // Calculate used slots by summing up actual slot requirements of all buildings
        const usedSlots = (claimStake.buildings || []).reduce((total, buildingId) => {
            const building = buildingsData[buildingId.replace(/^claimStakeBuilding-/, '')] ||
                buildingsData[buildingId];
            return total + (building?.slots || 1); // Default to 1 slot if not specified
        }, 0);

        const availableSlots = totalSlots - usedSlots;

        // Validate prerequisites
        const result = ResourceCalculationService.validateConstructionPrerequisites(
            building,
            claimStake,
            claimStake.resources || {}
        );

        return {
            building,
            currentPower,
            availableCrew,
            totalSlots,
            usedSlots,
            availableSlots,
            ...result
        };
    }, [buildingId, claimStake, gameData, globalResources]);

    if (!validation) {
        return <div>Loading...</div>;
    }

    const {
        building,
        canConstruct,
        issues,
        currentPower,
        availableCrew,
        totalSlots,
        usedSlots,
        availableSlots
    } = validation;

    if (!building) {
        return (
            <div className="construction-validator-sidebar">
                <div className="sidebar-header">
                    <h3>❌ Building Not Found</h3>
                    <button onClick={onCancel} className="close-sidebar-btn">✕</button>
                </div>
                <div className="sidebar-content">
                    <div className="validation-error">
                        <p>Could not find building definition for: {buildingId}</p>
                    </div>
                </div>
                <div className="sidebar-footer">
                    <button onClick={onCancel} className="cancel-btn">Close</button>
                </div>
            </div>
        );
    }

    const requiredPower = Math.abs(building.power || 0);
    const neededCrew = building.neededCrew || 0;
    const requiredSlots = building.slots || 1;

    return (
        <div className="construction-validator-sidebar">
            <div className="sidebar-header">
                <h3>Construction Requirements</h3>
                <button onClick={onCancel} className="close-sidebar-btn">✕</button>
            </div>

            <div className="sidebar-content">
                <div className="building-info">
                    <h4>{building.name || building.id}</h4>
                    <p className="building-description">
                        {building.description || 'Tier 1 extraction hub'}
                    </p>
                </div>

                <div className="prerequisites-section">
                    <h5>Prerequisites Check:</h5>

                    {/* Power Check */}
                    {building.power && building.power < 0 && (
                        <div className={`prerequisite-item ${currentPower >= requiredPower ? 'valid' : 'invalid'}`}>
                            <span className="prerequisite-icon">
                                {currentPower >= requiredPower ? '✅' : '❌'}
                            </span>
                            <span className="prerequisite-text">
                                Power: {currentPower} / {requiredPower} required
                            </span>
                        </div>
                    )}

                    {/* Crew Check */}
                    {neededCrew > 0 && (
                        <div className={`prerequisite-item ${availableCrew >= neededCrew ? 'valid' : 'invalid'}`}>
                            <span className="prerequisite-icon">
                                {availableCrew >= neededCrew ? '✅' : '❌'}
                            </span>
                            <span className="prerequisite-text">
                                Crew: {availableCrew} / {neededCrew} required
                            </span>
                        </div>
                    )}

                    {/* Slots Check */}
                    <div className={`prerequisite-item ${availableSlots >= requiredSlots ? 'valid' : 'invalid'}`}>
                        <span className="prerequisite-icon">
                            {availableSlots >= requiredSlots ? '✅' : '❌'}
                        </span>
                        <span className="prerequisite-text">
                            Slots: {availableSlots} / {requiredSlots} required
                        </span>
                    </div>

                    {/* Resource Costs */}
                    {building.constructionCost && Object.keys(building.constructionCost).length > 0 && (
                        <div className="resource-costs-section">
                            <h6>Resource Costs:</h6>
                            {Object.entries(building.constructionCost).map(([resourceId, cost]) => {
                                // Handle both simple amounts and resource objects like ClaimStakeStatus does
                                const localResourceData = claimStake.resources?.[resourceId];
                                const localAmount = typeof localResourceData === 'object' && localResourceData.amount !== undefined
                                    ? localResourceData.amount
                                    : (typeof localResourceData === 'number' ? localResourceData : 0);

                                const globalResourceData = globalResources?.[resourceId];
                                const globalAmount = typeof globalResourceData === 'object' && globalResourceData.amount !== undefined
                                    ? globalResourceData.amount
                                    : (typeof globalResourceData === 'number' ? globalResourceData : 0);

                                const available = localAmount + globalAmount;
                                const hasEnough = available >= cost;

                                return (
                                    <div key={resourceId} className={`prerequisite-item ${hasEnough ? 'valid' : 'invalid'}`}>
                                        <span className="prerequisite-icon">
                                            {hasEnough ? '✅' : '❌'}
                                        </span>
                                        <span className="prerequisite-text">
                                            {resourceId.replace('cargo-', '')}: {available.toFixed(1)} / {cost} required
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {issues.length > 0 && (
                    <div className="validation-issues">
                        <h5>Issues to Resolve:</h5>
                        <ul>
                            {issues.map((issue, index) => (
                                <li key={index} className="issue-item">❌ {issue}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Debug info for slots */}
                <div className="debug-info" style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
                    <p>Debug: Total slots: {totalSlots}, Used: {usedSlots}, Available: {availableSlots}</p>
                    <p>Claim stake buildings: {claimStake.buildings?.length || 0}</p>
                </div>
            </div>

            <div className="sidebar-footer">
                <button
                    onClick={onConstruct}
                    disabled={!canConstruct}
                    className={`construct-btn ${canConstruct ? 'enabled' : 'disabled'}`}
                >
                    {canConstruct ? 'Construct Building' : 'Cannot Construct'}
                </button>
                <button onClick={onCancel} className="cancel-btn">Cancel</button>
            </div>
        </div>
    );
};

export default BuildingConstructionValidator; 