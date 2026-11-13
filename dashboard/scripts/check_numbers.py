"""Every number the Results and Who gains tabs print equals the data file,
and appears exactly as often as expected (each fact once).

    python3 scripts/check_numbers.py dump.json [path/to/surprise2028.json]

dump.json is scripts/dumptabs.mjs's output. Where each figure is printed:
Summary, the three headline tiles (main arm, at the closure picked in the
header; with Both, the closed-capital value beside it); Income and output,
the four-measure card (one value per arm and measure at the closure picked;
with Both, the closed-capital value as screen-reader text) - the GNI and GDP
path charts print no end value; Economy, each line's headline-year end
label; Public finances, the debt/GDP and tax/GDP end labels and the tax
card. Signed figures with a unit (+0.57%, -1.6pp) are pulled from the page
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
        # Income and output: the four-measure card
        for v in ['GNI', 'Y', 'NNI', 'w']:
            for cl in shown:
                add(g(sid, arm, cl, v), 2, '%')
        # Economy: headline-year end labels (the central line with Both)
        for v, unit, k in ECON:
            x = g(sid, arm, main, v)
            if x is not None: add(x * k, 1, unit)
        # Public finances: debt/GDP late-year and tax/GDP headline-year end labels
        add(g(sid, arm, main, 'debt_gdp_pp', LATE), 2, 'pp')
        add(g(sid, arm, main, 'tax_gdp_pp', H), 2, 'pp')
    # the tax card stays central: model tax/GDP (main arm) and the top of the
    # rough UK-rates range, labour-share fall x 0.23 (the bottom prints
    # without a unit)
    add(g(sid, 'tfp', C, 'tax_gdp_pp', H), 2, 'pp')
    ls = g(sid, 'tfp', C, 'labour_share_pp')
    if ls is not None:
        add(ls * 0.23, 2, 'pp')
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

# The fiscal-rule card with a rule chosen (Public finances): a solved
# variant prints the headline-year GDP, GNI, wage and consumption gaps of
# each arm for the closure(s) in view, once each, and only for the scenarios
# the variant is solved for; an unsolved rule or scenario prints no figure.
RULE_BTN = {'debt_neutral': 'dn'}
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
                            exp[signed(r['gaps'][v][Y.index(H)], 2) + '%'] += 1
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
# Fixed spending is not solved: its option is in view, disabled, and says so
for sid in dump:
    t = dump[sid].get('results:finances:central:fixed')
    if t is None or 'Not yet solved' not in t or 'disabled=true' not in t or 'checked=false' not in t:
        bad += 1; print(sid, 'fixed spending should be shown disabled with "Not yet solved"')
# The Who gains tab (default view: central closure, debt-neutral, main arm)
# prints, once each: the average, the no-bequest average, the average with
# the post-2035 cost charged (a range), the capital and labour sources, the
# bottom and top earnings groups, and the 45-year-old's transfer cost. Two
# different facts can round to the same figure (the no-bequest average and
# the top 1%), so this is a multiset. The by-form parts sit in a closed fold
# and are not in the page text.
CO = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data', 'cohorts2028.json')))
c = CO['closures'][C]['rules']['dn']['tfp']
exp = Counter(signed(x, 2) + '%' for x in [c['alive_avg'], c['no_bequest_alive_avg'], c['alive_by_group'][0], c['alive_by_group'][6],
                                           c['sources_alive']['capital'], c['sources_alive']['labour']])
if c.get('charged'):
    lo, hi = (signed(x, 2) + '%' for x in c['charged']['no_bequest_avg'])
    for t in {lo, hi}:  # an equal low and high print once
        exp[t] += 1
for x in (c['income_2028_35_age45']['transfers'][0], c['income_2028_35_age45']['transfers'][6]):
    exp[f"{abs(x):.1f}%"] += 1
for sid in dump:
    got = Counter(NUM.findall(dump[sid].get('who', '')))
    if got != exp:
        bad += 1
        print(sid, 'who gains missing:', dict(exp - got), 'extra:', dict(got - exp))
    else:
        print(sid, 'who gains ok:', sum(exp.values()), 'figures')
bad += raw_bad
print('FAIL' if bad else 'PASS'); sys.exit(1 if bad else 0)
