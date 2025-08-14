# Multiplicative Stats System

## Overview

The Ship Config Lite app now uses a **multiplicative** stat modification system instead of the previous additive system. This change makes component effects more intuitive and realistic, especially for percentage-based modifications.

## How It Works

### Previous Additive System
- Base stat + Component 1 value + Component 2 value = Final stat
- Example: 10 + 2 + 3 = 15

### New Linear Stacking System
- Base stat × (1 + sum of (multiplier - 1) for each component) = Final stat
- Single component: 10 × 1.2 = 12
- Multiple identical components: 10 × (1 + 5×0.2) = 10 × 2.0 = 20
- Different components: 10 × (1 + 0.2 + 0.1) = 10 × 1.3 = 13

## Component Values as Multipliers

Component stat values are now interpreted as multipliers:
- **1.0** = No change (100% of base value)
- **0.9** = 10% reduction (90% of base value)
- **1.1** = 10% increase (110% of base value)
- **0.5** = 50% reduction (50% of base value)
- **2.0** = 100% increase (200% of base value)

## Examples

### Example 1: Warp Cooldown Reduction
- Ship base `warp_cool_down`: 10 seconds
- Heat Sink component: 0.9 multiplier
- Result: 10 × 0.9 = 9 seconds (10% reduction)

### Example 2: Multiple Identical Components (Linear Stacking)
- Ship base `cargo_capacity`: 1000
- 5× Cargo Module: each 2.16 multiplier (+116%)
- Linear stacking: 1 + 5×(2.16-1) = 1 + 5×1.16 = 6.8
- Result: 1000 × 6.8 = 6800 cargo capacity

### Example 3: Different Components
- Ship base `shield_hp`: 1000
- Shield Booster: 1.2 multiplier (+20%)
- Energy Enhancer: 1.15 multiplier (+15%)
- Linear stacking: 1 + 0.2 + 0.15 = 1.35
- Result: 1000 × 1.35 = 1350 shield HP (35% total increase)

## Technical Implementation

### calculateModifiedStats Function
The core calculation logic is in `js/app.js`:
1. Collect all component effects for each stat
2. Group identical components together
3. Calculate total effect using linear stacking:
   - For each component type: count × (multiplier - 1)
   - Total multiplier = 1 + sum of all effects
4. Apply final multiplier to base stats

### Class Scaling Removed
- Only tier scaling formulas are used now
- Components scale based on tier only (e.g., T1 to T5)
- Simplifies the system and makes it more predictable

### Stat Modification Details
The tooltip system (`showStatModificationTooltip`) displays:
- Individual component multipliers
- Percentage change from 1.0
- Combined multiplier for all components
- Final calculated value

## Benefits of Linear Stacking System

1. **Predictable Scaling**: Multiple identical components stack linearly, not exponentially
2. **Better Balance**: Prevents extreme stat inflation from stacking many components
3. **Intuitive Math**: 5 components at +20% each = +100% total (not +149% as with multiplication)
4. **Clear Communication**: Easy to understand "5×(+20%) = +100%" in tooltips
5. **Simplified Formulas**: Only tier scaling, no complex class × tier calculations

## Migration Notes

When updating component data:
- Previous additive values need conversion to multipliers
- Example conversions:
  - Old: +5 speed → New: 1.05 (if base is 100)
  - Old: -10 cooldown → New: 0.9 (for 10% reduction)
  - Old: +50% damage → New: 1.5

## UI Updates

The stat modification tooltip now shows:
- Grouped components with counts (e.g., "Ammo Module (×5)")
- Linear stacking formula: Base × (1 + 5×0.16) = Result
- Only one base value input per component type
- Simplified formulas showing only tier scaling
- Clear breakdown of total effect from multiple components 