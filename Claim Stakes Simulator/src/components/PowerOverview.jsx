import React from 'react';

const PowerOverview = ({ totalPower, usedPower, fuelStatus }) => {
    // Ensure we have valid numbers
    const available = Number(totalPower) || 0;
    const used = Number(usedPower) || 0;
    const remainingPower = available - used;
    const powerUsagePercent = available > 0 ? (used / available) * 100 : 0;
    const fuelStatusPercent = Number(fuelStatus) || 0;

    return (
        <div className="power-overview">
            <div className="power-bar">
                <div
                    className={`power-used ${powerUsagePercent > 90 ? 'critical' : powerUsagePercent > 75 ? 'warning' : ''}`}
                    style={{ width: `${powerUsagePercent}%` }}
                />
            </div>
            <div className="power-details">
                <span className="remaining-power">
                    Available Power: {remainingPower}
                </span>
                <span className="power-ratio">
                    {used} / {available}
                </span>
            </div>

            {/* Add fuel status display */}
            <div className="fuel-status">
                <div className="fuel-bar">
                    <div
                        className={`fuel-level ${fuelStatusPercent < 25 ? 'critical' : fuelStatusPercent < 50 ? 'warning' : ''}`}
                        style={{ width: `${fuelStatusPercent}%` }}
                    />
                </div>
                <div className="fuel-details">
                    <span className="fuel-label">Fuel Status: </span>
                    <span className={`fuel-value ${fuelStatusPercent === 0 ? 'critical' : ''}`}>
                        {fuelStatusPercent === 0 ? 'Empty!' : `${Math.round(fuelStatusPercent)}%`}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default PowerOverview; 