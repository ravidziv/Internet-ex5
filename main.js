var miniExpress = require('./miniExpress'),
    miniHttp = require('./miniHttp'),
    path = require('path'),
    crypto = require('crypto');
var app = miniExpress();
//app.get ("/:username", miniExpress.static(__dirname+path.sep+"www"));

/*app.post ("/register",function(req, res, next){
    req.body = postParser(req._internalBody);
    console.log(req.body);
    next();
});*/
app.post ("/register", miniExpress.bodyParser());
var registeredUsers = [];
app.post ("/register", function(req, res, next){
    var already_exist = false;
    for(var i=0;i<registeredUsers.length;i++){
        var user = registeredUsers[i];
        if(user.username == req.body.username){
            already_exist=true;
            break;
        }
    }
    if(already_exist){
        res.send(500, "Such user already exist");
    } else{
        var user={
            username: req.body.username,
            password: req.body.password,
            fullname: req.body.fullname,
            items: {}
        };
        registeredUsers.push(user);
        var md5er = crypto.createHash('md5');
        md5er.update(Math.random().toString());
        var cookieKey=  md5er.digest('hex');
        user.sessionKey = cookieKey;
        var newDateObj = new Date(new Date().getTime() + 2000000);
        //var newDateObj = new Date(new Date().getTime() + 20000);
        user.sessionExpires = newDateObj;
        res.cookie('key', cookieKey, {
            expires: newDateObj.toGMTString()
        });
        res.send('Success');
    }
});

app.get ("/login", function(req, res, next){
    var is_exist = false;
    var pass_ok = false;
    var user = null;

    for(var i=0;i<registeredUsers.length;i++){
        user = registeredUsers[i];
        if(user.username == req.query.username){
            is_exist = true;
            pass_ok = (user.password == req.query.password);
            break;
        }
    }

    if(pass_ok){
        var md5er = crypto.createHash('md5');
        md5er.update(Math.random().toString());
        var cookieKey=  md5er.digest('hex');
        user.sessionKey = cookieKey;
        var newDateObj = new Date(new Date().getTime() + 2000000);
        user.sessionExpires = newDateObj;
        res.cookie('key', cookieKey, {
            expires: newDateObj.toGMTString()
        });
        res.send('OK');
    }
    else if(is_exist){
        res.send('Wrong password');
    }
    else{
        res.send('User doesn\'t exist');
    }
});

app.use("/item", miniExpress.bodyParser());
app.use ("/item", miniExpress.cookieParser());
app.use ("/item", authentication);
app.get ("/item", function(req, res, next){
    //to list in client side
    var items = [];
    for(var k in req.user.items){
        var item = req.user.items[k];
        item.id = k;
        items.push(item);
    }
    res.send(items);
});

app.post("/item", function(req, res, next){
    if (req.user.items[req.body.id]){
        res.send({status: 1, msg: "The id already exist"});
    }
    else{
        req.user.items[req.body.id] = {
            title: req.body.value,
            completed: 0
        };
        res.send({status: 0, msg: "Success to post"});
    }
});

app.put("/item", function(req, res, next){
    if (req.user.items[req.body.id]){
        req.user.items[req.body.id] = {
            title: req.body.value,
            completed: req.body.status
        };
        res.send({status: 0, msg: "Success to put"});
    }
    else{
        res.send({status: 1, msg: "The id not found"});
    }
});


app.delete("/item", function(req, res, next){
    if(req.body.id == -1){
        req.user.items = {};
        res.send({status: 0, msg: "Success to delete"});
    } else if (req.user.items[req.body.id])
    {
        delete req.user.items[req.body.id];
        res.send({status: 0, msg: "Success to delete"});
    }
    else{
        res.send({status: 1, msg: "The id not found"});
    }
});

/**
 * Shortcut - if you dont enter index.html
 */
app.get ("/todo/", function(req,res ,next){
    if(req.path=="") {
        return miniExpress.static(__dirname+path.sep+"todoList/index.html")(req, res, next);
    }
    next();
});
app.get ("/todo", miniExpress.static(__dirname+path.sep+"todoList"));

miniHttp.createServer(app).listen(process.env.PORT || 8888);
//app.listen(8888);
//app.close();


function authentication(req, res, next){
    var user = null;
    var found = false;
    for(var i=0; i<registeredUsers.length;i++){
        user = registeredUsers[i];
        if(user.sessionKey === req.cookies['key']){
            found = true;
            if(user.sessionExpires<new Date()){
                res.send(400, "Session key expired");
            }
            else {
                req.user = user;
                next();
            }
        }
    }
    if(!found){
        res.send(400, "Unknown user");
    }
}
