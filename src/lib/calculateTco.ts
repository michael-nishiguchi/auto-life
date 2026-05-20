export interface TcoInput {
  annualMiles: number
  mpg: number
  gasPricePerGallon: number
  insuranceAnnual: number
  maintenancePerMile: number
  repairsPerMile: number
  tiresPerMile: number
  lifetimeMiles: number
}

export interface TcoResult {
  annualFuelGallons: number
  annualFuelCost: number
  annualCost: number
  lifetimeYears: number
  lifetimeCost: number
  costPerMile: number
  annualByCategory: {
    insurance: number
    maintenance: number
    repairs: number
    tires: number
    fuel: number
  }
  lifetimeByCategory: {
    insurance: number
    maintenance: number
    repairs: number
    tires: number
    fuel: number
  }
}

export function validateTcoInput(input: TcoInput): string[] {
  const errors: string[] = []

  if (input.annualMiles <= 0) {
    errors.push('Annual miles must be greater than 0.')
  }

  if (input.mpg <= 0) {
    errors.push('MPG must be greater than 0.')
  }

  if (input.gasPricePerGallon < 0) {
    errors.push('Gas price cannot be negative.')
  }

  if (input.insuranceAnnual < 0) {
    errors.push('Insurance cannot be negative.')
  }

  if (input.maintenancePerMile < 0 || input.repairsPerMile < 0 || input.tiresPerMile < 0) {
    errors.push('Per-mile costs cannot be negative.')
  }

  if (input.lifetimeMiles < input.annualMiles) {
    errors.push('Lifetime miles must be at least annual miles.')
  }

  return errors
}

export function calculateTco(input: TcoInput): TcoResult {
  const annualFuelGallons = input.annualMiles / input.mpg
  const annualFuelCost = annualFuelGallons * input.gasPricePerGallon

  const annualByCategory = {
    insurance: input.insuranceAnnual,
    maintenance: input.maintenancePerMile * input.annualMiles,
    repairs: input.repairsPerMile * input.annualMiles,
    tires: input.tiresPerMile * input.annualMiles,
    fuel: annualFuelCost,
  }

  const annualCost =
    annualByCategory.insurance +
    annualByCategory.maintenance +
    annualByCategory.repairs +
    annualByCategory.tires +
    annualByCategory.fuel

  const lifetimeYears = input.lifetimeMiles / input.annualMiles
  const lifetimeCost = annualCost * lifetimeYears

  const lifetimeByCategory = {
    insurance: annualByCategory.insurance * lifetimeYears,
    maintenance: annualByCategory.maintenance * lifetimeYears,
    repairs: annualByCategory.repairs * lifetimeYears,
    tires: annualByCategory.tires * lifetimeYears,
    fuel: annualByCategory.fuel * lifetimeYears,
  }

  const costPerMile = lifetimeCost / input.lifetimeMiles

  return {
    annualFuelGallons,
    annualFuelCost,
    annualCost,
    lifetimeYears,
    lifetimeCost,
    costPerMile,
    annualByCategory,
    lifetimeByCategory,
  }
}
