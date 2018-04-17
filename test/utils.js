import { createEmitter } from '../src/utils'
import test from 'ava'

test('createEmitter should prime added listeners', t => {
  const emitter = createEmitter({})
  emitter.subscribe().effect(() => t.pass())
})

const skipPrime = isPrimed => fn => x => {
  if (!isPrimed) {
    isPrimed = true
    return
  }
  fn(x)
}

test('createEmitter should add listeners', t => {
  const emitter = createEmitter({})
  const skip = skipPrime()
  emitter.subscribe().effect(skip(x => t.is(x, 4)))
  emitter.emit(4)
})

test('createEmitter should remove listeners', t => {
  t.plan(1)
  const emitter = createEmitter({})
  const sub = emitter.subscribe()
  sub.effect(() => t.pass())
  sub.cancel()
  emitter.emit()
})
