const http = require('http');
const fs = require('fs');
const path = require('path');

// Add base path configuration
const BASE_PATH = process.env.NODE_ENV === 'production' ? '/Static-Site' : '';

const server = http.createServer((req, res) => {
    // Remove base path from request URL for local development
    const urlWithoutBase = req.url.replace(BASE_PATH, '');
    let filePath = path.join(__dirname, 'docs', urlWithoutBase === '/' ? 'index.html' : urlWithoutBase);
    
    // If path doesn't have extension, assume it's a route and serve index.html
    if (!path.extname(filePath)) {
        filePath = path.join(__dirname, 'docs', urlWithoutBase, 'index.html');
    }

    const contentType = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
    }[path.extname(filePath)] || 'text/plain';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('404 - File Not Found');
            } else {
                res.writeHead(500);
                res.end('500 - Server Error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
}); 