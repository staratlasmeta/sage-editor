// Import Loader UI and Progress Tracking

let loaderModal = null;
let progressBar = null;
let progressText = null;
let statusText = null;
let statsElements = {};
let funFactElement = null;
let currentProgress = 0;
let importStats = {
    systems: 0,
    planets: 0,
    stars: 0,
    resources: 0,
    regions: 0,
    links: 0,
    factions: { MUD: 0, ONI: 0, UST: 0 }
};

// Fun facts to display during loading
const funFacts = [
    "The largest stars can be 100 times bigger than the smallest ones",
    "Each planet can support up to 10 different resource types",
    "KING systems have more connections than standard systems",
    "Core systems generate 50% more resources than regular ones",
    "A galaxy can contain up to 9,999 star systems",
    "System links represent trade routes between connected systems",
    "UST faction specializes in oceanic and aquatic resources",
    "MUD faction focuses on industrial extraction and manufacturing",
    "ONI faction excels in high-tech and advanced resources",
    "Each system can have up to 3 stars orbiting together",
    "Planet types determine which resources can naturally spawn",
    "Resource richness directly affects production rates",
    "Regions group systems into territorial units for organization",
    "White dwarf stars have only a 2% chance of spawning",
    "Faction control zones form convex hulls around their systems"
];

let currentFactIndex = 0;
let factRotationInterval = null;

// Create the import loader modal
function createImportLoader() {
    // Remove any existing loader
    if (loaderModal) {
        loaderModal.remove();
    }
    
    // Create modal structure
    loaderModal = document.createElement('div');
    loaderModal.className = 'import-loader-modal';
    loaderModal.innerHTML = `
        <div class="import-loader-content">
            <div class="import-loader-header">
                <h2>GALAXY MAP IMPORT</h2>
                <p>PROCESSING MAP DATA...</p>
            </div>
            
            <div class="import-progress-bar">
                <div class="import-progress-fill" id="importProgressFill" style="width: 0%"></div>
            </div>
            
            <div class="import-progress-text" id="importProgressText">0%</div>
            
            <div class="import-status-text" id="importStatusText">INITIALIZING...</div>
            
            <div class="import-stats-grid">
                <div class="import-stat-item">
                    <span class="import-stat-value" id="statSystems">0</span>
                    <span class="import-stat-label">SYSTEMS</span>
                </div>
                <div class="import-stat-item">
                    <span class="import-stat-value" id="statPlanets">0</span>
                    <span class="import-stat-label">PLANETS</span>
                </div>
                <div class="import-stat-item">
                    <span class="import-stat-value" id="statStars">0</span>
                    <span class="import-stat-label">STARS</span>
                </div>
                <div class="import-stat-item">
                    <span class="import-stat-value" id="statResources">0</span>
                    <span class="import-stat-label">RESOURCES</span>
                </div>
            </div>
            
            <div class="import-fun-fact" id="importFunFact">
                <span id="funFactText">LOADING SYSTEM DATA...</span>
            </div>
        </div>
    `;
    
    document.body.appendChild(loaderModal);
    
    // Add fade in animation
    loaderModal.style.opacity = '0';
    loaderModal.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
        loaderModal.style.opacity = '1';
    }, 10);
    
    // Get references to elements
    progressBar = document.getElementById('importProgressFill');
    progressText = document.getElementById('importProgressText');
    statusText = document.getElementById('importStatusText');
    funFactElement = document.getElementById('funFactText');
    
    statsElements = {
        systems: document.getElementById('statSystems'),
        planets: document.getElementById('statPlanets'),
        stars: document.getElementById('statStars'),
        resources: document.getElementById('statResources')
    };
    
    // Reset stats
    resetImportStats();
    
    // Start fun fact rotation
    startFunFactRotation();
}

// Reset import statistics
function resetImportStats() {
    importStats = {
        systems: 0,
        planets: 0,
        stars: 0,
        resources: 0,
        regions: 0,
        links: 0,
        factions: { MUD: 0, ONI: 0, UST: 0 }
    };
    currentProgress = 0;
}

// Update progress bar and percentage
function updateProgress(progress, status = null) {
    currentProgress = Math.min(100, Math.max(0, progress));
    
    if (progressBar) {
        progressBar.style.width = currentProgress + '%';
    }
    
    if (progressText) {
        progressText.textContent = Math.round(currentProgress) + '%';
    }
    
    if (status && statusText) {
        statusText.textContent = status;
    }
}

// Update statistics display with animation
function updateStats(statName, value) {
    if (statsElements[statName]) {
        const element = statsElements[statName];
        const currentValue = parseInt(element.textContent) || 0;
        
        if (value !== currentValue) {
            // Add animation class
            element.style.animation = 'none';
            setTimeout(() => {
                element.style.animation = 'countUp 0.5s ease';
                element.textContent = value;
            }, 10);
        }
    }
}

// Update all stats at once
function updateAllStats() {
    updateStats('systems', importStats.systems);
    updateStats('planets', importStats.planets);
    updateStats('stars', importStats.stars);
    updateStats('resources', importStats.resources);
}

// Start rotating fun facts
function startFunFactRotation() {
    if (funFactElement) {
        funFactElement.textContent = funFacts[0];
    }
    
    factRotationInterval = setInterval(() => {
        currentFactIndex = (currentFactIndex + 1) % funFacts.length;
        if (funFactElement) {
            funFactElement.style.opacity = '0';
            setTimeout(() => {
                funFactElement.textContent = funFacts[currentFactIndex];
                funFactElement.style.opacity = '1';
            }, 300);
        }
    }, 3000); // Change fact every 3 seconds
}

// Stop fun fact rotation
function stopFunFactRotation() {
    if (factRotationInterval) {
        clearInterval(factRotationInterval);
        factRotationInterval = null;
    }
}

// Process systems with progress tracking
function processSystemsWithProgress(systems, callback) {
    const totalSystems = systems.length;
    let processed = 0;
    
    // Process in chunks to avoid blocking UI
    const chunkSize = 10;
    let currentIndex = 0;
    
    function processChunk() {
        const endIndex = Math.min(currentIndex + chunkSize, totalSystems);
        
        for (let i = currentIndex; i < endIndex; i++) {
            const system = systems[i];
            
            // Count stats
            importStats.systems++;
            
            // Count planets
            if (system.planets) {
                importStats.planets += system.planets.length;
                
                // Count resources
                system.planets.forEach(planet => {
                    if (planet.resources) {
                        importStats.resources += planet.resources.length;
                    }
                });
            }
            
            // Count stars
            if (system.stars) {
                importStats.stars += system.stars.length;
            } else if (system.star) {
                importStats.stars++;
            }
            
            // Count links
            if (system.links) {
                importStats.links += system.links.length;
            }
            
            // Count factions
            if (system.faction && importStats.factions[system.faction] !== undefined) {
                importStats.factions[system.faction]++;
            }
            
            processed++;
        }
        
        // Update progress
        const progress = (processed / totalSystems) * 50 + 10; // 10-60% for processing
        updateProgress(progress, `PROCESSING ${processed} OF ${totalSystems} SYSTEMS...`);
        updateAllStats();
        
        currentIndex = endIndex;
        
        if (currentIndex < totalSystems) {
            // Continue processing
            requestAnimationFrame(processChunk);
        } else {
            // Processing complete
            if (callback) callback();
        }
    }
    
    // Start processing
    processChunk();
}

// Close the import loader
function closeImportLoader() {
    stopFunFactRotation();
    
    if (loaderModal) {
        // Add fade out animation
        loaderModal.style.opacity = '0';
        setTimeout(() => {
            if (loaderModal && loaderModal.parentNode) {
                loaderModal.parentNode.removeChild(loaderModal);
            }
            loaderModal = null;
        }, 300);
    }
}

// Show completion message
function showImportComplete() {
    updateProgress(100, 'IMPORT COMPLETE');
    
    // Show final stats summary
    if (funFactElement) {
        const totalResources = importStats.resources;
        const avgResourcesPerPlanet = importStats.planets > 0 
            ? (totalResources / importStats.planets).toFixed(1) 
            : 0;
        
        funFactElement.textContent = `Successfully imported ${importStats.systems} systems with ${importStats.planets} planets and ${totalResources} resources (Average: ${avgResourcesPerPlanet} resources per planet)`;
    }
    
    // Auto close after 2 seconds
    setTimeout(() => {
        closeImportLoader();
    }, 2000);
}

// Export functions
window.createImportLoader = createImportLoader;
window.updateImportProgress = updateProgress;
window.updateImportStats = updateAllStats;
window.processSystemsWithProgress = processSystemsWithProgress;
window.closeImportLoader = closeImportLoader;
window.showImportComplete = showImportComplete;
window.importStats = importStats;
