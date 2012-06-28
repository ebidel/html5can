// do {
//   var id = prompt('Enter a session id');
// } while (!id);

var screenshot = document.querySelector('#screenshot');
screenshot.onload = function(e) {
  window.webkitURL.revokeObjectURL(this.src);
};

var ws = connect();
ws.onmessage = function(e) {
  var data = e.data;
  if (data.__proto__ == Blob.prototype) {
    screenshot.src = window.webkitURL.createObjectURL(e.data);
  } else {
    // Assume we got JSON.
    data = JSON.parse(data);
    if (data.cmd == 'DONE') {
      screenshot.hidden = true;
    } else if (data.cmd == 'START') {
      screenshot.hidden = false;
    }
  }
}
