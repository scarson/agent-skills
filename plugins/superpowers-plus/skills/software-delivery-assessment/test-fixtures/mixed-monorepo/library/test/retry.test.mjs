import test from 'node:test'
import assert from 'node:assert/strict'

function retryTransient (results) {
  for (const result of results.slice(0, 3)) {
    if (result === 'ok') return 'ok'
    if (result === 'permanent') throw new Error('permanent')
  }
  throw new Error('transient retries exhausted')
}

test('retries transient failure without masking a permanent failure', () => {
  assert.equal(retryTransient(['transient', 'ok']), 'ok')
  assert.throws(() => retryTransient(['permanent', 'ok']), /permanent/)
})
