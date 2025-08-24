import React, { useState, useEffect, useRef } from 'react';
import { Navigation } from '../components/Navigation';
import { useGameData } from '../contexts/DataContext';
import { useSharedState, STARBASE_LEVELS, getAvailableHabPlots } from '../contexts/SharedStateContext';
import { NotificationSystem, useNotifications } from '../components/NotificationSystem';

// Type definitions
interface Starbase {
    id: string;
    name: string;
    faction: string;
    level: number;
    inventory: Record<string, number>;
}

interface HabPlot {
    id: string;
    starbaseId: string;
    tier: number;
    rentCost: number;
    isRented: boolean;
    habDesign?: HabDesign;
}

interface HabDesign {
    habTier: number;
    buildings: PlacedHabBuilding[];
    totalSlots: number;
    craftingSpeed: number;
    storageBonus: number;
    unlockedRecipes: string[];
}

interface PlacedHabBuilding {
    id: string;
    buildingId: string;
    type: 'hab' | 'crafting-station' | 'cargo-storage' | 'landing-pad' | 'decorative';
    size?: string; // XXS, XS, S, M
}

interface CraftingJob {
    id: string;
    recipeId: string;
    habPlotId: string;
    quantity: number;
    progress: number;
    totalTime: number;
    startTime: number;
    crewAssigned: number;
    status: 'active' | 'paused' | 'completed' | 'queued';
    priority?: 'low' | 'normal' | 'high';
    completedAt?: number;
    output?: {
        resource: string;
        quantity: number;
    };
}

interface Recipe {
    id: string;
    name: string;
    type: string;
    tier: number;
    constructionTime: number;
    ingredients: { resource: string; quantity: number }[];
    output: { resource: string; quantity: number };
}

export default function CraftingHab() {
    const { gameData, loading } = useGameData();
    const { state: sharedState, dispatch, updateStatistic, unlockAchievement, addToInventory, consumeFromInventory } = useSharedState();
    const { notifications, showNotification, dismissNotification } = useNotifications();

    // State
    const [selectedStarbase, setSelectedStarbase] = useState<Starbase | null>(null);
    const [habPlots, setHabPlots] = useState<HabPlot[]>([]);
    const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
    const [designMode, setDesignMode] = useState(false);
    const [currentDesign, setCurrentDesign] = useState<PlacedHabBuilding[]>([]);
    const [craftingJobs, setCraftingJobs] = useState<CraftingJob[]>([]);
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [craftQuantity, setCraftQuantity] = useState(1);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [plotTierFilter, setPlotTierFilter] = useState<number | null>(null); // Add tier filter

    // Real-time job simulation
    const simulationRef = useRef<NodeJS.Timeout | null>(null);

    // Load state from SharedState on mount
    useEffect(() => {
        if (sharedState.craftingHabState) {
            const { habPlots: savedPlots, craftingJobs: savedJobs, selectedStarbaseId, selectedPlotId: savedPlotId } = sharedState.craftingHabState;
            if (savedPlots) setHabPlots(savedPlots);
            if (savedJobs) setCraftingJobs(savedJobs);
            if (selectedStarbaseId) {
                const starbase = starbases.find(sb => sb.id === selectedStarbaseId);
                if (starbase) setSelectedStarbase(starbase);
            }
            if (savedPlotId) setSelectedPlotId(savedPlotId);
        }
    }, []);

    // Save state to SharedState whenever it changes
    useEffect(() => {
        dispatch({
            type: 'UPDATE_CRAFTING_HAB_STATE',
            payload: {
                habPlots,
                craftingJobs,
                selectedStarbaseId: selectedStarbase?.id,
                selectedPlotId: selectedPlotId || undefined
            }
        });
    }, [habPlots, craftingJobs, selectedStarbase, selectedPlotId, dispatch]);

    // Process items from the shared crafting queue
    useEffect(() => {
        if (sharedState.craftingQueue && sharedState.craftingQueue.length > 0) {
            // Find items in queue that can be processed
            const processableItems = sharedState.craftingQueue.filter((item: any) => {
                // Check if this item is assigned to a hab plot
                if (item.habPlotId) {
                    const plot = habPlots.find(p => p.id === item.habPlotId);
                    if (plot?.habDesign) {
                        // Check if this plot has capacity
                        const plotJobs = craftingJobs.filter(j => j.habPlotId === plot.id && j.status !== 'completed');
                        const maxJobs = plot.habDesign.totalSlots || 5;
                        return plotJobs.length < maxJobs;
                    }
                }
                return false;
            });

            // Process each item
            processableItems.forEach((item: any) => {
                // Create a job from the queue item
                const plot = habPlots.find(p => p.id === item.habPlotId);
                if (plot?.habDesign) {
                    const newJob: CraftingJob = {
                        id: item.id || `job_${Date.now()}`,
                        recipeId: item.recipeId,
                        habPlotId: plot.id,
                        quantity: item.quantity,
                        progress: 0,
                        totalTime: (item.totalTime || 60) / (plot.habDesign.craftingSpeed || 1),
                        startTime: Date.now(),
                        crewAssigned: 10,
                        status: 'queued',
                        priority: item.priority || 'normal',
                        output: {
                            resource: item.recipe?.output?.resource || 'unknown',
                            quantity: item.recipe?.output?.quantity || 1
                        }
                    };

                    setCraftingJobs(prev => [...prev, newJob]);

                    // Remove from queue
                    dispatch({
                        type: 'UPDATE_CRAFTING_QUEUE',
                        payload: (sharedState.craftingQueue || []).filter((q: any) => q.id !== item.id)
                    });
                }
            });
        }
    }, [sharedState.craftingQueue, habPlots, craftingJobs]);

    // Mock data - in real app would come from gameData
    const starbases: Starbase[] = [
        {
            id: 'sb_001',
            name: 'Unity Station',
            faction: 'MUD',
            level: sharedState.starbaseLevel,
            inventory: sharedState.starbaseInventory
        },
        { id: 'sb_002', name: 'Phoenix Hub', faction: 'ONI', level: sharedState.starbaseLevel, inventory: sharedState.starbaseInventory },
        { id: 'sb_003', name: 'Liberty Complex', faction: 'UST', level: sharedState.starbaseLevel, inventory: sharedState.starbaseInventory }
    ];

    const recipes: Recipe[] = gameData?.recipes || [
        {
            id: 'comp_001',
            name: 'Iron Plate',
            type: 'component',
            tier: 1,
            constructionTime: 60,
            ingredients: [
                { resource: 'iron-ore', quantity: 10 },
                { resource: 'fuel', quantity: 2 }
            ],
            output: { resource: 'iron-plate', quantity: 5 }
        },
        {
            id: 'comp_002',
            name: 'Circuit Board',
            type: 'component',
            tier: 2,
            constructionTime: 120,
            ingredients: [
                { resource: 'copper', quantity: 5 },
                { resource: 'silica', quantity: 3 }
            ],
            output: { resource: 'circuit-board', quantity: 2 }
        }
    ];

    const habBuildings = (gameData as any)?.habBuildings || {
        habs: [
            { id: 'hab-t1', name: 'Hab T1', tier: 1, slots: 10, constructionCost: { steel: 20, electronics: 10 } },
            { id: 'hab-t2', name: 'Hab T2', tier: 2, slots: 15, constructionCost: { steel: 40, electronics: 20, copper: 15 } },
            { id: 'hab-t3', name: 'Hab T3', tier: 3, slots: 20, constructionCost: { steel: 80, electronics: 40, copper: 30 } },
            { id: 'hab-t4', name: 'Hab T4', tier: 4, slots: 25, constructionCost: { steel: 160, electronics: 80, copper: 60, titanium: 20 } },
            { id: 'hab-t5', name: 'Hab T5', tier: 5, slots: 30, constructionCost: { steel: 320, electronics: 160, copper: 120, titanium: 50 } }
        ],
        craftingStations: [
            { id: 'craft-xxs', name: 'Crafting Station XXS', size: 'XXS', speedBonus: 1.0, jobSlots: 1, constructionCost: { steel: 10, electronics: 5 } },
            { id: 'craft-xs', name: 'Crafting Station XS', size: 'XS', speedBonus: 1.1, jobSlots: 2, constructionCost: { steel: 20, electronics: 10 } },
            { id: 'craft-s', name: 'Crafting Station S', size: 'S', speedBonus: 1.2, jobSlots: 3, constructionCost: { steel: 40, electronics: 20, copper: 10 } },
            { id: 'craft-m', name: 'Crafting Station M', size: 'M', speedBonus: 1.3, jobSlots: 5, constructionCost: { steel: 80, electronics: 40, copper: 20 } }
        ],
        cargoStorage: [
            { id: 'cargo-t1', name: 'Cargo Storage T1', tier: 1, storageBonus: 100, jobSlots: 1, constructionCost: { steel: 15, copper: 10 } },
            { id: 'cargo-t2', name: 'Cargo Storage T2', tier: 2, storageBonus: 200, jobSlots: 2, constructionCost: { steel: 30, copper: 20 } },
            { id: 'cargo-t3', name: 'Cargo Storage T3', tier: 3, storageBonus: 400, jobSlots: 3, constructionCost: { steel: 60, copper: 40, electronics: 10 } },
            { id: 'cargo-t4', name: 'Cargo Storage T4', tier: 4, storageBonus: 800, jobSlots: 4, constructionCost: { steel: 120, copper: 80, electronics: 20 } },
            { id: 'cargo-t5', name: 'Cargo Storage T5', tier: 5, storageBonus: 1600, jobSlots: 5, constructionCost: { steel: 240, copper: 160, electronics: 40 } }
        ]
    };

    // Get selected plot
    const selectedPlot = habPlots.find(p => p.id === selectedPlotId);

    // Initialize hab plots based on starbase
    useEffect(() => {
        if (selectedStarbase) {
            const levelData = STARBASE_LEVELS[selectedStarbase.level as keyof typeof STARBASE_LEVELS];
            const plots: HabPlot[] = [];

            // Generate plots based on starbase level
            Object.entries(levelData.habPlotsByTier).forEach(([tier, count]) => {
                for (let i = 0; i < count; i++) {
                    plots.push({
                        id: `plot_${selectedStarbase.id}_t${tier}_${i}`,
                        starbaseId: selectedStarbase.id,
                        tier: parseInt(tier),
                        rentCost: parseInt(tier) * 100, // Mock rent cost
                        isRented: false
                    });
                }
            });

            setHabPlots(plots);
        }
    }, [selectedStarbase]);

    // Check for recipes from Recipe Tool
    useEffect(() => {
        const checkQueue = () => {
            const queueStr = localStorage.getItem('craftingQueue');
            if (queueStr) {
                const queue = JSON.parse(queueStr);
                if (queue.length > 0) {
                    // Show notification about available recipes
                    console.log('Recipes available in queue:', queue);
                }
            }
        };

        checkQueue();
        // Check periodically
        const interval = setInterval(checkQueue, 5000);
        return () => clearInterval(interval);
    }, []);

    // Job simulation
    useEffect(() => {
        if (craftingJobs.filter(j => j.status === 'active').length > 0) {
            simulationRef.current = setInterval(() => {
                setCraftingJobs(prev => prev.map(job => {
                    if (job.status !== 'active') return job;

                    const now = Date.now();
                    const elapsed = (now - job.startTime) / 1000;
                    const progress = Math.min(100, (elapsed / job.totalTime) * 100);

                    if (progress >= 100) {
                        // Complete job
                        const recipe = recipes.find(r => r.id === job.recipeId);
                        if (recipe) {
                            // Add output to inventory
                            addToInventory({
                                [recipe.output?.resource || '']: (recipe.output?.quantity || 0) * job.quantity
                            });

                            // Achievement
                            unlockAchievement('first_craft_complete');
                            updateStatistic('totalItemsCrafted', 1);
                        }

                        return { ...job, progress: 100, status: 'completed' };
                    }

                    return { ...job, progress };
                }));
            }, 100); // Update every 100ms for smooth progress
        }

        return () => {
            if (simulationRef.current) {
                clearInterval(simulationRef.current);
            }
        };
    }, [craftingJobs, recipes, addToInventory, unlockAchievement, updateStatistic]);

    // Calculate hab stats
    const calculateHabStats = (buildings: PlacedHabBuilding[]) => {
        let totalSlots = 0;
        let craftingSpeed = 1.0;
        let jobSlots = 0;
        const unlockedRecipes: string[] = [];

        buildings.forEach(building => {
            if (building.type === 'hab') {
                const hab = habBuildings.habs.find((h: any) => h.id === building.buildingId);
                if (hab) totalSlots = hab.slots;
            } else if (building.type === 'crafting-station') {
                const station = habBuildings.craftingStations.find((s: any) => s.id === building.buildingId);
                if (station) {
                    craftingSpeed *= station.speedBonus;
                    jobSlots += station.slots;
                }
            } else if (building.type === 'cargo-storage') {
                const storage = habBuildings.cargoStorage.find((s: any) => s.id === building.buildingId);
                if (storage) {
                    jobSlots += storage.jobSlots;
                }
            }
        });

        return {
            totalSlots,
            usedSlots: buildings.filter(b => b.type !== 'hab').length,
            craftingSpeed,
            jobSlots,
            unlockedRecipes
        };
    };

    const currentStats = designMode
        ? calculateHabStats(currentDesign)
        : selectedPlot?.habDesign
            ? calculateHabStats(selectedPlot.habDesign.buildings)
            : null;

    // Rent plot
    const rentPlot = (plotId: string) => {
        setHabPlots(prev => prev.map(plot =>
            plot.id === plotId ? { ...plot, isRented: true } : plot
        ));
        setSelectedPlotId(plotId);
        setDesignMode(true);
        setCurrentDesign([]);

        unlockAchievement('first_hab_plot');
    };

    // Add building to design
    const addBuilding = (buildingId: string, type: PlacedHabBuilding['type'], size?: string) => {
        const newBuilding: PlacedHabBuilding = {
            id: `hb_${Date.now()}`,
            buildingId,
            type,
            size
        };

        // If it's a hab, replace existing hab
        if (type === 'hab') {
            setCurrentDesign([newBuilding, ...currentDesign.filter(b => b.type !== 'hab')]);
        } else {
            setCurrentDesign([...currentDesign, newBuilding]);
        }
    };

    // Remove building
    const removeBuilding = (buildingId: string) => {
        setCurrentDesign(currentDesign.filter(b => b.id !== buildingId));
    };

    // Finalize design
    const finalizeDesign = () => {
        if (!selectedPlot || !currentStats) return;

        const habTier = currentDesign.find(b => b.type === 'hab')?.buildingId.match(/t(\d)/)?.[1] || 1;

        setHabPlots(prev => prev.map(plot =>
            plot.id === selectedPlotId
                ? {
                    ...plot,
                    habDesign: {
                        habTier: parseInt(habTier as string),
                        buildings: currentDesign,
                        totalSlots: currentStats.totalSlots,
                        craftingSpeed: currentStats.craftingSpeed,
                        storageBonus: 0,
                        unlockedRecipes: currentStats.unlockedRecipes
                    }
                }
                : plot
        ));

        setDesignMode(false);
    };

    // Start crafting job
    const startCraftingJob = (priority: 'low' | 'normal' | 'high' = 'normal') => {
        if (!selectedRecipe || !selectedPlot?.habDesign || craftQuantity <= 0) return;

        // Check if we have available job slots
        const activeJobs = craftingJobs.filter(j =>
            j.habPlotId === selectedPlot.id &&
            (j.status === 'active' || j.status === 'queued')
        );
        const maxJobs = selectedPlot.habDesign.totalSlots || 5;

        if (activeJobs.length >= maxJobs) {
            showNotification(`Job queue full! Max ${maxJobs} jobs for this hab. Complete or cancel existing jobs.`, 'warning');
            return;
        }

        // Check resources
        const canCraft = selectedRecipe.ingredients && Array.isArray(selectedRecipe.ingredients) &&
            selectedRecipe.ingredients.every(ing =>
                (sharedState.starbaseInventory[ing.resource] || 0) >= ing.quantity * craftQuantity
            );

        if (!canCraft) {
            showNotification('Insufficient resources!', 'error');
            return;
        }

        // Consume resources
        const toConsume: Record<string, number> = {};
        if (selectedRecipe.ingredients && Array.isArray(selectedRecipe.ingredients)) {
            selectedRecipe.ingredients.forEach(ing => {
                toConsume[ing.resource] = ing.quantity * craftQuantity;
            });
        }
        consumeFromInventory(toConsume);

        // Create job
        const newJob: CraftingJob = {
            id: `job_${Date.now()}`,
            recipeId: selectedRecipe.id,
            habPlotId: selectedPlot.id,
            quantity: craftQuantity,
            progress: 0,
            totalTime: (selectedRecipe.constructionTime || 60) / (selectedPlot.habDesign.craftingSpeed || 1),
            startTime: Date.now(),
            crewAssigned: 10 + (priority === 'high' ? 5 : priority === 'low' ? -2 : 0), // Crew affects speed
            status: activeJobs.length < 3 ? 'active' : 'queued', // Only 3 active at a time
            priority: priority,
            output: {
                resource: selectedRecipe.output?.resource || selectedRecipe.name,
                quantity: (selectedRecipe.output?.quantity || 1) * craftQuantity
            }
        };

        setCraftingJobs([...craftingJobs, newJob]);
        setSelectedRecipe(null);
        setCraftQuantity(1);

        // Achievement tracking
        if (craftingJobs.length === 0) {
            unlockAchievement('first_craft_started');
        }
        if (activeJobs.length >= 9) {
            unlockAchievement('production_line');
        }
    };

    // Pause/Resume job
    const toggleJobPause = (jobId: string) => {
        setCraftingJobs(prev => prev.map(job => {
            if (job.id === jobId) {
                if (job.status === 'active') {
                    return { ...job, status: 'paused' as const };
                } else if (job.status === 'paused') {
                    return { ...job, status: 'active' as const, startTime: Date.now() - (job.progress / 100) * job.totalTime * 1000 };
                }
            }
            return job;
        }));
    };

    // Cancel job and refund partial resources
    const cancelJob = (jobId: string) => {
        const job = craftingJobs.find(j => j.id === jobId);
        if (!job) return;

        const recipe = recipes.find(r => r.id === job.recipeId);
        if (recipe && job.progress < 100) {
            // Refund 50% of unconsumed resources
            const refundMultiplier = (100 - job.progress) / 100 * 0.5;
            const toRefund: Record<string, number> = {};

            if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
                recipe.ingredients.forEach(ing => {
                    toRefund[ing.resource] = Math.floor(ing.quantity * job.quantity * refundMultiplier);
                });
            }

            addToInventory(toRefund);
        }

        setCraftingJobs(prev => prev.filter(j => j.id !== jobId));
    };

    // Collect completed job
    const collectJob = (jobId: string) => {
        const job = craftingJobs.find(j => j.id === jobId);
        if (!job || job.status !== 'completed') return;

        // Add output to inventory
        if (job.output) {
            addToInventory({ [job.output.resource]: job.output.quantity });
        }

        // Remove job and activate next queued
        setCraftingJobs(prev => {
            const updated = prev.filter(j => j.id !== jobId);
            const nextQueued = updated.find(j => j.status === 'queued');
            if (nextQueued) {
                return updated.map(j => j.id === nextQueued.id
                    ? { ...j, status: 'active' as const, startTime: Date.now() }
                    : j
                );
            }
            return updated;
        });

        // Achievement
        updateStatistic('totalItemsCrafted', job.quantity);
    };

    // Filter recipes
    const filteredRecipes = recipes.filter(recipe => {
        if (categoryFilter !== 'all' && recipe.type !== categoryFilter) return false;
        if (searchTerm && !recipe.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    if (loading) {
        return <div className="loading-screen">Loading game data...</div>;
    }

    return (
        <div className="crafting-hab-app">
            <Navigation />

            <NotificationSystem
                notifications={notifications}
                onDismiss={dismissNotification}
            />

            <div className="crafting-hab-content">
                {/* Left Sidebar - Starbase Selection */}
                <aside className="sidebar">
                    <h2>Select Starbase</h2>

                    <div className="starbase-list">
                        {starbases.map(starbase => (
                            <div
                                key={starbase.id}
                                className={`starbase-card ${selectedStarbase?.id === starbase.id ? 'selected' : ''}`}
                                onClick={() => setSelectedStarbase(starbase)}
                            >
                                <div className="starbase-header">
                                    <h3>{starbase.name}</h3>
                                    <span className={`faction-badge faction-${starbase.faction.toLowerCase()}`}>
                                        {starbase.faction}
                                    </span>
                                </div>
                                <div className="starbase-info">
                                    <span>Level {starbase.level}</span>
                                    <span>{STARBASE_LEVELS[starbase.level as keyof typeof STARBASE_LEVELS].name}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {selectedStarbase && (
                        <div className="starbase-inventory">
                            <h3>Inventory</h3>
                            <div className="resource-list">
                                {Object.entries(selectedStarbase.inventory).map(([resource, amount]) => (
                                    <div key={resource} className="resource-item">
                                        <span>{resource}</span>
                                        <span className="amount">{amount}</span>
                                    </div>
                                ))}
                            </div>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    // Magic resources
                                    addToInventory({
                                        'iron-ore': 100,
                                        'copper': 100,
                                        'silica': 100,
                                        'fuel': 100
                                    });
                                }}
                            >
                                🪄 Add Resources
                            </button>
                        </div>
                    )}
                </aside>

                {/* Main Content */}
                <main className="main-content">
                    {selectedStarbase ? (
                        <div className="hab-management">
                            <div className="management-header">
                                <h2>{selectedStarbase.name} - Crafting Habs</h2>
                            </div>

                            {/* Plot Grid */}
                            <div className="plot-section">
                                <h3>Available Plots</h3>

                                {/* Add Plot Filters */}
                                <div className="plot-filters">
                                    <button
                                        className={`tier-filter-btn ${plotTierFilter === null ? 'active' : ''}`}
                                        onClick={() => setPlotTierFilter(null)}
                                    >
                                        All Tiers
                                    </button>
                                    {[1, 2, 3, 4, 5].map(tier => {
                                        const plotsForTier = habPlots.filter(p => p.tier === tier).length;
                                        if (plotsForTier === 0) return null;

                                        return (
                                            <button
                                                key={tier}
                                                className={`tier-filter-btn ${plotTierFilter === tier ? 'active' : ''}`}
                                                onClick={() => setPlotTierFilter(tier)}
                                            >
                                                T{tier} ({plotsForTier})
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className={`plot-grid ${plotTierFilter !== null ? 'filtered' : ''}`}>
                                    {habPlots
                                        .filter(plot => plotTierFilter === null || plot.tier === plotTierFilter)
                                        .map(plot => (
                                            <div
                                                key={plot.id}
                                                className={`plot-card ${plot.isRented ? 'rented' : ''} ${selectedPlotId === plot.id ? 'selected' : ''}`}
                                                onClick={() => plot.isRented && setSelectedPlotId(plot.id)}
                                            >
                                                <div className="plot-tier">T{plot.tier}</div>
                                                <div className="plot-status">
                                                    {plot.isRented ? (
                                                        plot.habDesign ? '🏭 Active' : '🔨 Design'
                                                    ) : (
                                                        `💰 ${plot.rentCost}/day`
                                                    )}
                                                </div>
                                                {!plot.isRented && (
                                                    <button
                                                        className="btn btn-sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            rentPlot(plot.id);
                                                        }}
                                                    >
                                                        Rent
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {/* Hab Designer */}
                            {selectedPlot && (
                                <div className="hab-designer">
                                    <h3>
                                        Plot T{selectedPlot.tier}
                                        {designMode && ' - Design Mode'}
                                    </h3>

                                    <div className="design-area">
                                        {/* Current Design */}
                                        <div className="current-design">
                                            <h4>Current Setup</h4>
                                            <div className="building-list">
                                                {(designMode ? currentDesign : selectedPlot.habDesign?.buildings || []).map(building => (
                                                    <div key={building.id} className="hab-building-card">
                                                        <span className="building-type">{building.type}</span>
                                                        <span className="building-name">{building.buildingId}</span>
                                                        {building.size && <span className="building-size">{building.size}</span>}
                                                        {designMode && (
                                                            <button
                                                                className="remove-btn"
                                                                onClick={() => removeBuilding(building.id)}
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {currentStats && (
                                                <div className="design-stats">
                                                    <div className="stat">
                                                        <span>Slots:</span>
                                                        <span>{currentStats.usedSlots}/{currentStats.totalSlots}</span>
                                                    </div>
                                                    <div className="stat">
                                                        <span>Job Slots:</span>
                                                        <span>{currentStats.jobSlots}</span>
                                                    </div>
                                                    <div className="stat">
                                                        <span>Speed:</span>
                                                        <span>{(currentStats.craftingSpeed * 100).toFixed(0)}%</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Construction Cost Summary */}
                                            {designMode && currentDesign.length > 0 && (
                                                <div className="design-cost-summary">
                                                    <h4>Total Construction Cost</h4>
                                                    <div className="total-construction-cost">
                                                        {(() => {
                                                            const totalCost: Record<string, number> = {};
                                                            currentDesign.forEach(pb => {
                                                                // Find the building in the appropriate list
                                                                let building: any = null;
                                                                if (pb.type === 'hab') {
                                                                    building = habBuildings.habs.find((h: any) => h.id === pb.buildingId);
                                                                } else if (pb.type === 'crafting-station') {
                                                                    building = habBuildings.craftingStations.find((s: any) => s.id === pb.buildingId);
                                                                } else if (pb.type === 'cargo-storage') {
                                                                    building = habBuildings.cargoStorage.find((c: any) => c.id === pb.buildingId);
                                                                }

                                                                if (building?.constructionCost) {
                                                                    Object.entries(building.constructionCost).forEach(([resource, amount]) => {
                                                                        totalCost[resource] = (totalCost[resource] || 0) + (amount as number);
                                                                    });
                                                                }
                                                            });

                                                            if (Object.keys(totalCost).length === 0) {
                                                                return <span className="no-cost">No construction materials required</span>;
                                                            }

                                                            return Object.entries(totalCost).map(([resource, amount]) => (
                                                                <span key={resource} className="cost-item">
                                                                    {resource}: <strong>{amount}</strong>
                                                                </span>
                                                            ));
                                                        })()}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Available Buildings */}
                                        {designMode && (
                                            <div className="available-buildings">
                                                <h4>Add Buildings</h4>

                                                {/* Hab Selection */}
                                                {!currentDesign.find(b => b.type === 'hab') && (
                                                    <div className="building-category">
                                                        <h5>🏠 Select Hab Tier (Required)</h5>
                                                        <div className="building-options">
                                                            {habBuildings.habs
                                                                .filter((hab: any) => hab.tier <= selectedPlot.tier)
                                                                .map((hab: any) => (
                                                                    <button
                                                                        key={hab.id}
                                                                        className="building-option hab-option"
                                                                        onClick={() => addBuilding(hab.id, 'hab')}
                                                                    >
                                                                        <span className="option-icon">🏠</span>
                                                                        <span className="option-name">{hab.name}</span>
                                                                        <span className="option-stats">
                                                                            {hab.slots} slots | +{hab.jobSlots || 3} jobs
                                                                        </span>
                                                                    </button>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Other Buildings */}
                                                {currentDesign.find(b => b.type === 'hab') && (
                                                    <>
                                                        <div className="building-category">
                                                            <h5>⚙️ Crafting Stations</h5>
                                                            <div className="building-options">
                                                                {habBuildings.craftingStations.map((station: any) => (
                                                                    <button
                                                                        key={station.id}
                                                                        className="building-option station-option"
                                                                        onClick={() => addBuilding(station.id, 'crafting-station', station.size)}
                                                                        disabled={currentStats ? currentStats.usedSlots >= currentStats.totalSlots : false}
                                                                    >
                                                                        <span className="option-icon">⚙️</span>
                                                                        <span className="option-name">{station.name}</span>
                                                                        <span className="option-stats">
                                                                            {station.speedBonus > 1 ? `+${Math.round((station.speedBonus - 1) * 100)}% speed` : 'Base speed'} |
                                                                            +{station.jobSlots} jobs
                                                                        </span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="building-category">
                                                            <h5>📦 Cargo Storage</h5>
                                                            <div className="building-options">
                                                                {habBuildings.cargoStorage
                                                                    .filter((storage: any) => storage.tier <= selectedPlot.tier)
                                                                    .map((storage: any) => (
                                                                        <button
                                                                            key={storage.id}
                                                                            className="building-option storage-option"
                                                                            onClick={() => addBuilding(storage.id, 'cargo-storage')}
                                                                            disabled={currentStats ? currentStats.usedSlots >= currentStats.totalSlots : false}
                                                                        >
                                                                            <span className="option-icon">📦</span>
                                                                            <span className="option-name">{storage.name}</span>
                                                                            <span className="option-stats">
                                                                                +{storage.jobSlots} job slots
                                                                            </span>
                                                                        </button>
                                                                    ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="action-buttons">
                                        {designMode ? (
                                            <>
                                                <button
                                                    className="btn btn-secondary"
                                                    onClick={() => {
                                                        setDesignMode(false);
                                                        setCurrentDesign([]);
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={finalizeDesign}
                                                    disabled={!currentDesign.find(b => b.type === 'hab')}
                                                >
                                                    Finalize Design
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => {
                                                    setDesignMode(true);
                                                    setCurrentDesign(selectedPlot.habDesign?.buildings || []);
                                                }}
                                            >
                                                Redesign
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Crafting Interface */}
                            {selectedPlot?.habDesign && !designMode && (
                                <div className="crafting-interface">
                                    <h3>Crafting</h3>

                                    {/* Import from Recipe Tool */}
                                    <div className="queue-import" style={{ marginBottom: '1rem' }}>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                const queueStr = localStorage.getItem('craftingQueue');
                                                if (queueStr) {
                                                    const queue = JSON.parse(queueStr);
                                                    if (queue.length > 0) {
                                                        const plan = queue[0];
                                                        setSelectedRecipe(plan.recipe);
                                                        setCraftQuantity(plan.quantity);
                                                        // Remove from queue
                                                        queue.shift();
                                                        localStorage.setItem('craftingQueue', JSON.stringify(queue));
                                                        alert(`Loaded recipe: ${plan.recipe.name} x${plan.quantity}`);
                                                    } else {
                                                        alert('No recipes in queue');
                                                    }
                                                } else {
                                                    alert('No recipes in queue');
                                                }
                                            }}
                                        >
                                            📥 Import from Recipe Tool
                                        </button>
                                    </div>

                                    <div className="recipe-selection">
                                        <div className="recipe-filters">
                                            <select
                                                value={categoryFilter}
                                                onChange={(e) => setCategoryFilter(e.target.value)}
                                                className="filter-select"
                                            >
                                                <option value="all">All Categories</option>
                                                <option value="component">Components</option>
                                                <option value="module">Modules</option>
                                                <option value="consumable">Consumables</option>
                                            </select>

                                            <input
                                                type="text"
                                                placeholder="Search recipes..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="search-input"
                                            />
                                        </div>

                                        <div className="recipe-grid">
                                            {filteredRecipes.map(recipe => {
                                                const canCraft = recipe.ingredients && Array.isArray(recipe.ingredients) &&
                                                    recipe.ingredients.every(ing =>
                                                        (sharedState.starbaseInventory[ing.resource] || 0) >= ing.quantity
                                                    );

                                                return (
                                                    <div
                                                        key={recipe.id}
                                                        className={`recipe-card ${selectedRecipe?.id === recipe.id ? 'selected' : ''} ${!canCraft ? 'disabled' : ''}`}
                                                        onClick={() => canCraft && setSelectedRecipe(recipe)}
                                                    >
                                                        <h5>{recipe.name}</h5>
                                                        <div className="recipe-tier">Tier {recipe.tier}</div>
                                                        <div className="recipe-ingredients">
                                                            {recipe.ingredients && Array.isArray(recipe.ingredients) && recipe.ingredients.map(ing => (
                                                                <span key={ing.resource} className="ingredient">
                                                                    {ing.quantity} {ing.resource}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <div className="recipe-output">
                                                            → {recipe.output?.quantity || 0} {recipe.output?.resource || ''}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {selectedRecipe && (
                                            <div className="craft-controls">
                                                <h4>Craft {selectedRecipe.name}</h4>
                                                <div className="quantity-selector">
                                                    <label>Quantity:</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="100"
                                                        value={craftQuantity}
                                                        onChange={(e) => setCraftQuantity(parseInt(e.target.value) || 1)}
                                                    />
                                                </div>
                                                <div className="craft-summary">
                                                    <div>Time: {(selectedRecipe.constructionTime * craftQuantity / (currentStats?.craftingSpeed || 1)).toFixed(0)}s</div>
                                                    <div>Output: {(selectedRecipe.output?.quantity || 0) * craftQuantity} {selectedRecipe.output?.resource || ''}</div>
                                                </div>
                                                <div className="craft-actions">
                                                    <select
                                                        className="priority-selector"
                                                        value="normal"
                                                        onChange={(e) => {
                                                            const priority = e.target.value as 'low' | 'normal' | 'high';
                                                            startCraftingJob(priority);
                                                        }}
                                                    >
                                                        <option value="low">Low Priority</option>
                                                        <option value="normal">Normal Priority</option>
                                                        <option value="high">High Priority</option>
                                                    </select>
                                                    <button
                                                        className="btn btn-primary"
                                                        onClick={() => startCraftingJob('normal')}
                                                    >
                                                        Start Crafting
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <h2>Welcome to Crafting Hab</h2>
                            <p>Select a starbase from the left to begin setting up your crafting operations!</p>
                        </div>
                    )}
                </main>

                {/* Right Sidebar - Active Jobs */}
                <aside className="sidebar right">
                    {/* Rented Hab Plots Summary */}
                    {habPlots.filter(p => p.isRented).length > 0 && (
                        <div className="rented-plots-summary">
                            <h3>Your Hab Plots</h3>
                            <div className="plots-list">
                                {habPlots.filter(p => p.isRented).map(plot => {
                                    const stats = plot.habDesign ? calculateHabStats(plot.habDesign.buildings) : null;
                                    const activeJobs = craftingJobs.filter(j => j.habPlotId === plot.id && j.status !== 'completed').length;
                                    return (
                                        <div key={plot.id} className={`plot-summary ${selectedPlotId === plot.id ? 'selected' : ''}`}
                                            onClick={() => setSelectedPlotId(plot.id)}>
                                            <div className="plot-header">
                                                <span className="plot-name">T{plot.tier} Plot</span>
                                                <span className={`plot-status ${plot.habDesign ? 'active' : 'designing'}`}>
                                                    {plot.habDesign ? 'Active' : 'Not Configured'}
                                                </span>
                                            </div>
                                            {stats && (
                                                <div className="plot-stats">
                                                    <span title="Slots">📦 {stats.usedSlots}/{stats.totalSlots}</span>
                                                    <span title="Jobs">💼 {activeJobs}/{stats.jobSlots}</span>
                                                    <span title="Speed">⚡ {(stats.craftingSpeed * 100).toFixed(0)}%</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="sidebar-header">
                        <h3>Active Jobs</h3>
                        {craftingJobs.filter(j => j.status === 'completed').length > 0 && (
                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => {
                                    const completedJobs = craftingJobs.filter(j => j.status === 'completed');
                                    completedJobs.forEach(job => {
                                        if (job.output) {
                                            addToInventory({ [job.output.resource]: job.output.quantity });
                                        }
                                    });
                                    setCraftingJobs(prev => prev.filter(j => j.status !== 'completed'));
                                    updateStatistic('totalItemsCrafted', completedJobs.reduce((sum, j) => sum + j.quantity, 0));
                                }}
                            >
                                Clear {craftingJobs.filter(j => j.status === 'completed').length} Completed
                            </button>
                        )}
                    </div>

                    <div className="job-queue">
                        {craftingJobs.map(job => {
                            const recipe = recipes.find(r => r.id === job.recipeId);
                            const plot = habPlots.find(p => p.id === job.habPlotId);

                            return (
                                <div key={job.id} className={`job-card ${job.status} ${job.priority || 'normal'}-priority`}>
                                    <div className="job-header">
                                        <h4>{recipe?.name}</h4>
                                        <span className="job-quantity">×{job.quantity}</span>
                                        {job.priority && job.priority !== 'normal' && (
                                            <span className={`priority-badge ${job.priority}`}>
                                                {job.priority === 'high' ? '⚡' : '🐢'} {job.priority}
                                            </span>
                                        )}
                                    </div>
                                    <div className="job-plot">
                                        Plot T{plot?.tier}
                                        {job.status === 'queued' && ' • Queued'}
                                        {job.status === 'paused' && ' • Paused'}
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className={`progress-fill ${job.status}`}
                                            style={{ width: `${job.progress}%` }}
                                        />
                                    </div>
                                    <div className="job-status">
                                        {job.status === 'active' && `${job.progress.toFixed(0)}% • ${Math.ceil((100 - job.progress) / 100 * job.totalTime)}s`}
                                        {job.status === 'completed' && '✓ Complete'}
                                        {job.status === 'queued' && 'Waiting...'}
                                        {job.status === 'paused' && `Paused at ${job.progress.toFixed(0)}%`}
                                    </div>
                                    <div className="job-actions">
                                        {job.status === 'completed' && (
                                            <button
                                                className="btn btn-sm btn-success"
                                                onClick={() => collectJob(job.id)}
                                            >
                                                Collect
                                            </button>
                                        )}
                                        {(job.status === 'active' || job.status === 'paused') && (
                                            <>
                                                <button
                                                    className="btn btn-sm"
                                                    onClick={() => toggleJobPause(job.id)}
                                                >
                                                    {job.status === 'active' ? '⏸️' : '▶️'}
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => {
                                                        if (confirm(`Cancel job? ${job.progress < 100 ? 'You\'ll get 50% refund on remaining resources.' : ''}`)) {
                                                            cancelJob(job.id);
                                                        }
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </>
                                        )}
                                        {job.status === 'queued' && (
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => cancelJob(job.id)}
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {craftingJobs.length === 0 && (
                            <div className="empty-jobs">
                                No active crafting jobs
                            </div>
                        )}
                    </div>

                    {/* Output Summary */}
                    <div className="output-summary">
                        <h4>Recent Output</h4>
                        <div className="output-list">
                            {craftingJobs
                                .filter(job => job.status === 'completed')
                                .slice(-5)
                                .map(job => {
                                    const recipe = recipes.find(r => r.id === job.recipeId);
                                    return (
                                        <div key={job.id} className="output-item">
                                            <span>{(recipe?.output.quantity || 0) * job.quantity} {recipe?.output.resource}</span>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
} 