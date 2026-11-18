// Shared API contract between the Cloudflare Worker and the React client.

export type SourceId = 'restaurants' | 'liquor' | 'other_food';
export type SignalType = 'new_record' | 'licence_changed' | 'expiring_soon' | 'no_longer_appearing';
export type Tier = 'free' | 'professional' | 'business';
export type EntityStatus = 'active' | 'absent';

export interface Entity {
  id: number;
  source: SourceId;
  licno: string;
  name_en: string | null;
  name_tc: string | null;
  address_en: string | null;
  address_tc: string | null;
  lic_type_en: string | null;
  lic_type_tc: string | null;
  district_en: string | null;
  district_tc: string | null;
  info_en: string | null;
  info_tc: string | null;
  conditions: string | null;
  serno: string | null;
  expiry_date: string | null;
  status: EntityStatus;
  first_seen_at: string;
  last_seen_at: string;
}

export interface EntitySummary {
  id: number;
  source: SourceId;
  licno: string;
  name_en: string | null;
  name_tc: string | null;
  district_en: string | null;
  district_tc: string | null;
  lic_type_en: string | null;
  expiry_date: string | null;
  status: EntityStatus;
}

export interface FieldChange {
  field: string;
  from: string | null;
  to: string | null;
}

export interface SignalDetail {
  changed?: FieldChange[];
  expiry_date?: string | null;
  seen_before?: boolean;
  baseline?: boolean;
}

export interface Signal {
  id: number;
  entity_id: number;
  source: SourceId;
  type: SignalType;
  detected_at: string;
  detail: SignalDetail | null;
}

export interface SignalListItem extends Signal {
  entity: EntitySummary;
}

export interface ContactRecord {
  kind: 'website' | 'phone' | 'social';
  value: string;
  source_name: string;
  source_url: string | null;
  retrieved_at: string;
}

export interface SourceAttribution {
  dataset: string;
  provider: string;
  dataset_url: string;
  file: string;
  licence_note: string;
}

export interface SnapshotInfo {
  source: SourceId;
  generation_date: string | null;
  captured_at: string;
  record_count: number;
  is_baseline: boolean;
}

export interface MetaResponse {
  totals: Record<SourceId | 'all', number>;
  signals_last7d: Record<SignalType, number>;
  snapshots: SnapshotInfo[];
  platform: {
    launched_at: string;
    data_updated_at: string | null;
  };
}

export interface Paginated<T> {
  total: number;
  page: number;
  page_size: number;
  items: T[];
}

export interface EntitiesResponse extends Paginated<Entity> {
  districts: { en: string; tc: string | null; count: number }[];
}

export interface EntityDetailResponse {
  entity: Entity;
  signals: SignalListItem[];
  contacts: ContactRecord[];
  attribution: SourceAttribution[];
}

export interface SignalsResponse extends Paginated<SignalListItem> {}

export interface WineSpiritsStats {
  total_liquor: number;
  liquor_licences: number;
  club_licences: number;
  expiring_in_window: number;
  window_days: number;
}

export interface ExpiryItem extends Entity {
  days_left: number;
}

export interface ApiError {
  error: string;
}
