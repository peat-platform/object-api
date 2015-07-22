/*
* object_api
* peat-platform.org
*
* Copyright (c) 2013 dmccarthy
* Licensed under the MIT license.
*/

'use strict';

var helper            = require('./helper.js');
var path              = require('path');
var rrd               = require('peat-rrd');
var peatUtils        = require('cloudlet-utils');
var jwt               = require('jsonwebtoken');
var zmq               = require('m2nodehandler');
var rrd               = require('peat-rrd');


var objectApi = function(config){

   rrd.startAPI(config.monitoring);
   zmq.addPreProcessFilter(rrd.msgfilter);

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
            if (token){
               if ("session" === token["peat-token-type"]){
                  token["context"] = token["cloudlet"]
               }
               msg.token = token;
            }
            helper.processMongrel2Message(msg, senderToDao, senderToClient, config.mongrel_handler.sink);
         }
      });
   });
}


module.exports = objectApi;
