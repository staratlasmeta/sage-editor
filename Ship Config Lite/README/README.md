# Ship Config Lite

Ship Config Lite is a powerful browser-based ship configuration tool for Star Atlas SAGE Labs. It allows players to compare ships, create custom configurations, and optimize builds using a sophisticated component management system.

## 🚀 Key Features

### Core Features
- **Ship Comparison Table**: Compare multiple ships side-by-side with all their stats
- **Configuration Management**: Create, save, and switch between multiple configurations per ship
- **Component System**: Add/remove components, weapons, modules, countermeasures, missiles, and drones
- **Real-time Stat Updates**: See immediate effects of component changes on ship stats
- **Drag & Drop**: Reorder ships in comparison table with intuitive drag-and-drop

### Advanced Features
- **Dual Ship Scoring System**: Comprehensive evaluation with both global (all ships) and class-specific (same size) scores across 6 categories
- **Configuration Pattern Builder**: Create reusable templates for ship builds
- **Batch Pattern Processing**: Generate all pattern configurations automatically
- **Component Attribute Editor**: Customize component stats and scaling formulas
- **CSV Import/Export**: Import configurations from CSV, export for sharing
- **Ship Analysis Suite**: Comprehensive analysis tools for configurations
- **Drone Port Scaling**: Realistic drone deployment based on port sizes
- **Combat Simulator**: Test fleet battles with custom formulas
- **Performance Optimization**: Deferred updates for smooth performance
- **Theme Support**: Light and dark theme options
- **File Separation System**: Save ships individually to reduce main config file size

## 📋 Prerequisites

### Required Files
1. **Ship Stats CSV**: Contains base stats for all ships
2. **Components JSON**: Contains all components, weapons, modules, etc.

### Browser Requirements
- Modern browser with JavaScript enabled
- Chrome, Firefox, Edge, or Safari (latest versions)
- Local file access permissions (for direct file opening)

## 🎮 Getting Started

### 1. Loading the Application
```bash
# Option 1: Direct file access
1. Open index.html directly in your browser

# Option 2: Local server (if file access issues)
npx serve
# or
python -m http.server
```

### 2. Initial Setup
1. Click "File ▾" menu
2. Select "Load Ship Data" and upload your ship stats CSV
3. Select "Load Components" and upload your components JSON
4. Ships will appear in the dropdown menus

### 3. Basic Usage
1. **Add Ships**: Click "Add Ship" and select from dropdown
2. **Create Configuration**: Click ship name → "Add Configuration" 
3. **Edit Configuration**: Click "Edit Config" button
4. **Add Components**: Toggle components on/off in the editor
5. **Compare Stats**: View real-time stat changes in the comparison table

## 🛠️ Features Guide

### Ship Comparison
- Add up to 10+ ships simultaneously
- Drag column headers to reorder ships
- Click stat values to see modification details
- Use "Actions ▾" menu for bulk operations
- View dual ship scores: global (all ships) and class-specific
- Switch between "All Ships" and class-specific category views
- Click scores for detailed breakdown analysis

### Configuration Management
- Each ship can have unlimited configurations
- Configurations are independent and saved separately
- Copy/paste configurations between ships
- Import configurations from CSV files

### Pattern Builder
The Pattern Builder creates reusable configuration templates:

1. Create a "Tier One" base configuration
2. Open Pattern Builder (🔧 button in config editor)
3. Create patterns with actions like:
   - Remove components
   - Convert slot types
   - Fill empty slots
   - Upgrade/downgrade tiers
4. Apply patterns to generate new configurations instantly

[See detailed Pattern Builder documentation](PATTERN-BUILDER-README.md)

### Component Categories
- **Ship Components**: Core systems (power, shields, engines, etc.)
- **Ship Modules**: Cargo, fuel, passenger, ammo modules
- **Ship Weapons**: Energy, kinetic, EMP, heat weapons by firing type
- **Countermeasures**: Defensive systems and utilities
- **Missiles**: Various damage type missiles
- **Drones**: Combat, mining, salvage, and utility drones

### Analysis Tools
Access via "Analysis ▾" menu:
- **Full Configs**: Markdown-formatted configuration details
- **Config Names**: List all configuration names
- **Uniqueness**: Find unique component combinations
- **Component Usage**: Analyze component distribution
- **Similarity**: Compare configuration similarities
- **Performance**: Performance metrics matrix
- **Validation**: Check for configuration issues

## 📁 File Structure

```
Ship Config Lite/
├── index.html              # Main application file
├── styles.css              # Application styles
├── js/                     # JavaScript modules
│   ├── app.js              # Core application logic
│   ├── config-pattern-builder.js   # Pattern builder system
│   ├── comparison-table.js         # Ship comparison table
│   ├── component-management.js     # Component handling
│   ├── file-io.js                  # File import/export
│   └── [other modules...]          # Feature-specific modules
├── Saved/                  # Default saved files location
└── README/                 # Documentation files
```

## 💾 Data Management

### Saving Configurations
- Click "Save Configs" to download configurations as JSON
- Configurations are also saved in browser localStorage
- Each save includes all ships and their configurations

### File Separation System (New!)
- **Save Individual Ships**: Actions menu → "Save Ship JSON" for each ship
- **Batch Save**: Actions ▾ → "Save All Ships as ZIP" or "Save All Ships Individually"
- **Load Ship JSON**: File ▾ → "Load Ship JSON" to import individual ships
- Ships saved separately are excluded from main config file automatically

### Loading Configurations
- Use "File ▾" → "Load Configs" to import saved JSON
- Configurations merge with existing ones (no overwrites)
- Ship identifiers ensure proper configuration matching

### CSV Import Format
```csv
Asset,Type,Subtype,Config,Class,Tier,Qty,Ship Name
Power Core,Component,Core,,XX-Small,T1,1,Ship Name
Shield Generator,Component,Core,,XX-Small,T2,1,Ship Name
```

## ⚡ Performance Tips

1. **Use Refresh Button**: For large changes, wait and click refresh instead of real-time updates
2. **Limit Comparison Ships**: 5-10 ships optimal for performance
3. **Close Unused Panels**: Close config editor when not in use
4. **Batch Operations**: Use batch pattern processing for multiple configs

## 🔧 Troubleshooting

### Common Issues

**"No components found"**
- Ensure components JSON is loaded
- Check browser console for errors
- Verify JSON file format

**Performance lag**
- Enable pending changes mode
- Reduce number of compared ships
- Close configuration editor

**Import failures**
- Verify CSV format matches requirements
- Check component names match loaded database
- Ensure ship compatibility

### Browser-Specific Issues

**Chrome**: If local file access blocked, use `--allow-file-access-from-files` flag
**Firefox**: Generally works without issues
**Safari**: May need to enable developer tools for console access

## 🚀 Advanced Usage

### Custom Attributes
1. Click "Actions ▾" → "Manage Attributes"
2. Add custom stat columns
3. Set default values
4. Reorder by dragging

### Component Attribute Editing
1. Click "Edit Component Attributes" (left panel)
2. Select category and component group
3. Modify base values and scaling formulas
4. Changes apply to all ships immediately

### Drone Port Capacity
- Configure drone deployment limits by port size
- Access via Component Attributes → Scaling Formulas
- Affects drone stat calculations realistically

## 📚 Additional Documentation

- [Modular Architecture](MODULAR-ARCHITECTURE.md) - Code structure and modules
- [Pattern Builder Guide](PATTERN-BUILDER-README.md) - Detailed pattern creation
- [CSV Import Guide](CSV-IMPORT-README.md) - Import format specifications
- [Config Generator](CONFIG-GENERATOR-README.md) - Automated config generation
- [Performance Guide](PERFORMANCE-OPTIMIZATION.md) - Optimization details
- [Ship Scoring System](SHIP-SCORING.md) - Understanding ship evaluation scores
- [Combat Simulator](COMBAT-SIMULATOR.md) - Fleet battle simulation system
- [File Separation System](FILE-SEPARATION.md) - Save ships individually to manage large configs

## 🤝 Contributing

Ship Config Lite is maintained by the Star Atlas community. To contribute:
1. Report issues in the community forums
2. Share configuration patterns
3. Suggest feature improvements
4. Help with documentation

## 📄 License

This tool is provided as-is for the Star Atlas community. Use at your own discretion. 