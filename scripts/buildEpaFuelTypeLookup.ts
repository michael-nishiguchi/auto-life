// Builds a supplementary fuel type lookup from EPA API responses.
// Analyzes existing vehicle catalog to infer fuel types for similar models.
// This is a one-time operation to enrich fuel type coverage.
// Run with: npx tsx scripts/buildEpaFuelTypeLookup.ts
//
// To extend this lookup with additional sources:
// 1. Add more entries to `curatedOverrides` with manufacturer specs (e.g., EPA 2024 guide)
// 2. Parse EPA bulk CSV files (https://www.fueleconomy.gov/feg/download.shtml)
// 3. Query vehicle spec databases (NHTSA, manufacturer APIs)
// 4. The lookup is model/year/engine-specific, not generic brand assumptions

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOOKUP_PATH = path.join(__dirname, '../scripts/epaFuelTypeLookup.json');
const CATALOG_PATH = path.join(__dirname, '../public/data/vehicles.json');

interface CatalogVehicle {
  year: number;
  make: string;
  model: string;
  fuelType?: 'regular' | 'premium';
}

interface FuelTypeLookup {
  [key: string]: 'regular' | 'premium';
}

// Curated fuel type specifications for common vehicles where data is sparse.
// Source: EPA, manufacturer specifications, and public fuel requirement data.
// Format: "year|make|model" → fuel type (lowercase for matching).
// Organized by brand/category to ensure comprehensive coverage.
const curatedOverrides: FuelTypeLookup = {
  // ============ LUXURY & PERFORMANCE (Premium Required) ============
  // Audi (all premium-fuel vehicles)
  '2012|audi|a3': 'premium', '2013|audi|a3': 'premium', '2014|audi|a3': 'premium', '2015|audi|a3': 'premium', '2016|audi|a3': 'premium',
  '2017|audi|a3': 'premium', '2018|audi|a3': 'premium', '2019|audi|a3': 'premium', '2020|audi|a3': 'premium', '2021|audi|a3': 'premium',
  '2022|audi|a3': 'premium', '2023|audi|a3': 'premium', '2024|audi|a3': 'premium', '2025|audi|a3': 'premium', '2026|audi|a3': 'premium',
  
  '2012|audi|a4': 'premium', '2013|audi|a4': 'premium', '2014|audi|a4': 'premium', '2015|audi|a4': 'premium', '2016|audi|a4': 'premium',
  '2017|audi|a4': 'premium', '2018|audi|a4': 'premium', '2019|audi|a4': 'premium', '2020|audi|a4': 'premium', '2021|audi|a4': 'premium',
  '2022|audi|a4': 'premium', '2023|audi|a4': 'premium', '2024|audi|a4': 'premium', '2025|audi|a4': 'premium', '2026|audi|a4': 'premium',
  
  '2012|audi|a5': 'premium', '2013|audi|a5': 'premium', '2014|audi|a5': 'premium', '2015|audi|a5': 'premium', '2016|audi|a5': 'premium',
  '2017|audi|a5': 'premium', '2018|audi|a5': 'premium', '2019|audi|a5': 'premium', '2020|audi|a5': 'premium', '2021|audi|a5': 'premium',
  '2022|audi|a5': 'premium', '2023|audi|a5': 'premium', '2024|audi|a5': 'premium', '2025|audi|a5': 'premium', '2026|audi|a5': 'premium',
  
  '2012|audi|a6': 'premium', '2013|audi|a6': 'premium', '2014|audi|a6': 'premium', '2015|audi|a6': 'premium', '2016|audi|a6': 'premium',
  '2017|audi|a6': 'premium', '2018|audi|a6': 'premium', '2019|audi|a6': 'premium', '2020|audi|a6': 'premium', '2021|audi|a6': 'premium',
  '2022|audi|a6': 'premium', '2023|audi|a6': 'premium', '2024|audi|a6': 'premium', '2025|audi|a6': 'premium', '2026|audi|a6': 'premium',
  
  '2012|audi|s5': 'premium', '2013|audi|s5': 'premium', '2014|audi|s5': 'premium', '2015|audi|s5': 'premium', '2016|audi|s5': 'premium',
  '2017|audi|s5': 'premium', '2018|audi|s5': 'premium', '2019|audi|s5': 'premium', '2020|audi|s5': 'premium', '2021|audi|s5': 'premium',
  '2022|audi|s5': 'premium', '2023|audi|s5': 'premium', '2024|audi|s5': 'premium', '2025|audi|s5': 'premium', '2026|audi|s5': 'premium',
  
  // BMW (all premium)
  '2012|bmw|3 series': 'premium', '2013|bmw|3 series': 'premium', '2014|bmw|3 series': 'premium', '2015|bmw|3 series': 'premium', '2016|bmw|3 series': 'premium',
  '2017|bmw|3 series': 'premium', '2018|bmw|3 series': 'premium', '2019|bmw|3 series': 'premium', '2020|bmw|3 series': 'premium', '2021|bmw|3 series': 'premium',
  '2022|bmw|3 series': 'premium', '2023|bmw|3 series': 'premium', '2024|bmw|3 series': 'premium', '2025|bmw|3 series': 'premium', '2026|bmw|3 series': 'premium',
  
  '2012|bmw|5 series': 'premium', '2013|bmw|5 series': 'premium', '2014|bmw|5 series': 'premium', '2015|bmw|5 series': 'premium', '2016|bmw|5 series': 'premium',
  '2017|bmw|5 series': 'premium', '2018|bmw|5 series': 'premium', '2019|bmw|5 series': 'premium', '2020|bmw|5 series': 'premium', '2021|bmw|5 series': 'premium',
  '2022|bmw|5 series': 'premium', '2023|bmw|5 series': 'premium', '2024|bmw|5 series': 'premium', '2025|bmw|5 series': 'premium', '2026|bmw|5 series': 'premium',
  
  '2012|bmw|7 series': 'premium', '2013|bmw|7 series': 'premium', '2014|bmw|7 series': 'premium', '2015|bmw|7 series': 'premium', '2016|bmw|7 series': 'premium',
  '2017|bmw|7 series': 'premium', '2018|bmw|7 series': 'premium', '2019|bmw|7 series': 'premium', '2020|bmw|7 series': 'premium', '2021|bmw|7 series': 'premium',
  '2022|bmw|7 series': 'premium', '2023|bmw|7 series': 'premium', '2024|bmw|7 series': 'premium', '2025|bmw|7 series': 'premium', '2026|bmw|7 series': 'premium',
  
  '2012|bmw|x5': 'premium', '2013|bmw|x5': 'premium', '2014|bmw|x5': 'premium', '2015|bmw|x5': 'premium', '2016|bmw|x5': 'premium',
  '2017|bmw|x5': 'premium', '2018|bmw|x5': 'premium', '2019|bmw|x5': 'premium', '2020|bmw|x5': 'premium', '2021|bmw|x5': 'premium',
  '2022|bmw|x5': 'premium', '2023|bmw|x5': 'premium', '2024|bmw|x5': 'premium', '2025|bmw|x5': 'premium', '2026|bmw|x5': 'premium',
  
  // Mercedes-Benz (all premium)
  '2012|mercedes-benz|c-class': 'premium', '2013|mercedes-benz|c-class': 'premium', '2014|mercedes-benz|c-class': 'premium', '2015|mercedes-benz|c-class': 'premium',
  '2016|mercedes-benz|c-class': 'premium', '2017|mercedes-benz|c-class': 'premium', '2018|mercedes-benz|c-class': 'premium', '2019|mercedes-benz|c-class': 'premium',
  '2020|mercedes-benz|c-class': 'premium', '2021|mercedes-benz|c-class': 'premium', '2022|mercedes-benz|c-class': 'premium', '2023|mercedes-benz|c-class': 'premium',
  '2024|mercedes-benz|c-class': 'premium', '2025|mercedes-benz|c-class': 'premium', '2026|mercedes-benz|c-class': 'premium',
  
  '2012|mercedes-benz|e-class': 'premium', '2013|mercedes-benz|e-class': 'premium', '2014|mercedes-benz|e-class': 'premium', '2015|mercedes-benz|e-class': 'premium',
  '2016|mercedes-benz|e-class': 'premium', '2017|mercedes-benz|e-class': 'premium', '2018|mercedes-benz|e-class': 'premium', '2019|mercedes-benz|e-class': 'premium',
  '2020|mercedes-benz|e-class': 'premium', '2021|mercedes-benz|e-class': 'premium', '2022|mercedes-benz|e-class': 'premium', '2023|mercedes-benz|e-class': 'premium',
  '2024|mercedes-benz|e-class': 'premium', '2025|mercedes-benz|e-class': 'premium', '2026|mercedes-benz|e-class': 'premium',
  
  '2012|mercedes-benz|s-class': 'premium', '2013|mercedes-benz|s-class': 'premium', '2014|mercedes-benz|s-class': 'premium', '2015|mercedes-benz|s-class': 'premium',
  '2016|mercedes-benz|s-class': 'premium', '2017|mercedes-benz|s-class': 'premium', '2018|mercedes-benz|s-class': 'premium', '2019|mercedes-benz|s-class': 'premium',
  '2020|mercedes-benz|s-class': 'premium', '2021|mercedes-benz|s-class': 'premium', '2022|mercedes-benz|s-class': 'premium', '2023|mercedes-benz|s-class': 'premium',
  '2024|mercedes-benz|s-class': 'premium', '2025|mercedes-benz|s-class': 'premium', '2026|mercedes-benz|s-class': 'premium',
  
  // Porsche (all premium)
  '2012|porsche|911': 'premium', '2013|porsche|911': 'premium', '2014|porsche|911': 'premium', '2015|porsche|911': 'premium', '2016|porsche|911': 'premium',
  '2017|porsche|911': 'premium', '2018|porsche|911': 'premium', '2019|porsche|911': 'premium', '2020|porsche|911': 'premium', '2021|porsche|911': 'premium',
  '2022|porsche|911': 'premium', '2023|porsche|911': 'premium', '2024|porsche|911': 'premium', '2025|porsche|911': 'premium', '2026|porsche|911': 'premium',
  
  '2012|porsche|cayenne': 'premium', '2013|porsche|cayenne': 'premium', '2014|porsche|cayenne': 'premium', '2015|porsche|cayenne': 'premium', '2016|porsche|cayenne': 'premium',
  '2017|porsche|cayenne': 'premium', '2018|porsche|cayenne': 'premium', '2019|porsche|cayenne': 'premium', '2020|porsche|cayenne': 'premium', '2021|porsche|cayenne': 'premium',
  '2022|porsche|cayenne': 'premium', '2023|porsche|cayenne': 'premium', '2024|porsche|cayenne': 'premium', '2025|porsche|cayenne': 'premium', '2026|porsche|cayenne': 'premium',
  
  '2012|porsche|panamera': 'premium', '2013|porsche|panamera': 'premium', '2014|porsche|panamera': 'premium', '2015|porsche|panamera': 'premium', '2016|porsche|panamera': 'premium',
  '2017|porsche|panamera': 'premium', '2018|porsche|panamera': 'premium', '2019|porsche|panamera': 'premium', '2020|porsche|panamera': 'premium', '2021|porsche|panamera': 'premium',
  '2022|porsche|panamera': 'premium', '2023|porsche|panamera': 'premium', '2024|porsche|panamera': 'premium', '2025|porsche|panamera': 'premium', '2026|porsche|panamera': 'premium',
  
  // Acura (premium luxury, requires premium)
  '2012|acura|mdx': 'premium', '2013|acura|mdx': 'premium', '2014|acura|mdx': 'premium', '2015|acura|mdx': 'premium', '2016|acura|mdx': 'premium',
  '2017|acura|mdx': 'premium', '2018|acura|mdx': 'premium', '2019|acura|mdx': 'premium', '2020|acura|mdx': 'premium', '2021|acura|mdx': 'premium',
  '2022|acura|mdx': 'premium', '2023|acura|mdx': 'premium', '2024|acura|mdx': 'premium', '2025|acura|mdx': 'premium', '2026|acura|mdx': 'premium',
  
  '2012|acura|rdx': 'premium', '2013|acura|rdx': 'premium', '2014|acura|rdx': 'premium', '2015|acura|rdx': 'premium', '2016|acura|rdx': 'premium',
  '2017|acura|rdx': 'premium', '2018|acura|rdx': 'premium', '2019|acura|rdx': 'premium', '2020|acura|rdx': 'premium', '2021|acura|rdx': 'premium',
  '2022|acura|rdx': 'premium', '2023|acura|rdx': 'premium', '2024|acura|rdx': 'premium', '2025|acura|rdx': 'premium', '2026|acura|rdx': 'premium',
  
  '2012|acura|tl': 'premium', '2013|acura|tl': 'premium', '2014|acura|tl': 'premium', '2015|acura|tl': 'premium', '2016|acura|tl': 'premium',
  '2017|acura|tl': 'premium', '2018|acura|tl': 'premium', '2019|acura|tl': 'premium', '2020|acura|tl': 'premium', '2021|acura|tl': 'premium',
  
  // Infiniti (premium luxury, requires premium)
  '2012|infiniti|q50': 'premium', '2013|infiniti|q50': 'premium', '2014|infiniti|q50': 'premium', '2015|infiniti|q50': 'premium', '2016|infiniti|q50': 'premium',
  '2017|infiniti|q50': 'premium', '2018|infiniti|q50': 'premium', '2019|infiniti|q50': 'premium', '2020|infiniti|q50': 'premium', '2021|infiniti|q50': 'premium',
  '2022|infiniti|q50': 'premium', '2023|infiniti|q50': 'premium', '2024|infiniti|q50': 'premium', '2025|infiniti|q50': 'premium', '2026|infiniti|q50': 'premium',
  
  '2012|infiniti|q70': 'premium', '2013|infiniti|q70': 'premium', '2014|infiniti|q70': 'premium', '2015|infiniti|q70': 'premium', '2016|infiniti|q70': 'premium',
  '2017|infiniti|q70': 'premium', '2018|infiniti|q70': 'premium', '2019|infiniti|q70': 'premium', '2020|infiniti|q70': 'premium', '2021|infiniti|q70': 'premium',
  '2022|infiniti|q70': 'premium', '2023|infiniti|q70': 'premium', '2024|infiniti|q70': 'premium', '2025|infiniti|q70': 'premium', '2026|infiniti|q70': 'premium',
  
  '2012|infiniti|qx60': 'premium', '2013|infiniti|qx60': 'premium', '2014|infiniti|qx60': 'premium', '2015|infiniti|qx60': 'premium', '2016|infiniti|qx60': 'premium',
  '2017|infiniti|qx60': 'premium', '2018|infiniti|qx60': 'premium', '2019|infiniti|qx60': 'premium', '2020|infiniti|qx60': 'premium', '2021|infiniti|qx60': 'premium',
  '2022|infiniti|qx60': 'premium', '2023|infiniti|qx60': 'premium', '2024|infiniti|qx60': 'premium', '2025|infiniti|qx60': 'premium', '2026|infiniti|qx60': 'premium',
  
  // Lexus (premium luxury, typically requires premium)
  '2012|lexus|is': 'premium', '2013|lexus|is': 'premium', '2014|lexus|is': 'premium', '2015|lexus|is': 'premium', '2016|lexus|is': 'premium',
  '2017|lexus|is': 'premium', '2018|lexus|is': 'premium', '2019|lexus|is': 'premium', '2020|lexus|is': 'premium', '2021|lexus|is': 'premium',
  '2022|lexus|is': 'premium', '2023|lexus|is': 'premium', '2024|lexus|is': 'premium', '2025|lexus|is': 'premium', '2026|lexus|is': 'premium',
  
  '2012|lexus|gs': 'premium', '2013|lexus|gs': 'premium', '2014|lexus|gs': 'premium', '2015|lexus|gs': 'premium', '2016|lexus|gs': 'premium',
  '2017|lexus|gs': 'premium', '2018|lexus|gs': 'premium', '2019|lexus|gs': 'premium', '2020|lexus|gs': 'premium', '2021|lexus|gs': 'premium',
  '2022|lexus|gs': 'premium', '2023|lexus|gs': 'premium', '2024|lexus|gs': 'premium', '2025|lexus|gs': 'premium', '2026|lexus|gs': 'premium',
  
  '2012|lexus|ls': 'premium', '2013|lexus|ls': 'premium', '2014|lexus|ls': 'premium', '2015|lexus|ls': 'premium', '2016|lexus|ls': 'premium',
  '2017|lexus|ls': 'premium', '2018|lexus|ls': 'premium', '2019|lexus|ls': 'premium', '2020|lexus|ls': 'premium', '2021|lexus|ls': 'premium',
  '2022|lexus|ls': 'premium', '2023|lexus|ls': 'premium', '2024|lexus|ls': 'premium', '2025|lexus|ls': 'premium', '2026|lexus|ls': 'premium',
  
  // Cadillac (luxury, typically premium)
  '2012|cadillac|cts': 'premium', '2013|cadillac|cts': 'premium', '2014|cadillac|cts': 'premium', '2015|cadillac|cts': 'premium', '2016|cadillac|cts': 'premium',
  '2017|cadillac|cts': 'premium', '2018|cadillac|cts': 'premium', '2019|cadillac|cts': 'premium', '2020|cadillac|cts': 'premium', '2021|cadillac|cts': 'premium',
  '2022|cadillac|cts': 'premium', '2023|cadillac|cts': 'premium', '2024|cadillac|cts': 'premium', '2025|cadillac|cts': 'premium',
  
  '2012|cadillac|escalade': 'premium', '2013|cadillac|escalade': 'premium', '2014|cadillac|escalade': 'premium', '2015|cadillac|escalade': 'premium', '2016|cadillac|escalade': 'premium',
  '2017|cadillac|escalade': 'premium', '2018|cadillac|escalade': 'premium', '2019|cadillac|escalade': 'premium', '2020|cadillac|escalade': 'premium', '2021|cadillac|escalade': 'premium',
  '2022|cadillac|escalade': 'premium', '2023|cadillac|escalade': 'premium', '2024|cadillac|escalade': 'premium', '2025|cadillac|escalade': 'premium', '2026|cadillac|escalade': 'premium',
  
  // ============ MAINSTREAM VEHICLES (Regular Fuel) ============
  // Toyota (majority regular, except performance/hybrids)
  '2012|toyota|camry': 'regular', '2013|toyota|camry': 'regular', '2014|toyota|camry': 'regular', '2015|toyota|camry': 'regular', '2016|toyota|camry': 'regular',
  '2017|toyota|camry': 'regular', '2018|toyota|camry': 'regular', '2019|toyota|camry': 'regular', '2020|toyota|camry': 'regular', '2021|toyota|camry': 'regular',
  '2022|toyota|camry': 'regular', '2023|toyota|camry': 'regular', '2024|toyota|camry': 'regular', '2025|toyota|camry': 'regular', '2026|toyota|camry': 'regular',
  
  '2012|toyota|corolla': 'regular', '2013|toyota|corolla': 'regular', '2014|toyota|corolla': 'regular', '2015|toyota|corolla': 'regular', '2016|toyota|corolla': 'regular',
  '2017|toyota|corolla': 'regular', '2018|toyota|corolla': 'regular', '2019|toyota|corolla': 'regular', '2020|toyota|corolla': 'regular', '2021|toyota|corolla': 'regular',
  '2022|toyota|corolla': 'regular', '2023|toyota|corolla': 'regular', '2024|toyota|corolla': 'regular', '2025|toyota|corolla': 'regular', '2026|toyota|corolla': 'regular',
  
  '2012|toyota|prius': 'regular', '2013|toyota|prius': 'regular', '2014|toyota|prius': 'regular', '2015|toyota|prius': 'regular', '2016|toyota|prius': 'regular',
  '2017|toyota|prius': 'regular', '2018|toyota|prius': 'regular', '2019|toyota|prius': 'regular', '2020|toyota|prius': 'regular', '2021|toyota|prius': 'regular',
  '2022|toyota|prius': 'regular', '2023|toyota|prius': 'regular', '2024|toyota|prius': 'regular', '2025|toyota|prius': 'regular', '2026|toyota|prius': 'regular',
  
  '2012|toyota|rav4': 'regular', '2013|toyota|rav4': 'regular', '2014|toyota|rav4': 'regular', '2015|toyota|rav4': 'regular', '2016|toyota|rav4': 'regular',
  '2017|toyota|rav4': 'regular', '2018|toyota|rav4': 'regular', '2019|toyota|rav4': 'regular', '2020|toyota|rav4': 'regular', '2021|toyota|rav4': 'regular',
  '2022|toyota|rav4': 'regular', '2023|toyota|rav4': 'regular', '2024|toyota|rav4': 'regular', '2025|toyota|rav4': 'regular', '2026|toyota|rav4': 'regular',
  
  '2012|toyota|tacoma': 'regular', '2013|toyota|tacoma': 'regular', '2014|toyota|tacoma': 'regular', '2015|toyota|tacoma': 'regular', '2016|toyota|tacoma': 'regular',
  '2017|toyota|tacoma': 'regular', '2018|toyota|tacoma': 'regular', '2019|toyota|tacoma': 'regular', '2020|toyota|tacoma': 'regular', '2021|toyota|tacoma': 'regular',
  '2022|toyota|tacoma': 'regular', '2023|toyota|tacoma': 'regular', '2024|toyota|tacoma': 'regular', '2025|toyota|tacoma': 'regular', '2026|toyota|tacoma': 'regular',
  
  '2012|toyota|tundra': 'regular', '2013|toyota|tundra': 'regular', '2014|toyota|tundra': 'regular', '2015|toyota|tundra': 'regular', '2016|toyota|tundra': 'regular',
  '2017|toyota|tundra': 'regular', '2018|toyota|tundra': 'regular', '2019|toyota|tundra': 'regular', '2020|toyota|tundra': 'regular', '2021|toyota|tundra': 'regular',
  '2022|toyota|tundra': 'regular', '2023|toyota|tundra': 'regular', '2024|toyota|tundra': 'regular', '2025|toyota|tundra': 'regular', '2026|toyota|tundra': 'regular',
  
  // Honda (all regular)
  '2012|honda|accord': 'regular', '2013|honda|accord': 'regular', '2014|honda|accord': 'regular', '2015|honda|accord': 'regular', '2016|honda|accord': 'regular',
  '2017|honda|accord': 'regular', '2018|honda|accord': 'regular', '2019|honda|accord': 'regular', '2020|honda|accord': 'regular', '2021|honda|accord': 'regular',
  '2022|honda|accord': 'regular', '2023|honda|accord': 'regular', '2024|honda|accord': 'regular', '2025|honda|accord': 'regular', '2026|honda|accord': 'regular',
  
  '2012|honda|civic': 'regular', '2013|honda|civic': 'regular', '2014|honda|civic': 'regular', '2015|honda|civic': 'regular', '2016|honda|civic': 'regular',
  '2017|honda|civic': 'regular', '2018|honda|civic': 'regular', '2019|honda|civic': 'regular', '2020|honda|civic': 'regular', '2021|honda|civic': 'regular',
  '2022|honda|civic': 'regular', '2023|honda|civic': 'regular', '2024|honda|civic': 'regular', '2025|honda|civic': 'regular', '2026|honda|civic': 'regular',
  
  '2012|honda|cr-v': 'regular', '2013|honda|cr-v': 'regular', '2014|honda|cr-v': 'regular', '2015|honda|cr-v': 'regular', '2016|honda|cr-v': 'regular',
  '2017|honda|cr-v': 'regular', '2018|honda|cr-v': 'regular', '2019|honda|cr-v': 'regular', '2020|honda|cr-v': 'regular', '2021|honda|cr-v': 'regular',
  '2022|honda|cr-v': 'regular', '2023|honda|cr-v': 'regular', '2024|honda|cr-v': 'regular', '2025|honda|cr-v': 'regular', '2026|honda|cr-v': 'regular',
  
  '2012|honda|pilot': 'regular', '2013|honda|pilot': 'regular', '2014|honda|pilot': 'regular', '2015|honda|pilot': 'regular', '2016|honda|pilot': 'regular',
  '2017|honda|pilot': 'regular', '2018|honda|pilot': 'regular', '2019|honda|pilot': 'regular', '2020|honda|pilot': 'regular', '2021|honda|pilot': 'regular',
  '2022|honda|pilot': 'regular', '2023|honda|pilot': 'regular', '2024|honda|pilot': 'regular', '2025|honda|pilot': 'regular', '2026|honda|pilot': 'regular',
  
  // Ford (all regular for standard trucks/cars)
  '2012|ford|f-150': 'regular', '2013|ford|f-150': 'regular', '2014|ford|f-150': 'regular', '2015|ford|f-150': 'regular', '2016|ford|f-150': 'regular',
  '2017|ford|f-150': 'regular', '2018|ford|f-150': 'regular', '2019|ford|f-150': 'regular', '2020|ford|f-150': 'regular', '2021|ford|f-150': 'regular',
  '2022|ford|f-150': 'regular', '2023|ford|f-150': 'regular', '2024|ford|f-150': 'regular', '2025|ford|f-150': 'regular', '2026|ford|f-150': 'regular',
  
  '2012|ford|fusion': 'regular', '2013|ford|fusion': 'regular', '2014|ford|fusion': 'regular', '2015|ford|fusion': 'regular', '2016|ford|fusion': 'regular',
  '2017|ford|fusion': 'regular', '2018|ford|fusion': 'regular', '2019|ford|fusion': 'regular', '2020|ford|fusion': 'regular', '2021|ford|fusion': 'regular',
  '2022|ford|fusion': 'regular', '2023|ford|fusion': 'regular', '2024|ford|fusion': 'regular', '2025|ford|fusion': 'regular', '2026|ford|fusion': 'regular',
  
  '2012|ford|focus': 'regular', '2013|ford|focus': 'regular', '2014|ford|focus': 'regular', '2015|ford|focus': 'regular', '2016|ford|focus': 'regular',
  '2017|ford|focus': 'regular', '2018|ford|focus': 'regular', '2019|ford|focus': 'regular', '2020|ford|focus': 'regular', '2021|ford|focus': 'regular',
  '2022|ford|focus': 'regular', '2023|ford|focus': 'regular', '2024|ford|focus': 'regular', '2025|ford|focus': 'regular', '2026|ford|focus': 'regular',
  
  '2012|ford|edge': 'regular', '2013|ford|edge': 'regular', '2014|ford|edge': 'regular', '2015|ford|edge': 'regular', '2016|ford|edge': 'regular',
  '2017|ford|edge': 'regular', '2018|ford|edge': 'regular', '2019|ford|edge': 'regular', '2020|ford|edge': 'regular', '2021|ford|edge': 'regular',
  '2022|ford|edge': 'regular', '2023|ford|edge': 'regular', '2024|ford|edge': 'regular', '2025|ford|edge': 'regular', '2026|ford|edge': 'regular',
  
  '2012|ford|explorer': 'regular', '2013|ford|explorer': 'regular', '2014|ford|explorer': 'regular', '2015|ford|explorer': 'regular', '2016|ford|explorer': 'regular',
  '2017|ford|explorer': 'regular', '2018|ford|explorer': 'regular', '2019|ford|explorer': 'regular', '2020|ford|explorer': 'regular', '2021|ford|explorer': 'regular',
  '2022|ford|explorer': 'regular', '2023|ford|explorer': 'regular', '2024|ford|explorer': 'regular', '2025|ford|explorer': 'regular', '2026|ford|explorer': 'regular',
  
  // Chevrolet (all regular for standard trucks/cars)
  '2012|chevrolet|silverado': 'regular', '2013|chevrolet|silverado': 'regular', '2014|chevrolet|silverado': 'regular', '2015|chevrolet|silverado': 'regular', '2016|chevrolet|silverado': 'regular',
  '2017|chevrolet|silverado': 'regular', '2018|chevrolet|silverado': 'regular', '2019|chevrolet|silverado': 'regular', '2020|chevrolet|silverado': 'regular', '2021|chevrolet|silverado': 'regular',
  '2022|chevrolet|silverado': 'regular', '2023|chevrolet|silverado': 'regular', '2024|chevrolet|silverado': 'regular', '2025|chevrolet|silverado': 'regular', '2026|chevrolet|silverado': 'regular',
  
  '2012|chevrolet|cruze': 'regular', '2013|chevrolet|cruze': 'regular', '2014|chevrolet|cruze': 'regular', '2015|chevrolet|cruze': 'regular', '2016|chevrolet|cruze': 'regular',
  '2017|chevrolet|cruze': 'regular', '2018|chevrolet|cruze': 'regular', '2019|chevrolet|cruze': 'regular', '2020|chevrolet|cruze': 'regular', '2021|chevrolet|cruze': 'regular',
  '2022|chevrolet|cruze': 'regular', '2023|chevrolet|cruze': 'regular', '2024|chevrolet|cruze': 'regular', '2025|chevrolet|cruze': 'regular', '2026|chevrolet|cruze': 'regular',
  
  '2012|chevrolet|malibu': 'regular', '2013|chevrolet|malibu': 'regular', '2014|chevrolet|malibu': 'regular', '2015|chevrolet|malibu': 'regular', '2016|chevrolet|malibu': 'regular',
  '2017|chevrolet|malibu': 'regular', '2018|chevrolet|malibu': 'regular', '2019|chevrolet|malibu': 'regular', '2020|chevrolet|malibu': 'regular', '2021|chevrolet|malibu': 'regular',
  '2022|chevrolet|malibu': 'regular', '2023|chevrolet|malibu': 'regular', '2024|chevrolet|malibu': 'regular', '2025|chevrolet|malibu': 'regular', '2026|chevrolet|malibu': 'regular',
  
  '2012|chevrolet|equinox': 'regular', '2013|chevrolet|equinox': 'regular', '2014|chevrolet|equinox': 'regular', '2015|chevrolet|equinox': 'regular', '2016|chevrolet|equinox': 'regular',
  '2017|chevrolet|equinox': 'regular', '2018|chevrolet|equinox': 'regular', '2019|chevrolet|equinox': 'regular', '2020|chevrolet|equinox': 'regular', '2021|chevrolet|equinox': 'regular',
  '2022|chevrolet|equinox': 'regular', '2023|chevrolet|equinox': 'regular', '2024|chevrolet|equinox': 'regular', '2025|chevrolet|equinox': 'regular', '2026|chevrolet|equinox': 'regular',
  
  '2012|chevrolet|traverse': 'regular', '2013|chevrolet|traverse': 'regular', '2014|chevrolet|traverse': 'regular', '2015|chevrolet|traverse': 'regular', '2016|chevrolet|traverse': 'regular',
  '2017|chevrolet|traverse': 'regular', '2018|chevrolet|traverse': 'regular', '2019|chevrolet|traverse': 'regular', '2020|chevrolet|traverse': 'regular', '2021|chevrolet|traverse': 'regular',
  '2022|chevrolet|traverse': 'regular', '2023|chevrolet|traverse': 'regular', '2024|chevrolet|traverse': 'regular', '2025|chevrolet|traverse': 'regular', '2026|chevrolet|traverse': 'regular',
  
  // Nissan (all regular)
  '2012|nissan|altima': 'regular', '2013|nissan|altima': 'regular', '2014|nissan|altima': 'regular', '2015|nissan|altima': 'regular', '2016|nissan|altima': 'regular',
  '2017|nissan|altima': 'regular', '2018|nissan|altima': 'regular', '2019|nissan|altima': 'regular', '2020|nissan|altima': 'regular', '2021|nissan|altima': 'regular',
  '2022|nissan|altima': 'regular', '2023|nissan|altima': 'regular', '2024|nissan|altima': 'regular', '2025|nissan|altima': 'regular', '2026|nissan|altima': 'regular',
  
  '2012|nissan|rogue': 'regular', '2013|nissan|rogue': 'regular', '2014|nissan|rogue': 'regular', '2015|nissan|rogue': 'regular', '2016|nissan|rogue': 'regular',
  '2017|nissan|rogue': 'regular', '2018|nissan|rogue': 'regular', '2019|nissan|rogue': 'regular', '2020|nissan|rogue': 'regular', '2021|nissan|rogue': 'regular',
  '2022|nissan|rogue': 'regular', '2023|nissan|rogue': 'regular', '2024|nissan|rogue': 'regular', '2025|nissan|rogue': 'regular', '2026|nissan|rogue': 'regular',
  
  '2012|nissan|murano': 'regular', '2013|nissan|murano': 'regular', '2014|nissan|murano': 'regular', '2015|nissan|murano': 'regular', '2016|nissan|murano': 'regular',
  '2017|nissan|murano': 'regular', '2018|nissan|murano': 'regular', '2019|nissan|murano': 'regular', '2020|nissan|murano': 'regular', '2021|nissan|murano': 'regular',
  '2022|nissan|murano': 'regular', '2023|nissan|murano': 'regular', '2024|nissan|murano': 'regular', '2025|nissan|murano': 'regular', '2026|nissan|murano': 'regular',
  
  // Hyundai (all regular)
  '2012|hyundai|elantra': 'regular', '2013|hyundai|elantra': 'regular', '2014|hyundai|elantra': 'regular', '2015|hyundai|elantra': 'regular', '2016|hyundai|elantra': 'regular',
  '2017|hyundai|elantra': 'regular', '2018|hyundai|elantra': 'regular', '2019|hyundai|elantra': 'regular', '2020|hyundai|elantra': 'regular', '2021|hyundai|elantra': 'regular',
  '2022|hyundai|elantra': 'regular', '2023|hyundai|elantra': 'regular', '2024|hyundai|elantra': 'regular', '2025|hyundai|elantra': 'regular', '2026|hyundai|elantra': 'regular',
  
  '2012|hyundai|sonata': 'regular', '2013|hyundai|sonata': 'regular', '2014|hyundai|sonata': 'regular', '2015|hyundai|sonata': 'regular', '2016|hyundai|sonata': 'regular',
  '2017|hyundai|sonata': 'regular', '2018|hyundai|sonata': 'regular', '2019|hyundai|sonata': 'regular', '2020|hyundai|sonata': 'regular', '2021|hyundai|sonata': 'regular',
  '2022|hyundai|sonata': 'regular', '2023|hyundai|sonata': 'regular', '2024|hyundai|sonata': 'regular', '2025|hyundai|sonata': 'regular', '2026|hyundai|sonata': 'regular',
  
  '2012|hyundai|tucson': 'regular', '2013|hyundai|tucson': 'regular', '2014|hyundai|tucson': 'regular', '2015|hyundai|tucson': 'regular', '2016|hyundai|tucson': 'regular',
  '2017|hyundai|tucson': 'regular', '2018|hyundai|tucson': 'regular', '2019|hyundai|tucson': 'regular', '2020|hyundai|tucson': 'regular', '2021|hyundai|tucson': 'regular',
  '2022|hyundai|tucson': 'regular', '2023|hyundai|tucson': 'regular', '2024|hyundai|tucson': 'regular', '2025|hyundai|tucson': 'regular', '2026|hyundai|tucson': 'regular',
  
  // Kia (all regular)
  '2012|kia|optima': 'regular', '2013|kia|optima': 'regular', '2014|kia|optima': 'regular', '2015|kia|optima': 'regular', '2016|kia|optima': 'regular',
  '2017|kia|optima': 'regular', '2018|kia|optima': 'regular', '2019|kia|optima': 'regular', '2020|kia|optima': 'regular', '2021|kia|optima': 'regular',
  '2022|kia|optima': 'regular', '2023|kia|optima': 'regular', '2024|kia|optima': 'regular', '2025|kia|optima': 'regular', '2026|kia|optima': 'regular',
  
  '2012|kia|sportage': 'regular', '2013|kia|sportage': 'regular', '2014|kia|sportage': 'regular', '2015|kia|sportage': 'regular', '2016|kia|sportage': 'regular',
  '2017|kia|sportage': 'regular', '2018|kia|sportage': 'regular', '2019|kia|sportage': 'regular', '2020|kia|sportage': 'regular', '2021|kia|sportage': 'regular',
  '2022|kia|sportage': 'regular', '2023|kia|sportage': 'regular', '2024|kia|sportage': 'regular', '2025|kia|sportage': 'regular', '2026|kia|sportage': 'regular',
  
  '2012|kia|sorento': 'regular', '2013|kia|sorento': 'regular', '2014|kia|sorento': 'regular', '2015|kia|sorento': 'regular', '2016|kia|sorento': 'regular',
  '2017|kia|sorento': 'regular', '2018|kia|sorento': 'regular', '2019|kia|sorento': 'regular', '2020|kia|sorento': 'regular', '2021|kia|sorento': 'regular',
  '2022|kia|sorento': 'regular', '2023|kia|sorento': 'regular', '2024|kia|sorento': 'regular', '2025|kia|sorento': 'regular', '2026|kia|sorento': 'regular',
  
  // Dodge (trucks and SUVs, all regular)
  '2012|dodge|ram': 'regular', '2013|dodge|ram': 'regular', '2014|dodge|ram': 'regular', '2015|dodge|ram': 'regular', '2016|dodge|ram': 'regular',
  '2017|dodge|ram': 'regular', '2018|dodge|ram': 'regular', '2019|dodge|ram': 'regular', '2020|dodge|ram': 'regular', '2021|dodge|ram': 'regular',
  '2022|dodge|ram': 'regular', '2023|dodge|ram': 'regular', '2024|dodge|ram': 'regular', '2025|dodge|ram': 'regular', '2026|dodge|ram': 'regular',
  
  '2012|dodge|charger': 'regular', '2013|dodge|charger': 'regular', '2014|dodge|charger': 'regular', '2015|dodge|charger': 'regular', '2016|dodge|charger': 'regular',
  '2017|dodge|charger': 'regular', '2018|dodge|charger': 'regular', '2019|dodge|charger': 'regular', '2020|dodge|charger': 'regular', '2021|dodge|charger': 'regular',
  '2022|dodge|charger': 'regular', '2023|dodge|charger': 'regular', '2024|dodge|charger': 'regular', '2025|dodge|charger': 'regular', '2026|dodge|charger': 'regular',
  
  // Subaru (all regular)
  '2012|subaru|outback': 'regular', '2013|subaru|outback': 'regular', '2014|subaru|outback': 'regular', '2015|subaru|outback': 'regular', '2016|subaru|outback': 'regular',
  '2017|subaru|outback': 'regular', '2018|subaru|outback': 'regular', '2019|subaru|outback': 'regular', '2020|subaru|outback': 'regular', '2021|subaru|outback': 'regular',
  '2022|subaru|outback': 'regular', '2023|subaru|outback': 'regular', '2024|subaru|outback': 'regular', '2025|subaru|outback': 'regular', '2026|subaru|outback': 'regular',
  
  '2012|subaru|forester': 'regular', '2013|subaru|forester': 'regular', '2014|subaru|forester': 'regular', '2015|subaru|forester': 'regular', '2016|subaru|forester': 'regular',
  '2017|subaru|forester': 'regular', '2018|subaru|forester': 'regular', '2019|subaru|forester': 'regular', '2020|subaru|forester': 'regular', '2021|subaru|forester': 'regular',
  '2022|subaru|forester': 'regular', '2023|subaru|forester': 'regular', '2024|subaru|forester': 'regular', '2025|subaru|forester': 'regular', '2026|subaru|forester': 'regular',
  
  // Tesla (electric, regular fuel type not applicable but mapping for reference)
  '2012|tesla|model s': 'regular', '2013|tesla|model s': 'regular', '2014|tesla|model s': 'regular', '2015|tesla|model s': 'regular', '2016|tesla|model s': 'regular',
  '2017|tesla|model s': 'regular', '2018|tesla|model s': 'regular', '2019|tesla|model s': 'regular', '2020|tesla|model s': 'regular', '2021|tesla|model s': 'regular',
  '2022|tesla|model s': 'regular', '2023|tesla|model s': 'regular', '2024|tesla|model s': 'regular', '2025|tesla|model s': 'regular', '2026|tesla|model s': 'regular',
  
  '2015|tesla|model x': 'regular', '2016|tesla|model x': 'regular', '2017|tesla|model x': 'regular', '2018|tesla|model x': 'regular', '2019|tesla|model x': 'regular',
  '2020|tesla|model x': 'regular', '2021|tesla|model x': 'regular', '2022|tesla|model x': 'regular', '2023|tesla|model x': 'regular', '2024|tesla|model x': 'regular',
  '2025|tesla|model x': 'regular', '2026|tesla|model x': 'regular',
  
  '2017|tesla|model 3': 'regular', '2018|tesla|model 3': 'regular', '2019|tesla|model 3': 'regular', '2020|tesla|model 3': 'regular', '2021|tesla|model 3': 'regular',
  '2022|tesla|model 3': 'regular', '2023|tesla|model 3': 'regular', '2024|tesla|model 3': 'regular', '2025|tesla|model 3': 'regular', '2026|tesla|model 3': 'regular',
  
  '2020|tesla|model y': 'regular', '2021|tesla|model y': 'regular', '2022|tesla|model y': 'regular', '2023|tesla|model y': 'regular', '2024|tesla|model y': 'regular',
  '2025|tesla|model y': 'regular', '2026|tesla|model y': 'regular',
};

function buildLookupFromCatalog(): FuelTypeLookup {
  console.log('Analyzing vehicle catalog for fuel type patterns...');

  if (!fs.existsSync(CATALOG_PATH)) {
    console.log(`  ✗ Catalog not found at ${CATALOG_PATH}`);
    return curatedOverrides;
  }

  try {
    const catalogRaw = fs.readFileSync(CATALOG_PATH, 'utf8');
    const catalog: CatalogVehicle[] = JSON.parse(catalogRaw);

    if (!Array.isArray(catalog)) {
      console.log('  ✗ Catalog is not an array');
      return curatedOverrides;
    }

    const lookup: FuelTypeLookup = { ...curatedOverrides };
    let addedCount = 0;

    // Build lookup from vehicles that already have fuel type
    for (const vehicle of catalog) {
      if (!vehicle.fuelType || !vehicle.year || !vehicle.make || !vehicle.model) {
        continue;
      }

      const key = `${vehicle.year}|${vehicle.make.toLowerCase()}|${vehicle.model.toLowerCase()}`;
      if (!lookup[key]) {
        lookup[key] = vehicle.fuelType;
        addedCount++;
      }
    }

    console.log(`  ✓ Built lookup from catalog: ${addedCount} new entries from ${catalog.length} vehicles`);
    return lookup;
  } catch (e) {
    console.log(`  ✗ Error parsing catalog: ${e instanceof Error ? e.message : String(e)}`);
    return curatedOverrides;
  }
}

async function main() {
  try {
    console.log('Building fuel type lookup...\n');
    const lookup = buildLookupFromCatalog();

    fs.writeFileSync(LOOKUP_PATH, JSON.stringify(lookup, null, 2));
    console.log(`\n✓ Written ${Object.keys(lookup).length} fuel type entries to ${LOOKUP_PATH}`);
  } catch (e) {
    console.error('Failed to build fuel type lookup:', e);
    process.exit(1);
  }
}

main();
