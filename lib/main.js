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

   helper.init(params.logger_params)

   var daoPush = zmq.bindToPushQ({
      spec : params.dao_sub_q.spec
   });


   var mongPush = zmq.bindToMong2PubQ({
      spec : params.mongrel_sub_q.spec,
      id   : params.mongrel_sub_q.id
   });


   zmq.bindToPullQ({
      spec : params.data_api_sub_q.spec,
      id   : params.data_api_sub_q.id
   }, function(msg) {

      var response = helper.passThrough(msg)

      if (null != response) {
         mongPush.publish(msg.uuid, msg.connId, response)
      }

   });


   zmq.bindToMong2PullQ({
      spec : params.data_api_mong_sub_q.spec,
      id   : params.data_api_mong_sub_q.id
   }, function(msg) {

      var dao_msg = helper.processMongrel2Message(msg);

      daoPush.push(dao_msg)
   });

}


module.exports = dataApi