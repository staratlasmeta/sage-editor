import React, { useState, useMemo } from 'react';
import { useSharedState } from '../contexts/SharedStateContext';
import { useGameData } from '../contexts/DataContext';

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
    flows: ResourceFlow[];
}

interface GlobalResourcePanelProps {
    className?: string;
}

export function GlobalResourcePanel({ className = '' }: GlobalResourcePanelProps) {
    const { state, addToInventory } = useSharedState();
    const { gameData } = useGameData();
    const [expandedCategory, setExpandedCategory] = useState<string | null>('all');
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showFlowDetails, setShowFlowDetails] = useState(false);
    const [hoveredResource, setHoveredResource] = useState<string | null>(null);

    // Get resource definitions
    const resources = gameData?.resources || [];

    // Get claim stakes data from global state
    const claimStakes = (state.claimStakesData || []) as ClaimStakeData[];

    // Aggregate resource flows from all claim stakes
    const aggregatedFlows = useMemo(() => {
        const flows: Record<string, ResourceFlow> = {};

        claimStakes.forEach(stake => {
            stake.flows?.forEach(flow => {
                if (!flows[flow.resource]) {
                    flows[flow.resource] = {
                        resource: flow.resource,
                        extraction: 0,
                        production: 0,
                        consumption: 0,
                        net: 0,
                        storage: 0,
                        potentialExtraction: 0,
                        potentialProduction: 0,
                        isActive: true,
                        stopReasons: []
                    };
                }

                flows[flow.resource].extraction += flow.extraction || 0;
                flows[flow.resource].production += flow.production || 0;
                flows[flow.resource].consumption += flow.consumption || 0;
                flows[flow.resource].net += flow.net || 0;
                flows[flow.resource].storage += flow.storage || 0;
                flows[flow.resource].potentialExtraction! += flow.potentialExtraction || 0;
                flows[flow.resource].potentialProduction! += flow.potentialProduction || 0;

                // Mark as inactive if any stake is inactive for this resource
                if (!flow.isActive) {
                    flows[flow.resource].isActive = false;
                    // Merge stop reasons
                    if (flow.stopReasons) {
                        const existingReasons = new Set(flows[flow.resource].stopReasons);
                        flow.stopReasons.forEach(reason => existingReasons.add(reason));
                        flows[flow.resource].stopReasons = Array.from(existingReasons);
                    }
                }
            });
        });

        return Object.values(flows);
    }, [claimStakes]);

    // Categorize resources
    const categorizedResources = {
        raw: [] as string[],
        processed: [] as string[],
        advanced: [] as string[],
        fuel: ['fuel'],
        all: [] as string[]
    };

    // Sort resources into categories
    Object.entries(state.starbaseInventory).forEach(([resource, amount]) => {
        if (amount > 0) {
            categorizedResources.all.push(resource);

            // Categorize based on resource name patterns
            if (resource.includes('-ore') || resource === 'hydrogen' || resource === 'coal' || resource === 'silica') {
                categorizedResources.raw.push(resource);
            } else if (resource === 'fuel') {
                // Already in fuel category
            } else if (resource.includes('steel') || resource.includes('copper') || resource.includes('iron-plate')) {
                categorizedResources.processed.push(resource);
            } else {
                categorizedResources.advanced.push(resource);
            }
        }
    });

    // Add resources from flows that aren't in inventory
    aggregatedFlows.forEach(flow => {
        if (!categorizedResources.all.includes(flow.resource)) {
            categorizedResources.all.push(flow.resource);

            // Categorize
            const resource = flow.resource;
            if (resource.includes('-ore') || resource === 'hydrogen' || resource === 'coal' || resource === 'silica') {
                categorizedResources.raw.push(resource);
            } else if (resource === 'fuel') {
                if (!categorizedResources.fuel.includes(resource)) {
                    categorizedResources.fuel.push(resource);
                }
            } else if (resource.includes('steel') || resource.includes('copper') || resource.includes('iron-plate')) {
                categorizedResources.processed.push(resource);
            } else {
                categorizedResources.advanced.push(resource);
            }
        }
    });

    // Add all of the raw resources to the inventory from resources.json

    const handleMagicResources = () => {
        const magicResources: Record<string, number> = {};

        // Add all extractable raw resources from resources.json
        const extractableResources = [
            'iron-ore', 'copper-ore', 'aluminum-ore', 'titanium-ore',
            'silica', 'carbon', 'hydrogen', 'coal',
            'chromite-ore', 'osmium-ore', 'tritium-ore',
            'arco', 'lumanite', 'biomass'
        ];

        // Add raw resources - 1000 of each
        extractableResources.forEach(resource => {
            magicResources[resource] = 1000;
        });

        // Add some processed resources for testing
        const processedResources = [
            'iron', 'copper', 'aluminum', 'titanium',
            'steel', 'electronics', 'fuel',
            'chromite', 'osmium', 'tritium'
        ];

        processedResources.forEach(resource => {
            magicResources[resource] = 500;
        });

        // Add some advanced resources
        const advancedResources = [
            'circuit-board', 'high-density-alloy', 'power-cell'
        ];

        advancedResources.forEach(resource => {
            magicResources[resource] = 100;
        });

        addToInventory(magicResources as Record<string, number>);
        console.log('✨ Magic resources added:', magicResources);
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return Math.floor(num).toString();
    };

    const formatRate = (rate: number): string => {
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

    const getResourceIcon = (resource: string): string => {
        if (resource === 'fuel') return '⛽';
        if (resource.includes('-ore')) return '⛏️';
        if (resource === 'hydrogen') return '💨';
        if (resource === 'coal') return '🪨';
        if (resource === 'steel') return '🔧';
        if (resource.includes('copper')) return '🟠';
        if (resource.includes('iron')) return '⚙️';
        if (resource.includes('circuit') || resource.includes('electronic')) return '🔌';
        if (resource === 'silica') return '💎';
        return '📦';
    };

    const categories = [
        { id: 'all', name: 'All Resources', icon: '📊' },
        { id: 'raw', name: 'Raw Materials', icon: '⛏️' },
        { id: 'processed', name: 'Processed', icon: '🏭' },
        { id: 'advanced', name: 'Advanced', icon: '🔬' },
        { id: 'fuel', name: 'Fuel', icon: '⛽' }
    ];

    return (
        <div className={`global-resource-panel ${className}`}>
            <div className="panel-header">
                <h3>🌍 Global Resources</h3>
                <div className="panel-actions">
                    <button
                        className={`btn-icon ${showFlowDetails ? 'active' : ''}`}
                        onClick={() => setShowFlowDetails(!showFlowDetails)}
                        title="Toggle Flow Details"
                    >
                        📊
                    </button>
                    <button
                        className="btn-icon"
                        onClick={() => setShowTransferModal(true)}
                        title="Transfer Resources"
                    >
                        🔄
                    </button>
                    <button
                        className="btn-icon"
                        onClick={handleMagicResources}
                        title="Add Magic Resources"
                    >
                        🪄
                    </button>
                </div>
            </div>

            <div className="starbase-info">
                <div className="info-row">
                    <span className="label">Starbase Level:</span>
                    <span className="value">{state.starbaseLevel}</span>
                </div>
                <div className="info-row">
                    <span className="label">Total Resources:</span>
                    <span className="value">
                        {formatNumber(Object.values(state.starbaseInventory).reduce((sum, val) => sum + val, 0))}
                    </span>
                </div>
            </div>

            <div className="category-tabs">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        className={`category-tab ${expandedCategory === cat.id ? 'active' : ''}`}
                        onClick={() => setExpandedCategory(cat.id === expandedCategory ? null : cat.id)}
                    >
                        <span className="tab-icon">{cat.icon}</span>
                        <span className="tab-count">
                            {categorizedResources[cat.id as keyof typeof categorizedResources].length}
                        </span>
                    </button>
                ))}
            </div>

            <div className="resource-list">
                {expandedCategory && categorizedResources[expandedCategory as keyof typeof categorizedResources].map(resource => {
                    const amount = state.starbaseInventory[resource] || 0;
                    const flow = aggregatedFlows.find(f => f.resource === resource);

                    return (
                        <div key={resource} className="resource-item">
                            <div className="resource-icon">
                                {getResourceIcon(resource)}
                            </div>
                            <div className="resource-info">
                                <div className="resource-name">{resource}</div>
                                <div className="resource-amount">
                                    {formatNumber(amount)}
                                </div>
                                {showFlowDetails && flow && (
                                    <div className="resource-flow-details">
                                        {flow.potentialExtraction! > 0 && (
                                            <div className={`flow-stat ${!flow.isActive ? 'inactive' : ''}`}>
                                                <span className="flow-label">Extract:</span>
                                                <span className="flow-value">
                                                    {flow.extraction > 0 ? formatRate(flow.extraction) : '0/s'}
                                                    {flow.extraction !== flow.potentialExtraction && (
                                                        <span className="potential"> ({formatRate(flow.potentialExtraction!)})</span>
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                        {flow.potentialProduction! > 0 && (
                                            <div className={`flow-stat ${!flow.isActive ? 'inactive' : ''}`}>
                                                <span className="flow-label">Produce:</span>
                                                <span className="flow-value">
                                                    {flow.production > 0 ? formatRate(flow.production) : '0/s'}
                                                    {flow.production !== flow.potentialProduction && (
                                                        <span className="potential"> ({formatRate(flow.potentialProduction!)})</span>
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                        {flow.consumption > 0 && (
                                            <div className="flow-stat">
                                                <span className="flow-label">Consume:</span>
                                                <span className="flow-value">{formatRate(-flow.consumption)}</span>
                                            </div>
                                        )}
                                        {(flow.extraction > 0 || flow.production > 0 || flow.consumption > 0) && (
                                            <div className="flow-stat net">
                                                <span className="flow-label">Net:</span>
                                                <span className={`flow-value ${flow.net > 0 ? 'positive' : flow.net < 0 ? 'negative' : ''}`}>
                                                    {formatRate(flow.net)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="resource-status">
                                {flow && !flow.isActive && (
                                    <div
                                        className="stop-indicator"
                                        onMouseEnter={() => setHoveredResource(resource)}
                                        onMouseLeave={() => setHoveredResource(null)}
                                    >
                                        <span className="stop-icon">⚠️</span>
                                        {hoveredResource === resource && flow.stopReasons && flow.stopReasons.length > 0 && (
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
                                )}
                            </div>
                        </div>
                    );
                })}

                {expandedCategory && categorizedResources[expandedCategory as keyof typeof categorizedResources].length === 0 && (
                    <div className="empty-category">
                        No resources in this category
                    </div>
                )}
            </div>

            <div className="resource-summary">
                <h4>Quick Stats</h4>
                <div className="summary-grid">
                    <div className="summary-item">
                        <span className="summary-label">Fuel</span>
                        <span className={`summary-value ${(state.starbaseInventory.fuel || 0) < 10 ? 'warning' : ''}`}>
                            {formatNumber(state.starbaseInventory.fuel || 0)}
                        </span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Iron</span>
                        <span className="summary-value">
                            {formatNumber((state.starbaseInventory['iron-ore'] || 0) + (state.starbaseInventory['iron-plate'] || 0))}
                        </span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Copper</span>
                        <span className="summary-value">
                            {formatNumber((state.starbaseInventory['copper-ore'] || 0) + (state.starbaseInventory['copper'] || 0))}
                        </span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Advanced</span>
                        <span className="summary-value">
                            {formatNumber((state.starbaseInventory['circuit-board'] || 0) + (state.starbaseInventory['electronics'] || 0))}
                        </span>
                    </div>
                </div>
            </div>

            {/* Transfer Modal */}
            {showTransferModal && (
                <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Resource Transfer Hub</h3>
                            <button className="close-button" onClick={() => setShowTransferModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>Resource transfers are managed through individual tools:</p>
                            <ul>
                                <li>📍 Claim Stakes: Export extracted resources</li>
                                <li>🔧 Crafting Hab: Import for crafting</li>
                                <li>📋 Recipes: Plan resource requirements</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 