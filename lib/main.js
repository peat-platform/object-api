/*
 * openi_data_api
 * openi-ict.eu
 *
 * Copyright (c) 2013 dmccarthy
 * Licensed under the MIT license.
 */

'use strict';

var zmq = require('m2nodehandler');
var dbc = require('dbc');

var daoPush  = zmq.bindToPushQ    ({spec:'tcp://127.0.0.1:49994'});
var mongPush = zmq.bindToMong2PubQ({spec:'tcp://127.0.0.1:49996', id:'data_api_conn'});



zmq.bindToPullQ( {spec:'tcp://127.0.0.1:49995', id:'dao'}, function( msg ) {

   dbc.assert   (null !== msg, 'Message cannot be null')
   dbc.hasMember(msg, 'action')
   dbc.hasMember(msg, 'uuid'  )
   dbc.hasMember(msg, 'connId')

   if(msg.action){
      var response  = zmq.Response(zmq.status.OK_200, zmq.header_json, msg)
      mongPush.publish(msg.uuid, msg.connId, response)
   }

});


var getAction = function(path){
   //var parts = path.split('/')
   path = path.toLowerCase()


   if (path.indexOf('get') !== -1){
      return 'GET'
   }
   else if (path.indexOf('put') !== -1){
      return 'PUT'
   }
   else if (path.indexOf('echo') !== -1){
      return 'ECHO'
   }
   return null
}


var getName = function(path){
   var parts = path.split('/')
   console.log("Parts:\t"+parts)
   if (parts.length >= 3){
      return parts[3]
   }
   return null
}


zmq.bindToMong2PullQ({spec:'tcp://127.0.0.1:49997', id:'test' }, function(msg) {

   //console.log(msg.headers['METHOD']);
   console.log('Headers: ' + msg.headers);
   for (var i in msg.headers ){
      if (msg.hasOwnProperty(i)){
         console.log('\t' + i + ' :' + msg.headers[i]);
      }
   }
   console.log('UUID   : ' + msg.uuid);
   console.log('CONNID : ' + msg.connId);
   console.log('Path   : ' + msg.path);
   console.log('Body   : ' + msg.body);
   console.log('JSON   : ' + msg.json);

   var dao_msg = {
      uuid   : msg.uuid,
      connId : msg.connId,
      //action : getAction(msg.path),
      action : getAction(msg.headers['METHOD']),
      name   : getName  (msg.path),
      data   : msg.json
   }


   daoPush.push(dao_msg)
});

module.exports.getAction        = getAction
module.exports.getName          = getName