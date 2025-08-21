# Combat Equation V4 Enhancement Plan

## Overview
Combat Equation V4 will add ship size-based hit/miss mechanics and enhanced stealth mechanics, building on the turn-based system from V3.

## Key Enhancements

### 1. Ship Size Hit/Miss Mechanics

**Concept**: Larger ships have difficulty hitting smaller, more agile targets. Smaller ships can easily target larger ships.

**Implementation Plan**:
```javascript
// Size difference calculation
let sizeDifference = attackerSize - defenderSize;

// Base hit chance based on size difference
// Positive difference = attacker is larger (harder to hit smaller target)
// Negative difference = attacker is smaller (easier to hit larger target)
let sizeHitModifier = 1 / (1 + Math.max(0, sizeDifference * 0.15));

// Examples:
// Titan (7) vs XXS (0): sizeDiff = 7, modifier = 0.49 (51% miss chance)
// XXS (0) vs Titan (7): sizeDiff = -7, modifier = 1.0 (no penalty)
// Medium (3) vs Small (2): sizeDiff = 1, modifier = 0.87 (13% miss chance)
```

**Available Stats to Use**:
- `ship_size` or `ship_size_value` - for size comparison
- `hit_chance` - base hit chance stat
- `aim_ability` - can offset size penalties

**Size Index Mapping**:
```javascript
const shipSizeIndex = {
    'XXS': 0,
    'XS': 1,
    'Small': 2,
    'Medium': 3,
    'Large': 4,
    'Capital': 5,
    'Commander': 6,
    'Titan': 7
};
```

### 2. Enhanced Stealth Mechanics

**Current V3 Behavior**:
- Stealth provides dodge chance if not broken by scanners
- Dodge is checked for each attack

**V4 Enhancement**:
- First attack against stealthed target automatically misses (100% dodge)
- After first dodge, stealth is "revealed" for that attacker
- Subsequent attacks use normal stealth dodge mechanics
- High scan power can prevent initial auto-dodge

**Implementation Plan**:
```javascript
// Track stealth state per fleet
let leftStealthRevealed = false;
let rightStealthRevealed = false;

// On first attack against stealthed target
if (!attackerStealthRevealed && defenderHasStealth && !stealthBroken) {
    // Auto-dodge first attack
    log.push(`${defender} stealth active - first attack auto-dodged!`);
    attackerStealthRevealed = true;
    continue; // Skip damage calculation
}
```

### 3. Combat Flow Changes

**Attack Resolution Order**:
1. Check if attack can proceed (ammo, cooldown)
2. **NEW**: Calculate size-based hit chance
3. **NEW**: Check for first-strike stealth auto-dodge
4. Roll for hit/miss based on combined factors
5. If hit, calculate and apply damage

**Hit Chance Calculation**:
```javascript
function calculateHitChance(attacker, defender, isFirstAttack) {
    let baseHitChance = 1.0;
    
    // Size difference modifier
    let sizeDiff = (attacker.ship_size || 3) - (defender.ship_size || 3);
    let sizeModifier = 1 / (1 + Math.max(0, sizeDiff * 0.15));
    
    // Aim ability bonus (reduces size penalty)
    let aimBonus = 1 + (attacker.aim_ability || 0) / 100;
    
    // Hit chance stat (if available)
    let hitChanceStat = attacker.hit_chance || 1;
    
    // Stealth dodge (existing mechanic)
    let dodgeChance = defender.dodgeChance || 0;
    
    // First attack stealth auto-dodge
    if (isFirstAttack && defender.hasActivestealth) {
        return 0; // 0% hit chance
    }
    
    // Combined hit chance
    let finalHitChance = baseHitChance * sizeModifier * aimBonus * hitChanceStat * (1 - dodgeChance);
    
    return Math.max(0.05, Math.min(0.95, finalHitChance)); // 5-95% bounds
}
```

## UI Enhancement Plan

### Alpha Strike/Shield Tier Toggles

Add controls to the combat simulator UI for setting:
- Left Fleet: Alpha Strike Tier (0-4), Alpha Shield Tier (0-4)
- Right Fleet: Alpha Strike Tier (0-4), Alpha Shield Tier (0-4)

**Tier Bonuses**:
```javascript
// Alpha Strike: % damage bonus on first attack
const alphaStrikeBonuses = [0, 10, 20, 30, 40]; // Tiers 0-4

// Alpha Shield: % damage reduction on first incoming attack
const alphaShieldReductions = [0, 0.1, 0.2, 0.3, 0.4]; // Tiers 0-4
```

**Window Variables to Set**:
```javascript
// Set by UI before combat
window.leftAlphaStrikeLevel = 2; // Tier 2
window.rightAlphaShieldLevel = 3; // Tier 3

// In combat equation v4
let leftAlphaStrikeBonus = alphaStrikeBonuses[window.leftAlphaStrikeLevel || 0];
let rightAlphaShieldReduction = alphaShieldReductions[window.rightAlphaShieldLevel || 0];
```

## Testing Scenarios

### Size-Based Combat
1. **Titan vs XXS**: Titan should miss frequently (40-50% hit rate)
2. **XXS vs Titan**: XXS should hit reliably (90-95% hit rate)
3. **Similar Sizes**: Minimal hit penalty (85-95% hit rate)

### Stealth Mechanics
1. **First Strike Stealth**: First attack auto-misses if stealth active
2. **Scanner Override**: High scan power prevents auto-dodge
3. **Revealed Stealth**: After first dodge, normal dodge mechanics apply

### Alpha Tiers
1. **Tier 0**: No bonuses
2. **Tier 4**: Maximum bonuses (40% strike, 40% shield)
3. **Mixed Tiers**: Various combinations work correctly

## Implementation Steps

1. Create `combat_equation_v4.js` based on v3
2. Add ship size hit/miss calculations
3. Enhance stealth for first-strike auto-dodge
4. Update damage calculation flow
5. Add comprehensive logging
6. Test with various ship matchups
7. Update combat simulator UI for alpha tiers

## Backward Compatibility

- V4 will maintain the same HTML output format
- All v3 mechanics remain, with additions only
- Window variables for configuration
- Falls back gracefully if new stats missing
