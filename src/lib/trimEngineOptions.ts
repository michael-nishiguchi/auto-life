export interface TrimEngineOption {
  id: string
  label: string
  mpg: number
}

interface VehicleKey {
  make: string
  modelIncludes: string[]
  fromYear?: number
  toYear?: number
  options: Array<{ id: string; label: string; mpg: number }>
}

const vehicleSpecificOptions: VehicleKey[] = [
  {
    make: 'ford',
    modelIncludes: ['maverick'],
    options: [
      { id: 'maverick-hybrid-2.5l', label: '2.5L Hybrid', mpg: 37 },
      { id: 'maverick-ecoboost-2.0t', label: '2.0L EcoBoost', mpg: 25 },
    ],
  },
  {
    make: 'ford',
    modelIncludes: ['f-150', 'f150'],
    options: [
      { id: 'f150-2.7-ecoboost', label: '2.7L EcoBoost', mpg: 21 },
      { id: 'f150-5.0-v8', label: '5.0L V8', mpg: 19 },
      { id: 'f150-3.5-hybrid', label: '3.5L PowerBoost Hybrid', mpg: 24 },
    ],
  },
  {
    make: 'toyota',
    modelIncludes: ['camry'],
    fromYear: 2025,
    options: [{ id: 'camry-hybrid', label: 'Hybrid', mpg: 51 }],
  },
  {
    make: 'toyota',
    modelIncludes: ['camry'],
    toYear: 2024,
    options: [
      { id: 'camry-2.5l', label: '2.5L Gas', mpg: 32 },
      { id: 'camry-3.5-v6', label: '3.5L V6', mpg: 26 },
      { id: 'camry-hybrid', label: 'Hybrid', mpg: 52 },
    ],
  },
  {
    make: 'honda',
    modelIncludes: ['accord'],
    options: [
      { id: 'accord-1.5t', label: '1.5T Gas', mpg: 32 },
      { id: 'accord-2.0t', label: '2.0T Gas', mpg: 26 },
      { id: 'accord-hybrid', label: 'Hybrid', mpg: 44 },
    ],
  },
]

function roundMpg(value: number): number {
  return Math.max(8, Math.round(value * 10) / 10)
}

export function getTrimEngineOptions(year: number, make: string, model: string, baseMpg: number): TrimEngineOption[] {
  const normalizedMake = make.toLowerCase().trim()
  const normalizedModel = model.toLowerCase().trim()

  const specific = vehicleSpecificOptions.find(
    (entry) =>
      entry.make === normalizedMake &&
      entry.modelIncludes.some((snippet) => normalizedModel.includes(snippet)) &&
      (entry.fromYear === undefined || year >= entry.fromYear) &&
      (entry.toYear === undefined || year <= entry.toYear),
  )

  if (specific) {
    return specific.options.map((option) => ({ ...option, mpg: roundMpg(option.mpg) }))
  }

  return [
    { id: 'base', label: 'Base / Mixed Trim', mpg: roundMpg(baseMpg) },
    { id: 'efficiency', label: 'Efficiency-Oriented Trim', mpg: roundMpg(baseMpg * 1.12) },
    { id: 'performance', label: 'Performance-Oriented Trim', mpg: roundMpg(baseMpg * 0.88) },
  ]
}
