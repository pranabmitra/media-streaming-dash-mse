var FILE = 'http://localhost:8887/h5505641488099938540_dashinit.mp4';
var NUM_CHUNKS = 1;
var video = document.querySelector('#videoElem');
// var mimeType = 'video/webm; codecs="vorbis,vp8"';
var mimeType = 'video/mp4; codecs="avc1.64000d,mp4a.40.2"';
// var mimeType = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
// var mimeType = 'video/mp4; codecs="h.264"';

window.MediaSource = window.MediaSource || window.WebKitMediaSource;
if (!!!window.MediaSource) {
    alert('MediaSource API is not available');
}

var mediaSource = new MediaSource();

video.src = window.URL.createObjectURL(mediaSource);

/**/
var sourceBuffer = null;
var totalSegments = 7;
var segmentLength = 0;
var segmentDuration = 0;
var bytesFetched = 0;
var requestedSegments = [];

for (var i = 0; i < totalSegments; ++i) {
    requestedSegments[i] = false;
}

function sourceOpen (_) {
    sourceBuffer = mediaSource.addSourceBuffer(mimeType);
    getFileLength(FILE, function (fileLength) {
        console.log((fileLength / 1024 / 1024).toFixed(2), 'MB');
        // totalLength = fileLength;
        segmentLength = Math.round(fileLength / totalSegments);
        // console.log(totalLength, segmentLength);
        fetchRange(FILE, 0, segmentLength, appendSegment);

        requestedSegments[0] = true;
        video.addEventListener('timeupdate', checkBuffer);
        video.addEventListener('canplay', function () {
            segmentDuration = video.duration / totalSegments;
            video.play();
        });
        video.addEventListener('seeking', seek);
    });
};

function getFileLength (url, cb) {
    var xhr = new XMLHttpRequest;
    xhr.open('head', url);
    xhr.onload = function () {
        cb(xhr.getResponseHeader('content-length'));
    };
    xhr.send();
};

function fetchRange (url, start, end, cb) {
    var xhr = new XMLHttpRequest;
    xhr.open('get', url);
    xhr.responseType = 'arraybuffer';

    if (haveAllSegments()) {
        xhr.setRequestHeader('Range', 'bytes=' + start + '-');
    } else {
        xhr.setRequestHeader('Range', 'bytes=' + start + '-' + end);
    }
    xhr.onload = function () {
        console.log('fetched bytes: ', start, end);
        bytesFetched += end - start + 1;
        cb(xhr.response);
    };
    xhr.send();
};

function appendSegment (chunk) {
    sourceBuffer.appendBuffer(chunk);
};

function checkBuffer (_) {
    var currentSegment = getCurrentSegment();
    if (currentSegment === totalSegments && haveAllSegments()) {
        console.log('last segment', mediaSource.readyState);
        mediaSource.endOfStream();
        video.removeEventListener('timeupdate', checkBuffer);
    } else if (shouldFetchNextSegment(currentSegment)) {
        requestedSegments[currentSegment] = true;
        console.log('time to fetch next chunk', video.currentTime);

        fetchRange(FILE, bytesFetched, bytesFetched + segmentLength, appendSegment);
    }
    // console.log(video.currentTime, currentSegment, segmentDuration);
};

function seek (e) {
    console.log(e);
    if (mediaSource.readyState === 'open') {
        sourceBuffer.abort();
        console.log(mediaSource.readyState);
    } else {
        console.log('seek but not open?');
        console.log(mediaSource.readyState);
    }
};

function getCurrentSegment () {
    return ((video.currentTime / segmentDuration) | 0) + 1;
};

function haveAllSegments () {
    return requestedSegments.every(function (val) { return !!val; });
};

function shouldFetchNextSegment (currentSegment) {
    return video.currentTime > segmentDuration * currentSegment * 0.8 &&
        !requestedSegments[currentSegment];
};

/**/

mediaSource.addEventListener('sourceopen', sourceOpen, false);
mediaSource.addEventListener('webkitsourceopen', sourceOpen, false);

mediaSource.addEventListener('webkitsourceended', function(e) {
    // logger.log('mediaSource readyState: ' + this.readyState);
}, false);
