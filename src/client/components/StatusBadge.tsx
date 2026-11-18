// Entity status badge: active → green tint, absent → grey.
import { useTranslation } from 'react-i18next';
import type { EntityStatus } from '../../shared/types';

export default function StatusBadge({ status }: { status: EntityStatus }) {
  const { t } = useTranslation();
  const cls = status === 'active' ? 'badge--status-active' : 'badge--status-absent';
  return <span className={`badge ${cls}`}>{t(`status.${status}`)}</span>;
}
