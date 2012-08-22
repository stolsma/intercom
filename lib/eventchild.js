/**
 * eventchild.js: EventChild class for event communication with a child after fork. 
 * Using dnode-protocol RPC communication over internal nodejs fork communication channel

 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * Using the dnode-protocol package: https://github.com/substack/dnode-protocol
 * Copyright 2010 James Halliday (mail@substack.net)
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
    EventCom = require('./eventcom');

/**
 * Creates a new instance of EventChild with specified params.
 * @params {string} script The target script to run.
 * @params {Object} options Configuration for this instance.
 */
var EventChild = module.exports = function(script, options) {
  // if called as function return Instance
  if (!(this instanceof EventChild)) return new EventChild(script, options);
  var self = this;
  
  // fork function to use
  this.fork = require('child_process').fork;
  
  // Setup basic configuration options
  options           = options || {};
  this.forever      = options.forever || false;
  this.max          = options.max;
  this.childExists  = false;
  this.times        = 0;
  
  // Setup restart timing. These options control how quickly EventChild restarts
  // a child process as well as when to kill a "spinning" process
  this.minUptime     = typeof options.minUptime !== 'number' ? 0 : options.minUptime;
  this.spinSleepTime = options.spinSleepTime || null;
  
  // Setup the options to pass to the script to start
  this.script    = script;
  this.visible   = options.visible || false;
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
  
  // Call the parent EventCom constructor
  EventCom.call(this, this.eventOptions);
};
// Inherit from EventCom
inherits(EventChild, EventCom);


/**
 * Start the process that this instance is configured for
 * @params {boolean} restart Value indicating whether this is a restart.
 * @returns {EventChild} EventChild (this) instance for later control and chaining...
 */
EventChild.prototype.start = function(restart) {
  var self = this;

  if (this.running && !restart) {
    process.nextTick(function () {
      self.localEmit('error', new Error('Cannot start process that is already running.'));
    });
  }

  var child = this.tryFork();
  if (!child) {
    this.child = null;
    process.nextTick(function() {
      self.localEmit('error', new Error('Forking Error!'));
    });
    return this;
  }

  this.ctime = Date.now();
  this.child = child;
  this.running = true;

  process.nextTick(function() {
    self.localEmit(restart ? 'restart' : 'start', self, self.data);
  });

  // Hook all stream data and process it
  function listenTo(stream) {
    function ldata(data) {
      self.localEmit(stream, data);
    }

    if (child[stream]) {
      child[stream].on('data', ldata);

      child.on('exit', function() {
        child[stream].removeListener('data', ldata);
      });
    }
  }

  // Listen to stdout and stderr
  listenTo('stdout');
  listenTo('stderr');

  // listen to child exit event
  child.on('exit', function(code) {
    var spinning = Date.now() - self.ctime < self.minUptime;
    self.localEmit('warn', 'Child detected script exited with code: ' + code);

    function letChildDie() {
      self.running = false;
      self.forceStop = false;
      self.localEmit('exit', self, spinning);
    }

    function restartChild() {
      self.forceRestart = false;
      process.nextTick(function() {
        self.localEmit('warn', 'Intercom restarting child for the ' + self.times + ' time');
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
 * Tries to fork the target child process. It checks the childExists
 * property to see if the script exists.
 * @returns {ChildProcess/Boolean} Returns the created child process or false if 
 * something went wrong
 */
EventChild.prototype.tryFork = function() {
  if (!this.childExists) {
    return false;
  }
  
  var options = this.options.slice(),
      script = this.script;
  
  if (!this.visible) {
    // add the script to call in front
    options.unshift(script);
    script = path.join(__dirname, 'intercom.js');
  }
  
  // if not set make fork visible as intercom will handle it
  this.spawnWith.visible = this.spawnWith.visible || true;
  
  this.spawnWith.cwd = this.cwd || this.spawnWith.cwd;
  this.spawnWith.env = this._getEnv();
  this.spawnWith.stdio = [ 'pipe', 'pipe', 'pipe', 'ipc' ];

  try {
    return this.fork(script, options, this.spawnWith);
  } catch (err) {
    return false;
  }
};


/**
 * Responds with the appropriate information about
 * this `EventChild` instance and it's associated child process.
 * @returns {Object}
 */
EventChild.prototype.__defineGetter__('data', function() {
  var self = this;

  if (!this.running) {
    return {};
  }

  var childData = {
    ctime: this.ctime,
    script: this.script,
    options: this.options,
    pid: this.child.pid
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
EventChild.prototype.restart = function() {
  this.forceRestart = true;
  return this.kill(false);
};

/**
 * Stops the target script associated with this instance. Prevents it from auto-respawning.
 */
EventChild.prototype.stop = function() {
  return this.kill(true);
};

/**
 * Kills the ChildProcess object associated with this instance.
 * @param {boolean} forceStop Value indicating whether short circuit auto-restart.
 */
EventChild.prototype.kill = function(forceStop) {
  var self = this;

  if (!this.child || !this.running) {
    process.nextTick(function() {
      self.localEmit('error', new Error('Cannot stop process that is not running.'));
    });
  } else {
    // Set an instance variable here to indicate this
    // stoppage is forced so that when `child.on('exit', ..)`
    // fires in `EventChild.prototype.start` we can short circuit
    // and prevent auto-restart
    if (forceStop) {
      this.forceStop = true;
    }

    this.child.kill();
    self.localEmit('stop', this.childData);
  }

  return this;
};

/**
 * Returns the environment variables that should be passed along
 * to the target process spawned by this instance.
 * @returns {Object} 
 * @private
 */
EventChild.prototype._getEnv = function() {
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