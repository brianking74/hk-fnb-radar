// Prev/Next pagination with a 'page x of y' label.
import { useTranslation } from 'react-i18next';
import { totalPages } from '../lib/format';

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}

export default function Pagination({ page, pageSize, total, onPage }: Props) {
  const { t } = useTranslation();
  const pages = totalPages(total, pageSize);
  if (total === 0) return null;

  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        ← {t('common.prev')}
      </button>
      <span className="pagination__label">{t('common.page_of', { page, pages })}</span>
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        {t('common.next')} →
      </button>
    </nav>
  );
}
