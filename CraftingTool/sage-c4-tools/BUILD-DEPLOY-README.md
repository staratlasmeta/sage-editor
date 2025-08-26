# Build and Deploy Instructions

## Development Build
```bash
npm run dev
```
- Loads data from `/public/data/` directory
- Hot reload enabled
- Uses `DataContext.tsx` → `DataLoader.ts`

## Standalone Build & Deploy
```bash
npm run build:standalone
npm run copy:suite
```
- Builds standalone HTML with inlined JS/CSS
- Copies `standalone.html` → `SAGE Editor Suite/c4-tools.html`
- **IMPORTANT**: Also copies `/dist-standalone/data/` → `SAGE Editor Suite/data/`
- Uses `StandaloneDataContext.tsx` → `StandaloneDataLoader.ts`

## Data Synchronization

Both dev and standalone builds use the same data files:

### Primary Data Source: `/public/data/mockData.json`
- 9 planets with full resource definitions
- 50+ buildings with tier variants
- Complete resource definitions
- Starbase configurations

### Recipe Data: `/public/data/mockRecipes.csv`
- 34 crafting recipes
- CSV format with ingredients and outputs
- Loaded and parsed by both builds

### Data Loading Priority:
1. First tries to load `mockData.json`
2. Falls back to individual JSON files if needed
3. Only uses embedded mock data as last resort

## File Structure
```
CraftingTool/sage-c4-tools/
├── public/
│   └── data/                    # Source data files
│       ├── mockData.json       # Main data file (9 planets, 50+ buildings)
│       ├── mockRecipes.csv     # Recipe definitions (34 recipes)
│       └── ...other files
├── dist-standalone/
│   ├── standalone.html         # Built standalone app
│   └── data/                   # Copied from public/data during build
└── ...

SAGE Editor Suite/
├── c4-tools.html               # Deployed standalone app
└── data/                       # Data files for standalone
    ├── mockData.json
    ├── mockRecipes.csv
    └── ...
```

## Ensuring Data Consistency

1. **Always edit data in `/public/data/`** - This is the source of truth
2. **Build process automatically copies data** - The `publicDir: 'public'` in vite config ensures data is included
3. **Deploy script copies everything** - `copy-to-suite.js` copies both HTML and data folder

## Troubleshooting

If standalone shows different data than dev:
1. Check if `SAGE Editor Suite/data/` exists
2. Run `npm run build:standalone` then `npm run copy:suite`
3. Hard refresh the browser (Ctrl+F5)
4. Check browser console for data loading errors

## Quick Deploy Command
```bash
npm run build:standalone && npm run copy:suite
```
This ensures both the app and data are deployed together. 