/*
 * openi_data_api
 * openi-ict.eu
 *
 * Copyright (c) 2013 dmccarthy
 */

'use strict';

var openiLogger  = require('openi-logger');
var openiUtils   = require('openi-cloudlet-utils');
var zmq          = require('m2nodehandler');
var url          = require('url');
var validator    = require('./validator.js');
var filter       = require('./filter.js');


var init = function(logger_params){
   this.logger = openiLogger(logger_params);
};


var genPostMessage = function(msg, senderToDao, senderToClient, terminal_handler){

   var objectId   = openiUtils.generateUUID("object");
   var cloudletId = openiUtils.extractCloudletId(msg.path);

   var type = msg.json['@openi_type'];
   var dbName            = cloudletId + '+' + objectId;
   var objectRestURL     = "https://" + msg.headers.host + '/api/v1/objects/' + cloudletId + '/' + objectId;
   var typeRestURL       = "https://" + msg.headers.host + '/api/v1/types/' + type;


   if (!openiUtils.isTypeId(type)) {
      senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, {"error" : "Invalid format"});
      return;
   }

   validator.validateObject(cloudletId, msg.headers.host, typeRestURL, msg.json['@data'], function(){

         var obj = {
            '@id'             : objectId,
            '@location'       : objectRestURL,
            '@cloudlet'       : cloudletId,
            '@openi_type'     : msg.json['@openi_type'],
            '@type_location'  : "https://" + msg.headers.host + "/api/v1/types/" + type,
            '@data'           : msg.json['@data'],
            _date_created     : new Date().toJSON(),
            _date_modified    : new Date().toJSON()
         };

         senderToDao.send( {
            'dao_actions'      : [
               {
                  'action'       : 'POST',
                  'database'    : dbName,
                  'object_name' : objectId,
                  'object_data' : obj,
                  'id'          : objectId
               }
            ],
            'mongrel_sink' : terminal_handler,
            'clients'      : [
               {
                  'uuid' : msg.uuid,
                  'connId' : msg.connId
               }
            ]
         });
      },
      function(errorMessage){
         senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, errorMessage);
      });
};


var genPutMessage = function(msg, senderToDao, senderToClient, terminal_handler){

   var objectId   = openiUtils.extractObjectId(msg.path);
   var cloudletId = openiUtils.extractCloudletId(msg.path);
   //var property   = decodeURIComponent(msg.path.slice(msg.path.indexOf(objectId) + objectId.length + 1));

   var dbName = cloudletId + '+' + objectId;

//   if (null !==  property && property.length > 0){
//      putWithProperty(dbName, msg, objectId, property, terminal_handler)
//      return
//   }

   var type = msg.json['@openi_type'];

   if (undefined === type) {
      senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, {"error" : "Invalid format"});
      return;
   }


   var objectRestURL = "https://" + msg.headers.host + '/api/v1/objects/' + cloudletId + '/' +  objectId;

   validator.validateObject(cloudletId, msg.headers.host, msg.json['@openi_type'], msg.json['@data'], function(){

         var obj = {
            '@id'            : objectId,
            '@location'      : objectRestURL,
            '@cloudlet'      : cloudletId,
            '@openi_type'    : msg.json['@openi_type'],
            '@type_location' : "https://" + msg.headers.host + "/api/v1/types/" + type,
            '@data'          : msg.json['@data'],
            _date_created    : "",
            _date_modified   : new Date().toJSON()
         };

         senderToDao.send({
            'dao_actions'      : [
               {
                  'action'       : 'PUT',
                  'database'     : dbName,
                  'revision'     : msg.json['_revision'],
                  'object_data'  : obj,
                  'id'           : objectId
               }
            ],
            'mongrel_sink' : terminal_handler,
            'clients'      : [
               {
                  'uuid' : msg.uuid,
                  'connId' : msg.connId
               }
            ]
         });
      },
      function(errorMessage){
         senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, errorMessage);
      });
};


var genGetMessage = function(msg, senderToDao, senderToClient, terminal_handler){

   var url_parts   = url.parse(msg.headers.URI, true);
   var query       = url_parts.query;
   var cloudletId  = openiUtils.extractCloudletId(msg.path);
   var objectId    = openiUtils.extractObjectId(msg.path);
   var limit;
   var offset;
   var prev;
   var next;
   var meta;


   if (null === objectId){
      objectId = openiUtils.extractAttachmentId(msg.path);
   }

   if(null !== objectId) {

      var property  = decodeURIComponent(msg.path.slice(msg.path.indexOf(objectId) + objectId.length + 1));

      var dbName = cloudletId + '+' + objectId;

      senderToDao.send({
         'dao_actions'      : [
            {
               'action'    : 'GET',
               'database'  : dbName,
               'resolve'   : ('true' === query.resolve) ? true : false,
               'resp_type' : 'object',
               'property'  : property,
               'meta'      : query.meta
            }
         ],
         'mongrel_sink' : terminal_handler,
         'clients'      : [
            {
               'uuid' : msg.uuid,
               'connId' : msg.connId
            }
         ]
      });
   }
   else if ('/api/v1/search' === msg.path) {
      limit  = (undefined !== query.limit)  ? Number(query.limit)   : 30;
      offset = (undefined !== query.offset) ? Number(query.offset)  :  0;
      prev   = msg.headers.URI.replace("offset="+offset, "offset="+ (((offset - limit) < 0) ? 0 : (offset - limit)));
      next   = msg.headers.URI.replace("offset="+offset, "offset="+ (offset + limit));

      meta = {
         "limit"       : limit,
         "offset"      : offset,
         "total_count" : 0,
         "prev"        : (0 === offset)? null : prev,
         "next"        : next
      };
      filter.filter(msg, meta, senderToClient);
   }
   else {

      limit  = (undefined !== query.limit)  ? Number(query.limit)   : 30;
      offset = (undefined !== query.offset) ? Number(query.offset)  :  0;
      prev   = msg.headers.URI.replace("offset="+offset, "offset="+ (((offset - limit) < 0) ? 0 : (offset - limit)));
      next   = msg.headers.URI.replace("offset="+offset, "offset="+ (offset + limit));

      meta = {
         "limit"       : limit,
         "offset"      : offset,
         "total_count" : 0,
         "prev"        : (0 === offset)? null : prev,
         "next"        : next
      };

      cloudletId = openiUtils.extractCloudletId(msg.path);

      //TODO: Dodgy logic?
      if(undefined !== query.property_filter || undefined !== query.with_property){
         filter.filter(msg, meta, senderToClient, cloudletId);
         return;
      }


      var key      = cloudletId;
      var viewName = 'object_by_cloudlet_id';

      if (undefined !== query.type) {
         viewName = 'object_by_type';
         key      = cloudletId + '+' + query.type;
      }

      if (undefined !== query.only_show_properties) {
         query.only_show_properties = query.only_show_properties.split(',');
      }


      senderToDao.send({
         'dao_actions'      : [
            {
               'action'       : 'VIEW',
               'key'         : key ,
               'design_doc'  : 'objects_views',
               'view_name'   : viewName,
               'meta'        : meta,
               'filter_show' : query.only_show_properties,
               'resp_type'   : 'object',
               'cloudlet'    : cloudletId,
               'id_only'     : ('true' === query.id_only)
            }
         ],
         'mongrel_sink' : terminal_handler,
         'clients'      : [
            {
               'uuid' : msg.uuid,
               'connId' : msg.connId
            }
         ]
      });
   }
};


var genDeleteMessage = function(msg, senderToDao, senderToClient, terminal_handler){

   var cloudletId = openiUtils.extractCloudletId(msg.path);
   var objectId   = openiUtils.extractObjectId(msg.path);

   var dbName = cloudletId + '+' + objectId;

   senderToDao.send({
      'dao_actions'      : [
         {
            'action' : 'DELETE',
            'database' : dbName
         }
      ],
      'mongrel_sink' : terminal_handler,
      'clients'      : [
         {
            'uuid' : msg.uuid,
            'connId' : msg.connId
         }
      ]
   });
};


var processMongrel2Message = function (msg, senderToDao, senderToClient, terminal_handler) {

   this.logger.logMongrel2Message(msg);

   //Deletes null variables
   for(var key in msg.json) {
      if(msg.json[key] === null) {
         delete msg.json[key];
      }
   }

   switch(msg.headers['METHOD']) {
   case 'POST':
      genPostMessage(msg, senderToDao, senderToClient, terminal_handler);
      break;
   case 'GET':
      genGetMessage(msg, senderToDao, senderToClient, terminal_handler);
      break;
   case 'PUT':
      genPutMessage(msg, senderToDao, senderToClient, terminal_handler);
      break;
   case 'DELETE':
      genDeleteMessage(msg, senderToDao, senderToClient, terminal_handler);
      break;
   default:
      break;
   }
};


module.exports.init                   = init;
module.exports.processMongrel2Message = processMongrel2Message;
