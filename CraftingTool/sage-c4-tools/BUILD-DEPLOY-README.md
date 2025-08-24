# SAGE C4 Tools - Build & Deployment Guide

## Overview

The SAGE C4 Integrated Tools (Claim Stakes, Crafting Hab, and Crafting Recipes) are built as a Single Page Application (SPA) that integrates with the SAGE Editor Suite. This guide explains how to build and deploy these tools.

## Features

- **Claim Stakes Simulator**: Resource extraction and planetary claim management
- **Crafting Hab Tool**: Starbase-based crafting operations management
- **Crafting Recipes Tool**: Recipe visualization and optimization

## Development

### Running in Development Mode

```bash
cd CraftingTool/sage-c4-tools
npm install
npm run dev
```

The app will be available at `http://localhost:5174` (or the next available port).

## Building for Production

### Build Command

```bash
cd CraftingTool/sage-c4-tools
npm install  # First time only
npm run build:standalone
```

This command will:
1. Build the React app with Vite
2. Inline all JavaScript and CSS into a single HTML file
3. Embed mock data to avoid external fetches
4. Create a standalone HTML file at `dist-standalone/standalone.html` (~470KB)

### Build Output

The build creates the following structure:
```
CraftingTool/sage-c4-tools/dist-standalone/
├── standalone.html     # Single HTML file with everything inlined (~400KB)
├── favicon.ico         # App icon
└── data/              # Game data JSON files (if needed)
```

## Integration with SAGE Editor Suite

### How It Works

1. **Single Page Application**: All three tools (Claim Stakes, Crafting Hab, Crafting Recipes) are part of one SPA
2. **Client-Side Routing**: Navigation between tools is handled by React Router using hash routing
3. **Standalone Build**: The built app can run from `file://` protocol without a server

### Navigation Links

The SAGE Editor Suite home page (`SAGE Editor Suite/index.html`) contains links to the C4 tools:

- **Claim Stakes**: `../CraftingTool/sage-c4-tools/dist-standalone/standalone.html`
- **Crafting Hab**: `../CraftingTool/sage-c4-tools/dist-standalone/standalone.html#crafting-hab`
- **Crafting Recipes**: `../CraftingTool/sage-c4-tools/dist-standalone/standalone.html#recipes`

### Home Button

The Home button in the C4 tools navigates back to the SAGE Editor Suite:
- In production: Returns to `../../SAGE Editor Suite/index.html`
- In development: Shows an alert (since the SAGE Editor Suite is not available on localhost)

## Deployment

### Local Deployment

1. Build the app:
```bash
npm run build:standalone
```

2. **Important Note**: The standalone build may show CORS errors when opened directly with `file://` protocol in some browsers. This is a browser security limitation. The app works correctly when:
   - Served from a web server (even localhost)
   - Deployed to GitHub Pages
   - Opened in a less restrictive browser

   To test locally without CORS issues:
   ```bash
   # Use a simple HTTP server
   npx http-server dist-standalone -p 8080
   # Then open http://localhost:8080/standalone.html
   ```

3. Open the SAGE Editor Suite:
   - Navigate to `SAGE Editor Suite/index.html` in your browser
   - Click on any of the C4 tool cards (Claim Stakes, Crafting Hab, or Crafting Recipes)

### Web Deployment

To deploy on a web server:

1. Build the app as described above
2. Upload the entire `sage-editor` directory to your web server
3. Ensure the relative paths between tools remain intact

### GitHub Pages Deployment

The standalone build is optimized for GitHub Pages:

1. Build the app: `npm run build:standalone`
2. Commit the `dist-standalone/` directory to your repository
3. Push to the main branch
4. The app will be available at `https://[username].github.io/[repo-name]/CraftingTool/sage-c4-tools/dist-standalone/standalone.html`

**Note**: The navigation home button automatically detects GitHub Pages deployment and adjusts paths accordingly.

## Technical Details

### Build Configuration

The build uses:
- **Vite**: Fast build tool with `vite-plugin-singlefile` for inlining
- **React**: UI framework
- **Hash Routing**: Simple hash-based routing for file:// protocol compatibility
- **Single File**: All JavaScript and CSS inlined into one HTML file (~400KB)
- **No External Dependencies**: Works offline once loaded

### Key Files

- `vite.config.ts`: Development build configuration
- `vite.config.standalone.ts`: Standalone build configuration
- `standalone.html`: Entry point for standalone build
- `app/standalone-app.tsx`: Standalone app with hash-based routing
- `app/root.tsx`: Root component for development
- `app/components/Navigation.tsx`: Navigation with home button

## Troubleshooting

### Build Issues

If the build fails:
1. Ensure all dependencies are installed: `npm install`
2. Clear the build cache: `rm -rf dist-standalone/`
3. Try building again: `npm run build:standalone`
4. If terser error occurs: `npm install --save-dev terser`

### Navigation Issues

If navigation between tools doesn't work:
1. Ensure you're using the built version (not the dev server)
2. Check that hash routing is enabled (URLs should have `#/` in them)
3. Verify the relative paths in the SAGE Editor Suite are correct

### Missing Data

If game data doesn't load:
1. Check that the `data/` directory exists in `public/data/`
2. Ensure all JSON files are present and properly formatted
3. Check browser console for loading errors
4. The standalone build embeds data, so network requests shouldn't be needed

## Future Enhancements

- [ ] Progressive Web App (PWA) support
- [ ] Offline functionality
- [ ] Automatic deployment scripts
- [ ] Performance optimizations for large datasets
- [ ] Mobile responsive improvements

## Support

For issues or questions:
1. Check the browser console for errors
2. Ensure you're using a modern browser (Chrome, Firefox, Edge)
3. Verify all files are present in the build directory

---

*Last Updated: January 2025* 