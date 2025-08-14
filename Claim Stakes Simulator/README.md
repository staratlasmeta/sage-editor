# Claim Stakes Simulator

A resource management simulation game where players purchase, develop, and manage interplanetary claim stakes across different factions and planet types.

## Features

- **Data-Driven Design**: All game content is loaded from JSON data files
- **Multiple Planets & Factions**: Explore different planet types controlled by various factions
- **Resource Management**: Extract, process, and transport resources between claim stakes
- **Building System**: Construct hubs and modules to create efficient production chains
- **Tag System**: Strategic building placement based on tag prerequisites
- **Save/Load System**: Save your progress and continue later

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/claim-stakes-simulator.git
cd claim-stakes-simulator
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The game will be available at http://localhost:3000

## How to Play

1. **Purchase Claim Stakes**: Start by purchasing claim stakes on planets with resources you need
2. **Build Infrastructure**: Construct hubs and modules to extract and process resources
3. **Manage Resources**: Balance resource production, storage, and transfer between claim stakes
4. **Optimize Production**: Upgrade buildings and establish efficient production chains
5. **Expand Operations**: Acquire more claim stakes across different planets and factions

## Save/Load System

The Claim Stakes Simulator includes a comprehensive save/load system:

- **Auto-Save**: The game automatically saves your progress every 5 minutes
- **Manual Save**: Use the save button in the top bar to save your game anytime
- **Multiple Save Files**: Create and manage multiple save files
- **Save Management**: View, load, and delete saved games
- **Save Preview**: See a summary of your saved game before loading

## Game Structure

The game follows a data-driven architecture where all game mechanics and content are defined in JSON data files:

- **Planet Archetypes**: Define resource richness and tags for different planet types
- **Claim Stake Definitions**: Templates for claim stakes that can be purchased
- **Buildings**: Definitions for hubs and modules that can be constructed
- **Resources**: Raw, processed, and advanced resources with their properties

## Development

### Project Structure

- `src/components/`: React components for the UI
- `src/utils/`: Utility functions including the save/load system
- `src/models/`: Game state and data structures
- `src/gameData_allTiers.json`: Main game data file

### Adding Content

To add new content to the game:

1. Edit the `gameData_allTiers.json` file to add new:
   - Planet types
   - Factions
   - Resources
   - Buildings
   - Claim stake definitions

2. The game will automatically load and use the new content without code changes.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
