// Node.js script to generate a manifest of ship JSON files
// Run this script with: node generate-ship-manifest.js

const fs = require('fs');
const path = require('path');

const shipsDir = path.join(__dirname, 'ships');
const manifestPath = path.join(__dirname, 'ship-manifest.json');

try {
    // Read all files in the ships directory
    const files = fs.readdirSync(shipsDir);
    
    // Filter for JSON files
    const shipFiles = files.filter(file => file.endsWith('.json'));
    
    // Create manifest object
    const manifest = {
        generated: new Date().toISOString(),
        shipCount: shipFiles.length,
        ships: shipFiles.map(file => ({
            filename: file,
            path: `ships/${file}`
        }))
    };
    
    // Write manifest file
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log(`✅ Ship manifest generated successfully!`);
    console.log(`   Found ${shipFiles.length} ship files`);
    console.log(`   Manifest saved to: ${manifestPath}`);
    
} catch (error) {
    console.error('❌ Error generating ship manifest:', error);
    process.exit(1);
}
