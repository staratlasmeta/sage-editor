import Papa from 'papaparse';

// Embedded mock data for standalone build
const EMBEDDED_DATA = {
    cargo: {},  // Will be populated with minimal data
    tags: {},
    planetArchetypes: {},
    claimStakeBuildings: {},
    craftingHabBuildings: {},
    recipes: []
};

// Fallback/mock data for standalone
const MOCK_DATA = {
    planets: [
        {
            id: 'planet_001',
            name: 'Terra Prime',
            faction: 'MUD',
            archetype: 'terrestrial',
            resources: ['iron-ore', 'copper-ore', 'hydrogen'],
            richness: {
                'iron-ore': 1.5,
                'copper-ore': 1.0,
                'hydrogen': 2.0
            },
            tags: ['terrestrial', 'mining', 'industrial', 'processing'],
            rentCost: 100
        },
        {
            id: 'planet_002',
            name: 'Nebula Station',
            faction: 'ONI',
            archetype: 'gas_giant',
            resources: ['copper-ore', 'silica', 'hydrogen'],
            richness: {
                'copper-ore': 2.0,
                'silica': 1.5,
                'hydrogen': 1.0
            },
            tags: ['crystalline', 'tech', 'mining'],
            rentCost: 200
        },
        {
            id: 'planet_003',
            name: 'Crystal Harbor',
            faction: 'UST',
            archetype: 'ice',
            resources: ['iron-ore', 'coal', 'copper-ore'],
            richness: {
                'iron-ore': 2.5,
                'coal': 1.8,
                'copper-ore': 1.2
            },
            tags: ['volcanic', 'industrial', 'forge', 'processing'],
            rentCost: 300
        }
    ],
    buildings: [
        // === INFRASTRUCTURE HUBS (tier limited by claim stake) ===
        {
            id: 'central-hub-t1',
            name: 'Central Hub T1',
            category: 'infrastructure',
            tier: 1,
            slots: 5,
            power: 100,
            crew: 20,
            resourceUsage: { fuel: 0.1 },
            constructionCost: { 'cargo-steel': 100, 'cargo-electronics': 50 },
            requiredTags: [],
            providedTags: ['central-hub'],
            isInfrastructure: true
        },
        {
            id: 'extraction-hub-t1',
            name: 'Extraction Hub T1',
            category: 'extraction',
            tier: 1,
            slots: 4,
            power: -10,
            crew: 15,
            constructionCost: { 'cargo-steel': 80, 'cargo-machinery': 40 },
            requiredTags: [],
            providedTags: ['extraction-hub'],
            isInfrastructure: true
        },
        {
            id: 'processing-hub-t1',
            name: 'Processing Hub T1',
            category: 'processing',
            tier: 1,
            slots: 4,
            power: -15,
            crew: 20,
            constructionCost: { 'cargo-electronics': 60, 'cargo-machinery': 60 },
            requiredTags: [],
            providedTags: ['processing-hub'],
            isInfrastructure: true
        },
        {
            id: 'extractor-iron-t1',
            name: 'Iron Extractor T1',
            category: 'extraction',
            tier: 1,
            slots: 2,
            power: -5,
            crew: 10,
            extractionRate: { 'iron-ore': 0.5 },
            constructionCost: { 'cargo-steel': 50, 'cargo-machinery': 25 },
            requiredTags: ['extraction-hub'],
            requiredPlanetResources: ['iron-ore']
        },
        {
            id: 'extractor-copper-t1',
            name: 'Copper Extractor T1',
            category: 'extraction',
            tier: 1,
            slots: 2,
            power: -5,
            crew: 10,
            extractionRate: { 'copper-ore': 0.5 },
            constructionCost: { 'cargo-steel': 50, 'cargo-machinery': 25 },
            requiredTags: ['extraction-hub'],
            requiredPlanetResources: ['copper-ore']
        },
        {
            id: 'processor-iron-t1',
            name: 'Iron Processor T1',
            category: 'processing',
            tier: 1,
            slots: 3,
            power: -10,
            crew: 15,
            resourceUsage: { 'iron-ore': 0.5 },
            resourceProduction: { 'cargo-iron': 0.4 },
            constructionCost: { 'cargo-steel': 75, 'cargo-electronics': 35 },
            requiredTags: ['processing-hub']
        },
        {
            id: 'power-plant-t1',
            name: 'Power Plant T1',
            category: 'power',
            tier: 1,
            slots: 3,
            power: 50,
            crew: 10,
            resourceUsage: { fuel: 0.2 },
            constructionCost: { 'cargo-electronics': 100, 'cargo-machinery': 50 }
        },
        {
            id: 'storage-hub-t1',
            name: 'Storage Hub T1',
            category: 'storage',
            tier: 1,
            slots: 5,
            power: -5,
            crew: 5,
            storageCapacity: 1000,
            constructionCost: { 'cargo-steel': 120, 'cargo-composites': 30 }
        }
    ],
    resources: {
        'iron-ore': { name: 'Iron Ore', category: 'raw' },
        'copper-ore': { name: 'Copper Ore', category: 'raw' },
        'hydrogen': { name: 'Hydrogen', category: 'raw' },
        'silica': { name: 'Silica', category: 'raw' },
        'coal': { name: 'Coal', category: 'raw' },
        'fuel': { name: 'Fuel', category: 'processed' },
        'cargo-steel': { name: 'Steel', category: 'processed' },
        'cargo-iron': { name: 'Iron', category: 'processed' },
        'cargo-copper': { name: 'Copper', category: 'processed' },
        'cargo-electronics': { name: 'Electronics', category: 'advanced' },
        'cargo-machinery': { name: 'Machinery', category: 'advanced' },
        'cargo-composites': { name: 'Composites', category: 'advanced' }
    },
    starbases: [
        {
            id: 'starbase_001',
            name: 'MUD Central',
            faction: 'MUD',
            level: 2,
            levelName: 'Hub'
        },
        {
            id: 'starbase_002',
            name: 'ONI Station',
            faction: 'ONI',
            level: 3,
            levelName: 'Complex'
        },
        {
            id: 'starbase_003',
            name: 'UST Outpost',
            faction: 'UST',
            level: 1,
            levelName: 'Station'
        }
    ],
    recipes: [
        {
            id: 'recipe_001',
            name: 'Steel Plate',
            tier: 1,
            constructionTime: 60,
            crewRequired: 10,
            ingredients: [
                { resource: 'cargo-iron', quantity: 2 },
                { resource: 'coal', quantity: 1 }
            ],
            output: { resource: 'cargo-steel', quantity: 1 }
        },
        {
            id: 'recipe_002',
            name: 'Basic Electronics',
            tier: 2,
            constructionTime: 120,
            crewRequired: 15,
            ingredients: [
                { resource: 'cargo-copper', quantity: 3 },
                { resource: 'silica', quantity: 2 }
            ],
            output: { resource: 'cargo-electronics', quantity: 1 }
        }
    ]
};

export class StandaloneDataLoader {
    static async loadJSON(path: string): Promise<any> {
        // Return mock data directly without fetching
        console.log('Standalone DataLoader: Using embedded mock data for', path);
        return null;
    }

    static async parseCSV(csvText: string): Promise<any[]> {
        return new Promise((resolve) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    resolve(results.data);
                }
            });
        });
    }

    static async loadGameData() {
        console.log('Loading embedded game data for standalone build...');

        // Return mock data directly
        return {
            cargo: MOCK_DATA.resources,
            tags: {},
            planetArchetypes: {},
            claimStakeBuildings: MOCK_DATA.buildings,
            craftingHabBuildings: MOCK_DATA.buildings.filter(b =>
                b.category === 'hab' || b.category === 'crafting'
            ),
            recipes: MOCK_DATA.recipes,
            planets: MOCK_DATA.planets,
            buildings: MOCK_DATA.buildings,
            resources: MOCK_DATA.resources,
            starbases: MOCK_DATA.starbases
        };
    }

    static async loadMockData() {
        return MOCK_DATA;
    }
} 