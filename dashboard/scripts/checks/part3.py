import json, os, re
from collections import Counter
from decimal import Decimal, ROUND_HALF_UP

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', '..', 'src', 'data')


def signed(x, dp):
    # the same as check_numbers.signed
    if abs(x) < 0.5 * 10 ** -dp:
        return f"{0:.{dp}f}"
    return ("+" if x >= 0 else "−") + f"{abs(x):.{dp}f}"


def rnd(x, dp=0):
    # half up, as Math.round; these values are never on a binary tie
    return Decimal(repr(x)).quantize(Decimal(1).scaleb(-dp), rounding=ROUND_HALF_UP)


# Story part 3 (#story-part-3) and Explore > Households
# (#explore-sub-households): the uk-ai-study figures (main at cd54488, FY 2027-28), against
# aiStudy2425.json with the formats of part3/format.js. Every figure has one
# home: the story prints the headline findings, Explore the rest, and the two
# are counted together so nothing is printed twice. Axis text and quoted
# inputs ([data-axis], [data-input]) are hidden by dumptabs. Method and
# sources > Household method must render, with no NaN or result figure.
AI = json.load(open(os.path.join(DATA, 'aiStudy2425.json')))
def m(x): return f"{x:.2f}m"
def bn(x): return ('−' if x < 0 else '') + f"£{rnd(abs(x), 1)}bn"
def bn2(x): return ('−' if x < 0 else '') + f"£{rnd(abs(x), 2)}bn"
def pp(x): return signed(x, 2) + 'pp'
def pence(x): return f"{rnd(x)}p"
def share(x): return f"{rnd(x)}%"
def pct1(x): return f"{rnd(x, 1)}%"
def gbp(x): return f"£{int(rnd(x)):,}"
def dpct(x): return signed(x, 2) + '%'
H3 = AI['headline']; LAD = {r['id']: r for r in AI['ladder']}; RUL = {r['id']: r for r in AI['rules']}
PP = {r['id']: r for r in AI['per_pound']}; CH = {r['id']: r for r in AI['channels']['rows']}
RK = {r['id']: r['values'] for r in AI['rankings']}
S = AI['sankey']; J = AI['per_pound_20']['job_loss']

story = Counter()
# 1 the central case, with its baselines
for x in [m(H3['central_displaced']['value']), bn(H3['central_cost']['value']), pp(H3['central_poverty']['value']),
          pct1(AI['baseline']['absolute_bhc_pct']['value']), pp(H3['central_poverty_relative']['value']),
          pct1(AI['baseline']['relative_bhc_pct']['value']), pp(H3['central_gini']['value']), bn(H3['central_cost']['sd']),
          pp(H3['central_poverty_ahc']['value'])]:
    story[x] += 1
# 2 the three channels, their sum and interaction (20 draws)
for k in ('displacement', 'wage', 'capital'): story[bn(CH[k]['cost_bn'])] += 1
story[bn(AI['channels']['sum_bn'])] += 1; story[bn2(AI['channels']['interaction_bn'])] += 1
# 3 the Sankey: earnings lost, the four destinations, share absorbed, employer NI
story[bn(S['total']['earnings_lost_bn'])] += 1
for k in ('disposable_bn', 'benefits_bn', 'tax_ni_bn', 'other_bn'): story[bn(S['total'][k])] += 1
story[share(S['tax_benefit_share_pct'])] += 1; story[bn(S['employer_ni_bn'])] += 1
# 4 deciles 2-10, and decile 1 under the three rankings in its caveat
for x in AI['deciles']['values']: story[dpct(x)] += 1
story[dpct(RK['pre_pension'][0])] += 1; story[dpct(RK['hbai_excl_large_ppc'][0])] += 1
# 5 four stylised rules (exposure: step 1)
for k in ('uniform', 'junior', 'compression'): story[bn(RUL[k]['cost_bn'])] += 1
# 6 job loss against wage cuts, 20-draw bases
for x in [pence(J['min_p']), pence(J['max_p']), pence(J['government_p']), pence(PP['wage_cuts']['household_p']),
          pence(AI['per_pound_20']['wage_cuts_employer_ni_p']), pence(PP['wage_cuts']['government_p']),
          bn(LAD['central_20']['cost_bn']), pp(LAD['central_20']['poverty_pp']), bn(LAD['wage_cuts']['cost_bn']),
          pp(LAD['wage_cuts']['poverty_pp'])]:
    story[x] += 1
# 7 break-evens, take-up and JSA
story[signed(AI['breakeven']['wage']['value_pct'], 1) + '%'] += 1
story[f"+{rnd(AI['breakeven']['capital']['value_pct'])}%"] += 1
for k in ('takeup', 'takeup_jsa'): story[bn(LAD[k]['cost_bn'])] += 1; story[pp(LAD[k]['poverty_pp'])] += 1
STORY_TEXT = [f"from {AI['baseline']['gini']['value']:.3f}", f"{rnd(AI['breakeven']['duration']['value_months'], 1)} months",
              'not the central case']

hh = Counter()
for r in AI['cost_components']['rows']:
    hh['£0.1bn' if abs(r['cost_bn']) < 0.05 else bn(r['cost_bn'])] += 1
for k in ('central_20', 'takeup', 'takeup_jsa', 'wage_cuts'): hh[pp(LAD[k]['gini_pp'])] += 1
for k in ('obr', 'obr_takeup', 'obr_takeup_jsa'):
    hh[bn(LAD[k]['cost_bn'])] += 1; hh[pp(LAD[k]['poverty_pp'])] += 1; hh[pp(LAD[k]['gini_pp'])] += 1
hh[bn(RUL['klein_top_loaded']['cost_bn'])] += 1
for k in ('uniform', 'junior', 'compression', 'klein_top_loaded'): hh[pp(RUL[k]['poverty_pp'])] += 1; hh[pp(RUL[k]['gini_pp'])] += 1
for k in ('job_loss', 'job_loss_takeup', 'job_loss_takeup_jsa'): hh[pence(PP[k]['government_p'])] += 1; hh[pence(PP[k]['household_p'])] += 1
for k in ('claim_uc', 'claim_uc_entitled', 'existing_unemployed_claim', 'capital_over_limit', 'other_earner', 'homeowner'):
    hh[share(AI['displaced'][k]['value'])] += 1
for k in ('uc_per_displaced', 'uc_per_displaced_takeup', 'uc_per_existing_unemployed'): hh[gbp(AI['displaced'][k]['value'])] += 1
for r in AI['policy']['rows']: hh[bn(r['cost_bn'])] += 1; hh[pp(r['poverty_pp'])] += 1; hh[pp(r['gini_pp'])] += 1

FIG3 = re.compile(r"−?£[\d,]+(?:\.\d+)?(?:bn)?|[+−]?\d+\.\d\dpp|\b\d+p(?![A-Za-z])|[+−]?\d+(?:\.\d+)?%|\d+\.\d\dm")


def sankey_failures():
    """Inputs equal outputs at every node of the part 3 Sankey."""
    bad = []
    keys = ('tax_ni_bn', 'benefits_bn', 'other_bn', 'disposable_bn')
    for i, f in enumerate(S['deciles']):
        if any(f[k] < 0 for k in keys):
            bad.append(f"decile {i + 1}: a negative flow")
        if abs(sum(f[k] for k in keys) - f['earnings_lost_bn']) > 1e-3:
            bad.append(f"decile {i + 1}: outflows {sum(f[k] for k in keys):.4f} != earnings lost {f['earnings_lost_bn']:.4f}")
    for k in keys + ('earnings_lost_bn',):
        tot = sum(f[k] for f in S['deciles'])
        if abs(tot - S['total'][k]) > 1e-3:
            bad.append(f"{k}: deciles sum to {tot:.4f}, total {S['total'][k]:.4f}")
    # printed values at uk-ai-study main cd54488 (results/next_runs/obr_household_deciles.csv, decile 'all';
    # obr_benchmark.json summary.employer_ni_change_bn), FY 2027-28
    for k, want in [('earnings_lost_bn', '£24.0bn'), ('tax_ni_bn', '£6.5bn'), ('benefits_bn', '£0.4bn'),
                    ('other_bn', '£1.3bn'), ('disposable_bn', '£15.8bn')]:
        if bn(S['total'][k]) != want:
            bad.append(f"{k} prints {bn(S['total'][k])}, expected {want}")
    if bn(S['employer_ni_bn']) != '£3.2bn':
        bad.append(f"employer NI prints {bn(S['employer_ni_bn'])}")
    return bad


def check(dump):
    """Return the number of failures for story part 3 and the households views."""
    bad = 0
    for msg in sankey_failures():
        bad += 1; print('part 3 Sankey:', msg)
    for sid in dump:
        t = dump[sid].get('story:part3')
        e = dump[sid].get('explore:households')
        mh = dump[sid].get('method:households')
        for name, x in [('story part 3', t), ('Explore > Households', e), ('Household method', mh)]:
            if not x:
                bad += 1; print(sid, name, 'not in the dump')
            elif 'NaN' in x or 'undefined' in x:
                bad += 1; print(sid, name, 'prints NaN/undefined')
        if not (t and e):
            break
        for x in STORY_TEXT:
            if t.count(x) != 1:
                bad += 1; print(sid, 'story part 3:', repr(x), 'printed', t.count(x), 'times')
        got_s, got_e = Counter(FIG3.findall(t)), Counter(FIG3.findall(e))
        for name, got, exp in [('story part 3', got_s, story), ('Explore > Households', got_e, hh)]:
            if got != exp:
                bad += 1
                print(sid, name, 'missing:', dict(exp - got), 'extra:', dict(got - exp))
            else:
                print(sid, name, 'ok:', sum(exp.values()), 'figures')
        # once across the two pages: a string at two homes is two quantities, each listed once
        if got_s + got_e != story + hh:
            bad += 1; print(sid, 'part 3 + Households: a figure printed beyond its home')
        if mh and re.search(r"[+−]\d+\.\d\dpp|£\d+\.\dbn", mh):
            bad += 1; print(sid, 'Household method prints a result figure')
        break  # these views do not change with the scenario
    return bad
