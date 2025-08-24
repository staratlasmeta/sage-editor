const fs = require('fs');

console.log('👑 CORE/KING REGIONAL BUILDING VALIDATION ANALYSIS');
console.log('='.repeat(70));

// Read all necessary files
const buildingData = fs.readFileSync('buildingRecipes.tsv', 'utf8');
const craftingData = fs.readFileSync('craftingRecipes.tsv', 'utf8');
const systemData = JSON.parse(fs.readFileSync('systems-and-planets-extract.json', 'utf8'));

// Parse TSV files
function parseTSV(data) {
    const lines = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
    const headers = lines[0].split('\t');
    return lines.slice(1).map(line => {
        const values = line.split('\t');
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] || '';
        });
        return obj;
    });
}

const allBuildings = parseTSV(buildingData);
const crafting = parseTSV(craftingData);

// Extract tier from OutputID
function extractTierFromID(outputID) {
    const match = outputID.match(/-t(\d+)$/);
    return match ? parseInt(match[1]) : 1;
}

// Extract region identifier from system name
function extractRegionIdentifier(systemName) {
    const patterns = [
        /([IVX]+)[-\s]/,
        /(\d+)[-\s]/,
        /sector[-\s](\w+)/i,
        /region[-\s](\w+)/i,
        /^(\w+)[-\s]/
    ];

    for (const pattern of patterns) {
        const match = systemName.match(pattern);
        if (match) {
            return match[1].toLowerCase();
        }
    }
    return systemName.substring(0, 3).toLowerCase();
}

// Build regional clusters
const regionalClusters = {};
const allPlanetTypes = ['Terrestrial Planet', 'Oceanic Planet', 'Gas Giant', 'Ice Giant', 'Volcanic Planet', 'Barren Planet', 'Dark Planet', 'Asteroid Belt'];

systemData.systems.forEach(system => {
    const faction = system.faction;
    const clusterKey = extractRegionIdentifier(system.name);
    const fullClusterKey = `${faction}-${clusterKey}`;

    if (!regionalClusters[fullClusterKey]) {
        regionalClusters[fullClusterKey] = {
            systems: [],
            planetTypes: new Set(),
            totalPlanets: 0,
            faction: faction,
            clusterKey: clusterKey
        };
    }

    regionalClusters[fullClusterKey].systems.push(system);
    regionalClusters[fullClusterKey].totalPlanets += system.planets.length;

    system.planets.forEach(planet => {
        regionalClusters[fullClusterKey].planetTypes.add(planet.archetype);
    });
});

// Filter to significant clusters (3+ systems) and check completeness
const significantClusters = {};
Object.entries(regionalClusters).forEach(([clusterKey, cluster]) => {
    if (cluster.systems.length >= 3) {
        const missingPlanetTypes = allPlanetTypes.filter(planetType => !cluster.planetTypes.has(planetType));
        significantClusters[clusterKey] = {
            ...cluster,
            systemCount: cluster.systems.length,
            hasAllPlanetTypes: cluster.planetTypes.size === allPlanetTypes.length,
            missingPlanetTypes: missingPlanetTypes,
            planetTypesList: Array.from(cluster.planetTypes).sort()
        };
    }
});

// Identify complete clusters
const completeClusters = Object.entries(significantClusters).filter(([_, data]) => data.hasAllPlanetTypes);
const incompleteClusters = Object.entries(significantClusters).filter(([_, data]) => !data.hasAllPlanetTypes);

console.log(`📊 Regional Structure:`);
console.log(`  Total significant clusters: ${Object.keys(significantClusters).length}`);
console.log(`  Complete clusters: ${completeClusters.length}`);
console.log(`  Incomplete clusters: ${incompleteClusters.length}`);

const totalSystemsInCompleteClusters = completeClusters.reduce((sum, [_, data]) => sum + data.systemCount, 0);
const totalSystemsInIncompleteClusters = incompleteClusters.reduce((sum, [_, data]) => sum + data.systemCount, 0);
const coveragePercentage = (totalSystemsInCompleteClusters / systemData.systems.length * 100).toFixed(1);

console.log(`  Systems in complete clusters: ${totalSystemsInCompleteClusters}/${systemData.systems.length} (${coveragePercentage}%)`);
console.log(`  Systems in incomplete clusters: ${totalSystemsInIncompleteClusters}/${systemData.systems.length}`);

// Filter target buildings
const targetBuildings = allBuildings.filter(building => {
    const tier = extractTierFromID(building.OutputID);
    const resourceType = building.ResourceType;

    if (resourceType === 'Infrastructure') {
        return tier === 1;
    } else {
        return tier >= 1 && tier <= 3;
    }
});

console.log(`🏗️ Target Buildings: ${targetBuildings.length}`);

// Build crafting lookup
const craftingLookup = {};
crafting.forEach(item => {
    const planetTypes = item.PlanetTypes || '';
    const planets = planetTypes ? planetTypes.split(';').map(p => p.trim()).filter(p => p) : [];

    craftingLookup[item.OutputName] = {
        type: item.OutputType,
        tier: parseInt(item.OutputTier) || 0,
        planets: planets,
        ingredients: []
    };

    for (let i = 1; i <= 9; i++) {
        const ingredient = item[`Ingredient${i}`];
        const quantity = parseInt(item[`Quantity${i}`]) || 0;
        if (ingredient && quantity > 0) {
            craftingLookup[item.OutputName].ingredients.push({ name: ingredient, quantity });
        }
    }
});

// Get all basic resources for an item
function getAllBasicResources(itemName, visited = new Set()) {
    if (visited.has(itemName)) return [];
    visited.add(itemName);

    const item = craftingLookup[itemName];
    if (!item) return [];

    if (item.type === 'BASIC RESOURCE' || item.type === 'BASIC ORGANIC RESOURCE') {
        return [{ name: itemName, planets: item.planets, tier: item.tier }];
    }

    let allResources = [];
    for (const ingredient of item.ingredients) {
        allResources = allResources.concat(getAllBasicResources(ingredient.name, visited));
    }

    return allResources;
}

// Check if resource is available in cluster
function checkResourceAvailabilityInCluster(requiredPlanets, clusterPlanetTypes) {
    return requiredPlanets.some(planetType => {
        const normalizedType = planetType === 'System Asteroid Belt' ? 'Asteroid Belt' : planetType;
        return clusterPlanetTypes.includes(normalizedType);
    });
}

// Validate buildings against complete clusters
console.log('\n🔄 Starting regional validation...');

const regionalValidationResults = [];
const clusterValidationStats = {};

// Initialize cluster stats
completeClusters.forEach(([clusterKey, cluster]) => {
    clusterValidationStats[clusterKey] = {
        clusterKey: clusterKey,
        faction: cluster.faction,
        systemCount: cluster.systemCount,
        totalBuildings: 0,
        validBuildings: 0,
        invalidBuildings: 0,
        validationRate: 0,
        problematicResources: {}
    };
});

targetBuildings.forEach((building, index) => {
    if (index % 100 === 0) console.log(`  Processing building ${index + 1}/${targetBuildings.length}`);

    const tier = extractTierFromID(building.OutputID);
    const buildingResult = {
        name: building.OutputName,
        tier: tier,
        category: building.ResourceType,
        clusterValidation: {},
        compatibleClusters: 0,
        totalClusters: completeClusters.length
    };

    // Get all ingredients
    const allIngredients = [];
    for (let i = 1; i <= 8; i++) {
        const ingredient = building[`Ingredient${i}`];
        if (ingredient) {
            allIngredients.push(ingredient);
        }
    }

    // Skip buildings with no ingredients
    if (allIngredients.length === 0) {
        buildingResult.validationRate = '100.0';
        buildingResult.compatibleClusters = buildingResult.totalClusters;
        regionalValidationResults.push(buildingResult);

        // Update cluster stats
        completeClusters.forEach(([clusterKey, _]) => {
            clusterValidationStats[clusterKey].totalBuildings++;
            clusterValidationStats[clusterKey].validBuildings++;
        });
        return;
    }

    // Get all basic resources needed
    const allBasicResources = [];
    for (const ingredient of allIngredients) {
        allBasicResources.push(...getAllBasicResources(ingredient));
    }

    const uniqueBasicResources = allBasicResources.filter((resource, index, self) =>
        index === self.findIndex(r => r.name === resource.name)
    );

    // Check each complete cluster
    completeClusters.forEach(([clusterKey, cluster]) => {
        clusterValidationStats[clusterKey].totalBuildings++;

        let isCompatible = true;
        const missingResources = [];

        for (const resource of uniqueBasicResources) {
            const resourceAvailable = checkResourceAvailabilityInCluster(resource.planets, cluster.planetTypesList);

            if (!resourceAvailable) {
                isCompatible = false;
                missingResources.push(resource.name);

                // Track problematic resources per cluster
                const resourceKey = `${resource.name} (T${resource.tier})`;
                if (!clusterValidationStats[clusterKey].problematicResources[resourceKey]) {
                    clusterValidationStats[clusterKey].problematicResources[resourceKey] = {
                        resource: resourceKey,
                        tier: resource.tier,
                        planets: resource.planets,
                        affectedBuildings: 0
                    };
                }
                clusterValidationStats[clusterKey].problematicResources[resourceKey].affectedBuildings++;
            }
        }

        buildingResult.clusterValidation[clusterKey] = {
            compatible: isCompatible,
            missingResources: missingResources
        };

        if (isCompatible) {
            buildingResult.compatibleClusters++;
            clusterValidationStats[clusterKey].validBuildings++;
        } else {
            clusterValidationStats[clusterKey].invalidBuildings++;
        }
    });

    buildingResult.validationRate = (buildingResult.compatibleClusters / buildingResult.totalClusters * 100).toFixed(1);
    regionalValidationResults.push(buildingResult);
});

// Calculate cluster validation rates
Object.values(clusterValidationStats).forEach(stats => {
    stats.validationRate = stats.totalBuildings > 0 ?
        (stats.validBuildings / stats.totalBuildings * 100).toFixed(1) : '100.0';
});

// Calculate overall statistics
const totalValidations = regionalValidationResults.length * completeClusters.length;
const successfulValidations = regionalValidationResults.reduce((sum, building) => sum + building.compatibleClusters, 0);
const overallValidationRate = (successfulValidations / totalValidations * 100).toFixed(1);

console.log('\n📊 REGIONAL VALIDATION COMPLETE!');
console.log(`Overall Regional Validation Rate: ${overallValidationRate}%`);
console.log(`Buildings with 100% cluster validation: ${regionalValidationResults.filter(b => b.validationRate === '100.0').length}`);

// Analyze cluster performance
const sortedClusterStats = Object.values(clusterValidationStats).sort((a, b) => parseFloat(b.validationRate) - parseFloat(a.validationRate));

console.log('\n🏆 TOP 10 PERFORMING CLUSTERS:');
sortedClusterStats.slice(0, 10).forEach((stats, index) => {
    console.log(`${index + 1}. ${stats.clusterKey}: ${stats.validationRate}% (${stats.systemCount} systems)`);
});

console.log('\n⚠️ BOTTOM 10 PERFORMING CLUSTERS:');
sortedClusterStats.slice(-10).forEach((stats, index) => {
    const problematicCount = Object.keys(stats.problematicResources).length;
    console.log(`${index + 1}. ${stats.clusterKey}: ${stats.validationRate}% (${stats.systemCount} systems, ${problematicCount} problematic resources)`);
});

// Identify resources that can be reduced
console.log('\n🔧 RESOURCE OPTIMIZATION OPPORTUNITIES:');

// Aggregate all problematic resources across clusters
const globalProblematicResources = {};
Object.values(clusterValidationStats).forEach(stats => {
    Object.entries(stats.problematicResources).forEach(([resourceKey, resourceData]) => {
        if (!globalProblematicResources[resourceKey]) {
            globalProblematicResources[resourceKey] = {
                resource: resourceKey,
                tier: resourceData.tier,
                planets: resourceData.planets,
                currentPlanetCount: resourceData.planets.length,
                clustersAffected: 0,
                totalBuildingsAffected: 0
            };
        }
        globalProblematicResources[resourceKey].clustersAffected++;
        globalProblematicResources[resourceKey].totalBuildingsAffected += resourceData.affectedBuildings;
    });
});

const sortedProblematicResources = Object.values(globalProblematicResources)
    .sort((a, b) => b.totalBuildingsAffected - a.totalBuildingsAffected);

console.log('\nTop 10 resources still causing issues in regional validation:');
sortedProblematicResources.slice(0, 10).forEach((resource, index) => {
    console.log(`${index + 1}. ${resource.resource}`);
    console.log(`   Current planets: ${resource.currentPlanetCount} [${resource.planets.join(', ')}]`);
    console.log(`   Clusters affected: ${resource.clustersAffected}/${completeClusters.length}`);
    console.log(`   Total building failures: ${resource.totalBuildingsAffected}`);
});

// Identify resources that are over-distributed
console.log('\n📉 RESOURCES THAT CAN BE REDUCED:');

// Get all T1/T2 basic resources
const t1t2Resources = crafting.filter(item =>
    (item.OutputType === 'BASIC RESOURCE' || item.OutputType === 'BASIC ORGANIC RESOURCE') &&
    (parseInt(item.OutputTier) === 1 || parseInt(item.OutputTier) === 2)
);

const overDistributedResources = [];

t1t2Resources.forEach(resource => {
    const resourceName = resource.OutputName;
    const currentPlanets = resource.PlanetTypes ? resource.PlanetTypes.split(';').map(p => p.trim()).filter(p => p) : [];
    const tier = parseInt(resource.OutputTier);

    // Check if this resource is causing problems in regional validation
    const resourceKey = `${resourceName} (T${tier})`;
    const isProblematic = globalProblematicResources[resourceKey];

    if (!isProblematic && currentPlanets.length >= 4) {
        // This resource is not problematic in regional validation but is on many planets
        overDistributedResources.push({
            name: resourceName,
            tier: tier,
            currentPlanets: currentPlanets.length,
            planets: currentPlanets,
            reductionPotential: currentPlanets.length - 2 // Could potentially reduce to 2-3 planets
        });
    }
});

overDistributedResources.sort((a, b) => b.reductionPotential - a.reductionPotential);

console.log(`\nResources that can potentially be reduced (currently not problematic in regional validation):`);
overDistributedResources.slice(0, 15).forEach((resource, index) => {
    console.log(`${index + 1}. ${resource.name} (T${resource.tier})`);
    console.log(`   Current: ${resource.currentPlanets} planets [${resource.planets.join(', ')}]`);
    console.log(`   Could reduce by: ${resource.reductionPotential} planets`);
});

// Save results
const results = {
    timestamp: new Date().toISOString(),
    summary: {
        targetBuildings: targetBuildings.length,
        totalCompleteClusters: completeClusters.length,
        overallValidationRate: parseFloat(overallValidationRate),
        systemCoverage: parseFloat(coveragePercentage),
        buildingsWith100Percent: regionalValidationResults.filter(b => b.validationRate === '100.0').length
    },
    clusterStats: sortedClusterStats,
    problematicResources: sortedProblematicResources,
    overDistributedResources: overDistributedResources,
    regionalValidationResults: regionalValidationResults
};

fs.writeFileSync('regional-validation-results.json', JSON.stringify(results, null, 2));

// Create summary CSV
const csvLines = ['Cluster,Faction,Systems,Validation_Rate,Valid_Buildings,Total_Buildings,Problematic_Resources'];
sortedClusterStats.forEach(stats => {
    const problematicCount = Object.keys(stats.problematicResources).length;
    csvLines.push(`"${stats.clusterKey}","${stats.faction}",${stats.systemCount},"${stats.validationRate}",${stats.validBuildings},${stats.totalBuildings},${problematicCount}`);
});
fs.writeFileSync('regional-validation-summary.csv', csvLines.join('\n'));

console.log('\n✅ Results saved to:');
console.log('  - regional-validation-results.json');
console.log('  - regional-validation-summary.csv');

console.log(`\n🎯 REGIONAL VALIDATION CONCLUSION:`);
console.log(`Regional building achieves ${overallValidationRate}% validation across ${completeClusters.length} complete clusters`);
console.log(`Covering ${totalSystemsInCompleteClusters} systems (${coveragePercentage}% of total)`);
console.log(`${overDistributedResources.length} resources can potentially be reduced to optimize planet specialization`); 