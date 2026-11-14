// The address: defaults are left out, old links resolve to the new tabs.
import { describe, expect, it } from 'vitest';
import { DEFAULTS, formatUrl, parseUrl } from '@/lib/nav.jsx';

describe('address', () => {
  it('leaves defaults out and round-trips every choice', () => {
    expect(formatUrl(DEFAULTS)).toBe('/');
    const st = { ...DEFAULTS, tab: 'results', sub: 'finances', s: 'korinek', closure: 'both', arms: ['tfp', 'ss'], rule: 'dn' };
    const url = formatUrl(st);
    expect(url).toBe('/?sub=finances&s=korinek&closure=both&arms=tfp,ss&rule=dn');
    expect(parseUrl(url.slice(1))).toEqual(st);
    const who = { ...DEFAULTS, tab: 'who', arm: 'stress', wrule: 'common', groups: ['0', 'all'] };
    expect(parseUrl(formatUrl(who).slice(1))).toEqual(who);
  });

  it('resolves addresses from before the redesign', () => {
    expect(parseUrl('?tab=cohorts').tab).toBe('who');
    expect(parseUrl('?tab=literature&sub=numbers')).toMatchObject({ tab: 'studies', sub: 'numbers' });
    expect(parseUrl('?tab=literature&sub=matrix')).toMatchObject({ tab: 'studies', sub: null });
    expect(parseUrl('?tab=method&sub=scenarios').tab).toBe('scenarios');
    expect(parseUrl('?tab=method&sub=limits')).toMatchObject({ tab: 'method', anchor: 'm-limits' });
    expect(parseUrl('?tab=results&sub=variables&s=uk_high')).toMatchObject({ tab: 'results', sub: 'economy', s: 'uk_high' });
    expect(parseUrl('?tab=results&sub=overview')).toMatchObject({ tab: 'results', sub: null });
    expect(parseUrl('?tab=finances')).toMatchObject({ tab: 'results', sub: 'finances' });
    expect(parseUrl('', '#public-finances')).toMatchObject({ tab: 'results', sub: 'finances', anchor: null });
    expect(parseUrl('?tab=code&sub=oguk')).toMatchObject({ tab: 'code', anchor: 'use-oguk' });
  });

  it('ignores a value it does not know, and never selects the unsolved rule', () => {
    expect(parseUrl('?tab=nope&s=nope&closure=nope&rule=fixed')).toMatchObject({ tab: 'results', s: DEFAULTS.s, closure: 'central', rule: 'common' });
  });
});
