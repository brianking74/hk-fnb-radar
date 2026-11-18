// /wine-spirits — brass-accented specialist view over the liquor dataset:
// stats row, honest framing line, and three tabs (Signals / Expiry watch /
// Directory) backed by the /api/wine-spirits/* endpoints.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Entity, ExpiryItem, SignalType } from '../../shared/types';
import { fetchEntities, fetchWineDirectory, fetchWineExpiry, fetchWineSignals, fetchWineStats, useApi } from '../lib/api';
import { displayName, formatDate, formatDaysLeft, formatNumber } from '../lib/format';
import { usePageTitle } from '../lib/usePageTitle';
import PageHeading from '../components/PageHeading';
import SignalCard from '../components/SignalCard';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import { ErrorNote, Loading } from '../components/DataState';

const PAGE_SIZE = 25;
const SIGNAL_TYPES: SignalType[] = ['new_record', 'licence_changed', 'expiring_soon', 'no_longer_appearing'];
const LICENCE_TYPES = ['Liquor Licence', 'Club Liquor Licence'] as const;
const WINDOW_OPTIONS = [30, 60, 90] as const;

type Tab = 'signals' | 'expiry' | 'directory';

function isTab(v: string | null): Tab {
  return v === 'expiry' || v === 'directory' ? v : 'signals';
}

export default function WineSpirits() {
  const { t } = useTranslation();
  usePageTitle(`${t('titles.wine')} — HK F&B RADAR`);

  const [searchParams, setSearchParams] = useSearchParams();
  const tab = isTab(searchParams.get('tab'));

  const { data: stats, error: statsError, reload: reloadStats } = useApi((signal) => fetchWineStats(signal), []);

  function updateParam(key: string, value: string, keepPage = false) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (!keepPage) next.delete('page');
    setSearchParams(next);
  }

  function clearParams(keys: string[]) {
    const next = new URLSearchParams(searchParams);
    for (const k of keys) next.delete(k);
    next.delete('page');
    setSearchParams(next);
  }

  // Liquor district facet for all three tabs.
  const facets = useApi((signal) => fetchEntities({ source: 'liquor', page_size: 1 }, signal), []);

  return (
    <div>
      <PageHeading kicker={t('wine.kicker')} kickerBrass title={t('titles.wine')}>
        <p>{t('wine.framing')}</p>
      </PageHeading>

      {statsError ? (
        <ErrorNote error={statsError} onRetry={reloadStats} />
      ) : stats ? (
        <div className="stats-band" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div>
            <div className="stat__value">{formatNumber(stats.total_liquor)}</div>
            <div className="stat__label">{t('wine.stat_total')}</div>
          </div>
          <div>
            <div className="stat__value">{formatNumber(stats.liquor_licences)}</div>
            <div className="stat__label">{t('wine.stat_liquor')}</div>
          </div>
          <div>
            <div className="stat__value">{formatNumber(stats.club_licences)}</div>
            <div className="stat__label">{t('wine.stat_club')}</div>
          </div>
          <div>
            <div className="stat__value stat__value--brass">{formatNumber(stats.expiring_in_window)}</div>
            <div className="stat__label">{t('wine.stat_expiring', { days: stats.window_days })}</div>
          </div>
        </div>
      ) : (
        <Loading />
      )}

      <div className="tabs" role="tablist">
        {(['signals', 'expiry', 'directory'] as Tab[]).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'is-active' : undefined}
            onClick={() => updateParam('tab', id === 'signals' ? '' : id, true)}
          >
            {t(`wine.tab_${id}`)}
          </button>
        ))}
      </div>

      {tab === 'signals' ? (
        <WineSignalsTab districtOptions={facets.data?.districts ?? []} updateParam={updateParam} clearParams={clearParams} searchParams={searchParams} />
      ) : tab === 'expiry' ? (
        <WineExpiryTab districtOptions={facets.data?.districts ?? []} updateParam={updateParam} clearParams={clearParams} searchParams={searchParams} />
      ) : (
        <WineDirectoryTab districtOptions={facets.data?.districts ?? []} updateParam={updateParam} clearParams={clearParams} searchParams={searchParams} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ signals */

function WineSignalsTab({
  districtOptions,
  updateParam,
  clearParams,
  searchParams
}: TabProps) {
  const { t } = useTranslation();
  const type = searchParams.get('type') ?? '';
  const district = searchParams.get('district') ?? '';
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const validType = (SIGNAL_TYPES as string[]).includes(type) ? (type as SignalType) : undefined;

  const { data, loading, error, reload } = useApi(
    (signal) =>
      fetchWineSignals({ type: validType, district: district || undefined, page, page_size: PAGE_SIZE }, signal),
    [type, district, page]
  );

  const hasFilters = !!(type || district);

  return (
    <div>
      <div className="chips" role="group" aria-label={t('wine.filter_type_all')}>
        <button
          type="button"
          className={`chip${!type ? ' is-active' : ''}`}
          aria-pressed={!type}
          onClick={() => updateParam('type', '')}
        >
          {t('wine.filter_type_all')}
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
          <label htmlFor="wine-district">{t('wine.filter_district')}</label>
          <select id="wine-district" value={district} onChange={(e) => updateParam('district', e.target.value)}>
            <option value="">{t('wine.filter_district_all')}</option>
            {districtOptions.map((d) => (
              <option key={d.en} value={d.en}>
                {d.en} ({formatNumber(d.count)})
              </option>
            ))}
          </select>
        </div>
        {hasFilters ? (
          <button type="button" className="btn btn--secondary" onClick={() => clearParams(['type', 'district'])}>
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

/* ------------------------------------------------------------------- expiry */

function WineExpiryTab({ districtOptions, updateParam, searchParams }: TabProps) {
  const { t } = useTranslation();
  const district = searchParams.get('district') ?? '';
  const windowRaw = Number.parseInt(searchParams.get('window') ?? '', 10);
  const windowDays = Number.isFinite(windowRaw) && windowRaw > 0 ? windowRaw : undefined;
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const { data, loading, error, reload } = useApi(
    (signal) =>
      fetchWineExpiry({ window: windowDays, district: district || undefined, page, page_size: PAGE_SIZE }, signal),
    [windowDays, district, page]
  );

  return (
    <div>
      <div className="filters" style={{ marginTop: 0 }}>
        <div className="field">
          <label htmlFor="expiry-window">{t('wine.window_label')}</label>
          <select
            id="expiry-window"
            value={windowDays ? String(windowDays) : ''}
            onChange={(e) => updateParam('window', e.target.value)}
          >
            <option value="">{t('wine.window_full')}</option>
            {WINDOW_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {t('wine.window_days', { days: d })}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="expiry-district">{t('wine.filter_district')}</label>
          <select id="expiry-district" value={district} onChange={(e) => updateParam('district', e.target.value)}>
            <option value="">{t('wine.filter_district_all')}</option>
            {districtOptions.map((d) => (
              <option key={d.en} value={d.en}>
                {d.en} ({formatNumber(d.count)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <ErrorNote error={error} onRetry={reload} /> : null}
      {data ? (
        <>
          <p className="result-count">
            {t('wine.count', { count: data.total })}
            {loading ? ` · ${t('common.loading')}` : ''}
          </p>
          {data.items.length === 0 ? (
            <EmptyState title={t('wine.empty_expiry_title')} body={t('wine.empty_expiry_body')} />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">{t('wine.th_name')}</th>
                    <th scope="col">{t('wine.th_licno')}</th>
                    <th scope="col">{t('wine.th_district')}</th>
                    <th scope="col">{t('wine.th_type')}</th>
                    <th scope="col">{t('wine.th_expiry')}</th>
                    <th scope="col">{t('wine.th_days_left')}</th>
                    <th scope="col">{t('wine.th_status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <ExpiryRow key={item.id} item={item} />
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

function ExpiryRow({ item }: { item: ExpiryItem }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const urgent = item.days_left < 30;
  return (
    <tr className="is-clickable" onClick={() => navigate(`/entity/${item.id}`)}>
      <td>
        <Link to={`/entity/${item.id}`}>{displayName(item.name_en, item.name_tc, item.licno)}</Link>
        {item.name_en && item.name_tc ? <div className="tc-line">{item.name_tc}</div> : null}
      </td>
      <td className="num">{item.licno}</td>
      <td>{item.district_en ?? t('common.na')}</td>
      <td>{item.lic_type_en ?? t('common.na')}</td>
      <td className="num">{formatDate(item.expiry_date)}</td>
      <td className={`num${urgent ? ' is-urgent' : ''}`}>{formatDaysLeft(item.days_left, t)}</td>
      <td>
        <StatusBadge status={item.status} />
      </td>
    </tr>
  );
}

/* ---------------------------------------------------------------- directory */

function WineDirectoryTab({ districtOptions, updateParam, clearParams, searchParams }: TabProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const q = searchParams.get('q') ?? '';
  const district = searchParams.get('district') ?? '';
  const licType = searchParams.get('lic_type') ?? '';
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const [qInput, setQInput] = useState(q);
  useEffect(() => {
    setQInput(q);
  }, [q]);
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (qInput !== q) updateParam('q', qInput);
    }, 350);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  const { data, loading, error, reload } = useApi(
    (signal) =>
      fetchWineDirectory(
        { q: q || undefined, district: district || undefined, lic_type: licType || undefined, page, page_size: PAGE_SIZE },
        signal
      ),
    [q, district, licType, page]
  );

  const hasFilters = !!(q || district || licType);

  return (
    <div>
      <div className="filters" style={{ marginTop: 0 }}>
        <div className="field field--grow">
          <label htmlFor="dir-q">{t('wine.dir_search_label')}</label>
          <input
            id="dir-q"
            type="search"
            value={qInput}
            placeholder={t('wine.dir_search_placeholder')}
            onChange={(e) => setQInput(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="dir-district">{t('wine.filter_district')}</label>
          <select id="dir-district" value={district} onChange={(e) => updateParam('district', e.target.value)}>
            <option value="">{t('wine.filter_district_all')}</option>
            {districtOptions.map((d) => (
              <option key={d.en} value={d.en}>
                {d.en} ({formatNumber(d.count)})
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="dir-type">{t('wine.dir_type_label')}</label>
          <select id="dir-type" value={licType} onChange={(e) => updateParam('lic_type', e.target.value)}>
            <option value="">{t('wine.dir_type_all')}</option>
            {LICENCE_TYPES.map((lt) => (
              <option key={lt} value={lt}>
                {lt}
              </option>
            ))}
          </select>
        </div>
        {hasFilters ? (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              setQInput('');
              clearParams(['q', 'district', 'lic_type']);
            }}
          >
            {t('browse.clear_filters')}
          </button>
        ) : null}
      </div>

      {error ? <ErrorNote error={error} onRetry={reload} /> : null}
      {data ? (
        <>
          <p className="result-count">
            {t('wine.count', { count: data.total })}
            {loading ? ` · ${t('common.loading')}` : ''}
          </p>
          {data.items.length === 0 ? (
            <EmptyState title={t('wine.empty_dir_title')} body={t('wine.empty_dir_body')} />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">{t('wine.th_name')}</th>
                    <th scope="col">{t('wine.th_licno')}</th>
                    <th scope="col">{t('wine.th_district')}</th>
                    <th scope="col">{t('wine.th_type')}</th>
                    <th scope="col">{t('wine.th_expiry')}</th>
                    <th scope="col">{t('wine.th_status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((entity) => (
                    <DirectoryRow key={entity.id} entity={entity} onOpen={() => navigate(`/entity/${entity.id}`)} />
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

function DirectoryRow({ entity, onOpen }: { entity: Entity; onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <tr className="is-clickable" onClick={onOpen}>
      <td>
        <Link to={`/entity/${entity.id}`}>{displayName(entity.name_en, entity.name_tc, entity.licno)}</Link>
        {entity.name_en && entity.name_tc ? <div className="tc-line">{entity.name_tc}</div> : null}
      </td>
      <td className="num">{entity.licno}</td>
      <td>{entity.district_en ?? t('common.na')}</td>
      <td>{entity.lic_type_en ?? t('common.na')}</td>
      <td className="num">{formatDate(entity.expiry_date)}</td>
      <td>
        <StatusBadge status={entity.status} />
      </td>
    </tr>
  );
}

interface TabProps {
  districtOptions: { en: string; tc: string | null; count: number }[];
  updateParam: (key: string, value: string, keepPage?: boolean) => void;
  clearParams: (keys: string[]) => void;
  searchParams: URLSearchParams;
}
