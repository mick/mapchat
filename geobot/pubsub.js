// This handles pubsub based on named nodes.

var xmpp = require('node-xmpp');

var PubSub = function(con){
    this.con = con;
    this.subscriptions= {};
    var that = this;
    this.handleStanza = function(stanza){

        if(stanza.attrs.type === 'error'){
            console.log("ERROR", stanza.toString());
        }

        if (stanza.is('iq') &&
            stanza.attrs.type !== 'error') {
            var from = stanza.attrs.from;
            var subscribe_el = stanza.getChild("pubsub").getChildren("subscribe");
            console.log(subscribe_el);
            if(subscribe_el.length > 0){
                console.log("subscribing");
                // we are dealing with a subscription.
                subscribe_el = subscribe_el[0];
                var node = subscribe_el.attrs.node;
                //var from = subscribe_el.attrs.jid;
                var fields = stanza.getChild("pubsub").getChild("options").getChild("x").getChildren("field");
                var options = {};
                for( f in fields){
                    values = fields[f].getChildren("value");
                    if(values.length >1){ 
                        options[fields[f].attrs['var'].replace("pubsub#", "")] = [];
                        for(v in values){
                            options[fields[f].attrs['var'].replace("pubsub#", "")].push(values[v].getText());
                        }
                    }else{
                        options[fields[f].attrs['var'].replace("pubsub#", "")] = values[0].getText().split(",");
                    }
                }
                that.doSubscribe(node, from, options);
            }
            var publish_el = stanza.getChild("pubsub").getChildren("publish");
            if(publish_el.length > 0){
                // a publish stanza!
                publish_el = publish_el[0];
                var node = publish_el.attrs.node;
                var changes = publish_el.getChild("item").getChildren("change");
                for(c in changes){
                    that.doPublish(node, changes[c], publish_el.getChild("item").attrs.id, from);
                }
            }
        }
    };

    this.doPublish = function(node, change, itemid, from){       
        // check if this matchs subs to that node, and geo        
        if(that.subscriptions[node] === undefined){
            return false;
        }


        var point = null;
        
        var addition = change.getChild("feature").getChildren("addition");
        if(addition.length > 0){
            point = addition[0].getChild("point").getChild("coordinates").getText().split(",");
        }
        var deletion = change.getChild("feature").getChildren("deletion");
        if(deletion.length > 0){
            point = deletion[0].getChild("point").getChild("coordinates").getText().split(",");
        }
        var alter = change.getChild("feature").getChildren("alter");
        if(alter.length > 0){
            point = alter[0].getChild("point").getChild("coordinates").getText().split(",");
        }

        var sub = {};
        for(l in that.subscriptions[node]){
            sub = that.subscriptions[node][l];
            if(from == sub.jid){continue;}

            if(point != null){
                
                if(that.contains(sub.bounds, point)){
                    console.log("send to "+sub.jid);
                    that.con.send(new xmpp.Element('message',
						                    { to: sub.jid,
						                      from: that.con.jid,
						                      id: "foo"}).
				                  c('event',{xmlns:"http://jabber.org/protocol/pubsub#event"}).
                                  c('items', {node:node}).
                                  c('item', {id:itemid}).
                                  cnode(change).up().up().up().up());
                }
            }
        }
    };

    this.doSubscribe = function(node, from, options){
        if(that.subscriptions[node] === undefined){
            that.subscriptions[node] = [];
        }
        var sub = that.doesSubExist(that.subscriptions[node], from);
        if(sub === null){
            sub = {jid:from, bounds:options["bounds"]};
            that.subscriptions[node].push(sub);
        }
        sub.bounds = options["bounds"];
        var el = new xmpp.Element('iq',
						          { to: from,
						            from: that.con.jid,
						            type: 'result'}).
			c('pubsub',{xmlns:"http://jabber.org/protocol/pubsub"}).
            c('subscription', {node:node,
                               jid:from,
                               subid:"something",
                               subscription:"subscribed"}).up().up().up();
        that.con.send(el);

        that.con.send(new xmpp.Element('message', {"to":"admin@talkback.im/",
                                                   "from":"geo.talkback.im",
                                                   "type":"chat"}).c("body").t("user subscribed"));
        
        console.log(that.subscriptions);
    };
    this.doesSubExist = function(list, jid){
        for(l in list){
            if(list[l].jid == jid){
                return list[l];
            }
        }
        return null;
    };
    this.contains = function(bbox, point){

        minlat = parseFloat(bbox[0]);
        minlon = parseFloat(bbox[1]);
        maxlat = parseFloat(bbox[2]);
        maxlon = parseFloat(bbox[3]);

        lat = parseFloat(point[0]);
        lon = parseFloat(point[1]);

        //correct wraping the world
        if(minlat > maxlat){
            maxlat+=180;
            lat+=180
        }
        if(minlon > maxlon){
            maxlon+=360;
            lon+=360
        }   

        if((minlat < lat) && (maxlat > lat)){
            if((minlon < lon) && (maxlon > lon)){
                // in the bbox
                return true;
            }   
        }
        return false;   
    }
};
    

exports.PubSub = PubSub;