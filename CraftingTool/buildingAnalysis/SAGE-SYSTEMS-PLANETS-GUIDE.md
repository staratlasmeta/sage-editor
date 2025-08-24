# SAGE Systems and Planets Data Extraction Guide

## Overview

This guide provides you with multiple ways to quickly access all current systems and planet types from the SAGE universe for recipe generation. The data has been extracted from the `69regions-v8.json` file and organized in several convenient formats.

## Generated Files Summary

### 1. **recipe-lookup-table.json** - ⭐ RECOMMENDED FOR RECIPE GENERATION
**Best for: Quick lookups and programmatic access**

This is your go-to file for recipe generation! It contains:
- **systemsByFaction**: Complete list of all systems organized by faction (MUD, ONI, UST)
- **planetsByFactionAndType**: Planet counts and systems organized by faction and archetype
- **quickLookup**: Easy access to any planet archetype + faction combination

```json
{
  "quickLookup": {
    "Terrestrial Planet": {
      "MUD": { "count": 185, "systems": ["005-MUD-KING-01", ...] },
      "ONI": { "count": 194, "systems": ["012-ONI-KING-01", ...] },
      "UST": { "count": 226, "systems": ["003-UST-KING-01", ...] }
    }
  }
}
```

### 2. **recipe-planning.csv** - ⭐ RECOMMENDED FOR SPREADSHEET WORK
**Best for: Excel/Google Sheets recipe planning**

Simple CSV format showing:
- Planet archetype (Terrestrial Planet, Volcanic Planet, etc.)
- Faction (MUD, ONI, UST)
- Planet count and system count
- Example systems for each combination

### 3. **systems-and-planets-extract.csv**
**Best for: Detailed planet-by-planet analysis**

Complete export with every planet listed individually, including resource counts.

### 4. **recipe-generation-data.json**
**Best for: Advanced programmatic processing**

Comprehensive data structure with detailed breakdowns by faction and archetype.

### 5. **systems-and-planets-extract.json**
**Best for: Complete raw data access**

Full detailed export including coordinates, resource information, and all metadata.

## Quick Reference Data

### Total Counts
- **Systems**: 945 total (315 MUD, 315 ONI, 315 UST)
- **Planets**: 3,929 total across all systems

### Planet Archetypes by Availability

| Archetype | Total | MUD | ONI | UST | Best For Recipes |
|-----------|-------|-----|-----|-----|------------------|
| **Barren Planet** | 628 | 198 | 204 | 226 | ✅ Most abundant |
| **Terrestrial Planet** | 605 | 185 | 194 | 226 | ✅ Very common |
| **Volcanic Planet** | 600 | 219 | 208 | 173 | ✅ Very common |
| **Asteroid Belt** | 546 | 186 | 186 | 174 | ✅ Common |
| **Gas Giant** | 499 | 167 | 170 | 162 | ✅ Common |
| **Oceanic Planet** | 487 | 166 | 165 | 156 | ⚠️ Moderate |
| **Ice Giant** | 425 | 145 | 135 | 145 | ⚠️ Moderate |
| **Dark Planet** | 139 | 40 | 52 | 47 | ❌ Rare - use sparingly |

## Recipe Generation Recommendations

### For Balanced Recipes (All Factions)
Use these archetypes as they're well-distributed:
- Barren Planet
- Terrestrial Planet  
- Volcanic Planet
- Asteroid Belt

### For Faction-Specific Recipes
- **MUD specialty**: Volcanic Planet (219 available)
- **UST specialty**: Barren Planet & Terrestrial Planet (226 each)
- **ONI specialty**: Barren Planet (204 available)

### For Rare/Epic Recipes
- **Dark Planet**: Only 139 total - perfect for rare recipes
- **Ice Giant**: 425 total - good for uncommon recipes

## Usage Examples

### Example 1: Find all MUD Terrestrial Planet systems
```javascript
// From recipe-lookup-table.json
const mudTerrestrialSystems = data.quickLookup["Terrestrial Planet"]["MUD"].systems;
// Returns array of 145 system names like ["005-MUD-KING-01", "002-MUD-KING-01", ...]
```

### Example 2: Recipe requiring rare planets
```javascript
// Dark planets are rare (only 139 total)
const darkPlanetSystems = {
  MUD: data.quickLookup["Dark Planet"]["MUD"].systems, // 40 systems
  ONI: data.quickLookup["Dark Planet"]["ONI"].systems, // 52 systems  
  UST: data.quickLookup["Dark Planet"]["UST"].systems  // 47 systems
};
```

### Example 3: Spreadsheet recipe planning
Open `recipe-planning.csv` in Excel/Google Sheets to:
- Sort by planet count to find abundant vs. rare archetypes
- Filter by faction for faction-specific recipes
- Use example systems to test recipes

## System Naming Conventions

Systems follow these patterns:
- **KING systems**: `XXX-FACTION-KING-##` (most connected in region)
- **CORE systems**: `XXX-FACTION-CORE-##` (core systems)
- **SEC systems**: `XXX-FACTION-SEC-##` (secondary systems)
- **CSS systems**: `CSS-FACTION-KING-##` (special KING systems)

Examples: `CSS-MUD-KING-01`, `018-ONI-SEC-05`, `002-UST-CORE-01`

## Pro Tips for Recipe Generation

1. **Use recipe-lookup-table.json** for quick programmatic access
2. **Use recipe-planning.csv** for manual planning and spreadsheet work
3. **Balance rarity**: Common archetypes for basic recipes, rare ones for special recipes
4. **Consider faction balance**: Each faction has ~315 systems, so recipes can be balanced across factions
5. **Dark Planets are precious**: Only 139 total - save for truly rare recipes
6. **Barren/Terrestrial are abundant**: Perfect for common recipes and resource generation

## Files Location

All generated files are in the root directory:
- `recipe-lookup-table.json` ⭐
- `recipe-planning.csv` ⭐  
- `systems-and-planets-extract.csv`
- `recipe-generation-data.json`
- `systems-and-planets-extract.json`

---

**Generated from**: `SAGE Editor Suite/Map Editor/69regions-v8.json`  
**Total Data**: 945 systems, 3,929 planets across MUD, ONI, and UST factions 