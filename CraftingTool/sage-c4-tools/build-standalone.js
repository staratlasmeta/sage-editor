import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔨 Building SAGE C4 Tools for production...');

try {
    // Build the React app
    console.log('📦 Building React app...');
    execSync('npm run build', { stdio: 'inherit' });

    // The build output should be in the 'build/client' directory
    const buildDir = path.join(__dirname, 'build', 'client');

    if (!fs.existsSync(buildDir)) {
        console.error('❌ Build directory not found. Build may have failed.');
        process.exit(1);
    }

    console.log('✅ Build complete!');
    console.log('');
    console.log('📁 Build output is in:', buildDir);
    console.log('');
    console.log('To use with SAGE Editor Suite:');
    console.log('1. The build files are ready in the build/client directory');
    console.log('2. The SAGE Editor Suite already has links pointing to this location');
    console.log('3. You can now open the SAGE Editor Suite and navigate to the C4 tools');
    console.log('');
    console.log('🎉 Done!');

} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
} 