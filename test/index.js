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
    return () => {}
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
  const router = {
    subscribe (routeMsg, cancelMsg) {
      t.is(typeof routeMsg, 'function')
      t.is(typeof cancelMsg, 'function')

      return dispatch => {
        t.is(typeof dispatch, 'function')

        const cancel = () => {}
        dispatch(cancelMsg(cancel))
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
