// Signal type badge — colours are semantically fixed:
// new_record → tram green · licence_changed → brass ·
// expiring_soon → signage red · no_longer_appearing → neutral charcoal outline.
import { useTranslation } from 'react-i18next';
import type { SignalType } from '../../shared/types';

const CLASS_BY_TYPE: Record<SignalType, string> = {
  new_record: 'badge--new',
  licence_changed: 'badge--changed',
  expiring_soon: 'badge--expiring',
  no_longer_appearing: 'badge--gone'
};

export default function SignalBadge({ type }: { type: SignalType }) {
  const { t } = useTranslation();
  return <span className={`badge ${CLASS_BY_TYPE[type]}`}>{t(`signals.type.${type}`)}</span>;
}
