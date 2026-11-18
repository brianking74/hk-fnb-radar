// Registry of the three public licence datasets that power the platform.
// All data is published by the Hong Kong Government on DATA.GOV.HK and
// refreshed daily at 09:00 HKT. Source attribution is mandatory everywhere
// this data is displayed.

import type { SourceId } from './types';

export interface SourceDef {
  id: SourceId;
  label_en: string;
  provider: string;
  /** Root XML element wrapping all records. */
  record_tag: 'LP' | 'LLP';
  files: { en: string; tc: string };
  dataset_url: string;
  licence_note: string;
}

export const SOURCES: Record<SourceId, SourceDef> = {
  restaurants: {
    id: 'restaurants',
    label_en: 'Restaurant licences',
    provider: 'Food and Environmental Hygiene Department (FEHD)',
    record_tag: 'LP',
    files: {
      en: 'https://www.fehd.gov.hk/english/licensing/license/text/LP_Restaurants_EN.XML',
      tc: 'https://www.fehd.gov.hk/tc_chi/licensing/license/text/LP_Restaurants_TC.XML'
    },
    dataset_url: 'https://data.gov.hk/en-data/dataset/hk-fehd-fehdlmis-restaurant-licences',
    licence_note:
      'General Restaurant, Light Refreshment Restaurant and Marine Restaurant licences issued by FEHD.'
  },
  liquor: {
    id: 'liquor',
    label_en: 'Licensed liquor premises',
    provider: 'Liquor Licensing Board',
    record_tag: 'LLP',
    files: {
      en: 'https://www.fehd.gov.hk/english/licensing/license/text/edatabase_liquor.xml',
      tc: 'https://www.fehd.gov.hk/tc_chi/licensing/license/text/database_liquor.xml'
    },
    dataset_url: 'https://data.gov.hk/en-data/dataset/llb-llbllp-liquor-licences',
    licence_note:
      'Liquor Licence and Club Liquor Licence issued by the Liquor Licensing Board.'
  },
  other_food: {
    id: 'other_food',
    label_en: 'Other food-business licences',
    provider: 'Food and Environmental Hygiene Department (FEHD)',
    record_tag: 'LP',
    files: {
      en: 'https://www.fehd.gov.hk/english/licensing/license/text/LP_OtherFood_EN.XML',
      tc: 'https://www.fehd.gov.hk/tc_chi/licensing/license/text/LP_OtherFood_TC.XML'
    },
    dataset_url: 'https://data.gov.hk/en-data/dataset/hk-fehd-fehdlmis-food-licences',
    licence_note:
      'Food Factory, Bakery, Fresh Provision Shop, Factory Canteen, Cold Store, Frozen Confection Factory, Milk Factory, Siu Mei & Lo Mei Shop and Composite Food Shop licences issued by FEHD.'
  }
};

export const SOURCE_IDS: SourceId[] = ['restaurants', 'liquor', 'other_food'];

export function isSourceId(v: string | undefined | null): v is SourceId {
  return !!v && (SOURCE_IDS as string[]).includes(v);
}
