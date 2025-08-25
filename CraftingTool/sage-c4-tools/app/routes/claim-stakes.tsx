import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Navigation } from '../components/Navigation';
import { StarbaseControl } from '../components/StarbaseControl';
import { useGameData } from '../contexts/DataContext';
import { useSharedState, canPlaceClaimStake } from '../contexts/SharedStateContext';
import { ResourceManager } from '../components/ResourceManager';
import { NotificationSystem, useNotifications } from '../components/NotificationSystem';

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
                return parsed;
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

    // Cast data with proper types
    const planets = (gameData?.planets || []) as Planet[];
    const buildings = (gameData?.buildings || []) as Building[];
    const starbaseInventory = sharedState.starbaseInventory;

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
                        return building?.resourceUsage && building.resourceUsage['fuel'] > 0;
                    });

                    if (needsFuel && (newResources['fuel'] || 0) <= 0) {
                        shouldStop = true;
                        stopReason = 'No fuel available';
                    }

                    // Check if storage is too full (95% threshold)
                    if (storageUtilization >= 0.95) {
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
                            stopReason = 'Storage full (95%+)';
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

                            // Process consumption
                            if (building.resourceUsage) {
                                Object.entries(building.resourceUsage).forEach(([resource, rate]) => {
                                    const consumption = rate * deltaTime;
                                    if (newResources[resource] >= consumption) {
                                        newResources[resource] -= consumption;
                                        if (!resourceFlows[resource]) {
                                            resourceFlows[resource] = { production: 0, consumption: 0 };
                                        }
                                        resourceFlows[resource].consumption += rate;
                                    }
                                });
                            }

                            // Process extraction
                            if (building.extractionRate) {
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

                            // Process production
                            if (building.resourceProduction) {
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

        const newInstance: ClaimStakeInstance = {
            id: `cs_${Date.now()}`,
            planetId: selectedPlanet.id,
            tier: selectedTier,
            buildings: [],
            resources: {
                fuel: 100, // Start with some fuel
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

        // Automatically add the central hub at the appropriate tier
        const centralHub = buildings.find(b =>
            b.upgradeFamily === 'central_hub' &&
            b.tier === Math.min(selectedTier, 3) // Central hub maxes out at T3
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

        if (currentSlots + building.slots > activeInstance.maxSlots) {
            alert('Not enough slots available!');
            return;
        }

        // Check if we have construction materials in starbase inventory
        if (building.constructionCost) {
            const missingMaterials: string[] = [];
            Object.entries(building.constructionCost).forEach(([material, amount]) => {
                const available = starbaseInventory[material] || 0;
                if (available < amount) {
                    missingMaterials.push(`${material}: need ${amount}, have ${available}`);
                }
            });

            if (missingMaterials.length > 0) {
                const useMagic = confirm(
                    `Missing construction materials from starbase:\n${missingMaterials.join('\n')}\n\n` +
                    `Would you like to add these materials to starbase inventory? (Simulator feature)`
                );

                if (useMagic) {
                    // Add missing materials to starbase
                    const toAdd: Record<string, number> = {};
                    Object.entries(building.constructionCost).forEach(([material, amount]) => {
                        const available = starbaseInventory[material] || 0;
                        if (available < amount) {
                            toAdd[material] = amount - available;
                        }
                    });
                    addToInventory(toAdd);
                } else {
                    return;
                }
            }
        }

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

        if (activeInstance.isFinalized) {
            return;
        }

        // Consume construction materials from starbase inventory
        const totalCost: Record<string, number> = {};
        currentDesign.forEach((pb: PlacedBuilding) => {
            const building = buildings.find((b: Building) => b.id === pb.buildingId);
            if (building?.constructionCost) {
                Object.entries(building.constructionCost).forEach(([material, amount]) => {
                    totalCost[material] = (totalCost[material] || 0) + amount;
                });
            }
        });

        // Deduct from starbase inventory
        if (Object.keys(totalCost).length > 0) {
            const success = consumeFromInventory(totalCost);
            if (!success) {
                alert('Insufficient materials in starbase inventory!');
                return;
            }
        }

        setClaimStakeInstances(prev => prev.map(instance => {
            if (instance.id === activeInstance.id) {
                const finalizedInstance = {
                    ...instance,
                    isFinalized: true,
                    buildings: currentDesign.map((b: PlacedBuilding) => ({
                        ...b,
                        constructionStarted: Date.now(),
                        constructionComplete: Date.now() + 1000, // 1 second for simulation
                        isActive: true
                    }))
                };

                // Initialize resources with some fuel to start
                if (!finalizedInstance.resources['fuel']) {
                    finalizedInstance.resources['fuel'] = 10; // Start with 10 fuel
                }

                return finalizedInstance;
            }
            return instance;
        }));

        setDesignMode(false);
        setCurrentDesign([]); // Clear the design after finalizing

        // Achievement
        if (sharedState.achievements['first_stake_finalized'] === false) {
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
            if (fuelNeeded && (instance.resources['fuel'] || 0) < 1) {
                reasons.push('No fuel available');
            }

            // Check storage
            const currentStorageUsed = Object.values(instance.resources || {}).reduce((sum: number, val: any) => sum + val, 0);
            if (currentStorageUsed >= instance.maxStorage * 0.95) {
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

    // Add magic resources - focus on operational needs
    const handleMagicResources = (stakeId: string) => {
        setClaimStakeInstances(prev => prev.map(instance => {
            if (instance.id === stakeId) {
                const updatedResources = { ...instance.resources };

                // Add fuel for operations (main need)
                updatedResources['fuel'] = (updatedResources['fuel'] || 0) + 100;

                // Add small amounts of common resources for testing
                updatedResources['iron-ore'] = (updatedResources['iron-ore'] || 0) + 50;
                updatedResources['copper-ore'] = (updatedResources['copper-ore'] || 0) + 50;

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
                        <button
                            className={`tool-button ${showStarbaseControl ? 'active' : ''}`}
                            onClick={() => setShowStarbaseControl(!showStarbaseControl)}
                        >
                            ⚙️ Starbase
                        </button>
                    </div>

                    {showStarbaseControl ? (
                        <StarbaseControl />
                    ) : (
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

                            {/* Tier Selection */}
                            <div className="tier-selector">
                                <h3>Claim Stake Tier</h3>
                                <div className="tier-buttons">
                                    {[1, 2, 3, 4, 5].map(tier => {
                                        const isAvailable = availableTiers.includes(tier);
                                        return (
                                            <button
                                                key={tier}
                                                className={`tier-button ${selectedTier === tier ? 'active' : ''} ${!isAvailable ? 'locked' : ''}`}
                                                onClick={() => isAvailable && setSelectedTier(tier)}
                                                disabled={!isAvailable}
                                                title={!isAvailable ? `Requires Starbase Level ${tier - 1}` : ''}
                                            >
                                                T{tier}
                                            </button>
                                        );
                                    })}
                                </div>
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
                                                setSelectedPlanet(planet);
                                                setActiveInstanceId(null); // Clear active instance to show purchase screen
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
                    )}
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
                                <div className="quick-stats">
                                    <div className={`stat ${currentStats.totalPower >= 0 ? 'stat-good' : 'stat-bad'}`}>
                                        ⚡ {currentStats.totalPower} MW
                                    </div>
                                    <div className="stat">
                                        📦 {currentStats.totalSlots}/{currentStats.maxSlots} slots
                                    </div>
                                    <div className="stat">
                                        👥 {currentStats.totalCrew} crew
                                    </div>
                                    <div className={`stat ${activeInstance?.currentStorage && activeInstance.currentStorage >= activeInstance.maxStorage * 0.9 ? 'stat-warning' : ''}`}>
                                        🏪 {Math.min(Math.floor(activeInstance?.currentStorage || 0), activeInstance?.maxStorage || 1000)}/{activeInstance?.maxStorage || 1000}
                                    </div>
                                    <div className={`stat ${currentStats.efficiency >= 90 ? 'stat-good' : ''}`}>
                                        ⚙️ {currentStats.efficiency.toFixed(0)}% efficiency
                                    </div>
                                </div>
                            </div>

                            {/* Building Management */}
                            <div className="building-management">
                                <div className="buildings-section">
                                    <h3>Buildings</h3>

                                    {designMode && (
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
                                    )}

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
                                                            <h4>{building.name} T{building.tier}</h4>
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
                                                    {!designMode && !pb.isActive && pb.inactiveSince && (
                                                        <div className="inactive-indicator"
                                                            title={
                                                                activeInstance?.resources.fuel <= 0
                                                                    ? "Need 5+ fuel to restart"
                                                                    : currentStats.totalPower < 0
                                                                        ? "Fix power deficit to restart"
                                                                        : "Check resource requirements"
                                                            }
                                                        >
                                                            <span className="status-dot status-inactive"></span>
                                                            <span className="status-text">
                                                                {activeInstance?.resources.fuel <= 0 ? "No Fuel" : "Stopped"}
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

                                            {/* Show available tags */}
                                            <div className="available-tags">
                                                <strong>Available Tags:</strong>
                                                <div className="tag-list">
                                                    {/* Planet tags */}
                                                    {selectedPlanet?.tags?.map(tag => (
                                                        <span key={tag} className="tag planet-tag" title="From planet">
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
                                                            <span key={tag} className="tag building-tag" title="From buildings">
                                                                {tag}
                                                            </span>
                                                        ));
                                                    })()}
                                                </div>
                                                <div className="tag-info">
                                                    💡 Tip: Build <strong>Extraction Hub</strong> to enable extraction modules,
                                                    <strong> Processing Hub</strong> to enable processing modules
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
                                                                <h5>{building.name} T{building.tier}</h5>
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
                                                                    {Object.entries(building.constructionCost).slice(0, 3).map(([res, amt]) => (
                                                                        <span key={res}>{res}: {amt}</span>
                                                                    ))}
                                                                    {Object.keys(building.constructionCost).length > 3 && <span>...</span>}
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
                                        <div className="resource-grid">
                                            {Object.entries(activeInstance.resources).map(([resource, amount]) => (
                                                <div key={resource} className="resource-item">
                                                    <span className="resource-name">{resource}</span>
                                                    <span className="resource-amount">{amount.toFixed(1)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <button className="btn btn-secondary" onClick={() => {
                                            // Magic resources
                                            setClaimStakeInstances(prev => prev.map(instance =>
                                                instance.id === activeInstanceId
                                                    ? {
                                                        ...instance,
                                                        resources: {
                                                            ...instance.resources,
                                                            fuel: (instance.resources.fuel || 0) + 100,
                                                            'iron-ore': (instance.resources['iron-ore'] || 0) + 100,
                                                            'copper-ore': (instance.resources['copper-ore'] || 0) + 100
                                                        }
                                                    }
                                                    : instance
                                            ));
                                        }}>
                                            🪄 Add Magic Resources
                                        </button>
                                    </div>
                                )}

                                {/* Design Cost Summary (in design mode) */}
                                {designMode && currentDesign.length > 0 && (() => {
                                    const totalCost: Record<string, number> = {};
                                    let totalSlots = 0;
                                    let totalPower = 0;
                                    let totalCrew = 0;

                                    currentDesign.forEach(pb => {
                                        const building = buildings.find(b => b.id === pb.buildingId);
                                        if (building) {
                                            totalSlots += building.slots;
                                            totalPower += building.power;
                                            totalCrew += building.crew;

                                            // Accumulate construction costs
                                            if (building.constructionCost) {
                                                Object.entries(building.constructionCost).forEach(([resource, amount]) => {
                                                    totalCost[resource] = (totalCost[resource] || 0) + amount;
                                                });
                                            }
                                        }
                                    });

                                    return (
                                        <div className="design-cost-summary">
                                            <h4>Design Summary</h4>
                                            <div className="design-stats-summary">
                                                <span>📦 {totalSlots}/{selectedTier * 100} slots</span>
                                                <span className={totalPower >= 0 ? 'positive' : 'negative'}>
                                                    ⚡ {totalPower > 0 ? '+' : ''}{totalPower} power
                                                </span>
                                                <span>👥 {totalCrew} crew</span>
                                            </div>
                                            {Object.keys(totalCost).length > 0 && (
                                                <div className="total-construction-cost">
                                                    <strong>Total Construction Cost:</strong>
                                                    <div className="cost-breakdown">
                                                        {Object.entries(totalCost).map(([resource, amount]) => (
                                                            <span key={resource} className="cost-item">
                                                                {resource}: {amount}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Action Buttons */}
                                <div className="action-buttons">
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
                                                disabled={currentDesign.length === 0}
                                            >
                                                Finalize Design
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => {
                                                    setDesignMode(true);
                                                    setCurrentDesign([...activeInstance.buildings]);
                                                }}
                                            >
                                                Redesign
                                            </button>
                                            {activeInstance.buildings.length > 0 && (
                                                <button
                                                    className="btn btn-warning"
                                                    onClick={() => {
                                                        const instance = claimStakeInstances.find(i => i.id === activeInstanceId);
                                                        if (instance) {
                                                            // Calculate 50% refund for all buildings
                                                            const refundMaterials: Record<string, number> = {};
                                                            instance.buildings.forEach(pb => {
                                                                const building = buildings.find(b => b.id === pb.buildingId);
                                                                if (building?.constructionCost) {
                                                                    Object.entries(building.constructionCost).forEach(([material, amount]) => {
                                                                        refundMaterials[material] = (refundMaterials[material] || 0) + Math.floor(amount / 2);
                                                                    });
                                                                }
                                                            });

                                                            // Build confirmation message with refund details
                                                            let confirmMessage = 'Deconstruct all buildings?\n\n';
                                                            if (Object.keys(refundMaterials).length > 0) {
                                                                confirmMessage += 'You will receive (50% refund):\n';
                                                                Object.entries(refundMaterials).forEach(([material, amount]) => {
                                                                    confirmMessage += `• ${amount} ${material}\n`;
                                                                });
                                                            } else {
                                                                confirmMessage += 'No materials will be refunded.';
                                                            }

                                                            if (confirm(confirmMessage)) {
                                                                // Add refund to starbase inventory
                                                                if (Object.keys(refundMaterials).length > 0) {
                                                                    addToInventory(refundMaterials);
                                                                    const refundList = Object.entries(refundMaterials)
                                                                        .map(([mat, amt]) => `${amt} ${mat}`)
                                                                        .join(', ');
                                                                    showNotification(`Buildings deconstructed. Refunded: ${refundList}`, 'info');
                                                                }

                                                                // Clear buildings and reset to design mode
                                                                setClaimStakeInstances(prev => prev.map(instance =>
                                                                    instance.id === activeInstanceId
                                                                        ? { ...instance, buildings: [], isFinalized: false }
                                                                        : instance
                                                                ));
                                                                setDesignMode(true);

                                                                // Re-add central hub at appropriate tier
                                                                const centralHub = buildings.find(b =>
                                                                    b.upgradeFamily === 'central_hub' &&
                                                                    b.tier === Math.min(instance.tier, 3)
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
                                                            }
                                                        }
                                                    }}
                                                >
                                                    Deconstruct All
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : selectedPlanet ? (
                        <div className="planet-details">
                            <h2>{selectedPlanet.name}</h2>
                            <div className="planet-info-grid">
                                <div className="info-section">
                                    <h3>Planet Details</h3>
                                    <p>Faction: {selectedPlanet.faction}</p>
                                    <p>Type: {selectedPlanet.type}</p>
                                    <p>Rent: {selectedPlanet.rentCost} ATLAS/day</p>
                                </div>
                                <div className="info-section">
                                    <h3>Available Resources</h3>
                                    <div className="resource-list">
                                        {selectedPlanet.resources?.map(resource => (
                                            <span key={resource} className="resource-badge large">
                                                {resource}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button
                                className="btn btn-primary"
                                onClick={purchaseClaimStake}
                            >
                                Purchase Tier {selectedTier} Claim Stake
                            </button>
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
                    <h3>Production Overview</h3>

                    {/* Resource Flow */}
                    <div className="resource-flow-section">
                        <h4>Resource Flow</h4>
                        <div className="flow-list">
                            {Object.entries(currentStats.resourceFlow).map(([resource, flow]) => {
                                const net = flow.production - flow.consumption;
                                return (
                                    <div key={resource} className="flow-item">
                                        <span className="resource-name">{resource}</span>
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
                                {Object.entries(aggregateStats()).map(([resource, net]) => (
                                    <div key={resource} className="aggregate-item">
                                        <span>{resource}</span>
                                        <span className={net >= 0 ? 'positive' : 'negative'}>
                                            {net >= 0 ? '+' : ''}{net.toFixed(1)}/s
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Dynamic Tips */}
                    <div className="tips-section">
                        <h4>💡 Tips & Insights</h4>
                        <ul>
                            {/* Critical: Buildings stopped */}
                            {activeInstance && activeInstance.buildings.some(b => !b.isActive) && (
                                <li className="warning critical">
                                    🛑 <strong>Buildings STOPPED!</strong>
                                    {activeInstance.resources.fuel <= 0
                                        ? ' Add at least 5 fuel to restart operations'
                                        : currentStats.totalPower < 0
                                            ? ' Fix power deficit to restart'
                                            : ' Check resource requirements'}
                                </li>
                            )}

                            {currentStats.totalPower < 0 && (
                                <li className="warning">⚠️ Power deficit! Add generators or remove consumers</li>
                            )}
                            {activeInstance && activeInstance.resources.fuel < 10 && activeInstance.resources.fuel > 0 && (
                                <li className="warning">⚠️ Low fuel! Central hub will stop when depleted</li>
                            )}
                            {activeInstance && activeInstance.resources.fuel <= 0 && (
                                <li className="warning critical">🚫 NO FUEL! Need 5+ fuel to restart operations</li>
                            )}
                            {currentStats.efficiency < 50 && (
                                <li>📉 Low efficiency - check power and resource balance</li>
                            )}
                            {Object.values(currentStats.resourceFlow).some(f => f.consumption > f.production) && (
                                <li>⚖️ Some resources have negative flow - production chain may stop</li>
                            )}
                            {activeInstance && activeInstance.currentStorage / activeInstance.maxStorage > 0.8 && (
                                <li className="warning">📦 Storage nearly full ({Math.floor((activeInstance.currentStorage / activeInstance.maxStorage) * 100)}%)</li>
                            )}
                            <li>💰 Deconstruct buildings to recover 50% of materials</li>
                            {selectedTier >= 3 && (
                                <li>🔋 T3+ can build fuel processors for self-sustaining operations</li>
                            )}
                        </ul>
                    </div>
                </aside>
            </div>

            {/* Add Resource Manager - Always show if there are claim stakes */}
            {claimStakeInstances.length > 0 && (
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