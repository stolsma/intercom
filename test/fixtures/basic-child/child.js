/**
 * The child side test of Intercom. 
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

require('../../../lib/intercom');

process.parent.ready(function() {
  process.parent.emit('child::message', 'I am alive!');
});

process.parent.on('parent::message', function(text) {
  process.nextTick(function() {
    process.parent.emit('child::quit');
  });
});

console.log('Child is ready!');