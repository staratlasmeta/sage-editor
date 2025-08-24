import React, { useState } from 'react';
import { useGameData } from '../shared/contexts/DataContext';
import RecipeExplorer from './components/RecipeExplorer';
import TreeVisualizer from './components/TreeVisualizer';
import RecipeAnalyzer from './components/RecipeAnalyzer';
import './CraftingRecipesTool.css';

function CraftingRecipesTool() {
    const gameData = useGameData();
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [view, setView] = useState('explorer'); // explorer, tree, analyzer

    const handleRecipeSelect = (recipe) => {
        setSelectedRecipe(recipe);
        setView('tree');
    };

    return (
        <div className="crafting-recipes-tool">
            <div className="tool-header">
                <h2>Crafting Recipes Tool</h2>
                <div className="view-tabs">
                    <button
                        className={view === 'explorer' ? 'active' : ''}
                        onClick={() => setView('explorer')}
                    >
                        Recipe Explorer
                    </button>
                    <button
                        className={view === 'tree' ? 'active' : ''}
                        onClick={() => setView('tree')}
                        disabled={!selectedRecipe}
                    >
                        Tree View
                    </button>
                    <button
                        className={view === 'analyzer' ? 'active' : ''}
                        onClick={() => setView('analyzer')}
                        disabled={!selectedRecipe}
                    >
                        Analysis
                    </button>
                </div>
            </div>

            <div className="tool-content">
                {view === 'explorer' && (
                    <RecipeExplorer
                        recipes={gameData.allRecipes}
                        resources={gameData.resources}
                        onSelectRecipe={handleRecipeSelect}
                    />
                )}

                {view === 'tree' && selectedRecipe && (
                    <TreeVisualizer
                        recipe={selectedRecipe}
                        allRecipes={gameData.allRecipes}
                        resources={gameData.resources}
                    />
                )}

                {view === 'analyzer' && selectedRecipe && (
                    <RecipeAnalyzer
                        recipe={selectedRecipe}
                        allRecipes={gameData.allRecipes}
                        resources={gameData.resources}
                    />
                )}
            </div>
        </div>
    );
}

export default CraftingRecipesTool;