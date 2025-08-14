# Manual Data Loading Feature

## Overview

The Claim Stakes Simulator now supports manual JSON data loading instead of automatic data loading. This gives you complete control over which game data file is used and allows for easy switching between different data sets.

## Features

### 🔄 Manual Loading
- **File Upload**: Drag and drop or click to browse for JSON files
- **Data Validation**: Automatic validation of JSON structure and required sections
- **Error Handling**: Clear error messages if data is invalid or missing
- **Default Data**: Option to load the built-in game data

### 📊 Data Management
- **Status Display**: Shows loaded sections and item counts
- **Clear & Reload**: Option to clear current data and load new files
- **Standalone Support**: Automatically detects standalone HTML mode

### 🎮 Game Integration
- **Seamless Switching**: Switch between data loader and game interface
- **State Management**: Game state is cleared when switching data files
- **Live Updates**: Game immediately reflects new data when loaded

## How to Use

### Starting the Application

1. **Launch the App**: Open the application in your browser
2. **Data Loader Screen**: You'll see the manual data loading interface
3. **Choose Loading Method**:
   - **Load Default Data**: Click "Load Default Game Data" to use the built-in data
   - **Upload Custom File**: Drag and drop a JSON file or click to browse

### Loading Custom Data

1. **Prepare Your JSON File**:
   - Must be a valid JSON file
   - Must contain required sections: `cargo`, `claimStakeDefinitions`, `claimStakeBuildings`, `planetArchetypes`
   - Follow the existing data structure format

2. **Upload Methods**:
   - **Drag & Drop**: Drag your JSON file directly onto the drop zone
   - **File Browser**: Click the drop zone to open a file browser

3. **Validation**: The system will validate your data and show:
   - ✅ Success message with section counts
   - ❌ Error message if validation fails

### Switching Data During Gameplay

1. **Access Data Loader**: Click the "📊 Load Data" button in the top resource bar
2. **Confirmation**: Your current game progress will be cleared
3. **Load New Data**: Follow the same upload process

### File Requirements

Your JSON file must include these top-level sections:

```json
{
  "cargo": { /* Resource definitions */ },
  "claimStakeDefinitions": { /* Claim stake types */ },
  "claimStakeBuildings": { /* Building definitions */ },
  "planetArchetypes": { /* Planet type definitions */ },
  "planets": { /* Planet instances (optional) */ }
}
```

## Technical Details

### Data Validation

The system checks for:
- **Valid JSON Format**: File must be parseable JSON
- **Required Sections**: All mandatory sections must be present
- **Data Structure**: Basic structure validation

### Supported Formats

- **File Type**: `.json` files only
- **Size Limit**: No specific limit (browser dependent)
- **Encoding**: UTF-8 recommended

### Error Handling

Common error messages:
- `"File must be a JSON file"`: Upload a .json file
- `"Failed to parse JSON"`: Check JSON syntax
- `"Missing required sections"`: Add missing data sections
- `"Invalid JSON: Data must be an object"`: Ensure root level is an object

## Benefits

### For Players
- **Mod Support**: Easy loading of modded game data
- **Version Testing**: Test different data versions
- **Custom Content**: Create and share custom game content

### For Developers
- **Development Workflow**: Test data changes without rebuilding
- **Content Creation**: Rapid iteration on game content
- **Distribution**: Easy sharing of data modifications

## Migration from Auto-Loading

If you were using the previous auto-loading version:

1. **Default Data**: Click "Load Default Game Data" to get the same experience
2. **Custom Data**: Your custom JSON files work the same way
3. **Save Files**: Your existing save files continue to work normally

## Troubleshooting

### Data Won't Load
- Check JSON syntax with a JSON validator
- Ensure all required sections are present
- Verify file has `.json` extension

### Game Crashes After Loading
- Data structure may be incompatible
- Try loading default data first
- Check browser console for detailed errors

### Performance Issues
- Large JSON files may take time to load
- Consider reducing data size if needed
- Clear browser cache if problems persist

## Examples

### Basic Data Structure
```json
{
  "cargo": {
    "cargo-iron-ore": {
      "id": "cargo-iron-ore",
      "name": "Iron Ore",
      "tier": 1
    }
  },
  "claimStakeDefinitions": {
    "claimStakeDefinition-basic": {
      "id": "claimStakeDefinition-basic",
      "name": "Basic Claim Stake",
      "tier": 1,
      "slots": 10
    }
  },
  "claimStakeBuildings": {
    "claimStakeBuilding-central-hub": {
      "id": "claimStakeBuilding-central-hub",
      "name": "Central Hub",
      "tier": 1,
      "power": 10
    }
  },
  "planetArchetypes": {
    "planetArchetype-terrestrial": {
      "name": "Terrestrial Planet",
      "richness": {
        "cargo-iron-ore": 1
      }
    }
  }
}
```

## Support

For issues or questions:
1. Check this documentation first
2. Verify your JSON structure
3. Test with default data
4. Check browser console for errors 