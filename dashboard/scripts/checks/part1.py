"""Story part 1 (#story-part-1): every figure it prints is in ukContextChecks.json,
read there from a primary file by a second route, and ukContext.json agrees.

check(dump) returns the number of failures:
- the figures in part 1's text (axis ticks set aside) must equal, as a
  multiset, the 'printed' values in ukContextChecks.json;
- every entry's 'printed' must be its primary 'value' in the page's format,
  and the ukContext.json value at its 'json_path' must print the same;
- every ONS entry is re-read here from its raw /data JSON file.

Run alone (python3 scripts/checks/part1.py) for the data checks without a dump.
"""
import json, os, re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
import sys as _sys
_sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import active_data  # noqa: E402
DATA = os.path.join(HERE, '..', '..', 'src', 'data')
ROOT = os.path.join(HERE, '..', '..', '..')

UK = json.load(open(os.path.join(DATA, 'ukContext.json')))
CHK = json.load(open(os.path.join(DATA, 'ukContextChecks.json')))

# Percentages (whole or one decimal) and bare one-decimal numbers (the index).
FIG1 = re.compile(r"[−-]?\d+(?:\.\d+)?%|\b\d+\.\d\b(?!%)")

# The facts part 1 prints; each needs an entry in ukContextChecks.json.
PRINTED_FACTS = ('gdp_growth_latest', 'gdp_quarterly_latest', 'gdp_quarterly_yoy', 'productivity_oph_latest',
                 'employment_rate_latest', 'unemployment_rate_latest', 'pay_growth_latest', 'labour_share_latest',
                 'business_ai_use', 'business_ai_use_10plus', 'workers_high_exposure_high_complementarity',
                 'workers_high_exposure_low_complementarity', 'workers_low_exposure')


def fmt(v, kind):
    """part1/format.js: pct1 '75.3%', idx1 '100.1', share0 '35%', U+2212 for negatives."""
    if kind == 'share0':
        t = f"{int(abs(v) + 0.5)}%"
    else:
        t = f"{abs(v):.1f}" + ('%' if kind == 'pct1' else '')
    return ('−' + t) if v < 0 and float(t.rstrip('%')) != 0 else t


def get_path(d, path):
    for p in path.split('.'):
        d = d[int(p)] if isinstance(d, list) else d[p]
    return d


def data_checks():
    """ukContext.json against ukContextChecks.json, and the checks file against the raw ONS files."""
    bad = 0
    for f in CHK['figures']:
        if fmt(f['value'], f['format']) != f['printed']:
            bad += 1; print('story part 1:', f['id'], 'printed', f['printed'], 'is not its primary value', f['value'])
        if f['json_path'] is not None:
            cv = get_path(UK, f['json_path'])
            if fmt(cv, f['format']) != f['printed']:
                bad += 1; print('story part 1:', f['id'], 'ukContext.json', cv, 'disagrees with the primary file:', f['primary_value_raw'], f['primary_file'])
        if f['publisher'] == 'Office for National Statistics' and f['primary_file'].endswith('.json') and ' ; ' not in f['primary_file']:
            j = json.load(open(os.path.join(ROOT, f['primary_file'])))
            label = re.search(r"label '([^']+)'", f['period'])
            period = label.group(1) if label else f['period']
            rows = [r for k in ('years', 'quarters', 'months') for r in j[k] if r['date'] == period]
            if len(rows) != 1 or rows[0]['value'] != f['primary_value_raw'] or j['description']['cdid'] != f['series_id']:
                bad += 1; print('story part 1:', f['id'], 'not found as recorded in', f['primary_file'])
    paths = {f['json_path'] for f in CHK['figures']}
    for k in PRINTED_FACTS:
        if f'facts.{k}.value' not in paths:
            bad += 1; print('story part 1:', k, 'has no entry in ukContextChecks.json')
    return bad


SUR = active_data.load_surprise()
SCEN = ('uk_low', 'uk_central', 'uk_high', 'korinek')


def signed2(x):
    """surprise.js fmt: '+0.92%', U+2212 for negatives, 0.00% unsigned."""
    if abs(x) < 0.005:
        return '0.00%'
    return ('+' if x >= 0 else '−') + f"{abs(x):.2f}%"


def hero_expected(sid, cl='zk0.1'):
    """The hero (#story-hero, Hero.jsx, central closure): the chosen
    scenario's headline-year gaps, GDP, the pay rate and national income
    (NNI, M1), with GNI beside NNI ("before depreciation") (their home is
    part 2's headline ledger; the hero repeats them, same data path and
    format), and each scenario's headline-year GDP gap on its line's end
    label (main arm). When the late year is not the headline year, the
    hero's late line (Landing.jsx lateWords) adds GDP, national income and
    the pay rate in the late year: all three, or none while any is
    missing."""
    i = SUR['years'].index(SUR['headline_year'])
    r = SUR['results'][sid]['tfp'][cl]
    own = [signed2(r['gaps'][v][i]) for v in ('Y', 'w', 'NNI', 'GNI') if r['status'] == 'done' and r['gaps'].get(v)]
    late = SUR.get('late_year')
    if late is not None and late != SUR['headline_year'] and r['status'] == 'done':
        j = SUR['years'].index(late)
        lv = [(r['gaps'].get(v) or [None] * (j + 1))[j] for v in ('Y', 'NNI', 'w')]
        if all(x is not None for x in lv):
            own += [signed2(x) for x in lv]
    gap = lambda s: SUR['results'][s]['tfp'][cl]['gaps']['Y'][i]
    return Counter(own + [signed2(gap(s)) for s in SCEN if SUR['results'][s]['tfp'][cl]['status'] == 'done'])


def check_hero(dump):
    """The hero's figures, when the dump has it ('story:hero')."""
    bad = 0
    for sid in dump:
        t = dump[sid].get('story:hero')
        if t is None:
            print('story hero not in the dump (add story:hero to dumptabs.mjs): skipped')
            return 0
        got = Counter(re.findall(r"[−+-]?\d+\.\d+%", t))
        exp = hero_expected(sid)
        if got != exp:
            bad += 1; print(sid, 'story hero missing:', dict(exp - got), 'extra:', dict(got - exp))
        else:
            print(sid, 'story hero ok:', sum(exp.values()), 'figures')
    return bad


def check(dump):
    """Return the number of failures for story part 1 and the hero."""
    bad = data_checks() + check_hero(dump)
    exp1 = Counter(f['printed'] for f in CHK['figures'])
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
            print(sid, 'story part 1 ok:', sum(exp1.values()), 'figures, each as in ukContextChecks.json')
        break
    return bad


if __name__ == '__main__':
    n = data_checks()
    print('story part 1 data checks:', 'ok' if n == 0 else f'{n} failures')
