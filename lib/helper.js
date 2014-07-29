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


var genPostMessage = function(msg){

   console.log(msg.json)

   var objectId = 'o_' + openiUtils.hash(msg.json)
   console.log(objectId)
   var dbName        = getCloudlet(msg.path) + '+' + objectId;
   var objectRestURL = "http://" + msg.headers.host + '/api/v1/objects/' + getCloudlet(msg.path) + '/' + objectId;

   return {
      'dao_actions'      : [
         { 'action' : 'POST',   'database': dbName, 'object_name'  : objectId, 'object_data' : msg.json, 'object_rest' : objectRestURL }
      ],
      'mongrel_resp' : {'value':true, data : {'id':objectId}},
      'clients'      : [
         {'uuid' : msg.uuid, 'connId' : msg.connId }
      ]
   }
}


var genPutMessage = function(msg){

   var dbName = getCloudlet(msg.path) + '+' + getObject(  msg.path)

   return {
      'dao_actions'      : [
         { 'action'        : 'PUT',
            'database'     : dbName,
            'object_name'  : getObject(  msg.path),
            'revision'     : getRevision(msg.path),
            'object_data'  : msg.json
         }
      ],
      'mongrel_resp' : {'value':true},
      'clients'      : [
         {'uuid' : msg.uuid, 'connId' : msg.connId }
      ]
   }
}


var genGetMessage = function(msg){

   var dbName = getCloudlet(msg.path) + '+' + getObject(  msg.path)

   return {
      'dao_actions'      : [
         { 'action' : 'GET',   'database' : dbName, 'object_name'  : getObject(msg.path) }
      ],
      'mongrel_resp' : {'value':true},
      'clients'      : [
         {'uuid' : msg.uuid, 'connId' : msg.connId }
      ]
   }
}


var processMongrel2Message = function (msg) {

   this.logger.logMongrel2Message(msg)

   var dao_msg = null;

   switch(msg.headers['METHOD']){
   case 'POST':
      dao_msg = genPostMessage(msg)
      break;
   case 'GET':
      dao_msg = genGetMessage(msg)
      break;
   case 'PUT':
      dao_msg = genPutMessage(msg)
      break;
   default:
      break;
   }

   this.logger.log('debug', dao_msg)

   return dao_msg
}


module.exports.init                   = init
module.exports.getObject              = getObject
module.exports.processMongrel2Message = processMongrel2Message