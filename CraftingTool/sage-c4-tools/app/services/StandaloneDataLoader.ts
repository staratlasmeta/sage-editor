import Papa from 'papaparse';

// No mock data - always use proper data files
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
            id: 'copper-ore-processor-t1',
            name: 'Copper Ore Processor T1',
            category: 'processing',
            tier: 1,
            slots: 3,
            power: -10,
            crew: 15,
            resourceUsage: { 'copper-ore': 0.5 },
            resourceProduction: { 'cargo-copper': 0.4 },
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

    static processRecipes(csvData: any[]): any[] {
        return csvData.map(row => ({
            id: row.OutputID,
            name: row.OutputName,
            type: row.OutputType,
            tier: parseInt(row.OutputTier) || 1,
            buildingResourceTier: row.BuildingResourceTier,
            constructionTime: parseInt(row.ConstructionTime) || 60,
            planetTypes: row.PlanetTypes?.split(';') || [],
            factions: row.Factions?.split(';') || [],
            resourceType: row.ResourceType,
            productionSteps: parseInt(row.ProductionSteps) || 1,
            ingredients: this.extractIngredients(row),
            output: {
                resource: row.OutputID,
                quantity: 1
            },
            crewRequired: 10
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

    static async loadGameData() {
        console.log('Loading game data for standalone build...');

        try {
            // First try to load the proper data files
            const [
                resourcesResponse,
                planetsResponse,
                archetypesResponse,
                buildingsResponse,
                craftingBuildingsResponse,
                recipesResponse,
                starbasesResponse
            ] = await Promise.all([
                fetch('./data/resources.json').catch(() => null),
                fetch('./data/planets.json').catch(() => null),
                fetch('./data/planetArchetypes.json').catch(() => null),
                fetch('./data/claimStakeBuildings.json').catch(() => null),
                fetch('./data/craftingHabBuildings.json').catch(() => null),
                fetch('./data/recipes.json').catch(() => null),
                fetch('./data/starbases.json').catch(() => null)
            ]);

            // If all proper data files exist, use them
            if (resourcesResponse?.ok && planetsResponse?.ok && buildingsResponse?.ok) {
                console.log('✅ Loading proper data files from /data/ folder...');

                const resourcesData = await resourcesResponse.json();
                const planetsData = await planetsResponse.json();
                const archetypesData = archetypesResponse?.ok ? await archetypesResponse.json() : null;
                const buildingsData = await buildingsResponse.json();
                const craftingBuildingsData = craftingBuildingsResponse?.ok ? await craftingBuildingsResponse.json() : null;
                const recipesDataRaw = recipesResponse?.ok ? await recipesResponse.json() : null;
                const starbasesData = starbasesResponse?.ok ? await starbasesResponse.json() : null;

                // Process recipes to ensure ingredients have resource IDs
                let recipesData = null;
                if (recipesDataRaw) {
                    const recipesList = recipesDataRaw.recipes || recipesDataRaw;
                    recipesData = Array.isArray(recipesList) ?
                        recipesList.map((recipe: any) => ({
                            ...recipe,
                            ingredients: (recipe.ingredients || []).map((ing: any) => {
                                // Convert ingredient name to resource ID if needed
                                if (ing.name && !ing.resource) {
                                    return {
                                        resource: ing.name.toLowerCase().replace(/\s+/g, '-'),
                                        quantity: ing.quantity || 1
                                    };
                                }
                                return ing;
                            })
                        })) : recipesList;
                }

                // Process buildings - keep them SEPARATE, don't merge!
                // Also add category field based on building ID/name patterns
                const claimStakeBuildings = (buildingsData.buildings || []).map((building: any) => {
                    // Add category field if missing
                    if (!building.category) {
                        const name = building.name?.toLowerCase() || '';
                        const id = building.id?.toLowerCase() || '';

                        // Infrastructure: ONLY Central Hub and Crew Quarters
                        if (name.includes('central hub') || name.includes('crew quarters') || id.includes('central-hub')) {
                            building.category = 'infrastructure';
                        }
                        // Power: Power plants and solar arrays
                        else if (name.includes('power plant') || name.includes('solar array') || name.includes('power') || id.includes('power')) {
                            building.category = 'power';
                        }
                        // Extraction: Extraction Hub and all extractor buildings
                        else if (name.includes('extraction hub') || name.includes('extractor') || id.includes('extraction') || id.includes('extractor')) {
                            building.category = 'extraction';
                        }
                        // Processing: Processing Hub and all processor buildings
                        else if (name.includes('processing hub') || name.includes('processor') || id.includes('processing') || id.includes('processor')) {
                            building.category = 'processing';
                        }
                        // Farm: Farm Hub and all buildings with "farm" in the name
                        else if (name.includes('farm') || name.includes('cultivation hub') || id.includes('farm')) {
                            building.category = 'farm';
                        }
                        // Storage: Storage Hub and storage buildings
                        else if (name.includes('storage hub') || name.includes('storage') || id.includes('storage')) {
                            building.category = 'storage';
                        }
                        // Default fallback
                        else {
                            building.category = 'general';
                        }
                    }
                    return building;
                });

                // Extract arrays from the JSON structure
                const resources = resourcesData.resources || [];
                const planets = planetsData.planets || [];
                const planetArchetypes = archetypesData?.archetypes || [];
                const buildings = buildingsData.buildings || [];
                const claimStakeDefinitions = buildingsData.claimStakeDefinitions || [];
                const recipes = recipesData || [];
                const starbases = starbasesData?.starbases || [];

                // Log what we loaded
                console.log('✅ Game data loaded successfully:', {
                    resources: resources.length,
                    planets: planets.length,
                    planetArchetypes: planetArchetypes.length,
                    buildings: claimStakeBuildings.length,
                    claimStakeDefinitions: claimStakeDefinitions.length,
                    craftingHabs: (craftingBuildingsData?.habs || []).length,
                    craftingStations: (craftingBuildingsData?.craftingStations || []).length,
                    cargoStorage: (craftingBuildingsData?.cargoStorage || []).length,
                    recipes: recipes.length,
                    starbases: starbases.length
                });

                return {
                    resources: resources,
                    resourceCategories: resourcesData.categories || {},
                    planets: planets,
                    planetArchetypes: planetArchetypes,
                    buildings: claimStakeBuildings,
                    claimStakeDefinitions: claimStakeDefinitions,
                    craftingHabBuildings: craftingBuildingsData || {
                        habs: [],
                        craftingStations: [],
                        cargoStorage: []
                    },
                    recipes: recipes,
                    craftingRecipes: recipes,
                    starbases: starbases,

                    // Helper methods
                    getResourceById: (id: string) => {
                        return resources.find((r: any) => r.id === id);
                    },
                    getResourceCategory: (resourceId: string) => {
                        const resource = resources.find((r: any) => r.id === resourceId);
                        return resource ? resource.category : 'unknown';
                    },
                    getResourceName: (resourceId: string) => {
                        const resource = resources.find((r: any) => r.id === resourceId);
                        return resource ? resource.name : resourceId;
                    }
                };
            }

            // Fall back to mockData.json if proper files don't exist
            console.log('Falling back to mockData.json...');
            const response = await fetch('./data/mockData.json');
            if (response.ok) {
                const mockDataFile = await response.json();
                console.log('Successfully loaded mockData.json file');

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
                        resourcesArray = allResources.map((id: string) => ({
                            id,
                            name: id.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                            category: mockDataFile.resources.raw?.includes(id) ? 'raw' :
                                mockDataFile.resources.processed?.includes(id) ? 'processed' : 'advanced'
                        }));

                        // Also create object format
                        allResources.forEach((id: string) => {
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

                // Load recipes from CSV file
                let processedRecipes: any[] = [];
                try {
                    const recipesResponse = await fetch('./data/mockRecipes.csv');
                    if (recipesResponse.ok) {
                        const csvText = await recipesResponse.text();
                        const csvData = await this.parseCSV(csvText);
                        if (csvData && csvData.length > 0) {
                            processedRecipes = this.processRecipes(csvData);
                            console.log('Loaded', processedRecipes.length, 'recipes from mockRecipes.csv');
                        }
                    }
                } catch (error) {
                    console.warn('Failed to load mockRecipes.csv:', error);
                }

                // Fallback to recipes in mockData if CSV loading failed
                if (processedRecipes.length === 0) {
                    processedRecipes = mockDataFile.recipes || [];
                    console.log('Using', processedRecipes.length, 'recipes from mockData.json');
                }

                console.log('Loaded', mockDataFile.planets?.length, 'planets,', mockDataFile.buildings?.length, 'buildings,',
                    resourcesArray.length, 'resources,', processedRecipes.length, 'recipes');

                return {
                    cargo: resourcesObject,
                    tags: mockDataFile.tags || {},
                    planetArchetypes: mockDataFile.planetArchetypes || {},
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
            }
        } catch (error) {
            console.warn('Failed to load mockData.json, using fallback data:', error);
        }

        // No fallback - data files must exist
        console.error('Failed to load required data files');
        throw new Error('Failed to load required data files. Please ensure all JSON files are present in /data/ folder.');
    }

    static async loadMockData() {
        return MOCK_DATA;
    }
} 