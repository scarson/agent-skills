import test from 'node:test'
import assert from 'node:assert/strict'

const permissiveDouble = { send: () => ({ ok: true }) }
const validatingDouble = { send: input => ({ ok: input.kind === 'release' && Number.isInteger(input.sequence) }) }

test('contrasts an unvalidated double with a contract-validating double', () => {
  assert.equal(permissiveDouble.send({ anything: true }).ok, true)
  assert.equal(validatingDouble.send({ anything: true }).ok, false)
  assert.equal(validatingDouble.send({ kind: 'release', sequence: 7 }).ok, true)
})
