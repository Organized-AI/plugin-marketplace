import test from 'node:test';
import assert from 'node:assert/strict';
import {applySkillPatch} from '../scripts/patches.mjs';

test('applies append, insert, replace, and delete in order with a report', () => {
  const result = applySkillPatch('A\nB', [
    {op: 'append', text: '\nC'},
    {op: 'insert_after', anchor: 'A', text: '1'},
    {op: 'replace', old: 'B', new: 'Bee'},
    {op: 'delete', old: 'C'},
  ]);
  assert.equal(result.text, 'A1\nBee\n');
  assert.deepEqual(result.report.operations.map(operation => operation.status), ['applied', 'applied', 'applied', 'applied']);
  assert.equal(result.report.changedChars, 2 + 1 + 1 + 3 + 1);
});

test('counts overlapping occurrences when resolving an anchor', () => {
  assert.throws(() => applySkillPatch('ababa', [{op: 'insert_after', anchor: 'aba', text: '!'}]), /exactly once.*2/);
});

test('rejects unknown fields, empty values, and no-op replacements', () => {
  assert.throws(() => applySkillPatch('x', [{op: 'append', text: '', extra: 1}]), /unknown or missing fields/);
  assert.throws(() => applySkillPatch('x', [{op: 'delete', old: ''}]), /non-empty/);
  assert.throws(() => applySkillPatch('x', [{op: 'replace', old: 'x', new: 'x'}]), /differ from old/);
});

test('validates the complete request and preserves the input on a later failure', () => {
  const original = 'one two';
  assert.throws(() => applySkillPatch(original, [
    {op: 'replace', old: 'one', new: '1'},
    {op: 'delete', old: 'missing'},
  ]), /exactly once.*0/);
  assert.equal(original, 'one two');
  assert.throws(() => applySkillPatch('x', [{op: 'append', text: 'y'}], {maxEdits: 5}), /maxEdits/);
  assert.throws(() => applySkillPatch('x', [{op: 'append', text: 'y'}], {maxChangedChars: 100001}), /maxChangedChars/);
});

test('enforces changed character and final skill limits, including removed and added text', () => {
  assert.throws(() => applySkillPatch('abc', [{op: 'replace', old: 'a', new: '123'}], {maxChangedChars: 3}), /maxChangedChars/);
  assert.throws(() => applySkillPatch('abc', [{op: 'append', text: 'd'}], {maxSkillChars: 3}), /maxSkillChars/);
});

test('rejects empty requests, empty final skills, and net no-op sequences', () => {
  assert.throws(() => applySkillPatch('skill', []), /at least one/);
  assert.throws(() => applySkillPatch('skill', [{op: 'delete', old: 'skill'}]), /final skill/);
  assert.throws(() => applySkillPatch('x', [{op: 'append', text: 'y'}, {op: 'delete', old: 'y'}]), /must change/);
  assert.throws(() => applySkillPatch('x', [{op: 'append', text: 'y'}], {maxSkillChars: 1}), /maxSkillChars/);
});
