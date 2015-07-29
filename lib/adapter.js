/**
 * Copyright 2015, Marnus Weststrate
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
var Socket = require('./socket');


/**
 * @module waterline-sails.io.js Adapter
 *
 * sails.io.js adapter for Sails / Waterline when using Waterline on a client to communicate with a Sails server.
 */
module.exports = (function() {

  // A reference to each connection registered with this adapter.
  var connections = {};

  var Adapter = {

    identity: 'waterline-sails.io.js',

    // Whether this adapter is syncable
    // Not syncable since we're interfacing with the established server API.
    syncable: false,

    // Default configuration for connections, a local Sails.js server
    // Allow a schemaless data store
    defaults: {
      protocol: 'http',   // HTTP protocol (http | https)
      host: 'localhost',  // api host name
      port: 1337,         // api port
      basePath: '/api',   // base api path
      autoConnect: true   // eager/lazy connect the web-socket
    },


    /**
     * This method runs when a model is initially registered with a Waterline instance. It
     * registers a new connection to use with these collections.
     *
     * @param  {Object} connection The connection used to persist these collections.
     * @param  {Object} collections The collections using this connection, indexed by identity.
     * @param  {Function} cb Node.js type async callback.
     */
    registerConnection: function(connection, collections, cb) {

      if (!connection.identity) {
        // Error message taken from waterline-errors/modules/adapter.IdentityMissing
        return cb('Connection is missing an identity');
      }
      if (connections[connection.identity]) {
        // Error message taken from waterline-errors/modules/adapter.IdentityDuplicate
        return cb('Connection is already registered');
      }

      connections[connection.identity] = new Socket(connection, collections);
      cb();
    },

    /**
     * Tear down a Connection when the ORM shuts down, or all connections if the connection
     * identifier is not specified.
     *
     * @param {String} conn The identity of the connection to tear down.
     * @param {Function} [cb] A Node.js type async callback.
     */
    teardown: function(conn, cb) {
      if (typeof conn == 'function') {
        cb = conn;
        conn = null;
      }

      if (!conn) {
        Object.keys(connections).forEach(this.teardown(conn));
        connections = {};
      }
      else if (connections[conn]) {
        connections[conn].teardown();
        delete connections[conn];
      }

      cb && cb();
    },


    ///////////////////////////////////////////////////////////////////////////////////////////
    /// Semantic Interface
    ///////////////////////////////////////////////////////////////////////////////////////////
    /**
     * Implements calls to Model.find(), Model.findOne(), or related. This method responds with an
     * array of records, the Waterline core takes care of supporting all the other different
     * find methods/usages.
     *
     * If the `simulateDelay` option was specified the request is delayed for so many milliseconds in development.
     *
     * @param {String} connection The connection identifier of the collection being queried.
     * @param {String} collection The identity of the collection being queried.
     * @param {{where: {Object}, limit: {number}, skip: {number}, sort: {string}}} options Provided query options.
     * @param {Function} cb A Node.js type callback with an error or the results: `function(err, results) {}`.
     */
    find: function(connection, collection, options, cb) {
      if (process.env.NODE_ENV !== "production") {
        var conn = grabConnection(connection);
        var executeNow = function() {
          conn.select(collection, options, cb);
        };
        conn.config.simulateDelay ? setTimeout(executeNow, conn.config.simulateDelay) : executeNow();
        return;
      }

      grabConnection(connection).select(collection, options, cb);
    },

    /**
     * Implements calls to Model.create(). This method responds with an array of created records.
     *
     * If the `simulateDelay` option was specified the request is delayed for so many milliseconds in development.
     *
     * @param {String} connection The connection identifier of the collection being queried.
     * @param {String} collection The identity of the collection being queried.
     * @param {Function} cb A Node.js type callback with an error or the results: `function(err, results) {}`.
     */
    create: function(connection, collection, values, cb) {
      if (process.env.NODE_ENV !== "production") {
        var conn = grabConnection(connection);
        var executeNow = function() {
          conn.insert(collection, values, cb);
        };
        conn.config.simulateDelay ? setTimeout(executeNow, conn.config.simulateDelay) : executeNow();
        return;
      }

      grabConnection(connection).insert(collection, values, cb);
    },

    /**
     * Implements calls to Model.update(). This method responds with an array of updated records.
     *
     * If the `simulateDelay` option was specified the request is delayed for so many milliseconds in development.
     *
     * @param {String} connection The connection identifier of the collection being queried.
     * @param {String} collection The identity of the collection being queried.
     * @param {{where: {Object}, limit: {number}, skip: {number}, sort: {string}}} options Provided query options.
     * @param {Object} values The new values to update the matched records with.
     * @param {Function} cb A Node.js type callback with an error or the results: `function(err, results) {}`.
     */
    update: function(connection, collection, options, values, cb) {
      if (process.env.NODE_ENV !== "production") {
        var conn = grabConnection(connection);
        var executeNow = function() {
          conn.update(collection, options, values, cb);
        };
        conn.config.simulateDelay ? setTimeout(executeNow, conn.config.simulateDelay) : executeNow();
        return;
      }

      grabConnection(connection).update(collection, options, values, cb);
    },

    /**
     * Implements calls to Model.destroy(). This method responds with an array of destroyed records.
     *
     * If the `simulateDelay` option was specified the request is delayed for so many milliseconds in development.
     *
     * @param {String} connection The connection identifier of the collection being queried.
     * @param {String} collection The identity of the collection being queried.
     * @param {{where: {Object}, limit: {number}, skip: {number}, sort: {string}}} options Provided query options.
     * @param {Function} cb A Node.js type callback with an error or the results: `function(err, results) {}`.
     */
    destroy: function(connection, collection, options, cb) {
      if (process.env.NODE_ENV !== "production") {
        var conn = grabConnection(connection);
        var executeNow = function() {
          conn.destroy(collection, options, cb);
        };
        conn.config.simulateDelay ? setTimeout(executeNow, conn.config.simulateDelay) : executeNow();
        return;
      }

      grabConnection(connection).destroy(collection, options, cb);
    },

    ///////////////////////////////////////////////////////////////////////////////////////////
    /// Semantic Interface
    ///////////////////////////////////////////////////////////////////////////////////////////
    /**
     * Handle additions to associations by posting to the `Blueprints` route:
     *
     *     POST /:model/:record/:association/:record_to_add?
     *
     * If the `simulateDelay` option was specified the request is delayed for so many milliseconds in development.
     * If a `Promise` is supported one is returned when a `cb` is not provided.
     *
     * @param {String} connection The connection identifier of the collection being queried.
     * @param {String} collection The identity of the collection being queried.
     * @param {{id: {number}, association: {string}, [foreignId]: {number}, [foreignData]: {Object}}} options
     *        The is of the primary record and association to modify; either a `foreignId` or `foreignData` is required.
     * @param {Function} cb A Node.js type callback with an error or the results: `function(err, results) {}`.
     */
    addTo: function(connection, collection, options, cb) {
      var conn = grabConnection(connection);
      var target = assocTarget(conn.basePath, collection, options);

      if (!cb && Promise) {
        return new Promise(function(resolve, reject) {

          if (process.env.NODE_ENV !== "production") {
            var executeNow = function() {
              conn.socketRequest('post', target.url, target.data, function(err, result) {
                err ? reject(err) : resolve(result);
              });
            };
            conn.config.simulateDelay ? setTimeout(executeNow, conn.config.simulateDelay) : executeNow();
            return;
          }

          conn.socketRequest('post', target.url, target.data, function(err, result) {
            err ? reject(err) : resolve(result);
          });
        });
      }

      if (process.env.NODE_ENV !== "production") {
        var executeNow = function() {
          conn.socketRequest('post', target.url, target.data, cb);
        };
        conn.config.simulateDelay ? setTimeout(executeNow, conn.config.simulateDelay) : executeNow();
        return;
      }

      conn.socketRequest('post', target.url, target.data, cb);
    },

    /**
     * Handle removals from associations by posting to the `Blueprints` route:
     *
     *     DELETE /:model/:record/:association/:record_to_remove?
     *
     * If the `simulateDelay` option was specified the request is delayed for so many milliseconds in development.
     * If a `Promise` is supported one is returned when a `cb` is not provided.
     *
     * @param {String} connection The connection identifier of the collection being queried.
     * @param {String} collection The identity of the collection being queried.
     * @param {{id: {number}, association: {string}, [foreignId]: {number}, [foreignData]: {Object}}} options
     *        The is of the primary record and association to modify; either a `foreignId` or `foreignData` is required.
     * @param {Function} cb A Node.js type callback with an error or the results: `function(err, results) {}`.
     */
    removeFrom: function(connection, collection, options, cb) {
      var conn = grabConnection(connection);
      var target = assocTarget(conn.basePath, collection, options);

      if (!cb && Promise) {
        return new Promise(function(resolve, reject) {

          if (process.env.NODE_ENV !== "production") {
            var executeNow = function() {
              conn.socketRequest('delete', target.url, target.data, function(err, result) {
                err ? reject(err) : resolve(result);
              });
            };
            conn.config.simulateDelay ? setTimeout(executeNow, conn.config.simulateDelay) : executeNow();
            return;
          }

          conn.socketRequest('delete', target.url, target.data, function(err, result) {
            err ? reject(err) : resolve(result);
          });
        });
      }

      if (process.env.NODE_ENV !== "production") {
        var executeNow = function() {
          conn.socketRequest('delete', target.url, target.data, cb);
        };
        conn.config.simulateDelay ? setTimeout(executeNow, conn.config.simulateDelay) : executeNow();
        return;
      }

      conn.socketRequest('delete', target.url, target.data, cb);
    },

    ///////////////////////////////////////////////////////////////////////////////////////////
    /// Direct to the sails.io.js Socket Client
    ///////////////////////////////////////////////////////////////////////////////////////////
    /**
     * Run one of the sails.io.js methods against the actual socket. The callback signature
     * differs in that it is a Node like callback with a possible error object returned on
     * the first parameter, the response body on the second parameter for successful requests,
     * and the untouched `jwres` object on the third parameter for special use cases:
     * `function(err, body, jwres)`
     *
     * This serves the same purpose as the `.native()` and `.query()` methods on the MongoDB
     * and SQL adapters respectively.
     *
     * For details on the available methods see: [http://sailsjs.org/#!/documentation/reference/websockets/sails.io.js]
     *
     * @param {String} connection The connection identifier of the collection being queried.
     * @param {String} collection The identity of the collection being queried.
     * @param {String} method
     * @param {String} url
     * @param {Object} data Passed as query params for get & delete, and as a JSON body on put & post.
     * @param {Function} cb `function(err, data, jwres)`
     */
    sailsIoSocket: function(connection, collection, method, url, data, cb) {
      if (process.env.NODE_ENV !== "production") {
        var conn = grabConnection(connection);
        var executeNow = function() {
          conn.socketRequest(method, url, data, cb);
        };
        conn.config.simulateDelay ? setTimeout(executeNow, conn.config.simulateDelay) : executeNow();
        return;
      }

      grabConnection(connection).socketRequest(method, url, data, cb);
    },

    ///////////////////////////////////////////////////////////////////////////////////////////
    /// Associations Interface
    ///////////////////////////////////////////////////////////////////////////////////////////
    /**
     * When a call to `find()` is followed by a call to `populate()`, typically in the form
     * `Model.find(query).populate('attrName1').populate('attrName2').then(function(records) {...})`
     * the initial call to find is intercepted by Waterline before the `find()` method of
     * the adapter is called and rerouted to this `join()` method if it is present on the
     * adapter. (If not, Waterline will perform separate finds and join the results in memory.)
     *
     * Usually a join requires complicated operations to pull data together from the underlying
     * persistence mechanism or service. In this case, however, the actual joins will be handled
     * by the server and we just have to pass the fields to populate as an array on the `populate`
     * property of the query.
     *
     * The criteria contains the `where`, `limit`, `skip` and `sort` query criteria along with a
     * `joins` array created by the Waterline core. The last should be used to compile the necessary
     * join query, but in this case is simply used to build up the `populate` array before passing
     * it along with the other criteria to the standard `find()` method on this adapter.
     *
     * The provided callback should receive the resulting records with populated records which
     * is precisely what the `find()` method already provides.
     *
     * todo Support crossAdapter queries/feature here.
     *
     * @param {String} connection The connection identifier of the collection being queried.
     * @param {String} collection The identity of the collection being queried.
     * @param {{where: {Object}, limit: {number}, skip: {number}, sort: {string},
     *          populate: {Array}, joins: {Object}}} criteria The search criteria, including a generate `joins` prop.
     * @param {Function} cb function(err, records) {...}, the final joined records should be passed.
     */
    join: function(connection, collection, criteria, cb) {
      criteria.populate = criteria.joins.map(function(join) {
        return join.alias; // The name of the attribute of this association on the parent.
      });
      delete criteria.joins; // No further use for the joins object.

      this.find(connection, collection, criteria, cb);
    }
  };

  ///////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Convert a `collection` name and `options` to an association `target.url` and `target.data`.
   *
   * @param {String} basePath The base api path prefixed to all api queries.
   * @param {String} collection The identity of the collection being queried.
   * @param {{id: {number}, association: {string}, [foreignId]: {number}, [foreignData]: {Object}}} options
   *        The is of the primary record and association to modify; either a `foreignId` or `foreignData` is required.
   * @returns {{url: string, [data]: Object}}
   */
  function assocTarget(basePath, collection, options) {
    if (process.env.NODE_ENV !== "production") {
      if (!options || !options.id || !options.association || (!options.foreignId && !options.foreignData)) {
        throw new Error('Changing association ' + (options ? options.association : '') + ': options must contain ' +
          ' a id, association, and either foreignId or foreignData');
      }
    }
    var target = {
      url: basePath + collection + '/' + options.id + '/'+ options.association
    };

    if (options.foreignId) {
      target.url += '/' + options.foreignId;
    }
    else {
      target.data = options.foreignData;
    }
    return target;
  }

  /**
   * Grab the connection object for a connection name
   *
   * @param {String} connectionName
   * @returns {Object}
   * @private
   */
  function grabConnection(connectionName) {
    return connections[connectionName];
  }

  // Expose the adapter definition
  return Adapter;

})();

