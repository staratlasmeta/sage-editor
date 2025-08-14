// File separation module for exporting ships as individual files
(function() {
    'use strict';
    
    // Save all ships as a ZIP file containing individual JSON files
    function saveAllShipsAsZip() {
        if (!window.JSZip) {
            alert('JSZip library not loaded. Please refresh the page and try again.');
            return;
        }
        
        if (addedShips.length === 0) {
            alert('No ships in comparison to save.');
            return;
        }
        
        console.log(`Creating ZIP file with ${addedShips.length} ships...`);
        
        // Create a new ZIP instance
        const zip = new JSZip();
        
        // Add each ship as a separate JSON file
        addedShips.forEach((ship, index) => {
            const shipIdentifier = getShipIdentifier(ship);
            const activeConfigIndex = activeConfigIndices[ship.id] || 0;
            const configurations = shipConfigurations[shipIdentifier] || [];
            
            // Create ship data object
            const shipData = {
                version: "1.0",
                timestamp: new Date().toISOString(),
                ship: ship,
                shipIdentifier: shipIdentifier,
                configurations: configurations,
                activeConfigIndex: activeConfigIndex
            };
            
            // Get ship class name and number
            const className = window.getClassNameFromNumber ? 
                window.getClassNameFromNumber(ship.Class) : 
                ship.Class;
            const classNumber = ship.Class;
            
            // Create filename - sanitize ship name for filesystem
            const safeName = ship['Ship Name'].replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `${classNumber}_${className}_${safeName}_${ship.Manufacturer}.json`;
            
            // Convert to JSON with pretty formatting
            const jsonString = JSON.stringify(shipData, null, 2);
            
            // Add file to ZIP
            zip.file(filename, jsonString);
            
            console.log(`Added ${filename} to ZIP`);
        });
        
        // Generate the ZIP file
        zip.generateAsync({ type: 'blob' })
            .then(function(blob) {
                // Create download link
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                
                // Create filename with timestamp
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                a.download = `ship_configs_${timestamp}.zip`;
                
                // Trigger download
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                // Clean up
                URL.revokeObjectURL(url);
                
                console.log(`Successfully created ZIP file with ${addedShips.length} ships`);
                alert(`Successfully exported ${addedShips.length} ships to ZIP file!`);
            })
            .catch(function(error) {
                console.error('Error creating ZIP file:', error);
                alert('Error creating ZIP file. Check console for details.');
            });
    }
    
    // Save a single ship as JSON with class prefix in filename
    function saveShipJSON(shipId, shipIdentifier) {
        // Find the ship in addedShips
        const ship = window.addedShips.find(s => s.id === shipId);
        if (!ship) {
            console.error(`Ship with ID ${shipId} not found`);
            return;
        }
        
        const activeConfigIndex = window.activeConfigIndices[shipId] || 0;
        const configurations = window.shipConfigurations[shipIdentifier] || [];
        
        // Create ship data object
        const shipData = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            ship: ship,
            shipIdentifier: shipIdentifier,
            configurations: configurations,
            activeConfigIndex: activeConfigIndex
        };
        
        // Get ship class name and number
        const className = window.getClassNameFromNumber ? 
            window.getClassNameFromNumber(ship.Class) : 
            ship.Class;
        const classNumber = ship.Class;
        
        // Create filename with class number and name prefix
        const safeName = ship['Ship Name'].replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${classNumber}_${className}_${safeName}_${ship.Manufacturer}.json`;
        
        // Convert to JSON
        const jsonString = JSON.stringify(shipData, null, 2);
        
        // Create download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`Saved ship ${ship['Ship Name']} as ${filename}`);
    }
    
    // Export functions
    window.saveAllShipsAsZip = saveAllShipsAsZip;
    window.saveShipJSON = saveShipJSON;
    
})(); 