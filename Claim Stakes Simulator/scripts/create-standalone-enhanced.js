const fs = require('fs');
const path = require('path');

function createStandaloneHTML() {
    const buildDir = path.join(__dirname, '../build');
    const srcDir = path.join(__dirname, '../src');

    console.log('🔨 Creating standalone HTML file...');

    try {
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
            console.log(`📄 Included CSS: ${file} (${(cssContent.length / 1024).toFixed(1)}KB)`);
        });

        // Read the JS file
        const jsDir = path.join(buildDir, 'static/js');
        const jsFiles = fs.readdirSync(jsDir).filter(file => file.endsWith('.js'));
        let allJS = '';
        jsFiles.forEach(file => {
            const jsContent = fs.readFileSync(path.join(jsDir, file), 'utf8');
            allJS += jsContent;
            console.log(`📄 Included JS: ${file} (${(jsContent.length / 1024).toFixed(1)}KB)`);
        });

        // Read the game data JSON
        const gameDataPath = path.join(srcDir, 'gameData_allTiers.json');
        const gameDataRaw = fs.readFileSync(gameDataPath, 'utf8');
        console.log(`📄 Read Game Data: ${(gameDataRaw.length / 1024).toFixed(1)}KB`);

        // Parse and extract the actual data portion
        let gameData;
        try {
            const parsedGameData = JSON.parse(gameDataRaw);
            console.log('📊 Parsed JSON structure, checking for nested data...');

            // Check if data is nested under 'data' key (which it is in our case)
            if (parsedGameData.data) {
                console.log('✅ Found nested structure - extracting data portion');
                gameData = JSON.stringify(parsedGameData.data);

                // Log what sections we found
                const sections = Object.keys(parsedGameData.data);
                console.log(`📋 Available sections: ${sections.join(', ')}`);

                // Log counts for main sections
                const sectionCounts = {};
                ['cargo', 'claimStakeDefinitions', 'claimStakeBuildings', 'planetArchetypes', 'planets'].forEach(section => {
                    if (parsedGameData.data[section]) {
                        sectionCounts[section] = Object.keys(parsedGameData.data[section]).length;
                    }
                });
                console.log('📈 Section counts:', sectionCounts);
            } else {
                console.log('📊 Using flat structure');
                gameData = gameDataRaw;
            }
        } catch (error) {
            console.error('❌ Failed to parse game data JSON:', error);
            throw error;
        }

        console.log(`📦 Final game data size: ${(gameData.length / 1024).toFixed(1)}KB`);

        // Get build timestamp
        const buildTimestamp = new Date().toISOString();
        const buildDate = new Date().toLocaleDateString();

        // Get package.json info
        const packagePath = path.join(__dirname, '../package.json');
        const packageInfo = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

        // Create the standalone HTML with enhanced metadata
        const standaloneHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <meta name="theme-color" content="#000000"/>
    <meta name="description" content="Star Atlas Claim Stakes Simulator - Standalone Version"/>
    <meta name="generator" content="React ${packageInfo.dependencies.react} + Custom Bundler"/>
    <meta name="build-date" content="${buildTimestamp}"/>
    <meta name="version" content="${packageInfo.version}"/>
    <title>Claim Stakes Simulator - Standalone</title>
    
    <!-- Embedded Styles -->
    <style>
        /* Loading screen styles */
        .standalone-loading {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #121212;
            color: #ffffff;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Inter', sans-serif;
        }
        
        .standalone-loading h1 {
            margin-bottom: 20px;
            color: #3A86FF;
        }
        
        .standalone-loading .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #333;
            border-top: 4px solid #3A86FF;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .standalone-loading .info {
            text-align: center;
            color: #aaa;
            font-size: 14px;
        }
        
        /* Application styles */
        ${allCSS}
    </style>
</head>
<body>
    <noscript>
        <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
            <h1>JavaScript Required</h1>
            <p>This application requires JavaScript to run. Please enable JavaScript in your browser and reload the page.</p>
        </div>
    </noscript>
    
    <!-- Loading Screen -->
    <div id="standalone-loading" class="standalone-loading">
        <h1>Claim Stakes Simulator</h1>
        <div class="spinner"></div>
        <div class="info">
            <div>Standalone Version</div>
            <div>Built: ${buildDate}</div>
            <div>Loading game data...</div>
        </div>
    </div>
    
    <!-- React App Root -->
    <div id="root"></div>
    
    <!-- Embedded Game Data -->
    <script type="application/json" id="embedded-game-data">
        ${gameData}
    </script>
    
    <!-- Standalone Initialization -->
    <script>
        // Standalone mode detection and initialization
        window.STANDALONE_MODE = true;
        window.BUILD_INFO = {
            version: "${packageInfo.version}",
            buildDate: "${buildTimestamp}",
            reactVersion: "${packageInfo.dependencies.react}",
            mode: "standalone"
        };
        
        // Enhanced error handling
        window.addEventListener('error', function(e) {
            console.error('Standalone App Error:', e.error);
            const loading = document.getElementById('standalone-loading');
            if (loading) {
                loading.innerHTML = \`
                    <h1 style="color: #FF5252;">Error Loading Game</h1>
                    <p>An error occurred while loading the game:</p>
                    <pre style="color: #ffaa00; font-size: 12px; max-width: 80%; overflow: auto;">\${e.error?.message || 'Unknown error'}</pre>
                    <p style="color: #aaa; font-size: 14px;">Please try refreshing the page or using a different browser.</p>
                \`;
            }
        });
        
        // Make game data globally available
        try {
            window.EMBEDDED_GAME_DATA = JSON.parse(document.getElementById('embedded-game-data').textContent);
            console.log('📦 Standalone mode: Game data loaded successfully');
            console.log('🎮 Build info:', window.BUILD_INFO);
        } catch (e) {
            console.error('❌ Failed to load embedded game data:', e);
            throw new Error('Failed to parse embedded game data');
        }
        
        // Hide loading screen once React app is ready
        function hideLoadingScreen() {
            const loading = document.getElementById('standalone-loading');
            if (loading) {
                loading.style.opacity = '0';
                loading.style.transition = 'opacity 0.5s ease-out';
                setTimeout(() => {
                    loading.style.display = 'none';
                }, 500);
            }
        }
        
        // Auto-hide loading screen after a delay (fallback)
        setTimeout(hideLoadingScreen, 3000);
        
        // Listen for React app ready signal
        window.addEventListener('react-app-ready', hideLoadingScreen);
    </script>
    
    <!-- Application JavaScript -->
    <script>
        ${allJS}
    </script>
    
    <!-- Post-load initialization -->
    <script>
        // Dispatch ready event after everything is loaded
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('react-app-ready'));
            console.log('🚀 Standalone app fully loaded and ready!');
        }, 1000);
    </script>
</body>
</html>`;

        // Write the standalone file
        const outputPath = path.join(__dirname, '../claim-stakes-simulator-standalone.html');
        fs.writeFileSync(outputPath, standaloneHTML);

        const fileSize = fs.statSync(outputPath).size;
        const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);

        console.log('✅ Standalone HTML file created successfully!');
        console.log(`📁 File: claim-stakes-simulator-standalone.html`);
        console.log(`📏 Size: ${fileSizeMB} MB`);
        console.log(`🏗️  Build: ${buildDate}`);
        console.log(`📦 Version: ${packageInfo.version}`);
        console.log('🚀 Ready for distribution!');

        // Create a distribution package info
        const distInfo = {
            filename: 'claim-stakes-simulator-standalone.html',
            size: fileSize,
            sizeMB: fileSizeMB,
            buildDate: buildTimestamp,
            version: packageInfo.version,
            reactVersion: packageInfo.dependencies.react,
            components: {
                css: cssFiles.length,
                js: jsFiles.length,
                gameDataSize: gameData.length
            }
        };

        fs.writeFileSync(
            path.join(__dirname, '../standalone-build-info.json'),
            JSON.stringify(distInfo, null, 2)
        );

        console.log('📋 Build info saved to standalone-build-info.json');

    } catch (error) {
        console.error('❌ Error creating standalone HTML:', error);
        process.exit(1);
    }
}

// Run the script
createStandaloneHTML(); 