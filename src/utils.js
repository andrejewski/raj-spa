const { union } = require('tagmeme')

const Result = union(['Ok', 'Err'])

function selfManaged (key, makeProgram) {
  return { _isSelfManaged: true, key, makeProgram }
}

function isSelfManaged (program) {
  return program && program._isSelfManaged
}

function createEmitter (listeners = []) {
  return {
    emit (value) {
      listeners.forEach(l => l(value))
    },
    subscribe () {
      let listener
      return {
        effect (dispatch) {
          if (!listener) {
            listener = dispatch
            listeners.push(listener)
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
exports.selfManaged = selfManaged
exports.isSelfManaged = isSelfManaged
exports.createEmitter = createEmitter
