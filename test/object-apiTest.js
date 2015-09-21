/**
 * Created by dconway on 08/09/15.
 */
'use strict';

var objectAPI   = require('../lib/main.js');
var helper   = require('../lib/helper.js');

var assert = require('chai').assert;

var mockSender = function(cd){
   return{"send" : function(){
      cd.apply(this,arguments);
   }}
};


describe('Test Main',function(){
   var config = {
      dao_sink        : { spec:'tcp://127.0.0.1:49999', bind:false, type:'push', id:'a'},
      mongrel_handler : {
         source : { spec:'tcp://127.0.0.1:49905', bind:false, id:'b', type:'pull', isMongrel2:true },
         sink   : { spec:'tcp://127.0.0.1:49906', bind:false, id:'c', type:'pub', isMongrel2:true}
      },
      logger_params : {
         'name'          : 'object_api',
         'log_level'     : 'info',
         'log_file_name' : './object_api',
         'as_json'       : false
      }
   };
   var invalidConfig = {
      dao_sink        : { spec:'tcp://127.0.0.1:49999', bind:false, type:'left', id:'a'},
      mongrel_handler : {
         source : { spec:'tcp://127.0.0.1:49905', bind:false, id:'b', type:'pull', isMongrel2:true },
         sink   : { spec:'tcp://127.0.0.1:49906', bind:false, id:'c', type:'pub', isMongrel2:true}
      },
      logger_params : {
         'name'          : 'object_api',
         'log_level'     : 'info',
         'log_file_name' : './object_api',
         'as_json'       : false
      }
   };
   it('should pass init with config', function () {
      try{
         objectAPI(config);
      } catch(e){
         //console.log(e);
      }
   });
   it('should throw error with bad config', function () {
      try{
         objectAPI(invalidConfig);
      }catch(e){
         assert.isNotNull(e,"Error should be thrown");
      }
   });
});

describe('Test Helper',function(){

   var sessionToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJqdGkiOiJtb2NoYVRlc3RfM2Q0MTk5ZWMtYjE0Ni00Y2IzLThmYWItN2MzY2M4ZjMwYzllIiwiaXNzIjoiaHR0cHM6Ly8xMjcuMC4wLjE6MTM0My9hdXRoL3Rva2VuIiwic3ViIjoibW9jaGFUZXN0IiwiZXhwIjoxNDQxNzU5ODA4LCJpYXQiOjE0NDE3MTY2MDgsIm5vbmNlIjoiMmY0MzA3YWMtY2FmZC00NmI0LTg4OWUtNDExNzBmZjRkMTg0IiwidXNlcl9pZCI6Im1vY2hhVGVzdCIsImNsb3VkbGV0IjoiY180MGRlMmM2NTRmNzcyMzg3YTY4MTNhZTE0Y2RkNmM3YiIsInNjb3BlIjoicGVhdCIsInBlYXQtdG9rZW4tdHlwZSI6InNlc3Npb24iLCJyZXNwb25zZV90eXBlIjoiaWRfdG9rZW4ifQ.aXSaDAzKpmjgoV_utoOokyMiMGq0QK3IRfiJPvgpKIOrKg_qr-rXcjMb_-eA1_N6Q3sFHSRBv-hPTZbEXnX7iBMSVN1zdz9QyESGBOjawjsUFhtn1FsxFnrsmgyPZljn19JddZItrDFxRDKmkbKmMVeWu6LGsXiFwIO2Fg_5Bm3rAXi8-XaL7BUU0UvmwKbJYrxGWCETGWg22SU13kufDxx0Fo-LT0wpWuQZSltb_CcODl4QmbK00mSOS9umlEYX9PF5mOu0zAmEcgXqqcGgk2Bvlne_I0O_gR7BKL6YiGuHmDVgFPInvLAeGFdLUS8jnUpzVcViDmkq8t1F-TOLlQ'
   var authToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJqdGkiOiJjXzQwZGUyYzY1NGY3NzIzODdhNjgxM2FlMTRjZGQ2YzdiXzQ4MGQ4M2JmLTk3ZGYtNGRiOS04ZDNmLTg2YTY2MTM5ODFlMCIsImlzcyI6Imh0dHBzOi8vMTI3LjAuMC4xOjEzNDMvYXV0aC90b2tlbiIsInN1YiI6ImNfNDBkZTJjNjU0Zjc3MjM4N2E2ODEzYWUxNGNkZDZjN2IiLCJleHAiOjE0NDE3NjAwMTksImlhdCI6MTQ0MTcxNjgxOSwibm9uY2UiOiI1Y2I2ZGZhMC1iYzYwLTQ3MzYtOWRmOC1lYjMwZDYyOTY1OGQiLCJ1c2VyX2lkIjoiY180MGRlMmM2NTRmNzcyMzg3YTY4MTNhZTE0Y2RkNmM3YiIsImNsb3VkbGV0IjoiY180MGRlMmM2NTRmNzcyMzg3YTY4MTNhZTE0Y2RkNmM3YiIsImNsaWVudF9pZCI6IjNjNzhmZTY2ZDc3YzVjYmUyYmRlZjEzZWZlMTBlM2MzIiwiY2xpZW50X25hbWUiOiJtb2NoYVRlc3QiLCJjb250ZXh0IjoiY180MGRlMmM2NTRmNzcyMzg3YTY4MTNhZTE0Y2RkNmM3YiIsInNjb3BlIjoicGVhdCIsInBlYXQtdG9rZW4tdHlwZSI6InRva2VuIiwicmVzcG9uc2VfdHlwZSI6ImlkX3Rva2VuIn0.qf73YVDAXDpcsPbNRJJgTKqdh0fxC5Tpm8lw52U3t72fSeazJSS1uOIQGGxQvSpYS8bwdPjJyt9u8xGdbzBBKsGtuhtTw-TEVaPQLl1IzBwNImvfCUdZjaV-09AnTnppeO5o8diBqQ2hOA07oI4Zn9pFgkkur4YxufIAzO_Bj9Ny5Sg0L-DlXV3Q3lx30gS3hs9Ii72fKSjn7zjkoGZ2-UEs2hGnlsS57AtdfdUvTx9N3F5uTpWniIcjx6Nss7yRitMeB6kjELCZinJbAM3l3UaWoP0_pzVw0IMg8Sa8CwssilG1MoCPxRebJ7YG03OViIX7G8xCdn65EHNqYXTVxg'
   var validType = {
      "@type": "t_e18dd069371d528764d51c54d5bf9611-167",
      "@data": {
         "stringArray": [
            "mock stringArray 1",
            "mock stringArray 2",
            "mock stringArray 3"
         ]
      }
   };

   var testGETInput     = {
      uuid    : '123123',
      connId  : '345345345',
      path    : '/api/v1/objects/123123123/abc',
      headers : {
         QUERY  : 'a=b&c=d',
         METHOD : 'GET',
         URI    : '/api/v1/objects/123123123/abc'
      },
      body    : '{ "alias": "dmc", "username": "dm@tssg.org" }',
      json    : validType,
      token : authToken
   };
   var validGETInput     = {
      uuid    : '123123',
      connId  : '345345345',
      path    : '/api/v1/cloudlets/c_897b0ef002da79321dcb0d681cb473d0/0b1d1210-283c-407d-87d9-b88cf218379a',
      headers : {
         QUERY  : 'a=b&c=d',
         METHOD : 'GET',
         URI    : '/api/v1/cloudlets/c_897b0ef002da79321dcb0d681cb473d0/0b1d1210-283c-407d-87d9-b88cf218379a'
      },
      body    : '{ "alias": "dmc", "username": "dm@tssg.org" }',
      json    : {
         "alias": "dmc",
         "username": "dm@tssg.org"
      },
      token : authToken
   };
   var validGETObjsInput     = {
      uuid    : '123123',
      connId  : '345345345',
      path    : '/api/v1/cloudlets/c_897b0ef002da79321dcb0d681cb473d0',
      headers : {
         QUERY  : 'a=b&c=d',
         METHOD : 'GET',
         URI    : '/api/v1/cloudlets/c_897b0ef002da79321dcb0d681cb473d0'
      },
      body    : '{ "alias": "dmc", "username": "dm@tssg.org" }',
      json    : {
         "alias": "dmc",
         "username": "dm@tssg.org"
      },
      token : authToken
   };
   var validGETInput_Query     = {
      uuid    : '123123',
      connId  : '345345345',
      path    : '/api/v1/objects/c_897b0ef002da79321dcb0d681cb473d0',
      headers : {
         QUERY  : 'type=t_5d94e8484c8d18aa243fc210a0fc395a-1334&alltypes=true&alltypescloudlet=true&only_show_properties=yes,no',
         METHOD : 'GET',
         URI    : '/api/v1/cloudlets/c_897b0ef002da79321dcb0d681cb473d0?type=t_5d94e8484c8d18aa243fc210a0fc395a-1334&alltypes=true&alltypescloudlet=true&only_show_properties=yes,no'
      },
      body    : '{ "alias": "dmc", "username": "dm@tssg.org" }',
      json    : {
         "alias": "dmc",
         "username": "dm@tssg.org"
      },
      token : authToken
   };
   var validGETInput_Filter     = {
      uuid    : '123123',
      connId  : '345345345',
      path    : '/api/v1/objects/c_897b0ef002da79321dcb0d681cb473d0',
      headers : {
         QUERY  : 'type=t_5d94e8484c8d18aa243fc210a0fc395a-1334&alltypes=true&alltypescloudlet=true&with_property=address&only_show_properties=yes,no&property_filter=address=1||2,name=*,a = true',
         METHOD : 'GET',
         URI    : '/api/v1/cloudlets/c_897b0ef002da79321dcb0d681cb473d0?type=t_5d94e8484c8d18aa243fc210a0fc395a-1334&alltypes=true&alltypescloudlet=true&with_property=address&only_show_properties=yes,no&property_filter=address=1||2,name=*,a = true'
      },
      body    : '{ "alias": "dmc", "username": "dm@tssg.org" }',
      json    : {
         "alias": "dmc",
         "username": "dm@tssg.org"
      },
      token : sessionToken
   };

   var testPOSTInput     = {
      uuid    : '123123',
      connId  : '345345345',
      path    : '/api/v1/objects/c_897b0ef002da79321dcb0d681cb473d0',
      headers : {
         QUERY  : 'a=b&c=d',
         METHOD : 'POST'
      },
      body    : '{ "alias": "dmc", "username": "dm@tssg.org" }',
      json    : {
         "alias": "dmc",
         "username": "dm@tssg.org"
      },
      token : authToken
   };
   var testPOSTInput_NullJSON     = {
      uuid    : '123123',
      connId  : '345345345',
      path    : '/api/v1/objects/c_897b0ef002da79321dcb0d681cb473d0',
      headers : {
         QUERY  : 'a=b&c=d',
         METHOD : 'POST'
      },
      body    : '{ "alias": "dmc", "username": "dm@tssg.org" }',
      token : authToken
   };
   var validPOSTInput     = {
      uuid    : '123123',
      connId  : '345345345',
      path    : '/api/v1/objects/c_897b0ef002da79321dcb0d681cb473d0',
      headers : {
         QUERY  : 'a=b&c=d',
         METHOD : 'POST'
      },
      body    : '{ "alias": "dmc", "username": "dm@tssg.org" }',
      json    : validType,
      token   : authToken
   };

   var testPUTInput     = {
      uuid    : '123123',
      connId  : '345345345',
      path    : '/api/v1/cloudlets/c_897b0ef002da79321dcb0d681cb473d0/0b1d1210-283c-407d-87d9-b88cf218379a',
      headers : {
         QUERY  : 'a=b&c=d',
         METHOD : 'PUT',
         URI    : '/api/v1/cloudlets/c_897b0ef002da79321dcb0d681cb473d0/0b1d1210-283c-407d-87d9-b88cf218379a'
      },
      body    : '{ "alias": "dmc", "username": "dm@tssg.org" }',
      json    : {
         "alias": "dmc",
         "username": "dm@tssg.org"
      },
      token : authToken
   };
   var validPUTInput     = {
      uuid    : '123123',
      connId  : '345345345',
      path    : '/api/v1/cloudlets/c_897b0ef002da79321dcb0d681cb473d0/0b1d1210-283c-407d-87d9-b88cf218379a',
      headers : {
         QUERY  : 'a=b&c=d',
         METHOD : 'PUT',
         URI    : '/api/v1/cloudlets/c_897b0ef002da79321dcb0d681cb473d0/0b1d1210-283c-407d-87d9-b88cf218379a'
      },
      body    : '{ "alias": "dmc", "username": "dm@tssg.org" }',
      json    : {
         "alias": "dmc",
         "username": "dm@tssg.org"
      },
      token : authToken
   };

   var validDELETEInput     = {
      uuid    : '123123',
      connId  : '345345345',
      path    : '/api/v1/cloudlets/c_897b0ef002da79321dcb0d681cb473d0/0b1d1210-283c-407d-87d9-b88cf218379a',
      headers : {
         QUERY  : 'a=b&c=d',
         METHOD : 'DELETE',
         URI    : '/api/v1/cloudlets/c_897b0ef002da79321dcb0d681cb473d0/0b1d1210-283c-407d-87d9-b88cf218379a'
      },
      body    : '{ "alias": "dmc", "username": "dm@tssg.org" }',
      json    : {
         "alias": "dmc",
         "username": "dm@tssg.org"
      },
      token : authToken
   };

   it('should return 400 status for Invalid format GET', function () {
      var cb = function(uuid,connid,status,headers,data){
         assert(400,status,"Status should be 400");
         assert('Invalid Cloudlet id',data['error'],"Error should be 'Invalid Cloudlet id'")
      };
      try {
         helper.processMongrel2Message(testGETInput, null, mockSender(cb), null);
      }catch(e){
         assert.isNull(e,"Should not throw Error");
      }
   });
   it('should return 400 status for Invalid format POST', function () {
      var cb = function(uuid,connid,status,headers,data){
         assert(400,status,"Status should be 400");
         assert(data.error.indexOf('Invalid format') >= 0,"Error should be 'Empty body'")
      };
      try {
         helper.processMongrel2Message(testPOSTInput, mockSender(cb), mockSender(cb), null);
      }catch(e){
         assert.isNull(e,"Should not throw Error");
      }
   });
   it('should return 400 status for Invalid format POST Null JSON', function () {
      var cb = function(uuid,connid,status,headers,data){
         assert(400,status,"Status should be 400");
         assert(data.error.indexOf('Empty message body')>= 0,"Error should be 'Empty body'")
      };
      try {
         helper.processMongrel2Message(testPOSTInput_NullJSON, mockSender(cb), mockSender(cb), null);
      }catch(e){
         assert.isNull(e,"Should not throw Error");
      }
   });
   it('should return 400 status for Invalid format PUT', function () {
      var cb = function(uuid,connid,status,headers,data){
         assert(400,status,"Status should be 400");
         assert(data.error.indexOf('Invalid format') >= 0,"Error should be 'Invalid format'")
      };
      try {
         helper.processMongrel2Message(testPUTInput, null, mockSender(cb), null);
      }catch(e){
         assert.isNull(e,"Should not throw Error");
      }
   });


   it('should return daoActions for GET object', function () {
      var cb = function(data){
         assert.isNotNull(data,"data should not be null");
         assert(data.dao_actions[0]['action'].indexOf("GET") != -1, "Action should be 'GET'");
         assert(data.dao_actions[0]['bucket'].indexOf("objects")!= -1, "bucket should be 'objects'");
         //assert('Invalid Cloudlet id',data['error'],"Error should be 'Invalid Cloudlet id'")
      };
      try {
         helper.processMongrel2Message(validGETInput, mockSender(cb), mockSender(cb), null);
      }catch(e){
         assert.isNull(e,"Should not throw Error");
      }
   });
   it('should return daoActions for GET Cloudlet objects', function () {
      var cb = function(data){
         assert.isNotNull(data,"data should not be null");
         assert(data.dao_actions[0]['action'].indexOf("VIEW") != -1, "Action should be 'VIEW'");
         assert(data.dao_actions[0]['view_name'].indexOf("object_by_cloudlet_id") != -1, "View Should be 'object_by_cloudlet_id'");
         assert(data.dao_actions[0]['bucket'].indexOf("objects")!= -1, "bucket should be 'objects'");
      };
      try {
         helper.processMongrel2Message(validGETObjsInput, mockSender(cb), mockSender(cb), null);
      }catch(e){
         assert.isNull(e,"Should not throw Error");
      }
   });
   it('should return daoActions for GET objects with Query', function () {
      var cb = function(data){
         assert.isNotNull(data,"data should not be null");
         assert(data.dao_actions[0]['action'].indexOf("VIEW") != -1, "Action should be 'VIEW'");
         assert(data.dao_actions[0]['bucket'].indexOf("objects")!= -1, "bucket should be 'objects'");
      };
      try {
         helper.processMongrel2Message(validGETInput_Query, mockSender(cb), mockSender(cb), null);
      }catch(e){
         assert.isNull(e,"Should not throw Error");
      }
   });
   it('should return daoActions for GET objects with Filter', function () {
      var cb = function(data){
         assert.isNotNull(data,"data should not be null");
         assert(data.dao_actions[0]['action'].indexOf("QUERY") != -1, "Action should be 'QUERY'");
         assert(data.dao_actions[0]['bucket'].indexOf('objects') != -1, "bucket should be 'objects'");
      };
      try {
         helper.processMongrel2Message(validGETInput_Filter, mockSender(cb), mockSender(cb), null);
      }catch(e){
         assert.isNull(e,"Should not throw Error");
      }
   });
   it('should return 400 for POST object as validator urn not accessible', function () {
      var cb = function(uuid,connid,status,headers,data){
         assert(400,status,"Status should be 400");
         assert(data.error.indexOf('timeout') >= 0,"Error should be 'Invalid format'")
      };
      try {
         helper.processMongrel2Message(validPOSTInput, mockSender(cb), mockSender(cb), null);
      }catch(e){
         assert.isNull(e,"Should not throw Error");
      }
   });
   it('should return daoActions for DELETE object', function () {
      var cb = function(data){
         assert.isNotNull(data,"data should not be null");
         assert(data.dao_actions[0]['action'].indexOf('DELETE') != -1, "Action should be 'DELETE'");
         assert(data.dao_actions[0]['bucket'].indexOf('objects') != -1, "bucket should be 'objects'");
      };
      try {
         helper.processMongrel2Message(validDELETEInput, mockSender(cb), mockSender(cb), null);
      }catch(e){
         assert.isNull(e,"Should not throw Error");
      }
   });
});
