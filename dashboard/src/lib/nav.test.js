// The address: defaults are left out, old links resolve to the new tabs.
import { describe, expect, it } from 'vitest';
import { DEFAULTS, formatUrl, parseUrl } from '@/lib/nav.jsx';

describe('address', () => {
  it('leaves defaults out and round-trips every choice', () => {
    expect(formatUrl(DEFAULTS)).toBe('/');
    const st = { ...DEFAULTS, tab: 'explore', sub: 'finances', s: 'korinek', closure: 'both', arms: ['tfp', 'ss'], rule: 'dn' };
    const url = formatUrl(st);
    expect(url).toBe('/?tab=explore&sub=finances&s=korinek&closure=both&arms=tfp,ss&rule=dn');
    expect(parseUrl('?sub=finances')).toMatchObject({ tab: 'explore', sub: 'finances' });
    expect(parseUrl(url.slice(1))).toEqual(st);
    const who = { ...DEFAULTS, tab: 'explore', sub: 'who', arm: 'stress', wrule: 'common', groups: ['0', 'all'] };
    expect(parseUrl(formatUrl(who).slice(1))).toEqual(who);
    expect(parseUrl('?tab=method&sub=how')).toMatchObject({ tab: 'method', sub: null });
    expect(parseUrl('?tab=method&sub=code')).toMatchObject({ tab: 'method', sub: 'code' });
  });

  it('resolves the seven tabs from before they were consolidated', () => {
    expect(parseUrl('?tab=results')).toMatchObject({ tab: 'explore', sub: null });
    expect(parseUrl('?tab=results&sub=economy&s=uk_high')).toMatchObject({ tab: 'explore', sub: null, anchor: 'explore-part-economy', s: 'uk_high' });
    expect(parseUrl('?tab=results&sub=income')).toMatchObject({ tab: 'explore', sub: null, anchor: 'income' });
    expect(parseUrl('?tab=explore&sub=income')).toMatchObject({ tab: 'explore', sub: null, anchor: 'income' });
    expect(parseUrl('?tab=explore&sub=households')).toMatchObject({ tab: 'explore', sub: 'households' });
    expect(parseUrl('?tab=method&sub=households')).toMatchObject({ tab: 'method', sub: 'households' });
    expect(parseUrl('?tab=who&closure=both')).toMatchObject({ tab: 'explore', sub: 'who', closure: 'both' });
    expect(parseUrl('?tab=scenarios')).toMatchObject({ tab: 'method', sub: 'scenarios' });
    expect(parseUrl('?tab=method')).toMatchObject({ tab: 'method', sub: null });
    expect(parseUrl('?tab=method', '#m-rules')).toMatchObject({ tab: 'method', sub: null, anchor: 'm-rules' });
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
    expect(parseUrl('?tab=method&sub=scenarios')).toMatchObject({ tab: 'method', sub: 'scenarios' });
    expect(parseUrl('?tab=method&sub=limits')).toMatchObject({ tab: 'method', sub: null, anchor: 'm-limits' });
    expect(parseUrl('?tab=results&sub=variables&s=uk_high')).toMatchObject({ tab: 'explore', sub: null, anchor: 'explore-part-economy', s: 'uk_high' });
    expect(parseUrl('?tab=results&sub=overview')).toMatchObject({ tab: 'story', sub: null });
    expect(parseUrl('?tab=results&sub=summary')).toMatchObject({ tab: 'story', sub: null });
    expect(parseUrl('?tab=finances')).toMatchObject({ tab: 'explore', sub: 'finances' });
    expect(parseUrl('', '#public-finances')).toMatchObject({ tab: 'explore', sub: 'finances', anchor: null });
    expect(parseUrl('', '#methodology/code')).toMatchObject({ tab: 'method', sub: 'code', anchor: null });
    expect(parseUrl('?tab=code&sub=oguk')).toMatchObject({ tab: 'method', sub: 'code', anchor: 'use-oguk' });
  });

  it('ignores a value it does not know', () => {
    expect(parseUrl('?tab=nope&s=nope&closure=nope&rule=nope&wrule=fixed')).toMatchObject({ tab: 'story', s: DEFAULTS.s, closure: 'central', rule: 'common', wrule: 'dn' });
    expect(parseUrl('?rule=fixed').rule).toBe('fixed');
    for (const k of ['constructor', '__proto__', 'toString']) {
      expect(parseUrl(`?tab=${k}&sub=${k}`, `#${k}`).tab).toBe('story');
    }
  });
});
