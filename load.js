var http = require('http'),
    fs = require('fs'),
    assert = require('assert');

var miniExpress = require('./miniExpress');

/**
 * Simple utility function for tests
 */
function testResponse(options, content, reqCallback, callbackDict) {
    options['hostname'] = 'localhost';
    options['port'] = '8888';

    var req = http.request(options, reqCallback);
    if(callbackDict) {
        for (var eventName in callbackDict) {
            req.on(eventName, callbackDict[eventName]);
            req.on(eventName, callbackDict[eventName]);
        }
    }

    req.write(content);
    req.end();
}

/**
 * validate we get content-length and content-type properly
 */
function simpleGoodResource(createResource) {
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
    if (createResource) {
        fs.writeFile(__dirname+'/test/'+filename, content);
    }

    testResponse(options,content,  function(res) {
        assert(res.statusCode === 200);
        assert(res.headers['content-length'] == content.length);
        assert(res.headers['content-type'] === "text/plain");
        console.log("Resource found - test succeeded");

    }, {
        'data': function (data) {
            assert(data === content);
        },
        'error': function (err) {
			console.log('Error:');
			console.log(err);
		}
    });
}

/**
 * test many requests from the server and it doesn't fail
 */
function loadTest() {
    var testNum = 0;
    simpleGoodResource(true);
    for(testNum = 0; testNum < 3000; testNum++) {
        simpleGoodResource(false);
    }
}
var app = miniExpress();
//sync and not async - performance not relevant here
var isTestDirExist = fs.existsSync(__dirname+"/test" );
if (!isTestDirExist) {
    fs.mkdirSync(__dirname+"/test");
}
app.use ("/check", miniExpress.static(__dirname+"/test"));
app.listen(8888);

loadTest();

