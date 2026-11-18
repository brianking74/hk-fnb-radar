// /entity/:id — bilingual record header, meta grid, endorsements, conditions,
// signal history, source attribution and the honest contacts placeholder.
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ContactRecord, EntityDetailResponse } from '../../shared/types';
import { SOURCES } from '../../shared/sources';
import { ApiError, fetchEntity, useApi } from '../lib/api';
import { displayName, formatDate } from '../lib/format';
import { usePageTitle } from '../lib/usePageTitle';
import SignalBadge from '../components/SignalBadge';
import { signalFieldLabel } from '../components/SignalCard';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { ErrorNote, Loading } from '../components/DataState';

export default function EntityDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const entityId = Number.parseInt(id ?? '', 10);

  const { data, loading, error, reload } = useApi<EntityDetailResponse>(
    (signal) => {
      if (!Number.isFinite(entityId)) {
        return Promise.reject(new Error('invalid_id'));
      }
      return fetchEntity(entityId, signal);
    },
    [entityId]
  );

  const entity = data?.entity;
  const name = entity ? displayName(entity.name_en, entity.name_tc, entity.licno) : t('titles.entity');
  usePageTitle(`${name} — HK F&B RADAR`);

  if (error) {
    const is404 = error instanceof ApiError && error.status === 404;
    return (
      <div>
        <EmptyState
          title={is404 ? t('entity.not_found_title') : t('common.error_generic')}
          body={is404 ? t('entity.not_found_body') : undefined}
          action={
            <Link to="/browse" className="btn btn--secondary">
              {t('entity.back_browse')}
            </Link>
          }
        />
        {!is404 ? (
          <div className="mt-24">
            <ErrorNote error={error} onRetry={reload} />
          </div>
        ) : null}
      </div>
    );
  }

  if (loading || !entity || !data) {
    return <Loading />;
  }

  const sourceDef = SOURCES[entity.source];
  const isLiquor = entity.source === 'liquor';

  return (
    <div className="stack-lg">
      <header className="entity-header">
        <p className="kicker">{sourceDef.label_en}</p>
        <h1 className="page-title" style={{ marginBottom: 4 }}>
          {displayName(entity.name_en, entity.name_tc, entity.licno)}
        </h1>
        {entity.name_en && entity.name_tc ? <p className="tc-line" style={{ fontSize: 17 }}>{entity.name_tc}</p> : null}
        <div className="entity-header__badges">
          <span className="badge badge--source">{sourceDef.label_en}</span>
          <StatusBadge status={entity.status} />
        </div>
        <p className="entity-header__licno">
          {t('entity.licno')}: <strong>{entity.licno}</strong>
        </p>
      </header>

      <section>
        <h2 className="section-title">{t('entity.details')}</h2>
        <div className="rule-double rule-double--tight" aria-hidden="true" />
        <dl className="meta-grid">
          <div>
            <dt>{t('entity.meta_lic_type')}</dt>
            <dd>
              {entity.lic_type_en ?? t('common.na')}
              {entity.lic_type_en && entity.lic_type_tc ? <div className="tc-line">{entity.lic_type_tc}</div> : null}
            </dd>
          </div>
          <div>
            <dt>{t('entity.meta_district')}</dt>
            <dd>
              {entity.district_en ?? t('common.na')}
              {entity.district_en && entity.district_tc ? <div className="tc-line">{entity.district_tc}</div> : null}
            </dd>
          </div>
          <div>
            <dt>{t('entity.meta_expiry')}</dt>
            <dd>{formatDate(entity.expiry_date)}</dd>
          </div>
          <div>
            <dt>{t('entity.meta_status')}</dt>
            <dd>
              <StatusBadge status={entity.status} />
            </dd>
          </div>
          {isLiquor && entity.serno ? (
            <div>
              <dt>{t('entity.meta_serno')}</dt>
              <dd>{entity.serno}</dd>
            </div>
          ) : null}
          <div>
            <dt>{t('entity.meta_first_seen')}</dt>
            <dd>{formatDate(entity.first_seen_at)}</dd>
          </div>
          <div>
            <dt>{t('entity.meta_last_seen')}</dt>
            <dd>{formatDate(entity.last_seen_at)}</dd>
          </div>
          {entity.address_en || entity.address_tc ? (
            <div>
              <dt>{t('entity.meta_address')}</dt>
              <dd>
                {entity.address_en ?? t('common.na')}
                {entity.address_en && entity.address_tc ? <div className="tc-line">{entity.address_tc}</div> : null}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      {entity.info_en || entity.info_tc ? (
        <section>
          <h2 className="section-title">{t('entity.endorsements')}</h2>
          <div className="rule-double rule-double--tight" aria-hidden="true" />
          {entity.info_en ? <p className="mb-8">{entity.info_en}</p> : null}
          {entity.info_tc ? <p className="tc-line">{entity.info_tc}</p> : null}
        </section>
      ) : null}

      {entity.conditions ? (
        <section>
          <h2 className="section-title">{t('entity.conditions')}</h2>
          <div className="rule-double rule-double--tight" aria-hidden="true" />
          <div className="conditions-block">{entity.conditions}</div>
        </section>
      ) : null}

      {data.enrichment_entitled && data.attributes.length > 0 ? (
        <section>
          <h2 className="section-title">{t('entity.cuisine')}</h2>
          <div className="rule-double rule-double--tight" aria-hidden="true" />
          <ul className="chip-list">
            {data.attributes
              .filter((a) => a.kind === 'cuisine' || a.kind === 'category')
              .map((a, i) => (
                <li className="chip" key={`${a.kind}-${i}`}>
                  {a.value}
                  <span className="chip__src">
                    {t('entity.contact_via', { source: a.source_name, date: formatDate(a.retrieved_at) })}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="section-title">{t('entity.history')}</h2>
        <div className="rule-double rule-double--tight" aria-hidden="true" />
        {data.signals.length === 0 ? (
          <p className="notice">{t('entity.history_empty')}</p>
        ) : (
          <div className="signal-list">
            {data.signals.map((sig) => (
              <SignalCardLite key={sig.id} signal={sig} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title">{t('entity.contacts')}</h2>
        <div className="rule-double rule-double--tight" aria-hidden="true" />
        {!data.enrichment_entitled ? (
          <div className="attribution-box">
            <p className="tier-card__tier">{t('entity.contacts_premium_title')}</p>
            <p className="notice" style={{ marginTop: 8 }}>
              {t('entity.contacts_premium_body')}
            </p>
          </div>
        ) : data.contacts.length === 0 ? (
          <p className="notice">{t('entity.contacts_empty')}</p>
        ) : (
          <ul className="contact-list">
            {data.contacts.map((c, i) => (
              <ContactLine key={`${c.kind}-${i}`} contact={c} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="section-title">{t('entity.find_elsewhere')}</h2>
        <div className="rule-double rule-double--tight" aria-hidden="true" />
        <p className="notice">{t('entity.find_elsewhere_note')}</p>
        <div className="link-out-row mt-8">
          <a
            className="btn btn--secondary"
            target="_blank"
            rel="noreferrer"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              [entity.name_en ?? entity.name_tc, entity.address_en ?? ''].filter(Boolean).join(' ')
            )}`}
          >
            {t('entity.find_google')}
          </a>
          <a
            className="btn btn--secondary"
            target="_blank"
            rel="noreferrer"
            href={`https://www.openrice.com/en/hongkong/sr2.htm?querytext=${encodeURIComponent(
              entity.name_en ?? entity.name_tc ?? ''
            )}`}
          >
            {t('entity.find_openrice')}
          </a>
        </div>
      </section>

      <section>
        <h2 className="section-title">{t('entity.attribution')}</h2>
        <div className="rule-double rule-double--tight" aria-hidden="true" />
        {data.attribution.map((a, i) => (
          <div className="attribution-box" key={i} style={i > 0 ? { marginTop: 14 } : undefined}>
            <dl>
              <dt>{t('entity.attr_dataset')}</dt>
              <dd>{a.dataset}</dd>
              <dt>{t('entity.attr_provider')}</dt>
              <dd>{a.provider}</dd>
              <dt>{t('common.open_dataset')}</dt>
              <dd>
                <a href={a.dataset_url} target="_blank" rel="noreferrer">
                  {a.dataset_url}
                </a>
              </dd>
              <dt>{t('common.source_file')}</dt>
              <dd>
                <a href={a.file} target="_blank" rel="noreferrer">
                  {a.file}
                </a>
              </dd>
              <dt>{t('entity.attr_coverage')}</dt>
              <dd>{a.licence_note}</dd>
            </dl>
          </div>
        ))}
      </section>
    </div>
  );
}

/* Compact signal row for the entity's own history (no entity link needed). */
function SignalCardLite({ signal }: { signal: EntityDetailResponse['signals'][number] }) {
  const { t } = useTranslation();
  return (
    <article className="card">
      <div className="signal-card__head" style={{ marginBottom: 0 }}>
        <SignalBadge type={signal.type} />
        <span className="signal-card__date">
          {t('signals.page.detected')} {formatDate(signal.detected_at)}
        </span>
      </div>
      {signal.detail?.changed && signal.detail.changed.length > 0 ? (
        <ul className="change-list mt-8">
          {signal.detail.changed.map((c, i) => (
            <li key={`${c.field}-${i}`}>
              <span className="change-list__field">{signalFieldLabel(c.field, t)}</span>
              <span className="change-list__from">{c.from ?? t('common.na')}</span>
              <span aria-hidden="true">→</span>
              <span className="change-list__to">{c.to ?? t('common.na')}</span>
            </li>
          ))}
        </ul>
      ) : signal.type === 'expiring_soon' && (signal.detail?.expiry_date ?? signal.entity.expiry_date) ? (
        <p className="notice mt-8">
          {t('signals.page.expires_on', { date: formatDate(signal.detail?.expiry_date ?? signal.entity.expiry_date) })}
        </p>
      ) : null}
      <p className="notice mt-8">{t(`signals.explain.${signal.type}`)}</p>
    </article>
  );
}

function ContactLine({ contact }: { contact: ContactRecord }) {
  const { t } = useTranslation();
  const kindLabel =
    contact.kind === 'website'
      ? t('entity.contact_website')
      : contact.kind === 'phone'
        ? t('entity.contact_phone')
        : t('entity.contact_social');
  const isHttp = contact.value.startsWith('http://') || contact.value.startsWith('https://');
  const isTel = contact.kind === 'phone';
  return (
    <li>
      <span className="change-list__field">{kindLabel}</span>{' '}
      {isHttp ? (
        <a href={contact.value} target="_blank" rel="noreferrer">
          {contact.value}
        </a>
      ) : isTel ? (
        <a href={`tel:${contact.value}`}>{contact.value}</a>
      ) : (
        contact.value
      )}{' '}
      <span className="notice">
        {t('entity.contact_via', { source: contact.source_name, date: formatDate(contact.retrieved_at) })}
      </span>
      {contact.source_url ? (
        <>
          {' · '}
          <a href={contact.source_url} target="_blank" rel="noreferrer">
            {contact.source_url}
          </a>
        </>
      ) : null}
    </li>
  );
}
