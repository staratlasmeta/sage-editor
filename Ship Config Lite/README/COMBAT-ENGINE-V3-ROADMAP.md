# Combat Engine V3 Enhancement Roadmap

## Overview
This document outlines the specific enhancements needed to align the combat simulator with the expected combat flow behavior from the Buzzec conversation.

## Current State vs Target State

### Combat Initiation
| Feature | Current Implementation | Target Implementation |
|---------|----------------------|---------------------|
| First Strike | Determined by parameter, applies to round 1 | Based on who initiates combat |
| Alpha Strike | % bonus on first attack of first striker | Applies to initiator's first attack only |
| Alpha Shield | % shield boost at battle start | % damage reduction on first incoming attack |

### Turn System
| Feature | Current Implementation | Target Implementation |
|---------|----------------------|---------------------|
| Turn Order | Sequential based on first striker | Can be simultaneous within rounds |
| Actions/Round | Based on AP (forced spending) | Based on cooldown timers |
| Attack Timing | All AP spent each round | Only when cooldown expired |

### Resource Management
| Feature | Current Implementation | Target Implementation |
|---------|----------------------|---------------------|
| Ammo System | Capacity/10 = max rounds | Decrements per attack |
| Ammo Gating | Prevents attacks after X rounds | Prevents individual attacks |
| Cooldowns | Not implemented | Per-fleet attack cooldown timers |

### Combat Resolution
| Feature | Current Implementation | Target Implementation |
|---------|----------------------|---------------------|
| End Conditions | Win or 100-round timeout | Win, mutual destruction, or stalemate |
| Mutual Destruction | Not detected | Both die in same round = draw |
| Stalemate | Timeout compares HP | Both alive + both out of ammo |

## Code Changes Required

### 1. Combat State Structure
```javascript
// Add to fleet state
fleetState = {
  // Existing
  hp: number,
  shields: number,
  
  // New additions
  ammo: number,
  attackCooldown: number,      // Base cooldown duration
  cooldownTimer: number,       // Current cooldown remaining
  
  // Alpha effect tracking
  isInitiator: boolean,
  firstAttackUsed: boolean,    // Has this fleet used its first attack?
  alphaShieldAvailable: boolean // Can still use alpha shield?
}
```

### 2. Round Processing Logic
```javascript
// Pseudo-code for new round processing
function processRound(leftFleet, rightFleet, round) {
  // 1. Tick cooldowns
  leftFleet.cooldownTimer = Math.max(0, leftFleet.cooldownTimer - 1);
  rightFleet.cooldownTimer = Math.max(0, rightFleet.cooldownTimer - 1);
  
  // 2. Determine who can act
  const leftCanAct = leftFleet.cooldownTimer <= 0 && leftFleet.ammo > 0;
  const rightCanAct = rightFleet.cooldownTimer <= 0 && rightFleet.ammo > 0;
  
  // 3. Process attacks (simultaneous resolution)
  const attacks = [];
  if (leftCanAct) attacks.push({attacker: 'left', target: 'right'});
  if (rightCanAct) attacks.push({attacker: 'right', target: 'left'});
  
  // 4. Resolve all attacks
  for (const attack of attacks) {
    resolveAttack(attack, leftFleet, rightFleet);
  }
  
  // 5. Check end conditions
  return checkEndConditions(leftFleet, rightFleet);
}
```

### 3. Alpha Effects Implementation
```javascript
function calculateDamage(attacker, defender, baseAmount) {
  let damage = baseAmount;
  
  // Apply alpha strike if first attack by initiator
  if (attacker.isInitiator && !attacker.firstAttackUsed) {
    damage *= (1 + attacker.alphaStrikeBonus);
    attacker.firstAttackUsed = true;
    log.push(`${attacker.name} Alpha Strike! +${attacker.alphaStrikeBonus * 100}%`);
  }
  
  // Apply alpha shield if defender hasn't used it
  if (defender.alphaShieldAvailable && !defender.firstAttackReceived) {
    damage *= (1 - defender.alphaShieldReduction);
    defender.alphaShieldAvailable = false;
    log.push(`${defender.name} Alpha Shield! -${defender.alphaShieldReduction * 100}%`);
  }
  
  return damage;
}
```

### 4. End Condition Checks
```javascript
function checkEndConditions(leftFleet, rightFleet) {
  const leftAlive = leftFleet.hp > 0;
  const rightAlive = rightFleet.hp > 0;
  const leftHasAmmo = leftFleet.ammo > 0;
  const rightHasAmmo = rightFleet.ammo > 0;
  
  // Check for deaths
  if (!leftAlive && !rightAlive) {
    return { result: 'MUTUAL_DESTRUCTION', winner: null };
  }
  if (!leftAlive) {
    return { result: 'WIN', winner: 'right' };
  }
  if (!rightAlive) {
    return { result: 'WIN', winner: 'left' };
  }
  
  // Check for stalemate (both alive but can't attack)
  if (!leftHasAmmo && !rightHasAmmo) {
    return { result: 'STALEMATE', winner: null };
  }
  
  // Battle continues
  return { result: 'CONTINUE', winner: null };
}
```

## Implementation Phases

### Phase 1: Core Mechanics (Week 1)
- [ ] Create new combat-engine-v3.js file
- [ ] Implement cooldown system
- [ ] Fix alpha shield to be damage reduction
- [ ] Update ammo to per-attack consumption

### Phase 2: Turn Resolution (Week 2)
- [ ] Implement simultaneous attack resolution
- [ ] Add mutual destruction detection
- [ ] Implement stalemate conditions
- [ ] Remove forced AP spending

### Phase 3: Integration (Week 3)
- [ ] Update combat_equation.js with new mechanics
- [ ] Maintain HTML output format
- [ ] Add configuration parameters
- [ ] Create toggle for engine version

### Phase 4: Testing & Polish (Week 4)
- [ ] Implement all acceptance tests
- [ ] Balance default parameters
- [ ] Update documentation
- [ ] Create migration guide

## Configuration Parameters

```javascript
const combatConfig = {
  // Cooldown settings
  defaultAttackCooldown: 2,    // rounds
  cooldownTickPerRound: 1,
  
  // Alpha bonuses (by level 0-4)
  alphaStrikeMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4],
  alphaShieldReductions: [0.0, 0.1, 0.2, 0.3, 0.4],
  
  // Ammo
  ammoPerAttack: 1,
  
  // Safety
  maxRounds: 1000,
  
  // Balance
  minDamageFloor: 1,
  defaultHP: 100,
  defaultDamage: 20
};
```

## Testing Checklist

- [ ] Alpha effects apply only once
- [ ] Cooldowns prevent attacks correctly
- [ ] Both fleets can attack in same round
- [ ] Mutual destruction is detected
- [ ] Stalemate on ammo depletion works
- [ ] No forced AP spending
- [ ] One-shot kills possible but not default
- [ ] Combat log tracks all effects
- [ ] HTML output remains compatible

## Backward Compatibility

1. Keep existing combat_equation.js functional
2. Add parameter to choose engine version
3. Both engines produce same HTML output format
4. Gradual migration path for users

## UI Enhancements

### Combat Results Display
- Show cooldown states
- Display ammo consumption
- Highlight alpha effect usage
- Add timeline visualization

### Configuration Panel
- Engine version toggle
- Cooldown parameter sliders
- Alpha bonus configuration
- Balance preset selection

## Performance Considerations

- Limit combat log size for long battles
- Efficient cooldown calculations
- Minimize state mutations
- Use object pooling for attack events

## Future Enhancements

1. **Skill System Expansion**
   - More skill types
   - Skill synergies
   - Passive effects

2. **Advanced Mechanics**
   - Range/positioning
   - Target prioritization
   - Special abilities

3. **Fleet Formations**
   - Formation bonuses
   - Flanking mechanics
   - Support ship roles
