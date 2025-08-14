// === MODULE: Ship Scoring ===
// This module handles ship scoring calculations including category scores,
// uber scores, and score visualization. It evaluates ships based on their
// stats across different categories like Combat, Mobility, Cargo, etc.
//
// Dependencies:
// - Global variables: addedShips, shipConfigurations, activeConfigIndices
// - Functions: getShipIdentifier(), calculateModifiedStats()

// Define stat categories for scoring
const SCORE_CATEGORIES = {
    Combat: {
        name: 'Combat',
        color: '#ff4444',
        icon: '⚔️',
        stats: ['damage', 'max_ap', 'ap_recharge_time', 'hit_points', 'shield_points', 'shield_recharge_rate', 'shield_break_delay', 'ammo_capacity'],
        weights: {
            'damage': 1.5,
            'max_ap': 1.2,
            'ap_recharge_time': -0.8, // Lower is better
            'hit_points': 1.3,
            'shield_points': 1.2,
            'shield_recharge_rate': 1.0,
            'shield_break_delay': -0.5, // Lower is better
            'ammo_capacity': 0.7
        }
    },
    Mobility: {
        name: 'Mobility',
        color: '#44ff44',
        icon: '🚀',
        stats: ['subwarp_speed', 'warp_speed', 'max_warp_distance', 'warp_cool_down', 'warp_fuel_consumption', 'subwarp_fuel_consumption', 'planet_exit_fuel', 'warp_lane_speed', 'warp_spool_time'],
        weights: {
            'subwarp_speed': 1.2,
            'warp_speed': 1.5,
            'max_warp_distance': 1.0,
            'warp_cool_down': -0.8, // Lower is better
            'warp_fuel_consumption': -0.6, // Lower is better
            'subwarp_fuel_consumption': -0.5, // Lower is better
            'planet_exit_fuel': -0.4, // Lower is better
            'warp_lane_speed': 1.0,
            'warp_spool_time': -0.7 // Lower is better
        }
    },
    Cargo: {
        name: 'Cargo',
        color: '#4444ff',
        icon: '📦',
        stats: ['cargo_capacity', 'passenger_capacity', 'loading_rate'],
        weights: {
            'cargo_capacity': 1.5,
            'passenger_capacity': 1.2,
            'loading_rate': 1.0
        }
    },
    Mining: {
        name: 'Mining',
        color: '#ffaa44',
        icon: '⛏️',
        stats: ['asteroid_mining_food_rate', 'asteroid_mining_ammo_rate', 'asteroid_mining_rate'],
        weights: {
            'asteroid_mining_food_rate': 1.0,
            'asteroid_mining_ammo_rate': 1.0,
            'asteroid_mining_rate': 1.5
        }
    },
    Support: {
        name: 'Support',
        color: '#44aaff',
        icon: '🔧',
        stats: ['scan_cool_down', 'sduPerScan', 'scan_cost', 'scan_power', 'repair_cost', 'repair_rate', 'repair_ability', 'repair_efficiency', 'repair_cooldown'],
        weights: {
            'scan_cool_down': -0.5, // Lower is better
            'sduPerScan': 1.0,
            'scan_cost': -0.3, // Lower is better
            'scan_power': 1.2,
            'repair_cost': -0.4, // Lower is better
            'repair_rate': 1.3,
            'repair_ability': 1.5,
            'repair_efficiency': 1.2,
            'repair_cooldown': -0.6 // Lower is better
        }
    },
    Economy: {
        name: 'Economy',
        color: '#ffff44',
        icon: '💰',
        stats: ['fuel_capacity', 'loot_rate', 'ship_size_value', 'lp_value', 'warp_lane_fee'],
        weights: {
            'fuel_capacity': 1.0,
            'loot_rate': 1.2,
            'ship_size_value': 0.8,
            'lp_value': 1.0,
            'warp_lane_fee': -0.5 // Lower is better
        }
    }
};

// Calculate normalized score for a stat (0-100 scale)
function calculateStatScore(statValue, statName, allShipValues) {
    if (statValue === undefined || statValue === null || isNaN(statValue)) {
        return 0;
    }
    
    // Get all values for this stat across all ships
    const validValues = allShipValues.filter(v => v !== undefined && v !== null && !isNaN(v) && v > 0);
    
    if (validValues.length === 0) {
        return 0;
    }
    
    const minValue = Math.min(...validValues);
    const maxValue = Math.max(...validValues);
    
    // Avoid division by zero
    if (minValue === maxValue) {
        return 50; // Neutral score if all ships have the same value
    }
    
    // For stats where lower is better, reverse the scale
    const category = Object.values(SCORE_CATEGORIES).find(cat => cat.stats.includes(statName));
    const isLowerBetter = category && category.weights[statName] < 0;
    
    let normalizedScore;
    if (isLowerBetter) {
        // For lower-is-better stats, invert the scale
        normalizedScore = ((maxValue - statValue) / (maxValue - minValue)) * 100;
    } else {
        // For higher-is-better stats, use normal scale
        normalizedScore = ((statValue - minValue) / (maxValue - minValue)) * 100;
    }
    
    return Math.max(0, Math.min(100, normalizedScore));
}

// Calculate category score for a ship
function calculateCategoryScore(ship, modifiedStats, categoryKey, allShips) {
    const category = SCORE_CATEGORIES[categoryKey];
    if (!category) return 0;
    
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    category.stats.forEach(statName => {
        const statValue = modifiedStats[statName];
        if (statValue !== undefined && statValue !== null && !isNaN(statValue)) {
            // Get all values for this stat from all ships
            const allStatValues = allShips.map(s => {
                // Use modified stats if ship is in comparison, otherwise base stats
                const shipInComparison = addedShips.find(as => as['Ship Name'] === s['Ship Name'] && as.Manufacturer === s.Manufacturer);
                if (shipInComparison) {
                    const shipIdentifier = getShipIdentifier(shipInComparison);
                    const activeIndex = activeConfigIndices[shipInComparison.id] || 0;
                    const activeConfig = shipConfigurations[shipIdentifier] && shipConfigurations[shipIdentifier][activeIndex];
                    if (activeConfig) {
                        const modStats = calculateModifiedStats(s, activeConfig.components);
                        return modStats[statName];
                    }
                }
                return s[statName];
            });
            
            const statScore = calculateStatScore(statValue, statName, allStatValues);
            const weight = Math.abs(category.weights[statName] || 1.0);
            
            totalWeightedScore += statScore * weight;
            totalWeight += weight;
        }
    });
    
    return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
}

// Calculate overall uber score for a ship
function calculateUberScore(ship, modifiedStats, allShips) {
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    Object.keys(SCORE_CATEGORIES).forEach(categoryKey => {
        const categoryScore = calculateCategoryScore(ship, modifiedStats, categoryKey, allShips);
        const categoryWeight = getCategoryWeight(categoryKey, ship);
        
        totalWeightedScore += categoryScore * categoryWeight;
        totalWeight += categoryWeight;
    });
    
    return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
}

// Get category weight based on ship spec
function getCategoryWeight(categoryKey, ship) {
    const spec = ship.Spec ? ship.Spec.toLowerCase() : '';
    
    // Adjust weights based on ship specialization
    const specWeights = {
        'Combat': {
            'fighter': 1.5,
            'bomber': 1.4,
            'bounty hunter': 1.3,
            'default': 1.0
        },
        'Mobility': {
            'racer': 1.5,
            'data runner': 1.3,
            'default': 1.0
        },
        'Cargo': {
            'transport': 1.5,
            'freight': 1.6,
            'default': 0.8
        },
        'Mining': {
            'miner': 1.8,
            'default': 0.3
        },
        'Support': {
            'repair': 1.6,
            'rescue': 1.4,
            'refuel/repair': 1.5,
            'multi-role': 1.2,
            'default': 0.7
        },
        'Economy': {
            'freight': 1.3,
            'transport': 1.2,
            'default': 0.9
        }
    };
    
    const categoryWeights = specWeights[categoryKey];
    if (!categoryWeights) return 1.0;
    
    return categoryWeights[spec] || categoryWeights['default'];
}

// Get score color based on value
function getScoreColor(score) {
    if (score >= 80) return '#4CAF50'; // Green
    if (score >= 60) return '#8BC34A'; // Light green
    if (score >= 40) return '#FFC107'; // Yellow
    if (score >= 20) return '#FF9800'; // Orange
    return '#f44336'; // Red
}

// Calculate all scores for a ship
function calculateShipScores(ship, modifiedStats, allShips) {
    const scores = {};
    
    // Calculate category scores
    Object.keys(SCORE_CATEGORIES).forEach(categoryKey => {
        scores[categoryKey] = calculateCategoryScore(ship, modifiedStats, categoryKey, allShips);
    });
    
    // Calculate uber score
    scores.Uber = calculateUberScore(ship, modifiedStats, allShips);
    
    return scores;
}

// === CLASS-SPECIFIC SCORING FUNCTIONS ===

// Filter ships by class
function filterShipsByClass(allShips, targetClass) {
    return allShips.filter(ship => ship.Class === targetClass);
}

// Calculate category score for a ship within its class
function calculateCategoryScoreByClass(ship, modifiedStats, categoryKey, allShips) {
    const shipsInClass = filterShipsByClass(allShips, ship.Class);
    return calculateCategoryScore(ship, modifiedStats, categoryKey, shipsInClass);
}

// Calculate overall uber score for a ship within its class
function calculateUberScoreByClass(ship, modifiedStats, allShips) {
    const shipsInClass = filterShipsByClass(allShips, ship.Class);
    return calculateUberScore(ship, modifiedStats, shipsInClass);
}

// Calculate all scores for a ship within its class
function calculateShipScoresByClass(ship, modifiedStats, allShips) {
    const scores = {};
    
    // Calculate category scores within class
    Object.keys(SCORE_CATEGORIES).forEach(categoryKey => {
        scores[categoryKey] = calculateCategoryScoreByClass(ship, modifiedStats, categoryKey, allShips);
    });
    
    // Calculate uber score within class
    scores.Uber = calculateUberScoreByClass(ship, modifiedStats, allShips);
    
    return scores;
}

// Calculate both global and class-specific scores
function calculateAllShipScores(ship, modifiedStats, allShips) {
    return {
        global: calculateShipScores(ship, modifiedStats, allShips),
        class: calculateShipScoresByClass(ship, modifiedStats, allShips)
    };
}

// === MODULE EXPORT ===
// Export functions and constants for external use
window.ShipScoring = {
    SCORE_CATEGORIES: SCORE_CATEGORIES,
    calculateStatScore: calculateStatScore,
    calculateCategoryScore: calculateCategoryScore,
    calculateUberScore: calculateUberScore,
    getCategoryWeight: getCategoryWeight,
    getScoreColor: getScoreColor,
    calculateShipScores: calculateShipScores,
    // New class-specific functions
    filterShipsByClass: filterShipsByClass,
    calculateCategoryScoreByClass: calculateCategoryScoreByClass,
    calculateUberScoreByClass: calculateUberScoreByClass,
    calculateShipScoresByClass: calculateShipScoresByClass,
    calculateAllShipScores: calculateAllShipScores
};

// Also export individual items for backward compatibility
window.SCORE_CATEGORIES = SCORE_CATEGORIES;
window.calculateStatScore = calculateStatScore;
window.calculateCategoryScore = calculateCategoryScore;
window.calculateUberScore = calculateUberScore;
window.getCategoryWeight = getCategoryWeight;
window.getScoreColor = getScoreColor;
window.calculateShipScores = calculateShipScores;
// New exports
window.filterShipsByClass = filterShipsByClass;
window.calculateCategoryScoreByClass = calculateCategoryScoreByClass;
window.calculateUberScoreByClass = calculateUberScoreByClass;
window.calculateShipScoresByClass = calculateShipScoresByClass;
window.calculateAllShipScores = calculateAllShipScores;

console.log('Ship Scoring module loaded successfully'); 