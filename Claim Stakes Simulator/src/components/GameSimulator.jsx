import React, { useState, useEffect, useMemo } from 'react';
import ClaimStakeStatus from './ClaimStakeStatus';
import BuildingCard from './BuildingCard';

/**
 * GameSimulator - UI Component for displaying claim stake information
 * Backend simulation is now handled by CentralizedSimulationService
 * This component focuses purely on UI rendering and data display
 */
const GameSimulator = ({
    initialClaimStake,
    gameData,
    onUpdate,
    globalResources,
    onUpdateAvailableTags,
    onConstructionComplete
}) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [buildingFilter, setBuildingFilter] = useState('all');

    // Calculate effective resource richness with fallback
    const effectiveResourceRichness = useMemo(() => {
        // If resourceRichness is provided on claim stake and not empty, use it
        if (initialClaimStake?.resourceRichness && Object.keys(initialClaimStake.resourceRichness).length > 0) {
            console.log('[GameSimulator] Using provided resourceRichness from claim stake:', Object.keys(initialClaimStake.resourceRichness));
            return initialClaimStake.resourceRichness;
        }

        // Otherwise, calculate it from the claim stake and game data
        console.log('[GameSimulator] resourceRichness not provided, calculating from claim stake data');
        console.log('[GameSimulator] claimStake.id:', initialClaimStake?.id);

        if (!initialClaimStake || !gameData) {
            console.log('[GameSimulator] Cannot calculate resourceRichness: missing claimStake or gameData');
            return {};
        }

        // Access planet archetypes from the correct location (nested under data)
        const planetArchetypesData = gameData.planetArchetypes || gameData.data?.planetArchetypes;

        if (!planetArchetypesData) {
            console.log('[GameSimulator] No planet archetypes data found in gameData');
            return {};
        }

        console.log('[GameSimulator] Found planet archetypes, count:', Object.keys(planetArchetypesData).length);

        // Try to get planet archetype from the claim stake
        let planetArchetype = null;

        // Method 1: Check if claim stake has planet archetype directly
        if (initialClaimStake.planetArchetype) {
            console.log('[GameSimulator] Method 1: Using direct planetArchetype from claimStake');
            planetArchetype = initialClaimStake.planetArchetype;
        }
        // Method 2: Find planet archetype based on claim stake definition tags
        else if (initialClaimStake.definition?.requiredTags) {
            console.log('[GameSimulator] Method 2: Looking up by definition requiredTags:', initialClaimStake.definition.requiredTags);
            const requiredTags = initialClaimStake.definition.requiredTags;
            planetArchetype = Object.values(planetArchetypesData).find(archetype => {
                return requiredTags.every(tag => archetype.tags && archetype.tags.includes(tag));
            });
            if (planetArchetype) {
                console.log('[GameSimulator] Found archetype via definition tags:', planetArchetype.id);
            }
        }
        // Method 3: Find planet archetype based on claim stake ID
        else if (initialClaimStake.id) {
            console.log('[GameSimulator] Method 3: Parsing claimStake ID:', initialClaimStake.id);

            // Extract planet type and faction from claim stake ID
            const idParts = initialClaimStake.id.split('-');
            console.log('[GameSimulator] ID parts:', idParts);

            let planetTypeTag = null;
            let factionTag = null;

            // Look for planet type tags
            for (const part of idParts) {
                if (['terrestrial', 'barren', 'volcanic', 'ice', 'gas', 'asteroid', 'dark'].some(type => part.includes(type))) {
                    planetTypeTag = `tag-${part}`;
                    console.log('[GameSimulator] Found planet type tag:', planetTypeTag);
                    break;
                }
            }

            // Look for faction tags
            for (const part of idParts) {
                if (['oni', 'mud', 'ustur'].includes(part.toLowerCase())) {
                    factionTag = `tag-${part.toLowerCase()}`;
                    console.log('[GameSimulator] Found faction tag:', factionTag);
                    break;
                }
            }

            if (planetTypeTag && factionTag) {
                console.log('[GameSimulator] Searching for archetype with tags:', planetTypeTag, factionTag);

                // Log all available archetypes for debugging
                const availableArchetypes = Object.values(planetArchetypesData).map(arch => ({
                    id: arch.id,
                    tags: arch.tags
                }));
                console.log('[GameSimulator] Available archetypes:', availableArchetypes);

                planetArchetype = Object.values(planetArchetypesData).find(archetype => {
                    const hasRequiredTags = archetype.tags &&
                        archetype.tags.includes(planetTypeTag) &&
                        archetype.tags.includes(factionTag);

                    if (hasRequiredTags) {
                        console.log('[GameSimulator] Found matching archetype:', archetype.id, 'with tags:', archetype.tags);
                    }

                    return hasRequiredTags;
                });
            } else {
                console.log('[GameSimulator] Could not extract both planet type and faction from ID');
            }
        }

        if (planetArchetype && planetArchetype.richness) {
            console.log('[GameSimulator] Found planet archetype, using richness data:', Object.keys(planetArchetype.richness));
            return planetArchetype.richness;
        }

        console.log('[GameSimulator] Could not determine planet archetype, using empty richness');
        return {};
    }, [initialClaimStake, gameData]);

    //console.log('[GameSimulator] UI Component rendering with claim stake:', initialClaimStake?.id);

    if (!initialClaimStake) {
        return (
            <div className="game-simulator empty-state">
                <div className="empty-state-message">
                    <h2>No Claim Stake Selected</h2>
                    <p>Purchase or select a claim stake to begin managing your operations.</p>
                </div>
            </div>
        );
    }

    if (!gameData) {
        return (
            <div className="game-simulator empty-state">
                <div className="loading-message">
                    <h2>Loading Game Data...</h2>
                    <p>Please wait while the game data loads.</p>
                </div>
            </div>
        );
    }

    // Render the buildings management view
    const renderBuildingsTab = () => {
        const buildingsData = gameData?.claimStakeBuildings || {};
        const planetArchetypes = gameData?.planetArchetypes || {};
        const claimStakeDefinitions = gameData?.claimStakeDefinitions || {};

        // Get comprehensive tag list including all sources
        const getAllAvailableTags = () => {
            let allTags = [];

            // 1. Tags from claim stake definition
            const claimStakeDefinition = claimStakeDefinitions[initialClaimStake?.claimStakeDefinition];
            if (claimStakeDefinition?.addedTags) {
                allTags.push(...claimStakeDefinition.addedTags);
            }
            if (claimStakeDefinition?.requiredTags) {
                allTags.push(...claimStakeDefinition.requiredTags);
            }

            // Debug logging for claim stake definition
            // console.log('[Tags Debug] Claim stake definition:', claimStakeDefinition);
            // console.log('[Tags Debug] Initial tags from claim stake:', allTags);

            // 2. Tags from planet archetype (find matching archetype)
            const requiredTags = claimStakeDefinition?.requiredTags || [];
            const planetTypeTag = requiredTags.find(tag =>
                tag.startsWith('tag-') && !['tag-oni', 'tag-mud', 'tag-ustur'].includes(tag)
            );
            const factionTag = requiredTags.find(tag =>
                ['tag-oni', 'tag-mud', 'tag-ustur'].includes(tag)
            );

            // console.log('[Tags Debug] Planet type tag:', planetTypeTag);
            // console.log('[Tags Debug] Faction tag:', factionTag);

            if (planetTypeTag && factionTag) {
                const planetArchetype = Object.values(planetArchetypes).find(archetype =>
                    archetype.tags?.includes(planetTypeTag) && archetype.tags?.includes(factionTag)
                );
                //console.log('[Tags Debug] Found planet archetype:', planetArchetype);
                if (planetArchetype?.tags) {
                    //console.log('[Tags Debug] Adding planet archetype tags:', planetArchetype.tags);
                    allTags.push(...planetArchetype.tags);
                }
            } else {
                //console.log('[Tags Debug] No valid planet/faction combination found');
                // Let's also log all available planet archetypes for debugging
                //console.log('[Tags Debug] Available planet archetypes:', Object.keys(planetArchetypes));
            }

            // 3. Tags from constructed buildings
            const constructedBuildings = initialClaimStake?.buildings || [];
            //console.log('[Tags Debug] Constructed buildings:', constructedBuildings);
            constructedBuildings.forEach(buildingId => {
                const building = buildingsData[buildingId];
                if (building?.addedTags) {
                    //console.log('[Tags Debug] Adding building tags from', buildingId, ':', building.addedTags);
                    allTags.push(...building.addedTags);
                }
            });

            // 4. Recursive tag resolution - find buildings that can be built with current tags
            let previousLength = -1;
            while (allTags.length > previousLength) {
                previousLength = allTags.length;
                Object.entries(buildingsData).forEach(([id, building]) => {
                    if (!building) return;

                    // Check if building can be unlocked with current tags
                    const canUnlock = !building.requiredTags ||
                        building.requiredTags.every(tag => allTags.includes(tag));

                    if (canUnlock && building.addedTags) {
                        building.addedTags.forEach(tag => {
                            if (!allTags.includes(tag)) {
                                allTags.push(tag);
                            }
                        });
                    }
                });
            }

            //console.log('[Tags Debug] Final available tags:', [...new Set(allTags)]);
            return [...new Set(allTags)]; // Remove duplicates
        };

        const availableTags = getAllAvailableTags();
        const claimStakeTier = initialClaimStake?.tier || 1;

        // Define building filters
        const buildingFilters = [
            { id: 'all', label: 'All' },
            { id: 'central', label: 'Central' },
            { id: 'extraction', label: 'Extraction' },
            { id: 'processing', label: 'Processing' },
            { id: 'farming', label: 'Farming' },
            { id: 'storage', label: 'Storage' },
        ];

        // Building filter functions
        const isCentralBuilding = (building) => {
            // Central tab should show:
            // 1. Central Hub specifically
            // 2. Modules (non-hub buildings) that only require central hub tags

            // Include Central Hub specifically
            if (building.name?.toLowerCase().includes('central hub')) return true;

            // Exclude all other hubs
            if (building.name?.toLowerCase().includes('hub')) return false;

            // Check if it requires central hub tags specifically
            if (!building.requiredTags || building.requiredTags.length === 0) return false;

            // Should only require central hub related tags
            const requiresCentralHub = building.requiredTags.some(tag =>
                tag.includes('central-hub') || tag.includes('central')
            );

            // Should NOT require extraction, processing, farming, or storage hub tags
            const requiresOtherHub = building.requiredTags.some(tag =>
                tag.includes('extraction-hub') ||
                tag.includes('processing-hub') ||
                tag.includes('farming-hub') ||
                tag.includes('storage-hub')
            );

            return requiresCentralHub && !requiresOtherHub;
        };

        const isExtractionBuilding = (building) => {
            // Extraction tab should show buildings that require extraction hub tags
            if (!building.requiredTags) return false;

            return building.requiredTags.some(tag => tag.includes('extraction-hub')) ||
                building.name?.toLowerCase().includes('extraction') ||
                building.name?.toLowerCase().includes('extractor');
        };

        const isProcessingBuilding = (building) => {
            // Processing tab should show buildings that require processing hub tags
            if (!building.requiredTags) return false;

            return building.requiredTags.some(tag => tag.includes('processing-hub')) ||
                building.name?.toLowerCase().includes('processing') ||
                building.name?.toLowerCase().includes('processor');
        };

        const isFarmingBuilding = (building) => {
            // Farming tab should show buildings that require farming hub tags
            if (!building.requiredTags) return false;

            return building.requiredTags.some(tag => tag.includes('farming-hub')) ||
                building.name?.toLowerCase().includes('farm');
        };

        const isStorageBuilding = (building) => {
            // Storage tab should show buildings that require storage hub tags
            if (!building.requiredTags) return false;

            return building.requiredTags.some(tag => tag.includes('storage-hub')) ||
                building.name?.toLowerCase().includes('storage');
        };

        // Get unique available buildings (deduplicated by base type)
        const getUniqueAvailableBuildings = () => {
            const uniqueBuildings = {};

            //console.log('[Buildings Debug] Available tags:', availableTags);
            //console.log('[Buildings Debug] Claim stake tier:', claimStakeTier);

            Object.entries(buildingsData).forEach(([id, building]) => {
                if (!building) return;

                // Check tier requirement
                if (building.minimumTier && building.minimumTier > claimStakeTier) {
                    //console.log(`[Buildings Debug] ${building.name} blocked by tier: needs ${building.minimumTier}, have ${claimStakeTier}`);
                    return;
                }

                // Check if all required tags are present
                if (building.requiredTags && building.requiredTags.length > 0) {
                    const hasAllTags = building.requiredTags.every(tag => availableTags.includes(tag));
                    if (!hasAllTags) {
                        const missingTags = building.requiredTags.filter(tag => !availableTags.includes(tag));
                        //console.log(`[Buildings Debug] ${building.name} blocked by missing tags:`, missingTags);
                        return;
                    }
                    //console.log(`[Buildings Debug] ${building.name} unlocked by tags:`, building.requiredTags);
                } else {
                    //console.log(`[Buildings Debug] ${building.name} has no required tags`);
                }

                // Get base building ID (without tier)
                const baseId = id.replace(/-t\d+$/, '');

                // Only keep the T1 version for display (or lowest tier available)
                if (!uniqueBuildings[baseId] || id.includes('-t1')) {
                    uniqueBuildings[baseId] = {
                        id,
                        building,
                        baseId
                    };
                    //console.log(`[Buildings Debug] Added unique building: ${building.name} (${id})`);
                }
            });

            const result = Object.values(uniqueBuildings);
            //console.log(`[Buildings Debug] Total unique buildings available: ${result.length}`);

            return result;
        };

        const availableBuildings = getUniqueAvailableBuildings();

        // Filter buildings based on selected filter
        const filteredBuildings = availableBuildings.filter(({ building }) => {
            switch (buildingFilter) {
                case 'all':
                    return true;
                case 'central':
                    return isCentralBuilding(building);
                case 'extraction':
                    return isExtractionBuilding(building);
                case 'processing':
                    return isProcessingBuilding(building);
                case 'farming':
                    return isFarmingBuilding(building);
                case 'storage':
                    return isStorageBuilding(building);
                default:
                    return true;
            }
        });

        return (
            <div className="buildings-content">
                <h3>Available Buildings ({filteredBuildings.length} of {availableBuildings.length})</h3>

                {/* Filter tabs */}
                <div className="building-filter-tabs">
                    {buildingFilters.map(filter => (
                        <button
                            key={filter.id}
                            className={`building-filter-tab ${buildingFilter === filter.id ? 'active' : ''}`}
                            onClick={() => setBuildingFilter(filter.id)}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                <div className="building-cards-container">
                    {filteredBuildings.length > 0 ? (
                        filteredBuildings.map(({ id: buildingId, building: buildingData }) => {
                            // Extract tier from building ID
                            const tierMatch = buildingId.match(/-t(\d+)/);
                            const currentTier = tierMatch ? parseInt(tierMatch[1]) : 1;

                            // Check if this building is already constructed
                            const constructedBuildings = initialClaimStake?.buildings || [];
                            const isAlreadyConstructed = constructedBuildings.includes(buildingId);

                            return (
                                <BuildingCard
                                    key={buildingId}
                                    id={buildingId}
                                    building={buildingData}
                                    currentTier={currentTier}
                                    isAlreadyConstructed={isAlreadyConstructed}
                                    isHub={buildingData.name?.toLowerCase().includes('hub')}
                                    buildingsList={constructedBuildings}
                                    gameData={gameData}
                                    resources={initialClaimStake.resources}
                                    globalResources={globalResources}
                                    onSelect={onConstructionComplete}
                                    maxTier={claimStakeTier}
                                    resourceRichness={effectiveResourceRichness}
                                    claimStakeId={initialClaimStake.id}
                                    claimStakeDefinitionId={initialClaimStake.claimStakeDefinition}
                                    underConstructionList={[]}
                                    onReceiveResources={(resources) => {
                                        console.log('Receiving resources:', resources);

                                        // Create updated resources object
                                        const updatedResources = {
                                            ...(initialClaimStake.resources || {}),
                                        };

                                        // Add the received resources
                                        Object.entries(resources).forEach(([resourceId, amount]) => {
                                            const currentAmount = updatedResources[resourceId]?.amount ||
                                                updatedResources[resourceId] || 0;
                                            updatedResources[resourceId] = currentAmount + amount;
                                        });

                                        // Update the claim stake
                                        const updatedClaimStake = {
                                            ...initialClaimStake,
                                            resources: updatedResources
                                        };

                                        // Trigger the update using onUpdate instead of onConstructionComplete
                                        onUpdate(updatedClaimStake);

                                        // Dispatch event to notify BuildingCard
                                        window.dispatchEvent(new CustomEvent('resourcesReceived', {
                                            detail: {
                                                claimStakeId: initialClaimStake.id,
                                                resources: updatedResources
                                            }
                                        }));
                                    }}
                                />
                            );
                        })
                    ) : (
                        <div className="no-buildings-message">
                            No buildings match the selected filter.
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="game-simulator">
            <div className="tab-navigation">
                <button
                    className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button
                    className={`tab-button ${activeTab === 'buildings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('buildings')}
                >
                    Buildings
                </button>
            </div>

            {initialClaimStake && gameData && (
                <div className="simulator-content">
                    {activeTab === 'overview' && (
                        <ClaimStakeStatus
                            claimStake={initialClaimStake}
                            gameData={gameData}
                            onUpdate={onUpdate}
                            globalResources={globalResources}
                        />
                    )}
                    {activeTab === 'buildings' && renderBuildingsTab()}
                </div>
            )}
        </div>
    );
};

export default GameSimulator;