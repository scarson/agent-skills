import test from 'node:test'
import assert from 'node:assert/strict'

function renderRelease (name, sequence) {
  return `${name}#${sequence}`
}

test('contrasts a weak assertion with a behavior-validating assertion', () => {
  assert.ok(renderRelease('library', 4))
  assert.equal(renderRelease('library', 4), 'library#4')
})
