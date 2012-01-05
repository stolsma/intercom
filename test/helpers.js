/**
 * helpers.js: Test helpers.
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var intercom = require('../lib/intercom'),
    Child = intercom.EventChild,
    helpers = exports;

helpers.createChild = function(options) {
  var child = Child(options.script, { visible: true });
  
  child.testing = {};
  child.testing.stdout = options.stdout || [];
  child.testing.stderr = options.stderr || [];
  child.testing.msgs = options.msgs || [];
  
  child.on('stdout', function(txt) {
    child.testing.stdout.push(txt);
  });
  
  child.on('stderr', function(txt) {
    child.testing.stderr.push(txt);
  });
  
  child.on('child::message', function(text) {
    child.testing.msgs.push(text);
  });
  
  child.on('child::quit', function() {
    process.nextTick(function(){
      child.stop();
    });
  });
  
  return child;
};