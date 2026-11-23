import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parse} from '../src/cli.mjs';
test('maps explicit operations and rejects ambiguous options',()=>{
 assert.deepEqual(parse(['history','enable','note.md']),{method:'history.configure',target:'note.md',state:'enabled'});
 assert.deepEqual(parse(['share','broadcast','note.md','--off']),{method:'sharing.broadcast',target:'note.md',broadcast:false});
 assert.throws(()=>parse(['history','list']));assert.throws(()=>parse(['inspect','note.md','--execute','anything']));
});
