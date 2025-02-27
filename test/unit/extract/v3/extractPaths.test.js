const { expect } = require('chai')

const extractPaths = require('src/extract/v3/extractPaths')

describe('src/extract/v3/extractPaths', () => {
  const api = {
    servers: [{ url: '/api/v1' }],
    paths: {
      '/': {
        get: {
          servers: [{ url: '/' }],
          tags: ['root'],
          operationId: 'versions'
        }
      },
      '/ping': {
        get: {
          servers: [
            {
              url: '/'
            }
          ],
          tags: ['root'],
          operationId: 'ping'
        }
      },
      '/test': {
        get: {
          tags: ['test'],
          operationId: 'v1/test',
          security: [{ example: ['identity.basic', 'identity.email', 'admin'] }]
        }
      }
    }
  }

  const expected = [
    {
      method: 'get',
      route: '/',
      operationId: 'versions',
      security: undefined,
      middleware: []
    },
    {
      method: 'get',
      route: '/ping',
      operationId: 'ping',
      security: undefined,
      middleware: []
    },
    {
      method: 'get',
      route: '/api/v1/test',
      operationId: 'v1_test',
      security: 'admin,identity.basic,identity.email',
      middleware: []
    }
  ]

  let paths

  before(() => {
    paths = extractPaths(api)
  })

  it('returns the expected paths', () => {
    expect(paths).to.deep.equal(expected)
  })

  context('root level security opt-out', () => {
    const api = {
      servers: [{ url: '/api/v1' }],
      paths: {
        '/': {
          get: {
            servers: [{ url: '/' }],
            tags: ['root'],
            operationId: 'root',
            security: []
          }
        }
      },
      security: [
        {
          bearerAuth: []
        }
      ]
      // components: {
      //   securitySchemes
      // }
    }
    const expected = [
      {
        method: 'get',
        route: '/',
        operationId: 'root',
        security: undefined,
        middleware: []
      }
    ]

    let paths

    before(() => {
      paths = extractPaths(api)
    })

    it('returns the expected paths', () => {
      expect(paths).to.deep.equal(expected)
    })
  })
})
