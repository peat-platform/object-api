/**
 * Created by dmccarthy on 26/08/2014.
 */
var fs             = require('fs');
var zmq            = require('m2nodehandler');
var openiUtils     = require('openi-cloudlet-utils')
var postFileReader = require('./postFileReader.js')
var url            = require('url');


var processPostMessage = function (msg, senderToDao, senderToClient, terminal_handler) {

   var uploadStart   = msg.headers['x-mongrel2-upload-start']
   var uploadDone    = msg.headers['x-mongrel2-upload-done']
   var contentLength = msg.headers['content-length'];

   if (undefined === uploadDone){

      if (contentLength >= 20000000){

         var resp = zmq.Response(417, zmq.header_json, {"error" : "File too large."})

         senderToClient.send(msg.uuid, msg.connId, resp);

         return;
      }

      return
   }

   if (uploadStart !== uploadDone){

      var resp = zmq.Response(zmq.header.INTERNAL_SERVER_ERROR_500, zmq.header_json, {"error" : "Got the wrong file:."})

      senderToClient.send(msg.uuid, msg.connId, resp);

      return false;
   }

   var filePath = appRoot + "/../../mongrel2/" + msg.headers['x-mongrel2-upload-done']
   var boundry  = msg.headers['content-type'].replace('multipart/form-data; boundary=', '' )

   postFileReader(filePath, boundry, function(post_data){

      var cloudlet      = msg.path.split('/')[4];
      var name          = 'a_' + openiUtils.hash(post_data)
      var attachRestURL = "http://" + msg.headers.host + '/api/v1/attachments/' + cloudlet + '/' + name;

      var meta = {
         'id'             : name,
         'location'       : attachRestURL,
         'filename'       : post_data.file.filename,
         'content-length' : contentLength,
         'Content-Type'   : post_data.file['Content-Type'],
         _date_created    : new Date().toJSON(),
         _date_modified   : new Date().toJSON()
      }

      for (var key in post_data){
         if ("file" != key){
            meta[key] = post_data[key].value
         }
      }

      meta['file'] = post_data.file.value

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
            {'uuid' : msg.uuid, 'connId' : msg.connId }
         ]
      });

   })
}


var processGetMessage = function (msg, senderToDao, senderToClient, terminal_handler) {

   var cloudletId = msg.path.split('/')[4]
   var attachId   = msg.path.split('/')[5]

   var url_parts = url.parse(msg.headers.URI, true);
   var query     = url_parts.query;

   var hasAttachId = (typeof attachId !== 'undefined');

   if(hasAttachId) {

      var dbName    = cloudletId + '+' + attachId
      var resp_type = 'binary'

      if ('true' === query.meta){
         resp_type = 'binary_meta'
      }

      senderToDao.send({
         'dao_actions'      : [
            { 'action' : 'GET', 'bucket' : 'attachments', 'database' : dbName, 'resp_type': resp_type }
         ],
         'mongrel_sink' : terminal_handler,
         'clients'      : [
            {'uuid' : msg.uuid, 'connId' : msg.connId }
         ]
      });
   }
}


var processMongrel2Message = function (msg, senderToDao, senderToClient, terminal_handler) {

   switch(msg.headers['METHOD']){
   case 'PUT':
   case 'POST':
      processPostMessage(msg, senderToDao, senderToClient, terminal_handler)
      break;
   case 'GET':
      processGetMessage(msg, senderToDao, senderToClient, terminal_handler)
      break;
   default:
      break;
   }

}


module.exports.processMongrel2Message = processMongrel2Message