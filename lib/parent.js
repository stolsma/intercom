/**
 * parent.js: Standard class for Parent fork service with dnode RPC 
 * communication over internal nodejs fork communication channel
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var inherits = require('util').inherits,
	EventEmitter2 = require('eventemitter2').EventEmitter2,
	dnodeProtocol = require('dnode-protocol');

// eventEmitter2 and comms constants
var EVENT_OPTIONS = {
		delimiter: '::',
		wildcard: true
	};

/**
 * Creates a new instance of Parent with specified params.
 * @params {Function} startup function to call when communication is available.
 * @params {Object} options Configuration for this instance.
 */
var Parent = module.exports = function(startupFn, options) {
	// if called as function return Instance
	if (!(this instanceof Parent)) return new Parent(startupFn, options);

	// screen arguments
	if (!options && typeof startupFn === 'object') options = startupFn;

	// Setup list of event names that are used by this class and can 
	// therefore not be emitted to the other side!!! (to prevent circular emits)
	this.localEvents = ['error', 'stdout', 'stderr', 'warn', 'exit', 'start', 'restart', 'stop', 'rpcready', 'rpcexit']; 

	// Setup basic configuration options
	options           = options || {};
	this.eventOptions = options.eventOptions || EVENT_OPTIONS;

	// Call the parent EventEmitter2 constructor
	EventEmitter2.call(this, this.eventOptions);

	// setup rpc connection with parent
	this.startRpc(process);

	// call the start function when event communication with parent is running
	if (typeof startupFn === 'function') {
		this.once('rpcready', startupFn.bind(this));
	}
};
// Inherit from EventEmitter2
inherits(Parent, EventEmitter2);

/**
 * On incoming events, send those events as messages to the parent
 * and to the local emit function
 */
Parent.prototype.emit = function emitHandler(event) {
	// Only send if the parent has a message function, and the event isn't in local
	// event list!
	if (this.rpcSession && this.rpcSession.remote && this.rpcSession.remote.emit) {
		if (this.localEvents.indexOf(event) === -1) {
			this.rpcSession.remote.emit.apply(null, arguments);
		} else {
			EventEmitter2.prototype.emit.call(this, 'error', 'Received forbidden event!', arguments);
			return;
		}
	};
	// also send to local instance
	EventEmitter2.prototype.emit.apply(this, arguments);
}

/**
 * Create the parent side of the RPC communications channel
 * @param {Process} parent Instance which will receive/send 'messages' through
 * the by fork created `message` event and `send()` function.
 */
Parent.prototype.startRpc = function(parent) {
	var self = this;
	if (!parent.send) throw(new Error('No process.send function available! Probably no nodejs 6.x or node-fork installed!'));
	
	// create a dnode-protocol session
	var session = this.rpcSession = dnodeProtocol.Session();

	// create the API to send and recieve messages between parent and child
	// receive messages from the parent and only send to the local instance if
	// event is not in the local eventlist
	session.instance.emit = function(event) {
		if (self.localEvents.indexOf(event) === -1) {
			EventEmitter2.prototype.emit.apply(self, arguments);
		} else {
			EventEmitter2.prototype.emit.call(self, 'error', 'Received forbidden event from parent!', arguments);
		}
   	};
	
	// Something went wrong inside the session instance
	session.on('error', function(err) {
		EventEmitter2.prototype.emit.call(self, 'error', 'Local RPC Session error occured!', err);
	})

	// Something went wrong inside the remote session instance
	session.on('remoteError', function(methods) {
		EventEmitter2.prototype.emit.call(self, 'error', 'Remote RPC Session error occured!', methods);
	})
	
	// ah, the rpc session want to send something to the other side so send through!
	session.on('request', function(req) {
		parent.send(req);
	});
	
	// ah, the parent send initial RPC functions to use on this session
	session.on('remote', function(remoteApi) {
	});
	
	// ah, communication path is set up
	session.on('ready', function() {
		EventEmitter2.prototype.emit.call(self, 'rpcready');
	});
	
	// session must stop when parent exits!
	parent.on('exit', function() {
		// remove rpc session and remote api to prevent memory leaks
		if (this.rpcSession) {
			delete this.rpcSession;
		};
		self.remote = {};
		EventEmitter2.prototype.emit.call(self, 'rpcexit');
	});
	
	// message coming from the other side so give it to the session to handle it!
	parent.on('message', function(msg) {
		try { 
			session.handle(msg)
		} catch (err) {
			session.emit('error', err)
		}
	});
	
	// and startup RPC communications by sending local available functions/data
	session.start();
};