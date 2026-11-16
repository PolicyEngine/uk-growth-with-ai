'use client';

import InfoCard from '@/components/ab/InfoCard.jsx';
import Card, { SectionHeading } from '@/components/ui/Card.jsx';
import Icon from '@/components/ab/Icon.jsx';
import Disclosure from '@/components/ab/Disclosure.jsx';
import { Items, KeyFacts } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import IconText from './IconText.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { SCENARIOS, KORINEK_FULL, CENTRAL, BOUND, SURPRISE_YEAR, HEADLINE_YEAR, FIRST_YEAR, LATE_YEAR, YEARS, ARMS, fixedInputVsTz, gap, signed } from '@/tabs/ai/surprise.js';
import { REPO } from '@/tabs/ai/links.js';
import { ext } from '../shared/ui.jsx';
import Timeline, { timelineTable, timelineSvg } from './Timeline.jsx';
import ScenarioMap, { scenarioTable } from './ScenarioMap.jsx';

// Scenarios: what is assumed. The four scenarios (three UK, one US upper
// case), the three arms each is run in, and the timing: one anchored section
// of OG-UK method (#m-scenarios, #m-arms, #m-timing). The ids it had as a
// sub-tab still exist (s-scenarios, s-arms and s-timing on the headings,
// scenario-map, scen-*, arm-*, timing, m-jump), so old links land. ScenariosTab.jsx wraps the same
// section while the Scenarios sub-tab is still in the nav.

const DOC = (p) => `${REPO}/blob/rerun/surprise-2028/docs/${p}`;

// The stress test's technology change, from the solves (UK central), per
// closure: a cut under the central closure, a slight rise with closed
// capital (results sanity audit, #39). Words and arrows follow the signs.
export const REF_SID = 'uk_central';
const fx = (cl) => fixedInputVsTz(REF_SID, 'ss', cl);

// Output at fixed inputs in the stress test against technology unchanged:
// the word and its arrow from one sign test (x < 0 falls, else rises).
export function stressMove(x) {
  if (x == null) return null;
  return x < 0 ? { icon: 'gapDown', word: 'falls' } : { icon: 'gapUp', word: 'rises slightly' };
}
// Technology unchanged's GDP against the OBR-central path.
export function tzGdpMove(x) {
  if (x == null) return { icon: 'caveat', word: 'is pending' };
  if (Math.abs(x) < 0.005) return { icon: 'onPath', word: 'is unchanged' };
  return x > 0 ? { icon: 'gapUp', word: 'rises a little as capital deepens' } : { icon: 'gapDown', word: 'ends slightly below the OBR-central path' };
}
const CL_NAME = { [CENTRAL]: 'Central closure', [BOUND]: 'Closed capital' };

export function stressItems(sid = REF_SID) {
  return [CENTRAL, BOUND].flatMap((cl) => {
    const x = fixedInputVsTz(sid, 'ss', cl);
    const m = stressMove(x);
    if (!m) return [];
    const tail = cl === CENTRAL ? 'against technology unchanged' : 'near technology unchanged';
    return [{ key: cl, icon: m.icon, text: `${CL_NAME[cl]}: fixed-input output ${m.word} (UK central: ${signed(x, 2)}%), ${tail}.` }];
  });
}
function stressFixedText() {
  const w = (x) => stressMove(x)?.word ?? 'pending';
  return `Central closure: ${w(fx(CENTRAL))}; closed capital: ${w(fx(BOUND))}`;
}
export function tzGdpItems(sid = REF_SID) {
  return [CENTRAL, BOUND].map((cl) => {
    const m = tzGdpMove(gap(sid, 'tz', cl, 'Y'));
    return { key: cl, icon: m.icon, text: `${CL_NAME[cl]}: UK central GDP ${m.word}.` };
  });
}

const ARM_TEXT = {
  tfp: {
    icon: 'productivity',
    role: 'Main result',
    items: [
      { icon: 'capital', text: 'The capital share rises.' },
      { icon: 'productivity', text: 'Output at fixed inputs rises by the scenario’s gain.' },
    ],
    fixedText: 'Rises by the scenario’s gain',
    glyph: <path d="M4 14 L12 6 L20 14" />,
    preview: 'Anchored at the starting year',
    more: (
      <Items
        items={[
          { icon: 'equation', text: <>Z is solved jointly with &gamma;.</> },
          { icon: 'start', text: <>The gain is measured at the baseline&rsquo;s {FIRST_YEAR} capital and labour.</> },
          { icon: 'start', text: 'No scenario has touched those inputs yet.' },
        ]}
      />
    ),
  },
  tz: {
    icon: 'compare',
    role: 'Shown beside the stress test',
    items: [
      { icon: 'capital', text: 'The same rise in the capital share.' },
      { icon: 'productivity', text: 'Output at fixed inputs unchanged.' },
    ],
    fixedText: 'Unchanged',
    glyph: <path d="M4 10 H20" />,
    preview: 'Why it is shown',
    more: (
      <Items
        items={[
          { icon: 'labour', text: 'Income moves from labour to capital, with no productivity gain.' },
          ...tzGdpItems(),
          { icon: 'caveat', text: 'So the stress test’s zero is imposed, not a model outcome.' },
        ]}
      />
    ),
  },
  ss: {
    icon: 'limit',
    role: 'A bound, not a forecast',
    items: [{ icon: 'breakEven', text: `${HEADLINE_YEAR} GDP is held at the OBR-central path.` }, ...stressItems()],
    fixedText: stressFixedText(),
    // the chevron follows the central closure's sign, as the words do
    glyph: (fx(CENTRAL) ?? 0) < 0 ? <path d="M4 6 L12 14 L20 6" /> : <path d="M4 14 L12 6 L20 14" />,
    preview: 'The R4 secant, the OBR comparison',
    more: (
      <Items
        items={[
          { icon: 'equation', text: <>Z is solved by secant over full solves (&ldquo;R4&rdquo;).</> },
          { icon: 'breakEven', text: <>It stops when the {HEADLINE_YEAR} GDP gap is within 0.01pp of zero.</> },
          { icon: 'forecast', text: 'Named after the OBR’s March 2026 displacement scenario, GDP unchanged.' },
          { icon: 'limit', text: 'It matches the OBR only on GDP.' },
          { icon: 'compare', text: 'The OBR adjusts through jobs; OG-UK, with no unemployment, through the wage.' },
        ]}
      />
    ),
  },
};

function ArmCards() {
  return (
    <div className="card-grid mx-arms is-top">
      {ARMS.map((a) => {
        const t = ARM_TEXT[a.id];
        if (!t) return null;
        return (
          <InfoCard
            key={a.id}
            id={`arm-${a.id}`}
            icon={iconFor(t.icon)}
            title={a.label}
            className={`mx-card mx-arm mx-arm-${a.id}`}
            more={t.more}
            moreTitle="How Z is set"
            morePreview={t.preview}
          >
            <p className="mx-kicker">
              <IconText icon={a.id === 'ss' ? 'limit' : 'caveat'}>{t.role}</IconText>
            </p>
            <Items items={t.items} />
            <div className="mx-fixed" aria-label={`Output at fixed inputs: ${t.fixedText}`}>
              <svg viewBox="0 0 24 20" width="24" height="20" aria-hidden="true">
                <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {t.glyph}
                </g>
              </svg>
              <span>
                <span className="mx-fixed-label">Output at fixed inputs</span>
                <b>{t.fixedText}</b>
              </span>
            </div>
          </InfoCard>
        );
      })}
    </div>
  );
}


// The sub-sections, for a page's contents list
export const SCENARIO_SECTIONS = [
  { id: 's-scenarios', title: 'The scenarios', icon: iconFor('scenario') },
  { id: 'm-arms', title: 'Three arms per scenario', icon: iconFor('compare') },
  { id: 'm-timing', title: 'When it happens', icon: iconFor('timing') },
];

// A sub-section heading inside the section (h3), keeping the old anchor id
function SubHead({ id, oldId, icon, title, children }) {
  return (
    <div className="section-heading mx-subhead" id={id} tabIndex={-1}>
      <Icon name={iconFor(icon)} size={18} className="section-icon" />
      <div className="section-heading-text">
        <h3 id={oldId}>{title}</h3>
        {children ? <p>{children}</p> : null}
      </div>
    </div>
  );
}

// The short name of a source: the text before its first colon. The full
// derivation stays behind a disclosure, as a citation.
const srcName = (v) => v.split(/:\s/)[0].replace(/\s*\([^)]*\)/g, '');
const SRC_KEY = { tfp: ['productivity', 'Productivity'], labour_share: ['labour', 'Labour share'], both: ['compare', 'Both inputs'] };

export default function ScenariosSection({ uses = null }) {
  return (
    <section className="mx-scenarios">
      <SectionHeading id="m-scenarios" icon={iconFor('scenario')} title="Scenarios: inputs, arms and timing">
        <IconText icon="scenario">{`Each scenario is a fall in the labour share and a gain in output at fixed inputs, reached in ${HEADLINE_YEAR}.`}</IconText>
      </SectionHeading>
      {uses}
      <KeyFacts
        className="mx-facts-row"
        facts={[
          { icon: 'scenario', value: SCENARIOS.length, label: 'scenarios: three UK, one US upper case' },
          { icon: 'compare', value: ARMS.length, label: 'arms for each scenario' },
          { icon: 'start', value: FIRST_YEAR, label: 'one starting point' },
          { icon: 'shock', value: SURPRISE_YEAR, label: 'AI arrives as a surprise' },
        ]}
      />
      <SubHead id="s-scenarios" icon="scenario" title="The scenarios">
        <IconText icon="source">Each is a pair of inputs reached in {HEADLINE_YEAR}, taken from UK sources (and, for the upper case, US ones).</IconText>
      </SubHead>
      <Card
        id="scenario-map"
        icon={iconFor('scenario')}
        title={`Scenario inputs, ${HEADLINE_YEAR}`}
        unit={<IconText icon="measure">Labour-share fall (pp, downwards) against the gain in output at fixed inputs (%)</IconText>}
        download={{ title: `Scenario inputs, ${HEADLINE_YEAR}`, context: 'Inputs imposed in each run; sources on each scenario card', table: scenarioTable }}
      >
        <ScenarioMap caption={false} />
      </Card>
      <div className="card-grid mx-scen-grid">
        {SCENARIOS.map((s) => (
          <InfoCard
            key={s.id}
            id={`scen-${s.id}`}
            icon={iconFor(s.id === 'korinek' ? 'foreign' : 'scenario')}
            title={s.id === 'korinek' ? KORINEK_FULL : s.label}
            className={`mx-card mx-scen${s.id === 'korinek' ? ' is-upper' : ''}`}
            more={
              <ul className="mx-src-lines" data-cite="">
                {Object.entries(s.sources).map(([k, v]) => (
                  <li key={k}>
                    <Icon name={iconFor(SRC_KEY[k]?.[0] ?? 'source')} size={14} className="mx-dt-icon" />
                    <span>
                      <b>{SRC_KEY[k]?.[1] ?? k}:</b> {srcName(v)}
                    </span>
                  </li>
                ))}
                <li className="mx-src-derive">
                  <Disclosure inCard title={<IconText icon="arithmetic">The derivation</IconText>} preview="As read in each source">
                    <ul className="mx-src-full" data-cite="">
                      {Object.entries(s.sources).map(([k, v]) => (
                        <li key={k}>
                          <Icon name={iconFor('source')} size={14} className="mx-dt-icon" />
                          <span>{v}</span>
                        </li>
                      ))}
                    </ul>
                  </Disclosure>
                </li>
              </ul>
            }
            moreTitle="Sources and arithmetic"
            morePreview={s.id === 'korinek' ? 'Korinek et al., Table 3' : 'IMF UK, OBR FRS, BP9'}
          >
            <p className="mx-kicker">
              <IconText icon={s.id === 'korinek' ? 'foreign' : 'scenario'}>
                {s.id === 'uk_central' ? 'Headline scenario' : s.id === 'korinek' ? 'US inputs' : 'UK range'}
              </IconText>
            </p>
            <dl className="mx-pair">
              <div>
                <dt>Labour share</dt>
                <dd>
                  <Icon name={iconFor('labour')} size={16} className="mx-dt-icon" />
                  −{s.labour_share_fall_pp.toFixed(1)}pp</dd>
              </div>
              <div>
                <dt>Output at fixed inputs</dt>
                <dd>
                  <Icon name={iconFor('productivity')} size={16} className="mx-dt-icon" />
                  +{s.tfp_gain_pct.toFixed(1)}%</dd>
              </div>
            </dl>
            <p className="mx-sub">
              <IconText icon="capital">&gamma; reaches {s.gamma_terminal.toFixed(3)}.</IconText>
            </p>
          </InfoCard>
        ))}
      </div>
      <Items
        className="mx-foot-items"
        items={[
          { icon: 'arithmetic', text: <>Derivations: {ext(DOC('uk_calibration.md'), 'UK calibration note')}.</> },
          { icon: 'compare', text: <>Published figures are compared on <NavLink tab="method" sub="studies" anchor="numbers">Evidence</NavLink>.</> },
        ]}
      />

      <SubHead id="m-arms" oldId="s-arms" icon="compare" title="Three arms per scenario">
        <IconText icon="compare">The same labour-share fall in each. They differ in output at fixed inputs.</IconText>
      </SubHead>
      <ArmCards />

      <SubHead id="m-timing" oldId="s-timing" icon="timing" title="When it happens">
        <IconText icon="timing">One start in {FIRST_YEAR}, a surprise in {SURPRISE_YEAR}, full weight by {HEADLINE_YEAR}. The one home of the timing.</IconText>
      </SubHead>
      <Card
        id="timing"
        icon={iconFor('timing')}
        title={`The timing, ${YEARS[0]}–${LATE_YEAR}`}
        unit={<IconText icon="measure">Bars: weight of the change in γ and Z, from 0 (the OBR-central path) to 1 (full scenario)</IconText>}
        download={{ title: `The timing, ${YEARS[0]}–${LATE_YEAR}`, context: 'Ramp weight of the capital share γ and productivity Z', table: timelineTable, svg: timelineSvg, legend: () => [] }}
      >
        <Timeline caption={false} />
      </Card>
      <div className="card-grid">
        <InfoCard
          icon={iconFor('start')}
          title={`One starting point, ${FIRST_YEAR}`}
          className="mx-card"
          more={
            <Items
              items={[
                { icon: 'model', text: 'OG-Core always starts a run in the baseline’s first year.' },
                { icon: 'timing', text: 'So inputs are shifted two years.' },
                { icon: 'generations', text: <>The run inherits the {FIRST_YEAR} wealth, debt and population.</> },
                { icon: 'source', text: <>Details: {ext(DOC('surprise_2028.md'), 'design note')}.</> },
              ]}
            />
          }
          moreTitle="How the restart works"
          morePreview="Shifted inputs, inherited wealth"
        >
          <Items
            items={[
              { icon: 'start', text: <>2026 and {FIRST_YEAR} are identical in every scenario.</> },
              { icon: 'excluded', text: 'There is no anticipation.' },
            ]}
          />
        </InfoCard>
        <InfoCard
          icon={iconFor('shock')}
          title={`A surprise in ${SURPRISE_YEAR}`}
          className="mx-card"
          more={
            <Items
              items={[
                { icon: 'households', text: 'Households re-plan from the wealth they hold.' },
                { icon: 'caveat', text: <>The {SURPRISE_YEAR} gap is the news plus the ramp&rsquo;s first quarter.</> },
              ]}
            />
          }
          moreTitle="What the first year contains"
          morePreview="News plus the first ramp step"
        >
          <Items
            items={[
              { icon: 'excluded', text: <>Nobody expects AI before {SURPRISE_YEAR}.</> },
              { icon: 'path', text: 'From then on, everyone knows the whole path.' },
            ]}
          />
        </InfoCard>
        <InfoCard
          icon={iconFor('jump')}
          title={`The ${SURPRISE_YEAR} jump`}
          className="mx-card"
          id="m-jump"
          more={
            <Items
              items={[
                { icon: 'code', text: <>OG-Core 0.17 defines an adjustment cost (<code>firm.adj_cost</code>) but never calls it.</> },
                { icon: 'jump', text: 'So investment jumps for one year.' },
                { icon: 'caveat', text: 'It reflects frictionless capital, not a forecast of a boom.' },
              ]}
            />
          }
          moreTitle="Why there is a spike"
          morePreview="No adjustment costs in OG-Core 0.17"
        >
          <Items items={[{ icon: 'jump', text: 'No adjustment costs: investment and hours jump in the announcement year.' }]} />
        </InfoCard>
      </div>
    </section>
  );
}
