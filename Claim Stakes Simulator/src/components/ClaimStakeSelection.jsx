import React, { useState, useEffect } from 'react';
import '../styles/ClaimStakeSelection.css';

const STARBASE_TIER_MAP = {
    0: 1,  // Level 0 shows tier 1
    1: 2,  // Level 1 shows tiers 1-2
    2: 3,  // Level 2 shows tiers 1-3
    3: 4,  // Level 3 shows tiers 1-4
    4: 5,  // Level 4+ shows all tiers
    5: 5,
    6: 5
};

const extractFactionFromId = (id) => {
    const factionMatch = id.match(/(mud|oni|ustur)/i);
    return factionMatch ? factionMatch[0].toUpperCase() : null;
};

const extractPlanetTypeFromId = (id) => {
    const planetTypes = {
        'volcanic-planet': 'Volcanic Planet',
        'ice-giant': 'Ice Giant',
        'barren-planet': 'Barren Planet',
        'terrestrial-planet': 'Terrestrial Planet',
        'dark-planet': 'Dark Planet',
        'system-asteroid-belt': 'System Asteroid Belt',
        'gas-giant': 'Gas Giant'
    };

    for (const [key, value] of Object.entries(planetTypes)) {
        if (id.includes(key)) {
            return value;
        }
    }
    return null;
};

const getVisibilityStats = (
    allClaimStakes,
    currentFilter,
    selectedFaction,
    selectedPlanetType,
    selectedStarbaseLevel,
    gameData,
    purchasedClaimStakes
) => {
    // Get all claim stakes from game data with correct purchase state
    const allDefinitions = Object.entries(gameData.claimStakeDefinitions).map(([id, definition]) => ({
        id,
        ...definition,
        faction: extractFactionFromId(id),
        planetType: extractPlanetTypeFromId(id),
        // Check if this claim stake is in the purchasedClaimStakes array
        isPurchased: purchasedClaimStakes.includes(id)
    }));

    // First, filter by purchase state only to get the base total
    const baseFilteredStakes = allDefinitions.filter(cs => {
        switch (currentFilter) {
            case 'purchased':
                return cs.isPurchased;
            case 'available':
                return !cs.isPurchased;
            default:
                return true;
        }
    });

    // Then apply other filters to get visible count
    const visibleStakes = baseFilteredStakes.filter(cs => {
        const matchesFaction = !selectedFaction || cs.faction === selectedFaction;
        const matchesPlanetType = !selectedPlanetType || cs.planetType === selectedPlanetType;
        const matchesTier = selectedStarbaseLevel === -1 || Number(cs.tier) <= STARBASE_TIER_MAP[selectedStarbaseLevel];

        return matchesFaction && matchesPlanetType && matchesTier;
    });

    return {
        visible: visibleStakes.length,
        total: baseFilteredStakes.length,
        hasActiveFilters: !!(selectedFaction || selectedPlanetType || selectedStarbaseLevel !== -1)
    };
};

const ClaimStakeSelection = ({ gameData, onSelect, purchasedClaimStakes = [], onPurchase }) => {
    const [selectedFaction, setSelectedFaction] = useState('');
    const [selectedPlanetType, setSelectedPlanetType] = useState('');
    const [selectedStarbaseLevel, setSelectedStarbaseLevel] = useState(-1);
    const [availableClaimStakes, setAvailableClaimStakes] = useState([]);
    const [selectedClaimStake, setSelectedClaimStake] = useState(null);
    const [resourceAnalysis, setResourceAnalysis] = useState({
        rawResources: [],
        craftedResources: []
    });
    const [filter, setFilter] = useState('all'); // 'all', 'available', or 'purchased'

    const factions = ['MUD', 'ONI', 'USTUR'];
    const planetTypes = [
        'Terrestrial Planet',
        'Barren Planet',
        'Ice Giant',
        'Gas Giant',
        'Volcanic Planet',
        'System Asteroid Belt',
        'Dark Planet'
    ];
    const starbaseLevels = [
        { level: -1, name: 'Any Level', maxTier: 5 },
        { level: 0, name: 'Neutral', maxTier: 1 },
        { level: 1, name: 'Level 1', maxTier: 2 },
        { level: 2, name: 'Level 2', maxTier: 3 },
        { level: 3, name: 'Level 3', maxTier: 4 },
        { level: 4, name: 'Level 4+', maxTier: 5 },
        { level: 5, name: 'Level 5', maxTier: 5 },
        { level: 6, name: 'CSS', maxTier: 5 }
    ];

    // Get available claim stakes based on filters
    useEffect(() => {
        if (!gameData?.claimStakeDefinitions) return;

        console.log("ClaimStakeSelection - gameData.claimStakeDefinitions:", gameData.claimStakeDefinitions);

        const filtered = Object.entries(gameData.claimStakeDefinitions)
            .filter(([id, definition]) => {
                const definitionFaction = extractFactionFromId(id);
                const definitionPlanetType = extractPlanetTypeFromId(id);

                // Check faction
                if (selectedFaction && definitionFaction !== selectedFaction) {
                    return false;
                }

                // Check planet type (empty string means "All Planets")
                if (selectedPlanetType && definitionPlanetType !== selectedPlanetType) {
                    return false;
                }

                // Check tier based on starbase level (skip check if "Any Level" is selected)
                if (selectedStarbaseLevel !== -1) {
                    const maxAllowedTier = STARBASE_TIER_MAP[selectedStarbaseLevel];
                    if (!definition.tier || Number(definition.tier) > maxAllowedTier) {
                        return false;
                    }
                }

                return true;
            })
            .map(([id, definition]) => {
                const stake = {
                    id,
                    ...definition,
                    faction: extractFactionFromId(id),
                    planetType: extractPlanetTypeFromId(id),
                    isPurchased: purchasedClaimStakes.includes(id)
                };
                console.log(`ClaimStakeSelection - Created stake with id ${id}:`, stake);
                console.log(`ClaimStakeSelection - Name property:`, stake.name);
                return stake;
            });

        console.log("ClaimStakeSelection - Final filtered stakes:", filtered);
        setAvailableClaimStakes(filtered);
    }, [gameData, selectedFaction, selectedPlanetType, selectedStarbaseLevel, purchasedClaimStakes]);

    // Analyze available resources when claim stake is selected
    useEffect(() => {
        if (!selectedClaimStake) {
            setResourceAnalysis({ rawResources: [], craftedResources: [] });
            return;
        }

        const rawResources = new Set();
        const craftedResources = new Set();

        // Analyze all buildings up to the max tier
        Object.entries(gameData.claimStakeBuildings).forEach(([id, building]) => {
            // Check if building is valid for this claim stake
            if (!isValidBuildingForClaimStake(building, selectedClaimStake)) {
                return;
            }

            // Check extraction rates (raw resources)
            if (building.resourceExtractionRate) {
                Object.keys(building.resourceExtractionRate).forEach(resource => {
                    if (!building.resourceRate || Object.keys(building.resourceRate).length === 0) {
                        rawResources.add(resource);
                    }
                });
            }

            // Check production rates (crafted resources)
            if (building.resourceExtractionRate && building.resourceRate) {
                Object.keys(building.resourceExtractionRate).forEach(resource => {
                    craftedResources.add(resource);
                });
            }
        });

        setResourceAnalysis({
            rawResources: Array.from(rawResources),
            craftedResources: Array.from(craftedResources)
        });
    }, [selectedClaimStake]);

    const isValidBuildingForClaimStake = (building, claimStake) => {
        // Check if building's tags match claim stake requirements
        return building.requiredTags.every(tag =>
            claimStake.addedTags.includes(tag)
        );
    };

    const handleClaimStakeSelect = (claimStake) => {

        if (!claimStake || !claimStake.id) {
            console.error('Invalid claim stake selected:', claimStake);
            return;
        }

        const fullDefinition = gameData.claimStakeDefinitions[claimStake.id];
        if (!fullDefinition) {
            console.error('Could not find claim stake definition:', claimStake.id);
            return;
        }

        // Create complete claim stake object with unique ID and ensure all arrays exist
        const completeClaimStake = {
            id: `${claimStake.id}-${Date.now()}`,
            definition: {
                id: claimStake.id,
                name: fullDefinition.name || 'Unknown Claim Stake',
                description: fullDefinition.description || '',
                slots: Number(fullDefinition.slots) || 0,
                rentMultiplier: fullDefinition.rentMultiplier || 1,
                hubValue: fullDefinition.hubValue || 0,
                addedTags: Array.isArray(fullDefinition.addedTags) ? fullDefinition.addedTags : [],
                requiredTags: Array.isArray(fullDefinition.requiredTags) ? fullDefinition.requiredTags : [],
                token: fullDefinition.token,
                tier: fullDefinition.tier || 1,
                placementFeeMultiplier: fullDefinition.placementFeeMultiplier || 1
            },
            buildings: [],
            resources: {},
            constructionQueue: [],
            crewAssignments: {}
        };

        onSelect(completeClaimStake);
    };

    const FilterButton = ({ active, onClick, children }) => (
        <button
            className={`filter-button ${active ? 'active' : ''}`}
            onClick={onClick}
            style={{
                backgroundColor: active ? '#4a90e2' : '#f5f7fa',
                color: active ? 'white' : '#333',
                padding: '8px 16px',
                border: `1px solid ${active ? '#357abd' : '#e1e8ed'}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: active ? 'bold' : 'normal',
                transition: 'all 0.2s ease'
            }}
        >
            {children}
        </button>
    );

    return (
        <div className="claim-stake-selection">
            <div className="selection-filters">
                <div className="filter-group">
                    <label style={{ fontWeight: 'bold', marginBottom: '8px' }}>View:</label>
                    <div className="filter-controls" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <FilterButton
                            active={filter === 'all'}
                            onClick={() => setFilter('all')}
                        >
                            All
                        </FilterButton>
                        <FilterButton
                            active={filter === 'available'}
                            onClick={() => setFilter('available')}
                        >
                            Available
                        </FilterButton>
                        <FilterButton
                            active={filter === 'purchased'}
                            onClick={() => setFilter('purchased')}
                        >
                            Purchased
                        </FilterButton>

                        {(() => {
                            const stats = getVisibilityStats(
                                availableClaimStakes,
                                filter,
                                selectedFaction,
                                selectedPlanetType,
                                selectedStarbaseLevel,
                                gameData,
                                purchasedClaimStakes
                            );

                            return (
                                <div className="filter-stats" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginLeft: '16px',
                                    padding: '4px 8px',
                                    background: '#f5f7fa',
                                    borderRadius: '4px',
                                    fontSize: '0.9em'
                                }}>
                                    <span>
                                        Showing {stats.visible} of {stats.total}
                                    </span>
                                    {stats.hasActiveFilters && (
                                        <button
                                            onClick={() => {
                                                setSelectedFaction('');
                                                setSelectedPlanetType('');
                                                setSelectedStarbaseLevel(-1);
                                            }}
                                            style={{
                                                padding: '4px 8px',
                                                background: '#4a90e2',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '0.9em'
                                            }}
                                        >
                                            Clear Filters
                                        </button>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                <div className="filter-group">
                    <label>Faction:</label>
                    <select
                        value={selectedFaction}
                        onChange={(e) => setSelectedFaction(e.target.value)}
                    >
                        <option value="">All Factions</option>
                        {factions.map(faction => (
                            <option key={faction} value={faction}>{faction}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Planet Type:</label>
                    <select
                        value={selectedPlanetType}
                        onChange={(e) => setSelectedPlanetType(e.target.value)}
                        className="planet-type-select"
                    >
                        <option value="">All Planets</option>
                        {planetTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                    {/* Debug output to verify all planet types */}
                    {process.env.NODE_ENV === 'development' && (
                        <div style={{ display: 'none' }}>
                            Available types: {planetTypes.join(', ')}
                        </div>
                    )}
                </div>

                <div className="filter-group">
                    <label>Starbase Level:</label>
                    <select
                        value={selectedStarbaseLevel}
                        onChange={(e) => setSelectedStarbaseLevel(Number(e.target.value))}
                    >
                        {starbaseLevels.map(({ level, name }) => (
                            <option key={level} value={level}>{name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="claim-stakes-grid">
                {availableClaimStakes
                    .filter(cs => {
                        switch (filter) {
                            case 'purchased':
                                return cs.isPurchased;
                            case 'available':
                                return !cs.isPurchased;
                            default:
                                return true;
                        }
                    })
                    .map(claimStake => (
                        <div
                            key={claimStake.id}
                            className={`claim-stake-card ${selectedClaimStake?.id === claimStake.id ? 'selected' : ''}`}
                            onClick={() => setSelectedClaimStake(claimStake)}
                        >
                            <h4>{claimStake.name}</h4>
                            <p>{claimStake.description}</p>
                            <div className="claim-stake-stats">
                                <div>Slots: {claimStake.slots}</div>
                                <div>Rent Multiplier: {claimStake.rentMultiplier}x</div>
                            </div>
                            {claimStake.isPurchased ? (
                                <button
                                    className="select-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClaimStakeSelect(claimStake);
                                    }}
                                >
                                    Select Claim Stake
                                </button>
                            ) : (
                                <button
                                    className="purchase-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        console.log('ClaimStakeSelection - Purchase button clicked');
                                        console.log('ClaimStakeSelection - Claim stake being sent to onPurchase:', claimStake);
                                        console.log('ClaimStakeSelection - Claim stake name:', claimStake.name);
                                        onPurchase(claimStake);
                                    }}
                                >
                                    Purchase Claim Stake
                                </button>
                            )}
                        </div>
                    ))}
            </div>
        </div>
    );
};

export default ClaimStakeSelection; 