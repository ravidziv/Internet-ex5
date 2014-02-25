var http = require ('http');
var mainJs = require('./main');
var assert = require('assert');
function testResponse (options, content, reqCallback, callbackDict){
    options['hostname'] = 'localhost';
    options['port'] = '8888';

    var req = http.request(options, reqCallback);
    if(callbackDict) {
        for (var eventName in callbackDict){
            req.on(eventName, callbackDict[eventName]);
        }
    }
    req.on('error', function(err){
        console.log(err);
    });
    req.write(content);
    req.end();
}

function registerTest(userName, callback)
{
    var content = '{"username":"'+userName+'","fullname":"a","password":"a"}';

    var options = {
      headers: {'content-length': content.length},
      hostname: 'localhost',
      port: 8888,
      path: '/register',
      method: 'POST'
    };

    var req = http.request(options, function(res) {
            assert(res.statusCode==200);
            if(callback){
                callback();
            } else {
                console.log("Success register test!!!");
            }
    });
    req.write(content);
    req.end();
}

function loginNegativeTest()
{
    var options = {
      hostname: 'localhost',
      port: 8888,
      path: '/login?password=a&username=ron',
      method: 'GET'
    };

    var req = http.request(options, function(res) {
        res.on('data',function(body)
        {

            assert(body.toString()=="User doesn't exist")
        });
        assert(res.statusCode==200);
        console.log("Success Login negative test!!!")
    });

    req.end();
}

function positiveLoginTest(username, callback)
{
  registerTest(username, function(){
      var options = {
          hostname: 'localhost',
          port: 8888,
          path: '/login?password=a&username='+username,
          method: 'GET'
      };
      
      var req = http.request(options, function(res) {
          res.on('data',function(body)
          {
              console.log(body.toString())
              assert(body.toString()=="OK")
          });
          assert(res.statusCode==200);
          if (callback)
          {
              console.log("KOKOKOKO");

              callback(res.headers['set-cookie'][0].split(';')[0]);
          }
          else
          {
              console.log("Success Login positive test!!!")
          }
      });

      req.end();

  });
}


function deleteTest(id)
{
   addItem("deleteUser"+id, function(cookie){
        var content = '{"id": "' + ( id || 1 ) + '"}';
        var options = {
          headers: {
              'content-length': content.length,
              'cookie': cookie
          },
          hostname: 'localhost',
          port: 8888,
          path: '/item',
          method: 'DELETE'
        };

        var req = http.request(options, function(res) {
            assert(res.statusCode==200);
            res.on('data', function(data){
                console.log(data.toString());
                assert(JSON.parse(data.toString()).status==0);
                console.log("Success delete test!!!");
            })

        });
        req.write(content);
        req.end();
    });
}

function addItem(username, callback){
    positiveLoginTest(username, function(cookie){
        var content = '{"id": "1", "value": "TODO1"}';
        var options = {
          headers: {
              'content-length': content.length,
              'cookie': cookie
          },
          hostname: 'localhost',
          port: 8888,
          path: '/item',
          method: 'POST'
        };

        var req = http.request(options, function(res) {
            assert(res.statusCode==200);
            if(callback){
                callback(cookie);
            } else {
                res.on('data', function(data){
                    assert(JSON.parse(data.toString()).status==0);
                    console.log("Success add item test")
                });
            }

        });
        req.write(content);
        req.end();
    });
}
function deleteAllTest()
{
    deleteTest('-1');
}

function updateTest()
{
    addItem("updateUser", function(cookie){
        var content = '{"id": "1", "value": "new val", "status": "1"}';
        var options = {
          headers: {
              'content-length': content.length,
              'cookie': cookie
          },
          hostname: 'localhost',
          port: 8888,
          path: '/item',
          method: 'PUT'
        };

        var req = http.request(options, function(res) {
            assert(res.statusCode==200);
            res.on('data', function(data){
                assert(JSON.parse(data.toString()).status==0);
                console.log("Success update test!!!");
            })

        });
        req.write(content);
        req.end();
    });
}

function getAllTest(){
    addItem("getAllTest", function(cookie){

        var options = {
          headers: {
              'cookie': cookie
          },
          hostname: 'localhost',
          port: 8888,
          path: '/item',
          method: 'GET'
        };

        var req = http.request(options, function(res) {
            assert(res.statusCode==200);
            res.on('data', function(data){
                //assume we already have 1 item
                assert(JSON.parse(data.toString()).length==1);


                //console.log("Success put test!!!");
            })

        });
        req.end();
    });
}


registerTest("dan");
positiveLoginTest("login");
loginNegativeTest();
deleteTest("1");
deleteAllTest();
addItem();
getAllTest();
updateTest();

/*

	return {
		get: function (callback) {
            $http.get('/item')
                .success(callback)
                .error(gotoLogin);
		},

		addItem: function (newItem, callback) {
            $http.post('/item',  newItem)
                .success(callback)
                .error(gotoLogin);
		},
        delete: function (itemId, callback) {
            $http.delete('/item', {params:{id:itemId}})
                .success(callback)
                .error(gotoLogin);
        },
        deleteAll: function (callback) {
            $http.delete('/item', {params:{id:-1}})
                .success(callback)
                .error(gotoLogin);
        },
        update: function (item, callback) {
            $http.put('/item', {
                'id': item.id,
                'value': item.title,
                'status': item.completed
            }).success(callback)
              .error(gotoLogin);
        }
	};
    */