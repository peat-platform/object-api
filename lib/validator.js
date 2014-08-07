var http            = require('http')
var moment          = require('moment');
var chrisoValidator = require('validator');


var validateMember = function(type, value){

   if ( null === value || '' === value){
      return { 'valid' : false, 'message' : 'Value cannot be empty'};
   }

   switch(type.toLowerCase()){
   case "boolean":
      var booleStr = value.toString()
      if ( booleStr !== 'true' && booleStr !== 'false' ){
         return { 'valid' : false, 'message' : 'Boolean should be true or false'};
      }
      return { 'valid' : false, 'message' : ''};
      break;
   case "int":
      if ( !chrisoValidator.isInt(value) ){
         return { 'valid' : false, 'message' : ''};
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
      if ( !chrisoValidator.isFloat(value) ){
         return { 'valid' : false, 'message' : ''};
      }
      break;
   case "string":
      //validator already checked that the value isn't empty
      break;
   case "date":
      if (!moment(value, "DD-MM-YYYY", true).isValid()){
         return { 'valid' : false, 'message' : 'Date should have the following format DD-MM-YYYY. E.g. 21-11-1990'};
      }
      break;
   case "timestamp":
      if (!moment(value, "yyyy-MM-dd HH:mm:ss.SSS", true).isValid()){
         return { 'valid' : false, 'message' : 'Timestamp should have the following format yyyy-MM-dd HH:mm:ss.SSS, e.g. '};
      }
      break;
   case "openitype":
      //recursive call to validateObject unless the value presented as a URL i.e. an object already stored in OPENi

      if ( -1 === value.indexOf('/api/v1/objects/')){

         validateObject(value._openi_type, value._data, success_callback, failure_callback)
      }
      break;
   }

   return { 'valid' : true };
}



var validateObjectAgainstType = function(objData, typeStr, success_callback, failure_callback){

   var type = JSON.parse(typeStr);

   for (var member in type._context){

      var value = type._context[member]

      var openiObjValue  = objData[value._property_name];
      var typeMemberType = value._property_context._openi_type;

      if( undefined == openiObjValue){
         failure_callback({'error' : 'Object does not adhere to Type: Property ' + value._property_name + " is missing." })
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

//TODO Reimplement Key Count check
//   if (type._context.length < Object.keys(obj.json._data).length ) {
//      failure_callback({'error' : 'Object does not adhere to Type: Has extra members.' })
//      return;
//   }


   if (true){
      success_callback()
   }
   else{
      failure_callback({'error' : 'Object does not adhere to Type'})
   }

}


var validateObject = function(typeURL, objData, success_callback, failure_callback){

   var request = http.get(typeURL, function(res) {

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