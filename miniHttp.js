var net = require('net'),
    events = require('events'),
    stream = require('stream');

var STATUS_OK = 200;
var STATUS_NOT_FOUND = 404;
var STATUS_METHOD_NOT_ALLOWED=405;
var STATUS_TIME_OUT = 408;
var STATUS_SERVER_ERROR = 500;

var STATUS_NAMES = {
    200: 'OK',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    500: 'Internal Error'
};
var TIME_TO_WAIT = 2000;//time to wait for timeout

var ERROR_MSGS = {
    'INVALID_HTTP_REQ': "Your HTTP request isn't valid:"
};


function HttpServer(){
    var self = this;

    this._server = net.createServer(function(connection) { //'connection' listener
//-------------------

        var httpParseState = {
            dicHttp: {},
            httpHeader: {},
            temp_body: null,
            contentLength: 0,
            isBody: false,
            firstHeader: true,
            prevLine: null
        };
        function parseHTTP(socket) {
            var httpHeaders;
            var lines =  httpParseState.prevLine==null?
                socket.toString().split('\n') :
                [httpParseState.prevLine].concat( socket.toString().split('\n') );
            var lineNum,
                line,
                mime_splited,
                numWrriten;
            console.log('parse http');
            for(lineNum =0; lineNum<lines.length;lineNum++)
            {
                line = lines[lineNum];
                if (httpParseState.firstHeader){
                    httpHeaders = line.split(' ');
                    if (httpHeaders.length!==3){
                        console.log(httpHeaders);
                        throw "Bad http request. Invalid request header";
                    }

                    httpParseState.httpHeader.action = httpHeaders[0];
                    httpParseState.httpHeader.resource= httpHeaders[1];
                    httpParseState.httpHeader.version = httpHeaders[2];
                    httpParseState.firstHeader = false;
                } else {
                    mime_splited = line.toLowerCase().split(': ');
                    if (mime_splited.length === 2 && !httpParseState.isBody){
                        httpParseState.dicHttp[mime_splited[0]]=mime_splited[1];
                        if (mime_splited[0]==='content-length'){
                            httpParseState.contentLength = parseInt(mime_splited[1]);
                        }
                    }
                    else if (!httpParseState.isBody) {
                        if(line.charCodeAt(0)!==13){
                            throw "Bad http request. Newline must appear after headers see RFC2616 (section 4.1!)";
                        }
                        httpParseState.isBody = true;
                        if (isNaN(httpParseState.contentLength)) {
                            throw "Bad http request. Content-Length should be a valid number";
                        } else {
                            httpParseState.temp_body = new Buffer(httpParseState.contentLength);
                        }
                    }
                    else {
                        //for no body
                        numWrriten = 0;
                        if (httpParseState.contentLength !== 0){
                            numWrriten = httpParseState.temp_body.write(line+'\n');
                        }

                        if (numWrriten!=Buffer.byteLength(line+"\n") || httpParseState.contentLength===0) {
                            console.log('emittting request');
                            var request = new IncomingMessage(httpParseState.dicHttp, httpParseState.httpHeader, httpParseState.temp_body.toString(), connection);
                            var response = new ServerResponse (connection);
                            self.emit('request', request, response);
                            if (numWrriten !== Buffer.byteLength(line)){
                                lines[lineNum] = line.substr(numWrriten);
                                lineNum--;
                                httpParseState.prevLine = lines[lineNum];
                            } else {
                                httpParseState.prevLine = null;
                            }
                            httpParseState.dicHttp = {};
                            httpParseState.httpHeader = {};

                            httpParseState.temp_body = null;
                            httpParseState.contentLength = 0;
                            httpParseState.isBody = false;
                            httpParseState.firstHeader = true;

                        }

                    }

                }
            }
        }

        function timeOut(){
            var headers = {
                'Connection': 'close'
            };
            console.log('WRITING TIMEOUT');
            var res = new ServerResponse(connection);
            res.writeHead(STATUS_TIME_OUT,null, headers);
            res.end();
            isOpen = false;
        }
        var isOpen= true;

        console.log('connection created');
        connection.setTimeout(TIME_TO_WAIT);
        connection.setKeepAlive(true);

        connection.on('end', function() {
            isOpen = false;
            console.log('connection ended');
            connection.end();
        });
        connection.on('error', function(e) {
            isOpen = false;
            console.log('connection error:'+ e.code);
        });

        connection.on('timeout', timeOut);

        connection.on('data', function(socket){
            var headers;
            var err_data, err_status;
            //reset timeout
            try {
                parseHTTP(socket);

            } catch(err) {
                console.log(err);
                err_data = ERROR_MSGS['INVALID_HTTP_REQ']+err;
                err_status = STATUS_SERVER_ERROR;
                if (isOpen){
                    headers = {
                        'Content-Length': Buffer.byteLength(err_data, 'utf8'),
                        'Content-Type': 'text/plain',
                        'Connection': 'close'
                    };
                    var res = new ServerResponse(connection);
                    res.writeHead(err_status,null, headers);
                    res.write(err_data);
                    res.end();
                    //writeHTTP(connection, err_status, headers, err_data, after_http_write);

                }
            }
        });
    });

}


function IncomingMessage(dicHttp, httpHeader, body, socket){
    this.httpVersion = httpHeader.version;
    this.headers = dicHttp;
    this.method = httpHeader.action;
    this.url = httpHeader.resource;
    this.body = body;
    this.socket = socket;
}

IncomingMessage.prototype = {
    '_read': function() {
        return this.body;
    },
    'setSocketKeepAlive': function(enable, initialDelay){
        this.socket.setKeepAlive(enable, initialDelay);
    },
    __proto__: stream.Readable
};

function ServerResponse(socket){
    this.sendDate = true;
    this.socket = socket;
    this.statusCode = 200;
    this._wroteHead = false;
    this._startBody = false;
}

ServerResponse.prototype = {
    'writeHead': function  (statusCode,reasonPhrase, headers){
        var niceReason = reasonPhrase || STATUS_NAMES[statusCode]+'\n';
        var response = 'HTTP/1.1 '+statusCode+ ' '+niceReason;
        this.statusCode = statusCode;
        this._wroteHead = true;

        if (!headers.hasOwnProperty('date') && this.sendDate){
            headers['Date'] = new Date().toUTCString();
        }

        for(var key in headers){
            response+=key+': '+headers[key]+'\n';
        }
        this.socket.write(response, 'UTF-8');
    },
    'setTimeout': function (msecs, callback){
        this.socket.setTimeout(msecs, callback);
    },
    'setHeader': function (name, value){
        if(!this._wroteHead){
            this.writeHead(this.statusCode, null, {});
        }
        this.socket.write(name+': '+value+'\n');
    },
    'write': function (chunk, encoding){
        if(!this._wroteHead){
            this.writeHead(this.statusCode, null, {});
        }

        if (!this._startBody){
            this.socket.write('\n');
            this._startBody=true;
        }

        this.socket.write(chunk, encoding);
    },
    'end': function (data, encoding){
        if(!this._wroteHead){
            this.writeHead(this.statusCode, null, {});
        }
        this.socket.end(data, encoding);
    }
};

HttpServer.prototype = {
    'listen': function (port, callback){
        /**
         *  starts the web server which listens to port
         * @param port port to listen to
         */
        this._server.listen(port, callback);
    },

    'close':function(){
        /**
         * stops listening to new requests.
         */
        this._server.close();
        this.emit('close');
    },

    __proto__: events.EventEmitter.prototype
}

module.exports.STATS_CODES_NUM = {
    'OK': STATUS_OK,
    'NOT_FOUND': STATUS_NOT_FOUND,
    'METHOD_NOT_ALLOWED': STATUS_METHOD_NOT_ALLOWED,
    'TIME_OUT': STATUS_TIME_OUT,
    'SERVER_ERROR': STATUS_SERVER_ERROR
};


module.exports.createServer = function(requestListener){
    var server = new HttpServer();
    if (requestListener) {
        console.log('registering request');
        server.on('request', requestListener);
    }
    return server;
};

module.exports.STATUS_NAMES = STATUS_NAMES;
