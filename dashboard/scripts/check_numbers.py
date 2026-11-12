"""Every number the Results, Public finances and Cohorts tabs print equals
the data file, and appears exactly as often as expected (each fact once).

    python3 scripts/check_numbers.py dump.json [path/to/surprise2028.json]

dump.json is scripts/dumptabs.mjs's output. Signed figures with a unit
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
    for arm in ARMS:
        for v in ['GNI', 'Y', 'NNI', 'w']:
            for cl in (C, B):
                x = g(sid, arm, cl, v)
                if x is not None: exp[signed(x, 2) + '%'] += 1
        for v, unit, k in [('C', '%', 1), ('I', '%', 1), ('K', '%', 1), ('L', '%', 1), ('r_bp', 'pp', 0.01), ('labour_share_pp', 'pp', 1)]:
            x = g(sid, arm, C, v)
            if x is not None: exp[signed(x * k, 1) + unit] += 1
        for v, years in [('debt_gdp_pp', [H, LATE]), ('tax_gdp_pp', [H])]:
            for yr in years:
                x = g(sid, arm, C, v, yr)
                if x is not None: exp[signed(x, 2) + 'pp'] += 1
    text = '\n'.join(dump[sid][t] for t in ['results', 'finances', 'cohorts'])
    got = Counter(NUM.findall(text))
    if got != exp:
        bad += 1
        print(sid, 'missing:', dict(exp - got), 'extra:', dict(got - exp))
    else:
        print(sid, 'ok:', sum(exp.values()), 'figures, each as often as expected')
    # a pending tile prints "pending", never a number
    n_pending = sum(1 for arm in ARMS for v in ['GNI', 'Y', 'NNI', 'w'] for cl in (C, B) if g(sid, arm, cl, v) is None)
    if dump[sid]['results'].count('pending') < n_pending:
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
bad += raw_bad
print('FAIL' if bad else 'PASS'); sys.exit(1 if bad else 0)
