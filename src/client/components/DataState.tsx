// Shared loading / error blocks used by every data-driven page.
import { useTranslation } from 'react-i18next';
import { apiErrorKey } from '../lib/api';

export function Loading({ label }: { label?: string }) {
  const { t } = useTranslation();
  return <div className="loading">{label ?? t('common.loading')}</div>;
}

export function ErrorNote({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="error-note" role="alert">
      <span>{t(apiErrorKey(error))}</span>
      {onRetry ? (
        <button type="button" className="btn btn--secondary" onClick={onRetry}>
          {t('common.retry')}
        </button>
      ) : null}
    </div>
  );
}
