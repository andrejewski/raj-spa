const { union } = require('tagmeme')

const Result = union(['Ok', 'Err'])

function isPromise (value) {
  return value && (value.then && value.catch)
}

function keyed (key, makeProgram) {
  return { _isSelfManaged: true, key, makeProgram }
}

function isKeyed (program) {
  return program && program._isSelfManaged
}

function createEmitter ({ listeners = [], initialValue }) {
  let lastValue = initialValue
  return {
    emit (value) {
      lastValue = value
      listeners.forEach(l => l(value))
    },
    subscribe () {
      let listener
      return {
        effect (dispatch) {
          if (!listener) {
            listener = dispatch
            listeners.push(listener)
            listener(lastValue)
          }
        },
        cancel () {
          listeners = listeners.filter(l => l !== listener)
        }
      }
    }
  }
}

exports.Result = Result
exports.isPromise = isPromise
exports.keyed = keyed
exports.isKeyed = isKeyed
exports.createEmitter = createEmitter
