import React, { useState } from 'react';
import { useGameData } from '../shared/contexts/DataContext';
import { useSharedState } from '../shared/contexts/SharedStateContext';
import StarbaseSelector from './components/StarbaseSelector';
import HabDesigner from './components/HabDesigner';
import CraftingInterface from './components/CraftingInterface';
import './CraftingHabTool.css';

function CraftingHabTool() {
    const gameData = useGameData();
    const { state, dispatch } = useSharedState();
    const [selectedStarbase, setSelectedStarbase] = useState(null);
    const [activeHab, setActiveHab] = useState(null);
    const [view, setView] = useState('starbase'); // starbase, designer, crafting

    const handleStarbaseSelect = (starbase) => {
        setSelectedStarbase(starbase);
        setView('designer');
    };

    const handleHabCreate = (habConfig) => {
        const newHab = {
            id: `hab_${Date.now()}`,
            starbaseId: selectedStarbase.id,
            ...habConfig,
            createdAt: Date.now()
        };
        dispatch({ type: 'ADD_CRAFTING_HAB', payload: newHab });
        setActiveHab(newHab);
        setView('crafting');
    };

    return (
        <div className="crafting-hab-tool">
            <div className="tool-header">
                <h2>Crafting Hab Tool</h2>
                <div className="view-tabs">
                    <button
                        className={view === 'starbase' ? 'active' : ''}
                        onClick={() => setView('starbase')}
                    >
                        Starbase Selection
                    </button>
                    <button
                        className={view === 'designer' ? 'active' : ''}
                        onClick={() => setView('designer')}
                        disabled={!selectedStarbase}
                    >
                        Hab Designer
                    </button>
                    <button
                        className={view === 'crafting' ? 'active' : ''}
                        onClick={() => setView('crafting')}
                        disabled={!activeHab}
                    >
                        Crafting Jobs
                    </button>
                </div>
            </div>

            <div className="tool-content">
                {view === 'starbase' && (
                    <StarbaseSelector
                        starbases={gameData.starbases}
                        onSelectStarbase={handleStarbaseSelect}
                        playerFaction={state.playerFaction}
                    />
                )}

                {view === 'designer' && selectedStarbase && (
                    <HabDesigner
                        starbase={selectedStarbase}
                        habTypes={gameData.craftingHabTypes}
                        buildings={gameData.craftingHabBuildings}
                        playerAtlas={state.atlas}
                        onCreateHab={handleHabCreate}
                    />
                )}

                {view === 'crafting' && activeHab && (
                    <CraftingInterface
                        hab={activeHab}
                        recipes={gameData.craftingRecipes}
                        inventory={state.starbaseInventory[selectedStarbase?.id] || {}}
                        onStartJob={(job) => {
                            console.log('Starting crafting job:', job);
                            // Implement job management
                        }}
                    />
                )}
            </div>
        </div>
    );
}

export default CraftingHabTool;
