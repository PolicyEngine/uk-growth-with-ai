// Pill probe (item-11-pill-fable.md section 8, item-20-fable.md, item-22-fable.md
// section 7): the settings pill is the only chooser, and the model row sits
// after every page title. At 1280x800 and 390x844 (or the sizes given), on
// Story, the four Explore sub-tabs and the four Method sub-tabs:
//  1. no visible old control (.picker-button, .seg-picker, .seg-option,
//     .segments, .segment, .control-bar, .chips .chip, .ex-rules, .ex-rule,
//     .p3-switch, .settings-bar, .mx-filter, .ex-mtoggle-btn,
//     .p3-follow-btn, .model-chip, .subhead-chip, .page-kicker), and no
//     parent with two or more button[aria-pressed], outside the allowed
//     list; no temporary allowance (item 37: the wall's version chips are
//     a pill section now, after #debt-gdp and #tax-gdp lost theirs in item
//     17);
//  2. every radiogroup, radio and checkbox is inside .settings-pop; every
//     select inside .on-this-page; one role=switch, in #hh-displaced;
//  3. each OG-UK Explore page has one visible page pill, in the .model-row
//     right after h2.page-q; scrolled 900px, the header pill shows and the
//     page pill is under the stack;
//  4. pill text for defaults, &rule=fixed, &s=korinek&closure=closed&arm=tz
//     &rule=dn and &s=uk_low&rule=fixed: every pill fits its box, shows its
//     first segment, "N more" counts the dropped ones, is at most 32px tall,
//     has no "…", and prints "common rule" only on Public finances;
//  5. each pill opens one visible dialog whose options all have a line; at
//     390 the sheet's bottom is the viewport's, at 1280 it is in view;
//  6. keys: on the page pill ArrowDown changes the scenario and the text,
//     Escape closes and returns focus; on #debt-cells ArrowDown twice reaches
//     Stress test with the panel open, Enter closes it;
//  7. with &s=uk_low, Fixed spending and Debt-neutral are aria-disabled,
//     read "Not solved for UK low" and are never struck through;
//  8. no fill: the pill at rest, hovered and open, and the chosen option,
//     are the surface colour or transparent;
//  9. item 22: no kicker; the row 10px (±1) under the title; "A different
//     model" nowhere; "OG-UK settings don’t apply" once, on Explore >
//     Households; the household model line's text and its one link;
// 10. no console errors.
//
//   bun scripts/check_pill.mjs http://localhost:4392 [width height ...]
//   (needs Playwright; CHROMIUM may name a Chrome binary; BROWSER=webkit
//   runs WebKit). Exits 1 on any failure.
import { chromium, webkit } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4392';
const rest = process.argv.slice(3).map(Number);
const sizes = rest.length >= 2 ? Array.from({ length: rest.length >> 1 }, (_, i) => [rest[2 * i], rest[2 * i + 1]]) : [[1280, 800], [390, 844]];
const NAME = process.env.BROWSER === 'webkit' ? 'webkit' : 'chrome';
const browser = process.env.BROWSER === 'webkit' ? await webkit.launch() : await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const PAGES = {
  story: '/',
  economy: '/?tab=explore',
  finances: '/?tab=explore&sub=finances',
  who: '/?tab=explore&sub=who',
  households: '/?tab=explore&sub=households',
  how: '/?tab=method',
  mhh: '/?tab=method&sub=households',
  studies: '/?tab=method&sub=studies',
  code: '/?tab=method&sub=code',
};
const OGUK = ['economy', 'finances', 'who'];
let fails = 0;
let warns = 0;
const fail = (m) => {
  fails += 1;
  console.log(`  FAIL ${m}`);
};
const warn = (m) => {
  warns += 1;
  console.log(`  warn ${m}`);
};

// in the page: visible old controls and pressed-button groups
function sweep() {
  const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length) && getComputedStyle(e).visibility !== 'hidden';
  const TEMP = ':not(*)'; // no allowance left (item 37)
  const OLD = '.picker-button, .seg-picker, .seg-option, .segments, .segment, .control-bar, .chips .chip, .ex-rules, .ex-rule, .p3-switch, .settings-bar, .mx-filter, .ex-mtoggle-btn, .p3-follow-btn, .model-chip, .subhead-chip, .page-kicker';
  const bad = [];
  const temp = [];
  for (const e of document.querySelectorAll(OLD)) {
    if (!vis(e)) continue;
    const where = e.closest('[id]')?.id ?? '';
    const isTemp = e.closest(TEMP) && /control-bar|chip/.test(e.className);
    (isTemp ? temp : bad).push(`${e.className.split(' ')[0]} in #${where}`);
  }
  // two or more pressed buttons under one parent
  const parents = new Map();
  for (const b of document.querySelectorAll('button[aria-pressed]')) {
    if (!vis(b)) continue;
    if (b.matches('.ex-mx-btn, .scrolly-show, .ch-icon-btn.is-motion') || b.closest(TEMP)) continue;
    const p = b.parentElement.closest('ul, [role="group"]') ?? b.parentElement;
    parents.set(p, (parents.get(p) ?? 0) + 1);
  }
  for (const [p, n] of parents) if (n > 1) bad.push(`${n} pressed buttons in ${p.className || p.tagName} #${p.closest('[id]')?.id ?? ''}`);
  for (const e of document.querySelectorAll('[role="radiogroup"], [role="radio"], [role="checkbox"]')) if (vis(e) && !e.closest('.settings-pop')) bad.push(`${e.getAttribute('role')} outside the pill in #${e.closest('[id]')?.id ?? ''}`);
  for (const e of document.querySelectorAll('select')) if (vis(e) && !e.closest('.on-this-page, .page-contents')) bad.push('select outside the page contents');
  const sw = [...document.querySelectorAll('[role="switch"]')].filter(vis);
  if (sw.some((e) => !e.closest('#hh-displaced'))) bad.push('a switch outside #hh-displaced');
  return { bad, temp: [...new Set(temp)] };
}

// in the page: every visible pill's fit
function pills() {
  return [...document.querySelectorAll('.settings-chip')]
    .filter((b) => b.offsetWidth)
    .map((b) => {
      const t = b.querySelector('.settings-chip-text');
      const segs = [...t.querySelectorAll('.settings-chip-seg:not(.settings-chip-more)')];
      const shown = segs.filter((s) => !s.hidden);
      const more = t.querySelector('.settings-chip-more');
      const r = b.getBoundingClientRect();
      return {
        where: b.closest('.is-page') ? 'page' : b.closest('.is-header') ? 'header' : b.closest('.is-band') ? 'band' : `card #${b.closest('[id]')?.id}`,
        text: shown.map((s) => s.textContent).join(' · ') + (more && !more.hidden ? ` · ${more.textContent}` : ''),
        fits: t.scrollWidth <= t.clientWidth + 1,
        first: segs.length ? !segs[0].hidden : true,
        moreOk: (more && !more.hidden ? Number(more.textContent.split(' ')[0]) : 0) === segs.length - shown.length,
        h: Math.round(r.height),
        label: b.getAttribute('aria-label'),
      };
    });
}

for (const [W, H] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && !/ResizeObserver loop/.test(m.text()) && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  console.log(`${NAME} ${W}x${H}`);
  for (const [k, url] of Object.entries(PAGES)) {
    await page.goto(base + url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    // 1, 2
    const s = await page.evaluate(sweep);
    s.bad.forEach((b) => fail(`${k}: ${b}`));
    s.temp.forEach((t) => warn(`${k}: temporary ${t}`));
    // 9: the model row
    const row = await page.evaluate(() => {
      const panel = document.querySelector('.tab-panel:not([hidden])');
      const q = panel?.querySelector('h2.page-q');
      const next = q?.nextElementSibling;
      const r = next?.classList.contains('model-row') ? next.getBoundingClientRect() : null;
      return {
        hasQ: !!q,
        row: !!r,
        gap: r ? Math.round(r.top - q.getBoundingClientRect().bottom) : null,
        rowH: r ? Math.round(r.height) : null,
        notesInQ: !!q?.querySelector('.page-notes'),
        line: next?.querySelector('.model-line') ? [...next.querySelectorAll('.model-line-seg')].map((x) => x.textContent) : null,
        links: next?.querySelector('.model-line') ? [...next.querySelectorAll('.model-line a')].map((a) => [a.textContent, a.getAttribute('href')]) : null,
        text: panel?.innerText ?? '',
      };
    });
    // the story keeps its own call-outs (item 22: the Story is unchanged)
    if (k !== 'story' && /a different model|settings do not apply/i.test(row.text)) fail(`${k}: "A different model" is still drawn`);
    const nApply = (row.text.match(/OG-UK settings don’t apply/g) ?? []).length;
    if (nApply !== (k === 'households' ? 1 : 0)) fail(`${k}: "OG-UK settings don’t apply" ${nApply} times`);
    if ([...OGUK, 'households', 'mhh'].includes(k)) {
      if (!row.row) fail(`${k}: no .model-row after h2.page-q`);
      else if (Math.abs(row.gap - 10) > 1) fail(`${k}: the row is ${row.gap}px under the title`);
      if (row.row && W >= 1280 && row.rowH > 32) fail(`${k}: the model row is ${row.rowH}px tall at ${W}`);
    }
    if (row.hasQ && !row.notesInQ) fail(`${k}: the Sources and notes icon is not on the title line`);
    if (k === 'households' || k === 'mhh') {
      const want = ['Household study', 'PolicyEngine UK', 'FY 2027–28', ...(k === 'households' ? ['OG-UK settings don’t apply'] : [])];
      if (JSON.stringify(row.line) !== JSON.stringify(want)) fail(`${k}: model line ${JSON.stringify(row.line)}`);
      const nl = k === 'households' ? 1 : 0;
      if ((row.links ?? []).length !== nl || (nl && (row.links[0][0] !== 'Household study' || !/tab=method&sub=households/.test(row.links[0][1])))) fail(`${k}: model line links ${JSON.stringify(row.links)}`);
    }
    // 3: one page pill, in the model row
    if (OGUK.includes(k)) {
      const n = await page.locator('.model-row > .settings-chip-wrap.is-page .settings-chip:visible').count();
      if (n !== 1) fail(`${k}: ${n} page pills`);
    }
    // 4 (fit) and 8 (no fill) for every visible pill, 5 (open)
    for (const p of await page.evaluate(pills)) {
      if (!p.fits) fail(`${k}: ${p.where} pill text does not fit: ${p.text}`);
      if (!p.first) fail(`${k}: ${p.where} pill dropped its first segment`);
      if (!p.moreOk) fail(`${k}: ${p.where} pill "N more" is wrong: ${p.text}`);
      if (p.h > 32) fail(`${k}: ${p.where} pill is ${p.h}px tall`);
      if (/…/.test(p.text)) fail(`${k}: ${p.where} pill has an ellipsis`);
      if (/common rule/.test(p.text) && k !== 'finances') fail(`${k}: ${p.where} pill prints "common rule"`);
      console.log(`  ${k} ${p.where}: ${p.text}`);
    }
    // a fixed list: the header pill appears as the page scrolls, so a live
    // locator's indices would shift
    const chips = [];
    for (const h of await page.locator('.settings-chip').elementHandles()) if (await h.evaluate((e) => e.offsetWidth > 0 && !e.closest('.is-header'))) chips.push(h);
    for (const b of chips) {
      await b.scrollIntoViewIfNeeded();
      const bg0 = await b.evaluate((e) => getComputedStyle(e).backgroundColor);
      await b.hover();
      const bg1 = await b.evaluate((e) => getComputedStyle(e).backgroundColor);
      await b.click();
      await page.waitForTimeout(300);
      const d = await page.evaluate(() => {
        const ds = [...document.querySelectorAll('.settings-pop[role="dialog"]')].filter((x) => !x.hidden);
        const r = ds[0]?.getBoundingClientRect();
        const on = ds[0]?.querySelector('.sp-option.is-on');
        return {
          n: ds.length,
          empty: ds[0] ? [...ds[0].querySelectorAll('.sp-option')].filter((o) => !o.querySelector('.sp-option-note')?.textContent.trim()).length : 0,
          box: r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right } : null,
          onBg: on ? getComputedStyle(on).backgroundColor : null,
          names: ds[0] ? [...ds[0].querySelectorAll('.sp-group-name')].map((g) => g.textContent) : [],
        };
      });
      const bg2 = await b.evaluate((e) => getComputedStyle(e).backgroundColor);
      // the chosen option's colour with no pointer over it
      await page.mouse.move(1, 1);
      await page.waitForTimeout(150);
      d.onBg = await page.evaluate(() => {
        const on = [...document.querySelectorAll('.settings-pop[role="dialog"]')].find((x) => !x.hidden)?.querySelector('.sp-option.is-on');
        // WebKit can keep :hover after the pointer has left: then it is
        // the hover colour, not the chosen one, so not judged
        return on && !on.matches(':hover') ? getComputedStyle(on).backgroundColor : null;
      });
      const where = await b.evaluate((e) => e.closest('[id]')?.id ?? e.closest('.settings-chip-wrap').className);
      if ((await b.getAttribute('aria-expanded')) !== 'true') fail(`${k} ${where}: aria-expanded not true when open`);
      if (d.n !== 1) fail(`${k} ${where}: ${d.n} visible dialogs`);
      if (d.empty) fail(`${k} ${where}: ${d.empty} options with no line`);
      if (d.box) {
        if (W <= 600 && Math.abs(d.box.bottom - H) > 1) fail(`${k} ${where}: the sheet ends at ${d.box.bottom}, not ${H}`);
        if (W > 600 && (d.box.top < 0 || d.box.bottom > H + 1 || d.box.left < 0 || d.box.right > W)) fail(`${k} ${where}: the popover is out of view ${JSON.stringify(d.box)}`);
      }
      const clear = (c) => c === 'rgba(0, 0, 0, 0)' || c === 'transparent' || c === 'rgb(255, 255, 255)';
      const band = await b.evaluate((e) => !!e.closest('.is-band'));
      for (const [state, c] of [['rest', bg0], ['hover', bg1], ['open', bg2], ['chosen option', d.onBg]]) if (c && !clear(c) && !(band && state !== 'chosen option')) fail(`${k} ${where}: ${state} background ${c}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
    }
    // 3: scrolled, the header pill
    if (OGUK.includes(k)) {
      await page.evaluate(() => window.scrollTo(0, 900));
      await page.waitForTimeout(400);
      const sc = await page.evaluate(() => {
        const h = document.querySelector('.settings-chip-wrap.is-header');
        const p = document.querySelector('.tab-panel:not([hidden]) .settings-chip-wrap.is-page');
        const stack = document.querySelector('.sticky-stack').getBoundingClientRect().bottom;
        return { header: !!h && h.offsetWidth > 0, under: p ? p.getBoundingClientRect().bottom <= stack + 1 : false };
      });
      if (!sc.header) fail(`${k}: scrolled 900px, no header pill`);
      if (!sc.under) fail(`${k}: scrolled 900px, the page pill is not under the stack`);
    }
  }

  // 4: pill text for the address cases on Economy
  const CASES = [['', 'defaults'], ['&rule=fixed', 'fixed'], ['&s=korinek&closure=closed&arm=tz&rule=dn', 'korinek'], ['&s=uk_low&rule=fixed', 'uk_low']];
  const WANT = {
    1280: { defaults: 'UK central · some foreign capital · automation + productivity', fixed: 'UK central · some foreign capital · automation + productivity · fixed spending', korinek: 'Korinek et al., substantial (US) · no foreign capital · technology unchanged · debt-neutral', uk_low: 'UK low · some foreign capital · automation + productivity · fixed spending' },
    390: { defaults: 'UK central · some foreign capital · 1 more', fixed: 'UK central · fixed spending · 2 more', korinek: 'Korinek et al., substantial (US) · 3 more' },
  };
  for (const [q, name] of CASES) {
    await page.goto(`${base}/?tab=explore${q}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const p = (await page.evaluate(pills)).find((x) => x.where === 'page');
    const want = WANT[W]?.[name];
    if (want && p?.text !== want) fail(`pill text ${name} at ${W}: "${p?.text}", wanted "${want}"`);
    console.log(`  economy${q || ' (defaults)'}: ${p?.text}`);
  }

  // 6: keys on the page pill
  await page.goto(`${base}/?tab=explore`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const pill = page.locator('.model-row .settings-chip');
  const t0 = await pill.innerText();
  await pill.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(250);
  const t1 = await pill.innerText();
  if (!new URL(page.url()).searchParams.get('s') || t1 === t0) fail(`keys: ArrowDown did not change the scenario (${t0} -> ${t1})`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  if ((await pill.getAttribute('aria-expanded')) !== 'false') fail('keys: Escape did not close');
  if (!(await pill.evaluate((e) => e === document.activeElement))) fail('keys: Escape did not return focus to the pill');
  // #debt-cells: one section, arrows do not close, Enter does
  await page.goto(`${base}/?tab=explore&sub=finances`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const dc = page.locator('#debt-cells .settings-chip');
  await dc.scrollIntoViewIfNeeded();
  await dc.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(250);
  if ((await dc.getAttribute('aria-expanded')) !== 'true') fail('#debt-cells: an arrow key closed the panel');
  if (!/Stress test/.test(await dc.innerText())) fail(`#debt-cells: ArrowDown twice shows "${await dc.innerText()}"`);
  const cells = await page.locator('#debt-cells .ex-mx-val').allInnerTexts();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  if ((await dc.getAttribute('aria-expanded')) !== 'false') fail('#debt-cells: Enter did not close the panel');
  if (new URL(page.url()).searchParams.get('arm') !== 'ss') fail('#debt-cells: the address has no arm=ss');
  // the dropdown changes the table values (item 16)
  await page.goto(`${base}/?tab=explore&sub=finances`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const cells0 = await page.locator('#debt-cells .ex-mx-val').allInnerTexts();
  if (JSON.stringify(cells0) === JSON.stringify(cells)) fail('#debt-cells: the version did not change the values');

  // 7: disabled options
  await page.goto(`${base}/?tab=explore&s=uk_low`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.locator('.model-row .settings-chip').click();
  await page.waitForTimeout(250);
  const dis = await page.evaluate(() =>
    [...document.querySelectorAll('.settings-pop:not([hidden]) .sp-option')]
      .filter((o) => /Fixed spending|Debt-neutral/.test(o.querySelector('.sp-option-label').textContent))
      .map((o) => ({ label: o.querySelector('.sp-option-label').textContent, dis: o.getAttribute('aria-disabled'), note: o.querySelector('.sp-option-note').textContent, deco: getComputedStyle(o.querySelector('.sp-option-label')).textDecorationLine })),
  );
  if (dis.length !== 2) fail(`uk_low: ${dis.length} rule options found`);
  for (const o of dis) if (o.dis !== 'true' || o.note !== 'Not solved for UK low' || o.deco !== 'none') fail(`uk_low: ${JSON.stringify(o)}`);
  await page.keyboard.press('Escape');

  if (errors.length) fail(`console errors: ${[...new Set(errors)].join(' / ')}`);
  await ctx.close();
}
await browser.close();
console.log(fails ? `${fails} failures, ${warns} warnings` : `all checks pass (${warns} warnings for the temporary allowance)`);
process.exit(fails ? 1 : 0);
