'use strict';

var elasticsearch = require('elasticsearch');
var qs            = require('querystring');
var _             = require('underscore');
var zmq           = require('m2nodehandler');
var openiUtils    = require('openi-cloudlet-utils');
var loglet        = require('loglet');

loglet = loglet.child({component: 'search'});

var elastisearchClient = new elasticsearch.Client({
   host: "127.0.0.1:9200"
});


function formBody(obj, attr) {
   var query;
   if (obj === "") {
      query = {
         filter: {
            bool: {
               must: attr
            }
         }
      };
   }
   else if (attr === "") {
      query = JSON.parse(JSON.stringify(obj));
   }
   else {
      query = {
         filter: {
            bool: {
               must: [obj, attr]
            }
         }
      };
   }

   console.log(JSON.stringify(query));
   return query;
}




function propertyAttributeQuery(objects, attributes, op) {
   var keys = _.keys(attributes);
   var values = _.values(attributes);
   var attrs = [];
   var searchJsonMust = [];
   var searchJsonShould = [];
   var opObj;

   if (objects !== undefined && objects.indexOf(",") !== -1) {
      objects = objects.split(',');
      opObj = "should";


      for (var prop in objects) {
         if (objects.hasOwnProperty(prop) && undefined != objects[prop]) {
            objects[prop] = {
               exists: {
                  field: 'doc.@data.' + objects[prop]
               }
            };
            searchJsonShould.push(formBody(objects[prop], "", opObj));
         }
      }

   }
   else if (objects !== undefined && objects.indexOf("&") !== -1) {
      objects = objects.split('&');
      opObj = "must";


      for (var prop in objects) {
         if (objects.hasOwnProperty(prop) && undefined != objects[prop]) {
            objects[prop] = {
               exists: {
                  field: 'doc.@data.' + objects[prop]
               }
            };
            searchJsonMust.push(formBody(objects[prop], "", opObj));
         }
      }
   }
   else if (objects !== undefined) {
      objects = objects.split(',');
      opObj = "should";

      for (var prop in objects) {
         if (objects.hasOwnProperty(prop) && undefined != objects[prop]) {
            objects[prop] = {
               exists: {
                  field: 'doc.@data.' + objects[prop]
               }
            };
            searchJsonShould.push(formBody(objects[prop], "", opObj));
         }
      }
   }
   //objects = objects.split(',');


   for (var i = 0; i < keys.length; i++) {
      if (typeof values[i] === "object") {
         for (var k = 0; k < values[i].length; k++) {
            attrs.push(searchTerm(keys[i], values[i][k]));
            searchJsonShould.push(formBody(attrs[(attrs.length) - 1], "", "should"));
         }
      } else {
         attrs.push(searchTerm(keys[i], values[i]));
         if (op === "should") {
            searchJsonShould.push(formBody(attrs[(attrs.length) - 1], "", op));
         }
         else {
            searchJsonMust.push(formBody(attrs[(attrs.length) - 1], "", op));
         }

      }
   }

   var temp = finalSearchJson(searchJsonMust, searchJsonShould, []);

   return temp;
}


function finalSearchJson(must, should, must_not) {
   var json = "{ \"filter\": { \"bool\": {\"must\":" + JSON.stringify(must) + ", \"should\":" + JSON.stringify(should) + ", \"must_not\":" + JSON.stringify(must_not) + "} } }";
   return JSON.parse(json);
}


//function attributeQuery(attributes, op) {
//   var keys = _.keys(attributes);
//   var values = _.values(attributes);
//   var attrs = [];
//   var searchJsonMust = [];
//   var searchJsonShould = [];
//
//
//   for (var i = 0; i < keys.length; i++) {
//      if (typeof values[i] === "object") {
//         for (var k = 0; k < values[i].length; k++) {
//            attrs.push(searchTerm(keys[i], values[i][k]));
//            searchJsonShould.push(formBody(attrs[(attrs.length) - 1], "", "should"));
//         }
//      } else {
//         attrs.push(searchTerm(keys[i], values[i]));
//         console.log('Attrs: ' + JSON.stringify(attrs));
//         if (op === "should") {
//            searchJsonShould.push(formBody(attrs[(attrs.length) - 1], "", op));
//         }
//         else {
//            searchJsonMust.push(formBody(attrs[(attrs.length) - 1], "", op));
//         }
//
//      }
//   }
//
//
//   return finalSearchJson(searchJsonMust, searchJsonShould, []);
//}

function attributeQuery(attributes) {
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
   return formBody("", attrs);
}



function searchTerm(key, value) {
   console.log('key: ' + key);
   console.log('value: ' + value);
   var term = [];
   var dummy = {};
   var dummy2 = {};
   var age = {};

   if (_.contains(value, ':')) {
      var range    = value.split(':');
      var from     = range[0];
      var to       = range[1];
      age.from     = from;
      age.to       = to;
      dummy.age    = age;
      dummy2.range = dummy;
      return dummy2;
   } else {
      term.push({ key : value});
      console.log('term: '+ JSON.stringify(term));
      dummy.term = term[0];
      console.log('dummy: ' + JSON.stringify(dummy));
      return dummy;
   }
}


function propertyQuery(properties) {
   var ret;
   var op;
   if (properties !== undefined && properties.indexOf(",") !== -1) {
      properties = properties.split(',');
      op = "should";
   }
   else if (properties !== undefined && properties.indexOf("&") !== -1) {
      properties = properties.split('&');
      op = "must";
   }
   else if (properties !== undefined) {
      op = "must";
   }

   var searchJson = [];

   if (typeof properties !== "object" && undefined != properties) {
      var tmp = {
         exists: {
            field: 'doc.@data.' + properties
         }
      };
      searchJson.push(formBody(tmp, "", op));
   }
   else {
      for (var prop in properties) {
         if (properties.hasOwnProperty(prop)  && undefined != objects[prop]) {
            properties[prop] = {
               exists: {
                  field: 'doc.@data.' + properties[prop]
               }
            };
            searchJson.push(formBody(properties[prop], "", op));
         }
      }
   }
   if (op === "should") {
      ret = finalSearchJson([], searchJson, []);
   }
   else {
      ret = finalSearchJson(searchJson, [], []);
   }

   return ret;
}


var filter = function (msg, meta, senderToClient, third_party, cloudletId) {

   var body;
   var op;
   var query = qs.parse(msg.headers.QUERY);
   var properties = query.with_property;
   var attributes = qs.parse(query.property_filter);
   var id_only = ('true' === query.id_only );

   if (query.property_filter !== undefined && query.property_filter.indexOf("&") !== -1) {
      query.property_filter = query.property_filter.replace(/,/g, "&");
      op = "must";
   }
   else if (query.property_filter !== undefined && query.property_filter.indexOf(",") !== -1) {
      query.property_filter = query.property_filter.replace(/,/g, "&");
      op = "should";
   }



   if (undefined === query.with_property && undefined === query.property_filter && undefined === query.type) {
      meta.next = null;
      var result = {
         meta:meta,
         result:[]
      };
      senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, result);
      return;
   }

   var id_and_cloudlet_id_only = false; //('/api/v1/search' === msg.path);

   for (var i in attributes) {
      if (attributes.hasOwnProperty(i)  && undefined != i) {
         attributes['doc.@data.' + i] = attributes[i];
         delete attributes[i];
      }
   }

   if (_.isEmpty(attributes)) {
      body = propertyQuery(properties);
   }
   else if (_.isUndefined(properties)) {
      body = attributeQuery(attributes, op);
   }
   else {
      body = propertyAttributeQuery(properties, attributes, op);
   }

   body.filter.bool["must"].push(JSON.parse("{\"term\": {\"@cloudlet\": \"" + cloudletId + "\"}}"));
   body.filter.bool["must"].push(JSON.parse("{\"term\": { \"doc._permissions." + third_party + ".read\": true } }"))

   //console.log("body: \n"+body);
   if (undefined !== query.type) {
      body.filter.bool["must"].push(JSON.parse("{\"term\": {\"doc.@openi_type\": \"" + query.type + "\"}}"));
   }

   console.log("elastic Search JSON Body: \n" + JSON.stringify(body));

   elastisearchClient.search({
         index: 'objects',
         body: body
      },
      function (error, response) {
         if (error) {
            loglet.error(error);
         }
         else {

            var respArr = [];

            for (var i = 0; i < response.hits.total; i++) {
               if (undefined !== response.hits.hits[i]) {
                  if (id_only) {
                     var sameCloudletId = false;
                     for (var k in respArr) {
                        if (respArr[k].cloudlet_id === response.hits.hits[i]._source.doc['@cloudlet']) {
                           respArr[k].object_id = respArr[k].object_id + "," + response.hits.hits[i]._source.doc['@id'];
                           sameCloudletId = true;
                           break;
                        }
                     }
                     if (!sameCloudletId) {
                        respArr[i] = {
                           'cloudlet_id': response.hits.hits[i]._source.doc['@cloudlet'],
                           'object_id'  : response.hits.hits[i]._source.doc['@id']
                        };
                     }
                  }
                  /*
                   else if (id_and_cloudlet_id_only) {
                   respArr[i] = {
                   'cloudlet_id': response.hits.hits[i]._source.doc['@cloudlet'],
                   'object_id': response.hits.hits[i]._source.doc['@id']
                   };
                   }
                   */
                  else {
                     var filter_msg = (undefined !== query.only_show_properties) ? {'filter_show': query.only_show_properties.split(',')} : {};

                     respArr[i] = openiUtils.objectHelper({'value': response.hits.hits[i]._source.doc}, filter_msg);

                     delete respArr[i]._permissions
                  }
               }
            }
            var result = {
               meta:meta,
               result:respArr
            };
            result.meta.total_count = respArr.length;


            if (result.meta.limit > respArr.length){
               result.meta.next = null;
            }

            senderToClient.send(msg.uuid, msg.connId, zmq.status.OK_200, zmq.standard_headers.json, result);
         }
      });
};


module.exports.filter = filter;
