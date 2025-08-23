import React, { useState, useEffect, useRef } from 'react';
import { Navigation } from '../components/Navigation';
import { useGameData } from '../contexts/DataContext';
import { useSharedState, STARBASE_LEVELS, getAvailableHabPlots } from '../contexts/SharedStateContext';

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
    status: 'active' | 'paused' | 'completed';
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
    const { state: sharedState, updateStatistic, unlockAchievement, addToInventory, consumeFromInventory } = useSharedState();

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

    // Mock data - in real app would come from gameData
    const starbases: Starbase[] = [
        {
            id: 'sb_001',
            name: 'Unity Station',
            faction: 'MUD',
            level: sharedState.starbaseLevel,
            inventory: sharedState.starbaseInventory
        },
        { id: 'sb_002', name: 'Phoenix Hub', faction: 'ONI', level: 2, inventory: {} },
        { id: 'sb_003', name: 'Liberty Complex', faction: 'UST', level: 1, inventory: {} }
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

    const habBuildings = gameData?.habBuildings || {
        habs: [
            { id: 'hab-t1', name: 'Hab T1', tier: 1, slots: 10 },
            { id: 'hab-t2', name: 'Hab T2', tier: 2, slots: 15 },
            { id: 'hab-t3', name: 'Hab T3', tier: 3, slots: 20 },
            { id: 'hab-t4', name: 'Hab T4', tier: 4, slots: 25 },
            { id: 'hab-t5', name: 'Hab T5', tier: 5, slots: 30 }
        ],
        craftingStations: [
            { id: 'craft-xxs', name: 'Crafting Station XXS', size: 'XXS', speedBonus: 1.0, slots: 1 },
            { id: 'craft-xs', name: 'Crafting Station XS', size: 'XS', speedBonus: 1.1, slots: 2 },
            { id: 'craft-s', name: 'Crafting Station S', size: 'S', speedBonus: 1.2, slots: 3 },
            { id: 'craft-m', name: 'Crafting Station M', size: 'M', speedBonus: 1.3, slots: 5 }
        ],
        cargoStorage: [
            { id: 'cargo-t1', name: 'Cargo Storage T1', tier: 1, storageBonus: 100, jobSlots: 1 },
            { id: 'cargo-t2', name: 'Cargo Storage T2', tier: 2, storageBonus: 200, jobSlots: 2 },
            { id: 'cargo-t3', name: 'Cargo Storage T3', tier: 3, storageBonus: 400, jobSlots: 3 },
            { id: 'cargo-t4', name: 'Cargo Storage T4', tier: 4, storageBonus: 800, jobSlots: 4 },
            { id: 'cargo-t5', name: 'Cargo Storage T5', tier: 5, storageBonus: 1600, jobSlots: 5 }
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
                const hab = habBuildings.habs.find(h => h.id === building.buildingId);
                if (hab) totalSlots = hab.slots;
            } else if (building.type === 'crafting-station') {
                const station = habBuildings.craftingStations.find(s => s.id === building.buildingId);
                if (station) {
                    craftingSpeed *= station.speedBonus;
                    jobSlots += station.slots;
                }
            } else if (building.type === 'cargo-storage') {
                const storage = habBuildings.cargoStorage.find(s => s.id === building.buildingId);
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
    const startCraftingJob = () => {
        if (!selectedRecipe || !selectedPlot?.habDesign || craftQuantity <= 0) return;

        // Check resources
        const canCraft = selectedRecipe.ingredients && Array.isArray(selectedRecipe.ingredients) &&
            selectedRecipe.ingredients.every(ing =>
                (selectedStarbase?.inventory[ing.resource] || 0) >= ing.quantity * craftQuantity
            );

        if (!canCraft) {
            alert('Insufficient resources!');
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
            totalTime: selectedRecipe.constructionTime / (selectedPlot.habDesign.craftingSpeed || 1),
            startTime: Date.now(),
            crewAssigned: 10, // Mock crew
            status: 'active'
        };

        setCraftingJobs([...craftingJobs, newJob]);
        setSelectedRecipe(null);
        setCraftQuantity(1);
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
                                        </div>

                                        {/* Available Buildings */}
                                        {designMode && (
                                            <div className="available-buildings">
                                                <h4>Add Buildings</h4>

                                                {/* Hab Selection */}
                                                {!currentDesign.find(b => b.type === 'hab') && (
                                                    <div className="building-category">
                                                        <h5>Select Hab Tier</h5>
                                                        <div className="building-options">
                                                            {habBuildings.habs
                                                                .filter(hab => hab.tier <= selectedPlot.tier)
                                                                .map(hab => (
                                                                    <button
                                                                        key={hab.id}
                                                                        className="building-option"
                                                                        onClick={() => addBuilding(hab.id, 'hab')}
                                                                    >
                                                                        {hab.name}
                                                                    </button>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Other Buildings */}
                                                {currentDesign.find(b => b.type === 'hab') && (
                                                    <>
                                                        <div className="building-category">
                                                            <h5>Crafting Stations</h5>
                                                            <div className="building-options">
                                                                {habBuildings.craftingStations.map(station => (
                                                                    <button
                                                                        key={station.id}
                                                                        className="building-option"
                                                                        onClick={() => addBuilding(station.id, 'crafting-station', station.size)}
                                                                        disabled={currentStats ? currentStats.usedSlots >= currentStats.totalSlots : false}
                                                                    >
                                                                        {station.name}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="building-category">
                                                            <h5>Cargo Storage</h5>
                                                            <div className="building-options">
                                                                {habBuildings.cargoStorage
                                                                    .filter(storage => storage.tier <= selectedPlot.tier)
                                                                    .map(storage => (
                                                                        <button
                                                                            key={storage.id}
                                                                            className="building-option"
                                                                            onClick={() => addBuilding(storage.id, 'cargo-storage')}
                                                                            disabled={currentStats ? currentStats.usedSlots >= currentStats.totalSlots : false}
                                                                        >
                                                                            {storage.name}
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
                                                        (selectedStarbase?.inventory[ing.resource] || 0) >= ing.quantity
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
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={startCraftingJob}
                                                >
                                                    Start Crafting
                                                </button>
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
                    <h3>Active Jobs</h3>

                    <div className="job-queue">
                        {craftingJobs.map(job => {
                            const recipe = recipes.find(r => r.id === job.recipeId);
                            const plot = habPlots.find(p => p.id === job.habPlotId);

                            return (
                                <div key={job.id} className={`job-card ${job.status}`}>
                                    <div className="job-header">
                                        <h4>{recipe?.name}</h4>
                                        <span className="job-quantity">×{job.quantity}</span>
                                    </div>
                                    <div className="job-plot">Plot T{plot?.tier}</div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${job.progress}%` }}
                                        />
                                    </div>
                                    <div className="job-status">
                                        {job.status === 'active' && `${job.progress.toFixed(0)}%`}
                                        {job.status === 'completed' && '✓ Complete'}
                                    </div>
                                    {job.status === 'completed' && (
                                        <button
                                            className="btn btn-sm"
                                            onClick={() => {
                                                setCraftingJobs(craftingJobs.filter(j => j.id !== job.id));
                                            }}
                                        >
                                            Collect
                                        </button>
                                    )}
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