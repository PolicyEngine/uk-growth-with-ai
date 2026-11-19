"""Every number the Results and Who gains tabs print equals the data file,
and appears exactly as often as expected (each fact once).

    python3 scripts/check_numbers.py dump.json [path/to/surprise20xx.json]

The data file defaults to the active one (scripts/active_data.py: set
NEXT_PUBLIC_DATA=2027 for surprise2027.json), and so do the solve outputs
the raw-solve recompute reads (UGAI_OUT overrides them). Without those
outputs the recompute is reported NOT RUN, never passed.

dump.json is scripts/dumptabs.mjs's output. Where each figure is printed:
Summary, the three headline tiles (main arm, at the closure picked in the
header; with Both, the closed-capital value beside it); Income and output,
the four-measure card (one value per arm and measure at the closure picked;
with Both, the closed-capital value as screen-reader text; the main arm's
GDP, wage and GNI as a muted reference row linked to the story); Economy,
each line's headline-year end label, on all eight tiles (GNI and GDP too); Public finances, the debt/GDP and tax/GDP end labels and the tax
card (its model figure only with closed capital, when the chart's end
label is a different number). Signed figures with a unit (+0.57%, -1.6pp) are pulled from the page
text as a multiset and compared with the multiset built from the data file
with the page's own formatting.
"""
import json, os, re, sys
from collections import Counter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import active_data  # noqa: E402

dump = json.load(open(sys.argv[1]))
# dumptabs.mjs appends each closed "More info" fold's text after this mark
# (item-36-fable.md §1.3). The counts below are of the printed figures, so
# they read the text before it; the fold's text stays in the dump for the
# checks that only need a figure to be present.
MORE_MARK = '[[more info]]'
dump = {sid: {k: (v.split(MORE_MARK)[0] if isinstance(v, str) else v) for k, v in tabs.items()} for sid, tabs in dump.items()}
D = active_data.load_surprise(sys.argv[2] if len(sys.argv) > 2 else None)
Y = D['years']; H = D['headline_year']; LATE = D['late_year']
ARMS = [a['id'] for a in D['arms']]
C, B = 'zk0.1', 'zk0'

def signed(x, dp):
    if abs(x) < 0.5 * 10 ** -dp:
        return f"{0:.{dp}f}"
    return ("+" if x >= 0 else "−") + f"{abs(x):.{dp}f}"

def g(sid, arm, cl, v, year=H):
    r = D['results'].get(sid, {}).get(arm, {}).get(cl, {'status': 'pending'})
    return r['gaps'][v][Y.index(year)] if r['status'] == 'done' else None

# R4 holds the stress test's headline-year GDP within 0.01pp of zero
# (surprise.js R4_TOL_PP, review round 3, R3-05): inside it the page prints
# 0.00% (held), not the solver's residue
R4_TOL_PP = 0.01
def held(arm, v, x):
    return 0.0 if arm == 'ss' and v == 'Y' and x is not None and abs(x) <= R4_TOL_PP else x

NUM = re.compile(r"[+−]?\d+\.\d+(?:%|pp)")
# the economy wall: every tile's lines end in their headline-year value,
# national income (NNI, M1: it leads, GNI beside it in the open tile's
# finding) and GDP included (item 13, 18 Nov: values on every panel)
ECON = [('NNI', '%', 1), ('Y', '%', 1), ('C', '%', 1), ('I', '%', 1), ('K', '%', 1), ('L', '%', 1), ('r_bp', 'pp', 0.01), ('labour_share_pp', 'pp', 1)]
SUBS = ['summary', 'income', 'economy', 'finances']
bad = 0

WINDOW = [y for y in Y if D['window'][0] <= y <= D['window'][1]]

def coincides(sid, arm, cl, v, k, years=None):
    path = lambda a: [g(sid, a, cl, v, yr) for yr in (years or WINDOW)]
    mine = path(arm)
    for a in ARMS[:ARMS.index(arm)]:
        other = path(a)
        if None in other or None in mine:
            continue
        if signed(mine[-1] * k, 2) == signed(other[-1] * k, 2) and all(abs(p * k - q * k) < 0.005 for p, q in zip(mine, other)):
            return True
    return False

def expected(sid, mode):
    """The figures Results prints for a scenario with the closure picker at mode."""
    exp = Counter()
    def add(x, dp, unit):
        if x is not None:
            exp[signed(x, dp) + unit] += 1
    main = B if mode == 'closed' else C          # the closure single values read
    shown = [C, B] if mode == 'both' else [main]  # dumbbell markers (B as screen-reader text with Both)
    # Summary: the three headline tiles (national income as NNI, M1); with
    # Both, closed capital beside each; GNI beside NNI ("before
    # depreciation"); the consumption line (Maria's point 6), with GDP's
    # value beside it while consumption stays below the path through the
    # headline year and GDP is above it
    for v in ['Y', 'w', 'NNI']:
        add(g(sid, 'tfp', main, v), 2, '%')
        if mode == 'both':
            add(g(sid, 'tfp', B, v), 2, '%')
    if g(sid, 'tfp', main, 'NNI') is not None:
        add(g(sid, 'tfp', main, 'GNI'), 2, '%')
    cs = [g(sid, 'tfp', main, 'C', yr) for yr in Y if yr >= D['surprise_year']]
    if cs and None not in cs and cs[0] < -0.005:
        add(g(sid, 'tfp', main, 'C'), 2, '%')
        k = 0
        while k < len(cs) and cs[k] < -0.005:
            k += 1
        yH = g(sid, 'tfp', main, 'Y')
        if Y[Y.index(D['surprise_year']) + k - 1] >= D['headline_year'] and yH is not None and yH > 0.005:
            add(yH, 2, '%')
    for arm in ARMS:
        # Income and output: the four-measure card. The main arm's GDP, wage
        # and GNI have their home in the story's headline tiles; the card
        # prints them as one muted reference row linked to that home (the
        # reference-row rule: one per comparison chart).
        for v in ['GNI', 'Y', 'NNI', 'w']:
            for cl in shown:
                add(held(arm, v, g(sid, arm, cl, v)), 2, '%')
        # Economy: headline-year end labels (the central line with Both)
        for v, unit, k in ECON:
            x = g(sid, arm, main, v)
            # an arm whose path coincides with an earlier arm's (within half the
            # last printed digit in every year, same printed end value) prints
            # no end value (ResultsTab)
            if x is not None and not coincides(sid, arm, main, v, k): add(held(arm, v, x) * k, 2, unit)  # Economy end labels, 2dp (ResultsTab endDp)
        # Public finances: debt/GDP late-year and tax/GDP headline-year end labels
        if not coincides(sid, arm, main, 'debt_gdp_pp', 1, [y for y in Y if D['window'][0] <= y <= LATE]):
            add(g(sid, arm, main, 'debt_gdp_pp', LATE), 2, 'pp')
        if not coincides(sid, arm, main, 'tax_gdp_pp', 1):
            add(g(sid, arm, main, 'tax_gdp_pp', H), 2, 'pp')
    # the tax card stays central: the top of the rough UK-rates range,
    # labour-share fall x 0.23 (the bottom prints without a unit). The model's
    # central tax/GDP (main arm) is the chart's end label, so the card prints
    # it only when the chart shows closed capital.
    if mode == 'closed':
        add(g(sid, 'tfp', C, 'tax_gdp_pp', H), 2, 'pp')
    ls = g(sid, 'tfp', C, 'labour_share_pp')
    if ls is not None:
        add(ls * 0.23, 2, 'pp')
    # and OG-UK's labour vs capital effective tax-rate gap on the path in the
    # headline year, central closure (one decimal, unsigned): the causes chart
    etr = D['closures'][C]['reference_effective_tax_rates']
    exp[f"{etr['labour'] - etr['capital_gross']:.1f}pp"] += 1
    # item 40 (item-40-fable.md, mandated text): the card's first claim
    # states the same gap ("OG-UK taxes labour 14.8pp more than capital;
    # OBR rates imply 19-23pp"), so it prints twice
    exp[f"{etr['labour'] - etr['capital_gross']:.1f}pp"] += 1
    # and PolicyEngine UK's average employer NICs rate, % of earnings (one
    # decimal): the causes chart's NICs row, from analysis/nics/nics_<year>.json
    # (copied to src/tabs/explore/nics<year>.json); OG-UK's flat rate prints
    # as a whole number
    nics = active_data.load_nics()
    exp[f"{nics['avg_employer_rate_on_employment_income'] * 100:.1f}%"] += 1
    return exp

for sid in dump:
    for mode in ('central', 'closed', 'both'):
        keys = [f'results:{s_}' + ('' if mode == 'central' else f':{mode}') for s_ in SUBS]
        if any(k not in dump[sid] for k in keys):
            bad += 1; print(sid, mode, 'not in the dump'); continue
        exp = expected(sid, mode)
        got = Counter(NUM.findall('\n'.join(dump[sid][k] for k in keys)))
        if got != exp:
            bad += 1
            print(sid, mode, 'missing:', dict(exp - got), 'extra:', dict(got - exp))
        else:
            print(sid, mode, 'ok:', sum(exp.values()), 'figures, each as often as expected')
    # a pending value prints "not yet solved" (surprise.js PENDING), never a number
    n_pending = sum(1 for arm in ARMS for v in ['GNI', 'Y', 'NNI', 'w'] for cl in (C, B) if g(sid, arm, cl, v) is None)
    if dump[sid].get('results:income:both', '').count('not yet solved') < n_pending:
        bad += 1; print(sid, 'too few "pending" on Results')
# Every finished gap in the data file equals the raw solve over its
# continuation (as the session's check_numbers.py did).
OUT = active_data.OUT
raw_bad = 0
raw_run = 0
if not active_data.HAVE_OUT:
    print('raw-solve recompute: NOT RUN, no solve outputs at', OUT)
for sid, arms in (D['results'].items() if active_data.HAVE_OUT else []):
    for a, cls in arms.items():
        for cl, r in cls.items():
            if r['status'] != 'done':
                continue
            raw_run += 1
            s_ = json.load(open(f"{OUT}/{cl}/{r['label']}.json"))['series']
            b_ = json.load(open(f"{OUT}/{cl}/continuation.json"))['series']
            for v in ['Y', 'GNI', 'NNI', 'w', 'C', 'I', 'K', 'L']:
                for k in range(len(Y)):
                    if abs((s_[v][k] / b_[v][k] - 1) * 100 - r['gaps'][v][k]) > 1e-9:
                        raw_bad += 1
print('raw-solve recompute mismatches:', raw_bad, f'({raw_run} done cells checked)')

# The fiscal-rule box with a rule chosen (Public finances; none under the
# common rule): every chart
# follows the rule, so the card prints how far the rule moves each arm's
# headline-year GDP, GNI, wage and consumption gap against the common rule
# (pp), for the closure(s) in view, once each, and only for the scenarios the
# variant is solved for; an unsolved rule or scenario prints no figure.
RULE_BTN = {'debt_neutral': 'dn', 'fixed_spending': 'fixed'}
for rid, rule in D.get('rules', {}).items():
    for sid in dump:
        for mode, cls in (('central', [C]), ('closed', [B]), ('both', [C, B])):
            key = f'results:finances:{mode}:{RULE_BTN[rid]}'
            if key not in dump[sid]:
                continue
            exp = Counter()
            for cl in cls:
                for arm in ARMS:
                    r = rule['results'].get(sid, {}).get(arm, {}).get(cl, {'status': 'pending'})
                    if r['status'] == 'done':
                        for v in ['Y', 'GNI', 'w', 'C']:
                            exp[signed(r['gaps'][v][Y.index(H)] - g(sid, arm, cl, v), 2) + 'pp'] += 1
            got = Counter(NUM.findall(dump[sid][key]))
            if got != exp:
                bad += 1
                print(sid, rid, mode, 'missing:', dict(exp - got), 'extra:', dict(got - exp))
            else:
                print(sid, rid, mode, 'ok:', sum(exp.values()), 'figures')
    # each shown variant gap equals the raw solve over its continuation
    for sid, arms in rule['results'].items():
        for a, by_cl in arms.items():
            for cl, r in by_cl.items():
                if r['status'] != 'done' or not active_data.HAVE_OUT:
                    continue
                s_ = json.load(open(f"{OUT}/{cl}/{r['label']}.json"))['series']
                b_ = json.load(open(f"{OUT}/{cl}/continuation.json"))['series']
                for v in ['Y', 'GNI', 'NNI', 'w', 'C', 'I', 'K', 'L']:
                    for k in range(len(Y)):
                        if abs((s_[v][k] / b_[v][k] - 1) * 100 - r['gaps'][v][k]) > 1e-9:
                            bad += 1; print('raw-solve mismatch', rid, sid, a, cl, v)
# The Who gains tab (default view: central closure, debt-neutral, main arm)
# prints, once each: the average, the no-bequest average, the average with
# the post-2035 cost charged (a range), the capital and labour sources, the
# bottom and top earnings groups, and the 45-year-old's transfer cost. Two
# different facts can round to the same figure (the no-bequest average and
# the top 1%), so this is a multiset. The welfare breakdown card's parts
# (consumption, leisure, bequests: parts_alive) print once, at each bar's
# end, at the central closure (with Both too); its Total row restates the
# average tile and is marked data-axis, so dumptabs leaves it out.
CO = active_data.load_cohorts()
def tiles(c, cl=None):
    exp = Counter(signed(x, 2) + '%' for x in [c['alive_avg'], c['no_bequest_alive_avg'], c['sources_alive']['capital'], c['sources_alive']['labour']])
    # where the cell is solved to the horizon (cohorts2028.json `dnfull`) that
    # replaces the first-order charge-back on the page
    full = CO.get('dnfull') or {}
    solved = full.get('ready') and full.get('closure') == cl and full.get('rule') == 'dn' and full.get('arm') == 'tfp'
    rng = full['range'] if solved else c.get('charged')
    # "Both" (no_bequest_avg) and, since review round 1 (R1-10), "Transfers
    # pay" (joint_avg): each a range, an equal low and high printed once
    for key in ('no_bequest_avg', 'joint_avg'):
        if rng and rng.get(key):
            lo, hi = (signed(x, 2) + '%' for x in rng[key])
            for t in {lo, hi}:
                exp[t] += 1
    return exp
# What drives the result (item 21): the bottom and top earnings groups (box
# B), the consumption line's two ends (box A: the first and last c_gap
# years) and the stress test at ages 20 and 65 (box D). The age-45 transfer
# pair is inside the closed "More info" disclosure, so it is not read.
def why(c, cl=C, rule='dn'):
    s = CO['closures'][cl]['rules'][rule]['stress']
    xs = CO['closures'][cl]['birth_year']
    ys = sorted(c['c_gap'], key=int)
    vals = [c['alive_by_group'][0], c['alive_by_group'][6], c['c_gap'][ys[0]], c['c_gap'][ys[-1]],
            s['cev_all'][xs.index(CO['shock_year'] - 20)], s['cev_all'][xs.index(CO['shock_year'] - 65)]]
    return Counter(signed(x, 2) + '%' for x in vals)
c = CO['closures'][C]['rules']['dn']['tfp']
def parts(c):
    return Counter(signed(c['parts_alive'][k], 2) + '%' for k in ('consumption', 'leisure', 'bequests'))
# With Closure = Both (who:both) the tiles print once per closure; the Why
# cards stay at the central closure.
EXPECT = {'who': tiles(c, C) + why(c) + parts(c), 'who:both': tiles(c, C) + tiles(CO['closures'][B]['rules']['dn']['tfp'], B) + why(c) + parts(c)}
for sid in dump:
    for key, exp in EXPECT.items():
        got = Counter(NUM.findall(dump[sid].get(key, '')))
        if got != exp:
            bad += 1
            print(sid, key, 'missing:', dict(exp - got), 'extra:', dict(got - exp))
        else:
            print(sid, key, 'ok:', sum(exp.values()), 'figures')
# Across scenarios (#explore-part-all: on Economy, and on the All scenarios
# sub-tab while it exists; results:all) prints:
#   - the zk0.5 sensitivity dot rows: each scenario and arm's headline-year
#     GDP, GNI, NNI and wage gaps once, every shown gap equal to its raw solve
#     over that closure's continuation;
#   - the matrix explorer at load (main arm, GDP): every solved scenario x
#     closure x fiscal-rule cell's headline-year gap once, the cell in view
#     too (the address's scenario, central closure, common rule): its figure
#     has its home in the story's headline tiles, and the matrix prints it as
#     a muted reference value linked to that home (reference-row rule).
# Method no longer prints the table.
RULE_RES = {'common': D['results'], **{k: v['results'] for k, v in (('fixed', D.get('rules', {}).get('fixed_spending', {})), ('dn', D.get('rules', {}).get('debt_neutral', {}))) if v}}
def matrix(view):
    exp = Counter()
    for rule, res in RULE_RES.items():
        for sid_ in res:
            for cl_ in (C, B):
                r = res.get(sid_, {}).get('tfp', {}).get(cl_, {'status': 'pending'})
                if r['status'] == 'done':
                    exp[signed(r['gaps']['Y'][Y.index(H)], 2) + '%'] += 1
    return exp
for cl, sens in D.get('sensitivity', {}).items():
    exp = Counter()
    for sid, arms in sens['results'].items():
        for a, r in arms.items():
            if r['status'] != 'done':
                continue
            for v in ['Y', 'GNI', 'NNI', 'w']:
                exp[signed(r['gaps'][v][Y.index(H)], 2) + '%'] += 1
            if not active_data.HAVE_OUT:
                continue
            s_ = json.load(open(f"{OUT}/{cl}/{r['label']}.json"))['series']
            b_ = json.load(open(f"{OUT}/{cl}/continuation.json"))['series']
            for v in ['Y', 'GNI', 'NNI', 'w', 'C', 'I', 'K', 'L']:
                for k in range(len(Y)):
                    if abs((s_[v][k] / b_[v][k] - 1) * 100 - r['gaps'][v][k]) > 1e-9:
                        bad += 1; print('raw-solve mismatch', cl, sid, a, v)
    for sid in dump:
        if 'results:all' not in dump[sid]:
            bad += 1; print(sid, 'results:all not in the dump'); continue
        got = Counter(NUM.findall(dump[sid]['results:all']))
        want = exp + matrix(sid)
        if got != want:
            bad += 1
            print(sid, 'all scenarios', cl, 'missing:', dict(want - got), 'extra:', dict(got - want))
        else:
            print(sid, 'all scenarios', cl, 'ok:', sum(want.values()), 'figures')
        # Method's other figures (rates, shares) are not two-decimal gaps,
        # except the stress-test arm card (Scenarios, in OG-UK method): UK
        # central's output at fixed inputs against technology unchanged,
        # once per closure (fixedInputVsTz: Z_terminal of 'ss' over 'tz')
        left = Counter(re.findall(r"[+−]\d+\.\d\d%", dump[sid].get('method', '')))
        stress = Counter()
        for scl, ss in D['results']['uk_central'].get('ss', {}).items():
            tz = D['results']['uk_central'].get('tz', {}).get(scl, {})
            if ss.get('status') == 'done' and tz.get('status') == 'done':
                stress[signed((ss['Z_terminal'] / tz['Z_terminal'] - 1) * 100, 2) + '%'] += 1
        if left != stress:
            bad += 1; print(sid, 'method gaps: expected the stress-test pair', dict(stress), 'got', dict(left))

# The story's parts 1 and 3, and any later part, are checked by their own
# modules in scripts/checks/ (one writer each): check(dump) -> failures.
import importlib, pkgutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import checks
for m in sorted(pkgutil.iter_modules(checks.__path__), key=lambda m: m.name):
    bad += importlib.import_module(f'checks.{m.name}').check(dump)
bad += raw_bad
print('FAIL' if bad else ('PASS' if active_data.HAVE_OUT else 'PASS on the dump only: raw-solve recompute NOT RUN')); sys.exit(1 if bad else 0)
