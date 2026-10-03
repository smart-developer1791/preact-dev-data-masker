import { nanoid } from 'nanoid'
import Papa from 'papaparse'
import { z } from 'zod'

export const strategySchema = z.enum([
  'redact',
  'hash',
  'tokenize',
  'email-alias',
  'last-four',
  'drop',
])

export const maskingRuleSchema = z.object({
  id: z.string().min(1),
  field: z.string().min(1),
  strategy: strategySchema,
  enabled: z.boolean(),
})

export const maskingWorkspaceSchema = z
  .object({
    sourceName: z.string().min(1),
    sourceFormat: z.enum(['csv', 'json']),
    fields: z.array(z.string().min(1)).min(1),
    rows: z.array(z.record(z.string(), z.string())).min(1),
    rules: z.array(maskingRuleSchema),
  })
  .superRefine((workspace, context) => {
    const fields = new Set(workspace.fields)
    if (fields.size !== workspace.fields.length) {
      context.addIssue({
        code: 'custom',
        path: ['fields'],
        message: 'Field names must be unique.',
      })
    }
    const ids = new Set(workspace.rules.map((rule) => rule.id))
    const ruledFields = new Set(workspace.rules.map((rule) => rule.field))
    if (
      ids.size !== workspace.rules.length ||
      ruledFields.size !== workspace.rules.length
    ) {
      context.addIssue({
        code: 'custom',
        path: ['rules'],
        message: 'Rule IDs and target fields must be unique.',
      })
    }
    workspace.rules.forEach((rule, index) => {
      if (!fields.has(rule.field)) {
        context.addIssue({
          code: 'custom',
          path: ['rules', index, 'field'],
          message: `Unknown field: ${rule.field}`,
        })
      }
    })
  })

export type MaskingWorkspace = z.infer<typeof maskingWorkspaceSchema>
export type MaskingRule = z.infer<typeof maskingRuleSchema>
export type MaskingStrategy = MaskingRule['strategy']
export type Detection = {
  field: string
  category: string
  confidence: number
  suggested: MaskingStrategy
  reason: string
}

function normalizeRows(rows: Record<string, unknown>[]) {
  const fields = [...new Set(rows.flatMap((row) => Object.keys(row)))]
  return {
    fields,
    rows: rows.map((row) =>
      Object.fromEntries(
        fields.map((field) => [
          field,
          row[field] == null ? '' : String(row[field]),
        ]),
      ),
    ),
  }
}

export function parseDataset(
  source: string,
  fileName: string,
): MaskingWorkspace {
  const trimmed = source.trim()
  let format: 'csv' | 'json'
  let rawRows: Record<string, unknown>[]
  if (fileName.toLowerCase().endsWith('.json') || trimmed.startsWith('[')) {
    format = 'json'
    const value = JSON.parse(source) as unknown
    if (
      !Array.isArray(value) ||
      !value.length ||
      value.some((row) => !row || typeof row !== 'object' || Array.isArray(row))
    ) {
      throw new Error('JSON input must be a non-empty array of flat objects.')
    }
    rawRows = value as Record<string, unknown>[]
  } else {
    format = 'csv'
    const parsed = Papa.parse<Record<string, unknown>>(source, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    })
    if (parsed.errors.length) {
      throw new Error(
        `CSV row ${parsed.errors[0].row ?? 0}: ${parsed.errors[0].message}`,
      )
    }
    rawRows = parsed.data
  }
  if (!rawRows.length) throw new Error('The dataset does not contain any rows.')
  const normalized = normalizeRows(rawRows)
  const workspace: MaskingWorkspace = {
    sourceName: fileName,
    sourceFormat: format,
    ...normalized,
    rules: [],
  }
  workspace.rules = suggestedRules(workspace)
  return maskingWorkspaceSchema.parse(workspace)
}

export function detectFields(workspace: MaskingWorkspace): Detection[] {
  return workspace.fields.flatMap((field) => {
    const normalized = field.toLowerCase().replace(/[^a-z0-9]/g, '')
    const values = workspace.rows.map((row) => row[field]).filter(Boolean)
    const ratio = (predicate: (value: string) => boolean) =>
      values.length ? values.filter(predicate).length / values.length : 0
    const detection = (
      category: string,
      confidence: number,
      suggested: MaskingStrategy,
      reason: string,
    ): Detection[] => [{ field, category, confidence, suggested, reason }]

    if (
      normalized.includes('email') ||
      ratio((value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) > 0.6
    ) {
      return detection(
        'Email address',
        96,
        'email-alias',
        'Field name and values match email addresses',
      )
    }
    if (
      /(card|pan|accountnumber)/.test(normalized) ||
      ratio((value) => /^\d{12,19}$/.test(value.replace(/\s/g, ''))) > 0.7
    ) {
      return detection(
        'Payment identifier',
        98,
        'last-four',
        'Long numeric identifiers require protection',
      )
    }
    if (
      /(phone|mobile|telephone)/.test(normalized) ||
      ratio((value) => /\+?[\d ()-]{8,}/.test(value)) > 0.7
    ) {
      return detection(
        'Phone number',
        92,
        'last-four',
        'Values match international phone formats',
      )
    }
    if (
      /(firstname|lastname|fullname|customername|contactname)/.test(normalized)
    ) {
      return detection(
        'Person name',
        88,
        'tokenize',
        'Field name identifies a person',
      )
    }
    if (/(address|street|postcode|zipcode)/.test(normalized)) {
      return detection(
        'Postal address',
        90,
        'redact',
        'Field name identifies location data',
      )
    }
    if (
      /(ipaddress|clientip|remoteip)/.test(normalized) ||
      ratio((value) => /^(\d{1,3}\.){3}\d{1,3}$/.test(value)) > 0.7
    ) {
      return detection('IP address', 91, 'hash', 'Values match IPv4 addresses')
    }
    if (/(ssn|nationalid|taxid|customerid|userid)/.test(normalized)) {
      return detection(
        'Persistent identifier',
        86,
        'tokenize',
        'Field links records to an individual',
      )
    }
    return []
  })
}

export function suggestedRules(workspace: MaskingWorkspace) {
  return detectFields(workspace).map((detection) => ({
    id: nanoid(8),
    field: detection.field,
    strategy: detection.suggested,
    enabled: true,
  }))
}

function stableHash(value: string) {
  let hash = 2166136261
  for (const char of value) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function maskValue(value: string, strategy: MaskingStrategy) {
  if (!value) return value
  if (strategy === 'redact') return '[REDACTED]'
  if (strategy === 'hash') return `sha_${stableHash(value)}`
  if (strategy === 'tokenize') return `tok_${stableHash(value)}`
  if (strategy === 'email-alias') {
    const [, domain = 'masked.invalid'] = value.split('@')
    return `user_${stableHash(value).slice(0, 6)}@${domain}`
  }
  if (strategy === 'last-four')
    return `${'*'.repeat(Math.max(value.length - 4, 4))}${value.slice(-4)}`
  return value
}

export function applyMasking(workspace: MaskingWorkspace) {
  const active = new Map(
    workspace.rules
      .filter((rule) => rule.enabled)
      .map((rule) => [rule.field, rule]),
  )
  const fields = workspace.fields.filter(
    (field) => active.get(field)?.strategy !== 'drop',
  )
  const rows = workspace.rows.map((row) =>
    Object.fromEntries(
      fields.map((field) => {
        const rule = active.get(field)
        return [
          field,
          rule
            ? maskValue(row[field] ?? '', rule.strategy)
            : (row[field] ?? ''),
        ]
      }),
    ),
  )
  return { fields, rows }
}

export function privacyStats(workspace: MaskingWorkspace) {
  const detections = detectFields(workspace)
  const active = workspace.rules.filter((rule) => rule.enabled)
  const protectedFields = new Set(active.map((rule) => rule.field))
  const protectedDetections = detections.filter((detection) =>
    protectedFields.has(detection.field),
  )
  return {
    rows: workspace.rows.length,
    fields: workspace.fields.length,
    detected: detections.length,
    protected: protectedDetections.length,
    coverage: detections.length
      ? Math.round((protectedDetections.length / detections.length) * 100)
      : 100,
  }
}

export const strategyLabels: Record<MaskingStrategy, string> = {
  redact: 'Redact value',
  hash: 'Stable hash',
  tokenize: 'Deterministic token',
  'email-alias': 'Email alias',
  'last-four': 'Keep last four',
  drop: 'Drop column',
}
