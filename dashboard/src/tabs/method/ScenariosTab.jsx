'use client';

import InfoCard from '@/components/ab/InfoCard.jsx';
import Card, { SectionHeading } from '@/components/ui/Card.jsx';
import PageIntro from '@/components/ui/PageIntro.jsx';
import OnThisPage from '@/components/ui/OnThisPage.jsx';
import Icon from '@/components/ab/Icon.jsx';
import { Items, KeyFacts } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';
import { SCENARIOS, KORINEK_FULL, CENTRAL, BOUND, SURPRISE_YEAR, HEADLINE_YEAR, FIRST_YEAR, LATE_YEAR, YEARS, ARMS, fixedInputVsTz, gap, signed } from '@/tabs/ai/surprise.js';
import { REPO } from '@/tabs/ai/links.js';
import { ext } from '../shared/ui.jsx';
import Timeline, { timelineTable, timelineSvg } from './Timeline.jsx';
import ScenarioMap, { scenarioTable } from './ScenarioMap.jsx';

// Scenarios: what is assumed. The four scenarios (three UK, one US upper
// case), the three arms each is run in, and the timing. How the model turns
// them into results is on Method; the results are on Results.

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
          { icon: 'onPath', text: 'No scenario has touched those inputs yet.' },
        ]}
      />
    ),
  },
  tz: {
    icon: 'compare',
    role: 'Shown beside the stress test',
    items: [
      { icon: 'capital', text: 'The same rise in the capital share.' },
      { icon: 'onPath', text: 'Output at fixed inputs unchanged.' },
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
    items: [{ icon: 'onPath', text: `${HEADLINE_YEAR} GDP is held at the OBR-central path.` }, ...stressItems()],
    fixedText: stressFixedText(),
    glyph: <path d="M4 6 L12 14 L20 6" />,
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
            <p className="mx-kicker">{t.role}</p>
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


const SECTIONS = [
  { id: 's-scenarios', title: 'The scenarios', icon: iconFor('scenario') },
  { id: 's-arms', title: 'Three arms per scenario', icon: iconFor('compare') },
  { id: 's-timing', title: 'When it happens', icon: iconFor('timing') },
];

export default function ScenariosTab() {
  return (
    <div className="page-with-contents mx-tab mx-method">
      <OnThisPage tab="method" sub="scenarios" sections={SECTIONS} label="Scenarios contents" />
      <div className="page-body">
      <PageIntro
        icon={iconFor('scenario')}
        question="What goes into each run?"
        answer={`Each scenario is a fall in the labour share and a gain in output at fixed inputs, reached in ${HEADLINE_YEAR}.`}
      >
        <KeyFacts
          className="mx-facts-row"
          facts={[
            { icon: 'scenario', value: SCENARIOS.length, label: 'scenarios: three UK, one US upper case' },
            { icon: 'compare', value: ARMS.length, label: 'arms for each scenario' },
            { icon: 'start', value: FIRST_YEAR, label: 'one starting point' },
            { icon: 'shock', value: SURPRISE_YEAR, label: 'AI arrives as a surprise' },
          ]}
        />
      </PageIntro>
      <SectionHeading id="s-scenarios" icon={iconFor('scenario')} title="The scenarios">
        Each is a pair of inputs reached in {HEADLINE_YEAR}, taken from UK sources (and, for the upper case, US ones).
      </SectionHeading>
      <Card
        id="scenario-map"
        icon={iconFor('scenario')}
        title={`Scenario inputs, ${HEADLINE_YEAR}`}
        unit="Labour-share fall (pp, downwards) against the gain in output at fixed inputs (%)"
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
              <dl className="mx-facts">
                {Object.entries(s.sources).map(([k, v]) => (
                  <div key={k}>
                    <dt>{k === 'tfp' ? 'Productivity' : k === 'labour_share' ? 'Labour share' : 'Both inputs'}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            }
            moreTitle="Sources and arithmetic"
            morePreview={s.id === 'korinek' ? 'Korinek et al., Table 3' : 'IMF UK, OBR FRS, BP9'}
          >
            <p className="mx-kicker">
              {s.id === 'uk_central' ? 'Headline scenario' : s.id === 'korinek' ? 'US inputs' : 'UK range'}
            </p>
            <dl className="mx-pair">
              <div>
                <dt>
                  <Icon name={iconFor('labour')} size={14} className="mx-dt-icon" />
                  Labour share
                </dt>
                <dd>−{s.labour_share_fall_pp.toFixed(1)}pp</dd>
              </div>
              <div>
                <dt>
                  <Icon name={iconFor('productivity')} size={14} className="mx-dt-icon" />
                  Output at fixed inputs
                </dt>
                <dd>+{s.tfp_gain_pct.toFixed(1)}%</dd>
              </div>
            </dl>
            <p className="mx-sub">&gamma; reaches {s.gamma_terminal.toFixed(3)}.</p>
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

      <SectionHeading id="s-arms" icon={iconFor('compare')} title="Three arms per scenario">
        The same labour-share fall in each. They differ in output at fixed inputs.
      </SectionHeading>
      <ArmCards />

      <SectionHeading id="s-timing" icon={iconFor('timing')} title="When it happens">
        One start in {FIRST_YEAR}, a surprise in {SURPRISE_YEAR}, full weight by {HEADLINE_YEAR}. This is the one home of the timing; Method links here.
      </SectionHeading>
      <Card
        id="timing"
        icon={iconFor('timing')}
        title={`The timing, ${YEARS[0]}–${LATE_YEAR}`}
        unit="Bars: weight of the change in γ and Z, from 0 (the OBR-central path) to 1 (full scenario)"
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
              { icon: 'onPath', text: <>2026 and {FIRST_YEAR} are identical in every scenario.</> },
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
      </div>
    </div>
  );
}
