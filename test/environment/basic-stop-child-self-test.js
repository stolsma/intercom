/**
 * basic-stop-child-self-test.js: Test if Child quit is working as expected
 *
 * Copyright 2012 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var assert = require('assert'),
    path = require('path'),
    vows = require('vows');
    
var helpers = require('../helpers');

vows.describe('environment/basic-stop-child-self').addBatch({
  "When using intercom": {
    topic: function() {
      var script = path.join(__dirname, '..', 'fixtures', 'basic-child', 'child-self-close.js');
      return helpers.createChild({script: script});
    },
    "it should be properly created": function(child) {
      assert.isTrue(!!child);
    },
    "start a child": {
      topic: function(child) {
        var that = this;
        
        // if the child takes too long to close
        var timecode = setTimeout(function() {
          timecode = null;
          child.stop();
          that.callback(new Error('Timeout occured'), child);
        }, 10000);
        
        // Child wants to close itself
        child.on('child::quitself', function() {
          child.forceStop = true;
        });
        
        // wait until the child is closed
        child.on('close', function() {
          if (timecode) {
            clearTimeout(timecode);
            timecode = null;
            that.callback(null, child);
          }
        });
        
        // start child
        child.start();
      },
      "and it should return with no errors": function(err, child) {
        assert.isNull(err);
      },
      "and all messages received": function(err, child) {
        assert.isTrue(child.testing.events.length == 16);      
      },
      "and all messages in correct order": function(err, child) {
        var events = ['start', 'rpcready', 'stdout', 'child::message', 'parent::message', 'stdout', 'stdout',
                      'child::quitself', 'stdout', 'rpcexit', 'disconnected', 'stdout', 'stdout', 'stdout', 
                      'exit', 'close'];
        events.forEach(function(event, index) {
          assert.equal(event, child.testing.events[index].event);
        });      
      }
    }
  }
}).export(module);


/*
[ { event: 'start', argument: '[ { ctime: 1346621734512,\n    script: \'/home/sander/Development/intercom/test/fixtures/basic-child/child-self-close.js\',\n    options: [],\n    pid: 32728,\n    env: {} } ]' },
  { event: 'rpcready', argument: '[]' },
  { event: 'stdout', argument: '[ \'Child is ready!\\n\' ]' },
  { event: 'child::message', argument: '[ \'I am alive!\' ]' },
  { event: 'parent::message', argument: '[ \'Message received by your parent!\' ]' },
  { event: 'stdout', argument: '[ \'Message received by your parent!\\n\' ]' },
  { event: 'stdout', argument: '[ \'Send at quit and before emit!\\n\' ]' },
  { event: 'child::quitself', argument: '[]' },
  { event: 'stdout', argument: '[ \'received child::quitself\\n\' ]' },
  { event: 'rpcexit', argument: '[]' },
  { event: 'disconnected', argument: '[]' },
  { event: 'stdout', argument: '[ \'Send at quit and after emit!\\n\' ]' },
  { event: 'stdout', argument: '[ \'Send child::quitself again!\\n\' ]' },
  { event: 'stdout', argument: '[ \'received child::quitself\\n\' ]' },
  { event: 'exit', argument: '[ 0, null ]' },
  { event: 'close', argument: '[ false, 0, null ]' } ]

*/