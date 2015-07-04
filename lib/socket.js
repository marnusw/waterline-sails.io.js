/**
 * Copyright 2015, Marnus Weststrate
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
'use strict';
var _ = require('lodash');
var socketIOClient = require('socket.io-client');
var sailsIOClient = require('sails.io.js');


/**
 * A sails.io.js connection.
 *
 * @param {Object} config
 * @param {Object} collections
 * @return {Object}
 * @api public
 */
var Socket = module.exports = function(config, collections) {

  // Instantiate the socket client `io` (for now the socket.io client must be passed in explicitly).
  this.io = sailsIOClient(socketIOClient);
  //this.io.sails.autoConnect = false;

  this.io.sails.url = config.protocol + '://' + config.host + ':' + config.port;

  this.collections = collections || {};
  this.config = config;

  return this;
};

/**
 * Close the socket connection.
 * @param cb
 */
Socket.prototype.teardown = function(cb) {
  this.io.socket.disconnect();
  cb();
};

/**
 * Run one of the sails.io.js methods against the actual socket. The callback signature
 * differs in that it is a Node like callback with a possible error object returned on
 * the first parameter, the response body on the second parameter for successful requests,
 * and the untouched `jwres` object on the third parameter for special use cases:
 * `function(err, body, jwres)`
 *
 * The first parameter is the method to call, with subsequent parameters being passed as
 * the arguments. The callback should always be the last argument provided.
 *
 * @param {String} method
 */
Socket.prototype.socketRequest = function(method) {
  var i, args = [];
  for (i=1; i < arguments.length; ++i) {
    args.push(arguments[i]);
  }

  var cb = args.pop();
  args.push(function(body, jwres) {
    successful(jwres) ? cb(null, body, jwres) : cb(makeError(jwres), null, jwres);
  });

  this.io.socket[method].apply(this.io.socket, args);
};

///////////////////////////////////////////////////////////////////////////////////////////
/// DQL
///////////////////////////////////////////////////////////////////////////////////////////

/**
 * Select
 *
 * @param {String} collectionName
 * @param {Object} options
 * @param {Function} cb
 * @api public
 */
Socket.prototype.select = function(collectionName, options, cb) {

  this.io.socket.get(this.config.pathname + '/' + collectionName, options, function(body, jwres) {
    successful(jwres) ? cb(null, body) : cb(makeError(jwres));
  });

};

/**
 * Insert A Record
 *
 * @param {String} collectionName
 * @param {Object} values
 * @param {Function} callback
 * @return {Object}
 * @api public
 */
Socket.prototype.insert = function(collectionName, values, cb) {

  this.io.socket.post(this.config.pathname + '/' + collectionName, values, function(body, jwres) {
    successful(jwres) ? cb(null, body) : cb(makeError(jwres));
  });

};

/**
 * Update A Record
 *
 * @param {String} collectionName
 * @param {Object} options
 * @param {Object} values
 * @param {Function} callback
 * @api public
 */
Socket.prototype.update = function(collectionName, options, values, cb) {

  var path = this.config.pathname + '/' + collectionName;
  var id = extractId(options, values);

  if (id) {
    // Handling a single update is easy
    this.io.socket.put(path + '/' + id, values, function(body, jwres) {
      successful(jwres) ? cb(null, body) : cb(makeError(jwres));
    });
  } else {
    // Handling multiple updates requires the additional custom Blueprint findAndUpdate route
    options.data = values;
    this.io.socket.put(path, options, function(body, jwres) {
      successful(jwres) ? cb(null, body) : cb(makeError(jwres));
    });
  }

};

/**
 * Destroy A Record
 *
 * @param {String} collectionName
 * @param {{where:{id:{Number|Array}}}} options
 * @param {Function} callback
 * @api public
 */
Socket.prototype.destroy = function(collectionName, options, cb) {

  var path = this.config.pathname + '/';
  var id = extractId(options);

  if (id) {
    // To handle a single delete send the id to the standard Blueprints route
    path += collectionName + '/' + id;
  } else {
    // Deleting multiple records targets the find-n-destroy route and requires
    // the additional custom Blueprint findAndDestroy route.
    // The messy URL is necessary since Sails.js already bind `delete /:model`.
    path += 'find-n-destroy' + '/' + collectionName;
  }

  this.io.socket.delete(path, options, function(body, jwres) {
    successful(jwres) ? cb(null, body) : cb(makeError(jwres));
  });

};

///////////////////////////////////////////////////////////////////////////////////////////
/// DDL
///////////////////////////////////////////////////////////////////////////////////////////

/**
 * Describe a collection
 *
 * @param {String} collectionName
 * @param {Function} [callback] If not provided the schema is returned immediately.
 */
Socket.prototype.describe = function(collectionName, cb) {
  var schema = this.collections[collectionName].definition;
  if (!cb) {
    return schema;
  }
  setTimeout(function() {
    cb(null, schema);
  }, 0);
};

///////////////////////////////////////////////////////////////////////////////////////////
/// CONSTRAINTS AND HELPERS
///////////////////////////////////////////////////////////////////////////////////////////

/**
 * Extract the primary key value from search criteria or values.
 *
 * @param  {Object} options
 * @param  {Object|Array} [values] If a single data object is provided it is also checked for an id.
 * @return {Integer|String}
 */
function extractId(options, values) {
  var pk = options.id || (options.where && options.where.id);
  if (!pk && typeof values == 'object') {
    // Even if it's an array or some other instance this check will do no harm.
    pk = values.id;
  }
  // exclude criteria on the id field or multiple ids in an array
  return typeof pk == 'object' ? undefined : pk;
}

/**
 * Inspect the status code to see whether a request was successful or not.
 *
 * @param {Object} jwres
 * @returns {boolean}
 */
function successful(jwres) {
  return jwres.statusCode >= 200 && jwres.statusCode < 300;
}

/**
 * Create status specific error objects based on the status code and response body.
 *
 * @param {Object} jwres
 * @returns {Object}
 */
function makeError(jwres) {
  if (jwres.statusCode == 400) {
    return {
      statusCode: 400,
      type: 'E_VALIDATION',
      validation: true,
      messages: jwres.body
    };
  }

  if (jwres.statusCode == 401) {
    return {
      statusCode: 401,
      type: 'E_UNAUTHORIZED',
      unauthorized: true,
      validation: true,
      messages: jwres.body
    };
  }

  if (jwres.statusCode == 404) {
    return {
      statusCode: 404,
      type: 'E_NOT_FOUND',
      notFound: true,
      messages: jwres.body
    };
  }

  return {
    statusCode: jwres.statusCode,
    type: 'E_FATAL',
    fatal: true,
    message: jwres.body
  };
}
