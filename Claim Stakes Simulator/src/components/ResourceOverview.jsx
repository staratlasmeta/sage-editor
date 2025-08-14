import React from 'react';

const ResourceOverview = ({ resources }) => {
    const calculateTotalFlow = () => {
        // This is a placeholder - you'll need to implement the actual calculation
        return {
            netRates: {}
        };
    };

    return (
        <div className="resource-overview">
            <div className="current-resources">
                <h3>Current Resources</h3>
                <div className="resource-grid">
                    {Object.entries(resources).map(([resource, amount]) => (
                        <div key={resource} className="resource-item">
                            <span className="resource-name">{resource.replace('cargo-', '')}</span>
                            <span className="resource-value">{Math.floor(amount)}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="resource-rates">
                <h3>Net Production (per second)</h3>
                <div className="resource-grid">
                    {Object.entries(calculateTotalFlow().netRates).map(([resource, rate]) => (
                        <div key={resource} className="resource-item">
                            <span className="resource-name">{resource.replace('cargo-', '')}</span>
                            <span className={`resource-value ${rate >= 0 ? 'positive' : 'negative'}`}>
                                {rate >= 0 ? '+' : ''}{rate.toFixed(1)}/s
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ResourceOverview; 