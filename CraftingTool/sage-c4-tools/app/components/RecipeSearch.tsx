import React, { useState, useMemo } from 'react';
import './RecipeSearch.css';

interface Recipe {
    id: string;
    name: string;
    type: string;
    outputType?: string;
    tier: number;
    constructionTime: number;
    ingredients: { resource?: string; name?: string; quantity: number }[];
    output: { resource: string; quantity: number };
}

interface RecipeSearchProps {
    recipes: Recipe[];
    resources: any[];
    planets: any[];
    onRecipeSelect: (recipe: Recipe) => void;
    onIngredientSearch: (ingredient: string, recipes: Recipe[]) => void;
}

export function RecipeSearch({
    recipes,
    resources,
    planets,
    onRecipeSelect,
    onIngredientSearch
}: RecipeSearchProps) {
    const [searchMode, setSearchMode] = useState<'name' | 'ingredient'>('name');
    const [searchTerm, setSearchTerm] = useState('');
    const [tierFilter, setTierFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set());
    const [expandIngredients, setExpandIngredients] = useState(false);

    // Get all unique ingredients
    const allIngredients = useMemo(() => {
        const ingredients = new Set<string>();
        recipes.forEach(recipe => {
            recipe.ingredients?.forEach(ing => {
                // Handle both 'resource' and 'name' fields
                const ingredientName = ing.name || ing.resource;
                if (ingredientName) {
                    ingredients.add(ingredientName);
                }
            });
        });
        return Array.from(ingredients).sort();
    }, [recipes]);

    // Calculate resource metrics
    const resourceMetrics = useMemo(() => {
        const metrics = new Map<string, {
            usageCount: number;
            recipeCount: number;
            planetCount: number;
            scarcity: number;
            demand: number;
            value: number;
        }>();

        // Count usage in recipes
        recipes.forEach(recipe => {
            recipe.ingredients?.forEach(ing => {
                const ingredientName = ing.name || ing.resource;
                if (!ingredientName) return;
                const existing = metrics.get(ingredientName) || {
                    usageCount: 0,
                    recipeCount: 0,
                    planetCount: 0,
                    scarcity: 0,
                    demand: 0,
                    value: 0
                };
                existing.usageCount += ing.quantity;
                existing.recipeCount++;
                metrics.set(ingredientName, existing);
            });
        });

        // Count planet availability
        planets.forEach(planet => {
            if (planet.resources) {
                Object.keys(planet.resources).forEach(resource => {
                    const existing = metrics.get(resource);
                    if (existing) {
                        existing.planetCount++;
                    }
                });
            }
        });

        // Calculate final metrics
        metrics.forEach((metric, resource) => {
            // Scarcity: lower planet count = higher scarcity (0-100)
            metric.scarcity = Math.max(0, 100 - (metric.planetCount * 10));

            // Demand: based on usage in recipes (0-100)
            metric.demand = Math.min(100, metric.recipeCount * 10 + metric.usageCount);

            // Value: combination of scarcity and demand
            metric.value = (metric.scarcity * 0.6 + metric.demand * 0.4);
        });

        return metrics;
    }, [recipes, planets]);

    // Filter recipes based on search mode
    const filteredRecipes = useMemo(() => {
        let filtered = recipes;

        // Apply search filter
        if (searchTerm) {
            switch (searchMode) {
                case 'name':
                    filtered = filtered.filter(r =>
                        r.name.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    break;
                case 'ingredient':
                    filtered = filtered.filter(r =>
                        r.ingredients?.some(ing => {
                            const ingredientName = (ing.name || ing.resource || '').toLowerCase();
                            return ingredientName.includes(searchTerm.toLowerCase());
                        })
                    );
                    break;
            }
        }

        // Apply tier filter
        if (tierFilter !== 'all') {
            filtered = filtered.filter(r => r.tier === parseInt(tierFilter));
        }

        // Apply type filter - check both type and outputType
        if (typeFilter !== 'all') {
            filtered = filtered.filter(r => {
                // Support both old 'type' field and new 'outputType' field
                const recipeType = r.outputType || r.type;
                // Handle "Raw" mapping for BASIC RESOURCE types
                if (typeFilter === 'BASIC RESOURCE' || typeFilter === 'BASIC ORGANIC RESOURCE') {
                    return recipeType === typeFilter;
                }
                return recipeType === typeFilter;
            });
        }

        return filtered;
    }, [recipes, searchTerm, searchMode, tierFilter, typeFilter]);

    // Get recipes that use a specific ingredient
    const getRecipesUsingIngredient = (ingredient: string) => {
        // Normalize the search term for comparison - handle both hyphenated and spaced versions
        const normalizedIngredient = ingredient.toLowerCase().replace(/-/g, ' ');
        const hyphenatedIngredient = ingredient.toLowerCase().replace(/\s+/g, '-');

        return recipes.filter(r =>
            r.ingredients?.some(ing => {
                const ingName = (ing.name || ing.resource || '');
                const ingNameLower = ingName.toLowerCase();
                const ingNameNormalized = ingNameLower.replace(/-/g, ' ');
                const ingNameHyphenated = ingNameLower.replace(/\s+/g, '-');

                // Check various combinations
                return ingName === ingredient ||  // Exact match
                    ingNameLower === ingredient.toLowerCase() ||  // Case insensitive
                    ingNameNormalized === normalizedIngredient ||  // Normalized match
                    ingNameHyphenated === hyphenatedIngredient ||  // Hyphenated match
                    ingName === 'Absorption Matrix' && ingredient === 'absorption-matrix';  // Special case
            })
        );
    };

    const toggleRecipeExpansion = (recipeId: string) => {
        const newExpanded = new Set(expandedRecipes);
        if (newExpanded.has(recipeId)) {
            newExpanded.delete(recipeId);
        } else {
            newExpanded.add(recipeId);
        }
        setExpandedRecipes(newExpanded);
    };

    return (
        <div className="recipe-search">
            <div className="search-header">
                <h3>Recipe Search & Analysis</h3>

                <div className="search-mode-tabs">
                    <button
                        className={searchMode === 'name' ? 'active' : ''}
                        onClick={() => setSearchMode('name')}
                    >
                        By Name
                    </button>
                    <button
                        className={searchMode === 'ingredient' ? 'active' : ''}
                        onClick={() => setSearchMode('ingredient')}
                    >
                        By Ingredient
                    </button>
                </div>
            </div>

            <div className="search-controls">
                <input
                    type="text"
                    placeholder={
                        searchMode === 'name' ? 'Search recipe names...' :
                            'Search by ingredient (e.g., copper-ore)...'
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />

                <div className="filters">
                    <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
                        <option value="all">All Tiers</option>
                        {[1, 2, 3, 4, 5].map(tier => (
                            <option key={tier} value={tier}>Tier {tier}</option>
                        ))}
                    </select>

                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option value="all">All Types</option>
                        <option value="BASIC RESOURCE">Raw</option>
                        <option value="BASIC ORGANIC RESOURCE">Raw (Organic)</option>
                        <option value="COMPONENT">Component</option>
                        <option value="INGREDIENT">Ingredient</option>
                        <option value="BUILDING">Building</option>
                        <option value="SHIP_COMPONENTS">Ship Components</option>
                        <option value="SHIP_MODULES">Ship Modules</option>
                        <option value="SHIP_WEAPONS">Ship Weapons</option>
                        <option value="COUNTERMEASURES">Countermeasures</option>
                        <option value="MISSILES">Missiles</option>
                        <option value="DRONE">Drone</option>
                        <option value="HAB_ASSETS">Hab Assets</option>
                        <option value="R4">R4</option>
                    </select>
                </div>
            </div>

            {searchMode === 'ingredient' && searchTerm && (
                <div className="ingredient-analysis">
                    <h4>Ingredient Analysis: {searchTerm}</h4>
                    {resourceMetrics.has(searchTerm) ? (
                        <div className="resource-metrics">
                            <div className="metric">
                                <span className="label">Usage Count:</span>
                                <span className="value">{resourceMetrics.get(searchTerm)!.usageCount}</span>
                            </div>
                            <div className="metric">
                                <span className="label">Used in Recipes:</span>
                                <span className="value">{resourceMetrics.get(searchTerm)!.recipeCount}</span>
                            </div>
                            <div className="metric">
                                <span className="label">Available on Planets:</span>
                                <span className="value">{resourceMetrics.get(searchTerm)!.planetCount}</span>
                            </div>
                            <div className="metric-bar">
                                <span className="label">Scarcity:</span>
                                <div className="bar">
                                    <div
                                        className="fill scarcity"
                                        style={{ width: `${resourceMetrics.get(searchTerm)!.scarcity}%` }}
                                    />
                                </div>
                                <span className="percentage">{resourceMetrics.get(searchTerm)!.scarcity.toFixed(0)}%</span>
                            </div>
                            <div className="metric-bar">
                                <span className="label">Demand:</span>
                                <div className="bar">
                                    <div
                                        className="fill demand"
                                        style={{ width: `${resourceMetrics.get(searchTerm)!.demand}%` }}
                                    />
                                </div>
                                <span className="percentage">{resourceMetrics.get(searchTerm)!.demand.toFixed(0)}%</span>
                            </div>
                            <div className="metric-bar">
                                <span className="label">Value Index:</span>
                                <div className="bar">
                                    <div
                                        className="fill value"
                                        style={{ width: `${resourceMetrics.get(searchTerm)!.value}%` }}
                                    />
                                </div>
                                <span className="percentage">{resourceMetrics.get(searchTerm)!.value.toFixed(0)}%</span>
                            </div>
                        </div>
                    ) : (
                        <p>No metrics available for this resource</p>
                    )}
                </div>
            )}

            <div className="recipe-results">
                <h4>
                    {searchMode === 'ingredient' && searchTerm ?
                        `Recipes using ${searchTerm}` :
                        'Recipe Results'
                    } ({filteredRecipes.length})
                </h4>

                <div className="recipe-list">
                    {filteredRecipes.map(recipe => {
                        const isExpanded = expandedRecipes.has(recipe.id);

                        return (
                            <div key={recipe.id} className="recipe-item">
                                <div className="recipe-card-quick-view">
                                    <button
                                        className="quick-view-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRecipeSelect(recipe);
                                        }}
                                        title="Quick View Tree"
                                    >
                                        🌲
                                    </button>
                                    <button
                                        className="quick-view-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Handle both old and new recipe formats - make sure to use the right format
                                            // that matches what's in ingredients (sometimes space-separated, sometimes hyphenated)
                                            const outputName = (recipe as any).outputName || recipe.output?.resource || recipe.name;
                                            const outputId = (recipe as any).outputId;

                                            // Try both the name and id to find recipes
                                            let recipesUsing = getRecipesUsingIngredient(outputName);
                                            if (recipesUsing.length === 0 && outputId) {
                                                recipesUsing = getRecipesUsingIngredient(outputId);
                                            }

                                            onIngredientSearch(outputName, recipesUsing);
                                        }}
                                        title="What uses this?"
                                    >
                                        🔗
                                    </button>
                                </div>
                                <div
                                    className="recipe-header"
                                    onClick={() => toggleRecipeExpansion(recipe.id)}
                                >
                                    <span className="expand-icon">
                                        {isExpanded ? '▼' : '▶'}
                                    </span>
                                    <div className="recipe-main-info">
                                        <div className="recipe-title-row">
                                            <h5>{recipe.name}</h5>
                                            <span className={`tier-badge tier-${recipe.tier}`}>
                                                T{recipe.tier}
                                            </span>
                                        </div>
                                        <div className="recipe-meta">
                                            <span className="type">{(() => {
                                                const type = recipe.outputType || recipe.type;
                                                // Map outputType to display names
                                                if (type === 'BASIC RESOURCE' || type === 'BASIC ORGANIC RESOURCE') return 'Raw';
                                                if (type === 'COMPONENT') return 'Component';
                                                if (type === 'INGREDIENT') return 'Ingredient';
                                                if (type === 'BUILDING') return 'Building';
                                                if (type === 'SHIP_COMPONENTS') return 'Ship Components';
                                                if (type === 'SHIP_MODULES') return 'Ship Modules';
                                                if (type === 'SHIP_WEAPONS') return 'Ship Weapons';
                                                if (type === 'COUNTERMEASURES') return 'Countermeasures';
                                                if (type === 'MISSILES') return 'Missiles';
                                                if (type === 'DRONE') return 'Drone';
                                                if (type === 'HAB_ASSETS') return 'Hab Assets';
                                                if (type === 'R4') return 'R4';
                                                // Default: convert to proper case
                                                return type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : 'Unknown';
                                            })()}</span>
                                            <span className="separator">•</span>
                                            <span className="time">⏱ {recipe.constructionTime}s</span>
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="recipe-details">
                                        <div className="ingredients-section">
                                            <h6>Ingredients:</h6>
                                            {recipe.ingredients?.map((ing, idx) => {
                                                const ingredientName = ing.name || ing.resource;
                                                const metrics = resourceMetrics.get(ingredientName);
                                                return (
                                                    <div key={idx} className="ingredient-item">
                                                        <span className="quantity">{ing.quantity}x</span>
                                                        <span className="resource-name">{ingredientName}</span>
                                                        {metrics && (
                                                            <span className="resource-value"
                                                                title={`Scarcity: ${metrics.scarcity.toFixed(0)}%, Demand: ${metrics.demand.toFixed(0)}%`}>
                                                                V: {metrics.value.toFixed(0)}
                                                            </span>
                                                        )}
                                                        <button
                                                            className="search-ingredient-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSearchMode('ingredient');
                                                                setSearchTerm(ing.name || ing.resource);
                                                            }}
                                                            title="Search recipes using this ingredient"
                                                        >
                                                            🔍
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="output-section">
                                            <h6>Output:</h6>
                                            <div className="output-item">
                                                <span className="quantity">{recipe.output?.quantity || 0}x</span>
                                                <span className="resource-name">{recipe.output?.resource || 'Unknown'}</span>
                                            </div>
                                        </div>

                                        <div className="recipe-actions">
                                            <button
                                                className="btn btn-primary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRecipeSelect(recipe);
                                                }}
                                            >
                                                View Tree
                                            </button>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Handle both old and new recipe formats - make sure to use the right format
                                                    // that matches what's in ingredients (sometimes space-separated, sometimes hyphenated)
                                                    const outputName = (recipe as any).outputName || recipe.output?.resource || recipe.name;
                                                    const outputId = (recipe as any).outputId;

                                                    // Try both the name and id to find recipes
                                                    let recipesUsing = getRecipesUsingIngredient(outputName);
                                                    if (recipesUsing.length === 0 && outputId) {
                                                        recipesUsing = getRecipesUsingIngredient(outputId);
                                                    }

                                                    onIngredientSearch(outputName, recipesUsing);
                                                }}
                                            >
                                                What uses this?
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Quick ingredient browser - Collapsible */}
            <div className={`ingredient-browser ${expandIngredients ? 'expanded' : 'collapsed'}`}>
                <div className="ingredient-browser-header" onClick={() => setExpandIngredients(!expandIngredients)}>
                    <h4>
                        <span className="expand-icon">{expandIngredients ? '▼' : '▶'}</span>
                        Common Ingredients
                        <span className="ingredient-count">({allIngredients.length} total)</span>
                    </h4>
                </div>
                <div className="ingredient-chips">
                    {allIngredients.slice(0, expandIngredients ? allIngredients.length : 10).map(ingredient => {
                        const metrics = resourceMetrics.get(ingredient);
                        return (
                            <button
                                key={ingredient}
                                className="ingredient-chip"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSearchMode('ingredient');
                                    setSearchTerm(ingredient);
                                }}
                                style={{
                                    borderColor: metrics ?
                                        `hsl(${120 - metrics.value}, 70%, 50%)` :
                                        'var(--border-color)'
                                }}
                                title={metrics ? `Value: ${metrics.value.toFixed(0)}, Used in ${metrics.recipeCount} recipes` : ''}
                            >
                                {ingredient}
                                {metrics && (
                                    <span className="chip-value">
                                        {metrics.value.toFixed(0)}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                    {!expandIngredients && allIngredients.length > 10 && (
                        <button
                            className="ingredient-chip more-chip"
                            onClick={() => setExpandIngredients(true)}
                        >
                            +{allIngredients.length - 10} more...
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
