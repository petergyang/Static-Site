const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // Remove /Static-Site prefix if present
    let urlPath = req.url.replace(/^\/Static-Site/, '');
    
    // Remove trailing slash if present (except for root path)
    if (urlPath.length > 1 && urlPath.endsWith('/')) {
        urlPath = urlPath.slice(0, -1);
    }
    
    let filePath = path.join(__dirname, 'docs', urlPath === '/' ? 'index.html' : urlPath);
    
    // If path doesn't have extension, assume it's a route and serve index.html
    if (!path.extname(filePath)) {
        filePath = path.join(filePath, 'index.html');
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
    console.log(`Also available at http://localhost:${PORT}/Static-Site/`);
}); 