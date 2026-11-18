// /methodology — data sources (from the shared SOURCES registry), update
// cadence, signal definitions, honest limitations, contact policy and tiers.
import { useTranslation } from 'react-i18next';
import { SOURCES, SOURCE_IDS } from '../../shared/sources';
import { usePageTitle } from '../lib/usePageTitle';
import PageHeading from '../components/PageHeading';
import SignalBadge from '../components/SignalBadge';

const SIGNAL_TYPES = ['new_record', 'licence_changed', 'expiring_soon', 'no_longer_appearing'] as const;

export default function Methodology() {
  const { t } = useTranslation();
  usePageTitle(`${t('titles.methodology')} — HK F&B RADAR`);

  return (
    <div className="stack-lg">
      <PageHeading title={t('titles.methodology')}>{t('methodology.intro')}</PageHeading>

      <section>
        <h2 className="section-title">{t('methodology.sources_title')}</h2>
        <div className="rule-double rule-double--tight" aria-hidden="true" />
        <div className="table-wrap">
          <table className="table table--methodology">
            <thead>
              <tr>
                <th scope="col">{t('methodology.col_dataset')}</th>
                <th scope="col">{t('methodology.col_provider')}</th>
                <th scope="col">{t('methodology.col_source')}</th>
                <th scope="col">{t('methodology.col_coverage')}</th>
              </tr>
            </thead>
            <tbody>
              {SOURCE_IDS.map((id) => {
                const def = SOURCES[id];
                return (
                  <tr key={id}>
                    <td>{def.label_en}</td>
                    <td>{def.provider}</td>
                    <td>
                      <a href={def.dataset_url} target="_blank" rel="noreferrer">
                        {t('common.open_dataset')}
                      </a>
                    </td>
                    <td>{def.licence_note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="section-title">{t('methodology.cadence_title')}</h2>
        <div className="rule-double rule-double--tight" aria-hidden="true" />
        <p>{t('methodology.cadence_body')}</p>
      </section>

      <section>
        <h2 className="section-title">{t('methodology.signals_title')}</h2>
        <div className="rule-double rule-double--tight" aria-hidden="true" />
        <div className="stack-lg" style={{ gap: 16 }}>
          {SIGNAL_TYPES.map((type) => (
            <div key={type} className="card">
              <SignalBadge type={type} />
              <p className="mt-8">{t(`signals.explain.${type}`)}</p>
            </div>
          ))}
        </div>
        <p className="notice mt-24">{t('methodology.signals_baseline')}</p>
      </section>

      <section>
        <h2 className="section-title">{t('methodology.noclaims_title')}</h2>
        <div className="rule-double rule-double--tight" aria-hidden="true" />
        <p>{t('methodology.noclaims_body')}</p>
      </section>

      <section>
        <h2 className="section-title">{t('methodology.contacts_title')}</h2>
        <div className="rule-double rule-double--tight" aria-hidden="true" />
        <p>{t('methodology.contacts_body')}</p>
        <p className="mt-8">{t('methodology.contacts_body2')}</p>
      </section>

      <section>
        <h2 className="section-title">{t('methodology.tiers_title')}</h2>
        <div className="rule-double rule-double--tight" aria-hidden="true" />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t('methodology.tiers_col_tier')}</th>
                <th scope="col">{t('methodology.tiers_col_signals')}</th>
                <th scope="col">{t('methodology.tiers_col_expiry')}</th>
                <th scope="col">{t('methodology.tiers_col_extra')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{t('methodology.tier_free')}</td>
                <td>{t('methodology.tier_free_signals')}</td>
                <td>{t('methodology.tier_free_expiry')}</td>
                <td>{t('methodology.tier_free_extra')}</td>
              </tr>
              <tr>
                <td>{t('methodology.tier_pro')}</td>
                <td>{t('methodology.tier_pro_signals')}</td>
                <td>{t('methodology.tier_pro_expiry')}</td>
                <td>{t('methodology.tier_pro_extra')}</td>
              </tr>
              <tr>
                <td>{t('methodology.tier_business')}</td>
                <td>{t('methodology.tier_business_signals')}</td>
                <td>{t('methodology.tier_business_expiry')}</td>
                <td>{t('methodology.tier_business_extra')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
