/**
 * Create child process with RPC communication over internal nodejs fork communication channel.
 * Also included are monitor and control functions for the lifecycle of the child process.
 * 
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

exports.EventChild = require('./eventchild');
exports.EventCom = require('./eventcom');

/**
 * Execute the following code at child startup in order to be 
 * able to receive events from the parent process.
 * Check if we are a child_process with message channel.
 * If so startup child event communications capabilities.
 * This adds parent property to the global process object
 */
if (process.send && !process.parent) {
  process.parent = new exports.EventCom();
  process.parent.startRpc(process);

  // execute only if forked by EventChild
  if (process.argv[1] === __filename) {
    // Rewrite `process.argv` so that `Module.runMain()`
    // will transparently locate and run the target script
    // and it will be completely unaware of this module
    process.argv.splice(1, 1);

    // Clear the module cache so anything required is reloaded as necessary.
    require('module').Module._cache = {};

    // Next tick to prevent a leak from function arguments or the call stack
    process.nextTick(function() {
        require('module').Module.runMain();
    });
  }
}