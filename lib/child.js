/**
 * child.js: Standard class for Child fork service with sending events with a dnode RPC 
 * communication session over an internal nodejs fork communication channel
 *
 * Using the dnode-protocol package: https://github.com/substack/dnode-protocol, Copyright 2010 James Halliday (mail@substack.net)
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * Monitor functions adapted from Forever
 * (C) 2010 Charlie Robbins
 * MIT LICENCE
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var inherits = require('util').inherits,
	fs = require('fs'),
	path = require('path'),
	EventEmitter2 = require('eventemitter2').EventEmitter2,
	dnodeProtocol = require('dnode-protocol'),
	fork = require('node-fork');

// eventEmitter2 and comms constants
var EVENT_OPTIONS = {
	delimiter: '::',
	wildcard: true
};

/**
 * Creates a new instance of Child with specified params.
 * @params {string} script The target script to run.
 * @params {Object} options Configuration for this instance.
 */
var Child = module.exports = function(script, options) {
	// if called as function return Instance
	if (!(this instanceof Child)) return new Child(script, options);

	var self = this;
	
	// Setup list of event names that are used by this class and can 
	// therefore not be emitted to the other side!!! (to prevent circular emits)
	this.localEvents = ['error', 'stdout', 'stderr', 'warn', 'exit', 'start', 'restart', 'stop', 'rpcready', 'rpcexit']; 

	// Setup basic configuration options
	options           = options || {};
	this.eventOptions = options.eventOptions || EVENT_OPTIONS;
	this.forever      = options.forever || false;
	this.max          = options.max;
	this.childExists  = false;
	this.times        = 10;
	
	// Setup restart timing. These options control how quickly Child restarts
	// a child process as well as when to kill a "spinning" process
	this.minUptime     = typeof options.minUptime !== 'number' ? 0 : options.minUptime;
	this.spinSleepTime = options.spinSleepTime || null;
	
	// Setup the options to pass to the script to start
	this.script    = script;
	this.options   = options.options || [];
	this.spawnWith = options.spawnWith || {};
	this.sourceDir = options.sourceDir;
	this.cwd       = options.cwd || null;
	this.env       = options.env || {};
	this.hideEnv   = options.hideEnv || [];
	this._hideEnv  = {};
	
	// Create a simple mapping of `this.hideEnv` to an easily indexable object
	this.hideEnv.forEach(function(key) {
		self._hideEnv[key] = true;
	});
	
	if (this.sourceDir) {
		this.script = path.join(this.sourceDir, this.script);
	}
	
	// check if the requested script to fork exists
	try {
		var stats = fs.statSync(this.script);
		this.childExists = true;
	} catch (ex) {}
	
	// Call the parent EventEmitter2 constructor
	EventEmitter2.call(this, this.eventOptions);
};
// Inherit from EventEmitter2
inherits(Child, EventEmitter2);


/**
 * Start the process that this instance is configured for
 * @param {boolean} restart Value indicating whether this is a restart.
 * @returns {Child} Created Child instance for later control and chaining...
 */
Child.prototype.start = function(restart) {
	var self = this;

	if (this.running && !restart) {
		process.nextTick(function () {
			EventEmitter2.prototype.emit.call(self, 'error', new Error('Cannot start process that is already running.'));
		});
	}

	var child = this.tryFork();
	if (!child) {
		this.child = null;
		process.nextTick(function() {
			EventEmitter2.prototype.emit.call(self, 'error', new Error('Forking Error!'));
		});
		return this;
	}

	this.ctime = Date.now();
	this.child = child;
	this.running = true;

	process.nextTick(function() {
		EventEmitter2.prototype.emit.call(self, restart ? 'restart' : 'start', self, self.data);
	});

	// Hook all stream data and process it
	function listenTo(stream) {
		function ldata(data) {
			EventEmitter2.prototype.emit.call(self, stream, data);
		}

		child[stream].on('data', ldata);

		child.on('exit', function() {
			child[stream].removeListener('data', ldata);
		});
	}

	// Listen to stdout and stderr
	listenTo('stdout');
	listenTo('stderr');

	// listen to child exit event
	child.on('exit', function(code) {
		var spinning = Date.now() - self.ctime < self.minUptime;
		EventEmitter2.prototype.emit.call(this, 'warn', 'Child detected script exited with code: ' + code);

		function letChildDie() {
			self.running = false;
			self.forceStop = false;
			EventEmitter2.prototype.emit.call(this, 'exit', self, spinning);
		}

		function restartChild() {
			self.forceRestart = false;
			process.nextTick(function() {
				EventEmitter2.prototype.emit.call(this, 'warn', 'Intercom restarting child for the ' + self.times + ' time');
				self.start(true);
			});
		}
		
		// increment (re)start times
		self.times++;
		
		if (self.forceStop || (!self.forever && self.times >= self.max)
				|| (spinning && typeof self.spinSleepTime !== 'number') && !self.forceRestart) {
			letChildDie();
		} else if (spinning) {
			setTimeout(restartChild, self.spinSleepTime);
		} else {
			restartChild();
		}
	});
	
	// start in-band event communications with the child
	this.startRpc(child);
	
	return this;
};


/**
 * Tries to fork the target Child child process. It checks the childExists
 * property to see if the script exists.
 * @returns {ChildProcess/Boolean} Returns the created child process or false if 
 * something went wrong
 */
Child.prototype.tryFork = function() {
	if (!this.childExists) {
		return false;
	}
	
	this.spawnWith.cwd = this.cwd || this.spawnWith.cwd;
	this.spawnWith.env = this._getEnv();
	this.spawnWith.customFds = this.spawnWith.customFds || [-1, -1, -1];

	try {
		return fork(this.script, this.options, this.spawnWith);
	} catch (err) {
		return false;
	}
};

/**
 * On incoming events, send those events as messages to the client
 * and to the local emit function
 */
Child.prototype.emit = function emitHandler(event) {
	// Only send if the client has a message function, and the event isn't in local
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
 * @param {ChildProcess} child Instance which will receive/send 'messages' through
 * the `message` event and `send()` function.
 */
Child.prototype.startRpc = function(child) {
	var self = this;
	if (!child.send) throw(new Error('No process.send function available! Probably no nodejs 6.x or node-fork installed!'));
	
	// create a dnode-protocol session
	var session = this.rpcSession = dnodeProtocol.Session();

	// create the API to send and recieve messages between parent and child
	// receive messages from the child and only send to the local instance if
	// event is not in the local eventlist
	session.instance.emit = function(event) {
		if (self.localEvents.indexOf(event) === -1) {
			EventEmitter2.prototype.emit.apply(self, arguments);
		} else {
			EventEmitter2.prototype.emit.call(self, 'error', 'Received forbidden event from child!', arguments);
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
		child.send(req);
	});
	
	// ah, the child send initial RPC functions to use on this session
	session.on('remote', function(remoteApi) {
	});
	
	// ah, communication path is set up
	session.on('ready', function() {
		EventEmitter2.prototype.emit.call(self, 'rpcready');
	});
	
	// session must stop when child exits!
	child.on('exit', function() {
		// remove rpc session and remote api to prevent memory leaks
		if (self.rpcSession) {
			delete self.rpcSession;
		};
		self.remote = {};
		EventEmitter2.prototype.emit.call(self, 'rpcexit');
	});
	
	// message coming from the other side so give it to the session to handle it!
	child.on('message', function(msg) {
		try { 
			session.handle(msg)
		} catch (err) {
			session.emit('error', err)
		}
	});
	
	// and startup RPC communications by sending local available functions/data
	session.start();
};


/**
 * Responds with the appropriate information about
 * this `Child` instance and it's associated child process.
 * @returns {Object}
 */
Child.prototype.__defineGetter__('data', function() {
	var self = this;

	if (!this.running) {
		return {};
	}

	var childData = {
		ctime: this.ctime,
		script: this.script,
		options: this.options,
		pid: this.child.pid,
	};

	['env', 'cwd'].forEach(function(key) {
		if (self[key]) {
			childData[key] = self[key];
		}
	});

	this.childData = childData;
	return this.childData;
});


/**
 * Restarts the target script associated with this instance.
 */
Child.prototype.restart = function() {
	this.forceRestart = true;
	return this.kill(false);
};

/**
 * Stops the target script associated with this instance. Prevents it from auto-respawning.
 */
Child.prototype.stop = function() {
	return this.kill(true);
};

/**
 * Kills the ChildProcess object associated with this instance.
 * @param {boolean} forceStop Value indicating whether short circuit forever auto-restart.
 */
Child.prototype.kill = function(forceStop) {
	var self = this;

	if (!this.child || !this.running) {
		process.nextTick(function() {
			EventEmitter2.prototype.emit.call(self, 'error', new Error('Cannot stop process that is not running.'));
		});
	} else {
		// Set an instance variable here to indicate this
		// stoppage is forced so that when `child.on('exit', ..)`
		// fires in `Child.prototype.start` we can short circuit
		// and prevent auto-restart
		if (forceStop) {
			this.forceStop = true;
		}

		this.child.kill();
		EventEmitter2.prototype.emit.call(self, 'stop', this.childData);
	}

	return this;
};

/**
 * Returns the environment variables that should be passed along
 * to the target process spawned by this instance.
 * @returns {Object} 
 * @private
 */
Child.prototype._getEnv = function() {
	var self = this,
		merged = {};

	function addKey(key, source) {
		merged[key] = source[key];
	}
  
	// Mixin the key:value pairs from `process.env` and the custom
	// environment variables in `this.env`.
	Object.keys(process.env).forEach(function(key) {
		if (!self._hideEnv[key]) {
			addKey(key, process.env);
		}
	});

	Object.keys(this.env).forEach(function(key) {
		addKey(key, self.env);
	});

	return merged;
};