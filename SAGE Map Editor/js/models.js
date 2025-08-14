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
    { type: 23, name: "USTUR Oceanic Planet", defaultScale: 0.3, faction: "USTUR" }
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
    "ONI Oceanic Planet": 3
};

// Resource types - completely updated to match the new list
const RESOURCE_TYPES = [
    { type: 0, name: "Abyssal Chromite", richness: 1, planetTypes: ["Oceanic Planet"] },
    { type: 1, name: "Abyssal Energy Crystals", richness: 4, planetTypes: ["Oceanic Planet"] },
    { type: 2, name: "Aluminum Ore", richness: 2, planetTypes: ["System Asteroid Belt", "Terrestrial Planet"] },
    { type: 3, name: "Germanium", richness: 1, planetTypes: ["Dark Planet", "Ice Giant"] },
    { type: 4, name: "Arco", richness: 1, planetTypes: ["Barren Planet", "Dark Planet", "Ice Giant", "Volcanic Planet"] },
    { type: 5, name: "Argon", richness: 2, planetTypes: ["Gas Giant", "Terrestrial Planet", "Oceanic Planet"] },
    { type: 6, name: "Bathysphere Pearls", richness: 3, planetTypes: ["Oceanic Planet"] },
    { type: 7, name: "Beryllium Crystals", richness: 5, planetTypes: ["Dark Planet", "Ice Giant"] },
    { type: 8, name: "Thermoplastic Resin", richness: 1, planetTypes: ["Terrestrial Planet", "Gas Giant"] },
    { type: 9, name: "Biomass", richness: 1, planetTypes: ["Terrestrial Planet", "Oceanic Planet"] },
    { type: 10, name: "Amber Resin", richness: 2, planetTypes: ["Terrestrial Planet"] },
    { type: 11, name: "Boron Ore", richness: 2, planetTypes: ["System Asteroid Belt"] },
    { type: 12, name: "Carbon", richness: 1, planetTypes: ["Gas Giant", "Terrestrial Planet"] },
    { type: 13, name: "Diamond", richness: 2, planetTypes: ["Dark Planet", "Ice Giant", "Volcanic Planet"] },
    { type: 14, name: "Radiant Dust", richness: 2, planetTypes: ["Dark Planet"] },
    { type: 15, name: "Copper Ore", richness: 1, planetTypes: ["Barren Planet", "System Asteroid Belt"] },
    { type: 16, name: "Cryo Formation Crystals", richness: 3, planetTypes: ["Ice Giant"] },
    { type: 17, name: "Cinnabar Crystals", richness: 3, planetTypes: ["Volcanic Planet"] },
    { type: 18, name: "Glowstone Crystals", richness: 3, planetTypes: ["Volcanic Planet"] },
    { type: 19, name: "Dysprosium", richness: 4, planetTypes: ["Terrestrial Planet"] },
    { type: 20, name: "Emerald Crystals", richness: 3, planetTypes: ["Dark Planet"] },
    { type: 21, name: "Fluorine Gas", richness: 2, planetTypes: ["Gas Giant", "Volcanic Planet", "Oceanic Planet"] },
    { type: 22, name: "Fusion Catalyst Deposits", richness: 5, planetTypes: ["Dark Planet"] },
    { type: 23, name: "Garnet Crystals", richness: 4, planetTypes: ["Ice Giant", "Volcanic Planet"] },
    { type: 24, name: "Raw Chisenic", richness: 3, planetTypes: ["Dark Planet"] },
    { type: 25, name: "Tenon Gas", richness: 3, planetTypes: ["Gas Giant"] },
    { type: 26, name: "Cobalt Ore", richness: 4, planetTypes: ["Ice Giant", "Oceanic Planet"] },
    { type: 27, name: "Hafnium Ore", richness: 2, planetTypes: ["Volcanic Planet"] },
    { type: 28, name: "Dodiline Crystals", richness: 4, planetTypes: ["Volcanic Planet"] },
    { type: 29, name: "Hydrogen", richness: 1, planetTypes: ["Gas Giant", "Terrestrial Planet", "Oceanic Planet"] },
    { type: 30, name: "Iridium Ore", richness: 4, planetTypes: ["Volcanic Planet"] },
    { type: 31, name: "Iron Ore", richness: 1, planetTypes: ["Terrestrial Planet"] },
    { type: 32, name: "Gold Ore", richness: 4, planetTypes: ["Terrestrial Planet"] },
    { type: 33, name: "Krypton", richness: 1, planetTypes: ["Barren Planet", "Gas Giant", "Ice Giant"] },
    { type: 34, name: "Lithium Ore", richness: 2, planetTypes: ["Barren Planet", "System Asteroid Belt"] },
    { type: 35, name: "Living Metal Symbionts", richness: 5, planetTypes: ["Dark Planet"] },
    { type: 36, name: "Lumanite", richness: 1, planetTypes: ["Volcanic Planet"] },
    { type: 37, name: "Lunar Echo Crystals", richness: 5, planetTypes: ["Oceanic Planet"] },
    { type: 38, name: "Manganese Ore", richness: 2, planetTypes: ["Barren Planet", "Oceanic Planet"] },
    { type: 39, name: "Methane", richness: 2, planetTypes: ["Dark Planet", "System Asteroid Belt"] },
    { type: 40, name: "Neodymium", richness: 1, planetTypes: ["Dark Planet", "Terrestrial Planet"] },
    { type: 41, name: "Neon", richness: 3, planetTypes: ["Dark Planet", "Gas Giant"] },
    { type: 42, name: "Neural Coral Compounds", richness: 3, planetTypes: ["Oceanic Planet"] },
    { type: 43, name: "Nitrogen", richness: 1, planetTypes: ["Gas Giant", "Terrestrial Planet", "Oceanic Planet"] },
    { type: 44, name: "Hicenium Crystals", richness: 4, planetTypes: ["Ice Giant"] },
    { type: 45, name: "Ochre Ore", richness: 4, planetTypes: ["Terrestrial Planet"] },
    { type: 46, name: "Osmium Ore", richness: 1, planetTypes: ["Volcanic Planet"] },
    { type: 47, name: "Oxygen", richness: 2, planetTypes: ["Terrestrial Planet", "Oceanic Planet"] },
    { type: 48, name: "Palladium", richness: 3, planetTypes: ["Volcanic Planet"] },
    { type: 49, name: "Peridot Crystals", richness: 4, planetTypes: ["Ice Giant"] },
    { type: 50, name: "Phase Shift Crystals", richness: 4, planetTypes: ["Oceanic Planet"] },
    { type: 51, name: "Plasma Containment Minerals", richness: 4, planetTypes: ["Volcanic Planet"] },
    { type: 52, name: "Platinum Ore", richness: 4, planetTypes: ["Volcanic Planet"] },
    { type: 53, name: "Quantum Computational Substrate", richness: 4, planetTypes: ["Dark Planet"] },
    { type: 54, name: "Quantum Particle", richness: 5, planetTypes: ["Dark Planet", "Ice Giant"] },
    { type: 55, name: "Quartz Crystals", richness: 1, planetTypes: ["System Asteroid Belt"] },
    { type: 56, name: "Biolumite", richness: 5, planetTypes: ["Ice Giant"] },
    { type: 57, name: "Black Opal", richness: 5, planetTypes: ["Barren Planet"] },
    { type: 58, name: "Jasphorus Crystals", richness: 5, planetTypes: ["Barren Planet"] },
    { type: 59, name: "Rhenium Ore", richness: 1, planetTypes: ["System Asteroid Belt", "Volcanic Planet"] },
    { type: 60, name: "Rhodium Ore", richness: 4, planetTypes: ["Volcanic Planet"] },
    { type: 61, name: "Rochinol", richness: 2, planetTypes: ["Barren Planet", "Dark Planet", "Ice Giant", "Volcanic Planet"] },
    { type: 62, name: "Ruby Crystals", richness: 2, planetTypes: ["Ice Giant"] },
    { type: 63, name: "Sapphire Crystals", richness: 3, planetTypes: ["Ice Giant"] },
    { type: 64, name: "Scandium Ore", richness: 2, planetTypes: ["System Asteroid Belt"] },
    { type: 65, name: "Silica", richness: 1, planetTypes: ["System Asteroid Belt", "Terrestrial Planet"] },
    { type: 66, name: "Silicon Crystal", richness: 1, planetTypes: ["Dark Planet", "System Asteroid Belt"] },
    { type: 67, name: "Silver Ore", richness: 2, planetTypes: ["Dark Planet"] },
    { type: 68, name: "Sodium Crystals", richness: 1, planetTypes: ["System Asteroid Belt"] },
    { type: 69, name: "Strontium Crystals", richness: 5, planetTypes: ["System Asteroid Belt"] },
    { type: 70, name: "Sulfur", richness: 1, planetTypes: ["Volcanic Planet"] },
    { type: 71, name: "Tantalum Ore", richness: 1, planetTypes: ["Volcanic Planet"] },
    { type: 72, name: "Opal Fragments", richness: 5, planetTypes: ["Dark Planet"] },
    { type: 73, name: "Thermal Bloom Sediment", richness: 2, planetTypes: ["Oceanic Planet"] },
    { type: 74, name: "Thermal Regulator Stone", richness: 1, planetTypes: ["Volcanic Planet"] },
    { type: 75, name: "Resonium Ore", richness: 5, planetTypes: ["Barren Planet"] },
    { type: 76, name: "Tin Ore", richness: 1, planetTypes: ["Barren Planet"] },
    { type: 77, name: "Titanium Ore", richness: 3, planetTypes: ["System Asteroid Belt"] },
    { type: 78, name: "Topaz Crystals", richness: 4, planetTypes: ["Dark Planet", "Ice Giant"] },
    { type: 79, name: "Tritium Ore", richness: 1, planetTypes: ["System Asteroid Belt"] },
    { type: 80, name: "Tungsten Ore", richness: 3, planetTypes: ["Barren Planet"] },
    { type: 81, name: "Vanadium Ore", richness: 3, planetTypes: ["Barren Planet"] },
    { type: 82, name: "Viscovite Crystals", richness: 3, planetTypes: ["Dark Planet"] },
    { type: 83, name: "Xenon", richness: 2, planetTypes: ["Dark Planet", "Gas Giant", "Ice Giant"] },
    { type: 84, name: "Zinc Ore", richness: 1, planetTypes: ["Barren Planet"] },
    { type: 85, name: "Zirconium Ore", richness: 4, planetTypes: ["Ice Giant"] }
];

// Resource color mapping - updated with all new resources
const RESOURCE_COLORS = {
    // New Oceanic Resources
    'abyssal chromite': '#2F4F4F',           // Dark Slate Gray
    'abyssal energy crystals': '#00CED1',    // Dark Turquoise
    'bathysphere pearls': '#F0F8FF',         // Alice Blue
    'lunar echo crystals': '#E6E6FA',        // Lavender
    'neural coral compounds': '#FF7F50',     // Coral
    'phase shift crystals': '#9370DB',       // Medium Purple
    'thermal bloom sediment': '#8B4513',     // Saddle Brown

    // Existing and updated resources
    'aluminum ore': '#848482',               // Gray
    'germanium': '#778899',                  // Light Slate Gray
    'arco': '#FF6347',                       // Tomato
    'argon': '#F0F8FF',                      // Alice Blue
    'beryllium crystals': '#6A5ACD',         // Slate Blue
    'thermoplastic resin': '#DAA520',        // Goldenrod
    'biomass': '#228B22',                    // Forest Green
    'amber resin': '#FFA500',                // Orange
    'boron ore': '#556B2F',                  // Dark Olive Green
    'carbon': '#696969',                     // Dim Gray
    'diamond': '#B9F2FF',                    // Diamond Blue
    'radiant dust': '#FFD700',               // Gold
    'copper ore': '#B87333',                 // Copper
    'cryo formation crystals': '#87CEEB',    // Sky Blue
    'cinnabar crystals': '#DC143C',          // Crimson
    'glowstone crystals': '#FFD700',         // Gold
    'dysprosium': '#CD853F',                 // Peru
    'emerald crystals': '#50C878',           // Emerald Green
    'fluorine gas': '#98FB98',               // Pale Green
    'fusion catalyst deposits': '#FF00FF',   // Magenta
    'garnet crystals': '#800000',            // Maroon
    'raw chisenic': '#8B4513',               // Saddle Brown
    'tenon gas': '#E6E6FA',                  // Lavender
    'cobalt ore': '#4169E1',                 // Royal Blue
    'hafnium ore': '#B8860B',                // Dark Goldenrod
    'dodiline crystals': '#9400D3',          // Dark Violet
    'hydrogen': '#E6F3FF',                   // Light Blue
    'iridium ore': '#C0C0C0',                // Silver
    'iron ore': '#A0522D',                   // Sienna
    'gold ore': '#FFD700',                   // Gold
    'krypton': '#F8F8FF',                    // Ghost White
    'lithium ore': '#FF69B4',                // Hot Pink
    'living metal symbionts': '#00FF00',     // Lime
    'lumanite': '#DAA520',                   // Goldenrod
    'manganese ore': '#800000',              // Maroon
    'methane': '#F5FFFA',                    // Mint Cream
    'neodymium': '#FF69B4',                  // Hot Pink
    'neon': '#FFE4E1',                       // Misty Rose
    'nitrogen': '#E6E6FA',                   // Lavender
    'hicenium crystals': '#00CED1',          // Dark Turquoise
    'ochre ore': '#CD853F',                  // Peru
    'osmium ore': '#2F4F4F',                 // Dark Slate Gray
    'oxygen': '#E6F3FF',                     // Light Blue
    'palladium': '#C0C0C0',                  // Silver
    'peridot crystals': '#98FB98',           // Pale Green
    'plasma containment minerals': '#FF4500', // Orange Red
    'platinum ore': '#E5E4E2',               // Platinum
    'quantum computational substrate': '#9932CC', // Dark Orchid
    'quantum particle': '#8A2BE2',           // Blue Violet
    'quartz crystals': '#F0FFFF',            // Azure
    'biolumite': '#7FFF00',                  // Chartreuse
    'black opal': '#708090',                 // Slate Gray
    'jasphorus crystals': '#FF69B4',         // Hot Pink
    'rhenium ore': '#708090',                // Slate Gray
    'rhodium ore': '#CD7F32',                // Bronze
    'rochinol': '#8B4513',                   // Saddle Brown
    'ruby crystals': '#FF0000',              // Red
    'sapphire crystals': '#0000FF',          // Blue
    'scandium ore': '#4682B4',               // Steel Blue
    'silica': '#F5F5F5',                     // White Smoke
    'silicon crystal': '#A9A9A9',            // Dark Gray
    'silver ore': '#C0C0C0',                 // Silver
    'sodium crystals': '#FFB6C1',            // Light Pink
    'strontium crystals': '#FF69B4',         // Hot Pink
    'sulfur': '#FFFF00',                     // Yellow
    'tantalum ore': '#2F4F4F',               // Dark Slate Gray
    'opal fragments': '#B0E0E6',             // Powder Blue
    'thermal regulator stone': '#696969',    // Dim Gray
    'resonium ore': '#9370DB',               // Medium Purple
    'tin ore': '#B8860B',                    // Dark Goldenrod
    'titanium ore': '#778899',               // Light Slate Gray
    'topaz crystals': '#FFD700',             // Gold
    'tritium ore': '#008080',                // Teal
    'tungsten ore': '#4A4A4A',               // Dark Gray
    'vanadium ore': '#6B8E23',               // Olive Drab
    'viscovite crystals': '#9932CC',         // Dark Orchid
    'xenon': '#F5F5F5',                      // White Smoke
    'zinc ore': '#C0C0C0',                   // Silver
    'zirconium ore': '#B8860B',              // Dark Goldenrod

    'default': '#CCCCCC'                     // Default grey if not found
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