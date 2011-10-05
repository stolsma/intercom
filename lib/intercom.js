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

exports.Child = require('./child');
exports.Parent = require('./parent');
