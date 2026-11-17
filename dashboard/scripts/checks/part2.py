import json, os, re
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
#   - no other tab prints a share as a percentage (each fact once).

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
    a = text.find('Where output goes in')
    if a < 0:
        return None
    # it ends where the three-arms block starts (its title or its question)
    ends = [b for b in (text.find('Three arms', a), text.find('What does the productivity gain add', a)) if b > 0]
    return text[a:min(ends)] if ends else text[a:]


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
        for a in re.findall(r'anchor="((?:m|arm|scen|closure)-[\w-]+)"', t):
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


def check(dump):
    """Return the number of failures for story part 2's own figures."""
    bad = raw() + links()
    # the large shares only: a small one (1.6) is too often another fact
    shares_pct = {f"{v:.1f}%" for base in SPLIT["baseline"].values() if base for v in base.values() if v >= 10}
    for sid in dump:
        for mode, cl in MODE_CL.items():
            key = 'results:summary' + ('' if mode == 'central' else f':{mode}')
            t = dump[sid].get(key)
            if t is None:
                bad += 1; print(sid, mode, 'story part 2 not in the dump'); continue
            blk = block(t)
            if blk is None:
                bad += 1; print(sid, mode, 'story part 2: no "Where output goes" block'); continue
            if 'NaN' in blk or 'undefined' in blk:
                bad += 1; print(sid, mode, 'story part 2 prints NaN/undefined')
            if mode == 'both' and 'show the central closure' not in blk:
                bad += 1; print(sid, mode, 'story part 2: Both does not say it shows the central closure')
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
