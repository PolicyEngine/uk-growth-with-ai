// The address: defaults are left out, old links resolve to the new tabs.
import { describe, expect, it } from 'vitest';
import { DEFAULTS, formatUrl, normalize, parseUrl } from '@/lib/nav.jsx';

describe('address', () => {
  it('leaves defaults out and round-trips every choice', () => {
    expect(formatUrl(DEFAULTS)).toBe('/');
    const st = { ...DEFAULTS, tab: 'explore', sub: 'finances', s: 'korinek', closure: 'both', arms: ['tfp', 'ss'], rule: 'dn' };
    const url = formatUrl(st);
    expect(url).toBe('/?tab=explore&sub=finances&s=korinek&closure=both&arms=tfp,ss&rule=dn');
    expect(parseUrl('?sub=finances')).toMatchObject({ tab: 'explore', sub: 'finances' });
    expect(parseUrl(url.slice(1))).toEqual(normalize({ ...st, ruleSet: true }));
    const who = normalize({ ...DEFAULTS, tab: 'explore', sub: 'who', armId: 'ss', rule: 'dn', ruleSet: true, groups: ['0', 'all'] });
    expect(formatUrl(who)).toBe('/?tab=explore&sub=who&rule=dn&arm=ss&groups=0,all');
    expect(parseUrl(formatUrl(who).slice(1))).toEqual(who);
    expect(who).toMatchObject({ arm: 'stress', wrule: 'dn' });
    // the macro model's page is a named sub-tab; ?tab=method is the landing (Method redesign, M2)
    expect(parseUrl('?tab=method&sub=how')).toMatchObject({ tab: 'method', sub: 'how' });
    expect(formatUrl(parseUrl('?tab=method&sub=how'))).toBe('/?tab=method&sub=how');
    expect(parseUrl('?tab=method&sub=code')).toMatchObject({ tab: 'method', sub: 'code' });
  });

  it('resolves the seven tabs from before they were consolidated', () => {
    expect(parseUrl('?tab=results')).toMatchObject({ tab: 'explore', sub: null });
    expect(parseUrl('?tab=results&sub=economy&s=uk_high')).toMatchObject({ tab: 'explore', sub: null, anchor: 'explore-part-economy', s: 'uk_high' });
    expect(parseUrl('?tab=results&sub=income')).toMatchObject({ tab: 'explore', sub: null, anchor: 'economy-wall' });
    expect(parseUrl('?tab=explore&sub=income')).toMatchObject({ tab: 'explore', sub: null, anchor: 'economy-wall' });
    expect(parseUrl('?tab=explore&sub=households')).toMatchObject({ tab: 'explore', sub: 'households' });
    expect(parseUrl('?tab=method&sub=households')).toMatchObject({ tab: 'method', sub: 'households' });
    expect(parseUrl('?tab=who&closure=both')).toMatchObject({ tab: 'explore', sub: 'who', closure: 'both' });
    expect(parseUrl('?tab=scenarios')).toMatchObject({ tab: 'method', sub: 'how', anchor: 'm-scenarios' });
    expect(parseUrl('?tab=method')).toMatchObject({ tab: 'method', sub: null });
    expect(parseUrl('?tab=method', '#m-rules')).toMatchObject({ tab: 'method', sub: 'how', anchor: 'm-rules' });
    expect(parseUrl('?tab=studies')).toMatchObject({ tab: 'method', sub: 'studies', anchor: null });
    expect(parseUrl('?tab=studies&sub=numbers')).toMatchObject({ tab: 'method', sub: 'studies', anchor: 'numbers' });
    expect(parseUrl('?tab=studies&sub=sources')).toMatchObject({ tab: 'method', sub: 'studies', anchor: 'sources' });
    expect(parseUrl('?tab=code')).toMatchObject({ tab: 'method', sub: 'code' });
    expect(parseUrl('?tab=code', '#pipeline')).toMatchObject({ tab: 'method', sub: 'code', anchor: 'pipeline' });
  });

  it('resolves addresses from before the redesign', () => {
    expect(parseUrl('?tab=cohorts')).toMatchObject({ tab: 'explore', sub: 'who' });
    expect(parseUrl('?tab=literature&sub=numbers')).toMatchObject({ tab: 'method', sub: 'studies', anchor: 'numbers' });
    expect(parseUrl('?tab=literature&sub=matrix')).toMatchObject({ tab: 'method', sub: 'studies', anchor: 'coverage' });
    expect(parseUrl('?tab=method&sub=scenarios')).toMatchObject({ tab: 'method', sub: 'how', anchor: 'm-scenarios' });
    expect(parseUrl('?tab=method&sub=scenarios', '#m-jump')).toMatchObject({ tab: 'method', sub: 'how', anchor: 'm-jump' });
    expect(parseUrl('?tab=method&sub=scenarios&s=korinek')).toMatchObject({ tab: 'method', sub: 'how', anchor: 'm-scenarios', s: 'korinek' });
    expect(parseUrl('?tab=explore&sub=all')).toMatchObject({ tab: 'explore', sub: null, anchor: 'ex-across' });
    expect(parseUrl('?tab=explore', '#income')).toMatchObject({ tab: 'explore', sub: null, anchor: 'economy-wall' });
    expect(parseUrl('?tab=method&sub=history')).toMatchObject({ tab: 'method', sub: 'code', anchor: 'changelog' });
    expect(parseUrl('?tab=method', '#m-history')).toMatchObject({ tab: 'method', sub: 'code', anchor: 'changelog' });
    // the inputs anchors moved to their own page (Method redesign, 2.2)
    expect(parseUrl('?tab=method', '#m-inputs')).toMatchObject({ tab: 'method', sub: 'inputs', anchor: 'm-inputs' });
    expect(parseUrl('?tab=method&sub=how', '#m-inputs-head')).toMatchObject({ tab: 'method', sub: 'inputs', anchor: 'm-inputs-head' });
    expect(parseUrl('?tab=method', '#inputs-table')).toMatchObject({ tab: 'method', sub: 'inputs', anchor: 'inputs-table' });
    expect(parseUrl('?tab=method', '#in-trend-productivity-growth')).toMatchObject({ tab: 'method', sub: 'inputs', anchor: 'in-trend-productivity-growth' });
    expect(parseUrl('?tab=method', '#mx-group-model-parameters')).toMatchObject({ tab: 'method', sub: 'inputs' });
    expect(parseUrl('?tab=method&sub=inputs')).toMatchObject({ tab: 'method', sub: 'inputs', anchor: null });
    expect(parseUrl('?tab=method&sub=studies', '#in-sources')).toMatchObject({ tab: 'method', sub: 'studies' });
    expect(parseUrl('?tab=method&sub=limits')).toMatchObject({ tab: 'method', sub: 'how', anchor: 'm-limits' });
    expect(parseUrl('?tab=results&sub=variables&s=uk_high')).toMatchObject({ tab: 'explore', sub: null, anchor: 'explore-part-economy', s: 'uk_high' });
    expect(parseUrl('?tab=results&sub=overview')).toMatchObject({ tab: 'story', sub: null });
    expect(parseUrl('?tab=results&sub=summary')).toMatchObject({ tab: 'story', sub: null });
    expect(parseUrl('?tab=finances')).toMatchObject({ tab: 'explore', sub: 'finances' });
    expect(parseUrl('', '#public-finances')).toMatchObject({ tab: 'explore', sub: 'finances', anchor: null });
    expect(parseUrl('', '#methodology/code')).toMatchObject({ tab: 'method', sub: 'code', anchor: null });
    expect(parseUrl('?tab=code&sub=oguk')).toMatchObject({ tab: 'method', sub: 'code', anchor: 'use-oguk' });
  });

  it('resolves hash addresses the live site hands out', () => {
    expect(parseUrl('', '#scenarios')).toMatchObject({ tab: 'method', sub: 'how', anchor: 'm-scenarios' });
    expect(parseUrl('', '#code')).toMatchObject({ tab: 'method', sub: 'code' });
    expect(parseUrl('', '#who')).toMatchObject({ tab: 'explore', sub: 'who' });
    expect(parseUrl('', '#results')).toMatchObject({ tab: 'explore', sub: null });
    expect(parseUrl('', '#studies')).toMatchObject({ tab: 'method', sub: 'studies' });
    expect(parseUrl('', '#growth')).toMatchObject({ tab: 'explore' });
    expect(parseUrl('', '#methodology')).toMatchObject({ tab: 'method', sub: null });
    expect(parseUrl('', '#methodology/how')).toMatchObject({ tab: 'method', sub: 'how', anchor: null });
    expect(parseUrl('', '#methodology/obr')).toMatchObject({ tab: 'method', sub: 'how' });
    expect(parseUrl('', '#growth/method')).toMatchObject({ tab: 'method', sub: 'how' });
    expect(parseUrl('', '#coverage')).toMatchObject({ tab: 'method', sub: 'studies' });
    expect(parseUrl('', '#story-part-2')).toMatchObject({ tab: 'story', anchor: 'story-part-2' });
  });

  it('keeps one arm and one rule: old parameters redirect ', () => {
    expect(parseUrl('?tab=explore&sub=who&wrule=dn')).toMatchObject({ rule: 'dn', wrule: 'dn' });
    expect(parseUrl('?tab=explore&sub=who&arm=zfixed')).toMatchObject({ armId: 'tz', arm: 'zfixed' });
    expect(parseUrl('?tab=explore&arms=ss')).toMatchObject({ armId: 'ss', arms: ['ss'] });
    expect(parseUrl('?tab=explore&sub=who&rule=fixed')).toMatchObject({ rule: 'fixed', wrule: 'dn' });
    // each page keeps its default until a rule is picked; then it holds everywhere
    expect(parseUrl('?tab=explore&sub=who')).toMatchObject({ rule: 'common', wrule: 'dn', ruleSet: false });
    expect(parseUrl('?tab=explore&sub=who&rule=common')).toMatchObject({ rule: 'common', wrule: 'common', ruleSet: true });
    expect(formatUrl(parseUrl('?tab=explore&sub=who&wrule=dn&arm=stress'))).toBe('/?tab=explore&sub=who&rule=dn&arm=ss');
  });

  it('ignores a value it does not know', () => {
    expect(parseUrl('?tab=nope&s=nope&closure=nope&rule=nope&arm=nope')).toMatchObject({ tab: 'story', s: DEFAULTS.s, closure: 'central', rule: 'common', armId: 'tfp', wrule: 'dn' });
    expect(parseUrl('?rule=fixed').rule).toBe('fixed');
    for (const k of ['constructor', '__proto__', 'toString']) {
      expect(parseUrl(`?tab=${k}&sub=${k}`, `#${k}`).tab).toBe('story');
    }
  });
});
