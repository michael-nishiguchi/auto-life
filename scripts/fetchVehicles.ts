// This script fetches vehicle data from the NHTSA API for the last 15 years and writes it to public/data/vehicles.json.
// Run with: npx tsx scripts/fetchVehicles.ts


import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { getVehicleAssumptions } from '../src/lib/vehicleAssumptions.ts';

const START_YEAR = Number(process.env.START_YEAR ?? new Date().getFullYear() - 14);
const END_YEAR = Number(process.env.END_YEAR ?? new Date().getFullYear());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_PATH = path.join(__dirname, '../public/data/vehicles.json');
const SNAPSHOT_PATH = path.join(__dirname, '../src/data/vehicles.json');
const TMP_OUTPUT_PATH = `${OUTPUT_PATH}.tmp`;
const VEHICLE_TYPES = ['car', 'truck', 'multipurpose passenger vehicle'];
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY ?? 12));
const EPA_BASE_URL = 'https://www.fueleconomy.gov/ws/rest';
const MAKE_FILTER = process.env.MAKE_FILTER?.trim().toLowerCase();
const MODEL_FILTER = process.env.MODEL_FILTER?.trim().toLowerCase();
const MIN_EXPECTED_VEHICLES = Number(process.env.MIN_EXPECTED_VEHICLES ?? 3000);
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const USE_EPA_ONLY = process.env.USE_EPA_ONLY === '1' || process.env.USE_EPA_ONLY === 'true';
const APPEND_OUTPUT = process.env.APPEND_OUTPUT === '1' || process.env.APPEND_OUTPUT === 'true';
const NHTSA_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
};

type FuelType = 'regular' | 'premium';

interface CatalogVehicle {
  year: number;
  make: string;
  model: string;
  combinedMpg?: number;
  lifetimeMiles: number;
  fuelType?: FuelType;
}

interface EpaVehicleDetail {
  combinedMpg?: number;
  fuelType?: FuelType;
}

const epaCache = new Map<string, Promise<EpaVehicleDetail | undefined>>();
const epaModelMenuCache = new Map<string, Promise<string[]>>();
const epaMakeMenuCache = new Map<number, Promise<string[]>>();

// Load supplementary fuel type lookup (built from previous catalog + curated data)
let fuelTypeLookup: Record<string, FuelType> = {};
const FUEL_TYPE_LOOKUP_PATH = path.join(__dirname, './epaFuelTypeLookup.json');
try {
  if (fs.existsSync(FUEL_TYPE_LOOKUP_PATH)) {
    const raw = fs.readFileSync(FUEL_TYPE_LOOKUP_PATH, 'utf8');
    fuelTypeLookup = JSON.parse(raw);
    console.log(`[Loaded] Fuel type lookup: ${Object.keys(fuelTypeLookup).length} entries`);
  }
} catch (e) {
  console.warn(`[Lookup] Could not load fuel type lookup: ${e instanceof Error ? e.message : String(e)}`);
}

function normalizeXmlText(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function getXmlTagValue(xml: string, tagName: string): string | undefined {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  if (!match) {
    return undefined;
  }
  return normalizeXmlText(match[1]);
}

function getAllMenuValues(xml: string): string[] {
  const values: string[] = [];
  const menuItemMatches = xml.matchAll(/<menuItem>[\s\S]*?<value>([^<]+)<\/value>[\s\S]*?<\/menuItem>/gi);
  for (const match of menuItemMatches) {
    values.push(normalizeXmlText(match[1]));
  }
  return values.filter(Boolean);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function fetchEpaModelMenuValues(year: number, make: string): Promise<string[]> {
  const cacheKey = `${year}|${make}`.toLowerCase();
  const existing = epaModelMenuCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const task = (async () => {
    try {
      const url = `${EPA_BASE_URL}/vehicle/menu/model?year=${year}&make=${encodeURIComponent(make)}`;
      const xml = await fetchText(url);
      return getAllMenuValues(xml);
    } catch {
      return [];
    }
  })();

  epaModelMenuCache.set(cacheKey, task);
  return task;
}

async function fetchEpaMakes(year: number): Promise<string[]> {
  const existing = epaMakeMenuCache.get(year);
  if (existing) {
    return existing;
  }

  const task = (async () => {
    try {
      const url = `${EPA_BASE_URL}/vehicle/menu/make?year=${year}`;
      const xml = await fetchText(url);
      return getAllMenuValues(xml);
    } catch {
      return [];
    }
  })();

  epaMakeMenuCache.set(year, task);
  return task;
}

function mapFuelType(rawFuelType: string | undefined): FuelType | undefined {
  if (!rawFuelType) {
    return undefined;
  }

  const normalized = rawFuelType.toLowerCase();
  if (normalized.includes('premium')) {
    return 'premium';
  }
  if (normalized.includes('regular')) {
    return 'regular';
  }
  return undefined;
}

function lookupFuelType(year: number, make: string, model: string): FuelType | undefined {
  if (!fuelTypeLookup || Object.keys(fuelTypeLookup).length === 0) {
    return undefined;
  }

  const key = `${year}|${make.toLowerCase()}|${model.toLowerCase()}`;
  return fuelTypeLookup[key];
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { Accept: 'application/xml' } });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.text();
}

async function fetchEpaVehicleOptionIds(year: number, make: string, model: string): Promise<string[]> {
  const url = `${EPA_BASE_URL}/vehicle/menu/options?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`;
  const xml = await fetchText(url);
  return getAllMenuValues(xml);
}

async function fetchEpaVehicleDetailById(vehicleId: string): Promise<EpaVehicleDetail | undefined> {
  const url = `${EPA_BASE_URL}/vehicle/${encodeURIComponent(vehicleId)}`;
  const xml = await fetchText(url);

  const combinedMpgRaw = getXmlTagValue(xml, 'comb08');
  const combinedMpgParsed = combinedMpgRaw ? Number(combinedMpgRaw) : NaN;
  const combinedMpg = Number.isFinite(combinedMpgParsed) && combinedMpgParsed > 0 ? combinedMpgParsed : undefined;
  const fuelType = mapFuelType(getXmlTagValue(xml, 'fuelType1') ?? getXmlTagValue(xml, 'fuelType'));

  if (!combinedMpg && !fuelType) {
    return undefined;
  }

  return { combinedMpg, fuelType };
}

async function fetchEpaModelData(year: number, make: string, model: string): Promise<EpaVehicleDetail | undefined> {
  const cacheKey = `${year}|${make}|${model}`.toLowerCase();
  const existing = epaCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const task = (async () => {
    try {
      let optionIds = await fetchEpaVehicleOptionIds(year, make, model);

      // EPA often stores models under trim-annotated labels (for example, "Camry HEV ...").
      // If an exact model lookup misses, broaden to close model-menu matches and aggregate.
      if (optionIds.length === 0) {
        const allModelValues = await fetchEpaModelMenuValues(year, make);
        const normalizedModel = model.trim();
        const modelPattern = new RegExp(`^${escapeRegExp(normalizedModel)}(?:\\b|\\s|$)`, 'i');
        const matchingModelValues = allModelValues.filter((value) => {
          const candidate = value.trim();
          return candidate.localeCompare(normalizedModel, undefined, { sensitivity: 'base' }) === 0 || modelPattern.test(candidate);
        });

        if (matchingModelValues.length > 0) {
          const nestedIds = await Promise.all(
            matchingModelValues.map((candidateModel) => fetchEpaVehicleOptionIds(year, make, candidateModel).catch(() => [])),
          );
          optionIds = Array.from(new Set(nestedIds.flat()));
        }
      }

      if (optionIds.length === 0) {
        return undefined;
      }

      const details = await Promise.all(optionIds.map((optionId) => fetchEpaVehicleDetailById(optionId).catch(() => undefined)));
      const validDetails = details.filter((detail): detail is EpaVehicleDetail => Boolean(detail));
      if (validDetails.length === 0) {
        return undefined;
      }

      const mpgValues = validDetails
        .map((detail) => detail.combinedMpg)
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);
      const combinedMpg = mpgValues.length > 0 ? Math.round((mpgValues.reduce((sum, value) => sum + value, 0) / mpgValues.length) * 10) / 10 : undefined;

      const fuelTypes = new Set(validDetails.map((detail) => detail.fuelType).filter((value): value is FuelType => value === 'regular' || value === 'premium'));
      let fuelType: FuelType | undefined;
      if (fuelTypes.size === 1) {
        fuelType = Array.from(fuelTypes)[0];
      }

      // Fallback to lookup table if EPA API didn't return unambiguous fuel type
      if (!fuelType) {
        fuelType = lookupFuelType(year, make, model);
      }

      if (!combinedMpg && !fuelType) {
        return undefined;
      }

      return { combinedMpg, fuelType };
    } catch {
      return undefined;
    }
  })();

  epaCache.set(cacheKey, task);
  return task;
}

async function fetchMakes(vehicleType: string) {
  const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/${encodeURIComponent(vehicleType)}?format=json`, {
    headers: NHTSA_HEADERS,
  });
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(`Unexpected content type for makes (${vehicleType}): ${contentType || 'unknown'}`);
  }
  const data = await res.json();
  return data.Results.map((m: any) => m.MakeName);
}

async function fetchModels(year: number, make: string, vehicleType: string): Promise<CatalogVehicle[]> {
  const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}/vehicleType/${encodeURIComponent(vehicleType)}?format=json`, {
    headers: NHTSA_HEADERS,
  });
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(`Unexpected content type for ${make} ${year}: ${contentType || 'unknown'}`);
  }
  const data = await res.json();
  return Promise.all(
    data.Results.map(async (m: any) => {
      const assumptions = getVehicleAssumptions(year, m.Make_Name, m.Model_Name);
      const epa = await fetchEpaModelData(year, m.Make_Name, m.Model_Name);
      return {
        make: m.Make_Name,
        model: m.Model_Name,
        year,
        combinedMpg: epa?.combinedMpg,
        lifetimeMiles: assumptions.lifetimeMiles,
        fuelType: epa?.fuelType,
      };
    }),
  );
}

async function fetchModelsFromEpa(year: number, make: string): Promise<CatalogVehicle[]> {
  const modelValues = await fetchEpaModelMenuValues(year, make);
  return Promise.all(
    modelValues.map(async (modelValue) => {
      const assumptions = getVehicleAssumptions(year, make, modelValue);
      const epa = await fetchEpaModelData(year, make, modelValue);
      return {
        make,
        model: modelValue,
        year,
        combinedMpg: epa?.combinedMpg,
        lifetimeMiles: assumptions.lifetimeMiles,
        fuelType: epa?.fuelType,
      };
    }),
  );
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

  if (APPEND_OUTPUT && fs.existsSync(OUTPUT_PATH)) {
    try {
      const existingRaw = fs.readFileSync(OUTPUT_PATH, 'utf8');
      const existingParsed = JSON.parse(existingRaw);
      if (Array.isArray(existingParsed)) {
        for (const item of existingParsed) {
          if (!item || typeof item !== 'object') {
            continue;
          }
          const vehicle = item as CatalogVehicle;
          if (typeof vehicle.year !== 'number' || !vehicle.make || !vehicle.model) {
            continue;
          }
          const key = `${vehicle.year}|${vehicle.make}|${vehicle.model}`.toLowerCase();
          if (uniqueVehicleKeys.has(key)) {
            continue;
          }
          uniqueVehicleKeys.add(key);
          vehicles.push(vehicle);
        }
        console.log(`[Append mode] Loaded ${vehicles.length} existing vehicles from ${OUTPUT_PATH}`);
      }
    } catch (e) {
      console.warn(`[Append mode] Could not parse existing catalog at ${OUTPUT_PATH}, starting fresh.`, e);
    }
  }

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    console.log(`Fetching makes for ${year}...`);
    const makesByType: Record<string, string[]> = {};

    if (!USE_EPA_ONLY) {
      for (const vehicleType of VEHICLE_TYPES) {
        try {
          makesByType[vehicleType] = await fetchMakes(vehicleType);
        } catch (e) {
          console.error(`Failed to fetch makes for ${year} (${vehicleType}):`, e);
          makesByType[vehicleType] = [];
        }
      }
    }

    const tasks: Array<() => Promise<CatalogVehicle[]>> = [];
    if (!USE_EPA_ONLY) {
      for (const vehicleType of VEHICLE_TYPES) {
        const makes = MAKE_FILTER
          ? makesByType[vehicleType].filter((make) => make.toLowerCase().includes(MAKE_FILTER))
          : makesByType[vehicleType];
        for (const make of makes) {
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
    }

    if (tasks.length === 0) {
      const fallbackMakes = await fetchEpaMakes(year);
      const filteredFallbackMakes = MAKE_FILTER
        ? fallbackMakes.filter((make) => make.toLowerCase().includes(MAKE_FILTER))
        : fallbackMakes;
      for (const make of filteredFallbackMakes) {
        tasks.push(async () => {
          try {
            return await fetchModelsFromEpa(year, make);
          } catch (e) {
            console.error(`EPA fallback failed for ${make} ${year}:`, e);
            return [];
          }
        });
      }
    }

    const modelBatches = await runWithConcurrency(tasks, CONCURRENCY);
    for (const models of modelBatches) {
      for (const model of models) {
        if (MODEL_FILTER && !model.model.toLowerCase().includes(MODEL_FILTER)) {
          continue;
        }
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

  if (vehicles.length < MIN_EXPECTED_VEHICLES) {
    fs.rmSync(TMP_OUTPUT_PATH, { force: true });
    throw new Error(`Refresh aborted: fetched only ${vehicles.length} vehicles, keeping existing catalog at ${OUTPUT_PATH}`);
  }

  if (DRY_RUN) {
    console.log('[Dry run] Sample vehicles:', JSON.stringify(vehicles.slice(0, 5), null, 2));
    fs.rmSync(TMP_OUTPUT_PATH, { force: true });
    console.log(`[Dry run] Processed ${vehicles.length} vehicles. No files were written.`);
    return;
  }

  fs.renameSync(TMP_OUTPUT_PATH, OUTPUT_PATH);
  fs.copyFileSync(OUTPUT_PATH, SNAPSHOT_PATH);
  console.log(`Wrote ${vehicles.length} vehicles to ${OUTPUT_PATH}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
