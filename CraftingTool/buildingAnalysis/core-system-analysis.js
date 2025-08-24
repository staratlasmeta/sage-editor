const fs = require('fs');

console.log('👑 CORE/KING SYSTEM REGIONAL ANALYSIS');
console.log('='.repeat(60));

// Read the system data
const systemData = JSON.parse(fs.readFileSync('systems-and-planets-extract.json', 'utf8'));

console.log(`📊 Total Systems: ${systemData.systems.length}`);

// We need to identify core/king systems and their regions
// Let's first analyze the system names to identify potential core systems
const coreSystemPatterns = [
    /king/i,
    /core/i,
    /capital/i,
    /central/i,
    /prime/i,
    /main/i,
    /hub/i
];

// Identify potential core systems
const potentialCoreSystems = systemData.systems.filter(system => {
    return coreSystemPatterns.some(pattern => pattern.test(system.name));
});

console.log(`🔍 Potential core systems found: ${potentialCoreSystems.length}`);
potentialCoreSystems.forEach(system => {
    console.log(`  - ${system.name} (${system.faction})`);
});

// Since we don't have explicit core system data, let's analyze by system clusters
// We'll group systems by their name patterns or proximity indicators
const systemClusters = {};
const allPlanetTypes = ['Terrestrial Planet', 'Oceanic Planet', 'Gas Giant', 'Ice Giant', 'Volcanic Planet', 'Barren Planet', 'Dark Planet', 'Asteroid Belt'];

// Function to extract potential region identifier from system name
function extractRegionIdentifier(systemName) {
    // Look for common patterns in system names
    const patterns = [
        // Roman numerals
        /([IVX]+)[-\s]/,
        // Numbers
        /(\d+)[-\s]/,
        // Sector patterns
        /sector[-\s](\w+)/i,
        // Region patterns
        /region[-\s](\w+)/i,
        // First word as region
        /^(\w+)[-\s]/
    ];

    for (const pattern of patterns) {
        const match = systemName.match(pattern);
        if (match) {
            return match[1].toLowerCase();
        }
    }

    // If no pattern found, use first few characters
    return systemName.substring(0, 3).toLowerCase();
}

// Let's try a different approach - group by faction and then by name similarity
const factionClusters = {};

systemData.systems.forEach(system => {
    const faction = system.faction;
    if (!factionClusters[faction]) {
        factionClusters[faction] = {};
    }

    // Extract potential cluster identifier
    const clusterKey = extractRegionIdentifier(system.name);
    const fullClusterKey = `${faction}-${clusterKey}`;

    if (!factionClusters[faction][clusterKey]) {
        factionClusters[faction][clusterKey] = {
            systems: [],
            planetTypes: new Set(),
            totalPlanets: 0
        };
    }

    factionClusters[faction][clusterKey].systems.push(system);
    factionClusters[faction][clusterKey].totalPlanets += system.planets.length;

    system.planets.forEach(planet => {
        factionClusters[faction][clusterKey].planetTypes.add(planet.archetype);
    });
});

// Filter clusters to only include those with multiple systems (potential regions)
const significantClusters = {};
Object.entries(factionClusters).forEach(([faction, clusters]) => {
    Object.entries(clusters).forEach(([clusterKey, clusterData]) => {
        if (clusterData.systems.length >= 3) { // Only clusters with 3+ systems
            const fullKey = `${faction}-${clusterKey}`;
            significantClusters[fullKey] = {
                faction: faction,
                clusterKey: clusterKey,
                ...clusterData,
                systemCount: clusterData.systems.length,
                avgPlanetsPerSystem: (clusterData.totalPlanets / clusterData.systems.length).toFixed(1)
            };
        }
    });
});

console.log(`\n🏛️ SIGNIFICANT SYSTEM CLUSTERS (3+ systems):`);
console.log(`Found ${Object.keys(significantClusters).length} clusters`);

// Analyze cluster completeness
const clusterCompleteness = {};

Object.entries(significantClusters).forEach(([clusterKey, cluster]) => {
    const missingPlanetTypes = allPlanetTypes.filter(planetType => !cluster.planetTypes.has(planetType));
    const completenessPercentage = (cluster.planetTypes.size / allPlanetTypes.length * 100).toFixed(1);

    clusterCompleteness[clusterKey] = {
        ...cluster,
        hasAllPlanetTypes: cluster.planetTypes.size === allPlanetTypes.length,
        planetTypeCount: cluster.planetTypes.size,
        completenessPercentage: parseFloat(completenessPercentage),
        missingPlanetTypes: missingPlanetTypes,
        planetTypesList: Array.from(cluster.planetTypes).sort()
    };
});

// Sort clusters by completeness, then by system count
const sortedClusters = Object.entries(clusterCompleteness).sort((a, b) => {
    if (b[1].completenessPercentage !== a[1].completenessPercentage) {
        return b[1].completenessPercentage - a[1].completenessPercentage;
    }
    return b[1].systemCount - a[1].systemCount;
});

console.log('\n🏆 CLUSTERS RANKED BY PLANET TYPE COMPLETENESS:');
sortedClusters.slice(0, 20).forEach(([clusterKey, data], index) => {
    const status = data.hasAllPlanetTypes ? '✅ COMPLETE' : `❌ ${data.missingPlanetTypes.length} missing`;
    console.log(`${index + 1}. ${clusterKey}: ${data.completenessPercentage}% (${data.systemCount} systems, avg ${data.avgPlanetsPerSystem} planets/system) - ${status}`);
    if (!data.hasAllPlanetTypes && data.missingPlanetTypes.length <= 3) {
        console.log(`   Missing: ${data.missingPlanetTypes.join(', ')}`);
    }
});

// Analyze complete clusters
const completeClusters = sortedClusters.filter(([_, data]) => data.hasAllPlanetTypes);
const incompleteClusters = sortedClusters.filter(([_, data]) => !data.hasAllPlanetTypes);

console.log(`\n🎯 CLUSTER COMPLETENESS SUMMARY:`);
console.log(`Complete clusters (all 8 planet types): ${completeClusters.length}`);
console.log(`Incomplete clusters: ${incompleteClusters.length}`);

if (completeClusters.length > 0) {
    console.log(`\n✅ COMPLETE CLUSTERS:`);
    completeClusters.forEach(([clusterKey, data]) => {
        console.log(`  ${clusterKey}: ${data.systemCount} systems (${data.faction})`);
    });

    const totalSystemsInCompleteClusters = completeClusters.reduce((sum, [_, data]) => sum + data.systemCount, 0);
    const coveragePercentage = (totalSystemsInCompleteClusters / systemData.systems.length * 100).toFixed(1);

    console.log(`\n📈 COVERAGE ANALYSIS:`);
    console.log(`  Systems in complete clusters: ${totalSystemsInCompleteClusters}/${systemData.systems.length} (${coveragePercentage}%)`);
}

// Analyze planet type distribution within complete clusters
if (completeClusters.length > 0) {
    console.log(`\n📊 PLANET TYPE DISTRIBUTION IN COMPLETE CLUSTERS:`);
    completeClusters.forEach(([clusterKey, cluster]) => {
        console.log(`\n${clusterKey} (${cluster.systemCount} systems):`);

        // Calculate detailed distribution
        const planetTypeDistribution = {};
        allPlanetTypes.forEach(planetType => {
            planetTypeDistribution[planetType] = {
                systemsWithThis: 0,
                totalSystems: cluster.systemCount
            };
        });

        cluster.systems.forEach(system => {
            const systemPlanetTypes = system.planets.map(p => p.archetype);
            allPlanetTypes.forEach(planetType => {
                if (systemPlanetTypes.includes(planetType)) {
                    planetTypeDistribution[planetType].systemsWithThis++;
                }
            });
        });

        allPlanetTypes.forEach(planetType => {
            const data = planetTypeDistribution[planetType];
            const percentage = (data.systemsWithThis / data.totalSystems * 100).toFixed(1);
            const status = percentage === '100.0' ? '✅' : percentage === '0.0' ? '❌' : '⚠️';
            console.log(`  ${status} ${planetType}: ${data.systemsWithThis}/${data.totalSystems} systems (${percentage}%)`);
        });
    });
}

// Look at the largest incomplete clusters to see what they're missing
console.log(`\n🔍 LARGEST INCOMPLETE CLUSTERS (potential expansion targets):`);
const largestIncompleteClusters = incompleteClusters
    .sort((a, b) => b[1].systemCount - a[1].systemCount)
    .slice(0, 10);

largestIncompleteClusters.forEach(([clusterKey, data], index) => {
    console.log(`${index + 1}. ${clusterKey}: ${data.systemCount} systems, ${data.completenessPercentage}% complete`);
    console.log(`   Has: ${data.planetTypesList.join(', ')}`);
    console.log(`   Missing: ${data.missingPlanetTypes.join(', ')}`);
});

// Alternative approach: Look for natural system groupings by distance/name similarity
console.log(`\n🔍 ALTERNATIVE APPROACH: SYSTEM NAME ANALYSIS`);

// Group systems by common name prefixes
const nameGroups = {};
systemData.systems.forEach(system => {
    // Extract the first word or significant prefix
    const namePrefix = system.name.split(/[-\s]/)[0].toLowerCase();

    if (!nameGroups[namePrefix]) {
        nameGroups[namePrefix] = {
            systems: [],
            factions: new Set(),
            planetTypes: new Set(),
            totalPlanets: 0
        };
    }

    nameGroups[namePrefix].systems.push(system);
    nameGroups[namePrefix].factions.add(system.faction);
    nameGroups[namePrefix].totalPlanets += system.planets.length;
    system.planets.forEach(planet => {
        nameGroups[namePrefix].planetTypes.add(planet.archetype);
    });
});

// Filter to groups with multiple systems
const significantNameGroups = Object.entries(nameGroups)
    .filter(([_, group]) => group.systems.length >= 5)
    .map(([prefix, group]) => ({
        prefix,
        ...group,
        systemCount: group.systems.length,
        factionList: Array.from(group.factions),
        planetTypeList: Array.from(group.planetTypes),
        completeness: (group.planetTypes.size / allPlanetTypes.length * 100).toFixed(1),
        avgPlanetsPerSystem: (group.totalPlanets / group.systems.length).toFixed(1)
    }))
    .sort((a, b) => b.completeness - a.completeness || b.systemCount - a.systemCount);

console.log(`\nTop system name groups (5+ systems):`);
significantNameGroups.slice(0, 15).forEach((group, index) => {
    const status = group.planetTypes.size === 8 ? '✅' : '⚠️';
    console.log(`${index + 1}. "${group.prefix}": ${group.systemCount} systems, ${group.completeness}% complete ${status}`);
    console.log(`   Factions: ${group.factionList.join(', ')}`);
    console.log(`   Avg planets/system: ${group.avgPlanetsPerSystem}`);
    if (group.planetTypes.size < 8) {
        const missing = allPlanetTypes.filter(pt => !group.planetTypeList.includes(pt));
        console.log(`   Missing: ${missing.join(', ')}`);
    }
});

// Save results
const results = {
    timestamp: new Date().toISOString(),
    summary: {
        totalSystems: systemData.systems.length,
        significantClusters: Object.keys(significantClusters).length,
        completeClusters: completeClusters.length,
        incompleteClusters: incompleteClusters.length,
        systemsInCompleteClusters: completeClusters.reduce((sum, [_, data]) => sum + data.systemCount, 0)
    },
    potentialCoreSystems: potentialCoreSystems.map(s => ({ name: s.name, faction: s.faction })),
    significantClusters: Object.entries(significantClusters).map(([key, data]) => ({
        clusterKey: key,
        ...data,
        planetTypesList: Array.from(data.planetTypes)
    })),
    clusterCompleteness: sortedClusters.map(([key, data]) => ({
        clusterKey: key,
        ...data
    })),
    significantNameGroups
};

fs.writeFileSync('core-system-analysis-results.json', JSON.stringify(results, null, 2));

// Create summary CSV
const csvLines = ['Cluster_Key,Faction,System_Count,Planet_Types,Completeness_Percent,Missing_Planet_Types,Avg_Planets_Per_System'];
sortedClusters.forEach(([clusterKey, data]) => {
    csvLines.push(`"${clusterKey}","${data.faction}",${data.systemCount},${data.planetTypeCount},"${data.completenessPercentage}","${data.missingPlanetTypes.join(';')}","${data.avgPlanetsPerSystem}"`);
});
fs.writeFileSync('core-system-analysis-summary.csv', csvLines.join('\n'));

console.log('\n✅ Results saved to:');
console.log('  - core-system-analysis-results.json');
console.log('  - core-system-analysis-summary.csv');

const totalInCompleteClusters = completeClusters.reduce((sum, [_, data]) => sum + data.systemCount, 0);
const coveragePercent = totalInCompleteClusters > 0 ? (totalInCompleteClusters / systemData.systems.length * 100).toFixed(1) : '0.0';

console.log('\n🎯 CORE SYSTEM REGION CONCLUSION:');
console.log(`Found ${completeClusters.length} complete clusters covering ${totalInCompleteClusters} systems (${coveragePercent}%)`);
if (completeClusters.length > 0) {
    console.log('Core/King system regional building could be viable for these clusters!');
} else {
    console.log('No complete clusters found - may need to expand cluster definitions or resource distributions.');
} 