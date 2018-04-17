const { union } = require('tagmeme')

const Result = union(['Ok', 'Err'])

function isPromise (value) {
  return value && (value.then && value.catch)
}

function selfManaged (key, makeProgram) {
  return { _isSelfManaged: true, key, makeProgram }
}

function isSelfManaged (program) {
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
exports.selfManaged = selfManaged
exports.isSelfManaged = isSelfManaged
exports.createEmitter = createEmitter
