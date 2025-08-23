import React, { useState } from 'react';

interface ResourceFlow {
    resource: string;
    extraction: number;      // Raw extraction per second
    production: number;      // Processing output per second
    consumption: number;     // Usage per second
    net: number;            // Net gain/loss per second
    storage: number;        // Current stored amount
}

interface ClaimStakeResources {
    id: string;
    name: string;
    planetName: string;
    tier: number;
    flows: ResourceFlow[];
    totalStorage: number;
    maxStorage: number;
}

interface ResourceManagerProps {
    claimStakes: ClaimStakeResources[];
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
                        storage: 0
                    };
                }

                totals[flow.resource].extraction += flow.extraction;
                totals[flow.resource].production += flow.production;
                totals[flow.resource].consumption += flow.consumption;
                totals[flow.resource].net += flow.net;
                totals[flow.resource].storage += flow.storage;
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

    const formatRate = (rate: number) => {
        if (Math.abs(rate) < 0.01) return '0';
        const sign = rate > 0 ? '+' : '';
        return `${sign}${rate.toFixed(2)}/s`;
    };

    const getFlowColor = (net: number) => {
        if (net > 0) return 'var(--status-success)';
        if (net < 0) return 'var(--status-danger)';
        return 'var(--text-dim)';
    };

    return (
        <div className="resource-manager">
            <div className="manager-header">
                <h3>Resource Management</h3>
                <div className="view-controls">
                    <button
                        className={`view-btn ${viewMode === 'individual' ? 'active' : ''}`}
                        onClick={() => setViewMode('individual')}
                    >
                        By Claim Stake
                    </button>
                    <button
                        className={`view-btn ${viewMode === 'aggregate' ? 'active' : ''}`}
                        onClick={() => setViewMode('aggregate')}
                    >
                        Aggregate View
                    </button>
                </div>
            </div>

            {viewMode === 'individual' ? (
                <div className="individual-view">
                    {claimStakes.map(stake => (
                        <div key={stake.id} className="stake-resources">
                            <div
                                className="stake-header"
                                onClick={() => setExpandedStake(expandedStake === stake.id ? null : stake.id)}
                            >
                                <div className="stake-info">
                                    <h4>{stake.name}</h4>
                                    <span className="planet-name">{stake.planetName} • T{stake.tier}</span>
                                </div>
                                <div className="stake-summary">
                                    <span className="storage-indicator" title="Used Storage / Max Storage">
                                        📦 {Math.floor(stake.totalStorage)}/{stake.maxStorage}
                                    </span>
                                    <button
                                        className="btn-icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onMagicResources(stake.id);
                                        }}
                                        title="Add magic resources"
                                    >
                                        🪄
                                    </button>
                                    <span className="expand-icon">
                                        {expandedStake === stake.id ? '▼' : '▶'}
                                    </span>
                                </div>
                            </div>

                            {expandedStake === stake.id && (
                                <div className="stake-details">
                                    <div className="resource-flows">
                                        <table className="flow-table">
                                            <thead>
                                                <tr>
                                                    <th>Resource</th>
                                                    <th>Extract</th>
                                                    <th>Process</th>
                                                    <th>Consume</th>
                                                    <th>Net</th>
                                                    <th>Storage</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stake.flows.map(flow => (
                                                    <tr key={flow.resource}>
                                                        <td className="resource-name">{flow.resource}</td>
                                                        <td className="extraction">
                                                            {flow.extraction > 0 && formatRate(flow.extraction)}
                                                        </td>
                                                        <td className="production">
                                                            {flow.production > 0 && formatRate(flow.production)}
                                                        </td>
                                                        <td className="consumption">
                                                            {flow.consumption > 0 && formatRate(-flow.consumption)}
                                                        </td>
                                                        <td className="net" style={{ color: getFlowColor(flow.net) }}>
                                                            {formatRate(flow.net)}
                                                        </td>
                                                        <td className="storage">{Math.floor(flow.storage)}</td>
                                                        <td className="actions">
                                                            {flow.storage > 0 && (
                                                                <button
                                                                    className="btn-sm"
                                                                    onClick={() => {
                                                                        setSelectedSource(stake.id);
                                                                        setTransferAmounts({
                                                                            ...transferAmounts,
                                                                            [flow.resource]: Math.floor(flow.storage)
                                                                        });
                                                                    }}
                                                                >
                                                                    Transfer
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="stake-actions">
                                        <button
                                            className={`btn btn-secondary ${selectedSource === stake.id ? 'active' : ''}`}
                                            onClick={() => setSelectedSource(stake.id)}
                                        >
                                            Set as Source
                                        </button>
                                        <button
                                            className={`btn btn-secondary ${selectedTarget === stake.id ? 'active' : ''}`}
                                            onClick={() => setSelectedTarget(stake.id)}
                                        >
                                            Set as Target
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
                                </tr>
                            </thead>
                            <tbody>
                                {aggregateFlows().map(flow => (
                                    <tr key={flow.resource}>
                                        <td className="resource-name">{flow.resource}</td>
                                        <td className="extraction">{formatRate(flow.extraction)}</td>
                                        <td className="production">{formatRate(flow.production)}</td>
                                        <td className="consumption">{formatRate(-flow.consumption)}</td>
                                        <td className="net" style={{ color: getFlowColor(flow.net) }}>
                                            {formatRate(flow.net)}
                                        </td>
                                        <td className="storage">{Math.floor(flow.storage)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="aggregate-actions">
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                // Transfer all resources to starbase
                                const allResources: Record<string, number> = {};
                                claimStakes.forEach(stake => {
                                    stake.flows.forEach(flow => {
                                        if (flow.storage > 0) {
                                            allResources[flow.resource] = (allResources[flow.resource] || 0) + flow.storage;
                                        }
                                    });
                                });

                                if (Object.keys(allResources).length > 0) {
                                    onTransfer('all-stakes', 'starbase', allResources);
                                }
                            }}
                        >
                            Transfer All to Starbase
                        </button>
                    </div>
                </div>
            )}

            {/* Starbase Inventory */}
            <div className="starbase-inventory-section">
                <h4>Starbase Inventory</h4>
                <div className="inventory-grid">
                    {Object.entries(starbaseInventory).map(([resource, amount]) => (
                        <div key={resource} className="inventory-item">
                            <span className="resource">{resource}</span>
                            <span className="amount">{amount}</span>
                        </div>
                    ))}
                </div>
                <button
                    className={`btn btn-secondary ${selectedTarget === 'starbase' ? 'active' : ''}`}
                    onClick={() => setSelectedTarget('starbase')}
                >
                    Set Starbase as Transfer Target
                </button>
            </div>

            {/* Transfer Modal */}
            {selectedSource && selectedTarget && (
                <div className="transfer-modal">
                    <h4>Transfer Resources</h4>
                    <div className="transfer-info">
                        <span>From: {selectedSource === 'starbase' ? 'Starbase' : claimStakes.find(s => s.id === selectedSource)?.name}</span>
                        <span>→</span>
                        <span>To: {selectedTarget === 'starbase' ? 'Starbase' : claimStakes.find(s => s.id === selectedTarget)?.name}</span>
                    </div>

                    <div className="transfer-resources">
                        {Object.entries(transferAmounts).map(([resource, amount]) => (
                            <div key={resource} className="transfer-item">
                                <span>{resource}</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={amount}
                                    onChange={(e) => setTransferAmounts({
                                        ...transferAmounts,
                                        [resource]: parseInt(e.target.value) || 0
                                    })}
                                />
                            </div>
                        ))}
                    </div>

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
                        >
                            Confirm Transfer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
} 