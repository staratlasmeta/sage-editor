#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source and destination paths
const sourceHtml = path.join(__dirname, 'dist-standalone', 'standalone.html');
const sourceData = path.join(__dirname, 'dist-standalone', 'data');
const destinationHtml = path.join(__dirname, '..', '..', 'SAGE Editor Suite', 'c4-tools.html');
const destinationData = path.join(__dirname, '..', '..', 'SAGE Editor Suite', 'data');

// Ensure source HTML exists
if (!fs.existsSync(sourceHtml)) {
    console.error('Error: standalone.html not found. Run npm run build:standalone first.');
    process.exit(1);
}

// Copy the HTML file
try {
    fs.copyFileSync(sourceHtml, destinationHtml);
    console.log(`✅ Copied standalone.html to SAGE Editor Suite/c4-tools.html`);
} catch (error) {
    console.error('Error copying HTML file:', error.message);
    process.exit(1);
}

// Copy the data folder if it exists
if (fs.existsSync(sourceData)) {
    try {
        // Remove existing data folder if it exists
        if (fs.existsSync(destinationData)) {
            fs.rmSync(destinationData, { recursive: true, force: true });
        }

        // Copy the data folder recursively
        fs.cpSync(sourceData, destinationData, { recursive: true });
        console.log(`✅ Copied data folder to SAGE Editor Suite/data`);

        // List files copied for confirmation
        const files = fs.readdirSync(destinationData);
        console.log(`   Data files: ${files.join(', ')}`);
    } catch (error) {
        console.error('Error copying data folder:', error.message);
        process.exit(1);
    }
} else {
    console.warn('⚠️  Warning: No data folder found in dist-standalone');
}

console.log(`\n📦 Deployment complete! You can now access it at: SAGE Editor Suite/c4-tools.html`); 