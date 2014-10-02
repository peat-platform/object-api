var https           = require('https')
var moment          = require('moment');
var chrisoValidator = require('validator');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var validateMember = function(type, value){

   if ( null === value || '' === value || undefined === value){
      return { 'valid' : false, 'message' : 'Value cannot be empty'};
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
//   case "long":
//      break;
//   case "double":
//      break;
   case "binary":
      //link to binary endpoint on OPENi
      break;
   case "float":
      if ( !chrisoValidator.isFloat(value.toString()) ){
         return { 'valid' : false, 'message' : 'Float should be a real number with optional exponent e.g. 23, -44.98, 4.37e90'};
      }
      break;
   case "string":
      if (typeof value != "string"){
         return { 'valid' : false, 'message' : 'String should be data encapsulated in quotes. e.g. "data"'};
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
   case "openitype":
      //recursive call to validateObject unless the value presented as a URL i.e. an object already stored in OPENi

      if ( -1 === value.indexOf('/api/v1/objects/')){

         validateObject(value['@openi_type'], value['@data'], success_callback, failure_callback)
      }
      break;
   }

   return { 'valid' : true };
}



var validateObjectAgainstType = function(objData, typeStr, success_callback, failure_callback){

   var type;

   try {
      type = JSON.parse(typeStr);
   } catch (e) {
      failure_callback({'error' : 'Type content is not valid JSON.' });
      return;
   };


   if(!type['@context']){
      failure_callback({'error' : 'Type content is not valid JSON.' });
      return;
   };


   for (var member in type['@context']){

      var value = type['@context'][member]

      var openiObjValue  = objData[value['@property_name']];

      var typeMemberType = value['@property_context']['@openi_type'];

      if( undefined == openiObjValue){
         failure_callback({'error' : 'Object does not adhere to Type: Property ' + value['@property_name'] + " is missing." })
         return;
      }

      var memberValResult = validateMember(typeMemberType, openiObjValue )

      if (!memberValResult.valid){
         failure_callback({'error' : 'Object does not adhere to Type, property '
            + openiObjValue
            + " is not a valid "
            +  typeMemberType
            + ". "
            + memberValResult.message
         });
         return;
      }
   }

   if (type['@context'].length < Object.keys(objData).length ) {
      failure_callback({'error' : 'Object does not adhere to Type: Has extra members.' })
      return;
   }

   if (true){
      success_callback()
   }
   else{
      failure_callback({'error' : 'Object does not adhere to Type'})
   }

}


var validateObject = function(typeURL, objData, success_callback, failure_callback){

   if (undefined === typeURL || "" === typeURL || -1 === typeURL.indexOf("t_")){
      failure_callback({'error' : 'Unable to read type'})
      return
   }

   var request = https.get(typeURL, function(res) {

      var typeStr = '';

      //another chunk of data has been recieved, so append it to `str`
      res.on('data', function (chunk) {
         typeStr += chunk;
      });

      //the whole response has been recieved, so we just print it out here
      res.on('end', function () {
         validateObjectAgainstType(objData, typeStr, success_callback, failure_callback)
      });

   }).on('error', function(e) {
         failure_callback({'error' : e.message})
   }).setTimeout( 5000, function( ) {
         failure_callback({'error' : 'Unable to read type: timeout'})
   });

}

module.exports.validateObject = validateObject