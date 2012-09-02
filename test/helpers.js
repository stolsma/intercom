/**
 * helpers.js: Test helpers.
 *
 * Copyright 2012 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var intercom = require('../lib/intercom'),
    Child = intercom.EventChild,
    helpers = exports,
    inspect = require('util').inspect;

helpers.createChild = function(options) {
  var child = Child(options.script, { visible: true});
  
  child.testing = {};
  child.testing.stdout = options.stdout || [];
  child.testing.stderr = options.stderr || [];
  child.testing.msgs = options.msgs || [];
  child.testing.events = options.event || [];

  child.onAny(function(){
    var args = Array.prototype.slice.call(arguments, 0);
    if (this.event == 'stdout') {
      args[0] = args[0].toString();
    }
    child.testing.events.push({
      event: this.event,
      argument: inspect(args)
    });
  });

  child.on('stdout', function(txt) {
    child.testing.stdout.push(txt);
  });

  child.on('stderr', function(txt) {
    child.testing.stderr.push(txt);
  });

  child.on('child::message', function(text) {
    child.testing.msgs.push(text);
    child.emit('parent::message', 'Message received by your parent!');
  });

  return child;
};