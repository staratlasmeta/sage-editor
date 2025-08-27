import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Navigation } from '../components/Navigation';
import { StarbaseControl } from '../components/StarbaseControl';
import { useGameData } from '../contexts/DataContext';
import { useSharedState, canPlaceClaimStake } from '../contexts/SharedStateContext';
import { ResourceManager } from '../components/ResourceManager';
import { ShipTransferModal } from '../components/ShipTransferModal';
import { NotificationSystem, useNotifications } from '../components/NotificationSystem';
import type { LinksFunction } from "react-router";
import planetPurchaseStyles from "../styles/planet-purchase.css?url";
import shipTransferStyles from "../styles/ship-transfer-modal.css?url";
import resourceManagerStyles from "../components/ResourceManager.css?url";

export const links: LinksFunction = () => [
    { rel: "stylesheet", href: planetPurchaseStyles },
    { rel: "stylesheet", href: shipTransferStyles },
    { rel: "stylesheet", href: resourceManagerStyles },
];

// Type definitions
interface Planet {
    id: string;
    name: string;
    faction?: string;
    type?: string;
    archetype?: string;  // The JSON uses archetype instead of type
    rentCost?: number;
    resources: string[] | Record<string, any>;  // Support both formats
    tags?: string[];
    richness?: Record<string, number>; // Added for richness
}

interface Building {
    id: string;
    name: string;
    tier: number;
    category?: string;
    minimumTier?: number;
    slots: number;
    power: number;
    crew?: number;
    crewSlots?: number;
    neededCrew?: number;
    storage?: number;
    constructionTime?: number;
    constructionCost?: Record<string, number>;
    resourceRate?: Record<string, number>; // New field: negative for consumption, positive for production
    resourceUsage?: Record<string, number>;  // Keep for backward compatibility
    resourceProduction?: Record<string, number>;  // Keep for backward compatibility
    resourceExtractionRate?: Record<string, number>;  // JSON uses this field name
    extractionRate?: Record<string, number>;  // Keep for compatibility
    requiredTags?: string[];
    addedTags?: string[];  // JSON uses this field name
    providedTags?: string[];  // Keep for compatibility
    requiresHub?: string;
    requiredResources?: string[];
    comesWithStake?: boolean;
    cannotRemove?: boolean;
    resourceStorage?: {
        capacity: number;
    };
    upgradeFamily?: string;
    description?: string;
}

interface ClaimStakeInstance {
    id: string;
    planetId: string;
    planetName?: string;  // For display purposes
    tier: number;
    buildings: PlacedBuilding[];
    resources: Record<string, number>;
    isFinalized: boolean;
    rent: number;
    lastUpdate: number;
    maxStorage: number;
    currentStorage: number;
    maxSlots: number;  // Added for slot management
}

interface PlacedBuilding {
    id: string;
    buildingId: string;
    constructionStarted?: number;
    constructionComplete?: number;
    isActive: boolean;
    inactiveSince?: number; // Track when building became inactive
    stopReason?: string; // Track why building stopped
}

interface ResourceFlow {
    resource: string;
    extraction: number;
    potentialExtraction: number;
    production: number;
    potentialProduction: number;
    consumption: number;
    net: number;
    storage: number;
}

export default function ClaimStakes() {
    const { gameData, loading } = useGameData();
    const { state: sharedState, dispatch, updateStatistic, unlockAchievement, updateAchievementProgress, addToInventory, consumeFromInventory } = useSharedState();
    const { notifications, showNotification, dismissNotification } = useNotifications();

    // State
    const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
    const [selectedTier, setSelectedTier] = useState(1);
    const [shipTransfer, setShipTransfer] = useState<{
        show: boolean;
        from: string;
        to: string;
        resources: Record<string, number>;
    }>({ show: false, from: '', to: '', resources: {} });
    const [claimStakeInstances, setClaimStakeInstances] = useState<ClaimStakeInstance[]>(() => {
        // Load claim stakes from localStorage on mount
        console.log('🔍 Checking for saved claim stakes...');
        const saved = localStorage.getItem('claimStakeInstances');
        console.log('📦 localStorage claimStakeInstances:', saved ? `Found ${saved.length} chars of data` : 'null/undefined');

        // Also check if other keys exist to understand the state
        const sharedState = localStorage.getItem('sageC4SharedState');
        console.log('📦 localStorage sageC4SharedState:', sharedState ? 'exists' : 'null/undefined');

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                console.log('📋 Parsed data type:', Array.isArray(parsed) ? 'array' : typeof parsed);
                console.log('📋 Parsed data:', parsed);

                // Return empty array if the parsed data is not an array or is empty
                if (!Array.isArray(parsed)) {
                    console.warn('⚠️ Parsed data is not an array, returning empty');
                    return [];
                }

                if (parsed.length === 0) {
                    console.log('📭 Parsed array is empty, returning empty array');
                    return [];
                }

                // Update old instances with actual maxSlots from claimStakeDefinitions
                const updated = parsed.map((instance: ClaimStakeInstance) => {
                    // Find the planet for this instance
                    const planet = (gameData?.planets || []).find((p: any) => p.id === instance.planetId);
                    if (!planet) return instance;

                    // Get archetype tags
                    const archetypeTags: string[] = [];
                    if (planet?.archetype) {
                        const archetype = gameData?.planetArchetypes?.find(
                            (a: any) => a.id === planet.archetype
                        );
                        if (archetype?.tags) {
                            archetypeTags.push(...archetype.tags);
                        }
                    }
                    const planetTags = [...(planet?.tags || []), ...archetypeTags];

                    // Find matching stake definition
                    const claimStakeDefinitions = gameData?.claimStakeDefinitions || [];
                    const stakeDefinition = claimStakeDefinitions.find((def: any) => {
                        if (def.tier !== instance.tier) return false;
                        if (def.requiredTags && def.requiredTags.length > 0) {
                            return def.requiredTags.every((tag: string) => planetTags.includes(tag));
                        }
                        return true;
                    });

                    const updatedMaxSlots = stakeDefinition?.slots || (instance.tier * 100);
                    if (instance.maxSlots !== updatedMaxSlots) {
                        console.log(`🔧 Updating maxSlots for instance T${instance.tier}: ${instance.maxSlots} → ${updatedMaxSlots}`);
                        return { ...instance, maxSlots: updatedMaxSlots };
                    }
                    return instance;
                });

                console.log(`✅ Successfully loaded ${updated.length} claim stake instances from localStorage:`);
                updated.forEach(instance => {
                    console.log(`  - ${instance.planetName} T${instance.tier} (${instance.isFinalized ? 'Active' : 'Design'})`);
                });
                return updated;
            } catch (e) {
                console.error('❌ Failed to parse claim stakes from localStorage:', e);
                console.error('Raw saved value was:', saved);
                // Failed to parse, return empty array
                return [];
            }
        }
        console.log('🆕 No saved claim stakes found, starting with empty array');
        return [];
    });
    const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null);
    const [designMode, setDesignMode] = useState(false);
    const [currentDesign, setCurrentDesign] = useState<PlacedBuilding[]>([]);
    const [showStarbaseControl, setShowStarbaseControl] = useState(false);
    const [factionFilter, setFactionFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [buildingCategoryFilter, setBuildingCategoryFilter] = useState('all');

    // Real-time simulation
    const simulationRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            // Clear simulation interval on unmount
            if (simulationRef.current) {
                clearInterval(simulationRef.current);
                simulationRef.current = null;
            }
        };
    }, []);

    // Get active instance
    const activeInstance = claimStakeInstances.find(i => i.id === activeInstanceId);

    const buildingNameWithoutDuplicateTier = (building: Building) => {
        return building.name.replace(/ T\d+$/, '');
    }

    // Cast data with proper types
    const planets = (gameData?.planets || []) as Planet[];
    const rawBuildings = (gameData?.buildings || []) as Building[];

    // Add upgradeFamily to buildings and generate higher tier versions
    const buildings = useMemo(() => {
        const processedBuildings: Building[] = [];
        const buildingsByFamily = new Map<string, Building[]>();

        // Get available resources for the selected planet
        // Support both object and array formats for resources
        const planetResources = selectedPlanet ? (
            Array.isArray(selectedPlanet.resources)
                ? selectedPlanet.resources
                : Object.keys(selectedPlanet.resources || {})
        ) : [];

        // Skip the dynamic infrastructure generation - now using JSON data directly
        if (false && selectedPlanet && planets.length > 0) {

            // Generate planet-specific infrastructure buildings
            const infrastructureTemplates = [
                {
                    baseId: 'central-hub',
                    baseName: 'Central Hub',
                    category: 'infrastructure',
                    baseSlots: 5,
                    basePower: 50,
                    baseCrew: 10,
                    extractionMultiplier: 0.2, // Low extraction rate
                    comesWithStake: true
                },
                {
                    baseId: 'extraction-hub',
                    baseName: 'Extraction Hub',
                    category: 'infrastructure',
                    baseSlots: 8,
                    basePower: 30,
                    baseCrew: 15,
                    extractionMultiplier: 0.5, // Higher extraction rate
                    comesWithStake: false
                },
                {
                    baseId: 'processing-hub',
                    baseName: 'Processing Hub',
                    category: 'infrastructure',
                    baseSlots: 10,
                    basePower: -30, // Consumes power
                    baseCrew: 20,
                    processingCapability: true,
                    comesWithStake: false
                }
            ];

            infrastructureTemplates.forEach(template => {
                // Create extraction rates for all available raw resources (if this building extracts)
                const extractionRate: Record<string, number> = {};
                if (template.extractionMultiplier !== undefined) {
                    planetResources.forEach((resource: string) => {
                        // Extract all raw resources on the planet
                        // Check if this is a raw material using gameData
                        const resourceData = gameData?.resources?.find?.((r: any) => r.id === resource);
                        const isRawResource = resourceData?.category === 'raw' ||
                            // Fallback checks for resources not in gameData
                            resource.includes('-ore') ||
                            resource === 'hydrogen' ||
                            resource === 'silica' ||
                            resource === 'carbon' ||
                            resource === 'arco' ||
                            resource === 'biomass' ||
                            resource === 'coal' ||
                            resource === 'iron' ||
                            resource === 'diamond' ||
                            resource === 'lumanite' ||
                            resource === 'rochinol' ||
                            resource === 'aerogel' ||
                            resource === 'nitrogen';

                        if (isRawResource) {
                            // Get richness from planet archetype
                            const archetype = gameData?.planetArchetypes?.find(
                                (a: any) => a.id === selectedPlanet.archetype
                            );
                            // Try archetype first, fall back to planet resources for backward compatibility
                            const richness = archetype?.richness?.[resource] ||
                                selectedPlanet.resources?.[resource]?.richness || 1;
                            extractionRate[resource] = template.extractionMultiplier * richness;
                        }
                    });
                }

                // Create base T1 infrastructure building
                const baseInfrastructure: Building = {
                    id: `${template.baseId}-t1-${selectedPlanet.id}`,
                    name: `${template.baseName} T1`,
                    category: template.category,
                    tier: 1,
                    slots: template.baseSlots,
                    power: template.basePower,
                    crew: template.baseCrew,
                    extractionRate: Object.keys(extractionRate).length > 0 ? extractionRate : undefined,
                    resourceUsage: template.baseId === 'central-hub' ? { 'fuel': 1 } : undefined,
                    constructionCost: {
                        steel: 100 + (template.baseSlots * 10),
                        electronics: 50 + (template.baseSlots * 5)
                    },
                    constructionTime: 60,
                    requiredTags: [],
                    comesWithStake: template.comesWithStake,
                    upgradeFamily: template.baseId,
                    description: template.processingCapability
                        ? `${template.baseName} for ${selectedPlanet.name}`
                        : `${template.baseName} for ${selectedPlanet.name} - Extracts all available resources`
                };

                // Add processing capability if needed
                if (template.processingCapability) {
                    // Processing hub can process one recipe at a time
                    // We'll add common processing recipes based on planet resources
                    if (planetResources.includes('iron-ore')) {
                        baseInfrastructure.resourceProduction = { steel: 0.5 };
                        baseInfrastructure.resourceUsage = { 'iron-ore': 1 };
                        baseInfrastructure.description = `${template.baseName} for ${selectedPlanet.name} - Processes iron-ore into steel`;
                    } else if (planetResources.includes('copper-ore')) {
                        baseInfrastructure.resourceProduction = { copper: 0.5 };
                        baseInfrastructure.resourceUsage = { 'copper-ore': 1 };
                        baseInfrastructure.description = `${template.baseName} for ${selectedPlanet.name} - Processes copper-ore into copper`;
                    } else if (planetResources.includes('silica')) {
                        baseInfrastructure.resourceProduction = { electronics: 0.3 };
                        baseInfrastructure.resourceUsage = { silica: 1, copper: 0.5 };
                        baseInfrastructure.description = `${template.baseName} for ${selectedPlanet.name} - Processes silica and copper into electronics`;
                    } else {
                        // Default to fuel processing if hydrogen is available
                        baseInfrastructure.resourceProduction = { fuel: 0.2 };
                        baseInfrastructure.resourceUsage = { hydrogen: 1 };
                        baseInfrastructure.description = `${template.baseName} for ${selectedPlanet.name} - Processes hydrogen into fuel`;
                    }
                }

                processedBuildings.push(baseInfrastructure);

                // Generate T2-T5 versions
                for (let tier = 2; tier <= 5; tier++) {
                    const scaledExtraction: Record<string, number> = {};
                    if (baseInfrastructure.extractionRate) {
                        Object.entries(baseInfrastructure.extractionRate).forEach(([resource, rate]) => {
                            scaledExtraction[resource] = rate * (1 + (tier - 1) * 0.5);
                        });
                    }

                    const tierBuilding: Building = {
                        ...baseInfrastructure,
                        id: `${template.baseId}-t${tier}-${selectedPlanet.id}`,
                        name: `${template.baseName} T${tier}`,
                        tier: tier,
                        slots: Math.ceil(template.baseSlots * (1 + (tier - 1) * 0.5)),
                        power: Math.floor(template.basePower * (1 + (tier - 1) * 0.3)),
                        crew: Math.ceil(template.baseCrew * (1 + (tier - 1) * 0.2)),
                        extractionRate: Object.keys(scaledExtraction).length > 0 ? scaledExtraction : undefined,
                        constructionCost: Object.entries(baseInfrastructure.constructionCost || {}).reduce((acc, [resource, amount]) => {
                            acc[resource] = Math.ceil(amount * Math.pow(1.5, tier - 1));
                            return acc;
                        }, {} as Record<string, number>),
                        comesWithStake: false // Only T1 comes with stake
                    };

                    if (template.processingCapability && baseInfrastructure.resourceProduction && baseInfrastructure.resourceUsage) {
                        // Scale processing rates for higher tiers
                        tierBuilding.resourceProduction = {};
                        tierBuilding.resourceUsage = {};

                        Object.entries(baseInfrastructure.resourceProduction).forEach(([resource, rate]) => {
                            tierBuilding.resourceProduction![resource] = rate * (1 + (tier - 1) * 0.5);
                        });

                        Object.entries(baseInfrastructure.resourceUsage).forEach(([resource, rate]) => {
                            tierBuilding.resourceUsage![resource] = rate * (1 + (tier - 1) * 0.3);
                        });

                        tierBuilding.description = baseInfrastructure.description;
                    }

                    processedBuildings.push(tierBuilding);
                }
            });
        }

        // Generate extractors for each raw resource on the planet
        if (selectedPlanet && planetResources.length > 0) {
            planetResources.forEach(resource => {
                // Check if this is a raw material
                const isRawResource = gameData?.resources?.find((r: any) =>
                    r.id === resource && r.category === 'raw'
                );

                if (isRawResource || resource.includes('-ore') || resource.includes('crystal')) {
                    const resourceName = resource.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

                    // Create extractor buildings for this resource (T1-T5)
                    for (let tier = 1; tier <= 5; tier++) {
                        const extractorBuilding: Building = {
                            id: `${resource}-extractor-t${tier}`,
                            name: `${resourceName} Extractor T${tier}`,
                            category: 'extraction',
                            tier: tier,
                            slots: 8 + (tier - 1) * 2, // 8, 10, 12, 14, 16 slots
                            power: -25 - (tier - 1) * 10, // Power consumption increases
                            crew: 5 + (tier - 1) * 2, // 5, 7, 9, 11, 13 crew
                            extractionRate: {
                                [resource]: 0.01 * (1 + (tier - 1) * 0.5) // Scales with tier
                            },
                            constructionCost: {
                                'chromite-ore': 25 * Math.pow(1.5, tier - 1),
                                'copper': 20 * Math.pow(1.5, tier - 1),
                                'copper-ore': tier === 1 ? 15 : 0 // Only T1 uses ore
                            },
                            constructionTime: 60 + (tier - 1) * 30,
                            requiredTags: [`extraction-hub`], // Requires extraction hub
                            upgradeFamily: `${resource}-extractor`,
                            description: `${resourceName} Extractor - extractor building`
                        };

                        processedBuildings.push(extractorBuilding);
                    }
                }
            });

            // Add processing buildings
            for (let tier = 1; tier <= 5; tier++) {
                const processorBuilding: Building = {
                    id: `terrestrial-processor-t${tier}`,
                    name: `Terrestrial Processor T${tier}`,
                    category: 'processing',
                    tier: tier,
                    slots: 4 + (tier - 1) * 2,
                    power: -35 - (tier - 1) * 15,
                    crew: 8 + (tier - 1) * 3,
                    resourceProduction: {
                        'arco': 0.005 * (1 + (tier - 1) * 0.5)
                    },
                    resourceUsage: {
                        'arco': 0.01 * (1 + (tier - 1) * 0.3),
                        'framework': 0.005 * (1 + (tier - 1) * 0.3)
                    },
                    constructionCost: {
                        'arco': 25 * Math.pow(1.5, tier - 1),
                        'framework': 20 * Math.pow(1.5, tier - 1),
                        'copper-ore': tier === 1 ? 15 : 0
                    },
                    constructionTime: 90 + (tier - 1) * 30,
                    requiredTags: [`processing-hub`],
                    upgradeFamily: 'terrestrial-processor',
                    description: 'Terrestrial Processor - processing building'
                };
                processedBuildings.push(processorBuilding);
            }

            // Add power buildings
            for (let tier = 1; tier <= 5; tier++) {
                const powerBuilding: Building = {
                    id: `solar-array-t${tier}`,
                    name: `Solar Array T${tier}`,
                    category: 'power',
                    tier: tier,
                    slots: 6 + (tier - 1) * 2,
                    power: 50 + (tier - 1) * 25, // Generates power
                    crew: 2 + tier,
                    constructionCost: {
                        'electronics': 30 * Math.pow(1.5, tier - 1),
                        'arco': 20 * Math.pow(1.5, tier - 1)
                    },
                    constructionTime: 75 + (tier - 1) * 30,
                    requiredTags: [],
                    upgradeFamily: 'solar-array',
                    description: 'Solar Array - power generation building'
                };
                processedBuildings.push(powerBuilding);
            }

            // Add storage buildings
            for (let tier = 1; tier <= 5; tier++) {
                const storageBuilding: Building = {
                    id: `warehouse-t${tier}`,
                    name: `Warehouse T${tier}`,
                    category: 'storage',
                    tier: tier,
                    slots: 10 + (tier - 1) * 5,
                    power: -10,
                    crew: 3 + tier,
                    storage: 1000 * Math.pow(2, tier - 1), // 1000, 2000, 4000, 8000, 16000
                    constructionCost: {
                        'steel': 40 * Math.pow(1.5, tier - 1),
                        'arco': 25 * Math.pow(1.5, tier - 1)
                    },
                    constructionTime: 60 + (tier - 1) * 30,
                    requiredTags: [`storage-hub`],
                    upgradeFamily: 'warehouse',
                    description: 'Warehouse - storage building'
                };
                processedBuildings.push(storageBuilding);
            }

            // Add farm buildings
            for (let tier = 1; tier <= 5; tier++) {
                const farmBuilding: Building = {
                    id: `hydroponic-farm-t${tier}`,
                    name: `Hydroponic Farm T${tier}`,
                    category: 'farm',
                    tier: tier,
                    slots: 12 + (tier - 1) * 3,
                    power: -20 - (tier - 1) * 10,
                    crew: 6 + (tier - 1) * 2,
                    extractionRate: {
                        'biomass': 0.008 * (1 + (tier - 1) * 0.5)
                    },
                    constructionCost: {
                        'framework': 35 * Math.pow(1.5, tier - 1),
                        'electronics': 20 * Math.pow(1.5, tier - 1)
                    },
                    constructionTime: 80 + (tier - 1) * 30,
                    requiredTags: [`farm-hub`],
                    upgradeFamily: 'hydroponic-farm',
                    description: 'Hydroponic Farm - farm building'
                };
                processedBuildings.push(farmBuilding);
            }
        }

        // First, process ALL buildings from raw data to ensure they have upgradeFamily
        rawBuildings.forEach(building => {
            // Derive upgradeFamily from building ID by removing tier suffix
            const upgradeFamilyName = building.id
                .toLowerCase()
                .replace(/[-_]t[1-5]$/i, '') // Remove -t1, _t2, etc.
                .replace(/[-_]tier[-_][1-5]$/i, ''); // Remove -tier-1, _tier_2, etc.

            // Determine category from tags, name, or ID if not provided
            let category = building.category;
            if (!category) {
                const tags = [...(building.addedTags || []), ...(building.providedTags || [])];
                const name = building.name.toLowerCase();
                const id = building.id.toLowerCase();

                // Check tags and name for categorization
                // Check for processing first (using tags)
                if (tags.includes('processing-hub') || tags.includes('enables-processors')) {
                    category = 'processing';
                } else if (tags.includes('extraction-hub') || tags.includes('enables-extractors')) {
                    category = 'extraction';
                } else if (tags.includes('storage-hub') || tags.includes('enables-storage-hub')) {
                    category = 'storage';
                } else if (tags.includes('farm-hub') || tags.includes('enables-farm-hub')) {
                    category = 'farm';
                }
                // Then check by name patterns
                else if (name.includes('processing hub')) {
                    category = 'processing';
                } else if (name.includes('extraction hub')) {
                    category = 'extraction';
                } else if (name.includes('storage hub')) {
                    category = 'storage';
                } else if (name.includes('cultivation hub') || name.includes('farm')) {
                    category = 'farm';
                } else if (name.includes('power plant') || name.includes('solar array')) {
                    category = 'power';
                } else if (name.includes('extractor')) {
                    category = 'extraction';
                } else if (name.includes('processor')) {
                    category = 'processing';
                } else if (name.includes('crew quarters') || tags.includes('central-hub') ||
                    (name.includes('central hub') || (name.includes('hub') && !name.includes('processing') &&
                        !name.includes('extraction') && !name.includes('storage') && !name.includes('cultivation')))) {
                    category = 'infrastructure';
                } else {
                    category = 'general';
                }
            }

            // Process and add the building with proper upgradeFamily
            // Use actual values from JSON - don't override them!
            const processedBuilding = {
                ...building,
                category: category,
                upgradeFamily: building.upgradeFamily || upgradeFamilyName,
                // Map neededCrew to crew for consistent access
                crew: building.crew || building.neededCrew || 0,
                // Preserve all original values including slots, power, etc.
                tier: building.tier || 1
            };

            processedBuildings.push(processedBuilding);

            // Group buildings by upgradeFamily for validation
            if (!buildingsByFamily.has(processedBuilding.upgradeFamily)) {
                buildingsByFamily.set(processedBuilding.upgradeFamily, []);
            }
            buildingsByFamily.get(processedBuilding.upgradeFamily)!.push(processedBuilding);
        });

        // Second pass: ONLY generate missing tier versions for incomplete families
        // Don't generate tiers that already exist in the JSON!
        buildingsByFamily.forEach((familyBuildings, familyName) => {
            // Skip infrastructure hub families - they're special and should be in JSON
            if (familyName.includes('hub') || familyName.includes('quarters')) {
                return; // Don't generate synthetic versions for infrastructure
            }

            // Find which tiers exist
            const existingTiers = new Set(familyBuildings.map(b => b.tier || 1));
            const baseBuilding = familyBuildings.find(b => b.tier === 1) || familyBuildings[0];

            // Only generate truly missing tiers for non-infrastructure buildings
            for (let tier = 2; tier <= 5; tier++) {
                if (!existingTiers.has(tier) && baseBuilding.category !== 'infrastructure') {
                    console.log(`Generating missing tier ${tier} for ${familyName}`);

                    // Generate consistent tier naming
                    let tierName = baseBuilding.name;

                    // If name has T1 or Tier 1, replace it
                    if (/T1|Tier 1/i.test(tierName)) {
                        tierName = tierName.replace(/T1|Tier 1/i, `T${tier}`);
                    } else if (/T\d+|Tier \d+/i.test(tierName)) {
                        // Replace any tier number
                        tierName = tierName.replace(/T\d+|Tier \d+/i, `T${tier}`);
                    } else {
                        // Otherwise add T{tier} to the end
                        tierName = `${tierName} T${tier}`;
                    }

                    // Generate ID with tier suffix
                    let tierId = baseBuilding.id;
                    if (/t1|tier1/i.test(tierId)) {
                        tierId = tierId.replace(/t1|tier1/i, `t${tier}`);
                    } else if (/t\d+|tier\d+/i.test(tierId)) {
                        tierId = tierId.replace(/t\d+|tier\d+/i, `t${tier}`);
                    } else {
                        tierId = `${tierId}-t${tier}`;
                    }

                    const tierBuilding: Building = {
                        ...baseBuilding,
                        id: tierId,
                        name: tierName,
                        tier: tier,
                        category: baseBuilding.category,
                        upgradeFamily: familyName,
                        // Scale up stats for higher tiers (these are only for missing buildings)
                        slots: Math.ceil(baseBuilding.slots * (1 + (tier - 1) * 0.5)),
                        power: Math.floor(baseBuilding.power * (1 + (tier - 1) * 0.3)),
                        crew: Math.ceil((baseBuilding.crew || baseBuilding.neededCrew || 0) * (1 + (tier - 1) * 0.2)),
                        constructionCost: Object.entries(baseBuilding.constructionCost || {}).reduce((acc, [resource, amount]) => {
                            acc[resource] = Math.ceil((amount as number) * Math.pow(1.5, tier - 1));
                            return acc;
                        }, {} as Record<string, number>),
                        // Scale production/extraction/resource rates
                        ...(baseBuilding.resourceRate && {
                            resourceRate: Object.entries(baseBuilding.resourceRate).reduce((acc, [resource, rate]) => {
                                acc[resource] = (rate as number) * (1 + (tier - 1) * 0.5);
                                return acc;
                            }, {} as Record<string, number>)
                        }),
                        ...(baseBuilding.extractionRate && {
                            extractionRate: Object.entries(baseBuilding.extractionRate).reduce((acc, [resource, rate]) => {
                                acc[resource] = (rate as number) * (1 + (tier - 1) * 0.5);
                                return acc;
                            }, {} as Record<string, number>)
                        }),
                        ...(baseBuilding.resourceExtractionRate && {
                            resourceExtractionRate: Object.entries(baseBuilding.resourceExtractionRate).reduce((acc, [resource, rate]) => {
                                acc[resource] = (rate as number) * (1 + (tier - 1) * 0.5);
                                return acc;
                            }, {} as Record<string, number>)
                        }),
                        ...(baseBuilding.resourceProduction && {
                            resourceProduction: Object.entries(baseBuilding.resourceProduction).reduce((acc, [resource, rate]) => {
                                acc[resource] = (rate as number) * (1 + (tier - 1) * 0.5);
                                return acc;
                            }, {} as Record<string, number>)
                        })
                    };
                    processedBuildings.push(tierBuilding);
                }
            }
        });

        return processedBuildings;
    }, [rawBuildings, selectedPlanet, planets]);

    const starbaseInventory = sharedState.starbaseInventory;

    // Debug logging to verify data loading
    useEffect(() => {
        if (gameData) {
            console.log('Claim Stakes: GameData loaded with', planets.length, 'planets and', buildings.length, 'buildings');
            if (planets.length > 0) {
                console.log('Sample planet:', planets[0]);
            }
            if (buildings.length > 0) {
                console.log('Sample building:', buildings[0]);
                // Log central hub buildings to debug upgrade issue
                const centralHubs = buildings.filter(b =>
                    b.name.toLowerCase().includes('central hub') &&
                    b.category === 'infrastructure'
                );
                console.log('Central Hub buildings found:', centralHubs.map(b => ({
                    id: b.id,
                    name: b.name,
                    tier: b.tier,
                    upgradeFamily: b.upgradeFamily
                })));

                // Log iron ore extractors to debug slots issue
                const ironExtractors = buildings.filter(b =>
                    b.id.toLowerCase().includes('iron-ore-extractor')
                );
                console.log('Iron Ore Extractor buildings found:', ironExtractors.map(b => ({
                    id: b.id,
                    name: b.name,
                    tier: b.tier,
                    slots: b.slots,
                    upgradeFamily: b.upgradeFamily
                })));
            }
        }
    }, [gameData, buildings]);

    // Filter available tiers based on starbase level
    const availableTiers = [1, 2, 3, 4, 5].filter(tier =>
        canPlaceClaimStake(sharedState.starbaseLevel, tier)
    );

    // Save claim stakes to localStorage when they change
    // Track if this is the initial mount to avoid saving empty state immediately
    const isInitialMount = useRef(true);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        // Add cleanup function to prevent saves on unmount
        return () => {
            isMounted.current = false;
            console.log('🔚 Claim stakes component unmounting, not saving');
        };
    }, []);

    useEffect(() => {
        if (!isMounted.current) {
            console.log('⚠️ Component unmounted, not saving');
            return;
        }

        if (isInitialMount.current) {
            isInitialMount.current = false;
            // Don't save on initial mount
            console.log('⏭️ Skipping save on initial mount, instances:', claimStakeInstances.length);
            return;
        }

        // Check if we're in the process of clearing data
        if ((window as any).isClearing) {
            console.warn('🛑 Data is being cleared, not saving claim stakes');
            return;
        }

        // Check if localStorage is being cleared
        const currentSaved = localStorage.getItem('claimStakeInstances');
        if (!currentSaved && claimStakeInstances.length > 0) {
            console.warn('⚠️ CRITICAL: localStorage was cleared but we still have instances in state:', claimStakeInstances);
            console.warn('This indicates the React state wasn\'t properly reset after clearing data');
            console.warn('NOT saving to prevent re-populating cleared data');

            // Check if this is happening right after a clear
            const sharedState = localStorage.getItem('sageC4SharedState');
            if (!sharedState) {
                console.warn('sageC4SharedState is also missing - data was likely just cleared');
                console.warn('The page should reload soon to reset the React state');
            }

            // Don't save if localStorage was cleared but state still has data
            // This prevents re-saving stale state after clear
            return;
        }

        console.log(`💾 Saving ${claimStakeInstances.length} claim stakes to localStorage`, claimStakeInstances.map(i => ({ id: i.id, planet: i.planetName, status: i.isFinalized ? 'Active' : 'Design' })));
        localStorage.setItem('claimStakeInstances', JSON.stringify(claimStakeInstances));

        // Verify save
        const saved = localStorage.getItem('claimStakeInstances');
        if (saved) {
            const parsed = JSON.parse(saved);
            console.log(`✅ Verified save: ${parsed.length} instances in localStorage`);
        }
    }, [claimStakeInstances]);

    // Track which achievements have been triggered this session to prevent spam
    const triggeredAchievementsRef = useRef(new Set<string>());

    // Start real-time simulation with smarter batch processing
    useEffect(() => {
        // Clear any existing interval first
        if (simulationRef.current) {
            clearInterval(simulationRef.current);
            simulationRef.current = null;
        }

        if (claimStakeInstances.length > 0 && buildings && planets) {
            simulationRef.current = setInterval(() => {
                // Get fresh references to buildings and planets
                const currentBuildings = buildings;
                const currentPlanets = planets;

                setClaimStakeInstances(prev => prev.map(instance => {
                    if (!instance.isFinalized) return instance;

                    const now = Date.now();
                    const deltaTime = Math.min((now - instance.lastUpdate) / 1000, 1); // Cap at 1 second
                    const newResources = { ...instance.resources };

                    // Get building power balance
                    let totalPower = 0;
                    instance.buildings.forEach((pb: PlacedBuilding) => {
                        const building = currentBuildings.find((b: Building) => b.id === pb.buildingId);
                        if (building) {
                            totalPower += building.power || 0;
                        }
                    });

                    // Calculate storage info
                    const maxStorage = instance.maxStorage || 1000;
                    const currentStorageUsed = Object.values(newResources).reduce((sum: number, val: any) => sum + val, 0);
                    const storageUtilization = currentStorageUsed / maxStorage;

                    // Check stopping conditions (no hysteresis - immediate stop when conditions are met)
                    let shouldStop = false;
                    let stopReason = '';

                    // Check power
                    if (totalPower < 0) {
                        shouldStop = true;
                        stopReason = 'Insufficient power';
                    }

                    // Check fuel
                    const needsFuel = instance.buildings.some((pb: PlacedBuilding) => {
                        const building = currentBuildings.find((b: Building) => b.id === pb.buildingId);
                        return building?.resourceUsage && building.resourceUsage['fuel'] > 0;
                    });

                    if (needsFuel && (newResources['fuel'] || 0) <= 0) {
                        shouldStop = true;
                        stopReason = 'No fuel available';
                    }

                    // Check if storage is completely full (100%)
                    if (storageUtilization >= 1.0) {
                        // Check if we would produce net positive resources
                        let wouldProduceMore = false;
                        instance.buildings.forEach((pb: PlacedBuilding) => {
                            const building = currentBuildings.find((b: Building) => b.id === pb.buildingId);
                            if (building) {
                                if (building.extractionRate || building.resourceProduction) {
                                    wouldProduceMore = true;
                                }
                            }
                        });

                        if (wouldProduceMore) {
                            shouldStop = true;
                            stopReason = 'Storage full (100%)';
                        }
                    }

                    // Update building states - once stopped, stay stopped until condition is resolved
                    const updatedBuildings = instance.buildings.map((pb: PlacedBuilding) => {
                        // If currently stopped, check if we can restart
                        if (!pb.isActive) {
                            // Only restart if ALL stop conditions are resolved
                            let canRestart = true;

                            // Re-check all conditions for restart
                            if (totalPower < 0) canRestart = false;
                            if (needsFuel && (newResources['fuel'] || 0) <= 5) canRestart = false; // Need at least 5 fuel to restart
                            if (storageUtilization >= 0.90) canRestart = false; // Need space cleared to 90% to restart

                            if (canRestart) {
                                return { ...pb, isActive: true, inactiveSince: undefined };
                            }
                            return pb; // Stay stopped
                        }

                        // If currently active and should stop, stop it
                        if (shouldStop) {
                            return {
                                ...pb,
                                isActive: false,
                                inactiveSince: now,
                                stopReason: stopReason
                            };
                        }

                        return pb; // Stay active
                    });

                    // Only process resources if buildings are active
                    const anyActive = updatedBuildings.some(b => b.isActive);

                    if (anyActive) {
                        // Track resource flows for checking
                        const resourceFlows: Record<string, any> = {};

                        updatedBuildings.forEach((pb: PlacedBuilding) => {
                            if (!pb.isActive) return;

                            const building = currentBuildings.find((b: Building) => b.id === pb.buildingId);
                            if (!building) return;

                            // Check if building has required resources to operate
                            let canProduce = true;

                            // Process resource rates (new format: negative = consumption, positive = production)
                            if (building.resourceRate) {
                                // First check consumption requirements
                                for (const [resource, rate] of Object.entries(building.resourceRate)) {
                                    if (rate < 0) { // Negative rate = consumption
                                        const consumption = Math.abs(rate) * deltaTime;
                                        if ((newResources[resource] || 0) < consumption) {
                                            canProduce = false;
                                            // Mark building as stopped due to lack of input
                                            pb.isActive = false;
                                            pb.stopReason = `Missing ${resource}`;
                                            pb.inactiveSince = Date.now();
                                            break;
                                        }
                                    }
                                }

                                // Process all resource rates if we can produce
                                if (canProduce) {
                                    // Clear stop reason when building can operate
                                    pb.stopReason = undefined;
                                    pb.inactiveSince = undefined;

                                    Object.entries(building.resourceRate).forEach(([resource, rate]) => {
                                        const delta = rate * deltaTime;
                                        newResources[resource] = (newResources[resource] || 0) + delta; // Add delta (negative for consumption)

                                        if (!resourceFlows[resource]) {
                                            resourceFlows[resource] = { production: 0, consumption: 0 };
                                        }

                                        if (rate > 0) {
                                            resourceFlows[resource].production += rate;
                                        } else {
                                            resourceFlows[resource].consumption += Math.abs(rate);
                                        }
                                    });
                                } else {
                                    // Still show flows even if not actually operating
                                    Object.entries(building.resourceRate).forEach(([resource, rate]) => {
                                        if (!resourceFlows[resource]) {
                                            resourceFlows[resource] = { production: 0, consumption: 0 };
                                        }

                                        if (rate > 0) {
                                            resourceFlows[resource].production += rate;
                                        } else {
                                            resourceFlows[resource].consumption += Math.abs(rate);
                                        }
                                    });
                                }
                            }

                            // Process consumption and check availability (backward compatibility)
                            else if (building.resourceUsage) {
                                // First check if all required resources are available
                                for (const [resource, rate] of Object.entries(building.resourceUsage)) {
                                    const consumption = rate * deltaTime;
                                    if ((newResources[resource] || 0) < consumption) {
                                        canProduce = false;
                                        // Mark building as stopped due to lack of input
                                        pb.isActive = false;
                                        pb.stopReason = `Missing ${resource}`;
                                        pb.inactiveSince = Date.now();
                                        break;
                                    }
                                }

                                // Only consume if we can produce
                                if (canProduce) {
                                    // Clear stop reason when building can operate
                                    pb.stopReason = undefined;
                                    pb.inactiveSince = undefined;

                                    Object.entries(building.resourceUsage).forEach(([resource, rate]) => {
                                        const consumption = rate * deltaTime;
                                        newResources[resource] = (newResources[resource] || 0) - consumption;
                                        if (!resourceFlows[resource]) {
                                            resourceFlows[resource] = { production: 0, consumption: 0 };
                                        }
                                        resourceFlows[resource].consumption += rate;
                                    });
                                } else {
                                    // Still show consumption in flows even if not actually consuming
                                    Object.entries(building.resourceUsage).forEach(([resource, rate]) => {
                                        if (!resourceFlows[resource]) {
                                            resourceFlows[resource] = { production: 0, consumption: 0 };
                                        }
                                        // Show what would be consumed if resources were available
                                        resourceFlows[resource].consumption += rate;
                                    });
                                }
                            }

                            // Process extraction (doesn't require inputs, just extracts from planet)
                            const extractionRate = building.extractionRate || building.resourceExtractionRate;
                            if (extractionRate && canProduce) {
                                const planet = currentPlanets.find((p: Planet) => p.id === instance.planetId);
                                const archetype = gameData?.planetArchetypes?.find(
                                    (a: any) => a.id === planet?.archetype
                                );
                                Object.entries(extractionRate).forEach(([resource, rate]) => {
                                    // Try archetype first, fall back to planet resources for backward compatibility
                                    const richness = archetype?.richness?.[resource] ||
                                        planet?.resources?.[resource]?.richness || 1;
                                    const production = rate * richness * deltaTime;
                                    newResources[resource] = (newResources[resource] || 0) + production;

                                    // Track resource extraction achievement and update statistics
                                    updateStatistic('totalResourcesExtracted', production);

                                    // Check for first extraction achievement (with guard to prevent duplicates)
                                    if (!sharedState.achievements['first_extraction'] &&
                                        !triggeredAchievementsRef.current.has('first_extraction') &&
                                        production > 0) {
                                        triggeredAchievementsRef.current.add('first_extraction');
                                        unlockAchievement('first_extraction');
                                        showNotification('🏆 First Extraction! You\'ve extracted your first resource!', 'success', 5000);
                                    }

                                    // Track million units progress
                                    const totalExtracted = (sharedState.statistics.totalResourcesExtracted || 0) + production;
                                    if (totalExtracted < 1000000) {
                                        updateAchievementProgress('million_units', Math.floor(totalExtracted), 1000000);
                                    } else if (totalExtracted >= 1000000 && !sharedState.achievements['million_units'] &&
                                        !triggeredAchievementsRef.current.has('million_units')) {
                                        triggeredAchievementsRef.current.add('million_units');
                                        unlockAchievement('million_units');
                                        showNotification('🏆 Million Unit Club! You\'ve produced over 1,000,000 units!', 'success', 5000);
                                    }
                                    if (!resourceFlows[resource]) {
                                        resourceFlows[resource] = { production: 0, consumption: 0 };
                                    }
                                    resourceFlows[resource].production += rate * richness;
                                });
                            }

                            // Process production ONLY if we have the required inputs
                            if (building.resourceProduction && canProduce) {
                                Object.entries(building.resourceProduction).forEach(([resource, rate]) => {
                                    const production = rate * deltaTime;
                                    newResources[resource] = (newResources[resource] || 0) + production;
                                    if (!resourceFlows[resource]) {
                                        resourceFlows[resource] = { production: 0, consumption: 0 };
                                    }
                                    resourceFlows[resource].production += rate;
                                });
                            }
                        });
                    }

                    // Cap resources at max storage
                    const newStorageUsed = Object.values(newResources).reduce((sum: number, val: any) => sum + val, 0);
                    if (newStorageUsed > maxStorage) {
                        // Scale down all resources proportionally
                        const scale = maxStorage / newStorageUsed;
                        Object.keys(newResources).forEach(resource => {
                            newResources[resource] *= scale;
                        });
                    }

                    // Check for Resource Mogul achievement (10k+ of 5 different resources)
                    const highValueResources = Object.entries(newResources)
                        .filter(([_, amount]) => amount >= 10000)
                        .length;

                    if (highValueResources >= 5 && !sharedState.achievements['resource_mogul'] &&
                        !triggeredAchievementsRef.current.has('resource_mogul')) {
                        triggeredAchievementsRef.current.add('resource_mogul');
                        unlockAchievement('resource_mogul');
                        showNotification('🏆 Resource Mogul! You have 10,000+ units of 5 different resources!', 'success', 5000);
                    } else if (highValueResources > 0 && highValueResources < 5) {
                        updateAchievementProgress('resource_mogul', highValueResources, 5);
                    }

                    return {
                        ...instance,
                        buildings: updatedBuildings,
                        resources: newResources,
                        lastUpdate: now,
                        currentStorage: Object.values(newResources).reduce((sum: number, val: any) => sum + val, 0)
                    };
                }));
            }, 1000); // Run every second

            return () => {
                if (simulationRef.current) {
                    clearInterval(simulationRef.current);
                    simulationRef.current = null;
                }
            };
        }

        // Cleanup on unmount
        return () => {
            if (simulationRef.current) {
                clearInterval(simulationRef.current);
                simulationRef.current = null;
            }
        };
    }, [claimStakeInstances.length, buildings.length, planets.length]); // Use lengths to avoid reference issues

    // Calculate stats for current design or active instance
    const calculateStats = (buildingList: PlacedBuilding[]) => {
        let totalSlots = 0;
        let totalPower = 0;
        let totalCrewSlots = 0; // Crew capacity from hubs
        let totalCrewNeeded = 0; // Crew required by buildings
        let totalStorage = 1000 * selectedTier; // Base storage scales with tier
        const resourceFlow: Record<string, { production: number; consumption: number }> = {};

        // Get current planet for richness values
        const currentPlanet = selectedPlanet ||
            (activeInstance ? planets.find(p => p.id === activeInstance.planetId) : null);

        buildingList.forEach(pb => {
            const building = buildings.find(b => b.id === pb.buildingId);
            if (!building) return;

            totalSlots += building.slots || 0;
            totalPower += building.power || 0;

            // Track crew slots (capacity) and needed crew separately
            totalCrewSlots += building.crewSlots || 0;
            totalCrewNeeded += building.neededCrew || building.crew || 0;

            // Add storage from buildings
            if (building.resourceStorage?.capacity) {
                totalStorage += building.resourceStorage.capacity;
            }
            // Also check for storage property (from the new mock data format)
            if ((building as any).storage) {
                totalStorage += (building as any).storage;
            }

            // Track resource rates (new format: negative = consumption, positive = production)
            if (building.resourceRate) {
                for (const [resource, rate] of Object.entries(building.resourceRate)) {
                    if (!resourceFlow[resource]) resourceFlow[resource] = { production: 0, consumption: 0 };
                    if (rate > 0) {
                        resourceFlow[resource].production += rate;
                    } else {
                        resourceFlow[resource].consumption += Math.abs(rate);
                    }
                }
            }

            // Track resource production (backward compatibility)
            if (building.resourceProduction) {
                for (const [resource, rate] of Object.entries(building.resourceProduction)) {
                    if (!resourceFlow[resource]) resourceFlow[resource] = { production: 0, consumption: 0 };
                    resourceFlow[resource].production += rate;
                }
            }

            // Track resource consumption (backward compatibility)
            if (building.resourceUsage) {
                for (const [resource, rate] of Object.entries(building.resourceUsage)) {
                    if (!resourceFlow[resource]) resourceFlow[resource] = { production: 0, consumption: 0 };
                    resourceFlow[resource].consumption += rate;
                }
            }

            // Track extraction with actual planet richness (check both extractionRate and resourceExtractionRate)
            const extractionRate = building.extractionRate || building.resourceExtractionRate;
            if (extractionRate && currentPlanet) {
                const archetype = gameData?.planetArchetypes?.find(
                    (a: any) => a.id === currentPlanet.archetype
                );
                for (const [resource, rate] of Object.entries(extractionRate)) {
                    // Try archetype first, fall back to planet resources for backward compatibility
                    const richness = archetype?.richness?.[resource] ||
                        currentPlanet.resources?.[resource]?.richness || 1.0;
                    const hasResource = Array.isArray(currentPlanet.resources)
                        ? currentPlanet.resources.includes(resource)
                        : currentPlanet.resources?.[resource] !== undefined;
                    if (hasResource) {
                        if (!resourceFlow[resource]) resourceFlow[resource] = { production: 0, consumption: 0 };
                        resourceFlow[resource].production += rate * richness;
                    }
                }
            }
        });

        // Get the actual max slots from claim stake definition
        const claimStakeDefinitions = gameData?.claimStakeDefinitions || [];
        const archetypeTags: string[] = [];
        if (selectedPlanet?.archetype) {
            const archetype = gameData?.planetArchetypes?.find(
                (a: any) => a.id === selectedPlanet.archetype
            );
            if (archetype?.tags) {
                archetypeTags.push(...archetype.tags);
            }
        }
        const planetTags = [...(selectedPlanet?.tags || []), ...archetypeTags];
        const stakeDefinition = claimStakeDefinitions.find((def: any) => {
            if (def.tier !== selectedTier) return false;
            if (def.requiredTags && def.requiredTags.length > 0) {
                return def.requiredTags.every((tag: string) => planetTags.includes(tag));
            }
            return true;
        });
        const maxSlots = stakeDefinition?.slots || (selectedTier * 100);

        // Calculate overall efficiency based on multiple factors
        let efficiency = 100;
        if (totalSlots > 0) {
            // Power efficiency
            if (totalPower < 0) efficiency -= 30;
            // Slot efficiency
            const slotUsage = (totalSlots / maxSlots) * 100;
            if (slotUsage < 50) efficiency -= 20;
            // Resource balance
            let hasNegativeFlow = false;
            for (const [resource, flow] of Object.entries(resourceFlow)) {
                if (flow.production - flow.consumption < 0 && resource !== 'fuel') {
                    hasNegativeFlow = true;
                    break;
                }
            }
            if (hasNegativeFlow) efficiency -= 10;
        } else {
            efficiency = 0;
        }

        return {
            totalSlots,
            maxSlots,
            totalPower,
            totalCrew: totalCrewNeeded, // For backward compatibility
            totalCrewSlots,
            totalCrewNeeded,
            totalStorage,
            resourceFlow,
            efficiency: Math.max(0, Math.min(100, efficiency))
        };
    };

    const currentStats = designMode
        ? calculateStats(currentDesign)
        : activeInstance
            ? calculateStats(activeInstance.buildings)
            : calculateStats([]);

    // Purchase claim stake
    const purchaseClaimStake = () => {
        if (!selectedPlanet) return;

        // Check if the selected tier is available for current starbase level
        if (!canPlaceClaimStake(sharedState.starbaseLevel, selectedTier)) {
            showNotification(`Cannot place Tier ${selectedTier} claim stake with Starbase Level ${sharedState.starbaseLevel}`, 'error');
            return;
        }

        // Find the matching claim stake definition
        const claimStakeDefinitions = gameData?.claimStakeDefinitions || [];
        const archetypeTags: string[] = [];
        if (selectedPlanet?.archetype) {
            const archetype = gameData?.planetArchetypes?.find(
                (a: any) => a.id === selectedPlanet.archetype
            );
            if (archetype?.tags) {
                archetypeTags.push(...archetype.tags);
            }
        }

        // Get all available tags
        const planetTags = [...(selectedPlanet?.tags || []), ...archetypeTags];

        // Find matching stake definition
        const stakeDefinition = claimStakeDefinitions.find((def: any) => {
            if (def.tier !== selectedTier) return false;

            // Check if required tags match
            if (def.requiredTags && def.requiredTags.length > 0) {
                return def.requiredTags.every((tag: string) => planetTags.includes(tag));
            }
            return true;
        });

        // Use slots from definition or fallback to formula
        const maxSlots = stakeDefinition?.slots || (selectedTier * 100);

        const newInstance: ClaimStakeInstance = {
            id: `cs_${Date.now()}`,
            planetId: selectedPlanet.id,
            planetName: selectedPlanet.name,
            tier: selectedTier,
            buildings: [],
            resources: {
                'fuel': 100, // Start with some fuel
            },
            isFinalized: false,
            rent: 0, // Placeholder, will be calculated
            lastUpdate: Date.now(),
            maxStorage: 1000 * selectedTier, // Base storage scales with tier
            currentStorage: 100, // Just the initial fuel
            maxSlots: maxSlots
        };

        setClaimStakeInstances([...claimStakeInstances, newInstance]);
        setActiveInstanceId(newInstance.id);
        setDesignMode(true);

        // Automatically add the default building from the stake definition
        // Use the defaultBuilding field from the stake definition
        let defaultBuildingId = stakeDefinition?.defaultBuilding;

        // If we have a defaultBuilding ID from the stake definition, find that building
        const centralHub = defaultBuildingId ?
            buildings.find(b => b.id === defaultBuildingId) :
            // Fallback: find a building that comes with the stake
            buildings.find(b => {
                if (!b.comesWithStake || b.tier !== selectedTier) {
                    return false;
                }

                // Check if this hub's required tags match the planet's archetype tags
                if (b.requiredTags && b.requiredTags.length > 0) {
                    return b.requiredTags.every(tag => planetTags.includes(tag));
                }

                return true;
            });

        if (centralHub) {
            const hubPlacement: PlacedBuilding = {
                id: `pb_${Date.now()}`,
                buildingId: centralHub.id,
                isActive: false
            };
            setCurrentDesign([hubPlacement]);
        } else {
            setCurrentDesign([]);
        }

        // Achievements - only trigger on actual first stake (with guard)
        if (claimStakeInstances.length === 0 && !sharedState.achievements?.['first_stake'] &&
            !triggeredAchievementsRef.current.has('first_stake')) {
            triggeredAchievementsRef.current.add('first_stake');
            unlockAchievement('first_stake');
            showNotification('🏆 First Claim Stake! You\'ve placed your first claim stake. Welcome to the frontier!', 'success', 5000);
        }

        // Track multi-planet progress
        const uniquePlanets = new Set([
            ...claimStakeInstances.map(i => i.planetId),
            selectedPlanet.id
        ]);
        updateAchievementProgress('multi_planet', uniquePlanets.size, 5);

        updateStatistic('totalClaimStakes', claimStakeInstances.length + 1);
    };

    // Add building to design with construction cost handling
    const addBuilding = (buildingId: string) => {
        if (!activeInstance || !designMode) return;

        const building = buildings.find((b: Building) => b.id === buildingId);
        if (!building) return;

        // Check if we have enough slots - use currentDesign during design mode
        const currentSlots = currentDesign.reduce((sum, pb) => {
            const b = buildings.find((bld: Building) => bld.id === pb.buildingId);
            return sum + (b?.slots || 0);
        }, 0);

        console.log('🔍 SLOT CHECK:', {
            currentSlots,
            buildingSlots: building.slots,
            totalAfterAdd: currentSlots + building.slots,
            maxSlots: activeInstance.maxSlots,
            wouldExceed: currentSlots + building.slots > activeInstance.maxSlots
        });

        if (currentSlots + building.slots > activeInstance.maxSlots) {
            alert(`Not enough slots available! Current: ${currentSlots}, Building needs: ${building.slots}, Max: ${activeInstance.maxSlots}`);
            return;
        }

        // Don't check materials during design mode - we'll check at finalize
        // Just add the building to the design

        const newBuilding: PlacedBuilding = {
            id: `${buildingId}_${Date.now()}`,
            buildingId: buildingId,
            isActive: false // Will activate when finalized
        };

        // Update currentDesign for design mode UI
        setCurrentDesign(prev => [...prev, newBuilding]);
    };

    // Remove building from design
    const removeBuilding = (placedBuildingId: string) => {
        setCurrentDesign(currentDesign.filter(b => b.id !== placedBuildingId));
    };

    // Finalize design - consume materials from starbase
    const finalizeDesign = () => {
        if (!activeInstance) {
            console.error('No active instance to finalize');
            return;
        }

        // Calculate what's new (buildings added since last finalization)
        const existingBuildingIds = new Set(activeInstance.buildings.map(b => b.id));
        const newBuildings = currentDesign.filter(b => !existingBuildingIds.has(b.id));

        // Calculate construction cost for buildings that need to be paid for
        const totalCost: Record<string, number> = {};

        // If this is the first finalization (no existing buildings), charge for all non-free buildings
        if (activeInstance.buildings.length === 0) {
            currentDesign.forEach((pb: PlacedBuilding) => {
                const building = buildings.find((b: Building) => b.id === pb.buildingId);
                // Only charge for buildings that don't come with stake
                if (building && !building.comesWithStake && building.constructionCost) {
                    Object.entries(building.constructionCost).forEach(([material, amount]) => {
                        totalCost[material] = (totalCost[material] || 0) + amount;
                    });
                }
            });
        } else {
            // For subsequent finalizations, only charge for truly new buildings
            newBuildings.forEach((pb: PlacedBuilding) => {
                const building = buildings.find((b: Building) => b.id === pb.buildingId);
                if (building?.constructionCost) {
                    Object.entries(building.constructionCost).forEach(([material, amount]) => {
                        totalCost[material] = (totalCost[material] || 0) + amount;
                    });
                }
            });
        }

        // Deduct from starbase inventory
        if (Object.keys(totalCost).length > 0) {
            const success = consumeFromInventory(totalCost);
            if (!success) {
                showNotification('Insufficient materials in starbase inventory!', 'error');
                return;
            }
        }

        setClaimStakeInstances(prev => prev.map(instance => {
            if (instance.id === activeInstance.id) {
                // Calculate storage from buildings
                const stats = calculateStats(currentDesign);

                const finalizedInstance = {
                    ...instance,
                    isFinalized: true,
                    maxStorage: stats.totalStorage, // Update storage based on buildings
                    buildings: currentDesign.map((b: PlacedBuilding) => {
                        // Check if this is an existing building
                        const existingBuilding = instance.buildings.find(eb => eb.id === b.id);
                        if (existingBuilding) {
                            // Keep existing building properties
                            return existingBuilding;
                        }
                        // New building
                        return {
                            ...b,
                            constructionStarted: Date.now(),
                            constructionComplete: Date.now() + 1000, // 1 second for simulation
                            isActive: true
                        };
                    })
                };

                // Initialize resources with some fuel to start (only if empty)
                if (!finalizedInstance.resources['fuel']) {
                    finalizedInstance.resources['fuel'] = 10; // Start with 10 fuel
                }

                return finalizedInstance;
            }
            return instance;
        }));

        setDesignMode(false);
        setCurrentDesign([]); // Clear the design after finalizing

        // Achievement - check for efficient builder (5+ buildings) with guard
        if (activeInstance.buildings.length >= 5 && !sharedState.achievements?.['efficient_builder'] &&
            !triggeredAchievementsRef.current.has('efficient_builder')) {
            triggeredAchievementsRef.current.add('efficient_builder');
            unlockAchievement('efficient_builder');
            showNotification('🏆 Efficient Builder! You\'ve placed 5+ buildings in a single claim stake!', 'success', 5000);
        } else if (activeInstance.buildings.length > 0) {
            updateAchievementProgress('efficient_builder', activeInstance.buildings.length, 5);
        }
    };

    // Aggregate stats for all instances
    const aggregateStats = () => {
        const totals: Record<string, number> = {};

        claimStakeInstances.forEach(instance => {
            if (!instance.isFinalized) return;

            const stats = calculateStats(instance.buildings);
            for (const [resource, flow] of Object.entries(stats.resourceFlow)) {
                const net = flow.production - flow.consumption;
                totals[resource] = (totals[resource] || 0) + net;
            }
        });

        return totals;
    };

    // Filter buildings based on availability
    const availableBuildings = buildings.filter(building => {
        // Debug log for processing hub
        if (building.name?.toLowerCase().includes('processing hub') && building.tier === 1) {
            console.log('Processing Hub check:', {
                buildingName: building.name,
                category: building.category,
                categoryFilter: buildingCategoryFilter,
                tier: building.tier,
                requiredTags: building.requiredTags
            });
        }

        // Filter by category
        if (buildingCategoryFilter !== 'all' && building.category !== buildingCategoryFilter) {
            return false;
        }

        // For infrastructure, limit by claim stake tier
        if (building.category === 'infrastructure' && building.tier > selectedTier) {
            return false;
        }

        // Check if slots available
        if (currentStats.totalSlots + building.slots > currentStats.maxSlots) return false;

        // Only show base tier (T1) for new buildings
        // If building family already exists, don't show it in available list (use upgrade instead)
        if (building.upgradeFamily) {
            const existingInFamily = (designMode ? currentDesign : activeInstance?.buildings || [])
                .some(pb => {
                    const placedBuilding = buildings.find(b => b.id === pb.buildingId);
                    return placedBuilding?.upgradeFamily === building.upgradeFamily;
                });

            if (existingInFamily) {
                return false; // Already have a building in this family, use upgrade instead
            }

            // Only show T1 for new buildings (or minimum tier for things like fuel processor)
            const familyBuildings = buildings.filter(b => b.upgradeFamily === building.upgradeFamily);
            const minTier = Math.min(...familyBuildings.map(b => b.tier));
            if (building.tier !== minTier) {
                return false;
            }
        }

        // Check required tags
        if (building.requiredTags && building.requiredTags.length > 0) {
            // Get planet tags from both the planet itself and its archetype
            const planetTags = selectedPlanet?.tags || [];

            // Get archetype tags
            const archetypeTags: string[] = [];
            if (selectedPlanet?.archetype) {
                const archetype = gameData?.planetArchetypes?.find(
                    (a: any) => a.id === selectedPlanet.archetype
                );
                if (archetype?.tags) {
                    archetypeTags.push(...archetype.tags);
                }
            }

            // Get claim stake definition tags
            const stakeDefinitionTags: string[] = [];
            if (activeInstance || designMode) {
                const instanceTier = activeInstance?.tier || selectedTier;
                const claimStakeDefinitions = gameData?.claimStakeDefinitions || [];
                const stakeDefinition = claimStakeDefinitions.find((def: any) => {
                    if (def.tier !== instanceTier) return false;
                    if (def.requiredTags && def.requiredTags.length > 0) {
                        const allPlanetTags = [...planetTags, ...archetypeTags];
                        return def.requiredTags.every((tag: string) => allPlanetTags.includes(tag));
                    }
                    return true;
                });
                if (stakeDefinition?.addedTags) {
                    stakeDefinitionTags.push(...stakeDefinition.addedTags);
                }
            }

            // Collect tags provided by existing buildings
            const buildingProvidedTags = new Set<string>();
            const currentBuildings = designMode ? currentDesign : (activeInstance?.buildings || []);
            currentBuildings.forEach(pb => {
                const placedBuilding = buildings.find(b => b.id === pb.buildingId);
                // Check both providedTags and addedTags (JSON uses addedTags)
                const tags = placedBuilding?.providedTags || placedBuilding?.addedTags || [];
                tags.forEach(tag => buildingProvidedTags.add(tag));
            });

            // Combine all tags: planet, archetype, stake definition, and building-provided tags
            const allAvailableTags = [...planetTags, ...archetypeTags, ...stakeDefinitionTags, ...Array.from(buildingProvidedTags)];

            const hasRequiredTags = building.requiredTags.every(tag => allAvailableTags.includes(tag));
            if (!hasRequiredTags) {
                // Debug logging for processing hub
                if (building.category === 'processing' && building.name?.toLowerCase().includes('processing hub')) {
                    console.log('Processing Hub filtered out:', {
                        buildingName: building.name,
                        requiredTags: building.requiredTags,
                        availableTags: allAvailableTags,
                        placedBuildings: currentBuildings.map(pb => {
                            const b = buildings.find(b => b.id === pb.buildingId);
                            return { id: b?.id, name: b?.name, addedTags: b?.addedTags };
                        })
                    });
                }
                return false;
            }
        }

        // Check required resources (for extractors)
        if (building.requiredResources && building.requiredResources.length > 0) {
            const planetResources = selectedPlanet?.resources || [];
            const hasRequiredResources = building.requiredResources.every(resource => planetResources.includes(resource));
            if (!hasRequiredResources) {

                return false;
            }
        }

        // Special handling for buildings that come with stake
        if (building.comesWithStake && currentDesign.length > 0) {
            // Central hub is already placed
            return false;
        }

        return true;
    });

    // Format flow rate with adaptive decimal places
    const formatFlowRate = (rate: number): string => {
        // Adaptive decimal places based on the magnitude
        if (rate === 0) return '0/s';

        const absRate = Math.abs(rate);
        const sign = rate > 0 ? '+' : '';

        // If rate is very small, show more decimal places
        if (absRate < 0.001) return `${sign}${rate.toFixed(4)}/s`;
        if (absRate < 0.01) return `${sign}${rate.toFixed(3)}/s`;
        if (absRate < 1) return `${sign}${rate.toFixed(2)}/s`;
        if (absRate < 100) return `${sign}${rate.toFixed(1)}/s`;

        // For large numbers, no decimals needed
        return `${sign}${Math.floor(rate)}/s`;
    };

    // Calculate resource flows for display
    const calculateResourceFlows = (instance: ClaimStakeInstance) => {
        const flows: Record<string, ResourceFlow & {
            potentialExtraction?: number;
            potentialProduction?: number;
            isActive?: boolean;
            stopReasons?: string[];
        }> = {};
        const planet = planets.find((p: Planet) => p.id === instance.planetId);

        // Check why buildings might be stopped
        const checkStopReasons = () => {
            const reasons: string[] = [];

            // Check power balance
            let totalPower = 0;
            instance.buildings.forEach((pb: PlacedBuilding) => {
                const building = buildings.find((b: Building) => b.id === pb.buildingId);
                if (building) {
                    totalPower += building.power || 0;
                }
            });
            if (totalPower < 0) {
                reasons.push(`Insufficient power (${totalPower} MW)`);
            }

            // Check fuel
            const fuelNeeded = instance.buildings.some((pb: PlacedBuilding) => {
                const building = buildings.find((b: Building) => b.id === pb.buildingId);
                return building?.resourceUsage && building.resourceUsage['fuel'] > 0;
            });
            if (fuelNeeded && (instance.resources['fuel'] || 0) < 1) {
                reasons.push('No fuel available');
            }

            // Check storage
            const currentStorageUsed = Object.values(instance.resources || {}).reduce((sum: number, val: any) => sum + val, 0);
            if (currentStorageUsed >= instance.maxStorage) {
                reasons.push('Storage full (100%)');
            } else if (currentStorageUsed >= instance.maxStorage * 0.95) {
                reasons.push('Storage nearly full (95%+)');
            }

            // Check if buildings are in cooldown
            const inCooldown = instance.buildings.some((pb: PlacedBuilding) => {
                if (pb.inactiveSince) {
                    const timeSinceInactive = Date.now() - pb.inactiveSince;
                    return timeSinceInactive < 5000; // 5 second cooldown
                }
                return false;
            });
            if (inCooldown) {
                reasons.push('Buildings in cooldown period');
            }

            return reasons;
        };

        const stopReasons = checkStopReasons();
        const areSystemsActive = instance.buildings.some((pb: PlacedBuilding) => pb.isActive);

        instance.buildings.forEach((pb: PlacedBuilding) => {
            const building = buildings.find((b: Building) => b.id === pb.buildingId);
            if (!building) return;

            // Process extraction rates - show both actual and potential (check both extractionRate and resourceExtractionRate)
            const extractionRate = building.extractionRate || building.resourceExtractionRate;
            if (extractionRate) {
                Object.entries(extractionRate).forEach(([resource, rate]) => {
                    if (!flows[resource]) {
                        flows[resource] = {
                            resource,
                            extraction: 0,
                            potentialExtraction: 0,
                            production: 0,
                            potentialProduction: 0,
                            consumption: 0,
                            net: 0,
                            storage: instance.resources[resource] || 0,
                            isActive: pb.isActive,
                            stopReasons: pb.isActive ? [] : stopReasons
                        };
                    }

                    const richness = planet?.resources?.[resource]?.richness || 1;
                    const potentialRate = rate * richness;
                    flows[resource].potentialExtraction! += potentialRate;

                    if (pb.isActive) {
                        flows[resource].extraction += potentialRate;
                    }
                });
            }

            // Process resource rates (new format: negative = consumption, positive = production)
            if (building.resourceRate) {
                Object.entries(building.resourceRate).forEach(([resource, rate]) => {
                    if (!flows[resource]) {
                        flows[resource] = {
                            resource,
                            extraction: 0,
                            potentialExtraction: 0,
                            production: 0,
                            potentialProduction: 0,
                            consumption: 0,
                            net: 0,
                            storage: instance.resources[resource] || 0,
                            isActive: pb.isActive,
                            stopReasons: pb.isActive ? [] : stopReasons
                        };
                    }

                    if (rate > 0) {
                        // Positive rate = production
                        flows[resource].potentialProduction! += rate;
                        if (pb.isActive) {
                            flows[resource].production += rate;
                        }
                    } else {
                        // Negative rate = consumption
                        flows[resource].consumption += Math.abs(rate);
                    }
                });
            }

            // Process production rates - show both actual and potential (backward compatibility)
            if (building.resourceProduction) {
                Object.entries(building.resourceProduction).forEach(([resource, rate]) => {
                    if (!flows[resource]) {
                        flows[resource] = {
                            resource,
                            extraction: 0,
                            potentialExtraction: 0,
                            production: 0,
                            potentialProduction: 0,
                            consumption: 0,
                            net: 0,
                            storage: instance.resources[resource] || 0,
                            isActive: pb.isActive,
                            stopReasons: pb.isActive ? [] : stopReasons
                        };
                    }

                    flows[resource].potentialProduction! += rate;

                    if (pb.isActive) {
                        flows[resource].production += rate;
                    }
                });
            }

            // Process consumption rates (backward compatibility)
            if (building.resourceUsage) {
                Object.entries(building.resourceUsage).forEach(([resource, rate]) => {
                    if (!flows[resource]) {
                        flows[resource] = {
                            resource,
                            extraction: 0,
                            potentialExtraction: 0,
                            production: 0,
                            potentialProduction: 0,
                            consumption: 0,
                            net: 0,
                            storage: instance.resources[resource] || 0,
                            isActive: pb.isActive,
                            stopReasons: pb.isActive ? [] : stopReasons
                        };
                    }

                    flows[resource].consumption += rate;
                });
            }
        });

        // Add stored resources that aren't being produced/consumed
        Object.entries(instance.resources || {}).forEach(([resource, amount]) => {
            if (!flows[resource] && amount > 0) {
                flows[resource] = {
                    resource,
                    extraction: 0,
                    potentialExtraction: 0,
                    production: 0,
                    potentialProduction: 0,
                    consumption: 0,
                    net: 0,
                    storage: amount as number,
                    isActive: areSystemsActive,
                    stopReasons: areSystemsActive ? [] : stopReasons
                };
            }
        });

        // Calculate net flows and include ALL resources
        const finalFlows: any[] = [];
        Object.values(flows).forEach((flow: any) => {
            flow.net = flow.extraction + flow.production - flow.consumption;
            flow.isActive = areSystemsActive;

            // Include ALL resources, not just active ones
            finalFlows.push(flow);
        });

        return finalFlows;
    };

    // Prepare data for ResourceManager - memoized to prevent infinite re-renders
    const claimStakeResources = useMemo(() => {
        return claimStakeInstances.map(stake => {
            const planet = planets.find((p: Planet) => p.id === stake.planetId);
            const flows = calculateResourceFlows(stake);

            return {
                id: stake.id,
                name: `${planet?.name || 'Unknown'} - T${stake.tier}`,
                planetName: planet?.name || 'Unknown',
                tier: stake.tier,
                resources: stake.resources || {},  // Include actual resources
                flows: flows,
                totalStorage: stake.currentStorage || Object.values(stake.resources || {}).reduce((sum: number, val: any) => sum + val, 0),
                currentStorage: stake.currentStorage || Object.values(stake.resources || {}).reduce((sum: number, val: any) => sum + val, 0),
                maxStorage: stake.maxStorage
            };
        });
    }, [claimStakeInstances]); // Removed planets to avoid dependency issues

    // Update global state with claim stakes data
    useEffect(() => {
        dispatch({ type: 'UPDATE_CLAIM_STAKES_DATA', payload: claimStakeResources });
    }, [claimStakeResources, dispatch]);

    // Handle resource transfers
    const handleResourceTransfer = (from: string, to: string, resources: Record<string, number>) => {
        // Show ship transfer modal
        setShipTransfer({
            show: true,
            from,
            to,
            resources
        });
    };

    // Execute the actual transfer after ship animation
    const executeResourceTransfer = () => {
        const { from, to, resources } = shipTransfer;

        // Handle transfers from all stakes
        if (from === 'all-stakes') {
            // Calculate how much each stake contributes
            const stakeContributions: Record<string, Record<string, number>> = {};

            // First pass: figure out what each stake has
            claimStakeInstances.forEach(stake => {
                stakeContributions[stake.id] = {};
                Object.entries(resources).forEach(([resource, totalAmount]) => {
                    const stakeAmount = stake.resources?.[resource] || 0;
                    if (stakeAmount > 0) {
                        // This stake will contribute its full amount
                        stakeContributions[stake.id][resource] = Math.min(stakeAmount, totalAmount);
                    }
                });
            });

            // Remove resources from each stake
            setClaimStakeInstances(prev => prev.map(stake => {
                const contribution = stakeContributions[stake.id];
                if (contribution && Object.keys(contribution).length > 0) {
                    const updatedResources = { ...stake.resources };
                    Object.entries(contribution).forEach(([resource, amount]) => {
                        updatedResources[resource] = Math.max(0, (updatedResources[resource] || 0) - amount);
                        if (updatedResources[resource] <= 0) {
                            delete updatedResources[resource];
                        }
                    });
                    return { ...stake, resources: updatedResources };
                }
                return stake;
            }));

        } else if (from !== 'starbase') {
            // Transfer from a specific claim stake
            setClaimStakeInstances(prev => prev.map(stake => {
                if (stake.id === from) {
                    const updatedResources = { ...stake.resources };
                    Object.entries(resources).forEach(([resource, amount]) => {
                        updatedResources[resource] = Math.max(0, (updatedResources[resource] || 0) - amount);
                        if (updatedResources[resource] <= 0) {
                            delete updatedResources[resource];
                        }
                    });
                    return { ...stake, resources: updatedResources };
                }
                return stake;
            }));
        }

        // Handle transfers to a specific stake
        if (to !== 'starbase' && to !== 'all-stakes') {
            setClaimStakeInstances(prev => prev.map(stake => {
                if (stake.id === to) {
                    const updatedResources = { ...stake.resources };
                    Object.entries(resources).forEach(([resource, amount]) => {
                        updatedResources[resource] = (updatedResources[resource] || 0) + amount;
                    });
                    return { ...stake, resources: updatedResources };
                }
                return stake;
            }));
        }

        // Update starbase inventory
        if (to === 'starbase') {
            // Add resources to starbase
            const resourcesToAdd: Record<string, number> = {};
            Object.entries(resources).forEach(([resource, amount]) => {
                if (amount > 0) {
                    resourcesToAdd[resource] = amount;
                }
            });
            if (Object.keys(resourcesToAdd).length > 0) {
                addToInventory(resourcesToAdd);
                showNotification(`Resources transferred to starbase: ${Object.entries(resourcesToAdd).map(([r, a]) => `${Math.floor(a)} ${r}`).join(', ')}`, 'success');
            }
        } else if (from === 'starbase') {
            // Remove resources from starbase
            const resourcesToRemove: Record<string, number> = {};
            Object.entries(resources).forEach(([resource, amount]) => {
                if (amount > 0) {
                    resourcesToRemove[resource] = amount;
                }
            });
            if (Object.keys(resourcesToRemove).length > 0) {
                consumeFromInventory(resourcesToRemove);
                showNotification(`Resources transferred from starbase: ${Object.entries(resourcesToRemove).map(([r, a]) => `${Math.floor(a)} ${r}`).join(', ')}`, 'success');
            }
        }

        // Close the modal
        setShipTransfer({ show: false, from: '', to: '', resources: {} });
    };

    // Add only fuel to a specific claim stake (for the "Add Fuel" button)
    const handleAddFuel = (stakeId: string) => {
        setClaimStakeInstances(prev => prev.map(instance => {
            if (instance.id === stakeId) {
                const updatedResources = { ...instance.resources };

                // Add 100 fuel for operations
                updatedResources['fuel'] = (updatedResources['fuel'] || 0) + 100;

                showNotification(`Added 100 fuel to ${instance.planetName || 'claim stake'}`, 'success');

                return {
                    ...instance,
                    resources: updatedResources,
                    currentStorage: Object.values(updatedResources).reduce((sum: number, val: any) => sum + val, 0)
                };
            }
            return instance;
        }));
    };

    // Add magic resources - only raw materials (BASIC RESOURCE types)
    const handleMagicResources = (stakeId: string) => {
        setClaimStakeInstances(prev => prev.map(instance => {
            if (instance.id === stakeId) {
                const updatedResources = { ...instance.resources };

                // Only add raw resources based on gameData resources (BASIC RESOURCE types)
                const rawResources = gameData?.resources?.filter((r: any) => r.category === 'raw') || [];
                rawResources.forEach((resource: any) => {
                    updatedResources[resource.id] = (updatedResources[resource.id] || 0) + 100;
                });

                showNotification('✨ Raw materials added to claim stake!', 'success');

                return {
                    ...instance,
                    resources: updatedResources,
                    currentStorage: Object.values(updatedResources).reduce((sum: number, val: any) => sum + val, 0)
                };
            }
            return instance;
        }));
    };

    if (loading) {
        return <div className="loading-screen">Loading game data...</div>;
    }

    return (
        <div className="claim-stakes-app">
            {/* Only render Navigation in dev mode, not in standalone */}
            {typeof window !== 'undefined' && !(window as any).__STANDALONE_BUILD__ && (
                <Navigation claimStakes={claimStakeResources} />
            )}

            <NotificationSystem
                notifications={notifications}
                onDismiss={dismissNotification}
            />

            <div className="claim-stakes-content">
                {/* Left Sidebar */}
                <aside className="sidebar">
                    <div className="sidebar-header">
                        <h2>Select Planet</h2>

                    </div>

                    <>
                        {/* Filters */}
                        <div className="filters">
                            <select
                                value={factionFilter}
                                onChange={(e) => setFactionFilter(e.target.value)}
                                className="filter-select"
                            >
                                <option value="all">All Factions</option>
                                <option value="MUD">MUD</option>
                                <option value="ONI">ONI</option>
                                <option value="UST">UST</option>
                            </select>

                            <input
                                type="text"
                                placeholder="Search planets..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>



                        {/* Planet List */}
                        <div className="planet-list">
                            {planets
                                .filter(planet =>
                                    (factionFilter === 'all' || planet.faction === factionFilter) &&
                                    planet.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                                    !claimStakeInstances.some(stake => stake.planetId === planet.id)
                                )
                                .map(planet => (
                                    <div
                                        key={planet.id}
                                        className={`planet-card ${selectedPlanet?.id === planet.id ? 'selected' : ''}`}
                                        onClick={() => {
                                            console.log('Selected planet:', planet);
                                            console.log('Planet resources:', planet.resources);
                                            setSelectedPlanet(planet);
                                            setActiveInstanceId(null); // Clear active instance to show purchase screen

                                            // Auto-select the first available tier
                                            const availableTiersForLevel = [1, 2, 3, 4, 5].filter(tier =>
                                                canPlaceClaimStake(sharedState.starbaseLevel, tier)
                                            );
                                            if (availableTiersForLevel.length > 0 && !availableTiersForLevel.includes(selectedTier)) {
                                                setSelectedTier(availableTiersForLevel[0]);
                                            }
                                        }}
                                    >
                                        <div className="planet-icon">🌍</div>
                                        <div className="planet-info">
                                            <h4>{planet.name}</h4>
                                            <div className="planet-stats">
                                                <span className={`faction-badge faction-${planet.faction.toLowerCase()}`}>
                                                    {planet.faction}
                                                </span>
                                                <span className="rent-cost">
                                                    💰 {planet.rentCost}/day
                                                </span>
                                            </div>
                                            <div className="resource-badges">
                                                {(Array.isArray(planet.resources) ? planet.resources : Object.keys(planet.resources || {})).slice(0, 3).map((resource: string) => (
                                                    <span key={resource} className="resource-badge">
                                                        {gameData?.resources?.find?.((r: any) => r.id === resource)?.name || resource}
                                                    </span>
                                                ))}
                                                {planet.resources && (Array.isArray(planet.resources) ? planet.resources.length : Object.keys(planet.resources).length) > 3 && (
                                                    <span className="resource-badge">+{(Array.isArray(planet.resources) ? planet.resources.length : Object.keys(planet.resources).length) - 3}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        {/* Claim Stake Instances */}
                        {claimStakeInstances.length > 0 && (
                            <div className="instances-section">
                                <h3>Your Claim Stakes ({claimStakeInstances.length})</h3>
                                <div className="instances-list">
                                    {claimStakeInstances.map(instance => {
                                        const planet = planets.find(p => p.id === instance.planetId);
                                        const stats = calculateStats(instance.buildings);
                                        return (
                                            <div
                                                key={instance.id}
                                                className={`instance-card ${activeInstanceId === instance.id ? 'active' : ''}`}
                                                onClick={() => {
                                                    setActiveInstanceId(instance.id);
                                                    setDesignMode(false);
                                                }}
                                            >
                                                <h5>{planet?.name} - T{instance.tier}</h5>
                                                <div className="instance-stats">
                                                    <span>⚡ {stats.totalPower}</span>
                                                    <span>👥 {stats.totalCrew}</span>
                                                    <span className={instance.isFinalized ? 'status-active' : 'status-design'}>
                                                        {instance.isFinalized ? '🟢 Active' : '🟡 Design'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                </aside>

                {/* Main Content */}
                <main className="main-content">
                    {activeInstance ? (
                        <div className="claim-stake-manager">
                            <div className="manager-header">
                                <h2>
                                    {planets.find(p => p.id === activeInstance.planetId)?.name} -
                                    Tier {activeInstance.tier} Claim Stake
                                </h2>

                                {/* Action Buttons moved to header */}
                                <div className="header-actions">
                                    {designMode ? (
                                        <>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => setDesignMode(false)}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                className="btn btn-primary"
                                                onClick={finalizeDesign}
                                                disabled={currentDesign.length === 0 || (() => {
                                                    // Check power balance
                                                    const stats = calculateStats(currentDesign);
                                                    if (stats.totalPower < 0) {
                                                        return true; // Disabled if power is negative
                                                    }

                                                    // Check if we have all resources for NEW buildings only
                                                    const existingBuildingIds = new Set(activeInstance.buildings.map(b => b.id));
                                                    const newBuildings = currentDesign.filter(b => !existingBuildingIds.has(b.id));

                                                    const totalCost: Record<string, number> = {};
                                                    newBuildings.forEach(pb => {
                                                        const building = buildings.find((b: Building) => b.id === pb.buildingId);
                                                        if (building?.constructionCost) {
                                                            Object.entries(building.constructionCost).forEach(([resource, amount]) => {
                                                                totalCost[resource] = (totalCost[resource] || 0) + (amount as number);
                                                            });
                                                        }
                                                    });

                                                    // Check resource availability  
                                                    for (const [resource, needed] of Object.entries(totalCost)) {
                                                        const available = starbaseInventory[resource] || 0;
                                                        if (available < needed) {
                                                            return true; // Disabled if missing resources
                                                        }
                                                    }

                                                    return false;
                                                })()}
                                                title={currentDesign.length === 0 ? 'Add buildings to design' : ((() => {
                                                    const stats = calculateStats(currentDesign);
                                                    if (stats.totalPower < 0) {
                                                        return `Insufficient power! Need ${Math.abs(stats.totalPower)} more MW`;
                                                    }

                                                    // Calculate cost for NEW buildings only
                                                    const existingBuildingIds = new Set(activeInstance.buildings.map(b => b.id));
                                                    const newBuildings = currentDesign.filter(b => !existingBuildingIds.has(b.id));

                                                    // No new buildings but design changed (removed buildings)?
                                                    if (newBuildings.length === 0 && currentDesign.length !== activeInstance.buildings.length) {
                                                        return 'Update construction (no new buildings)';
                                                    }

                                                    const totalCost: Record<string, number> = {};
                                                    newBuildings.forEach(pb => {
                                                        const building = buildings.find((b: Building) => b.id === pb.buildingId);
                                                        if (building?.constructionCost) {
                                                            Object.entries(building.constructionCost).forEach(([resource, amount]) => {
                                                                totalCost[resource] = (totalCost[resource] || 0) + (amount as number);
                                                            });
                                                        }
                                                    });
                                                    for (const [resource, needed] of Object.entries(totalCost)) {
                                                        const available = starbaseInventory[resource] || 0;
                                                        if (available < needed) {
                                                            const resourceName = resource.replace(/-/g, ' ');
                                                            return `Need ${needed - available} more ${resourceName}`;
                                                        }
                                                    }
                                                    return newBuildings.length > 0
                                                        ? `Finalize and add ${newBuildings.length} new building${newBuildings.length > 1 ? 's' : ''}`
                                                        : 'Finalize and start construction';
                                                })())}
                                            >
                                                Finalize Design
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                setDesignMode(true);
                                                // Keep existing buildings when continuing construction
                                                setCurrentDesign([...activeInstance.buildings]);
                                            }}
                                        >
                                            Continue Construction
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Design Summary (Moved to Top) */}
                            {/* Design Summary moved to right sidebar for better visibility */}

                            {/* Building Management */}
                            <div className="building-management">
                                <div className="buildings-section">
                                    <h3>Buildings</h3>

                                    {/* {designMode && (
                                        <div className="building-filters">
                                            <select
                                                value={buildingCategoryFilter}
                                                onChange={(e) => setBuildingCategoryFilter(e.target.value)}
                                                className="filter-select"
                                            >
                                                <option value="all">All Categories</option>
                                                <option value="extraction">Extraction</option>
                                                <option value="processing">Processing</option>
                                                <option value="power">Power</option>
                                                <option value="storage">Storage</option>
                                                <option value="crew">Crew</option>
                                            </select>
                                        </div>
                                    )} */}

                                    {/* Current Buildings */}
                                    <div className="current-buildings">
                                        {(designMode ? currentDesign : activeInstance.buildings).map(pb => {
                                            const building = buildings.find(b => b.id === pb.buildingId);
                                            if (!building) return null;

                                            // Check if building can be upgraded
                                            const canUpgrade = () => {
                                                if (!building.upgradeFamily) return false;

                                                // Infrastructure limited by claim stake tier
                                                if (building.category === 'infrastructure') {
                                                    return building.tier < selectedTier;
                                                }

                                                // Other buildings can go to T5
                                                if (building.tier >= 5) return false;

                                                // Find next tier building
                                                const nextTier = buildings.find(b =>
                                                    b.upgradeFamily === building.upgradeFamily &&
                                                    b.tier === building.tier + 1
                                                );

                                                if (!nextTier) return false;

                                                // For upgrades, we don't add slots - we just check the differential
                                                // Only check slots for extractors and other non-infrastructure
                                                const slotIncrease = nextTier.slots - building.slots;
                                                const maxSlots = activeInstance?.maxSlots || (selectedTier * 100);
                                                const currentSlots = currentStats.totalSlots;

                                                // For upgrades, allow if the increase doesn't exceed max
                                                // Extractors might not actually increase slots much if at all
                                                return true; // Temporarily allow all upgrades that aren't limited by tier
                                            };

                                            const getUpgradeInfo = () => {
                                                if (!building.upgradeFamily) return null;

                                                const nextTier = buildings.find(b =>
                                                    b.upgradeFamily === building.upgradeFamily &&
                                                    b.tier === building.tier + 1
                                                );

                                                if (!nextTier) return null;

                                                // Calculate differential costs
                                                const upgradeCost: Record<string, number> = {};
                                                Object.entries(nextTier.constructionCost || {}).forEach(([resource, amount]) => {
                                                    const currentCost = (building.constructionCost as any)?.[resource] || 0;
                                                    const diff = amount - currentCost;
                                                    if (diff > 0) upgradeCost[resource] = diff;
                                                });

                                                return {
                                                    nextTier,
                                                    upgradeCost,
                                                    slotIncrease: nextTier.slots - building.slots,
                                                    powerChange: nextTier.power - building.power,
                                                    crewSlotsIncrease: (nextTier.crewSlots || 0) - (building.crewSlots || 0),
                                                    crewNeededIncrease: (nextTier.neededCrew || nextTier.crew || 0) - (building.neededCrew || building.crew || 0)
                                                };
                                            };

                                            const upgradeInfo = getUpgradeInfo();

                                            // Debug logging for upgrade button visibility
                                            if (building.category === 'infrastructure' && building.name.toLowerCase().includes('central hub')) {
                                                console.log('Central Hub Upgrade Debug:', {
                                                    buildingName: building.name,
                                                    buildingTier: building.tier,
                                                    selectedTier: selectedTier,
                                                    upgradeFamily: building.upgradeFamily,
                                                    canUpgrade: canUpgrade(),
                                                    upgradeInfo,
                                                    designMode
                                                });
                                            }



                                            return (
                                                <div key={pb.id} className={`placed-building-card ${!pb.isActive ? 'inactive' : ''} tier-${building.tier}`}>
                                                    <div className="building-header">
                                                        <span className="building-icon">
                                                            {building.category === 'extraction' ? '⛏️' :
                                                                building.category === 'processing' ? '🏭' :
                                                                    building.category === 'power' ? '⚡' :
                                                                        building.category === 'storage' ? '📦' :
                                                                            building.category === 'farm' ? '🌾' :
                                                                                building.category === 'infrastructure' ? '🏛️' : '🏗️'}
                                                        </span>
                                                        <div>
                                                            <h4>{buildingNameWithoutDuplicateTier(building)} T{building.tier}</h4>
                                                            <span className="building-description">{building.description}</span>
                                                        </div>
                                                        {designMode && (
                                                            <button
                                                                className="remove-button"
                                                                onClick={() => removeBuilding(pb.id)}
                                                                title="Remove building"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="building-stats">
                                                        <span title="Slots used">📦 {building.slots}</span>
                                                        <span title="Power" className={building.power > 0 ? 'positive' : 'negative'}>
                                                            ⚡ {building.power > 0 ? '+' : ''}{building.power}
                                                        </span>
                                                        {building.crewSlots && building.crewSlots > 0 ? (
                                                            <span title="Crew slots provided">👥 +{building.crewSlots} slots</span>
                                                        ) : (
                                                            <span title="Crew required">👥 {building.neededCrew || building.crew || 0}</span>
                                                        )}
                                                    </div>

                                                    {/* Production/Consumption Info */}
                                                    {(building.extractionRate || building.resourceProduction || building.resourceUsage) && (
                                                        <div className="resource-info">
                                                            {building.extractionRate && (
                                                                <div className="extraction-info">
                                                                    <strong>Extracts:</strong>
                                                                    {Object.entries(building.extractionRate).map(([res, rate]) => {
                                                                        const planet = planets.find((p: Planet) => p.id === activeInstance?.planetId);
                                                                        const archetype = gameData?.planetArchetypes?.find(
                                                                            (a: any) => a.id === planet?.archetype
                                                                        );
                                                                        // Try archetype first, fall back to planet resources for backward compatibility
                                                                        const richness = archetype?.richness?.[res] ||
                                                                            planet?.resources?.[res]?.richness || 1.0;
                                                                        const actualRate = (rate as number) * richness;
                                                                        return (
                                                                            <span key={res} className="resource-rate">
                                                                                {res}: {actualRate.toFixed(1)}/s
                                                                                {richness !== 1.0 && (
                                                                                    <span className="richness-info" title={`Base: ${(rate as number).toFixed(1)}/s × ${richness.toFixed(1)}x richness`}>
                                                                                        {' '}(×{richness.toFixed(1)})
                                                                                    </span>
                                                                                )}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                            {building.resourceUsage && (
                                                                <div className="consumption-info">
                                                                    <strong>Consumes:</strong>
                                                                    {Object.entries(building.resourceUsage).map(([res, rate]) => (
                                                                        <span key={res} className="resource-rate negative">
                                                                            {res}: -{rate}/s
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {building.resourceProduction && (
                                                                <div className="production-info">
                                                                    <strong>Produces:</strong>
                                                                    {Object.entries(building.resourceProduction).map(([res, rate]) => (
                                                                        <span key={res} className="resource-rate positive">
                                                                            {res}: +{rate}/s
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Construction Cost (in design mode) */}
                                                    {designMode && building.constructionCost && Object.keys(building.constructionCost).length > 0 && (
                                                        <div className="construction-cost">
                                                            <strong>Cost:</strong>
                                                            {Object.entries(building.constructionCost).map(([res, amt]) => (
                                                                <span key={res} className="cost-item">
                                                                    {res}: {amt}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Upgrade Button (in design mode) */}
                                                    {designMode && canUpgrade() && upgradeInfo && (
                                                        <div className="upgrade-section">
                                                            <button
                                                                className="btn btn-sm btn-upgrade"
                                                                onClick={() => {
                                                                    // Replace building with upgraded version
                                                                    const upgraded = {
                                                                        ...pb,
                                                                        buildingId: upgradeInfo.nextTier.id
                                                                    };

                                                                    if (designMode) {
                                                                        setCurrentDesign(prev =>
                                                                            prev.map(b => b.id === pb.id ? upgraded : b)
                                                                        );
                                                                    } else {
                                                                        setClaimStakeInstances(prev => prev.map(stake => {
                                                                            if (stake.id === activeInstanceId) {
                                                                                return {
                                                                                    ...stake,
                                                                                    buildings: stake.buildings.map(b =>
                                                                                        b.id === pb.id ? upgraded : b
                                                                                    )
                                                                                };
                                                                            }
                                                                            return stake;
                                                                        }));
                                                                    }
                                                                }}
                                                                title={`Upgrade to T${building.tier + 1}`}
                                                            >
                                                                ⬆️ Upgrade to T{building.tier + 1}
                                                            </button>
                                                            <div className="upgrade-info">
                                                                <div className="upgrade-changes">
                                                                    <span>+{upgradeInfo.slotIncrease} slots</span>
                                                                    <span>{upgradeInfo.powerChange > 0 ? '+' : ''}{upgradeInfo.powerChange} power</span>
                                                                    {upgradeInfo.crewSlotsIncrease !== 0 && (
                                                                        <span>{upgradeInfo.crewSlotsIncrease > 0 ? '+' : ''}{upgradeInfo.crewSlotsIncrease} crew slots</span>
                                                                    )}
                                                                    {upgradeInfo.crewNeededIncrease !== 0 && (
                                                                        <span>{upgradeInfo.crewNeededIncrease > 0 ? '+' : ''}{upgradeInfo.crewNeededIncrease} crew needed</span>
                                                                    )}
                                                                </div>
                                                                <div className="upgrade-cost">
                                                                    <strong>Upgrade cost:</strong>
                                                                    {Object.entries(upgradeInfo.upgradeCost).map(([res, amt]) => (
                                                                        <span key={res}>{res}: {amt}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Inactive Indicator */}
                                                    {!designMode && !pb.isActive && (
                                                        <div className="inactive-indicator"
                                                            title={
                                                                pb.stopReason ? pb.stopReason :
                                                                    (activeInstance?.resources['fuel'] || 0) <= 0
                                                                        ? "Central hub needs fuel to operate"
                                                                        : currentStats.totalPower < 0
                                                                            ? "Power deficit - add generators"
                                                                            : "Building stopped"
                                                            }
                                                        >
                                                            <span className="status-dot status-inactive"></span>
                                                            <span className="status-text">
                                                                {pb.stopReason ? pb.stopReason :
                                                                    (activeInstance?.resources['fuel'] || 0) <= 0 ? "No Fuel" :
                                                                        currentStats.totalPower < 0 ? "No Power" : "Stopped"}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Available Buildings (Design Mode) */}
                                    {designMode && (
                                        <div className="available-buildings">
                                            <h4>Available Buildings</h4>

                                            {/* Show available tags - compact */}
                                            <div className="available-tags-compact">
                                                <div className="tags-header">
                                                    <span className="tags-label">Tags:</span>
                                                    <div className="tag-list-inline">
                                                        {/* Planet tags */}
                                                        {selectedPlanet?.tags?.map(tag => (
                                                            <span key={tag} className="tag-compact planet-tag" title="From planet">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                        {/* Archetype tags */}
                                                        {(() => {
                                                            if (selectedPlanet?.archetype) {
                                                                const archetype = gameData?.planetArchetypes?.find(
                                                                    (a: any) => a.id === selectedPlanet.archetype
                                                                );
                                                                return archetype?.tags?.map((tag: string) => (
                                                                    <span key={`archetype-${tag}`} className="tag-compact archetype-tag" title="From archetype">
                                                                        {tag}
                                                                    </span>
                                                                ));
                                                            }
                                                            return null;
                                                        })()}
                                                        {/* Claim stake tags */}
                                                        {(() => {
                                                            const instanceTier = activeInstance?.tier || selectedTier;
                                                            const claimStakeDefinitions = gameData?.claimStakeDefinitions || [];
                                                            const stakeDefinition = claimStakeDefinitions.find((def: any) => {
                                                                if (def.tier !== instanceTier) return false;
                                                                if (def.requiredTags && def.requiredTags.length > 0) {
                                                                    const allPlanetTags = [...(selectedPlanet?.tags || []), ...((() => {
                                                                        const archetype = gameData?.planetArchetypes?.find(
                                                                            (a: any) => a.id === selectedPlanet?.archetype
                                                                        );
                                                                        return archetype?.tags || [];
                                                                    })())];
                                                                    return def.requiredTags.every((tag: string) => allPlanetTags.includes(tag));
                                                                }
                                                                return true;
                                                            });
                                                            return stakeDefinition?.addedTags?.map((tag: string) => (
                                                                <span key={`stake-${tag}`} className="tag-compact stake-tag" title="From claim stake">
                                                                    {tag}
                                                                </span>
                                                            ));
                                                        })()}
                                                        {/* Building-provided tags */}
                                                        {(() => {
                                                            const providedTags = new Set<string>();
                                                            currentDesign.forEach(pb => {
                                                                const building = buildings.find(b => b.id === pb.buildingId);
                                                                // Check both providedTags and addedTags (JSON uses addedTags)
                                                                const tags = building?.providedTags || building?.addedTags || [];
                                                                tags.forEach(tag => providedTags.add(tag));
                                                            });
                                                            return Array.from(providedTags).map(tag => (
                                                                <span key={tag} className="tag-compact building-tag" title="From buildings">
                                                                    {tag}
                                                                </span>
                                                            ));
                                                        })()}
                                                        {/* Inline tip */}
                                                        <span className="inline-tip">
                                                            💡 Build hubs to unlock modules
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="building-categories">
                                                <button
                                                    className={`category-btn ${buildingCategoryFilter === 'all' ? 'active' : ''}`}
                                                    onClick={() => setBuildingCategoryFilter('all')}
                                                >
                                                    All
                                                </button>
                                                <button
                                                    className={`category-btn ${buildingCategoryFilter === 'infrastructure' ? 'active' : ''}`}
                                                    onClick={() => setBuildingCategoryFilter('infrastructure')}
                                                >
                                                    🏛️ Infrastructure
                                                </button>
                                                <button
                                                    className={`category-btn ${buildingCategoryFilter === 'extraction' ? 'active' : ''}`}
                                                    onClick={() => setBuildingCategoryFilter('extraction')}
                                                >
                                                    ⛏️ Extraction
                                                </button>
                                                <button
                                                    className={`category-btn ${buildingCategoryFilter === 'processing' ? 'active' : ''}`}
                                                    onClick={() => setBuildingCategoryFilter('processing')}
                                                >
                                                    🏭 Processing
                                                </button>
                                                <button
                                                    className={`category-btn ${buildingCategoryFilter === 'power' ? 'active' : ''}`}
                                                    onClick={() => setBuildingCategoryFilter('power')}
                                                >
                                                    ⚡ Power
                                                </button>
                                                <button
                                                    className={`category-btn ${buildingCategoryFilter === 'storage' ? 'active' : ''}`}
                                                    onClick={() => setBuildingCategoryFilter('storage')}
                                                >
                                                    📦 Storage
                                                </button>
                                                <button
                                                    className={`category-btn ${buildingCategoryFilter === 'farm' ? 'active' : ''}`}
                                                    onClick={() => setBuildingCategoryFilter('farm')}
                                                >
                                                    🌾 Farm
                                                </button>
                                            </div>
                                            <div className="building-grid">
                                                {availableBuildings.length === 0 ? (
                                                    <div className="no-buildings">
                                                        No buildings available in this category
                                                    </div>
                                                ) : (
                                                    availableBuildings.map(building => (
                                                        <div
                                                            key={building.id}
                                                            className={`building-card available tier-${building.tier}`}
                                                            onClick={() => addBuilding(building.id)}
                                                        >
                                                            <div className="building-header">
                                                                <div className="building-icon">
                                                                    {building.category === 'extraction' ? '⛏️' :
                                                                        building.category === 'processing' ? '🏭' :
                                                                            building.category === 'power' ? '⚡' :
                                                                                building.category === 'storage' ? '📦' :
                                                                                    building.category === 'farm' ? '🌾' :
                                                                                        building.category === 'infrastructure' ? '🏛️' : '🏗️'}
                                                                </div>
                                                                <h5>{buildingNameWithoutDuplicateTier(building)} T{building.tier}</h5>
                                                            </div>
                                                            <div className="building-requirements">
                                                                <span title="Slots">📦 {building.slots}</span>
                                                                <span title="Power" className={building.power > 0 ? 'positive' : 'negative'}>
                                                                    ⚡ {building.power > 0 ? '+' : ''}{building.power}
                                                                </span>
                                                                <span title="Crew">👥 {building.crew || building.neededCrew || 0}</span>
                                                            </div>

                                                            {/* Production/Extraction preview */}
                                                            {(building.extractionRate || building.resourceProduction) && (
                                                                <div className="production-preview">
                                                                    {building.extractionRate && (
                                                                        <div className="mini-info">
                                                                            <strong>Extracts:</strong>
                                                                            {Object.entries(building.extractionRate).slice(0, 2).map(([res, rate]) => (
                                                                                <span key={res}>{res}: {rate}/s</span>
                                                                            ))}
                                                                            {Object.keys(building.extractionRate).length > 2 && <span>...</span>}
                                                                        </div>
                                                                    )}
                                                                    {building.resourceProduction && (
                                                                        <div className="mini-info">
                                                                            <strong>Produces:</strong>
                                                                            {Object.entries(building.resourceProduction).map(([res, rate]) => (
                                                                                <span key={res}>{res}: {rate}/s</span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Construction Cost */}
                                                            {building.constructionCost && Object.keys(building.constructionCost).length > 0 && (
                                                                <div className="construction-cost-preview">
                                                                    <strong>Cost:</strong>
                                                                    <div className="cost-items-row">
                                                                        {Object.entries(building.constructionCost).slice(0, 3).map(([res, amt]) => (
                                                                            <span key={res} className="cost-item">
                                                                                {res.replace(/-/g, ' ')}: {amt.toLocaleString()}
                                                                            </span>
                                                                        ))}
                                                                        {Object.keys(building.constructionCost).length > 3 && (
                                                                            <span className="cost-item more">+{Object.keys(building.constructionCost).length - 3} more</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {building.description && (
                                                                <div className="building-description-mini">
                                                                    {building.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Resource Storage */}
                                {activeInstance.isFinalized && (
                                    <div className="resource-storage">
                                        <h3>Resource Storage</h3>
                                        <div className="claim-stakes-resource-grid">
                                            {Object.entries(activeInstance.resources).map(([resource, amount]) => {
                                                // Format resource name for display (remove cargo- prefix if present)
                                                const cleanResource = resource;
                                                const displayName = cleanResource
                                                    .split('-')
                                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                                    .join(' ');

                                                return (
                                                    <div key={resource} className="resource-item">
                                                        <span className="resource-name">{displayName}</span>
                                                        <span className="resource-amount">{
                                                            amount < 0.001 ? amount.toFixed(4) :
                                                                amount < 0.01 ? amount.toFixed(3) :
                                                                    amount < 1 ? amount.toFixed(2) :
                                                                        amount < 100 ? amount.toFixed(1) :
                                                                            Math.floor(amount).toString()
                                                        }</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <button className="btn btn-secondary" onClick={() => {
                                            if (activeInstanceId) handleMagicResources(activeInstanceId);
                                        }}>
                                            🪄 Add Raw Materials
                                        </button>
                                    </div>
                                )}



                                {/* Action Buttons */}
                                {/* Moved to header - remove this entire section */}

                            </div>
                        </div>
                    ) : selectedPlanet ? (
                        <div className="planet-purchase-container">
                            <div className="planet-purchase-header">
                                <div className="planet-visual">
                                    <div className="planet-sphere">
                                        <div className="planet-surface" data-type={selectedPlanet.archetype?.toLowerCase() || selectedPlanet.type?.toLowerCase() || 'terrestrial'}></div>
                                        <div className="planet-atmosphere"></div>
                                    </div>
                                    <div className="planet-glow"></div>
                                </div>
                                <div className="planet-title-section">
                                    <h1 className="planet-name">{selectedPlanet.name || 'Unknown Planet'}</h1>
                                    <div className="planet-subtitle">
                                        <span className={`faction-indicator faction-${(selectedPlanet.faction || 'neutral').toLowerCase()}`}>
                                            {selectedPlanet.faction || 'Neutral'}
                                        </span>
                                        <span className="separator">•</span>
                                        <span className="planet-type">{selectedPlanet.archetype || selectedPlanet.type || 'Unknown'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="purchase-content">
                                {/* Info Cards Side by Side */}
                                <div className="info-section">
                                    <div className="info-card planet-details">
                                        <div className="card-header">
                                            <i className="icon-planet">🌍</i>
                                            <h3>Planet Information</h3>
                                        </div>
                                        <div className="card-content">
                                            <div className="detail-row">
                                                <span className="detail-label">Faction Control</span>
                                                <span className={`detail-value faction-${(selectedPlanet.faction || 'neutral').toLowerCase()}`}>
                                                    {selectedPlanet.faction || 'Neutral'}
                                                </span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="detail-label">Environment Type</span>
                                                <span className="detail-value">{selectedPlanet.archetype || selectedPlanet.type || 'Unknown'}</span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="detail-label">Daily Rent</span>
                                                <span className="detail-value rent-cost">
                                                    <span className="atlas-icon">💎</span>
                                                    {(() => {
                                                        const archetype = gameData?.planetArchetypes?.find(
                                                            (a: any) => a.id === selectedPlanet.archetype
                                                        );
                                                        const rent = archetype?.rent?.[sharedState.starbaseLevel]?.[selectedTier] ||
                                                            selectedPlanet.rentCost ||
                                                            '0.5';
                                                        return rent;
                                                    })()} ATLAS
                                                </span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="detail-label">Starbase Level</span>
                                                <span className="detail-value tier-indicator">Level {sharedState.starbaseLevel}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="info-card resource-details">
                                        <div className="card-header">
                                            <i className="icon-resources">⛏️</i>
                                            <h3>Natural Resources</h3>
                                        </div>
                                        <div className="card-content">
                                            <div className="resources-vertical-list">
                                                {(() => {
                                                    // Get the planet's archetype
                                                    const archetype = gameData?.planetArchetypes?.find(
                                                        (a: any) => a.id === selectedPlanet.archetype
                                                    );

                                                    if (!archetype?.richness) {
                                                        return <p className="no-resources">No archetype data available</p>;
                                                    }

                                                    // Get all raw resources from gameData
                                                    const rawResources = gameData?.resources?.filter((r: any) => r.category === 'raw') || [];

                                                    // Filter resources that:
                                                    // 1. Are in the archetype's richness (meaning they're available on this planet type)
                                                    // 2. Are raw resources
                                                    // 3. Are available for the selected tier (tier filtering based on resource tier)
                                                    const availableResources = rawResources.filter((resource: any) => {
                                                        // Check if resource exists in archetype richness
                                                        if (!archetype.richness[resource.id]) return false;

                                                        // Check if resource tier is available for selected claim stake tier
                                                        // Generally higher tier resources become available at higher claim stake tiers
                                                        // Tier 1-2 resources: Always available
                                                        // Tier 3 resources: Claim stake tier 3+
                                                        // Tier 4 resources: Claim stake tier 4+
                                                        // Tier 5 resources: Claim stake tier 5
                                                        const resourceTier = resource.tier || 1;
                                                        if (resourceTier <= 2) return true;
                                                        if (resourceTier === 3 && selectedTier >= 3) return true;
                                                        if (resourceTier === 4 && selectedTier >= 4) return true;
                                                        if (resourceTier === 5 && selectedTier >= 5) return true;
                                                        return false;
                                                    });

                                                    if (availableResources.length === 0) {
                                                        return <p className="no-resources">No raw resources available at Tier {selectedTier}</p>;
                                                    }

                                                    // Sort resources by tier and then by name
                                                    availableResources.sort((a: any, b: any) => {
                                                        if (a.tier !== b.tier) return (a.tier || 1) - (b.tier || 1);
                                                        return a.name.localeCompare(b.name);
                                                    });

                                                    return availableResources.map((resource: any) => {
                                                        const richness = archetype.richness[resource.id] || 1;
                                                        const resourceType = resource.id.includes('ore') ? 'ore' :
                                                            resource.id.includes('crystal') || resource.id.includes('crystals') ? 'crystal' :
                                                                resource.tier >= 4 ? 'rare' : 'common';

                                                        return (
                                                            <div key={resource.id} className={`resource-list-item ${resourceType} tier-${resource.tier}`}>
                                                                <div className="resource-icon">
                                                                    {resourceType === 'ore' ? '🪨' :
                                                                        resourceType === 'crystal' ? '💎' :
                                                                            resourceType === 'rare' ? '💠' : '📦'}
                                                                </div>
                                                                <span className="resource-name">
                                                                    {resource.name}
                                                                    <span className="resource-richness">
                                                                        ({richness.toFixed(2)}x)
                                                                    </span>
                                                                    {resource.tier >= 3 && (
                                                                        <span className="resource-tier-badge">T{resource.tier}</span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                            <div className="resource-summary">
                                                <p className="summary-text">
                                                    {(() => {
                                                        const archetype = gameData?.planetArchetypes?.find(
                                                            (a: any) => a.id === selectedPlanet.archetype
                                                        );
                                                        const rawResources = gameData?.resources?.filter((r: any) => r.category === 'raw') || [];
                                                        const availableCount = rawResources.filter((resource: any) => {
                                                            if (!archetype?.richness?.[resource.id]) return false;
                                                            const resourceTier = resource.tier || 1;
                                                            if (resourceTier <= 2) return true;
                                                            if (resourceTier === 3 && selectedTier >= 3) return true;
                                                            if (resourceTier === 4 && selectedTier >= 4) return true;
                                                            if (resourceTier === 5 && selectedTier >= 5) return true;
                                                            return false;
                                                        }).length;
                                                        return `${availableCount} resources available at Tier ${selectedTier}`;
                                                    })()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tier Selection - Using Starbase Level */}
                                <div className="tier-selection">
                                    <h3>Select Claim Stake Tier</h3>
                                    <p className="tier-subtitle">Available tiers based on your Starbase Level {sharedState.starbaseLevel}</p>
                                    <div className="tier-options">
                                        {[1, 2, 3, 4, 5].map(tier => {
                                            const isAvailable = canPlaceClaimStake(sharedState.starbaseLevel, tier);
                                            return (
                                                <button
                                                    key={tier}
                                                    className={`tier-option ${selectedTier === tier ? 'selected' : ''} ${!isAvailable ? 'locked' : ''}`}
                                                    onClick={() => isAvailable && setSelectedTier(tier)}
                                                    disabled={!isAvailable}
                                                    title={!isAvailable ? `Requires higher Starbase Level` : ''}
                                                >
                                                    <div className="tier-number">T{tier}</div>
                                                    <div className="tier-info">
                                                        <span className="slots">{(() => {
                                                            const claimStakeDefinitions = gameData?.claimStakeDefinitions || [];
                                                            const archetypeTags: string[] = [];
                                                            if (selectedPlanet?.archetype) {
                                                                const archetype = gameData?.planetArchetypes?.find(
                                                                    (a: any) => a.id === selectedPlanet.archetype
                                                                );
                                                                if (archetype?.tags) {
                                                                    archetypeTags.push(...archetype.tags);
                                                                }
                                                            }
                                                            const planetTags = [...(selectedPlanet?.tags || []), ...archetypeTags];
                                                            const stakeDefinition = claimStakeDefinitions.find((def: any) => {
                                                                if (def.tier !== tier) return false;
                                                                if (def.requiredTags && def.requiredTags.length > 0) {
                                                                    return def.requiredTags.every((tag: string) => planetTags.includes(tag));
                                                                }
                                                                return true;
                                                            });
                                                            return stakeDefinition?.slots || (tier * 100);
                                                        })()} slots</span>
                                                        <span className="storage">{tier * 1000} storage</span>
                                                    </div>
                                                    {!isAvailable && <div className="lock-overlay">🔒</div>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="purchase-action">
                                    <div className="purchase-summary">
                                        <div className="summary-row">
                                            <span>Claim Stake Tier</span>
                                            <strong>Tier {selectedTier}</strong>
                                        </div>
                                        <div className="summary-row">
                                            <span>Building Slots</span>
                                            <strong>{(() => {
                                                const claimStakeDefinitions = gameData?.claimStakeDefinitions || [];
                                                const archetypeTags: string[] = [];
                                                if (selectedPlanet?.archetype) {
                                                    const archetype = gameData?.planetArchetypes?.find(
                                                        (a: any) => a.id === selectedPlanet.archetype
                                                    );
                                                    if (archetype?.tags) {
                                                        archetypeTags.push(...archetype.tags);
                                                    }
                                                }
                                                const planetTags = [...(selectedPlanet?.tags || []), ...archetypeTags];
                                                const stakeDefinition = claimStakeDefinitions.find((def: any) => {
                                                    if (def.tier !== selectedTier) return false;
                                                    if (def.requiredTags && def.requiredTags.length > 0) {
                                                        return def.requiredTags.every((tag: string) => planetTags.includes(tag));
                                                    }
                                                    return true;
                                                });
                                                return stakeDefinition?.slots || (selectedTier * 100);
                                            })()} slots</strong>
                                        </div>
                                        <div className="summary-row">
                                            <span>Storage Capacity</span>
                                            <strong>{selectedTier * 1000} units</strong>
                                        </div>
                                        <div className="summary-row total">
                                            <span>Daily Rent</span>
                                            <strong className="rent-cost">
                                                <span className="atlas-icon">💎</span>
                                                {(() => {
                                                    const archetype = gameData?.planetArchetypes?.find(
                                                        (a: any) => a.id === selectedPlanet.archetype
                                                    );
                                                    const rent = archetype?.rent?.[sharedState.starbaseLevel]?.[selectedTier] ||
                                                        selectedPlanet.rentCost ||
                                                        '0.5';
                                                    return rent;
                                                })()} ATLAS
                                            </strong>
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-purchase"
                                        onClick={purchaseClaimStake}
                                        disabled={!canPlaceClaimStake(sharedState.starbaseLevel, selectedTier)}
                                    >
                                        <span className="btn-icon">🚀</span>
                                        <span className="btn-text">
                                            {canPlaceClaimStake(sharedState.starbaseLevel, selectedTier)
                                                ? `Purchase Tier ${selectedTier} Claim Stake`
                                                : `Tier ${selectedTier} Unavailable`}
                                        </span>
                                        <span className="btn-arrow">→</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <h2>Welcome to Claim Stakes Simulator</h2>
                            <p>Select a planet from the left to begin building your resource empire!</p>
                        </div>
                    )}
                </main>

                {/* Right Sidebar */}
                <aside className="sidebar right">
                    {/* Design Summary - Always visible when in design mode or have buildings */}
                    {(designMode || (activeInstance && activeInstance.buildings.length > 0)) && activeInstance && (() => {
                        const placedBuildings = designMode ? currentDesign : activeInstance.buildings;
                        let totalSlots = 0;
                        let totalPower = 0;
                        let totalCrewSlots = 0;
                        let totalCrewNeeded = 0;
                        const totalCost: Record<string, number> = {};
                        let hasAllResources = true;
                        const missingResources: Record<string, { needed: number; available: number }> = {};

                        placedBuildings.forEach((pb: PlacedBuilding) => {
                            // Use the processed buildings array which includes planet-specific variants
                            const building = buildings.find((b: Building) => b.id === pb.buildingId);
                            if (building) {
                                totalSlots += building.slots || 0;
                                totalPower += building.power || 0;
                                totalCrewSlots += building.crewSlots || 0;
                                totalCrewNeeded += building.neededCrew || building.crew || 0;

                                if (designMode && building.constructionCost) {
                                    Object.entries(building.constructionCost).forEach(([resource, amount]) => {
                                        totalCost[resource] = (totalCost[resource] || 0) + (amount as number);
                                    });
                                }
                            }
                        });

                        // Check resource availability
                        const starbaseInventory = sharedState.starbaseInventory;
                        Object.entries(totalCost).forEach(([resource, needed]) => {
                            const available = starbaseInventory[resource] || 0;
                            if (available < needed) {
                                missingResources[resource] = { needed, available };
                                hasAllResources = false;
                            }
                        });

                        return (
                            <div className="design-summary-panel">
                                <h3>Design Overview</h3>
                                <div className="compact-stats">
                                    <div className="stat-row">
                                        <span>Slots:</span>
                                        <span className={totalSlots > activeInstance.maxSlots ? 'error' : totalSlots === activeInstance.maxSlots ? 'warning' : totalSlots > activeInstance.maxSlots * 0.8 ? 'warning' : 'good'}>
                                            {totalSlots}/{activeInstance.maxSlots}
                                        </span>
                                    </div>
                                    <div className="stat-row">
                                        <span>Power:</span>
                                        <span className={totalPower < 0 ? 'error' : totalPower === 0 ? 'warning' : totalPower > 50 ? 'positive' : 'good'}>
                                            {totalPower > 0 ? '+' : ''}{totalPower} MW
                                        </span>
                                    </div>
                                    <div className="stat-row">
                                        <span>Crew:</span>
                                        <span className={currentStats.totalCrewNeeded > currentStats.totalCrewSlots ? 'warning' : 'neutral'}>
                                            {currentStats.totalCrewNeeded} / {currentStats.totalCrewSlots}
                                        </span>
                                    </div>
                                    <div className="stat-row">
                                        <span>Storage:</span>
                                        <span className="neutral">
                                            {currentStats.totalStorage.toLocaleString()}
                                        </span>
                                    </div>
                                    {designMode && (
                                        <div className="stat-row">
                                            <span>Efficiency:</span>
                                            <span className={currentStats.efficiency >= 90 ? 'positive' : currentStats.efficiency >= 70 ? 'good' : currentStats.efficiency >= 50 ? 'warning' : 'error'}>
                                                {currentStats.efficiency}%
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {designMode && Object.keys(totalCost).length > 0 && (
                                    <div className="compact-requirements">
                                        <h4>Construction Cost</h4>
                                        <div className="resource-list-compact">
                                            {Object.entries(totalCost).map(([resource, needed]) => {
                                                const available = starbaseInventory[resource] || 0;
                                                const sufficient = available >= needed;
                                                // Format resource name for display (remove cargo- prefix if present)
                                                const cleanResource = resource;
                                                const displayName = cleanResource
                                                    .split('-')
                                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                                    .join(' ');

                                                return (
                                                    <div key={resource} className={`resource-req-compact ${sufficient ? 'ok' : 'missing'}`}>
                                                        <span className="res-name">{displayName}:</span>
                                                        <span className="res-amounts">
                                                            {available}/{needed}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {!hasAllResources && (
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => {
                                                    const toAdd: Record<string, number> = {};
                                                    Object.entries(missingResources).forEach(([resource, data]) => {
                                                        toAdd[resource] = data.needed - data.available;
                                                    });
                                                    addToInventory(toAdd);
                                                    showNotification('Added missing resources', 'success');
                                                }}
                                            >
                                                🪄 Add Missing
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    <h3>Production Overview</h3>

                    {/* Resource Flow */}
                    <div className="resource-flow-section">
                        <h4>Resource Flow</h4>
                        <div className="flow-list">
                            {Object.entries(currentStats.resourceFlow).map(([resource, flow]) => {
                                const net = flow.production - flow.consumption;
                                // Format resource name for display (remove cargo- prefix if present)
                                const cleanResource = resource;
                                const displayName = cleanResource
                                    .split('-')
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(' ');

                                return (
                                    <div key={resource} className="flow-item">
                                        <span className="resource-name">{displayName}</span>
                                        <div className="flow-values">
                                            <span className="production">{formatFlowRate(flow.production)}</span>
                                            <span className="consumption">{formatFlowRate(-flow.consumption)}</span>
                                            <span className={`net ${net >= 0 ? 'positive' : 'negative'}`}>
                                                {formatFlowRate(net)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Aggregate View */}
                    {claimStakeInstances.length > 1 && (
                        <div className="aggregate-section">
                            <h4>All Claim Stakes Total</h4>
                            <div className="aggregate-stats">
                                {Object.entries(aggregateStats()).map(([resource, net]) => {
                                    // Format resource name for display (remove cargo- prefix if present)
                                    const cleanResource = resource;
                                    const displayName = cleanResource
                                        .split('-')
                                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                        .join(' ');

                                    return (
                                        <div key={resource} className="aggregate-item">
                                            <span>{displayName}</span>
                                            <span className={net >= 0 ? 'positive' : 'negative'}>
                                                {formatFlowRate(net)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Compact Tips - Only show critical warnings */}
                    <div className="tips-section-compact">
                        {activeInstance && activeInstance.buildings.some(b => !b.isActive) && (
                            <div className="warning critical">
                                🛑 Buildings stopped - {(activeInstance.resources['fuel'] || 0) <= 0 ? 'add fuel' : currentStats.totalPower < 0 ? 'fix power' : 'check resources'}
                            </div>
                        )}
                        {activeInstance && activeInstance.currentStorage / activeInstance.maxStorage >= 0.95 && (
                            <div className="warning critical">
                                📦 Storage {Math.floor((activeInstance.currentStorage / activeInstance.maxStorage) * 100)}% full
                            </div>
                        )}
                        {currentStats.totalPower < 0 && (
                            <div className="warning">⚠️ Power deficit</div>
                        )}
                        {activeInstance && (activeInstance.resources['fuel'] || 0) <= 0 && (
                            <div className="warning critical">🚫 No fuel</div>
                        )}
                    </div>
                </aside>
            </div>

            {/* Add Resource Manager - Only show if there are claim stakes AND we're viewing an active instance */}
            {claimStakeInstances.length > 0 && activeInstanceId && (
                <ResourceManager
                    claimStakes={claimStakeResources}
                    starbaseInventory={sharedState.starbaseInventory}
                    onTransfer={handleResourceTransfer}
                    onMagicResources={handleAddFuel}
                />
            )}

            {/* Ship Transfer Modal */}
            <ShipTransferModal
                show={shipTransfer.show}
                from={shipTransfer.from}
                to={shipTransfer.to}
                resources={shipTransfer.resources}
                onComplete={executeResourceTransfer}
            />
        </div>
    );
} 