# Ship Configuration Generator - Understanding and Issues

## Overview

The Ship Configuration Generator is a system designed to automatically create multiple ship configurations based on predefined templates. It's intended to generate "Min", "Mid", and "Max" tier variants for different build types (Mining, Combat, Salvage, etc.) starting from a base "Tier One" configuration.

## ⚠️ Critical Database Limitation Discovered

After running diagnostics on your component database, we found:

### Current Database Structure:
- **Weapons**: 1,558 components with generic names (just "Kinetic", "Energy", "EMP", etc.)
- **Missiles**: Only 1 component named "Missiles" (no specific types)
- **Drones**: Only 2 components ("Drones" and "Calico Medrone" rescue drone)

### Expected Structure:
- Multiple missile types (Explosive Missiles, Photon Missiles, EMP Missiles, etc.)
- Various drone types (Mining Drones, Combat Drones, Salvage Drones, etc.)
- Weapons with descriptive names including their type and variant

### Impact:
- The generator will use the generic "Missiles" component for ALL missile requirements
- All drones (except rescue) will use the generic "Drones" component
- Weapons will be selected based on damage type property matching

### Recommendation:
Your component database appears to be incomplete or uses a simplified structure. For the config generator to work as intended, you would need a more complete component database with specific missile and drone variants.

## System Architecture

### 1. Template Structure (`new configs templates.txt`)
The templates define what components should be included for each build type and tier:
- **Min (T1)**: Minimal configuration with essential components only
- **Mid (T3)**: Mid-tier configuration with additional support components  
- **Max (T5)**: Maximum configuration with all recommended components

Example Mining template:
```
### Mining
* Min (T1) — Components: Mining Rig · Tractor Beam | Modules: Cargo Module
* Mid (T3) — Components: Heat Sink · Power Core · Mining Rig · Tractor Beam · Cargo Module | Drones: Mining Drones
* Max (T5) — Components: Heat Sink · Power Core · Subwarp Engine · Warp Drive · Maneuvering Thrusters · Mining Rig · Tractor Beam · Cargo Module · Drone Port · Hull Reinforcement · Shield Generator | Weapons: Heat Weapon · Shockwave Weapon | Drones: Mining Drones
```

### 2. Code Implementation

#### Key Files:
- `config-generator.js`: Main generation logic
- `config-templates.js`: Template definitions in JavaScript format
- `config-upgrade.js`: Handles upgrading existing configs to higher tiers

#### Key Functions:
- `generateAllConfigs()`: Generates all configuration variants
- `generateConfigFromTemplate()`: Creates a single config from a template
- `findComponentByName()`: Searches for components matching template requirements

## The Core Problem: Component Name Mismatch

### Issue 1: Naming Convention Differences
**Template expects**: Simple names like "Tractor Beam", "Heat Sink", "Mining Rig"  
**Component database has**: Full names like "Tractor Beam - M - T3" (includes size and tier)

The generator tries to match by:
1. Constructing expected names: `${componentName} - ${shipClass} - T${tier}`
2. Fuzzy matching (partial name matches)
3. Fallback to any available size

### Issue 2: Missing Components
Some components referenced in templates may not exist in the database:
- "Mining Rig" - The generator has special logic to check if this exists
- Weapon naming differences (e.g., "Heat Weapon" vs actual weapon names)
- Drone naming variations

### Issue 3: Ship Class Detection
The system struggles to determine the ship's class/size:
1. Tries to get from ship data
2. Falls back to detecting from Tier One components
3. Handles special cases (TTN, numeric classes)
4. This affects finding size-appropriate components

### Issue 4: Category Mapping
Templates use different category names than the component database:
- Template: "Components" → Database: "Ship Component"
- Template: "Modules" → Database: "Ship Module"
- Template: "Counter-measures" → Database: "Countermeasures"

## How the Generator Works

### Step 1: Preparation
1. Loads the Tier One configuration as a base
2. Detects ship class/size
3. Processes component database if needed

### Step 2: Template Processing
For each build type and tier:
1. Reads template requirements
2. Maps category names
3. Searches for matching components

### Step 3: Component Search Strategy
1. **Exact Match**: Tries `${componentName} - ${shipClass} - T${tier}`
2. **Class Fallback**: Tries alternative sizes in priority order
3. **Fuzzy Match**: Searches for partial name matches
4. **Any Available**: Takes any component matching the type

### Step 4: Configuration Creation
1. Starts with empty configuration
2. Adds found components to appropriate slots
3. Handles special cases (weapons, drones, modules)
4. Saves configuration with appropriate name

## Why It's Failing

### 1. Component Database Structure
The component database may not have components with the exact naming structure the generator expects. Components might be:
- Named differently than templates expect
- Missing tier/class variants
- Organized in unexpected category structures

### 2. Rigid Name Matching
The current fuzzy matching might not be flexible enough:
```javascript
// Current approach
const searchName = `${compName} - ${tryClass} - T${template.tier}`;

// Might miss components named like:
// "Advanced Tractor Beam Module"
// "Tractor Beam System Mk III"
// "T3 Medium Tractor Beam"
```

### 3. Special Component Logic
Components like "Mining Rig" have special handling that assumes they might not exist, but the template still references them, causing incomplete configurations.

## Potential Solutions

### 1. Improve Name Matching
- Use more flexible regex patterns
- Search for key terms rather than exact phrases
- Consider word order variations

### 2. Component Mapping Table
Create a mapping between template names and actual component patterns:
```javascript
const componentMappings = {
  "Tractor Beam": ["Tractor Beam", "Tractor Module", "Beam Tractor"],
  "Mining Rig": ["Mining", "Drill", "Excavator"],
  // etc.
};
```

### 3. Template Validation
Before generation, validate that all referenced components exist:
- List all unique component types in templates
- Check which ones can be found in database
- Report missing components to user

### 4. Manual Component Selection
For components that can't be found automatically:
- Prompt user to select from available options
- Save mappings for future use
- Build a learned mapping over time

## Debug Tools

The system includes debug functions:
- `debugComponentNames()`: Shows all components in database
- `debugGenerateConfig()`: Step-by-step generation with logging
- `generateMiningConfigTests()`: Tests just Mining configs with detailed output

## Next Steps

1. **Audit Component Database**: List all actual component names and structure
2. **Update Templates**: Align template component names with database
3. **Improve Matching**: Implement more flexible component search
4. **Add Mappings**: Create explicit mappings for problematic components
5. **User Feedback**: Show which components couldn't be found and why 