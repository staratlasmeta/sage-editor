import React, { useState } from 'react';
import { useGameData } from '../shared/contexts/DataContext';
import { useSharedState } from '../shared/contexts/SharedStateContext';
import PlanetBrowser from './components/PlanetBrowser';
import ClaimStakeDesigner from './components/ClaimStakeDesigner';
import ResourceManager from './components/ResourceManager';
import './ClaimStakesSimulator.css';

function ClaimStakesSimulator() {
  const gameData = useGameData();
  const { state, dispatch } = useSharedState();
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [activeStake, setActiveStake] = useState(null);
  const [view, setView] = useState('planets'); // planets, designer, resources

  const handlePlanetSelect = (planet) => {
    setSelectedPlanet(planet);
    setView('designer');
  };

  const handleStakeCreate = (stakeConfig) => {
    const newStake = {
      id: `stake_${Date.now()}`,
      planetId: selectedPlanet.id,
      ...stakeConfig,
      createdAt: Date.now()
    };
    dispatch({ type: 'ADD_CLAIM_STAKE', payload: newStake });
    setActiveStake(newStake);
    setView('resources');
  };

  return (
    <div className="claim-stakes-simulator">
      <div className="simulator-header">
        <h2>Claim Stakes Simulator</h2>
        <div className="view-tabs">
          <button
            className={view === 'planets' ? 'active' : ''}
            onClick={() => setView('planets')}
          >
            Planet Selection
          </button>
          <button
            className={view === 'designer' ? 'active' : ''}
            onClick={() => setView('designer')}
            disabled={!selectedPlanet}
          >
            Stake Designer
          </button>
          <button
            className={view === 'resources' ? 'active' : ''}
            onClick={() => setView('resources')}
            disabled={!activeStake}
          >
            Resource Management
          </button>
        </div>
      </div>

      <div className="simulator-content">
        {view === 'planets' && (
          <PlanetBrowser
            systems={gameData.systems}
            planetArchetypes={gameData.planetArchetypes}
            onSelectPlanet={handlePlanetSelect}
            playerFaction={state.playerFaction}
          />
        )}

        {view === 'designer' && selectedPlanet && (
          <ClaimStakeDesigner
            planet={selectedPlanet}
            planetArchetype={gameData.planetArchetypes[selectedPlanet.archetypeId]}
            claimStakeDefinitions={gameData.claimStakeDefinitions}
            buildings={gameData.claimStakeBuildings}
            playerAtlas={state.atlas}
            onCreateStake={handleStakeCreate}
          />
        )}

        {view === 'resources' && activeStake && (
          <ResourceManager
            stake={activeStake}
            resources={gameData.resources}
            onExportToStarbase={(resources) => {
              console.log('Exporting to starbase:', resources);
              // Implement resource transfer
            }}
          />
        )}
      </div>
    </div>
  );
}

export default ClaimStakesSimulator;