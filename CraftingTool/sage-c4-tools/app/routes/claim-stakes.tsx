import React, { useState, useEffect, useRef } from 'react';
import { Navigation } from '../components/Navigation';
import { StarbaseControl } from '../components/StarbaseControl';
import { useGameData } from '../contexts/DataContext';
import { useSharedState, canPlaceClaimStake } from '../contexts/SharedStateContext';
import { ResourceManager } from '../components/ResourceManager';

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
    constructionTime: number;
    constructionCost: Record<string, number>;
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
}

interface ClaimStakeInstance {
    id: string;
    planetId: string;
    tier: number;
    buildings: PlacedBuilding[];
    isFinalized: boolean;
    rentPaidUntil: number;
    resources: Record<string, number>;
    lastUpdate: number;
    maxStorage: number;
    currentStorage: number;
}

interface PlacedBuilding {
    id: string;
    buildingId: string;
    constructionStarted?: number;
    constructionComplete?: number;
    isActive: boolean;
    inactiveSince?: number; // Track when building became inactive
}

export default function ClaimStakes() {
    const { gameData, loading } = useGameData();
    const { state: sharedState, updateStatistic, unlockAchievement, addToInventory, consumeFromInventory } = useSharedState();

    // Get notification function from parent
    const showNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
        // For now, use console log. In a real app, this would come from a parent component
        console.log(`[${type.toUpperCase()}] ${message}`);
    };

    // State
    const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
    const [selectedTier, setSelectedTier] = useState(1);
    const [claimStakeInstances, setClaimStakeInstances] = useState<ClaimStakeInstance[]>(() => {
        // Load claim stakes from localStorage on mount
        const saved = localStorage.getItem('claimStakeInstances');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load claim stakes:', e);
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

    // Get active instance
    const activeInstance = claimStakeInstances.find(i => i.id === activeInstanceId);

    // Cast data with proper types
    const planets = (gameData?.planets || []) as Planet[];
    const buildings = (gameData?.buildings || []) as Building[];

    // Filter available tiers based on starbase level
    const availableTiers = [1, 2, 3, 4, 5].filter(tier =>
        canPlaceClaimStake(sharedState.starbaseLevel, tier)
    );

    // Save claim stakes to localStorage when they change
    useEffect(() => {
        localStorage.setItem('claimStakeInstances', JSON.stringify(claimStakeInstances));
    }, [claimStakeInstances]);

    // Start real-time simulation
    useEffect(() => {
        if (claimStakeInstances.length > 0) {
            simulationRef.current = setInterval(() => {
                setClaimStakeInstances(prev => prev.map(instance => {
                    if (!instance.isFinalized) {
                        return instance;
                    }

                    const now = Date.now();
                    const deltaTime = (now - instance.lastUpdate) / 1000; // seconds

                    // Calculate resource production/consumption
                    const newResources = { ...instance.resources };
                    let allBuildingsActive = true;

                    // Calculate total storage capacity
                    let maxStorage = 1000 * instance.tier; // Base storage
                    instance.buildings.forEach(pb => {
                        const building = buildings.find(b => b.id === pb.buildingId);
                        if (building?.resourceStorage?.capacity) {
                            maxStorage += building.resourceStorage.capacity;
                        }
                    });

                    // Calculate current storage used
                    let currentStorage = 0;
                    for (const amount of Object.values(newResources)) {
                        currentStorage += amount;
                    }

                    // First pass: check if we have required resources
                    instance.buildings.forEach(pb => {
                        const building = buildings.find(b => b.id === pb.buildingId);
                        if (!building || !pb.isActive) return;

                        // Check resource requirements
                        if (building.resourceUsage) {
                            for (const [resource, rate] of Object.entries(building.resourceUsage)) {
                                const required = rate * deltaTime;
                                if ((newResources[resource] || 0) < required) {
                                    allBuildingsActive = false;
                                }
                            }
                        }
                    });

                    // Check fuel for central hub
                    const centralHub = instance.buildings.find(pb => {
                        const b = buildings.find(b => b.id === pb.buildingId);
                        return b?.name.includes('Central Hub');
                    });

                    if (centralHub && (newResources.fuel || 0) <= 0) {
                        allBuildingsActive = false;
                    }

                    // Second pass: produce/consume resources if everything is running
                    if (allBuildingsActive) {
                        instance.buildings.forEach(pb => {
                            const building = buildings.find(b => b.id === pb.buildingId);
                            if (!building || !pb.isActive) return;

                            // Consume resources
                            if (building.resourceUsage) {
                                for (const [resource, rate] of Object.entries(building.resourceUsage)) {
                                    const consumed = rate * deltaTime;
                                    const oldAmount = newResources[resource] || 0;
                                    newResources[resource] = oldAmount - consumed;

                                    if (consumed > 0.1) {
                                        console.log(`⚡ Consumed ${consumed.toFixed(2)} ${resource} (${oldAmount.toFixed(2)} → ${newResources[resource].toFixed(2)})`);
                                    }
                                }
                            }

                            // Produce resources (check storage capacity)
                            if (building.resourceProduction) {
                                for (const [resource, rate] of Object.entries(building.resourceProduction)) {
                                    const produced = rate * deltaTime;
                                    const oldAmount = newResources[resource] || 0;

                                    // Check if adding this would exceed storage
                                    const newTotal = currentStorage - oldAmount + oldAmount + produced;
                                    if (newTotal <= maxStorage) {
                                        newResources[resource] = oldAmount + produced;
                                        currentStorage += produced;

                                        if (produced > 0.1) {
                                            console.log(`🏭 Produced ${produced.toFixed(2)} ${resource} (${oldAmount.toFixed(2)} → ${newResources[resource].toFixed(2)})`);
                                        }
                                    } else {
                                        console.log(`📦 Storage full! Cannot produce ${resource}`);
                                    }
                                }
                            }

                            // Extract resources (affected by planet richness and storage capacity)
                            if (building.extractionRate) {
                                const planet = planets.find(p => p.id === instance.planetId);

                                for (const [resource, rate] of Object.entries(building.extractionRate)) {
                                    const richness = planet?.richness?.[resource] || 1.0;
                                    if (planet?.resources?.includes(resource)) {
                                        const extracted = rate * richness * deltaTime;
                                        const oldAmount = newResources[resource] || 0;

                                        // Check if adding this would exceed storage
                                        const newTotal = currentStorage - oldAmount + oldAmount + extracted;
                                        if (newTotal <= maxStorage) {
                                            newResources[resource] = oldAmount + extracted;
                                            currentStorage += extracted;

                                            // Log significant resource changes
                                            if (extracted > 0.1) {
                                                console.log(`✅ Extracted ${extracted.toFixed(2)} ${resource} (${oldAmount.toFixed(2)} → ${newResources[resource].toFixed(2)})`);
                                            }
                                        } else {
                                            console.log(`📦 Storage full! Cannot extract ${resource}`);
                                        }
                                    }
                                }
                            }
                        });
                    }

                    // Update active state for all buildings
                    const updatedBuildings = instance.buildings.map(pb => {
                        const wasActive = pb.isActive;
                        const isNowActive = allBuildingsActive;

                        return {
                            ...pb,
                            isActive: isNowActive,
                            // Track when building became inactive
                            inactiveSince: !isNowActive && wasActive ? Date.now() :
                                isNowActive ? undefined :
                                    pb.inactiveSince
                        };
                    });

                    // Recalculate current storage
                    let finalStorage = 0;
                    for (const amount of Object.values(newResources)) {
                        finalStorage += amount;
                    }

                    return {
                        ...instance,
                        resources: newResources,
                        buildings: updatedBuildings,
                        lastUpdate: now,
                        maxStorage: maxStorage,
                        currentStorage: finalStorage
                    };
                }));
            }, 1000); // Update every second
        }

        return () => {
            if (simulationRef.current) {
                clearInterval(simulationRef.current);
            }
        };
    }, [claimStakeInstances.length, buildings, planets]);

    // Calculate stats for current design or active instance
    const calculateStats = (buildingList: PlacedBuilding[]) => {
        let totalSlots = 0;
        let totalPower = 0;
        let totalCrew = 0;
        const resourceFlow: Record<string, { production: number; consumption: number }> = {};

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

            // Track extraction
            if (building.extractionRate) {
                const richness = 1.5; // Mock richness
                for (const [resource, rate] of Object.entries(building.extractionRate)) {
                    if (!resourceFlow[resource]) resourceFlow[resource] = { production: 0, consumption: 0 };
                    resourceFlow[resource].production += rate * richness;
                }
            }
        });

        const maxSlots = selectedTier * 20; // Mock: T1=20, T2=40, etc.

        return {
            totalSlots,
            maxSlots,
            totalPower,
            totalCrew,
            resourceFlow,
            efficiency: totalSlots > 0 ? Math.min(100, (totalPower >= 0 ? 100 : 50)) : 0
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
            isFinalized: false,
            rentPaidUntil: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
            resources: {
                fuel: 100, // Start with some fuel
            },
            lastUpdate: Date.now(),
            maxStorage: 1000 * selectedTier, // Base storage scales with tier
            currentStorage: 100 // Just the initial fuel
        };

        setClaimStakeInstances([...claimStakeInstances, newInstance]);
        setActiveInstanceId(newInstance.id);
        setDesignMode(true);
        setCurrentDesign([]);

        // Achievements
        if (claimStakeInstances.length === 0) {
            unlockAchievement('first_claim_stake');
        }
        updateStatistic('totalClaimStakes', claimStakeInstances.length + 1);
    };

    // Add building to design
    const addBuilding = (buildingId: string) => {
        const building = buildings.find(b => b.id === buildingId);
        if (!building) return;

        const newPlacedBuilding: PlacedBuilding = {
            id: `pb_${Date.now()}`,
            buildingId,
            isActive: false
        };

        setCurrentDesign([...currentDesign, newPlacedBuilding]);

        if (currentDesign.length === 0) {
            unlockAchievement('first_building_placed');
        }
    };

    // Remove building from design
    const removeBuilding = (placedBuildingId: string) => {
        setCurrentDesign(currentDesign.filter(b => b.id !== placedBuildingId));
    };

    // Finalize design
    const finalizeDesign = () => {
        if (!activeInstance) {
            console.error('No active instance to finalize');
            return;
        }

        console.log(`Finalizing design for claim stake ${activeInstance.id} on planet ${activeInstance.planetId}`);
        console.log('Current design:', currentDesign);

        const now = Date.now();
        const buildingsWithConstruction = currentDesign.map(pb => ({
            ...pb,
            constructionStarted: now,
            constructionComplete: now + 60000, // 1 minute for simulation
            isActive: true
        }));

        const updatedInstance = {
            ...activeInstance,
            buildings: buildingsWithConstruction,
            isFinalized: true
        };

        console.log('Updated instance:', updatedInstance);

        setClaimStakeInstances(prev => {
            const updated = prev.map(instance =>
                instance.id === activeInstanceId ? updatedInstance : instance
            );
            console.log('All claim stake instances after finalization:', updated);
            return updated;
        });

        setDesignMode(false);

        // Update statistics
        updateStatistic('totalClaimStakes', claimStakeInstances.length);
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

        // Check tier requirements
        if (building.tier > selectedTier) return false;

        // Check if slots available
        if (currentStats.totalSlots + building.slots > currentStats.maxSlots) return false;

        // Check required tags
        if (building.requiredTags && building.requiredTags.length > 0) {
            const planetTags = selectedPlanet?.tags || [];
            const hasRequiredTags = building.requiredTags.every(tag => planetTags.includes(tag));
            if (!hasRequiredTags) {
                console.log(`Building ${building.name} requires tags ${building.requiredTags}, planet has ${planetTags}`);
                return false;
            }
        }

        // Check required resources (for extractors)
        if (building.requiredResources && building.requiredResources.length > 0) {
            const planetResources = selectedPlanet?.resources || [];
            const hasRequiredResources = building.requiredResources.every(resource => planetResources.includes(resource));
            if (!hasRequiredResources) {
                console.log(`Building ${building.name} requires resources ${building.requiredResources}, planet has ${planetResources}`);
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

    // Calculate resource flows for a claim stake
    const calculateResourceFlows = (stake: ClaimStakeInstance) => {
        const flows: Record<string, any> = {};

        if (!stake.buildings || !stake.isFinalized) return [];

        // Initialize flows for all resources
        const allResources = new Set<string>();

        stake.buildings.forEach((placedBuilding: PlacedBuilding) => {
            // Get the actual building data
            const building = buildings.find((b: Building) => b.id === placedBuilding.buildingId);
            if (!building) return;

            // Extractors
            if (building.extractionRate) {
                Object.keys(building.extractionRate).forEach(resource => {
                    allResources.add(resource);
                    if (!flows[resource]) {
                        flows[resource] = {
                            resource,
                            extraction: 0,
                            production: 0,
                            consumption: 0,
                            net: 0,
                            storage: stake.resources?.[resource] || 0
                        };
                    }

                    // Apply planet richness multiplier
                    const planet = planets.find((p: Planet) => p.id === stake.planetId);
                    const richness = planet?.richness?.[resource] || 1.0;
                    flows[resource].extraction += (building.extractionRate?.[resource] || 0) * richness;
                });
            }

            // Processors (consume and produce)
            if (building.resourceUsage) {
                Object.entries(building.resourceUsage).forEach(([resource, rate]) => {
                    allResources.add(resource);
                    if (!flows[resource]) {
                        flows[resource] = {
                            resource,
                            extraction: 0,
                            production: 0,
                            consumption: 0,
                            net: 0,
                            storage: stake.resources?.[resource] || 0
                        };
                    }
                    flows[resource].consumption += rate as number;
                });
            }

            if (building.resourceProduction) {
                Object.entries(building.resourceProduction).forEach(([resource, rate]) => {
                    allResources.add(resource);
                    if (!flows[resource]) {
                        flows[resource] = {
                            resource,
                            extraction: 0,
                            production: 0,
                            consumption: 0,
                            net: 0,
                            storage: stake.resources?.[resource] || 0
                        };
                    }
                    flows[resource].production += rate as number;
                });
            }
        });

        // Calculate net flows
        Object.values(flows).forEach((flow: any) => {
            flow.net = flow.extraction + flow.production - flow.consumption;
        });

        return Object.values(flows);
    };

    // Prepare data for ResourceManager
    const claimStakeResources = claimStakeInstances.map(stake => {
        const planet = planets.find((p: Planet) => p.id === stake.planetId);
        const flows = calculateResourceFlows(stake);
        console.log(`Claim stake ${stake.id} flows:`, flows);
        return {
            id: stake.id,
            name: `${planet?.name || 'Unknown'} - T${stake.tier}`,
            planetName: planet?.name || 'Unknown',
            tier: stake.tier,
            flows: flows,
            totalStorage: stake.currentStorage || Object.values(stake.resources || {}).reduce((sum: number, val: any) => sum + val, 0),
            maxStorage: stake.maxStorage
        };
    });
    console.log('All claim stake resources:', claimStakeResources);

    // Handle resource transfers
    const handleResourceTransfer = (from: string, to: string, resources: Record<string, number>) => {
        // Update claim stake resources
        if (from !== 'starbase' && from !== 'all-stakes') {
            setClaimStakeInstances(prev => prev.map(stake => {
                if (stake.id === from) {
                    const updatedResources = { ...stake.resources };
                    Object.entries(resources).forEach(([resource, amount]) => {
                        updatedResources[resource] = Math.max(0, (updatedResources[resource] || 0) - amount);
                    });
                    return { ...stake, resources: updatedResources };
                }
                return stake;
            }));
        }

        if (to !== 'starbase') {
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
            Object.entries(resources).forEach(([resource, amount]) => {
                addToInventory({ [resource]: amount });
            });
            showNotification('Resources transferred to starbase', 'success');
        } else if (from === 'starbase') {
            // Remove resources from starbase
            Object.entries(resources).forEach(([resource, amount]) => {
                consumeFromInventory({ [resource]: amount });
            });
            showNotification('Resources transferred from starbase', 'success');
        }
    };

    // Add magic resources to a claim stake
    const handleMagicResources = (stakeId: string) => {
        setClaimStakeInstances(prev => prev.map(stake => {
            if (stake.id === stakeId) {
                return {
                    ...stake,
                    resources: {
                        ...stake.resources,
                        fuel: (stake.resources?.fuel || 0) + 100,
                        'iron-ore': (stake.resources?.['iron-ore'] || 0) + 100,
                        'copper-ore': (stake.resources?.['copper-ore'] || 0) + 100,
                        hydrogen: (stake.resources?.hydrogen || 0) + 100,
                        coal: (stake.resources?.coal || 0) + 50,
                        silica: (stake.resources?.silica || 0) + 50,
                        steel: (stake.resources?.steel || 0) + 25,
                        electronics: (stake.resources?.electronics || 0) + 25
                    }
                };
            }
            return stake;
        }));

        showNotification('Magic resources added! 🪄', 'success');
    };

    if (loading) {
        return <div className="loading-screen">Loading game data...</div>;
    }

    return (
        <div className="claim-stakes-app">
            <Navigation />

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
                                                console.log('Planet clicked:', planet.id);
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
                                        🏪 {Math.floor(activeInstance?.currentStorage || 0)}/{activeInstance?.maxStorage || 1000}
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

                                            return (
                                                <div key={pb.id} className={`placed-building-card ${!pb.isActive ? 'inactive' : ''}`}>
                                                    <div className="building-header">
                                                        <span className="building-icon">🏭</span>
                                                        <div>
                                                            <h4>{building.name}</h4>
                                                            <span className="building-tier">Tier {building.tier}</span>
                                                        </div>
                                                        {designMode && (
                                                            <button
                                                                className="remove-button"
                                                                onClick={() => removeBuilding(pb.id)}
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="building-stats">
                                                        <span>📦 {building.slots}</span>
                                                        <span>⚡ {building.power}</span>
                                                        <span>👥 {building.crew}</span>
                                                    </div>
                                                    {!designMode && !pb.isActive && pb.inactiveSince && (
                                                        <div className="inactive-indicator" title="Building stopped - check resources/power">
                                                            <span className="status-dot status-inactive"></span>
                                                            <span className="status-text">Inactive</span>
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
                                            <div className="building-grid">
                                                {availableBuildings.map(building => (
                                                    <div
                                                        key={building.id}
                                                        className="building-card"
                                                        onClick={() => addBuilding(building.id)}
                                                    >
                                                        <div className="building-icon">🏭</div>
                                                        <h5>{building.name}</h5>
                                                        <div className="building-requirements">
                                                            <span>📦 {building.slots}</span>
                                                            <span>⚡ {building.power}</span>
                                                            <span>👥 {building.crew}</span>
                                                        </div>
                                                    </div>
                                                ))}
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
                                                        // Deconstruct all buildings (50% refund)
                                                        if (confirm('Deconstruct all buildings? You will receive 50% of construction materials back.')) {
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

                                                                // Add refund to starbase inventory
                                                                if (Object.keys(refundMaterials).length > 0) {
                                                                    addToInventory(refundMaterials);
                                                                    showNotification('Buildings deconstructed. 50% materials refunded to starbase.', 'info');
                                                                }

                                                                // Clear buildings
                                                                setClaimStakeInstances(prev => prev.map(instance =>
                                                                    instance.id === activeInstanceId
                                                                        ? { ...instance, buildings: [], isFinalized: false }
                                                                        : instance
                                                                ));
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

                    {/* Tips */}
                    <div className="tips-section">
                        <h4>💡 Tips</h4>
                        <ul>
                            <li>Keep power balance positive or buildings stop</li>
                            <li>Central hub needs fuel to operate</li>
                            <li>T3+ can build fuel processors for self-sustaining operations</li>
                            <li>Deconstruct buildings to recover 50% of materials</li>
                            <li>Buildings with missing resources will stop production</li>
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