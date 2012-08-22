/**
 * eventcom.js: Standard class for event communication after fork. 
 * Using dnode-protocol RPC communication over internal nodejs fork 
 * communication channel
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * Using the dnode-protocol package: https://github.com/substack/dnode-protocol
 *  Copyright 2010 James Halliday (mail@substack.net)
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var inherits = require('util').inherits,
  EventEmitter2 = require('eventemitter2').EventEmitter2,
  dnodeProtocol = require('dnode-protocol');

// eventEmitter2 constants
var EVENT_OPTIONS = {
      delimiter: '::',
      wildcard: true
    };

/**
 * Creates a new instance of EventCom with specified params.
 * @params {Object} options Configuration for this instance.
 */
var EventCom = module.exports = function(options) {
  // Setup list of event names that are used by this class and can 
  // therefore not be emitted to the other side!!! (to prevent circular emits)
  this.localEvents = ['error', 'stdout', 'stderr', 'warn', 'exit', 'start', 'restart', 'stop', 'rpcready', 'rpcexit']; 

  // rpc event session is not started yet
  this.started = false;

  // Call the parent EventEmitter2 constructor
  options           = options || {};
  EventEmitter2.call(this, options.eventOptions || EVENT_OPTIONS);
  
  this.on('error', function() {
    var msg = (arguments[1] && arguments[1] instanceof Error) ? arguments[1].message : arguments[0],
        stack = (arguments[1] && arguments[1] instanceof Error) ? arguments[1].stack : arguments[1];
    console.error(msg, stack, arguments);
  });
};
// Inherit from EventEmitter2
inherits(EventCom, EventEmitter2);

/**
 * Execute given function block when event communication is ready
 * @params {Function} readyFn Function to execute when event communication is ready
 */
EventCom.prototype.ready = function(readyFn) {
  var fn = readyFn.bind(this);
  // call the start function when event communication is running
  if (this.started) {
    process.nextTick(function(){
      fn();
    });
  } else {
    this.once('rpcready', fn);
  }
}

/**
 * On incoming events, send those events as messages to the twin side
 * and to the local emit function
 */
EventCom.prototype.emit = function emitHandler(event) {
  // Only send if the twin side has a message function, and the event isn't in local
  // event list!
  if (this.rpcSession && this.rpcSession.remote && this.rpcSession.remote.emit) {
    if (this.localEvents.indexOf(event) === -1) {
      this.rpcSession.remote.emit.apply(null, arguments);
    } else {
      this.localEmit('error', 'Received forbidden event!', arguments);
      return;
    }
  };
  // also send to local instance
  this.localEmit.apply(this, arguments);
}

/**
 * Local Emit of event and event arguments
 */
EventCom.prototype.localEmit = function() {
  EventEmitter2.prototype.emit.apply(this, arguments);
}

/**
 * Create this side of the RPC event communications channel
 * @param {Process/Child_Process} messenger Instance which will receive/send 'messages' through
 * the by fork created `message` event and `send()` function.
 */
EventCom.prototype.startRpc = function(messenger) {
  var self = this;
  if (!messenger.send) throw(new Error('No process.send function available!'));
  
  // create a dnode-protocol session
  var session = this.rpcSession = dnodeProtocol.Session();

  // create the API to send and recieve messages between process twins
  // receive messages from the twin and only send to the local instance if
  // event is not in the local eventlist
  session.instance.emit = function(event) {
    if (self.localEvents.indexOf(event) === -1) {
      self.localEmit.apply(self, arguments);
    } else {
      self.localEmit('error', 'Received forbidden event from twin process!', arguments);
    }
  };
  
  // Something went wrong inside the session instance
  session.on('error', function(err) {
    self.localEmit('error', 'Local RPC Session error occured!', err);
  })

  // Something went wrong inside the remote session instance
  session.on('remoteError', function(methods) {
    self.localEmit('error', 'Remote RPC Session error occured!', methods);
  })
  
  // ah, the rpc session want to send something to the other side so send through!
  session.on('request', function(req) {
    messenger.send(req);
  });
  
  // ah, the twin send initial RPC functions to use on this session
  session.on('remote', function(remoteApi) {
    if (!remoteApi.emit) {
      throw (new Error('Remote RPC Session does not have Emit function!!'));
    }
  });
  
  // ah, communication path is set up
  session.on('ready', function() {
    self.started = true;
    self.localEmit('rpcready');
  });
  
  // session must stop when given process/child_process exits!
  messenger.on('exit', function() {
    // remove rpc session and remote api to prevent memory leaks
    if (self.rpcSession) {
      delete self.rpcSession;
    };
    self.started = false;
    self.localEmit('rpcexit');
  });
  
  // message coming from the other side so give it to the session to handle it!
  messenger.on('message', function(msg) {
    session.handle(msg)
  });
  
  // and startup RPC communications by sending local available functions/data
  session.start();
};