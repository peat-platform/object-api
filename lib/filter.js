'use strict';

var elasticsearch = require('elasticsearch');
var qs            = require('querystring');
var _             = require('underscore');
var zmq           = require('m2nodehandler');
var openiUtils    = require('openi-cloudlet-utils');


var elastisearchClient = new elasticsearch.Client({
   host: "127.0.0.1:9200"
});


function formBody(obj, attr) {
   var query;
   if(arguments.length === 1) {
      query = obj;
   }
   else if(arguments.length === 2) {
      query = [obj, attr];
   }
   return {
      filter: {
         bool: {
            should: query
         }
      }
   };
}


function objAttrQuery(objects, attributes) {
   var keys   = _.keys(attributes);
   var values = _.values(attributes);
   var attrs  = [];

   objects = objects.split(',');

   for(var prop in objects) {
      if(objects.hasOwnProperty(prop)) {
         objects[prop] = {
            exists: {
               field: 'doc.@data.' + objects[prop]
            }
         };
      }
   }


   for(var i = 0; i < keys.length; i++) {
      var term   = {};
      var dummy  = {};
      var dummy2 = {};
      var age    = {};

      if(_.contains(values[i], ':')) {
         var range    = values[i].split(':');
         var from     = range[0];
         var to       = range[1];
         age.from     = from;
         age.to       = to;
         dummy.age    = age;
         dummy2.range = dummy;
         attrs[i]     = dummy2;
      } else {
         term[keys[i]] = values[i];
         dummy.term    = term;
         attrs[i]      = dummy;
      }
   }
   return formBody(objects, attrs);
}


function attrQuery(attributes) {
   var keys   = _.keys(attributes);
   var values = _.values(attributes);
   var attrs  = [];

   for(var i = 0; i < keys.length; i++) {
      var term   = {};
      var dummy  = {};
      var dummy2 = {};
      var age    = {};

      if(_.contains(values[i], ':')) {
         var range    = values[i].split(':');
         var from     = range[0];
         var to       = range[1];
         age.from     = from;
         age.to       = to;
         dummy.age    = age;
         dummy2.range = dummy;
         attrs[i]     = dummy2;
      } else {
         term[keys[i]] = values[i];
         dummy.term    = term;
         attrs[i]      = dummy;
      }
   }
   return formBody(attrs);
}


function objQuery(objects) {
   objects = objects.split(',');

   for(var prop in objects) {
      if(objects.hasOwnProperty(prop)) {
         objects[prop] = {
            exists: {
               field: 'doc.@data.' + objects[prop]
            }
         };
      }
   }

   return formBody(objects);
}


var filter = function(msg, senderToClient, cloudletId){

   var query = msg.headers.QUERY;
   var body;
   var terms      = qs.parse(query);
   var id_only    =  ('true' === terms.id_only );
   var objects    = terms.with_property;
   
   if (terms.property_filter != undefined)
      terms.property_filter = terms.property_filter.replace(/,/g , "&");
   
   var attributes = qs.parse(terms.property_filter);

   if (undefined === terms.with_property && undefined === terms.property_filter){
      senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, []);
      return;
   }

   var id_and_cloudlet_id_only = ('/api/v1/search' === msg.path);

   for (var i in attributes){
      if(attributes.hasOwnProperty(i)) {
         attributes['doc.@data.' + i] = attributes[i];
         delete attributes[i];
      }
   }

   if (undefined !== cloudletId){
      attributes['@cloudlet'] = cloudletId;
   }

   if(_.isEmpty(attributes)) {
      body = objQuery(objects);
   }
   else if(_.isUndefined(objects)) {
      body = attrQuery(attributes);
   }
   else {
      body = objAttrQuery(objects, attributes);
   }


   elastisearchClient.search({
         index : 'openi',
         body  : body
      },
      function (error, response) {
         if (error) {
            console.log(error);
         }
         else {

            var respArr =[];
            for(var i = 0; i < response.hits.total; i++) {
               if (undefined !== response.hits.hits[i]) {
                  if (id_only) {
                     respArr[i] = response.hits.hits[i]._source.doc['@id'];
                  }
                  else if (id_and_cloudlet_id_only) {
                     respArr[i] = {
                        'cloudlet_id' : response.hits.hits[i]._source.doc['@cloudlet'],
                        'object_id'   : response.hits.hits[i]._source.doc['@id']
                     };
                  }
                  else {
                     var filter_msg = (undefined !== terms.only_show_properties)?{'filter_show':terms.only_show_properties.split(',')} : {};

                     respArr[i] = openiUtils.objectHelper({'value':response.hits.hits[i]._source.doc}, filter_msg);
                  }
               }
            }

            senderToClient.send(msg.uuid, msg.connId, zmq.status.OK_200, zmq.standard_headers.json, respArr);
         }
      });
};


module.exports.filter = filter;
