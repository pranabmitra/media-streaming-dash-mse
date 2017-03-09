var FILE = ['./h5505641488099938540_dashinit.mp4', './aa_dashinit.mp4',];
var NUM_CHUNKS = 2;
var video = document.querySelector('#videoElem');
// var mimeType = 'video/webm; codecs="vorbis,vp8"';
var mimeType = 'video/mp4; codecs="avc1.64000d,mp4a.40.2"';
// var mimeType = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
// var mimeType = 'video/mp4; codecs="h.264"';


var queue = [];

window.MediaSource = window.MediaSource || window.WebKitMediaSource;
if (!!!window.MediaSource) {
    alert('MediaSource API is not available');
}

var mediaSource = new MediaSource();

video.src = window.URL.createObjectURL(mediaSource);

function callback(e) {
    var sourceBuffer = mediaSource.addSourceBuffer(mimeType);

    /* it seems ok to set initial duration 0 */
    var duration = 0;
    var totalVideos = FILE.length;
    var i;


    function onUpdate() {
        if(!sourceBuffer.updating && queue.length > 0) {// && mediaSource.readyState == "open"
            sourceBuffer.appendBuffer(queue.shift());

            sourceBuffer.removeEventListener("update", onUpdate);
        }

        duration = mediaSource.duration;
    }

    for (i = 0; i < totalVideos; i++) {

        /* the GET function already returns a Uint8Array.
           the demo you linked reads it in filereader in order to manipulate it;
           you just want to immediately append it */
        GET(FILE[i], function cb(uint8Array){

            mediaSource.sourceBuffers[0].timestampOffset = duration;
            sourceBuffer.addEventListener("update", onUpdate, false);


            if (!sourceBuffer.updating) {
                sourceBuffer.appendBuffer(uint8Array);
            } else {
                queue.push(uint8Array);
            }

        });
    }
}

mediaSource.addEventListener('sourceopen', callback, false);
mediaSource.addEventListener('webkitsourceopen', callback, false);

mediaSource.addEventListener('webkitsourceended', function(e) {
    // logger.log('mediaSource readyState: ' + this.readyState);
}, false);

function GET(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.send();

    xhr.onload = function(e) {
        if (xhr.status != 200) {
            alert("Unexpected status code " + xhr.status + " for " + url);
            return false;
        }
        // callback(new Uint8Array(xhr.response));
        callback(xhr.response);
    };
}
