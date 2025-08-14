# Generate Regional Distribution - Documentation

## Overview

The "Generate Regional Distribution" functionality is a powerful feature in the SAGE Map Editor that automates the creation of star systems, planets, and resources for selected regions. This document provides a comprehensive guide to understanding and potentially enhancing this feature.

## Feature Location

- **UI Element**: Button appears when multiple systems are selected
- **Code Location**: `js/system-operations.js` line 524
- **Main Function**: `generateRegionalPlanetDistribution()` (lines 1989-2300)

## How It Works

### 1. System Selection and Validation
- Requires at least one system to be selected
- Respects locked systems (won't modify them)
- Creates a save state for undo functionality

### 2. KING System Designation
```javascript
// The system with the most links becomes the KING system
let kingSystem = null;
let maxLinks = 0;
systems.forEach(system => {
    if (!system.isLocked && system.links && system.links.length > maxLinks) {
        maxLinks = system.links.length;
        kingSystem = system;
    }
});
```
- KING systems are automatically identified based on having the most links
- Only one KING system per region (the most connected hub)
- KING systems receive special treatment in generation
- Visual indicator: 8-pointed star with diamond center

### 3. CORE System Designation
```javascript
// 30-60% of non-KING systems are designated as CORE
const minCorePercent = 30;
const maxCorePercent = 60;
const targetCorePercent = minCorePercent + Math.random() * (maxCorePercent - minCorePercent);
```
- CORE systems receive better planet tiers and more planets
- Existing locked CORE systems are preserved
- Visual indicator: Crown shape instead of circle

### 4. System Naming Convention
Systems are renamed following this pattern:
```
[REGION]-[FACTION]-[TYPE]-[SEQUENCE]
```
Examples:
- `CEN-MUD-KING-01` (Central region, MUD faction, KING system, sequence 1)
- `CEN-MUD-CORE-01` (Central region, MUD faction, CORE system, sequence 1)
- `RIM-ONI-SEC-03` (Rim region, ONI faction, Secondary system, sequence 3)

Components:
- **Region**: Last 3 characters of region name (padded with 0s)
- **Faction**: MUD, ONI, UST, or NEU (neutral)
- **Type**: KING, CORE or SEC (secondary)
- **Sequence**: Two-digit number

### 5. Star Generation
```javascript
// Star distribution probabilities
if (system.isKing) {
    // KING systems: 40% single, 45% binary, 15% trinary
} else {
    // Regular systems: 67% single, 30% binary, 3% trinary
}
```

Star properties:
- **Types**: 20 different star types available (`STAR_TYPES` in `models.js`)
- **Scale**: Random between 0.1 and 3.0
- **Naming**: `[SystemName] [StarType] [Letter]` (e.g., "CEN-MUD-CORE-01 Red Dwarf B")

### 6. Planet Generation

#### Planet Count
- **KING Systems**: 6-8 planets
- **CORE Systems**: 4-6 planets
- **Regular Systems**: 2-4 planets

#### Planet Tier System
Based on region size and system type:

**Region Size Categories:**
- Small: 1-5 systems
- Medium: 6-10 systems
- Large: 11+ systems

**Base Probabilities:**
```javascript
const baseProbabilities = {
    small: {
        basic: 0.7,    // Tier 1
        common: 0.2,   // Tier 2
        uncommon: 0.1, // Tier 3
        rare: 0,       // Tier 4
        epic: 0        // Tier 5
    },
    medium: {
        basic: 0.5,
        common: 0.3,
        uncommon: 0.15,
        rare: 0.05,
        epic: 0
    },
    large: {
        basic: 0.4,
        common: 0.3,
        uncommon: 0.2,
        rare: 0.07,
        epic: 0.03
    }
};
```

**KING System Probabilities:**
- Basic: 10% (much lower)
- Common: 20%
- Uncommon: 30%
- Rare: 25%
- Epic: 15%

**CORE System Boost:**
- Reduces basic planet chance
- Increases chances for higher tiers
- Adds possibility of epic (tier 5) planets

#### Planet Properties
- **Name**: `[SystemName]-P[Number]` (e.g., "CEN-MUD-CORE-01-P1")
- **Orbit**: Base orbit (1-6) with ±0.25 variation
- **Angle**: Random 0-359 degrees
- **Scale**: Based on planet type defaults

### 7. Resource Assignment

Resources are assigned based on:
1. **Planet Faction**: MUD, ONI, or USTUR
2. **Planet Archetype**: Terrestrial, Volcanic, Barren, etc.

The system uses `PLANET_ARCHETYPE_RESOURCES` (defined in `state.js`) which contains predefined resource lists for each faction/archetype combination.

Example resource structure:
```javascript
{
    "MUD": {
        "Terrestrial": [
            { type: 0, name: "Aluminum Ore", richness: 2 },
            { type: 1, name: "Amber Resin", richness: 2 },
            // ... more resources
        ]
    }
}
```

## Files and Components Involved

### Core Implementation Files

1. **`js/system-operations.js`**
   - `generateRegionalPlanetDistribution()` - Main function
   - `displayMultipleSystemDetails()` - UI for bulk editing
   - Helper functions for planet/star generation

2. **`js/models.js`**
   - `STAR_TYPES` - Array of 20 star types
   - `PLANET_TYPES` - Array of planet types with faction assignments
   - `PLANET_TIERS` - Mapping of planet types to tier levels (1-5)

3. **`js/state.js`**
   - `PLANET_ARCHETYPE_RESOURCES` - Default resources for each faction/archetype
   - State management for undo/redo functionality
   - Filter state initialization (includes KING filters)

4. **`js/utils.js`**
   - `getPlanetArchetype()` - Extracts faction and archetype from planet name
   - `deepCopy()` - Used for resource assignment

### Visual and UI Components

1. **`js/canvas-drawing.js`**
   - KING system star rendering (lines 405-459)
   - CORE system crown rendering (lines 368-403)
   - KING status label display
   - Region indicators for systems
   - System label display

2. **`js/ui-handlers.js`**
   - Resource Richness button handler (separate but related feature)
   - Region management tools
   - KING filter options in the filter UI

## Data Structures

### System Object Properties
```javascript
{
    key: "unique-key",
    name: "CEN-MUD-KING-01",
    coordinates: [x, y],
    faction: "MUD",
    isKing: true,
    isCore: false,
    isLocked: false,
    regionId: "region-123",
    stars: [...],
    planets: [...],
    links: [...]
}
```

### Planet Object Properties
```javascript
{
    name: "CEN-MUD-CORE-01-P1",
    type: 8, // Numeric ID from PLANET_TYPES
    orbit: 1.2,
    angle: 45,
    scale: 0.3,
    resources: [
        {
            type: 0,
            name: "Aluminum Ore",
            richness: 2
        }
    ]
}
```

## Visual Effects

### KING Systems
- Rendered with 8-pointed star shape
- Diamond center overlay
- 30% larger than regular systems
- Purple "👑 KING" label when filtered/selected
- Star-shaped region indicator

### CORE Systems
- Rendered with crown shape instead of circle
- Crown-shaped region indicator
- Special highlighting in system lists
- "CORE" badge in UI displays

### Regular Systems
- Standard circular rendering
- Circular region indicators
- Standard system coloring based on faction

## Related Features

### Resource Richness Falloff
- Separate feature that modifies resource richness based on distance from origin
- Can be applied after regional distribution
- Options: Linear, Exponential, Logarithmic, Fibonacci curves

### Region Management
- Systems can belong to defined regions
- Regions affect naming and visual grouping
- Region statistics displayed in UI (includes KING count)

### Filtering Options
- KING Status filter (shows/hides KING label)
- Regional KING count (shows count in region labels)
- All standard filters apply to KING systems

## Enhancement Opportunities

### 1. Customizable Generation Parameters
- User-defined KING system selection criteria
- Manual KING designation option
- User-defined CORE system percentage
- Adjustable planet count ranges
- Custom tier probability distributions
- Star system configuration preferences

### 2. Advanced Naming Options
- Custom naming templates
- Thematic name generators
- Option to preserve existing names
- Faction-specific naming conventions

### 3. Resource System Enhancements
- KING-specific resource bonuses
- Rare resource injection controls
- Faction-specific resource biases
- Resource pool customization
- Tier-based resource scaling

### 4. Preview and Selective Application
- Preview mode before applying changes
- Selective system processing
- Dry-run statistics
- Partial rollback options

### 5. Planet Distribution Patterns
- Orbital resonance patterns
- Faction-specific planet arrangements
- Goldilocks zone preferences
- Moon and ring generation

### 6. Integration Improvements
- Better integration with Resource Richness
- Batch processing for multiple regions
- Template save/load functionality
- Statistics and reporting tools

## Usage Notes

1. **Always backup your map** before applying to large selections
2. **Locked systems** are respected and won't be modified
3. **KING systems** are automatically determined by link count
4. **Undo is available** but may be memory-intensive for large operations
5. **Resource assignments** are based on planet type, not customizable per-planet

## Performance Considerations

- Large selections (100+ systems) may cause brief UI freeze
- Each system generates multiple objects (stars, planets, resources)
- Undo state captures entire map state
- Visual updates trigger full map redraw

## Future Development Considerations

When enhancing this feature, consider:
1. Maintaining backward compatibility with existing maps
2. Preserving undo/redo functionality
3. Respecting locked system states
4. Ensuring visual consistency
5. Performance impact on large maps
6. KING system uniqueness per region 