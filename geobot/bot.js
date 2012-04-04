/**
 * Echo Component - the XMPP Hello World
 **/
var util = require('util');
var xmpp = require('node-xmpp');
var ps = require('./pubsub');
var argv = process.argv;

if (argv.length != 6) {
    util.puts('Usage: node echo_bot.js <my-jid> <my-password> <host> <port>');
    process.exit(1);
}

var cl = new xmpp.Component({ jid: argv[2],
			      password: argv[3],
			      host: argv[4],
			      port: argv[5] });

var pubsub =  new ps.PubSub(cl);

cl.on('online',
      function() {
          //cl.send(new xmpp.Element('presence'));
          console.log("online");
          cl.send(new xmpp.Element('message', {"to":"admin@talkback.im",
                          "from":argv[2],
                          "type":"chat"}).c("body").t("Bot online!"));
      });
cl.on('stanza',
      function(stanza) {
          console.log(stanza.toString());
          try{
              pubsub.handleStanza(stanza);
          }catch(e){
              console.log("error", e);
          }

      });
cl.on('error',
      function(e) {
          console.log("Error", e);
      });
