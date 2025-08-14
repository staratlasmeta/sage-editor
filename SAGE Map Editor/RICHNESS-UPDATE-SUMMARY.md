# Resource Hardness to Richness Conversion Summary

## Overview
This document summarizes all changes made to convert the resource "Hardness" attribute to "Richness" throughout the SAGE Map Editor codebase.

## Key Concept Changes
- **Old**: Hardness - Higher values meant resources were harder to extract (less resources obtained)
- **New**: Richness - Higher values mean resources are easier to extract (more resources obtained)
- **Distribution**: Richness now increases closer to origin (0,0) and decreases further away (inverse of hardness)

## Files Modified

### 1. JavaScript Files

#### models.js
- Updated all `RESOURCE_TYPES` definitions from `hardness` to `richness`
- Changed all resource property names in resource type definitions

#### canvas-drawing.js
- Changed resource display format from `(H${resource.hardness})` to `(R${resource.richness})`
- Updated abundance score calculation: changed from `10 / resource.hardness` to `resource.richness`
- Updated comments to reflect richness concept

#### helpers.js
- Updated all resource definitions from `hardness` to `richness`
- Changed property names in resource helper functions

#### main.js
- Updated all hardcoded resource definitions from `hardness` to `richness`
- Changed default resource values

#### system-operations.js
- Updated resource editing modal labels from "Hardness" to "Richness"
- Changed all resource table headers from "Hardness" to "Richness"
- Updated resource categories to filter by richness values
- Changed resource display format from `H` to `R` prefix

#### ui-handlers.js
- Renamed function from `showResourceHardnessModal` to `showResourceRichnessModal`
- Renamed function from `applyResourceHardnessFalloff` to `applyResourceRichnessFalloff`
- Updated modal title to "Resource Richness Falloff"
- Inverted the distribution logic:
  - Linear: `1 - normalizedDistance`
  - Exponential: `1 - Math.pow(normalizedDistance, 2)`
  - Logarithmic: `1 - Math.log10(normalizedDistance * 9 + 1)`
  - Fibonacci: `1 - Math.pow(normalizedDistance, 0.618)`
- Swapped the UI labels for min/max values:
  - Maximum Richness: Now applies to systems closest to origin
  - Minimum Richness: Now applies to systems farthest from origin
- Updated all alert messages and UI text

#### state.js
- Replaced all `hardness` properties with `richness` in `PLANET_ARCHETYPE_RESOURCES`
- Updated all resource definitions for all factions (MUD, ONI, USTUR)
- Updated all planet type resource definitions

### 2. HTML Files

#### index.html
- Changed button ID from `resourceHardnessBtn` to `resourceRichnessBtn`
- Updated button text from "Resource Hardness" to "Resource Richness"
- Updated tooltip text

### 3. Documentation

#### README.md
- Updated documentation to mention "richness levels" instead of "hardness levels"

## Distribution Algorithm Changes

The resource distribution algorithm has been inverted to match the new richness concept:

### Old (Hardness)
- Systems at origin (0,0): Low hardness values
- Systems far from origin: High hardness values
- Effect: Less resources near origin, more resources far away

### New (Richness)
- Systems at origin (0,0): High richness values
- Systems far from origin: Low richness values
- Effect: More resources near origin, less resources far away

## UI Changes
1. All labels changed from "Hardness" to "Richness"
2. Resource display format changed from "H[value]" to "R[value]"
3. Distribution modal now correctly labels which values apply where
4. Heatmap visualization comment updated to reflect richness logic

## Backwards Compatibility
- Existing saved maps will still contain `hardness` properties
- These will need to be converted when loaded
- Consider adding a migration function to handle old save files

## Testing Recommendations
1. Test resource richness distribution algorithm
2. Verify resource display shows R values correctly
3. Check that resource editing works with new property name
4. Test importing old maps with hardness values
5. Verify abundance heatmap displays correctly with new calculation 