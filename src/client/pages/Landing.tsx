// Landing: hero with honest positioning, live stats band from /api/meta,
// three dataset cards, signals explainer, audience strip, pricing teaser.
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SOURCES, SOURCE_IDS } from '../../shared/sources';
import type { SignalType } from '../../shared/types';
import { fetchMeta, useApi } from '../lib/api';
import { formatDate, formatNumber } from '../lib/format';
import { usePageTitle } from '../lib/usePageTitle';
import SignalBadge from '../components/SignalBadge';

const SIGNAL_TYPES: SignalType[] = [
  'new_record',
  'licence_changed',
  'expiring_soon',
  'no_longer_appearing'
];

export default function Landing() {
  const { t } = useTranslation();
  usePageTitle(t('titles.home'));

  const { data: meta, loading, error } = useApi((signal) => fetchMeta(signal), []);

  const signalsTotal = meta
    ? meta.signals_last7d.new_record +
      meta.signals_last7d.licence_changed +
      meta.signals_last7d.expiring_soon +
      meta.signals_last7d.no_longer_appearing
    : 0;

  return (
    <div className="stack-lg">
      <section className="hero">
        <p className="kicker">{t('landing.kicker')}</p>
        <h1>{t('landing.title')}</h1>
        <p className="hero__tagline">{t('hero.tagline')}</p>
        <div className="hero__ctas">
          <Link to="/browse" className="btn btn--primary">
            {t('landing.cta_browse')}
          </Link>
          <Link to="/wine-spirits" className="btn btn--secondary">
            {t('landing.cta_wine')}
          </Link>
        </div>
      </section>

      <section aria-label={t('landing.stats_loading')}>
        <div className="stats-band">
          {loading ? (
            <div className="loading" style={{ gridColumn: '1 / -1' }}>
              {t('landing.stats_loading')}
            </div>
          ) : error || !meta ? (
            <div className="loading" style={{ gridColumn: '1 / -1' }}>
              {t('landing.stats_error')}
            </div>
          ) : (
            <>
              <div>
                <div className="stat__value">{formatNumber(meta.totals.all)}</div>
                <div className="stat__label">{t('landing.stat_total')}</div>
              </div>
              {SOURCE_IDS.map((id) => (
                <div key={id}>
                  <div className="stat__value">{formatNumber(meta.totals[id])}</div>
                  <div className="stat__label">{SOURCES[id].label_en}</div>
                </div>
              ))}
              <div>
                <div className="stat__value stat__value--brass">{formatNumber(signalsTotal)}</div>
                <div className="stat__label">{t('landing.stat_signals')}</div>
              </div>
              <div className="stats-meta" style={{ gridColumn: '1 / -1' }}>
                <p className="notice">
                  {t('landing.stat_updated')}: {meta.platform.data_updated_at ? formatDate(meta.platform.data_updated_at) : t('common.na')}
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">{t('landing.datasets_title')}</h2>
        <div className="rule-double rule-double--tight" aria-hidden="true" />
        <p className="page-intro mb-24">{t('landing.datasets_intro')}</p>
        <div className="card-grid">
          {SOURCE_IDS.map((id) => {
            const def = SOURCES[id];
            return (
              <Link key={id} to={`/browse?source=${id}`} className="card card--link">
                <h3>{def.label_en}</h3>
                <p className="notice mt-8">{def.provider}</p>
                <p className="notice mt-8">{def.licence_note}</p>
                <p className="mt-8" style={{ color: 'var(--tram)', fontWeight: 600 }}>
                  {t('landing.dataset_cta')} →
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">{t('landing.signals_title')}</h2>
        <div className="rule-double rule-double--tight" aria-hidden="true" />
        <p className="page-intro mb-24">{t('landing.signals_intro')}</p>
        <div className="explainer-grid">
          {SIGNAL_TYPES.map((type) => (
            <div key={type} className="card">
              <SignalBadge type={type} />
              <p>{t(`signals.explain.${type}`)}</p>
            </div>
          ))}
        </div>
        <p className="notice mt-24">{t('landing.signals_baseline')}</p>
      </section>

      <section className="section">
        <div className="audience">
          <span className="audience__label">{t('landing.audience_title')}</span>
          <span className="audience__item">{t('landing.audience_wine')}</span>
          <span className="audience__item">{t('landing.audience_beverage')}</span>
          <span className="audience__item">{t('landing.audience_food')}</span>
          <span className="audience__item">{t('landing.audience_equipment')}</span>
          <span className="audience__item">{t('landing.audience_service')}</span>
        </div>
      </section>

      <section>
        <div className="pricing-teaser">
          <div>
            <h2>{t('landing.pricing_title')}</h2>
            <p>{t('landing.pricing_text')}</p>
          </div>
          <Link to="/pricing" className="btn btn--ghost-light">
            {t('landing.pricing_cta')}
          </Link>
        </div>
      </section>
    </div>
  );
}
