'use strict';
var squel         = require("squel");
var qs            = require('querystring');


var getKeyValue = function(entry){

   var parts = entry.split(/=(.+)?/)

   var where = '`@data`.`' + parts[0] + '`'

   if ("true" === parts[1].toLowerCase() || "false" === parts[1].toLowerCase()){
      where += " = " + parts[1]
   }
   else if (typeof parts[1] === "string"){

      if (-1 != parts[1].indexOf("*")){
         where += ' LIKE "' + parts[1].replace(/\*/g, '%') + '"'
      }
      else{
         where += ' ="' + parts[1] + '"'
      }

   }
   else {
      where += ' = "' + parts[1] + '"'
   }

   return where
}


var filter = function (msg, meta, senderToDao, third_party, cloudletId, terminal_handler, query) {

   var id_only    = ('true' === query.id_only );
   var with_props = query.with_property
   var filter     = query.property_filter
   var order      = (undefined !== query.order ) ? query.order           : "ascending";

   var n1ql = squel.select();

   n1ql.from("objects")
      .field('concat(`@cloudlet`, "+", `@id`) as id')
      .order('id', (order === "ascending") ? true : false)
      .limit(meta.limit)
      .offset(meta.offset)


   if (msg.token['openi-token-type'] === 'session'){
      console.log("cloudletId  ", cloudletId)
      console.log("third_party ", third_party)
      console.log("msg.token   ", msg.token)
      if (msg.token["scope"] === "user") {
         n1ql.where('`@cloudlet` = "' + cloudletId + '"')
      }
      else if (msg.token["scope"] === "developer") {
         n1ql.where('`_permissions`.`' + third_party + '`.`read` = true')
      }
   }
   else
   {
      n1ql.where('`@cloudlet` = "' + cloudletId + '"')
          .where('`_permissions`.`' + third_party + '`.`read` = true')
   }


   if (undefined !== query.type) {
      n1ql.where('`@openi_type` = "' + query.type + '"')
   }

   if (undefined !== with_props) {
      var with_props_arr = with_props.replace(", ", ",").split(",")

      for (var i in with_props_arr) {
         n1ql.where('`@data`.`' + with_props_arr[i] + '` IS NOT NULL')
      }
   }

   if (undefined !== filter){
      var filter_arr = filter.replace(", ", ",").split(",")

      for (var i in filter_arr) {
         n1ql.where( getKeyValue(filter_arr[i]) )
      }
   }

   if (undefined !== query.only_show_properties) {
      query.only_show_properties = query.only_show_properties.split(',');
   }


   console.log(n1ql.toString())

   senderToDao.send({
      'dao_actions' : [
         {
            'action'     : 'QUERY',
            'meta'       : meta,
            'data'       : n1ql.toString(),
            'resp_type'  : 'object',
            'database'   : 'objects',
            'bucket'     : 'objects',
            'id_only'    : id_only,
            'api_key'    : msg.token.client_id,
            'filter_show' : query.only_show_properties,
            'third_party': third_party
         }
      ],
      'mongrel_sink': terminal_handler,
      'clients'     : [
         {
            'uuid'  : msg.uuid,
            'connId': msg.connId
         }
      ]
   });

}

module.exports.filter = filter;