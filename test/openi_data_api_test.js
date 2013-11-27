'use strict';

var base_path      = require('./basePath.js');
var openi_data_api = require(base_path + '../lib/helper.js');


openi_data_api.init({
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

exports['testGetName'] = {
  setUp: function(done) {
    // setup here
    this.testCorrectName    = "/data/vi/data/cloudlet1"
    this.testCorrectName1    = "/data/vi/data/cloudlet1/test1"
    this.testCorrectName2    = "/data/vi/data/cloudlet1/test0/x"
    this.testCorrectName3    = "/data/vi/data/cloudlet1/type/photo_type?oids=true"
    this.testCorrectName4    = "/data/vi/data/cloudlet1/type/photo_type?oids=false&blob=false"
    this.testCorrectName5    = "/data/vi/data/cloudlet1/type/photo_type?oids=false&blob=true"
    this.testIncorrectName  = "/wrongformat"
    done()
  },
  'incorrect format name': function(test) {
    // tests here
    var actual = openi_data_api.getObject(this.testIncorrectName)

    test.equal(actual, null, "should return null")
    test.done()
  },
  'correct cloudlet name'  : function(test) {
    // tests here
    var actual = openi_data_api.getObject(this.testCorrectName)

    test.notEqual(actual, null,   "should return an object")
    test.deepEqual   (actual, "cloudlet1", "string returned not expected")
    test.done()
  },
  'correct object name'  : function(test) {
    // tests here
    var actual = openi_data_api.getObject(this.testCorrectName1)

    test.notEqual (actual, null,   "should return an object")
    test.deepEqual(actual, "cloudlet1", "string returned not expected")
    test.done()
  },
  'correct objectField name'  : function(test) {
    // tests here
    var actual = openi_data_api.getObject(this.testCorrectName2)

    test.notEqual(actual, null,   "should return an object")
    test.deepEqual   (actual, "cloudlet1", "string returned not expected")
    test.done()
  },
  'correct photo_type+oids name'  : function(test) {
    // tests here
    var actual = openi_data_api.getObject(this.testCorrectName3)

    test.notEqual(actual, null,   "should return an object")
    test.deepEqual   (actual, "cloudlet1" , "string returned not expected")
    test.done()
  },
  'correct photo_type+data name'  : function(test) {
    // tests here
    var actual = openi_data_api.getObject(this.testCorrectName4)

    test.notEqual(actual, null,   "should return an object")
    test.deepEqual   (actual, "cloudlet1", "string returned not expected")
    test.done()
  },
  'correct photo_type+blob name'  : function(test) {
    // tests here
    var actual = openi_data_api.getObject(this.testCorrectName5)

    test.notEqual(actual, null,   "should return an object")
    test.deepEqual   (actual, "cloudlet1", "string returned not expected")
    test.done()
  }
};

exports['testGetAction'] = {
   setUp: function(done) {
      // setup here
      done()
   },
   'correct format path, get method'   : function(test) {
      // tests here
      var testInputPath = "GEt"
      var actual        = openi_data_api.getAction(testInputPath)

      test.equals(actual, "GET", "should be the HTTP GET method.")
      test.done();
   },
   'correct format path, put method'   : function(test) {
      // tests here
      var testInputPath = "Put"
      var actual        = openi_data_api.getAction(testInputPath)

      test.equals(actual, "PUT", "should be the HTTP PUT method.")
      test.done();
   },
   'correct format path, post method'   : function(test) {
      // tests here
      var testInputPath = "poST"
      var actual        = openi_data_api.getAction(testInputPath)

      test.equals(actual, "PUT", "should be the HTTP POST method.")
      test.done();
   },
   // 'correct format path, echo method'  : function(test) {
   //     // tests here
   //     var testInputPath = "this is a echo request"
   //     var actual        = openi_data_api.getAction(testInputPath)

   //     test.equals(actual, "ECHO", "should be the HTTP ECHO method.")
   //     test.done();
   // },
   'incorrect format path'  : function(test) {
      // tests here
      var testInputPath = "this is a request without a method"
      var actual        = openi_data_api.getAction(testInputPath)

      test.equals(actual, null, "should have returned null")
      test.done();
   }
}


exports['testPassThrough'] = {
   'correct format'   : function(test) {
      // tests here
      var testInput     = {
         action : 'put',
         uuid   : '123123',
         connId : '345345345',
         body   : 'body text'
      }
      var actual        = openi_data_api.passThrough(testInput);

      test.equals(actual.status, 200, "should be 200")
      test.equals(actual.body, '{"action":"put","uuid":"123123","connId":"345345345","body":"body text"}', "should match")
      test.equals(actual.headers['Content-Type'], 'application/json; charset=utf-8', "should match")
      test.done();
   },
   'correct format path, post method'   : function(test) {

      var testInput     = {
         action : false,
         uuid   : '123123',
         connId : '345345345',
         body   : 'body text'
      }
      var actual        = openi_data_api.passThrough(testInput);

      console.log(actual)

      test.equals(actual, null, "should be null.")
      test.done();
   }
}


exports['testProcessMongrel2'] = {

   'correct format'   : function(test) {
      // tests here
      var testInput     = {
         action  : 'put',
         uuid    : '123123',
         connId  : '345345345',
         path    : '/v1/data/get/test',
         headers : {
            QUERY  : 'a=b&c=d',
            METHOD : 'PUT'
         }
      }

      var actual = openi_data_api.processMongrel2Message(testInput);


      test.equals(actual.uuid,        '123123',    "should be '123123'")
      test.equals(actual.connId,      '345345345', "should be 345345345")
      test.equals(actual.action,      'PUT',       "should be PUT")
      test.equals(actual.cloudlet,    'get',       "should be get")
      test.equals(actual.object_name, 'test',      "should be test")
      test.equals(actual.query,       'a=b&c=d',   "should be a=b&c=d")
      test.done();
   }
}
