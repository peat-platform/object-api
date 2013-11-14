/*
 * openi_data_api
 * openi-ict.eu
 *
 * Copyright (c) 2013 dmccarthy
 * Licensed under the MIT license.
 */

'use strict';

var zmq = require('m2nodehandler');
var dbc = require('dbc')

var logger_params = {
   'path'     : '/opt/openi/cloudlet_platform/logs/data_api',
   'log_level': 'debug',
   'as_json'  : false
}

var logger = require('openi-logger')(logger_params)


var passThrough = function (msg) {

   dbc.assert(null !== msg, 'Message cannot be null')
   dbc.hasMember(msg, 'action')
   dbc.hasMember(msg, 'uuid')
   dbc.hasMember(msg, 'connId')

   if (msg.action) {
      return zmq.Response(zmq.status.OK_200, zmq.header_json, msg)
   }
   return null
}


var getAction = function(method) {

   method  = method.toLowerCase()
   var res = null;

   switch(method){
   case 'post':
      res = 'PUT'
      break
   case 'put':
      res = 'PUT'
      break;
   case 'get':
      res = 'GET'
      break
   }


   return res
}


var getName = function (path) {
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

   switch(parts.length) {
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


var processMongrel2Message = function (msg) {

   logger.logMongrel2Message(msg)

   var dao_msg = {
      uuid  : msg.uuid,
      connId: msg.connId,
      action: getAction(msg.headers['METHOD']),
      name  : getName(msg.path),
      query : msg.headers['QUERY'],
      data  : msg.json
   }

   logger.log('debug', dao_msg)

   return dao_msg
}

module.exports.getAction              = getAction
module.exports.getName                = getName
module.exports.passThrough            = passThrough
module.exports.processMongrel2Message = processMongrel2Message