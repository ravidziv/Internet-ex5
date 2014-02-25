var fs = require ('fs'),
    pathModule = require('path')
    miniHttp = require('./miniHttp');

var MIME_DIC = {
    'JS' : 'application/javascript',
    'TXT': 'text/plain',
    'HTML': 'text/html',
    'CSS': 'text/css',
    'JPEG': 'image/jpeg',
    'JPG': 'image/jpeg',
    'GIF': 'image/gif',
    'PNG': 'image/png'
};

function wrapHtml(title, body){
    var style = "width:80%;margin:auto;border: 3px solid #000;padding:10px;font-size:large; background:#fcc;";
    var html = "<html> <head><title>"+title+"</title></head>";
    html+="<body><div style=\""+style+"\">"+body+"</div></body></html>";
    return html;
}


function deafultParser(toParse) {
    var keyValues = toParse.split('&');
    var parsetDict = {};
    for (var i=0;i<keyValues.length;i++) {
        var kv = keyValues[i].split('=');
        if (kv.length === 2) {
            var internalKeyRe =/(.+?)\[(.*?)\]/;
            var match = internalKeyRe.exec(kv[0]);
            if (match){
                if (parsetDict.hasOwnProperty(match[1])){
                    parsetDict[match[1]][match[2]] = kv[1];
                } else {
                    parsetDict[match[1]] = {};
                    parsetDict[match[2]] = kv[1];
                }
            } else {
                parsetDict[kv[0]]=kv[1];
            }
        }
    }
    return parsetDict;
}

function parseCookies(cookies){
    var cookieDict = {};
    var cookiesArray = cookies.split('; ');
    for (var cookieInd=0;cookieInd<cookiesArray.length;cookieInd++){
        var keyVal = cookiesArray[cookieInd].split('=');
        if (keyVal.length>=2){
            cookieDict[keyVal[0]] = keyVal.slice(1).join('=').trim();
        }
    }
    return cookieDict;
}

function HttpRequest(incomingRequest){

    this.body = {};
    this._internalBody= incomingRequest.body;
    this.cookies = {}; // use cookieParser to fill it if you want
    this.host = incomingRequest.headers['host'];
    this.protocol = 'http';
    this._headers = incomingRequest.headers;
    this.route = {'method': incomingRequest.method };
}

HttpRequest.prototype = {
    '_set': function (key, value){
        this._headers[key] = value;
    },
    '_setURL': function(url){
        var queryParams = url.split('?');
        var queryDict = {};
        if(queryParams.length>1){
            queryDict =  deafultParser(queryParams[1]);
        }
        this.query = queryDict;
        this.path = queryParams[0];
    },
    'get': function(key){
        if(key === 'Referrer' || key === 'Referer') {
            return this._headers['referrer'] || this._headers['referer'];
        } else {
            return this._headers[key.toLowerCase()];

        }
    },
    'is': function(type) {
        var contentType = this._headers['content-type'];
        var firstCase = new RegExp(+'/'+type+'$').test(contentType);
        var wildcarCase = type.endsWith('/*') && contentType.startsWith( type.substr(0,  type.length-2) );
        return firstCase || type.toLowerCase() === contentType.toLowerCase() || wildcarCase;
    },
    'param': function(name){
        return this.params[name] || this.query[name] || this.body[name];
    }
};

function HttpResponse ( serverResponse){
    this.serverResponse = serverResponse;
    this.headers = {};
    this.cookies = [];
    this._hasSent = false;
}

HttpResponse.prototype = {
    'set': function (name, value) {
        if (value === undefined) {
            for (var key in name) {
                this.headers[key.toLowerCase()] = name[key];
            }
        }
        else{
            this.headers[name.toLowerCase()] = value;
        }
    },
    'get': function (key) {
        return this.headers[key.toLowerCase()];
    },
    'status': function (code){
        this.serverResponse.statusCode = code;
        return this;
    },
    'cookie': function (name, value, options){
        var optionsPars= [];
        for (var key in options){
            optionsPars.push(key+'='+options[key]);
        }
        optionsPars = optionsPars.length>0 ? '; ' + optionsPars.join('; '): '';
        this.cookies.push(name+'='+value+optionsPars);
    },
    'send': function(status, body) {
        this._hasSent = true;
        if (body === undefined) {
            body=status;
        } else {
            this.serverResponse.statusCode=status;
        }

        body = body || '';

        var isString = typeof body ==="string";
        if (!this.headers.hasOwnProperty('content-type')) {
            if (body instanceof Buffer){
                this.headers['content-type'] = 'application/octet-stream';
            }
            else if (isString) {
                this.headers['content-type'] = 'text/html';
            }
        }

        if (typeof body === 'number') {
            this.serverResponse.statusCode = body;
            body = miniHttp.STATUS_NAMES[body];
        } else if (body !== undefined && !(body instanceof Buffer) && !isString ) {
            body = JSON.stringify(body);
        }

        this.headers['content-length'] = body.length;
        this.serverResponse.writeHead(this.serverResponse.statusCode, null, this.headers);
        for (var cookieInd=0;cookieInd<this.cookies.length;cookieInd++) {
            this.serverResponse.setHeader('set-cookie', this.cookies[cookieInd]);
        }
        this.serverResponse.write(body);
        if (this.headers.hasOwnProperty('connection') && this.headers['connection'] != 'keep-alive') {
            this.serverResponse.end();
        }
    },
    'json': function (status, body){
        this.send(status instanceof Object? status:JSON.stringify(status) , body instanceof  Object? body:JSON.stringify(body) );
    }
};


function mini(){
    var handler_mapping=[];
    var server = null;
    var route = {};

    function genericHandler(request, response) {
        console.log('got request: generic handling');
        var currHandlers = [];
        var responseData;
        for (var keyIndex = 0; keyIndex<handler_mapping.length; keyIndex++) {
            var curHandler = handler_mapping[keyIndex];
            if(curHandler[2] && request.method.toLowerCase()!=curHandler[2]){
                continue;
            }
            if(curHandler[3].test(request.url)){
                var params = curHandler[3].exec(request.url);
                var reqParams = {};
                if(params){
                    var url = request.url.substr(params[0].length);
                    params.shift();
                    for(var paramInd = 0; paramInd<params.length; paramInd++){
                        reqParams[curHandler[4][paramInd]] = params[paramInd];
                    }
                    currHandlers.push({
                        'params': reqParams,
                        'url': url,
                        'handler': handler_mapping[keyIndex][1]
                    });
                }
            }
        }

        if (currHandlers.length === 0) {
            responseData = new Buffer(wrapHtml("not found", "The requested file can't found"));
            response.writeHead(miniHttp.STATS_CODES_NUM['NOT_FOUND'], null, {
                'content-type': 'text/html',
                'Content-Length': responseData.length
            });
            response.write(responseData);
        } else {
            var expressReq = new HttpRequest(request);
            var httpResponse = new HttpResponse(response);
            function next(){
                var nextHandler = currHandlers.shift();
                if (nextHandler){
                    expressReq.params = nextHandler['params'];
                    expressReq._setURL(nextHandler['url']);
                    nextHandler['handler'](expressReq, httpResponse, next);
                } else if(!httpResponse._hasSent){
                    responseData = new Buffer(wrapHtml("not found", "The requested file can't found"));
                    response.writeHead(miniHttp.STATS_CODES_NUM['NOT_FOUND'], null, {
                        'content-type': 'text/html',
                        'Content-Length': responseData.length
                    });
                    response.write(responseData);
                }
            }
            next();
        }
    }

    /**
     * stops listening to new requests.
     */
    genericHandler.close =  function(){
        server.close();
    };

    /**
     *  starts the web server which listens to port
     * @param port port to listen to
     */
    genericHandler.listen = function(port){
        if (server == null) {
            server = miniHttp.createServer(genericHandler);
        }
        server.listen(port, function() { //'listening' listener
            console.log('server bound');
        });
    };

    genericHandler.route = route;

    /**
     *  set the root directory that contains the static files
     * @param rootResource web resource for clients
     * @param handler callback function that accepts req, res, next
     * @param method http method to catch
     */
    function internalUse(rootResource, handler, method) {

        if (rootResource instanceof  Function){
            handler_mapping.push(['', rootResource, method, new RegExp(), {}]);
        } else {
            var regIdentifer = new RegExp('^' + rootResource.replace(/\/:([^\/]+)/g,"/(?:([^\/]+))\/?"), 'i');
            var keys = [];
            var matchRg = /\/:([^\/]+)/g;
            var match;
            while(match= matchRg.exec(rootResource)){
                keys.push(match[1]);
            }
            handler_mapping.push([rootResource, handler, method, regIdentifer, keys]);
        }
        if (method){

            if(!route.hasOwnProperty(method)){
                route[method] = [];
            }
            route[method].push({
                path: rootResource,
                method: method,
                callbacks: handler,
                keys: keys,
                regexp: regIdentifer
            })
        }
    }


    /**
     *  set the root directory that contains the static files
     * @param rootResource web resource for clients
     * @param handler callback function that accepts req, res, next
     */
    genericHandler.use =  function(rootResource, handler) {
        internalUse(rootResource, handler);
    };

    genericHandler.get = function(rootResource, handler){
        internalUse(rootResource, handler, 'get');
    };

    genericHandler.post = function (rootResource, handler){
        internalUse(rootResource, handler, 'post');
    };

    genericHandler.delete = function(rootResource, handler){
        internalUse(rootResource, handler, 'delete');
    };

    genericHandler.put = function(rootResource, handler){
        internalUse(rootResource, handler, 'put');
    };

    return genericHandler;
}

module.exports = mini;


module.exports.cookieParser  = function (){
    return function (req, res, next){
        req.cookies = parseCookies(req.get('cookie'));
        next();
    };
};

module.exports.json = function (){
    return function (req,res, next){

        try{
            req.body = JSON.parse(req._internalBody)
        }
        catch(e) {
            console.log("Bad body- not json format");
        }

        next();
    };

}

module.exports.urlencoded = function (){
    return function (req, res, next){
        if (req.get("from")){
            req._set("content-type", "application/x-www-form-urlencoded");
            var newBody = [];
            for (var key in req.params){
                newBody.push(key+'='+req.params[key]);
            }
            req.body = newBody.join('&');
        }
        next();
    };
};


module.exports.bodyParser = function (){
    return function (req, res, next){
        module.exports.urlencoded()(req,res, function(){
                module.exports.json()(req, res, next);

            }
        );
    };
};

module.exports.static = function (path){
    function handleResource(requestedResource, callback) {

        var local_path = path;
        if(requestedResource!=""){
            local_path+=pathModule.sep+requestedResource;
        }
        console.log(local_path);
        fs.exists(local_path, function (exist){
            var responseData;
            if (exist){
                fs.readFile(local_path, function (err, data) {
                    var file_type = (local_path.lastIndexOf('.')>-1)?
                        local_path.substr(local_path.lastIndexOf('.')+1) :
                        '';
                    if (file_type.length>0){
                        file_type = MIME_DIC[file_type.toUpperCase()];
                        if(!file_type){
                            //for non supported file - handle as plain text
                            file_type = 'text/plain';
                        }
                    }
                    if (!err){
                        callback(miniHttp.STATS_CODES_NUM['OK'], data, file_type);
                    }
                    else {
                        responseData = new Buffer(wrapHtml("error bad request", "Can't open the requested file"));
                        callback(miniHttp.STATS_CODES_NUM['NOT_FOUND'], responseData, "text/html");
                    }
                });
            }
            else {
                responseData = new Buffer(wrapHtml("not found", "The requested file can't found"));
                callback(miniHttp.STATS_CODES_NUM['NOT_FOUND'], responseData, "text/html");
            }
        });
    }

    return function(request, response, next){
        console.log('got request');
        var httpConnection;
        var httpVer = request.httpVersion;
        var httpConnecetionResponse = 'keep-alive';
        var err_data, err_status, headers;

        httpConnection = request.get('connection');
        if ((httpVer==='1.0' && (httpConnection === undefined ||  httpConnection !== 'keep-alive'))
            || httpConnection === 'close'){
            httpConnecetionResponse = 'close';
        }

        if (request.route.method === 'GET') {
            handleResource(request.path, function (status_code, data, file_type){
                headers = {
                    'Connection': httpConnecetionResponse
                };

                if (status_code === miniHttp.STATS_CODES_NUM['OK']){
                    headers['content-type'] = file_type;
                } else {
                    headers['content-type'] = 'text/html';
                }
                response.status(status_code);
                response.set(headers);
                response.send(data);
            });
        }
        else {

            err_data = "only get";
            err_status = miniHttp.STATS_CODES_NUM['METHOD_NOT_ALLOWED'];
            headers={
                'Content-Type': 'text/plain',
                'Connection': httpConnecetionResponse
            };
            response.status(err_status);
            response.set(headers);
            response.send(err_data);
        }

    };

};