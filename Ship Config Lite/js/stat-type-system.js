// === MODULE: Stat Type System ===
// This module handles the stat type system that allows stats to be 
// additive, multiplicative, or both.

// Stat type constants
const STAT_TYPES = {
    MULTIPLICATIVE: 'multiplicative',
    ADDITIVE: 'additive', 
    BOTH: 'both'
};

// Default stat type for backward compatibility
const DEFAULT_STAT_TYPE = STAT_TYPES.MULTIPLICATIVE;

/**
 * Initialize stat object with type system
 * @param {Object} existingStat - Existing stat object (for backward compatibility)
 * @returns {Object} Initialized stat object
 */
function initializeStatWithType(existingStat = {}) {
    // If it's an old format (just has baseValue), convert it
    if (existingStat.baseValue !== undefined && existingStat.type === undefined) {
        return {
            baseValue: existingStat.baseValue, // Keep for backward compatibility
            multiplicativeValue: existingStat.baseValue || 1.0,
            additiveValue: 0,
            type: DEFAULT_STAT_TYPE,
            values: existingStat.values || {},
            // Preserve scaledValue if it exists
            ...(existingStat.scaledValue !== undefined && { scaledValue: existingStat.scaledValue })
        };
    }
    
    // Already in new format
    return {
        baseValue: existingStat.baseValue || 0,
        multiplicativeValue: existingStat.multiplicativeValue !== undefined ? existingStat.multiplicativeValue : 1.0,
        additiveValue: existingStat.additiveValue || 0,
        type: existingStat.type || DEFAULT_STAT_TYPE,
        values: existingStat.values || {},
        // Preserve scaledValue if it exists
        ...(existingStat.scaledValue !== undefined && { scaledValue: existingStat.scaledValue })
    };
}

/**
 * Cycle to the next stat type
 * @param {string|Object} currentTypeOrStat - Current stat type string or stat object
 * @returns {string} Next stat type
 */
function cycleStatType(currentTypeOrStat) {
    // If passed a stat object, extract the type and update it
    if (typeof currentTypeOrStat === 'object' && currentTypeOrStat !== null) {
        const stat = currentTypeOrStat;
        const currentType = stat.type || DEFAULT_STAT_TYPE;
        const newType = cycleStatType(currentType); // Recursive call with just the type
        updateStatType(stat, newType);
        return newType;
    }
    
    // Original behavior for string input
    const currentType = currentTypeOrStat;
    switch (currentType) {
        case STAT_TYPES.MULTIPLICATIVE:
            return STAT_TYPES.ADDITIVE;
        case STAT_TYPES.ADDITIVE:
            return STAT_TYPES.BOTH;
        case STAT_TYPES.BOTH:
            return STAT_TYPES.MULTIPLICATIVE;
        default:
            return STAT_TYPES.MULTIPLICATIVE;
    }
}

/**
 * Get display icon for stat type
 * @param {string} type - Stat type
 * @returns {string} Icon to display
 */
function getStatTypeIcon(type) {
    switch (type) {
        case STAT_TYPES.MULTIPLICATIVE:
            return '×'; // Multiplication symbol
        case STAT_TYPES.ADDITIVE:
            return '+'; // Plus symbol
        case STAT_TYPES.BOTH:
            return '±'; // Plus-minus symbol
        default:
            return '×';
    }
}

/**
 * Get display color for stat type
 * @param {string} type - Stat type  
 * @returns {string} Color hex code
 */
function getStatTypeColor(type) {
    switch (type) {
        case STAT_TYPES.MULTIPLICATIVE:
            return '#FFD700'; // Gold
        case STAT_TYPES.ADDITIVE:
            return '#4CAF50'; // Green
        case STAT_TYPES.BOTH:
            return '#2196F3'; // Blue
        default:
            return '#FFD700';
    }
}

/**
 * Calculate the effective value for a stat based on its type
 * @param {number} baseValue - Base value (from ship)
 * @param {Object} statData - Stat data with type and values
 * @returns {Object} Object with finalValue and components used
 */
function calculateStatValue(baseValue, statData) {
    const type = statData.type || DEFAULT_STAT_TYPE;
    const additive = statData.additiveValue || 0;
    const multiplicative = statData.multiplicativeValue !== undefined ? statData.multiplicativeValue : 1.0;
    
    let finalValue = baseValue;
    let formula = '';
    
    switch (type) {
        case STAT_TYPES.ADDITIVE:
            // Pure additive
            finalValue = baseValue + additive;
            formula = `${baseValue} + ${additive}`;
            break;
            
        case STAT_TYPES.MULTIPLICATIVE:
            // Pure multiplicative
            finalValue = baseValue * multiplicative;
            formula = `${baseValue} × ${multiplicative}`;
            break;
            
        case STAT_TYPES.BOTH:
            // Add first, then multiply
            finalValue = (baseValue + additive) * multiplicative;
            formula = `(${baseValue} + ${additive}) × ${multiplicative}`;
            break;
    }
    
    return {
        finalValue,
        formula,
        additiveComponent: additive,
        multiplicativeComponent: multiplicative,
        type
    };
}

/**
 * Update stat values when type changes
 * @param {Object} stat - Stat object
 * @param {string} newType - New stat type
 */
function updateStatType(stat, newType) {
    stat.type = newType;
    
    // Update baseValue for backward compatibility
    switch (newType) {
        case STAT_TYPES.ADDITIVE:
            stat.baseValue = stat.additiveValue;
            break;
        case STAT_TYPES.MULTIPLICATIVE:
            stat.baseValue = stat.multiplicativeValue;
            break;
        case STAT_TYPES.BOTH:
            // For 'both' mode, baseValue becomes the multiplicative part
            stat.baseValue = stat.multiplicativeValue;
            break;
    }
}

/**
 * Migrate old stat format to new format
 * @param {Object} componentAttributes - The global componentAttributes object
 */
function migrateComponentAttributesToNewFormat(componentAttributes) {
    Object.keys(componentAttributes).forEach(category => {
        Object.keys(componentAttributes[category]).forEach(groupName => {
            const group = componentAttributes[category][groupName];
            
            // Process stats at this level
            Object.keys(group).forEach(key => {
                if (key !== 'subGroups' && group[key] && typeof group[key] === 'object' && 
                    group[key].hasOwnProperty('baseValue')) {
                    group[key] = initializeStatWithType(group[key]);
                }
            });
            
            // Process subGroups recursively
            if (group.subGroups) {
                migrateSubGroupsToNewFormat(group.subGroups);
            }
        });
    });
}

/**
 * Migrate subgroups recursively
 * @param {Object} subGroups - Subgroups object
 */
function migrateSubGroupsToNewFormat(subGroups) {
    Object.keys(subGroups).forEach(subGroupName => {
        const subGroup = subGroups[subGroupName];
        
        // Process stats at this level
        Object.keys(subGroup).forEach(key => {
            if (key !== 'subGroups' && subGroup[key] && typeof subGroup[key] === 'object' && 
                subGroup[key].hasOwnProperty('baseValue')) {
                subGroup[key] = initializeStatWithType(subGroup[key]);
            }
        });
        
        // Process nested subGroups
        if (subGroup.subGroups) {
            migrateSubGroupsToNewFormat(subGroup.subGroups);
        }
    });
}

// === MODULE EXPORT ===
window.StatTypeSystem = {
    STAT_TYPES,
    DEFAULT_STAT_TYPE,
    initializeStatWithType,
    cycleStatType,
    getStatTypeIcon,
    getStatTypeColor,
    calculateStatValue,
    updateStatType,
    migrateComponentAttributesToNewFormat
};

// Also expose individual items for backward compatibility
window.STAT_TYPES = STAT_TYPES;
window.initializeStatWithType = initializeStatWithType;
window.cycleStatType = cycleStatType;
window.getStatTypeIcon = getStatTypeIcon;
window.getStatTypeColor = getStatTypeColor;
window.calculateStatValue = calculateStatValue;
window.updateStatType = updateStatType;
window.migrateComponentAttributesToNewFormat = migrateComponentAttributesToNewFormat;

console.log('Stat Type System module loaded successfully'); 