import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Navigation } from '../components/Navigation';
import { StarbaseControl } from '../components/StarbaseControl';
import { useGameData } from '../contexts/DataContext';
import { useSharedState, canPlaceClaimStake } from '../contexts/SharedStateContext';
import { ResourceManager } from '../components/ResourceManager';
import { NotificationSystem, useNotifications } from '../components/NotificationSystem';
import type { LinksFunction } from "react-router";
import planetPurchaseStyles from "../styles/planet-purchase.css?url";

export const links: LinksFunction = () => [
    { rel: "stylesheet", href: planetPurchaseStyles },
];

// Type definitions
interface Planet {
    id: string;
    name: string;
    faction: string;
    type: string;
    rentCost: number;
    resources: string[];
    tags: string[];
    richness?: Record<string, number>; // Added for richness
}

interface Building {
    id: string;
    name: string;
    tier: number;
    category: string;
    slots: number;
    power: number;
    crew: number;
    constructionTime?: number;
    constructionCost?: Record<string, number>;
    resourceUsage?: Record<string, number>;
    resourceProduction?: Record<string, number>;
    extractionRate?: Record<string, number>;
    requiredTags?: string[];
    providedTags?: string[];
    requiresHub?: string;
    requiredResources?: string[];
    comesWithStake?: boolean;
    resourceStorage?: {
        capacity: number;
    };
    upgradeFamily?: string;
    description?: string;
}

interface ClaimStakeInstance {
    id: string;
    planetId: string;
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
    const { state: sharedState, dispatch, updateStatistic, unlockAchievement, addToInventory, consumeFromInventory } = useSharedState();
    const { notifications, showNotification, dismissNotification } = useNotifications();

    // State
    const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
    const [selectedTier, setSelectedTier] = useState(1);
    const [claimStakeInstances, setClaimStakeInstances] = useState<ClaimStakeInstance[]>(() => {
        // Load claim stakes from localStorage on mount
        const saved = localStorage.getItem('claimStakeInstances');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Return empty array if the parsed data is not an array or is empty
                if (!Array.isArray(parsed)) {
                    return [];
                }
                // Update old instances with new maxSlots calculation (5x slots)
                const updated = parsed.map((instance: ClaimStakeInstance) => {
                    const updatedMaxSlots = instance.tier * 100; // Demo: 5x slots
                    if (instance.maxSlots !== updatedMaxSlots) {
                        console.log(`🔧 Updating maxSlots for instance T${instance.tier}: ${instance.maxSlots} → ${updatedMaxSlots}`);
                        return { ...instance, maxSlots: updatedMaxSlots };
                    }
                    return instance;
                });
                return updated;
            } catch (e) {
                // Failed to parse, return empty array
                return [];
            }
        }
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

        // Generate planet-specific infrastructure variants if we have a selected planet
        if (selectedPlanet && planets.length > 0) {
            // Get available resources for the selected planet
            const planetResources = selectedPlanet.resources || [];

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
                        // Check if this is a raw material (not processed like steel, copper, etc.)
                        const isRawResource = resource.includes('-ore') ||
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
                            resource === 'nitrogen' ||
                            // Default: if not clearly processed (no 'cargo-' prefix), assume it's raw
                            (!resource.includes('cargo-') && !resource.includes('fuel') && !resource.includes('steel') && !resource.includes('electronics'));

                        if (isRawResource) {
                            const richness = selectedPlanet.richness?.[resource] || 1;
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
                    resourceUsage: template.baseId === 'central-hub' ? { 'cargo-fuel': 1 } : undefined,
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

        // Process each base building from raw data
        rawBuildings.forEach(baseBuilding => {
            // Skip if building has tier > 1 (we only want to process T1 buildings as base)
            if (baseBuilding.tier && baseBuilding.tier > 1) {
                return;
            }

            // Skip infrastructure buildings as we generate planet-specific ones above
            if (baseBuilding.category === 'infrastructure') {
                return;
            }

            // Derive upgradeFamily from building name by removing tier suffix
            const upgradeFamilyName = baseBuilding.name
                .toLowerCase()
                .replace(/ t[1-5]$/i, '') // Remove T1, T2, etc.
                .replace(/ tier [1-5]$/i, '') // Remove Tier 1, Tier 2, etc.
                .replace(/\s+/g, '_'); // Replace spaces with underscores

            // Ensure the base building is T1 - don't add T1 if already present
            const baseBuildingT1 = {
                ...baseBuilding,
                name: baseBuilding.name, // Keep original name (should already have T1)
                tier: 1, // Force tier 1
                upgradeFamily: baseBuilding.upgradeFamily || upgradeFamilyName
            };
            processedBuildings.push(baseBuildingT1);

            // Generate higher tier versions (T2-T5)
            // Infrastructure will be filtered by claim stake tier later
            const maxTier = 5;

            for (let tier = 2; tier <= maxTier; tier++) {
                // Generate consistent tier naming
                let tierName = baseBuilding.name;

                // If name has T1 or Tier 1, replace it
                if (/T1|Tier 1/i.test(tierName)) {
                    tierName = tierName.replace(/T1|Tier 1/i, `T${tier}`);
                } else {
                    // Otherwise add T{tier} to the end
                    tierName = `${tierName} T${tier}`;
                }

                // Generate ID with tier suffix
                let tierId = baseBuilding.id;
                if (/t1|tier1/i.test(tierId)) {
                    tierId = tierId.replace(/t1|tier1/i, `t${tier}`);
                } else {
                    tierId = `${tierId}-t${tier}`;
                }

                // Check if this tier already exists
                const exists = rawBuildings.some(b => b.id === tierId);
                if (!exists) {
                    const tierBuilding: Building = {
                        ...baseBuilding,
                        id: tierId,
                        name: tierName,
                        tier: tier,
                        upgradeFamily: upgradeFamilyName,
                        // Scale up stats for higher tiers
                        slots: Math.ceil(baseBuilding.slots * (1 + (tier - 1) * 0.5)),
                        power: Math.floor(baseBuilding.power * (1 + (tier - 1) * 0.3)),
                        crew: Math.ceil(baseBuilding.crew * (1 + (tier - 1) * 0.2)),
                        constructionCost: Object.entries(baseBuilding.constructionCost || {}).reduce((acc, [resource, amount]) => {
                            acc[resource] = Math.ceil((amount as number) * Math.pow(1.5, tier - 1));
                            return acc;
                        }, {} as Record<string, number>),
                        // Scale production/extraction rates
                        ...(baseBuilding.extractionRate && {
                            extractionRate: Object.entries(baseBuilding.extractionRate).reduce((acc, [resource, rate]) => {
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
            }
        }
    }, [gameData]);

    // Filter available tiers based on starbase level
    const availableTiers = [1, 2, 3, 4, 5].filter(tier =>
        canPlaceClaimStake(sharedState.starbaseLevel, tier)
    );

    // Save claim stakes to localStorage when they change
    // Track if this is the initial mount to avoid saving empty state immediately
    const isInitialMount = useRef(true);
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            // Don't save on initial mount
            return;
        }
        localStorage.setItem('claimStakeInstances', JSON.stringify(claimStakeInstances));
    }, [claimStakeInstances]);

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
                        return building?.resourceUsage && building.resourceUsage['cargo-fuel'] > 0;
                    });

                    if (needsFuel && (newResources['cargo-fuel'] || 0) <= 0) {
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
                            if (needsFuel && (newResources['cargo-fuel'] || 0) <= 5) canRestart = false; // Need at least 5 fuel to restart
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

                            // Process consumption and check availability
                            if (building.resourceUsage) {
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
                            if (building.extractionRate && canProduce) {
                                const planet = currentPlanets.find((p: Planet) => p.id === instance.planetId);
                                Object.entries(building.extractionRate).forEach(([resource, rate]) => {
                                    const richness = planet?.richness?.[resource] || 1;
                                    const production = rate * richness * deltaTime;
                                    newResources[resource] = (newResources[resource] || 0) + production;
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
        let totalCrew = 0;
        let totalStorage = 1000 * selectedTier; // Base storage scales with tier
        const resourceFlow: Record<string, { production: number; consumption: number }> = {};

        // Get current planet for richness values
        const currentPlanet = selectedPlanet ||
            (activeInstance ? planets.find(p => p.id === activeInstance.planetId) : null);

        buildingList.forEach(pb => {
            const building = buildings.find(b => b.id === pb.buildingId);
            if (!building) return;

            totalSlots += building.slots;
            totalPower += building.power;
            totalCrew += building.crew;

            // Add storage from buildings
            if (building.resourceStorage?.capacity) {
                totalStorage += building.resourceStorage.capacity;
            }
            // Also check for storage property (from the new mock data format)
            if ((building as any).storage) {
                totalStorage += (building as any).storage;
            }

            // Track resource production
            if (building.resourceProduction) {
                for (const [resource, rate] of Object.entries(building.resourceProduction)) {
                    if (!resourceFlow[resource]) resourceFlow[resource] = { production: 0, consumption: 0 };
                    resourceFlow[resource].production += rate;
                }
            }

            // Track resource consumption
            if (building.resourceUsage) {
                for (const [resource, rate] of Object.entries(building.resourceUsage)) {
                    if (!resourceFlow[resource]) resourceFlow[resource] = { production: 0, consumption: 0 };
                    resourceFlow[resource].consumption += rate;
                }
            }

            // Track extraction with actual planet richness
            if (building.extractionRate && currentPlanet) {
                for (const [resource, rate] of Object.entries(building.extractionRate)) {
                    const richness = currentPlanet.richness?.[resource] || 1.0;
                    if (currentPlanet.resources?.includes(resource)) {
                        if (!resourceFlow[resource]) resourceFlow[resource] = { production: 0, consumption: 0 };
                        resourceFlow[resource].production += rate * richness;
                    }
                }
            }
        });

        const maxSlots = selectedTier * 100; // Demo: T1=100, T2=200, T3=300, T4=400, T5=500

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
            totalCrew,
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
            showNotification('error', `Cannot place Tier ${selectedTier} claim stake with Starbase Level ${sharedState.starbaseLevel}`);
            return;
        }

        const newInstance: ClaimStakeInstance = {
            id: `cs_${Date.now()}`,
            planetId: selectedPlanet.id,
            tier: selectedTier,
            buildings: [],
            resources: {
                'cargo-fuel': 100, // Start with some fuel
            },
            isFinalized: false,
            rent: 0, // Placeholder, will be calculated
            lastUpdate: Date.now(),
            maxStorage: 1000 * selectedTier, // Base storage scales with tier
            currentStorage: 100, // Just the initial fuel
            maxSlots: selectedTier * 100 // Demo: 5x slots - Max slots scales with tier
        };

        setClaimStakeInstances([...claimStakeInstances, newInstance]);
        setActiveInstanceId(newInstance.id);
        setDesignMode(true);

        // Automatically add the planet-specific central hub at the appropriate tier
        const centralHub = buildings.find(b =>
            b.upgradeFamily === 'central-hub' &&
            b.tier === 1 && // Start with T1
            b.id.includes(selectedPlanet?.id || '') // Planet-specific
        );

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

        // Achievements
        if (claimStakeInstances.length === 0) {
            unlockAchievement('first_claim_stake');
        }
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

        // Calculate construction cost only for NEW buildings
        const totalCost: Record<string, number> = {};
        newBuildings.forEach((pb: PlacedBuilding) => {
            const building = buildings.find((b: Building) => b.id === pb.buildingId);
            if (building?.constructionCost) {
                Object.entries(building.constructionCost).forEach(([material, amount]) => {
                    totalCost[material] = (totalCost[material] || 0) + amount;
                });
            }
        });

        // Deduct from starbase inventory (only for new buildings)
        if (Object.keys(totalCost).length > 0) {
            const success = consumeFromInventory(totalCost);
            if (!success) {
                alert('Insufficient materials in starbase inventory!');
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
                if (!finalizedInstance.resources['cargo-fuel']) {
                    finalizedInstance.resources['cargo-fuel'] = 10; // Start with 10 fuel
                }

                return finalizedInstance;
            }
            return instance;
        }));

        setDesignMode(false);
        setCurrentDesign([]); // Clear the design after finalizing

        // Achievement (only on first finalization)
        if (!activeInstance.isFinalized && sharedState.achievements['first_stake_finalized'] === false) {
            unlockAchievement('first_stake_finalized');
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
            const planetTags = selectedPlanet?.tags || [];

            // Collect tags provided by existing buildings
            const buildingProvidedTags = new Set<string>();
            const currentBuildings = designMode ? currentDesign : (activeInstance?.buildings || []);
            currentBuildings.forEach(pb => {
                const placedBuilding = buildings.find(b => b.id === pb.buildingId);
                if (placedBuilding?.providedTags) {
                    placedBuilding.providedTags.forEach(tag => buildingProvidedTags.add(tag));
                }
            });

            // Combine planet tags and building-provided tags
            const allAvailableTags = [...planetTags, ...Array.from(buildingProvidedTags)];

            const hasRequiredTags = building.requiredTags.every(tag => allAvailableTags.includes(tag));
            if (!hasRequiredTags) {

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
            if (fuelNeeded && (instance.resources['cargo-fuel'] || 0) < 1) {
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

            // Process extraction rates - show both actual and potential
            if (building.extractionRate) {
                Object.entries(building.extractionRate).forEach(([resource, rate]) => {
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

                    const richness = planet?.richness?.[resource] || 1;
                    const potentialRate = rate * richness;
                    flows[resource].potentialExtraction! += potentialRate;

                    if (pb.isActive) {
                        flows[resource].extraction += potentialRate;
                    }
                });
            }

            // Process production rates - show both actual and potential
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

            // Process consumption rates
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
    };

    // Add magic resources - includes all extractable resources from mockData.json
    const handleMagicResources = (stakeId: string) => {
        setClaimStakeInstances(prev => prev.map(instance => {
            if (instance.id === stakeId) {
                const updatedResources = { ...instance.resources };

                // Add fuel for operations (main need)
                updatedResources['cargo-fuel'] = (updatedResources['cargo-fuel'] || 0) + 100;

                // Add all extractable raw resources from mockData.json (with cargo- prefix to match recipes)
                const extractableResources = [
                    'cargo-iron-ore', 'cargo-copper-ore', 'cargo-aluminum-ore', 'cargo-titanium-ore',
                    'cargo-silica', 'cargo-carbon', 'cargo-hydrogen', 'cargo-coal',
                    'cargo-chromite-ore', 'cargo-osmium-ore', 'cargo-tritium-ore',
                    'cargo-arco', 'cargo-lumanite'
                ];

                extractableResources.forEach(resource => {
                    updatedResources[resource] = (updatedResources[resource] || 0) + 50;
                });

                // Add some processed resources for testing (with cargo- prefix to match recipes)
                updatedResources['cargo-steel'] = (updatedResources['cargo-steel'] || 0) + 25;
                updatedResources['cargo-electronics'] = (updatedResources['cargo-electronics'] || 0) + 25;

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
                                                {planet.resources?.slice(0, 3).map(resource => (
                                                    <span key={resource} className="resource-badge">
                                                        {resource}
                                                    </span>
                                                ))}
                                                {planet.resources && planet.resources.length > 3 && (
                                                    <span className="resource-badge">+{planet.resources.length - 3}</span>
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
                                                            const resourceName = resource.replace('cargo-', '').replace(/-/g, ' ');
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

                                                // Check if we have enough slots
                                                const slotIncrease = nextTier.slots - building.slots;
                                                const maxSlots = selectedTier * 100; // Demo: 5x slots
                                                const currentSlots = currentStats.totalSlots;

                                                return (currentSlots + slotIncrease) <= maxSlots;
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
                                                    crewIncrease: nextTier.crew - building.crew
                                                };
                                            };

                                            const upgradeInfo = getUpgradeInfo();



                                            return (
                                                <div key={pb.id} className={`placed-building-card ${!pb.isActive ? 'inactive' : ''} tier-${building.tier}`}>
                                                    <div className="building-header">
                                                        <span className="building-icon">
                                                            {building.category === 'extraction' ? '⛏️' :
                                                                building.category === 'processing' ? '🏭' :
                                                                    building.category === 'power' ? '⚡' :
                                                                        building.category === 'storage' ? '📦' :
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
                                                        <span title="Crew required">👥 {building.crew}</span>
                                                    </div>

                                                    {/* Production/Consumption Info */}
                                                    {(building.extractionRate || building.resourceProduction || building.resourceUsage) && (
                                                        <div className="resource-info">
                                                            {building.extractionRate && (
                                                                <div className="extraction-info">
                                                                    <strong>Extracts:</strong>
                                                                    {Object.entries(building.extractionRate).map(([res, rate]) => {
                                                                        const planet = planets.find((p: Planet) => p.id === activeInstance?.planetId);
                                                                        const richness = planet?.richness?.[res] || 1.0;
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
                                                                    <span>+{upgradeInfo.crewIncrease} crew</span>
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
                                                                    (activeInstance?.resources['cargo-fuel'] || 0) <= 0
                                                                        ? "Central hub needs fuel to operate"
                                                                        : currentStats.totalPower < 0
                                                                            ? "Power deficit - add generators"
                                                                            : "Building stopped"
                                                            }
                                                        >
                                                            <span className="status-dot status-inactive"></span>
                                                            <span className="status-text">
                                                                {pb.stopReason ? pb.stopReason :
                                                                    (activeInstance?.resources['cargo-fuel'] || 0) <= 0 ? "No Fuel" :
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
                                                        {/* Building-provided tags */}
                                                        {(() => {
                                                            const providedTags = new Set<string>();
                                                            currentDesign.forEach(pb => {
                                                                const building = buildings.find(b => b.id === pb.buildingId);
                                                                building?.providedTags?.forEach(tag => providedTags.add(tag));
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
                                                                                building.category === 'storage' ? '📦' : '🏗️'}
                                                                </div>
                                                                <h5>{buildingNameWithoutDuplicateTier(building)} T{building.tier}</h5>
                                                            </div>
                                                            <div className="building-requirements">
                                                                <span title="Slots">📦 {building.slots}</span>
                                                                <span title="Power" className={building.power > 0 ? 'positive' : 'negative'}>
                                                                    ⚡ {building.power > 0 ? '+' : ''}{building.power}
                                                                </span>
                                                                <span title="Crew">👥 {building.crew}</span>
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
                                                                                {res.replace('cargo-', '').replace(/-/g, ' ')}: {amt.toLocaleString()}
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
                                                const cleanResource = resource.replace(/^cargo-/, '');
                                                const displayName = cleanResource
                                                    .split('-')
                                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                                    .join(' ');

                                                return (
                                                    <div key={resource} className="resource-item">
                                                        <span className="resource-name">{displayName}</span>
                                                        <span className="resource-amount">{amount.toFixed(1)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <button className="btn btn-secondary" onClick={() => {
                                            // Magic resources
                                            setClaimStakeInstances(prev => prev.map(instance =>
                                                instance.id === activeInstanceId
                                                    ? {
                                                        ...instance,
                                                        resources: {
                                                            ...instance.resources,
                                                            'cargo-fuel': (instance.resources['cargo-fuel'] || 0) + 100,
                                                            'cargo-iron-ore': (instance.resources['cargo-iron-ore'] || 0) + 100,
                                                            'cargo-copper-ore': (instance.resources['cargo-copper-ore'] || 0) + 100
                                                        }
                                                    }
                                                    : instance
                                            ));
                                        }}>
                                            🪄 Add Magic Resources
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
                                        <div className="planet-surface" data-type={selectedPlanet.type.toLowerCase()}></div>
                                        <div className="planet-atmosphere"></div>
                                    </div>
                                    <div className="planet-glow"></div>
                                </div>
                                <div className="planet-title-section">
                                    <h1 className="planet-name">{selectedPlanet.name}</h1>
                                    <div className="planet-subtitle">
                                        <span className={`faction-indicator faction-${selectedPlanet.faction.toLowerCase()}`}>
                                            {selectedPlanet.faction}
                                        </span>
                                        <span className="separator">•</span>
                                        <span className="planet-type">{selectedPlanet.type}</span>
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
                                                <span className={`detail-value faction-${selectedPlanet.faction.toLowerCase()}`}>
                                                    {selectedPlanet.faction}
                                                </span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="detail-label">Environment Type</span>
                                                <span className="detail-value">{selectedPlanet.type}</span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="detail-label">Daily Rent</span>
                                                <span className="detail-value rent-cost">
                                                    <span className="atlas-icon">💎</span>
                                                    {selectedPlanet.rentCost} ATLAS
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
                                                {selectedPlanet.resources && selectedPlanet.resources.length > 0 ? (
                                                    selectedPlanet.resources.map(resource => {
                                                        const displayName = resource.replace('cargo-', '').replace(/-/g, ' ');
                                                        const resourceType = resource.includes('ore') ? 'ore' :
                                                            resource.includes('arco') || resource.includes('lumanite') ? 'rare' :
                                                                'common';
                                                        return (
                                                            <div key={resource} className={`resource-list-item ${resourceType}`}>
                                                                <div className="resource-icon">
                                                                    {resourceType === 'ore' ? '🪨' :
                                                                        resourceType === 'rare' ? '💠' : '📦'}
                                                                </div>
                                                                <span className="resource-name">
                                                                    {displayName}
                                                                </span>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <p className="no-resources">No resources data available</p>
                                                )}
                                            </div>
                                            <div className="resource-summary">
                                                <p className="summary-text">
                                                    {selectedPlanet.resources?.length || 0} resources available
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
                                                        <span className="slots">{tier * 100} slots</span>
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
                                            <strong>{selectedTier * 100} slots</strong>
                                        </div>
                                        <div className="summary-row">
                                            <span>Storage Capacity</span>
                                            <strong>{selectedTier * 1000} units</strong>
                                        </div>
                                        <div className="summary-row total">
                                            <span>Daily Rent</span>
                                            <strong className="rent-cost">
                                                <span className="atlas-icon">💎</span>
                                                {selectedPlanet.rentCost} ATLAS
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
                        let totalCrew = 0;
                        const totalCost: Record<string, number> = {};
                        let hasAllResources = true;
                        const missingResources: Record<string, { needed: number; available: number }> = {};

                        placedBuildings.forEach((pb: PlacedBuilding) => {
                            // Use the processed buildings array which includes planet-specific variants
                            const building = buildings.find((b: Building) => b.id === pb.buildingId);
                            if (building) {
                                totalSlots += building.slots || 0;
                                totalPower += building.power || 0;
                                totalCrew += building.crew || 0;

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
                                        <span className={totalCrew > 100 ? 'warning' : 'neutral'}>
                                            {totalCrew}
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
                                                const cleanResource = resource.replace(/^cargo-/, '');
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
                                const cleanResource = resource.replace(/^cargo-/, '');
                                const displayName = cleanResource
                                    .split('-')
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(' ');

                                return (
                                    <div key={resource} className="flow-item">
                                        <span className="resource-name">{displayName}</span>
                                        <div className="flow-values">
                                            <span className="production">+{flow.production.toFixed(1)}/s</span>
                                            <span className="consumption">-{flow.consumption.toFixed(1)}/s</span>
                                            <span className={`net ${net >= 0 ? 'positive' : 'negative'}`}>
                                                {net >= 0 ? '+' : ''}{net.toFixed(1)}/s
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
                                    const cleanResource = resource.replace(/^cargo-/, '');
                                    const displayName = cleanResource
                                        .split('-')
                                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                        .join(' ');

                                    return (
                                        <div key={resource} className="aggregate-item">
                                            <span>{displayName}</span>
                                            <span className={net >= 0 ? 'positive' : 'negative'}>
                                                {net >= 0 ? '+' : ''}{net.toFixed(1)}/s
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
                                🛑 Buildings stopped - {(activeInstance.resources['cargo-fuel'] || 0) <= 0 ? 'add fuel' : currentStats.totalPower < 0 ? 'fix power' : 'check resources'}
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
                        {activeInstance && (activeInstance.resources['cargo-fuel'] || 0) <= 0 && (
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
                    onMagicResources={handleMagicResources}
                />
            )}
        </div>
    );
} 