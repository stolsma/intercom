/**
 * The child side test of Intercom. 
 *
 * Copyright 2012 TTC/Sander Tolsma
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
  console.log(text);
  process.nextTick(function() {
    console.log('Send at quit and before emit!');
    process.parent.emit('child::quitself');
    process.parent.disconnect();
    console.log('Send at quit and after emit!');
    process.nextTick(function() {
      console.log('Send child::quitself again!');
      process.parent.emit('child::quitself');
    });
  });
  
  process.parent.on('child::quitself', function(){
    console.log('received child::quitself');
  });
});

console.log('Child is ready!');