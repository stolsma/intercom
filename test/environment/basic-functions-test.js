/**
 * basic-functions-test.js: Test if the required basic functions are available in Node
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var assert = require('assert'),
    path = require('path'),
    vows = require('vows');
    
var helpers = require('../helpers');

vows.describe('environment/basic-functions').addBatch({
  "When using intercom": {
    topic: function() {
      var script = path.join(__dirname, '..', 'fixtures', 'basic-child', 'child.js');
      return helpers.createChild({script: script});
    },
    "it should be properly created": function(child) {
      // TODO Implement creation test
      assert.isTrue(!!child);
    },
    "start a child": {
      topic: function(child) {
        child.start();
        return child;
      },
      "and it should have all functions": function(child) {
        assert.isTrue(!!child.child.kill);      
        child.stop();
      }
    }
  }
}).export(module);