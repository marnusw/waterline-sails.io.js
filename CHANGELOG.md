### 0.4.0 (4 July 2015)

* [DOCUMENTATION] Wrote up the main README.md documentation. 
* [ENHANCEMENT] Removed the dependency on `lodash`. 
* [FEATURE] Allow configuring a simulated delay (with `simulateDelay` option) in non-production environments. 
* [FEATURE] Supporting `.populate` on queries via the `.join()` method which passes it on the query. 

### 0.3.1 (13 June 2015)

* [FEATURE] Pass back proper E_NOT_FOUND error on 404's rather than a fatal error. 

### 0.3.0 (2 June 2015)

* [FEATURE] Direct access to sails.io.js methods via the Model.sailsIoSocket() method.
* [FEATURE] Pass back proper E_UNAUTHORIZED error on 401's rather than a fatal error. 

### 0.2.0 (25 May 2015)

* [FEATURE] Pass back an E_VALIDATION error 400 errors and E_FATAL errors in all other cases
 rather than `jwres.body`. The latter is passed as the `message` property of error object. 

### 0.1.1 (25 May 2015)

Initial release.
