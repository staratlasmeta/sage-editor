import React, { useState, useRef, useEffect } from 'react';
import { Navigation } from '../components/Navigation';
import { StandaloneNavigation } from '../components/StandaloneNavigation';
import { useGameData } from '../contexts/DataContext';
import { useSharedState } from '../contexts/SharedStateContext';
import { NotificationSystem, useNotifications } from '../components/NotificationSystem';
import { RecipeTreeCanvas } from '../components/RecipeTreeCanvas';
import { RecipeSearch } from '../components/RecipeSearch';
import { RecipeAnalysis } from '../components/RecipeAnalysis';
import recipesStyles from '../styles/recipes.css?url';

export const links = () => [
    { rel: 'stylesheet', href: recipesStyles }
];

// Type definitions
interface Recipe {
    id: string;
    outputId?: string;  // From actual JSON
    name: string;
    outputName?: string;  // From actual JSON
    type: string;
    outputType?: string;  // From actual JSON
    tier: number;
    outputTier?: number;  // From actual JSON
    constructionTime: number;
    ingredients: { resource?: string; name?: string; quantity: number }[];
    output: { resource: string; quantity: number };
}

interface TreeNode {
    id: string;
    recipe: Recipe;
    x: number;
    y: number;
    children: TreeNode[];
    depth: number;
}

interface PathAnalysis {
    totalTime: number;
    totalResources: Record<string, number>;
    criticalPath: string[];
    efficiency: number;
}

interface BuildPlan {
    id: string;
    name: string;
    recipe: Recipe;
    quantity: number;
    analysis: PathAnalysis;
    created: number;
    notes?: string;
}

export default function Recipes() {
    const { gameData, loading } = useGameData();
    const { state: sharedState, dispatch } = useSharedState();
    const { notifications, showNotification, dismissNotification } = useNotifications();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [tierFilter, setTierFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [viewMode, setViewMode] = useState<'simple' | 'detailed'>('simple');
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [pathAnalysis, setPathAnalysis] = useState<PathAnalysis | null>(null);
    const [targetQuantity, setTargetQuantity] = useState(1);
    const [buildPlans, setBuildPlans] = useState<BuildPlan[]>([]);
    const [showBuildPlans, setShowBuildPlans] = useState(false);
    const [treeControls, setTreeControls] = useState<any>(null);
    const [currentZoom, setCurrentZoom] = useState(1);

    // Animation ref for potential future animations
    const animationRef = useRef<number | undefined>(undefined);

    // Load build plans from localStorage on mount
    useEffect(() => {
        const savedPlans = localStorage.getItem('recipeBuildPlans');
        if (savedPlans) {
            try {
                setBuildPlans(JSON.parse(savedPlans));
            } catch (e) {
                console.error('Failed to load build plans:', e);
            }
        }
    }, []);

    // Save build plan
    const saveBuildPlan = (name: string, notes?: string) => {
        if (!selectedRecipe || !pathAnalysis) return;

        const newPlan: BuildPlan = {
            id: `plan_${Date.now()}`,
            name,
            recipe: selectedRecipe,
            quantity: targetQuantity,
            analysis: pathAnalysis,
            created: Date.now(),
            notes
        };

        const updatedPlans = [...buildPlans, newPlan];
        setBuildPlans(updatedPlans);
        localStorage.setItem('recipeBuildPlans', JSON.stringify(updatedPlans));

        alert(`Build plan "${name}" saved!`);
    };

    // Load build plan
    const loadBuildPlan = (plan: BuildPlan) => {
        setSelectedRecipe(plan.recipe);
        setTargetQuantity(plan.quantity);
        setPathAnalysis(plan.analysis);
        setShowBuildPlans(false);
    };

    // Delete build plan
    const deleteBuildPlan = (planId: string) => {
        const updatedPlans = buildPlans.filter(p => p.id !== planId);
        setBuildPlans(updatedPlans);
        localStorage.setItem('recipeBuildPlans', JSON.stringify(updatedPlans));
    };

    // Get recipes from game data or use mock data
    const rawRecipes = gameData?.recipes || [];

    // Transform raw recipes to match our interface
    const recipes: Recipe[] = rawRecipes.length > 0 ? rawRecipes.map((r: any) => ({
        id: r.outputId || r.id,
        name: r.outputName || r.name,
        type: r.outputType || r.type || 'component',
        tier: r.outputTier || r.tier || 1,
        constructionTime: r.constructionTime || 60,
        ingredients: (r.ingredients || []).map((ing: any) => ({
            resource: ing.name || ing.resource,
            quantity: ing.quantity || 1
        })),
        output: {
            resource: r.outputId || r.id,
            quantity: r.outputQuantity || 1
        },
        // Keep original fields for reference
        outputId: r.outputId,
        outputName: r.outputName,
        outputType: r.outputType,
        outputTier: r.outputTier
    })) : [
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
                { resource: 'copper-wire', quantity: 5 },
                { resource: 'silica', quantity: 3 }
            ],
            output: { resource: 'circuit-board', quantity: 2 }
        },
        {
            id: 'comp_003',
            name: 'Copper Wire',
            type: 'component',
            tier: 1,
            constructionTime: 30,
            ingredients: [
                { resource: 'copper', quantity: 4 }
            ],
            output: { resource: 'copper-wire', quantity: 8 }
        },
        {
            id: 'comp_004',
            name: 'Steel Beam',
            type: 'component',
            tier: 2,
            constructionTime: 180,
            ingredients: [
                { resource: 'iron-plate', quantity: 4 },
                { resource: 'carbon', quantity: 2 }
            ],
            output: { resource: 'steel-beam', quantity: 2 }
        },
        {
            id: 'mod_001',
            name: 'Engine Module',
            type: 'module',
            tier: 3,
            constructionTime: 300,
            ingredients: [
                { resource: 'steel-beam', quantity: 3 },
                { resource: 'circuit-board', quantity: 2 },
                { resource: 'fuel-cell', quantity: 1 }
            ],
            output: { resource: 'engine-module', quantity: 1 }
        }
    ];

    // Filter recipes
    const filteredRecipes = recipes.filter(recipe => {
        if (searchTerm && !recipe.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (tierFilter !== 'all' && recipe.tier !== parseInt(tierFilter)) return false;
        if (typeFilter !== 'all' && recipe.type !== typeFilter) return false;
        return true;
    });

    // Build recipe tree
    const buildRecipeTree = (recipeId: string, depth = 0, visited = new Set<string>()): TreeNode | null => {
        if (visited.has(recipeId) || depth > 5) return null; // Prevent infinite loops
        visited.add(recipeId);

        // Try to find recipe by id or outputId
        const recipe = recipes.find(r => r.id === recipeId || r.outputId === recipeId);
        if (!recipe) {
            console.warn(`Recipe not found for id: ${recipeId}`);
            return null;
        }

        const children: TreeNode[] = [];

        // Find recipes that produce this recipe's ingredients
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
            recipe.ingredients.forEach(ingredient => {
                const ingredientResource = ingredient.resource || ingredient.name;
                // Log all recipes that might produce this resource
                console.log(`Looking for producer of ${ingredientResource}`);
                console.log('Available recipe outputs:', recipes.map(r => `${r.id} => ${r.output?.resource}`).join(', '));

                const producerRecipe = recipes.find(r => {
                    // Check if recipe outputs this ingredient
                    return r.output?.resource === ingredientResource ||
                        r.outputId === ingredientResource ||
                        r.id === ingredientResource ||
                        r.output?.resource === `recipe_${ingredientResource}` ||
                        `recipe_${r.output?.resource}` === ingredientResource;
                });
                if (producerRecipe) {
                    console.log(`Found producer for ${ingredientResource}: ${producerRecipe.name}`);
                    const childNode = buildRecipeTree(producerRecipe.id, depth + 1, new Set(visited));
                    if (childNode) {
                        children.push(childNode);
                    }
                } else {
                    // This is a raw material - create a leaf node for it
                    console.log(`${ingredientResource} is a raw material`);
                    children.push({
                        id: `raw_${ingredientResource}`,
                        recipe: {
                            id: `raw_${ingredientResource}`,
                            name: ingredientResource,
                            tier: 0,
                            type: 'raw',
                            ingredients: [],
                            output: {
                                resource: ingredientResource,
                                quantity: ingredient.quantity
                            }
                        } as any,
                        x: 0,
                        y: 0,
                        children: [],
                        depth: depth + 1
                    });
                }
            });
        }

        return {
            id: recipeId,
            recipe,
            x: 0,
            y: 0,
            children,
            depth
        };
    };

    // Calculate node positions
    const calculateNodePositions = (root: TreeNode, width: number, height: number) => {
        const levelHeight = 120;
        const nodesByLevel: Map<number, TreeNode[]> = new Map();

        // Collect nodes by level
        const collectNodes = (node: TreeNode) => {
            if (!nodesByLevel.has(node.depth)) {
                nodesByLevel.set(node.depth, []);
            }
            nodesByLevel.get(node.depth)!.push(node);
            node.children.forEach(collectNodes);
        };

        collectNodes(root);

        // Position nodes
        nodesByLevel.forEach((nodes, level) => {
            const levelWidth = width / (nodes.length + 1);
            nodes.forEach((node, index) => {
                node.x = levelWidth * (index + 1);
                node.y = height - (level + 1) * levelHeight;
            });
        });
    };

    // The drawing is now handled by RecipeTreeCanvas component

    // Calculate path analysis
    const calculatePathAnalysis = (recipe: Recipe, quantity: number): PathAnalysis => {
        const totalResources: Record<string, number> = {};
        const criticalPath: string[] = [];
        let totalTime = 0;
        let maxDepth = 0;

        const analyze = (r: Recipe, qty: number, depth = 0) => {
            const outputQty = r.output?.quantity || 1;
            const multiplier = qty / outputQty;
            totalTime += (r.constructionTime || 0) * multiplier;
            criticalPath.push(r.id);
            maxDepth = Math.max(maxDepth, depth);

            if (r.ingredients && Array.isArray(r.ingredients)) {
                r.ingredients.forEach(ing => {
                    const requiredQty = ing.quantity * multiplier;

                    // Try to find a recipe that produces this ingredient
                    const producerRecipe = recipes.find(rec => rec.output?.resource === ing.resource);
                    if (producerRecipe) {
                        analyze(producerRecipe, requiredQty, depth + 1);
                    } else {
                        // Raw material
                        totalResources[ing.resource] = (totalResources[ing.resource] || 0) + requiredQty;
                    }
                });
            }
        };

        analyze(recipe, quantity);

        // Calculate efficiency (simplified)
        const efficiency = Math.min(100, 100 - (maxDepth * 5));

        return {
            totalTime,
            totalResources,
            criticalPath,
            efficiency
        };
    };

    // Update analysis on recipe selection
    useEffect(() => {
        if (!selectedRecipe) return;

        // Calculate path analysis
        const analysis = calculatePathAnalysis(selectedRecipe, targetQuantity);
        setPathAnalysis(analysis);
    }, [selectedRecipe, targetQuantity]);

    if (loading) {
        return <div className="loading-screen">Loading game data...</div>;
    }

    return (
        <div className="recipes-app">
            {/* Render appropriate navigation based on build mode */}
            {typeof window !== 'undefined' && (window as any).__STANDALONE_BUILD__ ? (
                <StandaloneNavigation currentRoute="recipes" />
            ) : (
                <Navigation />
            )}

            <NotificationSystem
                notifications={notifications}
                onDismiss={dismissNotification}
            />

            <div className="recipes-content">
                {/* Left Sidebar - Recipe Browser */}
                <aside className="sidebar">
                    <RecipeSearch
                        recipes={recipes}
                        resources={gameData?.resources || []}
                        planets={gameData?.planets || []}
                        onRecipeSelect={(recipe) => {
                            setSelectedRecipe(recipe);
                            showNotification(`Selected recipe: ${recipe.name}`, 'info');
                        }}
                        onIngredientSearch={(ingredient, recipes) => {
                            showNotification(
                                `Found ${recipes.length} recipes using ${ingredient}`,
                                'info'
                            );
                        }}
                    />
                </aside>

                {/* Main Content - Tree Visualization */}
                <main className="main-content">
                    {selectedRecipe ? (
                        <div className="visualization-container">
                            <div className="visualization-header">
                                <h2>{selectedRecipe.name} - Recipe Tree</h2>
                                <div className="view-controls">
                                    <button
                                        className={`view-btn ${viewMode === 'simple' ? 'active' : ''}`}
                                        onClick={() => setViewMode('simple')}
                                    >
                                        Simple
                                    </button>
                                    <button
                                        className={`view-btn ${viewMode === 'detailed' ? 'active' : ''}`}
                                        onClick={() => setViewMode('detailed')}
                                    >
                                        Detailed
                                    </button>
                                </div>
                            </div>

                            <div className="tree-container">
                                <RecipeTreeCanvas
                                    recipe={selectedRecipe}
                                    recipes={recipes}
                                    planets={gameData?.planets || []}
                                    resources={gameData?.resources || []}
                                    quantity={targetQuantity}
                                    viewMode={viewMode}
                                    onNodeClick={(node) => {
                                        console.log('Node clicked:', node);
                                    }}
                                    onResourceAnalysis={(info) => {
                                        console.log('Resource analysis:', info);
                                    }}
                                    onControlsReady={(controls) => {
                                        setTreeControls(controls);
                                        if (controls.getZoom) {
                                            setCurrentZoom(controls.getZoom());
                                        }
                                    }}
                                />
                            </div>

                            {/* Enhanced Control Panel */}
                            <div className="control-panel">
                                <div className="control-group">
                                    <label>Target Quantity</label>
                                    <div className="control-input-group">
                                        <input
                                            type="number"
                                            min="1"
                                            max="1000"
                                            value={targetQuantity}
                                            onChange={(e) => setTargetQuantity(parseInt(e.target.value) || 1)}
                                        />
                                        <button className="quick-btn" onClick={() => setTargetQuantity(10)}>10</button>
                                        <button className="quick-btn" onClick={() => setTargetQuantity(100)}>100</button>
                                        <button className="quick-btn" onClick={() => setTargetQuantity(targetQuantity * 2)}>2x</button>
                                    </div>
                                </div>

                                <div className="control-group">
                                    <label>Zoom Level</label>
                                    <div className="control-slider">
                                        <input
                                            type="range"
                                            className="slider"
                                            min="0.5"
                                            max="2"
                                            step="0.1"
                                            value={currentZoom}
                                            onChange={(e) => {
                                                const zoom = parseFloat(e.target.value);
                                                setCurrentZoom(zoom);
                                                if (treeControls?.setZoom) {
                                                    treeControls.setZoom(zoom);
                                                }
                                            }}
                                        />
                                        <div className="slider-value">{Math.round(currentZoom * 100)}%</div>
                                    </div>
                                </div>

                                <div className="control-group">
                                    <label>Tree Controls</label>
                                    <div className="tree-controls">
                                        <button
                                            className="tree-control-btn"
                                            title="Reset View"
                                            onClick={() => {
                                                if (treeControls?.resetView) {
                                                    treeControls.resetView();
                                                    setCurrentZoom(1);
                                                }
                                            }}
                                        >⟲</button>
                                        <button
                                            className="tree-control-btn"
                                            title="Center Tree"
                                            onClick={() => treeControls?.centerTree?.()}
                                        >⊕</button>
                                        <button
                                            className="tree-control-btn"
                                            title="Fit to Screen"
                                            onClick={() => {
                                                if (treeControls?.fitToScreen) {
                                                    treeControls.fitToScreen();
                                                    if (treeControls.getZoom) {
                                                        setCurrentZoom(treeControls.getZoom());
                                                    }
                                                }
                                            }}
                                        >⛶</button>
                                        <button
                                            className="tree-control-btn"
                                            title="Export Image"
                                            onClick={() => treeControls?.exportImage?.()}
                                        >📷</button>
                                    </div>
                                </div>
                            </div>

                            {/* Resource Stats Panel */}
                            {pathAnalysis && (
                                <div className="resource-stats">
                                    <div className="stat-item">
                                        <span className="stat-label">Total Time</span>
                                        <span className="stat-value">{Math.round(pathAnalysis.totalTime)}s</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Efficiency</span>
                                        <span className="stat-value">{Math.round(pathAnalysis.efficiency * 100)}%</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Resources</span>
                                        <span className="stat-value">{Object.keys(pathAnalysis.totalResources).length}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Complexity</span>
                                        <span className="stat-value">{pathAnalysis.criticalPath.length} steps</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="empty-visualization">
                            <h2>Select a Recipe</h2>
                            <p>Choose a recipe from the browser to visualize its crafting tree</p>
                        </div>
                    )}
                </main>

                {/* Right Sidebar - Analysis */}
                <aside className="sidebar right">
                    {selectedRecipe ? (
                        <>
                            <RecipeAnalysis
                                recipe={selectedRecipe}
                                recipes={recipes}
                                planets={gameData?.planets || []}
                                quantity={targetQuantity}
                                starbaseInventory={sharedState.starbaseInventory}
                                resources={gameData?.resources || []}
                            />

                            <div className="action-buttons">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                        if (selectedRecipe && pathAnalysis) {
                                            // Find the best available hab plot for this recipe
                                            const craftingHabState = sharedState.craftingHabState;
                                            let bestPlot: any = null;
                                            let bestScore = -1;

                                            if (craftingHabState?.habPlots) {
                                                craftingHabState.habPlots.forEach((plot: any) => {
                                                    if (plot.isOwned && plot.habDesign) {
                                                        // Calculate score based on available job slots and speed
                                                        const activeJobs = (craftingHabState.craftingJobs || [])
                                                            .filter((job: any) => job.habPlotId === plot.id && job.status !== 'completed')
                                                            .length;
                                                        const availableSlots = (plot.habDesign.totalJobSlots || 1) - activeJobs;

                                                        if (availableSlots > 0) {
                                                            const score = availableSlots * (plot.habDesign.craftingSpeed || 1);
                                                            if (score > bestScore) {
                                                                bestScore = score;
                                                                bestPlot = plot;
                                                            }
                                                        }
                                                    }
                                                });
                                            }

                                            // Create recipe plan for queue
                                            const recipePlan = {
                                                id: `job_${Date.now()}`,
                                                recipe: selectedRecipe,
                                                recipeId: selectedRecipe.id,
                                                quantity: targetQuantity,
                                                requirements: pathAnalysis.totalResources,
                                                totalTime: pathAnalysis.totalTime,
                                                timestamp: Date.now(),
                                                habPlotId: bestPlot?.id || null,
                                                status: bestPlot ? 'queued' : 'pending',
                                                priority: 'normal'
                                            };

                                            // Add to shared state queue
                                            dispatch({
                                                type: 'ADD_TO_CRAFTING_QUEUE',
                                                payload: recipePlan
                                            });

                                            // Show notification
                                            if (bestPlot) {
                                                showNotification(
                                                    `Recipe "${selectedRecipe.name}" x${targetQuantity} added to Plot T${bestPlot.tier} queue!`,
                                                    'success'
                                                );
                                            } else {
                                                showNotification(
                                                    `Recipe "${selectedRecipe.name}" x${targetQuantity} added to queue (no hab plots available)`,
                                                    'warning'
                                                );
                                            }
                                        }
                                    }}
                                    disabled={!selectedRecipe || !pathAnalysis}
                                >
                                    Export to Queue
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        const name = prompt('Enter build plan name:');
                                        if (name) {
                                            const notes = prompt('Enter notes (optional):');
                                            saveBuildPlan(name, notes || undefined);
                                        }
                                    }}
                                    disabled={!selectedRecipe || !pathAnalysis}
                                >
                                    Save Build Plan
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowBuildPlans(!showBuildPlans)}
                                >
                                    📋 View Plans ({buildPlans.length})
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="empty-analysis">
                            <p>Select a recipe to see detailed analysis</p>
                        </div>
                    )}
                </aside>
            </div>

            {/* Build Plans Modal */}
            {showBuildPlans && (
                <div className="modal-overlay" onClick={() => setShowBuildPlans(false)}>
                    <div className="modal-content build-plans-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Saved Build Plans</h2>
                            <button className="close-button" onClick={() => setShowBuildPlans(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {buildPlans.length === 0 ? (
                                <p>No saved build plans yet.</p>
                            ) : (
                                <div className="build-plans-list">
                                    {buildPlans.map(plan => (
                                        <div key={plan.id} className="build-plan-card">
                                            <div className="plan-header">
                                                <h3>{plan.name}</h3>
                                                <span className="plan-date">
                                                    {new Date(plan.created).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="plan-details">
                                                <div>Recipe: {plan.recipe.name}</div>
                                                <div>Quantity: {plan.quantity}</div>
                                                <div>Time: {plan.analysis.totalTime}s</div>
                                                {plan.notes && <div className="plan-notes">Notes: {plan.notes}</div>}
                                            </div>
                                            <div className="plan-resources">
                                                <strong>Resources:</strong>
                                                {Object.entries(plan.analysis.totalResources).map(([res, amt]) => (
                                                    <span key={res} className="resource-chip">
                                                        {res}: {amt}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="plan-actions">
                                                <button
                                                    className="btn btn-sm btn-primary"
                                                    onClick={() => loadBuildPlan(plan)}
                                                >
                                                    Load
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => {
                                                        if (confirm('Delete this build plan?')) {
                                                            deleteBuildPlan(plan.id);
                                                        }
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Notification System */}
            <NotificationSystem
                notifications={notifications}
                onDismiss={dismissNotification}
            />
        </div>
    );
} 