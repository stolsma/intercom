/**
 * basic-stop-parent-force-test.js: Test if Child quit is working as expected
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

vows.describe('environment/basic-stop-parent-force').addBatch({
  "When using intercom": {
    topic: function() {
      var script = path.join(__dirname, '..', 'fixtures', 'basic-child', 'child-parent-close.js');
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
          that.callback(new Error('Timeout occured'), child);
        }, 10000);
        
        // Child wants parent to kill it
        child.on('child::quitforce', function() {
          child.stop();
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
        assert.isTrue(child.testing.events.length == 14);      
      },
      "and all messages in correct order": function(err, child) {
        var events = ['start', 'rpcready', 'stdout', 'child::message', 'parent::message', 'stdout', 'stdout',
                      'child::quitforce', 'disconnect', 'rpcexit', 'disconnected', 'stop', 'exit', 'close'];
        events.forEach(function(event, index) {
          assert.equal(event, child.testing.events[index].event);
        });      
      }
    }
  }
}).export(module);

/*
[ { event: 'start', argument: '[ { ctime: 1346623503991,\n    script: \'/home/sander/Development/intercom/test/fixtures/basic-child/child-parent-close.js\',\n    options: [],\n    pid: 752,\n    env: {} } ]' },
  { event: 'rpcready', argument: '[]' },
  { event: 'stdout', argument: '[ \'Child is ready!\\n\' ]' },
  { event: 'child::message', argument: '[ \'I am alive!\' ]' },
  { event: 'parent::message', argument: '[ \'Message received by your parent!\' ]' },
  { event: 'stdout', argument: '[ \'Message received by your parent!\\n\' ]' },
  { event: 'stdout', argument: '[ \'Send at quit and before emit!\\n\' ]' },
  { event: 'child::quitforce', argument: '[]' },
  { event: 'disconnect', argument: '[]' },
  { event: 'rpcexit', argument: '[]' },
  { event: 'disconnected', argument: '[]' },
  { event: 'stop', argument: '[ { ctime: 1346623503991,\n    script: \'/home/sander/Development/intercom/test/fixtures/basic-child/child-parent-close.js\',\n    options: [],\n    pid: 752,\n    env: {} } ]' },
  { event: 'exit', argument: '[ 1, null ]' },
  { event: 'close', argument: '[ false, 1, null ]' } ]
*/