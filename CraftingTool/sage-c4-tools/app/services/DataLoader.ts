import Papa from 'papaparse';

export class DataLoader {
    static async loadJSON(path: string): Promise<any> {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                console.warn(`Failed to load ${path}: ${response.status}`);
                return null;
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.warn(`Failed to load ${path}:`, error);
            return null;
        }
    }

    static async loadCSV(path: string): Promise<any[]> {
        return new Promise((resolve, reject) => {
            fetch(path)
                .then(response => {
                    if (!response.ok) {
                        console.warn(`Failed to load ${path}: ${response.status}`);
                        resolve([]);
                        return;
                    }
                    return response.text();
                })
                .then(text => {
                    if (!text) {
                        resolve([]);
                        return;
                    }
                    Papa.parse(text, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (result) => resolve(result.data),
                        error: (error) => {
                            console.warn(`Failed to parse CSV ${path}:`, error);
                            resolve([]);
                        }
                    });
                })
                .catch(error => {
                    console.warn(`Failed to load CSV ${path}:`, error);
                    resolve([]);
                });
        });
    }

    static processRecipes(csvData: any[]): any[] {
        if (!csvData || csvData.length === 0) return [];

        return csvData.map(row => {
            const ingredients: any[] = [];

            // Process up to 10 ingredients
            for (let i = 1; i <= 10; i++) {
                const ingredientKey = `Ingredient${i}`;
                const quantityKey = `Quantity${i}`;

                if (row[ingredientKey] && row[quantityKey]) {
                    ingredients.push({
                        resource: row[ingredientKey],
                        quantity: parseInt(row[quantityKey]) || 0
                    });
                }
            }

            return {
                id: row.OutputID || row.outputId,
                name: row.OutputName || row.outputName,
                type: row.OutputType || row.outputType || 'Component',
                tier: parseInt(row.OutputTier || row.outputTier) || 1,
                buildingResourceTier: parseInt(row.BuildingResourceTier || row.buildingResourceTier) || 1,
                constructionTime: parseInt(row.ConstructionTime || row.constructionTime) || 60,
                planetTypes: row.PlanetTypes || row.planetTypes || 'All',
                factions: row.Factions || row.factions || 'All',
                resourceType: row.ResourceType || row.resourceType || 'Processed',
                productionSteps: parseInt(row.ProductionSteps || row.productionSteps) || 1,
                ingredients: ingredients,
                output: {
                    resource: row.OutputID || row.outputId,
                    quantity: 1 // Default to 1 if not specified
                }
            };
        }).filter(recipe => recipe.id && recipe.name); // Filter out invalid recipes
    }

    static async loadAll() {
        try {
            console.log('Loading all game data...');

            // Load all data files
            const [
                resourcesData,
                planetsData,
                planetArchetypesData,
                claimStakeBuildingsData,
                craftingHabBuildingsData,
                starbasesData,
                recipesJSON,
                recipesCSV
            ] = await Promise.all([
                this.loadJSON('/data/resources.json'),
                this.loadJSON('/data/planets.json'),
                this.loadJSON('/data/planetArchetypes.json'),
                this.loadJSON('/data/claimStakeBuildings.json'),
                this.loadJSON('/data/craftingHabBuildings.json'),
                this.loadJSON('/data/starbases.json'),
                this.loadJSON('/data/recipes.json'),  // Try JSON first
                this.loadCSV('/data/recipes.csv')      // Fallback to CSV
            ]);

            // Process resources
            let resources = [];
            let resourceCategories = {};

            if (resourcesData) {
                if (resourcesData.resources) {
                    resources = resourcesData.resources;
                }
                if (resourcesData.categories) {
                    resourceCategories = resourcesData.categories;
                }
            }

            // Process planets
            let planets = [];
            if (planetsData) {
                planets = Array.isArray(planetsData) ? planetsData : (planetsData.planets || []);
            }

            // Process planet archetypes
            let planetArchetypes = [];
            if (planetArchetypesData) {
                planetArchetypes = Array.isArray(planetArchetypesData) ? planetArchetypesData : (planetArchetypesData.archetypes || []);
            }

            // Process claim stake buildings
            let claimStakeBuildings = [];
            let claimStakeDefinitions = [];

            if (claimStakeBuildingsData) {
                if (claimStakeBuildingsData.buildings) {
                    claimStakeBuildings = claimStakeBuildingsData.buildings;
                }
                if (claimStakeBuildingsData.claimStakeDefinitions) {
                    claimStakeDefinitions = claimStakeBuildingsData.claimStakeDefinitions;
                }
            }

            // Process crafting hab buildings
            let craftingHabBuildings = {
                habs: [],
                craftingStations: [],
                cargoStorage: []
            };

            if (craftingHabBuildingsData) {
                craftingHabBuildings = {
                    habs: craftingHabBuildingsData.habs || [],
                    craftingStations: craftingHabBuildingsData.craftingStations || [],
                    cargoStorage: craftingHabBuildingsData.cargoStorage || []
                };
            }

            // Process starbases
            let starbases = [];
            if (starbasesData) {
                starbases = Array.isArray(starbasesData) ? starbasesData : (starbasesData.starbases || []);
            }

            // Process recipes - prefer JSON over CSV
            let processedRecipes = [];

            if (recipesJSON) {
                console.log('Loading recipes from recipes.json...');
                // If recipes.json exists, use it directly (assuming it's already in the right format)
                if (Array.isArray(recipesJSON)) {
                    processedRecipes = recipesJSON;
                } else if (recipesJSON.recipes) {
                    processedRecipes = recipesJSON.recipes;
                } else {
                    console.warn('Unexpected format in recipes.json, trying to use as-is');
                    processedRecipes = recipesJSON;
                }

                // Validate and ensure all recipes have required fields
                processedRecipes = processedRecipes.map((recipe: any) => ({
                    id: recipe.id || recipe.OutputID || recipe.outputId,
                    name: recipe.name || recipe.OutputName || recipe.outputName,
                    type: recipe.type || recipe.OutputType || recipe.outputType || 'Component',
                    tier: recipe.tier || parseInt(recipe.OutputTier || recipe.outputTier) || 1,
                    buildingResourceTier: recipe.buildingResourceTier || parseInt(recipe.BuildingResourceTier) || 1,
                    constructionTime: recipe.constructionTime || parseInt(recipe.ConstructionTime) || 60,
                    planetTypes: recipe.planetTypes || recipe.PlanetTypes || 'All',
                    factions: recipe.factions || recipe.Factions || 'All',
                    resourceType: recipe.resourceType || recipe.ResourceType || 'Processed',
                    productionSteps: recipe.productionSteps || parseInt(recipe.ProductionSteps) || 1,
                    ingredients: recipe.ingredients || [],
                    output: recipe.output || {
                        resource: recipe.id || recipe.OutputID || recipe.outputId,
                        quantity: recipe.outputQuantity || 1
                    }
                })).filter((recipe: any) => recipe.id && recipe.name);

                console.log(`Loaded ${processedRecipes.length} recipes from JSON`);
            } else if (recipesCSV && recipesCSV.length > 0) {
                console.log('Falling back to recipes.csv...');
                // Fall back to CSV if JSON doesn't exist
                processedRecipes = this.processRecipes(recipesCSV);
                console.log(`Processed ${processedRecipes.length} recipes from CSV`);
            } else {
                console.warn('No recipes found in either recipes.json or recipes.csv');
            }

            // Return the complete data structure
            const gameData = {
                resources,
                resourceCategories,
                planets,
                planetArchetypes,
                buildings: claimStakeBuildings,
                claimStakeDefinitions,
                craftingHabBuildings,
                starbases,
                recipes: processedRecipes,
                craftingRecipes: processedRecipes, // Maintain backward compatibility

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

            console.log('✅ Game data loaded successfully:', {
                resources: resources.length,
                resourceCategories: Object.keys(resourceCategories).length,
                planets: planets.length,
                planetArchetypes: planetArchetypes.length,
                buildings: claimStakeBuildings.length,
                claimStakeDefinitions: claimStakeDefinitions.length,
                craftingHabs: craftingHabBuildings.habs.length,
                craftingStations: craftingHabBuildings.craftingStations.length,
                recipes: processedRecipes.length,
                starbases: starbases.length
            });

            // Log sample data for verification
            if (processedRecipes.length > 0) {
                console.log('📦 Sample recipe:', processedRecipes[0]);
            }
            if (resources.length > 0) {
                console.log('📦 Sample resource:', resources[0]);
            }

            return gameData;

        } catch (error) {
            console.error('Failed to load game data:', error);
            throw new Error('Failed to initialize game data. Please ensure all data files are present in /public/data/');
        }
    }
}

export default DataLoader;