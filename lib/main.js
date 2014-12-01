/*
* object_api
* openi-ict.eu
*
* Copyright (c) 2013 dmccarthy
* Licensed under the MIT license.
*/

'use strict';

var attachmentsHelper = require('./attachmentHelper');
var helper            = require('./helper.js');
var path              = require('path');
var rrd               = require('openi_rrd');
var openiUtils        = require('openi-cloudlet-utils');
var jwt               = require('jsonwebtoken');
var zmq               = require('m2nodehandler');


if (undefined === global.appRoot){
   global.appRoot = path.resolve(__dirname);
}

zmq.setMongrel2UploadDir("/opt/openi/cloudlet_platform/" );

var objectApi = function(config){

   helper.init(config.logger_params);
   rrd.init("objects");
   zmq.addPreProcessFilter(rrd.filter);

   var senderToDao    = zmq.sender(config.dao_sink);
   var senderToClient = zmq.sender(config.mongrel_handler.sink);

   zmq.receiver(config.mongrel_handler.source, config.mongrel_handler.sink, function(msg) {

      if ( undefined === msg.headers.authorization ){
         senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, {"error":"Missing Auth token: " });
         return
      }

      var tokenB64 = msg.headers.authorization.replace("Bearer ", "");

      jwt.verify(tokenB64, config.trusted_security_framework_public_key, function(err, token) {

      if (undefined !== err && null !== err){
         senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, {"error":"Invalid token: " + err });
      }
      else {
         msg.token      = token;
         msg.cloudletId = openiUtils.getCloudletId(token);

         if (0 === msg.path.indexOf('/api/v1/attachments')){
            attachmentsHelper.processMongrel2Message(msg, senderToDao, senderToClient, config.mongrel_handler.sink);
         }
         else {
            helper.processMongrel2Message(msg, senderToDao, senderToClient, config.mongrel_handler.sink);
         }
         }
      });
   });
}


module.exports = objectApi;
