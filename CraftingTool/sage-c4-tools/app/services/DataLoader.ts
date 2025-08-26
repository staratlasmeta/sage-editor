import Papa from 'papaparse';

// Fallback/mock data for development
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

        // Central Hub - Main control
        {
            id: 'central_hub_t1',
            name: 'Central Hub',
            category: 'infrastructure',
            tier: 1,
            slots: 5,
            power: 100,
            crew: 10,
            resourceUsage: { 'fuel': 0.5 },  // T1 uses 0.5 fuel per second
            comesWithStake: true,
            constructionCost: {},
            upgradeFamily: 'central_hub',
            providedTags: ['basic-operations'],
            description: 'Main control center - provides power and basic operations'
        },
        {
            id: 'central_hub_t2',
            name: 'Central Hub',
            category: 'infrastructure',
            tier: 2,
            slots: 8,
            power: 150,
            crew: 15,
            resourceUsage: { 'fuel': 0.7 },  // T2 uses 0.7 fuel per second
            constructionCost: { 'steel': 50, 'electronics': 20 },
            upgradeFamily: 'central_hub',
            providedTags: ['basic-operations'],
            description: 'Enhanced control center with improved efficiency'
        },
        {
            id: 'central_hub_t3',
            name: 'Central Hub',
            category: 'infrastructure',
            tier: 3,
            slots: 12,
            power: 200,
            crew: 20,
            resourceUsage: { 'fuel': 1.0 },  // T3 uses 1.0 fuel per second
            constructionCost: { 'steel': 100, 'electronics': 50, 'copper': 30 },
            upgradeFamily: 'central_hub',
            providedTags: ['basic-operations'],
            description: 'Advanced control center with maximum efficiency'
        },

        // Extraction Hub - Enables extraction modules
        ...Array.from({ length: 3 }, (_, i) => {
            const tier = i + 1;
            return {
                id: `extraction_hub_t${tier}`,
                name: 'Extraction Hub',
                category: 'infrastructure',
                tier,
                slots: 6 + tier * 2, // 8, 10, 12
                power: 30 + tier * 20, // 50, 70, 90
                crew: 8 + tier * 4, // 12, 16, 20
                constructionCost: {
                    'steel': 30 * Math.pow(2, tier - 1),
                    'electronics': 15 * Math.pow(2, tier - 1),
                    'copper': tier > 1 ? 20 * (tier - 1) : 0
                },
                upgradeFamily: 'extraction_hub',
                providedTags: ['extraction-modules'],
                description: `T${tier} extraction hub - enables extraction modules`
            };
        }),

        // Processing Hub - Enables processing modules
        ...Array.from({ length: 3 }, (_, i) => {
            const tier = i + 1;
            return {
                id: `processing_hub_t${tier}`,
                name: 'Processing Hub',
                category: 'infrastructure',
                tier,
                slots: 8 + tier * 2, // 10, 12, 14
                power: 40 + tier * 20, // 60, 80, 100
                crew: 10 + tier * 4, // 14, 18, 22
                constructionCost: {
                    'steel': 40 * Math.pow(2, tier - 1),
                    'electronics': 20 * Math.pow(2, tier - 1),
                    'copper': 25 * tier
                },
                upgradeFamily: 'processing_hub',
                providedTags: ['processing-modules'],
                description: `T${tier} processing hub - enables processing modules`
            };
        }),

        // Storage Hub - Large storage capacity
        ...Array.from({ length: 3 }, (_, i) => {
            const tier = i + 1;
            const storageCapacity = 5000 * tier; // 5000, 10000, 15000
            return {
                id: `storage_hub_t${tier}`,
                name: 'Storage Hub',
                category: 'infrastructure',
                tier,
                slots: 10 + tier * 3, // 13, 16, 19
                power: -10 - tier * 5, // -15, -20, -25
                crew: 5 + tier * 2, // 7, 9, 11
                resourceStorage: { capacity: storageCapacity },
                constructionCost: {
                    'steel': 50 * Math.pow(2, tier - 1),
                    'electronics': 10 * tier,
                    'copper': 15 * tier
                },
                upgradeFamily: 'storage_hub',
                providedTags: ['bulk-storage'],
                description: `T${tier} storage hub - adds ${storageCapacity} storage capacity`
            };
        }),

        // === EXTRACTION MODULES (require extraction-modules tag) ===

        // Iron Ore Extractor Module
        ...Array.from({ length: 5 }, (_, i) => {
            const tier = i + 1;
            const efficiency = 1 + (tier - 1) * 0.5; // 1.0, 1.5, 2.0, 2.5, 3.0
            return {
                id: `extractor_iron_t${tier}`,
                name: 'Iron Ore Extractor',
                category: 'extraction',
                tier,
                slots: 3 + tier, // 4, 5, 6, 7, 8
                power: -8 - tier * 4, // -12, -16, -20, -24, -28
                crew: 4 + tier * 2, // 6, 8, 10, 12, 14
                extractionRate: {
                    'iron-ore': 1.2 * efficiency
                },
                constructionCost: {
                    'steel': 8 * Math.pow(2, tier - 1),
                    'electronics': 4 * Math.pow(2, tier - 1),
                    'copper': tier > 2 ? 5 * (tier - 2) : 0
                },
                requiredTags: ['extraction-modules', 'mining'],
                upgradeFamily: 'extractor_iron',
                description: `T${tier} iron extractor - ${(1.2 * efficiency).toFixed(1)}/s extraction rate`
            };
        }),

        // Copper Ore Extractor Module
        ...Array.from({ length: 5 }, (_, i) => {
            const tier = i + 1;
            const efficiency = 1 + (tier - 1) * 0.5;
            return {
                id: `extractor_copper_t${tier}`,
                name: 'Copper Ore Extractor',
                category: 'extraction',
                tier,
                slots: 3 + tier, // 4, 5, 6, 7, 8
                power: -8 - tier * 4, // -12, -16, -20, -24, -28
                crew: 4 + tier * 2, // 6, 8, 10, 12, 14
                extractionRate: {
                    'copper-ore': 0.8 * efficiency
                },
                constructionCost: {
                    'steel': 8 * Math.pow(2, tier - 1),
                    'electronics': 4 * Math.pow(2, tier - 1),
                    'copper': tier > 2 ? 5 * (tier - 2) : 0
                },
                requiredTags: ['extraction-modules', 'mining'],
                upgradeFamily: 'extractor_copper',
                description: `T${tier} copper extractor - ${(0.8 * efficiency).toFixed(1)}/s extraction rate`
            };
        }),

        // Hydrogen Extractor Module
        ...Array.from({ length: 5 }, (_, i) => {
            const tier = i + 1;
            const efficiency = 1 + (tier - 1) * 0.5;
            return {
                id: `extractor_hydrogen_t${tier}`,
                name: 'Hydrogen Extractor',
                category: 'extraction',
                tier,
                slots: 3 + tier, // 4, 5, 6, 7, 8
                power: -10 - tier * 4, // -14, -18, -22, -26, -30
                crew: 4 + tier * 2, // 6, 8, 10, 12, 14
                extractionRate: {
                    'hydrogen': 1.5 * efficiency
                },
                constructionCost: {
                    'steel': 10 * Math.pow(2, tier - 1),
                    'electronics': 6 * Math.pow(2, tier - 1),
                    'copper': tier > 2 ? 8 * (tier - 2) : 0
                },
                requiredTags: ['extraction-modules'],
                upgradeFamily: 'extractor_hydrogen',
                description: `T${tier} hydrogen extractor - ${(1.5 * efficiency).toFixed(1)}/s extraction rate`
            };
        }),

        // Coal Extractor Module
        ...Array.from({ length: 5 }, (_, i) => {
            const tier = i + 1;
            const efficiency = 1 + (tier - 1) * 0.5;
            return {
                id: `extractor_coal_t${tier}`,
                name: 'Coal Extractor',
                category: 'extraction',
                tier,
                slots: 3 + tier, // 4, 5, 6, 7, 8
                power: -7 - tier * 3, // -10, -13, -16, -19, -22
                crew: 3 + tier * 2, // 5, 7, 9, 11, 13
                extractionRate: {
                    'coal': 1.0 * efficiency
                },
                constructionCost: {
                    'steel': 6 * Math.pow(2, tier - 1),
                    'electronics': 3 * Math.pow(2, tier - 1),
                    'copper': tier > 2 ? 4 * (tier - 2) : 0
                },
                requiredTags: ['extraction-modules', 'mining'],
                upgradeFamily: 'extractor_coal',
                description: `T${tier} coal extractor - ${(1.0 * efficiency).toFixed(1)}/s extraction rate`
            };
        }),

        // Silica Extractor Module
        ...Array.from({ length: 5 }, (_, i) => {
            const tier = i + 1;
            const efficiency = 1 + (tier - 1) * 0.5;
            return {
                id: `extractor_silica_t${tier}`,
                name: 'Silica Extractor',
                category: 'extraction',
                tier,
                slots: 3 + tier, // 4, 5, 6, 7, 8
                power: -6 - tier * 3, // -9, -12, -15, -18, -21
                crew: 3 + tier * 2, // 5, 7, 9, 11, 13
                extractionRate: {
                    'silica': 0.9 * efficiency
                },
                constructionCost: {
                    'steel': 5 * Math.pow(2, tier - 1),
                    'electronics': 3 * Math.pow(2, tier - 1),
                    'copper': tier > 2 ? 3 * (tier - 2) : 0
                },
                requiredTags: ['extraction-modules'],
                upgradeFamily: 'extractor_silica',
                description: `T${tier} silica extractor - ${(0.9 * efficiency).toFixed(1)}/s extraction rate`
            };
        }),

        // === PROCESSING MODULES (require processing-modules tag) ===

        // Copper Processor Module
        ...Array.from({ length: 5 }, (_, i) => {
            const tier = i + 1;
            const efficiency = 0.5 + tier * 0.15; // 0.65, 0.80, 0.95, 1.10, 1.25
            return {
                id: `processor_copper_t${tier}`,
                name: 'Copper Processor',
                category: 'processing',
                tier,
                slots: 4 + tier * 2, // 6, 8, 10, 12, 14
                power: -12 - tier * 6, // -18, -24, -30, -36, -42
                crew: 6 + tier * 3, // 9, 12, 15, 18, 21
                resourceUsage: { 'copper-ore': 1 + tier * 0.5 }, // 1.5, 2.0, 2.5, 3.0, 3.5
                resourceProduction: { 'copper': efficiency },
                constructionCost: {
                    'steel': 20 * Math.pow(2, tier - 1),
                    'electronics': 10 * Math.pow(2, tier - 1),
                    'copper': tier > 1 ? 15 * (tier - 1) : 0
                },
                requiredTags: ['processing-modules'],
                upgradeFamily: 'processor_copper',
                description: `T${tier} processor - ${Math.floor(efficiency / (1 + tier * 0.5) * 100)}% conversion efficiency`
            };
        }),

        // Steel Processor Module (starts at T2)
        ...Array.from({ length: 4 }, (_, i) => {
            const tier = i + 2; // Starts at T2
            const efficiency = 0.8 + (tier - 2) * 0.25; // 0.8, 1.05, 1.30, 1.55
            return {
                id: `processor_steel_t${tier}`,
                name: 'Steel Processor',
                category: 'processing',
                tier,
                slots: 6 + tier * 2, // 10, 12, 14, 16
                power: -18 - tier * 8, // -34, -42, -50, -58
                crew: 8 + tier * 4, // 16, 20, 24, 28
                resourceUsage: {
                    'iron-ore': 2 + tier * 0.5, // 3, 3.5, 4, 4.5
                    'coal': 1 + tier * 0.3 // 1.6, 1.9, 2.2, 2.5
                },
                resourceProduction: { 'steel': efficiency },
                constructionCost: {
                    'steel': 40 * Math.pow(2, tier - 2),
                    'electronics': 20 * Math.pow(2, tier - 2),
                    'copper': 30 * (tier - 1)
                },
                requiredTags: ['processing-modules', 'industrial'],
                upgradeFamily: 'processor_steel',
                description: `T${tier} steel processor - ${Math.floor(efficiency / ((2 + tier * 0.5) + (1 + tier * 0.3)) * 100)}% conversion efficiency`
            };
        }),

        // Electronics Processor Module (starts at T2)
        ...Array.from({ length: 4 }, (_, i) => {
            const tier = i + 2; // Starts at T2
            const efficiency = 0.4 + (tier - 2) * 0.2; // 0.4, 0.6, 0.8, 1.0
            return {
                id: `processor_electronics_t${tier}`,
                name: 'Electronics Processor',
                category: 'processing',
                tier,
                slots: 5 + tier * 2, // 9, 11, 13, 15
                power: -20 - tier * 8, // -36, -44, -52, -60
                crew: 10 + tier * 3, // 16, 19, 22, 25
                resourceUsage: {
                    'copper': 1 + tier * 0.3, // 1.6, 1.9, 2.2, 2.5
                    'silica': 0.5 + tier * 0.2 // 0.9, 1.1, 1.3, 1.5
                },
                resourceProduction: { 'electronics': efficiency },
                constructionCost: {
                    'steel': 30 * Math.pow(2, tier - 2),
                    'electronics': 25 * Math.pow(2, tier - 2),
                    'copper': 40 * (tier - 1)
                },
                requiredTags: ['processing-modules'],
                upgradeFamily: 'processor_electronics',
                description: `T${tier} electronics processor - ${Math.floor(efficiency / ((1 + tier * 0.3) + (0.5 + tier * 0.2)) * 100)}% conversion`
            };
        }),

        // Fuel Processor Module (starts at T3 - self-sustaining!)
        ...Array.from({ length: 3 }, (_, i) => {
            const tier = i + 3; // Starts at T3
            const efficiency = 1 + (tier - 3) * 0.5; // 1.0, 1.5, 2.0
            return {
                id: `processor_fuel_t${tier}`,
                name: 'Fuel Processor',
                category: 'processing',
                tier,
                slots: 8 + tier * 3, // 17, 20, 23
                power: -22 - tier * 8, // -46, -54, -62
                crew: 10 + tier * 4, // 22, 26, 30
                resourceUsage: { 'hydrogen': 2 + tier * 0.5 }, // 3.5, 4, 4.5
                resourceProduction: { 'fuel': efficiency },
                constructionCost: {
                    'steel': 100 * Math.pow(2, tier - 3),
                    'electronics': 50 * Math.pow(2, tier - 3),
                    'titanium': tier > 3 ? 20 * (tier - 3) : 0
                },
                requiredTags: ['processing-modules'],
                upgradeFamily: 'processor_fuel',
                description: `T${tier} fuel processor - Self-sustaining! ${Math.floor(efficiency / (2 + tier * 0.5) * 100)}% conversion`
            };
        }),

        // === POWER GENERATION ===

        // Basic Generators (can go to T5)
        ...Array.from({ length: 5 }, (_, i) => {
            const tier = i + 1;
            const power = 50 + tier * 30; // 80, 110, 140, 170, 200
            const fuelUsage = 0.5 + tier * 0.1; // 0.6, 0.7, 0.8, 0.9, 1.0
            return {
                id: `generator_basic_t${tier}`,
                name: 'Basic Generator',
                category: 'power',
                tier,
                slots: 3 + tier * 2, // 5, 7, 9, 11, 13
                power,
                crew: 3 + tier * 2, // 5, 7, 9, 11, 13
                resourceUsage: { 'fuel': fuelUsage },
                constructionCost: tier === 1
                    ? { 'steel': 15, 'copper': 10 }
                    : {
                        'steel': 15 * Math.pow(2, tier - 1),
                        'copper': 10 * Math.pow(2, tier - 1),
                        'electronics': tier > 2 ? 10 * (tier - 2) : 0
                    },
                upgradeFamily: 'generator_basic',
                description: `T${tier} generator - ${power} power output, ${fuelUsage}/s fuel consumption`
            };
        }),

        // Solar Arrays (no fuel needed, less power)
        ...Array.from({ length: 3 }, (_, i) => {
            const tier = i + 1;
            const power = 30 + tier * 20; // 50, 70, 90
            return {
                id: `solar_array_t${tier}`,
                name: 'Solar Array',
                category: 'power',
                tier,
                slots: 5 + tier * 3, // 8, 11, 14
                power,
                crew: 2 + tier, // 3, 4, 5
                constructionCost: {
                    'steel': 20 * Math.pow(2, tier - 1),
                    'silica': 15 * Math.pow(2, tier - 1),
                    'electronics': 10 * tier
                },
                upgradeFamily: 'solar_array',
                description: `T${tier} solar array - ${power} power output, no fuel needed`
            };
        }),

        // === STORAGE ===

        // Basic Storage Units
        ...Array.from({ length: 5 }, (_, i) => {
            const tier = i + 1;
            const capacity = 1000 * tier; // 1000, 2000, 3000, 4000, 5000
            return {
                id: `storage_basic_t${tier}`,
                name: 'Storage Unit',
                category: 'storage',
                tier,
                slots: 2 + tier, // 3, 4, 5, 6, 7
                power: -3 - tier * 2, // -5, -7, -9, -11, -13
                crew: 2 + tier, // 3, 4, 5, 6, 7
                resourceStorage: { capacity },
                constructionCost: {
                    'steel': 8 * Math.pow(2, tier - 1),
                    'electronics': 3 * Math.pow(2, tier - 1)
                },
                upgradeFamily: 'storage_basic',
                description: `T${tier} storage - adds ${capacity} storage capacity`
            };
        })
    ].flat(),
    resources: [
        // Raw materials
        { id: 'iron-ore', name: 'Iron Ore', category: 'raw' },
        { id: 'copper-ore', name: 'Copper Ore', category: 'raw' },
        { id: 'coal', name: 'Coal', category: 'raw' },
        { id: 'hydrogen', name: 'Hydrogen', category: 'raw' },
        { id: 'silica', name: 'Silica', category: 'raw' },

        // Processed materials
        { id: 'steel', name: 'Steel', category: 'processed' },
        { id: 'copper', name: 'Copper', category: 'processed' },
        { id: 'electronics', name: 'Electronics', category: 'processed' },
        { id: 'fuel', name: 'Fuel', category: 'processed' },

        // Advanced materials (for construction costs)
        { id: 'titanium', name: 'Titanium', category: 'advanced' }
    ],
    claimStakeDefinitions: [
        {
            id: 'cs_tier1_basic',
            name: 'Basic Claim Stake',
            tier: 1,
            slots: 100,
            rentMultiplier: 1.0,
            requiredTags: [],
            addedTags: ['industrial']
        }
    ],
    planetArchetypes: [
        {
            id: 'terrestrial',
            name: 'Terrestrial',
            resources: {
                iron_ore: { richness: 1.5 },
                copper_ore: { richness: 1.2 }
            },
            tags: ['mining', 'industrial']
        },
        {
            id: 'gas_giant',
            name: 'Gas Giant',
            resources: {
                hydrogen: { richness: 2.0 },
                helium: { richness: 1.8 }
            },
            tags: ['gas_extraction']
        }
    ],
    craftingRecipes: [
        {
            id: 'recipe_steel',
            name: 'Steel',
            tier: 1,
            constructionTime: 60,
            ingredients: { iron_ore: 10, coal: 2 }
        }
    ]
};

export class DataLoader {
    static async loadJSON(path: string): Promise<any> {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                console.warn(`Failed to load ${path}, using mock data`);
                return null;
            }
            return await response.json();
        } catch (error) {
            console.warn(`Error loading JSON from ${path}, using mock data:`, error);
            return null;
        }
    }

    static async loadCSV(path: string): Promise<any[]> {
        return new Promise((resolve, reject) => {
            Papa.parse(path, {
                download: true,
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                    resolve(results.data);
                },
                error: (error) => {
                    console.warn(`Error loading CSV from ${path}:`, error);
                    resolve([]); // Return empty array instead of rejecting
                }
            });
        });
    }

    static async loadAll() {
        try {
            // First try to load the comprehensive mockData.json file
            const mockDataFile = await this.loadJSON('/data/mockData.json');

            if (mockDataFile) {
                console.log('Using mockData.json file for development');
                console.log('Loaded planets:', mockDataFile.planets?.length || 0);
                console.log('Loaded buildings:', mockDataFile.buildings?.length || 0);

                // Process resources from the structured format
                let resourcesArray: any[] = [];
                let resourcesObject: any = {};

                if (mockDataFile.resources) {
                    // If resources are structured with categories
                    if (mockDataFile.resources.raw || mockDataFile.resources.processed || mockDataFile.resources.advanced) {
                        const allResources = [
                            ...(mockDataFile.resources.raw || []),
                            ...(mockDataFile.resources.processed || []),
                            ...(mockDataFile.resources.advanced || [])
                        ];

                        // Convert to array format for compatibility
                        resourcesArray = allResources.map(id => ({
                            id,
                            name: id.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                            category: mockDataFile.resources.raw?.includes(id) ? 'raw' :
                                mockDataFile.resources.processed?.includes(id) ? 'processed' : 'advanced'
                        }));

                        // Also create object format
                        allResources.forEach(id => {
                            resourcesObject[id] = {
                                name: id.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                                category: mockDataFile.resources.raw?.includes(id) ? 'raw' :
                                    mockDataFile.resources.processed?.includes(id) ? 'processed' : 'advanced'
                            };
                        });
                    } else {
                        // Resources are already in the right format
                        resourcesArray = mockDataFile.resources;
                        resourcesObject = mockDataFile.resources;
                    }
                }

                console.log('Processed resources:', resourcesArray.length, 'items');

                // Load recipes from CSV file
                let processedRecipes: any[] = [];
                try {
                    const recipesCSV = await this.loadCSV('/data/mockRecipes.csv');
                    if (recipesCSV && recipesCSV.length > 0) {
                        processedRecipes = this.processRecipes(recipesCSV);
                        console.log('Loaded', processedRecipes.length, 'recipes from mockRecipes.csv');
                    } else {
                        // Fallback to recipes in mockData if CSV fails
                        processedRecipes = mockDataFile.recipes || [];
                        console.log('Using', processedRecipes.length, 'recipes from mockData.json');
                    }
                } catch (error) {
                    console.warn('Failed to load mockRecipes.csv, using mockData recipes:', error);
                    processedRecipes = mockDataFile.recipes || [];
                }

                const loadedData = {
                    cargo: resourcesObject,
                    tags: mockDataFile.tags || [],
                    planetArchetypes: mockDataFile.planetArchetypes || [],
                    claimStakeBuildings: mockDataFile.buildings || [],
                    craftingHabBuildings: mockDataFile.craftingHabBuildings || mockDataFile.buildings?.filter((b: any) =>
                        b.category === 'hab' || b.category === 'crafting'
                    ) || [],
                    recipes: processedRecipes,
                    planets: mockDataFile.planets || [],
                    buildings: mockDataFile.buildings || [],
                    resources: resourcesArray,
                    claimStakeDefinitions: mockDataFile.claimStakeDefinitions || [],
                    starbases: mockDataFile.starbases || []
                };

                console.log('Returning data with', loadedData.buildings.length, 'buildings,',
                    loadedData.resources.length, 'resources, and', loadedData.recipes.length, 'recipes');
                return loadedData;
            }

            // Fallback to trying individual files if mockData.json doesn't load
            const [
                cargoData,
                tagsData,
                planetArchetypesData,
                claimStakeBuildingsData,
                craftingHabBuildingsData,
                recipesCSV
            ] = await Promise.all([
                this.loadJSON('/data/cargo.json'),
                this.loadJSON('/data/tags.json'),
                this.loadJSON('/data/planetArchetypes.json'),
                this.loadJSON('/data/claimStakeBuildings.json'),
                this.loadJSON('/data/craftingHabBuildings.json'),
                this.loadCSV('/data/recipes.csv')
            ]);

            // Process recipes from CSV
            const processedRecipes = recipesCSV.length > 0
                ? this.processRecipes(recipesCSV)
                : MOCK_DATA.craftingRecipes;

            // Process claimStakeBuildings to extract buildings and planets
            let finalBuildings = [];
            let finalPlanets = [];

            if (claimStakeBuildingsData?.buildings) {
                finalBuildings = claimStakeBuildingsData.buildings;
            } else if (MOCK_DATA.buildings) {
                finalBuildings = MOCK_DATA.buildings;
            }

            if (claimStakeBuildingsData?.planets) {
                finalPlanets = claimStakeBuildingsData.planets;
            } else if (MOCK_DATA.planets) {
                finalPlanets = MOCK_DATA.planets;
            }

            // Merge all data, using proper priorities
            return {
                cargo: cargoData || [],
                tags: tagsData || [],
                planetArchetypes: planetArchetypesData || MOCK_DATA.planetArchetypes,
                claimStakeBuildings: claimStakeBuildingsData || { buildings: MOCK_DATA.buildings, planets: MOCK_DATA.planets },
                craftingHabBuildings: craftingHabBuildingsData || [],
                recipes: processedRecipes,
                // Use proper data sources
                planets: finalPlanets,
                buildings: finalBuildings,
                resources: MOCK_DATA.resources,
                claimStakeDefinitions: MOCK_DATA.claimStakeDefinitions,
            };
        } catch (error) {
            console.warn('Using fallback mock data for development:', error);
            return MOCK_DATA;
        }
    }

    static processRecipes(csvData: any[]): any[] {
        return csvData.map(row => ({
            id: row.OutputID,
            name: row.OutputName,
            type: row.OutputType,
            tier: row.OutputTier,
            buildingResourceTier: row.BuildingResourceTier,
            constructionTime: row.ConstructionTime,
            planetTypes: row.PlanetTypes,
            factions: row.Factions,
            resourceType: row.ResourceType,
            productionSteps: row.ProductionSteps,
            ingredients: this.extractIngredients(row),
            output: {
                resource: row.OutputID.replace('recipe_', ''), // Remove recipe_ prefix to get resource id
                quantity: 1 // Default to 1 for now, can be updated if CSV has quantity
            }
        }));
    }

    static extractIngredients(row: any): Array<{ resource: string, quantity: number }> {
        const ingredients: Array<{ resource: string, quantity: number }> = [];
        for (let i = 1; i <= 8; i++) {
            const ingredient = row[`Ingredient${i}`];
            const quantity = row[`Quantity${i}`];
            if (ingredient && quantity) {
                ingredients.push({
                    resource: ingredient,
                    quantity: parseInt(quantity, 10)
                });
            }
        }
        return ingredients;
    }
} 