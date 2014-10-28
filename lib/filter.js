'use strict';

var elasticsearch = require('elasticsearch');
var qs            = require('querystring');
var _             = require('underscore');
var zmq           = require('m2nodehandler');
var openiUtils    = require('openi-cloudlet-utils');


var elastisearchClient = new elasticsearch.Client({
    host: "127.0.0.1:9200"
});


function formBody(obj, attr, op) {
    var query;
    if (obj == "") {
        query = attr;
    }
    else if (attr == "") {
        query = obj;
    }
    else {
        query = [obj, attr];
    }

    var json = JSON.parse(JSON.stringify(query));

    return json;
}

function objAttrQuery(objects, attributes, op) {
    var keys = _.keys(attributes);
    var values = _.values(attributes);
    var attrs = [];
    var searchJsonMust = [];
    var searchJsonShould = [];

    if (objects != undefined && objects.indexOf(",") != -1) {
        objects = objects.split(',');
        var opObj = "should";

        //var searchJson = [];

        for (var prop in objects) {
            if (objects.hasOwnProperty(prop)) {
                objects[prop] = {
                    exists: {
                        field: 'doc.@data.' + objects[prop]
                    }
                };
                searchJsonShould.push(formBody(objects[prop], "", opObj));
            }
        }

    }
    else if (objects != undefined && objects.indexOf("&") != -1) {
        objects = objects.split('&');
        var opObj = "must";

        //var searchJson = [];

        for (var prop in objects) {
            if (objects.hasOwnProperty(prop)) {
                objects[prop] = {
                    exists: {
                        field: 'doc.@data.' + objects[prop]
                    }
                };
                searchJsonMust.push(formBody(objects[prop], "", opObj));
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
            if (op == "should") {
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
    var json = "{ \"filter\": { \"bool\": {\"must\":" + JSON.stringify(must) + ", \"should\":" + JSON.stringify(should) + ", \"must_not\":" + JSON.stringify(must_not) + "} } }"
    //console.log("elastic Search JSON: \n" + json);
    return JSON.parse(json);
}


function attrQuery(attributes, op) {
    var keys = _.keys(attributes);
    var values = _.values(attributes);
    var attrs = [];
    var searchJsonMust = [];
    var searchJsonShould = [];

    for (var i = 0; i < keys.length; i++) {
        if (typeof values[i] === "object") {
            for (var k = 0; k < values[i].length; k++) {
                attrs.push(searchTerm(keys[i], values[i][k]));
                searchJsonShould.push(formBody(attrs[(attrs.length) - 1], "", "should"));
            }
        } else {
            attrs.push(searchTerm(keys[i], values[i]));
            if (op == "should") {
                searchJsonShould.push(formBody(attrs[(attrs.length) - 1], "", op));
            }
            else {
                searchJsonMust.push(formBody(attrs[(attrs.length) - 1], "", op));
            }

        }
    }

    /*
     if (op == "should") {
     var ret = finalSearchJson([], searchJsonShould, [])
     }
     else {
     var ret = finalSearchJson(searchJsonMust, searchJsonShould, [])
     }
     */

    return finalSearchJson(searchJsonMust, searchJsonShould, [])
}

function searchTerm(key, value) {

    var term = [];
    var dummy = {};
    var dummy2 = {};
    var age = {};

    if (_.contains(value, ':')) {
        var range = value.split(':');
        var from = range[0];
        var to = range[1];
        age.from = from;
        age.to = to;
        dummy.age = age;
        dummy2.range = dummy;
        return dummy2;
    } else {
        var json = "{\"" + key + "\": \"" + value + "\"}";
        term.push(JSON.parse(json));
        dummy.term = term[0];
        return dummy;
    }
}


function objQuery(objects) {
    if (objects != undefined && objects.indexOf(",") != -1) {
        objects = objects.split(',');
        var op = "should";
    }
    else if (objects != undefined && objects.indexOf("&") != -1) {
        objects = objects.split('&');
        var op = "must";
    }
    else if (objects != undefined) {
        var op = "must";
    }

    var searchJson = [];

    if (typeof objects != "object") {
        var tmp = {
            exists: {
                field: 'doc.@data.' + objects
            }
        };
        searchJson.push(formBody(tmp, "", op))
    }
    else {
        for (var prop in objects) {
            if (objects.hasOwnProperty(prop)) {
                objects[prop] = {
                    exists: {
                        field: 'doc.@data.' + objects[prop]
                    }
                };
                searchJson.push(formBody(objects[prop], "", op));
            }
        }
    }
    if (op == "should") {
        var ret = finalSearchJson([], searchJson, []);
    }
    else {
        var ret = finalSearchJson(searchJson, [], []);
    }

    return ret;
}


var filter = function (msg, meta, senderToClient, cloudletId) {

    var query = msg.headers.QUERY;
    //console.log(JSON.stringify(msg.headers))
    var body;
    var terms = qs.parse(query);
    //console.log(terms);
    var id_only = ('true' === terms.id_only );
    var objects = terms.with_property;

    if (terms.property_filter != undefined && terms.property_filter.indexOf(",") != -1) {
        terms.property_filter = terms.property_filter.replace(/,/g, "&");
        var op = "should"
    }
    else if (terms.property_filter != undefined && terms.property_filter.indexOf("&") != -1) {
        var op = "must";
    }

    var attributes = qs.parse(terms.property_filter);

    if (undefined === terms.with_property && undefined === terms.property_filter && undefined === terms.type) {
        meta.next = null
        var result = {
         meta:meta,
         result:[]
        }
        senderToClient.send(msg.uuid, msg.connId, zmq.status.BAD_REQUEST_400, zmq.standard_headers.json, result);
        return;
    }

    var id_and_cloudlet_id_only = false; //('/api/v1/search' === msg.path);

    for (var i in attributes) {
        if (attributes.hasOwnProperty(i)) {
            attributes['doc.@data.' + i] = attributes[i];
            delete attributes[i];
        }
    }

    if (_.isEmpty(attributes)) {
        body = objQuery(objects);
    }
    else if (_.isUndefined(objects)) {
        body = attrQuery(attributes, op);
    }
    else {
        body = objAttrQuery(objects, attributes, op);
    }

    if (undefined !== cloudletId) {
        body.filter.bool["must"].push(JSON.parse("{\"term\": {\"@cloudlet\": \"" + cloudletId + "\"}}"));
    }

    //console.log("body: \n"+body);
    if (undefined !== terms.type) {
        body.filter.bool["must"].push(JSON.parse("{\"term\": {\"doc.@openi_type\": \"https://" + msg.headers.host + "/api/v1/types/" + terms.type + "\"}}"));
    }

    console.log("elastic Search JSON Body: \n" + JSON.stringify(body));

    elastisearchClient.search({
            index: 'openi',
            body: body
        },
        function (error, response) {
            if (error) {
                console.log(error);
            }
            else {

                var respArr = [];

                for (var i = 0; i < response.hits.total; i++) {
                    if (undefined !== response.hits.hits[i]) {
                        if (id_only) {
                            var sameCloudletId = false;
                            for (var k in respArr) {
                                if (respArr[k].cloudlet_id == response.hits.hits[i]._source.doc['@cloudlet']) {
                                    respArr[k].object_id = respArr[k].object_id + "," + response.hits.hits[i]._source.doc['@id'];
                                    sameCloudletId = true;
                                    break;
                                }
                            }
                            if (!sameCloudletId) {
                                respArr[i] = {
                                    'cloudlet_id': response.hits.hits[i]._source.doc['@cloudlet'],
                                    'object_id': response.hits.hits[i]._source.doc['@id']
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
                            var filter_msg = (undefined !== terms.only_show_properties) ? {'filter_show': terms.only_show_properties.split(',')} : {};

                            respArr[i] = openiUtils.objectHelper({'value': response.hits.hits[i]._source.doc}, filter_msg);
                        }
                    }
                }
                //console.log(JSON.stringify(respArr));
               var result = {
                  meta:meta,
                  result:respArr
               }

               result.meta.total_count = respArr.length


               if (result.meta.limit > respArr.length){
                  result.meta.next = null
               }

                senderToClient.send(msg.uuid, msg.connId, zmq.status.OK_200, zmq.standard_headers.json, result);
            }
        });
};


module.exports.filter = filter;
