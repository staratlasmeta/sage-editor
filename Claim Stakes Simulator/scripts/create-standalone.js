const fs = require('fs');
const path = require('path');

function createStandaloneHTML() {
    const buildDir = path.join(__dirname, '../build');
    const srcDir = path.join(__dirname, '../src');

    // Read the built HTML file
    const htmlPath = path.join(buildDir, 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    // Read the CSS file
    const cssDir = path.join(buildDir, 'static/css');
    const cssFiles = fs.readdirSync(cssDir).filter(file => file.endsWith('.css'));
    let allCSS = '';
    cssFiles.forEach(file => {
        const cssContent = fs.readFileSync(path.join(cssDir, file), 'utf8');
        allCSS += cssContent;
    });

    // Read the JS file
    const jsDir = path.join(buildDir, 'static/js');
    const jsFiles = fs.readdirSync(jsDir).filter(file => file.endsWith('.js'));
    let allJS = '';
    jsFiles.forEach(file => {
        const jsContent = fs.readFileSync(path.join(jsDir, file), 'utf8');
        allJS += jsContent;
    });

    // Read the game data JSON
    const gameDataPath = path.join(srcDir, 'gameData_allTiers.json');
    const gameData = fs.readFileSync(gameDataPath, 'utf8');

    // Create the standalone HTML
    const standaloneHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <meta name="theme-color" content="#000000"/>
    <meta name="description" content="Star Atlas Claim Stakes Simulator - Standalone Version"/>
    <title>Claim Stakes Simulator</title>
    <style>
        ${allCSS}
    </style>
</head>
<body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    
    <!-- Embedded Game Data -->
    <script type="application/json" id="embedded-game-data">
        ${gameData}
    </script>
    
    <!-- Application JavaScript -->
    <script>
        // Make game data globally available
        window.EMBEDDED_GAME_DATA = JSON.parse(document.getElementById('embedded-game-data').textContent);
        
        // Original application code
        ${allJS}
    </script>
</body>
</html>`;

    // Write the standalone file
    const outputPath = path.join(__dirname, '../claim-stakes-simulator-standalone.html');
    fs.writeFileSync(outputPath, standaloneHTML);

    console.log('✅ Standalone HTML file created: claim-stakes-simulator-standalone.html');
    console.log(`📁 File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
    console.log('🚀 This file can be distributed and run offline in any modern browser!');
}

// Run the script
createStandaloneHTML(); 