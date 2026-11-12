// The slim PolicyEngine footer (AB SiteFooter.jsx).
import logo from '@/assets/policyengine-white.svg';

const LINKS = [
  { label: 'About us', href: 'https://policyengine.org/uk/team' },
  { label: 'Donate', href: 'https://policyengine.org/uk/donate' },
  { label: 'Developer tools', href: 'https://policyengine.org/uk/dev-tools' },
  { label: 'Privacy policy', href: 'https://policyengine.org/uk/privacy' },
  { label: 'Terms and conditions', href: 'https://policyengine.org/uk/terms' },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <a href="https://policyengine.org/uk" aria-label="PolicyEngine UK home" className="site-footer-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo.src} alt="PolicyEngine" />
        </a>
        <nav aria-label="PolicyEngine site footer" className="site-footer-links">
          {LINKS.map((l) => (
            <a key={l.label} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <p className="site-footer-copy">&copy; 2026 PolicyEngine</p>
      </div>
    </footer>
  );
}
