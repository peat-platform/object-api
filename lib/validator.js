var http         = require('http')
var moment       = require('moment');


var validateAgainstType = function(type, value){

   switch(type){
   case "string":
      if ( null == value){
         return false
      }
      break;
   case "integer":
      break;
   case "date":
      if (!moment(value, "DD-MM-YYYY", true).isValid()){
         return false;
      }
      break;
   }

   return true;
}



var validateObjectToType = function(obj, success_callback, failure_callback){


   console.log("+++++++++++++++++")
   console.log(obj.json._openi_type)
   console.log("+++++++++++++++++")

   var request = http.get(obj.json._openi_type, function(res) {

      var str = '';

      //another chunk of data has been recieved, so append it to `str`
      res.on('data', function (chunk) {
         str += chunk;
      });

      //the whole response has been recieved, so we just print it out here
      res.on('end', function () {


         console.log("+++++++++++++++++")
         console.log(str)
         console.log("+++++++++++++++++")

         var type = JSON.parse(str);

         for (var member in type._context){

            var value = type._context[member]

            var openiObjValue  = obj.json._data[value._property_name];
            var typeMemberType = value._property_context._openi_type;

            if( undefined == openiObjValue){
               failure_callback({'error' : 'Object does not adhere to Type: Property ' + value._property_name + " is missing." })
               return;
            }

            if (!validateAgainstType(typeMemberType, openiObjValue )){
               failure_callback({'error' : 'Object does not adhere to Type: Property ' + openiObjValue + " is not a valid" +  typeMemberType })
               return;
            }
         }


         if (type._context.length < Object.keys(obj.json._data).length ) {
            failure_callback({'error' : 'Object does not adhere to Type: Has extra members.' })
            return;
         }


         if (true){
            success_callback()
         }
         else{
            failure_callback({'error' : 'Object does not adhere to Type'})
         }
      });

   }).on('error', function(e) {
         failure_callback({'error' : e.message})
   }).setTimeout( 5000, function( ) {
         failure_callback({'error' : 'Unable to read type: timeout'})
   });

}

module.exports.validateObjectToType = validateObjectToType