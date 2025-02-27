# swagger-routes-express

Connect [`Express`](http://www.expressjs.com) route controllers to restful paths using a [`Swagger`](http://swagger.io) v2 or [`OpenAPI`](https://www.openapis.org) v3 definition file.

[![NPM](https://nodei.co/npm/swagger-routes-express.png)](https://nodei.co/npm/swagger-routes-express/)

## Prerequisites

This library assumes:

1. You are using [`expressjs`](http://www.expressjs.com)
2. You are using [`swagger`](http://swagger.io) _version 2_ or [`OpenAPI`](https://www.openapis.org) _version 3_

## Upgrading from Swagger Routes Express V2 to V3.

These docs refer to Version 3 of Swagger Routes Express which changed the way you invoke the `connector`.

### The old way

```js
const connector = require('swagger-routes-express')
```

### The new way

```js
const { connector } = require('swagger-routes-express')
```

## Install

Add `swagger-routes-express` as a `dependency`:

```sh
npm i swagger-routes-express
```

## Examples

### A simple API

Assume the following API route controllers, defined in `./api/index.js` as follows:

```js
const { name, version, description } = require('../../package.json')

const versions = (req, res) => {
  res.json([
    {
      version: 1,
      path: '/api/v1'
    }
  ])
}

const ping = (req, res) => {
  res.json({
    name,
    description,
    version,
    uptime: process.uptime()
  })
}

module.exports = { ping, versions }
```

### Swagger Version 2 Example

Given a Swagger (v2) YAML file `my-api.yml` along the lines of:

```yml
swagger: '2.0'
info:
  description: Something about the API
  version: '1.0.0'
  title: 'Test API'
basePath: '/api/v1'
schemes:
  - 'https'
  - 'http'
paths:
  /:
    get:
      tags:
        - 'root'
      summary: 'Get API Version Information'
      description: 'Returns a list of the available API versions'
      operationId: 'versions'
      produces:
        - 'application/json'
      responses:
        200:
          description: 'success'
          schema:
            $ref: '#/definitions/ArrayOfVersions'
  /ping:
    get:
      tags:
        - 'root'
      summary: 'Get Server Information'
      description: 'Returns information about the server'
      operationId: 'ping'
      produces:
        - 'application/json'
      responses:
        200:
          description: 'success'
          schema:
            $ref: '#/definitions/ServerInfo'
definitions:
  # see https://swagger.io/docs/specification/data-models/data-types
  APIVersion:
    type: 'object'
    properties:
      version:
        type: 'integer'
        format: 'int64'
      path:
        type: 'string'
  ServerInfo:
    type: 'object'
    properties:
      name:
        type: 'string'
      description:
        type: 'string'
      version:
        type: 'string'
      uptime:
        type: 'number'
  ArrayOfVersions:
    type: 'array'
    items:
      $ref: '#/definitions/APIVersion'
```

### OpenAPI Version 3 example

```yml
openapi: 3.0.0
info:
  description: Something about the API
  version: 1.0.0
  title: Test API
paths:
  /:
    get:
      tags:
        - root
      summary: Get API Version Information
      description: Returns a list of the available API versions
      operationId: versions
      responses:
        '200':
          description: success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ArrayOfVersions'
  /ping:
    get:
      tags:
        - root
      summary: Get Server Information
      description: Returns information about the server
      operationId: ping
      responses:
        '200':
          description: success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ServerInfo'
servers:
  - url: /api/v1
components:
  schemas:
    APIVersion:
      type: object
      properties:
        version:
          type: integer
          format: int64
        path:
          type: string
    ServerInfo:
      type: object
      properties:
        name:
          type: string
        description:
          type: string
        version:
          type: string
        uptime:
          type: number
    ArrayOfVersions:
      type: array
      items:
        $ref: '#/components/schemas/APIVersion'
```

### Your Express Server

You could set up your server as follows:

```js
const express = require('express')
const YAML = require('yamljs')
const { connector } = require('swagger-routes-express')
const api = require('./api')

const makeApp = () => {
  const apiDefinition = YAML.load('api.yml')
  const connect = connector(api, apiDefinition)

  const app = express()
  // do any other app stuff, such as wire in passport, use cors etc
  // then attach the routes
  connect(app)

  // add any error handlers last
  return app
}
```

With the result that requests to `GET /` will invoke the `versions` controller and a request to `/ping` will invoke the `ping` controller.

### Adding security middleware handlers

You can pass in a range of options, so if your swagger document defines security scopes you can pass in via a `security` option:

For example if your path has a `security` block like

```yml
paths:
  /private
    get:
      summary: some private route
      security:
        - access: ['read', 'write']
  /admin
    get:
      summary: some admin route
      security:
        - access: ['admin']
```

Supply a `security` option as follows

```js
const options = {
  security: {
    'read-write': readWriteAuthMiddlewareFunction,
    admin: adminAuthMiddlewareFunction
  }
}
```

If your paths supply a `security` block but its `scopes` array is empty you can just use its name instead in the `security` option.

```yml
paths:
  /private
    get:
      summary: some private route
      security:
        - apiKey: []
```

supply a `security` option like

```js
const options = {
  security: {
    apiKey: myAuthMiddlewareFunction
  }
}
```

#### Notes

- Only the **first** security option is used.
- The previous version of `swagger-routes-express` used a `scopes` option but this didn't make sense for security without scopes. To preserve backwards compatibility the `scopes` option is still permitted but you'll get a deprecation warning.

#### What's an Auth Middleware function?

An Auth Middleware Function is simply an [Express Middleware function](https://expressjs.com/en/guide/using-middleware.html) that checks to see if the user making the request is allowed to do so.

How this actually works in your server's case is going to be completely application specific, but the general idea is your app needs to be able to log users in, or accept a token from a header, or somehow otherwise stick a user id, or some roles, into `req.user` or `req.session.user` or something like that. There are dozens of ways to do this. I recommend using something like [Passport](http://www.passportjs.org/packages/) to handle the specifics.

Your Auth Middleware then just needs to check that the user / roles you've stored corresponds with what you'd like to allow that user to do.

```js
async function correspondingMiddlewareFunction(req, res, next) {
  // previously you have added a userId to req (say from an 'Authorization: Bearer token' header)
  // how you check that the token is valid is up to your app's logic
  if (await isValidToken(req.user.token)) return next()

  // otherwise reject with an error
  return res.status(401).json({ error: "I'm afraid you can't do that" })
}
```

- [More information…](https://duckduckgo.com/?q=express+auth+middleware) (via DuckDuckGo)

#### OpenAPI V3 Security Blocks

OpenAPI V3 allows you to define a global `security` definition as well as path specific ones. The global `security` block will be applied if there is no path specific one defined.

### Adding other path-level middleware

You can add your own path specific middleware by passing in a `middleware` option

```js
{
  middleware: {
    myMiddleware: someMiddlewareFunction
  }
}
```

and then in the path specification adding an `x-middleware` option

```yml
paths:
  /special:
    get:
      summary: some special route
      x-middleware:
        - myMiddleware
```

The `someMiddlewareFunction` will be inserted **after** any auth middleware.

This works for both Swagger v2 and OpenAPI v3 documents.

### Adding hooks

You can supply an `onCreateRoute` handler function with the options with signature

```js
const onCreateRoute = (method, descriptor) => {
  const [path, ...handlers] = descriptor
  console.log('created route', method, path, handlers)
}
```

The method will be one of `get`, `put`, `post`, `delete`, etc.

The descriptor is an array of

```js
;[
  path, // a string. Swagger param formats will have been converted to express route formats.
  security, // an auth middleware function (if needed)
  ...middleware, // other middleware functions (if supplied)
  controller //  then finally the route controller function
]
```

### Mapping to nested API routes

If your `./api` folder contains nested controllers such as

```
/api/v1/createThing.js
```

It's not uncommon for `./index.js` to expose this as `v1_createThing`, but in swagger the `operationId` might specify it as `v1/createThing`.

You can supply your own `apiSeparator` option in place of `_` to map from `/`.

### Missing Route Controllers

If a route controller is defined as an `operationId` in swagger but there is no corresponding controller, a default `notImplemented` controller will be inserted that simply responds with a `501` error. You can also specify your own `notImplemented` controller in `options`.

If no `operationId` is supplied for a path then a default `notFound` controller that responds with a `404` status will be inserted. You can also specify your own `notFound` controller in `options`.

### Base paths

#### Swagger Version 2

For the root path `/` we check the route's `tags`. If the first tag defined for a path is `'root'` we don't inject the api basePath, otherwise we do. You can define your own `rootTag` option to override this.

#### OpenAPI Version 3

The OpenAPI format allows you to define both a default `servers` array, and `path` specific `servers` arrays. The `url` fields in those arrays are parsed, ignoring any absolute URLS (as they are deemed to refer to controllers external to this API Server).

The spec allows you to include template variables in the `servers`' `url` field. To accomodate this you can supply a `variables` option in `options`. Any variables you specify will be substituted.

### Default Options

If you don't pass in any options the defaults are:

```js
{
  apiSeparator: '_',
  notFound: : require('./routes/notFound'),
  notImplemented: require('./routes/notImplemented'),
  onCreateRoute: undefined,
  rootTag: 'root', // only used in Swagger V2 docs
  security: {},
  variables: {}, // only used in OpenAPI v3 docs
  middleware: {},
  INVALID_VERSION: require('./errors').INVALID_VERSION
}
```

## Generating API Summary information

**This is new in SRE V3**

You can generate a summary of your Swagger v3 or OpenAPI v3 API specification in the form:

```js
{
  info: { name, version, description },
  paths: { [method]: ['/array', '/of', '/normalised/:paths'] }
}
```

as follows:

```js
const YAML = require('yamljs')
const { summarise } = require('swagger-routes-express')

const apiDefinition = YAML.load('api.yml')
const apiSummary = summarise(apiDefinition)
```

## Development

[![Greenkeeper badge](https://badges.greenkeeper.io/davesag/swagger-routes-express.svg)](https://greenkeeper.io/)

## Branches

<!-- prettier-ignore -->
| Branch | Status | Coverage | Notes |
| ------ | ------ | -------- | ----- |
| `develop` | [![CircleCI](https://circleci.com/gh/davesag/swagger-routes-express/tree/develop.svg?style=svg)](https://circleci.com/gh/davesag/swagger-routes-express/tree/develop) | [![codecov](https://codecov.io/gh/davesag/swagger-routes-express/branch/develop/graph/badge.svg)](https://codecov.io/gh/davesag/swagger-routes-express) | Work in progress |
| `master` | [![CircleCI](https://circleci.com/gh/davesag/swagger-routes-express/tree/master.svg?style=svg)](https://circleci.com/gh/davesag/swagger-routes-express/tree/master) | [![codecov](https://codecov.io/gh/davesag/swagger-routes-express/branch/master/graph/badge.svg)](https://codecov.io/gh/davesag/swagger-routes-express) | Latest stable release |

### Prerequisites

- [NodeJS](https://nodejs.org) — Ideally version `10.16.3 (LTS)` or better.

### Test it

- `npm test` — runs the unit tests.
- `npm run test:unit:cov` - run the unit tests with coverage.
- `npm run test:mutants` - run mutation testing of the unit tests.

### Lint it

```sh
npm run lint
```

## Contributing

Please see the [contributing notes](CONTRIBUTING.md).
