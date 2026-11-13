"""Every number the Results, Public finances and Cohorts tabs print equals
the data file, and appears exactly as often as expected (each fact once).

    python3 scripts/check_numbers.py dump.json [path/to/surprise2028.json]

dump.json is scripts/dumptabs.mjs's output. Expected counts: the headline\ndumbbells print each central value once and each closed-capital bound once\n(screen-reader text); the takeaway repeats three of them and the scenario\nstrip shows each scenario's GNI and wage (both asked for by Vahid). Signed figures with a unit
(+0.57%, -1.6pp) are pulled from the page text as a multiset and compared
with the multiset built from the data file with the page's own formatting.
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
bad = 0
for sid in dump:
    exp = Counter()
    def add(x, dp, unit):
        if x is not None:
            exp[signed(x, dp) + unit] += 1
    # Overview landing: the three KPI tiles (main arm, central closure) and
    # the labour-share move in the "Why" bullets
    for v in ['Y', 'w', 'GNI']:
        add(g(sid, 'tfp', C, v), 2, '%')
    if g(sid, 'tfp', C, 'Y') is not None:
        add(g(sid, 'tfp', C, 'labour_share_pp'), 1, 'pp')
    for arm in ARMS:
        # dumbbells: central label and closed-capital bound (screen-reader text)
        for v in ['GNI', 'Y', 'NNI', 'w']:
            for cl in (C, B):
                add(g(sid, arm, cl, v), 2, '%')
        # small multiples: 2031 end labels, central closure
        for v, unit, k in [('C', '%', 1), ('I', '%', 1), ('K', '%', 1), ('L', '%', 1), ('r_bp', 'pp', 0.01), ('labour_share_pp', 'pp', 1)]:
            x = g(sid, arm, C, v)
            if x is not None: add(x * k, 1, unit)
        # public finances: debt/GDP 2036 and tax/GDP 2031 end labels
        add(g(sid, arm, C, 'debt_gdp_pp', LATE), 2, 'pp')
        add(g(sid, arm, C, 'tax_gdp_pp', H), 2, 'pp')
    # the tax-bias card: model tax/GDP 2031 (main arm) and the top of the
    # rough UK-rates range, labour-share fall x 0.23 (the bottom prints
    # without a unit)
    add(g(sid, 'tfp', C, 'tax_gdp_pp', H), 2, 'pp')
    ls = g(sid, 'tfp', C, 'labour_share_pp')
    if ls is not None:
        add(ls * 0.23, 2, 'pp')
    text = '\n'.join(v for k, v in dump[sid].items() if k.startswith('results') and k.count(':') < 2)
    got = Counter(NUM.findall(text))
    if got != exp:
        bad += 1
        print(sid, 'missing:', dict(exp - got), 'extra:', dict(got - exp))
    else:
        print(sid, 'ok:', sum(exp.values()), 'figures, each as often as expected')
    # a pending tile prints "pending", never a number
    n_pending = sum(1 for arm in ARMS for v in ['GNI', 'Y', 'NNI', 'w'] for cl in (C, B) if g(sid, arm, cl, v) is None)
    if dump[sid].get('results:overview', dump[sid].get('results', '')).count('pending') < n_pending:
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

# The closure selector: By variable and Public finances with closed capital
# (end labels are the closed-capital values; the tax-bias card stays
# central) and with both (end labels on the central lines only).
for sid in dump:
    for mode in ('closed', 'both'):
        if f'results:variables:{mode}' not in dump[sid]:
            continue
        cl = B if mode == 'closed' else C
        exp = Counter()
        for arm in ARMS:
            for v, unit, k in [('C', '%', 1), ('I', '%', 1), ('K', '%', 1), ('L', '%', 1), ('r_bp', 'pp', 0.01), ('labour_share_pp', 'pp', 1)]:
                x = g(sid, arm, cl, v)
                if x is not None: exp[signed(x * k, 1) + unit] += 1
            for v, yr in [('debt_gdp_pp', LATE), ('tax_gdp_pp', H)]:
                x = g(sid, arm, cl, v, yr)
                if x is not None: exp[signed(x, 2) + 'pp'] += 1
        x = g(sid, 'tfp', C, 'tax_gdp_pp', H)
        if x is not None: exp[signed(x, 2) + 'pp'] += 1
        ls = g(sid, 'tfp', C, 'labour_share_pp')
        if ls is not None: exp[signed(ls * 0.23, 2) + 'pp'] += 1
        text = dump[sid][f'results:variables:{mode}'] + '\n' + dump[sid][f'results:finances:{mode}']
        got = Counter(NUM.findall(text))
        if got != exp:
            bad += 1
            print(sid, mode, 'missing:', dict(exp - got), 'extra:', dict(got - exp))
        else:
            print(sid, mode, 'ok:', sum(exp.values()), 'figures')
# The Cohorts tab (default view: central closure, debt-neutral, main arm)
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
    got = Counter(NUM.findall(dump[sid].get('cohorts', '')))
    if got != exp:
        bad += 1
        print(sid, 'cohorts missing:', dict(exp - got), 'extra:', dict(got - exp))
    else:
        print(sid, 'cohorts ok:', sum(exp.values()), 'figures')
bad += raw_bad
print('FAIL' if bad else 'PASS'); sys.exit(1 if bad else 0)
