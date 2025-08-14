import React, { useState, useMemo, useEffect } from 'react';
import BuildingPreviewCard from './BuildingPreviewCard';
import '../styles/ClaimStakeBuildingsTab.css';

/**
 * ClaimStakeBuildingsTab component
 * 
 * Displays available buildings for a claim stake before purchase
 * Shows buildings based on the claim stake's added tags and tier
 * Allows filtering buildings by type
 */
const ClaimStakeBuildingsTab = ({
    claimStake,
    gameData
}) => {

    // Log important data structure information
    const allBuildingsData = gameData.claimStakeBuildings || {};
    const allBuildingKeys = Object.keys(allBuildingsData);

    // Log tier information
    const tierPatterns = allBuildingKeys
        .filter(key => key.includes('-t'))
        .map(key => {
            const tierMatch = key.match(/[-_]t(\d+)[-_]/);
            return tierMatch ? tierMatch[0] : key.match(/[-_]t(\d+)$/)?.[0];
        })
        .filter(Boolean);

    const uniqueTierPatterns = [...new Set(tierPatterns)];

    // Check for specific building types with tiers
    const centralHubKeys = allBuildingKeys.filter(key => key.includes('central-hub') && key.includes('-t'));
    const extractionHubKeys = allBuildingKeys.filter(key => key.includes('extraction-hub') && key.includes('-t'));



    // Check which buildings should be shown for this claim stake's tier
    const matchingTierBuildings = allBuildingKeys.filter(key => {
        const tierMatch = key.match(/[-_]t(\d+)[-_]/) || key.match(/[-_]t(\d+)$/);
        return tierMatch && parseInt(tierMatch[1]) <= claimStake.tier;
    });

    // Get the last selected tab from localStorage or default to 'central'
    const getSavedFilter = () => {
        try {
            const savedFilter = localStorage.getItem('claimStakeBuildingsTabFilter');
            return savedFilter || 'central';
        } catch (e) {
            console.error('Error accessing localStorage:', e);
            return 'central';
        }
    };

    // Set up state for active filter with saved value or 'central' as default 
    const [activeFilter, setActiveFilter] = useState(getSavedFilter());

    // Save the active filter to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem('claimStakeBuildingsTabFilter', activeFilter);
        } catch (e) {
            console.error('Error saving to localStorage:', e);
        }
    }, [activeFilter]);

    // Extract buildings data
    const buildingsData = gameData?.claimStakeBuildings ||
        (gameData?.data && gameData.data.claimStakeBuildings) || {};

    // Extract planet archetypes data
    const planetArchetypes = gameData?.planetArchetypes ||
        (gameData?.data && gameData.data.planetArchetypes) || {};

    // Get claim stake tier and tags
    const claimStakeTier = claimStake?.tier || 1;


    // Find matching planet archetype for this claim stake
    const planetArchetype = useMemo(() => {
        if (!claimStake || !planetArchetypes) return null;

        // Extract the required tags from claim stake
        const requiredTags = claimStake.requiredTags || [];

        // Find a planet tag (e.g., "tag-terrestrial-planet")
        const planetTypeTag = requiredTags.find(tag =>
            tag.startsWith('tag-') &&
            !['tag-oni', 'tag-mud', 'tag-ustur'].includes(tag)
        );

        // Find a faction tag (e.g., "tag-oni")
        const factionTag = requiredTags.find(tag =>
            ['tag-oni', 'tag-mud', 'tag-ustur'].includes(tag)
        );

        // If we can't determine the planet type or faction, we can't find the archetype
        if (!planetTypeTag || !factionTag) return null;

        // Find matching planet archetype that contains both tags
        return Object.values(planetArchetypes).find(archetype =>
            archetype.tags &&
            archetype.tags.includes(planetTypeTag) &&
            archetype.tags.includes(factionTag)
        );
    }, [claimStake, planetArchetypes]);

    // Get richness values for resources on this planet
    const resourceRichness = useMemo(() => {
        return planetArchetype?.richness || {};
    }, [planetArchetype]);

    const claimStakeTags = useMemo(() => {
        // Start with tags from the claim stake definition
        const tags = [...(claimStake?.tags || [])];

        // Add tags from the planet archetype if available
        if (planetArchetype?.tags) {
            tags.push(...planetArchetype.tags);
        }

        return tags;
    }, [claimStake, planetArchetype]);

    // Function to check if a building can be unlocked
    const canBuildingBeUnlocked = (building) => {
        // First check tier requirement
        if (building.minimumTier && building.minimumTier > claimStakeTier) {
            return false;
        }

        // If no required tags, it's automatically available
        if (!building.requiredTags || building.requiredTags.length === 0) {
            return true;
        }

        // Check if all required tags are in claim stake tags
        return building.requiredTags.every(tag => claimStakeTags.includes(tag));
    };

    // Calculate the complete set of unlockable buildings considering tag chains
    const getAllUnlockableBuildings = useMemo(() => {
        // Start with initial tags from the claim stake and planet archetype
        let availableTags = [...claimStakeTags];

        // Set of already unlocked building IDs
        const unlockedBuildingIds = new Set();

        // Map for storing which buildings unlock which tags
        const tagSourceMap = {};

        // Automatically add the central hub T1 as it's always provided at the start
        const centralHubId = Object.keys(buildingsData).find(id =>
            id.includes('central-hub-t1') || id.includes('claimStakeBuilding-central-hub-t1')
        );

        if (centralHubId) {
            unlockedBuildingIds.add(centralHubId);
            // Add any tags from the central hub
            const centralHub = buildingsData[centralHubId];
            if (centralHub && centralHub.addedTags) {
                centralHub.addedTags.forEach(tag => {
                    if (!availableTags.includes(tag)) {
                        availableTags.push(tag);
                        tagSourceMap[tag] = centralHub.name || 'Central Hub T1';
                    }
                });
            }
        }

        // First, try to identify the extraction hub explicitly
        const extractionHubId = Object.keys(buildingsData).find(id => {
            const building = buildingsData[id];
            if (!building) return false;

            // Look for extraction hub by ID or name
            if ((id.includes('extraction-hub-t1') || id.includes('claimStakeBuilding-extraction-hub-t1')) ||
                (building.name && building.name.toLowerCase().includes('extraction hub'))) {

                // Check if it can be unlocked with current tags (should require central hub tag)
                if (!building.requiredTags || building.requiredTags.every(tag => availableTags.includes(tag))) {
                    return true;
                }
            }
            return false;
        });

        // If we found the extraction hub, add it and its tags now
        if (extractionHubId) {
            const extractionHub = buildingsData[extractionHubId];


            unlockedBuildingIds.add(extractionHubId);

            if (extractionHub && extractionHub.addedTags) {
                extractionHub.addedTags.forEach(tag => {
                    if (!availableTags.includes(tag)) {
                        availableTags.push(tag);
                        tagSourceMap[tag] = extractionHub.name || 'Extraction Hub';
                    }
                });
            }
        }

        // Track if we found new buildings in the last iteration
        let foundNewBuildings = true;
        let iterations = 0;
        const maxIterations = 10; // prevent infinite loops

        // Keep iterating until we don't find any new buildings
        while (foundNewBuildings && iterations < maxIterations) {
            foundNewBuildings = false;
            iterations++;

            // Check all buildings to see if they can be unlocked with current tags
            Object.entries(buildingsData).forEach(([id, building]) => {
                // Skip if already unlocked or undefined
                if (!building || unlockedBuildingIds.has(id)) return;

                // Skip if minimum tier is higher than claim stake tier
                if (building.minimumTier && building.minimumTier > claimStakeTier) return;

                // Check if all required tags are available
                const canUnlock = !building.requiredTags ||
                    building.requiredTags.length === 0 ||
                    building.requiredTags.every(tag => availableTags.includes(tag));

                if (canUnlock) {
                    // Add to unlocked buildings
                    unlockedBuildingIds.add(id);
                    foundNewBuildings = true;

                    // Add any new tags this building provides
                    if (building.addedTags && building.addedTags.length > 0) {
                        const newTags = [];
                        building.addedTags.forEach(tag => {
                            if (!availableTags.includes(tag)) {
                                availableTags.push(tag);
                                newTags.push(tag);
                                tagSourceMap[tag] = building.name || id;
                            }
                        });
                    }
                } else if (building.requiredTags) {
                    const missingTags = building.requiredTags.filter(tag => !availableTags.includes(tag));
                }
            });
        }



        return { unlockedBuildingIds, tagSourceMap };
    }, [buildingsData, claimStakeTags, claimStakeTier]);

    // Helper to extract tier from ID - MOVED UP to fix reference error
    const getTierFromId = (id) => {
        const tierMatch = id.match(/-t(\d+)$/);
        return tierMatch ? parseInt(tierMatch[1], 10) : 1;
    };

    // Organize buildings into a usable format
    const buildings = useMemo(() => {
        // Extract unique buildings (only one tier per building type)
        const uniqueBuildings = {};

        // Check if building is actually unlockable through the tag chain
        const isReallyUnlockable = (id) => {
            return getAllUnlockableBuildings.unlockedBuildingIds.has(id);
        };

        Object.entries(buildingsData).forEach(([id, building]) => {
            // Skip undefined buildings
            if (!building) return;

            // Skip non-tier-1 buildings (we'll only show T1 versions)
            if (id.includes('-t') && !id.includes('-t1')) return;

            // Skip buildings that don't meet the minimum tier requirement
            if (building.minimumTier && building.minimumTier > claimStakeTier) return;

            // Skip buildings that can't be unlocked through the tag chain
            if (!isReallyUnlockable(id)) return;

            // Add to unique buildings by name (to avoid duplicates)
            const nameKey = building.name || id;

            // Only add if it doesn't exist or if it's a lower tier than existing
            if (!uniqueBuildings[nameKey] || getTierFromId(id) < getTierFromId(uniqueBuildings[nameKey].id)) {
                uniqueBuildings[nameKey] = {
                    ...building,
                    id, // Store the actual ID for reference
                    unlocked: canBuildingBeUnlocked(building)
                };
            }
        });

        return uniqueBuildings;
    }, [buildingsData, claimStakeTags, getAllUnlockableBuildings, claimStakeTier]);

    // Map initial tags to be used for each building
    const initialAvailableTags = useMemo(() => {
        return [...claimStakeTags];
    }, [claimStakeTags]);

    // Get all buildings that can potentially be unlocked
    const allUnlockableBuildings = useMemo(() => {
        const unlockableIds = getAllUnlockableBuildings.unlockedBuildingIds;
        const tagSourceMap = getAllUnlockableBuildings.tagSourceMap;
        const result = {};

        unlockableIds.forEach(id => {
            const building = buildingsData[id];
            if (building) {
                // Check if the building is directly buildable with initial tags
                const isDirectlyBuildable = !building.requiredTags ||
                    building.requiredTags.length === 0 ||
                    building.requiredTags.every(tag => claimStakeTags.includes(tag));

                // For each required tag, find the building that provides it
                const requiredBuildings = [];
                if (building.requiredTags && building.requiredTags.length > 0) {
                    building.requiredTags.forEach(tag => {
                        const sourceBuilding = tagSourceMap[tag];
                        // Only add if it's from another building (not from planet archetype or claim stake)
                        if (sourceBuilding && !claimStakeTags.includes(tag)) {
                            // Don't add duplicates
                            if (!requiredBuildings.includes(sourceBuilding)) {
                                requiredBuildings.push(sourceBuilding);
                            }
                        }
                    });
                }

                // Add this property to the building
                result[id] = {
                    ...building,
                    isDirectlyBuildable,
                    requiredBuildings // Add the list of required buildings
                };
            }
        });

        return result;
    }, [buildingsData, getAllUnlockableBuildings, claimStakeTags]);

    // Helper functions for category checks with improved debugging
    const isExtractionBuilding = (building) => {
        if (!building) return false;

        const isExtraction = (
            // Building name or ID contains "extraction"
            (building.name && building.name.toLowerCase().includes('extraction')) ||
            (building.id && building.id.toLowerCase().includes('extraction')) ||
            // Building has an extraction-related tag
            (building.tags && Array.isArray(building.tags) && building.tags.some(tag => tag.includes('extraction'))) ||
            // Key indicator: Building requires an extraction hub tag
            (building.requiredTags && Array.isArray(building.requiredTags) &&
                building.requiredTags.some(tag => tag.includes('extraction-hub'))) ||
            // Look for common extraction-related terms in name
            (building.name && (
                building.name.toLowerCase().includes('extractor') ||
                building.name.toLowerCase().includes('mine') ||
                building.name.toLowerCase().includes('drill') ||
                building.name.toLowerCase().includes('collector') ||
                building.name.toLowerCase().includes('harvester')
            )) ||
            // Look for common extraction-related terms in ID
            (building.id && (
                building.id.toLowerCase().includes('extractor') ||
                building.id.toLowerCase().includes('mine') ||
                building.id.toLowerCase().includes('drill') ||
                building.id.toLowerCase().includes('collector') ||
                building.id.toLowerCase().includes('harvester')
            ))
        );

        return isExtraction;
    };

    const isProcessingBuilding = (building) => {
        if (!building) return false;

        const isProcessing = (
            // Building name or ID contains "processing"
            (building.name && building.name.toLowerCase().includes('processing')) ||
            (building.id && building.id.toLowerCase().includes('processing')) ||
            // Building has a processing-related tag
            (building.tags && Array.isArray(building.tags) && building.tags.some(tag => tag.includes('processing'))) ||
            // Key indicator: Building requires a processing hub tag
            (building.requiredTags && Array.isArray(building.requiredTags) &&
                building.requiredTags.some(tag => tag.includes('processing-hub'))) ||
            // Look for common processing-related terms in name
            (building.name && (
                building.name.toLowerCase().includes('refiner') ||
                building.name.toLowerCase().includes('refinery') ||
                building.name.toLowerCase().includes('processor') ||
                building.name.toLowerCase().includes('factory') ||
                building.name.toLowerCase().includes('smelter') ||
                building.name.toLowerCase().includes('furnace')
            )) ||
            // Look for common processing-related terms in ID
            (building.id && (
                building.id.toLowerCase().includes('refiner') ||
                building.id.toLowerCase().includes('refinery') ||
                building.id.toLowerCase().includes('processor') ||
                building.id.toLowerCase().includes('factory') ||
                building.id.toLowerCase().includes('smelter') ||
                building.id.toLowerCase().includes('furnace')
            ))
        );

        return isProcessing;
    };

    const isFarmingBuilding = (building) => {
        if (!building) return false;

        const isFarming = (
            // Building name or ID contains "farming" or "farm" 
            (building.name && (building.name.toLowerCase().includes('farming') || building.name.toLowerCase().includes('farm'))) ||
            (building.id && (building.id.toLowerCase().includes('farming') || building.id.toLowerCase().includes('farm-'))) ||
            // Building has a farming-related tag
            (building.tags && Array.isArray(building.tags) && building.tags.some(tag => tag.includes('farming'))) ||
            // Key indicator: Building requires a farming hub tag
            (building.requiredTags && Array.isArray(building.requiredTags) &&
                building.requiredTags.some(tag => tag.includes('farming-hub'))) ||
            // Look for common farming-related terms in name
            (building.name && (
                building.name.toLowerCase().includes('greenhouse') ||
                building.name.toLowerCase().includes('hydroponic') ||
                building.name.toLowerCase().includes('crop') ||
                building.name.toLowerCase().includes('garden') ||
                building.name.toLowerCase().includes('cultivator')
            )) ||
            // Look for common farming-related terms in ID
            (building.id && (
                building.id.toLowerCase().includes('greenhouse') ||
                building.id.toLowerCase().includes('hydroponic') ||
                building.id.toLowerCase().includes('crop') ||
                building.id.toLowerCase().includes('garden') ||
                building.id.toLowerCase().includes('cultivator')
            ))
        );

        return isFarming;
    };

    const isStorageBuilding = (building) => {
        if (!building) return false;

        const isStorage = (
            // Building name or ID contains "storage"
            (building.name && building.name.toLowerCase().includes('storage')) ||
            (building.id && building.id.toLowerCase().includes('storage')) ||
            // Building has a storage-related tag
            (building.tags && Array.isArray(building.tags) && building.tags.some(tag => tag.includes('storage'))) ||
            // Key indicator: Building requires a storage hub tag
            (building.requiredTags && Array.isArray(building.requiredTags) &&
                building.requiredTags.some(tag => tag.includes('storage-hub'))) ||
            // Look for common storage-related terms in name
            (building.name && (
                building.name.toLowerCase().includes('warehouse') ||
                building.name.toLowerCase().includes('depot') ||
                building.name.toLowerCase().includes('silo') ||
                building.name.toLowerCase().includes('container') ||
                building.name.toLowerCase().includes('tank')
            )) ||
            // Look for common storage-related terms in ID
            (building.id && (
                building.id.toLowerCase().includes('warehouse') ||
                building.id.toLowerCase().includes('depot') ||
                building.id.toLowerCase().includes('silo') ||
                building.id.toLowerCase().includes('container') ||
                building.id.toLowerCase().includes('tank')
            ))
        );

        return isStorage;
    };

    const isCentralBuilding = (building) => {
        if (!building) return false;

        // Check for specific building names or IDs
        if (building.name) {
            const nameLower = building.name.toLowerCase();
            if (nameLower.includes('central') ||
                nameLower.includes('crew') ||
                nameLower.includes('power plant') ||
                nameLower.includes('power module')) {
                return true;
            }
        }

        if (building.id) {
            const idLower = building.id.toLowerCase();
            if (idLower.includes('central') ||
                idLower.includes('crew') ||
                idLower.includes('power')) {
                return true;
            }
        }

        // Check tags
        if (building.tags &&
            (building.tags.includes('central') ||
                building.tags.includes('power'))) {
            return true;
        }

        return false;
    };

    // Group buildings by their base type (removing tier information)
    const groupedBuildings = useMemo(() => {
        const result = {};
        // Process all buildings and organize by base name/type
        Object.entries(allUnlockableBuildings).forEach(([id, building]) => {
            // Skip if no building data
            if (!building) return;

            // Get base ID without tier suffix
            const baseId = id.replace(/-t\d+$/, '');

            // Get tier from ID
            const tierMatch = id.match(/-t(\d+)$/);
            const tier = tierMatch ? parseInt(tierMatch[1], 10) : 1;

            // Create entry for this building type if it doesn't exist
            if (!result[baseId]) {
                result[baseId] = {
                    baseId,
                    name: building.name,
                    tiers: [],
                    building: { ...building },
                    unlocked: building.unlocked,
                    isDirectlyBuildable: building.isDirectlyBuildable,
                    requiredBuildings: building.requiredBuildings
                };
            }

            // Add this tier if not already added
            if (!result[baseId].tiers.includes(tier)) {
                result[baseId].tiers.push(tier);
            }
        });

        // Sort tiers for each building
        Object.values(result).forEach(buildingGroup => {
            buildingGroup.tiers.sort((a, b) => a - b);
        });

        return result;
    }, [allUnlockableBuildings]);

    // Get constructed buildings from claim stake - MOVED UP before filteredBuildings
    const constructedBuildings = useMemo(() => {
        const constructed = new Set();
        if (claimStake?.buildings) {
            claimStake.buildings.forEach(buildingId => {
                // Get base building ID without tier
                const baseId = buildingId.replace(/-t\d+$/, '');
                constructed.add(baseId);
                constructed.add(buildingId); // Also add full ID
            });
        }
        return constructed;
    }, [claimStake?.buildings]);

    // Filter buildings based on selected filter and building requirements
    const filteredBuildings = useMemo(() => {

        // --- Add Debug Logging --- 
        console.log(`[ClaimStakeBuildingsTab Debug] claimStake ID: ${claimStake?.id}`);
        console.log(`[ClaimStakeBuildingsTab Debug] claimStake Required Tags:`, claimStake?.requiredTags);
        console.log(`[ClaimStakeBuildingsTab Debug] Found planetArchetype:`, planetArchetype);
        console.log(`[ClaimStakeBuildingsTab Debug] Calculated resourceRichness:`, resourceRichness);
        // --- End Debug Logging ---

        // First, get all unique base buildings that match the filter
        const matchingBaseBuildings = Object.values(groupedBuildings).filter(buildingGroup => {
            const building = buildingGroup.building;
            if (!building) return false;

            // Filter buildings based on resource extraction mechanics (if applicable)
            if (building.resourceExtraction && resourceRichness) {
                const resourceType = building.resourceExtraction.resourceType;
                const minRichness = building.resourceExtraction.minRichness || 0;

                // Skip if the planet doesn't have this resource or richness is below minimum
                if (!resourceRichness[resourceType] || resourceRichness[resourceType] < minRichness) {
                    return false;
                }
            }

            // Apply category filters and explain classification
            let result = false;

            switch (activeFilter) {
                case 'all':
                    result = true;
                    break;
                case 'extraction':
                    result = isExtractionBuilding(building);
                    break;
                case 'processing':
                    result = isProcessingBuilding(building);
                    break;
                case 'farming':
                    result = isFarmingBuilding(building);
                    break;
                case 'storage':
                    result = isStorageBuilding(building);
                    break;
                case 'central':
                    result = isCentralBuilding(building);
                    break;
                default:
                    result = true;
            }

            return result;
        });

        return matchingBaseBuildings;
    }, [groupedBuildings, activeFilter, resourceRichness, allUnlockableBuildings, isExtractionBuilding, isProcessingBuilding, isFarmingBuilding, isStorageBuilding, isCentralBuilding, constructedBuildings]);

    // Define building type filters
    const filters = [
        { id: 'central', label: 'Central' },
        { id: 'extraction', label: 'Extraction' },
        { id: 'processing', label: 'Processing' },
        { id: 'farming', label: 'Farming' },
        { id: 'storage', label: 'Storage' },
        { id: 'all', label: 'All' },
    ];

    return (
        <div className="buildings-info">
            <h3>Available Buildings</h3>
            <p className="buildings-description">
                Buildings that will be available to construct on this claim stake.
                Tier {claimStakeTier} claim stake allows buildings up to tier {claimStakeTier}.
            </p>

            {/* Filter tabs */}
            <div className="filter-tabs">
                {filters.map(filter => (
                    <button
                        key={filter.id}
                        className={`filter-tab ${activeFilter === filter.id ? 'active' : ''}`}
                        onClick={() => setActiveFilter(filter.id)}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Buildings grid */}
            <div className="buildings-grid">
                {filteredBuildings.length > 0 ? (
                    filteredBuildings.map(buildingGroup => {
                        const isConstructed = constructedBuildings.has(buildingGroup.baseId) ||
                            buildingGroup.tiers.some(tier =>
                                constructedBuildings.has(`${buildingGroup.baseId}-t${tier}`)
                            );

                        return (
                            <BuildingPreviewCard
                                key={buildingGroup.baseId}
                                id={buildingGroup.baseId}
                                building={buildingGroup.building}
                                tags={claimStakeTags}
                                availableTiers={buildingGroup.tiers}
                                maxTier={claimStakeTier}
                                unlocked={buildingGroup.unlocked}
                                gameData={gameData}
                                resourceRichness={resourceRichness}
                                isDirectlyBuildable={buildingGroup.isDirectlyBuildable}
                                isConstructed={isConstructed}
                                constructedBuildings={constructedBuildings}
                            />
                        );
                    })
                ) : (
                    <div className="no-buildings-message">
                        No buildings available for this filter.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClaimStakeBuildingsTab; 