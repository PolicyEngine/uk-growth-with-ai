// The 2028-surprise pipeline, step by step. Every command is copied from the
// scripts and CLI it names (analysis/surprise/driver.sh, run_locked.sh,
// sanity.py, build_dashboard_data.py; uk_growth_with_ai/cli.py `surprise`).
// The commands assume the repository root as the working directory, PY and
// WORK set, and the `sp` helper from "Before you start", which runs the CLI
// exactly as driver.sh does.

export const REF = 'dashboard/ab2026-redesign';

export const SP_HELPER = `export PY=/path/to/og-uk/.venv/bin/python   # Python 3.13, OG-Core 0.17.0 + the γ patch
export WORK=~/ugai-rerun-work                    # holds <closure>/baseline_p1 from the R1–R4 rerun
export PYTHONPATH=$PWD OUT=$PWD/analysis/surprise/output RERUN=$PWD/analysis/rerun/output
# Run the surprise CLI as driver.sh does: from $WORK, with the repo's output folders
sp() { ( cd "$WORK" && "$PY" -m uk_growth_with_ai surprise "$@" --outdir "$OUT" --rerun-dir "$RERUN" ); }`;

export const STEPS = [
  {
    id: 'p-lock',
    icon: 'lock',
    short: 'Lock',
    title: 'Take the lock and run the plan',
    file: 'analysis/surprise/run_locked.sh',
    line: 'One heavy job at a time. It stops at a solve boundary before a deadline.',
    more: [
      'It takes the machine’s heavy-job lock as a labelled file and never touches anyone else’s.',
      'DEADLINE_AT (default 19:25) and SOLVE_BUDGET (default 600 s) decide whether a solve may start.',
    ],
    code: `# The default plan, in Vahid's order of 12 Nov 2026
analysis/surprise/run_locked.sh

# Or named items only, with a later deadline
DEADLINE_AT=23:00 analysis/surprise/run_locked.sh zk0.1:arms:uk_central`,
  },
  {
    id: 'p-driver',
    icon: 'list',
    short: 'Driver',
    title: 'The driver: one step at a time',
    file: 'analysis/surprise/driver.sh',
    line: 'Runs each item in order, skips what is done, commits and pushes each output.',
    more: [
      'It refuses to run on any branch but rerun/surprise-2028. For a fork, edit BRANCH and progress().',
      'Items: check, nics, <closure>:continuation, <closure>:gate, <closure>:<arms|arms_dn|arms_fs>:<scenario>.',
    ],
    code: `# Normally called by run_locked.sh; the item syntax:
analysis/surprise/driver.sh check nics \\
  zk0.1:continuation zk0.1:gate \\
  zk0.1:arms:uk_central zk0:arms:uk_central`,
  },
  {
    id: 'p-specs',
    icon: 'flask',
    short: 'Check specs',
    title: 'Check the specification',
    file: 'uk_growth_with_ai/surprise.py',
    line: 'One specification build, no solve. It checks the 2028 restart before anything runs.',
    more: [
      'It tests the inherited wealth and bequests, the population law of motion and the list of shifted inputs.',
      'The build needs about 15 GB of memory and covers both closures.',
    ],
    code: `sp check-specs --closure zk0.1 --work "$WORK"`,
  },
  {
    id: 'p-gate',
    icon: 'repeat',
    short: 'Continuation gate',
    title: 'The continuation gate',
    file: 'analysis/surprise/output/zk0.1/GATE_continuation.json',
    line: 'A no-shock restart must reproduce the baseline. Every gap is measured against it.',
    more: [
      'GDP, capital and debt/GDP must match within 10⁻⁴ over 2028–2036; the rest within 10⁻³.',
      'If it fails, the driver stops and nothing else runs. The tolerance is never loosened silently.',
    ],
    code: `sp step --closure zk0.1 --stage continuation --work "$WORK"
sp gate --closure zk0.1                     # print the gate report
sp gate --closure zk0.1 --approve --reference continuation --note "..."`,
  },
  {
    id: 'p-grid',
    icon: 'layoutGrid',
    short: 'Scenario grid',
    title: 'The scenario grid',
    file: 'analysis/surprise/uk_targets.json',
    line: 'UK low, central and high, plus Korinek et al. (upper). Each has three arms.',
    more: [
      '--scenario defaults to korinek, so always pass it.',
      'next prints the next solve for a scenario, or nothing when the set is done.',
    ],
    code: `sp next --closure zk0.1 --stage arms --scenario uk_central
sp step --closure zk0.1 --stage arms --scenario uk_central --work "$WORK"`,
  },
  {
    id: 'p-r4',
    icon: 'target',
    short: 'R4 on 2031 GDP',
    title: 'R4: hold 2031 GDP for the stress test',
    file: 'uk_growth_with_ai/surprise.py',
    line: 'A secant on Z until the stress test’s 2031 GDP gap is within 0.01pp of zero.',
    more: [
      'The first step takes its slope from the committed 2026-start secant.',
      'Each iteration is a full solve; next hands them out in turn.',
    ],
    code: `# Repeat until next prints nothing; R4 iterations are labelled _r4_1, _r4_2, ...
sp next --closure zk0.1 --stage arms --scenario uk_central
sp status --closure zk0.1                   # minutes and convergence per solve`,
  },
  {
    id: 'p-sanity',
    icon: 'alert',
    short: 'Sanity gate',
    title: 'The sanity gate after every solve',
    file: 'analysis/surprise/sanity.py',
    line: 'Identities, resource constraint, labour share and signs. Any failure stops the run.',
    more: [
      'The expected signs and sizes were committed before any solve, in expectations.json.',
      'Red-flag diagnostics are reported for every solve but never fail it.',
    ],
    code: `"$PY" analysis/surprise/sanity.py zk0.1 uk_central_share_shift_tfp_ramp --outdir "$OUT"`,
  },
  {
    id: 'p-outputs',
    icon: 'database',
    short: 'Outputs',
    title: 'Per-solve records and results files',
    file: 'analysis/surprise/output/zk0.1',
    line: 'One JSON record, log and sanity report per solve, per closure.',
    more: ['assemble collects one scenario’s solves into a results file under uk_growth_with_ai/data/.'],
    code: `ls analysis/surprise/output/zk0.1/
sp assemble --closure zk0.1 --scenario uk_central
# writes uk_growth_with_ai/data/scenarios_surprise2028_uk_central.json`,
  },
  {
    id: 'p-dash',
    icon: 'package',
    short: 'Dashboard data',
    title: 'Build the dashboard data',
    file: 'analysis/surprise/build_dashboard_data.py',
    line: 'Writes surprise2028.json from whatever solves exist. Missing ones are marked pending.',
    more: ['Every gap is against the continuation of the same closure.', 'No solve is run.'],
    code: `python3 analysis/surprise/build_dashboard_data.py   # dashboard/src/data/surprise2028.json
cd dashboard && bun install --frozen-lockfile && bun run build`,
  },
];
