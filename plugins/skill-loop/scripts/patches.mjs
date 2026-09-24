const DEFAULTS = {
  maxEdits: 4,
  maxChangedChars: 8000,
  maxSkillChars: 100000,
};
const OP_FIELDS = {
  append: ['op', 'text'],
  insert_after: ['op', 'anchor', 'text'],
  replace: ['op', 'old', 'new'],
  delete: ['op', 'old'],
};

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertLimit(value, name, {max} = {}) {
  if (!Number.isInteger(value) || value <= 0 || (max !== undefined && value > max)) {
    const bound = max === undefined ? 'a positive integer' : `an integer from 1 to ${max}`;
    throw new TypeError(`${name} must be ${bound}`);
  }
}

function occurrenceCount(source, needle) {
  let count = 0;
  for (let at = source.indexOf(needle); at !== -1; at = source.indexOf(needle, at + 1)) count += 1;
  return count;
}

function requireExact(source, value, label) {
  const count = occurrenceCount(source, value);
  if (count !== 1) throw new Error(`${label} must occur exactly once (found ${count})`);
  return source.indexOf(value);
}

function validateEdit(edit, index) {
  if (!isRecord(edit) || typeof edit.op !== 'string') throw new TypeError(`edit ${index} must be an object with an op`);
  const allowed = Object.hasOwn(OP_FIELDS, edit.op) ? OP_FIELDS[edit.op] : undefined;
  if (!allowed) throw new TypeError(`edit ${index} has unknown op ${edit.op}`);
  const keys = Object.keys(edit).sort();
  if (keys.length !== allowed.length || keys.some((key, i) => key !== [...allowed].sort()[i])) {
    throw new TypeError(`edit ${index} contains unknown or missing fields`);
  }
  if (edit.op === 'append' || edit.op === 'insert_after') {
    const anchor = edit.op === 'insert_after' ? edit.anchor : undefined;
    if (anchor !== undefined && (typeof anchor !== 'string' || anchor.length === 0)) throw new TypeError(`edit ${index} anchor must be a non-empty string`);
    if (typeof edit.text !== 'string' || edit.text.length === 0) throw new TypeError(`edit ${index} text must be a non-empty string`);
  } else {
    if (typeof edit.old !== 'string' || edit.old.length === 0) throw new TypeError(`edit ${index} old must be a non-empty string`);
    if (edit.op === 'replace' && (typeof edit.new !== 'string' || edit.old === edit.new)) throw new TypeError(`edit ${index} new must differ from old`);
  }
}

/** Apply a small, strictly validated set of textual edits in memory. */
export function applySkillPatch(text, edits, options = {}) {
  if (typeof text !== 'string') throw new TypeError('text must be a string');
  if (!Array.isArray(edits)) throw new TypeError('edits must be an array');
  if (!isRecord(options)) throw new TypeError('options must be an object');
  const optionKeys = Object.keys(options);
  if (optionKeys.some(key => !Object.hasOwn(DEFAULTS, key))) throw new TypeError('options contains unknown fields');
  const {maxEdits, maxChangedChars, maxSkillChars} = {...DEFAULTS, ...options};
  assertLimit(maxEdits, 'maxEdits', {max: 4});
  assertLimit(maxChangedChars, 'maxChangedChars', {max: 100000});
  assertLimit(maxSkillChars, 'maxSkillChars');
  if (text.length > maxSkillChars) throw new RangeError('input skill exceeds maxSkillChars');
  if (edits.length > maxEdits) throw new RangeError(`edits exceed maxEdits (${maxEdits})`);
  if (edits.length === 0) throw new TypeError('edits must contain at least one operation');
  edits.forEach(validateEdit);

  let result = text;
  let changedChars = 0;
  const operations = [];
  for (const edit of edits) {
    let added = 0;
    let removed = 0;
    if (edit.op === 'append') {
      result += edit.text;
      added = edit.text.length;
    } else if (edit.op === 'insert_after') {
      const at = requireExact(result, edit.anchor, 'anchor') + edit.anchor.length;
      result = result.slice(0, at) + edit.text + result.slice(at);
      added = edit.text.length;
    } else {
      const at = requireExact(result, edit.old, 'old');
      removed = edit.old.length;
      const replacement = edit.op === 'replace' ? edit.new : '';
      added = replacement.length;
      result = result.slice(0, at) + replacement + result.slice(at + edit.old.length);
    }
    changedChars += removed + added;
    if (changedChars > maxChangedChars) throw new RangeError('edits exceed maxChangedChars');
    if (result.length > maxSkillChars) throw new RangeError('result exceeds maxSkillChars');
    operations.push({op: edit.op, status: 'applied', changedChars: removed + added});
  }
  if (result === text) throw new Error('edits must change the skill');
  if (result.trim().length === 0) throw new Error('final skill must not be empty or whitespace-only');
  return {
    text: result,
    report: {
      status: 'applied',
      operations,
      changedChars,
    },
  };
}
