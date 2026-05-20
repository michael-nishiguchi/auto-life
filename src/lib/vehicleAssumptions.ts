export interface VehicleAssumptions {
  combinedMpg: number
  lifetimeMiles: number
}

interface ModelRule {
  make: string
  modelIncludes: string[]
  combinedMpg: number
  lifetimeMiles: number
}

const modelRules: ModelRule[] = [
  { make: 'toyota', modelIncludes: ['camry'], combinedMpg: 32, lifetimeMiles: 220000 },
  { make: 'toyota', modelIncludes: ['corolla'], combinedMpg: 35, lifetimeMiles: 230000 },
  { make: 'toyota', modelIncludes: ['rav4'], combinedMpg: 30, lifetimeMiles: 230000 },
  { make: 'honda', modelIncludes: ['accord'], combinedMpg: 33, lifetimeMiles: 220000 },
  { make: 'honda', modelIncludes: ['civic'], combinedMpg: 35, lifetimeMiles: 220000 },
  { make: 'honda', modelIncludes: ['cr-v', 'crv'], combinedMpg: 30, lifetimeMiles: 230000 },
  { make: 'ford', modelIncludes: ['f-150', 'f150'], combinedMpg: 22, lifetimeMiles: 250000 },
  { make: 'chevrolet', modelIncludes: ['silverado'], combinedMpg: 21, lifetimeMiles: 240000 },
  { make: 'nissan', modelIncludes: ['altima'], combinedMpg: 32, lifetimeMiles: 200000 },
  { make: 'nissan', modelIncludes: ['rogue'], combinedMpg: 30, lifetimeMiles: 210000 },
  { make: 'hyundai', modelIncludes: ['elantra'], combinedMpg: 36, lifetimeMiles: 200000 },
  { make: 'kia', modelIncludes: ['sportage'], combinedMpg: 28, lifetimeMiles: 200000 },
  { make: 'subaru', modelIncludes: ['outback'], combinedMpg: 29, lifetimeMiles: 220000 },
  { make: 'subaru', modelIncludes: ['forester'], combinedMpg: 29, lifetimeMiles: 220000 },
  { make: 'tesla', modelIncludes: ['model 3', 'model y', 'model s', 'model x'], combinedMpg: 120, lifetimeMiles: 250000 },
]

function normalize(text: string): string {
  return text.toLowerCase().trim()
}

function yearMpgAdjustment(year: number): number {
  const baselineYear = 2018
  const delta = year - baselineYear
  return Math.max(-2.5, Math.min(2.5, delta * 0.15))
}

function inferClassDefaults(model: string): VehicleAssumptions {
  const m = normalize(model)

  if (m.includes('hybrid') || m.includes('prius')) {
    return { combinedMpg: 47, lifetimeMiles: 230000 }
  }

  if (m.includes('ev') || m.includes('electric') || m.includes('model 3') || m.includes('model y') || m.includes('model s') || m.includes('model x')) {
    return { combinedMpg: 110, lifetimeMiles: 240000 }
  }

  if (m.includes('pickup') || m.includes('f-150') || m.includes('silverado') || m.includes('ram ') || m.includes('tacoma')) {
    return { combinedMpg: 21, lifetimeMiles: 245000 }
  }

  if (m.includes('suv') || m.includes('crossover') || m.includes('rav4') || m.includes('cr-v') || m.includes('rogue') || m.includes('pilot') || m.includes('highlander')) {
    return { combinedMpg: 28, lifetimeMiles: 225000 }
  }

  return { combinedMpg: 32, lifetimeMiles: 215000 }
}

export function getVehicleAssumptions(year: number, make: string, model: string): VehicleAssumptions {
  const normalizedMake = normalize(make)
  const normalizedModel = normalize(model)

  const rule = modelRules.find((entry) => {
    if (entry.make !== normalizedMake) {
      return false
    }
    return entry.modelIncludes.some((needle) => normalizedModel.includes(needle))
  })

  const base = rule ?? inferClassDefaults(normalizedModel)
  const adjustedMpg = Math.max(10, Math.round((base.combinedMpg + yearMpgAdjustment(year)) * 10) / 10)

  return {
    combinedMpg: adjustedMpg,
    lifetimeMiles: base.lifetimeMiles,
  }
}
