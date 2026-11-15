import json, os, re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', '..', 'src', 'data')


def signed(x, dp):
    # the same as check_numbers.signed
    if abs(x) < 0.5 * 10 ** -dp:
        return f"{0:.{dp}f}"
    return ("+" if x >= 0 else "−") + f"{abs(x):.{dp}f}"

# The story, part 1 (#story-part-1): official statistics from ukContext.json,
# unsigned, as published (part1/format.js), each once except where two
# different facts print the same figure.
UK = json.load(open(os.path.join(DATA, 'ukContext.json')))
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

def check(dump):
    """Return the number of failures for story part 1."""
    bad = 0
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
    return bad
