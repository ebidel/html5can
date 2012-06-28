#!/usr/bin/env node

//var WebSocketServer = require('../websocket_node/lib/WebSocketServer');
var WebSocketServer = require('ws').Server;

var http = require('http');
var url = require('url');
var fs = require('fs');

var args = { /* defaults */
  port: '8080'
};

/* Parse command line options */
var pattern = /^--(.*?)(?:=(.*))?$/;
process.argv.forEach(function(value) {
  var match = pattern.exec(value);
  if (match) {
    args[match[1]] = match[2] ? match[2] : true;
  }
});

var port = parseInt(args.port, 10);

console.log("Usage: ./server.js [--port=8080]");

var connections = {}; 

/* //websocket_node
var server = http.createServer(function(request, response) {
  console.log((new Date()) + " Received request for " + request.url);
  response.writeHead(404);
  response.end();
});

server.listen(port, function() {
  console.log((new Date()) + " Server is listening on port " + port);
});

var wsServer = new WebSocketServer({
  httpServer: server,
  autoAcceptConnections: true,
  maxReceivedFrameSize: 64 * 1024 * 1024,   // 64MiB
  maxReceivedMessageSize: 64 * 1024 * 1024, // 64MiB
  fragmentOutgoingMessages: false,
  keepalive: true,
  keepaliveInterval: 20000,
  disableNagleAlgorithm: false
});

wsServer.on('connect', function(connection) {
  connection.id = Date.now(); // Assign unique id to this connection.

  console.log((new Date()) + ' Connection accepted: ' + connection.id);

  connections[connection.id] = connection;

  connection.on('message', function(message) {
    var length;
    switch (message.type) {
      case 'utf8':
        length = message.utf8Data.length;
        break;
      case 'binary':
        length = message.binaryData.length;
        break;
    }

    console.log('Received ' + message.type + ' message of ' + length + ' characters.');

    broadcast(message, connection);
  });

  connection.on('close', function(connection) {
    console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
    delete connections[connection.id];
  });
});

// Broadcasts a message to all connected sockets accept for the sender.
function broadcast(message, fromConnection) {
  for (var id in connections) {
    if (id != fromConnection.id) {
      if (message.type === 'binary') {
        connections[id].sendBytes(message.binaryData);
      } else {
        connections[id].sendUTF(message.utf8Data);
      }
    }
  }
}
*/

// ws is the fastest websocket lib:
// http://einaros.github.com/ws/
var wsServer = new WebSocketServer({port: port});

wsServer.on('connection', function(ws) {

  ws.id = Date.now(); // Assign unique id to this ws connection.
  connections[ws.id] = ws;

  console.log((new Date()) + ' Connection accepted: ' + ws.id);

  ws.on('message', function(message, flags) {
    console.log('Received ' + (flags.binary ? 'binary' : '') + ' message: ' +
                message.length + ' bytes.');
    broadcast(message, this, flags);
  });

  ws.on('close', function() {
    console.log((new Date()) + " Peer " + this.id + " disconnected.");
    delete connections[this.id];
  });
});

// Broadcasts a message to all connected sockets accept for the sender.
function broadcast(message, fromWs, flags) {
  for (var id in connections) {
    if (id != fromWs.id) {
      connections[id].send(message, {
        binary: flags.binary ? true : false,
        mask: false
      });
    }
  }
}