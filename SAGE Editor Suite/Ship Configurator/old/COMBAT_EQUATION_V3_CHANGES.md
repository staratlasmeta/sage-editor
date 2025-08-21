# Combat Equation V3 Changes

## Summary
Combat Equation V3 implements a turn-based combat system with explicit damage/counter matching, stealth mechanics, and removal of general RNG in favor of damage range randomness only.

## Major Changes from V2 to V3

### 1. **Removed General Luck Factor**
- Removed the general "luck factor" (0.95-1.05 multiplier)
- RNG is now limited to damage_range only, applied when rolling damage

### 2. **Explicit Damage/Counter Matching**
- Countermeasures now directly absorb damage of their matching type
- Example: graygoo damage is absorbed by healing_nanobots counter
- Direct absorption model: `effectiveDamage = damage - min(damage, counterValue)`
- Detailed logging shows absorption for each damage type

### 3. **Ammo Capacity System**
- Ships can only fire for a limited number of rounds based on ammo_capacity
- Assumes 10 ammo per attack
- Combat continues but ships stop dealing damage when out of ammo

### 4. **Stealth and Scanner Mechanics**
- Stealth provides dodge chance if not broken by enemy scanners
- Scanner power must exceed stealth power to break stealth
- Unbroken stealth provides up to 50% dodge chance
- Ships with active stealth can dodge incoming attacks

### 5. **Missile Power System**
- missile_power multiplies bomb damage
- Capped by missile_capacity (capacity/100 as maximum multiplier)
- Only affects bomb-type damage

### 6. **Alpha Strike System**
- Added first striker parameter (`window.combatFirstStriker`)
- First attacker gets alpha strike damage bonus on first attack
- Defender gets alpha shield bonus when defending first
- Placeholders for player-unlocked bonuses:
  - `leftAlphaStrikeBonus` / `rightAlphaStrikeBonus` (percent damage bonus)
  - `leftAlphaShieldBonus` / `rightAlphaShieldBonus` (percent shield bonus)

### 7. **Turn-Based Action Points**
- Action points now determine number of attacks per round
- Each AP = 1 attack per round (floor value)
- No longer affects attack speed
- Traditional turn-based tactical combat flow

### 8. **Fixed Defense Values**
- Removed all RNG from HP, shields, and shield regeneration
- Shield regen is predictable based on stats
- Only damage has RNG through damage_range

### 9. **Removed Loading Rate**
- Loading rate no longer factors into combat calculations
- Removed loadingBonus multiplier

### 10. **Flight Speed and Maneuverability Skills**
- Added skill level placeholders (0-4 levels each):
  - Flight Speed: 10% speed boost per level
  - Maneuverability: 5% dodge chance per level
- Skills affect:
  - Flight speed multiplies sub/warp speeds
  - Maneuverability adds to total dodge chance
  - Speed contributes to dodge (logarithmic scaling)

### 11. **Removed Fleet Size Diminishing Returns**
- Removed fourth root scaling of ship_size_value
- Fleet size effects should be handled in ship stats

## Combat Flow Changes

### Turn Structure
1. Determine first striker
2. Apply alpha bonuses (strike/shield)
3. Each round:
   - First striker's fleet attacks (multiple actions based on AP)
   - Second fleet attacks (multiple actions based on AP)
   - Shield regeneration occurs
   - Check for victory conditions

### Damage Calculation
1. Base damage values (no RNG)
2. Apply missile boost to bomb damage
3. Roll damage with damage_range RNG
4. Apply alpha strike bonus (first attack only)
5. Check for dodge (stealth/speed/maneuverability)
6. Apply countermeasures (direct absorption)
7. Apply diversity bonus
8. Deal damage to shields then hull

### Victory Conditions
- One fleet reduced to 0 HP
- Timeout after 100 rounds (winner = most HP remaining)
- Draw if equal HP at timeout

## Usage

To use the new combat equation with custom parameters:

```javascript
// Set first striker
window.combatFirstStriker = 'left'; // or 'right'

// Set alpha bonuses (percent values)
window.leftAlphaStrikeBonus = 10; // 10% damage bonus
window.rightAlphaShieldBonus = 15; // 15% shield bonus

// Set skill levels (0-4)
window.leftFlightSpeedLevel = 2;
window.leftManeuverabilityLevel = 3;

// Run combat simulation
// (combat equation will use these values)
``` 