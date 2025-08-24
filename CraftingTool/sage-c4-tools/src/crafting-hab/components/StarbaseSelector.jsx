import React from 'react';

function StarbaseSelector({ starbases, onSelectStarbase, playerFaction }) {
    const starbaseArray = Object.values(starbases);
    const filteredStarbases = starbaseArray.filter(s =>
        s.faction === playerFaction || playerFaction === 'All'
    );

    return (
        <div className="starbase-selector">
            <h3>Select a Starbase</h3>
            <div className="starbase-grid">
                {filteredStarbases.map(starbase => (
                    <div key={starbase.id} className="starbase-card">
                        <h4>{starbase.name}</h4>
                        <p>Level: {starbase.level}</p>
                        <p>Faction: {starbase.faction}</p>
                        <div className="hab-plots">
                            <p>Available Plots:</p>
                            {Object.entries(starbase.habPlots).map(([tier, count]) => (
                                <span key={tier}>T{tier}: {count} </span>
                            ))}
                        </div>
                        <button onClick={() => onSelectStarbase(starbase)}>
                            Select Starbase
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default StarbaseSelector;