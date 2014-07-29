/*
 * openi_data_api
 * openi-ict.eu
 *
 * Copyright (c) 2013 dmccarthy
 * Licensed under the MIT license.
 */

'use strict';

var openiLogger  = require('openi-logger')
var openiUtils   = require('openi-cloudlet-utils')
var http         = require('http')


var init = function(logger_params){
   this.logger = openiLogger(logger_params);
}


var getCloudlet = function (path) {

   var parts   = path.split('/')
   var cletPos = 4;

   return parts[cletPos];

}


var getObject = function (path) {

   var parts   = path.split('/')
   var namePos = 5;

   return parts[namePos]

}

var getRevision = function (path) {

   var parts   = path.split('/')
   var namePos = 6;

   return parts[namePos]

}


var validateObjectToType = function(obj, senderToClient, callback){


   http.get(obj.json.openi_type, function(res) {

      var str = '';

      //another chunk of data has been recieved, so append it to `str`
      res.on('data', function (chunk) {
         str += chunk;
      });

      //the whole response has been recieved, so we just print it out here
      res.on('end', function () {

         console.log(str)
         var type = JSON.parse(str);
         console.log(type)
         console.log(type.object)
         console.log(obj.json.data)

         console.log("¢¢¢¢¢¢¢¢¢")
         for (var member in type.object){
            var value = type.object[member]

            console.log("^^" + member)
            console.log("==" + value)
            console.log("--" + JSON.stringify(obj.json) )
            console.log("**" + obj.json.data[member])
         }
         console.log();
         console.log("¢¢¢¢¢¢¢¢¢")

         //validate that it has member
         //validate that it doesn't have extra
         //validate that the members are of apt type

         callback()
      });




   }).on('error', function(e) {
      senderToClient.send(obj.uuid, obj.connId, {'error' : e.message});
   });

   obj.openi_type

   console.log("----------")
   console.log(obj)
   console.log("----------")


}


var genPostMessage = function(msg, senderToDao, senderToClient, terminal_handler){


   var objectId = 'o_' + openiUtils.hash(msg.json)

   var dbName        = getCloudlet(msg.path) + '+' + objectId;
   var objectRestURL = "http://" + msg.headers.host + '/api/v1/objects/' + getCloudlet(msg.path) + '/' + objectId;


   validateObjectToType(msg, senderToClient, function(){
      senderToDao.send( {
         'dao_actions'      : [
            { 'action'       : 'POST',
               'database'    : dbName,
               'object_name' : objectId,
               'object_data' : msg.json,
               'rest_uuid'   : objectRestURL }
         ],
         'mongrel_sink' : terminal_handler,
         'clients'      : [
            {'uuid' : msg.uuid, 'connId' : msg.connId }
         ]
      });
   })


}


var genPutMessage = function(msg, senderToDao, senderToClient, terminal_handler){


   var objectId    = getObject(  msg.path)
   var newObjectId = 'o_' + openiUtils.hash(msg.json)

   if (objectId === newObjectId){

      var message = { 'error' : true, 'message' : 'Object has not been altered.'};
      var resp    = new zmq.Response(zmq.status.BAD_REQUEST_400, zmq.header_json, message)
      error.send(msg.uuid, msg.connId, resp)

      return
   }

   var dbName = getCloudlet(msg.path) + '+' + getObject(  msg.path)
   var objectRestURL = "http://" + msg.headers.host + '/api/v1/objects/' + getCloudlet(msg.path) + '/' +  objectId;

   senderToDao.send({
      'dao_actions'      : [
         { 'action'        : 'PUT',
            'database'     : dbName,
            'revision'     : getRevision(msg.path),
            'object_data'  : msg.json,
            'rest_uuid'   : objectRestURL
         }
      ],
      'mongrel_sink' : terminal_handler,
      'clients'      : [
         {'uuid' : msg.uuid, 'connId' : msg.connId }
      ]
   })
}


var genGetMessage = function(msg, senderToDao, senderToClient, terminal_handler){

   var dbName = getCloudlet(msg.path) + '+' + getObject(  msg.path)

   senderToDao.send({
      'dao_actions'      : [
         { 'action' : 'GET',   'database' : dbName }
      ],
      'mongrel_sink' : terminal_handler,
      'clients'      : [
         {'uuid' : msg.uuid, 'connId' : msg.connId }
      ]
   });

}


var processMongrel2Message = function (msg, senderToDao, senderToClient, terminal_handler) {

   this.logger.logMongrel2Message(msg)

   switch(msg.headers['METHOD']){
   case 'POST':
      genPostMessage(msg, senderToDao, senderToClient, terminal_handler)
      break;
   case 'GET':
      genGetMessage(msg, senderToDao, senderToClient, terminal_handler)
      break;
   case 'PUT':
      genPutMessage(msg, senderToDao, senderToClient, terminal_handler)
      break;
   default:
      break;
   }

}


module.exports.init                   = init
module.exports.getObject              = getObject
module.exports.processMongrel2Message = processMongrel2Message