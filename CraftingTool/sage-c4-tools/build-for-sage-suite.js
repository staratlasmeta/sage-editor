#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create the C4 Tools folder structure
const outputDir = path.join(__dirname, 'C4 Tools');
const sourceHtml = path.join(__dirname, 'dist-standalone', 'standalone.html');
const sourceData = path.join(__dirname, 'dist-standalone', 'data');

console.log('📦 Creating C4 Tools folder for SAGE Editor Suite...');

// Ensure source files exist
if (!fs.existsSync(sourceHtml)) {
    console.error('Error: standalone.html not found. Run npm run build:standalone first.');
    process.exit(1);
}

// Create output directory
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
} else {
    // Clean existing directory
    fs.rmSync(outputDir, { recursive: true });
    fs.mkdirSync(outputDir);
}

// Read the standalone HTML
let htmlContent = fs.readFileSync(sourceHtml, 'utf8');

// Fix the navigation path - change from complex logic to simple relative path
// Replace the handleHomeClick function to use simple navigation
htmlContent = htmlContent.replace(
    /window\.location\.href\s*=\s*["'].*?SAGE Editor Suite\/index\.html["']/g,
    'window.location.href="../index.html"'
);

// Make sure we don't double up the path
htmlContent = htmlContent.replace(
    /window\.location\.href\s*=\s*["']\.\.\/SAGE Editor Suite\/index\.html["']/g,
    'window.location.href="../index.html"'
);

// Save as index.html in the C4 Tools folder
const outputHtml = path.join(outputDir, 'index.html');
fs.writeFileSync(outputHtml, htmlContent);
console.log('✅ Created C4 Tools/index.html');

// Copy the data folder
if (fs.existsSync(sourceData)) {
    const outputData = path.join(outputDir, 'data');
    fs.cpSync(sourceData, outputData, { recursive: true });
    console.log('✅ Copied data folder to C4 Tools/data');

    // List files for confirmation
    const files = fs.readdirSync(outputData);
    console.log(`   Data files: ${files.join(', ')}`);
}

// Copy favicon if it exists
const sourceFavicon = path.join(__dirname, 'dist-standalone', 'favicon.ico');
if (fs.existsSync(sourceFavicon)) {
    fs.copyFileSync(sourceFavicon, path.join(outputDir, 'favicon.ico'));
    console.log('✅ Copied favicon.ico');
}

console.log('\n🎉 Success! The "C4 Tools" folder is ready.');
console.log('📂 To use it:');
console.log('   1. Move the "C4 Tools" folder to your SAGE Editor Suite directory');
console.log('   2. The folder should be at the same level as "Loot Matrix", "Research Nodes", etc.');
console.log('   3. Access it via: SAGE Editor Suite/C4 Tools/index.html');
console.log('\n📝 Note: The HOME button will navigate to ../SAGE Editor Suite/index.html'); 