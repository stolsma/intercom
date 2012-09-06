/**
 * The child side test of Intercom. 
 *
 * Copyright 2012 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

require('../../../lib/intercom');

// load the `weak` module if it is available in the node_module tree 
var weak;
try {
  weak = require('weak');
}
catch (err) {
  weak = undefined;
}

// the statistic counter
var counters = {
  wrap  : 0,
  cull  : 0,
  unwrap: 0
};

if (weak) {
  var session   = process.parent.rpcSession,
      oldWrap   = session.wrap,
      oldCull   = session.cull,
      oldUnwrap = session.unwrap;
  
  session.wrap = function() {
    counters.wrap++;
    return oldWrap.apply(session, arguments);
  };
  
  session.cull = function() {
    counters.cull++;
    return oldCull.apply(session, arguments);
  };
  
  session.unwrap = function() {
    counters.unwrap++;
    return oldUnwrap.apply(session, arguments);
  };
}

process.parent.on('parent::quitnow', function() {
  // start forced garbage collect and give some time to communicate
  gc();
  setTimeout(function() {
    console.log(JSON.stringify(counters));
    process.parent.disconnect();
  }, 100);
});

process.parent.on('child::function', function(nr, cb) {
  cb('received request ', nr);
});