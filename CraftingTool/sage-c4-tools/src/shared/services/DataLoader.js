import Papa from 'papaparse';

class DataLoader {
    static async loadJSON(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`Failed to load ${path}`);
            return await response.json();
        } catch (error) {
            console.error(`Error loading JSON from ${path}:`, error);
            throw error;
        }
    }

    static async loadCSV(path) {
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
                    reject(error);
                }
            });
        });
    }

    static async loadAll() {
        try {
            const [mockData, recipes] = await Promise.all([
                this.loadJSON('/data/mockData.json'),
                this.loadCSV('/data/mockRecipes.csv')
            ]);

            // Process and merge data
            const processedRecipes = this.processRecipes(recipes);

            return {
                ...mockData,
                recipesCSV: processedRecipes,
                // Merge CSV recipes with JSON recipes
                allRecipes: [...mockData.craftingRecipes, ...processedRecipes]
            };
        } catch (error) {
            console.error('Failed to load game data:', error);
            throw new Error('Failed to initialize game data. Please check that all data files are present.');
        }
    }

    static processRecipes(csvData) {
        return csvData.map(row => ({
            id: row.OutputID,
            name: row.OutputName,
            type: row.OutputType,
            tier: row.OutputTier,
            constructionTime: row.ConstructionTime,
            ingredients: this.extractIngredients(row),
            completionStatus: row.CompletionStatus,
            productionSteps: row.ProductionSteps
        }));
    }

    static extractIngredients(row) {
        const ingredients = {};
        for (let i = 1; i <= 5; i++) {
            const ingredient = row[`Ingredient${i}`];
            const quantity = row[`Quantity${i}`];
            if (ingredient && quantity) {
                ingredients[ingredient] = quantity;
            }
        }
        return ingredients;
    }
}

export default DataLoader;