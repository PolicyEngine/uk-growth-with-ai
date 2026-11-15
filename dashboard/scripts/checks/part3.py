import json, os, re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', '..', 'src', 'data')


def signed(x, dp):
    # the same as check_numbers.signed
    if abs(x) < 0.5 * 10 ** -dp:
        return f"{0:.{dp}f}"
    return ("+" if x >= 0 else "−") + f"{abs(x):.{dp}f}"

# The story, part 3 (#story-part-3): the provisional uk-ai-study figures,
# each printed once, against aiStudy2425.json with the part's own formats
# (part3/format.js). Axis text and quoted inputs ([data-axis], [data-input])
# are hidden by dumptabs.
AI = json.load(open(os.path.join(DATA, 'aiStudy2425.json')))
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
# Related PolicyEngine work, at the close of part 3: figures read off its
# pages (relatedWork.json). Those the pattern sees are counted with part 3's;
# the Gini values and the US revenue are checked as printed.
REL = {r['id']: r for r in json.load(open(os.path.join(DATA, 'relatedWork.json')))['items']}
_sh, _lab = REL['income_shift'], REL['budget_lab']
exp3[f"{_sh['revenue_min_shift_pct']}%"] += 1; exp3[f"−£{_sh['revenue_min_bn']}"] += 1
exp3[f"{_lab['rapid_poverty_pp']}pp"] += 1
REL_TEXT = [_sh['gini_base'], _sh['gini_full'], f"${_lab['rapid_revenue_bn']}B", f"−£{_sh['revenue_min_bn']}B"]
FIG3 = re.compile(r"−?£[\d,]+(?:\.\d)?(?:bn)?|[+−]?\d+\.\d\dpp|\d+\.\d\dpp|\b\d+p\b|[+−]?\d+(?:\.\d+)?%|\d+\.\d\dm")

def check(dump):
    """Return the number of failures for story part 3."""
    bad = 0
    for sid in dump:
        t = dump[sid].get('story:part3')
        if not t:
            bad += 1; print(sid, 'story part 3 not in the dump'); break
        if 'NaN' in t or 'undefined' in t:
            bad += 1; print(sid, 'story part 3 prints NaN/undefined')
        for x in REL_TEXT:
            if t.count(x) != 1:
                bad += 1; print(sid, 'story part 3: related work figure', x, 'printed', t.count(x), 'times')
        got = Counter(FIG3.findall(t))
        if got != exp3:
            bad += 1
            print(sid, 'story part 3 missing:', dict(exp3 - got), 'extra:', dict(got - exp3))
        else:
            print(sid, 'story part 3 ok:', sum(exp3.values()), 'figures')
        break  # part 3 does not change with the scenario
    return bad
