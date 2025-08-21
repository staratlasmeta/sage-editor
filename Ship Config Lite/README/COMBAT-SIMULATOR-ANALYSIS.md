# Combat Simulator Analysis & Enhancement Plan

## Current Implementation Overview

The Ship Config Lite app uses a flexible combat simulation system:

1. **Combat Simulator V2** (`js/combat-simulator-v2.js`): 
   - Provides UI for building fleets from ships in the comparison table
   - Each fleet's stats are aggregated (summed) 
   - Has a formula editor where users can write or paste JavaScript code
   - Executes formulas with `left` and `right` fleet stats as parameters
   - Can display simple results or HTML-formatted output

2. **Combat Equation** (`combat_equation.js`):
   - A self-executing JavaScript function that implements detailed combat mechanics
   - Users copy and paste the ENTIRE file contents into the formula editor
   - Runs turn-based combat simulation with rounds, damage types, counters, etc.
   - Returns HTML-formatted battle results with round-by-round logs
   - The simulator detects and properly displays the HTML output

### Key Understanding
The combat simulator is just an execution environment. All combat logic and mechanics are contained within the combat equation that users paste into the formula field. This means **we only need to modify `combat_equation.js` to implement all enhancements**.

## Comparison with Expected Combat Flow

### ✅ Features Currently Implemented Correctly

1. **First Strike System**
   - Alpha Strike bonus applies to first striker's first attack
   - Only applies once per battle
   - Correct implementation in combat_equation.js

2. **Turn-Based Rounds**
   - Combat proceeds in rounds
   - Each side can take actions based on AP

3. **Damage Calculation**
   - Multiple damage types supported
   - Damage diversity bonus
   - Immediate death when HP <= 0

4. **Defensive Systems**
   - Shields and HP
   - Shield regeneration
   - Countermeasures for each damage type

### ❌ Key Differences from Expected Behavior

1. **Alpha Shield Implementation**
   - **Current**: Applies as a shield boost at battle start based on who defends first
   - **Expected**: Should apply as damage reduction on the defender against the first attack only
   - **Impact**: Changes the tactical value of alpha shield

2. **Cooldown System**
   - **Current**: Uses AP (Action Points) to determine actions per round
   - **Expected**: Should use cooldown timers that tick down each round
   - **Impact**: Different pacing and tactical considerations

3. **Ammo System**
   - **Current**: Ammo capacity / 10 = max rounds (simplistic)
   - **Expected**: Ammo should decrement per attack, not per round
   - **Impact**: Multi-action ships consume ammo differently

4. **Attack Resolution**
   - **Current**: Sequential based on first striker, then alternates
   - **Expected**: Both fleets can act in same round (simultaneous possibility)
   - **Impact**: No true simultaneous attacks

5. **End Conditions**
   - **Current**: Win or timeout (100 rounds)
   - **Expected**: Win, mutual destruction, or stalemate (both out of ammo)
   - **Impact**: Missing mutual destruction scenarios

6. **Action System**
   - **Current**: Forces all AP to be spent each round
   - **Expected**: Actions gated by cooldowns, not forced AP spending
   - **Impact**: Less tactical flexibility

## Enhancement Plan

### Phase 1: Core Combat Mechanics
1. **Implement Cooldown System**
   - Add `attackCooldown` and `cooldownTimer` per fleet
   - Replace AP-based actions with cooldown checks
   - Timer decrements each round

2. **Fix Alpha Shield**
   - Change from shield boost to damage reduction
   - Apply only to first incoming attack
   - Track with `alphaShieldUsed` flag

3. **Revise Ammo System**
   - Track ammo per fleet
   - Decrement per attack (not per round)
   - Different ammo costs for different attack types

### Phase 2: Combat Resolution
1. **Simultaneous Actions**
   - Process both fleets' actions in same round
   - Check for mutual destruction
   - Proper damage resolution order

2. **End Conditions**
   - Add mutual destruction detection
   - Implement proper stalemate (both alive, both out of ammo)
   - Remove arbitrary 100-round limit

3. **Action Flexibility**
   - Don't force AP spending
   - Actions only when cooldown ready AND ammo available
   - Strategic waiting becomes possible

### Phase 3: Advanced Features
1. **Player Skills Integration**
   - Properly scale bonuses from skill levels
   - Add more skill types beyond flight/maneuverability

2. **Combat Logging**
   - Track alpha effect applications
   - Log cooldown states
   - Show ammo consumption per attack

3. **Balance Tuning**
   - Implement tunable parameters
   - Avoid guaranteed one-shots by default
   - Allow one-shots with specific builds

## Implementation Strategy

### Step 1: Create New Combat Engine
Create `combat-engine-v3.js` that implements the expected behavior while maintaining backward compatibility.

### Step 2: Modular Design
- Separate concerns: damage calculation, turn order, end conditions
- Make it easy to swap between v2 formula system and v3 engine

### Step 3: Testing Framework
- Unit tests for each combat mechanic
- Integration tests for full battles
- Edge case coverage (mutual destruction, stalemates)

### Step 4: UI Integration
- Add toggle for combat engine version
- Show cooldown timers in results
- Display ammo consumption

## Technical Considerations

### Data Structure Updates
```javascript
// Per-fleet combat state
{
  hp: number,
  shields: number,
  ammo: number,
  cooldownTimer: number,
  attackCooldown: number,
  alphaStrikeUsed: boolean,
  alphaShieldUsed: boolean,
  // ... other stats
}
```

### Turn Resolution Flow
1. Advance round
2. Decrement all cooldown timers
3. Check each fleet for valid actions (cooldown <= 0 && ammo > 0)
4. Process attacks (with alpha effects on first)
5. Check for deaths/end conditions
6. Apply end-of-round effects (shield regen, etc.)

### Backward Compatibility
- Keep existing combat_equation.js as-is
- New engine in separate file
- UI toggle to choose engine
- Both engines output HTML results

## Migration Path

1. **Short Term**: Document current behavior differences
2. **Medium Term**: Implement new engine alongside current
3. **Long Term**: Migrate to new engine as default

## Notes for Implementation

- The current combat_equation.js is well-structured but needs the cooldown system
- The HTML output format is good and should be retained
- Consider making combat parameters configurable (cooldowns, alpha bonuses, etc.)
- The diversity bonus system is interesting and should be kept
- Countermeasure absorption is well-implemented

## Test Cases to Implement

Based on the provided acceptance tests:

1. **AlphaOneTimeOnly**: Verify alpha effects apply only once
2. **AlphaOrderOfOps**: Verify damage calculation order
3. **CoolDownPreventsAction**: Test cooldown gating
4. **BothActSameRound**: Test simultaneous actions
5. **MutualDestruction**: Both fleets die same round
6. **StalemateOnAmmo**: Both alive, both out of ammo
7. **NoForcedAllAP**: Cooldowns prevent using all AP
8. **AvoidGuaranteedOneShot**: Default balance testing
9. **SingleHitKillAllowed**: Test with high multipliers
10. **FirstAttackFlagReset**: Define and test first attack rules
