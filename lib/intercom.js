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

// check if we are a child_process with message channel
// if so startup child event communications capabilities
// This adds parent property to the global process object
if (process.send) {
	process.parent = new exports.EventCom();
	process.parent.startRpc(process);
}