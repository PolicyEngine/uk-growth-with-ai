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
import 'katex/dist/katex.min.css';
import SiteFooter from '@/components/ab/SiteFooter.jsx';
import { SITE_HEADER_STYLES, SITE_NAV_ITEMS } from '@/lib/siteNav.js';

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
import { PAGE_TITLE } from '@/lib/labels.js';

const TITLE = PAGE_TITLE;
const DESCRIPTION =
  'AI as an unanticipated 2028 shock to the capital share, with or without a productivity gain, in UK low, central and high scenarios calibrated to the IMF and OBR and an upper case from Korinek et al.’s US “substantial” scenario, run through OG-UK, the UK overlapping-generations model, 2027–2031, against the OBR-central path. National income and GDP, with a closed-capital bound. One sector.';

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={inter.variable}>
      <body>
        <PolicyEngineShell country="uk" showFooter={false} headerProps={{ navItems: SITE_NAV_ITEMS, styles: SITE_HEADER_STYLES }}>
          {children}
          <SiteFooter />
        </PolicyEngineShell>
      </body>
    </html>
  );
}
