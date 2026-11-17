import { PolicyEngineShell } from '@policyengine/ui-kit/layout';
import '@policyengine/ui-kit/styles.css';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import './panels.css';
// The PolicyEngine tokens, bundled (as the Autumn Budget 2026 dashboard)
import '@policyengine/ui-kit/legacy/tokens.css';
import './fonts.css';
import './siteHeader.css';
import './ab.css';
import './v2.css';
import './story.css';
import './story-part1.css';
import './story-part2.css';
import './story-part3.css';
import './story-identity.css';
import './sources.css';
import './items-explore.css';
import './items-method.css';
import 'katex/dist/katex.min.css';
import SiteFooter from '@/components/ab/SiteFooter.jsx';
import { SITE_HEADER_STYLES, SITE_NAV_ITEMS } from '@/lib/siteNav.js';
import { PAGE_TITLE } from '@/lib/labels.js';

// Inter, self-hosted (fonts/, SIL Open Font License in fonts/OFL.txt): no
// third-party font request.
const inter = localFont({
  src: './fonts/inter-latin-variable.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter',
  adjustFontFallback: 'Arial',
});

const SITE_URL = 'https://uk-growth-with-ai.vercel.app';
const TITLE = PAGE_TITLE;
const DESCRIPTION =
  'AI as an unanticipated 2028 shock to the capital share, with or without a productivity gain, in UK low, central and high scenarios calibrated to the IMF and OBR and an upper case from Korinek et al.’s US “substantial” scenario, run through OG-UK, the UK overlapping-generations model, 2027–2031, against the no-shock baseline. National income and GDP, with a no-foreign-capital bound. One sector.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  authors: [{ name: 'PolicyEngine' }],
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: 'PolicyEngine',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    site: '@ThePolicyEngine',
  },
};

export const viewport: Viewport = {
  // A literal is required: viewport metadata cannot read a CSS variable.
  // Keep in step with --pe-color-primary-700 in globals.css.
  themeColor: '#285E61',
  width: 'device-width',
  initialScale: 1,
};

// The hash keys: lib/nav.jsx's LEGACY_TAB and ALIAS (old addresses).
const OLD_HASHES = ['cohorts', 'literature', 'finances', 'public-finances', 'growth', 'methodology', 'coverage', 'results', 'who', 'scenarios', 'studies', 'code'];
const NAV_PENDING = `try{var q=new URLSearchParams(location.search),t=q.get('tab'),h=location.hash.replace(/^#/,'').split('/')[0];if((t&&t!=='story')||q.get('sub')||(!t&&${JSON.stringify(OLD_HASHES)}.indexOf(h)>=0))document.documentElement.setAttribute('data-nav-pending','')}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* A shared link to another tab: hide the server-rendered Story until
            the client shows the named tab (v2.css, lib/nav.jsx). */}
        <script dangerouslySetInnerHTML={{ __html: NAV_PENDING }} />
      </head>
      <body>
        {/* first tab stop, before the PolicyEngine site nav */}
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <PolicyEngineShell country="uk" showFooter={false} headerProps={{ navItems: SITE_NAV_ITEMS, styles: SITE_HEADER_STYLES }}>
          {children}
          <SiteFooter />
        </PolicyEngineShell>
      </body>
    </html>
  );
}
