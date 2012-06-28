var WS_HOST = 'localhost:3000';

function connect() {
  ws = new WebSocket('ws://' + WS_HOST, 'dumby-protocol');
  ws.binaryType = 'blob';

  ws.onopen = function(e) {
    console.log('Connection OPEN');
    send({cmd: 'START'});
  };

  ws.onmessage = function(e) {
    var data = e.data;
    console.log(data);
  };

  ws.onclose = function(e) {
    console.log('Connection CLOSED');
  };

  ws.onerror = function(e) {
    console.log('Connection ERROR', e);
  };

  return ws;
}

function disconnect() {
  ws.close();
}

function send(data) {
  // Stringify JSON data if we try to send it.
  if ((typeof data == 'object') && (data.__proto__ !== Blob.prototype)) {
    data = JSON.stringify(data);
  }
  ws.send(data);
}

function convertDataURIToBlob(dataURI, mimetype) {
  if (!dataURI) {
    return new Uint8Array(0);
  }

  var BASE64_MARKER = ';base64,';
  var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
  var base64 = dataURI.substring(base64Index);
  var raw = window.atob(base64);
  var uInt8Array = new Uint8Array(raw.length);

  for (var i = 0; i < uInt8Array.length; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], {type: mimetype});
}
