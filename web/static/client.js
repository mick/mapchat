var BOSH_SERVICE = '/http-bind'
var connection = null;
var map = null;

function log(msg) 
{
    $('#log').append('<div></div><br/><br/>').append(document.createTextNode(msg));
}

function rawInput(data)
{
    log('RECV: ' + data);
}

function rawOutput(data)
{
    log('SENT: ' + data);
}

if(console.log === undefined){
    console.log = function(){};
}

function onConnect(status)
{
    if (status == Strophe.Status.CONNECTING) {
	    $("#status").text('Connecting...');
    } else if (status == Strophe.Status.CONNFAIL) {
	    $("#status").text('Failed to connect.');
    } else if (status == Strophe.Status.DISCONNECTING) {
		$('#status').text('Disconnecting.');
    } else if (status == Strophe.Status.DISCONNECTED) {
		$('#status').text('Disconnected.');
    } else if (status == Strophe.Status.CONNECTED) {
		$('#status').text('Connected.');
        if(window.location.pathname.substr(0,6) == "/room/"){
            talkback.roomname = window.location.pathname.replace("/room/", "");
            talkback.joinRoom(talkback.roomname+"@chat.talkback.im");            
        }else if(window.location.pathname.substr(0,3) == "/r/"){
            talkback.roomname = window.location.pathname.replace("/r/", "");
            talkback.joinRoom(talkback.roomname+"@chat.talkback.im");            
        }else{
            talkback.roomname = "test";
            talkback.joinRoom("test@chat.talkback.im");
        }
        $("#mapname").text(talkback.roomname);
        talkback.pubsubSubscribe();


        if(navigator.geolocation) {
            //        $('a#findme').click(function(){           
            navigator.geolocation.getCurrentPosition(function(position) {
                var browserLoc = new L.LatLng(position.coords.latitude,position.coords.longitude);
                map.panTo(browserLoc);
            });
            //        });
        }


	//connection.disconnect();
    }
}


var talkback = {
    roster:{},
    roomname:"",
    roomjid:"",
    init:function(){

    },

    sendMessage:function(){

    },

    recieveMessage:function(){


    },
    parseMessageContent:function(){
        // If there is a linked url, we try to embed it,
        // if we cant embed it, we might ask the server to help
        // if all else doesnt work.. we just show it.


        //Note, this should happen after the inital message has been
        // shown to the user, and the we enhance once we know more
        
    },
    joinRoom:function(room){
        connection.muc.join(room, (new Date()).getTime().toString()+(Math.floor(Math.random()*1000)), talkback.roomMessage, talkback.roomPresence, "");
        talkback.roomjid = room;
    },
    pubsubSubscribe:function(){

        connection.pubsub.connect(connection.jid, "geo.talkback.im")
        var bounds = [map.getBounds().getSouthWest().lat,
                      map.getBounds().getSouthWest().lng, 
                      map.getBounds().getNorthEast().lat, 
                      map.getBounds().getNorthEast().lng];

        connection.pubsub.subscribe(talkback.roomname, {"bounds": bounds}, //[42.943,-71.032,43.039,-69.856]}, 
                                    talkback.pubsubEvent, 
                                    talkback.pubsubSuccess, 
                                    talkback.pubsubError, 
                                    true);
        
    },
    pubsubSuccess:function(msg){
        console.log("success", msg);
        return true;
    },
    pubsubError:function(msg){
        console.log("error", msg);
        return true;
    },
    pubsubEvent:function(msg){
        console.log("event", msg);
        var feature ={};
        var point = [];
        try{
            var action = "";
            if($(msg).find("addition").length > 0){
                action = "addition";
            }else if($(msg).find("alter").length > 0){
                action = "alter";

            }else if($(msg).find("alter").length > 0){
                action = "alter";
            }
            feature.id = $(msg).find("feature").attr("id");
            feature.type = $(msg).find("feature").attr("type");
           
            point = $(msg).find("coordinates").text().split(",");
            maptalk[action](feature, point);

        }catch(e){
            console.log("error", e);
        }

        return true;
    },
    roomMessage:function(msg){
        var $msg = $(msg);
        var from = $msg.attr("from").replace(talkback.roomjid+"/","");

        var message = $msg.find("body").text();
        var $messagebox = $("<div class='messagebox'><span class='username'>"+from+":</span>  "+message+"</div>");
        $("#chatcontent").append($messagebox);
        talkback.roomScroll();
        return true;
    },
    roomScroll:function(){
        $("#chatcontent").scrollTop($("#chatcontent").height());
    },
    roomPresence:function(msg){
        console.log("roster: ", talkback.roster);
        if(talkback.roster[$(msg).attr("from")] !== undefined){
            if($(msg).find("photo").text() == talkback.roster[$(msg).attr("from")]){
                // we have the image and it is current
                return true;
            }
        }else{
            //announce in chat.
            var from = $(msg).attr("from").replace(talkback.roomjid+"/","");
            var $messagebox = $("<div class='messagebox joined'>"+from+" joined</div>");
            $("#chatcontent").append($messagebox);
            talkback.roomScroll();
            talkback.roster[$(msg).attr("from")] = $(msg).attr("from");
        }
        //connection.vcard.get(talkback.vcardHandler, $(msg).attr("from"));
        return true;
    },
    sendRoomMessage:function(message){
        connection.muc.message(talkback.roomjid, "", message, "");
    },
    vcardHandler:function(stanza){
        return true;
        var $canvas = $("<canvas width='60' height='60' style='background: #fff;'></canvas>");

        var $vCard = $(stanza).find("vCard");
        var img = $vCard.find('BINVAL').text();

        if( img == ""){
            return true;
        }
        var type = $vCard.find('TYPE').text();
        var img_src = 'data:'+type+';base64,'+img;
        //display image using localStorage
        
        var ctx = $canvas.get(0).getContext('2d');
        var img = new Image();   // Create new Image object
        img.onload = function(){
            // execute drawImage statements here
            ctx.drawImage(img,0,0, 60, 60);
            $("#roster").append($canvas);
        }
        img.src = img_src;
        return true;
    }
};


var maptalk = {

    features:[],

    init:function(features){
        //add features to the map

    },
    addition:function(feature, point){

        // find feature, add new latlng (in the right order)
        if(feature.type == "polyline"){

            for( f in maptalk.features){
                if(maptalk.features[f].options.featureid == feature.id){
                    maptalk.features[f].addLatLng(new L.LatLng(point[0], point[1]));
                    return true;
                }
            }
        
            //if feature doesnt exist create it, add point
            var polyline = new L.Polyline([new L.LatLng(point[0], point[1])], {color: maptalk.getFeatureColor(), 
                                                                               featureid:feature.id});
            // add the polyline to the map
            map.addLayer(polyline);
            maptalk.features.push(polyline);
        }else if(feature.type == "point"){

            for( f in maptalk.features){
                if(maptalk.features[f].options.featureid == feature.id){
                    return true;
                }
            } 

            var latlng = new L.LatLng(point[0], point[1]);
            var marker = new L.Marker(latlng, {draggable:true, featureid:feature.id});
            map.addLayer(marker);

            marker.on("dragend", maptalk.markerDragend);

            maptalk.features.push(marker);            
        }

    },
    alter:function(feature, point){
        if(feature.type== "point"){
            for( f in maptalk.features){
                if(maptalk.features[f].options.featureid == feature.id){
                    maptalk.features[f].setLatLng(new L.LatLng(point[0], point[1]));
                    return true;
                }
            } 
        }
    },
    deletion:function(feature, point){
        // find feature remove the point.

        // if feature doesnt exist, ignore.
    },

    markerDragend:function(e){
        maptalk.sendMapChange({id:e.target.options.featureid, 
                               type:"point"}, [e.target._latlng.lat, e.target._latlng.lng], "alter");

    },

    sendMapChange:function(feature, point, changeType){

        var iq = $iq({from:connection.jid, to:connection.pubsub.service, type:'set'})
            .c('pubsub', { xmlns:Strophe.NS.PUBSUB })
            .c('publish', {node:talkback.roomname})
            .c('item', {id:"foo"+Math.floor(Math.random()*100000)})
            .c('change', {id:"change"})
            .c('feature', {id:feature.id, type:feature.type})
            .c(changeType)
            .c('point')
            .c('coordinates').t(point.join(','));
        connection.send(iq);
    },
    getFeatureColor:function(){
        
        var color = maptalk.colors[maptalk.color_index];

        if(maptalk.colors.length <= maptalk.color_index+1){
            maptalk.color_index = 0;
        }else{
            maptalk.color_index+=1;
        }

        return color;
        
    },
    colors:["red", "blue", "green", "yellow", "brown", "black", "orange", "purple", "pink"],
    color_index:0,
    geocodeLocation:function(location){
        $.ajax("/api/geocode", {data:{location:location}, success:function(data){
            
            if(data.results[0].locations.length > 0){                
                var loc = new L.LatLng(data.results[0].locations[0].latLng.lat, data.results[0].locations[0].latLng.lng);
                map.panTo(loc);
            }
        }}, "json");
    }   
};



$(document).ready(function(){
        
    connection = new Strophe.Connection(BOSH_SERVICE);
    connection.rawInput = rawInput;
    connection.rawOutput = rawOutput;

    handlerid = connection.addHandler(function(stnz){
        console.log("GOT SOMETHING"+ stnz);
        return true;
    });
    connection.connect("guest.talkback.im",
			           "",
			           onConnect);
    

    
    $("#message").keyup(function(e){
        console.log("keypress: ", e);
        if(e.which == 13){
            talkback.sendRoomMessage($("#message").val());
            $("#message").val("");
        }   
    });
    $("#sendmessage").click(function(){
        talkback.sendRoomMessage($("#message").val());
        $("#message").val("");

    });
    $('#tabs').tab('show');
    $('a[data-toggle="tab"]').on('shown', function (e) {
        if($(e.target).attr("id") == "modepolyline"){
            maptalk.mode="edit";
            maptalk.edit_type="polyline";           
            $("a.dropdown-toggle span").text("Mode: Edit - Line");
        }else if($(e.target).attr("id") == "modepoint"){
            maptalk.mode="edit";
            maptalk.edit_type="point";           
            $("a.dropdown-toggle span").text("Mode: Edit - Point");
        }else if($(e.target).attr("id") == "modeview"){
            maptalk.mode="view";
            maptalk.edit_type="";           
            $("a.dropdown-toggle span").text("Mode: View");
        }
    });
    $('#map').css("height", $(window).height());
    // Define the map to use from MapBox
    // This is the TileJSON endpoint copied from the embed button on your map
    var url = 'http://a.tiles.mapbox.com/v3/dmt.map-cdkzgmkx.jsonp';

    // Make a new Leaflet map in your container div
    map = new L.Map('map', {zoomControl:false})  

    // Center the map on Washington, DC, at zoom 15
    .setView(new L.LatLng(37.774, -122.419), 12);

    // Get metadata about the map from MapBox
    wax.tilejson(url, function(tilejson) {
        // Add MapBox Streets as a base layer
        map.addLayer(new wax.leaf.connector(tilejson));
    });
    $("#locsearch").submit(function(e){
        e.preventDefault();
        maptalk.geocodeLocation($("#locsearch input").val());       
    });

    map.on("click", function(e){
        
        if(maptalk.mode=="edit"){

            if(maptalk.edit_type=="point"){
                var marker = new L.Marker(e.latlng, {draggable:true, featureid:Math.floor(Math.random()*10000).toString()});
                map.addLayer(marker);

                maptalk.sendMapChange({id:marker.options.featureid, 
                                       type:"point"}, [e.latlng.lat, e.latlng.lng], "addition");
                marker.on("dragend", maptalk.markerDragend);
                maptalk.features.push(marker);

            }else if(maptalk.edit_type == "polyline"){
                var polyline = null;
                if(maptalk.editing_feature != null){
                    polyline = maptalk.editing_feature;
                    polyline.addLatLng(e.latlng);
                }else{
                    polyline = new L.Polyline([e.latlng], 
                                              {color: maptalk.getFeatureColor(), 
                                               featureid:Math.floor(Math.random()*10000).toString()});
                    maptalk.editing_feature = polyline;
                    polyline.on("click", function(e){
                        if(maptalk.editing_feature != null){
                            // we are currently editing.
                            if(maptalk.editing_feature.options.featureid == e.target.options.featureid){
                                //stop editing
                                maptalk.editing_feature = null;
                                maptalk.mode="view";
                                maptalk.edit_type="";           
                                $("a.dropdown-toggle span").text("Mode: View");
                                $("ul.dropdown-menu li").removeClass("active");
                                $("a#modeview").parent("li").addClass("active");

                            }                            
                        }else{
                            // start editing...
                        }
                        

                    });
                    maptalk.features.push(polyline);
                }

                maptalk.sendMapChange({id:polyline.options.featureid, 
                                       type:"polyline"}, [e.latlng.lat, e.latlng.lng], "addition");

                map.addLayer(polyline);

            }
        }
    });

    map.on("moveend", function(e){
        talkback.pubsubSubscribe();
    });

    maptalk.init();

});

