// /pricing — three honest tier cards; checkout is not faked, buttons are
// disabled until Release 2 and say so.
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../lib/usePageTitle';
import PageHeading from '../components/PageHeading';

export default function Pricing() {
  const { t } = useTranslation();
  usePageTitle(`${t('titles.pricing')} — HK F&B RADAR`);

  const tiers = [
    {
      id: 'free',
      tier: 'FREE',
      price: 'HK$0',
      desc: t('pricing.free_desc'),
      cta: t('pricing.cta_free'),
      features: [t('pricing.free_f1'), t('pricing.free_f2')],
      featured: false
    },
    {
      id: 'professional',
      tier: 'PROFESSIONAL',
      price: 'HK$149',
      desc: t('pricing.pro_desc'),
      cta: t('pricing.cta_pro'),
      features: [t('pricing.pro_f1'), t('pricing.pro_f2'), t('pricing.pro_f3'), t('pricing.pro_f4')],
      featured: true
    },
    {
      id: 'business',
      tier: 'BUSINESS',
      price: 'HK$299',
      desc: t('pricing.business_desc'),
      cta: t('pricing.cta_business'),
      features: [t('pricing.business_f1'), t('pricing.business_f2'), t('pricing.business_f3')],
      featured: false
    }
  ];

  return (
    <div className="stack-lg">
      <PageHeading title={t('titles.pricing')}>{t('pricing.intro')}</PageHeading>

      <div className="banner banner--tram">
        <p>
          <strong>{t('pricing.banner')}</strong>
        </p>
      </div>

      <div className="tier-grid">
        {tiers.map((tier) => (
          <div key={tier.id} className={`card tier-card${tier.featured ? ' tier-card--featured' : ''}`}>
            <span className="tier-card__tier">
              {tier.tier}
              {tier.featured ? ` · ${t('pricing.featured')}` : ''}
            </span>
            <div className="tier-card__price">
              {tier.price}
              <span className="tier-card__per"> {t('pricing.per_month')}</span>
            </div>
            <p className="tier-card__desc">{tier.desc}</p>
            <ul>
              {tier.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button type="button" className="btn btn--primary" disabled aria-disabled="true" title={t('pricing.banner')}>
              {tier.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
