import React, { useState, useMemo, useEffect } from 'react';
import '../styles/BuildingPreviewCard.css';

/**
 * BuildingPreviewCard component - A simplified version of BuildingCard
 * specifically for use in the claim stake buildings tab preview
 * 
 * This component only displays information and does not provide functionality
 * to purchase or interact with buildings.
 */
const BuildingPreviewCard = ({
    id,
    building,
    tags,
    availableTiers = [1],
    maxTier,
    unlocked,
    gameData,
    resourceRichness,
    isDirectlyBuildable = true,
    isConstructed = false,
    constructedBuildings = new Set()
}) => {
    // State for the active tier tab
    const [activeTier, setActiveTier] = useState(availableTiers[0] || 1);
    // State for the active content tab (Overview or Production)
    const [activeTab, setActiveTab] = useState('overview');
    // Add state for the resource subtab (produces/consumes)
    const [activeResourceTab, setActiveResourceTab] = useState('produces');

    // Define buildingData at component level so it can be used across multiple hooks
    const buildingData = useMemo(() => {
        const buildingsData = gameData?.claimStakeBuildings || {};
        const possibleIds = [
            `${id}-t${activeTier}`,
            `claimStakeBuilding-${id.replace(/^claimStakeBuilding-/, '')}-t${activeTier}`,
            `${id.replace(/-t\d+$/, '')}-t${activeTier}`,
            `claimStakeBuilding-${id.replace(/^claimStakeBuilding-/, '').replace(/-t\d+$/, '')}-t${activeTier}`
        ];

        for (const possibleId of possibleIds) {
            if (buildingsData[possibleId]) {
                return buildingsData[possibleId];
            }
        }

        return null;
    }, [id, activeTier, gameData]);

    // Debug component to directly analyze the building data
    const BuildingDataDebugger = () => {
        useEffect(() => {
            // Get all available buildings data
            const buildingsData = gameData?.claimStakeBuildings || {};


            // Try all possible ID patterns
            const possibleIds = [
                `${id}-t${activeTier}`,
                `claimStakeBuilding-${id.replace(/^claimStakeBuilding-/, '')}-t${activeTier}`,
                `${id.replace(/-t\d+$/, '')}-t${activeTier}`,
                `claimStakeBuilding-${id.replace(/^claimStakeBuilding-/, '').replace(/-t\d+$/, '')}-t${activeTier}`
            ];

            // Check each possible ID
            possibleIds.forEach(possibleId => {
                const found = buildingsData[possibleId];
            });

            // Check for partial matches in case the format is different
            const partialMatches = Object.keys(buildingsData).filter(key => {
                const cleanId = id.replace(/^claimStakeBuilding-/, '').replace(/-t\d+$/, '');
                return key.includes(cleanId) && key.includes(`-t${activeTier}`);
            });

        }, [activeTier]);

        return null; // This is just for debugging, doesn't render anything
    };

    // Add debugging effect to log key information
    useEffect(() => {

        // Check for valid building data for this tier
        const checkTier = (tier) => {
            const baseId = id.replace(/-t\d+$/, '');
            const tieredBuildingId = `${baseId}-t${tier}`;
            const prefixedId = tieredBuildingId.startsWith('claimStakeBuilding-')
                ? tieredBuildingId
                : `claimStakeBuilding-${tieredBuildingId}`;

            const buildingsData = gameData?.claimStakeBuildings || {};
            const buildingData = buildingsData[tieredBuildingId] || buildingsData[prefixedId];

            // If no data found, log the first 5 keys in the buildings data
            if (!buildingData) {
                const sampleKeys = Object.keys(buildingsData).slice(0, 5);
                // Check for similar IDs
                const similarIds = Object.keys(buildingsData).filter(key =>
                    key.includes(baseId.replace('claimStakeBuilding-', '')) ||
                    key.includes(`t${tier}`)
                ).slice(0, 5);
            }
        };

        // Check each available tier
        availableTiers.forEach(tier => checkTier(tier));
    }, [id, building, availableTiers, gameData, activeTier]);

    // Get the base ID without tier info
    const baseId = useMemo(() => {
        // Remove tier suffix if present
        return id.replace(/-t\d+$/, '');
    }, [id]);

    // Process resource rates based on real-time game state
    const processResourceRateFromGameState = useMemo(() => {
        if (!buildingData) return { inputs: {}, outputs: {} };

        // Categorize resourceRate into inputs (negative values) and outputs (positive values)
        const inputs = {};
        const outputs = {};

        if (buildingData.resourceRate) {
            Object.entries(buildingData.resourceRate).forEach(([resource, rate]) => {
                if (rate < 0) {
                    // Negative rate means consumption (input)
                    inputs[resource] = Math.abs(rate); // Convert to positive for display
                } else if (rate > 0) {
                    // Positive rate means production (output)
                    outputs[resource] = rate;
                }
            });
        }

        return { inputs, outputs };
    }, [buildingData]);

    // Process resource rates from building definition for preview purposes
    const processResourceRateFromDefinition = useMemo(() => {
        const inputs = {};
        const outputs = {};

        if (buildingData) {
            // Process resourceRate (production/consumption)
            if (buildingData.resourceRate) {
                Object.entries(buildingData.resourceRate).forEach(([resource, rate]) => {
                    if (rate < 0) {
                        inputs[resource] = Math.abs(rate);
                    } else if (rate > 0) {
                        outputs[resource] = rate;
                    }
                });
            }

            // Add potential extraction rates as outputs, filtered by planet richness
            if (buildingData.resourceExtractionRate) {
                Object.entries(buildingData.resourceExtractionRate).forEach(([resource, rate]) => {
                    const resourceKey = resource.toLowerCase();
                    const baseName = resourceKey.replace('cargo-', '');

                    // Try multiple variants of the resource name to find the richness
                    const variants = [
                        baseName,                      // "hydrogen"
                        baseName.toLowerCase(),       // "hydrogen" (lowercase)
                        `cargo-${baseName}`,          // "cargo-hydrogen"
                        `cargo-${baseName.toLowerCase()}`,  // "cargo-hydrogen" (lowercase)
                        resourceKey                   // Original resource key "cargo-hydrogen"
                    ];

                    // Try to match resource name to a richness value
                    let richness = 0;

                    for (const variant of variants) {
                        if (variant in resourceRichness) {
                            richness = resourceRichness[variant];
                            break;
                        }
                    }

                    // Also try a case-insensitive search through the keys
                    if (richness === 0 && resourceRichness) {
                        const lowerResourceKeys = Object.keys(resourceRichness).map(k => k.toLowerCase());
                        for (const variant of variants) {
                            const index = lowerResourceKeys.indexOf(variant.toLowerCase());
                            if (index !== -1) {
                                const originalKey = Object.keys(resourceRichness)[index];
                                richness = resourceRichness[originalKey];
                                break;
                            }
                        }
                    }

                    // Only include resources with positive richness
                    if (richness > 0) {
                        const effectiveRate = rate * richness;
                        if (effectiveRate > 0) {
                            outputs[resource] = effectiveRate;
                        }
                    }
                });
            }
        }

        return { inputs, outputs };
    }, [buildingData, resourceRichness]);

    // Always use the definition-based resource rates for preview card
    const combinedResourceRate = processResourceRateFromDefinition;

    // Helper function to format resource name for display
    const formatResourceName = (resource) => {
        return resource.replace('cargo-', '').split('-').map(
            word => word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    // Helper function to handle tier tab click
    const handleTierClick = (tier) => {
        setActiveTier(tier);
    };

    // Handle content tab click
    const handleTabClick = (tab) => {
        setActiveTab(tab);
    };

    // Process required buildings to show only the highest tier of each building
    const processRequiredBuildings = (requiredBuildings) => {
        if (!requiredBuildings || !Array.isArray(requiredBuildings) || requiredBuildings.length === 0) {
            return [];
        }

        // Create a map to track the highest tier for each building base name
        const highestTierMap = new Map();

        requiredBuildings.forEach(buildingName => {
            // Extract base name and tier using regex
            const match = buildingName.match(/^(.*?)\s*T(\d+)$/);

            if (match) {
                const baseName = match[1].trim();
                const tier = parseInt(match[2], 10);

                // Update map if this tier is higher than previously recorded
                if (!highestTierMap.has(baseName) || tier > highestTierMap.get(baseName).tier) {
                    highestTierMap.set(baseName, { tier, fullName: buildingName });
                }
            } else {
                // Handle buildings without tier in the name
                highestTierMap.set(buildingName, { tier: 1, fullName: buildingName });
            }
        });

        // Convert map back to array of building names
        return Array.from(highestTierMap.values()).map(entry => entry.fullName);
    };

    return (
        <div className={`building-preview-card ${buildingData ? '' : 'locked'} ${isConstructed ? 'constructed' : ''}`}>
            {/* Render the debugger */}
            <BuildingDataDebugger />

            <div className="building-preview-header">
                <h3 className="building-name">
                    {building.name || 'Unknown Building'}
                </h3>
            </div>

            {/* Tier tabs in their own row - only show if we have multiple tiers */}
            {availableTiers.length > 1 && (
                <div className="tier-tabs-row">
                    <div className="tier-tabs">
                        {availableTiers.map(tier => (
                            <button
                                key={tier}
                                className={`tier-tab ${tier === activeTier ? 'active' : ''}`}
                                onClick={() => handleTierClick(tier)}
                            >
                                T{tier}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Content tabs (Overview/Production) */}
            <div className="content-tabs">
                <button
                    className={`content-tab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => handleTabClick('overview')}
                >
                    Overview
                </button>
                <button
                    className={`content-tab ${activeTab === 'production' ? 'active' : ''}`}
                    onClick={() => handleTabClick('production')}
                >
                    Production
                </button>
            </div>

            {/* Card Content */}
            <div className="building-preview-content">
                {/* Overview Tab Content */}
                {activeTab === 'overview' && (
                    <>
                        {/* Required Buildings Section - Only showing highest tier of each building */}
                        {building.requiredBuildings && building.requiredBuildings.length > 0 && (
                            <div className="building-prerequisites">
                                <h4>Required Buildings:</h4>
                                <ul className="prerequisite-list">
                                    {processRequiredBuildings(building.requiredBuildings).map((buildingName, index) => (
                                        <li key={index} className="prerequisite-item">
                                            {buildingName}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Warning for non-directly buildable buildings without listed prerequisites */}
                        {!isDirectlyBuildable && (!building.requiredBuildings || building.requiredBuildings.length === 0) && (
                            <div className="prerequisite-notice">
                                <span className="prerequisite-icon">⚠️</span>
                                <span>Requires prerequisite buildings</span>
                            </div>
                        )}

                        {/* Building stats */}
                        {buildingData && (
                            <div className="building-prerequisites">
                                <h4>Building Stats:</h4>
                                <div className="building-stats-content">
                                    <div className="stat-row">
                                        <span className="stat-name">Power:</span>
                                        <span className={`stat-value ${buildingData.power >= 0 ? 'positive' : 'negative'}`}>
                                            {buildingData.power >= 0 ? `+${buildingData.power}` : buildingData.power}
                                        </span>
                                    </div>
                                    <div className="stat-row">
                                        <span className="stat-name">Crew:</span>
                                        <span className="stat-value">{buildingData.neededCrew || 0}</span>
                                    </div>
                                    <div className="stat-row">
                                        <span className="stat-name">Storage:</span>
                                        <span className="stat-value">{buildingData.storage || 0}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Production Tab Content */}
                {activeTab === 'production' && (
                    <>
                        {/* Resource production and consumption with subtabs */}
                        {(Object.keys(combinedResourceRate.outputs).length > 0 || Object.keys(combinedResourceRate.inputs).length > 0) && (
                            <div className="resource-subtabs-container">
                                {/* Header with subtabs */}
                                <div className="resource-subtabs-heading">
                                    <span className="stat-name">Resources:</span>
                                    <div className="resource-subtabs">
                                        <button
                                            className={`resource-subtab ${activeResourceTab === 'produces' ? 'active' : ''}`}
                                            onClick={() => setActiveResourceTab('produces')}
                                        >
                                            Produces
                                        </button>
                                        <button
                                            className={`resource-subtab ${activeResourceTab === 'consumes' ? 'active' : ''}`}
                                            onClick={() => setActiveResourceTab('consumes')}
                                        >
                                            Consumes
                                        </button>
                                    </div>
                                </div>

                                {/* Resource flow content based on active subtab */}
                                <div className="resource-flow-content">
                                    {/* Production view */}
                                    {activeResourceTab === 'produces' && Object.keys(combinedResourceRate.outputs).length > 0 && (
                                        <div className="resource-flow">
                                            {Object.entries(combinedResourceRate.outputs).map(([resource, rate]) => (
                                                <div key={resource} className="stat-row">
                                                    <span className="stat-name">{formatResourceName(resource)}:</span>
                                                    <span className="stat-value positive">+{rate}/s (potential)</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Consumption view */}
                                    {activeResourceTab === 'consumes' && Object.keys(combinedResourceRate.inputs).length > 0 && (
                                        <div className="resource-flow">
                                            {Object.entries(combinedResourceRate.inputs).map(([resource, rate]) => (
                                                <div key={resource} className="stat-row">
                                                    <span className="stat-name">{formatResourceName(resource)}:</span>
                                                    <span className="stat-value negative">-{rate}/s (potential)</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Empty state messages */}
                                    {activeResourceTab === 'produces' && Object.keys(combinedResourceRate.outputs).length === 0 && (
                                        <div className="empty-state">This building doesn't produce any resources</div>
                                    )}
                                    {activeResourceTab === 'consumes' && Object.keys(combinedResourceRate.inputs).length === 0 && (
                                        <div className="empty-state">This building doesn't consume any resources</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* If there's no production or consumption data, show a "No data" message */}
                        {!buildingData && (
                            <div className="no-data-message">
                                <span className="info-icon">ℹ️</span>
                                <span>No data for tier {activeTier}</span>
                            </div>
                        )}

                        {/* If building data exists but there are no resources at all */}
                        {buildingData &&
                            Object.keys(combinedResourceRate.outputs).length === 0 &&
                            Object.keys(combinedResourceRate.inputs).length === 0 && (
                                <div className="no-data-message">
                                    <span className="info-icon">ℹ️</span>
                                    <span>No resource data for tier {activeTier}</span>
                                </div>
                            )}
                    </>
                )}

                {/* Tier limit warning */}
                {maxTier && activeTier > maxTier && (
                    <div className="tier-limit-overlay">
                        <div className="tier-limit-message">
                            <span className="warning-icon">⚠️</span>
                            <span>Requires claim stake tier {activeTier}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BuildingPreviewCard; 