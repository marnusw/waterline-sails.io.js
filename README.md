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
    pathname: '/api',   // base api path
    simulateDelay: 0    // Simulated delay ms
  }
};
```

You will have to update the `connection` property on the definitions of the models that will be used
on the client so it uses the `sailsSocketConnection` rather than the connection specified on the server.

See the documentation of 
[fluxible-plugin-waterline-models](https://github.com/marnusw/fluxible-plugin-waterline-models#use-with-sailsjs)
for an example of how this might be configured.

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
```

The first parameter is the `sails.io.js` method to call, with subsequent parameters being passed as the 
arguments. The data parameter is optional, and the callback should always be the last argument provided.

The only difference compared to using the socket methods directly is the signature of the callback. The 
first parameter is a possible error object (see below), the response body is on the second parameter 
for successful requests, and the untouched `jwres` object is always provided on the third parameter for 
more specialised use cases. 

##### Error Objects

If a web socket request responds with an error an error-object is returned as the first argument of
the callback.

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
