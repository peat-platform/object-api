/*
 * openi_data_api
 * openi-ict.eu
 *
 * Copyright (c) 2013 dmccarthy
 * Licensed under the MIT license.
 */

'use strict';

var zmq          = require('m2nodehandler');
var dbc          = require('dbc')
var openiLogger  = require('openi-logger')


var init = function(logger_params){
   this.logger = openiLogger(logger_params);
}


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


var getObject = function (path) {

   var parts   = path.split('/')
   var namePos = 4;

   return parts[namePos]

}


var getCloudlet = function (path) {

   var parts   = path.split('/')
   var cletPos = 3;

   return parts[cletPos];

}


var processMongrel2Message = function (msg) {

   this.logger.logMongrel2Message(msg)

   var dao_msg = {
      uuid         : msg.uuid,
      connId       : msg.connId,
      action       : getAction  (msg.headers['METHOD']),
      cloudlet     : getCloudlet(msg.path),
      object_name  : getObject  (msg.path),
      query        : msg.headers['QUERY'],
      object_data  : msg.json
   }

   console.log(typeof dao_msg.object_data)
   console.log(typeof msg.json)

   this.logger.log('debug', dao_msg)

   return dao_msg
}


module.exports.init                   = init
module.exports.getAction              = getAction
module.exports.getObject              = getObject
module.exports.passThrough            = passThrough
module.exports.processMongrel2Message = processMongrel2Message