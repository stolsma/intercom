/**
 * The child side example of the use of Intercom. 
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

process.parent.ready(function() {
  console.log('Comms Ready, sending message!');
  process.parent.emit('child::message', 'I am alive!');
});

process.parent.on('parent::message', function(text) {
  console.log('The parent says: ', text);
  process.nextTick(function() {
    process.parent.emit('child::quit');
  });
});

console.log('Child is setup!!');