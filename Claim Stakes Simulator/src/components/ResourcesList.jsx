import React, { useState, useEffect } from 'react';
import './ResourcesList.css';
import ResourceCalculationService from '../services/ResourceCalculationService';

/**
 * ResourcesList component displays resource information
 * Can show global resources or resources for a specific claim stake
 */
const ResourcesList = ({
    resources,
    resourceRates,
    claimStake = null,
    isGlobal = false,
    gameData,
    onClose
}) => {
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [searchTerm, setSearchTerm] = useState('');

    // Calculate resource status (production, consumption, storage)
    const calculateResourceStatus = () => {
        if (!resources) return [];

        // If we have a claim stake, use ResourceCalculationService for accurate rates
        let calculatedRates = resourceRates || {};
        if (claimStake && gameData) {
            // Get planet archetype for richness calculations
            const planetArchetype = getPlanetArchetype(claimStake, gameData);
            if (planetArchetype) {
                calculatedRates = ResourceCalculationService.calculateClaimStakeResourceRates(
                    claimStake,
                    planetArchetype
                );
            }
        }

        // Combine resources with their rates and add metadata
        const resourceList = Object.entries(resources).map(([resourceId, resourceData]) => {
            // Handle both simple amounts and resource objects
            const amount = typeof resourceData === 'object' ? resourceData.amount : resourceData;

            // Get resource definition
            const resourceDef = gameData.cargo?.[resourceId] || null;
            if (!resourceDef) return null;

            // Get production rate
            const rate = calculatedRates[resourceId] || 0;

            // Determine status based on rate
            let status = 'neutral';
            if (rate > 0) status = 'positive';
            if (rate < 0) status = 'negative';

            // Get storage info if this is for a claim stake
            let storageInfo = null;
            if (claimStake && typeof resourceData === 'object' && resourceData.storage) {
                storageInfo = {
                    used: amount,
                    capacity: resourceData.storage,
                    percentage: (amount / resourceData.storage) * 100
                };
            } else if (claimStake) {
                // Calculate storage using ResourceCalculationService
                const storage = ResourceCalculationService.calculateResourceStorage(claimStake, resourceId);
                storageInfo = {
                    used: amount,
                    capacity: storage,
                    percentage: (amount / storage) * 100
                };
            }

            return {
                id: resourceId,
                name: resourceDef.name || resourceId.replace('cargo-', ''),
                amount: Math.floor(amount || 0),
                rate,
                status,
                tier: resourceDef.tier || 1,
                type: determineResourceType(resourceDef),
                storageInfo
            };
        }).filter(resource => resource !== null);

        return resourceList;
    };

    // Get planet archetype from claim stake
    const getPlanetArchetype = (claimStake, gameData) => {
        if (!claimStake || !gameData) return null;

        // Try to get planet archetype from claim stake data
        if (claimStake.planetArchetype) {
            return claimStake.planetArchetype;
        }

        // Try to find it from planet instance
        if (claimStake.planetInstance && gameData.planets) {
            const planetInstance = gameData.planets[claimStake.planetInstance];
            if (planetInstance && planetInstance.planetArchetype) {
                return gameData.planetArchetypes?.[planetInstance.planetArchetype];
            }
        }

        // Fallback: try to determine from tags
        const allTags = [...(claimStake.requiredTags || []), ...(claimStake.tags || [])];
        const planetTags = [
            'tag-terrestrial-planet', 'tag-ice-giant', 'tag-gas-giant',
            'tag-barren-planet', 'tag-volcanic-planet', 'tag-dark-planet',
            'tag-system-asteroid-belt'
        ];
        const factionTags = ['tag-oni', 'tag-mud', 'tag-ustur'];

        const planetTypeTag = allTags.find(tag => planetTags.includes(tag));
        const factionTag = allTags.find(tag => factionTags.includes(tag));

        if (planetTypeTag && factionTag && gameData.planetArchetypes) {
            return Object.values(gameData.planetArchetypes).find(archetype =>
                archetype.tags &&
                archetype.tags.includes(planetTypeTag) &&
                archetype.tags.includes(factionTag)
            );
        }

        return null;
    };

    // Determine resource type based on recipe
    const determineResourceType = (resourceDef) => {
        if (!resourceDef) return 'unknown';
        if (!resourceDef.recipe || !resourceDef.recipe.inputs || Object.keys(resourceDef.recipe.inputs).length === 0) {
            return 'raw';
        } else if (Object.keys(resourceDef.recipe.inputs).length === 1) {
            return 'processed';
        } else {
            return 'advanced';
        }
    };

    // Apply filtering
    const getFilteredResources = () => {
        const resourcesList = calculateResourceStatus();

        // Apply search filter
        let filtered = resourcesList;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(r =>
                r.name.toLowerCase().includes(term) ||
                r.id.toLowerCase().includes(term)
            );
        }

        // Apply type filter
        if (filter !== 'all') {
            filtered = filtered.filter(r => r.type === filter);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'amount':
                    comparison = a.amount - b.amount;
                    break;
                case 'rate':
                    comparison = a.rate - b.rate;
                    break;
                case 'tier':
                    comparison = a.tier - b.tier;
                    break;
                default:
                    comparison = a.name.localeCompare(b.name);
            }

            return sortDir === 'asc' ? comparison : -comparison;
        });

        return filtered;
    };

    // Format rate with sign and decimal precision
    const formatRate = (rate) => {
        if (rate === 0) return '0';
        const sign = rate > 0 ? '+' : '';
        return `${sign}${rate.toFixed(2)}/s`;
    };

    // Format large numbers with k, M, B suffixes
    const formatNumber = (num) => {
        if (num === undefined || num === null) return '0';
        if (num < 1000) return Math.floor(num).toString();
        if (num < 1000000) return `${(num / 1000).toFixed(1)}k`;
        if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M`;
        return `${(num / 1000000000).toFixed(1)}B`;
    };

    // Handle sorting change
    const handleSortChange = (field) => {
        if (sortBy === field) {
            // Toggle direction if same field
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            // New field, default to ascending
            setSortBy(field);
            setSortDir('asc');
        }
    };

    const filteredResources = getFilteredResources();

    return (
        <div className="resources-list">
            <div className="resources-header">
                <h2>{isGlobal ? 'Global Resources' : 'Claim Stake Resources'}</h2>
                <button className="close-button" onClick={onClose}>×</button>
            </div>

            <div className="resources-controls">
                <div className="search-filter">
                    <input
                        type="text"
                        placeholder="Search resources..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-buttons">
                    <button
                        className={filter === 'all' ? 'active' : ''}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </button>
                    <button
                        className={filter === 'raw' ? 'active' : ''}
                        onClick={() => setFilter('raw')}
                    >
                        Raw
                    </button>
                    <button
                        className={filter === 'processed' ? 'active' : ''}
                        onClick={() => setFilter('processed')}
                    >
                        Processed
                    </button>
                    <button
                        className={filter === 'advanced' ? 'active' : ''}
                        onClick={() => setFilter('advanced')}
                    >
                        Advanced
                    </button>
                </div>
            </div>

            <div className="resources-table">
                <div className="table-header">
                    <div
                        className={`header-cell ${sortBy === 'name' ? 'sorted' : ''}`}
                        onClick={() => handleSortChange('name')}
                    >
                        Resource
                        {sortBy === 'name' && <span className="sort-indicator">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                    <div
                        className={`header-cell ${sortBy === 'amount' ? 'sorted' : ''}`}
                        onClick={() => handleSortChange('amount')}
                    >
                        Amount
                        {sortBy === 'amount' && <span className="sort-indicator">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                    <div
                        className={`header-cell ${sortBy === 'rate' ? 'sorted' : ''}`}
                        onClick={() => handleSortChange('rate')}
                    >
                        Rate
                        {sortBy === 'rate' && <span className="sort-indicator">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                    <div
                        className={`header-cell ${sortBy === 'tier' ? 'sorted' : ''}`}
                        onClick={() => handleSortChange('tier')}
                    >
                        Tier
                        {sortBy === 'tier' && <span className="sort-indicator">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                </div>

                <div className="table-body">
                    {filteredResources.length === 0 ? (
                        <div className="no-resources">
                            No resources found matching the current filters
                        </div>
                    ) : (
                        filteredResources.map(resource => (
                            <div key={resource.id} className="resource-row">
                                <div className="resource-cell resource-name">
                                    <span className={`resource-type-indicator ${resource.type}`}></span>
                                    {resource.name}
                                </div>
                                <div className="resource-cell resource-amount">
                                    {formatNumber(resource.amount)}
                                    {resource.storageInfo && (
                                        <div className="storage-bar">
                                            <div
                                                className="storage-fill"
                                                style={{ width: `${Math.min(100, resource.storageInfo.percentage)}%` }}
                                            ></div>
                                        </div>
                                    )}
                                </div>
                                <div className={`resource-cell resource-rate ${resource.status}`}>
                                    {formatRate(resource.rate)}
                                </div>
                                <div className="resource-cell resource-tier">
                                    T{resource.tier}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResourcesList; 