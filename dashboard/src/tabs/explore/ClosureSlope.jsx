'use client';

import { sourcesItems } from './sources.jsx';
import Card from '@/components/ui/Card.jsx';
import { Items } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import { MEASURE, ruleLabel } from '@/lib/labels.js';
import { useNav } from '@/lib/nav.jsx';
import { HEADLINE_YEAR, CENTRAL, BOUND, CLOSURE_SHORT, ZETA, ARMS, SCEN_NAME, gap, fmt, holeText, ruleSolved, storedAt } from '@/tabs/ai/surprise.js';
import { NEGLIGIBLE } from '@/tabs/explore/cells.js';
import { VERSION_TEXT_COLOR as ARM_TEXT_COLOR, VERSION_MAIN, VERSION_TOKEN, versionName } from '@/lib/versionColors.js';
import Legend from '@/components/ui/Legend.jsx';
import { side, ruleGapText } from '@/tabs/ai/lines.js';
import { sentenceItems } from '@/tabs/explore/direction.jsx';
import IconLine from '@/components/ui/IconLine.jsx';
import { TipTarget } from '@/components/ab/Tip.jsx';
import { DotTip } from '@/tabs/ai/Headline.jsx';

// Some foreign capital and no foreign capital, per measure and version: a
// dumbbell row of the two solved cases on one shared horizontal % axis. The
// filled dot is some foreign capital (the main case), the hollow dot none;
// the bar joining them is how much the assumption matters (no closure
// between the two is solved, so the bar is not a range). Rows are grouped
// by measure; the selected version (the Version control's, the main
// version by default) is drawn in its series colour, the others muted.
// Each dot carries its value to one decimal (the four-measure card above
// has them to two), set outside its own dot so the two labels never meet.
// Where the two dots fall on opposite sides of the forecast path the
// group's note says so in words. Its sources are the four-measure card's.

// Names from lib/labels.js MEASURE (R1-14): the plain name, with the
// national-accounts code once; national income (NNI) before GNI.
const nm = (v) => (MEASURE[v].abbr === MEASURE[v].short || v === 'w' ? MEASURE[v].short : `${MEASURE[v].short} (${MEASURE[v].abbr})`);
export const SLOPE_MEASURES = [
  { v: 'Y', label: nm('Y'), concept: 'gdp' },
  { v: 'NNI', label: nm('NNI'), concept: 'gni' },
  { v: 'GNI', label: nm('GNI'), concept: 'depreciation' },
  { v: 'w', label: nm('w'), concept: 'pay' },
];

// Every arm's two ends for one measure, and whether it flips sign (above to
// below the path or the reverse; "on the path" is neither).
export function slopeRows(sid, arms, rule, v) {
  return ARMS.filter((a) => arms.includes(a.id)).map((a) => {
    const c = gap(sid, a.id, CENTRAL, v, HEADLINE_YEAR, rule);
    const b = gap(sid, a.id, BOUND, v, HEADLINE_YEAR, rule);
    const flips = c != null && b != null && side(c) !== 'on' && side(b) !== 'on' && side(c) !== side(b);
    // a flip whose smaller end is within NEGLIGIBLE as printed (two
    // decimals): that end is about on the path, so the row's description
    // says so in place of "Flips sign." (Fable round 6, S10). 'c' or 'b',
    // else null.
    const small = flips ? (Math.abs(b) <= Math.abs(c) ? 'b' : 'c') : null;
    const nearPath = small && Number(Math.abs(small === 'b' ? b : c).toFixed(2)) <= NEGLIGIBLE ? small : null;
    // what a missing end prints (S9): never a zero
    const bHole = b == null ? holeText(storedAt(sid, a.id, BOUND, rule)) : null;
    const cHole = c == null ? holeText(storedAt(sid, a.id, CENTRAL, rule)) : null;
    return { arm: a, c, b, flips, nearPath, bHole, cHole };
  });
}

// The row description's last sentence for one version's two ends (S10).
export const slopeNote = (r) =>
  r.nearPath ? ` About on the forecast path with ${r.nearPath === 'b' ? 'no' : 'some'} foreign capital.` : r.flips ? ' Flips sign.' : '';

// One horizontal scale for every row (so bar lengths compare), from the
// data: the smallest round step that spans every end in at most five
// steps, zero always on it.
const STEPS = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20];
export function scaleOf(rows) {
  const xs = rows.flatMap((r) => [r.c, r.b]).filter((x) => x != null);
  const lo0 = Math.min(0, ...xs) * 1.05;
  const hi0 = Math.max(0, ...xs) * 1.05;
  const step = STEPS.find((s) => Math.ceil(hi0 / s - 1e-9) - Math.floor(lo0 / s + 1e-9) <= 5) ?? Math.ceil((hi0 - lo0) / 5);
  const lo = Math.min(-step, Math.floor(lo0 / step + 1e-9) * step);
  const hi = Math.max(step, Math.ceil(hi0 / step - 1e-9) * step);
  const ticks = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t / step) * step);
  return { lo, hi, ticks, dp: step < 1 && !Number.isInteger(step * 2) ? 2 : step < 1 ? 1 : 0 };
}
const MINUS = '−';
const tickText = (t, dp) => (Math.abs(t) < 1e-9 ? '0' : `${t > 0 ? '+' : MINUS}${Math.abs(t).toFixed(dp)}`);
// a dot's value label: one decimal, signed, a true minus ("+0.9", "−1.3")
export const endText = (v) => {
  const a = Math.abs(v).toFixed(1);
  return Number(a) === 0 ? '0.0' : `${v > 0 ? '+' : MINUS}${a}`;
};
// two dots closer than this (% of the track) overlap
const OVERLAP_PCT = 3;

// One version's row: the label, then the track with the zero line, the bar,
// the two dots and their values. The left dot's value sits to its left and
// the right dot's to its right, so the labels move apart when the dots
// overlap (data-overlap marks such a pair). With one dot, its value sits
// away from the zero line.
function Row({ m, r, pct, sel }) {
  const on = r.arm.id === sel;
  const both = r.c != null && r.b != null;
  const lo = both ? Math.min(r.c, r.b) : null;
  const hi = both ? Math.max(r.c, r.b) : null;
  // the filled dot's value goes left when it is the smaller (ties: left)
  const cLeft = both ? r.c <= r.b : r.c != null && r.c < 0;
  const overlap = both && Math.abs(parseFloat(pct(r.c)) - parseFloat(pct(r.b))) < OVERLAP_PCT;
  const name = versionName(r.arm);
  const said = `${name}, ${m.label}: some foreign capital ${r.c == null ? r.cHole : fmt(r.c)}, no foreign capital ${r.b == null ? r.bHole : fmt(r.b)}.${slopeNote(r)}`;
  const val = (x, left, kind) => (
    <span
      className={`ex-fc-val is-${kind}${left ? ' is-left' : ' is-right'}`}
      style={{ ...(left ? { right: `calc(100% - ${pct(x)})` } : { left: pct(x) }), ...(on ? { color: ARM_TEXT_COLOR[r.arm.id] } : null) }}
      data-value={kind}
    >
      {endText(x)}
    </span>
  );
  return (
    <div
      className={`ex-fc-row${on ? ' is-sel' : ' is-muted'}${r.flips ? ' is-flip' : ''}`}
      data-arm={r.arm.id}
      data-overlap={overlap ? '' : undefined}
      style={on ? { '--arm': VERSION_TOKEN[r.arm.id] } : undefined}
    >
      <span className="ex-fc-rlabel">{name}</span>{' '}
      <div className="ex-fc-track" role="group" aria-label={said}>
        <span className="ex-fc-zero" style={{ left: pct(0) }} aria-hidden="true" />
        {r.c == null ? (
          <span className="ex-fc-hole">{r.cHole}</span>
        ) : (
          <>
            {both ? <span className="ex-fc-bar" style={{ left: pct(lo), width: `calc(${pct(hi)} - ${pct(lo)})` }} aria-hidden="true" /> : null}
            {/* each dot a tooltip target: the two-decimal value, the version and the case (Fable push E, fix 3) */}
            {r.b != null ? (
              <TipTarget
                className="ex-fc-dot is-none"
                style={{ left: pct(r.b) }}
                label={`${name}, no foreign capital, ${m.label}: ${fmt(r.b)}`}
                tip={<DotTip arm={name} closure="No foreign capital" measure={m.label} value={r.b} />}
              />
            ) : null}
            <TipTarget
              className="ex-fc-dot is-some"
              style={{ left: pct(r.c) }}
              label={`${name}, some foreign capital, ${m.label}: ${fmt(r.c)}`}
              tip={<DotTip arm={name} closure="Some foreign capital (main case)" measure={m.label} value={r.c} />}
            />
            {val(r.c, cLeft, 'some')}{' '}
            {r.b != null ? (
              val(r.b, !cLeft, 'none')
            ) : (
              <span className={`ex-fc-hole${cLeft ? ' is-right' : ' is-left'}`} style={cLeft ? { left: pct(r.c) } : { right: `calc(100% - ${pct(r.c)})` }}>
                {`none: ${r.bHole}`}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// One measure's rows and its note: a flip, a near-path end, a missing case,
// or the same side. A flip whose smaller end prints as about zero (nearPath)
// is not called a flip here (round 6, S10); the row says "about on the
// forecast path" and so does the note. Each real flip names its own
// direction (the no-foreign-capital end's side), grouped by direction.
const vnames = (rs) => rs.map((r) => versionName(r.arm).toLowerCase()).join(', ');
const nearText = (near) => `${near[0].nearPath === 'b' ? 'no' : 'some'} foreign capital: ${vnames(near)}`;
export function flipNoteText(rows) {
  const flips = rows.filter((r) => r.flips);
  const real = flips.filter((r) => !r.nearPath);
  const near = flips.filter((r) => r.nearPath);
  if (real.length) {
    const dirs = [...new Set(real.map((r) => side(r.b)))];
    const parts = dirs.map((d, i) => `${i ? `${d} it` : `Flips ${d} the forecast path`}: ${vnames(real.filter((r) => side(r.b) === d))}`);
    return { flip: true, text: parts.join('; ') + (near.length ? `; about on it with ${nearText(near)}` : '') };
  }
  if (near.length) return { flip: false, text: `About on the forecast path with ${nearText(near)}` };
  return null;
}
function Group({ m, rows, pct, sel }) {
  const note = flipNoteText(rows);
  const pending = rows.filter((r) => r.c != null && r.b == null);
  return (
    <div className="ex-fc-group" role="group" aria-labelledby={`ex-fc-t-${m.v}`} data-measure={m.v}>
      <div className="ex-fc-title" id={`ex-fc-t-${m.v}`} data-panel-title="">
        {m.label}
      </div>
      {rows.map((r) => (
        <Row key={r.arm.id} m={m} r={r} pct={pct} sel={sel} />
      ))}
      {note?.flip ? (
        <IconLine concept="closure" tier="ui" className="ex-fc-note is-flip" data-label-for="flip">
          {note.text}
        </IconLine>
      ) : note ? (
        <IconLine concept="onPath" tier="ui" className="ex-fc-note">
          {note.text}
        </IconLine>
      ) : pending.length ? (
        <IconLine concept="provisional" tier="ui" className="ex-fc-note">
          No-foreign-capital case not solved for {vnames(pending)}
        </IconLine>
      ) : (
        <IconLine concept="onPath" tier="ui" className="ex-fc-note">
          Same side of the forecast path in both cases
        </IconLine>
      )}
    </div>
  );
}

export default function ClosureSlope({ sid }) {
  const { st } = useNav();
  const rule = st.rule;
  const shown = ARMS.filter((a) => st.arms.includes(a.id));
  const sel = shown.some((a) => a.id === st.armId) ? st.armId : shown.some((a) => a.id === VERSION_MAIN) ? VERSION_MAIN : shown[0]?.id;
  const all = SLOPE_MEASURES.map((m) => ({ m, rows: slopeRows(sid, st.arms, rule, m.v) }));
  const sc = scaleOf(all.flatMap((x) => x.rows));
  const pct = (x) => `${(((x - sc.lo) / (sc.hi - sc.lo)) * 100).toFixed(3)}%`;
  const z = (0 - sc.lo) / (sc.hi - sc.lo);
  // the zero line's name, kept inside the track near either end
  const zAlign = z < 0.2 ? 'is-start' : z > 0.8 ? 'is-end' : 'is-mid';
  const solved = ruleSolved(rule, sid) && all.some((x) => x.rows.some((r) => r.c != null));
  return (
    <Card
      id="closure-slope"
      sources={sourcesItems({ sid, method: 'closures' })}
      icon={iconFor('closure')}
      title="Some foreign capital to no foreign capital"
      unit={<span className="ex-fc-unit" data-axis-title="y">{`% gap vs forecast path, ${HEADLINE_YEAR}`}</span>}
      // the key to the two dots, above the rows (the rows name the versions)
      legend={
        solved ? (
          <Legend
            className="ex-fc-legend"
            label="Foreign capital"
            items={[
              { key: 'some', label: `${CLOSURE_SHORT[CENTRAL]} (main case)`, kind: 'dot' },
              { key: 'none', label: CLOSURE_SHORT[BOUND], kind: 'ring' },
            ]}
          />
        ) : null
      }
      more={[
        { label: 'Foreign capital', text: `Some (main case), ζK = ${ZETA[CENTRAL]}: foreign investors supply ${Math.round(ZETA[CENTRAL] * 100)}% of the extra capital firms want. None, ζK = ${ZETA[BOUND]}: ${ZETA[BOUND] === 0 ? 'none of it, so all of it is funded at home' : `they supply ${Math.round(ZETA[BOUND] * 100)}%`}. Only these two cases are solved, so a bar joins two results; it is not a range between them.` },
        { label: 'Compared with', text: 'The OBR’s central forecast path (the 0 line), for each foreign-capital case.' },
        { label: 'Settings', text: `${ruleLabel(rule)}.` },
      ]}
      download={{
        title: `Some foreign capital to no foreign capital, ${HEADLINE_YEAR}`,
        context: () => `${SCEN_NAME[sid]} · ${HEADLINE_YEAR} · % difference from the OBR’s central forecast path · ${ruleLabel(rule).toLowerCase()}`,
        table: () => ({
          columns: ['Measure', 'Version', 'Some foreign capital (%)', 'No foreign capital (%)', 'Flips sign'],
          rows: all.flatMap(({ m, rows }) => rows.map((r) => [m.label, r.arm.label, r.c, r.b, r.flips ? 'yes' : 'no'])),
        }),
      }}
    >
      {solved ? (
        <div className="ex-fc" data-chart="" role="group" aria-label={`${HEADLINE_YEAR}, some and no foreign capital, ${SCEN_NAME[sid]}`}>
          <div className="ex-fc-row ex-fc-axis-head">
            <span className="ex-fc-rlabel" />
            <div className="ex-fc-track">
              <span className={`ex-fc-zero-label ${zAlign}`} style={{ left: pct(0) }} data-axis="">
                Forecast path
              </span>
            </div>
          </div>
          {all.map(({ m, rows }) => (
            <Group key={m.v} m={m} rows={rows} pct={pct} sel={sel} />
          ))}
          <div className="ex-fc-row ex-fc-axis" aria-hidden="true">
            <span className="ex-fc-rlabel" />
            <div className="ex-fc-track">
              {sc.ticks.map((t) => (
                <span key={t} className={`ex-fc-tick${Math.abs(t) < 1e-9 ? ' is-zero' : ''}`} style={{ left: pct(t) }} data-axis="">
                  {tickText(t, sc.dp)}
                </span>
              ))}
            </div>
          </div>
          <p className="ex-fc-foot">{`Each row shows one version’s ${HEADLINE_YEAR} result with some and with no foreign capital; the bar’s length shows how much the assumption matters.`}</p>
        </div>
      ) : (
        <div className="unpublished-plot">
          <Items items={sentenceItems(ruleSolved(rule, sid) ? 'No version shown is solved.' : ruleGapText(rule, sid))} />
        </div>
      )}
    </Card>
  );
}
