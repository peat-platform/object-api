/*
 * object_api
 * openi-ict.eu
 *
 * Copyright (c) 2013 dmccarthy
 * Licensed under the MIT license.
 */

'use strict';

var zmq    = require('m2nodehandler');
var helper = require('./helper.js');

var objectApi = function(config){

   helper.init(config.logger_params)

   var senderToDao = zmq.sender(config.dao_sink);

   zmq.receiver(config.mongrel_handler.source, config.mongrel_handler.sink, function(msg) {

      var dao_msg          = helper.processMongrel2Message(msg);
      dao_msg.mongrel_sink = config.mongrel_handler.sink

      console.log(dao_msg)

      senderToDao.send(dao_msg)
   });

}

module.exports = objectApi