'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { subscribe } from '@/lib/scrollLoop.js';
import Sankey from '@/components/story/Sankey.jsx';
import Scrolly from '@/components/story/Scrolly.jsx';
import Icon from '@/components/ab/Icon.jsx';
import { ModelBadge, Replay, Pause } from '@/components/story/chart/index.js';
import { useIsPhone, useReducedMotion } from '@/components/story/motion.js';
import { NavLink } from '@/lib/nav.jsx';
import { SCEN_NAME, CENTRAL, BOUND } from '@/tabs/ai/surprise.js';
import { Tx } from './frame.jsx';
import { OutputSource } from './sources.jsx';
import { Essential } from '@/components/ui/SourceLine.jsx';
import { SPLIT_YEAR, PART_COLOR, PART_TEXT, CAPITAL_PARTS, share, change, splitFor, sankeyGraph, waterfallRows, barColor } from './split.js';
import { dirConcept, dirWord } from './dir.js';
import { Key } from '@/components/story/highlight.jsx';
import { Say } from './steps.jsx';
import { Answer, TopicHead } from '@/components/story/QStage.jsx';
import { useLiveInView } from './live.js';
import { iconFor } from '@/lib/concepts.js';

// Where output goes in the headline year, at the header's scenario and
// closure (the central closure with Both, which the lead says), as a
// three-step scrolly over one graphic:
//   1  a Sankey of the OBR-central path: GDP to labour income and gross
//      capital income, as shares of GDP (the left column's ribbons wipe in);
//   2  gross capital income's three parts: kept in the UK, paid abroad,
//      depreciation (the next column wipes in);
//   3  a waterfall of each part's change in the scenario, in % of the path's
//      GDP, bars growing in turn. Hovering or focusing a row picks out its
//      ribbon, and hovering a ribbon its row.
// The baseline is never morphed into the scenario: they are different
// measures (shares of the path's GDP, changes against it).
// Every figure is in the DOM in every state, once: layers not yet reached
// are hidden by opacity and clip-path only, so the text (and the number
// checks, which read it at step 1) always holds each share and change. On
// phones a sticky graphic this tall would leave no room to read, and the
// scrolly would repeat it per step, so the figure is drawn once, complete,
// above the three texts. Before step 3 the waterfall is collapsed and
// hidden (its text kept in the DOM); it opens at step 3. The GDP bar carries no number: that figure is the headline
// tile's. Bare numbers, the unit in each subtitle.

const CL_WORDS = { [CENTRAL]: 'central closure', [BOUND]: 'closed capital' };
const cap = (s) => s[0].toUpperCase() + s.slice(1);
// ms between waterfall bars: one at a time, labour, gross capital, its three
// parts (each from where the last ended), then GDP from zero
export const GROW_STAGGER = 420;
// "What the scenario changes" (scene plan section 6): the four changes
// appear as chips beside their Sankey nodes for one beat, then each chip
// travels to its waterfall row and is that row's value: the same element,
// moved by a transform, so each change is printed once.
const TRAVEL = ['labour', 'domestic', 'foreign', 'depreciation'];
// The beats' timings (ms). Phones and tablets (one unpinned figure, read
// while scrolling) take the short set: the whole build, chips to the GDP
// value, ends within about 1.5s of state 2 (round 1f).
export const TIMING = {
  full: { grow: GROW_STAGGER, hold: 1100, travel: 750, stagger: 120, capital: 700, gdp: 2500 },
  fast: { grow: 130, hold: 300, travel: 450, stagger: 110, capital: 250, gdp: 950 },
};
// the smallest vertical gap between two chips at the nodes, px: the
// nodes of the capital split sit closer than a chip's height
const CHIP_GAP = 4;
// The tooltip's one line of meaning per part.
const MEANING = {
  gdp: 'Everything produced in the UK, the path’s GDP as 100',
  labour: 'Income from work, the self-employed’s included',
  capital: 'Income paid to capital’s owners, before the three-way split',
  domestic: 'Net capital income that stays with UK residents',
  foreign: 'GDP less GNI: income paid to foreign owners of UK capital and gilts, net of income from abroad',
  depreciation: 'Replaces capital that wears out',
};
// Phones: one figure, too tall to stick, so its state follows its own place
// on screen, both ways: in view, the path's first column pours (state 0);
// once the Sankey's middle passes 75% of the screen, the capital split
// (state 1); once the waterfall's top passes 75%, the change bars (state 2),
// so the build runs while the waterfall is in view, not after.
// Above the screen's foot again, it resets, so the build replays.
function useScrollState(active) {
  const ref = useRef(null);
  const [st, setSt] = useState({ seen: false, s: 0 });
  const last = useRef(st);
  useEffect(() => {
    if (!active) return undefined;
    // the page's one scroll loop (lib/scrollLoop.js): reads, then writes
    return subscribe({
      el: ref.current,
      read: (f) => {
        const el = ref.current;
        if (!el) return null;
        const vh = f.V;
        const r = el.getBoundingClientRect();
        const sk = el.querySelector('.p2-sankey')?.getBoundingClientRect() ?? r;
        const wf = el.querySelector('.p2-output-change')?.getBoundingClientRect() ?? r;
        const seen = r.top < vh * 0.85 && r.bottom > 0;
        const s = wf.top < vh * 0.75 ? 2 : (sk.top + sk.bottom) / 2 < vh * 0.75 ? 1 : 0;
        return { seen, s };
      },
      write: (n) => {
        const o = last.current;
        if (!n || (o.seen === n.seen && o.s === n.s)) return;
        last.current = n;
        setSt(n);
      },
    });
  }, [active]);
  return [ref, st];
}

const CH_KEY = { labour: 'labour', capital: 'gross_capital', domestic: 'domestic', foreign: 'foreign', depreciation: 'depreciation' };

function Waterfall({ rows, on, hl, setHl, path, cells, chips, phase, t }) {
  const ends = rows.flatMap((r) => [r.from, r.to]);
  let lo = Math.min(0, ...ends);
  let hi = Math.max(0, ...ends);
  const pad = (hi - lo) * 0.04;
  lo -= pad;
  hi += pad;
  const at = (x) => ((x - lo) / (hi - lo)) * 100;
  return (
    <ol className={`p2-wf${on ? ' is-on' : ''}${hl ? ' has-hl' : ''}`} style={{ '--zero': `${at(0)}%` }} onMouseLeave={() => setHl(null)}>
      {rows.map((r, i) => {
        const a = Math.min(r.from, r.to);
        const b = Math.max(r.from, r.to);
        const pick = r.id === 'gdp' ? null : r.id;
        return (
          <li
            key={r.id}
            className={`p2-wf-row${r.sub ? ' is-sub' : ''}${r.outline ? ' is-outline' : ''}${hl && hl === r.id ? ' is-hl' : ''}`}
            data-row={r.id}
            data-mark={`wf-${r.id}`}
            tabIndex={pick && on ? 0 : undefined}
            onMouseEnter={() => setHl(pick)}
            onFocus={() => setHl(pick)}
            onBlur={() => setHl(null)}
          >
            <span className="p2-wf-label">
              <span className="p2-wf-swatch" style={{ '--sw': PART_COLOR[r.id] }} aria-hidden="true" />
              {r.sub ? <span className="p2-wf-of">of which </span> : null}
              {r.label}
            </span>
            <span className="p2-wf-track" aria-hidden="true">
              <span className="p2-wf-zero" />
              {/* GDP equals the sum: a dashed connector from the last part's
                  end down to the GDP bar's end, once the GDP bar is drawn */}
              {r.id === 'gdp' ? <span className="p2-wf-sum" style={{ left: `${at(r.to)}%`, transitionDelay: on ? `${(i + 1) * t.grow + 200}ms` : '0ms' }} /> : null}
              {/* grows from the end it starts at: zero for labour and GDP,
                  the previous row's end for the parts */}
              <span
                className={`p2-wf-bar${r.to < r.from ? ' is-back' : ''}`}
                style={{
                  left: `${at(a)}%`,
                  width: `${Math.max(at(b) - at(a), 0.4)}%`,
                  '--bar': barColor(r.id, r.to - r.from),
                  transitionDelay: on ? `${i * t.grow}ms` : '0ms',
                }}
              />
            </span>
            <span
              ref={(el) => {
                if (cells) cells.current[r.id] = el;
              }}
              className={`p2-wf-value${TRAVEL.includes(r.id) ? ` is-travel is-${dirConcept(r.value)}` : ''}${chips?.[r.id] ? ' is-chip' : ''}`}
              data-path={r.value == null ? undefined : `${path}.${r.id === 'capital' ? 'gross_capital' : r.id}`}
              data-delay={i}
              style={
                chips?.[r.id]
                  ? { transform: `translate(${chips[r.id][0].toFixed(1)}px, ${chips[r.id][1].toFixed(1)}px)`, transition: 'none' }
                  : TRAVEL.includes(r.id) && phase === 'travel'
                    ? { transitionDelay: `${travelRank(r.id) * t.stagger}ms`, transitionDuration: `${t.travel}ms, 300ms, 300ms, 300ms` }
                    : undefined
              }
            >
              {TRAVEL.includes(r.id) && dirConcept(r.value) ? <Icon name={iconFor(dirConcept(r.value))} size={12} strokeWidth={2.25} className="p2-wf-dir" /> : null}
              {r.value == null ? null : change(r.value)}
              {r.id === 'gdp' ? (
                <NavLink tab="story" anchor="story-headline" className="p2-wf-link" aria-label="GDP: the headline figures" title="Headline figures">
                  <Icon name={iconFor('headline')} size={12} strokeWidth={2} />
                </NavLink>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// The chips leave bottom first (depreciation, then up to labour): every
// row lies below every node, so a chip in flight only moves away from the
// chips still waiting above it, and none crosses another.
const travelRank = (id) => TRAVEL.length - 1 - TRAVEL.indexOf(id);

// Step 3's items, true for the cell in view: each reads a sign and prints
// no figure (the figures are on the charts). `icon` is a concept (a
// direction where the item states one, from the same sign as its words);
// The render adds chips for the parts named (labour, abroad, wear).
export function outChangeItems(ch) {
  const out = [
    { key: 'gdp', icon: dirConcept(ch.gdp), text: `GDP is ${dirWord(ch.gdp)} the path` },
    { key: 'labour', icon: dirConcept(ch.labour), text: `is ${dirWord(ch.labour)} it` },
  ];
  if (ch.gdp > 0 && ch.labour < 0)
    out.push({
      key: 'all',
      icon: 'takeaway',
      text: (
        <>
          <strong>Key takeaway:</strong> capital income rises by more than GDP
        </>
      ),
    });
  if (ch.foreign > 0 && ch.depreciation > 0) {
    out.push({ key: 'abroad', icon: 'foreign', text: 'Part is net income paid abroad or covers wear on more capital' });
    out.push({ key: 'gni', icon: 'gni', text: 'So national income rises less than GDP' });
  }
  return out;
}


// The graphic: the Sankey, the waterfall below it. `state` 0-2; `all`
// draws the last state with nothing hidden (phones).
function OutputGraphic({ state, sid, cl, base, ch, all = false, hl, setHl, seen: seenProp, figRef, fast = false, both = false }) {
  const t = fast ? TIMING.fast : TIMING.full;
  const [ownRef, ownSeen] = useLiveInView();
  const ref = figRef ?? ownRef;
  const seen = seenProp ?? ownSeen;
  const reduce = useReducedMotion();
  const s = all ? 2 : state;
  // a pick holds only in the state it was made in (phones: always), so a
  // row focused when the reader scrolls back, which loses focus without a
  // blur as the waterfall goes inert, lights nothing
  const lit = hl && (all || hl.s === s) ? hl.id : null;
  const pick = (id) => setHl(id ? { id, s } : null);
  // nothing pours before the block is seen; then column by column
  const pour = all ? 2 : seen ? Math.min(s + 1, 2) : 0;
  const [replay, setReplay] = useState(0);
  const [paused, setPaused] = useState(false);
  const graph = base ? sankeyGraph(base, true) : null;
  const where = `${SCEN_NAME[sid]}, main arm, common fiscal rule`;
  const sankeyLabel = base
    ? `Sankey diagram: GDP on the OBR-central path in ${SPLIT_YEAR}, ${CL_WORDS[cl]}, split into labour income (${share(base.labour)} of every 100) and gross capital income, which splits into net capital income kept in the UK (${share(base.domestic)}), net income paid abroad (${share(base.foreign)}) and depreciation (${share(base.depreciation)}).`
    : '';
  // the chips' beats: idle (before step 3), chips (at the nodes), travel,
  // settled (in the rows, a gain or loss icon left on each node)
  // `climbed`: the figure was in view before step 3 (the reader scrolled
  // through steps 1 and 2). A reader who lands on step 3 (a jump, a link, a
  // reload) gets the settled state at once, at full contrast (`landed`)
  const [climbed, setClimbed] = useState(false);
  if (seen && s < 2 && !climbed) setClimbed(true);
  if (!seen && climbed) setClimbed(false);
  const instant = all || reduce || !ch || !climbed;
  const [phase, setPhase] = useState(s >= 2 && instant ? 'settled' : 'idle');
  const [landed, setLanded] = useState(false);
  const [chips, setChips] = useState(null);
  const [boxes, setBoxes] = useState(null);
  const cells = useRef({});
  const wrap = useRef(null);
  // the Sankey's ribbons and nodes as marks (wf-<part>, the waterfall rows'
  // ids), so a step's highlight lights the ribbon and the row together; set
  // after each render (Sankey.jsx draws them without data-mark)
  useLayoutEffect(() => {
    const root = wrap.current;
    if (!root) return;
    root.querySelectorAll('.sankey-link[data-target]').forEach((el) => el.setAttribute('data-mark', `wf-${el.getAttribute('data-target')}`));
    root.querySelectorAll('.sankey-node[data-node]').forEach((el) => el.setAttribute('data-mark', `wf-${el.getAttribute('data-node')}`));
  });
  // out of view or before step 3: back to idle, so the build replays each
  // time the reader scrolls to it, down or back up
  if ((s < 2 || !seen) && phase !== 'idle') {
    setPhase('idle');
    setChips(null);
    setLanded(false);
  }
  if (s >= 2 && seen && phase === 'idle') {
    setPhase(instant ? 'settled' : 'chips');
    setLanded(instant && !all && !reduce);
  }
  useLayoutEffect(() => {
    if (phase !== 'chips' || !wrap.current || !boxes) return;
    // measured once, at the beat's start (not in an animation frame)
    const w = wrap.current.getBoundingClientRect();
    const k = w.width / (boxes.width || w.width);
    const at = {};
    // each chip's centre beside its node, top to bottom, pushed down where
    // it would overlap the chip above (the capital split's nodes sit close)
    let floor = -Infinity;
    for (const id of TRAVEL) {
      const n = boxes.nodes[id];
      const c = cells.current[id];
      if (!n || !c) continue;
      const r = c.getBoundingClientRect();
      const cy = Math.max(w.top + ((n.y0 + n.y1) / 2) * k, floor + r.height + CHIP_GAP);
      floor = cy;
      at[id] = [w.left + n.x0 * k - 8 - r.right, cy - (r.top + r.height / 2)];
    }
    setChips(at);
  }, [phase, boxes]);
  useEffect(() => {
    if (phase === 'chips' && chips) {
      const id = setTimeout(() => {
        setChips(null);
        setPhase('travel');
      }, t.hold);
      return () => clearTimeout(id);
    }
    if (phase === 'travel') {
      const id = setTimeout(() => setPhase('settled'), t.travel + t.stagger * TRAVEL.length);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [phase, chips, t]);
  const grown = s >= 2 && (phase === 'travel' || phase === 'settled');
  const nodeBox = useMemo(() => (b) => setBoxes(b), []);
  // icons left on the four nodes once the chips have landed (no number)
  // each node's icon appears with its waterfall row's bar
  const icons = grown && ch && graph ? TRAVEL : [];
  const rowAt = { labour: 0, domestic: 2, foreign: 3, depreciation: 4 };
  const tooltip = ({ kind, link, node }) => {
    const id = kind === 'link' ? link.target.id : node.id;
    const name = id === 'gdp' ? 'GDP' : id === 'capital' ? 'Gross capital income' : PART_TEXT[id]?.long;
    const val = id === 'gdp' ? 100 : id === 'capital' ? CAPITAL_PARTS.reduce((a, k2) => a + base[k2], 0) : base[id];
    const c = s >= 2 && ch && CH_KEY[id] ? ch[CH_KEY[id]] : null;
    return (
      <>
        <div className="sankey-tip-head">{name}</div>
        <div className="sankey-tip-row">
          {id === 'gdp' ? val : share(val)} of every 100 on the path
        </div>
        <div className="sankey-tip-row is-note">{MEANING[id]}</div>
        {c != null ? (
          <div className={`sankey-tip-row is-${dirConcept(c)}`}>
            {SCEN_NAME[sid]}: {change(c)} percentage points of GDP
          </div>
        ) : null}
      </>
    );
  };
  return (
    <figure
      ref={ref}
      className={`p2-figure p2-output-fig p2-output-graphic${fast ? ' is-fast' : ''}${landed ? ' is-landed' : ''}`}
      data-state={s}
      data-phase={phase}
      style={{ '--wf-capital-delay': `${t.capital}ms`, '--wf-gdp-delay': `${t.gdp}ms` }}
    >
      <div className="p2-output-base">
        {/* one head row: badge, title with its unit, Replay and Pause */}
        <div className="p2-output-head">
          <ModelBadge model="oguk" />
          <p className="story-figure-title p2-output-title">
            <Tx icon="gdp">Who is paid GDP in {SPLIT_YEAR}</Tx>
            <OutputSource closure={cap(CL_WORDS[cl])} where={where} />
          </p>
          {graph && !all ? (
            <span className="p2-output-actions">
              <Replay onClick={() => setReplay((r) => r + 1)} label="Replay the build" />
              <Pause paused={paused} onClick={() => setPaused((p) => !p)} />
            </span>
          ) : null}
        </div>
        <p className="story-figure-unit p2-output-unit">
          <span data-axis-title="y">per 100 of GDP on the OBR-central path</span>
          {both ? <span>. With both closures chosen above, both figures show the central closure.</span> : null}
        </p>
        {graph ? (
          <div className="p2-sankey" ref={wrap}>
            <Sankey
              graphs={[graph]}
              label={sankeyLabel}
              width={420}
              height={158}
              pad={20}
              rightRoom={118}
              linkOpacity={0.7}
              nodeWidth={[44, 44, 44]}
              inside
              pour={pour}
              pourGap={280}
              replayKey={replay}
              flow={seen && !paused}
              interactive
              tooltip={tooltip}
              highlight={lit ?? undefined}
              onHover={pick}
              onNodeBox={nodeBox}
            />
            {icons.map((id) => {
              const n = boxes?.nodes[id];
              if (!n) return null;
              const d = dirConcept(ch[id]);
              return (
                <span
                  key={id}
                  className={`p2-node-dir is-${d}${lit === id ? ' is-hl' : ''}`}
                  style={{ left: `${n.x0 - 16}px`, top: `${(n.y0 + n.y1) / 2}px`, animationDelay: `${(rowAt[id] ?? 0) * t.grow + 300}ms` }}
                  aria-hidden="true"
                >
                  <Icon name={iconFor(d)} size={12} strokeWidth={2.5} />
                </span>
              );
            })}
          </div>
        ) : (
          <p className="p2-pending">
            <Tx icon="provisional">The reference path at this closure is pending.</Tx>
          </p>
        )}
      </div>
      {/* not yet reached: collapsed and hidden (its text stays in the DOM,
          for the number checks), out of reach of focus and pointer; it opens
          at step 3, where it is discussed, at full contrast */}
      <div className={`p2-output-change p2-out-later${s >= 2 ? ' is-on' : ''}`} inert={s < 2 || undefined}>
        <p className="story-figure-title p2-output-title">
          <Tx icon="compare">
            What {SCEN_NAME[sid]} changes, {SPLIT_YEAR}
          </Tx>
        </p>
        <p className="story-figure-unit p2-output-unit" data-axis-title="x">change, in the same units</p>
        {ch ? (
          <>
            <Waterfall
              rows={waterfallRows(ch)}
              on={grown}
              hl={lit}
              setHl={pick}
              path={`output_split.change.${sid}.${cl}`}
              cells={cells}
              chips={phase === 'chips' ? chips : null}
              phase={phase}
              t={t}
            />
          </>
        ) : (
          <p className="p2-pending">
            <Tx icon="provisional">This solve is pending at the closure chosen above.</Tx>
          </p>
        )}
      </div>
      {/* the scene's closing line: a caption in the frame, under the plot
          (typography spec), shown once the change is drawn */}
      {ch && fast ? <Answer answer={outputAnswer(ch)} to="story-output" /> : null}
      {/* sources and notes behind the title's button; one essential line */}
      {ch ? <Essential>Rounded: parts may not add up</Essential> : null}
    </figure>
  );
}

function outputSteps(sid, cl, base, ch) {
  const labourMore = base ? base.labour > 50 : null;
  const k = (id, text) => <Key id={`wf-${id}`}>{text}</Key>;
  return [
    {
      id: 'p2-out-1',
      highlight: ['wf-labour', 'wf-capital'],
      icon: 'gdp',
      title: 'GDP is paid as labour or capital income',
      body: (
        <Say>
          On the path, {k('labour', 'labour income')} is {labourMore == null ? 'one part' : labourMore ? 'the larger part' : 'the smaller part'} of GDP; capital income is the rest.
        </Say>
      ),
    },
    {
      id: 'p2-out-2',
      highlight: ['wf-domestic', 'wf-foreign', 'wf-depreciation'],
      icon: 'capital',
      title: 'Capital income splits three ways',
      body: (
        <Say>
          Capital income splits three ways: kept in the UK, depreciation (wear on capital), and {k('foreign', 'net paid abroad')}.
        </Say>
      ),
    },
    {
      id: 'p2-out-3',
      highlight: ['wf-labour', 'wf-capital', 'wf-domestic', 'wf-foreign', 'wf-depreciation', 'wf-gdp'],
      pin: 'bottom',
      icon: 'compare',
      title: `What ${SCEN_NAME[sid]} changes`,
      body: ch ? (
        <Say>
          Now the shock: each bar is one part&rsquo;s change against the path. {k('gdp', 'GDP')} comes last.
        </Say>
      ) : (
        <p>This solve is pending at the closure chosen above.</p>
      ),
    },
  ];
}

// The block's question (in its lead: a Scrolly opener's sticky header
// would leave the tall figure too little room at 1366x650) and takeaway
// (the last card's closing line). The title avoids "Where output goes in",
// which part2.py reads as the start of the block's figures.
export const OUTPUT_SUB = {
  title: 'Where output goes',
  icon: 'outputSplit',
  question: 'Who gets the extra output: workers, owners of capital in the UK, or owners abroad?',
  hint: 'Follow each ribbon into the waterfall',
  answer: 'Capital income rises by more than GDP; labour income falls',
  answerTo: 'story-output',
};

// The block's one closing line, from the signs of the cell in view.
export function outputAnswer(ch) {
  if (ch.gdp > 0 && ch.labour < 0) return 'Capital income rises by more than GDP; labour income falls';
  return `GDP is ${dirWord(ch.gdp)} the path; labour income is ${dirWord(ch.labour)} it`;
}

export default function OutputSplit({ sid, closure }) {
  const { cl, base, ch } = splitFor(sid, closure);
  const both = closure === 'both';
  const phone = useIsPhone();
  // the part picked by a chip, a ribbon or a row, and the graphic state it
  // was picked in: { id, s }
  const [hl, setHl] = useState(null);
  const steps = outputSteps(sid, cl, base, ch);
  const [phoneRef, phoneSt] = useScrollState(phone);
  return (
    <section id="story-output" className="p2-output" aria-labelledby="story-output-h">
      <TopicHead id="story-output" sub={{ title: OUTPUT_SUB.title, question: OUTPUT_SUB.question, hint: OUTPUT_SUB.hint, icon: OUTPUT_SUB.icon, key: 'output', pin: 'full' }} titleId="story-output-h" />
      {phone ? (
        <div className="p2-output-static">
          <OutputGraphic fast both={both} state={phoneSt.s} seen={phoneSt.seen} figRef={phoneRef} sid={sid} cl={cl} base={base} ch={ch} hl={hl} setHl={setHl} />
          <ol className="p2-output-texts">
            {steps.map((s) => (
              <li key={s.id} id={s.id} className="p2-output-text">
                <h4 className="visually-hidden">{s.title}</h4>
                <div className="scrolly-body p2-output-text-body">
                  {s.icon ? <Icon name={iconFor(s.icon)} size={18} className="scrolly-title-icon" /> : null}
                  {s.body}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <Scrolly
          id="p2-output"
          label={`Where output goes in ${SPLIT_YEAR}`}
          steps={steps}
          close={ch ? { answer: outputAnswer(ch), answerTo: 'story-output' } : undefined}
          graphic={(i) => <OutputGraphic both={both} state={Math.min(i, 2)} sid={sid} cl={cl} base={base} ch={ch} hl={hl} setHl={setHl} />}
        />
      )}
    </section>
  );
}
