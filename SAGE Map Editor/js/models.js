// models.js - Data models and constants

// Star types
const STAR_TYPES = [
    { type: 0, name: "White Dwarf" },
    { type: 1, name: "Red Dwarf" },
    { type: 2, name: "Solar" },        // Assuming this is the yellow/G-type star
    { type: 3, name: "Hot Blue" },
    { type: 4, name: "Red Giant" },
    { type: 5, name: "Blue Giant" },
    { type: 6, name: "Blue Supergiant" },
    { type: 7, name: "Yellow Giant" },
    { type: 8, name: "Orange Dwarf" },
    { type: 9, name: "Brown Dwarf" },
    { type: 10, name: "Neutron Star" },
    { type: 11, name: "Black Hole" },
    { type: 12, name: "Pulsar" },
    { type: 13, name: "Binary Pulsar" },
    { type: 14, name: "Magnetar" },
    { type: 15, name: "Protostar" },
    { type: 16, name: "T Tauri" },
    { type: 17, name: "Wolf-Rayet" },
    { type: 18, name: "Cepheid Variable" },
    { type: 19, name: "Blue-White Dwarf" }
];

// Planet types
const PLANET_TYPES = [
    // ONI Planet Types
    { type: 0, name: "ONI Terrestrial Planet", defaultScale: 0.3, faction: "ONI" },
    { type: 1, name: "ONI Volcanic Planet", defaultScale: 0.2, faction: "ONI" },
    { type: 2, name: "ONI Barren Planet", defaultScale: 0.1, faction: "ONI" },
    { type: 3, name: "ONI System Asteroid Belt", defaultScale: 0.5, faction: "ONI" },
    { type: 4, name: "ONI Gas Giant", defaultScale: 0.4, faction: "ONI" },
    { type: 5, name: "ONI Ice Giant", defaultScale: 0.4, faction: "ONI" },
    { type: 6, name: "ONI Dark Planet", defaultScale: 0.3, faction: "ONI" },
    { type: 7, name: "ONI Oceanic Planet", defaultScale: 0.3, faction: "ONI" },

    // MUD Planet Types
    { type: 8, name: "MUD Terrestrial Planet", defaultScale: 0.3, faction: "MUD" },
    { type: 9, name: "MUD Volcanic Planet", defaultScale: 0.2, faction: "MUD" },
    { type: 10, name: "MUD Barren Planet", defaultScale: 0.1, faction: "MUD" },
    { type: 11, name: "MUD System Asteroid Belt", defaultScale: 0.5, faction: "MUD" },
    { type: 12, name: "MUD Gas Giant", defaultScale: 0.4, faction: "MUD" },
    { type: 13, name: "MUD Ice Giant", defaultScale: 0.4, faction: "MUD" },
    { type: 14, name: "MUD Dark Planet", defaultScale: 0.3, faction: "MUD" },
    { type: 15, name: "MUD Oceanic Planet", defaultScale: 0.3, faction: "MUD" },

    // USTUR Planet Types
    { type: 16, name: "USTUR Terrestrial Planet", defaultScale: 0.3, faction: "USTUR" },
    { type: 17, name: "USTUR Volcanic Planet", defaultScale: 0.2, faction: "USTUR" },
    { type: 18, name: "USTUR Barren Planet", defaultScale: 0.1, faction: "USTUR" },
    { type: 19, name: "USTUR System Asteroid Belt", defaultScale: 0.5, faction: "USTUR" },
    { type: 20, name: "USTUR Gas Giant", defaultScale: 0.4, faction: "USTUR" },
    { type: 21, name: "USTUR Ice Giant", defaultScale: 0.4, faction: "USTUR" },
    { type: 22, name: "USTUR Dark Planet", defaultScale: 0.3, faction: "USTUR" },
    { type: 23, name: "USTUR Oceanic Planet", defaultScale: 0.3, faction: "USTUR" },

    // Neutral Planet Types
    { type: 24, name: "Neutral Terrestrial Planet", defaultScale: 0.3, faction: "Neutral" },
    { type: 25, name: "Neutral Volcanic Planet", defaultScale: 0.2, faction: "Neutral" },
    { type: 26, name: "Neutral Barren Planet", defaultScale: 0.1, faction: "Neutral" },
    { type: 27, name: "Neutral System Asteroid Belt", defaultScale: 0.5, faction: "Neutral" },
    { type: 28, name: "Neutral Gas Giant", defaultScale: 0.4, faction: "Neutral" },
    { type: 29, name: "Neutral Ice Giant", defaultScale: 0.4, faction: "Neutral" },
    { type: 30, name: "Neutral Dark Planet", defaultScale: 0.3, faction: "Neutral" },
    { type: 31, name: "Neutral Oceanic Planet", defaultScale: 0.3, faction: "Neutral" }
];

// Planet tier definitions
const PLANET_TIERS = {
    // USTUR variants
    "USTUR Terrestrial Planet": 1,
    "USTUR Volcanic Planet": 2,
    "USTUR Barren Planet": 1,
    "USTUR System Asteroid Belt": 2,
    "USTUR Gas Giant": 3,
    "USTUR Ice Giant": 4,
    "USTUR Dark Planet": 5,
    "USTUR Oceanic Planet": 3,

    // MUD variants
    "MUD Terrestrial Planet": 1,
    "MUD Volcanic Planet": 2,
    "MUD Barren Planet": 1,
    "MUD System Asteroid Belt": 2,
    "MUD Gas Giant": 3,
    "MUD Ice Giant": 4,
    "MUD Dark Planet": 5,
    "MUD Oceanic Planet": 3,

    // ONI variants
    "ONI Terrestrial Planet": 1,
    "ONI Volcanic Planet": 2,
    "ONI Barren Planet": 1,
    "ONI System Asteroid Belt": 2,
    "ONI Gas Giant": 3,
    "ONI Ice Giant": 4,
    "ONI Dark Planet": 5,
    "ONI Oceanic Planet": 3,

    // Neutral variants
    "Neutral Terrestrial Planet": 1,
    "Neutral Volcanic Planet": 2,
    "Neutral Barren Planet": 1,
    "Neutral System Asteroid Belt": 2,
    "Neutral Gas Giant": 3,
    "Neutral Ice Giant": 4,
    "Neutral Dark Planet": 5,
    "Neutral Oceanic Planet": 3
};

// Resource types - updated to match exact data from recipes.json
const RESOURCE_TYPES = [
    { type: 0, name: "Magmaroot", richness: 1, planetTypes: ["Volcanic"] },
    { type: 1, name: "Pyroclast Energen", richness: 1, planetTypes: ["Volcanic"] },
    { type: 2, name: "Blazing Snapdragon", richness: 2, planetTypes: ["Volcanic"] },
    { type: 3, name: "Tidal Kelp", richness: 1, planetTypes: ["Oceanic"] },
    { type: 4, name: "Bioluminous Algae", richness: 2, planetTypes: ["Oceanic"] },
    { type: 5, name: "Shadowmoss", richness: 1, planetTypes: ["Dark"] },
    { type: 6, name: "Spectral Lichen", richness: 2, planetTypes: ["Dark"] },
    { type: 7, name: "Ironshell Cactus", richness: 1, planetTypes: ["Barren"] },
    { type: 8, name: "Bastion Agave", richness: 2, planetTypes: ["Barren"] },
    { type: 9, name: "Swiftvine", richness: 2, planetTypes: ["Terrestrial"] },
    { type: 10, name: "Electric Fern", richness: 2, planetTypes: ["Terrestrial"] },
    { type: 11, name: "Temporal Flux Orchid", richness: 2, planetTypes: ["Terrestrial"] },
    { type: 12, name: "Frostcore Bryophyte", richness: 3, planetTypes: ["Ice Giant"] },
    { type: 13, name: "Mind Shade Fungus", richness: 3, planetTypes: ["Dark"] },
    { type: 14, name: "Aegis Barrier Cactus", richness: 3, planetTypes: ["Barren"] },
    { type: 15, name: "Abyssal Energy Crystals", richness: 4, planetTypes: ["Oceanic"] },
    { type: 16, name: "Aluminum Ore", richness: 2, planetTypes: ["System Asteroid Belt", "Ice Giant", "Barren"] },
    { type: 17, name: "Arco", richness: 1, planetTypes: ["Terrestrial", "Barren", "Gas Giant"] },
    { type: 18, name: "Argon", richness: 2, planetTypes: ["Gas Giant", "Dark", "Ice Giant"] },
    { type: 19, name: "Bathysphere Pearls", richness: 3, planetTypes: ["Oceanic"] },
    { type: 20, name: "Beryllium Crystals", richness: 5, planetTypes: ["Dark", "Ice Giant"] },
    { type: 21, name: "Biomass", richness: 1, planetTypes: ["Terrestrial", "Oceanic"] },
    { type: 22, name: "Boron Ore", richness: 2, planetTypes: ["Barren", "Gas Giant"] },
    { type: 23, name: "Carbon", richness: 1, planetTypes: ["System Asteroid Belt", "Volcanic", "Dark"] },
    { type: 24, name: "Chromite Ore", richness: 1, planetTypes: ["Oceanic", "Ice Giant", "Dark"] },
    { type: 25, name: "Copper Ore", richness: 1, planetTypes: ["Terrestrial", "System Asteroid Belt", "Oceanic"] },
    { type: 26, name: "Cryo Formation Crystals", richness: 3, planetTypes: ["Ice Giant"] },
    { type: 27, name: "Diamond", richness: 3, planetTypes: ["Volcanic", "Barren", "Dark"] },
    { type: 28, name: "Dodiline Crystals", richness: 4, planetTypes: ["Volcanic"] },
    { type: 29, name: "Drywater", richness: 3, planetTypes: ["Ice Giant", "Barren"] },
    { type: 30, name: "Dysprosium Ore", richness: 4, planetTypes: ["Terrestrial"] },
    { type: 31, name: "Emerald Crystals", richness: 3, planetTypes: ["Dark"] },
    { type: 32, name: "Fluorine Gas", richness: 2, planetTypes: ["Gas Giant", "Volcanic", "Ice Giant"] },
    { type: 33, name: "Fusion Catalyst Deposits", richness: 5, planetTypes: ["Dark"] },
    { type: 34, name: "Garnet Crystals", richness: 2, planetTypes: ["System Asteroid Belt", "Ice Giant"] },
    { type: 35, name: "Germanium Ore", richness: 4, planetTypes: ["System Asteroid Belt", "Ice Giant", "Gas Giant"] },
    { type: 36, name: "Gold Ore", richness: 3, planetTypes: ["Terrestrial"] },
    { type: 37, name: "Hafnium Ore", richness: 2, planetTypes: ["System Asteroid Belt", "Ice Giant", "Barren"] },
    { type: 38, name: "Hicenium Crystals", richness: 4, planetTypes: ["Ice Giant"] },
    { type: 39, name: "Hydrogen", richness: 1, planetTypes: ["Gas Giant", "Ice Giant", "Oceanic"] },
    { type: 41, name: "Iridium Ore", richness: 4, planetTypes: ["Volcanic"] },
    { type: 42, name: "Iron Ore", richness: 1, planetTypes: ["Terrestrial", "System Asteroid Belt", "Barren"] },
    { type: 43, name: "Jasphorus Crystals", richness: 5, planetTypes: ["Barren"] },
    { type: 44, name: "Krypton", richness: 1, planetTypes: ["Gas Giant", "Ice Giant"] },
    { type: 45, name: "Lithium Ore", richness: 2, planetTypes: ["Barren", "Dark"] },
    { type: 46, name: "Living Metal Symbionts", richness: 5, planetTypes: ["Dark"] },
    { type: 47, name: "Lumanite", richness: 1, planetTypes: ["Volcanic", "Dark", "Ice Giant"] },
    { type: 48, name: "Lunar Echo Crystals", richness: 5, planetTypes: ["Oceanic"] },
    { type: 49, name: "Manganese Ore", richness: 2, planetTypes: ["System Asteroid Belt", "Volcanic", "Gas Giant"] },
    { type: 50, name: "Methane", richness: 2, planetTypes: ["Gas Giant", "Ice Giant", "Dark"] },
    { type: 51, name: "Nanosil", richness: 3, planetTypes: ["System Asteroid Belt", "Dark"] },
    { type: 52, name: "Neodymium Ore", richness: 1, planetTypes: ["System Asteroid Belt", "Volcanic"] },
    { type: 53, name: "Neon", richness: 3, planetTypes: ["Dark", "Gas Giant"] },
    { type: 54, name: "Neural Coral Compounds", richness: 3, planetTypes: ["Oceanic"] },
    { type: 55, name: "Nitrogen", richness: 1, planetTypes: ["Terrestrial", "Gas Giant", "Ice Giant"] },
    { type: 56, name: "Osmium Ore", richness: 1, planetTypes: ["System Asteroid Belt", "Dark"] },
    { type: 57, name: "Oxygen", richness: 2, planetTypes: ["Terrestrial", "Oceanic", "Ice Giant"] },
    { type: 58, name: "Palladium Ore", richness: 3, planetTypes: ["Volcanic"] },
    { type: 59, name: "Peridot Crystals", richness: 2, planetTypes: ["Ice Giant", "Volcanic"] },
    { type: 60, name: "Phase Shift Crystals", richness: 3, planetTypes: ["Oceanic"] },
    { type: 61, name: "Plasma Containment Minerals", richness: 3, planetTypes: ["Volcanic"] },
    { type: 62, name: "Platinum Ore", richness: 3, planetTypes: ["Volcanic"] },
    { type: 63, name: "Quantum Computational Substrate", richness: 4, planetTypes: ["Dark"] },
    { type: 64, name: "Quantum Particle", richness: 5, planetTypes: ["Dark", "Ice Giant"] },
    { type: 65, name: "Quartz Crystals", richness: 1, planetTypes: ["Terrestrial", "Oceanic", "Ice Giant"] },
    { type: 66, name: "Raw Chisenic", richness: 3, planetTypes: ["Dark"] },
    { type: 67, name: "Resonium Ore", richness: 5, planetTypes: ["Barren"] },
    { type: 68, name: "Rhenium Ore", richness: 1, planetTypes: ["Volcanic", "Barren", "Gas Giant"] },
    { type: 69, name: "Rhodium Ore", richness: 4, planetTypes: ["Volcanic"] },
    { type: 70, name: "Rochinol", richness: 2, planetTypes: ["Volcanic", "Ice Giant", "Gas Giant"] },
    { type: 71, name: "Ruby Crystals", richness: 2, planetTypes: ["Ice Giant", "Dark", "Barren"] },
    { type: 72, name: "Sapphire Crystals", richness: 3, planetTypes: ["Ice Giant"] },
    { type: 73, name: "Scandium Ore", richness: 2, planetTypes: ["System Asteroid Belt", "Gas Giant"] },
    { type: 74, name: "Silica", richness: 1, planetTypes: ["Terrestrial", "System Asteroid Belt", "Volcanic"] },
    { type: 75, name: "Silicon Crystal", richness: 1, planetTypes: ["Oceanic", "Ice Giant"] },
    { type: 76, name: "Silver Ore", richness: 2, planetTypes: ["Dark", "Barren", "Gas Giant"] },
    { type: 77, name: "Sodium Crystals", richness: 1, planetTypes: ["Volcanic", "Barren", "Gas Giant"] },
    { type: 78, name: "Strontium Crystals", richness: 5, planetTypes: ["System Asteroid Belt"] },
    { type: 79, name: "Tantalum Ore", richness: 1, planetTypes: ["Volcanic", "Barren", "Dark"] },
    { type: 80, name: "Tenon Gas", richness: 3, planetTypes: ["Gas Giant"] },
    { type: 81, name: "Thermal Regulator Stone", richness: 1, planetTypes: ["Volcanic", "Barren", "Terrestrial"] },
    { type: 82, name: "Thermodyne", richness: 2, planetTypes: ["Oceanic", "Volcanic"] },
    { type: 83, name: "Thermoplastic Resin", richness: 3, planetTypes: ["Terrestrial", "Volcanic"] },
    { type: 84, name: "Tin Ore", richness: 1, planetTypes: ["Terrestrial", "Oceanic"] },
    { type: 85, name: "Titanium Ore", richness: 3, planetTypes: ["System Asteroid Belt"] },
    { type: 86, name: "Topaz Crystals", richness: 2, planetTypes: ["Dark", "Ice Giant", "Barren"] },
    { type: 87, name: "Tritium Ore", richness: 1, planetTypes: ["System Asteroid Belt", "Oceanic", "Ice Giant"] },
    { type: 88, name: "Tungsten Ore", richness: 3, planetTypes: ["Barren"] },
    { type: 89, name: "Vanadium Ore", richness: 3, planetTypes: ["Barren"] },
    { type: 90, name: "Viscovite Crystals", richness: 3, planetTypes: ["Dark"] },
    { type: 91, name: "Xenon", richness: 2, planetTypes: ["Gas Giant", "Ice Giant", "Dark"] },
    { type: 92, name: "Zinc Ore", richness: 1, planetTypes: ["Terrestrial", "System Asteroid Belt"] },
    { type: 93, name: "Zirconium Ore", richness: 4, planetTypes: ["Ice Giant"] }
];

// Resource color mapping - updated with all resources from specification
const RESOURCE_COLORS = {
    // Organic Resources
    'magmaroot': '#FF4500',                      // Orange Red
    'pyroclast energen': '#DC143C',              // Crimson
    'blazing snapdragon': '#FF6347',             // Tomato
    'tidal kelp': '#008B8B',                     // Dark Cyan
    'bioluminous algae': '#00CED1',              // Dark Turquoise
    'shadowmoss': '#2F4F4F',                     // Dark Slate Gray
    'spectral lichen': '#9370DB',                // Medium Purple
    'ironshell cactus': '#8B4513',               // Saddle Brown
    'bastion agave': '#228B22',                  // Forest Green
    'swiftvine': '#32CD32',                      // Lime Green
    'electric fern': '#7FFF00',                  // Chartreuse
    'temporal flux orchid': '#9932CC',           // Dark Orchid
    'frostcore bryophyte': '#87CEEB',            // Sky Blue
    'mind shade fungus': '#4B0082',              // Indigo
    'aegis barrier cactus': '#556B2F',           // Dark Olive Green

    // Oceanic Resources
    'abyssal energy crystals': '#00CED1',        // Dark Turquoise
    'bathysphere pearls': '#F0F8FF',             // Alice Blue
    'lunar echo crystals': '#E6E6FA',            // Lavender
    'neural coral compounds': '#FF7F50',         // Coral
    'phase shift crystals': '#9370DB',           // Medium Purple

    // Basic Resources
    'aluminum ore': '#848482',                   // Gray
    'arco': '#FF6347',                           // Tomato
    'argon': '#F0F8FF',                          // Alice Blue
    'beryllium crystals': '#6A5ACD',             // Slate Blue
    'biomass': '#228B22',                        // Forest Green
    'boron ore': '#556B2F',                      // Dark Olive Green
    'carbon': '#696969',                         // Dim Gray
    'chromite ore': '#2F4F4F',                   // Dark Slate Gray
    'copper ore': '#B87333',                     // Copper
    'cryo formation crystals': '#87CEEB',        // Sky Blue
    'diamond': '#B9F2FF',                        // Diamond Blue
    'dodiline crystals': '#9400D3',              // Dark Violet
    'drywater': '#87CEEB',                       // Sky Blue
    'dysprosium ore': '#CD853F',                 // Peru
    'emerald crystals': '#50C878',               // Emerald Green
    'fluorine gas': '#98FB98',                   // Pale Green
    'fusion catalyst deposits': '#FF00FF',       // Magenta
    'garnet crystals': '#800000',                // Maroon
    'germanium ore': '#778899',                  // Light Slate Gray
    'gold ore': '#FFD700',                       // Gold
    'hafnium ore': '#B8860B',                    // Dark Goldenrod
    'hicenium crystals': '#00CED1',              // Dark Turquoise
    'hydrogen': '#E6F3FF',                       // Light Blue
    'iridium ore': '#C0C0C0',                    // Silver
    'iron ore': '#A0522D',                       // Sienna
    'jasphorus crystals': '#FF69B4',             // Hot Pink
    'krypton': '#F8F8FF',                        // Ghost White
    'lithium ore': '#FF69B4',                    // Hot Pink
    'living metal symbionts': '#00FF00',         // Lime
    'lumanite': '#DAA520',                       // Goldenrod
    'manganese ore': '#800000',                  // Maroon
    'methane': '#F5FFFA',                        // Mint Cream
    'nanosil': '#A9A9A9',                        // Dark Gray
    'neodymium ore': '#FF69B4',                  // Hot Pink
    'neon': '#FFE4E1',                           // Misty Rose
    'nitrogen': '#E6E6FA',                       // Lavender
    'osmium ore': '#2F4F4F',                     // Dark Slate Gray
    'oxygen': '#E6F3FF',                         // Light Blue
    'palladium ore': '#C0C0C0',                  // Silver
    'peridot crystals': '#98FB98',               // Pale Green
    'plasma containment minerals': '#FF4500',    // Orange Red
    'platinum ore': '#E5E4E2',                   // Platinum
    'quantum computational substrate': '#9932CC', // Dark Orchid
    'quantum particle': '#8A2BE2',               // Blue Violet
    'quartz crystals': '#F0FFFF',                // Azure
    'raw chisenic': '#8B4513',                   // Saddle Brown
    'resonium ore': '#9370DB',                   // Medium Purple
    'rhenium ore': '#708090',                    // Slate Gray
    'rhodium ore': '#CD7F32',                    // Bronze
    'rochinol': '#8B4513',                       // Saddle Brown
    'ruby crystals': '#FF0000',                  // Red
    'sapphire crystals': '#0000FF',              // Blue
    'scandium ore': '#4682B4',                   // Steel Blue
    'silica': '#F5F5F5',                         // White Smoke
    'silicon crystal': '#A9A9A9',                // Dark Gray
    'silver ore': '#C0C0C0',                     // Silver
    'sodium crystals': '#FFB6C1',                // Light Pink
    'strontium crystals': '#FF69B4',             // Hot Pink
    'tantalum ore': '#2F4F4F',                   // Dark Slate Gray
    'tenon gas': '#E6E6FA',                      // Lavender
    'thermal regulator stone': '#696969',        // Dim Gray
    'thermodyne': '#DAA520',                     // Goldenrod
    'thermoplastic resin': '#DAA520',            // Goldenrod
    'tin ore': '#B8860B',                        // Dark Goldenrod
    'titanium ore': '#778899',                   // Light Slate Gray
    'topaz crystals': '#FFD700',                 // Gold
    'tritium ore': '#008080',                    // Teal
    'tungsten ore': '#4A4A4A',                   // Dark Gray
    'vanadium ore': '#6B8E23',                   // Olive Drab
    'viscovite crystals': '#9932CC',             // Dark Orchid
    'xenon': '#F5F5F5',                          // White Smoke
    'zinc ore': '#C0C0C0',                       // Silver
    'zirconium ore': '#B8860B',                  // Dark Goldenrod

    'default': '#CCCCCC'                         // Default grey if not found
};

// Region display state
const regionDisplayState = {
    polygon: true,
    name: true,
    systemCount: true,
    coreSystemCount: true,
    area: true,
    avgDistance: true
};

// Region colors
const REGION_COLORS = [
    '#FF5733', '#33FF57', '#3357FF', '#F033FF', '#FF33A8',
    '#33FFF5', '#FFD733', '#8C33FF', '#FF8C33', '#33FFBD',
    '#3390FF', '#CEFF33'
];

// Grid spacing
const GALAXY_GRID_SPACING = 1; // Changed from 10 to 1

// Export RESOURCE_COLORS globally for canvas drawing
window.RESOURCE_COLORS = RESOURCE_COLORS;
