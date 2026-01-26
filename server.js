const http = require('http');
const fs = require('fs');
const path = require('path');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  // Parse URL to remove query parameters
  const url = new URL(req.url, `http://${req.headers.host}`);
  let filePath = '.' + url.pathname;
  if (filePath === './') filePath = './gallery.html';
  
  const extname = path.extname(filePath);
  const contentType = mimeTypes[extname] || 'text/plain';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.log('❌ File not found:', filePath);
      res.writeHead(404);
      res.end('File not found: ' + filePath);
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(8000, () => {
  console.log('🚀 Server running on http://localhost:8000');
  console.log('📁 Serving from:', process.cwd());
});