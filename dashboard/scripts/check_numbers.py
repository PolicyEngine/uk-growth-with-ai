"""Every number the Results and Who gains tabs print equals the data file,
and appears exactly as often as expected (each fact once).

    python3 scripts/check_numbers.py dump.json [path/to/surprise2028.json]

dump.json is scripts/dumptabs.mjs's output. Where each figure is printed:
Summary, the three headline tiles (main arm, at the closure picked in the
header; with Both, the closed-capital value beside it); Income and output,
the four-measure card (one value per arm and measure at the closure picked;
with Both, the closed-capital value as screen-reader text; the main arm's
GDP, wage and GNI link to Summary instead) - the GNI and GDP
path charts print no end value; Economy, each line's headline-year end
label; Public finances, the debt/GDP and tax/GDP end labels and the tax
card (its model figure only with closed capital, when the chart's end
label is a different number). Signed figures with a unit (+0.57%, -1.6pp) are pulled from the page
text as a multiset and compared with the multiset built from the data file
with the page's own formatting.
"""
import json, re, sys
from collections import Counter

dump = json.load(open(sys.argv[1]))
D = json.load(open(sys.argv[2] if len(sys.argv) > 2 else 'src/data/surprise2028.json'))
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

NUM = re.compile(r"[+−]?\d+\.\d+(?:%|pp)")
ECON = [('C', '%', 1), ('I', '%', 1), ('K', '%', 1), ('L', '%', 1), ('r_bp', 'pp', 0.01), ('labour_share_pp', 'pp', 1)]
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
    # Summary: the three headline tiles; with Both, closed capital beside each
    for v in ['Y', 'w', 'GNI']:
        add(g(sid, 'tfp', main, v), 2, '%')
        if mode == 'both':
            add(g(sid, 'tfp', B, v), 2, '%')
    for arm in ARMS:
        # Income and output: the four-measure card. The main arm's GDP, wage
        # and GNI are the Summary tiles' (their one home): there they link.
        for v in ['GNI', 'Y', 'NNI', 'w']:
            if arm == 'tfp' and v in ('Y', 'w', 'GNI'):
                continue
            for cl in shown:
                add(g(sid, arm, cl, v), 2, '%')
        # Economy: headline-year end labels (the central line with Both)
        for v, unit, k in ECON:
            x = g(sid, arm, main, v)
            # an arm whose path coincides with an earlier arm's (within half the
            # last printed digit in every year, same printed end value) prints
            # no end value (ResultsTab)
            if x is not None and not coincides(sid, arm, main, v, k): add(x * k, 2, unit)  # Economy end labels, 2dp (ResultsTab endDp)
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
    # a pending value prints "pending", never a number
    n_pending = sum(1 for arm in ARMS for v in ['GNI', 'Y', 'NNI', 'w'] for cl in (C, B) if g(sid, arm, cl, v) is None)
    if dump[sid].get('results:income:both', '').count('pending') < n_pending:
        bad += 1; print(sid, 'too few "pending" on Results')
# Every finished gap in the data file equals the raw solve over its
# continuation (as the session's check_numbers.py did).
import os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'analysis', 'surprise', 'output')
raw_bad = 0
for sid, arms in D['results'].items():
    for a, cls in arms.items():
        for cl, r in cls.items():
            if r['status'] != 'done':
                continue
            s_ = json.load(open(f"{OUT}/{cl}/{r['label']}.json"))['series']
            b_ = json.load(open(f"{OUT}/{cl}/continuation.json"))['series']
            for v in ['Y', 'GNI', 'NNI', 'w', 'C', 'I', 'K', 'L']:
                for k in range(len(Y)):
                    if abs((s_[v][k] / b_[v][k] - 1) * 100 - r['gaps'][v][k]) > 1e-9:
                        raw_bad += 1
print('raw-solve recompute mismatches:', raw_bad)

# The fiscal-rule card with a rule chosen (Public finances): every chart
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
                if r['status'] != 'done':
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
# the top 1%), so this is a multiset. The by-form parts sit in a closed fold
# and are not in the page text.
CO = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data', 'cohorts2028.json')))
def tiles(c, cl=None):
    exp = Counter(signed(x, 2) + '%' for x in [c['alive_avg'], c['no_bequest_alive_avg'], c['sources_alive']['capital'], c['sources_alive']['labour']])
    # where the cell is solved to the horizon (cohorts2028.json `dnfull`) that
    # replaces the first-order charge-back on the page
    full = CO.get('dnfull') or {}
    solved = full.get('ready') and full.get('closure') == cl and full.get('rule') == 'dn' and full.get('arm') == 'tfp'
    src = full['range']['no_bequest_avg'] if solved else (c['charged']['no_bequest_avg'] if c.get('charged') else None)
    if src:
        lo, hi = (signed(x, 2) + '%' for x in src)
        for t in {lo, hi}:  # an equal low and high print once
            exp[t] += 1
    return exp
def why(c):
    exp = Counter(signed(x, 2) + '%' for x in [c['alive_by_group'][0], c['alive_by_group'][6]])
    for x in (c['income_2028_35_age45']['transfers'][0], c['income_2028_35_age45']['transfers'][6]):
        exp[f"{abs(x):.1f}%"] += 1
    return exp
c = CO['closures'][C]['rules']['dn']['tfp']
# With Closure = Both (who:both) the tiles print once per closure; the Why
# cards stay at the central closure.
EXPECT = {'who': tiles(c, C) + why(c), 'who:both': tiles(c, C) + tiles(CO['closures'][B]['rules']['dn']['tfp'], B) + why(c)}
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
#     closure x fiscal-rule cell's headline-year gap once, except the cell in
#     view (the address's scenario, central closure, common rule), whose
#     figure has its home in the story's headline tiles.
# Method no longer prints the table.
RULE_RES = {'common': D['results'], **{k: v['results'] for k, v in (('fixed', D.get('rules', {}).get('fixed_spending', {})), ('dn', D.get('rules', {}).get('debt_neutral', {}))) if v}}
def matrix(view):
    exp = Counter()
    for rule, res in RULE_RES.items():
        for sid_ in res:
            for cl_ in (C, B):
                if (sid_, cl_, rule) == (view, C, 'common'):
                    continue
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
print('FAIL' if bad else 'PASS'); sys.exit(1 if bad else 0)
