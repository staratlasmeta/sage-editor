const fs = require('fs');
const path = require('path');

// Path to the JSON file
const jsonFilePath = path.join(__dirname, 'src', 'gameData_allTiers.json');

// Function to fix the resource rates
function fixResourceRates() {
  try {
    // Read the JSON file
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    
    // Check if we can find claimStakeBuildings
    let buildings = null;
    
    // First, search for claimStakeBuildings at the root level
    if (jsonData.claimStakeBuildings) {
      buildings = jsonData.claimStakeBuildings;
      console.log('Found claimStakeBuildings at the root level');
    } 
    // Try to find it one level deep
    else {
      for (const key in jsonData) {
        if (jsonData[key] && jsonData[key].claimStakeBuildings) {
          buildings = jsonData[key].claimStakeBuildings;
          console.log(`Found claimStakeBuildings under ${key}`);
          break;
        }
      }
    }
    
    if (!buildings) {
      console.error('Could not find claimStakeBuildings in the JSON file!');
      return;
    }
    
    const buildingCount = Object.keys(buildings).length;
    console.log(`Found ${buildingCount} buildings in the claimStakeBuildings object`);
    
    let fixedCount = 0;
    let processingBuildingCount = 0;
    let extractionBuildingCount = 0;
    
    // Keep track of processors vs extractors for statistics
    const processorIds = [];
    const extractorIds = [];
    
    // Process each building
    Object.keys(buildings).forEach(buildingKey => {
      const building = buildings[buildingKey];
      
      // Skip if building doesn't have proper resource fields
      if (!building.resourceRate || !building.resourceExtractionRate) {
        console.log(`Skipping ${buildingKey} - missing required fields`);
        return;
      }
      
      // Determine if this is a processor or extractor based on ID/name
      const isProcessor = 
        buildingKey.includes('processor') || 
        building.id?.includes('processor') ||
        building.name?.includes('Processor');
        
      const isExtractor = 
        buildingKey.includes('extractor') || 
        building.id?.includes('extractor') ||
        building.name?.includes('Extractor');
        
      // Track for statistics  
      if (isProcessor) {
        processorIds.push(buildingKey);
        processingBuildingCount++;
      } else if (isExtractor) {
        extractorIds.push(buildingKey);
        extractionBuildingCount++;
      }
      
      // Handle processors: Fix resource rates
      if (isProcessor) {
        console.log(`Processing: ${buildingKey}`);
        
        // Process the resourceExtractionRate - it needs to be moved to resourceRate
        const resourceOutput = building.resourceExtractionRate;
        
        // Move all items from resourceExtractionRate to resourceRate
        Object.keys(resourceOutput || {}).forEach(resource => {
          building.resourceRate[resource] = resourceOutput[resource];
        });
        
        // Clear the resourceExtractionRate as it shouldn't be used for processors
        building.resourceExtractionRate = {};
        
        // Make all consumption resources negative in resourceRate
        // (but not the resources we just moved from resourceExtractionRate)
        const outputResources = Object.keys(resourceOutput || {});
        
        Object.keys(building.resourceRate).forEach(resource => {
          if (!outputResources.includes(resource)) {
            // This is an input resource, make it negative
            building.resourceRate[resource] = -Math.abs(building.resourceRate[resource]);
          }
        });
        
        fixedCount++;
      }
      // For extractors: No changes needed, they correctly use resourceExtractionRate
    });
    
    console.log('\n===== STATISTICS =====');
    console.log(`Total buildings processed: ${fixedCount}`);
    console.log(`Processing buildings identified: ${processingBuildingCount}`);
    console.log(`Extraction buildings identified: ${extractionBuildingCount}`);
    
    // Write the updated JSON back to the file
    fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 4));
    console.log(`\nUpdated ${jsonFilePath} successfully!`);
    
    // For verification, print some examples
    if (processorIds.length > 0) {
      console.log('\nExample of fixed processor building:');
      console.log(JSON.stringify(buildings[processorIds[0]], null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the function
fixResourceRates();
