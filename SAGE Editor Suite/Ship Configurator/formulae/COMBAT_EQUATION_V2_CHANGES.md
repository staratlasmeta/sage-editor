# Combat Equation V2 - Balance Improvements

## Overview
The combat equation has been updated to better balance different ship archetypes, particularly addressing the imbalance between smaller, specialized ships vs larger, generalist ships.

## Key Changes

### 1. Ship Size Scaling Reduction
- **Old**: `Math.sqrt(ship_size_value)` - Square root scaling
- **New**: `Math.pow(ship_size_value, 0.25)` - Fourth root scaling
- **Impact**: Reduces the advantage of large ship_size_values from 71% to ~31% in the example case

### 2. Enhanced Speed Advantage
- **Old**: `1 + Math.max(0, speed_diff) / 100` - Linear difference
- **New**: Logarithmic ratio-based calculation
  ```javascript
  let speedRatio = leftSpeed / rightSpeed;
  let advantage = speedRatio > 1 ? 1 + Math.log(speedRatio) * 0.2 : 1;
  ```
- **Impact**: A 3.7x speed advantage now provides ~27% combat bonus instead of 0.27%

### 3. Damage Type Diversity Bonus
- **New Feature**: Ships with multiple damage types get a 5% bonus per additional type
- **Formula**: `1 + Math.max(0, damageTypes - 1) * 0.05`
- **Impact**: Rewards specialized configurations over single-damage builds

### 4. Scan Power Integration
- **New Feature**: Scan power now affects targeting accuracy
- **Formula**: `1 + Math.log10(1 + scan_power) / 30`
- **Impact**: High scan power ships get up to ~10% accuracy bonus

### 5. Loading Rate Impact
- **New Feature**: Loading rate affects sustained DPS
- **Formula**: `1 + loading_rate / 200`
- **Impact**: Fast-loading ships get a reload speed advantage

### 6. Enhanced Repair System
- **Old**: Only used repair_rate * repair_efficiency
- **New**: Includes repair_ability stat
- **Formula**: `repair_rate * repair_efficiency * (1 + repair_ability/100)`

## Balance Test Case

### Fimbul Tier Five vs Fimbul Default
With the old equation, the Default ship would likely win due to:
- 3x ship_size_value advantage
- Higher base damage (87 vs 38 total)
- More HP/shields

With the new equation, the Tier Five ship is more competitive due to:
- Reduced ship size scaling impact
- Significant speed advantage bonus
- Damage diversity bonus (3 types vs 1)
- Superior scan power bonus
- Better crit potential

## Design Philosophy
The changes aim to create more diverse viable strategies:
- **Speed Builds**: Fast ships can now leverage mobility effectively
- **Specialized Damage**: Multiple damage types provide tactical advantages
- **Tech Superiority**: High scan power and advanced systems matter
- **Size vs Agility**: Large ships still have advantages but aren't overwhelming

## Future Considerations
- Monitor combat outcomes to ensure no single strategy dominates
- Consider adding more nuanced counter-play mechanics
- Potentially add terrain/environmental factors
- Implement fleet composition bonuses for mixed ship types 