import React, { useState } from 'react';
import './ResourceManager.css';

interface ResourceFlow {
    resource: string;
    extraction: number;
    production: number;
    consumption: number;
    net: number;
    storage: number;
    potentialExtraction?: number;
    potentialProduction?: number;
    isActive?: boolean;
    stopReasons?: string[];
}

interface ClaimStakeData {
    id: string;
    name: string;
    planetName: string;
    tier: number;
    resources: Record<string, number>;
    flows: ResourceFlow[];
    totalStorage: number;
    currentStorage: number;
    maxStorage?: number;
}

interface ResourceManagerProps {
    claimStakes: ClaimStakeData[];
    starbaseInventory: Record<string, number>;
    onTransfer: (from: string, to: string, resources: Record<string, number>) => void;
    onMagicResources: (targetId: string) => void;
}

export function ResourceManager({
    claimStakes,
    starbaseInventory,
    onTransfer,
    onMagicResources
}: ResourceManagerProps) {
    const [selectedSource, setSelectedSource] = useState<string | null>(null);
    const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
    const [transferAmounts, setTransferAmounts] = useState<Record<string, number>>({});
    const [viewMode, setViewMode] = useState<'individual' | 'aggregate'>('individual');
    const [expandedStake, setExpandedStake] = useState<string | null>(null);
    const [hoveredResource, setHoveredResource] = useState<string | null>(null);

    // Calculate aggregate resource flows
    const aggregateFlows = () => {
        const totals: Record<string, ResourceFlow> = {};

        claimStakes.forEach(stake => {
            stake.flows.forEach(flow => {
                if (!totals[flow.resource]) {
                    totals[flow.resource] = {
                        resource: flow.resource,
                        extraction: 0,
                        production: 0,
                        consumption: 0,
                        net: 0,
                        storage: 0,
                        potentialExtraction: 0,
                        potentialProduction: 0,
                        isActive: false,
                        stopReasons: []
                    };
                }

                totals[flow.resource].extraction += flow.extraction;
                totals[flow.resource].production += flow.production;
                totals[flow.resource].consumption += flow.consumption;
                totals[flow.resource].net += flow.net;
                totals[flow.resource].storage += flow.storage;
                totals[flow.resource].potentialExtraction! += flow.potentialExtraction || 0;
                totals[flow.resource].potentialProduction! += flow.potentialProduction || 0;

                // Mark as active if any stake is active
                if (flow.isActive) {
                    totals[flow.resource].isActive = true;
                }
            });
        });

        return Object.values(totals);
    };

    const initiateTransfer = () => {
        if (!selectedSource || !selectedTarget || Object.keys(transferAmounts).length === 0) return;

        onTransfer(selectedSource, selectedTarget, transferAmounts);
        setTransferAmounts({});
        setSelectedSource(null);
        setSelectedTarget(null);
    };

    const handleTransferAmountChange = (resource: string, amount: number) => {
        if (amount <= 0) {
            const newAmounts = { ...transferAmounts };
            delete newAmounts[resource];
            setTransferAmounts(newAmounts);
        } else {
            setTransferAmounts({
                ...transferAmounts,
                [resource]: amount
            });
        }
    };

    const getAvailableResources = () => {
        if (!selectedSource) return {};

        if (selectedSource === 'starbase') {
            return starbaseInventory;
        }

        const stake = claimStakes.find(s => s.id === selectedSource);
        if (stake) {
            return stake.resources || {};
        }

        return {};
    };

    const formatRate = (rate: number) => {
        // Adaptive decimal places based on the magnitude
        if (rate === 0) return '0/s';

        const absRate = Math.abs(rate);
        const sign = rate > 0 ? '+' : '';

        // If rate is very small, show more decimal places
        if (absRate < 0.001) return `${sign}${rate.toFixed(4)}/s`;
        if (absRate < 0.01) return `${sign}${rate.toFixed(3)}/s`;
        if (absRate < 1) return `${sign}${rate.toFixed(2)}/s`;
        if (absRate < 100) return `${sign}${rate.toFixed(1)}/s`;

        // For large numbers, no decimals needed
        return `${sign}${Math.floor(rate)}/s`;
    };

    const formatPotentialRate = (actual: number, potential: number) => {
        if (potential === 0) return '0/s';
        if (actual === potential) {
            return formatRate(actual);
        }
        // Show actual/potential when different
        return (
            <span className="rate-display">
                <span className="actual-rate">{formatRate(actual)}</span>
                <span className="potential-rate"> ({formatRate(potential)})</span>
            </span>
        );
    };

    const getFlowColor = (value: number) => {
        if (value > 0) return '#00c896';
        if (value < 0) return '#ff6b35';
        return '#999';
    };

    const renderStopIndicator = (flow: ResourceFlow) => {
        if (flow.isActive) return null;

        return (
            <div
                className="stop-indicator"
                onMouseEnter={() => setHoveredResource(`${flow.resource}_stop`)}
                onMouseLeave={() => setHoveredResource(null)}
            >
                <span className="stop-icon">⚠️</span>
                {hoveredResource === `${flow.resource}_stop` && flow.stopReasons && flow.stopReasons.length > 0 && (
                    <div className="stop-tooltip">
                        <strong>Production Stopped:</strong>
                        <ul>
                            {flow.stopReasons.map((reason, idx) => (
                                <li key={idx}>{reason}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="resource-manager">
            <div className="manager-header">
                <h3>Resource Management</h3>
                <div className="view-toggle">
                    <button
                        className={`btn-toggle ${viewMode === 'individual' ? 'active' : ''}`}
                        onClick={() => setViewMode('individual')}
                    >
                        By Claim Stake
                    </button>
                    <button
                        className={`btn-toggle ${viewMode === 'aggregate' ? 'active' : ''}`}
                        onClick={() => setViewMode('aggregate')}
                    >
                        Aggregate View
                    </button>
                </div>
            </div>

            {viewMode === 'individual' ? (
                <div className="claim-stakes-list">
                    {claimStakes.map(stake => (
                        <div key={stake.id} className="claim-stake-card">
                            <div
                                className="stake-header"
                                onClick={() => setExpandedStake(expandedStake === stake.id ? null : stake.id)}
                            >
                                <h4>{stake.name}</h4>
                                <div className="stake-stats">
                                    <span className="storage-indicator">
                                        {stake.currentStorage.toFixed(2)}/{stake.maxStorage || 1000}
                                    </span>
                                    <span className="chevron">{expandedStake === stake.id ? '▼' : '▶'}</span>
                                </div>
                            </div>

                            {expandedStake === stake.id && (
                                <div className="stake-details">
                                    <table className="flow-table">
                                        <thead>
                                            <tr>
                                                <th>Resource</th>
                                                <th>Extract</th>
                                                <th>Process</th>
                                                <th>Consume</th>
                                                <th>Net</th>
                                                <th>Storage</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stake.flows.map(flow => (
                                                <tr key={flow.resource} className={!flow.isActive ? 'inactive-flow' : ''}>
                                                    <td className="resource-name">{flow.resource}</td>
                                                    <td className="extraction">
                                                        {formatPotentialRate(flow.extraction, flow.potentialExtraction || flow.extraction)}
                                                    </td>
                                                    <td className="production">
                                                        {formatPotentialRate(flow.production, flow.potentialProduction || flow.production)}
                                                    </td>
                                                    <td className="consumption">{formatRate(-flow.consumption)}</td>
                                                    <td className="net" style={{ color: getFlowColor(flow.net) }}>
                                                        {formatRate(flow.net)}
                                                    </td>
                                                    <td className="storage">{Math.floor(flow.storage)}</td>
                                                    <td className="status">
                                                        {renderStopIndicator(flow)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    <div className="stake-actions">
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => {
                                                setSelectedSource(stake.id);
                                                setSelectedTarget('starbase');
                                            }}
                                        >
                                            SET AS SOURCE
                                        </button>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setSelectedTarget(stake.id)}
                                        >
                                            SET AS TARGET
                                        </button>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => onMagicResources(stake.id)}
                                            title="Add 100 fuel for testing (mainly for keeping claim stake running)"
                                        >
                                            ADD FUEL 🪄
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="aggregate-view">
                    <div className="aggregate-summary">
                        <h4>Total Production Across All Claim Stakes</h4>
                        <table className="flow-table">
                            <thead>
                                <tr>
                                    <th>Resource</th>
                                    <th>Total Extraction</th>
                                    <th>Total Production</th>
                                    <th>Total Consumption</th>
                                    <th>Net Rate</th>
                                    <th>Total Storage</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {aggregateFlows().map(flow => (
                                    <tr key={flow.resource} className={!flow.isActive ? 'inactive-flow' : ''}>
                                        <td className="resource-name">{flow.resource}</td>
                                        <td className="extraction">
                                            {formatPotentialRate(flow.extraction, flow.potentialExtraction || flow.extraction)}
                                        </td>
                                        <td className="production">
                                            {formatPotentialRate(flow.production, flow.potentialProduction || flow.production)}
                                        </td>
                                        <td className="consumption">{formatRate(-flow.consumption)}</td>
                                        <td className="net" style={{ color: getFlowColor(flow.net) }}>
                                            {formatRate(flow.net)}
                                        </td>
                                        <td className="storage">{Math.floor(flow.storage)}</td>
                                        <td className="status">
                                            {!flow.isActive && (
                                                <span className="stop-icon" title="Some or all stakes stopped">⚠️</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="aggregate-actions">
                        <button
                            className="btn btn-primary"
                            onClick={() => setViewMode('individual')}
                        >
                            View Individual Stakes
                        </button>
                    </div>
                </div>
            )}

            {/* Transfer Panel */}
            {(selectedSource || selectedTarget) && (
                <div className="transfer-panel">
                    <h4>Resource Transfer</h4>
                    <div className="transfer-info">
                        <div>Source: {
                            selectedSource === 'starbase' ? 'Starbase' :
                                claimStakes.find(s => s.id === selectedSource)?.name || 'Not selected'
                        }</div>
                        <div>Target: {
                            selectedTarget === 'starbase' ? 'Starbase' :
                                claimStakes.find(s => s.id === selectedTarget)?.name || 'Not selected'
                        }</div>
                    </div>
                    {selectedSource && selectedTarget && (
                        <div className="transfer-controls">
                            <p className="info-text">Select resources to transfer:</p>

                            {/* Quick Actions */}
                            <div className="transfer-quick-actions">
                                <button
                                    className="btn btn-quick-action"
                                    onClick={() => {
                                        const resources = getAvailableResources();
                                        const newAmounts: Record<string, number> = {};
                                        Object.entries(resources).forEach(([resource, amount]) => {
                                            if (amount > 0) {
                                                newAmounts[resource] = Math.floor(amount);
                                            }
                                        });
                                        setTransferAmounts(newAmounts);
                                    }}
                                    title="Transfer all available resources"
                                >
                                    Transfer All
                                </button>
                                <button
                                    className="btn btn-quick-action"
                                    onClick={() => {
                                        const resources = getAvailableResources();
                                        const newAmounts: Record<string, number> = {};
                                        Object.entries(resources).forEach(([resource, amount]) => {
                                            if (amount > 0 && resource !== 'fuel') {
                                                newAmounts[resource] = Math.floor(amount);
                                            }
                                        });
                                        setTransferAmounts(newAmounts);
                                    }}
                                    title="Transfer all except fuel"
                                >
                                    All Except Fuel
                                </button>
                                <button
                                    className="btn btn-quick-action"
                                    onClick={() => setTransferAmounts({})}
                                    title="Clear all selections"
                                >
                                    Clear All
                                </button>
                            </div>

                            <div className="resource-transfer-list">
                                {Object.entries(getAvailableResources()).map(([resource, available]) => {
                                    if (available <= 0) return null;
                                    const isSelected = transferAmounts[resource] && transferAmounts[resource] > 0;
                                    return (
                                        <div key={resource} className={`transfer-resource-item ${isSelected ? 'selected' : ''}`}>
                                            <span className="resource-label">{resource}</span>
                                            <span className="available-amount">Available: {Math.floor(available)}</span>
                                            <input
                                                type="number"
                                                min="0"
                                                max={available}
                                                value={transferAmounts[resource] || ''}
                                                onChange={(e) => {
                                                    const value = parseInt(e.target.value) || 0;
                                                    handleTransferAmountChange(resource, Math.min(value, available));
                                                }}
                                                placeholder="0"
                                                className="transfer-input"
                                            />
                                            <button
                                                className="btn-transfer-max"
                                                onClick={() => handleTransferAmountChange(resource, Math.floor(available))}
                                                title="Transfer all of this resource"
                                            >
                                                MAX
                                            </button>
                                            {isSelected && (
                                                <button
                                                    className="btn-transfer-clear"
                                                    onClick={() => handleTransferAmountChange(resource, 0)}
                                                    title="Remove from transfer"
                                                >
                                                    ✖
                                                </button>
                                            )}
                                        </div>
                                    );
                                }).filter(Boolean)}
                            </div>
                            {Object.keys(transferAmounts).length > 0 && (
                                <div className="transfer-summary">
                                    <strong>Transfer Summary:</strong>
                                    <div className="summary-items">
                                        {Object.entries(transferAmounts).map(([resource, amount]) => (
                                            amount > 0 && (
                                                <div key={resource} className="summary-item">
                                                    <span className="summary-resource">{resource}:</span>
                                                    <span className="summary-amount">{amount}</span>
                                                    <button
                                                        className="summary-remove"
                                                        onClick={() => handleTransferAmountChange(resource, 0)}
                                                        title="Remove from transfer"
                                                    >
                                                        ✖
                                                    </button>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="transfer-actions">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setSelectedSource(null);
                                        setSelectedTarget(null);
                                        setTransferAmounts({});
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={initiateTransfer}
                                    disabled={Object.keys(transferAmounts).length === 0}
                                >
                                    Execute Transfer
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
} 