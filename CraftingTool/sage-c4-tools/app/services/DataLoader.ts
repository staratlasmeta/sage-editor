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
        {
            id: 'extractor_basic',
            name: 'Basic Extractor',
            category: 'extraction',
            tier: 1,
            slots: 2,
            power: -10,
            crew: 5,
            extractionRate: {
                'iron-ore': 1,
                'copper-ore': 1,
                'hydrogen': 1,
                'coal': 1,
                'silica': 1
            },
            requiredTags: ['mining']
        },
        {
            id: 'generator_basic',
            name: 'Basic Generator',
            category: 'power',
            tier: 1,
            slots: 3,
            power: 50,
            crew: 3,
            resourceUsage: {
                'fuel': 0.5
            }
        },
        {
            id: 'storage_basic',
            name: 'Basic Storage',
            category: 'storage',
            slots: 2,
            power: -5,
            crew: 2,
            storage: 1000,
            resourceStorage: {
                capacity: 500
            }
        },
        {
            id: 'processor_copper',
            name: 'Copper Processor',
            category: 'processing',
            tier: 1,
            slots: 4,
            power: -15,
            crew: 8,
            resourceUsage: {
                'copper-ore': 1  // Consumes 1 copper ore per second
            },
            resourceProduction: {
                'copper': 0.5  // Produces 0.5 copper per second
            },
            requiredTags: ['processing']
        },
        {
            id: 'processor_steel',
            name: 'Steel Processor',
            category: 'processing',
            tier: 2,
            slots: 6,
            power: -20,
            crew: 10,
            resourceUsage: {
                'iron-ore': 2,  // Consumes 2 iron ore per second
                'coal': 1       // Consumes 1 coal per second
            },
            resourceProduction: {
                'steel': 0.8    // Produces 0.8 steel per second
            },
            requiredTags: ['processing', 'industrial']
        },
        {
            id: 'processor_fuel',
            name: 'Fuel Processor',
            category: 'processing',
            tier: 3,
            slots: 8,
            power: -25,
            crew: 12,
            resourceUsage: {
                'hydrogen': 2   // Consumes 2 hydrogen per second
            },
            resourceProduction: {
                'fuel': 1       // Produces 1 fuel per second - self-sustaining!
            },
            requiredTags: ['processing']
        }
    ],
    resources: [
        { id: 'iron_ore', name: 'Iron Ore', category: 'raw' },
        { id: 'copper_ore', name: 'Copper Ore', category: 'raw' },
        { id: 'steel', name: 'Steel', category: 'processed' },
        { id: 'electronics', name: 'Electronics', category: 'processed' }
    ],
    claimStakeDefinitions: [
        {
            id: 'cs_tier1_basic',
            name: 'Basic Claim Stake',
            tier: 1,
            slots: 10,
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
            // Try to load real data files
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

            // Merge all data, using mock data as fallback
            return {
                cargo: cargoData || [],
                tags: tagsData || [],
                planetArchetypes: planetArchetypesData || MOCK_DATA.planetArchetypes,
                claimStakeBuildings: claimStakeBuildingsData || MOCK_DATA.buildings,
                craftingHabBuildings: craftingHabBuildingsData || [],
                recipes: processedRecipes,
                // Include mock data for development
                planets: MOCK_DATA.planets,
                buildings: MOCK_DATA.buildings,
                resources: MOCK_DATA.resources,
                claimStakeDefinitions: MOCK_DATA.claimStakeDefinitions,
            };
        } catch (error) {
            console.warn('Using mock data for development:', error);
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