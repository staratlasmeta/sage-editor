# Linear Stacking Stats System - Implementation Changelog

## Date: January 2025
## Updated: January 2025 - Class Scaling Reinstated

### Summary
The Ship Config Lite app has been overhauled to use a **linear stacking** stat modification system with multipliers instead of the previous additive system. This change affects how component values modify ship base stats and how multiple identical components stack. Class scaling has been reinstated to provide diminishing returns for higher ship classes.

### Changes Made

#### 1. Core Calculation Logic (`js/app.js`)
- **Modified `calculateModifiedStats()` function:**
  - Now uses `statEffects` arrays to collect all component effects
  - Groups identical components together
  - Uses linear stacking formula: `base × (1 + count × (multiplier - 1))`
  - Prevents exponential growth from stacking many components

#### 2. Stat Details Calculation (`js/app.js`)
- **Modified `calculateStatModificationDetails()` function:**
  - Groups identical components together
  - Calculates effects using linear stacking
  - Creates more readable formulas showing the stacking

#### 3. UI Updates (`js/app.js`)
- **Modified `showStatModificationTooltip()` function:**
  - Shows grouped components with counts (e.g., "Ammo Module (×5)")
  - Displays total effect for multiple identical components
  - Shows linear stacking formula: Base × (1 + 5×0.16)
  - Only one base value input per component type
  - Clearer breakdown of how effects combine

#### 4. Class Scaling Reinstated (Updated January 2025)
- **Reinstated class scaling formulas** - provides diminishing returns for higher ship classes
- **Components now scale by both class AND tier**:
  - First scaled by class (diminishing returns formula)
  - Then scaled by tier (applied to class-scaled value)
- **Default class formula**: `base * pow( pow(1.61803398875 , classIndex+1) / 2.2360679775 , 2 )`
- **Updated `recalculateComponentValues()`** - applies both class and tier scaling
- **Updated formula displays** - shows both class and tier calculations

#### 5. Documentation
- **Created `README/MULTIPLICATIVE-STATS-SYSTEM.md`:**
  - Complete guide to the linear stacking system
  - Examples showing how multiple components stack
  - Benefits of linear vs exponential stacking
  - Updated for class scaling removal

- **Updated `README/DOCUMENTATION-INDEX.md`:**
  - Added reference to new stats documentation
  - Updated status table

### Example of Changes

**Before (Additive):**
```
Base: 10
Component 1: +2
Component 2: +3
Final: 10 + 2 + 3 = 15
```

**After (Linear Stacking with Multipliers):**
```
Base cargo: 1000
5× Cargo Module: ×2.16 each (+116%)
Linear stacking: 1000 × (1 + 5×1.16) = 1000 × 6.8 = 6800

Instead of: 1000 × 2.16^5 = 23,553 (exponential)
```

### Benefits
1. **Predictable**: Linear scaling prevents exponential growth
2. **Balanced**: 5 components = 5× the effect, not component^5
3. **Intuitive**: Easy mental math (5 × 20% = 100% increase)
4. **Diminishing Returns**: Higher class ships get less benefit from components
5. **Cleaner UI**: Grouped components reduce clutter

### Migration Notes
When entering component values:
- Use 1.0 for no change
- Use values < 1.0 for reductions (0.9 = -10%)
- Use values > 1.0 for increases (1.1 = +10%)

### Files Modified
1. `js/app.js` - Core calculation and UI functions
2. `README/MULTIPLICATIVE-STATS-SYSTEM.md` - New documentation
3. `README/DOCUMENTATION-INDEX.md` - Documentation index update

### Testing
The system has been tested with:
- Single component modifications
- Multiple identical components (linear stacking verified)
- Different component types affecting same stat
- Class and tier scaling both working correctly
- Diminishing returns for higher ship classes verified
- UI grouping of identical components

### Key Formulas
- **Single component**: `base × multiplier`
- **Multiple identical**: `base × (1 + count × (multiplier - 1))`
- **Different components**: `base × (1 + Σ(multiplier - 1))` 