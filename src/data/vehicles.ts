export interface VehicleProfile {
  id: string
  year: number
  make: string
  model: string
  combinedMpg: number
  insuranceAnnual: number
  maintenancePerMile: number
  repairsPerMile: number
  tiresPerMile: number
  lifetimeMiles: number
}

// Model defaults are practical planning values. They should be user-editable.
export const vehicleProfiles: VehicleProfile[] = [
  {
    id: '2022-toyota-camry',
    year: 2022,
    make: 'Toyota',
    model: 'Camry',
    combinedMpg: 32,
    insuranceAnnual: 1080,
    maintenancePerMile: 0.027,
    repairsPerMile: 0.016,
    tiresPerMile: 0.011,
    lifetimeMiles: 220000,
  },
  {
    id: '2022-honda-accord',
    year: 2022,
    make: 'Honda',
    model: 'Accord',
    combinedMpg: 33,
    insuranceAnnual: 1095,
    maintenancePerMile: 0.027,
    repairsPerMile: 0.016,
    tiresPerMile: 0.011,
    lifetimeMiles: 220000,
  },
  {
    id: '2022-hyundai-elantra',
    year: 2022,
    make: 'Hyundai',
    model: 'Elantra',
    combinedMpg: 37,
    insuranceAnnual: 1040,
    maintenancePerMile: 0.026,
    repairsPerMile: 0.016,
    tiresPerMile: 0.011,
    lifetimeMiles: 200000,
  },
  {
    id: '2022-toyota-rav4',
    year: 2022,
    make: 'Toyota',
    model: 'RAV4',
    combinedMpg: 30,
    insuranceAnnual: 1190,
    maintenancePerMile: 0.029,
    repairsPerMile: 0.018,
    tiresPerMile: 0.013,
    lifetimeMiles: 230000,
  },
  {
    id: '2022-honda-cr-v',
    year: 2022,
    make: 'Honda',
    model: 'CR-V',
    combinedMpg: 30,
    insuranceAnnual: 1180,
    maintenancePerMile: 0.029,
    repairsPerMile: 0.018,
    tiresPerMile: 0.013,
    lifetimeMiles: 230000,
  },
  {
    id: '2022-toyota-prius',
    year: 2022,
    make: 'Toyota',
    model: 'Prius',
    combinedMpg: 52,
    insuranceAnnual: 1140,
    maintenancePerMile: 0.025,
    repairsPerMile: 0.015,
    tiresPerMile: 0.012,
    lifetimeMiles: 230000,
  },
  {
    id: '2022-ford-f150',
    year: 2022,
    make: 'Ford',
    model: 'F-150',
    combinedMpg: 22,
    insuranceAnnual: 1310,
    maintenancePerMile: 0.031,
    repairsPerMile: 0.02,
    tiresPerMile: 0.016,
    lifetimeMiles: 250000,
  },
  {
    id: '2022-toyota-tacoma',
    year: 2022,
    make: 'Toyota',
    model: 'Tacoma',
    combinedMpg: 21,
    insuranceAnnual: 1270,
    maintenancePerMile: 0.031,
    repairsPerMile: 0.02,
    tiresPerMile: 0.016,
    lifetimeMiles: 250000,
  },
]
