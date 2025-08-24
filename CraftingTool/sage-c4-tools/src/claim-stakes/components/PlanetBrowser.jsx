import React, { useState } from 'react';

function PlanetBrowser({ systems, planetArchetypes, onSelectPlanet, playerFaction }) {
    const [selectedSystem, setSelectedSystem] = useState(null);
    const [filterFaction, setFilterFaction] = useState(playerFaction);

    const filteredSystems = systems.filter(s =>
        filterFaction === 'All' || s.faction === filterFaction
    );

    return (
        <div className="planet-browser">
            <div className="browser-filters">
                <select value={filterFaction} onChange={(e) => setFilterFaction(e.target.value)}>
                    <option value="All">All Factions</option>
                    <option value="MUD">MUD</option>
                    <option value="ONI">ONI</option>
                    <option value="USTUR">USTUR</option>
                </select>
            </div>

            <div className="systems-grid">
                {filteredSystems.map(system => (
                    <div key={system.id} className="system-card">
                        <h3>{system.name}</h3>
                        <p>Faction: {system.faction}</p>
                        <p>Planets: {system.planets.length}</p>
                        <button onClick={() => setSelectedSystem(system)}>
                            View Planets
                        </button>
                    </div>
                ))}
            </div>

            {selectedSystem && (
                <div className="planets-list">
                    <h3>Planets in {selectedSystem.name}</h3>
                    {selectedSystem.planets.map(planet => {
                        const archetype = planetArchetypes[planet.archetypeId];
                        return (
                            <div key={planet.id} className="planet-card">
                                <h4>{planet.name}</h4>
                                <p>Type: {archetype?.name}</p>
                                <div className="resources-preview">
                                    {Object.entries(archetype?.richness || {}).slice(0, 3).map(([resource, richness]) => (
                                        <span key={resource} className="resource-badge">
                                            {resource.replace('cargo-', '')}: {richness}x
                                        </span>
                                    ))}
                                </div>
                                <button onClick={() => onSelectPlanet(planet)}>
                                    Select Planet
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default PlanetBrowser;