# SAGE C4 Tools - Data Integration Guide

## Overview
To replace the mock data with real Star Atlas game data, you'll need to populate several JSON and CSV files located in the `public/data/` directory.

## Required Data Files

### 1. **cargo.json** 
`public/data/cargo.json`
- Contains all resource definitions (raw materials, processed goods, components)
- Format:
```json
[
  {
    "id": "iron-ore",
    "name": "Iron Ore",
    "category": "raw",
    "description": "Raw iron ore extracted from planets"
  }
]
```

### 2. **claimStakeBuildings.json**
`public/data/claimStakeBuildings.json`
- All buildings that can be placed on claim stakes
- Each building should include:
  - Basic info: id, name, category, tier
  - Requirements: slots, power, crew
  - Resource flows: extractionRate, resourceUsage, resourceProduction
  - Tags: requiredTags, providedTags
  - Construction: constructionCost, constructionTime
- Format:
```json
[
  {
    "id": "central_hub_t1",
    "name": "Central Hub T1",
    "category": "infrastructure",
    "tier": 1,
    "slots": 5,
    "power": 100,
    "crew": 10,
    "resourceUsage": { "fuel": 0.5 },
    "constructionCost": {},
    "providedTags": ["basic-operations"],
    "description": "Main control center"
  }
]
```

### 3. **craftingHabBuildings.json**
`public/data/craftingHabBuildings.json`
- Buildings for crafting hab plots (habs, crafting stations, cargo storage)
- Format:
```json
{
  "habs": [
    {
      "id": "hab_t1",
      "name": "Basic Hab",
      "tier": 1,
      "slots": 10
    }
  ],
  "craftingStations": [
    {
      "id": "station_xxs",
      "name": "XXS Crafting Station",
      "size": "XXS",
      "speedBonus": 1.0,
      "jobSlots": 1
    }
  ],
  "cargoStorage": [
    {
      "id": "cargo_t1",
      "name": "T1 Cargo Storage",
      "tier": 1,
      "jobSlotBonus": 1
    }
  ]
}
```

### 4. **recipes.csv**
`public/data/recipes.csv`
- All crafting recipes in CSV format
- Headers: OutputID, OutputName, OutputType, OutputTier, BuildingResourceTier, ConstructionTime, PlanetTypes, Factions, ResourceType, ProductionSteps, Ingredient1, Quantity1, Ingredient2, Quantity2, etc.
- Example:
```csv
OutputID,OutputName,OutputType,OutputTier,BuildingResourceTier,ConstructionTime,PlanetTypes,Factions,ResourceType,ProductionSteps,Ingredient1,Quantity1,Ingredient2,Quantity2
steel_plate,Steel Plate,Component,1,1,60,All,All,Processed,2,iron-ore,10,coal,2
```

### 5. **planetArchetypes.json** (Optional)
`public/data/planetArchetypes.json`
- Planet types and their resource richness modifiers
- Format:
```json
[
  {
    "id": "terrestrial",
    "name": "Terrestrial Planet",
    "resources": {
      "iron-ore": { "richness": 1.5 },
      "copper-ore": { "richness": 1.2 }
    },
    "tags": ["mining", "industrial"]
  }
]
```

### 6. **tags.json** (Optional)
`public/data/tags.json`
- All tags used in the building system
- Format:
```json
[
  {
    "id": "basic-operations",
    "name": "Basic Operations",
    "description": "Enables basic claim stake functionality"
  }
]
```

## Data Loading Priority

The system checks for real data files first, then falls back to mock data if files are missing:
1. **Real data files** are loaded from `/public/data/`
2. **Mock data** (in `app/services/DataLoader.ts`) is used as fallback
3. You can mix real and mock data - the system will use whatever is available

## Important Notes

### Building Relationships
- Buildings can require tags from other buildings (e.g., extractors need "extraction-modules" tag from Extraction Hub)
- Central Hub should come with stake (`comesWithStake: true`)
- Infrastructure buildings should be tier-limited to match claim stake tier

### Resource Flow Rates
- All rates are **per second**
- `extractionRate`: Raw resource extraction (affected by planet richness)
- `resourceUsage`: Resources consumed per second
- `resourceProduction`: Processed resources produced per second

### Upgrade Families
- Buildings with the same `upgradeFamily` are considered upgrades of each other
- Example: `central_hub_t1`, `central_hub_t2`, `central_hub_t3` all have `upgradeFamily: "central_hub"`

## Testing Your Data

1. Place your JSON/CSV files in `public/data/`
2. The app will automatically load them on startup
3. Check browser console for any loading errors
4. Test building placement, resource flow, and crafting to ensure data integrity

## Quick Start

For a minimal working setup, you need:
1. **claimStakeBuildings.json** - At least Central Hub and a few extractors/processors
2. **cargo.json** - Define the resources your buildings use/produce
3. **recipes.csv** - A few test recipes for the crafting system

The other files can be added incrementally as you expand the data. 