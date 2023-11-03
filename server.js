const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
wss.binaryType = 'arraybuffer';

const clients = new Set();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use('/dist', express.static(path.join(__dirname, 'dist')));

wss.on('connection', (ws) => {
  clients.add(ws);

  ws.on('message', (message) => {
    const uint8Array = new Uint8Array(message);

    // Broadcast the received message to all connected clients
    clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(uint8Array);
      }
    });
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

console.log('WebSocket server is running on port 8080');

// Serve your JavaScript file, assuming it's named 'client.js'
app.get('/client.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'client.js'));
});

server.listen(8080);