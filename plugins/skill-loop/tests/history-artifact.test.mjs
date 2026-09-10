import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {historyArtifact} from '../scripts/history-artifact.mjs';
test('save handoff binds inert full evidence by checksum without copying it into request',()=>{const evidence={text:'</script><script>alert(1)</script>',notes:'example'.repeat(20000)};const h=historyArtifact(evidence);const raw=h.match(/id="skill-loop-history">([\s\S]*?)<\/script>/)[1];assert.deepEqual(JSON.parse(raw).evidence,evidence);const request=h.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/)[1];assert.ok(request.includes(createHash('sha256').update(raw).digest('hex')));assert.ok(request.length<2000);assert.ok(h.includes('Not saved yet'));assert.ok(!raw.includes('</script>'));});
