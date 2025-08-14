# CSV Configuration Import Feature

## Overview

The Ship Config Lite application now supports importing ship configurations from CSV files. This feature allows you to automatically load and match components and modules from a CSV file to create a new ship configuration.

## How to Use

1. **Open a Ship Configuration**: First, add a ship to the comparison table and open its configuration editor by clicking the "Edit Config" button.

2. **Import CSV**: In the configuration editor panel, click the "Import CSV" button in the header.

3. **Select CSV File**: Choose your CSV file containing the ship configuration data.

4. **Automatic Import**: The system will automatically:
   - Parse the CSV file
   - Match components and modules to the existing component library
   - Create a new configuration with the imported items
   - Set the new configuration as active

## CSV File Format

Your CSV file must have the following headers:

```csv
Asset,Type,Subtype,Config,Class,Tier,Qty,Ship Name
```

### Required Headers

- **Asset**: The name of the component or module (e.g., "Power Core", "Shield Generator")
- **Type**: Must be either "Component" or "Module"
- **Subtype**: The subtype category (e.g., "Core", "Swappable")
- **Config**: Configuration details (can be empty)
- **Class**: The size class (e.g., "XX-Small", "XS", "S", "M", "L")
- **Tier**: The component tier (e.g., "T1", "T2", "T3", "T4", "T5") - optional, defaults to "T1"
- **Qty**: Quantity of this item (number)
- **Ship Name**: Name of the ship (optional, used for configuration naming)

### Example CSV

```csv
Asset,Type,Subtype,Config,Class,Tier,Qty,Ship Name
Power Core,Component,Core,,XX-Small,T1,1,Ogrika Ruch
Shield Generator,Component,Core,,XX-Small,T1,1,Ogrika Ruch
Hull Reinforcement,Component,Core,,XX-Small,T2,1,Ogrika Ruch
Warp Drive,Component,Core,,XX-Small,T1,1,Ogrika Ruch
Subwarp Engine,Component,Core,,XX-Small,T1,1,Ogrika Ruch
Maneuvering Thrusters,Component,Core,,XX-Small,T1,1,Ogrika Ruch
Heat Sink,Component,Core,,XX-Small,T1,1,Ogrika Ruch
Scanner Array,Component,Core,,XX-Small,T2,1,Ogrika Ruch
Tractor Beam,Component,Core,,XX-Small,T1,1,Ogrika Ruch
Fixed Hardpoint,Component,Combat,,XX-Small,T1,2,Ogrika Ruch
Fuel Module,Module,Swappable,Detail,XX-Small,T1,1,Ogrika Ruch
```

## Supported Components and Modules

### Components (Type: "Component")

**Core Components (Subtype: "Core")**:
- Power Core
- Shield Generator
- Hull Reinforcement
- Warp Drive
- Subwarp Engine
- Maneuvering Thrusters
- Heat Sink
- Scanner Array
- Tractor Beam
- Any other ship component

**Combat Components (Subtype: "Combat")**:
- Fixed Hardpoint
- Turret Hardpoint
- Missile Bay
- Weapon Mount
- Any other combat-related component

**Weapons (Subtype: "Weapon")**:
- Energy weapons
- Ballistic weapons
- Plasma weapons
- Laser weapons
- Any weapon with damage type

**Countermeasures (Subtype: "Countermeasure")**:
- Chaff dispensers
- Flare dispensers
- ECM systems
- Jammers
- Decoy systems
- Any countermeasure device

**Missiles (Subtype: "Missile")**:
- Energy missiles
- Ballistic missiles
- Explosive missiles
- Plasma missiles
- Kinetic missiles
- Any missile type

**Bombs (Subtype: "Bomb")**:
- Bombs from any manufacturer
- Organized by manufacturer name

### Modules (Type: "Module")

**Swappable Modules (Subtype: "Swappable")**:
- Fuel Module
- Cargo Module
- Passenger Module
- Mining Module
- Repair Module
- Any other swappable module

**Generic Modules (Subtype: "Module")**:
- Any module not specifically categorized

## Matching Logic

The system uses intelligent matching to find the best available component or module:

1. **Exact Match**: First tries to find a component with the exact class and tier specified in the CSV
2. **Class Match**: If no exact match, tries to find a component with the same class but any tier
3. **Tier Match**: If no class match, tries to find a component with the same tier but any compatible class
4. **Fallback**: Uses the most basic version (T1 tier) if available
5. **Quantity Support**: Automatically creates multiple slots for components with Qty > 1

### Tier Matching Priority

When a Tier column is included in the CSV:
- **T1-T5 Support**: Recognizes all tier levels from T1 (basic) to T5 (advanced)
- **Backward Compatibility**: If no Tier column is present, defaults to T1
- **Intelligent Fallback**: If the specified tier isn't available, finds the closest available tier

## Important Notes

- **Component Library Required**: You must have loaded a components JSON file before importing CSV configurations
- **Ship Compatibility**: Only components compatible with the ship's class will be matched
- **Automatic Configuration**: A new configuration is automatically created and set as active
- **Non-destructive**: Existing configurations are preserved
- **Error Handling**: Components that cannot be matched will be logged as warnings but won't stop the import process

## Troubleshooting

### "No valid components or modules found"
- Check that your CSV has the correct headers
- Ensure you have "Component" or "Module" in the Type column
- Verify that Asset names match supported component types

### "Component not found" warnings
- The component name in your CSV doesn't match any available components
- Check spelling and capitalization
- Ensure the component type is supported (see list above)

### "Please load components first"
- You need to load a components JSON file before importing CSV configurations
- Use the "Load Components" button in the main header

### Import button not visible
- Make sure you have opened a ship's configuration editor first
- The Import CSV button only appears when the configuration panel is open

## Tips for Best Results

1. **Use Standard Names**: Stick to the standard component names listed above
2. **Check Class Compatibility**: Ensure the class sizes in your CSV are compatible with your ship
3. **Verify Quantities**: Use appropriate quantities for components that support multiple instances
4. **Test with Small Files**: Start with a small CSV to verify the format works before importing large configurations

## Enhanced Export and Import

### Completely Generic Component Recognition

The export and import system is now **completely generic** and will work with **ANY** components in your configuration:

- **No Predefined Lists**: The system doesn't rely on hardcoded component names or types
- **Dynamic Discovery**: Components are matched based on their actual names and properties from your component library
- **Universal Compatibility**: Works with any component structure, regardless of naming conventions
- **Perfect Round-Trip**: Export any configuration and reimport it exactly as it was

### How It Works

**Export Process**:
1. **Reads Actual Component Data**: Uses the real component names and properties from your configuration
2. **Dynamic Subtype Detection**: Determines subtypes based on the component's actual category and properties
3. **Preserves All Information**: Includes tier, class, quantity, and all identifying information
4. **No Assumptions**: Doesn't assume what your components should be called

**Import Process**:
1. **Name-Based Matching**: Searches for components by their actual names (exact and partial matches)
2. **Multi-Category Search**: If not found in the expected category, searches all categories
3. **Intelligent Fallbacks**: Uses class/tier preferences but will match any compatible component
4. **Flexible Matching**: Works with components that have different naming patterns

### Supported Component Types

The system will work with **ANY** component types found in your component library, including:

- **Ship Components**: Any component with `Ship Component` properties
- **Weapons**: Any component with `Damage Type` properties  
- **Countermeasures**: Any component with `Countermeasure` properties
- **Missiles**: Any component categorized as missiles with damage types
- **Bombs**: Any component categorized as bombs with manufacturers
- **Modules**: Any component with `Ship Modules` properties
- **Custom Categories**: Any other component categories in your library

### Matching Strategy

The system uses a sophisticated matching strategy:

1. **Exact Name Match**: First tries to find components with exactly the same name
2. **Partial Name Match**: Then tries components where names contain each other
3. **Class + Tier Priority**: Prefers components with matching class and tier
4. **Class Priority**: Falls back to matching class with any tier
5. **Tier Priority**: Falls back to matching tier with any class  
6. **Best Available**: Uses the best available component if no exact matches

### Benefits

- **Works with Your Data**: No need to rename components to match predefined lists
- **Future-Proof**: Will work with new component types added to your library
- **Flexible**: Handles different naming conventions and component structures
- **Reliable**: Multiple fallback strategies ensure components are found when possible
- **Transparent**: Clear logging shows what was matched and what wasn't found 