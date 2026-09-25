'use client';

const Y = ({ children }) => <span className="mark-yes">{children}</span>;
const N = ({ children }) => <span className="mark-no">{children}</span>;
const P = ({ children }) => <span className="mark-partial">{children}</span>;

export default function ModelComparisonPanel() {
  return (
    <>
      <div className="section-card">
        <div className="obr-head">
          <h3>Model comparison — what each one can represent</h3>
        </div>
        <div className="results-note lead">
          <b>The OG-UK column describes the model as run here: 1 sector, &epsilon; = 1.</b> The 8-sector
          ONS build exists and carries the demand-composition channel, but it is not used for any number in
          this dashboard, and its transition diverges past t&asymp;7.
        </div>
        <table className="comparison-table cols-5">
          <thead>
            <tr>
              <th style={{ width: '23%' }}>Channel</th>
              <th>
                Anthropic
                <span className="th-sub">Korinek et al. 2026</span>
              </th>
              <th>
                Moll &amp; Imas
                <span className="th-sub">Sept 2026</span>
              </th>
              <th>
                OBR
                <span className="th-sub">EFO Mar 2026</span>
              </th>
              <th>
                OG-UK
                <span className="th-sub">this work</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <b>Automation</b>
                <span className="cell-sub">tasks move labour&rarr;capital</span>
              </td>
              <td>
                <Y>yes</Y> <code>k</code> 0.50/0.75/0.90 held constant; affected mass &kappa; ramps
                0.14&rarr;0.53
              </td>
              <td>
                <Y>yes — the core</Y> &alpha; from &#8531; &rarr; 1 by 2045
              </td>
              <td>
                <Y>yes</Y> asserted, not derived: &ldquo;substitute for labour, increasing capital
                deepening&rdquo;
              </td>
              <td>
                <Y>yes</Y> <code>gamma</code>, ramped — needs a patch, OG-Core has no time dimension on
                it
              </td>
            </tr>
            <tr>
              <td>
                <b>Augmentation</b>
                <span className="cell-sub">productivity, no displacement</span>
              </td>
              <td>
                <Y>yes</Y> the <code>1&minus;k</code> share
              </td>
              <td>
                <N>no</N> pure automation
              </td>
              <td>
                <Y>yes</Y> &ldquo;raising productivity for workers who remain&rdquo;
              </td>
              <td>
                <Y>yes</Y> <code>Z</code>, time-varying
              </td>
            </tr>
            <tr>
              <td>
                <b>Adoption / diffusion</b>
              </td>
              <td>
                <Y>yes</Y> &alpha; 0.10&rarr;0.20/0.40/0.6
              </td>
              <td><N>no</N></td>
              <td><N>no</N></td>
              <td>
                <N>no</N> folded into <code>Z</code>
              </td>
            </tr>
            <tr>
              <td>
                <b>Task reinstatement</b>
                <span className="cell-sub">new human tasks created</span>
              </td>
              <td>
                <Y>yes</Y> <code>d</code> 0.50/0.25/0
              </td>
              <td><N>no</N></td>
              <td><N>no</N></td>
              <td><N>no</N></td>
            </tr>
            <tr>
              <td>
                <b>Unemployment / search</b>
              </td>
              <td>
                <Y>yes</Y> matching, search discount &ell;, posting speed
              </td>
              <td>
                <N>no</N> Solow, no labour market
              </td>
              <td>
                <Y>yes</Y> equilibrium rate to 5.5%
              </td>
              <td>
                <N>no</N> <b>the binding gap</b>
              </td>
            </tr>
            <tr>
              <td>
                <b>Capital accumulation</b>
              </td>
              <td>
                <Y>yes</Y> supply elasticity 3
              </td>
              <td>
                <Y>yes</Y> Solow, fixed or endogenous saving
              </td>
              <td>
                <Y>yes</Y> forecast, not modelled here
              </td>
              <td>
                <Y>yes</Y> <b>OLG endogenous saving</b>
              </td>
            </tr>
            <tr>
              <td>
                <b>Factor shares</b>
              </td>
              <td>
                <Y>yes</Y> 60&cent;&rarr;45.2&cent; endogenous
              </td>
              <td>
                <Y>yes</Y> labour share &rarr; 0 in the limit
              </td>
              <td>
                <Y>yes</Y> asserted &ldquo;lower labour share, higher profit share&rdquo;
              </td>
              <td>
                <Y>yes</Y> via <code>gamma</code>; exact at &epsilon;=1
              </td>
            </tr>
            <tr>
              <td>
                <b>Worker heterogeneity</b>
              </td>
              <td>
                <P>partial</P> 2 groups, one wage each
              </td>
              <td>
                <N>no</N> representative agent
              </td>
              <td><N>no</N></td>
              <td>
                <Y>yes</Y> <code>e[t,s,j]</code> — 7 types &times; 80 ages
              </td>
            </tr>
            <tr>
              <td>
                <b>Demand composition</b>
                <span className="cell-sub">spending shifts between goods</span>
              </td>
              <td>
                <N>no</N> one good
              </td>
              <td>
                <P>their key critique</P> argued, not modelled
              </td>
              <td><N>no</N></td>
              <td>
                <N>no — as run</N> these results are <b>1-sector</b>. OG-UK <i>can</i> do 8 ONS sectors
                with relative prices, but that build is not used here, so this channel is absent from
                every number in this dashboard.
              </td>
            </tr>
            <tr>
              <td>
                <b>Fiscal / tax system</b>
              </td>
              <td><N>no</N></td>
              <td><N>no</N></td>
              <td>
                <Y>yes</Y> full UK public finances
              </td>
              <td>
                <Y>yes</Y> PolicyEngine UK tax functions
              </td>
            </tr>
            <tr>
              <td>
                <b>Cohorts / demographics</b>
              </td>
              <td>
                <N>no</N> no age dimension
              </td>
              <td><N>no</N></td>
              <td>
                <Y>yes</Y> ONS population
              </td>
              <td>
                <Y>yes</Y> OLG, S=80, ONS path
              </td>
            </tr>
            <tr>
              <td>
                <b>Ideas / R&amp;D</b>
              </td>
              <td>
                <Y>yes</Y> ideas stock
              </td>
              <td>
                <Y>yes</Y> in the extension
              </td>
              <td><N>no</N></td>
              <td><N>no</N></td>
            </tr>
            <tr>
              <td>
                <b>Elasticity &epsilon;</b>
              </td>
              <td>0.5 assumed, task-based CES</td>
              <td>
                <b>argues 0.2</b>
              </td>
              <td>n/a — not a structural model</td>
              <td>
                <b>1.0 as run.</b> At Cobb-Douglas the labour share is exactly 1&minus;&gamma;, so the
                &minus;3.9pp target is hit by algebra. The 8-sector build has 0.4&ndash;1.3 per sector
                but is not used here.
              </td>
            </tr>
            <tr>
              <td>
                <b>Model class</b>
              </td>
              <td>task-based, 2 occupations, frictional labour market, US, to 2030</td>
              <td>souped-up Solow, representative agent, to 2045</td>
              <td>
                <b>not a structural model</b> — a scenario layered on their forecast
              </td>
              <td>
                OLG general equilibrium, UK, tax system. <b>Run here at 1 sector</b>; an 8-sector build
                exists but diverges past t&asymp;7.
              </td>
            </tr>
          </tbody>
        </table>

        <div className="results-note">
          <b>We collapse their six AI channels into two.</b> <code>Z</code> absorbs capability, adoption
          and productivity together — there are no tasks to count separately — and <code>gamma</code> is
          their automation share. Reinstatement and search have no home at all.
        </div>
        <div className="results-note">
          <b>Does the OBR have a model for this?</b> Not for the AI scenario. They <i>do</i> have an OLG
          model — <b>Working Paper No. 22, <i>A new UK overlapping generations model</i></b> (April
          2025), the same class as OG-UK — but the March 2026 EFO AI scenarios are{' '}
          <b>assumptions layered on their central forecast</b>, not output from it: they state the
          labour-share and unemployment outcomes rather than deriving them. That is why their case is
          easy to impose here and impossible to falsify against their own machinery.
        </div>
        <div className="results-note">
          <b>The complementarity.</b> OG-UK is weakest exactly where Anthropic is strongest (adoption,
          reinstatement, unemployment) and strongest where all three are absent (households, cohorts, a
          real tax code). So this model owns <b>growth and factor shares</b>; PolicyEngine owns{' '}
          <b>who bears it</b>.
        </div>
      </div>
    </>
  );
}
