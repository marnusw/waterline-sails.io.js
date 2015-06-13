/**
 * Copyright 2015, Marnus Weststrate
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
'use strict';
var Socket = require('./socket');
var Errors = require('waterline-errors').adapter;


/**
 * waterline-sails.io.js
 *
 * ## Error object
 *
 * If a web socket request responds with an error an error-object is returned via the callback.
 * For a 400 status code (validation errors) the object has the form:
 *
 *     {
 *       statusCode: 400,
 *       type: 'E_VALIDATION',
 *       validation: true,
 *       messages: jwres.body
 *     }
 *
 * For a 401 status code (unauthorized) the object has the form:
 *
 *     {
 *       statusCode: 401,
 *       type: 'E_UNAUTHORIZED',
 *       unauthorized: true,
 *       validation: true,
 *       messages: jwres.body
 *     }
 *
 * For a 404 status code (not found) the object has the form:
 *
 *     {
 *       statusCode: 404,
 *       type: 'E_NOT_FOUND',
 *       notFound: true,
 *       messages: jwres.body
 *     }
 *
 * For all other status codes the object has the form:
 *
 *     {
 *       statusCode: <code>,
 *       type: 'E_FATAL',
 *       fatal: true,
 *       message: jwres.body
 *     }
 */
module.exports = (function() {


  // A reference to each connection registered with this adapter.
  var connections = {};

  var Adapter = {

    identity: 'waterline-sails.io.js',

    // Which type of primary key is used by default
    pkFormat: 'integer',

    // Whether this adapter is syncable
    // Not syncable since we're interfacing with the established server API.
    syncable: false,

    // Default configuration for connections, a local Sails.js server
    // Allow a schemaless data store
    defaults: {
      protocol: 'http',   // HTTP protocol (http | https)
      host: 'localhost',  // api host name
      port: 1337,         // api port
      pathname: '/api'    // base api path
    },


    /**
     * This method runs when a model is initially registered at server-start-time, registering a new connection.
     *
     * @param  {Object} connection The connection used to persist these collections.
     * @param  {Object} collections The collections using this connection, indexed by identity.
     * @param  {Function} cb Node.js type async callback.
     */
    registerConnection: function(connection, collections, cb) {

      if (!connection.identity) {
        return cb(Errors.IdentityMissing);
      }
      if (connections[connection.identity]) {
        return cb(Errors.IdentityDuplicate);
      }

      connections[connection.identity] = new Socket(connection, collections);
      cb();
    },

    /**
     * Tear down a Connection when the ORM shuts down.
     *
     * @param {String} cb The identity of the connection to tear down.
     * @param {Function} cb A Node.js type async callback.
     */
    teardown: function(conn, cb) {

      if (typeof conn === 'function') {
        cb = conn;
        conn = null;
      }
      if (!conn) {
        connections = {};
        return cb();
      }
      if (!connections[conn]) {
        return cb();
      }
      connections[conn].teardown();
      delete connections[conn];
      cb();
    },


    ///////////////////////////////////////////////////////////////////////////////////////////
    /// Semantic Interface
    ///////////////////////////////////////////////////////////////////////////////////////////
    /**
     * Implements calls to Model.find(), Model.findOne(), or related. This method responds with an
     * array of instances, the Waterline core takes care of supporting all the other different
     * find methods/usages.
     *
     * @param {String} connection The connection identifier of the collection being queried.
     * @param {String} collection The identity of the collection being queried.
     * @param {{where: {Object}, limit: {Number}, skip: {Number}, sort: {String}}} options Provided query options.
     * @param {Function} cb A Node.js type callback with an error or the results: `function(err, results) {}`.
     */
    find: function(connection, collection, options, cb) {
      grabConnection(connection).select(collection, options, cb);
    },

    create: function(connection, collection, values, cb) {
      grabConnection(connection).insert(collection, values, cb);
    },

    update: function(connection, collection, options, values, cb) {
      grabConnection(connection).update(collection, options, values, cb);
    },

    destroy: function(connection, collection, options, cb) {
      grabConnection(connection).destroy(collection, options, cb);
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
      grabConnection(connection).socketRequest(method, url, data, cb);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////
    /// Associations Interface
    ///////////////////////////////////////////////////////////////////////////////////////////
    /**
     *
     * @param conn
     * @param coll
     * @param criteria
     * @param cb
     */
    //join: function(conn, coll, criteria, cb) {
    //
    //  var db = grabConnection(conn);
    //
    //  var parentIdentity = coll;
    //
    //  // Populate associated records for each parent result
    //  // (or do them all at once as an optimization, if possible)
    //  _runJoins({
    //
    //    instructions: criteria,
    //    parentCollection: parentIdentity,
    //
    //    /**
    //     * Find some records directly (using only this adapter)
    //     * from the specified collection.
    //     *
    //     * @param  {String}   collectionIdentity
    //     * @param  {Object}   criteria
    //     * @param  {Function} cb
    //     */
    //    $find: function(collectionIdentity, criteria, cb) {
    //      return db.select(collectionIdentity, criteria, cb);
    //    },
    //
    //    /**
    //     * Look up the name of the primary key field
    //     * for the collection with the specified identity.
    //     *
    //     * @param  {String}   collectionIdentity
    //     * @return {String}
    //     */
    //    $getPK: function(collectionIdentity) {
    //      if (!collectionIdentity) {
    //        return;
    //      }
    //      return db.getPKField(collectionIdentity);
    //    }
    //  }, cb);
    //}
  };

  ///////////////////////////////////////////////////////////////////////////////////////////

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

