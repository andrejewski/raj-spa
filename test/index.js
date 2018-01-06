const test = require('ava')
const spa = require('../src')
const {program} = require('raj/runtime')

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
