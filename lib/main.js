/*
 * openi_data_api
 * openi-ict.eu
 *
 * Copyright (c) 2013 dmccarthy
 * Licensed under the MIT license.
 */

'use strict';

var zmq    = require('m2nodehandler');
var helper = require('./helper.js');

var dataApi = function(params){

   var daoPush = zmq.bindToPushQ({
      spec: params.dao_in_q.spec
   });


   var mongPush = zmq.bindToMong2PubQ({
      spec: params.mong_in_q.spec,
      id  : params.mong_in_q.id
   });


   zmq.bindToPullQ({
      spec: params.dao_out_q.spec,
      id  : params.dao_out_q.id
   }, function(msg) {

      var response = helper.passThrough(msg)

      if (null != response) {
         mongPush.publish(msg.uuid, msg.connId, response)
      }

   });


   zmq.bindToMong2PullQ({
      spec: params.mong_out_q.spec,
      id  : params.mong_out_q.id
   }, function(msg) {

      var dao_msg = helper.processMongrel2Message(msg);

      daoPush.push(dao_msg)
   });

}


module.exports = dataApi