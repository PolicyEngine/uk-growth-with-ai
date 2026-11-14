'use client';

import InfoCard from '@/components/ab/InfoCard.jsx';
import { SectionHeading } from '@/components/ui/Card.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { SCENARIOS, KORINEK_FULL, CENTRAL, BOUND, SURPRISE_YEAR, HEADLINE_YEAR, FIRST_YEAR, ARMS, fixedInputVsTz, gap, signed } from '@/tabs/ai/surprise.js';
import { REPO } from '@/tabs/ai/links.js';
import { ext } from '../shared/ui.jsx';
import Timeline from './Timeline.jsx';
import ScenarioMap from './ScenarioMap.jsx';

// Scenarios: what is assumed. The four scenarios (three UK, one US upper
// case), the three arms each is run in, and the timing. How the model turns
// them into results is on Method; the results are on Results.

const DOC = (p) => `${REPO}/blob/rerun/surprise-2028/docs/${p}`;

// The stress test's technology change, from the solves (UK central), per
// closure: a cut under the central closure, a slight rise with closed
// capital (results sanity audit, #39). Words follow the signs.
const REF_SID = 'uk_central';
const fx = (cl) => fixedInputVsTz(REF_SID, 'ss', cl);
const move = (x) => (x == null ? null : x < 0 ? `fall (UK central: ${signed(x, 2)}%)` : `rise slightly (UK central: ${signed(x, 2)}%)`);
function stressLine() {
  const c = move(fx(CENTRAL));
  const b = move(fx(BOUND));
  const parts = [];
  if (c) parts.push(`Under the central closure that needs output at fixed inputs to ${c}, against technology unchanged.`);
  if (b) parts.push(`With closed capital it needs them to ${b}, so it almost coincides with technology unchanged.`);
  return parts.join(' ');
}
function stressFixedText() {
  const c = fx(CENTRAL);
  const b = fx(BOUND);
  const w = (x) => (x == null ? 'pending' : x < 0 ? 'falls' : 'rises slightly');
  return `Central closure: ${w(c)}; closed capital: ${w(b)}`;
}
function tzGdpLine() {
  const c = gap(REF_SID, 'tz', CENTRAL, 'Y');
  const b = gap(REF_SID, 'tz', BOUND, 'Y');
  const w = (x) => (x == null ? 'is pending' : Math.abs(x) < 0.005 ? 'is unchanged' : x > 0 ? 'rises a little as capital deepens' : 'ends slightly below the OBR-central path');
  return `In UK central, GDP ${w(c)} under the central closure and ${w(b)} with closed capital. So the stress test’s zero is imposed, not a model outcome.`;
}

const ARM_TEXT = {
  tfp: {
    icon: 'trend',
    role: 'Main result',
    line: 'The capital share rises, and output at fixed inputs rises by the scenario’s gain.',
    fixedText: 'Rises by the scenario’s gain',
    glyph: <path d="M4 14 L12 6 L20 14" />,
    preview: 'Anchored at the starting year',
    more: (
      <>
        <p>Z is solved jointly with &gamma;.</p>
        <p>
          The gain is measured at the baseline&rsquo;s {FIRST_YEAR} capital and labour. No scenario has touched those
          inputs yet.
        </p>
      </>
    ),
  },
  tz: {
    icon: 'scale',
    role: 'Shown beside the stress test',
    line: 'The same rise in the capital share, with output at fixed inputs unchanged.',
    fixedText: 'Unchanged',
    glyph: <path d="M4 10 H20" />,
    preview: 'Why it is shown',
    more: (
      <>
        <p>Income moves from labour to capital, with no productivity gain.</p>
        <p>{tzGdpLine()}</p>
      </>
    ),
  },
  ss: {
    icon: 'alert',
    role: 'A bound, not a forecast',
    line: `${HEADLINE_YEAR} GDP is held at the OBR-central path. ${stressLine()}`,
    fixedText: stressFixedText(),
    glyph: <path d="M4 6 L12 14 L20 6" />,
    preview: 'The R4 secant, the OBR comparison',
    more: (
      <>
        <p>
          Z is solved by secant over full solves (&ldquo;R4&rdquo;). It stops when the {HEADLINE_YEAR} GDP gap is
          within 0.01pp of zero.
        </p>
        <p>It is named after the OBR&rsquo;s March 2026 displacement scenario, where GDP is unchanged.</p>
        <p>It matches the OBR only on GDP. The OBR adjusts through jobs; OG-UK, with no unemployment, through the wage.</p>
      </>
    ),
  },
};

function ArmCards() {
  return (
    <div className="card-grid mx-arms">
      {ARMS.map((a) => {
        const t = ARM_TEXT[a.id];
        if (!t) return null;
        return (
          <InfoCard
            key={a.id}
            id={`arm-${a.id}`}
            icon={t.icon}
            title={a.label}
            className={`mx-card mx-arm mx-arm-${a.id}`}
            more={t.more}
            moreTitle="How Z is set"
            morePreview={t.preview}
          >
            <p className="mx-kicker">{t.role}</p>
            <p>{t.line}</p>
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


export default function ScenariosTab() {
  return (
    <div className="mx-tab mx-method">
      <SectionHeading id="s-scenarios" icon="target" title="The scenarios">
        Three UK scenarios and a US upper case. Each is a pair of inputs reached in {HEADLINE_YEAR}: a fall in the labour share and a gain in output at fixed inputs.
      </SectionHeading>
      <div className="info-card mx-card mx-figure">
        <ScenarioMap />
      </div>
      <div className="card-grid mx-scen-grid">
        {SCENARIOS.map((s) => (
          <InfoCard
            key={s.id}
            id={`scen-${s.id}`}
            icon={s.id === 'korinek' ? 'globe' : 'landmark'}
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
                <dt>Labour share</dt>
                <dd>−{s.labour_share_fall_pp.toFixed(1)}pp</dd>
              </div>
              <div>
                <dt>Output at fixed inputs</dt>
                <dd>+{s.tfp_gain_pct.toFixed(1)}%</dd>
              </div>
            </dl>
            <p className="mx-sub">&gamma; reaches {s.gamma_terminal.toFixed(3)}.</p>
          </InfoCard>
        ))}
      </div>
      <p className="mx-foot">
        Derivations: {ext(DOC('uk_calibration.md'), 'UK calibration note')}. Published figures are compared on{' '}
        <NavLink tab="studies" sub="numbers">Other studies</NavLink>.
      </p>

      <SectionHeading id="s-arms" icon="shuffle" title="Three arms per scenario">
        The same labour-share fall in each. They differ in output at fixed inputs.
      </SectionHeading>
      <ArmCards />

      <SectionHeading id="s-timing" icon="calendar" title="When it happens">
        One start in {FIRST_YEAR}, a surprise in {SURPRISE_YEAR}, full weight by {HEADLINE_YEAR}.
      </SectionHeading>
      <div className="info-card mx-card mx-figure">
        <Timeline />
      </div>
      <div className="card-grid">
        <InfoCard
          icon="flag"
          title={`One starting point, ${FIRST_YEAR}`}
          className="mx-card"
          more={
            <>
              <p>OG-Core always starts a run in the baseline&rsquo;s first year.</p>
              <p>So inputs are shifted two years, and the run inherits the {FIRST_YEAR} wealth, debt and population.</p>
              <p>Details: {ext(DOC('surprise_2028.md'), 'design note')}.</p>
            </>
          }
          moreTitle="How the restart works"
          morePreview="Shifted inputs, inherited wealth"
        >
          <p>2026 and {FIRST_YEAR} are identical in every scenario. There is no anticipation.</p>
        </InfoCard>
        <InfoCard
          icon="zap"
          title={`A surprise in ${SURPRISE_YEAR}`}
          className="mx-card"
          more={
            <>
              <p>Households re-plan from the wealth they hold.</p>
              <p>The {SURPRISE_YEAR} gap is the news plus the ramp&rsquo;s first quarter, not news alone.</p>
            </>
          }
          moreTitle="What the first year contains"
          morePreview="News plus the first ramp step"
        >
          <p>Nobody expects AI before {SURPRISE_YEAR}. From then on, everyone knows the whole path.</p>
        </InfoCard>
        <InfoCard
          icon="construction"
          title={`The ${SURPRISE_YEAR} jump`}
          className="mx-card"
          id="m-jump"
          more={
            <>
              <p>OG-Core 0.17 defines an adjustment cost (<code>firm.adj_cost</code>) but never calls it.</p>
              <p>So investment jumps for one year. It reflects frictionless capital, not a forecast of a boom.</p>
            </>
          }
          moreTitle="Why there is a spike"
          morePreview="No adjustment costs in OG-Core 0.17"
        >
          <p>With no adjustment costs, investment and hours jump in the announcement year.</p>
        </InfoCard>
      </div>
    </div>
  );
}
