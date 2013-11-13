'use strict';

var base_path      = require('./basePath.js');
var openi_data_api = require(base_path + '../lib/main.js');

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
    var actual = openi_data_api.getName(this.testIncorrectName)

    test.equal(actual, null, "should return null")
    test.done()
  },
  'correct cloudlet name'  : function(test) {
    // tests here
    var actual = openi_data_api.getName(this.testCorrectName)

    test.notEqual(actual, null,   "should return an object")
    test.deepEqual   (actual, ["data","cloudlet1"], "string returned not expected")
    test.done()
  },
  'correct object name'  : function(test) {
    // tests here
    var actual = openi_data_api.getName(this.testCorrectName1)

    test.notEqual (actual, null,   "should return an object")
    test.deepEqual(actual, ["data","cloudlet1","test1"], "string returned not expected")
    test.done()
  },
  'correct objectField name'  : function(test) {
    // tests here
    var actual = openi_data_api.getName(this.testCorrectName2)

    test.notEqual(actual, null,   "should return an object")
    test.deepEqual   (actual, ["data","cloudlet1","test0","x"], "string returned not expected")
    test.done()
  },
  'correct photo_type+oids name'  : function(test) {
    // tests here
    var actual = openi_data_api.getName(this.testCorrectName3)

    test.notEqual(actual, null,   "should return an object")
    test.deepEqual   (actual, ["data","cloudlet1","type","photo_type?oids=true"], "string returned not expected")
    test.done()
  },
  'correct photo_type+data name'  : function(test) {
    // tests here
    var actual = openi_data_api.getName(this.testCorrectName4)

    test.notEqual(actual, null,   "should return an object")
    test.deepEqual   (actual, ["data","cloudlet1","type","photo_type?oids=false&blob=false"], "string returned not expected")
    test.done()
  },
  'correct photo_type+blob name'  : function(test) {
    // tests here
    var actual = openi_data_api.getName(this.testCorrectName5)

    test.notEqual(actual, null,   "should return an object")
    test.deepEqual   (actual, ["data","cloudlet1","type","photo_type?oids=false&blob=true"], "string returned not expected")
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
        var testInputPath = "this is a get request"
        var actual        = openi_data_api.getAction(testInputPath)

        test.equals(actual, "GET", "should be the HTTP GET method.")
        test.done();
    },
    'correct format path, post method'   : function(test) {
        // tests here
        var testInputPath = "this is a post request"
        var actual        = openi_data_api.getAction(testInputPath)

        test.equals(actual, "POST", "should be the HTTP POST method.")
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
