import { createEmitter } from '../src/utils'
import test from 'ava'

test('createEmitter should add listeners', t => {
  const emitter = createEmitter()
  emitter.subscribe().effect(() => t.pass())
  emitter.emit()
})

test('createEmitter should remove listeners', t => {
  t.plan(0)
  const emitter = createEmitter()
  const sub = emitter.subscribe()
  sub.effect(() => t.fail())
  sub.cancel()
  emitter.emit()
})
