import React, { useState, useMemo, useEffect } from 'react';
import { useSharedState } from '../contexts/SharedStateContext';
import { useGameData } from '../contexts/DataContext';

interface ResourcesViewProps {
    claimStakes?: any[];
    onTransfer?: (from: string, to: string, resources: Record<string, number>) => void;
    onClose: () => void;
}

interface ResourceCategory {
    id: string;
    name: string;
    resources: ResourceInfo[];
}

interface ResourceInfo {
    id: string;
    name: string;
    category: string;
    total: number;
    locations: LocationInfo[];
    production: number;
    consumption: number;
    net: number;
}

interface LocationInfo {
    id: string;
    name: string;
    type: 'starbase' | 'claim-stake' | 'crafting-hab';
    amount: number;
    production?: number;
    consumption?: number;
    storage?: number;
    maxStorage?: number;
}

export function ResourcesView({ claimStakes = [], onTransfer, onClose }: ResourcesViewProps) {
    const { state: sharedState } = useSharedState();
    const { gameData } = useGameData();

    // Use global claim stakes data if not provided as prop
    const effectiveClaimStakes = claimStakes.length > 0 ? claimStakes : (sharedState.claimStakesData || []);

    // Set up polling for updates if using global data
    useEffect(() => {
        if (claimStakes.length === 0) {
            // We're using global data, so it will auto-update when SharedState changes
            console.log('Using global claim stakes data:', sharedState.claimStakesData?.length || 0, 'stakes');
        }
    }, [sharedState.claimStakesData, claimStakes.length]);

    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedResource, setSelectedResource] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'flow'>('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyActive, setShowOnlyActive] = useState(false);
    const [sortBy, setSortBy] = useState<'name' | 'amount' | 'production' | 'net'>('name');

    // Aggregate all resources
    const aggregatedResources = useMemo(() => {
        const resources: Record<string, ResourceInfo> = {};

        // Process starbase inventory
        Object.entries(sharedState.starbaseInventory || {}).forEach(([resourceId, amount]) => {
            if (!resources[resourceId]) {
                resources[resourceId] = {
                    id: resourceId,
                    name: resourceId,
                    category: 'unknown',
                    total: 0,
                    locations: [],
                    production: 0,
                    consumption: 0,
                    net: 0
                };
            }

            resources[resourceId].total += amount;
            resources[resourceId].locations.push({
                id: 'starbase',
                name: `Starbase (Level ${sharedState.starbaseLevel})`,
                type: 'starbase',
                amount
            });
        });

        // Process claim stakes
        effectiveClaimStakes.forEach(stake => {
            // Process stored resources
            Object.entries(stake.resources || {}).forEach(([resourceId, amount]) => {
                if (!resources[resourceId]) {
                    resources[resourceId] = {
                        id: resourceId,
                        name: resourceId,
                        category: 'unknown',
                        total: 0,
                        locations: [],
                        production: 0,
                        consumption: 0,
                        net: 0
                    };
                }

                resources[resourceId].total += amount as number;

                const location = resources[resourceId].locations.find(l => l.id === stake.id);
                if (location) {
                    location.amount += amount as number;
                } else {
                    resources[resourceId].locations.push({
                        id: stake.id,
                        name: `${stake.planetName} - T${stake.tier}`,
                        type: 'claim-stake',
                        amount: amount as number,
                        storage: stake.currentStorage,
                        maxStorage: stake.maxStorage
                    });
                }
            });

            // Process resource flows
            stake.flows?.forEach((flow: any) => {
                if (!resources[flow.resource]) {
                    resources[flow.resource] = {
                        id: flow.resource,
                        name: flow.resource,
                        category: 'unknown',
                        total: flow.storage || 0,
                        locations: [],
                        production: 0,
                        consumption: 0,
                        net: 0
                    };
                }

                resources[flow.resource].production += flow.extraction + flow.production;
                resources[flow.resource].consumption += flow.consumption;
                resources[flow.resource].net += flow.net;

                const location = resources[flow.resource].locations.find(l => l.id === stake.id);
                if (location) {
                    location.production = (location.production || 0) + flow.extraction + flow.production;
                    location.consumption = (location.consumption || 0) + flow.consumption;
                }
            });
        });

        // Process crafting hab inventories if available
        const craftingHabState = sharedState.craftingHabState;
        if (craftingHabState?.habPlots) {
            craftingHabState.habPlots.forEach((plot: any) => {
                if (plot.inventory) {
                    Object.entries(plot.inventory).forEach(([resourceId, amount]) => {
                        if (!resources[resourceId]) {
                            resources[resourceId] = {
                                id: resourceId,
                                name: resourceId,
                                category: 'unknown',
                                total: 0,
                                locations: [],
                                production: 0,
                                consumption: 0,
                                net: 0
                            };
                        }

                        resources[resourceId].total += amount as number;
                        resources[resourceId].locations.push({
                            id: plot.id,
                            name: `Hab Plot T${plot.tier}`,
                            type: 'crafting-hab',
                            amount: amount as number
                        });
                    });
                }
            });
        }

        // Categorize resources based on game data
        Object.values(resources).forEach(resource => {
            const gameResource = gameData?.resources?.find((r: any) => r.id === resource.id);
            if (gameResource) {
                resource.name = gameResource.name || resource.id;
                resource.category = gameResource.category || 'unknown';
            }
        });

        return resources;
    }, [sharedState, claimStakes, gameData]);

    // Filter and sort resources
    const filteredResources = useMemo(() => {
        let filtered = Object.values(aggregatedResources);

        // Category filter
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(r => r.category === selectedCategory);
        }

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(r =>
                r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.id.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Active filter
        if (showOnlyActive) {
            filtered = filtered.filter(r => r.total > 0 || r.production > 0 || r.consumption > 0);
        }

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'amount':
                    return b.total - a.total;
                case 'production':
                    return b.production - a.production;
                case 'net':
                    return b.net - a.net;
                case 'name':
                default:
                    return a.name.localeCompare(b.name);
            }
        });

        return filtered;
    }, [aggregatedResources, selectedCategory, searchTerm, showOnlyActive, sortBy]);

    // Get categories
    const categories = useMemo(() => {
        const cats = new Set<string>();
        Object.values(aggregatedResources).forEach(r => cats.add(r.category));
        return Array.from(cats).sort();
    }, [aggregatedResources]);

    // Calculate totals
    const totals = useMemo(() => {
        return {
            resources: Object.keys(aggregatedResources).length,
            totalAmount: Object.values(aggregatedResources).reduce((sum, r) => sum + r.total, 0),
            totalProduction: Object.values(aggregatedResources).reduce((sum, r) => sum + r.production, 0),
            totalConsumption: Object.values(aggregatedResources).reduce((sum, r) => sum + r.consumption, 0),
            netFlow: Object.values(aggregatedResources).reduce((sum, r) => sum + r.net, 0)
        };
    }, [aggregatedResources]);

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
        <div className="resources-view-overlay" onClick={onClose}>
            <div className="resources-view-panel" onClick={(e) => e.stopPropagation()}>
                <div className="resources-header">
                    <div className="header-content">
                        <h2>🌐 Global Resource Management</h2>
                        <div className="header-stats">
                            <span className="stat-badge">
                                <span className="stat-label">Total Resources:</span>
                                <span className="stat-value">{totals.resources}</span>
                            </span>
                            <span className="stat-badge">
                                <span className="stat-label">Total Amount:</span>
                                <span className="stat-value">{Math.floor(totals.totalAmount).toLocaleString()}</span>
                            </span>
                            <span className="stat-badge production">
                                <span className="stat-label">Production:</span>
                                <span className="stat-value">+{totals.totalProduction.toFixed(2)}/s</span>
                            </span>
                            <span className="stat-badge consumption">
                                <span className="stat-label">Consumption:</span>
                                <span className="stat-value">-{totals.totalConsumption.toFixed(2)}/s</span>
                            </span>
                            <span className={`stat-badge net-flow ${totals.netFlow >= 0 ? 'positive' : 'negative'}`}>
                                <span className="stat-label">Net:</span>
                                <span className="stat-value">{formatRate(totals.netFlow)}</span>
                            </span>
                        </div>
                    </div>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="resources-toolbar">
                    <div className="search-section">
                        <input
                            type="text"
                            placeholder="🔍 Search resources..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    <div className="filter-section">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="category-select"
                        >
                            <option value="all">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        <button
                            className={`filter-button ${showOnlyActive ? 'active' : ''}`}
                            onClick={() => setShowOnlyActive(!showOnlyActive)}
                        >
                            {showOnlyActive ? '✓ ' : ''}Active Only
                        </button>
                    </div>

                    <div className="view-controls">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="sort-select"
                        >
                            <option value="name">Sort by Name</option>
                            <option value="amount">Sort by Amount</option>
                            <option value="production">Sort by Production</option>
                            <option value="net">Sort by Net Flow</option>
                        </select>

                        <div className="view-mode-buttons">
                            <button
                                className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
                                onClick={() => setViewMode('grid')}
                                title="Grid View"
                            >
                                ⊞
                            </button>
                            <button
                                className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => setViewMode('list')}
                                title="List View"
                            >
                                ☰
                            </button>
                            <button
                                className={`view-button ${viewMode === 'flow' ? 'active' : ''}`}
                                onClick={() => setViewMode('flow')}
                                title="Flow View"
                            >
                                ⇄
                            </button>
                        </div>
                    </div>
                </div>

                <div className={`resources-content view-${viewMode}`}>
                    {viewMode === 'grid' && (
                        <div className="resources-grid">
                            {filteredResources.map(resource => {
                                const hasActivity = resource.production > 0 || resource.consumption > 0;
                                const netFlow = resource.net;

                                return (
                                    <div
                                        key={resource.id}
                                        className={`resource-card ${selectedResource === resource.id ? 'selected' : ''} ${hasActivity ? 'active' : ''}`}
                                        onClick={() => setSelectedResource(selectedResource === resource.id ? null : resource.id)}
                                    >
                                        <div className="resource-card-header">
                                            <div className="resource-icon">
                                                {resource.category === 'raw' ? '⛏️' :
                                                    resource.category === 'processed' ? '⚙️' :
                                                        resource.category === 'fuel' ? '⚡' : '📦'}
                                            </div>
                                            <div className="resource-info">
                                                <h4 className="resource-name">{resource.name}</h4>
                                                <span className="resource-category">{resource.category}</span>
                                            </div>
                                        </div>

                                        <div className="resource-amount-display">
                                            <span className="amount-value">{Math.floor(resource.total).toLocaleString()}</span>
                                            <span className="amount-label">units</span>
                                        </div>

                                        {hasActivity && (
                                            <div className="resource-flow-indicator">
                                                <div className="flow-bar">
                                                    <div className="production-bar" style={{ width: `${Math.min(resource.production * 10, 50)}%` }} />
                                                    <div className="consumption-bar" style={{ width: `${Math.min(resource.consumption * 10, 50)}%` }} />
                                                </div>
                                                <div className="flow-value" style={{ color: getFlowColor(netFlow) }}>
                                                    {formatRate(netFlow)}
                                                </div>
                                            </div>
                                        )}

                                        <div className="resource-stats-grid">
                                            {resource.production > 0 && (
                                                <div className="stat-item production">
                                                    <span className="stat-icon">↑</span>
                                                    <span className="stat-value">{formatRate(resource.production)}</span>
                                                </div>
                                            )}
                                            {resource.consumption > 0 && (
                                                <div className="stat-item consumption">
                                                    <span className="stat-icon">↓</span>
                                                    <span className="stat-value">{formatRate(resource.consumption)}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="resource-locations-summary">
                                            <div className="locations-header">
                                                <span className="locations-count">{resource.locations.length}</span>
                                                <span className="locations-label">locations</span>
                                            </div>
                                            {selectedResource === resource.id && (
                                                <div className="locations-details">
                                                    {resource.locations.map(loc => (
                                                        <div key={loc.id} className="location-detail">
                                                            <span className="location-type-icon">
                                                                {loc.type === 'starbase' ? '🏛️' :
                                                                    loc.type === 'claim-stake' ? '🏭' : '🔧'}
                                                            </span>
                                                            <span className="location-name">{loc.name}</span>
                                                            <span className="location-amount">{Math.floor(loc.amount)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {viewMode === 'list' && (
                        <div className="resources-list-view">
                            <div className="list-header">
                                <div className="list-col col-resource">Resource</div>
                                <div className="list-col col-category">Category</div>
                                <div className="list-col col-amount">Amount</div>
                                <div className="list-col col-production">Production</div>
                                <div className="list-col col-consumption">Consumption</div>
                                <div className="list-col col-net">Net Flow</div>
                                <div className="list-col col-locations">Locations</div>
                                <div className="list-col col-actions">Actions</div>
                            </div>
                            <div className="list-body">
                                {filteredResources.map(resource => (
                                    <div
                                        key={resource.id}
                                        className={`list-row ${selectedResource === resource.id ? 'selected' : ''} ${resource.production > 0 || resource.consumption > 0 ? 'active' : ''}`}
                                        onClick={() => setSelectedResource(selectedResource === resource.id ? null : resource.id)}
                                    >
                                        <div className="list-col col-resource">
                                            <span className="resource-icon">
                                                {resource.category === 'raw' ? '⛏️' :
                                                    resource.category === 'processed' ? '⚙️' :
                                                        resource.category === 'fuel' ? '⚡' : '📦'}
                                            </span>
                                            <span className="resource-name">{resource.name}</span>
                                        </div>
                                        <div className="list-col col-category">
                                            <span className={`category-badge ${resource.category}`}>
                                                {resource.category}
                                            </span>
                                        </div>
                                        <div className="list-col col-amount">
                                            <span className="amount-text">{Math.floor(resource.total).toLocaleString()}</span>
                                        </div>
                                        <div className="list-col col-production">
                                            {resource.production > 0 ? (
                                                <span className="rate-badge positive">
                                                    ↑ {formatRate(resource.production)}
                                                </span>
                                            ) : (
                                                <span className="rate-badge neutral">-</span>
                                            )}
                                        </div>
                                        <div className="list-col col-consumption">
                                            {resource.consumption > 0 ? (
                                                <span className="rate-badge negative">
                                                    ↓ {formatRate(resource.consumption)}
                                                </span>
                                            ) : (
                                                <span className="rate-badge neutral">-</span>
                                            )}
                                        </div>
                                        <div className="list-col col-net">
                                            {resource.net !== 0 ? (
                                                <span className="rate-badge" style={{
                                                    background: resource.net > 0 ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 68, 68, 0.2)',
                                                    color: resource.net > 0 ? '#00ff88' : '#ff4444'
                                                }}>
                                                    {resource.net > 0 ? '↑' : '↓'} {formatRate(Math.abs(resource.net))}
                                                </span>
                                            ) : (
                                                <span className="rate-badge neutral">-</span>
                                            )}
                                        </div>
                                        <div className="list-col col-locations">
                                            <span className="location-count">{resource.locations.length}</span>
                                        </div>
                                        <div className="list-col col-actions">
                                            <button
                                                className="action-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Handle transfer
                                                }}
                                                title="Transfer Resources"
                                            >
                                                ↔️
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {viewMode === 'flow' && (
                        <div className="resources-flow-view">
                            <div className="flow-diagram">
                                {/* Production Column */}
                                <div className="flow-column production-column">
                                    <div className="column-header">
                                        <h3>🏭 Production</h3>
                                        <span className="column-subtitle">Claim Stakes</span>
                                    </div>
                                    <div className="flow-nodes">
                                        {effectiveClaimStakes.filter(s => s.flows?.some((f: any) => f.net > 0)).map(stake => (
                                            <div key={stake.id} className="flow-node production-node">
                                                <div className="node-header">
                                                    <span className="node-icon">🌍</span>
                                                    <span className="node-title">{stake.planetName}</span>
                                                    <span className="node-tier">T{stake.tier}</span>
                                                </div>
                                                <div className="node-content">
                                                    {stake.flows?.filter((f: any) => f.net > 0).slice(0, 3).map((flow: any) => (
                                                        <div key={flow.resource} className="flow-item">
                                                            <span className="item-resource">{flow.resource}</span>
                                                            <span className="item-rate positive">+{formatRate(flow.net)}</span>
                                                        </div>
                                                    ))}
                                                    {stake.flows?.filter((f: any) => f.net > 0).length > 3 && (
                                                        <div className="flow-more">
                                                            +{stake.flows.filter((f: any) => f.net > 0).length - 3} more
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {effectiveClaimStakes.filter(s => s.flows?.some((f: any) => f.net > 0)).length === 0 && (
                                            <div className="empty-node">
                                                <span className="empty-icon">🏭</span>
                                                <span className="empty-text">No active production</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Flow Arrows */}
                                <div className="flow-arrows">
                                    <div className="arrow-container">
                                        <svg className="flow-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                                            <defs>
                                                <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                                                    <polygon points="0 0, 10 3, 0 6" fill="var(--primary-orange)" />
                                                </marker>
                                            </defs>
                                            <path
                                                d="M 10 50 L 90 50"
                                                stroke="var(--primary-orange)"
                                                strokeWidth="2"
                                                fill="none"
                                                markerEnd="url(#arrowhead)"
                                                opacity="0.5"
                                            />
                                        </svg>
                                        <div className="flow-label">Transport</div>
                                    </div>
                                </div>

                                {/* Storage Column */}
                                <div className="flow-column storage-column">
                                    <div className="column-header">
                                        <h3>📦 Storage</h3>
                                        <span className="column-subtitle">Inventory</span>
                                    </div>
                                    <div className="flow-nodes">
                                        <div className="flow-node storage-node">
                                            <div className="node-header">
                                                <span className="node-icon">🏛️</span>
                                                <span className="node-title">Starbase</span>
                                                <span className="node-tier">L{sharedState.starbaseLevel}</span>
                                            </div>
                                            <div className="node-content">
                                                {Object.entries(sharedState.starbaseInventory || {})
                                                    .filter(([_, amount]) => amount > 0)
                                                    .sort(([, a], [, b]) => b - a)
                                                    .slice(0, 5)
                                                    .map(([resource, amount]) => (
                                                        <div key={resource} className="flow-item">
                                                            <span className="item-resource">{resource}</span>
                                                            <span className="item-amount">{Math.floor(amount).toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                {Object.entries(sharedState.starbaseInventory || {}).filter(([_, amount]) => amount > 0).length > 5 && (
                                                    <div className="flow-more">
                                                        +{Object.entries(sharedState.starbaseInventory || {}).filter(([_, amount]) => amount > 0).length - 5} more
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Consumption Sinks */}
                                <div className="flow-column sinks">
                                    <h3>Consumption Sinks</h3>
                                    {effectiveClaimStakes.filter(s => s.flows?.some((f: any) => f.consumption > 0)).map(stake => (
                                        <div key={stake.id} className="flow-node sink">
                                            <h4>{stake.planetName} - T{stake.tier}</h4>
                                            <div className="flow-stats">
                                                {stake.flows?.filter((f: any) => f.consumption > 0).map((flow: any) => (
                                                    <div key={flow.resource} className="flow-stat">
                                                        <span>{flow.resource}:</span>
                                                        <span className="negative">{formatRate(-flow.consumption)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Resource Details Panel */}
                {selectedResource && (
                    <div className="resource-details">
                        <h3>{aggregatedResources[selectedResource].name} Details</h3>
                        <div className="details-content">
                            <div className="locations-list">
                                <h4>Storage Locations:</h4>
                                {aggregatedResources[selectedResource].locations.map(loc => (
                                    <div key={loc.id} className="location-detail">
                                        <div className="location-header">
                                            <span className="location-name">{loc.name}</span>
                                            <span className="location-type">{loc.type}</span>
                                        </div>
                                        <div className="location-stats">
                                            <span>Amount: {Math.floor(loc.amount)}</span>
                                            {loc.production && (
                                                <span className="positive">Prod: {formatRate(loc.production)}</span>
                                            )}
                                            {loc.consumption && (
                                                <span className="negative">Cons: {formatRate(-loc.consumption)}</span>
                                            )}
                                            {loc.storage !== undefined && (
                                                <span>Storage: {Math.floor(loc.storage)}/{loc.maxStorage}</span>
                                            )}
                                        </div>
                                        {onTransfer && (
                                            <button
                                                className="btn-sm transfer-btn"
                                                onClick={() => {
                                                    // Open transfer modal
                                                }}
                                            >
                                                Transfer
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 