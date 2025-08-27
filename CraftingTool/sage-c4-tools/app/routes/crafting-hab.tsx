import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
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
    isOwned: boolean;
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
    outputType?: string; // Added for proper filtering by category
    tier: number;
    constructionTime: number;
    ingredients: { resource: string; quantity: number }[];
    output: { resource: string; quantity: number };
}

export default function CraftingHab() {
    const { gameData, loading } = useGameData();
    const { state: sharedState, dispatch, updateStatistic, unlockAchievement, updateAchievementProgress, addToInventory, consumeFromInventory } = useSharedState();
    const { notifications, showNotification, dismissNotification } = useNotifications();

    // State - Initialize from SharedState using lazy initializers
    const [selectedStarbaseId, setSelectedStarbaseId] = useState<string | null>(null);
    const [habPlots, setHabPlots] = useState<HabPlot[]>(() => {
        const saved = sharedState.craftingHabState?.habPlots;
        console.log('🔧 Initializing habPlots:', saved?.length || 0, 'plots');
        return saved || [];
    });
    const [selectedPlotId, setSelectedPlotId] = useState<string | null>(() => {
        return sharedState.craftingHabState?.selectedPlotId || null;
    });
    const [designMode, setDesignMode] = useState(false);
    const [currentDesign, setCurrentDesign] = useState<PlacedHabBuilding[]>([]);
    const [craftingJobs, setCraftingJobs] = useState<CraftingJob[]>(() => {
        const saved = sharedState.craftingHabState?.craftingJobs;
        return saved || [];
    });
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [craftQuantity, setCraftQuantity] = useState(1);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [plotTierFilter, setPlotTierFilter] = useState<number | null>(null); // Add tier filter
    const [viewMode, setViewMode] = useState<'overview' | 'construction' | 'crafting'>(() => {
        return sharedState.craftingHabState?.viewMode || 'overview';
    });
    const [favoriteRecipes, setFavoriteRecipes] = useState<string[]>(() => {
        return sharedState.craftingHabState?.favoriteRecipes || [];
    });
    const [recentRecipes, setRecentRecipes] = useState<string[]>(() => {
        return sharedState.craftingHabState?.recentRecipes || [];
    });
    const [queuedItems, setQueuedItems] = useState<any[]>([]);
    const [recipePriorities, setRecipePriorities] = useState<Record<string, 'low' | 'normal' | 'high'>>({});

    // Refs for managing state updates
    const previousViewMode = useRef(viewMode);
    const previousStateRef = useRef<any>({});
    const simulationRef = useRef<NodeJS.Timeout | null>(null);
    const hasInitialSave = useRef(false);  // Track if we've done the initial save

    // Enhanced filtering states
    const [tierFilter, setTierFilter] = useState<number | null>(null);
    const [canCraftFilter, setCanCraftFilter] = useState(false);
    const [showFavorites, setShowFavorites] = useState(false);
    const [resourceFilter, setResourceFilter] = useState('');
    const [craftPriority, setCraftPriority] = useState<'low' | 'normal' | 'high'>('normal');

    // Log initial state
    useEffect(() => {
        console.log('📊 Component mounted with state:', {
            habPlotsCount: habPlots.length,
            habPlotsWithDesigns: habPlots.filter(p => p.habDesign).length,
            selectedPlotId,
            viewMode,
            craftingJobsCount: craftingJobs.length,
            habPlots: habPlots.map(p => ({
                id: p.id,
                isOwned: p.isOwned,
                hasDesign: !!p.habDesign,
                tier: p.tier,
                buildingCount: p.habDesign?.buildings?.length || 0
            }))
        });
    }, []);

    // Additional debugging for habPlots changes
    useEffect(() => {
        console.log('🔄 habPlots changed:', {
            count: habPlots.length,
            ownedCount: habPlots.filter(p => p.isOwned).length,
            withDesigns: habPlots.filter(p => p.habDesign).length,
            details: habPlots.map(p => ({
                id: p.id,
                isOwned: p.isOwned,
                hasDesign: !!p.habDesign,
                tier: p.tier
            }))
        });
    }, [habPlots]);

    // Debug selectedPlot
    useEffect(() => {
        const selectedPlot = habPlots.find(p => p.id === selectedPlotId);
        console.log('🎯 Selected plot:', {
            id: selectedPlotId,
            found: !!selectedPlot,
            isOwned: selectedPlot?.isOwned,
            hasDesign: !!selectedPlot?.habDesign,
            viewMode
        });
    }, [selectedPlotId, habPlots, viewMode]);

    // Save state to SharedState only when it meaningfully changes
    useEffect(() => {
        // Skip the very first save if we just loaded from storage
        if (!hasInitialSave.current) {
            hasInitialSave.current = true;
            // Initialize previousStateRef with current state to prevent immediate save
            previousStateRef.current = {
                habPlots: JSON.stringify(habPlots),
                craftingJobs: JSON.stringify(craftingJobs),
                selectedStarbaseId: selectedStarbaseId,
                selectedPlotId,
                viewMode,
                favoriteRecipes: JSON.stringify(favoriteRecipes),
                recentRecipes: JSON.stringify(recentRecipes)
            };
            return;
        }

        const currentState = {
            habPlots: JSON.stringify(habPlots),
            craftingJobs: JSON.stringify(craftingJobs),
            selectedStarbaseId: selectedStarbaseId,
            selectedPlotId,
            viewMode,
            favoriteRecipes: JSON.stringify(favoriteRecipes),
            recentRecipes: JSON.stringify(recentRecipes)
        };

        // Check if state actually changed
        const hasChanged = Object.keys(currentState).some(
            key => (currentState as any)[key] !== previousStateRef.current[key]
        );

        if (!hasChanged) {
            return; // No changes, don't save
        }

        // Only log significant changes (not crafting updates)
        const designCount = habPlots.filter(p => p.habDesign).length;
        const prevDesignCount = previousStateRef.current.habPlots ?
            JSON.parse(previousStateRef.current.habPlots).filter((p: any) => p.habDesign).length : 0;

        // Only log if design count changed
        if (designCount !== prevDesignCount && designCount > 0) {
            console.log('💾 SAVING HAB DESIGNS:', { habPlotsWithDesigns: designCount });
        }

        dispatch({
            type: 'UPDATE_CRAFTING_HAB_STATE',
            payload: {
                habPlots,
                craftingJobs,
                selectedStarbaseId: selectedStarbaseId || undefined,
                selectedPlotId: selectedPlotId || undefined,
                viewMode,
                favoriteRecipes,
                recentRecipes
            }
        });

        previousStateRef.current = currentState;
    }, [habPlots, craftingJobs, selectedStarbaseId, selectedPlotId, viewMode, favoriteRecipes, recentRecipes, dispatch]);

    // Load existing design when entering construction mode
    useEffect(() => {
        const plot = habPlots.find(p => p.id === selectedPlotId);

        if (viewMode === 'construction' && previousViewMode.current !== 'construction' && plot?.habDesign && !designMode) {
            // Load the existing design into currentDesign for viewing
            setCurrentDesign([...(plot.habDesign.buildings || [])]);
        }
        previousViewMode.current = viewMode;
    }, [viewMode, selectedPlotId, habPlots, designMode]);

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
    // Memoize starbases to prevent recreation on every render
    const starbases: Starbase[] = useMemo(() => [
        {
            id: 'sb_001',
            name: 'Unity Station',
            faction: 'MUD',
            level: sharedState.starbaseLevel,
            inventory: sharedState.starbaseInventory
        },
        { id: 'sb_002', name: 'Phoenix Hub', faction: 'ONI', level: sharedState.starbaseLevel, inventory: sharedState.starbaseInventory },
        { id: 'sb_003', name: 'Liberty Complex', faction: 'UST', level: sharedState.starbaseLevel, inventory: sharedState.starbaseInventory }
    ], [sharedState.starbaseLevel, sharedState.starbaseInventory]);

    // Derive selected starbase from starbases array using selectedStarbaseId
    const selectedStarbase = selectedStarbaseId ? starbases.find(sb => sb.id === selectedStarbaseId) || null : null;

    // Restore selected starbase ID after starbases is defined
    useEffect(() => {
        const savedStarbaseId = sharedState.craftingHabState?.selectedStarbaseId;
        if (savedStarbaseId && !selectedStarbaseId) {
            console.log('✅ Restoring starbase:', savedStarbaseId);
            setSelectedStarbaseId(savedStarbaseId);
        }
    }, [sharedState.craftingHabState?.selectedStarbaseId]);

    // Filter out raw materials and buildings (recipes without ingredients or with empty ingredients)
    const recipes: Recipe[] = useMemo(() => {
        const allRecipes = gameData?.recipes || [];

        // Only include recipes that have actual ingredients and are not buildings or hab assets
        const filtered = allRecipes.filter((recipe: any) => {
            // Must have ingredients
            if (!recipe.ingredients || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
                return false;
            }

            // Check outputType with various formats (spaces, underscores, case variations)
            const outputType = (recipe.outputType || '').toUpperCase().replace(/[_\s]+/g, '');

            // Filter out BUILDING and HAB ASSETS entirely
            if (outputType === 'BUILDING' ||
                outputType === 'BUILDINGS' ||
                outputType === 'HABASSET' ||
                outputType === 'HABASSETS' ||
                outputType === 'BASICRESOURCE' ||
                outputType === 'BASICORGANICRESOURCE') {
                return false;
            }

            // Also check the type field (legacy format)
            const recipeType = (recipe.type || '').toLowerCase().replace(/[_\s]+/g, '');
            if (recipeType === 'building' ||
                recipeType === 'buildings' ||
                recipeType === 'habasset' ||
                recipeType === 'habassets') {
                return false;
            }

            // Check if the output name suggests it's a building (extra safety check)
            const outputName = ((recipe as any).outputName || (recipe as any).outputId || '').toLowerCase();
            if (outputName.includes('central hub') ||
                outputName.includes('central-hub') ||
                outputName.includes('cultivation hub') ||
                outputName.includes('extraction hub') ||
                outputName.includes('processing hub') ||
                outputName.includes('storage hub') ||
                outputName.includes('power plant') ||
                outputName.includes('extractor') ||
                outputName.includes('processor')) {
                return false;
            }

            // Filter out 1:1 conversions (raw materials)
            if (recipe.ingredients.length === 1) {
                const ingredientName = recipe.ingredients[0].resource || recipe.ingredients[0].name;
                const outputResource = (recipe as any).outputName || (recipe as any).outputId || recipe.output?.resource;
                if (ingredientName === outputResource) {
                    return false;
                }
            }

            return true;
        });

        // Fallback to mock data if no recipes loaded
        if (filtered.length === 0) {
            return [
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
        }

        // Map to include outputType for proper filtering
        const mapped = filtered.map((recipe: any) => ({
            id: recipe.outputId || recipe.id,
            name: recipe.outputName || recipe.name || recipe.id,
            type: recipe.type || 'component',
            outputType: recipe.outputType, // Include outputType
            tier: recipe.outputTier || recipe.tier || 1,
            constructionTime: recipe.constructionTime || 60,
            ingredients: (recipe.ingredients || []).map((ing: any) => ({
                resource: ing.name || ing.resource,
                quantity: ing.quantity || 1
            })),
            output: {
                resource: recipe.outputId || recipe.id,
                quantity: recipe.outputQuantity || 1
            }
        }));

        return mapped;
    }, [gameData?.recipes]);

    // Use craftingHabBuildings from loaded JSON data
    const habBuildings = useMemo(() => {
        if ((gameData as any)?.craftingHabBuildings) {
            // Filter out unwanted buildings (landing pads, paint, pet house)
            const data = (gameData as any).craftingHabBuildings;
            return {
                habs: data.habs?.filter((hab: any) => {
                    const id = hab.id.toLowerCase();
                    // Keep only the main hab tiers, not landing pads, paint, or pet houses
                    return id.startsWith('hab-t') && !id.includes('landing') && !id.includes('paint') && !id.includes('pet');
                }) || [],
                craftingStations: data.craftingStations || [],
                cargoStorage: data.cargoStorage || []
            };
        }
        // Fallback with empty structure if data not loaded
        return {
            habs: [],
            craftingStations: [],
            cargoStorage: []
        };
    }, [gameData]);

    // Get selected plot
    const selectedPlot = habPlots.find(p => p.id === selectedPlotId);

    // Initialize hab plots based on starbase
    useEffect(() => {
        if (selectedStarbase && habPlots.length === 0) {
            // Only initialize if we don't have plots already
            console.log('🏗️ Initializing new hab plots for starbase:', selectedStarbase.id);
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
                        isOwned: false
                    });
                }
            });

            setHabPlots(plots);
        } else if (selectedStarbase && habPlots.length > 0) {
            console.log('✅ Keeping existing hab plots:', habPlots.length, 'plots');
        }
    }, [selectedStarbase, habPlots.length]);

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

    // Job simulation with fixed dispatch calls
    useEffect(() => {
        if (craftingJobs.filter(j => j.status === 'active').length > 0) {
            simulationRef.current = setInterval(() => {
                const completedJobs: CraftingJob[] = [];

                setCraftingJobs(prev => prev.map(job => {
                    if (job.status !== 'active') return job;

                    const now = Date.now();
                    const elapsed = (now - job.startTime) / 1000;
                    const progress = Math.min(100, (elapsed / job.totalTime) * 100);

                    if (progress >= 100) {
                        // Mark for completion
                        completedJobs.push(job);
                        return { ...job, progress: 100, status: 'completed' };
                    }

                    return { ...job, progress };
                }));

                // Handle completed jobs outside of setState callback
                if (completedJobs.length > 0) {
                    setTimeout(() => {
                        completedJobs.forEach(job => {
                            // Use the output stored in the job itself
                            if (job.output) {
                                const outputResource = job.output.resource;
                                const outputQuantity = job.output.quantity;

                                // Add output to inventory
                                addToInventory({
                                    [outputResource]: outputQuantity
                                });

                                // Show notification for completed craft
                                const resourceData = gameData?.resources?.find((r: any) => r.id === outputResource);
                                const resourceName = resourceData?.name || outputResource.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                                showNotification(
                                    `✅ Crafting Complete: ${outputQuantity}x ${resourceName}`,
                                    'success'
                                );

                                // Achievement
                                if (!sharedState.achievements['first_craft']) {
                                    unlockAchievement('first_craft');
                                    showNotification('🏆 First Creation! You\'ve completed your first crafting job!', 'success', 5000);
                                }

                                // Track master crafter progress (tier 5 components)
                                const recipeData = gameData?.recipes?.find((r: any) => r.outputId === job.recipeId || r.id === job.recipeId);
                                const recipeTier = recipeData?.outputTier || 1;
                                if (recipeTier === 5) {
                                    unlockAchievement('master_crafter');
                                    showNotification('🏆 Master Crafter! You\'ve crafted a Tier 5 component!', 'success', 5000);
                                }

                                updateStatistic('totalItemsCrafted', 1);
                            } else {
                                console.error('Crafting job completed but has no output:', job);
                            }
                        });
                    }, 0);
                }
            }, 100); // Update every 100ms for smooth progress
        }

        return () => {
            if (simulationRef.current) {
                clearInterval(simulationRef.current);
            }
        };
    }, [craftingJobs, recipes, addToInventory, unlockAchievement, updateAchievementProgress, updateStatistic, showNotification]);

    // Calculate hab stats
    const calculateHabStats = (buildings: PlacedHabBuilding[]) => {
        let baseSlots = 0;  // Slots provided by the hab
        let consumedSlots = 0;  // Slots consumed by buildings
        let craftingSpeed = 1.0;
        let storageBonus = 0;
        let jobSlots = 0;  // Available crafting job slots
        const unlockedRecipes: string[] = [];

        buildings.forEach(building => {
            if (building.type === 'hab') {
                const hab = habBuildings.habs.find((h: any) => h.id === building.buildingId);
                if (hab) {
                    baseSlots = hab.slots || 0;  // Hab provides base slots
                    jobSlots = hab.jobSlots || 0;  // Hab provides base job slots
                }
            } else if (building.type === 'crafting-station') {
                const station = habBuildings.craftingStations.find((s: any) => s.id === building.buildingId);
                if (station) {
                    craftingSpeed *= station.speedBonus || 1;
                    consumedSlots += station.slots || 1;  // Station consumes slots
                    jobSlots += station.jobSlots || 0;  // Station may add job slots
                }
            } else if (building.type === 'cargo-storage') {
                const storage = habBuildings.cargoStorage.find((s: any) => s.id === building.buildingId);
                if (storage) {
                    storageBonus += storage.storageBonus || storage.storage || 0;
                    consumedSlots += storage.slots || 1;  // Storage consumes slots
                    jobSlots += storage.jobSlotBonus || storage.jobSlots || 0;  // Storage may add job slots
                }
            }
        });

        const availableSlots = baseSlots - consumedSlots;

        return {
            totalSlots: baseSlots,  // Total slots provided by hab
            usedSlots: consumedSlots,  // Slots consumed by buildings
            availableSlots,  // Remaining slots available
            craftingSpeed,
            jobSlots,  // Total job slots for crafting
            storageBonus,
            unlockedRecipes
        };
    };

    const currentStats = designMode
        ? calculateHabStats(currentDesign)
        : selectedPlot?.habDesign
            ? calculateHabStats(selectedPlot.habDesign.buildings)
            : null;

    // Select plot for building
    const selectPlot = (plotId: string) => {
        setHabPlots(prev => prev.map(plot =>
            plot.id === plotId ? { ...plot, isOwned: true } : plot
        ));
        setSelectedPlotId(plotId);
        setDesignMode(true);
        setCurrentDesign([]);
        setViewMode('construction'); // Ensure we switch to construction view

        // Achievement for first hab plot
        if (habPlots.length === 0) {
            showNotification('🏆 First Hab Plot! You\'ve created your first crafting hab!', 'success', 5000);
        }
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

        // Calculate total construction cost
        const totalCost: Record<string, number> = {};
        currentDesign.forEach(pb => {
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

        // Deduct from starbase inventory
        if (Object.keys(totalCost).length > 0) {
            const success = consumeFromInventory(totalCost);
            if (!success) {
                showNotification('Insufficient materials in starbase inventory!', 'error');
                return;
            }
        }

        console.log('🔨 FINALIZING DESIGN:', {
            plotId: selectedPlotId,
            habTier,
            buildingsCount: currentDesign.length,
            buildings: currentDesign.map(b => ({ id: b.id, type: b.type, buildingId: b.buildingId })),
            stats: currentStats,
            resourcesConsumed: totalCost
        });

        const updatedPlots = (prev: HabPlot[]) => prev.map((plot: HabPlot) => {
            if (plot.id === selectedPlotId) {
                const updatedPlot = {
                    ...plot,
                    habDesign: {
                        habTier: parseInt(habTier as string),
                        buildings: currentDesign,
                        totalSlots: currentStats.totalSlots,
                        craftingSpeed: currentStats.craftingSpeed,
                        storageBonus: 0,
                        unlockedRecipes: currentStats.unlockedRecipes,
                        totalJobSlots: currentStats.jobSlots  // Add this to save job slots
                    }
                };
                console.log('✅ PLOT UPDATED:', updatedPlot);
                return updatedPlot;
            }
            return plot;
        });

        setHabPlots(updatedPlots);
        setDesignMode(false);
        showNotification('Hab construction completed! Resources consumed.', 'success');
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
                resource: selectedRecipe.output?.resource || selectedRecipe.id,
                quantity: (selectedRecipe.output?.quantity || 1) * craftQuantity
            }
        };

        setCraftingJobs([...craftingJobs, newJob]);
        setSelectedRecipe(null);
        setCraftQuantity(1);

        // Achievement tracking
        if (activeJobs.length >= 10) {
            unlockAchievement('production_line');
            showNotification('🏆 Production Line! You\'re running 10 crafting jobs simultaneously!', 'success', 5000);
        } else if (activeJobs.length > 0) {
            updateAchievementProgress('production_line', activeJobs.length, 10);
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

    // Clear completed job (resources already added automatically)
    const clearCompletedJob = (jobId: string) => {
        const job = craftingJobs.find(j => j.id === jobId);
        if (!job || job.status !== 'completed') return;

        // Just remove the job from the list (resources were already added when it completed)
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
    };

    // Helper functions
    const toggleFavorite = (recipeId: string) => {
        setFavoriteRecipes(prev =>
            prev.includes(recipeId)
                ? prev.filter(id => id !== recipeId)
                : [...prev, recipeId]
        );
    };

    const addToRecentRecipes = (recipeId: string) => {
        setRecentRecipes(prev => {
            const updated = [recipeId, ...prev.filter(id => id !== recipeId)];
            return updated.slice(0, 10); // Keep last 10
        });
    };

    // Enhanced filtering logic
    const enhancedFilteredRecipes = recipes.filter((recipe: Recipe) => {
        // Category filter - use outputType from the recipe
        if (categoryFilter !== 'all') {
            const recipeType = (recipe as any).outputType || recipe.type;
            if (recipeType !== categoryFilter) return false;
        }

        // Search filter
        if (searchTerm && !recipe.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;

        // Tier filter
        if (tierFilter !== null && recipe.tier !== tierFilter) return false;

        // Craftable only filter
        if (canCraftFilter) {
            const canCraft = recipe.ingredients && Array.isArray(recipe.ingredients) &&
                recipe.ingredients.every((ing: any) =>
                    (sharedState.starbaseInventory[ing.resource] || 0) >= ing.quantity
                );
            if (!canCraft) return false;
        }

        // Favorites filter
        if (showFavorites && !favoriteRecipes.includes(recipe.id)) return false;

        // Resource filter
        if (resourceFilter) {
            const hasResource = recipe.ingredients && Array.isArray(recipe.ingredients) &&
                recipe.ingredients.some((ing: any) =>
                    ing.resource.toLowerCase().includes(resourceFilter.toLowerCase())
                );
            if (!hasResource) return false;
        }

        return true;
    });

    // Check if selected recipe can be crafted
    const canCraftSelected = selectedRecipe && selectedRecipe.ingredients &&
        Array.isArray(selectedRecipe.ingredients) &&
        selectedRecipe.ingredients.every((ing: any) =>
            (sharedState.starbaseInventory[ing.resource] || 0) >= ing.quantity * craftQuantity
        );

    if (loading) {
        return <div className="loading-screen">Loading game data...</div>;
    }

    return (
        <div className="crafting-hab-app">
            {/* Only render Navigation in dev mode, not in standalone */}
            {typeof window !== 'undefined' && !(window as any).__STANDALONE_BUILD__ && (
                <Navigation />
            )}

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
                                onClick={() => setSelectedStarbaseId(starbase.id)}
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
                            <div className="inventory-header">
                                <h3>📦 Inventory</h3>
                                <span className="inventory-count">
                                    {Object.entries(selectedStarbase.inventory).filter(([_, amount]) => amount > 0).length} types
                                </span>
                            </div>
                            <div className="resource-grid">
                                {Object.entries(selectedStarbase.inventory)
                                    .filter(([resource, amount]) => amount > 0) // Only show resources with amount > 0
                                    .sort(([a], [b]) => a.localeCompare(b))
                                    .map(([resource, amount]) => {
                                        // Format resource name for display
                                        const resourceData = gameData?.resources?.find((r: any) => r.id === resource);
                                        const cleanResource = resourceData?.name || resource;
                                        const displayName = cleanResource
                                            .split('-')
                                            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                                            .join(' ');

                                        return (
                                            <div key={resource} className="resource-card">
                                                <div className="resource-icon">
                                                    {resource.includes('ore') ? '⛏️' :
                                                        resource.includes('fuel') ? '⚡' :
                                                            resource.includes('electronics') ? '🔌' :
                                                                resource.includes('circuit') ? '🔧' :
                                                                    resource.includes('steel') ? '🔩' :
                                                                        resource.includes('copper') ? '🟠' :
                                                                            resource.includes('iron') ? '⚙️' :
                                                                                resource.includes('silica') ? '💎' :
                                                                                    resource.includes('hydrogen') ? '💧' :
                                                                                        '📦'}
                                                </div>
                                                <div className="resource-info">
                                                    <div className="resource-name">{displayName}</div>
                                                    <div className="resource-amount">{amount.toLocaleString()}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                            <button
                                className="btn btn-magic"
                                onClick={() => {
                                    // Magic resources - only add raw materials (BASIC RESOURCE types)
                                    const magicResources: Record<string, number> = {};

                                    // Only add raw resources from gameData
                                    const rawResources = gameData?.resources?.filter((r: any) => r.category === 'raw') || [];
                                    const extractableResources = rawResources.map((r: any) => r.id);

                                    extractableResources.forEach((resource: string) => {
                                        magicResources[resource] = 1000;
                                    });

                                    addToInventory(magicResources);
                                    showNotification('✨ Raw materials added!', 'success');
                                }}
                            >
                                🪄 ADD RAW MATERIALS
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

                                {/* View Mode Tabs */}
                                <div className="view-mode-tabs">
                                    <button
                                        className={`view-tab ${viewMode === 'overview' ? 'active' : ''}`}
                                        onClick={() => setViewMode('overview')}
                                    >
                                        📊 Overview
                                    </button>
                                    <button
                                        className={`view-tab ${viewMode === 'construction' ? 'active' : ''}`}
                                        onClick={() => setViewMode('construction')}
                                        disabled={!habPlots.some(p => p.isOwned)}
                                    >
                                        🔨 Construction
                                    </button>
                                    <button
                                        className={`view-tab ${viewMode === 'crafting' ? 'active' : ''}`}
                                        onClick={() => setViewMode('crafting')}
                                        disabled={!habPlots.some(p => p.isOwned && p.habDesign)}
                                    >
                                        ⚙️ Crafting
                                    </button>
                                </div>
                            </div>

                            {/* Plot Selector (always visible for owned plots) */}
                            {habPlots.some(p => p.isOwned) && (
                                <div className="plot-selector-bar">
                                    <label>Select Plot:</label>
                                    <div className="plot-tabs">
                                        {habPlots.filter(p => p.isOwned).map(plot => {
                                            const stats = plot.habDesign ? calculateHabStats(plot.habDesign.buildings) : null;
                                            const activeJobs = craftingJobs.filter(j => j.habPlotId === plot.id && j.status !== 'completed').length;

                                            return (
                                                <button
                                                    key={plot.id}
                                                    className={`plot-tab ${selectedPlotId === plot.id ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setSelectedPlotId(plot.id);
                                                        // If plot needs setup, always go to construction tab
                                                        if (!plot.habDesign) {
                                                            setViewMode('construction');
                                                            // Automatically enter design mode for new plots
                                                            setDesignMode(true);
                                                            setCurrentDesign([]);
                                                        } else {
                                                            // If plot has design, don't automatically enter design mode
                                                            setDesignMode(false);
                                                        }
                                                    }}
                                                >
                                                    <span className="plot-tab-tier">T{plot.tier}</span>
                                                    <span className="plot-tab-status">
                                                        {plot.habDesign ? (
                                                            <>
                                                                🏭 {activeJobs}/{stats?.jobSlots || 0} jobs
                                                            </>
                                                        ) : (
                                                            '🔨 Setup needed'
                                                        )}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                        <button
                                            className="plot-tab new-plot"
                                            onClick={() => setViewMode('overview')}
                                        >
                                            + Add Plot
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* View Content */}
                            {viewMode === 'overview' && (
                                <div className="overview-view">
                                    <div className="overview-sections">
                                        {/* Available Plots Section */}
                                        <div className="overview-section">
                                            <h3>Available Plots</h3>
                                            <div className="plot-grid compact">
                                                {habPlots.map(plot => {
                                                    const isOwned = plot.isOwned;
                                                    const stats = plot.habDesign ? calculateHabStats(plot.habDesign.buildings) : null;
                                                    const activeJobs = craftingJobs.filter(j => j.habPlotId === plot.id && j.status !== 'completed').length;

                                                    return (
                                                        <div
                                                            key={plot.id}
                                                            className={`plot-overview-card ${isOwned ? 'owned' : 'available'}`}
                                                            onClick={() => {
                                                                if (isOwned) {
                                                                    setSelectedPlotId(plot.id);
                                                                    if (plot.habDesign) {
                                                                        setViewMode('crafting');
                                                                        setDesignMode(false);
                                                                    } else {
                                                                        setViewMode('construction');
                                                                        setDesignMode(true);
                                                                        setCurrentDesign([]);
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <div className="plot-overview-header">
                                                                <span className="plot-tier-badge">T{plot.tier}</span>
                                                                {isOwned ? (
                                                                    <span className="plot-status-badge owned">Owned</span>
                                                                ) : (
                                                                    <button
                                                                        className="btn btn-xs btn-primary"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            selectPlot(plot.id);
                                                                        }}
                                                                    >
                                                                        Build Here
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {isOwned && (
                                                                <div className="plot-overview-stats">
                                                                    {plot.habDesign ? (
                                                                        <>
                                                                            <div>Jobs: {activeJobs}/{stats?.jobSlots || 0}</div>
                                                                            <div>Speed: {((stats?.craftingSpeed || 1) * 100).toFixed(0)}%</div>
                                                                        </>
                                                                    ) : (
                                                                        <div className="needs-setup">Needs Setup</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Active Jobs Summary */}
                                        {craftingJobs.filter(j => j.status !== 'completed').length > 0 && (
                                            <div className="overview-section">
                                                <h3>Active Crafting Jobs</h3>
                                                <div className="jobs-summary">
                                                    {craftingJobs
                                                        .filter(j => j.status !== 'completed')
                                                        .map(job => {
                                                            const plot = habPlots.find(p => p.id === job.habPlotId);
                                                            const recipe = recipes.find(r => r.id === job.recipeId);

                                                            return (
                                                                <div key={job.id} className="job-summary-card">
                                                                    <div className="job-header">
                                                                        <span className="job-recipe">{recipe?.name || job.recipeId}</span>
                                                                        <span className="job-plot">Plot T{plot?.tier}</span>
                                                                    </div>
                                                                    <div className="job-progress">
                                                                        <div className="progress-bar">
                                                                            <div
                                                                                className="progress-fill"
                                                                                style={{ width: `${job.progress}%` }}
                                                                            />
                                                                        </div>
                                                                        <span className="progress-text">{job.progress.toFixed(0)}%</span>
                                                                    </div>
                                                                    {job.output && (
                                                                        <div className="job-output">
                                                                            Output: {job.output.quantity}x {job.output.resource}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Production Statistics */}
                                        <div className="overview-section">
                                            <h3>Production Statistics</h3>
                                            <div className="stats-grid">
                                                <div className="stat-card">
                                                    <span className="stat-label">Total Plots</span>
                                                    <span className="stat-value">{habPlots.filter(p => p.isOwned).length}</span>
                                                </div>
                                                <div className="stat-card">
                                                    <span className="stat-label">Active Jobs</span>
                                                    <span className="stat-value">{craftingJobs.filter(j => j.status === 'active').length}</span>
                                                </div>
                                                <div className="stat-card">
                                                    <span className="stat-label">Completed Jobs</span>
                                                    <span className="stat-value">{craftingJobs.filter(j => j.status === 'completed').length}</span>
                                                </div>
                                                <div className="stat-card">
                                                    <span className="stat-label">Total Job Slots</span>
                                                    <span className="stat-value">
                                                        {habPlots
                                                            .filter(p => p.isOwned && p.habDesign)
                                                            .reduce((sum, p) => sum + (calculateHabStats(p.habDesign!.buildings).jobSlots || 0), 0)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Construction View */}
                            {viewMode === 'construction' && selectedPlot && (
                                <div className="construction-view">
                                    <div className="construction-header">
                                        <h3>Construction - Plot T{selectedPlot.tier}</h3>

                                        {/* Action Buttons in Header */}
                                        <div className="header-actions">
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
                                                        disabled={!currentDesign.find(b => b.type === 'hab') || (() => {
                                                            // Check if we have all resources
                                                            const totalCost: Record<string, number> = {};
                                                            currentDesign.forEach(pb => {
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

                                                            // Check resource availability
                                                            for (const [resource, needed] of Object.entries(totalCost)) {
                                                                const available = sharedState.starbaseInventory[resource] || 0;
                                                                if (available < needed) {
                                                                    return true; // Disabled if missing resources
                                                                }
                                                            }
                                                            return false;
                                                        })()}
                                                        title={!currentDesign.find(b => b.type === 'hab') ? 'Add a hab first' : 'Finalize and start operation'}
                                                    >
                                                        Finalize Design
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    className="btn btn-secondary"
                                                    onClick={() => {
                                                        setDesignMode(true);
                                                        // If plot has a design, load it. Otherwise start fresh
                                                        if (selectedPlot.habDesign) {
                                                            setCurrentDesign([...(selectedPlot.habDesign?.buildings || [])]);
                                                        } else {
                                                            setCurrentDesign([]);
                                                        }
                                                    }}
                                                >
                                                    {selectedPlot.habDesign ? 'Continue Construction' : 'Start Construction'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Design Summary (Moved to Top) */}
                                    {designMode && currentDesign.length > 0 && (() => {
                                        const totalCost: Record<string, number> = {};
                                        const missingResources: Record<string, { needed: number, available: number }> = {};
                                        let hasAllResources = true;

                                        currentDesign.forEach(pb => {
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

                                        // Check resource availability
                                        Object.entries(totalCost).forEach(([resource, needed]) => {
                                            const available = sharedState.starbaseInventory[resource] || 0;
                                            if (available < needed) {
                                                missingResources[resource] = { needed, available };
                                                hasAllResources = false;
                                            }
                                        });

                                        const stats = calculateHabStats(currentDesign);

                                        return (
                                            <div className="design-summary-top">
                                                <h3>Design Overview</h3>
                                                <div className="design-stats-row">
                                                    <div className="stat-card">
                                                        <span className="stat-label">Slots</span>
                                                        <span className={`stat-value ${stats && stats.usedSlots > stats.totalSlots ? 'error' : ''}`}>
                                                            {stats?.usedSlots || 0}/{stats?.totalSlots || 0}
                                                        </span>
                                                    </div>
                                                    <div className="stat-card">
                                                        <span className="stat-label">Job Slots</span>
                                                        <span className="stat-value">
                                                            {stats?.jobSlots || 0}
                                                        </span>
                                                    </div>
                                                    <div className="stat-card">
                                                        <span className="stat-label">Speed</span>
                                                        <span className="stat-value positive">
                                                            {((stats?.craftingSpeed || 1) * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </div>

                                                {Object.keys(totalCost).length > 0 && (
                                                    <div className="construction-requirements">
                                                        <h4>Construction Requirements</h4>
                                                        <div className="resource-requirements">
                                                            {Object.entries(totalCost).map(([resource, needed]) => {
                                                                const available = sharedState.starbaseInventory[resource] || 0;
                                                                const sufficient = available >= needed;
                                                                return (
                                                                    <div key={resource} className={`resource-requirement ${sufficient ? 'sufficient' : 'insufficient'}`}>
                                                                        <span className="resource-name">{resource}</span>
                                                                        <span className="resource-amounts">
                                                                            <span className={sufficient ? 'amount-ok' : 'amount-short'}>
                                                                                {available}
                                                                            </span>
                                                                            <span className="separator">/</span>
                                                                            <span className="amount-needed">{needed}</span>
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {!hasAllResources && (
                                                            <div className="missing-resources-actions">
                                                                <div className="warning-message">
                                                                    ⚠️ Insufficient resources to finalize construction
                                                                </div>
                                                                <button
                                                                    className="btn btn-secondary btn-sm"
                                                                    onClick={() => {
                                                                        const toAdd: Record<string, number> = {};
                                                                        Object.entries(missingResources).forEach(([resource, data]) => {
                                                                            toAdd[resource] = data.needed - data.available;
                                                                        });
                                                                        addToInventory(toAdd);
                                                                        showNotification('Added missing resources to starbase inventory');
                                                                    }}
                                                                >
                                                                    🪄 Add Missing Resources (Simulator)
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

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
                                </div>
                            )}

                            {/* Crafting View */}
                            {viewMode === 'crafting' && selectedPlot?.habDesign && (
                                <div className="crafting-interface-enhanced">
                                    {/* Advanced Filters Sidebar */}
                                    <div className="recipe-filters-panel">
                                        <h4>Filters</h4>

                                        <div className="filter-section">
                                            <label>Search</label>
                                            <input
                                                type="text"
                                                placeholder="Recipe name..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="filter-input"
                                            />
                                        </div>

                                        <div className="filter-section">
                                            <label>Category</label>
                                            <select
                                                value={categoryFilter}
                                                onChange={(e) => setCategoryFilter(e.target.value)}
                                                className="filter-select"
                                            >
                                                <option value="all">All Categories</option>
                                                <option value="COMPONENT">Component</option>
                                                <option value="INGREDIENT">Ingredient</option>
                                                <option value="SHIP_COMPONENTS">Ship Components</option>
                                                <option value="SHIP_MODULES">Ship Modules</option>
                                                <option value="SHIP_WEAPONS">Ship Weapons</option>
                                                <option value="COUNTERMEASURES">Countermeasures</option>
                                                <option value="MISSILES">Missiles</option>
                                                <option value="DRONE">Drone</option>
                                                <option value="R4">R4</option>
                                            </select>
                                        </div>

                                        <div className="filter-section">
                                            <label>Tier</label>
                                            <div className="tier-filters">
                                                {[1, 2, 3, 4, 5].map(tier => (
                                                    <button
                                                        key={tier}
                                                        className={`tier-btn ${tierFilter === tier ? 'active' : ''}`}
                                                        onClick={() => setTierFilter(tierFilter === tier ? null : tier)}
                                                    >
                                                        T{tier}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="filter-section">
                                            <label>Status</label>
                                            <div className="status-filters">
                                                <label className="checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={canCraftFilter}
                                                        onChange={(e) => setCanCraftFilter(e.target.checked)}
                                                    />
                                                    <span>Craftable Only</span>
                                                </label>
                                                <label className="checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={showFavorites}
                                                        onChange={(e) => setShowFavorites(e.target.checked)}
                                                    />
                                                    <span>Favorites ⭐</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="filter-section">
                                            <label>Contains Resource</label>
                                            <input
                                                type="text"
                                                placeholder="e.g., copper, iron..."
                                                value={resourceFilter}
                                                onChange={(e) => setResourceFilter(e.target.value)}
                                                className="filter-input"
                                            />
                                        </div>

                                        <div className="filter-actions">
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => {
                                                    setSearchTerm('');
                                                    setCategoryFilter('all');
                                                    setTierFilter(null);
                                                    setCanCraftFilter(false);
                                                    setShowFavorites(false);
                                                    setResourceFilter('');
                                                }}
                                            >
                                                Clear Filters
                                            </button>
                                        </div>

                                        <div className="filter-stats">
                                            <small>{enhancedFilteredRecipes.length} of {recipes.length} recipes</small>
                                        </div>
                                    </div>

                                    {/* Recipe List */}
                                    <div className="recipe-list-panel">
                                        <div className="recipe-list-header">
                                            <h3>Recipes</h3>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => {
                                                    const queueStr = localStorage.getItem('craftingQueue');
                                                    if (queueStr) {
                                                        const queue = JSON.parse(queueStr);
                                                        if (queue.length > 0) {
                                                            const plan = queue[0];
                                                            setSelectedRecipe(plan.recipe);
                                                            setCraftQuantity(plan.quantity);
                                                            queue.shift();
                                                            localStorage.setItem('craftingQueue', JSON.stringify(queue));
                                                            showNotification(`Loaded: ${plan.recipe.name} x${plan.quantity}`, 'info');
                                                        } else {
                                                            showNotification('No recipes in queue', 'warning');
                                                        }
                                                    }
                                                }}
                                            >
                                                📥 Import Queue
                                            </button>
                                        </div>

                                        {/* Recently Used */}
                                        {recentRecipes.length > 0 && (
                                            <div className="recent-recipes">
                                                <h5>Recently Used</h5>
                                                <div className="recent-list">
                                                    {recentRecipes.slice(0, 3).map(recipeId => {
                                                        const recipe = recipes.find(r => r.id === recipeId);
                                                        if (!recipe) return null;
                                                        return (
                                                            <button
                                                                key={recipe.id}
                                                                className="recent-chip"
                                                                onClick={() => setSelectedRecipe(recipe)}
                                                            >
                                                                {recipe.name}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Virtualized Recipe List */}
                                        <div className="recipe-list-scrollable">
                                            {enhancedFilteredRecipes.length === 0 ? (
                                                <div className="no-results">
                                                    <p>No recipes match your filters</p>
                                                    <button
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() => {
                                                            setSearchTerm('');
                                                            setCategoryFilter('all');
                                                            setTierFilter(null);
                                                            setCanCraftFilter(false);
                                                            setShowFavorites(false);
                                                            setResourceFilter('');
                                                        }}
                                                    >
                                                        Clear Filters
                                                    </button>
                                                </div>
                                            ) : (
                                                enhancedFilteredRecipes.map(recipe => {
                                                    const canCraft = recipe.ingredients && Array.isArray(recipe.ingredients) &&
                                                        recipe.ingredients.every(ing =>
                                                            (sharedState.starbaseInventory[ing.resource] || 0) >= ing.quantity
                                                        );
                                                    const isFavorite = favoriteRecipes.includes(recipe.id);

                                                    return (
                                                        <div
                                                            key={recipe.id}
                                                            className={`recipe-list-item ${selectedRecipe?.id === recipe.id ? 'selected' : ''} ${!canCraft ? 'cannot-craft' : ''}`}
                                                            onClick={() => setSelectedRecipe(recipe)}
                                                        >
                                                            <div className="recipe-item-header">
                                                                <span className="recipe-name">{recipe.name}</span>
                                                                <div className="recipe-badges">
                                                                    <span className="tier-badge">T{recipe.tier}</span>
                                                                    {canCraft && <span className="craftable-badge">✓</span>}
                                                                    <button
                                                                        className={`favorite-btn ${isFavorite ? 'active' : ''}`}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleFavorite(recipe.id);
                                                                        }}
                                                                    >
                                                                        {isFavorite ? '⭐' : '☆'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="recipe-item-details">
                                                                <span className="recipe-output">
                                                                    → {recipe.output?.quantity || 0} {recipe.output?.resource || ''}
                                                                </span>
                                                                <span className="recipe-time">{recipe.constructionTime}s</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    {/* Recipe Details Panel */}
                                    <div className="recipe-details-panel">
                                        {selectedRecipe ? (
                                            <>
                                                <div className="recipe-details-header">
                                                    <h3>{selectedRecipe.name}</h3>
                                                    <span className="tier-badge large">Tier {selectedRecipe.tier}</span>
                                                </div>

                                                <div className="recipe-details-content">
                                                    <div className="ingredients-section">
                                                        <h4>Ingredients Required</h4>
                                                        <div className="ingredients-list">
                                                            {selectedRecipe.ingredients && Array.isArray(selectedRecipe.ingredients) &&
                                                                selectedRecipe.ingredients.map(ing => {
                                                                    const available = sharedState.starbaseInventory[ing.resource] || 0;
                                                                    const needed = ing.quantity * craftQuantity;
                                                                    const hasEnough = available >= needed;

                                                                    // Check if this ingredient is a raw material (no recipe)
                                                                    const ingredientResource = gameData?.resources?.find((r: any) => r.id === ing.resource);
                                                                    const isRawMaterial = ingredientResource?.category === 'raw';

                                                                    return (
                                                                        <div key={ing.resource} className={`ingredient-row ${!hasEnough ? 'insufficient' : ''} ${isRawMaterial ? 'raw-material' : ''}`}>
                                                                            <span className="ingredient-name" style={isRawMaterial ? { color: '#4CAF50' } : {}}>
                                                                                {ing.resource}
                                                                            </span>
                                                                            <span className="ingredient-amount">
                                                                                <span className={hasEnough ? 'has-enough' : 'not-enough'}>
                                                                                    {available}
                                                                                </span>
                                                                                / {needed}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                        </div>
                                                    </div>

                                                    <div className="output-section">
                                                        <h4>Output</h4>
                                                        <div className="output-info">
                                                            <span className="output-amount">
                                                                {(selectedRecipe.output?.quantity || 0) * craftQuantity}x
                                                            </span>
                                                            <span className="output-resource">
                                                                {selectedRecipe.output?.resource || ''}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="craft-config">
                                                        <div className="quantity-control">
                                                            <label>Quantity</label>
                                                            <div className="quantity-input-group">
                                                                <button
                                                                    className="qty-btn"
                                                                    onClick={() => setCraftQuantity(Math.max(1, craftQuantity - 1))}
                                                                >
                                                                    -
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="100"
                                                                    value={craftQuantity}
                                                                    onChange={(e) => setCraftQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                                                    className="qty-input"
                                                                />
                                                                <button
                                                                    className="qty-btn"
                                                                    onClick={() => setCraftQuantity(Math.min(100, craftQuantity + 1))}
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                            <div className="quick-qty-buttons">
                                                                <button onClick={() => setCraftQuantity(1)} className="quick-qty">1</button>
                                                                <button onClick={() => setCraftQuantity(5)} className="quick-qty">5</button>
                                                                <button onClick={() => setCraftQuantity(10)} className="quick-qty">10</button>
                                                                <button onClick={() => setCraftQuantity(25)} className="quick-qty">25</button>
                                                                <button onClick={() => {
                                                                    // Calculate max craftable
                                                                    const maxCraftable = selectedRecipe.ingredients ?
                                                                        Math.min(...selectedRecipe.ingredients.map(ing =>
                                                                            Math.floor((sharedState.starbaseInventory[ing.resource] || 0) / ing.quantity)
                                                                        )) : 0;
                                                                    setCraftQuantity(Math.min(100, Math.max(1, maxCraftable)));
                                                                }} className="quick-qty">MAX</button>
                                                            </div>
                                                        </div>

                                                        <div className="time-section">
                                                            <label>Crafting Time</label>
                                                            <div className="time-info">
                                                                <span className="time-value">
                                                                    {Math.ceil(selectedRecipe.constructionTime * craftQuantity / (currentStats?.craftingSpeed || 1))}s
                                                                </span>
                                                                {currentStats?.craftingSpeed && currentStats.craftingSpeed !== 1 && (
                                                                    <span className="speed-bonus">
                                                                        ({(currentStats.craftingSpeed * 100).toFixed(0)}% speed)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* <div className="priority-section">
                                                            <label>Priority</label>
                                                            <div className="priority-buttons">
                                                                <button
                                                                    className={`priority-btn ${craftPriority === 'low' ? 'active' : ''}`}
                                                                    onClick={() => setCraftPriority('low')}
                                                                >
                                                                    🐢 Low
                                                                </button>
                                                                <button
                                                                    className={`priority-btn ${craftPriority === 'normal' ? 'active' : ''}`}
                                                                    onClick={() => setCraftPriority('normal')}
                                                                >
                                                                    Normal
                                                                </button>
                                                                <button
                                                                    className={`priority-btn ${craftPriority === 'high' ? 'active' : ''}`}
                                                                    onClick={() => setCraftPriority('high')}
                                                                >
                                                                    ⚡ High
                                                                </button>
                                                            </div>
                                                        </div> */}

                                                        <button
                                                            className="btn btn-primary btn-large"
                                                            onClick={() => {
                                                                startCraftingJob(craftPriority);
                                                                addToRecentRecipes(selectedRecipe.id);
                                                            }}
                                                            disabled={!canCraftSelected}
                                                        >
                                                            {canCraftSelected ? 'Start Crafting' : 'Insufficient Resources'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="no-recipe-selected">
                                                <h3>Select a Recipe</h3>
                                                <p>Choose a recipe from the list to view details and start crafting</p>

                                                {enhancedFilteredRecipes.length === 0 && (
                                                    <p className="hint">No recipes match your current filters. Try adjusting them.</p>
                                                )}
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
                    {habPlots.filter(p => p.isOwned).length > 0 && (
                        <div className="owned-plots-summary">
                            <h3>Your Hab Plots</h3>
                            <div className="plots-list">
                                {habPlots.filter(p => p.isOwned).map(plot => {
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
                        <h3>Active Jobs ({craftingJobs.length})</h3>
                        <div className="job-actions-bar">
                            {craftingJobs.filter(j => j.status === 'completed').length > 0 && (
                                <button
                                    className="btn btn-xs btn-success"
                                    onClick={() => {
                                        const completedJobs = craftingJobs.filter(j => j.status === 'completed');
                                        // Resources already added when jobs completed, just clear them
                                        setCraftingJobs(prev => prev.filter(j => j.status !== 'completed'));
                                        showNotification(`Cleared ${completedJobs.length} completed jobs!`, 'info');
                                    }}
                                >
                                    Clear Completed ({craftingJobs.filter(j => j.status === 'completed').length})
                                </button>
                            )}
                            {craftingJobs.length > 0 && (
                                <button
                                    className="btn btn-xs btn-danger"
                                    onClick={() => {
                                        if (confirm('Clear all jobs? This will cancel active jobs and remove completed ones.')) {
                                            // Resources already added for completed jobs, just clear all
                                            setCraftingJobs([]);
                                            showNotification('All jobs cleared', 'info');
                                        }
                                    }}
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="job-queue compact">
                        {craftingJobs.map(job => {
                            const recipe = recipes.find(r => r.id === job.recipeId);
                            const plot = habPlots.find(p => p.id === job.habPlotId);

                            return (
                                <div key={job.id} className={`job-card-compact ${job.status} ${job.priority || 'normal'}-priority`}>
                                    <div className="job-main">
                                        <div className="job-info">
                                            <span className="job-name">{recipe?.name}</span>
                                            <span className="job-quantity">×{job.quantity}</span>
                                            {job.priority === 'high' && <span className="priority-icon">⚡</span>}
                                            {job.priority === 'low' && <span className="priority-icon">🐢</span>}
                                        </div>
                                        <div className="job-meta">
                                            <span className="job-plot">T{plot?.tier}</span>
                                            {job.status === 'active' && (
                                                <span className="job-time">{Math.ceil((100 - job.progress) / 100 * job.totalTime)}s</span>
                                            )}
                                            {job.status === 'completed' && <span className="job-done">✓</span>}
                                        </div>
                                    </div>
                                    <div className="job-progress">
                                        <div className="progress-bar-compact">
                                            <div
                                                className={`progress-fill ${job.status}`}
                                                style={{ width: `${job.progress}%` }}
                                            />
                                        </div>
                                        <span className="progress-text">{job.progress.toFixed(0)}%</span>
                                    </div>
                                    <div className="job-controls">
                                        {job.status === 'completed' && (
                                            <button
                                                className="btn-icon btn-success"
                                                onClick={() => clearCompletedJob(job.id)}
                                                title="Clear"
                                            >
                                                ✓
                                            </button>
                                        )}
                                        {(job.status === 'active' || job.status === 'paused') && (
                                            <>
                                                <button
                                                    className="btn-icon"
                                                    onClick={() => toggleJobPause(job.id)}
                                                    title={job.status === 'active' ? 'Pause' : 'Resume'}
                                                >
                                                    {job.status === 'active' ? '⏸' : '▶'}
                                                </button>
                                                <button
                                                    className="btn-icon btn-danger"
                                                    onClick={() => {
                                                        if (confirm(`Cancel job? ${job.progress < 100 ? 'You\'ll get 50% refund on remaining resources.' : ''}`)) {
                                                            cancelJob(job.id);
                                                        }
                                                    }}
                                                    title="Cancel"
                                                >
                                                    ✕
                                                </button>
                                            </>
                                        )}
                                        {job.status === 'queued' && (
                                            <button
                                                className="btn-icon btn-danger"
                                                onClick={() => cancelJob(job.id)}
                                                title="Cancel"
                                            >
                                                ✕
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