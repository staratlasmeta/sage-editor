import React, { useState, useEffect, useMemo } from 'react';
import '../styles/ClaimStakeSelector.css';
import Select from 'react-select';
import ClaimStakeBuildingsTab from './ClaimStakeBuildingsTab';
import ClaimStakeInformation from './ClaimStakeInformation';

// Define constants for all planet types
const PLANET_TYPES = [
    { value: 'terrestrial', label: 'Terrestrial Planet' },
    { value: 'barren', label: 'Barren Planet' },
    { value: 'ice-giant', label: 'Ice Giant' },
    { value: 'gas-giant', label: 'Gas Giant' },
    { value: 'volcanic', label: 'Volcanic Planet' },
    { value: 'system-asteroid-belt', label: 'System Asteroid Belt' },
    { value: 'dark', label: 'Dark Planet' }
];

const ClaimStakeSelector = ({ claimStakes = [], onSelect, gameData }) => {
    const [selectedStake, setSelectedStake] = useState(null);
    const [activeTab, setActiveTab] = useState('general');
    const [filters, setFilters] = useState({
        faction: '',
        planetType: '',
        tier: '',
        resources: []
    });

    // Move getPlanetArchetype to the top, before it's used
    const getPlanetArchetype = (stake) => {
        if (!stake) return null;

        let planetTypeTag, factionTag;

        // Handle both purchased stakes and stake definitions
        if (stake.requiredTags) {
            // For stake definitions
            planetTypeTag = stake.requiredTags.find(tag =>
                tag.startsWith('tag-') &&
                !['tag-oni', 'tag-mud', 'tag-ustur'].includes(tag)
            );
            factionTag = stake.requiredTags.find(tag =>
                ['tag-oni', 'tag-mud', 'tag-ustur'].includes(tag)
            );
        } else {
            // For purchased stakes, extract from ID or type
            const idParts = stake.id.split('-');
            const planetType = stake.type || idParts[2]; // e.g., "terrestrial-planet"
            const faction = stake.faction || idParts[3]; // e.g., "oni"

            planetTypeTag = `tag-${planetType}`.replace(' ', '-').toLowerCase();
            factionTag = `tag-${faction}`.toLowerCase();
        }

        if (!planetTypeTag || !factionTag) {
            return null;
        }

        // Find matching archetype
        const archetypes = Object.values(gameData.planetArchetypes || {});
        const matchingArchetype = archetypes.find(archetype =>
            archetype.tags.includes(planetTypeTag) &&
            archetype.tags.includes(factionTag)
        );

        return matchingArchetype;
    };

    const handleStakeSelect = (stake) => {
        setSelectedStake(stake);
    };

    const getAllAvailableResources = (stakes) => {
        const resourceSet = new Set();
        stakes.forEach(stake => {
            const planetArchetype = getPlanetArchetype(stake);
            if (planetArchetype?.richness) {
                Object.keys(planetArchetype.richness)
                    .filter(resource => planetArchetype.richness[resource] > 0)
                    .forEach(resource => resourceSet.add(resource));
            }
        });
        return Array.from(resourceSet)
            .map(resource => ({
                value: resource,
                label: resource.replace('cargo-', '').split('-').join(' ')
            }));
    };

    // Helper function to map planet type values to their display format and back
    const getPlanetTypeDisplayName = (value) => {
        const planetType = PLANET_TYPES.find(type => type.value === value);
        return planetType ? planetType.label : '';
    };

    // Helper function to check if stake matches planet type filter
    const matchesPlanetType = (stake, filterValue) => {
        if (!filterValue) return true; // No filter applied

        // Check direct match
        if (stake.planetType === filterValue) return true;

        // Check for partial match (e.g., "terrestrial" matches "terrestrial-planet")
        if (stake.planetType && stake.planetType.includes(filterValue)) return true;

        // Check if it's in the tags
        const planetTypeTag = `tag-${filterValue}`.replace(' ', '-').toLowerCase();
        if (stake.requiredTags && stake.requiredTags.includes(planetTypeTag)) return true;

        // Check in the ID
        if (stake.id && stake.id.includes(filterValue)) return true;

        return false;
    };

    const filteredStakes = claimStakes.filter(stake => {
        // Apply basic filters
        if (filters.faction && stake.faction !== filters.faction) return false;
        if (filters.planetType && !matchesPlanetType(stake, filters.planetType)) return false;
        if (filters.tier && stake.tier !== filters.tier) return false;

        // Check resources and their tiers
        if (filters.resources.length > 0) {
            const planetArchetype = getPlanetArchetype(stake);
            if (!planetArchetype?.richness) return false;

            // Get cargo items for tier checking
            const cargoItems = gameData.cargo || {};
            const stakeTier = parseInt(stake.tier);

            // Check if ALL selected resources exist on this planet with proper tier
            return filters.resources.every(resource => {
                // Check if resource exists with any richness
                const hasResource = (planetArchetype.richness[resource.value] || 0) > 0;
                if (!hasResource) return false;

                // Check if stake tier is high enough for this resource
                const resourceTier = parseInt(cargoItems[resource.value]?.tier || 1);
                return stakeTier >= resourceTier;
            });
        }

        return true;
    });

    const getAvailableResourceOptions = () => {
        // First filter stakes by everything EXCEPT resources and tier
        const stakesWithoutResourceFilter = claimStakes.filter(stake => {
            if (filters.faction && stake.faction !== filters.faction) return false;
            if (filters.planetType && !matchesPlanetType(stake, filters.planetType)) return false;
            return true;
        });

        // Get all available resources from the filtered stakes
        const resourceSet = new Set();
        stakesWithoutResourceFilter.forEach(stake => {
            const planetArchetype = getPlanetArchetype(stake);
            if (planetArchetype?.richness) {
                Object.entries(planetArchetype.richness)
                    .filter(([_, richness]) => richness > 0)
                    .forEach(([resource]) => resourceSet.add(resource));
            }
        });

        // Convert to options format
        return Array.from(resourceSet)
            .map(resource => ({
                value: resource,
                label: resource.replace('cargo-', '').split('-').join(' ')
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    };

    // Get available resources based on richness values and stake tier
    const getAvailableResources = (stake) => {
        const planetArchetype = getPlanetArchetype(stake);

        if (!planetArchetype?.richness) {
            return [];
        }

        // Get the tier from the stake
        const stakeTier = parseInt(stake.tier);

        // Get cargo items from game data - try different possible locations
        const cargoItems = gameData.cargo || {};

        const resources = Object.entries(planetArchetype.richness)
            .filter(([resource, richness]) => {
                // Only include resources with richness > 0
                if (richness <= 0) return false;

                // Get the resource tier from cargo items
                const resourceTier = parseInt(cargoItems[resource]?.tier || 1);

                // Only include resources of the same tier or lower
                const include = resourceTier <= stakeTier;
                return include;
            })
            .map(([resource, richness]) => ({
                name: resource.replace('cargo-', ''),
                richness,
                baseRate: 0,
                tier: parseInt(cargoItems[resource]?.tier || 1)
            }))
            .sort((a, b) => b.richness - a.richness);

        return resources;
    };

    const ResourceSummary = ({ resources }) => {
        const totalCount = resources.length;
        const resourcesByRichness = resources.reduce((acc, resource) => {
            acc[resource.richness] = (acc[resource.richness] || 0) + 1;
            return acc;
        }, {});

        return (
            <div className="resource-summary">
                <div className="total-resources">
                    Total Available Resources<span>{totalCount}</span>
                </div>
                <div className="richness-breakdown">
                    {Object.entries(resourcesByRichness)
                        .sort(([a], [b]) => b - a) // Sort by richness in descending order
                        .map(([richness, count]) => (
                            <div key={richness} className="richness-group">
                                <span className="richness-value">{richness}x Richness</span>
                                <span className="resource-count">{count}</span>
                            </div>
                        ))}
                </div>
            </div>
        );
    };

    if (!claimStakes || claimStakes.length === 0) {
        return (
            <div className="marketplace-layout">
                <div className="available-stakes-section">
                    <div className="filters-section">
                        <div className="filter">
                            <label>Faction:</label>
                            <select
                                value={filters.faction}
                                onChange={(e) => setFilters({ ...filters, faction: e.target.value })}
                            >
                                <option value="">All Factions</option>
                                <option value="ONI">ONI</option>
                                <option value="MUD">MUD</option>
                                <option value="USTUR">USTUR</option>
                            </select>
                        </div>
                        <div className="filter">
                            <label>Planet Type:</label>
                            <select
                                value={filters.planetType}
                                onChange={(e) => setFilters({ ...filters, planetType: e.target.value })}
                            >
                                <option value="">All Planets</option>
                                {PLANET_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter">
                            <label>Tier:</label>
                            <select
                                value={filters.tier}
                                onChange={(e) => setFilters({ ...filters, tier: e.target.value })}
                            >
                                <option value="">All Tiers</option>
                                <option value="1">Tier 1</option>
                                <option value="2">Tier 2</option>
                                <option value="3">Tier 3</option>
                                <option value="4">Tier 4</option>
                                <option value="5">Tier 5</option>
                            </select>
                        </div>
                        <div className="filter">
                            <label>Resources:</label>
                            <Select
                                isMulti
                                value={filters.resources}
                                onChange={(selected) => setFilters({ ...filters, resources: selected || [] })}
                                options={getAvailableResourceOptions()}
                                className="resource-select"
                                placeholder="Filter by resources..."
                                closeMenuOnSelect={false}
                            />
                        </div>
                    </div>
                    <div className="stakes-list">
                        <div className="loading-message">
                            Loading claim stakes...
                        </div>
                    </div>
                </div>
                <div className="stake-details-section">
                    <div className="no-selection">
                        <p>Select a claim stake to view details</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="marketplace-layout">
            {/* Left side - Filters and Scrollable List */}
            <div className="available-stakes-section">
                <div className="filters-section">
                    <div className="filter">
                        <label>Faction:</label>
                        <select
                            value={filters.faction}
                            onChange={(e) => setFilters({ ...filters, faction: e.target.value })}
                        >
                            <option value="">All Factions</option>
                            <option value="ONI">ONI</option>
                            <option value="MUD">MUD</option>
                            <option value="USTUR">USTUR</option>
                        </select>
                    </div>
                    <div className="filter">
                        <label>Planet Type:</label>
                        <select
                            value={filters.planetType}
                            onChange={(e) => setFilters({ ...filters, planetType: e.target.value })}
                        >
                            <option value="">All Planets</option>
                            {PLANET_TYPES.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter">
                        <label>Tier:</label>
                        <select
                            value={filters.tier}
                            onChange={(e) => setFilters({ ...filters, tier: e.target.value })}
                        >
                            <option value="">All Tiers</option>
                            <option value="1">Tier 1</option>
                            <option value="2">Tier 2</option>
                            <option value="3">Tier 3</option>
                            <option value="4">Tier 4</option>
                            <option value="5">Tier 5</option>
                        </select>
                    </div>
                    <div className="filter">
                        <label>Resources:</label>
                        <Select
                            isMulti
                            value={filters.resources}
                            onChange={(selected) => setFilters({ ...filters, resources: selected || [] })}
                            options={getAvailableResourceOptions()}
                            className="resource-select"
                            placeholder="Filter by resources..."
                            closeMenuOnSelect={false}
                        />
                    </div>
                </div>

                <div className="stakes-list">
                    {filteredStakes.map(stake => (
                        <div
                            key={stake.id}
                            className={`stake-list-item ${selectedStake?.id === stake.id ? 'selected' : ''}`}
                            onClick={() => handleStakeSelect(stake)}
                        >
                            <h3>{stake.name}</h3>
                            <div className="stake-brief-info">
                                <span className="tier">Tier {stake.tier}</span>
                                <span className="faction">{stake.faction}</span>
                                <span className="slots">Slots: {stake.slots}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right side - Selected Stake Details */}
            <div className="stake-details-section">
                {selectedStake ? (
                    <>
                        <div className="details-header">
                            <h2>{selectedStake.name}</h2>
                            <button
                                className="purchase-button"
                                onClick={() => onSelect(selectedStake)}
                            >
                                Purchase Claim Stake
                            </button>
                        </div>

                        <div className="tabs">
                            <button
                                className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
                                onClick={() => setActiveTab('general')}
                            >
                                General
                            </button>
                            <button
                                className={`tab-button ${activeTab === 'resources' ? 'active' : ''}`}
                                onClick={() => setActiveTab('resources')}
                            >
                                Resources
                            </button>
                            <button
                                className={`tab-button ${activeTab === 'buildings' ? 'active' : ''}`}
                                onClick={() => setActiveTab('buildings')}
                            >
                                Buildings
                            </button>
                        </div>

                        <div className="tab-content">
                            {activeTab === 'general' && (
                                <div className="general-info">
                                    <ClaimStakeInformation claimStake={selectedStake} />
                                </div>
                            )}
                            {activeTab === 'resources' && (
                                <div className="resources-info">
                                    <h3>Available Resources</h3>
                                    {(() => {
                                        const resources = getAvailableResources(selectedStake);
                                        return (
                                            <>
                                                <ResourceSummary resources={resources} />
                                                <div className="resources-grid">
                                                    {resources.map(resource => (
                                                        <div key={resource.name} className="resource-card">
                                                            <div className="resource-header">
                                                                <span className="resource-name">{resource.name}</span>
                                                                <span className="resource-richness">
                                                                    Richness: {resource.richness}x
                                                                </span>
                                                            </div>
                                                            <div className="resource-details">
                                                                <div className="resource-tier">
                                                                    <span className="detail-label">Tier:</span>
                                                                    <span className="detail-value">{resource.tier}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                            {activeTab === 'buildings' && (
                                <ClaimStakeBuildingsTab
                                    claimStake={selectedStake}
                                    gameData={gameData}
                                />
                            )}
                        </div>
                    </>
                ) : (
                    <div className="no-selection">
                        <p>Select a claim stake to view details</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClaimStakeSelector; 