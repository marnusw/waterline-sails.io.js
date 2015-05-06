/**
 * Test runner dependencies
 */
var util = require('util');
var mocha = require('mocha');
var log = new (require('captains-log'))();


var TestRunner = require('waterline-adapter-tests');
var Adapter = require('../../lib/adapter');


// Grab targeted interfaces from this adapter's `package.json` file:
var packageJson = {};
var interfaces = [];
try {
  packageJson = require('root-require')('package.json');
  interfaces = packageJson['waterlineAdapter'].interfaces;
} catch (e) {
  throw new Error(
    '\n' +
    'Could not read supported interfaces from "waterlineAdapter"."interfaces"' + '\n' +
    'in this adapter\'s `package.json` file ::' + '\n' +
    util.inspect(e)
  );
}


log.info('Testing `' + packageJson.name + '`, a Sails adapter.');
log.info('Running `waterline-adapter-tests` against ' + interfaces.length + ' interfaces...');
log.info('( ' + interfaces.join(', ') + ' )');
console.log();
log('Latest draft of Waterline adapter interface spec:');
log('https://github.com/balderdashy/sails-docs/blob/master/adapter-specification.md');
console.log();


/**
 * Integration Test Runner
 *
 * Uses the `waterline-adapter-tests` module to
 * run mocha tests against the specified interfaces
 * of the currently-implemented Waterline adapter API.
 */
new TestRunner({

  // Load the adapter module.
  adapter: Adapter,

  // Default adapter config to use.
  config: {
    schema: false
  },

  // The set of adapter interfaces to test against.
  // (grabbed these from this adapter's package.json file above)
  interfaces: interfaces

  // Most databases implement 'semantic' and 'queryable'.
  //
  // As of Sails/Waterline v0.10, the 'associations' interface
  // is also available.  If you don't implement 'associations',
  // it will be polyfilled for you by Waterline core.  The core
  // implementation will always be used for cross-adapter / cross-connection
  // joins.
  //
  // In future versions of Sails/Waterline, 'queryable' may be also
  // be polyfilled by core.
  //
  // These polyfilled implementations can usually be further optimized at the
  // adapter level, since most databases provide optimizations for internal
  // operations.
  //
  // Full interface reference:
  // https://github.com/balderdashy/sails-docs/blob/master/adapter-specification.md
});
