var express = require("express"),
    app = express.createServer(),
    httpProxy = require('http-proxy'),
    request = require('request');

app.use(express.bodyParser());

app.get('/', function(req, res){                
    res.render('index.ejs', { layout: false});
});

app.get('/room/:room', function(req, res){
    res.render('index.ejs', { layout: false});
});
app.get('/r/:room', function(req, res){
    res.render('index.ejs', { layout: false});
});

app.get('/api/geocode', function(req, res){
    //http://www.mapquestapi.com/geocoding/v1/address?key=YOUR_KEY_HERE&location=Lancaster,PA&callback=renderGeocode
    request("http://www.mapquestapi.com/geocoding/v1/address?key="+
            process.env.MAPQUEST_API_KEY+"&location="+
            encodeURIComponent(req.param("location")), function(err, resp, body){
                res.header('Content-Type', "application/json");
                res.send(body);
    });
});

var proxy = new httpProxy.HttpProxy({ 
  target: {
    host: 'talkback.im', 
    port: 5281
  }
});
app.post('/http-bind', function(req, res){
    console.log("proxying request to ejabberd");

//    res.headers = { 'Pragma': 'no-cache', "Cache-Control": "no-cache" }


    proxy.proxyRequest(req, res);
});

app.use('/static', express.static(__dirname + '/static')); 
var port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log("Listening on " + port);
});



