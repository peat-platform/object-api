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
var url          = require('url');
var validator    = require('./validator.js');
var path         = require('path')
var filter       = require('./filter.js')


var init = function(logger_params){
   if (undefined === global.appRoot){
      global.appRoot = path.resolve(__dirname);
   }
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

   var objectId   = 'o_' + openiUtils.hash(msg.json)
   var cloudletId = getCloudlet(msg.path)

   var dbName            = getCloudlet(msg.path) + '+' + objectId;
   var objectRestURL     = "https://" + msg.headers.host + '/api/v1/objects/' + cloudletId + '/' + objectId;

   var type = msg.json['@openi_type'];

   if (undefined === type){
      var resp = zmq.Response(zmq.status.BAD_REQUEST_400, zmq.header_json, {"error" : "Invalid format"})

      senderToClient.send(msg.uuid, msg.connId, resp);
      return
   }

   if(type.indexOf("t_") === 0) msg.json['@openi_type'] = "https://" + msg.headers.host + "/api/v1/types/" + type;

   validator.validateObject(msg.json['@openi_type'], msg.json['@data'], function(){

         var obj = {
            '@id'          : objectId,
            '@location'    : objectRestURL,
            '@cloudlet'    : cloudletId,
            '@openi_type'  : msg.json['@openi_type'],
            '@data'        : msg.json['@data'],
            _date_created  : new Date().toJSON(),
            _date_modified : new Date().toJSON()
         }

         senderToDao.send( {
            'dao_actions'      : [
               { 'action'       : 'POST',
                  'database'    : dbName,
                  'object_name' : objectId,
                  'object_data' : obj,
                  'id'          : objectId }
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
   var cloudletId  = getCloudlet(msg.path)
   var newObjectId = 'o_' + openiUtils.hash(msg.json)

   if (objectId === newObjectId){

      var message = { 'error' : true, 'message' : 'Object has not been altered.'};
      var resp    = new zmq.Response(zmq.status.BAD_REQUEST_400, zmq.header_json, message)
      error.send(msg.uuid, msg.connId, resp)

      return
   }

   var dbName = getCloudlet(msg.path) + '+' + getObject(  msg.path)
   var type = msg.json['@openi_type'];

   if (undefined === type){
      var resp = zmq.Response(zmq.status.BAD_REQUEST_400, zmq.header_json, {"error" : "Invalid format"})

      senderToClient.send(msg.uuid, msg.connId, resp);
      return
   }

   if(type.indexOf("t_") === 0) {
      msg.json['@openi_type'] = "https://" + msg.headers.host + "/api/v1/types/" + type;
   }

   var objectRestURL = "https://" + msg.headers.host + '/api/v1/objects/' + getCloudlet(msg.path) + '/' +  objectId;

   validator.validateObject(msg.json['@openi_type'], msg.json['@data'], function(){

         var obj = {
            '@id'          : objectId,
            '@location'    : objectRestURL,
            '@cloudlet'    : cloudletId,
            '@openi_type'  : msg.json['@openi_type'],
            '@data'        : msg.json['@data'],
            _date_created  : new Date().toJSON(),
            _date_modified : new Date().toJSON()
         }

         senderToDao.send({
            'dao_actions'      : [
               {
                  'action'       : 'PUT',
                  'database'     : dbName,
                  'revision'     : getRevision(msg.path),
                  'object_data'  : obj,
                  'id'           : objectId
               }
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


var genGetMessage = function(msg, senderToDao, senderToClient, terminal_handler){

   var hasObjectId = (typeof getObject(msg.path) !== 'undefined');

   if(hasObjectId) {
      var dbName = getCloudlet(msg.path) + '+' + getObject(msg.path)

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
   else if ('/api/v1/search' === msg.path){
      filter.filter(msg, senderToClient)
   }
   else{

      var url_parts = url.parse(msg.headers.URI, true);
      var query     = url_parts.query;

      var cloudletId = getCloudlet(msg.path)

      if(undefined !== query.property_filter || undefined !== query.with_property){
         filter.filter(msg, senderToClient, cloudletId)
         return
      }

      if ('true' === query.id_only ){
         cloudletId = cloudletId + '_id'
      }

      var key      = cloudletId;
      var viewName = 'object_by_cloudlet_id';


      if (undefined !== query.type){
         viewName = 'object_by_type';
         key      = cloudletId + '+' + query.type;
      }

      if (undefined !== query.only_show_properties){
         query.only_show_properties = query.only_show_properties.split(',')
      }

      senderToDao.send({
         'dao_actions'      : [
            {
               'action'       : 'VIEW',
               'key'         : key ,
               'design_doc'  : 'objects_views',
               'view_name'   : viewName,
               'count'       : Number(query.limit),
               'skip'        : Number(query.skip),
               'filter_show' : query.only_show_properties,
               'resp_type'   : 'object'
            }
         ],
         'mongrel_sink' : terminal_handler,
         'clients'      : [
            {'uuid' : msg.uuid, 'connId' : msg.connId }
         ]
      });
   }

}


var genDeleteMessage = function(msg, senderToDao, senderToClient, terminal_handler){

   var dbName = getCloudlet(msg.path) + '+' + getObject(  msg.path)

   senderToDao.send({
      'dao_actions'      : [
         { 'action' : 'DELETE',   'database' : dbName }
      ],
      'mongrel_sink' : terminal_handler,
      'clients'      : [
         {'uuid' : msg.uuid, 'connId' : msg.connId }
      ]
   });

}


var processMongrel2Message = function (msg, senderToDao, senderToClient, terminal_handler) {

   this.logger.logMongrel2Message(msg)

   //Deletes null variables
   for(var key in msg.json){
      if(msg.json[key] === null){
         delete msg.json[key];
      }
   }

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
   case 'DELETE':
      genDeleteMessage(msg, senderToDao, senderToClient, terminal_handler)
      break;
   default:
      break;
   }

}


module.exports.init                   = init
module.exports.getObject              = getObject
module.exports.processMongrel2Message = processMongrel2Message