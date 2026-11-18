import json, math, os, re
from collections import Counter

# The story, part 2 (#story-part-2): where 2031 output goes (#story-output).
# The Sankey prints the OBR-central path's shares of GDP (one decimal,
# unsigned, GDP itself as 100) and the waterfall each part's change in % of
# the path's GDP (two decimals, signed), with no unit beside the number (the
# unit is in each figure's subtitle), so check_numbers' NUM pattern does not
# see them. This module checks, for every scenario and header closure in the
# dump (results:summary[:closed|:both]):
#   - the block prints exactly the expected numbers, each once;
#   - every value in output_split equals the raw solve over its continuation
#     (the four parts from w, L, Y, GNI and NNI), and the parts add to GDP;
#   - no other tab prints a share as a percentage (each fact once);
#   - the shock scene (#p2-shock) prints no signed or result decimal, and its
#     small-tile counts follow the data (shock_counts, as shock.js).

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', '..', 'src', 'data')
OUT = os.path.join(HERE, '..', '..', '..', 'analysis', 'surprise', 'output')
S = json.load(open(os.path.join(DATA, 'surprise2028.json')))
SPLIT = S['output_split']
YEARS = S['years']
PARTS = ['labour', 'domestic', 'foreign', 'depreciation']
CAPITAL = ['domestic', 'foreign', 'depreciation']
MODE_CL = {'central': 'zk0.1', 'closed': 'zk0', 'both': 'zk0.1'}


def signed(x, dp):
    # the same as check_numbers.signed
    if abs(x) < 0.5 * 10 ** -dp:
        return f"{0:.{dp}f}"
    return ("+" if x >= 0 else "−") + f"{abs(x):.{dp}f}"


def levels(s, i):
    lab = s['w'][i] * s['L'][i]
    return {'gdp': s['Y'][i], 'labour': lab, 'domestic': s['NNI'][i] - lab,
            'foreign': s['Y'][i] - s['GNI'][i], 'depreciation': s['GNI'][i] - s['NNI'][i]}


def expected(sid, cl):
    exp = Counter()
    b = SPLIT['baseline'].get(cl)
    if b:
        for k in PARTS:
            exp[f"{b[k]:.1f}"] += 1
        exp[f"{sum(b[k] for k in CAPITAL):.1f}"] += 1
    c = SPLIT['change'].get(sid, {}).get(cl, {})
    if c.get('status') == 'done':
        # the GDP row prints its change too (Vahid, 16 Nov: the waterfall
        # shows GDP's value beside its link to the headline figures)
        for k in ['labour', 'gross_capital', *CAPITAL, 'gdp']:
            exp[signed(c[k], 2)] += 1
    return exp


def block(text):
    """The text of the 'Where output goes' block within part 2's dump."""
    # the topic header's question (typography spec: the old 'Where output
    # goes in' title is gone), else the old title
    starts = [b for b in (text.find('Who gets the extra output'), text.find('Where output goes in')) if b >= 0]
    if not starts:
        return None
    a = min(starts)
    # it ends where the Who gains block starts (its title or its question)
    ends = [b for b in (text.find('Who gains and who loses', a), text.find('Which generations gain', a)) if b > 0]
    return text[a:min(ends)] if ends else text[a:]


def jsround(x):
    # JavaScript's Math.round (half up), as shock.js
    return math.floor(x + 0.5)


def shock_counts(sid, cl):
    """The shock scene's small-tile counts (tabs/story/part2/shock.js): M
    cross (the share input x 10), N new (the GDP change x 10), NL to labour
    at the labour share after the shift, NK to capital; None while pending."""
    base = SPLIT['baseline'].get(cl)
    if not base:
        return None
    pp = next(x['labour_share_fall_pp'] for x in S['scenarios'] if x['id'] == sid)
    m = jsround(pp * 10)
    c = SPLIT['change'].get(sid, {}).get(cl, {})
    if c.get('status') != 'done':
        return {'M': m, 'N': None}
    s1 = (base['labour'] + c['labour']) / (100 + c['gdp'])
    n = max(0, jsround(c['gdp'] * 10))
    nl = min(n, max(0, jsround(s1 * c['gdp'] * 10)))
    return {'M': m, 'N': n, 'NL': nl, 'NK': n - nl, 'c': c}


def shock_raw():
    """The counts against the data: M is the solved share gap x 10 (the gap
    equals the input), and the tiles add to labour's and capital's changes
    within one small tile."""
    bad = 0
    i = YEARS.index(SPLIT['year'])
    for sid in SPLIT['change']:
        for cl in SPLIT['baseline']:
            k = shock_counts(sid, cl)
            if not k or k['N'] is None:
                continue
            r = S['results'][sid]['tfp'][cl]
            if k['M'] != jsround(-r['gaps']['labour_share_pp'][i] * 10):
                bad += 1; print('part 2 shock: share input is not the solved share gap', sid, cl)
            c = k['c']
            if abs(k['NL'] - k['M'] - c['labour'] * 10) > 1 or abs(k['M'] + k['NK'] - c['gross_capital'] * 10) > 1:
                bad += 1; print('part 2 shock: tiles off the changes by more than one', sid, cl, k['M'], k['N'], k['NL'], k['NK'])
    return bad


def shock_block(text):
    """The text of the shock scene (#p2-shock) within part 2's dump."""
    a = text.find('What does the AI shock change?')
    if a < 0:
        return None
    b = text.find('More AI, sooner, as a surprise', a)
    return text[a:b] if b > 0 else None


def shock(sid, mode, cl, t):
    """The shock scene prints no signed decimal and no result decimal (its
    one decimal, the share input, is data-input, and the GDP change it
    restates from the headline tiles is data-axis, both left out of the
    dump; 0.1 is its scale), and whatever caption is drawn carries the
    counts."""
    bad = 0
    blk = shock_block(t)
    if blk is None:
        print(sid, mode, 'story part 2: no shock scene'); return 1
    signed_ = re.findall(r"[+−]\d+\.\d+", blk)
    if signed_:
        bad += 1; print(sid, mode, 'story part 2 shock prints a signed decimal:', signed_)
    other = [x for x in re.findall(r"\d+\.\d+", blk) if x != '0.1']
    if other:
        bad += 1; print(sid, mode, 'story part 2 shock prints a decimal other than its scale:', other)
    k = shock_counts(sid, cl)
    if k:
        if 'small tiles cross' in blk and f"capital: {k['M']} small tiles cross" not in blk:
            bad += 1; print(sid, mode, 'story part 2 shock: not', k['M'], 'small tiles crossing')
        if k['N'] is not None and 'new small tile' in blk:
            want = f"{k['N']} new small tile{'' if k['N'] == 1 else 's'}, about {k['NL']} to labour, {k['NK']} to capital"
            if want not in blk:
                bad += 1; print(sid, mode, 'story part 2 shock: not', want)
    if not bad:
        print(sid, mode, 'story part 2 shock ok: M', k and k['M'], 'N', k and k['N'], 'NL', k and k.get('NL'), 'NK', k and k.get('NK'))
    return bad


def raw():
    """Every value in output_split against the raw solves."""
    bad = 0
    i = YEARS.index(SPLIT['year'])
    for cl, base in SPLIT['baseline'].items():
        if base is None:
            continue
        b = levels(json.load(open(f"{OUT}/{cl}/continuation.json"))['series'], i)
        for k in PARTS:
            if abs(b[k] / b['gdp'] * 100 - base[k]) > 1e-9:
                bad += 1; print('part 2 split: baseline mismatch', cl, k)
        if abs(sum(base.values()) - 100) > 1e-9:
            bad += 1; print('part 2 split: baseline shares do not add to 100', cl)
        for sid, by_cl in SPLIT['change'].items():
            c = by_cl.get(cl, {})
            if c.get('status') != 'done':
                continue
            r = S['results'][sid]['tfp'][cl]
            if c['label'] != r['label']:
                bad += 1; print('part 2 split: not the main-arm solve', sid, cl)
            s = levels(json.load(open(f"{OUT}/{cl}/{c['label']}.json"))['series'], i)
            for k in ['gdp', *PARTS]:
                if abs((s[k] - b[k]) / b['gdp'] * 100 - c[k]) > 1e-9:
                    bad += 1; print('part 2 split: change mismatch', sid, cl, k)
            if abs(sum(c[k] for k in PARTS) - c['gdp']) > 1e-9 or abs(sum(c[k] for k in CAPITAL) - c['gross_capital']) > 1e-9:
                bad += 1; print('part 2 split: parts do not add up', sid, cl)
            if abs(c['gdp'] - r['gaps']['Y'][i]) > 1e-9:
                bad += 1; print('part 2 split: GDP change is not the GDP gap', sid, cl)
    return bad


SRC_DIR = os.path.join(HERE, '..', '..', 'src')
PART2_FILES = ['tabs/story/Part2.jsx', 'tabs/ai/Landing.jsx'] + [
    f'tabs/story/part2/{f}' for f in os.listdir(os.path.join(SRC_DIR, 'tabs', 'story', 'part2'))]


def links():
    """Every Method anchor part 2 links to exists on Method (an id in
    tabs/method), and the result files it links to exist at the data
    file's commit (analysis/surprise/output/<closure>/<label>.json)."""
    bad = 0
    method = ''
    mdir = os.path.join(SRC_DIR, 'tabs', 'method')
    for f in os.listdir(mdir):
        if f.endswith('.jsx'):
            method += open(os.path.join(mdir, f)).read()
    ids = set(re.findall(r'id="([\w-]+)"', method)) | set(re.findall(r'id=\{`([\w-]+)\$\{', method))
    seen = 0
    for f in PART2_FILES:
        t = open(os.path.join(SRC_DIR, f)).read()
        # NavLink anchors, and the Method sections a "Sources and notes"
        # list opens (ModelSource method=, modelItems(..., 'm-…'), navItem)
        for a in re.findall(r'''(?:anchor=|method=|'method', |modelItems\(\[\], )["']((?:m|arm|scen|closure)-[\w-]+)["']''', t):
            seen += 1
            ok = a in ids or any(a.startswith(p) for p in ids if p.endswith('-'))
            if not ok and a.startswith(('arm-', 'scen-')):
                ok = ('arm-' if a.startswith('arm-') else 'scen-') in ids
            if not ok:
                bad += 1; print('part 2 links: no Method anchor', a, 'in', f)
    for sid, by_arm in S['results'].items():
        for arm, by_cl in by_arm.items():
            for cl, r in by_cl.items():
                if r.get('label') and not os.path.exists(f"{OUT}/{cl}/{r['label']}.json"):
                    bad += 1; print('part 2 links: no result file', cl, r['label'])
    print('part 2 links:', seen, 'Method anchors checked')
    return bad


# The headline ledger (#story-headline, Landing.jsx HeadlineTiles,
# headline-tiles-fable.md): three rows named as in the hero, each value the
# 2031 gap at the header's closure, the pay note from the data (pay still
# rising every year 2028-31: "slower growth, not a cut"), the pay caveat
# where the sign differs across foreign-capital cases, and no chip.
LEDGER = [('Y', 'GDP'), ('w', 'Pay rates'), ('GNI', 'National income')]
H = YEARS.index(S['headline_year'])


def pay_rises(sid, cl):
    g = S['results'][sid]['tfp'][cl].get('pay_growth_pct')
    if not g:
        return None
    win = [x for y, x in zip(YEARS, g) if S['surprise_year'] <= y <= S['headline_year']]
    return bool(win) and all(x is not None and x > 0 for x in win)


def pay_note(sid, cl):
    w = S['results'][sid]['tfp'][cl]['gaps']['w'][H]
    if w < -0.005:
        return 'slower growth, not a cut' if pay_rises(sid, cl) else 'below the forecast path'
    return 'pay for the same work'


def pay_flips(sid):
    ws = [S['results'][sid]['tfp'][cl]['gaps']['w'][H] for cl in ('zk0', 'zk0.1') if S['results'][sid]['tfp'][cl].get('status') == 'done']
    sens = S.get('sensitivity', {}).get('zk0.5', {}).get('results', {}).get(sid, {}).get('tfp', {})
    if sens.get('status') == 'done':
        ws.append(sens['gaps']['w'][H])
    if len(ws) < 2:
        return False
    return len({0 if abs(w) < 0.005 else (1 if w > 0 else -1) for w in ws}) > 1


def ledger(dump):
    """The headline ledger's labels, values and notes, every scenario and
    header closure in the dump."""
    bad = 0
    for sid in dump:
        for mode, cl in MODE_CL.items():
            t = dump[sid].get('results:summary' + ('' if mode == 'central' else f':{mode}'))
            r = S['results'][sid]['tfp'][cl]
            if t is None or r.get('status') != 'done':
                continue
            a = t.find('The headline figures')
            z = t.find('GDP ends', a)
            blk = t[a:z if z > 0 else a + 1500]
            miss = []
            if not re.search(r"scenario, \d{4}: gaps against the OBR’s central forecast path\.", blk):
                miss.append('sentence')
            if ' · ' in blk:
                miss.append('chip')
            for v, name in LEDGER:
                if f"{name}\n{signed(r['gaps'][v][H], 2)}%" not in blk:
                    miss.append(name)
            if pay_note(sid, cl) not in blk:
                miss.append('pay note: ' + pay_note(sid, cl))
            if ('positive with more foreign capital' in blk) != pay_flips(sid):
                miss.append('pay caveat')
            if 'GDP less net income paid abroad' not in blk:
                miss.append('national income note')
            for gone in ('Output (GDP)', 'Income UK residents keep', 'capital takes a larger share', 'sign depends on'):
                if gone in blk:
                    miss.append('old: ' + gone)
            if miss:
                bad += 1; print(sid, mode, 'story part 2 headline ledger:', miss)
    print('part 2 headline ledger:', 'ok' if not bad else f'{bad} miss')
    return bad


def check(dump):
    """Return the number of failures for story part 2's own figures."""
    bad = raw() + shock_raw() + links() + ledger(dump)
    # the large shares only: a small one (1.6) is too often another fact
    shares_pct = {f"{v:.1f}%" for base in SPLIT["baseline"].values() if base for v in base.values() if v >= 10}
    for sid in dump:
        for mode, cl in MODE_CL.items():
            key = 'results:summary' + ('' if mode == 'central' else f':{mode}')
            t = dump[sid].get(key)
            if t is None:
                bad += 1; print(sid, mode, 'story part 2 not in the dump'); continue
            bad += shock(sid, mode, cl, t)
            blk = block(t)
            if blk is None:
                bad += 1; print(sid, mode, 'story part 2: no "Where output goes" block'); continue
            if 'NaN' in blk or 'undefined' in blk:
                bad += 1; print(sid, mode, 'story part 2 prints NaN/undefined')
            if mode == 'both' and 'show some foreign capital' not in blk:
                bad += 1; print(sid, mode, 'story part 2: Both does not say it shows some foreign capital')
            got = Counter(re.findall(r"[+−]?\d+\.\d+", blk))
            exp = expected(sid, cl)
            if got != exp:
                bad += 1
                print(sid, mode, 'story part 2 output split missing:', dict(exp - got), 'extra:', dict(got - exp))
            else:
                print(sid, mode, 'story part 2 output split ok:', sum(exp.values()), 'figures')
        # each fact once: no other tab prints a share of GDP as a percentage
        for key, t in dump[sid].items():
            if key.startswith('results:summary'):
                continue
            hit = [x for x in shares_pct if re.search(rf"(?<![\d.]){re.escape(x)}", t)]
            if hit:
                bad += 1; print(sid, key, 'prints a part 2 output share:', hit)
    return bad
