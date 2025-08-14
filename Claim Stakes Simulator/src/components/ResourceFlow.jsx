import React from 'react';

const ResourceFlow = ({ resourceFlow, resources }) => {
    const formatNumber = (num) => {
        if (typeof num !== 'number') return '0.0';
        return Number(num).toFixed(1);
    };

    // Separate production and consumption for display
    const productionRates = resourceFlow?.production || {};
    const consumptionRates = resourceFlow?.consumption || {};

    // Calculate net rates
    const netRates = {};
    Object.entries(productionRates).forEach(([resource, rate]) => {
        netRates[resource] = (netRates[resource] || 0) + rate;
    });
    Object.entries(consumptionRates).forEach(([resource, rate]) => {
        netRates[resource] = (netRates[resource] || 0) - rate;
    });

    return (
        <div className="resource-flow">
            <div className="resource-section">
                <h3>Current Resources</h3>
                <div className="resource-list">
                    {Object.entries(resources || {}).map(([resource, amount]) => (
                        <div key={resource} className="resource-item">
                            <span className="resource-name">{resource.replace('cargo-', '')}</span>
                            <span className="resource-amount">{formatNumber(amount)}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="resource-section">
                <h3>Net Production (per second)</h3>
                <div className="resource-list">
                    {Object.entries(netRates).map(([resource, rate]) => (
                        <div key={resource} className="resource-item">
                            <span className="resource-name">{resource.replace('cargo-', '')}</span>
                            <span className={`resource-rate ${rate >= 0 ? 'positive' : 'negative'}`}>
                                {rate >= 0 ? '+' : ''}{formatNumber(rate)}/s
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="resource-section">
                <h3>Resource Consumption (per second)</h3>
                <div className="resource-list">
                    {Object.entries(consumptionRates).map(([resource, rate]) => (
                        <div key={resource} className="resource-item">
                            <span className="resource-name">{resource.replace('cargo-', '')}</span>
                            <span className="resource-rate negative">
                                -{formatNumber(rate)}/s
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ResourceFlow; 