'use client';

import { TileField } from '@/components/story/primitives.jsx';
import IconLine from '@/components/ui/IconLine.jsx';
import { useReducedMotion } from '@/components/story/motion.js';
import { ChartHover, ModelBadge } from '@/components/story/chart/index.js';
import { NavLink } from '@/lib/nav.jsx';
import { SCEN_NAME, SURPRISE_YEAR, CENTRAL, BOUND, scenarioById } from '@/tabs/ai/surprise.js';
import { Tx } from './frame.jsx';
import { SRC, ModelSourceButton, resultUrl, pathUrl } from './sources.jsx';
import { docItem } from '@/lib/sourceItems.js';
import { SPLIT_YEAR } from './split.js';
import { dirWord } from './dir.js';
import { COLS, GAP, ROWS, WIN, LEAD, LABOUR_COLOR, CAPITAL_COLOR, overviewTiles, shockTiles, settleMs } from './shock.js';

export { LABOUR_COLOR, CAPITAL_COLOR };

// The shock in two moves (#p2-shock), drawn from the data for the header's
// scenario and foreign-capital case (shock.js): a static overview, one tile
// 1 of every 100 of GDP on the OBR's central forecast path, and a strip that
// magnifies its outlined tiles, one small tile 0.1. State 0: before the
// shock; 1: the share shift (a scenario input) crosses to capital; 2: the
// added output (an OG-UK result) is added, shared at the new split. The
// figure prints the input (data-input), whole small-tile counts and the
// GDP change to one decimal, restated from the headline tiles (data-axis,
// its home is #story-headline). Each caption says once who sets the size
// (the scenario's input, OG-UK's result); the step cards do not repeat it.
//
// Entry: the strip grows in from the overview (scale and opacity) as the
// chart comes in, each time it does; a landing draws it at once.
//
// Pace: a forward move starts LEAD ms after the card changes, so its
// sentence is read first; the caption fades in once the move has landed.
// Back, on a landing (no previous state), in the measuring copies and under
// reduced motion: no lead, no drop, the final state at once (Scrolly's
// is-snap clears every delay after a jump). New small tiles enter by a CSS
// transition from @starting-style (story-part2.css), not an animation, so
// lifting is-snap never replays them.

const CL_WORDS = { [CENTRAL]: 'some foreign capital', [BOUND]: 'no foreign capital' };
const cap = (s) => s[0].toUpperCase() + s.slice(1);

const notes = () => [
  {
    icon: 'shock',
    text: `The two moves are drawn in turn: the shift first, at the forecast path’s GDP, then the added output, shared at the shares after the shift. In the model both build up together from ${SURPRISE_YEAR} to ${SPLIT_YEAR}.`,
  },
  { icon: 'caveat', text: 'Counts are rounded to whole small tiles, so they can differ by one from the next scene’s figures.' },
  {
    icon: 'productivity',
    text: (
      <>
        The added output reflects the scenario&rsquo;s{' '}
        <NavLink tab="method" sub="how" anchor="m-scenarios">
          productivity input
        </NavLink>{' '}
        and the model&rsquo;s response in capital and hours.
      </>
    ),
  },
];

export default function ShockTiles({ state, shock, sid, both = false, ctx }) {
  const reduce = useReducedMotion();
  const { cl, base, ch, M, N, NL, NK, L0, RL, R, inputPp } = shock;
  const s = state;
  // forward by scrolling: the move waits for the card's sentence
  const forward = !reduce && !ctx?.once && ctx?.prev != null && ctx.prev < s;
  const lead = forward ? LEAD : 0;
  // the entry beat: the strip grows out of the outlined tiles as the chart
  // comes in (not on a landing, in the measuring copies or reduced)
  const zoomIn = !reduce && !ctx?.once && !ctx?.instant && Boolean(ctx?.entered);
  const where = `${SCEN_NAME[sid]}, main version, spending follows GDP`;
  // the title is a finding (story-finding-titles-fable.md): who receives
  // each move; while pending, or with no added output, the old label
  const found = N > 0 && NL >= 1 && NK >= 1;
  const strip = base ? shockTiles(s, shock, { lead, enter: forward }) : [];
  // hover (M4): the overview's split and the strip's two moves, from the
  // data (the tooltip mounts only while active, so no figure leaves its home)
  const signed = (v, dp, u) => `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(dp)}${u}`;
  const tips = base
    ? [
        {
          head: `Of every 100 of GDP on the forecast path, ${SPLIT_YEAR}`,
          rows: [
            { name: 'Labour income', value: base.labour.toFixed(1), color: LABOUR_COLOR, path: `output_split.baseline.${cl}.labour` },
            { name: 'Capital income, gross', value: (100 - base.labour).toFixed(1), color: CAPITAL_COLOR },
          ],
          unit: 'Per 100 of GDP. The macro model, the forecast path.',
        },
        {
          head: `${SCEN_NAME[sid]}, ${SPLIT_YEAR}`,
          rows: [
            { name: 'Shift to capital (input)', value: `${inputPp.toFixed(1)} of 100`, color: CAPITAL_COLOR },
            ...(ch ? [{ name: 'Added output (macro model result)', value: signed(ch.gdp, 2, '%'), color: LABOUR_COLOR, path: `output_split.change.${sid}.${cl}.gdp` }] : []),
          ],
          unit: 'The shift is an assumption we set; the macro model works out the added output.',
        },
      ]
    : [];
  // each move's caption, shown 100ms after its last tile lands
  const capDelay = (st) => (forward && s === st ? settleMs(st, shock, lead) + 100 : 0);
  const line2 =
    ch == null
      ? 'This scenario is not yet solved for the foreign-capital case chosen above.'
      : N === 0
        ? `No new small tiles: GDP is ${dirWord(ch.gdp)} the forecast path.`
        : (
            <>
              {/* under 5 new tiles the rounded split misleads (2 tiles split 1
                  and 1 beside "the new split"): no split (review round 1, R1-18) */}
              Output grows about <span data-axis="">{ch.gdp.toFixed(1)}%</span>: {N} new small {N === 1 ? 'tile' : 'tiles'}
              {N < 5 ? '' : `, about ${NL} to labour, ${NK} to capital, at the new split`}. The macro model works out the size.
            </>
          );
  const stripLabel = base
    ? [
        `Magnified strip before the shock: ${RL * WIN} small tiles of labour income, 10 of capital income.`,
        `${M} small tiles have crossed from labour income to capital income.`,
        // under 5 new tiles the split is not drawn as one (R1-18): no split in the label either
        ch
          ? N < 5
            ? `After the shift, ${N} new small ${N === 1 ? 'tile' : 'tiles'}.`
            : `After the shift, ${N} new small tiles: ${NL} on labour income, ${NK} on capital income.`
          : `${M} small tiles have crossed from labour income to capital income; the added output is not yet solved.`,
      ][Math.min(s, 2)]
    : '';
  return (
    <figure className="p2-figure p2-shock-fig" data-state={s} data-no-axes="a tile grid: one tile is 1 of every 100 of GDP on the forecast path, one small tile 0.1">
      {/* the model and the scenario line share the top row (the figure must
          fit a phone's 45% cap to stay sticky) */}
      <div className="p2-shock-top">
        <ModelBadge model="oguk" />
        <p className="p2-shock-chip">
          {/* phones: the short name and no year, so the chip keeps its row
              beside the badge (phone-type-vs-sticky-fable.md, 4) */}
          <span className="p3-long">
            {SCEN_NAME[sid]} · {cap(CL_WORDS[cl])} · {SPLIT_YEAR}
          </span>
          <span className="p3-short">
            {scenarioById(sid)?.short ?? SCEN_NAME[sid]} · {cap(CL_WORDS[cl])}
          </span>
        </p>
      </div>
      <p className="story-figure-title p2-title-row" data-title-fallback={found ? undefined : ''}>
        <span>
          <Tx icon="shock">{found ? 'Added output is shared; the shift goes only to capital' : 'The shock in two moves'}</Tx>
        </span>
        <ModelSourceButton
          method="m-scenarios"
          items={[
            docItem('Scenario inputs: SIP/2026/072', SRC.imfSip, 'International Monetary Fund'),
            docItem('Scenario inputs: Korinek et al. (2026)', SRC.korinekT3, 'Korinek et al.'),
            docItem('Scenario inputs: Briefing paper No.9', SRC.bp9, 'Office for Budget Responsibility'),
          ]}
          files={[
            [`Result file: ${SCEN_NAME[sid]}, ${CL_WORDS[cl]}`, resultUrl(sid, 'tfp', cl)],
            [`Result file: the forecast path, ${CL_WORDS[cl]}`, pathUrl(cl)],
          ]}
          groups={[
            { title: 'Settings', notes: [{ icon: 'closure', text: cap(CL_WORDS[cl]) }, ...where.split(', ').map((t) => ({ icon: 'scenario', text: t }))] },
            { title: 'How it’s drawn', notes: notes() },
          ]}
        />
      </p>
      <p className="story-figure-unit">
        {/* phones: two lines (phone-type-vs-sticky-fable.md, 4); the badge says OG-UK */}
        <span className="p3-long">One tile is 1 of every 100 of GDP on the OBR&rsquo;s central forecast path. One small tile is 0.1. Macro model.</span>
        <span className="p3-short">One tile is 1 of every 100 of GDP on the forecast path; a small tile is 0.1.</span>
      </p>
      {both ? <p className="story-figure-unit">With both foreign-capital cases chosen above, the figure shows some foreign capital.</p> : null}
      {base ? (
        <>
          <ChartHover label={`The shock in tiles, ${SCEN_NAME[sid]}`} items={tips}>
          <div className="p2-tiles p2-shock-overview" data-tip={0}>
            <div className="p2-tile-heads" aria-hidden="true">
              <span style={{ '--sw': LABOUR_COLOR }}>Labour income</span>
              <span style={{ '--sw': CAPITAL_COLOR }}>Capital income, gross</span>
            </div>
            <TileField
              tiles={overviewTiles(shock)}
              width={COLS * 2 + GAP}
              height={ROWS}
              label={`Tile grid: of every 100 of GDP on the forecast path, ${L0} are labour income and ${100 - L0} gross capital income.`}
            />
          </div>
          <p className="p2-shock-strip-head">The outlined tiles, magnified: one small tile is 0.1</p>
          <div className="p2-shock-strip" data-tip={1}>
            <div className="p2-shock-wins" aria-hidden="true">
              <span>{`${RL} of labour’s tiles`}</span>
              <span>1 of capital&rsquo;s tiles</span>
            </div>
            {/* remounted at each entry (run, entered), so the magnification
                plays as the chart comes in, again on each re-entry */}
            <div key={`${ctx?.run ?? 0}-${ctx?.entered ?? true}`} className={`p2-shock-zoom${zoomIn ? ' is-enter' : ''}`}>
              <TileField tiles={strip} width={WIN * 2 + GAP} height={R} label={stripLabel} />
            </div>
          </div>
          </ChartHover>
          <div className="p2-shock-caps">
            <IconLine concept="ai" className={`p2-shock-cap${s >= 1 ? ' is-on' : ''}`} style={{ '--cd': `${capDelay(1)}ms` }}>
              AI moves <span data-input="">{inputPp.toFixed(1)}</span> of every 100 tiles of output from labour to capital: {M} small tiles cross. Its size is an assumption for each scenario.
            </IconLine>
            <IconLine concept={ch == null ? 'provisional' : 'gdp'} className={`p2-shock-cap${s >= 2 ? ' is-on' : ''}`} style={{ '--cd': `${capDelay(2)}ms` }}>
              {line2}
            </IconLine>
          </div>
        </>
      ) : (
        <p className="p2-pending">
          <Tx icon="provisional">The forecast path for this foreign-capital case is not yet solved.</Tx>
        </p>
      )}
    </figure>
  );
}
