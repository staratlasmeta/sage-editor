# Reward Selector

A web-based tool for organizing and managing progression rewards for games. This application allows you to create nested lists of items with customizable properties based on categories you define.

## Features

- Create hierarchical lists of reward items with unlimited nesting
- Define custom categories and values in a spreadsheet-like interface
- Set properties for each item that dynamically update based on previous selections
- Save and load your reward structures to/from local files

## Getting Started

1. Download all files (index.html, styles.css, app.js) to a directory on your computer
2. Open the index.html file in a modern web browser (Chrome, Firefox, Edge, etc.)

## How to Use

### Categories Tab

1. Use the Categories tab to define the properties and values available for your items
2. Each column represents a category (e.g., Category, Class, Rarity, Tier)
3. Each row contains values for those categories
4. Add new categories with the "Add Column" button
5. Add new values with the "Add Row" button
6. Edit any cell by clicking on it

### Rewards List Tab

1. Create a new root item by clicking "Add Root Item"
2. Add child items using the "Add" button on any existing item
3. Delete items (and their children) using the "Delete" button
4. Expand or collapse nested items using the arrow buttons
5. Click on any item to edit its properties in the right panel
6. In the properties panel:
   - Edit the item name
   - Add properties from categories you've defined
   - Select values for each property from the available options
   - Remove properties as needed

### Saving and Loading

- Click "Save" to download your reward structure as a JSON file
- Click "Load" to upload a previously saved reward structure

## Example Structure

The application comes pre-loaded with an example structure based on ship components with properties like:
- Category (Ship, Crew, Weapon, etc.)
- Class (XXS, XS, S, M, L, etc.)
- Rarity (Common, Uncommon, Rare, etc.)
- Tier (0-6, Exotic)

You can modify these or create entirely new categories to suit your specific game needs.

## Notes

- All data is stored locally in your browser and in saved files
- No data is sent to any server
- For best performance, keep reward structures reasonably sized 