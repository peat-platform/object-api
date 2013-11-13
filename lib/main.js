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

var daoPush = zmq.bindToPushQ({
   spec: 'tcp://127.0.0.1:49994'
});
var mongPush = zmq.bindToMong2PubQ({
   spec: 'tcp://127.0.0.1:49996',
   id: 'data_api_conn'
});



zmq.bindToPullQ({
   spec: 'tcp://127.0.0.1:49995',
   id: 'dao'
}, function(msg) {

   dbc.assert(null !== msg, 'Message cannot be null')
   dbc.hasMember(msg, 'action')
   dbc.hasMember(msg, 'uuid')
   dbc.hasMember(msg, 'connId')

   if (msg.action) {
      var response = zmq.Response(zmq.status.OK_200, zmq.header_json, msg)
      mongPush.publish(msg.uuid, msg.connId, response)
   }

});


var getAction = function(path) {
   //var parts = path.split('/')

   path = path.toLowerCase()

   if (path.indexOf('get') !== -1) {
      return 'GET'
   } else if (path.indexOf('post') !== -1) {
      return 'POST'
   }
   // echlse if (path.indexOf('echo') != -1){
   //    return "ECHO"
   // }

   return null
}


var getName = function(path) {
   var parts = path.split('/')
   var resolvedPath = null
   //console.log('Parts:\t' + parts)
   /**
    * parts[0]  =  [blank]
    * parts[1]  =  "data"      : "value", Root path defined by Mongrel
    * parts[2]  =  "v1"        : "value", API Version
    * parts[3]  =  "data"      : "value", required by Documentation
    * parts[4]  =  cloutled_x  : ID of cloudlet to be accessed
    * parts[5]  =  object_id_x : Object to be returned from cloudlet_x
    **/

   switch (parts.length) {
      //Whole cloudlet
   case 5:
      resolvedPath = [parts[3], parts[4]]
      break

         //single Object
   case 6:
      resolvedPath = [parts[3], parts[4], parts[5]]
      break

         //Single Variable within Object OR Type Search
   case 7:
      resolvedPath = [parts[3], parts[4], parts[5], parts[6]]
      break

   default:
      resolvedPath = null
      break

   }
   return resolvedPath

}


zmq.bindToMong2PullQ({
   spec: 'tcp://127.0.0.1:49997',
   id: 'test'
}, function(msg) {

   //console.log(msg.headers['METHOD']);
   console.log('Headers: ' + msg.headers);
   for (var i in msg.headers) {
      if (i !== null) {
         console.log('\t' + i + ' :' + msg.headers[i]);
      }
   }
   console.log('UUID   : ' + msg.uuid);
   console.log('CONNID : ' + msg.connId);
   console.log('Path   : ' + msg.path);
   console.log('Body   : ' + msg.body);
   console.log('JSON   : ' + msg.json);

   var dao_msg = {
      uuid: msg.uuid,
      connId: msg.connId,
      //action : getAction(msg.path),
      action: getAction(msg.headers['METHOD']),
      name: getName(msg.path),
      query: msg.headers['QUERY'],
      data: msg.json
   }


   daoPush.push(dao_msg)
});

module.exports.getAction = getAction
module.exports.getName = getName