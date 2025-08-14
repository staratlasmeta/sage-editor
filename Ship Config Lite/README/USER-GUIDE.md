# Ship Config Lite - User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Basic Workflows](#basic-workflows)
3. [Advanced Workflows](#advanced-workflows)
4. [Component Management](#component-management)
5. [Pattern Builder Workflows](#pattern-builder-workflows)
6. [Analysis & Optimization](#analysis--optimization)
7. [Tips & Tricks](#tips--tricks)

## Getting Started

### First Time Setup
1. **Download the application** files to a folder on your computer
2. **Prepare your data files**:
   - Ship stats CSV (contains all ship base statistics)
   - Components JSON (contains all available components)
3. **Open the application**:
   - Double-click `index.html` in your file browser
   - OR use a local server if you have file access issues

### Loading Data Files
1. Click **"File ▾"** menu in the top-left
2. Select **"Load Ship Data"** → Choose your ship stats CSV
3. Select **"Load Components"** → Choose your components JSON
4. Wait for "Components loaded successfully" message

### Interface Overview
- **Top Menu Bar**: File operations, save configs, component categories
- **Ship Comparison Table**: Main area showing ship stats
- **Action Buttons**: Add Ship, Actions menu, Analysis menu
- **Configuration Editor**: Right-side panel (opens when editing)
- **Theme Toggle**: Light/dark mode switch (top-right)

## Basic Workflows

### Comparing Ships
1. **Add your first ship**:
   - Click **"Add Ship"** button
   - Select a ship from the dropdown
   - Ship appears in comparison table

2. **Add more ships**:
   - Repeat the process
   - Or use **"Actions ▾"** → **"Add Next 5 Ships"**

3. **Reorder ships**:
   - Click and drag the **"⋮⋮"** handle in ship headers
   - Drop in desired position

4. **Remove ships**:
   - Click **"×"** button in ship header
   - Or use **"Actions ▾"** → **"Remove All Ships"**

### Creating Configurations

1. **Start with base configuration**:
   - Click on ship name/image
   - Select **"Add Configuration"**
   - Name it (e.g., "Mining Build")

2. **Edit configuration**:
   - Click **"Edit Config"** button
   - Configuration editor opens on right

3. **Add components**:
   - Browse component categories
   - Click components to add/remove
   - Green = equipped, Gray = available

4. **Save your work**:
   - Changes save automatically
   - Click **"Save Configs"** to download backup

### Working with Multiple Configurations

1. **Create variations**:
   - Click ship name → **"Duplicate Config"**
   - Modify the duplicate
   - Compare different builds side-by-side

2. **Switch between configs**:
   - Use dropdown under ship name
   - Stats update instantly

3. **Copy between ships**:
   - Click ship name → **"Copy Config"**
   - Go to another ship → **"Paste Config"**

## Advanced Workflows

### Importing Configurations from CSV

1. **Prepare CSV file** with proper format:
   ```csv
   Asset,Type,Subtype,Config,Class,Tier,Qty,Ship Name
   Power Core,Component,Core,,S,T3,1,Your Ship
   ```

2. **Import process**:
   - Open configuration editor
   - Click **"Import CSV"**
   - Select your CSV file
   - New configuration created automatically

### Batch Operations

1. **Add multiple ships quickly**:
   - **"Add All Ships"**: Adds every ship (use carefully!)
   - **"Add Next 5 Ships"**: Adds next 5 from list
   - **"Add Remaining Ships"**: Adds all not yet added

2. **Generate all patterns**:
   - Create "Tier One" base configuration
   - Use Pattern Builder → **"Generate All Patterns"**
   - Creates all standard builds automatically

### Custom Attributes

1. **Add custom stats**:
   - Click **"Actions ▾"** → **"Manage Attributes"**
   - Enter attribute name and default value
   - New column appears in comparison table

2. **Reorder attributes**:
   - Drag the **"⋮⋮"** handle next to attribute names
   - Drop in desired position

3. **Edit values**:
   - Click on values in custom columns
   - Enter new value in popup

## Component Management

### Understanding Component Categories

- **Ship Components**: Core systems (9 base components per ship)
  - Power Core, Shield Generator, Hull Reinforcement
  - Engines, Thrusters, Heat Sinks, Scanners
  - Utility rigs (Mining, Salvage, etc.)

- **Ship Modules**: Capacity expansions
  - Fuel, Cargo, Passenger, Ammo modules

- **Ship Weapons**: Offensive systems by damage type
  - Energy, Kinetic, EMP, Heat, etc.
  - Different firing cadences (Rapidfire, Cannon, etc.)

- **Countermeasures**: Defensive utilities
  - Flares, Decoys, Healing Nanobots, etc.

- **Missiles**: Guided munitions

- **Drones**: Automated helpers
  - Combat, Mining, Salvage, Support types

### Component Slots & Limits

1. **Tier One defines limits**:
   - Base configuration sets maximum slots
   - Cannot exceed Tier One allocations

2. **Multiple components per slot**:
   - Some slots allow multiple items
   - Check quantity indicators

3. **Class compatibility**:
   - Components must match ship size class
   - Incompatible items won't appear

### Editing Component Attributes

1. **Access attribute editor**:
   - Click **"Edit Component Attributes"** (left panel)
   - Select category and component group

2. **Modify base values**:
   - Change stat values for all instances
   - Effects apply globally

3. **Scaling formulas**:
   - Click **"Edit Scaling Formulas"**
   - Modify class/tier scaling math
   - Set drone port capacities

## Pattern Builder Workflows

### Creating Your First Pattern

1. **Prepare Tier One**:
   - Create configuration named exactly "Tier One"
   - Add all available component slots
   - This defines maximum capacity

2. **Open Pattern Builder**:
   - Edit any configuration
   - Click **"🔧 Pattern Builder"**

3. **Build pattern**:
   - Click **"+ New Pattern"**
   - Name it descriptively
   - Add actions in sequence

### Common Pattern Examples

#### Mining Configuration
1. Remove all weapons
2. Remove all missiles  
3. Set Mining Rig to maximum
4. Fill empty drone slots → Mining drones
5. Fill empty modules → Cargo modules

#### Combat Build (Energy)
1. Remove all non-combat components
2. Convert missile slots → Energy weapons
3. Set countermeasures → Energy Capacitor
4. Fill weapons → Energy type
5. Upgrade all weapons by 1 tier

#### Balanced Explorer
1. Set exactly 2 weapon slots
2. Set exactly 2 mining rigs
3. Fill shields to maximum
4. Add scanner upgrades
5. Balance fuel and cargo

### Testing Patterns

1. **Test before applying**:
   - Select test configuration
   - Click **"🧪 Test Pattern"**
   - Review what would change

2. **Apply patterns**:
   - **"✅ Apply Pattern"**: Current config only
   - **"🔄 Apply to All"**: All configurations

3. **Batch processing**:
   - **"Generate All Patterns"**: One ship
   - **"Generate for All Ships"**: Entire fleet

## Combat Simulation

### Setting Up Battles

1. **Open Combat Simulator**:
   - Click **"Combat Simulator"** button (left of Add Ship)
   - Modal opens with two fleet panels

2. **Build fleets**:
   - Select ships from dropdown
   - Click **"Add Ship"** to add to fleet
   - Ships use their active configurations
   - Remove ships with × button

3. **Write combat formula**:
   - Use @ to see available stats
   - Reference stats: `left.damage`, `right.hit_points`
   - Example: `left.damage > right.hit_points ? "left" : "right"`

4. **Run simulation**:
   - Click **⚔️ FIGHT!**
   - See instant results
   - Save formulas for reuse

### Formula Examples

**Basic comparison**:
```javascript
left.damage > right.hit_points ? "left" : "right"
```

**Advanced scoring**:
```javascript
let leftPower = left.damage + left.shield_points;
let rightPower = right.damage + right.shield_points;
leftPower > rightPower ? "left" : "right"
```

## Analysis & Optimization

### Using Analysis Tools

1. **Access analysis**:
   - Click **"Analysis ▾"** menu
   - Choose analysis type

2. **Available analyses**:
   - **Full Configs**: Detailed markdown export
   - **Component Usage**: What's equipped where
   - **Similarity**: Find similar builds
   - **Performance**: Stat performance matrix
   - **Validation**: Check for issues

### Optimizing Builds

1. **Understanding Ship Scores**:
   - Ships are evaluated across 6 categories:
     - **Combat** ⚔️: Damage, shields, HP, AP, ammo
     - **Mobility** 🚀: Speed, warp, fuel efficiency
     - **Cargo** 📦: Cargo/passenger capacity, loading
     - **Mining** ⛏️: Mining rates for resources
     - **Support** 🔧: Scan, repair, utility capabilities
     - **Economy** 💰: Fuel capacity, loot rate, fees
   - Scores range from 0-100 with color coding:
     - 80-100: Green (Excellent)
     - 60-79: Light Green (Good)  
     - 40-59: Yellow (Average)
     - 20-39: Orange (Below Average)
     - 0-19: Red (Poor)

2. **Dual Scoring System**:
   - Each ship shows **two overall scores**:
     - **⭐ Global Score**: Compared to ALL ships
     - **🏆 Class Score**: Compared only to same-class ships
   - Use tabs to switch category views:
     - **"All Ships"**: Global category scores
     - **Class tab** (e.g., "XXS"): Class-specific scores
   - Why both scores matter:
     - Global: Find absolute best performers
     - Class: Find best within size constraints
     - Example: An XXS ship may score 30/100 globally but 95/100 in class

3. **Using Score Breakdowns**:
   - Click either **overall score** (⭐ or 🏆) to see:
     - All category scores
     - Category weights based on ship specialization
     - Final score calculation
     - Comparison scope indicator
   - Click any **category score** to see:
     - Individual stat contributions
     - Stat weights (higher/lower is better)
     - How components affect each stat
   - Ship specialization provides bonuses:
     - Fighters get Combat bonus (1.5x)
     - Racers get Mobility bonus (1.5x)
     - Miners get Mining bonus (1.8x)
     - Transports get Cargo bonus (1.5-1.6x)

4. **Compare variations**:
   - Create multiple configs
   - Switch between them
   - Note stat differences
   - Watch how scores change with different builds
   - Compare both global and class scores

5. **Use stat details**:
   - Click any stat value
   - See component contributions
   - Understand calculations

### Exporting Analysis

1. **Copy to clipboard**:
   - Open any analysis
   - Click **"Copy to Clipboard"**
   - Paste into documents

2. **Save configurations**:
   - Regular JSON export
   - Markdown documentation
   - CSV format (via analysis)

## Tips & Tricks

### Performance Tips
- **Large fleets**: Use pending changes mode (refresh button)
- **Smooth editing**: Close panels when not needed
- **Faster loading**: Keep ships under 10 for best performance

### Keyboard Shortcuts
- **Escape**: Close open panels
- **Ctrl/Cmd + S**: Save configurations
- **Tab**: Navigate between inputs

### Best Practices

1. **Naming conventions**:
   - "Tier One" for base configs
   - Descriptive names (e.g., "PvP Energy Build")
   - Include version/date if needed

2. **Organization**:
   - Group similar ships together
   - Use consistent config names
   - Regular backups via Save Configs

3. **Experimentation**:
   - Duplicate before major changes
   - Test patterns before batch apply
   - Compare before/after stats

### Common Issues

**"Cannot exceed Tier One limit"**
- Pattern tries to add too many slots
- Check your Tier One configuration
- Ensure all slots are defined

**Components not showing**
- Check ship class compatibility
- Verify components JSON loaded
- Some items may be tier-locked

**Performance lag**
- Too many ships in comparison
- Try refresh button mode
- Close configuration editor

### Advanced Tips

1. **Custom formulas**:
   - Edit scaling formulas for balance
   - Use exponential/logarithmic scaling
   - Test with different ship sizes

2. **Drone optimization**:
   - Configure port capacities
   - Larger ports = more drones
   - Dramatically affects combat stats

3. **Pattern combinations**:
   - Apply multiple patterns in sequence
   - Create meta-patterns
   - Share pattern files with others

## Getting Help

1. **Check documentation**:
   - README files in `/README/` folder
   - Hover tooltips on buttons
   - Console messages for errors

2. **Community resources**:
   - Share configurations
   - Exchange patterns
   - Report issues

3. **Experimentation**:
   - Most actions are reversible
   - Duplicate before testing
   - Learn by doing! 