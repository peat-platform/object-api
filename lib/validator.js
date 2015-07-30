'use strict';

var https           = require('https');
var moment          = require('moment');
var chrisoValidator = require('validator');
var peatUtils      = require('cloudlet-utils');

var urlMatch        = new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/);
var gpsMatch        = new RegExp(/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/)

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var validateMember = function(typeDesc, origValue, subObjectRefs){

   var type = typeDesc['@data_type'];
   var prop_name = typeDesc['@property_name']

   if (typeDesc['@multiple'] && Object.prototype.toString.call( origValue ) !== '[object Array]'){
      return { 'valid' : false, 'message' : '\'' + typeDesc['@property_name'] + '\' should be an array of values.' };
   }

   var values = (typeDesc['@multiple']) ? origValue : [origValue];

   for (var i = 0; i < values.length; i++){
      var value = values[i];

      if (( null === value || '' === value || undefined === value )){
         if (typeDesc['@required']){
            return { 'valid' : false, 'message' : 'Value cannot be empty'};
         }
         else{
            return { 'valid' : true };
         }
      }

      if (undefined !== typeDesc['@allowed_values'] && -1 === typeDesc['@allowed_values'].indexOf(value)){
         return { 'valid' : false, 'message' : '\'' + prop_name
            + '\' must be one of the following values: ' + typeDesc['@allowed_values'].join(', ')};
      }

      switch(type.toLowerCase()){

      case "boolean":
         var booleStr = value.toString();
         if ( booleStr !== 'true' && booleStr !== 'false' ){
            return { 'valid' : false, 'message' : 'Boolean should be true or false'};
         }
         break;
      case "int":
         if ( !chrisoValidator.isInt(value.toString()) ){
            return { 'valid' : false, 'message' : 'Integer should be a whole number e.g. 120, 0, -3'};
         }
         break;
      case "attachment":
         if (!peatUtils.isAttachmentId(value)){
            return { 'valid' : false, 'message' : 'Not a valid attachment id'};
         }
         break;
      case "gps":
         if (!gpsMatch.test(value)){
            return { 'valid' : false, 'message' : 'Not a valid GPS coordinate'};
         }
         break;
      case "url":
         if (!urlMatch.test(value)){
            return { 'valid' : false, 'message' : 'Not a valid URL'};
         }
         break;
      case "float":
         if ( !chrisoValidator.isFloat(value.toString()) ){
            return { 'valid' : false, 'message' : 'Float should be a real number with optional exponent e.g. 23, -44.98, 4.37e90'};
         }
         break;
      case "string":
         if (typeof value !== "string"){
            return { 'valid' : false, 'message' : prop_name + ' value error. String should be data encapsulated in quotes. e.g. "data"'};
         }
         break;
      case "date":
         if (!moment(value.toString(), "DD-MM-YYYY", true).isValid()){
            return { 'valid' : false, 'message' : 'Date should have the following format DD-MM-YYYY. e.g. 21-11-1990'};
         }
         break;
      case "timestamp":
         if (!moment(value.toString(), "YYYY-MM-DD HH:mm:ss.SSS", true).isValid()){
            return { 'valid' : false, 'message' : 'Timestamp should have the following format YYYY-MM-DD HH:mm:ss.SSS, e.g. 2010-04-23 12:32:55.339'};
         }
         break;
      case "hexadecimal":
         if ( !chrisoValidator.isHexadecimal(value.toString()) ){
            return { 'valid' : false, 'message' : 'Hexadecimal should only contain the characters (0123456789abcdef)'};
         }
         break;
      case "base64":
         if ( !chrisoValidator.isBase64(value.toString()) ){
            return { 'valid' : false, 'message' : 'Base64 should only contain from the sets a-z A-Z 0-9 + / in groups of 4'};
         }
         break;
      default:
         //recursive call to validateObject unless the value presented as a URL i.e. an object already stored in PEAT
         if ( peatUtils.isTypeId(type) ){
            subObjectRefs.push({type:type, value:value});
         }
         break;
      }
   }

   return { 'valid' : true };
};


var getWithFunction = function(path, objs, cloudletId, host, headers, success_callback, failure_callback, fun, arg){

   var options = {
      host    : host,
      port    : 443,
      headers : {'authorization' : headers.authorization},
      path    : path
   };

   https.get(options, function(res) {

      var str = '';

      //another chunk of data has been recieved, so append it to `str`
      res.on('data', function (chunk) {
         str += chunk;
      });

      //the whole response has been recieved, so we just print it out here
      res.on('end', function () {

         var json = {};
         try{
            json = JSON.parse(str);
         }
         catch(e){
            failure_callback({'error' : 'Unable to validate object: code 2222'});
         }
         fun(json, arg, objs, cloudletId, host, headers, success_callback, failure_callback);
      });

   }).on('error', function(e) {
      failure_callback({'error' : e.message});
   }).setTimeout( 5000, function( ) {
      failure_callback({'error' : 'Unable to validate object: code 2223'});
   });
};

var validateSubObjs = function(cloudletId, host, headers, obj, objs, success_callback, failure_callback){

   var typeURL = "/api/v1/types/" + obj.type;

   if (peatUtils.isObjectId(obj.value)){
      //if it is a reference type we need to get it and compare the type id to value

      var objURL = "/api/v1/objects/" + cloudletId + "/" + obj.value;

      getWithFunction(objURL, objs, cloudletId, host, headers, success_callback, failure_callback, function(obj_json){

         getWithFunction(typeURL, objs, cloudletId, host, headers, success_callback, failure_callback, val_sub, obj_json['@data']);

      });
   }
   else{

      //if it is literal object type we need to lookup type and validate that it adheres to values.

      getWithFunction(typeURL, objs, cloudletId, host, headers, success_callback, failure_callback, val_sub, obj.value);
   }
};


var validateObjectAgainstType = function(cloudletId, host, headers, objData, typeStr, success_callback, failure_callback){

   var type;

   try {
      type = JSON.parse(typeStr);
   } catch (e) {
      failure_callback({'error' : 'Type content is not valid JSON.' });
      return;
   }


   if(!type['@context']){
      failure_callback({'error' : 'Type content is not valid JSON.' });
      return;
   }


   if (undefined === objData || null === objData || typeof objData !== 'object') {
      failure_callback({'error' : 'Object to validate is undefined'});
      return;
   }

   var subObjectRefs = [];

   for (var member in type['@context']){
      if(type['@context'].hasOwnProperty(member)) {
         var value          = type['@context'][member];
         var peatObjValue  = objData[value['@property_name']];
         //var typeMemberType = value['@type'];

         if( undefined === peatObjValue && value['@required']){
            failure_callback({'error' : 'Object does not adhere to Type: Required property ' + value['@property_name'] + " is missing." });
            return;
         }

         var memberValResult = validateMember(value, peatObjValue, subObjectRefs );

         if (!memberValResult.valid){
            failure_callback({'error' : 'Object does not adhere to Type, '
//               + peatObjValue
//               + " is not a valid "
//               +  typeMemberType
//               + ". "
               + memberValResult.message
            });
            return;
         }
      }
   }

   if (type['@context'].length < Object.keys(objData).length ) {
      failure_callback({'error' : 'Object does not adhere to Type: Has extra members.' });
      return;
   }

   if (subObjectRefs.length > 0){
      //if object
      var obj = subObjectRefs.pop();
      validateSubObjs(cloudletId, host, headers, obj, subObjectRefs, success_callback, failure_callback);
   }
   else{
      success_callback();
   }
};







var val_sub = function(type, obj, objs, cloudletId, host, headers, success_callback, failure_callback){


   if( undefined === obj){
      failure_callback({'error' : 'Sub Object does not adhere to Type, the following object is missing: ' + type["@reference"] });
      return;
   }

   for (var member in type['@context']){
      if(type['@context'].hasOwnProperty(member)) {
         var value          = type['@context'][member];
         var peatObjValue  = obj[value['@property_name']];
         var typeMemberType = value['@data_type'];
         var required       = value['@required'];


         if( undefined === peatObjValue){
            if (required){
               failure_callback({'error' : 'Sub Object does not adhere to Type: Property ' + value['@property_name'] + " is missing." });
               return
            }
            continue;
         }

         var memberValResult = validateMember(value, peatObjValue, [] );

         if (!memberValResult.valid){
            failure_callback({'error' : 'Sub Object does not adhere to Type, property '
               + peatObjValue
               + " is not a valid "
               +  typeMemberType
               + ". "
               + memberValResult.message
            });
            return;
         }
      }
   }

   if (0 === objs.length){
      success_callback();
   }
   else{
      var obj = objs.pop();
      validateSubObjs(cloudletId, host, headers, obj, objs, success_callback, failure_callback);
   }
};







var validateObject = function(cloudletId, host, headers, typeURL, objData, success_callback, failure_callback){

   if (peatUtils.isTypeId(typeURL)){
      failure_callback({'error' : 'Unable to read type'});
      return;
   }

   var request = https.get(typeURL, function(res) {

      var typeStr = '';

      //another chunk of data has been recieved, so append it to `str`
      res.on('data', function (chunk) {
         typeStr += chunk;
      });

      //the whole response has been recieved, so we just print it out here
      res.on('end', function () {
         validateObjectAgainstType(cloudletId, host, headers, objData, typeStr, success_callback, failure_callback);
      });

   }).on('error', function(e) {
      failure_callback({'error' : e.message});
   }).setTimeout( 5000, function( ) {
      failure_callback({'error' : 'Unable to read type: timeout'});
   });
};

module.exports.validateObject = validateObject;