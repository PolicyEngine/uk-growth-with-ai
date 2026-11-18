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
import EvidenceLanes from './EvidenceLanes.jsx';
import RelatedWork from './RelatedWork.jsx';
import IMF from './imfGap.json';
import GrowthCheck from './GrowthCheck.jsx';
import EvidenceMap from './EvidenceMap.jsx';
import PageIntro from '@/components/ui/PageIntro.jsx';
import OnThisPage from '@/components/ui/OnThisPage.jsx';
import { Items } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import IconText from '@/tabs/method/IconText.jsx';
import { SRC } from '@/tabs/method/sources.js';
import { CENTRAL, HEADLINE_YEAR, gap } from '@/tabs/ai/surprise.js';
import { SET } from '@/lib/dataKeys.js';

// Why UK central's GDP gap is below the IMF's for the same productivity gain
// (results sanity audit, SET.sanityDoc section 7). The IMF
// year-4 output figure (digitised from SIP/2026/072 Figure 9) and the
// unchanged-return bound (arithmetic, not a solve) are read from
// imfGap.json, which carries each one's source.
const IMF_Y4 = IMF.imf_y4_output_pct;
const BOUND_GDP = IMF.unchanged_return_gdp_pct;
const pct1 = (x) => `+${x.toFixed(1)}%`;
function ImfGap() {
  const y = gap('uk_central', 'tfp', CENTRAL, 'Y');
  if (y == null) return null;
  return (
    <InfoCard icon={iconFor('foreign')} title="Why UK central GDP is below the IMF’s" className="imf-gap" id="imf-gap">
      <Items
        items={[
          {
            icon: 'gdp',
            text: (
              <>
                UK central&rsquo;s {HEADLINE_YEAR} GDP gain (
                <NavLink tab="explore" sub="economy" anchor="economy-wall" patch={{ s: 'uk_central' }}>Explore</NavLink>): roughly{' '}
                {Math.round((y / IMF_Y4) * 3) === 1 ? 'a third' : `${Math.round((y / IMF_Y4) * 100)}%`} of the IMF&rsquo;s.
              </>
            ),
          },
          { icon: 'foreign', text: <>IMF: about <span data-path="imfGap.imf_y4_output_pct">+{IMF_Y4.toFixed(1)}%</span> at year 4, read off its {ext(SRC.imfSipFig9.url, 'Figure 9')}.</> },
          { icon: 'closure', text: 'Arithmetic suggests foreign capital (the capital closure) could account for the difference.' },
          {
            icon: 'interest',
            text: (
              <>
                Here the return on capital rises as capital grows (
                <NavLink tab="explore" sub="economy" anchor="explore-part-economy" patch={{ s: 'uk_central' }}>Explore, Economy</NavLink>).
              </>
            ),
          },
          { icon: 'capital', text: 'If capital came in at an unchanged return:' },
          {
            icon: 'arithmetic',
            text: (
              <>
                GDP would be about <span data-path="imfGap.unchanged_return_gdp_pct">{pct1(BOUND_GDP.lo)} to {pct1(BOUND_GDP.hi)}</span> (arithmetic, not a solve).
              </>
            ),
          },
        ]}
      />
      <p className="mx-src">
        <IconText icon="source">{ext(`${REPO}/blob/${SET.sanityRef}/${SET.sanityDoc}`, 'Results sanity audit, section 7')}; IMF
        figure read from SIP/2026/072, Figure 9.</IconText>
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

// The key lists only the levels some cell uses.
const USED = new Set(CHANNELS.flatMap((ch) => Object.values(ch.cells).map((c) => c[0])));
function Legend() {
  return (
    <ul className="mx-legend" aria-label="Key">
      {Object.entries(LEVELS)
        .filter(([k]) => USED.has(k))
        .map(([k, v]) => (
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
    const ring = `<circle cx="${cx}" cy="${cy}" r="6" fill="${lv === 'yes' ? C.mark : C.surface}" stroke="${lv === 'no' ? C.markOff : C.mark}" stroke-width="1.5"/>`;
    if (lv === 'na') return `<line x1="${cx - 6}" x2="${cx + 6}" y1="${cy}" y2="${cy}" stroke="${C.muted}" stroke-width="1.5"/>`;
    if (lv === 'part') return `${ring}<path d="M${cx} ${cy - 6} A6 6 0 0 1 ${cx} ${cy + 6} Z" fill="${C.mark}"/>`;
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
      icon={iconFor('coverage')}
      title="Coverage by channel"
      className="mx-matrix-card"
      finding={<IconText icon="coverage">Whether each source models each channel.</IconText>}
      logo={false}
      about={{
        sources: (
          <Items
            items={[
              { icon: 'forecast', text: 'OBR: March 2026 displacement scenario; July 2026 FRS labour-share box.' },
              { icon: 'foreign', text: 'IMF UK: SIP/2026/072 and its model, Rockall et al. (IMF WP/25/68).' },
              { icon: 'check', text: 'Each cell is read from the primary text or inferred from the model’s set-up.' },
              { icon: 'link', text: 'Each source is listed under Sources.' },
            ]}
          />
        ),
      }}
      download={{
        title: 'Coverage by channel',
        table: () => ({
          columns: ['Channel', ...MODELS.map((m) => m.short)],
          rows: CHANNELS.map((ch) => [ch.label, ...MODELS.map((m) => ch.cells[m.id][1])]),
        }),
        svg: matrixSvg,
        legend: () => [
          { label: 'Modelled', color: CHART_COLOURS.mark, shape: 'dot' },
          { label: 'Not in the model', color: CHART_COLOURS.markOff, shape: 'ring' },
        ],
      }}
    >
      <div ref={ref}>
      <Legend />
      <div className="mx-matrix" data-no-axes="A table of channels by source" role="table" aria-label="Channels by source">
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
      <InfoCard icon={iconFor('generations')} title="Of the five, only OG-UK: households by age">
        <Items
          items={[
            { icon: 'households', text: 'The IMF’s households differ by income and wealth, not by age.' },
            { icon: 'tax', text: 'Of the five, only OG-UK and the OBR have a tax system.' },
          ]}
        />
      </InfoCard>
      <InfoCard icon={iconFor('labour')} title="Of the five, only Korinek et al.: jobs and tasks">
        <Items
          items={[
            { icon: 'jobLoss', text: 'They model new tasks and unemployment.' },
            { icon: 'excluded', text: 'OG-UK has neither; the OBR assumes higher unemployment.' },
          ]}
        />
      </InfoCard>
      <InfoCard icon={iconFor('scarceGoods')} title="What none of the five models">
        <Items
          items={[
            { icon: 'scarceGoods', text: 'Demand shifting to goods that stay scarce.' },
            { icon: 'source', text: 'Moll and Imas argue it but do not model it.' },
          ]}
        />
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
            </span>
            <span className="mx-src-title">{s.title}</span>
            <span className="mx-src-use">
              <IconText icon="why">{s.use}</IconText>
            </span>
            <span className="mx-src-loc">
              <IconText icon="source">{s.loc}</IconText>
            </span>
            {s.read ? (
              <span className="mx-src-read">
                <IconText icon="caveat">{s.read}</IconText>
              </span>
            ) : null}
          </a>
        ))}
      </div>
    </section>
  );
}

// The page's four sections, for "On this page" (ids match the headings).
const SECTIONS = [
  { id: 'coverage', title: 'What each source can represent', icon: iconFor('coverage') },
  { id: 'numbers', title: 'Where OG-UK’s results sit', icon: iconFor('measure') },
  { id: 'related-work', title: 'Related PolicyEngine work', icon: iconFor('external') },
  { id: 'evidence-map', title: 'UK evidence map', icon: iconFor('table') },
  { id: 'sources', title: 'Sources', icon: iconFor('source') },
];

export default function StudiesTab() {
  // Coverage, our numbers and sources, in order on one page (each was a
  // sub-tab until the tabs were consolidated; old links land on its anchor).
  return (
    <div className="page-with-contents mx-tab mx-lit">
      <OnThisPage tab="method" sub="studies" sections={SECTIONS} label="Evidence contents" />
      <div className="page-body">
        <PageIntro
          icon={iconFor('source')}
          question="How do OG-UK’s results compare with other work on AI and the UK economy?"
          answer={<IconText icon="compare">The sources model different channels, from households by age to jobs, tasks or the world economy. Each published figure keeps its own baseline.</IconText>}
        />
        <SectionHeading id="coverage" icon={iconFor('coverage')} title="What each source can represent">
            <IconText icon="coverage">Nine channels against five sources. OG-UK is the first column.</IconText>
        </SectionHeading>
        <Matrix />
        <Takeaways />
        <SectionHeading id="numbers" icon={iconFor('measure')} title="Where OG-UK’s results sit">
            <IconText icon="range">Published figures by measure, OG-UK&rsquo;s beside them where comparable. Each row states its horizon.</IconText>
        </SectionHeading>
        <EvidenceLanes />
        <ImfGap />
        <GrowthCheck />
        <RelatedWork />
        <SectionHeading id="evidence-map" icon={iconFor('table')} title="UK evidence map">
            <IconText icon="source">Official, think-tank, international, private and academic estimates, each with baseline, horizon and check date. Published figures live here.</IconText>
        </SectionHeading>
        <EvidenceMap />
        <SectionHeading id="sources" icon={iconFor('source')} title="Sources">
            <IconText icon="link">Behind the coverage matrix and the growth check; figures in the evidence map. Earlier checks: {ext(`${REPO}/pull/41`, 'the literature comparison (PR #41)')}.</IconText>
        </SectionHeading>
        <SourceList group="uk" title="UK official and UK-specific" icon={iconFor('finances')} />
        <SourceList group="model" title="Model-based studies" icon={iconFor('model')} />
      </div>
    </div>
  );
}
