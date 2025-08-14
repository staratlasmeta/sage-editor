const BuildingDisplay = ({ building, buildingId, crewAssignments, onAdjustCrew, onAssignMaxCrew, getActualResourceRates }) => {
    const currentCrew = crewAssignments[buildingId] || 0;
    const maxCrew = building.crewSlots || 0;
    const efficiency = maxCrew === 0 ? 100 : Math.round((currentCrew / maxCrew) * 100);
    const actualRates = getActualResourceRates(buildingId);

    return (
        <div className="building-card">
            <div className="building-header">
                <h3>{building.name}</h3>
                <span className={`status-badge ${currentCrew > 0 ? 'operational' : 'inactive'}`}>
                    {currentCrew > 0 ? 'Operational' : 'Not Operational'}
                </span>
                <span className="efficiency">Efficiency: {efficiency}%</span>
            </div>

            <div className="building-content">
                <div className="resource-rates">
                    <div className="inputs">
                        <h4>Inputs:</h4>
                        {/* Add input resources here if any */}
                    </div>
                    <div className="outputs">
                        <h4>Outputs:</h4>
                        {building.resourceExtractionRate && Object.entries(building.resourceExtractionRate).map(([resource, baseRate]) => (
                            <div key={resource} className="resource-rate">
                                <span>{resource}:</span>
                                <span className="rate">
                                    +{(baseRate * (efficiency / 100)).toFixed(1)}/s
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="crew-controls">
                    <div className="crew-display">
                        Crew: {currentCrew}/{maxCrew}
                    </div>
                    <div className="crew-buttons">
                        <button onClick={() => onAdjustCrew(buildingId, -1)}>-</button>
                        <button onClick={() => onAdjustCrew(buildingId, 1)}>+</button>
                    </div>
                    <button
                        className="assign-max-crew"
                        onClick={() => onAssignMaxCrew(buildingId)}
                    >
                        Assign Max Crew
                    </button>
                </div>
            </div>
        </div>
    );
}; 