'use client';

import { useRef } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { TipTarget } from '@/components/ab/Tip.jsx';
import Card, { SectionHeading, IconLine, cardSources } from '@/components/ui/Card.jsx';
import Finding from '@/components/ui/Finding.jsx';
import SourceLine from '@/components/ui/SourceLine.jsx';
import DownloadMenu from '@/components/ui/DownloadMenu.jsx';
import { useNav, NavLink } from '@/lib/nav.jsx';
import { ruleLabel, closureLabel } from '@/lib/labels.js';
import { CHART_COLOURS } from '@/lib/chartTheme.js';
import { esc } from '@/lib/download.js';
import {
  S,
  YEARS, HEADLINE_YEAR, LATE_YEAR, FIRST_YEAR, SURPRISE_YEAR, CENTRAL, BOUND, CLOSURES, SCENARIOS, ARMS, CLOSURE_LABEL, resultAt, ruleSolved, scenarioById, gap, signed, fmt, SCEN_NAME, PENDING,
} from '@/tabs/ai/surprise.js';
import { closuresFor, contextLine, side, primaryClosure } from '@/tabs/ai/lines.js';
import { PathCard } from '@/tabs/ai/ResultsTab.jsx';
import { Items } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import { dirConcept, Lead } from '@/tabs/explore/direction.jsx';
import { ext } from '@/tabs/shared/ui.jsx';
import { SOURCES as LIT } from '@/data/literature.js';
import { URLS, atRef, efo, EFO_PAGE, OG_RESULT_URLS } from '@/tabs/ai/links.js';
import { debtDipIsDenominator, debtSidesByRule, signHeading } from '@/tabs/explore/caveats.js';
import AIS from '@/data/aiScenarios.json';

// OG-UK's world interest rate, the run's closure settings (aiScenarios.json).
const WORLD_RATE = AIS.assum?.closure?.world_int_rate_annual;
import { sourcesItems } from '@/tabs/explore/sources.jsx';
import { docItem, navItem } from '@/lib/sourceItems.js';
import { NICS, SET } from '@/lib/dataKeys.js';
import { AxisTitles } from '@/tabs/explore/axes.jsx';
import { debtTitle, taxTitle, debtMoreInfo, taxMoreInfo } from '@/tabs/ai/financesInfo.js';

// Results > Public finances: debt/GDP to the debt rule's first year,
// tax/GDP, why both are likely understated, and how the result changes with
// the fiscal rule. Every number from surprise2028.json through surprise.js;
// this is the one home of the tax/GDP and debt/GDP figures.

const LONG_YEARS = YEARS.filter((y) => y >= FIRST_YEAR && y <= LATE_YEAR);
const SHORT_YEARS = YEARS.filter((y) => y >= FIRST_YEAR && y <= HEADLINE_YEAR);
// Debt/GDP in the debt rule's first year with debt repriced at the speed the
// OBR assumes for UK debt (common fiscal rule): debt_gdp_pp_obr_repricing_late,
// built by analysis/surprise/build_dashboard_data.py with the method and
// constants of PR #43 (docs/debt_repricing.md) and paper/make_values.py.
// Over every solved scenario, arm and closure (24 cells): the cells
// (scenario|closure) whose main arm ends below the path at that speed while
// the model's own figure is above it, and, where both are above, the
// repriced rise as a share of the model's, as a [min, max] percentage.
const REPRICED = CLOSURES.flatMap((cl) =>
  SCENARIOS.flatMap((s) =>
    ARMS.map((a) => ({ sid: s.id, arm: a.id, cl, r: resultAt(s.id, a.id, cl, 'common') }))
      .filter((c) => c.r.status === 'done')
      .map((c) => ({ ...c, model: c.r.gaps.debt_gdp_pp[YEARS.indexOf(LATE_YEAR)], obr: c.r.debt_gdp_pp_obr_repricing_late })),
  ),
);
const BELOW_AT_OBR_SPEED = new Set(REPRICED.filter((c) => c.arm === 'tfp' && c.model > 0 && c.obr < 0).map((c) => `${c.sid}|${c.cl}`));
const obrLate = (sid, cl) => REPRICED.find((c) => c.sid === sid && c.cl === cl && c.arm === 'tfp')?.obr ?? null;
const REPRICE_RATIOS = REPRICED.filter((c) => c.model > 0 && c.obr > 0).map((c) => (c.obr / c.model) * 100);
export const REPRICE_RANGE = [Math.min(...REPRICE_RATIOS), Math.max(...REPRICE_RATIOS)];

// The main arm's debt/GDP in words, by sign, for the closure in view, with
// an arrow beside each side that follows the same sign. No claim about every
// arm: the lines and their end values show each one. Returns the parts, so
// the test can check every arrow against the data.
export function debtParts(sid, closure, rule) {
  const cl = closure === 'closed' ? BOUND : CENTRAL;
  const a = gap(sid, 'tfp', cl, 'debt_gdp_pp', HEADLINE_YEAR, rule);
  const b = gap(sid, 'tfp', cl, 'debt_gdp_pp', LATE_YEAR, rule);
  if (a == null || b == null) return null;
  const lead = `Automation + productivity${closure === 'closed' ? ', no foreign capital' : ''}:`;
  if (rule === 'dn') {
    const first = gap(sid, 'tfp', cl, 'debt_gdp_pp', SURPRISE_YEAR, rule);
    return { kind: 'dn', lead, first: first == null || side(first) === 'on' ? null : first, late: b };
  }
  const obr = rule === 'common' && BELOW_AT_OBR_SPEED.has(`${sid}|${cl}`) && side(b) === 'above' ? obrLate(sid, cl) : null;
  return { kind: 'rule', lead, a, b, obr };
}

// Economics review, round 1 (explore/caveats.js): why debt/GDP first dips,
// how its late-year sign moves with the fiscal rule and repricing, and the
// gilt rate. Each item is gated on the data for the scenario and closure in
// view; none under the debt-neutral rule, which holds debt on the path.
const RULE_WORD = { common: 'common rule', obr: 'OBR repricing', fixed: 'fixed spending' };
export function debtReviewItems(sid, closure, rule) {
  if (rule === 'dn') return [];
  const cl = closure === 'closed' ? BOUND : CENTRAL;
  const sides = debtSidesByRule(sid, cl);
  const head = signHeading(sides);
  const split = head != null;
  return [
    debtDipIsDenominator(sid, cl, rule) ? { key: 'dip', icon: 'gdp', text: `The ${SURPRISE_YEAR} dip is GDP rising on a debt stock already set` } : null,
    // review round 3, R3-19: repricing is not a rule
    split ? { key: 'sign', icon: 'rule', text: `Its ${LATE_YEAR} sign, by budget assumption and repricing speed:` } : null,
    split ? { key: 'sides', icon: 'compare', text: sides.map((x) => `${RULE_WORD[x.key]}: ${x.side}`).join('; ').replace(/^./, (c) => c.toUpperCase()) } : null,
    rule === 'common' ? { key: 'dividend', icon: 'gdp', text: 'Common rule: spending grows with GDP, so growth brings no dividend' } : null,
    { key: 'gilt', icon: 'interest', text: <>Gilt yields rise {ext(OG_RESULT_URLS.giltRate, 'one for one')} with the return on capital</> },
    typeof WORLD_RATE === 'number' ? { key: 'world', icon: 'foreign', text: `The world interest rate stays fixed at ${Math.round(WORLD_RATE * 100)}%` } : null,
  ].filter(Boolean);
}

function debtNotes(p) {
  if (!p || p.kind === 'dn') return null;
  // the "reprices at once" note is said once, in Caveats (review round 3,
  // R3-10)
  return p.obr != null ? [{ key: 'obr', icon: dirConcept(p.obr), text: `At the OBR’s repricing speed it ends ${side(p.obr)} the forecast path` }] : null;
}

// Tax/GDP with no foreign capital in the main arm, in words (results sanity
// audit A6): it can rise, so the model's sign there is not reliable.
// { text, flips }: `flips` when the headline-year sign changes (review
// round 2, R2-18: "rises by 2031" read as "rises by [an amount]").
function closedTaxWords(sid, rule) {
  const r = resultAt(sid, 'tfp', BOUND, rule);
  if (r.status !== 'done') return null;
  const atYear = (y) => r.gaps.tax_gdp_pp[YEARS.indexOf(y)];
  if (atYear(HEADLINE_YEAR) > 0) return { text: `is above the path in ${HEADLINE_YEAR}`, flips: true };
  const first = YEARS.find((y) => y > HEADLINE_YEAR && y < LATE_YEAR && atYear(y) > 0);
  if (first) return { text: `near zero in ${HEADLINE_YEAR}, positive from ${first}`, flips: false };
  return { text: 'falls far less than with some foreign capital', flips: false };
}

// The OBR's labour-minus-capital effective-rate gap, pp: FRS July 2026 Box
// 4.1 (46% - 27% = 19pp) and EFO Nov 2025 para 2.64 (40% - 17% = 23pp). Each
// pp of income moved from labour to capital lowers revenue by about this many
// hundredths of a pp of GDP (docs/red_flags_1_3.md).
const OBR_PER_PP = [0.19, 0.23];

function Cause({ icon, title, axis, ours, theirs, effect, up }) {
  const pct = (x) => `${((x / axis.max) * 100).toFixed(2)}%`;
  const edge = (x) => (x / axis.max > 0.8 ? ' at-end' : x / axis.max < 0.2 ? ' at-start' : '');
  // a lower label right of centre ends at its mark on phones (ph-end), so a
  // long name ("PolicyEngine UK {year} average") stays inside the card at
  // the 13px floor (checks-c0.md, 390px)
  const below = (x) => `${edge(x)}${x / axis.max > 0.6 && x / axis.max <= 0.8 ? ' ph-end' : ''}`;
  return (
    <div className="cause-row">
      <div className="cause-main">
        <div className="taxgap-label">
          <Icon name={icon} size={16} />
          <span>{title}</span>
        </div>
        <div className="cause-axis">
          <span className="cause-track" aria-hidden="true" />
          {theirs.lo != null ? (
            <TipTarget className="cause-range" style={{ left: pct(theirs.lo), width: pct(theirs.hi - theirs.lo) }} label={`${theirs.name}: ${theirs.text}`} tip={<><b>{theirs.name}</b><span className="tip-value">{theirs.text}</span></>}>
              <span className={`cause-mark-label is-below${below((theirs.lo + theirs.hi) / 2)}`}>{theirs.name} {theirs.text}</span>
            </TipTarget>
          ) : (
            <TipTarget className="cause-mark is-theirs" style={{ left: pct(theirs.value) }} label={`${theirs.name}: ${theirs.text}`} tip={<><b>{theirs.name}</b><span className="tip-value">{theirs.text}</span></>}>
              <span className={`cause-mark-label is-below${below(theirs.value)}`}>{theirs.name} {theirs.text}</span>
            </TipTarget>
          )}{' '}
          <TipTarget className="cause-mark is-ours" style={{ left: pct(ours.value) }} label={`Macro model: ${ours.text}`} tip={<><b>Macro model</b><span className="tip-value">{ours.text}</span></>}>
            <span className={`cause-mark-label${edge(ours.value)}`}>Macro model {ours.text}</span>
          </TipTarget>{' '}
          <span className="cause-ticks" aria-hidden="true" data-axis="">
            <span>0</span>{' '}
            <span>{axis.label}</span>
          </span>
        </div>
      </div>
      {/* icon + text, no box; the arrow follows the comparison (up) */}
      <IconLine icon={up ? 'arrowUp' : 'arrowDown'} className={`cause-effect${up ? ' is-main' : ''}`}>
        {effect}
      </IconLine>
    </div>
  );
}

// OG-UK's labour vs capital effective tax-rate gap on the forecast path in
// the headline year, some foreign capital (the sanity gate's effective rates, as
// the paper's EffWedgePp): labour incl. employer NICs less gross capital.
const ETR = S.closures[CENTRAL].reference_effective_tax_rates;
const TAX_GAP = ETR.labour - ETR.capital_gross;
// Employer NICs on one basis, % of earnings (analysis/nics/nics_2028.json,
// copied to tabs/explore/nics2028.json): OG-UK's flat tau_payroll (its
// default, the 15% main rate HMRC sets above the secondary threshold) and
// PolicyEngine UK's 2028 microsimulation average.
const NIC_OGUK = NICS.oguk_tau_payroll * 100;
const NIC_PE = NICS.avg_employer_rate_on_employment_income * 100;
const EFO_NOV25 = 'https://obr.uk/efo/economic-and-fiscal-outlook-november-2025/';
const NICS_URL = atRef(SET.nicsRef, SET.nicsPath);
const RED_FLAGS_URL = atRef('bf5de33', 'docs/red_flags_1_3.md');
// The two rows of the tax card, as drawn and as downloaded
const CAUSES = [
  { title: 'Labour vs capital tax-rate gap', max: 25, unit: 'pp', ours: TAX_GAP, oursText: `${TAX_GAP.toFixed(1)}pp`, theirs: 'OBR rates, differenced', lo: 19, hi: 23, theirsText: '19–23pp', effect: 'Understates the revenue fall (main effect)' },
  { title: 'Employer National Insurance, % of earnings', max: 16, unit: '% of earnings', ours: NIC_OGUK, oursText: `flat ${Math.round(NIC_OGUK)}%`, theirs: `PolicyEngine UK ${NICS.year} average`, value: NIC_PE, theirsText: `${NIC_PE.toFixed(1)}%`, effect: 'Partly offsets the first row (smaller)' },
];
// OG-UK's figure below the comparison: the model's revenue fall is too
// small (the first row's main effect); above it, the row partly offsets.
export const understates = (c) => c.ours < (c.lo ?? c.value);
function causesSvg() {
  const C = CHART_COLOURS;
  const W = 720;
  const x0 = 10;
  const x1 = W - 10;
  let out = '';
  let y = 0;
  for (const c of CAUSES) {
    const X = (v) => x0 + (v / c.max) * (x1 - x0);
    out += `<text x="0" y="${y + 14}" font-size="13" font-weight="600" fill="${C.ink}">${esc(c.title)}</text>`;
    const ty = y + 44;
    out += `<line x1="${x0}" x2="${x1}" y1="${ty}" y2="${ty}" stroke="${C.axis}"/>`;
    if (c.lo != null) out += `<rect x="${X(c.lo)}" y="${ty - 5}" width="${X(c.hi) - X(c.lo)}" height="10" fill="${C.muted}" opacity="0.5"/>`;
    else out += `<circle cx="${X(c.value)}" cy="${ty}" r="6" fill="${C.surface}" stroke="${C.muted}" stroke-width="2"/>`;
    const tx = c.lo != null ? (X(c.lo) + X(c.hi)) / 2 : X(c.value);
    out += `<text x="${tx}" y="${ty + 22}" font-size="11" text-anchor="middle" fill="${C.axisTitle}">${esc(`${c.theirs} ${c.theirsText}`)}</text>`;
    out += `<circle cx="${X(c.ours)}" cy="${ty}" r="6" fill="${C.ours}"/>`;
    out += `<text x="${X(c.ours)}" y="${ty - 12}" font-size="11" font-weight="600" text-anchor="middle" fill="${C.ink}">${esc(`Macro model ${c.oursText}`)}</text>`;
    out += `<text x="${x0}" y="${ty + 40}" font-size="11" fill="${C.tick}">0</text><text x="${x1}" y="${ty + 40}" font-size="11" text-anchor="end" fill="${C.tick}">${esc(`${c.max}${c.unit === 'pp' ? 'pp' : ` ${c.unit}`}`)}</text>`;
    out += `<text x="0" y="${ty + 62}" font-size="12" fill="${C.ink}">${esc(c.effect)}</text>`;
    y = ty + 84;
  }
  return { w: W, h: y, markup: out };
}

export const TAX_TITLE = 'The macro model’s revenue fall is smaller than OBR tax rates imply';

// Highlight the main arm's 2031 end point on the Tax/GDP chart while the
// link is hovered or focused (the figure's one home is that end label).
const flag = (on) => () => document.getElementById('tax-gdp')?.classList.toggle('ex-flag', on);

// The model's tax/GDP gap and the rough UK-rates range on one pp axis. The
// model's central figure prints here only when the chart shows closed
// capital; otherwise a link points at (and highlights) the chart's end label.
function TaxStrip({ model, uk, onChart }) {
  const xs = [0, ...(uk ?? []), ...(model == null ? [] : [model])];
  const lo = Math.min(...xs) * 1.25;
  const pos = (x) => `${(((x - lo) / (0 - lo)) * 100).toFixed(2)}%`;
  const ticks = [];
  const step = Math.abs(lo) > 0.6 ? 0.2 : 0.1;
  for (let t = 0; t >= lo; t -= step) ticks.push(Math.round(t * 100) / 100);
  return (
    <div className="ex-taxstrip" role="group" aria-label={`Tax/GDP gap in ${HEADLINE_YEAR}: the model and the scaling with OBR rates`}>
      <div className="ex-taxrow">
        <span className="ex-taxlabel">
          <Icon name={iconFor('model')} size={16} /> Macro model
        </span>
        <span className="ex-taxtrack">
          <span className="ex-taxzero" style={{ left: pos(0) }} aria-hidden="true" />
          {model == null ? (
            <span className="ex-taxval">{PENDING}</span>
          ) : (
            <span className="ex-taxdot" style={{ left: pos(model) }}>
              {onChart ? null : <span className="ex-taxval">{`${signed(model, 2)}pp`}</span>}
            </span>
          )}
        </span>
      </div>
      {onChart && model != null ? (
        <p className="ex-taxlink">
          <Icon name={iconFor('link')} size={14} />
          <a href="#tax-gdp" onMouseEnter={flag(true)} onMouseLeave={flag(false)} onFocus={flag(true)} onBlur={flag(false)}>
            Its value: the main-version end point of the Tax/GDP chart
          </a>
        </p>
      ) : null}
      <div className="ex-taxrow">
        <span className="ex-taxlabel">
          <Icon name={iconFor('tax')} size={16} /> Scaled with OBR effective rates
        </span>
        <span className="ex-taxtrack">
          <span className="ex-taxzero" style={{ left: pos(0) }} aria-hidden="true" />
          {uk == null ? (
            <span className="ex-taxval">{PENDING}</span>
          ) : (
            <span className="ex-taxbar" style={{ left: pos(Math.min(...uk)), width: `${((Math.abs(uk[0] - uk[1]) / -lo) * 100).toFixed(2)}%` }}>
              <span className="ex-taxval">{`${signed(uk[0], 2)} to ${signed(uk[1], 2)}pp`}</span>
            </span>
          )}
        </span>
      </div>
      <div className="ex-taxrow ex-taxaxis" aria-hidden="true">
        <span />
        <span className="ex-taxtrack" data-axis="">
          {ticks.map((t) => (
            <span key={t} className="ex-taxtick" style={{ left: pos(t) }}>
              {t === 0 ? '0' : `−${Math.abs(t).toFixed(1)}`}
            </span>
          ))}
        </span>
      </div>
      <p className="ex-roughchip">
        <Icon name={iconFor('arithmetic')} size={14} /> Rough scaling, not a model run
      </p>
    </div>
  );
}

// Item 40 (ugai-reviews/item-40-fable.md): the model's tax/GDP gap against
// the scaling with OBR rates, as two series compared, never as a
// counterfactual run. d_lo, d_hi difference the two-decimal values the
// strip prints, so a reader who subtracts gets the same number; rg_lo,
// rg_hi are the part the rate gap alone accounts for.
const r2 = (x) => Math.round(x * 100) / 100;
export function taxSizing(model, ls) {
  if (model == null || ls == null) return null;
  const fall = -ls;
  const uk = OBR_PER_PP.map((k) => -fall * k);
  const d = uk.map((u) => r2(r2(model) - r2(u)));
  const rg = [CAUSES[0].lo, CAUSES[0].hi].map((o) => (Math.abs(ls) * (o - TAX_GAP)) / 100);
  return { fall, uk, d, rg };
}
const range2 = ([a, b]) => (a.toFixed(2) === b.toFixed(2) ? `about ${a.toFixed(2)}pp` : `${a.toFixed(2)}–${b.toFixed(2)}pp`);
export function taxSized(model, ls) {
  const z = taxSizing(model, ls);
  if (!z) return null;
  if (model >= 0) return { kind: 'up', text: `Scaled with OBR rates, revenue falls ${Math.abs(z.uk[0]).toFixed(2)}–${Math.abs(z.uk[1]).toFixed(2)}pp of GDP by ${HEADLINE_YEAR}; in the model it does not fall` };
  if (z.d[0] <= 0) return { kind: 'within', text: 'The model’s revenue fall is within the range scaled with OBR rates' };
  return { kind: 'more', text: `Scaled with OBR rates, revenue falls ${range2(z.d)} of GDP more than in the model by ${HEADLINE_YEAR}` };
}

function TaxGapCard({ sid, closure, rule }) {
  // The model's central-closure figure is the tax/GDP chart's end label
  // unless that chart is showing no foreign capital: each fact once.
  const onChart = closure !== 'closed';
  const closedTax = closedTaxWords(sid, rule);
  const model = gap(sid, 'tfp', CENTRAL, 'tax_gdp_pp', HEADLINE_YEAR, rule);
  const ls = gap(sid, 'tfp', CENTRAL, 'labour_share_pp', HEADLINE_YEAR, rule);
  const fall = ls == null ? null : -ls;
  const uk = fall == null ? null : OBR_PER_PP.map((k) => -fall * k);
  const sized = taxSized(model, ls);
  const z = taxSizing(model, ls);
  return (
    <Card
      id="tax-gap"
      model={closure !== 'central' ? 'oguk' : undefined}
      modelSettings={closure !== 'central' ? [closureLabel('central'), 'main version'] : undefined}
      icon={iconFor('limit')}
      title={TAX_TITLE}
      lead={
        <Items
          className="ex-notes"
          items={[
            { key: 'rates', icon: 'rule', text: `The model taxes labour ${TAX_GAP.toFixed(1)}pp more than capital; OBR rates imply ${CAUSES[0].lo}–${CAUSES[0].hi}pp` },
            // the sign changes only where tax/GDP rises by the headline year
            // (review round 1, R1-02)
            closure !== 'central' && closedTax ? { key: 'closed', icon: 'closed', text: closedTax.flips ? `With no foreign capital the ${HEADLINE_YEAR} sign changes:` : 'With no foreign capital:' } : null,
            closure !== 'central' && closedTax ? { key: 'closed2', icon: 'caveat', text: `tax/GDP ${closedTax.text}` } : null,
          ]}
        />
      }
      // item 40: the sized comparison, the legend sentence and the zero
      // line's note, first in the card's one closed More info
      moreId="tax-gap-more"
      more={[
        sized ? { key: 'sized', text: `${sized.text}.${sized.kind === 'more' ? ' The scaling is the rate gap times the labour-share fall, with GDP, returns and consumption held fixed; it is an approximation, not a model run.' : ''}` } : null,
        fall != null
          ? {
              key: 'legend',
              text: (
                <>
                  <b>Macro model:</b> its tax/GDP gap, all AI effects included. <b>Scaled with OBR effective rates:</b> {OBR_PER_PP[0]}–{OBR_PER_PP[1]}pp of revenue per point of income shifted from labour to capital, times this scenario’s {HEADLINE_YEAR} labour-share fall of {Math.abs(ls).toFixed(1)} points (
                  <NavLink tab="explore" sub="economy" anchor="economy-prices">
                    Economy
                  </NavLink>
                  ).
                </>
              ),
            }
          : null,
        { key: 'zero', text: '0 = the forecast path: the OBR’s central forecast, its own AI included.' },
      ]}
      about={{
        how:
          fall == null ? (
            'This scenario is not yet solved.'
          ) : (
            <Items
              items={[
                { key: 'r1', icon: 'source', text: 'OBR, July 2026: wages and salaries 46%, profits 27%; November 2025: labour income around 40%, corporate profits around 17%' },
                { key: 'r2', icon: 'arithmetic', text: '19–23pp: those rates differenced, on different bases; the OBR publishes neither gap' },
                { key: 'r3', icon: 'model', text: <>Macro model {TAX_GAP.toFixed(1)}pp: {ETR.labour.toFixed(1)}% on labour (with employer NICs), {ETR.capital_gross.toFixed(1)}% on gross capital, {HEADLINE_YEAR}, some foreign capital</> },
                sized?.kind === 'more' && z ? { key: 'rg', icon: 'compare', text: `The rate gap alone accounts for ${z.rg[0].toFixed(2)}–${z.rg[1].toFixed(2)}pp of that; the rest is the model’s other channels` } : null,
              ]}
            />
          ),
        caveats: (
          <Items
            items={[
              { key: 'arm', icon: 'scenario', text: 'Automation + productivity, some foreign capital only' },
              { key: 'closed', icon: 'closed', text: 'It does not show the model’s sign is right with no foreign capital' },
            ]}
          />
        ),
      }}
      sources={sourcesItems({
          closures: [],
          code: false,
          extra: [
            docItem('OBR FRS, July 2026, Box 4.1', LIT.obrFrs26.url),
            docItem('OBR EFO, November 2025, ¶2.64', EFO_NOV25),
            docItem('red_flags_1_3.md', RED_FLAGS_URL),
            docItem('tau_payroll', URLS.ogUkDefaults),
            docItem('HMRC employer rates', URLS.hmrcEmployerRates),
            docItem(SET.nicsFile, NICS_URL),
            navItem('Method: how labour is taxed', 'method', 'm-tax', 'how'),
          ],
          method: 'limits',
        })}
      download={{
        title: TAX_TITLE,
        context: () => contextLine(sid, closure, `tax/GDP in ${HEADLINE_YEAR} with UK tax rates: rough scaling, some foreign capital, automation + productivity`, rule),
        table: () => ({
          columns: ['Item', 'Macro model', 'Comparison', 'Comparison source', 'Effect on revenue'],
          rows: [
            ...CAUSES.map((c) => [c.title, c.oursText, c.lo != null ? `${c.lo}–${c.hi}${c.unit}` : `${c.value}${c.unit === 'pp' ? 'pp' : '%'}`, c.theirs, c.effect]),
            [`Tax/GDP in ${HEADLINE_YEAR} scaled with OBR effective rates (pp of GDP), low`, null, uk ? uk[0] : null, 'OBR effective rates x labour-share fall', ''],
            [`Tax/GDP in ${HEADLINE_YEAR} scaled with OBR effective rates (pp of GDP), high`, null, uk ? uk[1] : null, 'OBR effective rates x labour-share fall', ''],
          ],
        }),
        svg: causesSvg,
        legend: () => [
          { label: 'Macro model', color: 'var(--series-2)', shape: 'dot' },
          { label: 'Comparison', color: CHART_COLOURS.muted, shape: 'ring' },
        ],
      }}
    >
      {/* the card is fixed at some foreign capital, main version: said in
          its model row when the page shows another case (R1-09;
          c0-rulings-opus.md ruling 5) */}
      <AxisTitles y={`Tax/GDP gap in ${HEADLINE_YEAR}, pp of GDP`} />
      <TaxStrip model={model} uk={uk} onChart={onChart} />
      <div className="cause-rows">
        {CAUSES.map((c, i) => (
          <Cause
            key={c.title}
            icon={iconFor(i ? 'tax' : 'compare')}
            title={c.title}
            axis={{ max: c.max, label: c.unit === 'pp' ? `${c.max}pp` : `${c.max}${c.unit}` }}
            ours={{ value: c.ours, text: c.oursText }}
            theirs={c.lo != null ? { name: c.theirs, lo: c.lo, hi: c.hi, text: c.theirsText } : { name: c.theirs, value: c.value, text: c.theirsText }}
            up={understates(c)}
            effect={c.effect}
          />
        ))}
      </div>
      <IconLine icon={iconFor('rule')} className="net-line">
        <b>Net:</b> if the first row outweighs the second, {ext(RED_FLAGS_URL, 'the model understates the fall in revenue')}.
      </IconLine>
    </Card>
  );
}

// How far the rule in view moves each headline-year gap against the common
// fiscal rule, in percentage points. This card is the one home of these
// differences; the gaps themselves are on the charts, which follow the rule.
const RULE_VARS = [
  { v: 'Y', label: 'GDP' },
  { v: 'GNI', label: 'GNI' },
  { v: 'w', label: 'Pay rate' },
  { v: 'C', label: 'Consumption' },
];
const at = (r, v) => (r.status === 'done' ? r.gaps[v][YEARS.indexOf(HEADLINE_YEAR)] : null);
export function ruleShift(rule, sid, arm, cl, v) {
  const a = at(resultAt(sid, arm, cl, rule), v);
  const b = at(resultAt(sid, arm, cl, 'common'), v);
  return a == null || b == null ? null : a - b;
}

function RuleTable({ rule, sid, closure }) {
  const cls = closuresFor(closure);
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>
          {scenarioById(sid).label}, {ruleLabel(rule).toLowerCase()} against the common fiscal rule, {HEADLINE_YEAR}, percentage points
        </caption>
        <thead>
          <tr>
            <th scope="col">Version</th>
            {RULE_VARS.map((c) => (
              <th key={c.v} scope="col" className="num">{c.label}</th>
            ))}
          </tr>
        </thead>
        {cls.map((cl) => (
          <tbody key={cl}>
            {cls.length > 1 ? (
              <tr className="table-group">
                <th colSpan={RULE_VARS.length + 1} scope="colgroup"><Lead c={cl === BOUND ? 'closed' : 'foreign'}>{CLOSURE_LABEL[cl].replace(/^./, (c) => c.toUpperCase())}</Lead></th>
              </tr>
            ) : null}
            {ARMS.map((a) => (
              <tr key={a.id}>
                <th scope="row">{a.short || a.label}</th>
                {RULE_VARS.map((c) => {
                  const x = ruleShift(rule, sid, a.id, cl, c.v);
                  return <td key={c.v} className="num">{fmt(x, 2, 'pp')}</td>;
                })}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function ruleTable(rule, sid, closure) {
  return {
    columns: ['Foreign capital', 'Version', ...RULE_VARS.map((c) => `${c.label}, change against the common rule (pp)`)],
    rows: closuresFor(closure).flatMap((cl) => ARMS.map((a) => [CLOSURE_LABEL[cl], a.label, ...RULE_VARS.map((c) => ruleShift(rule, sid, a.id, cl, c.v))])),
  };
}

const RULE_DB = [
  { v: 'Y', label: 'GDP', concept: 'gdp', unit: '%' },
  { v: 'w', label: 'Pay rate', concept: 'pay', unit: '%' },
  { v: 'GNI', label: 'GNI', concept: 'gni', unit: '%' },
  { v: 'debt_gdp_pp', label: 'Debt/GDP', concept: 'debt', unit: 'pp' },
  { v: 'tax_gdp_pp', label: 'Tax/GDP', concept: 'tax', unit: 'pp' },
];

// The main arm's headline-year gap under the common rule (hollow) and the
// rule picked (filled), per measure, at the closure in view. Values are in
// the tooltips only: each gap's home is its chart, the shift's the table.
function RuleDumbbells({ rule, sid, closure }) {
  const cl = primaryClosure(closure);
  const rows = RULE_DB.map((m) => ({ ...m, a: gap(sid, 'tfp', cl, m.v, HEADLINE_YEAR, 'common'), b: gap(sid, 'tfp', cl, m.v, HEADLINE_YEAR, rule) }));
  const name = ruleLabel(rule);
  return (
    <div className="ex-rdb" role="group" aria-label={`${HEADLINE_YEAR} gaps, common rule against ${name.toLowerCase()}`}>
      <p className="ex-rdb-key" aria-hidden="true">
        <span className="ex-rdb-dot is-common" /> Common rule <span className="ex-rdb-dot" /> {name}
      </p>
      {rows.map((m) => {
        const D = Math.max(0.1, ...[m.a, m.b].filter((x) => x != null).map(Math.abs)) * 1.2;
        const pos = (x) => `${(((x + D) / (2 * D)) * 100).toFixed(2)}%`;
        return (
          <div key={m.v} className="ex-rdb-row">
            <span className="ex-rdb-label">
              <Icon name={iconFor(m.concept)} size={16} /> {m.label}
            </span>
            <span className="ex-rdb-track">
              <span className="ex-taxzero" style={{ left: pos(0) }} aria-hidden="true" />
              {m.a == null || m.b == null ? (
                <span className="ex-rdb-none">
                  <Icon name={iconFor('timing')} size={12} /> not solved
                </span>
              ) : (
                <>
                  <span className="ex-rdb-bar" style={{ left: pos(Math.min(m.a, m.b)), width: `${((Math.abs(m.a - m.b) / (2 * D)) * 100).toFixed(2)}%` }} aria-hidden="true" />
                  <TipTarget className="ex-rdb-dot is-common" style={{ left: pos(m.a) }} label={`${m.label}, common rule: ${fmt(m.a, 2, m.unit)}`} tip={<><b>{m.label}, {HEADLINE_YEAR}</b><span>Common fiscal rule</span><span className="tip-value">{fmt(m.a, 2, m.unit)}</span></>} />
                  <TipTarget className="ex-rdb-dot" style={{ left: pos(m.b) }} label={`${m.label}, ${name.toLowerCase()}: ${fmt(m.b, 2, m.unit)}`} tip={<><b>{m.label}, {HEADLINE_YEAR}</b><span>{name}</span><span className="tip-value">{fmt(m.b, 2, m.unit)}</span></>} />
                </>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// The rule against the common rule, in words (item-15-fable.md A): each
// measure's side from the main version's headline-year shift at the
// foreign-capital case in view (the numbers the dumbbells draw); a shift
// that prints as 0.00 is unchanged. No figures: they are in the dumbbell
// tooltips and the table.
const SHIFT_NAMES = [
  { v: 'Y', name: 'GDP' },
  { v: 'GNI', name: 'GNI' },
  { v: 'w', name: 'the pay rate' },
  { v: 'tax_gdp_pp', name: 'tax/GDP' },
];
const shiftSide = (x) => (x == null ? null : Math.abs(x) < 0.005 ? 'same' : x > 0 ? 'up' : 'down');
const andList = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0]);
const capital = (t) => t.charAt(0).toUpperCase() + t.slice(1);
export function ruleShiftWords(rule, sid, closure) {
  const cl = primaryClosure(closure);
  const by = { up: [], down: [], same: [] };
  SHIFT_NAMES.forEach((m) => {
    const k = shiftSide(ruleShift(rule, sid, 'tfp', cl, m.v));
    if (k) by[k].push(m.name);
  });
  const say = (names, verb) => `${andList(names)} ${names.length > 1 ? verb : `${verb}s`}`;
  const moved = [by.up.length ? say(by.up, 'end') + ' higher' : null, by.down.length ? say(by.down, 'end') + ' lower' : null].filter(Boolean);
  const same = by.same.length ? `${andList(by.same)} ${by.same.length > 1 ? 'are' : 'is'} unchanged` : null;
  if (rule === 'dn') {
    const head = moved.length ? `Against the common rule, ${moved.join(' and ')}` : null;
    return `${[head, same].filter(Boolean).join('; ') || 'Against the common rule, nothing moves'}.`;
  }
  return `${capital([...moved, same].filter(Boolean).join('; '))}.`;
}
export function ruleFinding(rule, sid, closure) {
  const name = ruleLabel(rule).toLowerCase();
  if (!ruleSolved(rule, sid)) return { lead: `${SCEN_NAME[sid]} is not yet solved under ${name}.`, lines: [] };
  const table = 'The table gives the change for every version.';
  if (rule === 'dn')
    return {
      lead: `Under debt-neutral transfers, debt/GDP stays on the forecast path from ${SURPRISE_YEAR + 1} to ${LATE_YEAR}.`,
      lines: ['Transfers to households adjust each year to hold it there.', ruleShiftWords(rule, sid, closure), table],
    };
  const d = shiftSide(ruleShift(rule, sid, 'tfp', primaryClosure(closure), 'debt_gdp_pp'));
  return {
    lead: d === 'same' ? `Under fixed spending, debt/GDP ends where it does under the common rule in ${HEADLINE_YEAR}.` : `Under fixed spending, debt/GDP ends ${d === 'up' ? 'higher' : 'lower'} in ${HEADLINE_YEAR} than under the common rule.`,
    lines: ['Spending stays at its baseline level, so it does not move with GDP.', ruleShiftWords(rule, sid, closure), table],
  };
}

// The fiscal rule against the common rule (#fiscal-rule): one Finding box,
// last on Public finances, only under fixed spending or debt-neutral
// transfers (the common rule has nothing to compare). Its children, the
// dumbbells and the table, are in .chart-plot (dumptabs and check_numbers
// read it); not solved: the lead and the reason only.
function FiscalRuleCard({ sid }) {
  const { st } = useNav();
  const rule = st.rule;
  const has = ruleSolved(rule, sid);
  const f = ruleFinding(rule, sid, st.closure);
  const about = has
    ? {
        caveats: (
          <Items
            items={[
              { key: 'shift', icon: 'compare', text: 'Table: the gap under the rule picked, less the common rule’s' },
              { key: 'choice', icon: 'rule', text: 'The three rules are modelling choices, not OBR rules' },
              { key: 'sign', icon: 'gapUp', text: 'Positive: the rule raises the measure against the common rule' },
            ]}
          />
        ),
      }
    : null;
  const src = cardSources({ about, sources: sourcesItems({ sid, method: 'rules' }) });
  const ref = useRef(null);
  const title = `${HEADLINE_YEAR} gaps: ${ruleLabel(rule).toLowerCase()} against the common rule`;
  return (
    <div ref={ref} id="fiscal-rule">
      <Finding
        icon="rule"
        lead={f.lead}
        lines={f.lines}
        actions={
          <>
            <SourceLine items={src.items} groups={src.groups} record={false} />
            {has ? <DownloadMenu title={title} cardRef={ref} context={() => contextLine(sid, st.closure, 'percentage points', rule)} table={() => ruleTable(rule, sid, st.closure)} /> : null}
          </>
        }
      >
        {has ? (
          <div className="chart-plot">
            <RuleDumbbells rule={rule} sid={sid} closure={st.closure} />
            <RuleTable rule={rule} sid={sid} closure={st.closure} />
          </div>
        ) : null}
      </Finding>
    </div>
  );
}

// The debt and tax charts' one unit line (item 36: what the gap is against
// in full, and the span, are in More info).
const FIN_UNIT = 'Gap vs forecast path, pp of GDP';

export default function FinancesSection({ sid }) {
  const { st } = useNav();
  // Not solved under this rule: the rule card alone says so (and keeps its id)
  if (!ruleSolved(st.rule, sid))
    return (
      <div className="cards-stack">
        <FiscalRuleCard sid={sid} />
      </div>
    );
  const debt = debtParts(sid, st.closure, st.rule);
  return (
    <>
      <SectionHeading id="public-finances" icon={iconFor('finances')} title="How do debt and tax move in each version?">
        <Lead c="measure">Shares of GDP, against the OBR’s central forecast path</Lead>
      </SectionHeading>
      <div className="cards-grid">
        <PathCard
          sid={sid}
          v="debt_gdp_pp"
          years={LONG_YEARS}
          unit="pp"
          id="debt-gdp"
          title="Debt/GDP"
          name="debt/GDP"
          icon={iconFor('debt')}
          tidy
          heading={debtTitle(sid, st.closure, st.rule)}
          unitLine={FIN_UNIT}
          notes={debtNotes(debt)}
          markers={[{ year: SURPRISE_YEAR, label: 'AI starts' }, { year: LATE_YEAR, label: 'Debt rule' }]}
          bands={[]}
          moreId="debt-more"
          more={debtMoreInfo(sid, st.closure, st.rule)}
          about={{
            caveats: (
              <Items
                items={[
                  { key: 'once', icon: 'interest', text: <>{ext(URLS.ogCoreDocs, 'OG-Core')} reprices all government debt at the new rate at once</> },
                  ...debtReviewItems(sid, st.closure, st.rule),
                  { key: 'obr', icon: 'timing', text: `At the OBR’s repricing speed, a first-order recalculation: the ${LATE_YEAR} rise is ${REPRICE_RANGE[0].toFixed(0)}–${REPRICE_RANGE[1].toFixed(0)}% as large` },
                  { key: 'where', icon: 'range', text: `That range covers the ${REPRICE_RATIOS.length} of ${REPRICED.length} cells still above the forecast path at that speed` },
                  { key: 'stress', icon: 'excluded', text: <>The stress test, after {ext(efo(EFO_PAGE.box22), 'OBR Box 2.2')}, leaves out the cost of unemployment</> },
                ]}
              />
            ),
          }}
          method="rules"
        />
        <PathCard
          sid={sid}
          v="tax_gdp_pp"
          years={SHORT_YEARS}
          unit="pp"
          id="tax-gdp"
          title="Tax/GDP"
          name="tax/GDP"
          icon={iconFor('tax')}
          tidy
          heading={taxTitle(sid, st.closure, st.rule)}
          unitLine={FIN_UNIT}
          markers={[{ year: SURPRISE_YEAR, label: 'AI starts' }]}
          bands={[]}
          moreId="tax-more"
          more={taxMoreInfo(sid, st.closure, st.rule)}
          sources={false}
          method="rules"
        />
      </div>
      <div className="cards-stack stack-gap">
        <TaxGapCard sid={sid} closure={st.closure} rule={st.rule} />
        {st.rule !== 'common' ? <FiscalRuleCard sid={sid} /> : null}
      </div>
    </>
  );
}
