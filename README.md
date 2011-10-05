# Intercom

* Create child processes with dnode-protocol based event communication over internal nodejs fork communication channel with monitor and control functions for the lifecycle of the created child process. *

# Using Intercom

The code almost speaks for itself: see the example directory!!

# Code documentation

## The Child class

The `Child` class is able to fork and control the lifecycle of a child process with a dnode-protocol based event channel between parent and child process.
Events emitted on the `Child` instance created in the child process are transported to the mirror `Parent` class in the child process and emitted there too! 

The `Child` class has 7 important functions:

  * `constructor(script, options)` The constructor takes two arguments: `script` and `options`. The script is the script to start in the child process. The options are described in the options section.
  * `start()` Start the target script in a new child process (if not already started) and starts up the event communication channel.
  * `emit(event, [argument1], [argument2]...[argumentx])` Emit an event on the child process Child instance
  * `on(event, callback)` React on a defined child event 
  * `onAny(callback)`  React on any child event
  * `restart()`  Restarts the target script child process associated with this instance.
  * `stop()` Stops the target script associated with this instance. Prevents it from auto-respawning.  
  
See [EventEmitter2](https://github.com/hij1nx/EventEmitter2) for more information on the `emit`, `on` `onAny` and other function standard available on EventEmitter2 classes.  
  
### Constructor options

``` js
  {
    // Basic configuration options
    'eventOptions': {           // Options for the EventEmitter2 constructor. See EventEmitter2!!
       delimiter: '::',
       wildcard: true
     },
    'forever': true,            // Indicates that this script should run forever
    'max': 10,                  // Sets the maximum number of times a given script should run
    
    // These options control how quickly parent restarts a child process
    // as well as when to kill a "spinning" process
    'minUptime': 2000,          // Minimum time a child process has to be up. Forever will 'exit' otherwise.
    'spinSleepTime': 1000,      // Interval between restarts if a child is spinning (i.e. alive < minUptime).
    
    // Command to spawn as well as options and other vars 
    // (env, cwd, etc) to pass along
    'options': ['foo','bar'],   // Additional arguments to pass to the script,
    'sourceDir': 'script/path'  // Directory that the source script is in
    
    // All or nothing options passed along to `child_process.fork`.
    'spawnWith': {
      env: process.env,         // Information passed along to the child process
      customFds: [-1, -1, -1],  // that forever spawns.
      setsid: false
    },
    
    // More specific options to pass along to `child_process.spawn` which 
    // will override anything passed to the `spawnWith` option
    'env': { 'ADDITIONAL': 'CHILD ENV VARS' }
    'cwd': '/path/to/child/working/directory'
  }
```

### Events available when using an instance of Child

Each Child object is an instance of EventEmitter2. There are several core events that you can listen for. This are also the events types you cannot use to send over de communication channel!!:

* **error**    _[err, info]:_           Raised when an error occurs
* **start**    _[child, child_data]:_   Raised when the target script is first started.
* **stop**     _[child_data]:_          Raised when the target script is stopped by the user
* **restart**  _[child]:_               Raised each time the target script is restarted
* **exit**     _[child]:_               Raised when the target script actually exits (permenantly).
* **stdout**   _[data]:_                Raised when data is received from the child process' stdout
* **stderr**   _[data]:_                Raised when data is received from the child process' stderr
* **warn**     _[err, info]:_           Raised when something unexpected happens but there is no need to break the codeflow

The following two events are related to the dnode-protocol RPC session:

* **rpcready**  _[]:_                   Raised when the dnode-protocol RPC session is up and running and events can be send and received
* **rpcexit**   _[]:_                   Raised when the dnode-protocol RPC session has ended. events won't be send to the child process anymore.


## The Parent class

The `Parent` class creates a dnode-protocol based event channel between parent and child process using by fork created `message` event and `send()` function.
Events emitted on the `Parent` instance created in the child process are transported to the mirror `Child` class in the parent process and emitted there too! 

The `Parent` class has 7 important functions:

  * `constructor(startupFn, options)` The constructor takes two arguments. The startupFn is the callback function to call when the event communication channel is ready to be used. The options are described in the options section.
  * `emit(event, [argument1], [argument2]...[argumentx])` Emit an event on the parent process Child instance
  * `on(event, callback)` React on a defined parent event 
  * `onAny(callback)`  React on any parent event
  
See [EventEmitter2](https://github.com/hij1nx/EventEmitter2) for more information on the `emit`, `on` `onAny` and other function standard available on EventEmitter2 classes.  

### Constructor options

``` js
  {
    // Basic configuration options
    'eventOptions': {           // Options for the EventEmitter2 constructor. See EventEmitter2!!
       delimiter: '::',
       wildcard: true
     }
  }
```

### Events available when using an instance of Child

Each Child object is an instance of EventEmitter2. There are several core events that you can listen for. This are also the events types you cannot use to send over de communication channel!!:

* **error**    _[err, info]:_           Raised when an error occurs
* **warn**     _[err, info]:_           Raised when something unexpected happens but there is no need to break the codeflow

The following two events are related to the dnode-protocol RPC session:

* **rpcready**  _[]:_                   Raised when the dnode-protocol RPC session is up and running and events can be send and received
* **rpcexit**   _[]:_                   Raised when the dnode-protocol RPC session has ended. events won't be send to the child process anymore.
  

Documentation License
=====================

Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License

http://creativecommons.org/licenses/by-nc-sa/3.0/

Copyright (c)2011 [TTC](http://www.tolsma.net)/[Sander Tolsma](http://sander.tolsma.net/)


Code License
============

[MIT License](http://www.opensource.org/licenses/mit-license.php)

Copyright (c)2011 [TTC](http://www.tolsma.net)/[Sander Tolsma](http://sander.tolsma.net/)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.