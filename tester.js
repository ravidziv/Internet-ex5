var http = require('http'),
    net = require('net'),
    fs = require('fs'),
    assert = require('assert');
var miniHttp = require('./miniHttp');

var miniExpress = require('./miniExpress');

/**
 * Simple utility function for tests
 */
function testResponse(options, content, reqCallback, callbackDict){
    options['hostname'] = 'localhost';
    options['port'] = '8888';


    var req = http.request(options, reqCallback);
    if(callbackDict) {
        for (var eventName in callbackDict){
            req.on(eventName, callbackDict[eventName]);
            req.on(eventName, callbackDict[eventName]);
        }
    }
    req.on('error', function(err){
        console.log(err);
    });
    req.write(content);
    req.end();
}


/**
 * Simple test for resource not found.
 */
function testResouceNotFound(){
    var content = "test";
    var options = {
        path: '/check/blablablabla',
        method: 'GET',
        headers: {
            'Content-Length': content.length
        }
    };
    testResponse(options,content,  function(res) {
        console.log('not found test callback');
        console.log(res.statusCode);
        assert(res.statusCode == 404);
        console.log("Resource not found - test succeeded");
    });
}

/**
 * validate we get content-length and content-type properly
 */
function simpleGoodResource(){
    var content = 'tester content',
        filename = 'text.txt';
    var options = {
        path: '/check/'+filename,
        method: 'GET',
        headers: {
            'Content-Length': content.length
        }
    };
    //create a text file
    fs.writeFile(__dirname+'/test/'+filename, content);
    testResponse(options,content,  function(res) {
        assert(res.statusCode == 200);
        assert(res.headers['content-length'] == content.length);
        assert(res.headers['content-type'] == "text/plain");
        console.log("Resource found - test succeeded");

    }, {
        'data': function (data) {
            assert(data == content);
        }
    });
}
/**
 * we validate that other http requests which aren't get returns 405
 */
function testPost() {
    var content = "test";
    var options = {
        path: '/check/blablablabla',
        method: 'POST',
        headers: {
            'Content-Length': content.length
        }
    };
    testResponse(options,content,  function(res) {
        assert(res.statusCode == 405);
        console.log("only get support - test succeeded");
    }, {
        'data': function(data) {
            console.log(data);
            assert(data.length>0);//there is some explanation
        }
    });
}
/**
 * we validate when we get invalid http (content-length not a number) it returns 500
 */
function badHttpRequest() {
    //bad content-length
    var content = "test";
    var options = {
        path: '/check/blablablabla',
        method: 'GET',
        headers: {
            'Content-Length': 'text'
        }
    };
    testResponse(options,content,  function(res) {
        assert(res.statusCode == 500);
        console.log("Bad content-length (text) - test succeeded");
    });

}

/**
 * we validate when we get invalid http (content-length not a number) it returns 500
 */
function badHttpHeader() {
    //bad content-length
    var connection = net.createConnection(8888);
    connection.on('data',function (data) {
        var res = data.toString();
        assert(res.indexOf("500")!=-1);
        console.log("bad http header - test succeeded");
    });

    var badRequestContent = "hi what's up server?\nparam: paramValue!\ndate: no date";
    connection.write(badRequestContent);
    connection.end();
}

/**
 * we validate we can handle multiple requests on the same connection
 */
function multipleRequests() {
    //bad content-length
    var connection = net.createConnection(8888);
    var numReq;
    connection.on('data',function (data) {
        console.log('---Client got--------\n'+data.toString()+'\n---------')
    });

    var httpReq = "GET /check/text.txt HTTP/1.1\nHost: localhost:8888\nConnection: keep-alive\ncontent-length: 4\r\n\r\ndata";
    var req = "";
    for (numReq = 0; numReq<10; numReq++) {
        req+=httpReq;
    }
    connection.setKeepAlive(true);
    connection.setNoDelay();
    connection.write(req);
}

/**
 * we validate we can handle multiple requests on the same connection
 */
function partialRequest() {
    //bad content-length
    var connection = net.createConnection(8888);
    var numReq;
    connection.on('data',function (data) {
        console.log('---Client got (partial request test)--------\n'+data.toString()+'\n---------')
    });

    var httpReq = "GET /check/text.txt HTTP/1.1\nHost: localhost:8888\nConnection: keep-alive\ncontent-length: 4\r\n";

    connection.setKeepAlive(true);
    connection.setNoDelay();
    connection.write(httpReq, function(){
        connection.write('\r\ndata');
    });
}

/**
 * we validate that in response to too long content length (longer than content)
 * the server wait for the whole message, and when it fails it gets to timeout
 */
function tooLongContentLength() {
    var content = "test";
    var options = {
        path: '/check/blablablabla',
        method: 'GET',
        headers: {
            'Content-Length': 1000 // it will wait for the whole request, and then timeout
        }
    };
    testResponse(options, content, function(res) {}, {
        'error': function(d){
            console.log("Bad content-length (too long) - test succeeded");
        }
    });

}

/**
 * validate that inaccessible document is really inaccessible
 */
function securityCheck(){
    var content = "test";

    var options = {
        path: __dirname.replace(' ','%20')+"/tester.js",
        method: 'GET',
        headers: {
            'Content-Length': content.length
        }
    };
    testResponse(options, content, function(res) {
        assert(res.statusCode != 200);
        console.log("Security check - test succeeded");

    });
}

/**
 * test many requests from the server and it doesn't fail
 */
function stressTest(){
    var testNum=0;
    for(testNum=0; testNum<3000;testNum++) {
        simpleGoodResource();
    }
    // see in the console 3000 messages of Resource found - test succeeded
    // wow :)
}

function methodTest(type1, type2, status)
{
    status = status || 405;
    var req = http.request({
        'hostname': 'localhost',
        'port': '8888',
        path: '/testMethod/'+type1.toLowerCase()+'/profile.html',
        method: type1
    }, function(res){
        assert(res.statusCode==status);
        console.log("Succeeded " + type1+"Test - positive!!!")
    });
    req.on('error', function(err){
        console.log(err);
    });
    req.end();
    req = http.request({
        'hostname': 'localhost',
        'port': '8888',
        path: '/testMethod/'+type1.toLowerCase()+'/profile.html',
        method: type2
    }, function(res){
        assert(res.statusCode!= status);
        console.log("Succeeded "+ type1+"Test!!!- negative")

    });
    req.on('error', function(err){
        console.log(err);
    });
    req.end();

}
function putTest(){
    methodTest("PUT","DELETE" );
}

function getTest(){
    methodTest("GET","DELETE", 200 );

}

function deleteTest(){
    methodTest("DELETE", "GET" );

}

function postTest(){
    methodTest("POST","DELETE" );

}

function paramsTest(){
    app.get("/paramTest/:name/:lastname", function(req,res,next){
            assert(req.params['name']=='aaa' );
            assert(req.params['lastname']=='bbb' );
            res.send('OK');
            console.log('Succeeded ParamTest!!!')

        }
    );

    var req = http.request({
        'hostname': 'localhost',
        'port': '8888',
         'path': '/paramTest/aaa/bbb/ccc',
        'method': 'GET'
    });
    req.on('error', function(err){
        console.log(err);
    });
    req.end();
}

function cookieParserTest(){
    app.get("/cookieTest/:name/:lastname", miniExpress.cookieParser());
    app.get("/cookieTest/:name/:lastname", function(req2,res,next){
            assert(req2.cookies['name']=='aaa' );
            assert(req2.cookies['lastname']=='bbb' );
            res.send('OK');
            console.log('Succeeded CookiesTest!!!')

        }
    );

    var cookies = "name=aaa; lastname=bbb";
    var req = http.request({
        'hostname': 'localhost',
        'port': '8888',
        'path': '/cookieTest/aaa/bbb/ccc',
        'method': 'GET',
        'headers': {
            'cookie': cookies
        }


    });
    req.on('error', function(err){
        console.log(err);
    });
    req.end();

}

function bodyTest(){
    app.get("/bodyTest/:name/:lastname", miniExpress.bodyParser());
    app.get("/bodyTest/:name/:lastname", function(req3,res,next){
            if (req3.get('from')){
                assert(req3.get('content-type')== "application/x-www-form-urlencoded");
                assert(req3.body =="name=aaa&lastname=bbb");
            }
            else{
                assert(req3.body.name =='aaa');
                }
            res.send('OK');
            console.log('Succeeded bodyTest!!!')

        }
    );
    var body ='{"name": "aaa"}';
    var req = http.request({
        'hostname': 'localhost',
        'port': '8888',
        'path': '/bodyTest/aaa/bbb/ccc',
        'method': 'GET',
        'headers': {
            'content-length': body.length
        }


    });
    req.on('error', function(err){
        console.log(err);
    });
    var req2 = http.request({
        'hostname': 'localhost',
        'port': '8888',
        'path': '/bodyTest/aaa/bbb/ccc',
        'method': 'GET',
        'headers': {
            'from': "internet@cs.huji.ac.il"
        }

    });
    req2.on('error', function(err){
        console.log(err);
    });
    req.end(body);
    req2.end()
}

function jsonTest(){
    app.get("/jsonTest/:name/:lastname", miniExpress.json());
    app.get("/jsonTest/:name/:lastname", function(req2,res,next){
            assert(req2.body.name =='aaa');
            res.send('OK');
            console.log('Succeeded JsonTest!!!')

        }
    );
var body ='{"name": "aaa"}';
    req = http.request({
        'hostname': 'localhost',
        'port': '8888',
        'path': '/jsonTest/aaa/bbb/ccc',
        'method': 'GET',
        'headers': {
            'content-length': body.length
        }


    });
    req.on('error', function(err){
        console.log(err);
    });
    req.end(body);

}


function urlencodedTest(){
    app.get("/urlencodedTest/:name/:lastname", miniExpress.urlencoded());
    app.get("/urlencodedTest/:name/:lastname", function(req2,res,next){
            assert(req2.get('content-type')== "application/x-www-form-urlencoded");
            assert(req2.body =="name=aaa&lastname=bbb");
            res.send('OK');
            console.log('Succeeded urlencodedTest!!!');

        }
    );
    req = http.request({
        'hostname': 'localhost',
        'port': '8888',
        'path': '/urlencodedTest/aaa/bbb/ccc',
        'method': 'GET',
        'headers': {
            'from': "internet@cs.huji.ac.il"
        }


    });
    req.on('error', function(err){
        console.log(err);
    });
    req.end();
}


var app = miniExpress();
//sync and not async - performance not relevant here
var isTestDirExist = fs.existsSync(__dirname+"/test" );
if (!isTestDirExist){
    fs.mkdirSync(__dirname+"/test");
}
app.put("/testMethod/put", miniExpress.static(__dirname+"/www"))
app.get("/testMethod/get", miniExpress.static(__dirname+"/www"))
app.delete("/testMethod/delete", miniExpress.static(__dirname+"/www"))
app.post("/testMethod/post", miniExpress.static(__dirname+"/www"))


app.use ("/check", miniExpress.static(__dirname+"/test"));
app.listen(8888);
var tests = {
    'Resource not found': testResouceNotFound,
    'Good request': simpleGoodResource,
   'Post request': testPost,
    'Stress': stressTest,
    'Bad content length': badHttpRequest,
    'Too long content length': tooLongContentLength,
   'Bad http header': badHttpHeader,
    'Security check': securityCheck,
    'Multiple Requests': multipleRequests,
    'Partial Request': partialRequest,
    'putTest':putTest,
    'getTest':getTest,
    'deleteTest':deleteTest,
    'postTest':postTest,
    'paramsTest': paramsTest,
    'cookieParserTest':cookieParserTest,
    'jsonTest': jsonTest,
    'urlencodedTest':urlencodedTest,
    'bodyTest':bodyTest

}

//run all the tests asynchronously :)
for(var testKey in tests) {
    console.log('Starting test:' + testKey);
    tests[testKey]();
}

