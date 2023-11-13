const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

/* to open a websocket connection -- creates connection immediately */
const wss = new WebSocket.Server({ noServer: true });

const clients = new Set();

function accept(req, res) {
  if (req.url === '/ws' && req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket' &&
      req.headers.connection.match(/\bupgrade\b/i)) {
    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), onSocketConnect);
  } else if (req.url === '/') {
    fs.createReadStream('./index.html').pipe(res);
  } else {
    res.writeHead(404);
    res.end();
  }
}

function onSocketConnect(ws) {
  let username;

  ws.on('message', function (message) {
    if (!username) {
      username = message;
      log(`User ${username} connected`);
    } else {
      log(`Message received from ${username}: ${message}`);
      message = `${username}: ${message.slice(0, 50)}`;

      // Broadcast the message to all clients
      for (let client of clients) {
        /* sends text or binary data */
        client.send(message);
      }
    }
  });

  ws.on('close', function () {
    log(`User ${username} disconnected`);
    clients.delete(ws);
  });

  clients.add(ws);
}

let log;
if (!module.parent) {
  log = console.log;
  const server = http.createServer(accept);
  server.listen(8080);
  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });
} else {
  log = function () {};
  exports.accept = accept;
}
