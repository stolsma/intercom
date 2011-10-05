/**
 * The parent side example of the use of Intercom. 
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var path = require('path'),
	Child = require('../lib/intercom').Child;

var child = Child(path.join(__dirname, 'child.js'));

child.on('stdout', function(txt) {
	console.log('stdout: ' + txt);
});

child.on('child::message', function(text) {
	console.log('Child says: ', text);
	child.emit('parent::message', 'This is your parent!');
});

child.on('child::quit', function() {
	console.log('Child wants to quit!');
	process.nextTick(function(){
		child.stop();
	});
});

child.start();