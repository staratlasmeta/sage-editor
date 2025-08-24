const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const STANDALONE_DIR = path.join(__dirname, 'dist-standalone');

const server = http.createServer((req, res) => {
    let filePath = path.join(STANDALONE_DIR, req.url === '/' ? 'standalone.html' : req.url);

    // Security: prevent directory traversal
    if (!filePath.startsWith(STANDALONE_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const extname = path.extname(filePath);
    let contentType = 'text/html';

    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
            contentType = 'image/jpg';
            break;
        case '.ico':
            contentType = 'image/x-icon';
            break;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   SAGE C4 Tools - Standalone Test Server                 ║
║                                                           ║
║   Server running at:                                     ║
║   http://localhost:${PORT}/standalone.html                   ║
║                                                           ║
║   This server allows testing the standalone build        ║
║   without CORS issues.                                   ║
║                                                           ║
║   Press Ctrl+C to stop the server.                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
}); 