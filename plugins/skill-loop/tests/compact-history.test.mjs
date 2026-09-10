import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {compactHistory} from '../scripts/compact-history.mjs';
import {historyArtifact} from '../scripts/history-artifact.mjs';
test('compact summary roundtrips SQL quotes and excludes private source; duplicate save is immutable',()=>{
 const p=compactHistory({saved:{id:'demo',skillPath:'/private/skill.md',skill:'SECRET SOURCE',passed:1,total:2,score:50,checks:[{caseId:"quote's case",passed:false}],qaSource:{title:'</script><script>alert(1)</script>'}},proposals:[{id:'p1',status:'pending'}]});
 assert.ok(!p.raw.includes('SECRET SOURCE'));assert.equal(p.record.failedCheckCount,1);
 const r=spawnSync('python3',['-c',"import json,sqlite3,sys;p=json.load(sys.stdin);c=sqlite3.connect(':memory:');c.execute(p['setup']);c.execute(p['write']);c.execute(p['write']);print(json.dumps(c.execute(p['read']).fetchall()))"],{input:JSON.stringify(p),encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);assert.deepEqual(JSON.parse(r.stdout),[[p.id,p.raw]]);assert.equal(createHash('sha256').update(p.raw).digest('hex'),p.id);
 const html=historyArtifact({saved:{qaSource:{title:'</script><script>alert(1)</script>'}}});
 const embedded=html.match(/id="skill-loop-compact-history">([\s\S]*?)<\/script>/)[1];assert.ok(!embedded.includes('</script>'));assert.equal(JSON.parse(embedded).record.qaSource,'</script><script>alert(1)</script>');
});
