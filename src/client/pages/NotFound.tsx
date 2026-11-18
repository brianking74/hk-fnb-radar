// 404 route.
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../lib/usePageTitle';

export default function NotFound() {
  const { t } = useTranslation();
  usePageTitle(`${t('titles.not_found')} — HK F&B RADAR`);

  return (
    <div className="empty" style={{ marginTop: 40 }}>
      <p className="kicker kicker--brass">{t('notfound.code')}</p>
      <h1 className="page-title" style={{ fontSize: 32 }}>
        {t('notfound.title')}
      </h1>
      <p>{t('notfound.body')}</p>
      <div className="mt-24">
        <Link to="/" className="btn btn--primary">
          {t('notfound.cta')}
        </Link>
      </div>
    </div>
  );
}
