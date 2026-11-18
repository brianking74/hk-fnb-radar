// /signals — the daily change feed with honest semantics, type chips,
// source/district filters, SignalCard list and the free-tier lookback note.
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SOURCES, SOURCE_IDS, isSourceId } from '../../shared/sources';
import type { SignalType } from '../../shared/types';
import { fetchEntities, fetchSignals, useApi } from '../lib/api';
import { formatNumber } from '../lib/format';
import { usePageTitle } from '../lib/usePageTitle';
import PageHeading from '../components/PageHeading';
import SignalCard from '../components/SignalCard';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import { ErrorNote, Loading } from '../components/DataState';

const PAGE_SIZE = 25;

const SIGNAL_TYPES: SignalType[] = [
  'new_record',
  'licence_changed',
  'expiring_soon',
  'no_longer_appearing'
];

export default function Signals() {
  const { t } = useTranslation();
  usePageTitle(`${t('titles.signals')} — HK F&B RADAR`);

  const [searchParams, setSearchParams] = useSearchParams();

  const type = searchParams.get('type') ?? '';
  const source = searchParams.get('source') ?? '';
  const district = searchParams.get('district') ?? '';
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

  function updateParam(key: string, value: string, keepPage = false) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (!keepPage) next.delete('page');
    setSearchParams(next);
  }

  // District facet: /api/entities returns a districts facet regardless of
  // page size — fetch the minimum to populate the filter.
  const facets = useApi((signal) => fetchEntities({ page_size: 1 }, signal), []);

  const validType = (SIGNAL_TYPES as string[]).includes(type) ? (type as SignalType) : undefined;
  const validSource = isSourceId(source) ? source : undefined;

  const { data, loading, error, reload } = useApi(
    (signal) =>
      fetchSignals(
        {
          type: validType,
          source: validSource,
          district: district || undefined,
          page,
          page_size: PAGE_SIZE
        },
        signal
      ),
    [type, source, district, page]
  );

  const hasFilters = !!(type || source || district);

  return (
    <div>
      <PageHeading title={t('titles.signals')}>
        <p>{t('signals.page.intro')}</p>
      </PageHeading>

      <div className="banner banner--tram">
        <p>
          <strong>{t('signals.type.new_record')}</strong> — {t('signals.explain.new_record')}{' '}
          <strong>{t('signals.type.no_longer_appearing')}</strong> — {t('signals.explain.no_longer_appearing')}
        </p>
      </div>

      <div className="chips" role="group" aria-label={t('signals.page.filter_type_all')}>
        <button
          type="button"
          className={`chip${!type ? ' is-active' : ''}`}
          aria-pressed={!type}
          onClick={() => updateParam('type', '')}
        >
          {t('signals.page.filter_type_all')}
        </button>
        {SIGNAL_TYPES.map((st) => (
          <button
            key={st}
            type="button"
            className={`chip${type === st ? ' is-active' : ''}`}
            aria-pressed={type === st}
            onClick={() => updateParam('type', st)}
          >
            {t(`signals.type.${st}`)}
          </button>
        ))}
      </div>

      <div className="filters" style={{ marginTop: 0 }}>
        <div className="field">
          <label htmlFor="signals-source">{t('signals.page.filter_source')}</label>
          <select
            id="signals-source"
            value={source}
            onChange={(e) => updateParam('source', e.target.value)}
          >
            <option value="">{t('signals.page.filter_source_all')}</option>
            {SOURCE_IDS.map((id) => (
              <option key={id} value={id}>
                {SOURCES[id].label_en}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="signals-district">{t('signals.page.filter_district')}</label>
          <select
            id="signals-district"
            value={district}
            onChange={(e) => updateParam('district', e.target.value)}
          >
            <option value="">{t('signals.page.filter_district_all')}</option>
            {(facets.data?.districts ?? []).map((d) => (
              <option key={d.en} value={d.en}>
                {d.en} ({formatNumber(d.count)})
              </option>
            ))}
          </select>
        </div>
        {hasFilters ? (
          <button type="button" className="btn btn--secondary" onClick={() => setSearchParams(new URLSearchParams())}>
            {t('browse.clear_filters')}
          </button>
        ) : null}
      </div>

      {error ? <ErrorNote error={error} onRetry={reload} /> : null}

      {data ? (
        <>
          <p className="result-count">
            {t('signals.page.count', { count: data.total })}
            {loading ? ` · ${t('common.loading')}` : ''}
          </p>
          {data.items.length === 0 ? (
            hasFilters ? (
              <EmptyState
                title={t('signals.page.empty_filtered_title')}
                body={t('signals.page.empty_filtered_body')}
              />
            ) : (
              <EmptyState title={t('signals.page.empty_title')} body={t('signals.page.empty_body')} />
            )
          ) : (
            <div className="signal-list">
              {data.items.map((item) => (
                <SignalCard key={item.id} item={item} />
              ))}
            </div>
          )}
          <Pagination
            page={data.page}
            pageSize={data.page_size}
            total={data.total}
            onPage={(p) => updateParam('page', String(p), true)}
          />
          <p className="notice mt-24">{t('signals.page.free_note')}</p>
        </>
      ) : !error ? (
        <Loading />
      ) : null}
    </div>
  );
}
