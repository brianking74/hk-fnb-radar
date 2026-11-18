// One signal card: type badge, entity link, meta line and honest detail
// rendering per signal type (field-level changes, expiry date + days left).
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { FieldChange, SignalDetail, SignalListItem } from '../../shared/types';
import SignalBadge from './SignalBadge';
import { daysUntil, formatDate, formatDaysLeft, displayName } from '../lib/format';

const FIELD_KEY_BY_FIELD: Record<string, string> = {
  name_en: 'fields.name_en',
  name_tc: 'fields.name_tc',
  address_en: 'fields.address_en',
  address_tc: 'fields.address_tc',
  lic_type_en: 'fields.lic_type_en',
  lic_type_tc: 'fields.lic_type_tc',
  district_en: 'fields.district_en',
  district_tc: 'fields.district_tc',
  info_en: 'fields.info_en',
  info_tc: 'fields.info_tc',
  conditions: 'fields.conditions',
  serno: 'fields.serno',
  expiry_date: 'fields.expiry_date'
};

function fieldLabel(field: string, t: (key: string) => string): string {
  const key = FIELD_KEY_BY_FIELD[field];
  return key ? t(key) : field;
}

function ChangeList({ changes, t }: { changes: FieldChange[]; t: (key: string) => string }) {
  return (
    <div>
      <p className="notice mb-8">{t('signals.page.changed_fields')}</p>
      <ul className="change-list">
        {changes.map((c, i) => (
          <li key={`${c.field}-${i}`}>
            <span className="change-list__field">{fieldLabel(c.field, t)}</span>
            <span className="change-list__from">{c.from ?? t('common.na')}</span>
            <span aria-hidden="true">→</span>
            <span className="change-list__to">{c.to ?? t('common.na')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Detail({ type, detail, expiryDate, t }: { type: SignalListItem['type']; detail: SignalDetail | null; expiryDate: string | null; t: (key: string, opts?: Record<string, unknown>) => string }) {
  if (type === 'licence_changed') {
    const changed = detail?.changed;
    if (changed && changed.length > 0) return <ChangeList changes={changed} t={t} />;
    return <p className="notice">{t('signals.explain.licence_changed')}</p>;
  }

  if (type === 'expiring_soon') {
    if (!expiryDate) return <p className="notice">{t('signals.explain.expiring_soon')}</p>;
    const days = daysUntil(expiryDate);
    return (
      <p>
        <strong>{t('signals.page.expires_on', { date: formatDate(expiryDate) })}</strong>{' '}
        <span className={days < 30 ? 'is-urgent-text' : 'text-soft'}>· {formatDaysLeft(days, t)}</span>
      </p>
    );
  }

  return <p className="notice">{t(`signals.explain.${type}`)}</p>;
}

export default function SignalCard({ item }: { item: SignalListItem }) {
  const { t } = useTranslation();
  const e = item.entity;
  const name = displayName(e.name_en, e.name_tc, e.licno);
  const metaParts = [e.district_en, e.lic_type_en].filter((v): v is string => !!v);
  const expiry = item.detail?.expiry_date ?? e.expiry_date;

  return (
    <article className="card signal-card">
      <div className="signal-card__head">
        <SignalBadge type={item.type} />
        <span className="signal-card__date">
          {t('signals.page.detected')} {formatDate(item.detected_at)}
        </span>
      </div>
      <h3 className="signal-card__name">
        <Link to={`/entity/${e.id}`}>{name}</Link>
      </h3>
      {e.name_en && e.name_tc ? <p className="tc-line">{e.name_tc}</p> : null}
      {metaParts.length > 0 ? <p className="signal-card__meta">{metaParts.join(' · ')}</p> : null}
      <div className="signal-card__detail">
        <Detail type={item.type} detail={item.detail} expiryDate={expiry} t={t} />
      </div>
    </article>
  );
}
