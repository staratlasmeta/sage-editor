import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ResourceProductionChainModal from './ResourceProductionChainModal';
import { createPortal } from 'react-dom';
import '../styles/BuildingCard.css';
import BuildingService from '../services/BuildingService';

const BuildingCard = ({
    id,
    building,
    onSelect,
    isSelected,
    isUnderConstruction: isUnderConstructionProp,
    canAfford,
    currentTier,
    isHub,
    upgradeCost,
    isNewModule,
    instanceCount = 0,
    isUpgrading = false,
    resources,
    globalResources,
    nextTierBuilding,
    canBuildWithPower,
    hasRequiredTags,
    selectedBuildings,
    getTier,
    gameData,
    constructionTime,
    timeRemaining,
    underConstructionStatus,
    maxTier,
    onReceiveResources,
    setGlobalResourcesRef,
    resourceRichness,
    claimStakeId,
    claimStakeDefinitionId,
    buildingsList,
    underConstructionList,
    isAlreadyConstructed,
}) => {
    const [activeTier, setActiveTier] = useState(currentTier);
    const [activeTab, setActiveTab] = useState('overview');
    const [forceUpdate, setForceUpdate] = useState(0);
    const cardRef = useRef(null);
    const [currentCostState, setCurrentCostState] = useState({});
    const [isExpanded, setIsExpanded] = useState(false);
    const [isResourceFlowExpanded, setIsResourceFlowExpanded] = useState(false);
    const [showProductionChainModal, setShowProductionChainModal] = useState(false);
    const [costMode, setCostMode] = useState('construct'); // 'construct' or 'upgrade'

    // Add state for the resource subtab (produces/consumes)
    const [activeResourceTab, setActiveResourceTab] = useState('produces');

    // Move moduleCountsCache to the top of the component before any functions use it
    const moduleCountsCache = useRef({});
    // Add a timestamp for when the cache was last invalidated
    const cacheLastInvalidatedRef = useRef(Date.now());

    // For processing hubs, additional data key to analyze processing
    const [showExtraInfo, setShowExtraInfo] = useState(false);

    // Determine if this is a processing type building
    const isProcessingType = useMemo(() => {
        if (!building || !building.name) return false;
        return building.name.toLowerCase().includes('process') ||
            building.name.toLowerCase().includes('processor');
    }, [building]);

    // --- Define getBuildingForTier *before* useMemo --- 
    const getBuildingForTier = useCallback((tier) => {
        // Ensure id is a string before using string methods
        if (typeof id !== 'string') {
            console.warn('getBuildingForTier received non-string id:', id);
            return null;
        }

        // Get building data source
        const buildingsData = gameData?.claimStakeBuildings ||
            (gameData?.data && gameData.data.claimStakeBuildings) ||
            {};

        // Try multiple ID patterns to find the building data

        // 1. First try the standard pattern with tier at the end
        const baseIdWithoutTier = id.replace(/-t\d+$/, '');
        const tieredId = `${baseIdWithoutTier}-t${tier}`;

        // 2. If the ID doesn't have the claimStakeBuilding prefix, also try with the prefix
        const prefixedId = tieredId.startsWith('claimStakeBuilding-')
            ? tieredId
            : `claimStakeBuilding-${tieredId}`;

        // 3. Try to extract the base building type (e.g., "central-hub", "extraction-hub")
        const baseType = id.match(/(?:claimStakeBuilding-)?([\w-]+?)(?:-t\d+)?$/)?.[1];
        const directTypeId = baseType ? `${baseType}-t${tier}` : null;
        const prefixedTypeId = baseType ? `claimStakeBuilding-${baseType}-t${tier}` : null;

        // Try all possible IDs in sequence
        let buildingData = null;

        // Try standard pattern
        buildingData = buildingsData[tieredId];
        if (buildingData) {
            return buildingData;
        }

        // Try with prefix
        buildingData = buildingsData[prefixedId];
        if (buildingData) {
            return buildingData;
        }

        // Try with direct type
        if (directTypeId) {
            buildingData = buildingsData[directTypeId];
            if (buildingData) {
                return buildingData;
            }
        }

        // Try with prefixed type
        if (prefixedTypeId) {
            buildingData = buildingsData[prefixedTypeId];
            if (buildingData) {
                return buildingData;
            }
        }

        // Try all hub buildings if this is a hub
        if (isHub) {
            // Look for hub buildings of the right tier
            const hubKeys = Object.keys(buildingsData).filter(key =>
                key.includes('hub') && key.includes(`-t${tier}`)
            );

            if (hubKeys.length > 0) {
                const hubData = buildingsData[hubKeys[0]];
                return hubData;
            }
        }

        // If still not found, try a last resort with partial matching
        const partialMatches = Object.keys(buildingsData).filter(key => {
            // Get the building name without prefix or tier
            const buildingName = id.replace(/^claimStakeBuilding-/, '').replace(/-t\d+$/, '');
            return key.includes(buildingName) && key.includes(`-t${tier}`);
        });

        if (partialMatches.length > 0) {
            buildingData = buildingsData[partialMatches[0]];
            return buildingData;
        }

        return null;
    }, [id, gameData, isHub]); // Dependencies for getBuildingForTier
    // --- End getBuildingForTier definition ---

    // Extract resource production/consumption data for the active tier
    const resourceExtraction = useMemo(() => {
        // Find the appropriate building data for the active tier
        let buildingData = null;

        if (gameData?.claimStakeBuildings) {
            // Try to find the building for this tier
            const baseId = id.replace(/-t\d+$/, '');
            const tieredId = `${baseId}-t${activeTier}`;

            // Check different possible formats
            const possibleIds = [
                tieredId,
                `claimStakeBuilding-${tieredId.replace(/^claimStakeBuilding-/, '')}`,
                id, // Use as-is
                building?.id // Use from building object
            ];

            // Find the first matching building
            for (const possibleId of possibleIds) {
                if (gameData.claimStakeBuildings[possibleId]) {
                    buildingData = gameData.claimStakeBuildings[possibleId];
                    break;
                }
            }
        }

        return buildingData?.resourceExtractionRate || {};
    }, [id, activeTier, building, gameData]);

    const resourceConsumption = useMemo(() => {
        // Find the appropriate building data for the active tier
        let buildingData = null;

        if (gameData?.claimStakeBuildings) {
            // Try to find the building for this tier
            const baseId = id.replace(/-t\d+$/, '');
            const tieredId = `${baseId}-t${activeTier}`;

            // Check different possible formats
            const possibleIds = [
                tieredId,
                `claimStakeBuilding-${tieredId.replace(/^claimStakeBuilding-/, '')}`,
                id, // Use as-is
                building?.id // Use from building object
            ];

            // Find the first matching building
            for (const possibleId of possibleIds) {
                if (gameData.claimStakeBuildings[possibleId]) {
                    buildingData = gameData.claimStakeBuildings[possibleId];
                    break;
                }
            }
        }

        return buildingData?.resourceConsumptionRate || {};
    }, [id, activeTier, building, gameData]);

    // Process resourceRate for building inputs and outputs
    const processResourceRate = useMemo(() => {
        const buildingData = getBuildingForTier(activeTier);

        // Debug logging
        // console.log('BuildingCard processResourceRate for:', id);
        // console.log('Resource Richness keys:', Object.keys(resourceRichness || {}));

        if (!buildingData) return { inputs: {}, outputs: {} };

        // Categorize resourceRate into inputs (negative values) and outputs (positive values)
        const inputs = {};
        const outputs = {};

        // STEP 1: Process resourceRate (NOT affected by richness)
        // Positive values = production (outputs), Negative values = consumption (inputs)
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

        // STEP 2: Process resourceExtractionRate (WITH richness filtering)
        // All extraction rates go to outputs, but only if planet richness > 0
        if (buildingData.resourceExtractionRate && resourceRichness) {
            console.log('Processing extraction rates for building:', id);
            console.log('Available extraction rates:', Object.keys(buildingData.resourceExtractionRate));
            console.log('Available richness keys:', Object.keys(resourceRichness));

            Object.entries(buildingData.resourceExtractionRate).forEach(([resource, baseRate]) => {
                const resourceKey = resource.toLowerCase();
                // For resource extraction, we need to apply planet richness
                const baseName = resourceKey.replace('cargo-', ''); // For richness data stored without 'cargo-' prefix

                // Try multiple variants of the resource name to find the richness
                const variants = [
                    baseName,                     // "hydrogen"
                    baseName.toLowerCase(),      // "hydrogen" (lowercase)
                    `cargo-${baseName}`,         // "cargo-hydrogen"
                    `cargo-${baseName.toLowerCase()}`, // "cargo-hydrogen" (lowercase)
                    resourceKey                  // Original resource key "cargo-hydrogen"
                ];

                // Try to match resource name to a richness value
                let richness = 0;
                let matchedVariant = null;

                for (const variant of variants) {
                    if (variant in resourceRichness) {
                        richness = resourceRichness[variant];
                        matchedVariant = variant;
                        break;
                    }
                }

                // Also try a case-insensitive search through the keys
                if (richness === 0) {
                    const lowerResourceKeys = Object.keys(resourceRichness).map(k => k.toLowerCase());
                    for (const variant of variants) {
                        const index = lowerResourceKeys.indexOf(variant.toLowerCase());
                        if (index !== -1) {
                            const originalKey = Object.keys(resourceRichness)[index];
                            richness = resourceRichness[originalKey];
                            matchedVariant = originalKey;
                            break;
                        }
                    }
                }

                // console.log(`Resource: ${resource}, BaseName: ${baseName}, Found: ${matchedVariant}, Richness: ${richness}`);

                // Only include resources with positive richness (richness filtering for extraction)
                if (richness > 0) {
                    const effectiveRate = baseRate * richness;
                    if (effectiveRate > 0) {
                        outputs[resource] = effectiveRate;
                    }
                }
            });

            // console.log('Final outputs:', Object.keys(outputs));
        }

        return { inputs, outputs };
    }, [activeTier, getBuildingForTier, resourceRichness, id]);

    // Process resource rates from building definition for preview purposes
    const processResourceRateFromDefinition = useMemo(() => {
        const inputs = {};
        const outputs = {};

        // If this is a non-constructed building, show potential resources
        if (!isAlreadyConstructed && building) {
            // STEP 1: Process resourceRate (NOT affected by richness)
            // Positive values = production (outputs), Negative values = consumption (inputs)
            if (building.resourceRate) {
                Object.entries(building.resourceRate).forEach(([resource, rate]) => {
                    if (rate < 0) {
                        inputs[resource] = Math.abs(rate);
                    } else if (rate > 0) {
                        outputs[resource] = rate;
                    }
                });
            }

            // STEP 2: Process resourceExtractionRate (WITH richness filtering)
            // All extraction rates go to outputs, but only if planet richness > 0
            if (building.resourceExtractionRate && resourceRichness) {
                Object.entries(building.resourceExtractionRate).forEach(([resource, rate]) => {
                    const resourceKey = resource.toLowerCase();
                    const baseName = resourceKey.replace('cargo-', '');

                    // Try multiple variants of the resource name to find the richness
                    const variants = [
                        baseName,                     // "hydrogen"
                        baseName.toLowerCase(),      // "hydrogen" (lowercase)
                        `cargo-${baseName}`,         // "cargo-hydrogen"
                        `cargo-${baseName.toLowerCase()}`, // "cargo-hydrogen" (lowercase)
                        resourceKey                  // Original resource key "cargo-hydrogen"
                    ];

                    // Try to match resource name to a richness value
                    let richness = 0;
                    let matchedVariant = null;

                    for (const variant of variants) {
                        if (variant in resourceRichness) {
                            richness = resourceRichness[variant];
                            matchedVariant = variant;
                            break;
                        }
                    }

                    // Also try a case-insensitive search through the keys
                    if (richness === 0) {
                        const lowerResourceKeys = Object.keys(resourceRichness).map(k => k.toLowerCase());
                        for (const variant of variants) {
                            const index = lowerResourceKeys.indexOf(variant.toLowerCase());
                            if (index !== -1) {
                                const originalKey = Object.keys(resourceRichness)[index];
                                richness = resourceRichness[originalKey];
                                matchedVariant = originalKey;
                                break;
                            }
                        }
                    }

                    // Only include resources with positive richness (richness filtering for extraction)
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
    }, [isAlreadyConstructed, building, resourceRichness]);

    // Helper function to format resource name for display
    const formatResourceName = useCallback((resource) => {
        return resource.replace('cargo-', '').split('-').map(
            word => word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }, []);

    // Function to calculate effective resource extraction rates
    const calculateEffectiveResourceExtraction = useCallback((resourceExtractionRates) => {
        if (!resourceExtractionRates) return {};

        // Create a copy of the extraction rates to work with
        const result = {};

        Object.entries(resourceExtractionRates).forEach(([resource, baseRate]) => {
            // Try different variations of the resource name to match the richness data
            const resourceKey = resource.toLowerCase();
            const baseName = resourceKey.replace('cargo-', ''); // For richness data stored without 'cargo-' prefix

            // Check all possible ways the richness might be stored
            let richness = 0;
            if (resourceRichness && typeof resourceRichness === 'object') {
                if (baseName in resourceRichness) {
                    richness = resourceRichness[baseName];
                } else if (`cargo-${baseName}` in resourceRichness) {
                    richness = resourceRichness[`cargo-${baseName}`];
                } else if (resourceKey in resourceRichness) {
                    richness = resourceRichness[resourceKey];
                }
            }

            // Calculate the effective extraction rate (base rate * richness)
            const effectiveRate = baseRate * richness;

            // Only include if the effective rate is > 0
            if (effectiveRate > 0) {
                result[resource] = effectiveRate;
            }
        });

        return result;
    }, [resourceRichness, id]);

    // --- Memoize effectiveExtractionRates --- 
    const effectiveExtractionRates = useMemo(() => {
        const tierBuilding = getBuildingForTier(activeTier);
        if (!tierBuilding || !tierBuilding.resourceExtractionRate) {
            return {};
        }
        return calculateEffectiveResourceExtraction(tierBuilding.resourceExtractionRate);
    }, [activeTier, resourceRichness, getBuildingForTier, calculateEffectiveResourceExtraction]); // Remove buildingData from dependencies
    // --- End Memoization ---

    // Helper to determine if a resource is native (has richness > 0)
    const isResourceNative = useCallback((resource) => {
        return (resourceRichness[resource] || 0) > 0;
    }, [resourceRichness]);

    // Get the claim stake tier directly from the claim stake definition in game data
    const getClaimStakeTier = () => {
        try {
            // Use claimStakeDefinitionId prop
            if (claimStakeDefinitionId) {
                const tierMatch = claimStakeDefinitionId.match(/[-_]t(\d+)[-_]/i);
                if (tierMatch && tierMatch[1]) {
                    return parseInt(tierMatch[1]);
                }
            }
            // Use claimStakeId prop
            if (claimStakeId) {
                const tierMatch = claimStakeId.match(/[-_]t(\d+)[-_]/i);
                if (tierMatch && tierMatch[1]) {
                    return parseInt(tierMatch[1]);
                }
            }
            // Look up definition in game data using claimStakeDefinitionId
            if (claimStakeDefinitionId && gameData?.claimStakeDefinitions) {
                const definition = gameData.claimStakeDefinitions[claimStakeDefinitionId];
                if (definition && definition.tier) {
                    return parseInt(definition.tier);
                }
            }
            // Could potentially pass claimStakeTier as a prop if easily available in parent
            // Default to 1 if all else fails
            return 1;
        } catch (err) {
            console.error('Error getting claim stake tier:', err);
            return 1; // Default to 1 to be conservative
        }
    };

    const claimStakeTier = getClaimStakeTier();
    let finalClaimStakeTier = claimStakeTier; // Start with calculated tier

    // Use claimStakeDefinitionId for more accurate tier lookup if available
    if (claimStakeDefinitionId && gameData?.claimStakeDefinitions) {
        const definition = gameData.claimStakeDefinitions[claimStakeDefinitionId];
        if (definition && definition.tier) {
            finalClaimStakeTier = parseInt(definition.tier);
        }
    }

    // Fallback to extracting from IDs if still tier 1
    if (finalClaimStakeTier === 1) {
        if (claimStakeId) {
            const midTierMatch = claimStakeId.match(/[-_]t(\d+)[-_]/i);
            if (midTierMatch?.[1]) finalClaimStakeTier = parseInt(midTierMatch[1]);
            else {
                const endTierMatch = claimStakeId.match(/[-_]t(\d+)$/i);
                if (endTierMatch?.[1]) finalClaimStakeTier = parseInt(endTierMatch[1]);
            }
        }
        if (finalClaimStakeTier === 1 && claimStakeDefinitionId) {
            const midTierMatch = claimStakeDefinitionId.match(/[-_]t(\d+)[-_]/i);
            if (midTierMatch?.[1]) finalClaimStakeTier = parseInt(midTierMatch[1]);
            else {
                const endTierMatch = claimStakeDefinitionId.match(/[-_]t(\d+)$/i);
                if (endTierMatch?.[1]) finalClaimStakeTier = parseInt(endTierMatch[1]);
            }
        }
    }

    // A building is at max tier if it's at the game's max tier (5) OR (for hubs only) at the claim stake's tier limit
    const isMaxTier = isHub
        ? (currentTier >= maxTier || currentTier >= Number(finalClaimStakeTier))
        : currentTier >= maxTier;

    const canUpgrade = !isMaxTier && upgradeCost && !isNewModule && !isUpgrading && nextTierBuilding;

    // Since construction is immediate, we don't need to track this
    // const isHubUnderConstruction = isHub && isUnderConstruction(id);

    // NEW: Create combined resources that include both local and global resources
    const allAvailableResources = useMemo(() => {
        // Use the same resource calculation logic as the buttons for consistency
        const combined = {
            ...(globalResources || {}),
            ...(resources || {})
        };

        // Ensure all values are valid numbers
        const sanitized = {};
        Object.keys(combined).forEach(key => {
            const value = combined[key];
            const numericValue = Number(value);
            sanitized[key] = isNaN(numericValue) ? 0 : numericValue;
        });

        return sanitized;
    }, [resources, globalResources]);

    // Helper function to safely get numeric resource amount
    const getResourceAmount = useCallback((resourceKey) => {
        const amount = allAvailableResources[resourceKey.toLowerCase()];
        // Convert to number and ensure it's valid
        const numericAmount = Number(amount);
        return isNaN(numericAmount) ? 0 : numericAmount;
    }, [allAvailableResources]);

    // NEW: Add state to track current resources for this component
    const [localResources, setLocalResources] = useState(allAvailableResources || {});

    // Improved resource synchronization - more aggressive updating
    useEffect(() => {
        // Deep clone resources to ensure we have a fresh reference
        const newResources = { ...(allAvailableResources || {}) };

        // Compare if significant changes have occurred
        const hasChanges = Object.keys({ ...localResources, ...newResources }).some(key => {
            const oldValue = localResources[key] || 0;
            const newValue = newResources[key] || 0;
            return Math.abs(oldValue - newValue) > 0.001; // Even tiny changes matter
        });

        // Only update if there are actual changes to avoid render loops
        if (hasChanges) {
            // Update with a slight delay to ensure we have the latest state
            // This helps when multiple updates happen in quick succession
            const timeoutId = setTimeout(() => {
                setLocalResources(newResources);
            }, 50); // Short delay to batch multiple updates

            return () => clearTimeout(timeoutId);
        }
    }, [resources, globalResources, allAvailableResources, localResources]); // Include localResources to detect changes

    // Fallback direct prop to local state synchronization
    // This ensures we pick up changes even if they happen through other means
    useEffect(() => {
        // Set a recurring check to ensure we're always in sync with global state
        const intervalId = setInterval(() => {
            if (resources && Object.keys(resources).length > 0) {
                // Do a deep comparison of current props vs local state
                const hasOutOfSyncValues = Object.keys(resources).some(key => {
                    const propsValue = resources[key] || 0;
                    const stateValue = localResources[key] || 0;
                    // Check for significant differences
                    return Math.abs(propsValue - stateValue) > 0.1;
                });

                // If we detect out-of-sync values, update local state from props
                if (hasOutOfSyncValues) {
                    console.log("📊 BuildingCard detected out-of-sync resources, updating local state");
                    setLocalResources({ ...resources });
                }
            }
        }, 1000); // Check every second

        return () => clearInterval(intervalId);
    }, [resources, localResources]);

    // No need to track construction status anymore since it's immediate
    // const [isCurrentlyUnderConstruction, setIsCurrentlyUnderConstruction] = useState(isUnderConstruction(id));

    useEffect(() => {
        if (underConstructionList && underConstructionList.length > 0) {
            const isBuilding = underConstructionList.some(item => item.buildingId === id);
            if (isBuilding) {
                const intervalId = setInterval(() => {
                    setForceUpdate(prev => prev + 1);
                }, 1000);
                return () => clearInterval(intervalId);
            }
        }
    }, [id, underConstructionList]); // Depends on underConstructionList prop

    // Only keep event listeners that we might still need
    useEffect(() => {
        const handleConstructionStarted = () => {
            setForceUpdate(prev => prev + 1);
        };

        window.addEventListener('buildingConstructionStarted', handleConstructionStarted);
        window.addEventListener('claimStakeUpdated', handleConstructionStarted);

        return () => {
            window.removeEventListener('buildingConstructionStarted', handleConstructionStarted);
            window.removeEventListener('claimStakeUpdated', handleConstructionStarted);
        };
    }, [id]);

    // ENHANCEMENT: Listen specifically for direct construction update events
    useEffect(() => {
        const handleDirectConstruction = (e) => {
            console.log(`BuildingCard ${id} - Force construction event received:`, e.detail);
            // If this building is part of the construction event, update immediately
            if (e.detail?.buildingId === id ||
                e.detail?.items?.some(item => item.buildingId === id || item.id === id)) {
                console.log(`BuildingCard ${id} - THIS BUILDING IS UNDER CONSTRUCTION!`);
                // Force immediate update
                setForceUpdate(prev => prev + 1);
            }
        };

        window.addEventListener('forceBuildingConstruction', handleDirectConstruction);

        return () => {
            window.removeEventListener('forceBuildingConstruction', handleDirectConstruction);
        };
    }, [id]);

    // Memoize the canAfford calculation based on localResources
    const currentCanAfford = useMemo(() => {
        if (!building?.constructionCost) return false;

        // Create a debug log for resource availability when this calculation occurs
        if (process.env.NODE_ENV === 'development') {
            const missingResources = Object.entries(building.constructionCost)
                .filter(([resource, amount]) => {
                    const currentAmount = getResourceAmount(resource);
                    return currentAmount < amount;
                })
                .map(([resource, amount]) => {
                    const currentAmount = getResourceAmount(resource);
                    return `${resource}: need ${amount}, have ${currentAmount.toFixed(1)}`;
                });
        }

        // Check if we can afford all required resources
        return Object.entries(building.constructionCost).every(
            ([resource, amount]) => {
                const currentAmount = getResourceAmount(resource);
                return currentAmount >= amount;
            }
        );
    }, [building?.constructionCost, getResourceAmount, forceUpdate]);

    // Helper function that uses the memoized value for better performance
    const canAffordBuilding = (buildingToCheck) => {
        if (!buildingToCheck?.constructionCost) return false;

        // If checking our own building, use the memoized value for better performance
        if (buildingToCheck.id === building.id) {
            return currentCanAfford;
        }

        // For other buildings, calculate on demand
        return Object.entries(buildingToCheck.constructionCost).every(
            ([resource, amount]) => {
                const resourceKey = resource.toLowerCase();
                const currentAmount = localResources[resourceKey] || 0;
                return currentAmount >= amount;
            }
        );
    };

    // Helper function to check individual resource affordability
    const canAffordResource = (resource, amount) => {
        const currentAmount = getResourceAmount(resource);
        return currentAmount >= amount;
    };

    const isCentralHub = building.name.toLowerCase().includes('central');

    // Enhanced isUnderConstruction function to be more accurate
    const checkUnderConstruction = useCallback((buildingIdToCheck) => {
        if (!underConstructionList) return false; // Use prop
        const underConstruction = Array.isArray(underConstructionList) ? underConstructionList : [];

        const exactMatch = underConstruction.some(item =>
            item.buildingId === buildingIdToCheck || item.id === buildingIdToCheck
        );
        if (exactMatch) return true;

        if (typeof buildingIdToCheck === 'string' && !buildingIdToCheck.includes('hub')) {
            const baseIdPattern = buildingIdToCheck.replace(/-instance-\d+$/, '');
            return underConstruction.some(item => {
                const itemBuildingId = item.buildingId || item.id || '';
                return itemBuildingId.startsWith(baseIdPattern);
            });
        }
        return false;
    }, [underConstructionList]); // Dependency on the prop

    // Rename the isUnderConstruction prop to avoid conflict
    const isUnderConstruction = checkUnderConstruction;

    // Add this getBaseId function before getModuleCountByTier
    const getBaseId = (buildingId) => {
        // Ensure buildingId is a string before using string methods
        if (typeof buildingId !== 'string') {
            console.warn('getBaseId received non-string buildingId:', buildingId);
            return String(buildingId || ''); // Convert to string or use empty string as fallback
        }

        // First remove any instance suffix
        const withoutInstance = buildingId.replace(/-instance-\d+$/, '');
        // Then remove the tier suffix
        const baseId = withoutInstance.replace(/-t\d+$/, '');
        // Ensure we have the correct prefix
        return typeof baseId === 'string' && baseId.startsWith('claimStakeBuilding-') ? baseId : `claimStakeBuilding-${baseId}`;
    };

    // Get count of modules at each tier - enhanced to be more accurate
    const getModuleCountByTier = useCallback((buildingId) => {
        if (!buildingId || typeof buildingId !== 'string' || isHub) return {};
        const baseId = getBaseId(buildingId);
        const memoKey = `${baseId}-${buildingsList?.length || 0}-${underConstructionList?.length || 0}-${forceUpdate}`;
        const cacheAge = Date.now() - cacheLastInvalidatedRef.current;

        if (moduleCountsCache.current[memoKey] && cacheAge < 1000) {
            return moduleCountsCache.current[memoKey];
        }

        // Use buildingsList prop
        const counts = (buildingsList || []).reduce((accCounts, currentBuildingId) => {
            if (typeof currentBuildingId !== 'string') return accCounts;
            const bidBaseId = currentBuildingId.replace(/-instance-\d+$/, '').replace(/-t\d+$/, '');
            const currentBaseId = baseId.replace(/-t\d+$/, '');
            const isMatch = bidBaseId === currentBaseId && !isUnderConstruction(currentBuildingId); // Use the local isUnderConstruction

            if (isMatch) {
                const tierMatch = currentBuildingId.match(/-t(\d+)/);
                const tier = tierMatch ? parseInt(tierMatch[1]) : 1;
                accCounts[tier] = (accCounts[tier] || 0) + 1;
            }
            return accCounts;
        }, {});

        moduleCountsCache.current[memoKey] = counts;
        return counts;
    }, [isHub, buildingsList, underConstructionList, isUnderConstruction, forceUpdate, getBaseId]); // Dependencies on props

    const moduleCountsByTier = isHub ? null : getModuleCountByTier(id);

    const getConstructionProgress = (buildingId, constructionList) => {
        const construction = constructionList?.find(c => c.buildingId === buildingId);
        if (!construction) return 0;

        // Use absolute time calculation if timestamp is available (more accurate)
        if (construction.startTime && construction.endTime) {
            const totalTime = construction.endTime - construction.startTime;
            const elapsed = Date.now() - construction.startTime;
            return Math.min((elapsed / totalTime) * 100, 100);
        }

        // Fall back to progress field or calculate from timeRemaining
        if (construction.progress !== undefined) {
            return construction.progress;
        }

        const totalTime = construction.constructionTime || construction.originalTime || 60;
        const remaining = construction.timeRemaining || 0;
        return Math.min(100, Math.max(0, ((totalTime - remaining) / totalTime) * 100));
    };

    const getTimeRemaining = (buildingId, constructionList) => {
        const construction = constructionList?.find(c => c.buildingId === buildingId);
        if (!construction) return 0;

        // Use absolute time if available (more accurate)
        if (construction.endTime && construction.endTime > 0) {
            const now = Date.now();
            const remaining = Math.max(0, (construction.endTime - now) / 1000);
            return remaining;
        }

        // Fall back to the stored timeRemaining value
        return Math.max(0, construction.timeRemaining || 0);
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
            const match = buildingName.match(/^.*?\s*T(\d+)$/);

            if (match) {
                const baseName = buildingName.replace(/ T\d+$/, '');
                const tier = parseInt(match[1], 10);

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

    // Helper to check if building is directly buildable or requires prerequisites
    const isUnlockable = building && building.isDirectlyBuildable === false;

    // Add renderPrerequisiteWarning before renderTierContent
    const renderPrerequisiteWarning = () => {
        // If building can be built directly, don't show anything
        if (!isUnlockable) return null;

        // Check if we have specific required buildings to show
        if (building.requiredBuildings && building.requiredBuildings.length > 0) {
            return (
                <div className="prerequisite-warning">
                    <span className="prerequisite-icon">⚠️</span>
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
                </div>
            );
        }

        // Fallback to generic warning if we don't have specific buildings
        return (
            <div className="prerequisite-warning">
                <span className="prerequisite-icon">🔒</span>
                <span>Requires prerequisites</span>
            </div>
        );
    };

    // Update the renderCostModeTabs function to follow our new requirements
    const renderCostModeTabs = () => {
        // For debugging - add a visible indicator instead of console logs
        const debugInfo = {
            id,
            isHub,
            isAlreadyConstructed,
            buildingsList: buildingsList.join(', ')
        };

        // Special handling for hubs - don't show any tabs for hubs
        // since the action button will handle the upgrade functionality
        if (isHub) {
            return null;
        }

        // For non-hub buildings (modules):
        // Only show if we're on Tier 1 AND there's at least one existing module at this tier
        const hasExistingT1Modules = activeTier === 1 && (moduleCountsByTier?.[1] > 0);

        // Don't show for tiers 2-5 at all
        if (activeTier > 1) {
            return null;
        }

        // Only show if we have T1 modules that can potentially be upgraded
        if (!hasExistingT1Modules) {
            return null;
        }

        return (
            <div className="cost-mode-tabs">
                <button
                    className={`cost-mode-tab ${costMode === 'construct' ? 'active' : ''}`}
                    onClick={() => setCostMode('construct')}
                >
                    Add Module
                </button>
                <button
                    className={`cost-mode-tab ${costMode === 'upgrade' ? 'active' : ''}`}
                    onClick={() => setCostMode('upgrade')}
                >
                    Upgrade
                </button>
            </div>
        );
    };

    // Check if the player can afford the current upgrade
    const canAffordUpgrade = useMemo(() => {
        // Get the next tier building
        const nextTierBuildingData = getBuildingForTier(activeTier + 1);

        if (!nextTierBuildingData || !nextTierBuildingData.constructionCost) return false;

        // Get the combined resources (local + global)
        const allResources = {
            ...globalResources,
            ...resources
        };

        // Check each resource cost
        const canAfford = Object.entries(nextTierBuildingData.constructionCost).every(([resource, amount]) => {
            const resourceKey = resource.toLowerCase();
            const currentAmount = allResources[resourceKey] || 0;
            return currentAmount >= amount;
        });

        return canAfford;
    }, [activeTier, getBuildingForTier, resources, globalResources, id, isHub]);

    // Now renderActionButton can use canAffordUpgrade safely
    const renderActionButton = () => {
        // Hub-specific logic
        if (isHub) {
            // Extract the base hub type and check if it's already constructed
            const baseHubType = id.replace(/-t\d+$/, '');

            // Check if this hub type is already constructed by looking for any building in the list
            // that contains this hub type (regardless of tier)
            const hubIsConstructed = isAlreadyConstructed ||
                buildingsList.some(buildingId => {
                    // Convert both to lowercase for case-insensitive comparison
                    const lowerBuildingId = buildingId.toLowerCase();
                    const lowerBaseHubType = baseHubType.toLowerCase();

                    // More specific check to avoid false positives with substring matches
                    // Use regex boundary or specific pattern matching instead of simple includes
                    return lowerBuildingId === lowerBaseHubType || // Exact match
                        lowerBuildingId === `claimstakebuilding-${lowerBaseHubType}` || // With prefix
                        lowerBuildingId.match(new RegExp(`(^|-)${lowerBaseHubType}(-|$)`)); // With boundaries
                });

            // Not yet constructed - show Construct Hub button (remove isNewModule condition)
            if (!hubIsConstructed) {
                // Use same resource calculation as display for consistency
                const currentCost = building?.constructionCost || {};
                const allResources = { ...globalResources, ...resources };
                const canAffordConstruction = Object.entries(currentCost).every(([resource, amount]) => {
                    const resourceKey = resource.toLowerCase();
                    const currentAmount = allResources[resourceKey] || 0;
                    return currentAmount >= amount;
                });

                return (
                    <button
                        className="action-button construct-button"
                        onClick={() => handleAction('construct')}
                        disabled={!canAffordConstruction || !canBuildWithPower || !hasRequiredTags}
                    >
                        Construct Hub
                    </button>
                );
            }

            // Existing hub - check for game's absolute max tier first
            if (activeTier >= maxTier) {
                return (
                    <button
                        className="action-button upgrade-button disabled"
                        disabled={true}
                    >
                        Maximum Tier Reached
                    </button>
                );
            }

            // Check for claim stake tier limit
            // Get the current building definition to check for minimumTier property
            const currentBuilding = getBuildingForTier(activeTier);
            const buildingMinimumTier = currentBuilding?.minimumTier || 1;

            // Only show the tier limit warning if:
            // 1. The active tier equals the claim stake tier (not less than)
            // 2. The building's minimumTier property is not greater than the active tier
            if (activeTier === finalClaimStakeTier && buildingMinimumTier <= activeTier) {
                return (
                    <div>
                        <button
                            className="action-button upgrade-button disabled"
                            disabled={true}
                            title={`Hub upgrades limited to claim stake tier (T${finalClaimStakeTier})`}
                        >
                            Claim Stake Tier Limit
                        </button>
                        <div className="tier-limit-warning">
                            <span className="warning-icon">⚠️</span>
                            <span>Max tier for this claim stake (T{finalClaimStakeTier})</span>
                        </div>
                    </div>
                );
            }

            // Normal upgrade button for hub - can upgrade as long as current tier < claim stake tier
            const nextTierBuildingData = getBuildingForTier(activeTier + 1);
            const currentCost = nextTierBuildingData?.constructionCost || {};
            const allResources = { ...globalResources, ...resources };
            const missingResources = [];
            const directAffordCheck = Object.entries(currentCost).every(([resource, amount]) => {
                const resourceKey = resource.toLowerCase();
                const currentAmount = allResources[resourceKey] || 0;
                const result = currentAmount >= amount;

                if (!result) {
                    const shortfall = amount - currentAmount;
                    missingResources.push(`${resource.replace('cargo-', '')}: ${shortfall.toFixed(0)}`);
                }

                return result;
            });

            const missingResourcesText = missingResources.length > 0 ?
                `Missing: ${missingResources.join(', ')}` : '';

            if (hubIsConstructed && costMode !== 'upgrade') {
                setCostMode('upgrade');
            }

            return (
                <div>
                    <button
                        className={`action-button upgrade-button ${directAffordCheck ? '' : 'disabled'}`}
                        onClick={() => handleAction('upgrade')}
                        disabled={!directAffordCheck}
                        title={missingResourcesText}
                    >
                        Upgrade to T{activeTier + 1}
                    </button>
                </div>
            );
        }

        // Module logic for Tier 1
        if (activeTier === 1) {
            const hasExistingT1Modules = moduleCountsByTier?.[1] > 0;

            // Construction mode or no existing modules - show Add Module
            if (costMode === 'construct' || !hasExistingT1Modules) {
                return (
                    <button
                        className="action-button construct-button"
                        onClick={() => handleAction('construct')}
                        disabled={!canAfford || !canBuildWithPower || !hasRequiredTags}
                    >
                        Add Module
                    </button>
                );
            }

            // Upgrade mode and has modules - show Upgrade
            return (
                <button
                    className="action-button upgrade-button"
                    onClick={() => handleAction('upgrade')}
                    disabled={!canAffordUpgrade}
                >
                    Upgrade to T{activeTier + 1}
                </button>
            );
        }

        // Module logic for Tier 2-4
        if (activeTier >= 2 && activeTier < maxTier) {
            // Make sure we have module instances at this tier before enabling the upgrade button
            const hasModulesAtCurrentTier = moduleCountsByTier?.[activeTier] > 0;

            // Upgrade button for T2-T4 - only enable if we have modules at this tier
            return (
                <button
                    className="action-button upgrade-button"
                    onClick={() => handleAction('upgrade')}
                    disabled={!canAffordUpgrade || !hasModulesAtCurrentTier}
                >
                    Upgrade to T{activeTier + 1}
                </button>
            );
        }

        // Tier 5 max tier reached
        return (
            <button
                className="action-button upgrade-button disabled"
                disabled={true}
            >
                Maximum Tier Reached
            </button>
        );
    };

    // Function to get the upgrade cost for a specific tier
    const getUpgradeCostForTier = (tier) => {
        // Get the current tier building
        const currentTierBuilding = getBuildingForTier(tier);
        if (!currentTierBuilding) return {};

        // Get the next tier building
        const nextTierBuilding = getBuildingForTier(tier + 1);
        if (!nextTierBuilding) return {};

        // Return the construction cost of the next tier building
        return nextTierBuilding.constructionCost || {};
    };

    // Combine actual and potential resource rates - MOVED UP before it's used in JSX
    const combinedResourceRate = useMemo(() => {
        // For constructed buildings, use actual resource rates
        if (isAlreadyConstructed) {
            return processResourceRate;
        }
        // For buildings not yet constructed, use potential resource rates
        return processResourceRateFromDefinition;
    }, [isAlreadyConstructed, processResourceRate, processResourceRateFromDefinition]);

    // Calculate effective extraction rates based on planet richness
    const effectiveResourceExtraction = useMemo(() => {
        const result = {};

        Object.entries(resourceExtraction).forEach(([resource, baseRate]) => {
            // Get the richness value for this resource (default to 0 if not present)
            const richness = resourceRichness?.[resource] || 0;

            // Calculate the effective rate based on richness
            const effectiveRate = baseRate * richness;

            // Only include resources that will actually be produced (rate > 0)
            if (effectiveRate > 0) {
                result[resource] = effectiveRate;
            }
        });

        return result;
    }, [resourceExtraction, resourceRichness]);

    // Modify the renderTierContent function to render content based on active tab
    const renderTierContent = useMemo(() => {
        const tierBuilding = getBuildingForTier(activeTier);

        // For hub buildings, we should still try to render even if tierBuilding is missing
        if (!tierBuilding) {
            console.log(`⚠️ No tier data found for ${building.name || id} at tier ${activeTier}`);

            // For hub buildings, show a simplified version instead of "No data" message
            if (isHub) {
                console.log(`🏢 Rendering simplified hub view for ${building.name || id} tier ${activeTier}`);
                return (
                    <div className="tier-content">
                        {/* Content tabs (Overview / Production / Construct) */}
                        <div className="content-tabs-row">
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
                                <button
                                    className={`content-tab ${activeTab === 'construct' ? 'active' : ''}`}
                                    onClick={() => handleTabClick('construct')}
                                >
                                    {isAlreadyConstructed ? 'Upgrade' : 'Build'}
                                </button>
                            </div>
                        </div>

                        <div className="building-tab-content">
                            {/* Overview Tab Content */}
                            {activeTab === 'overview' && (
                                <>
                                    {/* Required Buildings */}
                                    {renderPrerequisiteWarning()}

                                    <div className="building-stats-grid">
                                        <div className="stat-row">
                                            <span className="stat-name">Power:</span>
                                            <span className="stat-value">-</span>
                                        </div>
                                        <div className="stat-row">
                                            <span className="stat-name">Crew:</span>
                                            <span className="stat-value">-</span>
                                        </div>
                                        <div className="stat-row">
                                            <span className="stat-name">Storage:</span>
                                            <span className="stat-value">-</span>
                                        </div>
                                    </div>
                                </>)}

                            {/* Production Tab Content */}
                            {activeTab === 'production' && (
                                <div className="resource-section"> {/* Use a container div */}
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
                                                        {Object.entries(combinedResourceRate.outputs).map(([resource, rate]) => {
                                                            const resourceKey = resource.toLowerCase();
                                                            const currentAmount = getResourceAmount(resourceKey);

                                                            return (
                                                                <div key={resource} className="stat-row">
                                                                    <span className="stat-name">{formatResourceName(resource)}:</span>
                                                                    <span className="stat-value positive">+{rate}/s {isAlreadyConstructed ?
                                                                        `(${currentAmount.toFixed(1)})` :
                                                                        "(potential)"}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Consumption view */}
                                                {activeResourceTab === 'consumes' && Object.keys(combinedResourceRate.inputs).length > 0 && (
                                                    <div className="resource-flow">
                                                        {Object.entries(combinedResourceRate.inputs).map(([resource, rate]) => {
                                                            const resourceKey = resource.toLowerCase();
                                                            const currentAmount = getResourceAmount(resourceKey);

                                                            return (
                                                                <div key={resource} className="stat-row">
                                                                    <span className="stat-name">{formatResourceName(resource)}:</span>
                                                                    <span className="stat-value negative">-{rate}/s {isAlreadyConstructed ?
                                                                        `(${currentAmount.toFixed(1)})` :
                                                                        "(potential)"}</span>
                                                                </div>
                                                            );
                                                        })}
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

                                    {/* Extraction outputs section */}
                                    {Object.keys(effectiveResourceExtraction).length > 0 && (
                                        <div className="resource-list">
                                            <span className="flow-label">Extraction Outputs:</span>
                                            <div className="resource-flow">
                                                {Object.entries(effectiveResourceExtraction)
                                                    .filter(([resource, rate]) => rate > 0)
                                                    .map(([resource, rate]) => {
                                                        const currentAmount = localResources[resource.toLowerCase()] || 0;
                                                        return (
                                                            <div key={resource} className="stat-row">
                                                                <span className="stat-name">{resource.replace('cargo-', '')}:</span>
                                                                <span className="stat-value positive">+{rate}/s ({currentAmount.toFixed(1)})</span>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Construct Tab Content */}
                            {activeTab === 'construct' && (
                                <div className="construction-section">
                                    {/* Mode Tabs when applicable */}
                                    {renderCostModeTabs()}

                                    {/* Construction/Upgrade section */}
                                    <div className="resource-section">
                                        <span className="flow-label">{costTitle}:</span>
                                        {Object.entries(currentCost || {}).map(([resource, amount]) => (
                                            <div
                                                key={resource}
                                                className={`stat-row ${getResourceAmount(resource) >= amount ? 'available' : 'unavailable'}`}
                                                onClick={getResourceAmount(resource) >= amount ? undefined : () => setShowProductionChainModal(true)}
                                            >
                                                <span className="stat-name">{resource}: {amount}</span>
                                                <span className="stat-value">(Have: {getResourceAmount(resource).toFixed(1)})</span>
                                            </div>
                                        ))}

                                        {/* Action buttons based on mode */}
                                        <div className="action-buttons">
                                            {renderActionButton()}
                                        </div>

                                        {/* Resource assistance buttons - show when resources are insufficient */}
                                        {showResourceButtons && (
                                            <div className="building-actions">
                                                <button
                                                    className="receive-resources-button"
                                                    onClick={() => onReceiveResources(currentCostState)}
                                                >
                                                    Receive Resources
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {renderUpgradeRequirements()}
                                </div>
                            )}
                        </div>
                    </div>
                );
            }

            // Only show "No data" for non-hub buildings
            return (
                <div className="tier-content">
                    {/* Content tabs (Overview / Production / Construct) */}
                    <div className="content-tabs-row">
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
                            <button
                                className={`content-tab ${activeTab === 'construct' ? 'active' : ''}`}
                                onClick={() => handleTabClick('construct')}
                            >
                                {isAlreadyConstructed ? 'Upgrade' : 'Build'}
                            </button>
                        </div>
                    </div>

                    <div className="building-tab-content">
                        <div className="no-tier-data">No data for tier {activeTier}</div>
                    </div>
                </div>
            );
        }

        // Determine if building is primarily for processing (consumes resources)
        // A simple check: does it have inputs defined in resourceRate?
        // More robust check might involve tags or specific naming conventions if available.
        const consumesInputs = tierBuilding.resourceRate && Object.keys(tierBuilding.resourceRate).length > 0;
        // Let's also assume hubs aren't "processing" in this context for the notice
        const isProcessingType = consumesInputs && !isHub;

        const effectiveExtractionRates = calculateEffectiveResourceExtraction(tierBuilding.resourceExtractionRate);

        // Identify missing NATIVE inputs for processing buildings
        let missingNativeInputs = [];
        if (isProcessingType) {
            missingNativeInputs = Object.keys(tierBuilding.resourceRate).filter(
                inputResource => !isResourceNative(inputResource)
            );
        }

        // Determine which cost to show based on mode
        const currentCost = costMode === 'upgrade' ? getUpgradeCostForTier(activeTier) : tierBuilding.constructionCost;

        const costTitle = costMode === 'upgrade' ? `Upgrade Cost (T${activeTier} → T${activeTier + 1})` : 'Construction Cost';

        // Check if player can afford the CURRENT cost (construction or upgrade)
        const canAffordCurrentCost = Object.entries(currentCost || {}).every(
            ([resource, amount]) => {
                const resourceKey = resource.toLowerCase();
                const currentAmount = allAvailableResources[resourceKey] || 0;
                return currentAmount >= amount;
            }
        );

        // Resource buttons should show when we can't afford the CURRENT cost
        const showResourceButtons = !canAffordCurrentCost;

        // For upgrade mode specific checks
        const hasModulesToUpgrade = !isHub && (moduleCountsByTier?.[activeTier] > 0);
        const canUpgrade = costMode === 'upgrade' ? (hasModulesToUpgrade && canAffordCurrentCost) : false;

        // Create and use the proper requirements check for upgrade
        const renderUpgradeRequirements = () => {
            if (costMode !== 'upgrade' || isHub) return null;

            const requirements = [];

            // Check if resources are sufficient
            const insufficientResources = Object.entries(currentCost || {})
                .filter(([resource, amount]) => {
                    const resourceKey = resource.toLowerCase();
                    const currentAmount = allAvailableResources[resourceKey] || 0;
                    return currentAmount < amount;
                })
                .map(([resource]) => resource.replace('cargo-', ''));

            if (insufficientResources.length > 0) {
                requirements.push(`Insufficient ${insufficientResources.join(', ')}`);
            }

            // Only show if there are requirements not met
            if (requirements.length > 0) {
                return (
                    <div className="upgrade-requirements-info">
                        <h4>Upgrade Requirements:</h4>
                        <ul>
                            {requirements.map((req, i) => (
                                <li key={i} className="requirement-not-met">{req}</li>
                            ))}
                        </ul>
                    </div>
                );
            }

            return null;
        };

        return (
            <div className="tier-content">
                {/* Content tabs (Overview / Production / Construct) */}
                <div className="content-tabs-row">
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
                        <button
                            className={`content-tab ${activeTab === 'construct' ? 'active' : ''}`}
                            onClick={() => handleTabClick('construct')}
                        >
                            {isAlreadyConstructed ? 'Upgrade' : 'Build'}
                        </button>
                    </div>
                </div>

                <div className="building-tab-content">
                    {/* Overview Tab Content */}
                    {activeTab === 'overview' && (
                        <>
                            {/* Required Buildings */}
                            {renderPrerequisiteWarning()}

                            <div className="building-stats-grid">
                                <h4>Building Stats:</h4>
                                {/* Power Info */}
                                <div className="stat-row">
                                    <span className="stat-name">Power:</span>
                                    <span className={`stat-value ${tierBuilding.power >= 0 ? 'positive' : 'negative'}`}>
                                        {tierBuilding.power >= 0 ? `+${tierBuilding.power}` : tierBuilding.power}
                                    </span>
                                </div>

                                {/* Crew Info */}
                                <div className="stat-row">
                                    <span className="stat-name">Crew:</span>
                                    <span className="stat-value">{tierBuilding.neededCrew || 0}</span>
                                </div>

                                {/* Storage Info */}
                                <div className="stat-row">
                                    <span className="stat-name">Storage:</span>
                                    <span className="stat-value">
                                        {tierBuilding.storage ? tierBuilding.storage : '0'}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Production Tab Content */}
                    {activeTab === 'production' && (
                        <>
                            <div className="resource-section"> {/* Use a container div */}
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
                                                    {Object.entries(combinedResourceRate.outputs).map(([resource, rate]) => {
                                                        const resourceKey = resource.toLowerCase();
                                                        const currentAmount = getResourceAmount(resourceKey);

                                                        return (
                                                            <div key={resource} className="stat-row">
                                                                <span className="stat-name">{formatResourceName(resource)}:</span>
                                                                <span className="stat-value positive">+{rate}/s {isAlreadyConstructed ?
                                                                    `(${currentAmount.toFixed(1)})` :
                                                                    "(potential)"}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Consumption view */}
                                            {activeResourceTab === 'consumes' && Object.keys(combinedResourceRate.inputs).length > 0 && (
                                                <div className="resource-flow">
                                                    {Object.entries(combinedResourceRate.inputs).map(([resource, rate]) => {
                                                        const resourceKey = resource.toLowerCase();
                                                        const currentAmount = getResourceAmount(resourceKey);

                                                        return (
                                                            <div key={resource} className="stat-row">
                                                                <span className="stat-name">{formatResourceName(resource)}:</span>
                                                                <span className="stat-value negative">-{rate}/s {isAlreadyConstructed ?
                                                                    `(${currentAmount.toFixed(1)})` :
                                                                    "(potential)"}</span>
                                                            </div>
                                                        );
                                                    })}
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
                            </div>
                        </>
                    )}

                    {/* Construct Tab Content */}
                    {activeTab === 'construct' && (
                        <div className="construction-section">
                            {/* Mode Tabs when applicable */}
                            {renderCostModeTabs()}

                            {/* Construction/Upgrade section */}
                            <div className="resource-section">
                                <span className="flow-label">{costTitle}:</span>
                                {Object.entries(currentCost || {}).map(([resource, amount]) => (
                                    <div
                                        key={resource}
                                        className={`stat-row ${getResourceAmount(resource) >= amount ? 'available' : 'unavailable'}`}
                                        onClick={getResourceAmount(resource) >= amount ? undefined : () => setShowProductionChainModal(true)}
                                    >
                                        <span className="stat-name">{resource}: {amount}</span>
                                        <span className="stat-value">(Have: {getResourceAmount(resource).toFixed(1)})</span>
                                    </div>
                                ))}

                                {/* Action buttons based on mode */}
                                <div className="action-buttons">
                                    {renderActionButton()}
                                </div>

                                {/* Resource assistance buttons - show when resources are insufficient */}
                                {showResourceButtons && (
                                    <div className="building-actions">
                                        <button
                                            className="receive-resources-button"
                                            onClick={() => onReceiveResources(currentCostState)}
                                        >
                                            Receive Resources
                                        </button>
                                    </div>
                                )}
                            </div>

                            {renderUpgradeRequirements()}
                        </div>
                    )}
                </div>
            </div>
        );
    }, [activeTier, activeTab, costMode, id, allAvailableResources, onReceiveResources, currentCostState, calculateEffectiveResourceExtraction, building, moduleCountsByTier, isHub, renderCostModeTabs, renderActionButton, getBuildingForTier, getUpgradeCostForTier, localResources, isResourceNative]);

    // Add useEffect to update currentCostState instead of doing it in render
    useEffect(() => {
        // Get the building for the active tier
        const tierBuilding = getBuildingForTier(activeTier);
        if (!tierBuilding) return;

        // Get upgrade cost if applicable
        const upgradeCost = getUpgradeCostForTier(activeTier);

        // Determine which cost to show based on mode
        const currentCost = costMode === 'upgrade' && upgradeCost ? upgradeCost : tierBuilding.constructionCost;

        // Update state in a useEffect instead of in render
        setCurrentCostState(currentCost || {});
    }, [activeTier, costMode, id]); // Dependencies that affect the cost

    const getRequirementsMessage = () => {
        const messages = [];
        if (!canAffordBuilding(building)) messages.push('Insufficient Resources');
        if (!canBuildWithPower(building)) messages.push('Insufficient Power');
        if (!hasRequiredTags(building)) messages.push('Missing Requirements');
        return messages;
    };

    const getTierComparison = (currentBuilding, nextTierBuilding) => {
        if (!nextTierBuilding) return null;

        const differences = [];

        // Compare power
        if (nextTierBuilding.power !== currentBuilding.power) {
            const powerDiff = nextTierBuilding.power - currentBuilding.power;
            differences.push(`Power: ${powerDiff > 0 ? '+' : ''}${powerDiff}`);
        }

        // Compare crew requirements
        if (nextTierBuilding.neededCrew !== currentBuilding.neededCrew) {
            const crewDiff = nextTierBuilding.neededCrew - currentBuilding.neededCrew;
            differences.push(`Crew: ${crewDiff > 0 ? '+' : ''}${crewDiff}`);
        }

        // Compare slots
        if (nextTierBuilding.slots !== currentBuilding.slots) {
            const slotsDiff = nextTierBuilding.slots - currentBuilding.slots;
            differences.push(`Slots: ${slotsDiff > 0 ? '+' : ''}${slotsDiff}`);
        }

        // Compare inputs/outputs
        const compareResources = (current, next, type) => {
            const currentRes = current[type] || {};
            const nextRes = next[type] || {};

            // Check for new or changed resources
            Object.entries(nextRes).forEach(([resource, amount]) => {
                const currentAmount = currentRes[resource] || 0;
                if (amount !== currentAmount) {
                    const diff = amount - currentAmount;
                    differences.push(`${type} ${resource}: ${diff > 0 ? '+' : ''}${diff}`);
                }
            });

            // Check for removed resources
            Object.keys(currentRes).forEach(resource => {
                if (!(resource in nextRes)) {
                    differences.push(`${type} ${resource}: Removed`);
                }
            });
        };

        compareResources(currentBuilding, nextTierBuilding, 'inputs');
        compareResources(currentBuilding, nextTierBuilding, 'outputs');

        return differences.length > 0 ? (
            <div className="tier-differences">
                <h5>Tier {currentTier + 1} Changes:</h5>
                {differences.map((diff, index) => (
                    <div key={index} className="tier-difference-item">
                        {diff}
                    </div>
                ))}
            </div>
        ) : null;
    };

    // Add an explicit check for isUnderConstruction if not provided
    const checkIfUnderConstruction = (buildingId) => {
        // First use the prop function if provided
        if (typeof isUnderConstructionProp === 'function') {
            return isUnderConstructionProp(buildingId);
        }

        // Check if the building ID is in the underConstruction array
        if (Array.isArray(underConstructionList)) {
            return underConstructionList.some(
                item => item.buildingId === buildingId
            );
        }

        // Default to false if no other method works
        return false;
    };

    // Add this after the existing useEffect blocks to listen for moduleUpgraded events
    useEffect(() => {
        // Force refresh of module counts when modules are upgraded
        const handleModuleUpgraded = (e) => {
            // Invalidate the cache to force a fresh count
            cacheLastInvalidatedRef.current = Date.now();
            // Clear the entire module counts cache
            moduleCountsCache.current = {};

            // Force immediate UI update
            setForceUpdate(prev => prev + 1);

            console.log("🔄 BuildingCard - Module upgrade detected, refreshing module counts");
        };

        // Listen for changes to the buildings array
        const handleBuildingsArrayUpdate = (e) => {
            // Invalidate the cache
            cacheLastInvalidatedRef.current = Date.now();
            moduleCountsCache.current = {};

            // Force immediate UI update
            setForceUpdate(prev => prev + 1);
        };

        window.addEventListener('moduleUpgraded', handleModuleUpgraded);
        window.addEventListener('updateDebugBuildingsArray', handleBuildingsArrayUpdate);
        window.addEventListener('buildingAddedToClaimStake', handleBuildingsArrayUpdate);

        return () => {
            window.removeEventListener('moduleUpgraded', handleModuleUpgraded);
            window.removeEventListener('updateDebugBuildingsArray', handleBuildingsArrayUpdate);
            window.removeEventListener('buildingAddedToClaimStake', handleBuildingsArrayUpdate);
        };
    }, [id]); // Only re-add listeners if the building ID changes

    // Use useEffect to handle resources received events
    useEffect(() => {
        const handleResourcesReceived = (event) => {
            console.log(`🔄 BuildingCard ${id} - Resources received event for ${id}`);
            // Use setTimeout to push the state update to the next tick
            setTimeout(() => {
                setForceUpdate(prev => prev + 1);
            }, 0);
        };

        window.addEventListener('resourcesReceived', handleResourcesReceived);

        return () => {
            window.removeEventListener('resourcesReceived', handleResourcesReceived);
        };
    }, [id]);

    // Add function to handle tab clicks
    const handleTabClick = (tab) => {
        setActiveTab(tab);
    };

    // Render tier tabs - UPDATED to show module count for hubs and modules
    const renderTierTabs = () => {
        const allTiers = building.allTiers || [1, 2, 3, 4, 5].filter(t => t <= maxTier);

        // Calculate tier map in advance
        let tierMap = {};
        if (isHub) {
            // For hubs, we either have 0 or 1 of each tier
            const hubType = id.replace(/-t\d+$/, '');

            // Format the building ID properly to match what's in buildingsList
            // This accounts for the claimStakeBuilding- prefix if present
            allTiers.forEach(tier => {
                // Try different formats of the building ID to handle all cases
                const tierBuildingId = `${hubType}-t${tier}`;
                const prefixedTierBuildingId = `claimStakeBuilding-${hubType}-t${tier}`;

                // Check if any version of this hub tier ID exists in the buildings list
                // Now also account for instance suffixes (-instance-timestamp)
                const isBuilt = buildingsList.some(bId => {
                    // Remove any instance suffix before comparing
                    const normalizedBId = bId.replace(/-instance-\d+$/, '');
                    const lowerNormalizedBId = normalizedBId.toLowerCase();

                    // Compare the building ID without the instance suffix
                    return lowerNormalizedBId === tierBuildingId.toLowerCase() ||
                        lowerNormalizedBId === prefixedTierBuildingId.toLowerCase();
                });

                tierMap[tier] = isBuilt ? 1 : 0;
            });
        } else {
            // For modules, use moduleCountsByTier
            tierMap = moduleCountsByTier || {};
        }

        return (
            <div className="tier-tabs">
                {allTiers.map(tier => {
                    const count = tierMap[tier] || 0;
                    const showCount = count > 0;

                    return (
                        <button
                            key={tier}
                            className={`tier-tab ${tier === activeTier ? 'active' : ''}`}
                            onClick={() => setActiveTier(tier)}
                        >
                            T{tier}
                            {showCount && (
                                <span className="count-indicator">{count}</span>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    };

    // Helper to format building display name
    const getDisplayBuildingName = (buildingName) => {
        // For names like "Central Hub T1" or "claimStakeBuilding-central-hub-t1"
        let match = buildingName.match(/^claimStakeBuilding-(.*?)-t\d+$/i);
        if (match) {
            return match[1]
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        match = buildingName.match(/^(.*?)\s*T\d+$/i);
        if (match) {
            return match[1];
        }
        return buildingName;
    };

    // Modify the handleAction function to properly format building IDs
    const handleAction = useCallback((actionType) => {
        // console.log(`ud83dudd04 [CONSTRUCTION DEBUG] HandleAction called with type: ${actionType} for building: ${id}`);
        // console.log(`ud83dudd04 [CONSTRUCTION DEBUG] Building is hub: ${isHub}, isNewModule: ${isNewModule}`);
        // console.log(`ud83dudd04 [CONSTRUCTION DEBUG] Buildings list:`, buildingsList);

        // Get base building ID without instance part for consistency
        const baseId = id.replace(/-instance-\d+$/, '');

        // Process user actions without starting any immediate state updates
        if (actionType === 'construct') {
            // Ensure the building ID has the correct prefix
            // Get the building data to ensure we have the correct ID format
            const buildingsData = gameData?.claimStakeBuildings ||
                (gameData?.data && gameData.data.claimStakeBuildings) ||
                {};

            // Try to find the correct building ID format
            let correctBuildingId = id;

            // If the ID doesn't have the claimStakeBuilding prefix, try to find the correct format
            if (!id.startsWith('claimStakeBuilding-')) {
                // First try with the prefix added
                const prefixedId = `claimStakeBuilding-${id}`;
                if (buildingsData[prefixedId]) {
                    correctBuildingId = prefixedId;
                    // console.log(`u2705 [CONSTRUCTION DEBUG] Found building with prefixed ID: ${prefixedId}`);
                } else {
                    // If that doesn't work, search for a matching ID by the base name
                    const baseName = id.replace(/-t\d+$/, '');
                    const matchingIds = Object.keys(buildingsData).filter(key =>
                        key.includes(baseName) && key.includes(`-t${activeTier}`)
                    );

                    if (matchingIds.length > 0) {
                        correctBuildingId = matchingIds[0];
                        // console.log(`u2705 [CONSTRUCTION DEBUG] Found matching building ID: ${correctBuildingId}`);
                    } else {
                        // console.warn(`u26a0ufe0f [CONSTRUCTION DEBUG] Could not find exact building ID match for ${id}, using as-is`);
                    }
                }
            }

            // console.log(`ud83dudd28 [CONSTRUCTION DEBUG] Constructing building with ID: ${correctBuildingId}, isHub: ${isHub}`);
            // console.log(`ud83dudd28 [CONSTRUCTION DEBUG] onSelect function exists: ${!!onSelect}`);

            // Log what we're passing to onSelect
            const constructionData = {
                action: 'construct',
                buildingId: correctBuildingId,
                tier: activeTier,
                timestamp: Date.now(),
                isHub: isHub
            };
            // console.log(`ud83dudd28 [CONSTRUCTION DEBUG] Sending construction data:`, constructionData);

            // For construction, use the correct building ID and current tier from the tab
            onSelect(correctBuildingId, constructionData);

            // Dispatch an additional event for debugging
            window.dispatchEvent(new CustomEvent('debugConstructionAttempt', {
                detail: {
                    buildingId: correctBuildingId,
                    type: actionType,
                    timestamp: Date.now()
                }
            }));
        } else if (actionType === 'upgrade') {
            // Important: Get correct tier info from the active tab
            const sourceTier = activeTier;
            const targetTier = activeTier + 1;

            // console.log(`ud83dudd04 [CONSTRUCTION DEBUG] Initiating upgrade from T${sourceTier} to T${targetTier}`);

            // Generate the correct building ID based on the active tier
            let tierBuildingId = baseId.replace(/-t\d+/, `-t${sourceTier}`);

            // Ensure the building ID has the correct prefix
            if (!tierBuildingId.startsWith('claimStakeBuilding-')) {
                tierBuildingId = `claimStakeBuilding-${tierBuildingId}`;
            }

            const upgradeData = {
                action: 'upgrade',
                buildingId: tierBuildingId,
                currentTier: sourceTier,
                nextTier: targetTier,
                timestamp: Date.now()
            };
            // console.log(`ud83dudd28 [CONSTRUCTION DEBUG] Sending upgrade data:`, upgradeData);

            onSelect(tierBuildingId, upgradeData);

            // Dispatch an additional event for debugging
            window.dispatchEvent(new CustomEvent('debugUpgradeAttempt', {
                detail: {
                    buildingId: tierBuildingId,
                    fromTier: sourceTier,
                    toTier: targetTier,
                    timestamp: Date.now()
                }
            }));
        }
    }, [id, activeTier, onSelect, gameData, isHub, isNewModule, buildingsList]);

    // Function to toggle showing the production chain modal
    const handleShowProductionChain = () => {
        setShowProductionChainModal(true);
    };

    // Fetch resources for construction/upgrade
    const handleReceiveResources = (resources) => {
        if (onReceiveResources) {
            onReceiveResources(resources);
        }

        // Immediately update UI
        setForceUpdate(prev => prev + 1);
    };

    // Add a new listener for construction resource deduction events
    useEffect(() => {
        const handleConstructionResourcesDeducted = (e) => {
            console.log(`ud83dudd04 BuildingCard ${id} - Construction resources deduction event received`);

            if (e.detail?.resources) {
                // Force an immediate update of local resources
                setLocalResources(prevResources => {
                    // Create a new resource object that prioritizes the updated resources
                    const updatedResources = {
                        ...prevResources,
                        ...e.detail.resources
                    };

                    // Log what's changing
                    if (process.env.NODE_ENV === 'development') {
                        const constructionResources = Object.keys(updatedResources)
                            .filter(key => key.includes('steel') || key.includes('electronics') || key.includes('aluminum'));

                        if (constructionResources.length > 0) {
                            console.log(`ud83cudfd7ufe0f BuildingCard ${id} - Construction resource values updated:`,
                                constructionResources.map(key =>
                                    `${key}: ${prevResources[key] || 0} -> ${updatedResources[key] || 0}`
                                ).join(', ')
                            );
                        }
                    }

                    return updatedResources;
                });

                // Force the canAfford calculation to run again
                setForceUpdate(prev => prev + 1);
            }
        };

        // Register a second listener for resources received event
        const handleResourcesReceived = (e) => {
            console.log(`ud83dudd04 BuildingCard - Resources received event for ${id}`);
            // Force refresh of local resources to pick up new values
            setForceUpdate(prev => prev + 1);
        };

        window.addEventListener('constructionResourcesDeducted', handleConstructionResourcesDeducted);
        window.addEventListener('resourcesReceived', handleResourcesReceived);

        return () => {
            window.removeEventListener('constructionResourcesDeducted', handleConstructionResourcesDeducted);
            window.removeEventListener('resourcesReceived', handleResourcesReceived);
        };
    }, [id]);

    return (
        <div
            ref={cardRef}
            className={`building-card ${isSelected ? 'selected' : ''} ${isUnderConstruction(id) ? 'under-construction' : ''} ${isAlreadyConstructed ? 'already-constructed' : ''}`}
        >
            <div className="building-preview-header">
                <h3 className="building-name">
                    {getDisplayBuildingName(building.name)} {isHub && <span className="hub-label">HUB</span>}
                </h3>
            </div>

            <div className="tier-tabs-row">
                {renderTierTabs()}
            </div>

            {renderTierContent}

            {showProductionChainModal && createPortal(
                <ResourceProductionChainModal
                    isOpen={showProductionChainModal}
                    onClose={() => setShowProductionChainModal(false)}
                    constructionCost={currentCostState}
                    gameData={gameData}
                    onReceiveResources={onReceiveResources}
                />,
                document.body
            )}
        </div>
    );
};

export default BuildingCard;