// GTM Autoresearch in the browser. A port of audit(), applyOperations() and
// optimize() from audit.mjs that runs on a stripped container: names, IDs, types,
// trigger links, folder IDs, {{references}} and a hash of each element's settings.
// Scores match audit.mjs exactly (checked by test/auto.test.mjs). Nothing here can
// publish; the operations are metadata only (rename, addFolder, assignFolder).
var GTM_AUTO = (function () {
  'use strict';
  var groups = { tag: 'tagId', trigger: 'triggerId', variable: 'variableId', folder: 'folderId' };
  var dims = ['references', 'duplicates', 'naming', 'hygiene', 'legacy', 'folders'];
  var builtinTriggers = { '2147479553': 1, '2147479572': 1, '2147479573': 1 };
  var internalVariables = { _event: 1 };
  var clone = function (x) { return JSON.parse(JSON.stringify(x)); };
  // Stripped rows carry their references in row.refs; full export rows are scanned like audit.mjs does.
  var refs = function (row) {
    var out = [], scan = function (v) { if (typeof v === 'string') v.replace(/\{\{([^{}]+)\}\}/g, function (_, n) { out.push(n); }); else if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { scan(v[k]); }); };
    if (typeof row.refs === 'string') scan(row.refs); else scan(row);
    return out;
  };
  var seqMatch = function (r, tag) { return r.tagName === tag.name || r.tagName === tag.tagId; };

  function audit(c) {
    var findings = [];
    var add = function (dimension, severity, kind, row, id, message) { findings.push({ dimension: dimension, severity: severity, kind: kind, id: row[id], name: row.name, message: message }); };
    var triggerIds = {}, variableNames = {}, folderIds = {}, usedTriggers = {}, usedVariables = {};
    c.trigger.forEach(function (t) { triggerIds[t.triggerId] = 1; });
    c.variable.concat(c.builtInVariable).forEach(function (v) { variableNames[v.name] = 1; });
    c.folder.forEach(function (f) { folderIds[f.folderId] = 1; });
    c.tag.forEach(function (tag) {
      (tag.firingTriggerId || []).concat(tag.blockingTriggerId || []).forEach(function (id) {
        usedTriggers[id] = 1;
        if (!triggerIds[id] && !builtinTriggers[id]) add('references', 'critical', 'tag', tag, 'tagId', 'Unresolved trigger ID ' + id);
      });
      var sequenced = c.tag.some(function (t) { return (t.setupTag || []).concat(t.teardownTag || []).some(function (s) { return seqMatch(s, tag); }); });
      if (!tag.paused && !(tag.firingTriggerId || []).length && !sequenced) add('hygiene', 'review', 'tag', tag, 'tagId', 'No firing trigger; review intended use');
      if (tag.type === 'ua') add('legacy', 'review', 'tag', tag, 'tagId', 'Universal Analytics tag; review migration');
    });
    Object.keys(groups).forEach(function (key) {
      var id = groups[key], seen = {};
      c[key].forEach(function (row) {
        if (key !== 'folder') {
          refs(row).forEach(function (name) {
            usedVariables[name] = 1;
            if (!variableNames[name] && !internalVariables[name]) add('references', 'critical', key, row, id, 'Unresolved variable ' + name);
          });
          if (!row.parentFolderId) add('folders', 'info', key, row, id, 'No folder assigned');
          else if (!folderIds[row.parentFolderId]) add('references', 'critical', key, row, id, 'Unresolved parent folder');
          if (seen[row.sig]) add('duplicates', 'review', key, row, id, 'Configuration matches ' + seen[row.sig] + '; confirm whether intentional');
          else seen[row.sig] = row[id];
        }
        var n = row.name.trim();
        if (!n || /^(tag|trigger|variable)\s*\d+$/i.test(n)) add('naming', 'info', key, row, id, 'Generic or empty name');
      });
    });
    c.trigger.forEach(function (t) { if (!usedTriggers[t.triggerId]) add('hygiene', 'review', 'trigger', t, 'triggerId', 'No tag references this trigger; review before removal'); });
    c.variable.forEach(function (v) { if (!usedVariables[v.name]) add('hygiene', 'review', 'variable', v, 'variableId', 'No configuration reference found; external use not verified'); });
    var size = Math.max(1, c.tag.length + c.trigger.length + c.variable.length), scores = {};
    dims.forEach(function (d) { scores[d] = Math.max(0, 100 - 100 * findings.filter(function (f) { return f.dimension === d; }).length / size); });
    var total = 0; dims.forEach(function (d) { total += scores[d]; });
    return { score: Math.round(total / dims.length * 100) / 100, dimensions: scores, findings: findings, criticalCount: findings.filter(function (f) { return f.severity === 'critical'; }).length };
  }

  function applyOperations(input, operations) {
    var c = clone(input);
    if (!Array.isArray(operations) || operations.length > 100) throw Error('Expected at most 100 operations');
    operations.forEach(function (op) {
      if (!op || ['rename', 'assignFolder', 'addFolder'].indexOf(op.op) < 0) throw Error('Unsupported mutation operation');
      if (op.op === 'addFolder') {
        if (typeof op.id !== 'string' || !/^\d+$/.test(op.id) || typeof op.name !== 'string' || !op.name.trim() || c.folder.some(function (f) { return f.folderId === op.id; })) throw Error('Invalid new folder');
        c.folder.push({ folderId: op.id, name: op.name }); return;
      }
      if (!Object.prototype.hasOwnProperty.call(groups, op.kind)) throw Error('Invalid component kind');
      var row = c[op.kind].filter(function (r) { return r[groups[op.kind]] === op.id; })[0];
      if (!row) throw Error('Unknown mutation target');
      if (op.op === 'assignFolder') {
        if (op.kind === 'folder' || !c.folder.some(function (f) { return f.folderId === op.folderId; })) throw Error('Unknown folder');
        row.parentFolderId = op.folderId;
      } else {
        if (typeof op.name !== 'string' || !op.name.trim() || op.name.length > 256 || /[{}]/.test(op.name)) throw Error('Invalid name');
        if (c[op.kind].some(function (r) { return r !== row && r.name === op.name; })) throw Error('Name collision');
        if (op.kind === 'variable' && c.builtInVariable.some(function (v) { return v.name === op.name; })) throw Error('Built-in variable name collision');
        if (op.kind === 'variable' && c.tag.concat(c.trigger, c.variable).some(function (r) { return refs(r).indexOf(row.name) >= 0; })) throw Error('Cannot rename referenced variable');
        if (op.kind === 'tag' && c.tag.some(function (t) { return (t.setupTag || []).concat(t.teardownTag || []).some(function (s) { return seqMatch(s, row); }); })) throw Error('Cannot rename sequenced tag');
        row.name = op.name;
      }
    });
    return c;
  }

  // One round of the loop; the same gates as optimize() in audit.mjs.
  function step(state, proposal) {
    var operations = proposal.operations, round = state.rounds.length + 1, entry = { round: round, idea: proposal.idea || null, why: proposal.why || '', source: proposal.source || 'heuristic', operations: operations || [] };
    try {
      var candidate = applyOperations(state.best, operations), next = audit(candidate), cur = state.report;
      var regress = dims.filter(function (d) { return next.dimensions[d] < cur.dimensions[d]; });
      entry.score = next.score; entry.dimensions = next.dimensions; entry.criticalCount = next.criticalCount;
      entry.accepted = next.score > cur.score && next.criticalCount <= cur.criticalCount && !regress.length;
      entry.reason = entry.accepted ? 'Score rose with no new critical findings and no dimension lower.' : next.score <= cur.score ? 'Rejected: the score did not rise.' : next.criticalCount > cur.criticalCount ? 'Rejected: it adds critical findings.' : 'Rejected: ' + regress.join(', ') + ' went down.';
      if (entry.accepted) { state.best = candidate; state.report = next; state.plateau = 0; } else state.plateau++;
    } catch (e) { entry.accepted = false; entry.error = e.message; entry.reason = 'Rejected by the guardrails: ' + e.message + '.'; state.failures++; }
    state.rounds.push(entry);
    state.done = state.rounds.length >= state.maxRounds || state.plateau >= state.plateauRounds || state.failures >= state.maxFailures;
    return entry;
  }
  function start(container, opts) {
    opts = opts || {};
    var c = clone(container), r = audit(c);
    return { baseline: r, report: r, best: c, start: c, rounds: [], plateau: 0, failures: 0, done: false, published: false,
      maxRounds: opts.maxRounds || 8, maxFailures: opts.maxFailures || 2, plateauRounds: opts.plateauRounds || 2 };
  }

  // A deterministic proposer: folder by platform, then pull triggers and variables
  // in beside the tags that use them. Each call proposes the next idea not yet tried.
  function nextId(c) { var m = 0; c.folder.forEach(function (f) { m = Math.max(m, +f.folderId || 0); }); return function () { return String(++m); }; }
  function folderFor(c, name, make, ops) {
    var f = c.folder.filter(function (x) { return x.name === name; })[0] || ops.filter(function (o) { return o.op === 'addFolder' && o.name === name; })[0];
    if (f) return f.folderId || f.id;
    var id = make(); ops.push({ op: 'addFolder', id: id, name: name }); return id;
  }
  var IDEAS = [
    { key: 'tags', why: 'Group unfiled tags into one folder per platform.', run: function (c, meta) {
      var ops = [], make = nextId(c);
      c.tag.forEach(function (t) {
        if (t.parentFolderId || ops.length > 98) return; // a round holds at most 100 operations; the rest go next round
        var v = (meta.vendor && meta.vendor[t.tagId]) || 'Other tags'; ops.push({ op: 'assignFolder', kind: 'tag', id: t.tagId, folderId: folderFor(c, v, make, ops) });
      });
      return ops;
    } },
    { key: 'triggers', why: 'File each unfiled trigger with the tags it fires; shared ones go to "Shared triggers".', run: function (c) {
      var ops = [], make = nextId(c);
      c.trigger.forEach(function (t) {
        if (t.parentFolderId || ops.length > 98) return;
        var fs = {}; c.tag.forEach(function (g) { if ((g.firingTriggerId || []).concat(g.blockingTriggerId || []).indexOf(t.triggerId) >= 0 && g.parentFolderId) fs[g.parentFolderId] = 1; });
        var k = Object.keys(fs); if (!k.length) return;
        ops.push({ op: 'assignFolder', kind: 'trigger', id: t.triggerId, folderId: k.length === 1 ? k[0] : folderFor(c, 'Shared triggers', make, ops) });
      });
      return ops;
    } },
    { key: 'variables', why: 'File each unfiled variable with whatever reads it; shared ones go to "Shared variables".', run: function (c) {
      var ops = [], make = nextId(c);
      c.variable.forEach(function (v) {
        if (v.parentFolderId || ops.length > 98) return;
        var fs = {}; c.tag.concat(c.trigger, c.variable).forEach(function (r) { if (r !== v && refs(r).indexOf(v.name) >= 0 && r.parentFolderId) fs[r.parentFolderId] = 1; });
        var k = Object.keys(fs); if (!k.length) return;
        ops.push({ op: 'assignFolder', kind: 'variable', id: v.variableId, folderId: k.length === 1 ? k[0] : folderFor(c, 'Shared variables', make, ops) });
      });
      return ops;
    } },
    { key: 'dupes', why: 'Mark identical variables by renaming the copies "… (duplicate)".', run: function (c, meta, report) {
      return report.findings.filter(function (f) { return f.dimension === 'duplicates' && f.kind === 'variable'; }).slice(0, 5).map(function (f) { return { op: 'rename', kind: 'variable', id: f.id, name: f.name + ' (duplicate)' }; });
    } },
    { key: 'unused', why: 'Park unused variables in an "Unused – review" folder.', run: function (c, meta, report) {
      var ops = [], make = nextId(c), parked = (c.folder.filter(function (x) { return x.name === 'Unused – review'; })[0] || {}).folderId;
      var rowOf = function (id) { return c.variable.filter(function (v) { return v.variableId === id; })[0] || {}; };
      report.findings.filter(function (f) { return f.dimension === 'hygiene' && f.kind === 'variable' && (!parked || rowOf(f.id).parentFolderId !== parked); }).slice(0, 98).forEach(function (f) { ops.push({ op: 'assignFolder', kind: 'variable', id: f.id, folderId: folderFor(c, 'Unused – review', make, ops) }); });
      return ops;
    } },
  ];
  // An idea is used again while it keeps being accepted (large containers need
  // several rounds); once a round from it is rejected it is not proposed again.
  function propose(state, meta) {
    var tried = state.rounds.filter(function (r) { return !r.accepted; }).map(function (r) { return r.idea; });
    for (var i = 0; i < IDEAS.length; i++) {
      if (tried.indexOf(IDEAS[i].key) >= 0) continue;
      var ops = IDEAS[i].run(state.best, meta || {}, state.report);
      if (!ops.length) { tried.push(IDEAS[i].key); continue; }
      return { idea: IDEAS[i].key, why: IDEAS[i].why, operations: ops };
    }
    return null;
  }
  // Apply accepted operations to the user's own full export (read locally, never
  // sent anywhere) and return an importable GTM container file.
  function sameInventory(full, stripped) {
    var cv = full.containerVersion || full, problems = [];
    if ((cv.container || {}).publicId !== stripped.publicId) problems.push('container ' + ((cv.container || {}).publicId || 'unknown') + ' is not ' + stripped.publicId);
    ['tag', 'trigger', 'variable'].forEach(function (k) {
      var id = groups[k], a = {}, n = 0;
      (cv[k] || []).forEach(function (r) { a[r[id]] = r.name; });
      stripped[k].forEach(function (r) { if (a[r[id]] !== r.name) n++; });
      if (n || (cv[k] || []).length !== stripped[k].length) problems.push(k + 's differ from the version this page was built from');
    });
    return problems;
  }
  function exportContainer(full, operations) {
    var doc = clone(full), cv = doc.containerVersion || doc, info = cv.container || {};
    var base = { tag: cv.tag || [], trigger: cv.trigger || [], variable: cv.variable || [], folder: cv.folder || [], builtInVariable: cv.builtInVariable || [] };
    // Operations arrive as rounds (each at most 100, as accepted); a flat list is one round.
    var rounds = operations.length && Array.isArray(operations[0]) ? operations : [operations];
    var before = JSON.stringify(base), out = base, old = JSON.parse(before);
    rounds.forEach(function (ops) { out = applyOperations(out, ops); });
    ['tag', 'trigger', 'variable'].forEach(function (k) {
      var id = groups[k], prev = {}; old[k].forEach(function (r) { prev[r[id]] = r; });
      out[k].forEach(function (r) { var p = prev[r[id]]; if (p && (p.name !== r.name || p.parentFolderId !== r.parentFolderId)) delete r.fingerprint; });
      cv[k] = out[k];
    });
    var known = {}; old.folder.forEach(function (f) { known[f.folderId] = 1; });
    cv.folder = out.folder.map(function (f) { if (known[f.folderId]) return f; var n = { folderId: f.folderId, name: f.name }; if (info.accountId) n.accountId = info.accountId; if (info.containerId) n.containerId = info.containerId; return n; });
    var d = new Date(), p2 = function (x) { return (x < 10 ? '0' : '') + x; };
    if (doc.containerVersion) doc.exportTime = d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds());
    return doc;
  }
  return { audit: audit, applyOperations: applyOperations, start: start, step: step, propose: propose, dims: dims, sameInventory: sameInventory, exportContainer: exportContainer };
})();
