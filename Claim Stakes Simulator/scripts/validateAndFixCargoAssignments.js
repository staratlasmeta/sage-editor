const fs = require('fs');
const path = require('path');

// Load the game data
const gameDataPath = path.join(__dirname, '../src/gameData_allTiers.json');
const gameData = JSON.parse(fs.readFileSync(gameDataPath, 'utf8'));
const actualGameData = gameData.data;

function validateAndFix() {
    // Debug logging to understand the data structure
    console.log('\nData Structure Check:');
    console.log('====================');
    console.log('Keys in gameData:', Object.keys(gameData));

    console.log('\nChecking data structure:', Object.keys(actualGameData));

    // First, identify raw resources and their tags
    const rawResources = new Set();
    const rawResourceTags = new Map();

    // Helper function to check if a cargo is used in any recipe
    function isUsedInRecipes(cargoId) {
        return Object.values(actualGameData.recipes || {}).some(recipe => {
            // Check if cargo is an output
            if (recipe.output?.[cargoId]) return true;
            // Check if cargo is an input
            if (recipe.input?.[cargoId]) return true;
            return false;
        });
    }

    // Identify raw resources
    Object.entries(actualGameData.cargo || {}).forEach(([cargoId, cargo]) => {
        console.log(`\nChecking cargo: ${cargoId}`);
        const isUsedInRecipe = isUsedInRecipes(cargoId);
        console.log(`  Used in recipes: ${isUsedInRecipe}`);

        // Only add if it's not used in any recipe
        if (!isUsedInRecipe) {
            rawResources.add(cargoId);
            const tagName = `tag-${cargoId.replace('cargo-', '')}`;
            rawResourceTags.set(cargoId, tagName);
            rawResourceTags.set(tagName, tagName);
            console.log(`  ✓ Added as raw resource: ${cargoId} -> ${tagName}`);
        } else {
            console.log(`  ✗ Skipped: Used in recipe as input or output`);
        }
    });

    const fixes = {
        planetArchetypes: [],
        buildings: []
    };

    console.log('\nChecking Cargo Items:');
    console.log('===================');
    // Step 1: Create a map of cargo items to their allowed factions and planet types
    const cargoRestrictions = {};
    Object.entries(actualGameData.cargo || {}).forEach(([cargoId, cargo]) => {
        console.log(`Examining cargo: ${cargoId}`);
        console.log('Cargo data:', cargo);

        if (cargo.factions || cargo.planetTypes) {
            cargoRestrictions[cargoId] = {
                factions: cargo.factions || ['ONI', 'MUD', 'USTUR'],
                planetTypes: cargo.planetTypes || []
            };
            console.log(`Found restrictions for ${cargoId}:`, cargoRestrictions[cargoId]);
        }
    });

    console.log('\nChecking Planet Archetypes:');
    console.log('=========================');
    // Step 2: Validate planet archetypes
    Object.entries(actualGameData.planetArchetypes || {}).forEach(([archetypeId, archetype]) => {
        console.log(`\nExamining archetype: ${archetypeId}`);
        console.log('Archetype data:', archetype);

        const archetypeFaction = archetype.tags.find(tag => ['tag-oni', 'tag-mud', 'tag-ustur'].includes(tag))?.replace('tag-', '').toUpperCase();
        const archetypePlanetType = archetype.name;

        console.log(`Archetype faction: ${archetypeFaction}`);
        console.log(`Archetype planet type: ${archetypePlanetType}`);

        // Check richness entries
        Object.entries(archetype.richness || {}).forEach(([cargoId, richness]) => {
            console.log(`\nChecking richness for ${cargoId} (value: ${richness})`);
            const restrictions = cargoRestrictions[cargoId];

            if (restrictions) {
                const isValidFaction = !restrictions.factions.length || restrictions.factions.includes(archetypeFaction);
                const isValidPlanet = !restrictions.planetTypes.length || restrictions.planetTypes.includes(archetypePlanetType);

                console.log(`Restrictions found:`, restrictions);
                console.log(`Valid faction: ${isValidFaction}`);
                console.log(`Valid planet: ${isValidPlanet}`);

                if (!isValidFaction || !isValidPlanet) {
                    fixes.planetArchetypes.push({
                        archetypeId,
                        action: 'remove_richness',
                        cargo: cargoId,
                        reason: `Invalid ${!isValidFaction ? 'faction' : 'planet type'} for ${cargoId}`
                    });
                }
            }
        });

        // Check tags
        archetype.tags.forEach(tag => {
            if (tag.startsWith('tag-cargo-')) {
                const cargoId = 'cargo-' + tag.replace('tag-cargo-', '');
                const restrictions = cargoRestrictions[cargoId];
                if (restrictions) {
                    const isValidFaction = !restrictions.factions.length || restrictions.factions.includes(archetypeFaction);
                    const isValidPlanet = !restrictions.planetTypes.length || restrictions.planetTypes.includes(archetypePlanetType);

                    if (!isValidFaction || !isValidPlanet) {
                        fixes.planetArchetypes.push({
                            archetypeId,
                            action: 'remove_tag',
                            tag,
                            reason: `Invalid ${!isValidFaction ? 'faction' : 'planet type'} for ${tag}`
                        });
                    }
                }
            }
        });
    });

    // Modified Step 3: Add required tags only for raw resources and fix hub tags
    Object.entries(actualGameData.claimStakeBuildings || {}).forEach(([buildingId, building]) => {
        if (buildingId.toLowerCase().includes('hub')) {
            return; // Skip hubs
        }

        console.log(`\nProcessing building: ${buildingId}`);
        const newRequiredTags = new Set();

        const isProcessor = buildingId.toLowerCase().includes('processor');
        console.log(`  Is processor: ${isProcessor}`);

        // Handle existing tags
        building.requiredTags?.forEach(tag => {
            if (tag.includes('extraction-hub')) {
                if (isProcessor) {
                    const newTag = tag.replace('extraction-hub', 'processing-hub');
                    newRequiredTags.add(newTag);
                    console.log(`  Converting hub tag: ${tag} -> ${newTag}`);
                } else {
                    newRequiredTags.add(tag);
                    console.log(`  Keeping extraction hub tag: ${tag}`);
                }
            } else if (!tag.match(/^tag-[^-]+(-(ore|crystals|dust))?$/)) {
                // Keep any non-resource tags
                newRequiredTags.add(tag);
                console.log(`  Keeping non-resource tag: ${tag}`);
            } else {
                console.log(`  Removing resource tag: ${tag}`);
            }
        });

        // For processors, only look at resource inputs (negative rates)
        if (isProcessor) {
            Object.entries(building.resourceRate || {}).forEach(([cargoId, rate]) => {
                if (rate < 0 && rawResources.has(cargoId)) {
                    const tagName = rawResourceTags.get(cargoId);
                    if (tagName) {
                        newRequiredTags.add(tagName);
                        console.log(`  Adding raw resource input tag: ${tagName}`);
                    }
                }
            });
        } else {
            // For extractors, look at extraction rates
            Object.keys(building.resourceExtractionRate || {}).forEach(cargoId => {
                if (rawResources.has(cargoId)) {
                    const tagName = rawResourceTags.get(cargoId);
                    if (tagName) {
                        newRequiredTags.add(tagName);
                        console.log(`  Adding raw resource extraction tag: ${tagName}`);
                    }
                }
            });
        }

        // If tags changed, add to fixes
        const newTagsArray = Array.from(newRequiredTags);
        if (JSON.stringify(newTagsArray.sort()) !== JSON.stringify((building.requiredTags || []).sort())) {
            fixes.buildings.push({
                buildingId,
                action: 'update_required_tags',
                oldTags: building.requiredTags || [],
                newTags: newTagsArray
            });
            console.log(`  Tags updated for ${buildingId}:`);
            console.log('    Old:', building.requiredTags || []);
            console.log('    New:', newTagsArray);
        } else {
            console.log(`  No tag changes needed for ${buildingId}`);
        }
    });

    // Output the fixes
    console.log('\nValidation Results:');
    console.log('===================');

    console.log('\nPlanet Archetype Fixes Needed:', fixes.planetArchetypes.length);
    fixes.planetArchetypes.forEach(fix => {
        console.log(`\n${fix.archetypeId}:`);
        console.log(`  Action: ${fix.action}`);
        console.log(`  ${fix.action === 'remove_richness' ? 'Cargo' : 'Tag'}: ${fix.action === 'remove_richness' ? fix.cargo : fix.tag}`);
        console.log(`  Reason: ${fix.reason}`);
    });

    console.log('\nBuilding Tag Updates Needed:', fixes.buildings.length);
    fixes.buildings.forEach(fix => {
        console.log(`\n${fix.buildingId}:`);
        console.log('  Old tags:', fix.oldTags);
        console.log('  New tags:', fix.newTags);
    });

    // Ask if user wants to apply fixes
    console.log('\nWould you like to apply these fixes? (yes/no)');
    process.stdin.once('data', (data) => {
        if (data.toString().trim().toLowerCase() === 'yes') {
            applyFixes(fixes);
        } else {
            console.log('No changes were made.');
            process.exit(0);
        }
    });
}

function applyFixes(fixes) {
    // Apply planet archetype fixes
    fixes.planetArchetypes.forEach(fix => {
        const archetype = actualGameData.planetArchetypes[fix.archetypeId];
        if (fix.action === 'remove_richness') {
            delete archetype.richness[fix.cargo];
        } else if (fix.action === 'remove_tag') {
            archetype.tags = archetype.tags.filter(tag => tag !== fix.tag);
        }
    });

    // Apply building tag fixes
    fixes.buildings.forEach(fix => {
        actualGameData.claimStakeBuildings[fix.buildingId].requiredTags = fix.newTags;
    });

    // Write the updated data back to the file
    fs.writeFileSync(gameDataPath, JSON.stringify(gameData, null, 4));
    console.log('\nAll fixes have been applied successfully!');
    process.exit(0);
}

// Run the validation
validateAndFix(); 