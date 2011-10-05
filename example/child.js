/**
 * The child side example of the use of Intercom. 
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var Parent = require('../lib/intercom').Parent;

var parent = Parent(function() {
	parent.emit('child::message', 'I am alive!');
});

parent.on('parent::message', function(text) {
	console.log('The parent says: ', text);
	process.nextTick(function() {
		parent.emit('child::quit');
	});
});
