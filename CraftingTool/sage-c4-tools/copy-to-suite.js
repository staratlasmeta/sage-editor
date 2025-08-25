#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source and destination paths
const source = path.join(__dirname, 'dist-standalone', 'standalone.html');
const destination = path.join(__dirname, '..', '..', 'SAGE Editor Suite', 'c4-tools.html');

// Ensure source exists
if (!fs.existsSync(source)) {
    console.error('Error: standalone.html not found. Run npm run build:standalone first.');
    process.exit(1);
}

// Copy the file
try {
    fs.copyFileSync(source, destination);
    console.log(`✅ Copied standalone.html to SAGE Editor Suite/c4-tools.html`);
    console.log(`   You can now access it at: SAGE Editor Suite/c4-tools.html`);
} catch (error) {
    console.error('Error copying file:', error.message);
    process.exit(1);
} 