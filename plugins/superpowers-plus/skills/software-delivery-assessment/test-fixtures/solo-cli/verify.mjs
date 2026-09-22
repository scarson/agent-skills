import assert from 'node:assert/strict'
import { releaseLabel } from './src/cli.mjs'

assert.equal(releaseLabel('0.1.0'), 'solo-cli@0.1.0')
assert.throws(() => releaseLabel('latest'), /semantic/)
console.log('solo-cli verification passed')
