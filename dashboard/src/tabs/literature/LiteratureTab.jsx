'use client';

import Icon from '@/components/ab/Icon.jsx';
import { TipBox } from '@/components/ab/Tip.jsx';
import { SOURCES, MODELS, CHANNELS } from '@/data/literature.js';
import { REPO } from '@/tabs/ai/links.js';
import { ext, useHover } from '../shared/ui.jsx';
import { CHART_COLOURS } from '@/lib/chartTheme.js';
import { esc } from '@/lib/download.js';
import Card, { InfoCard, SectionHeading } from '@/components/ui/Card.jsx';
import { NavLink } from '@/lib/nav.jsx';
import RangeBars from './RangeBars.jsx';
import GrowthCheck from './GrowthCheck.jsx';
import EvidenceMap from './EvidenceMap.jsx';
import PageIntro from '@/components/ui/PageIntro.jsx';
import { CENTRAL, HEADLINE_YEAR, gap } from '@/tabs/ai/surprise.js';

// Why UK central's GDP gap is below the IMF's for the same productivity gain
// (results sanity audit, docs/results_sanity_2028.md section 7). The IMF
// year-4 output figure is digitised from SIP/2026/072 Figure 9
// (docs/uk_calibration.md); the bound is arithmetic, not a solve.
const IMF_Y4 = 2.52;
function ImfGap() {
  const y = gap('uk_central', 'tfp', CENTRAL, 'Y');
  if (y == null) return null;
  return (
    <InfoCard icon="globe" title="Why UK central GDP is below the IMF’s" className="imf-gap" id="imf-gap">
      <p>
        For about the same productivity gain, UK central&rsquo;s {HEADLINE_YEAR} GDP gain (on{' '}
        <NavLink tab="explore" sub="economy" anchor="income" patch={{ s: 'uk_central' }}>Explore</NavLink>) is roughly{' '}
        {Math.round((y / IMF_Y4) * 3) === 1 ? 'a third' : `${Math.round((y / IMF_Y4) * 100)}%`} of the IMF&rsquo;s about +
        {IMF_Y4.toFixed(1)}% at year 4.
      </p>
      <p>
        The capital closure is enough to account for the difference. Here the return on capital rises as capital grows
        (both on{' '}
        <NavLink tab="explore" sub="economy" anchor="explore-part-economy" patch={{ s: 'uk_central' }}>Explore, Economy</NavLink>); if capital came in at an unchanged return, GDP would be about +2.9% to +3.2%
        (arithmetic, not a solve).
      </p>
      <p className="mx-src">
        {ext(`${REPO}/blob/audit/sanity-2028/docs/results_sanity_2028.md`, 'Results sanity audit, section 7')}; IMF
        figure read from SIP/2026/072, Figure 9.
      </p>
    </InfoCard>
  );
}

// Literature: the comparison matrix first, then where our numbers sit, then
// the sources. Published figures come from data/literature.js (each with its
// location); ours from surprise2028.json and methodFacts.json.

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

// The matrix as SVG, for the PNG and SVG downloads: the same marks.
function matrixSvg() {
  const C = CHART_COLOURS;
  const lw = 230;
  const cw = 110;
  const rh = 30;
  const W = lw + MODELS.length * cw;
  const mark = (lv, cx, cy) => {
    const ring = `<circle cx="${cx}" cy="${cy}" r="6" fill="${lv === 'yes' ? C.gainText : C.surface}" stroke="${C.gainText}" stroke-width="1.5"/>`;
    if (lv === 'na') return `<line x1="${cx - 6}" x2="${cx + 6}" y1="${cy}" y2="${cy}" stroke="${C.muted}" stroke-width="1.5"/>`;
    if (lv === 'part') return `${ring}<path d="M${cx} ${cy - 6} A6 6 0 0 1 ${cx} ${cy + 6} Z" fill="${C.gainText}"/>`;
    return ring;
  };
  let out = '';
  MODELS.forEach((m, j) => {
    out += `<text x="${lw + j * cw + cw / 2}" y="16" font-size="12" font-weight="600" text-anchor="middle" fill="${C.ink}">${esc(m.short)}</text>`;
  });
  CHANNELS.forEach((ch, i) => {
    const y = 30 + i * rh;
    out += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="${C.grid}"/>`;
    out += `<text x="0" y="${y + 19}" font-size="12" fill="${C.ink}">${esc(ch.label)}</text>`;
    MODELS.forEach((m, j) => {
      out += mark(ch.cells[m.id][0], lw + j * cw + cw / 2, y + rh / 2);
    });
  });
  return { w: W, h: 30 + CHANNELS.length * rh + 4, markup: out };
}

function Matrix() {
  const { hi, ref, bind } = useHover();
  return (
    <Card
      id="coverage-matrix"
      icon="layoutGrid"
      title="Coverage by channel"
      className="mx-matrix-card"
      finding="Whether each source models each channel. Hover, tap or tab to a cell for the detail."
      logo={false}
      about={{ sources: 'OBR: the March 2026 displacement scenario and the July 2026 FRS labour-share box. IMF UK: SIP/2026/072. Every cell is read from the primary text; each source is listed under Sources.' }}
      download={{
        title: 'Coverage by channel',
        table: () => ({
          columns: ['Channel', ...MODELS.map((m) => m.short)],
          rows: CHANNELS.map((ch) => [ch.label, ...MODELS.map((m) => ch.cells[m.id][1])]),
        }),
        svg: matrixSvg,
        legend: () => [
          { label: 'Modelled', color: CHART_COLOURS.gainText, shape: 'dot' },
          { label: 'Not in the model', color: CHART_COLOURS.gainText, shape: 'ring' },
        ],
      }}
    >
      <div ref={ref}>
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
      </div>
    </Card>
  );
}

function Takeaways() {
  return (
    <div className="cards-grid cols-3">
      <InfoCard icon="usersRound" title="Only OG-UK: households">
        <p>Households by age and ability. Only OG-UK and the OBR have a tax system.</p>
      </InfoCard>
      <InfoCard icon="briefcase" title="Only Korinek et al.: jobs and tasks">
        <p>They model new tasks and unemployment. OG-UK has neither.</p>
      </InfoCard>
      <InfoCard icon="cart" title="What nobody models">
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

export default function StudiesTab() {
  // Coverage, our numbers and sources, in order on one page (each was a
  // sub-tab until the tabs were consolidated; old links land on its anchor).
  return (
    <div className="mx-tab mx-lit">
      <PageIntro
        icon="library"
        question="How do our results compare with other work on AI and the UK economy?"
        answer="Of the sources compared here, only OG-UK models households by age and ability, and only OG-UK and the OBR have a tax system; others model jobs, tasks or the whole world economy. Below: what each can represent, where our headline-year results sit against published figures and why they differ, and the sources."
      />
      <SectionHeading id="coverage" icon="layoutGrid" title="What each source can represent">
        Nine channels against five sources. OG-UK is the first column.
      </SectionHeading>
      <Matrix />
      <Takeaways />
      <SectionHeading id="numbers" icon="ruler" title="Where our numbers sit">
        Our headline-year results against published ranges. Horizons differ, so each row states its own.
      </SectionHeading>
      <RangeBars metric="gdp" />
      <ImfGap />
      <RangeBars metric="wage" />
      <GrowthCheck />
      <SectionHeading id="sources" icon="fileText" title="Sources">
        Every figure was read from the primary text. The checks are in {ext(`${REPO}/pull/41`, 'the literature comparison (PR #41)')}.
      </SectionHeading>
      <SourceList group="uk" title="UK official and UK-specific" icon="landmark" />
      <SourceList group="model" title="Model-based studies" icon="sigma" />
      <SectionHeading id="evidence-map" icon="table" title="UK evidence map">
        UK studies from the OBR, the Bank of England, think tanks, government departments, international bodies and private forecasters.
      </SectionHeading>
      <EvidenceMap />
    </div>
  );
}
