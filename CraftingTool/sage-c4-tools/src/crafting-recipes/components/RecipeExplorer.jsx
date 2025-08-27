import React, { useState, useMemo } from 'react';

function RecipeExplorer({ recipes, resources, onSelectRecipe }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [tierFilter, setTierFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');

    const filteredRecipes = useMemo(() => {
        return recipes.filter(recipe => {
            const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesTier = tierFilter === 'All' || recipe.tier === parseInt(tierFilter);
            const matchesType = typeFilter === 'All' || recipe.category === typeFilter;
            return matchesSearch && matchesTier && matchesType;
        });
    }, [recipes, searchTerm, tierFilter, typeFilter]);

    const recipeTypes = [...new Set(recipes.map(r => r.category))];

    return (
        <div className="recipe-explorer">
            <div className="explorer-filters">
                <input
                    type="text"
                    placeholder="Search recipes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />

                <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
                    <option value="All">All Tiers</option>
                    <option value="1">Tier 1</option>
                    <option value="2">Tier 2</option>
                    <option value="3">Tier 3</option>
                    <option value="4">Tier 4</option>
                    <option value="5">Tier 5</option>
                </select>

                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <option value="All">All Types</option>
                    {recipeTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
            </div>

            <div className="recipes-grid">
                {filteredRecipes.map(recipe => (
                    <div key={recipe.id} className="recipe-card">
                        <div className="recipe-header">
                            <h4>{recipe.name}</h4>
                            <span className="tier-badge">T{recipe.tier}</span>
                        </div>

                        <div className="recipe-body">
                            <div className="ingredients">
                                <strong>Inputs:</strong>
                                {Object.entries(recipe.inputs || recipe.ingredients || {}).map(([item, qty]) => (
                                    <div key={item} className="ingredient">
                                        {item.replace(/-/g, ' ')}: {qty}
                                    </div>
                                ))}
                            </div>

                            {recipe.outputs && (
                                <div className="outputs">
                                    <strong>Outputs:</strong>
                                    {Object.entries(recipe.outputs).map(([item, qty]) => (
                                        <div key={item} className="output">
                                            {item.replace(/-/g, ' ')}: {qty}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button onClick={() => onSelectRecipe(recipe)}>
                            View Tree
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default RecipeExplorer;