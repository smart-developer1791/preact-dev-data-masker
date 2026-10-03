import { Plus, ShieldCheck, Trash2 } from 'lucide-preact'
import {
  detectFields,
  strategyLabels,
  type MaskingRule,
  type MaskingStrategy,
  type MaskingWorkspace,
} from '../domain/masking'

export function RuleEditor({
  workspace,
  field,
  onAdd,
  onUpdate,
  onRemove,
}: {
  workspace: MaskingWorkspace
  field: string
  onAdd: (field: string, strategy: MaskingStrategy) => void
  onUpdate: (id: string, fields: Partial<MaskingRule>) => void
  onRemove: (id: string) => void
}) {
  const detection = detectFields(workspace).find((item) => item.field === field)
  const rule = workspace.rules.find((item) => item.field === field)
  const sampleValues = workspace.rows
    .map((row) => row[field])
    .filter(Boolean)
    .slice(0, 3)

  return (
    <aside class="border-y border-slate-200 bg-white sm:border">
      <header class="border-b border-slate-200 p-4">
        <p class="text-xs font-bold text-emerald-700">RULE EDITOR</p>
        <h2 class="mt-1 break-all font-mono text-sm font-bold">{field}</h2>
        <p class="mt-2 text-xs leading-5 text-slate-500">
          {detection?.reason ??
            'No automatic sensitive-data pattern was detected.'}
        </p>
      </header>
      <section class="p-4">
        <h3 class="text-xs font-bold text-slate-500 uppercase">
          Sample values
        </h3>
        <div class="mt-3 space-y-2">
          {sampleValues.map((value, index) => (
            <p
              class="truncate border border-slate-200 bg-slate-50 p-2 font-mono text-xs"
              key={`${value}-${index}`}
            >
              {value}
            </p>
          ))}
        </div>
      </section>
      {rule ? (
        <section class="border-t border-slate-200 p-4">
          <label class="flex cursor-pointer items-center justify-between gap-3 border border-slate-200 bg-slate-50 p-3">
            <span>
              <strong class="block text-sm">Apply masking</strong>
              <span class="mt-1 block text-xs text-slate-400">
                Included in preview and export
              </span>
            </span>
            <input
              class="size-5 accent-emerald-700"
              type="checkbox"
              checked={rule.enabled}
              onChange={(event) =>
                onUpdate(rule.id, { enabled: event.currentTarget.checked })
              }
            />
          </label>
          <label class="mt-4 block">
            <span class="text-xs font-bold text-slate-500 uppercase">
              Strategy
            </span>
            <select
              class="mt-2 h-11 w-full border border-slate-300 bg-white px-3 text-sm"
              value={rule.strategy}
              onChange={(event) =>
                onUpdate(rule.id, {
                  strategy: event.currentTarget.value as MaskingStrategy,
                })
              }
            >
              {Object.entries(strategyLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            class="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 border border-red-300 text-sm font-bold text-red-700 hover:bg-red-50"
            type="button"
            onClick={() => onRemove(rule.id)}
          >
            <Trash2 size={16} /> Remove rule
          </button>
        </section>
      ) : (
        <section class="border-t border-slate-200 p-4">
          <div class="border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <ShieldCheck size={18} />
            <p class="mt-2 text-xs leading-5">
              This field is currently exported without masking.
            </p>
          </div>
          <button
            class="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 bg-emerald-700 text-sm font-bold text-white"
            type="button"
            onClick={() => onAdd(field, detection?.suggested ?? 'redact')}
          >
            <Plus size={16} /> Add protection rule
          </button>
        </section>
      )}
    </aside>
  )
}
