import { useEffect, useMemo, useState } from 'react'
import { calculateTco, type TcoInput, validateTcoInput } from './lib/calculateTco'
import { defaults, sourceNotes } from './data/defaults'
import { getVehicleAssumptions } from './lib/vehicleAssumptions'
import { getTrimEngineOptions } from './lib/trimEngineOptions'
import bundledVehiclesUrl from './data/vehicles.json?url'
import './App.css'

interface CatalogVehicle {
  id: string
  year: number
  make: string
  model: string
  combinedMpg?: number
  lifetimeMiles?: number
  label: string
  searchText: string
}

const DEFAULT_LIFETIME_MILES = 220000

function asCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function asCurrencyPrecise(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function asNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)
}

function App() {
  const [catalogVehicles, setCatalogVehicles] = useState<CatalogVehicle[]>([])
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [catalogError, setCatalogError] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
  const [selectedTrimId, setSelectedTrimId] = useState<string>('base')
  useEffect(() => {
    let canceled = false

    async function loadVehicles() {
      setCatalogStatus('loading')
      try {
        const candidateUrls = [
          `${import.meta.env.BASE_URL}data/vehicles.json`,
          'data/vehicles.json',
          './data/vehicles.json',
          bundledVehiclesUrl,
        ]

        let payload: Array<{ year: number | string; make: string; model: string }> | null = null
        let lastError = 'unknown error'

        for (const catalogUrl of candidateUrls) {
          try {
            const response = await fetch(catalogUrl, { cache: 'force-cache' })
            if (!response.ok) {
              lastError = `status ${response.status} at ${catalogUrl}`
              continue
            }

            const bodyText = await response.text()
            if (bodyText.trim().startsWith('<')) {
              lastError = `HTML response at ${catalogUrl}`
              continue
            }

            const parsed = JSON.parse(bodyText) as Array<{ year: number | string; make: string; model: string }>
            if (!Array.isArray(parsed)) {
              lastError = `non-array JSON at ${catalogUrl}`
              continue
            }

            payload = parsed
            break
          } catch {
            lastError = `invalid JSON at ${catalogUrl}`
          }
        }

        if (!payload) {
          throw new Error(`Could not load vehicle catalog from known paths (${lastError})`)
        }

        const normalized = payload
          .map((vehicle, index) => {
            const year = Number(vehicle.year)
            const make = String(vehicle.make).trim()
            const model = String(vehicle.model).trim()
            const label = `${year} ${make} ${model}`
            return {
              id: `${year}-${make}-${model}-${index}`,
              year,
              make,
              model,
              combinedMpg: Number((vehicle as { combinedMpg?: number }).combinedMpg),
              lifetimeMiles: Number((vehicle as { lifetimeMiles?: number }).lifetimeMiles),
              label,
              searchText: label.toLowerCase(),
            }
          })
          .filter((vehicle) => Number.isFinite(vehicle.year) && vehicle.year > 0 && vehicle.make.length > 0 && vehicle.model.length > 0)

        if (canceled) {
          return
        }

        setCatalogVehicles(normalized)
        setSelectedVehicleId(normalized[0]?.id ?? '')
        setCatalogStatus('ready')
      } catch (error) {
        if (canceled) {
          return
        }
        setCatalogStatus('error')
        setCatalogError(error instanceof Error ? error.message : 'Unknown error while loading vehicle catalog')
      }
    }

    void loadVehicles()

    return () => {
      canceled = true
    }
  }, [])


  const [input, setInput] = useState<TcoInput>({
    annualMiles: defaults.annualMiles,
    mpg: defaults.mpg,
    gasPricePerGallon: defaults.gasPricePerGallon,
    insuranceAnnual: defaults.insuranceAnnual,
    maintenancePerMile: defaults.maintenancePerMile,
    repairsPerMile: defaults.repairsPerMile,
    tiresPerMile: defaults.tiresPerMile,
    lifetimeMiles: DEFAULT_LIFETIME_MILES,
  })

  const filteredVehicles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      return catalogVehicles.slice(0, 200)
    }

    const terms = query.split(/\s+/).filter(Boolean)
    return catalogVehicles.filter((vehicle) => terms.every((term) => vehicle.searchText.includes(term))).slice(0, 200)
  }, [catalogVehicles, searchQuery])

  const initialVehicle = catalogVehicles[0]
  const selectedVehicle = useMemo(
    () => catalogVehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? filteredVehicles[0] ?? initialVehicle,
    [catalogVehicles, filteredVehicles, selectedVehicleId, initialVehicle],
  )

  const selectedVehicleAssumptions = useMemo(() => {
    if (!selectedVehicle) {
      return {
        combinedMpg: defaults.mpg,
        lifetimeMiles: DEFAULT_LIFETIME_MILES,
      }
    }

    const fallback = getVehicleAssumptions(selectedVehicle.year, selectedVehicle.make, selectedVehicle.model)
    return {
      combinedMpg:
        Number.isFinite(selectedVehicle.combinedMpg) && (selectedVehicle.combinedMpg ?? 0) > 0
          ? Number(selectedVehicle.combinedMpg)
          : fallback.combinedMpg,
      lifetimeMiles:
        Number.isFinite(selectedVehicle.lifetimeMiles) && (selectedVehicle.lifetimeMiles ?? 0) > 0
          ? Number(selectedVehicle.lifetimeMiles)
          : fallback.lifetimeMiles,
    }
  }, [selectedVehicle])

  const trimEngineOptions = useMemo(() => {
    if (!selectedVehicle) {
      return getTrimEngineOptions(new Date().getFullYear(), 'unknown', 'unknown', defaults.mpg)
    }
    return getTrimEngineOptions(
      selectedVehicle.year,
      selectedVehicle.make,
      selectedVehicle.model,
      selectedVehicleAssumptions.combinedMpg,
    )
  }, [selectedVehicle, selectedVehicleAssumptions.combinedMpg])

  const selectedTrim = useMemo(
    () => trimEngineOptions.find((option) => option.id === selectedTrimId) ?? trimEngineOptions[0],
    [trimEngineOptions, selectedTrimId],
  )

  useEffect(() => {
    if (trimEngineOptions.length === 0) {
      return
    }

    const trimStillValid = trimEngineOptions.some((option) => option.id === selectedTrimId)
    if (!trimStillValid) {
      setSelectedTrimId(trimEngineOptions[0].id)
    }
  }, [trimEngineOptions, selectedTrimId])

  useEffect(() => {
    if (filteredVehicles.length === 0) {
      return
    }

    const selectionVisible = filteredVehicles.some((vehicle) => vehicle.id === selectedVehicleId)
    if (!selectionVisible) {
      setSelectedVehicleId(filteredVehicles[0].id)
    }
  }, [filteredVehicles, selectedVehicleId])

  const errors = useMemo(() => validateTcoInput(input), [input])
  const result = useMemo(() => {
    if (errors.length > 0) {
      return null
    }
    return calculateTco(input)
  }, [input, errors])

  function updateNumber<K extends keyof TcoInput>(key: K, value: number) {
    setInput((prev) => ({ ...prev, [key]: Number.isFinite(value) ? value : 0 }))
  }

  function applyVehicleDefaults() {
    setInput((prev) => ({
      ...prev,
      mpg: selectedTrim?.mpg ?? selectedVehicleAssumptions.combinedMpg,
      insuranceAnnual: defaults.insuranceAnnual,
      maintenancePerMile: defaults.maintenancePerMile,
      repairsPerMile: defaults.repairsPerMile,
      tiresPerMile: defaults.tiresPerMile,
      lifetimeMiles: selectedVehicleAssumptions.lifetimeMiles,
    }))
  }

  function handleVehicleSearch(nextQuery: string) {
    setSearchQuery(nextQuery)
  }

  function handleModelChange(nextVehicleId: string) {
    const nextVehicle = catalogVehicles.find((vehicle) => vehicle.id === nextVehicleId)
    if (!nextVehicle) {
      return
    }

    setSelectedVehicleId(nextVehicleId)
    setSearchQuery(nextVehicle.label)
    const assumptions = {
      combinedMpg:
        Number.isFinite(nextVehicle.combinedMpg) && (nextVehicle.combinedMpg ?? 0) > 0
          ? Number(nextVehicle.combinedMpg)
          : getVehicleAssumptions(nextVehicle.year, nextVehicle.make, nextVehicle.model).combinedMpg,
      lifetimeMiles:
        Number.isFinite(nextVehicle.lifetimeMiles) && (nextVehicle.lifetimeMiles ?? 0) > 0
          ? Number(nextVehicle.lifetimeMiles)
          : getVehicleAssumptions(nextVehicle.year, nextVehicle.make, nextVehicle.model).lifetimeMiles,
    }
    const trimOptionsForVehicle = getTrimEngineOptions(
      nextVehicle.year,
      nextVehicle.make,
      nextVehicle.model,
      assumptions.combinedMpg,
    )
    const nextTrim = trimOptionsForVehicle[0]
    setSelectedTrimId(nextTrim.id)

    setInput((prev) => ({
      ...prev,
      mpg: nextTrim.mpg,
      lifetimeMiles: assumptions.lifetimeMiles,
    }))
  }

  function handleTrimChange(nextTrimId: string) {
    const trim = trimEngineOptions.find((option) => option.id === nextTrimId)
    if (!trim) {
      return
    }

    setSelectedTrimId(nextTrimId)
    setInput((prev) => ({
      ...prev,
      mpg: trim.mpg,
    }))
  }

  function noteFor(key: string) {
    return sourceNotes.find((item) => item.key === key)
  }

  const annualMilesNote = noteFor('annualMiles')
  const vehicleMpgNote = noteFor('modelMpg')
  const gasPriceNote = noteFor('gasPricePerGallon')
  const insuranceNote = noteFor('insuranceAnnual')
  const operatingCostsNote = noteFor('maintenancePerMile')
  const lifetimeNote = noteFor('lifetimeMiles')

  return (
    <main className="layout">
      <header className="hero">
        <p className="eyebrow">Auto Life</p>
        <h1>Car Cost Per Mile Planner</h1>
        <p className="subtitle">
          Pick an actual year/make/model, then adjust numbers for your situation. Depreciation and resale are excluded.
        </p>
      </header>

      <section className="grid">
        <article className="panel">
          <h2>Inputs</h2>
            <p className="muted">Search from your local vehicle database. Cost assumptions remain editable planning defaults.</p>

          <div className="vehicle-picker">
            <label>
                Search year, make, or model
                <input
                  type="text"
                  value={searchQuery}
                  placeholder="Ex: 2022 Toyota Camry"
                  onChange={(event) => handleVehicleSearch(event.target.value)}
                />
              </label>

              {catalogStatus === 'loading' && <p className="muted small">Loading local vehicle database...</p>}
              {catalogStatus === 'error' && <p className="muted small">Could not load vehicle database: {catalogError}</p>}

              {catalogStatus === 'ready' && (
                <>
                  <label className="vehicle-results">
                    Matching vehicles ({filteredVehicles.length} shown)
                    <select value={selectedVehicle?.id ?? ''} onChange={(event) => handleModelChange(event.target.value)}>
                      {filteredVehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Trim / Engine
                    <select value={selectedTrim?.id ?? ''} onChange={(event) => handleTrimChange(event.target.value)}>
                      {trimEngineOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label} ({asNumber(option.mpg)} MPG)
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
          </div>

            <button type="button" className="ghost" onClick={() => applyVehicleDefaults()}>
              Reapply baseline defaults for MPG and ownership costs
          </button>

          {vehicleMpgNote && (
            <details>
              <summary>How vehicle search defaults are set</summary>
              <p>{vehicleMpgNote.note}</p>
              <a href={vehicleMpgNote.sourceUrl} target="_blank" rel="noreferrer">
                {vehicleMpgNote.sourceName}
              </a>
            </details>
          )}

          <label>
            Annual miles
            <input
              type="number"
              min="1"
              step="1"
              value={input.annualMiles}
              onChange={(event) => updateNumber('annualMiles', Number(event.target.value))}
            />
          </label>
          {annualMilesNote && (
            <details>
              <summary>Why this number?</summary>
              <p>{annualMilesNote.note}</p>
              <a href={annualMilesNote.sourceUrl} target="_blank" rel="noreferrer">
                {annualMilesNote.sourceName}
              </a>
            </details>
          )}

          <label>
            Fuel economy (combined MPG)
            <input
              type="number"
              min="1"
              step="0.1"
              value={input.mpg}
              onChange={(event) => updateNumber('mpg', Number(event.target.value))}
            />
          </label>

          <label>
            Gas price per gallon
            <input
              type="number"
              min="0"
              step="0.001"
              value={input.gasPricePerGallon}
              onChange={(event) => updateNumber('gasPricePerGallon', Number(event.target.value))}
            />
          </label>
          {gasPriceNote && (
            <details>
              <summary>Why this number?</summary>
              <p>{gasPriceNote.note}</p>
              <a href={gasPriceNote.sourceUrl} target="_blank" rel="noreferrer">
                {gasPriceNote.sourceName}
              </a>
            </details>
          )}

          <label>
            Insurance (annual)
            <input
              type="number"
              min="0"
              step="1"
              value={input.insuranceAnnual}
              onChange={(event) => updateNumber('insuranceAnnual', Number(event.target.value))}
            />
          </label>
          {insuranceNote && (
            <details>
              <summary>Why this number?</summary>
              <p>{insuranceNote.note}</p>
              <a href={insuranceNote.sourceUrl} target="_blank" rel="noreferrer">
                {insuranceNote.sourceName}
              </a>
            </details>
          )}

          {operatingCostsNote && (
            <details>
              <summary>Maintenance, repairs, and tires defaults</summary>
              <p>{operatingCostsNote.note}</p>
              <a href={operatingCostsNote.sourceUrl} target="_blank" rel="noreferrer">
                {operatingCostsNote.sourceName}
              </a>
            </details>
          )}

          <label>
            Maintenance cost per mile
            <input
              type="number"
              min="0"
              step="0.001"
              value={input.maintenancePerMile}
              onChange={(event) => updateNumber('maintenancePerMile', Number(event.target.value))}
            />
          </label>

          <label>
            Repairs cost per mile
            <input
              type="number"
              min="0"
              step="0.001"
              value={input.repairsPerMile}
              onChange={(event) => updateNumber('repairsPerMile', Number(event.target.value))}
            />
          </label>

          <label>
            Tires cost per mile
            <input
              type="number"
              min="0"
              step="0.001"
              value={input.tiresPerMile}
              onChange={(event) => updateNumber('tiresPerMile', Number(event.target.value))}
            />
          </label>

          <label>
            Lifetime miles
            <input
              type="number"
              min="1"
              step="1000"
              value={input.lifetimeMiles}
              onChange={(event) => updateNumber('lifetimeMiles', Number(event.target.value))}
            />
          </label>
          {lifetimeNote && (
            <details>
              <summary>Why this number?</summary>
              <p>{lifetimeNote.note}</p>
              <a href={lifetimeNote.sourceUrl} target="_blank" rel="noreferrer">
                {lifetimeNote.sourceName}
              </a>
            </details>
          )}

          {errors.length > 0 && (
            <div className="errors" role="alert">
              <h3>Fix inputs</h3>
              <ul>
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </article>

        <article className="panel results">
          <h2>Results</h2>
          <p className="muted selected-vehicle">
            Vehicle: {selectedVehicle ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}` : 'None selected'}
          </p>
            {selectedTrim && <p className="muted small">Trim/Engine: {selectedTrim.label}</p>}
          {!result && <p className="muted">Enter valid values to calculate results.</p>}

          {result && (
            <>
              <div className="kpis">
                <div>
                  <span>Cost per mile</span>
                  <strong>{asCurrencyPrecise(result.costPerMile)}</strong>
                </div>
                <div>
                  <span>Lifetime cost</span>
                  <strong>{asCurrency(result.lifetimeCost)}</strong>
                </div>
                <div>
                  <span>Annual cost</span>
                  <strong>{asCurrency(result.annualCost)}</strong>
                </div>
                <div>
                  <span>Estimated life</span>
                  <strong>{asNumber(result.lifetimeYears)} years</strong>
                </div>
              </div>

              <h3>Annual breakdown</h3>
              <table>
                <tbody>
                  <tr>
                    <td>Fuel</td>
                    <td>{asCurrency(result.annualByCategory.fuel)}</td>
                  </tr>
                  <tr>
                    <td>Insurance</td>
                    <td>{asCurrency(result.annualByCategory.insurance)}</td>
                  </tr>
                  <tr>
                    <td>Maintenance</td>
                    <td>{asCurrency(result.annualByCategory.maintenance)}</td>
                  </tr>
                  <tr>
                    <td>Repairs</td>
                    <td>{asCurrency(result.annualByCategory.repairs)}</td>
                  </tr>
                  <tr>
                    <td>Tires</td>
                    <td>{asCurrency(result.annualByCategory.tires)}</td>
                  </tr>
                </tbody>
              </table>

              <h3>Lifetime breakdown</h3>
              <table>
                <tbody>
                  <tr>
                    <td>Fuel</td>
                    <td>{asCurrency(result.lifetimeByCategory.fuel)}</td>
                  </tr>
                  <tr>
                    <td>Insurance</td>
                    <td>{asCurrency(result.lifetimeByCategory.insurance)}</td>
                  </tr>
                  <tr>
                    <td>Maintenance</td>
                    <td>{asCurrency(result.lifetimeByCategory.maintenance)}</td>
                  </tr>
                  <tr>
                    <td>Repairs</td>
                    <td>{asCurrency(result.lifetimeByCategory.repairs)}</td>
                  </tr>
                  <tr>
                    <td>Tires</td>
                    <td>{asCurrency(result.lifetimeByCategory.tires)}</td>
                  </tr>
                </tbody>
              </table>

              <p className="muted small">
                Fuel volume estimate: {asNumber(result.annualFuelGallons)} gallons per year at {input.mpg} MPG.
              </p>
              <p className="muted small">
                Expected lifetime for selected model: {asNumber(selectedVehicleAssumptions.lifetimeMiles)} miles.
              </p>
            </>
          )}
        </article>
      </section>

      <section className="panel sources">
        <h2>Reference sources used</h2>
        <ul>
          {sourceNotes.map((source) => (
            <li key={source.key}>
              <strong>{source.label}</strong>
              <p>{source.note}</p>
              <a href={source.sourceUrl} target="_blank" rel="noreferrer">
                {source.sourceName}
              </a>
              <p className="meta">Retrieved {source.retrievedAt} • {source.geography}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default App
