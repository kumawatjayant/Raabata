import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowUpRight,
  Heart,
  Instagram,
  Mail,
  MapPin,
  Menu,
  Phone,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.jpeg.asset.json";
import { LANGUAGE_OPTIONS, useLanguage } from "@/lib/i18n";
import { site } from "@/lib/site";

export function Brand() {
  const { t } = useLanguage();
  return (
    <Link to="/" className="brand" aria-label="Rabata home">
      <img src={logo.url} alt="Rabata tree of education logo" width={55} height={61} />
      <div>
        <div className="brand-name">RABATA</div>
        <div className="brand-sub">{t.brandSub}</div>
      </div>
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const { lang, setLang, t } = useLanguage();

  const nav = [
    { to: "/", label: t.nav.home },
    { to: "/about", label: t.nav.about },
    { to: "/learn", label: t.nav.learn },
    { to: "/students", label: t.nav.students },
    { to: "/impact", label: t.nav.impact },
    { to: "/funds", label: t.nav.funds },
    { to: "/community", label: t.nav.community },
    { to: "/contact", label: t.nav.contact },
  ] as const;

  return (
    <>
      <div className="topbar">
        <div className="container">
          <span>
            <Heart size={11} /> {t.tagline}
          </span>
          <span className="top-location">
            <MapPin size={11} /> Derabassi, Punjab, India
          </span>
          <span style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div className="lang-switcher" role="group" aria-label="Language switcher">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  className={`lang-btn ${lang === opt.code ? "is-active" : ""}`}
                  aria-pressed={lang === opt.code}
                  title={opt.nativeName}
                  onClick={() => setLang(opt.code)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <a href={`tel:${site.phone}`} title="Call Rabata Helpline">
              <Phone size={12} /> {site.phoneDisplay}
            </a>
            <a href={site.instagram} target="_blank" rel="noreferrer">
              <Instagram size={12} /> Follow our journey <ArrowUpRight size={11} />
            </a>
            <Link to="/account">
              <ShieldCheck size={12} /> {t.nav.memberPortal}
            </Link>
            <Link to="/admin">
              <ShieldCheck size={12} /> {t.nav.adminConsole}
            </Link>
          </span>
        </div>
      </div>
      <header className="header">
        <div className="container header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Main navigation">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }}>
                {n.label}
              </Link>
            ))}
            <Button asChild variant="secondary" className="nav-cta">
              <Link to="/get-involved">
                <Heart size={13} /> {t.nav.getInvolved}
              </Link>
            </Button>
          </nav>
          <Button
            className="menu-toggle"
            variant="ghost"
            size="icon"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </header>
      {open && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-xs font-semibold text-muted-foreground">
              Language / भाषा / ਭਾਸ਼ਾ
            </span>
            <div
              className="lang-switcher is-light"
              role="group"
              aria-label="Mobile language switcher"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  className={`lang-btn ${lang === opt.code ? "is-active" : ""}`}
                  aria-pressed={lang === opt.code}
                  onClick={() => setLang(opt.code)}
                >
                  {opt.nativeName}
                </button>
              ))}
            </div>
          </div>
          {nav.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)}>
              {n.label}
            </Link>
          ))}
          <Link to="/get-involved" onClick={() => setOpen(false)}>
            {t.nav.getInvolved}
          </Link>
          <Link to="/skills" onClick={() => setOpen(false)}>
            {t.nav.skills}
          </Link>
          <Link to="/account" onClick={() => setOpen(false)}>
            {t.nav.memberPortal}
          </Link>
        </nav>
      )}
    </>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Brand />
            <p>
              A little support. A world of possibilities.
              <br />
              Connecting children with education, skills and a brighter tomorrow.
            </p>
          </div>
          <div>
            <h3>Discover Rabata</h3>
            <div className="footer-links">
              <Link to="/about">Our story</Link>
              <Link to="/impact">Success stories &amp; impact</Link>
              <Link to="/funds">Fund transparency</Link>
              <Link to="/community">Community initiatives</Link>
              <Link to="/skills">Skills &amp; career development</Link>
            </div>
          </div>
          <div>
            <h3>Be a part of the change</h3>
            <div className="footer-links">
              <Link to="/student-registration">Register a student</Link>
              <Link to="/students">Student academic profiles</Link>
              <Link to="/volunteer">Volunteer to teach</Link>
              <Link to="/get-involved">Support our work</Link>
              <Link to="/learn">Learning library &amp; lectures</Link>
              <Link to="/account">Mentor &amp; student portal</Link>
            </div>
          </div>
          <div className="footer-contact">
            <h3>Let’s stay connected</h3>
            <a href={`tel:${site.phone}`} className="footer-social">
              <Phone size={14} />
              {site.phoneDisplay}
            </a>
            <a href={`mailto:${site.email}`} className="footer-social">
              <Mail size={14} />
              {site.email}
            </a>
            <a href={site.instagram} target="_blank" rel="noreferrer" className="footer-social">
              <Instagram size={14} />
              @rabata._.official
            </a>
            <a
              href={site.founderInstagram}
              target="_blank"
              rel="noreferrer"
              className="footer-social"
            >
              <Instagram size={14} />
              @rathore._.tammana
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Rabata · Made for a more equal tomorrow.</span>
          <Link to="/privacy">Privacy, safeguarding &amp; terms</Link>
        </div>
      </div>
    </footer>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="page-heading">
      <div className="container">
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  );
}
