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
            if x is not None: add(x * k, 1, unit)
        # Public finances: debt/GDP late-year and tax/GDP headline-year end labels
        add(g(sid, arm, main, 'debt_gdp_pp', LATE), 2, 'pp')
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
# The Who gains tab (default view: central closure, debt-neutral, main arm)
# prints, once each: the average, the no-bequest average, the average with
# the post-2035 cost charged (a range), the capital and labour sources, the
# bottom and top earnings groups, and the 45-year-old's transfer cost. Two
# different facts can round to the same figure (the no-bequest average and
# the top 1%), so this is a multiset. The by-form parts sit in a closed fold
# and are not in the page text.
CO = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data', 'cohorts2028.json')))
def tiles(c):
    exp = Counter(signed(x, 2) + '%' for x in [c['alive_avg'], c['no_bequest_alive_avg'], c['sources_alive']['capital'], c['sources_alive']['labour']])
    if c.get('charged'):
        lo, hi = (signed(x, 2) + '%' for x in c['charged']['no_bequest_avg'])
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
EXPECT = {'who': tiles(c) + why(c), 'who:both': tiles(c) + tiles(CO['closures'][B]['rules']['dn']['tfp']) + why(c)}
for sid in dump:
    for key, exp in EXPECT.items():
        got = Counter(NUM.findall(dump[sid].get(key, '')))
        if got != exp:
            bad += 1
            print(sid, key, 'missing:', dict(exp - got), 'extra:', dict(got - exp))
        else:
            print(sid, key, 'ok:', sum(exp.values()), 'figures')
# The zk0.5 sensitivity table on Method prints each scenario and arm's
# headline-year GDP, GNI, NNI and wage gaps once, and every shown gap equals
# its raw solve over that closure's continuation.
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
        # the table prints two decimals; other Method figures (rates, shares) do not
        got = Counter(re.findall(r"[+−]?\d+\.\d\d%", dump[sid].get('method', '')))
        if got != exp:
            bad += 1
            print(sid, 'method', cl, 'missing:', dict(exp - got), 'extra:', dict(got - exp))
        else:
            print(sid, 'method', cl, 'ok:', sum(exp.values()), 'figures')

# The story, part 3 (#story-part-3): the provisional uk-ai-study figures,
# each printed once, against aiStudy2425.json with the part's own formats
# (part3/format.js). Axis text and quoted inputs ([data-axis], [data-input])
# are hidden by dumptabs.
AI = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data', 'aiStudy2425.json')))
def m(x): return f"{x:.2f}m"
def bn(x): return ('−' if x < 0 else '') + f"£{abs(x):.1f}bn"
def pp(x): return signed(x, 2) + 'pp'
def pence(x): return f"{round(x)}p"
def share(x): return f"{round(x)}%"
def gbp(x): return f"£{round(x):,}"
def dpct(x): return signed(x, 2) + '%'
H3 = AI['headline']; LAD = {r['id']: r for r in AI['ladder']}; RUL = {r['id']: r for r in AI['rules']}
exp3 = Counter()
exp3[m(H3['central_displaced']['value'] / (1e6 if H3['central_displaced']['value'] > 1000 else 1))] += 1
for k in ('central_cost',): exp3[bn(H3[k]['value'])] += 1; exp3[bn(H3[k]['sd'])] += 1
for k in ('central_poverty', 'central_gini', 'central_poverty_ahc', 'central_poverty_relative'): exp3[pp(H3[k]['value'])] += 1
for k in ('central_poverty', 'central_gini'): exp3[f"{H3[k]['sd']:.2f}pp"] += 1
for rid in ('central_20', 'takeup', 'takeup_jsa', 'wage_cuts', 'obr', 'obr_takeup', 'obr_takeup_jsa'):
    exp3[bn(LAD[rid]['cost_bn'])] += 1; exp3[pp(LAD[rid]['poverty_pp'])] += 1
for rid in ('uniform', 'junior', 'compression', 'klein_top_loaded'): exp3[bn(RUL[rid]['cost_bn'])] += 1
for r in AI['per_pound']: exp3[pence(r['government_p'])] += 1; exp3[pence(r['household_p'])] += 1
for k in ('claim_uc', 'claim_uc_entitled', 'existing_unemployed_claim', 'capital_over_limit', 'other_earner', 'homeowner'): exp3[share(AI['displaced'][k]['value'])] += 1
for k in ('uc_per_displaced', 'uc_per_existing_unemployed', 'uc_per_displaced_takeup'): exp3[gbp(AI['displaced'][k]['value'])] += 1
for x in AI['deciles']['values']: exp3[dpct(x)] += 1
# decile 1 under the other two rankings, printed in its caveat
for x in re.findall(r"[−-]\d+\.\d+(?=%)", AI['deciles']['bottom_decile_caveat'])[-2:]:
    exp3[dpct(-float(x.lstrip('−-')))] += 1
FIG3 = re.compile(r"−?£[\d,]+(?:\.\d)?(?:bn)?|[+−]?\d+\.\d\dpp|\d+\.\d\dpp|\b\d+p\b|[+−]?\d+(?:\.\d+)?%|\d+\.\d\dm")
for sid in dump:
    t = dump[sid].get('story:part3')
    if not t:
        bad += 1; print(sid, 'story part 3 not in the dump'); break
    if 'NaN' in t or 'undefined' in t:
        bad += 1; print(sid, 'story part 3 prints NaN/undefined')
    got = Counter(FIG3.findall(t))
    if got != exp3:
        bad += 1
        print(sid, 'story part 3 missing:', dict(exp3 - got), 'extra:', dict(got - exp3))
    else:
        print(sid, 'story part 3 ok:', sum(exp3.values()), 'figures')
    break  # part 3 does not change with the scenario

# The story, part 1 (#story-part-1): official statistics from ukContext.json,
# unsigned, as published (part1/format.js), each once except where two
# different facts print the same figure.
UK = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data', 'ukContext.json')))
F1, S1 = UK['facts'], UK['series']
exp1 = Counter()
for k in ('gdp_growth_latest', 'employment_rate_latest', 'unemployment_rate_latest', 'labour_share_latest', 'business_ai_use', 'business_ai_use_10plus'):
    exp1[f"{F1[k]['value']:.1f}%"] += 1
for x in (S1['obr_gdp_forecast']['y'][0], S1['obr_gdp_forecast']['y'][1], S1['obr_gdp_forecast']['y'][-1]):
    exp1[f"{x:.1f}%"] += 1
exp1[f"{F1['productivity_oph_latest']['value']:.1f}"] += 1
ex = [F1[k]['value'] for k in ('workers_high_exposure_high_complementarity', 'workers_high_exposure_low_complementarity', 'workers_low_exposure')]
for x in ex: exp1[f"{round(x)}%"] += 1
exp1[f"{round(ex[0] + ex[1])}%"] += 1
exp1['70%'] += 1  # DSIT's own words, "around 70%", quoted beside the 67% sum
FIG1 = re.compile(r"[−-]?\d+(?:\.\d+)?%|\b\d+\.\d\b(?!%)")
for sid in dump:
    t = dump[sid].get('story:part1')
    if not t:
        bad += 1; print(sid, 'story part 1 not in the dump'); break
    if 'NaN' in t or 'undefined' in t:
        bad += 1; print(sid, 'story part 1 prints NaN/undefined')
    got = Counter(FIG1.findall(t))
    if got != exp1:
        bad += 1
        print(sid, 'story part 1 missing:', dict(exp1 - got), 'extra:', dict(got - exp1))
    else:
        print(sid, 'story part 1 ok:', sum(exp1.values()), 'figures')
    break
bad += raw_bad
print('FAIL' if bad else 'PASS'); sys.exit(1 if bad else 0)
