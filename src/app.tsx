import { nanoid } from 'nanoid'
import Papa from 'papaparse'
import {
  Columns3,
  Download,
  FileLock2,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
} from 'lucide-preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { ZodError } from 'zod'
import { DataPreview } from './components/data-preview'
import { FieldInventory } from './components/field-inventory'
import { PrivacySummary } from './components/privacy-summary'
import { RuleEditor } from './components/rule-editor'
import { WorkspaceState } from './components/workspace-state'
import {
  applyMasking,
  maskingWorkspaceSchema,
  parseDataset,
  privacyStats,
  type MaskingWorkspace,
} from './domain/masking'
import {
  loadWorkspace,
  resetWorkspace,
  saveWorkspace,
} from './services/masking-store'

const storageKey = 'dev-data-masker-v1'
const sampleUrl = '/sample-masking-workspace.json'

function downloadMasked(workspace: MaskingWorkspace) {
  const masked = applyMasking(workspace)
  const isCsv = workspace.sourceFormat === 'csv'
  const content = isCsv
    ? Papa.unparse(masked.rows, { columns: masked.fields })
    : JSON.stringify(masked.rows, null, 2)
  const url = URL.createObjectURL(
    new Blob([content], { type: isCsv ? 'text/csv' : 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `masked-${workspace.sourceName.replace(/\.(csv|json)$/i, '')}.${isCsv ? 'csv' : 'json'}`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function readableError(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    const issue = error.issues[0]
    return `${fallback} at ${issue.path.join('.') || 'workspace'}: ${issue.message}`
  }
  return error instanceof Error ? error.message : fallback
}

export function App() {
  const noticeTimer = useRef<number | undefined>(undefined)
  const [workspace, setWorkspace] = useState<MaskingWorkspace | null>(null)
  const [selectedField, setSelectedField] = useState('')
  const [query, setQuery] = useState('')
  const [revealOriginal, setRevealOriginal] = useState(false)
  const [mobileView, setMobileView] = useState<'preview' | 'fields' | 'rules'>(
    'preview',
  )
  const [notice, setNotice] = useState<{
    text: string
    error?: boolean
  } | null>(null)
  const [loadError, setLoadError] = useState('')

  function applyWorkspace(data: MaskingWorkspace) {
    setWorkspace(data)
    setSelectedField(data.fields[0])
  }

  function load() {
    setLoadError('')
    void loadWorkspace(storageKey, sampleUrl)
      .then(applyWorkspace)
      .catch((error: unknown) =>
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Unexpected masking workspace error.',
        ),
      )
  }

  useEffect(load, [])
  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])

  function notify(text: string, error = false) {
    window.clearTimeout(noticeTimer.current)
    setNotice({ text, error })
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2400)
  }

  async function persist(next: MaskingWorkspace, message = '') {
    try {
      const parsed = maskingWorkspaceSchema.parse(next)
      setWorkspace(parsed)
      await saveWorkspace(storageKey, parsed)
      if (message) notify(message)
      return true
    } catch (error) {
      notify(readableError(error, 'Masking workspace is invalid'), true)
      return false
    }
  }

  async function importDataset(file: File) {
    try {
      const parsed = parseDataset(await file.text(), file.name)
      await saveWorkspace(storageKey, parsed)
      applyWorkspace(parsed)
      setQuery('')
      setRevealOriginal(false)
      setMobileView('preview')
      notify(
        `${file.name} imported: ${parsed.rows.length} rows, ${parsed.fields.length} fields.`,
      )
    } catch (error) {
      notify(readableError(error, 'Could not import this dataset'), true)
    }
  }

  if (!workspace) return <WorkspaceState error={loadError} onRetry={load} />

  const stats = privacyStats(workspace)
  const tabs = [
    ['preview', Columns3, 'Preview'],
    ['fields', ShieldCheck, 'Fields'],
    ['rules', SlidersHorizontal, 'Rules'],
  ] as const

  return (
    <main class="min-h-screen bg-slate-100 text-slate-900">
      <header class="border-b border-slate-800 bg-[#14251f] text-white">
        <div class="mx-auto flex min-h-16 max-w-[1800px] items-center gap-3 px-4 sm:px-6">
          <span class="grid size-10 shrink-0 place-items-center bg-emerald-300 text-[#14251f]">
            <FileLock2 size={21} />
          </span>
          <div class="min-w-0">
            <strong class="block truncate text-sm">Privacy Forge</strong>
            <span class="block truncate text-xs text-emerald-100/70">
              Dataset masking workbench
            </span>
          </div>
          <span class="ml-auto hidden text-xs text-slate-300 md:block">
            Local processing · deterministic output
          </span>
          <button
            class="grid size-10 place-items-center border border-white/15 hover:bg-white/5 max-md:ml-auto"
            type="button"
            onClick={() =>
              void resetWorkspace(storageKey, sampleUrl)
                .then((data) => {
                  applyWorkspace(data)
                  setQuery('')
                  setRevealOriginal(false)
                  setMobileView('preview')
                  notify('Sample customer dataset restored.')
                })
                .catch((error: unknown) =>
                  notify(
                    error instanceof Error
                      ? error.message
                      : 'Could not restore sample.',
                    true,
                  ),
                )
            }
            aria-label="Restore sample dataset"
            title="Restore sample dataset"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </header>

      <section class="border-b border-slate-200 bg-white">
        <div class="mx-auto max-w-[1800px] px-4 py-5 sm:px-6">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p class="text-xs font-bold text-emerald-700">
                SAFE DATA PREPARATION
              </p>
              <h1 class="mt-1 text-2xl font-bold sm:text-3xl">
                Mask sensitive data without losing utility
              </h1>
              <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Detect likely personal information, choose a strategy per field,
                and verify the exact export before test data leaves this
                browser.
              </p>
            </div>
            <div class="flex gap-2">
              <label class="inline-flex h-10 cursor-pointer items-center gap-2 border border-slate-300 px-3 text-sm font-bold hover:bg-slate-50">
                <Upload size={16} /> Import CSV/JSON
                <input
                  class="sr-only"
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0]
                    if (file) void importDataset(file)
                    event.currentTarget.value = ''
                  }}
                />
              </label>
              <button
                class="inline-flex h-10 items-center gap-2 bg-emerald-700 px-3 text-sm font-bold text-white hover:bg-emerald-800"
                type="button"
                onClick={() => {
                  downloadMasked(workspace)
                  notify('Masked dataset exported.')
                }}
              >
                <Download size={16} /> Export masked
              </button>
            </div>
          </div>

          <div class="mt-5 grid grid-cols-2 border border-slate-200 bg-slate-50 lg:grid-cols-4">
            {[
              [stats.rows, 'Rows'],
              [stats.fields, 'Fields'],
              [stats.detected, 'Sensitive fields'],
              [`${stats.coverage}%`, 'Protection coverage'],
            ].map(([value, label]) => (
              <div
                class="border-r border-slate-200 p-3 last:border-r-0 sm:p-4"
                key={label}
              >
                <strong class="block text-xl">{value}</strong>
                <span class="mt-1 block text-xs text-slate-500">{label}</span>
              </div>
            ))}
          </div>
          <p class="mt-3 break-all text-xs text-slate-400">
            Source:{' '}
            <strong class="text-slate-600">{workspace.sourceName}</strong> ·{' '}
            {workspace.sourceFormat.toUpperCase()}
          </p>
        </div>
      </section>

      <nav
        class="grid grid-cols-3 border-b border-slate-200 bg-white lg:hidden"
        aria-label="Data masking views"
      >
        {tabs.map(([value, Icon, label]) => (
          <button
            class={`inline-flex min-h-12 items-center justify-center gap-1 border-b-2 text-xs font-bold ${mobileView === value ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500'}`}
            type="button"
            onClick={() => setMobileView(value)}
            aria-pressed={mobileView === value}
            key={value}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </nav>

      <div class="mx-auto grid max-w-[1800px] grid-cols-1 items-start gap-4 p-0 sm:p-5 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        <div class={mobileView === 'fields' ? 'block' : 'hidden lg:block'}>
          <FieldInventory
            workspace={workspace}
            selectedField={selectedField}
            query={query}
            onQuery={setQuery}
            onSelect={(field) => {
              setSelectedField(field)
              setMobileView('rules')
            }}
          />
        </div>

        <div
          class={`min-w-0 ${mobileView === 'preview' ? 'block' : 'hidden lg:block'}`}
        >
          <DataPreview
            workspace={workspace}
            revealOriginal={revealOriginal}
            onReveal={setRevealOriginal}
          />
        </div>

        <div class={mobileView === 'rules' ? 'block' : 'hidden lg:block'}>
          <RuleEditor
            workspace={workspace}
            field={selectedField}
            onAdd={(field, strategy) =>
              void persist(
                {
                  ...workspace,
                  rules: [
                    ...workspace.rules,
                    { id: nanoid(8), field, strategy, enabled: true },
                  ],
                },
                `Protection added for ${field}.`,
              )
            }
            onUpdate={(id, fields) =>
              void persist({
                ...workspace,
                rules: workspace.rules.map((rule) =>
                  rule.id === id ? { ...rule, ...fields } : rule,
                ),
              })
            }
            onRemove={(id) =>
              void persist(
                {
                  ...workspace,
                  rules: workspace.rules.filter((rule) => rule.id !== id),
                },
                'Masking rule removed.',
              )
            }
          />
          <PrivacySummary workspace={workspace} />
        </div>
      </div>

      {notice && (
        <div
          class={`fixed right-4 bottom-4 z-50 max-w-[calc(100vw-2rem)] border px-4 py-3 text-sm font-bold shadow-lg ${notice.error ? 'border-red-300 bg-red-50 text-red-800' : 'border-emerald-300 bg-emerald-50 text-emerald-900'}`}
          role="alert"
        >
          {notice.text}
        </div>
      )}
    </main>
  )
}
