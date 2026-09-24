import { command } from './shared/io.mjs';

// An optional Jev adapter receives training evidence only. Its decision cannot
// waive a deterministic failure, a validation gate, or human approval.
export async function triageRepair(config, trainingRun) {
  const checks = trainingRun.checks ?? [];
  const failed = checks.filter(check => !check.passed);
  const componentBlocked = trainingRun.packageAssessment?.tests?.some(test => test.status !== 'passed') || (trainingRun.packageAssessment?.issues?.length ?? 0) > 0;
  const blocked = failed.length > 0 || componentBlocked;
  const argv = config.optimization?.triageCommand;
  if (!argv) return { status: 'disabled', route: blocked ? 'propose' : 'stop', reasons: blocked ? ['deterministic_failure'] : ['no_failed_training_checks'] };
  try {
    const output = await command(argv, JSON.stringify({ version: 1, task: 'Determine whether training evidence warrants skill repair. pass means no repair; fail means a blocker; insufficient means uncertain.', checks, componentBlocked: !!componentBlocked, responseFormat: { choice: 'pass|fail|insufficient', reason: 'brief evidence-bound explanation' } }), { cwd: config.base, timeoutMs: config.timeoutMs });
    const result = JSON.parse(output);
    if (!result || !['pass', 'fail', 'insufficient'].includes(result.choice) || (result.reason !== undefined && (typeof result.reason !== 'string' || result.reason.length > 2000))) throw Error('Invalid triage response');
    const reasons = blocked ? ['deterministic_failure'] : [];
    if (result.choice !== 'pass') reasons.push(`triage_${result.choice}`);
    return { status: 'success', route: reasons.length ? 'propose' : 'stop', choice: result.choice, reasons, reason: result.reason ?? '' };
  } catch {
    return { status: 'error', route: 'propose', reasons: ['triage_error'] };
  }
}
