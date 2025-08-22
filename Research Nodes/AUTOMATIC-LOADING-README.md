# Research Nodes Automatic Loading

## Overview
The Research Nodes tool now supports automatic loading of the `research_nodes-careercombatspread.json` file on startup. This eliminates the need to manually load the file each time you open the tool.

## How It Works
When you open the Research Nodes tool, it automatically:
1. Attempts to load `../SAGE Editor Suite/Research Nodes/research_nodes-careercombatspread.json`
2. If successful, loads all nodes, connections, milestones, and tags
3. Centers the view on the loaded nodes
4. Activates simulation mode (🎮) automatically
5. Shows a brief notification confirming the load
6. Restores any collapsed node states from the file

## File Location
The tool expects the research nodes file at:
```
SAGE Editor Suite/Research Nodes/research_nodes-careercombatspread.json
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

2. **Use manual loading**: The File menu (📁 button) works perfectly for local development

3. **Deploy to GitHub Pages**: Automatic loading will work immediately

**Note**: This is NOT a bug - it's a browser security feature. Your code is correct!

## Manual Override
You can still manually load different files using the Load JSON option in the File menu (📁 button) if needed. The automatic loading only happens once on initial page load.

## Features Preserved
The automatic loading preserves all features from manual loading:
- Node positions and properties
- Connections with their types (curved, linear, step, etc.)
- Milestones and tags
- Collapsed/expanded node states
- Parent-child relationships and color inheritance

## Simulation Mode
After successful loading, the tool automatically activates simulation mode, allowing you to:
- Test career progression and XP accumulation
- Unlock skills by spending renown points
- View career progress and statistics
- Control simulation speed (1x, 2x, 4x, 8x)

You can toggle back to edit mode at any time using the 🎮 button in the toolbar.

## Troubleshooting

### File Not Found (404)
- Ensure `research_nodes-careercombatspread.json` exists in the `SAGE Editor Suite/Research Nodes` folder
- Check the file path is exactly `../SAGE Editor Suite/Research Nodes/research_nodes-careercombatspread.json`
- Verify the file is included in your deployment

### Console Messages
The tool provides helpful console messages:
- Success: "Successfully loaded research nodes file"
- File not found: "Failed to load research nodes file: 404"
- CORS error: Detailed explanation with solutions

### Notification Not Showing
The success notification appears briefly at the bottom center of the screen. It disappears after 3 seconds.
