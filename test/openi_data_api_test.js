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
    this.testCorrectName    = "/test/name/here"
    this.testIncorrectName  = "/wrongformat"
    done()
  },
  'incorrect format name': function(test) {
    // tests here
    var actual = openi_data_api.getName(this.testIncorrectName)

    test.equal(actual, null, "should return null")
    test.done()
  },
  'correct format name'  : function(test) {
    // tests here
    var actual = openi_data_api.getName(this.testCorrectName)

    test.notEqual(actual, null,   "should return an object")
    test.equal   (actual, "here", "string returned not expected")
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
