/*
 * peat_data_api
 * peat-platform.org
 *
 * Copyright (c) 2013 dmccarthy
 */

'use strict';

var peatLogger  = require('peat-logger');
var peatUtils   = require('cloudlet-utils');
var zmq          = require('m2nodehandler');
var url          = require('url');
var validator    = require('./validator.js');
var filter       = require('./n1ql-filter');
var rrd          = require('peat-rrd');
var util         = require('util');
var loglet       = require('loglet');
loglet           = loglet.child({component: 'object-api'});
var async        = require('async');
var _            = require('lodash');


var init = function(logger_params, tracklet_config){
   tracklet.config(tracklet_config);
};


var genPostMessage = function(msg, senderToDao, senderToClient, terminal_handler){

   var objectId    = peatUtils.generateUUID("object");
   var cloudletId  = peatUtils.extractCloudletId(msg.path);
   var third_party = msg.token.context;

   cloudletId = (null === cloudletId) ? msg.token.cloudlet : cloudletId;

   if (!peatUtils.isCloudletId(cloudletId)){
         senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, {"error":"Invalid Cloudlet id" });
   }
   else if (null === msg.json || undefined == msg.json){
      senderToClient.send(msg.uuid, msg.connId, zmq.status.ERROR, zmq.standard_headers.json, {"error":"Empty message body" });
      return
   }

   var type              = msg.json['@type'];
   var dbName            = cloudletId + '+' + objectId;
   var objectRestURL     = '/api/v1/objects/' + cloudletId + '/' + objectId;
   var typeLocation      = '/api/v1/types/' + type;


   if (!peatUtils.isTypeId(type)) {
      senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, {"error" : "Invalid format"});
      return;
   }

   validator.validateObject(cloudletId, msg.headers.host, msg.headers, typeLocation, msg.json['@data'], function(){

         var obj = {
            '@id'             : objectId,
            '@location'       : objectRestURL,
            '@cloudlet'       : cloudletId,
            '@type'           : msg.json['@type'],
            '@type_location'  : typeLocation,
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
                  'id'          : objectId,
                  'cloudlet_id' : cloudletId,
                  'api_key'     : msg.token.client_id,
                  'third_party' : third_party,
                  'bucket'      : 'objects'
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

   var objectId    = peatUtils.extractObjectId(msg.path);
   var cloudletId  = peatUtils.extractCloudletId(msg.path);
   var third_party = msg.token.context;
   var property   = decodeURIComponent(msg.path.slice(msg.path.indexOf(objectId) + objectId.length + 1));

   if (null === cloudletId){
      cloudletId = msg.token.cloudlet
   }

   var dbName = cloudletId + '+' + objectId;

//   if (null !==  property && property.length > 0){
//      putWithProperty(dbName, msg, objectId, property, terminal_handler)
//      return
//   }

   var type           = msg.json['@type'];
   var typeLocation   = '/api/v1/types/' + type;

   if (null === msg.json || undefined === msg.json['@type'] || undefined === msg.json['@data'] || undefined === msg.json['_revision']) {
      senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, {"error" : "Invalid format"});
      return;
   }
   else if (undefined === msg.json['_revision'] || null === msg.json['_revision'] || "" === msg.json['_revision']) {
      senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, {"error" : "Required '_revision' property is missing"});
      return;
   }

   var objectRestURL = '/api/v1/objects/' + cloudletId + '/' +  objectId;

   validator.validateObject(cloudletId, msg.headers.host, msg.headers, typeLocation, msg.json['@data'], function(){

         var obj = {
            '@id'            : objectId,
            '@location'      : objectRestURL,
            '@cloudlet'      : cloudletId,
            '@type'          : msg.json['@type'],
            '@type_location' : "/api/v1/types/" + type,
            '@data'          : msg.json['@data'],
            _date_created    : "",
            'api_key'        : msg.token.client_id,
            'third_party'    : third_party,
            _date_modified   : new Date().toJSON()
         };

         senderToDao.send({
            'dao_actions'      : [
               {
                  'action'       : 'PUT',
                  'database'     : dbName,
                  'revision'     : msg.json['_revision'],
                  'object_data'  : obj,
                  'id'           : objectId,
                  'bucket'      : 'objects'
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
   var cloudletId  = peatUtils.extractCloudletId(msg.path);
   var objectId    = peatUtils.extractObjectId(msg.path);
   var third_party = (undefined === msg.token.client_id)         ? msg.token.context : msg.token.client_id ;

   if (null === objectId){
      objectId = peatUtils.extractAttachmentId(msg.path);
   }

   if (null === cloudletId){
      cloudletId = msg.token.cloudlet
   }

   if (!peatUtils.isCloudletId(cloudletId)){
      senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, {"error":"Invalid Cloudlet id" });
   }

   if(null !== objectId) {
      if ( !peatUtils.isAttachmentId(objectId) && !peatUtils.isObjectId(objectId) ){
         senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, {"error":"Invalid Object id" });
      }

      var property  = decodeURIComponent(msg.path.slice(msg.path.indexOf(objectId) + objectId.length + 1));

      var dbName = cloudletId + '+' + objectId;

      if (query.resolve === true) {
         rrd.monitorIncrement('object_get_resolve')
      }

      senderToDao.send({
         'dao_actions'      : [
            {
               'action'      : 'GET',
               'database'    : dbName,
               'resolve'     : ('true' === query.resolve),
               'resp_type'   : 'object',
               'property'    : property,
               'meta'        : query.meta,
               'api_key'     : msg.token.client_id,
               'third_party' : third_party,
               'bucket'      : 'objects',
               'client_name' :  msg.token.client_name,
               'third_party_cloudlet' :  msg.token.context,
               'headers'     : {
                  'x-forwarded-for' : msg.headers['x-forwarded-for'],
                  'REMOTE_ADDR'     : msg.headers['REMOTE_ADDR']
               }
            }
         ],
         'mongrel_sink' : terminal_handler,
         'clients'      : [
            {
               'uuid'   : msg.uuid,
               'connId' : msg.connId
            }
         ]
      });

   }
   else {
      var limit       = (undefined !== query.limit ) ? Number(query.limit)   : 30;
      var offset      = (undefined !== query.offset) ? Number(query.offset)  :  0;
      var order       = (undefined !== query.order ) ? query.order           : "ascending";
      var prev        = msg.headers.URI.replace("offset="+offset, "offset="+ (((offset - limit) < 0) ? 0 : (offset - limit)));
      var next        = msg.headers.URI.replace("offset="+offset, "offset="+ (offset + limit));

      if (-1 === next.indexOf("offset=")){
         next = msg.headers.URI + "&offset="+ (offset + limit)
      }

      var meta = {
         "limit"       : limit,
         "offset"      : offset,
         "total_count" : 0,
         "prev"        : (0 === offset)? null : prev,
         "next"        : next
      };


      if(undefined !== query.property_filter || undefined !== query.with_property){
         //TODO: Add support for order
         filter.filter(msg, meta, senderToDao, third_party, cloudletId, terminal_handler, query);
         return;
      }

      //var startKey      = [third_party];
      //var endKey        = [third_party + '\uefff'];
      var startKey      = [third_party, cloudletId];
      var endKey        = [third_party, cloudletId + '\uefff'];
      var viewName      = 'object_by_cloudlet_id';


      if ( msg.token['peat-token-type'] === 'session' && startKey[0] === startKey[1]){
         var startKey      = [third_party];
         var endKey        = [third_party + '\uefff'];
      }

      var resp_type = 'object';

      if (undefined !== query.type) {

         if (!peatUtils.isTypeId(query.type)){
            senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, {"error": "invalid type id format"});
            return;
         }

         viewName = 'object_by_type';
         startKey = [third_party, query.type, cloudletId];
         endKey   = [third_party, query.type, cloudletId + '\uefff' ];


         if ( msg.token['peat-token-type'] === 'session' && startKey[0] === startKey[2]){
            var startKey      = [third_party, query.type];
            var endKey        = [third_party, query.type + '\uefff'];
         }
      }

      if (undefined !==  query.alltypes) {
         viewName = 'object_by_type';
         startKey = [third_party];
         endKey   = [third_party + '\uefff' ];
         resp_type = 'mapreduce'
      }

      if (undefined !==  query.alltypescloudlet) {
         viewName = 'object_by_type';
         startKey = [third_party];
         endKey   = [third_party + '\uefff' ];
         resp_type = 'mapreduce'
      }


      if (undefined !== query.only_show_properties) {
         query.only_show_properties = query.only_show_properties.split(',');
      }

      if (query.id_only === true) {
         rrd.monitorIncrement('object_get_id_only')
      }


      senderToDao.send({
         'dao_actions'      : [
            {
               'action'      : 'VIEW',
               'start_key'   : startKey ,
               'end_key'     : endKey ,
               'design_doc'  : 'objects_views',
               'view_name'   : viewName,
               'meta'        : meta,
               'filter_show' : query.only_show_properties,
               'resp_type'   : resp_type,
               'cloudlet'    : cloudletId,
               'third_party' : third_party,
               'api_key'     : msg.token.client_id,
               'order'       : order,
               'id_only'     : ('true' === query.id_only),
               'bucket'      : 'objects',
               'group_level' : query.group_level,
               'reduce'      : (query.group_level !== undefined),
               'third_party_cloudlet' :  msg.token.context,
               'client_name' :  msg.token.client_name,
               'headers'     : {
                  'x-forwarded-for' : msg.headers['x-forwarded-for'],
                  'REMOTE_ADDR'     : msg.headers['REMOTE_ADDR']
               }
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

   var cloudletId  = peatUtils.extractCloudletId(msg.path);
   var objectId    = peatUtils.extractObjectId(msg.path);
   var third_party = msg.token.context;

   if (null === cloudletId){
      cloudletId = msg.token.cloudlet
   }

   var dbName = cloudletId + '+' + objectId;

   senderToDao.send({
      'dao_actions'      : [
         {
            'action'      : 'DELETE',
            'database'    : dbName,
            'bucket'      : 'objects',
            'api_key'     : msg.token.client_id,
            'third_party' : third_party
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


module.exports.processMongrel2Message = processMongrel2Message;
