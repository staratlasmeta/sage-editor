# Loot Matrix Automatic Loading

## Overview
The Loot Matrix tool now supports automatic loading of the `all-crafts.json` file on startup. This eliminates the need to manually load the file each time you open the tool.

## How It Works
When you open the Loot Matrix tool, it automatically:
1. Attempts to load `../SAGE Editor Suite/Loot Matrix/all-crafts.json`
2. If successful, populates the reward tree and categories
3. Shows a brief notification confirming the load
4. Updates the document name to "all-crafts"
5. Only falls back to localStorage data if the automatic load fails

## File Location
The tool expects the crafts file at:
```
SAGE Editor Suite/Loot Matrix/all-crafts.json
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

2. **Use manual loading**: The Load button works perfectly for local development

3. **Deploy to GitHub Pages**: Automatic loading will work immediately

**Note**: This is NOT a bug - it's a browser security feature. Your code is correct!

## Manual Override
You can still manually load different files using the Load button if needed. The automatic loading only happens once on initial page load.

## Troubleshooting

### File Not Found (404)
- Ensure `all-crafts.json` exists in the `SAGE Editor Suite/Loot Matrix` folder
- Check the file path is exactly `../SAGE Editor Suite/Loot Matrix/all-crafts.json`
- Verify the file is included in your deployment

### Console Messages
The tool provides helpful console messages:
- Success: "Successfully loaded crafts file"
- File not found: "Failed to load crafts file: 404"
- CORS error: Detailed explanation with solutions

### Notification Not Showing
The success notification appears briefly at the bottom center of the screen. It disappears after 3 seconds.
