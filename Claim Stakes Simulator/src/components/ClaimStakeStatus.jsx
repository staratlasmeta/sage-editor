import React, { useState, useEffect } from 'react';
import '../styles/ClaimStakeStatus.css';

// Remove memo wrapper that might be preventing necessary re-renders
const ClaimStakeStatus = ({ claimStake, gameData, onUpdate, className, globalResources }) => {
    const [renderCount, setRenderCount] = useState(0);
    const previousClaimStakeId = React.useRef(null);

    // State for expandable sections
    const [expandedSections, setExpandedSections] = useState({
        slots: false,
        planet: false,
        resources: true,
        crew: false,
        power: false,
        fuel: false
    });

    // Only increment render count when actual renders happen, but don't force re-renders
    useEffect(() => {
        setRenderCount(count => count + 1);
    }, []); // Add empty dependency array to only run once on mount

    // Add debugging to track resource amount changes
    useEffect(() => {
        if (claimStake?.resources && Object.keys(claimStake.resources).length > 0) {
            const biomassResource = claimStake.resources['cargo-biomass'];
            const biomassAmount = (biomassResource?.amount !== undefined) ?
                Number(biomassResource.amount) :
                (typeof biomassResource === 'number' ? Number(biomassResource) : 0);

            // Only log when biomass amount changes (not every render)
            if (window.lastBiomassAmount !== biomassAmount) {
                const currentTime = new Date().toLocaleTimeString();
                //console.log(`[ClaimStakeStatus] ${currentTime}: BIOMASS = ${(isNaN(biomassAmount) ? 0 : biomassAmount).toFixed(2)} (was: ${window.lastBiomassAmount || 0})`);
                window.lastBiomassAmount = biomassAmount;
            }
        }
    }, [claimStake?.resources, claimStake?.id]);

    // Add a separate effect to track when claimStake prop changes
    useEffect(() => {
        if (claimStake?.id) {
            if (previousClaimStakeId.current !== claimStake.id) {
                //console.log(`[ClaimStakeStatus] Claim stake changed: ${claimStake.id}`);
                previousClaimStakeId.current = claimStake.id;
            }
        }
    }, [claimStake]);

    if (!claimStake || !gameData) {
        return <div className="claim-stake-status">No claim stake selected</div>;
    }

    // Use data from centralized simulation service
    const powerStats = claimStake.powerStats || { generation: 0, consumption: 0, net: 0 };
    const crewStats = claimStake.crewStats || { totalSlots: 0, usedCrew: 0, available: 0 };
    const resourceRates = claimStake.lastResourceRates || {};

    // Extract fuel information
    const currentFuel = claimStake.resources?.['cargo-fuel']?.amount || claimStake.resources?.['cargo-fuel'] || 0;
    const tier = claimStake.definition?.tier || 1;
    const maxFuelCapacity = tier * 1000;
    const fuelPercentage = Math.round(Math.min(100, Math.max(0, (currentFuel / maxFuelCapacity) * 100)));
    const hasSufficientFuel = currentFuel > 0;
    const operational = hasSufficientFuel;

    // Debug logging for fuel calculation
    // console.log(`[ClaimStakeStatus] Fuel Debug:`, {
    //     claimStakeId: claimStake.id,
    //     currentFuel,
    //     tier,
    //     maxFuelCapacity,
    //     fuelPercentage,
    //     fuelResourceData: claimStake.resources?.['cargo-fuel'],
    //     allResources: Object.keys(claimStake.resources || {})
    // });

    const handleResupplyFuel = () => {
        if (!onUpdate) return;

        const resupplyAmount = tier * 1000;
        const newFuelAmount = currentFuel + resupplyAmount;

        onUpdate({
            resources: {
                ...(claimStake.resources || {}),
                'cargo-fuel': newFuelAmount
            }
        });
    };

    // Extract planet type and faction from definition
    const getPlanetTypeAndFaction = () => {
        if (!claimStake?.definition?.id) {
            return { type: 'Unknown', faction: 'Unknown' };
        }

        const id = claimStake.definition.id;
        try {
            const parts = id.split('-');
            let typeIndex = parts.findIndex(part =>
                part.includes('planet') ||
                part.includes('giant') ||
                part.includes('asteroid'));
            let factionIndex = parts.findIndex(part =>
                part === 'oni' || part === 'mud' || part === 'ustur');

            const planetType = typeIndex >= 0 ?
                parts[typeIndex].replace('planet', ' Planet').replace('giant', ' Giant') : 'Unknown';
            const faction = factionIndex >= 0 ?
                parts[factionIndex].toUpperCase() : 'Unknown';

            return { type: planetType, faction: faction };
        } catch (error) {
            return { type: 'Unknown', faction: 'Unknown' };
        }
    };

    // Get all resources that have amounts or rates
    const allResourcesWithData = Object.keys({
        ...(claimStake.resources || {}),
        ...resourceRates
    }).filter(resourceId => {
        const resourceData = claimStake.resources?.[resourceId];
        const amount = typeof resourceData === 'object' && resourceData.amount !== undefined
            ? resourceData.amount
            : (typeof resourceData === 'number' ? resourceData : 0);
        const rate = resourceRates[resourceId] || 0;
        return amount > 0 || rate !== 0;
    }).sort();

    const { type: planetType, faction } = getPlanetTypeAndFaction();

    // Function to toggle section expansion
    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Calculate summary stats for collapsed sections
    const getSummaryStats = () => {
        const activeResourceCount = allResourcesWithData.filter(id => id !== 'cargo-fuel').length;
        const powerStatus = powerStats.net >= 0 ? 'Good' : 'Low';
        const crewStatus = crewStats.available >= 0 ? 'Good' : 'Short';
        const fuelStatus = fuelPercentage >= 20 ? 'Good' : 'Low';

        return {
            resources: `${activeResourceCount} active`,
            power: powerStatus,
            crew: crewStatus,
            fuel: `${fuelPercentage}%`
        };
    };

    const summaryStats = getSummaryStats();

    return (
        <div className="claim-stake-status dashboard-style">
            <div className="dashboard-header">
                <h2>{claimStake.definition?.name || 'Claim Stake'}</h2>
            </div>

            {/* Compact Status Overview */}
            <div className="status-overview-grid">
                <div className="status-card" onClick={() => toggleSection('slots')}>
                    <div className="status-card-icon">🏠</div>
                    <div className="status-card-content">
                        <div className="status-card-value">{claimStake.buildings?.length || 0}/{claimStake.definition?.slots || 0}</div>
                        <div className="status-card-label">Slots</div>
                    </div>
                    <div className="status-card-indicator good"></div>
                </div>

                <div className="status-card" onClick={() => toggleSection('power')}>
                    <div className="status-card-icon">⚡</div>
                    <div className="status-card-content">
                        <div className="status-card-value">{powerStats.net > 0 ? '+' : ''}{powerStats.net}</div>
                        <div className="status-card-label">Power</div>
                    </div>
                    <div className={`status-card-indicator ${powerStats.net >= 0 ? 'good' : 'warning'}`}></div>
                </div>

                <div className="status-card" onClick={() => toggleSection('crew')}>
                    <div className="status-card-icon">👥</div>
                    <div className="status-card-content">
                        <div className="status-card-value">{crewStats.usedCrew}/{crewStats.totalSlots}</div>
                        <div className="status-card-label">Crew</div>
                    </div>
                    <div className={`status-card-indicator ${crewStats.available >= 0 ? 'good' : 'warning'}`}></div>
                </div>

                <div className="status-card" onClick={() => toggleSection('fuel')}>
                    <div className="status-card-icon">⛽</div>
                    <div className="status-card-content">
                        <div className="status-card-value">{fuelPercentage}%</div>
                        <div className="status-card-label">Fuel</div>
                    </div>
                    <div className={`status-card-indicator ${fuelPercentage >= 20 ? 'good' : 'warning'}`}></div>
                </div>

                <div className="status-card" onClick={() => toggleSection('planet')}>
                    <div className="status-card-icon">🌍</div>
                    <div className="status-card-content">
                        <div className="status-card-value">{faction}</div>
                        <div className="status-card-label">Planet</div>
                    </div>
                    <div className="status-card-indicator good"></div>
                </div>
            </div>

            {/* Resources Section - Always visible but collapsible */}
            <div className="dashboard-section resources-section">
                <div className="section-header" onClick={() => toggleSection('resources')}>
                    <div className="section-title">
                        <span className="section-icon">📦</span>
                        <span>Resources ({allResourcesWithData.filter(id => id !== 'cargo-fuel').length})</span>
                    </div>
                    <div className={`expand-arrow ${expandedSections.resources ? 'expanded' : ''}`}>
                        {expandedSections.resources ? '▲' : '▼'}
                    </div>
                </div>

                {expandedSections.resources && (
                    <div className="section-content">
                        <div className="resources-grid">
                            {allResourcesWithData.length > 0 ? (
                                allResourcesWithData
                                    .filter(resourceId => resourceId !== 'cargo-fuel')
                                    .map(resourceId => {
                                        const resourceData = claimStake.resources?.[resourceId];
                                        const amount = typeof resourceData === 'object' && resourceData.amount !== undefined
                                            ? resourceData.amount
                                            : (typeof resourceData === 'number' ? resourceData : 0);
                                        const rate = resourceRates[resourceId] || 0;

                                        return (
                                            <div key={`${resourceId}-${amount}-${rate}`} className="resource-card">
                                                <div className="resource-name">{resourceId.replace('cargo-', '')}</div>
                                                <div className="resource-amount">
                                                    {isNaN(amount) || amount === undefined || amount === null ? '0.0' : Number(amount).toFixed(1)}
                                                </div>
                                                {rate !== 0 && (
                                                    <div className={`resource-rate ${rate >= 0 ? 'positive' : 'negative'}`}>
                                                        {rate > 0 ? '+' : ''}{isNaN(rate) ? '0.00' : rate.toFixed(2)}/s
                                                    </div>
                                                )}
                                                {!operational && currentFuel <= 0 && rate === 0 && (
                                                    <div className="resource-rate negative">No Fuel</div>
                                                )}
                                            </div>
                                        );
                                    })
                            ) : (
                                <div className="no-resources">No resources found</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Expandable Detail Sections */}
            {expandedSections.slots && (
                <div className="dashboard-section slots-details">
                    <div className="section-header" onClick={() => toggleSection('slots')}>
                        <div className="section-title">
                            <span className="section-icon">🏠</span>
                            <span>Slots Details</span>
                        </div>
                        <div className="expand-arrow">▲</div>
                    </div>
                    <div className="section-content">
                        <div className="slots-stats-grid">
                            <div className="slots-stat">
                                <span className="stat-label">Total Slots:</span>
                                <span className="stat-value">{claimStake.definition?.slots || 0}</span>
                            </div>
                            <div className="slots-stat">
                                <span className="stat-label">Used Slots:</span>
                                <span className="stat-value">{claimStake.buildings?.length || 0}</span>
                            </div>
                            <div className="slots-stat">
                                <span className="stat-label">Available:</span>
                                <span className="stat-value">{(claimStake.definition?.slots || 0) - (claimStake.buildings?.length || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {expandedSections.power && (
                <div className="dashboard-section power-details">
                    <div className="section-header" onClick={() => toggleSection('power')}>
                        <div className="section-title">
                            <span className="section-icon">⚡</span>
                            <span>Power Details</span>
                        </div>
                        <div className="expand-arrow">▲</div>
                    </div>
                    <div className="section-content">
                        <div className="power-stats-grid">
                            <div className="power-stat">
                                <span className="stat-label">Generation:</span>
                                <span className="stat-value positive">+{powerStats.generation}</span>
                            </div>
                            <div className="power-stat">
                                <span className="stat-label">Consumption:</span>
                                <span className="stat-value negative">-{powerStats.consumption}</span>
                            </div>
                            <div className="power-stat">
                                <span className="stat-label">Net Power:</span>
                                <span className={`stat-value ${powerStats.net >= 0 ? 'positive' : 'negative'}`}>
                                    {powerStats.net > 0 ? '+' : ''}{powerStats.net}
                                </span>
                            </div>
                            <div className="power-stat">
                                <span className="stat-label">Status:</span>
                                <span className={`status-badge ${operational ? 'operational' : 'inactive'}`}>
                                    {operational ? 'Operational' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {expandedSections.crew && (
                <div className="dashboard-section crew-details">
                    <div className="section-header" onClick={() => toggleSection('crew')}>
                        <div className="section-title">
                            <span className="section-icon">👥</span>
                            <span>Crew Details</span>
                        </div>
                        <div className="expand-arrow">▲</div>
                    </div>
                    <div className="section-content">
                        <div className="crew-bar">
                            <div
                                className={`crew-used ${crewStats.usedCrew > crewStats.totalSlots ? 'crew-exceeded' : ''}`}
                                style={{ width: `${crewStats.totalSlots > 0 ? (crewStats.usedCrew / crewStats.totalSlots) * 100 : 0}%` }}
                            />
                        </div>
                        <div className="crew-stats-grid">
                            <div className="crew-stat">
                                <span className="stat-label">Total Slots:</span>
                                <span className="stat-value">{crewStats.totalSlots}</span>
                            </div>
                            <div className="crew-stat">
                                <span className="stat-label">Required:</span>
                                <span className="stat-value">{crewStats.usedCrew}</span>
                            </div>
                            <div className="crew-stat">
                                <span className="stat-label">Available:</span>
                                <span className="stat-value">{crewStats.available}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {expandedSections.fuel && (
                <div className="dashboard-section fuel-details">
                    <div className="section-header" onClick={() => toggleSection('fuel')}>
                        <div className="section-title">
                            <span className="section-icon">⛽</span>
                            <span>Fuel Details</span>
                        </div>
                        <div className="expand-arrow">▲</div>
                    </div>
                    <div className="section-content">
                        <div className="fuel-stats-grid">
                            <div className="fuel-stat">
                                <span className="stat-label">Current:</span>
                                <span className="stat-value">{currentFuel.toFixed(1)}</span>
                            </div>
                            <div className="fuel-stat">
                                <span className="stat-label">Capacity:</span>
                                <span className="stat-value">{maxFuelCapacity}</span>
                            </div>
                            <div className="fuel-stat">
                                <span className="stat-label">Percentage:</span>
                                <span className={`stat-value ${fuelPercentage >= 20 ? 'positive' : 'negative'}`}>
                                    {fuelPercentage}%
                                </span>
                            </div>
                        </div>
                        <button
                            className="resupply-fuel-button"
                            onClick={handleResupplyFuel}
                            disabled={!onUpdate}
                        >
                            Resupply Fuel (+{tier * 1000})
                        </button>
                    </div>
                </div>
            )}

            {expandedSections.planet && (
                <div className="dashboard-section planet-details">
                    <div className="section-header" onClick={() => toggleSection('planet')}>
                        <div className="section-title">
                            <span className="section-icon">🌍</span>
                            <span>Planet Details</span>
                        </div>
                        <div className="expand-arrow">▲</div>
                    </div>
                    <div className="section-content">
                        <div className="planet-info-grid">
                            <div className="planet-info-item">
                                <span className="planet-info-label">Type:</span>
                                <span className="planet-info-value">{planetType}</span>
                            </div>
                            <div className="planet-info-item">
                                <span className="planet-info-label">Faction:</span>
                                <span className="planet-info-value">{faction}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClaimStakeStatus; 