/*
 * openi_data_api
 * openi-ict.eu
 *
 * Copyright (c) 2013 dmccarthy
 */

'use strict';

var openiUtils   = require('openi-cloudlet-utils');
var zmq          = require('m2nodehandler');
var url          = require('url');
var validator    = require('./validator.js');
var filter       = require('./n1ql-filter');
var rrd          = require('openi_rrd');
var util         = require('util');
var tracklet     = require('tracklet');
var loglet       = require('loglet');
loglet           = loglet.child({component: 'object-api'});
var async        = require('async');
var _            = require('lodash');
var couchbase    = require('couchbase');
var cluster      = new couchbase.Cluster('couchbase://127.0.0.1');
var userBucket   = cluster.openBucket('users');
var objectBucket = cluster.openBucket('objects');
var typeBucket   = cluster.openBucket('types');
var ViewQuery    = couchbase.ViewQuery;


var init = function(logger_params, tracklet_config){
   tracklet.config(tracklet_config);
};


var genPostMessage = function(msg, senderToDao, senderToClient, terminal_handler){

   var objectId    = openiUtils.generateUUID("object");
   var cloudletId  = openiUtils.extractCloudletId(msg.path);
   var third_party = msg.token.context;

   cloudletId = (null === cloudletId) ? msg.token.cloudlet : cloudletId;

   if (!openiUtils.isCloudletId(cloudletId)){
         senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, {"error":"Invalid Cloudlet id" });
   }
   else if (null === msg.json || undefined == msg.json){
      senderToClient.send(msg.uuid, msg.connId, zmq.status.ERROR, zmq.standard_headers.json, {"error":"Empty message body" });
      return
   }

   var type              = msg.json['@openi_type'];
   var dbName            = cloudletId + '+' + objectId;
   var objectRestURL     = '/api/v1/objects/' + cloudletId + '/' + objectId;
   var typeLocation      = '/api/v1/types/' + type;


   if (!openiUtils.isTypeId(type)) {
      senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, {"error" : "Invalid format"});
      return;
   }

   validator.validateObject(cloudletId, msg.headers.host, msg.headers, typeLocation, msg.json['@data'], function(){

         var obj = {
            '@id'             : objectId,
            '@location'       : objectRestURL,
            '@cloudlet'       : cloudletId,
            '@openi_type'     : msg.json['@openi_type'],
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

   var objectId    = openiUtils.extractObjectId(msg.path);
   var cloudletId  = openiUtils.extractCloudletId(msg.path);
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

   var type = msg.json['@openi_type'];
   var typeLocation      = '/api/v1/types/' + type;

   if (undefined === type) {
      senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, {"error" : "Invalid format"});
      return;
   }

   var objectRestURL = '/api/v1/objects/' + cloudletId + '/' +  objectId;

   validator.validateObject(cloudletId, msg.headers.host, msg.headers, typeLocation, msg.json['@data'], function(){

         var obj = {
            '@id'            : objectId,
            '@location'      : objectRestURL,
            '@cloudlet'      : cloudletId,
            '@openi_type'    : msg.json['@openi_type'],
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
   var cloudletId  = openiUtils.extractCloudletId(msg.path);
   var objectId    = openiUtils.extractObjectId(msg.path);
   var third_party = (undefined === msg.token.client_id)         ? msg.token.context : msg.token.client_id ;
   var userQuery;
   var objectQuery;
   var typeQuery;
   var company;
   var ref;
   var typeID;


   if (null === objectId){
      objectId = openiUtils.extractAttachmentId(msg.path);
   }

   if (null === cloudletId){
      cloudletId = msg.token.cloudlet
   }

   if (!openiUtils.isCloudletId(cloudletId)){
      senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, {"error":"Invalid Cloudlet id" });
   }

   if(null !== objectId) {
      if ( !openiUtils.isAttachmentId(objectId) && !openiUtils.isObjectId(objectId) ){
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
               'bucket'      : 'objects'
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


      async.series([
         function(callback){
            userQuery = ViewQuery.from('user_views', 'get_name').key(msg.token.context);

            userBucket.query(userQuery, function(err, results) {

               if (err) {
                  callback(err);
               }

               if (_.isEmpty(results)) {
                  callback('no results');
               } else {
                  company = results[0].value;
                  callback(null, company);
               }
            });

         },
         function(callback){
            objectQuery = ViewQuery.from('objects_views', 'object_data').key(objectId);

            objectBucket.query(objectQuery, function(err, results) {

               if (err) {
                  callback(err);
               }

               if (_.isEmpty(results)) {
                  callback('no results');
               } else {
                  typeID = results[0].value;
                  callback(null, typeID);
               }
            });

         },
         function(callback){
            typeQuery = ViewQuery.from('type_views', 'get_ref').key(typeID);

            typeBucket.query(typeQuery, function(err, results) {

               if (err) {
                  callback(err);
               }

               if (_.isEmpty(results)) {
                  callback('no results');
               } else {
                  ref  = results[0].value;
                  callback(null, ref);
               }
            });

         }],
      function(err, results){
         if (err) {
            console.log(err);
         } else {

            if (true) {
               return
            }

            tracklet.track({
               cloudlet: cloudletId,
               app: msg.token.client_name,
               company: company,
               object: objectId,
               objData: ref
            }, function (error) {
                  if (error) {
                     console.log(error);
                  }
            });
         }
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


      if ( msg.token['openi-token-type'] === 'session' && startKey[0] === startKey[1]){
         var startKey      = [third_party];
         var endKey        = [third_party + '\uefff'];
      }

      var resp_type = 'object';

      if (undefined !== query.type) {

         if (!openiUtils.isTypeId(query.type)){
            senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, {"error": "invalid type id format"});
            return;
         }

         viewName = 'object_by_type';
         startKey = [third_party, query.type, cloudletId];
         endKey   = [third_party, query.type, cloudletId + '\uefff' ];


         if ( msg.token['openi-token-type'] === 'session' && startKey[0] === startKey[2]){
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
               'reduce'      : (query.group_level !== undefined)
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
      userQuery = ViewQuery.from('user_views', 'get_name').key(msg.token.context);
      userBucket.query(userQuery, function(err, results) {

         if (null === results || undefined === results[0]){
            return
         }

         company = results[0].value;

         tracklet.track({
            cloudlet: cloudletId,
            app: msg.token.client_name,
            company: company,
            object: 'all',
            objData: 'all'
         }, function (error) {
               if (error) {
                  console.log(error);
               }
         });

      });
   }
};


var genDeleteMessage = function(msg, senderToDao, senderToClient, terminal_handler){

   var cloudletId  = openiUtils.extractCloudletId(msg.path);
   var objectId    = openiUtils.extractObjectId(msg.path);
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


module.exports.init                   = init;
module.exports.processMongrel2Message = processMongrel2Message;
