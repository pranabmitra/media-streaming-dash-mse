'use strict';

var fs = require('fs');
var path = require('path');
var http = require('http');
var staticBasePath = './media';
var mimeNames = {
    '.css': 'text/css',
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.ogg': 'application/ogg',
    '.ogv': 'video/ogg',
    '.oga': 'audio/ogg',
    '.txt': 'text/plain',
    '.wav': 'audio/x-wav',
    '.webm': 'video/webm'
};

http.createServer(httpListener).listen(8887);

function httpListener(request, response) {
    var filename = path.resolve(staticBasePath);
    filename = path.join(filename, request.url);

    if (!fs.existsSync(filename)) {
        sendResponse(response, 404, null, null);
        return null;
    }

    var responseHeaders = {};
    var stat = fs.statSync(filename);
    var rangeRequest = readRangeHeader(request.headers['range'], stat.size);

    responseHeaders['Access-Control-Allow-Headers'] = 'X-Requested-With, content-type, content-length, range';
    responseHeaders['Access-Control-Expose-Headers'] = 'content-length';
    responseHeaders['Access-Control-Allow-Origin'] = '*';
    responseHeaders['Accept-Ranges'] = 'bytes';
    responseHeaders['Content-Type'] = getMimeNameFromExt(path.extname(filename));

    // If 'Range' header exists, we will parse it with Regular Expression.
    if (rangeRequest == null) {
        responseHeaders['Content-Length'] = stat.size;  // File size.

        //  If not, will return file directly.
        sendResponse(response, 200, responseHeaders, fs.createReadStream(filename));
        return null;
    }

    var start = rangeRequest.Start;
    var end = rangeRequest.End;

    // If the range can't be fulfilled.
    if (start >= stat.size || end >= stat.size) {
        // Indicate the acceptable range.
        responseHeaders['Content-Range'] = 'bytes */' + stat.size; // File size.

        // Return the 416 'Requested Range Not Satisfiable'.
        sendResponse(response, 416, responseHeaders, null);
        return null;
    }

    // Indicate the current range.
    responseHeaders['Content-Range'] = 'bytes ' + start + '-' + end + '/' + stat.size;
    responseHeaders['Content-Length'] = start == end ? 0 : (end - start + 1);
    responseHeaders['Cache-Control'] = 'no-cache';

    // Return the 206 'Partial Content'.
    sendResponse(response, 206, responseHeaders, fs.createReadStream(filename, { start: start, end: end }));
}

function readRangeHeader(range, totalLength) {
    /*
     * Example of the method 'split' with regular expression.
     *
     * Input: bytes=100-200
     * Output: [null, 100, 200, null]
     *
     * Input: bytes=-200
     * Output: [null, null, 200, null]
     */

    if (range == null || range.length == 0)
        return null;

    var array = range.split(/bytes=([0-9]*)-([0-9]*)/);
    var start = parseInt(array[1]);
    var end = parseInt(array[2]);
    var result = {
        Start: isNaN(start) ? 0 : start,
        End: isNaN(end) ? (totalLength - 1) : end
    };

    if (!isNaN(start) && isNaN(end)) {
        result.Start = start;
        result.End = totalLength - 1;
    }

    if (isNaN(start) && !isNaN(end)) {
        result.Start = totalLength - end;
        result.End = totalLength - 1;
    }

    return result;
}


function sendResponse(response, responseStatus, responseHeaders, readable) {
    response.writeHead(responseStatus, responseHeaders);

    if (readable == null) {
        response.end();
    } else {
        readable.on('open', function () {
            readable.pipe(response);
        });
    }

    return null;
}

function getMimeNameFromExt(ext) {
    var result = mimeNames[ext.toLowerCase()];

    // It's better to give a default value.
    if (result == null)
        result = 'application/octet-stream';

    return result;
}
