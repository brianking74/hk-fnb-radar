// /browse — searchable, filterable licence directory with district facet,
// include-absent toggle, sortable-free results table and pagination.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SOURCES, SOURCE_IDS, isSourceId } from '../../shared/sources';
import type { Entity } from '../../shared/types';
import { fetchCuisines, fetchEntities, useApi } from '../lib/api';
import { displayName, formatDate, formatNumber } from '../lib/format';
import { usePageTitle } from '../lib/usePageTitle';
import PageHeading from '../components/PageHeading';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import { ErrorNote, Loading } from '../components/DataState';

const PAGE_SIZE = 25;

export default function Browse() {
  const { t } = useTranslation();
  usePageTitle(`${t('titles.browse')} — HK F&B RADAR`);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const q = searchParams.get('q') ?? '';
  const source = searchParams.get('source') ?? '';
  const district = searchParams.get('district') ?? '';
  const cuisine = searchParams.get('cuisine') ?? '';
  const includeAbsent = searchParams.get('include_absent') === '1';
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

  // Cuisine facets only exist once enrichment data lands; the filter renders
  // itself out when there is nothing to filter on.
  const { data: cuisineData } = useApi((signal) => fetchCuisines(signal), []);
  const cuisines = cuisineData?.cuisines ?? [];

  const [qInput, setQInput] = useState(q);

  // Keep the input in sync when the URL changes (back/forward, dataset links).
  useEffect(() => {
    setQInput(q);
  }, [q]);

  // Debounce typing into the URL (resets pagination).
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (qInput !== q) updateParam('q', qInput);
    }, 350);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  function updateParam(key: string, value: string, keepPage = false) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (!keepPage) next.delete('page');
    setSearchParams(next);
  }

  function setSource(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('source', value);
    else next.delete('source');
    next.delete('district'); // facet differs per source
    next.delete('page');
    setSearchParams(next);
  }

  const validSource = isSourceId(source) ? source : undefined;

  const { data, loading, error, reload } = useApi(
    (signal) =>
      fetchEntities(
        {
          q: q || undefined,
          source: validSource,
          district: district || undefined,
          cuisine: cuisine || undefined,
          include_absent: includeAbsent,
          page,
          page_size: PAGE_SIZE
        },
        signal
      ),
    [q, source, district, cuisine, includeAbsent, page]
  );

  const hasFilters = !!(q || source || district || cuisine || includeAbsent);

  function clearFilters() {
    setQInput('');
    setSearchParams(new URLSearchParams());
  }

  return (
    <div>
      <PageHeading title={t('titles.browse')}>{t('browse.intro')}</PageHeading>

      <div className="filters">
        <div className="field field--grow">
          <label htmlFor="browse-q">{t('browse.search_label')}</label>
          <input
            id="browse-q"
            type="search"
            value={qInput}
            placeholder={t('browse.search_placeholder')}
            onChange={(e) => setQInput(e.target.value)}
          />
        </div>
        <div className="field">
          <span className="field-label" id="browse-source-label">
            {t('browse.source_label')}
          </span>
          <div className="segmented" role="group" aria-labelledby="browse-source-label">
            <button
              type="button"
              className={!source ? 'is-active' : undefined}
              aria-pressed={!source}
              onClick={() => setSource('')}
            >
              {t('browse.source_all')}
            </button>
            {SOURCE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={source === id ? 'is-active' : undefined}
                aria-pressed={source === id}
                onClick={() => setSource(id)}
              >
                {SOURCES[id].label_en}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="browse-district">{t('browse.district_label')}</label>
          <select
            id="browse-district"
            value={district}
            onChange={(e) => updateParam('district', e.target.value)}
          >
            <option value="">{t('browse.district_all')}</option>
            {(data?.districts ?? []).map((d) => (
              <option key={d.en} value={d.en}>
                {d.en} ({formatNumber(d.count)})
              </option>
            ))}
          </select>
        </div>
        {cuisines.length > 0 ? (
          <div className="field">
            <label htmlFor="browse-cuisine">{t('browse.cuisine_label')}</label>
            <select
              id="browse-cuisine"
              value={cuisine}
              onChange={(e) => updateParam('cuisine', e.target.value)}
            >
              <option value="">{t('browse.cuisine_all')}</option>
              {cuisines.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.value} ({formatNumber(c.count)})
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <label className="check" htmlFor="browse-absent">
          <input
            id="browse-absent"
            type="checkbox"
            checked={includeAbsent}
            onChange={(e) => updateParam('include_absent', e.target.checked ? '1' : '')}
          />
          {t('browse.include_absent')}
        </label>
        {hasFilters ? (
          <button type="button" className="btn btn--secondary" onClick={clearFilters}>
            {t('browse.clear_filters')}
          </button>
        ) : null}
      </div>

      {error ? <ErrorNote error={error} onRetry={reload} /> : null}

      {data ? (
        <>
          <p className="result-count">
            {t('browse.count', { count: data.total })}
            {loading ? ` · ${t('common.loading')}` : ''}
          </p>
          {data.items.length === 0 ? (
            <EmptyState title={t('browse.empty_title')} body={t('browse.empty_body')} />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">{t('browse.th_name')}</th>
                    <th scope="col">{t('browse.th_licno')}</th>
                    <th scope="col">{t('browse.th_district')}</th>
                    <th scope="col">{t('browse.th_type')}</th>
                    <th scope="col">{t('browse.th_expiry')}</th>
                    <th scope="col">{t('browse.th_status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((entity) => (
                    <BrowseRow
                      key={entity.id}
                      entity={entity}
                      onOpen={() => navigate(`/entity/${entity.id}`)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            page={data.page}
            pageSize={data.page_size}
            total={data.total}
            onPage={(p) => updateParam('page', String(p), true)}
          />
        </>
      ) : !error ? (
        <Loading />
      ) : null}
    </div>
  );
}

function BrowseRow({ entity, onOpen }: { entity: Entity; onOpen: () => void }) {
  const { t } = useTranslation();
  const name = displayName(entity.name_en, entity.name_tc, entity.licno);
  return (
    <tr className="is-clickable" onClick={onOpen}>
      <td>
        <Link to={`/entity/${entity.id}`}>{name}</Link>
        {entity.name_en && entity.name_tc ? (
          <div className="tc-line">{entity.name_tc}</div>
        ) : null}
      </td>
      <td className="num">{entity.licno}</td>
      <td>
        {entity.district_en ?? t('common.na')}
        {entity.district_en && entity.district_tc ? (
          <div className="tc-line">{entity.district_tc}</div>
        ) : null}
      </td>
      <td>{entity.lic_type_en ?? t('common.na')}</td>
      <td className="num">{formatDate(entity.expiry_date)}</td>
      <td>
        <StatusBadge status={entity.status} />
      </td>
    </tr>
  );
}
