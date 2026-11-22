// Dump each tab panel's innerText for every scenario, as JSON:
//   bun scripts/dumptabs.mjs http://localhost:4350 out.json
// Needs playwright (not a dashboard dependency): run it from a folder that
// has it installed, or with NODE_PATH pointing at one.
import { chromium, webkit } from 'playwright';
import fs from 'node:fs';
const [base, out] = process.argv.slice(2);
const exe = process.env.CHROMIUM || `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1169/chrome-mac/Chromium.app/Contents/MacOS/Chromium`;
// BROWSER=webkit runs Playwright's WebKit (an approximation of Safari)
const browser = process.env.BROWSER === 'webkit' ? await webkit.launch() : await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
// results:<sub>[:<closure>] dumps a Results sub-tab, with the header's
// closure picker set through the address.
// results:finances:<closure>:<rule> sets the fiscal rule (&rule=) and dumps
// the fiscal-rule box's content only (it shows under fixed spending and
// debt-neutral transfers, not the common rule).
// results:summary[:<closure>] is the story's part 2 (#story-part-2), the
// home of the former Summary tiles; story:part1 and story:part3 dump those
// parts (they do not change with the header pickers).
const SUBS = ['summary', 'income', 'economy', 'finances'];
const tabs = [
  ...SUBS.map((s) => `results:${s}`),
  ...['closed', 'both'].flatMap((c) => SUBS.map((s) => `results:${s}:${c}`)),
  'results:finances:central:dn', 'results:finances:closed:dn', 'results:finances:both:dn',
  'results:finances:central:fixed', 'results:finances:closed:fixed', 'results:finances:both:fixed',
  'who', 'who:both', 'method', 'studies', 'code',
  'results:all',
  'story:hero', 'story:part1', 'story:part3',
  // uk-ai-study detail and method: ?tab=explore&sub=households and
  // ?tab=method&sub=households (#explore-sub-households, #method-sub-households)
  'explore:households', 'method:households',
];
// A tab's text: its innerText with `hide` set aside, then the figures'
// notes kept behind their "Sources and notes" buttons (SourceLine.jsx
// renders them hidden, [data-source-notes]): a caveat may be a number's
// one home, so it is read as present though collapsed. Then, after a
// MORE_MARK line, the text of every closed "More info" fold
// ([data-more-info], components/ui/MoreInfo.jsx; item-36-fable.md §1.3): a
// definition, a draw count or a period may have its one home there. An
// open fold is already in innerText and is not read twice.
// A closed table fold ([data-table-fold]: the Households redesign's "Show
// table" fold, held for a ruling and not built yet) is read before the mark: a table fold is a figure's
// home; More info only restates.
// check_numbers.py counts the printed figures before the mark.
const MORE_MARK = '[[more info]]';
function readTab([id, hide, mark]) {
  document.querySelectorAll(hide).forEach((e) => { e.style.display = 'none'; });
  const el = document.getElementById(id);
  if (!el) return '';
  const flat = (n) => {
    const c = n.cloneNode(true);
    c.querySelectorAll(hide).forEach((x) => x.remove());
    return c.textContent.replace(/\s+/g, ' ').trim();
  };
  const notes = [...el.querySelectorAll('[data-source-notes]')].map(flat);
  const folds = [...el.querySelectorAll('[data-table-fold] .disclosure-content[hidden]')].map(flat).filter(Boolean);
  const more = [...el.querySelectorAll('[data-more-info]')].filter((n) => n.closest('[hidden]')).map(flat).filter(Boolean);
  return [el.innerText, ...notes, ...folds, ...(more.length ? [mark, ...more] : [])].join('\n');
}
const res = {};
for (const s of ['uk_low', 'uk_central', 'uk_high', 'korinek']) {
  res[s] = {};
  for (const t of tabs) {
    const [tab, sub, closure, rule] = t.split(':');
    const story = tab === 'story' || sub === 'summary';
    const hh = sub === 'households';
    // The keys keep the names of the tabs before they were consolidated;
    // each opens its current address: Results and Who gains are sub-tabs of
    // Explore, the rest of Method and sources.
    const [newTab, newSub] = hh ? [tab, sub] : story ? ['story', null] : tab === 'results' ? ['explore', sub === 'income' ? 'economy' : sub] : tab === 'who' ? ['explore', 'who'] : ['method', tab === 'method' ? 'how' : tab];
    // Results' panels are parts of Explore's pages (income and economy share one)
    const elId = hh ? `${tab}-sub-households` : tab === 'results' ? `explore-part-${sub}` : newSub ? `${newTab}-sub-${newSub}` : `tab-${newTab}`;
    const q = new URLSearchParams({ tab: newTab, s });
    if (newSub) q.set('sub', newSub);
    if (closure) q.set('closure', closure);
    if (rule) q.set('rule', rule);
    if (tab === 'who' && sub) q.set('closure', sub);
    await page.goto(`${base}/?${q}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    if (rule) {
      // the Finding box: its lead and lines (no figures), then the
      // dumbbells and the table in .chart-plot (only off the common rule)
      res[s][t] = await page.locator('#fiscal-rule').innerText();
      continue;
    }
    // Axis ticks are scale, not data: hidden before reading the text.
    res[s][t] = await page.evaluate(readTab, [elId, '[data-axis]', MORE_MARK]);
    if (hh) {
      // as the story: quoted inputs (data-input) are not results
      res[s][t] = await page.evaluate(readTab, [elId, '[data-axis], [data-input]', MORE_MARK]);
    }
    if (story) {
      const el = sub === 'summary' ? 'story-part-2' : `story-${sub.replace('part', 'part-')}`;
      // Story: axis ticks and inputs quoted from the data's text (data-input:
      // a rate or limit printed inside a definition) are not results.
      res[s][t] = await page.evaluate(readTab, [el, '[data-axis], [data-input]', MORE_MARK]);
    }
  }
}
fs.writeFileSync(out, JSON.stringify(res));
await browser.close();
