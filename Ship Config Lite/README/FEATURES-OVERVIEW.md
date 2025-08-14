# Ship Config Lite - Features Overview

This document provides a comprehensive overview of all features available in Ship Config Lite.

## Core Features

### 🚢 Ship Management

#### Ship Comparison Table
- **Multi-ship comparison**: Compare unlimited ships side-by-side
- **Real-time updates**: Stats update instantly when configurations change
- **Sortable columns**: Click headers to sort by any stat
- **Drag-and-drop reordering**: Reorganize ship columns with drag handles
- **Expandable stats**: Click values to see detailed calculations

#### Ship Selection
- **Dropdown selection**: Choose from all available ships
- **Quick add options**: Add next 5, add all, add remaining ships
- **Ship details display**: Shows manufacturer, class, and ship image
- **Remove individual ships**: X button on each ship
- **Bulk operations**: Remove all ships at once

### ⚙️ Configuration System

#### Configuration Management
- **Multiple configurations per ship**: Unlimited named configs
- **Active configuration tracking**: Each ship instance has its own active config
- **Configuration operations**:
  - Add new configuration
  - Rename existing configuration
  - Duplicate configuration
  - Delete configuration
  - Copy configuration to clipboard
  - Paste configuration from clipboard

#### Configuration Editor
- **Right-side sliding panel**: Non-intrusive editing interface
- **Component categories**: Organized by type
- **Visual feedback**: Green = equipped, Gray = available
- **Quantity indicators**: Shows how many of each component
- **Real-time preview**: See stat changes before saving

### 🔧 Component System

#### Component Categories
1. **Ship Components**
   - Power Core
   - Shield Generator
   - Hull Reinforcement
   - Warp Drive
   - Subwarp Engine
   - Maneuvering Thrusters
   - Heat Sink
   - Scanner Array
   - Tractor Beam
   - Utility Rigs (Mining, Repair, Salvage, etc.)

2. **Ship Modules**
   - Fuel Module
   - Cargo Module
   - Passenger Module
   - Ammo Module

3. **Ship Weapons**
   - Organized by damage type (Energy, Kinetic, EMP, etc.)
   - Sub-organized by firing cadence (Rapidfire, Cannon, Burst, etc.)

4. **Countermeasures**
   - Decoy, Flare, Mine
   - Energy Capacitor
   - Healing Nanobots
   - Specialized protections

5. **Missiles**
   - Various damage types
   - Size-based capacity

6. **Drones**
   - Combat (various damage types)
   - Utility (Mining, Salvage, Repair, etc.)

#### Component Features
- **Class compatibility**: Only shows components that fit the ship
- **Tier system**: T1-T5 component tiers
- **Effect stacking**: Multiple components stack effects
- **Smart filtering**: Automatic compatibility checking

### 📊 Analysis & Optimization

#### Ship Scoring System
- **Overall score calculation**: Weighted scoring across categories
- **Category breakdown**:
  - Combat effectiveness
  - Mobility performance
  - Defense capabilities
  - Utility functions
  - Economy efficiency
- **Visual indicators**: Color-coded scores
- **Detailed breakdown**: Click scores for full analysis

#### Analysis Tools Menu
1. **Full Configurations**: Markdown-formatted complete config details
2. **Config Names**: List all configuration names across ships
3. **Uniqueness Analysis**: Find unique component combinations
4. **Component Usage**: Analyze what components are used where
5. **Similarity Matrix**: Compare configuration similarities
6. **Performance Matrix**: Detailed performance metrics
7. **Slot Utilization**: See how slots are being used
8. **Validation Report**: Check for configuration issues
9. **Drone Port Analysis**: Ships with drone capabilities
10. **Stat Impact**: Component contribution analysis
11. **Component Stats Table**: Detailed component statistics

### 🔄 Import/Export System

#### Configuration Import/Export
- **JSON format**: Save/load all configurations
- **CSV import**: Import configs from spreadsheets
- **Markdown export**: Documentation-ready formats
- **Clipboard support**: Copy/paste configurations

#### CSV Import Features
- **Flexible format**: Handles various CSV structures
- **Smart matching**: Fuzzy component name matching
- **Batch import**: Import multiple configurations
- **Error tolerance**: Continues on component not found

### 🎨 Pattern Builder System

#### Pattern Creation
- **Visual pattern editor**: Drag-and-drop action creation
- **Pattern actions**:
  - Remove all components of type
  - Convert slot types
  - Fill empty slots
  - Upgrade/downgrade tiers
  - Set exact quantities
  - Proportional filling
- **Pattern testing**: Dry-run before applying
- **Pattern storage**: Save patterns for reuse

#### Batch Processing
- **Single ship patterns**: Generate all patterns for one ship
- **Fleet-wide patterns**: Apply patterns to all ships
- **Progress tracking**: Visual progress indicator
- **Preloaded patterns**: Standard build templates included

### ⚔️ Combat Simulator

#### Fleet Battle System
- **Two-sided battles**: Configure left fleet vs right fleet
- **Fleet composition**: Add multiple ships with their active configurations
- **Aggregate statistics**: Automatic calculation of combined fleet stats
- **Visual fleet management**: Easy add/remove interface

#### Combat Formula Engine
- **Custom formulas**: Write JavaScript expressions for combat resolution
- **Stat access**: Reference any stat using `left.stat_name` and `right.stat_name`
- **Math functions**: Full JavaScript Math library available
- **Flexible outcomes**: Return winners, custom messages, or calculations

#### Formula Autocomplete
- **@ trigger system**: Type @ to see available stats
- **Smart filtering**: Type to filter stat suggestions
- **Keyboard navigation**: Arrow keys to select, Enter to insert
- **Stat descriptions**: See what each stat means

#### Combat Features
- **Save formulas**: Persist your combat equations
- **Instant resolution**: See battle results immediately
- **Error handling**: Clear error messages for formula issues
- **Fleet summaries**: See ship counts and key stats

### 🎯 Advanced Features

#### Component Attribute Editor
- **Global stat modification**: Edit base component values
- **Scaling formulas**: Customize tier/class scaling math
- **Live updates**: Changes apply immediately
- **Category-based editing**: Modify entire component groups

#### Drone Port Capacity System
- **Size-based capacity**: Larger ports deploy more drones
- **Customizable limits**: Set capacity per port size
- **Multiplicative scaling**: Drones multiply based on capacity
- **Detailed breakdowns**: See exact drone counts

#### Custom Attributes
- **Add custom columns**: Create your own stat columns
- **Default values**: Set initial values for all ships
- **Drag to reorder**: Organize attributes as needed
- **Per-ship editing**: Modify values individually

#### Performance Optimization
- **Pending changes system**: Batch updates for performance
- **Refresh button**: Manual update control
- **Web Worker support**: Multi-threaded calculations
- **Efficient rendering**: Only updates changed cells

### 🎮 User Interface

#### Theme System
- **Light/Dark themes**: Toggle with switch
- **Persistent preference**: Saves theme choice
- **Consistent styling**: All elements themed

#### Responsive Design
- **Flexible layouts**: Adapts to screen size
- **Scrollable tables**: Horizontal/vertical scrolling
- **Collapsible panels**: Hide unused sections
- **Tooltips**: Helpful hints throughout

#### Keyboard Support
- **Escape key**: Close open panels
- **Tab navigation**: Move between inputs
- **Enter to confirm**: Submit forms

### 📁 File Management

#### File Menu Options
- **Load Ship Data**: Import ship stats CSV
- **Load Components**: Import components JSON
- **Save Configs**: Export current configurations
- **Load Configs**: Import saved configurations
- **Clear All Data**: Reset application

#### Auto-save Features
- **Browser storage**: Configurations saved locally
- **Crash recovery**: Restore after browser crash
- **Version tracking**: Configuration versioning

### 🔍 Search & Filter

#### Component Search
- **Category filtering**: Show only specific types
- **Class filtering**: Show compatible components
- **Name filtering**: Search by component name
- **Quick filters**: Common filter presets

### 📈 Statistics & Metrics

#### Stat Calculations
- **Base stats**: Original ship values
- **Modified stats**: With components applied
- **Difference display**: Shows changes
- **Percentage changes**: Relative improvements

#### Stat Categories
- **Combat stats**: Damage, fire rate, accuracy
- **Defense stats**: Hull, shields, resistances  
- **Mobility stats**: Speed, maneuverability
- **Utility stats**: Cargo, mining, scanning
- **Economy stats**: Fuel efficiency, costs

### 🛡️ Validation & Safety

#### Configuration Validation
- **Slot limit checking**: Prevents exceeding limits
- **Compatibility validation**: Ensures valid combinations
- **Tier One enforcement**: Respects base configuration
- **Warning messages**: Clear error feedback

#### Data Integrity
- **Backup reminders**: Prompts to save work
- **Recovery options**: Restore from backups
- **Safe operations**: Confirmation for destructive actions

## Feature Availability by Module

| Feature | Module | Status |
|---------|---------|---------|
| Ship Comparison | comparison-table.js | ✅ Complete |
| Configuration Management | config-management.js | ✅ Complete |
| Component System | component-management.js | ✅ Complete |
| Pattern Builder | config-pattern-builder.js | ✅ Complete |
| File I/O | file-io.js | ✅ Complete |
| Analysis Tools | analysis-tools.js | ✅ Complete |
| Scoring System | ship-scoring.js | ✅ Complete |
| Drone Scaling | drone-scaling.js | ✅ Complete |
| Custom Attributes | attribute-management.js | ✅ Complete |
| Performance Mode | pending-changes.js | ✅ Complete |
| Drag & Drop | drag-drop.js | ✅ Complete |
| Combat Simulator | combat-simulator.js | ✅ Complete |

## Future Enhancements (Planned)

- **Cloud sync**: Save configurations online
- **Sharing system**: Share builds with links
- **Combat simulator**: Test builds in combat
- **Fleet management**: Manage entire fleets
- **Mobile app**: Native mobile experience
- **API integration**: Direct game data sync
- **Build recommendations**: AI-powered suggestions
- **Community builds**: Browse shared configurations 