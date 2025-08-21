# Combat Mechanics Quick Reference

## Current vs Expected Behavior

### 🎯 Alpha Effects
**Current:**
- Alpha Strike: +X% damage on round 1, action 0, for first striker only
- Alpha Shield: +X% shield points at battle start for defender

**Expected:**
- Alpha Strike: +X% damage on initiator's first attack only (one-time use)
- Alpha Shield: -X% damage reduction on first incoming attack only (one-time use)

### ⏱️ Turn System
**Current:**
- AP determines actions per round
- Must use all available AP each round
- Strict alternating turns

**Expected:**
- Cooldown timers gate attacks
- Attack only when cooldown <= 0
- Both can act in same round

### 🔫 Ammo System
**Current:**
```javascript
maxRounds = Math.floor(ammoCapacity / 10);
canFire = currentRound <= maxRounds;
```

**Expected:**
```javascript
canAttack = ammo > 0 && cooldownTimer <= 0;
onAttack: ammo -= ammoPerAttack;
```

### 🏁 End Conditions
**Current:**
1. One fleet HP <= 0 → Other wins
2. 100 rounds → Compare HP

**Expected:**
1. One fleet HP <= 0 → Other wins
2. Both HP <= 0 same round → Mutual destruction
3. Both alive, both ammo = 0 → Stalemate

## Key Implementation Notes

### Round Processing Order
1. Tick all cooldown timers down
2. Check who can attack (cooldown ready + has ammo)
3. Process all valid attacks simultaneously
4. Apply damage and effects
5. Check for deaths/end conditions
6. Apply end-of-round effects (shield regen, etc.)

### Alpha Effect Rules
- **Initiator** = whoever starts the combat (parameter)
- **First Attack** = first successful attack attempt
- Each alpha effect can only be used ONCE per battle
- Track with boolean flags: `firstAttackUsed`, `alphaShieldUsed`

### Damage Pipeline (First Attack)
1. Calculate base damage
2. IF attacker is initiator AND first attack → Apply alpha strike multiplier
3. IF defender has alpha shield available → Apply alpha shield reduction
4. Apply other modifiers (diversity, etc.)
5. Clamp to minimum if needed

### Stalemate Detection
```javascript
if (leftHP > 0 && rightHP > 0 && leftAmmo === 0 && rightAmmo === 0) {
  return 'STALEMATE';
}
```

## Combat State Tracking

### Per-Fleet State
```javascript
{
  // Combat stats
  hp: number,
  shields: number,
  
  // Resources
  ammo: number,
  
  // Cooldowns
  attackCooldown: number,      // Base cooldown (e.g., 2 rounds)
  cooldownTimer: number,       // Current timer (counts down)
  
  // Alpha tracking
  isInitiator: boolean,        // Is this fleet the initiator?
  firstAttackUsed: boolean,    // Has used first attack?
  alphaShieldUsed: boolean,    // Has used alpha shield?
  
  // Skills
  alphaStrikeLevel: 0-4,
  alphaShieldLevel: 0-4
}
```

### Global Combat State
```javascript
{
  round: number,
  combatLog: Array,
  initiatorFleet: 'left' | 'right',
  battleResult: null | 'WIN' | 'MUTUAL_DESTRUCTION' | 'STALEMATE'
}
```

## Test Scenarios

### Scenario 1: Alpha One-Time
- A attacks with alpha strike → +damage
- A attacks again → no bonus
- B defends first attack → alpha shield reduces damage
- B defends second attack → no reduction

### Scenario 2: Cooldown Blocking
- Fleet has ammo but cooldown = 1
- Cannot attack this round
- Next round cooldown = 0, can attack

### Scenario 3: Simultaneous Combat
- Both fleets have cooldown = 0
- Both attack in same round
- Damage resolves simultaneously
- Could result in mutual destruction

### Scenario 4: Ammo Stalemate
- Both fleets alive
- Both run out of ammo
- Battle ends in stalemate

## Common Pitfalls to Avoid

1. **Don't apply alpha shield as HP/shield boost** - it's damage reduction
2. **Don't force AP spending** - respect cooldowns
3. **Don't skip mutual destruction check** - both can die together
4. **Don't use rounds for ammo** - track per attack
5. **Don't make turns strictly sequential** - allow simultaneity

## Balance Guidelines

- Default configs should rarely one-shot
- Cooldowns create tactical pacing
- Ammo limits prevent infinite battles
- Alpha effects reward initiative without guaranteeing victory
- Stalemates are valid outcomes for evenly matched fleets
