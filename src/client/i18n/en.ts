// English resource — the complete string set. Every UI string lives here;
// zh-HK carries only the translated keys and falls back to this file.
const en = {
  brand: 'HK F&B RADAR',
  nav: {
    home: 'Home',
    browse: 'Browse licences',
    signals: 'Signals',
    wine: 'Wine & Spirits',
    methodology: 'Methodology',
    pricing: 'Pricing'
  },
  header: {
    lang_label: 'Switch language',
    skip: 'Skip to content'
  },
  footer: {
    text:
      'Source data: Food and Environmental Hygiene Department & Liquor Licensing Board via DATA.GOV.HK, updated daily 09:00 HKT. HK F&B RADAR is an independent platform and is not affiliated with any government department.'
  },
  common: {
    loading: 'Loading…',
    error_generic: 'Something went wrong loading this data. Please try again.',
    error_not_found: 'This data could not be found.',
    error_network: 'Could not reach the server. Check your connection and try again.',
    retry: 'Retry',
    na: '—',
    all: 'All',
    prev: 'Previous',
    next: 'Next',
    page_of: 'Page {{page}} of {{pages}}',
    back_home: 'Back to home',
    open_dataset: 'Open dataset',
    source_file: 'Source file'
  },
  status: {
    active: 'Active',
    absent: 'Absent'
  },
  days_left: {
    zero: 'Expires today',
    one: '1 day left',
    other: '{{count}} days left'
  },
  fields: {
    name_en: 'Name (English)',
    name_tc: 'Name (Chinese)',
    address_en: 'Address (English)',
    address_tc: 'Address (Chinese)',
    lic_type_en: 'Licence type (English)',
    lic_type_tc: 'Licence type (Chinese)',
    district_en: 'District (English)',
    district_tc: 'District (Chinese)',
    info_en: 'Endorsements (English)',
    info_tc: 'Endorsements (Chinese)',
    conditions: 'Conditions',
    serno: 'Serial no.',
    expiry_date: 'Expiry date'
  },
  titles: {
    home: 'HK F&B RADAR — Hong Kong F&B licence intelligence',
    browse: 'Browse licences',
    signals: 'Signals',
    wine: 'Wine & Spirits Opportunities',
    entity: 'Licence record',
    methodology: 'Methodology',
    pricing: 'Pricing',
    not_found: 'Page not found'
  },
  hero: {
    tagline: "Hong Kong's licence-intelligence platform for food & beverage suppliers."
  },
  landing: {
    kicker: 'HONG KONG FOOD & BEVERAGE LICENCE INTELLIGENCE',
    title: 'See Hong Kong’s licensed F&B market change — daily.',
    cta_browse: 'Browse licences',
    cta_wine: 'Wine & Spirits opportunities',
    stats_loading: 'Loading live figures…',
    stats_error: 'Live figures are temporarily unavailable.',
    stat_total: 'Licensed records',
    stat_signals: 'Signals · last 7 days',
    stat_updated: 'Data updated',
    updated_at: 'Updated {{date}}',
    datasets_title: 'Official data sources',
    datasets_intro:
      'Every record on this platform is drawn from a Hong Kong government open dataset, refreshed daily and attributed in full.',
    dataset_cta: 'Browse this dataset',
    signals_title: 'What the signals mean',
    signals_intro:
      'HK F&B RADAR snapshots the official datasets every morning and reports what changed. Signals are observations of data change — not verified business events.',
    signals_baseline:
      'The first snapshot after launch is the baseline; change signals begin with the second snapshot.',
    audience_title: 'Built for',
    audience_wine: 'Wine distributors',
    audience_beverage: 'Beverage suppliers',
    audience_food: 'Food distributors',
    audience_equipment: 'Hospitality equipment suppliers',
    audience_service: 'Restaurant service providers',
    pricing_title: 'Free during public beta',
    pricing_text: 'The platform is free during public beta. Professional plans launch with Release 2.',
    pricing_cta: 'See pricing'
  },
  browse: {
    intro: 'Search every licence record we monitor across the three official datasets.',
    search_label: 'Search',
    search_placeholder: 'Search by name or address…',
    source_label: 'Dataset',
    source_all: 'All datasets',
    district_label: 'District',
    district_all: 'All districts',
    include_absent: 'Show records no longer appearing',
    clear_filters: 'Clear filters',
    count_one: '{{count}} record',
    count_other: '{{count}} records',
    th_name: 'Name',
    th_licno: 'Licence no.',
    th_district: 'District',
    th_type: 'Licence type',
    th_expiry: 'Expiry date',
    th_status: 'Status',
    empty_title: 'No records match these filters',
    empty_body: 'Try a different search term, or clear the filters.'
  },
  signals: {
    type: {
      new_record: 'Newly observed',
      licence_changed: 'Licence updated',
      expiring_soon: 'Expiring soon',
      no_longer_appearing: 'No longer appearing'
    },
    explain: {
      new_record:
        'First appearance in the official source dataset since this platform began monitoring. Not proof that a business has opened.',
      licence_changed:
        'One or more licence fields changed in the official source dataset since the previous snapshot.',
      expiring_soon: 'This licence’s expiry date falls within the monitored window.',
      no_longer_appearing:
        'This record no longer appears in the official source dataset. This is not confirmation of closure — licences lapse, transfer, or the source changes.'
    },
    page: {
      intro:
        'Signals are automated observations of change between daily snapshots of the official government datasets. They are not verified business events.',
      free_note: 'Free plan: last 7 days of signals (server-enforced).',
      filter_type_all: 'All signal types',
      filter_source: 'Source',
      filter_source_all: 'All sources',
      filter_district: 'District',
      filter_district_all: 'All districts',
      detected: 'Detected',
      changed_fields: 'Changed fields',
      expires_on: 'Expires {{date}}',
      count_one: '{{count}} signal',
      count_other: '{{count}} signals',
      empty_title: 'No signals yet',
      empty_body:
        'Signals appear from the second daily snapshot after launch. The first snapshot is the monitoring baseline.',
      empty_filtered_title: 'No signals match these filters',
      empty_filtered_body: 'Try a different signal type, source or district.'
    }
  },
  wine: {
    kicker: 'SPECIALIST VIEW — LIQUOR LICENSING',
    title: 'Wine & Spirits Opportunities',
    framing:
      'Newly observed liquor licences flag venues that may be fitting out or restocking. Expiring licences flag active operators entering renewal. Both are observations from official data — not verified sales leads.',
    stat_total: 'Licensed premises',
    stat_liquor: 'Liquor licences',
    stat_club: 'Club liquor licences',
    stat_expiring: 'Expiring within {{days}} days',
    tab_signals: 'Signals',
    tab_expiry: 'Expiry watch',
    tab_directory: 'Directory',
    filter_type_all: 'All signal types',
    filter_district: 'District',
    filter_district_all: 'All districts',
    window_label: 'Window',
    window_full: 'Full monitored window',
    window_days: 'Next {{days}} days',
    dir_search_label: 'Search',
    dir_search_placeholder: 'Search by name or address…',
    dir_type_label: 'Licence type',
    dir_type_all: 'All licence types',
    th_name: 'Name',
    th_licno: 'Licence no.',
    th_district: 'District',
    th_type: 'Licence type',
    th_expiry: 'Expiry date',
    th_days_left: 'Days left',
    th_status: 'Status',
    count_one: '{{count}} record',
    count_other: '{{count}} records',
    empty_expiry_title: 'No licences expiring in this window',
    empty_expiry_body: 'Try a wider window or a different district.',
    empty_dir_title: 'No premises match these filters',
    empty_dir_body: 'Try a different search term, or clear the filters.'
  },
  entity: {
    licno: 'Licence no.',
    source: 'Source dataset',
    meta_lic_type: 'Licence type',
    meta_district: 'District',
    meta_expiry: 'Expiry date',
    meta_status: 'Status',
    meta_serno: 'Serial no.',
    meta_first_seen: 'First seen',
    meta_last_seen: 'Last seen',
    meta_address: 'Address',
    endorsements: 'Endorsements',
    conditions: 'Conditions',
    history: 'Signal history',
    history_empty: 'No signals recorded for this licence yet.',
    attribution: 'Source attribution',
    attr_dataset: 'Dataset',
    attr_provider: 'Provider',
    attr_coverage: 'Coverage',
    contacts: 'Contacts',
    contacts_empty: 'Contact enrichment is not yet available (planned for a later release).',
    contact_website: 'Website',
    contact_phone: 'Telephone',
    contact_social: 'Social profile',
    contact_via: 'via {{source}} · retrieved {{date}}',
    not_found_title: 'Record not found',
    not_found_body: 'This licence record does not exist or is no longer available.',
    back_browse: 'Back to browse'
  },
  methodology: {
    intro: 'How HK F&B RADAR collects, snapshots and interprets Hong Kong’s official licence data.',
    sources_title: 'Data sources',
    col_dataset: 'Dataset',
    col_provider: 'Provider',
    col_source: 'Source',
    col_coverage: 'Coverage',
    cadence_title: 'Update cadence',
    cadence_body:
      'Source datasets refresh daily at 09:00 HKT. HK F&B RADAR snapshots them at 09:30 HKT and diffs against the previous snapshot.',
    signals_title: 'Signal definitions',
    signals_baseline:
      'The first snapshot after launch is the baseline; change signals begin with the second snapshot.',
    noclaims_title: 'What we do not claim',
    noclaims_body:
      'We never present inferred openings or closures as confirmed facts. “No longer appearing” is a data observation, not a closure record.',
    contacts_title: 'Contact enrichment policy',
    contacts_body:
      'Only publicly available business websites, telephone numbers and social profiles, each with source attribution. Never fabricated. Not yet available — planned for a later release.',
    tiers_title: 'Tier limits',
    tiers_col_tier: 'Tier',
    tiers_col_signals: 'Signals',
    tiers_col_expiry: 'Expiry watch',
    tiers_col_extra: 'Also included',
    tier_free: 'FREE · HK$0/month',
    tier_free_signals: '7-day signals',
    tier_free_expiry: '90-day expiry watch',
    tier_free_extra: '—',
    tier_pro: 'PROFESSIONAL · HK$149/month',
    tier_pro_signals: '90-day signals',
    tier_pro_expiry: '180-day expiry watch',
    tier_pro_extra: 'CSV export · Saved searches',
    tier_business: 'BUSINESS · HK$299/month',
    tier_business_signals: '365-day signals',
    tier_business_expiry: '365-day expiry watch',
    tier_business_extra: 'Saved searches ×200 · API access'
  },
  pricing: {
    intro: 'Simple tiers for suppliers of every size.',
    banner: 'Subscriptions launch in Release 2 — the platform is free during public beta.',
    per_month: '/month',
    free_desc: 'For exploring the Hong Kong F&B market.',
    pro_desc: 'For active business development in Hong Kong F&B.',
    business_desc: 'For teams running the full sales motion.',
    cta_free: 'Start free',
    cta_pro: 'Choose Professional',
    cta_business: 'Choose Business',
    featured: 'Most popular',
    free_f1: '7-day signals',
    free_f2: '90-day expiry watch',
    pro_f1: '90-day signals',
    pro_f2: '180-day expiry watch',
    pro_f3: 'CSV export',
    pro_f4: 'Saved searches',
    business_f1: '365-day signals & expiry watch',
    business_f2: 'Saved searches ×200',
    business_f3: 'API access'
  },
  notfound: {
    code: '404',
    title: 'Page not found',
    body: 'The page you requested does not exist. Check the address or head back home.',
    cta: 'Back to home'
  }
};

export default en;
