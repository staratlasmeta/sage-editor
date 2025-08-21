# Ship Size Combat Mechanics Design

## Ship Size Classes

```
Index | Class      | Characteristics
------|------------|------------------------------------------
0     | XXS        | Extremely small, highly maneuverable
1     | XS         | Very small, agile
2     | Small      | Small, nimble
3     | Medium     | Balanced size and agility
4     | Large      | Larger, less maneuverable
5     | Capital    | Very large, slow
6     | Commander  | Massive command ships
7     | Titan      | Enormous, practically stationary targets
```

## Hit Probability Matrix

### Base Hit Chances (Before Modifiers)

| Attacker → | XXS   | XS    | Small | Medium | Large | Capital | Commander | Titan |
|------------|-------|-------|-------|--------|-------|---------|-----------|--------|
| **XXS**    | 85%   | 87%   | 90%   | 92%    | 95%   | 97%     | 99%       | 100%   |
| **XS**     | 83%   | 85%   | 87%   | 90%    | 92%   | 95%     | 97%       | 99%    |
| **Small**  | 80%   | 83%   | 85%   | 87%    | 90%   | 92%     | 95%       | 97%    |
| **Medium** | 77%   | 80%   | 83%   | 85%    | 87%   | 90%     | 92%       | 95%    |
| **Large**  | 74%   | 77%   | 80%   | 83%    | 85%   | 87%     | 90%       | 92%    |
| **Capital**| 70%   | 74%   | 77%   | 80%    | 83%   | 85%     | 87%       | 90%    |
| **Commander**| 66% | 70%   | 74%   | 77%    | 80%   | 83%     | 85%       | 87%    |
| **Titan**  | 61%   | 66%   | 70%   | 74%    | 77%   | 80%     | 83%       | 85%    |

## Hit Chance Formula

```javascript
function calculateSizeBasedHitChance(attackerSize, defenderSize) {
    // Base hit chance
    const baseHitChance = 0.85; // 85% base
    
    // Size difference (positive = attacker is larger)
    const sizeDifference = attackerSize - defenderSize;
    
    // Penalty for attacking smaller targets
    // Each size class difference = -6% hit chance when attacking down
    // No penalty when attacking same size or larger
    const sizePenalty = Math.max(0, sizeDifference) * 0.06;
    
    // Bonus for attacking larger targets
    // Each size class difference = +3% hit chance when attacking up
    const sizeBonus = Math.max(0, -sizeDifference) * 0.03;
    
    // Final hit chance
    const hitChance = baseHitChance - sizePenalty + sizeBonus;
    
    // Clamp between 5% and 100%
    return Math.max(0.05, Math.min(1.0, hitChance));
}
```

## Modifiers

### Aim Ability
- Reduces size penalty when attacking smaller targets
- Formula: `sizePenalty * (1 - aimAbility/100)`
- Example: 50 aim ability = 50% reduction in size penalty

### Hit Chance Stat
- Multiplicative modifier on final hit chance
- Formula: `finalHitChance * hitChanceStat`
- Default value: 1.0

### Speed-Based Evasion
- Smaller ships get additional dodge from speed
- Already implemented in v3 as dodge chance
- Stacks with size-based miss chance

## Example Calculations

### Titan vs XXS
- Size difference: 7 - 0 = 7
- Size penalty: 7 * 0.06 = 0.42 (42%)
- Base hit chance: 85% - 42% = 43%
- **Result**: 43% hit chance (57% miss)

### XXS vs Titan
- Size difference: 0 - 7 = -7
- Size bonus: 7 * 0.03 = 0.21 (21%)
- Base hit chance: 85% + 21% = 106% → 100%
- **Result**: 100% hit chance (0% miss)

### Medium vs Medium
- Size difference: 3 - 3 = 0
- No penalty or bonus
- **Result**: 85% hit chance (15% miss)

## Implementation Notes

1. **Ship Size Detection**
   - Use `ship_size` stat if available
   - Otherwise derive from ship class/name
   - Default to Medium (3) if unknown

2. **Combat Log**
   - Log size-based hit calculations
   - Show "MISSED due to size!" for size-based misses
   - Track hit/miss statistics

3. **Balance Considerations**
   - Titans remain powerful due to high HP/damage
   - XXS ships gain survivability through evasion
   - Medium ships are versatile (balanced hit rates)
   - Encourages mixed fleet compositions

## Stealth Enhancement Details

### First Strike Stealth Mechanics

1. **Initial State**
   - Each fleet tracks if opponent's stealth has been "revealed"
   - Stealthed ships start with `stealthRevealed = false`

2. **First Attack Resolution**
   ```javascript
   if (!attackerSeesDefender && defenderHasStealth && !scannerBreaksstealth) {
       // Auto-miss on first attack
       log.push(`${defender} stealth field deflects initial attack!`);
       attackerSeesDefender = true; // Mark as revealed
       continue; // Skip to next attack
   }
   ```

3. **Subsequent Attacks**
   - Use normal dodge calculations
   - Stealth still provides dodge bonus
   - But no more guaranteed misses

4. **Scanner Interaction**
   - High scan power can "see through" stealth
   - If `scanPower >= stealthPower`, no auto-miss
   - Logged as "Scanners locked on target despite stealth"

## UI Toggle Specifications

### Combat Simulator Enhancements

```javascript
// New UI elements in combat simulator
<div class="alpha-controls">
    <div class="left-fleet-alphas">
        <label>Left Alpha Strike: 
            <select id="left-alpha-strike-tier">
                <option value="0">Tier 0 (0%)</option>
                <option value="1">Tier 1 (10%)</option>
                <option value="2">Tier 2 (20%)</option>
                <option value="3">Tier 3 (30%)</option>
                <option value="4">Tier 4 (40%)</option>
            </select>
        </label>
        <label>Left Alpha Shield:
            <select id="left-alpha-shield-tier">
                <option value="0">Tier 0 (0%)</option>
                <option value="1">Tier 1 (10%)</option>
                <option value="2">Tier 2 (20%)</option>
                <option value="3">Tier 3 (30%)</option>
                <option value="4">Tier 4 (40%)</option>
            </select>
        </label>
    </div>
    // Similar for right fleet
</div>
```

### Setting Window Variables

```javascript
// When running combat simulation
function prepareCombatParameters() {
    // Get tier selections from UI
    window.leftAlphaStrikeLevel = parseInt(document.getElementById('left-alpha-strike-tier').value);
    window.leftAlphaShieldLevel = parseInt(document.getElementById('left-alpha-shield-tier').value);
    window.rightAlphaStrikeLevel = parseInt(document.getElementById('right-alpha-strike-tier').value);
    window.rightAlphaShieldLevel = parseInt(document.getElementById('right-alpha-shield-tier').value);
    
    // These will be read by combat_equation_v4.js
}
```
