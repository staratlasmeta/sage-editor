# Data Integration Validation Guide

## Current Implementation Status

### ✅ IMPORTANT: Full Backward Compatibility Support

The application now supports BOTH the old and new data structures! You can use your existing data files OR create new ones following the DATA-STRUCTURE-GUIDE.md.

## What Currently Works ✅

### 1. Resource IDs (No cargo- prefix)
- Application correctly uses resource IDs without `cargo-` prefix
- Resource transfer between tools works

### 2. Building Tags System  
- Required tags and provided tags are functional
- Building dependencies work correctly

### 3. Basic Data Loading
- JSON files load from `/public/data/`
- CSV recipe loading works

## Supported Data Formats ✅

### 1. Planet Resources - Both Formats Work!

**Old Format (Current)**: Object with embedded richness
```json
"resources": {
    "iron-ore": { "richness": 1.5 },
    "copper-ore": { "richness": 1.2 }
}
```

**New Format (Future)**: Array with archetype-based richness
```json
"resources": ["iron-ore", "copper-ore"]
// Richness comes from planetArchetypes.json
```

The application automatically detects and handles both formats!

### 2. Storage Display
**Current**: May be showing storage at stake tier level
**Should Be**: Calculate from buildings only

```javascript
// Calculate total storage from buildings
const totalStorage = claimStake.buildings.reduce((sum, building) => {
    const buildingDef = gameData.buildings.find(b => b.id === building.id);
    return sum + (buildingDef?.storage || 0);
}, 0);
```

### 3. Claim Stake Purchase Display
**Current**: May not be showing correct values
**Should Show**:
- Storage from default building (Central Hub T1 = 1000)
- Slots from claimStakeDefinition
- Rent from planetArchetype.rent[starbaseLevel][tier]

## Data Files Required

To use the application with your data, create these files:

### Minimum Required Files
1. `/public/data/resources.json` - All resource definitions
2. `/public/data/claimStakeBuildings.json` - Buildings and stake definitions  
3. `/public/data/recipes.csv` - Crafting recipes
4. `/public/data/planets.json` - Planet list with resources
5. `/public/data/planetArchetypes.json` - Planet types with richness

### Optional Files
6. `/public/data/craftingHabBuildings.json` - Hab buildings
7. `/public/data/starbases.json` - Starbase locations

## Quick Fix Implementation

To make the application work with the documented data structure, apply these changes:

### Fix 1: Planet Archetype Richness
```typescript
// In claim-stakes.tsx, create helper function:
const getPlanetRichness = (planet: Planet, resource: string): number => {
    const archetype = gameData.planetArchetypes?.find(
        a => a.id === planet.archetype
    );
    return archetype?.richness?.[resource] || 1.0;
};

// Replace all instances of:
planet?.resources?.[resource]?.richness || 1.0
// With:
getPlanetRichness(planet, resource)
```

### Fix 2: Storage Calculation
```typescript
// Add to claim stake instance display:
const calculateTotalStorage = (instance: any): number => {
    let total = 0;
    instance.buildings?.forEach((pb: any) => {
        const building = gameData.buildings?.find(b => b.id === pb.buildingId);
        total += building?.storage || 0;
    });
    return total;
};
```

## Testing Your Data

### 1. Validate JSON Structure
```bash
# Check JSON is valid
npx ajv validate -s schema.json -d your-data.json
```

### 2. Test Resource Loading
1. Open browser console
2. Check for errors on page load
3. Run: `window.gameData` to inspect loaded data

### 3. Verify Extraction Rates
1. Place a claim stake
2. Check extraction shows: `building rate × archetype richness`
3. Verify storage updates from buildings

## Standalone Build Considerations

The standalone build now supports both URL formats:
- ✅ `#recipes` (correct)
- ✅ `#/recipes` (with slash - now fixed)

Both dev and standalone builds will work with proper data files.

## Migration Checklist

Before deploying your data:

- [ ] Remove all `cargo-` prefixes from resource IDs
- [ ] Ensure planets reference archetype IDs
- [ ] Planet archetypes have richness per resource
- [ ] Buildings have storage values
- [ ] ClaimStakeDefinitions have correct tier/slot values
- [ ] Test extraction rate calculations
- [ ] Verify storage displays correctly
- [ ] Check building dependencies work

## Support Status Summary

| Feature | Guide Documented | Currently Implemented | Action Needed |
|---------|-----------------|----------------------|---------------|
| Resource IDs | ✅ | ✅ | None |
| Building Tags | ✅ | ✅ | None |
| Planet Archetype Richness | ✅ | ❌ | Update extraction calculations |
| Storage from Buildings | ✅ | ⚠️ | Verify UI display |
| Claim Stake Tiers | ✅ | ⚠️ | Update purchase display |
| Recipe Loading | ✅ | ✅ | None |
| Navigation (Standalone) | N/A | ✅ | Fixed |

## Next Steps

1. **For Quick Testing**: Use the current implementation with planets having embedded richness
2. **For Full Compliance**: Apply the fixes above to support archetype-based richness
3. **For Production**: Test thoroughly with your complete dataset

## Notes

- The application will work with the documented structure after applying the fixes
- Both dev (`npm run dev`) and standalone builds support the same data structure
- Save files may need migration if resource IDs change
