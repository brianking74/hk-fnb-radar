// App chrome: 3px tram bar, tram-green masthead with nav + EN | 繁 toggle,
// main outlet and the attribution footer on every page.
import { useEffect } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isAppLang, persistLang, type AppLang } from '../i18n';

export default function Layout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  // Scroll to top whenever the route changes (includes page param changes).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  const current = isAppLang(i18n.language) ? i18n.language : 'en';

  function switchTo(lang: AppLang) {
    if (lang === current) return;
    void i18n.changeLanguage(lang);
    persistLang(lang);
  }

  const navItems: { to: string; key: string }[] = [
    { to: '/', key: 'nav.home' },
    { to: '/browse', key: 'nav.browse' },
    { to: '/signals', key: 'nav.signals' },
    { to: '/wine-spirits', key: 'nav.wine' },
    { to: '/methodology', key: 'nav.methodology' },
    { to: '/pricing', key: 'nav.pricing' }
  ];

  return (
    <div className="site">
      <div className="tram-bar" aria-hidden="true" />
      <a className="skip-link" href="#main">
        {t('header.skip')}
      </a>
      <header className="masthead">
        <div className="container masthead__inner">
          <Link to="/" className="brand">
            <span className="brand__dot" aria-hidden="true" />
            {t('brand')}
          </Link>
          <nav className="nav" aria-label={t('nav.home')}>
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                {t(item.key)}
              </NavLink>
            ))}
            <div className="lang-toggle" role="group" aria-label={t('header.lang_label')}>
              <button
                type="button"
                className={current === 'en' ? 'is-active' : undefined}
                aria-pressed={current === 'en'}
                onClick={() => switchTo('en')}
              >
                EN
              </button>
              <span className="lang-sep" aria-hidden="true">
                |
              </span>
              <button
                type="button"
                className={current === 'zh-HK' ? 'is-active' : undefined}
                aria-pressed={current === 'zh-HK'}
                onClick={() => switchTo('zh-HK')}
              >
                繁
              </button>
            </div>
          </nav>
        </div>
      </header>
      <main id="main" className="container">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer__inner">{t('footer.text')}</div>
      </footer>
    </div>
  );
}
