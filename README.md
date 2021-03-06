# waterline-sails.io.js Adapter

This module is a [Waterline](https://github.com/balderdashy/waterline)/[Sails.js](https://github.com/balderdashy/sails) 
adapter which provides easy access to a Sails server via the 
[sails.io.js web-socket client](http://sailsjs.org/documentation/reference/web-sockets/socket-client), when
Waterline is used on a client. It is designed to work with 
[Sails Blueprint](http://sailsjs.org/documentation/reference/blueprint-api) routes so it can be used to hook up
a client application to a Sails.js server right out the box. 

This adapter is particularly useful when creating isomorphic applications where records must be retrieved on the
client or server in a consistent manner. On the server the models can be configured to use the adapters of the 
underlying persistence layer/services, and when passing the model config to the client the connection details
can be updated to use this `sails.io.js` adapter instead.
 

### Installation

Install via NPM:

```sh
$ npm install waterline-sails.io.js
```


### Configure

Add the sails.io.js adapter config to the config/connections.js file. Available options and defaults:

```javascript
module.exports.connections = {
  sailsSocketClient: {
    adapter: 'waterline-sails.io.js',
    protocol: 'http',   // HTTP protocol (http | https)
    host: 'localhost',  // api host name
    port: 1337,         // api port
    basePath: '/api',   // base api path
    autoConnect: true,  // eager/lazy connect the web-socket
    simulateDelay: 0    // Simulated delay ms
  }
};
```

You will have to update the `connection` property on the definitions of the models that will be used
on the client so it uses the `sailsSocketConnection` rather than the connection specified on the server.

See the documentation of 
[fluxible-plugin-waterline-models](https://github.com/marnusw/fluxible-plugin-waterline-models#use-with-sailsjs)
for an example of how this might be configured.

##### Request URLs

The request URLs match the [Sails Blueprints](http://sailsjs.org/documentation/reference/blueprint-api) specification;
that is: 

`REST_METHOD <protocol>://<host>:<port><basePath>/<model|collectionName>[/:id]`

There are two exceptions to this rule; see the [usage](#usage) section.

##### Simulated Response Delay

Since the adapter will be used on a client it may at times be convenient to simulate the delay of a 
server round trip while developing on a local server. By specifying the `simulateDelay` option in 
milliseconds on the config object all requests will be delayed by that amount of time. This feature 
is automatically disabled and removed from a production build.


### Interfaces and Features

The following 
[**Interfaces**](https://github.com/balderdashy/sails-docs/blob/master/contributing/adapter-specification.md) are 
supported:

* Semantic
* Queryable

The `.populate()` method without criteria, i.e. calling `Model.populate('attrName')`, is allowed, but with
`Model.populate('attrName', {criteria})` the criteria will be ignored. All attributes passed on successive
calls to `.populate()` will be passed to the server on the `populate` property of the query. This means
that if [Sails Blueprints](http://sailsjs.org/documentation/reference/blueprint-api) are used this will 
work straight out of the box.

The supported **Features** will depend on the underlying storage mechanism used on the server, but in 
principle the following features may be supported:

* `autoIncrement`(`.sequential`)
* `unique`

**Planned Features**

* `crossAdapter` (queries across this and other adapters will be joined in-memory on the client)

At present this is not implemented and only joins via a single connection using this adapter is supported.


### Usage

This adapter exposes the standard `find()`, `create()`, `update()` and `destroy()` methods and other 
combinations of the *Semantic Interface* and can be used on the client just like any of the core adapters 
would be on the server, making this adapter an attractive choice for isomorphic applications. 
Sails Blueprints does not support the `findAndUpdate()` or `findAndDestroy()` methods, but this 
[semantic-blueprints hook](https://github.com/marnusw/sails-hook-semantic-blueprints) can be used to 
extend your app with those.

As always the `.exec()` method will return an error object or the results, or the promise api can be used.

##### `sailsIoSocket()` Method

The adapter also exposes a `sailsIoSocket()` method on the Model which serves the same purpose as the 
`.native()` and `.query()` methods on the MongoDB and SQL adapters respectively. It can be used to run 
one of the `sails.io.js` methods against the actual underlying socket. 

```javascript
Model.sailsIoSocket(method, url, data, function(err, body, jwres) {...});

// OR

Model.sailsIoSocket(method, url, data).then(body => {...}).catch(err => {...});
```

The first parameter is the `sails.io.js` method to call, with subsequent parameters being passed as the 
arguments. The data parameter is optional, and the callback should always be the last argument provided.
If the callback is omitted a promise will be returned. In this case it is not possible to gain access to 
the raw `jwres` object.

*Note:* When a callback is not provided a global `Promise` class is assumed, meaning this case must either 
be in an environment which supports ES6 features or be polyfilled. Including the 
[Babel polyfill](https://babeljs.io/docs/usage/polyfill/), 
[es6-promise](https://www.npmjs.com/package/es6-promise) or any other polyfill with the ES6 API will work.
If callbacks are used throughout it is not necessary to add a promise polyfill.

The only difference compared to using the socket methods directly is the signature of the callback. The 
first parameter is a possible error object (see below), the response body is on the second parameter 
for successful requests, and the untouched `jwres` object is always provided on the third parameter for 
more specialised use cases. 

##### `addTo()` and `removeFrom()` Methods

The adapter also exposes `addTo()` and `removeFrom()` methods on the Model for gaining access to the
Blueprints [Add to Collection](http://sailsjs.org/documentation/reference/blueprint-api/add-to) and
[Remove from Collection](http://sailsjs.org/documentation/reference/blueprint-api/remove-from) actions.

```javascript
var options = {
  id: 1,                    // The primary record to update.
  association: 'attrName',  // The association attribute.
  foreignId: 3,             // The id of an existing record to add onto/remove from the association, OR
  foreignData: {...}        // Data to create a new record to add onto the association.
};

// Then do either

Model.addTo(options, function(err, primaryRecordData, jwres) {...});
Model.addTo(options).then(primaryRecordData => {...}).catch(err => {...});

// or

Model.removeFrom(options, function(err, primaryRecordData, jwres) {...});
Model.removeFrom(options).then(primaryRecordData => {...}).catch(err => {...});
```

In both cases the `primaryRecordData` is the data of the record that was added to or removed from, 
with all records on the relevant association populated. Because these are not native Sails.js methods, 
however, this is only the record data and not a Waterline record instance.

*Note:* When a callback is not provided a global `Promise` class is assumed, meaning this case must either 
be in an environment which supports ES6 features or be polyfilled. Including the 
[Babel polyfill](https://babeljs.io/docs/usage/polyfill/), 
[es6-promise](https://www.npmjs.com/package/es6-promise) or any other polyfill with the ES6 API will work.
If callbacks are used throughout it is not necessary to add a promise polyfill.

##### Error Objects

If a web socket request responds with an error an error-object is returned as the first argument of
the callback. This will be a `WLError` instance created by Waterline, the error objects below will 
be on the `originalError` property. The exception is methods not native to Waterline adapters: For 
calls to `sailsIoSocket()`, `addTo()` and `removeFrom()` these objects are returned directly.

For a 400 status code (validation errors) the object has the form:

```javascript
  {
    statusCode: 400,
    type: 'E_VALIDATION',
    validation: true,
    messages: jwres.body
  }
```

For a 401 status code (unauthorized) the object has the form:

```javascript
  {
    statusCode: 401,
    type: 'E_UNAUTHORIZED',
    unauthorized: true,
    validation: true,
    messages: jwres.body
  }
```

For a 404 status code (not found) the object has the form:

```javascript
  {
    statusCode: 404,
    type: 'E_NOT_FOUND',
    notFound: true,
    messages: jwres.body
  }
```

For all other status codes the object has the form:

```javascript
  {
    statusCode: <code>,
    type: 'E_FATAL',
    fatal: true,
    message: jwres.body
  }
```


### Tests

No tests yet. The [Waterline-adapter-tests](https://github.com/balderdashy/waterline-adapter-tests) should be run.


## Contributing

Comments and/or pull requests are welcome.


## License

This software is free to use under the MIT license.
See the [LICENSE file](LICENSE.md) for license text and copyright information.
