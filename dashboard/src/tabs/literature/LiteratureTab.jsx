'use client';

import Icon from '@/components/ab/Icon.jsx';
import InfoCard from '@/components/ab/InfoCard.jsx';
import { TipBox } from '@/components/ab/Tip.jsx';
import { SOURCES, MODELS, CHANNELS } from '@/data/literature.js';
import { REPO } from '@/tabs/ai/links.js';
import { ext, useHover } from '../shared/ui.jsx';
import SubTabs, { SubTabPanel, useSubTabParam } from '../shared/subtabs.jsx';
import RangeBars from './RangeBars.jsx';
import GrowthCheck from './GrowthCheck.jsx';

// Literature: the comparison matrix first, then where our numbers sit, then
// the sources. Published figures come from data/literature.js (each with its
// location); ours from surprise2028.json and methodFacts.json.

export const LIT_SUBS = [
  { id: 'matrix', label: 'Comparison matrix', icon: 'layoutGrid' },
  { id: 'numbers', label: 'Where our numbers sit', icon: 'ruler' },
  { id: 'sources', label: 'Sources', icon: 'book' },
];

const LEVELS = {
  yes: { label: 'Modelled', text: 'In the model' },
  part: { label: 'Partly', text: 'Assumed, imposed or partial' },
  no: { label: 'No', text: 'Not in the model' },
  na: { label: 'Not stated', text: 'The source does not say' },
};

// Coverage marks: a filled, half or empty circle, or a dash. Shape and text
// carry the meaning; colour only repeats it.
export function Mark({ level, size = 14 }) {
  const r = size / 2 - 1.5;
  const c = size / 2;
  return (
    <svg className={`mx-mark mx-mark-${level}`} viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
      {level === 'na' ? (
        <line x1={c - r} x2={c + r} y1={c} y2={c} />
      ) : (
        <>
          <circle cx={c} cy={c} r={r} />
          {level === 'part' ? <path d={`M${c} ${c - r} A${r} ${r} 0 0 1 ${c} ${c + r} Z`} /> : null}
        </>
      )}
    </svg>
  );
}

function Legend() {
  return (
    <ul className="mx-legend" aria-label="Key">
      {Object.entries(LEVELS).map(([k, v]) => (
        <li key={k}>
          <Mark level={k} />
          <span>
            <b>{v.label}</b> {v.text.toLowerCase()}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Cell({ ch, m, hi, bind }) {
  const [level, label, note] = ch.cells[m.id];
  const key = `${ch.id}:${m.id}`;
  return (
    <span className={`mx-cell lv-${level}${hi === key ? ' is-hi' : ''}`} {...bind(key, `${m.label}, ${ch.label}: ${label}. ${note}`)}>
      <Mark level={level} />
      <span className="mx-cell-label">{label}</span>
      {hi === key ? (
        <TipBox className="mx-tip">
          <b>
            {m.short} · {ch.label}
          </b>
          <span>{note}</span>
        </TipBox>
      ) : null}
    </span>
  );
}

function Matrix() {
  const { hi, ref, bind } = useHover();
  return (
    <div className="info-card mx-card mx-figure mx-matrix-card" ref={ref}>
      <div className="mx-fig-cap">
        <span className="mx-fig-title">Coverage by channel</span>
        <span className="mx-fig-sub">Hover, tap or tab to a cell for the detail.</span>
      </div>
      <Legend />
      <div className="mx-matrix" role="table" aria-label="Channels by source">
        <div className="mx-mrow mx-mhead" role="row">
          <span className="mx-mch" role="columnheader">
            Channel
          </span>
          {MODELS.map((m) => (
            <span key={m.id} className={`mx-mcol${m.id === 'oguk' ? ' is-ours' : ''}`} role="columnheader">
              {m.src ? ext(SOURCES[m.src].url, m.short) : m.short}
            </span>
          ))}
        </div>
        {CHANNELS.map((ch) => (
          <div key={ch.id} className="mx-mrow" role="row">
            <span className="mx-mch" role="rowheader">
              <Icon name={ch.icon} size={16} />
              <span>{ch.label}</span>
            </span>
            {MODELS.map((m) => (
              <span key={m.id} className={`mx-mcell${m.id === 'oguk' ? ' is-ours' : ''}`} role="cell" data-model={m.short}>
                <Cell ch={ch} m={m} hi={hi} bind={bind} />
              </span>
            ))}
          </div>
        ))}
      </div>
      <p className="mx-fig-note">
        OBR: the March 2026 displacement scenario and the July 2026 FRS labour-share box. IMF UK: SIP/2026/072.
      </p>
    </div>
  );
}

function Takeaways() {
  return (
    <div className="card-grid">
      <InfoCard icon="usersRound" title="Only OG-UK: households" className="mx-card">
        <p>Households by age and ability. Only OG-UK and the OBR have a tax system.</p>
      </InfoCard>
      <InfoCard icon="briefcase" title="Only Korinek et al.: jobs and tasks" className="mx-card">
        <p>They model new tasks and unemployment. OG-UK has neither.</p>
      </InfoCard>
      <InfoCard icon="cart" title="What nobody models" className="mx-card">
        <p>Demand shifting to goods that stay scarce. Moll and Imas argue it but do not model it.</p>
      </InfoCard>
    </div>
  );
}

function SourceList({ group, title, icon }) {
  const list = Object.entries(SOURCES).filter(([, s]) => s.group === group);
  return (
    <section className="mx-src-group" aria-labelledby={`src-${group}`}>
      <h3 id={`src-${group}`} className="mx-src-h">
        <Icon name={icon} size={18} />
        <span>{title}</span>
      </h3>
      <div className="card-grid cols-2">
        {list.map(([id, s]) => (
          <a key={id} id={`src-${id}`} className="link-card mx-src" href={s.url} target="_blank" rel="noreferrer">
            <span className="mx-src-top">
              <span className="link-card-title">{s.short}</span>
              <Icon name="externalLink" size={14} />
            </span>
            <span className="mx-src-title">{s.title}</span>
            <span className="mx-src-use">{s.use}</span>
            <span className="mx-src-loc">{s.loc}</span>
            {s.read ? <span className="mx-src-read">{s.read}</span> : null}
          </a>
        ))}
      </div>
    </section>
  );
}

export default function LiteratureTab({ active = true }) {
  const [sub, setSub] = useSubTabParam(LIT_SUBS.map((t) => t.id), active);
  return (
    <div className="mx-tab mx-lit">
      <SubTabs
        tabs={LIT_SUBS.map((t) => ({ value: t.id, label: t.label, icon: t.icon }))}
        value={sub}
        onChange={setSub}
        ariaLabel="Literature sections"
        idPrefix="lsub"
      />
      <SubTabPanel idPrefix="lsub" value={sub}>
        {sub === 'matrix' ? (
          <>
            <header className="mx-intro">
              <h2>What each source can represent</h2>
              <p>Nine channels against five sources. OG-UK is the first column.</p>
            </header>
            <Matrix />
            <Takeaways />
          </>
        ) : null}
        {sub === 'numbers' ? (
          <>
            <header className="mx-intro">
              <h2>Where our numbers sit</h2>
              <p>Our headline-year results against published ranges. Horizons differ, so each row states its own.</p>
            </header>
            <RangeBars metric="gdp" />
            <RangeBars metric="wage" />
            <GrowthCheck />
          </>
        ) : null}
        {sub === 'sources' ? (
          <>
            <header className="mx-intro">
              <h2>Sources</h2>
              <p>
                Every figure was read from the primary text. The checks are in{' '}
                {ext(`${REPO}/pull/37`, 'the literature comparison (PR #37)')}.
              </p>
            </header>
            <SourceList group="uk" title="UK official and UK-specific" icon="landmark" />
            <SourceList group="model" title="Model-based studies" icon="sigma" />
          </>
        ) : null}
      </SubTabPanel>
    </div>
  );
}
