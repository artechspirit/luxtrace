import { parse } from 'csv-parse/sync'
import type { ProductBatchItem } from '@/types'

// ─── CSV Schema ───────────────────────────────────────────────────────────────
// Required columns (order-independent, header row mandatory):
//   serial_number, brand, name, description, price_idr

const REQUIRED_COLUMNS = ['serial_number', 'brand', 'name', 'description', 'price_idr'] as const
const MAX_ROWS = 500
const MAX_BYTES = 5 * 1024 * 1024 // 5MB

export interface CsvParseResult {
  items: ProductBatchItem[]
  total: number
}

export interface CsvParseError {
  row: number
  column: string
  message: string
}

export class CsvValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: CsvParseError[] = []
  ) {
    super(message)
    this.name = 'CsvValidationError'
  }
}

/**
 * Parse and validate a CSV buffer into ProductBatchItems.
 * Throws CsvValidationError on schema or data errors.
 */
export function parseCsvBuffer(buffer: Buffer): CsvParseResult {
  if (buffer.byteLength > MAX_BYTES) {
    throw new CsvValidationError(`CSV exceeds maximum size of ${MAX_BYTES / 1024 / 1024}MB`)
  }

  let records: Record<string, string>[]

  try {
    records = parse(buffer, {
      columns: true,           // Use first row as column names
      skip_empty_lines: true,
      trim: true,
      bom: true,               // Handle UTF-8 BOM from Excel exports
    }) as Record<string, string>[]
  } catch (err) {
    throw new CsvValidationError(`CSV parse error: ${(err as Error).message}`)
  }

  if (records.length === 0) {
    throw new CsvValidationError('CSV file is empty')
  }

  if (records.length > MAX_ROWS) {
    throw new CsvValidationError(
      `CSV exceeds maximum of ${MAX_ROWS} rows. Split into smaller batches.`
    )
  }

  // Validate columns presence
  const actualColumns = Object.keys(records[0])
  const missingColumns = REQUIRED_COLUMNS.filter((col) => !actualColumns.includes(col))
  if (missingColumns.length > 0) {
    throw new CsvValidationError(
      `Missing required columns: ${missingColumns.join(', ')}. ` +
        `Required: ${REQUIRED_COLUMNS.join(', ')}`
    )
  }

  // Validate rows
  const errors: CsvParseError[] = []
  const items: ProductBatchItem[] = []
  const seenSerials = new Set<string>()

  for (let i = 0; i < records.length; i++) {
    const row = records[i]
    const rowNum = i + 2 // +2 because row 1 is header

    const serial = row.serial_number?.trim()
    const brand = row.brand?.trim()
    const name = row.name?.trim()
    const description = row.description?.trim()
    const priceRaw = row.price_idr?.trim()

    if (!serial) errors.push({ row: rowNum, column: 'serial_number', message: 'Required' })
    if (!brand) errors.push({ row: rowNum, column: 'brand', message: 'Required' })
    if (!name) errors.push({ row: rowNum, column: 'name', message: 'Required' })
    if (!description) errors.push({ row: rowNum, column: 'description', message: 'Required' })

    const price = Number(priceRaw?.replace(/[^0-9.]/g, ''))
    if (!priceRaw || isNaN(price) || price <= 0) {
      errors.push({ row: rowNum, column: 'price_idr', message: 'Must be a positive number' })
    }

    if (serial && seenSerials.has(serial)) {
      errors.push({ row: rowNum, column: 'serial_number', message: `Duplicate in this CSV: ${serial}` })
    }
    if (serial) seenSerials.add(serial)

    if (errors.length === 0 || errors.every((e) => e.row !== rowNum)) {
      items.push({ serial_number: serial, brand, name, description, price_idr: price })
    }
  }

  if (errors.length > 0) {
    throw new CsvValidationError(`CSV validation failed with ${errors.length} error(s)`, errors)
  }

  return { items, total: items.length }
}
