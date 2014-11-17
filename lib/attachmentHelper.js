/**
 * Created by dmccarthy on 26/08/2014.
 */
'use strict';
// var zmq            = require('m2nodehandler');
var openiUtils     = require('openi-cloudlet-utils');
var url            = require('url');
var defaultObjs    = require('./defaultAttachementObjects');




var processPostMessage = function (msg, senderToDao, senderToClient, terminal_handler) {

   var contentLength = msg.headers['content-length'];

   var cloudlet      = openiUtils.extractCloudletId(msg.path);
   var name          = openiUtils.generateUUID("attachment");

   cloudlet = (null === cloudlet) ? msg.token : cloudlet

   var attachRestURL = "http://" + msg.headers.host + '/api/v1/attachments/' + cloudlet + '/' + name;

   var meta = {
      '@id'            : name,
      'location'       : attachRestURL,
      'filename'       : msg.json.file.filename,
      'content-length' : contentLength,
      'Content-Type'   : msg.json.file['Content-Type'],
      _date_created    : new Date().toJSON(),
      _date_modified   : new Date().toJSON()
   };

   if (undefined !== msg.json['objectId'] && undefined !== msg.json['property']){

      var objectId = msg.json['objectId'].value;
      var property = msg.json['property'].value;

      senderToDao.send({
         'dao_actions'      : [
            {
               'action'       : 'PATCH_ATTACHMENT',
               'database'     : cloudlet + '+' + objectId,
               'object_data'  : name,
               'id'           : objectId,
               'property'     : property
            }
         ],
         'mongrel_sink' : "",
         'clients'      : []
      });
   }

   defaultObjs.updateAttachemntObj(senderToDao, msg, cloudlet, name);

   meta['file'] = msg.json.file.value;

   senderToDao.send( {
      'dao_actions'      : [
         {
            'action'      : 'POST',
            'bucket'      : 'attachments',
            'database'    : cloudlet + '+' + name,
            'object_name' : name,
            'object_data' : meta,
            'id'          : name
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
};


var processGetMessage = function (msg, senderToDao, senderToClient, terminal_handler) {

   var cloudletId = openiUtils.extractCloudletId(msg.path);
   var attachId   = openiUtils.extractAttachmentId(msg.path);

   cloudletId = (null === cloudletId) ? msg.token : cloudletId

   var dbName    = cloudletId + '+' + attachId;

   var resp_type = (-1 === msg.path.indexOf('meta')) ? 'binary' : 'binary_meta';

   senderToDao.send({
      'dao_actions'      : [
         {
            'action' : 'GET',
            'bucket' : 'attachments',
            'database' : dbName,
            'resp_type': resp_type
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

   switch(msg.headers['METHOD']){
   case 'PUT':
   case 'POST':
      processPostMessage(msg, senderToDao, senderToClient, terminal_handler);
      break;
   case 'GET':
      processGetMessage(msg, senderToDao, senderToClient, terminal_handler);
      break;
   default:
      break;
   }
};


module.exports.processMongrel2Message = processMongrel2Message;