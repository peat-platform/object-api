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
var zmq          = require('m2nodehandler');
var validator    = require('./validator.js');


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


var genPostMessage = function(msg, senderToDao, senderToClient, terminal_handler){

   var objectId = 'o_' + openiUtils.hash(msg.json)

   var dbName        = getCloudlet(msg.path) + '+' + objectId;
   var objectRestURL = "http://" + msg.headers.host + '/api/v1/objects/' + getCloudlet(msg.path) + '/' + objectId;

   validator.validateObject(msg.json._openi_type, msg.json._data, function(){

         msg.json._id = objectRestURL;

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
      },
      function(errorMessage){

         var resp = zmq.Response(zmq.status.BAD_REQUEST_400, zmq.header_json, errorMessage)

         senderToClient.send(msg.uuid, msg.connId, resp);
      }
   );

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