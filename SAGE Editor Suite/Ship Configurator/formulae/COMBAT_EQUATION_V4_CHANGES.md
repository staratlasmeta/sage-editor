# Combat Equation V4 Changes

## Summary
Combat Equation V4 implements ALL planned enhancements from the V3 roadmap plus new ship size mechanics and enhanced stealth. This is a comprehensive overhaul that aligns with the expected combat behavior from the Buzzec conversation.

## Major Changes from V3 to V4

### 1. **Cooldown System (V3 Roadmap)**
- Replaced AP-based actions with cooldown timers
- Default cooldown: 2 rounds between attacks
- Cooldowns tick down each round
- Attacks only allowed when cooldown <= 0 AND ammo available
- No forced action spending

### 2. **Alpha Shield Fix (V3 Roadmap)**
- Changed from shield boost to damage reduction
- Now applies ONLY to first incoming attack
- Reduction percentage based on tier level (0-40%)
- Tracked with `alphaShieldUsed` flag
- Proper implementation as per Buzzec specs

### 3. **Ammo Per Attack (V3 Roadmap)**
- Ammo now decrements per attack (not per round)
- Default: 1 ammo per attack
- Multi-attack ships consume ammo faster
- Combat continues until ammo depleted

### 4. **Simultaneous Attack Resolution (V3 Roadmap)**
- Both fleets can attack in the same round
- Attacks queued based on cooldowns
- All attacks resolve before checking deaths
- Enables mutual destruction scenarios

### 5. **Enhanced End Conditions (V3 Roadmap)**
- **Win**: One fleet destroyed
- **Mutual Destruction**: Both fleets die same round
- **Stalemate**: Both alive but both out of ammo
- **Timeout**: Safety limit at 1000 rounds
- Removed arbitrary 100-round limit

### 6. **Ship Size Hit/Miss Mechanics (New in V4)**
- Larger ships struggle to hit smaller targets
- Size difference affects base hit chance:
  - Same size: 85% base hit chance
  - Each size class larger: -6% hit chance
  - Each size class smaller: +3% hit chance
- Example: Titan vs XXS = 43% hit chance
- `aim_ability` stat reduces size penalties

### 7. **Enhanced Stealth Mechanics (New in V4)**
- First attack against stealthed target auto-misses
- After first dodge, stealth is "revealed" to attacker
- Subsequent attacks use normal dodge mechanics
- High scan power prevents initial auto-dodge
- Adds tactical first-strike advantage

### 8. **Alpha Tier System (New in V4)**
- Alpha Strike Tiers 0-4: 0%, 10%, 20%, 30%, 40% damage bonus
- Alpha Shield Tiers 0-4: 0%, 10%, 20%, 30%, 40% damage reduction
- Set via window variables:
  - `window.leftAlphaStrikeLevel`
  - `window.rightAlphaStrikeLevel`
  - `window.leftAlphaShieldLevel`
  - `window.rightAlphaShieldLevel`

### 9. **Combat Statistics Tracking**
- Tracks attacks, hits, and accuracy percentage
- Shows ammo consumption
- Displays cooldown states
- Records alpha effect usage
- Size-based miss reasons logged

### 10. **Configuration System**
```javascript
const config = {
    defaultAttackCooldown: 2,    // rounds
    cooldownTickPerRound: 1,
    alphaStrikeBonuses: [0, 10, 20, 30, 40],
    alphaShieldReductions: [0, 0.1, 0.2, 0.3, 0.4],
    ammoPerAttack: 1,
    maxRounds: 1000,
    minDamageFloor: 0.1
};
```

## Ship Size Implementation

### Size Mapping
```javascript
0: XXS, 1: XS, 2: Small, 3: Medium,
4: Large, 5: Capital, 6: Commander, 7: Titan
```

### Hit Chance Formula
```javascript
baseHitChance = 0.85
sizePenalty = max(0, attackerSize - defenderSize) * 0.06
sizeBonus = max(0, defenderSize - attackerSize) * 0.03
finalHitChance = baseHitChance - sizePenalty + sizeBonus
```

### Aim Ability
- Reduces size penalty when attacking smaller ships
- Formula: `penalty * (1 - aimAbility/100 * 0.5)`

## Combat Flow

### Round Structure
1. Increment round counter
2. Tick down all cooldown timers
3. Check ammo availability
4. Queue attacks for fleets with cooldown <= 0
5. Process attacks in order (first striker advantage)
6. Apply damage simultaneously
7. Check for deaths/end conditions
8. Regenerate shields
9. Check for stalemate

### Attack Resolution
1. Check cooldown and ammo
2. Calculate size-based hit chance
3. Check for first-strike stealth auto-dodge
4. Roll for hit based on size
5. Roll for normal dodge
6. Apply alpha strike (if first attack by initiator)
7. Calculate damage with RNG
8. Apply alpha shield (if first incoming attack)
9. Apply damage to shields/hull
10. Consume ammo and set cooldown

## Usage Example

```javascript
// Set combat parameters
window.combatFirstStriker = 'left';

// Set alpha tiers (0-4)
window.leftAlphaStrikeLevel = 2;    // Tier 2 = 20% bonus
window.leftAlphaShieldLevel = 1;    // Tier 1 = 10% reduction
window.rightAlphaStrikeLevel = 0;   // No bonus
window.rightAlphaShieldLevel = 3;   // Tier 3 = 30% reduction

// Set skill levels (0-4)
window.leftFlightSpeedLevel = 2;
window.leftManeuverabilityLevel = 3;

// Copy entire combat_equation_v4.js contents
// Paste into Ship Config Lite combat simulator
// Click FIGHT!
```

## Key Improvements

1. **Tactical Depth**: Cooldowns create meaningful timing decisions
2. **Ship Diversity**: Size matters - different roles for different classes
3. **Resource Management**: Ammo creates attrition warfare
4. **First Strike Advantage**: Stealth and alpha effects reward initiative
5. **Balanced Combat**: No forced actions, mutual destruction possible
6. **Clear Outcomes**: Stalemates when resources depleted

## Testing Checklist

- [x] Cooldowns prevent spam attacks
- [x] Alpha shield reduces damage (not boosts shields)
- [x] Ammo depletes per attack
- [x] Both fleets can attack same round
- [x] Mutual destruction detected
- [x] Stalemate on double ammo depletion
- [x] Titans miss XXS ships frequently
- [x] XXS ships hit Titans reliably
- [x] First stealth attack auto-dodges
- [x] Alpha tiers work correctly

## Migration Notes

- V4 maintains HTML output format compatibility
- All V3 stats still work
- New stats (aim_ability, hit_chance) optional
- Falls back gracefully if ship_size missing
- Window variables for configuration
