# Combat Simulator

## Overview

The Combat Simulator is a powerful feature in Ship Config Lite that allows you to simulate fleet battles using custom formulas. It provides a flexible system for testing different combat scenarios and strategies by comparing aggregate fleet statistics.

## Features

### Fleet Management
- **Two-sided battles**: Left fleet vs Right fleet
- **Ship selection**: Add any ship from your comparison table to either fleet
- **Dynamic configuration**: Each ship in fleet has its own configuration dropdown
- **Per-ship configuration**: Change configurations independently for each fleet ship
- **Multiple ships per fleet**: Build fleets with any number of ships
- **Easy management**: Remove individual ships or clear entire fleets

### Aggregate Statistics
- **Automatic calculation**: Fleet stats are summed from all ships
- **Comprehensive stats**: All stats from loaded configurations are included
- **Real-time updates**: Stats recalculate when you add/remove ships or change configs
- **Visual comparison**: Stats are color-coded vs opponent fleet
  - **Green**: Your fleet has higher value
  - **Red**: Your fleet has lower value  
  - **Blue**: Values are equal
- **Dynamic stat discovery**: Automatically finds all stats from loaded data

### Formula System
- **Custom formulas**: Write your own combat resolution formulas
- **JavaScript syntax**: Full JavaScript expression support
- **Stat references**: Access fleet stats using `left.stat_name` and `right.stat_name`
- **Math functions**: All JavaScript Math functions available
- **Flexible results**: Return winner names, custom messages, or calculations

### Autocomplete Feature
- **@ trigger**: Type @ to see available stats
- **Smart filtering**: Type after @ to filter stats
- **Keyboard navigation**: Use arrow keys to select
- **Quick insertion**: Press Enter to insert selected stat
- **Descriptions**: See stat descriptions in autocomplete

## How to Use

### Opening the Combat Simulator
1. Click the **"Combat Simulator"** button (left of "Add Ship" button)
2. The combat simulator modal will open

### Building Fleets

#### Adding Ships to Fleets
1. Use the dropdown to select a ship (shows current active configuration)
2. Click **"Add Ship"** to add it to that fleet
3. The ship appears with a configuration dropdown
4. Change configurations per ship using the dropdown
5. Aggregate stats update automatically with color comparison

#### Managing Fleets
- Click the **×** button next to a ship to remove it
- Use **"Clear Fleets"** to remove all ships from both fleets

### Writing Combat Formulas

#### Basic Formula Structure
The formula should be a JavaScript expression that determines the winner. The simplest formula:
```javascript
left.damage > right.hit_points ? "left" : "right"
```

#### Accessing Fleet Stats
- Use `left.stat_name` for left fleet stats
- Use `right.stat_name` for right fleet stats
- Stats use underscores in names (e.g., `cargo_capacity`, `subwarp_speed`)

#### Using Autocomplete
1. Type **@** in the formula field
2. Start typing a stat name to filter
3. Use **↑/↓** arrow keys to navigate
4. Press **Enter** to insert the selected stat
5. Press **Escape** to close autocomplete

#### Example Formulas

**Simple damage vs HP:**
```javascript
left.damage > right.hit_points ? "left" : "right"
```

**Total combat power calculation:**
```javascript
(left.damage + left.damage_kinetic + left.damage_energy) > 
(right.hit_points + right.shield_points) ? "left" : "right"
```

**Ratio-based comparison:**
```javascript
(left.damage / right.hit_points) > (right.damage / left.hit_points) ? "left" : "right"
```

**Complex scoring system:**
```javascript
let leftScore = left.damage * 2 + left.shield_points + left.hit_points * 0.5;
let rightScore = right.damage * 2 + right.shield_points + right.hit_points * 0.5;
leftScore > rightScore ? "left" : rightScore > leftScore ? "right" : "draw"
```

**Custom messages:**
```javascript
left.damage > right.hit_points * 2 ? "left dominates!" : 
right.damage > left.hit_points * 2 ? "right dominates!" : 
"close battle"
```

### Running Simulations

1. Build your fleets by adding ships
2. Write or modify your combat formula
3. Click **⚔️ FIGHT!** to run the simulation
4. Results appear below showing:
   - Winner announcement
   - Brief description
   - Fleet sizes

### Saving Formulas

- Click **💾 Save Formula** to save your current formula
- Formulas are saved in browser localStorage
- Saved formulas persist between sessions

## Available Stats

The combat simulator can use any stat from your ship configurations. Common combat-relevant stats include:

### Offensive Stats
- `damage` - Total damage output
- `damage_kinetic` - Kinetic damage
- `damage_energy` - Energy damage
- `damage_emp` - EMP damage
- `damage_superchill` - Superchill damage
- `damage_shockwave` - Shockwave damage
- `damage_graygoo` - Gray Goo damage
- `damage_heat` - Heat damage
- `damage_bomb` - Bomb damage
- `crit_chance` - Critical hit chance
- `crit_multiplier` - Critical damage multiplier

### Defensive Stats
- `hit_points` - Hull hit points
- `shield_points` - Shield strength
- `shield_recharge_rate` - Shield regeneration
- `shield_break_delay` - Shield recovery time
- `repair_ability` - Repair capability

### Countermeasures
- `counter_decoy` - Decoy effectiveness
- `counter_energy_capacitor` - Energy defense
- `counter_fire_suppressor` - Fire suppression
- `counter_flare` - Flare countermeasures
- `counter_healing_nanobots` - Self-repair systems
- `counter_mine` - Mine deployment
- `counter_negative_rem_plating` - REM protection
- `counter_warming_plates` - Cold resistance
- `counter_faraday_shielding` - EMP protection

### Utility Stats
- `cargo_capacity` - Cargo space
- `fuel_capacity` - Fuel storage
- `ammo_capacity` - Ammunition storage
- `subwarp_speed` - Sublight speed
- `warp_speed` - FTL speed
- `scan_power` - Scanning capability

## Advanced Formula Features

### Using Math Functions
All JavaScript Math functions are available:
```javascript
Math.sqrt(left.damage * left.hit_points) > Math.sqrt(right.damage * right.hit_points) ? "left" : "right"
```

### Multi-line Formulas
You can write complex multi-line formulas:
```javascript
let leftOffense = left.damage + left.damage_kinetic + left.damage_energy;
let leftDefense = left.hit_points + left.shield_points;
let rightOffense = right.damage + right.damage_kinetic + right.damage_energy;
let rightDefense = right.hit_points + right.shield_points;

let leftRatio = leftOffense / rightDefense;
let rightRatio = rightOffense / leftDefense;

leftRatio > rightRatio * 1.5 ? "left" : 
rightRatio > leftRatio * 1.5 ? "right" : 
"draw"
```

### Error Handling
- Formula errors are displayed below the fight button
- Check for typos in stat names
- Ensure both fleets have ships before fighting
- Use browser console for debugging complex formulas

## Tips and Best Practices

### Formula Design
1. **Start simple**: Test with basic formulas first
2. **Consider all damage types**: Some ships specialize in specific damage
3. **Balance offense and defense**: Pure damage comparison may not be realistic
4. **Account for fleet composition**: Different ship types have different strengths
5. **Test edge cases**: What happens with very small or large fleets?

### Fleet Building
1. **Mix ship types**: Combine different ship classes for balanced fleets
2. **Use configurations**: Test how different builds perform
3. **Compare similar fleets**: Small changes can reveal configuration effectiveness
4. **Save interesting matchups**: Document successful fleet compositions

### Common Patterns

**Weighted scoring:**
```javascript
let score = stat * weight;
```

**Threshold checks:**
```javascript
stat > threshold ? bonus : penalty
```

**Ratio comparisons:**
```javascript
(leftStat / rightStat) > ratio
```

**Conditional bonuses:**
```javascript
fleet.counter_type > 0 ? damage * 1.2 : damage
```

## Module Integration

The Combat Simulator integrates with:
- **Ship Configurations**: Uses active configurations for each ship
- **Component System**: All component modifications apply
- **Custom Attributes**: Any custom stats you've added are available
- **Comparison Table**: Ships must be in the comparison table to use

## Technical Details

- **Module**: `combat-simulator.js`
- **Dependencies**: `app.js`, `comparison-table.js`, `component-management.js`
- **Storage**: Formulas saved in localStorage
- **Calculation**: Real-time aggregation of modified stats
- **Evaluation**: Safe JavaScript evaluation with sandboxed context

## Future Enhancements

Potential improvements could include:
- Save/load fleet compositions
- Combat history tracking
- Multiple formula presets
- Fleet templates
- Combat report generation
- Visual battle animations
- Turn-based combat simulation
- Damage type effectiveness matrix 