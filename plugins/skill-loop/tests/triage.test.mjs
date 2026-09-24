import test from 'node:test';
import assert from 'node:assert/strict';
import { triageRepair } from '../scripts/triage.mjs';
const run = passed => ({ checks: [{ caseId: 'training', passed, actual: 'answer' }] });
const config = code => ({ timeoutMs: 3000, optimization: { triageCommand: [process.execPath, '-e', code] } });
test('deterministic failures cannot be waived by Jev pass', async () => {
  const result = await triageRepair(config('process.stdin.resume(); console.log(JSON.stringify({choice:"pass"}))'), run(false));
  assert.equal(result.route, 'propose');
  assert.deepEqual(result.reasons, ['deterministic_failure']);
});
test('clean training and Jev pass skip proposer', async () => {
  assert.equal((await triageRepair(config('process.stdin.resume(); console.log(JSON.stringify({choice:"pass"}))'), run(true))).route, 'stop');
});
test('uncertainty, blockers and provider errors escalate', async () => {
  for (const choice of ['fail', 'insufficient']) assert.equal((await triageRepair(config(`process.stdin.resume(); console.log(JSON.stringify({choice:${JSON.stringify(choice)}}))`), run(true))).route, 'propose');
  assert.equal((await triageRepair(config('process.stdin.resume(); console.log("bad-json")'), run(true))).status, 'error');
});
test('no adapter makes no provider call and uses deterministic evidence', async () => {
  assert.equal((await triageRepair({}, run(true))).route, 'stop');
  assert.equal((await triageRepair({}, run(false))).route, 'propose');
});
