export interface SourceNote {
  key: string
  label: string
  sourceName: string
  sourceUrl: string
  retrievedAt: string
  geography: string
  note: string
}

export const defaults = {
  annualMiles: 10952,
  mpg: 30,
  gasPricePerGallon: 4.452,
  insuranceAnnual: 1126.79,
  maintenancePerMile: 0.028,
  repairsPerMile: 0.017,
  tiresPerMile: 0.012,
}

export const sourceNotes: SourceNote[] = [
  {
    key: 'annualMiles',
    label: 'Annual miles default',
    sourceName: 'FHWA Highway Statistics 2022 VM-1',
    sourceUrl: 'https://www.fhwa.dot.gov/policyinformation/statistics/2022/vm1.cfm',
    retrievedAt: '2026-05-19',
    geography: 'United States',
    note: 'Uses all-vehicle average miles traveled per vehicle: 10,952.',
  },
  {
    key: 'gasPricePerGallon',
    label: 'Fuel price default',
    sourceName: 'EIA Gasoline and Diesel Fuel Update',
    sourceUrl: 'https://www.eia.gov/petroleum/gasdiesel/',
    retrievedAt: '2026-05-19',
    geography: 'United States',
    note: 'Uses U.S. regular gasoline value captured on retrieval date.',
  },
  {
    key: 'insuranceAnnual',
    label: 'Insurance default',
    sourceName: 'Insurance Information Institute citing NAIC',
    sourceUrl: 'https://www.iii.org/fact-statistic/facts-statistics-auto-insurance',
    retrievedAt: '2026-05-19',
    geography: 'United States',
    note: 'Uses 2022 countrywide average auto insurance expenditure: $1,126.79.',
  },
  {
    key: 'modelMpg',
    label: 'Vehicle catalog defaults',
    sourceName: 'NHTSA vPIC API',
    sourceUrl: 'https://vpic.nhtsa.dot.gov/api/',
    retrievedAt: '2026-05-19',
    geography: 'United States',
    note: 'Year/make/model options come from a locally cached NHTSA catalog. MPG and cost fields start from national planning defaults and should be adjusted for your exact trim and driving profile.',
  },
  {
    key: 'maintenancePerMile',
    label: 'Model maintenance/repair/tire defaults',
    sourceName: 'DOE AFDC Vehicle Cost Calculator methodology',
    sourceUrl: 'https://afdc.energy.gov/calc/cost_calculator_methodology.html',
    retrievedAt: '2026-05-19',
    geography: 'United States',
    note: 'Non-fuel model defaults are class-informed planning estimates derived from AAA-style AFDC methodology and should be adjusted for your vehicle and location.',
  },
  {
    key: 'lifetimeMiles',
    label: 'Model lifetime-mile defaults',
    sourceName: 'iSeeCars longest-lasting vehicles study (2025)',
    sourceUrl: 'https://www.iseecars.com/longest-lasting-cars-study',
    retrievedAt: '2026-05-19',
    geography: 'United States',
    note: 'Lifetime miles are model-level planning anchors informed by public longevity distributions and should be overridden for your specific car condition and usage.',
  },
]
