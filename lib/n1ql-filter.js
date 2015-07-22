'use strict';
var squel         = require("squel");
var qs            = require('querystring');


var getKeyValue = function(entry){

   var parts = entry.split(/=(.+)?/)

   var where = '`@data`.`' + parts[0] + '`'

   if (undefined === parts[1]){
      return ""
   }

   if ("true" === parts[1].toLowerCase() || "false" === parts[1].toLowerCase()){
      where += " = " + parts[1]
   }
   else if (typeof parts[1] === "string"){

      if (-1 !== parts[1].indexOf("*")){
         where += ' LIKE "' + parts[1].replace(/\*/g, '%') + '"'
      }
      else if (-1 !== parts[1].indexOf("||")){
         where       = '( '
         var orParts = parts[1].split("||")

         for (var j = 0; j < orParts.length; j++){
            var orP = orParts[j]
            where += '`@data`.`' + parts[0] + '` = "' + orP +'"'

            if (j + 1 !== orParts.length ){
               where += " OR "
            }
         }

         where += ')'
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


   if (msg.token['peat-token-type'] === 'session'){
      if (msg.token["scope"] === "user") {
         n1ql.where('`@cloudlet` = "' + cloudletId + '"')
      }
      else if (msg.token["scope"] === "developer") {
         var exp = squel.expr()
         exp.or('`_permissions`.`' + third_party + '`.`read` = true').or('`@cloudlet` = "' + cloudletId + '"')
         n1ql.where(exp)
      }
   }
   else
   {
      n1ql.where('`@cloudlet` = "' + cloudletId + '"')
          .where('`_permissions`.`' + third_party + '`.`read` = true')
   }


   if (undefined !== query.type) {
      n1ql.where('`@type` = "' + query.type + '"')
   }

   if (undefined !== with_props ){
      if( Object.prototype.toString.call( with_props ) !== '[object Array]' ) {
         with_props = [with_props]
      }

      for (var j = 0; j < with_props.length; j++) {

         var with_props_arr = with_props[j].replace(", ", ",").split(",")

         for (var i in with_props_arr) {
            n1ql.where('`@data`.`' + with_props_arr[i] + '` IS NOT NULL')
         }
      }
   }

   if (undefined !== filter ){
      if( Object.prototype.toString.call( filter ) !== '[object Array]' ) {
         filter = [filter]
      }

      for (var j = 0; j < filter.length; j++){
         var filter_arr = filter[j].replace(", ", ",").split(",")

         for (var i in filter_arr) {
            n1ql.where( getKeyValue(filter_arr[i]) )
         }
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
            'filter_show': query.only_show_properties,
            'third_party': third_party,
            'third_party_cloudlet' :  msg.token.context,
            'client_name' :  msg.token.client_name,
            'headers'     : {
               'x-forwarded-for' : msg.headers['x-forwarded-for'],
               'REMOTE_ADDR'     : msg.headers['REMOTE_ADDR']
            }

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