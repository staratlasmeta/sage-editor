import React, { useState, useRef, useEffect } from 'react';
import { Navigation } from '../components/Navigation';
import { useGameData } from '../contexts/DataContext';
import { useSharedState } from '../contexts/SharedStateContext';
import { NotificationSystem, useNotifications } from '../components/NotificationSystem';
import { RecipeTreeCanvas } from '../components/RecipeTreeCanvas';

// Type definitions
interface Recipe {
    id: string;
    name: string;
    type: string;
    tier: number;
    constructionTime: number;
    ingredients: { resource: string; quantity: number }[];
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
    const [viewMode, setViewMode] = useState<'simple' | 'detailed' | 'efficiency'>('simple');
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [pathAnalysis, setPathAnalysis] = useState<PathAnalysis | null>(null);
    const [targetQuantity, setTargetQuantity] = useState(1);
    const [buildPlans, setBuildPlans] = useState<BuildPlan[]>([]);
    const [showBuildPlans, setShowBuildPlans] = useState(false);

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

        const recipe = recipes.find(r => r.id === recipeId);
        if (!recipe) return null;

        const children: TreeNode[] = [];

        // Find recipes that produce this recipe's ingredients
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
            recipe.ingredients.forEach(ingredient => {
                // Log all recipes that might produce this resource
                console.log(`Looking for producer of ${ingredient.resource}`);
                console.log('Available recipe outputs:', recipes.map(r => `${r.id} => ${r.output?.resource}`).join(', '));

                const producerRecipe = recipes.find(r => {
                    // Check both with and without recipe_ prefix
                    return r.output?.resource === ingredient.resource ||
                        r.output?.resource === `recipe_${ingredient.resource}` ||
                        `recipe_${r.output?.resource}` === ingredient.resource;
                });
                if (producerRecipe) {
                    console.log(`Found producer for ${ingredient.resource}: ${producerRecipe.name}`);
                    const childNode = buildRecipeTree(producerRecipe.id, depth + 1, new Set(visited));
                    if (childNode) {
                        children.push(childNode);
                    }
                } else {
                    // This is a raw material - create a leaf node for it
                    console.log(`${ingredient.resource} is a raw material`);
                    children.push({
                        id: `raw_${ingredient.resource}`,
                        recipe: {
                            id: `raw_${ingredient.resource}`,
                            name: ingredient.resource,
                            tier: 0,
                            type: 'raw',
                            ingredients: [],
                            output: {
                                resource: ingredient.resource,
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
            {/* Only render Navigation in dev mode, not in standalone */}
            {typeof window !== 'undefined' && !(window as any).__STANDALONE_BUILD__ && (
                <Navigation />
            )}

            <NotificationSystem
                notifications={notifications}
                onDismiss={dismissNotification}
            />

            <div className="recipes-content">
                {/* Left Sidebar - Recipe Browser */}
                <aside className="sidebar">
                    <h2>Recipe Browser</h2>

                    <div className="search-section">
                        <input
                            type="text"
                            placeholder="Search recipes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    <div className="filters">
                        <select
                            value={tierFilter}
                            onChange={(e) => setTierFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Tiers</option>
                            <option value="1">Tier 1</option>
                            <option value="2">Tier 2</option>
                            <option value="3">Tier 3</option>
                            <option value="4">Tier 4</option>
                            <option value="5">Tier 5</option>
                        </select>

                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Types</option>
                            <option value="component">Components</option>
                            <option value="module">Modules</option>
                            <option value="consumable">Consumables</option>
                            <option value="ship">Ship Parts</option>
                        </select>
                    </div>

                    <div className="recipe-list">
                        {filteredRecipes.map(recipe => {
                            const hasIngredients = recipe.ingredients && Array.isArray(recipe.ingredients) &&
                                recipe.ingredients.every(ing =>
                                    sharedState.starbaseInventory[ing.resource] >= ing.quantity * targetQuantity
                                );

                            return (
                                <div
                                    key={recipe.id}
                                    className={`recipe-list-item ${selectedRecipe?.id === recipe.id ? 'selected' : ''} ${!hasIngredients ? 'insufficient' : ''}`}
                                    onClick={() => setSelectedRecipe(recipe)}
                                >
                                    <div className="recipe-header">
                                        <h4>{recipe.name}</h4>
                                        <span className={`tier-badge tier-${recipe.tier}`}>T{recipe.tier}</span>
                                    </div>
                                    <div className="recipe-quick-info">
                                        <span className="recipe-type">{recipe.type}</span>
                                        <span className="recipe-time">{recipe.constructionTime}s</span>
                                    </div>
                                    <div className="recipe-io">
                                        <div className="inputs">
                                            {recipe.ingredients && Array.isArray(recipe.ingredients) && recipe.ingredients.map((ing, idx) => (
                                                <span key={idx} className="ingredient-chip">
                                                    {ing.quantity} {ing.resource}
                                                </span>
                                            ))}
                                        </div>
                                        <span className="arrow">→</span>
                                        <div className="output">
                                            <span className="output-chip">
                                                {recipe.output?.quantity || 0} {recipe.output?.resource || 'Unknown'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
                                    <button
                                        className={`view-btn ${viewMode === 'efficiency' ? 'active' : ''}`}
                                        onClick={() => setViewMode('efficiency')}
                                    >
                                        Efficiency
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
                                />
                            </div>

                            <div className="quantity-control">
                                <label>Target Quantity:</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="1000"
                                    value={targetQuantity}
                                    onChange={(e) => setTargetQuantity(parseInt(e.target.value) || 1)}
                                />
                            </div>
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
                    <h2>Analysis</h2>

                    {selectedRecipe && pathAnalysis ? (
                        <>
                            <div className="analysis-section">
                                <h3>Resource Requirements</h3>
                                <div className="resource-requirements">
                                    <h4>Raw Materials Needed:</h4>
                                    {Object.entries(pathAnalysis.totalResources).map(([resource, amount]) => {
                                        const available = sharedState.starbaseInventory[resource] || 0;
                                        const sufficient = available >= amount;

                                        return (
                                            <div key={resource} className="requirement-item">
                                                <span className="resource-name">{resource}</span>
                                                <div className="requirement-amounts">
                                                    <span className={`required ${sufficient ? 'sufficient' : 'insufficient'}`}>
                                                        {Math.ceil(amount)}
                                                    </span>
                                                    <span className="available">/ {available}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="analysis-section">
                                <h3>Time Analysis</h3>
                                <div className="time-breakdown">
                                    <div className="time-stat">
                                        <span>Total Time:</span>
                                        <span className="value">{Math.ceil(pathAnalysis.totalTime)}s</span>
                                    </div>
                                    <div className="time-stat">
                                        <span>With Bonuses:</span>
                                        <span className="value">{Math.ceil(pathAnalysis.totalTime * 0.8)}s</span>
                                    </div>
                                </div>
                            </div>

                            <div className="analysis-section">
                                <h3>Efficiency Metrics</h3>
                                <div className="efficiency-display">
                                    <div className="efficiency-meter">
                                        <div
                                            className="efficiency-fill"
                                            style={{ width: `${pathAnalysis.efficiency}%` }}
                                        />
                                    </div>
                                    <span className="efficiency-value">{pathAnalysis.efficiency}%</span>
                                </div>
                            </div>

                            <div className="analysis-section">
                                <h3>Optimization Tips</h3>
                                <ul className="tips-list">
                                    <li>Build multiple {selectedRecipe.name} stations for parallel production</li>
                                    <li>Stockpile intermediate components</li>
                                    <li>Use T{selectedRecipe.tier} crafting stations for speed bonus</li>
                                </ul>
                            </div>

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
                                                    if (plot.isRented && plot.habDesign) {
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