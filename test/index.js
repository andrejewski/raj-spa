const test = require('ava')
const spa = require('../src')
const { program } = require('raj/runtime')
const { createEmitter } = require('../src/utils')

const noopProgram = {
  init: [],
  update: () => [],
  view: () => 'No-op'
}

const noopRouter = {
  subscribe () {
    return {
      effect: () => {},
      cancel: () => {}
    }
  }
}

test('spa should return a new program', t => {
  const app = spa({
    router: noopRouter,
    initialProgram: noopProgram,
    getRouteProgram: () => noopProgram
  })

  t.true(Array.isArray(app.init))
  t.is(typeof app.update, 'function')
  t.is(typeof app.view, 'function')
})

test('spa should subscribe to the router', t => {
  return new Promise(resolve => {
    const router = {
      subscribe () {
        return {
          cancel () {},
          effect: dispatch => {
            t.is(typeof dispatch, 'function')
            resolve()
          }
        }
      }
    }

    program(spa({
      router,
      initialProgram: noopProgram,
      getRouteProgram () {
        return noopProgram
      }
    }))
  })
})

test('spa should unsubscribe from the router when the runtime is killed', t => {
  return new Promise(resolve => {
    const router = {
      subscribe (routeMsg) {
        return {
          effect: dispatch => {},
          cancel () {
            t.pass()
            resolve()
          }
        }
      }
    }

    const kill = program(spa({
      router,
      initialProgram: noopProgram,
      getRouteProgram () {
        return noopProgram
      }
    }))

    kill()
  })
})

function createTestRouter (options) {
  return createEmitter(options)
}

function createTestProgram (model) {
  return {
    init: [model],
    update: (msg, model) => [model],
    view: () => {}
  }
}

const tick = fn => setTimeout(fn, 0)

test('spa should reuse self-managed programs', async t => {
  /*
    The selfManaged(key, makeProgram) makeProgram function
      should only be called once and is then reused for
      any route that gets emitted.
  */
  t.plan(1)

  const router = createTestRouter({ initialValue: '/foo' })
  const initialProgram = createTestProgram('initial')
  const childProgram = createTestProgram('child')

  let kill
  await new Promise(resolve => {
    kill = program(spa({
      router,
      initialProgram,
      getRouteProgram (route, { selfManaged }) {
        if (route === '/baz') {
          resolve()
        }

        return selfManaged('child-key', router => {
          t.is(typeof router.subscribe, 'function', 'router.subscribe should be a function')
          return childProgram
        })
      }
    }))

    tick(() => {
      router.emit('/bar')
      tick(() => {
        router.emit('/baz')
      })
    })
  })

  kill()
})

test('spa should emit routes for self-managed programs', async t => {
  const router = createTestRouter({ initialValue: '/foo' })
  const initialProgram = createTestProgram('initial')
  const history = []
  const getChildProgram = router => {
    const sub = router.subscribe()
    const init = [
      { cancel: sub.cancel },
      sub.effect
    ]

    function update (msg, model) {
      history.push(msg)
      return [model]
    }

    function done (model) {
      model.cancel()
    }

    return { init, update, done, view: () => {} }
  }

  const kill = program(spa({
    router,
    initialProgram,
    getRouteProgram (route, { selfManaged }) {
      return selfManaged('child-key', getChildProgram)
    }
  }))

  await new Promise(resolve => {
    tick(() => {
      router.emit('/bar')
      tick(() => {
        router.emit('/baz')
        tick(resolve)
      })
    })
  })

  kill()
  t.deepEqual(history, ['/foo', '/bar', '/baz'])
})
