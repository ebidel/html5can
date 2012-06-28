var PLAY_ON_DJ_MACHINE = false;
var PLAY_ON_REMOTE_MACHINES = true;
var SHOW_PROGRESS = true; // progress bar.
var SHOW_VISUALIZATIONS = true; // canvas visual.
var NUM_CHUNKS = 100; // TODO: should be optimized based on song's size.

function Progress(selector, max) {
  this.container = document.querySelector(selector);
  this.add(max);
  this.counter = 1;
}

Progress.prototype = {
  add: function(totalDuration) {
    var frag = document.createDocumentFragment();
    this.progress = document.createElement('progress');
    this.progress.value = 0;
    this.progress.min = 0;
    this.progress.max = totalDuration;
    frag.appendChild(this.progress);

    this.input = document.createElement('input');
    this.input.type = 'number';
    this.input.id = 'curr-time';
    this.input.value = 0;
    this.input.max = totalDuration;
    this.input.readOnly = true;
    frag.appendChild(this.input);

    this.count = document.createElement('input');
    this.count.type = 'number';
    this.count.value = 0;
    this.count.readOnly = true;
    frag.appendChild(this.count);

    this.container.appendChild(frag);
  },

  update: function(currTime, duration) {
    this.progress.value = currTime;
    this.input.value = currTime;

    var count = Math.ceil(currTime / duration);
    this.count.value = count;

    if (count > this.counter) {
      this.counter = count;
    }
  }
};


function AudioLoader(selector) {
  this.sm = null;
  document.querySelector(selector).addEventListener(
      'change', this.onChange.bind(this), false);
}

AudioLoader.prototype = {

  get TXT() {
    return 0;
  },
  get BIN_STR() {
    return 1;
  },
  get ARRAY_BUFFER() {
    return 2;
  },
  get DATA_URL() {
    return 3;
  },

  onChange: function(e) {
    if (this.sm) {
      this.sm.kill();
    }

    var file = e.target.files[0];
    if (!file) {
     alert('Nice try! Please select a file.');
     return;
    } else if (!file.type.match('audio.*')) {
     alert('Please select an audio file.');
     return;
    }

    this.sm = new SoundManager();
    this.sm.displayID3Info({info: '<em>Loading...</em>'});

    var self = this;
    this.readFile(this.ARRAY_BUFFER, file, function(arrayBuffer) {
      self.sm.load(arrayBuffer, function(audioBuffers, totalDuration) {
        var id3 = self.getID3Data(arrayBuffer);
        self.sm.displayID3Info(id3);
        self.sm.play(audioBuffers, totalDuration, id3);
      });
    });
  },

  readFile: function(type, file, callback) {
    var reader = new FileReader();

    reader.onload = function(e) {
      callback(this.result);
    };

    reader.onerror = function(e) {
      console.log(e);
    };

    switch(type) {
      case this.TXT:
        reader.readAsText(file);
        break;
      case this.BIN_STR:
        reader.readAsBinaryString(file);
        break;
      case this.ARRAY_BUFFER:
        reader.readAsArrayBuffer(file);
        break;
      case this.DATA_URL:
        reader.readAsDataURL(file);
        break;
      default:
        reader.readAsArrayBuffer(file);
    }
  },

  getID3Data: function(arrayBuffer) {
    var dv = new jDataView(arrayBuffer);
    // "TAG" starts at byte -128 from EOF.
    // See http://en.wikipedia.org/wiki/ID3
    if (dv.getString(3, dv.byteLength - 128) == 'TAG') {
      var title = dv.getString(30, dv.tell());
      var artist = dv.getString(30, dv.tell());
      var album = dv.getString(30, dv.tell());
      var year = dv.getString(4, dv.tell());
      return {
        title: title,
        artist: artist,
        album: album,
        year: year
      };
    } else {
      return {}; // no ID3v1 data found.
    }
  }

};


function Visualizer() {
  this.canvas = document.getElementById('fft');
  this.ctx = this.canvas.getContext('2d');
  this.canvas.width = document.body.clientWidth / 1.4;

  var NUM_SAMPLES = 2048;
  var CANVAS_HEIGHT = this.canvas.height;
  var CANVAS_WIDTH = this.canvas.width;
  var SPACER_WIDTH = 5;
  var NUM_BARS = Math.round(CANVAS_WIDTH / SPACER_WIDTH);

  this.render = function(analyser) {
    var freqByteData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqByteData);
    //analyser.getByteTimeDomainData(freqByteData);

    //var numBars = Math.round(CANVAS_WIDTH / SPACER_WIDTH); //freqByteData.length

    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    //freqByteData = freqByteData.subarray(Math.round((NUM_SAMPLES / 2) - CANVAS_WIDTH / 4));

    // Draw rectangle for each frequency bin.
    for (var i = 0; i < NUM_BARS; ++i) {
      this.ctx.fillRect(i * SPACER_WIDTH, CANVAS_HEIGHT, 3, -freqByteData[i]);
    }
  };
}


function send(data) {
  // Stringify JSON data.
  if ((typeof data == 'object') && (data.__proto__ !== ArrayBuffer.prototype)) {
    data = JSON.stringify(data);
  }
  ws.send(data);
}

function SoundManager() {
  var self_ = this;
  var audioBuffers_ = [];
  var sources_ = [];
  var reqId_ = null;
  var sendQueue_ = [];

  this.audioCtx = null;
  this.progress = null;

  var SAMPLE_RATE = 44100;

  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  if (window.AudioContext) {
    this.audioCtx = new window.AudioContext();
    if (SHOW_VISUALIZATIONS) {
      this.analyser = this.audioCtx.createAnalyser();

      //this.gainNode = this.audioCtx.createGainNode();
      //this.gainNode.connect(this.analyser);

      this.analyser.connect(this.audioCtx.destination);

    }
  }

  this.visualizer = new Visualizer();

  var sendAudioChunk_ = function(audioBuffer, meta) {

    var buffer = audioBuffer.getChannelData(0).buffer;

    sendQueue_.push({buffer: buffer, meta: meta});

    // Rate limit how much we're sending. Send every 2s when there's nothing buffered.
    var id = setInterval(function() {
      if (ws.bufferedAmount == 0) {
        clearInterval(id);

        var chunk = sendQueue_.shift();

        console.log('Sending chunk');
        send(chunk.meta); // Send metadata before sending actual audio chunk.
        send(chunk.buffer);
      }
    }, 2000); // TODO: optimize this number

  };

  this.load = function(data, opt_callback) {
    if (!this.audioCtx) {
      return;
    }

    if (typeof data == 'string') {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', data, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function(e) {
        self_.audioCtx.decodeAudioData(this.response, function(audioBuffer) {
          audioBuffers.push(audioBuffer);
          opt_callback && opt_callback(audioBuffer);
        }, function(e) {
          console.log(e);
        });
      };
      xhr.send();

    } else {
      this.audioCtx.decodeAudioData(data, function(audioBuffer) {

        console.log('Total duration: ' + audioBuffer.duration);

        var channel1 = audioBuffer.getChannelData(0);
        var channel2 = audioBuffer.getChannelData(1);

        var CHUNK_SIZE = Math.ceil(channel1.length / NUM_CHUNKS);
        var NUM_SAMPLES = CHUNK_SIZE;
        var NUM_CHANNELS = audioBuffer.numberOfChannels;

        var audioBuffers = [];

        for (var i = 0; i < NUM_CHUNKS; ++i) {
          var begin = i * CHUNK_SIZE;
          var end = begin + CHUNK_SIZE;
          var aBuffer = self_.audioCtx.createBuffer(
              NUM_CHANNELS, NUM_SAMPLES, SAMPLE_RATE);
          aBuffer.getChannelData(0).set(channel1.subarray(begin, end));
          if (audioBuffer.numberOfChannels == 2) {
            aBuffer.getChannelData(1).set(channel2.subarray(begin, end));
          }

          audioBuffers_.push(aBuffer);
        }

        opt_callback && opt_callback(audioBuffers_, audioBuffer.duration);

      }, function(e) {
        alert('Error decoding audio');
        console.error(e);
      });
    }
  };

  this.schedulePlayback = function(startTime, audioBuffer) {
    if (!this.audioCtx) {
      return;
    }

    var source = this.audioCtx.createBufferSource();
    source.buffer = audioBuffer;

    if (SHOW_VISUALIZATIONS) {
      source.connect(this.analyser);
      //source.connect(this.gainNode);
    } else {
      source.connect(this.audioCtx.destination);
    }

    source.noteOn(startTime);

    sources_.push(source);

    console.log('scheduled: ' + startTime, 'until: ' +
                (startTime + audioBuffer.duration));
  };

  this.periodSend = function() {

    // Rate limit how much we're sending. Send every 2s when there's nothing buffered.
    var id = setInterval(function() {
      if (sendQueue_.length == 0) {
        clearInterval(id);
      }
      if (ws.bufferedAmount == 0) {
        var next = sendQueue_.shift();

        console.log('Sending chunk');

        send(next.meta); // Send metadata before sending actual audio chunk.
        send(next.buffer);
      }
    }, 2000); // TODO: optimize this number

  };

  this.play = function(audioBuffers, totalDuration, id3) {
    var startTime = 0;
    for (var i = 0, audioBuffer; audioBuffer = audioBuffers[i]; ++i) {
      if (PLAY_ON_DJ_MACHINE) {
        this.schedulePlayback(startTime, audioBuffer);
      }

      sendQueue_.push({
        buffer: audioBuffer.getChannelData(0).buffer,
        meta: {
          startTime: startTime,
          numChunks: audioBuffers.length,
          totalDuration: totalDuration,
          id3: id3
        }
      });

      startTime += audioBuffer.duration;
    }

    this.periodSend();

    if (SHOW_VISUALIZATIONS || SHOW_PROGRESS) {
      this.visualize(audioBuffers[0].duration, totalDuration, audioBuffers[0]);
    }
  };

  this.kill = function() {
    window.webkitCancelAnimationFrame(reqId_);

    this.analyser.disconnect(0);

    for (var i = 0, source; source = sources_[i]; ++i) {
      source.noteOff(0);
      source.disconnect(0);
    }
    sources_ = [];
  };

  this.playFromArrayBuffer = function(arrayBuffer, props) {

    var float32Array = new Float32Array(arrayBuffer);

    // TODO(ericbidelman): clean up duplicate vars.
    var NUM_SAMPLES = float32Array.length;
    var NUM_CHANNELS = 2;

    var audioBuffer = this.audioCtx.createBuffer(
        NUM_CHANNELS, NUM_SAMPLES, SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(float32Array);

    //TODO: send over channel2 data instead of duplicating channel's data.
    if (audioBuffer.numberOfChannels == 2) {
      audioBuffer.getChannelData(1).set(float32Array);
    }

    /*buffer a few chunks
    audioBuffers_.push(audioBuffer);
    if (audioBuffers_.length >= 3) {
      this.schedulePlayback(props.startTime, audioBuffers_.shift());
    }*/

    if (PLAY_ON_REMOTE_MACHINES) {
      this.schedulePlayback(props.startTime, audioBuffer);
    }

    if (SHOW_VISUALIZATIONS || SHOW_PROGRESS) {
      this.visualize(audioBuffer.duration, props.totalDuration);
    }

    this.displayID3Info(props.id3);
  };

  this.visualize = function(chunkDuration, totalDuration) {

    if (this.progress) {
      return;
    }

    this.progress = new Progress('#container', totalDuration);

    var self = this;
    (function callback(time) {
      var currTime = self.audioCtx.currentTime;

      // Unhook if we're played all chunks.
      if (currTime >= totalDuration) {
        self.kill();
      } else {
        reqId_ = window.webkitRequestAnimationFrame(callback);
      }

      if (SHOW_PROGRESS) {
        self.progress.update(currTime, chunkDuration);
      }
      if (SHOW_VISUALIZATIONS) {
        self.visualizer.render(self.analyser);
      }
    })();

  };

  this.displayID3Info = function(id3) {
    var title = id3.title ? id3.title : '';
    var album = id3.album ? id3.album : '';
    var artist = id3.artist ? ' ( ' + id3.artist + ' )' : '';

    var html = [];
    if (id3.info) {
      html.push(id3.info);
    } else {
      html.push('<span class="title">', title, '</span>', artist);
    }

    if (id3.title) {
      document.querySelector('#song-title').innerHTML = html.join('');
    }
  };

}
