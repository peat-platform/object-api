'use strict';

var base_path          = require('./basePath.js');
var peat_cloudlet_api = require(base_path + '../lib/helper.js');


peat_cloudlet_api.init({
   'path'     : 'build/data_api',
   'log_level': 'debug',
   'as_json'  : false
})

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/



exports['testProcessMongrel2'] = {

   'POST Object'   : function(test) {
      // tests here
      var testInput     = {
         uuid    : '123123',
         connId  : '345345345',
         path    : '/api/v1/cloudlets/123123123/abc',
         headers : {
            QUERY  : 'a=b&c=d',
            METHOD : 'POST'
         },
         body    : '{ "alias": "dmc", "username": "dm@tssg.org" }',
         json    : {
            "alias": "dmc",
            "username": "dm@tssg.org"
            }
         }


      var actual = peat_cloudlet_api.processMongrel2Message(testInput);

      console.log(actual)

      test.equals('POST',        actual.dao_actions[0].action,                "should be 'CREATE'"     )
      test.equals('d41d8cd98f00b204e9800998ecf8427e-0', actual.dao_actions[0].object_name,     "should be dmc")
      test.equals('dmc',         actual.dao_actions[0].object_data.alias,     "should be dmc"          )
      test.equals('dm@tssg.org', actual.dao_actions[0].object_data.username,  "should be dm@tssg.org"  )
      test.equals(true,          actual.mongrel_resp.value,    "should be true"         )
      test.equals('123123',      actual.clients[0].uuid,       "should be 123123"       )
      test.equals('345345345',   actual.clients[0].connId,     "should be 345345345"    )
      test.done();
   },
   'PUT Object'   : function(test) {
      // tests here
      var testInput     = {
         uuid    : '123123',
         connId  : '345345345',
         path    : '/api/v1/cloudlets/123123123/abc/ver1233',
         headers : {
            QUERY  : 'a=b&c=d',
            METHOD : 'PUT'
         },
         body    : '{ "alias": "dmccccc", "username": "dm@tssg.org" }',
         json    : {
               "alias": "dmcccccc",
               "username": "dm@tssg.org"
         }
      }

      var actual = peat_cloudlet_api.processMongrel2Message(testInput);

      test.equals('PUT',         actual.dao_actions[0].action,                "should be 'CREATE'"     )
      test.equals('dmcccccc',    actual.dao_actions[0].object_data.alias,     "should be dmc"          )
      test.equals('dm@tssg.org', actual.dao_actions[0].object_data.username,  "should be dm@tssg.org"  )
      test.equals('ver1233',     actual.dao_actions[0].revision,              "should be ver1233"          )
      test.equals(true,          actual.mongrel_resp.value,    "should be true"         )
      test.equals('123123',      actual.clients[0].uuid,       "should be 123123"       )
      test.equals('345345345',   actual.clients[0].connId,     "should be 345345345"    )
      test.done();
   },
   'GET OBject'   : function(test) {
      // tests here
      var testInput     = {
         uuid    : '123123',
         connId  : '345345345',
         path    : '/api/v1/cloudlets/234234234234',
         headers : {
            QUERY  : 'a=b&c=d',
            METHOD : 'GET'
         },
         body    : {
            "alias": "dmc",
            "username": "dm@tssg.org"
         },
         json    : {
            "alias": "dmc",
            "username": "dm@tssg.org"
         }
      }

      var actual = peat_cloudlet_api.processMongrel2Message(testInput);

      test.equals(actual.dao_actions[0].action,   'GET',                                       "should be 'FETCH'"      )
      test.equals(actual.dao_actions[0].database,                '234234234234',                              "should be 345345345"    )
      test.deepEqual(actual.mongrel_resp,       { value: true }, "should be { value: true, cloudletId: '234234234234' }")
      test.equals(actual.clients[0].uuid,    '123123',                                    "should be 123123"       )
      test.equals(actual.clients[0].connId,  '345345345',                                 "should be 345345345"    )
      test.done();
   },
   'Malformed'   : function(test) {
      // tests here
      var testInput     = {
         uuid    : '123123',
         connId  : '345345345',
         path    : '/api/v1/cloudlets/234234234234',
         headers : {
            QUERY  : 'a=b&c=d',
            METHOD : 'AAA'
         },
         body    : {
            "alias": "dmc",
            "username": "dm@tssg.org"
         },
         json    : {
            "alias": "dmc",
            "username": "dm@tssg.org"
         }
      }

      var actual = peat_cloudlet_api.processMongrel2Message(testInput);

      test.equal(actual, null)

      test.done();
   }
}
