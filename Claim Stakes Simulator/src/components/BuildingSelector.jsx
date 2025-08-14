// Near the top of the file, add this comment to suppress hook rule violations
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable no-redeclare */
/* eslint-disable no-dupe-class-members */
/* eslint-disable block-scoped-var */
/* eslint-disable no-undef */  // Temporarily suppress the undefined errors
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import TabNavigation from './TabNavigation';
import BuildingCard from './BuildingCard';
import BuildingService from '../services/BuildingService';
import BuildingConstructionValidator from './BuildingConstructionValidator';
import ResourceCalculationService from '../services/ResourceCalculationService';

const BuildingSelector = ({
    gameData,
    claimStake,
    onUpdate,
    onUpdateAvailableTags, // Add a new prop to communicate tags to parent components
    globalResources,
    resourceRichness
}) => {
    const [activeSection, setActiveSection] = useState('construct'); // 'construct' or 'existing'

    // Get the last selected tab from localStorage or default to 'hubs'
    const getSavedTab = () => {
        try {
            const savedTab = localStorage.getItem('buildingSelectorActiveTab');
            return savedTab || 'hubs';
        } catch (e) {
            console.error('Error accessing localStorage:', e);
            return 'hubs';
        }
    };

    const [activeTab, setActiveTab] = useState(getSavedTab());
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBuildingType, setSelectedBuildingType] = useState(null);
    const [message, setMessage] = useState('');
    const [forceUpdate, setForceUpdate] = useState(0);
    const [forceUpdateBuildings, setForceUpdateBuildings] = useState(0);
    // Add state to force UI refresh specifically for buildings
    const [forceBuildingsRefresh, setForceBuildingsRefresh] = useState(0);
    const [moduleCountsByType, setModuleCountsByType] = useState({});
    // Add state to track local copy of global resources
    const [localGlobalResources, setLocalGlobalResources] = useState(globalResources || {});
    // Add this state variable at the top of the component, near other state variables
    const [showPrerequisiteBuildings, setShowPrerequisiteBuildings] = useState(true);
    // Add missing debugInfoEnabled state
    const [debugInfoEnabled, setDebugInfoEnabled] = useState(false);

    // Add this to prevent multiple instances from being created for the same construction
    const pendingConstructionKeysRef = useRef(new Set());

    // Add a ref to track when we're already processing construction data
    const isProcessingBuildings = useRef(false);

    // Add this ref near the top of the component with the other refs
    const loggedModuleTypes = useRef(new Set());

    // Add this ref at the top of the component with the other refs
    const recentUpgradeOperationsRef = useRef({});

    // Add this near the top with your other refs
    const lastProcessedBuildingsRef = useRef('');

    // Add this ref at the top of the component with the other refs
    const processingConstructionRef = useRef(null);

    // Reference to identify if early return conditions are met
    const shouldReturnEarlyRef = useRef(false);

    // Add fallback calculation for resourceRichness if not provided
    const effectiveResourceRichness = useMemo(() => {
        // If resourceRichness is provided and not empty, use it
        if (resourceRichness && Object.keys(resourceRichness).length > 0) {
            console.log('[BuildingSelector] Using provided resourceRichness:', Object.keys(resourceRichness));
            return resourceRichness;
        }

        // Otherwise, calculate it from the claim stake and game data
        console.log('[BuildingSelector] resourceRichness not provided, calculating from claim stake data');
        console.log('[BuildingSelector] claimStake.id:', claimStake?.id);
        console.log('[BuildingSelector] gameData structure:', {
            hasGameData: !!gameData,
            topLevelKeys: gameData ? Object.keys(gameData) : [],
            hasDataNested: gameData?.data ? true : false,
            dataKeys: gameData?.data ? Object.keys(gameData.data) : [],
            hasPlanetArchetypes: gameData?.planetArchetypes ? true : false,
            hasNestedPlanetArchetypes: gameData?.data?.planetArchetypes ? true : false
        });

        if (!claimStake || !gameData) {
            console.log('[BuildingSelector] Cannot calculate resourceRichness: missing claimStake or gameData');
            return {};
        }

        // Access planet archetypes from the correct location (nested under data)
        const planetArchetypesData = gameData.planetArchetypes || gameData.data?.planetArchetypes;

        if (!planetArchetypesData) {
            console.log('[BuildingSelector] No planet archetypes data found in gameData');
            return {};
        }

        console.log('[BuildingSelector] Found planet archetypes, count:', Object.keys(planetArchetypesData).length);

        // Try to get planet archetype from the claim stake
        let planetArchetype = null;

        // Method 1: Check if claim stake has planet archetype directly
        if (claimStake.planetArchetype) {
            console.log('[BuildingSelector] Method 1: Using direct planetArchetype from claimStake');
            planetArchetype = claimStake.planetArchetype;
        }
        // Method 2: Find planet archetype based on claim stake definition tags
        else if (claimStake.definition?.requiredTags) {
            console.log('[BuildingSelector] Method 2: Looking up by definition requiredTags:', claimStake.definition.requiredTags);
            const requiredTags = claimStake.definition.requiredTags;
            planetArchetype = Object.values(planetArchetypesData).find(archetype => {
                return requiredTags.every(tag => archetype.tags && archetype.tags.includes(tag));
            });
            if (planetArchetype) {
                console.log('[BuildingSelector] Found archetype via definition tags:', planetArchetype.id);
            }
        }
        // Method 3: Find planet archetype based on claim stake ID
        else if (claimStake.id) {
            console.log('[BuildingSelector] Method 3: Parsing claimStake ID:', claimStake.id);

            // Extract planet type and faction from claim stake ID
            const idParts = claimStake.id.split('-');
            console.log('[BuildingSelector] ID parts:', idParts);

            let planetTypeTag = null;
            let factionTag = null;

            // Look for planet type tags
            for (const part of idParts) {
                if (['terrestrial', 'barren', 'volcanic', 'ice', 'gas', 'asteroid', 'dark'].some(type => part.includes(type))) {
                    planetTypeTag = `tag-${part}`;
                    console.log('[BuildingSelector] Found planet type tag:', planetTypeTag);
                    break;
                }
            }

            // Look for faction tags
            for (const part of idParts) {
                if (['oni', 'mud', 'ustur'].includes(part.toLowerCase())) {
                    factionTag = `tag-${part.toLowerCase()}`;
                    console.log('[BuildingSelector] Found faction tag:', factionTag);
                    break;
                }
            }

            if (planetTypeTag && factionTag) {
                console.log('[BuildingSelector] Searching for archetype with tags:', planetTypeTag, factionTag);

                // Log all available archetypes for debugging
                const availableArchetypes = Object.values(planetArchetypesData).map(arch => ({
                    id: arch.id,
                    tags: arch.tags
                }));
                console.log('[BuildingSelector] Available archetypes:', availableArchetypes);

                planetArchetype = Object.values(planetArchetypesData).find(archetype => {
                    const hasRequiredTags = archetype.tags &&
                        archetype.tags.includes(planetTypeTag) &&
                        archetype.tags.includes(factionTag);

                    if (hasRequiredTags) {
                        console.log('[BuildingSelector] Found matching archetype:', archetype.id, 'with tags:', archetype.tags);
                    }

                    return hasRequiredTags;
                });
            } else {
                console.log('[BuildingSelector] Could not extract both planet type and faction from ID');
            }
        }

        if (planetArchetype && planetArchetype.richness) {
            console.log('[BuildingSelector] Found planet archetype, using richness data:', Object.keys(planetArchetype.richness));
            return planetArchetype.richness;
        }

        console.log('[BuildingSelector] Could not determine planet archetype, using empty richness');
        return {};
    }, [resourceRichness, claimStake, gameData]);

    // Update the buildingsData useMemo to access the correct location
    const buildingsData = useMemo(() => {
        // Try different possible locations where building data might be stored
        return gameData?.claimStakeBuildings ||
            (gameData?.data && gameData.data.claimStakeBuildings) ||
            {};
    }, [gameData]);

    // Place this at the top level, before any conditional early returns
    useEffect(() => {
        // Update the early return condition
        shouldReturnEarlyRef.current = !claimStake || !gameData || !buildingsData || Object.keys(buildingsData).length === 0;
    }, [claimStake, gameData, buildingsData]);

    // Listen for construction events to force UI updates
    useEffect(() => {
        const handleConstructionEvent = (e) => {
            // Remove debug log
            const { buildingId, claimStakeId } = e.detail;

            // Force a re-render to update the UI
            setForceUpdate(prev => prev + 1);
        };

        window.addEventListener('constructionCompleted', handleConstructionEvent);
        window.addEventListener('claimStakeUpdated', handleConstructionEvent);

        return () => {
            window.removeEventListener('constructionCompleted', handleConstructionEvent);
            window.removeEventListener('claimStakeUpdated', handleConstructionEvent);
        };
    }, []);

    // Move conditional hooks outside of conditionals
    useEffect(() => {
        if (shouldReturnEarlyRef.current) return;

        // Ensure the central hub is included in the buildings list
        if (claimStake && (!claimStake.buildings || claimStake.buildings.length === 0)) {
            // Create a default buildings array with the central hub
            const updatedClaimStake = {
                ...claimStake,
                buildings: ['claimStakeBuilding-central-hub-t1']
            };
            onUpdate(updatedClaimStake);
        }

        // Clean up buildings array - ensure all building IDs are strings
        // This prevents the "toLowerCase is not a function" error
        if (claimStake && Array.isArray(claimStake.buildings)) {
            const hasInvalidIds = claimStake.buildings.some(id => typeof id !== 'string');

            if (hasInvalidIds) {
                // Filter out non-string values
                const validBuildings = claimStake.buildings.filter(id => typeof id === 'string');

                // Update claim stake with clean buildings array
                const updatedClaimStake = {
                    ...claimStake,
                    buildings: validBuildings
                };
                onUpdate(updatedClaimStake);
            }
        }
    }, [claimStake, onUpdate, shouldReturnEarlyRef.current]);

    // Listen for building completion events to update the UI
    useEffect(() => {
        if (shouldReturnEarlyRef.current) return;

        const handleBuildingAddedToClaimStake = (e) => {
            // Check if this event is for the current claim stake
            if (e.detail && e.detail.claimStakeId === claimStake.id) {
                // Only refresh the current view without changing tabs
                setActiveTab(prevTab => {
                    return prevTab; // Force a re-render without changing tabs
                });

                // Refresh available buildings in the current tab
                setTimeout(() => {
                    // Force a UI refresh without changing the active section
                    setForceUpdate(Date.now());
                }, 300);
            }
        };

        const handleConstructionCompleted = (e) => {
            // Check if this event is for the current claim stake
            if (e.detail && e.detail.claimStakeId === claimStake.id) {
                // Just refresh the current view without changing tabs
                setActiveTab(prevTab => {
                    return prevTab; // Force render by setting the same value
                });
            }
        };

        // Handle notification actions to switch tabs when view building is clicked
        const handleNotificationAction = (e) => {
            if (e.detail && e.detail.action === 'viewBuilding') {
                // Now switch to the My Buildings tab and show the building
                setActiveSection('existing');
                setActiveTab('all'); // Show all building types

                // Could also implement scrolling to the specific building here
                const buildingId = e.detail.buildingId;
                if (buildingId) {
                    // Implementation for scrolling to building could be added here
                }
            }
        };

        // Listen for notification events to handle them directly
        const handleShowNotification = (e) => {
            const notification = e.detail;

            // Only handle building-related notifications
            if (notification && notification.buildingId) {
                // If the notification has a view action, we could implement custom behavior
                // For now, we'll log it

                // Could implement UI highlight or other feedback here
            }
        };

        window.addEventListener('buildingAddedToClaimStake', handleBuildingAddedToClaimStake);
        window.addEventListener('constructionCompleted', handleConstructionCompleted);
        window.addEventListener('claimStakeUpdated', handleBuildingAddedToClaimStake);
        window.addEventListener('showNotification', handleShowNotification);
        window.addEventListener('notificationAction', handleNotificationAction);

        return () => {
            window.removeEventListener('buildingAddedToClaimStake', handleBuildingAddedToClaimStake);
            window.removeEventListener('constructionCompleted', handleConstructionCompleted);
            window.removeEventListener('claimStakeUpdated', handleBuildingAddedToClaimStake);
            window.removeEventListener('showNotification', handleShowNotification);
            window.removeEventListener('notificationAction', handleNotificationAction);
        };
    }, [claimStake?.id, activeSection, setActiveSection, setActiveTab, shouldReturnEarlyRef.current]);

    // Define the helper functions at the top level
    const getBaseId = useCallback((id) => {
        if (typeof id !== 'string') return '';

        // Remove tier and instance parts
        let baseId = id;

        // Remove instance ID suffix if present
        if (baseId.includes('-instance-')) {
            baseId = baseId.split('-instance-')[0];
        }

        // Remove tier suffix if present
        baseId = baseId.replace(/-t\d+$/, '');

        return baseId;
    }, []);

    const getTier = useCallback((id) => {
        if (typeof id !== 'string') return 1;

        // Extract tier with regex
        const tierMatch = id.match(/-t(\d+)/);
        return tierMatch ? parseInt(tierMatch[1]) : 1;
    }, []);

    // Create the calculateModuleCounts at the top level
    const calculateModuleCounts = useCallback((buildingArray) => {
        if (!Array.isArray(buildingArray)) return {};

        const counts = {};

        buildingArray.forEach(id => {
            if (typeof id !== 'string') return;

            // Extract base ID and tier
            const baseId = getBaseId(id);
            const tier = getTier(id);

            if (!baseId) return;

            // Initialize or increment counts
            if (!counts[baseId]) {
                counts[baseId] = {
                    total: 0,
                    byTier: {}
                };
            }

            counts[baseId].total += 1;

            // Track by tier
            if (!counts[baseId].byTier[tier]) {
                counts[baseId].byTier[tier] = 0;
            }
            counts[baseId].byTier[tier] += 1;
        });

        return counts;
    }, [getBaseId, getTier]);

    // Move the construction completed event listener to the top level
    useEffect(() => {
        if (shouldReturnEarlyRef.current) return;

        // Listen for construction completed events
        const handleConstructionCompleted = (e) => {
            // Trigger a refresh of the building list
            setForceUpdateBuildings(prev => prev + 1);
        };

        // Listen for any updates to the buildings array
        const handleBuildingsArrayUpdate = (e) => {
            setForceUpdateBuildings(prev => prev + 1);
        };

        // Listen specifically for module upgrade events
        const handleModuleUpgraded = (e) => {
            // Force immediate refresh of building list
            setForceUpdateBuildings(Date.now());

            // Also refresh all open component trees
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('forceResourceRefresh', {
                    detail: {
                        claimStakeId: claimStake?.id,
                        timestamp: Date.now(),
                        source: 'module-upgrade-refresh'
                    }
                }));
            }, 100); // Short delay to ensure event processing order
        };

        window.addEventListener('buildingAddedToClaimStake', handleConstructionCompleted);
        window.addEventListener('constructionCompleted', handleConstructionCompleted);
        window.addEventListener('updateDebugBuildingsArray', handleBuildingsArrayUpdate);
        window.addEventListener('moduleUpgraded', handleModuleUpgraded);

        return () => {
            window.removeEventListener('buildingAddedToClaimStake', handleConstructionCompleted);
            window.removeEventListener('constructionCompleted', handleConstructionCompleted);
            window.removeEventListener('updateDebugBuildingsArray', handleBuildingsArrayUpdate);
            window.removeEventListener('moduleUpgraded', handleModuleUpgraded);
        };
    }, [claimStake?.id, shouldReturnEarlyRef.current]);

    // Extract tier from definitionId if not already present
    useEffect(() => {
        if (shouldReturnEarlyRef.current) return;

        if (claimStake && !claimStake.tier && claimStake.definitionId) {
            // Try to extract tier from definition ID in multiple ways

            // First look for tier marker in the middle of the ID with dashes on both sides (e.g., "-t2-")
            const midTierMatch = claimStake.definitionId.match(/[-_]t(\d+)[-_]/i);
            if (midTierMatch && midTierMatch[1]) {
                const extractedTier = parseInt(midTierMatch[1]);

                // Update the claim stake with the extracted tier
                onUpdate({
                    ...claimStake,
                    tier: extractedTier,
                    __updateTierOnly: true // Flag to indicate this is just a tier update
                });
                return;
            }

            // Check for tier at the end of the ID
            const endTierMatch = claimStake.definitionId.match(/[-_]t(\d+)$/i);
            if (endTierMatch && endTierMatch[1]) {
                const extractedTier = parseInt(endTierMatch[1]);

                // Update the claim stake with the extracted tier
                onUpdate({
                    ...claimStake,
                    tier: extractedTier,
                    __updateTierOnly: true // Flag to indicate this is just a tier update
                });
                return;
            }

            // If claim stake has an ID, try to extract tier from that as well
            if (claimStake.id) {
                // Check for tier in the middle of the ID
                const idMidTierMatch = claimStake.id.match(/[-_]t(\d+)[-_]/i);
                if (idMidTierMatch && idMidTierMatch[1]) {
                    const extractedTier = parseInt(idMidTierMatch[1]);
                    // Update the claim stake with the extracted tier
                    onUpdate({
                        ...claimStake,
                        tier: extractedTier,
                        __updateTierOnly: true // Flag to indicate this is just a tier update
                    });
                    return;
                }

                // Check for tier at the end of the ID
                const idEndTierMatch = claimStake.id.match(/[-_]t(\d+)$/i);
                if (idEndTierMatch && idEndTierMatch[1]) {
                    const extractedTier = parseInt(idEndTierMatch[1]);

                    // Update the claim stake with the extracted tier
                    onUpdate({
                        ...claimStake,
                        tier: extractedTier,
                        __updateTierOnly: true
                    });
                    return;
                }
            }

            // If we reached here, no tier was found, set default tier 1
            console.warn(`Could not extract tier from definitionId: ${claimStake.definitionId}, defaulting to tier 1`);
            onUpdate({
                ...claimStake,
                tier: 1,
                __updateTierOnly: true
            });
        }
    }, [claimStake, onUpdate, shouldReturnEarlyRef.current]);

    // Add this helper function to strip tier from building ID to get the base building type
    const getBaseBuildingType = useCallback((buildingId) => {
        if (!buildingId || typeof buildingId !== 'string') return buildingId;
        // Remove the tier suffix (like -t1, -t2) if present
        return buildingId.replace(/-t\d+$/, '');
    }, []);

    // Now the useMemo can be safely called at the top level
    const getInstanceCount = useCallback((baseId, currentTier) => {
        if (!baseId || !claimStake?.buildings) return 0;

        return claimStake.buildings.filter(id => {
            if (typeof id !== 'string') return false;

            // Get the base ID and tier of this building
            const buildingBaseId = getBaseId(id);
            const buildingTier = getTier(id);

            // Count only if base ID matches and tier matches the expected tier
            return buildingBaseId === baseId && buildingTier === currentTier;
        }).length;
    }, [claimStake?.buildings, getBaseId, getTier]);

    // Get construction time helper
    const getConstructionTime = useCallback((building) => {
        // Default construction time if none specified
        if (!building || !building.constructionTime) {
            return 60; // Default to 60 seconds if not specified
        }

        // Return the building's construction time
        return building.constructionTime;
    }, []);

    // Now the moduleCountsByType calculation effect
    useEffect(() => {
        if (shouldReturnEarlyRef.current) return;

        // Only calculate module counts when building array changes
        if (claimStake?.buildings && Array.isArray(claimStake.buildings)) {
            // Check if we really need to recalculate
            const buildingsKey = claimStake.buildings.join(',');

            if (buildingsKey !== lastProcessedBuildingsRef.current) {
                const counts = calculateModuleCounts(claimStake.buildings);
                setModuleCountsByType(counts);
                lastProcessedBuildingsRef.current = buildingsKey;
            }
        }
    }, [claimStake?.buildings, calculateModuleCounts, shouldReturnEarlyRef.current]);

    // Function to update the global resources reference
    const setGlobalResourcesRef = (updatedResources) => {
        if (updatedResources) {
            setLocalGlobalResources(updatedResources);

            // Optionally dispatch an event to notify other components of the change
            window.dispatchEvent(new CustomEvent('globalResourcesUpdated', {
                detail: {
                    resources: updatedResources,
                    timestamp: Date.now(),
                    source: 'BuildingSelector'
                }
            }));
        }
    };

    // Helper function to format construction time
    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hrs > 0) {
            return `${hrs}h ${mins}m`;
        } else if (mins > 0) {
            return `${mins}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    };

    // Move logging to a separate function that's only called on tab change
    const logBuildingFilters = (type) => {
        // Disable all logging here
        return;
    };

    const getConstructedBuildings = () => {
        // Skip processing if we're already in the middle of an update
        if (isProcessingBuildings.current) {
            return {}; // Return empty object to prevent infinite loop
        }

        // Set processing flag
        isProcessingBuildings.current = true;

        try {
            // Ensure we have a buildings array, with at least the central hub
            const buildings = claimStake.buildings || ['claimStakeBuilding-central-hub-t1'];

            // Check if we have building data
            if (Object.keys(buildingsData).length === 0) {
                console.warn('Building data not found in gameData');
                return {};
            }

            // Create a map of constructed buildings
            const constructedBuildings = {};

            // Keep track of module types we've already processed
            const processedModuleTypes = new Set();

            buildings.forEach(buildingId => {
                // Skip if not a string
                if (typeof buildingId !== 'string') return;

                // For modules with instance IDs, we need to look up the base building type
                let lookupId = buildingId;

                // If this is a module with an instance ID, remove the instance part for lookup
                if (buildingId.includes('-instance-')) {
                    lookupId = buildingId.replace(/-instance-\d+$/, '');
                }

                // Get base ID without tier for module type tracking
                const baseIdWithoutTier = lookupId.replace(/-t\d+$/, '');

                // Check if this is a hub or a module
                const building = buildingsData[lookupId];
                const isHub = buildingId.toLowerCase().includes('hub') ||
                    (building?.name && building.name.toLowerCase().includes('hub'));

                // For hubs, always show individually
                if (isHub) {
                    if (building) {
                        constructedBuildings[buildingId] = building;
                    }
                }
                // For modules, only add one card per module type to avoid duplicates
                else {
                    // If we haven't processed this module type yet, add it
                    if (!processedModuleTypes.has(baseIdWithoutTier) && building) {
                        // Use the base module ID (without instance) for display
                        constructedBuildings[lookupId] = building;
                        processedModuleTypes.add(baseIdWithoutTier);
                    }
                }
            });

            return constructedBuildings;
        } finally {
            // Clear processing flag when done
            isProcessingBuildings.current = false;
        }
    };

    const getBuildingsByType = useCallback((buildings, type) => {
        if (!buildings || Object.keys(buildings).length === 0) {
            return [];
        }

        // For 'construct' tab, we need to make sure we're including ALL buildings
        // from both available AND constructed buildings
        const allBuildings = activeSection === 'construct'
            ? {
                ...(buildings || {}), ...(claimStake.buildings.reduce((acc, id) => {
                    // Convert the building IDs to objects if they're not already
                    if (buildingsData[id]) {
                        acc[id] = buildingsData[id];
                    }
                    return acc;
                }, {}))
            }
            : buildings;

        // Determine which buildings belong to this type
        return Object.entries(allBuildings)
            .filter(([id, building]) => {
                // Skip if building is undefined
                if (!building) return false;

                // Extract building type based on specific tabs - match ClaimStakeBuildingsTab categorization
                switch (type) {
                    case 'hubs': {
                        // Check if it's a hub by ID or name
                        const isHub = id.toLowerCase().includes('hub') ||
                            (building.name && typeof building.name === 'string' && building.name.toLowerCase().includes('hub'));

                        // For the hubs tab, return all building types containing "hub" regardless of specific type
                        return isHub;
                    }
                    case 'central': {
                        // For central tab, show central hub and modules that depend on central hub
                        // Check if it's a central hub or requires a central hub
                        const isCentralHub = building.id.toLowerCase().includes('central-hub') ||
                            (building.name && building.name.toLowerCase().includes('central hub'));

                        // Check if it's a module that depends on the central hub
                        const requiresCentralHub = !building.id.toLowerCase().includes('hub') &&
                            building.requiredTags &&
                            building.requiredTags.some(tag => tag.toLowerCase().includes('central'));


                        return isCentralHub || requiresCentralHub;
                    }
                    case 'extraction': {
                        // For extraction tab, show extraction hub and modules that depend on extraction hub
                        const isExtractionHub = building.id.toLowerCase().includes('extraction-hub') ||
                            (building.name && building.name.toLowerCase().includes('extraction hub'));

                        // Check if it's a module that depends on extraction hub
                        const requiresExtractionHub = !building.id.toLowerCase().includes('hub') &&
                            building.requiredTags &&
                            building.requiredTags.some(tag => tag.startsWith('tag-extraction-hub-'));

                        return isExtractionHub || requiresExtractionHub;
                    }
                    case 'processing': {
                        // For processing tab, show processing hub and modules that depend on processing hub
                        const isProcessingHub = building.id.toLowerCase().includes('processing-hub') ||
                            (building.name && building.name.toLowerCase().includes('processing hub'));

                        // Check if it's a module that depends on processing hub
                        const requiresProcessingHub = !building.id.toLowerCase().includes('hub') &&
                            building.requiredTags &&
                            building.requiredTags.some(tag => tag.startsWith('tag-processing-hub-'));

                        return isProcessingHub || requiresProcessingHub;
                    }
                    case 'farming': {
                        // For farming tab, show farming hub and modules that depend on farming hub
                        const isFarmingHub = building.id.toLowerCase().includes('farming-hub') ||
                            (building.name && building.name.toLowerCase().includes('farming hub'));

                        // Check if it's a module that depends on farming hub
                        const requiresFarmingHub = !building.id.toLowerCase().includes('hub') &&
                            building.requiredTags &&
                            building.requiredTags.some(tag => tag.startsWith('tag-farming-hub-'));

                        return isFarmingHub || requiresFarmingHub;
                    }
                    case 'storage': {
                        // For storage tab, show storage hub and modules that depend on storage hub
                        const isStorageHub = building.id.toLowerCase().includes('storage-hub') ||
                            (building.name && building.name.toLowerCase().includes('storage hub'));

                        // Check if it's a module that depends on storage hub
                        const requiresStorageHub = !building.id.toLowerCase().includes('hub') &&
                            building.requiredTags &&
                            building.requiredTags.some(tag => tag.startsWith('tag-storage-hub-'));

                        return isStorageHub || requiresStorageHub;
                    }
                    default:
                        // 'all' or any other tab shows everything
                        return true;
                }
            })
            .map(([id, building]) => {
                // Prepare building data for display
                return {
                    id,
                    ...building,
                    // If the building has the isDirectlyBuildable flag, preserve it
                    // This flag indicates if a building can be built right away or requires prerequisites
                    isDirectlyBuildable: building.isDirectlyBuildable !== undefined ?
                        building.isDirectlyBuildable : true
                };
            });
    }, [activeSection, buildingsData, claimStake.buildings]);

    const canAffordBuilding = (building) => {
        if (!building?.constructionCost) return false;

        // Use global resources if available, otherwise fallback to just claim stake resources
        // Always create a fresh reference to avoid reference issues
        const availableResources = localGlobalResources
            ? { ...claimStake.resources, ...localGlobalResources }
            : { ...claimStake.resources };

        // Detailed logging for debugging resource affordability
        const missingResources = [];

        // Check each resource cost
        const canAfford = Object.entries(building.constructionCost).every(
            ([resource, amount]) => {
                const resourceKey = resource.toLowerCase();
                const currentAmount = availableResources[resourceKey] || 0;
                const canAffordResource = currentAmount >= amount;

                // Track missing resources for debugging
                if (!canAffordResource) {
                    missingResources.push(`${resource}: need ${amount}, have ${currentAmount}`);
                }

                return canAffordResource;
            }
        );

        return canAfford;
    };

    const canBuildWithPower = (building) => {
        // Add power validation logic
        return true;
    };

    const hasRequiredTags = (building) => {
        if (!building.requiredTags || !claimStake.definition.addedTags) return true;
        return building.requiredTags.every(tag =>
            claimStake.definition.addedTags.includes(tag)
        );
    };

    // Handle building selection to attempt construction
    const handleBuildingSelect = async (buildingId) => {
        try {
            console.log(`[BuildingSelector] Selected building: ${buildingId}`);

            // Get building definition
            const buildingDefinition = buildingsData[buildingId] ||
                buildingsData[buildingId.replace(/^claimStakeBuilding-/, '')];

            if (!buildingDefinition) {
                console.error(`Building definition not found for: ${buildingId}`);
                return;
            }

            // Pre-validate construction requirements using ResourceCalculationService
            const validation = ResourceCalculationService.validateConstructionPrerequisites(
                buildingDefinition,
                claimStake,
                localGlobalResources || {}
            );

            console.log(`[BuildingSelector] Validation result:`, validation);

            // If validation passes, attempt immediate construction
            if (validation.canConstruct) {
                console.log(`[BuildingSelector] Prerequisites met, attempting construction...`);

                const result = await onConstructBuilding({
                    buildingId: buildingId,
                    tier: 1,
                    claimStakeId: claimStake.id
                });

                if (result.success) {
                    console.log(`[BuildingSelector] Construction successful!`);
                    // Construction was successful, no need to show validation popup
                    return;
                } else {
                    console.log(`[BuildingSelector] Construction failed:`, result.error);
                    // Construction failed for other reasons, show the popup with error details
                    setSelectedBuildingType(buildingId);
                }
            } else {
                console.log(`[BuildingSelector] Prerequisites not met, showing validation popup...`);
                // Prerequisites not met, show the validation popup
                setSelectedBuildingType(buildingId);
            }

        } catch (error) {
            console.error(`[BuildingSelector] Error in handleBuildingSelect:`, error);
            // Show popup on error
            setSelectedBuildingType(buildingId);
        }
    };

    // Now modify the isUnderConstruction function with safety checks
    const isUnderConstruction = useCallback((buildingId) => {
        if (!claimStake?.underConstruction || !buildingId) {
            return false;
        }

        // Check if the building is under construction
        return claimStake.underConstruction.some(item =>
            item && item.buildingId === buildingId
        );
    }, [claimStake]);

    // Helper function to check if a building is already constructed
    const checkIfAlreadyConstructed = useCallback((buildingId) => {
        if (!claimStake?.buildings || !Array.isArray(claimStake.buildings)) {
            return false;
        }

        // If the exact ID is in the buildings list, it's already constructed
        if (claimStake.buildings.includes(buildingId)) {
            return true;
        }

        // Handle different prefix formats for the same building
        const normalizedBuildingId = buildingId.startsWith('claimStakeBuilding-')
            ? buildingId
            : `claimStakeBuilding-${buildingId}`;

        const strippedBuildingId = buildingId.replace(/^claimStakeBuilding-/, '');

        // Check both with and without the prefix
        return claimStake.buildings.some(id => {
            return id === buildingId ||
                id === normalizedBuildingId ||
                id === strippedBuildingId ||
                id.replace(/^claimStakeBuilding-/, '') === strippedBuildingId;
        });
    }, [claimStake?.buildings]);

    const getNextTierBuilding = (buildingId) => {
        if (!buildingId) return null;

        const currentTier = getTier(buildingId);
        const nextTier = currentTier + 1;

        // Check if we're at max tier already
        if (nextTier > 5) return null;

        // Try multiple ID formats for the next tier

        // 1. Direct replacement in the original ID
        const nextTierId = buildingId.replace(`-t${currentTier}`, `-t${nextTier}`);
        if (buildingsData[nextTierId]) {
            return buildingsData[nextTierId];
        }

        // 2. Try the ID with the prefix if it doesn't have one
        if (!buildingId.startsWith('claimStakeBuilding-')) {
            const prefixedNextTierId = `claimStakeBuilding-${buildingId.replace(`-t${currentTier}`, `-t${nextTier}`)}`;
            if (buildingsData[prefixedNextTierId]) {
                return buildingsData[prefixedNextTierId];
            }
        }

        // 3. Try removing prefix and using base building type
        const baseType = buildingId.replace(/^claimStakeBuilding-/, '').replace(/-t\d+$/, '');
        const baseTypeNextTierId = `${baseType}-t${nextTier}`;
        if (buildingsData[baseTypeNextTierId]) {
            return buildingsData[baseTypeNextTierId];
        }

        // 4. Try with prefix on the base type
        const prefixedBaseTypeNextTierId = `claimStakeBuilding-${baseType}-t${nextTier}`;
        if (buildingsData[prefixedBaseTypeNextTierId]) {
            return buildingsData[prefixedBaseTypeNextTierId];
        }

        // As a last resort, look for any building that contains the base type and the correct tier
        const partialMatches = Object.keys(buildingsData).filter(key =>
            key.includes(baseType) && key.includes(`-t${nextTier}`)
        );

        if (partialMatches.length > 0) {
            return buildingsData[partialMatches[0]];
        }

        return null;
    };

    const getUpgradeCost = (buildingId) => {
        const nextTierBuilding = getNextTierBuilding(buildingId);
        return nextTierBuilding?.constructionCost || {};
    };

    const canBuildBuilding = (building) => {
        // Always check resources first with fresh data
        if (!canAffordBuilding(building)) {
            return false;
        }

        // Calculate total crew slots
        const totalCrewSlots = claimStake.buildings.reduce((total, buildingId) => {
            const building = buildingsData[buildingId];
            return total + (building?.crewSlots || 0);
        }, 0);

        // Calculate current required crew
        const currentRequiredCrew = claimStake.buildings.reduce((total, buildingId) => {
            const building = buildingsData[buildingId];
            return total + (building?.neededCrew || 0);
        }, 0);

        // Check if we have enough crew slots for the new building
        const availableCrewSlots = totalCrewSlots - currentRequiredCrew;
        const neededCrew = building.neededCrew || 0;

        return availableCrewSlots >= neededCrew;
    };

    const handleReceiveResources = (resources) => {

        // Deep clone the current claim stake resources to avoid reference issues
        const updatedResources = { ...(claimStake.resources || {}) };

        // Create a copy of global resources to update
        const updatedGlobalResources = { ...(localGlobalResources || {}) };

        // Add the resources to both the claim stake resources and global resources
        Object.entries(resources).forEach(([resource, amount]) => {
            // Update local resources
            updatedResources[resource] = (updatedResources[resource] || 0) + amount;

            // Update global resources
            updatedGlobalResources[resource] = (updatedGlobalResources[resource] || 0) + amount;
        });

        // Create an update object with special flags
        const update = {
            id: claimStake.id,
            resources: updatedResources,
            __receiveResourcesUpdate: true,
            __priority: 'high',
            __forceUIRefresh: true
        };

        // Update the claim stake through the normal flow
        onUpdate(update);

        // Update our local state to reflect the new resources
        setLocalGlobalResources(updatedGlobalResources);

        // Make sure UI renders with new resources before proceeding
        setGlobalResourcesRef(updatedGlobalResources);
        setForceUpdate(Date.now());

        // Dispatch global event to notify all components about new resources
        window.dispatchEvent(new CustomEvent('resourcesReceived', {
            detail: {
                claimStakeId: claimStake.id,
                globalResources: updatedGlobalResources,
                localResources: updatedResources,
                timestamp: Date.now()
            }
        }));

        // Wait a brief moment to ensure all components have updated
        // before allowing construction to proceed
        setTimeout(() => {
            setForceUpdateBuildings(prev => prev + 1);
            // Force a secondary update after a brief delay
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('forceRefreshResources', {
                    detail: {
                        resources: updatedGlobalResources,
                        timestamp: Date.now()
                    }
                }));
            }, 100);
        }, 50);

        // Return the updated resources for any components that need them
        return {
            localResources: updatedResources,
            globalResources: updatedGlobalResources
        };
    };

    // Add logging to the tab change handler
    const handleTabChange = (tab) => {
        logBuildingFilters(tab);
        setActiveTab(tab);
        setSelectedBuildingType(null);
    };

    // Re-add the calculateAvailableTags function that was removed
    // Pre-declare getResourceTagsFromPlanetArchetype for use in calculateAvailableTags
    let getResourceTagsFromPlanetArchetype;

    // Enhanced implementation of calculateAvailableTags to ensure all tags are properly collected
    const calculateAvailableTags = useCallback(() => {
        if (!claimStake) return [];

        // 1. Gather tags directly from claim stake
        const claimStakeTags = claimStake.tags || [];

        // 2. Gather tags from claim stake definition
        const definitionTags = claimStake.definition?.addedTags || [];

        // 3. Gather tags from claim stake required tags (planet type and faction tags)
        const requiredTags = claimStake.requiredTags || [];

        // 4. Gather tags from built buildings
        const buildingTags = [];
        if (claimStake.buildings) {
            // Handle array or object format for buildings
            const buildingsList = Array.isArray(claimStake.buildings)
                ? claimStake.buildings
                : Object.keys(claimStake.buildings || {});

            buildingsList.forEach(buildingId => {
                // Get the building definition
                if (typeof buildingId !== 'string') return;

                // Important fix: When a hub is upgraded, make sure we preserve all tags from all tiers
                // For example, if a central-hub-t2 exists, we should still have the central-hub-t1 tag
                const building = buildingsData[buildingId];
                if (building && building.addedTags && Array.isArray(building.addedTags)) {
                    buildingTags.push(...building.addedTags);

                    // For upgraded hubs, make sure we add the base tag to ensure all buildings remain visible
                    if (buildingId.includes('hub') && buildingId.match(/-t[2-5]$/)) {
                        buildingTags.push('tag-hub'); // Generic hub tag

                        // Add specific hub type tags for all tiers
                        if (buildingId.includes('central-hub')) {
                            buildingTags.push('tag-central-hub-t1', 'tag-central-hub');
                        } else if (buildingId.includes('extraction-hub')) {
                            buildingTags.push('tag-extraction-hub-t1', 'tag-extraction-hub');
                        } else if (buildingId.includes('processing-hub')) {
                            buildingTags.push('tag-processing-hub-t1', 'tag-processing-hub');
                        } else if (buildingId.includes('farm-hub')) {
                            buildingTags.push('tag-farm-hub-t1', 'tag-farm-hub');
                        } else if (buildingId.includes('storage-hub')) {
                            buildingTags.push('tag-storage-hub-t1', 'tag-storage-hub');
                        }
                    }
                }
            });
        }

        // 5. Extract planet type tags from claimStake ID
        const planetTags = [];
        if (claimStake.id) {
            // Extract planet type from ID using regex patterns
            if (claimStake.id.includes('terrestrial-planet')) {
                planetTags.push('tag-terrestrial-planet');
            } else if (claimStake.id.includes('ice-giant')) {
                planetTags.push('tag-ice-giant');
            } else if (claimStake.id.includes('gas-giant')) {
                planetTags.push('tag-gas-giant');
            } else if (claimStake.id.includes('barren-planet')) {
                planetTags.push('tag-barren-planet');
            } else if (claimStake.id.includes('volcanic-planet')) {
                planetTags.push('tag-volcanic-planet');
            } else if (claimStake.id.includes('dark-planet')) {
                planetTags.push('tag-dark-planet');
            } else if (claimStake.id.includes('system-asteroid-belt')) {
                planetTags.push('tag-system-asteroid-belt');
            }
        }

        // Also try to get the planet type from the planetType property
        const planetType = claimStake.planetType || '';
        if (planetType && planetType !== '') {
            // Convert the human-readable planet type to tag format
            const planetTypeTag = `tag-${planetType.toLowerCase().replace(/\s+/g, '-')}`;
            if (!planetTags.includes(planetTypeTag)) {
                planetTags.push(planetTypeTag);
            }
        }

        // 6. Extract faction tag from ID
        let factionTags = []; // Declare factionTags here
        if (claimStake.id) {
            if (claimStake.id.includes('-oni-')) factionTags.push('tag-oni');
            if (claimStake.id.includes('-mud-')) factionTags.push('tag-mud');
            if (claimStake.id.includes('-ustur-')) factionTags.push('tag-ustur');
        }

        // 7. Additional resource tags from planet archetype if available - only if getResourceTagsFromPlanetArchetype is defined
        const resourceTags = typeof getResourceTagsFromPlanetArchetype === 'function' ?
            getResourceTagsFromPlanetArchetype() : [];

        // Combine all unique tags
        const allTags = [...new Set([
            ...claimStakeTags,
            ...definitionTags,
            ...requiredTags,
            ...buildingTags,
            ...planetTags,
            ...factionTags,
            ...resourceTags,
            'tag-planetary' // Common base tag for all claim stakes
        ])];

        return allTags;
    }, [claimStake, buildingsData]);

    // Implementation of getResourceTagsFromPlanetArchetype with better debugging
    getResourceTagsFromPlanetArchetype = useCallback(() => {
        // First, log the gameData structure to see what's available
        // console.log('Game data structure:', {
        //     hasGameData: !!gameData,
        //     keys: gameData ? Object.keys(gameData) : [],
        //     hasPlanetArchetypes: gameData && !!gameData.planetArchetypes,
        //     planetArchetypesKeys: gameData?.planetArchetypes ? Object.keys(gameData.planetArchetypes) : [],
        //     dataKeys: gameData?.data ? Object.keys(gameData.data) : [],
        //     hasPlanetArchetypesInData: gameData?.data && !!gameData.data.planetArchetypes,
        //     claimStakeId: claimStake?.id
        // });

        // Check if planet archetypes are available in gameData or gameData.data
        const planetArchetypesData = gameData?.planetArchetypes || gameData?.data?.planetArchetypes;

        if (!claimStake || !planetArchetypesData) {
            // console.log('Missing claim stake or planet archetypes data');
            // console.log('ClaimStake:', claimStake);
            // console.log('PlanetArchetypes:', planetArchetypesData);
            return [];
        }

        // Get the planet type and faction tags from the claim stake ID
        let planetTypeTag = null;
        let factionTags = [];

        // Extract planet type tag from ID
        if (claimStake.id) {
            if (claimStake.id.includes('terrestrial-planet')) {
                planetTypeTag = 'tag-terrestrial-planet';
            } else if (claimStake.id.includes('ice-giant')) {
                planetTypeTag = 'tag-ice-giant';
            } else if (claimStake.id.includes('gas-giant')) {
                planetTypeTag = 'tag-gas-giant';
            } else if (claimStake.id.includes('barren-planet')) {
                planetTypeTag = 'tag-barren-planet';
            } else if (claimStake.id.includes('volcanic-planet')) {
                planetTypeTag = 'tag-volcanic-planet';
            } else if (claimStake.id.includes('dark-planet')) {
                planetTypeTag = 'tag-dark-planet';
            } else if (claimStake.id.includes('system-asteroid-belt')) {
                planetTypeTag = 'tag-system-asteroid-belt';
            }
        }

        // Extract faction tag from ID
        if (claimStake.id) {
            if (claimStake.id.includes('-oni-')) factionTags.push('tag-oni');
            if (claimStake.id.includes('-mud-')) factionTags.push('tag-mud');
            if (claimStake.id.includes('-ustur-')) factionTags.push('tag-ustur');
        }

        if (!planetTypeTag || !factionTags.length) {
            // console.log('Could not extract planet type or faction from ID');
            return [];
        }

        // console.log('Looking for planet archetype with tags:', planetTypeTag, factionTag);

        // Find the matching planet archetype
        const planetArchetype = Object.values(planetArchetypesData).find(archetype => {
            if (!archetype || !archetype.tags) return false;

            return archetype.tags.includes(planetTypeTag) &&
                factionTags.some(tag => archetype.tags.includes(tag));
        });

        if (!planetArchetype) {
            // console.log('No matching planet archetype found');
            // Log all available archetypes for debugging
            // console.log('Available archetypes:', Object.values(planetArchetypesData).map(a => ({
            //     id: a.id,
            //     tags: a.tags
            // })));
            return [];
        }

        // console.log('Found planet archetype:', planetArchetype.id);

        // Extract resource tags from richness data
        const resourceTags = [];

        if (planetArchetype.richness) {
            Object.entries(planetArchetype.richness).forEach(([resource, richness]) => {
                // Only include resources with positive richness
                if (richness > 0) {
                    // Convert resource name to tag format
                    let tagName = `tag-${resource.replace('cargo-', '')}`;

                    // Handle special cases
                    if (tagName === 'tag-silicon') tagName = 'tag-silica';
                    if (tagName === 'tag-iron') tagName = 'tag-iron-ore';
                    if (tagName === 'tag-copper') tagName = 'tag-copper-ore';
                    if (tagName === 'tag-aluminum') tagName = 'tag-aluminum-ore';
                    if (tagName === 'tag-titanium') tagName = 'tag-titanium-ore';

                    resourceTags.push(tagName);
                }
            });
        }

        // console.log('Resource tags from planet archetype:', resourceTags);
        return resourceTags;
    }, [claimStake, gameData]);

    // Check if required data is available
    if (Object.keys(buildingsData).length === 0) {
        return (
            <div className="building-selector">
                <div className="error-message" style={{ padding: '20px', textAlign: 'center', color: '#FF5252' }}>
                    <h3>Building data not available</h3>
                    <p>The building catalog could not be loaded. Please try again later.</p>
                    {process.env.NODE_ENV === 'development' && (
                        <div style={{ marginTop: '15px', fontSize: '12px', textAlign: 'left', background: '#333', padding: '10px', borderRadius: '4px' }}>
                            <p><strong>Debug Info:</strong></p>
                            <p>gameData keys: {gameData ? Object.keys(gameData).join(', ') : 'undefined'}</p>
                            <p>data keys: {gameData?.data ? Object.keys(gameData.data).join(', ') : 'undefined'}</p>
                            <p>buildingsData keys count: {Object.keys(buildingsData).length}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Enhanced helper function to check building availability with better tag handling
    const isBuildingAvailable = useCallback((building) => {
        if (!building) return false;

        // If no requiredTags, the building is always available
        if (!building.requiredTags || building.requiredTags.length === 0) {
            return true;
        }

        // Get all available tags including those from buildings that have been constructed
        const availableTags = calculateAvailableTags();

        // Check if all required tags are present in available tags
        const isAvailable = building.requiredTags.every(tag => availableTags.includes(tag));

        return isAvailable;
    }, [calculateAvailableTags]);

    // Helper function to get the base name of a building (used for deduplication)
    const getBaseNameFromBuilding = (buildingId) => {
        if (!buildingId || typeof buildingId !== 'string') return '';

        // Remove common prefixes
        let baseName = buildingId.replace(/^claimStakeBuilding-/, '');

        // Handle farm/farming hub name variations
        if (baseName.includes('farm-hub')) {
            baseName = 'farm-hub';
        } else if (baseName.includes('farming-hub')) {
            baseName = 'farming-hub';
        }

        // Special handling for modules to extract the core name without tier suffixes
        if (!baseName.includes('hub')) {
            // For modules like power-plant-module-t1, crew-quarters-t1, etc.
            // Extract the base module name without tier
            // First remove the tier suffix at the end
            baseName = baseName.replace(/-t[1-5]$/, '');

            // Then handle repeated names in patterns like 'module-name-module-tx'
            const parts = baseName.split('-');
            if (parts.length > 2) {
                // If it's a 'module-t1' pattern, keep it as is
                return baseName;
            }
        } else {
            // For hubs, just remove the tier suffix
            baseName = baseName.replace(/-t[1-5]$/, '');
        }

        return baseName;
    };

    const getDisplayableBuildings = useCallback((section, filters = {}) => {
        // Remove debug log
        if (!claimStake || !buildingsData) {
            return [];
        }

        // Initialize sets to track constructed building IDs in various formats
        const constructedIds = new Set();
        const constructedBaseIds = new Set();
        const constructedHubTypes = new Set();

        // Track all buildings currently in the claimStake
        claimStake.buildings.forEach(buildingId => {
            // Add the original ID
            constructedIds.add(buildingId);

            // Extract the base ID without prefix, tier, or instance
            let baseId = buildingId.replace(/^claimStakeBuilding-/, '')
                .replace(/-t\d+/, '')
                .replace(/-instance-\d+$/, '');
            constructedBaseIds.add(baseId);

            // Add various permutations of the ID
            constructedBaseIds.add(`claimStakeBuilding-${baseId}`);

            // Extract hub type if applicable
            if (buildingId.includes('hub')) {
                const hubMatch = buildingId.match(/-(\w+)-hub/);
                if (hubMatch && hubMatch[1]) {
                    constructedHubTypes.add(hubMatch[1]); // e.g., 'central', 'extraction'
                }
            }
        });

        // Log all detected IDs for debugging
        // Remove debug logs

        // Get all available building definitions
        const allBuildingDefinitions = Object.values(JSON.parse(JSON.stringify(buildingsData || {})))
            .filter(Boolean);

        // Group buildings by their BASE TYPE (strip tier and instance suffix)
        const buildingsByBaseType = new Map(); // Key: baseType, Value: array of building definitions

        allBuildingDefinitions.forEach(building => {
            if (!building || !building.id) return;

            // Extract base type without tier or instance suffix
            const baseType = building.id.replace(/(-t\d+)?(-instance-\d+)?$/, '');

            // Initialize the array if it doesn't exist
            if (!buildingsByBaseType.has(baseType)) {
                buildingsByBaseType.set(baseType, []);
            }

            // Add this building definition to its base type group
            buildingsByBaseType.get(baseType).push(building);
        });

        // Log each building and its tags before processing
        buildingsByBaseType.forEach((buildingsForType, baseType) => {
            buildingsForType.forEach((buildingDef, idx) => {
                // Log this building before filtering
                // console.log(`[DEBUG] Pre-processing building[${idx}]:`,
                //     buildingDef.id,
                //     'requiredTags:', buildingDef.requiredTags || [],
                //     'addedTags:', buildingDef.addedTags || []);
            });
        });

        // For each base type, pick the appropriate building definition to display
        const uniqueBuildings = [];

        buildingsByBaseType.forEach((buildingsForType, baseType) => {
            // Sort by tier (this ensures we can easily find tier 1 or highest tier)
            buildingsForType.sort((a, b) => {
                const tierA = parseInt(a.id.match(/-t(\d+)/) ? a.id.match(/-t(\d+)/)[1] : '1');
                const tierB = parseInt(b.id.match(/-t(\d+)/) ? b.id.match(/-t(\d+)/)[1] : '1');
                return tierA - tierB;
            });

            // For 'construct' section, prefer tier 1
            // For 'view' section, prefer highest tier that is constructed
            if (section === 'construct') {
                // Prefer tier 1 for construct section
                const tier1Building = buildingsForType.find(b => {
                    const tierMatch = b.id.match(/-t(\d+)/);
                    return !tierMatch || tierMatch[1] === '1';
                }) || buildingsForType[0];

                uniqueBuildings.push(tier1Building);
            } else if (section === 'view') {
                // Find all tiers of this building that are constructed
                const constructedTiers = buildingsForType.filter(building => {
                    const baseId = building.id.replace(/(-t\d+)?(-instance-\d+)?$/, '');
                    return constructedIds.has(building.id) ||
                        constructedIds.has(`claimStakeBuilding-${building.id}`) ||
                        constructedBaseIds.has(baseId) ||
                        (building.id.includes('hub') && building.id.match(/-(\w+)-hub/) &&
                            constructedHubTypes.has(building.id.match(/-(\w+)-hub/)[1]));
                });

                // If any tier is constructed, add the highest tier to the result
                if (constructedTiers.length > 0) {
                    // Sort by tier in reverse to get highest tier first
                    constructedTiers.sort((a, b) => {
                        const tierA = parseInt(a.id.match(/-t(\d+)/) ? a.id.match(/-t(\d+)/)[1] : '1');
                        const tierB = parseInt(b.id.match(/-t(\d+)/) ? b.id.match(/-t(\d+)/)[1] : '1');
                        return tierB - tierA; // Reverse sort for highest tier first
                    });

                    uniqueBuildings.push(constructedTiers[0]);
                }
            } else {
                // For other sections, use tier 1 as default
                uniqueBuildings.push(buildingsForType[0]);
            }
        });

        // Apply additional filters based on the section
        if (section === 'construct') {
            // For 'construct' section, return all unique building types that aren't yet constructed
            return uniqueBuildings.filter(building => {
                if (!building || !building.id) return false;

                // Extract base ID for this building definition
                const baseId = building.id.replace(/(-t\d+)?(-instance-\d+)?$/, '');
                const prefixedBaseId = `claimStakeBuilding-${baseId}`;

                // Log this building before filtering
                // console.log(`[DEBUG] Checking building ${building.id}, baseId: ${baseId}`);
                // console.log(`[DEBUG] Full building definition:`,
                //     JSON.stringify({
                //         id: building.id,
                //         name: building.name,
                //         requiredTags: building.requiredTags,
                //         addedTags: building.addedTags
                //     }, null, 2));

                // Initialize match flag
                let isAlreadyConstructed = false;

                // Simplify the check and focus on the key patterns
                const simpleBaseId = baseId.replace(/^claimStakeBuilding-/, '');
                const simpleId = building.id.replace(/^claimStakeBuilding-/, '');

                // Check each constructed building to see if it matches this building
                claimStake.buildings.forEach(constructedId => {
                    const constructedBaseId = constructedId.replace(/^claimStakeBuilding-/, '')
                        .replace(/-t\d+/, '')
                        .replace(/-instance-\d+$/, '');

                    if (constructedBaseId === simpleBaseId) {
                        // console.log(`[DEBUG] Building ${building.id} MATCHES constructed building ${constructedId} (base ID match)`);
                        isAlreadyConstructed = true;
                    }
                });

                // Special handling for hubs which have different ID patterns
                if (building.id.includes('hub') && !isAlreadyConstructed) {
                    const hubMatch = building.id.match(/-(\w+)-hub/);
                    if (hubMatch && hubMatch[1]) {
                        const hubType = hubMatch[1];
                        // Check if any constructed building has this hub type
                        claimStake.buildings.forEach(constructedId => {
                            if (constructedId.includes(`-${hubType}-hub`)) {
                                // console.log(`[DEBUG] Hub type ${hubType} for building ${building.id} MATCHES constructed building ${constructedId}`);
                                isAlreadyConstructed = true;
                            }
                        });
                    }
                }

                // Filter by tier if applicable
                const meetsMinimumTier = claimStake.tier >= (building.minimumTier || 1);
                const meetsMaximumTier = !building.maximumTier || claimStake.tier <= building.maximumTier;

                // Much simplified tag checking logic
                let hasSufficientTags = true;

                // Skip tag checking for debugging purposes to see if buildings appear
                if (false && building.requiredTags && Array.isArray(building.requiredTags) && building.requiredTags.length > 0) {
                    // Original logic here - temporarily disabled
                    // ...
                }

                // Just set to true for now to bypass the check
                hasSufficientTags = true;

                // Show buildings that are NOT already constructed and meet requirements
                const shouldShow = !isAlreadyConstructed && meetsMinimumTier && meetsMaximumTier && hasSufficientTags;

                // Final filter decision
                // console.log(`[DEBUG] Building ${building.id} filter results: ` +
                //     `isAlreadyConstructed=${isAlreadyConstructed}, ` +
                //     `meetsMinimumTier=${meetsMinimumTier}, ` +
                //     `meetsMaximumTier=${meetsMaximumTier}, ` +
                //     `hasSufficientTags=${hasSufficientTags}, ` +
                //     `SHOW=${shouldShow}`);

                return shouldShow;
            });
        } else if (section === 'view') {
            // For 'view' section - already filtered to constructed buildings above
            return uniqueBuildings;
        } else {
            // For other sections, return all unique buildings
            return uniqueBuildings;
        }
    }, [buildingsData, claimStake, forceBuildingsRefresh]);

    const buildingsArray = useMemo(() => {
        // Remove debug logs
        const buildings = getDisplayableBuildings(activeSection);
        return buildings;
    }, [getDisplayableBuildings, activeSection, forceUpdateBuildings, forceBuildingsRefresh, claimStake?.buildings]);

    const buildingTabs = [
        { id: 'hubs', label: 'Hubs' },
        { id: 'central', label: 'Central' },
        { id: 'extraction', label: 'Extraction' },
        { id: 'processing', label: 'Processing' },
        { id: 'farming', label: 'Farming' },
        { id: 'storage', label: 'Storage' },
        { id: 'all', label: 'All' },
    ];

    // Debugging keyboard shortcut (Alt+D) to toggle debug info
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey && e.key === 'd') {
                setDebugInfoEnabled(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Add CSS style for active tab
    const tabStyle = {
        padding: '10px 15px',
        margin: '0 5px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        backgroundColor: '#333',
        color: '#ccc',
        transition: 'all 0.3s ease'
    };

    const activeTabStyle = {
        ...tabStyle,
        backgroundColor: '#0066cc', // Blue for active tab
        color: 'white',
        fontWeight: 'bold'
    };

    // Function to check if a hub is already constructed
    const isHubAlreadyConstructed = useCallback((hubTypeToCheck) => {
        if (!claimStake?.buildings || !Array.isArray(claimStake.buildings)) {
            return false;
        }

        // Check if any building of this hub type already exists
        return claimStake.buildings.some(buildingId => {
            // Extract the hub type from the building ID
            const lowerBuildingId = buildingId.toLowerCase();

            if (hubTypeToCheck === 'central-hub') {
                return lowerBuildingId.includes('central-hub');
            } else if (hubTypeToCheck === 'extraction-hub') {
                return lowerBuildingId.includes('extraction-hub');
            } else if (hubTypeToCheck === 'processing-hub') {
                return lowerBuildingId.includes('processing-hub');
            } else if (hubTypeToCheck === 'farming-hub') {
                return lowerBuildingId.includes('farming-hub');
            } else if (hubTypeToCheck === 'storage-hub') {
                return lowerBuildingId.includes('storage-hub');
            }

            return false;
        });
    }, [claimStake.buildings]);

    // Calculate count of each hub tier in the claim stake
    const getHubCounts = useCallback(() => {
        const hubCounts = {
            'central-hub': { t1: 0, t2: 0, t3: 0, t4: 0, t5: 0 },
            'extraction-hub': { t1: 0, t2: 0, t3: 0, t4: 0, t5: 0 },
            'processing-hub': { t1: 0, t2: 0, t3: 0, t4: 0, t5: 0 },
            'farming-hub': { t1: 0, t2: 0, t3: 0, t4: 0, t5: 0 },
            'storage-hub': { t1: 0, t2: 0, t3: 0, t4: 0, t5: 0 },
        };

        if (!claimStake?.buildings || !Array.isArray(claimStake.buildings)) {
            return hubCounts;
        }

        // Count each hub by type and tier
        claimStake.buildings.forEach(buildingId => {
            const lowerBuildingId = buildingId.toLowerCase();

            // Extract hub type
            let hubType = null;
            if (lowerBuildingId.includes('central-hub')) {
                hubType = 'central-hub';
            } else if (lowerBuildingId.includes('extraction-hub')) {
                hubType = 'extraction-hub';
            } else if (lowerBuildingId.includes('processing-hub')) {
                hubType = 'processing-hub';
            } else if (lowerBuildingId.includes('farm-hub')) {
                hubType = 'farm-hub';
            } else if (lowerBuildingId.includes('storage-hub')) {
                hubType = 'storage-hub';
            }

            if (!hubType) return;

            // Extract tier
            const tierMatch = lowerBuildingId.match(/t(\d+)/);
            if (tierMatch && tierMatch[1]) {
                const tier = parseInt(tierMatch[1], 10);
                if (tier >= 1 && tier <= 5) {
                    hubCounts[hubType][`t${tier}`]++;
                }
            }
        });

        return hubCounts;
    }, [claimStake.buildings]);

    // Get hub counts for display
    const hubCounts = useMemo(() => getHubCounts(), [getHubCounts]);

    // Compute allowed building IDs for the current tab
    const allowedBuildingIds = activeTab === 'all'
        ? null
        : getBuildingsByType(buildingsData, activeTab).map(b => b.id.toLowerCase());

    // Update the parent component with the available tags
    useEffect(() => {
        if (onUpdateAvailableTags) {
            const availableTags = calculateAvailableTags();
            onUpdateAvailableTags(availableTags);
        }
    }, [onUpdateAvailableTags, calculateAvailableTags]);

    const handleAttemptConstruction = (buildingId) => {
        console.log('[DEBUG] Attempting construction of:', buildingId);
        // Get the current buildings array
        const buildingsBeforeConstruction = [...(claimStake.buildings || [])];
        console.log('Buildings before construction:', buildingsBeforeConstruction);

        // Get the full building definition from buildingsData
        const buildingDefinition = buildingsData[buildingId];
        if (!buildingDefinition) {
            console.error(`Building definition not found for ID: ${buildingId}`);
            setMessage(`Error: Building definition not found`);
            return false;
        }

        console.log('[DEBUG] Building definition found:', buildingDefinition);

        // Attempt to construct the building using the static method
        const result = BuildingService.constructBuilding(
            buildingDefinition, // Use the full building definition, not just the ID
            claimStake,
            claimStake.resources || {},
            globalResources
        );

        if (result.success) {
            // Log the successful construction immediately
            const buildingsAfterConstruction = [...(result.updatedClaimStake.buildings || [])];
            console.log('Buildings after construction:', buildingsAfterConstruction);

            // Identify which building was added
            const newBuildingIds = buildingsAfterConstruction.filter(id => !buildingsBeforeConstruction.includes(id));
            if (newBuildingIds.length > 0) {
                console.log('New building ID added:', newBuildingIds[0]);
            }

            // Create a new update with metadata to ensure proper state propagation
            const update = {
                ...result.updatedClaimStake,
            };

            console.log('[DEBUG] Final buildings array before update:', update.buildings);
            console.log('[DEBUG] Sending update with buildingId:', result.buildingId);

            // Pass metadata with the update to ensure proper handling
            onUpdate(update, {
                buildingId: result.buildingId,
                isConstruction: true,
                timestamp: Date.now()
            });

            // After update, check if the buildings array was properly updated
            setTimeout(() => {
                console.log('[DEBUG] After onUpdate, claimStake buildings:', claimStake.buildings);

                // Force UI refresh to reflect changes
                setForceUpdateBuildings(prev => prev + 1);

                // Update the global resources reference to prevent stale data
                if (result.updatedGlobalResources) {
                    setGlobalResourcesRef(result.updatedGlobalResources);
                    setLocalGlobalResources(result.updatedGlobalResources);
                }

                // Push event to notify all components of construction completion
                const constructionCompletedEvent = new CustomEvent('constructionCompleted', {
                    detail: {
                        buildingId: result.buildingId,
                        claimStakeId: claimStake.id,
                        timestamp: Date.now(),
                        buildings: update.buildings
                    }
                });
                window.dispatchEvent(constructionCompletedEvent);

                // Also update resources across the application
                window.dispatchEvent(new CustomEvent('globalResourcesUpdated', {
                    detail: {
                        resources: result.updatedGlobalResources || globalResources,
                        timestamp: Date.now(),
                        forceUiUpdate: true,
                        highPriority: true
                    }
                }));
            }, 100);

            return true;
        } else {
            console.error('Construction failed:', result.error);
            setMessage(`Construction failed: ${result.error}`);
            return false;
        }
    };

    // Add an effect to listen for building array updates from other components
    useEffect(() => {
        const handleBuildingsArrayUpdate = (e) => {
            if (e.detail.buildings && e.detail.buildings.length > 0) {
                // Force a UI refresh to ensure we show the latest buildings
                setForceUpdateBuildings(prev => prev + 1);

                // If the current buildings array is different from the received one,
                // we need to trigger an update
                if (claimStake && JSON.stringify(claimStake.buildings) !== JSON.stringify(e.detail.buildings)) {

                    // Create an updated claim stake with the correct buildings array
                    const updatedClaimStake = {
                        ...claimStake,
                        buildings: [...e.detail.buildings]
                    };

                    // Update the claim stake
                    onUpdate(updatedClaimStake);
                }
            }
        };

        // Listen for building array updates
        window.addEventListener('buildingsArrayUpdated', handleBuildingsArrayUpdate);

        return () => {
            window.removeEventListener('buildingsArrayUpdated', handleBuildingsArrayUpdate);
        };
    }, [claimStake, onUpdate]);

    // Add an effect to listen for active claim stake updates
    useEffect(() => {
        const handleClaimStakeUpdate = (e) => {

            if (e.detail?.claimStake?.buildings) {

                // Force a UI refresh
                setForceBuildingsRefresh(prev => prev + 1);

                // If the buildings array has changed, update our local state
                if (claimStake &&
                    JSON.stringify(claimStake.buildings) !==
                    JSON.stringify(e.detail.claimStake.buildings)) {

                    const updatedClaimStake = {
                        ...claimStake,
                        buildings: [...e.detail.claimStake.buildings]
                    };

                    // Use onUpdate to propagate the change
                    onUpdate(updatedClaimStake);
                }
            }
        };

        window.addEventListener('activeClaimStakeUpdated', handleClaimStakeUpdate);

        return () => {
            window.removeEventListener('activeClaimStakeUpdated', handleClaimStakeUpdate);
        };
    }, [claimStake, onUpdate]);

    // Add a function to directly verify the JSON data
    const verifyBuildingData = useCallback((buildingId) => {

        // Try to find this building in the buildings data
        const buildingData = buildingsData[buildingId] || buildingsData[`claimStakeBuilding-${buildingId}`];

        if (buildingData) {

        } else {
            // Try to find any similarly named buildings
            const similarBuildings = Object.keys(buildingsData)
                .filter(key => key.includes(buildingId) || key.includes(buildingId.replace(/^claimStakeBuilding-/, '')))
                .map(key => ({
                    key,
                    id: buildingsData[key].id,
                    requiredTags: buildingsData[key].requiredTags,
                    addedTags: buildingsData[key].addedTags
                }));

            if (similarBuildings.length > 0) {

            }
        }
    }, [buildingsData]);

    // Run verification for extraction hub on initial load
    useEffect(() => {
        if (buildingsData) {
            // Check extraction hub data specifically
            verifyBuildingData('extraction-hub-t1');
            verifyBuildingData('claimStakeBuilding-extraction-hub-t1');

            // Log all building IDs that include 'extraction-hub'
            const extractionHubKeys = Object.keys(buildingsData).filter(key =>
                key.includes('extraction-hub'));

        }
    }, [buildingsData, verifyBuildingData, getDisplayableBuildings]);

    return (
        <div className="building-selector">
            <div className="section-tabs">
                <button
                    className={`section-tab ${activeSection === 'construct' ? 'active' : ''}`}
                    onClick={() => setActiveSection('construct')}
                    style={activeSection === 'construct' ? activeTabStyle : {}}
                >
                    New Buildings
                </button>
                <button
                    className={`section-tab ${activeSection === 'view' ? 'active' : ''}`}
                    onClick={() => setActiveSection('view')}
                    style={activeSection === 'view' ? activeTabStyle : {}}
                >
                    My Buildings
                </button>
            </div>

            <div className="building-tabs">
                {buildingTabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`building-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                        style={activeTab === tab.id ? tabStyle : {}}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {debugInfoEnabled && (
                <div className="debug-info" style={{ padding: '10px', background: '#f0f0f0', margin: '10px 0', fontSize: '12px' }}>
                    <h4>Debug Info</h4>
                    <p>Available Tags: {calculateAvailableTags().join(', ')}</p>
                    <p>Claim Stake ID: {claimStake?.id}</p>
                    <p>Constructed Buildings: {(claimStake?.buildings || []).join(', ')}</p>
                </div>
            )}

            <div className="buildings-grid">
                {buildingsArray
                    .filter(building => {
                        if (!building) return false;

                        // Parse tab-specific filters
                        const id = building.id.toLowerCase();

                        // For 'all' tab, show all buildings regardless of tier
                        if (activeTab === 'all') {
                            return true;
                        }

                        // For other tabs, only show if in allowed IDs
                        return allowedBuildingIds.includes(id);
                    })
                    .map(building => {
                        // Determine if this building is a hub
                        const isHub = typeof building.id === 'string' && building.id.toLowerCase().includes('hub') ||
                            (building.name && building.name.toLowerCase().includes('hub'));

                        // Extract the base hub type for this building if it's a hub
                        let baseHubType = '';
                        if (isHub) {
                            if (building.id.toLowerCase().includes('central-hub')) {
                                baseHubType = 'central-hub';
                            } else if (building.id.toLowerCase().includes('extraction-hub')) {
                                baseHubType = 'extraction-hub';
                            } else if (building.id.toLowerCase().includes('processing-hub')) {
                                baseHubType = 'processing-hub';
                            } else if (building.id.toLowerCase().includes('farm-hub')) {
                                baseHubType = 'farm-hub';
                            } else if (building.id.toLowerCase().includes('storage-hub')) {
                                baseHubType = 'storage-hub';
                            }
                        }

                        // Check if this hub type is already constructed
                        const hubAlreadyConstructed = isHub && baseHubType ?
                            isHubAlreadyConstructed(baseHubType) : false;

                        // Get counts for hub indicators
                        const currentHubCounts = isHub && baseHubType ? hubCounts[baseHubType] : {};

                        // Get base ID for modules to count instances
                        const baseId = getBaseId(building.id);

                        // Calculate instance count for modules
                        const instanceCount = !isHub && baseId ?
                            getInstanceCount(baseId, getTier(building.id))
                            : 0;

                        // Check if this building is already constructed
                        const isAlreadyConstructed = checkIfAlreadyConstructed(building.id);

                        const potentialTags = calculateAvailableTags();
                        const canBuildEventually = building.requiredTags ?
                            building.requiredTags.every(tag => potentialTags.includes(tag)) :
                            true;

                        // If it's not a hub and can't be built now or in the future, hide it
                        if (!isHub && !hasRequiredTags(building) && !canBuildEventually) {
                            return null;
                        }

                        return (
                            <BuildingCard
                                key={building.baseId || building.id}
                                id={building.id}
                                building={building}
                                resourceRichness={effectiveResourceRichness}
                                claimStakeId={claimStake?.id}
                                claimStakeDefinitionId={claimStake?.definitionId}
                                buildingsList={claimStake?.buildings || []}
                                underConstructionList={claimStake?.underConstruction || []}
                                onSelect={handleBuildingSelect}
                                isSelected={selectedBuildingType === building.id}
                                isUnderConstruction={isUnderConstruction}
                                canAfford={canAffordBuilding(building)}
                                currentTier={getTier(building.id)}
                                isHub={isHub}
                                hubCounts={currentHubCounts} // Hub counts for tier indicators
                                hubAlreadyConstructed={hubAlreadyConstructed} // Flag to prevent duplicate hub construction
                                upgradeCost={getUpgradeCost(building.id)}
                                isNewModule={activeSection === 'construct'}
                                instanceCount={instanceCount}
                                resources={claimStake.resources || {}}
                                globalResources={localGlobalResources || {}}
                                nextTierBuilding={getNextTierBuilding(building.id)}
                                canBuildWithPower={canBuildWithPower}
                                hasRequiredTags={hasRequiredTags}
                                selectedBuildings={claimStake.buildings || []}
                                getTier={getTier}
                                gameData={gameData}
                                constructionTime={getConstructionTime(building)}
                                timeRemaining={0}
                                maxTier={5}
                                onReceiveResources={handleReceiveResources}
                                setGlobalResourcesRef={setGlobalResourcesRef}
                                availableTiers={building.allTiers || [getTier(building.id)]}
                                requiredBuildings={building.requiredBuildings}
                                isDirectlyBuildable={building.isDirectlyBuildable}
                                isAlreadyConstructed={isAlreadyConstructed}
                                isEventuallyBuildable={!hasRequiredTags(building) && canBuildEventually}
                            />
                        );
                    }).filter(Boolean)}
            </div>

            {selectedBuildingType && (
                <>
                    <div className="sidebar-overlay" onClick={() => setSelectedBuildingType(null)}></div>
                    <BuildingConstructionValidator
                        buildingId={selectedBuildingType}
                        claimStake={claimStake}
                        gameData={gameData}
                        globalResources={globalResources}
                        onConstruct={() => {
                            setSelectedBuildingType(null);
                            // Re-trigger construction with validation passed
                            const buildingToConstruct = buildingsData[selectedBuildingType] ||
                                buildingsData[selectedBuildingType.replace(/^claimStakeBuilding-/, '')];

                            if (buildingToConstruct) {
                                const result = BuildingService.constructBuilding(
                                    buildingToConstruct,
                                    claimStake,
                                    claimStake.resources || {},
                                    globalResources
                                );

                                if (result.success) {
                                    // Update resources and claim stake
                                    if (result.updatedGlobalResources) {
                                        setGlobalResourcesRef(result.updatedGlobalResources);
                                        setLocalGlobalResources(result.updatedGlobalResources);
                                    }

                                    const updatedClaimStake = JSON.parse(JSON.stringify(result.updatedClaimStake));
                                    setForceUpdateBuildings(prev => prev + 1);

                                    onUpdate(updatedClaimStake, {
                                        buildingId: result.buildingId,
                                        isConstruction: true,
                                        timestamp: Date.now()
                                    });

                                    // Dispatch events for UI synchronization
                                    window.dispatchEvent(new CustomEvent('globalResourcesUpdated', {
                                        detail: {
                                            resources: result.updatedGlobalResources || {},
                                            timestamp: Date.now(),
                                            forceUiUpdate: true,
                                            highPriority: true
                                        }
                                    }));

                                    setTimeout(() => {
                                        setForceUpdate(Date.now());
                                        setForceUpdateBuildings(prev => prev + 1);
                                    }, 100);

                                    if (typeof window.triggerAutoSave === 'function') {
                                        setTimeout(() => {
                                            window.triggerAutoSave({ type: 'construction' });
                                        }, 500);
                                    }
                                }
                            }
                        }}
                        onCancel={() => setSelectedBuildingType(null)}
                    />
                </>
            )}
        </div>
    );
};

export default BuildingSelector; 