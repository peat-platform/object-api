'use strict';


var preset_obj_type_ids = {
   'images' :'t_54026fd86b90056812bca66a500580b9-195',
   'videos' :'t_1e1dba28bda9d1aa06a92897e32e2237-195',
   'pdfs'   :'t_e2b33d5eb746b05e5ce6bc2b29d0f5fd-189',
   'audio'  :'t_546d208a88ec0144c72fe5509925ccb4-192'
};

var preset_obj_object_ids = {
   'images' :'00000001-5203-4f5b-df3e-7f06c795775d',
   'videos' :'00000002-5203-4f5b-df3e-7f06c795775d',
   'pdfs'   :'00000003-5203-4f5b-df3e-7f06c795775d',
   'audio'  :'00000004-5203-4f5b-df3e-7f06c795775d'
};

var contentTypeMapping = {
   'image/gif'              : 'images',
   'image/jpeg'             : 'images',
   'image/pjpeg'            : 'images',
   'image/png'              : 'images',
   'image/vnd.djvu'         : 'images',
   'image/example'          : 'images',
   'image/svg+xml'          : 'images',
   'video/avi'              : 'videos',
   'video/example'          : 'videos',
   'video/mpeg'             : 'videos',
   'video/mp4'              : 'videos',
   'video/ogg'              : 'videos',
   'video/quicktime'        : 'videos',
   'video/webm'             : 'videos',
   'video/x-matroska'       : 'videos',
   'video/x-ms-wmv'         : 'videos',
   'video/x-flv'            : 'videos',
   'application/pdf'        : 'pdfs',
   'audio/basic'            : 'audio',
   'audio/L24'              : 'audio',
   'audio/mp4'              : 'audio',
   'audio/mpeg'             : 'audio',
   'audio/ogg'              : 'audio',
   'audio/opus'             : 'audio',
   'audio/vorbis'           : 'audio',
   'audio/vnd.rn-realaudio' : 'audio',
   'audio/vnd.wave'         : 'audio',
   'audio/webm'             : 'audio',
   'audio/example'          : 'audio'
};

var constructObject = function(msg, cloudletId, type, attachmentId){

   var typeId   = preset_obj_type_ids[type];
   var objectId = preset_obj_object_ids[type];

   var obj = {
      '@id'            : objectId,
      '@location'      : '/api/v1/objects/' + cloudletId + '/' +  objectId,
      '@cloudlet'      : cloudletId,
      '@type_location' : '/api/v1/types/' + typeId,
      '@openi_type'    : typeId,
      '@data'          : {},
      _date_created    : new Date().toJSON(),
      _date_modified   : new Date().toJSON()
   };

   obj['@data'][type] = [attachmentId];

   return obj;
};


var extractType = function(msg){
   var contentType = msg.json.file['Content-Type'];

   return contentTypeMapping[contentType];
};

var updateAttachemntObj = function(senderToDao, msg, cloudletId, attachmentId){

   console.log("-----------------", cloudletId, attachmentId)

   var type = extractType(msg);

   if (undefined === type){
      return;
   }

   var objectId = preset_obj_object_ids[type];
   var obj      = constructObject(msg, cloudletId, type, attachmentId);

   senderToDao.send({
      'dao_actions' : [
         {
            'action'       : 'PATCH_ATTACHMENT_OBJECT',
            'database'     : cloudletId + '+' + objectId,
            'type'         : type,
            'object'       : obj,
            'bucket'       : 'objects'
         }
      ],
      'mongrel_sink' : undefined,
      'clients'      : []
   });

};

module.exports.updateAttachemntObj = updateAttachemntObj;