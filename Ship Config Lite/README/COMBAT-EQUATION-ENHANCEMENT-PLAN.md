# Combat Equation Enhancement Plan

## How It Actually Works

After deeper investigation, here's how the combat system actually functions in Ship Config Lite:

1. **Combat Simulator** (`js/combat-simulator-v2.js`): 
   - Provides a UI for building fleets
   - Has a formula editor where users paste JavaScript code
   - Executes the formula with `left` and `right` fleet stats
   - Displays results (can handle HTML output)

2. **Combat Equation** (`combat_equation.js`):
   - A self-executing JavaScript function
   - Users copy/paste the ENTIRE file contents into the formula editor
   - It runs the combat simulation and returns HTML results
   - The simulator detects HTML output and displays it properly

## Key Insight

**YES - We only need to modify `combat_equation.js` to implement all the enhancements!**

The combat simulator is just the execution environment. All combat logic, mechanics, and rules are contained within the combat equation that gets pasted into it.

## Current Combat Equation Structure

```javascript
(function() {
    // Initialize battle log
    let log = [];
    
    // Get parameters from window (if set)
    let firstStriker = window.combatFirstStriker || 'left';
    
    // Run combat simulation...
    
    // Return HTML formatted results
    return htmlResult;
})()
```

## What Needs to Change

All changes will be made to `combat_equation.js`:

### 1. Cooldown System
Replace the current AP-based action system:
```javascript
// Current
let leftActionsPerRound = Math.floor(leftMaxAP);

// New
let leftCooldownTimer = 0;
let leftAttackCooldown = 2; // rounds
```

### 2. Alpha Shield Fix
Change from shield boost to damage reduction:
```javascript
// Current
if (firstStriker === 'right') {
    leftShields *= (1 + leftAlphaShieldBonus / 100);
}

// New - apply during damage calculation
if (!defenderAlphaShieldUsed && isFirstAttackOnDefender) {
    damage *= (1 - defenderAlphaShieldBonus / 100);
    defenderAlphaShieldUsed = true;
}
```

### 3. Ammo Per Attack
Track ammo consumption per attack:
```javascript
// Current
let leftMaxRounds = Math.floor(leftAmmoCapacity / 10);
leftCanFire = round <= leftMaxRounds;

// New
let leftAmmo = leftAmmoCapacity;
if (leftAmmo > 0) {
    leftAmmo -= ammoPerAttack;
    // process attack
}
```

### 4. Simultaneous Actions
Process both fleets in same round:
```javascript
// New approach
let attacks = [];
if (leftCanAttack) attacks.push({attacker: 'left', target: 'right'});
if (rightCanAttack) attacks.push({attacker: 'right', target: 'left'});

// Resolve all attacks before checking deaths
for (let attack of attacks) {
    // process attack
}
```

### 5. End Conditions
Add proper detection:
```javascript
// After combat round
if (leftCurrentHP <= 0 && rightCurrentHP <= 0) {
    result = "MUTUAL DESTRUCTION";
} else if (leftCurrentHP > 0 && rightCurrentHP > 0 && 
           leftAmmo === 0 && rightAmmo === 0) {
    result = "STALEMATE - BOTH OUT OF AMMO";
}
```

## Implementation Strategy

### Phase 1: Create Enhanced Combat Equation
1. Copy current `combat_equation.js` to `combat_equation_v3.js`
2. Implement all mechanics changes
3. Maintain the same HTML output format
4. Test with various scenarios

### Phase 2: Parameter Configuration
Add configuration variables at the top:
```javascript
// Combat configuration
const config = {
    cooldownTurns: 2,
    ammoPerAttack: 1,
    alphaStrikeLevels: [1.0, 1.1, 1.2, 1.3, 1.4],
    alphaShieldLevels: [0.0, 0.1, 0.2, 0.3, 0.4],
    enableSimultaneous: true,
    maxRounds: 1000
};
```

### Phase 3: Enhanced Logging
Improve battle log to show:
- Cooldown states
- Ammo consumption
- Alpha effect applications
- Simultaneous attack resolution

## Usage After Enhancement

Users will:
1. Copy the entire enhanced `combat_equation.js` file
2. Paste it into the combat simulator formula field
3. Click "FIGHT!" to run the simulation
4. See detailed HTML results with proper mechanics

## Benefits of This Approach

1. **No app changes needed** - Just update the equation file
2. **Easy to test** - Can have multiple versions of combat equations
3. **User flexibility** - Advanced users can modify their own equations
4. **Backward compatible** - Old equations still work

## Testing Plan

Create test scenarios by setting window variables before the combat equation:
```javascript
// Test mutual destruction
window.combatFirstStriker = 'left';
window.leftDamage = 1000;
window.rightDamage = 1000;
window.leftHP = 100;
window.rightHP = 100;

// Then paste combat equation
```

## Next Steps

1. Create `combat_equation_v3.js` with all enhancements
2. Test each mechanic individually
3. Create a test suite of scenarios
4. Document usage for users
5. Consider making a "combat equation builder" UI later
