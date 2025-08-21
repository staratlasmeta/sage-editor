# Automatic Configuration Loading

The Ship Config Lite app now supports automatic loading of configuration files when the app starts. This feature saves time by automatically loading your ship configurations and component data.

## What Gets Loaded Automatically

1. **Main Configuration File**: `../SAGE Editor Suite/Ship Configurator/ship_configurations-combatv5.json`
   - Contains ship configurations, components, and all app settings
   - Loads automatically when the app starts

2. **Individual Ship Files**: All JSON files in `../SAGE Editor Suite/Ship Configurator/ships/`
   - Requires a manifest file (see setup below)
   - Loads after the main configuration file

## Setup for Individual Ship File Loading

Since browsers cannot directly list directory contents, you need to generate a manifest file:

### Step 1: Generate the Manifest

1. Open a terminal/command prompt
2. Navigate to the Ship Configurator folder:
   ```bash
   cd "SAGE Editor Suite/Ship Configurator"
   ```
3. Run the manifest generator:
   ```bash
   node generate-ship-manifest.js
   ```
4. This creates `ship-manifest.json` listing all ship files

### Step 2: Update the Manifest

Whenever you add or remove ship files:
- Re-run `node generate-ship-manifest.js`
- The app will use the updated manifest on next load

## How It Works

When you open Ship Config Lite:

1. The app initializes
2. Attempts to load `ship_configurations-combatv5.json`
3. If successful, processes all configurations and components
4. Attempts to load `ship-manifest.json`
5. If found, loads all individual ship files listed
6. Shows a notification when loading is complete

## Fallback Options

If automatic loading fails:
- You'll see console messages explaining what happened
- Use the File menu to manually load files:
  - **File > Load Configs**: Load configuration files
  - **File > Load Ship JSON**: Load individual ship files
  - **File > Load Components**: Load component data
  - **File > Load Ship Stats**: Load ship statistics

## File Paths

The automatic loader expects files at these relative paths:
- Main config: `../SAGE Editor Suite/Ship Configurator/ship_configurations-combatv5.json`
- Ship manifest: `../SAGE Editor Suite/Ship Configurator/ship-manifest.json`
- Ship files: `../SAGE Editor Suite/Ship Configurator/ships/*.json`

If your files are in different locations, use the manual File menu options.

## Troubleshooting

### "Failed to load main configuration file"
- Check that `ship_configurations-combatv5.json` exists in the expected location
- Verify the file path is correct relative to the Ship Config Lite folder
- Check browser console for CORS errors if loading from a file:// URL

### "No ship manifest found"
- Run `node generate-ship-manifest.js` in the Ship Configurator folder
- Ensure Node.js is installed on your system
- Check that the ships subfolder exists and contains JSON files

### CORS Errors (Local Development)
When running from `file://` URLs, browsers block fetch requests for security:

**This is expected and normal!** The automatic loading will work perfectly when:
- Deployed to GitHub Pages
- Served from any web server (http:// or https://)
- Running via a local development server

**Solutions for local development:**
1. **Use a local web server** (Recommended):
   ```bash
   # Python
   python -m http.server 8000
   
   # Node.js
   npx http-server -p 8000
   
   # VS Code
   Install "Live Server" extension and right-click → "Open with Live Server"
   ```

2. **Use manual loading**: The File menu works perfectly for local development

3. **Deploy to GitHub Pages**: Automatic loading will work immediately

**Note**: This is NOT a bug - it's a browser security feature. Your code is correct!

## Benefits

- **Faster Startup**: No need to manually load files each time
- **Consistent State**: Always loads the same configuration
- **Batch Loading**: Loads all ship files at once
- **Progress Tracking**: See loading progress in the console
- **Error Handling**: Graceful fallback to manual loading
