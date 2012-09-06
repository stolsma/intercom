/**
 * basic-weak-test.js: Test if 'weak' in wraps is working as expected
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

var tests = 50,
    wait = 1;

// load the `weak` module if it is available in the node_module tree 
var weak;
try {
  weak = require('weak');
}
catch (err) {
  weak = undefined;
}

if (!weak) {
  vows.describe('environment/basic-weak').addBatch({
    "When using intercom without weak": {
      topic: function() {
        return 'nothing';
      },
      "nothing needs to be tested": function(something) {
        assert.isString(something);
      }
    }
  }).export(module);
}
else {
  vows.describe('environment/basic-weak').addBatch({
    "When using intercom with weak upstream": {
      topic: function() {
        var script = path.join(__dirname, '..', 'fixtures', 'weak', 'child-weak-self-close.js');
        var childoptions = {
          visible   : true,
          silent    : true,
          execArgv  : ['--expose_gc']
        };
        return helpers.createChild({script: script, childoptions: childoptions});
      },
      "it should be properly created": function(child) {
        assert.isTrue(!!child);
      },
      "start a child with weak maps": {
        topic: function(child) {
          child.start();
          return child;
        },
        "and it should have all functions": function(child) {
          assert.isTrue(!!child.child.kill);      
        },
        "and send messages with functions": {
          topic: function(child) {
            var that = this;
            
            // the statistic counters
            var worked  = 0,
                sent    = 0;
            
            // don't restart!!
            child.forceStop = true;
            
            // test with 'test' number of messages with function
            child.on('rpcready', function() {
              var i;
              for (i=1; i<=tests ;i++) {
                setTimeout(function() {
                  // create unique callback function
                  function test(data){
                    worked++;
                    
                    // all responses received so shutdown
                    if (worked >= tests) {
                      setTimeout(function() {
                        child.emit('parent::quitnow', {});
                      }, 200);
                    }
                  }
                  
                  sent++;
                  child.emit('child::function', sent, test);
                }, i*wait);
              }
            });
            
            
            // if the child takes too long to close
            var timecode = setTimeout(function() {
              timecode = null;
              child.stop();
              that.callback(new Error('Timeout occured'), child.testing, worked, sent);
            }, (tests * wait) + 5000);
            
            
            child.on('close', function() {
              if (timecode) {
                clearTimeout(timecode);
                timecode = null;
                that.callback(null, child.testing, worked, sent);
              }
            });
          },
          "and it should have had no error": function(err, results) {
            assert.isNull(err);
          },
          "and it should have send all messages": function(err, results, worked, sent) {
            assert.equal(worked, sent);      
          },
          "and it should have received all messages": function(err, results, worked, sent) {
            assert.equal(results.events.length, sent + 8);      
          },
          "and it should have wrapped all functions": function(err, results, worked, sent) {
            var wrap = JSON.parse(results.stdout[0]).wrap;
            assert.equal(wrap, sent+1);      
          },
          "and it should have culled all functions": function(err, results, worked, sent) {
            var cull = JSON.parse(results.stdout[0]).cull;
            assert.equal(cull, sent);      
          }
        }
      }
    }
  }).export(module);
}