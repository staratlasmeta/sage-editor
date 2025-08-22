# SAGE Map Editor Automatic Loading

## Overview
The SAGE Map Editor now supports automatic loading of the `69regions-v8.json` file on startup. This eliminates the need to manually import the map each time you open the tool.

## How It Works
When you open the Map Editor, it automatically:
1. Initializes the editor interface
2. Sets up all filters (initially enabled)
3. Loads `../SAGE Editor Suite/Map Editor/69regions-v8.json`
4. Configures filters to show only regional view elements
5. Renders the galaxy map with 69 regions
6. Shows a notification confirming the load

## Configured Filters
After loading, only these regional filters are enabled:
- **Regional Polygon**: Shows the polygon boundaries of regions
- **Regional Name**: Displays region names on the map
- **Region Membership Circles**: Shows circles around systems that belong to regions

All other filters (resources, system labels, etc.) are turned off for a clean regional view.

## File Location
The tool expects the map file at:
```
SAGE Editor Suite/Map Editor/69regions-v8.json
```

## Local Development

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

2. **Use manual loading**: The Import button works perfectly for local development

3. **Deploy to GitHub Pages**: Automatic loading will work immediately

**Note**: This is NOT a bug - it's a browser security feature. Your code is correct!

## Manual Override
You can still:
- Import different maps using the Import button
- Change filter settings using the Filter tab
- Create new maps with the New button

The automatic loading only happens once on initial page load.

## Filter Management
To change which filters are visible after loading:
1. Click the Filter tab in the right panel
2. Use the checkboxes to enable/disable specific filters
3. Use "Select All" or "Select None" for bulk changes

## Troubleshooting

### Map Not Loading
- Ensure `69regions-v8.json` exists in the correct location
- Check browser console for error messages
- Verify you're not running from `file://` protocol

### Wrong Filters Showing
- The filter configuration happens after map loading
- Check console for "Configuring filters for regional view..." message
- Manually adjust filters using the Filter tab if needed

### Performance Issues
- The 69 regions map is large and may take a moment to render
- The import progress loader will show loading stages
- Initial render may be slower on older devices
