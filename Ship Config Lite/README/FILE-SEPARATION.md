# File Separation System Documentation

## Overview

The Ship Config Lite app now includes a file separation system to handle large configuration files more efficiently. This system allows you to save ships and their configurations as separate JSON files, reducing the size of the main configuration file and improving app performance.

## Features

### Change Tracking Badges
The system now includes visual indicators when changes have been made:

#### Ship Modification Badge
- A red dot appears on the ship's Actions (⋮) button when changes are made to:
  - Ship configurations (adding/removing components)
  - Base stats (editing values in the comparison table)
- The badge disappears when the ship is saved individually

#### Configuration Change Badge  
- A red dot appears on the "Save Configs" button when changes are made to:
  - Component base values/attributes
  - Scaling formulas
  - Other global configuration data
- The badge disappears when the configuration is saved

## Features

### 1. Save Individual Ship JSON
Each ship in the comparison table now has a "Save Ship JSON" option in its Actions menu:
- Click the Actions (⋮) button for any ship
- Select "💾 Save Ship JSON"
- The ship and all its configurations will be saved as a separate JSON file
- Filename format: `{ShipSize}_{ShipName}_{Manufacturer}_config.json`

### 2. Batch Save All Ships
In the top Actions menu, you have two batch save options:

#### Save All Ships as ZIP
- Click "Actions ▾" in the top menu bar
- Select "📦 Save All Ships as ZIP"
- All ships will be saved as individual JSON files within a single ZIP file
- This uses JSZip library (loaded dynamically when needed)

#### Save All Ships Individually
- Click "Actions ▾" in the top menu bar
- Select "💾 Save All Ships Individually"
- Each ship will be saved as a separate JSON file with a small delay between saves
- Use this option if ZIP functionality is not available

### 3. Load Ship JSON
To load a previously saved ship:
- Click "File ▾" in the top menu bar
- Select "🚢 Load Ship JSON"
- Choose a ship JSON file to load
- The ship and its configurations will be added to your current session

### 4. Main Configuration File Changes
When you save the main configuration file (Save Configs button):
- Ships that have been saved separately are automatically excluded
- The main file tracks which ships have been saved separately
- All other data (components, stats, descriptions, etc.) remains in the main file

## File Structure

### Individual Ship JSON Format
```json
{
  "version": "1.0",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "shipIdentifier": "ship-name-manufacturer",
  "ship": {
    // All base ship stats
    "Ship Name": "Example Ship",
    "Manufacturer": "Example Corp",
    "Class": 1,
    "Spec": "Combat",
    // ... other stats
  },
  "configurations": [
    {
      "name": "Default",
      "components": {
        // Component configurations
      }
    }
  ],
  "activeConfigIndex": 0
}
```

### Main Configuration File Changes
The main configuration file now includes:
- `separatelySavedShips`: Array of ship identifiers that have been saved separately
- Filtered ship data (excludes separately saved ships)
- All component data, stats, and other configuration remains

## Benefits

1. **Reduced File Size**: Large configurations with many ships can be split into manageable pieces
2. **Better Performance**: Smaller main configuration file loads faster
3. **Modular Organization**: Ships can be shared individually without sharing entire configurations
4. **Flexible Workflow**: Mix and match ships from different sources

## Usage Tips

1. **Regular Ships**: For configurations with many ships, save them individually to keep the main file small
2. **Template Ships**: Keep template or reference ships in the main configuration for easy access
3. **Sharing**: Share individual ship files with team members without exposing your entire configuration
4. **Backup**: The system maintains compatibility with the original save/load system

## Technical Implementation

The file separation system is implemented in `js/file-separation.js` and includes:
- `saveShipJSON()`: Saves individual ship to file
- `saveAllShipsAsZip()`: Creates ZIP with all ships
- `saveAllShipsIndividually()`: Saves ships one by one
- `loadSeparatedShipJSON()`: Loads individual ship files
- Override of `saveConfigurations()`: Filters out separated ships

The system integrates seamlessly with the existing configuration management and maintains backward compatibility. 