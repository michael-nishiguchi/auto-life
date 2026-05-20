// This script fetches vehicle data from the NHTSA API for the last 15 years and writes it to public/data/vehicles.json.
// Run with: npx tsx scripts/fetchVehicles.ts


import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { getVehicleAssumptions } from '../src/lib/vehicleAssumptions.ts';

const START_YEAR = new Date().getFullYear() - 14;
const END_YEAR = new Date().getFullYear();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_PATH = path.join(__dirname, '../public/data/vehicles.json');
const SNAPSHOT_PATH = path.join(__dirname, '../src/data/vehicles.json');
const TMP_OUTPUT_PATH = `${OUTPUT_PATH}.tmp`;
const VEHICLE_TYPES = ['car', 'truck', 'multipurpose passenger vehicle'];
const CONCURRENCY = 12;

interface CatalogVehicle {
  year: number;
  make: string;
  model: string;
  combinedMpg: number;
  lifetimeMiles: number;
}

async function fetchMakes(vehicleType: string) {
  const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/${encodeURIComponent(vehicleType)}?format=json`);
  const data = await res.json();
  return data.Results.map((m: any) => m.MakeName);
}

async function fetchModels(year: number, make: string, vehicleType: string): Promise<CatalogVehicle[]> {
  const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}/vehicleType/${encodeURIComponent(vehicleType)}?format=json`);
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(`Unexpected content type for ${make} ${year}: ${contentType || 'unknown'}`);
  }
  const data = await res.json();
  return data.Results.map((m: any) => ({
    make: m.Make_Name,
    model: m.Model_Name,
    year,
    combinedMpg: getVehicleAssumptions(year, m.Make_Name, m.Model_Name).combinedMpg,
    lifetimeMiles: getVehicleAssumptions(year, m.Make_Name, m.Model_Name).lifetimeMiles,
  }));
}

async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const current = index;
      index += 1;
      results[current] = await tasks[current]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  const vehicles: CatalogVehicle[] = [];
  const uniqueVehicleKeys = new Set<string>();

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    console.log(`Fetching makes for ${year}...`);
    const makesByType: Record<string, string[]> = {};

    for (const vehicleType of VEHICLE_TYPES) {
      try {
        makesByType[vehicleType] = await fetchMakes(vehicleType);
      } catch (e) {
        console.error(`Failed to fetch makes for ${year} (${vehicleType}):`, e);
        makesByType[vehicleType] = [];
      }
    }

    const tasks: Array<() => Promise<CatalogVehicle[]>> = [];
    for (const vehicleType of VEHICLE_TYPES) {
      for (const make of makesByType[vehicleType]) {
        tasks.push(async () => {
          try {
            return await fetchModels(year, make, vehicleType);
          } catch (e) {
            console.error(`Failed for ${make} ${year} (${vehicleType}):`, e);
            return [];
          }
        });
      }
    }

    const modelBatches = await runWithConcurrency(tasks, CONCURRENCY);
    for (const models of modelBatches) {
      for (const model of models) {
        const key = `${model.year}|${model.make}|${model.model}`.toLowerCase();
        if (uniqueVehicleKeys.has(key)) {
          continue;
        }
        uniqueVehicleKeys.add(key);
        vehicles.push(model);
      }
    }

    fs.writeFileSync(TMP_OUTPUT_PATH, JSON.stringify(vehicles, null, 2));
    console.log(`[Yearly write] ${vehicles.length} vehicles after ${year}`);
  }

  fs.writeFileSync(TMP_OUTPUT_PATH, JSON.stringify(vehicles, null, 2));

  if (vehicles.length < 3000) {
    fs.rmSync(TMP_OUTPUT_PATH, { force: true });
    throw new Error(`Refresh aborted: fetched only ${vehicles.length} vehicles, keeping existing catalog at ${OUTPUT_PATH}`);
  }

  fs.renameSync(TMP_OUTPUT_PATH, OUTPUT_PATH);
  fs.copyFileSync(OUTPUT_PATH, SNAPSHOT_PATH);
  console.log(`Wrote ${vehicles.length} vehicles to ${OUTPUT_PATH}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
